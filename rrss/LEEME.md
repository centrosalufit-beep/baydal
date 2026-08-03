# RRSS Baydal — sistema de contenido semanal

Genera cada semana **1 cartel + 1 carrusel** para el feed y **5 historias** repartidas en inglés,
alemán, francés y español, con los prompts de imagen listos para pegar.

## Montaje (una sola vez)

1. Crea un Proyecto en ChatGPT: **RRSS Baydal**.
2. Sube **`BASE-BAYDAL.md`** como archivo del Proyecto.
3. Pega **`INSTRUCCIONES-PROYECTO.txt`** entero en *Instrucciones del proyecto*. Son 7.217
   caracteres: el límite es de 8.000, así que entra con margen.

Por qué en dos piezas: las instrucciones tienen tope de 8.000 caracteres y solo la carta con
precios y la voz de la casa ocupan el doble. Todo lo que es *información* vive en el archivo, y las
instrucciones son solo el motor que la usa. Además así se mantiene mejor: cambiar un precio es
editar el archivo, no tocar el prompt.

## Uso (cada lunes)

Escribes en el Proyecto:

> Lanza el prompt semanal.

ChatGPT calcula solo la semana ISO, los pilares, el idioma del feed, la estación y las efemérides
de Calp que caigan, y te devuelve cuatro preguntas cortas:

> • ¿Qué producto ha entrado hoy en lonja?
> • ¿Cómo esperáis la ocupación?
> • ¿Alguna incidencia?
> • ¿Algún plato que queráis potenciar?

Contestas en una línea —"mucha gamba blanca, bastante turismo, queremos potenciar las tellinas"—
y devuelve el JSON completo.

Después: subes la foto real que indique cada pieza (`assets/img/` de la rama `web`), pegas su
`prompt_imagen` en el generador, **revisas las tildes a lupa** y programas todo en **Meta Business
Suite** (gratis, 25 publicaciones/día, hasta 75 días de antelación, soporta carrusel e historias).

**Trabaja siempre en el mismo Proyecto y, a ser posible, en el mismo chat.** El sistema usa el
historial de la conversación para no repetir plato, gancho ni estructura. Si abres un chat nuevo te
lo dirá y seguirá igualmente, pero con menos memoria de lo ya publicado.

### La rotación se calcula sola

La letra sale de `((semana ISO − 1) mod 8)`, de la A a la H. No tienes que llevar la cuenta ni
recordar por dónde ibas: si te saltas una semana, la siguiente cae donde le toca. Dos de cada ocho
semanas el feed sale íntegro en inglés (C) o alemán (F); el resto del trabajo internacional lo
hacen las historias.

## Qué plan de ChatGPT hace falta

Son **12 imágenes por semana** (1 cartel + 6 slides + 5 historias), todas en una sesión del lunes.
Con reintentos por tildes rotas, cuenta 20–30 generaciones reales.

| Plan | Precio | Imágenes | ¿Sirve? |
|---|---|---|---|
| Free | 0 € | 2–3 cada 24 h | No. Necesitarías diez días para una semana |
| **Go** | ~9,99 €/mes | ~20–30 al día | Justo. Cabe si sale a la primera; si no, terminas el martes |
| **Plus** | ~23 €/mes | ~50 cada 3 h | **Sí, con margen.** Si topas, esperas 3 horas, no un día |
| Pro | ~200 $/mes | Sin límite | Innecesario |

Los límites de Plus y Free no los publica OpenAI: son reportes de usuarios. Los de Go y Pro sí son
oficiales. Lo que decide no es el número sino la **ventana**: Go se recarga cada 24 h y Plus cada 3,
y aquí se genera todo de golpe.

**Empieza por Go.** Equivocarte cuesta 10 € y una tarde. Los Proyectos existen en todos los planes,
incluido el gratuito, así que eso no entra en la decisión.

**La palanca que ahorra la mitad:** las slides 2 a 6 del carrusel son casi solo tipografía sobre
fondo. Montarlas en Canva gratis con una plantilla baja de 12 imágenes a 7, garantiza que las
tildes salgan bien y deja el carrusel idéntico semana tras semana. Genera con IA solo la slide 1,
el cartel y las historias, que es donde manda la foto.

## Lo que no se automatiza

- **Verificar precios y disponibilidad.** El modelo inventa. Un precio que no existe es publicidad
  engañosa.
- **Hacer la foto.** Un móvil basta. La foto real es lo que ancla la veracidad y evita la comida de
  plástico que delata a la IA.
- **Leer las tildes al 200%.** Los generadores producen caracteres plausibles que no significan
  nada; una tilde flotando pasa desapercibida de reojo. En alemán, vigila la ß y las diéresis.
- **Aprobar el cartel** antes de programar.
- **Contestar DMs y comentarios.** Automatizarlo es el disparador de sanción mejor documentado de
  Instagram.

## Legal

Desde el **2 de agosto de 2026** el artículo 50 del Reglamento europeo de IA obliga a que sea
evidente que una imagen ha sido generada o manipulada por IA. Meta lo detecta solo —lee los
manifiestos C2PA que ChatGPT incrusta— y etiqueta igualmente, así que declararlo no cuesta nada y
no declararlo no lo oculta. Marca la casilla de contenido IA al programar.

El riesgo que llega antes no es el del etiquetado, sino el de **publicidad engañosa**: una imagen
de un plato que no se corresponde con el que se sirve. De ahí la regla de la foto real.

## Ficheros

| Fichero | Qué es |
|---|---|
| `INSTRUCCIONES-PROYECTO.txt` | El motor. Va en *Instrucciones del proyecto*. 7.217 caracteres |
| `BASE-BAYDAL.md` | La base de conocimiento. Se sube como archivo del Proyecto |
| `LEEME.md` | Esto |

Las notas de prensa, el pack de Google Business y la especificación de Wikidata están en
`prensa/` de la rama `web`.
