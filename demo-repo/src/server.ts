import express, { Request, Response, NextFunction } from 'express';
import { getUserFeed } from './feed';
import { generateWeeklyReport } from './reports';
import { login, refreshToken, logout } from './auth';
import { startNotificationWorker } from './notifications';

const app = express();
app.use(express.json());

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Feed
app.get('/feed/:userId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = parseInt(req.query['limit'] as string) || 20;
    const items = await getUserFeed(req.params['userId']!, limit);
    res.json(items);
  } catch (err) {
    next(err);
  }
});

// Reports
app.post('/reports/weekly/:teamId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filepath = await generateWeeklyReport(req.params['teamId']!);
    res.json({ filepath });
  } catch (err) {
    next(err);
  }
});

// Auth
app.post('/auth/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await login(req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

app.post('/auth/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken: token } = req.body;
    const result = await refreshToken(token);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

app.post('/auth/logout', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken: token } = req.body;
    await logout(token);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// Error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: err.message });
});

const PORT = parseInt(process.env.PORT || '3000');

app.listen(PORT, () => {
  console.log(`Taskly API listening on port ${PORT}`);
  startNotificationWorker();
});

export default app;
