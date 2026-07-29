# Estado — Paco (chatbot WhatsApp)

_Última revisión: 29/07/2026 (tarde)_

## Resumen

Rama `chatbot-wordpress`. **EL BOT FUNCIONA**: desplegado en `baydal-reservas`,
webhook verificado, bot activo y **flujo de reserva completo probado con éxito**
sobre el número de pruebas de Meta (+1 555 656 6087). La API `wpApi` responde y
el plugin de WordPress (`wordpress/paco-chatbot/`) está listo para instalar.

## Hecho el 29/07/2026

- Descubierto que el deploy del 14/07 SÍ se hizo (este documento decía lo
  contrario); baydal.es sirve la web estática con WordPress vivo detrás.
- `wpApi` + plugin WordPress + `docs/INTEGRACION_WP.md` (revisión adversarial
  incluida, 55 tests en verde). Secret `WP_API_TOKEN` creado; wpApi probada
  en producción (carta/horario/info responden; 401 sin token).
- Meta al completo con el número de pruebas: token permanente cargado,
  webhook verificado y suscrito, **app publicada** y WABA suscrita a la app
  vía `subscribed_apps` (era el eslabón que faltaba), `WHATSAPP_APP_SECRET`
  corregido (el del 14/07 no era de la app actual `chatbot_reservas`).
- Bug de plataforma arreglado: el webhook respondía 200 antes de procesar y
  Cloud Run cortaba la CPU → Paco contestaba minutos tarde. Ahora procesa y
  responde al terminar (SCHEMA actualizado). También `invoker: 'public'`
  explícito en `wpApi`.
- Avisos a sala reformateados como ficha multilínea (✅ NUEVA RESERVA /
  FECHA / HORA / PERSONAS / NOMBRE / MESA) — **pendiente de redeploy**.
- Script `scripts/plantillas.mjs`: crea las 4 plantillas × 5 idiomas por API.

## Datos operativos

- App Meta `chatbot_reservas` id `808415372203366` (cuenta de Jose,
  fjbaydal@yahoo.es) · WABA `2004127973561093` · Phone ID pruebas
  `1265376799990951`. Verificación del negocio: hecha.
- Los 7 secrets cargados y funcionando. Copias locales de David (Escritorio):
  `paco-api-token.txt` (token del plugin) y `verify-token.txt` (webhook).

## Pendiente

- Redeploy del webhook para estrenar las fichas de aviso a sala
  (`firebase deploy --only functions:whatsappWebhook`).
- Instalar el plugin en el WordPress de baydal.es y probar la edición
  ([`INTEGRACION_WP.md`](INTEGRACION_WP.md); el zip está en el Escritorio).
- Ejecutar `scripts/plantillas.mjs` (ver cabecera) y vigilar la aprobación.
- Zadarma: KYC en curso → cuando esté, paso 4 de [`ALTA_META.md`](ALTA_META.md)
  (alta del número, `WHATSAPP_PHONE_ID` definitivo, método de pago, perfil).
- Poner horarios, mesas y carta REALES (los del seed son de ejemplo) desde el
  plugin o el panel.
- Conectar el formulario de baydal.es a Paco cuando exista el número definitivo
  (rama `web`, [`INTEGRACION_WEB.md`](INTEGRACION_WEB.md)).
- Conectar el dominio `panel.baydal.es` en Hostinger.
- Subir el runtime de Node 20 → 22 antes del **30/10/2026** (aviso de Google
  en cada deploy).
