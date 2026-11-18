import React, { useState } from 'react';
import {
  Menu,
  Bell,
  CheckCircle2,
  Sparkles,
  ChevronDown,
  User as UserIcon,
  LogOut,
  FileText,
  LayoutDashboard,
  Settings,
  Crown,
  SearchCode,
  Briefcase,
  GraduationCap,
  Mic,
  Award,
  Newspaper,
} from 'lucide-react';
import { UserProfile } from '../../types';
import type { ActiveTab } from '../../app/navigation';

interface TopHeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  user: UserProfile;
  onLogout: () => void;
  atsScore: number;
  onOpenMobileMenu: () => void;
  onOpenSidebar?: () => void;
  onOpenDataRetrieval?: () => void;
  onOpenDataVault?: () => void;
  onOpenProfileSettings: (tab?: 'profile' | 'settings') => void;
  onOpenGeminiChat?: () => void;
  onOpenImageStudio?: () => void;
  onOpenPlanModal?: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  activeTab,
  setActiveTab,
  user,
  onLogout,
  atsScore,
  onOpenMobileMenu,
  onOpenSidebar,
  onOpenProfileSettings,
  onOpenGeminiChat,
  onOpenImageStudio,
  onOpenPlanModal,
}) => {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const handleOpenDrawer = onOpenSidebar || onOpenMobileMenu;

  // Exact navigation bar format: Home, Skills, Job, ATS & Resume, Interview, Certification, News
  const appTabs: { id: ActiveTab; label: string; icon: React.ReactNode; tooltip: string }[] = [
    {
      id: 'dashboard',
      label: 'Home',
      icon: <LayoutDashboard className="w-4 h-4" />,
      tooltip: 'Main Career Dashboard & Overview',
    },
    {
      id: 'skills',
      label: 'Skills',
      icon: <GraduationCap className="w-4 h-4" />,
      tooltip: 'Bioinformatics Skill Matrix & Upgrades',
    },
    {
      id: 'tracker',
      label: 'Job',
      icon: <Briefcase className="w-4 h-4" />,
      tooltip: 'Verified Job Opportunities & Tracking Pipeline',
    },
    {
      id: 'builder',
      label: 'ATS & Resume',
      icon: <FileText className="w-4 h-4" />,
      tooltip: 'Create New Resume or Upload Existing with ATS Audit',
    },
    {
      id: 'mock-interview',
      label: 'Interview',
      icon: <Mic className="w-4 h-4" />,
      tooltip: 'Live AI Mock Interview Simulator',
    },
    {
      id: 'certification',
      label: 'Certification',
      icon: <Award className="w-4 h-4" />,
      tooltip: 'Verified Credentials & NPTEL/NCBI Certifications',
    },
    {
      id: 'news',
      label: 'News',
      icon: <Newspaper className="w-4 h-4" />,
      tooltip: 'Real-Time Verified Peer-Reviewed Scientific News',
    },
  ];

  return (
    <header className="sticky top-0 z-30 w-full no-print bg-white/95 backdrop-blur-md border-b border-neutral-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2">
          
          {/* Left Side: Clickable omic.hub Logo to slide open sidebar navigation */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={handleOpenDrawer}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all cursor-pointer group active:scale-95 bg-neutral-100 hover:bg-neutral-200 border border-neutral-200 shadow-2xs"
              title="Click omic.hub logo to open full menu"
            >
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-bio-400 to-brand-600 text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <div className="text-left flex items-center gap-1.5">
                <span className="font-extrabold text-sm text-neutral-900 group-hover:text-brand-700 tracking-tight transition-colors">
                  OMIC HUB
                </span>
                <Menu className="w-3.5 h-3.5 text-neutral-500 group-hover:text-neutral-900 transition-colors" />
              </div>
            </button>
          </div>

          {/* Right Side: Gemini AI, Visual Studio, Premium, Settings, Notifications, Profile */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* Gemini Chatbot Trigger Button */}
            {onOpenGeminiChat && (
              <button
                type="button"
                onClick={onOpenGeminiChat}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all hover:scale-102 cursor-pointer bg-ai-50 hover:bg-ai-100 text-ai-700 border border-ai-200 shadow-2xs"
                title="Launch Gemini Bioinformatics Assistant & Voice Conversations"
              >
                <Sparkles className="w-3.5 h-3.5 text-ai-600" />
                <span className="hidden sm:inline">Gemini AI</span>
              </button>
            )}

            {/* Visual Studio Trigger Button */}
            {onOpenImageStudio && (
              <button
                type="button"
                onClick={onOpenImageStudio}
                className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer bg-neutral-100 hover:bg-neutral-200 border border-neutral-200 text-neutral-800 shadow-2xs"
                title="Open Scientific Visualization & Diagram Studio"
              >
                <span className="w-2 h-2 rounded-full bg-bio-500" />
                <span>Visual Studio</span>
              </button>
            )}

            {/* Premium Button */}
            <button
              type="button"
              onClick={onOpenPlanModal ? onOpenPlanModal : () => setActiveTab('pricing')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer group active:scale-95 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 shadow-2xs"
              title="View Premium Plans & Benefits"
            >
              <Crown className="w-3.5 h-3.5 text-amber-600" />
              <span className="hidden sm:inline">Premium</span>
            </button>

            {/* Settings Trigger Icon Button */}
            <button
              type="button"
              onClick={() => onOpenProfileSettings('settings')}
              className="p-2 rounded-xl transition-all cursor-pointer group bg-neutral-100 hover:bg-neutral-200 text-neutral-700 hover:text-neutral-900 border border-neutral-200 shadow-2xs"
              title="Open System Settings & Account Preferences"
            >
              <Settings className="w-4 h-4 text-neutral-600 group-hover:text-neutral-900 transition-colors" />
            </button>

            {/* Notifications Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="p-2 rounded-xl relative transition-all cursor-pointer bg-neutral-100 hover:bg-neutral-200 text-neutral-700 hover:text-neutral-900 border border-neutral-200 shadow-2xs"
                title="Notifications"
              >
                <Bell className="w-4 h-4" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white" />
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 rounded-2xl bg-white border border-neutral-200 shadow-2xl p-4 z-50 animate-in fade-in zoom-in-95">
                  <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
                    <span className="text-xs font-bold text-neutral-900 uppercase tracking-wider">Recent Alerts</span>
                    <span className="text-[10px] text-neutral-500 font-semibold">2 New</span>
                  </div>
                  <div className="space-y-3 pt-3">
                    <div className="flex items-start gap-3 text-left">
                      <div className="p-1.5 rounded-lg bg-neutral-100 text-neutral-900 shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-neutral-900">Broad Institute NGS Opening</p>
                        <p className="text-[11px] text-neutral-500">New computational biology position matching your skillset.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 text-left">
                      <div className="p-1.5 rounded-lg bg-neutral-100 text-neutral-900 shrink-0">
                        <Sparkles className="w-3.5 h-3.5 text-ai-600" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-neutral-900">ATS Score Calibrated</p>
                        <p className="text-[11px] text-neutral-500">Your resume ranks in the 94th percentile for Nextflow & RNA-seq.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* User Dropdown / Profile Pop-up Trigger */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 p-1 pl-2 rounded-xl transition-all cursor-pointer group bg-neutral-100 hover:bg-neutral-200 border border-neutral-200 shadow-2xs"
                title="Click to view profile & settings menu"
              >
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-7 h-7 rounded-lg object-cover ring-1 ring-neutral-300 group-hover:ring-neutral-900 transition-colors"
                />
                <span className="hidden md:inline text-xs font-bold text-neutral-900 truncate max-w-[100px]">
                  {user.name.split(' ')[0]}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-neutral-500 group-hover:text-neutral-900 transition-colors" />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white border border-neutral-200 shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95">
                  {/* Clickable Profile Card inside Dropdown */}
                  <div
                    onClick={() => {
                      setUserMenuOpen(false);
                      onOpenProfileSettings('profile');
                    }}
                    className="p-3 rounded-xl bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 cursor-pointer transition-colors group/card"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-neutral-900">
                        {user.name}
                      </p>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-brand-600 text-white font-semibold">
                        Scholar
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-500 truncate">{user.email}</p>
                    <div className="mt-2 flex items-center justify-between text-[11px] px-2 py-1 rounded-lg bg-white border border-neutral-200">
                      <span className="text-neutral-500">ATS Rating</span>
                      <span className="text-neutral-900 font-bold">{atsScore}/100</span>
                    </div>
                  </div>

                  <div className="py-1">
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        onOpenProfileSettings('profile');
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100 transition-colors cursor-pointer"
                    >
                      <UserIcon className="w-3.5 h-3.5 text-neutral-600" />
                      <span>Edit Profile Details</span>
                    </button>
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        onOpenProfileSettings('settings');
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100 transition-colors cursor-pointer"
                    >
                      <Settings className="w-3.5 h-3.5 text-neutral-600" />
                      <span>App & Career Settings</span>
                    </button>
                    <button
                      onClick={() => {
                        setActiveTab('dashboard');
                        setUserMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100 transition-colors cursor-pointer"
                    >
                      <LayoutDashboard className="w-3.5 h-3.5 text-neutral-600" />
                      <span>Career Dashboard</span>
                    </button>
                    <button
                      onClick={() => {
                        setActiveTab('builder');
                        setUserMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100 transition-colors cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5 text-neutral-600" />
                      <span>Resume Builder</span>
                    </button>
                  </div>

                  <div className="pt-1 border-t border-neutral-200">
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        onLogout();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer font-semibold"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs Bar: Appears across all tabs, fitted in the middle */}
      <div className="border-t border-neutral-100 bg-neutral-50/90 backdrop-blur-xs py-2 px-4 flex items-center justify-center">
        <nav
          aria-label="Features Navigation Bar"
          className="flex items-center justify-center gap-1 sm:gap-1.5 p-1 rounded-2xl bg-white border border-neutral-200 shadow-card max-w-fit mx-auto overflow-x-auto no-scrollbar"
        >
          {appTabs.map((feat) => {
            const isActive = activeTab === feat.id;
            return (
              <button
                key={feat.id}
                type="button"
                onClick={() => setActiveTab(feat.id)}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap active:scale-95 ${
                  isActive
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 font-semibold'
                }`}
                title={feat.tooltip}
              >
                <span className={`transition-transform duration-150 ${isActive ? 'scale-110 text-white' : 'text-neutral-500'}`}>
                  {feat.icon}
                </span>
                <span>{feat.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
