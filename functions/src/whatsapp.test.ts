// whatsapp.test.ts — Avisos a sala por plantilla: lo que llega a Meta y el
// respaldo cuando la plantilla no sale. Un parámetro con salto de línea o
// vacío hace que Meta rechace el envío, y sin plantilla vuelve la ventana 24 h.

import test from 'node:test';
import assert from 'node:assert';
import { CamposFicha, enviarFichaSala, fichaMultilinea, inicializarWhatsApp } from './whatsapp';

const FICHA: CamposFicha = {
  titulo: '✅ NUEVA RESERVA',
  fecha: 'mar, 4 ago',
  hora: '21:00',
  personas: '4',
  nombre: 'María',
  telefono: '+34600000000',
  notas: 'celíaco y una trona',
};

/** Sustituye fetch y devuelve los cuerpos enviados; `oks` es la respuesta de Meta a cada POST */
function espiarFetch(...oks: boolean[]) {
  const cuerpos: Record<string, any>[] = [];
  globalThis.fetch = (async (_url: string, opciones: any) => {
    cuerpos.push(JSON.parse(opciones.body));
    const ok = oks.shift() ?? false;
    return { ok, status: ok ? 200 : 400, text: async () => 'error simulado' };
  }) as unknown as typeof fetch;
  inicializarWhatsApp('PHONE', 'TOKEN');
  return cuerpos;
}

test('la ficha sale como plantilla ficha_reserva[es] con las 7 variables en orden', async () => {
  const cuerpos = espiarFetch(true);

  assert.strictEqual(await enviarFichaSala('34677490049', FICHA), true);
  assert.strictEqual(cuerpos.length, 1, 'con la plantilla aceptada no debe haber texto de respaldo');
  const [c] = cuerpos;
  assert.strictEqual(c.type, 'template');
  assert.strictEqual(c.to, '34677490049');
  assert.strictEqual(c.template.name, 'ficha_reserva');
  assert.strictEqual(c.template.language.code, 'es');
  assert.deepStrictEqual(
    c.template.components[0].parameters.map((p: any) => p.text),
    ['✅ NUEVA RESERVA', 'mar, 4 ago', '21:00', '4', 'María', '+34600000000', 'celíaco y una trona']
  );
});

test('los parámetros se aplanan: saltos a " · ", vacíos a "-", sin espacios seguidos, corte a 1000', async () => {
  const cuerpos = espiarFetch(true);

  await enviarFichaSala('34677490049', {
    ...FICHA,
    nombre: '',
    notas: `Motivo: raro\nPaso: HORA\n\nBorrador:    {}\t ${'x'.repeat(5000)}`,
  });

  const params = cuerpos[0].template.components[0].parameters.map((p: any) => p.text);
  assert.strictEqual(params[4], '-', 'un vacío invalidaría el envío entero');
  assert.ok(params[6].startsWith('Motivo: raro · Paso: HORA · Borrador: {} x'));
  assert.strictEqual(params[6].length, 1000, 'Meta corta en 1024');
  for (const p of params) {
    assert.ok(!/[\r\n\t]|  /.test(p), `"${p}" conserva saltos, tabuladores o espacios seguidos`);
  }
});

test('si Meta rechaza la plantilla, cae a texto libre: respaldo si lo hay, ficha multilínea si no', async () => {
  const conRespaldo = espiarFetch(false, true);
  assert.strictEqual(await enviarFichaSala('34677490049', FICHA, 'RESUMEN\ncon formato propio'), true);
  assert.strictEqual(conRespaldo.length, 2);
  assert.strictEqual(conRespaldo[1].type, 'text');
  assert.strictEqual(conRespaldo[1].text.body, 'RESUMEN\ncon formato propio');

  const sinRespaldo = espiarFetch(false, true);
  await enviarFichaSala('34677490049', FICHA);
  assert.strictEqual(sinRespaldo[1].text.body, fichaMultilinea(FICHA));

  // Plantilla Y texto fallan (ventana de 24 h cerrada): el llamante se entera
  espiarFetch(false, false);
  assert.strictEqual(await enviarFichaSala('34677490049', FICHA), false);
});
