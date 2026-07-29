# Plugin de WordPress «Paco — Reservas Baydal» — instalación y uso

Objetivo: gestionar desde el WordPress de **baydal.es** lo que usa Paco (carta, horarios e
información práctica) y poner el formulario de reservas en la web, sin entrar al panel ni a
Firebase. El plugin vive en `wordpress/paco-chatbot/` de este repositorio y habla con la
función `wpApi` (Firebase) usando un token.

## Qué hace (y qué no)

- Shortcode `[paco_reservas]`: formulario que abre el WhatsApp de Paco con el mensaje ya
  montado (mismo contrato que [`INTEGRACION_WEB.md`](INTEGRACION_WEB.md)).
- Botón flotante de WhatsApp opcional, en toda la web.
- Pantallas de administración **Carta**, **Horarios** e **Info práctica**: leen y escriben
  directamente en Firebase a través de `wpApi`. En WordPress no se guarda nada de eso,
  solo los ajustes (número, URL y token).
- **No** toca reservas, clientes ni conversaciones: aunque el token se filtrara, esos
  datos son inalcanzables desde esta API.

## Paso 1 — Crear el token (secret `WP_API_TOKEN` en Firebase)

El token es la contraseña con la que WordPress habla con la API. **Lo inventas tú**: una
frase aleatoria larga (30+ caracteres, sin espacios), p. ej. generada con un gestor de
contraseñas. Apúntala: la pegarás en WordPress en el paso 3.

En la terminal, desde la carpeta del proyecto:

```
firebase functions:secrets:set WP_API_TOKEN --project baydal-reservas
```

(pide el valor por teclado; pega ahí la frase). Si las funciones ya estaban desplegadas,
redespliega para que lo cojan: `firebase deploy --only functions --project baydal-reservas`.
Si todavía no has desplegado nunca, el deploy general del README (paso 8) ya lo incluye.

## Paso 2 — Instalar el plugin

1. Comprime la carpeta `wordpress/paco-chatbot` en un zip (clic derecho → Comprimir).
   El zip debe contener la carpeta `paco-chatbot`, no los ficheros sueltos.
2. WordPress de baydal.es → **Plugins → Añadir nuevo → Subir plugin** → elegir el zip →
   Instalar → **Activar**.
3. Aparece el menú **«Paco (Reservas)»** en el lateral del escritorio.

## Paso 3 — Configurar (Ajustes)

**Paco (Reservas) → Ajustes**:

- **Número de WhatsApp de Paco**: E.164 sin `+`, solo dígitos (mientras no haya número
  definitivo, el de pruebas de Meta). Sin número, el formulario no se muestra.
- **URL base de la API**: ya viene puesta
  (`https://europe-southwest1-baydal-reservas.cloudfunctions.net/wpApi`); no tocarla.
- **Token de la API**: la frase del paso 1, tal cual.
- **Guardar cambios** y después **Probar conexión**: debe decir «Conexión correcta con la
  API» (requiere que `wpApi` esté desplegada y el secret cargado).

## Paso 4 — Formulario en las páginas de reservas

Inserta el shortcode `[paco_reservas]` en la página de reservas **de cada idioma**. El
idioma se detecta solo por la URL (`/en/`, `/de/`, `/fr/`; el resto, castellano); si hiciera
falta forzarlo: `[paco_reservas lang="en"]`.

## Paso 5 — Botón flotante (opcional)

Ajustes → marcar **Botón flotante** → burbuja verde de WhatsApp abajo a la derecha en toda
la web, que abre el chat de Paco.

## Las tres pantallas de gestión

| Pantalla | Qué edita |
|---|---|
| **Carta** | Secciones y platos en 5 idiomas, precios, alérgenos, «por persona» (arroces), disponible y visible. Borrar una sección la elimina con todos sus platos. |
| **Horarios** | Los 7 días × comida/cena. Inicio y fin son el rango de **horas de entrada** aceptadas (fin = última entrada, no cierre de cocina). «Cerrado» cierra ese turno. |
| **Info práctica** | El texto de parking, perros, tronas, accesos… Es **lo único** que la IA de Paco sabe de esos temas: lo que no esté aquí, lo escala a un humano. |

Es lo mismo que se edita en el panel (`panel.baydal.es`): ambos escriben en la misma base
de datos y vale el último guardado. Usa el que te pille más a mano.

## Seguridad: si sospechas que el token se ha filtrado

(Un plugin raro en el WordPress, un hackeo, el token pegado donde no debía…) Se **rota**
en 3 pasos — el daño máximo mientras tanto es que alguien cambie carta/horarios/info; las
reservas y los datos de clientes no se pueden tocar con este token:

1. Inventar una frase **nueva** y cargarla:
   `firebase functions:secrets:set WP_API_TOKEN --project baydal-reservas`
2. Redesplegar (hasta este momento el token viejo sigue valiendo):
   `firebase deploy --only functions:wpApi --project baydal-reservas`
3. Pegar la frase nueva en WordPress → Paco (Reservas) → Ajustes → Token → Guardar →
   Probar conexión.
