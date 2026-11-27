# Prusia

Taller digital de negativos para **cianotipia**, pensado para una **Epson EcoTank ET-2865**
y para la química real del proceso. Prepara el negativo a tamaño exacto y enseña cómo
quedará la copia antes de gastar papel.

[**Abrir el taller: halfcurve.github.io/prusia**](https://halfcurve.github.io/prusia) — sin instalar nada, también en el móvil.

No es un filtro de «invertir y listo»: el negativo sale en **color** (amarillo dominante),
porque en esta impresora el negro de tinta *dye* es el peor bloqueador de UV que hay.

## Abrir

```sh
./abrir.sh            # sirve en http://127.0.0.1:8123 y abre el navegador
```

o directamente `docs/index.html` (es un archivo único, sin red, sin dependencias).

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
| `build.mjs` | Junta todo en `docs/index.html` (`node build.mjs`) |
| `docs/` | Lo que sirve GitHub Pages: es el HTML autónomo ya construido |

`tools/` tiene el cargador para Node (`load.mjs`), la inspección de la LUT (`lut-peek.mjs`)
y el ajuste del pigmento contra anclas medidas (`fit-pigment.mjs`).

## El modelo, en corto

1. **Pigmento**: tres bandas gaussianas de absorción (rojo-naranja, verde, violeta) que
   reproducen las anclas medidas de laboratorio del azul de Prusia (L\* 88/82/62/42/26).
   Beer–Lambert da densidad por longitud de onda; CIE 1931 da el color que ves.
2. **Proceso**: la respuesta `Q` (fracción de exposición → fracción de azul) sale de la
   química o, mejor, de tu tira de pasos (21 a ojo, 51 o 101 escaneada). La copia =
   `Q(1 − densidad/alcance)`.
3. **Negativo**: exactamente la inversa. Se pide la densidad que hace falta, se recorta al
   tope real del soporte y se convierte en cobertura de tinta. Por eso los diagnósticos
   pueden decir «el film se queda en 1,65 D» en vez de mentir.

La calibración cambia **el negativo**, no la copia: tú mides la respuesta real, Prusia la
mete en la inversa y el azul vuelve a donde tenía que estar. Es la misma jugada que el
método de Easy Digital Negatives, que también corrige con una tabla de 256 valores (un
LUT) y desaconseja las curvas de Photoshop por su posterización.

Números que sostienen el resto (detalle y fuentes en `research/`):

- ET-2865: 4 tintas **dye**, sin negro claro ni mate; techo realista en film ≈ **1,85 de
  densidad UV**; a partir de ~60 % de cobertura la tinta se corre en el Pictorico.
- Cianotipo clásico: rango **1,0–1,2 log D**. New Cyanotype: **1,8–2,4**. Ahí está el aviso
  de «tope del film» que aparece al elegir Ware.
- El azul de Prusia absorbe en 690–730 nm (rojo) y refleja 455–475 nm; el color de la copia
  se calcula desde el espectro, no se elige de una paleta.

## Lo que dicen las fuentes

Lo que sigue no es folclore: está en los manuales de Jacquard y en la web de Easy Digital
Negatives, y está aplicado en la app.

**Jacquard** (manual del *Cyanotype Kit* y del *Cyanotype Sensitizer Set*):

- Parte A: **40 g de ferricianuro potásico en 400 ml** de agua (10 %). Parte B: **100 g de
  citrato férrico amónico en 400 ml** (25 %). Se mezclan **1:1** → 5 % + 12,5 %, que es un
  **62 % de la clásica de Herschel**. Por eso el preset «Kit Jacquard» pide 1,05 D en vez de
  1,15 y da un azul algo más suave (Dmáx 1,12 frente a 1,32).
- La mezcla **aguanta 2–4 h**; las disoluciones madre, meses. Eso está en el aviso del preset.
- Exposición: **1–30 min** según condiciones (su kit anuncia 10–20 min), y «pasarse casi
  siempre se prefiere a quedarse corto».
- Revelado: agua fría **al menos 5 min** hasta que salga clara; una gota de agua oxigenada
  azula al instante y, sin ella, el color sube en **24 h**.
- Virado: **blanqueo** en carbonato sódico (1–2 cucharaditas por litro, **menos de 5 min**)
  hasta amarillo dorado, aclarado y baño de **tánico 2 %** o té (2–24 h). La app modela el
  virado sobre el pigmento y llama «blanqueo» al paso previo, que es el que de verdad cambia
  el color; tintar sin blanquear solo lo ensucia.

**Easy Digital Negatives** (Peter Mrhar):

- El negativo de calibración se imprime **espejado e invertido**, en **color** y sin ajustes
  automáticos: igual que aquí (`Espejar el negativo`, modo Color, gestión desactivada).
- Corrige con **tablas de 256 entradas** (mapeo/LUT), no con curvas: «la calidad de estas
  correcciones es bastante pobre» — posterización y vecinos que se mueven. La app usa un LUT
  monótono de 256 valores para el negativo y de 4096 para la previsualización.
- Su regla de exposición: si sale velado, **a la mitad**; si sale corto, **al doble**. Los
  botones de exposición de Prusia van en pasos, y cada paso dobla o reduce a la mitad.
- Sobre la tinta: **la apariencia no predice el bloqueo UV**. Mrhar mide 57 tonos útiles con
  un negativo rojizo frente a 23 con uno negro; en tintas Epson, Reeder y Anderson miden el
  amarillo como el que más absorbe después del negro de foto. De ahí que la app no ordene
  las tintas por lo bonitas que son y que la carta de calibración lleve una comparativa:
  el orden bueno es el que sale en **tu** impresora.

## Licencia de la imagen de ejemplo

Karl Blossfeldt, *Cucurbita*, 1928 — dominio público (Wikimedia Commons).
