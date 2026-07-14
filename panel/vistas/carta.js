// vistas/carta.js — secciones e items de la carta, textos en 5 idiomas (es/va/en/de/fr)
import {
  collection, getDocs, query, orderBy, addDoc, updateDoc, deleteDoc, doc, serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import { db, esc } from '../app.js';

const IDIOMAS = ['es', 'va', 'en', 'de', 'fr'];

/** Campo de texto multiidioma con 5 pestañitas (solo se ve el idioma activo). */
function campoIdiomas(campo, valores = {}, marcador = '') {
  return `
    <div class="campo-idiomas" data-campo="${campo}">
      <span class="nombre-campo">${campo}</span>
      <div class="tabs-idioma">
        ${IDIOMAS.map((i, ix) => `<button type="button" data-tab="${i}" class="${ix === 0 ? 'activa' : ''}${(valores[i] || '').trim() ? '' : ' vacia'}">${i}</button>`).join('')}
      </div>
      ${IDIOMAS.map((i, ix) => `<input type="text" data-idioma="${i}" value="${esc(valores[i] || '')}" placeholder="${esc(marcador)} (${i})"${ix === 0 ? '' : ' hidden'}>`).join('')}
    </div>`;
}

/** Lee { es, va, en, de, fr } de un .campo-idiomas. */
function leerIdiomas(divCampo) {
  const out = {};
  for (const inp of divCampo.querySelectorAll('input[data-idioma]')) out[inp.dataset.idioma] = inp.value.trim();
  return out;
}

function bloqueItem(item = { nombre: {}, descripcion: {}, precio: 0, porPersona: false, disponible: true }) {
  return `
    <div class="item" data-alergenos='${esc(JSON.stringify(item.alergenos || []))}'>
      ${campoIdiomas('nombre', item.nombre, 'Nombre del plato')}
      ${campoIdiomas('descripcion', item.descripcion || {}, 'Descripción')}
      <div class="item-detalles">
        <label>Precio € <input type="number" name="precio" min="0" step="0.01" value="${item.precio ?? 0}"><small>0 = s/m (según mercado)</small></label>
        <label class="etiqueta-check"><input type="checkbox" name="porPersona"${item.porPersona ? ' checked' : ''}> Por persona</label>
        <label class="etiqueta-check"><input type="checkbox" name="disponible"${item.disponible ? ' checked' : ''}> Disponible</label>
        <button type="button" class="peligro" data-quitar-item>Quitar</button>
      </div>
    </div>`;
}

export function montarCarta(cont) {
  let secciones = [];

  cont.innerHTML = '<p class="suave">Cargando…</p>';
  cargar();

  async function cargar() {
    const snap = await getDocs(query(collection(db, 'carta'), orderBy('orden')));
    secciones = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    pintar();
  }

  function pintar() {
    cont.innerHTML = `
      <div class="fila-cabecera">
        <h2>Carta</h2>
        <button type="button" id="btn-nueva-seccion" class="primario">+ Nueva sección</button>
      </div>
      ${secciones.map((s) => `
        <details class="seccion tarjeta" data-id="${s.id}">
          <summary>
            <strong>${esc(s.nombre?.es || '(sin nombre)')}</strong>
            <span class="suave">${(s.items || []).length} plato${(s.items || []).length === 1 ? '' : 's'}${s.visible ? '' : ' · OCULTA'}</span>
          </summary>
          <div class="seccion-cab">
            ${campoIdiomas('nombre', s.nombre, 'Nombre de la sección')}
            <label>Orden <input type="number" name="orden" value="${s.orden}"></label>
            <label class="etiqueta-check"><input type="checkbox" name="visible"${s.visible ? ' checked' : ''}> Visible para el bot</label>
          </div>
          <div class="items">${(s.items || []).map(bloqueItem).join('')}</div>
          <div class="fila-botones">
            <button type="button" data-anadir-item>+ Añadir plato</button>
            <button type="button" class="primario" data-guardar-seccion>Guardar sección</button>
            <button type="button" class="peligro" data-borrar-seccion>Borrar sección</button>
          </div>
        </details>`).join('') || '<p class="suave">La carta está vacía. Cree una sección.</p>'}
    `;
  }

  cont.addEventListener('click', async (e) => {
    // Pestañitas de idioma
    const tab = e.target.closest('button[data-tab]');
    if (tab) {
      const campo = tab.closest('.campo-idiomas');
      for (const b of campo.querySelectorAll('button[data-tab]')) b.classList.toggle('activa', b === tab);
      for (const inp of campo.querySelectorAll('input[data-idioma]')) inp.hidden = inp.dataset.idioma !== tab.dataset.tab;
      return;
    }

    if (e.target.closest('#btn-nueva-seccion')) {
      const orden = Math.max(0, ...secciones.map((s) => s.orden)) + 1;
      await addDoc(collection(db, 'carta'), {
        nombre: { es: 'Nueva sección', va: '', en: '', de: '', fr: '' },
        orden,
        visible: false, // nace oculta hasta que esté rellena
        items: [],
        creadoEn: serverTimestamp(),
        actualizadoEn: serverTimestamp(),
      });
      cargar();
      return;
    }

    const seccionEl = e.target.closest('details.seccion');
    if (!seccionEl) return;

    if (e.target.closest('[data-anadir-item]')) {
      seccionEl.querySelector('.items').insertAdjacentHTML('beforeend', bloqueItem());
      return;
    }
    if (e.target.closest('[data-quitar-item]')) {
      e.target.closest('.item').remove(); // se consolida al guardar la sección
      return;
    }
    if (e.target.closest('[data-borrar-seccion]')) {
      if (confirm('¿Borrar la sección entera con todos sus platos?')) {
        await deleteDoc(doc(db, 'carta', seccionEl.dataset.id));
        cargar();
      }
      return;
    }
    if (e.target.closest('[data-guardar-seccion]')) {
      await guardarSeccion(seccionEl);
    }
  });

  async function guardarSeccion(seccionEl) {
    const cab = seccionEl.querySelector('.seccion-cab');
    const items = [...seccionEl.querySelectorAll('.item')].map((itemEl) => {
      const item = {
        nombre: leerIdiomas(itemEl.querySelector('[data-campo="nombre"]')),
        precio: Number(itemEl.querySelector('[name="precio"]').value) || 0,
        porPersona: itemEl.querySelector('[name="porPersona"]').checked,
        disponible: itemEl.querySelector('[name="disponible"]').checked,
      };
      const descripcion = leerIdiomas(itemEl.querySelector('[data-campo="descripcion"]'));
      if (Object.values(descripcion).some((v) => v)) item.descripcion = descripcion;
      const alergenos = JSON.parse(itemEl.dataset.alergenos || '[]');
      if (alergenos.length) item.alergenos = alergenos; // se conservan; su edición no entra en v1
      return item;
    });
    await updateDoc(doc(db, 'carta', seccionEl.dataset.id), {
      nombre: leerIdiomas(cab.querySelector('[data-campo="nombre"]')),
      orden: Number(cab.querySelector('[name="orden"]').value) || 0,
      visible: cab.querySelector('[name="visible"]').checked,
      items,
      actualizadoEn: serverTimestamp(),
    });
    cargar();
  }
}
