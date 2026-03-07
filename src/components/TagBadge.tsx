import React from 'react';
import { Tag } from '../types';

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
    classes: 'bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20',
    selectedClasses: 'bg-blue-500/30 text-blue-300 border border-blue-500/50'
  },
  database: {
    label: 'database',
    classes: 'bg-purple-500/10 text-purple-400 border border-purple-500/20 hover:bg-purple-500/20',
    selectedClasses: 'bg-purple-500/30 text-purple-300 border border-purple-500/50'
  },
  authentication: {
    label: 'auth',
    classes: 'bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20',
    selectedClasses: 'bg-amber-500/30 text-amber-300 border border-amber-500/50'
  },
  api: {
    label: 'api',
    classes: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/20',
    selectedClasses: 'bg-cyan-500/30 text-cyan-300 border border-cyan-500/50'
  },
  permissions: {
    label: 'permissions',
    classes: 'bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20',
    selectedClasses: 'bg-rose-500/30 text-rose-300 border border-rose-500/50'
  },
  timeout: {
    label: 'timeout',
    classes: 'bg-orange-500/10 text-orange-400 border border-orange-500/20 hover:bg-orange-500/20',
    selectedClasses: 'bg-orange-500/30 text-orange-300 border border-orange-500/50'
  },
  deployment: {
    label: 'deploy',
    classes: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20',
    selectedClasses: 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/50'
  }
};

export const TagBadge: React.FC<TagBadgeProps> = ({
  tag,
  size = 'sm',
  onClick,
  selected = false,
  removable = false,
  onRemove
}) => {
  const config = tagConfig[tag];
  const sizeClasses = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-xs px-2.5 py-1';
  const colorClasses = selected ? config.selectedClasses : config.classes;
  const cursorClass = onClick ? 'cursor-pointer' : 'cursor-default';

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium transition-colors ${colorClasses} ${sizeClasses} ${cursorClass}`}
      onClick={onClick ? () => onClick(tag) : undefined}
    >
      <span className="font-mono text-[10px] opacity-60">#</span>
      {config.label}
      {removable && onRemove && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRemove(tag); }}
          className="ml-0.5 opacity-60 hover:opacity-100 transition-opacity leading-none"
        >
          ×
        </button>
      )}
    </span>
  );
};
