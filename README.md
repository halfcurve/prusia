# Prusia

Taller digital de negativos para **cianotipia**, pensado para una **Epson EcoTank ET-2865**
y para la química real del proceso. Prepara el negativo a tamaño exacto y enseña cómo
quedará la copia antes de gastar papel.

No es un filtro de «invertir y listo»: el negativo sale en **color** (amarillo dominante),
porque en esta impresora el negro de tinta *dye* es el peor bloqueador de UV que hay.

## Abrir

```sh
./abrir.sh            # sirve en http://127.0.0.1:8123 y abre el navegador
```

o directamente `dist/index.html` (es un archivo único, sin red, sin dependencias).

## Qué hace

**Revelar** — tres columnas: el negativo (lo que se imprime), la previsualización de la
copia y los controles de la cianotipia. Vistas: *Cianotipia*, *Negativo*, *Original* y
*Lado a lado*.

- **Negativo**: soporte (film OHP / papel / vellum), tinta de bloqueo, rango en log D
  con seguimiento automático de la química, punto negro y blanco, medios tonos, contraste
  y mezcla a gris.
- **Cianotipia**: química (clásica / New Cyanotype / simple), exposición en pasos,
  azul máximo, papel, oxidación (0-24 h), grano y virado (té, tanino, café, pirogalol,
  níquel, fosfato, carbonato) con intensidad.
- Los avisos de la barra inferior son de la cadena completa: si el film no da la densidad
  que pide la química, lo dice con el número.

**Calibrar** — carta de 21 pasos + comparativa de tintas, foto de la tira revelada,
ajuste de las cuatro esquinas y extracción de la curva real de *tu* cadena (regresión
isotónica + spline monótono). El perfil queda guardado y se aplica a todo.

**Imprimir** — tamaño de papel y márgenes en milímetros, resolución 360/720 ppp, espejo
(obligatorio si pones la tinta contra el papel), marcas de corte y etiqueta. Exporta PNG
a tamaño físico y también imprime desde el navegador con `@page` del tamaño exacto.
Incluye una hoja de prueba de escala de 100 mm.

## Cómo está hecho

Sin dependencias: HTML, CSS y JS que el navegador ejecuta tal cual.

| Archivo | Qué es |
|---|---|
| `src/js/sci.js` | Colorimetría CIE 1931, pigmentos como bandas de absorción Beer–Lambert, LUT concentración → sRGB, papeles, virados, oxidación |
| `src/js/tone.js` | Splines monótonos (Fritsch–Carlson), curvas de tono, respuesta del proceso, presets de química medidos |
| `src/js/engine.js` | La cadena completa: imagen → L* → curva → inversa de la respuesta → densidad requerida → tinta → color. Y los diagnósticos |
| `src/js/calibrate.js` | Muestreo de la tira con homografía, densidades, PAVA, diagnóstico y perfil |
| `src/js/sheets.js` | Carta de calibración y gráfica de la curva |
| `src/js/render.js` | Preview, exportación a tamaño físico, marcas, hoja de escala |
| `src/js/ui.js` | Controles (slider, select, swatches, toggle, número) |
| `src/js/app.js` | Estado, eventos, vistas, exportación e impresión |
| `src/styles.css` | Sistema de diseño: un acento, cuatro grises cálidos, una escala de radios |
| `build.mjs` | Junta todo en `dist/index.html` (`node build.mjs`) |

`tools/` tiene el cargador para Node (`load.mjs`), la inspección de la LUT (`lut-peek.mjs`)
y el ajuste del pigmento contra anclas medidas (`fit-pigment.mjs`).

## El modelo, en corto

1. **Pigmento**: tres bandas gaussianas de absorción (rojo-naranja, verde, violeta) que
   reproducen las anclas medidas de laboratorio del azul de Prusia (L\* 88/82/62/42/26).
   Beer–Lambert da densidad por longitud de onda; CIE 1931 da el color que ves.
2. **Proceso**: la respuesta `Q` (fracción de exposición → fracción de azul) sale de la
   química o, mejor, de tu tira de 21 pasos. La copia = `Q(1 − densidad/alcance)`.
3. **Negativo**: exactamente la inversa. Se pide la densidad que hace falta, se recorta al
   tope real del soporte y se convierte en cobertura de tinta. Por eso los diagnósticos
   pueden decir «el film se queda en 1,65 D» en vez de mentir.

Números que sostienen el resto (detalle y fuentes en `research/`):

- ET-2865: 4 tintas **dye**, sin negro claro ni mate; techo realista en film ≈ **1,85 de
  densidad UV**; a partir de ~60 % de cobertura la tinta se corre en el Pictorico.
- Cianotipo clásico: rango **1,0–1,2 log D**. New Cyanotype: **1,8–2,4**. Ahí está el aviso
  de «tope del film» que aparece al elegir Ware.
- El azul de Prusia absorbe en 690–730 nm (rojo) y refleja 455–475 nm; el color de la copia
  se calcula desde el espectro, no se elige de una paleta.

## Licencia de la imagen de ejemplo

Karl Blossfeldt, *Cucurbita*, 1928 — dominio público (Wikimedia Commons).
