import { apiClient } from './client';
import { MediaAttachment, User } from '../types';

export const uploadImageApi = async (file: File): Promise<MediaAttachment> => {
  const formData = new FormData();
  formData.append('image', file);

  const response = await apiClient<{ success: boolean; media: MediaAttachment }>(
    '/api/upload/image',
    {
      method: 'POST',
      data: formData,
    }
  );

  return response.media;
};

export const uploadFileApi = async (file: File | Blob, filename?: string): Promise<MediaAttachment> => {
  const formData = new FormData();
  if (filename) {
    formData.append('file', file, filename);
  } else {
    formData.append('file', file);
  }

  const response = await apiClient<{ success: boolean; media: MediaAttachment }>(
    '/api/upload/file',
    {
      method: 'POST',
      data: formData,
    }
  );

  return response.media;
};

export const uploadAvatarApi = async (file: File): Promise<{ avatar: string; user: User }> => {
  const formData = new FormData();
  formData.append('avatar', file);

  const response = await apiClient<{ success: boolean; message: string; avatar: string; user: User }>(
    '/api/upload/avatar',
    {
      method: 'POST',
      data: formData,
    }
  );

  return { avatar: response.avatar, user: response.user };
};

