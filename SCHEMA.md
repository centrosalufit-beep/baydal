# Baydal Reservas — Esquema de datos y contratos (v1 "Paco")

Sistema de reservas del Restaurante Baydal (Calpe) vía chatbot de WhatsApp ("Paco") + panel de gestión web.
Este documento es el **contrato único** entre módulos. Cualquier cambio de modelo se hace aquí primero.

## Stack

- **Firebase**: proyecto `baydal-reservas` (plan Blaze). Región funciones: `europe-southwest1` (las scheduled en `europe-west1`, Cloud Scheduler no soporta southwest — lección aprendida del bot Salufit).
- **Cloud Functions Gen 2, Node 20, TypeScript** en `functions/`.
- **Firestore** (modo nativo, región `eur3`).
- **Firebase Hosting** para el panel (`panel/` → público). Dominio final: `panel.baydal.es` (CNAME desde Hostinger).
- **WhatsApp Business Platform (Cloud API) v23.0**, número NUEVO dedicado al bot (pendiente de alta; desarrollo con número de pruebas de Meta).
- **Claude Haiku** (`claude-haiku-4-5-20251001`) SOLO para: interpretar texto libre → intención+datos, y responder preguntas de carta/horarios/info práctica. El flujo de reserva es una máquina de estados determinista con botones.
- **Whisper (OpenAI, `whisper-1`)** para transcribir notas de voz → el texto entra al flujo normal.
- **Secrets** (Google Secret Manager): `WHATSAPP_TOKEN`, `WHATSAPP_APP_SECRET`, `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_PHONE_ID`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `WP_API_TOKEN` (API del plugin de WordPress).

## Convenciones

- Fechas: string `YYYY-MM-DD` (zona `Europe/Madrid` SIEMPRE — nunca UTC para lógica de negocio).
- Horas: string `HH:mm` (24h).
- Teléfonos: E.164 sin `+` (p.ej. `34677490049`), igual que los entrega Meta.
- Idiomas soportados: `es | va | en | de | fr` (castellano, valencià, inglés, alemán, francés). Textos del bot en `functions/src/textos.ts`. Detección: Claude detecta el idioma del primer mensaje; default `es`.
- **Tono**: el bot se llama **Paco**, se presenta como asistente automático del Baydal, **tutea** en castellano y valencià, cercano y breve, algún emoji 🥘.
- Docs Firestore con `creadoEn`/`actualizadoEn` (Timestamp servidor).

## Colecciones Firestore

### `config/restaurante` (doc único)
```ts
{
  nombre: string,            // "Restaurante Baydal"
  nombreBot: string,         // "Paco"
  telefonoHumano: string,    // "34965831111" — teléfono que Paco da para llamar
  whatsappHumano: string,    // "34677490049" — WhatsApp de recepción (Jose): escalados, avisos, resumen
  botActivo: boolean,        // interruptor general: si false, Paco responde cortesía con el teléfono
  antelacionMaxDias: number, // 30 — hasta cuándo se puede reservar
  antelacionMinHoras: number,// 2 — mismo día sí, hasta 2 h antes de la hora de entrada
  slotMinutos: number,       // 30 — granularidad de horas ofertadas
  maxComensalesBot: number,  // 20 — por encima, flujo GRUPO (recoge datos → pendiente + escala)
  maxReservasActivas: number,// 2 — reservas futuras vivas (confirmada|pendiente) por teléfono vía bot
  cortesiaMin: number,       // 15 — "te guardamos la mesa 15 min" (solo texto; sala decide)
  atencionHumana: { inicio: string, fin: string }, // "10:00"–"23:00": fuera, los escalados van al buzón
  enlaceResenas: string,     // URL directa de reseña Google (https://g.page/r/…/review)
  infoPractica: string,      // texto libre (parking, perros, tronas, acceso…) — única fuente de Claude para dudas prácticas
  ubicacion: { lat: number, lng: number, direccion: string }, // pin que se envía al confirmar
  horario: {                 // por día de semana: 0=domingo ... 6=sábado
    [dia: string]: {         // clave "0".."6"
      comida: { inicio: string, fin: string } | null,  // null = cerrado ese turno
      cena:   { inicio: string, fin: string } | null,
    }
  },
  // inicio/fin = rango de HORAS DE ENTRADA aceptadas (fin = última entrada, no cierre de cocina)
}
```
(`duracionReservaMin` ya no existe: la ocupación es POR TURNO — ver motor.)

### `festivos/{YYYY-MM-DD}` — cierres puntuales. Hacer/deshacer = crear/borrar doc.
```ts
{ motivo: string, cerrado: 'todo' | 'comida' | 'cena' }
```

### `zonas/{zonaId}`
```ts
{ nombre: string, orden: number, activa: boolean }   // "Terraza", "Interior"
```

### `mesas/{mesaId}`
```ts
{
  zonaId: string,
  nombre: string,          // "T1", "Mesa 12"
  capacidadMin: number,    // no sentar 2 en mesa de 8 si hay alternativa
  capacidadMax: number,
  combinable: boolean,     // puede unirse con otras combinables de la MISMA zona (hasta 3)
  activa: boolean,         // false = fuera de servicio
}
```

### `reservas/{reservaId}` (id autogenerado)
```ts
{
  fecha: string,            // YYYY-MM-DD
  hora: string,             // HH:mm — hora de entrada
  turno: 'comida' | 'cena',
  comensales: number,
  nombre: string,
  telefono: string,         // E.164 sin +
  email: string,            // '' si no lo dio (paso opcional)
  mesaIds: string[],        // 1–3 mesas; [] en pendientes de grupo (las asigna sala)
  estado: 'pendiente' | 'confirmada' | 'cancelada' | 'noshow' | 'completada',
  motivoPendiente?: 'grupo' | 'reincidente',  // solo si estado inicial fue pendiente
  origen: 'bot' | 'panel' | 'web',
  idioma: 'es' | 'va' | 'en' | 'de' | 'fr',
  notas: string,
  recordatorioEnviado: boolean,
  confirmadaCliente: boolean,     // true si pulsó Confirmar en el recordatorio; true de serie si la reserva se creó el MISMO día
  avisoLiberacionEnviado: boolean,
  pedirResena: boolean,           // lo pone el panel (botón ⭐); el trigger envía y…
  resenaPedidaEn?: Timestamp,     // …marca aquí para no repetir jamás
  creadoEn, actualizadoEn: Timestamp,
}
```
Índices compuestos: `reservas(fecha ASC, estado ASC)` y `reservas(telefono ASC, estado ASC, fecha ASC)`.

### `clientes/{telefono}` — histórico mínimo por cliente
```ts
{ nombre: string, email: string, noshows: number, actualizadoEn: Timestamp }
```
`noshows` lo incrementa el trigger cuando el panel marca una reserva como no-show. Con `noshows >= 2`, las reservas del bot de ese teléfono nacen `pendiente` (`motivoPendiente:'reincidente'`, CON mesa asignada) y sala decide en el panel; el cliente ve "te confirmamos enseguida".

### `carta/{seccionId}`
```ts
{
  nombre: { es, va, en, de, fr: string },
  orden: number,
  visible: boolean,
  items: Array<{
    nombre: { es, va, en, de, fr: string },
    descripcion?: { es, va, en, de, fr: string },
    precio: number,          // EUR; 0 = "s/m"
    porPersona: boolean,     // arroces: precio por persona, mínimo 2
    disponible: boolean,
    alergenos?: string[],
  }>
}
```

### `conversaciones/{telefono}` — estado del flujo del bot
```ts
{
  paso: 'IDLE' | 'FECHA' | 'TURNO' | 'HORA' | 'COMENSALES' | 'COMENSALES_TEXTO' | 'NOMBRE' | 'EMAIL'
      | 'NOTAS' | 'CONFIRMAR' | 'GRUPO_DATOS' | 'CANCELAR_ELEGIR' | 'ESPERANDO_HUMANO',
  idioma: 'es' | 'va' | 'en' | 'de' | 'fr',
  baja: boolean,              // BAJA/STOP: jamás mensajes proactivos (recordatorio, reseña…)
  borrador: { fecha?, turno?, hora?, comensales?, nombre?, email?, notas? },
  actualizadoEn: Timestamp,   // si > 30 min, el flujo se reinicia
}
```

### `procesados/{messageId}` — idempotencia webhook. `{ creadoEn }`.

### `avisosPendientes/{id}` — buzón nocturno
Escalados ocurridos fuera de `atencionHumana` NO suenan en el móvil de Jose: se guardan aquí
`{ telefono, resumen, creadoEn }` y el `resumenDiario` de las 9:30 los entrega y los borra.

## Motor de disponibilidad (functions/src/disponibilidad.ts)

Funciones puras (testeables sin Firestore) + wrapper que carga datos. **La ocupación es POR TURNO**: una reserva
posee sus mesas todo el turno (sin segunda sentada); la `hora` es solo la hora de entrada.

```
horasDelTurno(config, fecha, turno, festivo?) -> string[]   // slots de entrada; [] si festivo/cerrado; aplica antelacionMin/Max
mesasLibres(mesas, reservasDelDia, turno) -> Mesa[]
     // libre = ninguna reserva con estado ∈ {confirmada, pendiente} y mesaIds no vacío en ese fecha+turno la usa
asignarMesa(mesasLibres, comensales) -> string[] | null
     // 1) una mesa: capacidadMin <= pax <= capacidadMax, la de MENOR capacidadMax
     // 2) pareja combinable de la misma zona, suma capacidadMax >= pax, menor suma
     // 3) trío combinable de la misma zona, menor suma   // techo: 4+ mesas = manual en panel
horasDisponibles(...) -> string[]   // slots donde asignarMesa != null — lo que ve el cliente
```

**Anti carrera**: la creación de la reserva va en **transacción** que relee las reservas del día+turno y
reintenta la asignación; además revalida horario/festivo. Si ya no cabe → ofrecer alternativas.

## Máquina de estados del bot (functions/src/flujo.ts)

Webhook POST → firma HMAC → idempotencia `messageId` → procesar → 200 al terminar (tras responder, Cloud Run corta la CPU: nada de "background"; los reintentos de Meta los absorbe `procesados/`).

- `botActivo:false` → cortesía con teléfono y fin.
- Listas máx 10 filas, botones máx 3. Payloads: `fecha_YYYY-MM-DD`, `fecha_otra`, `turno_comida|cena`,
  `hora_HH:mm`, `pax_1..8`, `pax_mas`, `nombre_perfil`, `email_saltar`, `notas_no`, `conf_si`, `conf_no`,
  `res_cancelar_<id>`, `rec_conf_<id>`, `rec_cancel_<id>`, `menu_reservar`, `menu_carta`, `menu_humano`, `menu_volver`.
- **Texto libre** (en cualquier paso) → Claude clasifica `{intencion: reservar|cancelar|modificar|carta|horarios|info|humano|otro, datos:{fecha?,turno?,hora?,comensales?}, idioma}` y el flujo salta pasos ya cubiertos.
- **Audio** → descargar media de Meta → Whisper → tratar como texto. Si falla la transcripción → "¿me lo escribes? 🙏".
- **Mensaje de la web** (origen formulario baydal.es, ver docs/INTEGRACION_WEB.md): formato determinista
  `RESERVA WEB` + líneas `fecha:/turno:/hora:/personas:/nombre:` → se parsea SIN IA y salta directo a CONFIRMAR (o al primer dato que falte).
- Pasos: FECHA (hoy, mañana, próximos días + "otra fecha") → TURNO → HORA (`horasDisponibles`; si vacío → alternativas: otras horas del día, o 2-3 próximos días con hueco) → COMENSALES (lista 1..8 + "más de 8" → COMENSALES_TEXTO pide el número: ≤20 sigue normal; >20 → GRUPO_DATOS) → NOMBRE (botón con nombre del perfil) → EMAIL ("¿nos dejas un email? (opcional)" + botón saltar) → NOTAS → CONFIRMAR.
- **Límite por teléfono**: al iniciar reserva, si ya tiene `maxReservasActivas` futuras vivas → no deja crear otra; ofrece verlas/cancelarlas o llamar.
- **GRUPO_DATOS** (>20 pax): recoge fecha/turno/hora deseada/nombre → reserva `pendiente` `motivoPendiente:'grupo'` SIN mesas → escala a Jose con todo → "¡Genial! Os confirmamos enseguida 💪".
- **Reincidente** (`clientes.noshows>=2`): el flujo es idéntico pero la reserva nace `pendiente` (CON mesa) y el cliente ve "te confirmamos enseguida" — sala decide en panel.
- Confirmación → transacción → resumen + "te guardamos la mesa {cortesiaMin} min" + **pin de ubicación** + cómo cancelar. Reserva creada para el MISMO día → `confirmadaCliente:true`.
- **Aviso a sala**: CADA reserva y cancelación del bot → WhatsApp inmediato a `whatsappHumano` ("Nueva: sáb 20/07 comida 14:00 · 4 pax · María · T3"). (Los avisos operativos van siempre; la franja `atencionHumana` solo aplica a escalados que esperan respuesta humana.)
- `cancelar` → lista de sus reservas futuras vivas → botón → `cancelada` (la mesa se libera sola) + aviso a sala.
- `modificar` = cancelar + reserva nueva.
- `carta` → Claude con carta de Firestore + enlace a la carta de baydal.es. `info` → Claude SOLO con `config.infoPractica`; si la respuesta no está ahí → escalar. `horarios` → de config.
- Escalar dentro de `atencionHumana` → aviso inmediato a Jose; fuera → `avisosPendientes` + "el equipo te responde a partir de las {inicio} 👋". Paso ESPERANDO_HUMANO: 4 h de silencio salvo `menu_volver`.
- Primer mensaje: presentación de Paco (asistente automático) + línea RGPD + "escribe BAJA para no recibir mensajes". BAJA/STOP → `conversaciones.baja:true` (sin recordatorios, sin reseñas, sin proactivos; sí puede seguir reservando si escribe él).

## Ciclo recordatorio → confirmación → liberación

1. `recordatorios` (día antes, 10:07): plantilla `recordatorio_reserva` con botones Confirmar (`rec_conf_<id>`) / Cancelar (`rec_cancel_<id>`) a reservas confirmadas de MAÑANA con `recordatorioEnviado:false` y sin `baja`. Marca `recordatorioEnviado:true`.
2. `rec_conf_<id>` → `confirmadaCliente:true`. `rec_cancel_<id>` → cancelada + aviso a sala.
3. `liberarNoConfirmadas` (cada 15 min, solo reservas de HOY con `recordatorioEnviado:true && !confirmadaCliente && estado confirmada`):
   - a falta de ≤4 h para la hora de entrada y `!avisoLiberacionEnviado` → plantilla `aviso_liberacion` ("confirma antes de las {hora-2h} o la mesa se libera") y marca el aviso;
   - a falta de ≤2 h y sigue sin confirmar → `cancelada` + plantilla `reserva_liberada` + aviso a sala.
   - Reservas sin recordatorio enviado (creadas tarde) NUNCA se liberan solas.

## Reseñas Google (palanca SEO)

En el panel, cada reserva del día tiene botón **⭐ Pedir reseña** (solo mesas contentas, criterio del personal).
El panel pone `pedirResena:true` → el trigger `onReservaActualizada` envía al cliente el mensaje con
`config.enlaceResenas` (mensaje libre si la ventana de 24 h está abierta; si Meta devuelve fuera-de-ventana →
plantilla `pedir_resena`) y sella `resenaPedidaEn`. Nunca dos veces, nunca con `baja:true`.

## Funciones desplegadas

| Función | Tipo | Región | Qué hace |
|---|---|---|---|
| `whatsappWebhook` | HTTP | europe-southwest1 | GET verificación Meta, POST mensajes |
| `wpApi` | HTTP | europe-southwest1 | API con token Bearer (secret `WP_API_TOKEN`) para el plugin de WordPress: GET/POST/PUT/DELETE `/carta`, GET/PUT `/horario` y `/info` — solo carta y esos dos campos de `config/restaurante`; reservas/clientes/conversaciones inalcanzables |
| `onReservaActualizada` | trigger Firestore onDocumentUpdated `reservas/{id}` | europe-southwest1 | panel→noshow: incrementa `clientes.noshows`; pendiente→confirmada (origen bot/web): notifica al cliente; confirmada→cancelada desde panel con fecha futura (origen bot/web): notifica al cliente; `pedirResena` a true: envía petición de reseña |
| `recordatorios` | scheduled 10:07 | europe-west1 | plantilla recordatorio + botones (ciclo arriba) |
| `liberarNoConfirmadas` | scheduled cada 15 min | europe-west1 | aviso T-4h y liberación T-2h (ciclo arriba) |
| `resumenDiario` | scheduled 09:31 | europe-west1 | a `whatsappHumano`: reservas de hoy por turno (nº y pax), cuántas sin confirmar, pendientes de decidir, y buzón nocturno (`avisosPendientes`, que vacía) |
| `limpieza` | scheduled 03:11 | europe-west1 | `procesados`>7d; reservas pasadas confirmadas→`completada`; RGPD: `conversaciones` inactivas >6 meses y `reservas` >2 años se borran |

## Plantillas Meta a aprobar (es/va/en/de/fr — ver docs/ALTA_META.md)

`recordatorio_reserva` (botones Confirmar/Cancelar), `aviso_liberacion`, `reserva_liberada`, `pedir_resena`.

## Panel (panel/ — HTML+JS vanilla, Firebase SDK modular CDN, sin build)

Login: Firebase Auth email/contraseña. Reglas: todo requiere `request.auth != null`; functions usan Admin SDK.

Vistas (SPA, pestañas):
1. **Agenda**: selector de día; PRIMERO las `pendiente` destacadas (ámbar) con botones Confirmar (asigna mesa con disponibilidad.js si no tiene; si es grupo sin mesa, el personal elige mesas) / Rechazar; después confirmadas por turno con nombre/pax/mesas/tel (wa.me)/email/notas, badge ✓ si `confirmadaCliente`; acciones: cancelar, no-show, completada, cambiar mesa, **⭐ Pedir reseña** (desactivado si `resenaPedidaEn`); contador reservas+pax por turno; **+ Nueva reserva** manual (valida con disponibilidad.js; sin límite de 2 ni antelaciones: eso es solo del bot); **Exportar CSV** del mes visible (fecha, hora, turno, pax, nombre, teléfono, email, estado, origen, mesas, notas).
2. **Mesas**: CRUD zonas y mesas.
3. **Horarios**: 7 días × 2 turnos (cambio de temporada = editar aquí).
4. **Festivos**: añadir fecha/motivo/turno; borrar = reabrir.
5. **Carta**: secciones/items, precios, toggles, **5 idiomas** (pestañitas es/va/en/de/fr).
6. **Estadísticas**: últimas 8 semanas — reservas y pax por semana, % no-show, origen bot/panel/web, reparto de idiomas. Cálculo en cliente sobre `reservas` del rango.
7. **Ajustes**: botActivo (interruptor grande), nombreBot, maxComensalesBot, maxReservasActivas, slotMinutos, antelaciones, cortesiaMin, atencionHumana, teléfonos, enlaceResenas, ubicación (lat/lng/dirección), **infoPractica** (textarea grande).

`panel/disponibilidad.js`: espejo JS del motor TS (ocupación por turno, tríos combinables). // ponytail: duplicado consciente; futura callable si duele.

La **carta**, los **horarios** y la **infoPractica** también se editan desde el WordPress de baydal.es (plugin `wordpress/paco-chatbot/` → función `wpApi`, ver `docs/INTEGRACION_WP.md`): panel y WordPress escriben lo mismo y vale el último guardado.

## Textos del bot

`functions/src/textos.ts`: `t(idioma, clave, params)` con tabla completa **es/va/en/de/fr**. Paco tutea en es/va;
en/de/fr registro estándar cordial. Nombre del bot, restaurante y datos SIEMPRE desde `config` (no hardcodear).

## Qué NO entra en v1 (decidido)

- Pago/señal (si los no-shows de grupos duelen: Bizum manual verificado por Jose, como Salufit).
- Integración TheFork/agendas externas; edición de reserva in situ; combinación de 4+ mesas; lista de espera.
- Temporadas programadas (el horario se cambia a mano en el panel).
