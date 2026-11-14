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
