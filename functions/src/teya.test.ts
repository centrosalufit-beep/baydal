// teya.test.ts — Garantía: regla de las 24 h (minutosHasta) y lectura del id de
// la transacción en la respuesta del enlace de Teya (funciones puras).

import test from 'node:test';
import assert from 'node:assert';
import { transaccionDe } from './teya';
import { minutosHasta } from './disponibilidad';

test('minutosHasta: 24 h justas y un minuto menos (hora de Madrid, verano UTC+2)', () => {
  const ahora = new Date('2026-09-10T11:00:00Z'); // 13:00 en Madrid
  assert.strictEqual(minutosHasta('2026-09-11', '13:00', ahora), 24 * 60);
  assert.ok(minutosHasta('2026-09-11', '12:59', ahora) < 24 * 60); // tardía → se cobra
  assert.strictEqual(minutosHasta('2026-09-10', '12:00', ahora), -60); // ya pasó
});

test('transaccionDe: encuentra el id en las formas probables y si no, undefined', () => {
  assert.strictEqual(transaccionDe({ transaction_id: 'tx1' }), 'tx1');
  assert.strictEqual(transaccionDe({ transaction: { transaction_id: 'tx2' } }), 'tx2');
  assert.strictEqual(transaccionDe({ transactions: [{ transaction_id: 'tx3' }] }), 'tx3');
  assert.strictEqual(transaccionDe({ payments: [{ id: 'tx4' }] }), 'tx4');
  assert.strictEqual(transaccionDe({ status: 'COMPLETED' }), undefined);
  assert.strictEqual(transaccionDe({ transaction_id: '' }), undefined);
});
