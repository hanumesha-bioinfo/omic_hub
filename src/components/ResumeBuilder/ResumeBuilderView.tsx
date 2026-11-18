import React, { useState, useMemo, useEffect } from 'react';
import {
  FileText,
  Sparkles,
  Download,
  Plus,
  Trash2,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  Printer,
  Eye,
  Sliders,
  Wand2,
  HelpCircle,
  Copy,
  History,
  Save,
  Clock,
  Check,
  RotateCcw,
  Upload,
  LayoutDashboard,
} from 'lucide-react';
import { ResumeData, WorkExperience, EducationItem, ProjectItem, CertificationItem } from '../../types';
import { ResumePreview } from './ResumePreview';
import { AIBulletImproverModal } from './AIBulletImproverModal';
import { useToast } from '../../shared/ui/Toast';
import { StorageService, ResumeRevision } from '../../services/storage';
import confetti from 'canvas-confetti';

interface ResumeBuilderViewProps {
  initialResume: ResumeData;
  onSave: (resume: ResumeData) => void;
  onBackToDashboard: () => void;
  isOnboarding?: boolean;
  onFinishOnboarding?: () => void;
  userPlan?: string;
}

const ACTION_VERBS = [
  'Architected',
  'Spearheaded',
  'Engineered',
  'Optimized',
  'Orchestrated',
  'Overhauled',
  'Automated',
  'Pioneered',
  'Scaled',
  'Streamlined',
  'Deployed',
  'Formulated',
];

export const ResumeBuilderView: React.FC<ResumeBuilderViewProps> = ({
  initialResume,
  onSave,
  onBackToDashboard,
  isOnboarding = false,
  onFinishOnboarding,
  userPlan,
}) => {
  const { showToast } = useToast();
  const [resume, setResume] = useState<ResumeData>({
    ...initialResume,
    theme: initialResume.theme || 'minimal',
  });
  const [activeStep, setActiveStep] = useState<number>(1);
  const [previewScale, setPreviewScale] = useState<number>(0.92);
  const [mobileTab, setMobileTab] = useState<'editor' | 'preview'>('editor');

  // Simple Mode Selection: Build from scratch or Upload existing resume
  const [entryMode, setEntryMode] = useState<'choose' | 'editor'>('editor');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const textContent = (event.target?.result as string) || '';
        let parsedJson: Partial<ResumeData> | undefined;
        if (file.name.endsWith('.json')) {
          try {
            parsedJson = JSON.parse(textContent);
          } catch {
            // fallback
          }
        }
        const res = StorageService.parseAndUploadResume(file.name, textContent, parsedJson);
        setResume(res.resume);
        onSave(res.resume);
        confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
        showToast(`Parsed & loaded resume: ${file.name}`, 'success');
        setEntryMode('editor');
      } catch {
        showToast('Failed to parse file. You can build from scratch or paste your details.', 'error');
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.onerror = () => {
      showToast('Error reading file. Please retry.', 'error');
      setIsUploading(false);
    };
    reader.readAsText(file);
  };

  // Real-time auto-save indicators
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');
  const [lastSavedTime, setLastSavedTime] = useState<string>('Just now');
  const [showRevisionsModal, setShowRevisionsModal] = useState<boolean>(false);
  const [revisions, setRevisions] = useState<ResumeRevision[]>([]);

  // Keep in sync if parent or external storage restores an updated resume
  useEffect(() => {
    setResume(initialResume);
  }, [initialResume]);

  // Load revisions on mount & updates
  useEffect(() => {
    setRevisions(StorageService.getRevisions());
  }, []);

  // AI Bullet improver state
  const [improverModal, setImproverModal] = useState<{
    open: boolean;
    text: string;
    section: string;
    onApply: (text: string) => void;
  }>({
    open: false,
    text: '',
    section: 'Experience',
    onApply: () => {},
  });

  // Dynamic Live AI ATS & Impact Score Calculation
  const liveScoreAnalysis = useMemo(() => {
    let score = 40;
    const suggestions: string[] = [];

    // Personal info check
    const { fullName, email, phone, location, linkedin, github } = resume.personalInfo;
    if (fullName && email && phone && location) {
      score += 15;
    } else {
      suggestions.push('Complete personal contact info (Name, Email, Phone, Location)');
    }
    if (linkedin || github) {
      score += 5;
    } else {
      suggestions.push('Add a LinkedIn or GitHub profile link for online credibility');
    }

    // Summary check
    if (resume.summary && resume.summary.length > 120) {
      score += 10;
    } else {
      suggestions.push('Write a punchy 2-3 sentence career summary with your primary specializations');
    }

    // Work experience & quantifiable metric count
    const totalBullets = resume.workExperiences.flatMap((e) => e.bullets);
    const quantifiedBullets = totalBullets.filter((b) =>
      /\b(\d+|%|\$|k|m|ms|sec|x)\b/i.test(b)
    );

    if (totalBullets.length >= 4) {
      score += 10;
    } else {
      suggestions.push('Add at least 4 accomplishment bullets across your experience');
    }

    if (quantifiedBullets.length >= 3) {
      score += 10;
    } else {
      suggestions.push('Include specific metrics (%, $, latency, or scale) in at least 3 bullets');
    }

    // Strong action verbs check
    const hasStrongVerbs = totalBullets.some((b) =>
      ACTION_VERBS.some((verb) => b.toLowerCase().startsWith(verb.toLowerCase()))
    );
    if (hasStrongVerbs) {
      score += 5;
    } else {
      suggestions.push('Start bullets with power action verbs like "Spearheaded", "Architected", or "Scaled"');
    }

    // Skills density
    const totalSkills =
      resume.skills.languages.length +
      resume.skills.frameworks.length +
      resume.skills.cloudDevOps.length +
      resume.skills.toolsAndDatabases.length;

    if (totalSkills >= 12) {
      score += 10;
    } else {
      suggestions.push('List at least 12 technical competencies across languages and tools');
    }

    // Education & projects
    if (resume.education.length > 0) score += 5;
    if (resume.projects.length > 0) score += 5;

    const clampedScore = Math.min(96, Math.max(45, score));
    return {
      score: clampedScore,
      suggestions,
      quantifiedCount: quantifiedBullets.length,
      totalBulletsCount: totalBullets.length,
    };
  }, [resume]);

  const updateResume = (updated: ResumeData) => {
    setSaveStatus('saving');
    setResume(updated);
    onSave(updated);
    setTimeout(() => {
      setSaveStatus('saved');
      setLastSavedTime(
        new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    }, 250);
  };

  // PDF Export Trigger
  const handleExportPDF = () => {
    confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
    showToast('Opening PDF Print Preview. Select "Save as PDF" destination.', 'info');
    setTimeout(() => {
      window.print();
    }, 400);
  };

  // Download Plaintext
  const handleDownloadText = () => {
    const textContent = `${resume.personalInfo.fullName.toUpperCase()}
${resume.personalInfo.headline}
Email: ${resume.personalInfo.email} | Phone: ${resume.personalInfo.phone} | Location: ${resume.personalInfo.location}
LinkedIn: ${resume.personalInfo.linkedin || 'N/A'} | GitHub: ${resume.personalInfo.github || 'N/A'}

==================================================
PROFESSIONAL SUMMARY
==================================================
${resume.summary}

==================================================
EXPERIENCE
==================================================
${resume.workExperiences
  .map(
    (exp) => `${exp.role} - ${exp.company} (${exp.startDate} - ${exp.current ? 'Present' : exp.endDate})
${exp.bullets.map((b) => `* ${b}`).join('\n')}`
  )
  .join('\n\n')}

==================================================
TECHNICAL SKILLS
==================================================
Languages: ${resume.skills.languages.join(', ')}
Frameworks: ${resume.skills.frameworks.join(', ')}
Cloud & DevOps: ${resume.skills.cloudDevOps.join(', ')}
Databases & Tools: ${resume.skills.toolsAndDatabases.join(', ')}
`;

    const blob = new Blob([textContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${resume.personalInfo.fullName.replace(/\s+/g, '_')}_Resume.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Plaintext resume downloaded!', 'success');
  };

  const steps = [
    { num: 1, title: 'Personal Info' },
    { num: 2, title: 'Education' },
    { num: 3, title: 'Experience' },
    { num: 4, title: 'Skills' },
    { num: 5, title: 'Projects' },
    { num: 6, title: 'Certifications' },
    { num: 7, title: 'Summary' },
  ];

  return (
    <div className="space-y-6 pb-20">
      
      {/* Top Header Bar & Action Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-neutral-200 shadow-sm text-neutral-900">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-xl font-black text-neutral-900 flex items-center gap-2 tracking-tight">
              <FileText className="w-5 h-5 text-neutral-900" />
              <span>Resume Builder & ATS Optimizer</span>
            </h1>
            <p className="text-xs text-neutral-500 mt-0.5">
              Precision Computational Biology &bull; Real-Time ATS Audit &bull; Workday & Greenhouse Standards
            </p>
          </div>
        </div>

        {/* Live Score Badge, Export Actions & Main Dashboard on Right Corner */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Live Auto-Save Real-time Status */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-100 border border-neutral-200 text-xs">
            {saveStatus === 'saving' ? (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                <span className="text-amber-700 font-semibold text-[11px]">Saving...</span>
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-neutral-500 text-[11px]">Saved:</span>
                <span className="text-emerald-700 font-semibold text-[11px]">{lastSavedTime}</span>
              </>
            )}
          </div>

          {/* Live ATS Counter */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-neutral-100 border border-neutral-200">
            <Sparkles className="w-3.5 h-3.5 text-neutral-900" />
            <span className="text-xs text-neutral-500">ATS Score:</span>
            <span
              className={`text-xs font-black ${
                liveScoreAnalysis.score >= 85
                  ? 'text-emerald-600'
                  : liveScoreAnalysis.score >= 70
                  ? 'text-neutral-900'
                  : 'text-amber-600'
              }`}
            >
              {liveScoreAnalysis.score}/100
            </span>
          </div>

          {/* Direct Upload / Import File Input */}
          <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border border-neutral-300 text-xs font-semibold transition-colors cursor-pointer">
            <Upload className="w-3.5 h-3.5 text-neutral-700" />
            <span>{isUploading ? 'Importing...' : 'Import Resume'}</span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.doc,.json,.txt"
              className="hidden"
              onChange={handleFileUpload}
              disabled={isUploading}
            />
          </label>

          {/* Template Style Selector */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-neutral-100 border border-neutral-200 text-xs">
            <span className="text-neutral-500 px-1 text-[11px]">Theme:</span>
            <button
              onClick={() => updateResume({ ...resume, theme: 'minimal' })}
              className={`px-2 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                resume.theme === 'minimal' ? 'bg-neutral-900 text-white shadow-sm' : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Clean Minimal
            </button>
            <button
              onClick={() => updateResume({ ...resume, theme: 'modern' })}
              className={`px-2 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                resume.theme === 'modern' ? 'bg-neutral-900 text-white shadow-sm' : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Modern
            </button>
            <button
              onClick={() => updateResume({ ...resume, theme: 'executive' })}
              className={`px-2 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                resume.theme === 'executive' ? 'bg-neutral-900 text-white shadow-sm' : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Executive
            </button>
          </div>

          {/* Export PDF Button */}
          <button
            onClick={handleExportPDF}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-neutral-900 hover:bg-black text-white font-bold text-xs shadow-md active:scale-95 transition-all cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Export as PDF</span>
          </button>

          <button
            onClick={handleDownloadText}
            className="p-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 hover:text-neutral-900 border border-neutral-300 transition-colors cursor-pointer"
            title="Download Plaintext / ATS Raw"
          >
            <Download className="w-4 h-4" />
          </button>

          {/* Main Dashboard Button positioned on the Right Corner */}
          <button
            onClick={onBackToDashboard}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-neutral-900 hover:bg-black text-white text-xs font-bold transition-all shadow-md cursor-pointer hover:scale-102 active:scale-98 shrink-0 ml-1"
            title="Return to Main Dashboard"
          >
            <LayoutDashboard className="w-4 h-4 text-white" />
            <span>Main Dashboard</span>
          </button>
        </div>
      </div>

      {/* Mobile Tab Switcher: Editor vs Live Preview */}
      <div className="flex lg:hidden p-1 rounded-xl bg-neutral-100 border border-neutral-200">
        <button
          onClick={() => setMobileTab('editor')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
            mobileTab === 'editor' ? 'bg-neutral-900 text-white shadow-xs' : 'text-neutral-600'
          }`}
        >
          Editor Steps
        </button>
        <button
          onClick={() => setMobileTab('preview')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
            mobileTab === 'preview' ? 'bg-neutral-900 text-white shadow-xs' : 'text-neutral-600'
          }`}
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Live Resume Preview</span>
        </button>
      </div>

      {/* Wizard Step Progress Pills */}
      <div className="flex items-center justify-between gap-1 overflow-x-auto pb-1 no-scrollbar">
        {steps.map((st) => {
          const isActive = activeStep === st.num;
          const isDone = activeStep > st.num;
          return (
            <button
              key={st.num}
              onClick={() => setActiveStep(st.num)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-neutral-900 text-white shadow-xs'
                  : isDone
                  ? 'bg-neutral-100 text-neutral-900 border border-neutral-200'
                  : 'bg-white text-neutral-600 border border-neutral-200 hover:text-neutral-900 hover:bg-neutral-50'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  isActive
                    ? 'bg-white text-neutral-900'
                    : isDone
                    ? 'bg-neutral-900 text-white'
                    : 'bg-neutral-200 text-neutral-600'
                }`}
              >
                {isDone ? <Check className="w-3 h-3" /> : st.num}
              </span>
              <span>{st.title}</span>
            </button>
          );
        })}
      </div>

      {/* Main Split Layout: Editor Wizard (Left) & Real-Time Preview (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Form Editor (6 cols) */}
        <div className={`lg:col-span-6 space-y-6 ${mobileTab === 'preview' ? 'hidden lg:block' : 'block'}`}>
          
          {/* STEP 1: Personal Info */}
          {activeStep === 1 && (
            <div className="rounded-2xl bg-white border border-neutral-200 p-6 space-y-5 shadow-xs text-neutral-900">
              <div className="border-b border-neutral-200 pb-3">
                <h2 className="text-base font-bold text-neutral-900">Step 1: Contact & Personal Details</h2>
                <p className="text-xs text-neutral-500 mt-0.5">
                  ATS parsers require standard contact info directly at the top of your resume.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={resume.personalInfo.fullName}
                    onChange={(e) =>
                      updateResume({
                        ...resume,
                        personalInfo: { ...resume.personalInfo, fullName: e.target.value },
                      })
                    }
                    className="w-full p-2.5 bg-white border border-neutral-300 rounded-xl text-xs text-neutral-900 focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 placeholder-neutral-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">Target Headline</label>
                  <input
                    type="text"
                    value={resume.personalInfo.headline}
                    onChange={(e) =>
                      updateResume({
                        ...resume,
                        personalInfo: { ...resume.personalInfo, headline: e.target.value },
                      })
                    }
                    className="w-full p-2.5 bg-white border border-neutral-300 rounded-xl text-xs text-neutral-900 focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 placeholder-neutral-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={resume.personalInfo.email}
                    onChange={(e) =>
                      updateResume({
                        ...resume,
                        personalInfo: { ...resume.personalInfo, email: e.target.value },
                      })
                    }
                    className="w-full p-2.5 bg-white border border-neutral-300 rounded-xl text-xs text-neutral-900 focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 placeholder-neutral-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={resume.personalInfo.phone}
                    onChange={(e) =>
                      updateResume({
                        ...resume,
                        personalInfo: { ...resume.personalInfo, phone: e.target.value },
                      })
                    }
                    className="w-full p-2.5 bg-white border border-neutral-300 rounded-xl text-xs text-neutral-900 focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 placeholder-neutral-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">Location (City, State/Country)</label>
                  <input
                    type="text"
                    value={resume.personalInfo.location}
                    onChange={(e) =>
                      updateResume({
                        ...resume,
                        personalInfo: { ...resume.personalInfo, location: e.target.value },
                      })
                    }
                    className="w-full p-2.5 bg-white border border-neutral-300 rounded-xl text-xs text-neutral-900 focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 placeholder-neutral-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">LinkedIn URL</label>
                  <input
                    type="text"
                    value={resume.personalInfo.linkedin || ''}
                    onChange={(e) =>
                      updateResume({
                        ...resume,
                        personalInfo: { ...resume.personalInfo, linkedin: e.target.value },
                      })
                    }
                    className="w-full p-2.5 bg-white border border-neutral-300 rounded-xl text-xs text-neutral-900 focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 placeholder-neutral-400"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">GitHub / Portfolio URL</label>
                  <input
                    type="text"
                    value={resume.personalInfo.github || ''}
                    onChange={(e) =>
                      updateResume({
                        ...resume,
                        personalInfo: { ...resume.personalInfo, github: e.target.value },
                      })
                    }
                    className="w-full p-2.5 bg-white border border-neutral-300 rounded-xl text-xs text-neutral-900 focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 placeholder-neutral-400"
                  />
                </div>
              </div>

              {/* Guidance Box */}
              <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200 flex items-start gap-3">
                <Lightbulb className="w-4 h-4 text-neutral-900 shrink-0 mt-0.5" />
                <div className="text-xs text-neutral-700 space-y-1">
                  <p className="font-semibold text-neutral-900">ATS Formatting Rule:</p>
                  <p className="text-neutral-500">
                    Always use standard text for phone numbers and emails. Never place contact info inside decorative header graphics, as legacy scanners skip image headers.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Educational Info */}
          {activeStep === 2 && (
            <div className="rounded-2xl bg-white border border-neutral-200 p-6 space-y-6 shadow-xs text-neutral-900">
              <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
                <div>
                  <h2 className="text-base font-bold text-neutral-900">Step 2: Educational Information</h2>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Degrees, universities, GPA, academic honors, and relevant high-impact coursework.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const newEdu: EducationItem = {
                      id: `edu_${Date.now()}`,
                      institution: 'University / Institute Name',
                      degree: 'M.S. in Bioinformatics & Computational Biology',
                      fieldOfStudy: 'Genomics & Data Science',
                      startDate: '2022-09',
                      endDate: '2024-05',
                      gpa: '3.92',
                      honors: 'Dean’s Honor List',
                      coursework: 'Next-Generation Sequencing, Algorithms in Bioinformatics, Statistical Genetics',
                    };
                    updateResume({ ...resume, education: [newEdu, ...resume.education] });
                    showToast('Added education entry', 'info');
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-black text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Degree</span>
                </button>
              </div>

              {resume.education.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-neutral-300 rounded-xl space-y-2 bg-neutral-50">
                  <p className="text-xs text-neutral-500">No education entries added yet.</p>
                  <button
                    type="button"
                    onClick={() => {
                      const newEdu: EducationItem = {
                        id: `edu_${Date.now()}`,
                        institution: 'Harvard University / Broad Institute',
                        degree: 'M.S. in Computational Biology & Bioinformatics',
                        fieldOfStudy: 'Genomics & Biomedical Informatics',
                        startDate: '2022-09',
                        endDate: '2024-05',
                        gpa: '3.94',
                        honors: 'Graduated with Distinction',
                        coursework: 'High-Throughput Sequencing, Machine Learning for Genomics, Structural Biology',
                      };
                      updateResume({ ...resume, education: [newEdu] });
                    }}
                    className="text-xs text-neutral-900 hover:underline font-semibold cursor-pointer"
                  >
                    + Add Sample Bioinformatics Degree
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {resume.education.map((edu, eIdx) => (
                    <div key={edu.id} className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-neutral-900">Education #{eIdx + 1}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const copy = resume.education.filter((_, i) => i !== eIdx);
                            updateResume({ ...resume, education: copy });
                          }}
                          className="text-neutral-400 hover:text-rose-600 p-1 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div>
                          <label className="text-neutral-700 mb-1 block font-semibold">Institution / University</label>
                          <input
                            type="text"
                            value={edu.institution}
                            onChange={(e) => {
                              const copy = [...resume.education];
                              copy[eIdx].institution = e.target.value;
                              updateResume({ ...resume, education: copy });
                            }}
                            className="w-full p-2 bg-white border border-neutral-300 rounded-lg text-neutral-900 focus:outline-none focus:border-neutral-900"
                          />
                        </div>
                        <div>
                          <label className="text-neutral-700 mb-1 block font-semibold">Degree & Major</label>
                          <input
                            type="text"
                            value={edu.degree}
                            onChange={(e) => {
                              const copy = [...resume.education];
                              copy[eIdx].degree = e.target.value;
                              updateResume({ ...resume, education: copy });
                            }}
                            className="w-full p-2 bg-white border border-neutral-300 rounded-lg text-neutral-900 focus:outline-none focus:border-neutral-900"
                          />
                        </div>
                        <div>
                          <label className="text-neutral-700 mb-1 block font-semibold">Field of Study / Department</label>
                          <input
                            type="text"
                            value={edu.fieldOfStudy}
                            onChange={(e) => {
                              const copy = [...resume.education];
                              copy[eIdx].fieldOfStudy = e.target.value;
                              updateResume({ ...resume, education: copy });
                            }}
                            className="w-full p-2 bg-white border border-neutral-300 rounded-lg text-neutral-900 focus:outline-none focus:border-neutral-900"
                          />
                        </div>
                        <div>
                          <label className="text-neutral-700 mb-1 block font-semibold">Dates (Start - Graduation / End)</label>
                          <input
                            type="text"
                            value={`${edu.startDate} - ${edu.endDate}`}
                            onChange={(e) => {
                              const parts = e.target.value.split('-');
                              const copy = [...resume.education];
                              copy[eIdx].startDate = parts[0]?.trim() || '';
                              copy[eIdx].endDate = parts.slice(1).join('-').trim() || '';
                              updateResume({ ...resume, education: copy });
                            }}
                            placeholder="2020 - 2024"
                            className="w-full p-2 bg-white border border-neutral-300 rounded-lg text-neutral-900 focus:outline-none focus:border-neutral-900"
                          />
                        </div>
                        <div>
                          <label className="text-neutral-700 mb-1 block font-semibold">GPA / Academic Standing</label>
                          <input
                            type="text"
                            value={edu.gpa || ''}
                            onChange={(e) => {
                              const copy = [...resume.education];
                              copy[eIdx].gpa = e.target.value;
                              updateResume({ ...resume, education: copy });
                            }}
                            placeholder="e.g. 3.92 / 4.0"
                            className="w-full p-2 bg-white border border-neutral-300 rounded-lg text-neutral-900 focus:outline-none focus:border-neutral-900"
                          />
                        </div>
                        <div>
                          <label className="text-neutral-700 mb-1 block font-semibold">Academic Honors & Awards</label>
                          <input
                            type="text"
                            value={edu.honors || ''}
                            onChange={(e) => {
                              const copy = [...resume.education];
                              copy[eIdx].honors = e.target.value;
                              updateResume({ ...resume, education: copy });
                            }}
                            placeholder="e.g. Summa Cum Laude, Graduate Fellowship"
                            className="w-full p-2 bg-white border border-neutral-300 rounded-lg text-neutral-900 focus:outline-none focus:border-neutral-900"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="text-neutral-700 mb-1 block font-semibold">Relevant Coursework</label>
                          <input
                            type="text"
                            value={edu.coursework || ''}
                            onChange={(e) => {
                              const copy = [...resume.education];
                              copy[eIdx].coursework = e.target.value;
                              updateResume({ ...resume, education: copy });
                            }}
                            placeholder="e.g. Nextflow Pipelines, Single-Cell Genomics, Biostatistics, Structural Biology"
                            className="w-full p-2 bg-white border border-neutral-300 rounded-lg text-neutral-900 focus:outline-none focus:border-neutral-900"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* STEP 3: Work Experience with XYZ Prompts */}
          {activeStep === 3 && (
            <div className="rounded-2xl bg-neutral-900 border border-neutral-800 p-6 space-y-6 shadow-xl shadow-none">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                <div>
                  <h2 className="text-base font-bold text-white">Step 3: Work Experience & XYZ Bullets</h2>
                  <p className="text-xs text-neutral-400/70 mt-0.5">
                    Structure achievements with Google’s formula: Accomplished [X], as measured by [Y], by doing [Z].
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const newExp: WorkExperience = {
                      id: `exp_${Date.now()}`,
                      company: 'New Company',
                      role: 'Software Engineer',
                      location: 'Remote',
                      startDate: '2024-01',
                      endDate: '',
                      current: true,
                      bullets: [
                        'Spearheaded development of core microservices, increasing data throughput by 35% across 100K active users.',
                      ],
                    };
                    updateResume({
                      ...resume,
                      workExperiences: [newExp, ...resume.workExperiences],
                    });
                    showToast('Added new work experience record', 'info');
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-black text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Role</span>
                </button>
              </div>

              {/* Action Verb Bank Bar */}
              <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200">
                <span className="text-[10px] font-bold text-neutral-900 uppercase tracking-wider block mb-2">
                  High-Impact Power Verbs (Click to Copy):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {ACTION_VERBS.map((verb) => (
                    <button
                      key={verb}
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(verb);
                        showToast(`Copied "${verb}" to clipboard!`, 'info');
                      }}
                      className="px-2 py-0.5 rounded-md bg-white hover:bg-neutral-100 border border-neutral-300 text-[11px] font-medium text-neutral-700 hover:text-neutral-900 transition-colors cursor-pointer"
                    >
                      {verb}
                    </button>
                  ))}
                </div>
              </div>

              {/* List of Experience Records */}
              <div className="space-y-6">
                {resume.workExperiences.map((exp, expIdx) => (
                  <div key={exp.id} className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-neutral-900 uppercase tracking-wide">
                        Experience #{expIdx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const filtered = resume.workExperiences.filter((_, i) => i !== expIdx);
                          updateResume({ ...resume, workExperiences: filtered });
                        }}
                        className="text-neutral-400 hover:text-rose-600 transition-colors p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-neutral-700 mb-1">Company</label>
                        <input
                          type="text"
                          value={exp.company}
                          onChange={(e) => {
                            const copy = [...resume.workExperiences];
                            copy[expIdx].company = e.target.value;
                            updateResume({ ...resume, workExperiences: copy });
                          }}
                          className="w-full p-2 bg-white border border-neutral-300 rounded-lg text-xs text-neutral-900 focus:outline-none focus:border-neutral-900"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-neutral-700 mb-1">Role Title</label>
                        <input
                          type="text"
                          value={exp.role}
                          onChange={(e) => {
                            const copy = [...resume.workExperiences];
                            copy[expIdx].role = e.target.value;
                            updateResume({ ...resume, workExperiences: copy });
                          }}
                          className="w-full p-2 bg-white border border-neutral-300 rounded-lg text-xs text-neutral-900 focus:outline-none focus:border-neutral-900"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-neutral-700 mb-1">Start Date</label>
                        <input
                          type="text"
                          value={exp.startDate}
                          onChange={(e) => {
                            const copy = [...resume.workExperiences];
                            copy[expIdx].startDate = e.target.value;
                            updateResume({ ...resume, workExperiences: copy });
                          }}
                          placeholder="YYYY-MM"
                          className="w-full p-2 bg-white border border-neutral-300 rounded-lg text-xs text-neutral-900 focus:outline-none focus:border-neutral-900"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-neutral-700 mb-1">End Date</label>
                        <input
                          type="text"
                          value={exp.endDate}
                          disabled={exp.current}
                          onChange={(e) => {
                            const copy = [...resume.workExperiences];
                            copy[expIdx].endDate = e.target.value;
                            updateResume({ ...resume, workExperiences: copy });
                          }}
                          placeholder={exp.current ? 'Present' : 'YYYY-MM'}
                          className="w-full p-2 bg-white border border-neutral-300 rounded-lg text-xs text-neutral-900 disabled:opacity-50 focus:outline-none focus:border-neutral-900"
                        />
                      </div>
                    </div>

                    {/* Bullet Points */}
                    <div className="space-y-2 pt-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-neutral-800">
                          Accomplishment Bullets (Quantified Outcomes):
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            const copy = [...resume.workExperiences];
                            copy[expIdx].bullets.push('Architected feature X, resulting in 25% faster load times.');
                            updateResume({ ...resume, workExperiences: copy });
                          }}
                          className="text-[10px] text-neutral-900 hover:underline font-semibold cursor-pointer"
                        >
                          + Add Bullet
                        </button>
                      </div>

                      {exp.bullets.map((bullet, bIdx) => (
                        <div key={bIdx} className="flex items-start gap-2">
                          <textarea
                            rows={2}
                            value={bullet}
                            onChange={(e) => {
                              const copy = [...resume.workExperiences];
                              copy[expIdx].bullets[bIdx] = e.target.value;
                              updateResume({ ...resume, workExperiences: copy });
                            }}
                            className="flex-1 p-2 bg-white border border-neutral-300 rounded-lg text-xs text-neutral-900 focus:outline-none focus:border-neutral-900"
                          />
                          <button
                            type="button"
                            title="Enhance this bullet with AI"
                            onClick={() =>
                              setImproverModal({
                                open: true,
                                text: bullet,
                                section: 'Work Experience',
                                onApply: (improved) => {
                                  const copy = [...resume.workExperiences];
                                  copy[expIdx].bullets[bIdx] = improved;
                                  updateResume({ ...resume, workExperiences: copy });
                                },
                              })
                            }
                            className="p-2 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-800 transition-colors shrink-0 cursor-pointer border border-neutral-300"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const copy = [...resume.workExperiences];
                              copy[expIdx].bullets = copy[expIdx].bullets.filter((_, i) => i !== bIdx);
                              updateResume({ ...resume, workExperiences: copy });
                            }}
                            className="p-2 text-neutral-400 hover:text-rose-600 transition-colors shrink-0 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 4: Technical & Soft Skills */}
          {activeStep === 4 && (
            <div className="rounded-2xl bg-white border border-neutral-200 p-6 space-y-6 shadow-xs text-neutral-900">
              <div className="border-b border-neutral-200 pb-3">
                <h2 className="text-base font-bold text-neutral-900">Step 4: Categorized Skills & Tech Stack</h2>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Comma-separated keywords matched directly against recruiter Boolean searches and ATS parsers.
                </p>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">
                    Programming Languages (Comma-separated)
                  </label>
                  <input
                    type="text"
                    value={resume.skills.languages.join(', ')}
                    onChange={(e) =>
                      updateResume({
                        ...resume,
                        skills: {
                          ...resume.skills,
                          languages: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                        },
                      })
                    }
                    className="w-full p-2.5 bg-white border border-neutral-300 rounded-xl text-neutral-900 focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 placeholder-neutral-400"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">
                    Frameworks & Genomic Pipelines (e.g. Nextflow, GATK 4, Seurat, Bioconductor)
                  </label>
                  <input
                    type="text"
                    value={resume.skills.frameworks.join(', ')}
                    onChange={(e) =>
                      updateResume({
                        ...resume,
                        skills: {
                          ...resume.skills,
                          frameworks: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                        },
                      })
                    }
                    className="w-full p-2.5 bg-white border border-neutral-300 rounded-xl text-neutral-900 focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 placeholder-neutral-400"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">
                    Cloud, HPC & DevOps (e.g. AWS Omics, SLURM, Docker, Singularity, Git)
                  </label>
                  <input
                    type="text"
                    value={resume.skills.cloudDevOps.join(', ')}
                    onChange={(e) =>
                      updateResume({
                        ...resume,
                        skills: {
                          ...resume.skills,
                          cloudDevOps: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                        },
                      })
                    }
                    className="w-full p-2.5 bg-white border border-neutral-300 rounded-xl text-neutral-900 focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 placeholder-neutral-400"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">
                    Databases, Structural Biology & Tooling (e.g. NCBI Entrez, Ensembl, PyMOL, AlphaFold 3)
                  </label>
                  <input
                    type="text"
                    value={resume.skills.toolsAndDatabases.join(', ')}
                    onChange={(e) =>
                      updateResume({
                        ...resume,
                        skills: {
                          ...resume.skills,
                          toolsAndDatabases: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                        },
                      })
                    }
                    className="w-full p-2.5 bg-white border border-neutral-300 rounded-xl text-neutral-900 focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 placeholder-neutral-400"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">
                    Leadership & Scientific Methodologies
                  </label>
                  <input
                    type="text"
                    value={resume.skills.softSkills.join(', ')}
                    onChange={(e) =>
                      updateResume({
                        ...resume,
                        skills: {
                          ...resume.skills,
                          softSkills: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                        },
                      })
                    }
                    className="w-full p-2.5 bg-white border border-neutral-300 rounded-xl text-neutral-900 focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 placeholder-neutral-400"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: Projects & Scientific Research */}
          {activeStep === 5 && (
            <div className="rounded-2xl bg-white border border-neutral-200 p-6 space-y-6 shadow-xs text-neutral-900">
              <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
                <div>
                  <h2 className="text-base font-bold text-neutral-900">Step 5: Featured Projects & Research</h2>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Demonstrate practical hands-on capability, pipeline ownership, and reproducible GitHub code.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const newProj: ProjectItem = {
                      id: `proj_${Date.now()}`,
                      name: 'Scalable Nextflow RNA-seq Variant Pipeline',
                      description: 'Containerized workflow processing 1,000+ patient samples',
                      technologies: ['Nextflow', 'Docker', 'GATK 4', 'R'],
                      link: 'https://github.com/myusername/rnaseq-pipeline',
                      bullets: ['Engineered automated GATK variant calling pipeline slashing processing latency by 60%.'],
                    };
                    updateResume({ ...resume, projects: [newProj, ...resume.projects] });
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-black text-white font-bold text-xs shadow-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Project</span>
                </button>
              </div>

              {resume.projects.map((proj, pIdx) => (
                <div key={proj.id} className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-3 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-neutral-900">Project #{pIdx + 1}</span>
                    <button
                      type="button"
                      onClick={() => {
                        const copy = resume.projects.filter((_, i) => i !== pIdx);
                        updateResume({ ...resume, projects: copy });
                      }}
                      className="text-neutral-400 hover:text-rose-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-neutral-700 mb-1 block font-semibold">Project Title</label>
                      <input
                        type="text"
                        value={proj.name}
                        onChange={(e) => {
                          const copy = [...resume.projects];
                          copy[pIdx].name = e.target.value;
                          updateResume({ ...resume, projects: copy });
                        }}
                        className="w-full p-2 bg-white border border-neutral-300 rounded-lg text-neutral-900 focus:outline-none focus:border-neutral-900"
                      />
                    </div>
                    <div>
                      <label className="text-neutral-700 mb-1 block font-semibold">Live Link / GitHub Repository</label>
                      <input
                        type="text"
                        value={proj.link || ''}
                        onChange={(e) => {
                          const copy = [...resume.projects];
                          copy[pIdx].link = e.target.value;
                          updateResume({ ...resume, projects: copy });
                        }}
                        className="w-full p-2 bg-white border border-neutral-300 rounded-lg text-neutral-900 focus:outline-none focus:border-neutral-900"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-neutral-700 mb-1 block font-semibold">Technologies Used (Comma-separated)</label>
                      <input
                        type="text"
                        value={proj.technologies.join(', ')}
                        onChange={(e) => {
                          const copy = [...resume.projects];
                          copy[pIdx].technologies = e.target.value.split(',').map((s) => s.trim()).filter(Boolean);
                          updateResume({ ...resume, projects: copy });
                        }}
                        className="w-full p-2 bg-white border border-neutral-300 rounded-lg text-neutral-900 focus:outline-none focus:border-neutral-900"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* STEP 6: Certifications & Licenses */}
          {activeStep === 6 && (
            <div className="rounded-2xl bg-white border border-neutral-200 p-6 space-y-6 shadow-xs text-neutral-900">
              <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
                <div>
                  <h2 className="text-base font-bold text-neutral-900">Step 6: Certifications & Licenses</h2>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Recognized credentials, EMBL-EBI / Coursera certificates, and verification IDs.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const newCert: CertificationItem = {
                      id: `cert_${Date.now()}`,
                      name: 'NGS Pipeline Architecture & GATK 4 Secondary Analysis',
                      issuer: 'Broad Institute / Omic Hub',
                      date: '2026-09',
                      credentialId: '',
                    };
                    updateResume({ ...resume, certifications: [newCert, ...resume.certifications] });
                    showToast('Added certification', 'info');
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-black text-white font-bold text-xs shadow-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Certification</span>
                </button>
              </div>

              {resume.certifications.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-neutral-300 rounded-xl space-y-2 bg-neutral-50">
                  <p className="text-xs text-neutral-500">No certifications listed yet.</p>
                  <button
                    type="button"
                    onClick={() => {
                      const newCert: CertificationItem = {
                        id: `cert_${Date.now()}`,
                        name: 'Nextflow & nf-core Reproducible Genomics Workflows',
                        issuer: 'EMBL-EBI',
                        date: '2026-08',
                        credentialId: '',
                      };
                      updateResume({ ...resume, certifications: [newCert] });
                    }}
                    className="text-xs text-neutral-900 hover:underline font-semibold cursor-pointer"
                  >
                    + Add Sample Certification
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {resume.certifications.map((cert, cIdx) => (
                    <div key={cert.id} className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-3 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-neutral-900">Certification #{cIdx + 1}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const copy = resume.certifications.filter((_, i) => i !== cIdx);
                            updateResume({ ...resume, certifications: copy });
                          }}
                          className="text-neutral-400 hover:text-rose-600 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-neutral-700 mb-1 block font-semibold">Credential Name</label>
                          <input
                            type="text"
                            value={cert.name}
                            onChange={(e) => {
                              const copy = [...resume.certifications];
                              copy[cIdx].name = e.target.value;
                              updateResume({ ...resume, certifications: copy });
                            }}
                            className="w-full p-2 bg-white border border-neutral-300 rounded-lg text-neutral-900 focus:outline-none focus:border-neutral-900"
                          />
                        </div>
                        <div>
                          <label className="text-neutral-700 mb-1 block font-semibold">Issuing Body / Institute</label>
                          <input
                            type="text"
                            value={cert.issuer}
                            onChange={(e) => {
                              const copy = [...resume.certifications];
                              copy[cIdx].issuer = e.target.value;
                              updateResume({ ...resume, certifications: copy });
                            }}
                            className="w-full p-2 bg-white border border-neutral-300 rounded-lg text-neutral-900 focus:outline-none focus:border-neutral-900"
                          />
                        </div>
                        <div>
                          <label className="text-neutral-700 mb-1 block font-semibold">Issue Date</label>
                          <input
                            type="text"
                            value={cert.date}
                            onChange={(e) => {
                              const copy = [...resume.certifications];
                              copy[cIdx].date = e.target.value;
                              updateResume({ ...resume, certifications: copy });
                            }}
                            placeholder="YYYY-MM"
                            className="w-full p-2 bg-white border border-neutral-300 rounded-lg text-neutral-900 focus:outline-none focus:border-neutral-900"
                          />
                        </div>
                        <div>
                          <label className="text-neutral-700 mb-1 block font-semibold">Credential ID / URL</label>
                          <input
                            type="text"
                            value={cert.credentialId || ''}
                            onChange={(e) => {
                              const copy = [...resume.certifications];
                              copy[cIdx].credentialId = e.target.value;
                              updateResume({ ...resume, certifications: copy });
                            }}
                            placeholder="e.g. CERT-98214"
                            className="w-full p-2 bg-white border border-neutral-300 rounded-lg text-neutral-900 focus:outline-none focus:border-neutral-900"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* STEP 7: Professional Summary & Final Review */}
          {activeStep === 7 && (
            <div className="rounded-2xl bg-white border border-neutral-200 p-6 space-y-5 shadow-xs text-neutral-900">
              <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
                <div>
                  <h2 className="text-base font-bold text-neutral-900">Step 7: Professional Career Summary & Review</h2>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    A punchy 3-4 sentence elevator pitch highlighting your core value, target specialization, and career achievements.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setImproverModal({
                      open: true,
                      text: resume.summary,
                      section: 'Professional Summary',
                      onApply: (improved) => updateResume({ ...resume, summary: improved }),
                    })
                  }
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-900 font-bold text-xs border border-neutral-300 transition-colors cursor-pointer"
                >
                  <Wand2 className="w-3.5 h-3.5 text-neutral-700" />
                  <span>Enhance Summary with AI</span>
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                  Master Summary Statement:
                </label>
                <textarea
                  rows={6}
                  value={resume.summary}
                  onChange={(e) => updateResume({ ...resume, summary: e.target.value })}
                  placeholder="Computational Biologist and Bioinformatics Scientist with graduate research expertise in high-throughput Next-Generation Sequencing (NGS) analysis, reproducible Nextflow workflows, and AlphaFold-driven structural modeling..."
                  className="w-full p-3.5 bg-white border border-neutral-300 rounded-xl text-xs text-neutral-900 leading-relaxed focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
                />
              </div>

              {/* Formula Guidance */}
              <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200 space-y-2 text-xs">
                <p className="font-bold text-neutral-900 flex items-center gap-1.5">
                  <Lightbulb className="w-3.5 h-3.5 text-neutral-900" />
                  <span>The Winning 3-Sentence Formula:</span>
                </p>
                <p className="text-neutral-600 leading-relaxed">
                  <span className="text-neutral-900 font-medium">Sentence 1:</span> [Title] with [X years] specializing in [Core Domains].
                </p>
                <p className="text-neutral-600 leading-relaxed">
                  <span className="text-neutral-900 font-medium">Sentence 2:</span> Proven success [Biggest Quantitative Achievement: e.g. processed 1,400+ libraries with 99.4% reproducibility].
                </p>
                <p className="text-neutral-600 leading-relaxed">
                  <span className="text-neutral-900 font-medium">Sentence 3:</span> Deep expertise in [Top 4 Technologies] and passionate about [Target Role Mission].
                </p>
              </div>
            </div>
          )}

          {/* Wizard Next / Prev Controls */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              disabled={activeStep === 1}
              onClick={() => setActiveStep((prev) => Math.max(1, prev - 1))}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white hover:bg-neutral-100 border border-neutral-300 text-neutral-800 font-semibold text-xs transition-colors disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous Step</span>
            </button>

            {activeStep < 7 ? (
              <button
                type="button"
                onClick={() => setActiveStep((prev) => Math.min(7, prev + 1))}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-neutral-900 hover:bg-black text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
              >
                <span>Next: {steps[activeStep].title}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <div className="flex items-center gap-2">
                {isOnboarding && (
                  <button
                    type="button"
                    onClick={onFinishOnboarding || onBackToDashboard}
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-neutral-900 hover:bg-black text-white font-bold text-xs shadow-xs transition-all active:scale-95 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Complete Setup & Launch Dashboard</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleExportPDF}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-neutral-900 hover:bg-black text-white font-bold text-xs shadow-xs transition-all active:scale-95 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Export Final Resume (PDF)</span>
                </button>
              </div>
            )}
          </div>

          {/* Live AI ATS Suggestions Box */}
          <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-neutral-900 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-neutral-900" />
                <span>Live ATS Content Suggestions</span>
              </h3>
              <span className="text-[10px] text-neutral-600 font-bold">
                {liveScoreAnalysis.quantifiedCount} Metric Bullets Detected
              </span>
            </div>

            {liveScoreAnalysis.suggestions.length > 0 ? (
              <div className="space-y-1.5 text-xs">
                {liveScoreAnalysis.suggestions.map((sug, i) => (
                  <div key={i} className="flex items-start gap-2 text-neutral-600">
                    <span className="text-neutral-900 mt-0.5">•</span>
                    <p className="text-[11px] leading-relaxed">{sug}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-neutral-700 flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Excellent! All core ATS criteria, metrics, and sections are satisfied.</span>
              </p>
            )}
          </div>

        </div>

        {/* Right Column: Live Printable Preview (6 cols) */}
        <div className={`lg:col-span-6 space-y-4 ${mobileTab === 'editor' ? 'hidden lg:block' : 'block'}`}>
          <div className="flex items-center justify-between px-2">
            <span className="text-xs font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-neutral-700" />
              <span>Real-Time PDF Canvas</span>
            </span>

            {/* Zoom Controls */}
            <div className="flex items-center gap-1.5 text-xs text-neutral-700">
              <button
                onClick={() => setPreviewScale((s) => Math.max(0.7, s - 0.05))}
                className="px-2 py-0.5 rounded bg-white border border-neutral-300 hover:bg-neutral-100 cursor-pointer"
              >
                -
              </button>
              <span className="font-mono text-[11px] font-semibold">{Math.round(previewScale * 100)}%</span>
              <button
                onClick={() => setPreviewScale((s) => Math.min(1.15, s + 0.05))}
                className="px-2 py-0.5 rounded bg-white border border-neutral-300 hover:bg-neutral-100 cursor-pointer"
              >
                +
              </button>
            </div>
          </div>

          {/* Preview Container */}
          <div className="rounded-2xl bg-neutral-100 border border-neutral-200 p-4 sm:p-6 overflow-hidden shadow-xs flex justify-center">
            <ResumePreview resume={resume} scale={previewScale} />
          </div>
        </div>

      </div>

      {/* AI Bullet Improver Modal */}
      {improverModal.open && (
        <AIBulletImproverModal
          initialText={improverModal.text}
          section={improverModal.section}
          role={resume.personalInfo.headline || 'Software Engineer'}
          onApply={improverModal.onApply}
          onClose={() => setImproverModal({ ...improverModal, open: false })}
        />
      )}

      {/* Resume Revisions & Rollback Modal */}
      {showRevisionsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-white border border-neutral-200 rounded-2xl shadow-2xl p-5 space-y-4 text-neutral-900">
            <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-neutral-900" />
                <h3 className="text-sm font-bold text-neutral-900">Resume Revision Snapshots</h3>
              </div>
              <button
                onClick={() => setShowRevisionsModal(false)}
                className="text-neutral-400 hover:text-neutral-900 p-1 cursor-pointer"
              >
                &times;
              </button>
            </div>

            <p className="text-xs text-neutral-500">
              Each auto-save and manual snapshot is securely tracked. You can roll back to any previous state at any time.
            </p>

            <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
              {revisions.length === 0 ? (
                <div className="text-center py-6 text-xs text-neutral-400">
                  No revisions yet. Changes are auto-saved in real-time.
                </div>
              ) : (
                revisions.map((rev) => (
                  <div
                    key={rev.id}
                    className="p-3 rounded-xl bg-neutral-50 border border-neutral-200 flex items-center justify-between gap-3 hover:border-neutral-400 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-neutral-900 truncate">{rev.title}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-200 text-neutral-700">
                          {rev.changeNote || 'Auto-save'}
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-500 mt-0.5">
                        {new Date(rev.timestamp).toLocaleString()} • {rev.data.workExperiences.length} Roles
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        updateResume(rev.data);
                        setShowRevisionsModal(false);
                        showToast('Reverted to selected resume revision!', 'success');
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-neutral-900 hover:bg-black text-white font-bold text-xs transition-colors shrink-0 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Rollback</span>
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-neutral-200">
              <button
                onClick={() => setShowRevisionsModal(false)}
                className="px-4 py-1.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-xs font-semibold text-neutral-700 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
export default ResumeBuilderView;
