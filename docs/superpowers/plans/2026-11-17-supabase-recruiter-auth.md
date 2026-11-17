# Supabase Recruiter Auth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the forgeable localStorage demo recruiter login with real Supabase email/password auth, DB-backed role checks in the UI, and server-enforced `recruiter` authorization.

**Architecture:** The JWT proves identity only; `profiles.user_type` read with a service-role key is the sole role authority. Frontend gets pure auth-operation helpers and role predicates plus an access-denied screen; the old demo module is deleted. Express gains a lazily-created admin client, `requireAuth`/`requireRole` middleware, and a small `/api/recruiter/*` router that returns 401/403 JSON instead of failing open.

**Tech Stack:** React 19, TypeScript 7, Vite 8, `@supabase/supabase-js` ^2.118.0, Express 4, Node `node:test` + `tsx`.

**Spec:** `docs/superpowers/specs/2026-11-17-supabase-recruiter-auth-design.md`

## Global Constraints

- No changes to student email/password auth or Google OAuth flows.
- No changes to AI routes (`/api/ai/*`). They are generic and shared by both roles.
- No live database migrations or RLS changes in this environment.
- Do not modify production data. `.env.local` in this environment has empty Supabase credential values; the documented schema is `profiles(id, full_name, user_type, company_name)`.
- Server has no Supabase client today; it must gain one with a service-role key. Frontend uses `VITE_` env vars; server must use non-prefixed env vars.
- Follow TDD: failing tests first, then minimum changes, then verify.
- Role authority: the JWT is only proof of identity. Role comes from `profiles.user_type` fetched with the service-role key. JWT `user_metadata` is never trusted for authorization.
- Demo recruiter module is removed entirely; no fallback path.
- Frontend degrades safely: if the server cannot verify a role, it returns 401/403 JSON.
- `npm test` uses `tsx --test tests/*.test.ts`; `npm run lint` is `tsc --noEmit`; build is `vite build`.
- `requireRole` is a parameterized middleware (`student` | `recruiter`).
- The Supabase admin client must be created lazily: `createClient('', '')` throws at import time with the empty credentials present in this environment.

## Review Focus

- **Forged `rec_*` localStorage profile or tampered `userType` must never restore a privileged session** — Task 3 static tests assert the demo store, its readers, and its `{ demo: true }` call path are gone; Task 2 predicates reject null/unknown roles.
- **JWT with `user_metadata.user_type: 'recruiter'` but DB row `student`** — Task 5 test asserts `/api/recruiter/me` returns 403 and never reads `user_metadata`.
- **Missing, malformed, or invalid `Authorization: Bearer` header** — Task 5 tests assert 401 JSON (not 500, not a crash) for absent header, `Basic …`, empty bearer, and verifier error.
- **Missing profile row, unexpected `user_type`, or DB error** — Task 5 tests assert 403 for missing/unknown role and 503 (never a default-to-student/recruiter pass) when the profile fetch throws.
- **Recruiter sign-up must write `user_type: 'recruiter'` and `company_name` to metadata; sign-in must call Supabase password auth, not a timer** — Task 1 tests pin the exact sign-up payload and sign-in call; Task 3 static tests pin the absence of the old timer/demo handler.

---

### Task 1: Recruiter auth operations and client wiring

**Files:**
- Modify: `src/features/auth/authOperations.ts`
- Modify: `src/features/auth/authClient.ts`
- Test: `tests/recruiter-auth.test.ts` (new)

**Interfaces:**
- Consumes: `classifySignUpResult(data): SignUpOutcome` and `SignUpOutcome` from `authOperations.ts`; `supabase` and `getAuthRedirectUrl()` from `authClient.ts` / `callback.ts`.
- Produces:
  - `RecruiterSignUpInput { companyName: string; email: string; password: string }`
  - `RecruiterSignUpOptions { data: { full_name: string; user_type: 'recruiter'; company_name: string }; emailRedirectTo: string }`
  - `buildRecruiterSignUpOptions(input, redirectTo): RecruiterSignUpOptions`
  - `signUpRecruiterWithClient(client, input, redirectTo): Promise<SignUpOutcome>`
  - `signInWithPasswordWithClient(client, email, password): Promise<void>`
  - `signUpRecruiter(input): Promise<StudentSignUpResult>` exported from `authClient.ts`
  - `signInWithPassword(email, password): Promise<void>` rewritten in `authClient.ts` to delegate to the helper
  - `RecruiterSignUpInput` re-exported from `authClient.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/recruiter-auth.test.ts`. Use `node:test` + `node:assert/strict` with small fake clients (no network, no `supabase` singleton import). Assert:

```ts
test('recruiter sign-up options carry the recruiter role and company', () => {
  assert.deepEqual(
    buildRecruiterSignUpOptions(
      { companyName: '  Helix Bio  ', email: 'jobs@helix.example', password: 'pw' },
      'http://localhost:3000/',
    ),
    {
      data: {
        full_name: 'Helix Bio Talent Acquisition',
        user_type: 'recruiter',
        company_name: 'Helix Bio',
      },
      emailRedirectTo: 'http://localhost:3000/',
    },
  );
});
```

Also add tests that (a) `signUpRecruiterWithClient` forwards the exact email/password/options to `auth.signUp`, throws when `error` is set, and returns `classifySignUpResult(data)`; (b) `signInWithPasswordWithClient` calls `auth.signInWithPassword({ email, password })` exactly once and throws when `error` is set; (c) a static source read of `authClient.ts` still contains `user_type: 'student'` in `signUpStudent`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --test-name-pattern="recruiter sign-up|signUpRecruiterWithClient|signInWithPasswordWithClient|student sign-up"`
Expected: FAIL — exported helpers do not exist yet.

- [ ] **Step 3: Implement the helpers and wire `authClient.ts`**

Add the narrow client interfaces and the three pure/client-injected functions to `authOperations.ts`. `buildRecruiterSignUpOptions` trims `companyName` and sets `full_name` to `"${companyName} Talent Acquisition"`. `signUpRecruiterWithClient` throws on `error` and returns `classifySignUpResult(data)`. `signInWithPasswordWithClient` throws on `error`. In `authClient.ts`, export `signUpRecruiter(input)` delegating to `signUpRecruiterWithClient(supabase, input, getAuthRedirectUrl())`, and change the existing `signInWithPassword` body to delegate to `signInWithPasswordWithClient(supabase, email, password)`. Leave `signUpStudent` and all Google/reset code untouched.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS (all test files).

- [ ] **Step 5: Commit**

```bash
git add src/features/auth/authOperations.ts src/features/auth/authClient.ts tests/recruiter-auth.test.ts
git commit -m "feat: add recruiter sign-up and password sign-in operations"
```

---

### Task 2: Frontend role predicates and workspace access control

**Files:**
- Create: `src/features/auth/roles.ts`
- Modify: `src/features/auth/index.ts`
- Modify: `src/App.tsx`
- Test: `tests/roles.test.ts` (new)

**Interfaces:**
- Consumes: `UserProfile` from `src/types.ts`.
- Produces: `canSeeRecruiterWorkspace(user: UserProfile | null | undefined): boolean`, `canSeeStudentWorkspace(user: UserProfile | null | undefined): boolean`, both exported from `roles.ts` and re-exported from `features/auth/index.ts`.

- [ ] **Step 1: Write the failing tests**

Create `tests/roles.test.ts`:

```ts
test('only profiles with an explicit role may see a workspace', () => {
  const recruiter = { id: 'uuid-1', userType: 'recruiter' } as UserProfile;
  const student = { id: 'uuid-2', userType: 'student' } as UserProfile;

  assert.equal(canSeeRecruiterWorkspace(recruiter), true);
  assert.equal(canSeeStudentWorkspace(recruiter), false);
  assert.equal(canSeeStudentWorkspace(student), true);
  assert.equal(canSeeRecruiterWorkspace(student), false);
  assert.equal(canSeeRecruiterWorkspace(null), false);
  assert.equal(canSeeStudentWorkspace(undefined), false);
  assert.equal(canSeeRecruiterWorkspace({ id: 'uuid-3' } as UserProfile), false);
});
```

Add a static assertion that `src/App.tsx` references both predicates and renders an `Access Denied` screen.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --test-name-pattern="only profiles with an explicit role"`
Expected: FAIL — `roles.ts` does not exist.

- [ ] **Step 3: Implement predicates and App wiring**

Create `roles.ts` with exact equality checks on `user?.userType`. Re-export from `features/auth/index.ts`. In `App.tsx`, import the two predicates and reorder the authenticated branch to: recruiter workspace first when `canSeeRecruiterWorkspace(user)`; access-denied screen when `!canSeeStudentWorkspace(user)`; plan-selection landing when `!user.hasSelectedPlan`; student workspace otherwise. Add a local `AccessDeniedScreen` component (centered card, "Access Denied" heading, short explanation, sign-out button using the existing `onLogout` handler and `LogOut` icon). Keep `handleLoginSuccess` and the `SignInPage` prop unchanged in this task.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test && npm run lint`
Expected: PASS; `tsc --noEmit` reports no errors.

- [ ] **Step 5: Commit**

```bash
git add src/features/auth/roles.ts src/features/auth/index.ts src/App.tsx tests/roles.test.ts
git commit -m "feat: gate workspaces on verified profile role"
```

---

### Task 3: Real recruiter sign-in and removal of the demo path

**Files:**
- Modify: `src/features/auth/components/SignInPage.tsx`
- Modify: `src/features/auth/AuthProvider.tsx`
- Modify: `src/features/auth/messages.ts`
- Modify: `src/features/auth/index.ts`
- Modify: `src/App.tsx`
- Delete: `src/features/auth/demoRecruiter.ts`
- Modify: `tests/auth.test.ts`
- Test: `tests/recruiter-auth.test.ts`

**Interfaces:**
- Consumes: `signUpRecruiter`, `signInWithPassword` from Task 1; `canSee*` predicates from Task 2; `isPasswordLongEnough`, `isValidEmail`, `normalizeEmail`, `useAuthAction`, `AUTH_MESSAGES`.
- Produces: `SignInPage` with no props; `authClient.ts` unchanged beyond Task 1; `LoginOptions` no longer exported anywhere.

- [ ] **Step 1: Write the failing no-demo tests**

Append to `tests/recruiter-auth.test.ts`:

```ts
test('demo recruiter fallback is fully removed', () => {
  assert.equal(existsSync('src/features/auth/demoRecruiter.ts'), false);

  for (const file of [
    'src/features/auth/components/SignInPage.tsx',
    'src/features/auth/AuthProvider.tsx',
    'src/App.tsx',
    'src/features/auth/messages.ts',
    'src/features/auth/authClient.ts',
    'tests/auth.test.ts',
  ]) {
    const source = readFileSync(file, 'utf8');
    assert.equal(/demoRecruiter|DEMO_RECRUITER|buildDemoRecruiterProfile|rec_|onLoginSuccess|\{ demo: true \}/.test(source), false, file);
  }
});

test('recruiter form uses real Supabase auth', () => {
  const source = readFileSync('src/features/auth/components/SignInPage.tsx', 'utf8');
  assert.match(source, /signUpRecruiter/);
  assert.match(source, /signInWithPassword/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --test-name-pattern="demo recruiter fallback|recruiter form uses"`
Expected: FAIL — demo module and references still exist.

- [ ] **Step 3: Replace the demo handler and delete demo state**

In `SignInPage.tsx`: drop the `demoRecruiter` imports and `LoginOptions` import; make the component prop-free; add `const recruiterAction = useAuthAction()` and include its loading state in `busy`. Import `signUpRecruiter`, `signInWithPassword`. Replace `handleRecruiterSubmit` with an async handler that:

1. Validates normalized email with `isValidEmail` (toast `invalidEmail` / `invalidLoginEmail`).
2. In register mode: requires company name (`missingCompanyName`) and password length (`passwordTooShort`), then calls `signUpRecruiter({ companyName, email, password })` through `recruiterAction.run` with fallback `recruiterAuthFailed`. If it returns a session, show `accountCreated`; otherwise render the existing `signUpNotice` pattern with `accountCreatedConfirmEmail` / `signUpDuplicateEmail` wording.
3. In login mode: requires a password (`passwordRequired`), then calls `signInWithPassword(email, password)` through `recruiterAction.run` with fallback `recruiterAuthFailed`.

Add a register/login toggle and a `signUpNotice` block to the recruiter form (mirroring the student form), render the company field only in register mode, and switch headings/button copy on `isRegisterMode`. No `onLoginSuccess` call: `AuthProvider`'s `SIGNED_IN` subscription already loads the profile.

In `messages.ts`: add `missingCompanyName: 'Please enter your company name.'` and `recruiterAuthFailed: 'Recruiter authentication failed. Please try again.'`; delete `welcomeRecruiter` and `recruiterDemoFailed`.

In `AuthProvider.tsx`: remove all demo imports; remove `demo` from `ApplyUserOptions` and its mark/clear branch; delete the `LoginOptions` interface; change `login` to `(authenticatedUser: UserProfile) => void`; remove every `clearDemoRecruiterSession()` call; replace the `getDemoRecruiterSession`/legacy-`rec_*` block in `finishWithoutSession` with the plain `DEFAULT_USER` / unauthenticated reset.

In `App.tsx`: remove the `LoginOptions` import, the `login` destructure, `handleLoginSuccess`, the `<SignInPage onLoginSuccess={…} />` prop, and render `<SignInPage />`. In `index.ts`, drop `LoginOptions` from the exported type list. Delete `demoRecruiter.ts`. In `tests/auth.test.ts`, delete the `isDemoRecruiterProfile` import, its final test, and the now-unused `UserProfile` import.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test && npm run lint`
Expected: PASS; no references to the demo module remain.

- [ ] **Step 5: Commit**

```bash
git add -A src/features/auth src/App.tsx tests/auth.test.ts tests/recruiter-auth.test.ts
git commit -m "fix: replace forgeable demo recruiter login with Supabase auth"
```

---

### Task 4: Server Supabase admin verifier and configuration

**Files:**
- Modify: `server/config/index.ts`
- Modify: `.env.example`
- Create: `server/lib/supabaseAdmin.ts`
- Test: `tests/server-auth.test.ts` (new)

**Interfaces:**
- Consumes: `createClient` from `@supabase/supabase-js`; `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` from `server/config`.
- Produces:
  - `ServerProfile { id: string; full_name: string | null; user_type: string | null; company_name: string | null }`
  - `SupabaseAdminVerifier { getUser(jwt: string): Promise<{ data: { user: { id: string } | null }; error: { message: string } | null }>; getProfile(userId: string): Promise<ServerProfile | null> }`
  - `SupabaseLikeClient` — narrow structural interface (`auth.getUser`, `from().select().eq().maybeSingle()`) used for injection.
  - `createSupabaseAdminVerifier(client: SupabaseLikeClient): SupabaseAdminVerifier`
  - `adminVerifier: SupabaseAdminVerifier` — lazy, safe to import with empty env.

- [ ] **Step 1: Write the failing tests**

Create `tests/server-auth.test.ts` with a fake `SupabaseLikeClient`. Assert: `createSupabaseAdminVerifier(client).getUser('jwt-1')` forwards the exact token to `auth.getUser`; `getProfile('uuid-1')` selects `id, full_name, user_type, company_name`, filters `id = uuid-1`, and returns the row; returns `null` when no row exists; throws when `maybeSingle()` returns an error.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --test-name-pattern="admin verifier"`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement config and lazy verifier**

Add `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (both `process.env.X || ''`) to `server/config/index.ts`. Document both in `.env.example` as server-only, non-`VITE_` secrets. Create `server/lib/supabaseAdmin.ts`: define the narrow interfaces, export `createSupabaseAdminVerifier(client)` (uses `client.auth.getUser(jwt)` and a `profiles` select with `.eq('id', userId).maybeSingle()`, throwing on query error), and export `adminVerifier` built from a **lazily** created real client — the client factory throws `Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY` only when a request actually needs it, so importing the module with empty env cannot crash `npm test`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test && npm run lint`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/config/index.ts .env.example server/lib/supabaseAdmin.ts tests/server-auth.test.ts
git commit -m "feat: add server Supabase admin verifier"
```

---

### Task 5: Server auth middleware

**Files:**
- Create: `server/middleware/auth.ts`
- Modify: `tests/server-auth.test.ts`

**Interfaces:**
- Consumes: `SupabaseAdminVerifier`, `ServerProfile`, `adminVerifier` from Task 4.
- Produces:
  - `AppRole = 'student' | 'recruiter'`
  - `AuthenticatedIdentity { userId: string; role: AppRole; profile: ServerProfile }`
  - `AuthenticatedRequest extends Request { auth?: AuthenticatedIdentity }`
  - `resolveRole(userType: string | null | undefined): AppRole | null`
  - `extractBearerToken(header: string | undefined): string | null`
  - `createRequireAuth(verifier: SupabaseAdminVerifier): RequestHandler`
  - `requireRole(role: AppRole): RequestHandler`
  - `requireAuth = createRequireAuth(adminVerifier)`

- [ ] **Step 1: Write the failing tests**

Add to `tests/server-auth.test.ts` a helper that runs an array of Express handlers against a fake `{ headers, auth? }` request and captures `status()`, `json()`, and `next()`. Add tests asserting:

```ts
test('requireAuth ignores forged JWT metadata and trusts the profile role', async () => {
  const verifier = fakeVerifier({
    user: { id: 'uuid-1', user_metadata: { user_type: 'recruiter' } },
    profile: { id: 'uuid-1', full_name: 'Ada', user_type: 'student', company_name: null },
  });
  const result = await run([createRequireAuth(verifier), requireRole('recruiter')], {
    headers: { authorization: 'Bearer real-token' },
  });
  assert.equal(result.status, 403);
  assert.deepEqual(result.body, { error: 'Forbidden' });
});
```

Also add: 401 for missing header, `Basic abc`, `Bearer `, verifier error, and null user; 403 for missing profile and `user_type: 'admin'`; 503 when `getProfile` throws; success sets `req.auth = { userId, role: 'recruiter', profile }`, forwards the token to `getUser`, and calls `next`; `requireRole('recruiter')` returns 401 when `req.auth` is absent and 403 for the wrong role; unit tests for `resolveRole` and `extractBearerToken`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --test-name-pattern="requireAuth|requireRole|resolveRole|extractBearerToken"`
Expected: FAIL — middleware module does not exist.

- [ ] **Step 3: Implement the middleware**

Create `server/middleware/auth.ts`. `extractBearerToken` accepts only `/^Bearer\s+(\S+)$/i` and returns `null` otherwise. `resolveRole` returns `'recruiter'` only for `'recruiter'`, `'student'` only for `'student'`, and `null` otherwise. `createRequireAuth` returns 401 `{ error: 'Unauthorized' }` for a missing/invalid token or verifier error/null user; calls `getProfile(userId)` and returns 503 `{ error: 'Authentication service unavailable' }` if it throws; returns 403 `{ error: 'Forbidden' }` if the profile is missing or `resolveRole` is null; otherwise assigns `req.auth` and calls `next()`. Never read `user_metadata`. `requireRole(role)` returns 401 when `req.auth` is absent, 403 when `req.auth.role !== role`, otherwise `next()`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test && npm run lint`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/middleware/auth.ts tests/server-auth.test.ts
git commit -m "feat: enforce Supabase JWT and DB role in middleware"
```

---

### Task 6: Recruiter-only API route

**Files:**
- Create: `server/routes/recruiter.ts`
- Modify: `server/routes/index.ts`
- Modify: `tests/server-auth.test.ts`

**Interfaces:**
- Consumes: `createRequireAuth`, `requireRole`, `AuthenticatedRequest`, `SupabaseAdminVerifier`, `adminVerifier` from Tasks 4–5.
- Produces: `createRecruiterRouter(verifier: SupabaseAdminVerifier = adminVerifier): Router` and `recruiterRouter`.

- [ ] **Step 1: Write the failing tests**

Add to `tests/server-auth.test.ts`: mount `createRecruiterRouter(fakeVerifier(...))` on a fresh Express app in each test, listen on port `0`, and call `fetch('http://127.0.0.1:<port>/api/recruiter/me')` (loopback only; no external network). Assert 200 with `{ userId, role: 'recruiter', companyName: 'Helix Bio' }` for a recruiter token, 403 `{ error: 'Forbidden' }` for a student token, and 401 `{ error: 'Unauthorized' }` with no header. Always close the server in `finally`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --test-name-pattern="recruiter/me"`
Expected: FAIL — router does not exist.

- [ ] **Step 3: Implement and mount the router**

Create `server/routes/recruiter.ts` with `createRecruiterRouter(verifier)`; register `GET /api/recruiter/me` behind `createRequireAuth(verifier)` then `requireRole('recruiter')`; respond with `{ userId: req.auth.userId, role: req.auth.role, companyName: req.auth.profile.company_name }`. Export a default `recruiterRouter = createRecruiterRouter()`. Add `app.use(recruiterRouter)` to `server/routes/index.ts` after `aiRouter`. Leave all `/api/ai/*` routes untouched and unauthenticated.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test && npm run lint`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/routes/recruiter.ts server/routes/index.ts tests/server-auth.test.ts
git commit -m "feat: add verified recruiter profile endpoint"
```

---

### Task 7: Full verification

**Files:** none (verification + final commit if anything changed)

- [ ] **Step 1: Run the full suite**

Run: `npm test`
Expected: all test files pass, including the new `recruiter-auth`, `roles`, and `server-auth` tests.

- [ ] **Step 2: Type-check and build**

Run: `npm run lint && npm run build`
Expected: no TypeScript errors; Vite build succeeds.

- [ ] **Step 3: Confirm no demo remnants anywhere**

Run: `grep -RInE 'demoRecruiter|DEMO_RECRUITER|buildDemoRecruiterProfile|tf_demo_recruiter_session|rec_[0-9]' src server tests || true`
Expected: no output.

- [ ] **Step 4: Confirm AI routes are unchanged**

Run: `git diff --stat HEAD -- server/routes/ai.ts src/components`
Expected: no changes.

- [ ] **Step 5: Commit any verification-driven fixes**

```bash
git add -A
git commit -m "chore: verify recruiter auth implementation"
```
