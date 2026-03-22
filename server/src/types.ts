export interface SciMetrics {
  /** E — Energy consumed (kWh per R) */
  e_kwhPerR: number;
  /** I — Carbon intensity assumption (gCO2/kWh) */
  i_gco2PerKwh: number;
  /** M — Embodied emissions (gCO2 per R) */
  m_gco2PerR: number;
  /** SCI = (E × I) + M  (gCO2 per R) */
  sciGco2PerR: number;
  /** R — Functional unit description */
  functionalUnit: string;
  /** Confidence in the estimate */
  confidence: 'low' | 'medium' | 'high';
}

export interface SciTotals {
  sciGco2PerR: number;
  eKwhPerR: number;
  mGco2PerR: number;
  iGco2PerKwh: number;
  functionalUnit: string;
  methodology: string;
}

export interface AnalysisResult {
  generatedAt: string;
  workspacePath: string;
  features: Feature[];
  totals: {
    electricityKwh: number;
    carbonKgCo2e: number;
    sci: {
      averageScore: number;
      highestFeature: string;
      unit: string;
    };
  };
  sciTotals: SciTotals;
  history: HistoryEntry[];
}

export interface Feature {
  id: string;
  name: string;
  files: string[];
  dependencies: string[];
  metrics: {
    loc: number;
    dependencyCount: number;
    cyclomaticComplexity: number;
    complexityScore: number;
  };
  sustainability: {
    electricityKwh: number;
    carbonKgCo2e: number;
    isEstimated: boolean;
    infrastructureTag: string | null;
    sci: {
      score: number;
      unit: string;
      components: {
        E_per_R: number;
        I: number;
        M_per_R: number;
      };
      functionalUnit: string;
    };
  };
  sci: SciMetrics;
  sustainabilityTier: 'high' | 'medium' | 'low';
  suggestions: Suggestion[];
}

export interface Suggestion {
  id: string;
  status: 'suggested' | 'applied' | 'dismissed';
  patternType: 'POLLING' | 'N_PLUS_ONE' | 'SYNC_BLOCKING';
  location: string;
  explanation: string;
  estimatedSavingsPercent: number;
  currentCode: string;
  suggestedFileChanges: { filePath: string; newContent: string }[];
}

export interface HistoryEntry {
  appliedAt: string;
  featureId: string;
  featureName: string;
  suggestionId: string;
  patternType: string;
  savingsElectricityKwh: number;
  savingsCarbonKgCo2e: number;
  savingsSciGco2PerR: number;
}

export type DependencyGraph = Record<string, string[]>;

export interface CoChangeCluster {
  files: string[];
  strength: number;
}

export interface SSEEvent {
  event: 'progress' | 'complete' | 'error';
  data: Record<string, unknown>;
}

export interface DetectedPattern {
  patternType: 'POLLING' | 'N_PLUS_ONE' | 'SYNC_BLOCKING';
  location: string;
  currentCode: string;
  explanation: string;
  estimatedSavingsPercent: number;
}

export interface SustainabilityPrediction {
  electricityKwh: number;
  carbonKgCo2e: number;
  sci: {
    score: number;
    unit: string;
    components: { E_per_R: number; I: number; M_per_R: number };
    functionalUnit: string;
  };
  isEstimated: true;
  isPredicted: true;
}

export interface FeaturePrediction {
  featureName: string;
  description: string;
  predictedComplexityScore: number;
  sustainability: SustainabilityPrediction;
  identifiedPatterns: ('POLLING' | 'N_PLUS_ONE' | 'SYNC_BLOCKING')[];
  patternExplanation: string;
  greenerAlternative: {
    featureName: string;
    description: string;
    predictedComplexityScore: number;
    sustainability: SustainabilityPrediction;
    codeSkeleton: string;
  };
  savingsPercent: number;
}
