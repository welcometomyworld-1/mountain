import React, { useState } from 'react';
import { X, Users, UserPlus, Shield, ShieldCheck, LogOut, Trash2, Loader2 } from 'lucide-react';
import { Group, User } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { addMemberByChatIdApi, removeMemberApi, leaveGroupApi } from '../../api/groups';
import { Avatar } from '../common/Avatar';

interface GroupInfoModalProps {
  isOpen: boolean;
  group: Group | null;
  onClose: () => void;
}

export const GroupInfoModal: React.FC<GroupInfoModalProps> = ({
  isOpen,
  group,
  onClose,
}) => {
  const { user } = useAuth();
  const { refreshGroups, selectConversation } = useChat();

  const [chatIdInput, setChatIdInput] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen || !group || !user) return null;

  const isAdmin = group.admins.some((a) => {
    const adminId = typeof a === 'string' ? a : a._id;
    return adminId === user._id;
  });

  const isCreator = (typeof group.creator === 'string' ? group.creator : group.creator._id) === user._id;

  const handleAddMember = async () => {
    const cid = chatIdInput.trim().toUpperCase();
    if (!cid) return;

    setIsAdding(true);
    setStatusMsg('');
    setErrorMsg('');

    try {
      const res = await addMemberByChatIdApi(group._id, cid);
      if (res.success) {
        setStatusMsg('Member added successfully!');
        setChatIdInput('');
        await refreshGroups();
        setTimeout(() => setStatusMsg(''), 2500);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to add member.');
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this member from the group?')) return;

    try {
      await removeMemberApi(group._id, memberId);
      await refreshGroups();
    } catch (err: any) {
      alert(err.message || 'Failed to remove member.');
    }
  };

  const handleLeaveGroup = async () => {
    if (!confirm('Leave this group? You will no longer receive new messages from this group.')) return;

    try {
      await leaveGroupApi(group._id);
      await refreshGroups();
      onClose();
    } catch (err: any) {
      alert(err.message || 'Failed to leave group.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in select-none pt-safe pb-safe">
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col max-h-[92dvh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
          <div className="flex items-center space-x-2.5">
            <Users className="w-5 h-5 text-brand-600 dark:text-brand-400" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white truncate">Group Info</h2>
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
        <div className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1">
          {/* Group details card */}
          <div className="text-center pb-2">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-600 text-white font-black text-2xl flex items-center justify-center mx-auto shadow-md">
              {group.name.slice(0, 2).toUpperCase()}
            </div>
            <h3 className="mt-3 text-lg font-bold text-slate-900 dark:text-white">{group.name}</h3>
            {group.description && (
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{group.description}</p>
            )}
            <p className="mt-1 text-xs font-semibold text-brand-600 dark:text-brand-400">
              {group.members.length} Members
            </p>
          </div>

          {/* Add member (Admin only) */}
          {isAdmin && (
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Add Member by Chat ID
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  placeholder="e.g. CHAT558621"
                  value={chatIdInput}
                  onChange={(e) => setChatIdInput(e.target.value.toUpperCase())}
                  className="flex-1 px-3 py-2 text-base sm:text-xs font-mono rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white uppercase focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <button
                  type="button"
                  onClick={handleAddMember}
                  disabled={!chatIdInput.trim() || isAdding}
                  className="px-3.5 py-2 min-h-[40px] text-xs font-bold rounded-xl bg-brand-600 hover:bg-brand-700 text-white transition disabled:opacity-50 flex items-center space-x-1 flex-shrink-0"
                >
                  {isAdding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
                  <span>Add</span>
                </button>
              </div>
              {statusMsg && <p className="text-xs text-emerald-500">{statusMsg}</p>}
              {errorMsg && <p className="text-xs text-rose-500">{errorMsg}</p>}
            </div>
          )}

          {/* Members List */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Members ({group.members.length})
            </h4>
            <div className="space-y-2">
              {group.members.map((member) => {
                const isMemberAdmin = group.admins.some((a) => {
                  const aid = typeof a === 'string' ? a : a._id;
                  return aid === member._id;
                });
                const isMemberCreator = (typeof group.creator === 'string' ? group.creator : group.creator._id) === member._id;

                return (
                  <div
                    key={member._id}
                    className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/40 transition"
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <Avatar name={member.displayName} src={member.avatar} size="sm" />
                      <div className="min-w-0">
                        <div className="flex items-center space-x-1.5">
                          <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {member.displayName}
                          </p>
                          {member._id === user._id && (
                            <span className="text-[10px] text-slate-400">(You)</span>
                          )}
                          {isMemberCreator ? (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400">
                              Creator
                            </span>
                          ) : isMemberAdmin ? (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-brand-100 text-brand-700 dark:bg-brand-950/60 dark:text-brand-400">
                              Admin
                            </span>
                          ) : null}
                        </div>
                        <p className="text-[10px] font-mono text-slate-400">{member.chatId}</p>
                      </div>
                    </div>

                    {isAdmin && member._id !== user._id && (
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(member._id)}
                        className="p-1 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                        title="Remove member"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Leave group */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={handleLeaveGroup}
              className="w-full py-2.5 px-4 min-h-[44px] flex items-center justify-center space-x-2 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition"
            >
              <LogOut className="w-4 h-4" />
              <span>Leave Group</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
