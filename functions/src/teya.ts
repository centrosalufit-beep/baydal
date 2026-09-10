// teya.ts — Garantía de reserva con Teya: enlace de PRE-AUTORIZACIÓN por reserva
// (retiene el importe en la tarjeta sin cobrarlo), consulta de estado, captura
// (cobro por no-show) y anulación (se libera la retención).
// API (OAuth client_credentials): identity.teya.com + api.teya.com. Credenciales
// en el Business Portal → Ajustes → tienda → Integraciones (docs/GARANTIA.md).
// Como whatsapp.ts: los errores se registran y NUNCA se lanzan; null/false.

const TOKEN_URL = 'https://identity.teya.com/connect/token';
const API = 'https://api.teya.com';
const SCOPES = 'payment-links/create payment-links/id/get payment-links/id/update captures/create reversals/create';

let clienteId = '';
let clienteSecreto = '';
let cache: { token: string; caduca: number } | null = null;

export function inicializarTeya(id: string, secreto: string): void {
  if (id !== clienteId) cache = null;
  clienteId = id;
  clienteSecreto = secreto;
}

/** Sin credenciales reales (secret 'PENDIENTE') la garantía se salta: la reserva sigue normal */
export function teyaConfigurado(): boolean {
  return !!clienteId && clienteId !== 'PENDIENTE' && !!clienteSecreto && clienteSecreto !== 'PENDIENTE';
}

async function token(): Promise<string | null> {
  if (cache && Date.now() < cache.caduca) return cache.token;
  try {
    const r = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clienteId,
        client_secret: clienteSecreto,
        scope: SCOPES,
      }),
    });
    if (!r.ok) {
      console.error(`[teya] Error ${r.status} pidiendo token: ${await r.text().catch(() => '')}`);
      return null;
    }
    const d = (await r.json()) as { access_token: string; expires_in: number };
    cache = { token: d.access_token, caduca: Date.now() + (d.expires_in - 60) * 1000 };
    return d.access_token;
  } catch (error) {
    console.error('[teya] Fallo de red pidiendo token:', error);
    return null;
  }
}

/** Llamada autenticada. `idem` = idempotency-key: reintentos del trigger no cobran dos veces. */
async function llamar(metodo: 'GET' | 'POST' | 'PATCH', ruta: string, cuerpo?: unknown, idem?: string): Promise<Record<string, unknown> | null> {
  if (!teyaConfigurado()) return null;
  const tk = await token();
  if (!tk) return null;
  try {
    const r = await fetch(API + ruta, {
      method: metodo,
      headers: {
        Authorization: `Bearer ${tk}`,
        'Content-Type': 'application/json',
        ...(idem ? { 'idempotency-key': idem } : {}),
      },
      ...(cuerpo ? { body: JSON.stringify(cuerpo) } : {}),
    });
    const texto = await r.text();
    if (!r.ok) {
      console.error(`[teya] Error ${r.status} en ${metodo} ${ruta}: ${texto}`);
      return null;
    }
    return texto ? (JSON.parse(texto) as Record<string, unknown>) : {};
  } catch (error) {
    console.error(`[teya] Fallo de red en ${metodo} ${ruta}:`, error);
    return null;
  }
}

// Teya no tiene checkout en valencià: va → es
const IDIOMAS: Record<string, string> = { es: 'es-ES', va: 'es-ES', en: 'en-GB', de: 'de-DE', fr: 'fr-FR' };

/** Crea el enlace de retención de `importe` € para la reserva. null si falla. */
export async function crearRetencion(p: {
  reservaId: string;
  importe: number;
  idioma: string;
  caducaEn: Date;
}): Promise<{ enlaceId: string; url: string } | null> {
  const d = await llamar(
    'POST',
    '/v2/payment-links',
    {
      amount: { currency: 'EUR', value: Math.round(p.importe * 100) },
      transaction_type: 'PRE_AUTHORISATION',
      type: 'SINGLE_USE',
      merchant_reference: `baydal-${p.reservaId}`,
      expires_at: p.caducaEn.toISOString(),
      language: IDIOMAS[p.idioma] ?? 'es-ES',
    },
    `enlace-${p.reservaId}`
  );
  const enlaceId = d?.payment_link_id;
  const url = d?.payment_link;
  if (typeof enlaceId !== 'string' || typeof url !== 'string') return null;
  return { enlaceId, url };
}

/** Estado del enlace: COMPLETED = retención hecha. null si no se pudo consultar. */
export async function estadoRetencion(enlaceId: string): Promise<{ estado: string; transaccionId?: string } | null> {
  const d = await llamar('GET', `/v1/payment-links/${enlaceId}`);
  if (!d || typeof d.status !== 'string') return null;
  if (d.status === 'COMPLETED') {
    // ponytail: el campo de la transacción no está documentado en público; se busca
    // en las formas probables y se registra la respuesta para ajustarlo con la 1ª real.
    console.log(`[teya] enlace ${enlaceId} COMPLETED: ${JSON.stringify(d)}`);
  }
  return { estado: d.status, transaccionId: transaccionDe(d) };
}

/** Caduca ya un enlace sin usar (reserva cancelada antes de dejar la garantía) */
export async function caducarEnlace(enlaceId: string): Promise<boolean> {
  return (await llamar('PATCH', `/v2/payment-links/${enlaceId}`, { expires_at: new Date().toISOString() })) !== null;
}

/** Busca el id de la transacción de pre-autorización en la respuesta del enlace (pura; exportada para tests) */
export function transaccionDe(d: Record<string, unknown>): string | undefined {
  const lista = (d.transactions ?? d.payments) as Record<string, unknown>[] | undefined;
  const candidatos = [d.transaction_id, (d.transaction as Record<string, unknown> | undefined)?.transaction_id, lista?.[0]?.transaction_id, lista?.[0]?.id];
  return candidatos.find((c): c is string => typeof c === 'string' && c.length > 0);
}

/** Cobra la retención (no-show). true si Teya lo acepta (SUCCESS o PENDING). */
export async function capturar(transaccionId: string, reservaId: string): Promise<boolean> {
  const d = await llamar('POST', `/v1/transactions/${transaccionId}/capture`, {}, `captura-${reservaId}`);
  return d !== null && d.status !== 'FAILURE';
}

/** Anula la retención (vino, o canceló a tiempo). Si falla, caduca sola (~7 días). */
export async function anular(transaccionId: string, reservaId: string): Promise<boolean> {
  const d = await llamar(
    'POST',
    '/v2/reversals',
    { reversal_reason: 'CARD_REVERSAL', transaction_id: transaccionId },
    `anula-${reservaId}`
  );
  return d !== null && d.status !== 'FAILURE';
}
