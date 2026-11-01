import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { User, CallState, CallLog } from '../types';
import { useSocket } from './SocketContext';
import { fetchIceServers } from '../utils/rtcConfig';
import { sounds } from '../utils/sound';
import { getCallLogsApi, clearCallLogsApi } from '../api/calls';

interface CallContextType {
  callState: CallState;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  callLogs: CallLog[];
  isLoadingCallLogs: boolean;
  refreshCallLogs: () => Promise<void>;
  clearCallHistory: () => Promise<void>;
  startCall: (peer: User, callType?: 'video' | 'audio') => Promise<void>;
  answerCall: () => Promise<void>;
  rejectCall: (reason?: 'declined' | 'busy') => void;
  endCall: () => void;
  toggleMute: () => void;
  toggleVideo: () => void;
  toggleScreenShare: () => Promise<void>;
}

const initialCallState: CallState = {
  active: false,
  callId: null,
  peer: null,
  callType: 'video',
  isIncoming: false,
  isOutgoing: false,
  isConnected: false,
  isMuted: false,
  isVideoOff: false,
  isScreenSharing: false,
  peerMuted: false,
  peerVideoOff: false,
  durationSeconds: 0,
  statusText: '',
};

const CallContext = createContext<CallContextType | undefined>(undefined);

export const CallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { socket } = useSocket();

  const [callState, setCallState] = useState<CallState>(initialCallState);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [isLoadingCallLogs, setIsLoadingCallLogs] = useState<boolean>(false);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const screenTrackRef = useRef<MediaStreamTrack | null>(null);
  const cameraTrackRef = useRef<MediaStreamTrack | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const incomingOfferRef = useRef<RTCSessionDescriptionInit | null>(null);
  const timerRef = useRef<number | null>(null);
  const callStateRef = useRef<CallState>(initialCallState);
  const currentCallIdRef = useRef<string | null>(null);
  const peerRef = useRef<User | null>(null);

  // Sync state refs to prevent stale closure issues in socket handlers
  useEffect(() => {
    callStateRef.current = callState;
    currentCallIdRef.current = callState.callId;
    peerRef.current = callState.peer;
  }, [callState]);

  useEffect(() => {
    localStreamRef.current = localStream;
  }, [localStream]);

  useEffect(() => {
    remoteStreamRef.current = remoteStream;
  }, [remoteStream]);

  const refreshCallLogs = async () => {
    setIsLoadingCallLogs(true);
    try {
      const res = await getCallLogsApi();
      if (res.success) {
        setCallLogs(res.calls);
      }
    } catch (err) {
      console.warn('Failed to fetch call logs:', err);
    } finally {
      setIsLoadingCallLogs(false);
    }
  };

  const clearCallHistory = async () => {
    try {
      await clearCallLogsApi();
      setCallLogs([]);
    } catch (err) {
      console.error('Failed to clear call history:', err);
    }
  };

  useEffect(() => {
    refreshCallLogs();
  }, []);

  // Resilient media acquisition helper with multi-stage mobile & browser fallback
  const getMediaStream = async (callType: 'video' | 'audio'): Promise<MediaStream> => {
    if (callType === 'video') {
      try {
        // Stage 1: Optimized HD mobile/desktop constraints
        return await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
          video: {
            facingMode: 'user',
            width: { ideal: 640, max: 1280 },
            height: { ideal: 480, max: 720 },
          },
        });
      } catch (err) {
        console.warn('[WebRTC] Stage 1 media constraints failed, attempting basic video/audio:', err);
        try {
          // Stage 2: Basic unconstrained video + audio
          return await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: true,
          });
        } catch (videoErr) {
          console.warn('[WebRTC] Stage 2 video access failed or blocked, falling back to audio-only to prevent call drop:', videoErr);
          // Stage 3: Audio-only fallback so call always connects rather than terminating
          return await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
            },
            video: false,
          });
        }
      }
    } else {
      try {
        return await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
          video: false,
        });
      } catch (audioErr) {
        return await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: false,
        });
      }
    }
  };

  // Helper to process buffered ICE candidates safely
  const flushPendingCandidates = async (pc: RTCPeerConnection) => {
    while (pendingCandidatesRef.current.length > 0) {
      const cand = pendingCandidatesRef.current.shift();
      if (cand) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(cand));
        } catch (e) {
          console.warn('[WebRTC] Error adding buffered ICE candidate:', e);
        }
      }
    }
  };

  // Cleanup helper
  const cleanupCall = () => {
    sounds.stopRingtone();

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
    }

    if (screenTrackRef.current) {
      screenTrackRef.current.stop();
      screenTrackRef.current = null;
    }

    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }

    pendingCandidatesRef.current = [];
    incomingOfferRef.current = null;
    cameraTrackRef.current = null;
    currentCallIdRef.current = null;
    peerRef.current = null;

    setLocalStream(null);
    setRemoteStream(null);
  };

  // End call gracefully
  const endCall = () => {
    const currentPeer = peerRef.current || callState.peer;
    const callId = currentCallIdRef.current || callState.callId;

    if (socket && currentPeer) {
      socket.emit('end_call', {
        callId,
        targetUserId: currentPeer._id,
      });
    }

    sounds.playCallEnd();
    cleanupCall();
    setCallState(initialCallState);
    setTimeout(refreshCallLogs, 1000);
  };

  // Start outgoing call
  const startCall = async (peer: User, callType: 'video' | 'audio' = 'video') => {
    if (!socket) return;

    try {
      cleanupCall();

      peerRef.current = peer;

      setCallState({
        ...initialCallState,
        active: true,
        peer,
        callType,
        isOutgoing: true,
        statusText: `Calling ${peer.displayName}...`,
      });

      // Request media permissions with resilient fallback
      const stream = await getMediaStream(callType);
      setLocalStream(stream);
      localStreamRef.current = stream;

      if (callType === 'video') {
        cameraTrackRef.current = stream.getVideoTracks()[0] || null;
      }

      // Initialize RTCPeerConnection with STUN/TURN servers
      const rtcConfig = await fetchIceServers();
      const pc = new RTCPeerConnection(rtcConfig);
      pcRef.current = pc;

      // Add local audio and video tracks
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      // Handle remote tracks dynamically
      pc.ontrack = (event) => {
        console.log('[WebRTC] Inbound track received:', event.track.kind);
        if (event.streams && event.streams[0]) {
          setRemoteStream(event.streams[0]);
          remoteStreamRef.current = event.streams[0];
        } else {
          let s = remoteStreamRef.current;
          if (!s) {
            s = new MediaStream();
            remoteStreamRef.current = s;
            setRemoteStream(s);
          }
          s.addTrack(event.track);
        }
      };

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate && socket && peerRef.current) {
          socket.emit('ice_candidate', {
            targetUserId: peerRef.current._id,
            candidate: event.candidate,
            callId: currentCallIdRef.current,
          });
        }
      };

      // Connection health listeners
      pc.oniceconnectionstatechange = () => {
        console.log('[WebRTC] ICE Connection State:', pc.iceConnectionState);
        if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
          setCallState((prev) => ({
            ...prev,
            isConnected: true,
            statusText: 'Connected',
          }));
        } else if (pc.iceConnectionState === 'failed') {
          if (pc.restartIce) pc.restartIce();
        }
      };

      pc.onconnectionstatechange = () => {
        console.log('[WebRTC] Peer Connection State:', pc.connectionState);
        if (pc.connectionState === 'connected') {
          setCallState((prev) => ({
            ...prev,
            isConnected: true,
            statusText: 'Connected',
          }));
        }
      };

      // Create SDP offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Emit call_user
      socket.emit(
        'call_user',
        {
          recipientUserId: peer._id,
          callType,
          offer,
        },
        (res: { success: boolean; callId?: string; reason?: string }) => {
          if (res.success && res.callId) {
            currentCallIdRef.current = res.callId;
            setCallState((prev) => ({
              ...prev,
              callId: res.callId || null,
              statusText: 'Ringing...',
            }));
          } else {
            handleCallFailure(res.reason || 'offline');
          }
        }
      );
    } catch (err: any) {
      console.error('Failed to initiate call:', err);
      let errMsg = 'Failed to access camera/microphone.';
      if (err.name === 'NotAllowedError') {
        errMsg = 'Permission to access camera/microphone was denied.';
      } else if (err.name === 'NotFoundError') {
        errMsg = 'No camera or microphone found on your device.';
      }
      setCallState((prev) => ({
        ...prev,
        statusText: errMsg,
      }));
      setTimeout(() => {
        cleanupCall();
        setCallState(initialCallState);
      }, 3000);
    }
  };

  // Answer incoming call
  const answerCall = async () => {
    const currentPeer = peerRef.current || callState.peer;
    if (!socket || !incomingOfferRef.current || !currentPeer) return;

    sounds.stopRingtone();

    try {
      setCallState((prev) => ({
        ...prev,
        isIncoming: false,
        statusText: 'Connecting...',
      }));

      // Get user media with multi-stage fallback
      const stream = await getMediaStream(callState.callType);
      setLocalStream(stream);
      localStreamRef.current = stream;

      const hasVideoTrack = stream.getVideoTracks().length > 0;
      if (hasVideoTrack) {
        cameraTrackRef.current = stream.getVideoTracks()[0] || null;
      }

      const rtcConfig = await fetchIceServers();
      const pc = new RTCPeerConnection(rtcConfig);
      pcRef.current = pc;

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.ontrack = (event) => {
        console.log('[WebRTC] Inbound track on recipient:', event.track.kind);
        if (event.streams && event.streams[0]) {
          setRemoteStream(event.streams[0]);
          remoteStreamRef.current = event.streams[0];
        } else {
          let s = remoteStreamRef.current;
          if (!s) {
            s = new MediaStream();
            remoteStreamRef.current = s;
            setRemoteStream(s);
          }
          s.addTrack(event.track);
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate && socket && peerRef.current) {
          socket.emit('ice_candidate', {
            targetUserId: peerRef.current._id,
            candidate: event.candidate,
            callId: currentCallIdRef.current,
          });
        }
      };

      pc.oniceconnectionstatechange = () => {
        console.log('[WebRTC] Recipient ICE state:', pc.iceConnectionState);
        if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
          setCallState((prev) => ({
            ...prev,
            isConnected: true,
            statusText: 'Connected',
          }));
        }
      };

      pc.onconnectionstatechange = () => {
        console.log('[WebRTC] Recipient Peer Connection State:', pc.connectionState);
        if (pc.connectionState === 'connected') {
          setCallState((prev) => ({
            ...prev,
            isConnected: true,
            statusText: 'Connected',
          }));
        }
      };

      // Set remote offer
      await pc.setRemoteDescription(new RTCSessionDescription(incomingOfferRef.current));

      // Flush any queued ICE candidates
      await flushPendingCandidates(pc);

      // Create SDP answer
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      // Emit accept_call
      socket.emit('accept_call', {
        callId: currentCallIdRef.current || callState.callId,
        callerUserId: currentPeer._id,
        answer,
      });

      setCallState((prev) => ({
        ...prev,
        isConnected: true,
        isVideoOff: !hasVideoTrack,
        statusText: 'Connected',
      }));

      startTimer();
    } catch (err: any) {
      console.error('Failed to answer call:', err);
      setCallState((prev) => ({
        ...prev,
        statusText: `Cannot connect: ${err.message || 'Media blocked'}`,
      }));
      setTimeout(() => {
        rejectCall('declined');
      }, 2000);
    }
  };

  // Reject incoming call
  const rejectCall = (reason: 'declined' | 'busy' = 'declined') => {
    sounds.stopRingtone();
    const currentPeer = peerRef.current || callState.peer;

    if (socket && currentPeer) {
      socket.emit('reject_call', {
        callId: currentCallIdRef.current || callState.callId,
        callerUserId: currentPeer._id,
        reason,
      });
    }

    cleanupCall();
    setCallState(initialCallState);
    setTimeout(refreshCallLogs, 1000);
  };

  // Helper for call failure
  const handleCallFailure = (reason: string) => {
    sounds.playCallEnd();
    let message = 'Call failed.';
    if (reason === 'offline') message = 'User is currently offline.';
    if (reason === 'busy') message = 'User is busy on another call.';
    if (reason === 'declined') message = 'Call declined.';

    setCallState((prev) => ({
      ...prev,
      statusText: message,
      isConnected: false,
      isOutgoing: false,
    }));

    setTimeout(() => {
      cleanupCall();
      setCallState(initialCallState);
    }, 2500);
  };

  // Call duration timer
  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => {
      setCallState((prev) => ({
        ...prev,
        durationSeconds: prev.durationSeconds + 1,
      }));
    }, 1000);
  };

  // Toggle microphone
  const toggleMute = () => {
    if (!localStream) return;
    const audioTrack = localStream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      const isMuted = !audioTrack.enabled;

      setCallState((prev) => ({ ...prev, isMuted }));

      const currentPeer = peerRef.current || callState.peer;
      if (socket && currentPeer) {
        socket.emit('media_state_change', {
          targetUserId: currentPeer._id,
          isAudioMuted: isMuted,
        });
      }
    }
  };

  // Toggle camera
  const toggleVideo = () => {
    if (!localStream) return;
    const videoTrack = localStream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      const isVideoOff = !videoTrack.enabled;

      setCallState((prev) => ({ ...prev, isVideoOff }));

      const currentPeer = peerRef.current || callState.peer;
      if (socket && currentPeer) {
        socket.emit('media_state_change', {
          targetUserId: currentPeer._id,
          isVideoMuted: isVideoOff,
        });
      }
    }
  };

  // Toggle screen share
  const toggleScreenShare = async () => {
    const currentPeer = peerRef.current || callState.peer;
    if (!pcRef.current || !currentPeer) return;

    if (callState.isScreenSharing) {
      // Revert to camera
      if (cameraTrackRef.current && pcRef.current) {
        const videoSender = pcRef.current
          .getSenders()
          .find((s) => s.track && s.track.kind === 'video');

        if (videoSender) {
          videoSender.replaceTrack(cameraTrackRef.current);
        }
      }

      if (screenTrackRef.current) {
        screenTrackRef.current.stop();
        screenTrackRef.current = null;
      }

      setCallState((prev) => ({ ...prev, isScreenSharing: false }));

      socket?.emit('media_state_change', {
        targetUserId: currentPeer._id,
        isScreenSharing: false,
      });
    } else {
      // Start screen share
      try {
        const displayStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
        });
        const screenTrack = displayStream.getVideoTracks()[0];
        screenTrackRef.current = screenTrack;

        const videoSender = pcRef.current
          .getSenders()
          .find((s) => s.track && s.track.kind === 'video');

        if (videoSender) {
          videoSender.replaceTrack(screenTrack);
        }

        setCallState((prev) => ({ ...prev, isScreenSharing: true }));

        socket?.emit('media_state_change', {
          targetUserId: currentPeer._id,
          isScreenSharing: true,
        });

        screenTrack.onended = () => {
          toggleScreenShare();
        };
      } catch (err) {
        console.warn('Screen share cancelled or failed:', err);
      }
    }
  };

  // Socket signaling listeners (stable, using refs for live values)
  useEffect(() => {
    if (!socket) return;

    // Incoming call
    const handleIncomingCall = ({
      callId,
      caller,
      callType,
      offer,
    }: {
      callId: string;
      caller: User;
      callType: 'video' | 'audio';
      offer: RTCSessionDescriptionInit;
    }) => {
      // If already in an active call, auto-reject with busy
      if (callStateRef.current.active) {
        socket.emit('reject_call', {
          callId,
          callerUserId: caller._id,
          reason: 'busy',
        });
        return;
      }

      incomingOfferRef.current = offer;
      currentCallIdRef.current = callId;
      peerRef.current = caller;

      sounds.startRingtone();

      if (
        typeof window !== 'undefined' &&
        'Notification' in window &&
        Notification.permission === 'granted' &&
        document.hidden
      ) {
        try {
          new Notification(`Incoming ${callType.toUpperCase()} Call`, {
            body: `From ${caller.displayName} (${caller.chatId})`,
            icon: caller.avatar || '/favicon.ico',
          });
        } catch (e) {
          console.warn('Call notification error:', e);
        }
      }

      setCallState({
        ...initialCallState,
        active: true,
        callId,
        peer: caller,
        callType,
        isIncoming: true,
        statusText: `Incoming ${callType} call from ${caller.displayName}...`,
      });
    };

    // Call accepted by recipient
    const handleCallAccepted = async ({
      answer,
    }: {
      callId: string;
      answer: RTCSessionDescriptionInit;
    }) => {
      if (pcRef.current) {
        try {
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
          await flushPendingCandidates(pcRef.current);

          setCallState((prev) => ({
            ...prev,
            isConnected: true,
            isOutgoing: false,
            statusText: 'Connected',
          }));

          startTimer();
        } catch (err) {
          console.error('Error setting remote answer:', err);
        }
      }
    };

    // Call rejected
    const handleCallRejected = ({ reason }: { callId: string; reason: string }) => {
      handleCallFailure(reason);
    };

    // Call ended by peer
    const handleCallEnded = ({ reason }: { callId: string; reason: string }) => {
      sounds.playCallEnd();
      setCallState((prev) => ({
        ...prev,
        statusText: reason === 'disconnected' ? 'Peer disconnected.' : 'Call ended.',
        isConnected: false,
      }));

      setTimeout(() => {
        cleanupCall();
        setCallState(initialCallState);
        refreshCallLogs();
      }, 1500);
    };

    // ICE Candidate
    const handleIceCandidate = async ({
      candidate,
    }: {
      candidate: RTCIceCandidateInit;
    }) => {
      if (pcRef.current && pcRef.current.remoteDescription) {
        try {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.error('Error adding ICE candidate:', err);
        }
      } else {
        pendingCandidatesRef.current.push(candidate);
      }
    };

    // Peer media state change
    const handlePeerMediaStateChanged = ({
      isVideoMuted,
      isAudioMuted,
    }: {
      isVideoMuted?: boolean;
      isAudioMuted?: boolean;
    }) => {
      setCallState((prev) => ({
        ...prev,
        peerMuted: isAudioMuted !== undefined ? isAudioMuted : prev.peerMuted,
        peerVideoOff: isVideoMuted !== undefined ? isVideoMuted : prev.peerVideoOff,
      }));
    };

    socket.on('incoming_call', handleIncomingCall);
    socket.on('call_accepted', handleCallAccepted);
    socket.on('call_rejected', handleCallRejected);
    socket.on('call_ended', handleCallEnded);
    socket.on('ice_candidate', handleIceCandidate);
    socket.on('peer_media_state_changed', handlePeerMediaStateChanged);

    return () => {
      socket.off('incoming_call', handleIncomingCall);
      socket.off('call_accepted', handleCallAccepted);
      socket.off('call_rejected', handleCallRejected);
      socket.off('call_ended', handleCallEnded);
      socket.off('ice_candidate', handleIceCandidate);
      socket.off('peer_media_state_changed', handlePeerMediaStateChanged);
    };
  }, [socket]);

  return (
    <CallContext.Provider
      value={{
        callState,
        localStream,
        remoteStream,
        callLogs,
        isLoadingCallLogs,
        refreshCallLogs,
        clearCallHistory,
        startCall,
        answerCall,
        rejectCall,
        endCall,
        toggleMute,
        toggleVideo,
        toggleScreenShare,
      }}
    >
      {children}
    </CallContext.Provider>
  );
};

export const useCall = () => {
  const context = useContext(CallContext);
  if (!context) throw new Error('useCall must be used within a CallProvider');
  return context;
};
