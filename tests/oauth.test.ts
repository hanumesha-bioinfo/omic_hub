import assert from 'node:assert/strict';
import test from 'node:test';
import type { AuthSession, SupabaseClient } from '@supabase/supabase-js';
import {
  buildAuthRedirectUrl,
  getAuthCallbackKind,
} from '../src/features/auth/callback';
import {
  AUTH_MESSAGES,
  getAuthErrorMessage,
} from '../src/features/auth/messages';
import {
  buildGoogleSignInOptions,
  resetInitialSessionResolution,
  resolveInitialSessionWithClient,
  signInWithGoogleWithClient,
  signOutWithClient,
  type GoogleSignInClient,
  type InitialSessionClient,
  type SignOutClient,
} from '../src/features/auth/authOperations';
import {
  SUPABASE_AUTH_OPTIONS,
  resolveSupabaseCredentials,
} from '../src/lib/authConfig';
import {
  loadOrCreateProfileWithClient,
  type ProfileRecord,
} from '../src/features/auth/profileData';

const fakeSession = {
  access_token: 'access-token',
  refresh_token: 'refresh-token',
  token_type: 'bearer',
  expires_in: 3600,
  expires_at: 9_999_999_999,
  user: { id: 'user-1' },
} as unknown as AuthSession;

function createInitialSessionClient(config: {
  initializeError?: unknown;
  sessionError?: unknown;
  session?: AuthSession | null;
  onInitialize?: () => void;
  onGetSession?: () => void;
}): InitialSessionClient {
  return {
    auth: {
      initialize: async () => {
        config.onInitialize?.();
        return { error: config.initializeError ?? null };
      },
      getSession: async () => {
        config.onGetSession?.();
        return {
          data: { session: config.session ?? null },
          error: config.sessionError ?? null,
        };
      },
    },
  } as unknown as InitialSessionClient;
}

test('Supabase auth uses PKCE and processes the callback exactly once', () => {
  assert.equal(SUPABASE_AUTH_OPTIONS.flowType, 'pkce');
  assert.equal(SUPABASE_AUTH_OPTIONS.detectSessionInUrl, true);
  assert.equal(SUPABASE_AUTH_OPTIONS.persistSession, true);
  assert.equal(SUPABASE_AUTH_OPTIONS.autoRefreshToken, true);
});

test('resolves Supabase credentials without leaking or inventing values', () => {
  assert.deepEqual(
    resolveSupabaseCredentials({
      VITE_SUPABASE_URL: ' https://example.supabase.co ',
      VITE_SUPABASE_PUBLISHABLE_KEY: ' publishable-key ',
      VITE_SUPABASE_ANON_KEY: 'anon-key',
    }),
    { url: 'https://example.supabase.co', key: 'publishable-key' },
  );

  assert.equal(
    resolveSupabaseCredentials({
      VITE_SUPABASE_URL: 'https://example.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'anon-key',
    }).key,
    'anon-key',
  );

  assert.throws(
    () => resolveSupabaseCredentials({}),
    /Missing Supabase configuration/,
  );
});

test('classifies every kind of auth callback', () => {
  assert.equal(getAuthCallbackKind('', ''), 'none');
  assert.equal(
    getAuthCallbackKind('#error=access_denied&error_code=access_denied'),
    'error',
  );
  assert.equal(getAuthCallbackKind('', '?code=abc123&state=xyz'), 'pkce');
  assert.equal(
    getAuthCallbackKind('#access_token=x&refresh_token=y&token_type=bearer'),
    'implicit',
  );
});

test('maps auth-js redirect errors that keep the provider code in details', () => {
  assert.equal(
    getAuthErrorMessage(
      {
        name: 'AuthImplicitGrantRedirectError',
        message: 'Error in URL with unspecified error_description',
        details: { error: 'access_denied', code: 'access_denied' },
      },
      AUTH_MESSAGES.authCallbackFailed,
    ),
    AUTH_MESSAGES.oauthCancelled,
  );

  assert.equal(
    getAuthErrorMessage(
      { code: 'pkce_code_verifier_not_found', message: 'PKCE verifier missing' },
      AUTH_MESSAGES.authCallbackFailed,
    ),
    AUTH_MESSAGES.oauthIncomplete,
  );
});

test('surfaces callback errors from initialize instead of silently returning to sign-in', async () => {
  resetInitialSessionResolution();

  const initializeError = {
    name: 'AuthPKCEGrantCodeExchangeError',
    message: 'invalid flow state',
    code: 'flow_state_not_found',
  };
  let getSessionCalls = 0;

  const client = createInitialSessionClient({
    initializeError,
    onGetSession: () => {
      getSessionCalls += 1;
    },
  });

  await assert.rejects(
    () => resolveInitialSessionWithClient(client),
    (error: unknown) => error === initializeError,
  );
  assert.equal(getSessionCalls, 0);
});

test('resolves the initial session once for concurrent callers', async () => {
  resetInitialSessionResolution();

  let initializeCalls = 0;
  let getSessionCalls = 0;
  const client = createInitialSessionClient({
    session: fakeSession,
    onInitialize: () => {
      initializeCalls += 1;
    },
    onGetSession: () => {
      getSessionCalls += 1;
    },
  });

  const [first, second] = await Promise.all([
    resolveInitialSessionWithClient(client),
    resolveInitialSessionWithClient(client),
  ]);

  assert.equal(first, fakeSession);
  assert.equal(second, fakeSession);
  assert.equal(initializeCalls, 1);
  assert.equal(getSessionCalls, 1);
});

test('surfaces session read errors from the initial resolution', async () => {
  resetInitialSessionResolution();

  const sessionError = { code: 'session_not_found', message: 'No session' };
  const client = createInitialSessionClient({ sessionError });

  await assert.rejects(
    () => resolveInitialSessionWithClient(client),
    (error: unknown) => error === sessionError,
  );
});

test('builds a Google OAuth request with the exact callback URL', async () => {
  const calls: unknown[] = [];
  const client = {
    auth: {
      signInWithOAuth: async (credentials: unknown) => {
        calls.push(credentials);
        return { error: null };
      },
    },
  } as unknown as GoogleSignInClient;

  await signInWithGoogleWithClient(client, 'http://localhost:3000/');

  assert.deepEqual(calls, [
    {
      provider: 'google',
      options: {
        redirectTo: 'http://localhost:3000/',
        queryParams: { prompt: 'select_account' },
      },
    },
  ]);
  assert.deepEqual(buildGoogleSignInOptions('https://omic.example/app/'), {
    provider: 'google',
    options: {
      redirectTo: 'https://omic.example/app/',
      queryParams: { prompt: 'select_account' },
    },
  });
});

test('propagates Google OAuth initiation errors', async () => {
  const oauthError = { code: 'provider_disabled', message: 'Provider disabled' };
  const client = {
    auth: {
      signInWithOAuth: async () => ({ error: oauthError }),
    },
  } as unknown as GoogleSignInClient;

  await assert.rejects(
    () => signInWithGoogleWithClient(client, 'http://localhost:3000/'),
    (error: unknown) => error === oauthError,
  );
});

test('signs out locally if the global sign-out fails, then reports the original error', async () => {
  const scopes: Array<string | undefined> = [];
  const globalError = { message: 'network down' };
  const client = {
    auth: {
      signOut: async (options?: { scope?: string }) => {
        scopes.push(options?.scope);

        if (options?.scope === 'local') return { error: null };
        return { error: globalError };
      },
    },
  } as unknown as SignOutClient;

  await assert.rejects(
    () => signOutWithClient(client),
    (error: unknown) => error === globalError,
  );
  assert.deepEqual(scopes, [undefined, 'local']);
});

test('does not fall back to a local sign-out when the session is already gone', async () => {
  let calls = 0;
  const client = {
    auth: {
      signOut: async () => {
        calls += 1;
        return { error: null };
      },
    },
  } as unknown as SignOutClient;

  await signOutWithClient(client);
  assert.equal(calls, 1);
});

test('re-reads the profile after any insert failure before falling back', async () => {
  const existing: ProfileRecord = {
    id: 'user-1',
    full_name: 'Created By Trigger',
    user_type: 'student',
    company_name: null,
  };
  let selectCall = 0;

  const client = {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => {
            selectCall += 1;
            return selectCall === 1
              ? { data: null, error: null }
              : { data: existing, error: null };
          },
        }),
      }),
      insert: () => ({
        select: () => ({
          single: async () => ({
            data: null,
            error: {
              code: '42501',
              message: 'permission denied for table profiles',
            },
          }),
        }),
      }),
    }),
  } as unknown as SupabaseClient;

  const profile = await loadOrCreateProfileWithClient(
    {
      id: 'user-1',
      email: 'ada@example.com',
      app_metadata: {},
      user_metadata: { full_name: 'Ada Lovelace' },
      aud: 'authenticated',
      created_at: new Date(0).toISOString(),
    } as never,
    client,
  );

  assert.deepEqual(profile, existing);
  assert.equal(selectCall, 2);
});

test('keeps the redirect URL on the current origin and app base path', () => {
  assert.equal(
    buildAuthRedirectUrl('https://omic.example', '/'),
    'https://omic.example/',
  );
  assert.equal(
    buildAuthRedirectUrl('https://omic.example', '/dashboard/'),
    'https://omic.example/dashboard/',
  );
  assert.equal(
    buildAuthRedirectUrl('http://localhost:3000', '/app'),
    'http://localhost:3000/app/',
  );
});
