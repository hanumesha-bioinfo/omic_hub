const AUTH_URL_PARAM_KEYS = [
  'access_token',
  'refresh_token',
  'expires_in',
  'expires_at',
  'token_type',
  'provider_token',
  'provider_refresh_token',
  'code',
  'error',
  'error_code',
  'error_description',
  'type',
  'state',
] as const;

export interface AuthCallbackError {
  code?: string;
  description?: string;
}

function readParam(
  hashParams: URLSearchParams,
  searchParams: URLSearchParams,
  key: string,
): string | null {
  return hashParams.get(key) ?? searchParams.get(key);
}

export function buildAuthRedirectUrl(origin: string, baseUrl = '/'): string {
  try {
    const base = new URL(baseUrl || '/', origin);
    const path = base.pathname.endsWith('/')
      ? base.pathname
      : `${base.pathname}/`;

    return `${base.origin}${path}`;
  } catch {
    return origin.endsWith('/') ? origin : `${origin}/`;
  }
}

export function isPasswordRecoveryCallback(
  hash: string,
  search = '',
): boolean {
  const hashParams = new URLSearchParams(hash.replace(/^#/, ''));

  return (
    hashParams.get('type') === 'recovery' ||
    new URLSearchParams(search).get('type') === 'recovery'
  );
}

export function parseAuthCallbackError(
  hash: string,
  search = '',
): AuthCallbackError | null {
  const hashParams = new URLSearchParams(hash.replace(/^#/, ''));
  const searchParams = new URLSearchParams(search);

  const error = readParam(hashParams, searchParams, 'error');
  const errorCode = readParam(hashParams, searchParams, 'error_code');
  const errorDescription = readParam(
    hashParams,
    searchParams,
    'error_description',
  );

  if (!error && !errorCode && !errorDescription) return null;

  return {
    code: errorCode ?? error ?? undefined,
    description: errorDescription ?? undefined,
  };
}

const RECOVERY_ERROR_HINTS = [
  /email link/i,
  /recovery link/i,
  /reset link/i,
  /password reset/i,
  /invalid or has expired/i,
] as const;

/**
 * Distinguish a broken password-recovery link from a cancelled OAuth attempt.
 *
 * Supabase reports expired recovery links with `otp_expired`, but some
 * providers only include `access_denied` plus an explanatory description.
 */
export function isPasswordRecoveryError(error: AuthCallbackError): boolean {
  if (error.code === 'otp_expired') return true;

  const description = error.description ?? '';

  return RECOVERY_ERROR_HINTS.some((hint) => hint.test(description));
}

export type AuthCallbackKind = 'none' | 'error' | 'pkce' | 'implicit';

/**
 * Classify the auth data present in the current URL.
 *
 * `pkce` callbacks arrive as `?code=...` and are exchanged by supabase-js.
 * `implicit` callbacks arrive as `#access_token=...` from older links.
 * A URL can contain callback data that supabase-js refuses to consume (for
 * example a PKCE code with no stored verifier), so callers must treat
 * `pkce`/`implicit` without a resulting session as an incomplete sign-in.
 */
export function getAuthCallbackKind(
  hash: string,
  search = '',
): AuthCallbackKind {
  const hashParams = new URLSearchParams(hash.replace(/^#/, ''));
  const searchParams = new URLSearchParams(search);

  if (
    readParam(hashParams, searchParams, 'error') ||
    readParam(hashParams, searchParams, 'error_code') ||
    readParam(hashParams, searchParams, 'error_description')
  ) {
    return 'error';
  }

  if (readParam(hashParams, searchParams, 'code')) {
    return 'pkce';
  }

  if (
    readParam(hashParams, searchParams, 'access_token') ||
    readParam(hashParams, searchParams, 'refresh_token')
  ) {
    return 'implicit';
  }

  return 'none';
}

export function stripAuthCallbackParams(href: string): string {
  try {
    const url = new URL(href);

    for (const key of AUTH_URL_PARAM_KEYS) {
      url.searchParams.delete(key);
    }

    if (url.hash) {
      const params = new URLSearchParams(url.hash.replace(/^#/, ''));
      const hasAuthParams = AUTH_URL_PARAM_KEYS.some((key) => params.has(key));

      if (hasAuthParams) {
        for (const key of AUTH_URL_PARAM_KEYS) {
          params.delete(key);
        }

        const remaining = params.toString();
        url.hash = remaining ? `#${remaining}` : '';
      }
    }

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return href;
  }
}
