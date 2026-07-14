// app.js — arranque de Firebase, login y router de pestañas
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut,
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import {
  getFirestore, doc, onSnapshot,
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import { firebaseConfig } from './firebase-config.js';
import { montarAgenda } from './vistas/agenda.js';
import { montarMesas } from './vistas/mesas.js';
import { montarHorarios } from './vistas/horarios.js';
import { montarFestivos } from './vistas/festivos.js';
import { montarCarta } from './vistas/carta.js';
import { montarEstadisticas } from './vistas/estadisticas.js';
import { montarAjustes } from './vistas/ajustes.js';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

/** Config de config/restaurante en vivo (binding vivo de módulo ES: las vistas ven el valor actual). */
export let cfg = null;

// ---------- Utilidades compartidas ----------

/** Escapa texto para meterlo en innerHTML (nombres/notas vienen de clientes de WhatsApp). */
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

/** Fecha de hoy en YYYY-MM-DD, zona Europe/Madrid (SCHEMA: nunca UTC ni zona del navegador). */
export const hoyISO = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Madrid' });

/** "2026-07-18" → "sábado, 18 de julio" */
export const fechaBonita = (f) =>
  new Date(f + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });

// ---------- Elementos ----------

const pantallaLogin = document.getElementById('pantalla-login');
const aplicacion = document.getElementById('aplicacion');
const vistaEl = document.getElementById('vista');
const pestanas = document.getElementById('pestanas');
const estadoBot = document.getElementById('estado-bot');

// ---------- Router de pestañas ----------

const VISTAS = {
  agenda: montarAgenda,
  mesas: montarMesas,
  horarios: montarHorarios,
  festivos: montarFestivos,
  carta: montarCarta,
  estadisticas: montarEstadisticas,
  ajustes: montarAjustes,
};

let limpiarVista = null; // función de limpieza (desuscribir onSnapshot) de la vista actual
let vistaActual = null;

function abrirVista(nombre) {
  if (limpiarVista) { limpiarVista(); limpiarVista = null; }
  vistaActual = nombre;
  for (const b of pestanas.querySelectorAll('button')) b.classList.toggle('activa', b.dataset.vista === nombre);
  vistaEl.innerHTML = '';
  limpiarVista = VISTAS[nombre](vistaEl) || null;
}

pestanas.addEventListener('click', (e) => {
  const boton = e.target.closest('button[data-vista]');
  if (boton && boton.dataset.vista !== vistaActual) abrirVista(boton.dataset.vista);
});

// ---------- Estado del bot en cabecera + config en vivo ----------

let pararConfig = null;

function arrancar() {
  pararConfig = onSnapshot(doc(db, 'config', 'restaurante'), (snap) => {
    cfg = snap.data() || null;
    const activo = !!cfg?.botActivo;
    estadoBot.classList.toggle('verde', activo);
    estadoBot.classList.toggle('rojo', !activo);
    estadoBot.querySelector('.texto').textContent = activo ? 'Bot activo' : 'Bot apagado';
    // La primera vez que llega la config, montamos la vista inicial
    if (!vistaActual) abrirVista('agenda');
  });
}

function parar() {
  if (pararConfig) { pararConfig(); pararConfig = null; }
  if (limpiarVista) { limpiarVista(); limpiarVista = null; }
  vistaActual = null;
  cfg = null;
  vistaEl.innerHTML = '';
}

// ---------- Login ----------

const formLogin = document.getElementById('form-login');
const loginError = document.getElementById('login-error');

formLogin.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginError.hidden = true;
  try {
    await signInWithEmailAndPassword(
      auth,
      document.getElementById('login-email').value.trim(),
      document.getElementById('login-clave').value
    );
  } catch (err) {
    loginError.textContent = err.code === 'auth/network-request-failed'
      ? 'Sin conexión. Compruebe internet e inténtelo de nuevo.'
      : 'Correo o contraseña incorrectos.';
    loginError.hidden = false;
  }
});

document.getElementById('btn-salir').addEventListener('click', () => signOut(auth));

onAuthStateChanged(auth, (usuario) => {
  pantallaLogin.hidden = !!usuario;
  aplicacion.hidden = !usuario;
  if (usuario) arrancar();
  else { parar(); formLogin.reset(); }
});
