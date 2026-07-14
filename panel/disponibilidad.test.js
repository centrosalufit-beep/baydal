// Autocomprobación del motor de disponibilidad (ocupación POR TURNO, tríos combinables).
// Ejecutar: node panel/disponibilidad.test.js
import assert from 'node:assert';
import { horasDelTurno, mesasLibres, asignarMesa, horasDisponibles } from './disponibilidad.js';

const config = {
  slotMinutos: 30,
  horario: {
    '6': { comida: { inicio: '13:00', fin: '15:00' }, cena: { inicio: '19:30', fin: '22:30' } }, // sábado
    '1': { comida: null, cena: null }, // lunes cerrado
  },
};

// ── horasDelTurno ──
// 2026-07-18 es sábado; 2026-07-13 es lunes
assert.deepStrictEqual(horasDelTurno(config, '2026-07-18', 'comida'), ['13:00', '13:30', '14:00', '14:30', '15:00']);
assert.deepStrictEqual(horasDelTurno(config, '2026-07-13', 'comida'), [], 'lunes cerrado');
assert.deepStrictEqual(horasDelTurno(config, '2026-07-18', 'comida', { cerrado: 'todo' }), [], 'festivo todo');
assert.deepStrictEqual(horasDelTurno(config, '2026-07-18', 'comida', { cerrado: 'cena' }).length, 5, 'festivo solo cena no afecta a comida');

const mesas = [
  { id: 't1', zonaId: 'terraza', nombre: 'T1', capacidadMin: 1, capacidadMax: 2, combinable: true, activa: true },
  { id: 't2', zonaId: 'terraza', nombre: 'T2', capacidadMin: 3, capacidadMax: 4, combinable: true, activa: true },
  { id: 't3', zonaId: 'terraza', nombre: 'T3', capacidadMin: 3, capacidadMax: 4, combinable: true, activa: true },
  { id: 'i1', zonaId: 'interior', nombre: 'I1', capacidadMin: 2, capacidadMax: 6, combinable: false, activa: true },
  { id: 'rota', zonaId: 'interior', nombre: 'Rota', capacidadMin: 1, capacidadMax: 10, combinable: false, activa: false },
];
const activas = mesas.filter((m) => m.activa);

// ── asignarMesa: individual mínima → pareja → TRÍO, siempre misma zona ──
assert.deepStrictEqual(asignarMesa(activas, 2), ['t1']);
assert.deepStrictEqual(asignarMesa(activas, 4), ['t2']);
assert.deepStrictEqual(asignarMesa(activas, 6), ['i1']);
assert.deepStrictEqual(asignarMesa(activas, 8), ['t2', 't3'], 'pareja combinable misma zona');
assert.deepStrictEqual(asignarMesa(activas, 9).sort(), ['t1', 't2', 't3'], 'trío combinable misma zona');
assert.strictEqual(asignarMesa(activas, 11), null, 'ni el trío llega: no cabe (4+ mesas = manual)');
// El trío de menor suma gana cuando hay varias opciones
const seisMesas = [
  { id: 'a', zonaId: 'z', capacidadMin: 2, capacidadMax: 6, combinable: true, activa: true },
  { id: 'b', zonaId: 'z', capacidadMin: 2, capacidadMax: 6, combinable: true, activa: true },
  { id: 'c', zonaId: 'z', capacidadMin: 2, capacidadMax: 4, combinable: true, activa: true },
  { id: 'd', zonaId: 'z', capacidadMin: 2, capacidadMax: 4, combinable: true, activa: true },
  { id: 'e', zonaId: 'z', capacidadMin: 2, capacidadMax: 4, combinable: true, activa: true },
];
// 13 pax: ninguna pareja llega (máx 6+6=12); mejor trío = 6+4+4=14 (no 6+6+4=16)
const trio = asignarMesa(seisMesas, 13);
assert.strictEqual(trio.length, 3, 'trío cuando ninguna pareja llega');
assert.strictEqual(
  trio.reduce((s, id) => s + seisMesas.find((m) => m.id === id).capacidadMax, 0),
  14,
  'trío de menor suma'
);
// Trío solo dentro de la misma zona
const dosZonas = [
  { id: 'x1', zonaId: 'zx', capacidadMin: 2, capacidadMax: 4, combinable: true, activa: true },
  { id: 'x2', zonaId: 'zx', capacidadMin: 2, capacidadMax: 4, combinable: true, activa: true },
  { id: 'y1', zonaId: 'zy', capacidadMin: 2, capacidadMax: 4, combinable: true, activa: true },
];
assert.strictEqual(asignarMesa(dosZonas, 10), null, 'trío entre zonas distintas no vale');

// ── mesasLibres: ocupación POR TURNO (la hora no importa) ──
const reservas = [
  { turno: 'comida', hora: '14:00', estado: 'confirmada', mesaIds: ['t1'] },       // mismo turno misma mesa → ocupa
  { turno: 'comida', hora: '13:00', estado: 'cancelada', mesaIds: ['t2'] },        // cancelada → no ocupa
  { turno: 'comida', hora: '13:30', estado: 'pendiente', mesaIds: ['t3'] },        // pendiente CON mesa → ocupa
  { turno: 'comida', hora: '14:00', estado: 'pendiente', mesaIds: [] },            // pendiente SIN mesa (grupo) → no ocupa
];
assert.deepStrictEqual(
  mesasLibres(mesas, reservas, 'comida').map((m) => m.id),
  ['t2', 'i1'],
  'confirmada y pendiente-con-mesa ocupan todo el turno; cancelada y pendiente-sin-mesa no; inactiva fuera'
);
assert.deepStrictEqual(
  mesasLibres(mesas, reservas, 'cena').map((m) => m.id),
  ['t1', 't2', 't3', 'i1'],
  'en la cena las mismas mesas están libres (otro turno)'
);

// ── horasDisponibles: todos los slots del turno o ninguno ──
assert.deepStrictEqual(
  horasDisponibles(config, '2026-07-18', 'comida', mesas, reservas, 4),
  ['13:00', '13:30', '14:00', '14:30', '15:00'],
  '4 pax caben en t2 (libre) todo el turno'
);
assert.deepStrictEqual(
  horasDisponibles(config, '2026-07-18', 'comida', mesas, reservas, 8),
  [],
  '8 pax necesitarían t2+t3 pero t3 está pendiente-con-mesa: turno sin hueco'
);
assert.deepStrictEqual(
  horasDisponibles(config, '2026-07-18', 'cena', mesas, reservas, 8).length,
  7,
  'en la cena t2+t3 libres: todos los slots'
);

console.log('OK disponibilidad.js');
