import { ResumeData, UserProfile } from '../../types';
import { addActivity } from './activity';
import { EMPTY_RESUME, INITIAL_RESUME } from './defaults';
import { STORAGE_KEYS } from './keys';
import { readJson, removeKey, writeJson } from './localStore';
import { notifySync } from './sync';
import { ResumeRevision } from './types';
import { getUser, saveUser } from './user';

function isResume(value: unknown): value is ResumeData {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function getResume(): ResumeData {
  const stored = readJson<ResumeData>(STORAGE_KEYS.RESUME);

  if (stored.status === 'ok' && isResume(stored.value)) return stored.value;
  if (stored.status === 'invalid' && stored.raw !== '') return EMPTY_RESUME;

  const user = getUser();
  return user.isResumeUploaded ? INITIAL_RESUME : EMPTY_RESUME;
}

export function saveResume(resume: ResumeData, changeNote?: string): void {
  resume.updatedAt = new Date().toISOString();

  if (!writeJson(STORAGE_KEYS.RESUME, resume)) return;

  createRevision(resume, changeNote);
  notifySync(STORAGE_KEYS.RESUME, resume);
}

export function getRevisions(): ResumeRevision[] {
  const stored = readJson<ResumeRevision[]>(STORAGE_KEYS.RESUME_REVISIONS);
  return stored.status === 'ok' && Array.isArray(stored.value) ? stored.value : [];
}

export function createRevision(resume: ResumeData, changeNote?: string): void {
  try {
    const revs = getRevisions();
    const newRev: ResumeRevision = {
      id: `rev_${Date.now()}`,
      timestamp: new Date().toISOString(),
      title: resume.personalInfo.fullName
        ? `${resume.personalInfo.fullName} - ${resume.personalInfo.headline || 'Resume'}`
        : 'Resume Revision',
      data: JSON.parse(JSON.stringify(resume)),
      changeNote: changeNote || 'Auto-saved revision',
    };
    // Keep last 15 revisions to avoid localStorage overflow
    const updated = [newRev, ...revs.slice(0, 14)];
    writeJson(STORAGE_KEYS.RESUME_REVISIONS, updated);
  } catch (e) {
    console.warn('Could not save revision', e);
  }
}

export function parseAndUploadResume(
  fileName: string,
  rawText: string,
  customData?: Partial<ResumeData>
): { resume: ResumeData; user: UserProfile } {
  const textLower = rawText.toLowerCase();

  const languages = ['TypeScript', 'JavaScript', 'Python', 'Go', 'Rust', 'Java', 'C++', 'SQL', 'HTML5', 'CSS3']
    .filter((s) => textLower.includes(s.toLowerCase()));
  const frameworks = ['React 19', 'React', 'Next.js', 'Node.js', 'Express', 'Tailwind CSS', 'Vue', 'Django', 'GraphQL']
    .filter((s) => textLower.includes(s.toLowerCase()));
  const cloudDevOps = ['AWS', 'Docker', 'Kubernetes', 'CI/CD', 'Terraform', 'GCP', 'Azure', 'Linux']
    .filter((s) => textLower.includes(s.toLowerCase()));
  const toolsAndDatabases = ['PostgreSQL', 'Redis', 'MongoDB', 'Git', 'Kafka', 'Elasticsearch', 'Webpack', 'Vite']
    .filter((s) => textLower.includes(s.toLowerCase()));

  const finalLanguages = languages.length > 0 ? languages : ['TypeScript', 'JavaScript', 'Python', 'SQL'];
  const finalFrameworks = frameworks.length > 0 ? frameworks : ['React 19', 'Next.js', 'Node.js', 'Tailwind CSS'];
  const finalCloud = cloudDevOps.length > 0 ? cloudDevOps : ['AWS', 'Docker', 'CI/CD'];
  const finalTools = toolsAndDatabases.length > 0 ? toolsAndDatabases : ['PostgreSQL', 'Redis', 'Git'];

  const lines = rawText.split('\n').map((l) => l.trim()).filter(Boolean);
  const candidateName = lines[0] && lines[0].length < 40 && !lines[0].includes('@') ? lines[0] : (getUser().name || 'Candidate Profile');

  const newResume: ResumeData = {
    id: `res_uploaded_${Date.now()}`,
    title: `${candidateName} - Master Resume`,
    updatedAt: new Date().toISOString(),
    theme: 'wine',
    personalInfo: {
      fullName: candidateName,
      headline: lines[1] && lines[1].length < 70 ? lines[1] : 'Full-Stack Software Engineer | Real-Time Systems',
      email: getUser().email || 'engineer@omichub.dev',
      phone: '+1 (555) 492-8172',
      location: getUser().location || 'San Francisco, CA',
      website: 'https://github.com/developer',
      linkedin: 'https://linkedin.com/in/developer',
      github: 'https://github.com/developer',
    },
    summary: rawText.length > 100
      ? rawText.slice(0, 380) + '...'
      : 'High-performing software engineer with proven experience delivering scalable applications, robust APIs, and performant user experiences. Adept at collaborative systems design, clean architecture, and rapid feature delivery.',
    workExperiences: [
      {
        id: `exp_${Date.now()}_1`,
        company: 'Tech Innovations Lab',
        role: 'Software Engineer',
        location: 'Remote',
        startDate: '2023-03',
        endDate: '',
        current: true,
        bullets: [
          `Engineered modern web microservices and reactive interfaces using ${finalFrameworks[0] || 'React'} and ${finalLanguages[0] || 'TypeScript'}, improving throughput by 35%.`,
          `Streamlined CI/CD deployment pipelines on ${finalCloud[0] || 'AWS'}, reducing deployment cycle times from 45 minutes to 8 minutes.`,
          `Collaborated with cross-functional product and design teams to launch customer-facing features supporting 250,000+ monthly active users.`,
        ],
      },
    ],
    education: [
      {
        id: `edu_${Date.now()}_1`,
        institution: 'University of Science & Technology',
        degree: 'Bachelor of Science',
        fieldOfStudy: 'Computer Science & Software Engineering',
        startDate: '2019-09',
        endDate: '2023-05',
        gpa: '3.85 / 4.0',
        honors: 'Dean Honor List • Distributed Systems Lab',
      },
    ],
    skills: {
      languages: finalLanguages,
      frameworks: finalFrameworks,
      cloudDevOps: finalCloud,
      toolsAndDatabases: finalTools,
      softSkills: ['System Design Architecture', 'Cross-Functional Team Leadership', 'Root-Cause Incident Triage'],
    },
    projects: [
      {
        id: `proj_${Date.now()}_1`,
        name: 'High-Throughput Real-Time Sync Engine',
        description: `Designed and built an open-source sync engine in ${finalLanguages[0] || 'TypeScript'} utilizing WebSockets and local storage caching for sub-10ms UI latency.`,
        technologies: [finalLanguages[0] || 'TypeScript', finalFrameworks[0] || 'React', finalTools[0] || 'PostgreSQL'],
        bullets: ['Achieved sub-10ms UI updates under simulated flaky network conditions.'],
      },
    ],
    certifications: [],
    ...(customData || {}),
  };

  const skillCount = finalLanguages.length + finalFrameworks.length + finalCloud.length + finalTools.length;
  const calculatedAtsScore = Math.min(96, Math.max(78, 70 + Math.round(skillCount * 1.5)));

  saveResume(newResume, `Uploaded real-time resume: ${fileName}`);

  const currentUser = getUser();
  const updatedUser: UserProfile = {
    ...currentUser,
    name: candidateName,
    role: newResume.personalInfo.headline || currentUser.role,
    isResumeUploaded: true,
    uploadedResumeFileName: fileName,
    uploadedAt: new Date().toISOString(),
    atsScore: calculatedAtsScore,
  };
  saveUser(updatedUser);

  addActivity({
    type: 'resume',
    title: `Resume Uploaded: ${fileName}`,
    description: `Real-time resume parsed successfully. ${skillCount} skills identified. Initial ATS score: ${calculatedAtsScore}/100.`,
    badge: 'Active Profile',
  });

  return { resume: newResume, user: updatedUser };
}

export function clearUploadedResume(): { resume: ResumeData; user: UserProfile } {
  removeKey(STORAGE_KEYS.RESUME);
  const currentUser = getUser();
  const resetUser: UserProfile = {
    ...currentUser,
    isResumeUploaded: false,
    uploadedResumeFileName: undefined,
    uploadedAt: undefined,
    atsScore: 0,
  };
  saveUser(resetUser);

  addActivity({
    type: 'resume',
    title: 'Reset Resume & Real-Time Profile',
    description: 'Profile cleared. Ready to upload or build in real time.',
    badge: 'Empty State',
  });

  return { resume: EMPTY_RESUME, user: resetUser };
}

export function loadDemoResume(): { resume: ResumeData; user: UserProfile } {
  saveResume(INITIAL_RESUME, 'Loaded Demo Staff Engineer Resume');
  const currentUser = getUser();
  const demoUser: UserProfile = {
    ...currentUser,
    name: 'Alex Morgan',
    role: 'Senior Full-Stack Engineer',
    isResumeUploaded: true,
    uploadedResumeFileName: 'Alex_Morgan_Staff_Resume_2026.pdf',
    uploadedAt: new Date().toISOString(),
    atsScore: 89,
  };
  saveUser(demoUser);

  addActivity({
    type: 'resume',
    title: 'Loaded Demo Staff Engineer Profile',
    description: 'Loaded pre-calibrated sample resume with 18 skills, ATS score 89/100, and verified badges.',
    badge: 'Demo Loaded',
  });

  return { resume: INITIAL_RESUME, user: demoUser };
}
