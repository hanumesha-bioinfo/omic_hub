import express, { type Application } from 'express';

export function registerMiddleware(app: Application) {
  app.use(express.json({ limit: '10mb' }));
}
