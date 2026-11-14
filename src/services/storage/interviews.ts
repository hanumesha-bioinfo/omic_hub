import { CertifiedSkillBadge, ResumeData, ScheduledInterview } from '../../types';
import { addActivity } from './activity';
import { INITIAL_CERTIFIED_BADGES, INITIAL_SCHEDULED_INTERVIEWS } from './defaults';
import { STORAGE_KEYS } from './keys';
import { readJson, writeJson } from './localStore';
import { getResume, saveResume } from './resume';
import { notifySync } from './sync';

export function getScheduledInterviews(): ScheduledInterview[] {
  const stored = readJson<ScheduledInterview[]>(STORAGE_KEYS.SCHEDULED_INTERVIEWS);
  return stored.status === 'ok' && Array.isArray(stored.value)
    ? stored.value
    : INITIAL_SCHEDULED_INTERVIEWS;
}

export function saveScheduledInterviews(interviews: ScheduledInterview[]): void {
  if (writeJson(STORAGE_KEYS.SCHEDULED_INTERVIEWS, interviews)) {
    notifySync(STORAGE_KEYS.SCHEDULED_INTERVIEWS, interviews);
  }
}

export function getCertifiedBadges(): CertifiedSkillBadge[] {
  const stored = readJson<CertifiedSkillBadge[]>(STORAGE_KEYS.CERTIFIED_BADGES);
  return stored.status === 'ok' && Array.isArray(stored.value)
    ? stored.value
    : INITIAL_CERTIFIED_BADGES;
}

export function saveCertifiedBadges(badges: CertifiedSkillBadge[]): void {
  if (writeJson(STORAGE_KEYS.CERTIFIED_BADGES, badges)) {
    notifySync(STORAGE_KEYS.CERTIFIED_BADGES, badges);
  }
}

export function addCertifiedBadge(badge: CertifiedSkillBadge): CertifiedSkillBadge[] {
  const existing = getCertifiedBadges();
  const updated = [badge, ...existing.filter((b) => b.id !== badge.id)];
  saveCertifiedBadges(updated);

  addActivity({
    type: 'interview',
    title: `Earned Certified Skill Badge: ${badge.skillName}`,
    description: `Passed Bar-Raiser interview assessment with ${badge.score}% score. Verification ID: ${badge.verificationId}.`,
    badge: `${badge.score}% Certified`,
  });

  return updated;
}

export function addBadgeToResumeCertifications(badge: CertifiedSkillBadge): ResumeData {
  const currentResume = getResume();
  const alreadyExists = currentResume.certifications?.some(
    (c) => c.name.toLowerCase() === badge.skillName.toLowerCase() || c.credentialId === badge.verificationId
  );

  if (!alreadyExists) {
    const newCert = {
      id: `cert_badge_${Date.now()}`,
      name: `Omic Hub Certified: ${badge.skillName} (${badge.level})`,
      issuer: 'Omic Hub AI Bar-Raiser Academy',
      date: badge.issuedDate.slice(0, 7), // YYYY-MM
      credentialId: badge.verificationId,
    };
    const updatedResume: ResumeData = {
      ...currentResume,
      certifications: [newCert, ...(currentResume.certifications || [])],
    };
    saveResume(updatedResume, `Added certified badge for ${badge.skillName}`);

    // Update badge state
    const badges = getCertifiedBadges();
    const updatedBadges = badges.map((b) =>
      b.id === badge.id ? { ...b, addedToResume: true } : b
    );
    saveCertifiedBadges(updatedBadges);

    return updatedResume;
  }
  return currentResume;
}
