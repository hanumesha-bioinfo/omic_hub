import type { SubscriptionPlanTier } from '../../types';
import {
  fetchVerifiedPlan as defaultFetchVerifiedPlan,
  requestPremiumOrder as defaultRequestPremiumOrder,
  startPremiumCheckout,
  type CheckoutOpener,
  type PaymentOrder,
  type VerifiedPlan,
} from './payments';

export interface PlanAuthorityDeps {
  fetchVerifiedPlan?: () => Promise<VerifiedPlan>;
  requestOrder?: () => Promise<PaymentOrder>;
  openCheckout?: CheckoutOpener;
  /** How many times to re-read the plan after checkout closes (default 5). */
  retryAttempts?: number;
  /** Delay between post-close plan reads in ms (default 500). */
  retryDelayMs?: number;
}

export interface PlanAuthority {
  /** Reads the server-verified tier. Checkout never grants a tier locally. */
  refreshPlan: () => Promise<SubscriptionPlanTier>;
  /** Opens Razorpay and, after the modal closes, returns only the server-verified tier. */
  checkout: () => Promise<SubscriptionPlanTier>;
}

/** Only an active premium entitlement from the server can produce the premium tier. */
export function resolveAuthoritativeTier(plan: VerifiedPlan): SubscriptionPlanTier {
  return plan.active && plan.tier === 'premium' ? 'premium' : 'free';
}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export function createPlanAuthority(deps: PlanAuthorityDeps = {}): PlanAuthority {
  const fetchPlan = deps.fetchVerifiedPlan ?? defaultFetchVerifiedPlan;
  const requestOrder = deps.requestOrder ?? defaultRequestPremiumOrder;
  const openCheckout = deps.openCheckout;
  const retryAttempts = Math.max(1, deps.retryAttempts ?? 5);
  const retryDelayMs = Math.max(0, deps.retryDelayMs ?? 500);

  async function tierFromServer(): Promise<SubscriptionPlanTier> {
    return resolveAuthoritativeTier(await fetchPlan());
  }

  /** The webhook may still be processing when the modal closes, so poll briefly. */
  async function tierAfterCheckout(): Promise<SubscriptionPlanTier> {
    for (let attempt = 0; attempt < retryAttempts; attempt += 1) {
      const tier = await tierFromServer();
      if (tier === 'premium') return tier;
      if (attempt < retryAttempts - 1) await wait(retryDelayMs);
    }
    return 'free';
  }

  return {
    refreshPlan: tierFromServer,
    async checkout() {
      // startPremiumCheckout resolves only after the checkout opener (the
      // Razorpay modal) closes, so this re-read is genuinely post-payment.
      await startPremiumCheckout({
        requestOrder,
        openCheckout:
          openCheckout ??
          (() => {
            throw new Error('No checkout opener configured');
          }),
      });
      return tierAfterCheckout();
    },
  };
}
