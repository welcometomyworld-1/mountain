import React from 'react';
import { Check, CheckCheck } from 'lucide-react';

interface StatusTickProps {
  status: 'sent' | 'delivered' | 'read';
  className?: string;
}

export const StatusTick: React.FC<StatusTickProps> = ({ status, className = '' }) => {
  if (status === 'sent') {
    return <Check className={`w-3.5 h-3.5 text-slate-400 dark:text-slate-400 ${className}`} />;
  }

  if (status === 'delivered') {
    return <CheckCheck className={`w-3.5 h-3.5 text-slate-400 dark:text-slate-400 ${className}`} />;
  }

  // Read: double blue / accent tick
  return <CheckCheck className={`w-3.5 h-3.5 text-sky-400 dark:text-sky-400 ${className}`} />;
};
