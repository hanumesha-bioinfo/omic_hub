import express from 'express';
import { registerMiddleware } from './middleware';
import { registerRoutes } from './routes';

export function createApp() {
  const app = express();
  registerMiddleware(app);
  registerRoutes(app);

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'API route not found' });
  });

  return app;
}
