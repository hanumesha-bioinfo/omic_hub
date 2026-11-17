import React, { useState } from 'react';
import {
  User,
  Lock,
  Mail,
  Building2,
  LogIn,
  ShieldCheck,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { useToast } from '../../../shared/ui/Toast';
import {
  requestPasswordReset,
  signInWithGoogle,
  signInWithPassword,
  signUpRecruiter,
  signUpStudent,
} from '../authClient';
import { AUTH_MESSAGES } from '../messages';
import { useAuthAction } from '../useAuthAction';
import {
  isPasswordLongEnough,
  isValidEmail,
  normalizeEmail,
} from '../validation';

interface SignUpNotice {
  title: string;
  message: string;
}

export const SignInPage: React.FC = () => {
  const { showToast } = useToast();
  const studentAction = useAuthAction();
  const recruiterAction = useAuthAction();
  const resetAction = useAuthAction();
  const loading = studentAction.isLoading;
  const resetLoading = resetAction.isLoading;

  // Mode: 'student' vs 'recruiter'.
  const [portalType, setPortalType] = useState<'student' | 'recruiter'>('student');
  const [isRegisterMode, setIsRegisterMode] = useState(false);

  // Student Fields
  const [username, setUsername] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [studentPassword, setStudentPassword] = useState('');

  // Recruiter Fields (Strictly Company Name, Official Email, Password)
  const [companyName, setCompanyName] = useState('');
  const [recruiterEmail, setRecruiterEmail] = useState('');
  const [recruiterPassword, setRecruiterPassword] = useState('');

  const [resetEmail, setResetEmail] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [signUpNotice, setSignUpNotice] = useState<SignUpNotice | null>(null);

  // Google Sign-In

  const handleGoogleSignIn = async () => {
    setSignUpNotice(null);
    await studentAction.run(() => signInWithGoogle(), {
      fallbackError: AUTH_MESSAGES.googleSignInFailed,
      keepLoadingOnSuccess: true,
      errorLogLabel: 'Supabase Google Auth error:',
    });
  };


  // Request a password-reset email through Supabase.
  const handleForgotPassword = async () => {

    const email = resetEmail.trim().toLowerCase();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showToast(AUTH_MESSAGES.invalidEmail, 'error');
      return;
    }

    await resetAction.run(() => requestPasswordReset(email), {
      fallbackError: AUTH_MESSAGES.resetRequestFailed,
      successMessage: AUTH_MESSAGES.resetEmailSent,
      errorLogLabel: 'Password-reset request failed:',
    });
  };

  // Student Form Submit
  const handleStudentSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();

    const nameToUse = username.trim();
    const emailToUse = normalizeEmail(isRegisterMode ? studentEmail : username);
    const isRegistration = isRegisterMode;

    setSignUpNotice(null);

    if (!isValidEmail(emailToUse)) {
      showToast(
        isRegistration
          ? AUTH_MESSAGES.invalidEmail
          : AUTH_MESSAGES.invalidLoginEmail,
        'error',
      );
      return;
    }

    if (isRegistration && !isPasswordLongEnough(studentPassword)) {
      showToast(AUTH_MESSAGES.passwordTooShort, 'error');
      return;
    }

    if (!isRegistration && !studentPassword) {
      showToast(AUTH_MESSAGES.passwordRequired, 'error');
      return;
    }

    if (isRegistration && !nameToUse) {
      showToast(AUTH_MESSAGES.missingFullName, 'error');
      return;
    }

    if (isRegistration) {
      const result = await studentAction.run(
        () =>
          signUpStudent({
            fullName: nameToUse,
            email: emailToUse,
            password: studentPassword,
          }),
        {
          fallbackError: AUTH_MESSAGES.studentAuthFailed,
          errorLogLabel: 'Student authentication error:',
        },
      );

      if (!result) return;

      if (result.hasSession) {
        showToast(AUTH_MESSAGES.accountCreated, 'success');
        return;
      }

      setSignUpNotice({
        title: result.possibleDuplicateEmail ? 'Next step' : 'Confirm your email',
        message: result.possibleDuplicateEmail
          ? AUTH_MESSAGES.signUpDuplicateEmail
          : AUTH_MESSAGES.accountCreatedConfirmEmail,
      });
      return;
    }

    await studentAction.run(
      () => signInWithPassword(emailToUse, studentPassword),
      {
        fallbackError: AUTH_MESSAGES.studentAuthFailed,
        errorLogLabel: 'Student authentication error:',
      },
    );
  };

  // Recruiter Form Submit
  const handleRecruiterSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();

    const company = companyName.trim();
    const email = normalizeEmail(recruiterEmail);
    const isRegistration = isRegisterMode;

    setSignUpNotice(null);

    if (!isValidEmail(email)) {
      showToast(
        isRegistration
          ? AUTH_MESSAGES.invalidEmail
          : AUTH_MESSAGES.invalidLoginEmail,
        'error',
      );
      return;
    }

    if (isRegistration) {
      if (!company) {
        showToast(AUTH_MESSAGES.missingCompanyName, 'error');
        return;
      }

      if (!isPasswordLongEnough(recruiterPassword)) {
        showToast(AUTH_MESSAGES.passwordTooShort, 'error');
        return;
      }

      const result = await recruiterAction.run(
        () =>
          signUpRecruiter({
            companyName: company,
            email,
            password: recruiterPassword,
          }),
        {
          fallbackError: AUTH_MESSAGES.recruiterAuthFailed,
          errorLogLabel: 'Recruiter authentication error:',
        },
      );

      if (!result) return;

      if (result.hasSession) {
        showToast(AUTH_MESSAGES.accountCreated, 'success');
        return;
      }

      setSignUpNotice({
        title: result.possibleDuplicateEmail ? 'Next step' : 'Confirm your email',
        message: result.possibleDuplicateEmail
          ? AUTH_MESSAGES.signUpDuplicateEmail
          : AUTH_MESSAGES.accountCreatedConfirmEmail,
      });
      return;
    }

    if (!recruiterPassword) {
      showToast(AUTH_MESSAGES.passwordRequired, 'error');
      return;
    }

    await recruiterAction.run(
      () => signInWithPassword(email, recruiterPassword),
      {
        fallbackError: AUTH_MESSAGES.recruiterAuthFailed,
        errorLogLabel: 'Recruiter authentication error:',
      },
    );
  };

  const isRecruiter = portalType === 'recruiter';
  const busy = loading || recruiterAction.isLoading || resetLoading;

  return (
    <div className="min-h-screen w-full bg-[#f8f9fc] text-neutral-900 flex flex-col items-center justify-center p-4 sm:p-6 font-sans relative selection:bg-neutral-900 selection:text-white overflow-x-hidden">
      
      {/* Ambient background soft pearl lighting on clean white canvas */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
        <div className="absolute top-1/4 left-1/3 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-neutral-200/50 rounded-full blur-[140px]" />
        <div className="absolute bottom-10 right-1/4 w-[600px] h-[400px] bg-slate-200/40 rounded-full blur-[160px]" />
      </div>

      {/* Top Floating Portal Switcher: Liquid Glass Capsule */}
      <div className="relative z-30 mb-8 flex items-center justify-center gap-2 p-1.5 rounded-full bg-white/80 border border-neutral-200/80 backdrop-blur-xl shadow-lg">
        <button
          type="button"
          onClick={() => setPortalType('student')}
          className={`py-2 px-5 sm:px-6 rounded-full text-xs font-bold tracking-wide transition-all cursor-pointer flex items-center gap-2 ${
            !isRecruiter
              ? 'bg-neutral-900 text-white shadow-md scale-100'
              : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100'
          }`}
        >
          <User className="w-3.5 h-3.5" />
          <span>Student / Scholar</span>
        </button>

        <button
          type="button"
          onClick={() => setPortalType('recruiter')}
          className={`py-2 px-5 sm:px-6 rounded-full text-xs font-bold tracking-wide transition-all cursor-pointer flex items-center gap-2 ${
            isRecruiter
              ? 'bg-neutral-900 text-white shadow-md scale-100'
              : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>Recruiter Workspace</span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* MAIN DUAL-PANEL CARD: TWO COMBINATION COLORS (LEFT & RIGHT)     */}
      {/* LEFT: Pure Crisp White / Pearl Liquid Surface                   */}
      {/* RIGHT: Deep Obsidian Midnight Navy Surface                      */}
      {/* ============================================================== */}
      <div className="relative z-10 w-full max-w-[920px] min-h-[540px] rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)] border border-neutral-200/90 overflow-hidden flex flex-col md:flex-row bg-white">
        
        {/* ============================================================== */}
        {/* LEFT COMBINATION COLOR: CLEAN WHITE / PEARL GLASS (Light side)  */}
        {/* ============================================================== */}
        <div className="w-full md:w-1/2 p-8 sm:p-12 flex flex-col justify-center bg-white text-neutral-900 z-10 border-b md:border-b-0 md:border-r border-neutral-200/80">
          <div className="mb-6 space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-100 border border-neutral-200 text-neutral-700 text-[11px] font-mono font-semibold tracking-wide uppercase">
              <ShieldCheck className="w-3.5 h-3.5 text-neutral-900" />
              <span>Bioinformatics Talent Node</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-neutral-900 tracking-tight">
              {showForgotPassword
                ? 'Reset Password'
                : isRecruiter
                  ? isRegisterMode
                    ? 'Create Recruiter Account'
                    : 'Recruiter Login'
                  : isRegisterMode
                    ? 'Create Account'
                    : 'Student Login'}
            </h1>
            <div className="w-10 h-1 bg-neutral-900 rounded-full" />
            <p className="text-xs text-neutral-500 pt-1 leading-relaxed">
              {isRecruiter
                ? 'Sign in to access verified candidate pipelines and manage job openings'
                : 'Access pipeline courses, ATS calibration, and computational biology roles'}
            </p>
          </div>

          {!isRecruiter ? (
            /* Student Form (On Left White Side) */
            <form onSubmit={handleStudentSubmit} className="space-y-4">
              {signUpNotice && (
                <div
                  role="status"
                  aria-live="polite"
                  className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-xs text-neutral-700"
                >
                  <p className="font-bold text-neutral-900">
                    {signUpNotice.title}
                  </p>
                  <p className="mt-1 leading-relaxed">{signUpNotice.message}</p>
                </div>
              )}

              <div className="relative border-b border-neutral-300 focus-within:border-neutral-900 transition-colors pb-1">
                <input
                  type={isRegisterMode ? 'text' : 'email'}
                  autoComplete={isRegisterMode ? 'name' : 'email'}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={isRegisterMode ? 'Full name' : 'Email address'}
                  required
                  className="w-full pr-8 py-2 bg-transparent text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none font-medium"
                />
                <User className="w-4 h-4 text-neutral-400 absolute right-1.5 top-3" />
              </div>

              {isRegisterMode && (
                <div className="relative border-b border-neutral-300 focus-within:border-neutral-900 transition-colors pb-1">
                  <input
                    type="email"
                    autoComplete="email"
                    value={studentEmail}
                    onChange={(e) => setStudentEmail(e.target.value)}
                    placeholder="Institutional or Personal Email"
                    required
                    className="w-full pr-8 py-2 bg-transparent text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none font-medium"
                  />
                  <Mail className="w-4 h-4 text-neutral-400 absolute right-1.5 top-3" />
                </div>
              )}

              <div className="relative border-b border-neutral-300 focus-within:border-neutral-900 transition-colors pb-1">
                <input
                  type="password"
                  autoComplete={isRegisterMode ? 'new-password' : 'current-password'}
                  value={studentPassword}
                  onChange={(e) => setStudentPassword(e.target.value)}
                  placeholder={
                    isRegisterMode
                      ? 'Password (minimum 8 characters)'
                      : 'Password'
                  }
                  required
                  className="w-full pr-8 py-2 bg-transparent text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none font-medium"
                />
                <Lock className="w-4 h-4 text-neutral-400 absolute right-1.5 top-3" />
              </div>

              {!isRegisterMode && (
                <div className="text-right -mt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setResetEmail(username.includes('@') ? username.trim() : '');
                      setShowForgotPassword(true);
                    }}
                    className="text-xs font-semibold text-neutral-700 hover:text-black hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              {/* Liquid White/Black Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={busy}
                  aria-busy={loading}
                  className="relative group overflow-hidden w-full py-3 rounded-full bg-neutral-900 text-white hover:bg-black active:scale-[0.98] font-bold text-xs tracking-wider uppercase shadow-lg shadow-neutral-900/10 transition-all cursor-pointer flex items-center justify-center gap-2 border border-neutral-900 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <div className="absolute inset-0 w-1/3 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none animate-shine" />
                  {loading ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <LogIn className="w-3.5 h-3.5 text-white group-hover:translate-x-0.5 transition-transform" />
                      <span>{isRegisterMode ? 'Complete Registration' : 'Sign In as Student'}</span>
                    </>
                  )}
                </button>
              </div>

              {/* Password reset email form */}
              {!isRegisterMode && showForgotPassword && (
                <div
                  className="mt-3 space-y-3 rounded-xl border border-neutral-200 bg-neutral-50 p-4"
                >
                  <label className="block text-xs font-semibold text-neutral-700">
                    Reset password by email
                  </label>
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="Your registered email address"
                    required
                    className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-400"
                  />
                  <button
                    type="button"
                    onClick={() => void handleForgotPassword()}
                    disabled={resetLoading}
                    className="w-full rounded-full bg-neutral-900 px-4 py-2 text-xs font-bold text-white disabled:opacity-60"
                  >
                    {resetLoading ? 'Sending…' : 'Send reset email'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(false)}
                    className="w-full py-2 text-xs font-semibold text-neutral-600 hover:text-neutral-900 hover:underline"
                  >
                    Back to Sign In
                  </button>
                </div>
              )}

              {/* Mode Toggle */}
              <div className={`text-center text-xs font-medium text-neutral-500 pt-1 ${showForgotPassword ? "hidden" : ""}`}>
                {isRegisterMode ? (
                  <span>
                    Already registered?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setIsRegisterMode(false);
                        setSignUpNotice(null);
                      }}
                      className="font-bold text-neutral-900 hover:underline cursor-pointer"
                    >
                      Sign In
                    </button>
                  </span>
                ) : (
                  <span>
                    New to omic.hub?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setIsRegisterMode(true);
                        setSignUpNotice(null);
                      }}
                      className="font-bold text-neutral-900 hover:underline cursor-pointer"
                    >
                      Create Account
                    </button>
                  </span>
                )}
              </div>

              {/* Google Sign In */}
              <div className={`pt-2 border-t border-neutral-200 flex justify-center ${showForgotPassword ? "hidden" : ""}`}>
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={busy}
                  aria-busy={loading}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-neutral-300 hover:border-neutral-400 bg-neutral-50 hover:bg-neutral-100 text-neutral-700 hover:text-neutral-900 text-xs font-medium cursor-pointer transition-all shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>Continue with Google</span>
                </button>
              </div>
            </form>
          ) : (
            /* Recruiter Form (When Recruiter selected) */
            <form onSubmit={handleRecruiterSubmit} className="space-y-4">
              {signUpNotice && (
                <div
                  role="status"
                  aria-live="polite"
                  className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-xs text-neutral-700"
                >
                  <p className="font-bold text-neutral-900">
                    {signUpNotice.title}
                  </p>
                  <p className="mt-1 leading-relaxed">{signUpNotice.message}</p>
                </div>
              )}

              {isRegisterMode && (
                <div className="relative border-b border-neutral-300 focus-within:border-neutral-900 transition-colors pb-1">
                  <input
                    type="text"
                    autoComplete="organization"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Company / Institution Name"
                    required
                    className="w-full pr-8 py-2 bg-transparent text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none font-medium"
                  />
                  <Building2 className="w-4 h-4 text-neutral-400 absolute right-1.5 top-3" />
                </div>
              )}

              <div className="relative border-b border-neutral-300 focus-within:border-neutral-900 transition-colors pb-1">
                <input
                  type="email"
                  autoComplete="email"
                  value={recruiterEmail}
                  onChange={(e) => setRecruiterEmail(e.target.value)}
                  placeholder="Official Company Email"
                  required
                  className="w-full pr-8 py-2 bg-transparent text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none font-medium font-mono"
                />
                <Mail className="w-4 h-4 text-neutral-400 absolute right-1.5 top-3" />
              </div>

              <div className="relative border-b border-neutral-300 focus-within:border-neutral-900 transition-colors pb-1">
                <input
                  type="password"
                  autoComplete={
                    isRegisterMode ? 'new-password' : 'current-password'
                  }
                  value={recruiterPassword}
                  onChange={(e) => setRecruiterPassword(e.target.value)}
                  placeholder={
                    isRegisterMode
                      ? 'Password (minimum 8 characters)'
                      : 'Password'
                  }
                  required
                  className="w-full pr-8 py-2 bg-transparent text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none font-medium"
                />
                <Lock className="w-4 h-4 text-neutral-400 absolute right-1.5 top-3" />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={busy}
                  aria-busy={recruiterAction.isLoading}
                  className="relative group overflow-hidden w-full py-3 rounded-full bg-neutral-900 text-white hover:bg-black active:scale-[0.98] font-bold text-xs tracking-wider uppercase shadow-lg shadow-neutral-900/10 transition-all cursor-pointer flex items-center justify-center gap-2 border border-neutral-900 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <div className="absolute inset-0 w-1/3 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none animate-shine" />
                  {recruiterAction.isLoading ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <LogIn className="w-3.5 h-3.5 text-white group-hover:translate-x-0.5 transition-transform" />
                      <span>
                        {isRegisterMode
                          ? 'Create Recruiter Account'
                          : 'Access Recruiter Workspace'}
                      </span>
                    </>
                  )}
                </button>
              </div>

              {/* Recruiter register/login toggle */}
              <div className="text-center text-xs font-medium text-neutral-500 pt-1">
                {isRegisterMode ? (
                  <span>
                    Already registered?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setIsRegisterMode(false);
                        setSignUpNotice(null);
                      }}
                      className="font-bold text-neutral-900 hover:underline cursor-pointer"
                    >
                      Sign In
                    </button>
                  </span>
                ) : (
                  <span>
                    New to omic.hub?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setIsRegisterMode(true);
                        setSignUpNotice(null);
                      }}
                      className="font-bold text-neutral-900 hover:underline cursor-pointer"
                    >
                      Create Recruiter Account
                    </button>
                  </span>
                )}
              </div>
            </form>
          )}
        </div>

        {/* ============================================================== */}
        {/* RIGHT COMBINATION COLOR: DEEP OBSIDIAN MIDNIGHT NAVY (Dark)   */}
        {/* Rich deep dark side contrasting against the pure white left side */}
        {/* ============================================================== */}
        <div className="w-full md:w-1/2 p-8 sm:p-12 flex flex-col justify-center bg-[#0a0f1d] text-white relative overflow-hidden">
          {/* Subtle ambient deep navy reflections */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-slate-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 space-y-5 max-w-sm mx-auto text-left">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-xs font-mono text-neutral-300">
              <Sparkles className="w-3.5 h-3.5 text-white" />
              <span>PLATFORM ARCHITECTURE // 2026</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white uppercase">
              {isRecruiter ? 'RECRUITER WORKSPACE' : 'BIOINFORMATICS COMMUNITY'}
            </h2>

            <div className="w-10 h-1 bg-white rounded-full" />

            <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed">
              {isRecruiter
                ? 'Directly access calibrated candidate pipelines, post computational biology openings, and benchmark verified technical competencies.'
                : 'Connect with biotechnology employers, benchmark your resume against real-world ATS algorithms, and accelerate your genomics career.'}
            </p>

            {/* Feature Highlights on Dark Side */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.05] border border-white/10 backdrop-blur-md">
                <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Verified ATS Engine</h4>
                  <p className="text-[11px] text-neutral-400">GATK, Nextflow, and RNA-seq keyword scoring</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.05] border border-white/10 backdrop-blur-md">
                <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                  <Building2 className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Direct Employer Matching</h4>
                  <p className="text-[11px] text-neutral-400">Pre-screened biotech & pharmaceutical pipelines</p>
                </div>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between text-[11px] text-neutral-400 font-mono border-t border-white/10">
              <span>OMIC.HUB LIQUID SYSTEM</span>
              <span className="text-white font-bold">V 2.4.0</span>
            </div>
          </div>
        </div>

      </div>

      {/* Footer Branding */}
      <div className="mt-6 text-center text-xs text-neutral-400 font-medium relative z-10 flex items-center justify-center gap-2 tracking-wide font-mono">
        <span>OMIC.HUB</span>
        <span>&bull;</span>
        <span>BIOINFORMATICS NETWORKING PLATFORM</span>
      </div>
    </div>
  );
};
