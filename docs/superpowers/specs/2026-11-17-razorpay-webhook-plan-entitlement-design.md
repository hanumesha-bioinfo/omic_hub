# Real Razorpay Checkout with Webhook-Verified Plan Entitlement

Status: proposed (author picked the Supabase-subscription approach with the partner on 2026-11-17)

## Intent and why

`src/components/SubscriptionPlanModal.tsx:67-87` currently waits on `setTimeout`, fires confetti, and announces "Payment verified" for a hardcoded test card and an SVG QR code. Paid plan state is then written client-side. The same bypass exists in `PlanSelectionLandingPage` and `FeatureGateModal`, and in `App.tsx` `handleSelectPlan`/`handleUpgradeFromGate`, which set `planTier: 'trial'` and `hasSelectedPlan: true` in React state and localStorage. Anyone can unlock `plus` or `pro` for free.

The fix must make a server-verified Razorpay webhook the only thing that activates a paid tier, and remove every client-side claim of verification.

## Goals

- Real Razorpay checkout opened from the browser with a server-created order.
- Server verifies the webhook HMAC over the raw body with `RAZORPAY_WEBHOOK_SECRET`; only a verified `payment.captured`/`order.paid` event writes an entitlement.
- Entitlement lives in Supabase (`razorpay_orders`, `user_subscriptions`), read through an authenticated `/api/account/plan` route with the service-role key.
- Every paid-tier entry point (subscription modal, post-sign-in plan page, feature gate) routes through checkout; only the free tier remains a direct client choice.
- The UI never says "verified", "activated", or "payment successful" based on client state. It says "payment submitted, awaiting confirmation" until `/api/account/plan` reports the tier.
- TDD with injected fakes; no live Razorpay calls in tests.

## Non-goals

- No recurring-billing/subscription lifecycle, refunds, coupons, proration, or cancellation flows. A paid tier is activated by one captured payment using the existing advertised ₹9 / ₹49 price points.
- No changes to student/recruiter auth, role middleware, Google OAuth, or `/api/ai/*`.
- No applying migrations or touching production data in this environment. DDL is documented for the owner to apply.
- No storing Razorpay webhook secret or key secret in any `VITE_` variable.
- No new claims of compliance (PCI-DSS etc.) in UI copy; remove the existing unverified security claims from the fake checkout UI.

## Constraints

- Browser can only ever see `VITE_RAZORPAY_KEY_ID` (public key). `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` are server-only, non-prefixed.
- The server already has non-prefixed `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` and a lazy admin verifier. Importing server modules with empty env must remain safe.
- Raw webhook body must be available for HMAC verification before JSON parsing.
- `npm test` = `tsx --test tests/*.test.ts`; `npm run lint` = `tsc --noEmit`; `npm run build` = `vite build`.
- Known accepted baseline: `npm run lint` has 13 pre-existing errors in `src/services/storage/upload.ts`; acceptance is zero new errors in changed files.
- No git remote is configured; no push/PR is part of this work.

## Approaches considered

1. **Supabase `user_subscriptions` + `razorpay_orders` tables (chosen).** Webhook writes authoritative entitlement; frontend reads it over an authenticated API. Durable, auditable, revocable, and survives reloads. Costs one owner-applied migration and two new server routes.
2. **Add plan columns to `profiles`.** Fewer tables, but entangles entitlement with identity and still needs a migration; hard to keep order/payment audit trail. Rejected.
3. **Server-signed entitlement token, no DB.** No migration, but revocation and audit are weak and the UI's cached plan can drift from the token. Rejected for real money.

The partner chose approach 1.

## Data model (DDL to hand to owner, not applied here)

```sql
create table if not exists public.razorpay_orders (
  order_id text primary key,
  user_id uuid not null,
  tier text not null check (tier in ('plus','pro')),
  amount_paise integer not null,
  status text not null default 'created' check (status in ('created','paid','failed')),
  payment_id text,
  created_at timestamptz not null default now()
);

create table if not exists public.user_subscriptions (
  user_id uuid primary key,
  tier text not null check (tier in ('plus','pro')),
  status text not null default 'active' check (status in ('active','revoked')),
  order_id text not null references public.razorpay_orders(order_id),
  payment_id text not null unique,
  updated_at timestamptz not null default now()
);
```

These tables are service-role-only in practice; the browser never reads or writes them directly. RLS policy details are the owner's call, but no policy may let a client grant itself an entitlement.

## Request/response flow

1. User picks a paid tier. Frontend POSTs `/api/payments/orders` with `{ tier }` and the Supabase access token.
2. Server `requireAuth` resolves identity from JWT + DB profile. It rejects unknown tiers, uses a server-side price catalog (`plus: 900` paise, `pro: 4900` paise), creates a Razorpay order through a lazily-created, injectable client, stores `razorpay_orders`, and returns `{ orderId, amountPaise, currency: 'INR', keyId }`.
3. Frontend loads the Razorpay checkout script on demand and opens checkout with those values. No handler activates a tier; dismissal/failure only clears the busy state. On checkout close the UI shows "Payment submitted. Your plan activates when Razorpay confirms it."
4. Razorpay POSTs `/api/payments/webhook` with `x-razorpay-signature`. Server computes HMAC-SHA256 over the raw body and rejects a bad signature with 401 before trusting any field. On `payment.captured`/`order.paid` it verifies the order row exists, amount and currency match, marks the order paid, and upserts `user_subscriptions` keyed by `user_id` with the captured `payment_id`. Duplicate events are no-ops.
5. Frontend fetches `/api/account/plan` (authenticated) on load and after checkout closes. Only a response with an active entitlement changes `planTier`. Until then, gated features stay locked and copy remains "awaiting confirmation".
6. Free tier remains a direct client choice; it is not a payment.

## Frontend decisions

- Delete the fake checkout UI: SVG QR, hardcoded VPA `student@okhdfcbank`, test card `4111…1111`, expiry/CVV inputs, "TEST GATEWAY", "Verified" badge, `setTimeout` confirmation, confetti-on-fake-success, and all "Payment verified" / "Razorpay Certified" / PCI claims.
- Add a small shared payment API/checkout module rather than duplicating Razorpay setup in three components. It injects the checkout opener for tests.
- `SubscriptionPlanModal`, `PlanSelectionLandingPage`, and `FeatureGateModal` call the same paid-tier checkout callback. `App.tsx` stops writing paid tiers itself; it applies a tier only from `/api/account/plan`.
- The user profile's local `planTier` may be used as a cache for display, but a paid value is overwritten by the server response on every load; never trusted for gating decisions before that response.

## Server decisions

- `server/config/index.ts` gains the three Razorpay env values; `.env.example` documents them and `VITE_RAZORPAY_KEY_ID`.
- `server/middleware/index.ts` enables raw-body capture on `express.json` for webhook signature verification.
- `server/lib/razorpay.ts` wraps Razorpay order creation with a narrow injectable interface; empty credentials throw only on use, not at import.
- `server/lib/serverAdmin.ts` (or extend `supabaseAdmin.ts`) exposes a lazy service-role client for table reads/writes with narrow interfaces so tests need no network.
- `server/routes/payments.ts` exposes order creation (authenticated) and webhook (signature-verified, idempotent). `server/routes/account.ts` exposes `/api/account/plan` (authenticated, read-only). Both mount without touching AI or recruiter routes.

## Testing strategy

- Webhook: valid signature accepts; bad/missing signature 401; malformed body 400; unrelated event ignored; unknown order rejected; amount/tier mismatch rejected; duplicate event does not double-insert; captured payment upserts entitlement.
- Orders: unauthenticated 401; unknown tier rejected; amount comes from server catalog, never request body; order row persisted with user id from auth, never from body.
- Account plan: unauthenticated 401; free user gets free; active entitlement gets exact tier/status.
- Frontend static tests: no `setTimeout`-based verification, no hardcoded test card/test VPA, no client-side "Payment verified" string, no direct paid-tier writes in the three unlock paths.
- Frontend behavior test with injected checkout/fetch: dismissing checkout or a client-side success callback does not call `onUpgrade`; only an active `/api/account/plan` response does.

## What is left to the builder

- File names, component props, and exact function signatures (the implementation plan will pin these).
- Whether to display a one-time polling loop after checkout or rely on manual refresh — plan will choose a bounded poll and say so.
- Exact UI copy for the awaiting-confirmation state (must not claim verification).
- Owner actions outside this repo: apply the DDL, set the three server secrets and the public key, configure Razorpay webhook URL to `/api/payments/webhook`, and set RLS so clients cannot write entitlement tables.
