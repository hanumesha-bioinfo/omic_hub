import { createClient } from '@supabase/supabase-js';
import { SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL } from '../config';

export interface PlanOrder {
  orderId: string;
  userId: string;
  tier: string;
  amountPaise: number;
  currency: string;
  status: string;
}

export interface Entitlement {
  tier: string;
  status: string;
}

export interface CreateOrderRow {
  orderId: string;
  userId: string;
  tier: 'premium';
  amountPaise: number;
  currency: 'INR';
}

export interface UpsertEntitlementRow {
  userId: string;
  tier: 'premium';
  orderId: string;
  paymentId: string;
}

export interface PlanStore {
  createOrder(row: CreateOrderRow): Promise<void>;
  getOrder(orderId: string): Promise<PlanOrder | null>;
  markOrderPaid(orderId: string, paymentId: string): Promise<void>;
  getEntitlement(userId: string): Promise<Entitlement | null>;
  upsertEntitlement(row: UpsertEntitlementRow): Promise<void>;
}

interface QueryError {
  message: string;
}

interface MutationResult {
  error: QueryError | null;
}

interface SelectResult<T> {
  data: T | null;
  error: QueryError | null;
}

/** Mirrors the razorpay_orders table columns without trusting any client input. */
interface DbOrderRow {
  order_id: string;
  user_id: string;
  tier: string;
  amount_paise: number;
  currency: string;
  status: string;
}

/** Mirrors the user_subscriptions columns used by the entitlement read path. */
interface DbEntitlementRow {
  tier: string;
  status: string;
}

/** Narrow, structural client shape so tests can inject fakes without a network. */
export interface SupabaseTableClient {
  from(table: string): {
    select(columns: string): {
      eq(column: string, value: string): {
        maybeSingle(): Promise<SelectResult<Record<string, unknown>>>;
      };
    };
    insert(row: Record<string, unknown>): PromiseLike<MutationResult>;
    update(values: Record<string, unknown>): {
      eq(column: string, value: string): PromiseLike<MutationResult>;
    };
    upsert(row: Record<string, unknown>): PromiseLike<MutationResult>;
  };
}

export function createPlanStore(client: SupabaseTableClient): PlanStore {
  return {
    async createOrder(row) {
      const { error } = await client.from('razorpay_orders').insert({
        order_id: row.orderId,
        user_id: row.userId,
        tier: row.tier,
        amount_paise: row.amountPaise,
        currency: row.currency,
      });
      if (error) throw error;
    },

    async getOrder(orderId) {
      const { data, error } = await client
        .from('razorpay_orders')
        .select('*')
        .eq('order_id', orderId)
        .maybeSingle();
      if (error) throw error;

      const row = data as DbOrderRow | null;
      if (!row) return null;
      return {
        orderId: row.order_id,
        userId: row.user_id,
        tier: row.tier,
        amountPaise: row.amount_paise,
        currency: row.currency,
        status: row.status,
      };
    },

    async markOrderPaid(orderId, paymentId) {
      const { error } = await client
        .from('razorpay_orders')
        .update({ status: 'paid', payment_id: paymentId })
        .eq('order_id', orderId);
      if (error) throw error;
    },

    async getEntitlement(userId) {
      const { data, error } = await client
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      if (error) throw error;

      const row = data as DbEntitlementRow | null;
      if (!row) return null;
      return { tier: row.tier, status: row.status };
    },

    async upsertEntitlement(row) {
      const { error } = await client.from('user_subscriptions').upsert({
        user_id: row.userId,
        tier: row.tier,
        order_id: row.orderId,
        payment_id: row.paymentId,
        status: 'active',
      });
      if (error) throw error;
    },
  };
}

function createTableClient(): SupabaseTableClient {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
  }

  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }) as unknown as SupabaseTableClient;
}

let realClient: SupabaseTableClient | undefined;

function getTableClient(): SupabaseTableClient {
  if (!realClient) {
    realClient = createTableClient();
  }
  return realClient;
}

// The real client is only constructed when a request actually calls through it,
// so importing this module with empty Supabase credentials cannot throw.
const lazyTableClient: SupabaseTableClient = {
  from(table) {
    return getTableClient().from(table);
  },
};

export const planStore: PlanStore = createPlanStore(lazyTableClient);
