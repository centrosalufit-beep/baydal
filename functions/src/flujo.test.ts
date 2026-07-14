// flujo.test.ts — Parser determinista RESERVA WEB (función pura, sin Firestore).
// Contrato en docs/INTEGRACION_WEB.md: claves en español, una por línea.

import test from 'node:test';
import assert from 'node:assert';
import { parsearReservaWeb } from './flujo';

test('parsearReservaWeb: mensaje completo del contrato', () => {
  const b = parsearReservaWeb(
    'RESERVA WEB\nfecha: 2026-07-20\nturno: comida\nhora: 14:00\npersonas: 4\nnombre: María García'
  );
  assert.deepStrictEqual(b, {
    web: true,
    email: '',
    notas: '',
    fecha: '2026-07-20',
    turno: 'comida',
    hora: '14:00',
    comensales: 4,
    nombre: 'María García',
  });
});

test('parsearReservaWeb: campos desordenados y mayúsculas dan igual', () => {
  const b = parsearReservaWeb(
    'reserva web\nNombre: Ana\nHORA: 21:00\npersonas: 2\nturno: cena\nfecha: 2026-07-25'
  );
  assert.strictEqual(b?.nombre, 'Ana');
  assert.strictEqual(b?.hora, '21:00');
  assert.strictEqual(b?.turno, 'cena');
  assert.strictEqual(b?.fecha, '2026-07-25');
  assert.strictEqual(b?.comensales, 2);
});

test('parsearReservaWeb: turno en inglés se descarta (el flujo lo preguntará)', () => {
  const b = parsearReservaWeb('RESERVA WEB\nturno: lunch\nhora: 14:00');
  assert.ok(b);
  assert.strictEqual(b.turno, undefined);
  assert.strictEqual(b.hora, '14:00');
});

test('parsearReservaWeb: hora y personas inválidas se descartan sin romper', () => {
  const b = parsearReservaWeb('RESERVA WEB\nfecha: 2026-07-20\nhora: 25:99\npersonas: 0');
  assert.ok(b);
  assert.strictEqual(b.hora, undefined); // 25:99 no es una hora real
  assert.strictEqual(b.comensales, undefined); // 0 personas tampoco
  assert.strictEqual(b.fecha, '2026-07-20');
});

test('parsearReservaWeb: un texto normal no es mensaje web', () => {
  assert.strictEqual(parsearReservaWeb('Hola, quiero reservar para mañana'), null);
});
