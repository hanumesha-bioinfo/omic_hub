import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  buildRecruiterSignUpOptions,
  signInWithPasswordWithClient,
  signUpRecruiterWithClient,
  type PasswordSignInClient,
  type RecruiterSignUpClient,
} from '../src/features/auth/authOperations';

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

test('signUpRecruiterWithClient forwards exact credentials and classifies the response', async () => {
  const calls: unknown[] = [];
  const data = { session: null, user: { identities: [] } };
  const client = {
    auth: {
      signUp: async (credentials: unknown) => {
        calls.push(credentials);
        return { data, error: null };
      },
    },
  } as unknown as RecruiterSignUpClient;

  const outcome = await signUpRecruiterWithClient(
    client,
    {
      companyName: '  Helix Bio  ',
      email: 'jobs@helix.example',
      password: 'pw',
    },
    'http://localhost:3000/',
  );

  assert.deepEqual(calls, [
    {
      email: 'jobs@helix.example',
      password: 'pw',
      options: {
        data: {
          full_name: 'Helix Bio Talent Acquisition',
          user_type: 'recruiter',
          company_name: 'Helix Bio',
        },
        emailRedirectTo: 'http://localhost:3000/',
      },
    },
  ]);
  assert.deepEqual(outcome, {
    hasSession: false,
    requiresEmailConfirmation: true,
    possibleDuplicateEmail: true,
  });
});

test('signUpRecruiterWithClient throws when Supabase returns an error', async () => {
  const signUpError = { code: 'email_exists', message: 'already registered' };
  const client = {
    auth: {
      signUp: async () => ({ data: { session: null, user: null }, error: signUpError }),
    },
  } as unknown as RecruiterSignUpClient;

  await assert.rejects(
    () =>
      signUpRecruiterWithClient(
        client,
        { companyName: 'Helix', email: 'jobs@helix.example', password: 'pw' },
        'http://localhost:3000/',
      ),
    (error: unknown) => error === signUpError,
  );
});

test('signInWithPasswordWithClient calls auth.signInWithPassword once and throws on error', async () => {
  const credentials: unknown[] = [];
  let calls = 0;
  const client = {
    auth: {
      signInWithPassword: async (values: unknown) => {
        calls += 1;
        credentials.push(values);
        return { error: null };
      },
    },
  } as unknown as PasswordSignInClient;

  await signInWithPasswordWithClient(client, 'ada@example.com', 'secret');

  assert.equal(calls, 1);
  assert.deepEqual(credentials, [
    { email: 'ada@example.com', password: 'secret' },
  ]);

  const signInError = { code: 'invalid_credentials', message: 'bad credentials' };
  const errorClient = {
    auth: {
      signInWithPassword: async () => ({ error: signInError }),
    },
  } as unknown as PasswordSignInClient;

  await assert.rejects(
    () => signInWithPasswordWithClient(errorClient, 'a@b.c', 'wrong'),
    (error: unknown) => error === signInError,
  );
});

test('student sign-up keeps user_type student in signUpStudent source', () => {
  const source = readFileSync(
    new URL('../src/features/auth/authClient.ts', import.meta.url),
    'utf8',
  );

  assert.match(source, /user_type:\s*'student'/);
});
