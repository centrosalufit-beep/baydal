// Entrada sobria de secciones (solo si el usuario no pide movimiento reducido)
if (matchMedia("(prefers-reduced-motion: no-preference)").matches && "IntersectionObserver" in window) {
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
  }, { rootMargin: "0px 0px -8% 0px" });
  document.querySelectorAll("main section:not(.hero-full)").forEach(function (s) {
    s.classList.add("rv"); io.observe(s);
  });
}

// Reserva por WhatsApp: construye el wa.me con el mensaje en el idioma de la página
document.addEventListener("submit", function (e) {
  var f = e.target;
  if (f.id !== "res-form") return;
  e.preventDefault();
  var d = new FormData(f);
  var fecha = new Date(d.get("fecha") + "T00:00");
  var fechaTxt = fecha.toLocaleDateString(document.documentElement.lang, { weekday: "long", day: "numeric", month: "long" });
  var msg = f.dataset.msg
    .replace("%F", fechaTxt)
    .replace("%H", d.get("hora"))
    .replace("%P", d.get("pax"))
    .replace("%N", d.get("nombre"));
  window.open("https://wa.me/" + f.dataset.wa + "?text=" + encodeURIComponent(msg), "_blank", "noopener");
});
