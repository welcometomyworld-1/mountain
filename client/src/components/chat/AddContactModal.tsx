import React, { useState } from 'react';
import { X, Search, UserPlus, MessageSquare, ShieldAlert, Check } from 'lucide-react';
import { searchByChatIdApi } from '../../api/users';
import { useChat } from '../../context/ChatContext';
import { Avatar } from '../common/Avatar';
import { User } from '../../types';

interface AddContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddContactModal: React.FC<AddContactModalProps> = ({ isOpen, onClose }) => {
  const { startConversationWithUser, addContact } = useChat();

  const [chatIdQuery, setChatIdQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [foundUser, setFoundUser] = useState<User | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [nickname, setNickname] = useState('');
  const [isAdded, setIsAdded] = useState(false);

  if (!isOpen) return null;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatIdQuery.trim()) return;

    setIsSearching(true);
    setErrorMessage('');
    setFoundUser(null);
    setIsAdded(false);

    try {
      const res = await searchByChatIdApi(chatIdQuery.trim());
      if (res.success && res.user) {
        setFoundUser(res.user);
        setNickname(res.user.displayName);
        if (res.user.isContact) {
          setIsAdded(true);
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'No user found with this exact Chat ID.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleStartChat = async () => {
    if (!foundUser) return;
    try {
      await startConversationWithUser({ targetUserId: foundUser._id });
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Could not start conversation.');
    }
  };

  const handleAddContact = async () => {
    if (!foundUser) return;
    try {
      await addContact(foundUser._id, nickname.trim());
      setIsAdded(true);
    } catch (err: any) {
      setErrorMessage(err.message || 'Could not add contact.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in pt-safe pb-safe">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-4 sm:p-6 max-h-[92dvh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-2">
            <UserPlus className="w-5 h-5 text-brand-600 dark:text-brand-400" />
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">Start Chat by Chat ID</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 min-w-[36px] min-h-[36px] flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSearch} className="pt-4 space-y-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            For privacy, users can only be discovered with their exact Chat ID (e.g. <strong>CHAT482913</strong>). No public directories exist.
          </p>

          <div className="flex space-x-2">
            <input
              type="text"
              required
              placeholder="Enter exact Chat ID"
              value={chatIdQuery}
              onChange={(e) => setChatIdQuery(e.target.value.toUpperCase())}
              className="flex-1 px-3.5 py-2.5 text-base sm:text-sm uppercase font-mono tracking-wider rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <button
              type="submit"
              disabled={isSearching || !chatIdQuery.trim()}
              className="px-4 py-2.5 min-h-[44px] bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-medium text-sm flex items-center space-x-1.5 transition disabled:opacity-50 flex-shrink-0"
            >
              <Search className="w-4 h-4" />
              <span>{isSearching ? '...' : 'Find'}</span>
            </button>
          </div>
        </form>

        {errorMessage && (
          <div className="mt-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-center space-x-2 text-xs text-rose-600 dark:text-rose-400">
            <ShieldAlert className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {foundUser && (
          <div className="mt-5 p-3.5 sm:p-4 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-4 animate-fade-in">
            <div className="flex items-center space-x-3">
              <Avatar
                name={foundUser.displayName}
                src={foundUser.avatar}
                size="lg"
                isOnline={foundUser.isOnline}
                showOnlineBadge={true}
              />
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                  {foundUser.displayName}
                </h4>
                <p className="text-xs font-mono font-medium text-brand-600 dark:text-brand-400">
                  {foundUser.chatId}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                  {foundUser.bio || 'Available on PrivateID'}
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Optional Contact Nickname
              </label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Custom contact label"
                className="w-full px-3 py-2 text-base sm:text-xs rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div className="flex flex-col xs:flex-row space-y-2 xs:space-y-0 xs:space-x-2 pt-1">
              <button
                type="button"
                onClick={handleAddContact}
                disabled={isAdded}
                className="flex-1 py-2.5 px-3 min-h-[42px] text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center space-x-1 transition disabled:opacity-60"
              >
                {isAdded ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span>In Contacts</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Save Contact</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleStartChat}
                className="flex-1 py-2.5 px-3 min-h-[42px] text-xs font-medium rounded-lg bg-brand-600 hover:bg-brand-700 text-white flex items-center justify-center space-x-1.5 transition shadow-sm"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Message Now</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
