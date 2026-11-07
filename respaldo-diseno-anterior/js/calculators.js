/**
 * CALCULADORAS TÉCNICAS DE INGENIERÍA CIVIL
 * Herramientas interactivas para predimensionamiento y dosificación en obra
 */

document.addEventListener('DOMContentLoaded', () => {
  initBeamCalculator();
  initConcreteCalculator();
  initSlopeCalculator();
  initColumnCalculator();
  initCalcTabs();
});

// Navegación entre pestañas de calculadoras
function initCalcTabs() {
  const calcTabs = document.querySelectorAll('.calc-nav-btn');
  const calcPanels = document.querySelectorAll('.calc-panel');

  calcTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetId = tab.getAttribute('data-target');

      calcTabs.forEach(t => t.classList.remove('active'));
      calcPanels.forEach(p => p.classList.remove('active'));

      tab.classList.add('active');
      const targetPanel = document.getElementById(targetId);
      if (targetPanel) {
        targetPanel.classList.add('active');
      }
    });
  });
}

/**
 * 1. PREDIMENSIONAMIENTO DE VIGAS DE CONCRETO ARMADO
 * Basado en criterios de rigidez por flexión y control de deflexiones (ACI 318 / NTE E.060)
 */
function initBeamCalculator() {
  const lengthInput = document.getElementById('beam-length');
  const typeSelect = document.getElementById('beam-type');
  const widthInput = document.getElementById('beam-width');

  if (!lengthInput || !typeSelect || !widthInput) return;

  function calculateBeam() {
    const L_m = parseFloat(lengthInput.value) || 0;
    const factor = parseFloat(typeSelect.value) || 12;
    let b_cm = parseFloat(widthInput.value) || 25;

    if (L_m <= 0) return;

    // Altura teórica en cm (Luz en cm / factor)
    const L_cm = L_m * 100;
    const h_theoretical = L_cm / factor;

    // Redondear a múltiplos de 5 cm hacia arriba para constructibilidad
    const h_rounded = Math.ceil(h_theoretical / 5) * 5;

    // Ancho sugerido si no se ingresa (b = h / 2, mín 25 cm para zona sísmica)
    const b_suggested_min = Math.max(25, Math.ceil((h_rounded * 0.3) / 5) * 5);
    const b_suggested_max = Math.ceil((h_rounded * 0.5) / 5) * 5;

    // Peralte efectivo estimado d (asumiendo recubrimiento r=4cm y estribo+acero aprox 1-2cm -> d ≈ h - 5cm)
    const d_est = h_rounded - 5;

    // Relación de aspecto
    const ratio = (h_rounded / b_cm).toFixed(2);

    // Actualizar vista
    const resMain = document.getElementById('res-beam-h');
    const resSec = document.getElementById('res-beam-b');
    const resD = document.getElementById('res-beam-d');
    const resRatio = document.getElementById('res-beam-ratio');
    const resSuggB = document.getElementById('res-beam-suggested-b');

    if (resMain) resMain.textContent = `${h_rounded} cm`;
    if (resSec) resSec.textContent = `${b_cm} cm`;
    if (resD) resD.textContent = `${d_est} cm`;
    if (resRatio) resRatio.textContent = `1 : ${ratio}`;
    if (resSuggB) resSuggB.textContent = `${b_suggested_min} a ${b_suggested_max} cm`;
  }

  lengthInput.addEventListener('input', calculateBeam);
  typeSelect.addEventListener('change', calculateBeam);
  widthInput.addEventListener('input', calculateBeam);

  // Ejecución inicial
  calculateBeam();
}

/**
 * 2. DOSIFICACIÓN DE CONCRETO EN OBRA (POR m³)
 * Factores de proporción por m3 estándar con control de desperdicio
 */
function initConcreteCalculator() {
  const strengthSelect = document.getElementById('concrete-fc');
  const volumeInput = document.getElementById('concrete-vol');
  const wasteInput = document.getElementById('concrete-waste');

  if (!strengthSelect || !volumeInput || !wasteInput) return;

  // Proporciones base por m3 de concreto
  // [Bolsas cemento (42.5kg), m3 arena gruesa, m3 piedra chancada 1/2", m3 agua]
  const mixDatabase = {
    '140': { bags: 7.0, sand: 0.50, gravel: 0.64, water: 0.185, ratio: '1 : 2.5 : 3.5' },
    '175': { bags: 8.4, sand: 0.52, gravel: 0.58, water: 0.180, ratio: '1 : 2.5 : 2.5' },
    '210': { bags: 9.7, sand: 0.52, gravel: 0.53, water: 0.186, ratio: '1 : 2 : 2' },
    '280': { bags: 12.3, sand: 0.45, gravel: 0.52, water: 0.175, ratio: '1 : 1.5 : 1.5' }
  };

  function calculateConcrete() {
    const fc = strengthSelect.value;
    const vol = parseFloat(volumeInput.value) || 0;
    const wastePercent = parseFloat(wasteInput.value) || 5;

    if (vol <= 0 || !mixDatabase[fc]) return;

    const wasteFactor = 1 + (wastePercent / 100);
    const totalEffectiveVol = vol * wasteFactor;
    const mix = mixDatabase[fc];

    const totalBags = Math.ceil(totalEffectiveVol * mix.bags);
    const totalSand = (totalEffectiveVol * mix.sand).toFixed(2);
    const totalGravel = (totalEffectiveVol * mix.gravel).toFixed(2);
    const totalWater = Math.round(totalEffectiveVol * mix.water * 1000); // Litros

    // Actualizar vista
    const resBags = document.getElementById('res-concrete-bags');
    const resSand = document.getElementById('res-concrete-sand');
    const resGravel = document.getElementById('res-concrete-gravel');
    const resWater = document.getElementById('res-concrete-water');
    const resRatio = document.getElementById('res-concrete-ratio');

    if (resBags) resBags.textContent = `${totalBags} bolsas`;
    if (resSand) resSand.textContent = `${totalSand} m³`;
    if (resGravel) resGravel.textContent = `${totalGravel} m³`;
    if (resWater) resWater.textContent = `${totalWater} L`;
    if (resRatio) resRatio.textContent = mix.ratio;
  }

  strengthSelect.addEventListener('change', calculateConcrete);
  volumeInput.addEventListener('input', calculateConcrete);
  wasteInput.addEventListener('input', calculateConcrete);

  // Ejecución inicial
  calculateConcrete();
}

/**
 * 3. CÁLCULO DE PENDIENTE TOPOGRÁFICA Y DESNIVEL
 * Útil para vías, rasantes, rampas y alcantarillado
 */
function initSlopeCalculator() {
  const distInput = document.getElementById('slope-dist');
  const z1Input = document.getElementById('slope-z1');
  const z2Input = document.getElementById('slope-z2');

  if (!distInput || !z1Input || !z2Input) return;

  function calculateSlope() {
    const d = parseFloat(distInput.value) || 0;
    const z1 = parseFloat(z1Input.value) || 0;
    const z2 = parseFloat(z2Input.value) || 0;

    if (d <= 0) return;

    const deltaZ = z2 - z1;
    const slopePercent = (Math.abs(deltaZ) / d) * 100;
    const angleDeg = (Math.atan(Math.abs(deltaZ) / d) * (180 / Math.PI)).toFixed(2);
    const ratio = Math.abs(deltaZ) > 0 ? (d / Math.abs(deltaZ)).toFixed(1) : 0;

    // Diagnóstico normativo
    let diagnosis = "Pendiente moderada";
    if (slopePercent <= 0.5) {
      diagnosis = "Mínima para drenaje pluvial / cunetas";
    } else if (slopePercent <= 4) {
      diagnosis = "Excelente para vías vehiculares y accesibilidad";
    } else if (slopePercent <= 8) {
      diagnosis = "Pendiente máxima recomendada para vías urbanas";
    } else if (slopePercent <= 12) {
      diagnosis = "Pendiente fuerte (exige diseño especial en pavimentos)";
    } else {
      diagnosis = "Pendiente extrema (riesgo de socavación y erosión)";
    }

    // Actualizar vista
    const resSlope = document.getElementById('res-slope-percent');
    const resDelta = document.getElementById('res-slope-delta');
    const resRatio = document.getElementById('res-slope-ratio');
    const resAngle = document.getElementById('res-slope-angle');
    const resDiag = document.getElementById('res-slope-diag');

    if (resSlope) resSlope.textContent = `${slopePercent.toFixed(2)}%`;
    if (resDelta) resDelta.textContent = `${deltaZ >= 0 ? '+' : ''}${deltaZ.toFixed(2)} m`;
    if (resRatio) resRatio.textContent = ratio > 0 ? `1 : ${ratio}` : '0%';
    if (resAngle) resAngle.textContent = `${angleDeg}°`;
    if (resDiag) resDiag.textContent = diagnosis;
  }

  distInput.addEventListener('input', calculateSlope);
  z1Input.addEventListener('input', calculateSlope);
  z2Input.addEventListener('input', calculateSlope);

  // Ejecución inicial
  calculateSlope();
}

/**
 * 4. PREDIMENSIONAMIENTO DE COLUMNAS DE CONCRETO ARMADO
 * Basado en cargas por área tributaria y coeficientes n según tipo de columna (Norma E.060 / ACI)
 */
function initColumnCalculator() {
  const atInput = document.getElementById('col-at');
  const floorsInput = document.getElementById('col-floors');
  const typeSelect = document.getElementById('col-type');
  const usageSelect = document.getElementById('col-usage');
  const fcSelect = document.getElementById('col-fc');

  if (!atInput || !floorsInput || !typeSelect || !usageSelect || !fcSelect) return;

  function calculateColumn() {
    const At = parseFloat(atInput.value) || 0;
    const N = parseInt(floorsInput.value) || 1;
    const colType = typeSelect.value;
    const qLoad = parseFloat(usageSelect.value) || 1000;
    const fc = parseFloat(fcSelect.value) || 210;

    if (At <= 0 || N <= 0) return;

    // Factores normativos según ubicación de la columna
    let factorP = 1.10;
    let nCoef = 0.30;

    if (colType === 'edge') {
      factorP = 1.25;
      nCoef = 0.25;
    } else if (colType === 'corner') {
      factorP = 1.50;
      nCoef = 0.20;
    }

    // Carga de servicio en kg y Toneladas
    const P_service_kg = factorP * qLoad * At * N;
    const P_service_ton = (P_service_kg / 1000).toFixed(1);

    // Área requerida de concreto Ac = P / (n * f'c) en cm2
    const Ac_cm2 = P_service_kg / (nCoef * fc);

    // Lado cuadrado mínimo (múltiplo superior de 5 cm, mín 30 cm)
    const sideSquareRaw = Math.sqrt(Ac_cm2);
    const sideSquare = Math.max(30, Math.ceil(sideSquareRaw / 5) * 5);

    // Sección rectangular alternativa
    const baseRect = sideSquare >= 45 ? 30 : 25;
    const heightRectRaw = Ac_cm2 / baseRect;
    const heightRect = Math.max(baseRect, Math.ceil(heightRectRaw / 5) * 5);

    // Actualizar vista
    const resSection = document.getElementById('res-col-section');
    const resP = document.getElementById('res-col-p');
    const resAc = document.getElementById('res-col-ac');
    const resRect = document.getElementById('res-col-rect');
    const resType = document.getElementById('res-col-type');

    if (resSection) resSection.textContent = `${sideSquare} x ${sideSquare} cm`;
    if (resP) resP.textContent = `${P_service_ton} Toneladas`;
    if (resAc) resAc.textContent = `${Math.round(Ac_cm2)} cm²`;
    if (resRect) resRect.textContent = `${baseRect} x ${heightRect} cm`;
    if (resType) {
      const typeNames = { center: 'Central (n=0.30)', edge: 'Perimétrica (n=0.25)', corner: 'Esquinera (n=0.20)' };
      resType.textContent = typeNames[colType] || colType;
    }
  }

  atInput.addEventListener('input', calculateColumn);
  floorsInput.addEventListener('input', calculateColumn);
  typeSelect.addEventListener('change', calculateColumn);
  usageSelect.addEventListener('change', calculateColumn);
  fcSelect.addEventListener('change', calculateColumn);

  // Ejecución inicial
  calculateColumn();
}

