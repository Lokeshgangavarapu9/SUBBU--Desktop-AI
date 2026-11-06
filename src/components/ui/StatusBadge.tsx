import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { OpenClawConnectionStatus } from '../../types/openclaw';

interface StatusBadgeProps {
  status: OpenClawConnectionStatus;
  detail?: string;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  detail,
  className,
}) => {
  const configs = {
    Connected: {
      dot: 'bg-emerald-500 animate-pulse',
      bg: 'bg-emerald-50 border-emerald-200 text-emerald-800',
      label: 'Connected',
    },
    Connecting: {
      dot: 'bg-amber-500 animate-ping',
      bg: 'bg-amber-50 border-amber-200 text-amber-800',
      label: 'Connecting...',
    },
    Disconnected: {
      dot: 'bg-rose-400',
      bg: 'bg-rose-50 border-rose-200 text-rose-800',
      label: 'Disconnected',
    },
    'Authentication Required': {
      dot: 'bg-violet-500',
      bg: 'bg-violet-50 border-violet-200 text-violet-800',
      label: 'Auth Required',
    },
    'Backend Error': {
      dot: 'bg-red-500',
      bg: 'bg-red-50 border-red-200 text-red-800',
      label: 'Backend Error',
    },
  };

  const current = configs[status] || configs.Disconnected;

  return (
    <div
      title={detail || status}
      className={twMerge(
        clsx(
          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border shadow-2xs transition-all',
          current.bg,
          className
        )
      )}
    >
      <span className={clsx('w-2 h-2 rounded-full', current.dot)} />
      <span>{current.label}</span>
    </div>
  );
};

