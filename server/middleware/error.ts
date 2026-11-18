import type { NextFunction, Request, Response } from 'express';

interface HttpError {
  status?: unknown;
  statusCode?: unknown;
}

function clientStatus(err: unknown): number | null {
  if (typeof err !== 'object' || err === null) return null;
  const candidate = (err as HttpError).status ?? (err as HttpError).statusCode;
  if (typeof candidate !== 'number' || !Number.isInteger(candidate)) return null;
  // Only trust explicit 4xx/5xx statuses set by middleware (e.g. body-parser
  // uses 400 for malformed JSON and 413 for oversized bodies). Never turn an
  // arbitrary value into a response status.
  return candidate >= 400 && candidate <= 599 ? candidate : null;
}

export function errorHandler(err: unknown, _req: Request, res: Response, next: NextFunction): void {
  console.error('Unhandled request error', err);
  if (res.headersSent) {
    next(err);
    return;
  }
  const status = clientStatus(err);
  if (status !== null && status < 500) {
    const message = status === 413 ? 'Payload too large' : 'Bad request';
    res.status(status).json({ error: message });
    return;
  }
  res.status(500).json({ error: 'Internal server error' });
}
