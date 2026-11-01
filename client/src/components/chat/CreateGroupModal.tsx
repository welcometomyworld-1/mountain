import React, { useState } from 'react';
import { X, Users, UserPlus, Check, Trash2, Loader2, Shield } from 'lucide-react';
import { useChat } from '../../context/ChatContext';
import { searchUserByChatIdApi } from '../../api/users';
import { Avatar } from '../common/Avatar';
import { User } from '../../types';

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateGroupModal: React.FC<CreateGroupModalProps> = ({ isOpen, onClose }) => {
  const { createGroup } = useChat();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [chatIdInput, setChatIdInput] = useState('');
  const [memberUsers, setMemberUsers] = useState<User[]>([]);
  const [isSearchingUser, setIsSearchingUser] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchError, setSearchError] = useState('');

  if (!isOpen) return null;

  const handleAddMemberByChatId = async () => {
    const formattedId = chatIdInput.trim().toUpperCase();
    if (!formattedId) return;

    if (memberUsers.some((u) => u.chatId === formattedId)) {
      setSearchError('User already added to member list.');
      return;
    }

    setIsSearchingUser(true);
    setSearchError('');

    try {
      const res = await searchUserByChatIdApi(formattedId);
      if (res.success && res.user) {
        setMemberUsers((prev) => [...prev, res.user]);
        setChatIdInput('');
      } else {
        setSearchError('No user found with this Chat ID.');
      }
    } catch (err: any) {
      setSearchError(err.message || 'User not found or privacy settings prevent adding.');
    } finally {
      setIsSearchingUser(false);
    }
  };

  const handleRemoveMember = (userId: string) => {
    setMemberUsers((prev) => prev.filter((u) => u._id !== userId));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      const memberChatIds = memberUsers.map((u) => u.chatId);
      await createGroup({
        name: name.trim(),
        description: description.trim(),
        memberChatIds,
      });
      onClose();
    } catch (err: any) {
      alert(err.message || 'Failed to create group.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in select-none pt-safe pb-safe">
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col max-h-[92dvh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Create Private Group</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Chat with multiple contacts securely</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 min-w-[36px] min-h-[36px] flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleCreate} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Group Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Project Team, Family, Study Group"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 text-base sm:text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Description (Optional)
            </label>
            <input
              type="text"
              placeholder="Group purpose or topic..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 text-base sm:text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Add Members by Chat ID */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Add Members by Chat ID
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                placeholder="e.g. CHAT838380"
                value={chatIdInput}
                onChange={(e) => setChatIdInput(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddMemberByChatId();
                  }
                }}
                className="flex-1 px-3.5 py-2 text-base sm:text-xs font-mono rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white uppercase focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <button
                type="button"
                onClick={handleAddMemberByChatId}
                disabled={!chatIdInput.trim() || isSearchingUser}
                className="px-3.5 py-2 min-h-[40px] flex items-center space-x-1 text-xs font-bold rounded-xl bg-brand-600 hover:bg-brand-700 text-white transition disabled:opacity-50 flex-shrink-0"
              >
                {isSearchingUser ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <>
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </>
                )}
              </button>
            </div>

            {searchError && (
              <p className="mt-1.5 text-xs text-rose-500">{searchError}</p>
            )}

            {/* Added members list */}
            {memberUsers.length > 0 && (
              <div className="mt-3 space-y-2 max-h-40 overflow-y-auto">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Initial Members ({memberUsers.length})
                </p>
                {memberUsers.map((member) => (
                  <div
                    key={member._id}
                    className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800"
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <Avatar name={member.displayName} src={member.avatar} size="sm" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                          {member.displayName}
                        </p>
                        <p className="text-[10px] font-mono text-slate-400">
                          {member.chatId}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveMember(member._id)}
                      className="p-1 text-slate-400 hover:text-rose-500 transition"
                      title="Remove from list"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="pt-4 flex items-center justify-end space-x-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 min-h-[42px] text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || isSubmitting}
              className="px-5 py-2.5 min-h-[42px] flex items-center space-x-2 text-xs font-bold rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white shadow-md shadow-brand-500/25 transition disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creating Group...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Create Group</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
