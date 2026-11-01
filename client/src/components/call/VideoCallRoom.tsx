import React, { useRef, useEffect } from 'react';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  ScreenShare,
  Volume2,
} from 'lucide-react';
import { useCall } from '../../context/CallContext';
import { Avatar } from '../common/Avatar';

export const VideoCallRoom: React.FC = () => {
  const {
    callState,
    localStream,
    remoteStream,
    endCall,
    toggleMute,
    toggleVideo,
    toggleScreenShare,
  } = useCall();

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // Bind and play local stream
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
      localVideoRef.current.play().catch((err) => {
        console.warn('[VideoCall] Local video autoplay blocked/interrupted:', err);
      });
    }
  }, [localStream, callState.isVideoOff]);

  // Bind and play remote stream
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.play().catch((err) => {
        console.warn('[VideoCall] Remote video autoplay blocked/interrupted:', err);
      });
    }
  }, [remoteStream, callState.isConnected]);

  if (!callState.active || callState.isIncoming || !callState.peer) {
    return null;
  }

  const peer = callState.peer;

  // Format call duration MM:SS
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isVideoCall = callState.callType === 'video';
  const hasRemoteVideo = Boolean(
    remoteStream &&
    remoteStream.getVideoTracks().length > 0 &&
    remoteStream.getVideoTracks().some((t) => t.enabled && t.readyState === 'live')
  );

  const showVideoSurface = isVideoCall && hasRemoteVideo && !callState.peerVideoOff;

  return (
    <div className="fixed inset-0 h-[100dvh] w-full max-w-[100vw] z-50 flex items-center justify-center bg-slate-950 text-white select-none animate-fade-in overflow-hidden">
      {/* Remote Video / Audio Main Surface */}
      <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
        {/* Remote Video is ALWAYS kept in DOM to maintain track decoding and uninterrupted audio */}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            showVideoSurface ? 'opacity-100' : 'opacity-0 pointer-events-none absolute'
          }`}
        />

        {/* Avatar fallback if video is off, loading, or audio-only call */}
        {!showVideoSurface && (
          <div className="flex flex-col items-center justify-center space-y-4 p-6 sm:p-8 text-center animate-fade-in z-10">
            <div className="relative">
              <Avatar
                name={peer.displayName}
                src={peer.avatar}
                size="xl"
                className="w-24 h-24 sm:w-28 sm:h-28 text-2xl sm:text-3xl ring-4 ring-brand-500/40 shadow-2xl"
              />
              {callState.peerMuted && (
                <div className="absolute -bottom-1 -right-1 p-1.5 sm:p-2 rounded-full bg-rose-600 text-white shadow-md">
                  <MicOff className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
              )}
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold font-display truncate max-w-xs">{peer.displayName}</h2>
              <p className="text-xs font-mono text-brand-400 mt-0.5">{peer.chatId}</p>
            </div>
            {callState.isConnected && (
              <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold">
                <Volume2 className="w-3.5 h-3.5 animate-pulse" />
                <span>Audio Connected</span>
              </div>
            )}
          </div>
        )}

        {/* Top Header: Peer Name & Call Status */}
        <div className="absolute top-3 sm:top-6 left-3 sm:left-6 right-3 sm:right-6 pt-safe flex items-center justify-between z-20 pointer-events-none">
          <div className="flex items-center space-x-2 sm:space-x-3 p-2 sm:p-2.5 px-3 sm:px-4 rounded-2xl bg-slate-900/80 backdrop-blur-md border border-white/10 shadow-lg pointer-events-auto max-w-[90vw]">
            <Avatar name={peer.displayName} src={peer.avatar} size="sm" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center space-x-1.5 truncate">
                <span className="text-xs sm:text-sm font-bold text-white truncate max-w-[110px] xs:max-w-[140px] sm:max-w-[200px]">
                  {peer.displayName}
                </span>
                <span className="text-[10px] sm:text-xs font-mono text-brand-300 flex-shrink-0">{peer.chatId}</span>
              </div>
              <div className="flex items-center space-x-1.5 text-[11px] sm:text-xs text-slate-300">
                <span
                  className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    callState.isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                  }`}
                />
                <span className="truncate">
                  {callState.isConnected
                    ? formatDuration(callState.durationSeconds)
                    : callState.statusText || 'Connecting...'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Local Picture-in-Picture Video */}
        {isVideoCall && (
          <div className="absolute bottom-24 sm:bottom-28 right-3 sm:right-6 w-28 xs:w-32 sm:w-44 aspect-[3/4] sm:aspect-video rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl bg-slate-900 z-20 group">
            {!callState.isVideoOff && localStream ? (
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${!callState.isScreenSharing ? 'video-mirror' : ''}`}
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-slate-800 text-slate-400 text-xs">
                <VideoOff className="w-4 h-4 sm:w-5 sm:h-5 mb-1" />
                <span className="text-[10px] sm:text-xs">Camera Off</span>
              </div>
            )}
            <div className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] bg-black/60 backdrop-blur-sm text-white">
              You {callState.isMuted && '(Muted)'}
            </div>
          </div>
        )}

        {/* Floating Bottom Controls */}
        <div className="absolute bottom-4 sm:bottom-8 left-1/2 -translate-x-1/2 flex items-center space-x-2.5 sm:space-x-4 p-2 sm:p-3 px-4 sm:px-6 rounded-3xl bg-slate-900/90 backdrop-blur-xl border border-white/10 shadow-2xl z-30 pb-safe max-w-[95vw]">
          {/* Mute/Unmute */}
          <button
            type="button"
            onClick={toggleMute}
            title={callState.isMuted ? 'Unmute' : 'Mute'}
            className={`p-3 sm:p-3.5 rounded-full transition shadow-md min-w-[44px] min-h-[44px] flex items-center justify-center ${
              callState.isMuted
                ? 'bg-rose-600 hover:bg-rose-700 text-white'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
            }`}
          >
            {callState.isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* Camera On/Off */}
          {isVideoCall && (
            <button
              type="button"
              onClick={toggleVideo}
              title={callState.isVideoOff ? 'Turn Camera On' : 'Turn Camera Off'}
              className={`p-3 sm:p-3.5 rounded-full transition shadow-md min-w-[44px] min-h-[44px] flex items-center justify-center ${
                callState.isVideoOff
                  ? 'bg-rose-600 hover:bg-rose-700 text-white'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
              }`}
            >
              {callState.isVideoOff ? (
                <VideoOff className="w-5 h-5" />
              ) : (
                <Video className="w-5 h-5" />
              )}
            </button>
          )}

          {/* Screen Share (Desktop / Tablet) */}
          {isVideoCall && (
            <button
              type="button"
              onClick={toggleScreenShare}
              title={callState.isScreenSharing ? 'Stop Screen Share' : 'Share Screen'}
              className={`hidden sm:flex p-3 sm:p-3.5 rounded-full transition shadow-md min-w-[44px] min-h-[44px] items-center justify-center ${
                callState.isScreenSharing
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
              }`}
            >
              <ScreenShare className="w-5 h-5" />
            </button>
          )}

          {/* End Call / Hangup */}
          <button
            type="button"
            onClick={endCall}
            title="End Call"
            className="p-3 sm:p-3.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/40 hover:scale-105 transition min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <PhoneOff className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
