import { apiClient } from './client';
import { CallLog } from '../types';

export const getCallLogsApi = () => {
  return apiClient<{ success: boolean; calls: CallLog[] }>('/api/calls', {
    method: 'GET',
  });
};

export const createCallLogApi = (payload: {
  recipientId: string;
  callType: 'audio' | 'video';
  status: 'completed' | 'missed' | 'declined' | 'busy' | 'failed';
  duration?: number;
}) => {
  return apiClient<{ success: boolean; callLog: CallLog }>('/api/calls', {
    method: 'POST',
    data: payload,
  });
};

export const clearCallLogsApi = () => {
  return apiClient<{ success: boolean; message: string }>('/api/calls', {
    method: 'DELETE',
  });
};
