// carta-mayo-2026.mjs — Carga la carta REAL (ESPAÑOL 2026 MAYO.pdf) en Firestore vía wpApi.
// Fuentes: PDF de mayo 2026 (números y estructura) + MENU de la rama web (precios
// verificados al céntimo y traducciones en/de/fr); el valencià es de esta carga.
// Nota: la rama web lista además "croquetas de gamba" que el PDF de mayo NO trae — fuera.
// Uso: PACO_WP_TOKEN=<token del plugin> node scripts/carta-mayo-2026.mjs
// Reemplaza TODAS las secciones existentes (borra las que no estén en esta lista).

const API = 'https://europe-southwest1-baydal-reservas.cloudfunctions.net/wpApi';
const token = (process.env.PACO_WP_TOKEN ?? '').trim();
if (!token) {
  console.error('Falta PACO_WP_TOKEN (el token del plugin de WordPress).');
  process.exit(1);
}

/** {es,va,en,de,fr} a partir de 5 strings */
const t = (es, va, en, de, fr) => ({ es, va, en, de, fr });

/** Descripción "ración pequeña / normal" en 5 idiomas */
const dual = (peq, norm) =>
  t(
    `Ración pequeña ${peq} € · normal ${norm} €`,
    `Ració xicoteta ${peq} € · normal ${norm} €`,
    `Small portion €${peq} · regular €${norm}`,
    `Kleine Portion ${peq} € · normale ${norm} €`,
    `Petite portion ${peq} € · normale ${norm} €`
  );

const SALSAS = t(
  'Se pueden servir con salsa de champiñones, de pimienta o roquefort',
  'Es poden servir amb salsa de xampinyons, de pimenta o rocafort',
  'Can be served with mushroom, pepper or Roquefort sauce',
  'Auf Wunsch mit Champignon-, Pfeffer- oder Roquefortsauce',
  'Servies au choix avec sauce aux champignons, au poivre ou au roquefort'
);

// item: [nombre5, precio, descripcion5?, porPersona?]
const SECCIONES = [
  {
    id: 'entradas',
    orden: 1,
    nombre: t('Entradas y raciones', 'Entrades i racions', 'Starters & sharing plates', 'Vorspeisen & Portionen', 'Entrées et portions'),
    items: [
      [t('Ensalada valenciana', 'Amanida valenciana', 'Valencian salad', 'Valencianischer Salat', 'Salade valencienne'), 13.0,
        t('Lechuga, tomate, cebolla, aceitunas, atún, huevo y boquerón', 'Lletuga, tomaca, ceba, olives, tonyina, ou i aladroc', 'Lettuce, tomato, onion, olives, tuna, egg and anchovy', 'Salat, Tomate, Zwiebel, Oliven, Thunfisch, Ei und Sardelle', 'Laitue, tomate, oignon, olives, thon, œuf et anchois')],
      [t('Croquetas de jamón (unidad)', 'Croquetes de pernil (unitat)', 'Ham croquette (each)', 'Schinkenkrokette (Stück)', "Croquette de jambon (l'unité)"), 2.1],
      [t('Croquetas de pulpo (unidad)', 'Croquetes de polp (unitat)', 'Octopus croquette (each)', 'Oktopus-Krokette (Stück)', "Croquette de poulpe (l'unité)"), 3.15],
      [t('Zamburiñas (unidad)', 'Zamburinyes (unitat)', 'Grilled queen scallop (each)', 'Jakobsmuschel (Stück)', "Pétoncle grillé (l'unité)"), 3.75],
      [t('Boquerones en vinagre', 'Aladroc en vinagre', 'Anchovies in vinegar', 'Sardellen in Essig', 'Anchois au vinaigre'), 16.0, dual('11,50', '16,00')],
      [t('Boquerones fritos', 'Aladroc fregit', 'Fried anchovies', 'Gebratene Sardellen', 'Anchois frits'), 17.0, dual('12,00', '17,00')],
      [t('Mejillones al vapor', 'Clòtxines al vapor', 'Steamed mussels', 'Miesmuscheln, gedämpft', 'Moules vapeur'), 13.5, dual('11,00', '13,50')],
      [t('Hueva de sepia a la plancha', 'Ous de sépia a la planxa', 'Grilled cuttlefish roe', 'Tintenfischrogen, gegrillt', 'Œufs de seiche grillés'), 17.0, dual('12,00', '17,00')],
      [t('Tollos (musola frita)', 'Tollos (mussola fregida)', 'Fried dogfish (tollos)', 'Tollos (frittierter kleiner Hai)', 'Tollos (petit requin frit)'), 17.0, dual('12,00', '17,00')],
      [t('Calamarcitos a la andaluza', "Calamarets a l'andalusa", 'Baby squid, Andalusian style', 'Kleine Tintenfische, andalusisch', "Calamars à l'andalouse"), 17.0, dual('12,00', '17,00')],
      [t('Sepia a la plancha', 'Sépia a la planxa', 'Grilled cuttlefish', 'Sepia, gegrillt', 'Seiche grillée'), 17.5, dual('9,50', '17,50')],
      [t('Tellinas (coquinas)', 'Tellines', 'Wedge clams (tellinas)', 'Tellmuscheln', 'Tellines'), 19.0],
      [t('Chopitos (puntillas)', 'Xopitos (puntilletes)', 'Fried baby cuttlefish', 'Baby-Tintenfische, frittiert', 'Chopitos (petits calmars frits)'), 21.0, dual('15,75', '21,00')],
      [t('Pulpo guisado al estilo de Calp', "Polp guisat a l'estil de Calp", 'Octopus stew, Calp style', 'Geschmorter Oktopus nach Calper Art', 'Ragoût de poulpe à la calpine'), 19.0, dual('14,00', '19,00')],
      [t('Pulpo a la plancha Baydal', 'Polp a la planxa Baydal', 'Grilled octopus “Baydal”', 'Gegrillter Oktopus „Baydal“', 'Poulpe grillé « Baydal »'), 21.5, dual('16,00', '21,50')],
      [t('Calamar a la plancha', 'Calamar a la planxa', 'Grilled squid', 'Kalmar, gegrillt', 'Calmar grillé'), 19.5],
      [t('Fritura de pescaditos Baydal', 'Fritura de peixets Baydal', 'Small fried fish “Baydal”', 'Kleine Fische, gemischt frittiert', 'Petits poissons frits « Baydal »'), 19.5, dual('14,50', '19,50')],
      [t('Tosta de foie fresco a la plancha', 'Tosta de foie fresc a la planxa', 'Toast with grilled fresh foie & fig jam', 'Toast mit gegrillter Foie & Feigenmarmelade', 'Pain grillé au foie frais & confiture de figues'), 11.5,
        t('Con mermelada de higo', 'Amb melmelada de figa', 'With fig jam', 'Mit Feigenmarmelade', 'À la confiture de figues')],
    ],
  },
  {
    id: 'mariscos-hervidos',
    orden: 2,
    nombre: t('Mariscos hervidos (fríos)', 'Mariscs bullits (freds)', 'Boiled shellfish (cold)', 'Gekochte Meeresfrüchte (kalt)', 'Fruits de mer cuits (froids)'),
    items: [
      [t('Gamba blanca hervida (250 g)', 'Gamba blanca bullida (250 g)', 'Boiled white prawns (250 g)', 'Weiße Garnelen, gekocht (250 g)', 'Crevettes blanches cuites (250 g)'), 27.5],
      [t('Gamba roja hervida (250 g)', 'Gamba roja bullida (250 g)', 'Boiled red prawns (250 g)', 'Rote Garnelen, gekocht (250 g)', 'Crevettes rouges cuites (250 g)'), 45.0],
      [t('Cigalas hervidas (300 g)', 'Cigales bullides (300 g)', 'Boiled langoustines (300 g)', 'Kaisergranat, gekocht (300 g)', 'Langoustines cuites (300 g)'), 43.5],
    ],
  },
  {
    id: 'mariscos-plancha',
    orden: 3,
    nombre: t('Mariscos a la plancha', 'Mariscs a la planxa', 'Grilled shellfish', 'Gegrillte Meeresfrüchte', 'Fruits de mer grillés'),
    items: [
      [t('Gamba roja a la plancha (250 g)', 'Gamba roja a la planxa (250 g)', 'Grilled red prawns (250 g)', 'Rote Garnelen, gegrillt (250 g)', 'Crevettes rouges grillées (250 g)'), 45.0],
      [t('Cigalas a la plancha (350 g)', 'Cigales a la planxa (350 g)', 'Grilled langoustines (350 g)', 'Kaisergranat, gegrillt (350 g)', 'Langoustines grillées (350 g)'), 49.0],
    ],
  },
  {
    id: 'carnes',
    orden: 4,
    nombre: t('Carnes', 'Carns', 'Meat', 'Fleisch', 'Viandes'),
    items: [
      [t('Solomillo de cerdo', 'Filet de porc', 'Pork tenderloin', 'Schweinelende', 'Filet mignon de porc'), 19.5, SALSAS],
      [t('Secreto ibérico de bellota', 'Secreto ibèric de gla', 'Acorn-fed Iberian secreto', 'Iberisches Secreto (Eichelmast)', 'Secreto ibérique de bellota'), 23.5, SALSAS],
      [t('Entrecot de ternera', 'Entrecot de vedella', 'Veal entrecôte', 'Entrecôte vom Rind', 'Entrecôte de veau'), 22.5, SALSAS],
      [t('Solomillo de ternera', 'Filet de vedella', 'Veal tenderloin', 'Kalbsfilet', 'Filet de veau'), 25.0, SALSAS],
    ],
  },
  {
    id: 'arroces',
    orden: 5,
    nombre: t('Arroces', 'Arrossos', 'Rice dishes', 'Reisgerichte', 'Riz'),
    // porPersona: el precio es por persona, mínimo 2 (así lo cuenta el bot)
    items: [
      [t('Paella vegetariana', 'Paella vegetariana', 'Vegetarian paella', 'Vegetarische Paella', 'Paella végétarienne'), 13.95, null, true],
      [t('Paella de carne y verdura', 'Paella de carn i verdura', 'Meat & vegetable paella', 'Fleisch-Gemüse-Paella', 'Paella viande et légumes'), 17.5, null, true],
      [t('Paella mixta', 'Paella mixta', 'Mixed paella (meat & seafood)', 'Gemischte Paella (Fleisch & Meeresfrüchte)', 'Paella mixte (viande & fruits de mer)'), 19.0, null, true],
      [t('Arroz de bacalao y coliflor', 'Arròs de bacallà i coliflor', 'Cod & cauliflower rice', 'Reis mit Kabeljau und Blumenkohl', 'Riz à la morue et au chou-fleur'), 17.5, null, true],
      [t('Paella de marisco', 'Paella de marisc', 'Seafood paella', 'Meeresfrüchte-Paella', 'Paella aux fruits de mer'), 19.0, null, true],
      [t('Arròs del senyoret', 'Arròs del senyoret', 'Arròs del senyoret — the original', 'Arròs del Senyoret — das Original', "Arròs del senyoret — l'original"), 18.5,
        t('El original: nació en esta casa', "L'original: va nàixer en esta casa", 'Seafood peeled & cleaned; born in this house', 'Fang komplett geschält; hier geboren', 'Fruits de mer décortiqués ; né dans cette maison'), true],
      [t('Fideuà del senyoret', 'Fideuà del senyoret', 'Fideuà del senyoret', 'Fideuà del Senyoret', 'Fideuà del senyoret'), 18.5,
        t('Fideos finos, marisco pelado', 'Fideus fins, marisc pelat', 'Thin noodles, peeled seafood', 'Feine Nudeln, geschälter Fang', 'Vermicelles, fruits de mer décortiqués'), true],
      [t('Arroz negro con calamar', 'Arròs negre amb calamar', 'Black rice with squid', 'Schwarzer Reis mit Kalmar', 'Riz noir au calmar'), 18.5, null, true],
      [t('Arroz meloso de pulpo', 'Arròs melós de polp', 'Creamy octopus rice', 'Cremiger Oktopus-Reis (meloso)', 'Riz moelleux au poulpe'), 20.5, null, true],
      [t('Arroz meloso con bogavante', 'Arròs melós amb llamàntol', 'Creamy lobster rice', 'Cremiger Hummer-Reis (meloso)', 'Riz moelleux au homard'), 24.0, null, true],
      [t('Arroz caldoso con bogavante', 'Arròs caldós amb llamàntol', 'Soupy lobster rice', 'Hummer-Reis in Brühe (caldoso)', 'Riz en bouillon au homard'), 24.0, null, true],
      [t('Paella de secreto ibérico y setas', 'Paella de secreto ibèric i bolets', 'Iberian pork & wild mushroom paella', 'Paella mit iberischem Secreto und Pilzen', 'Paella au secreto ibérique et champignons'), 25.0, null, true],
    ],
  },
  {
    id: 'pescados',
    orden: 6,
    nombre: t('Pescados', 'Peixos', 'Fish', 'Fisch', 'Poissons'),
    items: [
      [t('Sardinas a la plancha', 'Sardines a la planxa', 'Grilled sardines', 'Gegrillte Sardinen', 'Sardines grillées'), 15.0],
      [t('Salmón a la plancha', 'Salmó a la planxa', 'Grilled salmon', 'Gegrillter Lachs', 'Saumon grillé'), 19.5],
      [t('Lubina a la plancha', 'Llobarro a la planxa', 'Grilled sea bass', 'Gegrillter Wolfsbarsch', 'Loup de mer grillé'), 21.0],
      [t('Salmonetes fritos', 'Molls fregits', 'Fried red mullet', 'Rotbarben, gebraten', 'Rougets frits'), 19.5],
      [t('Pescadilla', 'Lluceta', 'Whiting (young hake)', 'Junger Seehecht', 'Petit merlu'), 19.5],
      [t('Emperador a la plancha', 'Emperador a la planxa', 'Grilled swordfish', 'Schwertfisch, gegrillt', 'Espadon grillé'), 18.5],
      [t('Pescado de Calp frito', 'Peix de Calp fregit', 'Fried fish of Calp', 'Fischplatte „Calp“, frittiert', 'Poissons de Calp frits'), 23.0,
        t('Pescadilla, salmonetes y pelayas', 'Lluceta, molls i palaies', 'Whiting, red mullet & small sole', 'Seehecht, Rotbarben & kleine Seezungen', 'Merlu, rougets & petites soles')],
      [t('Rape de la casa', 'Rap de la casa', 'Monkfish “Baydal”', 'Seeteufel „Baydal“', 'Lotte façon Baydal'), 24.5],
      [t('Lenguado (300 g)', 'Llenguado (300 g)', 'Sole meunière (300 g)', 'Seezunge Müllerin (300 g)', 'Sole meunière (300 g)'), 24.5],
    ],
  },
  {
    id: 'ninos',
    orden: 7,
    nombre: t('Para los niños', 'Per als xiquets', 'For kids', 'Für Kinder', 'Pour les enfants'),
    items: [
      [t('Nuggets de pollo con patatas', 'Nuggets de pollastre amb creïlles', 'Chicken nuggets & chips', 'Chicken Nuggets mit Pommes', 'Nuggets de poulet et frites'), 9.95],
      [t('Espagueti a la boloñesa', 'Espaguetis a la bolonyesa', 'Spaghetti Bolognese', 'Spaghetti Bolognese', 'Spaghetti bolognaise'), 10.5],
      [t('Pechuga de pollo con patatas', 'Pit de pollastre amb creïlles', 'Chicken breast & chips', 'Hühnerbrust mit Pommes', 'Poitrine de poulet et frites'), 13.5],
    ],
  },
];

const cab = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

async function api(metodo, ruta, cuerpo) {
  const res = await fetch(API + ruta, { method: metodo, headers: cab, body: cuerpo ? JSON.stringify(cuerpo) : undefined });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${metodo} ${ruta} → ${res.status}: ${json.error ?? '?'}`);
  return json;
}

// 1) Secciones actuales (seed) que no estén en la lista nueva → fuera
const actuales = (await api('GET', '/carta')).secciones.map((s) => s.id);
const nuevas = SECCIONES.map((s) => s.id);
for (const id of actuales.filter((id) => !nuevas.includes(id))) {
  await api('DELETE', `/carta/${id}`);
  console.log(`🗑 sección "${id}" eliminada (era del seed)`);
}

// 2) Cargar/actualizar las 7 secciones reales
for (const s of SECCIONES) {
  const items = s.items.map(([nombre, precio, descripcion, porPersona]) => ({
    nombre,
    precio,
    porPersona: porPersona === true,
    disponible: true,
    ...(descripcion ? { descripcion } : {}),
  }));
  await api('PUT', `/carta/${s.id}`, { nombre: s.nombre, orden: s.orden, visible: true, items });
  console.log(`✔ ${s.id}: ${items.length} platos`);
}

// 3) Resumen final desde la API (lo que verá el bot)
const final = (await api('GET', '/carta')).secciones;
const total = final.reduce((n, s) => n + s.items.length, 0);
console.log(`\nCarta cargada: ${final.length} secciones, ${total} platos (mayo 2026, 5 idiomas).`);
