import React from 'react';
import { Award, CheckCircle2, ShieldCheck, GraduationCap } from 'lucide-react';
import { UserProfile, ResumeData } from '../../types';
import { StorageService } from '../../services/storage';

interface CertificationsViewProps {
  user: UserProfile;
  resume: ResumeData;
  onNavigateSkills?: () => void;
}

export const CertificationsView: React.FC<CertificationsViewProps> = ({
  user,
  resume,
  onNavigateSkills,
}) => {
  const certifiedBadges = StorageService.getCertifiedBadges();

  return (
    <div className="space-y-6 animate-in fade-in pb-16">
      {/* Header Banner */}
      <div className="p-6 sm:p-7 rounded-2xl bg-white border border-neutral-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-neutral-400">
              Verified Credentials
            </span>
            <span className="text-neutral-300">&bull;</span>
            <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              Server-Issued
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight mt-1">
            Bioinformatics Certifications & Verified Credentials
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 mt-1 max-w-2xl leading-relaxed">
            Credentials earned through an assessed mock interview are issued and signed by the server. Each badge carries a verification URL you can share with recruiters and labs.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onNavigateSkills && (
            <button
              type="button"
              onClick={onNavigateSkills}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-neutral-900 hover:bg-black text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Earn New Skill Certifications</span>
            </button>
          )}
        </div>
      </div>

      {/* Verified Skill Badges Section */}
      <div className="rounded-2xl bg-white border border-neutral-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h2 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
              <Award className="w-4 h-4 text-neutral-700" />
              <span>OMIC HUB Verified Skill Badges</span>
            </h2>
            <p className="text-xs text-neutral-500">
              Digital proof of competency assessed via live code executions and pipeline testing.
            </p>
          </div>
          <span className="text-xs font-mono text-neutral-500 font-semibold bg-neutral-100 px-2.5 py-1 rounded-md">
            {certifiedBadges.length} Badges Issued
          </span>
        </div>

        {certifiedBadges.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-neutral-300 rounded-xl bg-neutral-50">
            <p className="text-xs text-neutral-500">
              No verified badges yet. Pass a mock interview assessment to earn one.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {certifiedBadges.map((badge) => (
              <div
                key={badge.id}
                className="p-4 rounded-xl border border-neutral-200 bg-neutral-50/60 flex flex-col justify-between hover:border-neutral-300 transition-all"
              >
                <div>
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="font-mono text-[11px] font-semibold text-neutral-500 uppercase">
                      {badge.level}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-neutral-900 text-white">
                      {badge.score}% Score
                    </span>
                  </div>
                  <h3 className="text-xs font-bold text-neutral-900 leading-snug">
                    {badge.skillName}
                  </h3>
                  <p className="text-[11px] text-neutral-500 font-mono mt-1">
                    ID: {badge.verificationId}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-neutral-200 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-neutral-500 font-mono">
                    {badge.issuedDate.slice(0, 10)}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                    <CheckCircle2 className="w-3 h-3" />
                    Verified
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
