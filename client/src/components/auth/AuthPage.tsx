import React, { useState } from 'react';
import { Shield, Lock, User as UserIcon, Sparkles, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ResetPasswordModal } from './ResetPasswordModal';
import { ChatIdRevealModal } from './ChatIdRevealModal';

const SECURITY_QUESTIONS = [
  'What was the name of your first childhood pet?',
  'In what city or town did your parents meet?',
  'What was your childhood nickname?',
  'What is the name of your favorite teacher?',
  'What was the model of your first car?',
];

export const AuthPage: React.FC = () => {
  const { login, register } = useAuth();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Post-registration reveal modal state
  const [newAccount, setNewAccount] = useState<{ chatId: string; displayName: string } | null>(null);
  const [isRevealOpen, setIsRevealOpen] = useState(false);

  // Form states
  const [chatId, setChatId] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [securityQuestion, setSecurityQuestion] = useState(SECURITY_QUESTIONS[0]);
  const [securityAnswer, setSecurityAnswer] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    try {
      if (mode === 'login') {
        await login({
          chatId: chatId.trim(),
          password,
        });
      } else {
        const result = await register({
          displayName: displayName.trim(),
          password,
          securityQuestion,
          securityAnswer: securityAnswer.trim(),
        });

        // Set reveal modal with the newly generated Chat ID
        setNewAccount({
          chatId: result.chatId,
          displayName: result.user.displayName,
        });
        setIsRevealOpen(true);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-[100dvh] w-full flex items-center justify-center p-3 sm:p-4 bg-slate-950 text-slate-100 overflow-x-hidden overflow-y-auto pt-safe pb-safe">
      {/* Background ambient lighting effects (Navy Blue & Gold) */}
      <div className="absolute top-1/4 left-1/4 w-72 sm:w-96 h-72 sm:h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none animate-pulse-subtle" />
      <div className="absolute bottom-1/4 right-1/4 w-72 sm:w-96 h-72 sm:h-96 bg-amber-500/20 rounded-full blur-3xl pointer-events-none animate-pulse-subtle" />

      <div className="relative w-full max-w-md z-10 py-6">
        {/* Brand header */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 sm:w-28 sm:h-28 rounded-3xl overflow-hidden shadow-2xl shadow-amber-500/20 mb-3 sm:mb-4 ring-2 ring-amber-400/50 bg-white p-2">
            <img src="/logo.jpg" alt="TailorWala Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-display">
            Tailor<span className="text-amber-400">Wala</span>
          </h1>
          <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm text-slate-300 max-w-xs mx-auto">
            Doorstep Custom Tailoring & Real-Time Chat Consultation
          </p>
        </div>

        {/* Auth Box */}
        <div className="rounded-3xl bg-slate-900/80 backdrop-blur-xl border border-slate-800 p-5 xs:p-6 sm:p-8 shadow-2xl shadow-black/60 ring-1 ring-white/5">
          {/* Tabs */}
          <div className="flex rounded-xl bg-slate-950 p-1 mb-6 border border-slate-800/80">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setErrorMessage('');
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition ${
                mode === 'login'
                  ? 'bg-brand-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setErrorMessage('');
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition ${
                mode === 'register'
                  ? 'bg-brand-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Create Account
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'login' ? (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Your Chat ID
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      placeholder="e.g. CHAT482913"
                      value={chatId}
                      onChange={(e) => setChatId(e.target.value.toUpperCase())}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 font-mono tracking-wider text-base sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-300">Password</label>
                    <button
                      type="button"
                      onClick={() => setIsResetOpen(true)}
                      className="text-xs text-brand-400 hover:text-brand-300 transition py-1"
                    >
                      Forgot?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-3.5 py-2.5 pr-10 rounded-xl bg-slate-800/90 border border-slate-700 text-base sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 min-w-[36px] min-h-[36px] flex items-center justify-center text-slate-400 hover:text-slate-200"
                      aria-label="Toggle password visibility"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Display Name
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      placeholder="e.g. Alex Morgan"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 text-base sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="At least 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-3.5 py-2.5 pr-10 rounded-xl bg-slate-800/90 border border-slate-700 text-base sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 min-w-[36px] min-h-[36px] flex items-center justify-center text-slate-400 hover:text-slate-200"
                      aria-label="Toggle password visibility"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Security Question (For Account Recovery)
                  </label>
                  <select
                    value={securityQuestion}
                    onChange={(e) => setSecurityQuestion(e.target.value)}
                    className="w-full px-3 py-2.5 text-base sm:text-xs rounded-xl bg-slate-800/90 border border-slate-700 text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    {SECURITY_QUESTIONS.map((q) => (
                      <option key={q} value={q} className="bg-slate-900 text-white">
                        {q}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Your Secret Answer
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Used to recover your account without a phone"
                    value={securityAnswer}
                    onChange={(e) => setSecurityAnswer(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-base sm:text-sm rounded-xl bg-slate-800/90 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div className="p-3 rounded-xl bg-brand-950/40 border border-brand-800/40 text-xs text-brand-300 flex items-start space-x-2">
                  <Sparkles className="w-4 h-4 text-brand-400 flex-shrink-0 mt-0.5" />
                  <span>
                    A unique Chat ID (e.g. <strong>CHAT482913</strong>) will be generated for you automatically upon registration and shown on your screen.
                  </span>
                </div>
              </>
            )}

            {errorMessage && (
              <p className="text-xs text-rose-400 bg-rose-950/40 border border-rose-800/50 p-2.5 rounded-xl">
                {errorMessage}
              </p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full min-h-[44px] flex items-center justify-center space-x-2 py-3 px-4 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-semibold text-sm rounded-xl shadow-lg shadow-brand-500/25 transition disabled:opacity-50 mt-2"
            >
              <span>{isLoading ? 'Processing...' : mode === 'login' ? 'Sign In' : 'Create My Account'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Feature callouts */}
        <div className="mt-6 sm:mt-8 grid grid-cols-1 xs:grid-cols-3 gap-2 text-center text-xs text-slate-400">
          <div className="p-2.5 rounded-xl bg-slate-900/40 border border-slate-800/50">
            <span className="font-semibold text-white block">No Phone Number</span>
            100% Private IDs
          </div>
          <div className="p-2.5 rounded-xl bg-slate-900/40 border border-slate-800/50">
            <span className="font-semibold text-white block">HD WebRTC</span>
            Audio & Video Calls
          </div>
          <div className="p-2.5 rounded-xl bg-slate-900/40 border border-slate-800/50">
            <span className="font-semibold text-white block">Secure Storage</span>
            Protected media
          </div>
        </div>
      </div>

      <ResetPasswordModal isOpen={isResetOpen} onClose={() => setIsResetOpen(false)} />

      {newAccount && (
        <ChatIdRevealModal
          isOpen={isRevealOpen}
          chatId={newAccount.chatId}
          displayName={newAccount.displayName}
          onContinue={() => {
            setIsRevealOpen(false);
          }}
        />
      )}
    </div>
  );
};
