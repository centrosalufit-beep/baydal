# Baydal Reservas

Sistema de reservas del **Restaurante Baydal** (Calpe):

- **Paco, el bot de WhatsApp**: los clientes reservan mesa hablando con el número de WhatsApp del restaurante, en **5 idiomas** (castellano, valencià, inglés, alemán y francés). El flujo va con botones (fecha, turno, hora, comensales…); una IA (Claude Haiku) solo interpreta el texto libre y responde preguntas de carta/horarios/info práctica, y las notas de voz se transcriben con Whisper.
- **Panel web** (`panel.baydal.es`): el personal ve la agenda del día, decide las reservas pendientes, mete reservas de teléfono, marca no-shows, pide reseñas, cierra festivos, cambia horarios y edita la carta.

El contrato de datos (colecciones, campos, convenciones) está en [`SCHEMA.md`](SCHEMA.md). Ese documento manda.

## Qué hace

| Función | Detalle |
|---|---|
| Reservas por WhatsApp | Botones + texto libre + notas de voz, 5 idiomas, hasta 20 comensales (más = grupo pendiente para sala) |
| Recordatorio | El día antes, plantilla con botones Confirmar / Cancelar |
| Liberación automática | Reserva del día sin confirmar: aviso 4 h antes y mesa liberada 2 h antes |
| Reseñas Google | Botón ⭐ en el panel: Paco manda al cliente el enlace directo de reseña |
| Resumen diario | A las 9:31, WhatsApp a recepción con el día y el buzón nocturno |
| Reservas desde baydal.es | El formulario de la web abre el chat de Paco con los datos ya puestos ([`docs/INTEGRACION_WEB.md`](docs/INTEGRACION_WEB.md)) |
| Plugin de WordPress | En baydal.es: formulario de reservas (shortcode), botón flotante y edición de carta, horarios e info práctica sin entrar al panel ([`docs/INTEGRACION_WP.md`](docs/INTEGRACION_WP.md)) |
| Panel | Agenda con pendientes en ámbar, mesas, horarios, festivos, carta en 5 idiomas, estadísticas y exportar CSV |

## Arquitectura

```
 Cliente                     Meta                    Firebase (proyecto baydal-reservas)
┌───────────┐  mensaje   ┌─────────────┐  webhook  ┌─────────────────────────────────┐
│ WhatsApp  ├───────────►│  WhatsApp   ├──────────►│ whatsappWebhook (Cloud Function)│
│ del       │◄───────────┤  Cloud API  │◄──────────┤  · máquina de estados (botones) │
│ cliente   │  respuesta └─────────────┘  envíos   │  · Claude Haiku (texto libre)   │
└───────────┘                                      │  · Whisper (notas de voz)       │
                                                   │                │                │
                                                   │        Firestore (eur3)         │
┌───────────┐   https://panel.baydal.es            │  reservas · mesas · carta ·     │
│ Personal  ├─────────────────────────────────────►│  horarios · festivos · config   │
│ del resto.│      (Firebase Hosting + Auth)       │                │                │
└───────────┘                                      │ recordatorios · liberación ·    │
                                                   │ resumen · limpieza (programadas)│
                                                   └─────────────────────────────────┘
```

## Estructura de carpetas

```
baydal-reservas/
├── SCHEMA.md               ← contrato de datos y flujos (leer primero)
├── README.md               ← este documento
├── firebase.json           ← configuración de despliegue Firebase
├── firestore.rules         ← reglas de seguridad de Firestore
├── firestore.indexes.json  ← índices compuestos de Firestore
├── functions/              ← Cloud Functions (TypeScript): Paco, recordatorios, liberación, resumen, limpieza
├── panel/                  ← panel web del personal (HTML+JS, sin build)
├── scripts/
│   └── seed.mjs            ← carga de datos iniciales (config, zonas, mesas, carta)
├── wordpress/
│   └── paco-chatbot/       ← plugin para el WordPress de baydal.es (formulario + carta/horarios/info)
└── docs/
    ├── ALTA_META.md        ← alta en WhatsApp Business Platform y plantillas paso a paso
    ├── OPERACION.md        ← chuleta diaria para el personal
    ├── INTEGRACION_WEB.md  ← conectar el formulario de baydal.es con Paco
    └── INTEGRACION_WP.md   ← instalar y usar el plugin de WordPress
```

## Puesta en marcha completa (paso a paso)

Pensada para hacerla **acompañado** de alguien con algo de soltura con el ordenador.
Tiempo estimado: una tarde. Se hace **una sola vez**.

### 0. Qué necesitas antes de empezar

- Una cuenta de Google (Gmail) del restaurante.
- Una tarjeta de crédito/débito (el plan Blaze de Firebase la pide; el gasto real es de céntimos, ver [Costes](#costes-estimados-al-mes)).
- Un ordenador con [Node.js 20](https://nodejs.org) instalado (instalador "LTS", siguiente-siguiente-finalizar).
- Cuenta de Meta Business y API de WhatsApp: eso va aparte, en [`docs/ALTA_META.md`](docs/ALTA_META.md). Puedes hacerlo antes o después de esta guía.
- Una API key de Anthropic (para Claude): se crea en <https://console.anthropic.com> → API Keys.
- Una API key de OpenAI (para Whisper, que transcribe las notas de voz): <https://platform.openai.com> → API keys.

### 1. Crear el proyecto Firebase

1. Entra en <https://console.firebase.google.com> con la cuenta de Google del restaurante.
2. **Añadir proyecto** → nombre: `baydal-reservas`. Si Google le añade un sufijo (p. ej. `baydal-reservas-a1b2c`), apunta el **ID exacto**: lo usarás en los comandos.
3. Google Analytics: **desactivar** (no hace falta).

### 2. Activar el plan Blaze

1. En la consola de Firebase, abajo a la izquierda: **Mejorar** (o "Upgrade") → plan **Blaze** (pago por uso).
2. Introduce la tarjeta. Recomendado: crear un **presupuesto de alerta** de 25 €/mes para recibir aviso por correo si algo se dispara.

> Blaze es obligatorio para Cloud Functions y los secrets. Con el uso del restaurante, la factura normal es de 0 a pocos euros.

### 3. Crear Firestore (la base de datos)

1. Menú lateral → **Compilación → Firestore Database** → **Crear base de datos**.
2. Región: **eur3 (Europa)** — importante, no se puede cambiar después.
3. Modo: **producción** (las reglas ya vienen en este repositorio y se suben en el paso 7).

### 4. Activar Authentication y crear el usuario del panel

1. Menú lateral → **Compilación → Authentication** → **Comenzar**.
2. Método de acceso: **Correo electrónico/contraseña** → habilitar → guardar.
3. Pestaña **Users** → **Agregar usuario**: el correo del restaurante y una contraseña larga y apuntada en lugar seguro. Con ese usuario se entra al panel.
   (Si más adelante hace falta otro usuario para otra persona, se crea igual, aquí a mano.)

### 5. Activar Hosting

Menú lateral → **Compilación → Hosting** → **Comenzar** → siguiente hasta el final (los comandos que muestra ya los haremos nosotros en el paso 7).

### 6. Preparar el ordenador e instalar dependencias

Abre una terminal (en Windows: buscar "PowerShell") y ejecuta, una línea cada vez:

```
npm install -g firebase-tools
firebase login
```

(`firebase login` abre el navegador: entra con la cuenta de Google del restaurante.)

Después, sitúate en la carpeta del proyecto e instala las dependencias de las funciones:

```
cd C:\Users\centr\Documents\GitHub\baydal-reservas
cd functions
npm install
cd ..
```

### 7. Cargar los secrets (las 7 claves)

Los secrets son las contraseñas que usan las funciones. Se cargan una a una; cada comando
pide el valor por teclado (no queda en el historial). Los 4 de WhatsApp salen de la guía
[`docs/ALTA_META.md`](docs/ALTA_META.md); los de Anthropic y OpenAI, del paso 0; los dos
últimos los inventas tú (ver notas).

```
firebase functions:secrets:set WHATSAPP_TOKEN --project baydal-reservas
firebase functions:secrets:set WHATSAPP_APP_SECRET --project baydal-reservas
firebase functions:secrets:set WHATSAPP_VERIFY_TOKEN --project baydal-reservas
firebase functions:secrets:set WHATSAPP_PHONE_ID --project baydal-reservas
firebase functions:secrets:set ANTHROPIC_API_KEY --project baydal-reservas
firebase functions:secrets:set OPENAI_API_KEY --project baydal-reservas
firebase functions:secrets:set WP_API_TOKEN --project baydal-reservas
```

> `WHATSAPP_VERIFY_TOKEN` lo inventas tú: una frase larga sin espacios (p. ej. generada en un gestor de contraseñas). Es la misma que se pega luego en Meta al configurar el webhook.
>
> `WP_API_TOKEN` también lo inventas tú (otra frase aleatoria larga, distinta): es el token con el que el plugin de WordPress edita carta/horarios/info, y se pega luego en los ajustes del plugin ([`docs/INTEGRACION_WP.md`](docs/INTEGRACION_WP.md)).
>
> Si tu ID de proyecto tiene sufijo, usa ese ID en `--project`.

### 8. Desplegar

Desde la carpeta raíz del proyecto:

```
firebase deploy --project baydal-reservas
```

Sube las reglas e índices de Firestore, las funciones y el panel. La primera vez tarda varios minutos.
Al terminar, muestra la **URL de la función `whatsappWebhook`**: cópiala, la necesitarás en `docs/ALTA_META.md`.

### 9. Cargar los datos iniciales (seed)

El script `scripts/seed.mjs` crea la configuración del restaurante, las zonas, 12 mesas de
ejemplo y una carta de muestra. Es **idempotente**: si algo ya existe, no lo toca
(con `--force` sí lo sobrescribe).

Primero, dale credenciales de administrador (opción sencilla, con un fichero de clave):

1. Consola Firebase → rueda dentada → **Configuración del proyecto → Cuentas de servicio → Generar nueva clave privada**.
2. Guarda el fichero como `serviceAccountKey.json` **dentro de la carpeta del proyecto** (está en `.gitignore`, no se sube a ningún sitio).
3. En la terminal (PowerShell):

```
$env:GOOGLE_APPLICATION_CREDENTIALS = "C:\Users\centr\Documents\GitHub\baydal-reservas\serviceAccountKey.json"
node scripts/seed.mjs
```

(Alternativa para quien tenga `gcloud` instalado: `gcloud auth application-default login` y ejecutar el script sin más.)

Después del seed, revisa en el panel las mesas y horarios reales del restaurante: los del seed son un punto de partida.
**El bot arranca apagado** (`botActivo: false`): se enciende desde el panel → Ajustes cuando todo esté probado.

### 10. Conectar el dominio panel.baydal.es

1. Consola Firebase → **Hosting → Agregar dominio personalizado** → escribe `panel.baydal.es`.
2. Firebase te mostrará uno o dos registros DNS (normalmente un TXT de verificación y un CNAME o registros A). Déjala abierta.
3. En otra pestaña, entra en **Hostinger** (donde está el dominio baydal.es) → Dominios → baydal.es → **Zona DNS** → añade **exactamente** los registros que muestra Firebase (para un subdominio como `panel` lo habitual es un **CNAME** con nombre `panel` apuntando al destino que indique Firebase).
4. Vuelve a Firebase y pulsa **Verificar**. Puede tardar de minutos a unas horas en propagarse. El certificado https lo emite Firebase solo.
5. **Enlace discreto en la web**: en el WordPress de baydal.es → Apariencia → (menú o widget del pie de página) → añadir enlace "Acceso personal" → `https://panel.baydal.es`. Que quede en el footer, pequeño; es solo para el equipo.

### 11. Comprobación final

- Abre `https://panel.baydal.es`, entra con el usuario del paso 4 y revisa que se ve la agenda.
- Sigue [`docs/ALTA_META.md`](docs/ALTA_META.md) para conectar WhatsApp y probar el bot con el número de pruebas.
- Cuando el número definitivo esté dado de alta y probado: panel → Ajustes → **Bot activo: ON**.

## Costes estimados al mes

| Concepto | Estimación | Notas |
|---|---|---|
| Meta / WhatsApp | ~0–15 € | Las conversaciones que inicia el **cliente** (reservar, preguntar) son de servicio: **gratis**. Se pagan solo las plantillas (recordatorios, avisos de liberación, reseñas; ~0,04 €/mensaje): con ~300 plantillas/mes, ~12 €. |
| Firebase (Blaze) | ~0–5 € | Con este volumen se está dentro o muy cerca de la capa gratuita. |
| Claude Haiku | ~1–3 € | Solo interpreta texto libre y preguntas de carta; son céntimos por mensaje. |
| OpenAI Whisper | ~0–1 € | Solo notas de voz: ~0,006 $ por minuto de audio. |
| **Total** | **~5–20 €/mes** | Más el coste de la línea del número nuevo, si lo lleva. |

## Datos y RGPD

- Paco se presenta en el primer mensaje como asistente automático, con la línea RGPD y la opción **BAJA/STOP** (el cliente deja de recibir mensajes proactivos: recordatorios, reseñas…).
- Retención automática (función `limpieza`, cada noche): las **conversaciones** inactivas se borran a los **6 meses**; las **reservas**, a los **2 años**.

## Qué falta decidir

- **El número NUEVO definitivo del bot**: qué línea contratar (móvil, fijo o número virtual). Requisito de Meta: que **no** tenga WhatsApp ya activo y que pueda recibir un SMS o llamada de verificación. Recomendado: contratarla con **desvío de llamadas al 965 831 111** (ver `docs/ALTA_META.md`). Mientras tanto, el desarrollo funciona con el número de pruebas de Meta.

## Documentación

- [`SCHEMA.md`](SCHEMA.md) — contrato de datos y flujos (para quien desarrolle).
- [`docs/ALTA_META.md`](docs/ALTA_META.md) — alta en WhatsApp Business Platform, webhook y las 4 plantillas en 5 idiomas.
- [`docs/OPERACION.md`](docs/OPERACION.md) — chuleta de uso diario para el personal.
- [`docs/INTEGRACION_WEB.md`](docs/INTEGRACION_WEB.md) — encargo para conectar el formulario de baydal.es con Paco.
- [`docs/INTEGRACION_WP.md`](docs/INTEGRACION_WP.md) — instalar y usar el plugin de WordPress (formulario + carta/horarios/info).
