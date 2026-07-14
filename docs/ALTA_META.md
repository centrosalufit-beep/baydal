# Alta en WhatsApp Business Platform (Meta) — paso a paso

Objetivo: que Paco pueda **recibir y enviar** mensajes de WhatsApp con la Cloud API de Meta (v23.0, ver `SCHEMA.md`). Al final tendrás los 4 valores de WhatsApp que se cargan como secrets en el paso 7 del `README.md` (los secrets son **6 en total**: estos 4 + `ANTHROPIC_API_KEY` + `OPENAI_API_KEY`, que salen de sus consolas y no de Meta).

| Secret | Qué es | Dónde sale |
|---|---|---|
| `WHATSAPP_TOKEN` | Token de acceso permanente | Paso 5 |
| `WHATSAPP_APP_SECRET` | Clave secreta de la app (firma de webhooks) | Paso 2 |
| `WHATSAPP_VERIFY_TOKEN` | Frase que inventas tú | Paso 6 |
| `WHATSAPP_PHONE_ID` | ID del número de teléfono | Paso 3 (pruebas) / Paso 4 (definitivo) |
| `ANTHROPIC_API_KEY` | API key de Claude | <https://console.anthropic.com> → API Keys |
| `OPENAI_API_KEY` | API key de OpenAI (Whisper, notas de voz) | <https://platform.openai.com> → API keys |

## Paso 1 — Cuenta de Meta Business

1. Entra en <https://business.facebook.com> y crea una **cuenta de empresa** (Business Portfolio) a nombre del restaurante: "Restaurante Baydal", correo del restaurante.
2. Completa los datos de empresa (dirección, web baydal.es). Meta puede pedir **verificación del negocio** más adelante (documento fiscal); conviene hacerla porque desbloquea límites de envío.

## Paso 2 — Crear la app de desarrollador

1. Entra en <https://developers.facebook.com> → **Mis apps → Crear app**.
2. Tipo/caso de uso: **Empresa (Business)**. Nombre: `baydal-reservas-bot`. Vincúlala al Business Portfolio del paso 1.
3. En la app: **Configuración → Básica** → copia el **Secreto de la app** (`WHATSAPP_APP_SECRET`). Con él las funciones comprueban que los webhooks vienen de Meta de verdad.

## Paso 3 — Añadir el producto WhatsApp y probar con el número de pruebas

1. En el panel de la app: **Agregar producto → WhatsApp → Configurar**.
2. Meta te da automáticamente un **número de pruebas** gratuito. En **WhatsApp → Configuración de la API** verás:
   - **Phone number ID** del número de pruebas → es el `WHATSAPP_PHONE_ID` mientras se desarrolla.
   - Un **token temporal** (caduca en 24 h) → vale para las primeras pruebas; el bueno se hace en el paso 5.
3. El número de pruebas solo puede escribir a **destinatarios verificados** (máximo 5): añade ahí tu móvil y el de Jose ("Manage phone number list" → añadir → código por WhatsApp).
4. Prueba desde esa misma pantalla el botón **Enviar mensaje**: si te llega el "hello world", la parte de Meta funciona.

## Paso 4 — Alta del número NUEVO definitivo

### 4.0 — Comprar el número (investigado y contrastado 14/07/2026)

Dato clave: en España **no se venden números MÓVILES virtuales +34** (lo impide la normativa CNMC — lo confirman Zadarma y DIDWW). La vía sin SIM ni aparatos es un **FIJO virtual** verificado por **llamada de voz** (Meta lo admite oficialmente para fijos/VoIP).

**Opción A — Zadarma, fijo virtual de Alicante (ganadora para este caso)**
- <https://zadarma.com/es/tariffs/numbers/spain/alicante/> — fijo 865/96x: **0 € alta, 1,70 €/mes** (pago anual; 3,40 €/mes mensual), entrantes gratis, panel en español, **factura española con IVA** (opera vía VOICE CLOUD S.L., NIF B66781501). El número de Alicante se asigna al azar (no se elige).
- Alta: crear cuenta → Números virtuales → España → Alicante → pago anual con "Quiero factura" (CIF del restaurante). KYC en el panel: DNI/NIE o CIF + dirección (horas–1 día).
- Para la verificación: instalar la **app/softphone de Zadarma** y comprobar que el número suena. Durante la llamada de Meta: **sin desvío, sin locución, sin centralita** — hay que descolgar en directo y apuntar el código de 6 dígitos.
- Aviso honesto: el blog de Zadarma dice que los VoIP "no son compatibles" con WhatsApp y no lo garantiza. Meta sí admite VOICE en fijos; trátalo como apuesta de ~20 €/año que casi siempre sale. Si falla → Opción B.
- Tras el alta: configurar en el panel el **desvío de entrantes al 965 831 111** (~0,011–0,013 €/min).

**Opción B — Twilio, fijo local de Alicante (respaldo, la más fiable técnicamente)**
- ~1,15 $/mes + "bundle regulatorio" de España (CIF + prueba de dirección en la provincia de Alicante: factura de suministro del local vale). Ventaja decisiva: al verificar por SMS, **el código de Meta aparece escrito en la consola de Twilio** — no hay que descolgar nada. Contras: consola en inglés y factura desde Irlanda (sin IVA español).

**Opción C — Coste cero: registrar el fijo actual 965 831 111**
- Si ese fijo no tiene cuenta de WhatsApp, se puede dar de alta ÉL MISMO en la Cloud API: verificación por llamada al restaurante (que conteste una persona, no una locución), coste 0 €, sin desvío (ya ES recepción), y **el fijo sigue recibiendo llamadas normales** después (confirmado en docs de Meta). Único veto: ese número no podrá usarse jamás en la app normal de WhatsApp mientras esté en la plataforma. Si algún día se quiere separar bot y teléfono del local, tocaría migrar.

**Descartados**: Sonetel (solo prefijos Madrid/BCN), Netelip (su propio blog admite que la verificación suele fallar con sus desvíos), DIDWW (8 $/mes, caro), Vonage (enterprise), Telsome/VozTelecom/Numintec (sin autoservicio), eSIM prepago (exige un móvil vivo + recargas eternas; si caduca, la operadora recicla el número y otro podría re-verificarlo).

- **Requisitos del número, sea cual sea**: que NO tenga una cuenta de WhatsApp activa (si la tuvo, borrar la cuenta desde la app antes), que pueda **recibir un SMS o una llamada internacional** de verificación, y sin IVR/locución delante (el robot de Meta no navega menús).
- Tras verificar: **mantener la línea viva** mientras exista el bot (harán falta OTP futuros si se migra de WABA/BSP o se re-añade el número) y activar la **verificación en dos pasos** en WhatsApp Manager guardando el PIN de 6 dígitos.
1. En la app: **WhatsApp → Configuración de la API → Agregar número de teléfono**.
2. Rellena: nombre para mostrar **"Restaurante Baydal"**, categoría (Restaurante), descripción y el número.
3. Verificación: elige SMS o llamada, mete el código que recibas.
4. Meta revisa el **nombre para mostrar** (horas o pocos días). Si lo rechaza, que coincida con el nombre público del negocio (web/registro).
5. Copia el **Phone number ID** del número nuevo: ese será el `WHATSAPP_PHONE_ID` definitivo (recargar el secret y redesplegar: `firebase functions:secrets:set WHATSAPP_PHONE_ID` + `firebase deploy --only functions`).
6. Añade un **método de pago** en la cuenta de WhatsApp Business (Business Manager → WhatsApp → Facturación): sin él no se pueden enviar plantillas al público.
7. **Perfil del número** (lo que ve el cliente al abrir el chat): WhatsApp Manager → Números de teléfono → el número → **Perfil**. Rellena: nombre visible **"Restaurante Baydal"**, foto de perfil (el logo, cuadrado, mín. 640×640), dirección (Av. del Port 10, 03710 Calp — VERIFICAR 10 vs 12), web `https://baydal.es`, email y descripción corta. Un perfil completo da confianza y reduce bloqueos.

## Paso 5 — Token permanente

El token temporal caduca cada 24 h; para producción se crea un token de **usuario del sistema**:

1. <https://business.facebook.com/settings> → **Usuarios → Usuarios del sistema → Agregar**: nombre `bot-baydal`, rol **Administrador**.
2. Al usuario del sistema: **Agregar activos** → la app `baydal-reservas-bot` (control total) y la cuenta de WhatsApp Business.
3. **Generar token nuevo** → app `baydal-reservas-bot` → caducidad **Nunca** → permisos: `whatsapp_business_messaging` y `whatsapp_business_management`.
4. Copia el token (solo se muestra una vez): es el `WHATSAPP_TOKEN`.

## Paso 6 — Configurar el webhook

1. Necesitas la URL de la función `whatsappWebhook`, que aparece al hacer `firebase deploy` (README paso 8). Tiene esta pinta:
   `https://europe-southwest1-baydal-reservas.cloudfunctions.net/whatsappWebhook`
2. Inventa el `WHATSAPP_VERIFY_TOKEN` (frase larga sin espacios) y cárgalo como secret **antes** de este paso (README paso 7), porque Meta va a llamar a la función para verificar.
3. En la app: **WhatsApp → Configuración → Webhook → Editar**:
   - **URL de devolución de llamada**: la URL de arriba.
   - **Token de verificación**: exactamente la misma frase del secret.
   - Guardar → Meta hace un GET a la función; si el token coincide, queda verificado.
4. En la misma pantalla, **Campos de webhook → Administrar** → suscríbete a **`messages`** (solo ese hace falta).

## Paso 7 — Plantillas de mensaje (4 plantillas × 5 idiomas)

Las plantillas son los únicos mensajes que Paco puede enviar **fuera de la ventana de 24 h** desde el último mensaje del cliente. Hay que aprobar **4 plantillas** (`recordatorio_reserva`, `aviso_liberacion`, `reserva_liberada`, `pedir_resena`), cada una en **5 idiomas**. Las aprueba Meta (normalmente en minutos/horas).

Procedimiento (igual para las 4):

1. **Administrador de WhatsApp** (Business Manager → WhatsApp Manager) → **Plantillas de mensajes → Crear plantilla**.
2. Categoría y nombre según la tabla de abajo (nombre exacto, en minúsculas).
3. Idioma: **Español (ES)**. Con la plantilla creada, usa **"Agregar idioma"** para añadir el resto a la MISMA plantilla: cada traducción pasa aprobación por separado.
   > **Valencià**: Meta no tiene código de idioma `va`; se usa **Catalán (ca)**, que es el más próximo. El código del bot ya mapea `va → ca` al enviar plantillas.
4. Pega el cuerpo del idioma correspondiente, añade los botones si la plantilla los lleva (mismo ORDEN siempre) y envía a aprobación. Meta pide **valores de ejemplo** para las variables: usa los indicados en cada plantilla.

| Plantilla | Categoría | Variables | Botones |
|---|---|---|---|
| `recordatorio_reserva` | Utilidad | `{{1}}` fecha, `{{2}}` hora, `{{3}}` personas | Confirmar / Cancelar |
| `aviso_liberacion` | Utilidad | `{{1}}` hora reserva, `{{2}}` hora límite | Confirmar / Cancelar |
| `reserva_liberada` | Utilidad | `{{1}}` hora reserva, `{{2}}` teléfono | — |
| `pedir_resena` | Marketing | `{{1}}` nombre, `{{2}}` enlace de reseña | — |

### 7.1 `recordatorio_reserva` (ejemplos: `21/08/2026`, `14:00`, `4`)

- **es**: `Hola, soy Paco, del Restaurante Baydal 🥘 Te recuerdo tu reserva de mañana, {{1}} a las {{2}}, para {{3}} personas. ¿Me la confirmas?`
- **va** (código ca): `Hola, soc Paco, del Restaurante Baydal 🥘 Et recorde la teua reserva de demà, {{1}} a les {{2}}, per a {{3}} persones. Me la confirmes?`
- **en**: `Hello, this is Paco from Restaurante Baydal 🥘 A reminder of your reservation tomorrow, {{1}} at {{2}}, for {{3}} guests. Could you confirm?`
- **de**: `Hallo, hier ist Paco vom Restaurante Baydal 🥘 Zur Erinnerung: Ihre Reservierung morgen, {{1}} um {{2}} Uhr, für {{3}} Personen. Bitte bestätigen Sie.`
- **fr**: `Bonjour, c'est Paco du Restaurante Baydal 🥘 Rappel de votre réservation demain, {{1}} à {{2}}, pour {{3}} personnes. Pouvez-vous confirmer ?`

Botones (Respuesta rápida / Quick reply, en este orden):
1. es `Confirmar` · va `Confirmar` · en `Confirm` · de `Bestätigen` · fr `Confirmer`
2. es `Cancelar` · va `Cancel·lar` · en `Cancel` · de `Stornieren` · fr `Annuler`

### 7.2 `aviso_liberacion` (ejemplos: `14:00`, `12:00`)

- **es**: `Hola, soy Paco, del Restaurante Baydal. Tu reserva de hoy a las {{1}} sigue sin confirmar. Si no la confirmas antes de las {{2}}, la mesa se liberará. ¿Vienes?`
- **va** (código ca): `Hola, soc Paco, del Restaurante Baydal. La teua reserva de hui a les {{1}} encara està sense confirmar. Si no la confirmes abans de les {{2}}, la taula s'alliberarà. Véns?`
- **en**: `Hello, this is Paco from Restaurante Baydal. Your reservation today at {{1}} is still unconfirmed. If we don't hear from you by {{2}}, the table will be released. Are you coming?`
- **de**: `Hallo, hier ist Paco vom Restaurante Baydal. Ihre Reservierung heute um {{1}} Uhr ist noch unbestätigt. Ohne Bestätigung bis {{2}} Uhr wird der Tisch freigegeben. Kommen Sie?`
- **fr**: `Bonjour, c'est Paco du Restaurante Baydal. Votre réservation d'aujourd'hui à {{1}} n'est pas encore confirmée. Sans confirmation avant {{2}}, la table sera libérée. Venez-vous ?`

Botones: los mismos dos y en el mismo orden que `recordatorio_reserva`.

### 7.3 `reserva_liberada` (ejemplos: `14:00`, `965 831 111`) — sin botones

- **es**: `Hola, soy Paco, del Restaurante Baydal. Al no recibir confirmación, tu reserva de hoy a las {{1}} se ha cancelado y la mesa ha quedado libre. Si aún quieres venir, escríbeme o llama al {{2}}.`
- **va** (código ca): `Hola, soc Paco, del Restaurante Baydal. Com que no hem rebut confirmació, la teua reserva de hui a les {{1}} s'ha cancel·lat i la taula ha quedat lliure. Si encara vols vindre, escriu-me o telefona al {{2}}.`
- **en**: `Hello, this is Paco from Restaurante Baydal. As we didn't receive a confirmation, your reservation today at {{1}} has been cancelled and the table released. If you'd still like to come, message me or call {{2}}.`
- **de**: `Hallo, hier ist Paco vom Restaurante Baydal. Da wir keine Bestätigung erhalten haben, wurde Ihre heutige Reservierung um {{1}} Uhr storniert und der Tisch freigegeben. Wenn Sie noch kommen möchten, schreiben Sie mir oder rufen Sie {{2}} an.`
- **fr**: `Bonjour, c'est Paco du Restaurante Baydal. Faute de confirmation, votre réservation d'aujourd'hui à {{1}} a été annulée et la table libérée. Si vous souhaitez toujours venir, écrivez-moi ou appelez le {{2}}.`

### 7.4 `pedir_resena` (ejemplos: `María`, `https://g.page/r/XXXX/review`) — sin botones, categoría **Marketing**

Solo se usa si la ventana de 24 h está cerrada (si está abierta, Paco manda mensaje libre, gratis).

- **es**: `¡Gracias por tu visita, {{1}}! Soy Paco, del Restaurante Baydal 🥘 Si has quedado contento, ¿nos dejas una reseña en Google? Se hace en un minuto: {{2}}`
- **va** (código ca): `Gràcies per la teua visita, {{1}}! Soc Paco, del Restaurante Baydal 🥘 Si has quedat content, ens deixes una ressenya en Google? Es fa en un minut: {{2}}`
- **en**: `Thank you for your visit, {{1}}! This is Paco from Restaurante Baydal 🥘 If you enjoyed it, would you leave us a Google review? It only takes a minute: {{2}}`
- **de**: `Vielen Dank für Ihren Besuch, {{1}}! Hier ist Paco vom Restaurante Baydal 🥘 Wenn es Ihnen gefallen hat, würden Sie uns eine Google-Bewertung hinterlassen? Es dauert nur eine Minute: {{2}}`
- **fr**: `Merci de votre visite, {{1}} ! C'est Paco du Restaurante Baydal 🥘 Si vous avez passé un bon moment, nous laisseriez-vous un avis Google ? Cela ne prend qu'une minute : {{2}}`

### Cómo se mapean los payloads de los botones (importante)

En la plantilla solo se define el **texto** de los botones. El **payload** (lo que recibe el webhook cuando el cliente pulsa) NO se configura en Meta: lo pone el código **en cada envío**, por índice de botón. Según `SCHEMA.md`:

- Botón 0 (Confirmar) → payload `rec_conf_<reservaId>` → marca `confirmadaCliente: true`
- Botón 1 (Cancelar) → payload `rec_cancel_<reservaId>` → cancela la reserva y avisa a sala

(`<reservaId>` es el id real del documento de `reservas`.) Aplica igual a `recordatorio_reserva` y a `aviso_liberacion`.

Fragmento del cuerpo del envío (lo hace el código, se documenta aquí para entenderlo):

```json
"template": {
  "name": "recordatorio_reserva",
  "language": { "code": "es" },
  "components": [
    { "type": "body", "parameters": [
      { "type": "text", "text": "21/08/2026" },
      { "type": "text", "text": "14:00" },
      { "type": "text", "text": "4" }
    ]},
    { "type": "button", "sub_type": "quick_reply", "index": "0",
      "parameters": [{ "type": "payload", "payload": "rec_conf_AbC123xyz" }] },
    { "type": "button", "sub_type": "quick_reply", "index": "1",
      "parameters": [{ "type": "payload", "payload": "rec_cancel_AbC123xyz" }] }
  ]
}
```

Cuando el cliente pulsa un botón, el webhook recibe ese payload tal cual y la máquina de estados lo trata igual que cualquier otro botón.

## Checklist final

- [ ] Business Portfolio creado (y verificación de negocio en marcha)
- [ ] App creada, `WHATSAPP_APP_SECRET` guardado como secret
- [ ] Bot probado con el número de pruebas
- [ ] Número definitivo verificado (con desvío de llamadas al 965 831 111), `WHATSAPP_PHONE_ID` actualizado, método de pago añadido
- [ ] Perfil del número completo (nombre "Restaurante Baydal", logo, dirección, web)
- [ ] Token permanente (`WHATSAPP_TOKEN`) como secret
- [ ] Webhook verificado y suscrito a `messages`
- [ ] Las 4 plantillas aprobadas en es/va(ca)/en/de/fr
