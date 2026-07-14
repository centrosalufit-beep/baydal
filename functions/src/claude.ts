// claude.ts — Integración con Claude Haiku para (1) interpretar texto libre
// del cliente, (2) responder preguntas sobre la carta/horarios e info práctica,
// y (3) transcribir notas de voz con Whisper (OpenAI).
// Si Claude falla, interpretar() devuelve intencion 'otro' (el flujo escala).

import Anthropic from '@anthropic-ai/sdk';
import type { Config, Idioma, SeccionCarta, Turno } from './tipos';
import { ahoraMadrid } from './disponibilidad';
import { descargarMedia } from './whatsapp';

const MODELO = 'claude-haiku-4-5-20251001';

// Cliente perezoso: la API key (secret ANTHROPIC_API_KEY) solo existe en
// tiempo de ejecución; el SDK la lee de process.env automáticamente.
let cliente: Anthropic | null = null;
function getCliente(): Anthropic {
  if (!cliente) cliente = new Anthropic();
  return cliente;
}

export type Intencion = 'reservar' | 'cancelar' | 'modificar' | 'carta' | 'horarios' | 'info' | 'humano' | 'otro';

export interface Interpretacion {
  intencion: Intencion;
  datos: {
    fecha?: string; // YYYY-MM-DD
    turno?: Turno;
    hora?: string; // HH:mm
    comensales?: number;
  };
  idioma: Idioma;
}

const IDIOMAS: Idioma[] = ['es', 'va', 'en', 'de', 'fr'];
const INTENCIONES: Intencion[] = ['reservar', 'cancelar', 'modificar', 'carta', 'horarios', 'info', 'humano', 'otro'];

/** Día de la semana de hoy en Madrid, en español, para resolver "el sábado" */
function hoyLegible(): string {
  const { fecha } = ahoraMadrid();
  const diaSemana = new Intl.DateTimeFormat('es-ES', {
    timeZone: 'Europe/Madrid',
    weekday: 'long',
  }).format(new Date());
  return `${diaSemana} ${fecha}`;
}

/**
 * Clasifica un mensaje libre del cliente en intención + datos de reserva
 * + idioma detectado. Usa tool-use forzado para obtener JSON fiable.
 */
export async function interpretar(texto: string, contexto: string): Promise<Interpretacion> {
  try {
    const respuesta = await getCliente().messages.create({
      model: MODELO,
      max_tokens: 300,
      system:
        `Eres el clasificador de mensajes del bot de WhatsApp de un restaurante español (Calpe). ` +
        `Hoy es ${hoyLegible()} (zona Europe/Madrid): resuelve expresiones relativas como "mañana" o "el sábado" ` +
        `a fechas YYYY-MM-DD FUTURAS respecto a hoy. Turno: comida (mediodía) o cena (noche). ` +
        `Extrae SOLO datos que el cliente mencione explícitamente. ` +
        `Detecta el idioma del mensaje (es/va/en/de/fr): "va" es valencià — si el cliente escribe ` +
        `en valencià o catalán, el idioma es "va". Contexto de la conversación: ${contexto}`,
      messages: [{ role: 'user', content: texto }],
      tools: [
        {
          name: 'clasificar',
          description: 'Clasifica el mensaje del cliente del restaurante',
          input_schema: {
            type: 'object',
            properties: {
              intencion: {
                type: 'string',
                enum: INTENCIONES,
                description:
                  'reservar=quiere mesa; cancelar=anular reserva; modificar=cambiar reserva; ' +
                  'carta=pregunta por platos/precios/alérgenos; horarios=pregunta horarios/apertura; ' +
                  'info=duda práctica (parking, perros, tronas, acceso, cómo llegar…); ' +
                  'humano=pide hablar con una persona; otro=no encaja o no se entiende',
              },
              fecha: { type: 'string', description: 'Fecha de la reserva en YYYY-MM-DD, si la menciona' },
              turno: { type: 'string', enum: ['comida', 'cena'], description: 'Turno, si se deduce' },
              hora: { type: 'string', description: 'Hora de entrada HH:mm en 24h, si la menciona' },
              comensales: { type: 'integer', description: 'Número de personas, si lo menciona' },
              idioma: { type: 'string', enum: IDIOMAS, description: 'Idioma del mensaje' },
            },
            required: ['intencion', 'idioma'],
          },
        },
      ],
      tool_choice: { type: 'tool', name: 'clasificar' },
    });

    const bloque = respuesta.content.find((b) => b.type === 'tool_use');
    if (!bloque || bloque.type !== 'tool_use') throw new Error('sin bloque tool_use');
    const datos = bloque.input as Record<string, unknown>;

    // Validación defensiva: nunca fiarse del JSON tal cual
    const intencion = INTENCIONES.includes(datos.intencion as Intencion)
      ? (datos.intencion as Intencion)
      : 'otro';
    const idioma = IDIOMAS.includes(datos.idioma as Idioma) ? (datos.idioma as Idioma) : 'es';

    return {
      intencion,
      idioma,
      datos: {
        fecha: /^\d{4}-\d{2}-\d{2}$/.test(String(datos.fecha)) ? (datos.fecha as string) : undefined,
        turno: datos.turno === 'comida' || datos.turno === 'cena' ? datos.turno : undefined,
        hora: /^\d{2}:\d{2}$/.test(String(datos.hora)) ? (datos.hora as string) : undefined,
        comensales:
          typeof datos.comensales === 'number' && datos.comensales > 0
            ? Math.floor(datos.comensales)
            : undefined,
      },
    };
  } catch (error) {
    console.error('[claude] interpretar falló:', error);
    return { intencion: 'otro', datos: {}, idioma: 'es' }; // el flujo escala
  }
}

/** Serializa las secciones visibles y sus items disponibles para el prompt */
function cartaComoTexto(secciones: SeccionCarta[], idioma: Idioma): string {
  return secciones
    .filter((s) => s.visible)
    .sort((a, b) => a.orden - b.orden)
    .map((s) => {
      const items = s.items
        .filter((i) => i.disponible)
        .map((i) => {
          const precio = i.precio === 0 ? 's/m' : `${i.precio} €${i.porPersona ? '/persona (mín. 2)' : ''}`;
          const desc = i.descripcion ? ` — ${i.descripcion[idioma] || i.descripcion.es}` : '';
          const alergenos = i.alergenos?.length ? ` [alérgenos: ${i.alergenos.join(', ')}]` : '';
          return `- ${i.nombre[idioma] || i.nombre.es}${desc}: ${precio}${alergenos}`;
        })
        .join('\n');
      return `## ${s.nombre[idioma] || s.nombre.es}\n${items}`;
    })
    .join('\n\n');
}

/** Serializa el horario semanal del restaurante para el prompt */
function horarioComoTexto(config: Config): string {
  const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  return dias
    .map((nombre, i) => {
      const h = config.horario[String(i)];
      const comida = h?.comida ? `comida ${h.comida.inicio}-${h.comida.fin}` : 'comida cerrado';
      const cena = h?.cena ? `cena ${h.cena.inicio}-${h.cena.fin}` : 'cena cerrado';
      return `${nombre}: ${comida}, ${cena}`;
    })
    .join('\n');
}

/**
 * Responde una duda práctica usando ÚNICAMENTE config.infoPractica.
 * Devuelve null si la respuesta no está en esa información o si Claude
 * falla — en ambos casos el flujo escala a humano.
 */
export async function responderInfo(
  pregunta: string,
  config: Config,
  idioma: Idioma
): Promise<string | null> {
  try {
    const respuesta = await getCliente().messages.create({
      model: MODELO,
      max_tokens: 300,
      system:
        `Eres ${config.nombreBot}, el asistente de WhatsApp de ${config.nombre}. Responde a la ` +
        `duda práctica del cliente de forma BREVE, cercana, en el idioma "${idioma}" ("va" = valencià). ` +
        `Tutea en es/va; registro cordial estándar en en/de/fr. Usa ÚNICAMENTE la información ` +
        `siguiente. Si la respuesta NO está en esa información, responde exactamente NOINFO ` +
        `(sin nada más).\n\nINFORMACIÓN PRÁCTICA:\n${config.infoPractica}`,
      messages: [{ role: 'user', content: pregunta }],
    });

    const bloque = respuesta.content.find((b) => b.type === 'text');
    if (!bloque || bloque.type !== 'text') return null;
    const texto = bloque.text.trim();
    return texto.includes('NOINFO') ? null : texto;
  } catch (error) {
    console.error('[claude] responderInfo falló:', error);
    return null;
  }
}

/**
 * Transcribe una nota de voz de WhatsApp: descarga el media de Meta y lo
 * envía a Whisper (OpenAI, whisper-1). Devuelve null si algo falla — el
 * flujo pedirá el mensaje por texto.
 */
export async function transcribir(mediaId: string): Promise<string | null> {
  const media = await descargarMedia(mediaId);
  if (!media) return null;
  try {
    const form = new FormData();
    form.append('file', new Blob([media.buffer], { type: media.mime }), 'audio.ogg');
    form.append('model', 'whisper-1');
    const respuesta = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: form,
    });
    if (!respuesta.ok) {
      const detalle = await respuesta.text().catch(() => '(sin cuerpo)');
      console.error(`[whisper] Error ${respuesta.status} transcribiendo ${mediaId}: ${detalle}`);
      return null;
    }
    const json = (await respuesta.json()) as { text?: string };
    return json.text?.trim() || null;
  } catch (error) {
    console.error(`[whisper] Fallo transcribiendo ${mediaId}:`, error);
    return null;
  }
}

/**
 * Responde una pregunta sobre la carta u horarios usando SOLO los datos
 * dados. Devuelve null si Claude falla (el flujo escala a humano).
 */
export async function responderCarta(
  pregunta: string,
  secciones: SeccionCarta[],
  config: Config,
  idioma: Idioma
): Promise<string | null> {
  try {
    const respuesta = await getCliente().messages.create({
      model: MODELO,
      max_tokens: 400,
      system:
        `Eres ${config.nombreBot}, el asistente de WhatsApp de ${config.nombre}. Responde a la ` +
        `pregunta del cliente de forma BREVE (máx. 4-5 líneas), cercana, en el idioma "${idioma}" ` +
        `("va" = valencià). Tutea en es/va; registro cordial estándar en en/de/fr. ` +
        `Usa ÚNICAMENTE la información siguiente; si algo no aparece, di amablemente que ` +
        `lo consulte por teléfono (${config.telefonoHumano}). "s/m" significa según mercado.\n\n` +
        `HORARIO (entrada):\n${horarioComoTexto(config)}\n\nCARTA:\n${cartaComoTexto(secciones, idioma)}`,
      messages: [{ role: 'user', content: pregunta }],
    });

    const bloque = respuesta.content.find((b) => b.type === 'text');
    return bloque && bloque.type === 'text' ? bloque.text : null;
  } catch (error) {
    console.error('[claude] responderCarta falló:', error);
    return null;
  }
}
