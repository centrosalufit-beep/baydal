// disponibilidad.ts — Motor de disponibilidad. FUNCIONES PURAS (sin Firestore).
// La ocupación es POR TURNO: una reserva posee sus mesas todo el turno
// (sin segunda sentada); la `hora` es solo la hora de entrada.
// Fechas siempre en zona Europe/Madrid; se resuelven vía Intl.DateTimeFormat.

import type { Config, Festivo, Mesa, MesaConId, Reserva, Turno } from './tipos';

/** Subconjunto de Reserva necesario para calcular ocupación */
export type ReservaOcupacion = Pick<Reserva, 'turno' | 'mesaIds' | 'estado'>;

// ── Utilidades de fecha/hora ─────────────────────────────────────────

/** "HH:mm" → minutos desde medianoche */
export function aMinutos(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

/** minutos desde medianoche → "HH:mm" */
export function aHHMM(min: number): string {
  const h = String(Math.floor(min / 60)).padStart(2, '0');
  const m = String(min % 60).padStart(2, '0');
  return `${h}:${m}`;
}

/** Día de la semana (0=domingo..6=sábado) de una fecha YYYY-MM-DD.
 *  Se calcula a mediodía UTC: el día de la semana de una fecha de calendario
 *  no depende de la zona horaria. */
export function diaSemana(fecha: string): number {
  return new Date(`${fecha}T12:00:00Z`).getUTCDay();
}

/** Fecha y hora actuales en Europe/Madrid como { fecha: YYYY-MM-DD, hora: HH:mm } */
export function ahoraMadrid(ahora: Date = new Date()): { fecha: string; hora: string } {
  // en-CA da formato YYYY-MM-DD; en-GB da HH:mm en 24h
  const fecha = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid' }).format(ahora);
  const hora = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Madrid',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23', // no hour12:false — en algunos ICU resuelve a h24 ("24:05")
  }).format(ahora);
  return { fecha, hora };
}

/** Suma `dias` a una fecha YYYY-MM-DD (aritmética de calendario, sin zona) */
export function sumarDias(fecha: string, dias: number): string {
  const d = new Date(`${fecha}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/** Días de diferencia entre dos fechas YYYY-MM-DD (b - a) */
export function diferenciaDias(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86400000);
}

/** Minutos de diferencia entre (fechaA horaA) y (fechaB horaB) como reloj de pared.
 *  ponytail: ignora saltos de DST (error máx. 60 min dos madrugadas al año,
 *  con el restaurante cerrado); si importara, calcular con offsets reales. */
function diferenciaMinutos(fechaA: string, horaA: string, fechaB: string, horaB: string): number {
  return diferenciaDias(fechaA, fechaB) * 1440 + (aMinutos(horaB) - aMinutos(horaA));
}

// ── Motor de disponibilidad ──────────────────────────────────────────

/**
 * Slots de hora de entrada del turno según el horario del día de semana.
 * Devuelve [] si el turno está cerrado (horario null) o si el festivo
 * cierra ese turno ('todo' o el turno concreto).
 */
export function horasDelTurno(
  config: Config,
  fecha: string,
  turno: Turno,
  festivo?: Festivo | null
): string[] {
  if (festivo && (festivo.cerrado === 'todo' || festivo.cerrado === turno)) return [];
  const rango = config.horario[String(diaSemana(fecha))]?.[turno];
  if (!rango) return [];
  const horas: string[] = [];
  for (let m = aMinutos(rango.inicio); m <= aMinutos(rango.fin); m += config.slotMinutos) {
    horas.push(aHHMM(m));
  }
  return horas;
}

/**
 * Mesas activas libres en un turno: libre = ninguna reserva con estado
 * confirmada|pendiente y mesaIds no vacío de ese mismo fecha+turno la usa.
 * (`reservasDelDia` ya viene filtrado por fecha; la hora de entrada da igual.)
 */
export function mesasLibres(
  mesas: MesaConId[],
  reservasDelDia: ReservaOcupacion[],
  turno: Turno
): MesaConId[] {
  const ocupadas = new Set<string>();
  for (const r of reservasDelDia) {
    if (r.turno !== turno) continue;
    if (r.estado !== 'confirmada' && r.estado !== 'pendiente') continue;
    for (const id of r.mesaIds) ocupadas.add(id); // pendiente de grupo: mesaIds [] no bloquea
  }
  return mesas.filter((m) => m.activa && !ocupadas.has(m.id));
}

/**
 * Asigna mesa(s) para `comensales`:
 * 1) mesa individual con capacidadMin <= comensales <= capacidadMax, la de
 *    MENOR capacidadMax (no sentar 2 en mesa de 8 si hay alternativa);
 * 2) si no hay: pareja de mesas `combinable` de la MISMA zona con suma de
 *    capacidadMax >= comensales, la pareja de menor suma;
 * 3) si tampoco: trío combinable de la misma zona, el de menor suma.
 * null si no cabe. Techo: 4+ mesas = manual en el panel.
 */
export function asignarMesa(libres: MesaConId[], comensales: number): string[] | null {
  const aptas = libres
    .filter((m) => m.capacidadMin <= comensales && comensales <= m.capacidadMax)
    .sort((a, b) => a.capacidadMax - b.capacidadMax);
  if (aptas.length > 0) return [aptas[0].id];

  const combinables = libres.filter((m) => m.combinable);
  // ponytail: búsqueda O(n²)/O(n³) exhaustiva; sobra para un restaurante.
  let mejor: { ids: string[]; suma: number } | null = null;
  for (let i = 0; i < combinables.length; i++) {
    for (let j = i + 1; j < combinables.length; j++) {
      const a = combinables[i];
      const b = combinables[j];
      if (a.zonaId !== b.zonaId) continue; // solo misma zona
      const suma = a.capacidadMax + b.capacidadMax;
      if (suma >= comensales && (mejor === null || suma < mejor.suma)) {
        mejor = { ids: [a.id, b.id], suma };
      }
    }
  }
  if (mejor) return mejor.ids; // preferir menos mesas: pareja antes que trío

  for (let i = 0; i < combinables.length; i++) {
    for (let j = i + 1; j < combinables.length; j++) {
      for (let k = j + 1; k < combinables.length; k++) {
        const [a, b, c] = [combinables[i], combinables[j], combinables[k]];
        if (a.zonaId !== b.zonaId || a.zonaId !== c.zonaId) continue;
        const suma = a.capacidadMax + b.capacidadMax + c.capacidadMax;
        if (suma >= comensales && (mejor === null || suma < mejor.suma)) {
          mejor = { ids: [a.id, b.id, c.id], suma };
        }
      }
    }
  }
  return mejor ? mejor.ids : null;
}

/**
 * Slots del turno con hueco para `comensales` — lo que ve el cliente.
 * Como la ocupación es por turno, o todas las horas del turno tienen hueco
 * o ninguna. Si se pasa `ahora`, aplica además la antelación mínima
 * (antelacionMinHoras) y máxima (antelacionMaxDias) y descarta horas pasadas.
 * Si `comensales` es undefined (aún no se ha preguntado), basta con que
 * quede alguna mesa libre en el turno.
 */
export function horasDisponibles(
  config: Config,
  mesas: MesaConId[],
  reservasDelDia: ReservaOcupacion[],
  fecha: string,
  turno: Turno,
  comensales?: number,
  festivo?: Festivo | null,
  ahora?: Date
): string[] {
  let horas = horasDelTurno(config, fecha, turno, festivo);

  if (ahora) {
    const madrid = ahoraMadrid(ahora);
    if (diferenciaDias(madrid.fecha, fecha) > config.antelacionMaxDias) return [];
    horas = horas.filter(
      (h) => diferenciaMinutos(madrid.fecha, madrid.hora, fecha, h) >= config.antelacionMinHoras * 60
    );
  }

  if (horas.length === 0) return [];
  const libres = mesasLibres(mesas, reservasDelDia, turno);
  const cabe = comensales === undefined ? libres.length > 0 : asignarMesa(libres, comensales) !== null;
  return cabe ? horas : [];
}

// Reexporte de tipos usados por consumidores del motor
export type { Mesa, MesaConId };
