import express from 'express';
import cors from 'cors';
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

  return app;
}
