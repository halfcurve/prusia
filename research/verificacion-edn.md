# Verificación: método de Easy Digital Negatives (Peter Mrhar) y ChartThrob frente a la app Prusia

**Fecha del trabajo:** verificación hecha contra las páginas públicas de `easydigitalnegatives.com`, `photomrhar.com` y el repositorio `joker-b/ChartThrob`, más lectura directa del código de la app (`src/js/tone.js`, `engine.js`, `calibrate.js`, `sheets.js`, `app.js`, `README.md`).

**Método:** se ha dado prioridad a la fuente primaria (web del autor y código del script). Las citas son literales, en el idioma original de la fuente, con su URL. Las interpretaciones del que suscribe van marcadas como **[inferencia]**.

---

## 1. Resumen ejecutivo

1. **EDN rechaza las curvas de Photoshop, sí, y por dos motivos textuales:** posterización y "principio de palanca" sobre los valores vecinos. En su lugar propone el **Gradient Map** y, en la versión 2.x, la **LUT 1D** calculada desde una **cuña de grises ("grayscale step wedge") de 256 campos**.
2. **Las rejillas que ofrece EDN son 101 y 256** (TestCharts: `EDN_RGB_101.tif`, `EDN_RGB_256.tif`); la versión antigua del script hablaba de rejilla **10×10** y **16×16**. **Recomienda la de 256.** No existe una rejilla de 51 campos: los "51/52" que aparecen en EDN son *puntos de control de una LUT*, no parches de una carta.
3. **El flujo EDN es:** imprimir la cuña (invertida, espejada, en color) → copia de contacto → escanear/fotografiar/medir → calcular corrección → reimprimir con la corrección → **segunda pasada ("correction of corrections")**. La app cubre los cinco primeros pasos; **no tiene segunda pasada ni promedio de varias muestras.**
4. **El negativo coloreado de EDN** distingue *maximum blocker* (rojo, el que más bloquea UV) de *optimum blocker* (el que más **tonos útiles** da). El dato numérico existe y es exactamente el que cita la app: **23 tonos con negro frente a 57 con un negativo rojizo (HSB 330-100-0)** en una tabla de **101 campos**, en cianotipo. **Pero ese número mide cantidad de tonos, no densidad UV.** EDN **no publica ninguna cifra de densidad UV** comparando negativo coloreado con negro: solo dice, cualitativamente, que "el rojo bloquea mejor que el negro".
5. **EDN no fija ni un "ink limit" numérico ni un Dmax exigido al negativo.** Su control es el *print density* del driver ("Printer Manages Colors") y lo que muestra es un **D-max aproximado de la muestra revelada**, calculado desde el valor Lab. Las cifras de la app (film 1,85 D; papel 1,30 D; vellum 1,55 D; ganancias por tinta 1,0/0,95/0,85/0,55/0,5) **no vienen de EDN**: son del informe interno del ET-2865.
6. **Sobre cianotipo EDN sí es específico:** dice que la copia "becomes quite contrasting" y que de una cuña solo quedan **~17 tonos** útiles (23 en la tabla de 101 campos). Es decir: alto contraste y rango tonal corto. **No he encontrado que EDN caracterice el Dmax del cianotipo como "poco profundo"**; eso es de Mike Ware, no de Mrhar.
7. **¿La app implementa EDN?** Implementa la **familia** de métodos (medir una tira revelada → corregir → invertir/espejar → imprimir en color), pero **no el método EDN**: su calibración es un **ajuste de curva monótona sobre 21/51/101 parches** (PAVA + spline de Fritsch–Carlson), es decir, del lado de las *curvas* en la propia disputa de Mrhar —aunque sin posterización, porque la curva se evalúa en flotante y se cuantiza a 8 bits al final—. La "LUT de 256" del motor (`negMap`) es la **cuantización de salida de un modelo continuo**, no una tabla medida de 256 entradas.

---

## 2. Qué dice EDN, con citas

### 2.1 Por qué rechaza las curvas de Photoshop (posterización y "palanca")

> «Most freeware programs have used curves to produce transparent negatives, which are quite unreliable for making corrections.
> One of the disadvantages of curves is the "posterization" of colors. Due to the curve's nature, darker tones often become lighter and vice versa (1).
> If we want to make corrections to the curve, with each movement of the point on the curve, due to the curve's operation according to the principle of levers, the adjacent values also change (2). Correction utilizing a curve, therefore, often leads to even more significant errors.»
> — <http://www.easydigitalnegatives.com/about-edn/>

> «Instead of curves, I preferred to use the so-called Gradient Map to add corrections. With this technique, with correctly selected parameters, there is no "posterization" of adjacent colors. The Gradient Map is much more accurate than curves.»
> — <http://www.easydigitalnegatives.com/about-edn/>

Y sobre la calidad del fichero de curva que el propio EDN sigue exportando por compatibilidad:

> «Adobe Photoshop Curve is a curve that we used at the beginning of the development of digital negatives technology to make corrections. As mentioned, the quality of these fixes is quite poor. But because it is still used by a considerable number of less demanding photographers today, I kept it in this version of the EDN program.»
> — <http://www.easydigitalnegatives.com/absolute-beginner/>

> «Once again. Do not use curves to make corrections. Changing the value of a single control point will also change the values at adjacent points (11).»
> — <http://www.easydigitalnegatives.com/fine-tuning-edn/>

**Matiz importante [inferencia a partir de las tres citas anteriores]:** EDN no elimina las curvas de su flujo; las sigue generando y las describe como el formato de peor calidad. Lo que hace es **recomendar Gradient Map / LUT** y usar internamente **21 puntos de control**, no 256:

> «Programers of various photo processing corrections have also found that the optimal number of points we use for corrections is about 16. […] In Easy Digital Negatives, curve correction and gradient maps are made with 15 "standard" points, as this technology rarely allows a more significant number of control points. Otherwise, Easy Digital Negatives uses 21 checkpoints to calculate corrections (5).»
> — <http://www.easydigitalnegatives.com/fine-tuning-edn/>

> «There are two main LUT files available in the program used for manual corrections, LUT 1D with 21 checkpoints (6) and LUT 1D with 52 checkpoints (7). If someone is brave enough, it can also change the 256 control points stored in the LUT 1D 256 file (8).»
> — <http://www.easydigitalnegatives.com/fine-tuning-edn/>

### 2.2 Qué usa en su lugar: cuña de grises y tabla de 256

EDN trabaja sobre una **"grayscale step wedge"** (cuña escalonada de grises) impresa como negativo y revelada por contacto:

> «Then we need a so-called grayscale step wedge, i.e. a black-and-white picture which is made of squares with different levels of brightness.»
> — <http://www.photomrhar.com/portfolio/easy-digital-negatives-historical-and-alternative-photography-2/>

> «Most programs of that era used 100 shades of color to read values in step wedge tabels. In our example, we observe that only 17 tones are useful for calculating corrections (4). **In testing the accuracy, I found that we get the most accurate results if we use a table with 256 tones (5).** With such a table, in our case, we get as many as 62 useful color values. Interestingly, a grid with a higher number of tones reduces the accuracy of the calculations.»
> — <http://www.easydigitalnegatives.com/about-edn/>

> «First, I replaced the old 101-field step wedge tables used by photographers until then with a 256-field table. Users of EDN negatives now have as many as 62 useful shades available when using the table with 256 squares (7).»
> — <http://www.easydigitalnegatives.com/color-blocker/>

> «Although the majority of users prefer using gray wedges with 101 color values, I frequently work with a grayscale step wedge with 256 colors (4). This method is able to display 2.5 times more color values, which of course allows a more accurate production of negatives.»
> — <http://www.photomrhar.com/portfolio/easy-digital-negatives-historical-and-alternative-photography-2/>

**Aviso de lectura [inferencia]:** "tabla de 256" en EDN designa **dos cosas distintas** que la app tiende a fundir en una:
- la **cuña de 256 parches** que se imprime y se mide (`EDN_RGB_256.tif`);
- el fichero **LUT 1D de 256 puntos de control** que se puede editar a mano.
No es "un LUT de 256 valores calculado a partir de la imagen". El cálculo interno de corrección usa 21 puntos.

### 2.3 Tamaños de rejilla exactos y cuál recomienda

| Rejilla | Dónde aparece | Cita |
|---|---|---|
| **101** | `TestCharts.zip`, fichero `EDN_RGB_101.tif` | «Classic 101 and 256 Grid Step Table» — <http://www.easydigitalnegatives.com/downloads/> |
| **256** | `EDN_RGB_256.tif` | «EDN_RGB_256.tif» — <http://www.easydigitalnegatives.com/downloads/> |
| **10×10 (=100)** y **16×16 (=256)** | script v1 | «which size of grayscale step wedge will we use, either a wedge with a small 10 x 10 grid or larger with a 16 x 16 grid» — <http://www.photomrhar.com/easy-digital-negatives/> |
| **21 pasos** | descarga antigua (`21_step_wedge.tif`), cuña clásica tipo Stouffer | «21 step grayscale wedge» — <http://www.photomrhar.com/download/ |
| **HSB Grid v2** | rejilla de color, no de grises, para buscar el blocker | «HSB_Grid_v2.tif», «HSB-GRID-340-EDN.tif» — <http://www.photomrhar.com/download/> |

**Cuál recomienda:** la de **256**. Texto explícito: «we get the most accurate results if we use a table with 256 tones» (<http://www.easydigitalnegatives.com/about-edn/>) y «I frequently work with a grayscale step wedge with 256 colors» (<http://www.photomrhar.com/portfolio/easy-digital-negatives-historical-and-alternative-photography-2/>).

**No hay rejilla de 51.** El "52" de EDN es un LUT: «LUT 1D 52 points (.cube)» (<http://www.easydigitalnegatives.com/files/EDN2_2/>) y «LUT 1D with 52 checkpoints» (<http://www.easydigitalnegatives.com/fine-tuning-edn/>).

### 2.4 Flujo completo, en pasos

Workflow declarado por EDN 2.2 (citas literales del diagrama de pasos):

> «The step wedge file is mirrored, inverted, and printed on transparent film.» → «We then create a positive image of the step wedge file.» → «The sample is digitized or scanned, photographed, or measured with a spectrometer.» → «We create a correction file and a file to preview the printed image.» → «We open the image to which we want to assign corrections. We edit the image as desired, add a correction file, we mirror and invert the image. The corrected image is then printed.»
> — <http://www.easydigitalnegatives.com/absolute-beginner/>

Detalle del paso de impresión de la cuña:

> «2. Invert the file; this is, change it to a negative image. 3. In the next step, mirror the image (Flip Horizontal) (3). […] 5. If you have the option, select the "Printer Manages Colors" option (4). […] 7. The photo of the sample should not be printed in grayscale but in color mode. 8. Print the final photo and wait for about an hour for the ink on the transparent film to dry completely.»
> — <http://www.easydigitalnegatives.com/absolute-beginner/>

Regla de exposición (la que cita el README de la app):

> «If we overexpose the sample, we will not notice any white tones in the lower part of the step wedge table (10). In this case, we shorten the exposure time by half. […] If we exposed the sample with too short exposure time, we would notice a white, unprinted area (11) in the sample's lower part. In this case, the exposure time must be extended by 2x.»
> — <http://www.easydigitalnegatives.com/absolute-beginner/>

Y el paso que la app **no** tiene, la segunda pasada:

> «We calculate corrections of corrections (1) using two correction files. First, we correct the basic step wedge table, and then we print the new step wedge table with the just calculated correction. From this sample, we make a further, second correction.»
> — <http://www.easydigitalnegatives.com/fine-tuning-edn/>

> «The correction of the correction — Many users are satisfied with the appearance of the first correction (the curve or the gradient map), but slightly more demanding users often check for corrections that can further improve the look of a photo. In this case, we first print the previously corrected negative, normalize it, perform linearization, and, of course, print the photo with both corrections applied. The result is often a slightly better correction, but sometimes somewhat worse.»
> — <http://www.photomrhar.com/portfolio/easy-digital-negatives-historical-and-alternative-photography-2/>

Y el promedio de varias muestras, que la app tampoco hace:

> «If we want to make a correction that is as accurate as possible, we print at least three samples of the grayscale step wedge using the same negative. […] the most ideal correction will be closer to perfection if we make the greatest possible number of samples, from which the average value of the correction is then calculated.»
> — <http://www.photomrhar.com/portfolio/easy-digital-negatives-historical-and-alternative-photography-2/>

### 2.5 Negativo coloreado: qué color, por qué y con qué números

EDN distingue **dos** colores, y esta distinción es la clave de toda la sección:

> «I named the color that blocks UV light the most the maximum, and the color that blocks UV light the most evenly I called the optimum UV light blocker.»
> — <http://www.easydigitalnegatives.com/color-blocker/>

**Maximum blocker (máximo bloqueo UV): rojo.**

> «We soon find that the solution is in red, which blocks light much better than the black color. […] Red color, therefore, blocks UV light better than black.»
> — <http://www.easydigitalnegatives.com/color-blocker/>

**Optimum blocker (más tonos útiles): rojizo HSB 330-100-0.** Y aquí están las cifras exactas:

> «In the cyanotype example below, we observe that in a sample with 101 color fields, only about 23 tones with different values are available to calculate corrections (6).»
> — <http://www.easydigitalnegatives.com/color-blocker/>

> «we found that we can show, using a black negative, 23 usable tones in a table with 101 fields (9). **But using a reddish negative (HSB 330-100-0), we can display as many as 57 tones (10) in the same step wedge table with 101 fields.** The resulting curve is almost closer to the ideal, the linear line on the graph.»
> — <http://www.easydigitalnegatives.com/color-blocker/>

> «In cyanotype, using a black-and-white negative, we were able to display 23 useful tones on the negative (11). Using a color negative and coloring the negative with Screen mode (12), we were able to show 35 tones. With Colorize command, we were able to show up to 50 tones (13).»
> — <http://www.easydigitalnegatives.com/color-blocker/>

**Qué NO hay en EDN sobre este punto:** ninguna cifra de **densidad UV** (Dmax, log D, % de bloqueo) comparando negativo coloreado con negro. La única comparación es cualitativa («red blocks light much better than the black color»). El número 57/23 es **cantidad de tonos distintos utilizables**, no densidad.

**Sobre el color concreto:** el que EDN nombra es **HSB 330-100-0** (un rojo-rosado/magenta de tono 330°) y para la búsqueda fina propone rejillas por tono, p. ej. `HSB-GRID-340-EDN.tif` (<http://www.photomrhar.com/download/>). EDN **no** dice "usa magenta"; dice "usa el color que tu prueba diga".

### 2.6 Tinta, densidad y Dmax del negativo

Lo que EDN pide al negativo **no es un número**, es un procedimiento:

> «The basic settings of the printer and the print density — In this step, we choose the option Printer Manages Colors, with which we can change the print density. In this way we can print the most demanding negatives, even with a cheaper printer.»
> — <http://www.photomrhar.com/portfolio/easy-digital-negatives-historical-and-alternative-photography-2/>

> «Standard printing time — The basic parameter for printing photos is the so-called standard printing time. This is the time it takes for the darkest color to be achieved on the photo, which can be displayed by selected photographic sensitizer.»
> — <http://www.photomrhar.com/portfolio/easy-digital-negatives-historical-and-alternative-photography-2/>

El único "D-max" que EDN muestra es el **de la copia revelada**, estimado desde Lab:

> «In the case of opening a single sample, the program displays information about the approximate maximum color density (D-max) on the sample. When opening a large number of samples, the program displays the inscription multi.»
> — <http://www.easydigitalnegatives.com/coating-quality/>

Sobre soportes, EDN es cualitativo:

> «The range of tones printed with a plain paper negative (3) is very small, so the very light and the darkest tones are hardly visible. Negatives printed on tracing paper give a slightly better tonal value, but the image is rather blurry because of the greasiness of the paper (4). Much better negatives are those which are printed on overhead transparencies (5). […] But the very best are negatives printed on transparent films for offset printing and "alternative" photography (6).»
> — <http://www.photomrhar.com/portfolio/easy-digital-negatives-historical-and-alternative-photography-2/>

> «They allow us high-precision printing due to their special coating, which is capable of absorbing much more color from the ink jet printer. This, in turn, allows us to print negatives with much more contrast.»
> — misma página.

**[inferencia]** EDN resuelve el problema de densidad *midiendo la cuña y recoloreando*, no modelando la densidad UV del film. Por eso no publica ni "ink limit" ni Dmax exigido: si el negativo no da, el síntoma aparece como tonos perdidos en la cuña y se corrige con color o con densidad de impresión.

### 2.7 Linearización y clipping

Definiciones de EDN:

> «Our task is to expand these 17 tones (9), we call this to **normalize** the photo to correct it so that it is "normal" for our eyes. We have to **linearize** the color shades or straighten the correction curve with an even distribution of tones according to the table (10).»
> — <http://www.easydigitalnegatives.com/absolute-beginner/>

Sobre el compromiso en los extremos (esto es lo más cerca que EDN está del "clipping"):

> «The theoretically correct correction curve should be as close as possible to a straight line. But in practice, if we calculate each control point correctly, we will notice a jump in values in the area of light and dark tones (23). And if we want to avoid this apparent leap of tones, we have to flatten the curve a bit (24). […] Unfortunately, we lose some light and dark tones with this operation, but some users prefer gentle transitions rather than perfect shades.»
> — <http://www.easydigitalnegatives.com/absolute-beginner/>

Y un detalle de versión que sí es una decisión sobre clipping:

> «With the "Apply Correction" checked option, the program no longer uses the so-called 5% safe zone. White and black tones are now in "real" places.»
> — <http://www.photomrhar.com/download/> (novedades de EDN v1.1)

### 2.8 ¿Habla EDN específicamente de cianotipo?

Sí, y es su ejemplo canónico.

> «A photograph made with the cyanotype technique (3) becomes quite contrasting, and in a photograph made with the salt print technique (4), we lose light tones, and so on.»
> — <http://www.easydigitalnegatives.com/absolute-beginner/>

> «After inverting, mirroring (6), and printing the step wedge file, we observe that only about 17 shades on the negative (7) are useful in the cyanotype technique.»
> — <http://www.easydigitalnegatives.com/absolute-beginner/>

> «The photo of a cyanotype becomes contrasted with almost no intermediate grays (7), while the photo on salted paper becomes quite dark.»
> — <http://www.photomrhar.com/portfolio/easy-digital-negatives-historical-and-alternative-photography-2/>

> «EDN is a Photoshop Script that automatically detects the optimal color for producing optimum transparent negatives in a few seconds (for photographic techniques with a small dynamic color range – cyanotyping, gum, carbon print …), and also locates the color that strongly blocks light (in the case where we want to achieve the maximum DMax).»
> — <http://www.photomrhar.com/download/>

**Resumen:** EDN dice del cianotipo: **contraste alto, casi sin grises intermedios, rango tonal corto (~17–23 tonos útiles de una cuña)**. No dice que su **Dmax** sea poco profundo; eso lo dice Mike Ware de la cianotipia clásica («an image of restricted exposure scale, poor tonal gradation, and low density», <https://www.mikeware.co.uk/mikeware/tocyan.html>), y es una fuente distinta.

---

## 3. ChartThrob (contraste necesario)

ChartThrob (Kevin Bjorke, 2006) es el método "de curvas" clásico y sirve de espejo:

- **Carta:** rejilla de **10×10 = 100 parches** más un parche extra negro → **101 parches**, más una tira lateral de **21 pasos** (`make21()`). Código: bucle `for (var j=0; j<10; j++) … for (i=0; i<10; i++) … n++` y parche final `v = 0`; <https://github.com/joker-b/ChartThrob/blob/master/ChartThrob.jsx>
- **Flujo:** «1. Create a Grayscale chart in ChartThrob. 2. Print a digital negative from that chart (on Pictorico material etc). 3. Contact-print that negative onto your medium of choice […] 4. Scan the resultant positive print. 5. Crop the scan back to the original chart boundaries. 6. Analyze the chart in ChartThrob — the result will be a new Curves layer containing a Printing Curve […] 7. Apply that curve to any B&W images you like» — <https://github.com/joker-b/ChartThrob>
- **Salida:** una **curva de Photoshop con ~14 puntos**, no una tabla de 256: «Why doesn't ChartThrob set curve points for all of the patches? It only seems to set about a dozen points on the curve. — This is a limitation of Photoshop, but 14 points (along a parametric curve) seem to be plenty for real-world printing.» — <https://github.com/joker-b/ChartThrob>
- Trabaja en **8 bits**: «ChartThrob does all of its calibration work in 8-bit» — mismo README.
- Aviso específico para cianotipo: forzar la mezcla de grises al escanear, porque el azul engaña a la conversión — mismo README.

**Diferencia esencial con EDN:** ChartThrob ajusta una **curva paramétrica de ~14 puntos** sobre la imagen en positivo; EDN construye una **tabla de correspondencia por tono** desde 101/256 parches medidos y la aplica como Gradient Map/LUT, y además itera ("correction of corrections"). Son las dos orillas de la misma discusión.

---

## 4. Qué hace realmente la app (lectura del código)

| Elemento | Dónde | Qué es |
|---|---|---|
| `CHEM.clasica.range = 1.15`, `jacquard 1.05`, `ware 2.05`, `simple 2.30` | `src/js/tone.js` | Rango de densidad **exigido a la química**, en log D. Comentario: «Cifras medidas: clásica 1,0-1,2 · nueva (Ware) 1,8-2,4 · simple 1,8-2,7 (Ware, CyanoWork / CyanoWork II)». |
| `SUPPORT.film.max = 1.85`, `papel 1.30`, `vellum 1.55` | `src/js/engine.js` | Techo de densidad UV **del soporte**. Comentario: «Cifras de partida del informe del ET-2865 (dye, sin negro claro): gris ~1,05 · color ~1,8 · techo ~2,0». |
| `INK.*.gain` = 1,00 / 0,95 / 0,85 / 0,55 / 0,50 | `src/js/engine.js` | Multiplicador heurístico sobre el techo del soporte según la tinta. |
| `negMap` (`Uint8ClampedArray(256*3)`) | `src/js/engine.js` | LUT de **salida**: 256 entradas evaluadas desde `tone()` + inversa de `Q`. Es una cuantización, no una tabla medida. |
| `mapY` (`4096`) | `src/js/engine.js` | LUT de previsualización. |
| `sampleStrip(data, quad, n)` con `n = n || 21` | `src/js/calibrate.js` | Muestreo de la tira revelada: mediana por parche en el canal rojo, `-log10(R/Rw)`. |
| `pava()` + `resolveFromSamples`/`mono()` | `src/js/calibrate.js`, `tone.js` | Regresión isotónica y spline monótono de Fritsch–Carlson → **curva continua** ajustada a los parches. |
| `calSteps()` → 21, 51 o 101 | `src/js/app.js` | La app **no ofrece 256**. |
| `analyze()` | `src/js/calibrate.js` | Detecta mesetas, inversiones, ruido; avisa de sobreexposición. |
| Sin promedio multi-muestra, sin segunda pasada | — | `makeProfile()` guarda un único análisis por perfil. |

**Veredicto técnico [inferencia a partir del código]:**
- La app **sí mide** (no es un filtro de invertir): muestrea la copia revelada y ajusta la respuesta del proceso. Eso la alinea con EDN/ChartThrob en el principio.
- Pero el corrector que produce es una **curva monótona con 21–101 nudos**, no una tabla por tono de 256 parches. En los términos de Mrhar, eso está **del lado de las curvas**, no del *mapping*. La diferencia práctica es de **información**: 21 parches no resuelven 256 tonos, y el spline interpola donde no hay medida.
- No hay **"correction of corrections"** ni **promedio de ≥3 muestras**, que EDN considera parte del método.
- El "LUT de 256 valores" que anuncia el README es real como estructura (`negMap`), pero es **la cuantización de salida de un modelo**, no el resultado de una medición de 256 tonos. Llamarlo "lo mismo que EDN" es una analogía de forma, no de método.

---

## 5. Tabla de comprobaciones

| # | Afirmación de la app | Qué dice la fuente primaria | Veredicto |
|---|---|---|---|
| 1 | EDN rechaza las curvas de Photoshop por **posterización** | «One of the disadvantages of curves is the "posterization" of colors. Due to the curve's nature, darker tones often become lighter and vice versa» — <http://www.easydigitalnegatives.com/about-edn/> | **Respaldada** (cita literal) |
| 2 | …y por el **efecto palanca** sobre valores vecinos | «due to the curve's operation according to the principle of levers, the adjacent values also change» — misma URL | **Respaldada** (cita literal) |
| 3 | EDN usa en su lugar una **tabla/LUT de 256 valores** | Usa Gradient Map y LUT 1D; el cálculo interno usa **21 puntos**; el "256" es la cuña de 256 parches y un LUT de 256 puntos editable — <http://www.easydigitalnegatives.com/fine-tuning-edn/> | **Parcial**: el "256" existe, pero no como "tabla de corrección de 256 valores calculada" ni como rechazo total de curvas |
| 4 | EDN **desaconseja las curvas** («la calidad de estas correcciones es bastante pobre») | «the quality of these fixes is quite poor» y «Do not use curves to make corrections» — <http://www.easydigitalnegatives.com/absolute-beginner/>, <http://www.easydigitalnegatives.com/fine-tuning-edn/> | **Respaldada**, con el matiz de que EDN sigue exportando curvas |
| 5 | Rejillas: **21/51/101/256** | EDN ofrece **101 y 256** (y 10×10/16×16 en v1); el **21** es una cuña clásica descargable; **no hay 51** (el 52 es un LUT) | **No respaldada en el detalle**: 51 no existe como rejilla EDN; 21 no es la que EDN usa |
| 6 | EDN **recomienda 256** | «we get the most accurate results if we use a table with 256 tones»; «I frequently work with a grayscale step wedge with 256 colors» | **Respaldada** |
| 7 | Flujo: imprimir carta → copia de contacto → escanear → corregir → reimprimir | Workflow literal de <http://www.easydigitalnegatives.com/absolute-beginner/> | **Respaldada** |
| 8 | El flujo EDN termina en una sola corrección | EDN añade **corrección de la corrección** (segunda impresión + fusión de LUT) y **promedio de ≥3 muestras** — <http://www.easydigitalnegatives.com/fine-tuning-edn/> | **La app omite dos pasos del método** |
| 9 | EDN imprime la cuña **invertida, espejada y en color** | «Invert the file… mirror the image… should not be printed in grayscale but in color mode» — <http://www.easydigitalnegatives.com/absolute-beginner/> | **Respaldada** |
| 10 | EDN imprime con **gestión de color desactivada** | EDN pide lo contrario: «select the "Printer Manages Colors" option» — <http://www.easydigitalnegatives.com/absolute-beginner/> | **Contradicha** |
| 11 | Regla de exposición: velado → mitad; corto → doble | «we shorten the exposure time by half» / «the exposure time must be extended by 2x» — misma URL | **Respaldada** |
| 12 | EDN mide **57 tonos con negativo rojizo frente a 23 en negro** | «using a black negative, 23 usable tones in a table with 101 fields (9). But using a reddish negative (HSB 330-100-0), we can display as many as 57 tones (10)» — <http://www.easydigitalnegatives.com/color-blocker/> | **Respaldada literalmente** (contexto: cianotipo, tabla de 101 campos) |
| 13 | Esos 57/23 son una medida de **bloqueo/densidad UV** | EDN los presenta como **número de tonos utilizables**, no como densidad. Para densidad solo hay afirmación cualitativa («red blocks light much better than black») | **Mal atribuido en la app** (se usa como prueba de bloqueo UV) |
| 14 | El color recomendado por EDN es (equivalente a) el **magenta de la app**, rgb [200,0,120] | EDN nombra **HSB 330-100-0**; la app usa ≈ HSB 324-100-78. Además EDN insiste en medir el color en *tu* impresora | **Aproximado, no idéntico**; el principio (medir) sí está respaldado |
| 15 | EDN exige un **ink limit** y un **Dmax** concretos al negativo | No hay cifras: EDN usa el *print density* del driver y muestra un D-max **aproximado de la copia** — <http://www.photomrhar.com/portfolio/easy-digital-negatives-historical-and-alternative-photography-2/>, <http://www.easydigitalnegatives.com/coating-quality/> | **No respaldada** (la app usa cifras propias del ET-2865) |
| 16 | EDN **lineariza** y evita el clipping aplastando los extremos | «normalize… linearize»; «we will notice a jump in values in the area of light and dark tones… we have to flatten the curve a bit» — <http://www.easydigitalnegatives.com/absolute-beginner/> | **Respaldada** (con matiz: EDN acepta perder tonos extremos) |
| 17 | EDN dice del cianotipo: **contraste alto y rango tonal corto** | «becomes quite contrasting»; «only about 17 shades… useful in the cyanotype technique» — misma URL | **Respaldada** |
| 18 | EDN dice que el cianotipo tiene **Dmax poco profundo** | No encontrado en EDN. La afirmación existe en Mike Ware: «low density» — <https://www.mikeware.co.uk/mikeware/tocyan.html> | **No respaldada por EDN** (sí por Ware) |
| 19 | La app "usa un LUT monótono de 256 valores para el negativo" | Cierto como estructura (`negMap` = 256 entradas), pero es cuantización de un modelo continuo | **Respaldada en la forma, no en el método** |
| 20 | La app calibra con tablas "como las de EDN" (21/51/101) | EDN usa 101/256 y recomienda 256; 51 no existe | **Parcial / engañoso** |

---

## 6. Afirmaciones de la app NO respaldadas (lista para corregir)

1. **«EDN corrige con tablas de 256 entradas (mapeo/LUT), no con curvas»** (README). EDN **sí** genera curvas (las llama "de la más baja calidad"), usa **21 puntos de control** para calcular y ofrece LUT de **21, 52 y 256** puntos. El "256" es, sobre todo, el número de **parches de la cuña**. → Reescribir como: *"EDN sustituye la corrección por curva por un mapa de tonos calculado sobre una cuña de 256 parches y exportado como Gradient Map/LUT (con 21 puntos de control internos)"*.
2. **«21 (a ojo), 51 o 101 (escaneada, como las tablas de EDN)»** (`sheets.js`). Las tablas de EDN son **101 y 256**; **51 no existe** (el 52 es un LUT). → Cambiar a *"101 o 256, como EDN"*, o quitar la comparación.
3. **«El negativo de calibración se imprime […] sin ajustes automáticos… gestión desactivada»** atribuido a EDN (README). EDN pide **"Printer Manages Colors"**. → Corregir la atribución.
4. **El comentario de `INK.magenta`: «EDN mide lo contrario con otros juegos (57 tonos con un negativo rojizo frente a 23 en negro)».** La cifra **es correcta y literal** (101 campos, cianotipo, HSB 330-100-0), pero el comentario la usa como prueba de **bloqueo UV** cuando mide **cantidad de tonos**. Además el color de EDN (HSB 330-100-0) **no es** el magenta de la app (≈HSB 324-100-78). → Mantener la cifra, cambiar la interpretación: *"EDN encuentra más tonos útiles con un negativo rojizo; no afirma que bloquee más UV"*.
5. **Cualquier sugerencia de que la app implementa el método EDN.** No lo implementa: implementa **una curva monótona ajustada a 21–101 parches**, sin corrección de la corrección y sin promedio de muestras. Es el enfoque que EDN critica (aunque sin posterización, porque no pasa por una curva de Photoshop).
6. **Las cifras de `SUPPORT` (1,85 / 1,30 / 1,55 D) y las ganancias de `INK` (1,0 … 0,5)** no son de EDN ni de ChartThrob; son del informe interno del ET-2865. El README las presenta en la sección "Lo que dicen las fuentes" junto a Jacquard y EDN, lo que puede leerse como si vinieran de ahí. → Separarlas en "mediciones propias".
7. **«Dmax poco profundo» del cianotipo atribuido al método EDN**: EDN no lo dice; lo dice Mike Ware.

---

## 7. Contradicciones registradas

1. **Número de tonos útiles del cianotipo:** EDN da **17** en `about-edn` y `absolute-beginner` («only about 17 tones are useful», «only about 17 shades»), pero **23** en `color-blocker` («only about 23 tones»). Son páginas distintas del mismo autor, sin que se explique la diferencia (probablemente negativo sin corregir vs. con corrección/otra tirada). La app cita 23; conviene decir "17–23 según la página".
2. **"No uses curvas" vs. "exportamos curva":** `fine-tuning-edn` dice «Do not use curves to make corrections» mientras el programa ofrece «Adobe Photoshop Curve (.acv)» y el manual explica cómo aplicarla. No es contradicción lógica (oferta por compatibilidad), pero sí una tensión que la app resuelve mal al decir "no con curvas".
3. **Densidad y color:** EDN sostiene que el rojo bloquea más UV que el negro, pero un practicante con impresora de pigmento (Epson P600) reporta que el negativo coloreado de EDN ya da «more than sufficient density … with the standard (zero) ink density level» y que incluso bajaría densidad (<https://www.saccheri.it/darkroom-variables-colorized-negatives/>). Es decir: la ventaja del color depende del juego de tintas y de la época. La app generaliza ("en esta impresora el negro dye es el peor") a partir de su propio informe, lo cual es legítimo **si se presenta como medición propia**, no como herencia de EDN.
4. **EDN reporta D-max de la copia, no del negativo**, mientras la app razona en densidad del negativo. Son magnitudes distintas que la app yuxtapone sin avisar.

---

## 8. Evidencia faltante / no verificada

- **No se ha encontrado en EDN ninguna cifra de densidad UV** (log D, Dmax, % de bloqueo) para negativo coloreado vs. negro. Si la app quiere sostener "1,8 D en color vs 1,05 D en negro", debe citar su propio informe, no EDN.
- **No se ha encontrado en EDN ningún "ink limit"** expresado en % ni ninguna densidad mínima exigida al negativo.
- **No se ha podido verificar el texto íntegro del manual v2.2 en PDF** (la página de `photomrhar.com` publica solo índice + introducción). Los capítulos "Changing the printing density", "The basic printer settings" y "Four-color CMYK negatives" podrían contener cifras; no están en abierto.
- **La cifra 57/23 está en el cuerpo de texto de ColorBlocker, pero las evidencias gráficas son imágenes** (ColorBlocker-7.jpg / -8.jpg) que no se han podido leer. La cifra es literal y fiable; el método exacto de conteo no es auditable.
- **Las afirmaciones del README sobre Reeder y Anderson** ("el amarillo es el que más absorbe después del negro de foto") **no se han verificado en esta pasada**; quedan fuera del alcance EDN.
- **`source_check` no emitió veredicto semántico** (devolvió "unclear, confidence 0.30" en ambas comprobaciones). La validación se ha hecho por lectura directa de las páginas completas; se declara la limitación.

---

## 9. Fuentes

**Mantenidas (primarias):**
- *Easy Digital Negatives — About EDN* (http://www.easydigitalnegatives.com/about-edn/) — rechazo de curvas, posterización, palanca, tabla de 256.
- *Easy Digital Negatives — Absolute beginner* (http://www.easydigitalnegatives.com/absolute-beginner/) — flujo completo paso a paso, regla de exposición, calidad de curvas, linearización y aplastado de extremos, cianotipo "quite contrasting".
- *Easy Digital Negatives — ColorBlocker* (http://www.easydigitalnegatives.com/color-blocker/) — maximum vs optimum blocker, 23 vs 57 tonos, HSB 330-100-0.
- *Easy Digital Negatives — Fine tuning EDN* (http://www.easydigitalnegatives.com/fine-tuning-edn/) — 21 puntos, LUT de 21/52/256, corrección de la corrección.
- *Easy Digital Negatives — Downloads* (http://www.easydigitalnegatives.com/downloads/) — TestCharts 101 y 256; curvas estándar de cianotipo.
- *Easy Digital Negatives — Coating quality* (http://www.easydigitalnegatives.com/coating-quality/) — D-max aproximado de la muestra, umbrales 3 %/5 %.
- *Peter Mrhar — Easy Digital Negatives (script v1)* (http://www.photomrhar.com/easy-digital-negatives/) — rejillas 10×10 y 16×16, normalización/linearización automáticas.
- *Peter Mrhar — Easy Digital Negatives (libro, extracto)* (http://www.photomrhar.com/portfolio/easy-digital-negatives-historical-and-alternative-photography-2/) — densidad de impresión, standard printing time, cuña de grises, 256 recomendada, corrección de la corrección, cianotipo sin grises.
- *Peter Mrhar — Download* (http://www.photomrhar.com/download/) — cuña de 21 pasos, HSB grids, changelog v1.1 (zona segura del 5 %), definición de EDN ColorBlocker para "small dynamic color range – cyanotyping".
- *ChartThrob — README* (https://github.com/joker-b/ChartThrob) — flujo de 7 pasos, curva de 14 puntos, 8 bits, aviso de escaneo del cianotipo.
- *ChartThrob.jsx* (https://github.com/joker-b/ChartThrob/blob/master/ChartThrob.jsx) — 10×10 + 1 parche = 101; tira de 21 pasos.
- *Mike Ware — Towards an Unproblematic Cyanotype Chemistry* (https://www.mikeware.co.uk/mikeware/tocyan.html) — "low density" del cianotipo clásico (para el punto 18).
- *Paolo Saccheri — Darkroom variables: colorized negatives* (https://www.saccheri.it/darkroom-variables-colorized-negatives/) — corroboración independiente del flujo EDN ColorBlocker y contraejemplo sobre densidad con tintas pigmentadas.

**Rechazadas / despriorizadas:**
- `pathtoeternal.blogspot.com` (Digital Negatives ~4) — resumen en chino de terceros, redundante.
- `luminous-landscape.com` (QTR), `jkschreiber.wordpress.com`, `forums.piezography.com` — tratan QTR/PiezoDN, no EDN ni ChartThrob; fuera de alcance.
- `truneg.com` — sistema comercial distinto (TruNeg); útil solo como contexto, no como fuente de EDN.
- `alternativephotography.com/digital-negatives/` — genérico y de terceros; no añade nada a las primarias.
- Hilos de Photrio/Reddit — anécdotas; no verificables como método.

---

## 10. Recomendaciones concretas para la app

1. **Corregir el README** en los tres puntos factuales: "no con curvas" → "con mapa de tonos en lugar de curva"; "gestión desactivada" → "Printer Manages Colors, como EDN"; "21/51/101 como las tablas de EDN" → "101 y 256".
2. **Reformular el comentario de `INK.magenta`** para que la cifra 57/23 se lea como *número de tonos útiles*, no como bloqueo UV, y añadir que el color de EDN es HSB 330-100-0 (no el magenta de la app).
3. **Separar en el README** "lo que dicen las fuentes" de "lo que medimos nosotros" (ET-2865, 1,85 D, ganancias por tinta).
4. Si se quiere ser fiel a EDN: **añadir 101/256 pasos** y una **segunda pasada** (reimprimir con la corrección aplicada y volver a medir), o bien **dejar de invocar EDN** y presentar el método como "curva monótona medida, estilo ChartThrob".
5. Añadir al texto de calibración la advertencia de EDN sobre el cianotipo al escanear (el azul engaña a la conversión a grises), que ChartThrob documenta explícitamente.
