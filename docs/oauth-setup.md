# Google OAuth setup and verification

This document separates **code behavior** from **external configuration**. The
external settings below are required for Google sign-in to work. They were
**not** verified against the Supabase or Google Cloud dashboards during the
Phase 2 implementation because dashboard credentials were not available.

Project ref: `rcbkqzmivsogoiltsomv` (from `VITE_SUPABASE_URL`).

## How the flow works in this app

1. The user clicks **Continue with Google** on the sign-in page.
2. `signInWithGoogle()` calls `supabase.auth.signInWithOAuth()` with
   `redirectTo` built from the current origin and `VITE` `BASE_URL`, the `google`
   provider, and `prompt=select_account`.
3. Supabase redirects to Google, then back to its own callback at
   `https://rcbkqzmivsogoiltsomv.supabase.co/auth/v1/callback`.
4. Supabase redirects the browser to the app with `?code=...` (PKCE).
5. The Supabase client performs the code exchange exactly once during
   initialization. The app waits for that result, strips the callback
   parameters, loads or creates the `profiles` row, and renders the normal
   student or recruiter experience.

The client is configured with `flowType: 'pkce'`, `detectSessionInUrl: true`,
`persistSession: true`, and `autoRefreshToken: true`. Do not add a manual
`exchangeCodeForSession()` call: the callback must be processed once.

## External configuration required

### 1. Supabase Auth URL configuration

In the Supabase dashboard: **Authentication → URL Configuration**.

| Setting | Required value |
| --- | --- |
| Site URL | The canonical deployed app origin, for example `https://app.example.com` |
| Redirect URLs | `http://localhost:3000` |
| | `http://localhost:3000/**` |
| | The production origin, for example `https://app.example.com` |
| | The production origin with a path wildcard, for example `https://app.example.com/**` |

Notes:

- The app requests the callback at the **origin plus the Vite `BASE_URL`**, with
  a trailing slash. At the repository root that is `http://localhost:3000/` in
  development.
- Supabase treats a redirect as valid when its scheme, host, and port match the
  configured **Site URL**. Otherwise the URL must match one of the **Redirect
  URLs** patterns. If it does not match, Supabase falls back to the Site URL,
  which can move the user to a different origin.
- PKCE stores the code verifier in the browser's local storage for the origin
  where sign-in started. A callback that lands on a different origin cannot
  complete the exchange and the app shows:
  **"This sign-in link is no longer valid in this browser..."**
- Add the `127.0.0.1` variants as well if you open the app through that host:
  `http://127.0.0.1:3000` and `http://127.0.0.1:3000/**`.

### 2. Google Cloud OAuth client

In **Google Cloud Console → APIs & Services → Credentials** for the OAuth 2.0
web client used by Supabase:

| Setting | Required value |
| --- | --- |
| Authorized redirect URI | `https://rcbkqzmivsogoiltsomv.supabase.co/auth/v1/callback` |
| Authorized JavaScript origin | Optional for this server-side redirect flow; add the app origins if the client requires them |

The Google **client ID and client secret** belong in the Supabase dashboard
(**Authentication → Providers → Google**). Do not add them to `.env.local` or
any `VITE_` variable; `VITE_` values are shipped to the browser.

### 3. Supabase Google provider

**Authentication → Providers → Google** must be enabled with the Google client
ID and secret. A live, unauthenticated probe of
`https://rcbkqzmivsogoiltsomv.supabase.co/auth/v1/settings` returned
`external.google: true`, so Google is enabled at the time of this work. The
client ID/secret and the consent-screen configuration still need owner
verification.

### 4. Profiles table and RLS

The app reads and inserts into `profiles` with the columns:

`id`, `full_name`, `user_type`, `company_name`

For new Google users, the app inserts:

```text
id            = auth user id
full_name     = Google name / email prefix / "Omic Hub User"
user_type     = "student" unless metadata says "recruiter"
company_name  = null for students
```

The insert only succeeds if the table's RLS policies allow it, for example:

```sql
create policy "Users can insert their own profile"
on public.profiles for insert
to authenticated
with check (auth.uid() = id);

create policy "Users can read their own profile"
on public.profiles for select
to authenticated
using (auth.uid() = id);
```

This is a database policy change, not an application code change. If the insert
is denied, authentication still succeeds using metadata as a fallback, but no
row is created. The current policies and table definition were **not** verified
in this environment.

### 5. Frontend environment

`.env.local` (not committed) must define:

```text
VITE_SUPABASE_URL=https://rcbkqzmivsogoiltsomv.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<publishable key>
```

`VITE_SUPABASE_ANON_KEY` is also accepted as a fallback. The publishable key is
safe to ship to the browser; a service-role key is not.

## Development and production URLs

| Environment | App URL | Callback requested |
| --- | --- | --- |
| `npm run dev` | `http://localhost:3000` | `http://localhost:3000/` |
| Production (root) | `https://app.example.com` | `https://app.example.com/` |
| Production (sub-path) | `https://app.example.com/app/` | `https://app.example.com/app/` (depends on `BASE_URL`) |

The production origin must be the Supabase **Site URL**, or be present in the
Redirect URLs list. Development and production can coexist in the list.

## Manual verification checklist

Use a browser with no existing session, and confirm each step:

1. Open the app and click **Continue with Google**.
2. Choose an account in Google's account picker.
3. The browser returns to the app at `/?code=...`; the URL is cleaned and the
   student plan page or the existing student/recruiter dashboard appears.
4. Reload the page; the session persists and the same screen appears.
5. Open the profile menu and choose **Sign Out**; the sign-in page appears and
   no session remains in local storage.
6. Repeat sign-in but cancel the Google prompt; the app shows
   **"Sign-in was cancelled."** and stays on the sign-in page.
7. Use **Forgot password?**; open the email link; the reset page appears; set a
   new password; the app returns to sign-in with a success message.

## Known limitations

- The Supabase Site URL / Redirect URLs and Google Cloud redirect URI were not
  verified against the dashboards. The owner must confirm them.
- Real Google account sign-in was not exercised in this environment. The PKCE
  initiation, single-use callback exchange, session persistence, profile
  synchronization, recovery, password update, and logout paths were verified
  against a local mock Supabase server.
- Profile insertion depends on RLS policies that were not verified.
- The OAuth consent screen (test users, publishing status) must be configured in
  Google Cloud for non-test users to sign in.
