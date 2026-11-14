import type { Application } from 'express';
import { aiRouter } from './ai';

export function registerRoutes(app: Application) {
  app.use(aiRouter);
}
