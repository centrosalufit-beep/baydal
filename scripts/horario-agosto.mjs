#!/usr/bin/env node
// horario-agosto.mjs — Horario real de verano: comida Y cena TODOS los días.
// (El seed traía cena solo vie/sáb y Paco rechazaba cenas de martes.)
// Uso: node scripts/horario-agosto.mjs   (credenciales ADC, como seed.mjs)

import { createRequire } from 'node:module';

const require = createRequire(new URL('../functions/package.json', import.meta.url));
const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

initializeApp({
  credential: applicationDefault(),
  projectId: process.env.GOOGLE_CLOUD_PROJECT || 'baydal-reservas',
});

const COMIDA = { inicio: '13:00', fin: '15:30' };
const CENA = { inicio: '19:30', fin: '22:30' };
const horario = Object.fromEntries(
  ['0', '1', '2', '3', '4', '5', '6'].map((d) => [d, { comida: COMIDA, cena: CENA }])
);

const db = getFirestore();
await db.doc('config/restaurante').update({ horario, actualizadoEn: FieldValue.serverTimestamp() });
const tras = (await db.doc('config/restaurante').get()).get('horario');
console.log('Horario actualizado:', JSON.stringify(tras['2'])); // martes como muestra
