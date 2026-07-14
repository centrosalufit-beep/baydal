// vistas/festivos.js — cierres puntuales: crear doc = cerrar, borrar doc = reabrir
import {
  collection, query, orderBy, startAt, documentId, onSnapshot, doc, setDoc, deleteDoc, serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import { db, esc, hoyISO, fechaBonita } from '../app.js';

const ETIQUETA = { todo: 'Todo el día', comida: 'Solo comida', cena: 'Solo cena' };

export function montarFestivos(cont) {
  cont.innerHTML = `
    <section class="tarjeta">
      <h2>Añadir cierre</h2>
      <form id="form-festivo" class="rejilla-form">
        <label>Fecha <input type="date" name="fecha" min="${hoyISO()}" required></label>
        <label>Motivo <input type="text" name="motivo" placeholder="Descanso, boda privada…" required></label>
        <label>Cierre
          <select name="cerrado">
            <option value="todo">Todo el día</option>
            <option value="comida">Solo comida</option>
            <option value="cena">Solo cena</option>
          </select>
        </label>
        <button type="submit" class="primario">Añadir</button>
      </form>
    </section>
    <section class="tarjeta">
      <h2>Próximos cierres</h2>
      <div id="lista-festivos"><p class="suave">Cargando…</p></div>
    </section>`;

  const lista = cont.querySelector('#lista-festivos');
  const form = cont.querySelector('#form-festivo');

  // El id del doc ES la fecha (festivos/{YYYY-MM-DD}); listamos desde hoy en adelante
  const parar = onSnapshot(
    query(collection(db, 'festivos'), orderBy(documentId()), startAt(hoyISO())),
    (snap) => {
      lista.innerHTML = snap.empty
        ? '<p class="suave">No hay cierres programados.</p>'
        : snap.docs.map((d) => {
            const f = d.data();
            return `
              <div class="fila-festivo" data-fecha="${d.id}">
                <div>
                  <strong>${fechaBonita(d.id)}</strong> · ${ETIQUETA[f.cerrado] || esc(f.cerrado)}
                  <p class="notas">${esc(f.motivo)}</p>
                </div>
                <button type="button" class="peligro" data-eliminar>Eliminar (reabrir)</button>
              </div>`;
          }).join('');
    }
  );

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fecha = form.fecha.value;
    await setDoc(doc(db, 'festivos', fecha), {
      motivo: form.motivo.value.trim(),
      cerrado: form.cerrado.value,
      creadoEn: serverTimestamp(),
      actualizadoEn: serverTimestamp(),
    });
    form.reset();
  });

  lista.addEventListener('click', async (e) => {
    const boton = e.target.closest('button[data-eliminar]');
    if (!boton) return;
    const fecha = boton.closest('.fila-festivo').dataset.fecha;
    if (confirm(`¿Reabrir el ${fechaBonita(fecha)}? Se borrará el cierre.`)) {
      await deleteDoc(doc(db, 'festivos', fecha));
    }
  });

  return parar;
}
