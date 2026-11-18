import type { Request, RequestHandler } from 'express';

export interface RateLimiterOptions {
  windowMs: number;
  max: number;
  key: (req: Request) => string;
  now?: () => number;
}

/**
 * Drop buckets whose timestamps have all aged out of the window, keeping only
 * recent hits. Runs as a periodic sweep so stale user/IP keys cannot grow the
 * map without bound over the lifetime of the process.
 */
export function pruneExpiredBuckets(
  hits: Map<string, number[]>,
  current: number,
  windowMs: number,
): void {
  const cutoff = current - windowMs;
  for (const [bucket, timestamps] of hits) {
    const recent = timestamps.filter((t) => t > cutoff);
    if (recent.length === 0) {
      hits.delete(bucket);
    } else if (recent.length !== timestamps.length) {
      hits.set(bucket, recent);
    }
  }
}

export function createRateLimiter({
  windowMs,
  max,
  key,
  now = () => Date.now(),
}: RateLimiterOptions): RequestHandler {
  const hits = new Map<string, number[]>();
  let lastSweep = now();

  return (req, res, next) => {
    const current = now();
    // Bound both memory (stale keys) and CPU (sweep at most once per window).
    if (current - lastSweep >= windowMs) {
      pruneExpiredBuckets(hits, current, windowMs);
      lastSweep = current;
    }

    const bucket = key(req);
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
