import { Router, Request, Response } from 'express';
import { validateWorkspacePath } from './results';
import { predictFeature } from '../pipeline/featurePrediction';

export function createPredictRouter(): Router {
  const router = Router();

  router.post('/predict-feature', async (req: Request, res: Response) => {
    const { workspacePath, description } = req.body;

    const pathError = validateWorkspacePath(workspacePath);
    if (pathError) {
      return res.status(400).json({ error: pathError });
    }

    if (!description || typeof description !== 'string' || description.trim() === '') {
      return res.status(400).json({ error: 'description is required' });
    }

    try {
      const prediction = await predictFeature(workspacePath, description.trim());
      return res.json({ prediction });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message === 'GEMINI_UNAVAILABLE') {
        return res.status(503).json({ error: 'Prediction service unavailable' });
      }
      return res.status(500).json({ error: 'Prediction failed — invalid response from Gemini' });
    }
  });

  return router;
}
