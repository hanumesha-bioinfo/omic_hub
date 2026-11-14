import React, { useState, useMemo } from 'react';
import {
  FileText,
  Briefcase,
  GraduationCap,
  Mic,
  SearchCode,
  LayoutDashboard,
  TrendingUp,
  ArrowRight,
  CheckCircle2,
  Calendar,
  Sparkles,
  Clock,
  Award,
  Zap,
  ChevronRight,
  ExternalLink,
  Database,
  Search,
  User,
  Settings,
  AlertTriangle,
  BookOpen,
  Dna,
  Check,
  Crown,
  Target,
  Filter,
  Layers,
  Building2,
  ChevronDown,
} from 'lucide-react';
import { UserProfile, JobApplication, ActivityItem, ResumeData } from '../types';
import type { ActiveTab } from '../app/navigation';
import { OpportunitiesHub } from './Dashboard/OpportunitiesHub';
import { BioinformaticsNews } from './Dashboard/BioinformaticsNews';
import { CareerWorkspace } from './Dashboard/CareerWorkspace';

interface DashboardViewProps {
  user: UserProfile;
  resume: ResumeData;
  applications: JobApplication[];
  activities: ActivityItem[];
  atsScore: number;
  setActiveTab: (tab: ActiveTab) => void;
  onOpenResumeBuilder: () => void;
  onOpenMockInterview: () => void;
  onOpenResumeAnalyzer?: () => void;
  onOpenDataRetrieval?: () => void;
  onOpenDataVault?: () => void;
  onOpenProfileSettings?: () => void;
  onUpdateResume?: (resume: ResumeData) => void;
  onUpdateUser?: (user: UserProfile) => void;
}

// 7 Standard Core Bioinformatics ATS Benchmark Skills
export const CORE_BIOINFORMATICS_SKILLS = [
  { id: 'Python', name: 'Python', regex: /python|biopython/i, desc: 'Scripting, Biopython, Pandas' },
  { id: 'R', name: 'R', regex: /(^|\W)r(\W|$)|bioconductor|deseq2|seurat|ggplot/i, desc: 'Bioconductor, scRNA-seq, DESeq2' },
  { id: 'BLAST', name: 'BLAST', regex: /blast|blastp|blastn|ncbi blast/i, desc: 'Homology search, alignment' },
  { id: 'Linux', name: 'Linux', regex: /linux|bash|unix|shell|cli|terminal/i, desc: 'HPC, SLURM, shell scripting' },
  { id: 'PyMOL', name: 'PyMOL', regex: /pymol|chimerax|autodock|docking|pdb|alphafold/i, desc: 'Structural modeling, 3D visualization' },
  { id: 'Nextflow', name: 'Nextflow', regex: /nextflow|nf-core|snakemake|cwl|wdl/i, desc: 'Pipelines, container workflows' },
  { id: 'RNA-Seq', name: 'RNA-Seq', regex: /rna-seq|rnaseq|transcriptom|single-cell|scrna/i, desc: 'Gene expression quantification' },
] as const;

// Verified Real Programs for Dynamic Recommendations
interface RecommendedCourse {
  id: string;
  missingSkillTriggers: string[];
  title: string;
  provider: string;
  platformBadge: 'Coursera' | 'NPTEL' | 'Verified Internship';
  price: string;
  priceHighlight: 'green' | 'blue';
  skills: string[];
  link: string;
  description: string;
}

const VERIFIED_COURSE_CATALOG: RecommendedCourse[] = [
  {
    id: 'rec_uof_t_methods',
    missingSkillTriggers: ['Python', 'Linux', 'BLAST'],
    title: 'Bioinformatic Methods I & II',
    provider: 'University of Toronto (Coursera)',
    platformBadge: 'Coursera',
    price: 'Free Audit',
    priceHighlight: 'green',
    skills: ['Python', 'Biopython', 'Linux', 'BLAST'],
    link: 'https://www.coursera.org/learn/bioinformatics-methods-1',
    description: 'Master NCBI BLAST, multiple sequence alignments, phylogenetic analysis, and RNA structure modeling with free audit access.',
  },
  {
    id: 'rec_iitm_nptel',
    missingSkillTriggers: ['Linux', 'BLAST', 'Python', 'PyMOL'],
    title: 'BioInformatics: Algorithms and Applications',
    provider: 'IIT Madras (NPTEL / SWAYAM)',
    platformBadge: 'NPTEL',
    price: 'Free / ₹1,000 Exam Fee',
    priceHighlight: 'blue',
    skills: ['Linux', 'Algorithms', 'BLAST', 'Python', 'PyMOL'],
    link: 'https://nptel.ac.in/courses/102106065',
    description: 'Government certified 12-week computational biology foundation covering scoring matrices, FASTA/BLAST algorithms, and 3D structure analysis.',
  },
  {
    id: 'rec_ucsd_beg',
    missingSkillTriggers: ['Python', 'Linux'],
    title: 'Biology Meets Programming: Bioinformatics for Beginners',
    provider: 'UC San Diego (Coursera)',
    platformBadge: 'Coursera',
    price: 'Free Audit',
    priceHighlight: 'green',
    skills: ['Python', 'Algorithms', 'DNA Motifs', 'Linux'],
    link: 'https://www.coursera.org/learn/bioinformatics',
    description: 'Learn to write clean Python scripts to locate replication origins (DnaA boxes) and detect hidden genetic regulatory signals.',
  },
  {
    id: 'rec_bioresire_trainee',
    missingSkillTriggers: ['RNA-Seq', 'Nextflow', 'R'],
    title: 'Computational Biology & Genomic Data Analysis Trainee',
    provider: 'BioResire / Industry Partners',
    platformBadge: 'Verified Internship',
    price: 'Free / stipend',
    priceHighlight: 'green',
    skills: ['RNA-Seq', 'Nextflow', 'R', 'DESeq2'],
    link: 'https://www.coursera.org/specializations/genomic-data-science',
    description: 'Practical training on real patient NGS datasets, building containerized Nextflow pipelines and conducting differential transcriptomics in R.',
  },
  {
    id: 'rec_pymol_structural',
    missingSkillTriggers: ['PyMOL'],
    title: 'Structural Bioinformatics & Molecular Modeling',
    provider: 'UCSD & Protein Data Bank (Coursera)',
    platformBadge: 'Coursera',
    price: 'Free Audit',
    priceHighlight: 'green',
    skills: ['PyMOL', 'AlphaFold 3', 'PDB', 'AutoDock Vina'],
    link: 'https://www.coursera.org/learn/computational-neuroscience',
    description: 'Learn PyMOL scripting, Ray tracing for publication-ready figures, and AlphaFold 3 structural confidence (pLDDT) analysis.',
  },
];

// Curated Real Computational Biology Career Pathways
interface CareerPathway {
  id: string;
  title: string;
  category: 'Computational Biology' | 'NGS & Pipeline' | 'Structural Biology' | 'Clinical Genomics' | 'Data Science';
  demandBadge: string;
  demandColor: string;
  avgSalaryINR: string;
  avgSalaryUSD: string;
  openPositions: number;
  description: string;
  requiredSkills: string[];
  topCompanies: string[];
}

const CAREER_PATHWAYS: CareerPathway[] = [
  {
    id: 'path_comp_bio_ngs',
    title: 'Computational Biologist & NGS Pipeline Scientist',
    category: 'NGS & Pipeline',
    demandBadge: 'High Demand',
    demandColor: 'bg-neutral-100 text-neutral-800 border-neutral-200',
    avgSalaryINR: '₹12 - 25 LPA',
    avgSalaryUSD: '$125,000 / yr',
    openPositions: 42,
    description: 'Design automated containerized pipelines for high-throughput sequencing data, variant calling, and bulk/single-cell RNA-Seq analysis.',
    requiredSkills: ['Nextflow', 'Python', 'Linux', 'RNA-Seq', 'GATK', 'SLURM'],
    topCompanies: ['Illumina', 'Broad Institute', 'Strand Life Sciences', 'Regeneron'],
  },
  {
    id: 'path_genomic_ds',
    title: 'Genomic Data Scientist & Variant Analyst',
    category: 'Data Science',
    demandBadge: 'High Growth',
    demandColor: 'bg-neutral-100 text-neutral-800 border-neutral-200',
    avgSalaryINR: '₹14 - 28 LPA',
    avgSalaryUSD: '$140,000 / yr',
    openPositions: 35,
    description: 'Perform statistical genomics, GWAS association analysis, polygenic risk scoring, and machine learning on multi-omic patient biobanks.',
    requiredSkills: ['Python', 'R', 'Bioconductor', 'VCF', 'GWAS', 'Pandas'],
    topCompanies: ['23andMe', 'AstraZeneca', 'Color Genomics', 'Roche'],
  },
  {
    id: 'path_structural_bio',
    title: 'Structural Bioinformatician & Molecular Modeler',
    category: 'Structural Biology',
    demandBadge: 'Specialized',
    demandColor: 'bg-neutral-100 text-neutral-800 border-neutral-200',
    avgSalaryINR: '₹10 - 22 LPA',
    avgSalaryUSD: '$118,000 / yr',
    openPositions: 22,
    description: 'Model 3D protein structures with AlphaFold 3, conduct virtual screening with AutoDock Vina, and inspect ligand-binding pockets in PyMOL.',
    requiredSkills: ['PyMOL', 'AlphaFold 3', 'AutoDock', 'PDB', 'Linux', 'MD Simulations'],
    topCompanies: ['Schrödinger', 'Novartis', 'DeepMind Life Sciences', 'Biocon'],
  },
  {
    id: 'path_clinical_oncology',
    title: 'Clinical Bioinformatician & Precision Oncology Analyst',
    category: 'Clinical Genomics',
    demandBadge: 'Active Hiring',
    demandColor: 'bg-neutral-100 text-neutral-800 border-neutral-200',
    avgSalaryINR: '₹15 - 30 LPA',
    avgSalaryUSD: '$145,000 / yr',
    openPositions: 29,
    description: 'Interpret somatic & germline mutations according to ACMG/AMP guidelines for targeted oncology therapies and clinical report generation.',
    requiredSkills: ['ClinVar', 'ACMG Guidelines', 'WGS/WES', 'Linux', 'Docker', 'IGV'],
    topCompanies: ['Foundation Medicine', 'Tempus Labs', 'Guardant Health', 'MedGenome'],
  },
  {
    id: 'path_bio_software',
    title: 'Bioinformatics Software & Algorithm Engineer',
    category: 'Computational Biology',
    demandBadge: 'Engineering',
    demandColor: 'bg-neutral-100 text-neutral-800 border-neutral-200',
    avgSalaryINR: '₹16 - 32 LPA',
    avgSalaryUSD: '$155,000 / yr',
    openPositions: 31,
    description: 'Build robust bioinformatics software libraries, aligners, and web portals using high-performance C++/Rust, Python, and cloud infrastructure.',
    requiredSkills: ['Python', 'Rust/C++', 'Nextflow', 'Docker', 'AWS HealthOmics', 'REST APIs'],
    topCompanies: ['10x Genomics', 'Pacific Biosciences', 'Thermo Fisher', 'Genentech'],
  },
  {
    id: 'path_biostat',
    title: 'Biostatistician & Clinical Trial Methodologist',
    category: 'Data Science',
    demandBadge: 'Biostatistics',
    demandColor: 'bg-neutral-100 text-neutral-800 border-neutral-200',
    avgSalaryINR: '₹11 - 21 LPA',
    avgSalaryUSD: '$112,000 / yr',
    openPositions: 19,
    description: 'Formulate survival models (Cox PH, Kaplan-Meier), compute sample size power estimations, and conduct interim efficacy analyses.',
    requiredSkills: ['R', 'SAS', 'Survival Analysis', 'Biostatistics', 'Clinical Trials'],
    topCompanies: ['IQVIA', 'Pfizer', 'Syneos Health', 'Parexel'],
  },
];

export const DashboardView: React.FC<DashboardViewProps> = ({
  user,
  resume,
  applications,
  activities,
  atsScore,
  setActiveTab,
  onOpenResumeBuilder,
  onOpenMockInterview,
  onOpenResumeAnalyzer,
  onOpenDataRetrieval,
  onOpenDataVault,
  onOpenProfileSettings,
  onUpdateResume,
  onUpdateUser,
}) => {
  // Search state for Role Explorer
  const [careerSearchQuery, setCareerSearchQuery] = useState('');
  // Tap Navigation ('all', 'jobs', 'courses', 'interview', 'validation')
  const [activeYouTubeTab, setActiveYouTubeTab] = useState<'all' | 'jobs' | 'courses' | 'interview' | 'validation'>('all');

  // Compute real-time pipeline statistics
  const offersCount = applications.filter((a) => a.stage === 'offer').length;
  const finalRoundsCount = applications.filter((a) => a.stage === 'final').length;
  const technicalCount = applications.filter((a) => a.stage === 'technical').length;
  const screeningCount = applications.filter((a) => a.stage === 'screening').length;
  const activeCount = offersCount + finalRoundsCount + technicalCount + screeningCount;

  // Upcoming interviews from applications
  const upcomingInterviews = applications
    .filter((a) => a.nextInterviewDate)
    .sort((a, b) => (a.nextInterviewDate! > b.nextInterviewDate! ? 1 : -1));

  // REAL ATS SCORING & DYNAMIC RECOMMENDATIONS
  const { realAtsScore, matchedSkills, missingSkills, recommendedCourses, allResumeTextLower } = useMemo(() => {
    const allResumeText = [
      resume.title || '',
      resume.summary || '',
      resume.personalInfo?.headline || '',
      ...(resume.skills?.languages || []),
      ...(resume.skills?.frameworks || []),
      ...(resume.skills?.cloudDevOps || []),
      ...(resume.skills?.toolsAndDatabases || []),
      ...(resume.workExperiences || []).flatMap((e) => [e.company, e.role, ...(e.bullets || [])]),
      ...(resume.education || []).flatMap((ed) => [ed.fieldOfStudy, ed.degree, ed.coursework || '']),
      ...(resume.projects || []).flatMap((p) => [p.name, p.description, ...(p.technologies || []), ...(p.bullets || [])]),
      ...(resume.certifications || []).flatMap((c) => [c.name, c.issuer]),
    ].join(' ').toLowerCase();

    const matched: string[] = [];
    const missing: string[] = [];

    CORE_BIOINFORMATICS_SKILLS.forEach((item) => {
      if (item.regex.test(allResumeText)) {
        matched.push(item.name);
      } else {
        missing.push(item.name);
      }
    });

    const calculatedScore = Math.round((matched.length / CORE_BIOINFORMATICS_SKILLS.length) * 100);

    const recommendations: RecommendedCourse[] = [];
    if (missing.length > 0) {
      VERIFIED_COURSE_CATALOG.forEach((course) => {
        const matchesMissing = course.missingSkillTriggers.some((sk) => missing.includes(sk));
        if (matchesMissing && !recommendations.some((r) => r.id === course.id)) {
          recommendations.push(course);
        }
      });
    }

    return {
      realAtsScore: calculatedScore,
      matchedSkills: matched,
      missingSkills: missing,
      recommendedCourses: recommendations,
      allResumeTextLower: allResumeText,
    };
  }, [resume]);

  // Compute live match % for each career pathway
  const pathwaysWithMatch = useMemo(() => {
    return CAREER_PATHWAYS.map((path) => {
      const matchedCount = path.requiredSkills.filter((sk) => {
        const regex = new RegExp(`(^|\\W)${sk.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\W|$)`, 'i');
        return regex.test(allResumeTextLower);
      }).length;
      const matchPct = Math.round((matchedCount / path.requiredSkills.length) * 100);
      return {
        ...path,
        matchPct: Math.max(matchPct, Math.round(realAtsScore * 0.85)),
        matchedCount,
      };
    });
  }, [allResumeTextLower, realAtsScore]);

  // Filter career pathways based on search query
  const filteredPathways = useMemo(() => {
    const query = careerSearchQuery.trim().toLowerCase();
    if (!query) return pathwaysWithMatch;

    return pathwaysWithMatch.filter((path) => {
      return (
        path.title.toLowerCase().includes(query) ||
        path.description.toLowerCase().includes(query) ||
        path.requiredSkills.some((sk) => sk.toLowerCase().includes(query)) ||
        path.topCompanies.some((c) => c.toLowerCase().includes(query))
      );
    });
  }, [pathwaysWithMatch, careerSearchQuery]);

  return (
    <div className="space-y-6 pb-16">
      {/* ============================================================== */}
      {/* 1. SEARCH BAR (Directly below the top tabs bar)                */}
      {/* ============================================================== */}
      <div className="w-full space-y-2">
        <div className="relative flex items-center w-full shadow-xs rounded-2xl bg-white border border-neutral-300 focus-within:border-neutral-900 focus-within:ring-2 focus-within:ring-neutral-900/10 transition-all">
          <Search className="w-4 h-4 text-neutral-400 absolute left-4 pointer-events-none" />
          <input
            type="text"
            value={careerSearchQuery}
            onChange={(e) => setCareerSearchQuery(e.target.value)}
            placeholder="Search bioinformatics roles, skills (Python, Nextflow, RNA-Seq), tools, ATS calibrations, or jobs..."
            className="w-full pl-11 pr-24 py-3 bg-transparent text-xs sm:text-sm font-medium text-neutral-900 placeholder:text-neutral-400 outline-none"
          />
          {careerSearchQuery && (
            <button
              type="button"
              onClick={() => setCareerSearchQuery('')}
              className="absolute right-3 text-xs text-neutral-500 hover:text-neutral-900 px-2.5 py-1 cursor-pointer bg-neutral-100 hover:bg-neutral-200 rounded-lg font-semibold"
            >
              Clear
            </button>
          )}
        </div>

        {/* Quick Search Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-[11px] text-neutral-500 pt-0.5">
          <span className="font-semibold text-neutral-400 uppercase tracking-wider text-[10px] shrink-0">Popular:</span>
          {['Nextflow', 'Python', 'RNA-Seq', 'Linux', 'PyMOL', 'BLAST', 'Schrödinger', 'Illumina'].map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => setCareerSearchQuery(tag)}
              className={`px-2.5 py-1 rounded-lg border transition-colors cursor-pointer shrink-0 font-medium ${
                careerSearchQuery.toLowerCase() === tag.toLowerCase()
                  ? 'bg-neutral-900 text-white border-neutral-900'
                  : 'bg-white hover:bg-neutral-50 border-neutral-200 text-neutral-700'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>
      
      {/* ============================================================== */}
      {/* 3. CAREER WORKSPACE PROGRESSION PIPELINE                       */}
      {/* ============================================================== */}
      <CareerWorkspace
        user={user}
        resume={resume}
        applications={applications}
        activeStage={
          activeYouTubeTab === 'courses'
            ? 'courses'
            : activeYouTubeTab === 'jobs'
            ? 'jobs'
            : activeYouTubeTab === 'interview'
            ? 'resume'
            : activeYouTubeTab === 'validation'
            ? 'certification'
            : 'all'
        }
        setActiveTab={setActiveTab}
        onOpenResumeBuilder={onOpenResumeBuilder}
        onSelectStage={(stage) => {
          if (stage === 'courses') setActiveYouTubeTab('courses');
          else if (stage === 'jobs') setActiveYouTubeTab('jobs');
          else if (stage === 'resume') setActiveYouTubeTab('interview');
          else if (stage === 'certification') setActiveYouTubeTab('validation');
          else setActiveYouTubeTab('all');
        }}
      />

      {/* ============================================================== */}
      {/* 4. HERO SECTION: "Discover Your Career in Bioinformatics"      */}
      {/* Clean, editorial, authoritative typography                     */}
      {/* ============================================================== */}
      <section className="space-y-5">
        {/* Metadata Kicker & User Greeting */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-neutral-500 font-mono">
          <div className="flex items-center gap-2">
            <span className="font-bold text-neutral-900 uppercase tracking-wider">OMIC HUB</span>
            <span>&bull;</span>
            <span>Placement & Calibration Suite</span>
          </div>

          <div className="flex items-center gap-2">
            <span>Researcher:</span>
            <span className="font-bold text-neutral-900 font-sans">
              {user.name || 'Bioinformatics Scholar'}
            </span>
          </div>
        </div>

        {/* Headline with strict typographic hierarchy */}
        <div className="space-y-2 max-w-3xl">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-neutral-900 tracking-tight leading-tight">
            Bioinformatics Career Intelligence
          </h1>
          <p className="text-sm sm:text-base text-neutral-600 leading-relaxed">
            Calibrate computational biology specializations, compare industry compensation in INR (₹) and USD ($), and benchmark your master resume against Workday and Greenhouse ATS parsers.
          </p>
        </div>

        {/* Filter Segmented Control */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-neutral-100 border border-neutral-200 overflow-x-auto no-scrollbar w-fit max-w-full">
          <button
            type="button"
            onClick={() => setActiveYouTubeTab('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              activeYouTubeTab === 'all'
                ? 'bg-white text-neutral-900 shadow-2xs font-bold'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <span>All Overview</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveYouTubeTab('jobs')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              activeYouTubeTab === 'jobs'
                ? 'bg-white text-neutral-900 shadow-2xs font-bold'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5 text-neutral-600" />
            <span>Opportunities ({applications.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveYouTubeTab('courses')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              activeYouTubeTab === 'courses'
                ? 'bg-white text-neutral-900 shadow-2xs font-bold'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5 text-neutral-600" />
            <span>Courses & Upgrades</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveYouTubeTab('interview')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              activeYouTubeTab === 'interview'
                ? 'bg-white text-neutral-900 shadow-2xs font-bold'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <Mic className="w-3.5 h-3.5 text-neutral-600" />
            <span>Mock Interview</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveYouTubeTab('validation')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              activeYouTubeTab === 'validation'
                ? 'bg-white text-neutral-900 shadow-2xs font-bold'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <Award className="w-3.5 h-3.5 text-neutral-600" />
            <span>ATS Skill Matrix</span>
          </button>
        </div>
      </section>

      {/* ============================================================== */}
      {/* 2. REAL METRIC HIERARCHY (NO FOUR COLORS, NO GRADIENTS)         */}
      {/* Dominant Hero Metric + Subordinate Structured Secondary Metrics */}
      {/* ============================================================== */}
      {activeYouTubeTab === 'all' && (
        <section className="space-y-3">
          <div className="flex items-baseline justify-between pb-1">
            <h2 className="text-xs font-mono font-semibold uppercase tracking-wider text-neutral-400">
              Placement Telemetry & Calibration
            </h2>
            <span className="text-xs text-neutral-500 font-mono">
              Live Profile Status
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
            
            {/* DOMINANT HERO METRIC (7 Cols): Master ATS Readiness Score */}
            <div className="lg:col-span-7 rounded-2xl bg-white border border-neutral-200 p-6 sm:p-7 flex flex-col justify-between shadow-xs">
              <div>
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-semibold uppercase tracking-wider text-neutral-400">
                      Primary Telemetry
                    </span>
                    <span className="text-neutral-300">&bull;</span>
                    <span className="text-xs font-medium text-neutral-600">
                      Workday & Greenhouse Benchmark
                    </span>
                  </div>

                  <span
                    className={`inline-flex items-center text-xs font-semibold px-2.5 py-0.5 rounded-md border ${
                      realAtsScore >= 70
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : realAtsScore >= 40
                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                        : 'bg-rose-50 text-rose-800 border-rose-200'
                    }`}
                  >
                    {matchedSkills.length} of 7 Core Skills Validated
                  </span>
                </div>

                {/* Dominant Figure: Large, Bold, Clear, Monospace */}
                <div className="flex items-baseline gap-3">
                  <span className="text-5xl sm:text-6xl font-extrabold font-mono text-neutral-900 tracking-tight tabular-nums">
                    {realAtsScore}%
                  </span>
                  <div className="space-y-0.5">
                    <span className="block text-sm font-bold text-neutral-900">
                      ATS Keyword Match Index
                    </span>
                    <span className="block text-xs text-neutral-500">
                      Calibrated for Computational Biology roles
                    </span>
                  </div>
                </div>

                {/* Progress bar without meaningless gradient - clean neutral track */}
                <div className="mt-4 w-full bg-neutral-100 h-2 rounded-full overflow-hidden border border-neutral-200">
                  <div
                    className="h-full bg-neutral-900 rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(realAtsScore, 6)}%` }}
                  />
                </div>

                {/* Skill Breakdown: Quiet, Informational, Unboxed & Tags */}
                <div className="mt-5 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-neutral-700">7 Core Competency Breakdown:</span>
                    <span className="text-neutral-500 font-mono text-[11px]">
                      {missingSkills.length > 0 ? `${missingSkills.length} Missing` : 'All 7 Complete'}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {CORE_BIOINFORMATICS_SKILLS.map((sk) => {
                      const isMatched = matchedSkills.includes(sk.name);
                      return (
                        <span
                          key={sk.name}
                          className={`text-xs px-2.5 py-1 rounded-md font-mono transition-colors flex items-center gap-1 border ${
                            isMatched
                              ? 'bg-neutral-50 text-neutral-900 border-neutral-300 font-semibold'
                              : 'bg-white text-neutral-400 border-neutral-200 line-through decoration-neutral-300'
                          }`}
                        >
                          {isMatched && <Check className="w-3 h-3 text-neutral-800" />}
                          {sk.name}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Primary Action Buttons */}
              <div className="mt-6 pt-5 border-t border-neutral-100 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('builder')}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-neutral-900 hover:bg-black text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Audit ATS & Resume</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('skills')}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-neutral-50 text-neutral-800 border border-neutral-300 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                >
                  <GraduationCap className="w-3.5 h-3.5 text-neutral-600" />
                  <span>Bridge Skill Gaps</span>
                </button>
              </div>
            </div>

            {/* SECONDARY SUPPORTING METRICS (5 Cols): Structured, Subordinate Font Scale */}
            <div className="lg:col-span-5 flex flex-col gap-3.5">
              
              {/* Secondary Metric 1: Opportunity Pipeline */}
              <div
                onClick={() => setActiveTab('tracker')}
                className="p-4 sm:p-5 rounded-xl bg-white border border-neutral-200 hover:border-neutral-300 shadow-xs transition-all cursor-pointer flex flex-col justify-between flex-1 group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-medium uppercase tracking-wider text-neutral-400">
                    Application Pipeline
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-neutral-400 group-hover:text-neutral-900 group-hover:translate-x-0.5 transition-all" />
                </div>

                <div className="my-2 flex items-baseline justify-between">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold font-mono text-neutral-900 tabular-nums">
                      {applications.length}
                    </span>
                    <span className="text-xs text-neutral-500">
                      opportunities tracked
                    </span>
                  </div>

                  <span className="text-xs font-mono font-semibold text-neutral-700 bg-neutral-100 px-2 py-0.5 rounded-md">
                    {offersCount > 0 ? `${offersCount} Offer` : 'Active'}
                  </span>
                </div>

                <div className="text-xs text-neutral-500 flex items-center gap-2 pt-2 border-t border-neutral-100">
                  <span>{finalRoundsCount} Final Rounds</span>
                  <span>&bull;</span>
                  <span>{technicalCount} Technical</span>
                  <span>&bull;</span>
                  <span>{screeningCount} Screening</span>
                </div>
              </div>

              {/* Secondary Metric 2: Mock Interview Readiness */}
              <div
                onClick={onOpenMockInterview}
                className="p-4 sm:p-5 rounded-xl bg-white border border-neutral-200 hover:border-neutral-300 shadow-xs transition-all cursor-pointer flex flex-col justify-between flex-1 group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-medium uppercase tracking-wider text-neutral-400">
                    Interview Readiness
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-neutral-400 group-hover:text-neutral-900 group-hover:translate-x-0.5 transition-all" />
                </div>

                <div className="my-2 flex items-baseline justify-between">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold font-mono text-neutral-900 tabular-nums">
                      {user.interviewReadiness || 88}%
                    </span>
                    <span className="text-xs text-neutral-500">
                      STAR rubric score
                    </span>
                  </div>

                  <span className="text-xs font-mono font-semibold text-neutral-700 bg-neutral-100 px-2 py-0.5 rounded-md">
                    Genomics Drills
                  </span>
                </div>

                <div className="text-xs text-neutral-500 pt-2 border-t border-neutral-100 truncate">
                  High confidence in NGS Pipelines & Variant Calling scenarios.
                </div>
              </div>

              {/* Secondary Metric 3: Logged Learning Hours */}
              <div
                onClick={() => setActiveTab('skills')}
                className="p-4 sm:p-5 rounded-xl bg-white border border-neutral-200 hover:border-neutral-300 shadow-xs transition-all cursor-pointer flex flex-col justify-between flex-1 group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-medium uppercase tracking-wider text-neutral-400">
                    Verified Curricula
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-neutral-400 group-hover:text-neutral-900 group-hover:translate-x-0.5 transition-all" />
                </div>

                <div className="my-2 flex items-baseline justify-between">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold font-mono text-neutral-900 tabular-nums">
                      {user.learningHours || 32}h
                    </span>
                    <span className="text-xs text-neutral-500">
                      coursework completed
                    </span>
                  </div>

                  <span className="text-xs font-mono font-semibold text-neutral-700 bg-neutral-100 px-2 py-0.5 rounded-md">
                    NPTEL & Coursera
                  </span>
                </div>

                <div className="text-xs text-neutral-500 pt-2 border-t border-neutral-100 truncate">
                  Free audit programs in Python, Biopython, and Structural Biology.
                </div>
              </div>

            </div>

          </div>
        </section>
      )}

      {/* ============================================================== */}
      {/* 3. DYNAMIC "RECOMMENDED UPGRADES" SECTION (When skills missing) */}
      {/* Clean Light Card Architecture with High Legibility              */}
      {/* ============================================================== */}
      {activeYouTubeTab === 'all' && (
        missingSkills.length > 0 ? (
          <section className="rounded-2xl bg-white border border-neutral-200 p-6 sm:p-7 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-semibold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200">
                    ATS Skill Gap Analysis
                  </span>
                  <span className="text-neutral-300">&bull;</span>
                  <span className="text-xs text-neutral-500 font-mono">
                    {matchedSkills.length} of 7 Matched
                  </span>
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-neutral-900 mt-1">
                  Targeted Programs to Reach 100% ATS Readiness
                </h2>
                <p className="text-xs sm:text-sm text-neutral-600 mt-0.5">
                  Missing from resume: <span className="font-mono font-bold text-neutral-900">{missingSkills.join(', ')}</span>. Free audits & accredited curricula to bridge the gap:
                </p>
              </div>

              <button
                type="button"
                onClick={() => setActiveTab('skills')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-neutral-50 text-neutral-800 border border-neutral-300 font-semibold text-xs shadow-2xs transition-colors cursor-pointer shrink-0"
              >
                <span>Browse All Verified Courses</span>
                <ChevronRight className="w-3.5 h-3.5 text-neutral-500" />
              </button>
            </div>

            {/* 3-Column Responsive Card Layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recommendedCourses.slice(0, 3).map((course) => (
                <div
                  key={course.id}
                  className="rounded-xl bg-white hover:bg-neutral-50/60 border border-neutral-200 p-5 flex flex-col justify-between transition-all shadow-2xs group"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-semibold bg-neutral-100 text-neutral-700 border border-neutral-200">
                        {course.platformBadge}
                      </span>

                      <span className="px-2 py-0.5 rounded-md text-xs font-bold font-mono bg-neutral-100 text-neutral-800">
                        {course.price}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-neutral-900 leading-snug line-clamp-2">
                      {course.title}
                    </h3>
                    <p className="text-xs text-neutral-500 mt-1 font-medium">
                      {course.provider}
                    </p>
                    <p className="text-xs text-neutral-600 mt-2 line-clamp-2 leading-relaxed">
                      {course.description}
                    </p>

                    <div className="flex flex-wrap gap-1.5 mt-3.5">
                      {course.skills.map((tag) => {
                        const isTargetMissing = missingSkills.includes(tag);
                        return (
                          <span
                            key={tag}
                            className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold border ${
                              isTargetMissing
                                ? 'bg-neutral-900 text-white border-neutral-900'
                                : 'bg-neutral-50 text-neutral-600 border-neutral-200'
                            }`}
                          >
                            {tag} {isTargetMissing && '· Bridges Gap'}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between">
                    <span className="text-[11px] text-neutral-500 font-medium">Verified Syllabus</span>
                    <a
                      href={course.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-black text-white font-semibold text-xs transition-colors cursor-pointer"
                    >
                      <span>Enroll / Free Audit</span>
                      <ExternalLink className="w-3 h-3 text-neutral-300" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : (
          <section className="rounded-2xl bg-white border border-neutral-200 p-6 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-neutral-100 border border-neutral-200 flex items-center justify-center text-neutral-900 shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-mono font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
                  100% Core Competency Achieved
                </span>
                <h2 className="text-base font-bold text-neutral-900 mt-1">
                  Master resume covers all 7 core bioinformatics requirements
                </h2>
                <p className="text-xs text-neutral-600 mt-0.5">
                  Verified matches: <span className="font-mono font-semibold text-neutral-900">{matchedSkills.join(', ')}</span>. Ready for direct submissions.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setActiveTab('tracker')}
              className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-black text-white font-semibold text-xs shadow-xs transition-colors shrink-0 cursor-pointer"
            >
              Apply to Matched Opportunities
            </button>
          </section>
        )
      )}

      {/* ============================================================== */}
      {/* 4. BIOINFORMATICS CAREER SPECIALIZATIONS & TRAJECTORIES         */}
      {/* Clean Editorial Cards with True Typographic Scannability       */}
      {/* ============================================================== */}
      {activeYouTubeTab === 'all' && (
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-neutral-200">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-semibold uppercase tracking-wider text-neutral-400">
                  Industry Pathways
                </span>
                <span className="text-neutral-300">&bull;</span>
                <span className="text-xs text-neutral-500 font-mono">
                  {filteredPathways.length} Curated Tracks
                </span>
              </div>
              <h2 className="text-xl font-bold text-neutral-900 mt-0.5">
                Explore Bioinformatics Career Pathways
              </h2>
            </div>

            <button
              type="button"
              onClick={() => setActiveTab('skills')}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-neutral-900 hover:bg-black text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer shrink-0"
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Explore All Skill Tracks</span>
            </button>
          </div>

          {/* Career Pathways Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPathways.map((path) => (
              <div
                key={path.id}
                className="rounded-xl bg-white hover:bg-neutral-50/60 border border-neutral-200 p-5 flex flex-col justify-between transition-all shadow-2xs group"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-600 border border-neutral-200">
                      {path.category}
                    </span>
                    <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-md bg-neutral-50 text-neutral-800 border border-neutral-200">
                      {path.demandBadge}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-neutral-900 leading-snug">
                    {path.title}
                  </h3>

                  {/* Compensation & Open Positions in Tabular Numerals */}
                  <div className="mt-3 p-3 rounded-lg bg-neutral-50 border border-neutral-200 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[10px] text-neutral-400 block font-mono uppercase tracking-wider">Salary Range</span>
                      <span className="text-xs font-bold font-mono text-neutral-900 tabular-nums">
                        {path.avgSalaryINR}{' '}
                        <span className="text-[10px] font-normal text-neutral-500">({path.avgSalaryUSD})</span>
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-neutral-400 block font-mono uppercase tracking-wider">Active Roles</span>
                      <span className="text-xs font-bold font-mono text-neutral-900 tabular-nums">
                        {path.openPositions} Openings
                      </span>
                    </div>
                  </div>

                  <p className="mt-3 text-xs text-neutral-600 line-clamp-2 leading-relaxed">
                    {path.description}
                  </p>

                  {/* Required Skills Tags */}
                  <div className="mt-4">
                    <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-neutral-400 block mb-1.5">
                      Required Skills:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {path.requiredSkills.map((sk) => {
                        const regex = new RegExp(`(^|\\W)${sk.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\W|$)`, 'i');
                        const isMatched = regex.test(allResumeTextLower);
                        return (
                          <span
                            key={sk}
                            className={`text-[11px] px-2 py-0.5 rounded-md font-mono border ${
                              isMatched
                                ? 'bg-neutral-900 text-white border-neutral-900 font-semibold'
                                : 'bg-white text-neutral-500 border-neutral-200'
                            }`}
                          >
                            {sk} {isMatched && '✓'}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {/* Top Hiring Companies */}
                  <div className="mt-3.5 pt-3 border-t border-neutral-100 flex items-center gap-1.5 text-xs text-neutral-500">
                    <Building2 className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                    <span className="truncate">Hiring: {path.topCompanies.join(', ')}</span>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-neutral-100 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('tracker')}
                    className="px-3 py-1.5 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    View Roles
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('skills')}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-black text-white font-semibold text-xs transition-colors cursor-pointer"
                  >
                    <span>View Skill Matrix</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ============================================================== */}
      {/* FILTER VIEWS: Jobs, Courses, Interview, ATS Matrix             */}
      {/* ============================================================== */}
      {activeYouTubeTab === 'jobs' && (
        <section className="space-y-6 animate-in fade-in">
          <div className="p-6 rounded-2xl bg-white border border-neutral-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="p-3 rounded-xl bg-neutral-100 text-neutral-800 border border-neutral-200 shrink-0">
                <Briefcase className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-neutral-900">
                  Jobs & Internships Pipeline
                </h2>
                <p className="text-xs sm:text-sm text-neutral-600 mt-0.5">
                  Track computational biology jobs and paid internships from submission to offer. Review verified openings from Illumina, Broad Institute, and Novartis.
                </p>
              </div>
            </div>

            <button
              onClick={() => setActiveTab('tracker')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-neutral-900 hover:bg-black text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer shrink-0"
            >
              <span>Open Dedicated Tracker Tab</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <OpportunitiesHub
            user={user}
            resume={resume}
            onSelectApplicationTab={() => setActiveTab('tracker')}
          />
        </section>
      )}

      {activeYouTubeTab === 'courses' && (
        <section className="space-y-6 animate-in fade-in">
          <div className="p-6 rounded-2xl bg-white border border-neutral-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="p-3 rounded-xl bg-neutral-100 text-neutral-800 border border-neutral-200 shrink-0">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-neutral-900">
                  Verified Courses & Free Audits
                </h2>
                <p className="text-xs sm:text-sm text-neutral-600 mt-0.5">
                  Accredited programs from University of Toronto, IIT Madras, and UC San Diego to master bioinformatics workflows.
                </p>
              </div>
            </div>

            <button
              onClick={() => setActiveTab('skills')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-neutral-900 hover:bg-black text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer shrink-0"
            >
              <span>Open Courses Tab</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {VERIFIED_COURSE_CATALOG.map((course) => (
              <div
                key={course.id}
                className="rounded-xl bg-white hover:bg-neutral-50/60 border border-neutral-200 p-5 flex flex-col justify-between transition-all shadow-2xs group"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-medium bg-neutral-100 text-neutral-700 border border-neutral-200">
                      {course.platformBadge}
                    </span>
                    <span className="px-2 py-0.5 rounded-md text-xs font-bold font-mono bg-neutral-100 text-neutral-800">
                      {course.price}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-neutral-900 leading-snug line-clamp-2">
                    {course.title}
                  </h3>
                  <p className="text-xs text-neutral-500 mt-1">{course.provider}</p>
                  <p className="text-xs text-neutral-600 mt-2 line-clamp-2 leading-relaxed">{course.description}</p>

                  <div className="flex flex-wrap gap-1.5 mt-3.5">
                    {course.skills.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 rounded-md text-[10px] font-mono font-medium bg-neutral-50 text-neutral-700 border border-neutral-200"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between">
                  <span className="text-[11px] text-neutral-500 font-medium">Verified Syllabus</span>
                  <a
                    href={course.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-black text-white font-semibold text-xs transition-colors cursor-pointer"
                  >
                    <span>Enroll / Audit Free</span>
                    <ExternalLink className="w-3 h-3 text-neutral-300" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {activeYouTubeTab === 'interview' && (
        <section className="space-y-6 animate-in fade-in">
          <div className="p-6 rounded-2xl bg-white border border-neutral-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="p-3 rounded-xl bg-neutral-100 text-neutral-800 border border-neutral-200 shrink-0">
                <Mic className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-neutral-900">
                  Live AI Mock Interview Simulator & STAR Rubric
                </h2>
                <p className="text-xs sm:text-sm text-neutral-600 mt-0.5">
                  Practice computational biology and bioinformatics technical interviews with live scoring and real-time STAR feedback.
                </p>
              </div>
            </div>

            <button
              onClick={onOpenMockInterview}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-neutral-900 hover:bg-black text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer shrink-0"
            >
              <span>Launch Simulator</span>
              <Mic className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-xl bg-white border border-neutral-200 space-y-3 shadow-2xs">
              <span className="text-xs font-mono font-medium text-neutral-400 uppercase tracking-wider block">Readiness Score</span>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-extrabold font-mono text-neutral-900 tabular-nums">{user.interviewReadiness || 88}%</span>
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">Benchmark Passed</span>
              </div>
              <p className="text-xs text-neutral-600 leading-relaxed">
                Calibrated against hiring criteria from Broad Institute, Illumina, and top biotech startups.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-white border border-neutral-200 space-y-3 shadow-2xs">
              <span className="text-xs font-mono font-medium text-neutral-400 uppercase tracking-wider block">Core Interview Domains</span>
              <ul className="text-xs text-neutral-700 space-y-2 font-medium">
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-neutral-900" /> NGS Alignment & Variant Calling (GATK)</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-neutral-900" /> Python / Biopython Algorithms</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-neutral-900" /> Cloud HPC & Nextflow Pipelines</li>
              </ul>
            </div>

            <div className="p-5 rounded-xl bg-white border border-neutral-200 space-y-3 flex flex-col justify-between shadow-2xs">
              <div>
                <span className="text-xs font-mono font-medium text-neutral-400 uppercase tracking-wider block">Next Scheduled Round</span>
                <p className="text-sm font-bold text-neutral-900 mt-1">Illumina / Strand Final Round</p>
                <p className="text-xs text-neutral-500 mt-0.5">High-throughput RNA-Seq differential analysis</p>
              </div>
              <button
                onClick={onOpenMockInterview}
                className="w-full py-2 rounded-lg bg-neutral-900 hover:bg-black text-white font-semibold text-xs transition-colors cursor-pointer"
              >
                Start Practice Drill
              </button>
            </div>
          </div>
        </section>
      )}

      {activeYouTubeTab === 'validation' && (
        <section className="space-y-6 animate-in fade-in">
          <div className="p-6 rounded-2xl bg-white border border-neutral-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="p-3 rounded-xl bg-neutral-100 text-neutral-800 border border-neutral-200 shrink-0">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-neutral-900">
                  7-Core Bioinformatics ATS Skill Validation
                </h2>
                <p className="text-xs sm:text-sm text-neutral-600 mt-0.5">
                  Continuous benchmark scan against 7 industry requirements for computational genomics screening.
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                if (onOpenResumeAnalyzer) onOpenResumeAnalyzer();
                else setActiveTab('analyzer');
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-neutral-900 hover:bg-black text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer shrink-0"
            >
              <span>Run Full ATS Audit</span>
              <SearchCode className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {CORE_BIOINFORMATICS_SKILLS.map((sk) => {
              const isValidated = matchedSkills.includes(sk.name);
              return (
                <div
                  key={sk.id}
                  className="p-4 rounded-xl border border-neutral-200 bg-white shadow-2xs flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-sm text-neutral-900">{sk.name}</span>
                    {isValidated ? (
                      <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        <Check className="w-3 h-3 text-emerald-700" /> Validated
                      </span>
                    ) : (
                      <span className="text-[11px] font-medium text-rose-800 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                        Missing
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-neutral-500 leading-relaxed">{sk.desc}</p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ============================================================== */}
      {/* 5. OPPORTUNITIES HUB: Verified Jobs & Internships              */}
      {/* ============================================================== */}
      {activeYouTubeTab === 'all' && (
        <OpportunitiesHub
          user={user}
          resume={resume}
          onSelectApplicationTab={() => setActiveTab('tracker')}
        />
      )}

      {/* ============================================================== */}
      {/* 6. BIOINFORMATICS INDUSTRY NEWS & BREAKTHROUGHS                */}
      {/* ============================================================== */}
      {activeYouTubeTab === 'all' && (
        <BioinformaticsNews onNavigateTab={setActiveTab} />
      )}

      {/* ============================================================== */}
      {/* 7. DATA VAULT & RECENT ACTIVITY FEED                           */}
      {/* ============================================================== */}
      {activeYouTubeTab === 'all' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column (2 Cols): Quick Action Pathways */}
          <div className="lg:col-span-2 space-y-4">
            <div className="p-5 rounded-2xl bg-white border border-neutral-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start sm:items-center gap-3.5">
                <div className="p-3 rounded-xl bg-neutral-100 text-neutral-800 border border-neutral-200 shrink-0">
                  <Database className="w-5 h-5 text-neutral-800" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-neutral-900">Career Intelligence & Instant Vault</h3>
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                      Live Synced
                    </span>
                  </div>
                  <p className="text-xs text-neutral-600 mt-1 leading-relaxed">
                    Resumes, job pipeline, courses, and interview scores auto-save continuously in real-time. Retrieve on demand.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {onOpenDataRetrieval && (
                  <button
                    onClick={onOpenDataRetrieval}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-neutral-900 hover:bg-black text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer"
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>Quick Retrieve</span>
                    <span className="hidden sm:inline text-[9px] bg-neutral-800 px-1 py-0.5 rounded font-mono">Ctrl+K</span>
                  </button>
                )}
                {onOpenDataVault && (
                  <button
                    onClick={onOpenDataVault}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-neutral-50 text-neutral-800 font-semibold text-xs border border-neutral-300 shadow-2xs transition-colors cursor-pointer"
                  >
                    <Database className="w-3.5 h-3.5 text-neutral-600" />
                    <span>Data Vault</span>
                  </button>
                )}
              </div>
            </div>

            {/* Upcoming Interview Milestones Card */}
            {upcomingInterviews.length > 0 && (
              <div className="rounded-2xl bg-white border border-neutral-200 p-5 shadow-xs">
                <div className="flex items-center justify-between mb-3.5 pb-2 border-b border-neutral-100">
                  <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-neutral-600" />
                    <span>Scheduled Interview Rounds</span>
                  </h3>
                  <button
                    onClick={() => setActiveTab('tracker')}
                    className="text-xs text-neutral-600 hover:text-neutral-900 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <span>View All in Tracker</span>
                    <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />
                  </button>
                </div>

                <div className="space-y-2.5">
                  {upcomingInterviews.slice(0, 2).map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl bg-neutral-50 border border-neutral-200 gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-neutral-900 text-white flex items-center justify-center font-bold text-xs font-mono">
                          {item.company.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-neutral-900">{item.company}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-neutral-200 text-neutral-800 font-semibold font-mono">
                              {item.stage.toUpperCase()}
                            </span>
                          </div>
                          <p className="text-xs text-neutral-600">{item.role}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 text-xs">
                        <div className="text-left sm:text-right">
                          <p className="font-semibold text-neutral-800">
                            {new Date(item.nextInterviewDate!).toLocaleDateString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </p>
                          <p className="text-[11px] text-neutral-500 font-mono">
                            {new Date(item.nextInterviewDate!).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                        <button
                          onClick={onOpenMockInterview}
                          className="px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-black text-white font-semibold text-xs transition-colors cursor-pointer"
                        >
                          Prep
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column (1 Col): Recent Activity Feed */}
          <div className="space-y-4">
            <div className="rounded-2xl bg-white border border-neutral-200 p-5 shadow-xs">
              <div className="flex items-center justify-between mb-3.5 pb-2 border-b border-neutral-100">
                <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-neutral-600" />
                  <span>Real-Time Activity Feed</span>
                </h3>
              </div>

              <div className="space-y-3">
                {activities.slice(0, 6).map((activity) => (
                  <div key={activity.id} className="flex items-start gap-2.5 text-xs">
                    <div className="w-1.5 h-1.5 rounded-full bg-neutral-900 mt-1.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-neutral-900 truncate">{activity.title}</p>
                      <p className="text-[11px] text-neutral-600 line-clamp-2 leading-relaxed">{activity.description}</p>
                      <span className="text-[10px] text-neutral-400 font-mono mt-0.5 block">{activity.timestamp}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
