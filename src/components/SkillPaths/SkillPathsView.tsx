import React, { useState, useMemo } from 'react';
import {
  GraduationCap,
  Sparkles,
  BookOpen,
  CheckCircle2,
  Clock,
  Award,
  ChevronRight,
  PlayCircle,
  HelpCircle,
  RotateCcw,
  Wand2,
  TrendingUp,
  ExternalLink,
  ShieldCheck,
  Star,
  Search,
  Filter,
  DollarSign,
  Tag,
  Briefcase,
  Layers,
  Lock,
  ArrowUpRight,
  Flame,
  Check,
} from 'lucide-react';
import {
  Course,
  CourseLesson,
  BioinformaticsProgram,
  SubscriptionPlanTier,
} from '../../types';
import { StorageService } from '../../services/storage';
import { getSkillRecommendations } from '../../services/api';
import { useToast } from '../../shared/ui/Toast';
import confetti from 'canvas-confetti';

interface SkillPathsViewProps {
  courses: Course[];
  onSaveCourses: (courses: Course[]) => void;
  userRole: string;
  targetRole: string;
  userPlan?: SubscriptionPlanTier;
  onTriggerUpgrade?: (feature: string, requiredTier?: SubscriptionPlanTier) => void;
}

export const COURSE_FILTER_CHIPS = [
  'All',
  'Free Coursera',
  'NPTEL / SWAYAM (< ₹1000)',
  'Real Internships',
  'Under ₹2,000',
] as const;

export type CourseFilterChip = (typeof COURSE_FILTER_CHIPS)[number];

export const SkillPathsView: React.FC<SkillPathsViewProps> = ({
  courses,
  onSaveCourses,
  userRole,
  targetRole,
  userPlan = 'premium',
  onTriggerUpgrade,
}) => {
  const { showToast } = useToast();

  // Primary Tab: 'listings' (Verified Programs & Listings) vs 'modules' (Interactive Modules & AI Path)
  const [activeTabMode, setActiveTabMode] = useState<'listings' | 'modules'>('listings');

  // Programs state loaded from StorageService
  const [programs] = useState<BioinformaticsProgram[]>(() => {
    return StorageService.getPrograms();
  });

  // Filter States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeFilterChip, setActiveFilterChip] = useState<CourseFilterChip>('All');
  const [selectedSkillTag, setSelectedSkillTag] = useState<string | null>(null);

  // Lesson interactive state for 'modules' view
  const [selectedCourse, setSelectedCourse] = useState<Course>(courses[0] || null);
  const [activeLesson, setActiveLesson] = useState<CourseLesson>(
    courses[0]?.lessons?.[0] || null
  );
  const [selectedQuizOption, setSelectedQuizOption] = useState<number | null>(null);
  const [quizSubmitted, setQuizSubmitted] = useState<boolean>(false);

  // AI Pathway Custom Generator
  const [customRoleInput, setCustomRoleInput] = useState(userRole);
  const [customTargetInput, setCustomTargetInput] = useState(targetRole);
  const [generatingPath, setGeneratingPath] = useState(false);
  const [customPlan, setCustomPlan] = useState<any | null>(null);

  // Filtered Programs logic matching the strict requirements
  const filteredPrograms = useMemo(() => {
    return programs.filter((prog) => {
      // 1. Text Search Query Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = prog.title.toLowerCase().includes(q);
        const matchesProvider = prog.provider.toLowerCase().includes(q);
        const matchesPlatform = prog.platform.toLowerCase().includes(q);
        const matchesBadge = prog.badge.toLowerCase().includes(q);
        const matchesSkills = prog.skills.some((s) => s.toLowerCase().includes(q));
        const matchesDesc = prog.description?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesProvider && !matchesPlatform && !matchesBadge && !matchesSkills && !matchesDesc) {
          return false;
        }
      }

      // 2. Skill Tag Filter
      if (selectedSkillTag && !prog.skills.includes(selectedSkillTag)) {
        return false;
      }

      // 3. Exact Filter Chips (All, Free Coursera, NPTEL / SWAYAM (< ₹1000), Real Internships, Under ₹2,000)
      if (activeFilterChip === 'Free Coursera') {
        const isCoursera =
          prog.badge === 'Coursera' ||
          prog.platform.toLowerCase().includes('coursera') ||
          prog.provider.toLowerCase().includes('toronto') ||
          prog.provider.toLowerCase().includes('san diego');
        const isFree = prog.priceLabel.toLowerCase().includes('free');
        return isCoursera && isFree;
      }

      if (activeFilterChip === 'NPTEL / SWAYAM (< ₹1000)') {
        const isNptel =
          prog.badge === 'NPTEL' ||
          prog.platform.toLowerCase().includes('nptel') ||
          prog.platform.toLowerCase().includes('swayam') ||
          prog.provider.toLowerCase().includes('iit');
        return isNptel;
      }

      if (activeFilterChip === 'Real Internships') {
        return (
          prog.type === 'Internship' ||
          prog.badge === 'Verified Internship' ||
          prog.badge.toLowerCase().includes('internship')
        );
      }

      if (activeFilterChip === 'Under ₹2,000') {
        const label = prog.priceLabel.toLowerCase();
        return (
          label.includes('free') ||
          label.includes('1,000') ||
          label.includes('under') ||
          label.includes('stipend')
        );
      }

      return true; // 'All'
    });
  }, [programs, searchQuery, activeFilterChip, selectedSkillTag]);

  // Handle program action click ("Enroll / Apply")
  const handleProgramAction = (prog: BioinformaticsProgram) => {
    // Feature gate check: Direct internship applications require Premium
    if (prog.type === 'Internship' && userPlan !== 'premium') {
      if (onTriggerUpgrade) {
        onTriggerUpgrade('Direct Internship Applications', 'premium');
      } else {
        showToast('Direct internship applications require Premium (₹49 once).', 'info');
      }
      return;
    }

    // Record activity in storage
    StorageService.addActivity({
      type: 'course',
      title: `Applied/Enrolled: ${prog.title}`,
      description: `Accessed verified program from ${prog.provider} (${prog.badge || prog.platform}). Price: ${prog.priceLabel}.`,
      badge: prog.priceLabel,
    });

    showToast(`Opening official portal: ${prog.platform}`, 'info');
    window.open(prog.link, '_blank', 'noopener,noreferrer');
  };

  // Mark lesson completed
  const handleToggleLesson = (courseId: string, lessonId: string) => {
    const updatedCourses = courses.map((crs) => {
      if (crs.id !== courseId) return crs;
      const updatedLessons = crs.lessons.map((l) =>
        l.id === lessonId ? { ...l, completed: !l.completed } : l
      );
      const completedCount = updatedLessons.filter((l) => l.completed).length;
      const progressPercent = Math.round((completedCount / updatedLessons.length) * 100);
      const completedHours = Math.round((progressPercent / 100) * crs.estimatedHours);

      return {
        ...crs,
        lessons: updatedLessons,
        progressPercent,
        completedHours,
      };
    });

    onSaveCourses(updatedCourses);
    const updatedSelected = updatedCourses.find((c) => c.id === courseId);
    if (updatedSelected) {
      setSelectedCourse(updatedSelected);
      const nextActive = updatedSelected.lessons.find((l) => l.id === lessonId);
      if (nextActive) setActiveLesson(nextActive);
    }

    confetti({ particleCount: 35, spread: 60, origin: { y: 0.7 } });
    showToast('Lesson completion updated! Learning hours credited.', 'success');
  };

  // Submit quiz answer
  const handleSubmitQuiz = (lesson: CourseLesson) => {
    if (selectedQuizOption === null) {
      showToast('Please select an option first.', 'error');
      return;
    }
    setQuizSubmitted(true);
    if (selectedQuizOption === lesson.quiz?.correctIndex) {
      confetti({ particleCount: 45, spread: 65, origin: { y: 0.6 } });
      showToast('Correct! Great technical mastery.', 'success');
      if (!lesson.completed && selectedCourse) {
        handleToggleLesson(selectedCourse.id, lesson.id);
      }
    } else {
      showToast('Review the technical explanation below.', 'info');
    }
  };

  // Generate AI Pathway
  const handleGenerateCustomPath = async () => {
    setGeneratingPath(true);
    try {
      const data = await getSkillRecommendations(customRoleInput, customTargetInput, [
        'Nextflow DSL2',
        'GATK 4 Somatic Pipelines',
        'Python (Biopython & pysam)',
        'Single-Cell RNA-seq (Seurat)',
        'AlphaFold 3 & Molecular Docking',
      ]);
      setCustomPlan(data);
      showToast('Custom 4-Phase Career Pathway Generated!', 'success');
    } catch {
      showToast('Failed to generate pathway.', 'error');
    } finally {
      setGeneratingPath(false);
    }
  };

  // Overall stats
  const totalCompletedHours = courses.reduce((acc, c) => acc + c.completedHours, 0);
  const totalEstimatedHours = courses.reduce((acc, c) => acc + c.estimatedHours, 0);
  const overallSkillProgress = totalEstimatedHours
    ? Math.round((totalCompletedHours / totalEstimatedHours) * 100)
    : 0;

  return (
    <div className="space-y-6 pb-20 text-neutral-900">
      
      {/* Top Hero Banner & Mode Switcher in Clean White & Black */}
      <div className="rounded-2xl bg-white border border-neutral-200 p-6 sm:p-7 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-neutral-100 border border-neutral-200 text-neutral-700 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-neutral-900" />
              <span>Bioinformatics Curriculum</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-neutral-900 tracking-tight">
              Skills & Verified Programs
            </h1>

            <p className="text-xs sm:text-sm text-neutral-600 max-w-2xl leading-relaxed">
              Curated bioinformatics programs, Coursera audits, NPTEL courses, and industry trainee opportunities.
            </p>

            {/* Quick Metrics Badges */}
            <div className="flex flex-wrap items-center gap-2 pt-2 text-xs">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-neutral-100 border border-neutral-200 text-neutral-800 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-neutral-900" />
                <span>Verified Programs</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-neutral-100 border border-neutral-200 text-neutral-800 font-medium">
                <span>Free Coursera Audits</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-neutral-100 border border-neutral-200 text-neutral-800 font-medium">
                <span>NPTEL / SWAYAM (&lt; ₹1,000)</span>
              </span>
            </div>
          </div>

          {/* Mode Tabs Switcher */}
          <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0">
            <div className="flex items-center p-1 rounded-xl bg-neutral-100 border border-neutral-200 text-xs">
              <button
                type="button"
                onClick={() => setActiveTabMode('listings')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-bold transition-all cursor-pointer ${
                  activeTabMode === 'listings'
                    ? 'bg-neutral-900 text-white shadow-xs'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                <Award className="w-4 h-4" />
                <span>Verified Programs ({programs.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTabMode('modules')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-bold transition-all cursor-pointer ${
                  activeTabMode === 'modules'
                    ? 'bg-neutral-900 text-white shadow-xs'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <span>Interactive Modules & AI Path</span>
              </button>
            </div>

            {/* Quick Progress Badge */}
            <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-neutral-50 border border-neutral-200 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-neutral-900" />
                <span className="text-neutral-600">Mastery Progress</span>
              </div>
              <span className="font-extrabold text-neutral-900">{overallSkillProgress}% ({totalCompletedHours}h logged)</span>
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* MODE 1: VERIFIED PROGRAMS & LISTINGS (3-COLUMN RESPONSIVE) */}
      {/* ======================================================== */}
      {activeTabMode === 'listings' && (
        <div className="space-y-6">
          
          {/* Horizontal Filter Bar at the Top with Interactive Filter Chips */}
          <div className="rounded-2xl bg-white border border-neutral-200 p-4 sm:p-5 shadow-xs space-y-4">
            
            {/* Search Bar + Active Count */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search title, provider, or skills (e.g. Python, BLAST, RNA-Seq)..."
                  className="w-full pl-10 pr-4 py-2 rounded-xl bg-neutral-50 border border-neutral-200 text-xs text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-neutral-900 transition-colors"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400 hover:text-neutral-900"
                  >
                    Clear
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 text-xs text-neutral-600">
                <span>Showing</span>
                <span className="font-bold text-neutral-900 px-2 py-0.5 rounded-md bg-neutral-100 border border-neutral-200">
                  {filteredPrograms.length} of {programs.length} listings
                </span>
                {(activeFilterChip !== 'All' || selectedSkillTag || searchQuery) && (
                  <button
                    onClick={() => {
                      setActiveFilterChip('All');
                      setSelectedSkillTag(null);
                      setSearchQuery('');
                    }}
                    className="text-neutral-900 hover:underline font-semibold ml-2 cursor-pointer"
                  >
                    Reset Filters
                  </button>
                )}
              </div>
            </div>

            {/* Exact Horizontal Filter Bar Chips */}
            <div className="pt-3 border-t border-neutral-200 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-1.5 text-neutral-600 text-xs font-semibold shrink-0">
                <Filter className="w-3.5 h-3.5 text-neutral-700" />
                <span>Filter:</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {COURSE_FILTER_CHIPS.map((chip) => {
                  const isSelected = activeFilterChip === chip;
                  return (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => setActiveFilterChip(chip)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                        isSelected
                          ? 'bg-neutral-900 text-white border-neutral-900 shadow-xs'
                          : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700 border-neutral-200'
                      }`}
                    >
                      {chip}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Optional Skill Tags Bar */}
            <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-neutral-100">
              <span className="text-[11px] text-neutral-500 font-semibold mr-1 flex items-center gap-1">
                <Tag className="w-3 h-3 text-neutral-500" />
                Skills:
              </span>
              {['Python', 'RNA-Seq', 'BLAST', 'Linux', 'GATK4', 'Nextflow', 'Algorithms'].map((skill) => {
                const isSelected = selectedSkillTag === skill;
                return (
                  <button
                    key={skill}
                    type="button"
                    onClick={() => setSelectedSkillTag(isSelected ? null : skill)}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-neutral-900 text-white border-neutral-900'
                        : 'bg-neutral-50 hover:bg-neutral-100 text-neutral-600 border-neutral-200'
                    }`}
                  >
                    #{skill}
                  </button>
                );
              })}
              {selectedSkillTag && (
                <button
                  onClick={() => setSelectedSkillTag(null)}
                  className="text-[11px] text-neutral-500 hover:text-neutral-900 underline ml-1"
                >
                  Clear skill
                </button>
              )}
            </div>
          </div>

          {/* Responsive 3-Column Grid of Simple White & Black Cards */}
          {filteredPrograms.length === 0 ? (
            <div className="p-12 rounded-2xl bg-white border border-neutral-200 text-center space-y-4 shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-neutral-100 border border-neutral-200 flex items-center justify-center mx-auto text-neutral-500">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-neutral-900">No Programs Match Your Filter</h3>
              <p className="text-xs text-neutral-500 max-w-md mx-auto">
                No programs currently match the active filter. Click "All" to view all verified programs.
              </p>
              <button
                onClick={() => {
                  setActiveFilterChip('All');
                  setSelectedSkillTag(null);
                  setSearchQuery('');
                }}
                className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-black text-white font-bold text-xs cursor-pointer transition-colors shadow-xs"
              >
                Reset to All Listings
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredPrograms.map((prog) => {
                const isFree =
                  prog.priceLabel.toLowerCase().includes('free') ||
                  prog.priceLabel.toLowerCase().includes('stipend');
                const isInternship = prog.type === 'Internship';

                return (
                  <div
                    key={prog.id}
                    className="rounded-2xl bg-white border border-neutral-200 hover:border-neutral-400 p-5 flex flex-col justify-between transition-all duration-200 shadow-xs"
                  >
                    <div>
                      {/* Top Provider and Badge Meta */}
                      <div className="flex items-start justify-between gap-3 mb-2.5">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-neutral-500 uppercase tracking-wide truncate">
                            {prog.provider}
                          </p>
                          <p className="text-[11px] text-neutral-500 font-medium mt-0.5">
                            {prog.platform} &bull; {prog.type}
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-800 border border-neutral-200">
                            {prog.priceLabel}
                          </span>
                        </div>
                      </div>

                      {/* Title */}
                      <h3 className="font-bold text-neutral-900 text-sm sm:text-base leading-snug mb-2.5">
                        {prog.title}
                      </h3>

                      {/* Brief Description */}
                      {prog.description && (
                        <p className="text-xs text-neutral-600 leading-relaxed mb-3 line-clamp-2">
                          {prog.description}
                        </p>
                      )}

                      {/* Simple Technical Skills Pills */}
                      <div className="flex flex-wrap gap-1 mb-4">
                        {prog.skills.slice(0, 4).map((skill, sIdx) => (
                          <span
                            key={sIdx}
                            className="text-[11px] font-medium px-2 py-0.5 rounded bg-neutral-50 border border-neutral-200 text-neutral-700"
                          >
                            {skill}
                          </span>
                        ))}
                        {prog.skills.length > 4 && (
                          <span className="text-[11px] font-medium px-1.5 py-0.5 rounded text-neutral-400">
                            +{prog.skills.length - 4}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Bottom Action Area: Duration and Clean Black Action Button */}
                    <div className="pt-3 border-t border-neutral-100 flex items-center justify-between gap-3">
                      <div className="text-[11px] text-neutral-500 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-neutral-400" />
                        <span>{prog.duration || 'Self-Paced'}</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleProgramAction(prog)}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-neutral-900 hover:bg-black text-white text-xs font-bold transition-colors cursor-pointer shadow-xs shrink-0"
                      >
                        <span>{isInternship ? 'Apply for Internship' : isFree ? 'Audit Free' : 'Enroll Now'}</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* MODE 2: INTERACTIVE MODULES & QUIZZES & AI ROADMAP */}
      {/* ======================================================== */}
      {activeTabMode === 'modules' && (
        <div className="space-y-8">
          {/* Main Grid: Courses List (Left) & Active Lesson Viewer (Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left Column: Courses Selector (4 cols) */}
            <div className="lg:col-span-4 space-y-4">
              <h2 className="text-sm font-bold text-slate-300 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-purple-400" />
                <span>Targeted Interactive Courses ({courses.length})</span>
              </h2>

              <div className="space-y-3">
                {courses.map((course) => {
                  const isSelected = selectedCourse?.id === course.id;
                  return (
                    <div
                      key={course.id}
                      onClick={() => {
                        setSelectedCourse(course);
                        setActiveLesson(course.lessons[0]);
                        setSelectedQuizOption(null);
                        setQuizSubmitted(false);
                      }}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-neutral-900 text-white border-neutral-900 shadow-xs'
                          : 'bg-white border-neutral-200 hover:border-neutral-400 text-neutral-900'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isSelected ? 'bg-neutral-800 text-neutral-200' : 'bg-neutral-100 text-neutral-700'}`}>
                          {course.category}
                        </span>
                        <span className={`text-[11px] font-medium ${isSelected ? 'text-neutral-400' : 'text-neutral-500'}`}>
                          {course.level} &bull; {course.estimatedHours}h
                        </span>
                      </div>

                      <h3 className={`font-bold text-sm leading-snug ${isSelected ? 'text-white' : 'text-neutral-900'}`}>
                        {course.title}
                      </h3>

                      {/* Progress Bar */}
                      <div className="mt-3 space-y-1">
                        <div className={`flex justify-between text-[10px] ${isSelected ? 'text-neutral-400' : 'text-neutral-500'}`}>
                          <span>{course.lessons.filter((l) => l.completed).length}/{course.lessons.length} lessons</span>
                          <span className={`font-bold ${isSelected ? 'text-white' : 'text-neutral-900'}`}>{course.progressPercent}%</span>
                        </div>
                        <div className={`h-1.5 w-full rounded-full overflow-hidden ${isSelected ? 'bg-neutral-800' : 'bg-neutral-100'}`}>
                          <div
                            className={`h-full rounded-full ${isSelected ? 'bg-white' : 'bg-neutral-900'}`}
                            style={{ width: `${course.progressPercent}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Column: Active Lesson & Interactive Quiz (8 cols) */}
            <div className="lg:col-span-8">
              {selectedCourse && activeLesson && (
                <div className="rounded-2xl bg-white border border-neutral-200 p-6 sm:p-7 shadow-xs space-y-6 text-neutral-900">
                  
                  {/* Lesson Header */}
                  <div className="border-b border-neutral-200 pb-5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
                        {selectedCourse.title}
                      </span>
                      <span className="text-xs text-neutral-500 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {activeLesson.duration}
                      </span>
                    </div>

                    <h2 className="text-xl sm:text-2xl font-black text-neutral-900">
                      {activeLesson.title}
                    </h2>

                    <p className="text-xs sm:text-sm text-neutral-700 mt-2 bg-neutral-50 p-3.5 rounded-xl border border-neutral-200">
                      <strong className="text-neutral-900">Technical Key Takeaway: </strong>
                      {activeLesson.keyTakeaway}
                    </p>
                  </div>

                  {/* Lessons List Navigation for this course */}
                  <div>
                    <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">
                      Course Lessons
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {selectedCourse.lessons.map((les, idx) => {
                        const isCurrent = les.id === activeLesson.id;
                        return (
                          <button
                            key={les.id}
                            type="button"
                            onClick={() => {
                              setActiveLesson(les);
                              setSelectedQuizOption(null);
                              setQuizSubmitted(false);
                            }}
                            className={`p-2.5 rounded-xl border text-left text-xs transition-all flex items-start gap-2 cursor-pointer ${
                              isCurrent
                                ? 'bg-neutral-900 border-neutral-900 text-white font-bold'
                                : 'bg-neutral-50 hover:bg-neutral-100 border-neutral-200 text-neutral-700'
                            }`}
                          >
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold shrink-0 ${isCurrent ? 'bg-neutral-800 text-white' : 'bg-neutral-200 text-neutral-700'}`}>
                              #{idx + 1}
                            </span>
                            <span className="truncate flex-1">{les.title}</span>
                            {les.completed && (
                              <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${isCurrent ? 'text-white' : 'text-neutral-900'}`} />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Interactive Technical Mastery Quiz */}
                  {activeLesson.quiz && (
                    <div className="rounded-xl bg-neutral-50 border border-neutral-200 p-5 space-y-4">
                      <div className="flex items-center gap-2 text-xs font-bold text-neutral-900">
                        <HelpCircle className="w-4 h-4 text-neutral-900" />
                        <span>Interactive Knowledge Check</span>
                      </div>

                      <p className="text-sm font-semibold text-neutral-900">
                        {activeLesson.quiz.question}
                      </p>

                      {/* Options */}
                      <div className="space-y-2">
                        {activeLesson.quiz.options.map((opt, oIdx) => {
                          const isPicked = selectedQuizOption === oIdx;
                          const isCorrect = oIdx === activeLesson.quiz?.correctIndex;

                          let btnStyle = 'bg-white border-neutral-200 text-neutral-700 hover:border-neutral-400';
                          if (isPicked && !quizSubmitted) {
                            btnStyle = 'bg-neutral-900 border-neutral-900 text-white font-semibold';
                          } else if (quizSubmitted) {
                            if (isCorrect) {
                              btnStyle = 'bg-emerald-50 border-emerald-500 text-emerald-900 font-bold';
                            } else if (isPicked && !isCorrect) {
                              btnStyle = 'bg-rose-50 border-rose-500 text-rose-900 font-semibold';
                            }
                          }

                          return (
                            <button
                              key={oIdx}
                              type="button"
                              onClick={() => {
                                if (!quizSubmitted) setSelectedQuizOption(oIdx);
                              }}
                              disabled={quizSubmitted}
                              className={`w-full p-3 rounded-xl border text-left text-xs transition-all flex items-center justify-between cursor-pointer ${btnStyle}`}
                            >
                              <span>{opt}</span>
                              {quizSubmitted && isCorrect && (
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {/* Submit / Retake Controls */}
                      <div className="flex items-center justify-between pt-2">
                        {!quizSubmitted ? (
                          <button
                            type="button"
                            onClick={() => handleSubmitQuiz(activeLesson)}
                            disabled={selectedQuizOption === null}
                            className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-black disabled:opacity-40 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
                          >
                            Submit Answer
                          </button>
                        ) : (
                          <div className="w-full space-y-3">
                            <div className="p-3 rounded-xl bg-white border border-neutral-200 text-xs text-neutral-800">
                              <strong className="text-neutral-900 block mb-1">Detailed Explanation:</strong>
                              {activeLesson.quiz.explanation}
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setQuizSubmitted(false);
                                setSelectedQuizOption(null);
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 hover:text-neutral-900 border border-neutral-300 text-xs cursor-pointer"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Retake Quiz</span>
                            </button>
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => handleToggleLesson(selectedCourse.id, activeLesson.id)}
                          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                            activeLesson.completed
                              ? 'bg-neutral-900 text-white'
                              : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border border-neutral-300'
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{activeLesson.completed ? 'Lesson Completed' : 'Mark Lesson Complete'}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* AI Custom Career Pathway Generator */}
          <div className="rounded-2xl bg-white border border-neutral-200 p-6 sm:p-7 shadow-xs space-y-6 text-neutral-900">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-neutral-100 border border-neutral-200 text-neutral-900">
                  <Wand2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-neutral-900">
                    AI Career Pathway & Skill Matrix Generator
                  </h3>
                  <p className="text-xs text-neutral-500">
                    Map out personalized milestones transitioning from your current academic profile to target industry roles.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGenerateCustomPath}
                disabled={generatingPath}
                className="px-4 py-2.5 rounded-xl bg-neutral-900 hover:bg-black disabled:opacity-40 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-2 cursor-pointer shrink-0"
              >
                <Sparkles className="w-3.5 h-3.5 text-white" />
                <span>{generatingPath ? 'Synthesizing Roadmap...' : 'Generate 4-Phase Roadmap'}</span>
              </button>
            </div>

            {/* Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Current Academic / Research Role
                </label>
                <input
                  type="text"
                  value={customRoleInput}
                  onChange={(e) => setCustomRoleInput(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-white border border-neutral-200 text-xs text-neutral-900 focus:outline-none focus:border-neutral-900"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Target Career / Industry Role
                </label>
                <input
                  type="text"
                  value={customTargetInput}
                  onChange={(e) => setCustomTargetInput(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-white border border-neutral-200 text-xs text-neutral-900 focus:outline-none focus:border-neutral-900"
                />
              </div>
            </div>

            {/* Render Custom Plan Result */}
            {customPlan && (
              <div className="pt-4 border-t border-neutral-200 space-y-4 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
                    {customPlan.recommendedRoleTitle || customPlan.targetRoleTitle || 'Personalized Computational Biology Blueprint'}
                  </span>
                  <span className="text-[11px] text-neutral-500">
                    Est. Timeline: {customPlan.estimatedTimeToTarget || (customPlan.estimatedMonthsToTarget ? `${customPlan.estimatedMonthsToTarget} Months` : '12 Weeks')}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {(customPlan.phases || customPlan.milestones || []).map((m: any, mIdx: number) => {
                    const title = m.title || m.phaseName || `Phase ${mIdx + 1}`;
                    const duration = m.durationWeeks ? `${m.durationWeeks} Weeks` : m.duration || '3 Weeks';
                    const description =
                      m.description ||
                      [
                        m.topics?.length ? `Focus: ${m.topics.join(', ')}.` : '',
                        m.recommendedProject ? `Project: ${m.recommendedProject}` : '',
                      ]
                        .filter(Boolean)
                        .join(' ');

                    return (
                      <div
                        key={mIdx}
                        className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-1.5"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-neutral-900 font-bold">Phase {m.phase || mIdx + 1}</span>
                          <span className="text-[10px] text-neutral-500">{duration}</span>
                        </div>
                        <h4 className="font-bold text-neutral-900 text-xs">{title}</h4>
                        <p className="text-[11px] text-neutral-600 leading-relaxed">{description}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
