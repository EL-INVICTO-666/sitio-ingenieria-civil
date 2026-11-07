/**
 * ===================================================================
 * INTERFAZ - ZAPATA COMBINADA
 * Lee el formulario de #panel-combined, llama al motor
 * (js/footings-combined-engine.js) y dibuja resultados, croquis,
 * diagramas de cortante y momento y la memoria paso a paso.
 * ===================================================================
 */
(function () {
  'use strict';

  const $ = id => document.getElementById(id);
  const F = (x, n = 2) => (x === Infinity ? '∞' : Number.isFinite(x) ? Number(x).toFixed(n) : '—');
  const tag = (c, txt) => `<span class="${c ? 'cmb-ok' : 'cmb-bad'}">${c ? '✓' : '⚠️'} ${txt}</span>`;
  const muted = txt => `<span class="cmb-muted">${txt}</span>`;
  const C_SUP = '#0284C7';   // acero longitudinal
  const C_TRV = '#D97706';   // acero transversal

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    if (!$('panel-combined') || !$('cmb-qa') || !window.ZapataCombinada) return;
    $('panel-combined').querySelectorAll('input, select').forEach(el => {
      el.addEventListener('input', calcular);
      el.addEventListener('change', calcular);
    });
    $('cmb-auto')?.addEventListener('click', () => {
      ['cmb-hzman', 'cmb-bman', 'cmb-lman'].forEach(id => { $(id).value = ''; });
      calcular();
    });
    calcular();
  }

  function leer() {
    const num = (id, def) => { const v = parseFloat($(id)?.value); return Number.isFinite(v) ? v : def; };
    const opt = id => { const v = parseFloat($(id)?.value); return Number.isFinite(v) && v > 0 ? v : NaN; };
    const col = k => ({
      b: num(`cmb-b${k}`, 50), h: num(`cmb-h${k}`, 50), barKey: $(`cmb-bar${k}`).value,
      PD: num(`cmb-c${k}-pd`, 0), PL: num(`cmb-c${k}-pl`, 0), PE: num(`cmb-c${k}-pe`, 0),
      MD: num(`cmb-c${k}-md`, 0), ML: num(`cmb-c${k}-ml`, 0), ME: num(`cmb-c${k}-me`, 0)
    });
    return {
      qa_kgcm2: num('cmb-qa', 2), Df: num('cmb-df', 1.5), gm: num('cmb-gm', 1.8), sc: num('cmb-sc', 0.5),
      metodo: $('cmb-qm').value,
      n: num('cmb-n', 0.25), S: num('cmb-s', 4.5), c1: col(1), c2: col(2),
      hzMin: num('cmb-hzmin', 30), hzMan: opt('cmb-hzman'), Bman: opt('cmb-bman'), Lman: opt('cmb-lman'),
      fc: num('cmb-fc', 210), fy: num('cmb-fy', 4200),
      barLongSup: $('cmb-bls').value, barLongInf: $('cmb-bli').value,
      barTransBanda: $('cmb-btb').value, barTransMin: $('cmb-btm').value
    };
  }

  function calcular() {
    const inp = leer();
    const vacio = msg => {
      $('cmb-res-dims').textContent = 'Revise los datos';
      $('cmb-res-dims-sub').textContent = '';
      mostrarAvisos([msg]);
      ['cmb-res-armado', 'cmb-res-verif', 'cmb-plan-svg', 'cmb-diag-svg', 'cmb-memo-body'].forEach(id => { $(id).innerHTML = ''; });
      window.combinedReport = null;
    };
    if (!(inp.c1.PD + inp.c1.PL > 0) || !(inp.c2.PD + inp.c2.PL > 0)) return vacio('Ingrese cargas de servicio (CM + CV) mayores que cero en ambas columnas.');
    let r;
    try { r = window.ZapataCombinada.calcular(inp); } catch (err) { return vacio('Error de cálculo: ' + err.message); }
    if (r.invalido) return vacio(r.motivo);
    window.combinedReport = r;
    resultados(r);
    $('cmb-plan-svg').innerHTML = croquisPlanta(r);
    $('cmb-diag-svg').innerHTML = diagramas(r);
    $('cmb-memo-body').innerHTML = memoria(r);
  }

  function mostrarAvisos(lista) {
    const box = $('cmb-res-avisos');
    box.hidden = !lista.length;
    box.innerHTML = lista.map(a => `<p>⚠️ ${a}</p>`).join('');
  }

  /* ---------------- Resultados ---------------- */
  function resultados(r) {
    const { pl, est, armado: a } = r;
    $('cmb-res-dims').textContent = `${F(pl.B)} m × ${F(pl.L)} m`;
    $('cmb-res-dims-sub').textContent = `Sección en planta (B × L) · A = ${F(pl.A)} m² · hz = ${F(est.hz / 100)} m`;
    mostrarAvisos(r.avisos);

    const barra = (N, bar, s, As, extra) => N
      ? `<strong>${N} ${bar.name}</strong> @ ${s} cm ${muted(`(As = ${F(As, 1)} cm²${extra ? ' · ' + extra : ''})`)}`
      : tag(false, 'Sección insuficiente');
    const filas = [
      ['Peralte (hz)', `<strong>${est.hz} cm</strong> (d = ${est.d} cm) ${muted(`hz mín. por anclaje = ${F(r.hzReq, 1)} cm`)}`],
      ['Longitudinal superior', barra(a.longSup.N, a.longSup.bar, a.longSup.s, a.longSup.As, 'M− entre columnas')],
      ['Longitudinal inferior', barra(a.longInf.N, a.longInf.bar, a.longInf.s, a.longInf.As, 'volados')],
      ...a.bandas.map(b => [`Transversal bajo C${b.col}`, barra(b.N, b.bar, b.s, b.As, `franja de ${F(b.ancho)} m`)]),
      ['Transversal resto y superior', `<strong>${a.transMin.bar.name}</strong> @ ${a.transMin.s} cm ${muted(`(As mín = ${F(a.transMin.As_m, 2)} cm²/m)`)}`]
    ];
    $('cmb-res-armado').innerHTML = filas.map(([k, v]) => `<div class="breakdown-row"><span>${k}</span><span>${v}</span></div>`).join('');

    const g = pl.gob;
    const peorCorte = est.corteLong.reduce((m, s) => (s.Vu / s.pVc > m.Vu / m.pVc ? s : m));
    const peorTrans = est.trans.reduce((m, t) => (t.Vu / t.pVc > m.Vu / m.pVc ? t : m));
    const anc = r.anclaje.reduce((m, t) => (t.ld / t.la > m.ld / m.la ? t : m));
    const ver = [
      ['Presión en el suelo (servicio)', tag(pl.ok, `q máx = ${F(g.qmax)} ton/m² ≤ ${F(g.qlim)} (${F(g.ratio * 100, 1)}%)`) +
        ` ${muted(`${g.id} ${g.formula} · e = ${F(g.e * 100, 1)} cm · ${g.caso}`)}`],
      ['Cortante por flexión longitudinal', tag(peorCorte.ok, `Vu = ${F(peorCorte.Vu)} t ≤ φVc = ${F(peorCorte.pVc)} t`) +
        ` ${muted(`C${peorCorte.col}, lado ${peorCorte.lado === 'izq' ? 'izquierdo' : 'derecho'}, a d de la cara`)}`],
      ['Cortante en dirección transversal', tag(peorTrans.okV, `Vu = ${F(peorTrans.Vu)} t ≤ φVc = ${F(peorTrans.pVc)} t`) + ` ${muted(`zapata ficticia C${peorTrans.col}`)}`],
      ...est.punz.map(p => [`Punzonamiento C${p.col}`, tag(p.ok, `Vu = ${F(p.Vu)} t ≤ φVc = ${F(p.pVc)} t`) + ` ${muted(`columna de ${p.ubic} (αs = ${p.alfa}) · b0 = ${F(p.b0)} m`)}`]),
      ['Aplastamiento columna-zapata', r.aplast.map(q => tag(q.ok || q.okA2, `C${q.col}: Pu = ${F(q.Pu, 1)} t ≤ φPn = ${F(q.ok ? q.pPn : q.pPnA2, 1)} t`)).join('<br>')],
      ['Anclaje del acero transversal', tag(anc.ok, `ld = ${F(anc.ld, 0)} cm ≤ disponible = ${F(anc.la, 0)} cm`)]
    ];
    $('cmb-res-verif').innerHTML = ver.map(([k, v]) => `<div class="breakdown-row"><span>${k}</span><span>${v}</span></div>`).join('');
  }

  /* ---------------- Croquis en planta ---------------- */
  function croquisPlanta(r) {
    const { pl, armado: a, c1, c2, K } = r;
    const { B, L } = pl;
    const W = 560, H = 360, mL = 30, mR = 86, mT = 52, mB = 92;
    const sc = Math.min((W - mL - mR) / L, (H - mT - mB) / B);
    const ox = mL + (W - mL - mR - L * sc) / 2, oy = mT;
    const X = x => ox + x * sc, Y = y => oy + y * sc;
    const fw = L * sc, fh = B * sc;
    let s = '';

    // Franjas transversales bajo columnas
    a.bandas.forEach(b => {
      s += `<rect x="${X(b.ini)}" y="${oy}" width="${b.ancho * sc}" height="${fh}" fill="${C_TRV}" opacity="0.10"/>`;
    });
    // Acero longitudinal inferior (horizontal)
    const Ni = a.longInf.N;
    for (let j = 0; j < Ni; j++) {
      const y = Y(K.R / 100) + j * (fh - 2 * K.R / 100 * sc) / Math.max(1, Ni - 1);
      s += `<line x1="${ox + 5}" y1="${y}" x2="${ox + fw - 5}" y2="${y}" stroke="${C_SUP}" stroke-width="1.1" opacity="0.75"/>`;
    }
    // Acero transversal inferior: franjas + mínimo en el resto (vertical)
    const vline = (xcm, wdt, op) => `<line x1="${X(xcm / 100)}" y1="${oy + 5}" x2="${X(xcm / 100)}" y2="${oy + fh - 5}" stroke="${C_TRV}" stroke-width="${wdt}" opacity="${op}"/>`;
    a.bandas.forEach(b => {
      const x0 = b.ini * 100 + (b.ini <= 1e-6 ? K.R : 0);
      for (let i = 0; i < b.N; i++) s += vline(x0 + i * b.util / Math.max(1, b.N - 1), 1.7, 0.95);
    });
    for (let xc = K.R; xc <= L * 100 - K.R + 1e-6; xc += a.transMin.s) {
      if (a.bandas.some(b => xc >= b.ini * 100 - 2 && xc <= b.fin * 100 + 2)) continue;
      s += vline(xc, 1.1, 0.6);
    }
    // Contorno
    s = `<rect x="${ox}" y="${oy}" width="${fw}" height="${fh}" fill="var(--bg-card)" stroke="var(--text-primary)" stroke-width="2.2" rx="2"/>` + s;
    // Columnas
    [c1, c2].forEach((c, i) => {
      const cx = X(c.x - c.b_m / 2), cy = Y((B - c.h_m) / 2), cw = c.b_m * sc, ch = c.h_m * sc;
      s += `<rect x="${cx}" y="${cy}" width="${cw}" height="${ch}" fill="#334155" stroke="var(--text-primary)" stroke-width="1.4"/>
        <line x1="${cx}" y1="${cy}" x2="${cx + cw}" y2="${cy + ch}" stroke="#fff" stroke-width="1" opacity="0.6"/>
        <line x1="${cx + cw}" y1="${cy}" x2="${cx}" y2="${cy + ch}" stroke="#fff" stroke-width="1" opacity="0.6"/>
        <text x="${cx + cw / 2}" y="${cy - 5}" font-size="11" font-weight="700" text-anchor="middle" fill="var(--text-primary)" font-family="monospace">C${i + 1}</text>`;
    });
    // Lindero
    if (c1.x - c1.b_m / 2 < 0.005) {
      s += `<line x1="${ox}" y1="${oy - 30}" x2="${ox}" y2="${oy + fh + 30}" stroke="var(--accent-warning)" stroke-width="1.4" stroke-dasharray="6 4"/>
        <text x="${ox - 4}" y="${oy - 34}" font-size="10" text-anchor="start" fill="var(--accent-warning)" font-family="monospace" font-weight="700">LP</text>`;
    }
    // Cotas
    const cotaH = (xa, xb, y, txt) => `<line x1="${xa}" y1="${y}" x2="${xb}" y2="${y}" stroke="var(--text-secondary)" stroke-width="1"/>
      <line x1="${xa}" y1="${y - 5}" x2="${xa}" y2="${y + 5}" stroke="var(--text-secondary)"/><line x1="${xb}" y1="${y - 5}" x2="${xb}" y2="${y + 5}" stroke="var(--text-secondary)"/>
      <text x="${xb - xa < 56 ? xb + 4 : (xa + xb) / 2}" y="${xb - xa < 56 ? y + 14 : y - 5}" font-size="10.5" text-anchor="${xb - xa < 56 ? 'start' : 'middle'}" fill="var(--text-primary)" font-family="monospace" font-weight="600">${txt}</text>`;
    s += cotaH(ox, ox + fw, oy - 18, `L = ${F(L)} m`);
    const yb = oy + fh + 22, x1 = X(c1.x), x2 = X(c2.x);
    if (c1.x > 0.01) s += cotaH(ox, x1, yb, `n=${F(c1.x)}`);
    s += cotaH(x1, x2, yb, `S = ${F(c2.x - c1.x)} m`);
    if (L - c2.x > 0.01) s += cotaH(x2, ox + fw, yb, F(L - c2.x));
    const xr = ox + fw + 16;
    s += `<line x1="${xr}" y1="${oy}" x2="${xr}" y2="${oy + fh}" stroke="var(--text-secondary)"/>
      <line x1="${xr - 5}" y1="${oy}" x2="${xr + 5}" y2="${oy}" stroke="var(--text-secondary)"/><line x1="${xr - 5}" y1="${oy + fh}" x2="${xr + 5}" y2="${oy + fh}" stroke="var(--text-secondary)"/>
      <text x="${xr + 8}" y="${oy + fh / 2 + 4}" font-size="10.5" fill="var(--text-primary)" font-family="monospace" font-weight="600">B = ${F(B)} m</text>`;
    // Leyenda
    const ly = H - 40;
    const bandasTxt = a.bandas.map(b => `C${b.col}: ${b.N} ${b.bar.name} @ ${b.s}`).join(' · ');
    s += `<g font-size="10.5" font-family="sans-serif" fill="var(--text-secondary)">
      <rect x="${mL}" y="${ly - 9}" width="11" height="11" fill="${C_SUP}" rx="2"/>
      <text x="${mL + 17}" y="${ly}">Long. inferior: ${a.longInf.N} ${a.longInf.bar.name} @ ${a.longInf.s} cm</text>
      <rect x="${mL}" y="${ly + 9}" width="11" height="11" fill="${C_TRV}" rx="2"/>
      <text x="${mL + 17}" y="${ly + 18}">Transv. franjas ${bandasTxt} cm · resto ${a.transMin.bar.name} @ ${a.transMin.s} cm</text>
    </g>`;
    return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Croquis en planta de la zapata combinada">${s}</svg>`;
  }

  /* ---------------- Diagramas V y M ---------------- */
  function diagramas(r) {
    const { pl, est, armado: a, c1, c2 } = r;
    const v = est.vig, L = pl.L;
    const W = 760, H = 520, mL = 74, mR = 34;
    const sc = (W - mL - mR) / L;
    const X = x => mL + x * sc;
    const x1 = c1.x, x2 = c2.x;
    let s = '';
    const txt = (x, y, t, o = {}) => `<text x="${x}" y="${y}" font-size="${o.fs || 10.5}" text-anchor="${o.a || 'middle'}" fill="${o.c || 'var(--text-primary)'}" font-family="monospace" font-weight="${o.w || 600}">${t}</text>`;

    // --- Elevación con cargas ---
    const yF = 66, hF = 38;
    [c1, c2].forEach((c, i) => {
      const R = i === 0 ? v.R1 : v.R2;
      s += `<rect x="${X(c.x - c.b_m / 2)}" y="${yF - 30}" width="${c.b_m * sc}" height="30" fill="#334155" opacity="0.85"/>`;
      s += `<line x1="${X(c.x)}" y1="${yF - 52}" x2="${X(c.x)}" y2="${yF - 34}" stroke="var(--accent-warning)" stroke-width="2"/>
        <path d="M${X(c.x) - 5},${yF - 40} L${X(c.x)},${yF - 32} L${X(c.x) + 5},${yF - 40}" fill="none" stroke="var(--accent-warning)" stroke-width="2"/>`;
      s += txt(X(c.x) + (i === 0 ? 8 : -8), yF - 46, `R${i + 1} = ${F(R, 1)} t`, { a: i === 0 ? 'start' : 'end', c: 'var(--accent-warning)' });
    });
    s += `<rect x="${X(0)}" y="${yF}" width="${L * sc}" height="${hF}" fill="var(--bg-card)" stroke="var(--text-primary)" stroke-width="1.8"/>`;
    s += `<line x1="${X(0) + 4}" y1="${yF + 6}" x2="${X(L) - 4}" y2="${yF + 6}" stroke="${C_SUP}" stroke-width="2.2"/>`;
    s += `<line x1="${X(0) + 4}" y1="${yF + hF - 6}" x2="${X(L) - 4}" y2="${yF + hF - 6}" stroke="${C_SUP}" stroke-width="1.6" stroke-dasharray="1 0"/>`;
    s += txt((X(x1) + X(x2)) / 2, yF + 22, `sup. ${a.longSup.N} ${a.longSup.bar.name} @ ${a.longSup.s} · inf. ${a.longInf.N} ${a.longInf.bar.name} @ ${a.longInf.s}`, { fs: 9.5, c: C_SUP });
    const nFl = Math.max(8, Math.round(L / 0.35));
    for (let i = 0; i <= nFl; i++) {
      const xx = X(L * i / nFl);
      s += `<line x1="${xx}" y1="${yF + hF + 26}" x2="${xx}" y2="${yF + hF + 4}" stroke="var(--accent-blue)" stroke-width="1.2"/>
        <path d="M${xx - 3.5},${yF + hF + 10} L${xx},${yF + hF + 4} L${xx + 3.5},${yF + hF + 10}" fill="none" stroke="var(--accent-blue)" stroke-width="1.2"/>`;
    }
    s += txt(X(0) - 8, yF + hF + 20, `qu·B`, { a: 'end', c: 'var(--accent-blue)' });
    s += txt(X(L), yF + hF + 42, `qu·B = ${F(est.qu)} × ${F(pl.B)} = ${F(v.w)} t/m`, { a: 'end', c: 'var(--accent-blue)', fs: 10 });

    // --- Ejes de columnas y cortante nulo ---
    const yTop = 172, yBot = H - 14;
    [x1, x2].forEach(x => { s += `<line x1="${X(x)}" y1="${yTop}" x2="${X(x)}" y2="${yBot}" stroke="var(--border-medium)" stroke-dasharray="4 4"/>`; });
    s += `<line x1="${X(v.x0)}" y1="${yTop}" x2="${X(v.x0)}" y2="${yBot}" stroke="var(--accent-warning)" stroke-dasharray="2 4" opacity="0.8"/>`;

    // --- Diagrama de cortante ---
    const yV = 262, aV = 70;
    const Vmax = Math.max(...v.diagV.map(p => Math.abs(p[1])), 1e-6);
    const YV = val => yV - val / Vmax * aV;
    const ptsV = v.diagV.map(p => `${X(p[0])},${YV(p[1])}`).join(' ');
    s += `<line x1="${X(0)}" y1="${yV}" x2="${X(L)}" y2="${yV}" stroke="var(--text-secondary)" stroke-width="1"/>`;
    s += `<polygon points="${X(0)},${yV} ${ptsV} ${X(L)},${yV}" fill="var(--accent-blue)" opacity="0.14"/>`;
    s += `<polyline points="${ptsV}" fill="none" stroke="var(--accent-blue)" stroke-width="2"/>`;
    s += txt(mL - 12, yV + 4, 'V (t)', { a: 'end', c: 'var(--text-muted)' });
    const lblV = (x, val, a, dy) => txt(X(x) + (a === 'end' ? -5 : 5), YV(val) + dy, F(val), { a, fs: 10 });
    s += lblV(x1, v.V1izq, 'end', v.V1izq >= 0 ? -4 : 13);
    s += lblV(x1, v.V1der, 'start', v.V1der >= 0 ? -4 : 13);
    s += lblV(x2, v.V2izq, 'end', v.V2izq >= 0 ? -4 : 13);
    s += lblV(x2, v.V2der, 'start', v.V2der >= 0 ? -4 : 13);
    s += txt(X(v.x0) + 6, yV + 15, `V = 0 · x = ${F(v.x0 - x1)} m`, { a: 'start', fs: 9.5, c: 'var(--accent-warning)' });

    // --- Diagrama de momento (+ hacia abajo, tracción inferior; como la hoja del curso) ---
    const yM = 400, aM = 82;
    const Mmax = Math.max(...v.diagM.map(p => Math.abs(p[1])), 1e-6);
    const YM = val => yM + val / Mmax * aM;
    const ptsM = v.diagM.map(p => `${X(p[0])},${YM(p[1])}`).join(' ');
    s += `<line x1="${X(0)}" y1="${yM}" x2="${X(L)}" y2="${yM}" stroke="var(--text-secondary)" stroke-width="1"/>`;
    s += `<polygon points="${X(0)},${yM} ${ptsM} ${X(L)},${yM}" fill="${C_TRV}" opacity="0.14"/>`;
    s += `<polyline points="${ptsM}" fill="none" stroke="${C_TRV}" stroke-width="2"/>`;
    s += txt(mL - 12, yM + 4, 'M (t·m)', { a: 'end', c: 'var(--text-muted)' });
    s += txt(X(x1), YM(v.M1) + 15, `M1 = ${F(v.M1)}`, { fs: 10, a: x1 < L * 0.12 ? 'start' : 'middle' });
    s += txt(X(x2), YM(v.M2) + 15, `M2 = ${F(v.M2)}`, { fs: 10 });
    s += txt(X(v.x0), YM(v.Mcentro) - 7, `M centro = ${F(v.Mcentro)}`, { fs: 10 });
    s += txt(X(L), H - 4, '(+) tracción inferior · (−) tracción superior', { a: 'end', fs: 9, c: 'var(--text-muted)', w: 400 });

    return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Diagramas de cortante y momento de la zapata combinada">${s}</svg>`;
  }

  /* ---------------- Memoria paso a paso (numeración de la hoja del curso) ---------------- */
  function memoria(r) {
    const { pl, est, armado: a, c1, c2, s1, s2, K } = r;
    const v = est.vig;
    const fila = (sym, val, uni, desc = '', key = false) =>
      `<tr${key ? ' class="cmb-key"' : ''}><td class="cmb-sym">${sym}</td><td>${val}</td><td>${uni}</td><td class="cmb-desc">${desc}</td></tr>`;
    const tabla = filas => `<div class="cmb-table-wrap"><table class="cmb-tbl"><tbody>${filas.join('')}</tbody></table></div>`;
    const grid = (cab, filas) => `<div class="cmb-table-wrap"><table class="cmb-tbl"><thead><tr>${cab.map(c => `<th>${c}</th>`).join('')}</tr></thead><tbody>${filas.map(f => `<tr>${f.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    const okc = c => (c ? '<span class="cmb-ok">OK</span>' : '<span class="cmb-bad">NO</span>');
    const paso = (titulo, html, wide) => `<section class="cmb-step${wide ? ' cmb-step--wide' : ''}"><h4>${titulo}</h4>${html}</section>`;
    const d = est.d, dm = d / 100;
    let h = '';

    h += paso('1. Peralte bruto de la zapata', tabla([
      ...r.anclajeCol.map((q, i) => fila(`l<sub>dh</sub> C${i + 1}`, F(q.ldh), 'cm', `0.075·db·fy/√f'c (db = ${F(q.db, 3)} cm)`)),
      fila('hz ≥', F(r.hzReq), 'cm', `l<sub>dh</sub> + r (${K.R}) + db`),
      fila('hz', F(est.hz / 100), 'm', r.hzManual ? 'adoptado' : 'iterado de 5 en 5 cm hasta cumplir', true),
      fila('d', F(dm), 'm', 'hz − 0.10 m')
    ]));

    h += paso('2. Presión admisible neta', tabla([
      fila('hs', F(pl.hs), 'm', 'Df − hz (relleno)'),
      fila('q adm neto', F(pl.q_neto), 'ton/m²', r.inp.metodo === 'prac' ? 'q adm − 2.05·Df − S/C' : 'q adm − hs·γs − hz·γc − S/C', true)
    ]));

    h += paso('3. Predimensionamiento (servicio)', tabla([
      fila('P serv 1', F(s1.P), 'ton', 'CM + CV'), fila('M serv 1', F(s1.M), 'ton·m'), fila('e1', F(s1.e, 3), 'm', 'M/P'),
      fila('P serv 2', F(s2.P), 'ton'), fila('M serv 2', F(s2.M), 'ton·m'), fila('e2', F(-s2.e, 3), 'm', 'signo de la hoja: XR usa (S − e2)'),
      fila('X<sub>R</sub>', F(pl.XR, 3), 'm', '(P1·e1 + P2·(S − e2)) / (P1 + P2), desde el eje de C1'),
      fila('L calc.', F(pl.L_calc), 'm', '2·(X<sub>R</sub> + n)'),
      fila('L', F(pl.L), 'm', pl.Lman ? 'adoptado' : 'redondeado a 0.05 m', true),
      fila('B calc.', F(pl.B_calc), 'm', '(P1 + P2) / (L · 0.9 · q neto)'),
      fila('B', F(pl.B), 'm', pl.Bman ? 'adoptado' : 'redondeado y verificado', true),
      fila('A', F(pl.A), 'm²')
    ]));

    h += paso('4. Verificación de esfuerzos sobre el suelo', grid(
      ['Caso', 'P (t)', 'M (t·m)', 'X<sub>R</sub>', 'e', 'L/6', 'q máx', 'q lím', ''],
      pl.tabla.map(t => [`${t.id} ${t.formula}`, F(t.P, 1), F(t.M, 1), F(t.XR), F(t.e, 4), F(t.Lsobre6), F(t.qmax), F(t.qlim), okc(t.ratio <= 1 + 1e-9)])
    ) + `<p>e = X<sub>R</sub> + n − L/2. Con sismo, q lím = 1.20 · q adm neto (E.050). Si e &gt; L/6 la presión es triangular: q = 2P / (3B(L/2 − e)).</p>`, true);

    h += paso('5. Presión última para el diseño', grid(
      ['Combinación', 'Pu (t)', 'Mu (t·m)', 'X<sub>R</sub>', 'e', 'q máx'],
      est.ult.map(u => [`${u.id}. ${u.nombre}`, F(u.P, 1), F(u.M, 2), F(u.XR), F(u.e, 4), F(u.qmax)])
    ) + tabla([
      fila('qu', F(est.qu), 'ton/m²', `envolvente (combinación ${est.uGob.id})`, true),
      fila('w = qu·B', F(v.w), 'ton/m', 'carga lineal hacia arriba')
    ]), true);

    h += paso('Análisis estructural (viga sobre las columnas)', tabla([
      fila('M1', F(v.M1), 'ton·m', 'w·n²/2'), fila('V1+', F(v.V1izq), 'ton'), fila('R1', F(v.R1), 'ton', 'w·L − R2', true),
      fila('V1−', F(v.V1der), 'ton'), fila('x centro', F(v.x0 - c1.x), 'm', 'cortante nulo, desde el eje de C1'),
      fila('M centro', F(v.Mcentro), 'ton·m', '', true), fila('M2', F(v.M2), 'ton·m', 'w·(L − n − S)²/2'),
      fila('V2+', F(v.V2izq), 'ton'), fila('R2', F(v.R2), 'ton', 'w·L·(L/2 − n)/S', true), fila('V2−', F(v.V2der), 'ton')
    ]));

    h += paso('6. Corte por flexión (longitudinal)', grid(
      ['Sección', 'x (m)', 'Vu (t)', 'φVc (t)', ''],
      est.corteLong.map(c => [
        `C${c.col} ${c.lado === 'izq' ? 'izquierda' : 'derecha'}${c.voladoLibre ? ` (volado ${F(c.lv)} m)` : ''}`,
        c.fuera ? 'fuera' : F(c.xs), F(c.Vu), F(c.pVc), okc(c.ok)
      ])
    ) + `<p>Sección crítica a d = ${F(dm)} m de la cara. φVc = 0.85 · 0.53√f'c · B · d.</p>`);

    h += paso('7. Corte por punzonamiento', grid(
      ['', 'C1', 'C2'],
      [
        ['Ubicación (αs)', ...est.punz.map(p => `${p.ubic} (${p.alfa})`)],
        ['Lado ∥ L (m)', ...est.punz.map(p => F(p.lx, 3))],
        ['Lado ∥ B (m)', ...est.punz.map(p => F(p.ly, 3))],
        ['b0 (m)', ...est.punz.map(p => F(p.b0))],
        ['Vu2 = R − qu·A0', ...est.punz.map(p => F(p.Vu))],
        ['β', ...est.punz.map(p => F(p.beta))],
        ['φVc forma', ...est.punz.map(p => F(p.pV1))],
        ['φVc ubicación', ...est.punz.map(p => F(p.pV2))],
        ['φVc límite', ...est.punz.map(p => F(p.pV3))],
        ['φVc', ...est.punz.map(p => `<strong>${F(p.pVc)}</strong>`)],
        ['', ...est.punz.map(p => okc(p.ok))]
      ]
    ));

    const fl = (t, f) => [t, F(f.Mu), F(f.As_calc), F(f.As_max), F(f.As_min), `<strong>${F(f.As)}</strong>`, f.ok ? f.usa : '<span class="cmb-bad">As &gt; As máx</span>'];
    h += paso('8. Diseño por flexión (longitudinal)', grid(
      ['Momento', 'Mu (t·m)', 'As', 'As máx', 'As mín', 'As final', 'Usar'],
      [fl('M1 (inferior)', est.flex.M1), fl('M2 (inferior)', est.flex.M2), fl('M centro (superior)', est.flex.Mc)]
    ) + `<p>As máx = 0.319·β1·f'c/fy · b·d; As mín = 0.0012 · b · hz por capa (b = B = ${F(pl.B * 100, 0)} cm).</p>
      <p><strong>Superior:</strong> ${a.longSup.N} ${a.longSup.bar.name} @ ${a.longSup.s} cm · <strong>Inferior:</strong> ${a.longInf.N} ${a.longInf.bar.name} @ ${a.longInf.s} cm.</p>`, true);

    h += paso('9. Diseño en la dirección transversal', grid(
      ['', 'Zapata 1', 'Zapata 2'],
      [
        ['a (m)', ...est.trans.map(t => F(t.a))],
        ['B (m)', F(pl.B), F(pl.B)],
        ['lv (m)', ...est.trans.map(t => F(t.lv))],
        ['lv − d (m)', ...est.trans.map(t => F(t.lv_d))],
        ['Vu = qu·a·(lv − d)', ...est.trans.map(t => F(t.Vu))],
        ['φVc = φ0.53√f\'c·a·d', ...est.trans.map(t => F(t.pVc))],
        ['', ...est.trans.map(t => okc(t.okV))],
        ['Mu = qu·a·lv²/2', ...est.trans.map(t => F(t.Mu))],
        ['As', ...est.trans.map(t => F(t.fl.As_calc))],
        ['As máx', ...est.trans.map(t => F(t.fl.As_max))],
        ['As mín', ...est.trans.map(t => F(t.fl.As_min))],
        ['As final', ...est.trans.map(t => `<strong>${F(t.fl.As)}</strong>`)],
        ['Franja (m)', ...a.bandas.map(b => `${F(b.ini)} – ${F(b.fin)}`)],
        ['As en franja', ...a.bandas.map(b => `${F(b.As)}${b.rigeMin ? ' (mín. franja)' : ''}`)],
        ['Armado', ...a.bandas.map(b => `${b.N} ${b.bar.name} @ ${b.s}`)]
      ]
    ) + `<p>a = ancho hasta la sección de cortante nulo. El acero se concentra en la franja cara ± d/2; en el resto y en la cara superior: ${a.transMin.bar.name} @ ${a.transMin.s} cm (0.0012·100·hz = ${F(a.transMin.As_m)} cm²/m).</p>`);

    h += paso('10. Aplastamiento y anclaje', grid(
      ['', 'C1', 'C2'],
      [
        ['A1 (cm²)', ...r.aplast.map(q => F(q.A1, 0))],
        ['Pu máx (t)', ...r.aplast.map(q => F(q.Pu))],
        ['φPn = 0.65·0.85·f\'c·A1', ...r.aplast.map(q => F(q.pPn))],
        ['', ...r.aplast.map(q => okc(q.ok))],
        ['√(A2/A1) ≤ 2', ...r.aplast.map(q => F(q.factor))],
        ['φPn con A2', ...r.aplast.map(q => F(q.pPnA2))],
        ['Dowels As mín (cm²)', ...r.aplast.map(q => F(q.dowelMin))],
        ['ld transversal (cm)', ...r.anclaje.map(q => F(q.ld, 1))],
        ['Disponible lv − r (cm)', ...r.anclaje.map(q => F(q.la, 1))],
        ['', ...r.anclaje.map(q => okc(q.ok))]
      ]
    ));
    return h;
  }
})();
