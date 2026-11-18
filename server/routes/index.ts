import type { Application } from 'express';
import { accountRouter } from './account';
import { aiRouter } from './ai';
import { certificateRouter } from './certificates';
import { orderRouter } from './payments';
import { recruiterRouter } from './recruiter';

export function registerRoutes(app: Application) {
  app.use(aiRouter);
  app.use(certificateRouter);
  app.use(recruiterRouter);
  app.use('/api/account', accountRouter);
  app.use('/api/payments', orderRouter);
}
