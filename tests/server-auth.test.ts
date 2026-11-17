import assert from 'node:assert/strict';
import test from 'node:test';
import express, {
  type Request,
  type RequestHandler,
  type Response,
} from 'express';
import {
  SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_URL,
} from '../server/config';
import { createRecruiterRouter } from '../server/routes/recruiter';
import {
  adminVerifier,
  createSupabaseAdminVerifier,
  type ServerProfile,
  type SupabaseAdminVerifier,
  type SupabaseLikeClient,
} from '../server/lib/supabaseAdmin';
import {
  createRequireAuth,
  extractBearerToken,
  requireAuth,
  requireRole,
  resolveRole,
  type AuthenticatedIdentity,
} from '../server/middleware/auth';

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

interface FakeRequest {
  headers: Record<string, string | undefined>;
  auth?: AuthenticatedIdentity;
}

type FakeResponse = {
  status: (code: number) => FakeResponse;
  json: (payload: unknown) => FakeResponse;
};

/** Runs Express handlers in order against a minimal fake req/res, stopping at the first response. */
async function run(
  handlers: RequestHandler[],
  init: Partial<FakeRequest> = {},
): Promise<{
  status: number;
  body: unknown;
  nextCalled: boolean;
  req: FakeRequest;
}> {
  const req = { headers: {}, ...init } as FakeRequest;
  let status = 200;
  let body: unknown;
  const res: FakeResponse = {
    status(code) {
      status = code;
      return res;
    },
    json(payload) {
      body = payload;
      return res;
    },
  };

  let nextCalled = false;
  for (const handler of handlers) {
    nextCalled = false;
    await handler(
      req as unknown as Request,
      res as unknown as Response,
      () => {
        nextCalled = true;
      },
    );
    if (!nextCalled) break;
  }

  return { status, body, nextCalled, req };
}

function fakeVerifier(
  options: {
    user?: { id: string; user_metadata?: Record<string, unknown> } | null;
    getUserError?: { message: string } | null;
    getUserThrows?: boolean;
    profile?: ServerProfile | null;
    profileThrows?: boolean;
    tokens?: string[];
    profileIds?: string[];
  } = {},
): SupabaseAdminVerifier {
  const {
    user = null,
    getUserError = null,
    getUserThrows = false,
    profile = null,
    profileThrows = false,
    tokens,
    profileIds,
  } = options;

  return {
    async getUser(jwt) {
      tokens?.push(jwt);
      if (getUserThrows) throw new Error('auth service down');
      return { data: { user }, error: getUserError };
    },
    async getProfile(userId) {
      profileIds?.push(userId);
      if (profileThrows) throw new Error('profile service down');
      return profile;
    },
  };
}

test('extractBearerToken accepts only a well-formed Bearer header', () => {
  assert.equal(extractBearerToken('Bearer real-token'), 'real-token');
  assert.equal(extractBearerToken('bearer abc'), 'abc');
  assert.equal(extractBearerToken('BEARER\txyz'), 'xyz');
  assert.equal(extractBearerToken('Basic abc'), null);
  assert.equal(extractBearerToken('Bearer '), null);
  assert.equal(extractBearerToken('Bearer'), null);
  assert.equal(extractBearerToken('Bearer abc def'), null);
  assert.equal(extractBearerToken(undefined), null);
});

test('resolveRole maps only exact student and recruiter user types', () => {
  assert.equal(resolveRole('student'), 'student');
  assert.equal(resolveRole('recruiter'), 'recruiter');
  assert.equal(resolveRole('admin'), null);
  assert.equal(resolveRole('RECRUITER'), null);
  assert.equal(resolveRole(''), null);
  assert.equal(resolveRole(null), null);
  assert.equal(resolveRole(undefined), null);
});

test('requireAuth returns 401 when the authorization header is missing or invalid', async () => {
  const verifier = fakeVerifier();
  const missing = await run([createRequireAuth(verifier)], {});
  assert.equal(missing.status, 401);
  assert.deepEqual(missing.body, { error: 'Unauthorized' });

  const basic = await run([createRequireAuth(verifier)], {
    headers: { authorization: 'Basic abc' },
  });
  assert.equal(basic.status, 401);
  assert.deepEqual(basic.body, { error: 'Unauthorized' });

  const empty = await run([createRequireAuth(verifier)], {
    headers: { authorization: 'Bearer ' },
  });
  assert.equal(empty.status, 401);
  assert.deepEqual(empty.body, { error: 'Unauthorized' });
});

test('requireAuth returns 401 when the verifier rejects the token or finds no user', async () => {
  const errorResult = await run(
    [createRequireAuth(fakeVerifier({ getUserError: { message: 'invalid jwt' } }))],
    { headers: { authorization: 'Bearer bad-token' } },
  );
  assert.equal(errorResult.status, 401);
  assert.deepEqual(errorResult.body, { error: 'Unauthorized' });

  const thrownResult = await run(
    [createRequireAuth(fakeVerifier({ getUserThrows: true }))],
    { headers: { authorization: 'Bearer bad-token' } },
  );
  assert.equal(thrownResult.status, 401);
  assert.deepEqual(thrownResult.body, { error: 'Unauthorized' });

  const nullResult = await run(
    [createRequireAuth(fakeVerifier({ user: null }))],
    { headers: { authorization: 'Bearer ghost-token' } },
  );
  assert.equal(nullResult.status, 401);
  assert.deepEqual(nullResult.body, { error: 'Unauthorized' });
});

test('requireAuth returns 503 when the profile lookup throws', async () => {
  const result = await run(
    [
      createRequireAuth(
        fakeVerifier({ user: { id: 'uuid-1' }, profileThrows: true }),
      ),
    ],
    { headers: { authorization: 'Bearer real-token' } },
  );
  assert.equal(result.status, 503);
  assert.deepEqual(result.body, {
    error: 'Authentication service unavailable',
  });
});

test('requireAuth returns 403 for a missing profile or an unknown role', async () => {
  const missing = await run(
    [createRequireAuth(fakeVerifier({ user: { id: 'uuid-1' }, profile: null }))],
    { headers: { authorization: 'Bearer real-token' } },
  );
  assert.equal(missing.status, 403);
  assert.deepEqual(missing.body, { error: 'Forbidden' });

  const admin = await run(
    [
      createRequireAuth(
        fakeVerifier({
          user: { id: 'uuid-1' },
          profile: {
            id: 'uuid-1',
            full_name: 'Ada',
            user_type: 'admin',
            company_name: null,
          },
        }),
      ),
    ],
    { headers: { authorization: 'Bearer real-token' } },
  );
  assert.equal(admin.status, 403);
  assert.deepEqual(admin.body, { error: 'Forbidden' });
});

test('requireAuth sets auth from the DB profile, forwards the JWT and calls next', async () => {
  const profile: ServerProfile = {
    id: 'uuid-1',
    full_name: 'Ada',
    user_type: 'recruiter',
    company_name: 'Analytical Engines',
  };
  const tokens: string[] = [];
  const profileIds: string[] = [];
  const result = await run(
    [
      createRequireAuth(
        fakeVerifier({ user: { id: 'uuid-1' }, profile, tokens, profileIds }),
      ),
    ],
    { headers: { authorization: 'Bearer real-token' } },
  );

  assert.deepEqual(tokens, ['real-token']);
  assert.deepEqual(profileIds, ['uuid-1']);
  assert.equal(result.status, 200);
  assert.equal(result.nextCalled, true);
  assert.deepEqual(result.req.auth, {
    userId: 'uuid-1',
    role: 'recruiter',
    profile,
  });
});

test('requireRole requires an authenticated request and an exact role match', async () => {
  const unauthenticated = await run([requireRole('recruiter')], {});
  assert.equal(unauthenticated.status, 401);
  assert.deepEqual(unauthenticated.body, { error: 'Unauthorized' });

  const profile: ServerProfile = {
    id: 'uuid-2',
    full_name: 'Ada',
    user_type: 'student',
    company_name: null,
  };
  const auth: AuthenticatedIdentity = {
    userId: 'uuid-2',
    role: 'student',
    profile,
  };

  const wrongRole = await run([requireRole('recruiter')], { auth });
  assert.equal(wrongRole.status, 403);
  assert.deepEqual(wrongRole.body, { error: 'Forbidden' });

  const rightRole = await run([requireRole('student')], { auth });
  assert.equal(rightRole.status, 200);
  assert.equal(rightRole.nextCalled, true);
});

test('default requireAuth middleware is importable with empty config', () => {
  assert.equal(typeof requireAuth, 'function');
});

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

/** Boots the recruiter router on a fresh Express app over an ephemeral loopback port. */
async function withRecruiterRouter(
  router: ReturnType<typeof createRecruiterRouter>,
  runRequest: (
    get: (init?: RequestInit) => Promise<{ status: number; body: unknown }>,
  ) => Promise<void>,
) {
  const app = express();
  app.use(router);
  const server = app.listen(0, '127.0.0.1');
  try {
    await new Promise<void>((resolve) => server.once('listening', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') {
      throw new Error('expected an ephemeral loopback TCP address');
    }
    const url = `http://127.0.0.1:${address.port}/api/recruiter/me`;
    await runRequest(async (init) => {
      const response = await fetch(url, init);
      return { status: response.status, body: await response.json() };
    });
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

test('GET /api/recruiter/me returns verified recruiter data from the DB profile', async () => {
  const verifier = fakeVerifier({
    user: { id: 'recruiter-uuid' },
    profile: {
      id: 'recruiter-uuid',
      full_name: 'Ada Lovelace',
      user_type: 'recruiter',
      company_name: 'Helix Bio',
    },
  });

  await withRecruiterRouter(createRecruiterRouter(verifier), async (get) => {
    const { status, body } = await get({
      headers: { authorization: 'Bearer recruiter-token' },
    });
    assert.equal(status, 200);
    assert.deepEqual(body, {
      userId: 'recruiter-uuid',
      role: 'recruiter',
      companyName: 'Helix Bio',
    });
  });
});

test('GET /api/recruiter/me forbids a student token', async () => {
  const verifier = fakeVerifier({
    user: { id: 'student-uuid' },
    profile: {
      id: 'student-uuid',
      full_name: 'Grace Hopper',
      user_type: 'student',
      company_name: null,
    },
  });

  await withRecruiterRouter(createRecruiterRouter(verifier), async (get) => {
    const { status, body } = await get({
      headers: { authorization: 'Bearer student-token' },
    });
    assert.equal(status, 403);
    assert.deepEqual(body, { error: 'Forbidden' });
  });
});

test('GET /api/recruiter/me returns 401 when no authorization header is sent', async () => {
  const verifier = fakeVerifier();

  await withRecruiterRouter(createRecruiterRouter(verifier), async (get) => {
    const { status, body } = await get();
    assert.equal(status, 401);
    assert.deepEqual(body, { error: 'Unauthorized' });
  });
});
