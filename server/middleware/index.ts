import express, { type Application, type Request } from 'express';

/** Request with the untouched JSON payload needed for webhook HMAC verification. */
export interface RawBodyRequest extends Request {
  rawBody?: string;
}

export function registerMiddleware(app: Application) {
  app.use(
    express.json({
      limit: '10mb',
      verify: (req, _res, buf) => {
        (req as RawBodyRequest).rawBody = buf.toString('utf8');
      },
    }),
  );
}
