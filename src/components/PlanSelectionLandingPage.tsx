import React, { useState } from 'react';
import {
  Check,
  ChevronDown,
  Dna,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Crown,
  X,
  FileText,
  ArrowLeft,
} from 'lucide-react';
import { SubscriptionPlanTier, UserProfile } from '../types';
import type { ActiveTab } from '../app/navigation';
import confetti from 'canvas-confetti';
import { useToast } from '../shared/ui/Toast';

interface PlanSelectionLandingPageProps {
  user: UserProfile;
  onSelectPlan: (plan: SubscriptionPlanTier, targetTab?: ActiveTab) => void;
  isModal?: boolean;
  onCloseModal?: () => void;
  onNavigateTab?: (tab: ActiveTab) => void;
  isTabMode?: boolean;
}

export const PlanSelectionLandingPage: React.FC<PlanSelectionLandingPageProps> = ({
  user,
  onSelectPlan,
  isModal = false,
  onCloseModal,
  onNavigateTab,
  isTabMode = false,
}) => {
  const { showToast } = useToast();

  // Computational token / assessment capacity dropdowns
  const [proCapacity, setProCapacity] = useState<'10 Assessments' | '25 Assessments' | 'Unlimited'>('10 Assessments');
  const [teamCapacity, setTeamCapacity] = useState<'Unlimited' | 'Institutional Cohort'>('Unlimited');

  const [proDropdownOpen, setProDropdownOpen] = useState(false);
  const [teamDropdownOpen, setTeamDropdownOpen] = useState(false);

  const handleSelect = (tier: SubscriptionPlanTier, planName: string, targetTab: ActiveTab = 'builder') => {
    confetti({
      particleCount: 75,
      spread: 70,
      origin: { y: 0.6 },
    });
    showToast(`Selected ${planName} plan! Continuing to your calibrated workspace...`, 'success');
    onSelectPlan(tier, targetTab);
  };

  return (
    <div className="min-h-screen bg-[#fafbfc] text-neutral-900 font-sans selection:bg-neutral-900 selection:text-white flex flex-col justify-between">
      {/* ============================================================== */}
      {/* TOP HEADER: Clean White Header with Sky Blue Continue Button  */}
      {/* ============================================================== */}
      <header className="sticky top-0 z-40 w-full border-b border-neutral-200 bg-white/95 backdrop-blur-md px-4 sm:px-6 lg:px-12 py-3.5 flex items-center justify-between shadow-xs">
        {/* Left: OMIC HUB Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-neutral-900 text-white flex items-center justify-center shadow-xs">
            <Dna className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-black text-neutral-900 tracking-tight flex items-center gap-1.5">
            <span>OMIC HUB</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-700 border border-neutral-200 uppercase tracking-wider">
              Plans & Pricing
            </span>
          </span>
        </div>

        {/* Right Status & Navigation: Direct access to Resume Builder in Sky Blue */}
        <div className="flex items-center gap-2.5 sm:gap-4">
          <button
            type="button"
            onClick={() => {
              if (onNavigateTab) {
                onNavigateTab('builder');
              } else {
                handleSelect('basic', 'Free', 'builder');
              }
            }}
            className="text-xs px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold cursor-pointer transition-all shadow-sm flex items-center gap-2 border border-sky-500"
            title="Open Master ATS Resume Builder"
          >
            <FileText className="w-3.5 h-3.5 text-white" />
            <span>Continue to Resume Builder</span>
            <ArrowRight className="w-3.5 h-3.5 text-white" />
          </button>

          {isModal && onCloseModal && (
            <button
              onClick={onCloseModal}
              className="p-1.5 rounded-lg bg-neutral-100 text-neutral-700 hover:text-neutral-900 border border-neutral-200 transition-colors cursor-pointer ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </header>

      {/* ============================================================== */}
      {/* MAIN CONTENT: 4-COLUMN PRICING GRID                            */}
      {/* Plan boxes styled in clean Sky Blue as requested               */}
      {/* ============================================================== */}
      <main className="flex-1 max-w-[1400px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14">
        
        {/* Page Title & Subtitle */}
        <div className="mb-10 text-center md:text-left space-y-2">
          <p className="text-xs uppercase tracking-wider font-extrabold text-neutral-500 flex items-center gap-1.5 justify-center md:justify-start">
            <Sparkles className="w-3.5 h-3.5 text-neutral-700" />
            <span>OMIC HUB Career Acceleration Plans</span>
          </p>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-neutral-900 tracking-tight leading-snug">
            Plans & pricing:{' '}
            <span className="text-neutral-700">
              Computational biology career intelligence & lab placement
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-neutral-600 max-w-3xl">
            Choose the plan that fits your research, career acceleration, and industry calibration targets. First 3 months free on trial activation.
          </p>
        </div>

        {/* 4 Cards Grid - ONLY the plan boxes have the Sky Blue background */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 items-stretch">
          
          {/* ============================================================ */}
          {/* CARD 1: FREE (₹0) - Sky Blue Box                             */}
          {/* ============================================================ */}
          <div className="rounded-2xl bg-sky-50 border border-sky-200 p-6 flex flex-col justify-between hover:border-sky-300 transition-colors shadow-xs">
            <div>
              {/* Header */}
              <div className="mb-4">
                <h3 className="text-sm font-bold text-sky-950">Free</h3>
                <div className="mt-2 flex items-baseline">
                  <span className="text-4xl font-extrabold text-sky-950 tracking-tight">₹0</span>
                  <span className="text-xs text-sky-800 ml-1.5 font-medium">Free forever</span>
                </div>
              </div>

              {/* Action Button: "Your current plan" */}
              <button
                type="button"
                onClick={() => handleSelect('basic', 'Free')}
                className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-sky-100/60 text-sky-950 font-bold text-xs border border-sky-300 transition-colors cursor-pointer mb-6 shadow-2xs"
              >
                Your current plan
              </button>

              {/* Feature Checklist */}
              <div className="space-y-3 text-xs">
                <p className="font-bold text-sky-950 text-xs">You get:</p>

                <div className="flex items-start gap-2.5 text-sky-900">
                  <Check className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                  <span>Master ATS Resume Builder with bio templates</span>
                </div>
                <div className="flex items-start gap-2.5 text-sky-900">
                  <Check className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                  <span>Curated Bioinformatics News & Internship Feed</span>
                </div>
                <div className="flex items-start gap-2.5 text-sky-900">
                  <Check className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                  <span>Basic ATS Keyword Match Score</span>
                </div>
                <div className="flex items-start gap-2.5 text-sky-900">
                  <Check className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                  <span>Active Job Tracker pipeline (up to 3 roles)</span>
                </div>
                <div className="flex items-start gap-2.5 text-sky-900">
                  <Check className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                  <span>Standard PDF resume export</span>
                </div>
                <div className="flex items-start gap-2.5 text-sky-900">
                  <Check className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                  <span>Access to Coursera & NPTEL course directories</span>
                </div>
                <div className="flex items-start gap-2.5 text-sky-900">
                  <Check className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                  <span>Student community discussions</span>
                </div>
                <div className="flex items-start gap-2.5 text-sky-900">
                  <Check className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                  <span>Verified academic email profile</span>
                </div>
              </div>
            </div>
          </div>

          {/* ============================================================ */}
          {/* CARD 2: PLUS / STARTER (₹49) - Sky Blue Box                 */}
          {/* ============================================================ */}
          <div className="rounded-2xl bg-[#e0f2fe] border border-sky-300 p-6 flex flex-col justify-between hover:border-sky-400 transition-colors shadow-sm relative">
            <div>
              {/* Header */}
              <div className="mb-4">
                <h3 className="text-sm font-bold text-sky-950">Plus</h3>
                <div className="mt-2 flex items-baseline gap-1.5">
                  <span className="text-4xl font-extrabold text-sky-950 tracking-tight">₹49</span>
                  <div className="text-[11px] text-sky-800 leading-tight">
                    <div>per month</div>
                    <div className="text-sky-700 font-bold">3 Months Free</div>
                  </div>
                </div>
              </div>

              {/* Assessment capacity Dropdown Selector */}
              <div className="mb-3">
                <label className="text-[11px] font-semibold text-sky-900 block mb-1">ATS Audits & Assessments</label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setProDropdownOpen(!proDropdownOpen)}
                    className="w-full py-2 px-3 bg-white border border-sky-300 rounded-xl text-xs text-sky-950 flex items-center justify-between cursor-pointer hover:border-sky-400"
                  >
                    <span className="flex items-center gap-1.5 font-medium">
                      <span className="font-bold text-sky-700">🧬</span> {proCapacity}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-sky-700" />
                  </button>

                  {proDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-sky-200 rounded-xl shadow-lg z-20 py-1 text-xs">
                      {(['10 Assessments', '25 Assessments', 'Unlimited'] as const).map((amt) => (
                        <div
                          key={amt}
                          onClick={() => {
                            setProCapacity(amt);
                            setProDropdownOpen(false);
                          }}
                          className="px-3 py-1.5 hover:bg-sky-50 hover:text-sky-950 cursor-pointer flex items-center justify-between text-sky-900"
                        >
                          <span>{amt}</span>
                          {proCapacity === amt && <Check className="w-3 h-3 text-sky-600" />}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Button: Upgrade */}
              <button
                type="button"
                onClick={() => handleSelect('plus', 'Plus')}
                className="w-full py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer mb-6"
              >
                Upgrade to Plus
              </button>

              {/* Feature Checklist */}
              <div className="space-y-3 text-xs">
                <p className="font-bold text-sky-950 text-xs">You get:</p>

                <div className="flex items-start gap-2.5 text-sky-950">
                  <Check className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-sky-950">AI STAR-Method Bullet Improver</span>{' '}
                    <span className="text-sky-700 font-mono text-[11px]">(Quantified Impact)</span>
                  </div>
                </div>
                <div className="flex items-start gap-2.5 text-sky-950">
                  <Check className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                  <span>Real-Time Keyword Matching for Nextflow, GATK & Python</span>
                </div>
                <div className="flex items-start gap-2.5 text-sky-950">
                  <Check className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                  <span>Unlimited High-Res PDF Resume Downloads</span>
                </div>
                <div className="flex items-start gap-2.5 text-sky-950">
                  <Check className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                  <span>Direct Verified Recruiter Placement & In-App Easy Apply</span>
                </div>
                <div className="flex items-start gap-2.5 text-sky-950">
                  <Check className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                  <span>Unlimited Active Job Tracker with Kanban Pipeline</span>
                </div>
                <div className="flex items-start gap-2.5 text-sky-950">
                  <Check className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                  <span>Full Skill Paths & Computational Biology Modules</span>
                </div>
                <div className="flex items-start gap-2.5 text-sky-950">
                  <Check className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                  <span>Multi-device Real-Time Cloud Auto-Save</span>
                </div>
                <div className="flex items-start gap-2.5 text-sky-950">
                  <Check className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                  <span>Verified OMIC HUB Skill Badges & Certificates</span>
                </div>
              </div>
            </div>
          </div>

          {/* ============================================================ */}
          {/* CARD 3: PRO / CAREER ACCELERATOR (₹149) - Sky Blue Box       */}
          {/* ============================================================ */}
          <div className="rounded-2xl bg-[#bae6fd] border-2 border-sky-400 p-6 flex flex-col justify-between hover:border-sky-500 transition-all relative shadow-md">
            <div>
              {/* Header with POPULAR badge */}
              <div className="mb-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-extrabold text-sky-950 flex items-center gap-1.5">
                    <Crown className="w-4 h-4 text-sky-700" />
                    <span>Pro</span>
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full bg-sky-700 text-white font-black text-[10px] uppercase tracking-wider shadow-xs">
                    POPULAR
                  </span>
                </div>

                <div className="mt-2 flex items-baseline gap-1.5">
                  <span className="text-4xl font-extrabold text-sky-950 tracking-tight">₹149</span>
                  <div className="text-[11px] text-sky-900 leading-tight">
                    <div>per month</div>
                    <div className="text-sky-800 font-bold">First 3 Months Free</div>
                  </div>
                </div>
              </div>

              {/* Assessment capacity Dropdown */}
              <div className="mb-3">
                <label className="text-[11px] font-semibold text-sky-950 block mb-1">Career Intelligence Suite</label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setTeamDropdownOpen(!teamDropdownOpen)}
                    className="w-full py-2 px-3 bg-white border border-sky-400 rounded-xl text-xs text-sky-950 flex items-center justify-between cursor-pointer hover:border-sky-500"
                  >
                    <span className="flex items-center gap-1.5 font-medium">
                      <span className="font-bold text-sky-700">👑</span> {teamCapacity}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-sky-700" />
                  </button>

                  {teamDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-sky-300 rounded-xl shadow-lg z-20 py-1 text-xs">
                      {(['Unlimited', 'Institutional Cohort'] as const).map((amt) => (
                        <div
                          key={amt}
                          onClick={() => {
                            setTeamCapacity(amt);
                            setTeamDropdownOpen(false);
                          }}
                          className="px-3 py-1.5 hover:bg-sky-50 hover:text-sky-950 cursor-pointer flex items-center justify-between text-sky-950"
                        >
                          <span>{amt}</span>
                          {teamCapacity === amt && <Check className="w-3 h-3 text-sky-700" />}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Button: Upgrade to Pro */}
              <button
                type="button"
                onClick={() => handleSelect('pro', 'Pro')}
                className="w-full py-2.5 px-4 rounded-xl bg-neutral-900 hover:bg-black text-white font-bold text-xs shadow-sm transition-all cursor-pointer mb-6"
              >
                Upgrade to Pro (3 Months Free)
              </button>

              {/* Feature Checklist */}
              <div className="space-y-3 text-xs">
                <p className="font-bold text-sky-950 text-xs">Everything in Plus, plus:</p>

                <div className="flex items-start gap-2.5 text-sky-950">
                  <Check className="w-4 h-4 text-sky-700 shrink-0 mt-0.5" />
                  <span><strong>Gemini AI Mock Interviewer</strong> with dynamic voice audio</span>
                </div>
                <div className="flex items-start gap-2.5 text-sky-950">
                  <Check className="w-4 h-4 text-sky-700 shrink-0 mt-0.5" />
                  <span><strong>Genomics Question Banks</strong> (Broad Institute & Illumina rubric)</span>
                </div>
                <div className="flex items-start gap-2.5 text-sky-950">
                  <Check className="w-4 h-4 text-sky-700 shrink-0 mt-0.5" />
                  <span><strong>Workday & Greenhouse</strong> Caliber Real-Time ATS Audit</span>
                </div>
                <div className="flex items-start gap-2.5 text-sky-950">
                  <Check className="w-4 h-4 text-sky-700 shrink-0 mt-0.5" />
                  <span><strong>Fast-Track Lab Referrals:</strong> Schrödinger, Illumina, Strand</span>
                </div>
                <div className="flex items-start gap-2.5 text-sky-950">
                  <Check className="w-4 h-4 text-sky-700 shrink-0 mt-0.5" />
                  <span><strong>Data Vault & Revisions:</strong> 1-click snapshots & rollback</span>
                </div>
                <div className="flex items-start gap-2.5 text-sky-950">
                  <Check className="w-4 h-4 text-sky-700 shrink-0 mt-0.5" />
                  <span><strong>Priority 24/7</strong> Career Mentorship & Fast Support</span>
                </div>
              </div>
            </div>
          </div>

          {/* ============================================================ */}
          {/* CARD 4: ENTERPRISE (Custom) - Sky Blue Box                   */}
          {/* ============================================================ */}
          <div className="rounded-2xl bg-sky-50 border border-sky-200 p-6 flex flex-col justify-between hover:border-sky-300 transition-colors shadow-xs">
            <div>
              {/* Header */}
              <div className="mb-4">
                <h3 className="text-sm font-bold text-sky-950">Enterprise</h3>
                <div className="mt-2 flex items-baseline">
                  <span className="text-4xl font-extrabold text-sky-950 tracking-tight">Custom</span>
                </div>
              </div>

              {/* Sub-description */}
              <p className="text-xs text-sky-900 leading-relaxed mb-4 min-h-[40px]">
                For universities, research institutes, and biotech hiring teams needing cohort-wide benchmarks and direct placement.
              </p>

              {/* Action Button: "See a demo" */}
              <button
                type="button"
                onClick={() => handleSelect('pro', 'Enterprise')}
                className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-sky-100/60 text-sky-950 font-bold text-xs border border-sky-300 transition-colors cursor-pointer mb-6 shadow-2xs"
              >
                Request Lab Demo
              </button>

              {/* Feature Checklist */}
              <div className="space-y-3 text-xs">
                <p className="font-bold text-sky-950 text-xs">Everything in Pro, plus:</p>

                <div className="flex items-start gap-2.5 text-sky-900">
                  <Check className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                  <span>University Multi-Seat Campus Licenses</span>
                </div>
                <div className="flex items-start gap-2.5 text-sky-900">
                  <Check className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                  <span>Custom Bioinformatics Assessment Rubrics</span>
                </div>
                <div className="flex items-start gap-2.5 text-sky-900">
                  <Check className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                  <span>Dedicated Campus Placement Coordinator</span>
                </div>
                <div className="flex items-start gap-2.5 text-sky-900">
                  <Check className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                  <span>Direct Recruiter Candidate Pipeline & Shortlisting</span>
                </div>
                <div className="flex items-start gap-2.5 text-sky-900">
                  <Check className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                  <span>Institutional Analytics & Cohort Benchmarks</span>
                </div>
                <div className="flex items-start gap-2.5 text-sky-900">
                  <Check className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                  <span>Single Sign-On (SSO) & Academic Identity Sync</span>
                </div>
              </div>
            </div>
          </div>

        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-200 py-6 px-6 text-center text-xs text-neutral-500 bg-white">
        <span>&copy; 2026 OMIC HUB &bull; Career Acceleration Platform for Computational Biology</span>
      </footer>
    </div>
  );
};
