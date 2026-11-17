import React, { useState } from 'react';
import {
  LayoutDashboard,
  FileText,
  SearchCode,
  Briefcase,
  GraduationCap,
  Mic,
  Database,
  Search,
  Command,
  Sparkles,
  LogOut,
  ChevronRight,
  X,
  Bell,
  CheckCircle2,
  Menu,
  Settings,
  Crown,
  Award,
  Newspaper,
} from 'lucide-react';
import { UserProfile, SubscriptionPlanTier } from '../../types';
import type { ActiveTab } from '../../app/navigation';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  user: UserProfile;
  onLogout: () => void;
  atsScore: number;
  totalApplications: number;
  onOpenDataRetrieval: () => void;
  onOpenDataVault: () => void;
  onOpenProfileSettings: (tab?: 'profile' | 'settings') => void;
  onOpenPlanModal?: () => void;
  onTriggerUpgrade?: (feature: string, requiredTier?: SubscriptionPlanTier) => void;
  mobileOpen?: boolean;
  setMobileOpen?: (open: boolean) => void;
  isOpen?: boolean;
  setIsOpen?: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  user,
  onLogout,
  atsScore,
  totalApplications,
  onOpenDataRetrieval,
  onOpenDataVault,
  onOpenProfileSettings,
  onOpenPlanModal,
  onTriggerUpgrade,
  mobileOpen = false,
  setMobileOpen,
  isOpen,
  setIsOpen,
}) => {
  const isDrawerOpen = isOpen !== undefined ? isOpen : mobileOpen;
  const handleClose = () => {
    if (setIsOpen) setIsOpen(false);
    if (setMobileOpen) setMobileOpen(false);
  };
  const isAuditLocked = user.planTier === 'free';
  const isInterviewLocked = user.planTier !== 'premium';

  const navItems: { id: ActiveTab; label: string; icon: React.ReactNode; badge?: string; badgeColor?: string; locked?: boolean }[] = [
    {
      id: 'dashboard',
      label: 'Home',
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
    {
      id: 'skills',
      label: 'Skills',
      icon: <GraduationCap className="w-4 h-4" />,
      badge: 'Curated',
      badgeColor: 'bg-purple-500/15 text-purple-300 border-purple-500/25',
    },
    {
      id: 'tracker',
      label: 'Job',
      icon: <Briefcase className="w-4 h-4" />,
      badge: `${totalApplications}`,
      badgeColor: 'bg-sky-500/15 text-sky-400 border-sky-500/25',
    },
    {
      id: 'builder',
      label: 'ATS & Resume',
      icon: <FileText className="w-4 h-4" />,
      badge: user.isResumeUploaded ? `${atsScore}% ATS` : 'Upload / Build',
      badgeColor: user.isResumeUploaded
        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25'
        : 'bg-amber-500/15 text-amber-300 border-amber-500/25',
    },
    {
      id: 'mock-interview',
      label: 'Interview',
      icon: <Mic className="w-4 h-4" />,
      badge: isInterviewLocked ? '₹49 Premium' : 'Live AI',
      badgeColor: isInterviewLocked
        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
        : 'bg-amber-500/15 text-amber-300 border-amber-500/25',
      locked: isInterviewLocked,
    },
    {
      id: 'certification',
      label: 'Certification',
      icon: <Award className="w-4 h-4" />,
      badge: 'Verified',
      badgeColor: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25',
    },
    {
      id: 'news',
      label: 'News',
      icon: <Newspaper className="w-4 h-4" />,
      badge: 'Real-Time',
      badgeColor: 'bg-sky-500/15 text-sky-300 border-sky-500/25',
    },
  ];

  const handleNavClick = (tab: ActiveTab) => {
    if (tab === 'analyzer' && isAuditLocked) {
      if (onTriggerUpgrade) {
        onTriggerUpgrade('AI Resume Audit & ATS Scoring', 'premium');
      } else if (onOpenPlanModal) {
        onOpenPlanModal();
      }
      handleClose();
      return;
    }

    if (tab === 'mock-interview' && isInterviewLocked) {
      if (onTriggerUpgrade) {
        onTriggerUpgrade('Live AI Mock Interview Simulator', 'premium');
      } else if (onOpenPlanModal) {
        onOpenPlanModal();
      }
      handleClose();
      return;
    }

    setActiveTab(tab);
    handleClose();
  };

  return (
    <>
      {/* Backdrop overlay when sidebar is open */}
      {isDrawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in"
          onClick={handleClose}
        />
      )}

      {/* Left Side Corner Sidebar: Collapsed by default, ONLY slides open when user clicks OMIC HUB logo */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-white border-r border-neutral-200 shadow-xl flex flex-col transition-transform duration-300 ease-in-out ${
          isDrawerOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Top-Left Corner: Brand & Logo with Close Button */}
        <div className="p-4 sm:p-5 border-b border-neutral-200 flex items-center justify-between">
          <button
            onClick={() => handleNavClick('dashboard')}
            className="flex items-center gap-3 group text-left cursor-pointer"
          >
            <div className="w-9 h-9 rounded-xl bg-neutral-900 text-white p-0.5 flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base tracking-tight text-neutral-900 group-hover:text-black transition-colors">
                  OMIC HUB
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-neutral-100 text-neutral-700 font-semibold border border-neutral-200">
                  Career
                </span>
              </div>
              <span className="block text-[11px] text-neutral-500 font-medium -mt-0.5">
                Bioinformatics Placement
              </span>
            </div>
          </button>

          {/* Close button: visible whenever drawer is open */}
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition-colors cursor-pointer"
            title="Close navigation menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Search Shortcut */}
        <div className="px-4 pt-4 pb-2">
          <button
            type="button"
            onClick={() => {
              onOpenDataRetrieval();
              handleClose();
            }}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 text-neutral-600 hover:text-neutral-900 text-xs transition-all cursor-pointer group shadow-2xs"
          >
            <div className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-neutral-500 group-hover:text-neutral-900 transition-transform" />
              <span className="text-[11px] font-medium">Quick Find Data...</span>
            </div>
            <span className="flex items-center gap-0.5 text-[10px] font-mono text-neutral-500 bg-white px-1.5 py-0.5 rounded border border-neutral-200">
              <Command className="w-2.5 h-2.5" />K
            </span>
          </button>
        </div>

        {/* Navigation Items (Left Corner Menu) */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-6">
          {/* Main Tools Section */}
          <div className="space-y-1">
            <div className="px-3 pb-1.5 text-[10px] font-mono font-semibold uppercase tracking-wider text-neutral-400">
              Navigation
            </div>

            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer group ${
                    isActive
                      ? 'bg-neutral-900 text-white font-bold shadow-xs'
                      : 'text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`${
                        isActive ? 'text-white' : 'text-neutral-500 group-hover:text-neutral-900'
                      } transition-colors`}
                    >
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </div>

                  {item.badge && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-md font-semibold border ${
                        isActive
                          ? 'bg-neutral-800 text-neutral-200 border-neutral-700'
                          : 'bg-neutral-100 text-neutral-600 border-neutral-200'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Real-time Storage & Sync Tools */}
          <div className="space-y-1 pt-2 border-t border-neutral-200">
            <div className="px-3 pb-1.5 text-[10px] font-mono font-semibold uppercase tracking-wider text-neutral-400">
              Data & Settings
            </div>

            <button
              onClick={() => {
                onOpenProfileSettings('settings');
                handleClose();
              }}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100 transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-2.5">
                <Settings className="w-4 h-4 text-neutral-500 group-hover:text-neutral-900 transition-all" />
                <span>Settings & Targets</span>
              </div>
              <span className="text-[10px] text-neutral-400 group-hover:text-neutral-600 transition-colors">
                Configure
              </span>
            </button>

            <button
              onClick={() => {
                onOpenDataVault();
                handleClose();
              }}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100 transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-2.5">
                <Database className="w-4 h-4 text-neutral-500 group-hover:text-neutral-900 transition-transform" />
                <span>Data Vault</span>
              </div>
              <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                Live Sync
              </span>
            </button>

            <button
              onClick={() => {
                onOpenDataRetrieval();
                handleClose();
              }}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100 transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-2.5">
                <Search className="w-4 h-4 text-neutral-500 group-hover:text-neutral-900 transition-transform" />
                <span>Universal Search</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-neutral-400 group-hover:text-neutral-900 transition-colors" />
            </button>
          </div>

          {/* Subscription Plan Card */}
          {onOpenPlanModal && (
            <div className="mt-3 p-3.5 rounded-xl bg-neutral-50 border border-neutral-200">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-bold text-neutral-900 flex items-center gap-1.5">
                  <Crown className="w-3.5 h-3.5 text-amber-500" />
                  <span className="capitalize">{user.planTier || 'free'} Plan</span>
                </span>
                <span className="text-[10px] font-semibold text-emerald-700 px-1.5 py-0.5 rounded-md bg-emerald-50 border border-emerald-200">
                  {user.planTier === 'premium' ? 'Premium' : 'Free'}
                </span>
              </div>
              <p className="text-[11px] text-neutral-500 leading-tight mb-2.5">
                Free ₹0 or Premium ₹49 once
              </p>
              <button
                type="button"
                onClick={() => {
                  onOpenPlanModal();
                  handleClose();
                }}
                className="w-full py-1.5 px-2 rounded-lg bg-white hover:bg-neutral-100 text-neutral-800 font-semibold text-[11px] border border-neutral-300 transition-colors flex items-center justify-center gap-1 cursor-pointer"
              >
                <span>Compare Plans (₹0 / ₹49)</span>
                <ChevronRight className="w-3 h-3 text-neutral-400" />
              </button>
            </div>
          )}
        </div>

        {/* Bottom Left Corner: Interactive User Profile Card & Sign Out */}
        <div className="p-3 border-t border-neutral-200 bg-neutral-50/50">
          <div className="p-2.5 rounded-xl bg-white border border-neutral-200 hover:border-neutral-300 transition-all flex items-center justify-between gap-2.5 group shadow-2xs">
            <button
              type="button"
              onClick={() => {
                onOpenProfileSettings('profile');
                handleClose();
              }}
              className="flex items-center gap-2.5 min-w-0 text-left cursor-pointer flex-1"
              title="Click to view & edit Profile and Settings"
            >
              <div className="relative">
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-8 h-8 rounded-lg object-cover border border-neutral-200 shrink-0"
                />
                <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-1 ring-white" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-neutral-900 truncate">
                  {user.name}
                </p>
                <p className="text-[10px] text-neutral-500 truncate leading-tight flex items-center gap-1">
                  <span>{user.role}</span>
                </p>
              </div>
            </button>

            <button
              onClick={onLogout}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
              title="Sign Out of Omic Hub"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          <div
            onClick={() => onOpenProfileSettings('profile')}
            className="mt-2 px-1 flex items-center justify-between text-[10px] text-neutral-500 cursor-pointer"
          >
            <span className="flex items-center gap-1 text-emerald-700 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
              Active Session
            </span>
            <span className="font-semibold text-neutral-700 font-mono">ATS: {atsScore}%</span>
          </div>
        </div>
      </aside>
    </>
  );
};
