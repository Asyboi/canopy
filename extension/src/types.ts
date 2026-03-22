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
  history: HistoryEntry[];
}

export interface Feature {
  id: string;
  name: string;
  files: string[];
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
}

export interface FileChange {
  path: string;
  newContent: string;
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
