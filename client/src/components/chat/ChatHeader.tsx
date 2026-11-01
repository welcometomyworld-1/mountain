import React, { useState } from 'react';
import {
  Phone,
  Video,
  MoreVertical,
  ArrowLeft,
  Trash2,
  Ban,
  UserPlus,
  Copy,
  Check,
  Search,
  Users,
  Info,
} from 'lucide-react';
import { useChat } from '../../context/ChatContext';
import { useCall } from '../../context/CallContext';
import { Avatar } from '../common/Avatar';
import { GroupInfoModal } from './GroupInfoModal';

interface ChatHeaderProps {
  onBackClick?: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({ onBackClick }) => {
  const {
    activeConversation,
    activeGroup,
    clearCurrentConversation,
    deleteConversation,
    blockUser,
    addContact,
    isTyping,
    searchMessages,
    clearSearch,
    isSearching,
    searchResults,
  } = useChat();
  const { startCall, callState } = useCall();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isGroupInfoOpen, setIsGroupInfoOpen] = useState(false);
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [localSearchText, setLocalSearchText] = useState('');
  const [localTypeFilter, setLocalTypeFilter] = useState('all');

  if (!activeConversation && !activeGroup) return null;

  const participant = activeConversation?.participant;

  const handleCopyChatId = () => {
    if (!participant) return;
    navigator.clipboard.writeText(participant.chatId);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleStartCall = (callType: 'video' | 'audio') => {
    if (callState.active) {
      alert('You are already in an active call.');
      return;
    }
    if (participant) {
      startCall(participant, callType);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (localSearchText.trim() || localTypeFilter !== 'all') {
      searchMessages(localSearchText.trim(), localTypeFilter);
    }
  };

  const formatLastSeen = () => {
    if (isTyping) {
      return (
        <span className="text-brand-600 dark:text-brand-400 font-medium animate-pulse">
          typing...
        </span>
      );
    }
    if (participant?.isOnline) {
      return <span className="text-emerald-500 font-medium">Online</span>;
    }
    if (participant?.lastSeen) {
      const date = new Date(participant.lastSeen);
      const isToday = date.toDateString() === new Date().toDateString();
      if (isToday) {
        return `Last seen today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      }
      return `Last seen on ${date.toLocaleDateString([], { month: 'short', day: 'numeric' })}`;
    }
    return <span className="text-slate-400">Offline</span>;
  };

  return (
    <>
      <header className="h-14 sm:h-16 px-2 sm:px-4 md:px-6 flex items-center justify-between bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 z-20 select-none">
        <div className="flex items-center space-x-1.5 sm:space-x-3 min-w-0 flex-1 mr-1 sm:mr-2">
          {onBackClick && (
            <button
              onClick={onBackClick}
              aria-label="Back to conversations"
              className="md:hidden p-2 -ml-1 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white rounded-xl min-w-[38px] min-h-[38px] flex items-center justify-center transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}

          {activeGroup ? (
            /* Group Header Details */
            <div
              onClick={() => setIsGroupInfoOpen(true)}
              className="flex items-center space-x-2 sm:space-x-3 min-w-0 cursor-pointer hover:opacity-90 transition flex-1"
            >
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-600 text-white font-bold text-xs sm:text-sm flex items-center justify-center shadow-sm flex-shrink-0">
                {activeGroup.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                  {activeGroup.name}
                </h3>
                <p className="text-[10px] sm:text-xs text-brand-600 dark:text-brand-400 font-medium truncate">
                  {activeGroup.members?.length || 0} members · Info
                </p>
              </div>
            </div>
          ) : (
            /* 1-to-1 Conversation Header Details */
            <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
              <div className="flex-shrink-0">
                <Avatar
                  name={participant?.displayName}
                  src={participant?.avatar}
                  size="md"
                  isOnline={participant?.isOnline}
                  showOnlineBadge={true}
                />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center space-x-1.5">
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                    {participant?.displayName}
                  </h3>
                  <button
                    type="button"
                    onClick={handleCopyChatId}
                    title="Click to copy Chat ID"
                    className="hidden sm:inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[11px] font-mono font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition"
                  >
                    <span>{participant?.chatId}</span>
                    {isCopied ? (
                      <Check className="w-2.5 h-2.5 text-emerald-500" />
                    ) : (
                      <Copy className="w-2.5 h-2.5 opacity-60" />
                    )}
                  </button>
                </div>
                <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">
                  {formatLastSeen()}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center space-x-0.5 sm:space-x-1 flex-shrink-0">
          {/* Message Search Button */}
          <button
            type="button"
            onClick={() => {
              setShowSearchBar(!showSearchBar);
              if (showSearchBar) clearSearch();
            }}
            title="Search Messages"
            className={`p-2 sm:p-2.5 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-xl transition ${
              showSearchBar || isSearching
                ? 'bg-brand-50 text-brand-600 dark:bg-brand-950/60 dark:text-brand-400'
                : 'text-slate-600 hover:text-brand-600 dark:text-slate-300 dark:hover:text-brand-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Search className="w-4 h-4" />
          </button>

          {activeGroup ? (
            /* Group Info Button */
            <button
              type="button"
              onClick={() => setIsGroupInfoOpen(true)}
              title="Group Info & Members"
              className="p-2 sm:p-2.5 min-w-[36px] min-h-[36px] flex items-center justify-center text-slate-600 hover:text-brand-600 dark:text-slate-300 dark:hover:text-brand-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
            >
              <Info className="w-4 h-4" />
            </button>
          ) : (
            <>
              {/* Audio Call Button */}
              <button
                type="button"
                onClick={() => handleStartCall('audio')}
                disabled={callState.active}
                title="Voice Call (Audio Only)"
                className="p-2 sm:p-2.5 min-w-[36px] min-h-[36px] flex items-center justify-center text-slate-600 hover:text-brand-600 dark:text-slate-300 dark:hover:text-brand-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition disabled:opacity-40"
              >
                <Phone className="w-4 h-4" />
              </button>

              {/* Video Call Button */}
              <button
                type="button"
                onClick={() => handleStartCall('video')}
                disabled={callState.active}
                title="HD Video Call"
                className="p-2 sm:p-2.5 min-w-[36px] min-h-[36px] flex items-center justify-center text-slate-600 hover:text-brand-600 dark:text-slate-300 dark:hover:text-brand-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition disabled:opacity-40"
              >
                <Video className="w-4 h-4" />
              </button>
            </>
          )}

          {/* Dropdown menu for 1-to-1 */}
          {participant && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2 sm:p-2.5 min-w-[36px] min-h-[36px] flex items-center justify-center text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
              >
                <MoreVertical className="w-4 h-4" />
              </button>


              {isMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setIsMenuOpen(false)}
                  />
                  <div className="absolute right-0 top-full mt-1.5 w-48 py-1.5 rounded-xl glass-dropdown z-40 animate-fade-in text-xs font-medium">
                    <button
                      type="button"
                      onClick={() => {
                        handleCopyChatId();
                        setIsMenuOpen(false);
                      }}
                      className="w-full px-4 py-2 text-left flex items-center space-x-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                    >
                      <Copy className="w-4 h-4 text-slate-400" />
                      <span>Copy Chat ID</span>
                    </button>

                    <button
                      type="button"
                      onClick={async () => {
                        if (participant) {
                          await addContact(participant._id);
                        }
                        setIsMenuOpen(false);
                      }}
                      className="w-full px-4 py-2 text-left flex items-center space-x-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                    >
                      <UserPlus className="w-4 h-4 text-slate-400" />
                      <span>Add to Contacts</span>
                    </button>

                    <button
                      type="button"
                      onClick={async () => {
                        if (confirm('Clear all chat messages in this conversation for you?')) {
                          await clearCurrentConversation();
                        }
                        setIsMenuOpen(false);
                      }}
                      className="w-full px-4 py-2 text-left flex items-center space-x-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                    >
                      <Trash2 className="w-4 h-4 text-slate-400" />
                      <span>Clear Chat</span>
                    </button>

                    <button
                      type="button"
                      onClick={async () => {
                        if (
                          confirm(
                            `Delete chat with ${participant.displayName}? All messages will be deleted and this chat will be removed.`
                          )
                        ) {
                          await deleteConversation(activeConversation!._id);
                          if (onBackClick) onBackClick();
                        }
                        setIsMenuOpen(false);
                      }}
                      className="w-full px-4 py-2 text-left flex items-center space-x-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                    >
                      <Trash2 className="w-4 h-4 text-rose-500" />
                      <span>Delete Chat</span>
                    </button>

                    <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

                    <button
                      type="button"
                      onClick={async () => {
                        if (confirm(`Block ${participant.displayName}? They won't be able to message or call you.`)) {
                          await blockUser(participant._id);
                        }
                        setIsMenuOpen(false);
                      }}
                      className="w-full px-4 py-2 text-left flex items-center space-x-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                    >
                      <Ban className="w-4 h-4" />
                      <span>Block User</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Message Search & Filter Bar */}
      {showSearchBar && (
        <div className="px-2.5 sm:px-4 py-2 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700/80 animate-slide-down">
          <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search messages, media, files..."
                value={localSearchText}
                onChange={(e) => setLocalSearchText(e.target.value)}
                autoFocus
                className="w-full pl-8 pr-3 py-1.5 text-sm sm:text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            {/* Filter pills */}
            <div className="flex items-center space-x-1 overflow-x-auto pb-1 sm:pb-0 no-scrollbar touch-pan-x">
              {['all', 'image', 'video', 'audio', 'document'].map((filterType) => (
                <button
                  key={filterType}
                  type="button"
                  onClick={() => {
                    setLocalTypeFilter(filterType);
                    searchMessages(localSearchText.trim(), filterType);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold capitalize whitespace-nowrap transition flex-shrink-0 ${
                    localTypeFilter === filterType
                      ? 'bg-brand-600 text-white'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {filterType === 'all' ? 'All' : filterType + 's'}
                </button>
              ))}

              <button
                type="submit"
                className="px-3 py-1 rounded-lg text-xs font-bold bg-brand-600 text-white hover:bg-brand-700 transition flex-shrink-0"
              >
                Search
              </button>

              {isSearching && (
                <button
                  type="button"
                  onClick={() => {
                    setLocalSearchText('');
                    setLocalTypeFilter('all');
                    clearSearch();
                  }}
                  className="px-2 py-1 text-xs text-rose-500 hover:underline flex-shrink-0 whitespace-nowrap"
                >
                  Reset ({searchResults.length})
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {/* Group Info Modal */}
      <GroupInfoModal
        isOpen={isGroupInfoOpen}
        group={activeGroup}
        onClose={() => setIsGroupInfoOpen(false)}
      />
    </>
  );
};

