import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, EyeOff, ShieldAlert } from 'lucide-react';
import { MediaAttachment } from '../../types';
import { resolveMediaUrl } from '../../api/client';

interface ViewOnceModalProps {
  isOpen: boolean;
  media: MediaAttachment | null;
  messageType: 'image' | 'video';
  onClose: () => void;
}

export const ViewOnceModal: React.FC<ViewOnceModalProps> = ({
  isOpen,
  media,
  messageType,
  onClose,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !media || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[100000] flex flex-col items-center justify-center bg-black/95 backdrop-blur-xl animate-fade-in select-none">
      {/* Top Bar */}
      <div className="w-full flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 pt-safe bg-slate-900/80 border-b border-slate-800 z-10 flex-shrink-0">
        <div className="flex items-center space-x-2.5 min-w-0 pr-2">
          <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center font-black text-xs shadow-md flex-shrink-0">
            1
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-white flex items-center space-x-1.5 truncate">
              <span>View-Once {messageType === 'video' ? 'Video' : 'Photo'}</span>
            </h3>
            <p className="text-[11px] text-amber-400/90 font-medium flex items-center space-x-1 truncate">
              <EyeOff className="w-3 h-3 inline mr-1 flex-shrink-0" />
              <span className="truncate">Media disappears after closing</span>
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-2 min-w-[40px] min-h-[40px] flex items-center justify-center text-slate-400 hover:text-white rounded-full bg-slate-800 hover:bg-slate-700 transition flex-shrink-0"
          title="Close (will mark as opened)"
          aria-label="Close viewer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Media Content */}
      <div className="flex-1 w-full max-w-4xl p-2.5 sm:p-4 flex items-center justify-center overflow-hidden">
        {messageType === 'video' ? (
          <video
            src={resolveMediaUrl(media.url)}
            controls
            autoPlay
            playsInline
            controlsList="nodownload"
            className="max-h-[72dvh] sm:max-h-[78dvh] w-auto max-w-full rounded-2xl shadow-2xl ring-1 ring-white/10"
          />
        ) : (
          <img
            src={resolveMediaUrl(media.url)}
            alt="View-Once"
            className="max-h-[72dvh] sm:max-h-[78dvh] w-auto max-w-full object-contain rounded-2xl shadow-2xl ring-1 ring-white/10"
          />
        )}
      </div>

      {/* Footer hint */}
      <div className="w-full py-3 pb-safe text-center bg-slate-950/80 border-t border-slate-900 text-xs text-slate-500 flex-shrink-0">
        PrivateID Protected Media · View Once
      </div>
    </div>,
    document.body
  );
};
