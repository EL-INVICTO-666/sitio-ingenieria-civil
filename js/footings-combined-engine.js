/**
 * ===================================================================
 * MOTOR DE CÁLCULO - ZAPATA COMBINADA (2 columnas alineadas)
 * Libro del curso (Concreto Armado II, §1.5) y hoja "Ejemplo zapata
 * combinada". Norma E.060 (resistencia) y E.050 (presiones en servicio).
 *
 * Convenciones:
 *  - La zapata se mide a lo largo de L desde su borde izquierdo (x = 0).
 *    La columna 1 está a x1 = n y la columna 2 a x2 = n + S.
 *  - b = lado de la columna paralelo a L; h = lado paralelo a B.
 *  - Momentos de columna (+) en el sentido que lleva la resultante hacia
 *    la columna 2 (horario, con la columna 1 a la izquierda).
 *  - Momento flector (+) tracciona la fibra inferior (volados);
 *    (−) tracciona la superior (tramo entre columnas).
 * Unidades: ton, m, cm, kg/cm².
 * ===================================================================
 */
(function (root) {
  'use strict';

  const BARS = {
    '3/8': { key: '3/8', area: 0.71, diam: 0.9525, name: 'Ø 3/8"' },
    '1/2': { key: '1/2', area: 1.29, diam: 1.27, name: 'Ø 1/2"' },
    '5/8': { key: '5/8', area: 2.00, diam: 1.5875, name: 'Ø 5/8"' },
    '3/4': { key: '3/4', area: 2.84, diam: 1.905, name: 'Ø 3/4"' },
    '1':   { key: '1', area: 5.10, diam: 2.54, name: 'Ø 1"' }
  };

  const K = {
    R: 7.5,          // recubrimiento (cm), concreto vaciado contra el suelo
    D_DESC: 10,      // d = hz − 10 cm
    PHI_V: 0.85,     // cortante
    PHI_F: 0.90,     // flexión
    PHI_B: 0.65,     // aplastamiento
    GAMMA_C: 2.4,    // ton/m³
    F_SISMO: 1.20,   // E.050: q adm,neto × 1.20 con sismo
    F_AREA: 0.90,    // B = P / (L · 0.9 · q neto)
    RHO_MIN: 0.0012, // por capa (dos capas, arriba y abajo)
    S_MAX: 30        // espaciamiento máximo (cm)
  };

  const EPS = 1e-9;
  const up5 = v => Math.ceil(v / 5 - EPS) * 5;
  const r05 = v => Math.round(Math.round(v / 0.05 + EPS) * 5) / 100;     // al 0.05 m más cercano
  const c05 = v => Math.round(Math.ceil(v / 0.05 - EPS) * 5) / 100;      // al 0.05 m superior

  /** Presión en el suelo para una carga P con momento M respecto al eje de la columna 1 */
  function presion(P, M, n, B, L) {
    if (!(P > 0)) return { P, M, XR: NaN, e: 0, qmax: 0, qmin: 0, caso: 'sin compresión' };
    const XR = M / P;
    const e = XR + n - L / 2;           // respecto al centro de la zapata
    const ea = Math.abs(e);
    const A = B * L;
    if (ea <= L / 6 + EPS) {
      return { P, M, XR, e, qmax: P / A * (1 + 6 * ea / L), qmin: P / A * (1 - 6 * ea / L), caso: 'trapezoidal' };
    }
    if (ea >= L / 2) return { P, M, XR, e, qmax: Infinity, qmin: 0, caso: 'volteo' };
    return { P, M, XR, e, qmax: 2 * P / (3 * B * (L / 2 - ea)), qmin: 0, caso: 'triangular' };
  }

  /** Flexión simple, sección rectangular b × d (cm). Mu en ton·m. */
  function flexion(Mu, b_cm, d_cm, hz_cm, fc, fy, beta1) {
    const M = Math.max(0, Mu) * 1e5;
    const As_min = K.RHO_MIN * b_cm * hz_cm;
    const As_max = 0.319 * beta1 * fc / fy * b_cm * d_cm;
    const disc = d_cm * d_cm - 2 * M / (0.85 * fc * K.PHI_F * b_cm);
    if (disc <= 0) return { Mu, b: b_cm, d: d_cm, a: NaN, As_calc: NaN, As_min, As_max, As: NaN, ok: false, usa: '—' };
    const a = d_cm - Math.sqrt(disc);
    const As_calc = M > 0 ? M / (K.PHI_F * fy * (d_cm - a / 2)) : 0;
    const As = Math.max(As_calc, As_min);
    return { Mu, b: b_cm, d: d_cm, a, As_calc, As_min, As_max, As, ok: As_calc <= As_max, usa: As_calc >= As_min ? 'As' : 'As mín' };
  }

  /** Reparte As en un ancho útil (cm) con la varilla dada */
  function distribuir(As, util_cm, bar, minN = 2) {
    if (!(As > 0) || !(util_cm > 0)) return { N: 0, s: 0, As_col: 0 };
    const N = Math.max(minN, Math.ceil(As / bar.area - EPS), Math.ceil(util_cm / K.S_MAX - EPS) + 1);
    return { N, s: Math.floor(util_cm / (N - 1)), As_col: N * bar.area };
  }

  /** Acero mínimo repartido por metro: espaciamiento al múltiplo de 5 cm inferior */
  function mallaMinima(hz_cm, bar) {
    const As_m = K.RHO_MIN * 100 * hz_cm;
    const s = Math.min(K.S_MAX, Math.max(5, Math.floor(bar.area / As_m * 100 / 5 + EPS) * 5));
    return { As_m, s, As_col: bar.area * 100 / s };
  }

  function calcular(inp) {
    const avisos = [];
    const fc = inp.fc, fy = inp.fy;
    const sfc = Math.sqrt(fc);
    const beta1 = fc <= 280 ? 0.85 : Math.max(0.65, 0.85 - 0.05 * (fc - 280) / 70);
    const qa = inp.qa_kgcm2 * 10; // ton/m²
    const S = inp.S, n = inp.n;
    const c1 = { ...inp.c1, x: n }, c2 = { ...inp.c2, x: n + S };
    [c1, c2].forEach(c => { c.b_m = c.b / 100; c.h_m = c.h / 100; c.bar = BARS[c.barKey] || BARS['3/4']; });
    const bar = {
      longSup: BARS[inp.barLongSup] || BARS['3/4'],
      longInf: BARS[inp.barLongInf] || BARS['1/2'],
      transBanda: BARS[inp.barTransBanda] || BARS['3/4'],
      transMin: BARS[inp.barTransMin] || BARS['1/2']
    };

    if (n < c1.b_m / 2 - EPS) {
      return { invalido: true, motivo: `n = ${n.toFixed(2)} m es menor que b/2 de la columna 1 (${(c1.b_m / 2).toFixed(2)} m): la columna saldría de la zapata.` };
    }
    if (S <= (c1.b_m + c2.b_m) / 2) {
      return { invalido: true, motivo: 'Las columnas se superponen: S debe ser mayor que (b1 + b2)/2.' };
    }

    // ---------- PASO 1: peralte por anclaje de las varillas de columna ----------
    const anclajeCol = [c1, c2].map(c => {
      const db = c.bar.diam;
      const ldh = Math.max(0.075 * db * fy / sfc, 8 * db, 15);
      return { ldh, db, hzReq: ldh + K.R + db };
    });
    const hzReq = Math.max(...anclajeCol.map(a => a.hzReq));
    const hzManual = Number.isFinite(inp.hzMan) && inp.hzMan > 0;
    const hz0 = hzManual ? inp.hzMan : Math.max(up5(hzReq), up5(inp.hzMin || 0), 30);
    if (hzManual && inp.hzMan < hzReq) avisos.push(`hz adoptado (${inp.hzMan} cm) es menor que el requerido por anclaje de la columna (${hzReq.toFixed(1)} cm).`);

    // ---------- Cargas de servicio ----------
    const serv = c => ({ P: c.PD + c.PL, M: c.MD + c.ML, e: (c.PD + c.PL) > 0 ? (c.MD + c.ML) / (c.PD + c.PL) : 0 });
    const s1 = serv(c1), s2 = serv(c2);
    const hayE = [c1.PE, c1.ME, c2.PE, c2.ME].some(v => Math.abs(v) > EPS);
    const momento = (P2, M1, M2) => P2 * S + M1 + M2; // respecto al eje de la columna 1
    const combosServ = [{
      id: '4.1', titulo: 'Cargas gravitacionales', formula: 'CM + CV', f: 1,
      P: s1.P + s2.P, M: momento(s2.P, s1.M, s2.M)
    }];
    if (hayE) {
      combosServ.push({
        id: '4.2', titulo: 'Servicio con sismo, caso 1', formula: 'CM + CV + CS', f: K.F_SISMO,
        P: s1.P + c1.PE + s2.P + c2.PE, M: momento(s2.P + c2.PE, s1.M + c1.ME, s2.M + c2.ME)
      });
      combosServ.push({
        id: '4.3', titulo: 'Servicio con sismo, caso 2', formula: 'CM + CV − CS', f: K.F_SISMO,
        P: s1.P - c1.PE + s2.P - c2.PE, M: momento(s2.P - c2.PE, s1.M - c1.ME, s2.M - c2.ME)
      });
    }

    // ---------- Combinaciones últimas (E.060) ----------
    const ULT = [
      { id: 1, nombre: '1.4CM + 1.7CV', f: c => ({ P: 1.4 * c.PD + 1.7 * c.PL, M: 1.4 * c.MD + 1.7 * c.ML }) },
      { id: 2, nombre: '1.25CM + 1.25CV + CS', f: c => ({ P: 1.25 * (c.PD + c.PL) + c.PE, M: 1.25 * (c.MD + c.ML) + c.ME }) },
      { id: 3, nombre: '1.25CM + 1.25CV − CS', f: c => ({ P: 1.25 * (c.PD + c.PL) - c.PE, M: 1.25 * (c.MD + c.ML) - c.ME }) },
      { id: 4, nombre: '0.9CM + CS', f: c => ({ P: 0.9 * c.PD + c.PE, M: 0.9 * c.MD + c.ME }) },
      { id: 5, nombre: '0.9CM − CS', f: c => ({ P: 0.9 * c.PD - c.PE, M: 0.9 * c.MD - c.ME }) }
    ].map(u => {
      const u1 = u.f(c1), u2 = u.f(c2);
      return { id: u.id, nombre: u.nombre, P1: u1.P, M1: u1.M, P2: u2.P, M2: u2.M, P: u1.P + u2.P, M: momento(u2.P, u1.M, u2.M) };
    });

    // ---------- PASOS 2 y 3: presión neta y dimensiones en planta ----------
    function enPlanta(hz_cm) {
      const hz_m = hz_cm / 100;
      const hs = Math.max(0, inp.Df - hz_m);
      const q_neto = inp.metodo === 'prac'
        ? qa - 2.05 * inp.Df - inp.sc
        : qa - inp.gm * hs - K.GAMMA_C * hz_m - inp.sc;
      if (q_neto <= 0) return { invalido: true, q_neto, hs };

      const g = combosServ[0];
      const XR = g.M / g.P;
      const L_calc = 2 * (XR + n);
      const L_min = c2.x + c2.b_m / 2;
      let L = Math.max(r05(L_calc), c05(L_min));
      const L_ajust = r05(L_calc) < c05(L_min) - EPS;
      const Lman = Number.isFinite(inp.Lman) && inp.Lman > 0;
      if (Lman) L = inp.Lman;
      const B_calc = g.P / (L * K.F_AREA * q_neto);
      const B_min = Math.max(1.0, Math.max(c1.h_m, c2.h_m) + 0.30);
      let B = Math.max(r05(B_calc), c05(B_min));
      const Bman = Number.isFinite(inp.Bman) && inp.Bman > 0;
      if (Bman) B = inp.Bman;

      const evaluar = (Bv, Lv) => combosServ.map(c => {
        const p = presion(c.P, c.M, n, Bv, Lv);
        const qlim = c.f * q_neto;
        return { ...c, ...p, qlim, ratio: p.qmax / qlim, Lsobre6: Lv / 6 };
      });
      let tabla = evaluar(B, L);
      const peor = t => t.reduce((a, b) => (b.ratio > a.ratio ? b : a));
      for (let i = 0; i < 400 && peor(tabla).ratio > 1 && !Bman; i++) {
        B = Math.round((B + 0.05) * 100) / 100;
        tabla = evaluar(B, L);
      }
      const gob = peor(tabla);
      return {
        invalido: false, hz_cm, hs, q_neto, XR, L_calc, L_min, L_ajust, Lman, B_calc, Bman, B, L,
        A: B * L, tabla, gob, ok: gob.ratio <= 1 + EPS
      };
    }

    // ---------- Etapa estructural ----------
    function estructura(pl, hzInicio) {
      const { B, L } = pl;
      const x1 = c1.x, x2 = c2.x;

      // Presión última envolvente (uniforme, como la hoja del curso)
      const ult = ULT.map(u => ({ ...u, ...presion(u.P, u.M, n, B, L) }));
      const qu = Math.max(...ult.map(u => u.qmax));
      const uGob = ult.reduce((a, b) => (b.qmax > a.qmax ? b : a));

      // Viga sobre dos apoyos (columnas) con carga uniforme hacia arriba w = qu·B
      const w = qu * B;
      const R2 = w * L * (L / 2 - n) / S;
      const R1 = w * L - R2;
      const V = x => w * x - (x > x1 + EPS ? R1 : 0) - (x > x2 + EPS ? R2 : 0);
      const M = x => w * x * x / 2 - R1 * Math.max(0, x - x1) - R2 * Math.max(0, x - x2);
      const x0 = Math.min(x2, Math.max(x1, R1 / w));  // cortante nulo entre columnas
      const vig = {
        w, R1, R2, x0,
        M1: M(x1), M2: M(x2), Mcentro: M(x0),
        V1izq: w * x1, V1der: w * x1 - R1, V2izq: w * x2 - R1, V2der: w * x2 - R1 - R2
      };
      // Muestreo para los diagramas (con los saltos en las columnas)
      const N = 160, puntos = [];
      for (let i = 0; i <= N; i++) puntos.push(L * i / N);
      [x1, x2, x0].forEach(x => puntos.push(x));
      puntos.sort((a, b) => a - b);
      vig.diagM = puntos.map(x => [x, M(x)]);
      vig.diagV = [[0, 0], [x1, vig.V1izq], [x1, vig.V1der], [x2, vig.V2izq], [x2, vig.V2der], [L, w * L - R1 - R2]];
      const Mmin = Math.min(...vig.diagM.map(p => p[1]));
      const Mmax = Math.max(...vig.diagM.map(p => p[1]));
      vig.Mneg = Math.max(0, -Mmin);

      let res = null;
      const hzFin = hzManual ? hzInicio : 300;
      for (let hz = hzInicio; hz <= hzFin; hz += 5) {
        const d = hz - K.D_DESC, dm = d / 100;
        const pVc = (b_m) => K.PHI_V * 0.53 * sfc * b_m * 100 * d / 1000;

        // --- Cortante por flexión (dirección longitudinal), a "d" de las caras ---
        const seccion = (col, lado) => {
          const cara = col.x + (lado === 'izq' ? -1 : 1) * col.b_m / 2;
          const lv = lado === 'izq' ? cara : L - cara;              // tramo hasta el borde
          const xs = cara + (lado === 'izq' ? -1 : 1) * dm;
          const voladoLibre = (col === c1 && lado === 'izq') || (col === c2 && lado === 'der');
          const fuera = xs <= EPS || xs >= L - EPS;
          const Vu = fuera ? 0 : Math.abs(V(xs));
          return { col: col === c1 ? 1 : 2, lado, voladoLibre, lv: voladoLibre ? lv : null, xs, fuera, Vu, pVc: pVc(B), ok: Vu <= pVc(B) + EPS };
        };
        const corteLong = [seccion(c1, 'izq'), seccion(c1, 'der'), seccion(c2, 'izq'), seccion(c2, 'der')];

        // --- Punzonamiento a d/2 de las caras ---
        const punz = [c1, c2].map((c, i) => {
          const R = i === 0 ? R1 : R2;
          const xa = c.x - c.b_m / 2 - dm / 2, xb = c.x + c.b_m / 2 + dm / 2;
          const izq = xa > EPS, der = xb < L - EPS;
          const lx = Math.min(L, xb) - Math.max(0, xa);       // lado ∥ L
          const ly = Math.min(B, c.h_m + dm);                  // lado ∥ B
          const bandas = (c.h_m + dm) < B - EPS;
          const lados = (izq ? 1 : 0) + (der ? 1 : 0) + (bandas ? 2 : 0);
          const b0 = (izq ? ly : 0) + (der ? ly : 0) + (bandas ? 2 * lx : 0);
          const A0 = lx * ly;
          const Vu = R - qu * A0;
          const beta = Math.max(c.b, c.h) / Math.min(c.b, c.h);
          const alfa = lados >= 4 ? 40 : lados === 3 ? 30 : 20;
          const f = coef => K.PHI_V * coef * sfc * b0 * 100 * d / 1000;
          const pV1 = f(0.53 + 1.06 / beta);
          const pV2 = f(0.27 * (alfa * d / (b0 * 100) + 2));
          const pV3 = f(1.10);
          const pVc = Math.min(pV1, pV2, pV3);
          return { col: i + 1, R, lx, ly, b0, A0, Vu, beta, alfa, lados, ubic: alfa === 40 ? 'interior' : alfa === 30 ? 'borde' : 'esquina', pV1, pV2, pV3, pVc, ok: Vu <= pVc + EPS };
        });

        // --- Flexión longitudinal ---
        const Bcm = B * 100;
        const flex = {
          M1: flexion(Math.max(0, vig.M1), Bcm, d, hz, fc, fy, beta1),
          M2: flexion(Math.max(0, vig.M2), Bcm, d, hz, fc, fy, beta1),
          Mc: flexion(vig.Mneg, Bcm, d, hz, fc, fy, beta1),
          Mpos: flexion(Math.max(0, Mmax), Bcm, d, hz, fc, fy, beta1)
        };

        // --- Dirección transversal: zapatas ficticias hasta el cortante nulo ---
        const trans = [c1, c2].map((c, i) => {
          const a = i === 0 ? x0 : L - x0;
          const lv = (B - c.h_m) / 2;
          const Vu = qu * a * Math.max(0, lv - dm);
          const pV = pVc(a);
          const Mu = qu * a * lv * lv / 2;
          const fl = flexion(Mu, a * 100, d, hz, fc, fy, beta1);
          // Franja de reparto: caras de la columna ± d/2 (recortada al borde)
          const xa = c.x - c.b_m / 2 - dm / 2, xb = c.x + c.b_m / 2 + dm / 2;
          const ini = Math.max(0, xa), fin = Math.min(L, xb);
          const util = (fin - ini) * 100 - (xa <= EPS ? K.R : 0) - (xb >= L - EPS ? K.R : 0);
          return { col: i + 1, a, lv, lv_d: lv - dm, Vu, pVc: pV, okV: Vu <= pV + EPS, Mu, fl, banda: { ini, fin, ancho: fin - ini, util } };
        });

        const flexOK = [flex.M1, flex.M2, flex.Mc, ...trans.map(t => t.fl)].every(f => f.ok);
        const ok = flexOK && corteLong.every(s => s.ok) && punz.every(p => p.ok) && trans.every(t => t.okV);
        res = { hz, d, corteLong, punz, flex, trans, flexOK, ok };
        if (ok) break;
      }
      return { ...res, ult, qu, uGob, vig };
    }

    // ---------- Iteración hz ↔ planta ----------
    let hz = hz0, pl = null, est = null;
    for (let k = 0; k < 60; k++) {
      pl = enPlanta(hz);
      if (pl.invalido) break;
      est = estructura(pl, hz);
      if (est.hz === hz || hzManual) break;
      hz = est.hz;
    }
    if (pl.invalido) {
      return { invalido: true, motivo: `q adm neta = ${pl.q_neto.toFixed(2)} ton/m² (≤ 0). Revise q adm, Df o S/C.` };
    }
    if (pl.L_ajust && !pl.Lman) avisos.push(`L = 2(XR + n) no alcanza a cubrir la columna 2; se usó L = ${pl.L.toFixed(2)} m y la carga queda excéntrica. Evalúe una zapata trapezoidal o conectada.`);
    if (!est.ok) avisos.push('Con hz = 3.00 m o el hz adoptado no se cumplen todas las verificaciones: revise las dimensiones.');

    // ---------- Armado ----------
    const { B, L } = pl;
    const hzF = est.hz;
    const utilB = (b) => B * 100 - 2 * K.R - b.diam;
    const armado = {
      longSup: { bar: bar.longSup, As: est.flex.Mc.As, ...distribuir(est.flex.Mc.As, utilB(bar.longSup), bar.longSup, 3) },
      longInf: { bar: bar.longInf, As: Math.max(est.flex.M1.As, est.flex.M2.As, est.flex.Mpos.As), ...distribuir(Math.max(est.flex.M1.As, est.flex.M2.As, est.flex.Mpos.As), utilB(bar.longInf), bar.longInf, 3) },
      // En la franja va el As calculado; si rige la cuantía mínima, basta la mínima del ancho de la franja
      // (el resto de la zapata ya lleva su malla mínima).
      bandas: est.trans.map(t => {
        const AsMinBanda = K.RHO_MIN * t.banda.ancho * 100 * hzF;
        const As = Math.max(t.fl.As_calc, AsMinBanda);
        return { col: t.col, bar: bar.transBanda, As, AsMinBanda, rigeMin: t.fl.As_calc < AsMinBanda, ...t.banda, ...distribuir(As, t.banda.util, bar.transBanda) };
      }),
      transMin: { bar: bar.transMin, ...mallaMinima(hzF, bar.transMin) }
    };
    armado.bandas.forEach(b => { if (b.N && b.s < 7.5) avisos.push(`Franja transversal de la columna ${b.col}: espaciamiento ${b.s} cm, use una varilla de mayor diámetro.`); });

    // ---------- Aplastamiento en la interfaz columna-zapata ----------
    const aplast = [c1, c2].map((c, i) => {
      const Pu = Math.max(...ULT.map(u => (i === 0 ? u.P1 : u.P2)));
      const A1 = c.b * c.h;
      // A2 concéntrica y semejante: se limita por el borde más cercano y por la pendiente 1:2
      const ext = Math.max(0, Math.min(c.x - c.b_m / 2, L - c.x - c.b_m / 2, (B - c.h_m) / 2, 2 * hzF / 100)) * 100;
      const A2 = (c.b + 2 * ext) * (c.h + 2 * ext);
      const factor = Math.min(2, Math.sqrt(A2 / A1));
      const pPn = K.PHI_B * 0.85 * fc * A1 / 1000;
      return { col: i + 1, Pu, A1, A2, factor, pPn, pPnA2: pPn * factor, ok: Pu <= pPn + EPS, okA2: Pu <= pPn * factor + EPS, dowelMin: 0.005 * A1 };
    });

    // ---------- Anclaje de las varillas transversales (barra recta) ----------
    const ld = Math.max(fy * bar.transBanda.diam / (8.2 * sfc), 30);
    const anclaje = est.trans.map(t => ({ col: t.col, ld, la: t.lv * 100 - K.R, ok: t.lv * 100 - K.R >= ld }));

    return {
      invalido: false, avisos, K, fc, fy, beta1, qa, inp, c1, c2, s1, s2, hayE,
      anclajeCol, hzReq, hz0, hzManual, combosServ, ULT,
      pl, est, armado, aplast, anclaje, bar
    };
  }

  const api = { calcular, presion, flexion, BARS, K };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.ZapataCombinada = api;
})(typeof window !== 'undefined' ? window : globalThis);
