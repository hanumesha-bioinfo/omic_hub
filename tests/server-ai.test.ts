import assert from 'node:assert/strict';
import express from 'express';
import test from 'node:test';
import { asyncHandler } from '../server/lib/asyncHandler';
import { errorHandler } from '../server/middleware/error';
import { createRateLimiter } from '../server/middleware/rateLimit';
import { firstInvalidField } from '../server/middleware/validate';

async function withServer(handler: express.RequestHandler, run: (base: string) => Promise<void>) {
  const app = express();
  app.get('/boom', handler);
  app.use(errorHandler);
  const server = app.listen(0);
  try {
    await run(`http://127.0.0.1:${(server.address() as { port: number }).port}`);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

test('an async handler rejection becomes a 500 through errorHandler', async () => {
  const errors: unknown[][] = [];
  const original = console.error;
  console.error = (...args: unknown[]) => { errors.push(args); };

  await withServer(asyncHandler(async () => { throw new Error('gemini exploded'); }), async (base) => {
    const response = await fetch(`${base}/boom`);
    assert.equal(response.status, 500);
    assert.deepEqual(await response.json(), { error: 'Internal server error' });
  });

  console.error = original;
  assert.ok(errors.length >= 1);
});

async function withLimitedServer(limiter: express.RequestHandler, run: (base: string) => Promise<void>) {
  const app = express();
  app.get('/limited', limiter, (_req, res) => { res.status(200).json({ ok: true }); });
  const server = app.listen(0);
  try {
    await run(`http://127.0.0.1:${(server.address() as { port: number }).port}`);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

test('rate limiter returns 429 with Retry-After after max requests in the window', async () => {
  let clock = 1_000;
  const limiter = createRateLimiter({
    windowMs: 60_000,
    max: 2,
    key: (req) => String(req.query.user),
    now: () => clock,
  });

  await withLimitedServer(limiter, async (base) => {
    assert.equal((await fetch(`${base}/limited?user=a`)).status, 200);
    assert.equal((await fetch(`${base}/limited?user=a`)).status, 200);
    const blocked = await fetch(`${base}/limited?user=a`);
    assert.equal(blocked.status, 429);
    assert.deepEqual(await blocked.json(), { error: 'Too many requests' });
    assert.ok(Number(blocked.headers.get('retry-after')) >= 1);
    assert.equal((await fetch(`${base}/limited?user=b`)).status, 200);
    clock += 60_001;
    assert.equal((await fetch(`${base}/limited?user=a`)).status, 200);
  });
});

test('firstInvalidField rejects wrong types, overlength strings and bad message items', () => {
  assert.equal(firstInvalidField({ text: 'ok', role: 'dev' }, {
    text: { type: 'string', required: true, maxLength: 40 },
    role: { type: 'string', maxLength: 40 },
  }), null);
  assert.equal(firstInvalidField({ text: 42 }, {
    text: { type: 'string', required: true, maxLength: 40 },
  }), 'text');
  assert.equal(firstInvalidField({ text: 'x'.repeat(41) }, {
    text: { type: 'string', required: true, maxLength: 40 },
  }), 'text');
  assert.equal(firstInvalidField({ completedSkills: {} }, {
    completedSkills: { type: 'array', maxItems: 20, item: 'string' },
  }), 'completedSkills');
  assert.equal(firstInvalidField({ messages: [{ role: 'user', text: 7 }] }, {
    messages: { type: 'array', required: true, maxItems: 20, item: 'message' },
  }), 'messages');
  assert.equal(firstInvalidField(null, {
    text: { type: 'string', required: true, maxLength: 40 },
  }), 'text');
});
