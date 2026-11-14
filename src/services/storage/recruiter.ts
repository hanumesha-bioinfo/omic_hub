import {
  OpportunityItem,
  RecruiterCompanyProfile,
  RecruiterJobApplication,
  RecruiterMessage,
  RecruiterNotification,
} from '../../types';
import { addActivity } from './activity';
import { getApplications, saveApplications } from './applications';
import { INITIAL_RECRUITER_APPLICATIONS } from './defaults';
import { LEGACY_RECRUITER_CANDIDATES_KEY, STORAGE_KEYS } from './keys';
import { readJson, removeKey, writeJson } from './localStore';
import { getOpportunities, saveOpportunities } from './opportunities';
import { notifySync } from './sync';

export function getRecruiterApplications(recruiterId?: string): RecruiterJobApplication[] {
  const stored = readJson<RecruiterJobApplication[]>(STORAGE_KEYS.RECRUITER_APPLICATIONS);
  const all = stored.status === 'ok' && Array.isArray(stored.value)
    ? stored.value
    : INITIAL_RECRUITER_APPLICATIONS;

  if (recruiterId) {
    return all.filter(
      (a) => a != null && typeof a === 'object' && (!a.recruiterId || a.recruiterId === recruiterId)
    );
  }
  return all;
}

export function saveRecruiterApplications(apps: RecruiterJobApplication[]): void {
  if (writeJson(STORAGE_KEYS.RECRUITER_APPLICATIONS, apps)) {
    notifySync(STORAGE_KEYS.RECRUITER_APPLICATIONS, apps);
  }
}

export function submitRecruiterApplication(
  app: Omit<RecruiterJobApplication, 'id' | 'submittedAt' | 'status'> & { status?: RecruiterJobApplication['status'] }
): RecruiterJobApplication {
  const existing = getRecruiterApplications();
  const newApp: RecruiterJobApplication = {
    ...app,
    id: `rec_app_${Date.now()}`,
    submittedAt: new Date().toISOString(),
    status: app.status || 'new',
  };
  const updated = [newApp, ...existing];
  saveRecruiterApplications(updated);

  // Also record in student's JobTracker applications
  const studentApps = getApplications();
  const alreadyTracked = studentApps.some(
    (a) => a.company.toLowerCase() === app.companyName.toLowerCase() && a.role.toLowerCase() === app.jobTitle.toLowerCase()
  );
  if (!alreadyTracked) {
    const trackerApp = {
      id: `app_inapp_${Date.now()}`,
      company: app.companyName,
      role: app.jobTitle,
      stage: 'applied' as const,
      location: 'Direct Recruiter Portal',
      salaryRange: 'Verified Recruiter Role',
      appliedDate: new Date().toISOString().slice(0, 10),
      lastUpdated: new Date().toISOString().slice(0, 10),
      notes: `Submitted via Omic Hub Easy Apply. Auto-linked profile: ${app.studentProfileUrl || 'N/A'}. Cover Note: "${app.coverNote.slice(0, 120)}..."`,
      rating: 5,
    };
    saveApplications([trackerApp, ...studentApps]);
  }

  addActivity({
    type: 'application',
    title: `Easy Apply Submitted: ${app.jobTitle}`,
    description: `Application delivered directly to ${app.companyName} recruiter dashboard. Candidate Profile: ${app.studentName}.`,
    badge: 'Delivered',
  });

  return newApp;
}

export function updateRecruiterApplicationStatus(
  applicationId: string,
  status: RecruiterJobApplication['status']
): RecruiterJobApplication[] {
  const apps = getRecruiterApplications();
  const target = apps.find((a) => a.id === applicationId);
  const updated = apps.map((a) => (a.id === applicationId ? { ...a, status } : a));
  saveRecruiterApplications(updated);

  // Sync to student side tracker applications automatically
  if (target) {
    const studentApps = getApplications();
    // map Recruiter status to student ApplicationStage:
    // 'new' -> 'applied', 'screening' -> 'screening', 'shortlisted' -> 'screening', 'interview' -> 'technical', 'selected' -> 'offer', 'rejected' -> 'rejected'
    const stageMap: Record<RecruiterJobApplication['status'], any> = {
      new: 'applied',
      screening: 'screening',
      shortlisted: 'screening',
      interview: 'technical',
      selected: 'offer',
      rejected: 'rejected',
    };
    const newStage = stageMap[status] || 'applied';
    const updatedStudentApps = studentApps.map((sa) => {
      if (
        sa.role.toLowerCase() === target.jobTitle.toLowerCase() &&
        sa.company.toLowerCase() === target.companyName.toLowerCase()
      ) {
        return {
          ...sa,
          stage: newStage,
          lastUpdated: new Date().toISOString().slice(0, 10),
          notes: `${sa.notes || ''}\n[Status Updated by Recruiter]: Moved to ${status.toUpperCase()} stage on ${new Date().toLocaleDateString()}.`.trim(),
        };
      }
      return sa;
    });
    saveApplications(updatedStudentApps);

    addActivity({
      type: 'application',
      title: `Application Status Changed: ${target.jobTitle}`,
      description: `Candidate ${target.studentName} status updated to ${status.toUpperCase()} at ${target.companyName}.`,
      badge: status.toUpperCase(),
    });
  }

  return updated;
}

export function getRecruiterMessages(recruiterId?: string): RecruiterMessage[] {
  const stored = readJson<RecruiterMessage[]>(STORAGE_KEYS.RECRUITER_MESSAGES);
  const all = stored.status === 'ok' && Array.isArray(stored.value) ? stored.value : [];

  if (recruiterId) {
    return all.filter(
      (m) => m != null && typeof m === 'object' && m.recruiterId === recruiterId
    );
  }
  return all;
}

export function sendRecruiterMessage(msg: Omit<RecruiterMessage, 'id' | 'timestamp' | 'read'>): RecruiterMessage {
  const existing = getRecruiterMessages();
  const newMsg: RecruiterMessage = {
    ...msg,
    id: `msg_${Date.now()}`,
    timestamp: new Date().toISOString(),
    read: false,
  };
  const updated = [newMsg, ...existing];

  if (writeJson(STORAGE_KEYS.RECRUITER_MESSAGES, updated)) {
    notifySync(STORAGE_KEYS.RECRUITER_MESSAGES, updated);
  }

  // Also notify recruiter
  addRecruiterNotification({
    title: `Message sent to ${msg.studentName}`,
    message: `Interview invitation / update sent for ${msg.jobTitle}: "${msg.content.slice(0, 80)}..."`,
    type: 'system',
    candidateId: msg.studentId,
  });

  return newMsg;
}

export function getRecruiterNotifications(_recruiterId?: string): RecruiterNotification[] {
  const stored = readJson<RecruiterNotification[]>(STORAGE_KEYS.RECRUITER_NOTIFICATIONS);
  return stored.status === 'ok' && Array.isArray(stored.value) ? stored.value : [];
}

export function addRecruiterNotification(
  notif: Omit<RecruiterNotification, 'id' | 'timestamp' | 'read'>
): RecruiterNotification {
  const existing = getRecruiterNotifications();
  const newNotif: RecruiterNotification = {
    ...notif,
    id: `notif_${Date.now()}`,
    timestamp: new Date().toISOString(),
    read: false,
  };
  const updated = [newNotif, ...existing];

  if (writeJson(STORAGE_KEYS.RECRUITER_NOTIFICATIONS, updated)) {
    notifySync(STORAGE_KEYS.RECRUITER_NOTIFICATIONS, updated);
  }

  return newNotif;
}

export function markRecruiterNotificationRead(notifId: string): void {
  const existing = getRecruiterNotifications();
  const updated = existing.map((n) => (n.id === notifId ? { ...n, read: true } : n));

  if (writeJson(STORAGE_KEYS.RECRUITER_NOTIFICATIONS, updated)) {
    notifySync(STORAGE_KEYS.RECRUITER_NOTIFICATIONS, updated);
  }
}

export function getRecruiterCompanyProfile(recruiterName?: string): RecruiterCompanyProfile {
  const stored = readJson<RecruiterCompanyProfile>(STORAGE_KEYS.RECRUITER_COMPANY_PROFILE);
  if (
    stored.status === 'ok' &&
    typeof stored.value === 'object' &&
    stored.value !== null &&
    !Array.isArray(stored.value)
  ) {
    return stored.value;
  }

  return {
    companyName: 'ABC Genomics Pvt. Ltd.',
    industry: 'Genomics / Bioinformatics',
    location: 'Bengaluru, India',
    website: 'https://abcgenomics.bio',
    about: 'Next-generation clinical transcriptomics and computational biology laboratory developing AI-guided precision therapies and diagnostic genomic panels.',
    recruiterName: recruiterName || 'Hanumesha',
    recruiterTitle: 'Senior Talent Acquisition Lead - Bioinformatics & Computational Biology',
    isVerified: true,
  };
}

export function saveRecruiterCompanyProfile(profile: RecruiterCompanyProfile): void {
  if (writeJson(STORAGE_KEYS.RECRUITER_COMPANY_PROFILE, profile)) {
    notifySync(STORAGE_KEYS.RECRUITER_COMPANY_PROFILE, profile);
  }
}

export function addRecruiterJob(jobData: Partial<OpportunityItem>): OpportunityItem {
  const current = getOpportunities();
  const newJob: OpportunityItem = {
    id: `opp_rec_${Date.now()}`,
    type: 'job',
    title: jobData.title || 'Bioinformatics Role',
    organization: jobData.organization || 'Biotech Partner',
    logo: jobData.logo || 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=80&auto=format&fit=crop&q=80',
    location: jobData.location || 'Remote',
    costType: 'Paid',
    priceOrCompensation: jobData.priceOrCompensation || '₹8,00,000 - ₹15,00,000/yr',
    numericValue: jobData.numericValue || 800000,
    rangeTier: jobData.rangeTier || '100k_to_15L',
    durationOrSchedule: jobData.durationOrSchedule || 'Full-Time Employee',
    startDateOrDeadline: jobData.startDateOrDeadline || 'Open until filled',
    skills: jobData.skills && jobData.skills.length > 0 ? jobData.skills : ['Python', 'RNA-Seq', 'Linux'],
    description: jobData.description || 'Join our bioinformatics team working on clinical sequencing and computational biology workflows.',
    matchScore: jobData.matchScore || 96,
    featured: true,
    perks: jobData.perks || ['Direct Hiring', 'Competitive Stipend/Salary', 'Flexible Schedule'],
    isRecruiterPosted: true,
    postedByRecruiterId: jobData.postedByRecruiterId || 'rec_user',
    postedByRecruiterName: jobData.postedByRecruiterName || 'Verified Hiring Lead',
    recruiterEmail: jobData.recruiterEmail,
    applicationType: jobData.applicationType || 'in_app',
    externalApplyUrl: jobData.externalApplyUrl,
    createdAt: new Date().toISOString(),
  };

  const updated = [newJob, ...current];
  saveOpportunities(updated);

  addActivity({
    type: 'application',
    title: `Published Recruiter Role: ${newJob.title}`,
    description: `Posted under ${newJob.organization} (${newJob.applicationType === 'external' ? 'External URL' : 'In-App Easy Apply'}). Visible to all bioinformatics students.`,
    badge: 'Live on Feed',
  });

  return newJob;
}

export function deleteRecruiterJob(jobId: string): OpportunityItem[] {
  const current = getOpportunities();
  const updated = current.filter((j) => j.id !== jobId);
  saveOpportunities(updated);
  return updated;
}

export function clearRecruiterCandidates(): void {
  removeKey(LEGACY_RECRUITER_CANDIDATES_KEY);
}

export function saveRecruiterCandidates(candidates: unknown[]): void {
  writeJson(LEGACY_RECRUITER_CANDIDATES_KEY, candidates);
}
