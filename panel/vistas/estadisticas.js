// vistas/estadisticas.js — últimas 8 semanas: reservas y pax por semana, % no-show,
// reparto por origen e idioma. Una query por rango de fecha; todo el cálculo en cliente.
import {
  collection, getDocs, query, where,
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import { db } from '../app.js';

const ORIGENES = { bot: 'Bot WhatsApp', panel: 'Panel', web: 'Web' };
const IDIOMAS = { es: 'Castellano', va: 'Valencià', en: 'Inglés', de: 'Alemán', fr: 'Francés' };

/** Suma `dias` a una fecha YYYY-MM-DD (aritmética de calendario). */
function sumarDias(fecha, dias) {
  const d = new Date(fecha + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/** Lunes de la semana de una fecha YYYY-MM-DD. */
function lunesDe(fecha) {
  const dia = new Date(fecha + 'T12:00:00Z').getUTCDay(); // 0=domingo
  return sumarDias(fecha, -((dia + 6) % 7));
}

/** "2026-07-13" → "13/07" */
const corta = (f) => `${f.slice(8, 10)}/${f.slice(5, 7)}`;

/** Fila con barra CSS: etiqueta, valor y ancho proporcional al máximo. */
function filaBarra(etiqueta, valor, maximo, extra = '') {
  const pct = maximo ? Math.round((valor / maximo) * 100) : 0;
  return `
    <tr>
      <td>${etiqueta}</td>
      <td class="num">${valor}${extra}</td>
      <td class="celda-barra"><div class="barra" style="width:${pct}%"></div></td>
    </tr>`;
}

export function montarEstadisticas(cont) {
  cont.innerHTML = '<p class="suave">Cargando…</p>';

  // Rango: 8 semanas completas hasta hoy, empezando en lunes
  const hoy = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Madrid' });
  const inicio = sumarDias(lunesDe(hoy), -7 * 7); // lunes de hace 7 semanas + la actual = 8

  getDocs(query(
    collection(db, 'reservas'),
    where('fecha', '>=', inicio),
    where('fecha', '<=', hoy)
  )).then((snap) => {
    // Canceladas fuera de todas las métricas: no llegaron a ser servicio
    const reservas = snap.docs.map((d) => d.data()).filter((r) => r.estado !== 'cancelada');

    // Por semana (lunes de inicio)
    const semanas = [];
    for (let i = 0; i < 8; i++) semanas.push(sumarDias(inicio, i * 7));
    const porSemana = Object.fromEntries(semanas.map((s) => [s, { reservas: 0, pax: 0 }]));
    const cuenta = (obj, clave) => { obj[clave] = (obj[clave] || 0) + 1; };
    const origenes = {};
    const idiomas = {};
    let noshows = 0;

    for (const r of reservas) {
      const sem = porSemana[lunesDe(r.fecha)];
      if (sem) { sem.reservas++; sem.pax += r.comensales; }
      cuenta(origenes, r.origen);
      cuenta(idiomas, r.idioma);
      if (r.estado === 'noshow') noshows++;
    }

    const maxRes = Math.max(1, ...semanas.map((s) => porSemana[s].reservas));
    const maxOrigen = Math.max(1, ...Object.values(origenes));
    const maxIdioma = Math.max(1, ...Object.values(idiomas));
    const pctNoshow = reservas.length ? ((noshows / reservas.length) * 100).toFixed(1) : '0.0';

    cont.innerHTML = `
      <section class="tarjeta">
        <h2>Últimas 8 semanas <span class="contador">${corta(inicio)} – ${corta(hoy)} · sin canceladas</span></h2>
        <div class="cifras">
          <div class="cifra"><strong>${reservas.length}</strong><span>reservas</span></div>
          <div class="cifra"><strong>${reservas.reduce((s, r) => s + r.comensales, 0)}</strong><span>comensales</span></div>
          <div class="cifra"><strong>${pctNoshow}%</strong><span>no-show (${noshows})</span></div>
        </div>
      </section>
      <section class="tarjeta">
        <h2>Reservas y comensales por semana</h2>
        <table class="tabla-stats">
          <thead><tr><th>Semana del</th><th class="num">Reservas</th><th></th></tr></thead>
          <tbody>
            ${semanas.map((s) => filaBarra(corta(s), porSemana[s].reservas, maxRes, ` <span class="suave">· ${porSemana[s].pax} pax</span>`)).join('')}
          </tbody>
        </table>
      </section>
      <section class="tarjeta">
        <h2>Origen de las reservas</h2>
        <table class="tabla-stats"><tbody>
          ${Object.entries(origenes).sort((a, b) => b[1] - a[1])
            .map(([k, v]) => filaBarra(ORIGENES[k] || k, v, maxOrigen)).join('') || '<tr><td class="suave">Sin datos.</td></tr>'}
        </tbody></table>
      </section>
      <section class="tarjeta">
        <h2>Idiomas de los clientes</h2>
        <table class="tabla-stats"><tbody>
          ${Object.entries(idiomas).sort((a, b) => b[1] - a[1])
            .map(([k, v]) => filaBarra(IDIOMAS[k] || k, v, maxIdioma)).join('') || '<tr><td class="suave">Sin datos.</td></tr>'}
        </tbody></table>
      </section>`;
  });
}
