import { JobApplication, OpportunityItem } from '../../types';
import { addActivity } from './activity';
import { getApplications, saveApplications } from './applications';
import { STORAGE_KEYS } from './keys';
import { readJson, writeJson } from './localStore';
import { notifySync } from './sync';

export function getOpportunities(): OpportunityItem[] {
  const stored = readJson<OpportunityItem[]>(STORAGE_KEYS.OPPORTUNITIES);
  if (stored.status !== 'ok' || !Array.isArray(stored.value)) return [];

  // Only show real jobs uploaded via recruiter portal; remove fake/prototype mock jobs
  return stored.value.filter(
    (item) => item != null && typeof item === 'object' && item.isRecruiterPosted === true
  );
}

export function saveOpportunities(items: OpportunityItem[]): void {
  if (writeJson(STORAGE_KEYS.OPPORTUNITIES, items)) {
    notifySync(STORAGE_KEYS.OPPORTUNITIES, items);
  }
}

export function applyToOpportunity(oppId: string): OpportunityItem[] {
  const opps = getOpportunities();
  const target = opps.find((o) => o.id === oppId);
  if (!target) return opps;

  // Add to Job Applications in Tracker
  const applications = getApplications();
  const exists = applications.some(
    (a) => a.company.toLowerCase() === target.organization.toLowerCase() && a.role.toLowerCase() === target.title.toLowerCase()
  );
  if (!exists) {
    const newApp: JobApplication = {
      id: `app_opp_${Date.now()}`,
      company: target.organization,
      role: target.title,
      stage: 'applied',
      location: target.location,
      salaryRange: target.priceOrCompensation,
      appliedDate: new Date().toISOString().slice(0, 10),
      lastUpdated: new Date().toISOString().slice(0, 10),
      jobUrl: target.registrationUrl || 'https://omichub.ai/opportunity/' + target.id,
      notes: `Applied to ${target.type.toUpperCase()}: ${target.title} at ${target.organization}. Cost/Compensation: ${target.priceOrCompensation}. Schedule: ${target.durationOrSchedule}.`,
      rating: 5,
    };
    saveApplications([newApp, ...applications]);
  }

  addActivity({
    type: 'application',
    title: `Applied to ${target.type.toUpperCase()}: ${target.title}`,
    description: `Registered for ${target.organization} (${target.priceOrCompensation}). Added to your Job & Opportunity Tracker.`,
    badge: target.costType === 'Free' ? 'Free Registered' : 'Applied',
  });

  return opps;
}

export function incrementJobViews(jobId: string): void {
  const opps = getOpportunities();
  const updated = opps.map((o) => (o.id === jobId ? { ...o, viewsCount: (o.viewsCount || 0) + 1 } : o));
  saveOpportunities(updated);
}
