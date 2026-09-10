# Garantía de reserva con Teya (retención en tarjeta)

**Qué hace**: al reservar por WhatsApp, Paco manda un enlace de Teya que **retiene**
(no cobra) el importe de la garantía en la tarjeta del cliente. Si no viene sin avisar
con 24 h, se cobra desde el panel marcando *No-show*. Si viene o cancela a tiempo, la
retención se anula sola. Detalle técnico: SCHEMA.md → "Garantía".

**Por qué así y no con el enlace de pago de la app**: los enlaces de la app de Teya son
de un solo uso y cobran (venta). Por API, Teya permite enlaces de **pre-autorización**
(`PRE_AUTHORISATION`) creados uno por reserva, que se capturan o anulan después.

## Pasos de David (una vez, ~10 min)

1. **Business Portal de Teya** → Ajustes → elige la tienda del restaurante →
   **Integraciones** → *Generar credenciales*. Apunta `client_id` y `client_secret`
   (y si pide permisos: enlaces de pago crear/consultar/actualizar, capturas, anulaciones).
2. En la misma pantalla, **Webhooks** → URL:
   `https://europe-southwest1-baydal-reservas.cloudfunctions.net/teyaWebhook`
   (eventos de enlaces de pago / transacciones). Es opcional: sin él, Paco confirma
   igual en ≤5 min.
3. Pasar a Claude el `client_id` y el `client_secret` (fichero local, como los otros tokens).

## Pasos de Claude

```bash
firebase functions:secrets:set TEYA_CLIENT_ID      # pegar valor
firebase functions:secrets:set TEYA_CLIENT_SECRET
firebase deploy --only functions,hosting           # (gcloud: --account=centrosalufit@gmail.com)
```
Sin credenciales todavía se puede desplegar con ambos secrets a `PENDIENTE`: la
garantía se salta sola y las reservas siguen como siempre.

## Prueba antes de encenderla para clientes

1. Panel → Ajustes → marcar **Pedir garantía** con importe **1 €** → Guardar.
2. Reservar desde un móvil propio → pagar el enlace → debe llegar la confirmación.
3. En los logs de `revisarGarantiasProgramado`/`teyaWebhook` buscar
   `[teya] enlace … COMPLETED:` y comprobar que trae el id de la transacción
   (si no, ajustar `transaccionDe` en `functions/src/teya.ts`).
4. Marcar la reserva como **No-show** en el panel → debe cobrarse 1 € y avisar a sala.
   Otra reserva de prueba marcada **Completada** → la retención debe liberarse.
5. Subir el importe a 20 € y dejarla activa.

## Al activarla

- Añadir a *Información práctica* (Ajustes): "Al reservar por WhatsApp pedimos una
  garantía: retención de 20 € en tarjeta que no se cobra; solo se cobra si no vienes sin
  avisar con al menos 24 h de antelación." (Paco solo sabe lo que pone ahí.)
- Marcar los no-show **el mismo día**: la limpieza de las 03:11 pasa las reservas del día
  a *completada* y eso anula las retenciones.

## Límites conocidos

- La retención dura ~7 días (Visa; Mastercard ~30): en reservas a más de 6 días vista
  puede haber caducado al llegar el no-show → la ficha a sala dirá "COBRAR A MANO".
- Grupos (>20) y clientes reincidentes siguen como antes (sala decide), sin garantía.
