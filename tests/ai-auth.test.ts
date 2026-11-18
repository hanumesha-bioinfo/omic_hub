import assert from 'node:assert/strict';
import test from 'node:test';
import { postAi, postAiOrNull } from '../src/services/api/ai';

interface FetchCall {
  url: string;
  init?: RequestInit;
}

function fakeFetch(calls: FetchCall[], status: number, body: unknown): typeof fetch {
  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(input), init });
    return new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  }) as typeof fetch;
}

test('postAi attaches the Supabase bearer token to AI requests', async () => {
  const calls: FetchCall[] = [];

  const result = await postAi<{ ok: boolean }>('/api/ai/chat', { messages: [] }, undefined, {
    fetcher: fakeFetch(calls, 200, { ok: true }),
    getToken: async () => 'ai-token-123',
  });

  assert.deepEqual(result, { ok: true });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, '/api/ai/chat');
  assert.equal(calls[0].init?.method, 'POST');
  const headers = new Headers(calls[0].init?.headers);
  assert.equal(headers.get('Content-Type'), 'application/json');
  assert.equal(headers.get('Authorization'), 'Bearer ai-token-123');
  assert.deepEqual(JSON.parse(String(calls[0].init?.body)), { messages: [] });
});

test('postAiOrNull attaches the bearer token and returns null on an API error', async () => {
  const calls: FetchCall[] = [];
  const failing: typeof fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(input), init });
    return new Response('', { status: 401 });
  }) as typeof fetch;

  const result = await postAiOrNull('/api/ai/voice-speak', { text: 'hi' }, {
    fetcher: failing,
    getToken: async () => 'voice-token',
  });

  assert.equal(result, null);
  assert.equal(calls.length, 1);
  const headers = new Headers(calls[0].init?.headers);
  assert.equal(headers.get('Authorization'), 'Bearer voice-token');
});

test('postAi sends an empty bearer when no session token is available', async () => {
  const calls: FetchCall[] = [];

  await postAi('/api/ai/skills-recommend', {}, undefined, {
    fetcher: fakeFetch(calls, 200, {}),
    getToken: async () => null,
  });

  assert.equal(calls.length, 1);
  const headers = new Headers(calls[0].init?.headers);
  assert.equal(headers.get('Authorization'), 'Bearer');
});
