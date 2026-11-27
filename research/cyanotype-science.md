# Cianotipia: química, tono, color y parámetros para un simulador

**Documento de investigación técnica — versión 1.1**
Destino: motor de simulación de cianotipia en JavaScript (`App/cianotipia`)
Idioma: español. Todas las magnitudes numéricas van con fuente o con etiqueta explícita.

---

## 0. Convenciones de lectura

Cada afirmación relevante lleva una de estas etiquetas:

| Etiqueta | Significado |
|---|---|
| **[D]** | Dato directo: la fuente lo afirma explícitamente (cita textual o cifra publicada). |
| **[I]** | Interpretación: deducción razonable a partir de lo que la fuente dice, sin que la fuente lo formule así. |
| **[M]** | Inferencia del autor de este documento / valor de modelo propuesto, **no medido**. |
| **[UNVERIFIED]** | Afirmación que no he podido respaldar con una fuente verificable en esta investigación. No usarla como hecho. |

**Advertencia metodológica.** La cianotipia es un proceso artesanal: casi todas las cifras publicadas son de un taller, un papel y una fórmula concretos. Los valores que aquí se dan como "típicos" son rangos, no constantes. El simulador debe exponerlos como parámetros ajustables.

---

## Resumen ejecutivo (las cifras que importan)

1. **Química clásica:** citrato férrico amónico (FAC) + ferricianato potásico. **Química Ware:** oxalato férrico amónico (FAO) + ferricianato potásico, sin potasio libre [D].
2. **Sensibilidad espectral:** el papel de cianotipo comercial (fórmula clásica) responde sobre todo entre **300 y 330 nm**, cae al aumentar la longitud de onda y prácticamente cesa hacia **420–430 nm** [D, estudio revisado por pares; confianza media].
3. **Nuevo cianotipo (ferrioxalato):** responde algo más lejos en el azul-violeta; el ferrioxalato potásico se usa como actinómetro hasta ~500 nm [D para el rendimiento a 253,7 nm; I para la extensión].
4. **Rango de densidades del negativo:** clásico **1,0–1,2 logD**; nuevo cianotipo **1,8–2,4 logD** (hasta **2,6** con ácido cítrico) [D].
5. **Pérdida tonal:** la fórmula clásica pierde **aproximadamente la mitad de la escala tonal** en el lavado; la nueva pierde muy poco [D].
6. **Densidad de reflexión (canal rojo):** rango de densidad inicial de **~1,0–1,2** en las curvas publicadas por Ware [D]; **Dmax 1,4** típico en Arches Aquarelle y hasta **1,55** en Hahnemühle Platinum Rag según una fuente comercial [D, confianza media-baja].
7. **Color medido del Dmax:** **L\* = 25,78, a\* = 2,08, b\* = −26,66** (espectrofotómetro i1Pro, cianotipo clásico sobre Schut Laurier) [D].
8. **Azul de Prusia:** absorbe la luz roja entre **690 y 730 nm** según la estructura; su máximo de reflectancia está en **455–475 nm** [D].
9. **Oxidación:** el azul tarda unas **24 h** en estabilizarse; el peróxido de hidrógeno (0,3 %, ≤30 s) lo revela al instante **sin cambiar la densidad final** [D].
10. **Fracasos:** sobreexposición = sombras "bronceadas"/solarizadas durante la exposición (azul de Prusia → blanco de Prusia) y, en seco, sombras tapadas; subexposición = altas luces que se van en el agua [D].

---

## 1. Química y sensibilidad espectral

### 1.1 Las dos químicas

**Fórmula clásica (Herschel, 1842).** Dos soluciones madre que se mezclan a partes iguales justo antes de emulsionar [D] ([Ware, *The Traditional Cyanotype Process*](https://www.mikeware.co.uk/mikeware/Traditional_Cyanotype.html)):

- Solución A: **25 g de citrato férrico amónico** ("verde", 14–18 % de hierro) en agua destilada hasta 100 cc.
- Solución B: **10 g de ferricianato potásico** en agua destilada hasta 100 cc.
- Mezcla: volúmenes iguales; ~1,5 cc para una copia 10×8 pulgadas por varilla.

En tanto por ciento de la mezcla final, Ware tabula para distintas variantes históricas: *Smee* 0 % FAC / 16 % ferricianato; *Herschel* 7 % FAC pardo / 12 % ferricianato; *Lietze* 10 % / 8 %; *Valenta* 13 % verde / 6 % [D] ([Ware, *A Blueprint for Conserving Cyanotypes*](https://resources.culturalheritage.org/pmgtopics/2003-volume-ten/10_02_Ware.html)).

**Nuevo cianotipo (Ware, 1995).** Una sola botella, larga vida útil [D] ([Ware, *CyanoWork*, PDF](https://www.mikeware.co.uk/downloads/CyanoWork.pdf)):

- **30 g de oxalato férrico amónico** (FAO) + **10 g de ferricianato potásico** + **0,1 g de dicromato amónico** (opcional, aumenta contraste y vida útil) en 100 cc.
- Se calienta, se deja cristalizar y **se filtra el oxalato férrico potásico** que precipita: eso elimina la mayor parte del potasio, que es el responsable de que el azul de Prusia "soluble" se lave [D] ([Ware, *The New Cyanotype Process*](https://www.mikeware.co.uk/mikeware/New_Cyanotype_Process.html)).

**Reacción** [D] ([Ware, conservación](https://resources.culturalheritage.org/pmgtopics/2003-volume-ten/10_02_Ware.html)):

```
Fe(III)-citrato/oxalato --hν--> Fe(II) + ligando oxidado
Fe(II) + [Fe(III)(CN)6]3-  --> Fe(III)[Fe(II)(CN)6]-  (azul de Prusia)
```

El pigmento es **ferrocianuro férrico** (Fe₄[Fe(CN)₆]₃·xH₂O en la forma "insoluble"), no ferrocianuro ferroso: el "azul de Turnbull" es la misma sustancia [D] (Ware, conservación; [Kirby & Saunders 2004](https://www.nationalgallery.org.uk/media/15510/kirby_saunders2004.pdf)).

### 1.2 Espectro de sensibilidad: qué está medido y qué se repite por tradición

| Afirmación | Valor | Fuente | Confianza |
|---|---|---|---|
| Pico de respuesta del papel de cianotipo (fórmula clásica, papel comercial) | **300–330 nm** | Turner et al. 2014, *Photochem. Photobiol. Sci.*, [DOI 10.1039/c4pp00166d](https://doi.org/10.1039/c4pp00166d); recogido en [cyanocodex](https://cyanocodex.com/en/supplies/uv-lamp/) | Media (original de pago; sólo he verificado el resumen y las citas secundarias) |
| Caída de respuesta con λ | monótona decreciente | ídem | Media |
| Corte práctico | **~420–430 nm** (respuesta ≈ 0) | [cyanocodex, UV lamps](https://cyanocodex.com/en/supplies/uv-lamp/) citando a Turner | Media-baja |
| 365 nm vs 395–405 nm a igual energía | **365 nm más eficaz** | ídem | Media |
| Rendimiento cuántico del ferrioxalato potásico a 253,7 nm | **Φ = 1,39 ± 0,02** | Bolton et al. 2011, NIST, [PDF](https://tsapps.nist.gov/publication/get_pdf.cfm?pub_id=904114) | Alta |
| Ferrioxalato como actinómetro | rango útil ~250–500 nm, Φ decreciente con λ | Hatchard & Parker 1956, [Proc. R. Soc. A](https://royalsocietypublishing.org/rspa/article/235/1203/518/9816/A-new-sensitive-chemical-actinometer-II-Potassium) | Alta (referencia clásica) |

**Interpretación [I]:** el cianotipo clásico es, en la práctica, un proceso **UV-B/UV-A corto**. El "pico a 365 nm" que repite la comunidad no es un máximo medido, sino el compromiso práctico: 365 nm está dentro de la banda útil y es mucho más eficaz que 395–405 nm. Para el simulador, la curva de sensibilidad debe ser **monótona decreciente desde ~300 nm**, no gaussiana centrada en 365.

**Matiz sobre el nuevo cianotipo [I]:** el ferrioxalato absorbe y fotoliza bien en todo el UV-A y mantiene actividad actinométrica hasta el azul (~450–500 nm). Por eso el nuevo cianotipo es más rápido y algo más "azul-sensible" que el clásico, aunque sigue siendo un proceso UV en la práctica.

### 1.3 Fuentes de luz y tiempos de exposición

| Fuente | Tiempo típico | Notas | Fuente |
|---|---|---|---|
| Sol directo | **1–30 min** | "En caso de duda, mejor sobreexponer que subexponer" | [Jacquard / Dick Blick, PDF](https://www.dick-blick.com/items/013/21/Cyanotpe-Detailed-Instructions.pdf) |
| Lámpara UV 125 W a 18" | **30 min** | Guía básica del Science Museum | [NSMM](https://blog.scienceandmediamuseum.org.uk/introduction-cyanotype-process/) |
| Lámpara UV genérica, fórmula clásica | **20–30 min**; "30 min o más no es raro" | Ware | [Ware, Traditional](https://www.mikeware.co.uk/mikeware/Traditional_Cyanotype.html); [Ware, New](https://www.mikeware.co.uk/mikeware/New_Cyanotype_Process.html) |
| Lámpara UV genérica, **nuevo cianotipo** | **2–4 min** | "menos de cinco minutos" | [Ware, New](https://www.mikeware.co.uk/mikeware/New_Cyanotype_Process.html); [CyanoWork](https://www.mikeware.co.uk/downloads/CyanoWork.pdf) |
| HID/metal halide 800 W + negativos digitales | **60 s** (nuevo cianotipo) | dato de taller de Ware | [CyanoWork](https://www.mikeware.co.uk/downloads/CyanoWork.pdf) |
| Fluorescente BL (actínica) | pico de emisión **360 nm** (Philips TLADK 30/05); **368 nm** (BLB Sankyo FPL27BLB) | Tubos usados por Ware a 8 cm | [Ware, conservación](https://resources.culturalheritage.org/pmgtopics/2003-volume-ten/10_02_Ware.html); [Sentoku et al. 2025](https://doi.org/10.3390/photochem5030018) |
| LED UV 365 nm / 395 nm | minutos; 365 más eficaz a igual energía | Práctica de taller | [cyanocodex](https://cyanocodex.com/en/supplies/uv-lamp/) |
| Lámpara de vapor de mercurio | — | Mencionada como fuente estándar de museo | [NSMM](https://blog.scienceandmediamuseum.org.uk/introduction-cyanotype-process/) |

**Dato de dispersión real entre papeles [D]:** Christina Z. Anderson expuso **más de 100 papeles** en una unidad UVBL Edwards; la mayoría imprimió entre **19 y 24 min**, algunos papeles muy lentos entre **38 y 60 min** y unos pocos rápidos entre **8 y 12 min** ([AlternativePhotography](https://www.alternativephotography.com/papers-for-traditional-classic-cyanotype-process-1613-research-for-free/)).

> **Para el simulador:** no modelar "segundos" absolutos, sino **dosis relativa** `E = I·t` normalizada a la dosis de referencia del papel/química elegidos. La exposición absoluta depende de la fuente, la distancia y el negativo; la dosis relativa es lo que determina el tono.

---

## 2. Reproducción tonal

### 2.1 Rango de densidades del negativo que pide cada química

| Química | Rango de densidad del negativo (logD) | Fuente | Confianza |
|---|---|---|---|
| Clásica (FAC + ferricianato) | **1,0 – 1,2** | Ware: *"only about 1 or 1.2, which is half that (ca. 2.4) of the 'new cyanotype'"* ([Ware, Traditional](https://www.mikeware.co.uk/mikeware/Traditional_Cyanotype.html)) | Alta |
| Nueva (FAO) | **1,8 – 2,4**; hasta **2,6** con ácido cítrico | Ware: *"at least 1.8 and as much as 2.4"* ([CyanoWork](https://www.mikeware.co.uk/downloads/CyanoWork.pdf)); *"2.6 or so"* ([Ware, New](https://www.mikeware.co.uk/mikeware/New_Cyanotype_Process.html)) | Alta |

**Por qué:** en la fórmula clásica, *"about half the tonal scale of your print will disappear in the wet processing, as most of the Prussian blue image pigment in the high values is washed out"* [D] (Ware, Traditional). El nuevo cianotipo retiene casi todo el pigmento; de ahí que acepte un negativo de escala larga, como el de platino-paladio [D] (Ware, New).

### 2.2 Forma de la curva característica

- **No es lineal en logH: es una curva en S con hombro largo.** Koraks, midiendo un cianotipo clásico con cuña escalonada Stouffer T2115 y espectrofotómetro i1Pro: *"Classic cyanotype is a short-curved, high-contrast process. Its dynamic range in this example is about 3 stops, which corresponds to a variable contrast paper ISO-R of around 100… since the shoulder of the curve is quite long, the shadows have a tendency towards blocking up"* [D] ([Koraks](https://tinker.koraks.nl/photography/opposites-attract-salted-paper-and-cyanotype-curves/)).
- **3 stops ≈ 0,9 logD** de rango útil [I, a partir de "about 3 stops"].
- **ISO-R ≈ 100** equivale aproximadamente a un grado 3 de papel de contraste variable; con buena separación de sombras el proceso llega a grado 3,5–4 [D] (Koraks).
- **El hombro es el rasgo dominante:** las altas luces se comprimen y las sombras se "tapan" antes de lo que la densidad del negativo sugiere [D/I] (Koraks; [Ware, Traditional](https://www.mikeware.co.uk/mikeware/Traditional_Cyanotype.html)).
- **Nuevo cianotipo:** curva *"more similar to salted paper in terms of contrast"*, es decir, más larga y con toe/hombro más suaves [D, observación de Koraks] ([Koraks](https://tinker.koraks.nl/photography/opposites-attract-salted-paper-and-cyanotype-curves/)).

**Gamma / índice de contraste [M]:** no he encontrado un valor de gamma publicado y trazable para cianotipo. Estimación a partir del rango y de la forma de la curva:

- Clásico: **γ ≈ 1,1–1,3** en la sección media (pendiente ΔD/ΔlogH), con hombro que cae a ~0,2–0,3.
- Nuevo: **γ ≈ 0,9–1,0**, más constante a lo largo de 2,2 décadas.

Estos valores son **inferencia del autor**; el simulador debe calibrarlos contra una cuña real.

### 2.3 Pérdida de tonos en altas luces y sombras

- **Altas luces (clásico):** se pierden. Ware: la mitad de la escala tonal desaparece en el lavado, *"as most of the Prussian blue image pigment in the high values is washed out"* [D]. En la práctica, cualquier densidad de negativo por debajo de ~0,2–0,3 logD imprime casi como blanco de papel [I].
- **Sombras:** el hombro largo hace que densidades por encima del rango útil se fundan en un azul casi negro sin detalle ("bulletproof shadows") [D/I] (Koraks; [cyanocodex, bronzing](https://cyanocodex.com/en/troubleshooting/bronzing/)).
- **Nuevo cianotipo:** *"Very little of the Prussian blue image is lost in the wet processing"* [D] ([Ware, New](https://www.mikeware.co.uk/mikeware/New_Cyanotype_Process.html)); conserva mejor las altas luces y separa mejor las sombras.

### 2.4 Dmax y Dmin de reflexión

| Magnitud | Valor | Contexto | Fuente | Confianza |
|---|---|---|---|---|
| Dmin (papel sin exponer) | ~**0,05–0,08** densidad de reflexión | Papel blanco de algodón | [M] valor típico; coherente con L\*≈96 | Baja |
| Rango de densidad inicial (tabla de Ware, canal rojo) | **0,35–1,20** según fórmula | *Smee* 0,90–0,95; *Herschel* 0,55–1,05 (aquapel) y 0,80–1,20 (gelatina); *Lietze* 0,65–0,85; *Valenta* 0,35–0,85; *Ware* 0,85–1,15 | [Ware, conservación, Tabla 4](https://resources.culturalheritage.org/pmgtopics/2003-volume-ten/10_02_Ware.html) | Alta |
| Dmax típico en Arches Aquarelle 300 g | **1,4** | Fórmula clásica, densidad de reflexión | [Calibration Flow](https://calibrationflow.com/en/cyanotype-calibration) | Media-baja (fuente comercial) |
| Dmax máximo en Hahnemühle Platinum Rag | **1,55** | "límite físico de la química clásica" | ídem | Media-baja |
| Dmax del nuevo cianotipo | *"maximum density verging on black"* | cualitativo | [CyanoWork](https://www.mikeware.co.uk/downloads/CyanoWork.pdf) | Alta (cualitativo) |

**Convención de medida [D]:** la densidad de un cianotipo se lee en **canal rojo** (donde el azul de Prusia absorbe): *"All densities recorded refer to the 'red' channel of the reflectance colour head, corresponding to the wavelength of maximum absorption by Prussian blue"* (Ware, conservación).

> **Para el simulador:** si se simula densidad, usar **D_rojo**. Si se simula color, usar Lab (sección 3). No mezclar ambos sin una tabla de conversión.

### 2.5 Tabla de calibración recomendada (parámetros de partida)

| Parámetro | Clásico | Nuevo cianotipo | Unidad |
|---|---|---|---|
| Rango de negativo aceptado | 1,0–1,2 | 1,8–2,4 | logD |
| Dmax de la imagen | 1,30–1,45 | 1,45–1,60 | D reflexión (rojo) |
| Dmin | 0,06 | 0,06 | D reflexión |
| Contraste (γ medio) | 1,1–1,3 [M] | 0,9–1,0 [M] | — |
| Longitud del hombro | 0,45–0,60 | 0,30–0,40 | logH [M] |
| Longitud del toe | 0,15–0,25 | 0,25–0,35 | logH [M] |
| Pérdida en lavado (altas luces) | ~50 % de la escala | <10 % | % [D]/[I] |

---

## 3. Color

### 3.1 Física del azul de Prusia

- **Banda de transferencia de carga entre valencias (IVCT, Fe²⁺→Fe³⁺):** absorción en el rojo, **690–730 nm según la estructura** [D] ([Kirby & Saunders, *National Gallery Technical Bulletin* 25, 2004](https://www.nationalgallery.org.uk/media/15510/kirby_saunders2004.pdf)).
- **Máximo de reflectancia:** **455–475 nm** — *"the characteristic maxima for Prussian blue in the 455 to 475 nm region"* [D] (Kirby & Saunders 2004).
- **λmax en otros soportes:** ~**700 nm** en dispersión acuosa [D] ([Estelrich & Busquets 2021](https://pmc.ncbi.nlm.nih.gov/articles/PMC7830864/)); **712 nm** en nanopartículas [D] ([Sci. Rep. 2018](https://www.nature.com/articles/s41598-018-20139-0)); **720 nm** en películas depositadas químicamente [D] ([Ando 1998](https://www.sciencedirect.com/science/article/abs/pii/S0925400598002871)); **690 nm** en películas "soluble" y **730 nm** en "insoluble" [D] ([Mortimer & Rosseinsky 1984](https://pubs.rsc.org/en/content/articlelanding/1984/dt/dt9840002059/unauth)).
- **Orden de densidades por canal (cianotipo clásico):** *"lots of cyan density, less magenta and only limited yellow density"* [D] (Koraks). Es decir: **absorción rojo > verde > azul**.

**Sobre la banda de 500–550 nm:** la hipótesis de una banda de absorción específica centrada en 500–550 nm **no la he podido verificar** en ninguna fuente primaria. Lo que sí está documentado es (a) la banda IVCT centrada en ~700 nm, muy ancha, cuya cola alcanza el verde, y (b) una **ventana de reflectancia en 455–475 nm**. El aspecto "cian-teal" de las densidades medias y el "navy" de las altas se explican por la combinación de esa ventana azul, la cola de la banda roja y la dispersión múltiple del papel (a más pigmento, más camino óptico y más absorción en el verde). Ver **Contradicciones** y **Evidencia faltante**.

### 3.2 Color medido

| Muestra | L\* | a\* | b\* | Método | Fuente | Confianza |
|---|---|---|---|---|---|---|
| Dmax de cianotipo clásico sobre Schut Laurier | **25,78** | **2,08** | **−26,66** | i1Pro, densidad máxima | [Koraks](https://tinker.koraks.nl/photography/opposites-attract-salted-paper-and-cyanotype-curves/) | Alta (medición directa, un solo espécimen) |
| Azul de Prusia como pigmento (referencia cualitativa) | — | — | — | Methuen **21F7** "Prussian blue" | [Ware, Cyanomicon, §1.9](https://www.mikeware.co.uk/downloads/-Cyanomicon.pdf) | Alta (cualitativa) |
| Cian (referencia de tono) | — | — | — | Methuen **23A7** | ídem | Alta (cualitativa) |

No he encontrado un conjunto publicado de valores Lab **a lo largo de toda la escala** (altas luces, medios, sombras) para cianotipo. Los valores de altas luces y medios que siguen son **del modelo**, anclados en el Dmax medido y en la descripción física del pigmento.

### 3.3 Progresión de color propuesta (modelo)

| Cobertura | Descripción | L\* | a\* | b\* | sRGB aprox. | Hex | Origen |
|---|---|---|---|---|---|---|---|
| 0,00 | Papel blanco cálido | 96 | 0,5 | 4 | 248, 243, 236 | `#F8F3EC` | [M] calculado |
| 0,15 | Blanco azulado muy pálido | 88 | −5 | −8 | — | — | [M] |
| 0,30 | Cian pálido | 82 | −7 | −12 | 177, 209, 226 | `#B1D1E2` | [M] calculado |
| 0,55 | Azul medio (cyan-teal) | 62 | −8 | −22 | 106, 156, 188 | `#6A9CBC` | [M] calculado |
| 0,80 | Azul profundo | 42 | −4 | −26 | — | — | [M] |
| 1,00 | Azul Prusia / navy | **26** | **2** | **−27** | 28, 63, 102 | `#1C3F66` | Ancla medida (Lab) + conversión [M] |

**Rotación de tono [I]:** el ángulo de tono pasa de ~236° (cian) en densidades bajas a ~274° (azul-violeta) en Dmax. Es exactamente la progresión "cian pálido → índigo profundo" que describe la práctica. La causa física es que al aumentar la concentración se absorbe también el verde (cola de la banda de 700 nm), mientras la ventana de 455–475 nm sigue reflejando azul.

**Nota sobre a\*:** el valor medido a\* = +2,08 es positivo (ligeramente rojizo) para un azul. Puede deberse al papel (Schut Laurier), al iluminante o a la geometría de medida. El modelo debe permitir un desplazamiento de a\* por papel.

---

## 4. Oxidación y secado

### 4.1 Cronología

| Momento | Qué ocurre | Fuente |
|---|---|---|
| 0–30 s tras la exposición | Sombras "bronceadas"/grises: azul de Prusia reducido a **blanco de Prusia** (ferrocianuro ferroso), incoloro | [Ware, conservación](https://resources.culturalheritage.org/pmgtopics/2003-volume-ten/10_02_Ware.html) |
| Lavado (5–30 min) | Se elimina el sensibilizador amarillo; el azul reaparece parcialmente | [Ware, Traditional](https://www.mikeware.co.uk/mikeware/Traditional_Cyanotype.html) |
| Secado, **~24 h** | Oxidación aérea del blanco de Prusia → azul de Prusia; la densidad sube hasta el valor final | Ware: *"they will do so during drying (24 hours)"* ([Ware, New](https://www.mikeware.co.uk/mikeware/New_Cyanotype_Process.html)) |
| Hasta **5 días** | Recuperación completa de densidad en muestras desvaídas: **≥95 % en 1 día, ≥99 % en 5 días** | [Ware, conservación](https://resources.culturalheritage.org/pmgtopics/2003-volume-ten/10_02_Ware.html) |
| 1 semana | Sin cambios medibles más allá del ruido experimental | [I] a partir de los datos anteriores |

**Magnitud del cambio por oxidación [D, confianza media-baja]:** medir a 1 h en lugar de 24 h produce curvas *"consistently off by 8 to 12 % in the highlights"* ([Calibration Flow](https://calibrationflow.com/en/cyanotype-calibration)). Es decir: el color sigue moviéndose durante el primer día, sobre todo en las altas luces.

### 4.2 Peróxido de hidrógeno

| Aspecto | Dato | Fuente |
|---|---|---|
| Concentración | **0,3 %** (50 cc de H₂O₂ al 6 % "20 volúmenes" por litro) | [Ware, CyanoWork](https://www.mikeware.co.uk/downloads/CyanoWork.pdf) |
| Tiempo | **≤ 30 segundos** durante el lavado final | ídem |
| Efecto sobre la densidad final | **Ninguno**: *"This treatment makes no difference to the final result"* | ídem; [Ware, Traditional](https://www.mikeware.co.uk/mikeware/Traditional_Cyanotype.html) |
| Alternativa de museo | Baño al **3 %** | [NSMM](https://blog.scienceandmediamuseum.org.uk/introduction-cyanotype-process/) |
| Alternativa doméstica | **1 gota** de H₂O₂ al 3 % | Jacquard, citado en [cyanocodex](https://cyanocodex.com/en/how-to/hydrogen-peroxide/) |
| Sin peróxido | El aire hace lo mismo en **~24 h** | ídem; Ware |

**Mecanismo [D]:** `2 Fe(II) + H₂O₂ + 2 H⁺ → 2 Fe(III) + 2 H₂O`, es decir, oxida el blanco de Prusia a azul de Prusia (Ware, conservación, ec. 7).

> **Para el simulador:** el peróxido es un **acelerador temporal**, no un cambio de color final. Modelarlo como un factor de avance de la oxidación (`t_efectivo = t + 24 h`), no como un multiplicador de densidad.

---

## 5. Virados (toning)

Casi todos los virados son **dos pasos**: (1) blanqueo alcalino, que destruye el azul de Prusia y deja un residuo amarillo de hierro; (2) baño de tanino o revelador, que vuelve a formar una imagen coloreada [D] ([Michelle Vine, *Toning Cyanotype Prints*, PDF](https://michellevine.com/wp-content/uploads/2019/06/Toning-Cyanotype-Prints.pdf); [Ware, CyanoWork](https://www.mikeware.co.uk/downloads/CyanoWork.pdf)).

| Virado | Proceso | Resultado descrito | Fuente | Confianza |
|---|---|---|---|---|
| **Peróxido de hidrógeno** | 0,3 %, 30 s | No cambia el color; sólo acelera el azul | [Ware](https://www.mikeware.co.uk/downloads/CyanoWork.pdf) | Alta |
| **Amoníaco / NaOH / carbonato sódico (blanqueo)** | 1 % NH₄OH, 1 % NaOH o **5 % Na₂CO₃** | Azul → **amarillo pálido** (hidróxido férrico) | [Ware, CyanoWork](https://www.mikeware.co.uk/downloads/CyanoWork.pdf) | Alta |
| **Carbonato sódico 10 %** | Blanqueo | **Amarillo-marrón** | [jorj.org](https://jorj.org/photo/3071) | Media (práctica) |
| **Ácido tánico 1 % tras blanqueo** | 5–10 min | **Marrón purpúreo**, imagen más intensa | [Ware, CyanoWork](https://www.mikeware.co.uk/downloads/CyanoWork.pdf) | Alta |
| **Ácido tánico 20 %** | Tras amoníaco 5 % | **Púrpura/lila** | [NSMM](https://blog.scienceandmediamuseum.org.uk/introduction-cyanotype-process/) | Alta |
| **Ácido tánico 2 % (10 g en 500 ml)** | Tras amoníaco diluido | **Marrón/negro** | [NSMM](https://blog.scienceandmediamuseum.org.uk/introduction-cyanotype-process/) | Alta |
| **Ácido gálico 1 %** | Tras amoníaco 5 % | **Púrpura/lila**; con borax frío, tinte violeta | [NSMM](https://blog.scienceandmediamuseum.org.uk/introduction-cyanotype-process/) | Alta |
| **Té negro** | Infusión concentrada | **Marrón cálido oscuro**, sepia | [Florence Jalice](https://www.florencejalice.com/post/it-s-raining-head-to-the-kitchen); [Ana Solo](https://www.anaaceves.com/toning-your-cyanotype/) | Media (práctica) |
| **Café** | Infusión concentrada | **Negro frío**, neutro | ídem | Media |
| **Té verde** | Infusión concentrada | Tiñe el papel de **rosa**, mancha menos | [Florence Jalice](https://www.florencejalice.com/post/it-s-raining-head-to-the-kitchen) | Media-baja |
| **Pirogálico (ácido pirogálico)** | Tras blanqueo alcalino | **Marrón rojizo**; Anderson lo lista como *"pyrogallic–hydrogen peroxide toner"* | [AlternativePhotography](https://www.alternativephotography.com/multi-colored-cyanotypes/); [Anderson, cap. 9](https://www.oreilly.com/library/view/cyanotype/9780429805974/xhtml/18_Chapter09.xhtml) | Media |
| **Blanquear + revelar (dos baños)** | Álcali → ácido/tanino | El resultado típico es *"red-browned flat hues with a little dmax"* | [co-mag.net](http://www.co-mag.net/2007/cyanotype-black-toning/) | Media-baja (práctica) |
| **Fosfato trisódico 5 %** | Baño directo | **Amarillo dorado** (fosfato férrico) | [Ware, CyanoWork](https://www.mikeware.co.uk/downloads/CyanoWork.pdf) | Alta |
| **Acetato de plomo 5 %** (pH 7,5–8) | 1–2 min | **Violeta** profundo; estabiliza el azul | [Ware, CyanoWork](https://www.mikeware.co.uk/downloads/CyanoWork.pdf) | Alta (pero tóxico) |
| **Sulfato de níquel 5–10 %** | 1 h | **Azul más verdoso**; resiste álcalis | [Ware, CyanoWork](https://www.mikeware.co.uk/downloads/CyanoWork.pdf) | Alta |

### Direcciones de color para el modelo (aprox., [M])

No existen mediciones colorimétricas publicadas de estos virados que haya podido verificar. Propongo codificarlos como **rotaciones de tono en Lab** sobre la imagen original:

| Virado | Δ tono (aprox.) | Δ croma | Δ L\* |
|---|---|---|---|
| Tánico / gálico | → 35–50° (marrón cálido) | +10 a +20 | −5 a −10 (más denso) |
| Té negro | → 45–60° (sepia) | +5 a +15 | −3 |
| Café | → 20–30° (marrón frío) | 0 a +8 | −2 |
| Té verde | papel → 0–20° (rosa) | +3 | 0 |
| Pirogálico | → 20–35° (marrón rojizo) | +8 | −3 |
| TSP | → 85–95° (amarillo) | +25 | +15 (más claro) |
| Plomo | → 290–300° (violeta) | +5 | 0 |
| Níquel | → 200–220° (verde-azul) | −5 | 0 |

**Advertencia:** estos valores son **estimaciones del autor** basadas en descripciones cualitativas, no en mediciones. Deben validarse con un espectrofotómetro antes de presentarlos como reales en la interfaz.

---

## 6. Efecto del papel

### 6.1 Regla química básica

**El papel debe estar libre de tampón alcalino (carbonato cálcico).** *"Use only papers that are not alkaline-buffered with chalk… Alkalies are hostile to cyanotype chemistry"* [D] ([Ware, CyanoWork](https://www.mikeware.co.uk/downloads/CyanoWork.pdf)). Un tampón a pH 9,4 decolora el azul de Prusia en **1–10 minutos**; una disolución 0,25 M de carbonato sódico (pH ~10,7) lo destruye en **menos de 30 segundos** [D] (Ware, conservación).

### 6.2 Papeles recomendados por la comunidad

| Papel | Por qué | Fuente |
|---|---|---|
| **Arches Platine** (dos gramajes) | Sin tampón, fabricado para procesos alt; Anderson prefiere el fino | [Anderson / AlternativePhotography](https://www.alternativephotography.com/papers-for-traditional-classic-cyanotype-process-1613-research-for-free/) |
| **Bergger COT 320 / 160** | 100 % algodón, sin tampón, "azules intensos, contraste moderado, blancos puros" | ídem; [Bergger](https://bergger.com/en/page/19-paper-suitable-for-cyanotype) |
| **Hahnemühle Platinum Rag (HPR)** | Encolado firme; con fórmula 10/10 da *"beautiful turquoise"*; Dmax hasta 1,55 | ídem; [Calibration Flow](https://calibrationflow.com/en/cyanotype-calibration) |
| **Arches Aquarelle** | Funciona "out of the box"; *"gorgeous deep blue"*; Dmax ~1,4 | ídem |
| **Awagami Platinum Gampi / Mitsumata, Legion Revere Platinum, Herschel Platinotype** | Sin tampón, para alt | ídem |
| **Canson Bristol Recycled** | El papel más blanco de la prueba y barato | ídem |

### 6.3 Cómo cambia el aspecto

- **Tono de base:** *"Often a cream-colored paper balances out the blue of cyanotype quite nicely"* [D] (Anderson). Un papel cálido desplaza el conjunto hacia un azul más neutro/grisáceo; un papel muy blanco azulado hace el azul más eléctrico.
- **Encolado:** el cianotipo necesita que la química **penetre en la fibra**; los papeles muy encolados requieren tensoactivo (Tween 20 al 0,25 %) [D] ([Ware, CyanoWork](https://www.mikeware.co.uk/downloads/CyanoWork.pdf); [Anderson](https://www.alternativephotography.com/papers-for-traditional-classic-cyanotype-process-1613-research-for-free/)).
- **Textura:** el grano del papel produce moteado y "grano" en la imagen; los malos papeles dan *"grainy, pale gray-blue, dull"* y **acortan el rango tonal** [D] (Anderson).
- **Tampón:** los papeles tamponados pierden azul en el lavado y dan altas luces amarillentas o desvaídas [D/I] (Ware; Anderson).
- **Fogging químico:** si el recubrimiento amarillo vira a verde o azul antes de exponer, el papel tiene impurezas; se corrige con ácido cítrico al 2 % [D] (Ware).

---

## 7. Fallos de exposición (para generar avisos en el simulador)

| Síntoma | Causa | Apariencia | Fuente |
|---|---|---|---|
| **Subexposición** | Dosis insuficiente | Imagen pálida; las altas luces y medios se van en el agua; el amarillo no desaparece del todo en las zonas claras | [James, *The Cyanotype Process*](https://sites.evergreen.edu/expphoto/wp-content/uploads/sites/293/2015/05/JamesCyanotypeProcessSm.pdf); [cyanocodex](https://cyanocodex.com/en/troubleshooting/washes-out/) |
| **Sobreexposición (fórmula clásica)** | Dosis excesiva | En seco: imagen **demasiado oscura y tapada**, sin detalle en sombras | [Jacquard](https://www.dick-blick.com/items/013/21/Cyanotpe-Detailed-Instructions.pdf); [cyanocodex, bronzing](https://cyanocodex.com/en/troubleshooting/bronzing/) |
| **Bronceado / solarización** | Exposición muy alta con sensibilizador en exceso | Las sombras **se invierten a gris-azul pálido** durante la exposición (blanco de Prusia); recuperan el azul al oxidarse | [Ware, conservación](https://resources.culturalheritage.org/pmgtopics/2003-volume-ten/10_02_Ware.html); [Ware, Traditional](https://www.mikeware.co.uk/mikeware/Traditional_Cyanotype.html) |
| **Sombras "bulletproof"** | Hombro largo + sobreexposición | Azul casi negro, sin separación; típico del clásico | [Koraks](https://tinker.koraks.nl/photography/opposites-attract-salted-paper-and-cyanotype-curves/) |
| **Altas luces verdes** | Sensibilizador sin lavar / papel impuro | Tono verde en zonas claras | [Ware, CyanoWork](https://www.mikeware.co.uk/downloads/CyanoWork.pdf) |
| **Manchas amarillas** | Lavado insuficiente | Fondo amarillento | ídem |
| **Azul desvaído / grisáceo** | Papel tamponado o agua dura | Azul grisáceo, altas luces sucias | [Anderson](https://www.alternativephotography.com/papers-for-traditional-classic-cyanotype-process-1613-research-for-free/) |
| **Brillo metálico en seco** | Sin explicación documentada | — | [cyanocodex](https://cyanocodex.com/en/troubleshooting/bronzing/) (reconoce no tener fuente) |

**Regla práctica de exposición [D]:** con la fórmula clásica se expone hasta que las sombras se vean claramente "bronceadas"/tapadas; el museo recomienda **al menos un paso más** de lo que parece necesario, y Jacquard *"over-exposure is almost always preferred to under-exposure"* ([NSMM](https://blog.scienceandmediamuseum.org.uk/introduction-cyanotype-process/); [Jacquard](https://www.dick-blick.com/items/013/21/Cyanotpe-Detailed-Instructions.pdf)).

---

## 8. Referencias

### Fuentes primarias / autorizadas (keep)

- **Mike Ware, *The Traditional Cyanotype Process*** — https://www.mikeware.co.uk/mikeware/Traditional_Cyanotype.html — fórmula clásica, rango 1,0–1,2, pérdida del 50 % en lavado, peróxido.
- **Mike Ware, *The New Cyanotype Process*** — https://www.mikeware.co.uk/mikeware/New_Cyanotype_Process.html — fórmula FAO, 2–4 min, DR 1,8–2,6, control de contraste.
- **Mike Ware, *CyanoWork* (PDF, 2009)** — https://www.mikeware.co.uk/downloads/CyanoWork.pdf — receta, tiempos, baños de virado, concentraciones.
- **Mike Ware, *A Blueprint for Conserving Cyanotypes*** — https://resources.culturalheritage.org/pmgtopics/2003-volume-ten/10_02_Ware.html — Tabla 4 de rangos de densidad, curvas, canal rojo, oxidación.
- **Mike Ware, *Cyanomicon* (PDF, 2014)** — https://www.mikeware.co.uk/downloads/-Cyanomicon.pdf — nomenclatura de color Methuen, historia, química.
- **Turner, Parisi, Downs, Lynch (2014), *From ultraviolet to Prussian blue*** — https://doi.org/10.1039/c4pp00166d — respuesta espectral del cianotipo.
- **Kirby & Saunders (2004), *Fading and Colour Change of Prussian Blue*** — https://www.nationalgallery.org.uk/media/15510/kirby_saunders2004.pdf — absorción 690–730 nm, reflectancia 455–475 nm.
- **Bolton et al. (2011), NIST** — https://tsapps.nist.gov/publication/get_pdf.cfm?pub_id=904114 — rendimiento cuántico del ferrioxalato.
- **Christina Z. Anderson, *Papers for traditional / classic cyanotype*** — https://www.alternativephotography.com/papers-for-traditional-classic-cyanotype-process-1613-research-for-free/ — 100+ papeles, tiempos, criterios.
- **National Science and Media Museum, *Introduction to the cyanotype process*** — https://blog.scienceandmediamuseum.org.uk/introduction-cyanotype-process/ — tiempos, H₂O₂ 3 %, virados gálico/tánico.
- **Jacquard, instrucciones (PDF vía Dick Blick)** — https://www.dick-blick.com/items/013/21/Cyanotpe-Detailed-Instructions.pdf — sol 1–30 min, bronceado, sobreexposición preferible.

### Fuentes de práctica y medición (keep, con cautela)

- **Koraks, *Opposites attract – Salted paper and cyanotype curves*** — https://tinker.koraks.nl/photography/opposites-attract-salted-paper-and-cyanotype-curves/ — **la mejor medición pública de curva y Lab de Dmax que he encontrado**.
- **Calibration Flow, *Calibrating a cyanotype*** — https://calibrationflow.com/en/cyanotype-calibration — Dmax 1,4 / 1,55, deriva del 8–12 % a 1 h. Fuente comercial: confianza media-baja.
- **cyanocodex** (varias páginas) — https://cyanocodex.com/en/supplies/uv-lamp/ ; https://cyanocodex.com/en/troubleshooting/bronzing/ ; https://cyanocodex.com/en/chemistry/ — resúmenes con citas; úsalos como índice, no como prueba primaria.
- **Michelle Vine, *Toning Cyanotype Prints*** — https://michellevine.com/wp-content/uploads/2019/06/Toning-Cyanotype-Prints.pdf — esquema blanqueo + tanino.
- **jorj.org, *The Colors of Cyanotype*** — https://jorj.org/photo/3071 — comparación práctica de blanqueos.
- **Florence Jalice, *Is it raining?*** — https://www.florencejalice.com/post/it-s-raining-head-to-the-kitchen — té/café, tonos.
- **AlternativePhotography, *Multi colored cyanotypes*** — https://www.alternativephotography.com/multi-colored-cyanotypes/ — pirogálico → marrón rojizo.

### Rechazadas / despriorizadas

- **frameandfocal.com, *Cyanotype Adobe House*** — artículo de 2026 con cifras Lab y afirmaciones de industria no verificables; parece generado y no cita fuentes primarias. Descartado.
- **deckarts.com, *Prussian Blue: History of the Pigment*** — blog comercial; datos redundantes con ColourLex y Kirby & Saunders. Descartado.
- **foros (Photrio, Reddit, Film & Darkroom)** — usados sólo como pistas; no como evidencia. El hilo de Photrio sobre curvas de sensibilidad devolvió 403 y no se pudo verificar.
- **Cyanomicon completo** — sólo se pudo extraer las primeras 100 páginas; las secciones de espectroscopía (Apéndice II.5) y fotometría (Apéndice III) quedan fuera de este informe.

---

## 9. Contradicciones

1. **Banda de absorción en 500–550 nm.** El enunciado de partida la da por existente; **no he encontrado ninguna fuente primaria que la describa**. Kirby & Saunders documentan la banda IVCT en 690–730 nm y un máximo de reflectancia en 455–475 nm. Puede haber una confusión con la *ventana* de reflectancia o con la cola de la banda roja. **No modelar una banda de 500–550 nm como hecho.**
2. **Dmax.** Ware tabula rangos de densidad inicial de 0,35–1,20 (canal rojo) para distintas fórmulas; la práctica moderna reporta Dmax de 1,4–1,55 en papeles concretos. No es contradicción real: Ware mide con cuñas y fórmulas históricas; los valores modernos son con recubrimiento y papel específicos. **Usar 1,3–1,5 como rango de simulación y exponerlo como parámetro.**
3. **Pico espectral.** La comunidad repite "365 nm"; el único estudio revisado mide el máximo en 300–330 nm. Ambas cosas son compatibles (365 nm está dentro de la banda útil), pero **no debe escribirse "pico = 365 nm"**.
4. **Velocidad del nuevo cianotipo.** Ware dice 2–4 min frente a 20–30 min del clásico (~10×); cyanocodex dice "unas ocho veces más rápido" citando a Ware. Diferencia menor de factor; usar 5–10× como rango.
5. **a\* positivo en Dmax.** La medición de Koraks da a\* = +2,08; la intuición dice que un azul debería tener a\* negativo. No he encontrado una segunda medición que lo confirme o desmienta. **Tratar como valor de un solo espécimen.**

## 10. Evidencia faltante

- **Curva Lab completa** (L\*, a\*, b\* por escalón) de un cianotipo: no publicada en abierto que haya encontrado. Es el dato que más mejoraría el simulador.
- **Gamma / contraste medido** con unidades trazables: no encontrado; sólo el ISO-R ≈ 100 de Koraks.
- **Espectro de reflectancia completo** de una copia de cianotipo (400–700 nm, 10 nm): no publicado en abierto; sólo de pigmento en polvo o en pintura.
- **Colorimetría de los virados**: no hay valores Lab publicados; las direcciones de la sección 5 son estimaciones.
- **Dependencia del color con el papel**: hay descripciones cualitativas (Anderson) pero no mediciones.
- **Cinética de oxidación** (densidad vs tiempo cada hora): sólo los puntos 1 h / 24 h / 5 días.
- **Acceso al texto completo de Turner et al. 2014**: la curva de respuesta espectral está detrás de un muro de pago; sólo he verificado resumen y citas secundarias.

---

# MODELO MATEMATICO PROPUESTO

Modelo para simular una copia de cianotipo a partir de una imagen de entrada en escala de grises. Está pensado para implementarse en JavaScript sin dependencias y para calibrarse con una cuña escalonada real.

## 9.1. Pipeline

```
gris lineal g (0 = negro, 1 = blanco)
   │
   ├─(1) densidad del negativo       D_neg = D_min + (D_max − D_min)·(1 − g)
   │
   ├─(2) dosis relativa              E = 10^(D_ref − D_neg) · k_exp
   │
   ├─(3) curva característica        d = PCHIP(log10 E) → 0..1
   │
   ├─(4) pérdida en el lavado        d ← d · (1 − p_lavado·(1 − d))
   │
   ├─(5) oxidación                   c = d · (1 − e^(−t/τ))
   │
   ├─(6) color                      Lab = PCHIP(c; anclas)
   │
   ├─(7) papel + textura            Lab_final = mezcla(Lab, Lab_papel, c) + textura
   │
   └─(8) virado (opcional)          Lab_final = rotar_tono(Lab_final, params)
```

## 9.2. Parámetros

### Química y exposición

| Símbolo | Descripción | Clásico | Nuevo | Unidad | Origen |
|---|---|---|---|---|---|
| `D_min_neg` | Densidad mínima del negativo | 0,15 | 0,15 | logD | [M] |
| `D_max_neg` | Densidad máxima del negativo | 1,25 | 2,30 | logD | [D] Ware |
| `D_ref` | Densidad de referencia (la que imprime tono medio) | 0,65 | 1,20 | logD | [M] |
| `k_exp` | Factor de exposición (calibración fina) | 1,0 | 1,0 | — | [M] |
| `D_max_img` | Densidad máxima de la imagen | 1,40 | 1,55 | D rojo | [D] |
| `perdida_lavado` | Fracción de densidad perdida en el lavado | 0,50 | 0,08 | — | [D] Ware |

### Color (anclas Lab)

| `c` | L\* | a\* | b\* | Origen |
|---|---|---|---|---|
| 0,00 | 96,0 | 0,5 | 4,0 | [M] papel blanco cálido |
| 0,15 | 88,0 | −5,0 | −8,0 | [M] |
| 0,30 | 82,0 | −7,0 | −12,0 | [M] |
| 0,55 | 62,0 | −8,0 | −22,0 | [M] |
| 0,80 | 42,0 | −4,0 | −26,0 | [M] |
| 1,00 | **25,8** | **2,1** | **−26,7** | [D] Koraks (medido) |

Variantes de papel (sólo cambia el ancla `c = 0` y el desplazamiento de a\*):

| Papel | L\* | a\* | b\* | Origen |
|---|---|---|---|---|
| Blanco brillante | 97,0 | 0,0 | 2,0 | [M] |
| Algodón neutro | 96,0 | 0,5 | 4,0 | [M] |
| Crema | 94,0 | 0,5 | 10,0 | [M] |
| Reciclado cálido | 92,0 | 1,0 | 14,0 | [M] |

### Oxidación

| Símbolo | Descripción | Valor | Unidad | Origen |
|---|---|---|---|---|
| `tau_ox` | Constante de tiempo de oxidación | 4,0 | h | [M] ajustado a "~24 h para el 99 %" |
| `t_ox` | Tiempo desde el lavado | 0…168 | h | — |
| `boost_H2O2` | Avance equivalente del peróxido | +24 | h | [D] efecto inmediato |

## 9.3. Curva característica

**Recomendación: PCHIP** (interpolación cúbica monótona de Hermite) sobre una tabla de anclas `(logE, d)` con `d` normalizada 0–1. Garantiza monotonía, no oscila y se implementa en ~25 líneas de JavaScript.

Puntos de tabla sugeridos para el clásico (logE relativo, d normalizada):

```
[-2.0, 0.02] [-1.2, 0.06] [-0.6, 0.18] [0.0, 0.45]
[ 0.5, 0.72] [ 0.9, 0.88] [ 1.3, 0.96] [ 2.0, 0.99]
```

Para el nuevo cianotipo, estirar horizontalmente ×2,2 y suavizar toe/hombro:

```
[-3.0, 0.02] [-2.0, 0.07] [-1.2, 0.20] [-0.4, 0.42]
[ 0.3, 0.64] [ 1.0, 0.82] [ 1.7, 0.93] [ 2.6, 0.98]
```

Estas tablas son **[M]**, derivadas de la forma descrita por Koraks y del rango de Ware; deben recalibrarse con una cuña real. El parámetro `gamma` no se usa para dibujar la curva, sino para **verificarla**: debe ser la pendiente máxima de la PCHIP en D por década (objetivo 1,1–1,3 clásico; 0,9–1,0 nuevo).

**Alternativa analítica (sólo para visualización):** sigmoide de dos lados

```
S(u) = 0.5·exp(u/L_toe)              para u ≤ 0
S(u) = 1 − 0.5·exp(−u/L_shoulder)    para u > 0
```

Es continua en `u = 0`, con pendiente `0.5/L_toe` a la izquierda y `0.5/L_shoulder` a la derecha. Multiplicando por el rango de densidad `R = Dmax − Dmin`: `γ_toe = R/(2·L_toe)` y `γ_shoulder = R/(2·L_shoulder)`. **Aviso:** comprime la escala (la zona cuasi-lineal es corta), así que sirve para prototipar, no para calibrar.

## 9.4. Color

### Modo perceptual (recomendado)

Interpolar L\*, a\*, b\* con PCHIP sobre las anclas de la tabla 9.2. Es robusto, monótono y produce directamente sRGB.

```js
function labDesdeCobertura(c, anclas) {
  const xs = anclas.map(a => a.c);
  const L  = pchip(c, xs, anclas.map(a => a.L));
  const A  = pchip(c, xs, anclas.map(a => a.a));
  const B  = pchip(c, xs, anclas.map(a => a.b));
  return [L, A, B];
}
```

### Modo físico (opcional, para realismo espectral)

Modelo de absorbancia de dos bandas sobre el papel:

```js
// k(λ): coeficiente de absorción efectivo del pigmento
// Banda principal IVCT: 700 nm, ancha (sigma ~60 nm)
// Banda secundaria azul-violeta: ~430 nm, débil (NO verificada, [I])
function k(lambda, c) {
  const g1 = gauss(lambda, 700, 60);
  const g2 = gauss(lambda, 430, 35);
  return c * (1.00 * g1 + 0.25 * g2 + 0.02); // +0.02 = absorción mínima de base
}

// Reflectancia de la copia (Kubelka-Munk simplificado, una constante)
function reflectancia(lambda, c, R_papel) {
  return R_papel[lambda] * Math.exp(-2 * k(lambda, c));
}
```

Con esta fórmula, la reflectancia máxima debe caer en **455–475 nm** y el mínimo en **690–730 nm** ([D] Kirby & Saunders). Si el modelo no reproduce esos dos extremos, los parámetros están mal.

**Conversión Lab → sRGB** (CIE 1931, D65, 2°):

```js
function labToSrgb(L, a, b) {
  const fy = (L + 16) / 116;
  const fx = fy + a / 500;
  const fz = fy - b / 200;
  const X = 0.95047 * invF(fx);
  const Y = 1.00000 * invF(fy);
  const Z = 1.08883 * invF(fz);
  let r  =  3.2406*X - 1.5372*Y - 0.4986*Z;
  let g  = -0.9689*X + 1.8758*Y + 0.0415*Z;
  let bl =  0.0557*X - 0.2040*Y + 1.0570*Z;
  return [r, g, bl].map(gamma);
}
function invF(t) { return t**3 > 0.008856 ? t**3 : (t - 16/116) / 7.787; }
function gamma(v) {
  v = Math.max(0, Math.min(1, v));
  return v <= 0.0031308 ? 12.92*v : 1.055*Math.pow(v, 1/2.4) - 0.055;
}
```

**Valores de control (calculados con este modelo):**

| c | Lab | sRGB | Hex |
|---|---|---|---|
| 0,00 | (96, 0,5, 4) | 248, 243, 236 | `#F8F3EC` |
| 0,30 | (82, −7, −12) | 177, 209, 226 | `#B1D1E2` |
| 0,55 | (62, −8, −22) | 106, 156, 188 | `#6A9CBC` |
| 1,00 | (26, 2, −27) | 28, 63, 102 | `#1C3F66` |

## 9.5. Papel y textura

```js
// Mezcla con el papel: la cobertura no es lineal porque el pigmento
// se deposita en las fibras, no como una capa opaca.
const alpha = Math.pow(c, 0.85);                      // [M]

// Textura: ruido de baja frecuencia (moteado) + grano de fibra
const moteado = fbm(x * 0.02, y * 0.02, 4) * 0.03;    // ±3 L*
const fibra   = (Math.random() - 0.5) * 0.015;        // ±1,5 L*
const dL      = (moteado + fibra) * (1 - 0.5 * c);

// Bordes de pincel: caída suave en el perímetro del área recubierta
const borde = smoothstep(0, 0.03, distAlBorde(x, y));
```

## 9.6. Oxidación

```js
// La cobertura sigue una cinética de primer orden hacia el valor final.
const fOx = 1 - Math.exp(-(t_horas + boost_H2O2) / tau_ox);
const c_ox = c_final * fOx;
// Con tau = 4 h: 63 % a las 4 h, 95 % a las 12 h, 99,8 % a las 24 h.
```

**Calibración:** a `t = 1 h` el modelo debe dar un 8–12 % menos de densidad en altas luces que a `t = 24 h` ([D] Calibration Flow, confianza media-baja). Ajustar `tau_ox` para cumplirlo.

## 9.7. Virados

```js
// Transformación en Lab: rotación de tono + cambio de croma y luminosidad
function virar(L, a, b, p) {
  const h  = Math.atan2(b, a);                        // radianes
  const C  = Math.hypot(a, b);
  const h2 = h + (p.deltaH_deg * Math.PI / 180);
  const C2 = C * p.factorC;
  const L2 = L + p.deltaL;
  return [L2, C2 * Math.cos(h2), C2 * Math.sin(h2)];
}
```

Parámetros de virado (aproximados, [M] — ver sección 5):

| Virado | `deltaH_deg` | `factorC` | `deltaL` |
|---|---|---|---|
| Tánico | +95 (hacia 40°) | 1,5 | −6 |
| Té negro | +110 | 1,3 | −3 |
| Café | +80 | 1,1 | −2 |
| Pirogálico | +70 | 1,4 | −3 |
| TSP | +150 | 1,8 | +15 |
| Plomo | +20 | 1,2 | 0 |
| Níquel | −30 | 0,9 | 0 |

## 9.8. Avisos de fallo

```js
function diagnosticos(E, c, papel) {
  const avisos = [];
  if (E < 0.35)  avisos.push("SUBYEXPOSICIÓN: las altas luces se perderán en el lavado");
  if (E > 4.0)   avisos.push("SOBREEXPOSICIÓN: sombras tapadas, sin detalle");
  if (E > 12.0)  avisos.push("SOLARIZACIÓN: las sombras se invertirán a gris azulado durante la exposición");
  if (papel.tamponado) avisos.push("PAPEL ALCALINO: el azul se perderá total o parcialmente");
  if (c > 0.95)  avisos.push("Sombras 'bulletproof': el hombro de la curva ya está saturado");
  return avisos;
}
```

Umbrales **[M]**: 0,35× y 4× son estimaciones de taller; 12× corresponde al régimen en que Ware describe la inversión a blanco de Prusia con sensibilizador en exceso ([Ware, conservación](https://resources.culturalheritage.org/pmgtopics/2003-volume-ten/10_02_Ware.html)).

## 9.9. Pseudocódigo completo

```js
export function simularCianotipo(gris, opts = {}) {
  const q = Object.assign({
    quimica: 'clasica',
    D_min_neg: 0.15, D_max_neg: 1.25, D_ref: 0.65, k_exp: 1.0,
    D_max_img: 1.40, perdida_lavado: 0.50,
    tabla: TABLA_CLASICA,            // {x:[logE...], y:[d...]}
    anclas: ANCLAS_LAB,              // [{c,L,a,b}, ...]
    papel: { L: 96, a: 0.5, b: 4, tamponado: false },
    t_oxidacion_h: 24, boost_H2O2: 0, tau_ox: 4,
    virado: null
  }, opts);

  // 1-2. densidad del negativo y dosis relativa
  const Dneg = q.D_min_neg + (q.D_max_neg - q.D_min_neg) * (1 - gris);
  const E = q.k_exp * Math.pow(10, q.D_ref - Dneg);
  const u = Math.log10(E);

  // 3. curva característica -> cobertura latente 0..1
  let d = pchip(u, q.tabla.x, q.tabla.y);
  d = Math.max(0, Math.min(1, d));

  // 4. pérdida en el lavado: afecta sobre todo a las densidades bajas
  d *= (1 - q.perdida_lavado * (1 - d));

  // 5. oxidación: la cobertura efectiva tiende a la final con constante tau
  const fOx = 1 - Math.exp(-(q.t_oxidacion_h + q.boost_H2O2) / q.tau_ox);
  const c = d * fOx;

  // 6. color Lab por anclas
  let [L, A, B] = labDesdeCobertura(c, q.anclas);

  // 7. papel: mezcla + textura
  const alpha = Math.pow(c, 0.85);
  L = q.papel.L * (1 - alpha) + L * alpha;
  A = q.papel.a * (1 - alpha) + A * alpha;
  B = q.papel.b * (1 - alpha) + B * alpha;
  L += textura(x, y, c);

  // 8. virado
  if (q.virado) [L, A, B] = virar(L, A, B, q.virado);

  return { rgb: labToSrgb(L, A, B), lab: [L, A, B], avisos: diagnosticos(E, c, q.papel) };
}
```

## 9.10. Validación

El modelo debe cumplir estas comprobaciones antes de considerarse calibrado:

| Comprobación | Objetivo | Fuente del objetivo |
|---|---|---|
| Dmax en Lab | (26 ± 3, 2 ± 3, −27 ± 3) | [Koraks](https://tinker.koraks.nl/photography/opposites-attract-salted-paper-and-cyanotype-curves/) |
| Reflectancia máxima (modo físico) | 455–475 nm | [Kirby & Saunders](https://www.nationalgallery.org.uk/media/15510/kirby_saunders2004.pdf) |
| Absorción máxima (modo físico) | 690–730 nm | ídem |
| Rango tonal clásico | ~0,9–1,2 logD | [Ware](https://www.mikeware.co.uk/mikeware/Traditional_Cyanotype.html) |
| Rango tonal nuevo | 1,8–2,4 logD | ídem |
| Deriva 1 h vs 24 h | 8–12 % en altas luces | [Calibration Flow](https://calibrationflow.com/en/cyanotype-calibration) |
| Progresión de tono | cian (h≈236°) → azul-violeta (h≈274°) | [M] a partir de las anclas |

**Limitación principal:** las anclas de altas luces y medios son inferencias, no mediciones. La primera mejora que debería hacerse es imprimir una cuña de 21 pasos, medirla con espectrofotómetro a las 24 h y sustituir las anclas por los valores medidos.

---

*Fin del documento. Todas las cifras sin URL están marcadas como [M] (modelo) o [UNVERIFIED].*
