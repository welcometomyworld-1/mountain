import React, { useState, useEffect } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider, useSocket } from './context/SocketContext';
import { ChatProvider, useChat } from './context/ChatContext';
import { CallProvider } from './context/CallContext';
import { AuthPage } from './components/auth/AuthPage';
import { Sidebar } from './components/chat/Sidebar';
import { ChatArea } from './components/chat/ChatArea';
import { IncomingCallModal } from './components/call/IncomingCallModal';
import { VideoCallRoom } from './components/call/VideoCallRoom';
import { NotificationToast } from './components/common/NotificationToast';
import { Shield, Bell, X, AlertTriangle } from 'lucide-react';
import { SystemAnnouncement } from './types';

const MainLayout: React.FC = () => {
  const { isAuthenticated, isLoading, logout } = useAuth();
  const {
    activeConversation,
    activeGroup,
    selectConversation,
    selectGroup,
    inAppNotification,
    dismissInAppNotification,
  } = useChat();
  const { socket } = useSocket();

  // On mobile, whether we are viewing a conversation screen or the sidebar list
  const [isMobileChatOpen, setIsMobileChatOpen] = useState(Boolean(activeConversation || activeGroup));
  const [activeAnnouncement, setActiveAnnouncement] = useState<SystemAnnouncement | null>(null);

  // Sync state whenever an active chat or group changes
  useEffect(() => {
    if (activeConversation || activeGroup) {
      setIsMobileChatOpen(true);
    }
  }, [activeConversation, activeGroup]);

  // Listen for admin real-time broadcasts and security events
  useEffect(() => {
    if (!socket) return;

    const handleBroadcast = (announcement: SystemAnnouncement) => {
      setActiveAnnouncement(announcement);
    };

    const handleBanned = (data: { message?: string }) => {
      alert(data?.message || 'Your account has been suspended by an administrator.');
      logout();
    };

    const handleDeleted = () => {
      alert('Your account has been deleted by an administrator.');
      logout();
    };

    socket.on('system_broadcast', handleBroadcast);
    socket.on('account_banned', handleBanned);
    socket.on('account_deleted', handleDeleted);

    return () => {
      socket.off('system_broadcast', handleBroadcast);
      socket.off('account_banned', handleBanned);
      socket.off('account_deleted', handleDeleted);
    };
  }, [socket, logout]);

  // Handle mobile back button
  const handleBackToSidebar = () => {
    setIsMobileChatOpen(false);
    selectConversation(null as any);
    selectGroup(null as any);
  };

  if (isLoading) {
    return (
      <div className="h-[100dvh] w-full flex flex-col items-center justify-center bg-slate-950 text-white select-none">
        <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl overflow-hidden shadow-2xl shadow-amber-500/20 animate-pulse ring-2 ring-amber-400/50 bg-white p-2 flex items-center justify-center">
          <img src="/logo.jpg" alt="TailorWala" className="w-full h-full object-contain" />
        </div>
        <p className="mt-4 text-xs tracking-wider text-amber-400 uppercase font-mono font-semibold">
          Loading TailorWala...
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthPage />;
  }

  return (
    <div className="h-[100dvh] w-full max-w-[100vw] overflow-hidden flex flex-col bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans">
      {/* Real-time System Announcement Banner */}
      {activeAnnouncement && (
        <div
          className={`flex-shrink-0 px-4 py-2.5 flex items-center justify-between text-xs z-30 shadow-md animate-slide-down ${
            activeAnnouncement.type === 'urgent'
              ? 'bg-rose-600 text-white'
              : activeAnnouncement.type === 'warning'
              ? 'bg-amber-600 text-white'
              : activeAnnouncement.type === 'success'
              ? 'bg-emerald-600 text-white'
              : 'bg-brand-600 text-white'
          }`}
        >
          <div className="flex items-center space-x-2.5 min-w-0 pr-2">
            <Bell className="w-4 h-4 flex-shrink-0 animate-bounce" />
            <div className="min-w-0">
              <span className="font-bold mr-1.5 underline underline-offset-2">
                {activeAnnouncement.title || 'Platform Announcement'}:
              </span>
              <span className="opacity-95">{activeAnnouncement.message}</span>
            </div>
          </div>
          <button
            onClick={() => setActiveAnnouncement(null)}
            className="p-1 rounded-lg hover:bg-black/20 text-white/90 hover:text-white transition flex-shrink-0"
            title="Dismiss Announcement"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="flex-1 flex w-full h-full overflow-hidden relative">
        {/* Sidebar: Visible on desktop, or on mobile when chat is closed */}
        <div
          className={`${
            isMobileChatOpen ? 'hidden md:flex' : 'flex'
          } w-full md:w-80 lg:w-96 h-full flex-shrink-0 z-10`}
        >
          <Sidebar
            onSelectMobileChat={() => {
              setIsMobileChatOpen(true);
            }}
          />
        </div>

        {/* Chat Area: Visible on desktop, or on mobile when chat is open */}
        <div
          className={`${
            isMobileChatOpen ? 'flex' : 'hidden md:flex'
          } flex-1 w-full h-full overflow-hidden`}
        >
          <ChatArea onBackClick={handleBackToSidebar} />
        </div>
      </div>

      {/* Global Call & Notification Overlays */}
      <NotificationToast notification={inAppNotification} onClose={dismissInAppNotification} />
      <IncomingCallModal />
      <VideoCallRoom />
    </div>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SocketProvider>
          <ChatProvider>
            <CallProvider>
              <MainLayout />
            </CallProvider>
          </ChatProvider>
        </SocketProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
