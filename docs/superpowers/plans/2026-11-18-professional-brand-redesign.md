# Professional Brand Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-skin OMIC HUB with a coherent professional brand (ink/navy + teal/cyan +
violet) via a single Tailwind v4 token layer and reusable UI primitives, with zero
feature or behavior changes.

**Architecture:** A `@theme` block in `src/index.css` becomes the single source of truth.
It redefines Tailwind's built-in `neutral` scale to a navy-tinted ink palette — so existing
`neutral-*` utilities across ~31k lines recolor at once — and adds explicit `--color-brand-*`
(blue/indigo), `--color-bio-*` (teal/cyan), `--color-ai-*` (violet), font, radius and shadow
tokens. New token-based primitives in `src/shared/ui/primitives.tsx` and targeted restyling
of the shell and high-traffic views layer the brand accents on top.

**Tech Stack:** React 19, TypeScript 7, Vite 8, Tailwind CSS v4 (`@theme`, no config file),
lucide-react, Node `tsx --test`.

**Spec:** `docs/superpowers/specs/2026-11-18-professional-brand-redesign.md`

## Global Constraints
- NO feature/behavior changes. Do not touch auth, roles, `/api/account/plan`, payments,
  certificates, `/verify/cert/:token`, `isFallback` provenance, or seeded/fake data.
- No new dependencies, no router, no shadcn/Radix/MUI, no major version bumps.
- Tailwind v4 only: tokens live in `@theme` in `src/index.css`; never create a
  `tailwind.config.*` or `postcss.config.*`.
- Brand colors are referenced by token name in components; no new hardcoded brand hex in
  component files.
- Preserve `docs/superpowers/plans/2026-11-17-supabase-recruiter-auth.md` byte-for-byte.
- Never commit secrets or `.env.local`; do not modify git remotes or push.
- Baseline lint = exactly 13 errors in `src/services/storage/upload.ts`; add zero new ones.
- Tests = 147/147; build succeeds with pre-existing warnings.

## Review Focus
- Light-theme readability: every restyled surface must keep adequate text contrast on white
  and on the new tinted `neutral-50/100` backgrounds (no dark text on dark navy).
- Semantic meaning: emerald=verified, amber=premium, rose=destructive must not be
  reassigned to decorative use; a free-tier user must not gain a "premium" look that
  implies entitlement.
- Locked-feature affordances: `isInterviewLocked` / `isAuditLocked` badges and gating in
  `Sidebar.tsx` must retain identical labels and click-to-upgrade behavior after restyle.
- Server-authoritative state: no visual change may imply a plan/certificate the server did
  not issue; do not restyle fake or seeded badges into "Verified" ones.
- Responsive/mobile: the sticky header, tab bar, sidebar drawer and print CSS must keep
  working (no behavior change, no broken layout at small widths).
- The vendored `@designcodeio/threeui` shader scenes must still build after font/token edits.

**Review-focus test mapping** (each line above is pinned by a task test):
- Light-theme readability → Task 1 asserts base layer uses `--color-neutral-50` background
  and `--color-neutral-900` text; Task 7 manual smoke checks contrast.
- Semantic meaning → Task 3 asserts `Sidebar.tsx` still emits `text-amber-` for the premium
  badge and `emerald` for Live Sync; Task 4 asserts the Premium card keeps amber accents.
- Locked-feature affordances → Task 3 asserts `isInterviewLocked`, `isAuditLocked`, and the
  `₹49 Premium` label still appear in `Sidebar.tsx`.
- Server-authoritative state → Task 7 `npm test` (147 auth/payment/certificate tests) plus a
  diff check that no `server/` or `src/services/api/planAuthority.ts` file changed.
- Responsive/mobile → Task 7 manual smoke at narrow width; Task 3 asserts `no-print` and
  `backdrop-blur` classes survive in `TopHeader.tsx`.
- threeui build → Task 7 `npm run build` includes the shader modules.

---

### Task 1: Design-token foundation and base styles

**Files:**
- Modify: `src/index.css:1-12` (add `@theme`, update base layer and scrollbar)
- Modify: `index.html:13` (body class uses tokens; add Inter/JetBrains Mono font links in head)
- Test: `tests/design-system.test.ts` (new)

**Interfaces:**
- Produces: `@theme` custom properties `--color-neutral-{50..950}`, `--color-brand-{50..600}`,
  `--color-bio-{50..600}`, `--color-ai-{50..600}`, `--font-sans`, `--font-mono`,
  `--radius-*`, `--shadow-*` used by all later tasks.

- [ ] **Step 1: Write failing tests for required tokens and fonts**

In `tests/design-system.test.ts`, read `src/index.css` and `index.html` from disk and assert:
CSS includes `@theme`, `--color-neutral-950`, `--color-brand-500`, `--color-bio-500`,
`--color-ai-500`, `--font-sans`, `--font-mono`; HTML head includes a font link for `Inter`
and `JetBrains Mono`.

- [ ] **Step 2: Run the test and verify it fails**

Run: `npm test`
Expected: FAIL — "@theme" not found in src/index.css.

- [ ] **Step 3: Add the `@theme` token block and update base styles**

In `src/index.css`, add `@theme` after `@import "tailwindcss";` defining:
- `--color-neutral-{50..950}`: a navy-tinted cool-gray scale (50 `#f5f8fc`, 100 `#eaf0f8`,
  200 `#d6e0ee`, 300 `#b4c4dc`, 400 `#8ba1c2`, 500 `#6680a6`, 600 `#4d658b`, 700 `#3a4f70`,
  800 `#27384f`, 900 `#14223a`, 950 `#0a1322`).
- `--color-brand-*`: blue/indigo scale anchored at `--color-brand-500: #4e74ff` (matches
  shader `rgba(78,116,255)`).
- `--color-bio-*`: teal/cyan scale anchored at `--color-bio-500: #14b8a6` with bright
  `--color-bio-400: #38dcd6` (matches shader `rgba(56,220,214)`).
- `--color-ai-*`: violet scale anchored at `--color-ai-500: #a855f7` (shader violet
  `rgba(186,96,255)`).
- `--font-sans: "Inter", "Geist", ui-sans-serif, system-ui, ...`; `--font-mono:
  "Fragment Mono", "JetBrains Mono", ui-monospace, ...`.
- `--radius-card: 1rem`, `--shadow-card: 0 1px 2px ...` (subtle token shadows).
Update base layer to use `--color-neutral-50` background, `--color-neutral-900` text,
`var(--font-sans)`, and token-based selection/scrollbar colors. Keep print rules, keyframes,
and `.shader-frame` unchanged.
In `index.html` head, add Google Fonts preconnect + link for Inter and JetBrains Mono with
system fallbacks, and change body class to use tokens.

- [ ] **Step 4: Run the test and verify it passes**

Run: `npm test`
Expected: PASS (147 existing + new token tests).

- [ ] **Step 5: Commit**

```bash
git add src/index.css index.html tests/design-system.test.ts
git commit -m "feat: add professional brand design tokens and fonts"
```

---

### Task 2: Shared token-based UI primitives

**Files:**
- Create: `src/shared/ui/primitives.tsx`
- Modify: `tests/design-system.test.ts`

**Interfaces:**
- Consumes: tokens from Task 1.
- Produces: exports `Button`, `Card`, `Badge`, `StatCard`, `SectionHeading`, `EmptyState`
  with typed props, each styled only with token utilities.

- [ ] **Step 1: Write failing tests for primitive exports**

Add to `tests/design-system.test.ts`: dynamically import `src/shared/ui/primitives.tsx`
via `tsx`, assert each named export is a function. (Node test can import TSX through tsx;
if JSX runtime import fails, assert the module source contains `export const <Name>` as a
structural fallback and document why.)

- [ ] **Step 2: Run the test and verify it fails**

Run: `npm test`
Expected: FAIL — primitives module not found / export missing.

- [ ] **Step 3: Implement primitives**

Create `src/shared/ui/primitives.tsx`:
- `Button`: props `variant?: 'primary'|'secondary'|'ghost'|'premium'|'danger'`,
  `size?: 'sm'|'md'`, standard button attrs. primary = `--color-brand`; premium = amber;
  danger = rose. Accept `className` for call-site overrides.
- `Card`: props `className`, `children`; `bg-white border border-neutral-200 rounded-card
  shadow-card`.
- `Badge`: props `tone?: 'neutral'|'success'|'premium'|'info'|'danger'`; semantic colors.
- `StatCard`: props `label`, `value`, `hint?`, `icon?`, `tone?`.
- `SectionHeading`: props `eyebrow?`, `title`, `subtitle?`.
- `EmptyState`: props `icon?`, `title`, `description?`, `action?`.
Use only token utilities and lucide icons where needed. No behavior logic.

- [ ] **Step 4: Run the test and verify it passes**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/shared/ui/primitives.tsx tests/design-system.test.ts
git commit -m "feat: add token-based shared UI primitives"
```

---

### Task 3: Re-skin the application shell (Sidebar + TopHeader)

**Files:**
- Modify: `src/shared/layout/Sidebar.tsx` (brand logo mark, active nav state, plan card,
  badge tones — preserve `navItems`, `handleNavClick`, all handlers)
- Modify: `src/shared/layout/TopHeader.tsx` (brand logo, tab bar active state, buttons,
  dropdowns — preserve `appTabs` and all handlers)
- Test: `tests/design-system.test.ts`

**Interfaces:**
- Consumes: primitives from Task 2, tokens from Task 1.

- [ ] **Step 1: Write failing tests for shell adoption**

Assert `Sidebar.tsx` source contains `bg-gradient-to-br from-bio-` (or `from-brand-`) and
no longer hardcodes `bg-neutral-900` on the logo mark; assert `TopHeader.tsx` uses a brand
token for the active tab. Keep assertions structural.

- [ ] **Step 2: Run the test and verify it fails**

Run: `npm test`
Expected: FAIL.

- [ ] **Step 3: Restyle shell**

Sidebar: logo mark → teal/blue gradient with `Sparkles`; active nav item → `bg-brand-600`
(or ink-900) + white; "Live Sync"/verified badges stay emerald; "₹49 Premium" stays amber;
locked items keep identical badges and `handleNavClick`. TopHeader: brand logo mark, active
tab → brand/ink, Gemini button → violet/AI accent, Premium stays amber, sticky/blur/tab-bar
layout and every handler unchanged. Preserve `no-print` and responsive classes.

- [ ] **Step 4: Run the test and verify it passes**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/shared/layout/Sidebar.tsx src/shared/layout/TopHeader.tsx tests/design-system.test.ts
git commit -m "feat: apply brand identity to app shell"
```

---

### Task 4: Re-skin first-impression views (Sign-in + Pricing)

**Files:**
- Modify: `src/features/auth/components/SignInPage.tsx`
- Modify: `src/components/PlanSelectionLandingPage.tsx`
- Test: `tests/design-system.test.ts`

**Interfaces:**
- Consumes: primitives from Task 2, tokens from Task 1.

- [ ] **Step 1: Write failing tests for accent adoption**

Assert each view's source references a brand/bio token (e.g. `bio-`, `brand-`) after restyle.

- [ ] **Step 2: Run the test and verify it fails**

Run: `npm test` → FAIL.

- [ ] **Step 3: Restyle sign-in and pricing**

SignInPage: branded hero/container accent, primary CTA uses brand token, keep all form
fields, validation, Supabase auth calls, tab/role switching and error toasts byte-identical
in behavior. PlanSelectionLandingPage: Free card neutral, Premium card amber/bio accents,
₹49 price and checkout callback logic untouched; no new entitlement claims.

- [ ] **Step 4: Run the test and verify it passes**

Run: `npm test` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/auth/components/SignInPage.tsx src/components/PlanSelectionLandingPage.tsx tests/design-system.test.ts
git commit -m "feat: restyle sign-in and pricing surfaces"
```

---

### Task 5: Re-skin core dashboards (Student + Recruiter)

**Files:**
- Modify: `src/components/DashboardView.tsx`
- Modify: `src/components/Recruiter/RecruiterDashboardView.tsx`
- Test: `tests/design-system.test.ts`

**Interfaces:**
- Consumes: primitives from Task 2, tokens from Task 1.

- [ ] **Step 1: Write failing tests for dashboard accents**

Assert both dashboard sources reference at least one brand/bio token.

- [ ] **Step 2: Run the test and verify it fails**

Run: `npm test` → FAIL.

- [ ] **Step 3: Restyle dashboards**

DashboardView: introduce branded section headers and stat cards; keep every data binding,
modal trigger, and gate unchanged. RecruiterDashboardView: restyle the seven-tab bar,
headers and stat cards; keep `deriveCandidatesFromApplications`, statuses, messaging, and
match scoring untouched. Do not invent or restyle fake verification data.

- [ ] **Step 4: Run the test and verify it passes**

Run: `npm test` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/DashboardView.tsx src/components/Recruiter/RecruiterDashboardView.tsx tests/design-system.test.ts
git commit -m "feat: restyle student and recruiter dashboards"
```

---

### Task 6: Cleanup, documentation and env reference

**Files:**
- Delete: `src/App.tsx.backup`, `src/App.tsx.before-recovery`,
  `src/components/SignInPage.tsx.bak`, `src/components/SignInPage.tsx.backup`,
  `src/components/Navbar.tsx` (all confirmed untracked-by-import / unused)
- Modify: `package.json:2`, `server/index.ts:24`, `README.md`, `.env.example`
- Test: `tests/design-system.test.ts`

**Interfaces:** none.

- [ ] **Step 1: Write failing tests for cleanup and docs**

Assert: the five files no longer exist; `package.json` name === `omic-hub`; README no
longer contains "AI Studio" and contains "OMIC HUB", "Quick start", "Environment",
"Deploy"; `.env.example` contains `PUBLIC_APP_URL`, `PORT`, `HOST`,
`CERTIFICATE_SIGNING_SECRET`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`,
`VITE_API_BASE_URL`; `server/index.ts` no longer contains `TalentForge`.

- [ ] **Step 2: Run the test and verify it fails**

Run: `npm test` → FAIL.

- [ ] **Step 3: Apply cleanup and docs**

Delete the 5 files with `git rm`. Rename package name. Replace log string with
`OMIC HUB server running on http://${HOST}:${PORT}`. Rewrite README with product overview,
stack, quick start, env var table, run/build/deploy, webhook note. Rewrite `.env.example`
with every code-read var, noting `PUBLIC_APP_URL` (code does not read `APP_URL`) and that
server vars must never be VITE_-prefixed.

- [ ] **Step 4: Run the test and verify it passes**

Run: `npm test` → PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: clean legacy files and document setup"
```

---

### Task 7: Full verification and manual smoke

**Files:** none (verification task).

- [ ] **Step 1: Run full test suite**

Run: `npm test`
Expected: 147/147 plus the new design-system tests pass; zero failures.

- [ ] **Step 2: Run lint and confirm no new errors**

Run: `npm run lint`
Expected: exit 1 with exactly 13 errors, all in `src/services/storage/upload.ts`.

- [ ] **Step 3: Run build**

Run: `npm run build`
Expected: success with pre-existing `__dirname`/chunk-size warnings only.

- [ ] **Step 4: Manual smoke**

Run `npm run dev`, open `http://localhost:3000`, confirm shell, sign-in, dashboard,
pricing, and one recruiter screen render with the new brand and no broken layout/behavior.

- [ ] **Step 5: Confirm git state**

Run: `git status --short`
Expected: clean apart from any intended uncommitted work; verify the owner's uncommitted
plan file in the main checkout was never touched.
