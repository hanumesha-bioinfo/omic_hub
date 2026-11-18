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
