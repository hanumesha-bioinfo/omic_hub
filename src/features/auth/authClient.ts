import type { AuthSession } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';
import {
  buildAuthRedirectUrl,
  stripAuthCallbackParams,
} from './callback';
import {
  classifySignUpResult,
  resolveInitialSessionWithClient,
  signInWithGoogleWithClient,
  signOutWithClient,
} from './authOperations';
import { AUTH_MESSAGES } from './messages';

export interface StudentSignUpInput {
  fullName: string;
  email: string;
  password: string;
}

export interface StudentSignUpResult {
  hasSession: boolean;
  requiresEmailConfirmation: boolean;
  possibleDuplicateEmail: boolean;
}

export type AuthStateChangeEvent =
  | 'INITIAL_SESSION'
  | 'PASSWORD_RECOVERY'
  | 'SIGNED_IN'
  | 'SIGNED_OUT'
  | 'TOKEN_REFRESHED'
  | 'USER_UPDATED'
  | 'MFA_CHALLENGE_VERIFIED';

export type AuthStateChangeHandler = (
  event: AuthStateChangeEvent,
  session: AuthSession | null,
) => void;

export function getAuthRedirectUrl(): string {
  if (typeof window === 'undefined') return '';

  return buildAuthRedirectUrl(
    window.location.origin,
    import.meta.env.BASE_URL,
  );
}

export function clearAuthCallbackParams(): void {
  if (typeof window === 'undefined') return;

  const cleaned = stripAuthCallbackParams(window.location.href);

  window.history.replaceState(window.history.state, '', cleaned);
}

export async function signInWithGoogle(): Promise<void> {
  return signInWithGoogleWithClient(supabase, getAuthRedirectUrl());
}

/**
 * Resolve the session after supabase-js has processed any callback URL.
 *
 * This deliberately uses `initialize()` rather than `getSession()`: the latter
 * ignores errors raised while consuming the callback, which is what made
 * failed OAuth attempts bounce silently back to the sign-in screen.
 */
export function resolveInitialSession(): Promise<AuthSession | null> {
  return resolveInitialSessionWithClient(supabase);
}

export async function requestPasswordReset(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: getAuthRedirectUrl(),
  });

  if (error) throw error;
}

export async function signUpStudent(
  input: StudentSignUpInput,
): Promise<StudentSignUpResult> {
  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: {
        full_name: input.fullName,
        user_type: 'student',
      },
      emailRedirectTo: getAuthRedirectUrl(),
    },
  });

  if (error) throw error;

  return classifySignUpResult(data);
}

export async function signInWithPassword(
  email: string,
  password: string,
): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
}

export async function getSession(): Promise<AuthSession | null> {
  const { data, error } = await supabase.auth.getSession();

  if (error) throw error;

  return data.session;
}

export async function updatePassword(password: string): Promise<void> {
  const session = await getSession();

  if (!session) {
    throw new Error(AUTH_MESSAGES.missingResetSession);
  }

  const { error } = await supabase.auth.updateUser({
    password,
  });

  if (error) throw error;
}

export async function signOut(): Promise<void> {
  return signOutWithClient(supabase);
}

export function onAuthStateChange(handler: AuthStateChangeHandler) {
  return supabase.auth.onAuthStateChange(handler);
}
