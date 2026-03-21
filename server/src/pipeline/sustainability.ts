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

export function calculateSustainability(features: Feature[], workspacePath: string): void {
  const config = readConfig(workspacePath);

  const embodiedCarbonKg = config.embodiedCarbonKg ?? 1000;
  const hardwareLifespanYears = config.hardwareLifespanYears ?? 4;
  const monthlyRequests = config.monthlyRequests ?? 100_000;
  const functionalUnit = config.functionalUnit ?? 'per_1000_requests';
  const unit = config.functionalUnitLabel ?? 'per 1000 API requests';

  const lifespanHours = hardwareLifespanYears * 365 * 24;
  const embodiedGco2PerHour = (embodiedCarbonKg * 1000) / lifespanHours;

  for (const feature of features) {
    const score = feature.metrics.complexityScore;

    feature.sustainability.electricityKwh = score * 10;
    feature.sustainability.carbonKgCo2e = feature.sustainability.electricityKwh * 0.233;
    feature.sustainability.isEstimated = true;
    feature.sustainability.infrastructureTag = null;

    if (score >= 0.6) {
      feature.sustainabilityTier = 'high';
    } else if (score >= 0.3) {
      feature.sustainabilityTier = 'medium';
    } else {
      feature.sustainabilityTier = 'low';
    }

    // SCI = ((E × I) + M) per R
    const I = 436; // IEA 2023 global average gCO2/kWh (no Climatiq data in current impl)
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
