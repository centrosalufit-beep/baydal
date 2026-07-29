=== Paco — Reservas Baydal ===
Requires at least: 6.0
Tested up to: 6.9
Requires PHP: 7.4
Stable tag: 1.0.0
License: GPLv2 or later

Conecta la web del restaurante Baydal (Calp) con «Paco», el bot de reservas por WhatsApp.

== Descripción ==

* Shortcode [paco_reservas]: formulario de reserva que abre WhatsApp con el mensaje ya montado (idiomas es/en/de/fr, atributo lang="auto|es|en|de|fr").
* Botón flotante de WhatsApp opcional (se activa en Ajustes).
* Gestión desde el escritorio de WordPress de la carta, los horarios y la información práctica que usa el bot, a través de la API wpApi (Firebase). No se guarda nada de eso en WordPress.

== Instalación ==

1. Copie la carpeta paco-chatbot en wp-content/plugins/.
2. Active «Paco — Reservas Baydal» en el menú Plugins.
3. En «Paco (Reservas) → Ajustes» introduzca el número de WhatsApp de Paco (E.164 sin +, ej. 34677490049) y el token de la API, y pulse «Probar conexión» para comprobar que todo responde.
4. Inserte el shortcode [paco_reservas] en la página de reservas (y en sus versiones /en/, /de/ y /fr/ si las hay; el idioma se detecta solo).

== Changelog ==

= 1.0.0 =
* Primera versión: shortcode de reservas, botón flotante, pantallas de Carta, Horarios e Información práctica contra la API wpApi.
