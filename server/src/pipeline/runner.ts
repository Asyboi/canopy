import path from 'path';
import fs from 'fs';
import { AnalysisResult, HistoryEntry } from '../types';
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

function loadExistingHistory(workspacePath: string): HistoryEntry[] {
  try {
    const analysisPath = path.join(workspacePath, '.canopy', 'analysis.json');
    const existing = JSON.parse(fs.readFileSync(analysisPath, 'utf-8')) as AnalysisResult;
    return existing.history ?? [];
  } catch {
    return [];
  }
}

export async function runPipeline(
  workspacePath: string
): Promise<AnalysisResult> {
  // Preserve history from previous analysis so re-analyze doesn't wipe it
  const existingHistory = loadExistingHistory(workspacePath);

  // Step 1 — Static analysis
  emitProgress(workspacePath, 1, 'Analyzing dependencies...', 10);
  const depGraph = await runStaticAnalysis(workspacePath);

  // Step 2 — Git co-change clustering
  emitProgress(workspacePath, 2, 'Clustering features...', 25);
  const coChangeClusters = await runGitClustering(workspacePath);

  // Step 3 — Cluster merging
  emitProgress(workspacePath, 3, 'Merging clusters...', 40);
  const features = mergeClusters(depGraph, coChangeClusters);

  // Step 4 — Feature labeling with Gemini
  emitProgress(workspacePath, 4, 'Labeling features with Gemini...', 55);
  await labelFeatures(features, depGraph);

  // Step 5 — Complexity scoring
  emitProgress(workspacePath, 5, 'Scoring complexity...', 65);
  scoreComplexity(features, depGraph, workspacePath);

  // Step 6 — Sustainability + SCI estimates
  emitProgress(workspacePath, 6, 'Calculating SCI estimates...', 75);
  const sciTotals = calculateSustainability(features);

  // Step 7+8 — Pattern detection + suggestion generation
  emitProgress(workspacePath, 7, 'Detecting inefficiency patterns...', 85);
  await detectAndSuggest(features, workspacePath);

  // Build legacy totals
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
  totals.electricityKwh = parseFloat(totals.electricityKwh.toFixed(4));
  totals.waterLiters = parseFloat(totals.waterLiters.toFixed(4));
  totals.carbonKgCo2e = parseFloat(totals.carbonKgCo2e.toFixed(4));

  return {
    generatedAt: new Date().toISOString(),
    workspacePath,
    features,
    totals,
    sciTotals,
    history: existingHistory,
  };
}
