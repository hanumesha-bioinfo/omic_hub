import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  User,
  Settings,
  Shield,
  Briefcase,
  Sparkles,
  MapPin,
  Mail,
  Phone,
  Linkedin,
  Github,
  Globe,
  DollarSign,
  Laptop,
  Check,
  Save,
  RotateCcw,
  Volume2,
  VolumeX,
  Bell,
  Database,
  ExternalLink,
  FileText,
  CheckCircle2,
  AlertCircle,
  Upload,
  Camera,
  Trash2,
} from 'lucide-react';
import { UserProfile } from '../types';
import { useToast } from '../shared/ui/Toast';
import { StorageService } from '../services/storage';

interface ProfileSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  onUpdateUser: (updatedUser: UserProfile) => void;
  onOpenDataVault?: () => void;
  onOpenPlanModal?: () => void;
  initialTab?: 'profile' | 'settings';
}

export const ProfileSettingsModal: React.FC<ProfileSettingsModalProps> = ({
  isOpen,
  onClose,
  user,
  onUpdateUser,
  onOpenDataVault,
  onOpenPlanModal,
  initialTab = 'profile',
}) => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'profile' | 'settings'>(initialTab);

  // Form state initialized with user values
  const [formData, setFormData] = useState<UserProfile>(user);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setFormData(user);
  }, [user, isOpen]);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab, isOpen]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast('Please provide your name', 'error');
      return;
    }

    StorageService.saveUser(formData);
    onUpdateUser(formData);
    showToast('Profile and settings updated successfully!', 'success');
    onClose();
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Please upload a valid image file (JPG, PNG, WebP)', 'error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast('Image size exceeds 5MB limit. Please choose a smaller file.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setFormData((prev) => ({ ...prev, avatar: dataUrl }));
        showToast('Profile image uploaded successfully!', 'success');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    const defaultPlaceholder =
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';
    setFormData((prev) => ({ ...prev, avatar: defaultPlaceholder }));
    showToast('Profile image reset to default.', 'info');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white border border-neutral-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200 text-neutral-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className="p-5 sm:p-6 border-b border-neutral-200 bg-neutral-50/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-neutral-900 text-white flex items-center justify-center shadow-xs">
              {activeTab === 'profile' ? <User className="w-5 h-5" /> : <Settings className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-neutral-900">
                  {activeTab === 'profile' ? 'Profile Details' : 'Account & App Settings'}
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700 font-bold border border-neutral-200">
                  OMIC HUB
                </span>
              </div>
              <p className="text-xs text-neutral-500">
                {activeTab === 'profile'
                  ? 'Manage your professional identity, target career roles, and upload profile image'
                  : 'Configure ATS score targets, compensation, and automation preferences'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Toggle Navigation */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-neutral-200 bg-white text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`pb-3 font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
              activeTab === 'profile'
                ? 'border-neutral-900 text-neutral-900'
                : 'border-transparent text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Profile Information</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`pb-3 font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
              activeTab === 'settings'
                ? 'border-neutral-900 text-neutral-900'
                : 'border-transparent text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Preferences & Settings</span>
          </button>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* TAB 1: Profile Information */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              {/* Profile Image Upload Section */}
              <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-neutral-900 uppercase tracking-wider block">
                    Upload Profile Image
                  </label>
                  <span className="text-[11px] text-neutral-500 font-medium">PNG, JPG, WebP up to 5MB</span>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div className="relative group shrink-0">
                    <img
                      src={formData.avatar}
                      alt={formData.name}
                      className="w-20 h-20 rounded-2xl object-cover ring-1 ring-neutral-300 shadow-xs bg-neutral-100"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute inset-0 bg-black/60 rounded-2xl flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white text-[10px] font-bold cursor-pointer"
                      title="Upload new image"
                    >
                      <Camera className="w-4 h-4 mb-0.5" />
                      <span>Change</span>
                    </button>
                    <div className="absolute -bottom-1 -right-1 p-1 bg-neutral-900 rounded-full ring-2 ring-white text-white">
                      <Check className="w-2.5 h-2.5" />
                    </div>
                  </div>

                  <div className="flex-1 w-full space-y-2.5">
                    <p className="text-xs text-neutral-600 font-medium leading-relaxed">
                      Upload your real photo from your computer to display on your candidate profile, applications, and recruiter submissions.
                    </p>

                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImageUpload}
                        accept="image/png,image/jpeg,image/webp,image/gif"
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3.5 py-2 rounded-xl bg-neutral-900 hover:bg-black text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload Image</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="px-3 py-2 rounded-xl bg-white hover:bg-neutral-100 text-neutral-700 hover:text-neutral-900 text-xs font-semibold border border-neutral-300 transition-colors flex items-center gap-1.5 cursor-pointer"
                        title="Reset photo to default placeholder"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Reset</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Resume & Verification Status Card */}
              <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-neutral-700" />
                    <span className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
                      Resume & Profile Verification
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      user.isResumeUploaded
                        ? 'bg-neutral-900 text-white border-neutral-900'
                        : 'bg-neutral-200 text-neutral-700 border-neutral-300'
                    }`}
                  >
                    {user.isResumeUploaded ? 'Active on Profile' : 'Pending Upload'}
                  </span>
                </div>

                {user.isResumeUploaded ? (
                  <div className="p-3 rounded-xl bg-white border border-neutral-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-neutral-900" />
                        <span className="text-xs font-semibold text-neutral-900">
                          {user.uploadedResumeFileName || 'Master_Resume_2026.pdf'}
                        </span>
                      </div>
                      <span className="text-xs font-extrabold text-neutral-900">
                        {user.atsScore}/100 ATS Score
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-500">
                      Your resume is parsed and active. Skills, credentials, and achievements are visible on your profile and synced with the Opportunities Hub.
                    </p>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-white border border-neutral-200 space-y-2">
                    <div className="flex items-center gap-2 text-neutral-700">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span className="text-xs font-semibold">No Resume File Uploaded Yet</span>
                    </div>
                    <p className="text-[11px] text-neutral-500">
                      Build or upload your resume in real time using the Dashboard studio. Your profile details, verified skills, and ATS audit will automatically show here once uploaded.
                    </p>
                  </div>
                )}
              </div>

              {/* Core Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-neutral-700 block mb-1.5">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-neutral-300 text-xs text-neutral-900 focus:outline-none focus:border-neutral-900 transition-colors"
                    placeholder="Alex Morgan"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-neutral-700 block mb-1.5">Email Address</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-neutral-300 text-xs text-neutral-900 focus:outline-none focus:border-neutral-900 transition-colors"
                    placeholder="alex.morgan@domain.com"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-neutral-700 block mb-1.5">Current Title / Role</label>
                  <input
                    type="text"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-neutral-300 text-xs text-neutral-900 focus:outline-none focus:border-neutral-900 transition-colors"
                    placeholder="Senior Full-Stack Engineer"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-neutral-700 block mb-1.5">Target Desired Role</label>
                  <input
                    type="text"
                    value={formData.targetRole}
                    onChange={(e) => setFormData({ ...formData, targetRole: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-neutral-300 text-xs text-neutral-900 focus:outline-none focus:border-neutral-900 transition-colors"
                    placeholder="Lead Distributed Systems Engineer"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-neutral-700 block mb-1.5">Experience Level</label>
                  <select
                    value={formData.experienceLevel}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        experienceLevel: e.target.value as UserProfile['experienceLevel'],
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-neutral-300 text-xs text-neutral-900 focus:outline-none focus:border-neutral-900 transition-colors"
                  >
                    <option value="Entry">Entry (0-2 yrs)</option>
                    <option value="Mid-Level">Mid-Level (3-5 yrs)</option>
                    <option value="Senior">Senior (6-8 yrs)</option>
                    <option value="Lead">Lead (8-10 yrs)</option>
                    <option value="Staff/Principal">Staff / Principal (10+ yrs)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-neutral-700 block mb-1.5">Location</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-neutral-300 text-xs text-neutral-900 focus:outline-none focus:border-neutral-900 transition-colors"
                    placeholder="Boston, MA • Hybrid / Remote"
                  />
                </div>
              </div>

              {/* Bio / Executive Pitch */}
              <div>
                <label className="text-xs font-bold text-neutral-700 block mb-1.5">Career Summary & Bio</label>
                <textarea
                  rows={3}
                  value={formData.bio || ''}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-neutral-300 text-xs text-neutral-900 focus:outline-none focus:border-neutral-900 transition-colors resize-none"
                  placeholder="Engineered high-scale microservices, led cloud migrations, and scaled distributed platforms to 10M+ users..."
                />
              </div>

              {/* Social Links */}
              <div className="space-y-3 pt-2">
                <label className="text-xs font-bold text-neutral-900 uppercase tracking-wider block">
                  Professional Links
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="relative">
                    <Linkedin className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-3" />
                    <input
                      type="url"
                      value={formData.linkedin || ''}
                      onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
                      placeholder="linkedin.com/in/alex"
                      className="w-full pl-8 pr-3 py-2 rounded-xl bg-white border border-neutral-300 text-xs text-neutral-900 focus:outline-none focus:border-neutral-900"
                    />
                  </div>
                  <div className="relative">
                    <Github className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-3" />
                    <input
                      type="url"
                      value={formData.github || ''}
                      onChange={(e) => setFormData({ ...formData, github: e.target.value })}
                      placeholder="github.com/alex"
                      className="w-full pl-8 pr-3 py-2 rounded-xl bg-white border border-neutral-300 text-xs text-neutral-900 focus:outline-none focus:border-neutral-900"
                    />
                  </div>
                  <div className="relative">
                    <Globe className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-3" />
                    <input
                      type="url"
                      value={formData.portfolio || ''}
                      onChange={(e) => setFormData({ ...formData, portfolio: e.target.value })}
                      placeholder="portfolio.dev"
                      className="w-full pl-8 pr-3 py-2 rounded-xl bg-white border border-neutral-300 text-xs text-neutral-900 focus:outline-none focus:border-neutral-900"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Settings & Preferences */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              {/* Career Goal & ATS Target */}
              <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
                      ATS Benchmark Target Goal
                    </h3>
                    <p className="text-[11px] text-neutral-500 mt-0.5">
                      Sets the optimal threshold score for AI resume audit and bullet suggestions
                    </p>
                  </div>
                  <span className="text-sm font-extrabold text-neutral-900 px-2.5 py-1 rounded-lg bg-neutral-100 border border-neutral-200">
                    {formData.targetAtsGoal || 90}%
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {[80, 85, 90, 95].map((score) => (
                    <button
                      key={score}
                      type="button"
                      onClick={() => setFormData({ ...formData, targetAtsGoal: score })}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                        (formData.targetAtsGoal || 90) === score
                          ? 'bg-neutral-900 text-white border-neutral-900 shadow-xs'
                          : 'bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-100'
                      }`}
                    >
                      {score}% Target
                    </button>
                  ))}
                </div>
              </div>

              {/* Compensation & Work Model */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-neutral-700 block mb-1.5 flex items-center gap-1.5">
                    <span className="font-bold text-sm">₹</span>
                    <span>Target Compensation Range (INR)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.targetSalary || '₹24,00,000 - ₹36,00,000'}
                    onChange={(e) => setFormData({ ...formData, targetSalary: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-neutral-300 text-xs text-neutral-900 focus:outline-none focus:border-neutral-900 transition-colors"
                    placeholder="₹24,00,000 - ₹36,00,000"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-neutral-700 block mb-1.5 flex items-center gap-1.5">
                    <Laptop className="w-3.5 h-3.5 text-neutral-500" />
                    <span>Workplace Model</span>
                  </label>
                  <select
                    value={formData.workPreference || 'Remote'}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        workPreference: e.target.value as UserProfile['workPreference'],
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-neutral-300 text-xs text-neutral-900 focus:outline-none focus:border-neutral-900 transition-colors"
                  >
                    <option value="Remote">100% Remote</option>
                    <option value="Hybrid">Hybrid (Flexible)</option>
                    <option value="Onsite">On-Site Office</option>
                    <option value="Any">Open to Any Model</option>
                  </select>
                </div>
              </div>

              {/* Subscription & Plan Status */}
              <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-neutral-900" />
                      <span>Subscription & Plan Status</span>
                    </h3>
                    <p className="text-[11px] text-neutral-500 mt-0.5">
                      Student plan pricing with 3 months free trial benefits
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg text-[10px] font-extrabold bg-neutral-900 text-white border border-neutral-900">
                    3 Months Free Active
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-neutral-200 text-xs">
                  <div>
                    <span className="font-bold text-neutral-900 capitalize">{user.planTier || 'Pro'} Plan</span>
                    <p className="text-[11px] text-neutral-500">
                      {user.planTier === 'basic'
                        ? '₹0 Free Forever • Core Builder'
                        : user.planTier === 'plus'
                        ? 'First 3 Months Free • ₹9 / mo thereafter'
                        : 'First 3 Months Free • ₹49 / mo thereafter (Recommended)'}
                    </p>
                  </div>
                  {onOpenPlanModal && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenPlanModal();
                      }}
                      className="px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-black text-white font-bold text-xs transition-colors cursor-pointer"
                    >
                      Compare / Change Plan
                    </button>
                  )}
                </div>
              </div>

              {/* Real-time Persistence & Notifications Configuration */}
              <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-3">
                <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider block">
                  System & Storage Status
                </h3>

                <div className="flex items-center justify-between py-2 border-b border-neutral-200">
                  <div className="flex items-center gap-2.5">
                    <div className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                    <div>
                      <p className="text-xs font-semibold text-neutral-900">Continuous Real-Time Auto-Save</p>
                      <p className="text-[11px] text-neutral-500">Resumes, job updates, and courses sync instantaneously</p>
                    </div>
                  </div>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700 font-bold border border-neutral-200">
                    Active
                  </span>
                </div>

                <div className="flex items-center justify-between py-2 border-b border-neutral-200">
                  <div className="flex items-center gap-2.5">
                    <Database className="w-4 h-4 text-neutral-700" />
                    <div>
                      <p className="text-xs font-semibold text-neutral-900">Multi-Tab Real-Time Sync Channel</p>
                      <p className="text-[11px] text-neutral-500">Syncs background updates across all your browser tabs</p>
                    </div>
                  </div>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700 font-bold border border-neutral-200">
                    Connected
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div>
                    <p className="text-xs font-semibold text-neutral-900">Data Vault & Backups</p>
                    <p className="text-[11px] text-neutral-500">Inspect storage usage, revision snapshots, or export JSON</p>
                  </div>
                  {onOpenDataVault && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenDataVault();
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-neutral-100 text-neutral-900 text-xs font-bold border border-neutral-300 transition-colors"
                    >
                      <Database className="w-3.5 h-3.5 text-neutral-900" />
                      <span>Open Vault</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Modal Actions Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-neutral-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-xs font-semibold text-neutral-700 transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-neutral-900 hover:bg-black text-white text-xs font-bold shadow-xs transition-all cursor-pointer hover:scale-102 active:scale-98"
            >
              <Save className="w-4 h-4" />
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
