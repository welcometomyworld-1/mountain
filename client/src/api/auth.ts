import { apiClient } from './client';
import { User } from '../types';

export interface RegisterPayload {
  displayName: string;
  password: string;
  securityQuestion: string;
  securityAnswer: string;
  avatar?: string;
  bio?: string;
}

export interface LoginPayload {
  chatId: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  token: string;
  chatId?: string;
  user: User;
}

export const registerApi = (payload: RegisterPayload) => {
  return apiClient<AuthResponse>('/api/auth/register', {
    method: 'POST',
    data: payload,
  });
};

export const loginApi = (payload: LoginPayload) => {
  return apiClient<AuthResponse>('/api/auth/login', {
    method: 'POST',
    data: payload,
  });
};

export const getMeApi = () => {
  return apiClient<{ success: boolean; user: User }>('/api/auth/me', {
    method: 'GET',
  });
};

export const getSecurityQuestionApi = (chatId: string) => {
  return apiClient<{ success: boolean; chatId: string; securityQuestion: string }>(
    `/api/auth/security-question/${encodeURIComponent(chatId)}`,
    { method: 'GET' }
  );
};

export const resetPasswordApi = (payload: {
  chatId: string;
  securityAnswer: string;
  newPassword: string;
}) => {
  return apiClient<{ success: boolean; message: string }>('/api/auth/reset-password', {
    method: 'POST',
    data: payload,
  });
};

export const updateProfileApi = (payload: Partial<User>) => {
  return apiClient<{ success: boolean; message: string; user: User }>(
    '/api/auth/profile',
    {
      method: 'PUT',
      data: payload,
    }
  );
};
