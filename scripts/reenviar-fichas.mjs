#!/usr/bin/env node
// reenviar-fichas.mjs — Manda a sala (677 490 049) la lista de reservas cuyos
// avisos descartó Meta mientras la ventana de 24 h estuvo cerrada.
//
// Contexto: al pasar Paco al fijo 965 831 111 (30/07/2026) los avisos a sala
// iban como TEXTO LIBRE, que WhatsApp solo entrega si recepción había escrito
// al bot en las últimas 24 h. Meta los descartaba en silencio.
//
// ANTES DE ENVIAR: que sala mande un "ok" desde el 677 490 049 al 965 831 111.
// Eso reabre la ventana; sin ella este mensaje también se pierde.
//
// Uso (PowerShell, desde la raíz del repo):
//   $env:GOOGLE_APPLICATION_CREDENTIALS = "<ruta>\serviceAccountKey.json"
//   $env:WHATSAPP_TOKEN    = (firebase functions:secrets:access WHATSAPP_TOKEN --project baydal-reservas)
//   $env:WHATSAPP_PHONE_ID = (firebase functions:secrets:access WHATSAPP_PHONE_ID --project baydal-reservas)
//
//   node scripts/reenviar-fichas.mjs                     → LISTA, no envía nada
//   node scripts/reenviar-fichas.mjs --desde 2026-07-29  → otra fecha de corte
//   node scripts/reenviar-fichas.mjs --enviar            → un mensaje con la lista

import { createRequire } from 'node:module';

const require = createRequire(new URL('../functions/package.json', import.meta.url));
const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const args = process.argv.slice(2);
const ENVIAR = args.includes('--enviar');
const DESDE = args[args.indexOf('--desde') + 1] ?? '2026-07-30'; // el fijo pasó a ser Paco
if (!/^\d{4}-\d{2}-\d{2}$/.test(DESDE)) {
  console.error(`--desde debe ser YYYY-MM-DD (recibido: ${DESDE})`);
  process.exit(1);
}

initializeApp({
  credential: applicationDefault(),
  projectId: process.env.GOOGLE_CLOUD_PROJECT || 'baydal-reservas',
});
const db = getFirestore();

const config = (await db.doc('config/restaurante').get()).data();
if (!config?.whatsappHumano) {
  console.error('No se ha podido leer config/restaurante.whatsappHumano');
  process.exit(1);
}

// El corte es por creadoEn (cuándo ENTRÓ la reserva): lo que sala se perdió son
// los avisos, no las reservas futuras. Las del panel las metió sala, ya las sabe.
const snap = await db
  .collection('reservas')
  .where('creadoEn', '>=', new Date(`${DESDE}T00:00:00+02:00`))
  .orderBy('creadoEn')
  .get();
const reservas = snap.docs.map((d) => d.data()).filter((r) => r.origen !== 'panel');

if (reservas.length === 0) {
  console.log(`No hay reservas de bot/web creadas desde ${DESDE}. Nada que reenviar.`);
  process.exit(0);
}

const ESTADOS = { confirmada: '✅', pendiente: '🟡', cancelada: '❌', noshow: '⚠️', completada: '✔️' };
const fecha = (f) =>
  new Intl.DateTimeFormat('es-ES', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short' }).format(
    new Date(`${f}T12:00:00Z`)
  );

const linea = (r) =>
  `${ESTADOS[r.estado] ?? r.estado} ${fecha(r.fecha)} ${r.hora} · ${r.comensales} pax · ${r.nombre} (+${r.telefono})` +
  (r.notas ? `\n   ${r.notas}` : '');

const mensaje = [
  `📋 ${reservas.length} reserva(s) que no llegaron (desde ${fecha(DESDE)})`,
  'WhatsApp descartó estos avisos por la ventana de 24 h. Todo está en el panel.',
  '',
  ...reservas.map(linea),
].join('\n');

console.log(`Destino: +${config.whatsappHumano}\n\n${mensaje}\n`);

if (!ENVIAR) {
  console.log('— Simulación: NO se ha enviado nada. Repite con --enviar cuando la lista cuadre.');
  process.exit(0);
}

const token = (process.env.WHATSAPP_TOKEN ?? '').trim();
const phoneId = (process.env.WHATSAPP_PHONE_ID ?? '').trim();
if (!token || !phoneId) {
  console.error('Para --enviar hacen falta WHATSAPP_TOKEN y WHATSAPP_PHONE_ID en el entorno.');
  process.exit(1);
}

const res = await fetch(`https://graph.facebook.com/v23.0/${phoneId}/messages`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ messaging_product: 'whatsapp', to: config.whatsappHumano, type: 'text', text: { body: mensaje } }),
});
if (!res.ok) {
  console.error(`✖ ${res.status}: ${await res.text().catch(() => '(sin cuerpo)')}`);
  console.error('Si es un error de ventana: que sala mande un "ok" al 965 831 111 y repite.');
  process.exit(1);
}
console.log('✔ Enviado.');
