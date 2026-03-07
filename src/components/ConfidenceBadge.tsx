import React from 'react';
import { getConfidenceLevel } from '../lib/db';
import { Issue } from '../types';
import { Shield, TrendingUp, Award, Star } from 'lucide-react';

interface ConfidenceBadgeProps {
  issue: Issue;
  size?: 'sm' | 'md';
  showScore?: boolean;
}

export const ConfidenceBadge: React.FC<ConfidenceBadgeProps> = ({ issue, size = 'md', showScore = false }) => {
  const confidence = getConfidenceLevel(issue);

  const config = {
    high: {
      classes: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
      icon: Award,
      iconColor: 'text-emerald-400'
    },
    medium: {
      classes: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
      icon: TrendingUp,
      iconColor: 'text-amber-400'
    },
    low: {
      classes: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
      icon: Shield,
      iconColor: 'text-zinc-400'
    }
  }[confidence.level];

  const Icon = config.icon;
  const sizeClasses = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-xs px-2.5 py-1';
  const iconSize = size === 'sm' ? 10 : 12;

  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-medium ${config.classes} ${sizeClasses}`}>
      <Icon size={iconSize} className={config.iconColor} />
      {confidence.label}
      {showScore && (
        <span className="ml-1 opacity-70">{confidence.score}%</span>
      )}
    </span>
  );
};
