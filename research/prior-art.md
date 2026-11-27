# Prior art: negativos digitales y procesos alternativos (foco cianotipo)

> Etiquetas de evidencia usadas en todo el documento:
> **[directo]** = el propio autor/herramienta lo afirma o lo implementa así · **[código]** = verificado leyendo el código fuente · **[infl.]** = interpretación mía a partir de fuentes · **[medido]** = dato de medición publicado por un tercero.
> Fecha de la investigación: 2026-11. La mayoría de las fuentes "clásicas" son de 2006-2022 y siguen siendo el estado del arte.

---

## Resumen

No existe un estándar: hay cuatro familias de solución (script de Photoshop con LUT de 14 puntos, sistema propietario de color+curvas, RIP de tintas con linearización numérica, y apps web que sólo invierten). Todas comparten el mismo núcleo matemático —imprimir una escala de pasos, medirla, invertir la respuesta medida— pero **ninguna modela la absorbancia UV real de las tintas ni la química del cianotipo**, y el cianotipo es justamente el proceso donde el rango de densidad útil es más corto (≈1,0–1,2 log D en la fórmula tradicional de Ware, frente a 1,6–1,9 del paladio), por lo que heredar métodos pensados para platino/paladio produce negativos con exceso de contraste y medios tonos aplastados.

La oportunidad es clara: un motor abierto que (a) calcule el límite de tinta y el color de bloqueo por familia de impresora, (b) linearice con monotonía garantizada en dominio de densidad, y (c) traiga los números del cianotipo como valores por defecto en lugar de como excepción.

---

## 1. Cómo funcionan las herramientas establecidas

### 1.1 ChartThrob (Kevin Bjorke, 2006-2019) — el "estándar de facto" gratuito

**Qué es.** Script JSX para Photoshop (CS2+), no una app. Hace dos cosas: genera una carta gris y analiza el escaneo de la copia positivada para producir una capa de Curvas ("Print Curve"). [directo: README y código]

**Modelo de curva y pasos** [código: `ChartThrob.jsx` v1.15]:
- La carta contiene **101 parches al 1 %** (0–99 % + 100 %), dibujados en una matriz de 10×10 + 1, más una **tira de 21 pasos** (255→0 en 21 escalones) y una rampa continua. Tamaño por defecto 1200×1210 px a 300 dpi.
- El análisis muestrea **101 parches** (10×10 + 1) promediando el 55 % central de cada parche (`applyAverage`), normaliza cada canal contra el primer parche (blanco de papel) y convierte a gris con la **media aritmética simple de R,G,B** (`toGray`).
- Normaliza el rango dinámico midiendo mínimo y máximo reales del escaneo (`determineDynamicRange`), no el blanco de papel teórico.
- Genera **14 puntos interiores** de curva en entradas fijas `round(255·j/13)`, j=0..13, y calcula la salida con **búsqueda inversa + interpolación lineal** sobre los 101 valores medidos (`findValueThatGives`). Photoshop interpola el resto (spline).
- Opción "negate" para usar la curva directamente sobre negativos QTR. Escribe una capa de Curvas oculta.
- **8 bits only** (su propio FAQ lo admite: "todos sus cálculos en 8 bits"); recomienda escanear con gamma 1.0 y sin correcciones automáticas.

**Crítica verificada en código:** `verifyCurve()` comprueba que las X de la curva sean crecientes, pero las X se generan siempre crecientes por construcción ⇒ **el control de monotonía es vacuo**; una curva con un valle (ruido, mancha, parche saturado) pasa sin aviso. No hay modelo UV, ni límite de tinta, ni color; el escáner y su gamma son parte del resultado.

### 1.2 Precision Digital Negatives / PDN (Mark I. Nelson) — el sistema propietario de referencia

**Idea central.** "Color Density Range Control" (patentado): en vez de aplicar una curva brutal, primero se **ajusta el rango de densidad del negativo con color** (sólo R, G, B puros o mezclados, **sin negro**) y luego se aplica una curva mucho más suave. [directo: precisiondigitalnegatives.com; unblinkingeye.com]

**Flujo declarado (4 pasos)** [directo, resumen de Hopcroft sobre el sistema]:
1. Determinar el **Standard Printing Time** con film transparente limpio.
2. Determinar la **mezcla de tintas** (paleta de color) que da el rango de densidad ideal para el proceso.
3. Generar una **escala de gradiente** con esa mezcla.
4. Generar **curvas de ajuste de Photoshop** que linearizan la escala.

**Pasos y curvas** [directo + inferido]:
- Tableta patrón propia: **31 pasos, ΔD = 0,10 log (1/3 de paso)**, "tres pasos = 1 stop", fabricada por Stouffer; compatible declarada con platino/paladio, **cianotipo** y fotograbado. [directo: ficha del producto]
- Paleta de calibración: malla de mezclas RGB; en una descripción de tercera parte son **≈150 mezclas de color** distintas. [directo en la fuente secundaria: Hopcroft]
- La curva no es una sola: entrega una **familia de Process Adjustment Curves de contraste variable** + base de datos "Curve Calculator III". [directo]
- Para que la paleta funcione hay que imprimir con **"No Color Management"** y forzar que la impresora use sólo tintas RGB (sin negro). [directo: Saccheri]

**Debilidad estructural:** es una caja negra comercial (ebook + software), no hay especificación pública del algoritmo ni de los valores de la paleta; la calibración no es reproducible por terceros y depende de que el driver deje de gestionar color.

### 1.3 QuadToneRIP (QTR) y el método Reeder/Anderson

**Qué cambia respecto a PDN.** QTR no colorea: crea un **perfil de tintas** (`.quad`/`.qidf`) donde cada tinta (K, LK, LLK, y opcionalmente colores) recibe su propia curva de porcentaje por nivel de entrada. La linearización se hace en el RIP, no en Photoshop. [directo: Reeder/Anderson, *Digital Negatives with QuadToneRIP*, 2021]

**Método de 3 pasos (Reeder/Anderson)** [directo: artículo en AlternativePhotography, 2013]:
1. **Tiempo básico de exposición**: mínimo tiempo para negro máximo a través del film (con la escala de pasos).
2. **Contraste global del negativo**: se ajusta con el **slider "Color Density" del driver de Epson** (no con curva). Usar **Photo Black** y sliders por defecto para cianotipo.
3. **Corrección de medios tonos**: imprimir la tableta, positivarla, medir en intervalos del 5 % (hasta 30 %) y luego cada 10 %, construir tabla Input/Output, **intercambiar las columnas** y meter esos pares en Curvas de Photoshop.

**Límites de Photoshop citados literalmente por ellos** [directo]: "Photoshop only allows 16 points on the curve" y "will not insert points that are less than 2 % apart"; la curva "never dips down (it will always ascend)" y se acepta **corregirla a mano** para suavizarla.

**Clave para cianotipo** [directo, misma fuente]: para procesos que usan **negativo de bajo contraste (gum, caseína, cianotipo)** "se pueden obtener resultados aceptables haciendo sólo los pasos 1 y 2 y saltando el paso 3" (la curva).

**Datos concretos del flujo QTR** [directo: capítulo de muestra, Harmon]:
- Escala recomendada: Stouffer **T2115 (21 pasos, 1/2 stop)** o **T3110 (31 pasos, 1/3 stop)**, "no paguen la calibrada".
- Ejemplo paladio: negro en el paso 3, blanco en el 27 ⇒ 24 pasos × 0,10 = **2,4 log D = 8 stops**.
- Para cianotipo: forzar la oxidación con **una tapita de agua oxigenada** en el agua antes de medir, porque la densidad máxima tarda días.

**Modelo de curva:** el script "Build QTR Curve" ajusta extremos blanco/negro y calcula la linearización intermedia desde la escala de 21 pasos; el resultado se guarda como `.acv` y se enlaza al perfil por la pestaña **Gray Curve**. El propio texto admite que la curva resultante "no es perfecta" y hay que mover puntos a mano. [directo]

### 1.4 Richard Boutwell — QuadToneProfiler-DN (v3)

**Qué aporta.** Automatiza lo que en QTR era manual: curvas de arranque (starter) por proceso, control de **blocking density** y linearización integrada. [directo: bwmastery.com y docs]

**Números y formatos** [directo]:
- Lineariza con targets estándar de **21, 51, 128 o 256 pasos**; también acepta escalas propias de cualquier tamaño.
- Acepta medición con **i1Pro, ColorMunki/i1Studio, SpyderPrint, colorímetros iOS, densitómetro manual o escaneo plano**, y formatos **CGATS .txt, Argyll .ti3, SpyderPrint .txt, ColorMunki .csv, QTR-Linearize-Data `-out.txt`**, o una sola columna de L* / log D.
- Para aumentar el bloqueo UV usa **solapamiento de Light Black con cinco tintas de color** en una curva de bloqueo dedicada ("the increased overlap of the Light Black and the five color inks").
- Exporta **.acv y .cube** (para usar sin QTR, p. ej. en Photoshop o en una imprenta).
- Curvas de arranque publicadas: estándar, carbon transfer, Lodima/Lupex/Azo, Ilford MG, y "más curvas para Albumen, Salted Paper y **Cyanotype**".
- La app nativa es **macOS**; la ruta QTR exige **Epson** (UltraChrome K3 / SureColor). Canon queda fuera por la vía del RIP.

### 1.5 "Photoshop a pelo" (el flujo integrado que la gente usa sin saber que lo usa)

No existe un generador de negativos digitales en Photoshop: **"Digital Negative" (DNG) es un formato RAW de Adobe y no tiene nada que ver**. El flujo real, documentado por Reeder/Anderson y por Harmon, es:

1. 16 bits, **Adobe RGB (1998)** o gris gamma 2.2 (coherente con la tableta de calibración).
2. Revelado/edición en positivo.
3. Aplicar la curva de corrección **sobre el positivo**.
4. **Invertir** (`Image > Adjustments > Invert`).
5. **Voltear horizontal** (para que el lado entintado quede contra el papel).
6. Imprimir a **360 ppi** sobre film; gestión de color "Photoshop gestiona colores", relativo colorimétrico + compensación de punto negro (recomendación Schreiber/Harmon), o "No Color Management" si se calibra con paleta PDN.
7. Curvas: máximo ~16 puntos, separación mínima ~2 %, sin garantía de monotonía.

**Consecuencia:** el "modelo de curva" del flujo Photoshop es *una spline cúbica ajustada a mano sobre ≤16 nodos*, en 16 bits, sin ningún tratamiento de densidad ni de UV.

### 1.6 Tabla comparativa

| Herramienta | Modelo de curva | Pasos de calibración | Cómo deriva la corrección | Notas |
|---|---|---|---|---|
| **ChartThrob** | LUT inversa + spline de **14 nodos** en Curvas PS | Carta propia de **101 parches al 1 %** + tira de 21 | Normaliza min–max del escaneo, invierte por interpolación lineal | 8 bits; monotonía no verificada; sin color ni UV |
| **PDN (Nelson)** | Familia de curvas PS + "Curve Calculator III" | Tableta **31 pasos × 0,10 log** + paleta RGB (~150 mezclas) | Elige color ⇒ fija densidad; luego curva suave | Sin negro; patentado; cerrado |
| **QTR + Reeder/Anderson** | Perfil de tintas `.quad` + `.acv` Gray Curve | 21 (T2115) o 31 (T3110) pasos | Tabla Input/Output del positivo, ejes intercambiados, ≤16 puntos | Lineariza el RIP, no la imagen; ajuste manual admitido |
| **Boutwell QTP-DN v3** | Curvas por tinta + LUT exportada | **21 / 51 / 128 / 256** pasos | Linearización automática contra target + blocking density | Acepta muchos formatos de medición; macOS/Epson |
| **Photoshop solo** | Spline de ≤16 puntos | El que elijas | Manual | Sin validación posible |
| **CyanoLUT** (open source) | **PAVA + PCHIP**, 256 muestras | 21 o 31 | Inversión de la respuesta medida, mediana por parche | Sólo gris; 31 pasos sin validar en papel |
| **TruNeg** (comercial) | Inversión logarítmica desde 2 extremos (+10 densidades opcionales) | Tableta propia / Stouffer | Cálculo log, no LUT empírica | Perfiles por proceso (incl. cianotipo clásico) |

---

## 2. El negativo coloreado (colourised negative)

### 2.1 Por qué existe

Histórico: en los 90 las tintas tenían poco filtrado UV y el negro no bastaba para procesos largos (platino/paladio); Dan Burkholder introdujo teñir el negativo porque las tintas de color bloqueaban más UV que el negro. [directo: Saccheri]

Hoy: en impresoras pigmentadas modernas el negro es muy denso, así que el color ya no sirve tanto para *añadir* densidad como para **dosificar el rango y suavizar la respuesta** (menos carga de tinta ⇒ menos grano, menos banding, menos riesgo de que la tinta se corra). [directo: Saccheri; Boutwell]

Razón física: la densidad **visual** no predice la **UV**. Ware lo dice sin rodeos: los densitómetros visibles "son inútiles" para negativos inkjet; hay que proceder empíricamente o con densitómetro UV. [directo: mikeware.co.uk]

### 2.2 Valores concretos publicados

| Fuente | Impresora | Recomendación numérica |
|---|---|---|
| Clay Harmon, *Color Ratio Method* | Epson 2200 | Mejor ratio de bloqueo **R64 G128 B0**; capa en modo *Screen* con relleno: **Pt 1,6 → R127 G255 B0**; **Pd 1,9 → R70 G140 B0**; **papeles Pd 2,2 → R50 G100 B0**; **sal/albúmina 2,5 → R25 G50 B0**. Una sola curva de corrección; se cambia la saturación para cambiar el rango. [directo] |
| PDN (Nelson) | Epson (driver sin gestión de color) | Sólo primarios R/G/B puros o mezclados, **nunca negro**; paleta de ~150 mezclas; se elige la mezcla que "apenas" da negro. [directo] |
| Hopcroft (usando PDN) | Epson 3880 | Elección concreta resultante: **R=30, G=0, B=255** "apenas da negro" para fotopolímero. [directo] |
| EDN / ColorBlocker (Peter Mrhar) | Epson P600 (Saccheri) | Malla **HSB**: columnas de tono cada 10° (0–350). Descarta las columnas que producen **inversión de tono** (en su prueba, 0–130) y elige la de mayor recorrido tonal (columna **350** para cianotipo clásico). Exporta Gradient Map **y LUT** donde el tono cambia por zonas (sombras/medios/altas). [directo: Saccheri describiendo EDN] |
| Koch-Schulte / RNP (vía Calinawan) | Epson 2200/2400 | Punto de partida **R0 G90 B30** para cianotipo; naranja muy usado. [directo] |
| Reeder / Anderson | Epson K3 (3800) | **El amarillo es el mayor absorbedor UV después del matte black**; el negro de foto también bloquea mucho. Conclusión operativa: "a la luz UV le da igual el color, sólo le importa cuánto bloquea". [directo: cita de Reeder recogida por Harkness; mismo criterio en el libro QTR] |
| Ian Parker (medido) | Epson 3880, Ultrachrome | Curvas de densidad espectral: **el cian tiene un pico fuerte hacia 380 nm**; el amarillo **baja** de 400 a 300 nm ⇒ la lámpara decide qué tinta es "la que más bloquea". [medido] |
| Ian Leake | Canon PRO-1000 | QTR no existe para Canon ⇒ variantes de PDN; "la mayoría de combinaciones de color no dan densidad UV suficiente" y el negro de foto, al mezclarse, "lo descoloca todo". [directo] |
| Foros Canon PRO-100 | Canon | Ajuste de media **"Matte Photo Paper"** da más densidad UV que otros en Pictorico TPS-100. [directo, evidencia débil] |

**Lectura [infl.]:** no hay ni un solo table público, sistemático y medido de "color óptimo por familia de impresora". Lo que hay son valores puntuales de hace 15-20 años (Epson 2200) y folclore de foro. Esto es a la vez el mayor hueco y la mayor oportunidad.

### 2.3 Flujo iterativo medir → corregir (lo que todos hacen)

1. Fijar **tiempo de exposición** (mínimo para negro máximo a través del film).
2. Imprimir la **malla de color** (ternario RGB de Harmon, paleta PDN o rejilla HSB de EDN) y positivarla en el proceso.
3. Descartar colores con **inversión de tono** (un negativo más denso que da una copia más clara) y elegir el de mayor recorrido tonal.
4. Con ese color fijo, imprimir la **rampa de 21/31 pasos** y positivarla.
5. Medir (escaneo o densitómetro) ⇒ construir la curva; aplicarla al positivo; invertir; imprimir; **repetir 1-2 veces** hasta que la rampa impresa sea lineal.
6. Guardar el par (color, curva) como perfil de la cadena impresora+film+química+lámpara.

EDN añade un detalle inteligente: la LUT de bloqueo **ya hace parte de la corrección** (el tono cambia por zonas), así que la curva posterior es "muy ligera", lo que reduce artefactos. [directo: Saccheri]

---

## 3. Escalas de pasos y algoritmo de linearización

### 3.1 Escalas comerciales (números exactos)

| Escala | Pasos | Incremento | Dmax | Uso |
|---|---|---|---|---|
| Stouffer **T2115** | 21 | **0,15 log D** (1/2 stop) | 3,05 | Estándar histórico; 2 pasos = 1 stop |
| Stouffer **T3110** | 31 | **0,10 log D** (1/3 stop) | 3,05 | Preferida por QTR/Boutwell; 3 pasos = 1 stop |
| Stouffer **TLF3110** | 31 | 0,10 | 3,05 | Versión 8×10" |
| **PDN 31-Step Tablet** (Nelson, fabricada por Stouffer) | 31 | **0,10 log (1/3 stop)**, "3 pasos = 1 stop" | — | Diseñada para linearización de negativos; declarada apta para cianotipo |
| **Burkholder 50-step** | 50 | **2 % de opacidad relativa** | — | Usada por Ware para fijar el nivel de salida negro (Lw) |
| Escala de la carta ChartThrob | 101 | 1 % de gris (no densidad) | — | Es una rampa digital, no una tableta calibrada |

[directo: stouffer.net/T3110spec.htm, /TransPage.htm; precisiondigitalnegatives.com; mikeware.co.uk]

**Sobre "variantes coloreadas":** no existe una tableta transmisiva comercial "coloreada". Lo que se colorea es **la rampa impresa**: se imprime la escala de 21/31 pasos en la mezcla de tinta elegida (paleta PDN, rejilla HSB de EDN, o la *Ink Pattern Page*/ *Ink Separation* de QTR, que imprime cada tinta por separado en escalones). [directo]

### 3.2 Algoritmo exacto: de la escala impresa + cianotipo a la curva de corrección

Notación: `g` = nivel de gris de entrada (0..1, 0 = negro de imagen, 1 = blanco de imagen). `v` = valor que se escribe en el negativo (0..255 o 0..1). `D` = densidad impresa en la copia.

**Paso 0 — Tiempo de exposición (antes de todo).**
Sobre-exponer una tira con la tableta encima y contar pasos hasta el último negro sólido:
`ET = OT · 2^(−s/sv)`, con `s` = nº de pasos hasta el último negro pleno, `sv` = pasos por stop (2 en T2115, 3 en T3110). [directo: Clay Harmon]

**Paso 1 — Medición.**
- Escanear plano, **sin autocorrección**, gamma 1.0; o densitómetro.
- Para cianotipo, medir **el canal rojo**: el azul de Prusia absorbe en rojo. Dato publicado: el canal rojo dio **≈49 % más de rango de densidad** que la luminosidad y "el doble de discriminación en las sombras más profundas", con menos inversiones de monotonía. [directo: CyanoLUT]
- Muestrear con **mediana** (no media) en una ventana proporcional al parche, para inmunidad a polvo y manchas. [directo: CyanoLUT]

**Paso 2 — Reflejo → densidad.**
`D = −log10(R / R_papel)` con `R` = reflectancia linealizada (deshacer gamma sRGB antes). Equivalente vía L*: `Y/Yn = ((L*+16)/116)^3` para L*>8, y luego `D = −log10(Y/Yn)`. Normalizar por el parche de papel (D=0) y por el negro medido (Dmax).

**Paso 3 — Objetivo.**
Lo estándar es linealidad en densidad: `D_obj(g) = D_min + g·(D_max − D_min)`.
Alternativa defendible: linealidad en L* (igual espaciado visual). **No** es lo mismo y conviene ofrecer ambas; la mayoría de las guías no lo explicita. [infl.]

**Paso 4 — Imponer monotonía.**
Ordenar las densidades medidas con **regresión isotónica (PAVA)**. Si hay mesetas (varios pasos con la misma D), **no suavizar: es sobreexposición**; hay que bajar el tiempo, porque invertir una meseta produce un salto en la LUT y posterización visible. [directo: CyanoLUT]

**Paso 5 — Interpolar con spline monótona.**
**PCHIP / Fritsch–Carlson** sobre los puntos (v, D) para no generar sobreoscilación (una cúbica natural sí la genera). Descartar modelos paramétricos: se probó un modelo de saturación Weibull y "no captura la forma en S" (residuo estructural hasta ~0,167 de densidad) con parámetros degenerados. [directo: CyanoLUT]

**Paso 6 — Invertir.**
Para cada `g`, resolver `D(v) = D_obj(g)` por bisección sobre la PCHIP (la respuesta es monótona decreciente en `v`: más tinta ⇒ más densidad ⇒ menos luz). Resultado: `v(g)`, monótona decreciente por construcción. Muestrear a 256/1024 nodos.

**Paso 7 — Anclar extremos y limitar tinta.**
- `v(1) = vmax` = **límite de tinta** medido (el valor más bajo que la impresora/film aceptan sin correrse ni broncearse), no 0 ciego.
- `v(0) = vmin` tal que la copia salga "casi" Dmax (Ware: `Lw = 2,55·(100 − Qw)` donde Qw es la opacidad, en %, del paso que sale "justo blanco"). [directo: Ware]
- Nunca extrapolar fuera del rango medido: recortar y avisar.

**Paso 8 — Iterar.**
Aplicar la curva, imprimir de nuevo la escala, medir el residuo `ΔD(g)`. Criterio práctico: parar cuando `|ΔD| < 0,02` (≈1 % de reflectancia) o tras 2 iteraciones. Todas las fuentes serias describen este bucle; **ninguna herramienta open source lo automatiza hoy**. [infl. sobre Reeder/Harmon/Boutwell]

**Paso 9 — Validación.**
Comprobar: (a) monotonía de la curva final, (b) ausencia de mesetas, (c) residuo RMS en densidad, (d) que el parche más claro no sea papel blanco puro y el más oscuro no sature.

---

## 4. Herramientas open source / web existentes

| Proyecto | Qué hace | Qué hace mal |
|---|---|---|
| **[ChartThrob](https://github.com/joker-b/ChartThrob)** (JSX, gratis pero no licencia OSI) | Carta de 101 parches + análisis + curva de 14 puntos | Sólo Photoshop; **8 bits**; monotonía no verificada; sin UV/color; depende del escáner; sin iteración |
| **[CyanoLUT](https://github.com/alareta/CyanoLUT)** (MIT, HTML único) | Genera cuña 21/31, analiza escaneo, **PAVA+PCHIP**, exporta `.cube/.acv/.csv`; canal rojo; mediana; banda sacrificial para láser | Sólo negativo **gris** (sin color/ink-limit); hay que marcar columnas a mano; **31 pasos no validado en papel**; no calcula tiempo de exposición; no itera; no hay perfil de cadena versionado |
| **[CyanHero](https://portwally.github.io/CyanHero/)** (macOS, pago, cerrado) | Inversión "logarítmica": `out = 255·(1 − log(in)/log(255))`, presets por proceso, previsualización azul | **Fórmula cerrada sin medición**: no hay calibración, ni tableta, ni densidades; los presets no pueden ser correctos para tu cadena; sólo macOS |
| **[FelyCZ/cyanotype](https://github.com/FelyCZ/cyanotype)** (MIT, Nuxt) | Inversión + brillo/contraste, recorte, PDF a tamaño real, guías de química | **Cero calibración**: no hay curva, ni tableta, ni densidad; la "previsualización cianotipo" es un color fijo `#1C39BB` |
| **[Digital Negative Lab](https://digitalnegativelab.com/)** (web, freemium 19 $/año) | Presets por proceso, "density calibration" en Pro, export 300-600 dpi | Cerrado; la calibración no es auditable; presets genéricos |
| **[openquad](https://github.com/akendrick/openquad)** (GPLv2, beta) | QTR-style para Canon, calibración y negativos para carbon transfer | Beta, hardware limitado, no orientado a cianotipo |
| **QTR / QuadToneProfiler-DN** | Ver §1.3-1.4 | QTR es shareware y sin código; QTP-DN es comercial y macOS |
| **TruNeg** (comercial, 35-39 $) | Inversión logarítmica + perfiles (incl. **cianotipo clásico**), 10 densidades intermedias opcionales | Cerrado; el "perfil" sustituye a la medición real de tu cadena |

**Patrón común:** todas invierten; casi ninguna **mide el color**; ninguna modela la **química**; ninguna convierte la calibración en un objeto compartible y versionado.

---

## 5. Guías y números específicos de cianotipo (no platino/paladio)

| Fuente | Dato |
|---|---|
| **Mike Ware, cianotipo tradicional** | "La pérdida de gradación reduce el rango de densidad del negativo que se puede imprimir con éxito a **sólo 1,0 o 1,2**, que es la mitad (≈2,4) del 'nuevo cianotipo'". Añade que el método "va mejor con negativos hechos para plata-gelatina estándar (o goma bicromatada)". [directo] |
| **Mike Ware, New Cyanotype** | "Los negativos deben tener un rango de densidad largo (en UV): **al menos 1,8 y hasta 2,4**"; con lámpara HID de 800 W y negativos digitales, **≈60 s** de exposición. [directo] |
| **Ware, Simple Cyanotype** | Tres grados de contraste con escalas de exposición de **≈2,7 / 2,3 / 1,8**; revelado sólo en agua baja la escala a **≈1,2–1,3**. [directo en la fuente que cita a Ware: cyanocodex] |
| **Reeder/Anderson (QTR)** | El cianotipo usa **negativo de bajo contraste**: los pasos 1 y 2 del método (exposición + Color Density) suelen bastar; el paso 3 (curva) a menudo **no** es necesario. Para perfilar, oxidar con agua oxigenada antes de medir. [directo] |
| **Ware, requisitos generales** | Los rangos de densidad de los negativos para procesos de hierro van de **logH ≈1,5** ("más o menos un grado 0 de papel de plata") a **logH ≈2,5** (más suave que cualquier papel de plata). [directo] |
| **Harmon (referencia cruzada)** | Platino **1,55–1,6**; paladio **1,9**; papeles de paladio **2,2**; sal/albúmina **2,5** ⇒ el cianotipo tradicional está **muy por debajo** de todos ellos. [directo] |
| **Práctica de foro** | Se repite "1,4–1,6" para cianotipo, pero sin distinguir fórmula ni fuente de luz. [directo, baja fiabilidad] |

**Conclusión operativa [infl.]:** el cianotipo tradicional no es un proceso que "necesite más densidad" — es un proceso **de escala corta** (contrastado) que necesita un negativo **comprimido** (≈1,0–1,2 log D), y además pierde cerca de la mitad de su escala tonal en el lavado, lo que obliga a sobreexponer. Un método heredado de platino/paladio (1,6–2,5) produce aquí negativos demasiado contrastados, con altas luces quemadas y sombras tapadas. El "nuevo cianotipo" de Ware es la excepción: 1,8–2,4.

---

## Contradicciones

1. **Qué color bloquea más UV.** EDN afirma que "la luz UV se bloquea mejor con rojo y peor con azul". Reeder mide que **el amarillo es el mayor absorbedor después del matte black** en K3. La práctica reparte: naranja, verde, rojo y "R0 G90 B30" según el autor. **No se resuelve**: depende del juego de tintas y del espectro de la lámpara (Parker: el cian tiene un pico hacia 380 nm; el amarillo cae de 400 a 300 nm). Cualquier tabla fija de "el mejor color" es falsa.
2. **Si hace falta colorear.** PDN y Harmon: sí, es el mecanismo para fijar el rango. Reeder/Anderson y Saccheri: con pigmentos modernos el negro ya es suficientemente denso y muchas veces lo que hay que hacer es **bajar** la densidad de tinta; el color es sólo dosificación fina. Boutwell lo usa para **añadir** bloqueo (LK + 5 colores).
3. **Si el cianotipo necesita curva.** Reeder/Anderson dicen que para cianotipo a menudo **no** (basta exposición + densidad). CyanoLUT y CyanHero asumen que siempre hace falta una curva medida. Ambas cosas pueden ser ciertas: sin curva se obtiene una copia "aceptable", no lineal.
4. **Rango de densidad del cianotipo.** 1,0–1,2 (Ware, tradicional) vs 1,8–2,4 (Ware, nuevo) vs "1,4–1,6" (foros) vs 2,7/2,3/1,8 (Ware, Simple, según grado). Son **químicas distintas**; citarlas sin decir cuál es el error más común del campo.
5. **Atribución de nombres.** "ChartThrob" es de Kevin Bjorke, no de Ron Reeder; "Precision Digital Negatives" es de Mark Nelson; Reeder es el método de 3 pasos y el libro de QTR con Anderson. Conviene no repetir la confusión en nuestra documentación.

---

## Evidencia ausente

- **No hay tabla pública medida de "color de bloqueo óptimo por impresora"**. Sólo valores sueltos (Epson 2200 de 2010, Canon PRO-100/1000 en foros).
- **No hay espectros UV de tintas en formato de datos**; lo más cercano es un gráfico de Ian Parker (Epson 3880) sin tabla numérica publicada.
- **PDN es caja negra**: nº exacto de parches y valores de la paleta, y el algoritmo de Curve Calculator, no son públicos (ebook de 75 $).
- **Anderson, *Cyanotype: The Blueprint…*, cap. 4 ("Digital Negatives for Cyanotype", pp. 47-58)** no se pudo leer: el PDF de previsualización supera el límite de 20 MB. Sólo se verificó el índice (incluye "Curving the negative", "A word about ink density", "Duotone negatives from RGB/CMYK"), que confirma que el enfoque coloreado se enseña **para cianotipo**.
- **CyanoLUT**: el modo 31 pasos "está implementado y verificado en pantalla pero no validado en papel" (declaración del autor).
- **`source_check`** se ejecutó sobre la afirmación "el amarillo es el mayor absorbedor UV tras el negro" y devolvió documentos irrelevantes (permanencia/lightfastness), con estado "unclear". Por tanto esa afirmación se validó **sólo por lectura manual** de fuentes secundarias y de práctica, no por verificación automática.
- No hay **benchmark reproducible** de ChartThrob vs QTR vs CyanoLUT sobre el mismo cianotipo.

---

## Fuentes

**Mantenidas**
- ChartThrob, repositorio y código: https://github.com/joker-b/ChartThrob — única fuente primaria del algoritmo (101 parches, 14 puntos, 8 bits, verificación de monotonía).
- ChartThrob, README/FAQ: https://github.com/joker-b/ChartThrob#readme — límite de 14 puntos, advertencia sobre escaneo de cianotipos.
- Precision Digital Negatives (Nelson), "About": https://precisiondigitalnegatives.com/pages/about-precision-digital-negatives — 31 pasos, Curve Calculator III, familia de curvas.
- PDN, ficha de la tableta de 31 pasos: https://precisiondigitalnegatives.com/products/media-and-entertainment-example-product-1 — 0,10 log, 1/3 stop, apta para cianotipo.
- Unblinking Eye, reseña del ebook PDN: https://unblinkingeye.com/Books/PDN/pdn.html — contenido real del sistema y capítulos de calibración.
- Michael J. Hopcroft, "Precision Digital Negatives": https://www.michaeljhopcroft.com/2013/07/02/precision-digital-negatives/ — los 4 pasos, ~150 mezclas, elección R30 G0 B255.
- Paolo Saccheri, "Colorized negatives": https://www.saccheri.it/darkroom-variables-colorized-negatives/ — historia, PDN vs EDN, rejilla HSB, LUT por zonas, impresoras modernas.
- Clay Harmon, "The Color Ratio Method": https://www.alternativephotography.com/digital-negatives-color-ratio/ — valores RGB por rango de densidad, diagrama ternario.
- Reeder & Anderson, "Digital negatives" (método de 3 pasos): https://www.alternativephotography.com/digital-negatives/ — flujo Photoshop, ≤16 puntos, cianotipo sin curva.
- Reeder & Anderson, *Digital Negatives with QuadToneRIP*, previsualización: https://api.pageplace.de/preview/DT0400.9781000208795_A40300231/preview-9781000208795_A40300231.pdf — "la luz UV no se preocupa del color", grupos de bloqueadores, capítulo de cianotipo.
- Clay Harmon, "QTR Negatives" (PDF): https://clayharmonblog.com/assets/file/qtr.pdf — escala de 21 pasos, cálculo 2,4 log D = 8 stops, .acv + Gray Curve, agua oxigenada para cianotipo.
- Clay Harmon, "Exposure Calculator": https://clayharmonblog.com/posts/exposure-calculator — fórmula `ET = OT·2^(−s/sv)`, pasos por stop.
- Boutwell, QuadToneProfiler-DN: https://www.bwmastery.com/quadtoneprofiler-digital-negatives — 21/51/128/256 pasos, formatos, blocking density, .cube/.acv.
- Boutwell, docs de linearización: https://publish.obsidian.md/quadtoneprofiler/Documentation+and+Instructions/QuadToneProfiler-DN+v3/2+Linearization — comportamiento automático.
- Mike Ware, cianotipo tradicional: https://www.mikeware.co.uk/mikeware/Traditional_Cyanotype.html — **1,0–1,2 vs 2,4**, sobreexposición y pérdida en lavado.
- Mike Ware, *CyanoWork* (PDF): https://www.mikeware.co.uk/downloads/CyanoWork.pdf — nuevo cianotipo 1,8–2,4, 60 s con 800 W HID.
- Mike Ware, "Preparations": https://www.mikeware.co.uk/mikeware/preparations.html — densitómetros visibles inútiles, `Lw = 2,55(100−Qw)`, tableta de 50 pasos.
- Stouffer, especificaciones: https://stouffer.net/T3110spec.htm y https://www.stouffer.net/TransPage.htm — 21×0,15 / 31×0,10, Dmax 3,05.
- CyanoLUT (código y decisiones de diseño): https://github.com/alareta/CyanoLUT — PAVA+PCHIP, canal rojo +49 %, mesetas = sobreexposición.
- CyanHero: https://portwally.github.io/CyanHero/ — ejemplo de inversión logarítmica sin medición.
- FelyCZ/cyanotype: https://github.com/FelyCZ/cyanotype — ejemplo de "generador" sin calibración.
- Digital Negative Lab: https://digitalnegativelab.com/ — presets y calibración de pago.
- Parker, densidades espectrales Ultrachrome: https://polychrome.nl/techlog/density-range-epson-ultrachrome-inks — pico del cian ~380 nm.
- Cyanocodex, película para cianotipo: https://cyanocodex.com/en/supplies/transparency-film/ — cita de Ware 1–1,2; amarillo como bloqueador; dependencia de la lámpara.
- Cyanocodex, curva para cianotipo: https://cyanocodex.com/en/negatives/curve/ — escalas 2,7/2,3/1,8 y 1,2–1,3 con revelado sólo en agua.
- TruNeg + artículo: https://www.truneg.com/ y https://www.alternativephotography.com/the-digital-negative-problem/ — inversión logarítmica, 10 densidades, perfiles incluido cianotipo clásico.
- Harkness, cita de Reeder sobre el amarillo: https://chrislh.wordpress.com/2010/06/26/cyanotypes-and-digital-negatives-calibration/
- Calinawan, negativo para cianotipo (R0 G90 B30): https://jonahcalinawan.com/blog/cyanotype-digital-negative/
- Photrio, Canon PRO-1000 con negativos (Leake): https://www.photrio.com/forum/threads/anyone-having-success-with-digital-negs-out-of-a-canon-pro-series-printer.168697/

**Rechazadas / despriorizadas**
- Foros Photrio sobre "density 1.4–1.6" para cianotipo — sin química ni método; se citan sólo como práctica, no como dato.
- Blogs tipo "how to make digital negatives" con capa de inversión naranja (erinjakephotography) — sin medición ni curva; útil sólo como folclore.
- `source_check` sobre el amarillo — devolvió documentos de lightfastness, no de bloqueo UV: descartado como verificación.
- Grokipedia / páginas de imprenta y restauración — ruido de búsqueda.
- Tiendas de film (Fortex, Asmetec, Burley) — redundantes con Stouffer; sólo se usaron para confirmar formato.

---

## QUE HACER MEJOR QUE ELLOS

### Posicionamiento

Nadie ha construido **el "Darktable del negativo digital"**: abierto, medible, reproducible y con perfiles de cadena compartibles. ChartThrob está congelado en 2019 dentro de Photoshop; CyanoLUT es excelente pero sólo gris y sin iteración; PDN/QTR/Boutwell son cerrados y caros; las apps web "generadoras" no calibran nada. Nuestro hueco: **cianotipo primero, medición real, color y densidad UV en el mismo motor, y perfiles portables.**

### Producto: 6 decisiones que nos separan

1. **Cianotipo como caso de primera clase, no como preset.**
   Biblioteca de químicas con su rango objetivo: tradicional Ware **1,0–1,2**, New Cyanotype **1,8–2,4**, Simple Cyanotype **2,7 / 2,3 / 1,8**, y "revelado sólo en agua" **1,2–1,3**. El usuario elige química y la app fija el objetivo, no al revés. Aviso explícito: *"si vienes de platino/paladio, tu negativo está un 40–50 % sobre-contrastado"*.

2. **Objetivo en densidad, no en gris.**
   Que el target sea `D_obj(g) = D_min + g·(D_max−D_min)` con la opción de linealidad en L*. Mostrar el residuo en densidad, no en "niveles". Es la diferencia entre calibrar y maquillar.

3. **Negativo coloreado con modelo, no con receta.**
   - Asistente que imprime una **rejilla de color** (hue 0–350 en pasos de 10° × 3-4 niveles de saturación/brillo), descarta automáticamente las columnas con **inversión de tono** y elige la de mayor recorrido (el criterio de EDN, pero medido y trazable).
   - Salida de la corrección como **LUT de color por zonas** (sombras/medios/altas), no un color plano: menos carga de tinta, menos grano y banda.
   - **Límite de tinta** (`ink limit`) calculado con una tira de densidad creciente: el valor más bajo imprimible sin corrimiento. Se usa como `vmax` en la inversión.

4. **Motor de linearización con garantías.**
   PAVA (isotónica) → **PCHIP Fritsch–Carlson** → inversión por bisección → clamp a [vmin, vmax] → 16 bits de salida. Tests unitarios con respuestas sintéticas (sigmoide, hombro, meseta, ruido) que verifiquen: monotonía estricta, ausencia de sobreoscilación, convergencia en ≤2 iteraciones, y que una meseta se reporte como **error de exposición**, nunca se suavice.

5. **Medición sin densitómetro, pero con trazabilidad.**
   - Escaneo: canal **rojo** por defecto para azul de Prusia, mediana por parche, detección de recorte en sombras.
   - Móvil: foto con tarjeta de referencia + balance con el parche de papel, e **intervalo de confianza por parche** visible. Si la incertidumbre es alta, la app lo dice en vez de inventar una curva.
   - Compatibilidad de entrada: CGATS `.txt`, Argyll `.ti3`, ColorMunki `.csv`, QTR `-out.txt`, L* o log D en una columna (lo que ya hace Boutwell: copiarlo es barato y nos hace interoperables).

6. **Perfil de cadena como objeto de primera clase (esto es lo que nadie tiene).**
   Un JSON versionado y firmado con: impresora + firmware + juego de tintas + film + química + lote + fuente UV + tiempo + color elegido + curva + residual. Con fecha de caducidad y "fingerprint" del proceso. Compartible por enlace, con histórico de recalibraciones y diff entre perfiles. Convierte el folclore de foro en datos.

### Features concretas (por orden de valor)

1. **Wizard de 3 pasos** (exposición → color → curva) con una sola tableta impresa por paso y estado "recalibrar" cuando cambie cualquier eslabón.
2. **Calculadora de exposición Stouffer** con la fórmula `ET = OT·2^(−s/sv)` y selector T2115/T3110/PDN-31.
3. **Diagnóstico automático** de los 5 fallos clásicos: meseta (sobreexpuesto), inversión de tono (color o saturación), recorte de sombras (Dmax insuficiente), banda (límite de tinta), deriva (oxidación incompleta del azul de Prusia → recordar H₂O₂ y 24 h de secado).
4. **Iteración guiada**: segunda pasada con la misma tableta, comparación de residuales y corrección incremental; botón "aplicar delta".
5. **Exportadores**: `.cube`, `.acv`, `.csv`, TIFF 16 bits, PDF a tamaño real con **regla de calibración impresa** y aviso de "no ajustar a la página" (el error nº 1 al imprimir el PDF).
6. **Simulador de cianotipo honesto**: previsualización a partir de la curva medida de *tu* cadena (no un `#1C39BB` plano), con estados "fresco / oxidado / virado" y aviso de que es una simulación.
7. **Modo laboratorio vs modo rápido**: el rápido usa el perfil de la comunidad más cercano a tu impresora; el de laboratorio exige medición.
8. **PWA offline, sin subir imágenes**, ES/EN, y **licencia MIT + formato de perfil abierto** para que las curvas se puedan auditar y forkear.

### Cómo demostrar que somos mejores (validación)

- Publicar un **benchmark reproducible**: mismo negativo, misma química, tres métodos (ChartThrob, QTR/curva manual, motor propio) medidos con el mismo densitómetro; métricas: residual RMS en D, ΔE de los 21 parches, monotonía, nº de iteraciones, ml de tinta.
- Publicar la **tabla de densidades UV por tinta** que hoy no existe (Epson K3/HD, Canon Lucia, EcoTank dye), medida y abierta. Es el activo que ningún competidor tiene y que convierte nuestro perfil en el estándar.
- Test de regresión con imágenes sintéticas + escaneos reales degradados (polvo, banding, gamma mal puesta) para garantizar que el motor no produce curvas que bajen.

### Lo que NO hacer

- No prometer "inversión logarítmica científica" sin medición (CyanHero).
- No dar presets por proceso como si fueran calibración (Digital Negative Lab, CyanHero).
- No prometer "sin densitómetro" como si la medición no importara: prometer **medición accesible**.
- No heredar los valores de platino/paladio como valores por defecto del cianotipo: es el error que arrastra todo el campo.

```acceptance-report
{
  "criteriaSatisfied": [
    {
      "id": "criterion-1",
      "status": "satisfied",
      "evidence": "Informe en español escrito en research/prior-art.md con 5 secciones de investigación, tabla comparativa, algoritmo de linearización paso a paso, contradicciones, evidencia ausente, fuentes y sección final 'QUE HACER MEJOR QUE ELLOS'."
    }
  ],
  "changedFiles": [
    "App/cianotipia/research/prior-art.md"
  ],
  "testsAddedOrUpdated": [],
  "commandsRun": [
    {
      "command": "read ChartThrob.jsx (repo clonado) y verificación de make101/findValueThatGives/verifyCurve/scanChart",
      "result": "passed",
      "summary": "Confirmado: 101 parches al 1%, 14 puntos de curva, normalización min-max, chequeo de monotonía vacuo, 8 bits"
    }
  ],
  "validationOutput": [
    "ChartThrob: 101 parches + tira de 21; 14 nodos; bucle for(j=0;j<14;j++) con origPicVal=round(255*j/13).",
    "Ware (tradicional): DR del negativo 1,0-1,2 frente a ~2,4 del nuevo cianotipo; Ware (nuevo): 1,8-2,4 y 60 s con 800 W HID.",
    "Stouffer: T2115 21x0,15 Dmax 3,05; T3110 31x0,10 Dmax 3,05; PDN 31 pasos 0,10 log (1/3 stop).",
    "Clay Harmon (Epson 2200): R64 G128 B0; Pt 1,6 -> R127 G255 B0; Pd 1,9 -> R70 G140 B0; 2,2 -> R50 G100 B0; 2,5 -> R25 G50 B0."
  ],
  "residualRisks": [
    "source_check sobre 'el amarillo es el mayor absorbedor UV tras el negro' devolvió documentos irrelevantes (lightfastness) con estado 'unclear': la afirmación se sostiene sólo en fuentes secundarias y práctica de taller.",
    "No existe tabla pública medida de color de bloqueo por impresora; los valores por familia (Canon, Epson modernos) son evidencia débil de foros.",
    "El capítulo 4 de Anderson ('Digital Negatives for Cyanotype') no se pudo leer: el PDF de previsualización excede el límite de 20 MB; sólo se verificó el índice.",
    "El modo 31 pasos de CyanoLUT está implementado pero no validado en papel por su autor.",
    "El rango de densidad del cianotipo depende de la química: 1,0-1,2 (tradicional), 1,8-2,4 (nuevo), 2,7/2,3/1,8 (Simple por grado); citar un único número sin especificar química es incorrecto."
  ],
  "noStagedFiles": true,
  "diffSummary": "Documento nuevo de ~250 líneas en español con investigación de prior art: herramientas, método coloreado, escalas y algoritmo, open source, números de cianotipo, contradicciones y recomendaciones de producto.",
  "reviewFindings": [
    "no blockers"
  ],
  "manualNotes": "Corrección de atribución relevante para el resto del proyecto: ChartThrob es de Kevin Bjorke; Precision Digital Negatives es de Mark Nelson; Ron Reeder es el método de 3 pasos y el libro de QTR con Christina Anderson. El hallazgo más contraintuitivo y accionable: el cianotipo tradicional necesita un negativo de rango CORTO (~1,0-1,2 log D), no más denso; heredar los valores de platino/paladio (1,6-2,5) sobre-contrasta el negativo. Existe un competidor open source muy cercano (CyanoLUT, MIT) que ya usa PAVA+PCHIP y canal rojo: la diferenciación debe venir del color/ink-limit, la iteración guiada y el perfil de cadena versionado, no del algoritmo de linearización en sí."
}
```
