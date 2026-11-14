import { STORAGE_KEYS } from './keys';
import {
  DEFAULT_USER,
  INITIAL_ACTIVITIES,
  INITIAL_APPLICATIONS,
  INITIAL_COURSES,
  INITIAL_RESUME,
  INITIAL_SCHEDULED_INTERVIEWS,
} from './defaults';
import { getActivities, addActivity } from './activity';
import { getApplications, saveApplications } from './applications';
import { getCertifiedBadges, getScheduledInterviews, saveScheduledInterviews } from './interviews';
import { getCompanyReferrals } from './referrals';
import { getCourses, saveCourses } from './learning';
import { clearStorage, writeJson } from './localStore';
import { getResume, getRevisions, saveResume } from './resume';
import { notifySync } from './sync';
import { SearchResultItem } from './types';
import { getUser, saveUser } from './user';

// Export full career data bundle
export function exportAllData() {
  return {
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    user: getUser(),
    resume: getResume(),
    revisions: getRevisions(),
    applications: getApplications(),
    activities: getActivities(),
    courses: getCourses(),
    scheduledInterviews: getScheduledInterviews(),
    certifiedBadges: getCertifiedBadges(),
    companyReferrals: getCompanyReferrals(),
  };
}

// Import full career data bundle
export function importAllData(bundle: any): boolean {
  try {
    if (!bundle || typeof bundle !== 'object') return false;
    if (bundle.user) saveUser(bundle.user);
    if (bundle.resume) saveResume(bundle.resume, 'Imported from backup');
    if (bundle.applications && Array.isArray(bundle.applications)) saveApplications(bundle.applications);
    if (bundle.courses && Array.isArray(bundle.courses)) saveCourses(bundle.courses);
    if (bundle.scheduledInterviews && Array.isArray(bundle.scheduledInterviews)) saveScheduledInterviews(bundle.scheduledInterviews);
    if (bundle.activities && Array.isArray(bundle.activities)) {
      writeJson(STORAGE_KEYS.ACTIVITIES, bundle.activities);
    }
    addActivity({
      type: 'resume',
      title: 'Restored Career Data Backup',
      description: 'Successfully restored all career documents and application pipelines.',
      badge: 'Restored',
    });
    notifySync('ALL_RESTORED', bundle);
    return true;
  } catch (e) {
    console.error('Import failed', e);
    return false;
  }
}

// Reset to default seed data
export function resetAllData(): void {
  clearStorage();
  saveUser(DEFAULT_USER);
  saveResume(INITIAL_RESUME, 'Initial Setup');
  saveApplications(INITIAL_APPLICATIONS);
  saveCourses(INITIAL_COURSES);
  saveScheduledInterviews(INITIAL_SCHEDULED_INTERVIEWS);
  writeJson(STORAGE_KEYS.ACTIVITIES, INITIAL_ACTIVITIES);
  notifySync('ALL_RESET', null);
}

// Universal real-time data search across all records
export function searchAllData(query: string): SearchResultItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const results: SearchResultItem[] = [];

  // Search Resume
  const resume = getResume();
  // Summary
  if (resume.summary && resume.summary.toLowerCase().includes(q)) {
    results.push({
      id: 'search_res_summary',
      category: 'Resume Bullet',
      title: 'Professional Summary',
      snippet: resume.summary.slice(0, 160) + '...',
      fullContent: resume.summary,
      metadata: `${resume.personalInfo.fullName} • Summary`,
      sourceTab: 'builder',
    });
  }
  // Work Experience Bullets
  resume.workExperiences.forEach((exp, expIdx) => {
    exp.bullets.forEach((b, bIdx) => {
      if (b.toLowerCase().includes(q) || exp.company.toLowerCase().includes(q) || exp.role.toLowerCase().includes(q)) {
        results.push({
          id: `search_bullet_${expIdx}_${bIdx}`,
          category: 'Resume Bullet',
          title: `${exp.role} @ ${exp.company}`,
          snippet: b,
          fullContent: b,
          metadata: `${exp.company} (${exp.startDate} - ${exp.current ? 'Present' : exp.endDate})`,
          sourceTab: 'builder',
        });
      }
    });
  });
  // Skills
  const allSkills = [
    ...resume.skills.languages,
    ...resume.skills.frameworks,
    ...resume.skills.cloudDevOps,
    ...resume.skills.toolsAndDatabases,
    ...resume.skills.softSkills,
  ];
  const matchingSkills = allSkills.filter((s) => s.toLowerCase().includes(q));
  if (matchingSkills.length > 0) {
    results.push({
      id: 'search_skills_matched',
      category: 'Resume Bullet',
      title: 'Matching Skills & Technologies',
      snippet: matchingSkills.join(', '),
      fullContent: matchingSkills.join(', '),
      metadata: 'Technical Stack Competencies',
      sourceTab: 'builder',
    });
  }

  // Search Job Applications
  const apps = getApplications();
  apps.forEach((app) => {
    const match =
      app.company.toLowerCase().includes(q) ||
      app.role.toLowerCase().includes(q) ||
      app.location.toLowerCase().includes(q) ||
      (app.notes && app.notes.toLowerCase().includes(q)) ||
      (app.recruiterName && app.recruiterName.toLowerCase().includes(q));
    if (match) {
      results.push({
        id: `search_app_${app.id}`,
        category: 'Job Application',
        title: `${app.role} at ${app.company}`,
        snippet: app.notes || `Stage: ${app.stage.toUpperCase()} | Salary: ${app.salaryRange || 'Not disclosed'}`,
        fullContent: `Company: ${app.company}\nRole: ${app.role}\nStage: ${app.stage}\nLocation: ${app.location}\nSalary: ${app.salaryRange || 'N/A'}\nNotes: ${app.notes || 'None'}`,
        metadata: `Stage: ${app.stage.toUpperCase()} • ${app.location}`,
        sourceTab: 'tracker',
      });
    }
  });

  // Search Interviews
  const interviews = getScheduledInterviews();
  interviews.forEach((int) => {
    const match =
      int.title.toLowerCase().includes(q) ||
      int.type.toLowerCase().includes(q) ||
      (int.feedbackSummary && int.feedbackSummary.toLowerCase().includes(q));
    if (match) {
      results.push({
        id: `search_int_${int.id}`,
        category: 'Interview STAR',
        title: int.title,
        snippet: int.feedbackSummary || `Status: ${int.status} on ${int.date} at ${int.time}`,
        fullContent: `Interview: ${int.title}\nType: ${int.type}\nStatus: ${int.status}\nDate: ${int.date} ${int.time}\nFeedback: ${int.feedbackSummary || 'N/A'}`,
        metadata: `${int.type} • Status: ${int.status}`,
        sourceTab: 'mock-interview',
      });
    }
  });

  // Search Courses
  const courses = getCourses();
  courses.forEach((c) => {
    const match =
      c.title.toLowerCase().includes(q) ||
      c.category.toLowerCase().includes(q) ||
      c.lessons.some((l) => l.title.toLowerCase().includes(q) || (l.keyTakeaway && l.keyTakeaway.toLowerCase().includes(q)));
    if (match) {
      results.push({
        id: `search_course_${c.id}`,
        category: 'Skill Course',
        title: c.title,
        snippet: `${c.category} • Progress: ${c.progressPercent}% (${c.completedHours}/${c.estimatedHours} hrs)`,
        fullContent: `Course: ${c.title}\nCategory: ${c.category}\nLevel: ${c.level}\nProgress: ${c.progressPercent}%\nLessons:\n${c.lessons.map((l) => `- ${l.title}: ${l.keyTakeaway || ''}`).join('\n')}`,
        metadata: `${c.level} • ${c.progressPercent}% Complete`,
        sourceTab: 'skills',
      });
    }
  });

  return results;
}
