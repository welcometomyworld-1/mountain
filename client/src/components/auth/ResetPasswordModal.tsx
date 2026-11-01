import React, { useState } from 'react';
import { X, KeyRound, ShieldCheck, ArrowRight, Lock, CheckCircle2 } from 'lucide-react';
import { getSecurityQuestionApi, resetPasswordApi } from '../../api/auth';

interface ResetPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({ isOpen, onClose }) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [chatId, setChatId] = useState('');
  const [securityQuestion, setSecurityQuestion] = useState('');
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const handleFetchQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await getSecurityQuestionApi(chatId.trim());
      if (res.success) {
        setSecurityQuestion(res.securityQuestion);
        setStep(2);
      }
    } catch (err: any) {
      setError(err.message || 'Chat ID not found');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await resetPasswordApi({
        chatId: chatId.trim(),
        securityAnswer: securityAnswer.trim(),
        newPassword,
      });

      if (res.success) {
        setIsSuccess(true);
        setTimeout(() => {
          onClose();
          setIsSuccess(false);
          setStep(1);
          setChatId('');
          setSecurityAnswer('');
          setNewPassword('');
          setConfirmPassword('');
        }, 2000);
      }
    } catch (err: any) {
      setError(err.message || 'Incorrect answer to security question.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in pt-safe pb-safe">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-4 sm:p-6 max-h-[92dvh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-2">
            <KeyRound className="w-5 h-5 text-brand-500" />
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">Recover Account</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 min-w-[36px] min-h-[36px] flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isSuccess ? (
          <div className="py-8 text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-500 animate-bounce-subtle" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Password Reset Successful!</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              You can now sign in using your Chat ID and new password.
            </p>
          </div>
        ) : step === 1 ? (
          <form onSubmit={handleFetchQuestion} className="pt-4 space-y-4">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Enter your unique Chat ID (e.g. CHAT482913) to retrieve your account recovery question.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Your Chat ID
              </label>
              <input
                type="text"
                required
                placeholder="CHAT482913"
                value={chatId}
                onChange={(e) => setChatId(e.target.value.toUpperCase())}
                className="w-full px-3.5 py-2.5 text-base sm:text-sm uppercase font-mono tracking-wider rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            {error && <p className="text-xs text-rose-500">{error}</p>}

            <button
              type="submit"
              disabled={isLoading || !chatId.trim()}
              className="w-full min-h-[44px] flex items-center justify-center space-x-2 py-2.5 px-4 bg-brand-600 hover:bg-brand-700 text-white font-medium text-sm rounded-xl shadow-lg shadow-brand-500/25 transition disabled:opacity-50"
            >
              <span>{isLoading ? 'Checking ID...' : 'Continue'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="pt-4 space-y-4">
            <div className="p-3 rounded-xl bg-brand-50 dark:bg-brand-950/30 border border-brand-100 dark:border-brand-900/40">
              <p className="text-xs font-medium text-brand-600 dark:text-brand-400">Security Question:</p>
              <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-200">
                "{securityQuestion}"
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Your Answer
              </label>
              <input
                type="text"
                required
                placeholder="Enter your secret answer"
                value={securityAnswer}
                onChange={(e) => setSecurityAnswer(e.target.value)}
                className="w-full px-3.5 py-2.5 text-base sm:text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                New Password
              </label>
              <input
                type="password"
                required
                placeholder="At least 6 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 text-base sm:text-sm rounded-xl bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                required
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 text-base sm:text-sm rounded-xl bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            {error && <p className="text-xs text-rose-500">{error}</p>}

            <div className="flex space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-1/3 py-2.5 min-h-[44px] text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="w-2/3 min-h-[44px] flex items-center justify-center space-x-2 py-2.5 px-4 bg-brand-600 hover:bg-brand-700 text-white font-medium text-sm rounded-xl shadow-lg shadow-brand-500/25 transition disabled:opacity-50"
              >
                <Lock className="w-4 h-4" />
                <span>{isLoading ? 'Resetting...' : 'Reset Password'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
