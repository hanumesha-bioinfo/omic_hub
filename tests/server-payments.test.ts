import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import test from 'node:test';
import express, { type RequestHandler, type Router } from 'express';
import {
  RAZORPAY_KEY_ID,
  RAZORPAY_KEY_SECRET,
  SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_URL,
} from '../server/config';
import { razorpayClient, type RazorpayOrdersClient } from '../server/lib/razorpay';
import {
  createPlanStore,
  planStore,
  type CreateOrderRow,
  type Entitlement,
  type PlanOrder,
  type PlanStore,
  type SupabaseTableClient,
  type UpsertEntitlementRow,
} from '../server/lib/serverAdmin';
import { accountRouter, createAccountRouter } from '../server/routes/account';
import {
  createOrderRouter,
  createWebhookHandler,
  orderRouter,
  verifyWebhookSignature,
} from '../server/routes/payments';
import { type AuthenticatedRequest } from '../server/middleware/auth';
import { registerMiddleware, type RawBodyRequest } from '../server/middleware';

interface DbOrderRow {
  order_id: string;
  user_id: string;
  tier: string;
  amount_paise: number;
  currency: string;
  status: string;
  payment_id: string | null;
}

interface DbEntitlementRow {
  user_id: string;
  tier: string;
  status: string;
  order_id: string;
  payment_id: string;
}

type RecordedCall = Record<string, unknown>;

/** Fake Supabase table client that records every table/query/mutation call. */
function fakeSupabaseClient(options: {
  orderRow?: DbOrderRow | null;
  entitlementRow?: DbEntitlementRow | null;
  error?: { message: string } | null;
} = {}) {
  const calls: RecordedCall[] = [];
  const error = options.error ?? null;

  const client = {
    from(table: string) {
      calls.push({ op: 'from', table });
      return {
        select(columns: string) {
          calls.push({ op: 'select', columns });
          return {
            eq(column: string, value: string) {
              calls.push({ op: 'eq', column, value });
              return {
                async maybeSingle() {
                  calls.push({ op: 'maybeSingle' });
                  const data =
                    table === 'razorpay_orders'
                      ? (options.orderRow ?? null)
                      : (options.entitlementRow ?? null);
                  return { data, error };
                },
              };
            },
          };
        },
        insert(row: Record<string, unknown>) {
          calls.push({ op: 'insert', row });
          return Promise.resolve({ error });
        },
        update(values: Record<string, unknown>) {
          calls.push({ op: 'update', values });
          return {
            eq(column: string, value: string) {
              calls.push({ op: 'eq', column, value });
              return Promise.resolve({ error });
            },
          };
        },
        upsert(row: Record<string, unknown>) {
          calls.push({ op: 'upsert', row });
          return Promise.resolve({ error });
        },
      };
    },
  } as unknown as SupabaseTableClient;

  return { client, calls };
}

test('createOrder inserts the exact row into razorpay_orders', async () => {
  const { client, calls } = fakeSupabaseClient();

  await createPlanStore(client).createOrder({
    orderId: 'order_1',
    userId: 'uuid-1',
    tier: 'premium',
    amountPaise: 4900,
    currency: 'INR',
  });

  assert.deepEqual(calls, [
    { op: 'from', table: 'razorpay_orders' },
    {
      op: 'insert',
      row: {
        order_id: 'order_1',
        user_id: 'uuid-1',
        tier: 'premium',
        amount_paise: 4900,
        currency: 'INR',
      },
    },
  ]);
});

test('getOrder filters by order_id and returns the mapped row, or null when absent', async () => {
  const { client, calls } = fakeSupabaseClient({
    orderRow: {
      order_id: 'order_1',
      user_id: 'uuid-1',
      tier: 'premium',
      amount_paise: 4900,
      currency: 'INR',
      status: 'created',
      payment_id: null,
    },
  });

  const result = await createPlanStore(client).getOrder('order_1');

  assert.deepEqual(result, {
    orderId: 'order_1',
    userId: 'uuid-1',
    tier: 'premium',
    amountPaise: 4900,
    currency: 'INR',
    status: 'created',
  });
  assert.deepEqual(calls, [
    { op: 'from', table: 'razorpay_orders' },
    { op: 'select', columns: '*' },
    { op: 'eq', column: 'order_id', value: 'order_1' },
    { op: 'maybeSingle' },
  ]);

  const empty = fakeSupabaseClient();
  assert.equal(
    await createPlanStore(empty.client).getOrder('order_missing'),
    null,
  );
});

test('markOrderPaid sets status paid and payment_id for the order', async () => {
  const { client, calls } = fakeSupabaseClient();

  await createPlanStore(client).markOrderPaid('order_1', 'pay_1');

  assert.deepEqual(calls, [
    { op: 'from', table: 'razorpay_orders' },
    { op: 'update', values: { status: 'paid', payment_id: 'pay_1' } },
    { op: 'eq', column: 'order_id', value: 'order_1' },
  ]);
});

test('getEntitlement filters by user_id and returns tier/status, or null when absent', async () => {
  const { client, calls } = fakeSupabaseClient({
    entitlementRow: {
      user_id: 'uuid-1',
      tier: 'premium',
      status: 'active',
      order_id: 'order_1',
      payment_id: 'pay_1',
    },
  });

  const result = await createPlanStore(client).getEntitlement('uuid-1');

  assert.deepEqual(result, { tier: 'premium', status: 'active' });
  assert.deepEqual(calls, [
    { op: 'from', table: 'user_subscriptions' },
    { op: 'select', columns: '*' },
    { op: 'eq', column: 'user_id', value: 'uuid-1' },
    { op: 'maybeSingle' },
  ]);

  const empty = fakeSupabaseClient();
  assert.equal(
    await createPlanStore(empty.client).getEntitlement('uuid-missing'),
    null,
  );
});

test('upsertEntitlement writes the exact active entitlement row', async () => {
  const { client, calls } = fakeSupabaseClient();

  await createPlanStore(client).upsertEntitlement({
    userId: 'uuid-1',
    tier: 'premium',
    orderId: 'order_1',
    paymentId: 'pay_1',
  });

  assert.deepEqual(calls, [
    { op: 'from', table: 'user_subscriptions' },
    {
      op: 'upsert',
      row: {
        user_id: 'uuid-1',
        tier: 'premium',
        order_id: 'order_1',
        payment_id: 'pay_1',
        status: 'active',
      },
    },
  ]);
});

test('store methods throw when Supabase reports an error', async () => {
  const queryError = { message: 'permission denied' };
  const { client } = fakeSupabaseClient({ error: queryError });
  const store = createPlanStore(client);

  await assert.rejects(
    () => store.createOrder({
      orderId: 'order_1',
      userId: 'uuid-1',
      tier: 'premium',
      amountPaise: 4900,
      currency: 'INR',
    }),
    (error: unknown) => error === queryError,
  );
  await assert.rejects(
    () => store.getOrder('order_1'),
    (error: unknown) => error === queryError,
  );
  await assert.rejects(
    () => store.markOrderPaid('order_1', 'pay_1'),
    (error: unknown) => error === queryError,
  );
  await assert.rejects(
    () => store.getEntitlement('uuid-1'),
    (error: unknown) => error === queryError,
  );
  await assert.rejects(
    () => store.upsertEntitlement({
      userId: 'uuid-1',
      tier: 'premium',
      orderId: 'order_1',
      paymentId: 'pay_1',
    }),
    (error: unknown) => error === queryError,
  );
});

test('serverAdmin imports safely with empty env and only surfaces missing config on use', async () => {
  assert.equal(typeof planStore.createOrder, 'function');
  assert.equal(typeof planStore.getOrder, 'function');
  assert.equal(typeof planStore.markOrderPaid, 'function');
  assert.equal(typeof planStore.getEntitlement, 'function');
  assert.equal(typeof planStore.upsertEntitlement, 'function');

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    await assert.rejects(
      () => planStore.getEntitlement('uuid-1'),
      /Missing SUPABASE_URL \/ SUPABASE_SERVICE_ROLE_KEY/,
    );
  }
});

test('registerMiddleware captures the raw JSON body for webhook verification', async () => {
  const app = express();
  registerMiddleware(app);
  app.post('/echo', (req, res) => {
    res.json({
      rawBody: (req as RawBodyRequest).rawBody ?? null,
      parsed: req.body,
    });
  });

  const server = app.listen(0, '127.0.0.1');
  try {
    await new Promise<void>((resolve) => server.once('listening', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') {
      throw new Error('expected an ephemeral loopback TCP address');
    }
    const rawBody = '{"event":"payment.captured","payload":{"amount":4900}}';
    const response = await fetch(`http://127.0.0.1:${address.port}/echo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: rawBody,
    });

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      rawBody,
      parsed: JSON.parse(rawBody),
    });
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
});

interface FakeRazorpayCall {
  amount: number;
  currency: string;
  receipt: string;
  notes: Record<string, string>;
}

/** Fake Razorpay client that records every createOrder call and can fail on demand. */
function fakeRazorpay(options: { id?: string; error?: Error } = {}) {
  const calls: FakeRazorpayCall[] = [];
  const client: RazorpayOrdersClient = {
    async createOrder(input) {
      calls.push(input);
      if (options.error) throw options.error;
      return { id: options.id ?? 'order_fake' };
    },
  };
  return { client, calls };
}

/** Fake plan store that records persisted order rows and can fail on demand. */
function fakeStore(options: { createOrderError?: Error } = {}) {
  const rows: CreateOrderRow[] = [];
  const store: PlanStore = {
    async createOrder(row) {
      if (options.createOrderError) throw options.createOrderError;
      rows.push(row);
    },
    async getOrder() {
      return null;
    },
    async markOrderPaid() {},
    async getEntitlement() {
      return null;
    },
    async upsertEntitlement() {},
  };
  return { store, rows };
}

const allowAuth: RequestHandler = (req, _res, next) => {
  (req as AuthenticatedRequest).auth = {
    userId: 'uuid-1',
    role: 'student',
    profile: {
      id: 'uuid-1',
      full_name: 'Ada Lovelace',
      user_type: 'student',
      company_name: null,
    },
  };
  next();
};

const denyAuth: RequestHandler = (_req, res) => {
  res.status(401).json({ error: 'Unauthorized' });
};

/** Boots an order router at /api/payments on an ephemeral loopback port. */
async function withOrderRouter(
  router: Router,
  runRequest: (
    post: (body?: unknown) => Promise<{ status: number; body: unknown }>,
  ) => Promise<void>,
) {
  const app = express();
  app.use(express.json());
  app.use('/api/payments', router);
  const server = app.listen(0, '127.0.0.1');
  try {
    await new Promise<void>((resolve) => server.once('listening', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') {
      throw new Error('expected an ephemeral loopback TCP address');
    }
    const url = `http://127.0.0.1:${address.port}/api/payments/orders`;
    await runRequest(async (body) => {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body ?? {}),
      });
      return { status: response.status, body: await response.json() };
    });
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

/** Captures console.error calls while a callback runs, always restoring the stub. */
async function captureConsoleError<T>(
  run: () => Promise<T>,
): Promise<{ result: T; lines: string[] }> {
  const argsSeen: unknown[][] = [];
  const original = console.error;
  console.error = (...args: unknown[]) => {
    argsSeen.push(args);
  };
  try {
    const result = await run();
    return { result, lines: argsSeen.map((args) => JSON.stringify(args)) };
  } finally {
    console.error = original;
  }
}

test('razorpayClient and orderRouter are lazy and import-safe with empty env', async () => {
  assert.equal(typeof razorpayClient.createOrder, 'function');
  assert.equal(typeof orderRouter, 'function');

  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    await assert.rejects(
      () =>
        razorpayClient.createOrder({
          amount: 4900,
          currency: 'INR',
          receipt: 'import-safety',
          notes: {},
        }),
      /Missing RAZORPAY_KEY_ID \/ RAZORPAY_KEY_SECRET/,
    );
  }
});

test('POST /api/payments/orders returns 401 without authentication', async () => {
  const { client } = fakeRazorpay();
  const { store, rows } = fakeStore();
  const router = createOrderRouter({
    requireAuth: denyAuth,
    razorpay: client,
    store,
    keyId: 'rzp_injected_key',
  });

  await withOrderRouter(router, async (post) => {
    const { status, body } = await post({ tier: 'premium' });
    assert.equal(status, 401);
    assert.deepEqual(body, { error: 'Unauthorized' });
  });
  assert.equal(rows.length, 0);
});

test('POST /api/payments/orders rejects an unsupported tier with 400', async () => {
  const { client, calls } = fakeRazorpay();
  const { store, rows } = fakeStore();
  const router = createOrderRouter({
    requireAuth: allowAuth,
    razorpay: client,
    store,
    keyId: 'rzp_injected_key',
  });

  await withOrderRouter(router, async (post) => {
    const { status, body } = await post({ tier: 'plus' });
    assert.equal(status, 400);
    assert.ok(body && typeof body === 'object' && 'error' in body);
  });
  assert.equal(calls.length, 0);
  assert.equal(rows.length, 0);
});

test('POST /api/payments/orders creates a premium order from server-side catalog values', async () => {
  const { client, calls } = fakeRazorpay({ id: 'order_catalog_1' });
  const { store, rows } = fakeStore();
  const router = createOrderRouter({
    requireAuth: allowAuth,
    razorpay: client,
    store,
    keyId: 'rzp_injected_key',
  });

  await withOrderRouter(router, async (post) => {
    const { status } = await post({ tier: 'premium', amount: 1, currency: 'USD' });
    assert.equal(status, 200);
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].amount, 4900);
  assert.equal(calls[0].currency, 'INR');
  assert.deepEqual(calls[0].notes, { user_id: 'uuid-1', tier: 'premium' });
  assert.equal(typeof calls[0].receipt, 'string');
  assert.ok(calls[0].receipt.length > 0);
  assert.deepEqual(rows, [
    {
      orderId: 'order_catalog_1',
      userId: 'uuid-1',
      tier: 'premium',
      amountPaise: 4900,
      currency: 'INR',
    },
  ]);
});

test('POST /api/payments/orders ignores a client-supplied userId when storing the order', async () => {
  const { client } = fakeRazorpay({ id: 'order_auth_1' });
  const { store, rows } = fakeStore();
  const router = createOrderRouter({
    requireAuth: allowAuth,
    razorpay: client,
    store,
    keyId: 'rzp_injected_key',
  });

  await withOrderRouter(router, async (post) => {
    const { status } = await post({ tier: 'premium', userId: 'attacker-uuid' });
    assert.equal(status, 200);
  });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].userId, 'uuid-1');
});

test('POST /api/payments/orders returns exactly the order id, catalog values and injected keyId', async () => {
  const { client } = fakeRazorpay({ id: 'order_response_1' });
  const { store } = fakeStore();
  const router = createOrderRouter({
    requireAuth: allowAuth,
    razorpay: client,
    store,
    keyId: 'rzp_injected_key',
  });

  await withOrderRouter(router, async (post) => {
    const { status, body } = await post({ tier: 'premium' });
    assert.equal(status, 200);
    assert.deepEqual(body, {
      orderId: 'order_response_1',
      amountPaise: 4900,
      currency: 'INR',
      keyId: 'rzp_injected_key',
    });
  });
});

test('POST /api/payments/orders returns 502 and stores nothing when Razorpay fails', async () => {
  const { client, calls } = fakeRazorpay({ error: new Error('gateway down') });
  const { store, rows } = fakeStore();
  const router = createOrderRouter({
    requireAuth: allowAuth,
    razorpay: client,
    store,
    keyId: 'rzp_injected_key',
  });

  const { lines } = await captureConsoleError(async () => {
    await withOrderRouter(router, async (post) => {
      const { status, body } = await post({ tier: 'premium' });
      assert.equal(status, 502);
      assert.ok(body && typeof body === 'object' && 'error' in body);
    });
  });
  assert.equal(rows.length, 0);
  assert.equal(calls.length, 1);
  assert.ok(
    lines.some(
      (line) =>
        line.includes(calls[0].receipt) &&
        line.includes('uuid-1') &&
        line.includes('gateway down'),
    ),
    `expected a gateway-failure log with receipt, user and error, got ${JSON.stringify(lines)}`,
  );
});

test('POST /api/payments/orders returns 500 when the order cannot be persisted', async () => {
  const { client } = fakeRazorpay({ id: 'order_store_fail' });
  const { store } = fakeStore({ createOrderError: new Error('database down') });
  const router = createOrderRouter({
    requireAuth: allowAuth,
    razorpay: client,
    store,
    keyId: 'rzp_injected_key',
  });

  const { lines } = await captureConsoleError(async () => {
    await withOrderRouter(router, async (post) => {
      const { status, body } = await post({ tier: 'premium' });
      assert.equal(status, 500);
      assert.ok(body && typeof body === 'object' && 'error' in body);
    });
  });
  assert.ok(
    lines.some(
      (line) =>
        line.includes('order_store_fail') &&
        line.includes('uuid-1') &&
        line.includes('database down'),
    ),
    `expected a store-failure log with order id, user and error, got ${JSON.stringify(lines)}`,
  );
});

const WEBHOOK_SECRET = 'test_webhook_secret';

function signWebhook(rawBody: string, secret = WEBHOOK_SECRET): string {
  return createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex');
}

function capturedEvent(overrides: {
  event?: string;
  orderId?: string;
  paymentId?: string;
  amount?: number;
  currency?: string;
  userId?: string;
  tier?: string;
} = {}) {
  const {
    event = 'payment.captured',
    orderId = 'order_webhook_1',
    paymentId = 'pay_webhook_1',
    amount = 4900,
    currency = 'INR',
    userId = 'uuid-1',
    tier = 'premium',
  } = overrides;
  return {
    entity: 'event',
    event,
    payload: {
      payment: {
        entity: {
          id: paymentId,
          order_id: orderId,
          amount,
          currency,
          notes: { user_id: userId, tier },
        },
      },
    },
  };
}

interface WebhookPostOptions {
  rawBody?: string;
  signature?: string | null;
}

/** Boots the payments router with raw-body capture at /api/payments/webhook. */
async function withWebhookRouter(
  router: Router,
  run: (
    post: (options?: WebhookPostOptions) => Promise<{ status: number; body: unknown }>,
  ) => Promise<void>,
) {
  const app = express();
  registerMiddleware(app);
  app.use('/api/payments', router);
  const server = app.listen(0, '127.0.0.1');
  try {
    await new Promise<void>((resolve) => server.once('listening', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') {
      throw new Error('expected an ephemeral loopback TCP address');
    }
    const url = `http://127.0.0.1:${address.port}/api/payments/webhook`;
    await run(async (options = {}) => {
      const rawBody = options.rawBody ?? '';
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (options.signature !== undefined && options.signature !== null) {
        headers['x-razorpay-signature'] = options.signature;
      }
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: rawBody,
      });
      let body: unknown = null;
      try {
        body = await response.json();
      } catch {
        // A malformed-body 400 may have a non-JSON body; status is what matters.
      }
      return { status: response.status, body };
    });
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

/** Fake store that reflects markOrderPaid so idempotency can be observed. */
function fakeWebhookStore(orderOverrides: Partial<PlanOrder> = {}) {
  const order: PlanOrder = {
    orderId: 'order_webhook_1',
    userId: 'uuid-1',
    tier: 'premium',
    amountPaise: 4900,
    currency: 'INR',
    status: 'created',
    ...orderOverrides,
  };
  const getOrderCalls: string[] = [];
  const markOrderPaidCalls: Array<[string, string]> = [];
  const upsertEntitlementCalls: UpsertEntitlementRow[] = [];
  const store: PlanStore = {
    async createOrder() {},
    async getOrder(orderId) {
      getOrderCalls.push(orderId);
      return order.orderId === orderId ? { ...order } : null;
    },
    async markOrderPaid(orderId, paymentId) {
      markOrderPaidCalls.push([orderId, paymentId]);
      order.status = 'paid';
    },
    async getEntitlement() {
      return null;
    },
    async upsertEntitlement(row) {
      upsertEntitlementCalls.push(row);
    },
  };
  return {
    store,
    order,
    getOrderCalls,
    markOrderPaidCalls,
    upsertEntitlementCalls,
  };
}

function webhookRouter(store: PlanStore): Router {
  return createOrderRouter({
    requireAuth: denyAuth,
    razorpay: fakeRazorpay().client,
    store,
    keyId: 'rzp_injected_key',
    webhookSecret: WEBHOOK_SECRET,
  });
}

test('verifyWebhookSignature accepts the exact-body HMAC and rejects bad input', () => {
  const rawBody = '{"event":"payment.captured"}';
  const signature = signWebhook(rawBody);
  assert.equal(verifyWebhookSignature(rawBody, signature, WEBHOOK_SECRET), true);
  assert.equal(verifyWebhookSignature(rawBody, undefined, WEBHOOK_SECRET), false);
  assert.equal(verifyWebhookSignature(rawBody, 'deadbeef', WEBHOOK_SECRET), false);
  assert.equal(verifyWebhookSignature(rawBody + ' ', signature, WEBHOOK_SECRET), false);
  assert.equal(verifyWebhookSignature(rawBody, signature, 'other_secret'), false);
});

test('POST /api/payments/webhook grants premium for a valid captured payment', async () => {
  const { store, markOrderPaidCalls, upsertEntitlementCalls } =
    fakeWebhookStore();
  const rawBody = JSON.stringify(capturedEvent());

  await withWebhookRouter(webhookRouter(store), async (post) => {
    const { status, body } = await post({
      rawBody,
      signature: signWebhook(rawBody),
    });
    assert.equal(status, 200);
    assert.deepEqual(body, { received: true });
  });

  assert.deepEqual(markOrderPaidCalls, [['order_webhook_1', 'pay_webhook_1']]);
  assert.deepEqual(upsertEntitlementCalls, [
    {
      userId: 'uuid-1',
      tier: 'premium',
      orderId: 'order_webhook_1',
      paymentId: 'pay_webhook_1',
    },
  ]);
});

test('POST /api/payments/webhook grants premium for a verified order.paid event', async () => {
  const { store, markOrderPaidCalls, upsertEntitlementCalls } =
    fakeWebhookStore();
  const rawBody = JSON.stringify({
    entity: 'event',
    event: 'order.paid',
    payload: {
      order: {
        entity: {
          id: 'order_webhook_1',
          amount: 4900,
          currency: 'INR',
          notes: { user_id: 'uuid-1', tier: 'premium' },
        },
      },
      payment: {
        entity: {
          id: 'pay_webhook_1',
          order_id: 'order_webhook_1',
          amount: 4900,
          currency: 'INR',
        },
      },
    },
  });

  await withWebhookRouter(webhookRouter(store), async (post) => {
    const { status } = await post({
      rawBody,
      signature: signWebhook(rawBody),
    });
    assert.equal(status, 200);
  });

  assert.deepEqual(markOrderPaidCalls, [['order_webhook_1', 'pay_webhook_1']]);
  assert.deepEqual(upsertEntitlementCalls, [
    {
      userId: 'uuid-1',
      tier: 'premium',
      orderId: 'order_webhook_1',
      paymentId: 'pay_webhook_1',
    },
  ]);
});

test('POST /api/payments/webhook rejects missing or invalid signatures with 401 and no store access', async () => {
  const rawBody = JSON.stringify(capturedEvent());
  const badSignatures = [
    undefined,
    'deadbeef',
    signWebhook(rawBody, 'wrong_secret'),
  ];

  for (const signature of badSignatures) {
    const {
      store,
      getOrderCalls,
      markOrderPaidCalls,
      upsertEntitlementCalls,
    } = fakeWebhookStore();
    await withWebhookRouter(webhookRouter(store), async (post) => {
      const { status, body } = await post({ rawBody, signature });
      assert.equal(status, 401);
      assert.deepEqual(body, { error: 'Unauthorized' });
    });
    assert.deepEqual(getOrderCalls, []);
    assert.deepEqual(markOrderPaidCalls, []);
    assert.deepEqual(upsertEntitlementCalls, []);
  }
});

test('POST /api/payments/webhook rejects malformed JSON with 400 and no writes', async () => {
  const rawBody = '{"event":"payment.captured",';
  const { store, markOrderPaidCalls, upsertEntitlementCalls } =
    fakeWebhookStore();

  await withWebhookRouter(webhookRouter(store), async (post) => {
    const { status } = await post({
      rawBody,
      signature: signWebhook(rawBody),
    });
    assert.equal(status, 400);
  });

  assert.deepEqual(markOrderPaidCalls, []);
  assert.deepEqual(upsertEntitlementCalls, []);
});

test('POST /api/payments/webhook ignores an unrelated event', async () => {
  const rawBody = JSON.stringify(capturedEvent({ event: 'payment.failed' }));
  const { store, getOrderCalls, markOrderPaidCalls, upsertEntitlementCalls } =
    fakeWebhookStore();

  await withWebhookRouter(webhookRouter(store), async (post) => {
    const { status } = await post({
      rawBody,
      signature: signWebhook(rawBody),
    });
    assert.equal(status, 200);
  });

  assert.deepEqual(getOrderCalls, []);
  assert.deepEqual(markOrderPaidCalls, []);
  assert.deepEqual(upsertEntitlementCalls, []);
});

const webhookMismatchCases: Array<{
  name: string;
  event: ReturnType<typeof capturedEvent>;
  orderOverrides?: Partial<PlanOrder>;
}> = [
  { name: 'an unknown order id', event: capturedEvent({ orderId: 'order_unknown' }) },
  { name: 'a wrong notes.user_id', event: capturedEvent({ userId: 'attacker' }) },
  { name: 'a wrong tier', event: capturedEvent({ tier: 'plus' }) },
  { name: 'a wrong amount', event: capturedEvent({ amount: 100 }) },
  { name: 'a wrong currency', event: capturedEvent({ currency: 'USD' }) },
  {
    name: 'a stored order with the wrong tier',
    event: capturedEvent(),
    orderOverrides: { tier: 'plus' },
  },
];

for (const item of webhookMismatchCases) {
  test(`POST /api/payments/webhook rejects ${item.name} with 400 and no writes`, async () => {
    const { store, markOrderPaidCalls, upsertEntitlementCalls } =
      fakeWebhookStore(item.orderOverrides);
    const rawBody = JSON.stringify(item.event);

    await withWebhookRouter(webhookRouter(store), async (post) => {
      const { status, body } = await post({
        rawBody,
        signature: signWebhook(rawBody),
      });
      assert.equal(status, 400);
      assert.ok(body && typeof body === 'object' && 'error' in body);
    });

    assert.deepEqual(markOrderPaidCalls, []);
    assert.deepEqual(upsertEntitlementCalls, []);
  });
}

test('POST /api/payments/webhook is idempotent for a repeated captured payment', async () => {
  const { store, markOrderPaidCalls, upsertEntitlementCalls } =
    fakeWebhookStore();
  const rawBody = JSON.stringify(capturedEvent());
  const signature = signWebhook(rawBody);

  await withWebhookRouter(webhookRouter(store), async (post) => {
    const first = await post({ rawBody, signature });
    const second = await post({ rawBody, signature });
    assert.equal(first.status, 200);
    assert.equal(second.status, 200);
  });

  assert.equal(markOrderPaidCalls.length, 1);
  assert.equal(upsertEntitlementCalls.length, 1);
});

test('createWebhookHandler is exported as a standalone RequestHandler', () => {
  const { store } = fakeWebhookStore();
  const handler = createWebhookHandler({ store, secret: WEBHOOK_SECRET });
  assert.equal(typeof handler, 'function');
});

/** Fake plan store whose entitlement lookup can return a row or throw. */
function fakeAccountStore(options: {
  entitlement?: Entitlement | null;
  getEntitlementError?: Error;
} = {}) {
  const getEntitlementCalls: string[] = [];
  const store: PlanStore = {
    async createOrder() {},
    async getOrder() {
      return null;
    },
    async markOrderPaid() {},
    async getEntitlement(userId) {
      getEntitlementCalls.push(userId);
      if (options.getEntitlementError) throw options.getEntitlementError;
      return options.entitlement ?? null;
    },
    async upsertEntitlement() {},
  };
  return { store, getEntitlementCalls };
}

/** Boots the account router at /api/account on an ephemeral loopback port. */
async function withAccountRouter(
  router: Router,
  run: (
    get: (query?: string) => Promise<{ status: number; body: unknown }>,
  ) => Promise<void>,
) {
  const app = express();
  app.use(express.json());
  app.use('/api/account', router);
  const server = app.listen(0, '127.0.0.1');
  try {
    await new Promise<void>((resolve) => server.once('listening', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') {
      throw new Error('expected an ephemeral loopback TCP address');
    }
    const url = `http://127.0.0.1:${address.port}/api/account/plan`;
    await run(async (query = '') => {
      const response = await fetch(`${url}${query}`);
      return { status: response.status, body: await response.json() };
    });
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

test('accountRouter is exported and import-safe with empty env', () => {
  assert.equal(typeof accountRouter, 'function');
});

test('GET /api/account/plan returns 401 without authentication', async () => {
  const { store, getEntitlementCalls } = fakeAccountStore();
  const router = createAccountRouter({ requireAuth: denyAuth, store });

  await withAccountRouter(router, async (get) => {
    const { status, body } = await get();
    assert.equal(status, 401);
    assert.deepEqual(body, { error: 'Unauthorized' });
  });
  assert.deepEqual(getEntitlementCalls, []);
});

test('GET /api/account/plan reports an inactive plan when no entitlement exists', async () => {
  const { store, getEntitlementCalls } = fakeAccountStore();
  const router = createAccountRouter({ requireAuth: allowAuth, store });

  await withAccountRouter(router, async (get) => {
    const { status, body } = await get();
    assert.equal(status, 200);
    assert.deepEqual(body, { tier: null, active: false });
  });
  assert.deepEqual(getEntitlementCalls, ['uuid-1']);
});

test('GET /api/account/plan reports premium active for an active premium entitlement', async () => {
  const { store, getEntitlementCalls } = fakeAccountStore({
    entitlement: { tier: 'premium', status: 'active' },
  });
  const router = createAccountRouter({ requireAuth: allowAuth, store });

  await withAccountRouter(router, async (get) => {
    const { status, body } = await get();
    assert.equal(status, 200);
    assert.deepEqual(body, { tier: 'premium', active: true });
  });
  assert.deepEqual(getEntitlementCalls, ['uuid-1']);
});

test('GET /api/account/plan treats a revoked entitlement as inactive', async () => {
  const { store } = fakeAccountStore({
    entitlement: { tier: 'premium', status: 'revoked' },
  });
  const router = createAccountRouter({ requireAuth: allowAuth, store });

  await withAccountRouter(router, async (get) => {
    const { status, body } = await get();
    assert.equal(status, 200);
    assert.deepEqual(body, { tier: null, active: false });
  });
});

test('GET /api/account/plan returns 500 when the entitlement lookup fails', async () => {
  const { store, getEntitlementCalls } = fakeAccountStore({
    getEntitlementError: new Error('database down'),
  });
  const router = createAccountRouter({ requireAuth: allowAuth, store });

  await withAccountRouter(router, async (get) => {
    const { status, body } = await get();
    assert.equal(status, 500);
    assert.deepEqual(body, { error: 'Unable to load plan' });
  });
  assert.deepEqual(getEntitlementCalls, ['uuid-1']);
});

test('GET /api/account/plan ignores a client-supplied userId in the query string', async () => {
  const { store, getEntitlementCalls } = fakeAccountStore({
    entitlement: { tier: 'premium', status: 'active' },
  });
  const router = createAccountRouter({ requireAuth: allowAuth, store });

  await withAccountRouter(router, async (get) => {
    const { status, body } = await get('?userId=attacker-uuid');
    assert.equal(status, 200);
    assert.deepEqual(body, { tier: 'premium', active: true });
  });
  assert.deepEqual(getEntitlementCalls, ['uuid-1']);
});

test('GET /api/account/plan never exposes a non-premium tier as active', async () => {
  const { store } = fakeAccountStore({
    entitlement: { tier: 'plus', status: 'active' },
  });
  const router = createAccountRouter({ requireAuth: allowAuth, store });

  await withAccountRouter(router, async (get) => {
    const { status, body } = await get();
    assert.equal(status, 200);
    assert.deepEqual(body, { tier: null, active: false });
  });
});
