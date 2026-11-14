import type { UserProfile } from '../../types';
import { readJson, removeKey, writeJson } from '../../services/storage/localStore';

export const DEMO_RECRUITER_DELAY_MS = 400;
export const DEMO_RECRUITER_SESSION_KEY = 'tf_demo_recruiter_session';

function generateSlug(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '') || 'scholar'
  );
}

export function isDemoRecruiterProfile(
  profile: UserProfile | null | undefined,
): profile is UserProfile {
  return Boolean(
    profile &&
      profile.userType === 'recruiter' &&
      typeof profile.id === 'string' &&
      profile.id.startsWith('rec_'),
  );
}

export function markDemoRecruiterSession(profile: UserProfile): void {
  if (!isDemoRecruiterProfile(profile)) return;

  writeJson(DEMO_RECRUITER_SESSION_KEY, profile);
}

export function getDemoRecruiterSession(): UserProfile | null {
  const stored = readJson<UserProfile>(DEMO_RECRUITER_SESSION_KEY);

  if (stored.status !== 'ok' || !isDemoRecruiterProfile(stored.value)) {
    return null;
  }

  return stored.value;
}

export function clearDemoRecruiterSession(): void {
  removeKey(DEMO_RECRUITER_SESSION_KEY);
}

export function buildDemoRecruiterProfile(
  companyName: string,
  email: string,
): UserProfile {
  const company = companyName.trim() || 'Genomics BioLabs';
  const recruiterEmail =
    email.trim() || 'talent@genomicsbiolabs.com';
  const companySlug = generateSlug(company);

  return {
    id: `rec_${Date.now()}`,
    name: `${company} Talent Acquisition`,
    email: recruiterEmail,
    avatar:
      'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80',
    role: `Talent Partner (${company})`,
    targetRole: 'Computational Biology Recruiter',
    experienceLevel: 'Senior',
    targetIndustry: 'Biotechnology & Life Sciences Hiring',
    location: 'Corporate HQ',
    atsScore: 95,
    totalApplications: 0,
    activeInterviews: 0,
    learningHours: 0,
    interviewReadiness: 100,
    isResumeUploaded: false,
    userType: 'recruiter',
    companyName: company,
    omicHubProfileUrl: `omichub.bio/company/${companySlug}`,
    hasSelectedPlan: true,
    hasCompletedResumeOnboarding: true,
  };
}
