# Authenticated recruiter workspace on Supabase — design

Date: 2026-11-17
Status: approved-in-conversation (user handed the how); written by builder

## Intent and why

Replace the fake recruiter experience (localStorage demo) with genuine
Supabase authentication, verified role-based access control, and Express
backend enforcement, without breaking the existing student experience.

## Goals

- Recruiter registration and login use Supabase Auth (email/password).
- Role separation is enforced on the client and verified on the server.
- Recruiter API routes require a verified Supabase JWT and `recruiter` role
  read from the `profiles` table.
- Recruiter profiles synchronize with the `profiles` table.
- Automated tests cover login, roles, permissions, and unauthorized access.

## Non-goals

- No changes to student email/password auth or Google OAuth flows.
- No changes to AI routes (`/api/ai/*`). They are generic and shared by
  both roles; adding auth there would break student workflows.
- No live database migrations or RLS changes in this environment.
- No payments, plans, recovery, or OAuth-provider changes.

## Constraints

- Do not modify production data. `.env.local` in this environment has empty
  Supabase credential values; a live schema inspection could not be performed.
  The documented schema is `profiles(id, full_name, user_type, company_name)`.
- Server has no Supabase client today. It must gain one with a service-role
  key so it can read `profiles` bypassing RLS for role verification.
- Frontend runs on Vite with `VITE_` env vars; server must use non-prefixed
  env vars.
- Follow TDD: failing tests first, then minimum changes, then verify.
- `npm test` uses `tsx --test tests/*.test.ts`; `npm run lint` is `tsc --noEmit`;
  build is `vite build`.

## Approaches considered

1. Frontend-only auth: fastest, but unpersuasive — no backend enforcement.
2. Full-stack with Supabase JWT verification in Express (chosen).
3. Push all authorization to RLS + PostgREST passthrough. Strongest model but
   largest surface, and server does not use Supabase today.

## Calls made by the builder (human partner can override)

- Role authority: the JWT is only proof of identity. Role comes from
  `profiles.user_type` fetched with the service-role key. JWT `user_metadata`
  is never trusted for authorization.
- Verification: server calls `supabase.auth.getUser(jwt)` (Supabase Auth) to
  resolve the user, then `profiles` for the role. One network round-trip per
  protected request; acceptable now, can be cached/verified locally later.
- `requireRole` is a parameterized middleware (`student` | `recruiter`).
- The recruiter-only backend surface is a small new router (`/api/recruiter/*`)
  that reports the verified identity. Future recruiter endpoints mount behind
  `requireRole('recruiter')`.
- Frontend keeps its localStorage routing but a pure helper
  `src/features/auth/roles.ts` codifies who may see what; `App.tsx` renders an
  access-denied screen on mismatch instead of the wrong workspace.
- Demo recruiter module is removed entirely; no fallback path.
- Frontend degrades safely: if the server cannot verify a role, it returns
  401/403 JSON; tests assert these.

## The design

### Frontend

- `authClient.ts`: add `signUpRecruiter` (signUp with
  `user_type: 'recruiter'` + `company_name` metadata) and
  `signInWithPassword` reused for login; add `RecruiterSignUpInput`.
- `SignInPage.tsx`: recruiter tab becomes real auth (register/login modes,
  same UX patterns as student). Demo imports/handler removed.
- `AuthProvider.tsx`: demo-session restore paths removed; profile load/create
  unchanged (already syncs to `profiles`).
- `roles.ts` (new): pure predicates e.g. `canSeeRecruiterWorkspace(user)`,
  `canSeeStudentWorkspace(user)`. `App.tsx` uses them; mismatch shows an
  access-denied screen.
- `demoRecruiter.ts` deleted. Tests referencing it updated.

### Backend

- `server/config`: add `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
- `server/plugins` or `server/middleware/auth.ts` (new):
  - `requireAuth`: parse `Authorization: Bearer`, verify via Supabase admin
    client (`auth.getUser`), attach `req.auth = { userId, role, profile }`;
    401 on missing/invalid.
  - `requireRole(role)`: after `requireAuth`, compare against DB fetch; 403 on
    mismatch; 401 on auth failure.
  - All decisions tested with mocked Supabase clients; no network in tests.
- `server/routes/recruiter.ts` (new): `GET /api/recruiter/me` returns verified
  profile; demonstrates 401/403. Mounted behind `requireAuth` +
  `requireRole('recruiter')`.
- `.env.example` documents `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`.

### Profile sync

`loadOrCreateProfileWithClient` already inserts with metadata-derived
`user_type`/`company_name`. Recruiter registration sets both; the sign-in path
then confirms existing rows. No DB migration required for the columns to
exist; RLS policies left untouched and are the owner's to manage.

### Tests (failing first)

- `tests/recruiter-auth.test.ts`: sign-up metadata (recruiter + company),
  sign-in call, role mapping, no demo fallbacks.
- `tests/server-auth.test.ts`: `requireAuth`/`requireRole` unit tests with a
  mocked admin client (401 missing/invalid token, 403 wrong role, 200 recruiter,
  forged-JWT-metadata ignored).
- Update `tests/auth.test.ts` (drop demo-recruiter assertions; keep student).
- `tests/roles.test.ts` (new) for the frontend predicates.

## What is left to the builder

- Exact middleware file name; express error-handler shape.
- Whether to seed an example student-role route; not planned.
- Secrets management for the service-role key.
