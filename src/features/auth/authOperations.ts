import type { AuthSession } from '@supabase/supabase-js';
import { AUTH_MESSAGES } from './messages';

/** Minimal auth surface needed to sign in with Google. */
export interface GoogleSignInClient {
  auth: {
    signInWithOAuth(credentials: {
      provider: 'google';
      options: {
        redirectTo: string;
        queryParams: { prompt: string };
      };
    }): Promise<{ error: unknown }>;
  };
}

/** Minimal auth surface needed to resolve the session on first render. */
export interface InitialSessionClient {
  auth: {
    initialize(): Promise<{ error: unknown }>;
    getSession(): Promise<{
      data: { session: AuthSession | null };
      error: unknown;
    }>;
  };
}

/** Minimal auth surface needed to sign out. */
export interface SignOutClient {
  auth: {
    signOut(options?: {
      scope?: 'global' | 'local' | 'others';
    }): Promise<{ error: unknown }>;
  };
}

export interface GoogleSignInCredentials {
  provider: 'google';
  options: {
    redirectTo: string;
    queryParams: { prompt: string };
  };
}

export interface SignUpOutcome {
  hasSession: boolean;
  requiresEmailConfirmation: boolean;
  possibleDuplicateEmail: boolean;
}

interface SignUpResponse {
  session: unknown;
  user: { identities?: unknown[] | null } | null;
}

/**
 * Interpret Supabase's anti-enumeration sign-up response.
 *
 * When email confirmation is enabled, Supabase can return a user with an empty
 * `identities` array for an email that already exists instead of an explicit
 * duplicate error. Callers must use neutral wording for that case so the UI
 * does not confirm whether an account exists.
 */
export function classifySignUpResult(data: SignUpResponse): SignUpOutcome {
  const identities = data.user?.identities;
  const possibleDuplicateEmail =
    Boolean(data.user) &&
    Array.isArray(identities) &&
    identities.length === 0;

  return {
    hasSession: Boolean(data.session),
    requiresEmailConfirmation: Boolean(data.user) && !data.session,
    possibleDuplicateEmail,
  };
}

export function buildGoogleSignInOptions(
  redirectTo: string,
): GoogleSignInCredentials {
  if (!redirectTo) {
    throw new Error(AUTH_MESSAGES.authRedirectMissing);
  }

  return {
    provider: 'google',
    options: {
      redirectTo,
      queryParams: { prompt: 'select_account' },
    },
  };
}

export async function signInWithGoogleWithClient(
  client: GoogleSignInClient,
  redirectTo: string,
): Promise<void> {
  const { error } = await client.auth.signInWithOAuth(
    buildGoogleSignInOptions(redirectTo),
  );

  if (error) throw error;
}

let initialSessionPromise: Promise<AuthSession | null> | null = null;

/**
 * Resolve the session exactly once per page load.
 *
 * supabase-js consumes a PKCE or implicit callback while `initialize()` runs.
 * Importantly, `getSession()` only awaits that initialization; it does not
 * surface an error returned by it. Reading `initialize()` first is what turns
 * a failed/cancelled callback into a real rejection instead of a silent return
 * to the sign-in screen.
 */
export function resolveInitialSessionWithClient(
  client: InitialSessionClient,
): Promise<AuthSession | null> {
  if (initialSessionPromise) return initialSessionPromise;

  initialSessionPromise = (async () => {
    const { error: initializeError } = await client.auth.initialize();

    if (initializeError) throw initializeError;

    const { data, error } = await client.auth.getSession();

    if (error) throw error;

    return data.session;
  })();

  return initialSessionPromise;
}

/** Reset the process-once guard when the auth client is replaced (tests/HMR). */
export function resetInitialSessionResolution(): void {
  initialSessionPromise = null;
}

export async function signOutWithClient(
  client: SignOutClient,
): Promise<void> {
  try {
    const { error } = await client.auth.signOut();

    if (error) throw error;
  } catch (error: unknown) {
    try {
      await client.auth.signOut({ scope: 'local' });
    } catch (localError: unknown) {
      console.error('Could not clear the local Supabase session:', localError);
    }

    throw error;
  }
}
