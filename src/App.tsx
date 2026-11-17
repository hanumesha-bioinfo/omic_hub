import React, { useState, useEffect, useRef } from 'react';
import { ToastProvider, useToast } from './shared/ui/Toast';
import {
  AuthProvider,
  ResetPasswordPage,
  SignInPage,
  canSeeRecruiterWorkspace,
  canSeeStudentWorkspace,
  useAuth,
} from './features/auth';
import { Sidebar } from './shared/layout/Sidebar';
import type { ActiveTab } from './app/navigation';
import { TopHeader } from './shared/layout/TopHeader';
import { DashboardView } from './components/DashboardView';
import { ATSAndResumeView } from './components/ResumeBuilder/ATSAndResumeView';
import { ResumeBuilderView } from './components/ResumeBuilder/ResumeBuilderView';
import { ResumeAnalyzerView } from './components/ResumeAnalyzer/ResumeAnalyzerView';
import { JobTrackerView } from './components/JobTracker/JobTrackerView';
import { SkillPathsView } from './components/SkillPaths/SkillPathsView';
import { MockInterviewView } from './components/MockInterview/MockInterviewView';
import { CertificationsView } from './components/Certifications/CertificationsView';
import { BioinformaticsNews } from './components/Dashboard/BioinformaticsNews';
import { DataRetrievalModal } from './components/DataRetrievalModal';
import { DataVaultModal } from './components/DataVaultModal';
import { ProfileSettingsModal } from './components/ProfileSettingsModal';
import { PlanSelectionLandingPage } from './components/PlanSelectionLandingPage';
import { FeatureGateModal } from './components/FeatureGateModal';
import { SubscriptionPlanModal } from './components/SubscriptionPlanModal';
import { RecruiterDashboardView } from './components/Recruiter/RecruiterDashboardView';
import {
  StorageService,
  DEFAULT_USER,
} from './services/storage';
import { UserProfile, ResumeData, JobApplication, Course, ScheduledInterview, ActivityItem, SubscriptionPlanTier } from './types';
import { createPlanAuthority, resolveAuthoritativeTier } from './services/api/planAuthority';
import { fetchVerifiedPlan } from './services/api/payments';
import { loadRazorpayCheckout } from './services/api/razorpayCheckout';
import { Search, Database, Sparkles, Crown, ArrowRight, Building2, LogOut, LogIn } from 'lucide-react';

function MainApp() {
  const { showToast } = useToast();
  const {
    status,
    user,
    setUser,
    logout,
    completePasswordRecovery,
  } = useAuth();

  // App Navigation State & Mobile Drawer State
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState<boolean>(false);

  // Modals for Real-Time Vault, Data Retrieval, Profile & Settings, Plan Selection, and Feature Gate
  const [isDataRetrievalOpen, setIsDataRetrievalOpen] = useState(false);
  const [isDataVaultOpen, setIsDataVaultOpen] = useState(false);
  const [isProfileSettingsOpen, setIsProfileSettingsOpen] = useState(false);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [isFeatureGateOpen, setIsFeatureGateOpen] = useState(false);
  const [gatedFeatureInfo, setGatedFeatureInfo] = useState<{
    name: string;
    requiredTier: SubscriptionPlanTier;
    description?: string;
    targetTab?: ActiveTab;
  }>({
    name: 'Premium Plan',
    requiredTier: 'premium',
  });
  const [profileSettingsTab, setProfileSettingsTab] = useState<'profile' | 'settings'>('profile');

  // Premium is granted only by the server-verified plan endpoint, never by checkout state.
  const planAuthorityRef = useRef(
    createPlanAuthority({ openCheckout: loadRazorpayCheckout }),
  );

  const applyServerTier = (tier: SubscriptionPlanTier) => {
    setUser((current) => {
      if (current.planTier === tier) return current;
      const updated: UserProfile = { ...current, planTier: tier };
      StorageService.saveUser(updated);
      return updated;
    });
  };

  // Load the authoritative plan once the session is authenticated.
  useEffect(() => {
    if (status !== 'authenticated') return;
    let active = true;
    void fetchVerifiedPlan()
      .then((plan) => {
        if (active) applyServerTier(resolveAuthoritativeTier(plan));
      })
      .catch(() => {
        // Keep the existing tier if the server cannot be reached.
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  // Core Data States
  const [resume, setResume] = useState<ResumeData>(() => StorageService.getResume());
  const [applications, setApplications] = useState<JobApplication[]>(() =>
    StorageService.getApplications()
  );
  const [activities, setActivities] = useState<ActivityItem[]>(() =>
    StorageService.getActivities()
  );
  const [courses, setCourses] = useState<Course[]>(() => StorageService.getCourses());
  const [scheduledInterviews, setScheduledInterviews] = useState<ScheduledInterview[]>(() =>
    StorageService.getScheduledInterviews()
  );

  // Real-time synchronization across browser tabs and background storage events
  useEffect(() => {
    const unsubscribe = StorageService.subscribe((key) => {
      setUser(StorageService.getUser());
      setResume(StorageService.getResume());
      setApplications(StorageService.getApplications());
      setActivities(StorageService.getActivities());
      setCourses(StorageService.getCourses());
      setScheduledInterviews(StorageService.getScheduledInterviews());
    });
    return () => unsubscribe();
  }, []);

  // Global Keyboard Shortcut for on-demand data search (Ctrl+K / Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsDataRetrievalOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Premium is never activated here; only the verified plan endpoint may grant it.
  const handleSelectPlan = (tier: SubscriptionPlanTier, targetTab: ActiveTab = 'builder') => {
    if (tier === 'premium') return;
    const updatedUser: UserProfile = {
      ...user,
      planTier: tier,
      hasSelectedPlan: true,
      hasCompletedResumeOnboarding: true,
    };

    setUser(updatedUser);
    StorageService.saveUser(updatedUser);

    // Direct to target tab (dashboard or builder or as chosen)
    setActiveTab(targetTab);

    StorageService.addActivity({
      type: 'resume',
      title: `Selected ${tier.toUpperCase()} Plan`,
      description: 'Your plan selection has been saved.',
      badge: `${tier.toUpperCase()} Selected`,
    });
    setActivities(StorageService.getActivities());

    showToast(
      `Plan selected: ${tier.toUpperCase()}. Welcome to Omic Hub.`,
      'success'
    );
  };

  // Trigger Clean Subscription Plans modal whenever a user clicks Mock Interview or Full ATS Resume Scan
  const handleTriggerUpgrade = (
    featureName: string,
    requiredTier: SubscriptionPlanTier = 'premium',
    description?: string,
    targetTab?: ActiveTab
  ) => {
    setGatedFeatureInfo({
      name: featureName,
      requiredTier,
      description,
      targetTab,
    });
    setIsPlanModalOpen(true);
  };

  // Callback when user selects a plan locally (free only; premium comes from the server).
  const handleUpgradeFromGate = (tier: SubscriptionPlanTier) => {
    if (tier === 'premium') return;
    const updatedUser: UserProfile = {
      ...user,
      planTier: tier,
      hasSelectedPlan: true,
    };

    setUser(updatedUser);
    StorageService.saveUser(updatedUser);

    StorageService.addActivity({
      type: 'resume',
      title: `Upgraded to ${tier.toUpperCase()}`,
      description: `Unlocked ${gatedFeatureInfo.name} and all corresponding tier tools.`,
      badge: `${tier.toUpperCase()} Active`,
    });
    setActivities(StorageService.getActivities());

    if (gatedFeatureInfo.targetTab) {
      setActiveTab(gatedFeatureInfo.targetTab);
    }
  };

  // Open real Razorpay checkout; on close we re-read the server, which alone
  // decides whether premium becomes active.
  const handleCheckout = async () => {
    try {
      const tier = await planAuthorityRef.current.checkout();
      applyServerTier(tier);
    } catch (error) {
      console.error('Premium checkout failed', error);
      showToast('Could not start payment. Please try again.', 'error');
    }
  };

  // Gate Data Vault to Premium tier
  const handleOpenDataVault = () => {
    if (user.planTier !== 'premium') {
      handleTriggerUpgrade(
        'Advanced Bioinformatics Pipelines Data Vault',
        'premium',
        'The Advanced Pipelines Data Vault offers multi-revision automated snapshots, 1-click cloud rollbacks, and tamper-proof JSON checkpoints for your bioinformatics career records.'
      );
      return;
    }
    setIsDataVaultOpen(true);
  };

  // Logout
  const handleLogout = () => {
    void logout();
  };
  // Refresh all state after a restore from backup
  const handleRefreshAllData = () => {
    setUser(StorageService.getUser());
    setResume(StorageService.getResume());
    setApplications(StorageService.getApplications());
    setActivities(StorageService.getActivities());
    setCourses(StorageService.getCourses());
    setScheduledInterviews(StorageService.getScheduledInterviews());
  };

  // Resume Save Handler
  const handleSaveResume = (updated: ResumeData) => {
    setResume(updated);
    StorageService.saveResume(updated);
  };

  // Applications Save Handler
  const handleSaveApplications = (updated: JobApplication[]) => {
    setApplications(updated);
    StorageService.saveApplications(updated);
    const nextUser = { ...user, totalApplications: updated.length };
    setUser(nextUser);
    StorageService.saveUser(nextUser);
  };

  // Courses Save Handler
  const handleSaveCourses = (updated: Course[]) => {
    setCourses(updated);
    StorageService.saveCourses(updated);
    const totalHours = updated.reduce((acc, c) => acc + c.completedHours, 0);
    const nextUser = { ...user, learningHours: totalHours };
    setUser(nextUser);
    StorageService.saveUser(nextUser);
  };

  // Scheduled Interviews Save Handler
  const handleSaveInterviews = (updated: ScheduledInterview[]) => {
    setScheduledInterviews(updated);
    StorageService.saveScheduledInterviews(updated);
  };

  // Apply enhanced bullet from analyzer directly to active resume
  const handleApplyBulletToResume = (enhancedBullet: string) => {
    if (!resume.workExperiences.length) return;
    const copy = { ...resume };
    copy.workExperiences[0].bullets.unshift(enhancedBullet);
    handleSaveResume(copy);
    StorageService.addActivity({
      type: 'resume',
      title: 'Applied AI Enhanced Bullet',
      description: `Updated primary experience role with high-yield XYZ metric bullet.`,
      badge: 'Score Boost',
    });
    setActivities(StorageService.getActivities());
  };

  // Profile & Settings Pop-up Handlers
  const handleOpenProfileSettings = (tab: 'profile' | 'settings' = 'profile') => {
    setProfileSettingsTab(tab);
    setIsProfileSettingsOpen(true);
  };

  const handleUpdateUser = (updatedUser: UserProfile) => {
    setUser(updatedUser);
  };

  // Show password recovery before normal dashboard rendering.
  if (status === 'password-recovery') {
    return <ResetPasswordPage onComplete={completePasswordRecovery} />;
  }

  // Wait for Supabase to restore a persisted/OAuth session before choosing a page.
  if (status === 'initializing') {
    return <AuthBootScreen />;
  }

  // If not authenticated, render the SignInPage
  if (status === 'unauthenticated') {
    return <SignInPage />;
  }

  // STRICT ACCESS CONTROL FOR RECRUITERS:
  // Dedicated recruiter workspace with top-level ATS navigation, candidate matching, pipeline, and analytics.
  // These frontend predicates are UX display gates only, never the authorization authority.
  if (canSeeRecruiterWorkspace(user)) {
    return (
      <RecruiterDashboardView
        user={user}
        onLogout={handleLogout}
      />
    );
  }

  // A signed-in user with no recognized workspace role has no destination here.
  if (!canSeeStudentWorkspace(user)) {
    return <AccessDeniedScreen onLogout={handleLogout} />;
  }

  // Post-Sign-In Dedicated Landing Page: Free and Premium options
  if (!user.hasSelectedPlan) {
    return (
      <PlanSelectionLandingPage
        user={user}
        onSelectPlan={(tier) => handleSelectPlan(tier, 'builder')}
        onCheckout={handleCheckout}
        onNavigateTab={() => {
          if (user.planTier === 'premium') {
            setActiveTab('builder');
          } else {
            handleSelectPlan('free', 'builder');
          }
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#fafbfc] text-neutral-900 flex font-sans selection:bg-neutral-900 selection:text-white relative overflow-x-hidden">
      {/* Left-Side Corner Navigation Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        user={user}
        onLogout={handleLogout}
        atsScore={user.atsScore}
        totalApplications={applications.length}
        onOpenDataRetrieval={() => setIsDataRetrievalOpen(true)}
        onOpenDataVault={handleOpenDataVault}
        onOpenProfileSettings={handleOpenProfileSettings}
        onOpenPlanModal={() => setIsPlanModalOpen(true)}
        onTriggerUpgrade={(feat, tier) =>
          handleTriggerUpgrade(
            feat,
            tier || 'premium',
            undefined,
            feat.includes('Audit') ? 'analyzer' : feat.includes('Interview') ? 'mock-interview' : undefined
          )
        }
        mobileOpen={mobileSidebarOpen}
        setMobileOpen={setMobileSidebarOpen}
        isOpen={mobileSidebarOpen}
        setIsOpen={setMobileSidebarOpen}
      />

      {/* Main Content Area (Full width with collapsible drawer) */}
      <div className="flex-1 min-w-0 flex flex-col transition-all relative z-10">
        {/* Top Header Bar */}
        <TopHeader
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          user={user}
          onLogout={handleLogout}
          atsScore={user.atsScore}
          onOpenMobileMenu={() => setMobileSidebarOpen(true)}
          onOpenSidebar={() => setMobileSidebarOpen(true)}
          onOpenDataRetrieval={() => setIsDataRetrievalOpen(true)}
          onOpenDataVault={handleOpenDataVault}
          onOpenProfileSettings={handleOpenProfileSettings}
          onOpenPlanModal={() => setIsPlanModalOpen(true)}
        />

        {/* Dynamic Viewport */}
        <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
          {activeTab === 'dashboard' && (
            <DashboardView
              user={user}
              resume={resume}
              applications={applications}
              activities={activities}
              atsScore={user.atsScore}
              setActiveTab={setActiveTab}
              onOpenResumeBuilder={() => setActiveTab('builder')}
              onOpenMockInterview={() => {
                if (user.planTier !== 'premium') {
                  handleTriggerUpgrade('Live AI Mock Interview Simulator', 'premium', undefined, 'mock-interview');
                  return;
                }
                setActiveTab('mock-interview');
              }}
              onOpenResumeAnalyzer={() => {
                if (user.planTier === 'free') {
                  handleTriggerUpgrade('AI Resume Audit & ATS Scoring', 'premium', undefined, 'analyzer');
                  return;
                }
                setActiveTab('analyzer');
              }}
              onOpenDataRetrieval={() => setIsDataRetrievalOpen(true)}
              onOpenDataVault={handleOpenDataVault}
              onOpenProfileSettings={() => handleOpenProfileSettings('profile')}
              onUpdateResume={handleSaveResume}
              onUpdateUser={handleUpdateUser}
            />
          )}

          {(activeTab === 'builder' || activeTab === 'analyzer') && (
            <ATSAndResumeView
              currentResume={resume}
              onSaveResume={handleSaveResume}
              onApplyBulletToResume={handleApplyBulletToResume}
              onBackToDashboard={() => setActiveTab('dashboard')}
              userPlan={user.planTier}
              atsScore={user.atsScore}
              user={user}
              onUpdateUser={handleUpdateUser}
            />
          )}

          {activeTab === 'certification' && (
            <CertificationsView
              user={user}
              resume={resume}
              onNavigateSkills={() => setActiveTab('skills')}
            />
          )}

          {activeTab === 'news' && (
            <div className="rounded-2xl bg-white border border-neutral-200 shadow-xs p-4 sm:p-6 animate-in fade-in">
              <BioinformaticsNews onNavigateTab={setActiveTab} />
            </div>
          )}

          {activeTab === 'tracker' && (
            <JobTrackerView
              applications={applications}
              onSaveApplications={handleSaveApplications}
              onScheduleInterview={(app) => {
                if (user.planTier !== 'premium') {
                  handleTriggerUpgrade('Live AI Mock Interview Simulator', 'premium', undefined, 'mock-interview');
                  return;
                }
                setActiveTab('mock-interview');
              }}
            />
          )}

          {activeTab === 'skills' && (
            <SkillPathsView
              courses={courses}
              onSaveCourses={handleSaveCourses}
              userRole={user.role}
              targetRole={user.targetRole}
              userPlan={user.planTier}
              onTriggerUpgrade={(feat, tier) => handleTriggerUpgrade(feat, tier || 'premium')}
            />
          )}

          {activeTab === 'mock-interview' && (
            user.planTier !== 'premium' ? (
              <div className="rounded-2xl bg-white border border-neutral-200 p-8 sm:p-12 text-center space-y-6 max-w-3xl mx-auto shadow-xs animate-in fade-in">
                <div className="w-14 h-14 rounded-xl bg-neutral-100 border border-neutral-200 flex items-center justify-center mx-auto text-neutral-800">
                  <Crown className="w-6 h-6 text-neutral-800" />
                </div>
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-neutral-600 uppercase tracking-wider bg-neutral-100 px-3 py-1 rounded-full border border-neutral-200">
                    Premium Exclusive Feature
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight">
                    Technical Mock Interview Simulator
                  </h2>
                  <p className="text-sm text-neutral-500 max-w-xl mx-auto leading-relaxed">
                    Engage in technical coding drills and computational biology behavioral interviews benchmarked against Broad Institute, Illumina, and Schrödinger hiring standards.
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 text-xs text-neutral-600 max-w-md mx-auto flex items-center justify-between">
                  <div className="text-left">
                    <span className="font-bold text-neutral-900 block">Live Voice & Evaluation</span>
                    <span className="text-[11px] text-neutral-500">STAR rubric analysis with score breakdown</span>
                  </div>
                  <span className="text-xs font-bold font-mono text-neutral-900 bg-white px-2.5 py-1 rounded-md border border-neutral-200">
                    Premium (₹49 once)
                  </span>
                </div>
                <button
                  onClick={() => handleTriggerUpgrade('Live AI Mock Interview Simulator', 'premium', undefined, 'mock-interview')}
                  className="px-6 py-2.5 rounded-lg bg-neutral-900 hover:bg-black text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer"
                >
                  Upgrade to Premium (₹49 once)
                </button>
              </div>
            ) : (
              <MockInterviewView
                scheduledInterviews={scheduledInterviews}
                onSaveInterviews={handleSaveInterviews}
                targetRole={user.targetRole}
                resume={resume}
                onUpdateResume={handleSaveResume}
              />
            )
          )}

          {activeTab === 'pricing' && (
            <div className="rounded-2xl bg-white border border-neutral-200 shadow-xs overflow-hidden animate-in fade-in">
              <PlanSelectionLandingPage
                user={user}
                onSelectPlan={(tier) => {
                  handleSelectPlan(tier, 'builder');
                  setActiveTab('builder');
                }}
                onCheckout={handleCheckout}
                onNavigateTab={() => setActiveTab('builder')}
                isTabMode={true}
              />
            </div>
          )}
        </main>

        {/* Modern Clean Footer */}
        <footer className="no-print border-t border-neutral-200 bg-white py-6 text-center text-xs text-neutral-500">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="font-medium text-neutral-600 flex items-center gap-2">
              <span className="font-bold text-neutral-900">OMIC HUB</span>
              <span>&bull; Career Acceleration & Resume Intelligence Platform</span>
            </p>
            <div className="flex items-center gap-4 text-neutral-500 font-mono text-[11px]">
              <span>ATS Calibration v3.8</span>
              <span>&bull;</span>
              <span>STAR Rubric</span>
              <span>&bull;</span>
              <span>Workday & Greenhouse Compatible</span>
            </div>
          </div>
        </footer>
      </div>

      {/* Floating Real-Time Data Retrieval Quick Button */}
      <aside aria-label="Quick Actions" className="fixed bottom-6 right-6 z-40 flex items-center gap-2 no-print">
        <button
          onClick={() => setIsDataRetrievalOpen(true)}
          className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-xl shadow-indigo-600/30 transition-all hover:scale-105 active:scale-95 cursor-pointer border border-indigo-400/30"
          title="Quick Retrieve Any Saved Data (Ctrl+K)"
        >
          <Search className="w-4 h-4" />
          <span className="hidden sm:inline">Retrieve Data</span>
        </button>

        <button
          onClick={handleOpenDataVault}
          className="p-2.5 rounded-2xl bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-white border border-slate-700 shadow-xl transition-all hover:scale-105 active:scale-95 cursor-pointer"
          title="Data Vault & Backups"
        >
          <Database className="w-4 h-4 text-emerald-400" />
        </button>
      </aside>

      {/* Data Retrieval Modal (Command Palette Search) */}
      <DataRetrievalModal
        isOpen={isDataRetrievalOpen}
        onClose={() => setIsDataRetrievalOpen(false)}
        onNavigateTab={(tab) => setActiveTab(tab)}
      />

      {/* Data Vault & Backup Modal */}
      <DataVaultModal
        isOpen={isDataVaultOpen}
        onClose={() => setIsDataVaultOpen(false)}
        onDataRestored={handleRefreshAllData}
      />

      {/* Profile & Settings Pop-up Modal */}
      <ProfileSettingsModal
        isOpen={isProfileSettingsOpen}
        onClose={() => setIsProfileSettingsOpen(false)}
        user={user}
        onUpdateUser={handleUpdateUser}
        onOpenDataVault={handleOpenDataVault}
        onOpenPlanModal={() => setIsPlanModalOpen(true)}
        initialTab={profileSettingsTab}
      />

      {/* Subscription Plans with real Razorpay checkout */}
      <SubscriptionPlanModal
        isOpen={isPlanModalOpen}
        onClose={() => setIsPlanModalOpen(false)}
        onUpgrade={(tier) => {
          handleUpgradeFromGate(tier);
          setIsPlanModalOpen(false);
        }}
        onCheckout={handleCheckout}
        user={user}
        initialSelectedTier={gatedFeatureInfo.requiredTier || 'premium'}
        triggeredByFeature={gatedFeatureInfo.name}
      />

      {/* Sleek Glassmorphism Feature Gate Modal */}
      <FeatureGateModal
        isOpen={isFeatureGateOpen}
        onClose={() => setIsFeatureGateOpen(false)}
        onUpgrade={handleUpgradeFromGate}
        onCheckout={handleCheckout}
        user={user}
        featureName={gatedFeatureInfo.name}
        requiredTier={gatedFeatureInfo.requiredTier}
        featureDescription={gatedFeatureInfo.description}
      />
    </div>
  );
}

function AccessDeniedScreen({ onLogout }: { onLogout: () => void }) {
  return (
    <div className="min-h-screen bg-[#f8f9fc] text-neutral-900 flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md rounded-2xl bg-white border border-neutral-200 shadow-sm p-8 sm:p-10 text-center space-y-5">
        <div className="w-14 h-14 rounded-xl bg-neutral-100 border border-neutral-200 flex items-center justify-center mx-auto text-neutral-800">
          <LogOut className="w-6 h-6 text-neutral-800" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-extrabold tracking-tight text-neutral-900">
            Access Denied
          </h1>
          <p className="text-sm text-neutral-500 leading-relaxed">
            Your account does not have access to this workspace. Please sign out
            and use an account with the correct role.
          </p>
        </div>
        <button
          onClick={onLogout}
          className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-neutral-900 hover:bg-black text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </div>
  );
}

function AuthBootScreen() {
  return (
    <div className="min-h-screen bg-[#f8f9fc] text-neutral-900 flex flex-col items-center justify-center p-6 font-sans">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-full border-2 border-neutral-300 border-t-neutral-900 animate-spin" />
        <div className="text-center space-y-1">
          <p className="text-sm font-bold tracking-[0.2em] uppercase">Omic Hub</p>
          <p className="text-xs text-neutral-500">Restoring your session...</p>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </ToastProvider>
  );
}
