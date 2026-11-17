import assert from 'node:assert/strict';
import test from 'node:test';
import express from 'express';
import {
  SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_URL,
} from '../server/config';
import {
  createPlanStore,
  planStore,
  type SupabaseTableClient,
} from '../server/lib/serverAdmin';
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
