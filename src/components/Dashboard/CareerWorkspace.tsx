import React from 'react';
import {
  GraduationCap,
  Briefcase,
  FileText,
  Award,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import { UserProfile, JobApplication, ResumeData } from '../../types';
import type { ActiveTab } from '../../app/navigation';

interface CareerWorkspaceProps {
  user: UserProfile;
  resume: ResumeData;
  applications: JobApplication[];
  activeStage?: 'all' | 'courses' | 'jobs' | 'resume' | 'certification';
  setActiveTab: (tab: ActiveTab) => void;
  onOpenResumeBuilder: () => void;
  onSelectStage?: (stage: 'all' | 'courses' | 'jobs' | 'resume' | 'certification') => void;
}

export const CareerWorkspace: React.FC<CareerWorkspaceProps> = ({
  user,
  resume,
  applications,
  activeStage = 'all',
  setActiveTab,
  onOpenResumeBuilder,
  onSelectStage,
}) => {
  const learningHours = user.learningHours || 20;
  const atsScore = user.atsScore || 85;
  const activeApplications = applications.length;
  const certCount = resume.certifications?.length || 2;

  const stages = [
    {
      step: '01',
      id: 'courses' as const,
      title: 'Foundational Courses',
      subtitle: 'Python, Nextflow & NGS Pipelines',
      icon: GraduationCap,
      metric: `${learningHours}h`,
      metricLabel: 'completed',
      action: () => {
        setActiveTab('skills');
      },
    },
    {
      step: '02',
      id: 'jobs' as const,
      title: 'Target Openings',
      subtitle: 'Biotech Labs & Research Fellowships',
      icon: Briefcase,
      metric: `${activeApplications}`,
      metricLabel: 'active in pipeline',
      action: () => {
        setActiveTab('tracker');
      },
    },
    {
      step: '03',
      id: 'resume' as const,
      title: 'ATS & Calibration',
      subtitle: 'ATS Keyword Scoring & Industry Standards',
      icon: FileText,
      metric: `${atsScore}%`,
      metricLabel: 'ATS match index',
      action: () => {
        setActiveTab('builder');
      },
    },
    {
      step: '04',
      id: 'certification' as const,
      title: 'Verified Credentials',
      subtitle: 'NCBI, NPTEL & Academic Validations',
      icon: Award,
      metric: `${certCount}`,
      metricLabel: 'verified credentials',
      action: () => {
        setActiveTab('certification');
      },
    },
  ];

  return (
    <div className="w-full">
      {/* Career Workspace Progression Pipeline: Clean, Monochromatic & Structured */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white border border-neutral-200 shadow-xs space-y-5">
        
        {/* Header with clear hierarchy */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-neutral-400">
                Workflow Pipeline
              </span>
              <span className="text-neutral-300">&bull;</span>
              <span className="text-[11px] font-medium text-neutral-500">
                4-Stage Career Progression
              </span>
            </div>
            <h2 className="text-lg font-bold text-neutral-900 tracking-tight mt-0.5">
              Bioinformatics Placement Pathway
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-500 font-mono hidden sm:inline">
              Click any stage to navigate
            </span>
            <button
              type="button"
              onClick={() => setActiveTab('skills')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-black text-white text-xs font-semibold transition-all cursor-pointer shadow-xs"
            >
              <span>Explore Career Matrix</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 4 Sequential Stage Cards with Typographic Hierarchy (No arbitrary decorative colors) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {stages.map((st) => {
            const Icon = st.icon;
            const isSelected = activeStage === st.id;
            return (
              <div
                key={st.id}
                onClick={st.action}
                className={`p-4 rounded-xl transition-all duration-150 cursor-pointer flex flex-col justify-between border ${
                  isSelected
                    ? 'bg-neutral-50 border-neutral-900 ring-1 ring-neutral-900'
                    : 'bg-white hover:bg-neutral-50/80 border-neutral-200'
                }`}
              >
                <div>
                  {/* Top Row: Monospace Index + Icon */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-xs font-mono font-medium text-neutral-400">
                      STAGE {st.step}
                    </span>
                    <div className="p-1.5 rounded-lg bg-neutral-100 text-neutral-700">
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>

                  {/* Title & Subtitle */}
                  <h3 className="text-sm font-bold text-neutral-900 leading-snug">
                    {st.title}
                  </h3>
                  <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
                    {st.subtitle}
                  </p>
                </div>

                {/* Primary Metric with strict typographic hierarchy */}
                <div className="mt-4 pt-3 border-t border-neutral-100 flex items-baseline justify-between">
                  <div>
                    <span className="text-xl font-bold font-mono text-neutral-900 tabular-nums">
                      {st.metric}
                    </span>
                    <span className="text-[11px] text-neutral-500 ml-1.5">
                      {st.metricLabel}
                    </span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-neutral-400 group-hover:text-neutral-900 transition-colors" />
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
};
