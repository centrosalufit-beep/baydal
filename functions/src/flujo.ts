// flujo.ts — Máquina de estados del bot de reservas sobre conversaciones/{telefono}.
// Pasos: IDLE → FECHA → TURNO → HORA → COMENSALES(_TEXTO) → NOMBRE → EMAIL →
// NOTAS → CONFIRMAR, más GRUPO_DATOS (>maxComensalesBot), CANCELAR_ELEGIR y
// ESPERANDO_HUMANO. Ids de payload EXACTOS del SCHEMA.

import { FieldPath, FieldValue, getFirestore, type Firestore } from 'firebase-admin/firestore';
import type { Borrador, Cliente, Config, Conversacion, Festivo, Idioma, Mesa, MesaConId, Paso, Reserva, SeccionCarta, Turno } from './tipos';
import { t } from './textos';
import {
  ahoraMadrid,
  aMinutos,
  asignarMesa,
  diferenciaDias,
  esUltimaHora,
  horasDelTurno,
  horasDisponibles,
  mesasLibres,
  sumarDias,
} from './disponibilidad';
import {
  enviarBotones,
  enviarFichaSala,
  enviarLista,
  enviarTexto,
  enviarUbicacion,
  type CamposFicha,
  type FilaLista,
} from './whatsapp';
import { interpretar, responderCarta, responderInfo } from './claude';

const REINICIO_MS = 30 * 60 * 1000; // conversación caducada a los 30 min
const SILENCIO_HUMANO_MS = 4 * 60 * 60 * 1000; // 4 h sin bot tras escalado

/** Mensaje entrante ya normalizado por index.ts (los audios llegan ya
 *  transcritos como texto, o como 'audioFallido' si Whisper no pudo) */
export interface MensajeEntrante {
  telefono: string; // E.164 sin +
  tipo: 'texto' | 'interactivo' | 'audioFallido' | 'noSoportado';
  texto?: string; // cuerpo si tipo texto
  payload?: string; // id de botón/fila si tipo interactivo
  tituloPayload?: string; // título del botón pulsado (p.ej. el nombre del perfil)
  nombrePerfil?: string; // nombre del perfil de WhatsApp del cliente
}

/** Contexto compartido entre los manejadores de un mensaje */
interface Ctx {
  db: Firestore;
  config: Config;
  telefono: string;
  idioma: Idioma;
  baja: boolean; // se persiste en cada guardarConv para no perderla
  nombrePerfil?: string;
}

class SinHueco extends Error {}

// ── Punto de entrada ─────────────────────────────────────────────────

export async function procesarMensaje(m: MensajeEntrante): Promise<void> {
  const db = getFirestore();

  const configSnap = await db.doc('config/restaurante').get();
  if (!configSnap.exists) {
    console.error('[flujo] Falta el doc config/restaurante; no se puede responder');
    return;
  }
  const config = configSnap.data() as Config;

  const convSnap = await db.doc(`conversaciones/${m.telefono}`).get();
  const esNueva = !convSnap.exists;
  const conv: Conversacion = esNueva
    ? { paso: 'IDLE', idioma: 'es', baja: false, borrador: {}, actualizadoEn: FieldValue.serverTimestamp() as never }
    : (convSnap.data() as Conversacion);

  const ctx: Ctx = { db, config, telefono: m.telefono, idioma: conv.idioma, baja: conv.baja ?? false, nombrePerfil: m.nombrePerfil };

  // BAJA / STOP del cliente — antes que botActivo: el opt-out se respeta siempre.
  // baja:true solo corta los mensajes PROACTIVOS: si él escribe, se le atiende.
  const textoNormalizado = (m.texto ?? '').trim().toUpperCase();
  if (m.tipo === 'texto' && ['BAJA', 'BAIXA', 'STOP'].includes(textoNormalizado)) {
    ctx.baja = true;
    await guardarConv(ctx, 'IDLE', {});
    await enviarTexto(m.telefono, t(ctx.idioma, 'baja'));
    return;
  }

  // Interruptor general del bot
  if (!config.botActivo) {
    await enviarTexto(m.telefono, t(ctx.idioma, 'botInactivo', { nombre: config.nombre, telefono: config.telefonoHumano }));
    return;
  }

  const antiguedadMs = conv.actualizadoEn?.toMillis ? Date.now() - conv.actualizadoEn.toMillis() : 0;
  let reiniciada = false;

  // ESPERANDO_HUMANO: silencio 4 h salvo botón "volver al menú"
  if (conv.paso === 'ESPERANDO_HUMANO') {
    if (m.payload === 'menu_volver') {
      conv.paso = 'IDLE';
      conv.borrador = {};
      await guardarConv(ctx, 'IDLE', {});
      await enviarMenu(ctx);
      return;
    }
    if (antiguedadMs < SILENCIO_HUMANO_MS) return; // el humano tiene la conversación
    conv.paso = 'IDLE';
    conv.borrador = {};
    reiniciada = true;
  }

  // Reinicio si la conversación lleva > 30 min parada a mitad de flujo
  if (!esNueva && conv.paso !== 'IDLE' && antiguedadMs > REINICIO_MS) {
    conv.paso = 'IDLE';
    conv.borrador = {};
    reiniciada = true;
  }

  if (m.tipo === 'interactivo' && m.payload) {
    await manejarPayload(ctx, conv, m.payload, m.tituloPayload);
  } else if (m.tipo === 'texto' && m.texto) {
    await manejarTexto(ctx, conv, m.texto, esNueva || reiniciada);
  } else if (m.tipo === 'audioFallido') {
    await enviarTexto(m.telefono, t(ctx.idioma, 'audioNoEntendido'));
  } else {
    // Imagen, ubicación, stickers… no lo procesamos
    await enviarTexto(m.telefono, t(ctx.idioma, 'soloTexto'));
  }
}

// ── Manejo de botones y listas (payloads del SCHEMA) ─────────────────

async function manejarPayload(ctx: Ctx, conv: Conversacion, payload: string, titulo?: string): Promise<void> {
  const borrador = conv.borrador ?? {};

  if (payload === 'menu_reservar') return iniciarReserva(ctx, {});
  if (payload === 'menu_carta') {
    await guardarConv(ctx, 'IDLE', {});
    await enviarTexto(ctx.telefono, t(ctx.idioma, 'cartaIntro'));
    return;
  }
  if (payload === 'menu_humano') return escalar(ctx, conv, 'El cliente ha pedido hablar con una persona');
  if (payload === 'menu_volver') {
    await guardarConv(ctx, 'IDLE', {});
    return enviarMenu(ctx);
  }

  if (payload === 'fecha_otra') {
    await guardarConv(ctx, 'FECHA', borrador);
    await enviarTexto(ctx.telefono, t(ctx.idioma, 'pideFechaTexto'));
    return;
  }
  if (payload.startsWith('fecha_')) {
    const fecha = payload.slice('fecha_'.length);
    const validez = await validarFecha(ctx, fecha);
    if (validez !== 'ok') return avisarFechaInvalida(ctx, borrador, validez);
    return siguientePaso(ctx, { ...borrador, fecha });
  }

  if (payload === 'turno_comida' || payload === 'turno_cena') {
    const turno = payload.slice('turno_'.length) as Turno;
    return siguientePaso(ctx, { ...borrador, turno });
  }

  if (payload.startsWith('hora_')) {
    const hora = payload.slice('hora_'.length);
    if (!/^\d{2}:\d{2}$/.test(hora)) return enviarMenu(ctx);
    return siguientePaso(ctx, { ...borrador, hora });
  }

  // "Más de 8" → pedimos el número por texto (COMENSALES_TEXTO)
  if (payload === 'pax_mas') {
    await guardarConv(ctx, 'COMENSALES_TEXTO', borrador);
    await enviarTexto(ctx.telefono, t(ctx.idioma, 'pideComensalesTexto'));
    return;
  }
  if (payload.startsWith('pax_')) {
    const comensales = parseInt(payload.slice('pax_'.length), 10);
    if (!Number.isFinite(comensales) || comensales < 1) return enviarMenu(ctx);
    return aplicarComensales(ctx, borrador, comensales);
  }

  if (payload === 'nombre_perfil') {
    const nombre = (ctx.nombrePerfil ?? titulo ?? '').trim();
    if (!nombre) return siguientePaso(ctx, borrador); // vuelve a pedir nombre
    return siguientePaso(ctx, { ...borrador, nombre });
  }

  if (payload === 'email_saltar') return siguientePaso(ctx, { ...borrador, email: '' });

  if (payload === 'notas_no') return siguientePaso(ctx, { ...borrador, notas: '' });

  if (payload === 'conf_si') {
    if (conv.paso === 'CONFIRMAR' && borradorCompleto(borrador)) return crearReserva(ctx, conv, borrador);
    // Botón "confirmar" suelto (conversación en IDLE): agradecemos y ya
    await enviarTexto(ctx.telefono, t(ctx.idioma, 'graciasConfirmacion'));
    return;
  }
  if (payload === 'conf_no') {
    await guardarConv(ctx, 'IDLE', {});
    await enviarTexto(ctx.telefono, t(ctx.idioma, 'borradorCancelado'));
    return enviarMenu(ctx);
  }

  // Botones de la plantilla de recordatorio
  if (payload.startsWith('rec_conf_')) return confirmarCliente(ctx, payload.slice('rec_conf_'.length));
  if (payload.startsWith('rec_cancel_')) return cancelarReserva(ctx, payload.slice('rec_cancel_'.length));

  if (payload.startsWith('res_cancelar_')) {
    return cancelarReserva(ctx, payload.slice('res_cancelar_'.length));
  }

  // Payload desconocido o antiguo → menú
  await guardarConv(ctx, 'IDLE', {});
  return enviarMenu(ctx);
}

// ── Manejo de texto libre ────────────────────────────────────────────

async function manejarTexto(ctx: Ctx, conv: Conversacion, texto: string, esNuevaOReiniciada: boolean): Promise<void> {
  const borrador = conv.borrador ?? {};

  // Mensaje determinista del formulario de baydal.es: se parsea SIN IA
  const web = parsearReservaWeb(texto);
  if (web) {
    if (await limiteAlcanzado(ctx)) return;
    if (web.fecha) {
      const validez = await validarFecha(ctx, web.fecha);
      if (validez !== 'ok') {
        const { fecha: _fuera, ...resto } = web;
        return avisarFechaInvalida(ctx, resto, validez);
      }
    }
    if (esGrupo(ctx, web)) await enviarTexto(ctx.telefono, t(ctx.idioma, 'grupoIntro'));
    return siguientePaso(ctx, web);
  }

  // COMENSALES_TEXTO: parser determinista del número (sin IA)
  if (conv.paso === 'COMENSALES_TEXTO') {
    const n = parseInt(texto.match(/\d+/)?.[0] ?? '', 10);
    if (!Number.isFinite(n) || n < 1) {
      await guardarConv(ctx, 'COMENSALES_TEXTO', borrador);
      await enviarTexto(ctx.telefono, t(ctx.idioma, 'pideComensalesTexto'));
      return;
    }
    return aplicarComensales(ctx, borrador, n);
  }

  const contexto = `paso=${conv.paso}; borrador=${JSON.stringify(borrador)}`;
  const interp = await interpretar(texto, contexto, ctx.idioma);

  // En NOTAS, TODO texto ES la nota (celíacos, trona…): se anota tal cual —
  // "celíaco" clasifica como 'carta' y se colaba a responderCarta. Solo
  // cancelar/modificar/humano siguen actuando. La nota tampoco cambia el
  // idioma de la conversación (ctx.idioma se queda como estaba).
  if (conv.paso === 'NOTAS' && !['cancelar', 'modificar', 'humano'].includes(interp.intencion)) {
    return siguientePaso(ctx, { ...borrador, notas: texto.trim() });
  }

  ctx.idioma = interp.idioma; // se persiste en el siguiente guardarConv

  // Saludo con RGPD en el primer contacto (o tras reinicio)
  if (esNuevaOReiniciada && interp.intencion === 'otro' && sinDatos(interp.datos)) {
    await guardarConv(ctx, 'IDLE', {});
    return enviarSaludo(ctx);
  }

  switch (interp.intencion) {
    case 'humano':
      return escalar(ctx, conv, `El cliente pide una persona. Último mensaje: "${texto}"`);

    case 'cancelar':
    case 'modificar':
      // ponytail: modificar = cancelar + volver a empezar (SCHEMA, sin edición in situ)
      return iniciarCancelacion(ctx);

    case 'carta':
    case 'horarios': {
      const secciones = await cargarCarta(ctx.db);
      const respuesta = await responderCarta(texto, secciones, ctx.config, ctx.idioma);
      if (respuesta === null) return escalar(ctx, conv, `Fallo de IA respondiendo carta/horarios: "${texto}"`);
      await guardarConv(ctx, conv.paso, borrador); // refresca actualizadoEn e idioma
      await enviarTexto(ctx.telefono, respuesta);
      // Si estaba a mitad de flujo, recordamos por dónde íbamos
      if (conv.paso !== 'IDLE' && conv.paso !== 'CANCELAR_ELEGIR') return siguientePaso(ctx, borrador);
      return;
    }

    case 'info': {
      // Dudas prácticas: Claude SOLO con config.infoPractica; si no está ahí → escalar
      const respuesta = await responderInfo(texto, ctx.config, ctx.idioma);
      if (respuesta === null) return escalar(ctx, conv, `Duda práctica sin respuesta en infoPractica: "${texto}"`);
      await guardarConv(ctx, conv.paso, borrador);
      await enviarTexto(ctx.telefono, respuesta);
      if (conv.paso !== 'IDLE' && conv.paso !== 'CANCELAR_ELEGIR') return siguientePaso(ctx, borrador);
      return;
    }

    case 'reservar':
    case 'otro': {
      // En NOMBRE/GRUPO_DATOS, EMAIL y NOTAS, un texto sin datos extraídos es la respuesta directa
      if (sinDatos(interp.datos)) {
        if (conv.paso === 'NOMBRE' || conv.paso === 'GRUPO_DATOS') {
          return siguientePaso(ctx, { ...borrador, nombre: texto.trim() });
        }
        if (conv.paso === 'EMAIL') {
          const email = /\S+@\S+\.\S+/.test(texto.trim()) ? texto.trim() : '';
          return siguientePaso(ctx, { ...borrador, email });
        }
        if (conv.paso === 'NOTAS') return siguientePaso(ctx, { ...borrador, notas: texto.trim() });
      }

      if (interp.intencion === 'reservar' || !sinDatos(interp.datos)) {
        // Empieza reserva nueva desde IDLE → se aplica el límite por teléfono
        if (conv.paso === 'IDLE' && (await limiteAlcanzado(ctx))) return;
        return aplicarDatosYContinuar(ctx, conv, borrador, interp.datos);
      }

      // 'otro' sin datos: esperando una fecha → reintentamos; a mitad de flujo
      // → repetimos la pregunta del paso; en IDLE → escalamos (fallo de IA o
      // petición que el bot no cubre).
      if (conv.paso === 'FECHA') {
        await guardarConv(ctx, 'FECHA', borrador);
        await enviarTexto(ctx.telefono, t(ctx.idioma, 'fechaNoValida'));
        return;
      }
      if (conv.paso !== 'IDLE' && conv.paso !== 'CANCELAR_ELEGIR') return siguientePaso(ctx, borrador);
      // En IDLE un "hola" (u otro texto sin intención clara) NO escala: se
      // saluda con el menú, como en el primer contacto. Sin esto, cualquier
      // cliente que repitiera y saludara acababa en ESPERANDO_HUMANO.
      if (conv.paso === 'IDLE') {
        await guardarConv(ctx, 'IDLE', {});
        return enviarSaludo(ctx);
      }
      return escalar(ctx, conv, `No he entendido al cliente. Último mensaje: "${texto}"`);
    }
  }
}

function sinDatos(datos: { fecha?: string; turno?: Turno; hora?: string; comensales?: number }): boolean {
  return !datos.fecha && !datos.turno && !datos.hora && datos.comensales === undefined;
}

/** Parsea el mensaje determinista "RESERVA WEB" del formulario de baydal.es
 *  (contrato en docs/INTEGRACION_WEB.md). null si no es un mensaje de la web.
 *  Exportada solo para tests (es pura). */
export function parsearReservaWeb(texto: string): Borrador | null {
  const lineas = texto.trim().split('\n');
  if (lineas[0].trim().toUpperCase() !== 'RESERVA WEB') return null;
  // La web no recoge email ni notas: se dejan vacíos y se salta directo a CONFIRMAR
  const b: Borrador = { web: true, email: '', notas: '' };
  for (const linea of lineas.slice(1)) {
    const m = linea.match(/^\s*(fecha|turno|hora|personas|nombre)\s*:\s*(.+)$/i);
    if (!m) continue;
    const valor = m[2].trim();
    switch (m[1].toLowerCase()) {
      case 'fecha':
        if (/^\d{4}-\d{2}-\d{2}$/.test(valor)) b.fecha = valor;
        break;
      case 'turno':
        if (valor === 'comida' || valor === 'cena') b.turno = valor;
        break;
      case 'hora':
        // El cliente puede editar el mensaje antes de enviarlo: hora REAL en 24h
        if (/^([01]\d|2[0-3]):[0-5]\d$/.test(valor)) b.hora = valor;
        break;
      case 'personas': {
        const n = parseInt(valor, 10);
        if (Number.isFinite(n) && n >= 1) b.comensales = n;
        break;
      }
      case 'nombre':
        if (valor) b.nombre = valor;
        break;
    }
  }
  return b;
}

/** Mezcla los datos extraídos por Claude en el borrador, validándolos,
 *  y salta directamente al primer paso que siga faltando. */
async function aplicarDatosYContinuar(ctx: Ctx, conv: Conversacion, borrador: Borrador, datos: { fecha?: string; turno?: Turno; hora?: string; comensales?: number }): Promise<void> {
  const nuevo: Borrador = { ...borrador };

  if (datos.comensales !== undefined) nuevo.comensales = datos.comensales;
  if (datos.turno) nuevo.turno = datos.turno;

  if (datos.fecha) {
    const validez = await validarFecha(ctx, datos.fecha);
    if (validez !== 'ok') return avisarFechaInvalida(ctx, nuevo, validez);
    nuevo.fecha = datos.fecha;
  }

  if (datos.hora && nuevo.fecha) {
    // Validamos la hora contra el horario del día y deducimos el turno
    const festivo = await cargarFestivo(ctx.db, nuevo.fecha);
    const enComida = horasAbiertas(ctx.config, nuevo.fecha, 'comida', festivo).includes(datos.hora);
    const enCena = horasAbiertas(ctx.config, nuevo.fecha, 'cena', festivo).includes(datos.hora);
    if (enComida || enCena) {
      nuevo.hora = datos.hora;
      nuevo.turno = enComida ? 'comida' : 'cena';
    }
    // ponytail: hora inválida se descarta en silencio; el paso HORA ofrecerá la lista
  }

  // Grupo grande recién detectado → mensaje de acogida antes de seguir
  if (esGrupo(ctx, nuevo) && !esGrupo(ctx, borrador)) {
    await enviarTexto(ctx.telefono, t(ctx.idioma, 'grupoIntro'));
  }

  return siguientePaso(ctx, nuevo);
}

/** Aplica un número de comensales recién dado (botón pax_ o COMENSALES_TEXTO) */
async function aplicarComensales(ctx: Ctx, borrador: Borrador, comensales: number): Promise<void> {
  const nuevo = { ...borrador, comensales };
  if (esGrupo(ctx, nuevo)) await enviarTexto(ctx.telefono, t(ctx.idioma, 'grupoIntro'));
  return siguientePaso(ctx, nuevo);
}

// ── Avance por los pasos del flujo ───────────────────────────────────

/** > maxComensalesBot → flujo de grupo: pendiente sin mesa + escalar a sala */
function esGrupo(ctx: Ctx, b: Borrador): boolean {
  return (b.comensales ?? 0) > ctx.config.maxComensalesBot;
}

function borradorCompleto(b: Borrador): boolean {
  return !!(b.fecha && b.turno && b.hora && b.comensales && b.nombre && b.email !== undefined && b.notas !== undefined);
}

/** Envía la pregunta del primer campo que falte (saltando los ya cubiertos) */
async function siguientePaso(ctx: Ctx, borrador: Borrador): Promise<void> {
  if (!borrador.fecha) return pedirFecha(ctx, borrador);
  if (!borrador.turno) return pedirTurno(ctx, borrador);
  if (!borrador.hora) return pedirHora(ctx, borrador);
  if (!borrador.comensales) return pedirComensales(ctx, borrador);
  if (!borrador.nombre) return pedirNombre(ctx, borrador);
  // Grupo (>maxComensalesBot): con fecha/turno/hora/nombre basta — sin email ni notas
  if (esGrupo(ctx, borrador)) return crearReservaGrupo(ctx, borrador);
  if (borrador.email === undefined) return pedirEmail(ctx, borrador);
  if (borrador.notas === undefined) return pedirNotas(ctx, borrador);
  return pedirConfirmacion(ctx, borrador);
}

/** Arranque de una reserva: aplica el límite de reservas activas por teléfono */
async function iniciarReserva(ctx: Ctx, borrador: Borrador): Promise<void> {
  if (await limiteAlcanzado(ctx)) return;
  if (esGrupo(ctx, borrador)) await enviarTexto(ctx.telefono, t(ctx.idioma, 'grupoIntro'));
  return siguientePaso(ctx, borrador);
}

/** true (y avisa al cliente) si ya tiene maxReservasActivas futuras vivas */
async function limiteAlcanzado(ctx: Ctx): Promise<boolean> {
  const hoy = ahoraMadrid().fecha;
  const snap = await ctx.db
    .collection('reservas')
    .where('telefono', '==', ctx.telefono)
    .where('estado', 'in', ['confirmada', 'pendiente'])
    .where('fecha', '>=', hoy)
    .get();
  if (snap.size < ctx.config.maxReservasActivas) return false;

  await enviarTexto(
    ctx.telefono,
    t(ctx.idioma, 'limiteReservas', { max: ctx.config.maxReservasActivas, telefono: ctx.config.telefonoHumano })
  );
  await iniciarCancelacion(ctx); // le enseñamos sus reservas por si quiere liberar una
  return true;
}

async function pedirFecha(ctx: Ctx, borrador: Borrador): Promise<void> {
  const hoy = ahoraMadrid().fecha;
  const hasta = sumarDias(hoy, ctx.config.antelacionMaxDias);
  const festivosSnap = await ctx.db
    .collection('festivos')
    .where(FieldPath.documentId(), '>=', hoy)
    .where(FieldPath.documentId(), '<=', hasta)
    .get();
  const festivos = new Map<string, Festivo>(
    festivosSnap.docs.map((d: { id: string; data(): unknown }) => [d.id, d.data() as Festivo])
  );

  // ponytail: "días con hueco" = días con algún turno abierto (horario+festivo
  // +antelación); la ocupación real de mesas se comprueba en el paso HORA.
  const filas: FilaLista[] = [];
  for (let i = 0; i <= ctx.config.antelacionMaxDias && filas.length < 9; i++) {
    const fecha = sumarDias(hoy, i);
    const festivo = festivos.get(fecha) ?? null;
    const abierto =
      horasAbiertas(ctx.config, fecha, 'comida', festivo).length > 0 ||
      horasAbiertas(ctx.config, fecha, 'cena', festivo).length > 0;
    if (!abierto) continue;
    const titulo = i === 0 ? t(ctx.idioma, 'hoy') : i === 1 ? t(ctx.idioma, 'manana') : formatearFecha(fecha, ctx.idioma);
    filas.push({
      id: `fecha_${fecha}`,
      titulo,
      descripcion: i <= 1 ? formatearFecha(fecha, ctx.idioma) : undefined,
    });
  }
  filas.push({ id: 'fecha_otra', titulo: t(ctx.idioma, 'otraFecha') });

  await guardarConv(ctx, pasoDe(ctx, borrador, 'FECHA'), borrador);
  await enviarLista(ctx.telefono, t(ctx.idioma, 'pideFecha'), t(ctx.idioma, 'btnVerFechas'), filas);
}

async function pedirTurno(ctx: Ctx, borrador: Borrador): Promise<void> {
  const fecha = borrador.fecha!;
  const festivo = await cargarFestivo(ctx.db, fecha);
  const hayComida = horasAbiertas(ctx.config, fecha, 'comida', festivo).length > 0;
  const hayCena = horasAbiertas(ctx.config, fecha, 'cena', festivo).length > 0;

  if (!hayComida && !hayCena) {
    const validez = esUltimaHora(ctx.config, fecha, festivo) ? 'ultimaHora' : 'cerrada';
    return avisarFechaInvalida(ctx, { ...borrador, fecha: undefined }, validez);
  }
  // Si solo hay un turno posible, lo elegimos por el cliente
  if (hayComida !== hayCena) return siguientePaso(ctx, { ...borrador, turno: hayComida ? 'comida' : 'cena' });

  await guardarConv(ctx, pasoDe(ctx, borrador, 'TURNO'), borrador);
  await enviarBotones(ctx.telefono, t(ctx.idioma, 'pideTurno'), [
    { id: 'turno_comida', titulo: t(ctx.idioma, 'btnComida') },
    { id: 'turno_cena', titulo: t(ctx.idioma, 'btnCena') },
  ]);
}

async function pedirHora(ctx: Ctx, borrador: Borrador): Promise<void> {
  const fecha = borrador.fecha!;
  const turno = borrador.turno!;
  const festivo = await cargarFestivo(ctx.db, fecha);

  let horas: string[];
  if (esGrupo(ctx, borrador)) {
    // Grupo: ninguna combinación de mesas llega; ofrecemos el horario del turno
    // y sala decide (la reserva nace pendiente sin mesa)
    horas = horasAbiertas(ctx.config, fecha, turno, festivo);
  } else {
    const [mesas, reservas] = await Promise.all([cargarMesas(ctx.db), cargarReservasDia(ctx.db, fecha)]);
    horas = horasDisponibles(ctx.config, mesas, reservas, fecha, turno, borrador.comensales, festivo, new Date());
  }

  if (horas.length === 0) {
    // Turno completo → volvemos a la elección de fecha como alternativa
    await enviarTexto(ctx.telefono, t(ctx.idioma, 'turnoLleno', { fecha: formatearFecha(fecha, ctx.idioma) }));
    return pedirFecha(ctx, { ...borrador, fecha: undefined, turno: undefined, hora: undefined });
  }

  const filas: FilaLista[] = muestrear(horas, 10).map((h) => ({ id: `hora_${h}`, titulo: h }));
  await guardarConv(ctx, pasoDe(ctx, borrador, 'HORA'), borrador);
  await enviarLista(
    ctx.telefono,
    t(ctx.idioma, 'pideHora', { fecha: formatearFecha(fecha, ctx.idioma) }),
    t(ctx.idioma, 'btnVerHoras'),
    filas
  );
}

async function pedirComensales(ctx: Ctx, borrador: Borrador): Promise<void> {
  const filas: FilaLista[] = [];
  for (let n = 1; n <= 8; n++) {
    filas.push({ id: `pax_${n}`, titulo: n === 1 ? t(ctx.idioma, 'persona') : t(ctx.idioma, 'personas', { n }) });
  }
  filas.push({ id: 'pax_mas', titulo: t(ctx.idioma, 'paxMas') });
  await guardarConv(ctx, 'COMENSALES', borrador);
  await enviarLista(ctx.telefono, t(ctx.idioma, 'pideComensales'), t(ctx.idioma, 'btnVerPax'), filas);
}

async function pedirNombre(ctx: Ctx, borrador: Borrador): Promise<void> {
  await guardarConv(ctx, pasoDe(ctx, borrador, 'NOMBRE'), borrador);
  if (ctx.nombrePerfil) {
    // Ofrecemos el nombre del perfil de WhatsApp como botón
    await enviarBotones(ctx.telefono, t(ctx.idioma, 'pideNombre'), [
      { id: 'nombre_perfil', titulo: ctx.nombrePerfil },
    ]);
  } else {
    await enviarTexto(ctx.telefono, t(ctx.idioma, 'pideNombre'));
  }
}

async function pedirEmail(ctx: Ctx, borrador: Borrador): Promise<void> {
  await guardarConv(ctx, 'EMAIL', borrador);
  await enviarBotones(ctx.telefono, t(ctx.idioma, 'pideEmail'), [
    { id: 'email_saltar', titulo: t(ctx.idioma, 'btnEmailSaltar') },
  ]);
}

async function pedirNotas(ctx: Ctx, borrador: Borrador): Promise<void> {
  await guardarConv(ctx, 'NOTAS', borrador);
  await enviarBotones(ctx.telefono, t(ctx.idioma, 'pideNotas'), [
    { id: 'notas_no', titulo: t(ctx.idioma, 'btnSinNotas') },
  ]);
}

async function pedirConfirmacion(ctx: Ctx, borrador: Borrador): Promise<void> {
  await guardarConv(ctx, 'CONFIRMAR', borrador);
  await enviarBotones(
    ctx.telefono,
    t(ctx.idioma, 'confirmar', {
      fecha: formatearFecha(borrador.fecha!, ctx.idioma),
      hora: borrador.hora!,
      comensales: borrador.comensales!,
      nombre: borrador.nombre!,
      notas: borrador.notas || t(ctx.idioma, 'sinNotas'),
    }),
    [
      { id: 'conf_si', titulo: t(ctx.idioma, 'btnConfSi') },
      { id: 'conf_no', titulo: t(ctx.idioma, 'btnConfNo') },
    ]
  );
}

/** En modo grupo, el paso persistido es siempre GRUPO_DATOS (contrato SCHEMA) */
function pasoDe(ctx: Ctx, borrador: Borrador, paso: Paso): Paso {
  return esGrupo(ctx, borrador) ? 'GRUPO_DATOS' : paso;
}

// ── Creación de la reserva (transacción anti carrera) ────────────────

async function crearReserva(ctx: Ctx, conv: Conversacion, borrador: Borrador): Promise<void> {
  const { fecha, hora, turno, comensales, nombre } = borrador as Required<Borrador>;

  // Revalida horario/festivo antes de escribir: el payload hora_ puede venir de
  // un botón antiguo del historial y el festivo puede haberse creado a mitad de flujo.
  const festivoDia = await cargarFestivo(ctx.db, fecha);
  if (!horasDelTurno(ctx.config, fecha, turno, festivoDia).includes(hora)) {
    await enviarTexto(ctx.telefono, t(ctx.idioma, 'reservaNoCabe'));
    return pedirHora(ctx, { ...borrador, hora: undefined });
  }

  // Reincidente (noshows >= 2): la reserva nace pendiente CON mesa y sala decide
  const clienteSnap = await ctx.db.doc(`clientes/${ctx.telefono}`).get();
  const reincidente = ((clienteSnap.data() as Cliente | undefined)?.noshows ?? 0) >= 2;
  const hoy = ahoraMadrid().fecha;

  const mesas = await cargarMesas(ctx.db); // las mesas cambian poco: fuera de la transacción
  const reservaRef = ctx.db.collection('reservas').doc();
  let mesaIds: string[] = [];

  try {
    await ctx.db.runTransaction(async (tx) => {
      // Releemos las reservas vivas del día DENTRO de la transacción:
      // confirmadas y pendientes con mesa ocupan su turno entero
      const snap = await tx.get(
        ctx.db
          .collection('reservas')
          .where('fecha', '==', fecha)
          .where('estado', 'in', ['confirmada', 'pendiente'])
      );
      const reservasDia = snap.docs.map((d) => d.data() as Reserva);
      const libres = mesasLibres(mesas, reservasDia, turno);
      const asignadas = asignarMesa(libres, comensales);
      if (!asignadas) throw new SinHueco();
      mesaIds = asignadas;

      const reserva: Omit<Reserva, 'creadoEn' | 'actualizadoEn'> = {
        fecha,
        hora,
        turno,
        comensales,
        nombre,
        telefono: ctx.telefono,
        email: borrador.email ?? '',
        mesaIds,
        estado: reincidente ? 'pendiente' : 'confirmada',
        ...(reincidente ? { motivoPendiente: 'reincidente' as const } : {}),
        origen: borrador.web ? 'web' : 'bot',
        idioma: ctx.idioma,
        notas: borrador.notas ?? '',
        recordatorioEnviado: false,
        confirmadaCliente: fecha === hoy, // reserva de mismo día: sin ciclo de recordatorio
        avisoLiberacionEnviado: false,
        pedirResena: false,
      };
      tx.set(reservaRef, {
        ...reserva,
        creadoEn: FieldValue.serverTimestamp(),
        actualizadoEn: FieldValue.serverTimestamp(),
      });
    });
  } catch (error) {
    if (error instanceof SinHueco) {
      // Ya no cabe a esa hora: ofrecemos las horas que sigan libres
      await enviarTexto(ctx.telefono, t(ctx.idioma, 'reservaNoCabe'));
      return pedirHora(ctx, { ...borrador, hora: undefined });
    }
    console.error('[flujo] Error creando la reserva:', error);
    return escalar(ctx, conv, `Error técnico creando reserva: ${String(error)}`);
  }

  await actualizarCliente(ctx, nombre, borrador.email ?? '');
  await guardarConv(ctx, 'IDLE', {});

  if (reincidente) {
    // El cliente ve "te confirmamos enseguida"; sala decide en el panel
    await enviarTexto(ctx.telefono, t(ctx.idioma, 'reservaPendienteCliente'));
  } else {
    await enviarTexto(
      ctx.telefono,
      t(ctx.idioma, 'reservaConfirmada', {
        fecha: formatearFecha(fecha, ctx.idioma),
        hora,
        comensales,
        nombre: ctx.config.nombre,
      })
    );
    // Aviso de cortesía (mensaje aparte): la mesa se guarda cortesiaMin minutos
    await enviarTexto(ctx.telefono, t(ctx.idioma, 'cortesiaAviso', { cortesia: ctx.config.cortesiaMin }));
    // Pin de ubicación del restaurante
    const u = ctx.config.ubicacion;
    await enviarUbicacion(ctx.telefono, u.lat, u.lng, ctx.config.nombre, u.direccion);
  }

  // Aviso de menú especial (Nit del Foc y similares). Solo cenas: son eventos
  // de noche. Se cae a español si falta el idioma para no mandar "undefined".
  const aviso = ctx.config.avisosPorFecha?.[fecha];
  if (aviso && turno === 'cena') {
    const texto = aviso[ctx.idioma] || aviso.es;
    if (texto) await enviarTexto(ctx.telefono, texto);
  }

  // Aviso operativo a sala: SIEMPRE, en cada reserva (fuera de la franja también)
  await avisarSala(
    ctx,
    fichaReserva(reincidente ? '🟡 RESERVA PENDIENTE (reincidente)' : '✅ NUEVA RESERVA', {
      fecha,
      hora,
      comensales,
      nombre,
      telefono: ctx.telefono,
      notas: borrador.notas ?? '',
    })
  );
}

/** Reserva de grupo (> maxComensalesBot): pendiente SIN mesa; sala decide */
async function crearReservaGrupo(ctx: Ctx, borrador: Borrador): Promise<void> {
  const { fecha, turno, hora, comensales, nombre } = borrador;
  const hoy = ahoraMadrid().fecha;

  await ctx.db.collection('reservas').add({
    fecha,
    hora,
    turno,
    comensales,
    nombre,
    telefono: ctx.telefono,
    email: borrador.email ?? '',
    mesaIds: [], // las asigna sala en el panel
    estado: 'pendiente',
    motivoPendiente: 'grupo',
    origen: borrador.web ? 'web' : 'bot',
    idioma: ctx.idioma,
    notas: borrador.notas ?? '',
    recordatorioEnviado: false,
    confirmadaCliente: fecha === hoy,
    avisoLiberacionEnviado: false,
    pedirResena: false,
    creadoEn: FieldValue.serverTimestamp(),
    actualizadoEn: FieldValue.serverTimestamp(),
  });

  await actualizarCliente(ctx, nombre ?? '', borrador.email ?? '');
  await guardarConv(ctx, 'IDLE', {});
  await enviarTexto(ctx.telefono, t(ctx.idioma, 'grupoRecibido'));
  await avisarSala(
    ctx,
    fichaReserva('🟡 GRUPO PENDIENTE', {
      fecha: fecha!,
      hora: hora!,
      comensales: comensales!,
      nombre: nombre!,
      telefono: ctx.telefono,
      notas: [borrador.notas, 'Decidir en el panel'].filter(Boolean).join(' · '),
    })
  );
}

/** Upsert del histórico mínimo clientes/{telefono} (noshows lo lleva el trigger) */
async function actualizarCliente(ctx: Ctx, nombre: string, email: string): Promise<void> {
  await ctx.db.doc(`clientes/${ctx.telefono}`).set(
    { nombre, ...(email ? { email } : {}), actualizadoEn: FieldValue.serverTimestamp() },
    { merge: true }
  );
}

// ── Confirmación del recordatorio (rec_conf_<id>) ────────────────────

async function confirmarCliente(ctx: Ctx, reservaId: string): Promise<void> {
  const ref = ctx.db.doc(`reservas/${reservaId}`);
  const snap = await ref.get();
  const reserva = snap.exists ? (snap.data() as Reserva) : null;

  if (!reserva || reserva.telefono !== ctx.telefono || reserva.estado !== 'confirmada') {
    // Reserva liberada/cancelada entretanto o botón ajeno
    await enviarTexto(ctx.telefono, t(ctx.idioma, 'sinReservas', { telefono: ctx.config.telefonoHumano }));
    return;
  }

  await ref.update({ confirmadaCliente: true, actualizadoEn: FieldValue.serverTimestamp() });
  await enviarTexto(ctx.telefono, t(ctx.idioma, 'graciasConfirmacion'));
}

// ── Cancelación ──────────────────────────────────────────────────────

async function iniciarCancelacion(ctx: Ctx): Promise<void> {
  const hoy = ahoraMadrid().fecha;
  const snap = await ctx.db
    .collection('reservas')
    .where('telefono', '==', ctx.telefono)
    .where('estado', 'in', ['confirmada', 'pendiente'])
    .where('fecha', '>=', hoy)
    .orderBy('fecha')
    .limit(10)
    .get();

  if (snap.empty) {
    await guardarConv(ctx, 'IDLE', {});
    await enviarTexto(ctx.telefono, t(ctx.idioma, 'sinReservas', { telefono: ctx.config.telefonoHumano }));
    return;
  }

  const filas: FilaLista[] = snap.docs.map((d) => {
    const r = d.data() as Reserva;
    return {
      id: `res_cancelar_${d.id}`,
      titulo: `${formatearFecha(r.fecha, ctx.idioma)} ${r.hora}`,
      descripcion: `${r.comensales} pax — ${r.nombre}`,
    };
  });

  await guardarConv(ctx, 'CANCELAR_ELEGIR', {});
  await enviarLista(ctx.telefono, t(ctx.idioma, 'cancelarCual'), t(ctx.idioma, 'btnVerReservas'), filas);
}

async function cancelarReserva(ctx: Ctx, reservaId: string): Promise<void> {
  const ref = ctx.db.doc(`reservas/${reservaId}`);
  const snap = await ref.get();
  const reserva = snap.exists ? (snap.data() as Reserva) : null;

  // Solo puede cancelar sus propias reservas vivas (confirmadas o pendientes)
  if (
    !reserva ||
    reserva.telefono !== ctx.telefono ||
    (reserva.estado !== 'confirmada' && reserva.estado !== 'pendiente')
  ) {
    await guardarConv(ctx, 'IDLE', {});
    await enviarTexto(ctx.telefono, t(ctx.idioma, 'sinReservas', { telefono: ctx.config.telefonoHumano }));
    return;
  }

  // canceladaPor:'cliente' → el trigger del panel no vuelve a notificarle
  await ref.update({ estado: 'cancelada', canceladaPor: 'cliente', actualizadoEn: FieldValue.serverTimestamp() });
  await guardarConv(ctx, 'IDLE', {});
  await enviarTexto(
    ctx.telefono,
    t(ctx.idioma, 'reservaCancelada', { fecha: formatearFecha(reserva.fecha, ctx.idioma), hora: reserva.hora })
  );
  await avisarSala(
    ctx,
    fichaReserva('❌ CANCELADA', {
      fecha: reserva.fecha,
      hora: reserva.hora,
      comensales: reserva.comensales,
      nombre: reserva.nombre,
      telefono: reserva.telefono,
      notas: reserva.notas,
    })
  );
  await enviarMenu(ctx); // por si quiere volver a reservar (modificar = cancelar + reservar)
}

// ── Escalado a humano ────────────────────────────────────────────────

async function escalar(ctx: Ctx, conv: Conversacion, motivo: string): Promise<void> {
  await guardarConv(ctx, 'ESPERANDO_HUMANO', conv.borrador ?? {});

  if (enAtencionHumana(ctx.config)) {
    await enviarBotones(ctx.telefono, t(ctx.idioma, 'escalado', { telefono: ctx.config.telefonoHumano }), [
      { id: 'menu_volver', titulo: t(ctx.idioma, 'btnVolverMenu') },
    ]);
    const resumen = resumenEscalado(ctx, conv, motivo);
    const ahora = ahoraMadrid();
    // El escalado no es una reserva: los huecos del formato ficha van a "-" y
    // el detalle entero viaja aplanado en NOTAS (la plantilla no admite saltos).
    await avisarSala(
      ctx,
      {
        titulo: '⚠️ ATENCIÓN MANUAL',
        fecha: formatearFecha(ahora.fecha, 'es'),
        hora: ahora.hora,
        personas: String(conv.borrador?.comensales ?? '-'),
        nombre: conv.borrador?.nombre ?? ctx.nombrePerfil ?? '-',
        telefono: `+${ctx.telefono}`,
        notas: resumen,
      },
      `⚠️ Bot: ${resumen}`
    );
  } else {
    // Buzón nocturno: no suena el móvil de Jose; el resumenDiario lo entrega a las 9:31
    await enviarBotones(
      ctx.telefono,
      t(ctx.idioma, 'buzonNocturno', {
        inicio: ctx.config.atencionHumana.inicio,
        telefono: ctx.config.telefonoHumano,
      }),
      [{ id: 'menu_volver', titulo: t(ctx.idioma, 'btnVolverMenu') }]
    );
    await ctx.db.collection('avisosPendientes').add({
      telefono: ctx.telefono,
      resumen: resumenEscalado(ctx, conv, motivo),
      creadoEn: FieldValue.serverTimestamp(),
    });
  }
}

/** Resumen interno de un escalado (siempre en español) */
function resumenEscalado(ctx: Ctx, conv: Conversacion, motivo: string): string {
  const borrador = conv.borrador && Object.keys(conv.borrador).length > 0 ? JSON.stringify(conv.borrador) : '(vacío)';
  return (
    `cliente +${ctx.telefono}${ctx.nombrePerfil ? ` (${ctx.nombrePerfil})` : ''} necesita atención.\n` +
    `Motivo: ${motivo}\nPaso: ${conv.paso} · Idioma: ${ctx.idioma}\nBorrador: ${borrador}`
  );
}

/**
 * Aviso operativo inmediato al WhatsApp de recepción (siempre, a cualquier hora).
 * Va por plantilla para no depender de la ventana de 24 h de WhatsApp.
 */
async function avisarSala(ctx: Ctx, campos: CamposFicha, respaldo?: string): Promise<void> {
  await enviarFichaSala(ctx.config.whatsappHumano, campos, respaldo);
}

/** Campos de la ficha a sala a partir de una reserva (formato de la plantilla) */
export function fichaReserva(
  titulo: string,
  r: { fecha: string; hora: string; comensales: number; nombre: string; telefono: string; notas?: string }
): CamposFicha {
  return {
    titulo,
    fecha: formatearFecha(r.fecha, 'es'),
    hora: r.hora,
    personas: String(r.comensales),
    nombre: r.nombre,
    telefono: `+${r.telefono}`,
    notas: r.notas ?? '',
  };
}

/** true si la hora actual de Madrid cae dentro de config.atencionHumana */
function enAtencionHumana(config: Config): boolean {
  const { hora } = ahoraMadrid();
  return hora >= config.atencionHumana.inicio && hora < config.atencionHumana.fin;
}

// ── Utilidades ───────────────────────────────────────────────────────

async function enviarSaludo(ctx: Ctx): Promise<void> {
  await enviarBotones(
    ctx.telefono,
    t(ctx.idioma, 'saludo', { bot: ctx.config.nombreBot, nombre: ctx.config.nombre }) + '\n\n' + t(ctx.idioma, 'menu'),
    botonesMenu(ctx.idioma)
  );
}

async function enviarMenu(ctx: Ctx): Promise<void> {
  await enviarBotones(ctx.telefono, t(ctx.idioma, 'menu'), botonesMenu(ctx.idioma));
}

function botonesMenu(idioma: Idioma): { id: string; titulo: string }[] {
  return [
    { id: 'menu_reservar', titulo: t(idioma, 'btnReservar') },
    { id: 'menu_carta', titulo: t(idioma, 'btnCarta') },
    { id: 'menu_humano', titulo: t(idioma, 'btnHumano') },
  ];
}

async function guardarConv(ctx: Ctx, paso: Paso, borrador: Borrador): Promise<void> {
  // Firestore rechaza undefined: limpiamos claves vacías del borrador
  const limpio = Object.fromEntries(Object.entries(borrador).filter(([, v]) => v !== undefined));
  await ctx.db.doc(`conversaciones/${ctx.telefono}`).set({
    paso,
    idioma: ctx.idioma,
    baja: ctx.baja,
    borrador: limpio,
    actualizadoEn: FieldValue.serverTimestamp(),
  });
}

type ValidezFecha = 'ok' | 'noValida' | 'fueraRango' | 'cerrada' | 'ultimaHora';

async function validarFecha(ctx: Ctx, fecha: string): Promise<ValidezFecha> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return 'noValida';
  const hoy = ahoraMadrid().fecha;
  const dias = diferenciaDias(hoy, fecha);
  // "2026-13-45" pasa el regex pero no es una fecha (diferenciaDias da NaN)
  if (!Number.isFinite(dias) || dias < 0) return 'noValida';
  if (dias > ctx.config.antelacionMaxDias) return 'fueraRango';
  const festivo = await cargarFestivo(ctx.db, fecha);
  const abierto =
    horasAbiertas(ctx.config, fecha, 'comida', festivo).length > 0 ||
    horasAbiertas(ctx.config, fecha, 'cena', festivo).length > 0;
  if (abierto) return 'ok';
  return esUltimaHora(ctx.config, fecha, festivo) ? 'ultimaHora' : 'cerrada';
}

async function avisarFechaInvalida(ctx: Ctx, borrador: Borrador, validez: ValidezFecha): Promise<void> {
  await guardarConv(ctx, pasoDe(ctx, borrador, 'FECHA'), { ...borrador, fecha: undefined });
  if (validez === 'fueraRango') {
    await enviarTexto(ctx.telefono, t(ctx.idioma, 'fechaFueraRango', { dias: ctx.config.antelacionMaxDias }));
  } else if (validez === 'cerrada') {
    await enviarTexto(ctx.telefono, t(ctx.idioma, 'fechaCerrada'));
  } else if (validez === 'ultimaHora') {
    await enviarTexto(
      ctx.telefono,
      t(ctx.idioma, 'fechaUltimaHora', { horas: ctx.config.antelacionMinHoras, telefono: ctx.config.telefonoHumano })
    );
  } else {
    await enviarTexto(ctx.telefono, t(ctx.idioma, 'fechaNoValida'));
  }
}

/** Horas de entrada del turno según horario/festivo, aplicando la antelación
 *  mínima si la fecha es hoy (sin mirar ocupación de mesas). */
function horasAbiertas(config: Config, fecha: string, turno: Turno, festivo: Festivo | null): string[] {
  let horas = horasDelTurno(config, fecha, turno, festivo);
  const ahora = ahoraMadrid();
  if (fecha === ahora.fecha) {
    const limite = aMinutos(ahora.hora) + config.antelacionMinHoras * 60;
    horas = horas.filter((h) => aMinutos(h) >= limite);
  }
  return horas;
}

/** Muestreo uniforme para no pasar de `max` filas en una lista de WhatsApp */
function muestrear<T>(items: T[], max: number): T[] {
  if (items.length <= max) return items;
  const resultado: T[] = [];
  for (let i = 0; i < max; i++) {
    resultado.push(items[Math.round((i * (items.length - 1)) / (max - 1))]);
  }
  return resultado;
}

export function formatearFecha(fecha: string, idioma: Idioma): string {
  // Valencià: Node solo trae el locale "ca" (suficiente para fechas cortas)
  const locales: Record<Idioma, string> = { es: 'es-ES', va: 'ca-ES', en: 'en-GB', de: 'de-DE', fr: 'fr-FR' };
  return new Intl.DateTimeFormat(locales[idioma], {
    timeZone: 'UTC', // la fecha ya es de calendario; a mediodía UTC no hay ambigüedad
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(new Date(`${fecha}T12:00:00Z`));
}

// ── Acceso a datos ───────────────────────────────────────────────────

async function cargarFestivo(db: Firestore, fecha: string): Promise<Festivo | null> {
  const snap = await db.doc(`festivos/${fecha}`).get();
  return snap.exists ? (snap.data() as Festivo) : null;
}

async function cargarMesas(db: Firestore): Promise<MesaConId[]> {
  const snap = await db.collection('mesas').get();
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Mesa) }));
}

/** Reservas vivas del día (confirmadas y pendientes: ambas ocupan mesa) */
async function cargarReservasDia(db: Firestore, fecha: string): Promise<Reserva[]> {
  const snap = await db
    .collection('reservas')
    .where('fecha', '==', fecha)
    .where('estado', 'in', ['confirmada', 'pendiente'])
    .get();
  return snap.docs.map((d) => d.data() as Reserva);
}

async function cargarCarta(db: Firestore): Promise<SeccionCarta[]> {
  const snap = await db.collection('carta').get();
  return snap.docs.map((d) => d.data() as SeccionCarta);
}
