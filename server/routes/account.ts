import express, { type RequestHandler, type Router } from 'express';
import {
  planStore,
  type Entitlement,
  type PlanStore,
} from '../lib/serverAdmin';
import { adminVerifier } from '../lib/supabaseAdmin';
import {
  createRequireAuth,
  type AuthenticatedRequest,
} from '../middleware/auth';

const PREMIUM_TIER = 'premium';
const ACTIVE_STATUS = 'active';

export interface CreateAccountRouterDeps {
  requireAuth: RequestHandler;
  store: PlanStore;
}

/** The only server path that tells the client whether it has a paid plan. */
export function createAccountRouter(deps: CreateAccountRouterDeps): Router {
  const router = express.Router();

  router.get('/plan', deps.requireAuth, async (req, res) => {
    const auth = (req as AuthenticatedRequest).auth;
    if (!auth) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // The user id comes only from verified auth, never from query or body.
    let entitlement: Entitlement | null;
    try {
      entitlement = await deps.store.getEntitlement(auth.userId);
    } catch {
      res.status(500).json({ error: 'Unable to load plan' });
      return;
    }

    if (
      !entitlement ||
      entitlement.status !== ACTIVE_STATUS ||
      entitlement.tier !== PREMIUM_TIER
    ) {
      res.json({ tier: null, active: false });
      return;
    }

    res.json({ tier: entitlement.tier, active: true });
  });

  return router;
}

export const accountRouter = createAccountRouter({
  requireAuth: createRequireAuth(adminVerifier),
  store: planStore,
});
