import { apiClient } from './client';
import { Group } from '../types';

export const createGroupApi = (payload: {
  name: string;
  description?: string;
  avatar?: string;
  memberChatIds?: string[];
}) => {
  return apiClient<{ success: boolean; group: Group }>('/api/groups', {
    method: 'POST',
    data: payload,
  });
};

export const getUserGroupsApi = () => {
  return apiClient<{ success: boolean; groups: Group[] }>('/api/groups', {
    method: 'GET',
  });
};

export const getGroupDetailsApi = (groupId: string) => {
  return apiClient<{ success: boolean; group: Group }>(`/api/groups/${groupId}`, {
    method: 'GET',
  });
};

export const addMemberByChatIdApi = (groupId: string, chatId: string) => {
  return apiClient<{ success: boolean; message: string; group: Group }>(
    `/api/groups/${groupId}/members`,
    {
      method: 'POST',
      data: { chatId },
    }
  );
};

export const removeMemberApi = (groupId: string, memberId: string) => {
  return apiClient<{ success: boolean; message: string; groupId: string; memberId: string }>(
    `/api/groups/${groupId}/members/${memberId}`,
    {
      method: 'DELETE',
    }
  );
};

export const leaveGroupApi = (groupId: string) => {
  return apiClient<{ success: boolean; message: string; groupId: string }>(
    `/api/groups/${groupId}/leave`,
    {
      method: 'POST',
    }
  );
};
