#!/bin/sh
# Sirve Prusia en local y abre el navegador.
cd "$(dirname "$0")" || exit 1
node build.mjs || exit 1
cd docs || exit 1
python3 -m http.server "${PORT:-8123}" --bind 127.0.0.1 >/dev/null 2>&1 &
sleep 0.6
open "http://127.0.0.1:${PORT:-8123}/" 2>/dev/null || echo "Abre http://127.0.0.1:${PORT:-8123}/"
wait
