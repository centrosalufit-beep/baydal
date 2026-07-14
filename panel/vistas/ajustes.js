// vistas/ajustes.js — config/restaurante: interruptor del bot y parámetros generales
import {
  doc, onSnapshot, updateDoc, serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import { db, esc } from '../app.js';

// Campos planos: [campo, etiqueta, tipo, pista]
const CAMPOS = [
  ['nombre', 'Nombre del restaurante', 'text', ''],
  ['nombreBot', 'Nombre del bot', 'text', 'Cómo se presenta el asistente (Paco)'],
  ['telefonoHumano', 'Teléfono para escalar (llamadas)', 'text', 'E.164 sin +, ej. 34965831111'],
  ['whatsappHumano', 'WhatsApp de recepción (avisos)', 'text', 'E.164 sin +, ej. 34677490049'],
  ['maxComensalesBot', 'Máx. comensales por el bot', 'number', 'Por encima, flujo de grupo (queda pendiente)'],
  ['maxReservasActivas', 'Máx. reservas vivas por teléfono', 'number', 'Futuras confirmadas o pendientes vía bot'],
  ['slotMinutos', 'Granularidad de horas (min)', 'number', 'Cada cuántos minutos se ofrecen horas'],
  ['antelacionMinHoras', 'Antelación mínima (horas)', 'number', 'Margen mínimo antes de la hora de entrada (solo bot)'],
  ['antelacionMaxDias', 'Antelación máxima (días)', 'number', 'Hasta cuántos días vista se puede reservar (solo bot)'],
  ['cortesiaMin', 'Cortesía de mesa (min)', 'number', '"Te guardamos la mesa X min" — solo texto, sala decide'],
  ['enlaceResenas', 'Enlace de reseñas Google', 'text', 'URL directa de reseña (https://g.page/r/…/review)'],
];

export function montarAjustes(cont) {
  const ref = doc(db, 'config', 'restaurante');
  let sucio = false;    // hay cambios sin guardar: no machacar el formulario con snapshots
  let pintado = false;

  cont.innerHTML = `
    <section class="tarjeta">
      <h2>Bot de WhatsApp</h2>
      <label class="interruptor-bot">
        <input type="checkbox" id="aj-botActivo">
        <span class="deslizador"></span>
        <span class="texto-interruptor">…</span>
      </label>
      <p class="suave">Si se apaga, el bot responde un mensaje de cortesía con el teléfono y no toma reservas.</p>
    </section>
    <section class="tarjeta">
      <h2>Parámetros</h2>
      <form id="form-ajustes" class="rejilla-form">
        ${CAMPOS.map(([campo, etiqueta, tipo, pista]) => `
          <label>${etiqueta}
            <input type="${tipo}" name="${campo}"${tipo === 'number' ? ' min="1"' : ''} required>
            ${pista ? `<small>${esc(pista)}</small>` : ''}
          </label>`).join('')}
        <label>Atención humana desde
          <input type="time" name="atencionInicio" required>
          <small>Antes, los escalados van al buzón nocturno</small>
        </label>
        <label>Atención humana hasta
          <input type="time" name="atencionFin" required>
        </label>
        <label>Latitud <input type="number" name="ubicacionLat" step="any"><small>Pin que se envía al confirmar</small></label>
        <label>Longitud <input type="number" name="ubicacionLng" step="any"></label>
        <label class="ancho-total">Dirección <input type="text" name="ubicacionDireccion" placeholder="Av. del Puerto 1, Calpe"></label>
        <label class="ancho-total">Información práctica
          <textarea name="infoPractica" rows="8" placeholder="Parking: … Perros: … Tronas: … Acceso silla de ruedas: …"></textarea>
          <small>Esto es lo ÚNICO que Paco sabe de parking, perros, tronas, accesos… Escríbelo todo aquí; lo que no esté, el bot lo escala a un humano.</small>
        </label>
        <div class="ancho-total fila-botones">
          <button type="submit" class="primario">Guardar ajustes</button>
          <span id="aj-aviso" class="suave" hidden>Hay cambios sin guardar.</span>
        </div>
      </form>
    </section>`;

  const interruptor = cont.querySelector('#aj-botActivo');
  const textoInterruptor = cont.querySelector('.texto-interruptor');
  const form = cont.querySelector('#form-ajustes');
  const aviso = cont.querySelector('#aj-aviso');

  const parar = onSnapshot(ref, (snap) => {
    const datos = snap.data();
    if (!datos) return;
    // El interruptor siempre refleja el estado real (es la acción crítica)
    interruptor.checked = !!datos.botActivo;
    textoInterruptor.textContent = datos.botActivo ? 'Bot ACTIVO' : 'Bot APAGADO';
    // El resto del formulario no se repinta si se está editando
    if (sucio && pintado) return;
    for (const [campo] of CAMPOS) form[campo].value = datos[campo] ?? '';
    form.atencionInicio.value = datos.atencionHumana?.inicio ?? '';
    form.atencionFin.value = datos.atencionHumana?.fin ?? '';
    form.ubicacionLat.value = datos.ubicacion?.lat ?? '';
    form.ubicacionLng.value = datos.ubicacion?.lng ?? '';
    form.ubicacionDireccion.value = datos.ubicacion?.direccion ?? '';
    form.infoPractica.value = datos.infoPractica ?? '';
    pintado = true;
  });

  // El interruptor escribe al instante (encender/apagar el bot no debe esperar a "Guardar")
  interruptor.addEventListener('change', () =>
    updateDoc(ref, { botActivo: interruptor.checked, actualizadoEn: serverTimestamp() })
  );

  form.addEventListener('input', () => { sucio = true; aviso.hidden = false; });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const datos = { actualizadoEn: serverTimestamp() };
    for (const [campo, , tipo] of CAMPOS) {
      datos[campo] = tipo === 'number' ? Number(form[campo].value) : form[campo].value.trim();
    }
    datos.atencionHumana = { inicio: form.atencionInicio.value, fin: form.atencionFin.value };
    datos.ubicacion = {
      lat: Number(form.ubicacionLat.value) || 0,
      lng: Number(form.ubicacionLng.value) || 0,
      direccion: form.ubicacionDireccion.value.trim(),
    };
    datos.infoPractica = form.infoPractica.value.trim();
    await updateDoc(ref, datos);
    sucio = false;
    aviso.hidden = true;
    alert('Ajustes guardados.');
  });

  return parar;
}
