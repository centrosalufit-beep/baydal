@echo off
rem Lanza la vista previa de la nueva baydal.es y abre el navegador
cd /d "%~dp0dist"
start "" http://localhost:8123
python -m http.server 8123
