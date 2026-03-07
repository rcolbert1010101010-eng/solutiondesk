import React from 'react';
import { getConfidenceLevel } from '../lib/db';
import { Issue } from '../types';
import { Shield, TrendingUp, Award } from 'lucide-react';

interface ConfidenceBadgeProps {
  issue: Issue;
  size?: 'sm' | 'md';
  showScore?: boolean;
}

export const ConfidenceBadge: React.FC<ConfidenceBadgeProps> = ({ issue, size = 'md', showScore = false }) => {
  const confidence = getConfidenceLevel(issue);

  const config = {
    high: {
      classes: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
      icon: Award,
      iconColor: 'text-emerald-600'
    },
    medium: {
      classes: 'bg-amber-50 text-amber-700 border border-amber-200',
      icon: TrendingUp,
      iconColor: 'text-amber-600'
    },
    low: {
      classes: 'bg-slate-100 text-slate-500 border border-slate-200',
      icon: Shield,
      iconColor: 'text-slate-400'
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
