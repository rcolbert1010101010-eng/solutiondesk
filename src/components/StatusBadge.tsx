import React from 'react';
import { Status } from '../types';

interface StatusBadgeProps {
  status: Status;
  size?: 'sm' | 'md';
}

const statusConfig: Record<Status, { label: string; classes: string; dot: string }> = {
  Open: {
    label: 'Open',
    classes: 'bg-blue-50 text-blue-600 border border-blue-200',
    dot: 'bg-blue-500'
  },
  Investigating: {
    label: 'Investigating',
    classes: 'bg-amber-50 text-amber-700 border border-amber-200',
    dot: 'bg-amber-500'
  },
  Resolved: {
    label: 'Resolved',
    classes: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    dot: 'bg-emerald-500'
  },
  Closed: {
    label: 'Closed',
    classes: 'bg-slate-100 text-slate-500 border border-slate-200',
    dot: 'bg-slate-400'
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
