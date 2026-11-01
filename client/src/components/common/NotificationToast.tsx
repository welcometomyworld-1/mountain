import React from 'react';
import { MessageSquare, X } from 'lucide-react';
import { Avatar } from './Avatar';

export interface InAppNotification {
  id: string;
  title: string;
  body: string;
  avatar?: string;
  conversationId?: string;
  groupId?: string;
  onOpen?: () => void;
}

interface NotificationToastProps {
  notification: InAppNotification | null;
  onClose: () => void;
}

export const NotificationToast: React.FC<NotificationToastProps> = ({ notification, onClose }) => {
  if (!notification) return null;

  return (
    <div className="fixed top-3 left-3 right-3 sm:left-auto sm:right-6 sm:w-96 z-50 animate-slide-down pointer-events-auto">
      <div
        onClick={() => {
          if (notification.onOpen) notification.onOpen();
          onClose();
        }}
        className="cursor-pointer flex items-center justify-between p-3.5 rounded-2xl bg-slate-900/95 backdrop-blur-xl border border-amber-500/30 shadow-2xl shadow-black/50 hover:bg-slate-800 transition group ring-1 ring-white/10"
      >
        <div className="flex items-center space-x-3 min-w-0 flex-1 mr-2">
          <div className="relative flex-shrink-0">
            <Avatar name={notification.title} src={notification.avatar} size="md" />
            <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center text-slate-900 text-[10px] ring-2 ring-slate-900 font-bold">
              <MessageSquare className="w-2.5 h-2.5" />
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-white truncate group-hover:text-amber-400 transition">
                {notification.title}
              </h4>
              <span className="text-[10px] text-amber-400 font-mono font-semibold ml-2">Just now</span>
            </div>
            <p className="text-xs text-slate-300 truncate mt-0.5 leading-snug">
              {notification.body}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition flex-shrink-0"
          title="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
