import React from 'react';
import { Phone, PhoneOff, Video } from 'lucide-react';
import { useCall } from '../../context/CallContext';
import { Avatar } from '../common/Avatar';

export const IncomingCallModal: React.FC = () => {
  const { callState, answerCall, rejectCall } = useCall();

  if (!callState.active || !callState.isIncoming || !callState.peer) {
    return null;
  }

  const caller = callState.peer;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in select-none pt-safe pb-safe">
      <div className="relative w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-800 p-5 xs:p-6 sm:p-8 text-center shadow-2xl space-y-5 sm:space-y-6">
        {/* Pulsing Avatar */}
        <div className="relative inline-block">
          <div className="absolute inset-0 rounded-full bg-brand-500/30 animate-ping" />
          <Avatar
            name={caller.displayName}
            src={caller.avatar}
            size="xl"
            className="ring-4 ring-brand-500/50 shadow-2xl relative z-10"
          />
        </div>

        <div>
          <h3 className="text-xl font-extrabold text-white font-display">
            {caller.displayName}
          </h3>
          <p className="text-xs font-mono font-medium text-brand-400 mt-0.5">
            {caller.chatId}
          </p>
          <div className="mt-3 inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-slate-800 text-xs font-medium text-slate-300">
            {callState.callType === 'video' ? (
              <Video className="w-3.5 h-3.5 text-brand-400" />
            ) : (
              <Phone className="w-3.5 h-3.5 text-brand-400" />
            )}
            <span>Incoming {callState.callType === 'video' ? 'Video' : 'Audio'} Call...</span>
          </div>
        </div>

        {/* Accept & Reject buttons */}
        <div className="flex items-center justify-center space-x-6 pt-4">
          {/* Reject */}
          <button
            type="button"
            onClick={() => rejectCall('declined')}
            className="flex flex-col items-center space-y-1.5 group"
          >
            <div className="w-14 h-14 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-lg shadow-rose-600/30 group-hover:scale-105 transition">
              <PhoneOff className="w-6 h-6" />
            </div>
            <span className="text-xs font-medium text-slate-400 group-hover:text-white">Decline</span>
          </button>

          {/* Accept */}
          <button
            type="button"
            onClick={answerCall}
            className="flex flex-col items-center space-y-1.5 group"
          >
            <div className="w-14 h-14 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center shadow-lg shadow-emerald-600/30 group-hover:scale-105 transition animate-pulse">
              <Phone className="w-6 h-6" />
            </div>
            <span className="text-xs font-medium text-slate-400 group-hover:text-white">Accept</span>
          </button>
        </div>
      </div>
    </div>
  );
};
