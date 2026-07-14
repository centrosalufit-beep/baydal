# Baydal — proyecto digital

Restaurante Baydal · puerto de Calp, desde 1941 · [baydal.es](https://baydal.es)

## Ramas

- **`web`** — la web nueva (generador estático, 8 secciones × 4 idiomas). El trabajo vivo está aquí.
- **`CHATBOT`** — Paco: sistema de reservas por WhatsApp (bot 5 idiomas + panel de gestión + guías de despliegue).
- `main` — este índice.

## Continuar desde otro PC

```bash
git clone https://github.com/centrosalufit-beep/baydal.git
cd baydal
git checkout web
python build.py        # genera la web en dist/ (solo necesita Python 3 + Pillow)
VER-WEB.bat            # o: cd dist && python -m http.server 8123
```

## Qué hay en la rama `web`

| Ruta | Qué es |
|---|---|
| `build.py` | Generador: textos 4 idiomas, carta completa, schema.org — TODO el contenido vive aquí |
| `assets/` | CSS, JS, tipografía Cormorant (auto-alojada), 30+ imágenes WebP editadas y logo |
| `prensa/np-85-aniversario.md` | Nota de prensa 85º + post GBP — **pendiente de visto bueno, NO enviada** |
| `prensa/gbp-pack.md` | Google Business listo para pegar (descripción, categorías, fotos, correcciones NAP) |
| `prensa/wikidata-spec.md` | Especificación del ítem de Wikidata con referencias |
| `dist/` | Salida generada (no se versiona: `python build.py`) |

## Qué hay en la rama `CHATBOT`

| Ruta | Qué es |
|---|---|
| `README.md` | Puesta en marcha completa en 11 pasos (Firebase Blaze + deploy + seed) |
| `SCHEMA.md` | Contrato del sistema: datos, motor de mesas, máquina de estados de Paco |
| `functions/` | Bot de WhatsApp (Cloud Functions TS — tests: `cd functions && npm install && npm test`) |
| `panel/` | Panel de gestión: agenda, pendientes, mesas, horarios, festivos, carta 5 idiomas, estadísticas, CSV |
| `docs/ALTA_META.md` | Alta en Meta paso a paso + compra del número investigada (Zadarma / Twilio / fijo propio) |
| `docs/OPERACION.md` | Chuleta de 1 página para el personal de sala |
| `docs/INTEGRACION_WEB.md` | Encargo listo para conectar el formulario de baydal.es con Paco |

## Contexto del proyecto

- Auditoría de la web actual: [informe](https://claude.ai/code/artifact/4e66de0f-45ca-488a-a259-374cb42ae799)
- Hoja de ruta game changer: [plan](https://claude.ai/code/artifact/8aa04e4c-a2ea-4934-8b92-943e258e173f)
- Preview de la web nueva: [artifact](https://claude.ai/code/artifact/35bd312a-127c-45b9-ab09-9b30b9ef8c2a)
- Sistema de reservas (bot WhatsApp + panel): rama **`CHATBOT`** de este repo — empezar por su `README.md`; pendiente solo de desplegar (Firebase + alta en Meta)
- Rutina SEO semanal: deja borrador en Gmail cada lunes ("SEO Baydal — semana…")

## Datos canónicos (no cambiar sin fuente)

- Dirección oficial: **Avinguda del Port, 10** — 03710 Calp (Google/Yelp dicen otra: corregirlos allí)
- Fundado: **julio de 1941** (Salvador y María Baydal, "la roqueta")
- Sobre el senyoret: decir "nació en el Baydal" citando À Punt/Las Provincias/Viquipèdia;
  **no fijar década** (fuentes discrepan 60s/80s) hasta confirmación familiar
