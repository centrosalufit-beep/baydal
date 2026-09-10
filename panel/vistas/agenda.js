// vistas/agenda.js — agenda diaria: pendientes primero, reservas por turno, acciones,
// reserva manual, petición de reseña y exportación CSV del mes.
import {
  collection, query, where, onSnapshot, getDocs, getDoc, doc, addDoc, updateDoc, serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import { db, cfg, esc, hoyISO } from '../app.js';
import { horasDisponibles, mesasLibres, asignarMesa } from '../disponibilidad.js';

const TURNOS = ['comida', 'cena'];
const MOTIVOS = {
  grupo: 'Grupo grande',
  reincidente: 'Cliente reincidente (no-shows)',
  garantia: 'Esperando la garantía (tarjeta) — se libera sola si no llega',
};
// Garantía Teya (docs/GARANTIA.md): etiqueta por estado
const GARANTIA = {
  pedida: '💳 garantía pedida',
  retenida: '💳 {i} € retenidos',
  cobrando: '💳 cobrando {i} €…',
  cobrada: '💳 {i} € COBRADOS',
  liberada: '💳 retención liberada',
  caducada: '💳 garantía no llegó',
};
const etiquetaGarantia = (g) => (g ? `<span class="badge-ok">${GARANTIA[g.estado]?.replace('{i}', g.importe) ?? ''}</span>` : '');

export function montarAgenda(cont) {
  let fechaSel = hoyISO();
  let reservas = []; // reservas del día seleccionado (todas; se filtra por estado al pintar)
  let mesas = [];    // catálogo de mesas (carga única al montar; cambia poco)
  let pararReservas = null;
  const bajas = new Map(); // telefono → true si conversaciones/{tel}.baja (cache de la sesión)

  cont.innerHTML = `
    <div class="fila-cabecera">
      <input type="date" id="agenda-fecha" value="${fechaSel}">
      <div class="fila-botones" style="margin:0">
        <button type="button" id="btn-csv">Exportar CSV</button>
        <button type="button" id="btn-nueva" class="primario">+ Nueva reserva</button>
      </div>
    </div>
    <form id="form-nueva" class="tarjeta formulario" hidden>
      <h3>Nueva reserva (manual)</h3>
      <div class="rejilla-form">
        <label>Fecha <input type="date" name="fecha" value="${fechaSel}" required></label>
        <label>Turno
          <select name="turno" required>
            <option value="comida">Comida</option>
            <option value="cena">Cena</option>
          </select>
        </label>
        <label>Comensales <input type="number" name="comensales" min="1" max="99" value="2" required></label>
        <label>Hora <select name="hora" required><option value="">—</option></select></label>
        <label>Nombre <input type="text" name="nombre" required></label>
        <label>Teléfono (opcional) <input type="tel" name="telefono" placeholder="34600111222"></label>
        <label>Email (opcional) <input type="email" name="email" placeholder="cliente@correo.com"></label>
        <label class="ancho-total">Notas <input type="text" name="notas" placeholder="alergias, trona, terraza…"></label>
      </div>
      <p class="error" id="nueva-error" hidden></p>
      <div class="fila-botones">
        <button type="submit" class="primario">Guardar reserva</button>
        <button type="button" id="btn-cerrar-nueva">Cancelar</button>
      </div>
    </form>
    <div id="pendientes"></div>
    <div id="turnos"><p class="suave">Cargando…</p></div>
  `;

  const inputFecha = cont.querySelector('#agenda-fecha');
  const formNueva = cont.querySelector('#form-nueva');
  const pendientesEl = cont.querySelector('#pendientes');
  const turnosEl = cont.querySelector('#turnos');
  const errorNueva = cont.querySelector('#nueva-error');

  // ---------- Datos ----------

  getDocs(collection(db, 'mesas')).then((snap) => {
    mesas = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    pintar();
  });

  function suscribir(fecha) {
    if (pararReservas) pararReservas();
    pararReservas = onSnapshot(
      query(collection(db, 'reservas'), where('fecha', '==', fecha)),
      (snap) => {
        reservas = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        pintar();
        cargarBajas();
      }
    );
  }
  suscribir(fechaSel);

  inputFecha.addEventListener('change', () => {
    if (!inputFecha.value) return;
    fechaSel = inputFecha.value;
    suscribir(fechaSel);
  });

  /** Carga conversaciones.baja de los teléfonos del día que aún no conocemos (para el botón ⭐). */
  async function cargarBajas() {
    const nuevos = [...new Set(reservas.map((r) => r.telefono).filter((t) => t && !bajas.has(t)))];
    if (!nuevos.length) return;
    for (const t of nuevos) bajas.set(t, false); // evita repetir la carga mientras llega
    await Promise.all(nuevos.map(async (t) => {
      const snap = await getDoc(doc(db, 'conversaciones', t));
      bajas.set(t, !!snap.data()?.baja);
    }));
    pintar();
  }

  // ---------- Pintado ----------

  const nombreMesas = (mesaIds) =>
    (mesaIds || []).map((id) => mesas.find((m) => m.id === id)?.nombre ?? id).join(' + ');

  function pintar() {
    if (!cfg) return;
    pintarPendientes();
    turnosEl.innerHTML = TURNOS.map((turno) => {
      const lista = reservas
        .filter((r) => r.estado === 'confirmada' && r.turno === turno)
        .sort((a, b) => a.hora.localeCompare(b.hora));
      const pax = lista.reduce((s, r) => s + r.comensales, 0);
      return `
        <section class="turno">
          <h2>${turno === 'comida' ? 'Comida' : 'Cena'}
            <span class="contador">${lista.length} reserva${lista.length === 1 ? '' : 's'} · ${pax} pax</span>
          </h2>
          ${lista.length ? lista.map(tarjetaReserva).join('') : '<p class="suave">Sin reservas confirmadas.</p>'}
        </section>`;
    }).join('');
  }

  /** Bloque ámbar de pendientes, SIEMPRE lo primero del día. */
  function pintarPendientes() {
    const lista = reservas
      .filter((r) => r.estado === 'pendiente')
      .sort((a, b) => a.turno.localeCompare(b.turno) || a.hora.localeCompare(b.hora));
    if (!lista.length) { pendientesEl.innerHTML = ''; return; }
    pendientesEl.innerHTML = `
      <section class="pendientes">
        <h2>⚠ Pendientes de decidir <span class="contador">${lista.length}</span></h2>
        ${lista.map(tarjetaPendiente).join('')}
      </section>`;
  }

  function tarjetaPendiente(r) {
    const sinMesa = !(r.mesaIds || []).length;
    // Mesas libres del turno para elegir cuando el grupo llegó sin mesa asignada
    const libres = sinMesa ? mesasLibres(mesas, reservas, r.turno) : [];
    return `
      <article class="reserva pendiente" data-id="${r.id}">
        <div class="reserva-hora">${esc(r.hora)}<small>${r.turno === 'comida' ? 'comida' : 'cena'}</small></div>
        <div class="reserva-datos">
          <strong>${esc(r.nombre)}</strong> · ${r.comensales} pax
          ${sinMesa ? '· <em>sin mesa</em>' : `· Mesa ${esc(nombreMesas(r.mesaIds))}`}
          <br><span class="motivo">${esc(MOTIVOS[r.motivoPendiente] || 'Pendiente')}</span>
          ${r.telefono ? `<br><a href="https://wa.me/${esc(r.telefono)}" target="_blank" rel="noopener">WhatsApp ${esc(r.telefono)}</a>` : ''}
          ${r.email ? `<br><span class="suave">${esc(r.email)}</span>` : ''}
          ${r.notas ? `<p class="notas">${esc(r.notas)}</p>` : ''}
          ${sinMesa ? `
            <div class="elegir-mesas">
              ${libres.length ? libres.map((m) => `
                <label class="etiqueta-check">
                  <input type="checkbox" data-mesa="${m.id}"> ${esc(m.nombre)} (${m.capacidadMin}–${m.capacidadMax})
                </label>`).join('') : '<p class="error">No quedan mesas libres en ese turno.</p>'}
            </div>` : ''}
        </div>
        <div class="reserva-acciones">
          <button type="button" data-confirmar class="primario">Confirmar</button>
          <button type="button" data-rechazar class="peligro">Rechazar</button>
        </div>
      </article>`;
  }

  function tarjetaReserva(r) {
    // Mesas libres del turno (excluyendo esta reserva) para el select de cambio
    const libres = mesasLibres(mesas, reservas.filter((x) => x.id !== r.id), r.turno);
    const enBaja = r.telefono && bajas.get(r.telefono);
    const resenaPedida = !!r.resenaPedidaEn;
    return `
      <article class="reserva" data-id="${r.id}">
        <div class="reserva-hora">${esc(r.hora)}</div>
        <div class="reserva-datos">
          <strong>${esc(r.nombre)}</strong> · ${r.comensales} pax · Mesa ${esc(nombreMesas(r.mesaIds)) || '—'}
          ${r.confirmadaCliente ? '<span class="badge-ok">✓ confirmada por el cliente</span>' : ''}
          ${etiquetaGarantia(r.garantia)}
          ${r.telefono ? `<br><a href="https://wa.me/${esc(r.telefono)}" target="_blank" rel="noopener">WhatsApp ${esc(r.telefono)}</a>` : ''}
          ${r.email ? `<br><span class="suave">${esc(r.email)}</span>` : ''}
          ${r.notas ? `<p class="notas">${esc(r.notas)}</p>` : ''}
        </div>
        <div class="reserva-acciones">
          <select data-cambiar-mesa>
            <option value="">Cambiar mesa…</option>
            ${libres.map((m) => `<option value="${m.id}">${esc(m.nombre)}</option>`).join('')}
          </select>
          <button type="button" data-resena${resenaPedida || enBaja || !r.telefono ? ' disabled' : ''}
            title="${enBaja ? 'El cliente pidió no recibir mensajes (BAJA)' : ''}">
            ${resenaPedida ? `⭐ Pedida ${fechaCorta(r.resenaPedidaEn)}` : '⭐ Pedir reseña'}
          </button>
          <button type="button" data-estado="completada">Completada</button>
          <button type="button" data-estado="noshow" class="aviso">No-show</button>
          <button type="button" data-estado="cancelada" class="peligro">Cancelar</button>
        </div>
      </article>`;
  }

  /** Timestamp de Firestore → "18/07" */
  function fechaCorta(ts) {
    const d = ts?.toDate ? ts.toDate() : null;
    return d ? d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' }) : '';
  }

  // ---------- Acciones sobre reservas ----------

  turnosEl.addEventListener('click', async (e) => {
    const tarjeta = e.target.closest('.reserva');
    if (!tarjeta) return;
    const id = tarjeta.dataset.id;

    if (e.target.closest('button[data-resena]')) {
      // El trigger de functions envía el mensaje y sella resenaPedidaEn (nunca dos veces)
      await updateDoc(doc(db, 'reservas', id), { pedirResena: true, actualizadoEn: serverTimestamp() });
      return;
    }
    const boton = e.target.closest('button[data-estado]');
    if (!boton) return;
    const estado = boton.dataset.estado;
    if (estado === 'cancelada' && !confirm('¿Cancelar esta reserva? La mesa quedará libre.')) return;
    const g = reservas.find((x) => x.id === id)?.garantia;
    if (estado === 'noshow' && g?.estado === 'retenida'
      && !confirm(`No-show: se cobrarán los ${g.importe} € de la garantía y se avisará al cliente. ¿Seguro?`)) return;
    await updateDoc(doc(db, 'reservas', id), { estado, actualizadoEn: serverTimestamp() });
  });

  pendientesEl.addEventListener('click', async (e) => {
    const tarjeta = e.target.closest('.reserva');
    if (!tarjeta) return;
    const id = tarjeta.dataset.id;
    const r = reservas.find((x) => x.id === id);

    if (e.target.closest('button[data-rechazar]')) {
      if (!confirm('¿Rechazar esta reserva? Quedará cancelada.')) return;
      await updateDoc(doc(db, 'reservas', id), { estado: 'cancelada', actualizadoEn: serverTimestamp() });
      return;
    }
    if (e.target.closest('button[data-confirmar]')) {
      const datos = { estado: 'confirmada', actualizadoEn: serverTimestamp() };
      if (!(r.mesaIds || []).length) {
        // Grupo sin mesa: el personal elige de las libres marcadas
        const elegidas = [...tarjeta.querySelectorAll('input[data-mesa]:checked')].map((c) => c.dataset.mesa);
        if (!elegidas.length) { alert('Marca al menos una mesa libre para el grupo.'); return; }
        datos.mesaIds = elegidas;
      }
      await updateDoc(doc(db, 'reservas', id), datos);
    }
  });

  turnosEl.addEventListener('change', async (e) => {
    const sel = e.target.closest('select[data-cambiar-mesa]');
    if (!sel || !sel.value) return;
    const id = sel.closest('.reserva').dataset.id;
    // ponytail: el cambio manual es a 1 mesa; combinaciones a mano = editar desde Firestore/nueva reserva
    await updateDoc(doc(db, 'reservas', id), { mesaIds: [sel.value], actualizadoEn: serverTimestamp() });
  });

  // ---------- Exportar CSV del mes visible ----------

  cont.querySelector('#btn-csv').addEventListener('click', async () => {
    const mes = fechaSel.slice(0, 7); // YYYY-MM
    const snap = await getDocs(query(
      collection(db, 'reservas'),
      where('fecha', '>=', mes + '-01'),
      where('fecha', '<=', mes + '-31')
    ));
    const filas = snap.docs.map((d) => d.data())
      .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.hora.localeCompare(b.hora));
    const campo = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = '\uFEFF' + [ // BOM UTF-8 para que Excel abra bien las tildes
      'fecha,hora,turno,pax,nombre,telefono,email,estado,origen,mesas,notas',
      ...filas.map((r) => [
        r.fecha, r.hora, r.turno, r.comensales, r.nombre, r.telefono, r.email || '',
        r.estado, r.origen, nombreMesas(r.mesaIds), r.notas,
      ].map(campo).join(',')),
    ].join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = `reservas-${mes}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  });

  // ---------- Nueva reserva manual ----------
  // Sin límites de antelación ni de nº de reservas por teléfono: esos son SOLO del bot.

  cont.querySelector('#btn-nueva').addEventListener('click', () => {
    formNueva.hidden = !formNueva.hidden;
    if (!formNueva.hidden) {
      formNueva.fecha.value = fechaSel;
      actualizarHoras();
    }
  });
  cont.querySelector('#btn-cerrar-nueva').addEventListener('click', () => { formNueva.hidden = true; });

  /** Reservas y festivo de una fecha (reutiliza el snapshot si es el día en pantalla). */
  async function datosDeFecha(fecha) {
    const festivoSnap = await getDoc(doc(db, 'festivos', fecha));
    const festivo = festivoSnap.exists() ? festivoSnap.data() : null;
    if (fecha === fechaSel) return { festivo, reservasDia: reservas };
    const snap = await getDocs(query(collection(db, 'reservas'), where('fecha', '==', fecha)));
    return { festivo, reservasDia: snap.docs.map((d) => ({ id: d.id, ...d.data() })) };
  }

  /** Rellena el select de horas con los huecos reales (mismo motor que el bot). */
  async function actualizarHoras() {
    const fecha = formNueva.fecha.value;
    const turno = formNueva.turno.value;
    const pax = Number(formNueva.comensales.value);
    const selHora = formNueva.hora;
    selHora.innerHTML = '<option value="">Buscando huecos…</option>';
    if (!fecha || !pax) return;
    const { festivo, reservasDia } = await datosDeFecha(fecha);
    const horas = horasDisponibles(cfg, fecha, turno, mesas, reservasDia, pax, festivo);
    selHora.innerHTML = horas.length
      ? horas.map((h) => `<option value="${h}">${h}</option>`).join('')
      : '<option value="">Sin hueco (completo o cerrado)</option>';
  }

  for (const campo of ['fecha', 'turno', 'comensales']) {
    formNueva[campo].addEventListener('change', actualizarHoras);
  }

  formNueva.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorNueva.hidden = true;
    const fecha = formNueva.fecha.value;
    const turno = formNueva.turno.value;
    const hora = formNueva.hora.value;
    const comensales = Number(formNueva.comensales.value);
    if (!hora) { mostrarError('Elija una hora con hueco.'); return; }

    // Revalida el hueco con datos frescos justo antes de escribir.
    // ponytail: sin transacción anti-carrera (esa la usa el bot); una colisión desde
    // el panel es improbable y se ve al instante en la agenda.
    const { festivo, reservasDia } = await datosDeFecha(fecha);
    if (festivo && (festivo.cerrado === 'todo' || festivo.cerrado === turno)) {
      mostrarError('Ese día está cerrado (festivo).'); return;
    }
    const mesaIds = asignarMesa(mesasLibres(mesas, reservasDia, turno), comensales);
    if (!mesaIds) { mostrarError('Ya no queda mesa para ese turno. Pruebe otro día o turno.'); await actualizarHoras(); return; }

    await addDoc(collection(db, 'reservas'), {
      fecha,
      hora,
      turno,
      comensales,
      nombre: formNueva.nombre.value.trim(),
      telefono: normalizarTelefono(formNueva.telefono.value), // E.164 sin +
      email: formNueva.email.value.trim(),
      mesaIds,
      estado: 'confirmada',
      origen: 'panel',
      idioma: 'es',
      notas: formNueva.notas.value.trim(),
      recordatorioEnviado: false,
      confirmadaCliente: fecha === hoyISO(), // SCHEMA: creada el MISMO día → confirmada de serie
      avisoLiberacionEnviado: false,
      pedirResena: false,
      creadoEn: serverTimestamp(),
      actualizadoEn: serverTimestamp(),
    });
    formNueva.reset();
    formNueva.hidden = true;
    // Si la reserva es de otro día, saltamos la agenda a ese día para verla
    if (fecha !== fechaSel) { fechaSel = fecha; inputFecha.value = fecha; suscribir(fecha); }
  });

  /** E.164 sin + (SCHEMA): quita todo lo no numérico, el 00 internacional,
   *  y antepone 34 a números españoles de 9 cifras escritos sin prefijo. */
  function normalizarTelefono(valor) {
    let tel = valor.replace(/\D/g, '').replace(/^00/, '');
    if (tel.length === 9) tel = '34' + tel; // ponytail: heurística solo para números ES
    return tel;
  }

  function mostrarError(msg) {
    errorNueva.textContent = msg;
    errorNueva.hidden = false;
  }

  return () => { if (pararReservas) pararReservas(); };
}
