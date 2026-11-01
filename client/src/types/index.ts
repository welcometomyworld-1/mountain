export interface User {
  _id: string;
  chatId: string;
  displayName: string;
  avatar?: string;
  bio?: string;
  isOnline?: boolean;
  lastSeen?: string | null;
  privacySettings?: {
    profileVisibility?: 'everyone' | 'contacts' | 'nobody';
    onlineStatus?: 'everyone' | 'contacts' | 'nobody';
    lastSeen?: 'everyone' | 'contacts' | 'nobody';
    readReceipts?: boolean;
  };
  blockedUsers?: string[] | User[];
  isContact?: boolean;
  isBlocked?: boolean;
  role?: 'user' | 'admin';
  isBanned?: boolean;
  bannedReason?: string;
  createdAt?: string;
}

export interface Contact {
  user: User;
  nickname: string;
  addedAt: string;
}

export interface MediaAttachment {
  url: string;
  thumbnailUrl?: string;
  publicId?: string;
  fileSize: number;
  mimeType: string;
  fileName: string;
  duration?: number;
}

export interface ReplyPreview {
  messageId: string;
  senderName: string;
  snippet: string;
  messageType: 'text' | 'image' | 'video' | 'audio' | 'document' | 'call_log';
}

export interface Reaction {
  user: {
    _id: string;
    chatId: string;
    displayName: string;
    avatar?: string;
  } | string;
  emoji: string;
  createdAt: string;
}

export interface Message {
  _id: string;
  conversation?: string;
  group?: string;
  isGroup?: boolean;
  sender: User;
  recipient?: User | string;
  messageType: 'text' | 'image' | 'video' | 'audio' | 'document' | 'call_log';
  content: string;
  media?: MediaAttachment | null;
  isViewOnce?: boolean;
  viewedBy?: { user: string | User; viewedAt: string }[];
  status: 'sent' | 'delivered' | 'read';
  deliveredAt?: string;
  readAt?: string;
  replyTo?: ReplyPreview | null;
  reactions: Reaction[];
  isDeletedForEveryone?: boolean;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Conversation {
  _id: string;
  participant: User;
  lastMessage?: Message | null;
  lastMessageAt: string;
  unreadCount: number;
}

export interface Group {
  _id: string;
  name: string;
  description?: string;
  avatar?: string;
  creator: User;
  admins: User[];
  members: User[];
  membersCount?: number;
  lastMessage?: Message | null;
  lastMessageAt?: string;
  unreadCount: number;
  isGroup: true;
}

export interface CallLog {
  _id: string;
  peer: User;
  isOutgoing: boolean;
  callType: 'audio' | 'video';
  status: 'completed' | 'missed' | 'declined' | 'busy' | 'failed';
  duration: number;
  createdAt: string;
}

export interface CallState {
  active: boolean;
  callId: string | null;
  peer: User | null;
  callType: 'video' | 'audio';
  isIncoming: boolean;
  isOutgoing: boolean;
  isConnected: boolean;
  isMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing: boolean;
  peerMuted?: boolean;
  peerVideoOff?: boolean;
  durationSeconds: number;
  statusText: string;
}

export interface AdminStats {
  totalUsers: number;
  onlineUsersCount: number;
  bannedUsersCount: number;
  totalMessages: number;
  totalGroups: number;
  totalCalls: number;
  videoCallsCount: number;
  audioCallsCount: number;
}

export interface AdminCallItem {
  _id: string;
  caller: User;
  recipient: User;
  callType: 'audio' | 'video';
  status: 'completed' | 'missed' | 'declined' | 'busy' | 'failed';
  duration: number;
  createdAt: string;
}

export interface AdminGroupItem {
  _id: string;
  name: string;
  description?: string;
  creator: User;
  members: User[];
  createdAt: string;
}

export interface SystemAnnouncement {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'urgent' | 'success';
  sender: string;
  timestamp: string;
}

