export type PaidTier = 'premium';

export interface PaymentOrder {
  orderId: string;
  amountPaise: number;
  currency: 'INR';
  keyId: string;
}

export interface VerifiedPlan {
  tier: PaidTier | null;
  active: boolean;
}

export interface CheckoutOpener {
  (
    options: {
      orderId: string;
      amountPaise: number;
      currency: 'INR';
      keyId: string;
      name: string;
      description: string;
    },
    callbacks: { onClose: () => void },
  ): void | Promise<void>;
}

export interface PaymentDeps {
  fetcher?: typeof fetch;
  getToken?: () => Promise<string | null>;
}

/** Imported lazily so the payment client stays importable in environments without Vite env vars. */
async function getSessionToken(): Promise<string | null> {
  const { supabase } = await import('../../lib/supabase');
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

async function readJson<T>(response: Response, label: string): Promise<T> {
  if (!response.ok) {
    throw new Error(`${label} failed with status ${response.status}`);
  }
  return (await response.json()) as T;
}

export async function requestPremiumOrder(
  deps: PaymentDeps = {},
): Promise<PaymentOrder> {
  const { fetcher = fetch, getToken = getSessionToken } = deps;
  const token = await getToken();
  const response = await fetcher('/api/payments/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token ?? ''}`,
    },
    body: JSON.stringify({ tier: 'premium' }),
  });

  return readJson<PaymentOrder>(response, 'Premium order request');
}

export async function fetchVerifiedPlan(
  deps: PaymentDeps = {},
): Promise<VerifiedPlan> {
  const { fetcher = fetch, getToken = getSessionToken } = deps;
  const token = await getToken();
  const response = await fetcher('/api/account/plan', {
    method: 'GET',
    headers: { Authorization: `Bearer ${token ?? ''}` },
  });

  return readJson<VerifiedPlan>(response, 'Verified plan request');
}

export async function startPremiumCheckout(
  deps: {
    requestOrder?: typeof requestPremiumOrder;
    openCheckout?: CheckoutOpener;
  } = {},
): Promise<'submitted'> {
  const {
    requestOrder = requestPremiumOrder,
    openCheckout = () => {
      throw new Error('No checkout opener configured');
    },
  } = deps;

  const order = await requestOrder();
  // Await the opener so callers only re-read the server after the checkout
  // modal has closed. Openers that are synchronous still resolve immediately.
  await openCheckout(
    {
      orderId: order.orderId,
      amountPaise: order.amountPaise,
      currency: order.currency,
      keyId: order.keyId,
      name: 'OMIC HUB',
      description: 'Premium plan',
    },
    { onClose: () => {} },
  );

  return 'submitted';
}
