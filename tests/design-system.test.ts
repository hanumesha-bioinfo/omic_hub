import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readSource(relativePath: string): string {
  return readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

const css = readSource('src/index.css');
const html = readSource('index.html');

test('index.css defines a @theme token layer', () => {
  assert.match(css, /@theme\s*\{/);
});

test('theme defines the navy-tinted neutral scale', () => {
  assert.match(css, /--color-neutral-950\s*:/);
});

test('theme defines brand, bio and AI accent tokens', () => {
  assert.match(css, /--color-brand-500\s*:/);
  assert.match(css, /--color-bio-500\s*:/);
  assert.match(css, /--color-ai-500\s*:/);
});

test('theme defines font, radius and shadow tokens', () => {
  assert.match(css, /--font-sans\s*:/);
  assert.match(css, /--font-mono\s*:/);
  assert.match(css, /--radius-card\s*:/);
  assert.match(css, /--shadow-card\s*:/);
});

test('html loads Inter and JetBrains Mono fonts', () => {
  assert.match(html, /Inter/);
  assert.match(html, /JetBrains\+Mono|JetBrains Mono/);
});

test('shared UI primitives are exported as components', async () => {
  const primitives = (await import('../src/shared/ui/primitives')) as Record<string, unknown>;
  for (const name of ['Button', 'Card', 'Badge', 'StatCard', 'SectionHeading', 'EmptyState']) {
    assert.equal(typeof primitives[name], 'function', `${name} should be a component export`);
  }
});

const sidebarSource = readSource('src/shared/layout/Sidebar.tsx');
const topHeaderSource = readSource('src/shared/layout/TopHeader.tsx');

test('sidebar uses a branded gradient logo mark', () => {
  assert.match(sidebarSource, /bg-gradient-to-br\s+from-(bio|brand)-/);
  assert.doesNotMatch(sidebarSource, /w-9 h-9 rounded-xl bg-neutral-900/);
});

test('sidebar and header use brand tokens for active states', () => {
  assert.match(sidebarSource, /bg-brand-600/);
  assert.match(topHeaderSource, /bg-brand-600/);
});

test('sidebar preserves premium gating and semantic badge meanings', () => {
  assert.match(sidebarSource, /isInterviewLocked/);
  assert.match(sidebarSource, /isAuditLocked/);
  assert.match(sidebarSource, /₹49 Premium/);
  assert.match(sidebarSource, /text-amber-/);
  assert.match(sidebarSource, /emerald/);
  assert.match(sidebarSource, /Live Sync/);
});

test('header preserves no-print and responsive layout classes', () => {
  assert.match(topHeaderSource, /no-print/);
  assert.match(topHeaderSource, /backdrop-blur/);
});

test('sign-in and pricing views use brand accents', () => {
  const signIn = readSource('src/features/auth/components/SignInPage.tsx');
  const pricing = readSource('src/components/PlanSelectionLandingPage.tsx');
  assert.match(signIn, /(brand|bio|ai)-[0-9]/);
  assert.match(pricing, /(brand|bio|ai)-[0-9]/);
});
