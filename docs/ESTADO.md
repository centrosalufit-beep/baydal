# Estado — Paco (chatbot WhatsApp)

_Última revisión: 27/07/2026_

## Resumen

Código completo (Cloud Functions + panel + seed + guías de despliegue). Proyecto
Firebase `baydal-reservas` creado el 14/07/2026. **Aún no desplegado.** Sin
actividad desde el 14/07/2026.

## Últimos commits en esta rama

- `Paco v1 — sistema de reservas del Restaurante Baydal` (14/07/2026)
- `Config real del proyecto Firebase (baydal-reservas creado 14/07/2026)` (14/07/2026)

## Pendiente

- Desplegar (`firebase deploy`) y cargar los 6 secrets (WhatsApp ×4, Anthropic, OpenAI).
- Decidir y contratar el **número de WhatsApp definitivo** (sin WhatsApp activo,
  verificable por SMS/llamada). Mientras tanto, desarrollo con el número de
  pruebas de Meta.
- Alta en Meta Business — ver [`ALTA_META.md`](ALTA_META.md).
- Conectar dominio `panel.baydal.es` en Hostinger.
- El bot arranca **apagado** (`botActivo: false`); activarlo a mano desde el
  panel tras probarlo.

Ver [`../README.md`](../README.md) y [`../SCHEMA.md`](../SCHEMA.md) para el
resto del contrato y la puesta en marcha paso a paso.
