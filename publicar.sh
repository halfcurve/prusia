#!/bin/bash
# Publica Prusia en GitHub con Pages servido desde docs/.
#   bash publicar.sh
# Se puede ejecutar las veces que haga falta: si el repo ya existe no lo crea,
# solo empuja, y si Pages ya está encendido no lo vuelve a configurar.

set -u
cd "$(dirname "$0")" || exit 1

GH="$HOME/.pi/bin/gh"
DUEÑO="halfcurve"
REPO="prusia"
DESCRIPCION="Taller de negativos para cianotipia con simulacion espectral"

if ! "$GH" auth status >/dev/null 2>&1; then
  echo "gh no tiene sesión: ejecuta $GH auth login"
  exit 1
fi

# 1. El repo
if "$GH" repo view "$DUEÑO/$REPO" >/dev/null 2>&1; then
  echo "· el repo $DUEÑO/$REPO ya existe"
else
  echo "· creo $DUEÑO/$REPO"
  "$GH" repo create "$REPO" --public --description "$DESCRIPCION" || exit 1
fi

# 2. El código
echo "· empujo main"
git remote set-url origin "https://github.com/$DUEÑO/$REPO.git"
git push -u origin main || exit 1

# 3. Pages sobre /docs, que es donde build.mjs deja el HTML autónomo
echo "· enciendo Pages"
JSON='{"source":{"branch":"main","path":"/docs"}}'
if echo "$JSON" | "$GH" api -X POST "repos/$DUEÑO/$REPO/pages" --input - >/dev/null 2>&1; then
  echo "  Pages creado"
elif echo "$JSON" | "$GH" api -X PUT "repos/$DUEÑO/$REPO/pages" --input - >/dev/null 2>&1; then
  echo "  Pages ya existía: actualizado"
else
  echo "  no se pudo configurar Pages (hazlo a mano: Settings → Pages → main /docs)"
fi

# 4. Dónde queda
sleep 2
URL=$("$GH" api "repos/$DUEÑO/$REPO/pages" --jq '.html_url' 2>/dev/null)
ESTADO=$("$GH" api "repos/$DUEÑO/$REPO/pages" --jq '.status' 2>/dev/null)
echo
echo "  repo:  https://github.com/$DUEÑO/$REPO"
echo "  web:   ${URL:-pendiente} (estado: ${ESTADO:-sin configurar})"
echo "  si el estado no es «built», espera un minuto y recarga."
