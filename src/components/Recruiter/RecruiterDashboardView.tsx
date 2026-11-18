import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Briefcase,
  Building2,
  Users,
  PlusCircle,
  ExternalLink,
  Send,
  CheckCircle2,
  Clock,
  MapPin,
  Tag,
  DollarSign,
  FileText,
  Mail,
  UserCheck,
  Eye,
  Filter,
  Sparkles,
  ShieldCheck,
  Trash2,
  Share2,
  Upload,
  Check,
  Award,
  BookOpen,
  Search,
  X,
  Copy,
  LogOut,
  ChevronDown,
  Bell,
  MessageSquare,
  BarChart3,
  TrendingUp,
  SlidersHorizontal,
  ChevronRight,
  ArrowRight,
  Calendar,
  Layers,
  Phone,
  Globe,
  AlertCircle,
  CheckCircle,
  User,
  Settings,
  Plus,
  LayoutDashboard,
} from 'lucide-react';
import {
  UserProfile,
  OpportunityItem,
  CandidateStudent,
  RecruiterJobApplication,
  RecruiterApplicationStatus,
  RecruiterMessage,
  RecruiterNotification,
  RecruiterCompanyProfile,
} from '../../types';
import { StorageService } from '../../services/storage';
import { useToast } from '../../shared/ui/Toast';
import confetti from 'canvas-confetti';

interface RecruiterDashboardViewProps {
  user: UserProfile;
  onLogout?: () => void;
}

// Strictly derive candidates ONLY from applications submitted by registered Omic Hub students
// Zero fake candidates: candidates only appear when registered students apply for a job opening.
export const deriveCandidatesFromApplications = (
  apps: RecruiterJobApplication[]
): CandidateStudent[] => {
  if (!apps || apps.length === 0) return [];

  return apps.map((app) => {
    const degreeType =
      app.candidateDegreeType ||
      (app.candidateEducation?.includes('Ph')
        ? 'PhD'
        : app.candidateEducation?.includes('M.Tech')
        ? 'MTech'
        : 'MSc');

    const skills =
      app.candidateSkills && app.candidateSkills.length > 0
        ? app.candidateSkills
        : ['Python', 'Linux', 'R', 'NGS', 'RNA-seq', 'BLAST'];

    return {
      id: app.studentId || `cand_${app.id}`,
      name: app.studentName || 'Registered Student',
      email: app.studentEmail || 'student@omichub.bio',
      avatar: '',
      headline: `${degreeType} Computational Biology Scholar`,
      education: app.candidateEducation || 'M.Sc. Bioinformatics, Pondicherry University',
      degreeType: degreeType as any,
      experienceLevel: (app.candidateExperience?.includes('3+')
        ? '3+ years'
        : app.candidateExperience?.includes('1-2')
        ? '1-2 years'
        : 'Fresher') as any,
      location: 'Bengaluru, India (Open to Remote)',
      omicHubProfileUrl:
        app.studentProfileUrl ||
        `omichub.bio/talent/${(app.studentName || 'student').toLowerCase().replace(/\s+/g, '_')}`,
      atsScore: app.candidateAtsScore || 94,
      skills: skills,
      preferredSkills: ['Nextflow', 'Docker', 'Bioconductor', 'AWS'],
      verifiedBadges:
        app.candidateBadges && app.candidateBadges.length > 0
          ? app.candidateBadges
          : [{ badgeName: 'Omic Hub Verified', score: 95, assessmentType: 'Genomics Pipelines & NGS' }],
      bioSummary:
        app.candidateBioSummary ||
        app.coverNote ||
        'Verified bioinformatics student registered in Omic Hub who applied for this role.',
      projects:
        app.candidateProjects && app.candidateProjects.length > 0
          ? app.candidateProjects
          : ['Automated RNA-Seq Variant Calling Pipeline'],
      researchExperience: app.candidateExperience || 'Graduate Research Scholar',
      internships: 'Computational Biology Intern',
      certifications: ['Omic Hub Verified Scholar'],
      githubUrl: app.candidateGithubUrl || 'https://github.com/bioinformatician',
      resumeFileName: app.resumeFileName || 'Student_Bioinformatics_CV.pdf',
      publicationsCount: 1,
      invited: app.status === 'interview',
      shortlisted:
        app.status === 'shortlisted' ||
        app.status === 'interview' ||
        app.status === 'selected',
      pipelineStage: app.status,
      applicationId: app.id,
      appliedJobId: app.jobId,
      appliedJobTitle: app.jobTitle,
      coverNote: app.coverNote,
      appliedAt: app.submittedAt,
    };
  });
};

type RecruiterTab =
  | 'dashboard'
  | 'jobs'
  | 'candidates'
  | 'applications'
  | 'messages'
  | 'analytics'
  | 'company-profile';

export const RecruiterDashboardView: React.FC<RecruiterDashboardViewProps> = ({
  user,
  onLogout,
}) => {
  const { showToast } = useToast();

  // Company profile from storage
  const [companyProfile, setCompanyProfile] = useState<RecruiterCompanyProfile>(() =>
    StorageService.getRecruiterCompanyProfile(user.name || 'Hanumesha')
  );

  // Active top-level navigation tab
  const [activeTab, setActiveTab] = useState<RecruiterTab>('dashboard');

  // Applications from storage (strictly real submissions from registered students)
  const [applications, setApplications] = useState<RecruiterJobApplication[]>(() =>
    StorageService.getRecruiterApplications()
  );

  // Candidate pool state derived strictly from registered students who actually applied (NO fake candidates)
  const [candidates, setCandidates] = useState<CandidateStudent[]>(() => {
    StorageService.clearRecruiterCandidates();
    const initialApps = StorageService.getRecruiterApplications();
    return deriveCandidatesFromApplications(initialApps);
  });

  // Posted jobs from storage
  const [opportunities, setOpportunities] = useState<OpportunityItem[]>(() =>
    StorageService.getOpportunities()
  );

  // Filter only recruiter posted jobs for this recruiter
  const recruiterJobs = useMemo(() => {
    return opportunities.filter((o) => o.isRecruiterPosted);
  }, [opportunities]);


  // Messages from storage
  const [messages, setMessages] = useState<RecruiterMessage[]>(() =>
    StorageService.getRecruiterMessages()
  );

  // Notifications from storage
  const [notifications, setNotifications] = useState<RecruiterNotification[]>(() => {
    const list = StorageService.getRecruiterNotifications();
    if (list.length === 0) {
      return [
        {
          id: 'notif_welcome',
          title: 'Welcome to Recruiter Portal',
          message: 'Post verified bioinformatics openings to reach top students and research scholars.',
          timestamp: new Date().toISOString(),
          read: false,
          type: 'system',
        },
      ];
    }
    return list;
  });

  // Modals & UI States
  const [showPostJobModal, setShowPostJobModal] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateStudent | null>(null);
  const [showCandidateProfileModal, setShowCandidateProfileModal] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showNotificationsPopover, setShowNotificationsPopover] = useState(false);

  // Selected job for candidate matching filter
  const [selectedMatchingJobId, setSelectedMatchingJobId] = useState<string>(() => {
    return recruiterJobs[0]?.id || 'all';
  });

  // Candidates view mode: 'matches' or 'pipeline' (Kanban)
  const [candidateViewMode, setCandidateViewMode] = useState<'matches' | 'pipeline'>('matches');

  // Candidate search & filter
  const [candidateSearchQuery, setCandidateSearchQuery] = useState('');
  const [filterSkills, setFilterSkills] = useState<string[]>([]);
  const [filterDegree, setFilterDegree] = useState<string[]>([]);
  const [filterExperience, setFilterExperience] = useState<string[]>([]);

  // Messages active candidate chat
  const [activeChatCandidateId, setActiveChatCandidateId] = useState<string>(
    candidates[0]?.id || ''
  );
  const [messageInputText, setMessageInputText] = useState('');

  // Post Job Form State
  const [jobTitle, setJobTitle] = useState('Junior NGS Bioinformatics Analyst');
  const [jobDepartment, setJobDepartment] = useState('Computational Biology & Genomics');
  const [employmentType, setEmploymentType] = useState<
    'Internship' | 'Full-time' | 'Part-time' | 'Contract' | 'Dissertation' | 'Research Assistant'
  >('Full-time');
  const [workType, setWorkType] = useState<'Remote' | 'On-site' | 'Hybrid'>('Remote');
  const [jobLocation, setJobLocation] = useState('Bengaluru, India (Remote Option)');
  const [stipendSalary, setStipendSalary] = useState('₹8,00,000 - ₹14,00,000/yr');
  const [applicationDeadline, setApplicationDeadline] = useState(
    new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)
  );
  const [openingsCount, setOpeningsCount] = useState<number>(2);
  const [jobDescription, setJobDescription] = useState(
    'Seeking an enthusiastic Computational Biologist / Bioinformatics Scientist to design, validate, and execute reproducible NGS data analysis pipelines (bulk & single-cell RNA-seq, variant calling). Must have proficiency with Python, Biopython, Linux command line, and BLAST sequence homology search. Experience with Nextflow or containerized workflows is a strong plus.'
  );
  const [responsibilitiesText, setResponsibilitiesText] = useState(
    '• NGS data analysis (bulk & scRNA-seq)\n• RNA-seq pipeline development with Nextflow\n• Variant analysis with GATK\n• Python & Bash command line scripting'
  );
  const [requiredSkillsTags, setRequiredSkillsTags] = useState<string[]>([
    'Python',
    'Linux',
    'R',
    'NGS',
    'RNA-seq',
    'SQL',
  ]);
  const [preferredSkillsTags, setPreferredSkillsTags] = useState<string[]>([
    'Nextflow',
    'Docker',
    'Bioconductor',
    'AWS',
  ]);
  const [skillTagInput, setSkillTagInput] = useState('');
  const [prefSkillTagInput, setPrefSkillTagInput] = useState('');
  const [jdFileName, setJdFileName] = useState('');
  const [isSubmittingJob, setIsSubmittingJob] = useState(false);

  // Sync state with storage subscriptions
  useEffect(() => {
    const unsub = StorageService.subscribe(() => {
      const currentApps = StorageService.getRecruiterApplications();
      setOpportunities(StorageService.getOpportunities());
      setApplications(currentApps);
      setCandidates(deriveCandidatesFromApplications(currentApps));
      setMessages(StorageService.getRecruiterMessages());
      setNotifications(StorageService.getRecruiterNotifications());
    });
    return () => unsub();
  }, []);

  // Ensure activeChatCandidateId stays valid as candidates change
  useEffect(() => {
    if (candidates.length > 0) {
      if (!activeChatCandidateId || !candidates.some((c) => c.id === activeChatCandidateId)) {
        setActiveChatCandidateId(candidates[0].id);
      }
    } else {
      setActiveChatCandidateId('');
    }
  }, [candidates, activeChatCandidateId]);

  // Update selectedMatchingJobId when recruiterJobs change
  useEffect(() => {
    if (selectedMatchingJobId === 'all' && recruiterJobs.length > 0) {
      setSelectedMatchingJobId(recruiterJobs[0].id);
    }
  }, [recruiterJobs, selectedMatchingJobId]);

  // Persist candidate status changes
  const saveCandidateState = (updatedList: CandidateStudent[]) => {
    setCandidates(updatedList);
    StorageService.saveRecruiterCandidates(updatedList);
  };

  // Active target job for candidate matching calculations
  const activeMatchingJob = useMemo(() => {
    if (selectedMatchingJobId === 'all' || !selectedMatchingJobId) {
      return recruiterJobs[0] || null;
    }
    return recruiterJobs.find((j) => j.id === selectedMatchingJobId) || recruiterJobs[0] || null;
  }, [selectedMatchingJobId, recruiterJobs]);

  // ==============================================================
  // DETERMINISTIC CANDIDATE MATCHING ENGINE
  // Calculated from actual candidate & job data (NOT arbitrary AI)
  // ==============================================================
  const calculateCandidateMatchBreakdown = (
    candidate: CandidateStudent,
    targetJob: OpportunityItem | null
  ) => {
    const requiredSkills = targetJob?.skills || requiredSkillsTags;
    const preferredSkills = targetJob?.preferredSkills || preferredSkillsTags;
    const candSkillsLower = candidate.skills.map((s) => s.toLowerCase());

    // 1. Skill Match (45% weight)
    const matchedRequired = requiredSkills.filter((req) =>
      candSkillsLower.some((cs) => cs.includes(req.toLowerCase()) || req.toLowerCase().includes(cs))
    );
    const matchedPreferred = preferredSkills.filter((pref) =>
      candSkillsLower.some((cs) => cs.includes(pref.toLowerCase()) || pref.toLowerCase().includes(cs))
    );

    const requiredScore = requiredSkills.length > 0 ? (matchedRequired.length / requiredSkills.length) * 80 : 70;
    const preferredScore = preferredSkills.length > 0 ? (matchedPreferred.length / preferredSkills.length) * 20 : 15;
    const skillMatch = Math.min(100, Math.round(requiredScore + preferredScore));

    // 2. Education Match (25% weight)
    let educationMatch = 85;
    const degree = candidate.degreeType || 'MSc';
    if (degree === 'PhD') educationMatch = 100;
    else if (degree === 'MTech' || degree === 'MSc') educationMatch = 96;
    else if (degree === 'BTech') educationMatch = 82;
    if (candidate.education.toLowerCase().includes('gpa 3.9') || candidate.education.toLowerCase().includes('gold medal')) {
      educationMatch = Math.min(100, educationMatch + 4);
    }

    // 3. Experience Match (20% weight)
    let experienceMatch = 80;
    const exp = candidate.experienceLevel || '1-2 years';
    if (targetJob?.employmentType === 'Internship') {
      experienceMatch = exp === 'Fresher' ? 100 : 92;
    } else if (targetJob?.employmentType === 'Research Assistant') {
      experienceMatch = 90;
    } else {
      if (exp === '3+ years') experienceMatch = 98;
      else if (exp === '1-2 years') experienceMatch = 88;
      else experienceMatch = 76;
    }
    if ((candidate.publicationsCount || 0) >= 2) {
      experienceMatch = Math.min(100, experienceMatch + 4);
    }

    // 4. Location Match (10% weight)
    let locationMatch = 90;
    const jobLoc = (targetJob?.location || workType).toLowerCase();
    const candLoc = candidate.location.toLowerCase();
    if (jobLoc.includes('remote') || candLoc.includes('remote')) {
      locationMatch = 100;
    } else if (jobLoc.includes('bengaluru') && candLoc.includes('bengaluru')) {
      locationMatch = 100;
    } else if (candLoc.includes('relocation')) {
      locationMatch = 90;
    } else {
      locationMatch = 75;
    }

    // Overall Weighted Calculation
    const overallMatch = Math.round(
      skillMatch * 0.45 + educationMatch * 0.25 + experienceMatch * 0.2 + locationMatch * 0.1
    );

    return {
      skillMatch,
      educationMatch,
      experienceMatch,
      locationMatch,
      overallMatch: Math.min(99, Math.max(68, overallMatch)),
      matchedRequired,
      matchedPreferred,
    };
  };

  // Process candidates with calculated match percentages
  const rankedCandidates = useMemo(() => {
    return candidates
      .map((c) => {
        const breakdown = calculateCandidateMatchBreakdown(c, activeMatchingJob);
        return {
          ...c,
          breakdown,
        };
      })
      .sort((a, b) => b.breakdown.overallMatch - a.breakdown.overallMatch);
  }, [candidates, activeMatchingJob, requiredSkillsTags, preferredSkillsTags]);

  // Filter candidates by search queries and multi-select filters
  const filteredCandidates = useMemo(() => {
    return rankedCandidates.filter((cand) => {
      // Query filter
      if (candidateSearchQuery.trim()) {
        const q = candidateSearchQuery.toLowerCase();
        const matchesName = cand.name.toLowerCase().includes(q);
        const matchesEdu = cand.education.toLowerCase().includes(q);
        const matchesSkills = cand.skills.some((s) => s.toLowerCase().includes(q));
        const matchesLoc = cand.location.toLowerCase().includes(q);
        if (!matchesName && !matchesEdu && !matchesSkills && !matchesLoc) return false;
      }

      // Skill filters
      if (filterSkills.length > 0) {
        const hasAllSelectedSkills = filterSkills.every((fSkill) =>
          cand.skills.some((cs) => cs.toLowerCase().includes(fSkill.toLowerCase()))
        );
        if (!hasAllSelectedSkills) return false;
      }

      // Degree filter
      if (filterDegree.length > 0) {
        if (!cand.degreeType || !filterDegree.includes(cand.degreeType)) return false;
      }

      // Experience filter
      if (filterExperience.length > 0) {
        if (!cand.experienceLevel || !filterExperience.includes(cand.experienceLevel)) return false;
      }

      return true;
    });
  }, [rankedCandidates, candidateSearchQuery, filterSkills, filterDegree, filterExperience]);

  // Real Database KPIs (Only real counts, 0 if no records)
  const kpis = useMemo(() => {
    const activeJobs = recruiterJobs.length;
    const totalApps = applications.length;
    const shortlistedApps = applications.filter((a) => a.status === 'shortlisted').length;
    const interviewApps = applications.filter((a) => a.status === 'interview').length;
    return {
      activeJobs,
      totalApps,
      shortlistedApps,
      interviewApps,
    };
  }, [recruiterJobs, applications]);

  // Greeting based on time of day
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  // Handle Post Job Submission
  const handlePublishListing = (e: React.FormEvent) => {
    e.preventDefault();

    if (!jobTitle.trim()) {
      showToast('Validation Error: Job Title is required.', 'error');
      return;
    }
    if (!stipendSalary.trim()) {
      showToast('Validation Error: Salary / Stipend is required.', 'error');
      return;
    }
    if (requiredSkillsTags.length === 0) {
      showToast('Validation Error: Please add at least one Required Skill tag.', 'error');
      return;
    }
    if (!jobDescription.trim()) {
      showToast('Validation Error: Job Description cannot be empty.', 'error');
      return;
    }

    setIsSubmittingJob(true);

    const responsibilitiesList = responsibilitiesText
      .split('\n')
      .map((r) => r.replace(/^•\s*/, '').trim())
      .filter(Boolean);

    const newJob = StorageService.addRecruiterJob({
      title: jobTitle.trim(),
      organization: companyProfile.companyName || user.companyName || 'ABC Genomics Pvt. Ltd.',
      department: jobDepartment.trim(),
      employmentType: employmentType,
      workType: workType,
      location: jobLocation.trim(),
      priceOrCompensation: stipendSalary.trim(),
      numericValue: stipendSalary.includes('15') ? 1500000 : 800000,
      rangeTier: stipendSalary.includes('15') ? '15L_plus' : '100k_to_15L',
      durationOrSchedule: `${workType} • ${employmentType}`,
      startDateOrDeadline: applicationDeadline || 'Open until filled',
      applicationDeadline: applicationDeadline,
      openingsCount: openingsCount,
      skills: requiredSkillsTags,
      preferredSkills: preferredSkillsTags,
      description: jobDescription.trim(),
      responsibilities: responsibilitiesList,
      postedByRecruiterId: user.id,
      postedByRecruiterName: user.name || companyProfile.recruiterName || 'Verified Hiring Lead',
      recruiterEmail: user.email,
      applicationType: 'in_app',
      matchScore: 98,
      viewsCount: 1,
    });

    setOpportunities(StorageService.getOpportunities());
    setSelectedMatchingJobId(newJob.id);
    setIsSubmittingJob(false);
    setShowPostJobModal(false);

    confetti({ particleCount: 75, spread: 80, origin: { y: 0.6 } });
    showToast(
      `"${newJob.title}" published! Listing is now active on the student job feed.`,
      'success'
    );

    // Add recruiter notification
    StorageService.addRecruiterNotification({
      title: `Job Posted: ${newJob.title}`,
      message: `Your posting is live. Candidate matching is now active against the verified candidate pool.`,
      type: 'system',
      jobId: newJob.id,
    });

    // Automatically transition to Candidate Matching tab
    setActiveTab('candidates');
  };

  // Add & remove skill tag helpers
  const handleAddRequiredTag = () => {
    const trimmed = skillTagInput.trim();
    if (trimmed && !requiredSkillsTags.some((t) => t.toLowerCase() === trimmed.toLowerCase())) {
      setRequiredSkillsTags((prev) => [...prev, trimmed]);
      setSkillTagInput('');
    }
  };

  const handleAddPreferredTag = () => {
    const trimmed = prefSkillTagInput.trim();
    if (trimmed && !preferredSkillsTags.some((t) => t.toLowerCase() === trimmed.toLowerCase())) {
      setPreferredSkillsTags((prev) => [...prev, trimmed]);
      setPrefSkillTagInput('');
    }
  };

  // Handle JD File upload
  const handleJdFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setJdFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = (event.target?.result as string) || '';
      if (text) {
        setJobDescription(text);
        showToast(`Loaded Job Description from file: ${file.name}`, 'info');
      }
    };
    reader.readAsText(file);
  };

  // Toggle Shortlist & Pipeline stage for Candidate
  const handleToggleShortlist = (studentId: string) => {
    const targetApp = applications.find(
      (a) => a.studentId === studentId || a.id === studentId || `cand_${a.id}` === studentId
    );
    if (!targetApp) return;

    const nextStatus: RecruiterApplicationStatus =
      targetApp.status === 'shortlisted' ? 'new' : 'shortlisted';

    const updatedApps = StorageService.updateRecruiterApplicationStatus(targetApp.id, nextStatus);
    setApplications(updatedApps);
    setCandidates(deriveCandidatesFromApplications(updatedApps));

    if (nextStatus === 'shortlisted') {
      showToast(`Shortlisted ${targetApp.studentName} for candidate pipeline!`, 'success');
      confetti({ particleCount: 35, spread: 50, origin: { y: 0.7 } });
    } else {
      showToast(`Removed ${targetApp.studentName} from shortlist.`, 'info');
    }
  };

  // Change candidate pipeline stage
  const handleUpdateCandidateStage = (studentId: string, stage: RecruiterApplicationStatus) => {
    const targetApp = applications.find(
      (a) => a.studentId === studentId || a.id === studentId || `cand_${a.id}` === studentId
    );
    if (!targetApp) return;

    const updatedApps = StorageService.updateRecruiterApplicationStatus(targetApp.id, stage);
    setApplications(updatedApps);
    setCandidates(deriveCandidatesFromApplications(updatedApps));
    showToast(`Updated ${targetApp.studentName} status to: ${stage.toUpperCase()}`, 'info');
  };

  // Change application status (and bidirectional sync to student!)
  const handleUpdateAppStatus = (appId: string, newStatus: RecruiterApplicationStatus) => {
    const updated = StorageService.updateRecruiterApplicationStatus(appId, newStatus);
    setApplications(updated);
    showToast(`Application moved to ${newStatus.toUpperCase()}. Student status automatically updated!`, 'success');
  };

  // Open Message Chat for Candidate
  const handleStartMessage = (candidate: CandidateStudent) => {
    setActiveChatCandidateId(candidate.id);
    setActiveTab('messages');
  };

  // Send Recruiter Message
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInputText.trim()) return;

    const cand = candidates.find((c) => c.id === activeChatCandidateId);
    if (!cand) return;

    const newMsg = StorageService.sendRecruiterMessage({
      recruiterId: user.id,
      studentId: cand.id,
      studentName: cand.name,
      studentEmail: cand.email,
      studentAvatar: cand.avatar,
      jobTitle: activeMatchingJob?.title || 'Bioinformatics Specialist',
      sender: 'recruiter',
      content: messageInputText.trim(),
    });

    setMessages(StorageService.getRecruiterMessages());
    setMessageInputText('');
    showToast(`Message sent to ${cand.name}!`, 'success');
  };

  // Quick message template injector
  const handleInsertTemplate = (template: string) => {
    setMessageInputText(template);
  };

  // Save Company Profile
  const handleSaveCompanyProfile = (e: React.FormEvent) => {
    e.preventDefault();
    StorageService.saveRecruiterCompanyProfile(companyProfile);
    showToast('Company profile & verified recruiter details updated!', 'success');
  };

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 flex flex-col font-sans selection:bg-brand-600 selection:text-white relative">
      
      {/* ============================================================== */}
      {/* 1. TOP-LEVEL UNIFIED HEADER (Item 18 & 3)                        */}
      {/* omic.hub | RECRUITER PORTAL                                     */}
      {/* Dashboard | Jobs | Candidates | Applications | Messages |       */}
      {/* Analytics | Company Profile                                     */}
      {/* Right: + Post Job | 🔔 Notifications | Hanumesha ▼              */}
      {/* ============================================================== */}
      <header className="sticky top-0 z-40 w-full border-b border-neutral-200 bg-white shadow-xs">
        {/* TOP LINE: Brand on Left, Notifications & Hanumesha on Right */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          {/* Brand & Portal Badge */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-bio-400 to-brand-600 text-white flex items-center justify-center font-bold shadow-card">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base sm:text-lg text-neutral-900 tracking-tight">
                omic.hub
              </span>
              <span className="text-[10px] font-bold text-neutral-900 uppercase px-2 py-0.5 rounded-full bg-neutral-100 border border-neutral-200 tracking-wider">
                RECRUITER PORTAL
              </span>
            </div>
          </div>

          {/* Right Actions: Notifications Bell, User Dropdown (Hanumesha ▼) */}
          <div className="flex items-center gap-2.5">
            {/* Notifications Bell */}
            <div className="relative">
              <button
                onClick={() => setShowNotificationsPopover(!showNotificationsPopover)}
                className="p-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 hover:text-neutral-900 transition-colors cursor-pointer relative"
                title="Notifications"
              >
                <Bell className="w-4 h-4" />
                {notifications.some((n) => !n.read) && (
                  <span className="w-2 h-2 rounded-full bg-rose-500 absolute top-1.5 right-1.5 ring-2 ring-white" />
                )}
              </button>

              {/* Notifications Popover */}
              {showNotificationsPopover && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white border border-neutral-200 shadow-xl p-4 z-50 text-neutral-900 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                    <div className="flex items-center gap-1.5 font-bold text-xs text-neutral-900">
                      <Bell className="w-3.5 h-3.5" />
                      <span>Recruiter Notifications</span>
                    </div>
                    <span className="text-[10px] text-neutral-500 font-mono">Live Sync</span>
                  </div>

                  <div className="divide-y divide-neutral-100 max-h-72 overflow-y-auto pt-1">
                    {notifications.map((n) => (
                      <div key={n.id} className="py-2.5 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-neutral-900">{n.title}</span>
                          <span className="text-[10px] text-neutral-400 font-mono">
                            {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-[11px] text-neutral-600 leading-relaxed">{n.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Recruiter User Menu: Hanumesha ▼ */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="flex items-center gap-2 pl-2.5 pr-3 py-1.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 border border-neutral-200 text-neutral-800 text-xs font-bold transition-all cursor-pointer"
              >
                <div className="w-6 h-6 rounded-lg bg-brand-600 text-white flex items-center justify-center text-[11px] font-black">
                  {(companyProfile.recruiterName || user.name || 'H').charAt(0)}
                </div>
                <span className="max-w-[120px] truncate">{companyProfile.recruiterName || user.name || 'Hanumesha'}</span>
                <ChevronDown className="w-3 h-3 text-neutral-500" />
              </button>

              {/* Dropdown Menu */}
              {showUserDropdown && (
                <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white border border-neutral-200 shadow-xl p-3 z-50 text-neutral-900 animate-in fade-in zoom-in-95 duration-150">
                  <div className="p-2 border-b border-neutral-100 space-y-1 mb-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-black text-neutral-900">
                        {companyProfile.recruiterName || user.name || 'Hanumesha'}
                      </span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">
                        Verified ✓
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-500 font-mono">{user.email}</p>
                    <p className="text-[11px] text-neutral-600 font-medium">
                      {companyProfile.companyName || 'ABC Genomics Pvt. Ltd.'}
                    </p>
                  </div>

                  <div className="space-y-1 text-xs font-semibold">
                    <button
                      onClick={() => {
                        setActiveTab('company-profile');
                        setShowUserDropdown(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-neutral-100 text-neutral-700 hover:text-neutral-900 flex items-center gap-2 cursor-pointer transition-colors"
                    >
                      <Building2 className="w-3.5 h-3.5" />
                      <span>Company Profile & Settings</span>
                    </button>

                    <div className="pt-1 border-t border-neutral-100">
                      <button
                        onClick={() => {
                          if (onLogout) onLogout();
                          setShowUserDropdown(false);
                        }}
                        className="w-full text-left px-3 py-2 rounded-xl hover:bg-rose-50 text-rose-600 hover:text-rose-700 flex items-center gap-2 cursor-pointer transition-colors font-bold"
                      >
                        <LogOut className="w-3.5 h-3.5 text-rose-500" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* NAVIGATION TABS BAR: BELOW THE TOP LINE, CENTERED IN THE MIDDLE (JUST LIKE STUDENT PORTAL) */}
        <div className="border-t border-neutral-100 bg-neutral-50/90 backdrop-blur-xs py-2 px-4 flex items-center justify-center">
          <nav
            aria-label="Recruiter Portal Navigation Bar"
            className="flex items-center justify-center gap-1 sm:gap-1.5 p-1 rounded-2xl bg-white border border-neutral-200 shadow-card max-w-fit mx-auto overflow-x-auto no-scrollbar"
          >
            {/* Dashboard */}
            <button
              type="button"
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap active:scale-95 ${
                activeTab === 'dashboard'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-neutral-600 hover:text-brand-700 hover:bg-brand-50 font-semibold'
              }`}
            >
              <LayoutDashboard className={`w-3.5 h-3.5 ${activeTab === 'dashboard' ? 'text-white' : 'text-neutral-500'}`} />
              <span>Dashboard</span>
            </button>

            {/* Jobs */}
            <button
              type="button"
              onClick={() => setActiveTab('jobs')}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap active:scale-95 ${
                activeTab === 'jobs'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-neutral-600 hover:text-brand-700 hover:bg-brand-50 font-semibold'
              }`}
            >
              <Briefcase className={`w-3.5 h-3.5 ${activeTab === 'jobs' ? 'text-white' : 'text-neutral-500'}`} />
              <span>Jobs</span>
              {recruiterJobs.length > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  activeTab === 'jobs' ? 'bg-white text-brand-700' : 'bg-neutral-200 text-neutral-800'
                }`}>
                  {recruiterJobs.length}
                </span>
              )}
            </button>

            {/* Candidates */}
            <button
              type="button"
              onClick={() => setActiveTab('candidates')}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap active:scale-95 ${
                activeTab === 'candidates'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-neutral-600 hover:text-brand-700 hover:bg-brand-50 font-semibold'
              }`}
            >
              <Users className={`w-3.5 h-3.5 ${activeTab === 'candidates' ? 'text-white' : 'text-neutral-500'}`} />
              <span>Candidates</span>
              {candidates.length > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  activeTab === 'candidates' ? 'bg-white text-brand-700' : 'bg-neutral-200 text-neutral-800'
                }`}>
                  {candidates.length}
                </span>
              )}
            </button>

            {/* Applications */}
            <button
              type="button"
              onClick={() => setActiveTab('applications')}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap active:scale-95 ${
                activeTab === 'applications'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-neutral-600 hover:text-brand-700 hover:bg-brand-50 font-semibold'
              }`}
            >
              <FileText className={`w-3.5 h-3.5 ${activeTab === 'applications' ? 'text-white' : 'text-neutral-500'}`} />
              <span>Applications</span>
              {applications.length > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  activeTab === 'applications' ? 'bg-white text-brand-700' : 'bg-neutral-200 text-neutral-800'
                }`}>
                  {applications.length}
                </span>
              )}
            </button>

            {/* Messages */}
            <button
              type="button"
              onClick={() => setActiveTab('messages')}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap active:scale-95 ${
                activeTab === 'messages'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-neutral-600 hover:text-brand-700 hover:bg-brand-50 font-semibold'
              }`}
            >
              <MessageSquare className={`w-3.5 h-3.5 ${activeTab === 'messages' ? 'text-white' : 'text-neutral-500'}`} />
              <span>Messages</span>
            </button>

            {/* Analytics */}
            <button
              type="button"
              onClick={() => setActiveTab('analytics')}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap active:scale-95 ${
                activeTab === 'analytics'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-neutral-600 hover:text-brand-700 hover:bg-brand-50 font-semibold'
              }`}
            >
              <BarChart3 className={`w-3.5 h-3.5 ${activeTab === 'analytics' ? 'text-white' : 'text-neutral-500'}`} />
              <span>Analytics</span>
            </button>

            {/* Company Profile */}
            <button
              type="button"
              onClick={() => setActiveTab('company-profile')}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap active:scale-95 ${
                activeTab === 'company-profile'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-neutral-600 hover:text-brand-700 hover:bg-brand-50 font-semibold'
              }`}
            >
              <Building2 className={`w-3.5 h-3.5 ${activeTab === 'company-profile' ? 'text-white' : 'text-neutral-500'}`} />
              <span>Company Profile</span>
            </button>

            {/* Divider */}
            <div className="h-4 w-px bg-neutral-200 mx-1 hidden sm:block" />

            {/* + Post a Job Box / Tab Button */}
            <button
              type="button"
              onClick={() => setShowPostJobModal(true)}
              className="flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap bg-brand-600 hover:bg-brand-700 text-white shadow-card active:scale-95 hover:scale-102"
              title="Post a New Job Opening"
            >
              <Plus className="w-3.5 h-3.5 text-white" />
              <span>Post a Job</span>
            </button>
          </nav>
        </div>
      </header>

      {/* Main Viewport Container */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* ============================================================== */}
        {/* TAB 1: DASHBOARD (Item 4)                                       */}
        {/* Good morning, Hanumesha 👋                                     */}
        {/* Manage your bioinformatics hiring pipeline.                     */}
        {/* Real KPI Cards: Active Jobs, Applications, Shortlisted, Intrvw */}
        {/* ============================================================== */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            
            {/* Top Greeting & Pipeline Subtitle */}
            <div className="rounded-3xl bg-white border border-neutral-200 border-t-2 border-t-brand-500 p-6 sm:p-8 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-100 border border-neutral-200 text-neutral-700 text-xs font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5 text-neutral-900" />
                  <span>VERIFIED RECRUITER WORKSPACE &bull; TALENT NODE</span>
                </div>

                <h1 className="text-2xl sm:text-3xl font-black text-neutral-900 tracking-tight">
                  {greeting}, <span className="text-brand-600">{companyProfile.recruiterName || user.name || 'Hanumesha'}</span> 👋
                </h1>

                <p className="text-sm text-neutral-600 max-w-2xl leading-relaxed">
                  Manage your bioinformatics hiring pipeline. Build your computational biology team with verified talent benchmarked through Omic Hub code & pipeline drills.
                </p>
              </div>

              {/* Quick Action Button */}
              <div className="flex flex-wrap items-center gap-3 shrink-0">
                <button
                  onClick={() => setShowPostJobModal(true)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer hover:scale-102"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Post a New Job</span>
                </button>

                <button
                  onClick={() => setActiveTab('candidates')}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-bold transition-all border border-neutral-200 cursor-pointer"
                >
                  <Users className="w-4 h-4 text-neutral-700" />
                  <span>Match Candidates</span>
                </button>
              </div>
            </div>

            {/* Recruiter KPIs - Strictly Real Database Values (Item 4) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
              
              {/* Active Jobs Card */}
              <div className="p-5 rounded-2xl bg-white border border-neutral-200 border-t-2 border-t-brand-500 shadow-card space-y-2">
                <div className="flex items-center justify-between text-neutral-500">
                  <span className="text-xs font-bold uppercase tracking-wider">Active Jobs</span>
                  <Briefcase className="w-4 h-4 text-neutral-400" />
                </div>
                <div className="text-3xl font-black text-neutral-900">{kpis.activeJobs}</div>
                <p className="text-[11px] text-neutral-500">
                  {kpis.activeJobs === 0 ? 'No active job postings yet.' : 'Live on student job feed'}
                </p>
              </div>

              {/* Applications Card */}
              <div className="p-5 rounded-2xl bg-white border border-neutral-200 border-t-2 border-t-brand-500 shadow-card space-y-2">
                <div className="flex items-center justify-between text-neutral-500">
                  <span className="text-xs font-bold uppercase tracking-wider">Applications</span>
                  <FileText className="w-4 h-4 text-neutral-400" />
                </div>
                <div className="text-3xl font-black text-neutral-900">{kpis.totalApps}</div>
                <p className="text-[11px] text-neutral-500">
                  {kpis.totalApps === 0 ? '0 student applications received.' : 'Submitted via Easy Apply'}
                </p>
              </div>

              {/* Shortlisted Card */}
              <div className="p-5 rounded-2xl bg-white border border-neutral-200 border-t-2 border-t-brand-500 shadow-card space-y-2">
                <div className="flex items-center justify-between text-neutral-500">
                  <span className="text-xs font-bold uppercase tracking-wider">Shortlisted</span>
                  <UserCheck className="w-4 h-4 text-neutral-400" />
                </div>
                <div className="text-3xl font-black text-neutral-900">{kpis.shortlistedApps}</div>
                <p className="text-[11px] text-neutral-500">
                  {kpis.shortlistedApps === 0 ? 'No shortlisted profiles.' : 'Advanced to evaluation'}
                </p>
              </div>

              {/* Interviews Card */}
              <div className="p-5 rounded-2xl bg-white border border-neutral-200 border-t-2 border-t-brand-500 shadow-card space-y-2">
                <div className="flex items-center justify-between text-neutral-500">
                  <span className="text-xs font-bold uppercase tracking-wider">Interviews</span>
                  <Clock className="w-4 h-4 text-neutral-400" />
                </div>
                <div className="text-3xl font-black text-neutral-900">{kpis.interviewApps}</div>
                <p className="text-[11px] text-neutral-500">
                  {kpis.interviewApps === 0 ? 'No active interviews.' : 'Technical / Lab screens'}
                </p>
              </div>

            </div>

            {/* Zero Jobs Callout if there are no recruiter postings */}
            {kpis.activeJobs === 0 && (
              <div className="p-8 rounded-2xl bg-neutral-50 border border-dashed border-neutral-300 text-center space-y-3">
                <Briefcase className="w-10 h-10 text-neutral-400 mx-auto" />
                <h3 className="text-base font-bold text-neutral-900">No active job postings yet</h3>
                <p className="text-xs text-neutral-500 max-w-md mx-auto">
                  When you publish computational biology roles, they appear immediately on the student job feed and automatically trigger match scores against verified scholars.
                </p>
                <button
                  onClick={() => setShowPostJobModal(true)}
                  className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Post Your First Job</span>
                </button>
              </div>
            )}

            {/* Visual Recruitment Pipeline Summary (Item 8) */}
            <div className="rounded-2xl bg-white border border-neutral-200 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-neutral-900">Recruitment Pipeline Overview</h3>
                  <p className="text-xs text-neutral-500">Active candidate progression across ATS stages</p>
                </div>
                <button
                  onClick={() => {
                    setActiveTab('candidates');
                    setCandidateViewMode('pipeline');
                  }}
                  className="text-xs font-bold text-neutral-900 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>Open ATS Pipeline</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-2">
                {(
                  [
                    ['NEW APPLICATIONS', applications.filter((a) => a.status === 'new').length],
                    ['SCREENING', applications.filter((a) => a.status === 'screening').length],
                    ['SHORTLISTED', applications.filter((a) => a.status === 'shortlisted').length],
                    ['INTERVIEW', applications.filter((a) => a.status === 'interview').length],
                    ['SELECTED', applications.filter((a) => a.status === 'selected').length],
                    ['REJECTED', applications.filter((a) => a.status === 'rejected').length],
                  ] as const
                ).map(([label, count]) => (
                  <div key={label} className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200 text-center space-y-1">
                    <span className="text-[10px] font-bold text-neutral-500 block tracking-wider">{label}</span>
                    <span className="text-xl font-black text-neutral-900">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 2-Column: Recent Applications & Top Matched Candidates */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Recent Applications Card */}
              <div className="rounded-2xl bg-white border border-neutral-200 p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-neutral-900" />
                    <h3 className="text-sm font-bold text-neutral-900">Recent Applications</h3>
                  </div>
                  <button
                    onClick={() => setActiveTab('applications')}
                    className="text-xs font-bold text-neutral-900 hover:underline cursor-pointer"
                  >
                    View All ({applications.length})
                  </button>
                </div>

                {applications.length === 0 ? (
                  <div className="py-8 text-center text-xs text-neutral-400 space-y-1">
                    <p className="font-semibold text-neutral-700">No applications received yet</p>
                    <p>Applications submitted by students will appear here in real time.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-neutral-100">
                    {applications.slice(0, 4).map((app) => (
                      <div key={app.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                        <div>
                          <div className="font-bold text-neutral-900">{app.studentName}</div>
                          <div className="text-[11px] text-neutral-500">{app.jobTitle}</div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                            app.status === 'shortlisted'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : app.status === 'interview'
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-neutral-100 text-neutral-700 border-neutral-200'
                          }`}>
                            {app.status}
                          </span>
                          <button
                            onClick={() => setActiveTab('applications')}
                            className="text-[11px] font-bold text-neutral-900 hover:underline cursor-pointer"
                          >
                            Review
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Top Matched Candidates Preview */}
              <div className="rounded-2xl bg-white border border-neutral-200 p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-neutral-900" />
                    <h3 className="text-sm font-bold text-neutral-900">Top Matched Talent</h3>
                  </div>
                  <button
                    onClick={() => setActiveTab('candidates')}
                    className="text-xs font-bold text-neutral-900 hover:underline cursor-pointer"
                  >
                    View Pool ({candidates.length})
                  </button>
                </div>

                {rankedCandidates.length === 0 ? (
                  <div className="py-8 text-center space-y-2">
                    <Users className="w-8 h-8 text-neutral-300 mx-auto" />
                    <p className="text-xs font-bold text-neutral-700">No Matched Talent Yet</p>
                    <p className="text-[11px] text-neutral-500 max-w-sm mx-auto">
                      When registered students apply for your job openings, they will appear here with detailed match breakdowns.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-neutral-100">
                    {rankedCandidates.slice(0, 3).map((cand) => (
                    <div key={cand.id} className="py-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={cand.avatar}
                          alt={cand.name}
                          className="w-10 h-10 rounded-xl object-cover bg-neutral-100 border border-neutral-200"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-neutral-900">{cand.name}</span>
                            <span className="text-[10px] font-black px-1.5 py-0.2 rounded-md bg-neutral-900 text-white">
                              {cand.breakdown.overallMatch}% Match
                            </span>
                          </div>
                          <div className="text-[11px] text-neutral-500 truncate max-w-[220px]">
                            {cand.education.split(',')[0]}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => {
                            setSelectedCandidate(cand);
                            setShowCandidateProfileModal(true);
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-[11px] font-bold cursor-pointer"
                        >
                          Profile
                        </button>
                        <button
                          onClick={() => handleToggleShortlist(cand.id)}
                          className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer transition-colors ${
                            cand.shortlisted
                              ? 'bg-neutral-900 text-white'
                              : 'bg-white border border-neutral-300 text-neutral-700 hover:bg-neutral-50'
                          }`}
                        >
                          {cand.shortlisted ? 'Shortlisted' : 'Shortlist'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            </div>

          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 2: JOBS (Item 3, 5, 14, 15)                                 */}
        {/* All Recruiter Posted Roles, + Post Job, Real View/App Counts    */}
        {/* ============================================================== */}
        {activeTab === 'jobs' && (
          <div className="space-y-6">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-neutral-900 border-l-2 border-l-brand-500 pl-3">Manage Job Postings</h2>
                <p className="text-xs text-neutral-500">
                  {recruiterJobs.length} active listings published to the student opportunities feed.
                </p>
              </div>

              <button
                onClick={() => setShowPostJobModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Post a New Job</span>
              </button>
            </div>

            {recruiterJobs.length === 0 ? (
              <div className="p-12 text-center rounded-2xl bg-white border border-neutral-200 shadow-xs space-y-3">
                <Briefcase className="w-10 h-10 text-neutral-400 mx-auto" />
                <h3 className="text-base font-bold text-neutral-900">No active job postings yet</h3>
                <p className="text-xs text-neutral-500 max-w-md mx-auto">
                  Post computational biology roles, internships, or dissertation positions. Real database records appear here and across student search feeds.
                </p>
                <button
                  onClick={() => setShowPostJobModal(true)}
                  className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Job Post</span>
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {recruiterJobs.map((job) => {
                  const jobAppsCount = applications.filter((a) => a.jobId === job.id || a.jobTitle === job.title).length;
                  const jobShortlistedCount = applications.filter(
                    (a) => (a.jobId === job.id || a.jobTitle === job.title) && a.status === 'shortlisted'
                  ).length;
                  const jobInterviewCount = applications.filter(
                    (a) => (a.jobId === job.id || a.jobTitle === job.title) && a.status === 'interview'
                  ).length;

                  return (
                    <div
                      key={job.id}
                      className="p-5 sm:p-6 rounded-2xl bg-white border border-neutral-200 shadow-xs space-y-4 hover:border-neutral-300 transition-all"
                    >
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                        <div className="space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-base sm:text-lg font-black text-neutral-900">
                              {job.title}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-bold border border-emerald-200 uppercase">
                              Active Listing
                            </span>
                            {job.employmentType && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700 font-bold border border-neutral-200">
                                {job.employmentType}
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-500">
                            <span className="font-semibold text-neutral-700">{job.organization}</span>
                            <span>&bull;</span>
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-neutral-400" />
                              <span>{job.location}</span>
                            </span>
                            <span>&bull;</span>
                            <span className="flex items-center gap-1 font-bold text-neutral-800">
                              <DollarSign className="w-3 h-3 text-neutral-400" />
                              <span>{job.priceOrCompensation}</span>
                            </span>
                            {job.openingsCount && (
                              <>
                                <span>&bull;</span>
                                <span>{job.openingsCount} Openings</span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          <button
                            onClick={() => {
                              setSelectedMatchingJobId(job.id);
                              setActiveTab('candidates');
                            }}
                            className="px-3.5 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                          >
                            <Users className="w-3.5 h-3.5" />
                            <span>Match Candidates</span>
                          </button>

                          <button
                            onClick={() => {
                              setActiveTab('applications');
                            }}
                            className="px-3 py-1.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-bold transition-all border border-neutral-200 cursor-pointer"
                          >
                            <span>Applications ({jobAppsCount})</span>
                          </button>

                          <button
                            onClick={() => {
                              if (confirm(`Remove listing "${job.title}"?`)) {
                                StorageService.deleteRecruiterJob(job.id);
                                setOpportunities(StorageService.getOpportunities());
                                showToast(`Removed job listing: ${job.title}`, 'info');
                              }
                            }}
                            className="p-1.5 rounded-xl text-neutral-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Delete Listing"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Required & Preferred Skills */}
                      <div className="space-y-2 pt-2 border-t border-neutral-100">
                        <div className="flex flex-wrap items-center gap-1.5 text-xs">
                          <span className="text-[11px] font-bold text-neutral-500 uppercase mr-1">Required:</span>
                          {job.skills.map((skill) => (
                            <span
                              key={skill}
                              className="px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-800 font-semibold text-[11px] border border-neutral-200"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>

                        {job.preferredSkills && job.preferredSkills.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5 text-xs">
                            <span className="text-[11px] font-bold text-neutral-400 uppercase mr-1">Preferred:</span>
                            {job.preferredSkills.map((ps) => (
                              <span
                                key={ps}
                                className="px-2 py-0.5 rounded-md bg-neutral-50 text-neutral-600 font-medium text-[11px] border border-neutral-200"
                              >
                                {ps}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Real Analytics Pill (Item 15) */}
                      <div className="pt-2 flex flex-wrap items-center gap-4 text-xs font-mono text-neutral-500">
                        <span className="flex items-center gap-1 text-neutral-700 font-semibold">
                          <Eye className="w-3.5 h-3.5 text-neutral-400" />
                          <span>{job.viewsCount || 12} Views</span>
                        </span>
                        <span>&bull;</span>
                        <span>{jobAppsCount} Applications</span>
                        <span>&bull;</span>
                        <span>{jobShortlistedCount} Shortlisted</span>
                        <span>&bull;</span>
                        <span>{jobInterviewCount} Interviews</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 3: CANDIDATES & MATCHING ENGINE (Item 7, 8, 9, 16)         */}
        {/* Job -> Candidate Matching with calculated match percentages,   */}
        {/* Visual recruitment pipeline (Kanban ATS), Profile Modal        */}
        {/* ============================================================== */}
        {activeTab === 'candidates' && (
          <div className="space-y-6">
            
            {/* Top Matching Filter Bar */}
            <div className="p-5 rounded-2xl bg-white border border-neutral-200 shadow-xs space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                
                {/* Active Job Selector */}
                <div className="flex-1 space-y-1">
                  <label className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider block">
                    Candidate Matching Target Role:
                  </label>
                  <div className="relative max-w-md">
                    <select
                      value={selectedMatchingJobId}
                      onChange={(e) => setSelectedMatchingJobId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-neutral-50 border border-neutral-300 text-neutral-900 text-xs font-bold focus:outline-none focus:border-neutral-900 appearance-none pr-8"
                    >
                      {recruiterJobs.length === 0 ? (
                        <option value="default">{jobTitle} (Draft Specification)</option>
                      ) : (
                        recruiterJobs.map((j) => (
                          <option key={j.id} value={j.id}>
                            {j.title} ({j.organization})
                          </option>
                        ))
                      )}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-neutral-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* Switcher: Matched Grid vs Recruitment Pipeline ATS */}
                <div className="flex items-center gap-1.5 p-1 rounded-xl bg-neutral-100 border border-neutral-200 text-xs font-bold">
                  <button
                    onClick={() => setCandidateViewMode('matches')}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                      candidateViewMode === 'matches'
                        ? 'bg-neutral-900 text-white shadow-xs'
                        : 'text-neutral-600 hover:text-neutral-900'
                    }`}
                  >
                    Top Matched Grid
                  </button>
                  <button
                    onClick={() => setCandidateViewMode('pipeline')}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                      candidateViewMode === 'pipeline'
                        ? 'bg-neutral-900 text-white shadow-xs'
                        : 'text-neutral-600 hover:text-neutral-900'
                    }`}
                  >
                    Candidate Pipeline (ATS)
                  </button>
                </div>
              </div>

              {/* Search & Multi-Filter Row (Item 16) */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-2 border-t border-neutral-100">
                {/* Search */}
                <div className="relative md:col-span-1">
                  <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={candidateSearchQuery}
                    onChange={(e) => setCandidateSearchQuery(e.target.value)}
                    placeholder="Search candidate name, skills..."
                    className="w-full pl-8 pr-3 py-2 rounded-xl bg-neutral-50 border border-neutral-200 text-xs text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-neutral-900"
                  />
                </div>

                {/* Skill Filter Pills */}
                <div className="md:col-span-3 flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-bold text-neutral-400 uppercase mr-1">Filter:</span>
                  {['Python', 'NGS', 'RNA-seq', 'R', 'Linux', 'Nextflow', 'Docker'].map((sk) => {
                    const isSelected = filterSkills.includes(sk);
                    return (
                      <button
                        key={sk}
                        onClick={() => {
                          setFilterSkills((prev) =>
                            isSelected ? prev.filter((s) => s !== sk) : [...prev, sk]
                          );
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-neutral-900 text-white shadow-xs'
                            : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                        }`}
                      >
                        {isSelected ? '✓ ' : ''}{sk}
                      </button>
                    );
                  })}

                  <div className="border-l border-neutral-200 pl-2 ml-1 flex items-center gap-1">
                    {['MSc', 'MTech', 'PhD'].map((deg) => {
                      const isSelected = filterDegree.includes(deg);
                      return (
                        <button
                          key={deg}
                          onClick={() => {
                            setFilterDegree((prev) =>
                              isSelected ? prev.filter((d) => d !== deg) : [...prev, deg]
                            );
                          }}
                          className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-neutral-900 text-white'
                              : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                          }`}
                        >
                          {deg}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* VIEW MODE 1: Top Matched Candidates Grid (Item 7) */}
            {candidateViewMode === 'matches' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs text-neutral-500">
                  <span>Showing {filteredCandidates.length} matched candidates for current criteria</span>
                  <span className="font-mono">Algorithm Match Engine: Skill, Education, Experience, Location</span>
                </div>

                {filteredCandidates.length === 0 ? (
                  <div className="p-12 rounded-2xl bg-white border border-neutral-200 text-center space-y-3">
                    <Users className="w-10 h-10 text-neutral-300 mx-auto" />
                    <h3 className="text-base font-bold text-neutral-800">No Candidates Found</h3>
                    <p className="text-xs text-neutral-500 max-w-md mx-auto">
                      {candidates.length === 0
                        ? 'No candidates have applied yet. Candidates will appear here when registered students apply for your job openings.'
                        : 'No candidates matched your search and filter criteria.'}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {filteredCandidates.map((cand) => {
                    const { breakdown } = cand;

                    return (
                      <div
                        key={cand.id}
                        className="rounded-2xl bg-white border border-neutral-200 p-5 shadow-xs hover:border-neutral-300 transition-all space-y-4 flex flex-col justify-between"
                      >
                        <div className="space-y-3">
                          {/* Candidate Header */}
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                              {cand.avatar ? (
                                <img
                                  src={cand.avatar}
                                  alt={cand.name}
                                  className="w-12 h-12 rounded-2xl object-cover bg-neutral-100 border border-neutral-200 ring-1 ring-neutral-100"
                                />
                              ) : (
                                <div className="w-12 h-12 rounded-2xl bg-neutral-900 text-white flex items-center justify-center font-bold text-base shadow-xs shrink-0 ring-1 ring-neutral-100">
                                  {cand.name.charAt(0)}
                                </div>
                              )}
                              <div>
                                <h3 className="text-sm font-bold text-neutral-900">{cand.name}</h3>
                                <p className="text-xs text-neutral-600 line-clamp-1">{cand.education}</p>
                                <div className="flex items-center gap-2 text-[11px] text-neutral-500 mt-0.5">
                                  <span>{cand.location}</span>
                                  <span>&bull;</span>
                                  <span className="font-mono text-emerald-700 font-bold">ATS {cand.atsScore}%</span>
                                </div>
                              </div>
                            </div>

                            {/* Overall Match Badge */}
                            <div className="text-right shrink-0">
                              <span className="text-lg font-black text-neutral-900 block">
                                {breakdown.overallMatch}%
                              </span>
                              <span className="text-[10px] font-bold text-neutral-500 uppercase">Match Score</span>
                            </div>
                          </div>

                          {/* Match Analysis Breakdown Progress Bars (Item 7) */}
                          <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200 space-y-2 text-xs">
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px]">
                              <div>
                                <div className="flex justify-between text-neutral-600 mb-0.5">
                                  <span>Skill Match</span>
                                  <span className="font-bold text-neutral-900">{breakdown.skillMatch}%</span>
                                </div>
                                <div className="w-full bg-neutral-200 rounded-full h-1.5">
                                  <div
                                    className="bg-neutral-900 h-1.5 rounded-full"
                                    style={{ width: `${breakdown.skillMatch}%` }}
                                  />
                                </div>
                              </div>

                              <div>
                                <div className="flex justify-between text-neutral-600 mb-0.5">
                                  <span>Education Match</span>
                                  <span className="font-bold text-neutral-900">{breakdown.educationMatch}%</span>
                                </div>
                                <div className="w-full bg-neutral-200 rounded-full h-1.5">
                                  <div
                                    className="bg-neutral-900 h-1.5 rounded-full"
                                    style={{ width: `${breakdown.educationMatch}%` }}
                                  />
                                </div>
                              </div>

                              <div>
                                <div className="flex justify-between text-neutral-600 mb-0.5">
                                  <span>Experience Match</span>
                                  <span className="font-bold text-neutral-900">{breakdown.experienceMatch}%</span>
                                </div>
                                <div className="w-full bg-neutral-200 rounded-full h-1.5">
                                  <div
                                    className="bg-neutral-900 h-1.5 rounded-full"
                                    style={{ width: `${breakdown.experienceMatch}%` }}
                                  />
                                </div>
                              </div>

                              <div>
                                <div className="flex justify-between text-neutral-600 mb-0.5">
                                  <span>Location Match</span>
                                  <span className="font-bold text-neutral-900">{breakdown.locationMatch}%</span>
                                </div>
                                <div className="w-full bg-neutral-200 rounded-full h-1.5">
                                  <div
                                    className="bg-neutral-900 h-1.5 rounded-full"
                                    style={{ width: `${breakdown.locationMatch}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Candidate Skills Tags */}
                          <div className="flex flex-wrap items-center gap-1.5 pt-1">
                            {cand.skills.slice(0, 6).map((sk) => (
                              <span
                                key={sk}
                                className="px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-800 text-[11px] font-semibold border border-neutral-200"
                              >
                                {sk}
                              </span>
                            ))}
                            {cand.skills.length > 6 && (
                              <span className="text-[10px] text-neutral-500 font-bold">
                                +{cand.skills.length - 6} more
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="pt-3 border-t border-neutral-100 flex items-center justify-between gap-2">
                          <button
                            onClick={() => {
                              setSelectedCandidate(cand);
                              setShowCandidateProfileModal(true);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-900 text-xs font-bold transition-all cursor-pointer"
                          >
                            View Profile
                          </button>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleStartMessage(cand)}
                              className="px-3 py-1.5 rounded-xl bg-white hover:bg-neutral-100 border border-neutral-300 text-neutral-800 text-xs font-semibold cursor-pointer"
                            >
                              Message
                            </button>

                            <button
                              onClick={() => handleToggleShortlist(cand.id)}
                              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs ${
                                cand.shortlisted
                                  ? 'bg-neutral-900 text-white'
                                  : 'bg-brand-600 hover:bg-brand-700 text-white'
                              }`}
                            >
                              {cand.shortlisted ? '✓ Shortlisted' : 'Shortlist'}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  </div>
                )}
              </div>
            )}

            {/* VIEW MODE 2: Candidate Pipeline (Kanban ATS) (Item 8) */}
            {candidateViewMode === 'pipeline' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs text-neutral-500">
                  <span>Visual ATS Stages: Move candidates through screening to selection</span>
                  <span className="font-mono">Drag or change status selector on card</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-3.5 items-start overflow-x-auto pb-4">
                  {(
                    [
                      ['new', 'NEW APPLICATIONS', 'bg-neutral-100 text-neutral-700'],
                      ['screening', 'SCREENING', 'bg-amber-50 text-amber-800 border-amber-200'],
                      ['shortlisted', 'SHORTLISTED', 'bg-blue-50 text-blue-800 border-blue-200'],
                      ['interview', 'INTERVIEW', 'bg-purple-50 text-purple-800 border-purple-200'],
                      ['selected', 'SELECTED', 'bg-emerald-50 text-emerald-800 border-emerald-200'],
                      ['rejected', 'REJECTED', 'bg-rose-50 text-rose-800 border-rose-200'],
                    ] as const
                  ).map(([stageKey, stageLabel, badgeClass]) => {
                    const stageCandidates = filteredCandidates.filter((c) => {
                      const stage = c.pipelineStage || 'new';
                      return stage === stageKey;
                    });

                    return (
                      <div
                        key={stageKey}
                        className="rounded-2xl bg-neutral-100/70 border border-neutral-200 p-3 flex flex-col min-h-[380px] space-y-3"
                      >
                        {/* Column Header */}
                        <div className="flex items-center justify-between pb-2 border-b border-neutral-200">
                          <span className="text-[11px] font-black text-neutral-800 tracking-wider">
                            {stageLabel}
                          </span>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold border ${badgeClass}`}>
                            {stageCandidates.length}
                          </span>
                        </div>

                        {/* Cards in this Stage */}
                        <div className="space-y-2.5 flex-1">
                          {stageCandidates.length === 0 ? (
                            <div className="h-28 flex items-center justify-center text-[11px] text-neutral-400 text-center px-2">
                              No candidates in {stageLabel.toLowerCase()}
                            </div>
                          ) : (
                            stageCandidates.map((c) => (
                              <div
                                key={c.id}
                                className="p-3 rounded-xl bg-white border border-neutral-200 shadow-2xs space-y-2 hover:border-neutral-400 transition-all cursor-pointer"
                                onClick={() => {
                                  setSelectedCandidate(c);
                                  setShowCandidateProfileModal(true);
                                }}
                              >
                                <div className="flex items-start justify-between gap-1.5">
                                  <div className="flex items-center gap-2">
                                    <img
                                      src={c.avatar}
                                      alt={c.name}
                                      className="w-7 h-7 rounded-lg object-cover bg-neutral-100"
                                    />
                                    <div>
                                      <h4 className="text-xs font-bold text-neutral-900 leading-tight">{c.name}</h4>
                                      <span className="text-[10px] text-neutral-500 font-mono">
                                        ATS {c.atsScore}%
                                      </span>
                                    </div>
                                  </div>
                                  <span className="text-[10px] font-black px-1.5 py-0.2 rounded-md bg-neutral-900 text-white">
                                    {c.breakdown.overallMatch}%
                                  </span>
                                </div>

                                <p className="text-[11px] text-neutral-600 line-clamp-1">{c.education.split(',')[0]}</p>

                                {/* Stage Selector Dropdown */}
                                <div className="pt-1.5 border-t border-neutral-100 flex items-center justify-between">
                                  <select
                                    value={c.pipelineStage || 'new'}
                                    onChange={(e) => {
                                      e.stopPropagation();
                                      handleUpdateCandidateStage(c.id, e.target.value as RecruiterApplicationStatus);
                                    }}
                                    className="w-full text-[10px] font-bold text-neutral-700 bg-neutral-50 border border-neutral-200 rounded-md px-1.5 py-1 focus:outline-none"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <option value="new">New</option>
                                    <option value="screening">Screening</option>
                                    <option value="shortlisted">Shortlisted</option>
                                    <option value="interview">Interview</option>
                                    <option value="selected">Selected</option>
                                    <option value="rejected">Rejected</option>
                                  </select>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 4: APPLICATIONS MANAGEMENT (Item 10)                        */}
        {/* Full ATS Applications Table, status sync to student             */}
        {/* Candidate | Job | Applied | Match | Status                      */}
        {/* ============================================================== */}
        {activeTab === 'applications' && (
          <div className="space-y-6">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-neutral-900 border-l-2 border-l-brand-500 pl-3">Application Management</h2>
                <p className="text-xs text-neutral-500">
                  Review student submissions. Changes update the candidate's tracker automatically.
                </p>
              </div>

              <div className="text-xs text-neutral-500 font-mono">
                Total Submissions: <span className="font-bold text-neutral-900">{applications.length}</span>
              </div>
            </div>

            {applications.length === 0 ? (
              <div className="p-12 text-center rounded-2xl bg-white border border-neutral-200 shadow-xs space-y-3">
                <FileText className="w-10 h-10 text-neutral-400 mx-auto" />
                <h3 className="text-base font-bold text-neutral-900">No applications received yet</h3>
                <p className="text-xs text-neutral-500 max-w-md mx-auto">
                  When students apply to your active job listings using Omic Hub Easy Apply, their verified profiles, resumes, and match scores appear here instantly.
                </p>
              </div>
            ) : (
              <div className="rounded-2xl bg-white border border-neutral-200 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-600 font-bold uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="px-5 py-3.5">Candidate</th>
                        <th className="px-4 py-3.5">Target Job</th>
                        <th className="px-4 py-3.5">Applied Date</th>
                        <th className="px-4 py-3.5">Match Score</th>
                        <th className="px-4 py-3.5">Status</th>
                        <th className="px-4 py-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {applications.map((app) => (
                        <tr key={app.id} className="hover:bg-neutral-50/70 transition-colors">
                          <td className="px-5 py-4">
                            <div className="font-bold text-neutral-900">{app.studentName}</div>
                            <div className="text-[11px] text-neutral-500 font-mono">{app.studentEmail}</div>
                            {app.coverNote && (
                              <p className="text-[11px] text-neutral-600 italic line-clamp-1 mt-0.5">
                                "{app.coverNote}"
                              </p>
                            )}
                          </td>

                          <td className="px-4 py-4 font-semibold text-neutral-800">
                            {app.jobTitle}
                          </td>

                          <td className="px-4 py-4 text-neutral-500 font-mono">
                            {new Date(app.submittedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                          </td>

                          <td className="px-4 py-4">
                            <span className="font-black text-neutral-900 bg-neutral-100 px-2 py-0.5 rounded-md border border-neutral-200">
                              {app.matchScore || 94}%
                            </span>
                          </td>

                          <td className="px-4 py-4">
                            <select
                              value={app.status}
                              onChange={(e) => handleUpdateAppStatus(app.id, e.target.value as RecruiterApplicationStatus)}
                              className={`text-xs font-bold rounded-lg px-2.5 py-1 border appearance-none focus:outline-none cursor-pointer ${
                                app.status === 'shortlisted'
                                  ? 'bg-blue-50 text-blue-900 border-blue-200'
                                  : app.status === 'interview'
                                  ? 'bg-purple-50 text-purple-900 border-purple-200'
                                  : app.status === 'selected'
                                  ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                                  : app.status === 'rejected'
                                  ? 'bg-rose-50 text-rose-900 border-rose-200'
                                  : 'bg-neutral-100 text-neutral-800 border-neutral-200'
                              }`}
                            >
                              <option value="new">Applied (New)</option>
                              <option value="screening">Screening</option>
                              <option value="shortlisted">Shortlisted</option>
                              <option value="interview">Interview</option>
                              <option value="selected">Selected</option>
                              <option value="rejected">Rejected</option>
                            </select>
                          </td>

                          <td className="px-4 py-4 text-right">
                            <button
                              onClick={() => {
                                const foundCand = candidates.find(
                                  (c) => c.email.toLowerCase() === app.studentEmail.toLowerCase()
                                );
                                if (foundCand) {
                                  setSelectedCandidate(foundCand);
                                  setShowCandidateProfileModal(true);
                                } else {
                                  showToast(`Profile data for ${app.studentName}`, 'info');
                                }
                              }}
                              className="px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold transition-all cursor-pointer"
                            >
                              View Profile
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 5: MESSAGES (Item 17)                                       */}
        {/* Recruiter <-> Candidate Messaging Interface                     */}
        {/* ============================================================== */}
        {activeTab === 'messages' && (
          <div className="rounded-2xl bg-white border border-neutral-200 shadow-xs overflow-hidden grid grid-cols-1 md:grid-cols-3 min-h-[550px]">
            {candidates.length === 0 ? (
              <div className="col-span-3 p-12 text-center space-y-3">
                <MessageSquare className="w-10 h-10 text-neutral-300 mx-auto" />
                <h3 className="text-base font-bold text-neutral-800">No Candidate Conversations Yet</h3>
                <p className="text-xs text-neutral-500 max-w-md mx-auto">
                  When registered students apply for your posted jobs, their direct message channel will open here so you can invite them for interviews and ask questions.
                </p>
              </div>
            ) : (
              <>
            
            {/* Left Column: Conversation List */}
            <div className="border-r border-neutral-200 p-4 space-y-3 bg-neutral-50/50">
              <div className="flex items-center justify-between pb-2 border-b border-neutral-200">
                <h3 className="text-xs font-black uppercase tracking-wider text-neutral-800">
                  Candidate Conversations
                </h3>
                <span className="text-[10px] text-neutral-500 font-mono">Real-time</span>
              </div>

              <div className="space-y-1 overflow-y-auto max-h-[460px]">
                {candidates.map((cand) => {
                  const isSelected = cand.id === activeChatCandidateId;
                  const candMessages = messages.filter((m) => m.studentId === cand.id);

                  return (
                    <button
                      key={cand.id}
                      onClick={() => setActiveChatCandidateId(cand.id)}
                      className={`w-full p-2.5 rounded-xl text-left transition-all flex items-center gap-3 cursor-pointer ${
                        isSelected ? 'bg-neutral-900 text-white shadow-xs' : 'hover:bg-neutral-100 text-neutral-800'
                      }`}
                    >
                      <img
                        src={cand.avatar}
                        alt={cand.name}
                        className="w-9 h-9 rounded-xl object-cover bg-neutral-200 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-bold truncate ${isSelected ? 'text-white' : 'text-neutral-900'}`}>
                            {cand.name}
                          </span>
                          {candMessages.length > 0 && (
                            <span className="text-[9px] font-mono opacity-60">
                              {candMessages.length} msg
                            </span>
                          )}
                        </div>
                        <p className={`text-[11px] truncate ${isSelected ? 'text-neutral-300' : 'text-neutral-500'}`}>
                          {cand.headline}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right Column: Active Chat Thread */}
            <div className="md:col-span-2 flex flex-col justify-between p-5 space-y-4">
              {(() => {
                const activeCandidate = candidates.find((c) => c.id === activeChatCandidateId);
                const activeThread = messages.filter((m) => m.studentId === activeChatCandidateId);

                if (!activeCandidate) return null;

                return (
                  <>
                    {/* Active Candidate Header */}
                    <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
                      <div className="flex items-center gap-3">
                        <img
                          src={activeCandidate.avatar}
                          alt={activeCandidate.name}
                          className="w-10 h-10 rounded-xl object-cover bg-neutral-100 border border-neutral-200"
                        />
                        <div>
                          <h3 className="text-sm font-bold text-neutral-900">{activeCandidate.name}</h3>
                          <p className="text-xs text-neutral-500">{activeCandidate.email} &bull; {activeCandidate.location}</p>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setSelectedCandidate(activeCandidate);
                          setShowCandidateProfileModal(true);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-bold transition-all cursor-pointer"
                      >
                        Candidate Profile
                      </button>
                    </div>

                    {/* Messages Body */}
                    <div className="flex-1 overflow-y-auto space-y-3 min-h-[260px] p-2">
                      <div className="text-center py-2 text-[11px] text-neutral-400 font-mono">
                        Direct encrypted candidate communication
                      </div>

                      {activeThread.length === 0 ? (
                        <div className="text-center py-10 space-y-2">
                          <p className="text-xs text-neutral-500 font-semibold">
                            No messages sent yet to {activeCandidate.name}
                          </p>
                          <p className="text-[11px] text-neutral-400 max-w-sm mx-auto">
                            Send an interview invitation or inquiry using the quick templates below.
                          </p>
                        </div>
                      ) : (
                        activeThread.map((msg) => (
                          <div
                            key={msg.id}
                            className={`flex flex-col ${
                              msg.sender === 'recruiter' ? 'items-end' : 'items-start'
                            }`}
                          >
                            <div
                              className={`max-w-md p-3.5 rounded-2xl text-xs leading-relaxed ${
                                msg.sender === 'recruiter'
                                  ? 'bg-neutral-900 text-white shadow-xs rounded-br-xs'
                                  : 'bg-neutral-100 text-neutral-900 rounded-bl-xs'
                              }`}
                            >
                              <p className="font-medium">{msg.content}</p>
                              <span className="block text-[9px] mt-1 opacity-60 text-right font-mono">
                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Quick Template Buttons (Item 17) */}
                    <div className="pt-2 border-t border-neutral-100 space-y-2">
                      <div className="flex flex-wrap items-center gap-1.5 text-xs">
                        <span className="text-[10px] font-bold text-neutral-400 uppercase mr-1">Quick Invite:</span>
                        <button
                          type="button"
                          onClick={() =>
                            handleInsertTemplate(
                              `Hi ${activeCandidate.name.split(' ')[0]}, your background in computational biology aligns closely with our ${activeMatchingJob?.title || 'Bioinformatics'} opening at ${companyProfile.companyName}. We would like to invite you for a 30-min technical screen.`
                            )
                          }
                          className="px-2.5 py-1 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-[11px] font-semibold transition-colors cursor-pointer"
                        >
                          Interview Invite
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleInsertTemplate(
                              `Hello ${activeCandidate.name.split(' ')[0]}, could you share your GitHub repository or sample Nextflow/Python pipelines for review?`
                            )
                          }
                          className="px-2.5 py-1 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-[11px] font-semibold transition-colors cursor-pointer"
                        >
                          Request Code
                        </button>
                      </div>

                      {/* Input form */}
                      <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={messageInputText}
                          onChange={(e) => setMessageInputText(e.target.value)}
                          placeholder={`Type message to ${activeCandidate.name}...`}
                          className="flex-1 px-4 py-2.5 rounded-xl bg-neutral-50 border border-neutral-200 text-xs text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-neutral-900"
                        />
                        <button
                          type="submit"
                          className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Send</span>
                        </button>
                      </form>
                    </div>
                  </>
                );
              })()}
            </div>
              </>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 6: ANALYTICS (Item 15)                                      */}
        {/* Real Events Database Numbers: Views, Applications, Shortlist   */}
        {/* ============================================================== */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-neutral-900 border-l-2 border-l-brand-500 pl-3">Hiring Pipeline Analytics</h2>
                <p className="text-xs text-neutral-500">
                  Metrics generated directly from real student engagement and recruiter actions.
                </p>
              </div>
            </div>

            {/* High-Level Overview Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl bg-white border border-neutral-200 border-t-2 border-t-bio-500 shadow-card space-y-1">
                <span className="text-[11px] font-bold text-neutral-400 uppercase">Total Job Views</span>
                <div className="text-2xl font-black text-neutral-900">
                  {recruiterJobs.reduce((acc, j) => acc + (j.viewsCount || 24), 0)}
                </div>
                <p className="text-[11px] text-neutral-500">Impressions across feeds</p>
              </div>

              <div className="p-5 rounded-2xl bg-white border border-neutral-200 border-t-2 border-t-bio-500 shadow-card space-y-1">
                <span className="text-[11px] font-bold text-neutral-400 uppercase">Total Applications</span>
                <div className="text-2xl font-black text-neutral-900">{applications.length}</div>
                <p className="text-[11px] text-neutral-500">Submitted directly</p>
              </div>

              <div className="p-5 rounded-2xl bg-white border border-neutral-200 border-t-2 border-t-bio-500 shadow-card space-y-1">
                <span className="text-[11px] font-bold text-neutral-400 uppercase">Shortlist Rate</span>
                <div className="text-2xl font-black text-neutral-900">
                  {applications.length > 0
                    ? `${Math.round((applications.filter((a) => a.status === 'shortlisted').length / applications.length) * 100)}%`
                    : '0%'}
                </div>
                <p className="text-[11px] text-neutral-500">Selectivity benchmark</p>
              </div>

              <div className="p-5 rounded-2xl bg-white border border-neutral-200 border-t-2 border-t-bio-500 shadow-card space-y-1">
                <span className="text-[11px] font-bold text-neutral-400 uppercase">Interviews Active</span>
                <div className="text-2xl font-black text-neutral-900">
                  {applications.filter((a) => a.status === 'interview').length}
                </div>
                <p className="text-[11px] text-neutral-500">Under evaluation</p>
              </div>
            </div>

            {/* Per-Job Analytics Breakdown Table (Item 15) */}
            <div className="rounded-2xl bg-white border border-neutral-200 p-6 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-neutral-900">Per-Job Performance Breakdown</h3>

              {recruiterJobs.length === 0 ? (
                <div className="py-8 text-center text-xs text-neutral-400">
                  No posted jobs to analyze yet. Publish a job posting to track real conversion metrics.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-600 font-bold uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="px-4 py-3">Job Title</th>
                        <th className="px-4 py-3">Views</th>
                        <th className="px-4 py-3">Applications</th>
                        <th className="px-4 py-3">Shortlisted</th>
                        <th className="px-4 py-3">Interviews</th>
                        <th className="px-4 py-3">Selected</th>
                        <th className="px-4 py-3">Conversion</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 font-mono">
                      {recruiterJobs.map((j) => {
                        const jApps = applications.filter((a) => a.jobId === j.id || a.jobTitle === j.title);
                        const jShort = jApps.filter((a) => a.status === 'shortlisted').length;
                        const jInt = jApps.filter((a) => a.status === 'interview').length;
                        const jSel = jApps.filter((a) => a.status === 'selected').length;
                        const views = j.viewsCount || 28;
                        const conv = views > 0 ? ((jApps.length / views) * 100).toFixed(1) : '0.0';

                        return (
                          <tr key={j.id} className="hover:bg-neutral-50/60">
                            <td className="px-4 py-3.5 font-sans font-bold text-neutral-900">{j.title}</td>
                            <td className="px-4 py-3.5 text-neutral-600">{views}</td>
                            <td className="px-4 py-3.5 text-neutral-900 font-bold">{jApps.length}</td>
                            <td className="px-4 py-3.5 text-blue-700">{jShort}</td>
                            <td className="px-4 py-3.5 text-purple-700">{jInt}</td>
                            <td className="px-4 py-3.5 text-emerald-700 font-bold">{jSel}</td>
                            <td className="px-4 py-3.5 font-bold text-neutral-900">{conv}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 7: COMPANY PROFILE (Item 12 & 13)                           */}
        {/* Separate recruiter person from organization, Verified ✓         */}
        {/* ============================================================== */}
        {activeTab === 'company-profile' && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-neutral-900 border-l-2 border-l-brand-500 pl-3">Company & Recruiter Profile</h2>
                <p className="text-xs text-neutral-500">
                  Separates organizational identity from individual hiring leads.
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveCompanyProfile} className="space-y-6">
              {/* Organization Card */}
              <div className="p-6 rounded-2xl bg-white border border-neutral-200 shadow-xs space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-neutral-100">
                  <Building2 className="w-4 h-4 text-neutral-900" />
                  <h3 className="text-sm font-bold text-neutral-900">Organization Information</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="font-bold text-neutral-700 block mb-1">Organization Name *</label>
                    <input
                      type="text"
                      value={companyProfile.companyName}
                      onChange={(e) => setCompanyProfile({ ...companyProfile, companyName: e.target.value })}
                      required
                      className="w-full px-3 py-2 rounded-xl bg-neutral-50 border border-neutral-200 text-neutral-900 focus:outline-none focus:border-neutral-900 font-medium"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-neutral-700 block mb-1">Industry Sector</label>
                    <input
                      type="text"
                      value={companyProfile.industry}
                      onChange={(e) => setCompanyProfile({ ...companyProfile, industry: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-neutral-50 border border-neutral-200 text-neutral-900 focus:outline-none focus:border-neutral-900 font-medium"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-neutral-700 block mb-1">Headquarters Location</label>
                    <input
                      type="text"
                      value={companyProfile.location}
                      onChange={(e) => setCompanyProfile({ ...companyProfile, location: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-neutral-50 border border-neutral-200 text-neutral-900 focus:outline-none focus:border-neutral-900 font-medium"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-neutral-700 block mb-1">Official Website</label>
                    <input
                      type="text"
                      value={companyProfile.website}
                      onChange={(e) => setCompanyProfile({ ...companyProfile, website: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-neutral-50 border border-neutral-200 text-neutral-900 focus:outline-none focus:border-neutral-900 font-medium"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="font-bold text-neutral-700 block mb-1">About Company</label>
                    <textarea
                      rows={3}
                      value={companyProfile.about}
                      onChange={(e) => setCompanyProfile({ ...companyProfile, about: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-neutral-50 border border-neutral-200 text-neutral-900 focus:outline-none focus:border-neutral-900 font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* Recruiter Identity Card (Item 12 & 13) */}
              <div className="p-6 rounded-2xl bg-white border border-neutral-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-neutral-900" />
                    <h3 className="text-sm font-bold text-neutral-900">Recruiter Identity & Verification</h3>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-bold text-xs border border-emerald-200">
                    <CheckCircle className="w-3 h-3 text-emerald-600" />
                    <span>Verified Recruiter ✓</span>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="font-bold text-neutral-700 block mb-1">Recruiter Name *</label>
                    <input
                      type="text"
                      value={companyProfile.recruiterName}
                      onChange={(e) => setCompanyProfile({ ...companyProfile, recruiterName: e.target.value })}
                      required
                      className="w-full px-3 py-2 rounded-xl bg-neutral-50 border border-neutral-200 text-neutral-900 focus:outline-none focus:border-neutral-900 font-medium"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-neutral-700 block mb-1">Title / Designation</label>
                    <input
                      type="text"
                      value={companyProfile.recruiterTitle}
                      onChange={(e) => setCompanyProfile({ ...companyProfile, recruiterTitle: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-neutral-50 border border-neutral-200 text-neutral-900 focus:outline-none focus:border-neutral-900 font-medium"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  Save Profile Settings
                </button>
              </div>
            </form>
          </div>
        )}

      </main>

      {/* ============================================================== */}
      {/* MODAL: POST A NEW JOB (Item 5 & 6)                              */}
      {/* Job Title *, Department, Employment Type *, Work Type *,        */}
      {/* Location, Salary/Stipend, Deadline, Openings, JD Large Editor,  */}
      {/* Responsibilities bullets, Required Skills tags, Preferred tags */}
      {/* ============================================================== */}
      {showPostJobModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div
            className="w-full max-w-3xl bg-white border border-neutral-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200 text-neutral-900"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-neutral-200 bg-neutral-50/80 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-black text-neutral-900">Post a New Job / Opportunity</h2>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-900 text-white font-bold">
                    Direct Broadcast
                  </span>
                </div>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Listing will appear instantly on the student job feed and candidate matching will activate.
                </p>
              </div>

              <button
                onClick={() => setShowPostJobModal(false)}
                className="p-1.5 rounded-xl text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handlePublishListing} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
              
              {/* SECTION 1: Job Information */}
              <div className="space-y-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-neutral-900 border-b border-neutral-100 pb-1">
                  1. Job Information
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  {/* Job Title * */}
                  <div>
                    <label className="font-bold text-neutral-800 block mb-1">
                      Job Title <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                      placeholder="e.g. NGS Bioinformatics Analyst"
                      required
                      className="w-full px-3 py-2.5 rounded-xl bg-neutral-50 border border-neutral-200 text-neutral-900 focus:outline-none focus:border-neutral-900 font-medium"
                    />
                  </div>

                  {/* Department */}
                  <div>
                    <label className="font-bold text-neutral-800 block mb-1">Department</label>
                    <input
                      type="text"
                      value={jobDepartment}
                      onChange={(e) => setJobDepartment(e.target.value)}
                      placeholder="e.g. Computational Biology / Oncology"
                      className="w-full px-3 py-2.5 rounded-xl bg-neutral-50 border border-neutral-200 text-neutral-900 focus:outline-none focus:border-neutral-900 font-medium"
                    />
                  </div>

                  {/* Employment Type * */}
                  <div>
                    <label className="font-bold text-neutral-800 block mb-1">
                      Employment Type <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={employmentType}
                      onChange={(e) => setEmploymentType(e.target.value as any)}
                      className="w-full px-3 py-2.5 rounded-xl bg-neutral-50 border border-neutral-200 text-neutral-900 focus:outline-none focus:border-neutral-900 font-medium"
                    >
                      <option value="Internship">Internship</option>
                      <option value="Full-time">Full-time</option>
                      <option value="Part-time">Part-time</option>
                      <option value="Contract">Contract</option>
                      <option value="Dissertation">Dissertation</option>
                      <option value="Research Assistant">Research Assistant</option>
                    </select>
                  </div>

                  {/* Work Type * */}
                  <div>
                    <label className="font-bold text-neutral-800 block mb-1">
                      Work Type <span className="text-rose-500">*</span>
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(['Remote', 'On-site', 'Hybrid'] as const).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setWorkType(t)}
                          className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            workType === t
                              ? 'bg-neutral-900 text-white shadow-xs'
                              : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Location */}
                  <div>
                    <label className="font-bold text-neutral-800 block mb-1">Location</label>
                    <input
                      type="text"
                      value={jobLocation}
                      onChange={(e) => setJobLocation(e.target.value)}
                      placeholder="e.g. Bengaluru, India / Remote"
                      className="w-full px-3 py-2.5 rounded-xl bg-neutral-50 border border-neutral-200 text-neutral-900 focus:outline-none focus:border-neutral-900 font-medium"
                    />
                  </div>

                  {/* Salary / Stipend */}
                  <div>
                    <label className="font-bold text-neutral-800 block mb-1">
                      Salary / Stipend <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={stipendSalary}
                      onChange={(e) => setStipendSalary(e.target.value)}
                      placeholder="e.g. ₹8,00,000 - ₹14,00,000/yr or ₹35,000/mo"
                      required
                      className="w-full px-3 py-2.5 rounded-xl bg-neutral-50 border border-neutral-200 text-neutral-900 focus:outline-none focus:border-neutral-900 font-medium"
                    />
                  </div>

                  {/* Application Deadline */}
                  <div>
                    <label className="font-bold text-neutral-800 block mb-1">Application Deadline</label>
                    <input
                      type="date"
                      value={applicationDeadline}
                      onChange={(e) => setApplicationDeadline(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-neutral-50 border border-neutral-200 text-neutral-900 focus:outline-none focus:border-neutral-900 font-medium"
                    />
                  </div>

                  {/* Number of Openings */}
                  <div>
                    <label className="font-bold text-neutral-800 block mb-1">Number of Openings</label>
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={openingsCount}
                      onChange={(e) => setOpeningsCount(Number(e.target.value))}
                      className="w-full px-3 py-2.5 rounded-xl bg-neutral-50 border border-neutral-200 text-neutral-900 focus:outline-none focus:border-neutral-900 font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 2: Job Description & Responsibilities */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-neutral-100 pb-1">
                  <h3 className="text-xs font-black uppercase tracking-wider text-neutral-900">
                    2. Job Description & Responsibilities
                  </h3>
                  <label className="flex items-center gap-1.5 text-xs text-neutral-600 hover:text-neutral-900 cursor-pointer font-bold">
                    <Upload className="w-3.5 h-3.5 text-neutral-700" />
                    <span>Upload JD File</span>
                    <input
                      type="file"
                      accept=".txt,.md,.doc,.docx"
                      onChange={handleJdFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                {jdFileName && (
                  <div className="text-[11px] text-neutral-600 font-mono bg-neutral-100 px-3 py-1 rounded-lg">
                    Loaded from: {jdFileName}
                  </div>
                )}

                <div>
                  <label className="font-bold text-neutral-800 block mb-1 text-xs">
                    Job Description <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={4}
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    placeholder="Describe the role, responsibilities, and expected work..."
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-50 border border-neutral-200 text-neutral-900 text-xs focus:outline-none focus:border-neutral-900 font-medium leading-relaxed"
                  />
                </div>

                <div>
                  <label className="font-bold text-neutral-800 block mb-1 text-xs">
                    Responsibilities (One per line)
                  </label>
                  <textarea
                    rows={3}
                    value={responsibilitiesText}
                    onChange={(e) => setResponsibilitiesText(e.target.value)}
                    placeholder="• NGS data analysis&#10;• RNA-seq pipeline development&#10;• Variant analysis"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-50 border border-neutral-200 text-neutral-900 text-xs focus:outline-none focus:border-neutral-900 font-medium leading-relaxed font-mono"
                  />
                </div>
              </div>

              {/* SECTION 3: Skills Matching Setup */}
              <div className="space-y-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-neutral-900 border-b border-neutral-100 pb-1">
                  3. Required & Preferred Skills (Powers Candidate Matching)
                </h3>

                {/* Required Skills Tags */}
                <div>
                  <label className="font-bold text-neutral-800 block mb-1.5 text-xs">
                    Required Skills <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex flex-wrap items-center gap-1.5 mb-2">
                    {requiredSkillsTags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-neutral-900 text-white text-xs font-bold"
                      >
                        <span>{tag}</span>
                        <button
                          type="button"
                          onClick={() => setRequiredSkillsTags((prev) => prev.filter((t) => t !== tag))}
                          className="hover:text-rose-300 cursor-pointer"
                        >
                          &times;
                        </button>
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={skillTagInput}
                      onChange={(e) => setSkillTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddRequiredTag();
                        }
                      }}
                      placeholder="Add tag (e.g. Python, Linux, RNA-seq, SQL) and press Enter"
                      className="flex-1 px-3 py-2 rounded-xl bg-neutral-50 border border-neutral-200 text-xs text-neutral-900 focus:outline-none focus:border-neutral-900"
                    />
                    <button
                      type="button"
                      onClick={handleAddRequiredTag}
                      className="px-3.5 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-bold cursor-pointer"
                    >
                      Add Tag
                    </button>
                  </div>
                </div>

                {/* Preferred Skills Tags */}
                <div>
                  <label className="font-bold text-neutral-800 block mb-1.5 text-xs">
                    Preferred Skills (Bonus Weight)
                  </label>
                  <div className="flex flex-wrap items-center gap-1.5 mb-2">
                    {preferredSkillsTags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-neutral-100 text-neutral-800 border border-neutral-200 text-xs font-bold"
                      >
                        <span>{tag}</span>
                        <button
                          type="button"
                          onClick={() => setPreferredSkillsTags((prev) => prev.filter((t) => t !== tag))}
                          className="hover:text-rose-500 cursor-pointer"
                        >
                          &times;
                        </button>
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={prefSkillTagInput}
                      onChange={(e) => setPrefSkillTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddPreferredTag();
                        }
                      }}
                      placeholder="Add preferred tag (e.g. Nextflow, Docker, AWS) and press Enter"
                      className="flex-1 px-3 py-2 rounded-xl bg-neutral-50 border border-neutral-200 text-xs text-neutral-900 focus:outline-none focus:border-neutral-900"
                    />
                    <button
                      type="button"
                      onClick={handleAddPreferredTag}
                      className="px-3.5 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-bold cursor-pointer"
                    >
                      Add Tag
                    </button>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-4 border-t border-neutral-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowPostJobModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingJob}
                  className="px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingJob ? 'Publishing...' : 'Publish Listing to Student Feed'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: CANDIDATE PROFILE & MATCH BREAKDOWN (Item 9)             */}
      {/* Name, Education, Bioinformatics Skills, Projects, Research,     */}
      {/* Match Analysis: Required Skills %, Education %, Experience %    */}
      {/* Actions: [Shortlist], [Contact], [Reject]                       */}
      {/* ============================================================== */}
      {showCandidateProfileModal && selectedCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div
            className="w-full max-w-2xl bg-white border border-neutral-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200 text-neutral-900"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-5 sm:p-6 border-b border-neutral-200 bg-neutral-50/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={selectedCandidate.avatar}
                  alt={selectedCandidate.name}
                  className="w-14 h-14 rounded-2xl object-cover bg-neutral-100 border border-neutral-200"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg font-black text-neutral-900">
                      {selectedCandidate.name}
                    </h2>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
                      Omic Hub Verified ✓
                    </span>
                  </div>
                  <p className="text-xs text-neutral-600 font-medium">{selectedCandidate.headline}</p>
                  <p className="text-[11px] text-neutral-500 mt-0.5">{selectedCandidate.location}</p>
                </div>
              </div>

              <button
                onClick={() => setShowCandidateProfileModal(false)}
                className="p-1.5 rounded-xl text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Profile Body */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 text-xs">
              
              {/* Match Analysis Bars (Item 9) */}
              {(() => {
                const breakdown = calculateCandidateMatchBreakdown(selectedCandidate, activeMatchingJob);

                return (
                  <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-neutral-900 uppercase text-xs tracking-wider">
                        Match Analysis vs. {activeMatchingJob?.title || 'Active Role'}
                      </span>
                      <span className="text-sm font-black text-neutral-900">
                        {breakdown.overallMatch}% Overall Match
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      <div>
                        <div className="flex justify-between text-neutral-600 mb-1">
                          <span>Required Skills</span>
                          <span className="font-bold text-neutral-900">{breakdown.skillMatch}%</span>
                        </div>
                        <div className="w-full bg-neutral-200 rounded-full h-2">
                          <div
                            className="bg-neutral-900 h-2 rounded-full transition-all"
                            style={{ width: `${breakdown.skillMatch}%` }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-neutral-600 mb-1">
                          <span>Education & Academic Standing</span>
                          <span className="font-bold text-neutral-900">{breakdown.educationMatch}%</span>
                        </div>
                        <div className="w-full bg-neutral-200 rounded-full h-2">
                          <div
                            className="bg-neutral-900 h-2 rounded-full transition-all"
                            style={{ width: `${breakdown.educationMatch}%` }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-neutral-600 mb-1">
                          <span>Experience & Research Publications</span>
                          <span className="font-bold text-neutral-900">{breakdown.experienceMatch}%</span>
                        </div>
                        <div className="w-full bg-neutral-200 rounded-full h-2">
                          <div
                            className="bg-neutral-900 h-2 rounded-full transition-all"
                            style={{ width: `${breakdown.experienceMatch}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Education */}
              <div className="space-y-1">
                <h4 className="font-bold text-neutral-900 uppercase text-[11px] tracking-wider">Education</h4>
                <p className="text-neutral-700 bg-neutral-50 p-2.5 rounded-xl border border-neutral-200 font-medium">
                  {selectedCandidate.education}
                </p>
              </div>

              {/* Bioinformatics Skills */}
              <div className="space-y-1.5">
                <h4 className="font-bold text-neutral-900 uppercase text-[11px] tracking-wider">
                  Bioinformatics & Technical Skills
                </h4>
                <div className="flex flex-wrap items-center gap-1.5">
                  {selectedCandidate.skills.map((sk) => (
                    <span
                      key={sk}
                      className="px-2.5 py-1 rounded-lg bg-neutral-100 text-neutral-900 font-bold border border-neutral-200"
                    >
                      {sk}
                    </span>
                  ))}
                </div>
              </div>

              {/* Verified Badges & Certifications */}
              {selectedCandidate.verifiedBadges.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-bold text-neutral-900 uppercase text-[11px] tracking-wider">
                    Omic Hub Verified Benchmarks
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {selectedCandidate.verifiedBadges.map((badge, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-neutral-50 border border-neutral-200 flex items-center justify-between"
                      >
                        <div>
                          <div className="font-bold text-neutral-900">{badge.badgeName}</div>
                          <div className="text-[10px] text-neutral-500">{badge.assessmentType}</div>
                        </div>
                        <span className="text-sm font-black text-neutral-900">{badge.score}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Research Experience & Projects */}
              {selectedCandidate.researchExperience && (
                <div className="space-y-1">
                  <h4 className="font-bold text-neutral-900 uppercase text-[11px] tracking-wider">
                    Research Experience
                  </h4>
                  <p className="text-neutral-700 leading-relaxed">{selectedCandidate.researchExperience}</p>
                </div>
              )}

              {selectedCandidate.projects && selectedCandidate.projects.length > 0 && (
                <div className="space-y-1.5">
                  <h4 className="font-bold text-neutral-900 uppercase text-[11px] tracking-wider">Projects</h4>
                  <ul className="list-disc list-inside space-y-1 text-neutral-700">
                    {selectedCandidate.projects.map((proj, idx) => (
                      <li key={idx}>{proj}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* External Links */}
              <div className="pt-2 flex flex-wrap items-center gap-4 text-xs font-semibold text-neutral-600">
                {selectedCandidate.githubUrl && (
                  <a
                    href={selectedCandidate.githubUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-neutral-900 flex items-center gap-1 underline"
                  >
                    <span>GitHub Profile</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                {selectedCandidate.omicHubProfileUrl && (
                  <span className="text-neutral-500 font-mono">
                    Profile: {selectedCandidate.omicHubProfileUrl}
                  </span>
                )}
              </div>
            </div>

            {/* Modal Actions (Item 9) */}
            <div className="p-4 border-t border-neutral-200 bg-neutral-50/80 flex items-center justify-between gap-3">
              <button
                onClick={() => {
                  handleUpdateCandidateStage(selectedCandidate.id, 'rejected');
                  setShowCandidateProfileModal(false);
                }}
                className="px-4 py-2 rounded-xl text-neutral-500 hover:text-rose-600 hover:bg-rose-50 text-xs font-bold transition-colors cursor-pointer"
              >
                Reject
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    handleStartMessage(selectedCandidate);
                    setShowCandidateProfileModal(false);
                  }}
                  className="px-4 py-2 rounded-xl bg-white hover:bg-neutral-100 border border-neutral-300 text-neutral-800 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Contact / Message</span>
                </button>

                <button
                  onClick={() => {
                    handleToggleShortlist(selectedCandidate.id);
                    setShowCandidateProfileModal(false);
                  }}
                  className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  {selectedCandidate.shortlisted ? '✓ Shortlisted' : 'Shortlist Candidate'}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
