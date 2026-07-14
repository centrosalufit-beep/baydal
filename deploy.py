# -*- coding: utf-8 -*-
"""Despliegue de dist/ a Hostinger por FTP (TLS).

Uso:
  python build.py && python deploy.py            # sube todo dist/
  python deploy.py --dry-run                     # solo lista lo que subiría

Credenciales en .ftp-credentials (fichero ignorado por git), 4 líneas:
  host=ftp.baydal.es
  user=usuario@baydal.es
  pass=xxxxxxxx
  dir=/public_html            # o /public_html/nueva para el subdominio de pruebas
"""
import os, sys, ftplib

ROOT = os.path.dirname(os.path.abspath(__file__))
DIST = os.path.join(ROOT, "dist")
CRED = os.path.join(ROOT, ".ftp-credentials")


def leer_credenciales():
    if not os.path.exists(CRED):
        sys.exit(f"Falta {CRED} — crea el fichero con host=, user=, pass=, dir= (ver cabecera de deploy.py)")
    c = {}
    for line in open(CRED, encoding="utf-8"):
        line = line.strip()
        if "=" in line and not line.startswith("#"):
            k, v = line.split("=", 1)
            c[k.strip()] = v.strip()
    for k in ("host", "user", "pass", "dir"):
        if k not in c:
            sys.exit(f"Falta '{k}=' en .ftp-credentials")
    return c


def ficheros_locales():
    out = []
    for base, _dirs, files in os.walk(DIST):
        for f in files:
            full = os.path.join(base, f)
            rel = os.path.relpath(full, DIST).replace("\\", "/")
            out.append((full, rel))
    return sorted(out, key=lambda x: x[1])


def mkdirs_remoto(ftp, remoto, creados):
    partes = remoto.split("/")[:-1]
    ruta = ""
    for p in partes:
        ruta = f"{ruta}/{p}" if ruta else p
        if ruta in creados:
            continue
        try:
            ftp.mkd(ruta)
        except ftplib.error_perm:
            pass  # ya existe
        creados.add(ruta)


def main():
    dry = "--dry-run" in sys.argv
    if not os.path.isdir(DIST):
        sys.exit("No existe dist/ — ejecuta antes: python build.py")
    files = ficheros_locales()
    total = sum(os.path.getsize(f) for f, _ in files)
    print(f"{len(files)} ficheros, {total // 1024} KB")
    if dry:
        for _, rel in files:
            print(" ", rel)
        return

    c = leer_credenciales()
    try:
        ftp = ftplib.FTP_TLS(c["host"], timeout=30)
        ftp.login(c["user"], c["pass"])
        ftp.prot_p()
        print("Conectado con TLS")
    except Exception as e:
        # ponytail: algunos planes de Hostinger solo aceptan FTP plano; avisamos y seguimos
        print(f"FTPS falló ({e}); reintento con FTP sin TLS")
        ftp = ftplib.FTP(c["host"], timeout=30)
        ftp.login(c["user"], c["pass"])
    ftp.cwd(c["dir"])

    creados = set()
    for i, (full, rel) in enumerate(files, 1):
        mkdirs_remoto(ftp, rel, creados)
        with open(full, "rb") as fh:
            ftp.storbinary(f"STOR {rel}", fh)
        print(f"[{i}/{len(files)}] {rel}")
    ftp.quit()
    print(f"OK: {len(files)} ficheros subidos a {c['host']}{c['dir']}")


if __name__ == "__main__":
    main()
