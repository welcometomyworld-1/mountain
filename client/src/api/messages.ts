import { apiClient } from './client';
import { Conversation, Message, MediaAttachment } from '../types';

export const getConversationsApi = () => {
  return apiClient<{ success: boolean; conversations: Conversation[] }>(
    '/api/messages/conversations',
    { method: 'GET' }
  );
};

export const getOrCreateConversationApi = (params: {
  targetUserId?: string;
  targetChatId?: string;
}) => {
  return apiClient<{ success: boolean; conversation: Conversation }>(
    '/api/messages/conversations',
    {
      method: 'POST',
      data: params,
    }
  );
};

export const getMessagesApi = (conversationId: string) => {
  return apiClient<{ success: boolean; messages: Message[] }>(
    `/api/messages/conversations/${conversationId}/messages`,
    { method: 'GET' }
  );
};

export const sendMessageApi = (payload: {
  conversationId: string;
  content: string;
  messageType?: 'text' | 'image' | 'video' | 'audio' | 'document' | 'call_log';
  media?: MediaAttachment | null | unknown;
  replyTo?: unknown;
  isViewOnce?: boolean;
}) => {
  return apiClient<{ success: boolean; message: Message }>('/api/messages/messages', {
    method: 'POST',
    data: payload,
  });
};

export const getGroupMessagesApi = (groupId: string) => {
  return apiClient<{ success: boolean; messages: Message[] }>(
    `/api/messages/groups/${groupId}/messages`,
    { method: 'GET' }
  );
};

export const sendGroupMessageApi = (
  groupId: string,
  payload: {
    content: string;
    messageType?: 'text' | 'image' | 'video' | 'audio' | 'document' | 'call_log';
    media?: MediaAttachment | null | unknown;
    replyTo?: unknown;
    isViewOnce?: boolean;
  }
) => {
  return apiClient<{ success: boolean; message: Message }>(
    `/api/messages/groups/${groupId}/messages`,
    {
      method: 'POST',
      data: payload,
    }
  );
};

export const searchMessagesApi = (params: {
  q?: string;
  type?: string;
  conversationId?: string;
  groupId?: string;
  startDate?: string;
  endDate?: string;
}) => {
  const query = new URLSearchParams();
  if (params.q) query.set('q', params.q);
  if (params.type && params.type !== 'all') query.set('type', params.type);
  if (params.conversationId) query.set('conversationId', params.conversationId);
  if (params.groupId) query.set('groupId', params.groupId);
  if (params.startDate) query.set('startDate', params.startDate);
  if (params.endDate) query.set('endDate', params.endDate);

  return apiClient<{ success: boolean; resultsCount: number; messages: Message[] }>(
    `/api/messages/search?${query.toString()}`,
    { method: 'GET' }
  );
};

export const openViewOnceApi = (messageId: string) => {
  return apiClient<{ success: boolean; message: string; media: MediaAttachment; viewedAt: string }>(
    `/api/messages/${messageId}/view-once`,
    { method: 'POST' }
  );
};

export const markAsReadApi = (conversationId: string) => {
  return apiClient<{ success: boolean; message: string; conversationId: string }>(
    `/api/messages/conversations/${conversationId}/read`,
    { method: 'PUT' }
  );
};

export const clearConversationApi = (conversationId: string) => {
  return apiClient<{ success: boolean; message: string; conversationId: string }>(
    `/api/messages/conversations/${conversationId}/clear`,
    { method: 'DELETE' }
  );
};

export const deleteConversationApi = (conversationId: string) => {
  return apiClient<{ success: boolean; message: string; conversationId: string }>(
    `/api/messages/conversations/${conversationId}`,
    { method: 'DELETE' }
  );
};

export const addReactionApi = (messageId: string, emoji: string) => {
  return apiClient<{ success: boolean; reactions: unknown[]; messageId: string }>(
    `/api/messages/messages/${messageId}/reaction`,
    {
      method: 'POST',
      data: { emoji },
    }
  );
};

export const deleteMessageApi = (
  messageId: string,
  deleteType: 'for_me' | 'for_everyone'
) => {
  return apiClient<{ success: boolean; message: string; messageId: string }>(
    `/api/messages/messages/${messageId}`,
    {
      method: 'DELETE',
      data: { deleteType },
    }
  );
};

