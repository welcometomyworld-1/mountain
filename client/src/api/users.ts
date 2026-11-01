import { apiClient } from './client';
import { User, Contact } from '../types';

export const searchByChatIdApi = (chatId: string) => {
  return apiClient<{ success: boolean; user: User }>(
    `/api/users/search?chatId=${encodeURIComponent(chatId)}`,
    { method: 'GET' }
  );
};

export const searchUserByChatIdApi = searchByChatIdApi;


export const getContactsApi = () => {
  return apiClient<{ success: boolean; contacts: Contact[] }>('/api/users/contacts', {
    method: 'GET',
  });
};

export const addContactApi = (targetUserId: string, nickname?: string) => {
  return apiClient<{ success: boolean; message: string; contact: Contact }>(
    '/api/users/contacts',
    {
      method: 'POST',
      data: { targetUserId, nickname },
    }
  );
};

export const removeContactApi = (targetUserId: string) => {
  return apiClient<{ success: boolean; message: string; targetUserId: string }>(
    `/api/users/contacts/${targetUserId}`,
    { method: 'DELETE' }
  );
};

export const blockUserApi = (targetUserId: string) => {
  return apiClient<{ success: boolean; message: string; targetUserId: string }>(
    '/api/users/block',
    {
      method: 'POST',
      data: { targetUserId },
    }
  );
};

export const unblockUserApi = (targetUserId: string) => {
  return apiClient<{ success: boolean; message: string; targetUserId: string }>(
    `/api/users/block/${targetUserId}`,
    { method: 'DELETE' }
  );
};

export const getBlockedUsersApi = () => {
  return apiClient<{ success: boolean; blockedUsers: User[] }>('/api/users/blocked', {
    method: 'GET',
  });
};

