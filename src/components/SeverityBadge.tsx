import React from 'react';
import { Severity } from '../types';

interface SeverityBadgeProps {
  severity: Severity;
  size?: 'sm' | 'md';
}

const severityConfig: Record<Severity, { label: string; classes: string }> = {
  Low: {
    label: 'Low',
    classes: 'bg-slate-100 text-slate-500 border border-slate-200'
  },
  Medium: {
    label: 'Medium',
    classes: 'bg-sky-50 text-sky-600 border border-sky-200'
  },
  High: {
    label: 'High',
    classes: 'bg-orange-50 text-orange-600 border border-orange-200'
  },
  Critical: {
    label: 'Critical',
    classes: 'bg-red-50 text-red-600 border border-red-200'
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
