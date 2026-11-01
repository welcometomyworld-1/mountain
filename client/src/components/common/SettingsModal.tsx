import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Copy,
  Check,
  User as UserIcon,
  Shield,
  Moon,
  Sun,
  Save,
  LogOut,
  Camera,
  Loader2,
  Trash2,
  Eye,
  UserX,
  Activity,
  Clock,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Avatar } from './Avatar';
import { uploadAvatarApi } from '../../api/upload';
import { getBlockedUsersApi, unblockUserApi } from '../../api/users';
import { User } from '../../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { user, updateProfile, refreshProfile, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [avatar, setAvatar] = useState('');
  const [profileVisibility, setProfileVisibility] = useState<'everyone' | 'contacts' | 'nobody'>('everyone');
  const [onlineStatus, setOnlineStatus] = useState<'everyone' | 'contacts' | 'nobody'>('everyone');
  const [lastSeen, setLastSeen] = useState<'everyone' | 'contacts' | 'nobody'>('everyone');
  const [readReceipts, setReadReceipts] = useState<boolean>(true);

  const [blockedUsers, setBlockedUsers] = useState<User[]>([]);
  const [isLoadingBlocked, setIsLoadingBlocked] = useState(false);
  const [unblockingId, setUnblockingId] = useState<string | null>(null);

  const [isCopied, setIsCopied] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Sync state with current user when opened
  useEffect(() => {
    if (user && isOpen) {
      setDisplayName(user.displayName || '');
      setBio(user.bio || '');
      setAvatar(user.avatar || '');
      setProfileVisibility(user.privacySettings?.profileVisibility || 'everyone');
      setOnlineStatus(user.privacySettings?.onlineStatus || 'everyone');
      setLastSeen(user.privacySettings?.lastSeen || 'everyone');
      setReadReceipts(user.privacySettings?.readReceipts ?? true);
      loadBlockedUsers();
    }
  }, [user, isOpen]);

  const loadBlockedUsers = async () => {
    setIsLoadingBlocked(true);
    try {
      const res = await getBlockedUsersApi();
      if (res.success && res.blockedUsers) {
        setBlockedUsers(res.blockedUsers);
      }
    } catch (err) {
      console.warn('Could not load blocked users:', err);
    } finally {
      setIsLoadingBlocked(false);
    }
  };

  const handleUnblock = async (targetUserId: string) => {
    setUnblockingId(targetUserId);
    try {
      await unblockUserApi(targetUserId);
      setBlockedUsers((prev) => prev.filter((u) => u._id !== targetUserId));
      await refreshProfile();
    } catch (err: any) {
      alert(err.message || 'Failed to unblock user');
    } finally {
      setUnblockingId(null);
    }
  };

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (JPG or PNG)');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('Avatar image must be under 10MB');
      return;
    }

    setIsUploadingAvatar(true);
    setErrorMsg('');
    try {
      const res = await uploadAvatarApi(file);
      setAvatar(res.avatar);
      await refreshProfile();
      setSuccessMsg('Profile picture updated successfully!');
      setTimeout(() => setSuccessMsg(''), 2500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to upload profile picture');
    } finally {
      setIsUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  };

  const handleRemoveAvatar = async () => {
    setAvatar('');
    try {
      await updateProfile({ avatar: '' });
      await refreshProfile();
    } catch (err: any) {
      console.error(err);
    }
  };

  if (!isOpen || !user) return null;

  const handleCopyChatId = () => {
    navigator.clipboard.writeText(user.chatId);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      await updateProfile({
        displayName: displayName.trim(),
        bio: bio.trim(),
        avatar: avatar.trim(),
        privacySettings: {
          profileVisibility,
          onlineStatus,
          lastSeen,
          readReceipts,
        },
      });
      setSuccessMsg('Settings updated successfully!');
      setTimeout(() => setSuccessMsg(''), 2500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-2.5 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in pt-safe pb-safe">
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col max-h-[92dvh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
          <div className="flex items-center space-x-2">
            <Shield className="w-5 h-5 text-brand-600 dark:text-brand-400" />
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">Account & Privacy Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 min-w-[36px] min-h-[36px] flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            aria-label="Close settings"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-4 sm:p-6 overflow-y-auto space-y-5 sm:space-y-6 flex-1">
          {/* Chat ID Card */}
          <div className="p-3.5 sm:p-4 rounded-xl bg-gradient-to-r from-brand-50 to-indigo-50 dark:from-slate-800 dark:to-brand-950/40 border border-brand-100 dark:border-brand-900/40">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-400">
                  Your Unique Private Chat ID
                </p>
                <p className="mt-1 text-xl sm:text-2xl font-extrabold tracking-wider text-slate-900 dark:text-white font-mono break-all">
                  {user.chatId}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Share this ID so others can chat or call you privately without your phone number.
                </p>
              </div>
              <button
                type="button"
                onClick={handleCopyChatId}
                className="flex items-center justify-center space-x-1.5 px-3.5 py-2 min-h-[38px] text-xs font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-sm transition flex-shrink-0 self-start sm:self-auto"
              >
                {isCopied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-300" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy ID</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Profile Picture & Public Profile */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-200 flex items-center space-x-2">
              <UserIcon className="w-4 h-4 text-brand-500" />
              <span>Profile Information</span>
            </h3>

            {/* Profile Avatar Upload */}
            <div className="flex items-center space-x-4 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60">
              <div className="relative group flex-shrink-0">
                <Avatar name={displayName || user.displayName} src={avatar} size="lg" />
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                  title="Upload profile picture (JPG or PNG)"
                  className="absolute inset-0 rounded-full bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition cursor-pointer"
                >
                  {isUploadingAvatar ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Camera className="w-5 h-5" />
                  )}
                </button>
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Profile Photo
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Select a JPG or PNG image to set your profile picture.
                </p>
                <div className="mt-2 flex items-center space-x-2">
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    className="hidden"
                    onChange={handleAvatarFileChange}
                  />
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={isUploadingAvatar}
                    className="inline-flex items-center space-x-1.5 px-3 py-1 text-xs font-medium rounded-lg bg-brand-600 hover:bg-brand-700 text-white transition disabled:opacity-50"
                  >
                    {isUploadingAvatar ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Uploading...</span>
                      </>
                    ) : (
                      <>
                        <Camera className="w-3.5 h-3.5" />
                        <span>Change Photo</span>
                      </>
                    )}
                  </button>
                  {avatar && (
                    <button
                      type="button"
                      onClick={handleRemoveAvatar}
                      className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-medium rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Display Name
              </label>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your display name"
                className="mt-1 w-full px-3 py-2 text-base sm:text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                About / Bio
              </label>
              <input
                type="text"
                maxLength={120}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Hey there! I am using PrivateID."
                className="mt-1 w-full px-3 py-2 text-base sm:text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          {/* Privacy Controls */}
          <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-200 flex items-center space-x-2">
              <Shield className="w-4 h-4 text-emerald-500" />
              <span>Privacy Controls</span>
            </h3>

            {/* Profile Visibility */}
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1 flex items-center space-x-1.5">
                <Eye className="w-3.5 h-3.5 text-slate-400" />
                <span>Profile Photo & Info Visibility</span>
              </label>
              <select
                value={profileVisibility}
                onChange={(e) => setProfileVisibility(e.target.value as any)}
                className="w-full px-3 py-2.5 text-base sm:text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="everyone">Everyone</option>
                <option value="contacts">My Saved Contacts Only</option>
                <option value="nobody">Nobody (Private)</option>
              </select>
            </div>

            {/* Online Status */}
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1 flex items-center space-x-1.5">
                <Activity className="w-3.5 h-3.5 text-slate-400" />
                <span>Who can see when you are Online</span>
              </label>
              <select
                value={onlineStatus}
                onChange={(e) => setOnlineStatus(e.target.value as any)}
                className="w-full px-3 py-2.5 text-base sm:text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="everyone">Everyone</option>
                <option value="contacts">My Saved Contacts Only</option>
                <option value="nobody">Nobody</option>
              </select>
            </div>

            {/* Last Seen */}
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1 flex items-center space-x-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Last Seen Timestamp</span>
              </label>
              <select
                value={lastSeen}
                onChange={(e) => setLastSeen(e.target.value as any)}
                className="w-full px-3 py-2.5 text-base sm:text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="everyone">Everyone</option>
                <option value="contacts">My Saved Contacts Only</option>
                <option value="nobody">Nobody</option>
              </select>
            </div>

            {/* Read Receipts */}
            <div className="flex items-center justify-between py-1">
              <div>
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200">Read Receipts</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Show double blue checkmarks when messages are viewed.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={readReceipts}
                  onChange={(e) => setReadReceipts(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
              </label>
            </div>
          </div>

          {/* Blocked Users Section */}
          <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-200 flex items-center space-x-2">
              <UserX className="w-4 h-4 text-rose-500" />
              <span>Blocked Contacts ({blockedUsers.length})</span>
            </h3>

            {isLoadingBlocked ? (
              <p className="text-xs text-slate-400">Loading blocked contacts...</p>
            ) : blockedUsers.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                No users are currently blocked.
              </p>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {blockedUsers.map((bu) => (
                  <div
                    key={bu._id}
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60"
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <Avatar name={bu.displayName} src={bu.avatar} size="sm" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                          {bu.displayName}
                        </p>
                        <p className="text-[10px] font-mono text-slate-400">
                          {bu.chatId}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleUnblock(bu._id)}
                      disabled={unblockingId === bu._id}
                      className="px-2.5 py-1 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded border border-rose-200 dark:border-rose-900 transition disabled:opacity-50"
                    >
                      {unblockingId === bu._id ? 'Unblocking...' : 'Unblock'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Theme & Logout */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={toggleTheme}
              className="flex items-center space-x-2 px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="w-4 h-4 text-amber-400" />
                  <span>Light Mode</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-indigo-500" />
                  <span>Dark Mode</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                onClose();
                logout();
              }}
              className="flex items-center space-x-1.5 px-3 py-2 text-xs font-medium text-rose-600 hover:text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>

          {errorMsg && (
            <p className="text-xs font-medium text-rose-600 dark:text-rose-400 text-center animate-fade-in">
              {errorMsg}
            </p>
          )}

          {successMsg && (
            <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 text-center animate-fade-in">
              {successMsg}
            </p>
          )}

          {/* Footer Submit */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="w-full min-h-[44px] flex items-center justify-center space-x-2 py-2.5 px-4 bg-brand-600 hover:bg-brand-700 text-white font-medium text-sm rounded-xl shadow-lg shadow-brand-500/25 transition disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
