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
