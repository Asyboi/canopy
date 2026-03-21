import { Feature } from '../types';

export function calculateSustainability(features: Feature[]): void {
  for (const feature of features) {
    const score = feature.metrics.complexityScore;

    feature.sustainability.electricityKwh = score * 10;
    feature.sustainability.waterLiters = feature.sustainability.electricityKwh * 1.8;
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
  }
}
