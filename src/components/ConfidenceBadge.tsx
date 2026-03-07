import React from 'react';
import { getConfidenceLevel } from '../lib/db';
import { ConfidenceLevel } from '../types';
import { Shield, TrendingUp, Award, Star } from 'lucide-react';

interface ConfidenceBadgeProps {
  score: number;
  size?: 'sm' | 'md';
}

const config: Record<ConfidenceLevel, { classes: string; icon: React.ElementType; iconClass: string }> = {
  'Low Confidence': {
    classes: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/25',
    icon: Shield,
    iconClass: 'text-zinc-500'
  },
  'Medium Confidence': {
    classes: 'bg-sky-500/10 text-sky-400 border border-sky-500/25',
    icon: TrendingUp,
    iconClass: 'text-sky-400'
  },
  'High Confidence': {
    classes: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25',
    icon: Award,
    iconClass: 'text-emerald-400'
  },
  'Proven Resolution': {
    classes: 'bg-amber-500/10 text-amber-400 border border-amber-500/30',
    icon: Star,
    iconClass: 'text-amber-400'
  }
};

export const ConfidenceBadge: React.FC<ConfidenceBadgeProps> = ({ score, size = 'md' }) => {
  const level = getConfidenceLevel(score);
  const { classes, icon: Icon, iconClass } = config[level];
  const sizeClasses = size === 'sm' ? 'text-xs px-1.5 py-0.5 gap-1' : 'text-xs px-2.5 py-1 gap-1.5';

  return (
    <span className={`inline-flex items-center rounded-full font-medium ${classes} ${sizeClasses}`}>
      <Icon size={size === 'sm' ? 9 : 11} className={iconClass} />
      {level}
    </span>
  );
};
