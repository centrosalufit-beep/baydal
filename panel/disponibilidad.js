// disponibilidad.js — espejo JS puro del motor de functions/src/disponibilidad.ts (ver SCHEMA.md)
// ponytail: duplicado consciente de ~70 líneas; alternativa futura: callable function compartida.
// OCUPACIÓN POR TURNO: una reserva posee sus mesas TODO el turno (sin segunda sentada);
// la hora es solo la hora de entrada. Sin antelaciones aquí: esas son solo del bot.
// Funciones puras: no tocan Firestore. Los datos se cargan desde las vistas.

/** "HH:mm" → minutos desde medianoche */
export function horaAMin(hora) {
  const [h, m] = hora.split(':').map(Number);
  return h * 60 + m;
}

/** minutos → "HH:mm" */
export function minAHora(min) {
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
}

/**
 * Slots de HORA DE ENTRADA de un turno según el horario del día de semana.
 * `festivo` = doc de festivos/{fecha} o null. Devuelve [] si cerrado/festivo.
 */
export function horasDelTurno(config, fecha, turno, festivo = null) {
  if (festivo && (festivo.cerrado === 'todo' || festivo.cerrado === turno)) return [];
  const dia = String(new Date(fecha + 'T12:00:00').getDay()); // "0"=domingo .. "6"=sábado
  const rango = config.horario?.[dia]?.[turno];
  if (!rango) return []; // null = turno cerrado ese día
  const horas = [];
  // fin = ÚLTIMA hora de entrada aceptada (inclusive), no cierre de cocina
  for (let m = horaAMin(rango.inicio); m <= horaAMin(rango.fin); m += config.slotMinutos) {
    horas.push(minAHora(m));
  }
  return horas;
}

/**
 * Mesas activas libres en un turno: libre = ninguna reserva confirmada o
 * pendiente CON mesa asignada de ese turno la usa (ocupación por turno).
 * `mesas` = [{ id, ...datos }], `reservasDelDia` = reservas del día ya cargadas.
 */
export function mesasLibres(mesas, reservasDelDia, turno) {
  const ocupadas = new Set();
  for (const r of reservasDelDia) {
    if ((r.estado === 'confirmada' || r.estado === 'pendiente') && r.turno === turno) {
      for (const id of r.mesaIds || []) ocupadas.add(id);
    }
  }
  return mesas.filter((m) => m.activa && !ocupadas.has(m.id));
}

/** Combinaciones de `k` elementos de `arr` (orden del array, sin repetir). */
function* combos(arr, k, desde = 0, actual = []) {
  if (actual.length === k) { yield actual; return; }
  for (let i = desde; i < arr.length; i++) yield* combos(arr, k, i + 1, [...actual, arr[i]]);
}

/**
 * Asigna mesa(s) para `comensales` entre las libres:
 * 1) una mesa con capacidadMin <= comensales <= capacidadMax, la de MENOR capacidadMax
 * 2) pareja de mesas `combinable` de la MISMA zona, suma capacidadMax >= comensales, menor suma
 * 3) trío combinable de la misma zona, menor suma
 * Devuelve array de mesaIds (1–3) o null si no cabe. Techo: 4+ mesas = manual en panel.
 */
export function asignarMesa(libres, comensales) {
  const aptas = libres
    .filter((m) => m.capacidadMin <= comensales && comensales <= m.capacidadMax)
    .sort((a, b) => a.capacidadMax - b.capacidadMax);
  if (aptas.length) return [aptas[0].id];

  const porZona = {};
  for (const m of libres) if (m.combinable) (porZona[m.zonaId] ??= []).push(m);

  for (const tamano of [2, 3]) { // primero parejas; tríos solo si ninguna pareja llega
    let mejor = null;
    for (const grupo of Object.values(porZona)) {
      for (const combo of combos(grupo, tamano)) {
        const suma = combo.reduce((s, m) => s + m.capacidadMax, 0);
        if (suma >= comensales && (!mejor || suma < mejor.suma)) {
          mejor = { suma, ids: combo.map((m) => m.id) };
        }
      }
    }
    if (mejor) return mejor.ids;
  }
  return null;
}

/**
 * Slots del turno donde cabe la reserva (asignarMesa != null) — lo que se ofrece al elegir hora.
 * Con ocupación por turno, la disponibilidad es la misma a cualquier hora: todos los slots o ninguno.
 */
export function horasDisponibles(config, fecha, turno, mesas, reservasDelDia, comensales, festivo = null) {
  const horas = horasDelTurno(config, fecha, turno, festivo);
  if (!horas.length) return [];
  return asignarMesa(mesasLibres(mesas, reservasDelDia, turno), comensales) ? horas : [];
}
