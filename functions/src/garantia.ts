// garantia.ts — Ciclo de la garantía (retención Teya) de las reservas del bot:
//   pedida ──(cliente completa el enlace)──▶ retenida ──▶ cobrada | liberada
//      └──(pasan MINUTOS_GARANTIA sin retener)──▶ caducada (mesa liberada)
// revisarGarantias: la llaman el programado cada 5 min y el webhook de Teya.
// garantiaTrasCambio: la llama onReservaActualizada en cada cambio de estado.

import { FieldValue, getFirestore, type DocumentReference } from 'firebase-admin/firestore';
import type { Config, Reserva } from './tipos';
import { t } from './textos';
import { enviarConfirmacionCliente, fichaReserva, formatearFecha } from './flujo';
import { enviarFichaSala, enviarTexto } from './whatsapp';
import { anular, caducarEnlace, capturar, estadoRetencion } from './teya';

// ponytail: si la retención se completa DESPUÉS de que la revisión la dé por caducada
// (Teya tarda >2 min en marcarla), queda retenida ~7 días sin gestionar; improbable
// porque el enlace caduca a la vez. Si pasa, anular desde la app de Teya.

/** Confirma las reservas cuya retención ya se completó y libera las caducadas */
export async function revisarGarantias(): Promise<void> {
  const db = getFirestore();
  const snap = await db
    .collection('reservas')
    .where('estado', '==', 'pendiente')
    .where('motivoPendiente', '==', 'garantia')
    .get();
  if (snap.empty) return;
  const config = (await db.doc('config/restaurante').get()).data() as Config | undefined;
  if (!config) return;

  for (const doc of snap.docs) {
    const r = doc.data() as Reserva;
    const g = r.garantia;
    if (!g || g.estado !== 'pedida') continue;
    const e = await estadoRetencion(g.enlaceId);
    // Teya caído: no se decide nada (el cliente podría haber pagado); siguiente vuelta.
    // Si pasa 1 h del plazo sin respuesta, sala decide a mano (un solo aviso).
    if (!e) {
      if (!g.alertaSala && Date.now() > g.caducaEn.toMillis() + 60 * 60_000) {
        await doc.ref.update({ 'garantia.alertaSala': true });
        await enviarFichaSala(
          config.whatsappHumano,
          fichaReserva('⚠️ GARANTÍA SIN RESPUESTA DE TEYA', {
            ...r,
            notas: 'Mira en la app de Teya si retuvo y confirma o rechaza en el panel',
          })
        );
      }
      continue;
    }

    if (e.estado === 'COMPLETED') {
      const hecho = await cambiarSiSigue(doc.ref, {
        estado: 'confirmada',
        'garantia.estado': 'retenida',
        ...(e.transaccionId ? { 'garantia.transaccionId': e.transaccionId } : {}),
      });
      if (!hecho) continue;
      await enviarConfirmacionCliente(config, r);
      await enviarFichaSala(
        config.whatsappHumano,
        fichaReserva(`✅ NUEVA RESERVA · 💳 ${g.importe} € retenidos`, r)
      );
    } else if (Date.now() > g.caducaEn.toMillis() + 2 * 60_000) {
      // +2 min de margen: un pago del último segundo puede tardar en figurar COMPLETED
      const hecho = await cambiarSiSigue(doc.ref, {
        estado: 'cancelada',
        canceladaPor: 'sistema', // el trigger no vuelve a notificar
        'garantia.estado': 'caducada',
      });
      if (!hecho) continue;
      await enviarTexto(
        r.telefono,
        t(r.idioma, 'garantiaCaducada', { fecha: formatearFecha(r.fecha, r.idioma), hora: r.hora })
      );
    }
  }
}

/** Aplica el cambio solo si la reserva sigue pendiente de garantía (el webhook y el
 *  programado pueden coincidir: así nadie confirma ni avisa dos veces). */
async function cambiarSiSigue(ref: DocumentReference, cambios: Record<string, unknown>): Promise<boolean> {
  return getFirestore().runTransaction(async (tx) => {
    const r = (await tx.get(ref)).data() as Reserva | undefined;
    if (r?.estado !== 'pendiente' || r.garantia?.estado !== 'pedida') return false;
    tx.update(ref, { ...cambios, actualizadoEn: FieldValue.serverTimestamp() });
    return true;
  });
}

/**
 * Tras un cambio de ESTADO de una reserva con garantía:
 * - no-show, o cancelación tardía aceptada por el cliente → se cobra;
 * - completada o cualquier otra cancelación → se anula la retención;
 * - cancelada antes de dejar la garantía → se caduca el enlace.
 * `baja`: el cliente pidió no recibir mensajes (se cobra igual, pero sin avisarle).
 */
export async function garantiaTrasCambio(
  id: string,
  ref: DocumentReference,
  antes: Reserva,
  despues: Reserva,
  config: Config,
  baja: boolean
): Promise<void> {
  const g = despues.garantia;
  if (!g || antes.estado === despues.estado) return;

  // Salió de "pendiente de garantía" por otra vía (sala confirmó o rechazó, el
  // cliente canceló) antes de que la revisión la recogiera: puede que YA pagara.
  if (g.estado === 'pedida') {
    const e = await estadoRetencion(g.enlaceId);
    if (e?.estado !== 'COMPLETED') {
      await caducarEnlace(g.enlaceId); // que ya no se pueda retener
    } else if (despues.estado === 'confirmada') {
      await ref.update({
        'garantia.estado': 'retenida',
        ...(e.transaccionId ? { 'garantia.transaccionId': e.transaccionId } : {}),
        actualizadoEn: FieldValue.serverTimestamp(),
      });
    } else if (e.transaccionId && (await anular(e.transaccionId, id))) {
      await ref.update({ 'garantia.estado': 'liberada', actualizadoEn: FieldValue.serverTimestamp() });
    }
    return;
  }
  if (g.estado !== 'retenida') return;

  const cobrar = despues.estado === 'noshow' || (despues.estado === 'cancelada' && despues.cancelacionTardia === true);
  const liberar = despues.estado === 'cancelada' || despues.estado === 'completada';
  const motivo = despues.estado === 'noshow' ? 'no-show' : 'cancelación con menos de 24 h';

  if (cobrar) {
    // Se reclama el cobro antes de hacerlo: si el trigger se reentrega, no se
    // repiten cobro ni avisos (Teya además deduplica por idempotency-key)
    const reclamado = await getFirestore().runTransaction(async (tx) => {
      const r = (await tx.get(ref)).data() as Reserva | undefined;
      if (r?.garantia?.estado !== 'retenida') return false;
      tx.update(ref, { 'garantia.estado': 'cobrando' });
      return true;
    });
    if (!reclamado) return;
    const ok = !!g.transaccionId && (await capturar(g.transaccionId, id));
    await ref.update({ 'garantia.estado': ok ? 'cobrada' : 'retenida', actualizadoEn: FieldValue.serverTimestamp() });
    if (ok) {
      // Tras un no-show lo normal es estar fuera de la ventana de 24 h de WhatsApp
      // y que el texto no llegue: entonces sala se lo dice al cliente
      const avisado =
        !baja &&
        (await enviarTexto(
          despues.telefono,
          t(despues.idioma, 'garantiaCobrada', {
            fecha: formatearFecha(despues.fecha, despues.idioma),
            hora: despues.hora,
            importe: g.importe,
            telefono: config.telefonoHumano,
          })
        ));
      await enviarFichaSala(
        config.whatsappHumano,
        fichaReserva(`💳 COBRADOS ${g.importe} € (${motivo})`, {
          ...despues,
          notas: avisado ? 'Cliente avisado por WhatsApp' : 'Cliente NO avisado: díselo tú',
        })
      );
    } else {
      // Sin id de transacción o Teya lo rechaza: que sala lo cobre desde la app de Teya
      await enviarFichaSala(
        config.whatsappHumano,
        fichaReserva(`⚠️ COBRAR A MANO ${g.importe} € (${motivo})`, {
          ...despues,
          notas: `No se pudo cobrar solo. App Teya → retención ref. baydal-${id}`,
        })
      );
    }
  } else if (liberar) {
    // Si la anulación falla, la retención caduca sola (~7 días): solo se registra
    if (g.transaccionId && (await anular(g.transaccionId, id))) {
      await ref.update({ 'garantia.estado': 'liberada', actualizadoEn: FieldValue.serverTimestamp() });
    } else {
      console.warn(`[garantia] No se pudo anular la retención de ${id}; caducará sola`);
    }
  }
}
