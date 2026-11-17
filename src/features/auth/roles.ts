import type { UserProfile } from '../../types';

// UX-only display gates. The database-backed profile role is the real
// authority; these predicates must never be treated as authorization.
export function canSeeRecruiterWorkspace(
  user: UserProfile | null | undefined,
): boolean {
  return user?.userType === 'recruiter';
}

export function canSeeStudentWorkspace(
  user: UserProfile | null | undefined,
): boolean {
  return user?.userType === 'student';
}
