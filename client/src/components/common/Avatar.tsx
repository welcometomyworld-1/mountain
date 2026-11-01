import React from 'react';
import { resolveMediaUrl } from '../../api/client';

interface AvatarProps {
  name?: string;
  src?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  isOnline?: boolean;
  showOnlineBadge?: boolean;
  className?: string;
}

const sizeClasses = {
  xs: 'w-7 h-7 text-xs',
  sm: 'w-9 h-9 text-xs',
  md: 'w-11 h-11 text-sm',
  lg: 'w-14 h-14 text-base',
  xl: 'w-20 h-20 text-xl font-bold',
};

const badgeSizes = {
  xs: 'w-2 h-2 bottom-0 right-0',
  sm: 'w-2.5 h-2.5 bottom-0 right-0',
  md: 'w-3 h-3 bottom-0.5 right-0.5',
  lg: 'w-3.5 h-3.5 bottom-0.5 right-0.5',
  xl: 'w-4 h-4 bottom-1 right-1',
};

// Generates consistent smooth pastel gradients from user's name
const getGradientFromName = (name: string = '') => {
  const gradients = [
    'from-indigo-500 to-purple-600',
    'from-violet-500 to-fuchsia-600',
    'from-blue-500 to-cyan-500',
    'from-emerald-500 to-teal-600',
    'from-rose-500 to-pink-600',
    'from-amber-500 to-orange-600',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % gradients.length;
  return gradients[index];
};

export const Avatar: React.FC<AvatarProps> = ({
  name = '?',
  src,
  size = 'md',
  isOnline = false,
  showOnlineBadge = false,
  className = '',
}) => {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || '?';

  const gradient = getGradientFromName(name);

  return (
    <div className={`relative inline-flex flex-shrink-0 select-none ${className}`}>
      {src ? (
        <img
          src={resolveMediaUrl(src)}
          alt={name}
          className={`${sizeClasses[size]} rounded-full object-cover shadow-sm ring-1 ring-white/10`}
        />
      ) : (
        <div
          className={`${sizeClasses[size]} rounded-full bg-gradient-to-br ${gradient} text-white flex items-center justify-center font-medium shadow-sm ring-1 ring-white/10`}
        >
          {initials}
        </div>
      )}

      {showOnlineBadge && (
        <span
          className={`absolute rounded-full border-2 border-white dark:border-slate-900 ${badgeSizes[size]} ${
            isOnline ? 'bg-emerald-500' : 'bg-slate-400 dark:bg-slate-500'
          }`}
          title={isOnline ? 'Online' : 'Offline'}
        />
      )}
    </div>
  );
};
