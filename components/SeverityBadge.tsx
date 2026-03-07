import React from 'react';
import { Severity } from '../types';

interface SeverityBadgeProps {
  severity: Severity;
  size?: 'sm' | 'md';
}

const severityConfig: Record<Severity, { label: string; classes: string }> = {
  Low: {
    label: 'Low',
    classes: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20'
  },
  Medium: {
    label: 'Medium',
    classes: 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
  },
  High: {
    label: 'High',
    classes: 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
  },
  Critical: {
    label: 'Critical',
    classes: 'bg-red-500/10 text-red-400 border border-red-500/20'
  }
};

export const SeverityBadge: React.FC<SeverityBadgeProps> = ({ severity, size = 'md' }) => {
  const config = severityConfig[severity];
  const sizeClasses = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-xs px-2.5 py-1';

  return (
    <span className={`inline-flex items-center rounded-full font-medium ${config.classes} ${sizeClasses}`}>
      {config.label}
    </span>
  );
};
