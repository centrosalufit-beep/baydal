// wpapi.ts — API HTTP para el plugin de WordPress: carta, horario e infoPractica.
// Frontera de confianza: el token vive en un WordPress con muchos plugins; si se
// filtrara, el daño queda limitado a carta/horario/info. Reservas, clientes y
// conversaciones (datos personales, RGPD) son inalcanzables desde aquí. Ojo: carta
// e infoPractica entran en el system prompt de Claude (claude.ts), así que un token
// filtrado permitiría hacer decir cosas falsas a Paco — otra razón para rotarlo rápido.
// Limitación conocida: un JSON malformado lo responde el body-parser de la plataforma
// (400 text/html) antes de llegar aquí; el plugin lo trata como "HTTP 400" genérico.
// Contrato en docs/INTEGRACION_WEB.md del lado WordPress.

import { timingSafeEqual } from 'node:crypto';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import type { Request } from 'firebase-functions/v2/https';
import type { Config, HorarioDia, ItemCarta, RangoHoras, SeccionCarta, TextoIdiomas } from './tipos';

const MAX_CUERPO_BYTES = 300 * 1024; // ninguna carta legítima pesa más
const ID_SECCION = /^[A-Za-z0-9_-]{1,64}$/; // seguro para interpolar en rutas de Firestore
const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;
const IDIOMAS: (keyof TextoIdiomas)[] = ['es', 'va', 'en', 'de', 'fr'];
const DIAS = ['0', '1', '2', '3', '4', '5', '6']; // domingo..sábado, como Config.horario

// ── Validadores puros (exportados para tests) ────────────────────────

/** Resultado de un validador: el objeto LIMPIO que se escribe, o el motivo del 400 */
export type Validacion<T> = { ok: true; valor: T } | { ok: false; error: string };

function mal(error: string): { ok: false; error: string } {
  return { ok: false, error };
}

/** true si v es un objeto plano (ni null, ni array, ni Buffer — un body no-JSON
 *  llega como Buffer y Object.keys() sobre él enumeraría una clave por byte) */
function esObjeto(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v) && !Buffer.isBuffer(v);
}

/** Primera clave de obj que no esté en permitidas, o null si no hay extras */
function claveExtra(obj: Record<string, unknown>, permitidas: string[]): string | null {
  return Object.keys(obj).find((k) => !permitidas.includes(k)) ?? null;
}

/** TextoIdiomas: exactamente es/va/en/de/fr, strings de longitud ≤ max */
function validarTextoIdiomas(v: unknown, max: number, campo: string): Validacion<TextoIdiomas> {
  if (!esObjeto(v)) return mal(`${campo} debe ser un objeto con los idiomas es/va/en/de/fr`);
  const extra = claveExtra(v, IDIOMAS);
  if (extra !== null) return mal(`${campo} tiene una clave desconocida: "${extra}"`);
  const limpio = {} as TextoIdiomas;
  for (const idioma of IDIOMAS) {
    const texto = v[idioma];
    if (typeof texto !== 'string') return mal(`${campo}.${idioma} debe ser un string`);
    if (texto.length > max) return mal(`${campo}.${idioma} supera los ${max} caracteres`);
    limpio[idioma] = texto;
  }
  return { ok: true, valor: limpio };
}

/** Item de la carta: solo los campos del tipo, copiados uno a uno */
function validarItem(v: unknown, campo: string): Validacion<ItemCarta> {
  if (!esObjeto(v)) return mal(`${campo} debe ser un objeto`);
  const extra = claveExtra(v, ['nombre', 'descripcion', 'precio', 'porPersona', 'disponible', 'alergenos']);
  if (extra !== null) return mal(`${campo} tiene una clave desconocida: "${extra}"`);
  const nombre = validarTextoIdiomas(v.nombre, 200, `${campo}.nombre`);
  if (!nombre.ok) return nombre;
  if (typeof v.precio !== 'number' || !Number.isFinite(v.precio) || v.precio < 0) {
    return mal(`${campo}.precio debe ser un número finito ≥ 0`);
  }
  if (typeof v.porPersona !== 'boolean') return mal(`${campo}.porPersona debe ser boolean`);
  if (typeof v.disponible !== 'boolean') return mal(`${campo}.disponible debe ser boolean`);
  const limpio: ItemCarta = { nombre: nombre.valor, precio: v.precio, porPersona: v.porPersona, disponible: v.disponible };
  if (v.descripcion !== undefined) {
    const descripcion = validarTextoIdiomas(v.descripcion, 500, `${campo}.descripcion`);
    if (!descripcion.ok) return descripcion;
    limpio.descripcion = descripcion.valor;
  }
  if (v.alergenos !== undefined) {
    if (!Array.isArray(v.alergenos) || v.alergenos.length > 20) {
      return mal(`${campo}.alergenos debe ser un array de hasta 20 strings`);
    }
    const alergenos: string[] = [];
    for (const a of v.alergenos) {
      if (typeof a !== 'string' || a.length > 40) return mal(`${campo}.alergenos solo admite strings de hasta 40 caracteres`);
      alergenos.push(a);
    }
    limpio.alergenos = alergenos;
  }
  return { ok: true, valor: limpio };
}

/** Sección sin id (body de POST/PUT /carta): devuelve la copia LIMPIA que se escribe */
export function validarSeccion(v: unknown): Validacion<SeccionCarta> {
  if (!esObjeto(v)) return mal('el cuerpo debe ser un objeto sección');
  const extra = claveExtra(v, ['nombre', 'orden', 'visible', 'items']);
  if (extra !== null) return mal(`clave desconocida en la sección: "${extra}"`);
  const nombre = validarTextoIdiomas(v.nombre, 200, 'nombre');
  if (!nombre.ok) return nombre;
  if (typeof v.orden !== 'number' || !Number.isInteger(v.orden) || v.orden < 0 || v.orden > 999) {
    return mal('orden debe ser un entero entre 0 y 999');
  }
  if (typeof v.visible !== 'boolean') return mal('visible debe ser boolean');
  if (!Array.isArray(v.items) || v.items.length > 120) return mal('items debe ser un array de hasta 120 platos');
  const items: ItemCarta[] = [];
  for (let i = 0; i < v.items.length; i++) {
    const item = validarItem(v.items[i], `items[${i}]`);
    if (!item.ok) return item;
    items.push(item.valor);
  }
  return { ok: true, valor: { nombre: nombre.valor, orden: v.orden, visible: v.visible, items } };
}

/** Id de sección seguro para interpolar en carta/{id}; excluye los ids
 *  reservados de Firestore (__x__), que el SDK no valida y revientan en el backend */
export function validarIdSeccion(id: unknown): id is string {
  return typeof id === 'string' && ID_SECCION.test(id) && !/^__.*__$/.test(id);
}

/** Turno de un día: null (cerrado) o { inicio, fin } en HH:mm con inicio < fin */
function validarTurno(v: unknown, campo: string): Validacion<RangoHoras | null> {
  if (v === null) return { ok: true, valor: null };
  if (!esObjeto(v)) return mal(`${campo} debe ser null o { inicio, fin }`);
  const extra = claveExtra(v, ['inicio', 'fin']);
  if (extra !== null) return mal(`${campo} tiene una clave desconocida: "${extra}"`);
  const { inicio, fin } = v;
  if (typeof inicio !== 'string' || !HORA.test(inicio)) return mal(`${campo}.inicio debe ser una hora HH:mm`);
  if (typeof fin !== 'string' || !HORA.test(fin)) return mal(`${campo}.fin debe ser una hora HH:mm`);
  if (inicio >= fin) return mal(`${campo}: inicio debe ser anterior a fin`); // HH:mm compara bien como string
  return { ok: true, valor: { inicio, fin } };
}

/** Body de PUT /horario: {"horario":{...}} con EXACTAMENTE los días "0".."6" */
export function validarHorario(body: unknown): Validacion<{ [dia: string]: HorarioDia }> {
  if (!esObjeto(body)) return mal('el cuerpo debe ser {"horario":{...}}');
  const extra = claveExtra(body, ['horario']);
  if (extra !== null) return mal(`clave desconocida en el cuerpo: "${extra}"`);
  const h = body.horario;
  if (!esObjeto(h)) return mal('horario debe ser un objeto con los días "0".."6"');
  const extraDia = claveExtra(h, DIAS);
  if (extraDia !== null) return mal(`horario tiene una clave desconocida: "${extraDia}"`);
  const limpio: { [dia: string]: HorarioDia } = {};
  for (const dia of DIAS) {
    const d = h[dia];
    if (!esObjeto(d)) return mal(`horario["${dia}"] debe ser { comida, cena } (domingo=0..sábado=6)`);
    const extraTurno = claveExtra(d, ['comida', 'cena']);
    if (extraTurno !== null) return mal(`horario["${dia}"] tiene una clave desconocida: "${extraTurno}"`);
    const comida = validarTurno(d.comida, `horario["${dia}"].comida`);
    if (!comida.ok) return comida;
    const cena = validarTurno(d.cena, `horario["${dia}"].cena`);
    if (!cena.ok) return cena;
    limpio[dia] = { comida: comida.valor, cena: cena.valor };
  }
  return { ok: true, valor: limpio };
}

/** Body de PUT /info: {"infoPractica":"..."} exacto, string ≤ 10000 */
export function validarInfo(body: unknown): Validacion<string> {
  if (!esObjeto(body)) return mal('el cuerpo debe ser {"infoPractica":"..."}');
  const extra = claveExtra(body, ['infoPractica']);
  if (extra !== null) return mal(`clave desconocida en el cuerpo: "${extra}"`);
  if (typeof body.infoPractica !== 'string') return mal('infoPractica debe ser un string');
  if (body.infoPractica.length > 10000) return mal('infoPractica supera los 10000 caracteres');
  return { ok: true, valor: body.infoPractica };
}

/** Compara "Authorization: Bearer x" con el secret en tiempo constante */
export function tokenValido(cabecera: string | undefined, secreto: string): boolean {
  if (!secreto) return false; // secret sin configurar → nadie entra
  const recibido = cabecera?.startsWith('Bearer ') ? cabecera.slice(7) : '';
  const a = Buffer.from(recibido);
  const b = Buffer.from(secreto);
  return a.length === b.length && timingSafeEqual(a, b);
}

// ── Handler HTTP (index.ts lo registra como wpApi con el secret) ─────

/** Lo mínimo que usamos de express.Response (evita importar sus tipos) */
export interface Respuesta {
  status(codigo: number): Respuesta;
  json(cuerpo: unknown): void;
}

export async function manejarWpApi(req: Request, res: Respuesta, secreto: string): Promise<void> {
  if (!tokenValido(req.header('authorization'), secreto)) {
    res.status(401).json({ error: 'no autorizado' });
    return;
  }
  // Fail-closed: si un método con cuerpo llega sin rawBody no podemos medirlo → 400
  const conCuerpo = req.method === 'POST' || req.method === 'PUT';
  if (conCuerpo && (!req.rawBody || req.rawBody.length > MAX_CUERPO_BYTES)) {
    res.status(400).json({ error: 'cuerpo ausente o demasiado grande' });
    return;
  }
  try {
    await despachar(req, res);
  } catch (error) {
    console.error(`[wpapi] Error en ${req.method} ${req.path}:`, error);
    res.status(500).json({ error: 'error interno' });
  }
}

/** Enruta por req.path a mano (sin express) */
async function despachar(req: Request, res: Respuesta): Promise<void> {
  const db = getFirestore();
  const partes = req.path.split('/').filter(Boolean);
  const [recurso, id] = partes;

  if (recurso === 'carta' && partes.length === 1) {
    if (req.method === 'GET') {
      const snap = await db.collection('carta').get();
      // ponytail: orden en memoria (pocas secciones), sin depender del índice
      const secciones = snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as SeccionCarta) }))
        .sort((a, b) => a.orden - b.orden);
      res.status(200).json({ secciones });
      return;
    }
    if (req.method === 'POST') {
      const v = validarSeccion(req.body);
      if (!v.ok) return void res.status(400).json({ error: v.error });
      const ahora = FieldValue.serverTimestamp();
      const ref = await db.collection('carta').add({ ...v.valor, creadoEn: ahora, actualizadoEn: ahora });
      res.status(201).json({ id: ref.id });
      return;
    }
    res.status(405).json({ error: 'método no soportado' });
    return;
  }

  if (recurso === 'carta' && partes.length === 2) {
    if (!validarIdSeccion(id)) return void res.status(400).json({ error: 'id de sección inválido' });
    const ref = db.doc(`carta/${id}`);
    if (req.method === 'PUT') {
      const v = validarSeccion(req.body);
      if (!v.ok) return void res.status(400).json({ error: v.error });
      // set completo con upsert (el contrato), conservando creadoEn como el panel
      const previo = await ref.get();
      const ahora = FieldValue.serverTimestamp();
      await ref.set({ ...v.valor, creadoEn: previo.get('creadoEn') ?? ahora, actualizadoEn: ahora });
      res.status(200).json({ ok: true });
      return;
    }
    if (req.method === 'DELETE') {
      if (!(await ref.get()).exists) return void res.status(404).json({ error: 'sección no encontrada' });
      await ref.delete();
      res.status(200).json({ ok: true });
      return;
    }
    res.status(405).json({ error: 'método no soportado' });
    return;
  }

  // /horario y /info: campos sueltos de config/restaurante (update, nunca set)
  if ((recurso === 'horario' || recurso === 'info') && partes.length === 1) {
    const ref = db.doc('config/restaurante');
    if (req.method === 'GET') {
      const config = (await ref.get()).data() as Config | undefined;
      if (!config) return void res.status(404).json({ error: 'configuración no encontrada' });
      if (recurso === 'horario') {
        // Sin horario no se devuelve {} — el editor lo pintaría todo cerrado y al
        // guardar lo escribiría de verdad; mejor 404 y que se ejecute el seed
        if (!config.horario) return void res.status(404).json({ error: 'la configuración no tiene horario (falta el seed)' });
        res.status(200).json({ horario: config.horario });
      } else {
        res.status(200).json({ infoPractica: config.infoPractica ?? '' });
      }
      return;
    }
    if (req.method === 'PUT') {
      const v = recurso === 'horario' ? validarHorario(req.body) : validarInfo(req.body);
      if (!v.ok) return void res.status(400).json({ error: v.error });
      if (!(await ref.get()).exists) return void res.status(404).json({ error: 'configuración no encontrada' });
      const cambio = recurso === 'horario' ? { horario: v.valor } : { infoPractica: v.valor };
      await ref.update({ ...cambio, actualizadoEn: FieldValue.serverTimestamp() });
      res.status(200).json({ ok: true });
      return;
    }
    res.status(405).json({ error: 'método no soportado' });
    return;
  }

  res.status(404).json({ error: 'ruta desconocida' });
}
