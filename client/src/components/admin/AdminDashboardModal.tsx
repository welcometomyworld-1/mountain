import React, { useState, useEffect } from 'react';
import {
  Shield,
  X,
  Users,
  Activity,
  MessageSquare,
  Phone,
  Video,
  Radio,
  Search,
  RefreshCw,
  Ban,
  CheckCircle2,
  KeyRound,
  Trash2,
  Copy,
  Check,
  Send,
  AlertTriangle,
  Server,
  Sparkles,
  Lock,
} from 'lucide-react';
import {
  getAdminStatsApi,
  getAdminUsersApi,
  toggleBanUserApi,
  resetUserPasswordApi,
  deleteUserApi,
  getAdminCallsApi,
  getAdminGroupsApi,
  sendSystemBroadcastApi,
} from '../../api/admin';
import { User, AdminStats, AdminCallItem, AdminGroupItem } from '../../types';
import { Avatar } from '../common/Avatar';

interface AdminDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
}

type TabType = 'overview' | 'users' | 'calls' | 'groups' | 'broadcast';

export const AdminDashboardModal: React.FC<AdminDashboardModalProps> = ({
  isOpen,
  onClose,
  currentUser,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Stats state
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<User[]>([]);
  const [recentUsers, setRecentUsers] = useState<User[]>([]);

  // Users state
  const [users, setUsers] = useState<User[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [userFilter, setUserFilter] = useState<'all' | 'online' | 'offline' | 'banned' | 'admin'>('all');
  const [totalUsersCount, setTotalUsersCount] = useState(0);

  // Calls state
  const [calls, setCalls] = useState<AdminCallItem[]>([]);

  // Groups state
  const [groups, setGroups] = useState<AdminGroupItem[]>([]);

  // Broadcast state
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastType, setBroadcastType] = useState<'info' | 'warning' | 'urgent' | 'success'>('info');
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcastStatus, setBroadcastStatus] = useState<{ success?: string; error?: string } | null>(null);

  // User Action Modals
  const [banModalUser, setBanModalUser] = useState<User | null>(null);
  const [banReason, setBanReason] = useState('');
  const [isBanning, setIsBanning] = useState(false);

  const [passwordModalUser, setPasswordModalUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  const [actionMessage, setActionMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadInitialData();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && activeTab === 'users') {
      loadUsers();
    } else if (isOpen && activeTab === 'calls') {
      loadCalls();
    } else if (isOpen && activeTab === 'groups') {
      loadGroups();
    }
  }, [activeTab, userSearch, userFilter]);

  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      const res = await getAdminStatsApi();
      if (res.success) {
        setStats(res.stats);
        setOnlineUsers(res.onlineUsers || []);
        setRecentUsers(res.recentUsers || []);
      }
    } catch (err: any) {
      console.warn('Failed to load admin stats:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const res = await getAdminUsersApi(userSearch, userFilter, 1, 100);
      if (res.success) {
        setUsers(res.users);
        setTotalUsersCount(res.total);
      }
    } catch (err: any) {
      console.warn('Failed to load users:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadCalls = async () => {
    setIsLoading(true);
    try {
      const res = await getAdminCallsApi(50);
      if (res.success) {
        setCalls(res.calls);
      }
    } catch (err: any) {
      console.warn('Failed to load calls:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadGroups = async () => {
    setIsLoading(true);
    try {
      const res = await getAdminGroupsApi();
      if (res.success) {
        setGroups(res.groups);
      }
    } catch (err: any) {
      console.warn('Failed to load groups:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (chatId: string) => {
    navigator.clipboard.writeText(chatId);
    setCopiedId(chatId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const showFeedback = (msg: string) => {
    setActionMessage(msg);
    setTimeout(() => setActionMessage(null), 3000);
  };

  const handleConfirmBan = async () => {
    if (!banModalUser) return;
    setIsBanning(true);
    try {
      const res = await toggleBanUserApi(banModalUser._id, banReason);
      if (res.success) {
        showFeedback(res.message);
        setBanModalUser(null);
        setBanReason('');
        loadUsers();
        loadInitialData();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update user status');
    } finally {
      setIsBanning(false);
    }
  };

  const handleConfirmPasswordReset = async () => {
    if (!passwordModalUser || !newPassword) return;
    setIsResettingPassword(true);
    try {
      const res = await resetUserPasswordApi(passwordModalUser._id, newPassword);
      if (res.success) {
        showFeedback(res.message);
        setPasswordModalUser(null);
        setNewPassword('');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to reset password');
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleDeleteUser = async (targetUser: User) => {
    if (
      !confirm(
        `Are you sure you want to PERMANENTLY delete user ${targetUser.displayName} (${targetUser.chatId})? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      const res = await deleteUserApi(targetUser._id);
      if (res.success) {
        showFeedback(res.message);
        loadUsers();
        loadInitialData();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete user');
    }
  };

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastMessage.trim()) return;

    setIsBroadcasting(true);
    setBroadcastStatus(null);
    try {
      const res = await sendSystemBroadcastApi(broadcastTitle, broadcastMessage, broadcastType);
      if (res.success) {
        setBroadcastStatus({ success: 'Announcement broadcast live to all active users!' });
        setBroadcastTitle('');
        setBroadcastMessage('');
        setTimeout(() => setBroadcastStatus(null), 4000);
      }
    } catch (err: any) {
      setBroadcastStatus({ error: err.message || 'Failed to send broadcast' });
    } finally {
      setIsBroadcasting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/80 backdrop-blur-md animate-fade-in select-none pt-safe pb-safe pl-safe pr-safe">
      <div className="relative w-full max-w-6xl h-[94dvh] sm:h-[90dvh] flex flex-col rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl shadow-brand-500/10 overflow-hidden my-auto">
        {/* Top Header */}
        <div className="flex-shrink-0 flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-800 bg-slate-900/95 backdrop-blur-md z-10">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="p-2 sm:p-2.5 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-600 text-white shadow-lg shadow-brand-500/25 flex-shrink-0">
              <Shield className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <h2 className="text-base sm:text-lg font-extrabold text-white font-display truncate">
                  PrivateID Control Center
                </h2>
                <span className="hidden xs:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1 animate-pulse" />
                  Live
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate">
                Administered by <strong className="text-brand-400">{currentUser.chatId}</strong> ({currentUser.displayName})
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                if (activeTab === 'overview') loadInitialData();
                else if (activeTab === 'users') loadUsers();
                else if (activeTab === 'calls') loadCalls();
                else if (activeTab === 'groups') loadGroups();
              }}
              disabled={isLoading}
              className="p-2 min-w-[38px] min-h-[38px] flex items-center justify-center text-slate-400 hover:text-white rounded-xl bg-slate-800 hover:bg-slate-700 transition"
              title="Refresh Data"
              aria-label="Refresh data"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-brand-400' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 min-w-[38px] min-h-[38px] flex items-center justify-center text-slate-400 hover:text-white rounded-xl bg-slate-800 hover:bg-slate-700 transition"
              title="Close Panel"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action toast feedback */}
        {actionMessage && (
          <div className="bg-emerald-500/20 border-b border-emerald-500/40 px-4 py-2 text-center text-xs text-emerald-300 font-medium animate-slide-down">
            {actionMessage}
          </div>
        )}

        {/* Navigation Tabs Bar */}
        <div className="flex-shrink-0 flex items-center px-4 sm:px-6 border-b border-slate-800 bg-slate-900/60 overflow-x-auto no-scrollbar space-x-1 sm:space-x-2 py-2">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center space-x-1.5 px-3 py-2 min-h-[38px] text-xs font-bold rounded-xl whitespace-nowrap transition ${
              activeTab === 'overview'
                ? 'bg-brand-600 text-white shadow-md shadow-brand-500/25'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Live Overview</span>
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center space-x-1.5 px-3 py-2 min-h-[38px] text-xs font-bold rounded-xl whitespace-nowrap transition ${
              activeTab === 'users'
                ? 'bg-brand-600 text-white shadow-md shadow-brand-500/25'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Users ({stats?.totalUsers || 0})</span>
          </button>

          <button
            onClick={() => setActiveTab('calls')}
            className={`flex items-center space-x-1.5 px-3 py-2 min-h-[38px] text-xs font-bold rounded-xl whitespace-nowrap transition ${
              activeTab === 'calls'
                ? 'bg-brand-600 text-white shadow-md shadow-brand-500/25'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Phone className="w-4 h-4" />
            <span>Call History ({stats?.totalCalls || 0})</span>
          </button>

          <button
            onClick={() => setActiveTab('groups')}
            className={`flex items-center space-x-1.5 px-3 py-2 min-h-[38px] text-xs font-bold rounded-xl whitespace-nowrap transition ${
              activeTab === 'groups'
                ? 'bg-brand-600 text-white shadow-md shadow-brand-500/25'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Groups ({stats?.totalGroups || 0})</span>
          </button>

          <button
            onClick={() => setActiveTab('broadcast')}
            className={`flex items-center space-x-1.5 px-3 py-2 min-h-[38px] text-xs font-bold rounded-xl whitespace-nowrap transition ${
              activeTab === 'broadcast'
                ? 'bg-brand-600 text-white shadow-md shadow-brand-500/25'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Radio className="w-4 h-4" />
            <span>Broadcast Alert</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Stat Cards Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {/* Total Users */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-800/80 to-slate-900 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-xs font-semibold uppercase tracking-wider">Total Users</span>
                    <Users className="w-4 h-4 text-brand-400" />
                  </div>
                  <p className="text-2xl sm:text-3xl font-black text-white font-display">
                    {stats?.totalUsers ?? '...'}
                  </p>
                  <p className="text-[11px] text-slate-500">Registered Chat IDs</p>
                </div>

                {/* Live Online Users */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950/40 to-slate-900 border border-emerald-900/40 space-y-2">
                  <div className="flex items-center justify-between text-emerald-400">
                    <span className="text-xs font-semibold uppercase tracking-wider">Online Now</span>
                    <span className="flex h-2.5 w-2.5 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                    </span>
                  </div>
                  <p className="text-2xl sm:text-3xl font-black text-emerald-300 font-display">
                    {stats?.onlineUsersCount ?? '...'}
                  </p>
                  <p className="text-[11px] text-emerald-400/70">Actively connected sockets</p>
                </div>

                {/* Messages Sent */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-800/80 to-slate-900 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-xs font-semibold uppercase tracking-wider">Messages Sent</span>
                    <MessageSquare className="w-4 h-4 text-indigo-400" />
                  </div>
                  <p className="text-2xl sm:text-3xl font-black text-white font-display">
                    {stats?.totalMessages ?? '...'}
                  </p>
                  <p className="text-[11px] text-slate-500">1-to-1 & Group Chats</p>
                </div>

                {/* Calls Logged */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-800/80 to-slate-900 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-xs font-semibold uppercase tracking-wider">WebRTC Calls</span>
                    <Phone className="w-4 h-4 text-violet-400" />
                  </div>
                  <p className="text-2xl sm:text-3xl font-black text-white font-display">
                    {stats?.totalCalls ?? '...'}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {stats?.videoCallsCount ?? 0} video · {stats?.audioCallsCount ?? 0} audio
                  </p>
                </div>
              </div>

              {/* Who is currently online */}
              <div className="p-4 sm:p-5 rounded-3xl bg-slate-800/40 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <h3 className="text-sm font-bold text-white">
                      Live Users Currently Active ({onlineUsers.length})
                    </h3>
                  </div>
                  <span className="text-xs text-slate-400">Real-time status</span>
                </div>

                {onlineUsers.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 text-center italic">
                    No other users are currently active.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
                    {onlineUsers.map((u) => (
                      <div
                        key={u._id}
                        className="flex items-center justify-between p-3 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition"
                      >
                        <div className="flex items-center space-x-3 min-w-0">
                          <div className="relative flex-shrink-0">
                            <Avatar name={u.displayName} src={u.avatar} size="md" />
                            <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-slate-900" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-white truncate">
                              {u.displayName}
                            </p>
                            <div className="flex items-center space-x-1 mt-0.5">
                              <span className="text-[10px] font-mono font-medium text-brand-400">
                                {u.chatId}
                              </span>
                              {u.role === 'admin' && (
                                <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-brand-500/20 text-brand-300">
                                  Admin
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => handleCopy(u.chatId)}
                          className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition flex-shrink-0"
                          title="Copy Chat ID"
                        >
                          {copiedId === u.chatId ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* System Health Info */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3.5 rounded-2xl bg-slate-800/40 border border-slate-800 flex items-center space-x-3">
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                    <Server className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-white">Database Service</p>
                    <p className="text-[11px] text-emerald-400">MongoDB Online & Connected</p>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-800/40 border border-slate-800 flex items-center space-x-3">
                  <div className="p-2 rounded-xl bg-brand-500/10 text-brand-400">
                    <Radio className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-white">Real-Time Signaling</p>
                    <p className="text-[11px] text-brand-400">Socket.IO Engine Operational</p>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-800/40 border border-slate-800 flex items-center space-x-3">
                  <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
                    <Video className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-white">WebRTC Infrastructure</p>
                    <p className="text-[11px] text-indigo-400">STUN/TURN Direct Mesh Active</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: USERS MANAGEMENT */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              {/* Search & Filters */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by Chat ID (e.g. CHAT838380) or Name..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 text-base sm:text-xs rounded-xl bg-slate-800/90 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                {/* Filter Pills */}
                <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar py-1">
                  {(['all', 'online', 'offline', 'banned', 'admin'] as const).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setUserFilter(f)}
                      className={`px-3 py-1.5 min-h-[36px] text-xs font-bold rounded-xl capitalize transition ${
                        userFilter === f
                          ? 'bg-brand-600 text-white'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {f === 'online' ? '🟢 Online' : f === 'banned' ? '🚫 Banned' : f}
                    </button>
                  ))}
                </div>
              </div>

              {/* Users List / Table */}
              <div className="rounded-2xl bg-slate-800/40 border border-slate-800 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-800/80 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-700">
                      <tr>
                        <th className="px-4 py-3">User & Chat ID</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Role</th>
                        <th className="px-4 py-3">Account State</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-medium">
                      {users.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-slate-500 italic">
                            No users found matching query.
                          </td>
                        </tr>
                      ) : (
                        users.map((u) => {
                          const isSuperAdmin = u.chatId === 'CHAT100000';
                          const isSelf = u._id === currentUser._id;

                          return (
                            <tr key={u._id} className="hover:bg-slate-800/40 transition">
                              {/* User Info */}
                              <td className="px-4 py-3">
                                <div className="flex items-center space-x-3">
                                  <Avatar name={u.displayName} src={u.avatar} size="sm" />
                                  <div className="min-w-0">
                                    <p className="font-bold text-white truncate">{u.displayName}</p>
                                    <div className="flex items-center space-x-1.5">
                                      <span className="font-mono text-[11px] text-brand-400">
                                        {u.chatId}
                                      </span>
                                      <button
                                        onClick={() => handleCopy(u.chatId)}
                                        className="text-slate-500 hover:text-slate-300 transition"
                                        title="Copy Chat ID"
                                      >
                                        {copiedId === u.chatId ? (
                                          <Check className="w-3 h-3 text-emerald-400" />
                                        ) : (
                                          <Copy className="w-3 h-3" />
                                        )}
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </td>

                              {/* Online / Offline */}
                              <td className="px-4 py-3">
                                {u.isOnline ? (
                                  <span className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                    <span>Online</span>
                                  </span>
                                ) : (
                                  <span className="text-[11px] text-slate-500">
                                    {u.lastSeen ? new Date(u.lastSeen).toLocaleDateString() : 'Offline'}
                                  </span>
                                )}
                              </td>

                              {/* Role */}
                              <td className="px-4 py-3">
                                {u.role === 'admin' ? (
                                  <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                    <Shield className="w-3 h-3 text-indigo-400" />
                                    <span>Admin</span>
                                  </span>
                                ) : (
                                  <span className="text-slate-400">Member</span>
                                )}
                              </td>

                              {/* Account State */}
                              <td className="px-4 py-3">
                                {u.isBanned ? (
                                  <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                                    <Ban className="w-3 h-3" />
                                    <span>Suspended</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400">
                                    <CheckCircle2 className="w-3 h-3" />
                                    <span>Active</span>
                                  </span>
                                )}
                              </td>

                              {/* Actions */}
                              <td className="px-4 py-3 text-right">
                                <div className="inline-flex items-center space-x-1">
                                  {/* Ban / Unban */}
                                  {!isSuperAdmin && !isSelf && (
                                    <button
                                      type="button"
                                      onClick={() => setBanModalUser(u)}
                                      className={`p-1.5 rounded-lg text-xs font-semibold transition ${
                                        u.isBanned
                                          ? 'text-emerald-400 hover:bg-emerald-950/40'
                                          : 'text-amber-400 hover:bg-amber-950/40'
                                      }`}
                                      title={u.isBanned ? 'Unban User' : 'Suspend User'}
                                    >
                                      {u.isBanned ? (
                                        <CheckCircle2 className="w-4 h-4" />
                                      ) : (
                                        <Ban className="w-4 h-4" />
                                      )}
                                    </button>
                                  )}

                                  {/* Reset Password */}
                                  <button
                                    type="button"
                                    onClick={() => setPasswordModalUser(u)}
                                    className="p-1.5 text-slate-400 hover:text-brand-300 rounded-lg hover:bg-slate-800 transition"
                                    title="Reset Password"
                                  >
                                    <KeyRound className="w-4 h-4" />
                                  </button>

                                  {/* Delete User */}
                                  {!isSuperAdmin && !isSelf && (
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteUser(u)}
                                      className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition"
                                      title="Delete Account"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CALL LOGS */}
          {activeTab === 'calls' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                  <Phone className="w-4 h-4 text-violet-400" />
                  <span>Recent Audio & Video Calls</span>
                </h3>
                <span className="text-xs text-slate-500">Last 50 calls logged</span>
              </div>

              <div className="rounded-2xl bg-slate-800/40 border border-slate-800 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-800/80 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-700">
                      <tr>
                        <th className="px-4 py-3">Caller</th>
                        <th className="px-4 py-3">Recipient</th>
                        <th className="px-4 py-3">Type</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Duration</th>
                        <th className="px-4 py-3 text-right">Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {calls.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-slate-500 italic">
                            No calls have been placed yet.
                          </td>
                        </tr>
                      ) : (
                        calls.map((c) => (
                          <tr key={c._id} className="hover:bg-slate-800/40 transition">
                            <td className="px-4 py-3 font-semibold text-white">
                              {c.caller ? (
                                <div>
                                  <span>{c.caller.displayName}</span>
                                  <span className="text-[10px] font-mono text-brand-400 block">
                                    {c.caller.chatId}
                                  </span>
                                </div>
                              ) : (
                                'Unknown'
                              )}
                            </td>
                            <td className="px-4 py-3 text-slate-300">
                              {c.recipient ? (
                                <div>
                                  <span>{c.recipient.displayName}</span>
                                  <span className="text-[10px] font-mono text-brand-400 block">
                                    {c.recipient.chatId}
                                  </span>
                                </div>
                              ) : (
                                'Unknown'
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {c.callType === 'video' ? (
                                <span className="inline-flex items-center space-x-1 text-indigo-400 font-semibold">
                                  <Video className="w-3.5 h-3.5" />
                                  <span>Video</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center space-x-1 text-emerald-400 font-semibold">
                                  <Phone className="w-3.5 h-3.5" />
                                  <span>Audio</span>
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                                  c.status === 'completed'
                                    ? 'bg-emerald-500/20 text-emerald-400'
                                    : c.status === 'missed'
                                    ? 'bg-amber-500/20 text-amber-400'
                                    : 'bg-rose-500/20 text-rose-400'
                                }`}
                              >
                                {c.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-mono text-slate-400">
                              {c.duration > 0 ? `${Math.floor(c.duration / 60)}m ${c.duration % 60}s` : '0s'}
                            </td>
                            <td className="px-4 py-3 text-right text-slate-500 text-[11px]">
                              {new Date(c.createdAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: GROUPS */}
          {activeTab === 'groups' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                  <Users className="w-4 h-4 text-brand-400" />
                  <span>Platform Group Chats</span>
                </h3>
                <span className="text-xs text-slate-500">{groups.length} groups registered</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {groups.length === 0 ? (
                  <p className="text-xs text-slate-500 col-span-full py-8 text-center italic">
                    No private groups created yet.
                  </p>
                ) : (
                  groups.map((g) => (
                    <div
                      key={g._id}
                      className="p-4 rounded-2xl bg-slate-800/40 border border-slate-800 space-y-3"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-600 text-white font-bold flex items-center justify-center shadow-md">
                          {g.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-white truncate">{g.name}</h4>
                          <p className="text-[11px] text-slate-400 truncate">
                            Creator: {g.creator?.displayName || 'Unknown'} ({g.creator?.chatId})
                          </p>
                        </div>
                      </div>

                      {g.description && (
                        <p className="text-xs text-slate-400 line-clamp-2">{g.description}</p>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-xs text-slate-500">
                        <span className="font-semibold text-brand-400">
                          {g.members?.length || 0} Members
                        </span>
                        <span>{new Date(g.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 5: BROADCAST ALERT */}
          {activeTab === 'broadcast' && (
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="text-center space-y-2">
                <div className="inline-flex p-3 rounded-2xl bg-brand-500/20 text-brand-400 shadow-md">
                  <Radio className="w-6 h-6 animate-pulse" />
                </div>
                <h3 className="text-lg font-bold text-white">Send System Announcement</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Deliver an instant alert banner to all connected users across the platform in real time via WebSockets.
                </p>
              </div>

              <form onSubmit={handleSendBroadcast} className="p-5 rounded-3xl bg-slate-800/40 border border-slate-800 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Announcement Title (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Scheduled System Upgrade, Welcome to PrivateID"
                    value={broadcastTitle}
                    onChange={(e) => setBroadcastTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-base sm:text-sm rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Announcement Message *
                  </label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Type your message here..."
                    value={broadcastMessage}
                    onChange={(e) => setBroadcastMessage(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-base sm:text-sm rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Alert Urgency / Type
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {(['info', 'warning', 'urgent', 'success'] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setBroadcastType(t)}
                        className={`py-2 px-3 text-xs font-bold rounded-xl capitalize transition border ${
                          broadcastType === t
                            ? t === 'urgent'
                              ? 'bg-rose-500/20 text-rose-300 border-rose-500/60'
                              : t === 'warning'
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/60'
                              : t === 'success'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/60'
                              : 'bg-brand-500/20 text-brand-300 border-brand-500/60'
                            : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {broadcastStatus?.success && (
                  <p className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-xs font-semibold text-emerald-300 text-center animate-fade-in">
                    {broadcastStatus.success}
                  </p>
                )}

                {broadcastStatus?.error && (
                  <p className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/30 text-xs font-semibold text-rose-300 text-center animate-fade-in">
                    {broadcastStatus.error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={isBroadcasting || !broadcastMessage.trim()}
                  className="w-full min-h-[44px] flex items-center justify-center space-x-2 py-3 px-4 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-brand-500/25 transition disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>{isBroadcasting ? 'Broadcasting...' : 'Broadcast Now to All Users'}</span>
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* SUSPEND / BAN MODAL */}
      {banModalUser && (
        <div className="fixed inset-0 z-[100010] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center space-x-3 text-amber-400">
              <AlertTriangle className="w-6 h-6 flex-shrink-0" />
              <h3 className="text-base font-bold text-white">
                {banModalUser.isBanned ? 'Unban User' : 'Suspend Account'}
              </h3>
            </div>

            <p className="text-xs text-slate-300">
              {banModalUser.isBanned
                ? `Restore access for ${banModalUser.displayName} (${banModalUser.chatId})? They will be allowed to log in and chat again.`
                : `Suspend ${banModalUser.displayName} (${banModalUser.chatId})? They will be disconnected immediately and prevented from signing in.`}
            </p>

            {!banModalUser.isBanned && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Reason for Suspension (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Terms violation, abusive behavior"
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  className="w-full px-3 py-2 text-base sm:text-xs rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            )}

            <div className="flex space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setBanModalUser(null)}
                className="flex-1 py-2.5 min-h-[42px] text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmBan}
                disabled={isBanning}
                className={`flex-1 py-2.5 min-h-[42px] text-xs font-bold rounded-xl text-white transition ${
                  banModalUser.isBanned
                    ? 'bg-emerald-600 hover:bg-emerald-500'
                    : 'bg-rose-600 hover:bg-rose-500'
                }`}
              >
                {isBanning ? 'Processing...' : banModalUser.isBanned ? 'Unban User' : 'Confirm Ban'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESET PASSWORD MODAL */}
      {passwordModalUser && (
        <div className="fixed inset-0 z-[100010] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center space-x-3 text-brand-400">
              <KeyRound className="w-6 h-6 flex-shrink-0" />
              <h3 className="text-base font-bold text-white">Reset User Password</h3>
            </div>

            <p className="text-xs text-slate-300">
              Set a new password for <strong className="text-white">{passwordModalUser.displayName}</strong> ({passwordModalUser.chatId}).
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                New Password (minimum 6 characters)
              </label>
              <input
                type="text"
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 text-base sm:text-xs rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div className="flex space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setPasswordModalUser(null)}
                className="flex-1 py-2.5 min-h-[42px] text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmPasswordReset}
                disabled={isResettingPassword || newPassword.length < 6}
                className="flex-1 py-2.5 min-h-[42px] text-xs font-bold rounded-xl bg-brand-600 hover:bg-brand-500 text-white transition disabled:opacity-50"
              >
                {isResettingPassword ? 'Updating...' : 'Set Password'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
