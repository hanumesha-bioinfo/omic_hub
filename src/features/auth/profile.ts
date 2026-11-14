import type { AuthUser } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';
import {
  loadOrCreateProfileWithClient,
  type ProfileRecord,
} from './profileData';

export type { ProfileRecord } from './profileData';
export {
  deriveProfileFromAuthUser,
  mapProfileToUserProfile,
} from './profileData';

export function loadOrCreateProfile(
  authUser: AuthUser,
): Promise<ProfileRecord> {
  return loadOrCreateProfileWithClient(authUser, supabase);
}
