import assert from 'node:assert/strict';
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
  type PlanStore,
  type SupabaseTableClient,
} from '../server/lib/serverAdmin';
import { createOrderRouter, orderRouter } from '../server/routes/payments';
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
  const { client } = fakeRazorpay({ error: new Error('gateway down') });
  const { store, rows } = fakeStore();
  const router = createOrderRouter({
    requireAuth: allowAuth,
    razorpay: client,
    store,
    keyId: 'rzp_injected_key',
  });

  await withOrderRouter(router, async (post) => {
    const { status, body } = await post({ tier: 'premium' });
    assert.equal(status, 502);
    assert.ok(body && typeof body === 'object' && 'error' in body);
  });
  assert.equal(rows.length, 0);
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

  await withOrderRouter(router, async (post) => {
    const { status, body } = await post({ tier: 'premium' });
    assert.equal(status, 500);
    assert.ok(body && typeof body === 'object' && 'error' in body);
  });
});
