import React from 'react';

interface EmojiPickerPopoverProps {
  isOpen: boolean;
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

const EMOJI_CATEGORIES = [
  {
    name: 'Smileys',
    emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😋', '😜', '🤪', '😎', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '🥺', '😢', '😭', '😤', '😠', '😡', '🤯', '😳', '🥵', '🥶', '😱', '😨', '🤫', '🤔'],
  },
  {
    name: 'Gestures',
    emojis: ['👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '👇', '✋', '🤚', '🖐️', '🖖', '👋', '🤝', '🙌', '👏', '🙏', '💪', '🧠', '👀', '👁️'],
  },
  {
    name: 'Hearts & Vibes',
    emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '✨', '🔥', '🌟', '⭐', '⚡', '🎉', '🎊'],
  },
  {
    name: 'Objects & Activities',
    emojis: ['☕', '🍕', '🍔', '🍟', '🍿', '🎮', '🎧', '🎸', '📱', '💻', '📷', '🎬', '✈️', '🚀', '🚗', '💡', '🔔', '🎁', '🏆', '💯', '✔️', '❌'],
  },
];

export const EmojiPickerPopover: React.FC<EmojiPickerPopoverProps> = ({
  isOpen,
  onSelect,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-30" onClick={onClose} />
      <div className="absolute bottom-full mb-2 left-[-8px] sm:left-0 max-w-[calc(100vw-20px)] w-72 sm:w-80 h-64 sm:h-72 rounded-2xl glass-dropdown z-40 flex flex-col overflow-hidden shadow-2xl animate-fade-in border border-slate-200 dark:border-slate-700">
        <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center justify-between">
          <span>Emojis</span>
          <span className="text-[10px] text-slate-400">Tap to insert</span>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-3">
          {EMOJI_CATEGORIES.map((category) => (
            <div key={category.name}>
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1 px-1">
                {category.name}
              </div>
              <div className="grid grid-cols-7 sm:grid-cols-8 gap-1">
                {category.emojis.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => onSelect(emoji)}
                    className="p-1 sm:p-1.5 text-base hover:bg-slate-100 dark:hover:bg-slate-700/60 rounded-lg hover:scale-110 transition flex items-center justify-center select-none min-w-[32px] min-h-[32px]"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};
