import { apiClient } from '../api/client';

export const DEFAULT_RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478' },
    { urls: 'stun:stun.cloudflare.com:3478' },
  ],
  iceCandidatePoolSize: 10,
};

export const fetchIceServers = async (): Promise<RTCConfiguration> => {
  try {
    const data = await apiClient<{ success: boolean; iceServers: RTCIceServer[] }>('/api/webrtc/ice-servers');
    if (data.iceServers && data.iceServers.length > 0) {
      return {
        iceServers: data.iceServers,
        iceCandidatePoolSize: 10,
      };
    }
  } catch (err) {
    console.warn('Could not fetch remote ICE servers, using defaults:', err);
  }
  return DEFAULT_RTC_CONFIG;
};
