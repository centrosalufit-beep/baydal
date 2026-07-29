// plantillas.mjs — Crea en Meta las 4 plantillas del bot en 5 idiomas (20 envíos).
// Textos EXACTOS de docs/ALTA_META.md paso 7; valencià va con código "ca" (Meta no tiene "va").
// Uso (PowerShell, con el secret ya cargado):
//   $env:WHATSAPP_TOKEN=(firebase functions:secrets:access WHATSAPP_TOKEN --project baydal-reservas)
//   node scripts/plantillas.mjs
// Idempotente a efectos prácticos: si una plantilla/idioma ya existe, Meta lo dice y se sigue.

const WABA_ID = '2004127973561093'; // cuenta de WhatsApp Business del Restaurante Baydal
const API = `https://graph.facebook.com/v23.0/${WABA_ID}/message_templates`;

const token = (process.env.WHATSAPP_TOKEN ?? '').trim();
if (!token) {
  console.error('Falta WHATSAPP_TOKEN en el entorno. Ver cabecera de este fichero.');
  process.exit(1);
}

// Botones Confirmar/Cancelar por idioma (mismo ORDEN siempre: los payloads van por índice)
const BOTONES = {
  es: ['Confirmar', 'Cancelar'],
  ca: ['Confirmar', 'Cancel·lar'],
  en: ['Confirm', 'Cancel'],
  de: ['Bestätigen', 'Stornieren'],
  fr: ['Confirmer', 'Annuler'],
};

const PLANTILLAS = [
  {
    name: 'recordatorio_reserva',
    category: 'UTILITY',
    ejemplos: ['21/08/2026', '14:00', '4'],
    botones: true,
    cuerpos: {
      es: 'Hola, soy Paco, del Restaurante Baydal 🥘 Te recuerdo tu reserva de mañana, {{1}} a las {{2}}, para {{3}} personas. ¿Me la confirmas?',
      ca: 'Hola, soc Paco, del Restaurante Baydal 🥘 Et recorde la teua reserva de demà, {{1}} a les {{2}}, per a {{3}} persones. Me la confirmes?',
      en: 'Hello, this is Paco from Restaurante Baydal 🥘 A reminder of your reservation tomorrow, {{1}} at {{2}}, for {{3}} guests. Could you confirm?',
      de: 'Hallo, hier ist Paco vom Restaurante Baydal 🥘 Zur Erinnerung: Ihre Reservierung morgen, {{1}} um {{2}} Uhr, für {{3}} Personen. Bitte bestätigen Sie.',
      fr: "Bonjour, c'est Paco du Restaurante Baydal 🥘 Rappel de votre réservation demain, {{1}} à {{2}}, pour {{3}} personnes. Pouvez-vous confirmer ?",
    },
  },
  {
    name: 'aviso_liberacion',
    category: 'UTILITY',
    ejemplos: ['14:00', '12:00'],
    botones: true,
    cuerpos: {
      es: 'Hola, soy Paco, del Restaurante Baydal. Tu reserva de hoy a las {{1}} sigue sin confirmar. Si no la confirmas antes de las {{2}}, la mesa se liberará. ¿Vienes?',
      ca: "Hola, soc Paco, del Restaurante Baydal. La teua reserva de hui a les {{1}} encara està sense confirmar. Si no la confirmes abans de les {{2}}, la taula s'alliberarà. Véns?",
      en: "Hello, this is Paco from Restaurante Baydal. Your reservation today at {{1}} is still unconfirmed. If we don't hear from you by {{2}}, the table will be released. Are you coming?",
      de: 'Hallo, hier ist Paco vom Restaurante Baydal. Ihre Reservierung heute um {{1}} Uhr ist noch unbestätigt. Ohne Bestätigung bis {{2}} Uhr wird der Tisch freigegeben. Kommen Sie?',
      fr: "Bonjour, c'est Paco du Restaurante Baydal. Votre réservation d'aujourd'hui à {{1}} n'est pas encore confirmée. Sans confirmation avant {{2}}, la table sera libérée. Venez-vous ?",
    },
  },
  {
    name: 'reserva_liberada',
    category: 'UTILITY',
    ejemplos: ['14:00', '965 831 111'],
    botones: false,
    cuerpos: {
      // Meta prohíbe acabar en variable: por eso el "gracias" final (de acaba en "an." y pasó tal cual)
      es: 'Hola, soy Paco, del Restaurante Baydal. Al no recibir confirmación, tu reserva de hoy a las {{1}} se ha cancelado y la mesa ha quedado libre. Si aún quieres venir, escríbeme o llama al {{2}}. ¡Gracias!',
      ca: "Hola, soc Paco, del Restaurante Baydal. Com que no hem rebut confirmació, la teua reserva de hui a les {{1}} s'ha cancel·lat i la taula ha quedat lliure. Si encara vols vindre, escriu-me o telefona al {{2}}. Gràcies!",
      en: "Hello, this is Paco from Restaurante Baydal. As we didn't receive a confirmation, your reservation today at {{1}} has been cancelled and the table released. If you'd still like to come, message me or call {{2}}. Thank you!",
      de: 'Hallo, hier ist Paco vom Restaurante Baydal. Da wir keine Bestätigung erhalten haben, wurde Ihre heutige Reservierung um {{1}} Uhr storniert und der Tisch freigegeben. Wenn Sie noch kommen möchten, schreiben Sie mir oder rufen Sie {{2}} an.',
      fr: "Bonjour, c'est Paco du Restaurante Baydal. Faute de confirmation, votre réservation d'aujourd'hui à {{1}} a été annulée et la table libérée. Si vous souhaitez toujours venir, écrivez-moi ou appelez le {{2}}. Merci !",
    },
  },
  {
    name: 'pedir_resena',
    category: 'MARKETING',
    ejemplos: ['María', 'https://g.page/r/XXXX/review'],
    botones: false,
    cuerpos: {
      // Ídem: el enlace {{2}} no puede cerrar el texto
      es: '¡Gracias por tu visita, {{1}}! Soy Paco, del Restaurante Baydal 🥘 Si has quedado contento, ¿nos dejas una reseña en Google? Se hace en un minuto: {{2}} ¡Gracias!',
      ca: 'Gràcies per la teua visita, {{1}}! Soc Paco, del Restaurante Baydal 🥘 Si has quedat content, ens deixes una ressenya en Google? Es fa en un minut: {{2}} Gràcies!',
      en: 'Thank you for your visit, {{1}}! This is Paco from Restaurante Baydal 🥘 If you enjoyed it, would you leave us a Google review? It only takes a minute: {{2}} Thank you!',
      de: 'Vielen Dank für Ihren Besuch, {{1}}! Hier ist Paco vom Restaurante Baydal 🥘 Wenn es Ihnen gefallen hat, würden Sie uns eine Google-Bewertung hinterlassen? Es dauert nur eine Minute: {{2}} Vielen Dank!',
      fr: "Merci de votre visite, {{1}} ! C'est Paco du Restaurante Baydal 🥘 Si vous avez passé un bon moment, nous laisseriez-vous un avis Google ? Cela ne prend qu'une minute : {{2}} Merci !",
    },
  },
];

let ok = 0;
let ko = 0;
for (const p of PLANTILLAS) {
  for (const [idioma, texto] of Object.entries(p.cuerpos)) {
    const components = [{ type: 'BODY', text: texto, example: { body_text: [p.ejemplos] } }];
    if (p.botones) {
      components.push({
        type: 'BUTTONS',
        buttons: BOTONES[idioma].map((t) => ({ type: 'QUICK_REPLY', text: t })),
      });
    }
    const res = await fetch(API, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: p.name, language: idioma, category: p.category, components }),
    });
    const cuerpo = await res.json().catch(() => ({}));
    if (res.ok) {
      ok++;
      console.log(`✔ ${p.name} [${idioma}] enviada a aprobación (estado: ${cuerpo.status ?? '?'})`);
    } else {
      ko++;
      const e = cuerpo.error ?? {};
      console.error(`✖ ${p.name} [${idioma}]: ${e.error_user_msg ?? e.message ?? JSON.stringify(cuerpo)}`);
    }
    await new Promise((r) => setTimeout(r, 500)); // sin prisas: evita rate limit
  }
}
console.log(`\n${ok} enviadas, ${ko} con error. Estado de aprobación: https://business.facebook.com/wa/manage/message-templates/`);
