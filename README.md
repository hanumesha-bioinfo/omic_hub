# OMIC HUB

A career-acceleration platform for bioinformatics. OMIC HUB helps students and researchers benchmark their resumes against ATS parsers, close skill gaps, track opportunities, practise interviews, and earn verified assessments. Recruiters can post roles, review applicants, message candidates, and benchmark talent against computational-biology pipelines.

## Stack

- **Frontend:** React 19, TypeScript, Vite 8, Tailwind CSS v4, lucide-react, Motion, Three.js shaders
- **Backend:** Express 4 (single Node process serving the API and built client)
- **Data & auth:** Supabase (profiles, roles, bookmarks, JWT verification)
- **AI:** Google Gemini via `@google/genai`
- **Payments:** Razorpay (one-time ₹49 Premium, activated by signed webhook only)
- **Tests:** Node's built-in test runner via `tsx`

There is no separate router or UI component library: navigation is driven by a typed tab union, and styling uses Tailwind utility classes with design tokens defined in `src/index.css`.

## Quick start

Prerequisites: Node.js and npm, plus Supabase / Gemini / Razorpay credentials for the features you plan to use.

1. Install dependencies:
   ```bash
   npm install
   ```
   If npm reports a peer-dependency conflict, use `npm ci --legacy-peer-deps`.

2. Copy the environment template and fill in your values:
   ```bash
   cp .env.example .env.local
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```
   The Express server and Vite client run together on `http://localhost:3000` by default.

Useful commands:

| Command | Purpose |
| --- | --- |
| `npm run dev` | Run the development server |
| `npm run build` | Produce the production client bundle in `dist/` |
| `npm start` | Serve the built client and API in production |
| `npm run preview` | Preview the production build locally |
| `npm test` | Run the full test suite |
| `npm run lint` | Type-check with `tsc --noEmit` |

## Environment

All variables live in `.env.local` (git-ignored). Server-side secrets must **never** use the `VITE_` prefix — those values would be embedded in the browser bundle. See `.env.example` for an annotated template.

### Server variables

| Variable | Purpose |
| --- | --- |
| `PORT` | HTTP port (default `3000`) |
| `HOST` | Bind address (default `0.0.0.0`) |
| `NODE_ENV` | Set to `production` when serving the built client |
| `GEMINI_API_KEY` | Google Gemini API key |
| `SUPABASE_URL` | Supabase project URL (server-side) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service-role key (server-side secret) |
| `RAZORPAY_KEY_ID` | Razorpay key id (server-side) |
| `RAZORPAY_KEY_SECRET` | Razorpay key secret (server-side) |
| `RAZORPAY_WEBHOOK_SECRET` | Secret used to verify `x-razorpay-signature` |
| `CERTIFICATE_SIGNING_SECRET` | HMAC secret for signed assessment certificates |
| `PUBLIC_APP_URL` | Public base URL used to build absolute links |

> The code reads `PUBLIC_APP_URL`, not `APP_URL`. Setting `APP_URL` has no effect.

### Client variables

| Variable | Purpose |
| --- | --- |
| `VITE_SUPABASE_URL` | Supabase project URL (public) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable/anon key (public) |
| `VITE_API_BASE_URL` | Optional API base URL when the API is on a different origin |

## Deploy

1. Set `NODE_ENV=production` and every server variable above in your hosting environment.
2. Run `npm run build` to generate `dist/`.
3. Run `npm start`. The Express server serves `dist/` and the API from a single process.
4. Set `PUBLIC_APP_URL` to the public origin so certificate links and redirects are correct.
5. Point the Razorpay webhook at `POST <PUBLIC_APP_URL>/api/payments/webhook`. Premium entitlements are granted **only** by that signed webhook — a client-side "upgrade" cannot activate Premium.

There is no Dockerfile or CI configuration in this repository; deploy with any Node.js host that can run `npm run build && npm start`.

## Verifying a certificate

Certificates are issued by the server and can be checked at `GET /verify/cert/:token`. The page is public and verifies the HMAC signature, so a forged or altered certificate will not be shown as valid.
