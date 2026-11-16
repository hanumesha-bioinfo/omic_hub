import type { AuthUser, SupabaseClient } from '@supabase/supabase-js';
import type { UserProfile } from '../../types';

export interface ProfileRecord {
  id: string;
  full_name: string | null;
  user_type: string | null;
  company_name: string | null;
}

export const PROFILE_COLUMNS = 'id, full_name, user_type, company_name';

interface ProfileError {
  code?: string;
  message?: string;
}

export function getProfileErrorCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null) return undefined;

  const code = (error as ProfileError).code;
  return typeof code === 'string' ? code : undefined;
}

export function isUniqueViolation(error: unknown): boolean {
  const code = getProfileErrorCode(error);
  if (code === '23505') return true;

  if (typeof error === 'object' && error !== null) {
    const message = (error as ProfileError).message;
    if (typeof message === 'string') {
      return message.toLowerCase().includes('duplicate key');
    }
  }

  return false;
}

export function deriveProfileFromAuthUser(authUser: AuthUser): ProfileRecord {
  const metadata = authUser.user_metadata ?? {};
  const metadataName = metadata.full_name ?? metadata.name;

  const fullName =
    (typeof metadataName === 'string' && metadataName.trim()) ||
    authUser.email?.split('@')[0] ||
    'Omic Hub User';

  const userType = metadata.user_type === 'recruiter' ? 'recruiter' : 'student';

  const companyName =
    typeof metadata.company_name === 'string'
      ? metadata.company_name.trim()
      : '';

  return {
    id: authUser.id,
    full_name: fullName,
    user_type: userType,
    company_name: userType === 'recruiter' ? companyName || null : null,
  };
}

async function fetchProfile(
  client: SupabaseClient,
  userId: string,
): Promise<ProfileRecord | null> {
  const { data, error } = await client
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;

  return (data as ProfileRecord | null) ?? null;
}

export async function loadOrCreateProfileWithClient(
  authUser: AuthUser,
  client: SupabaseClient,
): Promise<ProfileRecord> {
  let existingProfile: ProfileRecord | null = null;

  try {
    existingProfile = await fetchProfile(client, authUser.id);
  } catch (error) {
    console.warn(
      '[auth] Could not load the Supabase profile. Continuing with auth metadata.',
      error,
    );

    return deriveProfileFromAuthUser(authUser);
  }

  if (existingProfile) return existingProfile;

  const fallbackProfile = deriveProfileFromAuthUser(authUser);

  const { data, error } = await client
    .from('profiles')
    .insert({
      id: fallbackProfile.id,
      full_name: fallbackProfile.full_name,
      user_type: fallbackProfile.user_type,
      company_name: fallbackProfile.company_name,
    })
    .select(PROFILE_COLUMNS)
    .single();

  if (!error && data) {
    return data as ProfileRecord;
  }

  // Another writer (a database trigger or a parallel tab) may have created the
  // row between the read and the insert. Re-read before falling back so a
  // transient insert error never loses an existing profile.
  try {
    const existingAfterInsertError = await fetchProfile(client, authUser.id);

    if (existingAfterInsertError) return existingAfterInsertError;
  } catch (refetchError) {
    console.warn(
      '[auth] Could not re-read the profile after an insert failure.',
      refetchError,
    );
  }

  if (isUniqueViolation(error)) {
    console.warn(
      '[auth] The profile already exists but could not be re-read.',
      error,
    );
  }

  console.warn(
    '[auth] Could not create the Supabase profile. Continuing with auth metadata.',
    error,
  );

  return fallbackProfile;
}

export function mapProfileToUserProfile(
  authUser: AuthUser,
  profile: ProfileRecord,
): UserProfile {
  const metadata = authUser.user_metadata ?? {};
  const metadataAvatar = metadata.avatar_url ?? metadata.picture;

  const avatar = typeof metadataAvatar === 'string' ? metadataAvatar : '';

  const userType = profile.user_type === 'recruiter' ? 'recruiter' : 'student';

  const displayName =
    profile.full_name || authUser.email?.split('@')[0] || 'User';

  return {
    id: authUser.id,
    name: displayName,
    email: authUser.email ?? '',
    avatar,
    role: userType === 'recruiter' ? 'Recruiter' : 'Student',
    targetRole: '',
    experienceLevel: 'Entry',
    targetIndustry: '',
    location: '',
    atsScore: 0,
    totalApplications: 0,
    activeInterviews: 0,
    learningHours: 0,
    interviewReadiness: 0,
    isResumeUploaded: false,
    userType,
    companyName:
      userType === 'recruiter' ? profile.company_name ?? undefined : undefined,
    omicHubProfileUrl: `omichub.bio/talent/${displayName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '')}`,
    hasSelectedPlan: userType === 'recruiter',
    hasCompletedResumeOnboarding: false,
  };
}
