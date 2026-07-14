// vistas/horarios.js — horario semanal (7 días × comida/cena) en config/restaurante.horario
import {
  doc, updateDoc, serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import { db, cfg } from '../app.js';

// Claves del SCHEMA: "0"=domingo .. "6"=sábado. Se muestra de lunes a domingo.
const DIAS = [['1', 'Lunes'], ['2', 'Martes'], ['3', 'Miércoles'], ['4', 'Jueves'], ['5', 'Viernes'], ['6', 'Sábado'], ['0', 'Domingo']];
const TURNOS = [['comida', 'Comida'], ['cena', 'Cena']];

export function montarHorarios(cont) {
  const horario = cfg?.horario || {};

  const filaTurno = (dia, turno, etiqueta) => {
    const rango = horario[dia]?.[turno] || null;
    return `
      <div class="fila-turno" data-dia="${dia}" data-turno="${turno}">
        <span class="etiqueta-turno">${etiqueta}</span>
        <label class="etiqueta-check"><input type="checkbox" name="cerrado"${rango ? '' : ' checked'}> Cerrado</label>
        <input type="time" name="inicio" value="${rango?.inicio || ''}"${rango ? '' : ' disabled'}>
        <span>a</span>
        <input type="time" name="fin" value="${rango?.fin || ''}"${rango ? '' : ' disabled'}>
      </div>`;
  };

  cont.innerHTML = `
    <section class="tarjeta">
      <h2>Horario semanal</h2>
      <p class="suave">Inicio y fin son el rango de <strong>horas de entrada</strong> aceptadas (fin = última entrada, no cierre de cocina).</p>
      <form id="form-horario">
        ${DIAS.map(([dia, nombre]) => `
          <fieldset class="dia">
            <legend>${nombre}</legend>
            ${TURNOS.map(([t, et]) => filaTurno(dia, t, et)).join('')}
          </fieldset>`).join('')}
        <p class="error" id="horario-error" hidden></p>
        <button type="submit" class="primario">Guardar horario</button>
      </form>
    </section>`;

  const form = cont.querySelector('#form-horario');
  const errorEl = cont.querySelector('#horario-error');

  // Marcar "cerrado" desactiva las horas de esa fila
  form.addEventListener('change', (e) => {
    if (e.target.name !== 'cerrado') return;
    const fila = e.target.closest('.fila-turno');
    for (const inp of fila.querySelectorAll('input[type="time"]')) inp.disabled = e.target.checked;
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.hidden = true;
    const nuevo = {};
    for (const [dia] of DIAS) nuevo[dia] = { comida: null, cena: null };
    for (const fila of form.querySelectorAll('.fila-turno')) {
      const { dia, turno } = fila.dataset;
      if (fila.querySelector('[name="cerrado"]').checked) continue; // queda null = cerrado
      const inicio = fila.querySelector('[name="inicio"]').value;
      const fin = fila.querySelector('[name="fin"]').value;
      if (!inicio || !fin || fin < inicio) {
        errorEl.textContent = `Revise ${turno} del ${DIAS.find(([d]) => d === dia)[1]}: falta hora o el fin es anterior al inicio.`;
        errorEl.hidden = false;
        return;
      }
      nuevo[dia][turno] = { inicio, fin };
    }
    await updateDoc(doc(db, 'config', 'restaurante'), { horario: nuevo, actualizadoEn: serverTimestamp() });
    alert('Horario guardado.');
  });
}
