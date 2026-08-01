#!/usr/bin/env node
// nit-del-foc.mjs — Menú especial de la Nit del Foc (miércoles 5/08/2026).
//
// Escribe dos cosas en config/restaurante:
//   · infoPractica  → párrafo del menú, para que Paco responda dudas (5 idiomas
//     salen solos: Claude traduce desde este texto en castellano).
//   · avisosPorFecha → textos que Paco manda SOLO al confirmar una CENA del
//     4, 5 o 6 de agosto. Aquí sí hacen falta los 5 idiomas escritos a mano.
//
// Uso (credenciales ADC, como seed.mjs):
//   node scripts/nit-del-foc.mjs             → pone el menú y los avisos
//   node scripts/nit-del-foc.mjs --borrar    → LO QUITA TODO (hacer el 6/08)
//
// ⚠️ El 6 de agosto hay que pasar --borrar o Paco seguirá anunciando un evento
// que ya pasó. Va en config y no en el código para no tener que desplegar.

import { createRequire } from 'node:module';

const require = createRequire(new URL('../functions/package.json', import.meta.url));
const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

initializeApp({
  credential: applicationDefault(),
  projectId: process.env.GOOGLE_CLOUD_PROJECT || 'baydal-reservas',
});

const MARCA = 'MENÚ NIT DEL FOC:';
const INFO =
  `\n\n${MARCA} el miércoles 5 de agosto de 2026, en la cena, es el ÚNICO menú ` +
  'disponible; esa noche no se sirve carta. 30 € por persona, IVA incluido, bebidas no incluidas. ' +
  'Para compartir: pan y allioli, gamba blanca de Calp hervida y fritada Baydal. ' +
  'Segundo a elegir entre arròs del senyoret (mínimo 2 personas), emperador fresco a la plancha ' +
  'o solomillo de cerdo con salsa de champiñones. ' +
  'Postre a elegir entre tartas caseras, fruta, sorbete de limón al cava o helado de turrón con Pedro Ximénez. ' +
  'Después de la cena el restaurante invita a una copa de cava valenciano Nit del Foc (brut reserva), ' +
  'para ver desde la terraza el Castell a la Mar, los fuegos artificiales que se lanzan sobre el mar a las 23:55. ' +
  'Plazas limitadas; se reserva por WhatsApp como cualquier otra cena.';

// Cena DEL PROPIO 5: el menú es obligatorio, hay que decirlo antes de que vengan.
const EL_DIA = {
  es:
    '🎆 Ese miércoles es la Nit del Foc. Esa noche servimos únicamente el Menú Nit del Foc: 30 € por persona, IVA incluido, bebidas aparte. Entrantes para compartir, y segundo y postre a elegir.\n\n' +
    'Después de cenar te invitamos a una copa de cava valenciano Nit del Foc para que veas desde nuestra terraza el Castell a la Mar, los fuegos artificiales sobre el mar a las 23:55.\n\n' +
    'Si prefieres cenar a la carta, dímelo y te busco otro día.',
  va:
    '🎆 Eixe dimecres és la Nit del Foc. Eixa nit servim únicament el Menú Nit del Foc: 30 € per persona, IVA inclòs, begudes a banda. Entrants per a compartir, i segon i postres a triar.\n\n' +
    'Després de sopar et convidem a una copa de cava valencià Nit del Foc perquè veges des de la nostra terrassa el Castell a la Mar, els focs artificials sobre el mar a les 23.55.\n\n' +
    'Si preferixes sopar a la carta, digues-m’ho i et busque un altre dia.',
  en:
    '🎆 That Wednesday is Nit del Foc. That evening we serve only the Nit del Foc set menu: €30 per person, VAT included, drinks not included. Starters to share, plus a main course and dessert of your choice.\n\n' +
    'After dinner we treat you to a glass of Valencian Nit del Foc cava so you can watch the Castell a la Mar from our terrace — the fireworks over the sea at 23:55.\n\n' +
    'If you would rather dine à la carte, just tell me and I will find you another day.',
  de:
    '🎆 An diesem Mittwoch ist Nit del Foc. An diesem Abend servieren wir ausschließlich das Nit-del-Foc-Menü: 30 € pro Person, inkl. MwSt., Getränke nicht inbegriffen. Vorspeisen zum Teilen sowie Hauptgang und Dessert nach Wahl.\n\n' +
    'Nach dem Essen laden wir Sie zu einem Glas valencianischem Nit-del-Foc-Cava ein, damit Sie von unserer Terrasse aus das Castell a la Mar sehen können — das Feuerwerk über dem Meer um 23:55 Uhr.\n\n' +
    'Wenn Sie lieber à la carte essen möchten, sagen Sie mir Bescheid und ich finde einen anderen Tag.',
  fr:
    '🎆 Ce mercredi, c’est la Nit del Foc. Ce soir-là, nous servons uniquement le menu Nit del Foc : 30 € par personne, TVA incluse, boissons non comprises. Entrées à partager, puis plat et dessert au choix.\n\n' +
    'Après le dîner, nous vous offrons une coupe de cava valencien Nit del Foc pour admirer depuis notre terrasse le Castell a la Mar, le feu d’artifice au-dessus de la mer à 23h55.\n\n' +
    'Si vous préférez dîner à la carte, dites-le-moi et je vous trouve un autre jour.',
};

// Cena del 4 o del 6: se le ofrece por si prefiere moverse al miércoles.
const VISPERA = {
  es:
    '🎆 Por cierto: el miércoles 5 celebramos la Nit del Foc. Esa noche servimos un menú especial de 30 € por persona y te invitamos a una copa de cava valenciano para ver el Castell a la Mar desde la terraza, los fuegos artificiales sobre el mar a las 23:55.\n\n' +
    'Si te apetece cambiar tu reserva a ese día, dímelo y lo miro. Quedan pocas plazas.',
  va:
    '🎆 Per cert: el dimecres 5 celebrem la Nit del Foc. Eixa nit servim un menú especial de 30 € per persona i et convidem a una copa de cava valencià per a veure el Castell a la Mar des de la terrassa, els focs artificials sobre el mar a les 23.55.\n\n' +
    'Si et ve de gust canviar la teua reserva a eixe dia, digues-m’ho i ho mire. Queden poques places.',
  en:
    '🎆 By the way: on Wednesday the 5th we celebrate Nit del Foc. That evening we serve a special set menu at €30 per person and treat you to a glass of Valencian cava to watch the Castell a la Mar from our terrace — the fireworks over the sea at 23:55.\n\n' +
    'If you would like to move your booking to that day, tell me and I will check. Places are limited.',
  de:
    '🎆 Übrigens: Am Mittwoch, dem 5., feiern wir Nit del Foc. An diesem Abend servieren wir ein besonderes Menü für 30 € pro Person und laden Sie zu einem Glas valencianischem Cava ein, um das Castell a la Mar von unserer Terrasse aus zu sehen — das Feuerwerk über dem Meer um 23:55 Uhr.\n\n' +
    'Wenn Sie Ihre Reservierung auf diesen Tag verlegen möchten, sagen Sie mir Bescheid. Die Plätze sind begrenzt.',
  fr:
    '🎆 Au fait : le mercredi 5, nous fêtons la Nit del Foc. Ce soir-là, nous servons un menu spécial à 30 € par personne et nous vous offrons une coupe de cava valencien pour admirer le Castell a la Mar depuis la terrasse, le feu d’artifice au-dessus de la mer à 23h55.\n\n' +
    'Si vous souhaitez déplacer votre réservation à cette date, dites-le-moi et je regarde. Les places sont limitées.',
};

const FECHAS = { '2026-08-04': VISPERA, '2026-08-05': EL_DIA, '2026-08-06': VISPERA };

const db = getFirestore();
const ref = db.doc('config/restaurante');
const info = (await ref.get()).get('infoPractica') ?? '';
const borrar = process.argv.includes('--borrar');

if (borrar) {
  // El párrafo del menú va siempre al final de infoPractica: se corta por la marca.
  const i = info.indexOf(MARCA);
  await ref.update({
    ...(i >= 0 ? { infoPractica: info.slice(0, i).trimEnd() } : {}),
    avisosPorFecha: FieldValue.delete(),
    actualizadoEn: FieldValue.serverTimestamp(),
  });
  console.log(i >= 0 ? 'Menú quitado de infoPractica.' : 'infoPractica ya no lo tenía.');
  console.log('avisosPorFecha borrado. Paco deja de anunciar la Nit del Foc.');
} else {
  await ref.update({
    // Idempotente: si ya está puesto, no se duplica el párrafo.
    ...(info.includes(MARCA) ? {} : { infoPractica: info + INFO }),
    avisosPorFecha: FECHAS,
    actualizadoEn: FieldValue.serverTimestamp(),
  });
  const tras = (await ref.get()).data();
  console.log('infoPractica:', tras.infoPractica.length, 'caracteres');
  console.log('avisosPorFecha:', Object.keys(tras.avisosPorFecha).sort().join(', '));
  console.log('\n⚠️ Recuerda: el 6/08 → node scripts/nit-del-foc.mjs --borrar');
}
