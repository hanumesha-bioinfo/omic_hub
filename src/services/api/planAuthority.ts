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
}

export interface PlanAuthority {
  /** Reads the server-verified tier. Cheques out never grant a tier locally. */
  refreshPlan: () => Promise<SubscriptionPlanTier>;
  /** Opens Razorpay, then reads the server again. Returns only the verified tier. */
  checkout: () => Promise<SubscriptionPlanTier>;
}

/** Only an active premium entitlement from the server can produce the premium tier. */
export function resolveAuthoritativeTier(plan: VerifiedPlan): SubscriptionPlanTier {
  return plan.active && plan.tier === 'premium' ? 'premium' : 'free';
}

export function createPlanAuthority(deps: PlanAuthorityDeps = {}): PlanAuthority {
  const fetchPlan = deps.fetchVerifiedPlan ?? defaultFetchVerifiedPlan;
  const requestOrder = deps.requestOrder ?? defaultRequestPremiumOrder;
  const openCheckout = deps.openCheckout;

  async function tierFromServer(): Promise<SubscriptionPlanTier> {
    return resolveAuthoritativeTier(await fetchPlan());
  }

  return {
    refreshPlan: tierFromServer,
    async checkout() {
      await startPremiumCheckout({
        requestOrder,
        openCheckout:
          openCheckout ??
          (() => {
            throw new Error('No checkout opener configured');
          }),
      });
      return tierFromServer();
    },
  };
}
