import type { Request, RequestHandler } from 'express';

export interface RateLimiterOptions {
  windowMs: number;
  max: number;
  key: (req: Request) => string;
  now?: () => number;
}

export function createRateLimiter({
  windowMs,
  max,
  key,
  now = () => Date.now(),
}: RateLimiterOptions): RequestHandler {
  const hits = new Map<string, number[]>();

  return (req, res, next) => {
    const bucket = key(req);
    const current = now();
    const timestamps = (hits.get(bucket) ?? []).filter((t) => t > current - windowMs);

    if (timestamps.length >= max) {
      const retryAfter = Math.max(
        1,
        Math.ceil((timestamps[0] + windowMs - current) / 1000),
      );
      res.set('Retry-After', String(retryAfter));
      res.status(429).json({ error: 'Too many requests' });
      return;
    }

    timestamps.push(current);
    hits.set(bucket, timestamps);
    next();
  };
}
