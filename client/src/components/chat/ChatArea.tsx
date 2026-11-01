import React, { useState, useRef, useEffect } from 'react';
import { Shield, MessageSquare, UserPlus, Lock } from 'lucide-react';
import { useChat } from '../../context/ChatContext';
import { ChatHeader } from './ChatHeader';
import { MessageBubble } from './MessageBubble';
import { MessageInput } from './MessageInput';
import { LightboxModal } from './LightboxModal';
import { AddContactModal } from './AddContactModal';
import { Message, ReplyPreview } from '../../types';

interface ChatAreaProps {
  onBackClick?: () => void;
}

export const ChatArea: React.FC<ChatAreaProps> = ({ onBackClick }) => {
  const {
    activeConversation,
    activeGroup,
    messages,
    isLoadingMessages,
    isSearching,
    searchResults,
    searchQuery,
  } = useChat();

  const [replyingTo, setReplyingTo] = useState<ReplyPreview | null>(null);
  const [lightboxData, setLightboxData] = useState<{ url: string; name?: string } | null>(null);
  const [isAddContactOpen, setIsAddContactOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom on new message
  useEffect(() => {
    if (!isSearching) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isSearching]);

  const handleReply = (message: Message) => {
    const senderName = message.sender.displayName;
    const snippet =
      message.messageType === 'image'
        ? '📷 Photo'
        : message.messageType === 'video'
        ? '🎥 Video'
        : message.messageType === 'audio'
        ? '🎤 Voice Message'
        : message.messageType === 'document'
        ? '📄 Document'
        : message.content || 'Message';

    setReplyingTo({
      messageId: message._id,
      senderName,
      snippet,
      messageType: message.messageType,
    });
  };

  const handleImageClick = (url: string, name?: string) => {
    setLightboxData({ url, name });
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  if (!activeConversation && !activeGroup) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-slate-50/50 dark:bg-slate-950 text-center select-none">
        <div className="max-w-md space-y-5 animate-fade-in">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-brand-600/20 to-indigo-600/20 text-brand-600 dark:text-brand-400 flex items-center justify-center ring-1 ring-brand-500/30 shadow-xl">
            <Shield className="w-10 h-10" />
          </div>

          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white font-display">
            Private, ID-Based Communication
          </h2>

          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            Select an existing conversation or group from the sidebar, or enter a private Chat ID to initiate end-to-end messaging, voice messages, file sharing, and calls.
          </p>

          <div className="pt-2">
            <button
              type="button"
              onClick={() => setIsAddContactOpen(true)}
              className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm shadow-lg shadow-brand-500/25 transition"
            >
              <UserPlus className="w-4 h-4" />
              <span>Start Chat with Chat ID</span>
            </button>
          </div>

          <div className="pt-6 flex items-center justify-center space-x-2 text-xs text-slate-400">
            <Lock className="w-3.5 h-3.5 text-emerald-500" />
            <span>End-to-end encrypted signals & private identities</span>
          </div>
        </div>

        <AddContactModal
          isOpen={isAddContactOpen}
          onClose={() => setIsAddContactOpen(false)}
        />
      </div>
    );
  }

  const displayedMessages = isSearching ? searchResults : messages;

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="flex-1 flex flex-col h-full bg-slate-50/40 dark:bg-slate-950 relative overflow-hidden"
    >
      {/* Header */}
      <ChatHeader onBackClick={onBackClick} />

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto px-2.5 sm:px-4 py-3 sm:py-4 space-y-1.5 overscroll-contain">
        {isLoadingMessages ? (
          <div className="p-8 text-center text-xs text-slate-400">
            Loading conversation...
          </div>
        ) : isSearching && displayedMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2 select-none">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              No matching messages found
            </p>
            <p className="text-xs text-slate-400 max-w-xs">
              Try a different keyword or attachment filter.
            </p>
          </div>
        ) : displayedMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2 select-none">
            <div className="w-12 h-12 rounded-full bg-brand-50 dark:bg-brand-950/40 text-brand-500 flex items-center justify-center">
              <MessageSquare className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              No messages here yet
            </p>
            <p className="text-xs text-slate-400 max-w-xs">
              Say hello to start the conversation! All messages, photos, videos, voice notes, and documents are private.
            </p>
          </div>
        ) : (
          displayedMessages.map((message) => (
            <MessageBubble
              key={message._id}
              message={message}
              onReply={handleReply}
              onImageClick={handleImageClick}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Composer */}
      <MessageInput
        replyingTo={replyingTo}
        onCancelReply={() => setReplyingTo(null)}
      />

      {/* Lightbox Modal */}
      <LightboxModal
        isOpen={Boolean(lightboxData)}
        imageUrl={lightboxData?.url || ''}
        fileName={lightboxData?.name}
        onClose={() => setLightboxData(null)}
      />
    </div>
  );
};
