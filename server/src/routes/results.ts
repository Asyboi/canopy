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
    const { workspacePath, featureId, suggestionId, files } = req.body as {
      workspacePath: string;
      featureId: string;
      suggestionId: string;
      files?: { path: string; newContent: string }[];
    };
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

    // Idempotent: skip if already applied
    if (suggestion.status === 'applied') {
      return res.json({ status: 'ok', updatedFeature: feature });
    }

    // Write suggested file changes to disk (safe: paths must stay inside workspacePath)
    if (files && files.length > 0) {
      const resolvedWorkspace = path.resolve(workspacePath);
      for (const file of files) {
        const resolvedFile = path.resolve(workspacePath, file.path);
        if (!resolvedFile.startsWith(resolvedWorkspace + path.sep) &&
            resolvedFile !== resolvedWorkspace) {
          return res.status(400).json({ error: `Path escape detected: ${file.path}` });
        }
        // Backup original before overwriting
        try {
          const backupDir = path.join(workspacePath, '.canopy', 'backups');
          fs.mkdirSync(backupDir, { recursive: true });
          const backupName = file.path.replace(/[/\\]/g, '_') + `.${Date.now()}.bak`;
          if (fs.existsSync(resolvedFile)) {
            fs.copyFileSync(resolvedFile, path.join(backupDir, backupName));
          }
        } catch {
          // Backup failure is non-fatal
        }
        fs.mkdirSync(path.dirname(resolvedFile), { recursive: true });
        fs.writeFileSync(resolvedFile, file.newContent, 'utf-8');
      }
    }

    suggestion.status = 'applied';

    const savingsPercent = suggestion.estimatedSavingsPercent / 100;
    const savingsElectricity = feature.sustainability.electricityKwh * savingsPercent;
    const savingsWater = feature.sustainability.waterLiters * savingsPercent;
    const savingsCarbon = feature.sustainability.carbonKgCo2e * savingsPercent;
    const savingsSci = feature.sci ? feature.sci.sciGco2PerR * savingsPercent : 0;

    feature.sustainability.electricityKwh -= savingsElectricity;
    feature.sustainability.waterLiters -= savingsWater;
    feature.sustainability.carbonKgCo2e -= savingsCarbon;
    if (feature.sci) {
      feature.sci.sciGco2PerR = parseFloat((feature.sci.sciGco2PerR - savingsSci).toFixed(2));
    }

    analysis.totals.electricityKwh -= savingsElectricity;
    analysis.totals.waterLiters -= savingsWater;
    analysis.totals.carbonKgCo2e -= savingsCarbon;
    if (analysis.sciTotals) {
      analysis.sciTotals.sciGco2PerR = parseFloat(
        (analysis.sciTotals.sciGco2PerR - savingsSci).toFixed(2)
      );
    }

    analysis.history.push({
      appliedAt: new Date().toISOString(),
      featureId,
      featureName: feature.name,
      suggestionId,
      patternType: suggestion.patternType,
      savingsElectricityKwh: savingsElectricity,
      savingsWaterLiters: savingsWater,
      savingsCarbonKgCo2e: savingsCarbon,
      savingsSciGco2PerR: savingsSci,
    });

    writeAnalysis(workspacePath, analysis);
    return res.json({ status: 'ok', updatedFeature: feature, filesWritten: (files ?? []).length });
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
