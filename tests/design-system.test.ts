import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
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

test('student and recruiter dashboards use brand accents', () => {
  const student = readSource('src/components/DashboardView.tsx');
  const recruiter = readSource('src/components/Recruiter/RecruiterDashboardView.tsx');
  assert.match(student, /(brand|bio|ai)-[0-9]/);
  assert.match(recruiter, /(brand|bio|ai)-[0-9]/);
});

test('legacy unused source files are removed', () => {
  for (const file of [
    'src/App.tsx.backup',
    'src/App.tsx.before-recovery',
    'src/components/SignInPage.tsx.bak',
    'src/components/SignInPage.tsx.backup',
    'src/components/Navbar.tsx',
  ]) {
    assert.equal(existsSync(path.join(repoRoot, file)), false, `${file} should be removed`);
  }
});

test('package is named omic-hub', () => {
  const pkg = JSON.parse(readSource('package.json')) as { name: string };
  assert.equal(pkg.name, 'omic-hub');
});

test('README documents OMIC HUB setup instead of AI Studio', () => {
  const readme = readSource('README.md');
  assert.doesNotMatch(readme, /AI Studio/);
  for (const heading of ['OMIC HUB', 'Quick start', 'Environment', 'Deploy']) {
    assert.match(readme, new RegExp(heading, 'i'), `README should contain ${heading}`);
  }
});

test('env example lists every server and client variable the code reads', () => {
  const env = readSource('.env.example');
  for (const key of [
    'PUBLIC_APP_URL',
    'PORT',
    'HOST',
    'CERTIFICATE_SIGNING_SECRET',
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_PUBLISHABLE_KEY',
    'VITE_API_BASE_URL',
  ]) {
    assert.match(env, new RegExp(key), `.env.example should list ${key}`);
  }
});

test('server no longer logs the legacy TalentForge name', () => {
  assert.doesNotMatch(readSource('server/index.ts'), /TalentForge/);
});
