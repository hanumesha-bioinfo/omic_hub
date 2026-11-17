import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

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
