# Estado — Paco (chatbot WhatsApp)

_Última revisión: 29/07/2026 (tarde)_

## Resumen

Rama `chatbot-wordpress`. El bot llegó a funcionar completo sobre el número de
pruebas de Meta (+1 555 656 6087), pero desde el 29/07 por la tarde está
**CAÍDO por dos frentes**: `WHATSAPP_TOKEN` caducado (expiró a las 15:00; no
era el permanente) y **créditos de Anthropic agotados** (`interpretar falló`
en los logs). Arreglo: Fase 0 de [`NUMERO_FIJO.md`](NUMERO_FIJO.md).

**Decisión 29/07**: el número definitivo de Paco será el propio fijo del
restaurante **965 831 111** (Opción C, coste 0 €). Guía completa:
[`NUMERO_FIJO.md`](NUMERO_FIJO.md). Zadarma queda como plan B.

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

- **URGENTE — Fase 0 de [`NUMERO_FIJO.md`](NUMERO_FIJO.md)**: recargar
  créditos de Anthropic + generar y cargar el token permanente de system user
  (`WHATSAPP_TOKEN`) + redeploy + comprobar plantillas APPROVED. Hecho el
  29/07 según David: redeploy del webhook (fichas de sala) y ejecución de
  `scripts/plantillas.mjs`; la aprobación de plantillas quedó sin verificar
  por el token caducado.
- **Número definitivo = fijo 965 831 111**: seguir Fases 1–5 de
  [`NUMERO_FIJO.md`](NUMERO_FIJO.md) (comprobar que el fijo no tiene WhatsApp,
  alta en Meta con verificación por llamada, secret `WHATSAPP_PHONE_ID`,
  deploy, plugin/web, cancelar Zadarma).
- Instalar el plugin en el WordPress de baydal.es y probar la edición
  ([`INTEGRACION_WP.md`](INTEGRACION_WP.md); el zip está en el Escritorio).
- Poner horarios y mesas REALES (los del seed son de ejemplo) desde el plugin
  o el panel. La carta YA es la real: mayo 2026, 51 platos, 5 idiomas,
  verificada céntimo a céntimo contra el PDF (`scripts/carta-mayo-2026.mjs`).
- Conectar el formulario de baydal.es a Paco cuando el fijo esté dado de alta
  (rama `web`, [`INTEGRACION_WEB.md`](INTEGRACION_WEB.md)).
- Conectar el dominio `panel.baydal.es` en Hostinger.
- Subir el runtime de Node 20 → 22 antes del **30/10/2026** (aviso de Google
  en cada deploy).
