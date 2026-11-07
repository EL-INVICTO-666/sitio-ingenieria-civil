/**
 * ===================================================================
 * MEMORIA DE CÁLCULO EN LaTeX - ZAPATA AISLADA
 * Toma los resultados de js/footings.js (window.footingReport),
 * arma el documento .tex y lo compila con pdfLaTeX en texlive.net
 * (mismo método que Pórtica: formulario oculto + visor de PDF).
 * ===================================================================
 */

(function () {
  'use strict';

  const F = (x, n = 2) => Number(x).toFixed(n);

  // Varilla: "3/4" -> $\phi\,\tfrac{3}{4}^{\prime\prime}$
  function texBar(b) {
    const k = String(b.key);
    const frac = k.includes('/') ? `\\tfrac{${k.split('/')[0]}}{${k.split('/')[1]}}` : k;
    return `$\\phi\\,${frac}^{\\prime\\prime}$`;
  }

  // Nombre de combinación -> matemática: "1.25(D+L)−E" -> $1.25(D+L)-E$
  const texCombo = n => `$${String(n).replace(/−/g, '-')}$`;
  // Rótulo de las combinaciones de servicio del Paso 4 (como en la hoja del curso): 4.1 / 4.2 / 4.3
  const texFormula = f => String(f).replace(/ − /g, ' $-$ ');
  const tituloServ = t => `${t.id}~${t.titulo} (${texFormula(t.formula)})`;
  const cortoServ = t => `${t.id}~${texFormula(t.formula).replace(/ /g, '')}`;

  const ok = c => (c ? '\\textcolor{okgreen}{\\textbf{Cumple}}' : '\\textcolor{badred}{\\textbf{No cumple}}');

  // ---------- Piezas compartidas con la memoria de la zapata combinada ----------
  // Figura del gancho (Paso 1): render + cotas. Píxeles de la imagen original (1672 x 941).
  function figGanchoTex() {
    const W = 1672, H = 941;
    const P = (x, y) => '(' + (x / W).toFixed(4) + ',' + (1 - y / H).toFixed(4) + ')';
    const L2 = (a, b) => String.raw`\draw[white, line width=2.4pt] ${a} -- ${b}; \draw[dimcol, line width=0.8pt] ${a} -- ${b};`;
    const AR = (a, b) => String.raw`\draw[white, line width=2.4pt] ${a} -- ${b}; \draw[dimcol, {Stealth[length=3pt]}-{Stealth[length=3pt]}, line width=0.8pt] ${a} -- ${b};`;
    const LD = (a, b) => String.raw`\draw[white, line width=2.4pt] ${a} -- ${b}; \draw[dimcol, -{Stealth[length=3pt]}, line width=0.8pt] ${a} -- ${b};`;
    const LB = (p, txt) => String.raw`\node[fill=white, rounded corners=1pt, inner sep=2pt, text=dimcol, font=\small\bfseries] at ${p} {${txt}};`;
    return [
      // ldh: de la cara superior de la zapata al extremo inferior del gancho
      L2(P(560, 518), P(650, 518)), L2(P(580, 759), P(690, 759)), AR(P(620, 518), P(620, 759)), LB(P(552, 640), '$l_{dh}$'),
      // hz: espesor total, de la cara superior a la cara inferior
      L2(P(1465, 518), P(1600, 518)), L2(P(1465, 820), P(1600, 820)), AR(P(1575, 518), P(1575, 820)), LB(P(1632, 669), '$h_z$'),
      // r: recubrimiento libre inferior
      L2(P(330, 790), P(450, 790)), L2(P(330, 820), P(450, 820)), AR(P(400, 790), P(400, 820)), LB(P(300, 805), '$r$'),
      // db: diámetro de la varilla de la malla inferior
      LD(P(1192, 705), P(1192, 770)), LB(P(1192, 690), '$d_b$'),
      // R: radio de doblez del gancho
      LD(P(1010, 700), P(912, 742)), LB(P(1030, 690), '$R$')
    ].join('\n');
  }

  // Figura del relleno (Paso 2): render + cotas con sus valores. o = { hs_m, hz_m, practico, gamma, Df, sc, qa_t }
  function figRellenoTex(o) {
    const W = 1672, H = 941;
    const P = (x, y) => '(' + (x / W).toFixed(4) + ',' + (1 - y / H).toFixed(4) + ')';
    const L2 = (a, b) => String.raw`\draw[white, line width=2.4pt] ${a} -- ${b}; \draw[dimcol, line width=0.8pt] ${a} -- ${b};`;
    const AR = (a, b) => String.raw`\draw[white, line width=2.4pt] ${a} -- ${b}; \draw[dimcol, {Stealth[length=3pt]}-{Stealth[length=3pt]}, line width=0.8pt] ${a} -- ${b};`;
    const LD = (a, b) => String.raw`\draw[white, line width=2.4pt] ${a} -- ${b}; \draw[dimcol, -{Stealth[length=3pt]}, line width=0.8pt] ${a} -- ${b};`;
    const LB = (p, txt, anc) => String.raw`\node[anchor=${anc || 'center'}, fill=white, rounded corners=1pt, inner sep=2pt, text=dimcol, font=\small\bfseries] at ${p} {${txt}};`;
    const v = (x, n) => Number(x).toFixed(n);
    const gy = 315, ty = 557, by = 848;
    const { hs_m, hz_m } = o;
    const pesos = o.practico
      ? [LB(P(145, 385), String.raw`$\gamma_{prom} = 2.05\ \mathrm{t/m^3}$`, 'west')]
      : [LB(P(145, 385), String.raw`$\gamma_s = ${v(o.gamma, 2)}\ \mathrm{t/m^3}$`, 'west'),
         LB(P(215, 640), String.raw`$\gamma_c = 2.40\ \mathrm{t/m^3}$`, 'west')];
    return [
      // hs (suelo sobre la zapata) y hz (espesor), apiladas a la izquierda
      L2(P(90, gy), P(150, gy)), L2(P(90, ty), P(190, ty)), L2(P(90, by), P(190, by)),
      AR(P(120, gy), P(120, ty)), LB(P(145, 470), String.raw`$h_s = ${v(hs_m, 2)}\ \mathrm{m}$`, 'west'),
      AR(P(120, ty), P(120, by)), LB(P(145, 730), String.raw`$h_z = ${v(hz_m, 2)}\ \mathrm{m}$`, 'west'),
      // Df: del nivel del suelo a la base de la zapata, a la derecha
      L2(P(1495, gy), P(1620, gy)), L2(P(1490, by), P(1620, by)),
      AR(P(1590, gy), P(1590, by)), LB(P(1568, 450), String.raw`$D_f = ${v(o.Df, 2)}\ \mathrm{m}$`, 'east'),
      // s/c: sobrecarga sobre el piso terminado
      LD(P(330, 238), P(330, 309)), LD(P(450, 238), P(450, 309)), LD(P(570, 238), P(570, 309)), LB(P(450, 205), String.raw`$s/c = ${v(o.sc, 2)}\ \mathrm{t/m^2}$`),
      LD(P(1130, 238), P(1130, 309)), LD(P(1250, 238), P(1250, 309)), LD(P(1370, 238), P(1370, 309)), LB(P(1250, 205), String.raw`$s/c = ${v(o.sc, 2)}\ \mathrm{t/m^2}$`),
      // pesos propios: relleno y concreto
      ...pesos,
      // q_adm: reacción admisible del terreno en la base
      LD(P(300, 925), P(300, 856)), LD(P(480, 925), P(480, 856)), LD(P(1220, 925), P(1220, 856)), LD(P(1400, 925), P(1400, 856)),
      LB(P(850, 900), String.raw`$q_{adm} = ${v(o.qa_t, 2)}\ \mathrm{t/m^2}$`)
    ].join('\n');
  }

  const PREAMBULO = String.raw`\documentclass[11pt]{article}
\usepackage[utf8]{inputenc}
\usepackage{amsmath,amssymb}
\usepackage{booktabs}
\usepackage{array}
\usepackage{tikz}
\usetikzlibrary{arrows.meta}
\definecolor{dimcol}{HTML}{3D4AA0}
\usepackage[a4paper, top=2.6cm, bottom=2cm, left=2.2cm, right=2.2cm, headheight=14pt]{geometry}
\usepackage[most]{tcolorbox}
\usepackage[T1]{fontenc}
\usepackage[scaled=0.92]{helvet}
\usepackage{lmodern}
\usepackage{newpxtext,newpxmath}
\usepackage{graphicx}
\usepackage{adjustbox}
\newcommand{\eqline}[1]{\[\adjustbox{max width=\linewidth}{$\displaystyle #1$}\]}
\usepackage{xcolor}
\usepackage{colortbl}
\usepackage{titlesec}
\usepackage{enumitem}
\usepackage{fancyhdr}
% Paleta del diseño Pórtica / UNSCH-RESI
\definecolor{porticaaccent}{HTML}{9A6412}
\definecolor{porticaaccent2}{HTML}{3D4AA0}
\definecolor{porticaink}{HTML}{1B2333}
\definecolor{primary}{HTML}{1B2333}
\definecolor{secondary}{HTML}{3D4AA0}
\definecolor{darkgray}{RGB}{51, 65, 85}
\definecolor{bgsoft}{RGB}{248, 250, 252}
\definecolor{okgreen}{RGB}{22,128,60}
\definecolor{govfill}{HTML}{FFE8A3}
\definecolor{badred}{RGB}{200,30,30}
\newcommand{\cajazul}[1]{{\color{blue}\boxed{\color{black}#1}}}
\setlist{noitemsep, topsep=2pt, parsep=0pt, partopsep=0pt}
\newcommand{\zlogo}{{\fontfamily{lmr}\selectfont\bfseries\color{porticaaccent2}\scalebox{1.2}{Z}\color{porticaink}APATAS}}
\pagestyle{fancy}
\fancyhf{}
\fancyhead[L]{\small\zlogo}
\fancyhead[R]{\footnotesize\itshape\color{darkgray}Cálculo de Estructuras · Cimentaciones}
\renewcommand{\headrulewidth}{0.7pt}
\renewcommand{\headrule}{{\color{porticaaccent2!45}\hrule height \headrulewidth}}
\cfoot{\small\color{darkgray}-- \thepage{} --}
\titleformat{\section}{\Large\bfseries\color{primary}}{\thesection}{0.6em}{}[\vspace{1pt}\color{secondary}\hrule height 1pt]
\titleformat{\subsection}{\large\bfseries\color{secondary}}{\thesubsection}{0.5em}{}
\titleformat{\subsubsection}{\large\bfseries\color{secondary}}{\thesubsubsection}{0.5em}{}
\titlespacing*{\section}{0pt}{10pt}{4pt}
\titlespacing*{\subsection}{0pt}{8pt}{3pt}
\titlespacing*{\subsubsection}{0pt}{6pt}{2pt}
\setlength{\parindent}{0pt}
\setlength{\parskip}{0pt}
\setlength{\topsep}{2pt}
\setlength{\abovedisplayskip}{3pt}
\setlength{\belowdisplayskip}{3pt}
\setlength{\abovedisplayshortskip}{2pt}
\setlength{\belowdisplayshortskip}{2pt}
\renewcommand{\arraystretch}{1.15}
\newtcolorbox{porticatitulobox}{enhanced, breakable=false,
  colback=porticaaccent2!6, colframe=porticaaccent2, boxrule=0pt, arc=0pt,
  top=10pt, bottom=10pt, left=14pt, right=14pt,
  borderline west={3.2pt}{0pt}{porticaaccent2},
  borderline north={0.7pt}{0pt}{porticaaccent2!55},
  borderline south={0.7pt}{0pt}{porticaaccent2!55},
  frame hidden, before skip=6pt, after skip=11pt}
\newcommand{\tituloMetodo}[2]{%
  \begin{porticatitulobox}
    \centering
    {\bfseries\LARGE\color{porticaaccent2} #1}\\[4pt]
    {\small\bfseries\color{darkgray} #2}\\[5pt]
    {\footnotesize\color{porticaaccent2!70}\zlogo\ \itshape\color{darkgray}· memoria de cálculo paso a paso}
  \end{porticatitulobox}}
\newtcolorbox{porticastep}[2]{breakable, enhanced, colback=white, colframe=porticaaccent,
  boxrule=0.5pt, leftrule=3.2pt, arc=0pt, left=7pt, right=7pt, top=8pt, bottom=6pt,
  before skip=9pt, after skip=9pt,
  title={\textbf{Paso #1}\hspace{0.4em}\textnormal{#2}}, coltitle=white,
  colbacktitle=porticaaccent, fonttitle=\bfseries\small,
  attach boxed title to top left={xshift=8pt, yshift=-\tcboxedtitleheight/2},
  boxed title style={colback=porticaaccent, arc=0pt, boxrule=0pt}}
\newtcolorbox{porticastepx}[1]{breakable, enhanced, colback=white, colframe=porticaaccent,
  boxrule=0.5pt, leftrule=3.2pt, arc=0pt, left=7pt, right=7pt, top=8pt, bottom=6pt,
  before skip=9pt, after skip=9pt,
  title={\textbf{#1}}, coltitle=white,
  colbacktitle=porticaaccent, fonttitle=\bfseries\small,
  attach boxed title to top left={xshift=8pt, yshift=-\tcboxedtitleheight/2},
  boxed title style={colback=porticaaccent, arc=0pt, boxrule=0pt}}
\newtcolorbox{porticabanner}{breakable, colback=porticaaccent!7, colframe=porticaaccent,
  boxrule=0.8pt, arc=0pt, left=9pt, right=9pt, top=7pt, bottom=7pt, before skip=4pt, after skip=10pt}
\newtcolorbox{govbox}{breakable=false, colback=govfill, colframe=porticaaccent, boxrule=0.9pt, arc=2pt, left=6pt, right=6pt, top=3pt, bottom=3pt}
\newtcolorbox{porticafig}{breakable=false, colback=gray!3, colframe=gray!45,
  boxrule=0.4pt, arc=1.5pt, left=3pt, right=3pt, top=4pt, bottom=4pt, before skip=6pt, after skip=6pt}`;

  function buildFootingLatex(r) {
    const i = r.inp, p = r.plan, e = r.est;
    const hz = e.hz;
    const hz_m = hz / 100;
    const P = i.PD_ton + i.PL_ton;
    const M = i.MD_ton + i.ML_ton;
    const qa_t = i.qa_kgcm2 * 10;
    const hayE = i.PE_ton > 0 || i.ME_ton > 0;
    const sqfc = Math.sqrt(i.fc);
    const geoOK = p.geoOK;
    const bx = texBar(r.barX), by = texBar(r.barY);
    const g = p.geo;

    // ---------- Paso 2: presión neta ----------
    let paso2;
    if (i.metodoPractico) {
      paso2 = String.raw`Se usa el método práctico (peso específico promedio suelo--concreto $\gamma_{prom}=2.05\ \mathrm{t/m^3}$):
\[ q_{adm,neto} = q_{adm} - \gamma_{prom} D_f - s/c = ${F(qa_t)} - 2.05(${F(i.Df_m)}) - ${F(i.sc_tonm2)} = \mathbf{${F(p.q_neto)}}\ \mathrm{t/m^2} \]`;
    } else {
      paso2 = String.raw`Con $h_z=${F(hz_m)}\ \mathrm{m}$ la altura de relleno es $h_s = D_f - h_z = ${F(i.Df_m)} - ${F(hz_m)} = ${F(p.hs_m)}\ \mathrm{m}$.
\begin{align*}
 \text{Peso de la zapata} &= ${F(hz_m)}\times 2.40 = ${F(hz_m * 2.4)}\ \mathrm{t/m^2}\\
 \text{Peso del relleno} &= ${F(p.hs_m)}\times ${F(i.gamma_m)} = ${F(p.hs_m * i.gamma_m)}\ \mathrm{t/m^2}\\
 \text{Sobrecarga} &= ${F(i.sc_tonm2)}\ \mathrm{t/m^2}
\end{align*}
\[ q_{adm,neto} = q_{adm} - \gamma_s h_s - \gamma_c h_z - s/c = ${F(qa_t)} - ${F(p.hs_m * i.gamma_m)} - ${F(hz_m * 2.4)} - ${F(i.sc_tonm2)} = \mathbf{${F(p.q_neto)}}\ \mathrm{t/m^2} \]`;
    }

    // ---------- Paso 4: tabla de presiones en servicio ----------
    const filasServ = p.tabla.map(t => {
      const ratio = t.qmax / t.qlim;
      // símbolo según las dos presiones tal como se muestran (2 decimales)
      const dif = Number(F(t.qmax)) - Number(F(t.qlim));
      const sim = Math.abs(dif) < 0.005 ? '=' : (dif < 0 ? '<' : '>');
      return `${cortoServ(t)} & ${F(t.P, 1)} & ${F(t.M, 1)} & ${F(t.e, 4)} & ${t.caso} & ${F(t.qmax)} & $${sim}$ & ${F(t.qlim)} & ${ok(ratio <= 1)} \\\\`;
    }).join('\n');

    // Cálculo de q_max de cada combinación (antes de la tabla): los datos van uno bajo otro a la izquierda
    // y q_max a la derecha. e = M/P se muestra con su signo; q_max usa |e|.
    // q_lim = 1.20 q_adm,neto es igual en 4.2 y 4.3: se escribe una sola vez, antes de 4.2.
    const calcServ = p.tabla.map(t => {
      const Bz = p.B, Lz = p.L;
      const nucleo = Bz / 6;
      const ea = Math.abs(t.e);
      const dentro = ea <= nucleo + 1e-9;
      const dif = Number(F(t.qmax)) - Number(F(t.qlim));
      const sim = Math.abs(dif) < 0.005 ? '=' : (dif < 0 ? '<' : '>');
      const rel = dentro ? (t.caso === 'B' ? '=' : String.raw`\le`) : '>';
      const limNom = t.f === 1 ? String.raw`q_{adm,neto}` : String.raw`q_{lim}`;
      let formula;
      if (!isFinite(t.qmax)) {
        formula = String.raw`q_{max} &\to \infty \quad (|e| \ge B/2:\ \text{la zapata vuelca})`;
      } else if (t.caso === 'C') {
        formula = String.raw`q_{max} &= \frac{2P}{3L\,(B/2-|e|)}\\
 &= \frac{2(${F(t.P, 1)})}{3(${F(Lz)})\,(${F(Bz)}/2-${F(ea, 4)})}\\
 &= \mathbf{${F(t.qmax)}}\ \mathrm{t/m^2}`;
      } else if (t.caso === 'B') {
        formula = String.raw`q_{max} &= \frac{2P}{BL}\\
 &= \frac{2(${F(t.P, 1)})}{${F(Bz)}\times ${F(Lz)}}\\
 &= \mathbf{${F(t.qmax)}}\ \mathrm{t/m^2}`;
      } else {
        formula = String.raw`q_{max} &= \frac{P}{BL}\left(1+\frac{6|e|}{B}\right)\\
 &= \frac{${F(t.P, 1)}}{${F(Bz)}\times ${F(Lz)}}\left(1+\frac{6(${F(ea, 4)})}{${F(Bz)}}\right)\\
 &= \mathbf{${F(t.qmax)}}\ \mathrm{t/m^2}`;
      }
      const primeraSismo = t.f !== 1 && p.tabla.find(x => x.f !== 1) === t;
      const limSismo = primeraSismo ? String.raw`\par\bigskip\noindent Para las combinaciones con sismo (${p.tabla.filter(x => x.f !== 1).map(x => x.id).join(' y ')}), la E.050 permite aumentar la presión admisible en 20\%:
\[ q_{lim} = 1.20\,q_{adm,neto} = 1.20(${F(p.q_neto)}) = ${F(t.qlim)}\ \mathrm{t/m^2} \]` : '';
      return String.raw`${limSismo}\par\bigskip\noindent\textbf{${tituloServ(t)}}\par\nopagebreak\vspace{2pt}
\noindent\begin{minipage}[t]{0.40\linewidth}
\noindent$\begin{array}{@{}l@{\;}l@{}}
 P_{serv} & = ${F(t.P, 1)}\ \mathrm{t}\\
 M_{serv} & = ${F(t.M, 1)}\ \mathrm{t\cdot m}\\
 e = M/P & = ${F(t.e, 4)}\ \mathrm{m}\\
 B/6 & = ${F(nucleo, 3)}\ \mathrm{m}\\
 |e| & ${rel} B/6\ \Rightarrow\ \text{Caso ${t.caso}}
\end{array}$
\end{minipage}\hfill
\begin{minipage}[t]{0.57\linewidth}
\noindent$\displaystyle\begin{aligned}
 ${formula}
\end{aligned}$
\par\smallskip
$q_{max}=${F(t.qmax)}\ ${sim}\ ${limNom}=${F(t.qlim)}\ \mathrm{t/m^2}$ \quad ${ok(t.qmax / t.qlim <= 1)}
\end{minipage}`;
    }).join('\n');

    // ---------- Paso 5: presión última de diseño (cargas amplificadas) ----------
    const gobUlt = e.presUlt.reduce((a, b) => (b.qumax > a.qumax ? b : a), e.presUlt[0]);
    const filasUlt = e.presUlt.map(t =>
      `${t === gobUlt ? '\\rowcolor{govfill}' : ''}${texCombo(t.name)} & ${F(t.P, 1)} & ${F(t.M, 2)} & ${F(t.e, 4)} & ${F(t.qumax)} \\\\`
    ).join('\n');

    // Deducción de P_u y M_u de cada combinación, con los valores de entrada sustituidos
    const PD = i.PD_ton, PL = i.PL_ton, MD = i.MD_ton, ML = i.ML_ton, PE = i.PE_ton, ME = i.ME_ton;
    const derivUlt = {
      '1.4D+1.7L': [
        String.raw`P_u = 1.4P_D + 1.7P_L = 1.4(${F(PD, 1)}) + 1.7(${F(PL, 1)})`,
        String.raw`M_u = 1.4M_D + 1.7M_L = 1.4(${F(MD, 1)}) + 1.7(${F(ML, 1)})`],
      '1.25(D+L)+E': [
        String.raw`P_u = 1.25(P_D+P_L) + P_E = 1.25(${F(PD, 1)}+${F(PL, 1)}) + ${F(PE, 1)}`,
        String.raw`M_u = 1.25(M_D+M_L) + M_E = 1.25(${F(MD, 1)}+${F(ML, 1)}) + ${F(ME, 1)}`],
      '0.9D+E': [
        String.raw`P_u = 0.9P_D + P_E = 0.9(${F(PD, 1)}) + ${F(PE, 1)}`,
        String.raw`M_u = 0.9M_D + M_E = 0.9(${F(MD, 1)}) + ${F(ME, 1)}`],
      '0.9D−E': [
        String.raw`P_u = 0.9P_D - P_E = 0.9(${F(PD, 1)}) - ${F(PE, 1)}`,
        String.raw`M_u = 0.9M_D - M_E = 0.9(${F(MD, 1)}) - ${F(ME, 1)}`],
      '1.25(D+L)−E': [
        String.raw`P_u = 1.25(P_D+P_L) - P_E = 1.25(${F(PD, 1)}+${F(PL, 1)}) - ${F(PE, 1)}`,
        String.raw`M_u = 1.25(M_D+M_L) - M_E = 1.25(${F(MD, 1)}+${F(ML, 1)}) - ${F(ME, 1)}`]
    };

    // Dibujo de la combinación que rige: zapata con su columna, momento y diagrama de presiones.
    // e ≥ 0: presión máxima a la derecha (M horario); e < 0: a la izquierda (M antihorario).
    // Se acota el lado mayor del diagrama (q_max).
    function dibujoPresiones(t, k) {
      if (!isFinite(t.qumax) || !(t.qumax > 0)) return '';
      const Bz = p.B, W = 7.2, s = W / Bz, hF = 0.9, hC = 1.0, hMax = 1.7;
      const cw = Math.max(0.45, Math.min(W * 0.5, i.cx_cm / 100 * s));
      const xc = W / 2, x0 = xc - cw / 2, top = hF + hC;
      const pos = t.e >= 0;
      const ea = Math.abs(t.e);
      // altura del diagrama (hacia abajo) en cada x
      let h;
      if (t.caso === 'C') {
        const a = Math.min(Bz, 3 * (Bz / 2 - ea)) * s;      // longitud en contacto
        h = x => (pos ? Math.max(0, (x - (W - a)) / a) : Math.max(0, ((a - x) / a))) * hMax;
      } else {
        const hMin = hMax * Math.max(0, t.qumin || 0) / t.qumax;
        const hL = pos ? hMin : hMax, hR = pos ? hMax : hMin;
        h = x => hL + (hR - hL) * x / W;
      }
      const N = 9, flechas = [];
      for (let j = 0; j <= N; j++) {
        const x = j * W / N, y = h(x);
        if (y > 0.12) flechas.push(String.raw`\draw[-{Stealth[length=4pt]}, porticaaccent2] (${F(x, 3)},${F(-y, 3)}) -- (${F(x, 3)},-0.04);`);
      }
      const pts = [];
      for (let j = 0; j <= 40; j++) { const x = j * W / 40; pts.push(`(${F(x, 3)},${F(-h(x), 3)})`); }
      const R = Math.max(0.75, cw / 2 + 0.45), cy = top + 0.15;
      const arco = pos
        ? String.raw`\draw[thick, -{Stealth[length=6pt]}, porticaaccent] (${F(xc + R * Math.cos(160 * Math.PI / 180), 3)},${F(cy + R * Math.sin(160 * Math.PI / 180), 3)}) arc[start angle=160, end angle=20, radius=${F(R, 3)}];`
        : String.raw`\draw[thick, -{Stealth[length=6pt]}, porticaaccent] (${F(xc + R * Math.cos(20 * Math.PI / 180), 3)},${F(cy + R * Math.sin(20 * Math.PI / 180), 3)}) arc[start angle=20, end angle=160, radius=${F(R, 3)}];`;
      const xCota = pos ? W + 0.35 : -0.35;
      return String.raw`
\begin{center}
\begin{tikzpicture}[font=\small, >=Stealth]
\fill[gray!12] (0,0) rectangle (${F(W, 3)},${hF});
\draw[thick] (0,0) rectangle (${F(W, 3)},${hF});
\fill[gray!35] (${F(x0, 3)},${hF}) rectangle (${F(x0 + cw, 3)},${F(top, 3)});
\draw[thick] (${F(x0, 3)},${hF}) -- (${F(x0, 3)},${F(top, 3)}); \draw[thick] (${F(x0 + cw, 3)},${hF}) -- (${F(x0 + cw, 3)},${F(top, 3)});
\draw[thick] (${F(x0 - 0.3, 3)},${F(top, 3)}) -- (${F(xc - 0.1, 3)},${F(top, 3)}) -- (${F(xc - 0.03, 3)},${F(top + 0.2, 3)}) -- (${F(xc + 0.03, 3)},${F(top - 0.2, 3)}) -- (${F(xc + 0.1, 3)},${F(top, 3)}) -- (${F(x0 + cw + 0.3, 3)},${F(top, 3)});
${arco}
\node[porticaaccent, above] at (${F(xc, 3)},${F(cy + R, 3)}) {$M_{u${k}} = ${F(t.M, 2)}\ \mathrm{t\cdot m}$};
\node[anchor=east] at (${F(x0 - 0.35, 3)},${F(top - 0.35, 3)}) {$P_{u${k}} = ${F(t.P, 1)}\ \mathrm{t}$};
\fill[porticaaccent2!15] (0,0) -- ${pts.join(' -- ')} -- (${F(W, 3)},0) -- cycle;
\draw[porticaaccent2, thick] ${pts.join(' -- ')};
\draw[porticaaccent2] (0,0) -- (0,${F(-h(0), 3)}); \draw[porticaaccent2] (${F(W, 3)},0) -- (${F(W, 3)},${F(-h(W), 3)});
${flechas.join('\n')}
\draw[|<->|, dimcol] (${F(xCota, 3)},0) -- (${F(xCota, 3)},${F(-hMax, 3)}) node[midway, ${pos ? 'right' : 'left'}, text=dimcol] {$q_{u${k},max} = ${F(t.qumax)}\ \mathrm{t/m^2}$};
\draw[|<->|] (0,${F(-hMax - 0.45, 3)}) -- (${F(W, 3)},${F(-hMax - 0.45, 3)}) node[midway, below] {$B = ${F(Bz)}\ \mathrm{m}$ \quad ($e = ${F(t.e, 4)}$ m)};
\end{tikzpicture}
\end{center}`;
    }

    const calcUlt = e.presUlt.map((t, idx) => {
      const Bz = p.B, Lz = p.L;
      const k = idx + 1;
      const nucleo = Bz / 6;
      const ea = Math.abs(t.e);
      const caso = ea >= Bz / 2 ? 'vuelco' : (ea <= nucleo + 1e-9 ? (Math.abs(ea - nucleo) < 1e-6 ? 'B' : 'A') : 'C');
      // P_u, M_u y q_u numerados con la combinación: P_{u3}, M_{u3}, q_{u3,max}
      const num = s => s.replace(/P_u\b/g, `P_{u${k}}`).replace(/M_u\b/g, `M_{u${k}}`);
      const d = (derivUlt[t.name] || [String.raw`P_u = ${F(t.P, 1)}`, String.raw`M_u = ${F(t.M, 2)}`]).map(num);
      const rel = caso === 'C' || caso === 'vuelco' ? '>' : (caso === 'B' ? '=' : String.raw`\le`);
      const Pk = `P_{u${k}}`, qk = `q_{u${k},max}`;
      let fq;
      if (caso === 'vuelco') {
        fq = String.raw`|e| \ge B/2:\ \text{la zapata vuelca}`;
      } else if (caso === 'C') {
        fq = String.raw`${qk} = \frac{2${Pk}}{3L\,(B/2-|e|)} = \frac{2(${F(t.P, 1)})}{3(${F(Lz)})\,(${F(Bz)}/2-${F(ea, 4)})} = \mathbf{${F(t.qumax)}}\ \mathrm{t/m^2}`;
      } else if (caso === 'B') {
        fq = String.raw`${qk} = \frac{2${Pk}}{BL} = \frac{2(${F(t.P, 1)})}{${F(Bz)}\times ${F(Lz)}} = \mathbf{${F(t.qumax)}}\ \mathrm{t/m^2}`;
      } else {
        fq = String.raw`${qk} = \frac{${Pk}}{BL}\left(1+\frac{6|e|}{B}\right) = \frac{${F(t.P, 1)}}{${F(Bz)}\times ${F(Lz)}}\left(1+\frac{6(${F(ea, 4)})}{${F(Bz)}}\right) = \mathbf{${F(t.qumax)}}\ \mathrm{t/m^2}`;
      }
      const rige = t === gobUlt;
      const cuerpo = String.raw`\paragraph{Combinación ${k}: ${texCombo(t.name)}.}${rige ? String.raw` \colorbox{govfill}{\textbf{\ Rige el diseño\ }}` : ''}
\begin{align*}
 ${d[0]} &= ${F(t.P, 1)}\ \mathrm{t}\\
 ${d[1]} &= ${F(t.M, 2)}\ \mathrm{t\cdot m}
\end{align*}
\[ e = \frac{M_{u${k}}}{${Pk}} = \frac{${F(t.M, 2)}}{${F(t.P, 1)}} = ${F(t.e, 4)}\ \mathrm{m};\qquad |e| = ${F(ea, 4)}\ \mathrm{m}\ ${rel}\ \frac{B}{6} = ${F(nucleo, 3)}\ \mathrm{m}\ \Rightarrow\ \text{Caso ${caso === 'vuelco' ? 'C (vuelco)' : caso}} \]
\[ ${fq} \]`;
      return rige ? String.raw`\begin{govbox}
${cuerpo}
${dibujoPresiones(t, k)}
\end{govbox}` : cuerpo;
    }).join('\n');

    // ---------- Paso 8: franja central ----------
    let franja = '';
    if (e.strip) {
      const s = e.strip;
      const barS = s.dir === 'Y' ? by : bx;
      franja = String.raw`
\paragraph{Reparto en la dirección corta (franja central).} Zapata rectangular con $\beta_z = ${F(s.beta_z)}$: en la franja central de ancho ${F(s.Wc)}~m se coloca la fracción
\begin{gather*}
 \frac{A_{s,central}}{A_{s,total}} = \frac{2}{\beta_z+1} = \frac{2}{${F(s.beta_z)}+1} = ${F(2 / (s.beta_z + 1), 3)}\\[3pt]
 A_{s,central} = A_{s,total}\cdot\frac{2}{\beta_z+1} = ${F(s.Ac + s.Al)}(${F(2 / (s.beta_z + 1), 3)}) = ${F(s.Ac)}\ \mathrm{cm^2}\\[3pt]
 A_{s,laterales} = A_{s,total}-A_{s,central} = ${F(s.Ac + s.Al)}-${F(s.Ac)} = ${F(s.Al)}\ \mathrm{cm^2}
\end{gather*}
\begin{itemize}
 \item Franja central: $A_s = ${F(s.Ac)}\ \mathrm{cm^2}$ $\Rightarrow$ \textbf{${s.Nc}} ${barS} @ ${s.sc}~cm.
 \item Franjas laterales (total): $A_s = ${F(s.Al)}\ \mathrm{cm^2}$ $\Rightarrow$ \textbf{${s.Nl}} ${barS} @ ${s.sl}~cm.
\end{itemize}`;
    }

    // Coordenadas en píxeles de la imagen original (1672 x 941); TikZ las recibe como fracciones del ancho y del alto.
    const figGancho = figGanchoTex();

    // Píxeles de la imagen original 1672 x 941: suelo en y 315, cara superior de la zapata en y 557, base en y 848.
    const figRelleno = figRellenoTex({ hs_m: p.hs_m, hz_m: hz / 100, practico: i.metodoPractico, gamma: i.gamma_m, Df: i.Df_m, sc: i.sc_tonm2, qa_t: i.qa_kgcm2 * 10 });

    // ---------- Croquis TikZ ----------
    const W0 = p.B, H0 = p.L;
    const sc = Math.min(11 / W0, 7 / H0);
    const W = W0 * sc, H = H0 * sc;
    const cw = i.cx_cm / 100 * sc, ch = i.cy_cm / 100 * sc;
    const x0 = (W - cw) / 2, y0 = (H - ch) / 2;
    let barras = '';
    const nx = Math.min(e.N_x, 60), ny = Math.min(e.N_y, 60);
    for (let k = 0; k < nx; k++) {
      const y = 0.15 + k * (H - 0.3) / Math.max(1, nx - 1);
      barras += `\\draw[blue!70!black, line width=0.6pt] (0.15,${F(y, 3)}) -- (${F(W - 0.15, 3)},${F(y, 3)});\n`;
    }
    for (let k = 0; k < ny; k++) {
      const x = 0.15 + k * (W - 0.3) / Math.max(1, ny - 1);
      barras += `\\draw[orange!85!black, line width=0.6pt] (${F(x, 3)},0.15) -- (${F(x, 3)},${F(H - 0.15, 3)});\n`;
    }
    const tikz = String.raw`\begin{tikzpicture}
\draw[very thick] (0,0) rectangle (${F(W, 3)},${F(H, 3)});
${barras}\fill[gray!70] (${F(x0, 3)},${F(y0, 3)}) rectangle (${F(x0 + cw, 3)},${F(y0 + ch, 3)});
\draw[<->] (0,-0.6) -- (${F(W, 3)},-0.6) node[midway, below] {$B=${F(p.B)}\ \mathrm{m}$};
\draw[<->] (${F(W + 0.6, 3)},0) -- (${F(W + 0.6, 3)},${F(H, 3)}) node[midway, right] {$L=${F(p.L)}\ \mathrm{m}$};
\node[white, font=\scriptsize] at (${F(W / 2, 3)},${F(H / 2, 3)}) {${F(i.cx_cm, 0)}$\times$${F(i.cy_cm, 0)}};
\end{tikzpicture}`;

    // ---------- Documento ----------
    return String.raw`${PREAMBULO}
\begin{document}

\tituloMetodo{Diseño de zapata aislada}{COLUMNA ${F(i.cx_cm, 0)}$\times$${F(i.cy_cm, 0)}~cm \ · \ NORMAS E.060 Y E.050}

\begin{porticabanner}
Modelo: zapata aislada de concreto armado bajo columna rectangular, con carga axial y momento en la dirección $B$.
Se verifica primero el suelo con cargas de servicio y después el concreto con cargas amplificadas.\\[3pt]
{\small Unidades de trabajo:\quad $P$ [t]\quad $M$ [t$\cdot$m]\quad $q$ [t/m$^2$]\quad $f'_c,\,f_y$ [kg/cm$^2$]\quad $B,\,L$ [m]\quad $d,\,h_z$ [cm]\quad $A_s$ [cm$^2$]}
\end{porticabanner}

\begin{porticastepx}{Datos del problema}
\begin{tabular}{@{}ll@{\hspace{5em}}ll@{}}
\toprule
\multicolumn{2}{c}{\textbf{Columna y cargas}} & \multicolumn{2}{c}{\textbf{Terreno y materiales}}\\
\cmidrule(r){1-2}\cmidrule(l){3-4}
Columna & $${F(i.cx_cm, 0)}\times${F(i.cy_cm, 0)}\ \mathrm{cm}$ & $q_{adm}$ & $${F(i.qa_kgcm2)}\ \mathrm{kg/cm^2}$ \\
Varilla de la columna & ${texBar(r.colBar)} & $D_f$ & $${F(i.Df_m)}\ \mathrm{m}$ \\
$P_D$, $M_D$ & $${F(i.PD_ton, 1)}\ \mathrm{t}$, $${F(i.MD_ton, 1)}\ \mathrm{t\cdot m}$ & $\gamma_s$ & $${F(i.gamma_m)}\ \mathrm{t/m^3}$ \\
$P_L$, $M_L$ & $${F(i.PL_ton, 1)}\ \mathrm{t}$, $${F(i.ML_ton, 1)}\ \mathrm{t\cdot m}$ & $s/c$ & $${F(i.sc_tonm2)}\ \mathrm{t/m^2}$ \\
$P_E$, $M_E$ (sismo) & $${F(i.PE_ton, 1)}\ \mathrm{t}$, $${F(i.ME_ton, 1)}\ \mathrm{t\cdot m}$ & $f'_c$, $f_y$ & $${F(i.fc, 0)}$, $${F(i.fy, 0)}\ \mathrm{kg/cm^2}$ \\
\bottomrule
\end{tabular}

\end{porticastepx}
\begin{porticastep}{1}{Peralte bruto inicial}
Anclaje de la varilla de la columna ${texBar(r.colBar)} ($d_b=${F(r.colBar.diam)}$ cm) con gancho a $90^\circ$:
\[ l_{dh} = \max\!\left(\frac{0.075\,d_b f_y}{\sqrt{f'_c}},\ 8d_b,\ 15\right) = \max\!\left(\frac{0.075(${F(r.colBar.diam)})(${F(i.fy, 0)})}{\sqrt{${F(i.fc, 0)}}},\ ${F(8 * r.colBar.diam)},\ 15\right) = ${F(r.ldh, 1)}\ \mathrm{cm} \]
\[ h_z \ge l_{dh} + r + d_b = ${F(r.ldh, 1)} + ${F(r.R_CM, 1)} + ${F(r.colBar.diam)} = ${F(r.ldh + r.R_CM + r.colBar.diam, 1)}\ \mathrm{cm} \ \Rightarrow\ h_{z,min} = ${r.hz_min_cm}\ \mathrm{cm} \]
(múltiplos de 5~cm y no menor de 30~cm). Tras verificar cortante, punzonamiento y flexión, el espesor final es
\[ \cajazul{h_z = ${hz}\ \mathrm{cm}}, \qquad d = h_z - 10 = ${hz} - 10 = ${F(e.d, 1)}\ \mathrm{cm}. \]
\IfFileExists{zapata-gancho.jpg}{%
\begin{porticafig}
\centering
\begin{tikzpicture}
\node[anchor=south west, inner sep=0] (img) at (0,0) {\includegraphics[width=0.62\linewidth]{zapata-gancho.jpg}};
\begin{scope}[x={(img.south east)}, y={(img.north west)}]
${figGancho}
\end{scope}
\end{tikzpicture}

\vspace{4pt}
{\small\raggedright
$l_{dh}$: longitud del gancho, desde la cara superior de la zapata hasta el extremo del gancho. \quad
$d_b$: diámetro de la varilla (en el cálculo, el de la varilla de la columna). \quad
$r$: recubrimiento libre inferior. \quad
$R$: radio de doblez a $90^\circ$. \quad
$h_z$: espesor total de la zapata.\par}
\end{porticafig}}{}

{\small\raggedright\textbf{Nota.} En obra la malla inferior tiene dos capas de varillas (una por dirección) y el gancho se apoya sobre la de arriba; por eso, en rigor, $h_z \ge l_{dh} + 2\,d_b + r$. Este cálculo usa la simplificación del curso, $h_z \ge l_{dh} + r + d_b$ con la varilla de la columna, y después se verifican cortante, punzonamiento y flexión.\par}

\end{porticastep}
\begin{porticastep}{2}{Presión admisible neta del terreno}
${paso2}
\IfFileExists{zapata-relleno.jpg}{%
\begin{porticafig}
\centering
\begin{tikzpicture}
\node[anchor=south west, inner sep=0] (img) at (0,0) {\includegraphics[width=0.62\linewidth]{zapata-relleno.jpg}};
\begin{scope}[x={(img.south east)}, y={(img.north west)}]
${figRelleno}
\end{scope}
\end{tikzpicture}

\vspace{4pt}
{\small\raggedright
$q_{adm}$: presión admisible del terreno en la base. \quad
$D_f$: profundidad de desplante, del nivel del terreno a la base ($D_f = h_s + h_z$). \quad
$h_s$, $\gamma_s$: altura y peso específico del relleno sobre la zapata. \quad
$h_z$, $\gamma_c$: espesor y peso específico del concreto de la zapata. \quad
$s/c$: sobrecarga sobre el piso terminado.\par}
\end{porticafig}}{}

\end{porticastep}
\begin{porticastep}{3}{Dimensionamiento en planta}
${p.fA < 1 ? String.raw`Hay momento ($e_{max}=M/P=${F(p.eMax, 4)}$~m), así que el área se estima con el factor $0.90$ para absorber la excentricidad:` : String.raw`No hay momento, así que el área se estima con el factor $1.00$:`}
\[ A_z \ge \frac{P_{serv}}{${F(p.fA, 2)}\,q_{adm,neto}} = \frac{${F(P, 1)}}{${F(p.fA, 2)}\times ${F(p.q_neto)}} = ${F(p.A_req)}\ \mathrm{m^2} \]
${p.modo === 'manual' ? String.raw`Dimensiones adoptadas por el usuario` : p.modo === 'prop' ? String.raw`Con la proporción de la columna $B/L = b/t = ${F(i.cx_cm, 0)}/${F(i.cy_cm, 0)}$` : String.raw`Con volados iguales en ambas direcciones ($l_{v1}\approx l_{v2}$), es decir $L-B = t-b = ${F((i.cy_cm - i.cx_cm) / 100, 2)}\ \mathrm{m}$`} y ajustando en múltiplos de 5~cm hasta cumplir el Paso 4:
\[ \cajazul{B\times L = ${F(p.B)}\ \mathrm{m}\times ${F(p.L)}\ \mathrm{m}} \qquad (A = ${F(p.B * p.L)}\ \mathrm{m^2}) \]
${p.fA < 1 ? String.raw`
{\small\raggedright\textbf{Nota.} El libro indica que el factor $0.90$ podría ser menor si la excentricidad es mayor (se suele bajar a $0.80$ o $0.70$), pero no especifica qué excentricidad se considera grande. Aquí se mantiene $0.90$ y el Paso~4 comprueba las presiones: si no cumplen, la zapata se agranda.\par}` : ''}

\end{porticastep}
\begin{porticastep}{4}{Verificación de presiones en el suelo (cargas de servicio)}
Se usa $e=M/P$ con su signo (indica de qué lado está la presión máxima) y el núcleo central $B/6=${F(p.B / 6, 3)}$~m; en $q_{max}$ entra el valor absoluto $|e|$.
\begin{itemize}
 \item Caso A ($|e|\le B/6$): $q_{max}=\dfrac{P}{BL}\left(1+\dfrac{6|e|}{B}\right)$.
 \item Caso B ($|e|=B/6$): $q_{max}=\dfrac{2P}{BL}$.
 \item Caso C ($|e|>B/6$): $q_{max}=\dfrac{2P}{3L\,(B/2-|e|)}$.
\end{itemize}

${calcServ}

\vspace{8pt}
\begin{center}
\small
\begin{tabular}{lrrrcrclc}
\toprule
Comb. & $P$ (t) & $M$ (t$\cdot$m) & $e$ (m) & Caso & $q_{max}$ & & $q_{lim}$ & Verif. \\
\midrule
${filasServ}
\bottomrule
\end{tabular}
\end{center}
(Presiones en $\mathrm{t/m^2}$.) Presión gobernante: $q_{max}=${F(g.qmax)}\ \mathrm{t/m^2}$ en la combinación ${tituloServ(g)}. Resultado: ${ok(geoOK)}.

\end{porticastep}
\begin{porticastep}{5}{Presión última de diseño}
Combinaciones de la E.060; el sismo se evalúa en un sentido ($+E$) y en el contrario ($-E$), con $e=M_u/P_u$ y $q_{u,max}$ según las fórmulas del Paso~4${hayE ? '' : ' (sin sismo ingresado: $E=0$)'}.

${calcUlt}

\vspace{8pt}
\begin{center}
\small
\begin{tabular}{lrrrr}
\toprule
Comb. & $P_u$ (t) & $M_u$ (t$\cdot$m) & $e$ (m) & $q_{u,max}$ \\
\midrule
${filasUlt}
\bottomrule
\end{tabular}
\end{center}
(Presiones en $\mathrm{t/m^2}$. La fila sombreada es la combinación que rige.)

\textbf{Por lo tanto,} la presión última de diseño es la mayor de las cinco, la de la combinación ${texCombo(gobUlt.name)}:
\[ \cajazul{q_u = ${F(e.quMax)}\ \mathrm{t/m^2}} \]
Se usa para flexión, cortante y punzonamiento.

\end{porticastep}
\begin{porticastep}{6}{Cortante por flexión (viga ancha)}
Sección crítica a $d=${F(e.d, 1)}$~cm de la cara de la columna; $\phi=0.85$.
${[['B', String.raw`\frac{B-b}{2}`, String.raw`\frac{${F(p.B)}-${F(i.cx_cm / 100)}}{2}`, e.Lvx, 'L', p.L, e.Vux, e.pVcx],
    ['L', String.raw`\frac{L-t}{2}`, String.raw`\frac{${F(p.L)}-${F(i.cy_cm / 100)}}{2}`, e.Lvy, 'B', p.B, e.Vuy, e.pVcy]].map(([dir, lvDef, lvNum, lv, ancho, anchoV, Vu, pVc]) => String.raw`
\paragraph{Dirección ${dir}.}
\eqline{l_v = ${lvDef} = ${lvNum} = ${F(lv)}\ \mathrm{m}}
\eqline{l_v - d = ${F(lv)} - ${F(e.d / 100)} = ${F(lv - e.d / 100)}\ \mathrm{m}}
\eqline{V_u = q_u\,${ancho}\,(l_v-d) = ${F(e.quMax)}(${F(anchoV)})(${F(lv - e.d / 100)}) = ${F(Vu, 1)}\ \mathrm{t}}
\eqline{\phi V_c = 0.85(0.53)\sqrt{f'_c}\,${ancho}\,d = \frac{0.85(0.53)\sqrt{${F(i.fc, 0)}}\,(${F(anchoV * 100, 0)})(${F(e.d, 1)})}{1000} = ${F(pVc, 1)}\ \mathrm{t}}
\eqline{V_u = ${F(Vu, 1)}\ \mathrm{t}\ \le\ \phi V_c = ${F(pVc, 1)}\ \mathrm{t}\quad ${ok(Vu <= pVc)}}`).join('\n')}

\end{porticastep}
\begin{porticastep}{7}{Punzonamiento (cortante en dos direcciones)}
Perímetro crítico a $d/2$ de la cara de la columna ($d=${F(e.d, 1)}$~cm):
\eqline{P_u = \max(${e.presUlt.map((_, k) => `P_{u${k + 1}}`).join(',\\ ')}) = \max(${e.presUlt.map(t => F(t.P, 1)).join(',\\ ')}) = ${F(e.Pu_max, 1)}\ \mathrm{t}}
\eqline{V_u = P_u - q_u\,(b+d)(t+d) = ${F(e.Pu_max, 1)} - ${F(e.quMax)}(${F(i.cx_cm / 100)}+${F(e.d / 100)})(${F(i.cy_cm / 100)}+${F(e.d / 100)}) = ${F(e.Vup, 1)}\ \mathrm{t}}
Resistencia: el menor de tres valores (con $\phi=0.85$, $\alpha_s=40$):
\eqline{b_o = 2(b+d)+2(t+d) = 2(${F(i.cx_cm, 0)}+${F(e.d, 1)})+2(${F(i.cy_cm, 0)}+${F(e.d, 1)}) = ${F(e.bo, 1)}\ \mathrm{cm}}
\eqline{A_o = (b+d)(t+d) = (${F(i.cx_cm / 100)}+${F(e.d / 100)})(${F(i.cy_cm / 100)}+${F(e.d / 100)}) = ${F(e.Ao, 4)}\ \mathrm{m^2}}
\eqline{\beta = \frac{\max(b,t)}{\min(b,t)} = \frac{${F(Math.max(i.cx_cm, i.cy_cm), 0)}}{${F(Math.min(i.cx_cm, i.cy_cm), 0)}} = ${F(e.beta)}}
\eqline{\phi V_{c1} = 0.85\left(0.53+\frac{1.06}{\beta}\right)\sqrt{f'_c}\,b_o\,d = \frac{0.85\left(0.53+\frac{1.06}{${F(e.beta)}}\right)\sqrt{${F(i.fc, 0)}}\,(${F(e.bo, 1)})(${F(e.d, 1)})}{1000} = ${F(e.pVc1, 1)}\ \mathrm{t}}
\eqline{\phi V_{c2} = 0.85(0.27)\left(\frac{\alpha_s\,d}{b_o}+2\right)\sqrt{f'_c}\,b_o\,d = \frac{0.85(0.27)\left(\frac{40(${F(e.d, 1)})}{${F(e.bo, 1)}}+2\right)\sqrt{${F(i.fc, 0)}}\,(${F(e.bo, 1)})(${F(e.d, 1)})}{1000} = ${F(e.pVc2, 1)}\ \mathrm{t}}
\eqline{\phi V_{c3} = 0.85(1.10)\sqrt{f'_c}\,b_o\,d = \frac{0.85(1.10)\sqrt{${F(i.fc, 0)}}\,(${F(e.bo, 1)})(${F(e.d, 1)})}{1000} = ${F(e.pVc3, 1)}\ \mathrm{t}}
\eqline{V_u = ${F(e.Vup, 1)}\ \mathrm{t}\ \le\ \phi V_c = ${F(e.pVcp, 1)}\ \mathrm{t}\quad ${ok(e.Vup <= e.pVcp)}}

\end{porticastep}
\begin{porticastep}{8}{Refuerzo por flexión}
Sección crítica en la cara de la columna, $\phi=0.90$. El ancho resistente es el lado de la zapata perpendicular a las varillas: $L$ para el acero paralelo a $B$ y $B$ para el paralelo a $L$; $A_{s,min}=0.0018\,(\text{ancho})\,h_z$.
${[['X (paralelo a $B$)', e.flexX, e.Lvx, 'L', e.N_x, e.s_x, bx, e.Asx], ['Y (paralelo a $L$)', e.flexY, e.Lvy, 'B', e.N_y, e.s_y, by, e.Asy]].map(([nom, f, lv, anch, N, s, bar, As]) => f ? String.raw`
\paragraph{Dirección ${nom}.} $l_v=${F(lv)}$~m, ancho resistente $${anch}=${F(f.b_cm, 0)}$~cm, $d=${F(f.d_cm, 1)}$~cm:
\eqline{M_u = q_u\, ${anch}\, \frac{l_v^2}{2} = ${F(e.quMax)}(${F(f.b_cm / 100)})\,\frac{${F(lv)}^2}{2} = ${F(f.Mu_tonm, 2)}\ \mathrm{t\cdot m} = ${F(f.Mu_tonm * 1e5, 0)}\ \mathrm{kg\cdot cm}}
\eqline{a = d-\sqrt{d^2-\frac{2M_u}{\phi\,0.85 f'_c\, ${anch}}} =${F(f.d_cm, 1)}-\sqrt{${F(f.d_cm, 1)}^2-\frac{2(${F(f.Mu_tonm * 1e5, 0)})}{0.90(0.85)(${F(i.fc, 0)})(${F(f.b_cm, 0)})}} = ${F(f.a, 2)}\ \mathrm{cm}}
\eqline{A_s = \frac{M_u}{\phi f_y (d-a/2)} = \frac{${F(f.Mu_tonm * 1e5, 0)}}{0.90(${F(i.fy, 0)})\left(${F(f.d_cm, 1)}-\frac{${F(f.a, 2)}}{2}\right)} = ${F(f.As_calc, 2)}\ \mathrm{cm^2}}
\eqline{A_{s,min} = 0.0018\,${anch}\,h_z = 0.0018(${F(f.b_cm, 0)})(${hz}) = ${F(f.As_min, 2)}\ \mathrm{cm^2}}
Rige \textbf{${f.As_calc >= f.As_min ? 'el cálculo por flexión' : 'la cuantía mínima'}}: $A_s=${F(As, 2)}\ \mathrm{cm^2}$ $\Rightarrow$ \textbf{${N}} ${bar} @ ${s}~cm${e.strip && e.strip.dir === nom[0] ? ' en total (ver reparto abajo)' : ' (uniforme)'}.` : String.raw`
\paragraph{Dirección ${nom}.} \textcolor{badred}{La sección es insuficiente por flexión.}`).join('\n')}
${franja}

\end{porticastep}
\begin{porticastep}{9}{Longitud de desarrollo en el volado}
\eqline{l_d = \max\!\left(\frac{f_y\,d_b}{8.2\sqrt{f'_c}},\ 30\right)}
\paragraph{Dirección B.}
\eqline{l_d = \max\!\left(\frac{${F(i.fy, 0)}(${F(r.barX.diam)})}{8.2\sqrt{${F(i.fc, 0)}}},\ 30\right) = \max(${F(i.fy * r.barX.diam / (8.2 * Math.sqrt(i.fc)), 1)},\ 30) = ${F(e.ldX, 1)}\ \mathrm{cm}}
\eqline{l_{disp} = l_v - r = ${F(e.Lvx * 100, 1)} - ${F(r.R_CM, 1)} = ${F(e.laX, 1)}\ \mathrm{cm}\quad ${ok(e.laX >= e.ldX)}}
\paragraph{Dirección L.}
\eqline{l_d = \max\!\left(\frac{${F(i.fy, 0)}(${F(r.barY.diam)})}{8.2\sqrt{${F(i.fc, 0)}}},\ 30\right) = \max(${F(i.fy * r.barY.diam / (8.2 * Math.sqrt(i.fc)), 1)},\ 30) = ${F(e.ldY, 1)}\ \mathrm{cm}}
\eqline{l_{disp} = l_v - r = ${F(e.Lvy * 100, 1)} - ${F(r.R_CM, 1)} = ${F(e.laY, 1)}\ \mathrm{cm}\quad ${ok(e.laY >= e.ldY)}}
${(e.laX >= e.ldX && e.laY >= e.ldY) ? 'Las varillas quedan ancladas rectas, sin ganchos.' : 'Se requiere gancho estándar a $90^\\circ$ en los extremos.'}

\end{porticastep}
\begin{porticastep}{10}{Aplastamiento en la interfaz columna--zapata}
\eqline{A_1 = b\,t = ${F(i.cx_cm, 0)}\times${F(i.cy_cm, 0)} = ${F(e.A1, 0)}\ \mathrm{cm^2}}
\eqline{A_2 = \min(b+4h_z,\ B)\cdot\min(t+4h_z,\ L) = \min(${F(i.cx_cm, 0)}+4(${hz}),\ ${F(p.B * 100, 0)})\cdot\min(${F(i.cy_cm, 0)}+4(${hz}),\ ${F(p.L * 100, 0)}) = ${F(e.A2, 0)}\ \mathrm{cm^2}}
\eqline{\sqrt{A_2/A_1} = \sqrt{\frac{${F(e.A2, 0)}}{${F(e.A1, 0)}}} = ${F(Math.sqrt(e.A2 / e.A1))} \ \Rightarrow\ ${F(e.factorA)}\ (\le 2)}
\eqline{\phi P_{nb} = 0.65\,(0.85 f'_c A_1)\sqrt{A_2/A_1} = \frac{0.65\,(0.85)(${F(i.fc, 0)})(${F(e.A1, 0)})(${F(e.factorA)})}{1000} = ${F(e.phiPnb, 1)}\ \mathrm{t}}
\eqline{P_u = ${F(e.Pu_max, 1)}\ \mathrm{t}\ \le\ \phi P_{nb} = ${F(e.phiPnb, 1)}\ \mathrm{t}\quad ${ok(e.Pu_max <= e.phiPnb)}}
\eqline{A_{sd,min} = 0.005\,A_1 = 0.005(${F(e.A1, 0)}) = ${F(e.dowel_min, 2)}\ \mathrm{cm^2}}${e.dowel_extra > 0 ? String.raw`
\eqline{A_{s,extra} = \frac{P_u-\phi P_{nb}}{\phi f_y} = \frac{(${F(e.Pu_max, 1)}-${F(e.phiPnb, 1)})(1000)}{0.65(${F(i.fy, 0)})} = ${F(e.dowel_extra, 2)}\ \mathrm{cm^2}}` : ''}

\end{porticastep}
\begin{porticastepx}{Ficha técnica}
\begin{center}
\begin{tabular}{@{}ll@{}}
\toprule
Dimensiones en planta & $B=${F(p.B)}\ \mathrm{m}\ \times\ L=${F(p.L)}\ \mathrm{m}$ \\
Espesor y peralte efectivo & $h_z=${hz}\ \mathrm{cm},\quad d=${F(e.d, 1)}\ \mathrm{cm}$ \\
Acero inferior paralelo a $B$ & \textbf{${e.N_x}} ${bx} @ ${e.s_x}~cm \\
Acero inferior paralelo a $L$ & \textbf{${e.N_y}} ${by} @ ${e.s_y}~cm${e.strip ? ' (con franja central)' : ''} \\
Recubrimiento inferior & ${F(r.R_CM, 1)}~cm contra el suelo \\
Presión máxima en servicio & $${F(g.qmax / 10, 2)}\ \mathrm{kg/cm^2}$ (${F(g.ratio * 100, 1)}\% del límite) \\
\bottomrule
\end{tabular}
\end{center}

\begin{porticafig}
\centering
${tikz}

\vspace{4pt}
{\small\itshape Distribución del acero en planta. Azul: varillas paralelas a $B$; naranja: paralelas a $L$.}
\end{porticafig}
\end{porticastepx}

\end{document}
`;
  }

  // ---------------------------------------------------------------
  // Interfaz: botones, visor de PDF y descarga del .tex
  // ---------------------------------------------------------------
  document.addEventListener('DOMContentLoaded', () => {
    const btnPdf = document.getElementById('footingPdfBtn');
    const btnTex = document.getElementById('footingTexBtn');
    const back = document.getElementById('footingPdfBack');
    const form = document.getElementById('footingTexliveForm');
    if (!btnPdf || !back || !form) return;

    const status = document.getElementById('footingPdfStatus');
    const frame = document.getElementById('footingPdfFrame');
    const src = document.getElementById('footingTexliveSrc');
    const ret = document.getElementById('footingTexliveReturn');
    let esperando = false;

    // Memoria que muestra el visor: la de la aislada o la que abra otro módulo (zapata combinada).
    // Recompilar y "Pestaña" usan siempre la última abierta.
    const fuenteAislada = () => (window.footingReport ? buildFootingLatex(window.footingReport) : null);
    let fuente = fuenteAislada;

    function currentTex(f = fuente) {
      const tex = f();
      if (!tex) {
        alert('No hay resultados válidos para generar la memoria. Revise los datos de entrada.');
        return null;
      }
      return tex;
    }

    // La imagen viaja como un archivo más del formulario (filename[] + filecontents[]), desde su base64
    function adjuntarFiguras() {
      form.querySelectorAll('[data-fig]').forEach(n => n.remove());
      const figs = window.FOOTING_FIGURES || {};
      Object.keys(figs).forEach(nombre => {
        try {
          const bin = atob(figs[nombre]);
          const bytes = new Uint8Array(bin.length);
          for (let k = 0; k < bin.length; k++) bytes[k] = bin.charCodeAt(k);
          const dt = new DataTransfer();
          dt.items.add(new File([bytes], nombre, { type: 'image/jpeg' }));
          const nombreInput = document.createElement('input');
          nombreInput.type = 'hidden'; nombreInput.name = 'filename[]'; nombreInput.value = nombre;
          nombreInput.setAttribute('data-fig', '1');
          const archivo = document.createElement('input');
          archivo.type = 'file'; archivo.name = 'filecontents[]';
          archivo.files = dt.files;
          archivo.setAttribute('data-fig', '1');
          form.appendChild(nombreInput);
          form.appendChild(archivo);
        } catch (e) { /* sin figura: el documento compila igual */ }
      });
    }

    function compilar(nuevaPestana) {
      const tex = currentTex();
      if (!tex) return;
      src.value = tex;
      ret.value = nuevaPestana ? 'pdf' : 'pdfjs';
      form.target = nuevaPestana ? '_blank' : 'footingPdfFrame';
      form.action = 'https://texlive.net/cgi-bin/latexcgi' + (nuevaPestana ? '' : '#pagemode=none');
      if (!nuevaPestana) {
        back.classList.add('open');
        status.style.display = 'flex';
        esperando = true;
      }
      adjuntarFiguras();
      form.submit();
    }

    const titulo = document.getElementById('footingPdfTitle');
    btnPdf.addEventListener('click', () => {
      fuente = fuenteAislada;
      if (titulo) titulo.textContent = 'Memoria de cálculo · Zapata aislada';
      compilar(false);
    });
    document.getElementById('footingPdfReload')?.addEventListener('click', () => compilar(false));
    document.getElementById('footingPdfNewTab')?.addEventListener('click', () => compilar(true));
    document.getElementById('footingPdfClose')?.addEventListener('click', () => {
      back.classList.remove('open');
      frame.src = 'about:blank';
    });
    frame.addEventListener('load', () => {
      if (esperando) {
        status.style.display = 'none';
        esperando = false;
      }
    });

    function descargar(f, nombre) {
      const tex = currentTex(f);
      if (!tex) return;
      const blob = new Blob([tex], { type: 'text/x-tex;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = nombre;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }
    btnTex?.addEventListener('click', () => descargar(fuenteAislada, 'memoria-zapata-aislada.tex'));

    // Para otros módulos: f() devuelve el .tex (o null si no hay resultados)
    window.FootingTex.abrirPdf = (f, nombre) => {
      fuente = f;
      if (titulo && nombre) titulo.textContent = 'Memoria de cálculo · ' + nombre;
      compilar(false);
    };
    window.FootingTex.descargarTex = descargar;
  });

  // Exponer para pruebas y para la memoria de la zapata combinada
  window.buildFootingLatex = buildFootingLatex;
  window.FootingTex = { PREAMBULO, texBar, ok, figGanchoTex, figRellenoTex };
})();
