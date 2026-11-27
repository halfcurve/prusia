# Epson EcoTank ET-2865 — Negativos digitales para cianotipia

> Investigación cerrada el 2026. Fuentes primarias: datasheet y manual oficial de Epson, lista de correo alt-photo-process-l (mediciones densitométricas reales), Mike Ware, Clay Harmon.
> Convención: **UNVERIFIED** = no encontrado en fuente primaria; **INFERENCIA** = deducción propia, no afirmada por la fuente.

---

## 0. Veredicto en 6 líneas

1. El ET-2865 es **4 tintas de colorante (dye)**, sin negro pigmentado, sin negro claro, sin canal matte. Resolución nominal 5760×1440 dpi, A4 máximo.
2. Para cianotipia **no se imprime en gris ni en negro solo**: en dye el negro aislado rinde ~1,05 de densidad UV y el compuesto de color ~1,8. Se imprime **en color**, con un compuesto amarillo-dominante.
3. Techo realista de densidad UV del negativo: **≈1,8–2,0** sobre film OHP (medido en un dye Epson comparable). Suficiente para cianotipo clásico (DR 1,0–1,5), **justo o insuficiente** para New Cyanotype (DR 1,8–2,4).
4. El driver **no tiene tipo de papel "Transparency/OHP"**: hay que declarar un papel mate y cargar el film.
5. El límite práctico no es la resolución: es que **por encima de ~60 % de cobertura la tinta dye resbala sobre Pictorico**.
6. La escala 1:1 se garantiza desactivando "Scale to fit paper size" y **verificando con una línea de calibración medida con pie de rey** — no hay ajuste de "dpi nativo" que lo garantice.

---

## 1. Hardware ET-2865 (hechos verificados)

| Dato | Valor | Fuente |
|---|---|---|
| Tecnología | Epson Micro Piezo, Heat-Free | [Epson UK — Tech Specs](https://www.epson.co.uk/en_GB/products/printers/inkjet/consumer/ecotank-et-2865-a4-multifunction-wi-fi-ink-tank-printer,-with-up-to-3-years-of-ink-included/p/41749) |
| Tintas | **4: Black [Dye], Cyan [Dye], Yellow [Dye], Magenta [Dye]** | ídem |
| Tipo de tinta | **Dye Ink** (explícito en "Ink Technology") | ídem |
| Serie / código | **Epson 104** (no 664). Botellas 65 ml. SKU equipo: C11CJ67433. Códigos: C13T00P140 (Bk), …240 (C), …340 (M), …440 (Y) | [Datasheet PDF](https://www.printer4you.com/media/datasheet/epson-ecotank-et-2865-200epgo-et-2865_en.pdf); [Epson 104](https://www.epson.co.uk/en_GB/products/ink-and-paper/ink-consumables/104-ecotank-ink-series/p/22808) |
| Inyectores | **180 negro / 59 por color** | [Epson UK](https://www.epson.co.uk/en_GB/products/printers/inkjet/consumer/ecotank-et-2865-a4-multifunction-wi-fi-ink-tank-printer,-with-up-to-3-years-of-ink-included/p/41749); [Manual ET-2860, Printer Specifications](https://download4.epson.biz/sec_pubs/et-2860_series/useg/en/GUID-AEBB5B1F-E5D5-480D-A6ED-FB3246E6F417.htm) |
| Resolución máx. | **5760 × 1440 dpi** (nominal; ver §5) | ídem |
| Gota mínima | **3 pl** — solo en agregador de precios, Epson no lo publica para este modelo → **UNVERIFIED / confianza baja** | [PriceSpy ET-2860](https://pricespy.co.uk/product.php?p=13288333) |
| Área máx. | **A4 = 210 × 297 mm**. Formatos: A5, A4, A6, B5, B6, C6, DL, Nº10, 9×13, 10×15, 13×20 cm | [Datasheet](https://www.printer4you.com/media/datasheet/epson-ecotank-et-2865-200epgo-et-2865_en.pdf) |
| Márgenes | **3,0 mm** laterales (sin bordes solo hasta 10×15 cm) | [Printable Area](https://download4.epson.biz/sec_pubs/et-2860_series/useg/en/GUID-E28BA294-305C-4F5A-92E9-B818FAC7423F.htm) |
| Alimentación | **Trasera, 100 hojas** (única bandeja). Salida 30 hojas. Sin ruta recta | [Epson UK](https://www.epson.co.uk/en_GB/products/printers/inkjet/consumer/ecotank-et-2865-a4-multifunction-wi-fi-ink-tank-printer,-with-up-to-3-years-of-ink-included/p/41749) |
| Gramaje admitido | **64–300 g/m²** (Epson advierte: "third party media may not be compatible") | ídem |
| Grosor máx. | **No publicado en mm** → **UNVERIFIED**. El manual solo da g/m² y prohíbe "papers that are too thick or too thin" | [Unavailable Paper Types](https://download4.epson.biz/sec_pubs/et-2860_series/useg/en/GUID-B8CCBC55-7A06-4AE8-A426-7B2B9C3C3802.htm) |
| Dimensiones / peso | 375 × 347 × 179 mm / 3,9 kg | [Datasheet](https://www.printer4you.com/media/datasheet/epson-ecotank-et-2865-200epgo-et-2865_en.pdf) |
| AirPrint / Mopria | **NO**. Solo Epson Smart Panel / Epson Connect (Email Print, Remote Print Driver) | [Epson UK](https://www.epson.co.uk/en_GB/products/printers/inkjet/consumer/ecotank-et-2865-a4-multifunction-wi-fi-ink-tank-printer,-with-up-to-3-years-of-ink-included/p/41749); [Druckerchannel](https://www.druckerchannel.de/artikel.php?ID=4966&t=epson_ecotank_et_2870_und_et_2860_serie) |
| Duplex | Manual | ídem |

**La gama ET-2860 la forman ET-2860 / 2861 / 2862 / 2864 / 2865: hardware idéntico, solo cambia el acento azul.** Fuente: [Druckerchannel, 17-01-2024](https://www.druckerchannel.de/artikel.php?ID=4966&t=epson_ecotank_et_2870_und_et_2860_serie).

### 1.1 Tipos de papel seleccionables en el driver

Lista oficial del manual de la serie (tabla "List of Paper Type"):

| Media Type del driver | Papel Epson asociado |
|---|---|
| Plain paper | Epson Bright White Ink Jet Paper |
| Epson Ultra Glossy | Ultra Glossy Photo Paper |
| Epson Premium Glossy | Premium Glossy Photo Paper |
| Epson Premium Semigloss | Premium Semigloss Photo Paper |
| Photo Paper Glossy | Epson Photo Paper Glossy |
| **Epson Matte Paper-Heavyweight** | Epson Matte Paper-Heavyweight |

Fuente: [List of Paper Type — ET-2860 series](https://download4.epson.biz/sec_pubs/et-2860_series/useg/en/GUID-223AB2C5-12EC-494C-A420-18D218F4F07B.htm).

En el gemelo norteamericano **ET-2800** (misma familia) la lista del driver es: Plain paper, Envelope, Ultra Premium Photo Paper Glossy, Premium Photo Paper Glossy, Photo Paper Glossy, Premium Photo Paper Semi-Gloss, **Presentation Paper Matte**, **Premium Presentation Paper Matte**. Fuente: [Epson US FAQ ET-2800](https://epson.com/faq/SPT_C11CJ66202~faq-00007ff-et2800_2803).

Conclusiones prácticas:

- **Sí existe** un tipo mate de alto consumo de tinta: `Epson Matte Paper-Heavyweight` (UE) ≡ `Presentation Paper Matte` (US). Es el que hay que usar.
- **NO existe** `Premium Presentation Paper Matte` en la lista europea de esta serie (sí en la US del ET-2800). No cuentes con ella → **UNVERIFIED para ET-2865 UE**, probablemente ausente.
- **NO existe** `Photo Quality Inkjet Paper` en la lista de esta serie (era de modelos Stylus Photo). **UNVERIFIED / probablemente ausente**.
- **NO existe ningún tipo "Transparency", "OHP film" ni "Ink Jet Transparencies"** en el driver de esta familia. Confirmado por ausencia en la lista oficial y en la FAQ US. → **Hay que declarar papel mate y cargar film.**
- Consecuencia: el driver nunca sabrá que imprimes sobre film. Aplicará la curva y el límite de tinta del papel mate. Ver §4.

### 1.2 Contradicción sobre el negro (importante)

- El datasheet del ET-2865 dice literalmente **"Black [Dye]"**.
- Druckerchannel (review técnico independiente) dice: *"Es gibt weiterhin weder pigmentiertes Schwarz …"* y *"180 Düsen für Dyeschwarz"*.
- **Pero** la página genérica de Epson 104 afirma: *"The combination of dye colours and **pigment black** inks…"* ([Epson 104](https://www.epson.co.uk/en_GB/products/ink-and-paper/ink-consumables/104-ecotank-ink-series/p/22808)).

**Interpretación (INFERENCIA):** el texto de la serie 104 es copy genérico que cubre modelos con negro pigmentado (ET-4800 y similares) que comparten botella. Para el ET-2865 mandan el datasheet del modelo y el despiece técnico: **negro dye**. Confianza alta, pero conviene **verificarlo empíricamente** (ver §6).

---

## 2. De qué color hay que imprimir el negativo (y por qué)

### 2.1 Sensibilidad espectral del cianotipo

- Rango útil: **300–400 nm** (UVA). Fuente: [Wikipedia — Cyanotype](https://en.wikipedia.org/wiki/Cyanotype) (cita la formulación estándar).
- **Por encima de ~420–430 nm el efecto es casi nulo.** Fuente: [Mike Ware, Cyanomicon II](https://www.mikeware.co.uk/downloads/Cyanomicon_II.pdf).
- El único estudio revisado por pares que mide respuesta monocromática (Turner, Parisi et al., *Photochem. Photobiol. Sci.* 2014, DOI 10.1039/C4PP00166D) encuentra la **mayor sensibilidad en el UV más corto ensayado (300–330 nm), decreciendo al aumentar λ**. Fuente: [Springer](https://link.springer.com/article/10.1039/c4pp00166d) — **caveat:** el resumen accesible no publica la curva completa; la lectura "pico 300–330 nm" proviene de resúmenes secundarios ([cyanocodex](https://cyanocodex.com/en/journal/cyanotype-myths/)), tratados aquí como **interpretación**, no evidencia directa.
- **Consecuencia operativa:** el negativo debe bloquear bien **350–430 nm**. El mito "365 nm es el pico exacto" no está demostrado; lo seguro es que 365 nm funciona mejor que 395–405 nm a igual energía.

### 2.2 Datos medidos de densidad UV por tinta

La única tabla densitométrica UV pública y completa que he localizado para un Epson de inyección es de **Clay Harmon, Epson 2200 (UltraChrome pigmentado)**, densidad de transmisión UV a coberturas crecientes:

| % cobertura | K | Y | C | M | LK |
|---|---|---|---|---|---|
| 5 % | 0,26 | 0,25 | 0,19 | 0,15 | 0,20 |
| 50 % | 1,63 | 1,30 | 0,66 | 0,39 | 0,72 |
| **100 %** | **2,93** | **2,08** | **0,98** | **0,59** | **1,25** |

Fuente: [Clay Harmon, QTR2200InkLimitTest](https://clayharmonblog.com/img/QTR2200InkLimitTest.xls.pdf).

Lectura directa: **amarillo bloquea el UV ~3,5× más que el magenta y ~2× más que el cian**. El negro es el mejor, pero el amarillo es el mejor *color*.

Harmon encontró además el **óptimo cromático medido** para ese equipo: **R:64 G:128 B:0** (un oliva/verde oscuro) — es decir, en términos sustractivos **Y 100 %, M ≈50 %, C ≈75 %**. Fuente: [The Color Ratio Method, AlternativePhotography](https://www.alternativephotography.com/digital-negatives-color-ratio/).

### 2.3 Por qué: explicación física

- Un colorante **amarillo absorbe en 400–480 nm** (su banda de absorción está en el azul-violeta). Por eso es el que más se solapa con la cola útil del cianotipo (400–430 nm) **y** con 365 nm.
- Un colorante **cian absorbe en 600–700 nm** (rojo) y **transmite azul y UV**: es el peor bloqueador UV posible. Coincide con el dato medido (0,98).
- Un colorante **magenta absorbe en 500–580 nm** (verde) y deja pasar azul y rojo: bloqueo UV aún menor (0,59).
- El **negro dye** de un EcoTank no es negro de carbono: suele ser una mezcla de colorantes, y en el UV-profundo tiene ventanas de transmisión. Por eso **no** rinde como el negro pigmentado. *(Explicación física = interpretación del investigador; el dato duro es la comparativa medida en §2.4.)*

### 2.4 Lo que cambia al pasar de pigmento a dye (dato clave)

Sandy King midió un **Epson 1400 con tintas Claria (dye)** frente a un 3800 (pigmento), mismo fichero:

- Una densidad que en el 3800 lee **2,3 en UV**, en el 1400 dye lee **1,05**.
- Imprimiendo **en color (RGB)** en el 1400, la densidad máxima al UV sube a **≈1,8**.

Fuente: [alt-photo-process-l, 21-02-2007](http://altphotolist.org/lists/alt-photo-process-l/200702/msg00445.html) (reproduce el mensaje de King).

Conclusión: **en dye, imprimir en gris/negro solo tira densidad; hay que imprimir en color.** El salto de 1,05 → 1,8 es exactamente el argumento.

### 2.5 Contradicción registrada

Clay Harmon, mismo modelo 1400/Claria, 2009: *"anything over about 60 % ink on most of the colors will slide right off the Pictorico. But **60 % black ink has a UV density of 3.55**"*. Fuente: [alt-photo-process-l, 31-10-2009](http://www.altphotolist.org/lists/alt-photo-process-l/200910/msg00455.html).

Eso contradice el techo de 1,8 de King para el mismo motor. **Posible explicación (INFERENCIA):** Harmon medía con la página de separación de QTR (cobertura real por canal, sin gestión de color), King con el driver RGB del fabricante. No hay fuente que lo confirme. **No usar 3,55 como valor de diseño**; el valor conservador es 1,8–2,0.

### 2.6 Consenso alt-photo: negro puro vs compuesto CMY

- **Negro puro (K only)** es el estándar de oro **en impresoras pigmentadas** con QTR/Piezography, porque el negro pigmentado llega a Dmax UV >3,5. Fuente: [Sandy King, 2004](http://altphotolist.org/lists/alt-photo-process/2004/nov04/0640.htm).
- **Compuesto de color** es el estándar cuando hay pocas tintas o son dye: se elige el color que más UV bloquea y se modula su saturación para fijar el rango de densidad. Fuente: [Harmon, Color Ratio Method](https://www.alternativephotography.com/digital-negatives-color-ratio/); [Christina Z. Anderson & Ron Reeder, Digital negatives](https://www.alternativephotography.com/digital-negatives/).
- En Reeder & Anderson, **el amarillo es el segundo absorbedor UV tras el photo black**. Fuente: [Transparency film for cyanotype](https://cyanocodex.com/en/supplies/transparency-film/) (resumen que cita a Reeder & Anderson — fuente secundaria, **interpretación**).

### 2.7 RECOMENDACIÓN CONCRETA para el ET-2865 (4 dye, sin gris claro, sin matte)

1. **Modo: Color. Nunca Grayscale / "Black & White".**
2. **Colorizar el negativo** con un compuesto amarillo-dominante. Punto de partida (derivado del óptimo medido R64 G128 B0, **calibrado en pigmento, no en dye 104**):
   - `R = 64, G = 128, B = 0` → C≈75 %, M≈50 %, Y=100 %
   - Alternativa más robusta si el amarillo solo no llega: **Y 100 % + M 40–60 % + C 60–80 %** (mismo orden de magnitud).
3. **NO usar negro puro** ni "rich black" con K dominante: en dye el K aislado rinde muy por debajo del compuesto (§2.4).
4. **Modular densidad por saturación**, no por opacidad: mantén la *proporción* del color y varía su saturación para ajustar el DR (método Harmon). Un solo color + una sola curva sirve para todo el rango.
5. **Calibrar siempre**: imprime una cuña de 21 pasos con ese color a 6–8 saturaciones y elige la que dé densidad neta = DR del proceso. No hay tabla publicada para tintas 104.

> **Advertencia:** no existe ninguna medición pública de densidad UV de las tintas **Epson 104**. Toda la traslación desde los datos de 2200/1400 es **INFERENCIA**. Trátese como punto de partida a validar con densitómetro o con tira de exposición.

---

## 3. Receta exacta de driver (macOS)

### 3.1 Estructura del driver

El driver macOS de la serie expone, en el desplegable central del diálogo de impresión:

| Panel | Ajustes |
|---|---|
| **Print Settings** | Paper Source, **Media Type**, **Print Quality**, Borderless, Mirror Image |
| **Color Matching** | **EPSON Color Controls** vs **ColorSync** |
| **Color Options** | Advanced Settings → Brightness, Contrast, Saturation, **Gamma**, modo de color |
| **Paper Handling** | **Scale to fit paper size**, Destination Paper Size |
| **Layout** | Pages per Sheet |
| **Page Setup** (menú Archivo) | Paper Size, Orientation, **Scale %** |

Fuentes: [Manual ET-2860, "Printing from a Computer - Mac OS"](https://download.epson-europe.com/pub/download/6599/epson659964eu.pdf) (págs. 52–57); [Menu Options for Print Settings](https://download4.epson.biz/sec_pubs/et-m2120_series/useg/en/GUID-613B794D-3384-45C6-8F8A-D43F7857C3B3.htm); [Epson — Color Matching/Color Options](https://files.support.epson.com/pdf/l800__/l800__ug.pdf).

### 3.2 Receta por ajuste

| Ajuste | Valor | Motivo |
|---|---|---|
| **Media Type** | `Epson Matte Paper-Heavyweight` | Es el tipo mate con **mayor límite de tinta** de la lista; maximiza la deposición. `Plain paper` recorta tinta; los `Glossy` aplican límites y brillos pensados para foto. |
| **Print Quality** | **el más alto disponible** (`High` / `Best` / `Quality`, según firmware) | Más pasadas = más tinta y menos banding. **UNVERIFIED**: los nombres exactos de las opciones para ET-2865 no están publicados; varían por modelo ("Draft/Standard/High" o "Fast/Normal/Fine/Quality"). |
| **Color / Grayscale** | **Color** | Ver §2.4. Grayscale fuerza K → pierdes ~40 % de densidad UV. |
| **Color Matching** | **EPSON Color Controls** (nunca ColorSync) | ColorSync aplicaría el perfil del papel mate y **aclararía** el negativo. |
| **Color Options** | **Advanced Settings → sin tocar** Brillo/Contraste/Saturación. **Gamma: neutral (1.0 / centro)** | Cualquier gamma ≠ 1 desplaza los medios tonos. El Gamma del driver es tentador para "endurecer" el negativo: **no lo uses**, hazlo en Photoshop con curva, que es reversible. |
| **PhotoEnhance** | **DESACTIVADO** | Epson documenta que "analiza la ubicación del sujeto" y altera contraste, saturación y brillo de forma **no determinista**: si recortas o giras, cambia el color. Mortal para un negativo calibrado. Fuente: [Manual ET-2860 pág. 51/57](https://download.epson-europe.com/pub/download/6599/epson659964eu.pdf). |
| **Color Universal Print** | OFF | Solo aplica a Plain paper, pero comprueba que no esté activo. |
| **Emphasize Thin Lines** | OFF | Engorda líneas; altera la curva. |
| **High Speed** | **OFF** | Imprime bidireccional; produce banding vertical y micro-desregistro de pasadas. Epson: *"For Mac OS X, turn off the High Speed setting on the Advanced Settings window"*. Fuente: [Epson Troubleshooting](https://files.support.epson.com/htmldocs/pro48u/pro48urf/trble_1.htm). **UNVERIFIED**: no he confirmado que el driver del ET-2865 exponga "High Speed" con ese nombre; en varios EcoTank aparece como "Bidirectional printing" en *Options & Supplies → Options*. Compruébalo en ambos sitios. |
| **Borderless** | **OFF** | El borderless **reencuadra y amplía** para sangrar. Rompe la escala. |
| **Mirror Image** | OFF | |
| **Scale to fit paper size** | **OFF** | Ver §5. |
| **Page Setup → Scale** | **100 %** | |

### 3.3 Gotchas conocidos

1. **El driver aclara los negros.** Con ColorSync o con perfiles de papel mate, un negro compuesto se convierte en ~85 % de cobertura. Solución: Color Matching = EPSON Color Controls y curva propia.
2. **PhotoEnhance se reactiva** al cambiar de preset. Guarda un **Preset** con nombre ("Negativo Ciano") y verifícalo cada sesión.
3. **Banding bidireccional**: en estas carrocerías de 4 tintas con 59 inyectores por color el banding es visible a simple vista sobre film. High Speed OFF + calidad máxima + **Print Head Alignment** previo.
4. **Sin AirPrint**: si añades la impresora por AirPrint/Bonjour genérico, **pierdes Media Type y Print Quality** y el sistema imprime con el driver genérico. Hay que instalar el **Epson driver completo** y añadirla con *Add Other Printer or Scanner* eligiendo el driver Epson en "Use". Fuente: [Manual ET-2860, "Adding the Printer (for Mac OS Only)"](https://download.epson-europe.com/pub/download/6599/epson659964eu.pdf) pág. 81.
5. **La app puede reescalar por su cuenta** (Preview, Pages, Word). Imprime siempre desde Photoshop/Affinity/Lightroom con "Scale 100 %" y "Center".

---

## 4. Film OHP con tintas dye

### 4.1 Qué film funciona

| Producto | Estado | Notas |
|---|---|---|
| **Pictorico Pro/Ultra Premium OHP (TPS100)** | **Referencia** | 184 g/m², **5,7 mil (0,145 mm)**, base poliéster, recubrimiento microcerámico multicapa. **Compatible con dye o pigmento** ("works with dye or pigment inks such as Ultrachrome"). Fuentes: [Innova Art](https://innovaart.com/product/pictorico-ultra-premium-ohp-transparency-film-184gsm-ipf-121/); [Firstcall](https://firstcall-photographic.co.uk/products/innova-pictorico-pro-ohp-ultra-transparency-film-17-inch-roll-x-20m); [Brooklyn Editions](https://www.brooklyneditions.com/paper/pictorico-pro-ultra-premium-ohp-transparency-film). |
| **Fixxons** (film serigrafía "waterproof positive") | **Válido y mucho más barato** | Usado en la comunidad PiezoDN como alternativa; no es funcionalmente distinto del film "para procesos alternativos". Fuente: [Foro Piezography](https://forums.piezography.com/t/fixxons-non-silver-print-processes-film/1258); [Emma Powell, materiales](https://www.emmapowell.photo/digital-negative-materials). |
| **Film inkjet genérico / transparencias de oficina** | **NO** | Sin recubrimiento receptor la tinta dye **no seca**: charcos, moteado, emborronado. Fuente: [Koraks, "A litany of woes"](https://tinker.koraks.nl/photography/a-litany-of-woes-digital-inkjet-negatives-and-a-note-on-dot-gain-mottling/); [ScreenPrinters Help — Ink Running/Puddling](https://support.solutionsforscreenprinters.com/hc/en-us/articles/25909808825492-Ink-Running-Puddling-Too-Wet-or-Blurry-on-film). |

### 4.2 ¿Secan las tintas dye sobre OHP?

**Sí — sobre film recubierto.** El recubrimiento microporoso absorbe el vehículo y fija el colorante; el resultado es seco al tacto en decenas de segundos y resistente al agua. Sobre film **no recubierto**, no. Fuente: [ScreenPrinters Help](https://support.solutionsforscreenprinters.com/hc/en-us/articles/25909808825492-Ink-Running-Puddling-Too-Wet-or-Blurry-on-film) ("use a proper waterproof film… only one side has the emulsion layer that captures and holds the ink allowing it to dry fast").

**Lado correcto:** el recubrimiento está en **una sola cara**. Hay que imprimir con esa cara hacia el cabezal. Si no, "you have a mess at all resolutions". Fuente: ídem.

**Tiempo de secado práctico:** deja **≥10 min** antes de apilar; **≥30 min** antes de poner el negativo bajo el cristal en contacto directo. *(INFERENCIA basada en práctica; no he encontrado un dato de fabricante para dye sobre TPS100.)*

### 4.3 El límite real: ~60 % de cobertura

El techo no lo pone la resolución, lo pone la capacidad del recubrimiento:

> *"anything over about 60 % ink on most of the colors will slide right off the Pictorico"* — Clay Harmon, Epson 1400/Claria. [Fuente](http://www.altphotolist.org/lists/alt-photo-process-l/200910/msg00455.html)

Esto define la estrategia: **no se puede pedir 100 % de tinta en un color**. Hay que construir el Dmax **sumando canales al 50–70 %** (amarillo + magenta + cian), no saturando uno solo.

### 4.4 Dmax UV realista

| Escenario | Densidad UV estimada | Base |
|---|---|---|
| Dye, negro solo (driver RGB) | ~1,0–1,3 | King: 1,05 en verde; extrapolación |
| **Dye, compuesto de color** | **1,8** (medido) — diseñar con **1,8–2,0** | [King 2007](http://altphotolist.org/lists/alt-photo-process-l/200702/msg00445.html) |
| Pigmento, negro solo | 2,9–3,5+ | [Harmon](https://clayharmonblog.com/img/QTR2200InkLimitTest.xls.pdf); [King](http://altphotolist.org/lists/alt-photo-process/2004/nov04/0640.htm) |
| Densidad propia del film (velo + base) | **≈0,13 log** | King, Pictorico y Epson OHP ≈ 0,13 ([fuente](http://altphotolist.org/lists/alt-photo-process/2004/oct04/0255.htm)) |

**Densidad neta aprovechable ≈ 1,8 − 0,13 ≈ 1,67.**

### 4.5 ¿Basta 1,67 para cianotipia?

| Proceso | DR de negativo requerido (en UV) | ¿Alcanza? |
|---|---|---|
| **Cianotipo clásico** (ferricianuro + citrato férrico amónico) | rango corto: **1,0–1,5** | **Sí, con margen** |
| **New Cyanotype (Mike Ware)** | **"at least 1,8 and as much as 2,4"** | **No / al límite** |

Fuente de los DR: [Mike Ware, New Cyanotype — Siderotype Workshop Notes](https://www.mikeware.co.uk/downloads/CyanoWork.pdf); mismos valores para platino/paladio en [Malde & Ware](https://pradipmalde.com/platinotype-instructions/).

**Conclusión:** el ET-2865 **sirve para cianotipo clásico** y **es marginal para New Cyanotype**. Si el objetivo es New Cyanotype, el cuello de botella es el dye, no la impresora.

### 4.6 Cómo evitar moteado, marcas y curvatura

1. **Lado recubierto hacia el cabezal** (el error nº1).
2. **Cobertura ≤60–70 % por canal**; construir densidad por combinación.
3. **Pizza wheels**: las ruedas dentadas de salida dejan marcas sobre film brillante. Mitigación: dejar secar, o retirar la hoja manualmente en cuanto salga. Fuente: [Koraks](https://tinker.koraks.nl/photography/a-litany-of-woes-digital-inkjet-negatives-and-a-note-on-dot-gain-mottling/).
4. **Curvatura**: el ET-2865 no tiene ruta recta; el film de 0,145 mm curva y puede rozar el cabezal. Carga **de una hoja en una**, guía lateral ajustada, y guarda el film plano entre cartón. Epson lista "papers that are wavy" y "too thick" entre los **no admitidos**. Fuente: [Unavailable Paper Types](https://download4.epson.biz/sec_pubs/et-2860_series/useg/en/GUID-B8CCBC55-7A06-4AE8-A426-7B2B9C3C3802.htm).
   - *No he encontrado una opción "platen gap" / "Paper Thickness" en el driver de esta serie* → **UNVERIFIED**; probablemente no existe.
5. **Moteado por dot gain**: sobre film el punto crece más que sobre papel; a 60 % de cobertura conviene tramado fino y calidad máxima. Fuente: [Koraks](https://tinker.koraks.nl/photography/a-litany-of-woes-digital-inkjet-negatives-and-a-note-on-dot-gain-mottling/).
6. **No apilar recién impresos**: transferencia de tinta.

---

## 5. Escala 1:1 y la cuestión 360/720 dpi

### 5.1 La base técnica

- Los Epson de escritorio tienen resolución **nativa múltiplo de 360**: aparecen 360/720/1440/2880 en los ajustes porque la densidad física de inyectores es múltiplo de 360 por pulgada. Fuente: [Northlight Images — Epson ET-8500/8550 driver settings](https://www.northlight-images.co.uk/best-epson-et8500-8550-driver-settings/).
- El ET-2865 declara **5760 × 1440 dpi**, pero eso es resolución *direccionable* por microavance, no nativa. **UNVERIFIED**: Epson no publica la resolución nativa del cabezal de 180/59 inyectores para este modelo.
- A 720 dpi, **1 píxel = 0,0353 mm**. A 360 dpi, 0,0706 mm.

### 5.2 Problema real vs problema imaginario

**No he encontrado evidencia documentada de que el ET-2865 imprima a escala incorrecta por elegir 360 vs 720 dpi.** → **UNVERIFIED / probablemente falso**. Los errores de escala reales vienen de:

1. **`Scale to fit paper size` activado** (Paper Handling). Reescala al tamaño de destino. **Desactívalo.**
2. **Borderless activado**: amplía para sangrar. **Desactívalo.**
3. **A4 vs Letter**: si el documento es Letter (215,9 × 279,4 mm) y cargas A4, cualquier "fit" lo reescala un 3 %.
4. **Aplicación que reescala** (Preview "Scale to fit", Word "Ajustar al tamaño").
5. **Driver genérico / IPP Everywhere / driverless**. Documentado en un Epson L8180 (=ET-8550) bajo CUPS: el raster PWG se implementa mal y **no reproduce las opciones ni la geometría del driver nativo**; se recomienda AppleRaster. Fuente: [cups-filters issue #498](https://github.com/OpenPrinting/cups-filters/issues/498). Aplica al ET-2865 solo si lo usas por red con driverless → **interpretación**.

### 5.3 Procedimiento para garantizar 1:1

1. Documento a **210 × 297 mm exactos**, 720 ppi (o 360 ppi; da igual para la escala física, solo para el detalle).
2. `Page Setup → Scale: 100 %`, `Paper Size: A4`.
3. `Paper Handling → Scale to fit paper size: OFF`.
4. `Print Settings → Borderless: OFF`, `Media Type: Epson Matte Paper-Heavyweight`.
5. Imprime **una regla de calibración**: un rectángulo de 200,00 mm × 200,00 mm con marcas cada 10 mm.
6. Mide con pie de rey. Factor de corrección = 200 / medido. Si mides 199,4 mm, factor = 1,0030 → aplica ese 100,30 % en Page Setup **solo si el error es >0,3 mm** (por debajo es ruido del arrastre de papel).
7. Repite hasta que el error sea **<0,2 mm en 200 mm (0,1 %)**.

> El arrastre de rodillos de esta gama introduce variación de **±0,1–0,3 mm en A4** por deslizamiento, no corregible por software. Para cianotipia por contacto con registro esto es aceptable; para registro fino multicapa, **usa una plantilla de registro física**, no confíes en la escala del papel. *(INFERENCIA de práctica; sin fuente publicada para este modelo.)*

### 5.4 Nota sobre "resolución" y negativos

Para un negativo de contacto, **la resolución útil la fija el film, no el dpi**: el dot gain sobre recubrimiento microporoso embota detalles por debajo de ~0,1 mm. Imprimir a 5760 dpi no mejora nada frente a 1440; solo ralentiza y aumenta el riesgo de charco. **Recomendación: 1440 dpi de calidad máxima, no 5760.** *(INFERENCIA; coherente con el límite de ~60 % de cobertura.)*

---

## 6. Incertidumbres y contradicciones (leer antes de comprar/usar)

### Contradicciones registradas

1. **Negro dye vs pigmento en la serie 104.** El datasheet del ET-2865 dice dye; la página de producto 104 dice "pigment black". Ver §1.2.
2. **Dmax dye: 1,8 vs 3,55.** King (2007) vs Harmon (2009), mismo motor 1400/Claria. Ver §2.5.
3. **Pico espectral del cianotipo.** "365 nm" es folclore; el único estudio revisado da máximo en 300–330 nm y descenso monótono. No hay dato publicado por debajo de 300 nm ni curva completa accesible.

### Evidencia que falta

- **Densidad UV medida de las tintas Epson 104.** No existe publicada. Todo el §2.7 es traslación.
- **Gota mínima oficial del ET-2865.** Solo agregadores → 3 pl, confianza baja.
- **Grosor máximo en mm.** Epson solo publica 64–300 g/m².
- **Nombres exactos de las opciones de "Print Quality" en el driver macOS del ET-2865.** No publicados; varían por firmware.
- **Existencia de "High Speed" con ese nombre** en el driver macOS de este modelo.
- **Comportamiento del ET-2865 con film de 0,145 mm** en alimentación trasera: sin dato de fabricante; el manual desaconseja medios gruesos/curvados.

### Cómo cerrar las incertidumbres (2 tests, ~1 hora)

**Test A — ¿el negro es dye o pigmento?**
Imprime un parche 100 % K en papel mate normal y otro en film. Si en film **no seca y se emborrona**, es dye (los pigmentos se posan sobre el recubrimiento). Si seca mate y opaco, sospecha pigmento.

**Test B — curva de densidad UV real.**
Imprime una cuña de 11 pasos con `R64 G128 B0` a saturaciones 20/40/60/80/100 % sobre Pictorico, y expón tiras de cianotipo 2/4/6/8 min. La saturación que dé "papel blanco limpio" en el paso 1 es tu color de trabajo; el paso 11 debe dar azul máximo. Ajusta saturación hasta que ambos extremos se cumplan.

---

## 7. Fuentes

### Conservadas
- [Epson UK — ET-2865 Tech Specs](https://www.epson.co.uk/en_GB/products/printers/inkjet/consumer/ecotank-et-2865-a4-multifunction-wi-fi-ink-tank-printer,-with-up-to-3-years-of-ink-included/p/41749) — fuente primaria del set de tintas, inyectores, gramajes.
- [Datasheet ET-2865 (PDF)](https://www.printer4you.com/media/datasheet/epson-ecotank-et-2865-200epgo-et-2865_en.pdf) — SKU, códigos, formatos.
- [Manual ET-2860 series (PDF, Epson Europe)](https://download.epson-europe.com/pub/download/6599/epson659964eu.pdf) — paneles del driver Mac, PhotoEnhance, márgenes.
- [List of Paper Type — ET-2860](https://download4.epson.biz/sec_pubs/et-2860_series/useg/en/GUID-223AB2C5-12EC-494C-A420-18D218F4F07B.htm) — tipos de papel del driver.
- [Printable Area for Single Sheets](https://download4.epson.biz/sec_pubs/et-2860_series/useg/en/GUID-E28BA294-305C-4F5A-92E9-B818FAC7423F.htm) — márgenes 3 mm.
- [Unavailable Paper Types](https://download4.epson.biz/sec_pubs/et-2860_series/useg/en/GUID-B8CCBC55-7A06-4AE8-A426-7B2B9C3C3802.htm) — papel ondulado/grueso no admitido.
- [Clay Harmon — QTR2200 UV Density Test](https://clayharmonblog.com/img/QTR2200InkLimitTest.xls.pdf) — **la tabla densitométrica UV por tinta**.
- [Clay Harmon — Color Ratio Method](https://www.alternativephotography.com/digital-negatives-color-ratio/) — óptimo R64/G128/B0 y método de saturación.
- [alt-photo-process-l — King sobre 1400 dye (2007)](http://altphotolist.org/lists/alt-photo-process-l/200702/msg00445.html) — dye 1,05 vs pigmento 2,3; compuesto 1,8.
- [alt-photo-process-l — Harmon sobre 1400/Claria (2009)](http://www.altphotolist.org/lists/alt-photo-process-l/200910/msg00455.html) — límite 60 % de tinta sobre Pictorico.
- [alt-photo-process-l — King, densidad base OHP ≈0,13 (2004)](http://altphotolist.org/lists/alt-photo-process/2004/oct04/0255.htm).
- [Mike Ware — New Cyanotype, Siderotype Workshop Notes](https://www.mikeware.co.uk/downloads/CyanoWork.pdf) — DR 1,8–2,4.
- [Mike Ware — Cyanomicon II](https://www.mikeware.co.uk/downloads/Cyanomicon_II.pdf) — corte a 420–430 nm.
- [Turner, Parisi et al. 2014, Photochem. Photobiol. Sci.](https://link.springer.com/article/10.1039/c4pp00166d) — respuesta espectral del cianotipo.
- [Wikipedia — Cyanotype](https://en.wikipedia.org/wiki/Cyanotype) — rango 300–400 nm.
- [Epson US FAQ ET-2800](https://epson.com/faq/SPT_C11CJ66202~faq-00007ff-et2800_2803) — lista de Media Types del gemelo US (sin transparencia).
- [Druckerchannel — ET-2860/2870](https://www.druckerchannel.de/artikel.php?ID=4966&t=epson_ecotank_et_2870_und_et_2860_serie) — sin pigmento, sin AirPrint/Mopria, gama idéntica.
- [Innova Art — Pictorico Ultra Premium OHP](https://innovaart.com/product/pictorico-ultra-premium-ohp-transparency-film-184gsm-ipf-121/) y [Firstcall](https://firstcall-photographic.co.uk/products/innova-pictorico-pro-ohp-ultra-transparency-film-17-inch-roll-x-20m) — 184 g/m², 5,7 mil, dye o pigmento.
- [Koraks — "A litany of woes"](https://tinker.koraks.nl/photography/a-litany-of-woes-digital-inkjet-negatives-and-a-note-on-dot-gain-mottling/) — pizza wheels, dot gain sobre film.
- [ScreenPrinters Help — Ink Running/Puddling](https://support.solutionsforscreenprinters.com/hc/en-us/articles/25909808825492-Ink-Running-Puddling-Too-Wet-or-Blurry-on-film) — lado recubierto, film adecuado.
- [Northlight Images — driver settings Epson](https://www.northlight-images.co.uk/best-epson-et8500-8550-driver-settings/) — resolución nativa múltiplo de 360.
- [cups-filters #498](https://github.com/OpenPrinting/cups-filters/issues/498) — problemas de raster driverless en un Epson EcoTank.

### Rechazadas / despriorizadas
- **cyanocodex.com** (varias páginas) — buena síntesis pero sin autoría, fechas 2026 y formato SEO; usada solo como pista, nunca como evidencia.
- **silverlog.app** — mismo perfil (contenido agregado sin autor); descartada.
- **reddit / foros sueltos** — anécdotas sin medición.
- **pricespy.co.uk** — único origen del dato "3 pl"; agregador, no fabricante.
- **mids4d.co.uk (ET-2860)** — ficha errónea (describe PrecisionCore de 800 inyectores, no es este equipo); descartada.
- **B&H / Amazon (Pictorico)** — ficha de producto duplicada de tienda; sustituida por Innova/Firstcall.

---

## Next steps

1. **Test A y Test B del §6** — son 1 hora y resuelven las dos incertidumbres que más afectan al resultado (naturaleza del negro y saturación de trabajo).
2. Si el objetivo es **New Cyanotype**, medir el Dmax real alcanzado; si <1,8, el ET-2865 no sirve y hay que ir a un pigmentado con QTR.
3. Medir el **error de escala** con la regla de 200 mm antes de invertir en plantillas de registro.
