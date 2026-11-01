import React from 'react';
import { createPortal } from 'react-dom';
import { X, Download } from 'lucide-react';
import { resolveMediaUrl } from '../../api/client';

interface LightboxModalProps {
  isOpen: boolean;
  imageUrl: string;
  fileName?: string;
  onClose: () => void;
}

export const LightboxModal: React.FC<LightboxModalProps> = ({
  isOpen,
  imageUrl,
  fileName = 'image.png',
  onClose,
}) => {
  if (!isOpen || !imageUrl || typeof document === 'undefined') return null;

  const resolvedUrl = resolveMediaUrl(imageUrl);

  const handleDownload = async () => {
    try {
      const response = await fetch(resolvedUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch {
      window.open(imageUrl, '_blank');
    }
  };

  return createPortal(
    <div
      onClick={onClose}
      className="fixed inset-0 z-[99999] flex items-center justify-center p-2 sm:p-4 bg-black/90 backdrop-blur-md animate-fade-in select-none pt-safe pb-safe pl-safe pr-safe"
    >
      {/* Top action bar */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="absolute top-3 right-3 sm:top-4 sm:right-4 pt-safe pr-safe flex items-center space-x-2 z-50"
      >
        <button
          onClick={handleDownload}
          title="Download Image"
          className="p-2.5 min-w-[42px] min-h-[42px] flex items-center justify-center rounded-full bg-slate-800/80 hover:bg-slate-700 text-white backdrop-blur-md transition shadow-lg cursor-pointer"
          aria-label="Download image"
        >
          <Download className="w-5 h-5" />
        </button>
        <button
          onClick={onClose}
          title="Close"
          className="p-2.5 min-w-[42px] min-h-[42px] flex items-center justify-center rounded-full bg-slate-800/80 hover:bg-slate-700 text-white backdrop-blur-md transition shadow-lg cursor-pointer"
          aria-label="Close lightbox"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div
        onClick={(e) => e.stopPropagation()}
        className="relative max-w-4xl max-h-[88dvh] flex items-center justify-center p-2"
      >
        <img
          src={resolvedUrl}
          alt={fileName}
          className="max-w-full max-h-[88dvh] object-contain rounded-lg shadow-2xl ring-1 ring-white/10"
        />
      </div>
    </div>,
    document.body
  );
};
