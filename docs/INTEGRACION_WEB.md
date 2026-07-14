# Integración del formulario de reservas de baydal.es con Paco

Encargo autocontenido: conectar el formulario de reservas de la web **baydal.es** con **Paco**,
el bot de WhatsApp de este repositorio. Se puede ejecutar sin más contexto que este documento.

## Los dos repositorios

| Repo | Ruta local | Qué es |
|---|---|---|
| `baydal-reservas` | `C:\Users\centr\Documents\GitHub\baydal-reservas` | Este: bot Paco + panel (Firebase) |
| `baydal-web` | `C:\Users\centr\Documents\GitHub\baydal-web` | Web estática de baydal.es. Generador: `build.py` (Python, sin dependencias) → salida en `dist/`. 4 idiomas: es, en, de, fr |

## Situación actual (antes del cambio)

La página de reservas (`/reservas`, `/en/book`, `/de/reservieren`, `/fr/reserver`) tiene un formulario
`#res-form` (generado en `page_reservas()` de `build.py`, ~línea 725) con campos nombre, fecha
(`input type=date`), hora (`input type=time`) y personas. Al enviarlo, `assets/js/main.js` construye un
mensaje **en lenguaje natural** en el idioma de la página (plantilla `res_f.msg` de `build.py`) y abre
`https://wa.me/34677490049` — el WhatsApp de **recepción** (constante `WA`, `build.py` línea 13).
Es decir: hoy la reserva de la web la atiende una persona.

## Objetivo

Que el formulario abra el chat de **Paco** (número nuevo del bot) con un mensaje **determinista** ya
escrito. Paco lo parsea **sin IA** (ver `SCHEMA.md`, "Mensaje de la web") y salta directo al paso de
confirmación: el cliente solo tiene que pulsar "Enviar" en WhatsApp y confirmar. La reserva queda con
`origen: 'web'`.

## Contrato: formato EXACTO del mensaje

```
RESERVA WEB
fecha: 2026-07-20
turno: comida
hora: 14:00
personas: 4
nombre: María García
```

Reglas (contrato con `functions/src/flujo.ts` de baydal-reservas — no inventar variantes):

- Primera línea: exactamente `RESERVA WEB`.
- `fecha:` en `YYYY-MM-DD` (lo que da `input type=date` tal cual — NO formatear a texto).
- `turno:` `comida` o `cena`, **siempre en español**, sea cual sea el idioma de la página.
- `hora:` `HH:mm` en 24 h (lo que da `input type=time` tal cual).
- `personas:` número entero.
- `nombre:` texto libre (acentos y espacios sin problema: van URL-encoded).
- Las claves (`fecha:`, `turno:`…) **siempre en español y en minúsculas**, una por línea, en ese orden.
- Si faltara alguna línea, Paco pregunta ese dato en el chat (no rompe), pero la web debe mandarlas todas.

## URL que abre el formulario

```
https://wa.me/<NUMERO_PACO>?text=<mensaje URL-encoded>
```

- `<NUMERO_PACO>`: el número del bot en E.164 **sin `+`** (p. ej. `34XXXXXXXXX`). Está pendiente de
  contratar (ver `docs/ALTA_META.md` paso 4); mientras tanto se prueba con el número de pruebas de Meta.
- El texto se codifica con `encodeURIComponent(...)` sobre el mensaje completo; los saltos de línea
  `\n` quedan como `%0A` automáticamente.

## Cambios en `baydal-web` (los únicos dos ficheros a tocar)

### 1. `build.py`

- Añadir junto a `WA` (línea ~13) la constante del bot y usarla en el formulario:

  ```python
  WA = "34677490049"        # recepción — NO tocar (enlaces de contacto del pie)
  WA_PACO = "34XXXXXXXXX"   # número de Paco (bot de reservas) — poner el real al contratarlo
  ```

- En `page_reservas()` (~línea 732), cambiar el `data-wa` del formulario y quitar `data-msg`
  (deja de usarse):

  ```python
  <form id="res-form" data-wa="{WA_PACO}">
  ```

- Opcional (limpieza): borrar la clave `"msg"` de `res_f` en los 4 idiomas de `T` (ya no se usa).
- El botón de envío del formulario ("Reservar por WhatsApp" / "Book via WhatsApp" / "Per WhatsApp
  reservieren" / "Réserver par WhatsApp") no cambia de texto: al regenerar, las 4 páginas de reservas
  (todos los idiomas) quedan apuntando a Paco porque comparten esta plantilla.

### 2. `assets/js/main.js`

Sustituir el handler de submit actual (líneas 11–25) por la construcción determinista:

```js
// Reserva por WhatsApp: abre el chat de Paco (bot) con el mensaje determinista RESERVA WEB
// (formato del contrato: baydal-reservas/SCHEMA.md — claves en español, no traducir)
document.addEventListener("submit", function (e) {
  var f = e.target;
  if (f.id !== "res-form") return;
  e.preventDefault();
  var d = new FormData(f);
  var hora = d.get("hora");
  // turno por hora de entrada: antes de las 17:00 = comida; después, cena
  var turno = hora < "17:00" ? "comida" : "cena";
  var msg = "RESERVA WEB\n" +
    "fecha: " + d.get("fecha") + "\n" +
    "turno: " + turno + "\n" +
    "hora: " + hora + "\n" +
    "personas: " + d.get("pax") + "\n" +
    "nombre: " + d.get("nombre");
  window.open("https://wa.me/" + f.dataset.wa + "?text=" + encodeURIComponent(msg), "_blank", "noopener");
});
```

(La comparación `hora < "17:00"` funciona porque `HH:mm` ordena lexicográficamente.)

### 3. Regenerar y publicar

```
cd C:\Users\centr\Documents\GitHub\baydal-web
python build.py
```

y subir `dist/` al hosting (Hostinger) por el cauce habitual de esa web. **No editar nada en `dist/`
a mano**: es generado.

## Cómo probarlo

1. En local: `cd dist && python -m http.server 8000` → abrir `http://localhost:8000/reservas/`.
2. Rellenar el formulario y enviar. Verificar que la URL abierta es `https://wa.me/<numero>?text=RESERVA%20WEB%0Afecha...`
   con los 5 campos y saltos `%0A`.
3. En WhatsApp, comprobar que el mensaje prellenado se ve con sus 6 líneas, y enviarlo al número de
   pruebas de Meta (tu móvil debe estar en la lista de destinatarios verificados, ver `docs/ALTA_META.md` paso 3).
4. Paco debe responder saltando directo a la confirmación con fecha/turno/hora/personas/nombre ya puestos.
5. Casos a probar: una hora de comida (14:00) y una de cena (21:00); un nombre con acentos y espacios
   ("José María"); y repetir en una página de otro idioma (p. ej. `/en/book/`) verificando que
   `turno:` sigue saliendo en español.

## Qué NO hacer

- **No validar disponibilidad en la web.** La web no sabe qué mesas quedan: eso es de Paco. Si no hay
  hueco, Paco ofrece alternativas en el propio chat. No añadir llamadas a Firestore ni APIs desde la web.
- **No traducir las claves del mensaje** (`fecha:`, `turno:`…) ni el literal `RESERVA WEB`: son el
  contrato con el parser.
- **No añadir campos** (email, notas…): Paco los pide en el chat (y el email es opcional).
- **No tocar los enlaces de WhatsApp del pie de página ni de "Cómo llegar"** (`wa.me/34677490049`):
  son contacto general con recepción y siguen igual.
- **No restringir más el formulario** (el `min/max` de hora 10:00–23:00 actual vale): la validación
  real de horarios, festivos y antelaciones la hace Paco.
