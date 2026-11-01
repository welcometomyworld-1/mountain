import React, { useState } from 'react';
import { Copy, Check, Sparkles, Shield, ArrowRight, AlertCircle } from 'lucide-react';
import confetti from 'canvas-confetti';

interface ChatIdRevealModalProps {
  isOpen: boolean;
  chatId: string;
  displayName: string;
  onContinue: () => void;
}

export const ChatIdRevealModal: React.FC<ChatIdRevealModalProps> = ({
  isOpen,
  chatId,
  displayName,
  onContinue,
}) => {
  const [isCopied, setIsCopied] = useState(false);

  if (!isOpen || !chatId) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(chatId);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in select-none pt-safe pb-safe">
      <div className="relative w-full max-w-md rounded-3xl bg-slate-900 border border-brand-500/30 p-5 xs:p-6 sm:p-8 text-center shadow-2xl shadow-brand-500/20 space-y-5 sm:space-y-6 max-h-[92dvh] overflow-y-auto">
        {/* Glow ambient */}
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-48 bg-brand-500/20 rounded-full blur-2xl pointer-events-none" />

        {/* Icon */}
        <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-500 shadow-xl shadow-brand-500/30 ring-2 ring-brand-400/30">
          <Sparkles className="w-7 h-7 sm:w-8 sm:h-8 text-white animate-pulse" />
        </div>

        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white font-display">
            Account Created Successfully!
          </h2>
          <p className="mt-1.5 text-xs text-slate-300">
            Welcome, <strong className="text-white">{displayName}</strong>. Here is your private Chat ID:
          </p>
        </div>

        {/* Big Chat ID Display Box */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-b from-brand-950/80 to-slate-950 border border-brand-500/40 shadow-inner space-y-3">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-brand-300">
            Your Permanent Private Chat ID
          </span>
          <div className="text-2xl xs:text-3xl sm:text-4xl font-extrabold font-mono tracking-wider sm:tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-brand-300 via-white to-brand-300 py-1 break-all">
            {chatId}
          </div>

          <button
            type="button"
            onClick={handleCopy}
            className="w-full min-h-[44px] flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl text-xs font-semibold text-white bg-brand-600 hover:bg-brand-500 transition shadow-md shadow-brand-600/30"
          >
            {isCopied ? (
              <>
                <Check className="w-4 h-4 text-emerald-300" />
                <span>Copied to Clipboard!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copy My Chat ID</span>
              </>
            )}
          </button>
        </div>

        {/* Important reminder note */}
        <div className="p-3 sm:p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/30 text-left flex items-start space-x-2.5 text-xs text-amber-200">
          <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>Important:</strong> Please save your Chat ID! You will need it and your password to sign in to your account. Friends will also use this exact ID to chat or video call you.
          </p>
        </div>

        {/* Continue button */}
        <button
          type="button"
          onClick={onContinue}
          className="w-full min-h-[44px] flex items-center justify-center space-x-2 py-3 px-4 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-brand-500/25 transition"
        >
          <span>Continue to PrivateID</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
