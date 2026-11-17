import React, { useState } from 'react';
import {
  Crown,
  Sparkles,
  Check,
  X,
  ArrowRight,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { SubscriptionPlanTier, UserProfile } from '../types';
import { useToast } from '../shared/ui/Toast';

export interface SubscriptionPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade: (tier: SubscriptionPlanTier) => void;
  onCheckout: () => Promise<void>;
  user: UserProfile;
  initialSelectedTier?: SubscriptionPlanTier;
  triggeredByFeature?: string;
}

export const SubscriptionPlanModal: React.FC<SubscriptionPlanModalProps> = ({
  isOpen,
  onClose,
  onUpgrade,
  onCheckout,
  user,
  initialSelectedTier = 'premium',
  triggeredByFeature,
}) => {
  const { showToast } = useToast();
  const [selectedTier, setSelectedTier] = useState<SubscriptionPlanTier>(initialSelectedTier);

  if (!isOpen) return null;

  const handleSelectFree = () => {
    onUpgrade('free');
    showToast('Switched to Free Tier (₹0).', 'info');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      {/* Dark Glassmorphism Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/85 backdrop-blur-xl transition-opacity"
        onClick={onClose}
      />

      {/* Main Modal Card */}
      <div className="relative w-full max-w-5xl bg-white border border-neutral-200 rounded-3xl shadow-2xl overflow-hidden z-10 my-8 flex flex-col text-neutral-900">
        
        {/* Header */}
        <div className="p-6 sm:p-8 pb-4 relative border-b border-neutral-100">
          <button
            onClick={onClose}
            className="absolute top-6 right-6 p-2 rounded-xl text-neutral-400 hover:text-neutral-900 bg-neutral-100 hover:bg-neutral-200 transition-colors border border-neutral-200 cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-100 text-sky-900 text-xs font-bold border border-sky-200">
                <Sparkles className="w-3.5 h-3.5 text-sky-700" />
                <span>Transparent Bioinformatics Career Plans</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-neutral-900">
                {triggeredByFeature
                  ? `Upgrade to Access ${triggeredByFeature}`
                  : 'Choose Your Career Acceleration Plan'}
              </h2>
              <p className="text-xs sm:text-sm text-neutral-600 max-w-2xl">
                Unlock full AI resume audits, live computational biology mock interviews, and advanced bioinformatics pipelines data vault.
              </p>
            </div>

            {/* One-time pricing badge */}
            <div className="p-3 rounded-2xl bg-sky-50 border border-sky-200 text-left shrink-0 sm:max-w-xs shadow-2xs">
              <div className="flex items-center gap-1.5 text-sky-950 font-bold text-xs">
                <Zap className="w-3.5 h-3.5 text-sky-700" />
                <span>One-time Payment</span>
              </div>
              <p className="text-[11px] text-sky-800 mt-0.5">
                Premium is ₹49 once. Pay a single time and keep access.
              </p>
            </div>
          </div>
        </div>

        {/* Two clear plan cards in sky blue */}
        <div className="p-6 sm:p-8 pt-4 grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* CARD 1: Free (₹0) - Sky Blue Box */}
          <div
            className={`relative rounded-3xl p-6 flex flex-col justify-between border transition-all duration-300 bg-sky-50 text-sky-950 ${
              selectedTier === 'free'
                ? 'border-sky-400 shadow-md ring-1 ring-sky-400'
                : 'border-sky-200 hover:border-sky-300'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-sky-800">Core Access</span>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-white text-sky-900 border border-sky-200">
                  Free Forever
                </span>
              </div>

              <h3 className="text-xl font-bold text-sky-950 mb-1">Free Tier</h3>
              <p className="text-xs text-sky-800 mb-5 min-h-[32px]">
                Basic Resume & Course Directory for students getting started.
              </p>

              {/* Price */}
              <div className="p-3.5 rounded-2xl bg-white border border-sky-200 mb-5">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-sky-950">₹0</span>
                  <span className="text-xs text-sky-700">/ forever</span>
                </div>
                <p className="text-[10px] text-sky-700 font-semibold mt-1">
                  100% Free &bull; No card required
                </p>
              </div>

              {/* Features List */}
              <div className="space-y-2.5 text-xs text-sky-900 mb-6">
                <div className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                  <span>Basic Master Resume Builder (Standard format)</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                  <span>Full Course Directory (Free Coursera & NPTEL)</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                  <span>Plaintext & standard PDF export</span>
                </div>
                <div className="flex items-start gap-2 text-neutral-400">
                  <X className="w-4 h-4 text-neutral-400 shrink-0 mt-0.5" />
                  <span>AI Resume Audit & ATS Scorer</span>
                </div>
                <div className="flex items-start gap-2 text-neutral-400">
                  <X className="w-4 h-4 text-neutral-400 shrink-0 mt-0.5" />
                  <span>Live AI Mock Interview Simulator</span>
                </div>
              </div>
            </div>

            {user.planTier === 'premium' ? (
              <span className="w-full py-3 text-center text-xs font-semibold text-sky-700">
                Included with Premium
              </span>
            ) : (
              <button
                type="button"
                onClick={handleSelectFree}
                className="w-full py-3 px-4 rounded-2xl font-bold text-xs bg-white hover:bg-sky-100 text-sky-950 border border-sky-300 transition-all cursor-pointer shadow-2xs"
              >
                {user.planTier === 'free' ? 'Current Plan' : 'Continue with Free (₹0)'}
              </button>
            )}
          </div>

          {/* CARD 2: Premium (₹49 once) - Sky Blue Box */}
          <div
            className={`relative rounded-3xl p-6 flex flex-col justify-between border-2 transition-all duration-300 bg-[#bae6fd] text-sky-950 ${
              selectedTier === 'premium'
                ? 'border-sky-500 shadow-xl ring-2 ring-sky-400/50'
                : 'border-sky-400 hover:border-sky-500'
            }`}
          >
            {/* Top Recommended Pill */}
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-sky-700 text-white font-black text-[10px] uppercase tracking-wider shadow-xs">
              👑 Recommended
            </div>

            <div>
              <div className="flex items-center justify-between mb-3 mt-1">
                <span className="text-xs font-bold uppercase tracking-wider text-sky-900">Ultimate Suite</span>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-white text-sky-900 border border-sky-300">
                  One-time payment
                </span>
              </div>

              <h3 className="text-xl font-bold text-sky-950 mb-1">Premium Tier</h3>
              <p className="text-xs text-sky-800 mb-5 min-h-[32px]">
                AI Mock Interview, Data Vault, and priority application tracking.
              </p>

              {/* Price */}
              <div className="p-3.5 rounded-2xl bg-white border border-sky-300 mb-5">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-extrabold text-sky-950">₹49</span>
                  <span className="text-xs text-sky-800 font-bold">one-time</span>
                </div>
                <p className="text-[10px] text-sky-700 font-semibold mt-1">
                  Pay once. No monthly charges.
                </p>
              </div>

              {/* Features List */}
              <div className="space-y-2.5 text-xs text-sky-950 mb-6">
                <div className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-sky-700 shrink-0 mt-0.5" />
                  <span><strong>AI Mock Interviewer</strong> with live voice & STAR scoring</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-sky-700 shrink-0 mt-0.5" />
                  <span><strong>Data Vault:</strong> Multi-revision snapshots & cloud restore</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-sky-700 shrink-0 mt-0.5" />
                  <span><strong>Direct Internship Applications</strong> & priority referral</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-sky-700 shrink-0 mt-0.5" />
                  <span><strong>Full ATS Engine</strong> with Workday & Greenhouse rubrics</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-sky-700 shrink-0 mt-0.5" />
                  <span>Curated Broad/Illumina Computational Biology questions</span>
                </div>
              </div>
            </div>

            {user.planTier === 'premium' ? (
              <button
                type="button"
                disabled
                className="w-full py-3.5 px-4 rounded-2xl font-extrabold text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Premium Active</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => { void onCheckout(); }}
                className="w-full py-3.5 px-4 rounded-2xl font-extrabold text-xs bg-neutral-900 hover:bg-black text-white shadow-md transition-all hover:scale-102 active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Crown className="w-4 h-4 text-amber-400" />
                <span>Choose Premium (₹49 once)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Footer Guarantee */}
        <div className="p-4 px-6 sm:px-8 border-t border-neutral-200 bg-neutral-50 flex items-center justify-between text-xs text-neutral-600">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>One-time ₹49 payment &bull; Pay securely &bull; Powered by Razorpay</span>
          </div>
          <span className="text-[11px] text-neutral-500 hidden sm:inline">
            OMIC HUB Plans
          </span>
        </div>
      </div>

    </div>
  );
};
