# El número definitivo de Paco (Zadarma) — qué hacer cuando llegue

_Escrito el 29/07/2026, con el alta de Zadarma hecha y el KYC en curso.
Mientras tanto el bot funciona con el número de pruebas de Meta (+1 555 656 6087)._

## Fase 1 — Zadarma (esperando el KYC)

1. **Vigilar el correo/panel** (https://my.zadarma.com): cuando aprueben la
   verificación de documentos, el fijo de Alicante (865/96x) quedará activo.
   Apunta el número aquí y en `ESTADO.md`: `NÚMERO: ____________`
2. **Probar que suena**: instala la app de Zadarma (https://zadarma.com/es/services/apps/),
   inicia sesión y llama al número desde tu móvil. Debe sonar en la app.
3. **MUY IMPORTANTE — todavía NO configures el desvío** al 965 831 111 ni
   ninguna locución. Para la verificación de Meta la llamada hay que
   descolgarla EN DIRECTO en la app de Zadarma. El desvío se pone al final
   (Fase 4).

## Fase 2 — Alta del número en Meta (15 min, con la app de Zadarma abierta)

Guía detallada: [`ALTA_META.md`](ALTA_META.md) paso 4. Resumen operativo:

1. https://developers.facebook.com/apps/808415372203366 → **WhatsApp →
   Configuración de la API → Agregar número de teléfono**:
   - Nombre para mostrar: **Restaurante Baydal** (debe coincidir con el
     nombre público del negocio o Meta lo rechaza)
   - Categoría: Restaurante · Web: https://baydal.es
2. Verificación: elige **llamada de voz** → contesta en la app de Zadarma →
   apunta el código de 6 dígitos → pégalo en Meta.
3. Copia el **Phone number ID** del número nuevo (NO es el número: es un ID
   numérico largo, sale al lado del número en esa misma pantalla).
4. **Método de pago** (obligatorio para que salgan las plantillas):
   Business Manager → WhatsApp → Facturación → añadir tarjeta.
5. **Perfil del número** (https://business.facebook.com/wa/manage/ → Números
   → el número → Perfil): logo cuadrado mín. 640×640, dirección
   (Av. del Port 10, 03710 Calp — verificar 10 vs 12), web https://baydal.es,
   descripción corta.
6. **Verificación en dos pasos**: actívala en esa misma pantalla y GUARDA EL
   PIN de 6 dígitos (hará falta si algún día se migra el número).

## Fase 3 — Enchufar el número al bot (5 min)

1. Cargar el Phone number ID nuevo como secret (en una terminal normal pide
   el valor por teclado; en una sesión de Claude Code, decírselo a Claude,
   que lo carga con `--data-file`):
   ```
   firebase functions:secrets:set WHATSAPP_PHONE_ID --project baydal-reservas
   ```
2. Redesplegar para que las funciones cojan la versión nueva:
   ```
   cd C:/Users/David/baydal && firebase deploy --only functions --project baydal-reservas
   ```
3. **Probar**: "hola" por WhatsApp AL NÚMERO NUEVO desde cualquier móvil (ya
   no hace falta estar en la lista de verificados: es un número de
   producción). Paco debe contestar en segundos. Probar también una reserva
   completa y ver que llega la ficha "✅ NUEVA RESERVA" a recepción.

## Fase 4 — Dónde poner el número nuevo (todos los sitios)

| Dónde | Qué poner | Cómo |
|---|---|---|
| **Plugin WordPress** | El número en E.164 sin `+` (ej. `34865XXXXXX`) | wp-admin → Paco (Reservas) → Ajustes → "Número de WhatsApp de Paco" → Guardar. Con esto ya se puede activar el botón flotante si se quiere. |
| **Web estática (rama `web`)** | Constante `WA_PACO` en `build.py` + el cambio del formulario | Seguir [`INTEGRACION_WEB.md`](INTEGRACION_WEB.md) (2 ficheros), regenerar con `python build.py` y republicar en Hostinger. El formulario de /reservas/ pasa de recepción a Paco. |
| **Zadarma** | Desvío de llamadas de VOZ al **965 831 111** | Panel de Zadarma → el número → desvío (~0,012 €/min). AHORA sí: la verificación ya pasó. Así quien LLAME al número de Paco acaba hablando con recepción. |
| **Firestore (opcional)** | Nada | `whatsappHumano` (34677490049) y `telefonoHumano` (34965831111) NO cambian: son recepción, no Paco. |

## Fase 5 — Apagar lo provisional

- El **número de pruebas** de Meta deja de usarse (no hay que darlo de baja,
  simplemente se ignora; el webhook y la app son los mismos).
- Mantener la línea de Zadarma **siempre pagada** (renovación anual ~20 €):
  si caduca, el número se recicla y otro podría re-verificarlo en WhatsApp.
- Cuando todo esté probado: panel → Ajustes → confirmar **Bot activo: ON** y
  avisar al equipo de sala de que las reservas de WhatsApp entran solas
  (chuleta del personal: [`OPERACION.md`](OPERACION.md)).

## Si la verificación de Meta falla con el fijo de Zadarma

Es el riesgo conocido (~poco probable) de los VoIP. Plan B documentado en
[`ALTA_META.md`](ALTA_META.md) paso 4.0: **Twilio** (fijo de Alicante, el
código de verificación aparece escrito en su consola) u **Opción C**:
registrar el propio fijo del restaurante 965 831 111 (gratis, pero ese
número no podrá tener WhatsApp normal mientras esté en la plataforma).
