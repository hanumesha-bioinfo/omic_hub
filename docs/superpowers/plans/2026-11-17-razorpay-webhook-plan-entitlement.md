# Razorpay Webhook Plan Entitlement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace fake client-side payment confirmation with Razorpay checkout whose Premium entitlement is written only by a verified server webhook.

**Architecture:** A shared frontend checkout module creates an order through an authenticated server route, opens Razorpay, and never claims success. A server webhook verifies the HMAC over the raw body, cross-checks the stored order, and upserts Supabase entitlement tables. The frontend reads the authoritative plan from `/api/account/plan` and hides paid-tier actions once Premium is active.

**Tech Stack:** React 19 + TypeScript, Express 4, Supabase service role, Razorpay Orders REST API, `node:crypto`, `tsx --test`.

**Spec:** docs/superpowers/specs/2026-11-17-razorpay-webhook-plan-entitlement-design.md

## Global Constraints

- Catalog is exactly two tiers: `free` and `premium`; Premium is a one-time ₹49 (4900 paise) charge. No Basic Plus, trial, recurring, refund, cancellation, or downgrade flow.
- Never claim verification, activation, or payment success from client state. Only `/api/account/plan` may change the client's paid tier.
- Browser sees only `VITE_RAZORPAY_KEY_ID`; server-only `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` are non-prefixed.
- Server modules must be safe to import with empty env: create real clients lazily; throw only on use.
- Webhook HMAC is computed over the captured raw body before JSON parsing; bad signature is 401 before any payload field is trusted.
- Order amount and currency come from the server catalog (`4900`, `INR`) and are cross-checked against the stored row; no amount is accepted from the browser.
- Entitlement is written only by the webhook; browser code never writes `user_subscriptions` or `razorpay_orders`.
- Do not change student/recruiter auth, `server/routes/ai.ts`, `/api/ai/*`, Google OAuth, or production data. No migrations are applied here.
- `npm test` = `tsx --test tests/*.test.ts`; `npm run lint` = `tsc --noEmit`; `npm run build` = `vite build`.
- Baseline lint has 13 pre-existing errors in `src/services/storage/upload.ts`; acceptance is zero new errors in changed files. Do not fix upload.ts.
- Full `npm test` is used for RED/GREEN; the tsx version rejects `--test-name-pattern` (parses it as a file path).
- Do not run `npm install` or modify package.json/package-lock.json.

## Review Focus

- A forged browser response claiming Premium must never unlock features — pinned by Task 7's injected-checkout test and Task 1's `startPremiumCheckout` test (no activation callback).
- A webhook with a bad signature or mismatched amount/tier/user must not write entitlement — pinned by Task 4's signature and mismatch tests.
- A replayed captured-payment event must not duplicate or re-grant entitlement — pinned by Task 4's duplicate-event test.
- An unauthenticated caller must not create orders or read a plan — pinned by Task 3 and Task 5's 401 tests.
- A returning Premium user must not see stale Free gating or a Free/downgrade action — pinned by Task 7's server-wins and hidden-CTA tests.

---

### Task 1: Frontend payment client and checkout seam

**Files:**
- Create: `src/services/api/payments.ts`
- Test: `tests/payment-client.test.ts` (new)

**Interfaces:**
- Consumes: `supabase` from `src/lib/supabase`; `SubscriptionPlanTier` from `src/types`.
- Produces:
  - `PaymentOrder { orderId: string; amountPaise: number; currency: 'INR'; keyId: string }`
  - `VerifiedPlan { tier: SubscriptionPlanTier | null; active: boolean }`
  - `CheckoutOpener(options: { orderId: string; amountPaise: number; currency: 'INR'; keyId: string; name: string; description: string }, callbacks: { onClose: () => void }): void`
  - `requestPremiumOrder(deps?: { fetcher?: typeof fetch; getToken?: () => Promise<string | null> }): Promise<PaymentOrder>`
  - `fetchVerifiedPlan(deps?): Promise<VerifiedPlan>`
  - `startPremiumCheckout(deps?: { requestOrder?: typeof requestPremiumOrder; openCheckout?: CheckoutOpener }): Promise<'submitted'>`

- [ ] **Step 1: Write failing tests in `tests/payment-client.test.ts`**

Test with injected fake `fetcher`, `getToken`, and `openCheckout`:
- `requestPremiumOrder` POSTs `/api/payments/orders` with JSON body exactly `{ tier: 'premium' }`, includes an `Authorization: Bearer ...` header, and returns the exact `PaymentOrder` from the response.
- It rejects a non-OK response.
- `fetchVerifiedPlan` GETs `/api/account/plan` with the bearer token and returns the exact `VerifiedPlan` body; rejects a non-OK response.
- `startPremiumCheckout` requests one order, opens checkout once with that `orderId`/`amountPaise`/`currency`/`keyId`, resolves `'submitted'`, and never invokes any activation callback.
- `openCheckout` failure (throwing) propagates without returning `'submitted'`.

- [ ] **Step 2: Run `npm test`; expected FAIL because the module does not exist.**

- [ ] **Step 3: Implement `src/services/api/payments.ts`**

Keep `getToken` backed by `supabase.auth.getSession()`. Do not load Razorpay here; the injected `CheckoutOpener` is supplied by Task 7. Do not hardcode or log secrets. Do not call any `onUpgrade`-like callback.

- [ ] **Step 4: Run `npm test`; expected all tests pass.**

- [ ] **Step 5: Commit**

```bash
git add src/services/api/payments.ts tests/payment-client.test.ts
git commit -m "feat: add injectable payment API client"
```

---

### Task 2: Server payment config, plan store, and raw body capture

**Files:**
- Modify: `server/config/index.ts`
- Modify: `server/middleware/index.ts`
- Create: `server/lib/serverAdmin.ts`
- Test: `tests/server-payments.test.ts` (new)

**Interfaces:**
- Consumes: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` from `server/config`; `createClient` from `@supabase/supabase-js`.
- Produces:
  - `PlanStore.createOrder(row: { orderId: string; userId: string; tier: 'premium'; amountPaise: number; currency: 'INR' }): Promise<void>`
  - `PlanStore.getOrder(orderId: string): Promise<{ orderId: string; userId: string; tier: string; amountPaise: number; currency: string; status: string } | null>`
  - `PlanStore.markOrderPaid(orderId: string, paymentId: string): Promise<void>`
  - `PlanStore.getEntitlement(userId: string): Promise<{ tier: string; status: string } | null>`
  - `PlanStore.upsertEntitlement(row: { userId: string; tier: 'premium'; orderId: string; paymentId: string }): Promise<void>`
  - `createPlanStore(client: SupabaseTableClient): PlanStore`
  - `planStore: PlanStore` — lazy, safe to import with empty env.

- [ ] **Step 1: Write failing tests**

Fake `SupabaseTableClient` records table/select/eq/insert/update/upsert calls. Assert:
- `createPlanStore(client).createOrder(...)` inserts into `razorpay_orders` with the exact row.
- `getOrder('order_1')` filters by `order_id` and returns the row; returns `null` for no row.
- `markOrderPaid('order_1', 'pay_1')` sets `status:'paid'` and `payment_id:'pay_1'`.
- `getEntitlement('uuid-1')` filters by `user_id`.
- `upsertEntitlement(...)` writes the exact entitlement row with `status:'active'`.
- Importing `server/lib/serverAdmin.ts` with empty env does not throw (import the module in the test).

- [ ] **Step 2: Run `npm test`; expected FAIL.**

- [ ] **Step 3: Implement config/store/raw body**

Add `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` as `process.env.X || ''` in config. In `server/middleware/index.ts`, extend `express.json` with a `verify` hook that stores `req.rawBody = buf.toString('utf8')`. Implement `server/lib/serverAdmin.ts` with a narrow structural client interface and a lazy proxy for `planStore` (real client created on first method call).

- [ ] **Step 4: Run `npm test`; expected pass.**

- [ ] **Step 5: Commit**

```bash
git add server/config/index.ts server/middleware/index.ts server/lib/serverAdmin.ts tests/server-payments.test.ts
git commit -m "feat: add payment store and webhook raw body capture"
```

---

### Task 3: Razorpay order client and authenticated order route

**Files:**
- Create: `server/lib/razorpay.ts`
- Create: `server/routes/payments.ts`
- Modify: `server/routes/index.ts`
- Test: `tests/server-payments.test.ts`

**Interfaces:**
- Consumes: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` from config; `planStore`; `createRequireAuth`.
- Produces:
  - `RazorpayOrdersClient.createOrder(input: { amount: number; currency: string; receipt: string; notes: Record<string, string> }): Promise<{ id: string }>`
  - `razorpayClient: RazorpayOrdersClient` — lazy, import-safe.
  - `createOrderRouter(deps: { requireAuth: RequestHandler; razorpay: RazorpayOrdersClient; store: PlanStore; keyId: string }): Router`
  - `orderRouter` built from real deps; mounted at `/api/payments`.

- [ ] **Step 1: Write failing tests**

Using a fresh Express app and loopback `listen(0)`/`fetch`/`close in finally`, with a fake `requireAuth` that sets `req.auth = { userId: 'uuid-1', ... }`, fake `razorpay`, fake `store`:
- POST `/api/payments/orders` without auth returns 401 `{ error: 'Unauthorized' }`.
- `{ tier: 'plus' }` returns 400 with an error body.
- `{ tier: 'premium' }` creates a Razorpay order with `amount: 4900`, `currency: 'INR'`, `notes: { user_id: 'uuid-1', tier: 'premium' }`.
- It stores an order row with `userId` from auth, never from the request body (send a conflicting `userId` in the body and assert it is ignored).
- It returns exactly `{ orderId: <fake id>, amountPaise: 4900, currency: 'INR', keyId: <injected key> }`.
- Razorpay failure returns 502 without writing an order row.

- [ ] **Step 2: Run `npm test`; expected FAIL.**

- [ ] **Step 3: Implement client and route**

Use fetch against `https://api.razorpay.com/v1/orders` with Basic auth from lazy config. Use `createRequireAuth(adminVerifier)` for the real router. Mount with `app.use('/api/payments', orderRouter)` after the existing routers; do not touch AI or recruiter routes.

- [ ] **Step 4: Run `npm test`; expected pass.**

- [ ] **Step 5: Commit**

```bash
git add server/lib/razorpay.ts server/routes/payments.ts server/routes/index.ts tests/server-payments.test.ts
git commit -m "feat: create verified Razorpay orders"
```

---

### Task 4: Signature-verified idempotent webhook

**Files:**
- Modify: `server/routes/payments.ts`
- Modify: `.env.example`
- Test: `tests/server-payments.test.ts`

**Interfaces:**
- Produces:
  - `verifyWebhookSignature(rawBody: string, signature: string | undefined, secret: string): boolean`
  - `createWebhookHandler(deps: { store: PlanStore; secret: string }): RequestHandler`

- [ ] **Step 1: Write failing tests**

Post to the mounted webhook with `Content-Type: application/json` and `x-razorpay-signature`. Use `createHmac('sha256', 'test_webhook_secret')` to sign the exact raw JSON string. Assert:
- Valid `payment.captured` for a stored `premium` order with matching `amount: 4900`, `currency: 'INR'`, and `notes.user_id === 'uuid-1'` returns 200, marks the order paid, and upserts entitlement with `payment_id`.
- Missing or invalid signature returns 401 `{ error: 'Unauthorized' }` with no store writes.
- Malformed JSON with a valid signature returns 400.
- Unrelated event (`payment.failed`) returns 200 with no writes.
- Unknown `order_id`, wrong `notes.user_id`, wrong tier, wrong amount, or wrong currency each returns 400 with no writes.
- Repeating the identical valid event twice results in one entitlement upsert and one `markOrderPaid` call (idempotent by `payment_id`/order status).

- [ ] **Step 2: Run `npm test`; expected FAIL.**

- [ ] **Step 3: Implement verification and handler**

Verify HMAC against `req.rawBody` with `timingSafeEqual` before parsing. Parse only after verification. Cross-check the stored order and ignore duplicate captured events for an already-paid order. Document the webhook URL and the three server env vars plus `VITE_RAZORPAY_KEY_ID` in `.env.example`.

- [ ] **Step 4: Run `npm test`; expected pass.**

- [ ] **Step 5: Commit**

```bash
git add server/routes/payments.ts .env.example tests/server-payments.test.ts
git commit -m "feat: verify Razorpay webhook and grant premium"
```

---

### Task 5: Authenticated authoritative plan read

**Files:**
- Create: `server/routes/account.ts`
- Modify: `server/routes/index.ts`
- Test: `tests/server-payments.test.ts`

**Interfaces:**
- Produces: `createAccountRouter(deps: { requireAuth: RequestHandler; store: PlanStore }): Router`; `accountRouter` real instance mounted at `/api/account`.

- [ ] **Step 1: Write failing tests**

- GET `/api/account/plan` without auth → 401 `{ error: 'Unauthorized' }`.
- With auth and `store.getEntitlement` returning `null` → 200 `{ tier: null, active: false }`.
- With `{ tier: 'premium', status: 'active' }` → 200 `{ tier: 'premium', active: true }`.
- With `{ tier: 'premium', status: 'revoked' }` → 200 `{ tier: null, active: false }`.
- Store error → 500 `{ error: 'Unable to load plan' }`.

- [ ] **Step 2: Run `npm test`; expected FAIL.**

- [ ] **Step 3: Implement route**

Read `req.auth.userId`; never accept a user id from query or body. Mount with `app.use('/api/account', accountRouter)`.

- [ ] **Step 4: Run `npm test`; expected pass.**

- [ ] **Step 5: Commit**

```bash
git add server/routes/account.ts server/routes/index.ts tests/server-payments.test.ts
git commit -m "feat: add authoritative plan endpoint"
```

---

### Task 6: Two-tier type and copy migration

**Files:**
- Modify: `src/types.ts`, `src/services/storage/defaults.ts`, `src/App.tsx`, `src/components/SubscriptionPlanModal.tsx`, `src/components/PlanSelectionLandingPage.tsx`, `src/components/FeatureGateModal.tsx`, `src/components/ProfileSettingsModal.tsx`, `src/shared/layout/Sidebar.tsx`, `src/components/ResumeBuilder/ATSAndResumeView.tsx`, `src/components/SkillPaths/SkillPathsView.tsx`, `tests/auth-ux.test.ts`
- Test: `tests/plan-copy.test.ts` (new)

**Interfaces:**
- Consumes: `SubscriptionPlanTier` from `src/types`.
- Produces: `SubscriptionPlanTier = 'free' | 'premium'` everywhere; no `plus`/`pro` tier values remain in plan code.

- [ ] **Step 1: Write failing static tests in `tests/plan-copy.test.ts`**

- `src/types.ts` contains `SubscriptionPlanTier = 'free' | 'premium'`.
- The plan UI files above contain no `'plus'` or `'pro'` tier literals, no `3 months free`, no `/ month`, no `₹9`, no `trial` copy, and no hardcoded test card/VPA.
- Free is ₹0 and Premium is ₹49 in the three plan UI files.

- [ ] **Step 2: Run `npm test`; expected FAIL.**

- [ ] **Step 3: Migrate types, defaults, and copy**

Map old `basic` → `free`, old `pro` → `premium`, delete the Basic Plus card/option, remove all `planStatus:'trial'`/`trialEndDate` writes in plan handlers, set storage default `planTier:'free'`, and make UI copy state the one-time ₹49 Premium charge. Keep existing local handlers unchanged in this task; Task 7 replaces them.

- [ ] **Step 4: Run `npm test`; expected pass. Also run `npm run lint` and report no new errors.**

- [ ] **Step 5: Commit**

```bash
git add src tests/plan-copy.test.ts
git commit -m "refactor: simplify plans to free and premium"
```

---

### Task 7: Real checkout wiring and server-authoritative UI

**Files:**
- Modify: `src/components/SubscriptionPlanModal.tsx`, `src/components/PlanSelectionLandingPage.tsx`, `src/components/FeatureGateModal.tsx`, `src/App.tsx`
- Create: `src/services/api/razorpayCheckout.ts`
- Test: `tests/payment-client.test.ts`, `tests/plan-copy.test.ts`

**Interfaces:**
- Consumes: `startPremiumCheckout`, `fetchVerifiedPlan` from Task 1; `SubscriptionPlanTier = 'free' | 'premium'`.
- Produces: `loadRazorpayCheckout()` opener; `SubscriptionPlanModalProps.onCheckout: () => Promise<void>`; `onSelectPlan`/`onUpgrade` accept only `'free'` after this task.

- [ ] **Step 1: Write failing tests**

- Extend `tests/payment-client.test.ts`: with an injected checkout opener that calls its `onClose` callback, assert `startPremiumCheckout` resolves `'submitted'` and does not call any upgrade callback.
- Extend `tests/plan-copy.test.ts`: static assertions that `SubscriptionPlanModal.tsx` has no `setTimeout`, no `confetti` on payment success, no "Payment verified" string; that all three plan components call a shared checkout function for Premium; and that `App.tsx` calls `fetchVerifiedPlan` and applies its tier before gating.
- Add a behavior test with injected `fetchVerifiedPlan`/checkout: a client-side checkout close does not call `onUpgrade`; only `{ tier: 'premium', active: true }` does.

- [ ] **Step 2: Run `npm test`; expected FAIL.**

- [ ] **Step 3: Replace fake checkout and wire authority**

- `loadRazorpayCheckout()` loads the Razorpay script on demand and calls `new window.Razorpay(options).open()`.
- `SubscriptionPlanModal` deletes the entire fake gateway block (QR, VPA, test card, timers, fake success/verification copy) and its Premium button calls `onCheckout()`.
- `PlanSelectionLandingPage` and `FeatureGateModal` Premium buttons call the same checkout callback; Free remains direct.
- `App.tsx` fetches `/api/account/plan` via `fetchVerifiedPlan` on load and after checkout closes; applies Premium only from an active response; hides Free and upgrade CTAs when Premium is active; stops writing paid tiers locally.

- [ ] **Step 4: Run `npm test`; expected pass. Run `npm run lint` (accept baseline) and `npm run build`.**

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/components src/services/api/razorpayCheckout.ts tests
git commit -m "feat: activate premium only from verified plan"
```

---

### Task 8: Full verification

**Files:** none (verification plus a commit only if a fix is needed)

- [ ] **Step 1: Run `npm test`** — expect all suites pass.
- [ ] **Step 2: Run `npm run lint`** — expect only the 13 baseline `src/services/storage/upload.ts` errors; zero in changed files.
- [ ] **Step 3: Run `npm run build`** — expect Vite success (existing `__dirname`/chunk warnings are accepted).
- [ ] **Step 4: Confirm no fake-payment remnants** with `grep -RInE '4111|TEST GATEWAY|Payment verified|3 Months Free|setTimeout.*[Vv]erif' src server tests || true` — expect no output outside intentional guard-test literals.
- [ ] **Step 5: Confirm AI/recruiter routes untouched** with `git diff --stat d2c38bf HEAD -- server/routes/ai.ts server/routes/recruiter.ts src/features/auth` — expect no changes.
- [ ] **Step 6: Confirm DDL and env docs** — `docs/superpowers/specs/2026-11-17-razorpay-webhook-plan-entitlement-design.md` contains both `create table` statements and `.env.example` documents all four keys.
- [ ] **Step 7: Commit only verification-driven fixes**; otherwise report no commit.
