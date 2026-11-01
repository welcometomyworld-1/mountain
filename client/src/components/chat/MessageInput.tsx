import React, { useState, useRef } from 'react';
import {
  Send,
  Image as ImageIcon,
  Video as VideoIcon,
  Smile,
  X,
  Paperclip,
  Mic,
} from 'lucide-react';
import { useChat } from '../../context/ChatContext';
import { ReplyPreview } from '../../types';
import { EmojiPickerPopover } from './EmojiPickerPopover';
import { ImagePreviewModal } from './ImagePreviewModal';
import { VideoPreviewModal } from './VideoPreviewModal';
import { VoiceRecorder } from './VoiceRecorder';
import { uploadImageApi, uploadFileApi } from '../../api/upload';

interface MessageInputProps {
  replyingTo: ReplyPreview | null;
  onCancelReply: () => void;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  replyingTo,
  onCancelReply,
}) => {
  const { sendMessage, emitTyping } = useChat();

  const [text, setText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);

  // Image preview state
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [isImagePreviewOpen, setIsImagePreviewOpen] = useState(false);

  // Video preview state
  const [selectedVideo, setSelectedVideo] = useState<File | null>(null);
  const [isVideoPreviewOpen, setIsVideoPreviewOpen] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setText(e.target.value);
    emitTyping(true);
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const content = text.trim();
    if (!content) return;

    setText('');
    emitTyping(false);
    await sendMessage(content, 'text', null, replyingTo);
    onCancelReply();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Image Selection
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      alert('Please select a valid image (JPEG, PNG, WEBP, or GIF).');
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      alert('File size exceeds the 20MB limit.');
      return;
    }

    setSelectedImage(file);
    setIsImagePreviewOpen(true);
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  const handleSendImage = async (file: File, caption: string, isViewOnce: boolean) => {
    const media = await uploadImageApi(file);
    await sendMessage(caption, 'image', media, replyingTo, isViewOnce);
    onCancelReply();
  };

  // Video Selection
  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      alert('Video file size exceeds the 25MB limit.');
      return;
    }

    setSelectedVideo(file);
    setIsVideoPreviewOpen(true);
    if (videoInputRef.current) videoInputRef.current.value = '';
  };

  const handleSendVideo = async (file: File, caption: string, isViewOnce: boolean) => {
    const media = await uploadFileApi(file);
    await sendMessage(caption, 'video', media, replyingTo, isViewOnce);
    onCancelReply();
  };

  // Document Selection
  const handleDocChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      alert('Document size exceeds the 25MB limit.');
      return;
    }

    try {
      const media = await uploadFileApi(file);
      await sendMessage(file.name, 'document', media, replyingTo);
      onCancelReply();
    } catch (err: any) {
      alert(err.message || 'Failed to upload document.');
    } finally {
      if (docInputRef.current) docInputRef.current.value = '';
    }
  };

  // Send Voice Note
  const handleSendVoiceNote = async (media: any, duration: number) => {
    await sendMessage('', 'audio', media, replyingTo);
    setIsRecordingVoice(false);
    onCancelReply();
  };

  const handleSelectEmoji = (emoji: string) => {
    setText((prev) => prev + emoji);
  };

  return (
    <div className="p-2 sm:p-3 md:p-4 bg-white/90 dark:bg-slate-900/90 border-t border-slate-200 dark:border-slate-800 backdrop-blur-md relative select-none pb-safe z-20">
      {/* Replying banner */}
      {replyingTo && (
        <div className="flex items-center justify-between mb-2 px-3 py-1.5 rounded-xl bg-brand-50 dark:bg-brand-950/40 border border-brand-200 dark:border-brand-900/60 text-xs animate-slide-up">
          <div className="min-w-0 flex-1">
            <span className="font-semibold text-brand-600 dark:text-brand-400">
              Replying to {replyingTo.senderName}:
            </span>
            <span className="ml-1.5 text-slate-600 dark:text-slate-300 truncate inline-block max-w-xs align-bottom">
              {replyingTo.snippet}
            </span>
          </div>
          <button
            type="button"
            onClick={onCancelReply}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Hidden file inputs */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleImageChange}
        className="hidden"
      />
      <input
        ref={videoInputRef}
        type="file"
        accept="video/mp4,video/webm,video/quicktime,video/mkv"
        onChange={handleVideoChange}
        className="hidden"
      />
      <input
        ref={docInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.txt,.zip,.rar,.xls,.xlsx"
        onChange={handleDocChange}
        className="hidden"
      />

      {/* Voice Recorder mode */}
      {isRecordingVoice ? (
        <VoiceRecorder
          onSend={handleSendVoiceNote}
          onCancel={() => setIsRecordingVoice(false)}
        />
      ) : (
        /* Regular Input row */
        <form onSubmit={handleSend} className="flex items-center space-x-1 sm:space-x-2">
          {/* Emoji picker */}
          <div className="relative flex-shrink-0">
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              title="Emoji Picker"
              className="p-2 text-slate-500 hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl min-w-[36px] min-h-[36px] flex items-center justify-center transition"
            >
              <Smile className="w-5 h-5" />
            </button>

            <EmojiPickerPopover
              isOpen={showEmojiPicker}
              onSelect={handleSelectEmoji}
              onClose={() => setShowEmojiPicker(false)}
            />
          </div>

          {/* Mobile Attachment Toggle (Paperclip with popup on mobile) */}
          <div className="relative sm:hidden flex-shrink-0">
            <button
              type="button"
              onClick={() => setShowAttachMenu(!showAttachMenu)}
              title="Attach media or file"
              className={`p-2 rounded-xl min-w-[36px] min-h-[36px] flex items-center justify-center transition ${
                showAttachMenu
                  ? 'bg-brand-50 text-brand-600 dark:bg-brand-950/60 dark:text-brand-400'
                  : 'text-slate-500 hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Paperclip className="w-5 h-5" />
            </button>

            {showAttachMenu && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setShowAttachMenu(false)} />
                <div className="absolute bottom-full mb-2 left-0 w-44 p-1.5 rounded-2xl glass-dropdown z-40 shadow-2xl animate-fade-in border border-slate-200 dark:border-slate-700 text-xs font-medium space-y-1">
                  <button
                    type="button"
                    onClick={() => {
                      imageInputRef.current?.click();
                      setShowAttachMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left flex items-center space-x-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
                  >
                    <div className="p-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-500">
                      <ImageIcon className="w-4 h-4" />
                    </div>
                    <span>Photo (View Once)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      videoInputRef.current?.click();
                      setShowAttachMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left flex items-center space-x-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
                  >
                    <div className="p-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-500">
                      <VideoIcon className="w-4 h-4" />
                    </div>
                    <span>Video</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      docInputRef.current?.click();
                      setShowAttachMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left flex items-center space-x-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
                  >
                    <div className="p-1 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-500">
                      <Paperclip className="w-4 h-4" />
                    </div>
                    <span>Document / File</span>
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Desktop inline attachment buttons (on sm: screens and larger) */}
          <div className="hidden sm:flex items-center space-x-1 flex-shrink-0">
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              title="Send Photo (JPG, PNG)"
              className="p-2 text-slate-500 hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
            >
              <ImageIcon className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => videoInputRef.current?.click()}
              title="Send Video (MP4, WEBM)"
              className="p-2 text-slate-500 hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
            >
              <VideoIcon className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => docInputRef.current?.click()}
              title="Share Document / File (PDF, DOCX, ZIP)"
              className="p-2 text-slate-500 hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
            >
              <Paperclip className="w-5 h-5" />
            </button>
          </div>

          {/* Text Input */}
          <input
            type="text"
            placeholder="Type a private message..."
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            className="flex-1 min-w-[70px] py-2 sm:py-2.5 px-3 sm:px-4 rounded-xl text-base sm:text-sm bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 transition"
          />

          {/* Record Voice Note or Send Button */}
          {text.trim() ? (
            <button
              type="submit"
              title="Send"
              className="p-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white shadow-md shadow-brand-500/25 transition cursor-pointer min-w-[40px] min-h-[40px] flex items-center justify-center flex-shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsRecordingVoice(true)}
              title="Record Voice Message"
              className="p-2.5 rounded-xl bg-slate-100 hover:bg-brand-50 dark:bg-slate-800 dark:hover:bg-brand-950/60 text-slate-600 hover:text-brand-600 dark:text-slate-300 dark:hover:text-brand-400 transition min-w-[40px] min-h-[40px] flex items-center justify-center flex-shrink-0"
            >
              <Mic className="w-4 h-4" />
            </button>
          )}
        </form>
      )}

      {/* Image Preview & Caption Modal */}
      <ImagePreviewModal
        isOpen={isImagePreviewOpen}
        file={selectedImage}
        onSend={handleSendImage}
        onClose={() => {
          setIsImagePreviewOpen(false);
          setSelectedImage(null);
        }}
      />

      {/* Video Preview & Caption Modal */}
      <VideoPreviewModal
        isOpen={isVideoPreviewOpen}
        file={selectedVideo}
        onSend={handleSendVideo}
        onClose={() => {
          setIsVideoPreviewOpen(false);
          setSelectedVideo(null);
        }}
      />
    </div>
  );
};

