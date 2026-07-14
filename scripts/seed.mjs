#!/usr/bin/env node
// seed.mjs — Carga los datos iniciales del Restaurante Baydal en Firestore (ver SCHEMA.md).
//
// Uso:
//   node scripts/seed.mjs            → crea lo que falte; NO toca lo que ya existe
//   node scripts/seed.mjs --force    → sobrescribe también lo existente
//
// Credenciales (cualquiera de las dos):
//   1) Variable GOOGLE_APPLICATION_CREDENTIALS apuntando al serviceAccountKey.json
//   2) gcloud auth application-default login   (ADC)

import { createRequire } from 'node:module';

// ponytail: reutilizamos el firebase-admin ya instalado en functions/ (sin package.json propio)
const require = createRequire(new URL('../functions/package.json', import.meta.url));
const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

initializeApp({
  credential: applicationDefault(),
  projectId: process.env.GOOGLE_CLOUD_PROJECT || 'baydal-reservas',
});
const db = getFirestore();
const force = process.argv.includes('--force');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Texto en los 5 idiomas soportados (SCHEMA: es | va | en | de | fr) */
const t5 = (es, va, en, de, fr) => ({ es, va, en, de, fr });

/**
 * Escribe un doc de forma idempotente: si ya existe se conserva,
 * salvo que se pase --force (entonces se sobrescribe manteniendo creadoEn).
 */
async function poner(ruta, datos) {
  const ref = db.doc(ruta);
  const snap = await ref.get();
  if (snap.exists && !force) {
    console.log(`  = ${ruta} ya existe, se conserva (usa --force para sobrescribir)`);
    return;
  }
  await ref.set({
    ...datos,
    creadoEn: snap.exists ? snap.get('creadoEn') : FieldValue.serverTimestamp(),
    actualizadoEn: FieldValue.serverTimestamp(),
  });
  console.log(`  ${snap.exists ? '~ sobrescrito' : '+ creado'} ${ruta}`);
}

// ---------------------------------------------------------------------------
// Datos: config/restaurante
// ---------------------------------------------------------------------------

const COMIDA = { inicio: '13:00', fin: '15:30' }; // última entrada 15:30
const CENA = { inicio: '19:30', fin: '22:30' };

const config = {
  nombre: 'Restaurante Baydal',
  nombreBot: 'Paco',
  telefonoHumano: '34965831111', // teléfono que Paco da para llamar
  whatsappHumano: '34677490049', // recepción (Jose): escalados, avisos, resumen diario
  botActivo: false, // arranca APAGADO: se enciende desde el panel cuando todo esté probado
  antelacionMaxDias: 30,
  antelacionMinHoras: 2,
  slotMinutos: 30,
  maxComensalesBot: 20, // por encima: flujo GRUPO (pendiente + escala a Jose)
  maxReservasActivas: 2, // reservas futuras vivas por teléfono vía bot
  cortesiaMin: 15, // "te guardamos la mesa 15 min" (solo texto; sala decide)
  atencionHumana: { inicio: '10:00', fin: '23:00' }, // fuera de esta franja, los escalados van al buzón nocturno
  // enlaceResenas: URL directa de reseña de Google. Cómo sacarla:
  // https://business.google.com → ficha del restaurante → "Solicitar reseñas"
  // → copiar el enlace corto (https://g.page/r/XXXX/review). Se pega en panel → Ajustes.
  enlaceResenas: '',
  // infoPractica: ÚNICA fuente de Claude para dudas prácticas. Texto de EJEMPLO
  // realista de restaurante de puerto: revisarlo y editarlo en panel → Ajustes.
  infoPractica:
    'Parking gratuito en la explanada del puerto, delante del restaurante. ' +
    'Terraza con vistas al puerto pesquero y al Peñón de Ifach; la lonja está enfrente (subasta a las 17:00). ' +
    'Aceptamos perros en la terraza, no en el interior. Tenemos tronas para niños y acceso para silla de ruedas. ' +
    'Los arroces se preparan al momento (25-35 minutos) y son mínimo para 2 personas; se pueden dejar apalabrados al reservar. ' +
    'Se paga con tarjeta o efectivo.',
  // VERIFICAR dirección: la web (baydal-web) dice Avinguda del Port 10, pero
  // Google/IG/Yelp dicen 12 — hay baile 10 vs 12. Ajustar también lat/lng con el
  // pin real de Google Maps antes de activar el bot (el pin se envía al confirmar).
  ubicacion: { lat: 38.6367, lng: 0.0655, direccion: 'Av. del Port 10, 03710 Calp' },
  // Horario típico de restaurante de puerto: comida todos los días,
  // cena solo viernes y sábado. Ajustable desde el panel (pestaña Horarios).
  // Clave: 0=domingo ... 6=sábado
  horario: {
    0: { comida: COMIDA, cena: null },
    1: { comida: COMIDA, cena: null },
    2: { comida: COMIDA, cena: null },
    3: { comida: COMIDA, cena: null },
    4: { comida: COMIDA, cena: null },
    5: { comida: COMIDA, cena: CENA },
    6: { comida: COMIDA, cena: CENA },
  },
};

// ---------------------------------------------------------------------------
// Datos: zonas y mesas (12 mesas de ejemplo, 2–8 pax, algunas combinables)
// ---------------------------------------------------------------------------

const zonas = {
  terraza: { nombre: 'Terraza', orden: 1, activa: true },
  interior: { nombre: 'Interior', orden: 2, activa: true },
};

// combinable = puede unirse con otras combinables de la MISMA zona (máx 3, ver SCHEMA)
const mesas = {
  t1: { zonaId: 'terraza', nombre: 'T1', capacidadMin: 1, capacidadMax: 2, combinable: false, activa: true },
  t2: { zonaId: 'terraza', nombre: 'T2', capacidadMin: 1, capacidadMax: 2, combinable: true, activa: true },
  t3: { zonaId: 'terraza', nombre: 'T3', capacidadMin: 1, capacidadMax: 2, combinable: true, activa: true },
  t4: { zonaId: 'terraza', nombre: 'T4', capacidadMin: 2, capacidadMax: 4, combinable: true, activa: true },
  t5: { zonaId: 'terraza', nombre: 'T5', capacidadMin: 2, capacidadMax: 4, combinable: true, activa: true },
  t6: { zonaId: 'terraza', nombre: 'T6', capacidadMin: 3, capacidadMax: 6, combinable: false, activa: true },
  t7: { zonaId: 'terraza', nombre: 'T7', capacidadMin: 5, capacidadMax: 8, combinable: false, activa: true },
  i1: { zonaId: 'interior', nombre: 'I1', capacidadMin: 1, capacidadMax: 2, combinable: false, activa: true },
  i2: { zonaId: 'interior', nombre: 'I2', capacidadMin: 2, capacidadMax: 4, combinable: true, activa: true },
  i3: { zonaId: 'interior', nombre: 'I3', capacidadMin: 2, capacidadMax: 4, combinable: true, activa: true },
  i4: { zonaId: 'interior', nombre: 'I4', capacidadMin: 3, capacidadMax: 6, combinable: false, activa: true },
  i5: { zonaId: 'interior', nombre: 'I5', capacidadMin: 5, capacidadMax: 8, combinable: false, activa: true },
};

// ---------------------------------------------------------------------------
// Datos: carta de ejemplo (3 secciones, 5 idiomas). precio 0 = "s/m" (según mercado)
// ---------------------------------------------------------------------------

const carta = {
  entrantes: {
    nombre: t5('Entrantes', 'Entrants', 'Starters', 'Vorspeisen', 'Entrées'),
    orden: 1,
    visible: true,
    items: [
      {
        nombre: t5('Ensalada de la casa', 'Amanida de la casa', 'House salad', 'Salat des Hauses', 'Salade maison'),
        descripcion: t5(
          'Lechuga, tomate, cebolla, atún y olivas',
          'Encisam, tomaca, ceba, tonyina i olives',
          'Lettuce, tomato, onion, tuna and olives',
          'Salat, Tomate, Zwiebel, Thunfisch und Oliven',
          'Laitue, tomate, oignon, thon et olives'
        ),
        precio: 9.5,
        porPersona: false,
        disponible: true,
        alergenos: ['pescado'],
      },
      {
        nombre: t5(
          'Gamba roja hervida',
          'Gamba roja bullida',
          'Boiled red prawn',
          'Gekochte rote Garnele',
          'Crevette rouge bouillie'
        ),
        precio: 0, // s/m — según mercado
        porPersona: false,
        disponible: true,
        alergenos: ['crustaceos'],
      },
      {
        nombre: t5(
          'Croquetas caseras de gamba',
          'Croquetes casolanes de gamba',
          'Homemade prawn croquettes',
          'Hausgemachte Garnelenkroketten',
          'Croquettes de crevettes maison'
        ),
        precio: 12,
        porPersona: false,
        disponible: true,
        alergenos: ['gluten', 'lactosa', 'huevo', 'crustaceos'],
      },
    ],
  },
  arroces: {
    nombre: t5('Arroces', 'Arrossos', 'Rice dishes', 'Reisgerichte', 'Riz'),
    orden: 2,
    visible: true,
    items: [
      {
        // Nombre propio: se mantiene en valencià en los 5 idiomas
        nombre: t5('Arròs del Senyoret', 'Arròs del Senyoret', 'Arròs del Senyoret', 'Arròs del Senyoret', 'Arròs del Senyoret'),
        descripcion: t5(
          'Arroz con el marisco ya pelado (mínimo 2 personas)',
          'Arròs amb el marisc ja pelat (mínim 2 persones)',
          'Rice with peeled seafood, ready to eat (minimum 2 people)',
          'Reis mit bereits geschälten Meeresfrüchten (mindestens 2 Personen)',
          'Riz aux fruits de mer déjà décortiqués (minimum 2 personnes)'
        ),
        precio: 19, // por persona
        porPersona: true,
        disponible: true,
        alergenos: ['crustaceos', 'moluscos', 'pescado'],
      },
      {
        nombre: t5('Paella valenciana', 'Paella valenciana', 'Valencian paella', 'Valencianische Paella', 'Paella valencienne'),
        descripcion: t5(
          'Pollo, conejo y verduras de temporada (mínimo 2 personas)',
          'Pollastre, conill i verdures de temporada (mínim 2 persones)',
          'Chicken, rabbit and seasonal vegetables (minimum 2 people)',
          'Huhn, Kaninchen und Gemüse der Saison (mindestens 2 Personen)',
          'Poulet, lapin et légumes de saison (minimum 2 personnes)'
        ),
        precio: 16,
        porPersona: true,
        disponible: true,
      },
      {
        nombre: t5('Arroz negro', 'Arròs negre', 'Black rice', 'Schwarzer Reis', 'Riz noir'),
        descripcion: t5(
          'Con sepia y alioli (mínimo 2 personas)',
          'Amb sépia i allioli (mínim 2 persones)',
          'With cuttlefish and aioli (minimum 2 people)',
          'Mit Sepia und Aioli (mindestens 2 Personen)',
          'Avec seiche et aïoli (minimum 2 personnes)'
        ),
        precio: 18,
        porPersona: true,
        disponible: true,
        alergenos: ['moluscos', 'huevo'],
      },
    ],
  },
  pescados: {
    nombre: t5('Pescados', 'Peixos', 'Fish', 'Fisch', 'Poissons'),
    orden: 3,
    visible: true,
    items: [
      {
        nombre: t5(
          'Lubina a la espalda',
          "Llobarro a l'esquena",
          'Grilled sea bass',
          'Gegrillter Wolfsbarsch',
          'Bar grillé'
        ),
        precio: 22,
        porPersona: false,
        disponible: true,
        alergenos: ['pescado'],
      },
      {
        nombre: t5(
          'Dorada a la sal',
          'Orada a la sal',
          'Salt-baked gilt-head bream',
          'Dorade in Salzkruste',
          'Daurade en croûte de sel'
        ),
        precio: 0, // s/m — según mercado
        porPersona: false,
        disponible: true,
        alergenos: ['pescado'],
      },
      {
        nombre: t5(
          'Sepia a la plancha con alioli',
          'Sépia a la planxa amb allioli',
          'Grilled cuttlefish with aioli',
          'Gegrillte Sepia mit Aioli',
          'Seiche grillée à l’aïoli'
        ),
        precio: 14,
        porPersona: false,
        disponible: true,
        alergenos: ['moluscos', 'huevo'],
      },
    ],
  },
};

// Nota: el resto de colecciones (reservas, clientes, conversaciones, festivos,
// procesados, avisosPendientes) empiezan VACÍAS: las va creando el sistema en uso.
// En particular `clientes/{telefono}` lo alimenta el trigger de no-shows.

// ---------------------------------------------------------------------------
// Autocomprobación de los datos antes de escribir nada
// ---------------------------------------------------------------------------

function validar() {
  const assert = (cond, msg) => { if (!cond) throw new Error(`Datos de seed inválidos: ${msg}`); };
  assert(Object.keys(mesas).length === 12, 'deben ser 12 mesas');
  for (const [id, m] of Object.entries(mesas)) {
    assert(zonas[m.zonaId], `mesa ${id}: zona ${m.zonaId} no existe`);
    assert(m.capacidadMin <= m.capacidadMax, `mesa ${id}: capacidadMin > capacidadMax`);
  }
  for (const [id, s] of Object.entries(carta)) {
    for (const texto of [s.nombre, ...s.items.flatMap((i) => [i.nombre, i.descripcion].filter(Boolean))]) {
      for (const idioma of ['es', 'va', 'en', 'de', 'fr']) {
        assert(typeof texto[idioma] === 'string' && texto[idioma], `carta/${id}: falta idioma ${idioma}`);
      }
    }
  }
  for (const dia of ['0', '1', '2', '3', '4', '5', '6']) {
    assert(dia in config.horario, `horario: falta el día ${dia}`);
  }
}

// ---------------------------------------------------------------------------
// Ejecución
// ---------------------------------------------------------------------------

async function main() {
  validar();
  console.log(`Seed de Baydal Reservas${force ? ' (--force: sobrescribe existentes)' : ''}:`);

  await poner('config/restaurante', config);
  for (const [id, z] of Object.entries(zonas)) await poner(`zonas/${id}`, z);
  for (const [id, m] of Object.entries(mesas)) await poner(`mesas/${id}`, m);
  for (const [id, s] of Object.entries(carta)) await poner(`carta/${id}`, s);

  console.log('Hecho. Recuerda: botActivo está en false; se activa desde el panel (Ajustes).');
}

main().catch((e) => {
  console.error('Error en el seed:', e.message);
  process.exit(1);
});
