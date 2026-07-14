// disponibilidad.test.ts — Tests del motor de disponibilidad (node:test).
// Ejecutar con: npm test  (compila y corre node --test lib/*.test.js)

import test from 'node:test';
import assert from 'node:assert';
import {
  ahoraMadrid,
  asignarMesa,
  horasDelTurno,
  horasDisponibles,
  mesasLibres,
  type ReservaOcupacion,
} from './disponibilidad';
import type { Config, MesaConId } from './tipos';

// ── Datos de prueba ─────────────────────────────────────────────────

// 2026-07-18 es sábado (día 6); 2026-07-20 es lunes (día 1, cerrado).
const SABADO = '2026-07-18';
const LUNES = '2026-07-20';

const config: Config = {
  nombre: 'Restaurante Baydal',
  nombreBot: 'Paco',
  telefonoHumano: '34965831111',
  whatsappHumano: '34677490049',
  botActivo: true,
  antelacionMaxDias: 30,
  antelacionMinHoras: 2,
  slotMinutos: 30,
  maxComensalesBot: 20,
  maxReservasActivas: 2,
  cortesiaMin: 15,
  atencionHumana: { inicio: '10:00', fin: '23:00' },
  enlaceResenas: 'https://g.page/r/xxx/review',
  infoPractica: 'Parking gratuito enfrente.',
  ubicacion: { lat: 38.64, lng: 0.04, direccion: 'Puerto de Calpe' },
  horario: {
    '1': { comida: null, cena: null }, // lunes cerrado
    '6': {
      comida: { inicio: '13:00', fin: '15:30' },
      cena: { inicio: '19:30', fin: '22:30' },
    },
  },
};

function mesa(
  id: string,
  capacidadMin: number,
  capacidadMax: number,
  opciones: Partial<MesaConId> = {}
): MesaConId {
  return {
    id,
    zonaId: 'interior',
    nombre: id.toUpperCase(),
    capacidadMin,
    capacidadMax,
    combinable: false,
    activa: true,
    ...opciones,
  };
}

function reserva(
  turno: ReservaOcupacion['turno'],
  mesaIds: string[],
  estado: ReservaOcupacion['estado'] = 'confirmada'
): ReservaOcupacion {
  return { turno, mesaIds, estado };
}

// ── horasDelTurno ───────────────────────────────────────────────────

test('horasDelTurno genera los slots del turno con la granularidad configurada', () => {
  assert.deepStrictEqual(horasDelTurno(config, SABADO, 'comida'), [
    '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
  ]);
});

test('horasDelTurno devuelve [] en día sin turno (horario null)', () => {
  assert.deepStrictEqual(horasDelTurno(config, LUNES, 'comida'), []);
  assert.deepStrictEqual(horasDelTurno(config, LUNES, 'cena'), []);
});

test('horasDelTurno respeta festivos: todo / comida / cena', () => {
  const todo = { motivo: 'Fiesta local', cerrado: 'todo' as const };
  assert.deepStrictEqual(horasDelTurno(config, SABADO, 'comida', todo), []);
  assert.deepStrictEqual(horasDelTurno(config, SABADO, 'cena', todo), []);

  const soloComida = { motivo: 'Evento privado', cerrado: 'comida' as const };
  assert.deepStrictEqual(horasDelTurno(config, SABADO, 'comida', soloComida), []);
  assert.ok(horasDelTurno(config, SABADO, 'cena', soloComida).length > 0);

  const soloCena = { motivo: 'Evento privado', cerrado: 'cena' as const };
  assert.ok(horasDelTurno(config, SABADO, 'comida', soloCena).length > 0);
  assert.deepStrictEqual(horasDelTurno(config, SABADO, 'cena', soloCena), []);
});

// ── mesasLibres (ocupación POR TURNO) ───────────────────────────────

test('mesasLibres: la reserva ocupa la mesa TODO el turno, no un intervalo', () => {
  const mesas = [mesa('m1', 2, 4)];
  // Reserva de comida: m1 ocupada en toda la comida…
  assert.deepStrictEqual(mesasLibres(mesas, [reserva('comida', ['m1'])], 'comida'), []);
  // …pero libre en la cena del mismo día
  assert.deepStrictEqual(
    mesasLibres(mesas, [reserva('comida', ['m1'])], 'cena').map((m) => m.id),
    ['m1']
  );
});

test('mesasLibres: dos reservas del mismo turno en la misma mesa son imposibles aunque las horas de entrada difieran', () => {
  const mesas = [mesa('m1', 2, 4)];
  // Ya hay una reserva de comida (entrada 13:00, da igual): a las 15:30 NO hay hueco
  const reservas = [reserva('comida', ['m1'])];
  assert.deepStrictEqual(horasDisponibles(config, mesas, reservas, SABADO, 'comida', 2), []);
});

test('mesasLibres: reserva pendiente CON mesa bloquea (reincidente)', () => {
  const mesas = [mesa('m1', 2, 4)];
  const reservas = [reserva('comida', ['m1'], 'pendiente')];
  assert.deepStrictEqual(mesasLibres(mesas, reservas, 'comida'), []);
});

test('mesasLibres: pendiente de grupo SIN mesa (mesaIds []) NO bloquea', () => {
  const mesas = [mesa('m1', 2, 4)];
  const reservas = [reserva('comida', [], 'pendiente')];
  assert.deepStrictEqual(mesasLibres(mesas, reservas, 'comida').map((m) => m.id), ['m1']);
});

test('mesasLibres ignora reservas canceladas y mesas inactivas', () => {
  const mesas = [mesa('m1', 2, 4), mesa('m2', 2, 4, { activa: false })];
  const reservas = [reserva('comida', ['m1'], 'cancelada')];
  const libres = mesasLibres(mesas, reservas, 'comida');
  // m1 libre (reserva cancelada no cuenta); m2 fuera de servicio
  assert.deepStrictEqual(libres.map((m) => m.id), ['m1']);
});

// ── asignarMesa ─────────────────────────────────────────────────────

test('asignarMesa elige la mesa mínima que cumpla la capacidad', () => {
  const mesas = [mesa('grande', 2, 8), mesa('pequena', 2, 4)];
  assert.deepStrictEqual(asignarMesa(mesas, 2), ['pequena']);
  assert.deepStrictEqual(asignarMesa(mesas, 6), ['grande']);
});

test('asignarMesa respeta capacidadMin (no sienta 2 en mesa de min 4)', () => {
  const mesas = [mesa('banquete', 4, 8)];
  assert.strictEqual(asignarMesa(mesas, 2), null);
});

test('asignarMesa combina parejas solo de la misma zona', () => {
  const distintasZonas = [
    mesa('t1', 2, 4, { combinable: true, zonaId: 'terraza' }),
    mesa('i1', 2, 4, { combinable: true, zonaId: 'interior' }),
  ];
  // 6 pax: ninguna mesa sola llega y las combinables son de zonas distintas
  assert.strictEqual(asignarMesa(distintasZonas, 6), null);

  const mismaZona = [
    mesa('t1', 2, 4, { combinable: true, zonaId: 'terraza' }),
    mesa('t2', 2, 4, { combinable: true, zonaId: 'terraza' }),
  ];
  assert.deepStrictEqual(asignarMesa(mismaZona, 6)?.sort(), ['t1', 't2']);
});

test('asignarMesa elige la pareja combinable de menor suma', () => {
  const mesas = [
    mesa('a', 2, 6, { combinable: true }),
    mesa('b', 2, 6, { combinable: true }),
    mesa('c', 2, 4, { combinable: true }),
    mesa('d', 2, 4, { combinable: true }),
  ];
  // 7 pax: c+d suman 8 (< a+b=12, < a+c=10) → pareja mínima
  assert.deepStrictEqual(asignarMesa(mesas, 7)?.sort(), ['c', 'd']);
});

test('asignarMesa combina TRÍOS de la misma zona cuando ninguna pareja llega', () => {
  const mesas = [
    mesa('a', 2, 6, { combinable: true }),
    mesa('b', 2, 6, { combinable: true }),
    mesa('c', 2, 4, { combinable: true }),
  ];
  // 14 pax: ninguna pareja llega (máx 12); el trío suma 16 → vale
  assert.deepStrictEqual(asignarMesa(mesas, 14)?.sort(), ['a', 'b', 'c']);
});

test('asignarMesa prefiere pareja antes que trío y el trío de menor suma', () => {
  const conPareja = [
    mesa('a', 2, 8, { combinable: true }),
    mesa('b', 2, 8, { combinable: true }),
    mesa('c', 2, 4, { combinable: true }),
  ];
  // 10 pax: a+b (16) llega en pareja → nunca trío
  assert.strictEqual(asignarMesa(conPareja, 10)?.length, 2);

  const trios = [
    mesa('g1', 2, 8, { combinable: true }),
    mesa('g2', 2, 8, { combinable: true }),
    mesa('g3', 2, 8, { combinable: true }),
    mesa('p1', 2, 6, { combinable: true }),
    mesa('p2', 2, 6, { combinable: true }),
    mesa('p3', 2, 6, { combinable: true }),
  ];
  // 17 pax: parejas máx 16 no llegan; trío mínimo p1+p2+p3 = 18 (< 20, 22, 24)
  assert.deepStrictEqual(asignarMesa(trios, 17)?.sort(), ['p1', 'p2', 'p3']);
});

test('asignarMesa no combina trío entre zonas distintas', () => {
  const mesas = [
    mesa('a', 2, 4, { combinable: true, zonaId: 'terraza' }),
    mesa('b', 2, 4, { combinable: true, zonaId: 'terraza' }),
    mesa('c', 2, 4, { combinable: true, zonaId: 'interior' }),
  ];
  // 10 pax: la pareja de terraza suma 8 (no llega) y el trío mezcla zonas
  assert.strictEqual(asignarMesa(mesas, 10), null);
});

test('asignarMesa no combina mesas no combinables', () => {
  const mesas = [mesa('a', 2, 4), mesa('b', 2, 4)];
  assert.strictEqual(asignarMesa(mesas, 6), null);
});

// ── horasDisponibles ────────────────────────────────────────────────

test('horasDisponibles devuelve [] cuando el turno está lleno', () => {
  const mesas = [mesa('m1', 2, 4)];
  const reservas = [reserva('comida', ['m1'])];
  assert.deepStrictEqual(horasDisponibles(config, mesas, reservas, SABADO, 'comida', 2), []);
});

test('horasDisponibles ofrece todo el turno si queda mesa para los comensales', () => {
  const mesas = [mesa('m1', 2, 4), mesa('m2', 2, 4)];
  const reservas = [reserva('comida', ['m1'])]; // m2 sigue libre todo el turno
  assert.deepStrictEqual(
    horasDisponibles(config, mesas, reservas, SABADO, 'comida', 2),
    ['13:00', '13:30', '14:00', '14:30', '15:00', '15:30']
  );
});

test('horasDisponibles aplica antelacionMinHoras con la hora de Madrid', () => {
  const mesas = [mesa('m1', 2, 4)];
  // 12:00 en Madrid (CEST, UTC+2) del mismo sábado; antelación mínima 2h → desde las 14:00
  const ahora = new Date('2026-07-18T10:00:00Z');
  assert.deepStrictEqual(
    horasDisponibles(config, mesas, [], SABADO, 'comida', 2, null, ahora),
    ['14:00', '14:30', '15:00', '15:30']
  );
});

test('horasDisponibles aplica antelacionMaxDias', () => {
  const mesas = [mesa('m1', 2, 4)];
  const ahora = new Date('2026-07-18T10:00:00Z');
  // 2026-08-22 es sábado, a 35 días vista (> 30) → sin horas
  assert.deepStrictEqual(
    horasDisponibles(config, mesas, [], '2026-08-22', 'comida', 2, null, ahora),
    []
  );
});

test('ahoraMadrid: madrugada española → fecha de Madrid, no la de UTC', () => {
  // 2026-07-13 22:05 UTC = 2026-07-14 00:05 en Madrid (CEST, UTC+2)
  assert.deepStrictEqual(ahoraMadrid(new Date('2026-07-13T22:05:00Z')), {
    fecha: '2026-07-14',
    hora: '00:05', // y nunca "24:05" (hourCycle h23)
  });
  // Invierno (CET, UTC+1): 23:30 UTC del 13 = 00:30 del 14 en Madrid
  assert.deepStrictEqual(ahoraMadrid(new Date('2026-01-13T23:30:00Z')), {
    fecha: '2026-01-14',
    hora: '00:30',
  });
});

test('horasDisponibles con festivo de comida no ofrece horas de comida', () => {
  const mesas = [mesa('m1', 2, 4)];
  const festivo = { motivo: 'Evento', cerrado: 'comida' as const };
  assert.deepStrictEqual(horasDisponibles(config, mesas, [], SABADO, 'comida', 2, festivo), []);
  assert.ok(horasDisponibles(config, mesas, [], SABADO, 'cena', 2, festivo).length > 0);
});
