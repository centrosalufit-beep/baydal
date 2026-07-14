// textos.ts — Tabla completa de mensajes del bot en es/va/en/de/fr.
// Paco TUTEA en castellano y valencià (cercano y breve, algún emoji 🥘);
// en/de/fr registro estándar cordial. Interpolación con {clave}:
// t('es', 'confirmar', { fecha: '...' }).

import type { Idioma } from './tipos';

// Exportada solo para el test de completitud de idiomas
export const TEXTOS = {
  // ── Saludo y menú ────────────────────────────────────────────────
  saludo: {
    es: '¡Hola! Soy {bot}, el asistente automático de {nombre} 🥘 Puedo ayudarte a reservar mesa o resolver dudas sobre la carta y los horarios.\n\nTus datos se usan solo para gestionar tu reserva (RGPD). Escribe BAJA para no recibir más mensajes.',
    va: 'Hola! Soc {bot}, l’assistent automàtic de {nombre} 🥘 Puc ajudar-te a reservar taula o resoldre dubtes sobre la carta i els horaris.\n\nLes teues dades s’usen només per a gestionar la teua reserva (RGPD). Escriu BAIXA per a no rebre més missatges.',
    en: 'Hello! I am {bot}, the automated assistant of {nombre} 🥘 I can help you book a table or answer questions about our menu and opening hours.\n\nYour data is only used to manage your booking (GDPR). Reply STOP to opt out of messages.',
    de: 'Hallo! Ich bin {bot}, der automatische Assistent von {nombre} 🥘 Ich helfe Ihnen gern bei der Tischreservierung oder bei Fragen zu Speisekarte und Öffnungszeiten.\n\nIhre Daten werden nur zur Verwaltung Ihrer Reservierung verwendet (DSGVO). Schreiben Sie STOP, um keine Nachrichten mehr zu erhalten.',
    fr: 'Bonjour ! Je suis {bot}, l’assistant automatique de {nombre} 🥘 Je peux vous aider à réserver une table ou répondre à vos questions sur la carte et les horaires.\n\nVos données servent uniquement à gérer votre réservation (RGPD). Écrivez STOP pour ne plus recevoir de messages.',
  },
  menu: {
    es: '¿En qué te puedo ayudar?',
    va: 'En què et puc ajudar?',
    en: 'How can I help you?',
    de: 'Wie kann ich Ihnen helfen?',
    fr: 'Comment puis-je vous aider ?',
  },
  btnReservar: { es: 'Reservar mesa', va: 'Reservar taula', en: 'Book a table', de: 'Tisch reservieren', fr: 'Réserver une table' },
  btnCarta: { es: 'Ver la carta', va: 'Veure la carta', en: 'See the menu', de: 'Speisekarte', fr: 'Voir la carte' },
  btnHumano: { es: 'Hablar con persona', va: 'Parlar amb algú', en: 'Talk to a person', de: 'Mit Person sprechen', fr: 'Parler à quelqu’un' },

  // ── Bot inactivo / baja ──────────────────────────────────────────
  botInactivo: {
    es: 'Gracias por escribir a {nombre}. Ahora mismo el asistente no está disponible. Llámanos al {telefono} y te atendemos encantados.',
    va: 'Gràcies per escriure a {nombre}. Ara mateix l’assistent no està disponible. Telefona’ns al {telefono} i t’atenem encantats.',
    en: 'Thank you for contacting {nombre}. The assistant is currently unavailable. Please call us at {telefono} and we will be happy to help.',
    de: 'Vielen Dank für Ihre Nachricht an {nombre}. Der Assistent ist derzeit nicht verfügbar. Rufen Sie uns gern unter {telefono} an.',
    fr: 'Merci d’avoir contacté {nombre}. L’assistant n’est pas disponible pour le moment. Appelez-nous au {telefono}, nous serons ravis de vous aider.',
  },
  baja: {
    es: 'Entendido, no te enviaremos más mensajes. Si cambias de opinión, llámanos cuando quieras. ¡Gracias!',
    va: 'Entés, no t’enviarem més missatges. Si canvies d’opinió, telefona’ns quan vulgues. Gràcies!',
    en: 'Understood, we will not send you any more messages. If you change your mind, you can always call us. Thank you!',
    de: 'Verstanden, Sie erhalten keine weiteren Nachrichten von uns. Sie können uns jederzeit anrufen. Vielen Dank!',
    fr: 'C’est noté, nous ne vous enverrons plus de messages. Vous pouvez toujours nous appeler. Merci !',
  },

  // ── Paso FECHA ───────────────────────────────────────────────────
  pideFecha: {
    es: '¡Perfecto! ¿Para qué día quieres la reserva?',
    va: 'Perfecte! Per a quin dia vols la reserva?',
    en: 'Great! For which day would you like to book?',
    de: 'Sehr gern! Für welchen Tag möchten Sie reservieren?',
    fr: 'Parfait ! Pour quel jour souhaitez-vous réserver ?',
  },
  btnVerFechas: { es: 'Ver fechas', va: 'Veure dates', en: 'See dates', de: 'Termine ansehen', fr: 'Voir les dates' },
  hoy: { es: 'Hoy', va: 'Hui', en: 'Today', de: 'Heute', fr: 'Aujourd’hui' },
  manana: { es: 'Mañana', va: 'Demà', en: 'Tomorrow', de: 'Morgen', fr: 'Demain' },
  otraFecha: { es: 'Otra fecha', va: 'Una altra data', en: 'Another date', de: 'Anderes Datum', fr: 'Autre date' },
  pideFechaTexto: {
    es: 'Escríbeme la fecha que quieres (por ejemplo: 24/07 o "el sábado").',
    va: 'Escriu-me la data que vols (per exemple: 24/07 o "dissabte").',
    en: 'Please type the date you would like (for example: 24/07 or "Saturday").',
    de: 'Schreiben Sie uns bitte das gewünschte Datum (z. B. 24.07. oder "Samstag").',
    fr: 'Écrivez-nous la date souhaitée (par exemple : 24/07 ou « samedi »).',
  },
  fechaNoValida: {
    es: 'Perdona, no he entendido la fecha. ¿Me la escribes otra vez? (por ejemplo: 24/07)',
    va: 'Perdona, no he entés la data. Me l’escrius una altra vegada? (per exemple: 24/07)',
    en: 'Sorry, I did not understand the date. Could you type it again? (for example: 24/07)',
    de: 'Entschuldigung, das Datum habe ich nicht verstanden. Können Sie es noch einmal schreiben? (z. B. 24.07.)',
    fr: 'Désolé, je n’ai pas compris la date. Pouvez-vous la réécrire ? (par exemple : 24/07)',
  },
  fechaFueraRango: {
    es: 'Solo aceptamos reservas hasta {dias} días vista. ¿Te viene bien otra fecha más cercana?',
    va: 'Només acceptem reserves fins a {dias} dies vista. Et va bé una data més pròxima?',
    en: 'We only take bookings up to {dias} days in advance. Would an earlier date work for you?',
    de: 'Wir nehmen Reservierungen nur bis {dias} Tage im Voraus an. Passt Ihnen ein näheres Datum?',
    fr: 'Nous acceptons les réservations jusqu’à {dias} jours à l’avance. Une date plus proche vous conviendrait-elle ?',
  },
  fechaCerrada: {
    es: 'Lo siento, ese día estamos cerrados. ¿Te viene bien otra fecha?',
    va: 'Ho sente, eixe dia estem tancats. Et va bé una altra data?',
    en: 'Sorry, we are closed on that day. Would another date work for you?',
    de: 'Leider haben wir an diesem Tag geschlossen. Passt Ihnen ein anderes Datum?',
    fr: 'Désolé, nous sommes fermés ce jour-là. Une autre date vous conviendrait-elle ?',
  },

  // ── Paso TURNO ───────────────────────────────────────────────────
  pideTurno: {
    es: '¿Prefieres comida o cena?',
    va: 'Preferixes dinar o sopar?',
    en: 'Would you prefer lunch or dinner?',
    de: 'Möchten Sie mittags oder abends kommen?',
    fr: 'Préférez-vous déjeuner ou dîner ?',
  },
  btnComida: { es: 'Comida', va: 'Dinar', en: 'Lunch', de: 'Mittagessen', fr: 'Déjeuner' },
  btnCena: { es: 'Cena', va: 'Sopar', en: 'Dinner', de: 'Abendessen', fr: 'Dîner' },

  // ── Paso HORA ────────────────────────────────────────────────────
  pideHora: {
    es: '¿A qué hora te gustaría venir el {fecha}?',
    va: 'A quina hora t’agradaria vindre el {fecha}?',
    en: 'What time would you like to come on {fecha}?',
    de: 'Um wie viel Uhr möchten Sie am {fecha} kommen?',
    fr: 'À quelle heure souhaitez-vous venir le {fecha} ?',
  },
  btnVerHoras: { es: 'Ver horas', va: 'Veure hores', en: 'See times', de: 'Uhrzeiten ansehen', fr: 'Voir les horaires' },
  turnoLleno: {
    es: 'Lo siento, ese turno del {fecha} está completo. ¿Quieres probar otro día u otro turno?',
    va: 'Ho sente, eixe torn del {fecha} està complet. Vols provar un altre dia o un altre torn?',
    en: 'Sorry, that service on {fecha} is fully booked. Would you like to try another day or service?',
    de: 'Leider sind wir am {fecha} zu dieser Zeit ausgebucht. Möchten Sie einen anderen Tag oder eine andere Zeit versuchen?',
    fr: 'Désolé, ce service du {fecha} est complet. Voulez-vous essayer un autre jour ou un autre service ?',
  },

  // ── Paso COMENSALES ──────────────────────────────────────────────
  pideComensales: {
    es: '¿Para cuántas personas?',
    va: 'Per a quantes persones?',
    en: 'For how many people?',
    de: 'Für wie viele Personen?',
    fr: 'Pour combien de personnes ?',
  },
  btnVerPax: { es: 'Elegir personas', va: 'Triar persones', en: 'Choose people', de: 'Personen wählen', fr: 'Choisir' },
  persona: { es: '1 persona', va: '1 persona', en: '1 person', de: '1 Person', fr: '1 personne' },
  personas: { es: '{n} personas', va: '{n} persones', en: '{n} people', de: '{n} Personen', fr: '{n} personnes' },
  paxMas: { es: 'Más de 8', va: 'Més de 8', en: 'More than 8', de: 'Mehr als 8', fr: 'Plus de 8' },
  pideComensalesTexto: {
    es: '¿Cuántos seréis? Escríbeme el número 🙂',
    va: 'Quants sereu? Escriu-me el número 🙂',
    en: 'How many of you will there be? Please type the number 🙂',
    de: 'Wie viele Personen werden Sie sein? Schreiben Sie mir bitte die Zahl 🙂',
    fr: 'Combien serez-vous ? Écrivez-moi le nombre 🙂',
  },

  // ── Grupos grandes (> maxComensalesBot) ──────────────────────────
  grupoIntro: {
    es: '¡Menudo grupazo! 🎉 Tomo nota y el equipo os lo confirma enseguida. Solo necesito un par de datos más.',
    va: 'Quin grupàs! 🎉 Prenc nota i l’equip vos ho confirma de seguida. Només necessite un parell de dades més.',
    en: 'What a big group! 🎉 I will take your details and our team will confirm shortly. I just need a couple more things.',
    de: 'Eine große Gruppe! 🎉 Ich nehme Ihre Daten auf und unser Team bestätigt in Kürze. Ich brauche nur noch ein paar Angaben.',
    fr: 'Quel grand groupe ! 🎉 Je prends vos coordonnées et notre équipe confirmera très vite. Il ne me manque que quelques informations.',
  },
  grupoRecibido: {
    es: '¡Genial! Ya lo tiene el equipo: os confirmamos enseguida 💪',
    va: 'Genial! Ja ho té l’equip: vos ho confirmem de seguida 💪',
    en: 'Great! Our team has your request — we will confirm shortly 💪',
    de: 'Super! Unser Team hat Ihre Anfrage — wir bestätigen in Kürze 💪',
    fr: 'Génial ! Notre équipe a votre demande — nous confirmons très vite 💪',
  },

  // ── Paso NOMBRE ──────────────────────────────────────────────────
  pideNombre: {
    es: '¿A nombre de quién pongo la reserva?',
    va: 'A nom de qui pose la reserva?',
    en: 'What name should we put the booking under?',
    de: 'Auf welchen Namen dürfen wir reservieren?',
    fr: 'À quel nom mettons-nous la réservation ?',
  },

  // ── Paso EMAIL (opcional) ────────────────────────────────────────
  pideEmail: {
    es: '¿Nos dejas un email? (opcional, solo para gestionar tu reserva)',
    va: 'Ens deixes un email? (opcional, només per a gestionar la teua reserva)',
    en: 'Would you like to leave an email? (optional, only to manage your booking)',
    de: 'Möchten Sie eine E-Mail-Adresse hinterlassen? (optional, nur zur Verwaltung Ihrer Reservierung)',
    fr: 'Souhaitez-vous laisser un e-mail ? (facultatif, uniquement pour gérer votre réservation)',
  },
  btnEmailSaltar: { es: 'Ahora no', va: 'Ara no', en: 'Not now', de: 'Jetzt nicht', fr: 'Pas maintenant' },

  // ── Paso NOTAS ───────────────────────────────────────────────────
  pideNotas: {
    es: '¿Alguna nota para nosotros? (alergias, trona, terraza…)',
    va: 'Alguna nota per a nosaltres? (al·lèrgies, trona, terrassa…)',
    en: 'Any notes for us? (allergies, high chair, terrace…)',
    de: 'Haben Sie Hinweise für uns? (Allergien, Hochstuhl, Terrasse …)',
    fr: 'Une remarque pour nous ? (allergies, chaise haute, terrasse…)',
  },
  btnSinNotas: { es: 'Sin notas', va: 'Sense notes', en: 'No notes', de: 'Keine Hinweise', fr: 'Aucune remarque' },

  // ── Paso CONFIRMAR ───────────────────────────────────────────────
  confirmar: {
    es: 'Repasamos tu reserva:\n\n📅 {fecha}\n🕐 {hora}\n👥 {comensales} personas\n👤 {nombre}\n📝 {notas}\n\n¿Confirmamos?',
    va: 'Repassem la teua reserva:\n\n📅 {fecha}\n🕐 {hora}\n👥 {comensales} persones\n👤 {nombre}\n📝 {notas}\n\nConfirmem?',
    en: 'Let’s review your booking:\n\n📅 {fecha}\n🕐 {hora}\n👥 {comensales} people\n👤 {nombre}\n📝 {notas}\n\nShall we confirm?',
    de: 'Ihre Reservierung im Überblick:\n\n📅 {fecha}\n🕐 {hora}\n👥 {comensales} Personen\n👤 {nombre}\n📝 {notas}\n\nDürfen wir bestätigen?',
    fr: 'Récapitulons votre réservation :\n\n📅 {fecha}\n🕐 {hora}\n👥 {comensales} personnes\n👤 {nombre}\n📝 {notas}\n\nOn confirme ?',
  },
  sinNotas: { es: 'Sin notas', va: 'Sense notes', en: 'No notes', de: 'Keine Hinweise', fr: 'Aucune remarque' },
  btnConfSi: { es: 'Sí, confirmar', va: 'Sí, confirmar', en: 'Yes, confirm', de: 'Ja, bestätigen', fr: 'Oui, confirmer' },
  btnConfNo: { es: 'No, cancelar', va: 'No, cancel·lar', en: 'No, cancel', de: 'Nein, abbrechen', fr: 'Non, annuler' },
  reservaConfirmada: {
    es: '¡Reserva confirmada! ✅\n\n📅 {fecha} a las {hora}, {comensales} personas.\n\nTe guardamos la mesa {cortesia} min. ¡Te esperamos en {nombre}! 🥘 Para cancelar o cambiar la reserva, escríbeme por aquí.',
    va: 'Reserva confirmada! ✅\n\n📅 {fecha} a les {hora}, {comensales} persones.\n\nEt guardem la taula {cortesia} min. T’esperem a {nombre}! 🥘 Per a cancel·lar o canviar la reserva, escriu-me per ací.',
    en: 'Booking confirmed! ✅\n\n📅 {fecha} at {hora}, {comensales} people.\n\nWe will hold your table for {cortesia} min. See you at {nombre}! 🥘 To cancel or change your booking, just message us here.',
    de: 'Reservierung bestätigt! ✅\n\n📅 {fecha} um {hora}, {comensales} Personen.\n\nWir halten Ihren Tisch {cortesia} Min. frei. Bis bald im {nombre}! 🥘 Zum Stornieren oder Ändern schreiben Sie uns einfach hier.',
    fr: 'Réservation confirmée ! ✅\n\n📅 {fecha} à {hora}, {comensales} personnes.\n\nNous gardons votre table {cortesia} min. À bientôt chez {nombre} ! 🥘 Pour annuler ou modifier, écrivez-nous ici.',
  },
  // Reincidente (noshows >= 2): la reserva nace pendiente y sala decide
  reservaPendienteCliente: {
    es: '¡Anotado! 📝 Te confirmamos enseguida por aquí.',
    va: 'Anotat! 📝 T’ho confirmem de seguida per ací.',
    en: 'Noted! 📝 We will confirm shortly here.',
    de: 'Notiert! 📝 Wir bestätigen Ihnen in Kürze hier.',
    fr: 'C’est noté ! 📝 Nous confirmons très vite ici.',
  },
  reservaNoCabe: {
    es: 'Vaya, justo se nos ha ocupado esa hora. Estas horas siguen libres, ¿te viene bien alguna?',
    va: 'Vaja, just se’ns ha ocupat eixa hora. Estes hores continuen lliures, et va bé alguna?',
    en: 'Oh no, that time has just been taken. These times are still available — would any of them work?',
    de: 'Oh, diese Uhrzeit wurde gerade vergeben. Diese Zeiten sind noch frei — passt Ihnen eine davon?',
    fr: 'Oh, ce créneau vient d’être pris. Ces horaires restent disponibles, l’un d’eux vous conviendrait-il ?',
  },
  borradorCancelado: {
    es: 'Sin problema, no he guardado nada. ¿Te ayudo en algo más?',
    va: 'Cap problema, no he guardat res. T’ajude en alguna cosa més?',
    en: 'No problem, nothing was saved. Can I help you with anything else?',
    de: 'Kein Problem, es wurde nichts gespeichert. Kann ich sonst noch etwas für Sie tun?',
    fr: 'Pas de souci, rien n’a été enregistré. Puis-je vous aider pour autre chose ?',
  },

  // ── Límite de reservas activas por teléfono ──────────────────────
  limiteReservas: {
    es: 'Ya tienes {max} reservas activas con nosotros, que es el máximo por teléfono. Puedes cancelar alguna aquí abajo o llamarnos al {telefono}.',
    va: 'Ja tens {max} reserves actives amb nosaltres, que és el màxim per telèfon. Pots cancel·lar-ne alguna ací baix o telefonar-nos al {telefono}.',
    en: 'You already have {max} active bookings with us, which is the maximum per phone number. You can cancel one below or call us at {telefono}.',
    de: 'Sie haben bereits {max} aktive Reservierungen bei uns — das Maximum pro Telefonnummer. Sie können unten eine stornieren oder uns unter {telefono} anrufen.',
    fr: 'Vous avez déjà {max} réservations actives chez nous, le maximum par numéro. Vous pouvez en annuler une ci-dessous ou nous appeler au {telefono}.',
  },

  // ── Cancelación de reservas ──────────────────────────────────────
  cancelarCual: {
    es: '¿Qué reserva quieres cancelar?',
    va: 'Quina reserva vols cancel·lar?',
    en: 'Which booking would you like to cancel?',
    de: 'Welche Reservierung möchten Sie stornieren?',
    fr: 'Quelle réservation souhaitez-vous annuler ?',
  },
  btnVerReservas: { es: 'Mis reservas', va: 'Les meues reserves', en: 'My bookings', de: 'Meine Termine', fr: 'Mes réservations' },
  sinReservas: {
    es: 'No encuentro ninguna reserva con tu número. Si crees que es un error, llámanos al {telefono}.',
    va: 'No trobe cap reserva amb el teu número. Si creus que és un error, telefona’ns al {telefono}.',
    en: 'I cannot find any booking under your number. If you think this is a mistake, please call us at {telefono}.',
    de: 'Ich finde keine Reservierung unter Ihrer Nummer. Falls das ein Fehler ist, rufen Sie uns bitte unter {telefono} an.',
    fr: 'Je ne trouve aucune réservation à votre numéro. Si c’est une erreur, appelez-nous au {telefono}.',
  },
  reservaCancelada: {
    es: 'Tu reserva del {fecha} a las {hora} queda cancelada. ¡Esperamos verte pronto!',
    va: 'La teua reserva del {fecha} a les {hora} queda cancel·lada. Esperem veure’t prompte!',
    en: 'Your booking on {fecha} at {hora} has been cancelled. We hope to see you soon!',
    de: 'Ihre Reservierung am {fecha} um {hora} wurde storniert. Wir hoffen, Sie bald zu sehen!',
    fr: 'Votre réservation du {fecha} à {hora} est annulée. Au plaisir de vous revoir bientôt !',
  },

  // ── Ciclo recordatorio → confirmación → liberación ───────────────
  avisoLiberacion: {
    es: '⏰ Aún no has confirmado tu reserva de hoy a las {hora}. Confírmala antes de las {limite} o la mesa se libera.',
    va: '⏰ Encara no has confirmat la teua reserva de hui a les {hora}. Confirma-la abans de les {limite} o la taula s’allibera.',
    en: '⏰ You have not yet confirmed your booking today at {hora}. Please confirm before {limite} or the table will be released.',
    de: '⏰ Sie haben Ihre heutige Reservierung um {hora} noch nicht bestätigt. Bitte bestätigen Sie bis {limite}, sonst wird der Tisch freigegeben.',
    fr: '⏰ Vous n’avez pas encore confirmé votre réservation d’aujourd’hui à {hora}. Confirmez avant {limite}, sinon la table sera libérée.',
  },
  reservaLiberada: {
    es: 'Tu reserva de hoy a las {hora} se ha liberado al no estar confirmada. Si aún quieres venir, escríbeme y miramos hueco 🙂',
    va: 'La teua reserva de hui a les {hora} s’ha alliberat perquè no estava confirmada. Si encara vols vindre, escriu-me i mirem si hi ha lloc 🙂',
    en: 'Your booking today at {hora} has been released because it was not confirmed. If you still want to come, message me and we will check availability 🙂',
    de: 'Ihre heutige Reservierung um {hora} wurde freigegeben, da sie nicht bestätigt wurde. Wenn Sie noch kommen möchten, schreiben Sie mir und wir prüfen die Verfügbarkeit 🙂',
    fr: 'Votre réservation d’aujourd’hui à {hora} a été libérée faute de confirmation. Si vous souhaitez toujours venir, écrivez-moi et nous vérifierons la disponibilité 🙂',
  },

  // ── Petición de reseña ───────────────────────────────────────────
  pedirResena: {
    es: '¡Gracias por tu visita a {nombre}! 😊 ¿Nos dejas una reseña? Nos ayuda un montón: {enlace}',
    va: 'Gràcies per la teua visita a {nombre}! 😊 Ens deixes una ressenya? Ens ajuda moltíssim: {enlace}',
    en: 'Thank you for visiting {nombre}! 😊 Would you leave us a review? It helps us a lot: {enlace}',
    de: 'Vielen Dank für Ihren Besuch im {nombre}! 😊 Würden Sie uns eine Bewertung hinterlassen? Das hilft uns sehr: {enlace}',
    fr: 'Merci de votre visite chez {nombre} ! 😊 Nous laisseriez-vous un avis ? Cela nous aide beaucoup : {enlace}',
  },

  // ── Escalado a humano / buzón nocturno ───────────────────────────
  escalado: {
    es: 'Te paso con una persona del equipo, que te responderá por aquí en cuanto pueda. Si es urgente, llámanos al {telefono}.',
    va: 'Et passe amb una persona de l’equip, que et respondrà per ací quan puga. Si és urgent, telefona’ns al {telefono}.',
    en: 'I am passing you to a member of our team, who will reply here as soon as possible. If it is urgent, please call us at {telefono}.',
    de: 'Ich übergebe Sie an eine Person aus unserem Team, die Ihnen hier so bald wie möglich antwortet. Bei dringenden Anliegen rufen Sie uns unter {telefono} an.',
    fr: 'Je vous mets en relation avec un membre de notre équipe, qui vous répondra ici dès que possible. En cas d’urgence, appelez-nous au {telefono}.',
  },
  buzonNocturno: {
    es: 'Ahora mismo el equipo no está: te responde a partir de las {inicio} 👋 Si es urgente, llámanos al {telefono}.',
    va: 'Ara mateix l’equip no està: et respon a partir de les {inicio} 👋 Si és urgent, telefona’ns al {telefono}.',
    en: 'Our team is away right now: they will reply from {inicio} 👋 If it is urgent, please call us at {telefono}.',
    de: 'Unser Team ist gerade nicht da: Sie erhalten ab {inicio} eine Antwort 👋 Bei dringenden Anliegen rufen Sie uns unter {telefono} an.',
    fr: 'Notre équipe n’est pas là pour le moment : elle vous répondra à partir de {inicio} 👋 En cas d’urgence, appelez-nous au {telefono}.',
  },
  btnVolverMenu: { es: 'Volver al menú', va: 'Tornar al menú', en: 'Back to menu', de: 'Zurück zum Menü', fr: 'Retour au menu' },

  // ── Varios ───────────────────────────────────────────────────────
  graciasConfirmacion: {
    es: '¡Gracias por confirmar! Te esperamos 😊',
    va: 'Gràcies per confirmar! T’esperem 😊',
    en: 'Thank you for confirming! See you soon 😊',
    de: 'Danke für die Bestätigung! Wir freuen uns auf Sie 😊',
    fr: 'Merci de votre confirmation ! À bientôt 😊',
  },
  soloTexto: {
    es: 'Perdona, solo entiendo mensajes de texto. ¿Me escribes lo que necesitas?',
    va: 'Perdona, només entenc missatges de text. M’escrius el que necessites?',
    en: 'Sorry, I can only understand text messages. Could you type what you need?',
    de: 'Entschuldigung, ich verstehe nur Textnachrichten. Können Sie mir schreiben, was Sie brauchen?',
    fr: 'Désolé, je ne comprends que les messages texte. Pouvez-vous écrire ce dont vous avez besoin ?',
  },
  audioNoEntendido: {
    es: 'No he podido escuchar bien el audio, ¿me lo escribes? 🙏',
    va: 'No he pogut escoltar bé l’àudio, m’ho escrius? 🙏',
    en: 'I could not make out the voice note — could you type it? 🙏',
    de: 'Ich konnte die Sprachnachricht nicht verstehen — können Sie es mir schreiben? 🙏',
    fr: 'Je n’ai pas bien entendu le vocal — pouvez-vous me l’écrire ? 🙏',
  },
  cartaIntro: {
    es: 'Pregúntame lo que quieras sobre nuestra carta: platos, precios, alérgenos… ¡Estoy aquí para ayudarte! 🥘',
    va: 'Pregunta’m el que vulgues sobre la nostra carta: plats, preus, al·lèrgens… Estic ací per a ajudar-te! 🥘',
    en: 'Ask me anything about our menu: dishes, prices, allergens… I am here to help! 🥘',
    de: 'Fragen Sie mich gern alles zur Speisekarte: Gerichte, Preise, Allergene … Ich helfe Ihnen gern! 🥘',
    fr: 'Posez-moi vos questions sur la carte : plats, prix, allergènes… Je suis là pour vous aider ! 🥘',
  },
} as const;

export type ClaveTexto = keyof typeof TEXTOS;

/**
 * Devuelve el texto `clave` en el `idioma` dado, interpolando `params`
 * en los marcadores {nombreParametro}.
 */
export function t(
  idioma: Idioma,
  clave: ClaveTexto,
  params?: Record<string, string | number>
): string {
  let texto: string = TEXTOS[clave][idioma];
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      texto = texto.split(`{${k}}`).join(String(v));
    }
  }
  return texto;
}
