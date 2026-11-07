/**
 * ===================================================================
 * TABLA RESUMEN - ZAPATA AISLADA
 * Arma una hoja de una sola página con los datos y resultados
 * (estilo hoja de cálculo) a partir de window.footingReport.
 * ===================================================================
 */
(function () {
  'use strict';

  const F = (x, n = 2) => Number(x).toFixed(n);

  function buildSummaryHTML(r) {
    const i = r.inp, p = r.plan, e = r.est, g = p.geo;
    const hz_m = e.hz / 100;
    const A = p.B * p.L;
    const pp = A * hz_m * 2.4; // peso propio de la zapata (ton)

    // [símbolo, valor, unidad, descripción, tipo]  tipo: 'in' (dato, azul) | 'out' (resultado, verde) | '' normal
    const secciones = [
      ['DIMENSIONAMIENTO', [
        ['q adm', F(i.qa_kgcm2 * 10), 'ton/m²', 'Esfuerzo admisible del terreno', 'in'],
        ['Df', F(i.Df_m), 'm', 'Profundidad de desplante', 'in'],
        ['hz', F(hz_m), 'm', 'Altura de zapata', 'in'],
        ["f'c", F(i.fc, 0), 'kg/cm²', 'Resistencia a la compresión del concreto', 'in'],
        ['fy', F(i.fy, 0), 'kg/cm²', 'Esfuerzo de fluencia del acero', 'in'],
        ['d', F(e.d / 100), 'm', 'Distancia del acero en tracción al borde comprimido', ''],
        ['q adm neto', F(p.q_neto), 'ton/m²', 'Esfuerzo admisible neto (descontando suelo, zapata y s/c)', ''],
        ['L', F(p.L), 'm', 'Largo de zapata', ''],
        ['B', F(p.B), 'm', 'Ancho de zapata', ''],
        ['Az', F(A), 'm²', 'Área de zapata', ''],
        ['pp', F(pp, 1), 'ton', 'Peso propio de zapata', ''],
        ['q máx', F(g.qmax), 'ton/m²', `Esfuerzo máximo en servicio (${g.id} ${g.titulo}: ${g.formula}; límite ${F(g.qlim)})`, 'out'],
        ['qu', F(e.quMax), 'ton/m²', 'Esfuerzo último de diseño (envolvente)', '']
      ]],
      ['PUNZONAMIENTO', [
        ['Pu', F(e.Pu_max, 1), 'ton', 'Carga última que baja por la columna', ''],
        ['Vu', F(e.Vup, 1), 'ton', 'Cortante último por punzonamiento', ''],
        ['b', F(i.cx_cm / 100), 'm', 'Ancho de columna', 'in'],
        ['t', F(i.cy_cm / 100), 'm', 'Largo de columna', 'in'],
        ['A0', F(e.Ao), 'm²', 'Área de carga', ''],
        ['b0', F(e.bo / 100), 'm', 'Perímetro resistente a punzonamiento', ''],
        ['β', F(e.beta), '', 'Factor de forma', ''],
        ['φVn1', F(e.pVc1, 1), 'ton', 'Resistencia 1 de diseño a punzonamiento', ''],
        ['φVn2', F(e.pVc2, 1), 'ton', 'Resistencia 2 de diseño a punzonamiento (αs = 40)', ''],
        ['φVn3', F(e.pVc3, 1), 'ton', 'Resistencia 3 de diseño a punzonamiento', ''],
        ['φVn', F(e.pVcp, 2), 'ton', 'Resistencia de diseño a punzonamiento', 'out']
      ]],
      ['FLEXIÓN', [
        ['lv B', F(e.Lvx), 'm', 'Volado libre, dirección B', ''],
        ['Mu B', F(e.flexX ? e.flexX.Mu_tonm : e.Mux), 'ton·m', 'Momento último, refuerzo paralelo a B', ''],
        ['As B', F(e.Asx), 'cm²', 'Acero necesario paralelo a B (rige ' + (e.flexX && e.flexX.As_calc >= e.flexX.As_min ? 'cálculo' : 'mínimo') + ')', 'out'],
        ['lv L', F(e.Lvy), 'm', 'Volado libre, dirección L', ''],
        ['Mu L', F(e.flexY ? e.flexY.Mu_tonm : e.Muy), 'ton·m', 'Momento último, refuerzo paralelo a L', ''],
        ['As L', F(e.Asy), 'cm²', 'Acero necesario paralelo a L (rige ' + (e.flexY && e.flexY.As_calc >= e.flexY.As_min ? 'cálculo' : 'mínimo') + ')', 'out'],
        ['As mín', F(e.flexX ? e.flexX.As_min : 0) + ' / ' + F(e.flexY ? e.flexY.As_min : 0), 'cm²', '0.0018·b·hz (dir. B / dir. L)', ''],
        ['Armado B', `${e.N_x} ${r.barX.name} @ ${e.s_x} cm`, '', 'Malla inferior paralela a B', 'out'],
        ['Armado L', `${e.N_y} ${r.barY.name} @ ${e.s_y} cm`, '', 'Malla inferior paralela a L', 'out']
      ]],
      ['CORTE', [
        ['Vu B', F(e.Vux, 2), 'ton', 'Cortante último a d de la cara, dirección B', ''],
        ['φVc B', F(e.pVcx, 2), 'ton', 'Resistencia de diseño al corte, dirección B', 'out'],
        ['Vu L', F(e.Vuy, 2), 'ton', 'Cortante último a d de la cara, dirección L', ''],
        ['φVc L', F(e.pVcy, 2), 'ton', 'Resistencia de diseño al corte, dirección L', 'out']
      ]],
      ['ANCLAJE Y APLASTAMIENTO', [
        ['ld', F(e.ld / 100), 'm', 'Longitud de desarrollo requerida', ''],
        ['l disp', F(e.la / 100), 'm', 'Longitud disponible en el volado', 'out'],
        ['φPnb', F(e.phiPnb, 1), 'ton', 'Resistencia al aplastamiento (columna-zapata)', 'out'],
        ['Asd mín', F(e.dowel_min), 'cm²', 'Acero mínimo de espigas (0.005·A1)', '']
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
      <thead><tr><th colspan="4">DISEÑO DE ZAPATA AISLADA</th></tr></thead>
      <tbody>${filas}</tbody>
    </table>
    <p class="fs-leyenda"><span class="fs-chip fs-in">dato</span> <span class="fs-chip fs-out">resultado de verificación</span></p>`;
  }

  document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('footingSummaryBtn');
    const back = document.getElementById('footingSummaryBack');
    const body = document.getElementById('footingSummaryBody');
    if (!btn || !back || !body) return;

    btn.addEventListener('click', () => {
      const r = window.footingReport;
      if (!r) {
        alert('No hay resultados válidos. Revise los datos de entrada.');
        return;
      }
      body.innerHTML = buildSummaryHTML(r);
      const tit = document.getElementById('footingSummaryTitle');
      if (tit) tit.textContent = 'Tabla resumen · Zapata aislada';
      back.classList.add('open');
    });
    document.getElementById('footingSummaryClose')?.addEventListener('click', () => back.classList.remove('open'));
    document.getElementById('footingSummaryPrint')?.addEventListener('click', () => window.print());
    document.getElementById('footingSummaryCopy')?.addEventListener('click', () => {
      const filas = [...body.querySelectorAll('tbody tr')].map(tr =>
        [...tr.children].map(td => td.textContent.trim()).join('\t')).join('\n');
      navigator.clipboard?.writeText(filas).then(
        () => { const b = document.getElementById('footingSummaryCopy'); const t = b.textContent; b.textContent = '✓ Copiado'; setTimeout(() => { b.textContent = t; }, 1500); },
        () => alert('No se pudo copiar.')
      );
    });
  });

  window.buildFootingSummaryHTML = buildSummaryHTML;
})();
