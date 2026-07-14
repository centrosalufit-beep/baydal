# -*- coding: utf-8 -*-
"""Plan C: convierte dist/ en el payload de opciones de WordPress.

Genera planc/payload/*.json — un fichero por opción de wp_options:
  baydal_neo_pag_<slug>   : HTML de cada página (string)
  baydal_neo_asset_<n>    : {"t": mime, "b": base64} por asset
  baydal_neo_assets_idx   : {ruta → n}
  baydal_neo_301          : [{"re": regex_php, "to": destino}]
La inyección la hace Claude vía MCP (wp_update_option), una opción por llamada.

Uso: python build.py && python planc/build_planc.py
"""
import os, re, json, base64, mimetypes

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST = os.path.join(ROOT, "dist")
OUT = os.path.join(ROOT, "planc", "payload")

MIMES = {".webp": "image/webp", ".woff2": "font/woff2", ".xml": "application/xml",
         ".txt": "text/plain; charset=utf-8", ".css": "text/css; charset=utf-8",
         ".js": "application/javascript; charset=utf-8", ".png": "image/png"}


def main():
    if not os.path.isdir(DIST):
        raise SystemExit("No existe dist/ — ejecuta antes: python build.py")
    os.makedirs(OUT, exist_ok=True)
    for f in os.listdir(OUT):
        os.remove(os.path.join(OUT, f))

    opciones = {}

    # Páginas y assets desde dist/
    assets_idx, n_asset = {}, 0
    for base, _dirs, files in os.walk(DIST):
        for f in files:
            full = os.path.join(base, f)
            rel = os.path.relpath(full, DIST).replace("\\", "/")
            if f == ".htaccess":
                continue
            if f.endswith(".html"):
                path = rel[:-len("index.html")].strip("/") if rel.endswith("index.html") else rel
                slug = "home" if path == "" else path.replace("/", "_").replace(".", "_")
                opciones[f"baydal_neo_pag_{slug}"] = open(full, encoding="utf-8").read()
            else:
                n_asset += 1
                mime = MIMES.get(os.path.splitext(f)[1].lower()) or mimetypes.guess_type(f)[0] or "application/octet-stream"
                opciones[f"baydal_neo_asset_{n_asset}"] = {
                    "t": mime, "b": base64.b64encode(open(full, "rb").read()).decode()}
                assets_idx["/" + rel] = n_asset
    opciones["baydal_neo_assets_idx"] = assets_idx

    # Mapa 301 desde el .htaccess generado
    reglas = []
    for line in open(os.path.join(DIST, ".htaccess"), encoding="utf-8"):
        m = re.match(r"RewriteRule\s+(\S+)\s+(\S+)\s+\[R=301", line.strip())
        if m:
            reglas.append({"re": "#" + m.group(1).replace("#", r"\#") + "#", "to": m.group(2)})
    opciones["baydal_neo_301"] = reglas

    # El interruptor NO se incluye: se activa a mano al final de la inyección.
    total = 0
    for k, v in opciones.items():
        data = json.dumps(v, ensure_ascii=False)
        with open(os.path.join(OUT, k + ".json"), "w", encoding="utf-8") as fh:
            fh.write(data)
        total += len(data.encode())
    paginas = sum(1 for k in opciones if k.startswith("baydal_neo_pag_"))
    print(f"{len(opciones)} opciones ({paginas} páginas, {n_asset} assets, {len(reglas)} reglas 301) — {total // 1024} KB en {OUT}")
    grande = max(((len(json.dumps(v)) if not isinstance(v, str) else len(v), k) for k, v in opciones.items()))
    print(f"opción más grande: {grande[1]} ({grande[0] // 1024} KB)")


if __name__ == "__main__":
    main()
