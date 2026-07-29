<?php
/**
 * Plugin Name: Paco — Reservas Baydal
 * Description: Conecta la web del restaurante Baydal (Calp) con «Paco», el bot de reservas por WhatsApp: formulario de reserva, botón flotante opcional y gestión de carta, horarios e información práctica a través de la API wpApi (Firebase).
 * Version: 1.0.0
 * Requires PHP: 7.4
 * Requires at least: 6.0
 * Author: Baydal
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'PACO_API_URL_DEFECTO', 'https://europe-southwest1-baydal-reservas.cloudfunctions.net/wpApi' );
define( 'PACO_ID_RE', '/^[A-Za-z0-9_-]{1,64}$/' );
const PACO_IDIOMAS = array( 'es', 'va', 'en', 'de', 'fr' );

function paco_opciones() {
	return wp_parse_args( get_option( 'paco_chatbot', array() ), array(
		'numero'         => '',
		'api_url'        => PACO_API_URL_DEFECTO,
		'api_token'      => '',
		'boton_flotante' => 0,
	) );
}

/**
 * Llamada a la API wpApi. Devuelve el JSON decodificado (array) o WP_Error con mensaje en castellano.
 */
function paco_api_request( $metodo, $ruta, $body = null ) {
	$o = paco_opciones();
	if ( '' === $o['api_token'] ) {
		return new WP_Error( 'paco_sin_token', 'Falta el token de la API. Configúrelo en «Paco (Reservas) → Ajustes».' );
	}
	$args = array(
		'method'  => $metodo,
		'timeout' => 15,
		'headers' => array(
			'Authorization' => 'Bearer ' . $o['api_token'],
			'Content-Type'  => 'application/json',
		),
	);
	if ( null !== $body ) {
		$args['body'] = wp_json_encode( $body );
	}
	$url = rtrim( $o['api_url'], '/' ) . $ruta;
	$res = ( 'GET' === $metodo ) ? wp_remote_get( $url, $args ) : wp_remote_request( $url, $args );
	if ( is_wp_error( $res ) ) {
		return new WP_Error( 'paco_http', 'No se pudo conectar con la API: ' . $res->get_error_message() );
	}
	$codigo = (int) wp_remote_retrieve_response_code( $res );
	$datos  = json_decode( wp_remote_retrieve_body( $res ), true );
	if ( $codigo < 200 || $codigo >= 300 ) {
		$motivo = ( is_array( $datos ) && ! empty( $datos['error'] ) && is_string( $datos['error'] ) ) ? $datos['error'] : ( 'HTTP ' . $codigo );
		return new WP_Error( 'paco_api', 'Error de la API: ' . $motivo );
	}
	return is_array( $datos ) ? $datos : array();
}

/**
 * Idioma para el formulario público. La web vive fuera de WP con directorios /en/ /de/ /fr/
 * (sin plugin de idiomas en WP), así que el prefijo de la URL es la señal fiable.
 */
function paco_idioma_actual() {
	$ruta = isset( $_SERVER['REQUEST_URI'] ) ? (string) wp_unslash( $_SERVER['REQUEST_URI'] ) : '';
	if ( preg_match( '#^/(en|de|fr)(/|$|\?)#', $ruta, $m ) ) {
		return $m[1];
	}
	$loc = strtolower( substr( (string) get_locale(), 0, 2 ) );
	return in_array( $loc, array( 'es', 'en', 'de', 'fr' ), true ) ? $loc : 'es';
}

add_shortcode( 'paco_reservas', 'paco_shortcode_reservas' );
function paco_shortcode_reservas( $atts ) {
	$atts = shortcode_atts( array( 'lang' => 'auto' ), $atts, 'paco_reservas' );
	$o    = paco_opciones();
	if ( '' === $o['numero'] ) {
		if ( current_user_can( 'manage_options' ) ) {
			return '<p style="border:1px solid #b32d2e;padding:.6em"><strong>Paco (aviso solo para administradores):</strong> el formulario de reservas no se muestra porque falta el número de WhatsApp en «Paco (Reservas) → Ajustes».</p>';
		}
		return '';
	}
	$lang   = in_array( $atts['lang'], array( 'es', 'en', 'de', 'fr' ), true ) ? $atts['lang'] : paco_idioma_actual();
	$textos = array(
		'es' => array( 'nombre' => 'Nombre', 'fecha' => 'Fecha', 'hora' => 'Hora', 'personas' => 'Personas', 'boton' => 'Reservar por WhatsApp' ),
		'en' => array( 'nombre' => 'Name', 'fecha' => 'Date', 'hora' => 'Time', 'personas' => 'Guests', 'boton' => 'Book via WhatsApp' ),
		'de' => array( 'nombre' => 'Name', 'fecha' => 'Datum', 'hora' => 'Uhrzeit', 'personas' => 'Personen', 'boton' => 'Per WhatsApp reservieren' ),
		'fr' => array( 'nombre' => 'Nom', 'fecha' => 'Date', 'hora' => 'Heure', 'personas' => 'Personnes', 'boton' => 'Réserver par WhatsApp' ),
	);
	$t   = $textos[ $lang ];
	$hoy = wp_date( 'Y-m-d' ); // Zona horaria del sitio (Europe/Madrid), nunca UTC.
	paco_encolar_js_publico();

	ob_start();
	static $css_impreso = false;
	if ( ! $css_impreso ) {
		$css_impreso = true;
		echo '<style>.paco-form{display:grid;gap:.8em;max-width:24em;font:inherit}.paco-form label{display:grid;gap:.25em}.paco-form input{font:inherit;padding:.5em;border:1px solid;background:transparent;color:inherit}.paco-form button{font:inherit;padding:.7em 1.2em;border:0;border-radius:.3em;background:#25d366;color:#fff;cursor:pointer}</style>';
	}
	?>
	<form class="paco-form" data-wa="<?php echo esc_attr( $o['numero'] ); ?>">
		<label><?php echo esc_html( $t['nombre'] ); ?><input type="text" name="nombre" required></label>
		<label><?php echo esc_html( $t['fecha'] ); ?><input type="date" name="fecha" required min="<?php echo esc_attr( $hoy ); ?>"></label>
		<label><?php echo esc_html( $t['hora'] ); ?><input type="time" name="hora" required min="10:00" max="23:00"></label>
		<label><?php echo esc_html( $t['personas'] ); ?><input type="number" name="personas" required min="1" max="20" value="2"></label>
		<button type="submit"><?php echo esc_html( $t['boton'] ); ?></button>
	</form>
	<?php
	return ob_get_clean();
}

/**
 * JS del formulario, encolado solo cuando el shortcode se renderiza.
 * Mensaje según docs/INTEGRACION_WEB.md — NO cambiar el formato.
 */
function paco_encolar_js_publico() {
	static $hecho = false;
	if ( $hecho ) {
		return;
	}
	$hecho = true;
	wp_register_script( 'paco-reservas', false, array(), '1.0.0', true );
	wp_enqueue_script( 'paco-reservas' );
	$js = <<<'JS'
document.addEventListener('submit', function (e) {
	var f = e.target;
	if (!f.classList || !f.classList.contains('paco-form')) return;
	e.preventDefault();
	var hora = f.hora.value;
	var msg = 'RESERVA WEB' +
		'\nfecha: ' + f.fecha.value +
		'\nturno: ' + (hora < '17:00' ? 'comida' : 'cena') +
		'\nhora: ' + hora +
		'\npersonas: ' + f.personas.value +
		'\nnombre: ' + f.nombre.value.trim();
	window.open('https://wa.me/' + f.dataset.wa + '?text=' + encodeURIComponent(msg), '_blank', 'noopener');
}, true);
JS;
	wp_add_inline_script( 'paco-reservas', $js );
}

add_action( 'wp_footer', 'paco_boton_flotante' );
function paco_boton_flotante() {
	$o = paco_opciones();
	if ( empty( $o['boton_flotante'] ) || '' === $o['numero'] ) {
		return;
	}
	echo '<a href="' . esc_url( 'https://wa.me/' . $o['numero'] ) . '" target="_blank" rel="noopener" aria-label="WhatsApp" style="position:fixed;right:1rem;bottom:1rem;z-index:9999;width:3.5rem;height:3.5rem;border-radius:50%;background:#25d366;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,.3)"><svg viewBox="0 0 24 24" width="30" height="30" fill="#fff" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg></a>';
}

if ( is_admin() ) {
	require __DIR__ . '/admin.php';
}
