# Verificación del protocolo real del kit de cianotipia de Jacquard y de la química clásica

**Fecha de la verificación:** pasada única sobre fuentes primarias el día de la redacción.
**Alcance:** documentos oficiales de Jacquard Products (Rupert, Gibbon & Spider, Inc.) + fórmula tradicional de referencia de Mike Ware (fuente que la propia app cita) + fichas de seguridad (SDS) oficiales de Jacquard.
**Método:** lectura íntegra de cada documento (no sólo el resumen del buscador). Las cifras NO documentadas se marcan como tales; no se ha inventado ninguna.

---

## Resumen ejecutivo (10 líneas — lo que obliga a cambiar código)

1. **La fórmula de Jacquard es idéntica a la clásica de referencia.** 40 g de ferricianuro en 400 ml (10 %) + 100 g de citrato férrico amónico en 400 ml (25 %), mezclados 1:1 → **5 % ferricianuro + 12,5 % citrato**. Eso es *exactamente* la fórmula tradicional de Mike Ware (25 g + 10 g por 100 ml), que da las mismas concentraciones finales.
2. **La nota de `CHEM.jacquard` es falsa:** «un 62 % de la clásica». Jacquard es el **125 %** de la `CHEM.clasica` de la app y el **100 %** de la clásica de Ware. El 62 % sale de dividir la *mezcla de trabajo* entre las *disoluciones madre* ajenas (5/8 = 12,5/20 = 0,625): error de denominador, no de química.
3. **`CHEM.clasica` (20 % + 8 %) no es la fórmula de Ware**, que es 25 g + 10 g / 100 ml. La app cita a Ware para el rango 1,0–1,2 pero no usa su fórmula: cita y dato vienen de recetas distintas.
4. **`CHEM.jacquard.range = 1.05` no tiene fuente.** Jacquard no publica en ningún documento rango de densidad de negativo, Dmax ni cifras de contraste: sólo criterios cualitativos.
5. **`printDmax` (1,32 / 1,12 / 1,50 / 1,42) no tiene fuente en ninguno de los cuatro presets**, y el orden `jacquard` (1,12) < `clasica` (1,32) es incoherente con una química igual o más concentrada.
6. **La vida de la mezcla 2–4 h es correcta** (Jacquard, textual), pero Ware da «days» para la *misma* química: contradicción real entre fuentes que la UI debería reflejar.
7. **Sólo `EXPOSURE_MIN.jacquard` [10, 20] está respaldado** (folleto del kit). `clasica` [3, 8], `ware` [2, 6] y `simple` [2, 5] no tienen fuente solar: Ware sólo da tiempos de lámpara UV.
8. **La app no modela lavado ni secado**, y es donde más divergen las fuentes: Jacquard ≥5 min de lavado; Ware 20–30 min. La nota «pierde casi la mitad de la escala tonal en el lavado» sí está respaldada literalmente por Ware.
9. **Papel:** Jacquard recomienda Hahnemühle Platinum Rag (300 gsm, 100 % algodón, sin tampón alcalino) — correcto y compatible con la exigencia de Ware de papel no tamponado. Jacquard **no publica ningún gramaje**: el de 300 gsm es de Hahnemühle, no de Jacquard.
10. **La propia Jacquard se contradice** entre su folleto de instrucciones (25 % / 10 %) y su FAQ (20 % / 9 %, con las etiquetas A y B intercambiadas). Hay que decidir cuál es la fuente canónica y decirlo.

---

## 1. Corpus documental consultado

| Documento | URL | Fecha del documento | Estado |
|---|---|---|---|
| Cyanotype Instructions (web) | https://store.jacquardproducts.com/pages/resources/cyanotype-instructions | — | Leído íntegro |
| Cyanotype Instructions (PDF) | https://store.jacquardproducts.com/cdn/shop/files/Cyanotype_Instructions.pdf | «08.17.21» (impreso en el pie) | Leído íntegro (2 págs.) |
| Página de producto «Cyanotype» | https://www.jacquardproducts.com/cyanotype | — | Leído íntegro |
| Cyanotype Kit (JCY9000) | https://www.jacquardproducts.com/cyanotype-kit | — | Leído íntegro |
| Cyanotype Set (JCY1100) | https://www.jacquardproducts.com/cyanotype-set | — | Leído íntegro |
| Quickstart Guide del Kit (PDF) | https://www.jacquardproducts.com/s/QUICKSTART_GUIDE_CyanotypeKit.pdf | — | Leído íntegro (2 págs.) |
| Cyanotype FAQs (PDF) | https://www.jacquardproducts.com/s/Cyanotype-FAQs.pdf | «02.08.19» | Leído íntegro (2 págs.) |
| Tips & Troubleshooting (PDF) | https://www.jacquardproducts.com/s/Cyanotype-Tips-and-Troubleshooting.pdf | «6.01.15» | Leído íntegro (1 pág.) |
| Toning Cyanotype Prints (PDF) | https://www.jacquardproducts.com/s/Toning-Cyanotype-Prints.pdf | «7.13.15» | Leído íntegro (4 págs.) |
| SDS Ferric Ammonium Citrate | https://store.jacquardproducts.com/cdn/shop/files/Ferric-Ammonium-Citrate-GHS-SDS-CT.pdf → copia íntegra espejada en https://www.unitednow.com/scs/resources/pdf/SDS_JP-Cyanotype_Liquids.pdf | «Revision Date: 12/02/2020» | Leído íntegro (9 págs.) |
| SDS Potassium Ferricyanide | misma copia espejada (págs. 10–18) | «Revision Date: 12/02/2020» | Leído íntegro (9 págs.) |
| Ware, *The Traditional Cyanotype Process* | https://www.mikeware.co.uk/mikeware/Traditional_Cyanotype.html | — | Leído íntegro |
| Ware, *New Cyanotype* (ficha) | https://www.mikeware.co.uk/mikeware/New_Cyanotype_Process.html | — | Leído íntegro |
| Ware, *Siderotype Workshop Notes: New Cyanotype* («CyanoWork») | https://www.mikeware.co.uk/downloads/CyanoWork.pdf | © 2009 | Leído íntegro (11 págs.) |
| Hahnemühle Platinum Rag (ficha) | https://www.hahnemuehle.com/fileadmin/user_upload/bilder/pdf/dfa/Datenblaetter_Archiv/datasheet-PlatinumRag.pdf | — | Leído (datos de gramaje) |

**Nota de acceso:** el CDN `store.jacquardproducts.com/cdn/shop/files/...` devolvió HTTP 429 (rate limit) al intentar bajar las SDS directamente; se usó la copia íntegra de las **mismas SDS de Jacquard** (mismo encabezado, misma fecha de revisión, mismos números de artículo) alojada en unitednow.com. Las citas de las SDS provienen de esa copia literal, no de un resumen de buscador.

---

## 2. Extracción textual por apartados

### (1) Cantidades y concentraciones de A y B

> «**1.** Dissolve 40 g (approximately 2 tablespoons) Potassium Ferricyanide in 400 ml (1.7 cups) water to create STOCK SOLUTION A. Allow 24 hours for the powder to fully dissolve.
> **2.** Dissolve 100 g (approximately .5 cup) Ferric Ammonium Citrate in 400 ml (1.7 cups) water to create STOCK SOLUTION B. Allow 24 hours for the powder to fully dissolve.»
> — https://store.jacquardproducts.com/cdn/shop/files/Cyanotype_Instructions.pdf (idéntico en la página web)

Cálculo directo (evidencia directa + aritmética):
- **A = 40 g / 400 ml = 10,0 % p/v de ferricianuro potásico**
- **B = 100 g / 400 ml = 25,0 % p/v de citrato férrico amónico**
- **24 h** de disolución para ambas.

Contradicción documental dentro de Jacquard (ver §4): la FAQ dice otra cosa.

> «What is the cyanotype formula? • Solution A: 20% ferric ammonium citrate in water • Solution B: 9% potassium ferricyanide in water A : B = 1:1 = final solution»
> — https://www.jacquardproducts.com/s/Cyanotype-FAQs.pdf, «02.08.19»

Obsérvese que la FAQ **invierte las letras** (A = citrato, B = ferricianuro) respecto al folleto de instrucciones (A = ferricianuro, B = citrato).

Cantidades envasadas (producto premedido):

> «2oz/ 59.14ml bottle Part A (0.2oz / 5.67 g Potassium Ferricyanide)
> 2oz/ 59.14ml bottle Part B (0.47oz / 13.46 g Ferric Ammonium Citrate)»
> — https://www.jacquardproducts.com/cyanotype-kit

> «two 8oz / 256.59ml bottles (1 each of the following): Part A: Potassium Ferricyanide (0.8oz / 22.68g …) Part B: Ferric Ammonium Citrate (1.9oz / 53.86 …)»
> — https://www.jacquardproducts.com/cyanotype-set

**Inferencia del investigador (alta confianza):** las concentraciones *reales* de los envases no coinciden con las del folleto.

| Producto | A (% p/v) | B (% p/v) | Relación B/A |
|---|---|---|---|
| Fórmula abierta (folleto) | 10,00 % | 25,00 % | 2,50 |
| Kit JCY9000 (5,67 g / 13,46 g en 59,14 ml) | **9,59 %** | **22,76 %** | 2,37 |
| Set JCY1100 (22,68 g / 53,86 g en 256,59 ml) | **8,84 %** | **20,99 %** | 2,37 |

Es decir: el producto envasado va un 4–12 % por debajo en A y un 9–16 % por debajo en B respecto de la receta abierta. (Si el «2 oz» se interpretara como onza de *peso* de agua = 56,7 ml, A daría 10,0 % exacto y B 23,7 %; no es verificable cuál de las dos bases usa Jacquard, y por eso se deja constancia de la ambigüedad en vez de resolverla.)

**Explicación química de por qué B baja del 25 % (inferencia, alta confianza):** la SDS de Jacquard declara la solubilidad del citrato férrico amónico:

> «Water Solubility: Easily soluble in water. **25 g/100 ml at 20°C.**»
> — SDS Ferric Ammonium Citrate, §9, rev. 12/02/2020

Una disolución al 25 % está **exactamente en saturación** a 20 °C: de ahí las 24 h de disolución, el riesgo de residuo sin disolver y la nota de Jacquard sobre moho en la disolución B. Es coherente que el producto envasado se quede por debajo.

### (2) Proporción de mezcla

> «In subdued lighting, **mix equal parts SOLUTION A and SOLUTION B** to create the cyanotype sensitizer.»
> — Instructions PDF / web

Proporción **1:1 en volumen**. Mezcla resultante (fórmula abierta): **5,0 % ferricianuro + 12,5 % citrato férrico amónico**.

### (3) Vida útil de las disoluciones madre y de la mezcla de trabajo

> «Mix only the amount you immediately need, as the sensitizer is **stable just 2-4 hours**.»
> — Instructions PDF

> «The stock solutions are **stable long term** and can be used to create the cyanotype sensitizer whenever you are ready to coat a substrate.»
> — Instructions PDF, NOTES (idéntico en Tips & Troubleshooting)

> «Sensitized paper or fabric may be stockpiled and stored. **Use within 6 months** for best results. Store in a cool, dry environment, preferably in a sealed bag to avoid oxidation.»
> — Instructions PDF, NOTES

> «Mold growth may occur in the Ferric Ammonium Citrate solution (STOCK SOLUTION B) over time. This will not affect the performance of the chemistry. Skim off any mold or decant the solution through a coffee filter before use.»
> — Instructions PDF, NOTES

Jacquard **no da cifra** para las disoluciones madre («long term»), sí para la mezcla (2–4 h) y para el material ya recubierto (6 meses). Contraste con Ware, misma química:

> «The mixed sensitizer only has a short life (**days**).»
> — https://www.mikeware.co.uk/mikeware/Traditional_Cyanotype.html

> «These solutions must be kept in brown bottles, stored in the dark.» — *ibid.*

### (4) Método y cantidad de recubrimiento, tipo de pincel

> «Coat paper or fabric with the sensitizer and allow to air dry in the dark. **Paper may be double-coated for denser prints. Fabric may be coated or dipped** in the sensitizer.»
> — Instructions PDF

**Cantidad por superficie: Jacquard NO la publica en ningún documento.** No hay ml/cm², ni ml por hoja, ni mililitros por pasada. Lo único cuantificable son los rendimientos declarados:

> «The kit comes with enough material to make **at least 12 (8.5x11in/ 21.59 x 27.94cm) prints**.»
> — https://www.jacquardproducts.com/cyanotype-kit

> «This set contains enough chemistry to make approximately **sixty-five 8" x 10" prints on paper** or fifty 8" x 10" prints on fabric.»
> — https://www.jacquardproducts.com/cyanotype-set

**Inferencia del investigador (cota superior, no cifra de Jacquard):**
- Kit: 118,28 ml de mezcla / (12 × 603,2 cm² = 7.238,7 cm²) = **≤0,0163 ml/cm²**
- Set: 513,18 ml / (65 × 516,1 cm² = 33.548 cm²) = **≤0,0153 ml/cm²**
Son cotas superiores (presuponen cero desperdicio y exactamente N copias); la convergencia de ambos productos es lo que las hace creíbles.

**Tipo de pincel: sí documentado, en el kit.**

> «1x **Hake brush, 2”**»
> — https://www.jacquardproducts.com/cyanotype-kit (confirmado en el folleto multi-idioma: «1x Hake brush, 2”»)

La única referencia primaria a cantidad de recubrimiento por área es de Ware (misma química tradicional):

> «As a guide to the volume needed for coating, **about 1.5 cc should suffice for a 10 x 8 inch print, if coated by rod; but brush coating may consume possibly twice this.**»
> — https://www.mikeware.co.uk/mikeware/Traditional_Cyanotype.html

Equivalencias: 1,5 ml / 516,1 cm² = **0,0029 ml/cm²** con varilla; **≈0,0058 ml/cm²** con pincel. (Cifra de Ware, no de Jacquard.)

### (5) Secado: oscuridad, tiempo, temperatura

> «…and allow to **air dry in the dark**.»
> — Instructions PDF

> «Store in a cool, dry environment, preferably in a sealed bag» — *ibid.*

**Jacquard no da tiempo ni temperatura de secado en ningún documento consultado.** El único dato cuantificado de secado en la literatura primaria de esta química es de Ware:

> «Let the sensitized paper dry at room temperature in the dark for **about an hour**… Alternatively, allow a few minutes for the sensitizer to soak in, until the paper surface appears non-reflective, then **heat-dry it with an air stream at about 40°C for about 5 minutes**.»
> — https://www.mikeware.co.uk/downloads/CyanoWork.pdf (resumen: «Dry: 1-2 hours at room temperature, or hot air for 10 minutes»)

> «Expose the sensitized paper **within a few hours of coating**, if possible.» — *ibid.*

### (6) Tiempos de exposición exactos y fuente de luz declarada

Fórmula abierta (cualquier soporte):

> «Make exposures in **sunlight (1-30 minutes, depending on conditions)** or under a **UV light source**… (Note: **Over-exposure is almost always preferred to under-exposure.**) The fabric will look bronze in color once fully exposed.»
> — Instructions PDF

Kit (papel Platinum Rag + química del kit):

> «…create prints by exposing to **sunlight or UV (10-20 minutes, depending on conditions)**»
> — https://www.jacquardproducts.com/cyanotype-kit

> «Expose to sunlight **10 - 20 minutes**»
> — https://www.jacquardproducts.com/s/QUICKSTART_GUIDE_CyanotypeKit.pdf

Jacquard tiene además una calculadora de exposición por UV/tiempo local, pero **no publica tabla de tiempos por fuente**:
https://store.jacquardproducts.com/pages/jacquard-cyanotype-calculator («Get optimal exposure times for cyanotype printing based on current UV and weather conditions.»)

Referencia de Ware para las mismas químicas:
- Tradicional: «**UV lamp exposure times may be around 20 to 30 minutes**» (https://www.mikeware.co.uk/mikeware/Traditional_Cyanotype.html); «exposures of **thirty minutes or more** to a typical UV light source are not unusual» (New Cyanotype page).
- Nueva: «probably **less than five minutes** under an average UVA light source. With an 800 W HID UV lamp and digital negatives my exposure time is **about 60 seconds**» (https://www.mikeware.co.uk/downloads/CyanoWork.pdf).

**Ninguna fuente primaria da tiempos de exposición *al sol* para la fórmula clásica.** El «1–30 min» de Jacquard es el único dato solar publicado para esta química.

### (7) Revelado / lavado: pasos, tiempos, agua, duración

> «Process prints in a tray or bucket of **cool water**. Wash for **at least 5 minutes**, changing the water periodically, **until the water runs clear. Do not use soap.** With wetting, the print will change from a bronze to blue color.»
> — Instructions PDF

> «Use **distilled water if your tap water is hard**.» — *ibid.*, NOTES

> «Over-washing can also result in pale prints.» / «it may just require a **longer rinse in hotter water**» — *ibid.* + Tips & Troubleshooting

Contraste con Ware (misma química):

> «Immerse the exposed print in gently running water (or several changes of static water), face down, until the yellow sensitizer has entirely disappeared from highlight areas (**20 minutes should suffice**). … It is important that the wash water should **not be at all alkaline**; addition of dilute citric acid, or even dilute hydrochloric acid, to the first wash bath may improve the image.»
> — https://www.mikeware.co.uk/mikeware/Traditional_Cyanotype.html

> «Finally wash gently in running water for **about 20 minutes**.» / «**Wash: in non-alkaline water for 20-30 minutes**» (nueva)
> — https://www.mikeware.co.uk/downloads/CyanoWork.pdf

### (8) Oxidación: cuánto tarda el azul en asentarse y qué recomienda Jacquard

> «To instantly process prints to the final deep blue color, submerge washed prints in a **dilute solution of hydrogen peroxide**, then rinse.
> If peroxide was not used in step 6, prints will **slowly oxidize to their final, deep blue color over the course of about 24 hours**.»
> — Instructions PDF

> «Hydrogen Peroxide: Submerging your washed print in a dilute bath of hydrogen peroxide after the initial wash will cause the blue to **instantly reach its maximum intensity**. In theory, the print would reach this intensity **over about 24 hours** as it dries and oxidizes…»
> — https://www.jacquardproducts.com/s/Toning-Cyanotype-Prints.pdf

> «Optional: Add a drop of hydrogen peroxide» — Quickstart del kit.
> Dosificación concreta: Ware, «**0.3% hydrogen peroxide** … for no more than **half a minute** … This treatment **makes no difference to the final result**».

**Contradicción de matiz a registrar:** Jacquard y Ware coinciden en las ~24 h, pero Ware añade explícitamente que el peróxido «does not make any difference to the final dried-down densities», mientras Jacquard lo presenta como atajo equivalente («instantly»). No es contradicción de cifra, sí de encuadre.

### (9) Papeles y tejidos recomendados, y gramajes

> «5x sheets **Hahnemühle Platinum Rag** Fine Art Paper (8” x 10 “ / 20.32cm x 25.4cm)»
> — https://www.jacquardproducts.com/cyanotype-kit
> (el folleto multi-idioma del kit dice **10x** hojas del mismo papel: discrepancia menor entre la web y el impreso)

> «FABRIC/FIBER/SURFACES: **any natural fiber/porous surface, including cotton, linen, silk, canvas, wool, paper, wood and leather**»
> — https://www.jacquardproducts.com/cyanotype

> «As polyester is not a natural fiber, it **generally cannot be used** for cyanotype.» — FAQ, 02.08.19
> «Being a cotton sateen, the sides are different. One side of the fabric is slightly reflective and shiny. This is the print side.» — FAQ

**Gramaje: Jacquard no lo publica.** El dato es del fabricante del papel:

> «**300 gsm, 100% Cotton**, natural bright white… The natural bright white paper with a weight of **300 gsm**… It is **acid free and does not contain any alkaline buffering**.»
> — https://www.hahnemuehle.com/fileadmin/user_upload/bilder/pdf/dfa/Datenblaetter_Archiv/datasheet-PlatinumRag.pdf

Requisito de papel según Ware (coherente con Platinum Rag):
> «Use only papers that are **not alkaline-buffered with chalk** (calcium carbonate)… For prints up to 10x8 in. or A4, a paper weight of **160 gsm** is adequate. For larger prints of A3 size, a heavier weight of **240 gsm, or more**, will minimise cockling.»
> — https://www.mikeware.co.uk/downloads/CyanoWork.pdf

### (10) Afirmaciones de Jacquard sobre contraste, rango tonal, Dmax y negativo digital

**Jacquard no publica NINGUNA cifra** de Dmax, rango tonal ni rango de densidad del negativo. Sólo hay enunciados cualitativos:

> «To achieve good contrast on the print, **the negative must be dense enough that it completely blocks the light in its darkest areas**. Stacking two negatives may be the best solution—this will **double the opacity and contrast**.»
> — https://www.jacquardproducts.com/s/Cyanotype-Tips-and-Troubleshooting.pdf

> «The dark areas of the film may not be dense and opaque enough… The print may also be over-exposed. Try reducing the exposure time.»
> — Instructions PDF, Troubleshooting

> «Pale or low-contrast prints: The print was probably not exposed long enough. The light source may not be intense enough. **Or the negative may be too dark.**»
> — *ibid.*

> «Cyanotype has a **greater range of tones** than SolarFast, though the color range is significantly more limited» — FAQ

Sobre el negativo digital, lo único que dice es el procedimiento, sin requisitos numéricos:
> «Negatives may be printed through **any inkjet or laser printer** onto transparent film or acetate media such as Jacquard's SolarFast Film.» — Instructions PDF

El único requisito numérico de densidad de negativo en la literatura primaria de esta química es de Ware:
> «For a full tonal range in the print, the negative should have a long density range of **at least 1.8**, like those for platinum-palladium printing; i.e. extending from base+fog at around 0.2 to a Dmax of 2 or more.»
> — https://www.mikeware.co.uk/mikeware/New_Cyanotype_Process.html
> «Negatives should have a long density range (in the UV): **at least 1.8 and as much as 2.4**» — CyanoWork.pdf
> «…so that it can even accommodate a negative density range of **2.6 or so**» (con ácido cítrico) — New Cyanotype page
> Y para la tradicional: «reduces the negative density range that can be successfully printed to **only about 1 or 1.2**, which is half that (ca. 2.4) of the 'new cyanotype'» — Traditional page

### (11) Virados / toning documentados por Jacquard

De https://www.jacquardproducts.com/s/Toning-Cyanotype-Prints.pdf («7.13.15»):

> «Toning a cyanotype print generally involves two basic steps: **a bleach step, and a toning step**.»
> «The most common bleaching solution is made from **soda ash (sodium carbonate)**. Generally, **1-2 teaspoons are used in about 1 liter of water**.»
> «The bleach step is generally quite short (**under 5 minutes**).»
> «Leave the print in the bleaching solution until it reaches a uniform, **golden yellow** color and then quickly submerge it in water to stop the bleaching action.»
> «**Allow the print to dry at least 24 hours before toning.** Otherwise, you may experience erratic results. **Pre-wet** the dried prints just prior to toning.»
> «**Tea toner**… require long times in the toner—generally **2 or more hours (up to 24)**.»
> «**Coffee toner**: For the truest black, coffee toners are generally the best.»
> «**Tannic Acid**: The original cyanotype toner, … tends to produce an even brown print with a lot of staining.»
> «**Wine Tannin** … produces a beautifully even warm black.»
> «**Wine Toner**: Red wine … can be used to tone cyanotype prints to a purplish black.»
> «**Borax Toner**: Probably the most unpredictable toner, borax can be used to achieve a **violet** print.»
> «**Soda Ash Toner** … may be used to achieve a **yellow** tone … an extremely dilute bath may also produce a blue/yellow split-tone or, even more diluted, a **navy** print.»
> «After toning… soak toned prints in clean water for **at least 10 minutes**.»

Ware documenta además (CyanoWork, pág. 11): **tannic acid** (púrpura-marrón), **trisodio fosfato 5 %** (amarillo), **acetato de plomo 5 %** (violeta), **sulfato de níquel 5-10 %** (verde azulado).

**Pirogalol no aparece documentado como virado de cianotipo ni en Jacquard ni en Ware.**

---

## 3. Contraste con los valores de la app

Valores leídos de `src/js/tone.js` (CHEM, EXPOSURE_MIN, SOURCE) y `src/js/engine.js` (SUPPORT, INK).

### 3.1 Discrepancias de química

| # | Parámetro | Valor en la app | Valor documentado | Fuente | Veredicto | Corrección propuesta |
|---|---|---|---|---|---|---|
| Q1 | Concentración A (ferricianuro) | 40 g / 400 ml → 10 % (implícito en la nota) | «Dissolve 40 g … in 400 ml water» = 10,0 % p/v | Instructions PDF | **Correcto** | Ninguna |
| Q2 | Concentración B (citrato) | 100 g / 400 ml → 25 % (implícito) | «Dissolve 100 g … in 400 ml water» = 25,0 % p/v | Instructions PDF | **Correcto** | Añadir que es disolución **saturada** (25 g/100 ml, SDS §9) y por eso tarda 24 h |
| Q3 | Proporción de mezcla | 1:1 | «mix equal parts SOLUTION A and SOLUTION B» | Instructions PDF | **Correcto** | Ninguna |
| Q4 | Concentración de la mezcla de trabajo | «5 % ferricianuro y 12,5 % citrato» | 5,0 % + 12,5 % (mitad de 10 % y 25 %) | Instructions PDF + aritmética | **Correcto** | Ninguna |
| Q5 | Relación con la «clásica» | **«un 62 % de la clásica»** | Jacquard = 125 % de `CHEM.clasica` (5/4) y **100 %** de la clásica de Ware (25/10) | Instructions PDF + Ware Traditional | **INCORRECTO** | Cambiar por «mismas concentraciones que la clásica de Ware (25 g + 10 g/100 ml); 125 % de la variante 20 %+8 %» |
| Q6 | Fórmula de `CHEM.clasica` | 20 % citrato + 8 % ferricianuro, 1:1 | Ware: **25 g + 10 g / 100 ml** (25 % / 10 %) | mikeware.co.uk/Traditional_Cyanotype.html | **Dudoso** | Usar 25 % + 10 % (la variante 20/8 sólo aparece en fuentes secundarias; la FAQ de Jacquard usa 20/9) |
| Q7 | Vida de la mezcla | «2-4 h» | «stable just **2-4 hours**» | Instructions PDF | **Correcto** | Mantener, pero la UI debe mostrar que Ware da «days» para la misma química (ver §4) |
| Q8 | Vida de las disoluciones madre | No modelada | «stable long term» (sin cifra) | Instructions PDF | **Ausente, no erróneo** | Añadir texto informativo: «sin caducidad declarada; el citrato puede enmohecer» |
| Q9 | Vida del papel ya recubierto | No modelada | «Use within 6 months» | Instructions PDF | **Ausente** | Añadir a la ficha del proceso |
| Q10 | `CHEM.jacquard.range` | **1,05** | Ninguna cifra publicada por Jacquard; Ware da 1,0–1,2 para la química tradicional (que es la de Jacquard) | Instructions + Ware Traditional | **Sin fuente / dudoso** | Igualar a `clasica` (1,15) salvo calibración medida propia; si se separa, justificarlo por concentración, no por un offset inventado |
| Q11 | `CHEM.clasica.range` | 1,15 | «only about 1 or 1.2» | Ware Traditional | **Correcto** | Ninguna |
| Q12 | `CHEM.ware.range` | 2,05 | «at least 1.8 and as much as 2.4» / «~2-2.4 in the UVA» | CyanoWork.pdf | **Correcto** | Ninguna |
| Q13 | `CHEM.simple.range` | 2,30 | 1,8–2,4; hasta **2,6** sólo *añadiendo ácido cítrico*. **No existe una segunda química «simple» documentada**: la nueva cianotipia de Ware ya es una disolución única de oxalato | CyanoWork.pdf + New Cyanotype page | **Dudoso (preset duplicado)** | O fusionar `simple` con `ware`, o redefinirlo como «Ware + ácido cítrico» con rango 2,4–2,6 |
| Q14 | `printDmax` clasica / jacquard / ware / simple | 1,32 / 1,12 / 1,50 / 1,42 | **Ninguna** fuente da Dmax de la copia. Ware sólo dice «maximum density verging on black» (cualitativo) | — | **Sin fuente** | No presentarlos como medidos: etiquetar «estimado» o sustituir por un valor único calibrable |
| Q15 | Orden de `printDmax` | jacquard 1,12 < clasica 1,32 | Con la misma química (Ware 25/10) o más concentrada (envase), no hay base para que Jacquard imprima menos densidad | Inferencia a partir de Q1–Q5 | **Incoherente** | Igualar ambos o medir; no dejar que el preset Jacquard sea el más «plano» del programa |
| Q16 | Nota «pierde casi la mitad de la escala tonal en el lavado» | en `CHEM.clasica.note` | «about **half the tonal scale** of your print will disappear in the wet processing» | Ware Traditional | **Correcto (cita fiel)** | Añadir que también aplica a Jacquard, cuya química es la misma |
| Q17 | Nota «la mezcla aguanta 2-4 h: se hace justo antes» | en `CHEM.jacquard.note` | Literal de Jacquard | Instructions PDF | **Correcto** | Ninguna |

### 3.2 Discrepancias de exposición

| # | Parámetro | Valor en la app | Valor documentado | Fuente | Veredicto | Corrección propuesta |
|---|---|---|---|---|---|---|
| E1 | `EXPOSURE_MIN.jacquard` | [10, 20] min **al sol** | «sunlight or UV (**10-20 minutes**, depending on conditions)» | Kit + Quickstart | **Correcto** | Mantener; aclarar que es el rango del kit con Platinum Rag, no de la química abierta |
| E2 | `EXPOSURE_MIN.clasica` | [3, 8] min al sol | Jacquard: 1–30 min al sol (para *su* química). Ware: **20–30 min con lámpara UV**; ningún dato solar | Instructions + Ware | **Sin fuente** | Marcar como estimación propia; no atribuir a Jacquard ni a Ware |
| E3 | `EXPOSURE_MIN.ware` | [2, 6] min **al sol** | «less than five minutes under an average **UVA** light source»; 2–4 min | CyanoWork + New page | **Etiqueta incorrecta** | Mantener cifras, cambiar la etiqueta: son minutos bajo UV, no al sol |
| E4 | `EXPOSURE_MIN.simple` | [2, 5] min al sol | Igual que E3 (misma química) | CyanoWork | **Etiqueta incorrecta** | Ídem E3 |
| E5 | Rango general de la química abierta | No modelado | «sunlight (**1-30 minutes**)»; «Over-exposure is almost always preferred to under-exposure» | Instructions PDF | **Ausente** | Añadir aviso de subexposición y el rango 1–30 como marco |

### 3.3 Discrepancias de soportes, tintas y proceso

| # | Parámetro | Valor en la app | Valor documentado | Fuente | Veredicto | Corrección propuesta |
|---|---|---|---|---|---|---|
| S1 | `tone.js SOURCE.film.dr` | 2,6 | — | — | **Sin fuente** | Unificar con `SUPPORT` |
| S2 | `engine.js SUPPORT.film.max` | 1,85 | Ware exige ≥1,8 (ideal 2,0–2,4) en UV para la química nueva | CyanoWork | **Dudoso** | 1,85 apenas alcanza el mínimo: declararlo «techo medido del ET-2865» y no como capacidad universal |
| S3 | **Contradicción interna** | `SOURCE` (tone.js): film 2,6 / papel 1,9 / vellum 2,1 · `SUPPORT` (engine.js): film 1,85 / papel 1,30 / vellum 1,55 | — | Código | **INCORRECTO (dos tablas incompatibles)** | Una sola fuente de verdad; `engine.build` sólo consume `SUPPORT`, así que `SOURCE` es código muerto o dato fantasma |
| S4 | `SUPPORT.papel.max` | 1,30 | Ware: el negativo debe llegar a ≥1,8 en UV | CyanoWork | **Dudoso** | Un negativo en papel normal no alcanza el mínimo documentado: avisar en la UI, como ya hace `capacityShort` |
| S5 | Cantidad de recubrimiento | No modelada | Jacquard: sin cifra. Ware: 1,5 ml/10×8" con varilla (≈0,0029 ml/cm²), ~2× con pincel (≈0,0058 ml/cm²); Jacquard implica ≤0,015–0,016 ml/cm² | Ware + aritmética de Jacquard | **Ausente** | Si se añade calculadora de química, usar Ware como referencia y marcar la cota de Jacquard como «mínimo comercial» |
| S6 | Pincel | No modelado | «Hake brush, 2”» (kit) | Kit page | **Ausente** | Documentar: pincel hake de 2", o inmersión en tejido |
| S7 | Secado | No modelado | Jacquard: «air dry in the dark» (sin tiempo ni Tª). Ware: 1–2 h a Tª ambiente a oscuras, o ~40 °C 5–10 min | Instructions + CyanoWork | **Ausente** | Añadir ficha: oscuridad obligatoria; tiempos sólo de Ware |
| S8 | Lavado | No modelado | Jacquard: agua fría, **≥5 min** hasta que el agua salga clara, sin jabón. Ware: **20–30 min**, agua no alcalina | Instructions + Ware | **Ausente / divergente** | Modelar con ≥5 min como mínimo de Jacquard y avisar de que 20 min es la práctica de referencia |
| S9 | Oxidación | `applyOxidation`, gamma `1 + 0.5(1-o)`, o=1 ↔ 24 h | ~24 h hasta el azul final; peróxido lo acelera | Instructions + Toning PDF | **Cualitativamente correcto, magnitud sin fuente** | Mantener el ancla 24 h; etiquetar el 0,5 de gamma como heurística |
| S10 | `INK.*.gain` (0,55–1,00) | Factores fijos | Ninguna fuente primaria | — | **Sin fuente** | Marcar como heurística de la app |
| S11 | Nota de `INK.magenta` («EDN mide … 57 tonos frente a 23 en negro») | Afirmación cuantitativa | Sin cita verificable en esta pasada | — | **Sin verificar** | Citar la fuente o retirar la cifra |
| S12 | Lista de virados (`sci.js TONER`) | tanino, té, café, **pirogalol**, níquel, TSP («dorado»), carbonato | Jacquard: carbonato (blanqueo), té, café, tanino, tanino de vino, vino, bórax. Ware: tanino, TSP, acetato de plomo, níquel | Toning PDF + CyanoWork | **Parcialmente correcto** | Quitar **pirogalol** (no documentado); añadir **bórax (violeta)** y **vino (púrpura)** |
| S13 | Nota de `CHEM.ware` («negativo casi tan denso como el platino») | Cualitativa | Ware: «at least 1.8, like those for platinum-palladium» | New page | **Correcto** | Ninguna |

### 3.4 Cifras de la app que NO tienen ninguna fuente (resumen explícito)

- `printDmax`: **1,32 / 1,12 / 1,50 / 1,42** — las cuatro.
- `CHEM.jacquard.range = 1.05`.
- `EXPOSURE_MIN.clasica = [3, 8]`.
- `SOURCE.film.dr = 2.6`, `SOURCE.papel.dr = 1.9`, `SOURCE.vellum.dr = 2.1`.
- `INK.*.gain` (1.0 / 0.95 / 0.85 / 0.55 / 0.5).
- `applyOxidation` gamma 1,5 en el extremo húmedo.
- La cifra «57 tonos / 23 tonos» de `INK.magenta`.
- `CHEM.simple` como química distinta (no existe como tal en Ware).
- La relación «62 % de la clásica».

---

## 4. Contradicciones entre fuentes (registradas, no resueltas por silencio)

**C1. Jacquard contra Jacquard: concentraciones.**
- Instructions (08.17.21): A = 40 g/400 ml (10 % ferricianuro), B = 100 g/400 ml (25 % citrato).
- FAQ (02.08.19): «Solution A: **20% ferric ammonium citrate** … Solution B: **9% potassium ferricyanide**».
- Además la FAQ **intercambia las etiquetas A/B**. Como la mezcla es 1:1, el intercambio es inocuo; las concentraciones no (20/9 ≠ 25/10).
- **Resolución propuesta:** el folleto de instrucciones es el documento procedimental vigente (08.17.21, el que enlazan tienda, kit y set) y coincide con la fórmula de referencia de Ware. La FAQ es más antigua (02.08.19) y describe una variante más diluida, cercana a la receta 20 %+8 %. → Usar 25/10 como canónica y anotar la variante.

**C2. Jacquard contra Ware: vida de la mezcla de trabajo.**
- Jacquard: «stable just **2-4 hours**».
- Ware (misma química exacta): «The mixed sensitizer only has a short life (**days**)».
- No es un error de nadie: es conservadurismo comercial frente a práctica de taller. **La app debe mostrar ambas**, no una.

**C3. Jacquard contra Ware: duración del lavado.**
- Jacquard: «at least **5 minutes** … until the water runs clear».
- Ware: «**20 minutes** should suffice» (tradicional); «20-30 minutes» (nueva).
- Consecuencia funcional: lavar 5 min deja sensibilidad a que el amarillo no se haya ido del todo; lavar 20 min «reduce» la imagen (Ware). La ventana real está entre ambos.

**C4. Jacquard contra Jacquard: efecto del vinagre.**
- «Vinegar Wash: Using white wine vinegar in the initial wash can **increase the tonal range and decrease the overall contrast**» (pág. 1).
- «Post-development Vinegar Bath: … generally you will see an **increase in contrast**, with the deep tones becoming deeper and the highlights becoming whiter» (pág. 2).
- El pie de la figura 1.2 dice «Print washed in **10% vinegar** solution. Notice the **increased tonal range and decrease in overall contrast**».
- Son dos baños distintos (pre vs post) y el propio documento se contradice en la leyenda. **No usar el vinagre como parámetro de contraste sin decir cuál de los dos baños se modela.**

**C5. Jacquard contra su propia SDS: seguridad.**
- FAQ: «Cyanotype is **non-toxic** and does not present any significant health risk».
- SDS del citrato férrico amónico: H315, H319, **H335**, pictograma, «Warning», STOT SE 3.
- SDS del ferricianuro: R32 «**Contact with acids liberates very toxic gas**»; almacenar a oscuras; PEL 5 mg/m³ como CN.
- Es exacta la parte de «no peligroso en uso normal», pero un baño ácido (Ware recomienda ácido nítrico/clorhídrico) con ferricianuro **sí** genera HCN. Cualquier texto de seguridad de la app debería recoger esto.

**C6. Ware contra Ware (matiz):** el lavado largo «reduce» la imagen (Traditional) pero en la nueva química «there should be very little loss of image substance» (New). Coherente con que sean químicas distintas; se registra para no extrapolar el «pierde la mitad» a `ware`/`simple`.

---

## 5. Evidencia ausente (no verificable con las fuentes consultadas)

1. **ml/cm² de recubrimiento según Jacquard**: no existe en ningún documento. Las cifras derivadas son inferencias.
2. **Tiempo y temperatura de secado según Jacquard**: no publicados. Sólo Ware (1–2 h / 40 °C).
3. **Dmax de la copia** para cualquier química: nadie publica un número. `printDmax` es, hoy, invención de la app.
4. **Rango de densidad del negativo que pide Jacquard**: no publicado. Sólo criterio cualitativo («must completely block the light»).
5. **Gramaje del Platinum Rag según Jacquard**: no publicado (300 gsm es dato de Hahnemühle).
6. **Tiempos de exposición al sol para la fórmula clásica**: ninguna fuente primaria los da; sólo lámpara UV.
7. **«CyanoWork II»**: la app cita «CyanoWork / CyanoWork II». He verificado **CyanoWork** (2009). **No he encontrado ningún documento titulado «CyanoWork II»**: la cifra 2,7 del comentario de `tone.js` no queda respaldada por CyanoWork (que da 1,8–2,4, y 2,6 con ácido cítrico).
8. **Número de hojas de Platinum Rag en el kit**: 5 en la web, 10 en el folleto impreso. Sin resolver.
9. **Base del «2 oz» en los envases** (volumen o peso): sin resolver; afecta a si A es 9,6 % o 10,0 %.
10. **Consumidores reales de `P.tone.SOURCE`**: no he podido verificar si la UI lee esa tabla (no se ha revisado `ui.js`).

---

## 6. Correcciones de código propuestas (concretas)

**`src/js/tone.js`**

```js
clasica: {
  name: 'Clásica (Ware/Herschel)', short: 'Clásica',
  range: 1.15, k: 1.25, toe: 0.06, shoulder: 0.12, printDmax: 1.32,   // printDmax: sin fuente, calibrar
  note: 'Citrato férrico amónico 25 g/100 ml + ferricianuro potásico 10 g/100 ml, 1:1. ' +
        'Pierde casi la mitad de la escala tonal en el lavado (Ware).'
},
jacquard: {
  name: 'Kit Jacquard (A+B)', short: 'Jacquard',
  range: 1.15, k: 1.25, toe: 0.06, shoulder: 0.13, printDmax: 1.32,  // misma química que la clásica
  note: 'A 40 g/400 ml (10 %) + B 100 g/400 ml (25 %), 1:1 → 5 % ferricianuro y 12,5 % citrato: ' +
        'idéntico a la fórmula tradicional de Ware. La mezcla aguanta 2-4 h según Jacquard (Ware: días). ' +
        'Los envases premedidos van algo por debajo (kit ≈4,8 %/11,4 %).'
}
```

- Cambiar la etiqueta de `EXPOSURE_MIN` de «al sol» a algo que distinga fuente: `{ jacquard: [10,20,'sol'], clasica: [3,8,'estimado'], ware: [2,6,'UV'], simple: [2,5,'UV'] }`.
- Fusionar o redefinir `simple` (hoy duplica `ware` con un rango mayor sin fuente).
- Retirar la cifra 2,7 / «CyanoWork II» del comentario o sustituirla por 2,6 (ácido cítrico).

**`src/js/engine.js`**

- Eliminar la duplicidad `SOURCE` (tone.js) / `SUPPORT` (engine.js): dejar una sola tabla y borrar la otra.
- Revisar `SUPPORT.film.max = 1.85` frente al requisito documentado ≥1,8 (ideal 2,0–2,4) y marcar el origen (ET-2865) en la UI.
- Etiquetar `printDmax` como estimación/calibración, no como valor medido.

**`src/js/sci.js`**

- Quitar `pirogalol` de `TONER` o marcarlo como «no documentado».
- Añadir `borax` (violeta) y `vino` (púrpura) si se quiere cubrir la lista de Jacquard.
- `applyOxidation`: dejar comentado que la forma de la curva es heurística y que el único ancla documentada es «~24 h».

---

## 7. Fuentes

**Conservadas (primarias o directamente relevantes):**
- *Cyanotype Instructions* (PDF, 08.17.21) — https://store.jacquardproducts.com/cdn/shop/files/Cyanotype_Instructions.pdf — documento procedimental canónico de Jacquard; fuente de todas las cifras de A/B, 1:1, 2-4 h, 5 min de lavado, 24 h de oxidación.
- *Cyanotype Instructions* (web) — https://store.jacquardproducts.com/pages/resources/cyanotype-instructions — versión HTML idéntica en contenido al PDF; sirve para confirmar que el PDF no está obsoleto.
- *Cyanotype Kit* — https://www.jacquardproducts.com/cyanotype-kit — única fuente de «10-20 minutes», del pincel hake de 2", del Platinum Rag y de las masas premedidas.
- *Cyanotype Set* — https://www.jacquardproducts.com/cyanotype-set — masas premedidas del set y rendimiento (65/50 copias).
- *Cyanotype FAQs* (02.08.19) — https://www.jacquardproducts.com/s/Cyanotype-FAQs.pdf — fuente de la contradicción 20 %/9 % y del intercambio A/B.
- *Tips & Troubleshooting* (6.01.15) — https://www.jacquardproducts.com/s/Cyanotype-Tips-and-Troubleshooting.pdf — único enunciado de Jacquard sobre densidad del negativo.
- *Toning Cyanotype Prints* (7.13.15) — https://www.jacquardproducts.com/s/Toning-Cyanotype-Prints.pdf — lista completa de virados y protocolo de blanqueo.
- *Quickstart del kit* — https://www.jacquardproducts.com/s/QUICKSTART_GUIDE_CyanotypeKit.pdf — «10-20 minutes» y «dry in the dark».
- *SDS FAC y K3Fe* (rev. 12/02/2020) — copia íntegra en https://www.unitednow.com/scs/resources/pdf/SDS_JP-Cyanotype_Liquids.pdf — solubilidad 25 g/100 ml (clave para entender el 25 %) y clasificación de peligro.
- Ware, *The Traditional Cyanotype Process* — https://www.mikeware.co.uk/mikeware/Traditional_Cyanotype.html — fórmula 25 g+10 g, rango 1,0–1,2, «half the tonal scale», 1,5 ml/10×8", 20 min de lavado.
- Ware, *CyanoWork* (2009) — https://www.mikeware.co.uk/downloads/CyanoWork.pdf — rangos 1,8–2,4 y 2,6; secado 1 h/40 °C; lavado 20–30 min.
- Ware, *New Cyanotype* — https://www.mikeware.co.uk/mikeware/New_Cyanotype_Process.html — requisito ≥1,8 y «2.6 or so» con cítrico.
- Hahnemühle, ficha Platinum Rag — https://www.hahnemuehle.com/fileadmin/user_upload/bilder/pdf/dfa/Datenblaetter_Archiv/datasheet-PlatinumRag.pdf — 300 gsm, sin tampón alcalino.

**Descartadas o despriorizadas:**
- https://www.jacquardproducts.com/cyanotype y https://www.jacquardproducts.com/cyanotype-chemistry — páginas de producto sin datos numéricos más allá de la lista de sustratos y los formatos de venta; se usan sólo para sustratos.
- https://store.jacquardproducts.com/pages/jacquard-cyanotype-calculator — no publica tabla de tiempos; sólo «use within a few hours».
- Comentarios de terceros (cyanocodex.com, lomography, blogs, wikis) — aparecen en los resultados pero son secundarios y en varios casos fechados en 2026; no se usan como evidencia, sólo como señal de que existe la variante 25/10 frente a 20/8.
- Wikipedia (es/en/fr) — secundaria; no se cita como evidencia.

---

## 8. Próximos pasos

1. **Decidir la fuente canónica** entre el folleto 08.17.21 (25/10) y la FAQ 02.08.19 (20/9) y reflejarlo en la UI con una nota, en vez de elegir en silencio.
2. **Calibrar `printDmax`** con una tira de 21 pasos impresa en Platinum Rag con la química del kit: es la única manera de sustituir cuatro números inventados por uno medido.
3. **Medir el rango real** de la química Jacquard (misma que la clásica) para decidir si `jacquard.range` se separa de `clasica.range` con datos.
4. Verificar si la UI consume `P.tone.SOURCE` (código muerto vs. dato contradictorio visible).
5. Localizar o descartar «CyanoWork II» antes de mantener esa cita en el comentario de `tone.js`.
