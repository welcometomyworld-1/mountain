import React, { useState } from 'react';
import {
  MessageSquare,
  Users,
  Settings,
  UserPlus,
  Search,
  Copy,
  Check,
  Image as ImageIcon,
  PhoneCall,
  Video,
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  FileText,
  Mic,
  Plus,
  Trash2,
  BookUser,
  Shield,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { useCall } from '../../context/CallContext';
import { Avatar } from '../common/Avatar';
import { StatusTick } from '../common/StatusTick';
import { SettingsModal } from '../common/SettingsModal';
import { AddContactModal } from './AddContactModal';
import { CreateGroupModal } from './CreateGroupModal';
import { AdminDashboardModal } from '../admin/AdminDashboardModal';

interface SidebarProps {
  onSelectMobileChat?: () => void;
}

type SidebarTab = 'chats' | 'groups' | 'contacts' | 'calls';

export const Sidebar: React.FC<SidebarProps> = ({ onSelectMobileChat }) => {
  const { user } = useAuth();
  const {
    conversations,
    activeConversation,
    selectConversation,
    deleteConversation,
    groups,
    activeGroup,
    selectGroup,
    contacts,
    startConversationWithUser,
    isLoadingConversations,
    isLoadingGroups,
  } = useChat();

  const {
    callLogs,
    isLoadingCallLogs,
    clearCallHistory,
    startCall,
  } = useCall();

  const [activeTab, setActiveTab] = useState<SidebarTab>('chats');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAddContactOpen, setIsAddContactOpen] = useState(false);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  if (!user) return null;

  const isAdmin = user.role === 'admin' || user.chatId === 'CHAT100000';

  const handleCopyChatId = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(user.chatId);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Format relative timestamp
  const formatTime = (dateStr?: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds || seconds <= 0) return '0s';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (m === 0) return `${s}s`;
    return `${m}m ${s}s`;
  };

  // Filter 1-on-1 conversations
  const filteredConversations = conversations.filter((c) => {
    const q = searchQuery.toLowerCase();
    const name = c.participant?.displayName?.toLowerCase() || '';
    const id = c.participant?.chatId?.toLowerCase() || '';
    return name.includes(q) || id.includes(q);
  });

  // Filter Groups
  const filteredGroups = groups.filter((g) => {
    const q = searchQuery.toLowerCase();
    const name = g.name.toLowerCase();
    const desc = g.description?.toLowerCase() || '';
    return name.includes(q) || desc.includes(q);
  });

  // Filter contacts
  const filteredContacts = contacts.filter((c) => {
    const q = searchQuery.toLowerCase();
    const name = c.user?.displayName?.toLowerCase() || '';
    const nick = c.nickname?.toLowerCase() || '';
    const id = c.user?.chatId?.toLowerCase() || '';
    return name.includes(q) || nick.includes(q) || id.includes(q);
  });

  // Filter call logs
  const filteredCallLogs = callLogs.filter((c) => {
    const q = searchQuery.toLowerCase();
    const name = c.peer?.displayName?.toLowerCase() || '';
    const id = c.peer?.chatId?.toLowerCase() || '';
    return name.includes(q) || id.includes(q);
  });

  const totalChatUnread = conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0);
  const totalGroupUnread = groups.reduce((acc, g) => acc + (g.unreadCount || 0), 0);

  const renderMessageSnippet = (lastMsg: any, isMyMessage: boolean) => {
    if (!lastMsg) return <span>No messages yet</span>;

    if (lastMsg.isDeletedForEveryone) {
      return <span className="italic opacity-70">This message was deleted</span>;
    }

    if (lastMsg.messageType === 'image') {
      return (
        <span className="flex items-center space-x-1 text-brand-600 dark:text-brand-400">
          <ImageIcon className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{lastMsg.isViewOnce ? 'View once photo' : 'Photo'}</span>
        </span>
      );
    }

    if (lastMsg.messageType === 'video') {
      return (
        <span className="flex items-center space-x-1 text-indigo-600 dark:text-indigo-400">
          <Video className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{lastMsg.isViewOnce ? 'View once video' : 'Video'}</span>
        </span>
      );
    }

    if (lastMsg.messageType === 'audio') {
      return (
        <span className="flex items-center space-x-1 text-emerald-600 dark:text-emerald-400">
          <Mic className="w-3.5 h-3.5 flex-shrink-0" />
          <span>Voice note ({formatDuration(lastMsg.duration || lastMsg.media?.duration)})</span>
        </span>
      );
    }

    if (lastMsg.messageType === 'document') {
      return (
        <span className="flex items-center space-x-1 text-amber-600 dark:text-amber-400">
          <FileText className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{lastMsg.media?.fileName || 'Document'}</span>
        </span>
      );
    }

    if (lastMsg.messageType === 'call_log') {
      return (
        <span className="flex items-center space-x-1 text-slate-500">
          <PhoneCall className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{lastMsg.content || 'Call'}</span>
        </span>
      );
    }

    return <span className="truncate">{lastMsg.content}</span>;
  };

  return (
    <aside className="w-full md:w-80 lg:w-96 flex flex-col h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 select-none">
      {/* Prominent Chat ID Banner visible immediately after login */}
      <div className="px-3 sm:px-4 py-2 bg-gradient-to-r from-brand-600 to-indigo-600 text-white flex items-center justify-between text-xs shadow-md z-10 flex-shrink-0">
        <div className="flex items-center space-x-1.5 truncate min-w-0">
          <span className="opacity-90 font-medium text-[11px] sm:text-xs">Chat ID:</span>
          <span className="font-mono font-bold tracking-wider px-1.5 sm:px-2 py-0.5 rounded bg-black/25 ring-1 ring-white/20 select-all text-[11px] sm:text-xs truncate">
            {user.chatId}
          </span>
        </div>
        <button
          type="button"
          onClick={handleCopyChatId}
          title="Click to copy your Chat ID"
          className="ml-2 px-2.5 py-1 rounded bg-white/20 hover:bg-white/30 text-white text-[11px] font-semibold transition flex items-center space-x-1 flex-shrink-0 min-h-[28px]"
        >
          {isCopied ? (
            <>
              <Check className="w-3 h-3 text-emerald-300" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>Copy ID</span>
            </>
          )}
        </button>
      </div>

      {/* User profile header card */}
      <div className="p-3 sm:p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 backdrop-blur-md flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0 flex-1 mr-2">
            <div className="flex-shrink-0">
              <Avatar
                name={user.displayName}
                src={user.avatar}
                size="md"
                isOnline={true}
                showOnlineBadge={true}
              />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                {user.displayName}
              </h2>
              {/* Chat ID pill with 1-click copy */}
              <button
                type="button"
                onClick={handleCopyChatId}
                title="Click to copy your unique Chat ID"
                className="mt-0.5 inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-mono font-medium bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/60 dark:hover:bg-brand-900/60 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-800 transition truncate max-w-full"
              >
                <span className="truncate">{user.chatId}</span>
                {isCopied ? (
                  <Check className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                ) : (
                  <Copy className="w-3 h-3 opacity-60 flex-shrink-0" />
                )}
              </button>
            </div>
          </div>

          {/* Action icons */}
          <div className="flex items-center space-x-1 flex-shrink-0">
            {isAdmin && (
              <button
                type="button"
                onClick={() => setIsAdminOpen(true)}
                title="Admin Control Center"
                className="p-2 text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 transition min-w-[36px] min-h-[36px] flex items-center justify-center relative shadow-sm"
                aria-label="Open Admin Control Center"
              >
                <Shield className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900 animate-pulse" />
              </button>
            )}
            <button
              onClick={() => setIsAddContactOpen(true)}
              title="Add Contact / Start Chat with Chat ID"
              className="p-2 text-slate-500 hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-400 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition min-w-[36px] min-h-[36px] flex items-center justify-center"
            >
              <UserPlus className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsSettingsOpen(true)}
              title="Settings & Privacy"
              className="p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition min-w-[36px] min-h-[36px] flex items-center justify-center"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Admin Console Callout Banner */}
        {isAdmin && (
          <div className="mt-2.5 p-2 rounded-xl bg-gradient-to-r from-indigo-950/70 via-purple-950/50 to-slate-900 border border-indigo-500/40 flex items-center justify-between text-xs animate-fade-in">
            <div className="flex items-center space-x-2 min-w-0">
              <span className="flex h-2 w-2 relative flex-shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
              </span>
              <span className="text-[11px] font-bold text-indigo-300 truncate">
                Admin Console
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsAdminOpen(true)}
              className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition flex-shrink-0"
            >
              Open Panel
            </button>
          </div>
        )}

        {/* Search Bar */}
        <div className="mt-3 relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder={`Search ${activeTab}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 text-sm sm:text-xs rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition"
          />
        </div>

        {/* Navigation Tabs - 4 Distinct Channels with 44px min touch target */}
        <div className="grid grid-cols-4 gap-1 mt-3 rounded-xl bg-slate-200/70 dark:bg-slate-800 p-1">
          {/* Tab 1: Chats */}
          <button
            type="button"
            onClick={() => setActiveTab('chats')}
            className={`flex items-center justify-center space-x-1 py-2 sm:py-1.5 min-h-[38px] text-xs font-semibold rounded-lg transition relative ${
              activeTab === 'chats'
                ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-300 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="hidden sm:inline">Chats</span>
            {totalChatUnread > 0 && (
              <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-brand-600 text-white flex-shrink-0">
                {totalChatUnread}
              </span>
            )}
          </button>

          {/* Tab 2: Groups */}
          <button
            type="button"
            onClick={() => setActiveTab('groups')}
            className={`flex items-center justify-center space-x-1 py-2 sm:py-1.5 min-h-[38px] text-xs font-semibold rounded-lg transition relative ${
              activeTab === 'groups'
                ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-300 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="hidden sm:inline">Groups</span>
            {totalGroupUnread > 0 && (
              <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-indigo-600 text-white flex-shrink-0">
                {totalGroupUnread}
              </span>
            )}
          </button>

          {/* Tab 3: Contacts */}
          <button
            type="button"
            onClick={() => setActiveTab('contacts')}
            className={`flex items-center justify-center space-x-1 py-2 sm:py-1.5 min-h-[38px] text-xs font-semibold rounded-lg transition ${
              activeTab === 'contacts'
                ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-300 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <BookUser className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="hidden sm:inline">Contacts</span>
          </button>

          {/* Tab 4: Calls */}
          <button
            type="button"
            onClick={() => setActiveTab('calls')}
            className={`flex items-center justify-center space-x-1 py-2 sm:py-1.5 min-h-[38px] text-xs font-semibold rounded-lg transition ${
              activeTab === 'calls'
                ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-300 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <Phone className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="hidden sm:inline">Calls</span>
          </button>
        </div>
      </div>

      {/* Main Channel Content */}
      <div className="flex-1 overflow-y-auto">
        {/* 1. CHATS TAB */}
        {activeTab === 'chats' && (
          isLoadingConversations ? (
            <div className="p-8 text-center text-xs text-slate-400">Loading chats...</div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 flex items-center justify-center mx-auto">
                <MessageSquare className="w-6 h-6" />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">No private conversations yet.</p>
              <button
                type="button"
                onClick={() => setIsAddContactOpen(true)}
                className="px-3 py-1.5 text-xs font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-sm transition"
              >
                Start Chat by Chat ID
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredConversations.map((conv) => {
                const isActive = !activeGroup && activeConversation?._id === conv._id;
                const lastMsgSenderId = (conv.lastMessage?.sender as any)?._id || (conv.lastMessage?.sender as any);
                const isMyLastMessage = lastMsgSenderId === user._id;

                return (
                  <div
                    key={conv._id}
                    onClick={() => {
                      selectConversation(conv);
                      if (onSelectMobileChat) onSelectMobileChat();
                    }}
                    className={`group flex items-center px-4 py-3 cursor-pointer transition ${
                      isActive
                        ? 'bg-brand-50 dark:bg-brand-950/40 border-l-4 border-brand-600'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <Avatar
                      name={conv.participant?.displayName || 'Unknown'}
                      src={conv.participant?.avatar}
                      size="md"
                      isOnline={conv.participant?.isOnline}
                      showOnlineBadge={true}
                    />

                    <div className="flex-1 min-w-0 ml-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                          {conv.participant?.displayName || 'User'}
                        </h4>
                        <div className="flex items-center space-x-1 flex-shrink-0 ml-2">
                          <span className="text-[11px] text-slate-400">
                            {formatTime(conv.lastMessageAt)}
                          </span>
                          <button
                            type="button"
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (
                                confirm(
                                  `Delete chat with ${conv.participant?.displayName || 'this user'}? All messages will be deleted and the chat removed.`
                                )
                              ) {
                                await deleteConversation(conv._id);
                              }
                            }}
                            title="Delete Chat"
                            className="opacity-0 group-hover:opacity-100 max-md:opacity-70 p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-1">
                        <div className="flex items-center space-x-1 text-xs text-slate-500 dark:text-slate-400 truncate">
                          {isMyLastMessage && conv.lastMessage && (
                            <StatusTick status={conv.lastMessage.status} />
                          )}
                          {renderMessageSnippet(conv.lastMessage, isMyLastMessage)}
                        </div>

                        {conv.unreadCount > 0 && (
                          <span className="ml-2 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-brand-600 text-white flex-shrink-0 animate-scale">
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}

        {/* 2. GROUPS TAB */}
        {activeTab === 'groups' && (
          <div className="flex flex-col h-full">
            {/* Action Bar */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                Private Groups ({groups.length})
              </span>
              <button
                type="button"
                onClick={() => setIsCreateGroupOpen(true)}
                className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Group</span>
              </button>
            </div>

            {isLoadingGroups ? (
              <div className="p-8 text-center text-xs text-slate-400">Loading groups...</div>
            ) : filteredGroups.length === 0 ? (
              <div className="p-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
                  <Users className="w-6 h-6" />
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">You are not in any groups yet.</p>
                <button
                  type="button"
                  onClick={() => setIsCreateGroupOpen(true)}
                  className="px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition"
                >
                  Create Private Group
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredGroups.map((g) => {
                  const isActive = activeGroup?._id === g._id;
                  const lastSenderName = (g.lastMessage?.sender as any)?.displayName || '';

                  return (
                    <div
                      key={g._id}
                      onClick={() => {
                        selectGroup(g);
                        if (onSelectMobileChat) onSelectMobileChat();
                      }}
                      className={`flex items-center px-4 py-3 cursor-pointer transition ${
                        isActive
                          ? 'bg-indigo-50 dark:bg-indigo-950/40 border-l-4 border-indigo-600'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <Avatar
                        name={g.name}
                        src={g.avatar}
                        size="md"
                      />

                      <div className="flex-1 min-w-0 ml-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                            {g.name}
                          </h4>
                          <span className="text-[11px] text-slate-400 flex-shrink-0 ml-2">
                            {formatTime(g.lastMessageAt)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between mt-1">
                          <div className="flex items-center space-x-1 text-xs text-slate-500 dark:text-slate-400 truncate">
                            {lastSenderName && (
                              <span className="font-medium text-slate-700 dark:text-slate-300">
                                {lastSenderName}:{' '}
                              </span>
                            )}
                            {renderMessageSnippet(g.lastMessage, false)}
                          </div>

                          {g.unreadCount > 0 && (
                            <span className="ml-2 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-600 text-white flex-shrink-0">
                              {g.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 3. CONTACTS TAB */}
        {activeTab === 'contacts' && (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
            <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                Saved Contacts ({contacts.length})
              </span>
              <button
                type="button"
                onClick={() => setIsAddContactOpen(true)}
                className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-brand-600 hover:bg-brand-700 text-white shadow-sm transition"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Add Contact</span>
              </button>
            </div>

            {filteredContacts.length === 0 ? (
              <div className="p-8 text-center space-y-3">
                <p className="text-xs text-slate-500 dark:text-slate-400">No saved contacts found.</p>
                <button
                  type="button"
                  onClick={() => setIsAddContactOpen(true)}
                  className="px-3 py-1.5 text-xs font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-sm transition"
                >
                  Add Contact by Chat ID
                </button>
              </div>
            ) : (
              filteredContacts.map((c) => (
                <div
                  key={c.user?._id}
                  className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition"
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <Avatar
                      name={c.nickname || c.user?.displayName}
                      src={c.user?.avatar}
                      size="sm"
                      isOnline={c.user?.isOnline}
                      showOnlineBadge={true}
                    />
                    <div className="min-w-0">
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                        {c.nickname || c.user?.displayName}
                      </h4>
                      <p className="text-xs font-mono text-brand-600 dark:text-brand-400">
                        {c.user?.chatId}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1">
                    <button
                      type="button"
                      onClick={() => startCall(c.user, 'audio')}
                      title="Audio Call"
                      className="p-1.5 text-slate-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                    >
                      <Phone className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => startCall(c.user, 'video')}
                      title="Video Call"
                      className="p-1.5 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                    >
                      <Video className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await startConversationWithUser({ targetUserId: c.user?._id });
                        setActiveTab('chats');
                        if (onSelectMobileChat) onSelectMobileChat();
                      }}
                      className="p-1.5 text-brand-600 hover:text-brand-700 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-950/40 rounded-lg transition"
                      title="Send message"
                    >
                      <MessageSquare className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* 4. CALLS TAB */}
        {activeTab === 'calls' && (
          <div className="flex flex-col h-full">
            {/* Header row */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                Call History ({callLogs.length})
              </span>
              {callLogs.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('Are you sure you want to clear your call history?')) {
                      clearCallHistory();
                    }
                  }}
                  className="inline-flex items-center space-x-1 px-2 py-1 text-xs font-medium text-rose-600 hover:text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear</span>
                </button>
              )}
            </div>

            {isLoadingCallLogs ? (
              <div className="p-8 text-center text-xs text-slate-400">Loading call history...</div>
            ) : filteredCallLogs.length === 0 ? (
              <div className="p-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center mx-auto">
                  <Phone className="w-6 h-6" />
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">No calls recorded yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredCallLogs.map((log) => {
                  const isMissed = log.status === 'missed' || log.status === 'declined';

                  return (
                    <div
                      key={log._id}
                      className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition"
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <Avatar
                          name={log.peer?.displayName || 'User'}
                          src={log.peer?.avatar}
                          size="md"
                        />
                        <div className="min-w-0">
                          <h4 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                            {log.peer?.displayName || 'Unknown User'}
                          </h4>
                          <div className="flex items-center space-x-1.5 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {log.isOutgoing ? (
                              <PhoneOutgoing className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                            ) : isMissed ? (
                              <PhoneMissed className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
                            ) : (
                              <PhoneIncoming className="w-3.5 h-3.5 text-brand-500 flex-shrink-0" />
                            )}

                            <span className={isMissed ? 'text-rose-500 font-medium' : ''}>
                              {log.isOutgoing
                                ? 'Outgoing'
                                : isMissed
                                ? 'Missed'
                                : 'Incoming'}
                              {log.duration > 0 && ` (${formatDuration(log.duration)})`}
                            </span>
                            <span>•</span>
                            <span className="text-[11px] text-slate-400">
                              {formatTime(log.createdAt)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* 1-Click Call Back Buttons */}
                      <div className="flex items-center space-x-1">
                        <button
                          type="button"
                          onClick={() => startCall(log.peer, 'audio')}
                          title="Audio Call Back"
                          className="p-2 text-slate-600 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg transition"
                        >
                          <Phone className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => startCall(log.peer, 'video')}
                          title="Video Call Back"
                          className="p-2 text-slate-600 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition"
                        >
                          <Video className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      <AddContactModal isOpen={isAddContactOpen} onClose={() => setIsAddContactOpen(false)} />
      <CreateGroupModal isOpen={isCreateGroupOpen} onClose={() => setIsCreateGroupOpen(false)} />
      {isAdmin && (
        <AdminDashboardModal
          isOpen={isAdminOpen}
          onClose={() => setIsAdminOpen(false)}
          currentUser={user}
        />
      )}
    </aside>
  );
};
