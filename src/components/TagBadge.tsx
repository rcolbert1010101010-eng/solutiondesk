import React from 'react';
import { Tag } from '../types';
import { X } from 'lucide-react';

interface TagBadgeProps {
  tag: Tag;
  size?: 'sm' | 'md';
  onClick?: (tag: Tag) => void;
  selected?: boolean;
  removable?: boolean;
  onRemove?: (tag: Tag) => void;
}

const tagConfig: Record<Tag, { label: string; classes: string; selectedClasses: string }> = {
  network: {
    label: 'network',
    classes: 'bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100',
    selectedClasses: 'bg-blue-100 text-blue-700 border border-blue-300'
  },
  database: {
    label: 'database',
    classes: 'bg-purple-50 text-purple-600 border border-purple-200 hover:bg-purple-100',
    selectedClasses: 'bg-purple-100 text-purple-700 border border-purple-300'
  },
  authentication: {
    label: 'auth',
    classes: 'bg-amber-50 text-amber-600 border border-amber-200 hover:bg-amber-100',
    selectedClasses: 'bg-amber-100 text-amber-700 border border-amber-300'
  },
  api: {
    label: 'api',
    classes: 'bg-cyan-50 text-cyan-600 border border-cyan-200 hover:bg-cyan-100',
    selectedClasses: 'bg-cyan-100 text-cyan-700 border border-cyan-300'
  },
  permissions: {
    label: 'permissions',
    classes: 'bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100',
    selectedClasses: 'bg-rose-100 text-rose-700 border border-rose-300'
  },
  timeout: {
    label: 'timeout',
    classes: 'bg-orange-50 text-orange-600 border border-orange-200 hover:bg-orange-100',
    selectedClasses: 'bg-orange-100 text-orange-700 border border-orange-300'
  },
  deployment: {
    label: 'deploy',
    classes: 'bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100',
    selectedClasses: 'bg-emerald-100 text-emerald-700 border border-emerald-300'
  },
  hardware: {
    label: 'hardware',
    classes: 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200',
    selectedClasses: 'bg-slate-200 text-slate-700 border border-slate-300'
  },
  security: {
    label: 'security',
    classes: 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100',
    selectedClasses: 'bg-red-100 text-red-700 border border-red-300'
  },
  performance: {
    label: 'perf',
    classes: 'bg-yellow-50 text-yellow-600 border border-yellow-200 hover:bg-yellow-100',
    selectedClasses: 'bg-yellow-100 text-yellow-700 border border-yellow-300'
  },
  storage: {
    label: 'storage',
    classes: 'bg-teal-50 text-teal-600 border border-teal-200 hover:bg-teal-100',
    selectedClasses: 'bg-teal-100 text-teal-700 border border-teal-300'
  },
  email: {
    label: 'email',
    classes: 'bg-indigo-50 text-indigo-600 border border-indigo-200 hover:bg-indigo-100',
    selectedClasses: 'bg-indigo-100 text-indigo-700 border border-indigo-300'
  },
  vpn: {
    label: 'vpn',
    classes: 'bg-violet-50 text-violet-600 border border-violet-200 hover:bg-violet-100',
    selectedClasses: 'bg-violet-100 text-violet-700 border border-violet-300'
  },
  backup: {
    label: 'backup',
    classes: 'bg-lime-50 text-lime-600 border border-lime-200 hover:bg-lime-100',
    selectedClasses: 'bg-lime-100 text-lime-700 border border-lime-300'
  },
  printing: {
    label: 'printing',
    classes: 'bg-fuchsia-50 text-fuchsia-600 border border-fuchsia-200 hover:bg-fuchsia-100',
    selectedClasses: 'bg-fuchsia-100 text-fuchsia-700 border border-fuchsia-300'
  }
};

export const TagBadge: React.FC<TagBadgeProps> = ({ tag, size = 'md', onClick, selected = false, removable = false, onRemove }) => {
  const config = tagConfig[tag] ?? {
    label: tag,
    classes: 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200',
    selectedClasses: 'bg-slate-200 text-slate-700 border border-slate-300'
  };
  const sizeClasses = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-xs px-2.5 py-1';
  const activeClasses = selected ? config.selectedClasses : config.classes;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium transition-colors ${
        onClick ? 'cursor-pointer' : ''
      } ${activeClasses} ${sizeClasses}`}
      onClick={onClick ? () => onClick(tag) : undefined}
    >
      {config.label}
      {removable && onRemove && (
        <button
          onClick={e => { e.stopPropagation(); onRemove(tag); }}
          className="ml-0.5 hover:opacity-70 transition-opacity"
        >
          <X size={10} />
        </button>
      )}
    </span>
  );
};
