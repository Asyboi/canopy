import fs from 'fs';
import path from 'path';
import Anthropic from '@anthropic-ai/sdk';
import { FeaturePrediction, SustainabilityPrediction, AnalysisResult } from '../types';
import { retry } from '../utils/retry';

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

function calculateSci(complexityScore: number, workspacePath: string): SustainabilityPrediction {
  const config = readConfig(workspacePath);

  const embodiedCarbonKg = config.embodiedCarbonKg ?? 1000;
  const hardwareLifespanYears = config.hardwareLifespanYears ?? 4;
  const monthlyRequests = config.monthlyRequests ?? 100_000;
  const functionalUnit = config.functionalUnit ?? 'per_1000_requests';
  const unit = config.functionalUnitLabel ?? 'gCO2 per 1000 API requests';

  const pue = 1.16;
  const baseKwhPer100LocPerMonth = 5;
  const resourceShare = 0.25;
  const hoursPerMonth = 720;
  const I = 436;

  const lifespanHours = hardwareLifespanYears * 365 * 24;
  const embodiedGco2PerHour = (embodiedCarbonKg * 1000) / lifespanHours;

  // LOC proxy: scale complexity score to a reasonable line count estimate
  const loc = Math.round(complexityScore * 500);

  const computeKwhMonth = (loc / 100) * complexityScore * baseKwhPer100LocPerMonth;
  const operationalKwhMonth = computeKwhMonth * pue;

  const monthlyEmbodiedKgCo2 =
    embodiedCarbonKg * (hoursPerMonth / lifespanHours) * resourceShare;
  const operationalCarbonKgMonth = operationalKwhMonth * (I / 1000);

  const electricityKwh = parseFloat(operationalKwhMonth.toFixed(4));
  const carbonKgCo2e = parseFloat((operationalCarbonKgMonth + monthlyEmbodiedKgCo2).toFixed(4));

  // SCI per 1000 API requests (score = 1 for single-feature prediction)
  const R_monthly = Math.max(monthlyRequests / 1000, 0.001);
  const E_per_R = electricityKwh / R_monthly;
  const M_feature_per_month = embodiedGco2PerHour * 24 * 30.44;
  const M_per_R = M_feature_per_month / R_monthly;
  const sciScore = E_per_R * I + M_per_R;

  return {
    electricityKwh,
    carbonKgCo2e,
    sci: {
      score: parseFloat(sciScore.toFixed(1)),
      unit,
      components: {
        E_per_R: parseFloat(E_per_R.toFixed(4)),
        I,
        M_per_R: parseFloat(M_per_R.toFixed(1)),
      },
      functionalUnit,
    },
    isEstimated: true,
    isPredicted: true,
  };
}

function buildFeaturesContext(workspacePath: string): string {
  try {
    const analysisPath = path.join(workspacePath, '.canopy', 'analysis.json');
    const analysis = JSON.parse(fs.readFileSync(analysisPath, 'utf-8')) as AnalysisResult;
    return analysis.features
      .map((f) => `- ${f.name}: complexityScore=${f.metrics.complexityScore.toFixed(2)}`)
      .join('\n');
  } catch {
    return '';
  }
}

async function callClaude(description: string, existingFeaturesContext: string): Promise<string> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

  const prompt = `You are a software sustainability analyst. A developer wants to build a new feature.
Analyze their description and respond with a JSON object ONLY — no markdown, no backticks, no explanation.

${existingFeaturesContext ? `Existing codebase features for complexity calibration:\n${existingFeaturesContext}\n\n` : ''}New feature description: "${description}"

Respond with exactly this JSON structure:
{
  "featureName": "short name (3-5 words, title case)",
  "identifiedPatterns": [],
  "patternExplanation": "",
  "predictedComplexityScore": 0.5,
  "greenerAlternativeName": "short name (3-5 words, title case)",
  "greenerAlternativeDescription": "one sentence describing the greener approach",
  "greenerComplexityScore": 0.3,
  "greenerCodeSkeleton": "// TypeScript skeleton (20-40 lines, well commented)"
}

Rules:
- identifiedPatterns must only contain values from: ["POLLING", "N_PLUS_ONE", "SYNC_BLOCKING"]
- If no patterns apply, return an empty array []
- patternExplanation is one sentence if patterns found, empty string "" if not
- predictedComplexityScore: 0.6-0.8 for polling/sync/heavy queries, 0.3-0.6 for typical CRUD, 0.0-0.3 for simple reads
- greenerComplexityScore must always be strictly lower than predictedComplexityScore
- greenerCodeSkeleton must be real working TypeScript, not pseudocode
- Return ONLY the JSON object. No markdown fences. No explanation before or after.`;

  const result = await retry(async () => {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });
    return (message.content[0] as { type: 'text'; text: string }).text.trim();
  });

  return result;
}

function parseGeminiResponse(text: string): Record<string, unknown> {
  const cleaned = text.trim().replace(/^```json\n?/, '').replace(/\n?```$/, '');
  return JSON.parse(cleaned);
}

export async function predictFeature(
  workspacePath: string,
  description: string
): Promise<FeaturePrediction> {
  const existingFeaturesContext = buildFeaturesContext(workspacePath);

  let raw: string;
  try {
    raw = await callClaude(description, existingFeaturesContext);
  } catch (err) {
    console.error('[predict] Claude call failed:', err);
    throw new Error('CLAUDE_UNAVAILABLE');
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = parseGeminiResponse(raw);
  } catch {
    // Retry once on parse failure
    let raw2: string;
    try {
      raw2 = await callClaude(description, existingFeaturesContext);
    } catch {
      throw new Error('CLAUDE_UNAVAILABLE');
    }
    parsed = parseGeminiResponse(raw2); // throws if still malformed → 500
  }

  const predictedComplexityScore = Number(parsed.predictedComplexityScore) || 0.5;
  const greenerComplexityScore = Number(parsed.greenerComplexityScore) || 0.3;

  const originalSustainability = calculateSci(predictedComplexityScore, workspacePath);
  const greenerSustainability = calculateSci(greenerComplexityScore, workspacePath);

  const savingsPercent = Math.round(
    ((originalSustainability.sci.score - greenerSustainability.sci.score) /
      originalSustainability.sci.score) *
      100
  );

  return {
    featureName: String(parsed.featureName ?? 'Unnamed Feature'),
    description,
    predictedComplexityScore,
    sustainability: originalSustainability,
    identifiedPatterns: Array.isArray(parsed.identifiedPatterns)
      ? (parsed.identifiedPatterns as ('POLLING' | 'N_PLUS_ONE' | 'SYNC_BLOCKING')[])
      : [],
    patternExplanation: String(parsed.patternExplanation ?? ''),
    greenerAlternative: {
      featureName: String(parsed.greenerAlternativeName ?? 'Greener Alternative'),
      description: String(parsed.greenerAlternativeDescription ?? ''),
      predictedComplexityScore: greenerComplexityScore,
      sustainability: greenerSustainability,
      codeSkeleton: String(parsed.greenerCodeSkeleton ?? ''),
    },
    savingsPercent,
  };
}
