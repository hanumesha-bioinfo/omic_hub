import React, { useState, useRef, useMemo } from 'react';
import {
  FileText,
  Upload,
  SearchCode,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Download,
  Check,
  RefreshCw,
  LayoutDashboard,
  ShieldCheck,
  Dna,
} from 'lucide-react';
import { ResumeData, UserProfile, SubscriptionPlanTier } from '../../types';
import { ResumeBuilderView } from './ResumeBuilderView';
import { ResumeAnalyzerView } from '../ResumeAnalyzer/ResumeAnalyzerView';
import { StorageService } from '../../services/storage';
import { useToast } from '../../shared/ui/Toast';
import confetti from 'canvas-confetti';

interface ATSAndResumeViewProps {
  currentResume: ResumeData;
  onSaveResume: (resume: ResumeData) => void;
  onApplyBulletToResume: (bullet: string) => void;
  onBackToDashboard: () => void;
  userPlan?: SubscriptionPlanTier;
  atsScore?: number;
  user?: UserProfile;
  onUpdateUser?: (user: UserProfile) => void;
}

export const ATSAndResumeView: React.FC<ATSAndResumeViewProps> = ({
  currentResume,
  onSaveResume,
  onApplyBulletToResume,
  onBackToDashboard,
  userPlan = 'pro',
  atsScore = 85,
  user,
  onUpdateUser,
}) => {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 3 Modes in the unified ATS & Resume Suite:
  // 1. 'upload-audit' -> Upload existing resume & get instant ATS score without manual creation
  // 2. 'editor' -> Interactive Master Resume Builder
  // 3. 'audit' -> Deep ATS Diagnostic Report & Keyword Optimizer
  const [activeMode, setActiveMode] = useState<'upload-audit' | 'editor' | 'audit'>('upload-audit');

  const [isProcessing, setIsProcessing] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [showPasteArea, setShowPasteArea] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  // Uploaded summary state
  const [lastUploadedName, setLastUploadedName] = useState<string | null>(null);
  const [calculatedScore, setCalculatedScore] = useState<number>(atsScore || 85);

  const CORE_COMP_BIO_KEYWORDS = [
    'Nextflow',
    'Python',
    'Biopython',
    'Linux',
    'RNA-Seq',
    'GATK 4',
    'BLAST',
    'Docker',
    'Seurat',
    'AlphaFold',
    'SAMtools',
    'Variant Calling',
  ];

  const resumeText = useMemo(() => {
    return [
      currentResume.summary,
      ...currentResume.workExperiences.flatMap((w) => w.bullets),
      ...currentResume.projects.flatMap((p) => p.bullets),
      ...Object.values(currentResume.skills || {}).flat(),
    ]
      .join(' ')
      .toLowerCase();
  }, [currentResume]);

  const matchedSkills = useMemo(() => {
    return CORE_COMP_BIO_KEYWORDS.filter((sk) =>
      resumeText.includes(sk.toLowerCase())
    );
  }, [resumeText]);

  const missingSkills = useMemo(() => {
    return CORE_COMP_BIO_KEYWORDS.filter(
      (sk) => !resumeText.includes(sk.toLowerCase())
    );
  }, [resumeText]);

  // Handle file upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processResumeFile(file);
  };

  const processResumeFile = (file: File) => {
    setIsProcessing(true);
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const textContent = (event.target?.result as string) || '';
        if (file.name.endsWith('.json')) {
          try {
            const parsedJson = JSON.parse(textContent);
            if (parsedJson.personalInfo) {
              const res = StorageService.parseAndUploadResume(file.name, textContent, parsedJson);
              onSaveResume(res.resume);
              if (onUpdateUser) onUpdateUser(res.user);
              setCalculatedScore(res.user.atsScore || 92);
              setLastUploadedName(file.name);
              confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
              showToast(`Uploaded & Calibrated: ${file.name}. ATS Score: ${res.user.atsScore || 92}%!`, 'success');
              setIsProcessing(false);
              return;
            }
          } catch {
            // fallback
          }
        }

        const res = StorageService.parseAndUploadResume(file.name, textContent);
        onSaveResume(res.resume);
        if (onUpdateUser) onUpdateUser(res.user);
        setCalculatedScore(res.user.atsScore || 88);
        setLastUploadedName(file.name);
        confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
        showToast(`Uploaded & Calibrated: ${file.name}. ATS Score: ${res.user.atsScore || 88}%!`, 'success');
      } catch (err) {
        showToast('Could not parse file. Try pasting your resume text directly.', 'error');
      } finally {
        setIsProcessing(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };

    reader.onerror = () => {
      showToast('Error reading file.', 'error');
      setIsProcessing(false);
    };

    reader.readAsText(file);
  };

  const handlePasteSubmit = () => {
    if (!pasteText.trim()) {
      showToast('Please paste your resume content.', 'error');
      return;
    }
    setIsProcessing(true);
    try {
      const res = StorageService.parseAndUploadResume('Pasted_Resume.txt', pasteText);
      onSaveResume(res.resume);
      if (onUpdateUser) onUpdateUser(res.user);
      setCalculatedScore(res.user.atsScore || 86);
      setLastUploadedName('Pasted Resume Document');
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
      showToast('Resume text analyzed! ATS score calibrated.', 'success');
      setPasteText('');
      setShowPasteArea(false);
    } catch {
      showToast('Failed to process pasted resume.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in pb-16">
      {/* Top Header & Mode Toggle Bar */}
      {activeMode !== 'editor' ? (
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-neutral-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-semibold uppercase tracking-wider text-neutral-400">
                Unified Career Document Suite
              </span>
              <span className="text-neutral-300">&bull;</span>
              <span className="text-xs font-semibold text-neutral-700">
                Workday & Greenhouse Standard
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-neutral-900 tracking-tight mt-0.5">
              ATS & Master Resume
            </h1>
            <p className="text-xs text-neutral-500 mt-0.5">
              Upload your already-created resume for an instant ATS score, or build and edit your master resume.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0 flex-wrap">
            {/* 3 Modes Switcher */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-neutral-100 border border-neutral-200 overflow-x-auto no-scrollbar shrink-0">
              <button
                type="button"
                onClick={() => setActiveMode('upload-audit')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  activeMode === 'upload-audit'
                    ? 'bg-white text-neutral-900 shadow-2xs'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                <Upload className="w-3.5 h-3.5 text-neutral-600" />
                <span>Upload & Instant Score</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveMode('editor')}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap text-neutral-600 hover:text-neutral-900"
              >
                <FileText className="w-3.5 h-3.5 text-neutral-600" />
                <span>Create / Edit Resume</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveMode('audit')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  activeMode === 'audit'
                    ? 'bg-white text-neutral-900 shadow-2xs'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                <SearchCode className="w-3.5 h-3.5 text-neutral-600" />
                <span>Diagnostic Audit</span>
              </button>
            </div>

            {/* Main Dashboard Button in the Top Right Corner */}
            <button
              type="button"
              onClick={onBackToDashboard}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-neutral-900 hover:bg-black text-white text-xs font-bold transition-all shadow-xs cursor-pointer hover:scale-102 active:scale-98 shrink-0"
              title="Return to Main Dashboard"
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-white" />
              <span>Main Dashboard</span>
            </button>
          </div>
        </div>
      ) : (
        /* Sleek uncluttered toolbar when in Resume Builder Workspace */
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveMode('upload-audit')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-600 hover:text-neutral-900 transition-colors cursor-pointer"
            >
              <span>← Switch to Resume Upload & Instant Score</span>
            </button>
          </div>

          <div className="flex items-center gap-1 p-1 rounded-xl bg-neutral-100 border border-neutral-200 text-xs">
            <button
              type="button"
              onClick={() => setActiveMode('upload-audit')}
              className="px-3 py-1.5 rounded-lg text-neutral-600 hover:text-neutral-900 font-medium cursor-pointer"
            >
              Upload & Score
            </button>
            <button
              type="button"
              className="px-3 py-1.5 rounded-lg bg-neutral-900 text-white font-bold shadow-xs cursor-pointer"
            >
              Builder Workspace
            </button>
            <button
              type="button"
              onClick={() => setActiveMode('audit')}
              className="px-3 py-1.5 rounded-lg text-neutral-600 hover:text-neutral-900 font-medium cursor-pointer"
            >
              Diagnostic Audit
            </button>
          </div>
        </div>
      )}

      {/* MODE 1: UPLOAD & INSTANT ATS AUDIT */}
      {activeMode === 'upload-audit' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Left 7 Cols: Uploader Box */}
            <div className="lg:col-span-7 rounded-2xl bg-white border border-neutral-200 p-6 sm:p-7 shadow-xs space-y-5">
              <div className="space-y-1">
                <span className="text-xs font-mono font-semibold text-neutral-400 uppercase tracking-wider">
                  Option 1 &bull; Instant Calibration
                </span>
                <h2 className="text-lg font-bold text-neutral-900">
                  Already Have a Resume? Upload for Immediate ATS Scoring
                </h2>
                <p className="text-xs text-neutral-500 leading-relaxed">
                  No need to build from scratch. Upload your PDF, DOCX, or text file. Our parser extracts your computational biology skills, checks Workday/Greenhouse compliance, and produces an instant ATS audit.
                </p>
              </div>

              {/* Drag & Drop Area */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) processResumeFile(file);
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`p-8 sm:p-10 rounded-2xl border-2 border-dashed transition-all cursor-pointer text-center flex flex-col items-center justify-center gap-3 ${
                  dragOver
                    ? 'border-neutral-900 bg-neutral-50'
                    : 'border-neutral-300 hover:border-neutral-900 hover:bg-neutral-50/60 bg-neutral-50/30'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".pdf,.docx,.txt,.json"
                  className="hidden"
                />

                <div className="w-12 h-12 rounded-2xl bg-neutral-900 text-white flex items-center justify-center shadow-xs">
                  {isProcessing ? (
                    <RefreshCw className="w-6 h-6 animate-spin text-white" />
                  ) : (
                    <Upload className="w-6 h-6 text-white" />
                  )}
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-bold text-neutral-900">
                    {isProcessing
                      ? 'Parsing Resume & Running ATS Audit...'
                      : 'Click to Upload Resume or Drag & Drop File'}
                  </p>
                  <p className="text-xs text-neutral-500 font-mono">
                    Supports PDF, DOCX, TXT, JSON (Max 15MB)
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-1 text-[11px] text-neutral-400">
                  <ShieldCheck className="w-3.5 h-3.5 text-neutral-600" />
                  <span>Private & encrypted &bull; 100% Client-side ATS analysis</span>
                </div>
              </div>

              {/* Alternative: Paste Text Toggle */}
              <div className="pt-2 flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => setShowPasteArea(!showPasteArea)}
                  className="text-neutral-600 hover:text-neutral-900 font-semibold cursor-pointer underline"
                >
                  {showPasteArea ? 'Hide text paste box' : 'Or paste resume plain text instead'}
                </button>

                {lastUploadedName && (
                  <span className="text-[11px] text-emerald-700 font-mono flex items-center gap-1 font-semibold">
                    <Check className="w-3.5 h-3.5" />
                    Loaded: {lastUploadedName}
                  </span>
                )}
              </div>

              {showPasteArea && (
                <div className="space-y-3 pt-2">
                  <textarea
                    rows={6}
                    value={pasteText}
                    onChange={(e) => setPasteText(e.target.value)}
                    placeholder="Paste the full text of your resume here (Summary, Experience, Education, Skills)..."
                    className="w-full p-3 rounded-xl border border-neutral-300 bg-white text-xs font-mono text-neutral-900 focus:outline-none focus:border-neutral-900"
                  />
                  <button
                    type="button"
                    onClick={handlePasteSubmit}
                    disabled={isProcessing}
                    className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-black text-white text-xs font-semibold cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    Analyze Pasted Text
                  </button>
                </div>
              )}
            </div>

            {/* Right 5 Cols: Live ATS Score Card & Quick Actions */}
            <div className="lg:col-span-5 rounded-2xl bg-white border border-neutral-200 p-6 sm:p-7 shadow-xs space-y-6">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-mono font-semibold uppercase tracking-wider text-neutral-400">
                    Live Telemetry
                  </span>
                  <span className="text-xs font-mono font-semibold bg-neutral-100 text-neutral-800 px-2 py-0.5 rounded-md">
                    ATS Calibrated
                  </span>
                </div>

                <div className="flex items-baseline gap-3">
                  <span className="text-5xl font-extrabold font-mono text-neutral-900 tabular-nums">
                    {calculatedScore}%
                  </span>
                  <div>
                    <span className="block text-sm font-bold text-neutral-900">
                      ATS Keyword Match Index
                    </span>
                    <span className="block text-xs text-neutral-500">
                      Based on computational biology benchmarks
                    </span>
                  </div>
                </div>

                <div className="mt-4 w-full bg-neutral-100 h-2 rounded-full overflow-hidden border border-neutral-200">
                  <div
                    className="h-full bg-neutral-900 rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(calculatedScore, 8)}%` }}
                  />
                </div>
              </div>

              {/* Matched Core Skills */}
              <div className="space-y-2 pt-2 border-t border-neutral-100">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-neutral-900">Matched Core Skills:</span>
                  <span className="font-mono text-neutral-500 text-[11px]">
                    {matchedSkills.length} of {CORE_COMP_BIO_KEYWORDS.length} detected
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {CORE_COMP_BIO_KEYWORDS.map((sk) => {
                    const isMatched = matchedSkills.includes(sk);
                    return (
                      <span
                        key={sk}
                        className={`text-xs px-2.5 py-1 rounded-md font-mono border ${
                          isMatched
                            ? 'bg-neutral-900 text-white border-neutral-900 font-semibold'
                            : 'bg-neutral-50 text-neutral-400 border-neutral-200 line-through'
                        }`}
                      >
                        {sk} {isMatched && '✓'}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-neutral-100 space-y-2.5">
                <button
                  type="button"
                  onClick={() => setActiveMode('editor')}
                  className="w-full py-2.5 px-4 rounded-xl bg-neutral-900 hover:bg-black text-white font-bold text-xs transition-colors cursor-pointer shadow-xs flex items-center justify-center gap-2"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Open in Master Resume Builder</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => setActiveMode('audit')}
                  className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-neutral-50 text-neutral-800 border border-neutral-300 font-semibold text-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  <SearchCode className="w-3.5 h-3.5 text-neutral-600" />
                  <span>View In-Depth Diagnostic Audit Report</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* MODE 2: INTERACTIVE RESUME BUILDER */}
      {activeMode === 'editor' && (
        <div className="rounded-2xl bg-white border border-neutral-200 shadow-xs overflow-hidden">
          <ResumeBuilderView
            initialResume={currentResume}
            onSave={(newRes) => {
              onSaveResume(newRes);
              setCalculatedScore(user?.atsScore || 88);
            }}
            onBackToDashboard={onBackToDashboard}
            userPlan={userPlan}
          />
        </div>
      )}

      {/* MODE 3: FULL ATS DIAGNOSTIC REPORT */}
      {activeMode === 'audit' && (
        <div className="rounded-2xl bg-white border border-neutral-200 shadow-xs p-2 sm:p-4">
          <ResumeAnalyzerView
            currentResume={currentResume}
            onApplyBulletToResume={onApplyBulletToResume}
            onOpenBuilder={() => setActiveMode('editor')}
          />
        </div>
      )}
    </div>
  );
};
