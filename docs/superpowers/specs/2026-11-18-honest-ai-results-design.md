# Honest AI Results & Server-Issued Certificates — Design

## Intent

The app currently presents fabricated model output as real and mints "Verified"
certificates in the browser. On the server, `generateAIResponse` and the
chat/search/transcribe/image/voice fallbacks return invented scores, transcripts
and citations with HTTP 200; search grounding even sets `grounded: true` with
fake nature.com/bioRxiv URLs. In the browser, every `src/services/api/ai.ts`
helper catches *all* errors and substitutes hardcoded results — including an
`overallScore: 87` — so real 401/429/500 responses never reach the user. That 87
clears the ≥80 threshold in `MockInterviewView.tsx:190-220`, which generates a
random `OMI-CERT-#####` and a `https://omichub.ai/verify/cert/...` URL that
resolves to nothing. `CertificationsView.tsx:43-92` and
`services/storage/defaults.ts:599-628` seed four more invented "Verified"
credentials. This change removes the deception: provenance is explicit, errors
are real, and certificates are issued and verifiable only by the server.

## Goals

- Every non-model-generated AI response carries `isFallback: true`; success
  responses carry `isFallback: false`. The UI shows a visible notice when a
  fallback is displayed.
- Search grounding fallback reports `grounded: false`, `sources: []`,
  `searchEntryPoint: null`, and no invented statistics or citation URLs.
- Frontend AI helpers stop fabricating results; real API errors propagate to
  existing error/toast paths.
- Certificates are issued only by a server endpoint, bound to a genuine (non-
  fallback) server evaluation, and verifiable at a public URL.
- All hardcoded/seed "Verified" credentials and badges are removed.

## Non-goals

- No new runtime dependencies, no database migration (signed-token approach).
- No revocation in v1 (signed tokens cannot be invalidated individually).
- No changes to the Gemini prompts, model choice, or the existing AI auth and
  rate-limit middleware.
- No changes to payments, account, recruiter, or auth code outside certificate
  wiring.
- No email/sharing flow beyond producing the verification URL.

## Constraints

- Express 4: async handlers must use the existing `asyncHandler` wrapper.
- `req.auth.userId` (set by the AI auth middleware) binds tokens to a user.
- `CERTIFICATE_SIGNING_SECRET` is required to issue certificates; without it,
  issuance fails closed with 503 and evaluations omit the assessment token.
- `PUBLIC_APP_URL` must be set in production so verification URLs point at the
  real host; dev fallback is `http://localhost:${PORT}`.
- Baseline `npm run lint` has exactly 13 pre-existing errors in
  `src/services/storage/upload.ts`; zero new errors allowed.
- `npm test` runs all tests (`tsx --test tests/*.test.ts`); no name filtering.
- No `npm install`; package.json/package-lock.json untouched.

## Approaches

- **A — Signed assessment + certificate tokens (chosen).** The evaluate
  endpoint signs a short-lived token over the genuine result; the issue
  endpoint exchanges it for a signed certificate; a public endpoint verifies
  the signature. Stateless, no migration, no new service. Trade-off: no
  revocation until a deny-list or DB is added.
- **B — Supabase table + RLS.** Persist assessments and certificates, verify by
  lookup. Revocable and auditable, but needs a migration and a new service.
- **C — Opaque random ID in a server table.** Like B without binding to a real
  assessment; weaker and still needs storage.

A was selected by the human partner.

## Design

### 1. Provenance flags

`server/ai/client.ts` — `generateAIResponse` returns
`{ ...fallbackGenerator(), isFallback: true }` on the fallback path and
`{ ...parsed, isFallback: false }` on the Gemini success path.

`server/routes/ai.ts` — add `isFallback: false` to all genuine success
responses and `isFallback: true` to all ten fallback responses. Rewrite the
search-grounding fallback to a neutral unavailability message with
`sources: []`, `searchEntryPoint: null`, `grounded: false`. Change the
voice-speak fallback message from "Speech generated" to "Speech synthesis
unavailable", with `audio: null, isFallback: true`. Keep all existing endpoint
paths, methods, validators and success shapes.

`BioinformaticsNews.tsx` — when `grounded === false` or `isFallback`, render a
"Live search unavailable — try again" notice instead of the "Real-time
Grounded" heading and the "Verified Grounding Sources" block. Other AI views
that show scores show a "Sample content — AI unavailable" notice when
`isFallback` is true. `MockInterviewView.tsx` shows its "Credential Verified"
banner only after a server-issued certificate exists, never on score alone.

**My call:** any UI label that claims verification or grounding for AI output
is conditional on `!isFallback` (and `grounded` where applicable). This extends
the named notice swaps to every such label in the components already in scope.

### 2. Frontend honesty

`src/services/api/ai.ts` — remove every `try/catch` fabricated return; each
helper simply awaits `postAi`/`postAiOrNull` and returns the server response (or
throws). Stop sending the ignored `model`/`role`/`systemInstruction` fields to
`/api/ai/chat`. Add `isFallback`/`grounded` to the relevant response interfaces.
`transcribeUserAudio` still returns a string but throws on failure instead of
returning an invented transcript. Existing component `catch` blocks already
show error toasts; no new UI error plumbing needed.

### 3. Certificate tokens (`server/lib/certificates.ts`)

Node `crypto` HMAC-SHA256, base64url-encoded, canonical JSON payloads, timing-
safe verification. Two token kinds:

- `AssessmentToken { kind:'assessment'; sub; qHash; aHash; score; skill; iat; exp }`
  — 15-minute lifetime, issued only when `result.isFallback === false` and
  `overallScore` is a finite number in 0..100.
- `CertificateToken { kind:'certificate'; sub; verificationId; skill; score;
  issuedDate; iat }` — long-lived, embedded in the verification URL.

`createCertificateService({ secret, now })` exposes `sign`/`verify` for
injection. `verificationId = 'OMI-CERT-' + base64url(HMAC(sub|skill|score|iat)).slice(0,10)`.

**Verification transport (my call):** the `verificationUrl` is
`${PUBLIC_APP_URL}/verify/cert/${token}`, where `token` is the *full* base64url
`CertificateToken`. The public endpoint is `GET /verify/cert/:token`; it verifies
the signature and returns the `verificationId` from the payload for display. A
truncated ID alone cannot carry or verify the claims, so it is never used as the
sole path parameter.

### 4. Endpoints

- Modify `POST /api/ai/mock-interview/evaluate-response`: when genuine, include
  `assessmentToken` from the certificate service in the response. Never issue
  one for a fallback result.
- New `server/routes/certificates.ts`, mounted in `server/routes/index.ts`:
  - `POST /api/certificates/issue` (auth required): validates
    `{ assessmentToken, skillName? }`, verifies kind/signature/expiry/`sub ===
    req.auth.userId`/`score >= 80`/skill match, and returns a fully
    `CertifiedSkillBadge`-shaped object. **My call:** every claimed field —
    `id`, `skillName`, `category`, `level`, `score`, `issuedDate`,
    `verificationId`, `verificationUrl`, `status`, `assessedAreas`,
    `interviewerLens` — is authored by the server (`category`/`level` derived
    from score; `assessedAreas`/`interviewerLens` from server-side templates).
    The client only sets the UI-only `addedToResume`. `skillName` is optional;
    when present it must equal the token's `skill` after `trim().toLowerCase()`;
    when absent the token's `skill` is used. If `testedSkill` was absent at
    evaluation, the token binds `skill = role`. 503 when the signing secret is
    unset; 400/403 on invalid or mismatched tokens.
  - `GET /verify/cert/:token` (public): verifies the full signed token and
    returns `{ valid: boolean, verificationId, skillName, score, issuedDate,
    status }`; `{ valid: false }` for unknown/tampered tokens.
- New `src/services/api/certificates.ts` — `issueCertificate(payload)` using
  the existing `postAi` bearer-token helper.

### 5. Remove fake credentials

- `MockInterviewView.tsx` — delete the random code/URL/`status:'Verified'`
  block. On a passing genuine eval with `assessmentToken`, call
  `issueCertificate`; only on success build the badge from the server response,
  store it, fire confetti, and show the success toast. Otherwise show an
  informative toast and issue nothing.
- `CertificationsView.tsx` — remove `VERIFIED_ACADEMIC_CERTS` and its render
  section; render only `StorageService.getCertifiedBadges()` with an empty
  state.
- `services/storage/defaults.ts` — `INITIAL_CERTIFIED_BADGES = []`.
- `services/storage/interviews.ts` / storage keys — bump the certified-badges
  storage key to a new version so returning users' previously saved fake
  "Verified" badges are discarded on next load (old key left unused, no attempt
  to migrate fabricated data).
- `ResumeBuilderView.tsx:1223` — remove the invented
  `OMI-CERT-${Math.random()…}` credential id/verification URL from the manual
  resume-certificate flow; self-reported entries must not claim a verification
  id or link.
- `types.ts` — add an evaluation-result interface with `assessmentToken?`,
  `isFallback?`; keep `CertifiedSkillBadge.status: 'Verified'` because badges
  now originate from a verified server token.

### 6. Tests

- `tests/server-certificates.test.ts` — sign/verify roundtrip, tamper/expiry/
  wrong-kind/wrong-subject rejection, issue rejects missing/fallback/below-
  threshold tokens, verification returns valid/invalid.
- `tests/ai-honesty.test.ts` — server fallbacks carry `isFallback: true`;
  search fallback `grounded:false`/`sources:[]`; frontend helpers throw on a
  non-OK response instead of returning invented data (injected fetcher/token);
  no hardcoded `verificationUrl` or `Math.random` certificate code remains.

Verification: full `npm test`, lint (13 baseline errors only), build, and greps
for `grounded: true` in fallback paths, hardcoded `verify/cert/` URLs, and
`Math.random`-generated certificate ids.
