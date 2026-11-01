import React, { useState, useRef, useEffect } from 'react';
import {
  Reply,
  Copy,
  Trash2,
  Check,
  Smile,
  PhoneCall,
  Video,
  Play,
  Pause,
  FileText,
  Download,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Message, MediaAttachment } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { StatusTick } from '../common/StatusTick';
import { ViewOnceModal } from './ViewOnceModal';
import { resolveMediaUrl } from '../../api/client';

interface MessageBubbleProps {
  message: Message;
  onReply: (message: Message) => void;
  onImageClick: (url: string, name?: string) => void;
}

const QUICK_EMOJIS = ['❤️', '👍', '😂', '🔥', '😮', '😢'];

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  onReply,
  onImageClick,
}) => {
  const { user } = useAuth();
  const { sendReaction, deleteMessage, openViewOnceMedia } = useChat();

  const [showActions, setShowActions] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [showDeleteMenu, setShowDeleteMenu] = useState(false);

  // Audio voice note playback state
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // View-once modal state
  const [isViewOnceOpen, setIsViewOnceOpen] = useState(false);
  const [viewOnceMedia, setViewOnceMedia] = useState<MediaAttachment | null>(null);

  const senderId = (message.sender as any)?._id || (message.sender as any);
  const isMe = senderId === user?._id;

  // Format timestamp (hh:mm a)
  const formatTime = (dateStr: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleCopy = () => {
    if (message.content) {
      navigator.clipboard.writeText(message.content);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const handleReact = (emoji: string) => {
    sendReaction(message._id, emoji);
    setShowEmojiPicker(false);
  };

  // Group reactions by emoji
  const groupedReactions = message.reactions?.reduce((acc: Record<string, number>, r) => {
    acc[r.emoji] = (acc[r.emoji] || 0) + 1;
    return acc;
  }, {}) || {};

  // Check if current user reacted with a particular emoji
  const hasMyReaction = (emoji: string) => {
    return message.reactions?.some(
      (r) => {
        const reactionUserId = (r.user as any)?._id || (r.user as any);
        return reactionUserId === user?._id && r.emoji === emoji;
      }
    );
  };

  // Call log message
  if (message.messageType === 'call_log') {
    return (
      <div className="flex justify-center my-3 animate-fade-in">
        <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs shadow-sm">
          <PhoneCall className="w-3.5 h-3.5 text-brand-500" />
          <span>{message.content}</span>
          <span className="text-[10px] text-slate-400">· {formatTime(message.createdAt)}</span>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={() => setShowActions((prev) => !prev)}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => {
        setShowActions(false);
        setShowEmojiPicker(false);
        setShowDeleteMenu(false);
      }}
      className={`relative group flex flex-col my-1.5 ${isMe ? 'items-end' : 'items-start'} animate-fade-in`}
    >
      {/* Floating Action Menu on Hover / Tap */}
      {showActions && !message.isDeletedForEveryone && (
        <div
          onClick={(e) => e.stopPropagation()}
          className={`absolute -top-7 ${
            isMe ? 'right-2' : 'left-2'
          } z-20 flex items-center space-x-1 px-1.5 py-1 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-md backdrop-blur-md animate-fade-in`}
        >
          {/* Quick Reaction picker */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="p-1 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition min-w-[28px] min-h-[28px] flex items-center justify-center"
              title="React"
            >
              <Smile className="w-3.5 h-3.5" />
            </button>

            {showEmojiPicker && (
              <div className="absolute bottom-full mb-1 left-0 flex items-center space-x-1 p-1 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl z-30 animate-fade-in">
                {QUICK_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => handleReact(emoji)}
                    className="p-1 hover:scale-125 transition text-sm min-w-[26px] min-h-[26px] flex items-center justify-center"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Reply */}
          <button
            type="button"
            onClick={() => onReply(message)}
            className="p-1 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition min-w-[28px] min-h-[28px] flex items-center justify-center"
            title="Reply"
          >
            <Reply className="w-3.5 h-3.5" />
          </button>

          {/* Copy */}
          {message.content && (
            <button
              type="button"
              onClick={handleCopy}
              className="p-1 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition min-w-[28px] min-h-[28px] flex items-center justify-center"
              title="Copy"
            >
              {isCopied ? (
                <Check className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          )}

          {/* Delete Menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowDeleteMenu(!showDeleteMenu)}
              className="p-1 text-slate-500 hover:text-rose-500 dark:text-slate-400 dark:hover:text-rose-400 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition min-w-[28px] min-h-[28px] flex items-center justify-center"
              title="Delete"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>

            {showDeleteMenu && (
              <div className="absolute right-0 bottom-full mb-1 w-36 py-1 rounded-xl glass-dropdown z-30 text-xs shadow-xl animate-fade-in">
                <button
                  type="button"
                  onClick={() => {
                    deleteMessage(message._id, 'for_me');
                    setShowDeleteMenu(false);
                  }}
                  className="w-full px-3 py-1.5 text-left text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  Delete for me
                </button>
                {isMe && (
                  <button
                    type="button"
                    onClick={() => {
                      deleteMessage(message._id, 'for_everyone');
                      setShowDeleteMenu(false);
                    }}
                    className="w-full px-3 py-1.5 text-left text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                  >
                    Delete for everyone
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Message Bubble Body */}
      <div
        className={`max-w-[88%] xs:max-w-[85%] sm:max-w-[70%] md:max-w-[65%] rounded-2xl p-2.5 sm:p-3 shadow-sm select-text ${
          isMe
            ? 'bg-gradient-to-tr from-brand-600 to-indigo-600 text-white rounded-tr-xs'
            : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200/80 dark:border-slate-700/80 rounded-tl-xs'
        }`}
      >
        {/* Sender name in Group Chat */}
        {message.isGroup && !isMe && (
          <p className="text-[11px] font-bold text-brand-600 dark:text-brand-400 mb-1 flex items-center space-x-1">
            <span>{message.sender?.displayName || 'Group Member'}</span>
            <span className="text-[9px] font-mono opacity-70">({message.sender?.chatId})</span>
          </p>
        )}

        {/* Reply snippet if message is a reply */}
        {message.replyTo && (
          <div
            className={`mb-2 p-2 rounded-lg text-xs border-l-3 ${
              isMe
                ? 'bg-black/15 border-white/60 text-white/90'
                : 'bg-slate-100 dark:bg-slate-900/60 border-brand-500 text-slate-600 dark:text-slate-300'
            }`}
          >
            <p className="font-semibold text-[11px] opacity-90 truncate">
              {message.replyTo.senderName}
            </p>
            <p className="truncate opacity-80 mt-0.5">{message.replyTo.snippet}</p>
          </div>
        )}

        {/* 1. View Once Media */}
        {message.isViewOnce ? (
          (() => {
            const hasViewed = Boolean(
              message.viewedBy?.some((v) => {
                const vid = typeof v.user === 'string' ? v.user : (v.user as any)?._id;
                return vid === user?._id;
              })
            );

            if (hasViewed) {
              return (
                <div className="flex items-center space-x-2 py-1.5 px-3 rounded-xl bg-black/15 dark:bg-black/30 border border-white/10 my-1">
                  <span className="w-5 h-5 rounded-full border border-slate-400 flex items-center justify-center text-[10px] font-black text-slate-400">
                    1
                  </span>
                  <span className="text-xs font-semibold italic opacity-75">
                    Opened
                  </span>
                </div>
              );
            }

            if (isMe) {
              const openedByCount = message.viewedBy?.length || 0;
              return (
                <div className="flex items-center space-x-2 py-1.5 px-3 rounded-xl bg-black/15 dark:bg-black/30 border border-white/10 my-1">
                  <span className="w-5 h-5 rounded-full border border-amber-400 text-amber-300 flex items-center justify-center text-[10px] font-black">
                    1
                  </span>
                  <span className="text-xs font-semibold">
                    {openedByCount > 0 ? 'Opened by recipient' : '1 Photo (View Once)'}
                  </span>
                </div>
              );
            }

            // Recipient can tap to view once
            return (
              <button
                type="button"
                onClick={async () => {
                  const media = await openViewOnceMedia(message._id);
                  if (media) {
                    setViewOnceMedia(media);
                    setIsViewOnceOpen(true);
                  }
                }}
                className="flex items-center space-x-2 py-2 px-3.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-bold text-xs transition my-1 cursor-pointer"
              >
                <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center text-[10px] font-black">
                  1
                </span>
                <span>{message.messageType === 'video' ? 'Video' : 'Photo'} • Tap to view once</span>
              </button>
            );
          })()
        ) : (
          <>
            {/* 2. Regular Image Attachment */}
            {message.messageType === 'image' && message.media?.url && (
              <div className="mb-1.5 overflow-hidden rounded-xl cursor-pointer">
                <img
                  src={resolveMediaUrl(message.media.thumbnailUrl || message.media.url)}
                  alt={message.media.fileName || 'Attached image'}
                  onClick={() => onImageClick(resolveMediaUrl(message.media!.url), message.media?.fileName)}
                  className="max-h-80 w-auto rounded-xl object-cover hover:opacity-95 transition"
                  loading="lazy"
                />
              </div>
            )}

            {/* 3. Regular Video Attachment */}
            {message.messageType === 'video' && message.media?.url && (
              <div className="mb-1.5 overflow-hidden rounded-xl bg-black">
                <video
                  src={resolveMediaUrl(message.media.url)}
                  controls
                  playsInline
                  controlsList="nodownload"
                  className="max-h-72 w-full object-contain rounded-xl"
                />
              </div>
            )}

            {/* 4. Voice Note Audio Message */}
            {message.messageType === 'audio' && message.media?.url && (
              <div className="flex items-center space-x-2 sm:space-x-3 py-1 px-0.5 sm:px-1 min-w-[160px] xs:min-w-[190px] sm:min-w-[240px] max-w-full">
                <button
                  type="button"
                  onClick={() => {
                    if (!audioRef.current) {
                      audioRef.current = new Audio(resolveMediaUrl(message.media!.url));
                      audioRef.current.ontimeupdate = () => {
                        if (audioRef.current && audioRef.current.duration) {
                          setAudioProgress(
                            (audioRef.current.currentTime / audioRef.current.duration) * 100
                          );
                        }
                      };
                      audioRef.current.onended = () => {
                        setIsPlayingAudio(false);
                        setAudioProgress(0);
                      };
                    }

                    if (isPlayingAudio) {
                      audioRef.current.pause();
                      setIsPlayingAudio(false);
                    } else {
                      audioRef.current.play();
                      setIsPlayingAudio(true);
                    }
                  }}
                  className={`p-2.5 rounded-full text-white shadow-md transition cursor-pointer ${
                    isMe ? 'bg-white/20 hover:bg-white/30' : 'bg-brand-600 hover:bg-brand-700'
                  }`}
                >
                  {isPlayingAudio ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                </button>
                <div className="flex-1">
                  <div className="w-full bg-black/20 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-brand-400 h-1.5 rounded-full transition-all duration-150"
                      style={{ width: `${audioProgress}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] opacity-75 mt-1 font-mono">
                    <span>Voice Note</span>
                    <span>
                      {message.media?.duration
                        ? `${Math.floor(message.media.duration / 60)}:${(message.media.duration % 60).toString().padStart(2, '0')}`
                        : 'Audio'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* 5. Document / File Attachment */}
            {message.messageType === 'document' && message.media?.url && (
              <div className="flex items-center space-x-3 p-2.5 rounded-xl bg-black/10 dark:bg-black/30 border border-white/10 mb-1.5">
                <div className="p-2 rounded-lg bg-brand-500/20 text-brand-400">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0 pr-2">
                  <p className="text-xs font-bold truncate">
                    {message.media.fileName || 'Attached Document'}
                  </p>
                  <p className="text-[10px] opacity-70 font-mono">
                    {message.media.fileSize
                      ? message.media.fileSize > 1024 * 1024
                        ? `${(message.media.fileSize / (1024 * 1024)).toFixed(1)} MB`
                        : `${(message.media.fileSize / 1024).toFixed(0)} KB`
                      : 'File'}
                  </p>
                </div>
                <a
                  href={resolveMediaUrl(message.media.url)}
                  download={message.media.fileName || 'document'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition"
                  title="Download file"
                >
                  <Download className="w-4 h-4" />
                </a>
              </div>
            )}
          </>
        )}

        {/* Text Content */}
        {message.isDeletedForEveryone ? (
          <p className="text-xs italic opacity-60 flex items-center space-x-1">
            <span>This message was deleted</span>
          </p>
        ) : (
          message.content && (
            <p className="text-sm whitespace-pre-wrap break-words [overflow-wrap:anywhere] leading-relaxed">
              {message.content}
            </p>
          )
        )}

        {/* Footer: Time & Status ticks */}
        <div
          className={`flex items-center justify-end space-x-1 mt-1 text-[10px] ${
            isMe ? 'text-white/70' : 'text-slate-400'
          }`}
        >
          <span>{formatTime(message.createdAt)}</span>
          {isMe && <StatusTick status={message.status} />}
        </div>
      </div>

      {/* View-Once viewer modal */}
      <ViewOnceModal
        isOpen={isViewOnceOpen}
        media={viewOnceMedia}
        messageType={message.messageType === 'video' ? 'video' : 'image'}
        onClose={() => {
          setIsViewOnceOpen(false);
          setViewOnceMedia(null);
        }}
      />

      {/* Emoji Reactions row */}
      {Object.keys(groupedReactions).length > 0 && (
        <div
          className={`flex items-center flex-wrap gap-1 mt-0.5 ${
            isMe ? 'justify-end mr-1' : 'justify-start ml-1'
          }`}
        >
          {Object.entries(groupedReactions).map(([emoji, count]) => {
            const isMine = hasMyReaction(emoji);
            return (
              <button
                key={emoji}
                type="button"
                onClick={() => handleReact(emoji)}
                className={`inline-flex items-center space-x-1 px-1.5 py-0.5 rounded-full text-xs shadow-xs transition ${
                  isMine
                    ? 'bg-brand-100 dark:bg-brand-950/80 text-brand-700 dark:text-brand-300 border border-brand-300 dark:border-brand-700'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                }`}
              >
                <span>{emoji}</span>
                {count > 1 && <span className="text-[10px] font-semibold">{count}</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
