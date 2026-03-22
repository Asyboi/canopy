import express from 'express';
import cors from 'cors';
import path from 'path';
import { createAnalyzeRouter } from './routes/analyze';
import { createResultsRouter } from './routes/results';

export function createApp(): express.Application {
  const app = express();

  app.use(cors({
    origin: '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
  }));
  app.use(express.json());

  app.use(createAnalyzeRouter());
  app.use(createResultsRouter());

  // Serve the built dashboard (canopy/dashboard/dist)
  const dashboardDist = path.join(__dirname, '..', '..', '..', 'dashboard', 'dist');
  app.use(express.static(dashboardDist));
  app.get('/', (_req, res) => {
    res.sendFile(path.join(dashboardDist, 'index.html'));
  });

  return app;
}
