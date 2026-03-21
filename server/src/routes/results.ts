import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { AnalysisResult, Feature } from '../types';

export function validateWorkspacePath(workspacePath: string | undefined): string | null {
  if (!workspacePath) {
    return 'workspacePath is required';
  }
  if (!path.isAbsolute(workspacePath)) {
    return 'workspacePath must be an absolute path';
  }
  return null;
}

function readAnalysis(workspacePath: string): AnalysisResult | null {
  const filePath = path.join(workspacePath, '.canopy', 'analysis.json');
  try {
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data) as AnalysisResult;
  } catch {
    return null;
  }
}

function writeAnalysis(workspacePath: string, analysis: AnalysisResult): void {
  const filePath = path.join(workspacePath, '.canopy', 'analysis.json');
  fs.writeFileSync(filePath, JSON.stringify(analysis, null, 2));
}

export function createResultsRouter(): Router {
  const router = Router();

  router.get('/results', (req: Request, res: Response) => {
    const workspacePath = req.query.workspacePath as string | undefined;
    const error = validateWorkspacePath(workspacePath);
    if (error) {
      return res.status(400).json({ error });
    }

    const analysis = readAnalysis(workspacePath!);
    if (!analysis) {
      return res.status(404).json({ error: 'No analysis found' });
    }
    return res.json(analysis);
  });

  router.post('/apply-suggestion', (req: Request, res: Response) => {
    const { workspacePath, featureId, suggestionId } = req.body;
    const error = validateWorkspacePath(workspacePath);
    if (error) {
      return res.status(400).json({ error });
    }

    const analysis = readAnalysis(workspacePath);
    if (!analysis) {
      return res.status(404).json({ error: 'No analysis found' });
    }

    const feature = analysis.features.find((f) => f.id === featureId);
    if (!feature) {
      return res.status(404).json({ error: 'Feature not found' });
    }

    const suggestion = feature.suggestions.find((s) => s.id === suggestionId);
    if (!suggestion) {
      return res.status(404).json({ error: 'Suggestion not found' });
    }

    return res.json({
      files: suggestion.suggestedFileChanges.map((fc) => ({
        path: fc.filePath,
        newContent: fc.newContent,
      })),
    });
  });

  router.post('/mark-applied', (req: Request, res: Response) => {
    const { workspacePath, featureId, suggestionId } = req.body;
    const error = validateWorkspacePath(workspacePath);
    if (error) {
      return res.status(400).json({ error });
    }

    const analysis = readAnalysis(workspacePath);
    if (!analysis) {
      return res.status(404).json({ error: 'No analysis found' });
    }

    const feature = analysis.features.find((f) => f.id === featureId);
    if (!feature) {
      return res.status(404).json({ error: 'Feature not found' });
    }

    const suggestion = feature.suggestions.find((s) => s.id === suggestionId);
    if (!suggestion) {
      return res.status(404).json({ error: 'Suggestion not found' });
    }

    suggestion.status = 'applied';

    const savingsPercent = suggestion.estimatedSavingsPercent / 100;
    const savingsElectricity = feature.sustainability.electricityKwh * savingsPercent;
    const savingsCarbon = feature.sustainability.carbonKgCo2e * savingsPercent;

    feature.sustainability.electricityKwh -= savingsElectricity;
    feature.sustainability.carbonKgCo2e -= savingsCarbon;

    analysis.totals.electricityKwh -= savingsElectricity;
    analysis.totals.carbonKgCo2e -= savingsCarbon;

    // savingsPercent is already a decimal (e.g. 0.61), so reduction = 1 - 0.61 = 0.39
    const reduction = 1 - savingsPercent;
    feature.sustainability.sci.score *= reduction;
    feature.sustainability.sci.components.E_per_R *= reduction;
    // I and M_per_R remain unchanged — only E changes when code efficiency improves

    const sciScores = analysis.features.map((f) => f.sustainability.sci.score);
    analysis.totals.sci.averageScore = sciScores.reduce((a, b) => a + b, 0) / sciScores.length;

    analysis.history.push({
      appliedAt: new Date().toISOString(),
      featureId,
      featureName: feature.name,
      suggestionId,
      patternType: suggestion.patternType,
      savingsElectricityKwh: savingsElectricity,
      savingsCarbonKgCo2e: savingsCarbon,
    });

    writeAnalysis(workspacePath, analysis);
    return res.json({ status: 'ok', updatedFeature: feature });
  });

  router.post('/dismiss-suggestion', (req: Request, res: Response) => {
    const { workspacePath, featureId, suggestionId } = req.body;
    const error = validateWorkspacePath(workspacePath);
    if (error) {
      return res.status(400).json({ error });
    }

    const analysis = readAnalysis(workspacePath);
    if (!analysis) {
      return res.status(404).json({ error: 'No analysis found' });
    }

    const feature = analysis.features.find((f) => f.id === featureId);
    if (!feature) {
      return res.status(404).json({ error: 'Feature not found' });
    }

    const suggestion = feature.suggestions.find((s) => s.id === suggestionId);
    if (!suggestion) {
      return res.status(404).json({ error: 'Suggestion not found' });
    }

    suggestion.status = 'dismissed';
    writeAnalysis(workspacePath, analysis);
    return res.json({ status: 'ok' });
  });

  return router;
}
