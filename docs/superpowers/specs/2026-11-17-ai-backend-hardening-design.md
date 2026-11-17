# AI Backend Hardening — Design

## Intent

`server/routes/ai.ts` exposes ten Gemini-backed POST endpoints with no
authentication, no rate limiting, no request-body validation, and lets the
browser choose the model and system prompt. Together these allow anyone who
can reach the port to spend the server's Gemini quota, inject arbitrary system
instructions, and crash handlers with malformed JSON types. This change closes
those abuse vectors without changing the AI feature's user-facing behavior.

## Goals

- Every AI endpoint requires a valid Supabase JWT (same verifier as the rest of
  the server).
- Abusive traffic is throttled per authenticated user and per source IP with
  HTTP 429 + `Retry-After`.
- The chat model and system prompt are fixed server-side; client-supplied
  `model`, `systemInstruction`, and `role` are ignored.
- Wrong JSON types produce HTTP 400 instead of an uncaught `TypeError`.
- Async handler rejections are forwarded to an Express 4 error middleware that
  returns a generic 500 and logs server-side.
- The listen host is env-configurable so deployments can narrow the bind.

## Non-goals

- No Redis / shared limiter store (single-process assumption; documented).
- No change to the default bind (`0.0.0.0` stays the default).
- No frontend changes — the API contract for well-formed requests is unchanged.
- No new runtime dependencies.
- No changes to auth, recruiter, AI output-quality prompts beyond pinning chat.

## Constraints

- Express 4.21: rejected promises in `async` handlers are NOT auto-forwarded;
  an explicit wrapper is required.
- Routers must stay import-safe with empty environment variables (existing
  tests import them). The lazy Supabase admin proxy already guarantees this.
- Baseline `npm run lint` (`tsc --noEmit`) has 13 pre-existing errors in
  `src/services/storage/upload.ts`; acceptance is zero new errors.
- `npm test` is `tsx --test tests/*.test.ts` (no `--test-name-pattern`).
- No `npm install`; do not touch package.json / package-lock.json.

## Approaches considered

- **A — Harden in place (chosen).** Add auth, limiter, validators, and error
  handling around the existing router with small local modules. Keeps the
  dependency footprint zero and preserves all API shapes. Trade-off: limits
  are process-local, so a multi-instance deployment would need B later.
- **B — Redis-backed limits.** Shared counters across instances. Rejected:
  new service/dependency and operational burden with no current requirement.
- **C — Bind loopback only.** Rejected: breaks container/direct deployments;
  env-configurable host (part of A) achieves the same goal without the break.

## Design

### Auth (`server/routes/ai.ts`)
Introduce `createAiRouter(deps)` taking an injectable `requireAuth`
`RequestHandler`; export `aiRouter = createAiRouter({ requireAuth })` using the
existing `requireAuth = createRequireAuth(adminVerifier)`. Apply
`aiRouter.use(deps.requireAuth)` before all routes so every endpoint (and the
405 `.all` fallback) is gated. Tests inject `denyAuth` / `allowAuth` fakes.

### Rate limiting (`server/middleware/rateLimit.ts`)
`createRateLimiter({ windowMs, max, key, now })` returns a `RequestHandler`
using an in-memory sliding window of timestamps. Two instances are applied to
the AI router: one keyed by `req.auth.userId` (per user) and one keyed by the
normalized client IP (per IP). Exceeding a limit returns `429` with
`Retry-After` (seconds) and `{ error: 'Too many requests' }`. Default window
60s, max 60 requests; `now` is injectable for deterministic tests. No
cross-process coordination (documented non-goal).

### Body validation (`server/middleware/validate.ts`)
Dependency-free helpers returning a boolean/400 response: string fields with
required/optional and max length, arrays with element checks, and bounded
numbers. Each of the ten handlers calls a validator at the top and returns
`400 { error: 'Invalid <field>' }` on failure. Limits mirror existing client
sizes (e.g. resume text 4000 chars, voice text 1000 chars) so valid requests
are unaffected.

### Pinned chat model + prompt (`server/routes/ai.ts`)
Remove `model`, `systemInstruction`, and `role` from the chat handler's input
influence. Define `CHAT_MODEL` and `CHAT_SYSTEM_INSTRUCTION` as module
constants. Build `aiClient.chats.create` with those constants and return
`{ text, model: CHAT_MODEL }`. Well-formed clients see the same response
shape; the model field now always reports the pinned model.

### Async error handling (`server/lib/asyncHandler.ts`, `server/app.ts`)
`asyncHandler(fn)` wraps an async `RequestHandler` and calls `next(err)` on
rejection. Wrap every async AI endpoint. Add a final error-handling middleware
in `createApp()` that logs the error server-side and returns
`500 { error: 'Internal server error' }`. The synchronous 405 handler is left
as-is.

### Bind host (`server/config/index.ts`, `server/index.ts`)
Add `HOST` env var (default `'0.0.0.0'`) and pass it to `app.listen`. Update the
startup log to report the configured host. Default behavior is unchanged.

### Tests (`tests/server-ai.test.ts`)
New file using loopback `listen(0)`/`fetch`/`close` with injected auth fakes and
injected limiter config: 401 without JWT; 200 with valid JWT; 429 +
`Retry-After` after the limit; 400 on wrong body types for each validator;
chat ignores client model/systemInstruction and returns the pinned model;
async rejection yields 500 via the error middleware; non-POST still 405.

## What is left to the implementer

- Follow the plan's task order with TDD (failing test first, minimal code).
- Preserve the exact auth/rate-limit/validation error shapes above.
- Re-run the full suite, lint, and build before reporting.
