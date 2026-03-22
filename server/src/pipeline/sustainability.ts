import fs from 'fs';
import path from 'path';
import { Feature } from '../types';

interface CanopyConfig {
  embodiedCarbonKg?: number;
  hardwareLifespanYears?: number;
  monthlyRequests?: number;
  functionalUnit?: string;
  functionalUnitLabel?: string;
}

function readConfig(workspacePath: string): CanopyConfig {
  try {
    const configPath = path.join(workspacePath, '.canopy', 'config.json');
    return JSON.parse(fs.readFileSync(configPath, 'utf-8')) as CanopyConfig;
  } catch {
    return {};
  }
}

const SCI_CONFIG = {
  // Power usage effectiveness (data-center overhead multiplier)
  pue: 1.16,
  // Operational energy proxy: reference kWh/month for 100 LOC at complexityScore = 1.0
  baseKwhPer100LocPerMonth: 5,
  // Embodied carbon server lifecycle
  resourceShare: 0.25,
  hoursPerMonth: 720,
} as const;

export function calculateSustainability(features: Feature[], workspacePath: string): void {
  const config = readConfig(workspacePath);

  const embodiedCarbonKg = config.embodiedCarbonKg ?? 1000;
  const hardwareLifespanYears = config.hardwareLifespanYears ?? 4;
  const monthlyRequests = config.monthlyRequests ?? 100_000;
  const functionalUnit = config.functionalUnit ?? 'per_1000_requests';
  const unit = config.functionalUnitLabel ?? 'per 1000 API requests';

  const lifespanHours = hardwareLifespanYears * 365 * 24;
  const embodiedGco2PerHour = (embodiedCarbonKg * 1000) / lifespanHours;

  const totalScore = features.reduce((s, f) => s + f.metrics.complexityScore, 0) || 1;

  const monthlyEmbodiedKgCo2 =
    embodiedCarbonKg *
    (SCI_CONFIG.hoursPerMonth / lifespanHours) *
    SCI_CONFIG.resourceShare;

  const I = 436; // IEA 2023 global average gCO2/kWh

  for (const feature of features) {
    const { loc, complexityScore } = feature.metrics;
    const score = complexityScore / totalScore;

    // --- Operational energy (monthly, kWh) ---
    const computeKwhMonth = (loc / 100) * complexityScore * SCI_CONFIG.baseKwhPer100LocPerMonth;
    const operationalKwhMonth = computeKwhMonth * SCI_CONFIG.pue;

    // --- Embodied carbon allocation (monthly, kgCO2) ---
    const embodiedKgCo2Month = monthlyEmbodiedKgCo2 * score;

    // --- Operational carbon (monthly, kgCO2) ---
    const operationalCarbonKgMonth = operationalKwhMonth * (I / 1000);

    feature.sustainability.electricityKwh = parseFloat(operationalKwhMonth.toFixed(4));
    feature.sustainability.carbonKgCo2e = parseFloat((operationalCarbonKgMonth + embodiedKgCo2Month).toFixed(4));
    feature.sustainability.isEstimated = true;
    feature.sustainability.infrastructureTag = 'us-average / azure-aligned';

    // --- SCI per R (R = 1 day of operation) — stored in feature.sci (SciMetrics) ---
    const e_kwhPerR = operationalKwhMonth / 30;
    const m_gco2PerR = (embodiedKgCo2Month * 1000) / 30;
    const sciGco2PerR = (e_kwhPerR * I) + m_gco2PerR;

    feature.sci = {
      e_kwhPerR: parseFloat(e_kwhPerR.toFixed(5)),
      i_gco2PerKwh: I,
      m_gco2PerR: parseFloat(m_gco2PerR.toFixed(2)),
      sciGco2PerR: parseFloat(sciGco2PerR.toFixed(2)),
      functionalUnit: 'per day of operation',
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

    // --- SCI per R (R = 1000 API requests) — stored in feature.sustainability.sci ---
    const R_monthly = Math.max((monthlyRequests * score) / 1000, 0.001);
    const E_per_R = feature.sustainability.electricityKwh / R_monthly;
    const M_feature_per_month = embodiedGco2PerHour * 24 * 30.44 * score;
    const M_per_R = M_feature_per_month / R_monthly;
    const sciScore = (E_per_R * I) + M_per_R;

    feature.sustainability.sci = {
      score: sciScore,
      unit,
      components: { E_per_R, I, M_per_R },
      functionalUnit,
    };
  }
}
