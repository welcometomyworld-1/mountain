import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Send, Image as ImageIcon, Loader2 } from 'lucide-react';

interface ImagePreviewModalProps {
  isOpen: boolean;
  file: File | null;
  onSend: (file: File, caption: string, isViewOnce: boolean) => Promise<void>;
  onClose: () => void;
}

export const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({
  isOpen,
  file,
  onSend,
  onClose,
}) => {
  const [caption, setCaption] = useState('');
  const [isViewOnce, setIsViewOnce] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  if (!isOpen || !file || typeof document === 'undefined') return null;

  const previewUrl = URL.createObjectURL(file);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isUploading) return;

    setIsUploading(true);
    try {
      await onSend(file, caption.trim(), isViewOnce);
      onClose();
      setCaption('');
      setIsViewOnce(false);
    } catch (err: any) {
      alert(err.message || 'Failed to send image');
    } finally {
      setIsUploading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Render via React Portal to document.body so CSS containing blocks in parents NEVER push it down
  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-2.5 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in select-none pt-safe pb-safe">
      <div className="relative w-full max-w-md max-h-[90dvh] flex flex-col rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl shadow-black/80 overflow-hidden my-auto">
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between px-4 sm:px-5 py-3 sm:py-3.5 border-b border-slate-800 bg-slate-900/90 backdrop-blur-sm z-10">
          <div className="flex items-center space-x-2.5 min-w-0 pr-2">
            <div className="p-1.5 rounded-lg bg-brand-500/20 text-brand-400">
              <ImageIcon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-xs sm:text-sm font-bold text-white truncate max-w-[200px] sm:max-w-[220px]">
                {file.name}
              </h3>
              <p className="text-[10px] text-slate-400 font-mono">
                {formatFileSize(file.size)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isUploading}
            className="p-1.5 min-w-[36px] min-h-[36px] flex items-center justify-center text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Image Preview Box - Strictly constrained so it never pushes the form off-screen */}
        <div className="flex-1 min-h-0 bg-slate-950 flex items-center justify-center p-2.5 sm:p-4 overflow-hidden">
          <img
            src={previewUrl}
            alt="Preview"
            className="max-h-[30vh] sm:max-h-[38vh] w-auto max-w-full object-contain rounded-xl shadow-lg ring-1 ring-white/10"
          />
        </div>

        {/* Caption & Send Action Area - 100% Guaranteed Visible */}
        <form
          onSubmit={handleSend}
          className="flex-shrink-0 p-3 sm:p-4 space-y-3 bg-slate-900 border-t border-slate-800 z-10"
        >
          <div className="flex items-center space-x-2">
            <input
              type="text"
              placeholder="Add a caption..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              disabled={isUploading}
              autoFocus
              className="flex-1 px-3.5 py-2.5 text-base sm:text-sm rounded-xl bg-slate-800/90 border border-slate-700 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 transition"
            />

            <button
              type="button"
              onClick={() => setIsViewOnce(!isViewOnce)}
              title={isViewOnce ? 'View once enabled' : 'Set as View Once photo'}
              className={`flex items-center space-x-1.5 px-3 py-2.5 min-h-[42px] rounded-xl text-xs font-bold border transition ${
                isViewOnce
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/60 shadow-sm shadow-amber-500/20'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
              }`}
            >
              <span
                className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-black border ${
                  isViewOnce
                    ? 'border-amber-400 bg-amber-400 text-slate-950'
                    : 'border-slate-400 text-slate-400'
                }`}
              >
                1
              </span>
              <span className="hidden sm:inline">Once</span>
            </button>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={isUploading}
              className="px-4 py-2.5 min-h-[42px] text-xs font-semibold rounded-xl text-slate-300 hover:bg-slate-800 transition"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isUploading}
              className="px-5 sm:px-6 py-2.5 min-h-[42px] flex items-center space-x-2 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white text-xs sm:text-sm font-bold rounded-xl shadow-lg shadow-brand-500/30 transition disabled:opacity-50 cursor-pointer"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Uploading...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Send Photo</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
