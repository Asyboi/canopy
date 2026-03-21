import { AnalysisResult } from '../types';
import { broadcast } from '../utils/sse';
import { runStaticAnalysis } from './staticAnalysis';
import { runGitClustering } from './gitClustering';
import { mergeClusters } from './clusterMerge';
import { labelFeatures } from './featureLabeling';
import { scoreComplexity } from './complexityScoring';
import { calculateSustainability } from './sustainability';
import { detectAndSuggest } from './patternDetection';

function emitProgress(
  workspacePath: string,
  step: number,
  message: string,
  percent: number
): void {
  broadcast(workspacePath, 'progress', { step, message, percent });
}

export async function runPipeline(
  workspacePath: string
): Promise<AnalysisResult> {
  // Step 1 — Static analysis
  emitProgress(workspacePath, 1, 'Analyzing dependencies...', 10);
  const depGraph = await runStaticAnalysis(workspacePath);

  // Step 2 — Git co-change clustering
  emitProgress(workspacePath, 2, 'Clustering features...', 25);
  const coChangeClusters = await runGitClustering(workspacePath);

  // Step 3 — Cluster merging
  emitProgress(workspacePath, 3, 'Scoring complexity...', 40);
  const features = mergeClusters(depGraph, coChangeClusters);

  // Step 4 — Feature labeling with Gemini
  emitProgress(workspacePath, 4, 'Labeling features with Gemini...', 55);
  await labelFeatures(features, depGraph);

  // Step 5 — Complexity scoring
  emitProgress(workspacePath, 5, 'Calculating sustainability estimates...', 65);
  scoreComplexity(features, depGraph, workspacePath);

  // Step 6 — Sustainability estimates
  calculateSustainability(features);

  // Step 7 — Pattern detection
  emitProgress(workspacePath, 6, 'Detecting inefficiency patterns...', 80);

  // Step 8 — Green suggestion generation (combined with step 7)
  emitProgress(workspacePath, 7, 'Generating green suggestions...', 92);
  await detectAndSuggest(features, workspacePath);

  // Build totals
  const totals = {
    electricityKwh: 0,
    waterLiters: 0,
    carbonKgCo2e: 0,
  };
  for (const feature of features) {
    totals.electricityKwh += feature.sustainability.electricityKwh;
    totals.waterLiters += feature.sustainability.waterLiters;
    totals.carbonKgCo2e += feature.sustainability.carbonKgCo2e;
  }

  return {
    generatedAt: new Date().toISOString(),
    workspacePath,
    features,
    totals,
    history: [],
  };
}
