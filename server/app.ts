import express from 'express';
import { registerMiddleware } from './middleware';
import { errorHandler } from './middleware/error';
import { registerRoutes } from './routes';

export function createApp() {
  const app = express();
  registerMiddleware(app);
  registerRoutes(app);

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'API route not found' });
  });

  app.use(errorHandler);

  return app;
}
