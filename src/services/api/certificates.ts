import type { CertifiedSkillBadge } from '../../types';
import { postAi, type AiDeps } from './ai';

/** Exchanges a server-issued assessment token for a signed, verified badge. */
export function issueCertificate(
  payload: { assessmentToken: string; skillName?: string },
  deps: AiDeps = {},
): Promise<CertifiedSkillBadge> {
  return postAi<CertifiedSkillBadge>('/api/certificates/issue', payload, undefined, deps);
}
