// vistas/mesas.js — CRUD de zonas y mesas (la baja es desactivar, no borrar)
import {
  collection, getDocs, query, orderBy, addDoc, updateDoc, doc, serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import { db, esc } from '../app.js';

export function montarMesas(cont) {
  let zonas = [];
  let mesas = [];

  cont.innerHTML = '<p class="suave">Cargando…</p>';
  cargar();

  async function cargar() {
    const [zs, ms] = await Promise.all([
      getDocs(query(collection(db, 'zonas'), orderBy('orden'))),
      getDocs(collection(db, 'mesas')),
    ]);
    zonas = zs.docs.map((d) => ({ id: d.id, ...d.data() }));
    mesas = ms.docs.map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => a.zonaId.localeCompare(b.zonaId) || a.nombre.localeCompare(b.nombre));
    pintar();
  }

  const selectZona = (valor) => `
    <select name="zonaId" required>
      ${zonas.map((z) => `<option value="${z.id}"${z.id === valor ? ' selected' : ''}>${esc(z.nombre)}</option>`).join('')}
    </select>`;

  function pintar() {
    cont.innerHTML = `
      <section class="tarjeta">
        <h2>Zonas</h2>
        ${zonas.map((z) => `
          <form class="fila-edicion" data-tipo="zonas" data-id="${z.id}">
            <label>Nombre <input name="nombre" value="${esc(z.nombre)}" required></label>
            <label>Orden <input name="orden" type="number" value="${z.orden}" required></label>
            <label class="etiqueta-check"><input name="activa" type="checkbox"${z.activa ? ' checked' : ''}> Activa</label>
            <button type="submit">Guardar</button>
          </form>`).join('') || '<p class="suave">Sin zonas todavía.</p>'}
        <form class="fila-edicion nueva" data-tipo="zonas">
          <label>Nombre <input name="nombre" placeholder="Terraza" required></label>
          <label>Orden <input name="orden" type="number" value="${zonas.length + 1}" required></label>
          <button type="submit" class="primario">+ Añadir zona</button>
        </form>
      </section>

      <section class="tarjeta">
        <h2>Mesas</h2>
        ${zonas.length === 0 ? '<p class="suave">Cree primero una zona.</p>' : ''}
        ${mesas.map((m) => `
          <form class="fila-edicion" data-tipo="mesas" data-id="${m.id}">
            <label>Nombre <input name="nombre" value="${esc(m.nombre)}" required></label>
            <label>Zona ${selectZona(m.zonaId)}</label>
            <label>Mín <input name="capacidadMin" type="number" min="1" value="${m.capacidadMin}" required></label>
            <label>Máx <input name="capacidadMax" type="number" min="1" value="${m.capacidadMax}" required></label>
            <label class="etiqueta-check"><input name="combinable" type="checkbox"${m.combinable ? ' checked' : ''}> Combinable</label>
            <label class="etiqueta-check"><input name="activa" type="checkbox"${m.activa ? ' checked' : ''}> Activa</label>
            <button type="submit">Guardar</button>
          </form>`).join('')}
        ${zonas.length ? `
        <form class="fila-edicion nueva" data-tipo="mesas">
          <label>Nombre <input name="nombre" placeholder="T1" required></label>
          <label>Zona ${selectZona()}</label>
          <label>Mín <input name="capacidadMin" type="number" min="1" value="1" required></label>
          <label>Máx <input name="capacidadMax" type="number" min="1" value="4" required></label>
          <label class="etiqueta-check"><input name="combinable" type="checkbox"> Combinable</label>
          <button type="submit" class="primario">+ Añadir mesa</button>
        </form>` : ''}
      </section>
    `;
  }

  cont.addEventListener('submit', async (e) => {
    const form = e.target.closest('form[data-tipo]');
    if (!form) return;
    e.preventDefault();
    const tipo = form.dataset.tipo;
    const datos = tipo === 'zonas'
      ? {
          nombre: form.nombre.value.trim(),
          orden: Number(form.orden.value),
        }
      : {
          nombre: form.nombre.value.trim(),
          zonaId: form.zonaId.value,
          capacidadMin: Number(form.capacidadMin.value),
          capacidadMax: Number(form.capacidadMax.value),
          combinable: form.combinable.checked,
        };
    // En edición, activa viene del checkbox; el alta nace activa
    datos.activa = form.dataset.id ? form.activa.checked : true;

    if (tipo === 'mesas' && datos.capacidadMin > datos.capacidadMax) {
      alert('La capacidad mínima no puede ser mayor que la máxima.');
      return;
    }
    if (form.dataset.id) {
      await updateDoc(doc(db, tipo, form.dataset.id), { ...datos, actualizadoEn: serverTimestamp() });
    } else {
      await addDoc(collection(db, tipo), { ...datos, creadoEn: serverTimestamp(), actualizadoEn: serverTimestamp() });
    }
    cargar();
  });
}
