import { createClient } from '@supabase/supabase-js';
import {
  resolveSupabaseCredentials,
  SUPABASE_AUTH_OPTIONS,
} from './authConfig';

export const initialLocationHash =
  typeof window !== 'undefined' ? window.location.hash : '';
export const initialLocationSearch =
  typeof window !== 'undefined' ? window.location.search : '';

const { url, key } = resolveSupabaseCredentials(import.meta.env);

export const supabase = createClient(url, key, {
  auth: SUPABASE_AUTH_OPTIONS,
});
