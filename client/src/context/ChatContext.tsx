import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { Conversation, Message, Contact, MediaAttachment, ReplyPreview, User, Group } from '../types';
import {
  getConversationsApi,
  getOrCreateConversationApi,
  getMessagesApi,
  sendMessageApi,
  getGroupMessagesApi,
  sendGroupMessageApi,
  searchMessagesApi,
  openViewOnceApi,
  markAsReadApi,
  clearConversationApi,
  deleteConversationApi,
  addReactionApi,
  deleteMessageApi,
} from '../api/messages';
import {
  getContactsApi,
  addContactApi,
  removeContactApi,
  blockUserApi,
} from '../api/users';
import { getUserGroupsApi, createGroupApi } from '../api/groups';
import { useSocket } from './SocketContext';
import { useAuth } from './AuthContext';
import { sounds } from '../utils/sound';
import { initNotifications, triggerDeviceNotification } from '../utils/notification';
import { InAppNotification } from '../components/common/NotificationToast';

interface ChatContextType {
  inAppNotification: InAppNotification | null;
  dismissInAppNotification: () => void;
  conversations: Conversation[];
  activeConversation: Conversation | null;
  groups: Group[];
  activeGroup: Group | null;
  messages: Message[];
  contacts: Contact[];
  isTyping: boolean;
  typingUser: { displayName: string } | null;
  isLoadingConversations: boolean;
  isLoadingGroups: boolean;
  isLoadingMessages: boolean;
  isSearching: boolean;
  searchResults: Message[];
  searchQuery: string;
  searchTypeFilter: string;
  selectConversation: (conversation: Conversation) => Promise<void>;
  selectGroup: (group: Group) => Promise<void>;
  startConversationWithUser: (params: { targetUserId?: string; targetChatId?: string }) => Promise<Conversation>;
  createGroup: (payload: { name: string; description?: string; avatar?: string; memberChatIds?: string[] }) => Promise<Group>;
  sendMessage: (
    content: string,
    messageType?: 'text' | 'image' | 'video' | 'audio' | 'document' | 'call_log',
    media?: MediaAttachment | null,
    replyTo?: ReplyPreview | null,
    isViewOnce?: boolean
  ) => Promise<void>;
  sendReaction: (messageId: string, emoji: string) => Promise<void>;
  deleteMessage: (messageId: string, deleteType: 'for_me' | 'for_everyone') => Promise<void>;
  clearCurrentConversation: () => Promise<void>;
  deleteConversation: (conversationId: string) => Promise<void>;
  openViewOnceMedia: (messageId: string) => Promise<MediaAttachment | null>;
  searchMessages: (q: string, type?: string) => Promise<void>;
  clearSearch: () => void;
  emitTyping: (isTyping: boolean) => void;
  refreshContacts: () => Promise<void>;
  refreshConversations: () => Promise<void>;
  refreshGroups: () => Promise<void>;
  addContact: (targetUserId: string, nickname?: string) => Promise<void>;
  removeContact: (targetUserId: string) => Promise<void>;
  blockUser: (targetUserId: string) => Promise<void>;
  updateParticipantStatus: (userId: string, isOnline: boolean, lastSeen?: string | null) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { socket } = useSocket();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [activeGroup, setActiveGroup] = useState<Group | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [typingUser, setTypingUser] = useState<{ displayName: string } | null>(null);
  const [isLoadingConversations, setIsLoadingConversations] = useState<boolean>(true);
  const [isLoadingGroups, setIsLoadingGroups] = useState<boolean>(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState<boolean>(false);

  // Message search state
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchResults, setSearchResults] = useState<Message[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchTypeFilter, setSearchTypeFilter] = useState<string>('all');

  const activeConvRef = useRef<Conversation | null>(null);
  activeConvRef.current = activeConversation;

  const activeGroupRef = useRef<Group | null>(null);
  activeGroupRef.current = activeGroup;

  const conversationsRef = useRef<Conversation[]>([]);
  conversationsRef.current = conversations;

  const groupsRef = useRef<Group[]>([]);
  groupsRef.current = groups;

  const typingTimeoutRef = useRef<number | null>(null);

  const [inAppNotification, setInAppNotification] = useState<InAppNotification | null>(null);
  const inAppNotificationTimeoutRef = useRef<number | null>(null);

  const dismissInAppNotification = () => {
    if (inAppNotificationTimeoutRef.current) {
      clearTimeout(inAppNotificationTimeoutRef.current);
      inAppNotificationTimeoutRef.current = null;
    }
    setInAppNotification(null);
  };

  // Initialize service worker & request device notification permissions on mount
  useEffect(() => {
    initNotifications().catch((e) => console.warn('Notification init error:', e));
  }, []);

  // Multi-tier notification trigger: Phone Status Bar, Service Worker, Vibration, & In-App Heads Up
  const showNotification = (
    title: string,
    body: string,
    icon?: string,
    onOpen?: () => void,
    data?: any
  ) => {
    // 1. Phone system notification & vibration (Android status bar, Expo, PWA, Desktop)
    triggerDeviceNotification({
      title,
      body,
      icon: icon || '/logo.jpg',
      data,
    });

    // 2. In-App Heads Up Banner (Toast) if user has app open on screen
    if (onOpen) {
      if (inAppNotificationTimeoutRef.current) {
        clearTimeout(inAppNotificationTimeoutRef.current);
      }
      setInAppNotification({
        id: 'notif_' + Date.now(),
        title,
        body,
        avatar: icon,
        onOpen,
      });
      inAppNotificationTimeoutRef.current = window.setTimeout(() => {
        setInAppNotification(null);
      }, 4500);
    }
  };

  const refreshConversations = async () => {
    try {
      const res = await getConversationsApi();
      if (res.success) {
        setConversations(res.conversations);
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      setIsLoadingConversations(false);
    }
  };

  const refreshGroups = async () => {
    try {
      const res = await getUserGroupsApi();
      if (res.success) {
        setGroups(res.groups);
      }
    } catch (err) {
      console.error('Failed to load groups:', err);
    } finally {
      setIsLoadingGroups(false);
    }
  };

  const refreshContacts = async () => {
    try {
      const res = await getContactsApi();
      if (res.success) {
        setContacts(res.contacts);
      }
    } catch (err) {
      console.error('Failed to load contacts:', err);
    }
  };

  useEffect(() => {
    if (user) {
      refreshConversations();
      refreshGroups();
      refreshContacts();
    } else {
      setConversations([]);
      setActiveConversation(null);
      setGroups([]);
      setActiveGroup(null);
      setMessages([]);
      setContacts([]);
    }
  }, [user]);

  // Select 1-to-1 conversation
  const selectConversation = async (conv: Conversation) => {
    if (socket) {
      if (activeConversation) socket.emit('leave_conversation', activeConversation._id);
      if (activeGroup) socket.emit('leave_group', activeGroup._id);
    }

    setActiveGroup(null);
    setActiveConversation(conv);
    setIsLoadingMessages(true);
    setTypingUser(null);
    setIsSearching(false);
    setSearchResults([]);

    if (socket) {
      socket.emit('join_conversation', conv._id);
    }

    try {
      const res = await getMessagesApi(conv._id);
      if (res.success) {
        setMessages(res.messages);
      }

      if (conv.unreadCount > 0) {
        await markAsReadApi(conv._id);
        if (socket) {
          socket.emit('mark_read', {
            conversationId: conv._id,
            targetUserId: conv.participant._id,
          });
        }
        setConversations((prev) =>
          prev.map((c) => (c._id === conv._id ? { ...c, unreadCount: 0 } : c))
        );
      }
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  // Select group
  const selectGroup = async (group: Group) => {
    if (socket) {
      if (activeConversation) socket.emit('leave_conversation', activeConversation._id);
      if (activeGroup) socket.emit('leave_group', activeGroup._id);
    }

    setActiveConversation(null);
    setActiveGroup(group);
    setIsLoadingMessages(true);
    setTypingUser(null);
    setIsSearching(false);
    setSearchResults([]);

    if (socket) {
      socket.emit('join_group', group._id);
    }

    try {
      const res = await getGroupMessagesApi(group._id);
      if (res.success) {
        setMessages(res.messages);
      }
      setGroups((prev) =>
        prev.map((g) => (g._id === group._id ? { ...g, unreadCount: 0 } : g))
      );
    } catch (err) {
      console.error('Failed to load group messages:', err);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const startConversationWithUser = async (params: {
    targetUserId?: string;
    targetChatId?: string;
  }): Promise<Conversation> => {
    const res = await getOrCreateConversationApi(params);
    if (!res.success || !res.conversation) {
      throw new Error('Failed to start conversation.');
    }

    const conv = res.conversation;
    setConversations((prev) => {
      const exists = prev.find((c) => c._id === conv._id);
      if (!exists) {
        return [conv, ...prev];
      }
      return prev;
    });

    await selectConversation(conv);
    return conv;
  };

  const createGroup = async (payload: {
    name: string;
    description?: string;
    avatar?: string;
    memberChatIds?: string[];
  }): Promise<Group> => {
    const res = await createGroupApi(payload);
    if (!res.success || !res.group) {
      throw new Error('Failed to create group.');
    }
    const newGroup = res.group;
    setGroups((prev) => [newGroup, ...prev]);
    await selectGroup(newGroup);
    return newGroup;
  };

  const sendMessage = async (
    content: string,
    messageType: 'text' | 'image' | 'video' | 'audio' | 'document' | 'call_log' = 'text',
    media: MediaAttachment | null = null,
    replyTo: ReplyPreview | null = null,
    isViewOnce: boolean = false
  ) => {
    if (!user) return;

    sounds.playMessageSent();

    if (activeGroup) {
      // Group message
      if (socket) {
        socket.emit(
          'send_group_message',
          {
            groupId: activeGroup._id,
            content,
            messageType,
            media,
            replyTo,
            isViewOnce,
          },
          (res: { success: boolean; message?: Message; error?: string }) => {
            if (!res.success) {
              console.error('Group socket send error:', res.error);
            }
          }
        );
      } else {
        await sendGroupMessageApi(activeGroup._id, {
          content,
          messageType,
          media,
          replyTo,
          isViewOnce,
        });
      }
    } else if (activeConversation) {
      // 1-to-1 message
      if (socket) {
        socket.emit(
          'send_message',
          {
            conversationId: activeConversation._id,
            content,
            messageType,
            media,
            replyTo,
            isViewOnce,
          },
          (response: { success: boolean; message?: Message; error?: string }) => {
            if (!response.success) {
              console.error('Socket message error:', response.error);
            }
          }
        );
      } else {
        await sendMessageApi({
          conversationId: activeConversation._id,
          content,
          messageType,
          media,
          replyTo,
          isViewOnce,
        });
      }
    }
  };

  const openViewOnceMedia = async (messageId: string): Promise<MediaAttachment | null> => {
    try {
      const res = await openViewOnceApi(messageId);
      if (res.success && res.media) {
        // Update local message viewed state
        setMessages((prev) =>
          prev.map((m) => {
            if (m._id === messageId) {
              const currentViews = m.viewedBy || [];
              return {
                ...m,
                viewedBy: [...currentViews, { user: user?._id || '', viewedAt: res.viewedAt }],
              };
            }
            return m;
          })
        );
        return res.media;
      }
      return null;
    } catch (err: any) {
      alert(err.message || 'Media has already been viewed once.');
      return null;
    }
  };

  const searchMessages = async (q: string, type: string = 'all') => {
    setSearchQuery(q);
    setSearchTypeFilter(type);
    setIsSearching(true);

    try {
      const res = await searchMessagesApi({
        q,
        type,
        conversationId: activeConversation?._id,
        groupId: activeGroup?._id,
      });

      if (res.success) {
        setSearchResults(res.messages);
      }
    } catch (err) {
      console.error('Search error:', err);
    }
  };

  const clearSearch = () => {
    setIsSearching(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const sendReaction = async (messageId: string, emoji: string) => {
    const convId = activeConversation?._id;
    if (socket && convId) {
      socket.emit('send_reaction', {
        messageId,
        conversationId: convId,
        emoji,
      });
    } else {
      await addReactionApi(messageId, emoji);
    }
  };

  const deleteMessage = async (
    messageId: string,
    deleteType: 'for_me' | 'for_everyone'
  ) => {
    const convId = activeConversation?._id;
    if (deleteType === 'for_everyone' && socket && convId) {
      socket.emit('delete_message', {
        messageId,
        conversationId: convId,
        deleteType,
      });
    } else {
      await deleteMessageApi(messageId, deleteType);
      setMessages((prev) => prev.filter((m) => m._id !== messageId));
    }
  };

  const clearCurrentConversation = async () => {
    if (!activeConversation) return;
    await clearConversationApi(activeConversation._id);
    setMessages([]);
  };

  const deleteConversation = async (conversationId: string) => {
    try {
      await deleteConversationApi(conversationId);
      setConversations((prev) => prev.filter((c) => c._id !== conversationId));
      if (activeConversation && activeConversation._id === conversationId) {
        setActiveConversation(null);
        setMessages([]);
      }
    } catch (err: any) {
      console.error('Failed to delete conversation:', err);
      throw err;
    }
  };

  const emitTyping = (isCurrentlyTyping: boolean) => {
    if (!socket || !activeConversation) return;

    if (isCurrentlyTyping) {
      socket.emit('typing_start', {
        conversationId: activeConversation._id,
        targetUserId: activeConversation.participant._id,
      });

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = window.setTimeout(() => {
        socket.emit('typing_stop', {
          conversationId: activeConversation._id,
          targetUserId: activeConversation.participant._id,
        });
      }, 2500);
    } else {
      socket.emit('typing_stop', {
        conversationId: activeConversation._id,
        targetUserId: activeConversation.participant._id,
      });
    }
  };

  const addContact = async (targetUserId: string, nickname?: string) => {
    const res = await addContactApi(targetUserId, nickname);
    if (res.success) {
      await refreshContacts();
    }
  };

  const removeContact = async (targetUserId: string) => {
    const res = await removeContactApi(targetUserId);
    if (res.success) {
      await refreshContacts();
    }
  };

  const blockUser = async (targetUserId: string) => {
    const res = await blockUserApi(targetUserId);
    if (res.success) {
      await refreshContacts();
      await refreshConversations();
    }
  };

  const updateParticipantStatus = (userId: string, isOnline: boolean, lastSeen?: string | null) => {
    setConversations((prev) =>
      prev.map((c) => {
        if (c.participant._id === userId) {
          return {
            ...c,
            participant: {
              ...c.participant,
              isOnline,
              lastSeen: lastSeen !== undefined ? lastSeen : c.participant.lastSeen,
            },
          };
        }
        return c;
      })
    );

    if (activeConversation && activeConversation.participant._id === userId) {
      setActiveConversation((prev) =>
        prev
          ? {
              ...prev,
              participant: {
                ...prev.participant,
                isOnline,
                lastSeen: lastSeen !== undefined ? lastSeen : prev.participant.lastSeen,
              },
            }
          : null
      );
    }
  };

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    // Incoming 1-to-1 message
    const handleNewMessage = ({
      message,
      conversationId,
    }: {
      message: Message;
      conversationId: string;
    }) => {
      const isCurrentConv = activeConvRef.current?._id === conversationId;

      if (isCurrentConv) {
        setMessages((prev) => {
          if (prev.some((m) => m._id === message._id)) return prev;
          return [...prev, message];
        });

        if (message.sender._id !== user?._id) {
          sounds.playMessageReceived();
          if (document.hidden) {
            showNotification(
              message.sender.displayName,
              message.isViewOnce ? 'Sent a view-once photo' : message.content || 'Sent an attachment',
              message.sender.avatar
            );
          }
          socket.emit('mark_read', {
            conversationId,
            targetUserId: message.sender._id,
          });
        }
      } else {
        if (message.sender._id !== user?._id) {
          sounds.playMessageReceived();
          showNotification(
            message.sender.displayName,
            message.isViewOnce ? 'Sent a view-once photo' : message.content || 'Sent an attachment',
            message.sender.avatar,
            () => {
              const target = conversationsRef.current.find((c) => c._id === conversationId);
              if (target) selectConversation(target);
            },
            { conversationId }
          );
        }
      }

      setConversations((prev) => {
        const index = prev.findIndex((c) => c._id === conversationId);
        if (index > -1) {
          const updated = [...prev];
          const conv = updated[index];
          const isSenderMe = message.sender._id === user?._id;
          const newUnread = isCurrentConv || isSenderMe ? 0 : conv.unreadCount + 1;

          updated[index] = {
            ...conv,
            lastMessage: message,
            lastMessageAt: message.createdAt,
            unreadCount: newUnread,
          };

          const [moved] = updated.splice(index, 1);
          return [moved, ...updated];
        }
        return prev;
      });
    };

    // Incoming Group message
    const handleNewGroupMessage = ({
      message,
      groupId,
    }: {
      message: Message;
      groupId: string;
    }) => {
      const isCurrentGroup = activeGroupRef.current?._id === groupId;

      if (isCurrentGroup) {
        setMessages((prev) => {
          if (prev.some((m) => m._id === message._id)) return prev;
          return [...prev, message];
        });

        if (message.sender._id !== user?._id) {
          sounds.playMessageReceived();
          if (document.hidden) {
            showNotification(
              `Group: ${activeGroupRef.current?.name || 'Group Chat'}`,
              `${message.sender.displayName}: ${message.content || 'Sent a file'}`,
              message.sender.avatar
            );
          }
        }
      } else {
        if (message.sender._id !== user?._id) {
          sounds.playMessageReceived();
          showNotification(
            `Group: ${groupsRef.current.find((g) => g._id === groupId)?.name || 'Group Chat'}`,
            `${message.sender.displayName}: ${message.content || 'Sent a file'}`,
            message.sender.avatar,
            () => {
              const target = groupsRef.current.find((g) => g._id === groupId);
              if (target) selectGroup(target);
            },
            { groupId }
          );
        }
      }

      setGroups((prev) => {
        const index = prev.findIndex((g) => g._id === groupId);
        if (index > -1) {
          const updated = [...prev];
          const g = updated[index];
          const isSenderMe = message.sender._id === user?._id;
          const newUnread = isCurrentGroup || isSenderMe ? 0 : g.unreadCount + 1;

          updated[index] = {
            ...g,
            lastMessage: message,
            lastMessageAt: message.createdAt,
            unreadCount: newUnread,
          };

          const [moved] = updated.splice(index, 1);
          return [moved, ...updated];
        }
        return prev;
      });
    };

    // Group updated event for background notification badge
    const handleGroupUpdated = ({
      groupId,
      lastMessage,
      lastMessageAt,
    }: {
      groupId: string;
      lastMessage: Message;
      lastMessageAt: string;
    }) => {
      setGroups((prev) => {
        const index = prev.findIndex((g) => g._id === groupId);
        if (index > -1) {
          const updated = [...prev];
          const isCurrentGroup = activeGroupRef.current?._id === groupId;
          updated[index] = {
            ...updated[index],
            lastMessage,
            lastMessageAt,
            unreadCount: isCurrentGroup ? 0 : updated[index].unreadCount + 1,
          };
          const [moved] = updated.splice(index, 1);
          return [moved, ...updated];
        }
        return prev;
      });
    };

    // View-once media opened event
    const handleViewOnceOpened = ({
      messageId,
      openedBy,
      viewedAt,
    }: {
      messageId: string;
      openedBy: string;
      viewedAt: string;
    }) => {
      setMessages((prev) =>
        prev.map((m) => {
          if (m._id === messageId) {
            const currentViews = m.viewedBy || [];
            return {
              ...m,
              viewedBy: [...currentViews, { user: openedBy, viewedAt }],
            };
          }
          return m;
        })
      );
    };

    // Typing indicators
    const handleUserTyping = ({
      conversationId,
      displayName,
    }: {
      conversationId: string;
      displayName: string;
    }) => {
      if (activeConvRef.current?._id === conversationId) {
        setTypingUser({ displayName });
      }
    };

    const handleUserStopTyping = ({ conversationId }: { conversationId: string }) => {
      if (activeConvRef.current?._id === conversationId) {
        setTypingUser(null);
      }
    };

    // Read receipts
    const handleMessagesMarkedRead = ({ conversationId }: { conversationId: string }) => {
      if (activeConvRef.current?._id === conversationId) {
        setMessages((prev) =>
          prev.map((m) => (m.status !== 'read' ? { ...m, status: 'read' } : m))
        );
      }
    };

    // Reaction update
    const handleReactionUpdated = ({
      messageId,
      reactions,
    }: {
      messageId: string;
      reactions: any[];
    }) => {
      setMessages((prev) =>
        prev.map((m) => (m._id === messageId ? { ...m, reactions } : m))
      );
    };

    // Delete message for everyone
    const handleMessageDeletedForEveryone = ({ messageId }: { messageId: string }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m._id === messageId
            ? {
                ...m,
                isDeletedForEveryone: true,
                content: 'This message was deleted',
                media: null,
                replyTo: null,
              }
            : m
        )
      );
    };

    // User online status update
    const handleUserStatusChanged = ({
      userId,
      isOnline,
      lastSeen,
    }: {
      userId: string;
      chatId: string;
      isOnline: boolean;
      lastSeen: string;
    }) => {
      updateParticipantStatus(userId, isOnline, lastSeen);
    };

    socket.on('new_message', handleNewMessage);
    socket.on('new_group_message', handleNewGroupMessage);
    socket.on('group_updated', handleGroupUpdated);
    socket.on('view_once_opened', handleViewOnceOpened);
    socket.on('user_typing', handleUserTyping);
    socket.on('user_stop_typing', handleUserStopTyping);
    socket.on('messages_marked_read', handleMessagesMarkedRead);
    socket.on('reaction_updated', handleReactionUpdated);
    socket.on('message_deleted_for_everyone', handleMessageDeletedForEveryone);
    socket.on('user_status_changed', handleUserStatusChanged);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('new_group_message', handleNewGroupMessage);
      socket.off('group_updated', handleGroupUpdated);
      socket.off('view_once_opened', handleViewOnceOpened);
      socket.off('user_typing', handleUserTyping);
      socket.off('user_stop_typing', handleUserStopTyping);
      socket.off('messages_marked_read', handleMessagesMarkedRead);
      socket.off('reaction_updated', handleReactionUpdated);
      socket.off('message_deleted_for_everyone', handleMessageDeletedForEveryone);
      socket.off('user_status_changed', handleUserStatusChanged);
    };
  }, [socket, user]);

  return (
    <ChatContext.Provider
      value={{
        inAppNotification,
        dismissInAppNotification,
        conversations,
        activeConversation,
        groups,
        activeGroup,
        messages,
        contacts,
        isTyping: Boolean(typingUser),
        typingUser,
        isLoadingConversations,
        isLoadingGroups,
        isLoadingMessages,
        isSearching,
        searchResults,
        searchQuery,
        searchTypeFilter,
        selectConversation,
        selectGroup,
        startConversationWithUser,
        createGroup,
        sendMessage,
        sendReaction,
        deleteMessage,
        clearCurrentConversation,
        deleteConversation,
        openViewOnceMedia,
        searchMessages,
        clearSearch,
        emitTyping,
        refreshContacts,
        refreshConversations,
        refreshGroups,
        addContact,
        removeContact,
        blockUser,
        updateParticipantStatus,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) throw new Error('useChat must be used within a ChatProvider');
  return context;
};
