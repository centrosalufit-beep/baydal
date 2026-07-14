// whatsapp.ts — Cliente de la WhatsApp Cloud API (Graph API v23.0) con fetch.
// Los errores se registran con log claro y NUNCA se lanzan hacia el webhook:
// todas las funciones devuelven true/false.

const VERSION_API = 'v23.0';

// Credenciales inyectadas por index.ts al arrancar cada invocación
// (los secrets solo están disponibles en tiempo de ejecución).
let phoneId = '';
let token = '';

export function inicializarWhatsApp(idTelefono: string, tokenAcceso: string): void {
  phoneId = idTelefono;
  token = tokenAcceso;
}

/** Botón de respuesta rápida (máx 3 por mensaje, títulos máx 20 caracteres) */
export interface Boton {
  id: string;
  titulo: string;
}

/** Fila de una lista interactiva (máx 10 por mensaje, títulos máx 24 caracteres) */
export interface FilaLista {
  id: string;
  titulo: string;
  descripcion?: string;
}

/** Recorta un texto al máximo permitido por la API */
function recortar(texto: string, max: number): string {
  return texto.length <= max ? texto : texto.slice(0, max - 1) + '…';
}

/** POST genérico a /{phoneId}/messages. Devuelve true si Meta acepta el envío. */
async function enviar(cuerpo: Record<string, unknown>, descripcion: string): Promise<boolean> {
  try {
    const respuesta = await fetch(`https://graph.facebook.com/${VERSION_API}/${phoneId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messaging_product: 'whatsapp', ...cuerpo }),
    });
    if (!respuesta.ok) {
      const detalle = await respuesta.text().catch(() => '(sin cuerpo)');
      console.error(`[whatsapp] Error ${respuesta.status} enviando ${descripcion} a ${cuerpo.to}: ${detalle}`);
      return false;
    }
    return true;
  } catch (error) {
    console.error(`[whatsapp] Fallo de red enviando ${descripcion} a ${cuerpo.to}:`, error);
    return false;
  }
}

/** Mensaje de texto plano */
export function enviarTexto(a: string, texto: string): Promise<boolean> {
  return enviar({ to: a, type: 'text', text: { body: texto } }, 'texto');
}

/** Pin de ubicación (se envía al confirmar la reserva) */
export function enviarUbicacion(
  a: string,
  lat: number,
  lng: number,
  nombre: string,
  direccion: string
): Promise<boolean> {
  return enviar(
    { to: a, type: 'location', location: { latitude: lat, longitude: lng, name: nombre, address: direccion } },
    'ubicación'
  );
}

/**
 * Descarga un media de Meta: GET /{media-id} → url temporal → GET con Bearer.
 * Devuelve null si algo falla (el flujo pedirá el mensaje por texto).
 */
export async function descargarMedia(mediaId: string): Promise<{ buffer: Buffer; mime: string } | null> {
  try {
    const meta = await fetch(`https://graph.facebook.com/${VERSION_API}/${mediaId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!meta.ok) {
      console.error(`[whatsapp] Error ${meta.status} pidiendo la URL del media ${mediaId}`);
      return null;
    }
    const info = (await meta.json()) as { url?: string; mime_type?: string };
    if (!info.url) return null;

    const bin = await fetch(info.url, { headers: { Authorization: `Bearer ${token}` } });
    if (!bin.ok) {
      console.error(`[whatsapp] Error ${bin.status} descargando el media ${mediaId}`);
      return null;
    }
    return { buffer: Buffer.from(await bin.arrayBuffer()), mime: info.mime_type ?? 'audio/ogg' };
  } catch (error) {
    console.error(`[whatsapp] Fallo de red descargando el media ${mediaId}:`, error);
    return null;
  }
}

/** Mensaje interactivo con botones de respuesta (máx 3) */
export function enviarBotones(a: string, texto: string, botones: Boton[]): Promise<boolean> {
  return enviar(
    {
      to: a,
      type: 'interactive',
      interactive: {
        type: 'button',
        body: { text: texto },
        action: {
          buttons: botones.slice(0, 3).map((b) => ({
            type: 'reply',
            reply: { id: b.id, title: recortar(b.titulo, 20) },
          })),
        },
      },
    },
    'botones'
  );
}

/** Mensaje interactivo de lista (máx 10 filas en una sección) */
export function enviarLista(
  a: string,
  texto: string,
  tituloBoton: string,
  filas: FilaLista[]
): Promise<boolean> {
  return enviar(
    {
      to: a,
      type: 'interactive',
      interactive: {
        type: 'list',
        body: { text: texto },
        action: {
          button: recortar(tituloBoton, 20),
          sections: [
            {
              rows: filas.slice(0, 10).map((f) => ({
                id: f.id,
                title: recortar(f.titulo, 24),
                ...(f.descripcion ? { description: recortar(f.descripcion, 72) } : {}),
              })),
            },
          ],
        },
      },
    },
    'lista'
  );
}

/**
 * Plantilla aprobada de Meta con parámetros de cuerpo y, opcionalmente,
 * payloads para botones quick-reply (índices 0..n en orden).
 * Devuelve false si la plantilla no existe o aún no está aprobada.
 */
export function enviarPlantilla(
  a: string,
  nombre: string,
  idioma: string,
  params: string[],
  botonesPayload: string[] = []
): Promise<boolean> {
  const components: Record<string, unknown>[] = [];
  if (params.length > 0) {
    components.push({
      type: 'body',
      parameters: params.map((p) => ({ type: 'text', text: p })),
    });
  }
  botonesPayload.forEach((payload, indice) => {
    components.push({
      type: 'button',
      sub_type: 'quick_reply',
      index: String(indice),
      parameters: [{ type: 'payload', payload }],
    });
  });

  // Meta no tiene código "va": las plantillas en valencià se dan de alta como catalán
  const codigo = idioma === 'va' ? 'ca' : idioma;

  return enviar(
    {
      to: a,
      type: 'template',
      template: { name: nombre, language: { code: codigo }, components },
    },
    `plantilla ${nombre}`
  );
}
