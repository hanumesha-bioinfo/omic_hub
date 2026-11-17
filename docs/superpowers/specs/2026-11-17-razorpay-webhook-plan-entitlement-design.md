# Real Razorpay Checkout with Webhook-Verified Plan Entitlement

Status: approved by the partner on 2026-11-17. Partner rulings: one-time ₹49 charge (no trial/recurring); catalog is exactly Free + Premium; no downgrade from a paid tier.

## Intent and why

`src/components/SubscriptionPlanModal.tsx:67-87` currently waits on `setTimeout`, fires confetti, and announces "Payment verified" for a hardcoded test card and an SVG QR code. Paid plan state is then written client-side. The same bypass exists in `PlanSelectionLandingPage` and `FeatureGateModal`, and in `App.tsx` `handleSelectPlan`/`handleUpgradeFromGate`, which set `planTier: 'trial'` and `hasSelectedPlan: true` in React state and localStorage. Anyone can unlock paid features for free.

The fix must make a server-verified Razorpay webhook the only thing that activates Premium, and remove every client-side claim of verification.

## Goals

- Real Razorpay checkout opened from the browser with a server-created order.
- Server verifies the webhook HMAC over the raw body with `RAZORPAY_WEBHOOK_SECRET`; only a verified `payment.captured`/`order.paid` event writes an entitlement.
- Entitlement lives in Supabase (`razorpay_orders`, `user_subscriptions`), read through an authenticated `/api/account/plan` route with the service-role key.
- Catalog is exactly two tiers: `free` (₹0, no payment) and `premium` (one-time ₹49). Delete the ₹9 Basic Plus tier and all trial/recurring copy.
- Premium entry points (subscription modal, post-sign-in plan page, feature gate) route through checkout; free remains a direct client choice.
- The UI never says "verified", "activated", or "payment successful" based on client state. It says "payment submitted, awaiting confirmation" until `/api/account/plan` reports Premium.
- Once the server reports Premium, Free and upgrade CTAs are hidden; there is no downgrade, revocation, or refund flow. The server entitlement always wins.
- TDD with injected fakes; no live Razorpay calls in tests.

## Non-goals

- No recurring billing, trial lifecycle, coupons, proration, refunds, cancellation, or downgrade/revocation.
- No changes to student/recruiter auth, role middleware, Google OAuth, or `/api/ai/*`.
- No applying migrations or touching production data in this environment. DDL is documented for the owner to apply.
- No storing Razorpay secrets in any `VITE_` variable; only the public key is browser-visible.
- No unverified compliance/security claims in UI copy.

## Constraints

- Browser can only ever see `VITE_RAZORPAY_KEY_ID` (public key). `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` are server-only, non-prefixed.
- The server already has non-prefixed `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` and a lazy admin verifier. Importing server modules with empty env must remain safe.
- Raw webhook body must be available for HMAC verification before JSON parsing.
- `npm test` = `tsx --test tests/*.test.ts`; `npm run lint` = `tsc --noEmit`; `npm run build` = `vite build`.
- Known accepted baseline: `npm run lint` has 13 pre-existing errors in `src/services/storage/upload.ts`; acceptance is zero new errors in changed files.
- No git remote is configured; no push/PR is part of this work.

## Approaches considered

1. **Supabase `user_subscriptions` + `razorpay_orders` tables (chosen).** Webhook writes authoritative entitlement; frontend reads it over an authenticated API. Durable, auditable, revocable by the owner. Costs one owner-applied migration and two new server routes.
2. **Add plan columns to `profiles`.** Fewer tables, but entangles entitlement with identity and still needs a migration; hard to keep an order/payment audit trail. Rejected.
3. **Server-signed entitlement token, no DB.** No migration, but revocation and audit are weak and the UI's cached plan can drift. Rejected for real money.

## Data model (DDL to hand to owner, not applied here)

```sql
create table if not exists public.razorpay_orders (
  order_id text primary key,
  user_id uuid not null,
  tier text not null check (tier in ('premium')),
  amount_paise integer not null,
  currency text not null default 'INR',
  status text not null default 'created' check (status in ('created','paid','failed')),
  payment_id text,
  created_at timestamptz not null default now()
);

create table if not exists public.user_subscriptions (
  user_id uuid primary key,
  tier text not null check (tier in ('premium')),
  status text not null default 'active' check (status in ('active','revoked')),
  order_id text not null references public.razorpay_orders(order_id),
  payment_id text not null unique,
  updated_at timestamptz not null default now()
);
```

Service-role only in practice; the browser never reads or writes them directly. No policy may let a client grant itself an entitlement.

## Request/response flow

1. User picks Premium. Frontend POSTs `/api/payments/orders` with `{ tier: 'premium' }` and the Supabase access token.
2. Server `requireAuth` resolves identity from JWT + DB profile. It rejects unknown tiers, uses the server-side price catalog (`premium: 4900` paise, `INR`), creates a Razorpay order with `notes: { user_id, tier: 'premium' }`, stores the order row, and returns `{ orderId, amountPaise: 4900, currency: 'INR', keyId }`. Amount is never read from the request body.
3. Frontend loads the Razorpay checkout script on demand and opens checkout with those values. No handler activates a tier; dismissal/failure only clears busy state. On checkout close the UI shows "Payment submitted. Your plan activates when Razorpay confirms it."
4. Razorpay POSTs `/api/payments/webhook` with `x-razorpay-signature`. Server computes HMAC-SHA256 over the raw body and rejects a bad signature with 401 before trusting any field. On `payment.captured`/`order.paid` it looks up the stored order by `order_id` and rejects a missing order, a `notes.user_id` mismatch, a tier other than `premium`, or an amount/currency mismatch. It marks the order paid and upserts `user_subscriptions` with the captured `payment_id`. Duplicate events are no-ops.
5. Frontend fetches `/api/account/plan` (authenticated) on load and after checkout closes. Only an active Premium entitlement changes the client tier. Until then, gated features stay locked and copy remains "awaiting confirmation".
6. Once Premium is active, Free and upgrade CTAs are hidden everywhere; a stale local `free` value is overwritten by the server response on every load.

## Frontend decisions

- Change `SubscriptionPlanTier` to `'free' | 'premium'` and migrate every reference; delete the `plus`/`pro`/`trial` terminology from plan UI.
- Delete the fake checkout UI: SVG QR, hardcoded VPA `student@okhdfcbank`, test card `4111…1111`, expiry/CVV inputs, "TEST GATEWAY", "Verified" badge, `setTimeout` confirmation, confetti-on-fake-success, and all "Payment verified" / "Razorpay Certified" / PCI / "3 months free" / recurring-price copy.
- Rewrite pricing copy to state the actual one-time charge: Free ₹0, Premium ₹49 once. No "₹0 today", no "then ₹X/month".
- Add one shared payment API/checkout module rather than duplicating Razorpay setup in three components; inject the checkout opener for tests.
- `SubscriptionPlanModal`, `PlanSelectionLandingPage`, and `FeatureGateModal` call the same Premium checkout callback. `App.tsx` stops writing paid tiers itself; it applies a tier only from `/api/account/plan`.
- The local `planTier` is a display cache only; a Premium value from the server always overrides it before gating decisions.

## Server decisions

- `server/config/index.ts` gains the three Razorpay env values; `.env.example` documents them plus `VITE_RAZORPAY_KEY_ID`.
- `server/middleware/index.ts` enables raw-body capture on `express.json` for webhook signature verification.
- `server/lib/razorpay.ts` wraps Razorpay order creation with a narrow injectable interface; empty credentials throw only on use, not at import.
- `server/lib/serverAdmin.ts` exposes a lazy service-role client for table reads/writes with narrow interfaces so tests need no network.
- `server/routes/payments.ts` exposes order creation (authenticated) and webhook (signature-verified, idempotent). `server/routes/account.ts` exposes `/api/account/plan` (authenticated, read-only). Both mount without touching AI or recruiter routes.

## Testing strategy

- Webhook: valid signature accepts; bad/missing signature 401; malformed body 400; unrelated event ignored; unknown order rejected; `notes.user_id`, tier, amount, or currency mismatch rejected; duplicate event does not double-insert; captured payment upserts entitlement.
- Orders: unauthenticated 401; unknown tier rejected; amount comes from server catalog, never request body; order row persisted with user id from auth.
- Account plan: unauthenticated 401; free user gets free; active entitlement gets Premium.
- Frontend static tests: no `setTimeout`-based verification, no hardcoded test card/VPA, no client-side "Payment verified" string, no direct Premium writes in the three unlock paths, no trial/recurring copy.
- Frontend behavior test with injected checkout/fetch: dismissing checkout or a client-side success callback does not call `onUpgrade`; only an active `/api/account/plan` response does.

## What is left to the builder

- File names, component props, and exact function signatures (the implementation plan pins these).
- Bounded polling after checkout vs manual refresh — plan will choose and state it.
- Exact awaiting-confirmation copy (must not claim verification).
- Owner actions outside this repo: apply the DDL, set three server secrets and the public key, point the Razorpay webhook at `/api/payments/webhook`, and set RLS so clients cannot write entitlement tables.
