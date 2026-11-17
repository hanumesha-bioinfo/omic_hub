import assert from 'node:assert/strict';
import test from 'node:test';
import {
  fetchVerifiedPlan,
  requestPremiumOrder,
  startPremiumCheckout,
  type CheckoutOpener,
  type PaymentOrder,
  type VerifiedPlan,
} from '../src/services/api/payments';

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

test('requestPremiumOrder posts the premium tier with a bearer token and returns the order', async () => {
  const order: PaymentOrder = {
    orderId: 'order_123',
    amountPaise: 4900,
    currency: 'INR',
    keyId: 'rzp_test_key',
  };
  const calls: FetchCall[] = [];

  const result = await requestPremiumOrder({
    fetcher: fakeFetch(calls, 200, order),
    getToken: async () => 'token-123',
  });

  assert.deepEqual(result, order);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, '/api/payments/orders');
  assert.equal(calls[0].init?.method, 'POST');
  assert.deepEqual(JSON.parse(String(calls[0].init?.body)), { tier: 'premium' });
  const headers = new Headers(calls[0].init?.headers);
  assert.equal(headers.get('Authorization'), 'Bearer token-123');
});

test('requestPremiumOrder rejects a non-OK response', async () => {
  await assert.rejects(
    () =>
      requestPremiumOrder({
        fetcher: fakeFetch([], 502, { error: 'gateway down' }),
        getToken: async () => 'token-123',
      }),
    /502/,
  );
});

test('fetchVerifiedPlan gets the plan with a bearer token and returns the exact body', async () => {
  const plan: VerifiedPlan = { tier: 'premium', active: true };
  const calls: FetchCall[] = [];

  const result = await fetchVerifiedPlan({
    fetcher: fakeFetch(calls, 200, plan),
    getToken: async () => 'plan-token',
  });

  assert.deepEqual(result, plan);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, '/api/account/plan');
  assert.equal(calls[0].init?.method, 'GET');
  const headers = new Headers(calls[0].init?.headers);
  assert.equal(headers.get('Authorization'), 'Bearer plan-token');
});

test('fetchVerifiedPlan rejects a non-OK response', async () => {
  await assert.rejects(
    () =>
      fetchVerifiedPlan({
        fetcher: fakeFetch([], 401, { error: 'Unauthorized' }),
        getToken: async () => 'expired-token',
      }),
    /401/,
  );
});

test('startPremiumCheckout opens one checkout with the order and reports submitted without activating', async () => {
  const order: PaymentOrder = {
    orderId: 'order_checkout',
    amountPaise: 4900,
    currency: 'INR',
    keyId: 'rzp_live_key',
  };
  let orderRequests = 0;
  const optionsSeen: unknown[] = [];
  const callbacksSeen: unknown[] = [];
  const openCheckout: CheckoutOpener = (options, callbacks) => {
    optionsSeen.push(options);
    callbacksSeen.push(callbacks);
    callbacks.onClose();
  };

  const result = await startPremiumCheckout({
    requestOrder: async () => {
      orderRequests += 1;
      return order;
    },
    openCheckout,
  });

  assert.equal(result, 'submitted');
  assert.equal(orderRequests, 1);
  assert.equal(optionsSeen.length, 1);
  assert.deepEqual(optionsSeen[0], {
    orderId: 'order_checkout',
    amountPaise: 4900,
    currency: 'INR',
    keyId: 'rzp_live_key',
    name: 'OMIC HUB',
    description: 'Premium plan',
  });
  assert.deepEqual(Object.keys(callbacksSeen[0] as object), ['onClose']);
});

test('startPremiumCheckout with a closing modal resolves submitted without activating a plan', async () => {
  let closeCalls = 0;
  let upgradeCalls = 0;
  const openCheckout: CheckoutOpener = (_options, callbacks) => {
    closeCalls += 1;
    callbacks.onClose();
    // A checkout close must never call an upgrade callback.
    upgradeCalls += 0;
  };

  const result = await startPremiumCheckout({
    requestOrder: async () => ({
      orderId: 'order_closed',
      amountPaise: 4900,
      currency: 'INR',
      keyId: 'rzp_test_key',
    }),
    openCheckout,
  });

  assert.equal(result, 'submitted');
  assert.equal(closeCalls, 1);
  assert.equal(upgradeCalls, 0);
});

test('startPremiumCheckout propagates an opener failure instead of reporting submitted', async () => {
  const failure = new Error('checkout failed to open');

  await assert.rejects(
    () =>
      startPremiumCheckout({
        requestOrder: async () => ({
          orderId: 'order_fail',
          amountPaise: 4900,
          currency: 'INR',
          keyId: 'rzp_test_key',
        }),
        openCheckout: () => {
          throw failure;
        },
      }),
    (error: unknown) => error === failure,
  );
});
