import React, { useState, useMemo, useEffect } from 'react';
import {
  Briefcase,
  GraduationCap,
  Sparkles,
  Search,
  Filter,
  DollarSign,
  Calendar,
  MapPin,
  Clock,
  ArrowRight,
  CheckCircle2,
  Bookmark,
  Share2,
  ExternalLink,
  ChevronDown,
  Layers,
  Send,
  Zap,
  Tag,
  ShieldCheck,
  X,
  FileText,
  Upload,
  User,
  Mail,
  Check,
} from 'lucide-react';
import { OpportunityItem, OpportunityType, UserProfile, ResumeData, RecruiterJobApplication } from '../../types';
import { StorageService } from '../../services/storage';
import { useToast } from '../../shared/ui/Toast';
import confetti from 'canvas-confetti';

interface OpportunitiesHubProps {
  user: UserProfile;
  resume: ResumeData;
  onSelectApplicationTab?: () => void;
}

export const OpportunitiesHub: React.FC<OpportunitiesHubProps> = ({
  user,
  resume,
  onSelectApplicationTab,
}) => {
  const { showToast } = useToast();

  const [opportunities, setOpportunities] = useState<OpportunityItem[]>(() =>
    StorageService.getOpportunities()
  );

  // Sync opportunities with storage
  useEffect(() => {
    const unsub = StorageService.subscribe(() => {
      setOpportunities(StorageService.getOpportunities());
    });
    return () => unsub();
  }, []);

  // Filters state
  const [selectedType, setSelectedType] = useState<'all' | OpportunityType>('all');
  const [selectedCost, setSelectedCost] = useState<'all' | 'Free' | 'Paid'>('all');
  const [selectedRange, setSelectedRange] = useState<
    'all' | 'free' | 'under_5k' | '5k_to_25k' | '25k_to_100k' | '100k_to_15L' | '15L_plus'
  >('all');
  const [sortBy, setSortBy] = useState<
    'recommended' | 'highest_pay' | 'lowest_cost' | 'deadline'
  >('recommended');
  const [searchQuery, setSearchQuery] = useState('');

  // Applied IDs tracking
  const [appliedIds, setAppliedIds] = useState<Set<string>>(() => {
    const apps = StorageService.getApplications();
    const set = new Set<string>();
    apps.forEach((a) => {
      if (a.id.startsWith('app_opp_') || a.id.startsWith('app_inapp_')) {
        set.add(a.role + '_' + a.company);
      }
    });
    return set;
  });

  // Modal State for In-App Recruiter Application Form
  const [selectedJobForModal, setSelectedJobForModal] = useState<OpportunityItem | null>(null);
  const [coverNote, setCoverNote] = useState('');
  const [resumeFileName, setResumeFileName] = useState(
    user.uploadedResumeFileName || `${(user.name || 'Student').replace(/\s+/g, '_')}_Bioinformatics_Resume.pdf`
  );
  const [isSubmittingInApp, setIsSubmittingInApp] = useState(false);

  // Auto-generate Omic Hub Profile URL for candidate
  const candidateProfileUrl =
    user.omicHubProfileUrl ||
    `omichub.in/profile/${(user.name || 'student').toLowerCase().replace(/[^a-z0-9]/g, '_')}`;

  // Calculate dynamic skill match score against uploaded resume
  const calculateMatch = (opp: OpportunityItem) => {
    if (!user.isResumeUploaded) {
      return opp.matchScore || 88;
    }

    const resumeSkills = [
      ...(resume.skills?.languages || []),
      ...(resume.skills?.frameworks || []),
      ...(resume.skills?.cloudDevOps || []),
      ...(resume.skills?.toolsAndDatabases || []),
      ...(resume.skills?.softSkills || []),
    ].map((s) => s.toLowerCase());

    if (resumeSkills.length === 0) return opp.matchScore || 88;

    const matchedCount = opp.skills.filter((s) =>
      resumeSkills.some((rs) => rs.includes(s.toLowerCase()) || s.toLowerCase().includes(rs))
    ).length;

    const ratio = matchedCount / Math.max(1, opp.skills.length);
    const score = Math.round(78 + ratio * 21);
    return Math.min(99, score);
  };

  // Filtered & Sorted Opportunities
  const filteredOpportunities = useMemo(() => {
    return opportunities
      .filter((opp) => {
        // Type filter
        if (selectedType !== 'all' && opp.type !== selectedType) return false;

        // Cost filter
        if (selectedCost !== 'all' && opp.costType !== selectedCost) return false;

        // Range filter
        if (selectedRange !== 'all' && opp.rangeTier !== selectedRange) return false;

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchesTitle = opp.title.toLowerCase().includes(q);
          const matchesOrg = opp.organization.toLowerCase().includes(q);
          const matchesLocation = opp.location.toLowerCase().includes(q);
          const matchesSkills = opp.skills.some((s) => s.toLowerCase().includes(q));
          if (!matchesTitle && !matchesOrg && !matchesLocation && !matchesSkills) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        // Prioritize recruiter posted roles to top
        if (a.isRecruiterPosted && !b.isRecruiterPosted) return -1;
        if (!a.isRecruiterPosted && b.isRecruiterPosted) return 1;

        if (sortBy === 'highest_pay') {
          return b.numericValue - a.numericValue;
        }
        if (sortBy === 'lowest_cost') {
          return a.numericValue - b.numericValue;
        }
        if (sortBy === 'deadline') {
          return a.startDateOrDeadline.localeCompare(b.startDateOrDeadline);
        }
        // Recommended
        const matchA = calculateMatch(a);
        const matchB = calculateMatch(b);
        return matchB - matchA;
      });
  }, [opportunities, selectedType, selectedCost, selectedRange, sortBy, searchQuery, user.isResumeUploaded, resume.skills]);

  // Counts for tabs
  const jobCount = opportunities.filter((o) => o.type === 'job').length;
  const internCount = opportunities.filter((o) => o.type === 'internship').length;
  const wsCount = opportunities.filter((o) => o.type === 'workshop').length;

  // Handle External Redirect ("Apply Now" or "Enroll / Audit Free")
  const handleExternalApply = (opp: OpportunityItem) => {
    const url = opp.externalApplyUrl || opp.registrationUrl || 'https://www.coursera.org';
    StorageService.applyToOpportunity(opp.id);
    setAppliedIds((prev) => new Set([...prev, opp.title + '_' + opp.organization]));
    showToast(`Redirecting to official careers page for ${opp.organization}...`, 'info');
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Open In-App Easy Apply Modal
  const handleOpenEasyApplyModal = (opp: OpportunityItem) => {
    setSelectedJobForModal(opp);
    setCoverNote(
      `Hello ${opp.organization} Hiring Team, I am an active bioinformatics scholar with hands-on experience in ${opp.skills.slice(0, 3).join(', ')}. My verified Omic Hub profile and resume demonstrate my lab readiness. Looking forward to connecting!`
    );
  };

  // Submit In-App Recruiter Application Form
  const handleSubmitInAppApplication = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJobForModal) return;

    if (!user.name || !user.email) {
      showToast('Please update your profile name and email before submitting.', 'error');
      return;
    }

    if (!coverNote.trim()) {
      showToast('Please include a brief note to the recruiter.', 'error');
      return;
    }

    setIsSubmittingInApp(true);

    const userProfile = StorageService.getUser();
    const resume = StorageService.getResume();
    const badges = StorageService.getCertifiedBadges();
    const atsScore = userProfile.atsScore || 93;

    const resumeSkills = [
      ...(resume.skills?.languages || []),
      ...(resume.skills?.frameworks || []),
      ...(resume.skills?.toolsAndDatabases || []),
    ];
    const candidateSkills =
      userProfile.targetSkills && userProfile.targetSkills.length > 0
        ? userProfile.targetSkills
        : resumeSkills.length > 0
        ? resumeSkills
        : ['Python', 'Linux', 'R', 'NGS', 'RNA-seq', 'BLAST'];

    const firstEdu = resume.education && resume.education[0];
    const eduStr = firstEdu ? `${firstEdu.degree}, ${firstEdu.institution}` : 'M.Sc. Bioinformatics, Pondicherry University';
    const firstExp = resume.workExperiences && resume.workExperiences[0];
    const expStr = firstExp ? `${firstExp.role} at ${firstExp.company}` : `${userProfile.experienceLevel} Scholar`;

    StorageService.submitRecruiterApplication({
      jobId: selectedJobForModal.id,
      jobTitle: selectedJobForModal.title,
      companyName: selectedJobForModal.organization,
      recruiterId: selectedJobForModal.postedByRecruiterId,
      studentId: user.id,
      studentName: user.name,
      studentEmail: user.email,
      studentProfileUrl: candidateProfileUrl,
      resumeFileName: resumeFileName,
      coverNote: coverNote.trim(),
      department: selectedJobForModal.department || 'Genomics & Computational Biology',
      employmentType: selectedJobForModal.employmentType || 'Full-time',
      candidateEducation: eduStr,
      candidateExperience: expStr,
      candidateSkills: candidateSkills,
      candidateAtsScore: atsScore,
      candidateDegreeType: (eduStr.includes('Ph') ? 'PhD' : eduStr.includes('M.Tech') ? 'MTech' : 'MSc') as any,
      candidateProjects: resume.projects && resume.projects.length > 0
        ? resume.projects.map((p) => p.name)
        : ['Automated RNA-Seq Variant Calling Pipeline'],
      candidateBioSummary: userProfile.bio || resume.summary || coverNote.trim(),
      candidateGithubUrl: userProfile.github || 'https://github.com/bioinformatician',
      candidateBadges: badges.map((b: any) => ({
        badgeName: b.title || b.badgeName || 'Omic Hub Certified',
        score: b.score || 95,
        assessmentType: b.category || 'Bioinformatics Core',
      })),
    });

    setAppliedIds((prev) => new Set([...prev, selectedJobForModal.title + '_' + selectedJobForModal.organization]));
    setIsSubmittingInApp(false);
    setSelectedJobForModal(null);
    confetti({ particleCount: 65, spread: 70, origin: { y: 0.6 } });

    showToast(
      `Application delivered directly to ${selectedJobForModal.organization}'s candidate dashboard!`,
      'success'
    );
  };

  // Handle local file selection for in-app form
  const handleCustomResumeUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setResumeFileName(file.name);
      showToast(`Selected custom resume file: ${file.name}`, 'info');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header Bar with Clean White Container */}
      <div className="p-6 rounded-2xl bg-white border border-neutral-200 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="px-2 py-0.5 rounded-md bg-neutral-100 border border-neutral-200 text-neutral-800 text-[11px] font-mono font-semibold">
                Direct Hiring & Internships
              </span>
              <span className="px-2 py-0.5 rounded-md bg-neutral-100 border border-neutral-200 text-neutral-800 text-[11px] font-mono font-semibold">
                Free Audit Curricula
              </span>
              <span className="px-2 py-0.5 rounded-md bg-neutral-100 border border-neutral-200 text-neutral-800 text-[11px] font-mono font-semibold">
                NPTEL &bull; IIT Verified
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 tracking-tight">
              Opportunities & Recruiter Hiring Feed
            </h2>
            <p className="text-xs sm:text-sm text-neutral-600 max-w-2xl mt-0.5 leading-relaxed">
              Bioinformatics job postings, university lab fellowships, and free certification audits. Verified recruiter roles support direct Easy Apply into hiring dashboards.
            </p>
          </div>

          {/* Real-Time Resume Match Status Badge */}
          <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200 text-xs self-start md:self-center shrink-0">
            {user.isResumeUploaded ? (
              <div className="flex items-center gap-2 text-neutral-900 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>ATS Resume Match Active ({user.atsScore || 88}%)</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-neutral-700 font-medium">
                <Sparkles className="w-4 h-4 text-neutral-500 shrink-0" />
                <span>Calibrated for Global Biotech roles</span>
              </div>
            )}
          </div>
        </div>

        {/* Category Filter Tabs (All, Jobs, Internships, Workshops) */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-neutral-100">
          <button
            onClick={() => setSelectedType('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              selectedType === 'all'
                ? 'bg-neutral-900 text-white shadow-2xs font-bold'
                : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700'
            }`}
          >
            All Opportunities ({opportunities.length})
          </button>
          <button
            onClick={() => setSelectedType('job')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              selectedType === 'job'
                ? 'bg-neutral-900 text-white shadow-2xs font-bold'
                : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>Jobs ({jobCount})</span>
          </button>
          <button
            onClick={() => setSelectedType('internship')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              selectedType === 'internship'
                ? 'bg-neutral-900 text-white shadow-2xs font-bold'
                : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Internships ({internCount})</span>
          </button>
          <button
            onClick={() => setSelectedType('workshop')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              selectedType === 'workshop'
                ? 'bg-neutral-900 text-white shadow-2xs font-bold'
                : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Workshops & Labs ({wsCount})</span>
          </button>
        </div>

        {/* Filter Controls Row: Search + Cost Filter + Range Filter + Sort Dropdown */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 text-xs">
          
          {/* Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search role, company, skill (Python, RNA-Seq)..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-neutral-300 text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-900"
            />
          </div>

          {/* Cost Filter (Free vs Paid) */}
          <div className="flex items-center gap-1 p-1 bg-neutral-100 border border-neutral-200 rounded-xl">
            <button
              onClick={() => setSelectedCost('all')}
              className={`flex-1 py-1 rounded-lg font-semibold text-center transition-all cursor-pointer ${
                selectedCost === 'all'
                  ? 'bg-white text-neutral-900 shadow-2xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              All Costs
            </button>
            <button
              onClick={() => setSelectedCost('Free')}
              className={`flex-1 py-1 rounded-lg font-semibold text-center transition-all cursor-pointer ${
                selectedCost === 'Free'
                  ? 'bg-white text-neutral-900 shadow-2xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Free Audit
            </button>
            <button
              onClick={() => setSelectedCost('Paid')}
              className={`flex-1 py-1 rounded-lg font-semibold text-center transition-all cursor-pointer ${
                selectedCost === 'Paid'
                  ? 'bg-white text-neutral-900 shadow-2xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Paid Roles
            </button>
          </div>

          {/* Compensation / Tier Filter */}
          <div className="relative">
            <select
              value={selectedRange}
              onChange={(e) => setSelectedRange(e.target.value as any)}
              className="w-full px-3 py-2 rounded-xl bg-white border border-neutral-300 text-neutral-800 focus:outline-none focus:border-neutral-900 appearance-none font-medium"
            >
              <option value="all">All Compensation Tiers</option>
              <option value="free">Free / Open Audit</option>
              <option value="25k_to_100k">Stipend: ₹25k - ₹1,00,000/mo</option>
              <option value="100k_to_15L">Salary: ₹1L - ₹15L / yr</option>
              <option value="15L_plus">Salary: ₹15L+ / yr (Senior Roles)</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-neutral-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Sort By Dropdown */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-3 py-2 rounded-xl bg-white border border-neutral-300 text-neutral-800 focus:outline-none focus:border-neutral-900 appearance-none font-medium"
            >
              <option value="recommended">Sort: Highest Match Score</option>
              <option value="highest_pay">Sort: Highest Compensation</option>
              <option value="lowest_cost">Sort: Free First</option>
              <option value="deadline">Sort: Application Deadline</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-neutral-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

        </div>
      </div>

      {/* Grid of Verified Opportunities */}
      {filteredOpportunities.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredOpportunities.map((opp) => {
            const isApplied = appliedIds.has(opp.title + '_' + opp.organization);
            const matchScore = calculateMatch(opp);
            const isRecruiterJob = !!opp.isRecruiterPosted;
            const hasExternalUrl = opp.applicationType === 'external' || !!opp.externalApplyUrl;

            return (
              <div
                key={opp.id}
                className={`rounded-xl bg-white hover:bg-neutral-50/60 border p-5 flex flex-col justify-between transition-all shadow-2xs ${
                  isRecruiterJob
                    ? 'border-neutral-900 ring-1 ring-neutral-900'
                    : 'border-neutral-200 hover:border-neutral-300'
                }`}
              >
                <div className="space-y-3">
                  
                  {/* Top Badges Row */}
                  <div className="flex items-start justify-between gap-2">
                    {/* Organization Logo + Name */}
                    <div className="flex items-center gap-2.5">
                      <img
                        src={opp.logo}
                        alt={opp.organization}
                        className="w-9 h-9 rounded-xl object-cover bg-neutral-100 border border-neutral-200 shrink-0"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                      <div>
                        <span className="text-[11px] font-bold text-neutral-900 block uppercase tracking-wider">
                          {opp.organization}
                        </span>
                        {/* "Posted by Verified Recruiter" Badge */}
                        {isRecruiterJob && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-neutral-700 bg-neutral-100 border border-neutral-200 px-2 py-0.5 rounded-md mt-0.5">
                            <ShieldCheck className="w-3 h-3 text-neutral-700" />
                            <span>Verified Recruiter</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Price / Compensation Pill */}
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-800 border border-neutral-200">
                        {opp.priceOrCompensation}
                      </span>
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="font-bold text-neutral-900 text-base leading-snug">
                    {opp.title}
                  </h3>

                  {/* Meta Details: Location, Duration, Deadline */}
                  <div className="space-y-1 text-xs text-neutral-500 font-medium">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                      <span className="truncate">{opp.location}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                      <span>{opp.durationOrSchedule}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                      <span>{opp.startDateOrDeadline}</span>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-neutral-600 leading-relaxed line-clamp-2">
                    {opp.description}
                  </p>

                  {/* Skills tags */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {opp.skills.map((skill, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] px-2 py-0.5 rounded-md bg-neutral-50 text-neutral-700 border border-neutral-200 font-mono font-medium"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>

                  {/* Match Score & Host Info */}
                  <div className="pt-2 border-t border-neutral-100 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="text-neutral-500">ATS Match:</span>
                      <strong className="text-neutral-900 font-mono font-bold">{matchScore}%</strong>
                    </div>

                    {opp.postedByRecruiterName ? (
                      <span className="text-[11px] text-neutral-600 font-medium truncate max-w-[150px]">
                        Recruiter: {opp.postedByRecruiterName.split(',')[0]}
                      </span>
                    ) : opp.instructorOrHost ? (
                      <span className="text-[11px] text-neutral-500 truncate max-w-[140px]">
                        By: {opp.instructorOrHost}
                      </span>
                    ) : null}
                  </div>
                </div>

                {/* Bottom Actions Row */}
                <div className="pt-3 border-t border-neutral-100 mt-4 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-neutral-500">
                    {isRecruiterJob
                      ? hasExternalUrl ? 'Official Careers Link' : 'In-App Direct Delivery'
                      : opp.costType === 'Free' ? 'Free Audit Access' : 'Verified Opportunity'}
                  </span>

                  {/* ACTION BUTTON BASED ON TYPE */}
                  {isApplied ? (
                    <button
                      disabled
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-neutral-100 text-neutral-500 border border-neutral-200 cursor-default"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Applied</span>
                    </button>
                  ) : hasExternalUrl ? (
                    <button
                      onClick={() => handleExternalApply(opp)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-neutral-900 hover:bg-black text-white transition-colors cursor-pointer"
                    >
                      <span>Apply Now</span>
                      <ExternalLink className="w-3 h-3 text-neutral-300" />
                    </button>
                  ) : isRecruiterJob ? (
                    <button
                      onClick={() => handleOpenEasyApplyModal(opp)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-neutral-900 hover:bg-black text-white transition-colors cursor-pointer"
                    >
                      <Zap className="w-3 h-3 text-amber-400 fill-current" />
                      <span>Easy Apply</span>
                    </button>
                  ) : opp.costType === 'Free' ? (
                    <button
                      onClick={() => handleExternalApply(opp)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-neutral-900 hover:bg-black text-white transition-colors cursor-pointer"
                    >
                      <span>Enroll / Audit Free</span>
                      <ExternalLink className="w-3 h-3 text-neutral-300" />
                    </button>
                  ) : (
                    <button
                      onClick={() => handleExternalApply(opp)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-neutral-900 hover:bg-black text-white transition-colors cursor-pointer"
                    >
                      <span>Apply Now</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-12 text-center rounded-2xl bg-white border border-neutral-200 space-y-3 shadow-2xs max-w-2xl mx-auto">
          <Briefcase className="w-9 h-9 text-neutral-400 mx-auto" />
          <h4 className="text-base font-bold text-neutral-900">
            {opportunities.length === 0
              ? 'No opportunities available yet.'
              : 'No Opportunities Match Your Current Filters'}
          </h4>
          <p className="text-xs text-neutral-500 max-w-md mx-auto leading-relaxed">
            {opportunities.length === 0
              ? 'New opportunities from verified recruiters will appear here in real time as they are posted.'
              : 'Try adjusting your cost filter, range tier, or clearing your search keywords to view available openings.'}
          </p>
          {opportunities.length > 0 && (
            <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
              <button
                onClick={() => {
                  setSelectedType('all');
                  setSelectedCost('all');
                  setSelectedRange('all');
                  setSearchQuery('');
                }}
                className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-black text-white font-semibold text-xs transition-colors cursor-pointer"
              >
                Reset All Filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* IN-APP RECRUITER APPLICATION FORM MODAL */}
      {/* ========================================================= */}
      {selectedJobForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-xl rounded-2xl bg-white border border-neutral-200 p-6 sm:p-8 shadow-2xl space-y-5 text-neutral-900">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 border-b border-neutral-100 pb-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-neutral-100 border border-neutral-200 text-neutral-800 text-[10px] font-mono font-semibold mb-1">
                  <Zap className="w-3 h-3 text-amber-500 fill-current" />
                  <span>OMIC HUB Easy Apply &bull; Direct Delivery</span>
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-neutral-900">
                  {selectedJobForModal.title}
                </h3>
                <p className="text-xs text-neutral-500">
                  {selectedJobForModal.organization} &bull; {selectedJobForModal.location}
                </p>
              </div>

              <button
                onClick={() => setSelectedJobForModal(null)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* In-App Form */}
            <form onSubmit={handleSubmitInAppApplication} className="space-y-4 text-xs">
              
              {/* Auto-filled Student Name & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-neutral-600 font-semibold flex items-center gap-1">
                    <User className="w-3 h-3 text-neutral-400" />
                    <span>Candidate Name (Auto-filled)</span>
                  </label>
                  <input
                    type="text"
                    disabled
                    value={user.name || 'Bioinformatics Student'}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-50 border border-neutral-200 text-neutral-800 cursor-not-allowed font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-neutral-600 font-semibold flex items-center gap-1">
                    <Mail className="w-3 h-3 text-neutral-400" />
                    <span>Official Email (Auto-filled)</span>
                  </label>
                  <input
                    type="text"
                    disabled
                    value={user.email || 'scholar@omichub.in'}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-50 border border-neutral-200 text-neutral-800 cursor-not-allowed font-mono"
                  />
                </div>
              </div>

              {/* Auto-filled Omic Hub Profile URL */}
              <div className="space-y-1">
                <label className="text-neutral-600 font-semibold flex items-center justify-between">
                  <span>OMIC HUB Verified Profile URL</span>
                  <span className="text-[10px] text-neutral-700 font-semibold font-mono">Auto-Linked</span>
                </label>
                <div className="px-3 py-2 rounded-xl bg-neutral-50 border border-neutral-200 text-neutral-800 font-mono text-[11px] flex items-center justify-between">
                  <span>{candidateProfileUrl}</span>
                  <Check className="w-3.5 h-3.5 text-neutral-700" />
                </div>
              </div>

              {/* Resume File Selection / Upload */}
              <div className="space-y-2 p-3.5 rounded-xl bg-neutral-50 border border-neutral-200">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-neutral-800 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-neutral-600" />
                    <span>Resume File Attachment</span>
                  </label>
                  <span className="text-[10px] text-neutral-500 font-mono">PDF / DOCX</span>
                </div>

                <div className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-white border border-neutral-200">
                  <span className="font-mono text-[11px] text-neutral-800 truncate">
                    {resumeFileName}
                  </span>

                  <label className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-semibold text-[10px] cursor-pointer transition-colors shrink-0">
                    <Upload className="w-3 h-3 text-neutral-500" />
                    <span>Change File</span>
                    <input
                      type="file"
                      accept=".pdf,.docx,.doc"
                      className="hidden"
                      onChange={handleCustomResumeUpload}
                    />
                  </label>
                </div>
                <p className="text-[11px] text-neutral-500">
                  Recruiters will receive your ATS-calibrated Master Resume and verified credentials.
                </p>
              </div>

              {/* Cover Note / Message to Recruiter */}
              <div className="space-y-1.5">
                <label className="font-semibold text-neutral-800 flex items-center justify-between">
                  <span>Cover Note / Message to Recruiter</span>
                  <span className="text-neutral-400 text-[10px]">Required</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={coverNote}
                  onChange={(e) => setCoverNote(e.target.value)}
                  placeholder="Introduce yourself, highlight specific pipeline tools (e.g. Nextflow, RNA-Seq, BLAST), and why you want to join this lab..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-neutral-300 text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-900"
                />
              </div>

              {/* Delivery Notice */}
              <div className="p-3 rounded-lg bg-neutral-50 border border-neutral-200 text-neutral-700 text-[11px] flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-neutral-800 shrink-0" />
                <span>
                  Delivered straight to <strong>{selectedJobForModal.organization}</strong>'s recruiter candidate dashboard.
                </span>
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedJobForModal(null)}
                  className="px-4 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmittingInApp}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-neutral-900 hover:bg-black text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmittingInApp ? 'Delivering...' : 'Submit Application'}</span>
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};
