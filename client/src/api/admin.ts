import { apiClient } from './client';
import { User, AdminStats, AdminCallItem, AdminGroupItem } from '../types';

export interface GetUsersResponse {
  success: boolean;
  users: User[];
  total: number;
  page: number;
  pages: number;
}

export interface GetStatsResponse {
  success: boolean;
  stats: AdminStats;
  onlineUsers: User[];
  recentUsers: User[];
}

export interface GetCallsResponse {
  success: boolean;
  calls: AdminCallItem[];
}

export interface GetGroupsResponse {
  success: boolean;
  groups: AdminGroupItem[];
}

/**
 * Fetch platform overview statistics
 */
export const getAdminStatsApi = async (): Promise<GetStatsResponse> => {
  return apiClient<GetStatsResponse>('/api/admin/stats', {
    method: 'GET',
  });
};

/**
 * Fetch users with search and filter
 */
export const getAdminUsersApi = async (
  search = '',
  filter = 'all',
  page = 1,
  limit = 50
): Promise<GetUsersResponse> => {
  const query = new URLSearchParams({
    search,
    filter,
    page: page.toString(),
    limit: limit.toString(),
  }).toString();

  return apiClient<GetUsersResponse>(`/api/admin/users?${query}`, {
    method: 'GET',
  });
};

/**
 * Toggle user ban
 */
export const toggleBanUserApi = async (
  userId: string,
  reason = ''
): Promise<{ success: boolean; message: string; user: User }> => {
  return apiClient<{ success: boolean; message: string; user: User }>(
    `/api/admin/users/${userId}/toggle-ban`,
    {
      method: 'POST',
      data: { reason },
    }
  );
};

/**
 * Reset a user password
 */
export const resetUserPasswordApi = async (
  userId: string,
  newPassword: string
): Promise<{ success: boolean; message: string }> => {
  return apiClient<{ success: boolean; message: string }>(
    `/api/admin/users/${userId}/reset-password`,
    {
      method: 'POST',
      data: { newPassword },
    }
  );
};

/**
 * Delete user account
 */
export const deleteUserApi = async (
  userId: string
): Promise<{ success: boolean; message: string }> => {
  return apiClient<{ success: boolean; message: string }>(
    `/api/admin/users/${userId}`,
    {
      method: 'DELETE',
    }
  );
};

/**
 * Fetch platform calls audit log
 */
export const getAdminCallsApi = async (limit = 50): Promise<GetCallsResponse> => {
  return apiClient<GetCallsResponse>(`/api/admin/calls?limit=${limit}`, {
    method: 'GET',
  });
};

/**
 * Fetch platform groups audit log
 */
export const getAdminGroupsApi = async (): Promise<GetGroupsResponse> => {
  return apiClient<GetGroupsResponse>('/api/admin/groups', {
    method: 'GET',
  });
};

/**
 * Send real-time system broadcast
 */
export const sendSystemBroadcastApi = async (
  title: string,
  message: string,
  type: 'info' | 'warning' | 'urgent' | 'success' = 'info'
): Promise<{ success: boolean; message: string }> => {
  return apiClient<{ success: boolean; message: string }>('/api/admin/broadcast', {
    method: 'POST',
    data: { title, message, type },
  });
};
