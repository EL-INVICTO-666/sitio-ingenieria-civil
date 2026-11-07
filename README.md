# Ing. Kevin — sitio web y calculadoras de ingeniería civil

Sitio estático (HTML, CSS y JavaScript sin servidor). Rediseñado con la skill
**design-taste-frontend** (tasteskill 2.5): paleta hueso, verde y chocolate,
Source Serif 4 y Libre Franklin.

## Cómo verlo

Abre `index.html` con doble clic, o levanta un servidor local:

```bash
python -m http.server 8090
```

## Estructura

```text
index.html               Portada: servicios, herramientas, proceso y preguntas
herramientas.html        Calculadoras (zapata aislada, vigas, concreto, pendientes)
assets/                  Kit de diseño de la skill (system.css, ui, motion, layout...)
assets/img/              Imágenes reales de la memoria de cálculo y la tabla resumen
css/tema-nuevo.css       Tema nuevo de herramientas.html (se carga tras styles.css)
css/styles.css           Estilos base de las calculadoras
js/footings.js           Cálculo de la zapata aislada (E.060 / E.050)
js/footings-latex.js     Memoria de cálculo en LaTeX (se compila en texlive.net)
js/footings-summary.js   Tabla resumen de la zapata
js/footings-combined-engine.js  Cálculo de la zapata combinada (libro §1.5, E.060 / E.050)
js/footings-combined.js  Interfaz, croquis, diagramas V/M y memoria de la zapata combinada
js/footings-combined-latex.js  Memoria PDF (LaTeX) y tabla resumen de la zapata combinada
css/combinada.css        Estilos del panel de zapata combinada
respaldo-diseno-anterior/  Copia del diseño anterior (index, herramientas, estilos)
```

## Pendiente por completar con tus datos reales

- Correo de contacto: hoy es `consultas@ing-kevin.example` (index.html, 5 enlaces `mailto:`).
- Fotografías de tus obras: la biblioteca de la skill no tiene construcción, así que
  la portada usa tu trabajo real (memoria PDF y tabla resumen) como imagen.
  Cuando tengas fotos, ponlas en `assets/img/`.
- Proyectos, cifras y trayectoria: se quitaron los de ejemplo del diseño anterior.
