import assert from 'node:assert/strict';
import test from 'node:test';
import {
  SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_URL,
} from '../server/config';
import {
  adminVerifier,
  createSupabaseAdminVerifier,
  type ServerProfile,
  type SupabaseLikeClient,
} from '../server/lib/supabaseAdmin';

function fakeClient(overrides: {
  getUser?: (jwt: string) => Promise<{
    data: { user: { id: string } | null };
    error: { message: string } | null;
  }>;
  maybeSingle?: () => Promise<{
    data: ServerProfile | null;
    error: { message: string } | null;
  }>;
} = {}) {
  return {
    auth: {
      getUser:
        overrides.getUser ??
        (async () => ({ data: { user: null }, error: null })),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle:
            overrides.maybeSingle ??
            (async () => ({ data: null, error: null })),
        }),
      }),
    }),
  } as unknown as SupabaseLikeClient;
}

test('admin verifier getUser forwards the exact JWT to auth.getUser', async () => {
  const tokens: string[] = [];
  const client = fakeClient({
    getUser: async (jwt) => {
      tokens.push(jwt);
      return { data: { user: { id: 'user-1' } }, error: null };
    },
  });

  const result = await createSupabaseAdminVerifier(client).getUser('jwt-1');

  assert.deepEqual(tokens, ['jwt-1']);
  assert.deepEqual(result, { data: { user: { id: 'user-1' } }, error: null });
});

test('admin verifier getProfile selects profile columns by id and returns the row', async () => {
  const profile: ServerProfile = {
    id: 'uuid-1',
    full_name: 'Ada Lovelace',
    user_type: 'recruiter',
    company_name: 'Analytical Engines',
  };
  const calls: Array<{
    table: string;
    columns: string;
    column: string;
    value: string;
  }> = [];

  const client = {
    auth: {
      getUser: async () => ({ data: { user: null }, error: null }),
    },
    from: (table: string) => ({
      select: (columns: string) => ({
        eq: (column: string, value: string) => {
          calls.push({ table, columns, column, value });
          return { maybeSingle: async () => ({ data: profile, error: null }) };
        },
      }),
    }),
  } as unknown as SupabaseLikeClient;

  const result = await createSupabaseAdminVerifier(client).getProfile('uuid-1');

  assert.deepEqual(calls, [
    {
      table: 'profiles',
      columns: 'id, full_name, user_type, company_name',
      column: 'id',
      value: 'uuid-1',
    },
  ]);
  assert.deepEqual(result, profile);
});

test('admin verifier getProfile returns null when no profile row exists', async () => {
  const client = fakeClient({
    maybeSingle: async () => ({ data: null, error: null }),
  });

  const result = await createSupabaseAdminVerifier(client).getProfile('uuid-1');

  assert.equal(result, null);
});

test('admin verifier getProfile throws when the profile query fails', async () => {
  const queryError = { message: 'permission denied for table profiles' };
  const client = fakeClient({
    maybeSingle: async () => ({ data: null, error: queryError }),
  });

  await assert.rejects(
    () => createSupabaseAdminVerifier(client).getProfile('uuid-1'),
    (error: unknown) => error === queryError,
  );
});

test('admin verifier module imports safely and only surfaces missing config on request', async () => {
  assert.equal(typeof adminVerifier.getUser, 'function');
  assert.equal(typeof adminVerifier.getProfile, 'function');

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    await assert.rejects(
      () => adminVerifier.getProfile('uuid-1'),
      /Missing SUPABASE_URL \/ SUPABASE_SERVICE_ROLE_KEY/,
    );
  }
});
