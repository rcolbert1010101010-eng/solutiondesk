import React, { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { getTagByName, TAGS_CHANGED_EVENT } from '../lib/tags';

interface TagBadgeProps {
  tag: string;
  label?: string;
  color?: string;
  size?: 'sm' | 'md';
  onClick?: (tag: string) => void;
  selected?: boolean;
  interactive?: boolean;
  removable?: boolean;
  onRemove?: (tag: string) => void;
}

const fallbackPalette = ['#3B82F6', '#A855F7', '#F59E0B', '#06B6D4', '#F43F5E', '#F97316', '#10B981', '#14B8A6'];

function fallbackColorFromTag(tag: string): string {
  let hash = 0;
  for (let i = 0; i < tag.length; i += 1) {
    hash = (hash << 5) - hash + tag.charCodeAt(i);
    hash |= 0;
  }
  return fallbackPalette[Math.abs(hash) % fallbackPalette.length];
}

function withAlpha(color: string, alphaHex: string): string {
  const hex = color.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(hex)) {
    return `${hex}${alphaHex}`;
  }
  return hex;
}

export const TagBadge: React.FC<TagBadgeProps> = ({
  tag,
  label,
  color,
  size = 'md',
  onClick,
  selected = false,
  interactive = false,
  removable = false,
  onRemove
}) => {
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    const onTagsChanged = () => setRefreshToken(value => value + 1);
    window.addEventListener(TAGS_CHANGED_EVENT, onTagsChanged);
    return () => window.removeEventListener(TAGS_CHANGED_EVENT, onTagsChanged);
  }, []);

  const tagRecord = useMemo(() => getTagByName(tag), [tag, refreshToken]);
  const resolvedLabel = label ?? tagRecord?.name ?? tag;
  const resolvedColor = color ?? tagRecord?.color ?? fallbackColorFromTag(resolvedLabel);

  const sizeClasses = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-xs px-2.5 py-1';
  const useNeutralStyle = interactive && !selected;
  const style: React.CSSProperties | undefined = useNeutralStyle
    ? undefined
    : {
        color: resolvedColor,
        borderColor: withAlpha(resolvedColor, selected ? '66' : '3D'),
        backgroundColor: withAlpha(resolvedColor, selected ? '26' : '14'),
      };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium transition-colors ${
        onClick ? 'cursor-pointer' : ''
      } ${sizeClasses} border ${
        useNeutralStyle
          ? 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200 hover:border-slate-400 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-700 dark:hover:border-zinc-600'
          : ''
      }`}
      style={style}
      onClick={onClick ? () => onClick(tag) : undefined}
    >
      {resolvedLabel}
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
