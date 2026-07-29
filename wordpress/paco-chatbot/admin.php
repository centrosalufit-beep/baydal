<?php
/**
 * Pantallas de administración del plugin Paco — Reservas Baydal.
 * Todo lee/escribe contra la API wpApi; nada se guarda en WP salvo los ajustes.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

add_action( 'admin_menu', 'paco_menu' );
function paco_menu() {
	add_menu_page( 'Paco (Reservas)', 'Paco (Reservas)', 'manage_options', 'paco-reservas', 'paco_pagina_ajustes', 'dashicons-whatsapp', 58 );
	add_submenu_page( 'paco-reservas', 'Ajustes — Paco', 'Ajustes', 'manage_options', 'paco-reservas', 'paco_pagina_ajustes' );
	add_submenu_page( 'paco-reservas', 'Carta — Paco', 'Carta', 'manage_options', 'paco-carta', 'paco_pagina_carta' );
	add_submenu_page( 'paco-reservas', 'Horarios — Paco', 'Horarios', 'manage_options', 'paco-horarios', 'paco_pagina_horarios' );
	add_submenu_page( 'paco-reservas', 'Información práctica — Paco', 'Info práctica', 'manage_options', 'paco-info', 'paco_pagina_info' );
}

/** Imprime avisos [tipo, mensaje] como admin notices. */
function paco_aviso( $avisos ) {
	foreach ( $avisos as $a ) {
		printf( '<div class="notice notice-%s"><p>%s</p></div>', esc_attr( $a[0] ), esc_html( $a[1] ) );
	}
}

/** Mapa {es,va,en,de,fr} saneado; SIEMPRE las 5 claves aunque vacías (igual que el panel). */
function paco_leer_idiomas( $arr, $max ) {
	$out = array();
	foreach ( PACO_IDIOMAS as $lng ) {
		$v = ( is_array( $arr ) && isset( $arr[ $lng ] ) && is_string( $arr[ $lng ] ) ) ? sanitize_text_field( $arr[ $lng ] ) : '';
		$out[ $lng ] = mb_substr( trim( $v ), 0, $max );
	}
	return $out;
}

/** Valida un id de sección contra PACO_ID_RE; '' si no es válido. */
function paco_normalizar_id( $id ) {
	$id = is_string( $id ) ? sanitize_text_field( wp_unslash( $id ) ) : '';
	return preg_match( PACO_ID_RE, $id ) ? $id : '';
}

/* ========================= AJUSTES ========================= */

function paco_pagina_ajustes() {
	if ( ! current_user_can( 'manage_options' ) ) {
		wp_die( 'Sin permisos.' );
	}
	$o      = paco_opciones();
	$avisos = array();

	if ( isset( $_POST['paco_ajustes'] ) ) {
		check_admin_referer( 'paco_ajustes' );
		$nuevo = array(
			'numero'         => preg_replace( '/[\s+]/', '', sanitize_text_field( wp_unslash( $_POST['numero'] ?? '' ) ) ),
			'api_url'        => esc_url_raw( trim( sanitize_text_field( wp_unslash( $_POST['api_url'] ?? '' ) ) ) ),
			// En blanco = conservar el guardado (el formulario nunca imprime el token)
			'api_token'      => trim( sanitize_text_field( wp_unslash( $_POST['api_token'] ?? '' ) ) ) ?: $o['api_token'],
			'boton_flotante' => empty( $_POST['boton_flotante'] ) ? 0 : 1,
		);
		if ( '' === $nuevo['api_url'] ) {
			$nuevo['api_url'] = PACO_API_URL_DEFECTO;
		}
		if ( '' !== $nuevo['numero'] && ! preg_match( '/^[0-9]{7,15}$/', $nuevo['numero'] ) ) {
			$avisos[] = array( 'error', 'Número no válido: solo dígitos en formato E.164 sin «+» (ej. 34677490049). No se ha guardado nada.' );
			$o = array_merge( $o, $nuevo ); // No perder lo tecleado.
		} else {
			update_option( 'paco_chatbot', $nuevo );
			$o        = array_merge( $o, $nuevo );
			$avisos[] = array( 'success', 'Ajustes guardados.' );
		}
		if ( isset( $_POST['probar'] ) ) {
			$r        = paco_api_request( 'GET', '/info' );
			$avisos[] = is_wp_error( $r )
				? array( 'error', 'Prueba de conexión fallida. ' . $r->get_error_message() )
				: array( 'success', 'Conexión correcta con la API.' );
		}
	}
	?>
	<div class="wrap">
	<h1>Paco (Reservas) — Ajustes</h1>
	<?php paco_aviso( $avisos ); ?>
	<form method="post">
		<?php wp_nonce_field( 'paco_ajustes' ); ?>
		<input type="hidden" name="paco_ajustes" value="1">
		<table class="form-table" role="presentation">
			<tr>
				<th scope="row"><label for="paco-numero">Número de WhatsApp de Paco</label></th>
				<td><input type="text" id="paco-numero" name="numero" value="<?php echo esc_attr( $o['numero'] ); ?>" class="regular-text" inputmode="numeric" placeholder="34677490049">
				<p class="description">Formato E.164 sin «+», solo dígitos.</p></td>
			</tr>
			<tr>
				<th scope="row"><label for="paco-api-url">URL base de la API</label></th>
				<td><input type="url" id="paco-api-url" name="api_url" value="<?php echo esc_attr( $o['api_url'] ); ?>" class="large-text"></td>
			</tr>
			<tr>
				<th scope="row"><label for="paco-api-token">Token de la API</label></th>
				<td><input type="password" id="paco-api-token" name="api_token" value="" class="regular-text" autocomplete="new-password">
				<p class="description"><?php echo $o['api_token'] ? 'Hay un token guardado (no se muestra). Déjelo en blanco para conservarlo.' : 'Sin token guardado todavía.'; ?></p></td>
			</tr>
			<tr>
				<th scope="row">Botón flotante</th>
				<td><label><input type="checkbox" name="boton_flotante" <?php checked( $o['boton_flotante'] ); ?>> Mostrar burbuja de WhatsApp abajo a la derecha en toda la web</label></td>
			</tr>
		</table>
		<p class="submit">
			<button type="submit" name="guardar" value="1" class="button button-primary">Guardar cambios</button>
			<button type="submit" name="probar" value="1" class="button">Probar conexión</button>
		</p>
	</form>
	<p>Formulario de reservas: inserte el shortcode <code>[paco_reservas]</code> en cualquier página (opcional <code>lang="es|en|de|fr|auto"</code>).</p>
	</div>
	<?php
}

/* ========================= CARTA ========================= */

/** Construye el payload de sección (contrato wpApi) desde $_POST. */
function paco_leer_seccion_post() {
	$post    = wp_unslash( $_POST );
	$payload = array(
		'nombre'  => paco_leer_idiomas( $post['nombre'] ?? array(), 200 ),
		'orden'   => max( 0, min( 999, (int) ( $post['orden'] ?? 0 ) ) ),
		'visible' => ! empty( $post['visible'] ),
		'items'   => array(),
	);
	$items = ( isset( $post['items'] ) && is_array( $post['items'] ) ) ? $post['items'] : array();
	foreach ( $items as $it ) {
		if ( ! is_array( $it ) ) {
			continue;
		}
		$item = array(
			'nombre'     => paco_leer_idiomas( $it['nombre'] ?? array(), 200 ),
			'precio'     => max( 0, (float) str_replace( ',', '.', (string) ( $it['precio'] ?? '0' ) ) ),
			'porPersona' => ! empty( $it['porPersona'] ),
			'disponible' => ! empty( $it['disponible'] ),
		);
		$desc = paco_leer_idiomas( $it['descripcion'] ?? array(), 500 );
		if ( '' !== implode( '', $desc ) ) {
			$item['descripcion'] = $desc; // Solo si algún idioma tiene texto (igual que el panel).
		}
		$alergenos = array();
		foreach ( explode( ',', (string) ( $it['alergenos'] ?? '' ) ) as $a ) {
			$a = mb_substr( trim( sanitize_text_field( $a ) ), 0, 40 );
			if ( '' !== $a ) {
				$alergenos[] = $a;
			}
		}
		if ( $alergenos ) {
			$item['alergenos'] = array_slice( $alergenos, 0, 20 ); // Solo si no está vacío.
		}
		$payload['items'][] = $item;
		if ( count( $payload['items'] ) >= 120 ) {
			break;
		}
	}
	return $payload;
}

/** Normaliza una sección (de la API o de un payload) a la forma que pinta el editor. */
function paco_vista_seccion( $s ) {
	$vac   = array_fill_keys( PACO_IDIOMAS, '' );
	$vista = array(
		'nombre'  => array_merge( $vac, is_array( $s['nombre'] ?? null ) ? $s['nombre'] : array() ),
		'orden'   => (int) ( $s['orden'] ?? 0 ),
		'visible' => ! empty( $s['visible'] ),
		'items'   => array(),
	);
	foreach ( (array) ( $s['items'] ?? array() ) as $it ) {
		if ( ! is_array( $it ) ) {
			continue;
		}
		$vista['items'][] = array(
			'nombre'      => array_merge( $vac, is_array( $it['nombre'] ?? null ) ? $it['nombre'] : array() ),
			'descripcion' => array_merge( $vac, is_array( $it['descripcion'] ?? null ) ? $it['descripcion'] : array() ),
			'precio'      => isset( $it['precio'] ) ? $it['precio'] : '',
			'porPersona'  => ! empty( $it['porPersona'] ),
			'disponible'  => ! empty( $it['disponible'] ),
			'alergenos'   => is_array( $it['alergenos'] ?? null ) ? implode( ', ', $it['alergenos'] ) : (string) ( $it['alergenos'] ?? '' ),
		);
	}
	return $vista;
}

/** HTML de un bloque de plato ($i puede ser '__i__' para la plantilla JS). Todo escapado dentro. */
function paco_html_item( $i, $it ) {
	$vac = array_fill_keys( PACO_IDIOMAS, '' );
	$nom = array_merge( $vac, (array) ( $it['nombre'] ?? array() ) );
	$des = array_merge( $vac, (array) ( $it['descripcion'] ?? array() ) );
	ob_start();
	?>
	<fieldset class="paco-item" style="border:1px solid #c3c4c7;background:#fff;padding:12px;margin:0 0 12px">
		<table>
			<tr><th></th><th style="text-align:left">Nombre</th><th style="text-align:left">Descripción</th></tr>
			<?php foreach ( PACO_IDIOMAS as $lng ) : ?>
			<tr>
				<th style="text-align:right;padding-right:6px"><?php echo esc_html( strtoupper( $lng ) ); ?></th>
				<td><input type="text" class="regular-text" name="items[<?php echo esc_attr( $i ); ?>][nombre][<?php echo esc_attr( $lng ); ?>]" value="<?php echo esc_attr( $nom[ $lng ] ); ?>" maxlength="200"></td>
				<td><input type="text" class="regular-text" name="items[<?php echo esc_attr( $i ); ?>][descripcion][<?php echo esc_attr( $lng ); ?>]" value="<?php echo esc_attr( $des[ $lng ] ); ?>" maxlength="500"></td>
			</tr>
			<?php endforeach; ?>
		</table>
		<p>
			<label>Precio (€) <input type="number" name="items[<?php echo esc_attr( $i ); ?>][precio]" value="<?php echo esc_attr( $it['precio'] ?? '' ); ?>" min="0" step="0.01" style="width:6em"></label>
			<span class="description">(0 = «s/m», según mercado)</span>
			&nbsp;&nbsp;<label><input type="checkbox" name="items[<?php echo esc_attr( $i ); ?>][porPersona]" <?php checked( ! empty( $it['porPersona'] ) ); ?>> por persona (arroces)</label>
			&nbsp;&nbsp;<label><input type="checkbox" name="items[<?php echo esc_attr( $i ); ?>][disponible]" <?php checked( ! empty( $it['disponible'] ) ); ?>> disponible</label>
		</p>
		<p>
			<label>Alérgenos (separados por comas) <input type="text" class="regular-text" name="items[<?php echo esc_attr( $i ); ?>][alergenos]" value="<?php echo esc_attr( $it['alergenos'] ?? '' ); ?>"></label>
			<button type="button" class="button-link-delete paco-quitar-item">Quitar plato</button>
		</p>
	</fieldset>
	<?php
	return ob_get_clean();
}

function paco_pagina_carta() {
	if ( ! current_user_can( 'manage_options' ) ) {
		wp_die( 'Sin permisos.' );
	}
	$avisos = array();
	$editar = '';
	$vista  = null;
	$accion = isset( $_GET['accion'] ) ? sanitize_key( wp_unslash( $_GET['accion'] ) ) : '';

	if ( 'borrar' === $accion ) {
		$id = paco_normalizar_id( $_GET['seccion'] ?? '' );
		if ( '' !== $id ) {
			check_admin_referer( 'paco_borrar_' . $id );
			$r        = paco_api_request( 'DELETE', '/carta/' . $id );
			$avisos[] = is_wp_error( $r ) ? array( 'error', $r->get_error_message() ) : array( 'success', 'Sección borrada.' );
		}
	}

	if ( 'nueva' === $accion ) {
		check_admin_referer( 'paco_nueva' );
		$lista = paco_api_request( 'GET', '/carta' );
		if ( is_wp_error( $lista ) ) {
			$avisos[] = array( 'error', $lista->get_error_message() );
		} else {
			$orden = 0;
			foreach ( (array) ( $lista['secciones'] ?? array() ) as $s ) {
				$orden = max( $orden, (int) ( $s['orden'] ?? 0 ) );
			}
			$r = paco_api_request( 'POST', '/carta', array(
				'nombre'  => array( 'es' => 'Nueva sección', 'va' => '', 'en' => '', 'de' => '', 'fr' => '' ),
				'orden'   => min( $orden + 1, 999 ),
				'visible' => false, // Nace oculta hasta que esté rellena (igual que el panel).
				'items'   => array(),
			) );
			if ( is_wp_error( $r ) ) {
				$avisos[] = array( 'error', $r->get_error_message() );
			} elseif ( ! empty( $r['id'] ) && is_string( $r['id'] ) && preg_match( PACO_ID_RE, $r['id'] ) ) {
				$editar   = $r['id'];
				$avisos[] = array( 'success', 'Sección creada. Nace oculta: márquela «Visible» cuando esté rellena.' );
			} else {
				$avisos[] = array( 'error', 'La API no devolvió un id de sección válido.' );
			}
		}
	}

	if ( isset( $_POST['paco_guardar_seccion'] ) ) {
		$id = paco_normalizar_id( $_POST['paco_guardar_seccion'] );
		if ( '' !== $id ) {
			check_admin_referer( 'paco_seccion_' . $id );
			$payload = paco_leer_seccion_post();
			$r       = paco_api_request( 'PUT', '/carta/' . $id, $payload );
			$editar  = $id;
			$vista   = paco_vista_seccion( $payload ); // Con error o sin él, mostrar lo tecleado.
			$avisos[] = is_wp_error( $r )
				? array( 'error', $r->get_error_message() . ' No se ha guardado: abajo queda lo que tecleó; corrija y vuelva a guardar.' )
				: array( 'success', 'Sección guardada.' );
		}
	}

	if ( '' === $editar && isset( $_GET['seccion'] ) ) {
		$editar = paco_normalizar_id( $_GET['seccion'] );
	}

	echo '<div class="wrap"><h1>Carta</h1>';

	if ( '' !== $editar && null === $vista ) {
		$lista = paco_api_request( 'GET', '/carta' );
		if ( is_wp_error( $lista ) ) {
			$avisos[] = array( 'error', $lista->get_error_message() );
			$editar   = '';
		} else {
			$sec = null;
			foreach ( (array) ( $lista['secciones'] ?? array() ) as $s ) {
				if ( isset( $s['id'] ) && (string) $s['id'] === $editar ) {
					$sec = $s;
					break;
				}
			}
			if ( null === $sec ) {
				$avisos[] = array( 'error', 'No existe esa sección.' );
				$editar   = '';
			} else {
				$vista = paco_vista_seccion( $sec );
			}
		}
	}

	paco_aviso( $avisos );
	if ( '' !== $editar && null !== $vista ) {
		paco_editor_seccion( $editar, $vista );
	} else {
		paco_lista_carta();
	}
	echo '</div>';
}

function paco_lista_carta() {
	$r = paco_api_request( 'GET', '/carta' );
	if ( is_wp_error( $r ) ) {
		paco_aviso( array( array( 'error', $r->get_error_message() ) ) );
		return;
	}
	$url_nueva = wp_nonce_url( admin_url( 'admin.php?page=paco-carta&accion=nueva' ), 'paco_nueva' );
	echo '<p><a class="button button-primary" href="' . esc_url( $url_nueva ) . '">Añadir sección</a></p>';
	$secciones = (array) ( $r['secciones'] ?? array() );
	if ( ! $secciones ) {
		echo '<p>No hay secciones todavía.</p>';
		return;
	}
	echo '<table class="widefat striped" style="max-width:56em"><thead><tr><th>Sección</th><th>Orden</th><th>Visible para el bot</th><th>Platos</th><th></th></tr></thead><tbody>';
	foreach ( $secciones as $s ) {
		$id = isset( $s['id'] ) ? (string) $s['id'] : '';
		if ( ! preg_match( PACO_ID_RE, $id ) ) {
			continue;
		}
		$nombre     = ( isset( $s['nombre']['es'] ) && '' !== $s['nombre']['es'] ) ? $s['nombre']['es'] : '(sin nombre)';
		$url_editar = admin_url( 'admin.php?page=paco-carta&seccion=' . rawurlencode( $id ) );
		$url_borrar = wp_nonce_url( admin_url( 'admin.php?page=paco-carta&accion=borrar&seccion=' . rawurlencode( $id ) ), 'paco_borrar_' . $id );
		printf(
			'<tr><td><a href="%1$s"><strong>%2$s</strong></a></td><td>%3$d</td><td>%4$s</td><td>%5$d</td><td><a href="%1$s">Editar</a> | <a href="%6$s" style="color:#b32d2e" onclick="return confirm(\'¿Borrar la sección entera con todos sus platos?\');">Borrar</a></td></tr>',
			esc_url( $url_editar ),
			esc_html( $nombre ),
			(int) ( $s['orden'] ?? 0 ),
			! empty( $s['visible'] ) ? 'Sí' : 'No',
			count( (array) ( $s['items'] ?? array() ) ),
			esc_url( $url_borrar )
		);
	}
	echo '</tbody></table>';
}

function paco_editor_seccion( $id, $v ) {
	$plantilla = paco_html_item( '__i__', array(
		'nombre'      => array(),
		'descripcion' => array(),
		'precio'      => '',
		'porPersona'  => false,
		'disponible'  => true,
		'alergenos'   => '',
	) );
	?>
	<p><a href="<?php echo esc_url( admin_url( 'admin.php?page=paco-carta' ) ); ?>">&larr; Volver a la lista de secciones</a></p>
	<form method="post" id="paco-form-seccion" action="<?php echo esc_url( admin_url( 'admin.php?page=paco-carta&seccion=' . rawurlencode( $id ) ) ); ?>">
		<?php wp_nonce_field( 'paco_seccion_' . $id ); ?>
		<input type="hidden" name="paco_guardar_seccion" value="<?php echo esc_attr( $id ); ?>">
		<h2>Sección <code><?php echo esc_html( $id ); ?></code></h2>
		<table class="form-table" role="presentation">
			<tr>
				<th scope="row">Nombre</th>
				<td>
					<?php foreach ( PACO_IDIOMAS as $lng ) : ?>
						<label style="display:inline-block;margin:0 10px 8px 0"><?php echo esc_html( strtoupper( $lng ) ); ?><br>
						<input type="text" name="nombre[<?php echo esc_attr( $lng ); ?>]" value="<?php echo esc_attr( $v['nombre'][ $lng ] ?? '' ); ?>" maxlength="200"></label>
					<?php endforeach; ?>
				</td>
			</tr>
			<tr>
				<th scope="row">Orden</th>
				<td><input type="number" name="orden" min="0" max="999" value="<?php echo esc_attr( $v['orden'] ); ?>"></td>
			</tr>
			<tr>
				<th scope="row">Visibilidad</th>
				<td><label><input type="checkbox" name="visible" <?php checked( $v['visible'] ); ?>> Visible para el bot</label></td>
			</tr>
		</table>
		<h2>Platos</h2>
		<div id="paco-items">
		<?php
		foreach ( $v['items'] as $i => $item ) {
			echo paco_html_item( 'e' . $i, $item ); // phpcs:ignore WordPress.Security.EscapeOutput -- escapado dentro de paco_html_item().
		}
		?>
		</div>
		<p><button type="button" class="button" id="paco-anadir-item">Añadir plato</button></p>
		<template id="paco-item-plantilla"><?php echo $plantilla; // phpcs:ignore WordPress.Security.EscapeOutput ?></template>
		<p class="submit"><button type="submit" class="button button-primary">Guardar sección</button></p>
	</form>
	<script>
	(function () {
		var n = 0;
		var cont = document.getElementById('paco-items');
		document.getElementById('paco-anadir-item').addEventListener('click', function () {
			var html = document.getElementById('paco-item-plantilla').innerHTML.replace(/__i__/g, 'n' + (n++));
			var d = document.createElement('div');
			d.innerHTML = html;
			cont.appendChild(d.firstElementChild);
		});
		document.getElementById('paco-form-seccion').addEventListener('click', function (e) {
			var b = e.target.closest('.paco-quitar-item');
			if (b) b.closest('.paco-item').remove(); // Solo toca el DOM; se consolida al guardar.
		});
	})();
	</script>
	<?php
}

/* ========================= HORARIOS ========================= */

function paco_pagina_horarios() {
	if ( ! current_user_can( 'manage_options' ) ) {
		wp_die( 'Sin permisos.' );
	}
	// Claves del esquema: "0"=domingo .. "6"=sábado. En pantalla se muestra de lunes a domingo.
	$dias   = array( '1' => 'Lunes', '2' => 'Martes', '3' => 'Miércoles', '4' => 'Jueves', '5' => 'Viernes', '6' => 'Sábado', '0' => 'Domingo' );
	$turnos = array( 'comida' => 'Comida', 'cena' => 'Cena' );
	$avisos = array();
	$vista  = null;

	if ( isset( $_POST['paco_guardar_horario'] ) ) {
		check_admin_referer( 'paco_horario' );
		$hp    = ( isset( $_POST['h'] ) && is_array( $_POST['h'] ) ) ? wp_unslash( $_POST['h'] ) : array();
		$vista = array();
		foreach ( $dias as $d => $et ) {
			$d = (string) $d;
			foreach ( $turnos as $t => $ett ) {
				$raw = ( isset( $hp[ $d ][ $t ] ) && is_array( $hp[ $d ][ $t ] ) ) ? $hp[ $d ][ $t ] : array();
				$vista[ $d ][ $t ] = array(
					'cerrado' => ! empty( $raw['cerrado'] ),
					'inicio'  => sanitize_text_field( $raw['inicio'] ?? '' ),
					'fin'     => sanitize_text_field( $raw['fin'] ?? '' ),
				);
			}
		}
		$errores = array();
		$nuevo   = array();
		foreach ( array( '0', '1', '2', '3', '4', '5', '6' ) as $d ) {
			$nuevo[ $d ] = array( 'comida' => null, 'cena' => null ); // Cerrados explícitamente null, nunca ausentes.
		}
		$re = '/^([01][0-9]|2[0-3]):[0-5][0-9]$/';
		foreach ( $dias as $d => $et ) {
			$d = (string) $d;
			foreach ( $turnos as $t => $ett ) {
				$tv = $vista[ $d ][ $t ];
				if ( $tv['cerrado'] ) {
					continue;
				}
				if ( ! preg_match( $re, $tv['inicio'] ) || ! preg_match( $re, $tv['fin'] ) || $tv['inicio'] >= $tv['fin'] ) {
					$errores[] = "Revise {$ett} del {$et}: falta hora o el fin es anterior al inicio.";
					continue;
				}
				$nuevo[ $d ][ $t ] = array( 'inicio' => $tv['inicio'], 'fin' => $tv['fin'] );
			}
		}
		if ( $errores ) {
			foreach ( $errores as $e ) {
				$avisos[] = array( 'error', $e );
			}
			$avisos[] = array( 'error', 'No se ha guardado nada. Corrija y vuelva a guardar.' );
		} else {
			// (object): con claves "0".."6" un array PHP se serializaría como lista JSON, no como objeto.
			$r        = paco_api_request( 'PUT', '/horario', array( 'horario' => (object) $nuevo ) );
			$avisos[] = is_wp_error( $r )
				? array( 'error', $r->get_error_message() . ' No se ha guardado; abajo queda lo que tecleó.' )
				: array( 'success', 'Horario guardado.' );
		}
	}

	if ( null === $vista ) {
		$r = paco_api_request( 'GET', '/horario' );
		$h = array();
		if ( is_wp_error( $r ) ) {
			$avisos[] = array( 'error', $r->get_error_message() );
		} else {
			$h = (array) ( $r['horario'] ?? array() );
		}
		$vista = array();
		foreach ( $dias as $d => $et ) {
			$d = (string) $d;
			foreach ( $turnos as $t => $ett ) {
				$raw = ( isset( $h[ $d ][ $t ] ) && is_array( $h[ $d ][ $t ] ) ) ? $h[ $d ][ $t ] : null;
				$vista[ $d ][ $t ] = array(
					'cerrado' => null === $raw,
					'inicio'  => is_array( $raw ) ? (string) ( $raw['inicio'] ?? '' ) : '',
					'fin'     => is_array( $raw ) ? (string) ( $raw['fin'] ?? '' ) : '',
				);
			}
		}
	}
	?>
	<div class="wrap">
	<h1>Horarios</h1>
	<?php paco_aviso( $avisos ); ?>
	<p><strong>Inicio y fin son el rango de horas de ENTRADA aceptadas</strong> (fin = última entrada, no cierre de cocina).</p>
	<form method="post">
		<?php wp_nonce_field( 'paco_horario' ); ?>
		<input type="hidden" name="paco_guardar_horario" value="1">
		<table class="widefat striped" style="max-width:56em">
			<thead><tr><th>Día</th><th>Comida</th><th>Cena</th></tr></thead>
			<tbody>
			<?php foreach ( $dias as $d => $et ) : $d = (string) $d; ?>
				<tr>
					<th scope="row"><?php echo esc_html( $et ); ?></th>
					<?php foreach ( $turnos as $t => $ett ) : $tv = $vista[ $d ][ $t ]; $base = 'h[' . $d . '][' . $t . ']'; ?>
					<td class="paco-turno">
						<label><input type="checkbox" class="paco-cerrado" name="<?php echo esc_attr( $base ); ?>[cerrado]" <?php checked( $tv['cerrado'] ); ?>> Cerrado</label><br>
						<input type="time" name="<?php echo esc_attr( $base ); ?>[inicio]" value="<?php echo esc_attr( $tv['inicio'] ); ?>"> –
						<input type="time" name="<?php echo esc_attr( $base ); ?>[fin]" value="<?php echo esc_attr( $tv['fin'] ); ?>">
					</td>
					<?php endforeach; ?>
				</tr>
			<?php endforeach; ?>
			</tbody>
		</table>
		<p class="submit"><button type="submit" class="button button-primary">Guardar horario</button></p>
	</form>
	<script>
	document.querySelectorAll('.paco-turno').forEach(function (td) {
		var c = td.querySelector('.paco-cerrado');
		var aplicar = function () {
			td.querySelectorAll('input[type=time]').forEach(function (i) { i.disabled = c.checked; });
		};
		c.addEventListener('change', aplicar);
		aplicar();
	});
	</script>
	</div>
	<?php
}

/* ========================= INFO PRÁCTICA ========================= */

function paco_pagina_info() {
	if ( ! current_user_can( 'manage_options' ) ) {
		wp_die( 'Sin permisos.' );
	}
	$avisos = array();
	$texto  = null;

	if ( isset( $_POST['paco_guardar_info'] ) ) {
		check_admin_referer( 'paco_info' );
		$texto    = mb_substr( trim( sanitize_textarea_field( wp_unslash( $_POST['infoPractica'] ?? '' ) ) ), 0, 10000 );
		$r        = paco_api_request( 'PUT', '/info', array( 'infoPractica' => $texto ) );
		$avisos[] = is_wp_error( $r )
			? array( 'error', $r->get_error_message() . ' No se ha guardado; el texto de abajo es el que tecleó.' )
			: array( 'success', 'Información práctica guardada.' );
	}
	if ( null === $texto ) {
		$r = paco_api_request( 'GET', '/info' );
		if ( is_wp_error( $r ) ) {
			$avisos[] = array( 'error', $r->get_error_message() );
			$texto    = '';
		} else {
			$texto = (string) ( $r['infoPractica'] ?? '' );
		}
	}
	?>
	<div class="wrap">
	<h1>Información práctica</h1>
	<?php paco_aviso( $avisos ); ?>
	<p>Esto es <strong>lo ÚNICO</strong> que Paco (la IA) sabe de parking, perros, tronas, accesos… Escríbalo todo aquí; lo que no esté, el bot lo escala a un humano.</p>
	<form method="post">
		<?php wp_nonce_field( 'paco_info' ); ?>
		<input type="hidden" name="paco_guardar_info" value="1">
		<textarea name="infoPractica" rows="14" class="large-text" maxlength="10000" placeholder="Parking: … Perros: … Tronas: … Acceso silla de ruedas: …"><?php echo esc_textarea( $texto ); ?></textarea>
		<p class="submit"><button type="submit" class="button button-primary">Guardar</button></p>
	</form>
	</div>
	<?php
}
