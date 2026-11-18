# Professional Brand Redesign — Design Spec

**Goal:** Give OMIC HUB a distinct, credible, professional brand identity — a visual
re-skin only, with no feature or behavior changes.

**Approach:** B — Branded identity (chosen by the owner). A real design-token layer plus
a small set of reusable UI primitives, applied through the app's existing inline-Tailwind
components so a single token change propagates everywhere.

## Product context
- OMIC HUB — "Career Acceleration Platform for Bioinformatics."
- Two workspaces: students (ATS resume, AI review, skill paths, job tracker, mock
  interviews, certificates, news, opportunities, data vault, Gemini mentor) and
  recruiters (jobs, candidates, applications, messaging, analytics, company profile).
- Two tiers: Free (₹0) and one-time Premium (₹49). Premium is granted ONLY by a verified
  Razorpay webhook. No trials/subscriptions.

## Current visual state (baseline)
- Light neutral SaaS: white cards on `#fafbfc`, `neutral-*` utilities everywhere,
  `bg-neutral-900` buttons; emerald/amber/sky/indigo semantic accents.
- Tailwind v4 via `@import "tailwindcss"` and `tailwindcss()` — NO config file.
- No `@theme` block, no token layer, no dark mode, no shared component library.
- A separate dark Three.js/WebGL shader system in `src/shaders/threeui.css` uses accent
  radials `rgba(78,116,255)` (blue), `rgba(186,96,255)` (violet), `rgba(56,220,214)` (cyan),
  and a vendored "ThreeUI Fragment Mono" font.
- Design decisions are duplicated as inline Tailwind strings in very large components.

## Design direction
- **Primary:** deep ink/navy. **Accent:** fresh teal/cyan ("bio/lab"). **Secondary:**
  violet for AI surfaces. These extend the shader accent triad so the light dashboards
  and dark shader scenes read as one brand.
- **Semantic layer (preserve):** emerald = live/verified, amber = premium, rose = destructive.
- **Typography:** clean sans (Inter/Geist) for UI; monospace (vendored Fragment Mono or
  JetBrains Mono) for ATS scores, IDs, status labels. Establish a clear type scale.
- **Theme:** keep light dashboards; dark shader scenes stay dark but adopt the same accent
  tokens. Full-app dark mode is NOT in scope.

## Required implementation pattern
1. Token layer in `src/index.css` via Tailwind v4 `@theme` (CSS custom properties for
   color, font, radius, shadow). Brand colors are referenced by token name, never hardcoded
   per-component. Redefining the built-in `neutral` scale in `@theme` is the mechanism that
   propagates the ink/navy palette to all existing `neutral-*` utilities at once.
2. Shared primitives under `src/shared/ui/` (Button, Card, Badge, StatCard, SectionHeading,
   EmptyState), built from tokens.
3. Re-skin, do not re-architect: keep every component's props, state, handlers, and data
   flow. No router, no UI library dependency, no new major versions.
4. High-impact surfaces first: `Sidebar.tsx`, `TopHeader.tsx`, `DashboardView.tsx`,
   `PlanSelectionLandingPage.tsx`, `SignInPage.tsx`, `RecruiterDashboardView.tsx`, then
   cascade to resume builder/analyzer, mock interview, certifications, news, skill paths.

## Cleanup folded in
- Delete tracked legacy artifacts: `src/App.tsx.backup`, `src/App.tsx.before-recovery`,
  `src/components/SignInPage.tsx.bak`, `src/components/SignInPage.tsx.backup`.
- Remove unused dark `src/components/Navbar.tsx` (not imported anywhere).
- Rename `package.json` name `react-example` → `omic-hub`.
- Replace stale "TalentForge AI server running..." log in `server/index.ts`.
- Replace README stub with real docs; update `.env.example` with every var the code reads.

## Non-negotiables
- NO feature/behavior changes: no changes to auth, roles, plan entitlement, payments,
  certificates, or AI honesty. Preserve `/api/account/plan` as sole paid-state source,
  webhook-only Premium grants, `/verify/cert/:token`, `isFallback` provenance, and no
  fabricated scores/citations/Verified labels.
- No new router, no shadcn/Radix/MUI, no new dependencies or major version bumps.
- Preserve the owner's uncommitted `docs/superpowers/plans/2026-11-17-supabase-recruiter-auth.md`.
- Never commit secrets or `.env.local`; do not change git remotes or push.

## Verification
- `npm test` → 147/147 pass. `npm run lint` → exactly the 13 pre-existing `upload.ts`
  errors, no new ones. `npm run build` succeeds. Manual smoke of shell, sign-in, dashboard,
  pricing, recruiter screen at `http://localhost:3000`.

## Testing note
The repo's tests are Node/`tsx --test` with no DOM/component test infrastructure and no
new dependencies allowed. Structural design-system invariants (tokens present, primitives
exported, legacy files removed, docs/env updated) are pinned with source-level tests;
purely visual class changes are verified by build + manual smoke.
