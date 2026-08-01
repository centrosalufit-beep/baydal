# Estado — Paco (chatbot WhatsApp)

_Última revisión: 01/08/2026 (mediodía) — sesión cortada por tokens; SEGUIR AQUÍ_

## ⚡ PUNTO DE CONTINUACIÓN (01/08)

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

**SIGUIENTE PASO (diseño decidido, sin implementar)** — para que nadie tenga
que escribir "ok" a diario, los avisos a sala pasan a plantilla:
1. Esperar plantillas APPROVED (comprobar:
   `GET graph.facebook.com/v23.0/1361659489375100/message_templates`).
2. **Tarjeta en la WABA NUEVA** (David, en Business Manager → Facturación →
   cuenta del 965 831 111): sin ella las plantillas no salen. La que se puso
   estaba en la WABA vieja.
3. Código: helper `enviarFichaSala(a, campos)` en `whatsapp.ts` — intenta
   plantilla `ficha_reserva` (params: titulo, fecha, hora, personas, nombre,
   telefono, notas; aplanar saltos de línea a " · ", vacíos a "-") y si Meta
   la rechaza (aún no aprobada) cae a `enviarTexto` con la ficha multilínea.
   Usarlo en: `flujo.ts` → `crearReserva`, `crearReservaGrupo`,
   `cancelarReserva` y `escalar` (resumen aplanado en notas); `index.ts` →
   aviso "🔓 Liberada" (L.371) y `resumenDiario` (L.442, aplanado).
4. Mientras tanto (workaround): un "ok" desde 677 490 049 al fijo reabre
   la ventana 24 h.

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
