import React, { useState } from 'react';
import { Lock, ShieldCheck } from 'lucide-react';
import { useToast } from '../../../shared/ui/Toast';
import { updatePassword } from '../authClient';
import { AUTH_MESSAGES } from '../messages';
import { useAuthAction } from '../useAuthAction';

interface ResetPasswordPageProps {
  onComplete: () => void;
}

export const ResetPasswordPage: React.FC<ResetPasswordPageProps> = ({
  onComplete,
}) => {
  const { showToast } = useToast();
  const { isLoading: loading, run } = useAuthAction();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleUpdatePassword = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (password.length < 8) {
      showToast(AUTH_MESSAGES.shortNewPassword, 'error');
      return;
    }

    if (password !== confirmPassword) {
      showToast(AUTH_MESSAGES.passwordMismatch, 'error');
      return;
    }

    await run(() => updatePassword(password), {
      fallbackError: AUTH_MESSAGES.passwordUpdateFailed,
      successMessage: AUTH_MESSAGES.passwordUpdated,
      onSuccess: onComplete,
      errorLogLabel: 'Password update failed:',
    });
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-neutral-50 px-4 py-10">
      <section className="w-full max-w-md rounded-3xl border border-neutral-200 bg-white p-8 shadow-xl">
        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-100">
          <ShieldCheck className="h-6 w-6 text-neutral-900" />
        </div>

        <h1 className="text-2xl font-black tracking-tight text-neutral-900">
          Create New Password
        </h1>

        <p className="mt-2 text-sm leading-6 text-neutral-500">
          Choose a new password for your Omic Hub account.
        </p>

        <form onSubmit={handleUpdatePassword} className="mt-7 space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-neutral-700">
              New password
            </span>
            <span className="relative block">
              <input
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={8}
                required
                placeholder="At least 8 characters"
                className="w-full rounded-xl border border-neutral-300 px-4 py-3 pr-11 text-sm outline-none focus:border-neutral-900 focus:ring-2 focus:ring-neutral-200"
              />
              <Lock className="absolute right-3 top-3.5 h-4 w-4 text-neutral-400" />
            </span>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-neutral-700">
              Confirm new password
            </span>
            <input
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              minLength={8}
              required
              placeholder="Enter the password again"
              className="w-full rounded-xl border border-neutral-300 px-4 py-3 text-sm outline-none focus:border-neutral-900 focus:ring-2 focus:ring-neutral-200"
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-neutral-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Updating password…' : 'Update Password'}
          </button>
        </form>
      </section>
    </main>
  );
};
