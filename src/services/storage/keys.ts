export const STORAGE_KEYS = {
  USER: 'tf_user_profile',
  AUTH_STATE: 'tf_auth_state',
  RESUME: 'tf_resume_data',
  RESUME_REVISIONS: 'tf_resume_revisions',
  APPLICATIONS: 'tf_job_applications',
  ACTIVITIES: 'tf_activities',
  COURSES: 'tf_courses',
  SCHEDULED_INTERVIEWS: 'tf_interviews',
  CERTIFIED_BADGES: 'tf_certified_badges_v2',
  COMPANY_REFERRALS: 'tf_company_referrals',
  OPPORTUNITIES: 'tf_opportunities',
  NEWS: 'tf_bioinformatics_news',
  BOOKMARKED_NEWS: 'tf_bookmarked_news',
  PROGRAMS: 'tf_bioinformatics_programs',
  RECRUITER_APPLICATIONS: 'tf_recruiter_applications',
  RECRUITER_MESSAGES: 'tf_recruiter_messages',
  RECRUITER_NOTIFICATIONS: 'tf_recruiter_notifications',
  RECRUITER_COMPANY_PROFILE: 'tf_recruiter_company_profile',
  RECRUITER_CANDIDATES: 'tf_recruiter_candidates',
  LAST_SYNC: 'tf_last_sync_time',
} as const;

export const LEGACY_RECRUITER_CANDIDATES_KEY = 'omichub_recruiter_candidates';

export const SYNC_CHANNEL_NAME = 'omichub_realtime_sync';
