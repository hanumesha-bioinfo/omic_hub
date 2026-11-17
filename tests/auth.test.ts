import assert from 'node:assert/strict';
import test from 'node:test';
import type { AuthUser, SupabaseClient } from '@supabase/supabase-js';
import {
  buildAuthRedirectUrl,
  isPasswordRecoveryCallback,
  parseAuthCallbackError,
  stripAuthCallbackParams,
} from '../src/features/auth/callback';
import {
  AUTH_MESSAGES,
  getAuthErrorMessage,
} from '../src/features/auth/messages';
import {
  deriveProfileFromAuthUser,
  isUniqueViolation,
  loadOrCreateProfileWithClient,
  mapProfileToUserProfile,
  type ProfileRecord,
} from '../src/features/auth/profileData';

function makeAuthUser(overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    id: 'user-1',
    email: 'ada@example.com',
    app_metadata: {},
    user_metadata: { full_name: 'Ada Lovelace' },
    aud: 'authenticated',
    created_at: new Date(0).toISOString(),
    ...overrides,
  } as AuthUser;
}

function createProfileClient(config: {
  selectResults?: Array<{ data: unknown; error: unknown }>;
  insertResult?: { data: unknown; error: unknown };
  onSelect?: (userId: string) => void;
}) {
  let selectCall = 0;

  const client = {
    from: (table: string) => {
      assert.equal(table, 'profiles');

      return {
        select: (_columns: string) => ({
          eq: (column: string, value: string) => {
            assert.equal(column, 'id');
            config.onSelect?.(value);

            return {
              maybeSingle: async () => {
                const result =
                  config.selectResults?.[selectCall] ??
                  { data: null, error: null };
                selectCall += 1;
                return result;
              },
            };
          },
        }),
        insert: (_values: Record<string, unknown>) => ({
          select: (_columns: string) => ({
            single: async () =>
              config.insertResult ?? { data: null, error: null },
          }),
        }),
      };
    },
  };

  return client as unknown as SupabaseClient;
}

test('maps known Supabase auth error codes to actionable messages', () => {
  assert.equal(
    getAuthErrorMessage({ code: 'invalid_credentials' }, 'fallback'),
    AUTH_MESSAGES.invalidCredentials,
  );
  assert.equal(
    getAuthErrorMessage({ code: 'email_not_confirmed' }, 'fallback'),
    AUTH_MESSAGES.emailNotConfirmed,
  );
  assert.equal(
    getAuthErrorMessage({ code: 'provider_disabled' }, 'fallback'),
    AUTH_MESSAGES.providerDisabled,
  );
  assert.equal(
    getAuthErrorMessage({ code: 'session_expired' }, 'fallback'),
    AUTH_MESSAGES.sessionExpired,
  );
});

test('maps raw Supabase messages and network failures', () => {
  assert.equal(
    getAuthErrorMessage(new Error('Invalid login credentials'), 'fallback'),
    AUTH_MESSAGES.invalidCredentials,
  );
  assert.equal(
    getAuthErrorMessage(new Error('Failed to fetch'), 'fallback'),
    AUTH_MESSAGES.networkError,
  );
  assert.equal(
    getAuthErrorMessage(
      new Error('Password should be at least 8 characters.'),
      'fallback',
    ),
    AUTH_MESSAGES.weakPassword,
  );
});

test('uses the fallback for unknown auth errors instead of raw internals', () => {
  assert.equal(
    getAuthErrorMessage(new Error('PGRST internal detail'), 'safe fallback'),
    'safe fallback',
  );
});

test('builds a normalized OAuth redirect URL', () => {
  assert.equal(
    buildAuthRedirectUrl('http://localhost:3000', '/'),
    'http://localhost:3000/',
  );
  assert.equal(
    buildAuthRedirectUrl('https://omic.example', '/app'),
    'https://omic.example/app/',
  );
});

test('detects password-recovery callbacks in hash and query strings', () => {
  assert.equal(
    isPasswordRecoveryCallback('#access_token=x&type=recovery'),
    true,
  );
  assert.equal(isPasswordRecoveryCallback('?type=recovery'), true);
  assert.equal(isPasswordRecoveryCallback('#access_token=x&type=signup'), false);
});

test('parses OAuth callback errors from hash and query strings', () => {
  assert.deepEqual(
    parseAuthCallbackError(
      '#error=access_denied&error_code=access_denied&error_description=User+cancelled',
    ),
    { code: 'access_denied', description: 'User cancelled' },
  );

  assert.deepEqual(
    parseAuthCallbackError('', '?error=server_error&error_code=unexpected_failure'),
    { code: 'unexpected_failure', description: undefined },
  );

  assert.equal(parseAuthCallbackError('#access_token=x'), null);
});

test('strips auth parameters while preserving ordinary hash routes', () => {
  assert.equal(
    stripAuthCallbackParams(
      'http://localhost:3000/#access_token=x&refresh_token=y&type=recovery',
    ),
    '/',
  );
  assert.equal(
    stripAuthCallbackParams(
      'http://localhost:3000/?error=access_denied#error=access_denied',
    ),
    '/',
  );
  assert.equal(
    stripAuthCallbackParams('http://localhost:3000/#/dashboard'),
    '/#/dashboard',
  );
});

test('derives a safe fallback profile from auth metadata', () => {
  const profile = deriveProfileFromAuthUser(
    makeAuthUser({
      user_metadata: {
        full_name: 'Grace Hopper',
        user_type: 'recruiter',
        company_name: 'Navy Labs',
      },
    }),
  );

  assert.deepEqual(profile, {
    id: 'user-1',
    full_name: 'Grace Hopper',
    user_type: 'recruiter',
    company_name: 'Navy Labs',
  });
});

test('maps a profile to the correct app role and never invents a company for students', () => {
  const authUser = makeAuthUser();

  const student = mapProfileToUserProfile(authUser, {
    id: 'user-1',
    full_name: 'Ada Lovelace',
    user_type: 'student',
    company_name: 'Should not be used',
  });

  assert.equal(student.userType, 'student');
  assert.equal(student.role, 'Student');
  assert.equal(student.companyName, undefined);
  assert.equal(student.email, 'ada@example.com');

  const recruiter = mapProfileToUserProfile(authUser, {
    id: 'user-1',
    full_name: 'Ada Lovelace',
    user_type: 'recruiter',
    company_name: 'Analytical Engines',
  });

  assert.equal(recruiter.userType, 'recruiter');
  assert.equal(recruiter.role, 'Recruiter');
  assert.equal(recruiter.companyName, 'Analytical Engines');
});

test('loads an existing profile scoped to the authenticated user id', async () => {
  const existing: ProfileRecord = {
    id: 'user-1',
    full_name: 'Existing Name',
    user_type: 'student',
    company_name: null,
  };
  const selectedIds: string[] = [];

  const client = createProfileClient({
    selectResults: [{ data: existing, error: null }],
    onSelect: (userId) => selectedIds.push(userId),
  });

  const profile = await loadOrCreateProfileWithClient(
    makeAuthUser(),
    client,
  );

  assert.deepEqual(profile, existing);
  assert.deepEqual(selectedIds, ['user-1']);
});

test('creates a missing profile and returns the inserted row', async () => {
  const inserted: ProfileRecord = {
    id: 'user-1',
    full_name: 'Ada Lovelace',
    user_type: 'student',
    company_name: null,
  };

  const client = createProfileClient({
    selectResults: [{ data: null, error: null }],
    insertResult: { data: inserted, error: null },
  });

  const profile = await loadOrCreateProfileWithClient(
    makeAuthUser(),
    client,
  );

  assert.deepEqual(profile, inserted);
});

test('recovers from a duplicate-key insert race by re-reading the profile', async () => {
  const existing: ProfileRecord = {
    id: 'user-1',
    full_name: 'Trigger Created',
    user_type: 'student',
    company_name: null,
  };

  const client = createProfileClient({
    selectResults: [
      { data: null, error: null },
      { data: existing, error: null },
    ],
    insertResult: {
      data: null,
      error: { code: '23505', message: 'duplicate key value' },
    },
  });

  const profile = await loadOrCreateProfileWithClient(
    makeAuthUser(),
    client,
  );

  assert.deepEqual(profile, existing);
  assert.equal(isUniqueViolation({ code: '23505' }), true);
});

test('does not block authentication when profile creation is denied by RLS', async () => {
  const client = createProfileClient({
    selectResults: [{ data: null, error: null }],
    insertResult: {
      data: null,
      error: { code: '42501', message: 'permission denied for table profiles' },
    },
  });

  const profile = await loadOrCreateProfileWithClient(
    makeAuthUser(),
    client,
  );

  assert.deepEqual(profile, {
    id: 'user-1',
    full_name: 'Ada Lovelace',
    user_type: 'student',
    company_name: null,
  });
});

test('does not block authentication when the profile read fails', async () => {
  const client = createProfileClient({
    selectResults: [
      {
        data: null,
        error: { code: '42501', message: 'permission denied for table profiles' },
      },
    ],
  });

  const profile = await loadOrCreateProfileWithClient(
    makeAuthUser({ user_metadata: { name: 'Metadata Name' } }),
    client,
  );

  assert.equal(profile.full_name, 'Metadata Name');
});

