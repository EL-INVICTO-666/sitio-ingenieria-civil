/**
 * ===================================================================
 * PROGRAMA DE DISEÑO ESTRUCTURAL DE ZAPATAS
 * Normativa: ACI 318 / NTE E.060 (Concreto Armado y Cimentaciones)
 * ===================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
  initFootingTabs();
  initIsolatedFootingCalculator();
});

/**
 * 1. Control de Pestañas / Tipos de Zapatas
 */
function initFootingTabs() {
  const tabs = document.querySelectorAll('.footing-tab-btn');
  const panels = document.querySelectorAll('.footing-panel');

  if (tabs.length === 0) return;

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.getAttribute('data-footing');
      if (!target) return;

      // Desactivar todos los paneles
      panels.forEach(p => p.classList.remove('active'));

      // Desactivar todas las pestañas de la barra superior
      const topTabs = document.querySelectorAll('.footing-selector-bar .footing-tab-btn');
      topTabs.forEach(t => t.classList.remove('active'));

      // Activar la pestaña superior correspondiente
      const targetTopTab = document.querySelector(`.footing-selector-bar .footing-tab-btn[data-footing="${target}"]`);
      if (targetTopTab) {
        targetTopTab.classList.add('active');
      }

      // Activar el panel correspondiente
      const targetPanel = document.getElementById(`panel-${target}`);
      if (targetPanel) {
        targetPanel.classList.add('active');
      }
    });
  });
}

/**
 * 2. Motor de Cálculo para Zapatas Aisladas Céntricas
 */
function initIsolatedFootingCalculator() {
  // Inputs de Geotecnia
  const qaInput = document.getElementById('iso-qa');
  const dfInput = document.getElementById('iso-df');
  const gmInput = document.getElementById('iso-gm');
  const scInput = document.getElementById('iso-sc');
  const hzInput = document.getElementById('iso-hz');
  const mInput = document.getElementById('iso-m');
  const mlInput = document.getElementById('iso-ml');
  const peInput = document.getElementById('iso-pe');
  const meInput = document.getElementById('iso-me');

  // Inputs de Cargas
  const pdInput = document.getElementById('iso-pd');
  const plInput = document.getElementById('iso-pl');

  // Inputs de Geometría de Columna
  const cxInput = document.getElementById('iso-cx');
  const cyInput = document.getElementById('iso-cy');

  // Inputs de Materiales
  const fcInput = document.getElementById('iso-fc');
  const fyInput = document.getElementById('iso-fy');
  const barSelect = document.getElementById('iso-bar');
  const colBarSelect = document.getElementById('iso-colbar');
  const barYSelect = document.getElementById('iso-bar-y');
  const qmSelect = document.getElementById('iso-qm');
  const planSelect = document.getElementById('iso-plan');
  const bManInput = document.getElementById('iso-bman');
  const lManInput = document.getElementById('iso-lman');

  // Si no existen los elementos en el DOM, terminar
  if (!qaInput || !pdInput || !cxInput || !fcInput) return;

  // Áreas nominales de varillas comerciales en cm²
  const barAreas = {
    '1/2': { area: 1.29, diam: 1.27, name: 'Ø 1/2"' },
    '5/8': { area: 2.00, diam: 1.59, name: 'Ø 5/8"' },
    '3/4': { area: 2.84, diam: 1.91, name: 'Ø 3/4"' },
    '1':   { area: 5.10, diam: 2.54, name: 'Ø 1"' }
  };
  Object.keys(barAreas).forEach(k => { barAreas[k].key = k; });

  const D_DESC_CM = 10;  // d = hz − 10 cm (siempre)
  const R_CM = 7.5;      // Recubrimiento (concreto vaciado contra el suelo)
  const PHI_V = 0.85;    // Factor de reducción: cortante
  const PHI_F = 0.90;    // Factor de reducción: flexión
  const GAMMA_C = 2.4;   // Peso específico del concreto (ton/m³)

  /**
   * Presión máxima del suelo según excentricidad e = M/P (B paralelo a la flexión)
   * Caso A: |e| < B/6 | Caso B: |e| = B/6 | Caso C: |e| > B/6 (despegue parcial)
   * e conserva su signo (lado de la presión máxima); las presiones usan |e|.
   */
  function presionSuelo(P, M, B, L) {
    const e = M / P;
    const ea = Math.abs(e);
    const A = B * L;
    if (ea <= B / 6 + 1e-9) {
      const qmax = (P / A) * (1 + 6 * ea / B);
      const qmin = (P / A) * (1 - 6 * ea / B);
      return { e, qmax, qmin, caso: Math.abs(ea - B / 6) < 1e-6 ? 'B' : 'A' };
    }
    if (ea >= B / 2) return { e, qmax: Infinity, qmin: 0, caso: 'C' }; // vuelco
    return { e, qmax: (2 * P) / (3 * L * (B / 2 - ea)), qmin: 0, caso: 'C' };
  }

  function calculate() {
    window.footingReport = null;
    // Un 0 es un valor válido: solo se usa el valor por defecto si el campo está vacío
    const num = (el, def) => {
      const v = parseFloat(el?.value);
      return Number.isFinite(v) ? v : def;
    };

    // 1. Datos de entrada
    const qa_kgcm2 = num(qaInput, 2.0);
    const Df_m = num(dfInput, 1.50);
    const gamma_m = num(gmInput, 2.0);
    const sc_tonm2 = num(scInput, 0.50);

    const PD_ton = num(pdInput, 45.0);
    const PL_ton = num(plInput, 25.0);
    const MD_ton = Math.abs(num(mInput, 0));   // Momento muerto
    const ML_ton = Math.abs(num(mlInput, 0));  // Momento vivo
    const M_ton = MD_ton + ML_ton;
    const PE_ton = Math.abs(num(peInput, 0));
    const ME_ton = Math.abs(num(meInput, 0));

    const cx_cm = num(cxInput, 40);
    const cy_cm = num(cyInput, 40);

    const fc = num(fcInput, 210);
    const fy = num(fyInput, 4200);
    const barData = barAreas[barSelect.value] || barAreas['1/2'];
    const db = barData.diam;
    // Varilla de la dirección Y (por defecto igual a la de X)
    const barDataY = (barYSelect && barAreas[barYSelect.value]) ? barAreas[barYSelect.value] : barData;
    const dbY = barDataY.diam;
    const AbY = barDataY.area;

    // PASO 1: hz ≥ ldh + r + db, con db = varilla de la columna (como la hoja de cálculo del curso), recubrimiento 7.5 y hz ≥ 30 cm
    const colBar = barAreas[colBarSelect?.value] || barAreas['5/8'];
    const ldh = Math.max(0.075 * colBar.diam * fy / Math.sqrt(fc), 8 * colBar.diam, 15);
    const hz_ldh = Math.ceil((ldh + R_CM + colBar.diam) / 5 - 1e-9) * 5;
    const hz_min_cm = Math.max(30, hz_ldh, Math.ceil(num(hzInput, 30) / 5) * 5);
    const Ab = barData.area;

    const qa_tonm2 = qa_kgcm2 * 10; // 1 kg/cm² = 10 ton/m²
    const P_serv_ton = PD_ton + PL_ton;
    const hayEventual = PE_ton > 0 || ME_ton > 0;

    // ===== ETAPA 1: GEOTECNIA (cargas de SERVICIO) =====
    const q_lim_factor = 1.20; // E.050: sismo/viento → q_adm,neto × 1.20
    const combosServ = [{ name: 'D+L', id: '4.1', titulo: 'Cargas gravitacionales', formula: 'CM + CV', P: P_serv_ton, M: M_ton, f: 1 }];
    if (hayEventual) {
      combosServ.push({ name: 'D+L+E', id: '4.2', titulo: 'Carga en servicio con sismo, caso 1', formula: 'CM + CV + CS', P: P_serv_ton + PE_ton, M: M_ton + ME_ton, f: q_lim_factor });
      combosServ.push({ name: 'D+L−E', id: '4.3', titulo: 'Carga en servicio con sismo, caso 2', formula: 'CM + CV − CS', P: Math.max(0.01, P_serv_ton - PE_ton), M: M_ton - ME_ton, f: q_lim_factor });
    }

    function dimensionarEnPlanta(hz_m) {
      const hs_m = Math.max(0, Df_m - hz_m);
      // PASO 2: método detallado (por capas) o práctico (γprom ≈ 2.05 ton/m³)
      const q_neto = (qmSelect && qmSelect.value === 'prac')
        ? qa_tonm2 - 2.05 * Df_m - sc_tonm2
        : qa_tonm2 - gamma_m * hs_m - GAMMA_C * hz_m - sc_tonm2;
      if (q_neto <= 0) return { invalido: true, q_neto };

      // PASO 3: Az ≈ Pserv / (factor·q_neto). Sin momento 1.00; con momento 0.90 (libro y hoja del curso).
      // El libro dice que 0.9 "podría ser menor" si la excentricidad es mayor, pero no dice cuánto ni desde qué excentricidad:
      // se mantiene 0.90 y el Paso 4 hace crecer la zapata si no cumple.
      const eMax = Math.max(...combosServ.map(c => Math.abs(c.M / c.P)));
      const fA = eMax < 1e-9 ? 1.0 : 0.9;
      const A_req = P_serv_ton / (fA * q_neto);
      // Forma de la planta: volados iguales (L − B = t − b, como el libro) o proporción de la columna (B/L = cx/cy)
      const modo = (planSelect && planSelect.value === 'prop') ? 'prop' : 'igual';
      const up05 = v => Math.ceil(v / 0.05 - 1e-9) * 0.05;
      let B, dimL;
      if (modo === 'prop') {
        const razon = cx_cm / cy_cm;
        dimL = Bv => Math.max(1.00, cy_cm / 100 + 0.30, up05(Bv / razon));
        B = Math.max(1.00, cx_cm / 100 + 0.30, up05(Math.sqrt(A_req * razon)));
      } else {
        const delta = (cy_cm - cx_cm) / 100; // L = B + (cy − cx)
        const B_calc = Math.abs(delta) < 0.01
          ? Math.sqrt(A_req)
          : (-delta + Math.sqrt(delta * delta + 4 * A_req)) / 2;
        dimL = Bv => Math.max(1.00, cy_cm / 100 + 0.30, up05(Bv + delta));
        B = Math.max(1.00, cx_cm / 100 + 0.30, up05(B_calc));
      }
      let L = dimL(B);

      // Dimensiones adoptadas por el usuario (opcionales): se respetan y solo se verifican
      const bMan = parseFloat(bManInput?.value), lMan = parseFloat(lManInput?.value);
      const manual = Number.isFinite(bMan) && Number.isFinite(lMan) && bMan > 0 && lMan > 0;
      if (manual) { B = bMan; L = lMan; }

      const evaluar = (Bv, Lv) => {
        let gob = null;
        combosServ.forEach(c => {
          const r = presionSuelo(c.P, c.M, Bv, Lv);
          const qlim = c.f * q_neto;
          const ratio = r.qmax / qlim;
          if (!gob || ratio > gob.ratio) gob = { ...r, ratio, qlim, combo: c.name, id: c.id, titulo: c.titulo, formula: c.formula };
        });
        return gob;
      };

      let geo = evaluar(B, L);
      for (let i = 0; i < 400 && geo.ratio > 1 && !manual; i++) {
        B = Math.round((B + 0.05) * 100) / 100;
        L = dimL(B);
        geo = evaluar(B, L);
      }
      return {
        invalido: false, q_neto, fA, modo: manual ? 'manual' : modo, B, L, geo, geoOK: geo.ratio <= 1, hs_m, A_req, eMax,
        tabla: combosServ.map(c => ({ name: c.name, id: c.id, titulo: c.titulo, formula: c.formula, P: c.P, M: c.M, ...presionSuelo(c.P, c.M, B, L), qlim: c.f * q_neto, f: c.f }))
      };
    }

    // ===== ETAPA 2: DISEÑO ESTRUCTURAL (cargas ÚLTIMAS, E.060) =====
    const combosUlt = [];
    {
      const Pu1 = 1.4 * PD_ton + 1.7 * PL_ton;
      combosUlt.push({ name: '1.4D+1.7L', P: Pu1, M: 1.4 * MD_ton + 1.7 * ML_ton });
      // Las 5 combinaciones de la E.060 se evalúan siempre; sin sismo ingresado (PE = ME = 0) las de ±E usan E = 0
      combosUlt.push({ name: '1.25(D+L)+E', P: 1.25 * P_serv_ton + PE_ton, M: 1.25 * M_ton + ME_ton });
      combosUlt.push({ name: '0.9D+E', P: 0.9 * PD_ton + PE_ton, M: 0.9 * MD_ton + ME_ton });
      // Momento con su signo: si sale negativo, e = M/P también y la presión máxima pasa al otro lado
      combosUlt.push({ name: '0.9D−E', P: Math.max(0.01, 0.9 * PD_ton - PE_ton), M: 0.9 * MD_ton - ME_ton });
      combosUlt.push({ name: '1.25(D+L)−E', P: Math.max(0.01, 1.25 * P_serv_ton - PE_ton), M: 1.25 * M_ton - ME_ton });
    }

    // Acero por flexión (bloque rectangular). Devuelve null si la sección no alcanza.
    function flexionDetalle(Mu_tonm, b_m, d_cm, hz_cm) {
      const Mu = Mu_tonm * 1e5; // kg·cm
      const b = b_m * 100;
      const disc = d_cm * d_cm - (2 * Mu) / (0.85 * fc * PHI_F * b);
      const As_min = 0.0018 * b * hz_cm;
      if (disc <= 0) return null;
      const a = d_cm - Math.sqrt(disc);
      const As_calc = Mu / (PHI_F * fy * (d_cm - a / 2));
      return { Mu_tonm, b_cm: b, d_cm, a, As_calc, As_min, As: Math.max(As_calc, As_min) };
    }
    function aceroFlexion(Mu_tonm, b_m, d_cm, hz_cm) {
      const f = flexionDetalle(Mu_tonm, b_m, d_cm, hz_cm);
      return f ? f.As : null;
    }

    // Distribución de varillas en un ancho b (m): N varillas y espaciamiento real
    function distribuir(As, b_m, dbar, Abar) {
      const util = b_m * 100 - 2 * R_CM - dbar;
      const N = Math.max(3, Math.ceil(As / Abar), Math.ceil(util / 30) + 1);
      return { N, s: Math.floor(util / (N - 1)) };
    }

    function disenarEstructura(B, L, hz0) {
      const Lvx = (B - cx_cm / 100) / 2; // volado en X
      const Lvy = (L - cy_cm / 100) / 2; // volado en Y
      const beta = Math.max(cx_cm, cy_cm) / Math.min(cx_cm, cy_cm);

      const pres = combosUlt.map(c => {
        const r = presionSuelo(c.P, c.M, B, L);
        return { ...c, qumax: r.qmax, qumin: r.qmin, caso: r.caso };
      });
      // qu máx. uniforme para flexión, cortante y punzonamiento (conservador)
      const quMax = Math.max(...pres.map(p => p.qumax));

      let res = null;
      for (let hz = hz0; hz <= 300; hz += 5) {
        // d = hz − 10 cm en ambas direcciones, cortante, punzonamiento y flexión
        const dx = hz - D_DESC_CM;  // varillas ∥ X
        const dy = hz - D_DESC_CM;  // varillas ∥ Y
        const d = (dx + dy) / 2;              // d promedio (cortante y punzonamiento)
        if (d < 15) continue;

        // Cortante unidireccional a "d" de la cara
        const Vux = quMax * L * Math.max(0, Lvx - d / 100);
        const Vuy = quMax * B * Math.max(0, Lvy - d / 100);
        const pVcx = PHI_V * 0.53 * Math.sqrt(fc) * (L * 100) * d / 1000;
        const pVcy = PHI_V * 0.53 * Math.sqrt(fc) * (B * 100) * d / 1000;

        // Punzonamiento a d/2 de la cara
        const bo = 2 * (cx_cm + d) + 2 * (cy_cm + d);
        const Ao = ((cx_cm + d) / 100) * ((cy_cm + d) / 100);
        const Vc_punz = Math.min(
          (0.53 + 1.06 / beta) * Math.sqrt(fc),
          0.27 * (40 * d / bo + 2) * Math.sqrt(fc),
          1.10 * Math.sqrt(fc)
        ) * bo * d / 1000;
        const pVcp = PHI_V * Vc_punz;
        // Vu2 = Pu − qu·(b+d)(t+d), con Pu máxima y qu envolvente (ecuación del libro, sección 1.3.6)
        const Vup = Math.max(...pres.map(p => p.P)) - quMax * Ao;

        // Flexión en la cara de la columna
        const Mux = quMax * L * Lvx * Lvx / 2;
        const Muy = quMax * B * Lvy * Lvy / 2;
        const Asx = aceroFlexion(Mux, L, dx, hz);
        const Asy = aceroFlexion(Muy, B, dy, hz);

        res = {
          hz, d, dx, dy, Lvx, Lvy, Vux, pVcx, Vuy, pVcy, Vup, pVcp, Mux, Muy, Asx, Asy, quMax,
          beta, bo, Ao,
          pVc1: PHI_V * (0.53 + 1.06 / beta) * Math.sqrt(fc) * bo * d / 1000,
          pVc2: PHI_V * 0.27 * (40 * d / bo + 2) * Math.sqrt(fc) * bo * d / 1000,
          pVc3: PHI_V * 1.10 * Math.sqrt(fc) * bo * d / 1000,
          flexX: flexionDetalle(Mux, L, dx, hz), flexY: flexionDetalle(Muy, B, dy, hz),
          presUlt: pres.map(p => ({ name: p.name, P: p.P, M: p.M, e: p.M / p.P, qumax: p.qumax, qumin: p.qumin, caso: p.caso }))
        };
        const ok = Asx !== null && Asy !== null && Vux <= pVcx && Vuy <= pVcy && Vup <= pVcp;
        res.ok = ok;
        if (ok) break;
      }

      // Armado y anclaje con el hz final
      if (res.Asx !== null && res.Asy !== null) {
        const dx_ = distribuir(res.Asx, L, db, Ab); // varillas ∥ X, repartidas en el ancho L
        const dy_ = distribuir(res.Asy, B, dbY, AbY); // varillas ∥ Y, repartidas en el ancho B
        res.N_x = dx_.N; res.s_x = dx_.s;
        res.N_y = dy_.N; res.s_y = dy_.s;
      } else {
        res.N_x = 0; res.s_x = 0; res.N_y = 0; res.s_y = 0;
        res.Asx = res.Asx ?? 0; res.Asy = res.Asy ?? 0;
      }
      // PASO 8 (zapata rectangular): acero de la dirección corta, franja central = ancho corto
      res.strip = null;
      if (res.N_x && (Math.abs(B - L) / 2) * 100 - R_CM >= 20) {
        const shortIsL = B >= L; // dirección corta = L → varillas ∥ Y (As_y) repartidas en el ancho B
        const W = shortIsL ? B : L;       // ancho largo donde se reparten
        const Wc = shortIsL ? L : B;      // franja central (= lado corto)
        const As = shortIsL ? res.Asy : res.Asx;
        const dbar = shortIsL ? dbY : db;
        const Abar = shortIsL ? AbY : Ab;
        const beta_z = W / Wc;
        const Ac = As * 2 / (beta_z + 1);
        const Al = As - Ac;
        const Nc = Math.max(2, Math.ceil(Ac / Abar), Math.ceil(Wc * 100 / 30 - 1e-9));
        const lado = (W - Wc) / 2 * 100 - R_CM; // ancho útil de cada franja lateral (cm)
        const Nl2 = Math.max(1, Math.ceil(Al / (2 * Abar)), Math.ceil(lado / 30 - 1e-9));
        res.strip = {
          dir: shortIsL ? 'Y' : 'X', Wc, beta_z,
          Nc, sc: Math.floor(Wc * 100 / Nc),
          Nl: 2 * Nl2, sl: Math.floor(lado / Nl2),
          Ac, Al, dbar
        };
      }

      // PASO 9: longitud de desarrollo en tracción (varilla recta): ld = fy·db / (8.2·√f'c) ≥ 30 cm
      const ldX = Math.max(fy * db / (8.2 * Math.sqrt(fc)), 30);
      const ldY = Math.max(fy * dbY / (8.2 * Math.sqrt(fc)), 30);
      const laX = Lvx * 100 - R_CM;   // varillas ∥ X se desarrollan en el volado X
      const laY = Lvy * 100 - R_CM;   // varillas ∥ Y se desarrollan en el volado Y
      if (ldX / laX >= ldY / laY) { res.ld = ldX; res.la = laX; } else { res.ld = ldY; res.la = laY; }

      // PASO 10: aplastamiento en la interfaz columna-zapata (φ = 0.65)
      const A1 = cx_cm * cy_cm;
      const A2 = Math.min(cx_cm + 4 * res.hz, B * 100) * Math.min(cy_cm + 4 * res.hz, L * 100);
      const factorA = Math.min(2, Math.sqrt(A2 / A1));
      res.A1 = A1; res.A2 = A2; res.factorA = factorA;
      res.ldX = ldX; res.ldY = ldY; res.laX = laX; res.laY = laY;
      res.phiPnb = 0.65 * 0.85 * fc * A1 * factorA / 1000;
      res.Pu_max = Math.max(...combosUlt.map(c => c.P));
      res.dowel_min = 0.005 * A1;
      res.dowel_extra = Math.max(0, (res.Pu_max - res.phiPnb) * 1000 / (0.65 * fy)); // exceso → espigas
      return res;
    }

    // ===== Iteración: hz sube hasta que cumple y la geotecnia usa ese mismo hz =====
    let hzUsado = hz_min_cm;
    let plan = null, est = null;
    for (let k = 0; k < 60; k++) {
      plan = dimensionarEnPlanta(hzUsado / 100);
      if (plan.invalido) break;
      est = disenarEstructura(plan.B, plan.L, hzUsado);
      if (est.hz === hzUsado || !est.ok) break;
      hzUsado = est.hz;
    }

    if (plan.invalido) {
      const resDims = document.getElementById('res-footing-dims');
      if (resDims) resDims.textContent = 'Sin capacidad neta';
      const resPressure = document.getElementById('res-footing-pressure');
      if (resPressure) resPressure.innerHTML = `<span style="color: var(--accent-warning); font-weight: 700;">⚠️ q neta = ${plan.q_neto.toFixed(2)} ton/m² (≤ 0). Revise qa, Df o s/c.</span>`;
      return;
    }

    // Datos completos para la memoria de cálculo en LaTeX (js/footings-latex.js)
    window.footingReport = {
      inp: {
        qa_kgcm2, Df_m, gamma_m, sc_tonm2, PD_ton, PL_ton, MD_ton, ML_ton, PE_ton, ME_ton,
        cx_cm, cy_cm, fc, fy, metodoPractico: !!(qmSelect && qmSelect.value === 'prac')
      },
      barX: { ...barData }, barY: { ...barDataY },
      colBar, ldh, hz_ldh, hz_min_cm, R_CM, plan, est
    };

    updateOutputText({
      B_m: plan.B, L_m: plan.L, geo: plan.geo, geoOK: plan.geoOK, q_neto: plan.q_neto, fA: plan.fA,
      est, barName: barData.name, barNameX: barData.name, barNameY: barDataY.name
    });

    drawFootingBlueprint({
      B_m: plan.B, L_m: plan.L, hz_cm: est.hz,
      cx_cm, cy_cm,
      N_x: est.N_x, s_x_cm: est.s_x,
      N_y: est.N_y, s_y_cm: est.s_y,
      barName: barData.name, barNameX: barData.name, barNameY: barDataY.name
    });
  }

  // Vincular eventos
  const allInputs = [qaInput, dfInput, gmInput, scInput, hzInput, colBarSelect, barYSelect, qmSelect, planSelect, bManInput, lManInput, mInput, mlInput, peInput, meInput, pdInput, plInput, cxInput, cyInput, fcInput, fyInput, barSelect];
  allInputs.forEach(input => {
    if (input) {
      input.addEventListener('input', calculate);
      input.addEventListener('change', calculate);
    }
  });

  // Ejecución inicial
  calculate();
}

/**
 * 3. Actualizar textos de resultados en el DOM
 */
function updateOutputText(data) {
  const resDims = document.getElementById('res-footing-dims');
  const resHz = document.getElementById('res-footing-hz');
  const resSteelX = document.getElementById('res-footing-steel-x');
  const resSteelY = document.getElementById('res-footing-steel-y');
  const resPressure = document.getElementById('res-footing-pressure');
  const resShear = document.getElementById('res-footing-shear');
  const resPunch = document.getElementById('res-footing-punch');
  const resDev = document.getElementById('res-footing-dev');
  const resBearing = document.getElementById('res-footing-bearing');

  const e = data.est;
  const ok = c => `var(--${c ? 'accent-success' : 'accent-warning'})`;
  const tag = c => (c ? '✓ Conforme' : '⚠️ No cumple');
  const muted = 'font-size:0.8rem; color:var(--text-muted);';

  if (resDims) resDims.textContent = `${data.B_m.toFixed(2)} m × ${data.L_m.toFixed(2)} m`;
  if (resHz) resHz.textContent = `${e.hz} cm (d = ${e.d.toFixed(1)} cm)`;

  const steel = (N, s, As) => {
    if (!N) return `<span style="color:${ok(false)}; font-weight:700;">⚠️ Sección insuficiente por flexión</span>`;
    const apretado = s < 7.5 ? ` <span style="color:${ok(false)};">⚠️ use Ø mayor</span>` : '';
    return `<strong>${N} ${data.barName}</strong> @ ${s} cm <span style="${muted}">(As = ${As.toFixed(1)} cm²)</span>${apretado}`;
  };
  const steel2 = (N, s, As, name) => steel(N, s, As).replace(data.barName, name);
  const stripTxt = (dir, name) => {
    const s = e.strip;
    if (!s || s.dir !== dir) return '';
    return `<br><span style="${muted}">Franja central (${s.Wc.toFixed(2)} m, ${(2 / (s.beta_z + 1) * 100).toFixed(0)}% del As): ${s.Nc} ${name} @ ${s.sc} cm · Laterales: ${s.Nl} ${name} @ ${s.sl} cm</span>`;
  };
  if (resSteelX) resSteelX.innerHTML = steel2(e.N_x, e.s_x, e.Asx, data.barNameX) + stripTxt('X', data.barNameX);
  if (resSteelY) resSteelY.innerHTML = steel2(e.N_y, e.s_y, e.Asy, data.barNameY) + stripTxt('Y', data.barNameY);

  if (resPressure) {
    const g = data.geo;
    resPressure.innerHTML = `
      <span style="color:${ok(data.geoOK)}; font-weight:700;">
        q<sub>max</sub> = ${(g.qmax / 10).toFixed(2)} kg/cm² (${(g.ratio * 100).toFixed(1)}% de ${(g.qlim / 10).toFixed(2)}) ${tag(data.geoOK)}
      </span>
      <span style="${muted}">Caso ${g.caso} · e = ${(g.e * 100).toFixed(1)} cm · ${g.id} ${g.titulo} (${g.formula}) · Az = P/(${data.fA.toFixed(2)}·q)</span>`;
  }

  if (resShear) {
    const rx = e.Vux / e.pVcx, ry = e.Vuy / e.pVcy;
    const [Vu, pVc, dir] = rx >= ry ? [e.Vux, e.pVcx, 'X'] : [e.Vuy, e.pVcy, 'Y'];
    const c = Math.max(rx, ry) <= 1;
    resShear.innerHTML = `<span style="color:${ok(c)}; font-weight:700;">${tag(c)} (Dir. ${dir}: Vu = ${Vu.toFixed(1)} tn &le; &phi;Vc = ${pVc.toFixed(1)} tn)</span>`;
  }

  if (resPunch) {
    const c = e.Vup <= e.pVcp;
    resPunch.innerHTML = `<span style="color:${ok(c)}; font-weight:700;">${tag(c)} (Vu = ${e.Vup.toFixed(1)} tn &le; &phi;Vc = ${e.pVcp.toFixed(1)} tn)</span>`;
  }

  if (resBearing) {
    const c = e.Pu_max <= e.phiPnb;
    resBearing.innerHTML = `<span style="color:${ok(c)}; font-weight:700;">${tag(c)} (Pu = ${e.Pu_max.toFixed(1)} tn &le; &phi;Pnb = ${e.phiPnb.toFixed(1)} tn)</span> <span style="${muted}">Dowels A<sub>s</sub> mín = ${e.dowel_min.toFixed(1)} cm²${c ? '' : ' · Espigas adicionales = ' + e.dowel_extra.toFixed(1) + ' cm²'}</span>`;
  }

  if (resDev) {
    const c = e.la >= e.ld;
    resDev.innerHTML = `<span style="color:${ok(c)}; font-weight:700;">${c ? '✓ Conforme' : '⚠️ Requiere gancho'} (l<sub>d</sub> = ${e.ld.toFixed(0)} cm ${c ? '&le;' : '&gt;'} disponible = ${e.la.toFixed(0)} cm)</span>`;
  }
}

/**
 * 4. Generador de Plano / Croquis Técnico Interactivo (SVG)
 */
function drawFootingBlueprint(data) {
  const container = document.getElementById('footing-blueprint-svg');
  if (!container) return;

  const width = 420;
  const height = 360;
  const padding = 50;

  // Escala para ajustar la zapata dentro del viewport SVG
  const maxDim = Math.max(data.B_m, data.L_m);
  const drawArea = Math.min(width - 2 * padding, height - 2 * padding);
  const scale = drawArea / maxDim;

  const w_zap = data.B_m * scale;
  const h_zap = data.L_m * scale;
  const x_zap = (width - w_zap) / 2;
  const y_zap = (height - h_zap) / 2;

  // Dimensiones de la columna en SVG
  const w_col = (data.cx_cm / 100) * scale;
  const h_col = (data.cy_cm / 100) * scale;
  const x_col = (width - w_col) / 2;
  const y_col = (height - h_col) / 2;

  // Varillas paralelas a X (azules): horizontales, repartidas a lo largo de L
  let horizontalBarsSVG = "";
  const numBarsX = data.N_x;
  for (let j = 0; j < numBarsX; j++) {
    const barY = y_zap + 8 + (j * (h_zap - 16)) / Math.max(1, numBarsX - 1);
    horizontalBarsSVG += `<line x1="${x_zap + 8}" y1="${barY}" x2="${x_zap + w_zap - 8}" y2="${barY}" stroke="#0284C7" stroke-width="1.8" opacity="0.85" />`;
  }

  // Varillas paralelas a Y (naranjas): verticales, repartidas a lo largo de B
  let verticalBarsSVG = "";
  const numBarsY = data.N_y;
  for (let i = 0; i < numBarsY; i++) {
    const barX = x_zap + 8 + (i * (w_zap - 16)) / Math.max(1, numBarsY - 1);
    verticalBarsSVG += `<line x1="${barX}" y1="${y_zap + 8}" x2="${barX}" y2="${y_zap + h_zap - 8}" stroke="#D97706" stroke-width="1.8" opacity="0.85" />`;
  }

  const svgContent = `
    <svg width="100%" height="100%" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <!-- Fondo y Cuadrícula Técnica -->
      <rect width="${width}" height="${height}" fill="var(--bg-secondary)" rx="10" />
      <pattern id="grid-subtle" width="20" height="20" patternUnits="userSpaceOnUse">
        <path d="M 20 0 L 0 0 0 20" fill="none" stroke="var(--border-subtle)" stroke-width="0.8" opacity="0.6"/>
      </pattern>
      <rect width="${width}" height="${height}" fill="url(#grid-subtle)" rx="10" />

      <!-- Contorno de Zapata -->
      <rect x="${x_zap}" y="${y_zap}" width="${w_zap}" height="${h_zap}" fill="var(--bg-card)" stroke="var(--text-primary)" stroke-width="2.5" rx="4" />

      <!-- Malla de Acero (Armado) -->
      ${verticalBarsSVG}
      ${horizontalBarsSVG}

      <!-- Columna Central -->
      <rect x="${x_col}" y="${y_col}" width="${w_col}" height="${h_col}" fill="#334155" stroke="var(--accent-blue)" stroke-width="2" />
      <!-- Líneas de corte de la columna -->
      <line x1="${x_col}" y1="${y_col}" x2="${x_col + w_col}" y2="${y_col + h_col}" stroke="#FFFFFF" stroke-width="1.2" opacity="0.7"/>
      <line x1="${x_col + w_col}" y1="${y_col}" x2="${x_col}" y2="${y_col + h_col}" stroke="#FFFFFF" stroke-width="1.2" opacity="0.7"/>

      <!-- Líneas de Cota B (Ancho) -->
      <line x1="${x_zap}" y1="${y_zap - 16}" x2="${x_zap + w_zap}" y2="${y_zap - 16}" stroke="var(--text-primary)" stroke-width="1.5" />
      <line x1="${x_zap}" y1="${y_zap - 22}" x2="${x_zap}" y2="${y_zap - 10}" stroke="var(--text-primary)" stroke-width="1.5" />
      <line x1="${x_zap + w_zap}" y1="${y_zap - 22}" x2="${x_zap + w_zap}" y2="${y_zap - 10}" stroke="var(--text-primary)" stroke-width="1.5" />
      <text x="${x_zap + w_zap / 2}" y="${y_zap - 24}" fill="var(--text-primary)" font-size="12" font-family="monospace" font-weight="700" text-anchor="middle">
        B = ${data.B_m.toFixed(2)} m
      </text>

      <!-- Líneas de Cota L (Largo) -->
      <line x1="${x_zap + w_zap + 16}" y1="${y_zap}" x2="${x_zap + w_zap + 16}" y2="${y_zap + h_zap}" stroke="var(--text-primary)" stroke-width="1.5" />
      <line x1="${x_zap + w_zap + 10}" y1="${y_zap}" x2="${x_zap + w_zap + 22}" y2="${y_zap}" stroke="var(--text-primary)" stroke-width="1.5" />
      <line x1="${x_zap + w_zap + 10}" y1="${y_zap + h_zap}" x2="${x_zap + w_zap + 22}" y2="${y_zap + h_zap}" stroke="var(--text-primary)" stroke-width="1.5" />
      <text x="${x_zap + w_zap + 26}" y="${y_zap + h_zap / 2 + 4}" fill="var(--text-primary)" font-size="12" font-family="monospace" font-weight="700" text-anchor="start">
        L = ${data.L_m.toFixed(2)} m
      </text>

      <!-- Anotación de Columna -->
      <text x="${width / 2}" y="${y_col + h_col + 16}" fill="#FFFFFF" font-size="10" font-family="monospace" font-weight="600" text-anchor="middle">
        Col. ${data.cx_cm}×${data.cy_cm}
      </text>

      <!-- Leyenda Técnica Inferior -->
      <g transform="translate(18, ${height - 24})">
        <rect x="0" y="-12" width="12" height="12" fill="#0284C7" rx="2" />
        <text x="18" y="-2" fill="var(--text-secondary)" font-size="11" font-family="sans-serif">Malla X: ${data.barNameX} @ ${data.s_x_cm}cm</text>

        <rect x="180" y="-12" width="12" height="12" fill="#D97706" rx="2" />
        <text x="198" y="-2" fill="var(--text-secondary)" font-size="11" font-family="sans-serif">Malla Y: ${data.barNameY} @ ${data.s_y_cm}cm</text>
      </g>
    </svg>
  `;

  container.innerHTML = svgContent;
}
