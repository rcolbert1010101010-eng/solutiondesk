import React from 'react';
import { Status } from '../types';

interface StatusBadgeProps {
  status: Status;
  size?: 'sm' | 'md';
}

const statusConfig: Record<Status, { label: string; classes: string; dot: string }> = {
  Open: {
    label: 'Open',
    classes: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
    dot: 'bg-blue-400'
  },
  Investigating: {
    label: 'Investigating',
    classes: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
    dot: 'bg-amber-400'
  },
  Resolved: {
    label: 'Resolved',
    classes: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    dot: 'bg-emerald-400'
  },
  Closed: {
    label: 'Closed',
    classes: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
    dot: 'bg-zinc-400'
  }
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const config = statusConfig[status];
  const sizeClasses = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-xs px-2.5 py-1';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-medium ${config.classes} ${sizeClasses}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
};
