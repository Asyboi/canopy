import { Feature, SciTotals } from '../types';

/**
 * SCI-lite configuration.
 *
 * SCI = (E × I) + M  per R
 *
 * E  — Energy Consumed         kWh per functional unit
 * I  — Carbon Intensity        gCO2/kWh  (US average from poster: 388 gCO2/kWh)
 * M  — Embodied Emissions      gCO2 per functional unit
 * R  — Functional Unit         1 day of operation
 *
 * Sources:
 *   I  = 388 gCO2/kWh  (US average, Green Software Foundation poster, HooHacks 2026)
 *   PUE = 1.16          (Azure US West, Microsoft datacenter data)
 *   WUE = 0.27 L/kWh   (Microsoft datacenter water usage effectiveness)
 *   Embodied = 1230 kgCO2 total, 4-year server lifespan, 25% resource share
 *
 * Since Canopy performs static analysis (no runtime benchmark), E is modeled
 * from LOC and cyclomatic complexity as a proxy for compute intensity.
 * All values are labeled as estimates (confidence: 'low').
 */
const SCI_CONFIG = {
  // Carbon intensity — US average (gCO2/kWh) per poster
  i_gco2PerKwh: 388,
  // Power usage effectiveness (data-center overhead multiplier)
  pue: 1.16,
  // Water usage effectiveness (L/kWh)
  wueLitersPerKwh: 0.27,
  // Operational energy proxy: reference kWh/month for 100 LOC at complexityScore = 1.0
  baseKwhPer100LocPerMonth: 5,
  // Embodied carbon (server hardware lifecycle)
  embodiedServerKgCo2: 1230,     // kgCO2 total embodied
  serverLifespanHours: 35040,    // 4 years × 8760 h/yr
  resourceShare: 0.25,           // fraction of server resources allocated to this workload
  hoursPerMonth: 720,
  // Functional unit
  functionalUnit: 'per day of operation',
} as const;

export function calculateSustainability(features: Feature[]): SciTotals {
  const totalScore = features.reduce((s, f) => s + f.metrics.complexityScore, 0) || 1;

  // Monthly embodied carbon for the allocated server slice (kgCO2/month)
  const monthlyEmbodiedKgCo2 =
    SCI_CONFIG.embodiedServerKgCo2 *
    (SCI_CONFIG.hoursPerMonth / SCI_CONFIG.serverLifespanHours) *
    SCI_CONFIG.resourceShare;

  for (const feature of features) {
    const { loc, complexityScore } = feature.metrics;

    // --- Operational energy (monthly, kWh) ---
    const computeKwhMonth = (loc / 100) * complexityScore * SCI_CONFIG.baseKwhPer100LocPerMonth;
    const operationalKwhMonth = computeKwhMonth * SCI_CONFIG.pue;

    // --- Embodied carbon allocation (monthly, kgCO2) ---
    const embodiedShare = complexityScore / totalScore;
    const embodiedKgCo2Month = monthlyEmbodiedKgCo2 * embodiedShare;

    // --- Legacy sustainability fields (monthly totals) ---
    const operationalCarbonKgMonth = operationalKwhMonth * (SCI_CONFIG.i_gco2PerKwh / 1000);
    const waterLitersMonth = operationalKwhMonth * SCI_CONFIG.wueLitersPerKwh;

    feature.sustainability.electricityKwh = parseFloat(operationalKwhMonth.toFixed(4));
    feature.sustainability.carbonKgCo2e = parseFloat((operationalCarbonKgMonth + embodiedKgCo2Month).toFixed(4));
    feature.sustainability.waterLiters = parseFloat(waterLitersMonth.toFixed(4));
    feature.sustainability.isEstimated = true;
    feature.sustainability.infrastructureTag = 'us-average / azure-aligned';

    // --- SCI per R (R = 1 day of operation) ---
    const e_kwhPerR = operationalKwhMonth / 30;                          // kWh/day
    const m_gco2PerR = (embodiedKgCo2Month * 1000) / 30;               // gCO2/day
    const sciGco2PerR = (e_kwhPerR * SCI_CONFIG.i_gco2PerKwh) + m_gco2PerR;

    feature.sci = {
      e_kwhPerR: parseFloat(e_kwhPerR.toFixed(5)),
      i_gco2PerKwh: SCI_CONFIG.i_gco2PerKwh,
      m_gco2PerR: parseFloat(m_gco2PerR.toFixed(2)),
      sciGco2PerR: parseFloat(sciGco2PerR.toFixed(2)),
      functionalUnit: SCI_CONFIG.functionalUnit,
      confidence: 'low',
    };

    // Tier based on SCI (gCO2/day)
    if (sciGco2PerR >= 120) {
      feature.sustainabilityTier = 'high';
    } else if (sciGco2PerR >= 40) {
      feature.sustainabilityTier = 'medium';
    } else {
      feature.sustainabilityTier = 'low';
    }
  }

  // Aggregate SCI totals
  const totalSci = features.reduce((s, f) => s + f.sci.sciGco2PerR, 0);
  const totalE = features.reduce((s, f) => s + f.sci.e_kwhPerR, 0);
  const totalM = features.reduce((s, f) => s + f.sci.m_gco2PerR, 0);

  return {
    sciGco2PerR: parseFloat(totalSci.toFixed(2)),
    eKwhPerR: parseFloat(totalE.toFixed(5)),
    mGco2PerR: parseFloat(totalM.toFixed(2)),
    iGco2PerKwh: SCI_CONFIG.i_gco2PerKwh,
    functionalUnit: SCI_CONFIG.functionalUnit,
    methodology:
      'SCI-lite: static LOC+complexity proxy for E, US-average I (388 gCO2/kWh), ' +
      'embodied M allocated by complexity share. Confidence: low (no runtime benchmark). ' +
      'Assumptions: PUE 1.16, WUE 0.27 L/kWh, 1230 kgCO2 server embodied / 4yr lifespan / 25% resource share.',
  };
}
