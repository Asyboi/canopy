import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { addClient, broadcast, clearBuffer } from '../utils/sse';
import { runPipeline } from '../pipeline/runner';
import { validateWorkspacePath } from './results';

const analyzingWorkspaces = new Set<string>();

export function createAnalyzeRouter(): Router {
  const router = Router();

  router.post('/analyze', async (req: Request, res: Response) => {
    const { workspacePath } = req.body;

    const error = validateWorkspacePath(workspacePath);
    if (error) {
      return res.status(400).json({ error });
    }

    if (analyzingWorkspaces.has(workspacePath)) {
      return res.status(409).json({
        status: 'busy',
        message: 'Analysis already in progress for this workspace',
      });
    }

    analyzingWorkspaces.add(workspacePath);
    try {
      const result = await runPipeline(workspacePath);

      const canopyDir = path.join(workspacePath, '.canopy');
      fs.mkdirSync(canopyDir, { recursive: true });
      fs.writeFileSync(
        path.join(canopyDir, 'analysis.json'),
        JSON.stringify(result, null, 2)
      );

      broadcast(workspacePath, 'complete', { features: result.features });

      return res.json({ status: 'complete', features: result.features });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      broadcast(workspacePath, 'error', { message });
      return res.status(500).json({ error: message });
    } finally {
      analyzingWorkspaces.delete(workspacePath);
      clearBuffer(workspacePath);
    }
  });

  router.get('/analyze-stream', (req: Request, res: Response) => {
    const workspacePath = req.query.workspacePath as string | undefined;

    const error = validateWorkspacePath(workspacePath);
    if (error) {
      return res.status(400).json({ error });
    }

    addClient(workspacePath!, res);
  });

  return router;
}

export function isAnalyzing(workspacePath: string): boolean {
  return analyzingWorkspaces.has(workspacePath);
}
