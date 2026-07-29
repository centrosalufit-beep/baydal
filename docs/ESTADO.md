# Estado — Paco (chatbot WhatsApp)

_Última revisión: 29/07/2026_

## Resumen

Rama `chatbot-wordpress`. Código completo (Cloud Functions + panel + seed + guías)
y, nuevo de esta rama, la API `wpApi` y el **plugin de WordPress**
(`wordpress/paco-chatbot/`) para gestionar carta/horarios/info práctica y poner el
formulario de reservas en baydal.es. Proyecto Firebase `baydal-reservas` creado el
14/07/2026. **Aún no desplegado.**

## Hecho en esta rama (29/07/2026)

- `functions/src/wpapi.ts` + export `wpApi` en `index.ts`: API con token (secret
  `WP_API_TOKEN`) para editar carta, horario e infoPractica desde WordPress.
  54 tests en verde (`npm test` en `functions/`).
- Plugin `wordpress/paco-chatbot/` (3 ficheros): shortcode `[paco_reservas]`,
  botón flotante y pantallas de Carta / Horarios / Info práctica. Verificado por
  lectura; falta pasarle `php -l` en el hosting (aquí no hay PHP instalado).
- Guía de instalación del plugin: [`INTEGRACION_WP.md`](INTEGRACION_WP.md).

## Pendiente

- Desplegar (`firebase deploy`) con los **7 secrets** (WhatsApp ×4, Anthropic,
  OpenAI y `WP_API_TOKEN`) — README pasos 7–8.
- Meta, pasos 1–3 de [`ALTA_META.md`](ALTA_META.md): cuenta Business, app y
  primeras pruebas con el **número de pruebas** de Meta.
- Número definitivo: **Zadarma** (fijo virtual de Alicante), **KYC en curso**;
  cuando llegue el número, paso 4 de `ALTA_META.md`.
- Instalar y configurar el plugin en el WordPress de baydal.es —
  [`INTEGRACION_WP.md`](INTEGRACION_WP.md).
- Aprobar las 4 plantillas Meta × 5 idiomas (`ALTA_META.md` paso 7).
- Conectar el dominio `panel.baydal.es` en Hostinger.
- El bot arranca **apagado** (`botActivo: false`); activarlo a mano desde el
  panel tras probarlo.

Ver [`../README.md`](../README.md) y [`../SCHEMA.md`](../SCHEMA.md) para el
resto del contrato y la puesta en marcha paso a paso.
