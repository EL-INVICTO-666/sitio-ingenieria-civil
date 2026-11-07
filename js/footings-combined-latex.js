/**
 * ===================================================================
 * MEMORIA LaTeX Y TABLA RESUMEN - ZAPATA COMBINADA
 * Toma window.combinedReport (js/footings-combined.js) y arma el .tex
 * con el mismo diseño de la memoria de la zapata aislada (preámbulo y
 * figuras compartidas en window.FootingTex). Se compila en texlive.net
 * con el mismo visor de PDF.
 * ===================================================================
 */
(function () {
  'use strict';

  const F = (x, n = 2) => (x === Infinity ? '\\infty' : Number(x).toFixed(n));
  const N = (x, n = 2) => (x < 0 ? `(${F(x, n)})` : F(x, n));       // negativo entre paréntesis al sustituir
  const signo = (x, n = 2) => (x < 0 ? `- ${F(-x, n)}` : `+ ${F(x, n)}`);
  const texto = s => String(s).replace(/−/g, '$-$');                 // "CM + CV − CS" en modo texto

  function buildCombinedLatex(r) {
    const T = window.FootingTex;
    const { pl, est, armado: a, c1, c2, s1, s2, inp } = r;
    const v = est.vig;
    const ok = T.ok;
    const bar = b => T.texBar(b);
    const hz = est.hz, d = est.d, dm = d / 100, hz_m = hz / 100;
    const B = pl.B, L = pl.L, n = inp.n, S = inp.S;
    const qa_t = r.qa, sfc = Math.sqrt(r.fc);
    const fc0 = F(r.fc, 0), fy0 = F(r.fy, 0);
    const qu = est.qu;
    const cols = [c1, c2];

    // ---------------- Paso 1: anclaje de las varillas de columna ----------------
    const mismoBar = c1.bar.key === c2.bar.key;
    const paso1Cols = (mismoBar ? [0] : [0, 1]).map(k => {
      const c = cols[k], q = r.anclajeCol[k];
      return String.raw`${mismoBar ? 'Ambas columnas' : `Columna ${k + 1}`}: varilla ${bar(c.bar)} ($d_b=${F(q.db, 3)}$~cm), gancho a $90^\circ$:
\eqline{l_{dh} = \max\!\left(\frac{0.075\,d_b f_y}{\sqrt{f'_c}},\ 8d_b,\ 15\right) = \max\!\left(\frac{0.075(${F(q.db, 3)})(${fy0})}{\sqrt{${fc0}}},\ ${F(8 * q.db)},\ 15\right) = ${F(q.ldh)}\ \mathrm{cm}}
\eqline{h_z \ge l_{dh} + r + d_b = ${F(q.ldh)} + ${F(r.K.R, 1)} + ${F(q.db, 3)} = ${F(q.hzReq)}\ \mathrm{cm}}`;
    }).join('\n');

    // ---------------- Paso 2: presión neta ----------------
    const practico = inp.metodo === 'prac';
    const paso2 = practico
      ? String.raw`Método práctico ($\gamma_{prom}=2.05\ \mathrm{t/m^3}$):
\[ q_{adm,neto} = q_{adm} - \gamma_{prom} D_f - s/c = ${F(qa_t)} - 2.05(${F(inp.Df)}) - ${F(inp.sc)} = \mathbf{${F(pl.q_neto)}}\ \mathrm{t/m^2} \]`
      : String.raw`Con $h_z=${F(hz_m)}$~m la altura de relleno es $h_s = D_f - h_z = ${F(inp.Df)} - ${F(hz_m)} = ${F(pl.hs)}$~m.
\[ q_{adm,neto} = q_{adm} - h_s\gamma_s - h_z\gamma_c - s/c = ${F(qa_t)} - ${F(pl.hs)}(${F(inp.gm)}) - ${F(hz_m)}(2.40) - ${F(inp.sc)} = \mathbf{${F(pl.q_neto)}}\ \mathrm{t/m^2} \]`;
    const figRelleno = T.figRellenoTex({ hs_m: pl.hs, hz_m, practico, gamma: inp.gm, Df: inp.Df, sc: inp.sc, qa_t });

    // ---------------- Paso 3: croquis de la resultante ----------------
    const sx = 13 / L;
    const X = x => F(x * sx, 3);
    const elevRes = String.raw`\begin{tikzpicture}[>=Stealth]
\draw[thick, fill=gray!8] (0,0) rectangle (${X(L)},0.8);
${cols.map((c, k) => String.raw`\fill[gray!55] (${X(c.x - c.b_m / 2)},0.8) rectangle (${X(c.x + c.b_m / 2)},1.5);
\draw[->, very thick, porticaaccent] (${X(c.x)},2.4) -- (${X(c.x)},1.55) node[pos=0, above] {$P_${k + 1}=${F(k ? s2.P : s1.P, 1)}$};`).join('\n')}
\draw[->, very thick, porticaaccent2] (${X(n + pl.XR)},-1.15) -- (${X(n + pl.XR)},-0.05);
\node[porticaaccent2, below] at (${X(n + pl.XR)},-1.15) {$R$};
${c1.x - c1.b_m / 2 < 0.005 ? String.raw`\draw[dashed, badred] (0,-0.4) -- (0,2.6); \node[badred, left] at (0,1.2) {\scriptsize LP};` : ''}
\draw[|<->|] (0,-0.45) -- (${X(n)},-0.45) node[midway, below] {\scriptsize $n$};
\draw[|<->|] (${X(n)},-0.45) -- (${X(n + pl.XR)},-0.45) node[midway, below] {\scriptsize $X_R=${F(pl.XR)}$};
\draw[|<->|] (${X(c1.x)},1.95) -- (${X(c2.x)},1.95) node[midway, above] {\scriptsize $S=${F(S)}$};
\draw[|<->|] (0,-1.7) -- (${X(L)},-1.7) node[midway, below] {\scriptsize $L=${F(L)}\ \mathrm{m}$};
\end{tikzpicture}`;

    // ---------------- Paso 4: presiones en servicio ----------------
    const qFormula = (P, e, q, sub) => {
      const ea = Math.abs(e);
      if (q === Infinity) return String.raw`|e| \ge L/2:\ \text{la zapata vuelca}`;
      if (ea <= L / 6 + 1e-9) {
        return String.raw`q_{${sub}} = \frac{P}{BL}\left(1+\frac{6|e|}{L}\right) = \frac{${F(P, 1)}}{${F(B)}\times${F(L)}}\left(1+\frac{6(${F(ea, 4)})}{${F(L)}}\right) = \mathbf{${F(q)}}\ \mathrm{t/m^2}`;
      }
      return String.raw`q_{${sub}} = \frac{2P}{3B\,(L/2-|e|)} = \frac{2(${F(P, 1)})}{3(${F(B)})(${F(L)}/2-${F(ea, 4)})} = \mathbf{${F(q)}}\ \mathrm{t/m^2}`;
    };
    const servDeriv = t => {
      if (t.id === '4.1') return [
        String.raw`P_{serv} = P_1 + P_2 = ${F(s1.P, 1)} + ${F(s2.P, 1)}`,
        String.raw`M_{serv} = P_2 S + M_1 + M_2 = ${F(s2.P, 1)}(${F(S)}) ${signo(s1.M)} ${signo(s2.M)}`];
      const sg = t.id === '4.2' ? '+' : '-';
      return [
        String.raw`P_{serv} = P_1 + P_2 ${sg} (P_{S1} + P_{S2}) = ${F(s1.P + s2.P, 1)} ${sg} (${N(c1.PE, 1)} + ${N(c2.PE, 1)})`,
        String.raw`M_{serv} = M_{4.1} ${sg} (P_{S2} S + M_{S1} + M_{S2}) = ${F(pl.tabla[0].M, 2)} ${sg} \big(${N(c2.PE, 1)}(${F(S)}) ${signo(c1.ME)} ${signo(c2.ME)}\big)`];
    };
    const calcServ = pl.tabla.map(t => {
      const dv = servDeriv(t);
      const okT = t.ratio <= 1 + 1e-9;
      return String.raw`\paragraph{${t.id}~${t.titulo} (${texto(t.formula)}).}
\eqline{${dv[0]} = ${F(t.P, 1)}\ \mathrm{t}}
\eqline{${dv[1]} = ${F(t.M, 2)}\ \mathrm{t\cdot m}}
\eqline{X_R = \frac{M_{serv}}{P_{serv}} = \frac{${F(t.M, 2)}}{${F(t.P, 1)}} = ${F(t.XR, 3)}\ \mathrm{m};\qquad e = X_R + n - \frac{L}{2} = ${F(t.XR, 3)} + ${F(n)} - ${F(L / 2, 3)} = ${F(t.e, 4)}\ \mathrm{m}\quad \left(\frac{L}{6} = ${F(L / 6, 3)}\ \mathrm{m}\right)}
\eqline{${qFormula(t.P, t.e, t.qmax, 'max')}\ ${okT ? '\\le' : '>'}\ ${t.f === 1 ? 'q_{adm,neto}' : '1.20\\,q_{adm,neto}'} = ${F(t.qlim)}\quad ${ok(okT)}}`;
    }).join('\n');
    const filasServ = pl.tabla.map(t => `${t.id} ${texto(t.formula)} & ${F(t.P, 1)} & ${F(t.M, 1)} & ${F(t.XR)} & ${F(t.e, 4)} & ${F(t.qmax)} & ${F(t.qlim)} & ${ok(t.ratio <= 1 + 1e-9)} \\\\`).join('\n');

    // ---------------- Paso 5: presión última ----------------
    const exprU = (id, c, campo) => {
      const D = campo === 'P' ? c.PD : c.MD, Lv = campo === 'P' ? c.PL : c.ML, E = campo === 'P' ? c.PE : c.ME;
      return {
        1: `1.4(${F(D, 1)}) + 1.7(${F(Lv, 1)})`,
        2: `1.25(${F(D, 1)} ${signo(Lv, 1)}) + ${N(E, 1)}`,
        3: `1.25(${F(D, 1)} ${signo(Lv, 1)}) - ${N(E, 1)}`,
        4: `0.9(${F(D, 1)}) + ${N(E, 1)}`,
        5: `0.9(${F(D, 1)}) - ${N(E, 1)}`
      }[id];
    };
    const calcUlt = est.ult.map(u => {
      const rige = u === est.uGob;
      const cuerpo = String.raw`\paragraph{Combinación ${u.id}: ${texto(u.nombre)}.}${rige ? String.raw` \colorbox{govfill}{\textbf{\ Rige el diseño\ }}` : ''}
\eqline{P_{u1} = ${exprU(u.id, c1, 'P')} = ${F(u.P1, 1)}\ \mathrm{t},\qquad M_{u1} = ${exprU(u.id, c1, 'M')} = ${F(u.M1, 2)}\ \mathrm{t\cdot m}}
\eqline{P_{u2} = ${exprU(u.id, c2, 'P')} = ${F(u.P2, 1)}\ \mathrm{t},\qquad M_{u2} = ${exprU(u.id, c2, 'M')} = ${F(u.M2, 2)}\ \mathrm{t\cdot m}}
\eqline{P_u = ${F(u.P1, 1)} + ${N(u.P2, 1)} = ${F(u.P, 1)}\ \mathrm{t};\quad M_u = P_{u2}S + M_{u1} + M_{u2} = ${N(u.P2, 1)}(${F(S)}) ${signo(u.M1)} ${signo(u.M2)} = ${F(u.M, 2)}\ \mathrm{t\cdot m}}
${u.P > 0 ? String.raw`\eqline{X_R = ${F(u.XR, 3)}\ \mathrm{m},\quad e = X_R + n - L/2 = ${F(u.e, 4)}\ \mathrm{m};\quad ${qFormula(u.P, u.e, u.qmax, 'u')}}` : String.raw`Sin compresión neta sobre el suelo: no se considera.`}`;
      return rige ? String.raw`\begin{govbox}
${cuerpo}
\end{govbox}` : cuerpo;
    }).join('\n');
    const filasUlt = est.ult.map(u => `${u === est.uGob ? '\\rowcolor{govfill}' : ''}${u.id}. ${texto(u.nombre)} & ${F(u.P, 1)} & ${F(u.M, 2)} & ${u.P > 0 ? F(u.e, 4) : '--'} & ${F(u.qmax)} \\\\`).join('\n');

    // ---------------- Paso 6: diagramas V y M (TikZ) ----------------
    const Vmax = Math.max(...v.diagV.map(p => Math.abs(p[1])), 1e-6);
    const Mmax = Math.max(...v.diagM.map(p => Math.abs(p[1])), 1e-6);
    const yV = x => F(x / Vmax * 2.0, 3), yM = x => F(-x / Mmax * 2.2, 3); // M (+) hacia abajo
    const ptsV = v.diagV.map(p => `(${X(p[0])},${yV(p[1])})`).join(' ');
    const ptsM = v.diagM.filter((p, k) => k % 2 === 0 || k === v.diagM.length - 1).map(p => `(${X(p[0])},${yM(p[1])})`).join(' ');
    const diagTikz = String.raw`\begin{tikzpicture}[>=Stealth, font=\scriptsize]
\begin{scope}[yshift=3.2cm]
\draw[thick, fill=gray!8] (0,0) rectangle (${X(L)},0.5);
${cols.map((c, k) => String.raw`\fill[gray!55] (${X(c.x - c.b_m / 2)},0.5) rectangle (${X(c.x + c.b_m / 2)},1.0);
\draw[->, thick, porticaaccent] (${X(c.x)},1.8) -- (${X(c.x)},1.05) node[pos=0, above] {$R_${k + 1}=${F(k ? v.R2 : v.R1)}$ t};`).join('\n')}
\foreach \i in {0,...,16} { \draw[->, porticaaccent2] (${X(L)}*\i/16,-0.55) -- (${X(L)}*\i/16,-0.05); }
\node[porticaaccent2, anchor=north west] at (0,-0.6) {$w = q_u B = ${F(qu)}(${F(B)}) = ${F(v.w)}\ \mathrm{t/m}$};
\end{scope}
\begin{scope}[yshift=-0.3cm]
\draw[gray] (0,0) -- (${X(L)},0); \node[anchor=east] at (-0.1,0) {$V_u$ (t)};
\fill[porticaaccent2!15] (0,0) -- plot coordinates {${ptsV}} -- (${X(L)},0) -- cycle;
\draw[thick, porticaaccent2] plot coordinates {${ptsV}};
\node[above left] at (${X(c1.x)},${yV(v.V1izq)}) {${F(v.V1izq)}};
\node[below right] at (${X(c1.x)},${yV(v.V1der)}) {${F(v.V1der)}};
\node[above left] at (${X(c2.x)},${yV(v.V2izq)}) {${F(v.V2izq)}};
\node[below right] at (${X(c2.x)},${yV(v.V2der)}) {${F(v.V2der)}};
\end{scope}
\begin{scope}[yshift=-3.9cm]
\draw[gray] (0,0) -- (${X(L)},0); \node[anchor=east] at (-0.1,0) {$M_u$ (t$\cdot$m)};
\fill[porticaaccent!15] (0,0) -- plot coordinates {${ptsM}} -- (${X(L)},0) -- cycle;
\draw[thick, porticaaccent] plot coordinates {${ptsM}};
\node[below] at (${X(c1.x)},${yM(v.M1)}) {$M_1=${F(v.M1)}$};
\node[below] at (${X(c2.x)},${yM(v.M2)}) {$M_2=${F(v.M2)}$};
\node[above] at (${X(v.x0)},${yM(v.Mcentro)}) {$M_{centro}=${F(v.Mcentro)}$};
\end{scope}
\foreach \xx in {${X(c1.x)},${X(c2.x)}} { \draw[densely dashed, gray] (\xx,-6.3) -- (\xx,3.2); }
\draw[densely dotted, badred] (${X(v.x0)},-6.3) -- (${X(v.x0)},1.9) node[above, fill=white, inner sep=1pt] {$V=0$};
\end{tikzpicture}`;

    // ---------------- Paso 7: cortante longitudinal ----------------
    const pVcB = K => String.raw`\phi V_c = 0.85(0.53)\sqrt{f'_c}\,B\,d = \frac{0.85(0.53)\sqrt{${fc0}}\,(${F(B * 100, 0)})(${F(d, 1)})}{1000} = ${F(K, 2)}\ \mathrm{t}`;
    const corte = est.corteLong.map(s => {
      const c = s.col === 1 ? c1 : c2;
      const nom = `Columna ${s.col}, lado ${s.lado === 'izq' ? 'izquierdo' : 'derecho'}`;
      const xsDef = s.lado === 'izq'
        ? String.raw`x = x_${s.col} - b_${s.col}/2 - d = ${F(c.x)} - ${F(c.b_m / 2, 3)} - ${F(dm)} = ${F(s.xs)}\ \mathrm{m}`
        : String.raw`x = x_${s.col} + b_${s.col}/2 + d = ${F(c.x)} + ${F(c.b_m / 2, 3)} + ${F(dm)} = ${F(s.xs)}\ \mathrm{m}`;
      if (s.fuera) {
        return String.raw`\paragraph{${nom}.} ${s.voladoLibre ? String.raw`Volado libre $l_v=${F(Math.max(0, s.lv))}$~m $\le d$: ` : ''}la sección crítica ($${xsDef}$) cae fuera de la zapata, $V_u = 0$.`;
      }
      let vu;
      if (s.col === 1 && s.lado === 'izq') vu = String.raw`V_u = w\,x = ${F(v.w)}(${F(s.xs)})`;
      else if (s.col === 2 && s.lado === 'der') vu = String.raw`V_u = w\,(L-x) = ${F(v.w)}(${F(L)}-${F(s.xs)})`;
      else vu = String.raw`V_u = \left|\,w\,x - R_1\,\right| = \left|\,${F(v.w)}(${F(s.xs)}) - ${F(v.R1)}\,\right|`;
      return String.raw`\paragraph{${nom}.}${s.voladoLibre ? ` Volado libre $l_v=${F(s.lv)}$~m.` : ''}
\eqline{${xsDef}}
\eqline{${vu} = ${F(s.Vu)}\ \mathrm{t}\ ${s.ok ? '\\le' : '>'}\ \phi V_c = ${F(s.pVc)}\ \mathrm{t}\quad ${ok(s.ok)}}`;
    }).join('\n');

    // ---------------- Paso 8: punzonamiento ----------------
    const punz = est.punz.map(p => {
      const c = p.col === 1 ? c1 : c2, R = p.col === 1 ? 'R_1' : 'R_2';
      const ld = p.lados;
      const b0Expr = ld >= 4 ? `2(${F(p.lx, 3)}) + 2(${F(p.ly, 3)})`
        : ld === 3 ? (p.ly < B - 1e-6 ? `2(${F(p.lx, 3)}) + ${F(p.ly, 3)}` : `${F(p.lx, 3)} + 2(${F(p.ly, 3)})`)
          : `${F(p.lx, 3)} + ${F(p.ly, 3)}`;
      return String.raw`\paragraph{Columna ${p.col} (${c.b}$\times$${c.h}~cm), columna de ${p.ubic}: $\alpha_s = ${p.alfa}$.}
\eqline{\text{lado} \parallel L = ${F(p.lx, 3)}\ \mathrm{m},\quad \text{lado} \parallel B = h + d = ${F(p.ly, 3)}\ \mathrm{m},\quad b_0 = ${b0Expr} = ${F(p.b0, 3)}\ \mathrm{m}}
\eqline{V_{u2} = ${R} - q_u A_0 = ${F(p.R)} - ${F(qu)}(${F(p.lx, 3)})(${F(p.ly, 3)}) = ${F(p.Vu)}\ \mathrm{t};\qquad \beta = ${F(p.beta)}}
\eqline{\phi V_{c1} = 0.85\left(0.53+\frac{1.06}{\beta}\right)\sqrt{f'_c}\,b_0 d = \frac{0.85\left(0.53+\frac{1.06}{${F(p.beta)}}\right)\sqrt{${fc0}}\,(${F(p.b0 * 100, 1)})(${F(d, 1)})}{1000} = ${F(p.pV1)}\ \mathrm{t}}
\eqline{\phi V_{c2} = 0.85(0.27)\left(\frac{\alpha_s d}{b_0}+2\right)\sqrt{f'_c}\,b_0 d = \frac{0.85(0.27)\left(\frac{${p.alfa}(${F(d, 1)})}{${F(p.b0 * 100, 1)}}+2\right)\sqrt{${fc0}}\,(${F(p.b0 * 100, 1)})(${F(d, 1)})}{1000} = ${F(p.pV2)}\ \mathrm{t}}
\eqline{\phi V_{c3} = 0.85(1.10)\sqrt{f'_c}\,b_0 d = \frac{0.85(1.10)\sqrt{${fc0}}\,(${F(p.b0 * 100, 1)})(${F(d, 1)})}{1000} = ${F(p.pV3)}\ \mathrm{t}}
\eqline{V_{u2} = ${F(p.Vu)}\ \mathrm{t}\ ${p.ok ? '\\le' : '>'}\ \phi V_c = ${F(p.pVc)}\ \mathrm{t}\quad ${ok(p.ok)}}`;
    }).join('\n');

    // ---------------- Flexión ----------------
    const flexBloque = (titulo, f, b_cm, armadoTxt, conRige = true) => String.raw`\paragraph{${titulo}.} $M_u=${F(f.Mu)}$~t$\cdot$m, $b=${F(b_cm, 1)}$~cm, $d=${F(d, 1)}$~cm:
\eqline{a = d-\sqrt{d^2-\frac{2M_u}{\phi\,0.85 f'_c\, b}} = ${F(d, 1)}-\sqrt{${F(d, 1)}^2-\frac{2(${F(f.Mu * 1e5, 0)})}{0.90(0.85)(${fc0})(${F(b_cm, 1)})}} = ${F(f.a)}\ \mathrm{cm}}
\eqline{A_s = \frac{M_u}{\phi f_y (d-a/2)} = \frac{${F(f.Mu * 1e5, 0)}}{0.90(${fy0})(${F(d, 1)}-${F(f.a)}/2)} = ${F(f.As_calc)}\ \mathrm{cm^2}}
\eqline{A_{s,max} = 0.319\,\beta_1\frac{f'_c}{f_y}\,b\,d = ${F(f.As_max)}\ \mathrm{cm^2};\quad A_{s,min} = 0.0012\,b\,h_z = 0.0012(${F(b_cm, 1)})(${hz}) = ${F(f.As_min)}\ \mathrm{cm^2}}
${conRige ? String.raw`Rige \textbf{${f.As_calc >= f.As_min ? 'el cálculo por flexión' : 'la cuantía mínima'}}: $A_s = ${F(f.As)}\ \mathrm{cm^2}$` : ''}${f.ok ? '' : ' \\textcolor{badred}{($A_s$ supera $A_{s,max}$: aumente $h_z$)}'}${armadoTxt ? ` $\\Rightarrow$ ${armadoTxt}` : ''}${conRige || !f.ok ? '.' : ''}`;
    const armTxt = o => String.raw`\textbf{${o.N}} ${bar(o.bar)} @ ${o.s}~cm`;

    // ---------------- Paso 11: transversal ----------------
    const transv = est.trans.map((t, k) => {
      const c = cols[k], bd = a.bandas[k];
      return String.raw`\paragraph{Zapata ${t.col} (columna ${t.col}).} Ancho $a = ${F(t.a)}$~m (${k === 0 ? 'del borde izquierdo' : 'del borde derecho'} a la sección de cortante nulo), volado $l_v = (B-h_${t.col})/2 = (${F(B)}-${F(c.h_m)})/2 = ${F(t.lv)}$~m.
\eqline{V_u = q_u\,a\,(l_v-d) = ${F(qu)}(${F(t.a)})(${F(t.lv)}-${F(dm)}) = ${F(t.Vu)}\ \mathrm{t}}
\eqline{\phi V_c = 0.85(0.53)\sqrt{f'_c}\,a\,d = \frac{0.85(0.53)\sqrt{${fc0}}\,(${F(t.a * 100, 1)})(${F(d, 1)})}{1000} = ${F(t.pVc)}\ \mathrm{t}\ ${t.okV ? '\\ge' : '<'}\ V_u\quad ${ok(t.okV)}}
\eqline{M_u = q_u\,a\,\frac{l_v^2}{2} = ${F(qu)}(${F(t.a)})\frac{${F(t.lv)}^2}{2} = ${F(t.Mu)}\ \mathrm{t\cdot m}}
${flexBloque(`Acero transversal inferior, zapata ${t.col}`, t.fl, t.a * 100, '', false)}

El acero calculado se concentra en la franja de la cara de la columna $\pm d/2$: de $x=${F(bd.ini)}$ a $${F(bd.fin)}$~m (ancho ${F(bd.ancho)}~m, útil ${F(bd.util, 1)}~cm), con al menos la cuantía mínima de la franja, $0.0012(${F(bd.ancho * 100, 1)})(${hz}) = ${F(bd.AsMinBanda)}\ \mathrm{cm^2}$. El resto del ancho $a$ lleva la malla mínima.
\eqline{A_{s,franja} = \max(${F(t.fl.As_calc)},\ ${F(bd.AsMinBanda)}) = ${F(bd.As)}\ \mathrm{cm^2}\ \Rightarrow\ \text{${armTxt(bd)}}}`;
    }).join('\n');

    // ---------------- Croquis en planta (ficha técnica) ----------------
    const sp = Math.min(13 / L, 7 / B);
    const P = x => F(x * sp, 3);
    let barras = '';
    const Ni = Math.min(a.longInf.N, 60);
    for (let j = 0; j < Ni; j++) {
      const y = 0.075 + j * (B - 0.15) / Math.max(1, Ni - 1);
      barras += `\\draw[blue!70!black, line width=0.5pt] (${P(0.05)},${P(y)}) -- (${P(L - 0.05)},${P(y)});\n`;
    }
    const vbar = (xcm, w) => `\\draw[orange!85!black, line width=${w}] (${P(xcm / 100)},${P(0.05)}) -- (${P(xcm / 100)},${P(B - 0.05)});\n`;
    a.bandas.forEach(b => {
      const x0 = b.ini * 100 + (b.ini <= 1e-6 ? r.K.R : 0);
      for (let i = 0; i < b.N; i++) barras += vbar(x0 + i * b.util / Math.max(1, b.N - 1), '0.9pt');
    });
    for (let xc = r.K.R; xc <= L * 100 - r.K.R + 1e-6; xc += a.transMin.s) {
      if (a.bandas.some(b => xc >= b.ini * 100 - 2 && xc <= b.fin * 100 + 2)) continue;
      barras += vbar(xc, '0.45pt');
    }
    const planta = String.raw`\begin{tikzpicture}[>=Stealth, font=\scriptsize]
${a.bandas.map(b => String.raw`\fill[orange!12] (${P(b.ini)},0) rectangle (${P(b.fin)},${P(B)});`).join('\n')}
${barras}\draw[very thick] (0,0) rectangle (${P(L)},${P(B)});
${cols.map((c, k) => String.raw`\fill[gray!70] (${P(c.x - c.b_m / 2)},${P((B - c.h_m) / 2)}) rectangle (${P(c.x + c.b_m / 2)},${P((B + c.h_m) / 2)});
\node[white, font=\tiny\bfseries] at (${P(c.x)},${P(B / 2)}) {C${k + 1}};`).join('\n')}
\draw[|<->|] (0,${P(B) * 1 + 0.45}) -- (${P(L)},${P(B) * 1 + 0.45}) node[midway, above] {$L=${F(L)}\ \mathrm{m}$};
\draw[|<->|] (${P(L) * 1 + 0.45},0) -- (${P(L) * 1 + 0.45},${P(B)}) node[midway, right] {$B=${F(B)}\ \mathrm{m}$};
\draw[|<->|] (${P(c1.x)},-0.45) -- (${P(c2.x)},-0.45) node[midway, below] {$S=${F(S)}$};
\end{tikzpicture}`;

    const fichaArmado = [
      ['Longitudinal superior (todo $L$)', armTxt(a.longSup)],
      ['Longitudinal inferior (todo $L$)', armTxt(a.longInf)],
      ...a.bandas.map(b => [`Transversal inferior bajo C${b.col} (franja ${F(b.ancho)}~m)`, armTxt(b)]),
      ['Transversal inferior (resto) y superior', String.raw`${bar(a.transMin.bar)} @ ${a.transMin.s}~cm`]
    ].map(([k, val]) => `${k} & ${val} \\\\`).join('\n');

    const avisos = r.avisos.length ? String.raw`
\begin{porticabanner}
\textbf{Advertencias:}
\begin{itemize}
${r.avisos.map(t => ` \\item ${t.replace(/%/g, '\\%')}`).join('\n')}
\end{itemize}
\end{porticabanner}` : '';

    // ---------------- Documento ----------------
    return String.raw`${T.PREAMBULO}
\begin{document}

\tituloMetodo{Diseño de zapata combinada}{DOS COLUMNAS ALINEADAS \ · \ NORMAS E.060 Y E.050}

\begin{porticabanner}
Modelo: zapata combinada rectangular que soporta dos columnas alineadas en la dirección $L$. La columna 1 está a $n$ del borde (lindero) y la columna 2 a $S$ de ella.
Se dimensiona en planta con cargas de servicio y se diseña con cargas amplificadas; en dirección longitudinal la zapata trabaja como una viga apoyada en las columnas bajo la presión $q_u$, y en dirección transversal como un volado bajo cada columna.\\[3pt]
{\small Unidades:\quad $P$ [t]\quad $M$ [t$\cdot$m]\quad $q$ [t/m$^2$]\quad $f'_c,\,f_y$ [kg/cm$^2$]\quad $B,\,L,\,n,\,S$ [m]\quad $d,\,h_z$ [cm]\quad $A_s$ [cm$^2$]. Momentos de columna (+) en el sentido que lleva la resultante hacia la columna 2.}
\end{porticabanner}
${avisos}
\begin{porticastepx}{Datos del problema}
\begin{center}
\begin{tabular}{@{}lrrr@{\hspace{3em}}lrrr@{}}
\toprule
\textbf{Columna 1} & Muerta & Viva & Sismo & \textbf{Columna 2} & Muerta & Viva & Sismo\\
\midrule
$P$ (t) & ${F(c1.PD, 1)} & ${F(c1.PL, 1)} & ${F(c1.PE, 1)} & $P$ (t) & ${F(c2.PD, 1)} & ${F(c2.PL, 1)} & ${F(c2.PE, 1)}\\
$M$ (t$\cdot$m) & ${F(c1.MD, 1)} & ${F(c1.ML, 1)} & ${F(c1.ME, 1)} & $M$ (t$\cdot$m) & ${F(c2.MD, 1)} & ${F(c2.ML, 1)} & ${F(c2.ME, 1)}\\
\bottomrule
\end{tabular}

\vspace{6pt}
\begin{tabular}{@{}ll@{\hspace{4em}}ll@{}}
\toprule
Columna 1 ($b\times h$) & $${c1.b}\times${c1.h}\ \mathrm{cm}$, ${bar(c1.bar)} & $q_{adm}$ & $${F(inp.qa_kgcm2)}\ \mathrm{kg/cm^2} = ${F(qa_t)}\ \mathrm{t/m^2}$\\
Columna 2 ($b\times h$) & $${c2.b}\times${c2.h}\ \mathrm{cm}$, ${bar(c2.bar)} & $D_f$, $\gamma_s$ & $${F(inp.Df)}\ \mathrm{m}$, $${F(inp.gm)}\ \mathrm{t/m^3}$\\
Eje C1 al lindero ($n$) & $${F(n)}\ \mathrm{m}$ & $s/c$ & $${F(inp.sc)}\ \mathrm{t/m^2}$\\
Entre ejes ($S$) & $${F(S)}\ \mathrm{m}$ & $f'_c$, $f_y$, $\beta_1$ & $${fc0}$, $${fy0}$, $${F(r.beta1)}$\\
\bottomrule
\end{tabular}
\end{center}
{\small $b$: lado de la columna paralelo a $L$; $h$: lado paralelo a $B$.}
\end{porticastepx}

\begin{porticastep}{1}{Peralte bruto de la zapata}
${paso1Cols}
Tras verificar cortante y punzonamiento (se sube de 5 en 5~cm)${r.hzManual ? ', con el valor adoptado' : ''}:
\[ \cajazul{h_z = ${hz}\ \mathrm{cm}}, \qquad d = h_z - 10 = ${F(d, 1)}\ \mathrm{cm}. \]
\IfFileExists{zapata-gancho.jpg}{%
\begin{porticafig}
\centering
\begin{tikzpicture}
\node[anchor=south west, inner sep=0] (img) at (0,0) {\includegraphics[width=0.55\linewidth]{zapata-gancho.jpg}};
\begin{scope}[x={(img.south east)}, y={(img.north west)}]
${T.figGanchoTex()}
\end{scope}
\end{tikzpicture}
\end{porticafig}}{}
\end{porticastep}

\begin{porticastep}{2}{Presión admisible neta}
${paso2}
\IfFileExists{zapata-relleno.jpg}{%
\begin{porticafig}
\centering
\begin{tikzpicture}
\node[anchor=south west, inner sep=0] (img) at (0,0) {\includegraphics[width=0.55\linewidth]{zapata-relleno.jpg}};
\begin{scope}[x={(img.south east)}, y={(img.north west)}]
${figRelleno}
\end{scope}
\end{tikzpicture}
\end{porticafig}}{}
\end{porticastep}

\begin{porticastep}{3}{Predimensionamiento en planta (cargas de servicio)}
\eqline{P_1 = ${F(c1.PD, 1)} + ${F(c1.PL, 1)} = ${F(s1.P, 1)}\ \mathrm{t},\quad M_1 = ${N(c1.MD, 1)} + ${N(c1.ML, 1)} = ${F(s1.M, 2)}\ \mathrm{t\cdot m},\quad e_1 = M_1/P_1 = ${F(s1.e, 3)}\ \mathrm{m}}
\eqline{P_2 = ${F(c2.PD, 1)} + ${F(c2.PL, 1)} = ${F(s2.P, 1)}\ \mathrm{t},\quad M_2 = ${N(c2.MD, 1)} + ${N(c2.ML, 1)} = ${F(s2.M, 2)}\ \mathrm{t\cdot m},\quad e_2 = -M_2/P_2 = ${F(-s2.e, 3)}\ \mathrm{m}}
Resultante medida desde el eje de la columna 1:
\eqline{X_R = \frac{P_1 e_1 + P_2 (S-e_2)}{P_1+P_2} = \frac{${F(s1.P, 1)}(${F(s1.e, 4)}) + ${F(s2.P, 1)}(${F(S)} - ${N(-s2.e, 4)})}{${F(s1.P, 1)}+${F(s2.P, 1)}} = ${F(pl.XR, 3)}\ \mathrm{m}}
\eqline{L = 2(X_R + n) = 2(${F(pl.XR, 3)} + ${F(n)}) = ${F(pl.L_calc, 3)}\ \mathrm{m}\ \Rightarrow\ \cajazul{L = ${F(L)}\ \mathrm{m}}${pl.Lman ? '\\ \\text{(adoptado)}' : ''}}
\eqline{B = \frac{P_1+P_2}{L\cdot 0.9\cdot q_{adm,neto}} = \frac{${F(s1.P + s2.P, 1)}}{${F(L)}(0.9)(${F(pl.q_neto)})} = ${F(pl.B_calc, 3)}\ \mathrm{m}\ \Rightarrow\ \cajazul{B = ${F(B)}\ \mathrm{m}}${pl.Bman ? '\\ \\text{(adoptado)}' : ''}\qquad A = ${F(pl.A)}\ \mathrm{m^2}}
${pl.L_ajust && !pl.Lman ? String.raw`\textcolor{badred}{$L=2(X_R+n)$ no alcanza a cubrir la columna 2: se usa el mínimo $n+S+b_2/2$ y la carga queda excéntrica.}` : ''}
\begin{porticafig}
\centering
${elevRes}
\end{porticafig}
\end{porticastep}

\begin{porticastep}{4}{Verificación de esfuerzos sobre el suelo}
Excentricidad respecto al centro de la zapata $e = X_R + n - L/2$. Si $|e|\le L/6$ la presión es trapezoidal; si no, triangular. Con sismo, $q_{lim} = 1.20\,q_{adm,neto} = ${F(1.2 * pl.q_neto)}$~t/m$^2$ (E.050).
${calcServ}

\vspace{6pt}
\begin{center}\small
\begin{tabular}{lrrrrrrc}
\toprule
Caso & $P$ (t) & $M$ (t$\cdot$m) & $X_R$ & $e$ (m) & $q_{max}$ & $q_{lim}$ & Verif.\\
\midrule
${filasServ}
\bottomrule
\end{tabular}
\end{center}
\end{porticastep}

\begin{porticastep}{5}{Presión última para el diseño}
Combinaciones de la E.060 con los momentos referidos al eje de la columna 1.
${calcUlt}

\vspace{6pt}
\begin{center}\small
\begin{tabular}{lrrrr}
\toprule
Combinación & $P_u$ (t) & $M_u$ (t$\cdot$m) & $e$ (m) & $q_{u,max}$\\
\midrule
${filasUlt}
\bottomrule
\end{tabular}
\end{center}
\[ \cajazul{q_u = ${F(qu)}\ \mathrm{t/m^2}} \qquad \text{(envolvente, se aplica uniforme en toda la zapata)} \]
\end{porticastep}

\begin{porticastep}{6}{Análisis estructural longitudinal}
La zapata es una viga de longitud $L$ apoyada en los ejes de las columnas ($x_1 = n = ${F(c1.x)}$~m, $x_2 = n+S = ${F(c2.x)}$~m) con la carga hacia arriba $w = q_u B$:
\begin{align*}
 w &= q_u B = ${F(qu)}(${F(B)}) = ${F(v.w)}\ \mathrm{t/m}\\
 R_2 &= \frac{w L (L/2 - n)}{S} = \frac{${F(v.w)}(${F(L)})(${F(L / 2, 3)} - ${F(n)})}{${F(S)}} = ${F(v.R2)}\ \mathrm{t}\\
 R_1 &= wL - R_2 = ${F(v.w)}(${F(L)}) - ${F(v.R2)} = ${F(v.R1)}\ \mathrm{t}\\
 M_1 &= w n^2/2 = ${F(v.M1)}\ \mathrm{t\cdot m}, \qquad V_1^{+} = w n = ${F(v.V1izq)}\ \mathrm{t}, \qquad V_1^{-} = V_1^{+} - R_1 = ${F(v.V1der)}\ \mathrm{t}\\
 x_{centro} &= R_1/w - n = ${F(v.x0 - c1.x)}\ \mathrm{m}\ \text{(desde el eje de C1)}, \qquad M_{centro} = ${F(v.Mcentro)}\ \mathrm{t\cdot m}\\
 M_2 &= w(L-n-S)^2/2 = ${F(v.M2)}\ \mathrm{t\cdot m}, \qquad V_2^{+} = ${F(v.V2izq)}\ \mathrm{t}, \qquad V_2^{-} = ${F(v.V2der)}\ \mathrm{t}
\end{align*}
\begin{porticafig}
\centering
${diagTikz}

\vspace{3pt}
{\small\itshape Momento (+) traccionando la fibra inferior (dibujado hacia abajo) y (--) la superior.}
\end{porticafig}
\end{porticastep}

\begin{porticastep}{7}{Corte por flexión (dirección longitudinal)}
Sección crítica a $d = ${F(dm)}$~m de la cara de cada columna:
\eqline{${pVcB(est.corteLong[0].pVc)}}
${corte}
\end{porticastep}

\begin{porticastep}{8}{Corte por punzonamiento}
Perímetro crítico a $d/2$ de las caras, recortado en los bordes de la zapata. Se usa la reacción de la columna en el análisis ($R_i$).
${punz}
\end{porticastep}

\begin{porticastep}{9}{Diseño por flexión (dirección longitudinal)}
$\phi=0.90$; dos capas de refuerzo, cuantía mínima $0.0012$ por capa; ancho $b = B = ${F(B * 100, 0)}$~cm.
${flexBloque('Refuerzo para $M_1$ (inferior, volado C1)', est.flex.M1, B * 100, '')}
${flexBloque('Refuerzo para $M_2$ (inferior, volado C2)', est.flex.M2, B * 100, '')}
${flexBloque('Refuerzo para $M_{centro}$ (superior)', est.flex.Mc, B * 100, armTxt(a.longSup))}

Acero inferior (el mayor entre $M_1$, $M_2$ y el mínimo): $A_s = ${F(a.longInf.As)}\ \mathrm{cm^2}$ $\Rightarrow$ ${armTxt(a.longInf)}.
\end{porticastep}

\begin{porticastep}{10}{Diseño en la dirección transversal}
Cada columna transmite su carga a una zapata transversal ficticia limitada por su borde más cercano y la sección de cortante nulo ($x = ${F(v.x0)}$~m desde el borde izquierdo).
${transv}

\paragraph{Resto de la zapata y cara superior.} Acero mínimo $0.0012(100)(${hz}) = ${F(a.transMin.As_m)}\ \mathrm{cm^2/m}$ $\Rightarrow$ ${bar(a.transMin.bar)} @ ${a.transMin.s}~cm.
\end{porticastep}

\begin{porticastep}{11}{Aplastamiento en la interfaz y anclaje}
${r.aplast.map(q => {
      const c = q.col === 1 ? c1 : c2;
      return String.raw`\paragraph{Columna ${q.col}.}
\eqline{A_1 = ${c.b}\times${c.h} = ${F(q.A1, 0)}\ \mathrm{cm^2};\quad \phi P_n = 0.65(0.85)f'_c A_1 = \frac{0.65(0.85)(${fc0})(${F(q.A1, 0)})}{1000} = ${F(q.pPn)}\ \mathrm{t}}
\eqline{P_u = ${F(q.Pu)}\ \mathrm{t}\ ${q.ok ? '\\le' : '>'}\ \phi P_n = ${F(q.pPn)}\ \mathrm{t}\quad ${ok(q.ok)}${q.ok ? '' : String.raw`;\quad \text{con } \sqrt{A_2/A_1} = ${F(q.factor)}:\ \phi P_n = ${F(q.pPnA2)}\ \mathrm{t}\quad ${ok(q.okA2)}`}}
\eqline{A_{s,dowels,min} = 0.005\,A_1 = ${F(q.dowelMin)}\ \mathrm{cm^2}}`;
    }).join('\n')}
\paragraph{Anclaje del acero transversal} (${bar(a.bandas[0].bar)}, barra recta):
\eqline{l_d = \max\!\left(\frac{f_y d_b}{8.2\sqrt{f'_c}},\ 30\right) = \max\!\left(\frac{${fy0}(${F(a.bandas[0].bar.diam, 3)})}{8.2\sqrt{${fc0}}},\ 30\right) = ${F(r.anclaje[0].ld, 1)}\ \mathrm{cm}}
${r.anclaje.map(q => String.raw`\eqline{\text{Zapata ${q.col}: } l_{disp} = l_v - r = ${F(q.la + r.K.R, 1)} - ${F(r.K.R, 1)} = ${F(q.la, 1)}\ \mathrm{cm}\quad ${ok(q.ok)}}`).join('\n')}
\end{porticastep}

\begin{porticastepx}{Ficha técnica}
\begin{center}
\begin{tabular}{@{}ll@{}}
\toprule
Dimensiones en planta & $B=${F(B)}\ \mathrm{m}\ \times\ L=${F(L)}\ \mathrm{m}$ \\
Espesor y peralte efectivo & $h_z=${hz}\ \mathrm{cm},\quad d=${F(d, 1)}\ \mathrm{cm}$ \\
${fichaArmado}
Presión máxima en servicio & $${F(pl.gob.qmax)}\ \mathrm{t/m^2}$ (${F(pl.gob.ratio * 100, 1)}\% del límite, caso ${pl.gob.id}) \\
\bottomrule
\end{tabular}
\end{center}
\begin{porticafig}
\centering
${planta}

\vspace{4pt}
{\small\itshape Acero inferior en planta. Azul: longitudinal; naranja: transversal (concentrado en las franjas bajo las columnas).}
\end{porticafig}
\end{porticastepx}

\end{document}
`;
  }

  /* ---------------- Tabla resumen (estilo hoja de cálculo) ---------------- */
  function buildCombinedSummaryHTML(r) {
    const f = (x, n = 2) => (x === Infinity ? '∞' : Number(x).toFixed(n));
    const { pl, est, armado: a, c1, c2, inp } = r;
    const v = est.vig;
    const arm = o => `${o.N} ${o.bar.name} @ ${o.s} cm`;
    const peorCorte = est.corteLong.reduce((m, s) => (s.Vu / s.pVc > m.Vu / m.pVc ? s : m));
    const secciones = [
      ['DATOS', [
        ['q adm', f(r.qa), 'ton/m²', 'Esfuerzo admisible del terreno', 'in'],
        ['Df', f(inp.Df), 'm', 'Profundidad de desplante', 'in'],
        ["f'c / fy", `${f(r.fc, 0)} / ${f(r.fy, 0)}`, 'kg/cm²', 'Concreto / acero', 'in'],
        ['C1 b×h', `${c1.b}×${c1.h}`, 'cm', `Columna 1 (b ∥ L), n = ${f(inp.n)} m al lindero`, 'in'],
        ['C2 b×h', `${c2.b}×${c2.h}`, 'cm', `Columna 2, S = ${f(inp.S)} m entre ejes`, 'in'],
        ['P1 / P2', `${f(r.s1.P, 1)} / ${f(r.s2.P, 1)}`, 'ton', 'Cargas de servicio (CM + CV)', 'in']
      ]],
      ['DIMENSIONAMIENTO', [
        ['hz', f(est.hz / 100), 'm', 'Altura de zapata', ''],
        ['d', f(est.d / 100), 'm', 'Peralte efectivo (hz − 0.10)', ''],
        ['q adm neto', f(pl.q_neto), 'ton/m²', 'Esfuerzo admisible neto', ''],
        ['XR', f(pl.XR, 3), 'm', 'Resultante en servicio desde el eje de C1', ''],
        ['L', f(pl.L), 'm', 'Largo de zapata', ''],
        ['B', f(pl.B), 'm', 'Ancho de zapata', ''],
        ['q máx', f(pl.gob.qmax), 'ton/m²', `Esfuerzo máximo en servicio (${pl.gob.id}, límite ${f(pl.gob.qlim)})`, 'out'],
        ['qu', f(est.qu), 'ton/m²', `Esfuerzo último de diseño (comb. ${est.uGob.id})`, '']
      ]],
      ['ANÁLISIS LONGITUDINAL', [
        ['w', f(v.w), 'ton/m', 'qu·B', ''],
        ['R1 / R2', `${f(v.R1)} / ${f(v.R2)}`, 'ton', 'Reacciones en las columnas', ''],
        ['M1 / M2', `${f(v.M1)} / ${f(v.M2)}`, 'ton·m', 'Momentos en los volados (tracción inferior)', ''],
        ['M centro', f(v.Mcentro), 'ton·m', `Momento entre columnas, a ${f(v.x0 - c1.x)} m de C1`, '']
      ]],
      ['CORTE Y PUNZONAMIENTO', [
        ['Vu', f(peorCorte.Vu), 'ton', `Corte longitudinal crítico (C${peorCorte.col} ${peorCorte.lado === 'izq' ? 'izq.' : 'der.'})`, ''],
        ['φVc', f(peorCorte.pVc), 'ton', 'Resistencia al corte (0.85·0.53√f\'c·B·d)', 'out'],
        ...est.punz.flatMap(p => [
          [`Vu2 C${p.col}`, f(p.Vu), 'ton', `Punzonamiento, columna de ${p.ubic} (b0 = ${f(p.b0)} m)`, ''],
          [`φVc C${p.col}`, f(p.pVc), 'ton', 'Resistencia a punzonamiento', 'out']
        ]),
        ...est.trans.flatMap(t => [[`Vu T${t.col}`, `${f(t.Vu)} ≤ ${f(t.pVc)}`, 'ton', `Corte transversal, zapata ficticia ${t.col} (a = ${f(t.a)} m)`, 'out']])
      ]],
      ['ACERO', [
        ['As sup', f(a.longSup.As), 'cm²', 'Longitudinal superior (M centro)', ''],
        ['Armado', arm(a.longSup), '', 'Longitudinal superior, todo L', 'out'],
        ['As inf', f(a.longInf.As), 'cm²', 'Longitudinal inferior (M1, M2 o mínimo)', ''],
        ['Armado', arm(a.longInf), '', 'Longitudinal inferior, todo L', 'out'],
        ...a.bandas.flatMap(b => [
          [`As T${b.col}`, f(b.As), 'cm²', `Transversal bajo C${b.col}`, ''],
          ['Armado', arm(b), '', `Franja de ${f(b.ancho)} m bajo C${b.col}`, 'out']
        ]),
        ['Mínimo', `${a.transMin.bar.name} @ ${a.transMin.s} cm`, '', 'Transversal resto y superior (0.0012·b·hz)', 'out']
      ]],
      ['APLASTAMIENTO Y ANCLAJE', [
        ...r.aplast.map(q => [`φPn C${q.col}`, `${f(q.pPn, 1)} ≥ ${f(q.Pu, 1)}`, 'ton', 'Aplastamiento columna-zapata (φPn ≥ Pu)', 'out']),
        ['ld / disp', `${f(r.anclaje[0].ld / 100)} / ${f(Math.min(...r.anclaje.map(q => q.la)) / 100)}`, 'm', 'Anclaje del acero transversal', 'out']
      ]]
    ];
    let filas = '';
    secciones.forEach(([titulo, items]) => {
      filas += `<tr class="fs-sec"><td colspan="4">${titulo}</td></tr>`;
      items.forEach(([sim, val, uni, desc, tipo]) => {
        const cls = tipo === 'in' ? 'fs-in' : tipo === 'out' ? 'fs-out' : '';
        filas += `<tr><th>${sim}</th><td class="fs-val ${cls}">${val}</td><td class="fs-uni">${uni}</td><td class="fs-desc">${desc}</td></tr>`;
      });
    });
    return `<table class="fs-table">
      <thead><tr><th colspan="4">DISEÑO DE ZAPATA COMBINADA</th></tr></thead>
      <tbody>${filas}</tbody>
    </table>
    <p class="fs-leyenda"><span class="fs-chip fs-in">dato</span> <span class="fs-chip fs-out">resultado de verificación</span></p>`;
  }

  /* ---------------- Botones del panel ---------------- */
  document.addEventListener('DOMContentLoaded', () => {
    const fuente = () => (window.combinedReport ? buildCombinedLatex(window.combinedReport) : null);
    document.getElementById('cmb-pdf')?.addEventListener('click', () => window.FootingTex?.abrirPdf?.(fuente, 'Zapata combinada'));
    document.getElementById('cmb-tex')?.addEventListener('click', () => window.FootingTex?.descargarTex?.(fuente, 'memoria-zapata-combinada.tex'));
    document.getElementById('cmb-summary')?.addEventListener('click', () => {
      const back = document.getElementById('footingSummaryBack');
      const body = document.getElementById('footingSummaryBody');
      if (!window.combinedReport) { alert('No hay resultados válidos. Revise los datos de entrada.'); return; }
      body.innerHTML = buildCombinedSummaryHTML(window.combinedReport);
      const tit = document.getElementById('footingSummaryTitle');
      if (tit) tit.textContent = 'Tabla resumen · Zapata combinada';
      back.classList.add('open');
    });
  });

  window.buildCombinedLatex = buildCombinedLatex;
  window.buildCombinedSummaryHTML = buildCombinedSummaryHTML;
})();
