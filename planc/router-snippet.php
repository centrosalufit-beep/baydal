<?php
/**
 * Baydal — Plan C: sirve la web nueva desde la base de datos de WordPress.
 * Pegar como snippet PHP (WPCode/Code Snippets) y activar. ES SEGURO ACTIVARLO:
 * no hace nada hasta que la opción 'baydal_neo_activo' valga '1' (se controla
 * por MCP, sin tocar código). Interruptor de emergencia: poner esa opción a '0'.
 *
 * Diseño: las páginas HTML, los assets (CSS/JS/fuentes/imágenes) y el mapa de
 * redirecciones 301 viven en wp_options (autoload off). Este router los sirve
 * y deja pasar intactas todas las rutas de administración de WordPress.
 */
add_action('init', function () {
    if (is_admin() || (defined('DOING_CRON') && DOING_CRON) || (defined('REST_REQUEST') && REST_REQUEST)) {
        return;
    }
    if (get_option('baydal_neo_activo') !== '1') {
        return;
    }

    $uri = strtok($_SERVER['REQUEST_URI'], '?');

    // Nunca interceptar el propio WordPress
    if (preg_match('#^/(wp-admin|wp-login\.php|wp-json|wp-content|wp-includes|wp-cron\.php|xmlrpc\.php)#', $uri)) {
        return;
    }

    // 1) Redirecciones 301 del sitio antiguo (patrones exactos y de prefijo)
    $mapa = get_option('baydal_neo_301');
    if (is_array($mapa)) {
        $sin_barra_inicial = ltrim($uri, '/');
        foreach ($mapa as $regla) {
            if (preg_match($regla['re'], $sin_barra_inicial)) {
                wp_redirect(home_url($regla['to']), 301);
                exit;
            }
        }
    }

    // 2) Assets (CSS, JS, fuentes, imágenes, robots, sitemap) — clave = ruta exacta
    $idx = get_option('baydal_neo_assets_idx');
    if (is_array($idx) && isset($idx[$uri])) {
        $a = get_option('baydal_neo_asset_' . $idx[$uri]);
        if (is_array($a) && isset($a['t'], $a['b'])) {
            status_header(200);
            header('Content-Type: ' . $a['t']);
            header('Cache-Control: public, max-age=31536000, immutable');
            echo base64_decode($a['b']);
            exit;
        }
    }

    // 3) Páginas — '' => home; '/carta' y '/carta/' => misma página
    $path = trim($uri, '/');
    $slug = $path === '' ? 'home' : str_replace(['/', '.'], '_', $path);
    $html = get_option('baydal_neo_pag_' . $slug);
    if (is_string($html) && $html !== '') {
        status_header(200);
        header('Content-Type: text/html; charset=utf-8');
        header('Cache-Control: public, max-age=600');
        echo $html;
        exit;
    }

    // 4) Sin coincidencia: WordPress sigue su curso (404 del tema, etc.)
}, 0);
