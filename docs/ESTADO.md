# Estado — Paco (chatbot WhatsApp)

_Última revisión: 01/08/2026 (13:00) — **ventana de 24 h RESUELTA**, ver abajo._

## ✅ CERRADO EL 01/08 (tarde): la ventana de 24 h

El problema de los avisos a sala está **resuelto de punta a punta**:

1. **22 plantillas APPROVED** en la WABA nueva, `ficha_reserva[es]` incluida.
2. **Método de pago añadido a la WABA `1361659489375100`.** Era el bloqueo real:
   `health_status.can_send_message` daba `BLOCKED` con error 141006. Ojo, esto
   no solo tumbaba las fichas a sala: bloqueaba **todas** las plantillas
   proactivas (recordatorios, liberaciones, reseñas) desde el 30/07. Ahora las
   tres entidades (WABA, BUSINESS, APP) dan `AVAILABLE`.
3. **Desplegadas las 7 funciones** con `enviarFichaSala`. Sala recibe cada
   reserva por plantilla; nadie tiene que escribir "ok" a diario.
4. **Reenvío cerrado**: de las 14 reservas creadas desde el 30/07, 6 estaban
   completadas y 5 canceladas; las 3 vivas (Flamao, Ivan, Théo) ya se habían
   reenviado a mano a mediodía. Se mandó un único recordatorio de esas 3 el
   01/08 a las 12:51 (`wamid.HBgLMzQ2Nzc0OTAwNDkVAgARGBI3NUJDNDcwQTI1Mzc5RjQwNjQA`).

**Nota de despliegue**: en máquinas lentas el análisis previo se pasa de los
10 s por defecto y aborta con "Cannot determine backend specification".
Solución: `FUNCTIONS_DISCOVERY_TIMEOUT=120 firebase deploy --only functions`.

El grupo de 150 pax que aparecía como `pendiente` para el 30/07 ("Es posible?")
era un test de David: borrado el 01/08.

## Contexto del problema (histórico, 01/08 mediodía)

**Contexto**: el fijo 965 831 111 ya es el número de Paco y funciona. Al darlo
de alta, Meta creó una **WABA NUEVA: `1361659489375100`** (la vieja
`2004127973561093` solo tiene el número de pruebas). Las fichas a sala
(677 490 049) dejaron de llegar por la **ventana de 24 h** de WhatsApp:
los mensajes libres solo se entregan si recepción escribió al bot en las
últimas 24 h; Meta los descarta EN SILENCIO (ahora el webhook SÍ loguea
`envío FALLIDO` y el WABA id de cada mensaje entrante).

**Hecho el 01/08**:
- Diagnóstico anterior + logs de fallos diferidos desplegados.
- Reenviadas a mano las 3 fichas vivas (1-3/08: Flamao, Ivan, Théo).
- **21 plantillas creadas en la WABA nueva** (4 clientes × 5 idiomas +
  `ficha_reserva` es para sala), todas **PENDING** a mediodía del 01/08.
  `scripts/plantillas.mjs` ya apunta a la WABA nueva.
- Nombre visible "Baydal reservas" APROBADO; perfil del número completo
  (logo 640×640, dirección, web, descripción, vertical RESTAURANT).

**CÓDIGO IMPLEMENTADO Y DESPLEGADO (01/08 tarde)** — los avisos a sala van por
plantilla:
- `enviarFichaSala(a, campos, respaldo?)` en `whatsapp.ts`: intenta la plantilla
  `ficha_reserva` (7 params: titulo, fecha, hora, personas, nombre, telefono,
  notas; saltos de línea → " · ", vacíos → "-", corte a 1000 caracteres) y si
  Meta la rechaza cae a `enviarTexto`. Ya en uso en `flujo.ts` (`crearReserva`,
  `crearReservaGrupo`, `cancelarReserva`, `escalar`) e `index.ts` (aviso
  "🔓 LIBERADA" y `resumenDiario`, ambos aplanados en NOTAS).
- 3 tests nuevos en `whatsapp.test.ts` (58 en verde en total).
- `scripts/reenviar-fichas.mjs`: manda a sala la lista de reservas perdidas en
  un solo mensaje (simulación por defecto; `--enviar`, `--desde`).

**Comprobaciones útiles** (con `$env:WHATSAPP_TOKEN` cargado desde el secret):

```
# ¿puede la WABA enviar plantillas? (aquí se ve un impago)
(irm "https://graph.facebook.com/v23.0/1361659489375100?fields=health_status" -Headers @{Authorization="Bearer $env:WHATSAPP_TOKEN"}).health_status | ConvertTo-Json -Depth 8

# estado de aprobación de las plantillas
(irm "https://graph.facebook.com/v23.0/1361659489375100/message_templates?fields=name,language,status&limit=100" -Headers @{Authorization="Bearer $env:WHATSAPP_TOKEN"}).data | Format-Table
```

## Hecho el 30/07/2026

- **Fase 0 de NUMERO_FIJO.md COMPLETADA**: créditos Anthropic recargados (25 $),
  token permanente de system user cargado y redesplegado, plantillas 19/20
  APPROVED (falta `pedir_resena` de, en revisión). **EL BOT VUELVE A FUNCIONAR**
  y el flujo completo se ha probado con éxito ("ha ido de maravilla").
- Horario real de verano en Firestore: comida y cena TODOS los días
  (`scripts/horario-agosto.mjs`); el seed traía cena solo vie/sáb y Paco
  rechazaba cenas entre semana.
- Pulido tras pruebas reales: notas se anotan tal cual (celíacos/trona
  escalaba), idioma pegajoso (saltaba a valenciano), sin "terraza" en la
  pregunta de notas, aviso de cortesía como mensaje aparte (la confirmación
  decía "la mesa 15 min" y se leía "mesa nº 15").
- infoPractica: añadidas opciones sin gluten para celíacos.
- Pin de ubicación corregido: caía al mar; ahora 38.639563, 0.070688
  (plus code J3QC+R7 de la ficha de Google).

## Resumen

Rama `chatbot-wordpress`. **EL BOT FUNCIONA** sobre el número de pruebas de
Meta (+1 555 656 6087) con token permanente, horario real y flujo probado a
fondo el 30/07 con datos reales.

**Decisión 29/07**: el número definitivo de Paco será el propio fijo del
restaurante **965 831 111** (Opción C, coste 0 €). Guía completa:
[`NUMERO_FIJO.md`](NUMERO_FIJO.md) (Fase 0 ya hecha). Zadarma queda como plan B.

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
- **NÚMERO DEFINITIVO ACTIVO (30/07)**: el fijo **965 831 111**, Phone ID
  `1149583188249281`, VERIFIED + CONNECTED en Cloud API, nombre verificado
  "Restaurante Baydal". Secret `WHATSAPP_PHONE_ID` actualizado y desplegado.
- Los 7 secrets cargados y funcionando. Copias locales de David (Escritorio):
  `paco-api-token.txt` (token del plugin) y `verify-token.txt` (webhook).

## Pendiente

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
