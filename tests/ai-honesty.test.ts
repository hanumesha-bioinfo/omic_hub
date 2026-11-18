import assert from 'node:assert/strict';
import express from 'express';
import test from 'node:test';
import { generateAIResponse } from '../server/ai/client';
import { createAiRouter } from '../server/routes/ai';

function allowAuth(req: any, _res: any, next: any) {
  req.auth = { userId: 'u-honesty', role: 'student', profile: {} };
  next();
}

async function withAi(run: (base: string) => Promise<void>) {
  const app = express();
  app.use(express.json());
  app.use(createAiRouter({ requireAuth: allowAuth, rateLimiters: [] }));
  const server = app.listen(0);
  try {
    await run(`http://127.0.0.1:${(server.address() as { port: number }).port}`);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

function post(base: string, path: string, body: unknown) {
  return fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

test('server fallbacks are marked and carry no fake grounding', async () => {
  await withAi(async (base) => {
    const chat = await (await post(base, '/api/ai/chat', { messages: [{ role: 'user', text: 'hi' }] })).json() as any;
    assert.equal(chat.isFallback, true);

    const search = await (await post(base, '/api/ai/search-grounding', { query: 'x' })).json() as any;
    assert.equal(search.isFallback, true);
    assert.equal(search.grounded, false);
    assert.deepEqual(search.sources, []);
    assert.equal(search.searchEntryPoint, null);
    assert.ok(!JSON.stringify(search).includes('nature.com'));

    const voice = await (await post(base, '/api/ai/voice-speak', { text: 'hi' })).json() as any;
    assert.equal(voice.isFallback, true);
    assert.equal(voice.audio, null);
    assert.equal(voice.message, 'Speech synthesis unavailable');
  });
});

test('generateAIResponse marks fallback output', async () => {
  const result = await generateAIResponse('prompt', () => ({ score: 1 })) as any;
  assert.equal(result.isFallback, true);
});
