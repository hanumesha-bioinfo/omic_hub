import { randomUUID } from 'node:crypto';
import express, { type RequestHandler, type Router } from 'express';
import { RAZORPAY_KEY_ID } from '../config';
import { razorpayClient, type RazorpayOrdersClient } from '../lib/razorpay';
import { planStore, type PlanStore } from '../lib/serverAdmin';
import { adminVerifier } from '../lib/supabaseAdmin';
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

export interface CreateOrderRouterDeps {
  requireAuth: RequestHandler;
  razorpay: RazorpayOrdersClient;
  store: PlanStore;
  keyId: string;
}

export function createOrderRouter(deps: CreateOrderRouterDeps): Router {
  const router = express.Router();

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
});
