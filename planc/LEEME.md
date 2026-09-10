# Plan C — publicar la web nueva a través de WordPress (sin hPanel ni FTP)

> **10/09/2026:** repo sincronizado con producción (reseñas, quiz y vídeo del
> build del 16/07 ya están en `build.py`). Horario de septiembre y correo
> fjbaydal@gmail.com aplicados en vivo parcheando las 44 páginas por MCP.

La web nueva se guarda en la base de datos de WordPress y un mini-router PHP la
sirve. El tema actual y Elementor no se tocan; /wp-admin sigue funcionando igual.
Cuando haya acceso a hPanel se migra al despliegue Git (plan A) y este snippet
se desactiva — nada que deshacer.

## Pasos de David (una vez, ~10 min)

1. En `baydal.es/wp-admin` instalar y activar dos plugins:
   - **WPCode Lite** (o "Code Snippets") — para el router.
   - **AI Engine** (Meow Apps) — el mismo de Salufit.
2. AI Engine → ajustes → activar el módulo **MCP** → copiar la **URL del servidor**
   y el **token Bearer** → pasárselos a Claude (chat o fichero local).
3. WPCode → **Add Snippet → PHP Snippet** → pegar el contenido de
   `router-snippet.php` → guardar y **activar**.
   ✅ Activarlo es seguro: el router no hace nada hasta que exista la opción
   `baydal_neo_activo = 1`, que se pone al final de la inyección.

## Pasos de Claude (cuando tenga el token MCP)

1. `python build.py && python planc/build_planc.py` → genera `planc/payload/`.
2. Inyectar cada opción del payload vía MCP (`wp_update_option`, autoload off).
3. Verificación en frío: pedir una página con `?baydal_neo_test=1`… (o activar,
   probar y desactivar en segundos si hace falta).
4. Poner `baydal_neo_activo = 1` → la web nueva queda pública al instante.
5. Verificar en vivo: portada, carta, idiomas, 301 antiguas, robots y sitemap.

## Interruptor de emergencia

Poner la opción `baydal_neo_activo` a `0` (vía MCP o en WPCode desactivando el
snippet) devuelve el sitio antiguo al instante. Ambas webs conviven: la vieja
en el tema, la nueva en opciones.

## Limitaciones conocidas (aceptadas hasta el plan A)

- TTFB del hosting (~0,8 s) se mantiene: es PHP, no estático. Con LiteSpeed
  Cache activado queda casi como estático.
- El peso por página sí baja igual (204 KB vs ~4 MB): la mayor ganancia se
  conserva.
