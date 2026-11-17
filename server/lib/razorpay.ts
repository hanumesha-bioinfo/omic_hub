import { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET } from '../config';

export interface RazorpayOrderInput {
  amount: number;
  currency: string;
  receipt: string;
  notes: Record<string, string>;
}

export interface RazorpayOrdersClient {
  createOrder(input: RazorpayOrderInput): Promise<{ id: string }>;
}

const ORDERS_URL = 'https://api.razorpay.com/v1/orders';

function createRazorpayClient(): RazorpayOrdersClient {
  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    throw new Error('Missing RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET');
  }

  const authorization = `Basic ${Buffer.from(
    `${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`,
  ).toString('base64')}`;

  return {
    async createOrder(input) {
      const response = await fetch(ORDERS_URL, {
        method: 'POST',
        headers: {
          Authorization: authorization,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
      });
      if (!response.ok) {
        throw new Error(`Razorpay order creation failed: ${response.status}`);
      }
      const data = (await response.json()) as { id?: unknown };
      if (typeof data?.id !== 'string' || !data.id) {
        throw new Error('Razorpay order response did not include an id');
      }
      return { id: data.id };
    },
  };
}

let realClient: RazorpayOrdersClient | undefined;

function getRealClient(): RazorpayOrdersClient {
  if (!realClient) {
    realClient = createRazorpayClient();
  }
  return realClient;
}

// The real client (and its credential check) is only created on first use, so
// importing this module with empty Razorpay env cannot throw.
export const razorpayClient: RazorpayOrdersClient = {
  async createOrder(input) {
    return getRealClient().createOrder(input);
  },
};
