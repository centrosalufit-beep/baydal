// Entrada sobria de secciones (solo si el usuario no pide movimiento reducido)
if (matchMedia("(prefers-reduced-motion: no-preference)").matches && "IntersectionObserver" in window) {
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
  }, { rootMargin: "0px 0px -8% 0px" });
  document.querySelectorAll("main section:not(.hero-full)").forEach(function (s) {
    s.classList.add("rv"); io.observe(s);
  });
}

// Mapa: carga el iframe de Google solo al pulsar (cero cookies hasta que el usuario lo pide)
document.addEventListener("click", function (e) {
  var b = e.target.closest(".map-facade");
  if (!b) return;
  var f = document.createElement("iframe");
  f.src = b.dataset.map;
  f.title = "Google Maps – Restaurante Baydal";
  f.loading = "lazy";
  f.allowFullscreen = true;
  b.replaceWith(f);
});

// Reservas: el momento del día (desayuno/almuerzo/comida/cena) sugiere las horas
var HORAS = {
  desayuno: ["8:00", "8:30", "9:00", "9:30", "10:00", "10:30", "11:00"],
  almuerzo: ["11:30", "12:00", "12:30", "13:00"],
  comida:   ["13:00", "13:30", "14:00", "14:30", "15:00", "15:30"],
  cena:     ["19:30", "20:00", "20:30", "21:00", "21:30", "22:00"]
};
document.addEventListener("change", function (e) {
  if (e.target.id !== "res-meal") return;
  var sel = document.getElementById("res-hora");
  sel.innerHTML = (HORAS[e.target.value] || [])
    .map(function (h) { return '<option value="' + h + '">' + h + "</option>"; })
    .join("");
});

// Quiz del senyoret: responder, dar feedback y funnel a reservar
document.querySelectorAll(".quiz").forEach(function (quiz) {
  var total = parseInt(quiz.dataset.total, 10) || 0;
  var score = 0, answered = 0;
  quiz.querySelectorAll(".quiz-q").forEach(function (q) {
    var opts = q.querySelectorAll(".quiz-opt");
    opts.forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (q.classList.contains("done")) return;
        q.classList.add("done");
        var ok = btn.dataset.ok === "1";
        btn.classList.add(ok ? "right" : "wrong");
        if (ok) { score++; }
        else {
          var correct = q.querySelector('.quiz-opt[data-ok="1"]');
          if (correct) { correct.classList.add("right"); }
        }
        opts.forEach(function (b) { b.disabled = true; });
        var ex = q.querySelector(".quiz-explain");
        if (ex) { ex.hidden = false; }
        answered++;
        if (answered === total) {
          var res = quiz.querySelector(".quiz-result");
          var n = quiz.querySelector(".quiz-score-n");
          if (n) { n.textContent = score; }
          if (res) { res.hidden = false; res.scrollIntoView({ block: "nearest" }); }
        }
      });
    });
  });
});

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
