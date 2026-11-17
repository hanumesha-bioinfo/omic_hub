import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { createPlanAuthority, resolveAuthoritativeTier } from '../src/services/api/planAuthority';
import type { CheckoutOpener, PaymentOrder, VerifiedPlan } from '../src/services/api/payments';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readSource(relativePath: string): string {
  return readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

const planUiFiles = [
  'src/components/SubscriptionPlanModal.tsx',
  'src/components/PlanSelectionLandingPage.tsx',
  'src/components/FeatureGateModal.tsx',
];

test('plan tier type exposes only free and premium', () => {
  const source = readSource('src/types.ts');
  assert.match(source, /export type SubscriptionPlanTier = 'free' \| 'premium';/);
});

test('storage defaults start users on the free plan without a trial', () => {
  const source = readSource('src/services/storage/defaults.ts');
  assert.match(source, /planTier:\s*'free'/);
  assert.doesNotMatch(source, /planStatus:\s*'trial'|trialEndDate/);
});

test('plan UI keeps no legacy tier literals, trial, recurring or test-payment copy', () => {
  for (const file of planUiFiles) {
    const source = readSource(file);

    assert.doesNotMatch(
      source,
      /['"`](?:basic|plus|pro)['"`]/i,
      `${file}: legacy tier literal remains`,
    );
    assert.doesNotMatch(
      source,
      /\b(?:basic plus|pro tier|pro plan|plus plan)\b/i,
      `${file}: legacy tier name remains`,
    );
    assert.doesNotMatch(
      source,
      /3\s*(?:months?|mo)\b[^<]{0,24}\bfree\b/i,
      `${file}: "3 months free" copy remains`,
    );
    assert.doesNotMatch(
      source,
      /\bfree\b[^<]{0,24}3\s*(?:months?|mo)\b/i,
      `${file}: "free for 3 months" copy remains`,
    );
    assert.doesNotMatch(source, /\btrial\b/i, `${file}: trial copy remains`);
    assert.doesNotMatch(
      source,
      /\/\s*(?:month|mo)\b|\bper month\b/i,
      `${file}: recurring price copy remains`,
    );
    assert.doesNotMatch(source, /₹9(?!\d)/, `${file}: ₹9 price remains`);
    assert.doesNotMatch(
      source,
      /4111|test card|okhdfcbank|test gateway/i,
      `${file}: hardcoded test payment detail remains`,
    );
  }
});

test('plan UI prices Free at zero and Premium as a one-time ₹49 charge', () => {
  for (const file of planUiFiles) {
    const source = readSource(file);

    assert.match(source, /Free[\s\S]{0,300}₹0/i, `${file}: Free is not ₹0`);
    assert.match(source, /Premium[\s\S]{0,300}₹49/i, `${file}: Premium is not ₹49`);
    assert.match(
      source,
      /₹49[\s\S]{0,120}(?:once|one-time)/i,
      `${file}: Premium must be stated as a one-time ₹49 charge`,
    );
  }
});

test('SubscriptionPlanModal has no fake checkout timers, confetti or fake verification copy', () => {
  const source = readSource('src/components/SubscriptionPlanModal.tsx');
  assert.doesNotMatch(source, /setTimeout/);
  assert.doesNotMatch(source, /confetti/);
  assert.doesNotMatch(source, /Payment verified|verification successful|payment successful/i);
  assert.doesNotMatch(source, /QRCode|upi_qr|vpa|test card/i);
});

test('all three plan components route Premium to the shared onCheckout callback', () => {
  for (const file of planUiFiles) {
    const source = readSource(file);
    assert.match(source, /onCheckout/, `${file}: no onCheckout checkout callback`);
    assert.match(source, /onCheckout\(\)/, `${file}: Premium button does not invoke onCheckout`);
  }
});

test('App.tsx reads the server-verified plan and applies its tier before gating', () => {
  const source = readSource('src/App.tsx');
  assert.match(source, /fetchVerifiedPlan/, 'App.tsx does not fetch the verified plan');
  assert.match(source, /resolveAuthoritativeTier/, 'App.tsx does not resolve the authoritative tier');
  assert.match(source, /applyServerTier/, 'App.tsx does not apply the server tier');
  assert.match(source, /onCheckout=\{handleCheckout\}/, 'App.tsx does not wire checkout');
});

test('only an active premium server plan resolves to the premium tier', () => {
  assert.equal(resolveAuthoritativeTier({ tier: 'premium', active: true }), 'premium');
  assert.equal(resolveAuthoritativeTier({ tier: 'premium', active: false }), 'free');
  assert.equal(resolveAuthoritativeTier({ tier: null, active: false }), 'free');
});

test('a client-side checkout close does not grant premium; only the verified plan does', async () => {
  const order: PaymentOrder = {
    orderId: 'order_authority',
    amountPaise: 4900,
    currency: 'INR',
    keyId: 'rzp_test_key',
  };
  let upgradeCalls = 0;
  const applyTier = (tier: string) => {
    if (tier === 'premium') upgradeCalls += 1;
  };
  let plan: VerifiedPlan = { tier: null, active: false };
  let closes = 0;

  const openCheckout: CheckoutOpener = (_options, callbacks) => {
    // Simulate the user closing the Razorpay modal without a verified webhook yet.
    closes += 1;
    callbacks.onClose();
  };

  const authority = createPlanAuthority({
    fetchVerifiedPlan: async () => plan,
    requestOrder: async () => order,
    openCheckout,
  });

  const afterClose = await authority.checkout();
  assert.equal(closes, 1);
  assert.equal(afterClose, 'free');
  applyTier(afterClose);
  assert.equal(upgradeCalls, 0, 'checkout close must not activate premium');

  // The webhook has now verified payment; the same flow reads an active plan.
  plan = { tier: 'premium', active: true };
  const afterVerified = await authority.checkout();
  assert.equal(afterVerified, 'premium');
  applyTier(afterVerified);
  assert.equal(upgradeCalls, 1, 'only the verified active plan may activate premium');
});
