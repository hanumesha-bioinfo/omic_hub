import assert from 'node:assert/strict';
import express from 'express';
import test from 'node:test';
import { asyncHandler } from '../server/lib/asyncHandler';
import { errorHandler } from '../server/middleware/error';

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
