import { createClient } from '@supabase/supabase-js';
import { SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL } from '../config';

export const PROFILE_COLUMNS = 'id, full_name, user_type, company_name';

export interface ServerProfile {
  id: string;
  full_name: string | null;
  user_type: string | null;
  company_name: string | null;
}

interface AdminError {
  message: string;
}

interface AuthUserIdentity {
  id: string;
}

interface ProfileResult {
  data: ServerProfile | null;
  error: AdminError | null;
}

export interface SupabaseAdminVerifier {
  getUser(jwt: string): Promise<{
    data: { user: AuthUserIdentity | null };
    error: AdminError | null;
  }>;
  getProfile(userId: string): Promise<ServerProfile | null>;
}

/** Narrow, structural client shape so tests can inject fakes without a network. */
export interface SupabaseLikeClient {
  auth: {
    getUser(jwt: string): Promise<{
      data: { user: AuthUserIdentity | null };
      error: AdminError | null;
    }>;
  };
  from(table: string): {
    select(columns: string): {
      eq(column: string, value: string): {
        maybeSingle(): Promise<ProfileResult>;
      };
    };
  };
}

export function createSupabaseAdminVerifier(
  client: SupabaseLikeClient,
): SupabaseAdminVerifier {
  return {
    getUser(jwt) {
      return client.auth.getUser(jwt);
    },
    async getProfile(userId) {
      const { data, error } = await client
        .from('profiles')
        .select(PROFILE_COLUMNS)
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;

      return (data as ServerProfile | null) ?? null;
    },
  };
}

function createAdminClient(): SupabaseLikeClient {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
  }

  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }) as unknown as SupabaseLikeClient;
}

let realClient: SupabaseLikeClient | undefined;

function getAdminClient(): SupabaseLikeClient {
  if (!realClient) {
    realClient = createAdminClient();
  }
  return realClient;
}

// The real client is only constructed when a request actually calls through it,
// so importing this module with empty Supabase credentials cannot throw.
const lazyAdminClient: SupabaseLikeClient = {
  auth: {
    getUser(jwt) {
      return getAdminClient().auth.getUser(jwt);
    },
  },
  from(table) {
    return getAdminClient().from(table);
  },
};

export const adminVerifier: SupabaseAdminVerifier =
  createSupabaseAdminVerifier(lazyAdminClient);
