import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import express, { type RequestHandler, type Router } from 'express';
import { RAZORPAY_KEY_ID, RAZORPAY_WEBHOOK_SECRET } from '../config';
import { razorpayClient, type RazorpayOrdersClient } from '../lib/razorpay';
import {
  planStore,
  type PlanOrder,
  type PlanStore,
} from '../lib/serverAdmin';
import { adminVerifier } from '../lib/supabaseAdmin';
import { type RawBodyRequest } from '../middleware';
import {
  createRequireAuth,
  type AuthenticatedRequest,
} from '../middleware/auth';

const PREMIUM_TIER = 'premium';
const PREMIUM_AMOUNT_PAISE = 4900;
const PREMIUM_CURRENCY = 'INR';

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Verifies the Razorpay HMAC over the exact bytes that arrived on the wire.
 * No payload field may be read until this returns true.
 */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string | undefined,
  secret: string,
): boolean {
  if (!secret || typeof signature !== 'string' || signature.length === 0) {
    return false;
  }
  const supplied = signature.startsWith('sha256=')
    ? signature.slice('sha256='.length)
    : signature;
  if (!/^[0-9a-f]+$/i.test(supplied) || supplied.length % 2 !== 0) {
    return false;
  }

  const expected = Buffer.from(
    createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex'),
    'hex',
  );
  const actual = Buffer.from(supplied, 'hex');
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

interface CapturedPayment {
  orderId: string;
  paymentId: string;
  amount: unknown;
  currency: unknown;
  userId: unknown;
  tier: unknown;
}

/** Normalizes the granting events without trusting any of their fields. */
function extractCapturedPayment(event: unknown): CapturedPayment | null {
  if (!isRecord(event) || !isRecord(event.payload)) return null;

  if (event.event === 'payment.captured') {
    const payment = isRecord(event.payload.payment)
      ? event.payload.payment.entity
      : undefined;
    if (!isRecord(payment)) return null;
    const notes = isRecord(payment.notes) ? payment.notes : undefined;
    return {
      orderId: typeof payment.order_id === 'string' ? payment.order_id : '',
      paymentId: typeof payment.id === 'string' ? payment.id : '',
      amount: payment.amount,
      currency: payment.currency,
      userId: notes?.user_id,
      tier: notes?.tier,
    };
  }

  if (event.event === 'order.paid') {
    const order = isRecord(event.payload.order) ? event.payload.order.entity : undefined;
    const payment = isRecord(event.payload.payment)
      ? event.payload.payment.entity
      : undefined;
    if (!isRecord(order) || !isRecord(payment)) return null;
    const notes = isRecord(order.notes)
      ? order.notes
      : isRecord(payment.notes)
        ? payment.notes
        : undefined;
    return {
      orderId: typeof order.id === 'string' ? order.id : '',
      paymentId: typeof payment.id === 'string' ? payment.id : '',
      amount: order.amount,
      currency: order.currency,
      userId: notes?.user_id,
      tier: notes?.tier,
    };
  }

  return null;
}

export interface CreateWebhookHandlerDeps {
  store: PlanStore;
  secret: string;
}

/**
 * The only code path allowed to grant Premium. Signature is checked before
 * parsing; a repeated captured payment is a no-op once the order is paid.
 */
export function createWebhookHandler(
  deps: CreateWebhookHandlerDeps,
): RequestHandler {
  return async (req, res) => {
    const rawBody = (req as RawBodyRequest).rawBody;
    const signature = req.header('x-razorpay-signature');
    if (
      rawBody === undefined ||
      !verifyWebhookSignature(rawBody, signature, deps.secret)
    ) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    let event: unknown;
    try {
      event = JSON.parse(rawBody);
    } catch {
      res.status(400).json({ error: 'Invalid webhook payload' });
      return;
    }

    const captured = extractCapturedPayment(event);
    if (!captured) {
      // Unrelated or unsupported event: acknowledge without any writes.
      res.json({ received: true });
      return;
    }

    if (!captured.orderId || !captured.paymentId) {
      res.status(400).json({ error: 'Invalid webhook payload' });
      return;
    }

    let order: PlanOrder | null;
    try {
      order = await deps.store.getOrder(captured.orderId);
    } catch (error) {
      console.error('Failed to look up Razorpay order for webhook', {
        orderId: captured.orderId,
        error: errorMessage(error),
      });
      res.status(500).json({ error: 'Unable to process webhook' });
      return;
    }

    if (
      !order ||
      order.orderId !== captured.orderId ||
      order.tier !== PREMIUM_TIER ||
      order.amountPaise !== PREMIUM_AMOUNT_PAISE ||
      order.currency !== PREMIUM_CURRENCY ||
      captured.tier !== PREMIUM_TIER ||
      captured.amount !== PREMIUM_AMOUNT_PAISE ||
      captured.currency !== PREMIUM_CURRENCY ||
      captured.userId !== order.userId
    ) {
      res.status(400).json({ error: 'Invalid webhook payload' });
      return;
    }

    // Durable idempotency: the paid order status is set by this handler only.
    if (order.status === 'paid') {
      res.json({ received: true });
      return;
    }

    // Upsert first so a paid order always has its entitlement; a retry after a
    // failed markOrderPaid only re-writes the same entitlement row.
    try {
      await deps.store.upsertEntitlement({
        userId: order.userId,
        tier: PREMIUM_TIER,
        orderId: order.orderId,
        paymentId: captured.paymentId,
      });
      await deps.store.markOrderPaid(order.orderId, captured.paymentId);
    } catch (error) {
      console.error('Failed to grant premium entitlement from webhook', {
        orderId: order.orderId,
        paymentId: captured.paymentId,
        error: errorMessage(error),
      });
      res.status(500).json({ error: 'Unable to process webhook' });
      return;
    }

    res.json({ received: true });
  };
}

export interface CreateOrderRouterDeps {
  requireAuth: RequestHandler;
  razorpay: RazorpayOrdersClient;
  store: PlanStore;
  keyId: string;
  webhookSecret?: string;
}

export function createOrderRouter(deps: CreateOrderRouterDeps): Router {
  const router = express.Router();

  // Razorpay authenticates this route with its signature, not a JWT.
  router.post(
    '/webhook',
    createWebhookHandler({
      store: deps.store,
      secret: deps.webhookSecret ?? RAZORPAY_WEBHOOK_SECRET,
    }),
  );

  router.post('/orders', deps.requireAuth, async (req, res) => {
    const tier = (req.body as { tier?: unknown } | undefined)?.tier;
    if (tier !== PREMIUM_TIER) {
      res.status(400).json({ error: 'Unsupported tier' });
      return;
    }

    const auth = (req as AuthenticatedRequest).auth;
    if (!auth) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const receipt = randomUUID();
    let order: { id: string };
    try {
      order = await deps.razorpay.createOrder({
        amount: PREMIUM_AMOUNT_PAISE,
        currency: PREMIUM_CURRENCY,
        receipt,
        notes: { user_id: auth.userId, tier: PREMIUM_TIER },
      });
    } catch (error) {
      // No order id exists yet; the receipt correlates a gateway-side attempt.
      // The real client's message includes the gateway HTTP status when present.
      console.error('Razorpay order creation failed', {
        receipt,
        userId: auth.userId,
        error: errorMessage(error),
      });
      res.status(502).json({ error: 'Payment gateway unavailable' });
      return;
    }

    try {
      await deps.store.createOrder({
        orderId: order.id,
        userId: auth.userId,
        tier: PREMIUM_TIER,
        amountPaise: PREMIUM_AMOUNT_PAISE,
        currency: PREMIUM_CURRENCY,
      });
    } catch (error) {
      // A Razorpay order already exists here; log its id so a missing local
      // row can be traced (reconciliation handled outside this task).
      console.error('Failed to persist Razorpay order', {
        orderId: order.id,
        userId: auth.userId,
        error: errorMessage(error),
      });
      res.status(500).json({ error: 'Unable to create order' });
      return;
    }

    res.json({
      orderId: order.id,
      amountPaise: PREMIUM_AMOUNT_PAISE,
      currency: PREMIUM_CURRENCY,
      keyId: deps.keyId,
    });
  });

  return router;
}

export const orderRouter = createOrderRouter({
  requireAuth: createRequireAuth(adminVerifier),
  razorpay: razorpayClient,
  store: planStore,
  keyId: RAZORPAY_KEY_ID,
  webhookSecret: RAZORPAY_WEBHOOK_SECRET,
});
