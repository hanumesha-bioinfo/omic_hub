import { CompanyReferral, JobApplication } from '../../types';
import { addActivity } from './activity';
import { getApplications, saveApplications } from './applications';
import { INITIAL_COMPANY_REFERRALS } from './defaults';
import { STORAGE_KEYS } from './keys';
import { readJson, writeJson } from './localStore';
import { notifySync } from './sync';

export function getCompanyReferrals(): CompanyReferral[] {
  const stored = readJson<CompanyReferral[]>(STORAGE_KEYS.COMPANY_REFERRALS);
  return stored.status === 'ok' && Array.isArray(stored.value)
    ? stored.value
    : INITIAL_COMPANY_REFERRALS;
}

export function saveCompanyReferrals(referrals: CompanyReferral[]): void {
  if (writeJson(STORAGE_KEYS.COMPANY_REFERRALS, referrals)) {
    notifySync(STORAGE_KEYS.COMPANY_REFERRALS, referrals);
  }
}

export function submitCompanyReferral(referralId: string): CompanyReferral[] {
  const referrals = getCompanyReferrals();
  const target = referrals.find((r) => r.id === referralId);
  if (!target) return referrals;

  const updated = referrals.map((r) =>
    r.id === referralId
      ? {
          ...r,
          status: 'Referred' as const,
          appliedDate: new Date().toISOString().slice(0, 10),
          fastTrackBadge: 'Fast-Track Submitted 🚀',
        }
      : r
  );
  saveCompanyReferrals(updated);

  // Create tracking application in JobTracker if not already there
  const applications = getApplications();
  const alreadyApp = applications.some(
    (a) => a.company.toLowerCase() === target.companyName.toLowerCase() && a.role.toLowerCase().includes(target.roleTitle.toLowerCase().slice(0, 10))
  );
  if (!alreadyApp) {
    const newApp: JobApplication = {
      id: `app_ref_${Date.now()}`,
      company: target.companyName,
      role: target.roleTitle,
      stage: 'applied',
      location: target.location,
      salaryRange: target.salaryRange,
      appliedDate: new Date().toISOString().slice(0, 10),
      lastUpdated: new Date().toISOString().slice(0, 10),
      jobUrl: 'https://careers.' + target.companyName.toLowerCase() + '.com',
      notes: `Fast-Track Partner Referral via Omic Hub! Certified skills automatically attached. Recruiter sponsor: ${target.sponsorQuote}`,
      rating: 5,
    };
    saveApplications([newApp, ...applications]);
  }

  addActivity({
    type: 'application',
    title: `Fast-Track Referral Dispatched to ${target.companyName}`,
    description: `Submitted verified score and certified badge link to ${target.companyName} recruiter talent pipeline for ${target.roleTitle}.`,
    badge: 'Fast-Track',
  });

  return updated;
}
