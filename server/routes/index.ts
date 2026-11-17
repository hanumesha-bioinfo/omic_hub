import type { Application } from 'express';
import { aiRouter } from './ai';
import { orderRouter } from './payments';
import { recruiterRouter } from './recruiter';

export function registerRoutes(app: Application) {
  app.use(aiRouter);
  app.use(recruiterRouter);
  app.use('/api/payments', orderRouter);
}
