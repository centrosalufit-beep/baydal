# El número definitivo de Paco: el fijo del restaurante 965 831 111

_Escrito el 29/07/2026. Decisión: registrar el propio fijo en la Cloud API
(Opción C de [`ALTA_META.md`](ALTA_META.md) paso 4.0). Coste 0 €, sin Zadarma,
sin desvíos. Las llamadas de VOZ al fijo siguen funcionando igual que siempre;
WhatsApp solo usa el número como identidad. [`NUMERO_ZADARMA.md`](NUMERO_ZADARMA.md)
queda como plan B si la verificación fallara._

## Fase 0 — Desbloquear el bot (OBLIGATORIA antes de nada)

Detectado el 29/07 por la tarde: el bot está caído por dos frentes.

1. **Créditos de Anthropic agotados** (`interpretar falló: credit balance too
   low` en los logs). Recargar en https://console.anthropic.com → Plans &
   Billing, en la cuenta de la API key que usa el bot (secret `CLAUDE_API_KEY`).
2. **`WHATSAPP_TOKEN` caducado** (expiró el 29/07 a las 15:00; no era el
   permanente). Generar el permanente de verdad:
   - https://business.facebook.com → Configuración del negocio → **Usuarios del
     sistema** → crear (o usar) un usuario de sistema **administrador** →
     **Generar token** → app `chatbot_reservas` → caducidad **Nunca** →
     permisos `whatsapp_business_messaging` + `whatsapp_business_management`.
   - Cargarlo y redesplegar (o pasárselo a Claude, que lo carga con `--data-file`):
     ```
     firebase functions:secrets:set WHATSAPP_TOKEN --project baydal-reservas
     firebase deploy --only functions --project baydal-reservas
     ```
3. **Probar** que Paco vuelve a contestar en el número de pruebas, y de paso
   comprobar que las 4 plantillas × 5 idiomas están **APPROVED** (con el token
   nuevo: `GET graph.facebook.com/v23.0/2004127973561093/message_templates`).

## Fase 1 — Comprobar el fijo (5 min, en recepción)

1. **¿Tiene WhatsApp el 965 831 111?** Si alguna vez se dio de alta en la app
   de WhatsApp o WhatsApp Business con ese número, hay que **eliminar esa
   cuenta primero** desde la app (Ajustes → Cuenta → Eliminar cuenta). Se
   pierden esos chats. Si nunca tuvo WhatsApp, no hay que hacer nada.
2. **Sin robots delante**: durante la llamada de verificación no puede saltar
   contestador, locución ni centralita con menú — tiene que **descolgar una
   persona**. Si hay locución de bienvenida, desactivarla ese rato.
3. La línea debe aceptar **llamadas internacionales** entrantes (Meta llama
   desde el extranjero). Lo normal es que sí.
4. Elegir un momento tranquilo (media mañana) y avisar a recepción: "va a
   llamar un robot y dictará 6 dígitos, apúntalos".

## Fase 2 — Alta del número en Meta (15 min)

1. https://developers.facebook.com/apps/808415372203366 → **WhatsApp →
   Configuración de la API → Agregar número de teléfono**:
   - Nombre para mostrar: **Restaurante Baydal** (debe coincidir con el nombre
     público del negocio o Meta lo rechaza)
   - Categoría: Restaurante · Web: https://baydal.es
   - Número: **+34 965 831 111**
2. Verificación: elige **llamada de voz** → que recepción conteste → apuntar
   el código de 6 dígitos → pegarlo en Meta. (Si falla varias veces → plan B
   Zadarma/Twilio, [`ALTA_META.md`](ALTA_META.md) paso 4.0.)
3. Copia el **Phone number ID** del número nuevo (ID numérico largo, al lado
   del número en esa misma pantalla).
4. **Método de pago** (obligatorio para que salgan las plantillas): Business
   Manager → WhatsApp → Facturación → añadir tarjeta.
5. **Perfil del número** (https://business.facebook.com/wa/manage/ → Números →
   el número → Perfil): logo cuadrado mín. 640×640, dirección (Av. del Port
   10, 03710 Calp — verificar 10 vs 12), web https://baydal.es, descripción.
6. **Verificación en dos pasos**: activarla ahí mismo y GUARDAR EL PIN de 6
   dígitos (imprescindible si algún día se migra el número).

## Fase 3 — Enchufar el número al bot (5 min)

1. Cargar el Phone number ID nuevo como secret:
   ```
   firebase functions:secrets:set WHATSAPP_PHONE_ID --project baydal-reservas
   ```
2. Redesplegar:
   ```
   firebase deploy --only functions --project baydal-reservas
   ```
3. **Probar**: "hola" por WhatsApp al **965 831 111** desde cualquier móvil
   (número de producción: ya no hace falta lista de verificados). Paco debe
   contestar en segundos. Probar una reserva completa y ver la ficha
   "✅ NUEVA RESERVA" en recepción.

## Fase 4 — Dónde poner el número (todos los sitios)

| Dónde | Qué poner | Cómo |
|---|---|---|
| **Plugin WordPress** | `34965831111` | wp-admin → Paco (Reservas) → Ajustes → "Número de WhatsApp de Paco" → Guardar. Ya se puede activar el botón flotante. |
| **Web estática (rama `web`)** | Constante `WA_PACO` en `build.py` + cambio del formulario | [`INTEGRACION_WEB.md`](INTEGRACION_WEB.md), regenerar con `python build.py` y republicar en Hostinger. |
| **Firestore** | Nada | `whatsappHumano` (34677490049) y `telefonoHumano` (34965831111) no cambian. Que el teléfono de "llama a recepción" y el del bot sean el mismo número es correcto: la llamada la coge una persona y el WhatsApp lo coge Paco. |
| **Desvíos** | Ninguno | El fijo YA es recepción. |

## Fase 5 — Apagar lo provisional

- **Zadarma**: ya no hace falta. Si el KYC sigue en curso, abandonarlo; si se
  pagó el año (~20 €), no renovar. Cancelar antes de que el número asignado
  entre en uso en ningún sitio.
- El **número de pruebas** de Meta se ignora (webhook y app son los mismos).
- **Mantener el fijo siempre de alta** con la operadora: si el número se
  pierde, se pierde el WhatsApp del bot.
- Regla permanente: el 965 831 111 **no puede usarse en la app normal de
  WhatsApp** mientras esté en la plataforma.
- Cuando todo esté probado: panel → Ajustes → **Bot activo: ON** y avisar a
  sala ([`OPERACION.md`](OPERACION.md)).
