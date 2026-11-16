export interface SupabaseEnvironment {
  [key: string]: unknown;
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  VITE_SUPABASE_ANON_KEY?: string;
}

export interface SupabaseCredentials {
  url: string;
  key: string;
}

const MISSING_SUPABASE_CONFIG_MESSAGE =
  'Missing Supabase configuration. Set VITE_SUPABASE_URL and either VITE_SUPABASE_PUBLISHABLE_KEY or VITE_SUPABASE_ANON_KEY in .env.local.';

/**
 * Auth client options shared by the browser and the test suite.
 *
 * `flowType: 'pkce'` is required for the OAuth callback to arrive as `?code=`.
 * `detectSessionInUrl` lets supabase-js consume and validate that code exactly
 * once while it initializes. The app must never call `exchangeCodeForSession`
 * itself, otherwise the single-use code would be exchanged twice.
 */
export const SUPABASE_AUTH_OPTIONS = {
  persistSession: true,
  autoRefreshToken: true,
  detectSessionInUrl: true,
  flowType: 'pkce',
} as const;

export function resolveSupabaseCredentials(
  env: SupabaseEnvironment,
): SupabaseCredentials {
  const url = env.VITE_SUPABASE_URL?.trim() ?? '';
  const key =
    env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    env.VITE_SUPABASE_ANON_KEY?.trim() ||
    '';

  if (!url || !key) {
    throw new Error(MISSING_SUPABASE_CONFIG_MESSAGE);
  }

  return { url, key };
}
