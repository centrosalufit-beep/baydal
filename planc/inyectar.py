# -*- coding: utf-8 -*-
"""Inyecta planc/payload/*.json en wp_options de baydal.es vía el MCP de AI Engine.
Credenciales en ../.mcp-baydal.txt (url=, token=). Reanudable: guarda estado en
planc/payload/.inyectadas y salta lo ya subido. NO toca 'baydal_neo_activo'."""
import os, json, glob, time, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PAY = os.path.join(ROOT, "planc", "payload")
ESTADO = os.path.join(PAY, ".inyectadas")

cred = dict(l.strip().split("=", 1) for l in open(os.path.join(ROOT, ".mcp-baydal.txt")) if "=" in l)
URL, TOKEN = cred["url"], cred["token"]


def llamar(metodo, params, reintentos=3):
    cuerpo = json.dumps({"jsonrpc": "2.0", "id": 1, "method": metodo, "params": params}).encode()
    for i in range(reintentos):
        try:
            req = urllib.request.Request(URL, data=cuerpo, headers={
                "Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"})
            with urllib.request.urlopen(req, timeout=120) as r:
                d = json.loads(r.read())
            if "error" in d:
                raise RuntimeError(d["error"])
            return d["result"]
        except Exception as e:
            if i == reintentos - 1:
                raise
            time.sleep(2 * (i + 1))


hechas = set(open(ESTADO).read().split()) if os.path.exists(ESTADO) else set()
ficheros = sorted(glob.glob(os.path.join(PAY, "*.json")))
pendientes = [f for f in ficheros if os.path.basename(f)[:-5] not in hechas]
print(f"{len(ficheros)} opciones, {len(pendientes)} pendientes")

for i, f in enumerate(pendientes, 1):
    clave = os.path.basename(f)[:-5]
    valor = json.load(open(f, encoding="utf-8"))
    try:
        llamar("tools/call", {"name": "wp_update_option", "arguments": {"key": clave, "value": valor}})
        nota = ""
    except RuntimeError as e:
        # update_option devuelve false si el valor no cambia: verificar y seguir
        actual = llamar("tools/call", {"name": "wp_get_option", "arguments": {"key": clave}})
        texto = actual["content"][0]["text"]
        leido = json.loads(texto)
        if leido != valor:
            raise SystemExit(f"{clave}: fallo real de update y el valor NO coincide: {e}")
        nota = " (sin cambios)"
    with open(ESTADO, "a") as st:
        st.write(clave + "\n")
    print(f"[{i}/{len(pendientes)}] {clave} ({os.path.getsize(f)//1024} KB){nota}")

print("Inyección completa. El interruptor baydal_neo_activo NO se ha tocado.")
