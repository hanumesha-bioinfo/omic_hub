import assert from 'node:assert/strict';
import test from 'node:test';
import type { AuthUser } from '@supabase/supabase-js';
import {
  AUTH_MESSAGES,
  getAuthCallbackFailureMessage,
  getAuthErrorMessage,
} from '../src/features/auth/messages';
import {
  isPasswordRecoveryError,
} from '../src/features/auth/callback';
import {
  classifySignUpResult,
} from '../src/features/auth/authOperations';
import {
  mapProfileToUserProfile,
} from '../src/features/auth/profileData';
import {
  MIN_PASSWORD_LENGTH,
  isPasswordLongEnough,
  isValidEmail,
  normalizeEmail,
} from '../src/features/auth/validation';

test('uses one password policy for registration and reset', () => {
  assert.equal(MIN_PASSWORD_LENGTH, 8);
  assert.equal(isPasswordLongEnough('1234567'), false);
  assert.equal(isPasswordLongEnough('12345678'), true);
  assert.match(AUTH_MESSAGES.passwordTooShort, /at least 8 characters/i);
  assert.equal(
    AUTH_MESSAGES.shortStudentPassword,
    AUTH_MESSAGES.passwordTooShort,
  );
  assert.equal(AUTH_MESSAGES.shortNewPassword, AUTH_MESSAGES.passwordTooShort);
});

test('normalizes and validates emails consistently', () => {
  assert.equal(normalizeEmail(' Ada@Example.COM '), 'ada@example.com');
  assert.equal(isValidEmail('ada@example.com'), true);
  assert.equal(isValidEmail('  ada@example.com  '), true);
  assert.equal(isValidEmail('ada@example'), false);
  assert.equal(isValidEmail(''), false);
});

test('classifies an obfuscated duplicate sign-up without confirming existence', () => {
  const duplicate = classifySignUpResult({
    session: null,
    user: { identities: [] },
  });

  assert.deepEqual(duplicate, {
    hasSession: false,
    requiresEmailConfirmation: true,
    possibleDuplicateEmail: true,
  });

  const newAccount = classifySignUpResult({
    session: null,
    user: { identities: [{ provider: 'email' }] },
  });

  assert.deepEqual(newAccount, {
    hasSession: false,
    requiresEmailConfirmation: true,
    possibleDuplicateEmail: false,
  });

  const immediateSession = classifySignUpResult({
    session: { access_token: 'token' },
    user: { identities: [{ provider: 'email' }] },
  });

  assert.deepEqual(immediateSession, {
    hasSession: true,
    requiresEmailConfirmation: false,
    possibleDuplicateEmail: false,
  });
});

test('keeps duplicate-email guidance neutral while confirming email state is clear', () => {
  const duplicateMessage = getAuthErrorMessage(
    { code: 'user_already_exists' },
    'fallback',
  );

  assert.equal(duplicateMessage, AUTH_MESSAGES.accountAlreadyExists);
  assert.match(duplicateMessage, /^If an account/i);

  assert.match(AUTH_MESSAGES.signUpDuplicateEmail, /^If you already/i);
  assert.match(AUTH_MESSAGES.accountCreatedConfirmEmail, /check your inbox/i);
  assert.match(AUTH_MESSAGES.emailNotConfirmed, /confirm your email/i);
  assert.match(AUTH_MESSAGES.invalidCredentials, /Continue with Google/);
});

test('recognizes expired and invalid password recovery callbacks', () => {
  assert.equal(isPasswordRecoveryError({ code: 'otp_expired' }), true);
  assert.equal(
    isPasswordRecoveryError({
      code: 'access_denied',
      description: 'Email link is invalid or has expired',
    }),
    true,
  );
  assert.equal(
    isPasswordRecoveryError({
      code: 'access_denied',
      description: 'User cancelled the sign-in',
    }),
    false,
  );

  assert.equal(
    getAuthCallbackFailureMessage({
      code: 'access_denied',
      description: 'Email link is invalid or has expired',
    }),
    AUTH_MESSAGES.resetLinkExpired,
  );

  assert.equal(
    getAuthCallbackFailureMessage(
      { code: 'access_denied', description: 'User cancelled' },
      false,
    ),
    AUTH_MESSAGES.oauthCancelled,
  );

  assert.equal(
    getAuthCallbackFailureMessage({ code: 'server_error' }, true),
    AUTH_MESSAGES.resetLinkExpired,
  );
});

test('maps authenticated profiles to the expected student and recruiter destinations', () => {
  const authUser = {
    id: 'user-1',
    email: 'ada@example.com',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: new Date(0).toISOString(),
  } as AuthUser;

  const student = mapProfileToUserProfile(authUser, {
    id: 'user-1',
    full_name: 'Ada Lovelace',
    user_type: 'student',
    company_name: null,
  });

  assert.equal(student.userType, 'student');
  assert.equal(student.hasSelectedPlan, false);
  assert.equal(student.role, 'Student');

  const recruiter = mapProfileToUserProfile(authUser, {
    id: 'user-1',
    full_name: 'Ada Lovelace',
    user_type: 'recruiter',
    company_name: 'Analytical Engines',
  });

  assert.equal(recruiter.userType, 'recruiter');
  assert.equal(recruiter.hasSelectedPlan, true);
  assert.equal(recruiter.role, 'Recruiter');
});
