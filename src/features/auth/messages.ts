export const AUTH_MESSAGES = {
  invalidEmail: 'Please enter a valid email address.',
  invalidLoginEmail: 'Please enter your registered email address.',
  shortStudentPassword: 'Your password must contain at least 6 characters.',
  missingFullName: 'Please enter your full name.',
  googleSignInFailed: 'Google sign-in failed. Please try again.',
  resetEmailSent: 'If an account exists for that email, a password-reset link will be sent.',
  resetRequestFailed: 'Could not request a password reset. Please try again.',
  accountCreated: 'Account created successfully!',
  accountCreatedConfirmEmail:
    'Account created. Check your email to confirm your account before signing in.',
  signingIn: 'Signing in to Omic Hub...',
  studentAuthFailed: 'Student authentication failed. Please try again.',
  welcomeRecruiter: (company: string) => `Welcome to Recruiter Workspace, ${company}!`,
  welcomeUser: (name: string) => `Welcome to Omic Hub, ${name}!`,
  profileLoadFailed: 'Could not load your Omic Hub profile.',
  signOutFailed: 'Could not sign out. Please try again.',
  signedOut: 'Signed out of Omic Hub',
  shortNewPassword: 'Your password must contain at least 8 characters.',
  passwordMismatch: 'The passwords do not match.',
  missingResetSession:
    'Your reset session is missing or expired. Please request a new reset email.',
  passwordUpdated: 'Password updated successfully.',
  passwordUpdateFailed: 'Could not update your password. Please try again.',
  recruiterDemoFailed: 'Could not open the recruiter workspace. Please try again.',
  invalidCredentials:
    'Incorrect email or password. If you created your account with Google, use "Continue with Google".',
  emailNotConfirmed:
    'Please confirm your email address before signing in. Check your inbox for the confirmation link.',
  accountAlreadyExists:
    'An account with this email already exists. Try signing in instead.',
  weakPassword:
    'Your password does not meet the security requirements. Please choose a stronger password.',
  networkError:
    'Could not reach the authentication service. Check your connection and try again.',
  sessionExpired: 'Your session has expired. Please sign in again.',
  rateLimited: 'Too many attempts. Please wait a moment and try again.',
  providerDisabled:
    'This sign-in method is not enabled. Please use another method or contact support.',
  oauthCancelled: 'Sign-in was cancelled.',
  oauthFailed: 'Sign-in could not be completed. Please try again.',
  oauthIncomplete:
    'This sign-in link is no longer valid in this browser. Please return to Omic Hub and try signing in again.',
  resetLinkExpired: 'This link has expired. Please request a new one.',
  authCallbackFailed:
    'We could not complete sign-in from that link. Please try again.',
  authRedirectMissing:
    'Could not determine where to return after sign-in. Please reload the page and try again.',
  sessionRestoreFailed:
    'Could not restore your session. Please sign in again.',
} as const;

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  invalid_credentials: AUTH_MESSAGES.invalidCredentials,
  email_not_confirmed: AUTH_MESSAGES.emailNotConfirmed,
  phone_not_confirmed: AUTH_MESSAGES.emailNotConfirmed,
  user_already_exists: AUTH_MESSAGES.accountAlreadyExists,
  email_exists: AUTH_MESSAGES.accountAlreadyExists,
  weak_password: AUTH_MESSAGES.weakPassword,
  same_password:
    'Your new password must be different from your current password.',
  signup_disabled: 'New account registration is currently disabled.',
  email_provider_disabled:
    'Email sign-in is currently disabled. Please use Google sign-in.',
  provider_disabled: AUTH_MESSAGES.providerDisabled,
  oauth_provider_not_supported: AUTH_MESSAGES.providerDisabled,
  bad_oauth_callback: AUTH_MESSAGES.oauthFailed,
  bad_oauth_state: AUTH_MESSAGES.oauthFailed,
  flow_state_expired: AUTH_MESSAGES.oauthFailed,
  flow_state_not_found: AUTH_MESSAGES.oauthFailed,
  otp_expired: AUTH_MESSAGES.resetLinkExpired,
  pkce_code_verifier_not_found: AUTH_MESSAGES.oauthIncomplete,
  session_not_found: AUTH_MESSAGES.sessionExpired,
  session_expired: AUTH_MESSAGES.sessionExpired,
  refresh_token_not_found: AUTH_MESSAGES.sessionExpired,
  refresh_token_already_used: AUTH_MESSAGES.sessionExpired,
  over_request_rate_limit: AUTH_MESSAGES.rateLimited,
  over_email_send_rate_limit: AUTH_MESSAGES.rateLimited,
  over_sms_send_rate_limit: AUTH_MESSAGES.rateLimited,
  request_timeout: AUTH_MESSAGES.networkError,
  validation_failed:
    'Please check the information you entered and try again.',
  email_address_invalid: AUTH_MESSAGES.invalidEmail,
  email_address_not_authorized:
    'This email address is not allowed to sign in. Please contact support.',
  user_banned:
    'This account has been suspended. Please contact support.',
  reauthentication_needed: 'Please sign in again to continue.',
  access_denied: AUTH_MESSAGES.oauthCancelled,
};

const AUTH_MESSAGE_HINTS: ReadonlyArray<readonly [string, string]> = [
  ['invalid login credentials', AUTH_MESSAGES.invalidCredentials],
  ['invalid credentials', AUTH_MESSAGES.invalidCredentials],
  ['email not confirmed', AUTH_MESSAGES.emailNotConfirmed],
  ['user already registered', AUTH_MESSAGES.accountAlreadyExists],
  ['user already exists', AUTH_MESSAGES.accountAlreadyExists],
  ['already registered', AUTH_MESSAGES.accountAlreadyExists],
  ['password should be at least', AUTH_MESSAGES.weakPassword],
  ['weak password', AUTH_MESSAGES.weakPassword],
  ['failed to fetch', AUTH_MESSAGES.networkError],
  ['network error', AUTH_MESSAGES.networkError],
  ['networkerror', AUTH_MESSAGES.networkError],
  ['network request failed', AUTH_MESSAGES.networkError],
  ['load failed', AUTH_MESSAGES.networkError],
  ['jwt expired', AUTH_MESSAGES.sessionExpired],
  ['session expired', AUTH_MESSAGES.sessionExpired],
  ['refresh token', AUTH_MESSAGES.sessionExpired],
  ['provider is not enabled', AUTH_MESSAGES.providerDisabled],
  ['unsupported provider', AUTH_MESSAGES.providerDisabled],
  ['code verifier', AUTH_MESSAGES.oauthIncomplete],
  ['invalid flow state', AUTH_MESSAGES.oauthFailed],
  ['flow state', AUTH_MESSAGES.oauthFailed],
  ['no session defined in url', AUTH_MESSAGES.authCallbackFailed],
  ['not a valid pkce flow url', AUTH_MESSAGES.authCallbackFailed],
  ['access denied', AUTH_MESSAGES.oauthCancelled],
  ['user cancelled', AUTH_MESSAGES.oauthCancelled],
  ['user canceled', AUTH_MESSAGES.oauthCancelled],
  ['cancelled the sign-in', AUTH_MESSAGES.oauthCancelled],
  ['link is invalid or has expired', AUTH_MESSAGES.resetLinkExpired],
  ['rate limit', AUTH_MESSAGES.rateLimited],
  ['too many requests', AUTH_MESSAGES.rateLimited],
];

function readStringField(
  value: unknown,
  field: string,
): string | undefined {
  if (typeof value !== 'object' || value === null || !(field in value)) {
    return undefined;
  }

  const candidate = (value as Record<string, unknown>)[field];

  if (typeof candidate === 'string' && candidate.trim()) {
    return candidate.trim();
  }

  return undefined;
}

function readErrorField(
  error: unknown,
  field: 'code' | 'message',
  depth = 0,
): string | undefined {
  if (depth > 2) return undefined;

  const direct = readStringField(error, field);

  if (direct) return direct;

  const details =
    typeof error === 'object' && error !== null
      ? (error as Record<string, unknown>).details
      : undefined;

  if (field === 'code') {
    const detailsCode =
      readStringField(details, 'code') ?? readStringField(details, 'error');

    if (detailsCode) return detailsCode;
  } else {
    const detailsMessage =
      readStringField(details, 'message') ??
      readStringField(details, 'description') ??
      readStringField(details, 'error_description');

    if (detailsMessage) return detailsMessage;
  }

  const nestedError =
    typeof error === 'object' && error !== null
      ? (error as Record<string, unknown>).error
      : undefined;

  return readErrorField(nestedError, field, depth + 1);
}

export function getAuthErrorMessage(error: unknown, fallback: string): string {
  const code = readErrorField(error, 'code');

  if (code && AUTH_ERROR_MESSAGES[code]) {
    return AUTH_ERROR_MESSAGES[code];
  }

  const message = error instanceof Error
    ? error.message
    : readErrorField(error, 'message') ??
      (typeof error === 'string' ? error : '');
  const normalized = message.toLowerCase();

  for (const [hint, mappedMessage] of AUTH_MESSAGE_HINTS) {
    if (normalized.includes(hint)) {
      return mappedMessage;
    }
  }

  return fallback;
}
