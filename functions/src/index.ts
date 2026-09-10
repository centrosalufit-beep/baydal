// index.ts — Cloud Functions Gen 2 del bot de reservas Baydal.
// whatsappWebhook y wpApi (HTTP) y onReservaActualizada (trigger) en europe-southwest1;
// recordatorios, liberarNoConfirmadas, resumenDiario y limpieza (scheduled) en
// europe-west1 (Cloud Scheduler no soporta southwest).

import { setGlobalOptions } from 'firebase-functions/v2';
import { onRequest, type Request } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { defineSecret } from 'firebase-functions/params';
import { initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore, Timestamp, type Query } from 'firebase-admin/firestore';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { enviarFichaSala, enviarPlantilla, enviarTexto, inicializarWhatsApp } from './whatsapp';
import { enviarConfirmacionCliente, fichaReserva, formatearFecha, procesarMensaje, type MensajeEntrante } from './flujo';
import { inicializarTeya } from './teya';
import { garantiaTrasCambio, revisarGarantias } from './garantia';
import { transcribir } from './claude';
import { manejarWpApi } from './wpapi';
import { t } from './textos';
import { ahoraMadrid, aHHMM, aMinutos, sumarDias } from './disponibilidad';
import type { Config, Reserva } from './tipos';

initializeApp();
setGlobalOptions({ region: 'europe-southwest1' });

// Secrets (Google Secret Manager)
const WHATSAPP_TOKEN = defineSecret('WHATSAPP_TOKEN');
const WHATSAPP_APP_SECRET = defineSecret('WHATSAPP_APP_SECRET');
const WHATSAPP_VERIFY_TOKEN = defineSecret('WHATSAPP_VERIFY_TOKEN');
const WHATSAPP_PHONE_ID = defineSecret('WHATSAPP_PHONE_ID');
const ANTHROPIC_API_KEY = defineSecret('ANTHROPIC_API_KEY');
const OPENAI_API_KEY = defineSecret('OPENAI_API_KEY'); // Whisper (notas de voz)
const WP_API_TOKEN = defineSecret('WP_API_TOKEN'); // API del plugin de WordPress
const TEYA_CLIENT_ID = defineSecret('TEYA_CLIENT_ID'); // garantía de reserva (docs/GARANTIA.md)
const TEYA_CLIENT_SECRET = defineSecret('TEYA_CLIENT_SECRET');
const SECRETS_TEYA = [TEYA_CLIENT_ID, TEYA_CLIENT_SECRET];
const initTeya = () => inicializarTeya(TEYA_CLIENT_ID.value(), TEYA_CLIENT_SECRET.value());

// ── Webhook de WhatsApp ──────────────────────────────────────────────

export const whatsappWebhook = onRequest(
  { secrets: [WHATSAPP_TOKEN, WHATSAPP_APP_SECRET, WHATSAPP_VERIFY_TOKEN, WHATSAPP_PHONE_ID, ANTHROPIC_API_KEY, OPENAI_API_KEY, ...SECRETS_TEYA] },
  async (req, res) => {
    // GET: verificación del webhook por Meta (hub.challenge)
    if (req.method === 'GET') {
      const modo = req.query['hub.mode'];
      const token = req.query['hub.verify_token'];
      if (modo === 'subscribe' && token === WHATSAPP_VERIFY_TOKEN.value()) {
        res.status(200).send(String(req.query['hub.challenge'] ?? ''));
      } else {
        res.sendStatus(403);
      }
      return;
    }

    if (req.method !== 'POST') {
      res.sendStatus(405);
      return;
    }

    // Validación de firma HMAC del cuerpo crudo (X-Hub-Signature-256)
    if (!firmaValida(req)) {
      console.warn('[webhook] Firma X-Hub-Signature-256 inválida; petición rechazada');
      res.sendStatus(403);
      return;
    }

    // El 200 va al FINAL: tras responder, Cloud Run corta la CPU y el procesado
    // "en segundo plano" se congela (aprendido el 29/07: respuestas de Paco que
    // llegaban minutos tarde). Si Meta reintenta por tardar, procesados/ lo absorbe.
    inicializarWhatsApp(WHATSAPP_PHONE_ID.value(), WHATSAPP_TOKEN.value());
    initTeya();
    try {
      await procesarEntrada(req.body);
    } catch (error) {
      // Nunca dejamos escapar errores: a Meta siempre le llega su 200
      console.error('[webhook] Error procesando la entrada:', error);
    }
    res.sendStatus(200);
  }
);

/** Comprueba la firma HMAC sha256 del cuerpo crudo con el app secret */
function firmaValida(req: Request): boolean {
  const recibida = req.header('x-hub-signature-256') ?? '';
  const esperada =
    'sha256=' + createHmac('sha256', WHATSAPP_APP_SECRET.value()).update(req.rawBody).digest('hex');
  const a = Buffer.from(recibida);
  const b = Buffer.from(esperada);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Recorre entry[].changes[].value y despacha cada mensaje una sola vez */
async function procesarEntrada(body: unknown): Promise<void> {
  const cuerpo = body as {
    entry?: { changes?: { value?: WebhookValue }[] }[];
  };

  for (const entry of cuerpo?.entry ?? []) {
    console.log(`[webhook] WABA ${(entry as { id?: string }).id}`);
    for (const change of entry.changes ?? []) {
      const value = change.value;
      if (!value) continue;
      // Los envíos que Meta rechaza en diferido (p.ej. 131047 fuera de la
      // ventana de 24h) solo se ven aquí: sin esto fallan en silencio.
      const statuses = (value as { statuses?: { status?: string; recipient_id?: string; errors?: unknown }[] }).statuses;
      for (const st of statuses ?? []) {
        if (st.status === 'failed') {
          console.error(`[webhook] envío FALLIDO a ${st.recipient_id}: ${JSON.stringify(st.errors)}`);
        }
      }
      // Los statuses de Meta (sent/delivered/read) se ignoran en silencio
      for (const msg of value.messages ?? []) {
        if (!msg.id || !msg.from) continue;
        if (!(await marcarProcesado(msg.id))) continue; // idempotencia: ya visto
        let entrada = normalizarMensaje(msg, value.contacts ?? []);
        // Nota de voz → Whisper → el texto entra al flujo normal
        if (msg.type === 'audio' && msg.audio?.id) {
          const texto = await transcribir(msg.audio.id);
          entrada = texto
            ? { ...entrada, tipo: 'texto', texto }
            : { ...entrada, tipo: 'audioFallido' }; // el flujo pide que lo escriba
        }
        try {
          await procesarMensaje(entrada);
        } catch (error) {
          console.error(`[webhook] Error procesando mensaje ${msg.id}:`, error);
        }
      }
    }
  }
}

interface WebhookContacto {
  wa_id?: string;
  profile?: { name?: string };
}

interface WebhookMensaje {
  id?: string;
  from?: string;
  type?: string;
  text?: { body?: string };
  audio?: { id?: string }; // notas de voz (type 'audio')
  interactive?: {
    button_reply?: { id?: string; title?: string };
    list_reply?: { id?: string; title?: string };
  };
  button?: { payload?: string; text?: string }; // quick reply de plantilla
}

interface WebhookValue {
  messages?: WebhookMensaje[];
  contacts?: WebhookContacto[];
  statuses?: unknown[];
}

/** Reserva el messageId en procesados/{id}; false si ya existía (duplicado) */
async function marcarProcesado(messageId: string): Promise<boolean> {
  try {
    await getFirestore().doc(`procesados/${messageId}`).create({ creadoEn: FieldValue.serverTimestamp() });
    return true;
  } catch {
    return false; // create falla si el doc existe → mensaje repetido por Meta
  }
}

/** Convierte el mensaje del webhook al formato que entiende flujo.ts */
function normalizarMensaje(msg: WebhookMensaje, contactos: WebhookContacto[]): MensajeEntrante {
  const telefono = msg.from!;
  const nombrePerfil = contactos.find((c) => c.wa_id === telefono)?.profile?.name;

  if (msg.type === 'text') {
    return { telefono, tipo: 'texto', texto: msg.text?.body ?? '', nombrePerfil };
  }
  if (msg.type === 'interactive') {
    const respuesta = msg.interactive?.button_reply ?? msg.interactive?.list_reply;
    if (respuesta?.id) {
      return { telefono, tipo: 'interactivo', payload: respuesta.id, tituloPayload: respuesta.title, nombrePerfil };
    }
  }
  if (msg.type === 'button' && msg.button?.payload) {
    // Botón quick-reply de una plantilla (p.ej. recordatorio)
    return { telefono, tipo: 'interactivo', payload: msg.button.payload, tituloPayload: msg.button.text, nombrePerfil };
  }
  // Imagen, ubicación, stickers… (el audio lo convierte procesarEntrada)
  return { telefono, tipo: 'noSoportado', nombrePerfil };
}

// ── API para el plugin de WordPress (carta, horario, info) ───────────

// invoker explícito: al crearla, Cloud Run no aplicó el acceso público por defecto
export const wpApi = onRequest({ invoker: 'public', secrets: [WP_API_TOKEN] }, async (req, res) => {
  await manejarWpApi(req, res, WP_API_TOKEN.value());
});

// ── Trigger: cambios en reservas (panel ↔ bot) ───────────────────────

export const onReservaActualizada = onDocumentUpdated(
  { document: 'reservas/{id}', secrets: [WHATSAPP_TOKEN, WHATSAPP_PHONE_ID, ...SECRETS_TEYA] },
  async (event) => {
    const antes = event.data?.before.data() as Reserva | undefined;
    const despues = event.data?.after.data() as Reserva | undefined;
    if (!antes || !despues) return;

    const db = getFirestore();
    inicializarWhatsApp(WHATSAPP_PHONE_ID.value(), WHATSAPP_TOKEN.value());
    initTeya();

    // 1) Panel marca no-show → histórico del cliente (con noshows>=2 el bot
    //    creará sus próximas reservas como pendientes)
    if (antes.estado !== 'noshow' && despues.estado === 'noshow') {
      await db.doc(`clientes/${despues.telefono}`).set(
        {
          nombre: despues.nombre,
          noshows: FieldValue.increment(1),
          actualizadoEn: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    }

    // Lo demás son mensajes al cliente: jamás con baja:true (opt-out)
    const delBot = despues.origen === 'bot' || despues.origen === 'web';
    if (!delBot) return;
    const convSnap = await db.doc(`conversaciones/${despues.telefono}`).get();
    const baja = convSnap.data()?.baja === true;
    const config = (await db.doc('config/restaurante').get()).data() as Config | undefined;
    if (!config) return;

    // 1b) Garantía: cobrar (no-show / cancelación tardía) o liberar. Va antes del
    //     corte por BAJA: el cobro no depende de poder escribirle.
    if (despues.garantia) {
      await garantiaTrasCambio(event.params.id, event.data!.after.ref, antes, despues, config, baja);
    }
    if (baja) return;

    // 2) Sala confirma una pendiente (grupo o reincidente) → avisar al cliente.
    //    Las confirmadas por garantía retenida ya se avisaron en garantia.ts.
    if (antes.estado === 'pendiente' && despues.estado === 'confirmada' && despues.garantia?.estado !== 'retenida') {
      await enviarConfirmacionCliente(config, despues);
    }

    // 3) Cancelación desde el panel de una reserva futura → avisar al cliente
    //    (canceladaPor la ponen bot/sistema: esas cancelaciones ya se notificaron)
    if (
      antes.estado !== 'cancelada' &&
      despues.estado === 'cancelada' &&
      !despues.canceladaPor &&
      despues.fecha >= ahoraMadrid().fecha
    ) {
      await enviarTexto(
        despues.telefono,
        t(despues.idioma, 'reservaCancelada', {
          fecha: formatearFecha(despues.fecha, despues.idioma),
          hora: despues.hora,
        })
      );
    }

    // 4) Panel pulsa ⭐ Pedir reseña → enviar UNA vez y sellar resenaPedidaEn
    if (!antes.pedirResena && despues.pedirResena && !despues.resenaPedidaEn) {
      // Los triggers son al-menos-una-vez: releemos por si una reentrega llega
      // con un snapshot anterior al sellado de resenaPedidaEn (nunca dos veces).
      const fresco = (await event.data!.after.ref.get()).data() as Reserva | undefined;
      if (fresco?.resenaPedidaEn) return;
      const texto = t(despues.idioma, 'pedirResena', { nombre: config.nombre, enlace: config.enlaceResenas });
      // Mensaje libre si la ventana de 24 h está abierta; si Meta lo rechaza → plantilla
      // (contrato ALTA_META: {{1}} nombre del CLIENTE, {{2}} enlace de reseña)
      const enviado =
        (await enviarTexto(despues.telefono, texto)) ||
        (await enviarPlantilla(despues.telefono, 'pedir_resena', despues.idioma, [despues.nombre, config.enlaceResenas]));
      if (enviado) {
        await event.data!.after.ref.update({ resenaPedidaEn: FieldValue.serverTimestamp() });
      }
    }
  }
);

// ── Recordatorios: 10:07 cada día (hora de Madrid) ───────────────────

export const recordatorios = onSchedule(
  {
    schedule: '7 10 * * *',
    timeZone: 'Europe/Madrid',
    region: 'europe-west1',
    secrets: [WHATSAPP_TOKEN, WHATSAPP_PHONE_ID],
  },
  async () => {
    inicializarWhatsApp(WHATSAPP_PHONE_ID.value(), WHATSAPP_TOKEN.value());
    const db = getFirestore();
    const manana = sumarDias(ahoraMadrid().fecha, 1);

    const snap = await db
      .collection('reservas')
      .where('fecha', '==', manana)
      .where('estado', '==', 'confirmada')
      .get();

    for (const doc of snap.docs) {
      const reserva = doc.data() as Reserva;
      if (reserva.recordatorioEnviado) continue; // filtrado en memoria: evita otro índice

      // BAJA/STOP: no se le escribe proactivamente (SCHEMA)
      const conv = await db.doc(`conversaciones/${reserva.telefono}`).get();
      if (conv.data()?.baja) continue;

      // Plantilla aprobada "recordatorio_reserva" con botones Confirmar/Cancelar
      // Variables del contrato ALTA_META: {{1}} fecha, {{2}} hora, {{3}} personas
      const enviado = await enviarPlantilla(
        reserva.telefono,
        'recordatorio_reserva',
        reserva.idioma,
        [formatearFecha(reserva.fecha, reserva.idioma), reserva.hora, String(reserva.comensales)],
        [`rec_conf_${doc.id}`, `rec_cancel_${doc.id}`]
      );

      if (enviado) {
        await doc.ref.update({ recordatorioEnviado: true, actualizadoEn: FieldValue.serverTimestamp() });
      } else {
        // Si la plantilla aún no está aprobada, lo dejamos anotado y seguimos
        console.warn(`[recordatorios] No se pudo enviar el recordatorio de ${doc.id}; se reintentará mañana… si sigue siendo mañana`);
      }
    }
  }
);

// ── Liberación de reservas no confirmadas: cada 15 min ───────────────
// Ciclo del SCHEMA: solo reservas de HOY con recordatorioEnviado:true y sin
// confirmar. Aviso a falta de ≤4 h; liberación a falta de ≤2 h. Las reservas
// sin recordatorio (creadas tarde) NUNCA se liberan solas.

export const liberarNoConfirmadas = onSchedule(
  {
    schedule: '*/15 * * * *',
    timeZone: 'Europe/Madrid',
    region: 'europe-west1',
    secrets: [WHATSAPP_TOKEN, WHATSAPP_PHONE_ID],
  },
  async () => {
    inicializarWhatsApp(WHATSAPP_PHONE_ID.value(), WHATSAPP_TOKEN.value());
    const db = getFirestore();
    const { fecha: hoy, hora: ahora } = ahoraMadrid();
    const config = (await db.doc('config/restaurante').get()).data() as Config | undefined;

    const snap = await db
      .collection('reservas')
      .where('fecha', '==', hoy)
      .where('estado', '==', 'confirmada')
      .get();

    for (const doc of snap.docs) {
      const r = doc.data() as Reserva;
      if (!r.recordatorioEnviado || r.confirmadaCliente) continue;
      // Con garantía retenida la mesa no se libera: si no viene, es no-show y se cobra
      if (r.garantia?.estado === 'retenida') continue;
      const faltanMin = aMinutos(r.hora) - aMinutos(ahora);
      // Hora de entrada ya pasada (p.ej. tras una caída del scheduler): eso ya
      // no es "liberar", es un posible no-show y lo decide el panel.
      if (faltanMin < 0 || faltanMin > 240) continue;

      // BAJA/STOP después del recordatorio: sin poder avisarle no hay
      // liberación justa — jamás mensajes proactivos (SCHEMA); sala decide.
      const conv = await db.doc(`conversaciones/${r.telefono}`).get();
      if (conv.data()?.baja) continue;

      if (faltanMin <= 120) {
        // A falta de ≤2 h sin confirmar → la mesa se libera
        await doc.ref.update({
          estado: 'cancelada',
          canceladaPor: 'sistema', // el trigger no vuelve a notificar
          actualizadoEn: FieldValue.serverTimestamp(),
        });
        // Contrato ALTA_META: {{1}} hora, {{2}} teléfono del restaurante
        await enviarPlantilla(r.telefono, 'reserva_liberada', r.idioma, [r.hora, config?.telefonoHumano ?? '']);
        if (config) {
          await enviarFichaSala(
            config.whatsappHumano,
            fichaReserva('🔓 LIBERADA (sin confirmar)', {
              fecha: r.fecha,
              hora: r.hora,
              comensales: r.comensales,
              nombre: r.nombre,
              telefono: r.telefono,
              notas: [`turno ${r.turno}`, r.notas].filter(Boolean).join(' · '),
            })
          );
        }
      } else if (!r.avisoLiberacionEnviado) {
        // A falta de ≤4 h → aviso "confirma antes de las {hora-2h}". La plantilla
        // lleva los MISMOS botones que el recordatorio (ALTA_META): sin sus
        // payloads rec_conf_/rec_cancel_ Meta rechaza el envío.
        const limite = aHHMM(aMinutos(r.hora) - 120);
        const enviado = await enviarPlantilla(
          r.telefono,
          'aviso_liberacion',
          r.idioma,
          [r.hora, limite],
          [`rec_conf_${doc.id}`, `rec_cancel_${doc.id}`]
        );
        if (enviado) {
          await doc.ref.update({ avisoLiberacionEnviado: true, actualizadoEn: FieldValue.serverTimestamp() });
        }
      }
    }
  }
);

// ── Garantías pendientes: cada 5 min + webhook de Teya ───────────────
// Confirma las reservas cuya retención ya se hizo y libera las caducadas.

export const revisarGarantiasProgramado = onSchedule(
  {
    schedule: '*/5 * * * *',
    timeZone: 'Europe/Madrid',
    region: 'europe-west1',
    secrets: [WHATSAPP_TOKEN, WHATSAPP_PHONE_ID, ...SECRETS_TEYA],
  },
  async () => {
    inicializarWhatsApp(WHATSAPP_PHONE_ID.value(), WHATSAPP_TOKEN.value());
    initTeya();
    await revisarGarantias();
  }
);

// El aviso de Teya solo DISPARA la revisión (que consulta a Teya): no se fía del
// cuerpo, así que no hace falta validar firma. Confirmación al instante al pagar.
// ponytail: sin límite de frecuencia; si alguien lo martillea, añadir un mínimo entre vueltas.
export const teyaWebhook = onRequest(
  { invoker: 'public', secrets: [WHATSAPP_TOKEN, WHATSAPP_PHONE_ID, ...SECRETS_TEYA] },
  async (_req, res) => {
    inicializarWhatsApp(WHATSAPP_PHONE_ID.value(), WHATSAPP_TOKEN.value());
    initTeya();
    try {
      await revisarGarantias();
    } catch (error) {
      console.error('[teyaWebhook] Error revisando garantías:', error);
    }
    res.sendStatus(200);
  }
);

// ── Resumen diario a recepción: 09:31 (hora de Madrid) ───────────────

export const resumenDiario = onSchedule(
  {
    schedule: '31 9 * * *',
    timeZone: 'Europe/Madrid',
    region: 'europe-west1',
    secrets: [WHATSAPP_TOKEN, WHATSAPP_PHONE_ID],
  },
  async () => {
    inicializarWhatsApp(WHATSAPP_PHONE_ID.value(), WHATSAPP_TOKEN.value());
    const db = getFirestore();
    const hoy = ahoraMadrid().fecha;
    const config = (await db.doc('config/restaurante').get()).data() as Config | undefined;
    if (!config) return;

    const snap = await db
      .collection('reservas')
      .where('fecha', '==', hoy)
      .where('estado', 'in', ['confirmada', 'pendiente'])
      .get();
    const reservas = snap.docs.map((d) => d.data() as Reserva);

    const lineas: string[] = [`📋 Resumen de hoy ${formatearFecha(hoy, 'es')}:`];
    for (const turno of ['comida', 'cena'] as const) {
      const delTurno = reservas.filter((r) => r.turno === turno && r.estado === 'confirmada');
      const pax = delTurno.reduce((s, r) => s + r.comensales, 0);
      lineas.push(`· ${turno}: ${delTurno.length} reservas, ${pax} pax`);
    }
    const sinConfirmar = reservas.filter((r) => r.estado === 'confirmada' && !r.confirmadaCliente).length;
    lineas.push(`· sin confirmar por el cliente: ${sinConfirmar}`);
    const pendientes = reservas.filter((r) => r.estado === 'pendiente');
    lineas.push(`· pendientes de decidir: ${pendientes.length}`);
    for (const p of pendientes) {
      lineas.push(`   - ${p.turno} ${p.hora} · ${p.comensales} pax · ${p.nombre} (${p.motivoPendiente ?? 'pendiente'})`);
    }

    // Buzón nocturno: se entrega y se vacía
    const avisos = await db.collection('avisosPendientes').get();
    if (!avisos.empty) {
      lineas.push(`\n📥 Buzón nocturno (${avisos.size}):`);
      for (const doc of avisos.docs) {
        lineas.push(`— ${String(doc.data().resumen ?? '')}`);
      }
    }

    // Por plantilla (sin ventana de 24 h): el resumen entero va aplanado en
    // NOTAS; el respaldo por texto libre conserva el formato de siempre.
    const texto = lineas.join('\n');
    const enviado = await enviarFichaSala(
      config.whatsappHumano,
      {
        titulo: '📋 RESUMEN DEL DÍA',
        fecha: formatearFecha(hoy, 'es'),
        hora: '-',
        personas: '-', // los totales ya van dentro del resumen
        nombre: '-',
        telefono: '-',
        notas: texto,
      },
      texto
    );

    // El buzón solo se vacía si el resumen ha llegado de verdad; si el envío
    // falla, los avisos esperan al resumen de mañana.
    if (enviado && !avisos.empty) {
      const batch = db.batch();
      avisos.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
  }
);

// ── Limpieza: 03:11 cada día (hora de Madrid) ────────────────────────

export const limpieza = onSchedule(
  { schedule: '11 3 * * *', timeZone: 'Europe/Madrid', region: 'europe-west1' },
  async () => {
    const db = getFirestore();
    const hoy = ahoraMadrid().fecha;

    // 1) Borrar procesados/ con más de 7 días
    const limite = Timestamp.fromMillis(Date.now() - 7 * 24 * 60 * 60 * 1000);
    await borrarPorLotes(db.collection('procesados').where('creadoEn', '<', limite));

    // 2) Marcar como completadas las reservas confirmadas ya pasadas.
    // ponytail: filtramos la fecha en memoria (las confirmadas vivas son pocas)
    // para no necesitar un índice (estado, fecha) adicional.
    const confirmadas = await db.collection('reservas').where('estado', '==', 'confirmada').get();
    const pasadas = confirmadas.docs.filter((d) => (d.data() as Reserva).fecha < hoy);
    for (let i = 0; i < pasadas.length; i += 400) {
      const batch = db.batch();
      for (const doc of pasadas.slice(i, i + 400)) {
        batch.update(doc.ref, { estado: 'completada', actualizadoEn: FieldValue.serverTimestamp() });
      }
      await batch.commit();
    }

    // 3) RGPD: conversaciones inactivas más de 6 meses…
    const seisMeses = Timestamp.fromMillis(Date.now() - 183 * 24 * 60 * 60 * 1000);
    await borrarPorLotes(db.collection('conversaciones').where('actualizadoEn', '<', seisMeses));

    // …y reservas con más de 2 años
    await borrarPorLotes(db.collection('reservas').where('fecha', '<', sumarDias(hoy, -731)));
  }
);

/** Borra todos los docs de una query en lotes de 400 */
async function borrarPorLotes(query: Query): Promise<void> {
  for (;;) {
    const snap = await query.limit(400).get();
    if (snap.empty) break;
    const batch = getFirestore().batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    if (snap.size < 400) break;
  }
}
