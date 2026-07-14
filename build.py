# -*- coding: utf-8 -*-
"""Generador estático de baydal.es — 7 páginas × 4 idiomas desde una fuente de datos.
Uso: python build.py  (escribe el sitio en ./dist)
Fuente de la carta: Google Sheets mayo 2026 (ES/DE/FR) + traducción EN propia.
"""
import os, shutil, json

ROOT = os.path.dirname(os.path.abspath(__file__))
DIST = os.path.join(ROOT, "dist")
DOMAIN = "https://baydal.es"
TEL = "+34965831111"
TEL_VISIBLE = "965 831 111"
WA = "34677490049"
# Dirección oficial confirmada por David 13/07/2026 (Google/IG/Yelp dicen 12: corregirlos allí, no copiarlos)
ADDRESS = "Avinguda del Port, 10"
GEO = (38.6366, 0.0706)

LANGS = ["es", "en", "de", "fr"]

# --- rutas por página e idioma (hreflang) ---
PATHS = {
    "home":     {"es": "/",                    "en": "/en/",              "de": "/de/",              "fr": "/fr/"},
    "carta":    {"es": "/carta/",              "en": "/en/menu/",         "de": "/de/speisekarte/",  "fr": "/fr/carte/"},
    "senyoret": {"es": "/arros-del-senyoret/", "en": "/en/senyoret-rice/","de": "/de/arros-del-senyoret/", "fr": "/fr/riz-du-senyoret/"},
    "historia": {"es": "/historia/",           "en": "/en/history/",      "de": "/de/geschichte/",   "fr": "/fr/histoire/"},
    "galeria":  {"es": "/galeria/",            "en": "/en/gallery/",      "de": "/de/galerie/",      "fr": "/fr/galerie/"},
    "reservas": {"es": "/reservas/",           "en": "/en/book/",         "de": "/de/reservieren/",  "fr": "/fr/reserver/"},
    "visitenos":{"es": "/visitenos/",          "en": "/en/find-us/",      "de": "/de/anfahrt/",      "fr": "/fr/venir/"},
    "lonja":    {"es": "/lonja-de-calp/",      "en": "/en/fish-auction/", "de": "/de/fischauktion/", "fr": "/fr/criee-de-calpe/"},
}

T = {
"es": {
 "lang_name":"Español","nav":{"carta":"Carta","senyoret":"Arròs del Senyoret","historia":"Historia","galeria":"Galería","visitenos":"Visítenos","reservar":"Reservar mesa"},
 "meta_home":("Restaurante Baydal | Arroces y pescado fresco en el puerto de Calp, desde 1941",
   "Marisquería y arrocería en el puerto de Calpe desde 1941. La casa donde nació el arròs del senyoret. Pescado de la lonja, terraza frente al puerto. Reserva: 965 831 111."),
 "hero_h1":"Arroces y pescado fresco en el puerto de Calp",
 "hero_sub":"La casa donde nació el arròs del senyoret. Frente a la lonja, bajo el Peñón de Ifach, desde julio de 1941.",
 "hero_cta1":"Reservar mesa","hero_cta2":"Ver la carta",
 "since":"Desde 1941",
 "home_b1_t":"El arroz que nació aquí","home_b1_p":"El arròs del senyoret —arroz marinero con todo el marisco pelado— salió por primera vez de nuestra cocina. Hoy es plato típico oficial de Calp y se sirve en media provincia. Aquí se hace como el primer día: fumet de morralla, salmorreta y marisco de la bahía.","home_b1_cta":"Lee la historia",
 "home_b2_t":"De la lonja a la mesa","home_b2_p":"La lonja de Calp está a un paso de nuestra puerta. Cada tarde, a las 17:00, la subasta decide lo que se fríe y se guisa aquí: pescadilla, salmonetes, gamba de Calp, pelayas. Lo que el mar da ese día.","home_b2_cta":"Ver la carta",
 "home_b3_t":"Tres generaciones junto al puerto","home_b3_p":"Salvador y María Baydal levantaron un bar sobre una roca del puerto en 1941. Hoy la tercera generación sigue en el mismo sitio, con el mismo oficio.","home_b3_cta":"Nuestra historia",
 "home_platos_t":"De la casa","home_press_t":"Dicen de nosotros",
 "press_quote":"«En el Restaurante Baydal de Calpe se inventó el famoso arròs del senyoret.»","press_src":"Costa Nachrichten (prensa alemana de la Costa Blanca)",
 "home_visit_t":"Estamos en el puerto",
 "hours_t":"Horario","hours":"10:00–16:00 y 19:00–23:00 · Lunes cerrado (salvo verano)",
 "addr_t":"Dirección","map_cta":"Cómo llegar",
 "meta_carta":("Carta 2026 | Restaurante Baydal, arroces y marisco en Calp","Carta completa con precios: arroces y paellas, pescado fresco de la lonja de Calp, marisco de la bahía, carnes y menú Baydal a 30 €. Restaurante en el puerto de Calpe."),
 "carta_h1":"La carta","carta_sub":"Producto de la lonja de Calp y arroces hechos al momento. Precios con IVA. Si tienes alergias o intolerancias, dínoslo: tenemos pan sin gluten y te asesoramos plato a plato.",
 "sec_entrantes":"Entrantes y raciones","sec_mariscos":"Marisco de la bahía","sec_arroces":"Arroces","sec_pescados":"Pescados de la lonja","sec_carnes":"Carnes","sec_ninos":"Para los niños","sec_postres":"Postres caseros",
 "arroces_note":"Mínimo 2 personas · Un tipo de arroz por mesa · 25–35 minutos: los arroces se preparan al momento",
 "carnes_note":"Las carnes pueden servirse con salsa de champiñones, pimienta o roquefort",
 "racion_note":"ración pequeña / normal",
 "postres_list":"Flan de huevo casero · Helado de turrón con Pedro Ximénez · Tartas caseras · Sorbete de limón al cava · Fruta natural",
 "menu_baydal_t":"Menú Baydal — 30 € por persona","menu_baydal_note":"IVA incluido · Bebidas no incluidas",
 "menu_baydal":[("Para compartir","Pan y allioli · Gamba blanca de Calp hervida · Fritada Baydal"),("Segundo a elegir","Arròs del senyoret (mín. 2 pers.) · Emperador fresco a la plancha · Solomillo de cerdo con salsa de champiñones"),("Postre a elegir","Tartas caseras · Fruta · Sorbete de limón al cava · Helado de turrón con Pedro Ximénez")],
 "desayunos_t":"Desayunos y almuerzos","desayunos_p":"Por las mañanas: tostadas (tomate, serrano, aguacate, queso…) desde 2 €, croissants, churros con chocolate, bocadillos y pepitos, zumo de naranja natural. Pan sin gluten disponible.",
 "meta_senyoret":("Arròs del senyoret: la historia del arroz que nació en el Baydal de Calp","Qué es el arròs del senyoret, dónde nació y por qué es plato típico de Calp. La historia verdadera, contada por la casa donde se hizo el primero: el Restaurante Baydal, en el puerto, desde 1941."),
 "seny_h1":"Arròs del senyoret: el arroz que nació en esta casa",
 "seny_body":[
   "En el Baydal nació el arròs del senyoret. La historia es de sobremesa: un cliente valenciano, habitual de la casa, pedía siempre su arroz de marisco ya pelado, para no mancharse los dedos. En la cocina lo apodaban, con cariño, «el senyoret» — el señorito.",
   "Al principio el plato ni figuraba en la carta: pelar todo aquel marisco daba un trabajo enorme. Pero él presumía de «su arroz» y animaba a todo el mundo a venir a probarlo, hasta que la casa claudicó. Aquel capricho se convirtió en el arroz que hoy se sirve en media provincia: arroz marinero con todo el marisco limpio, levantado sobre un fumet de morralla y nuestra salmorreta.",
   "Y no lo decimos solo nosotros: la televisión pública valenciana À Punt, Las Provincias, Levante-EMV y la Viquipèdia señalan al Baydal como la casa donde se creó. Desde mediados de los años noventa, el arròs del senyoret es oficialmente plato típico de Calp.",
   "Circulan otras leyendas —que si Sorolla en una arrocería de Valencia, que si un dandi barcelonés y su arroz Parellada, que en realidad es otro plato—, pero ninguna tiene cocina, fecha ni testigos con nombre y apellidos. La nuestra sí: la de siempre, junto al puerto de Calp, desde julio de 1941."],
 "seny_faq_t":"Preguntas frecuentes",
 "seny_faq":[
   ("¿Qué es el arròs del senyoret?","Un arroz seco marinero, hecho en paella, con el pescado y el marisco completamente pelados y limpios, de forma que se come todo con cuchara y tenedor, sin mancharse. La base: fumet de morralla, salmorreta alicantina y marisco de la bahía."),
   ("¿En qué se diferencia de la paella o del arroz a banda?","De la paella de marisco, en que aquí el marisco va pelado y cortado, integrado en el arroz. Del arroz a banda, en que el a banda tradicional se cocina «aparte» del pescado con el que se hace el caldo; el senyoret lleva el marisco limpio dentro."),
   ("¿Por qué se llama 'del senyoret'?","Por el apodo que la cocina puso al cliente que lo pedía: un «señorito» valenciano que no quería mancharse los dedos pelando gambas. El nombre se quedó."),
   ("¿Dónde se puede probar el original?","En el Restaurante Baydal, Avinguda del Port 10, junto a la lonja del puerto de Calp. Se recomienda reservar: los arroces se hacen al momento (25–35 min).")],
 "seny_cta":"Reserva y pruébalo donde nació",
 "meta_historia":("Desde 1941 en el puerto de Calp | Historia del Restaurante Baydal","Tres generaciones junto a la lonja de Calp: de la barraca sobre «la roqueta» (1941) al restaurante de hoy. La historia de la familia Baydal y del arròs del senyoret."),
 "hist_h1":"Ochenta y cinco años mirando al Peñón",
 "hist_intro":"El Baydal es el restaurante más antiguo del puerto de Calp. Esta es la historia corta de una familia que lleva tres generaciones dando de comer junto a la lonja.",
 "hist_timeline":[
   ("1941","La barraca sobre la roqueta","En julio de 1941, con el puerto pesquero recién construido, Salvador y María Baydal abren un pequeño bar sobre una roca que emergía del mar —«la roqueta»— con tres mil pesetas y un permiso. Cuarenta metros cuadrados frente a los muelles."),
   ("1957","Derribo y nueva casa","El local original se derriba y la familia levanta el bar-restaurante en su emplazamiento actual, a pie de puerto."),
   ("1962","La concesión definitiva","Llega la concesión administrativa definitiva del establecimiento, la «gran preocupación» de la segunda generación, como recordaba Jaime Baydal."),
   ("años 70–80","Nace el arròs del senyoret","En los fogones de la segunda generación, un cliente valenciano apodado «el senyoret» pide su arroz con el marisco pelado. El capricho se hace plato, y el plato hace historia."),
   ("años 90","Plato típico de Calp","El Ajuntament de Calp declara el arròs del senyoret plato típico del municipio. El arroz del Baydal ya es patrimonio de todos."),
   ("2016","Un matasellos con nuestro nombre","Correos dedica un matasellos conmemorativo a los 75 años de la casa durante Exficalp. Pocos restaurantes pueden franquear cartas con su historia."),
   ("2021","80 aniversario","Ochenta años después de la roqueta, la prensa local celebra con nosotros: «esto de la hostelería lo llevamos en la sangre»."),
   ("Hoy","Tercera generación","José Baydal encabeza la tercera generación. En 2025 despedimos a Jaime Baydal Crespo (1935–2025), alma de la segunda. El comedor sigue oliendo, como escribió la prensa, «a arroz del senyoret, a sal y a memoria».")],
 "hist_press_t":"Lo han contado",
 "meta_galeria":("Galería | Restaurante Baydal, el puerto de Calp en imágenes","Fotos del Restaurante Baydal: arroces, pulpo a la brasa, pescado de la lonja, la terraza del puerto de Calpe y la casa desde 1941."),
 "gal_h1":"La casa, el puerto y lo que sale de la cocina",
 "meta_reservas":("Reservar mesa en Calp | Restaurante Baydal, puerto de Calpe","Reserva tu mesa en el Restaurante Baydal: por teléfono (965 831 111), WhatsApp o formulario. Arroces al momento en el puerto de Calp. Grupos y celebraciones."),
 "res_h1":"Reservar mesa",
 "res_p":"Elige día, hora y comensales y te confirmamos por WhatsApp en el momento. También puedes llamarnos al <a href=\"tel:%TEL%\">965 831 111</a>.",
 "res_f":{"nombre":"Tu nombre","fecha":"Día","hora":"Hora","pax":"Personas","enviar":"Reservar por WhatsApp","msg":"Hola, quisiera reservar una mesa el %F a las %H para %P personas. Soy %N.","nota":"Los arroces se preparan al momento (25–35 minutos). Si venís en grupo o queréis arroz para muchos, avísanos y lo dejamos apalabrado."},
 "meta_visit":("Cómo llegar | Restaurante Baydal, Avinguda del Port 10, Calp","Restaurante Baydal en el puerto de Calpe, frente a la lonja: dirección, horario, parking, teléfono y mapa. A 20 minutos a pie del Peñón de Ifach."),
 "visit_h1":"En el puerto, frente a la lonja",
 "visit_p":"Estamos en la Avinguda del Port, en el puerto pesquero de Calp, con la lonja enfrente y el Peñón de Ifach encima. Parking en la explanada del puerto. Después de comer, el paseo hasta el Peñón se hace solo.",
 "visit_parking":"Parking: explanada del puerto (gratuito)","visit_lonja":"La lonja y su subasta: cada tarde a las 17:00, a 50 m",
 "footer_legal":"Aviso legal · Privacidad · Cookies",
 "wa_cta":"WhatsApp",
},
"en": {
 "lang_name":"English","nav":{"carta":"Menu","senyoret":"Senyoret Rice","historia":"Our Story","galeria":"Gallery","visitenos":"Find us","reservar":"Book a table"},
 "meta_home":("Restaurante Baydal | Fresh fish & paella by Calpe harbour, since 1941",
   "Seafood and rice restaurant on Calpe's fishing port since 1941 — the birthplace of arròs del senyoret. Fish straight from the auction. Book: +34 965 831 111."),
 "hero_h1":"Rice dishes & fresh fish on Calpe harbour",
 "hero_sub":"The house where arròs del senyoret was born. Facing the fish market, beneath the Peñón de Ifach, since July 1941.",
 "hero_cta1":"Book a table","hero_cta2":"See the menu",
 "since":"Since 1941",
 "home_b1_t":"The rice that was born here","home_b1_p":"Arròs del senyoret — seafood rice with everything peeled for you — first came out of this kitchen. Today it is Calpe's official signature dish, served all along the coast. We still make it the original way: rockfish stock, salmorreta, and shellfish from the bay.","home_b1_cta":"Read the story",
 "home_b2_t":"From the auction to your table","home_b2_p":"Calpe's fish market is steps from our door. Every afternoon at 5pm the auction decides what we fry and stew that evening: whiting, red mullet, Calpe prawns, baby sole. Whatever the sea gives that day.","home_b2_cta":"See the menu",
 "home_b3_t":"Three generations on the port","home_b3_p":"Salvador and María Baydal built a bar on a rock by the harbour in 1941. The third generation still runs the same house, the same trade.","home_b3_cta":"Our story",
 "home_platos_t":"House classics","home_press_t":"In the press",
 "press_quote":"“The famous arròs del senyoret was invented at Restaurante Baydal in Calpe.”","press_src":"Costa Nachrichten (German-language Costa Blanca press)",
 "home_visit_t":"On the harbour",
 "hours_t":"Opening hours","hours":"10:00–16:00 & 19:00–23:00 · Closed Mondays (except summer)",
 "addr_t":"Address","map_cta":"Get directions",
 "meta_carta":("Menu 2026 | Restaurante Baydal — paella & seafood in Calpe","Full menu with prices: paellas and rice dishes, fresh fish from Calpe's auction, shellfish, meat and the 30 € Baydal set menu. Restaurant on Calpe harbour."),
 "carta_h1":"The menu","carta_sub":"Produce from Calpe's fish market and rice made to order. Prices include VAT. Allergies or intolerances? Tell us — gluten-free bread available, and we'll guide you dish by dish.",
 "sec_entrantes":"Starters & sharing plates","sec_mariscos":"Shellfish from the bay","sec_arroces":"Rice dishes","sec_pescados":"Fish from the market","sec_carnes":"Meat","sec_ninos":"For kids","sec_postres":"Homemade desserts",
 "arroces_note":"Minimum 2 people · One type of rice per table · 25–35 min: every rice is made to order",
 "carnes_note":"Meats can be served with mushroom, pepper or Roquefort sauce",
 "racion_note":"small / regular portion",
 "postres_list":"Homemade crème caramel · Turrón ice cream with Pedro Ximénez · Homemade cakes · Lemon sorbet with cava · Fresh fruit",
 "menu_baydal_t":"Baydal Set Menu — €30 per person","menu_baydal_note":"VAT included · Drinks not included",
 "menu_baydal":[("To share","Bread & allioli · Boiled white Calpe prawns · Baydal fried fish platter"),("Main course (choose one)","Arròs del senyoret (min. 2 people) · Fresh grilled swordfish · Pork tenderloin with mushroom sauce"),("Dessert (choose one)","Homemade cakes · Fruit · Lemon sorbet with cava · Turrón ice cream with Pedro Ximénez")],
 "desayunos_t":"Breakfast","desayunos_p":"Mornings: toasts (tomato, serrano ham, avocado, cheese…) from €2, croissants, churros with hot chocolate, baguette sandwiches and fresh orange juice. Gluten-free bread available.",
 "meta_senyoret":("Senyoret rice: the story of the dish born at Baydal, Calpe","What arròs del senyoret is, where it was born and why it is Calpe's signature dish — told by the house that made the first one: Restaurante Baydal, on the harbour since 1941."),
 "seny_h1":"Arròs del senyoret: the rice born in this house",
 "seny_body":[
   "Arròs del senyoret was born at Baydal. The story is one for the after-lunch table: a Valencian regular would always ask for his seafood rice with everything peeled, so as not to dirty his fingers. In the kitchen they nicknamed him, fondly, «el senyoret» — the young gentleman.",
   "At first the dish wasn't even on the menu: peeling all that shellfish was an enormous job. But he boasted about «his rice» and kept sending friends to try it, until the house gave in. That whim became the rice served along half the province: seafood rice with everything cleaned, built on a rockfish fumet and our salmorreta.",
   "And you don't have to take our word for it: Valencian public television À Punt, the newspapers Las Provincias and Levante-EMV, and the Catalan Wikipedia all point to Baydal as the house where it was created. Since the mid-nineties, arròs del senyoret has been Calpe's official signature dish.",
   "Other legends do the rounds — the painter Sorolla in a Valencia rice house, a Barcelona dandy and his arròs Parellada, actually a different dish — but none has a kitchen, a date or witnesses with first and last names. Ours does: the same one as always, by Calpe harbour, since July 1941."],
 "seny_faq_t":"Frequently asked questions",
 "seny_faq":[
   ("What is arròs del senyoret?","A dry seafood rice cooked in a paella pan, with all the fish and shellfish completely peeled and cleaned, so you eat the whole thing with knife and fork — no messy fingers. The base: rockfish stock, Alicante-style salmorreta and shellfish from the bay."),
   ("How is it different from paella or arroz a banda?","Unlike seafood paella, here the shellfish comes peeled and cut, folded into the rice. Unlike traditional arroz a banda — cooked 'apart' from the fish used for the stock — senyoret carries the cleaned seafood inside."),
   ("Why is it called 'del senyoret'?","After the nickname the kitchen gave the customer who ordered it: a Valencian 'young gentleman' who didn't want to dirty his fingers peeling prawns. The name stuck."),
   ("Where can you try the original?","At Restaurante Baydal, Avinguda del Port 10, next to the fish market on Calpe harbour. Booking recommended: every rice is made to order (25–35 min).")],
 "seny_cta":"Book a table and try it where it was born",
 "meta_historia":("On Calpe harbour since 1941 | The story of Restaurante Baydal","Three generations beside Calpe's fish market: from a shack on 'la roqueta' (1941) to today's restaurant. The story of the Baydal family and of arròs del senyoret."),
 "hist_h1":"Eighty-five years facing the Peñón",
 "hist_intro":"Baydal is the oldest restaurant on Calpe harbour. This is the short version of a family story: three generations feeding people beside the fish market.",
 "hist_timeline":[
   ("1941","A shack on the rock","In July 1941, with the fishing port newly built, Salvador and María Baydal open a small bar on a rock that rose from the sea — 'la roqueta' — with three thousand pesetas and a permit. Forty square metres facing the docks."),
   ("1957","Demolition and a new house","The original hut is demolished and the family builds the bar-restaurant on its present site, at the water's edge."),
   ("1962","The definitive concession","The definitive administrative concession finally arrives — 'our great worry', as Jaime Baydal used to recall."),
   ("1970s–80s","Senyoret rice is born","At the stoves of the second generation, a Valencian customer nicknamed 'el senyoret' asks for his rice with the seafood peeled. The whim becomes a dish; the dish makes history."),
   ("1990s","Calpe's signature dish","Calpe Town Hall declares arròs del senyoret the town's typical dish. Baydal's rice now belongs to everyone."),
   ("2016","A postmark of our own","The Spanish postal service dedicates a commemorative postmark to the house's 75th anniversary during Exficalp."),
   ("2021","80th anniversary","Eighty years after the roqueta, the local press celebrates with us: 'hospitality runs in our blood'."),
   ("Today","Third generation","José Baydal heads the third generation. In 2025 we said goodbye to Jaime Baydal Crespo (1935–2025), soul of the second. The dining room still smells, as the press wrote, 'of senyoret rice, salt and memory'.")],
 "hist_press_t":"As told by",
 "meta_galeria":("Gallery | Restaurante Baydal — Calpe harbour in pictures","Photos of Restaurante Baydal: rice dishes, grilled octopus, fish from the market, the harbour terrace and the house since 1941."),
 "gal_h1":"The house, the harbour and what leaves the kitchen",
 "meta_reservas":("Book a table in Calpe | Restaurante Baydal, Calpe harbour","Book your table at Restaurante Baydal: by phone (+34 965 831 111), WhatsApp or form. Rice made to order on Calpe harbour. Groups and celebrations."),
 "res_h1":"Book a table",
 "res_p":"Pick a day, time and party size and we'll confirm on WhatsApp right away. You can also call us on <a href=\"tel:%TEL%\">+34 965 831 111</a>.",
 "res_f":{"nombre":"Your name","fecha":"Date","hora":"Time","pax":"Guests","enviar":"Book via WhatsApp","msg":"Hello! I'd like to book a table on %F at %H for %P people. My name is %N.","nota":"Every rice dish is made to order (25–35 minutes). Coming as a group, or want rice for a crowd? Let us know and we'll have it arranged."},
 "meta_visit":("How to find us | Restaurante Baydal, Avinguda del Port 10, Calpe","Restaurante Baydal on Calpe harbour, opposite the fish market: address, opening hours, parking, phone and map. A 20-minute walk from the Peñón de Ifach."),
 "visit_h1":"On the harbour, opposite the fish market",
 "visit_p":"You'll find us on Avinguda del Port, on Calpe's fishing harbour, with the fish market across the way and the Peñón de Ifach above. Free parking on the harbour esplanade. After lunch, the walk to the Peñón takes care of itself.",
 "visit_parking":"Parking: harbour esplanade (free)","visit_lonja":"The fish market auction: daily at 5pm, 50 m away",
 "footer_legal":"Legal notice · Privacy · Cookies",
 "wa_cta":"WhatsApp",
},
"de": {
 "lang_name":"Deutsch","nav":{"carta":"Speisekarte","senyoret":"Arròs del Senyoret","historia":"Geschichte","galeria":"Galerie","visitenos":"Anfahrt","reservar":"Tisch reservieren"},
 "meta_home":("Restaurante Baydal | Frischer Fisch & Paella am Hafen von Calpe, seit 1941",
   "Fisch- und Reisrestaurant am Fischereihafen von Calpe seit 1941 — hier wurde der Arròs del Senyoret erfunden. Fisch direkt von der Auktion. Reservierung: +34 965 831 111."),
 "hero_h1":"Reisgerichte & frischer Fisch am Hafen von Calpe",
 "hero_sub":"Das Haus, in dem der Arròs del Senyoret geboren wurde. Gegenüber der Fischauktion, unterhalb des Peñón de Ifach, seit Juli 1941.",
 "hero_cta1":"Tisch reservieren","hero_cta2":"Zur Speisekarte",
 "since":"Seit 1941",
 "home_b1_t":"Der Reis, der hier geboren wurde","home_b1_p":"Der Arròs del Senyoret — Meeresfrüchtereis, bei dem alles für Sie geschält ist — kam zum ersten Mal aus dieser Küche. Heute ist er das offizielle Gericht von Calpe. Wir kochen ihn wie am ersten Tag: Fischfond, Salmorreta und Meeresfrüchte aus der Bucht.","home_b1_cta":"Die Geschichte lesen",
 "home_b2_t":"Von der Auktion auf den Tisch","home_b2_p":"Die Fischauktionshalle (Lonja) liegt direkt vor unserer Tür. Jeden Nachmittag um 17 Uhr entscheidet die Auktion, was abends gebraten und geschmort wird: junger Seehecht, Rotbarben, Calpe-Garnelen. Was das Meer an dem Tag hergibt.","home_b2_cta":"Zur Speisekarte",
 "home_b3_t":"Drei Generationen am Hafen","home_b3_p":"Salvador und María Baydal bauten 1941 eine Bar auf einem Felsen am Hafen. Heute führt die dritte Generation dasselbe Haus, dasselbe Handwerk.","home_b3_cta":"Unsere Geschichte",
 "home_platos_t":"Klassiker des Hauses","home_press_t":"Pressestimmen",
 "press_quote":"„Im Restaurant Baydal in Calpe wurde das berühmte Reisgericht Arroz del Senyoret erfunden.“","press_src":"Costa Nachrichten",
 "home_visit_t":"Am Hafen",
 "hours_t":"Öffnungszeiten","hours":"10:00–16:00 & 19:00–23:00 · Montags geschlossen (außer im Sommer)",
 "addr_t":"Adresse","map_cta":"Route anzeigen",
 "meta_carta":("Speisekarte 2026 | Restaurante Baydal — Paella & Meeresfrüchte in Calpe","Komplette Karte mit Preisen: Paellas und Reisgerichte, frischer Fisch von der Auktion in Calpe, Meeresfrüchte, Fleisch und Baydal-Menü für 30 €. Restaurant am Hafen von Calpe."),
 "carta_h1":"Die Speisekarte","carta_sub":"Produkte von der Lonja in Calpe, Reisgerichte frisch zubereitet. Preise inkl. MwSt. Allergien oder Unverträglichkeiten? Sagen Sie es uns — glutenfreies Brot vorhanden, wir beraten Sie gern.",
 "sec_entrantes":"Vorspeisen & Raciones","sec_mariscos":"Meeresfrüchte aus der Bucht","sec_arroces":"Reisgerichte","sec_pescados":"Fisch von der Lonja","sec_carnes":"Fleisch","sec_ninos":"Für Kinder","sec_postres":"Hausgemachte Desserts",
 "arroces_note":"Mindestens 2 Personen · Eine Reissorte pro Tisch · 25–35 Min.: jeder Reis wird frisch zubereitet",
 "carnes_note":"Fleischgerichte wahlweise mit Champignon-, Pfeffer- oder Roquefortsauce",
 "racion_note":"kleine / normale Portion",
 "postres_list":"Hausgemachter Karamellflan · Turrón-Eis mit Pedro Ximénez · Hausgemachte Kuchen · Zitronensorbet mit Cava · Frisches Obst",
 "menu_baydal_t":"Menü Baydal — 30 € pro Person","menu_baydal_note":"Inkl. MwSt. · Getränke nicht inbegriffen",
 "menu_baydal":[("Zum Teilen","Brot & Allioli · Gekochte weiße Calpe-Garnelen · Frittierte Fischplatte Baydal"),("Hauptgericht nach Wahl","Arròs del Senyoret (mind. 2 Pers.) · Frischer Schwertfisch vom Grill · Schweinelende mit Champignonsauce"),("Dessert nach Wahl","Hausgemachte Kuchen · Obst · Zitronensorbet mit Cava · Turrón-Eis mit Pedro Ximénez")],
 "desayunos_t":"Frühstück","desayunos_p":"Vormittags: Tostadas (Tomate, Serrano-Schinken, Avocado, Käse…) ab 2 €, Croissants, Churros mit heißer Schokolade, belegte Baguettes und frisch gepresster Orangensaft. Glutenfreies Brot vorhanden.",
 "meta_senyoret":("Arròs del Senyoret: die Geschichte des Reisgerichts aus dem Baydal in Calpe","Was der Arròs del Senyoret ist, wo er erfunden wurde und warum er das offizielle Gericht von Calpe ist — erzählt von dem Haus, das den ersten kochte: Restaurante Baydal, am Hafen seit 1941."),
 "seny_h1":"Arròs del Senyoret: der Reis, der in diesem Haus geboren wurde",
 "seny_body":[
   "Der Arròs del Senyoret wurde im Baydal geboren. Die Geschichte gehört an den Stammtisch: ein valencianischer Stammgast bestellte seinen Meeresfrüchtereis immer komplett geschält — um sich nicht die Finger schmutzig zu machen. In der Küche nannte man ihn liebevoll «el senyoret», das Herrchen.",
   "Anfangs stand das Gericht nicht einmal auf der Karte: all die Meeresfrüchte zu schälen war eine Riesenarbeit. Aber er prahlte mit «seinem Reis» und schickte Freunde vorbei, bis das Haus nachgab. Aus der Laune wurde das Gericht, das heute an der halben Küste serviert wird: Meeresreis mit komplett geputztem Fang, aufgebaut auf Fischfond und unserer Salmorreta.",
   "Und das sagen nicht nur wir: der valencianische öffentliche Sender À Punt, die Zeitungen Las Provincias und Levante-EMV sowie die katalanische Wikipedia nennen das Baydal als Geburtshaus. Seit Mitte der Neunziger ist der Arròs del Senyoret offiziell das typische Gericht von Calpe.",
   "Es kursieren andere Legenden — der Maler Sorolla in Valencia, ein Dandy in Barcelona und sein Arròs Parellada, eigentlich ein anderes Gericht —, aber keine hat eine Küche, ein Datum oder Zeugen mit Vor- und Nachnamen. Unsere schon: dieselbe wie immer, am Hafen von Calpe, seit Juli 1941."],
 "seny_faq_t":"Häufige Fragen",
 "seny_faq":[
   ("Was ist Arròs del Senyoret?","Ein trockenes Meeresfrüchte-Reisgericht aus der Paella-Pfanne, bei dem Fisch und Meeresfrüchte komplett geschält und geputzt sind — man isst alles mit Messer und Gabel, ohne sich die Finger schmutzig zu machen. Die Basis: Fischfond, Salmorreta nach Alicante-Art und Meeresfrüchte aus der Bucht."),
   ("Worin unterscheidet er sich von Paella oder Arroz a banda?","Anders als bei der Meeresfrüchte-Paella sind hier alle Zutaten geschält und geschnitten im Reis. Anders als beim traditionellen Arroz a banda — der «getrennt» vom Fisch des Fonds gegessen wird — steckt beim Senyoret der geputzte Fang im Reis."),
   ("Warum heißt er 'del Senyoret'?","Nach dem Spitznamen, den die Küche dem Gast gab: ein valencianisches «Herrchen», das sich beim Garnelenschälen nicht die Finger schmutzig machen wollte. Der Name blieb."),
   ("Wo probiert man das Original?","Im Restaurante Baydal, Avinguda del Port 10, neben der Fischauktion am Hafen von Calpe. Reservierung empfohlen: jeder Reis wird frisch zubereitet (25–35 Min.).")],
 "seny_cta":"Reservieren Sie — und probieren Sie ihn dort, wo er geboren wurde",
 "meta_historia":("Seit 1941 am Hafen von Calpe | Die Geschichte des Restaurante Baydal","Drei Generationen neben der Fischauktion von Calpe: von der Hütte auf «la roqueta» (1941) bis heute. Die Geschichte der Familie Baydal und des Arròs del Senyoret."),
 "hist_h1":"Fünfundachtzig Jahre mit Blick auf den Peñón",
 "hist_intro":"Das Baydal ist das älteste Restaurant am Hafen von Calpe. Dies ist die kurze Geschichte einer Familie, die seit drei Generationen neben der Lonja kocht.",
 "hist_timeline":[
   ("1941","Die Hütte auf dem Felsen","Im Juli 1941, der Fischereihafen ist gerade gebaut, eröffnen Salvador und María Baydal mit dreitausend Peseten und einer Genehmigung eine kleine Bar auf einem Felsen im Meer — «la roqueta». Vierzig Quadratmeter vor den Kais."),
   ("1957","Abriss und Neubau","Das ursprüngliche Lokal wird abgerissen; die Familie errichtet das Bar-Restaurant am heutigen Standort, direkt am Hafen."),
   ("1962","Die endgültige Konzession","Die endgültige Konzession trifft ein — «unsere große Sorge», wie Jaime Baydal sich erinnerte."),
   ("70er–80er","Der Senyoret entsteht","Am Herd der zweiten Generation bestellt ein valencianischer Gast, Spitzname «el senyoret», seinen Reis mit geschältem Fang. Aus der Laune wird ein Gericht, aus dem Gericht Geschichte."),
   ("90er","Typisches Gericht von Calpe","Die Stadt Calpe erklärt den Arròs del Senyoret zum typischen Gericht des Ortes."),
   ("2016","Ein eigener Poststempel","Die spanische Post widmet dem 75. Jubiläum des Hauses einen Sonderstempel."),
   ("2021","80-jähriges Jubiläum","Achtzig Jahre nach der Roqueta feiert die Lokalpresse mit: «Die Gastronomie liegt uns im Blut»."),
   ("Heute","Dritte Generation","José Baydal führt die dritte Generation. 2025 nahmen wir Abschied von Jaime Baydal Crespo (1935–2025), Seele der zweiten. Der Speisesaal riecht, wie die Presse schrieb, «nach Senyoret-Reis, Salz und Erinnerung».")],
 "hist_press_t":"Nachzulesen bei",
 "meta_galeria":("Galerie | Restaurante Baydal — der Hafen von Calpe in Bildern","Fotos des Restaurante Baydal: Reisgerichte, gegrillter Oktopus, Fisch von der Lonja, die Hafenterrasse und das Haus seit 1941."),
 "gal_h1":"Das Haus, der Hafen und was die Küche verlässt",
 "meta_reservas":("Tisch reservieren in Calpe | Restaurante Baydal am Hafen","Reservieren Sie Ihren Tisch im Restaurante Baydal: telefonisch (+34 965 831 111), per WhatsApp oder Formular. Frisch zubereitete Reisgerichte am Hafen von Calpe."),
 "res_h1":"Tisch reservieren",
 "res_p":"Wählen Sie Tag, Uhrzeit und Personenzahl — wir bestätigen sofort per WhatsApp. Oder rufen Sie uns an: <a href=\"tel:%TEL%\">+34 965 831 111</a>.",
 "res_f":{"nombre":"Ihr Name","fecha":"Datum","hora":"Uhrzeit","pax":"Personen","enviar":"Per WhatsApp reservieren","msg":"Hallo! Ich möchte am %F um %H einen Tisch für %P Personen reservieren. Mein Name ist %N.","nota":"Jeder Reis wird frisch zubereitet (25–35 Minuten). Für Gruppen oder große Reispfannen: sagen Sie uns Bescheid, wir bereiten alles vor."},
 "meta_visit":("Anfahrt | Restaurante Baydal, Avinguda del Port 10, Calpe","Restaurante Baydal am Hafen von Calpe, gegenüber der Fischauktion: Adresse, Öffnungszeiten, Parken, Telefon und Karte. 20 Minuten zu Fuß vom Peñón de Ifach."),
 "visit_h1":"Am Hafen, gegenüber der Lonja",
 "visit_p":"Sie finden uns an der Avinguda del Port am Fischereihafen von Calpe — die Auktionshalle gegenüber, der Peñón de Ifach darüber. Kostenlose Parkplätze auf der Hafenesplanade. Nach dem Essen ergibt sich der Spaziergang zum Peñón von selbst.",
 "visit_parking":"Parken: Hafenesplanade (kostenlos)","visit_lonja":"Die Fischauktion: täglich um 17 Uhr, 50 m entfernt",
 "footer_legal":"Impressum · Datenschutz · Cookies",
 "wa_cta":"WhatsApp",
},
"fr": {
 "lang_name":"Français","nav":{"carta":"Carte","senyoret":"Riz du Senyoret","historia":"Histoire","galeria":"Galerie","visitenos":"Venir","reservar":"Réserver"},
 "meta_home":("Restaurante Baydal | Poisson frais & paella au port de Calpe, depuis 1941",
   "Restaurant de poissons et de riz sur le port de pêche de Calpe depuis 1941 — la maison où est né l'arròs del senyoret. Poisson de la criée. Réservation : +34 965 831 111."),
 "hero_h1":"Riz marins & poisson frais au port de Calpe",
 "hero_sub":"La maison où est né l'arròs del senyoret. Face à la criée, sous le Peñón de Ifach, depuis juillet 1941.",
 "hero_cta1":"Réserver une table","hero_cta2":"Voir la carte",
 "since":"Depuis 1941",
 "home_b1_t":"Le riz né ici","home_b1_p":"L'arròs del senyoret — riz marin dont tous les fruits de mer sont décortiqués pour vous — est sorti pour la première fois de cette cuisine. C'est aujourd'hui le plat officiel de Calpe. Nous le préparons comme au premier jour : fumet de poissons de roche, salmorreta et fruits de mer de la baie.","home_b1_cta":"Lire l'histoire",
 "home_b2_t":"De la criée à la table","home_b2_p":"La criée de Calpe est à deux pas de notre porte. Chaque après-midi à 17 h, la vente aux enchères décide de ce qui se frit et se mijote ici le soir : merlu, rougets, crevettes de Calpe. Ce que la mer donne ce jour-là.","home_b2_cta":"Voir la carte",
 "home_b3_t":"Trois générations sur le port","home_b3_p":"Salvador et María Baydal ont bâti un bar sur un rocher du port en 1941. La troisième génération tient la même maison, le même métier.","home_b3_cta":"Notre histoire",
 "home_platos_t":"Les classiques de la maison","home_press_t":"Ils en parlent",
 "press_quote":"« C'est au Restaurante Baydal de Calpe qu'a été inventé le fameux arròs del senyoret. »","press_src":"Costa Nachrichten (presse de la Costa Blanca)",
 "home_visit_t":"Sur le port",
 "hours_t":"Horaires","hours":"10 h – 16 h & 19 h – 23 h · Fermé le lundi (sauf en été)",
 "addr_t":"Adresse","map_cta":"Itinéraire",
 "meta_carta":("Carte 2026 | Restaurante Baydal — paella & fruits de mer à Calpe","Carte complète avec prix : paellas et riz, poisson frais de la criée de Calpe, fruits de mer, viandes et menu Baydal à 30 €. Restaurant sur le port de Calpe."),
 "carta_h1":"La carte","carta_sub":"Produits de la criée de Calpe, riz préparés minute. Prix TTC. Allergies ou intolérances ? Dites-le-nous : pain sans gluten disponible, et nous vous conseillons plat par plat.",
 "sec_entrantes":"Entrées & raciones","sec_mariscos":"Fruits de mer de la baie","sec_arroces":"Riz","sec_pescados":"Poissons de la criée","sec_carnes":"Viandes","sec_ninos":"Pour les enfants","sec_postres":"Desserts maison",
 "arroces_note":"Minimum 2 personnes · Un seul type de riz par table · 25–35 min : chaque riz est préparé minute",
 "carnes_note":"Les viandes peuvent être servies sauce champignons, poivre ou roquefort",
 "racion_note":"petite portion / normale",
 "postres_list":"Flan maison · Glace au turrón et Pedro Ximénez · Gâteaux maison · Sorbet citron au cava · Fruits frais",
 "menu_baydal_t":"Menu Baydal — 30 € par personne","menu_baydal_note":"TVA incluse · Boissons non comprises",
 "menu_baydal":[("À partager","Pain & allioli · Crevettes blanches de Calpe cuites · Friture de poissons Baydal"),("Plat au choix","Arròs del senyoret (min. 2 pers.) · Espadon frais grillé · Filet mignon de porc sauce champignons"),("Dessert au choix","Gâteaux maison · Fruits · Sorbet citron au cava · Glace au turrón et Pedro Ximénez")],
 "desayunos_t":"Petit-déjeuner","desayunos_p":"Le matin : tostadas (tomate, jambon serrano, avocat, fromage…) dès 2 €, croissants, churros au chocolat chaud, sandwichs baguette et jus d'orange pressé. Pain sans gluten disponible.",
 "meta_senyoret":("Riz du senyoret : l'histoire du riz né au Baydal de Calpe","Ce qu'est l'arròs del senyoret, où il est né et pourquoi c'est le plat officiel de Calpe — raconté par la maison qui a préparé le premier : le Restaurante Baydal, sur le port depuis 1941."),
 "seny_h1":"Arròs del senyoret : le riz né dans cette maison",
 "seny_body":[
   "L'arròs del senyoret est né au Baydal. L'histoire se raconte en fin de repas : un habitué valencien demandait toujours son riz aux fruits de mer entièrement décortiqué, pour ne pas se salir les doigts. En cuisine, on l'avait surnommé affectueusement « el senyoret » — le petit monsieur.",
   "Au début, le plat ne figurait même pas à la carte : décortiquer tous ces fruits de mer représentait un travail énorme. Mais il se vantait de « son riz » et envoyait ses amis le goûter, jusqu'à ce que la maison cède. Ce caprice est devenu le riz servi dans la moitié de la province : un riz marin aux fruits de mer nettoyés, monté sur un fumet de poissons de roche et notre salmorreta.",
   "Et nous ne sommes pas seuls à le dire : la télévision publique valencienne À Punt, les journaux Las Provincias et Levante-EMV et la Wikipédia catalane désignent le Baydal comme la maison où il fut créé. Depuis le milieu des années quatre-vingt-dix, l'arròs del senyoret est officiellement le plat typique de Calpe.",
   "D'autres légendes circulent — le peintre Sorolla à Valence, un dandy barcelonais et son riz Parellada, en réalité un autre plat — mais aucune n'a de cuisine, de date ni de témoins avec nom et prénom. La nôtre, si : la même que toujours, au bord du port de Calpe, depuis juillet 1941."],
 "seny_faq_t":"Questions fréquentes",
 "seny_faq":[
   ("Qu'est-ce que l'arròs del senyoret ?","Un riz marin sec, cuit à la paella, dont poissons et fruits de mer sont entièrement décortiqués et nettoyés : tout se mange à la fourchette, sans se salir les doigts. La base : fumet de poissons de roche, salmorreta alicantine et fruits de mer de la baie."),
   ("Quelle différence avec la paella ou l'arroz a banda ?","Contrairement à la paella de fruits de mer, tout est ici décortiqué et incorporé au riz. Contrairement à l'arroz a banda traditionnel — cuit « à part » du poisson du bouillon —, le senyoret porte les fruits de mer nettoyés dedans."),
   ("Pourquoi « del senyoret » ?","Du surnom donné en cuisine au client qui le commandait : un « petit monsieur » valencien qui ne voulait pas se salir les doigts. Le nom est resté."),
   ("Où goûter l'original ?","Au Restaurante Baydal, Avinguda del Port 10, à côté de la criée du port de Calpe. Réservation conseillée : chaque riz est préparé minute (25–35 min).")],
 "seny_cta":"Réservez et goûtez-le là où il est né",
 "meta_historia":("Depuis 1941 sur le port de Calpe | L'histoire du Restaurante Baydal","Trois générations à côté de la criée de Calpe : de la baraque sur « la roqueta » (1941) au restaurant d'aujourd'hui. L'histoire de la famille Baydal et de l'arròs del senyoret."),
 "hist_h1":"Quatre-vingt-cinq ans face au Peñón",
 "hist_intro":"Le Baydal est le plus ancien restaurant du port de Calpe. Voici l'histoire courte d'une famille qui nourrit les gens à côté de la criée depuis trois générations.",
 "hist_timeline":[
   ("1941","La baraque sur le rocher","En juillet 1941, le port de pêche à peine construit, Salvador et María Baydal ouvrent un petit bar sur un rocher émergeant de la mer — « la roqueta » — avec trois mille pesetas et un permis. Quarante mètres carrés face aux quais."),
   ("1957","Démolition et nouvelle maison","Le local d'origine est démoli ; la famille construit le bar-restaurant à son emplacement actuel, au bord de l'eau."),
   ("1962","La concession définitive","La concession administrative définitive arrive enfin — « notre grande préoccupation », se souvenait Jaime Baydal."),
   ("Années 70–80","Naissance du senyoret","Aux fourneaux de la deuxième génération, un client valencien surnommé « el senyoret » demande son riz aux fruits de mer décortiqués. Le caprice devient plat ; le plat entre dans l'histoire."),
   ("Années 90","Plat typique de Calpe","La mairie de Calpe déclare l'arròs del senyoret plat typique de la commune."),
   ("2016","Un cachet postal à notre nom","La poste espagnole dédie un cachet commémoratif aux 75 ans de la maison."),
   ("2021","80e anniversaire","Quatre-vingts ans après la roqueta, la presse locale fête avec nous : « l'hôtellerie, nous l'avons dans le sang »."),
   ("Aujourd'hui","Troisième génération","José Baydal mène la troisième génération. En 2025, nous avons dit adieu à Jaime Baydal Crespo (1935–2025), âme de la deuxième. La salle sent toujours, comme l'a écrit la presse, « le riz du senyoret, le sel et la mémoire ».")],
 "hist_press_t":"Ils l'ont raconté",
 "meta_galeria":("Galerie | Restaurante Baydal — le port de Calpe en images","Photos du Restaurante Baydal : riz, poulpe grillé, poisson de la criée, la terrasse du port et la maison depuis 1941."),
 "gal_h1":"La maison, le port et ce qui sort de la cuisine",
 "meta_reservas":("Réserver une table à Calpe | Restaurante Baydal, port de Calpe","Réservez votre table au Restaurante Baydal : par téléphone (+34 965 831 111), WhatsApp ou formulaire. Riz préparés minute sur le port de Calpe."),
 "res_h1":"Réserver une table",
 "res_p":"Choisissez le jour, l'heure et le nombre de convives : confirmation immédiate par WhatsApp. Vous pouvez aussi nous appeler au <a href=\"tel:%TEL%\">+34 965 831 111</a>.",
 "res_f":{"nombre":"Votre nom","fecha":"Date","hora":"Heure","pax":"Convives","enviar":"Réserver par WhatsApp","msg":"Bonjour ! Je souhaite réserver une table le %F à %H pour %P personnes. Je m'appelle %N.","nota":"Chaque riz est préparé minute (25–35 minutes). Groupe ou grande tablée ? Prévenez-nous, nous préparons tout."},
 "meta_visit":("Venir | Restaurante Baydal, Avinguda del Port 10, Calpe","Restaurante Baydal sur le port de Calpe, face à la criée : adresse, horaires, parking, téléphone et plan. À 20 minutes à pied du Peñón de Ifach."),
 "visit_h1":"Sur le port, face à la criée",
 "visit_p":"Nous sommes sur l'Avinguda del Port, au port de pêche de Calpe — la criée en face, le Peñón de Ifach au-dessus. Parking gratuit sur l'esplanade du port. Après le repas, la promenade jusqu'au Peñón vient toute seule.",
 "visit_parking":"Parking : esplanade du port (gratuit)","visit_lonja":"La criée et ses enchères : chaque jour à 17 h, à 50 m",
 "footer_legal":"Mentions légales · Confidentialité · Cookies",
 "wa_cta":"WhatsApp",
},
}

# --- carta: (es, en, de, fr, precio_pequeña, precio_normal) — precios mayo 2026 ---
MENU = {
"entrantes": [
 ("Ensalada valenciana","Valencian salad","Valencianischer Salat","Salade valencienne",None,"13,00","lechuga, tomate, cebolla, aceitunas, atún, huevo y boquerón|lettuce, tomato, onion, olives, tuna, egg, anchovy|Salat, Tomate, Zwiebel, Oliven, Thunfisch, Ei, Sardelle|laitue, tomate, oignon, olives, thon, œuf, anchois"),
 ("Croquetas de jamón (unidad)","Ham croquette (each)","Schinkenkrokette (Stück)","Croquette de jambon (l'unité)",None,"2,10",None),
 ("Croquetas de pulpo (unidad)","Octopus croquette (each)","Oktopus-Krokette (Stück)","Croquette de poulpe (l'unité)",None,"3,15",None),
 ("Croquetas de gamba (unidad)","Prawn croquette (each)","Garnelen-Krokette (Stück)","Croquette de crevette (l'unité)",None,"3,15",None),
 ("Zamburiñas (unidad)","Grilled queen scallop (each)","Jakobsmuschel (Stück)","Pétoncle grillé (l'unité)",None,"3,75",None),
 ("Boquerones en vinagre","Anchovies in vinegar","Sardellen in Essig","Anchois au vinaigre","11,50","16,00",None),
 ("Boquerones fritos","Fried anchovies","Gebratene Sardellen","Anchois frits","12,00","17,00",None),
 ("Mejillones al vapor","Steamed mussels","Miesmuscheln, gedämpft","Moules vapeur","11,00","13,50",None),
 ("Hueva de sepia a la plancha","Grilled cuttlefish roe","Tintenfischrogen, gegrillt","Œufs de seiche grillés","12,00","17,00",None),
 ("Tollos (musola frita)","Fried dogfish (tollos)","Tollos (frittierter kleiner Hai)","Tollos (petit requin frit)","12,00","17,00",None),
 ("Calamarcitos a la andaluza","Baby squid, Andalusian style","Kleine Tintenfische, andalusisch","Calamars à l'andalouse","12,00","17,00",None),
 ("Sepia a la plancha","Grilled cuttlefish","Sepia, gegrillt","Seiche grillée","9,50","17,50",None),
 ("Tellinas (coquinas)","Wedge clams (tellinas)","Tellmuscheln","Tellines","—","19,00",None),
 ("Chopitos (puntillas)","Fried baby cuttlefish","Baby-Tintenfische, frittiert","Chopitos (petits calmars frits)","15,75","21,00",None),
 ("Pulpo guisado al estilo de Calp","Octopus stew, Calp style","Geschmorter Oktopus nach Calper Art","Ragoût de poulpe à la calpine","14,00","19,00",None),
 ("Pulpo a la plancha Baydal","Grilled octopus “Baydal”","Gegrillter Oktopus „Baydal“","Poulpe grillé « Baydal »","16,00","21,50",None),
 ("Calamar a la plancha","Grilled squid","Kalmar, gegrillt","Calmar grillé",None,"19,50",None),
 ("Fritura de pescaditos Baydal","Small fried fish “Baydal”","Kleine Fische, gemischt frittiert","Petits poissons frits « Baydal »","14,50","19,50",None),
 ("Tosta de foie fresco a la plancha","Toast with grilled fresh foie & fig jam","Toast mit gegrillter Foie & Feigenmarmelade","Pain grillé au foie frais & confiture de figues",None,"11,50","con mermelada de higo|with fig jam|mit Feigenmarmelade|à la confiture de figues"),
],
"mariscos": [
 ("Gamba blanca hervida (250 g)","Boiled white prawns (250 g)","Weiße Garnelen, gekocht (250 g)","Crevettes blanches cuites (250 g)",None,"27,50",None),
 ("Gamba roja hervida (250 g)","Boiled red prawns (250 g)","Rote Garnelen, gekocht (250 g)","Crevettes rouges cuites (250 g)",None,"45,00",None),
 ("Cigalas hervidas (300 g)","Boiled langoustines (300 g)","Kaisergranat, gekocht (300 g)","Langoustines cuites (300 g)",None,"43,50",None),
 ("Gamba roja a la plancha (250 g)","Grilled red prawns (250 g)","Rote Garnelen, gegrillt (250 g)","Crevettes rouges grillées (250 g)",None,"45,00",None),
 ("Cigalas a la plancha (350 g)","Grilled langoustines (350 g)","Kaisergranat, gegrillt (350 g)","Langoustines grillées (350 g)",None,"49,00",None),
],
"arroces": [
 ("Paella vegetariana","Vegetarian paella","Vegetarische Paella","Paella végétarienne",None,"13,95",None),
 ("Paella de carne y verdura","Meat & vegetable paella","Fleisch-Gemüse-Paella","Paella viande et légumes",None,"17,50",None),
 ("Paella mixta","Mixed paella (meat & seafood)","Gemischte Paella (Fleisch & Meeresfrüchte)","Paella mixte (viande & fruits de mer)",None,"19,00",None),
 ("Arroz de bacalao y coliflor","Cod & cauliflower rice","Reis mit Kabeljau und Blumenkohl","Riz à la morue et au chou-fleur",None,"17,50",None),
 ("Paella de marisco","Seafood paella","Meeresfrüchte-Paella","Paella aux fruits de mer",None,"19,00",None),
 ("Arròs del senyoret","Arròs del senyoret — the original","Arròs del Senyoret — das Original","Arròs del senyoret — l'original",None,"18,50","el original: nació en esta casa|seafood peeled & cleaned; born in this house|Fang komplett geschält; hier geboren|fruits de mer décortiqués ; né dans cette maison"),
 ("Fideuà del senyoret","Fideuà del senyoret","Fideuà del Senyoret","Fideuà del senyoret",None,"18,50","fideos finos, marisco pelado|thin noodles, peeled seafood|feine Nudeln, geschälter Fang|vermicelles, fruits de mer décortiqués"),
 ("Arroz negro con calamar","Black rice with squid","Schwarzer Reis mit Kalmar","Riz noir au calmar",None,"18,50",None),
 ("Arroz meloso de pulpo","Creamy octopus rice","Cremiger Oktopus-Reis (meloso)","Riz moelleux au poulpe",None,"20,50",None),
 ("Arroz meloso con bogavante","Creamy lobster rice","Cremiger Hummer-Reis (meloso)","Riz moelleux au homard",None,"24,00",None),
 ("Arroz caldoso con bogavante","Soupy lobster rice","Hummer-Reis in Brühe (caldoso)","Riz en bouillon au homard",None,"24,00",None),
 ("Paella de secreto ibérico y setas","Iberian pork & wild mushroom paella","Paella mit iberischem Secreto und Pilzen","Paella au secreto ibérique et champignons",None,"25,00",None),
],
"pescados": [
 ("Sardinas a la plancha","Grilled sardines","Gegrillte Sardinen","Sardines grillées",None,"15,00",None),
 ("Salmón a la plancha","Grilled salmon","Gegrillter Lachs","Saumon grillé",None,"19,50",None),
 ("Lubina a la plancha","Grilled sea bass","Gegrillter Wolfsbarsch","Loup de mer grillé",None,"21,00",None),
 ("Salmonetes fritos","Fried red mullet","Rotbarben, gebraten","Rougets frits",None,"19,50",None),
 ("Pescadilla","Whiting (young hake)","Junger Seehecht","Petit merlu",None,"19,50",None),
 ("Emperador a la plancha","Grilled swordfish","Schwertfisch, gegrillt","Espadon grillé",None,"18,50",None),
 ("Pescado de Calp frito","Fried fish of Calp","Fischplatte „Calp“, frittiert","Poissons de Calp frits",None,"23,00","pescadilla, salmonetes y pelayas|whiting, red mullet & small sole|Seehecht, Rotbarben & kleine Seezungen|merlu, rougets & petites soles"),
 ("Rape de la casa","Monkfish “Baydal”","Seeteufel „Baydal“","Lotte façon Baydal",None,"24,50",None),
 ("Lenguado (300 g)","Sole meunière (300 g)","Seezunge Müllerin (300 g)","Sole meunière (300 g)",None,"24,50",None),
],
"carnes": [
 ("Solomillo de cerdo","Pork tenderloin","Schweinelende","Filet mignon de porc",None,"19,50",None),
 ("Secreto ibérico de bellota","Acorn-fed Iberian secreto","Iberisches Secreto (Eichelmast)","Secreto ibérique de bellota",None,"23,50",None),
 ("Entrecot de ternera","Veal entrecôte","Entrecôte vom Rind","Entrecôte de veau",None,"22,50",None),
 ("Solomillo de ternera","Veal tenderloin","Kalbsfilet","Filet de veau",None,"25,00",None),
],
"ninos": [
 ("Nuggets de pollo con patatas","Chicken nuggets & chips","Chicken Nuggets mit Pommes","Nuggets de poulet et frites",None,"9,95",None),
 ("Espagueti a la boloñesa","Spaghetti Bolognese","Spaghetti Bolognese","Spaghetti bolognaise",None,"10,50",None),
 ("Pechuga de pollo con patatas","Chicken breast & chips","Hühnerbrust mit Pommes","Poitrine de poulet et frites",None,"13,50",None),
],
}
LI = {"es":0,"en":1,"de":2,"fr":3}

GALLERY = [
 ("arros-del-senyoret","Arròs del senyoret en paellera, Restaurante Baydal Calp","Arròs del senyoret in its pan","Arròs del Senyoret in der Pfanne","Arròs del senyoret à la poêle"),
 ("pulpo-brasa-plato","Pulpo a la brasa sobre parmentier, estilo Baydal","Grilled octopus on potato parmentier","Gegrillter Oktopus auf Kartoffelcreme","Poulpe grillé sur parmentier"),
 ("pulpo-brasa-detalle","Detalle del pulpo a la brasa con pimentón","Grilled octopus close-up with paprika","Oktopus-Detail mit Paprika","Détail du poulpe grillé au paprika"),
 ("gamba-hervida","Gamba de Calp hervida","Boiled Calpe prawns","Gekochte Calpe-Garnelen","Crevettes de Calpe cuites"),
 ("mariscada-ifach","Mariscada Ifach: marisco de la bahía","Ifach shellfish platter","Meeresfrüchteplatte „Ifach“","Plateau de fruits de mer Ifach"),
 ("fritura-baydal","Fritura de pescaditos Baydal","Baydal small fried fish","Frittierte Fischplatte Baydal","Petite friture Baydal"),
 ("peix-de-calp","Pescado de Calp frito, de la lonja","Fried fish of Calp, from the market","Fischplatte „Calp“ von der Lonja","Poissons de Calp frits, de la criée"),
 ("rape-de-la-casa","Rape de la casa","Monkfish Baydal style","Seeteufel nach Art des Hauses","Lotte façon Baydal"),
 ("tellinas","Tellinas de la bahía al vapor","Steamed wedge clams","Gedämpfte Tellmuscheln","Tellines vapeur"),
 ("croquetas-pase","Croquetas caseras en el pase de cocina","Homemade croquettes at the kitchen pass","Hausgemachte Kroketten am Küchenpass","Croquettes maison au passe"),
 ("flan-casero","Flan de huevo casero con helado","Homemade crème caramel with ice cream","Hausgemachter Flan mit Eis","Flan maison avec glace"),
 ("helado-turron","Helado de turrón con Pedro Ximénez","Turrón ice cream with Pedro Ximénez","Turrón-Eis mit Pedro Ximénez","Glace au turrón et Pedro Ximénez"),
 ("fachada-baydal","Fachada del Restaurante Baydal en el puerto de Calp","Baydal façade on Calpe harbour","Baydal-Fassade am Hafen von Calpe","Façade du Baydal sur le port"),
 ("calpe-penon-panoramica","Calp y el Peñón de Ifach desde el aire","Calpe and the Peñón de Ifach from above","Calpe und der Peñón de Ifach von oben","Calpe et le Peñón de Ifach vus du ciel"),
 ("historia-bar-baydal","El Bar Baydal en los años 60, con el Peñón detrás","Bar Baydal in the 1960s, the Peñón behind","Die Bar Baydal in den 60ern, dahinter der Peñón","Le Bar Baydal dans les années 60, le Peñón derrière"),
]

PRESS = [
 ("À Punt (TV pública valenciana)","«José Baydal és la tercera generació de cuiners i al seu restaurant es va fer el primer arròs del senyoret.»","https://www.apuntmedia.es/"),
 ("La Marina · elDiario.es","«El local sigue oliendo a arroz del senyoret, a sal, a memoria.»","https://lamarina.eldiario.es/2025/05/14/memoria-de-calp-jaime-baydal-crespo-1935-2025-restaurante-baydal-del-puerto-la-roca-y-la-excelencia/"),
 ("Costa Nachrichten","«Im Restaurant Baydal in Calpe wurde das berühmte Reis-Gericht Arroz del Senyoret erfunden.»","https://www.costanachrichten.com/spanien/land-leute/calpe-altstadt-restaurants-geheimtipps-tapas-reis-fisch-spezialitaet-arroz-del-senyoret-michelin-93245682.html"),
 ("Calp Digital","«El restaurante, conocido por su Arròs del Senyoret, es un ejemplo de tradición y renovación.»","https://calpdigital.es/art/6162/el-restaurante-baydal-de-calpe-celebra-su-80-aniversario"),
]

VIDEOS = [
 ("xP_2liUsfag","yt","José Baydal en el Blogtrip Costa Blanca (2012)"),
 ("BTWgkO1ALBs","yt","Restaurante Baydal: donde nació el arròs del senyoret"),
 ("LwiiYi51vBo","yt","El Baydal, arroces y pescados en el puerto desde 1941"),
 ("https://www.facebook.com/turismomarinerocalpe/videos/2116786321697543/","fb","Turismo Marinero Calpe: el arroz del senyoret del Baydal"),
]

# claims verificados + sección "pescado que no probarás en otro sitio" + vídeos
EXTRA = {
"es": {
 "claims":["La casa más antigua del puerto de Calp","Aquí nació el arròs del senyoret","Kilómetro cero: la lonja, a 50 metros"],
 "rare_t":"«Quiero probar pescado que no encontraría en otro sitio»",
 "rare_p":"Nos lo dicen cada semana. Esta es nuestra respuesta: especies de la bahía que casi nunca salen de aquí, compradas en la subasta de la lonja de Calp —a cincuenta metros de la cocina— y uno de los primeros chiringuitos de la Costa Blanca para prepararlas como se ha hecho siempre.",
 "rare_items":[
   ("Tollos","Musola en adobo, frita: la tapa calpina de toda la vida, casi imposible de encontrar fuera de aquí."),
   ("Tellinas de la bahía","Coquinas finas al vapor, de las pocas lonjas donde aún entran."),
   ("Huevas de sepia a la plancha","Del despiece del día: si no hay sepia en la subasta, no hay huevas."),
   ("Peix de Calp","Pescadilla, salmonetes y pelayas de la subasta de las 17:00, fritos al momento."),
   ("Gamba blanca de Calp","Hervida y fría, dulce como solo sale de esta bahía."),
   ("Chopitos (puntillas)","Calamarcitos mínimos, fritos enteros y crujientes.")],
 "rare_cta":"Ver la carta completa",
 "videos_t":"El Baydal, en vídeo","videos_cta":"Ver el vídeo",
 "aniv_t":"Ochenta y cinco años en la misma roca",
 "aniv_p":"En julio de 1941, Salvador y María Baydal abrieron un bar de cuarenta metros sobre una roca del puerto, con tres mil pesetas y un permiso. Ochenta y cinco julios después, la tercera generación sigue sirviendo el pescado de la misma lonja, mirando al mismo Peñón.",
 "aniv_c1":"Años 60 · El Bar Baydal bajo el Peñón","aniv_c2":"Hoy · La misma casa, Avinguda del Port 10","aniv_cta":"Nuestra historia",
 "lonja_meta":("La lonja de Calp: ver la subasta y cenar su pescado | Restaurante Baydal","Plan perfecto en el puerto de Calp: a las 17:00 la subasta de pescado en la lonja, a las 19:00 ese mismo pescado en tu mesa, a 50 metros. Horarios, cómo verla y reserva."),
 "lonja_t":"De la subasta a tu mesa","lonja_kick":"El plan del puerto",
 "lonja_intro":"La lonja de Calp está a cincuenta metros de nuestra cocina. Cada tarde de diario, las barcas descargan y el pescado se subasta delante de quien quiera verlo. Nosotros llevamos 85 años comprando ahí. Este es el plan que recomendamos a quien nos visita:",
 "lonja_steps":[("17:00","La subasta","Las barcas entran al puerto y el pescado sale en cajas a la cinta de subasta. Se ve desde la pasarela-mirador de la propia lonja (lunes a viernes; dura unas dos horas). La Oficina de Turismo del puerto, en el mismo edificio, informa de las visitas."),("18:30","El paseo","Salida por el muelle: las redes, las barcas amarradas, el Peñón encendiéndose con la última luz. El paseo del puerto entero son veinte minutos sin prisa."),("19:00","La mesa","Sentarse en el Baydal y pedir lo que acabas de ver subastar: pescadilla, salmonetes, gamba de Calp. El arroz se hace al momento (25–35 min): pide un entrante y deja que el puerto haga el resto.")],
 "lonja_nota":"La subasta es de lunes a viernes. Sábados y domingos el plan sigue valiendo: paseo, puerto y mesa.",
 "lonja_wa":"Hola, quisiera mesa para %P a las 19:00, después de la subasta de la lonja.",
 "lonja_cta":"Reservar mesa a las 19:00","lonja_link":"El plan de la lonja",
 "fuentes_t":"Lo dicen las fuentes",
},
"en": {
 "claims":["The oldest house on Calpe harbour","Birthplace of arròs del senyoret","Zero-kilometre: the fish market, 50 m away"],
 "rare_t":"“I want to try fish I couldn't try anywhere else”",
 "rare_p":"We hear it every week. This is our answer: bay species that hardly ever leave this coast, bought at Calpe's fish auction — fifty metres from our kitchen — and one of the Costa Blanca's first beach bars to cook them the way it's always been done.",
 "rare_items":[
   ("Tollos","Marinated, fried school shark: Calpe's oldest tapa, near impossible to find elsewhere."),
   ("Bay wedge clams (tellinas)","Delicate steamed clams, from one of the few markets that still land them."),
   ("Grilled cuttlefish roe","From the day's catch: no cuttlefish at auction, no roe."),
   ("Peix de Calp","Whiting, red mullet and small sole from the 5pm auction, fried to order."),
   ("White Calpe prawns","Boiled and served cold — sweet as only this bay produces."),
   ("Chopitos","Tiny baby squid, fried whole and crisp.")],
 "rare_cta":"See the full menu",
 "videos_t":"Baydal on film","videos_cta":"Watch the video",
 "aniv_t":"Eighty-five years on the same rock",
 "aniv_p":"In July 1941, Salvador and María Baydal opened a forty-square-metre bar on a rock by the harbour, with three thousand pesetas and a permit. Eighty-five Julys later, the third generation still serves fish from the same market, looking up at the same Peñón.",
 "aniv_c1":"1960s · Bar Baydal beneath the Peñón","aniv_c2":"Today · The same house, Avinguda del Port 10","aniv_cta":"Our story",
 "lonja_meta":("Calpe fish auction: watch it, then eat the catch | Restaurante Baydal","The perfect harbour plan in Calpe: watch the 5pm fish auction at the lonja, then eat that same fish 50 metres away at 7pm. Times, how to watch, and booking."),
 "lonja_t":"From the auction to your table","lonja_kick":"The harbour plan",
 "lonja_intro":"Calpe's fish market is fifty metres from our kitchen. Every weekday afternoon the boats unload and the fish is auctioned in front of anyone who cares to watch. We've been buying there for 85 years. This is the plan we recommend to our visitors:",
 "lonja_steps":[("5:00 pm","The auction","The boats come into port and the fish goes out in crates onto the auction belt. Watch it from the public walkway inside the market itself (Monday to Friday; it lasts about two hours). The harbour Tourist Office, in the same building, has visiting details."),("6:30 pm","The stroll","Out along the quay: the nets, the moored boats, the Peñón catching the last light. The whole harbour walk is twenty unhurried minutes."),("7:00 pm","The table","Sit down at Baydal and order what you just watched being auctioned: whiting, red mullet, Calpe prawns. Rice is made to order (25–35 min): start with a sharing plate and let the harbour do the rest.")],
 "lonja_nota":"The auction runs Monday to Friday. On weekends the plan still works: stroll, harbour, table.",
 "lonja_wa":"Hello! A table for %P at 7pm please, after the fish auction.",
 "lonja_cta":"Book a table for 7pm","lonja_link":"The fish-auction plan",
 "fuentes_t":"Straight from the sources",
},
"de": {
 "claims":["Das älteste Haus am Hafen von Calpe","Geburtsort des Arròs del Senyoret","Null Kilometer: die Fischauktion, 50 m entfernt"],
 "rare_t":"„Ich möchte Fisch probieren, den ich sonst nirgends bekomme“",
 "rare_p":"Das hören wir jede Woche. Unsere Antwort: Arten aus der Bucht, die diese Küste kaum je verlassen — ersteigert in der Lonja von Calpe, fünfzig Meter von unserer Küche, zubereitet in einem der ersten Strandlokale der Costa Blanca, so wie eh und je.",
 "rare_items":[
   ("Tollos","Marinierter, frittierter kleiner Hai: die älteste Tapa Calpes, außerhalb kaum zu finden."),
   ("Tellmuscheln aus der Bucht","Zarte, gedämpfte Muscheln — nur wenige Auktionen führen sie noch."),
   ("Gegrillter Tintenfischrogen","Vom Fang des Tages: keine Sepia in der Auktion, kein Rogen."),
   ("Peix de Calp","Seehecht, Rotbarben und kleine Seezungen aus der 17-Uhr-Auktion, frisch frittiert."),
   ("Weiße Calpe-Garnelen","Gekocht und kalt serviert — süß, wie nur diese Bucht sie hergibt."),
   ("Chopitos","Winzige Tintenfischchen, im Ganzen knusprig frittiert.")],
 "rare_cta":"Zur kompletten Karte",
 "videos_t":"Das Baydal im Video","videos_cta":"Video ansehen",
 "aniv_t":"Fünfundachtzig Jahre auf demselben Felsen",
 "aniv_p":"Im Juli 1941 eröffneten Salvador und María Baydal mit dreitausend Peseten und einer Genehmigung eine vierzig Quadratmeter kleine Bar auf einem Felsen am Hafen. Fünfundachtzig Sommer später serviert die dritte Generation noch immer den Fisch derselben Auktion, mit Blick auf denselben Peñón.",
 "aniv_c1":"1960er · Die Bar Baydal unter dem Peñón","aniv_c2":"Heute · Dasselbe Haus, Avinguda del Port 10","aniv_cta":"Unsere Geschichte",
 "lonja_meta":("Fischauktion in Calpe: zusehen und den Fang essen | Restaurante Baydal","Der perfekte Hafenplan in Calpe: um 17 Uhr die Fischauktion in der Lonja erleben, um 19 Uhr denselben Fisch 50 Meter weiter auf dem Teller. Zeiten, Zugang und Reservierung."),
 "lonja_t":"Von der Auktion auf Ihren Tisch","lonja_kick":"Der Hafenplan",
 "lonja_intro":"Die Fischauktionshalle von Calpe liegt fünfzig Meter von unserer Küche entfernt. Jeden Werktagnachmittag löschen die Boote ihre Ladung, und der Fisch wird vor aller Augen versteigert. Wir kaufen dort seit 85 Jahren. Das ist der Plan, den wir unseren Gästen empfehlen:",
 "lonja_steps":[("17:00","Die Auktion","Die Boote laufen ein, der Fisch geht in Kisten aufs Auktionsband. Zuschauen kann man vom öffentlichen Steg im Inneren der Lonja (Montag bis Freitag; Dauer etwa zwei Stunden). Das Touristenbüro am Hafen, im selben Gebäude, informiert über Besuche."),("18:30","Der Spaziergang","Über die Mole: die Netze, die vertäuten Boote, der Peñón im letzten Licht. Die ganze Hafenrunde dauert gemütliche zwanzig Minuten."),("19:00","Der Tisch","Im Baydal Platz nehmen und bestellen, was Sie eben ersteigern sahen: Seehecht, Rotbarben, Calpe-Garnelen. Der Reis wird frisch zubereitet (25–35 Min.): starten Sie mit einer Vorspeise und lassen Sie den Hafen den Rest erledigen.")],
 "lonja_nota":"Die Auktion findet Montag bis Freitag statt. Am Wochenende gilt der Plan trotzdem: Spaziergang, Hafen, Tisch.",
 "lonja_wa":"Hallo! Einen Tisch für %P um 19 Uhr bitte, nach der Fischauktion.",
 "lonja_cta":"Tisch für 19 Uhr reservieren","lonja_link":"Der Auktionsplan",
 "fuentes_t":"Das sagen die Quellen",
},
"fr": {
 "claims":["La plus ancienne maison du port de Calpe","Ici est né l'arròs del senyoret","Kilomètre zéro : la criée, à 50 mètres"],
 "rare_t":"« Je veux goûter un poisson que je ne trouverais nulle part ailleurs »",
 "rare_p":"On nous le dit chaque semaine. Voici notre réponse : des espèces de la baie qui ne quittent presque jamais cette côte, achetées à la criée de Calpe — à cinquante mètres de notre cuisine — et l'un des premiers chiringuitos de la Costa Blanca pour les préparer comme on l'a toujours fait.",
 "rare_items":[
   ("Tollos","Petit requin mariné et frit : la plus ancienne tapa de Calpe, introuvable ailleurs."),
   ("Tellines de la baie","Coquillages fins à la vapeur, de l'une des rares criées qui en débarquent encore."),
   ("Œufs de seiche grillés","De la pêche du jour : pas de seiche aux enchères, pas d'œufs."),
   ("Peix de Calp","Merlu, rougets et petites soles de la criée de 17 h, frits minute."),
   ("Crevettes blanches de Calpe","Cuites et servies froides — douces comme seule cette baie en donne."),
   ("Chopitos","Minuscules calmars, frits entiers, croustillants.")],
 "rare_cta":"Voir la carte complète",
 "videos_t":"Le Baydal en vidéo","videos_cta":"Voir la vidéo",
 "aniv_t":"Quatre-vingt-cinq ans sur le même rocher",
 "aniv_p":"En juillet 1941, Salvador et María Baydal ouvraient un bar de quarante mètres carrés sur un rocher du port, avec trois mille pesetas et un permis. Quatre-vingt-cinq étés plus tard, la troisième génération sert toujours le poisson de la même criée, sous le même Peñón.",
 "aniv_c1":"Années 60 · Le Bar Baydal sous le Peñón","aniv_c2":"Aujourd'hui · La même maison, Avinguda del Port 10","aniv_cta":"Notre histoire",
 "lonja_meta":("La criée de Calpe : voir les enchères puis manger la pêche | Restaurante Baydal","Le plan parfait au port de Calpe : à 17 h les enchères au poisson de la criée, à 19 h ce même poisson à votre table, à 50 mètres. Horaires, accès et réservation."),
 "lonja_t":"Des enchères à votre table","lonja_kick":"Le plan du port",
 "lonja_intro":"La criée de Calpe est à cinquante mètres de notre cuisine. Chaque après-midi de semaine, les bateaux déchargent et le poisson est vendu aux enchères sous les yeux de qui veut bien regarder. Nous y achetons depuis 85 ans. Voici le plan que nous recommandons à nos visiteurs :",
 "lonja_steps":[("17 h","Les enchères","Les bateaux entrent au port, le poisson part en caisses sur le tapis des enchères. On les suit depuis la passerelle publique à l'intérieur de la criée (du lundi au vendredi ; environ deux heures). L'Office de Tourisme du port, dans le même bâtiment, renseigne sur les visites."),("18 h 30","La promenade","Le long du quai : les filets, les bateaux amarrés, le Peñón dans la dernière lumière. Le tour du port se fait en vingt minutes tranquilles."),("19 h","La table","S'asseoir au Baydal et commander ce que vous venez de voir aux enchères : merlu, rougets, crevettes de Calpe. Le riz est préparé minute (25–35 min) : prenez une entrée et laissez le port faire le reste.")],
 "lonja_nota":"Les enchères ont lieu du lundi au vendredi. Le week-end, le plan reste valable : promenade, port, table.",
 "lonja_wa":"Bonjour ! Une table pour %P à 19 h, après les enchères de la criée.",
 "lonja_cta":"Réserver pour 19 h","lonja_link":"Le plan de la criée",
 "fuentes_t":"Les sources le disent",
},
}


def u(page, lang):
    return PATHS[page][lang]


def hreflangs(page):
    tags = "".join(f'<link rel="alternate" hreflang="{l}" href="{DOMAIN}{u(page,l)}">' for l in LANGS)
    return tags + f'<link rel="alternate" hreflang="x-default" href="{DOMAIN}{u(page,"es")}">'


def schema_restaurant(lang):
    d = {
      "@context":"https://schema.org","@type":"Restaurant","name":"Restaurante Baydal",
      "image":f"{DOMAIN}/assets/img/arros-del-senyoret.webp","logo":f"{DOMAIN}/assets/img/logo-baydal.webp","url":DOMAIN,
      "telephone":TEL,"priceRange":"€€","servesCuisine":["Paella","Seafood","Mediterranean","Spanish"],
      "foundingDate":"1941-07",
      "address":{"@type":"PostalAddress","streetAddress":ADDRESS,"addressLocality":"Calp","addressRegion":"Alicante","postalCode":"03710","addressCountry":"ES"},
      "geo":{"@type":"GeoCoordinates","latitude":GEO[0],"longitude":GEO[1]},
      "openingHoursSpecification":[
        {"@type":"OpeningHoursSpecification","dayOfWeek":["Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"],"opens":"10:00","closes":"16:00"},
        {"@type":"OpeningHoursSpecification","dayOfWeek":["Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"],"opens":"19:00","closes":"23:00"}],
      "acceptsReservations":f"{DOMAIN}{u('reservas',lang)}",
      "hasMenu":f"{DOMAIN}{u('carta',lang)}",
      "sameAs":["https://www.instagram.com/restaurantebaydal","https://www.facebook.com/rtebaydal",
                "https://www.tripadvisor.com/Restaurant_Review-g187526-d994340-Reviews-Restaurante_Baydal-Calpe_Costa_Blanca_Province_of_Alicante_Valencian_Community.html"],
    }
    return f'<script type="application/ld+json">{json.dumps(d, ensure_ascii=False)}</script>'


def schema_menu(lang):
    i = LI[lang]
    sections = []
    for key, items in MENU.items():
        mi = []
        for it in items:
            name = it[i]
            offer = {"@type":"Offer","price":it[5].replace(",","."),"priceCurrency":"EUR"}
            item = {"@type":"MenuItem","name":name,"offers":offer}
            if it[6]:
                item["description"] = it[6].split("|")[i]
            mi.append(item)
        sections.append({"@type":"MenuSection","name":T[lang]["sec_"+key],"hasMenuItem":mi})
    d = {"@context":"https://schema.org","@type":"Menu","name":T[lang]["carta_h1"],"inLanguage":lang,"hasMenuSection":sections}
    return f'<script type="application/ld+json">{json.dumps(d, ensure_ascii=False)}</script>'


def schema_faq(lang):
    d = {"@context":"https://schema.org","@type":"FAQPage","mainEntity":[
        {"@type":"Question","name":q,"acceptedAnswer":{"@type":"Answer","text":a}} for q,a in T[lang]["seny_faq"]]}
    return f'<script type="application/ld+json">{json.dumps(d, ensure_ascii=False)}</script>'


def layout(lang, page, title, desc, body, extra_head=""):
    t = T[lang]
    nav_items = "".join(
        f'<li><a href="{u(k,lang)}"{" class=\"on\"" if k==page else ""}>{t["nav"][n]}</a></li>'
        for k, n in [("carta","carta"),("senyoret","senyoret"),("historia","historia"),("galeria","galeria"),("visitenos","visitenos")])
    lang_sw = " · ".join(f'<a href="{u(page,l)}"{" aria-current=\"true\"" if l==lang else ""}>{l.upper()}</a>' for l in LANGS)
    return f"""<!DOCTYPE html>
<html lang="{lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<meta name="description" content="{desc}">
<link rel="canonical" href="{DOMAIN}{u(page,lang)}">
{hreflangs(page)}
<meta property="og:type" content="website">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
<meta property="og:image" content="{DOMAIN}/assets/img/arros-del-senyoret.webp">
<meta property="og:url" content="{DOMAIN}{u(page,lang)}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" type="image/png" sizes="48x48" href="/assets/img/favicon-48.png">
<link rel="apple-touch-icon" href="/assets/img/apple-touch-icon.png">
<link rel="stylesheet" href="/assets/css/style.css">
{schema_restaurant(lang)}
{extra_head}
</head>
<body>
<a class="skip" href="#main">≡</a>
<header class="hd">
  <div class="hd-in">
    <a class="brand" href="{u('home',lang)}"><img src="/assets/img/logo-baydal.webp" alt="Restaurante Baydal — {t['since']}" width="500" height="135"></a>
    <input type="checkbox" id="nav-t" class="nav-t"><label for="nav-t" class="nav-b" aria-label="Menu"><span></span><span></span><span></span></label>
    <nav class="nav"><ul>{nav_items}</ul><div class="nav-langs">{lang_sw}</div></nav>
    <a class="cta hd-cta" href="{u('reservas',lang)}">{t['nav']['reservar']}</a>
  </div>
</header>
<main id="main">
{body}
</main>
<footer class="ft">
  <div class="ft-in">
    <div>
      <img class="ft-logo" src="/assets/img/logo-baydal-vert.webp" alt="Restaurante Baydal — {t['since']}" width="172" height="200" loading="lazy">
      <p>{ADDRESS} · 03710 Calp (Alicante)</p>
      <p><a href="tel:{TEL}">{TEL_VISIBLE}</a> · <a href="https://wa.me/{WA}">{t['wa_cta']}</a> · <a href="mailto:info@baydal.es">info@baydal.es</a></p>
    </div>
    <div>
      <p class="ft-t">{t['hours_t']}</p>
      <p>{t['hours']}</p>
    </div>
    <div>
      <p class="ft-t">{t['lang_name']}</p>
      <p>{lang_sw}</p>
      <p class="ft-soc"><a href="https://www.instagram.com/restaurantebaydal" rel="noopener">Instagram</a> · <a href="https://www.facebook.com/rtebaydal" rel="noopener">Facebook</a></p>
    </div>
  </div>
  <p class="ft-legal">© Restaurante Baydal · {t['since']} · {t['footer_legal']}</p>
</footer>
<script src="/assets/js/main.js" defer></script>
</body>
</html>"""


def img(name, alt, w, h, lazy=True, cls=""):
    l = ' loading="lazy"' if lazy else ' fetchpriority="high"'
    c = f' class="{cls}"' if cls else ""
    return f'<img src="/assets/img/{name}.webp" alt="{alt}" width="{w}" height="{h}"{l}{c}>'


def page_home(lang):
    t = T[lang]
    x = EXTRA[lang]
    claims = "".join(f"<li>{c}</li>" for c in x["claims"])
    rare = "".join(f'<li><h3>{n}</h3><p>{d}</p></li>' for n, d in x["rare_items"])
    title, desc = t["meta_home"]
    dishes = [("pulpo-brasa-plato","Pulpo a la brasa Baydal"),("gamba-hervida","Gamba de Calp"),("fritura-baydal","Fritura Baydal"),("flan-casero","Flan casero")]
    dish_cards = "".join(f'<figure class="card">{img(n, a, 600, 600)}<figcaption>{a}</figcaption></figure>' for n, a in dishes)
    body = f"""
<section class="hero-full">
  {img('arros-del-senyoret', t['hero_h1'], 1300, 1300, lazy=False, cls='hero-bg')}
  <div class="hero-veil"></div>
  <div class="hero-inner">
    <p class="kick">{t['since']} · Calp</p>
    <h1>{t['hero_h1']}</h1>
    <p class="sub">{t['hero_sub']}</p>
    <p class="hero-cta"><a class="cta" href="{u('reservas',lang)}">{t['hero_cta1']}</a>
    <a class="cta ghost" href="{u('carta',lang)}">{t['hero_cta2']}</a></p>
  </div>
</section>
<section class="claims"><ul>{claims}</ul></section>
<section class="aniv">
  <p class="kick">1941 — 2026</p>
  <h2>{x['aniv_t']}</h2>
  <p class="aniv-p">{x['aniv_p']}</p>
  <div class="aniv-pair">
    <figure>{img('historia-bar-baydal', x['aniv_c1'], 1200, 856)}<figcaption>{x['aniv_c1']}</figcaption></figure>
    <figure>{img('fachada-baydal', x['aniv_c2'], 1884, 724)}<figcaption>{x['aniv_c2']}</figcaption></figure>
  </div>
  <p class="aniv-cta"><a class="more" href="{u('historia',lang)}">{x['aniv_cta']} →</a></p>
</section>
<section class="tri">
  <article><h2>{t['home_b1_t']}</h2><p>{t['home_b1_p']}</p><a class="more" href="{u('senyoret',lang)}">{t['home_b1_cta']} →</a></article>
  <article><h2>{t['home_b2_t']}</h2><p>{t['home_b2_p']}</p><a class="more" href="{u('lonja',lang)}">{x['lonja_link']} →</a></article>
  <article><h2>{t['home_b3_t']}</h2><p>{t['home_b3_p']}</p><a class="more" href="{u('historia',lang)}">{t['home_b3_cta']} →</a></article>
</section>
<section class="band">
  <h2>{t['home_platos_t']}</h2>
  <div class="cards">{dish_cards}</div>
</section>
<section class="rare">
  <h2>{x['rare_t']}</h2>
  <p class="rare-p">{x['rare_p']}</p>
  <ul class="rare-list">{rare}</ul>
  <p class="rare-cta"><a class="cta ghost" href="{u('carta',lang)}">{x['rare_cta']}</a></p>
</section>
<section class="press">
  <h2>{t['home_press_t']}</h2>
  <blockquote>{t['press_quote']}<cite>{t['press_src']}</cite></blockquote>
</section>
<section class="visit-strip">
  <div>
    <h2>{t['home_visit_t']}</h2>
    <p><strong>{t['addr_t']}:</strong> {ADDRESS}, 03710 Calp</p>
    <p><strong>{t['hours_t']}:</strong> {t['hours']}</p>
    <p><a class="cta ghost" href="{u('visitenos',lang)}">{t['map_cta']}</a></p>
  </div>
  {img('calpe-penon-panoramica','Calp, Peñón de Ifach',1000,667)}
</section>"""
    return layout(lang, "home", title, desc, body)


def menu_rows(lang, key):
    i = LI[lang]
    rows = []
    for it in MENU[key]:
        note = f'<small>{it[6].split("|")[i]}</small>' if it[6] else ""
        p1 = f'<span class="p p1">{it[4]}</span>' if it[4] else ""
        rows.append(f'<li><span class="dish">{it[i]}{note}</span><span class="dots"></span>{p1}<span class="p">{it[5]} €</span></li>')
    return "".join(rows)


def page_carta(lang):
    t = T[lang]
    title, desc = t["meta_carta"]
    secs = []
    order = [("entrantes",None),("mariscos",None),("arroces",t["arroces_note"]),("pescados",None),("carnes",t["carnes_note"]),("ninos",None)]
    for key, note in order:
        n = f'<p class="sec-note">{note}</p>' if note else ""
        has_small = any(it[4] for it in MENU[key])
        legend = f'<p class="sec-note">{t["racion_note"]}</p>' if has_small else ""
        secs.append(f'<section class="menu-sec" id="{key}"><h2>{t["sec_"+key]}</h2>{n}{legend}<ul class="menu-list">{menu_rows(lang,key)}</ul></section>')
    mb = "".join(f'<div><h3>{a}</h3><p>{b}</p></div>' for a, b in t["menu_baydal"])
    body = f"""
<section class="page-head"><h1>{t['carta_h1']}</h1><p class="sub">{t['carta_sub']}</p></section>
<div class="menu-wrap">
{''.join(secs)}
<section class="menu-sec" id="postres"><h2>{t['sec_postres']}</h2><p>{t['postres_list']}</p></section>
<section class="menu-box" id="menu-baydal"><h2>{t['menu_baydal_t']}</h2><p class="sec-note">{t['menu_baydal_note']}</p><div class="mb-grid">{mb}</div></section>
<section class="menu-sec" id="desayunos"><h2>{t['desayunos_t']}</h2><p>{t['desayunos_p']}</p></section>
</div>
<section class="cta-strip"><a class="cta" href="{u('reservas',lang)}">{t['nav']['reservar']}</a></section>"""
    return layout(lang, "carta", title, desc, body, extra_head=schema_menu(lang))


def page_senyoret(lang):
    t = T[lang]
    x = EXTRA[lang]
    title, desc = t["meta_senyoret"]
    paras = "".join(f"<p>{p}</p>" for p in t["seny_body"])
    faqs = "".join(f'<details><summary>{q}</summary><p>{a}</p></details>' for q, a in t["seny_faq"])
    fuentes = "".join(f'<blockquote>{q}<cite><a href="{url}" rel="noopener">{src}</a></cite></blockquote>' for src, q, url in PRESS[:3])
    fuentes += '<blockquote>«Fou inventat […] del restaurant Baydal de Calp.»<cite><a href="https://ca.wikipedia.org/wiki/Arr%C3%B2s_del_senyoret" rel="noopener">Viquipèdia — Arròs del senyoret</a></cite></blockquote>'
    body = f"""
<section class="page-head"><h1>{t['seny_h1']}</h1></section>
<section class="story">
  {img('arros-del-senyoret', t['seny_h1'], 1300, 1300, lazy=False, cls='story-img')}
  <div class="story-tx">{paras}</div>
</section>
<section class="faq"><h2>{t['seny_faq_t']}</h2>{faqs}</section>
<section class="press"><h2>{x['fuentes_t']}</h2>{fuentes}</section>
<section class="cta-strip"><a class="cta" href="{u('reservas',lang)}">{t['seny_cta']}</a></section>"""
    return layout(lang, "senyoret", title, desc, body, extra_head=schema_faq(lang))


def page_historia(lang):
    t = T[lang]
    x = EXTRA[lang]
    title, desc = t["meta_historia"]
    tl = "".join(f'<li><span class="tl-y">{y}</span><div><h3>{h}</h3><p>{p}</p></div></li>' for y, h, p in t["hist_timeline"])
    press = "".join(f'<blockquote>{q}<cite><a href="{url}" rel="noopener">{src}</a></cite></blockquote>' for src, q, url in PRESS)
    vids = []
    for vid, kind, label in VIDEOS:
        if kind == "yt":
            vids.append(f'<a class="vid" href="https://www.youtube.com/watch?v={vid}" rel="noopener">'
                        f'<img src="https://i.ytimg.com/vi/{vid}/hqdefault.jpg" alt="{label}" width="480" height="360" loading="lazy">'
                        f'<span>{label}<em>▶ {x["videos_cta"]}</em></span></a>')
        else:
            vids.append(f'<a class="vid vid-tx" href="{vid}" rel="noopener"><span>{label}<em>▶ {x["videos_cta"]}</em></span></a>')
    videos = "".join(vids)
    body = f"""
<section class="hero-full short">
  {img('historia-bar-baydal','Bar Baydal, años 60, con el Peñón de Ifach detrás',1200,856,lazy=False,cls='hero-bg')}
  <div class="hero-veil"></div>
  <div class="hero-inner">
    <p class="kick">1941 — {2026}</p>
    <h1>{t['hist_h1']}</h1>
    <p class="sub">{t['hist_intro']}</p>
  </div>
</section>
<section class="timeline"><ul>{tl}</ul></section>
<section class="press"><h2>{t['hist_press_t']}</h2>{press}</section>
<section class="videos"><h2>{x['videos_t']}</h2><div class="vids">{videos}</div></section>
<section class="cta-strip"><a class="cta" href="{u('reservas',lang)}">{t['nav']['reservar']}</a></section>"""
    return layout(lang, "historia", title, desc, body)


def page_galeria(lang):
    t = T[lang]
    title, desc = t["meta_galeria"]
    i = LI[lang] + 1
    figs = "".join(f'<figure>{img(g[0], g[i], 800, 800)}<figcaption>{g[i]}</figcaption></figure>' for g in GALLERY)
    body = f"""
<section class="page-head"><h1>{t['gal_h1']}</h1></section>
<section class="gal">{figs}</section>"""
    return layout(lang, "galeria", title, desc, body)


def page_reservas(lang):
    t = T[lang]
    f = t["res_f"]
    title, desc = t["meta_reservas"]
    body = f"""
<section class="page-head"><h1>{t['res_h1']}</h1><p class="sub">{t['res_p'].replace('%TEL%', TEL)}</p></section>
<section class="res">
  <form id="res-form" data-wa="{WA}" data-msg="{f['msg']}">
    <label>{f['nombre']}<input type="text" name="nombre" required autocomplete="name"></label>
    <label>{f['fecha']}<input type="date" name="fecha" required></label>
    <label>{f['hora']}<input type="time" name="hora" required min="10:00" max="23:00"></label>
    <label>{f['pax']}<input type="number" name="pax" required min="1" max="40" value="2"></label>
    <button class="cta" type="submit">{f['enviar']}</button>
  </form>
  <p class="sec-note">{f['nota']}</p>
</section>"""
    return layout(lang, "reservas", title, desc, body)


def page_visitenos(lang):
    t = T[lang]
    title, desc = t["meta_visit"]
    body = f"""
<section class="page-head"><h1>{t['visit_h1']}</h1><p class="sub">{t['visit_p']}</p></section>
<section class="visit">
  <div class="visit-info">
    <p><strong>{t['addr_t']}</strong><br>Restaurante Baydal<br>{ADDRESS}<br>03710 Calp (Alicante)</p>
    <p><strong>{t['hours_t']}</strong><br>{t['hours']}</p>
    <p><a href="tel:{TEL}">{TEL_VISIBLE}</a> · <a href="https://wa.me/{WA}">{t['wa_cta']}</a></p>
    <p>{t['visit_parking']}<br>{t['visit_lonja']} — <a href="{u('lonja',lang)}">{EXTRA[lang]['lonja_link']}</a></p>
    <p><a class="cta ghost" href="https://www.google.com/maps/dir/?api=1&destination=Restaurante+Baydal+Calpe" rel="noopener">{t['map_cta']}</a></p>
  </div>
  <div class="visit-map"><iframe src="https://www.google.com/maps?q=Restaurante%20Baydal%20Calpe&z=17&output=embed" title="Google Maps – Restaurante Baydal" loading="lazy" allowfullscreen></iframe></div>
</section>
<section class="hist-hero">{img('fachada-baydal','Restaurante Baydal, Avinguda del Port, Calp',1884,724)}</section>"""
    return layout(lang, "visitenos", title, desc, body)


def page_lonja(lang):
    t = T[lang]
    x = EXTRA[lang]
    title, desc = x["lonja_meta"]
    steps = "".join(f'<li><span class="tl-y">{h}</span><div><h3>{tt}</h3><p>{p}</p></div></li>' for h, tt, p in x["lonja_steps"])
    wa_msg = x["lonja_wa"].replace("%P", "2")
    body = f"""
<section class="hero-full short">
  {img('peix-de-calp', x['lonja_t'], 600, 600, lazy=False, cls='hero-bg')}
  <div class="hero-veil"></div>
  <div class="hero-inner">
    <p class="kick">{x['lonja_kick']}</p>
    <h1>{x['lonja_t']}</h1>
  </div>
</section>
<section class="page-head" style="padding-top:40px"><p class="sub" style="margin:0 auto">{x['lonja_intro']}</p></section>
<section class="timeline"><ul>{steps}</ul></section>
<section class="page-head" style="padding-top:0"><p class="sec-note">{x['lonja_nota']}</p></section>
<section class="cta-strip">
  <a class="cta" href="https://wa.me/{WA}?text={wa_msg.replace(' ','%20')}">{x['lonja_cta']}</a>
</section>"""
    return layout(lang, "lonja", title, desc, body)


BUILDERS = {"home":page_home,"carta":page_carta,"senyoret":page_senyoret,"historia":page_historia,
            "galeria":page_galeria,"reservas":page_reservas,"visitenos":page_visitenos,"lonja":page_lonja}


def main():
    if os.path.exists(DIST):
        shutil.rmtree(DIST)
    os.makedirs(DIST)
    # assets
    shutil.copytree(os.path.join(ROOT, "assets"), os.path.join(DIST, "assets"))
    n = 0
    for page, builder in BUILDERS.items():
        for lang in LANGS:
            path = PATHS[page][lang].strip("/")
            out_dir = os.path.join(DIST, path) if path else DIST
            os.makedirs(out_dir, exist_ok=True)
            with open(os.path.join(out_dir, "index.html"), "w", encoding="utf-8") as fh:
                fh.write(builder(lang))
            n += 1
    # robots + sitemap
    with open(os.path.join(DIST, "robots.txt"), "w", encoding="utf-8") as fh:
        fh.write(f"User-agent: *\nAllow: /\n\nSitemap: {DOMAIN}/sitemap.xml\n")
    urls = "".join(
        f"<url><loc>{DOMAIN}{PATHS[p][l]}</loc></url>" for p in PATHS for l in LANGS)
    with open(os.path.join(DIST, "sitemap.xml"), "w", encoding="utf-8") as fh:
        fh.write(f'<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">{urls}</urlset>')
    print(f"OK: {n} páginas generadas en {DIST}")


if __name__ == "__main__":
    main()
