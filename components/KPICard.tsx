import React from 'react';
import { LucideIcon } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  trend?: { value: string; positive: boolean };
}

export const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = 'text-amber-400',
  iconBg = 'bg-amber-400/10',
  trend
}) => {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex flex-col gap-4 hover:border-zinc-700 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">{title}</span>
          <span className="text-3xl font-bold text-zinc-100">{value}</span>
        </div>
        <div className={`p-2.5 rounded-lg ${iconBg}`}>
          <Icon size={20} className={iconColor} />
        </div>
      </div>
      {(subtitle || trend) && (
        <div className="flex items-center gap-2">
          {trend && (
            <span className={`text-xs font-medium ${trend.positive ? 'text-emerald-400' : 'text-red-400'}`}>
              {trend.positive ? '↑' : '↓'} {trend.value}
            </span>
          )}
          {subtitle && <span className="text-xs text-zinc-500">{subtitle}</span>}
        </div>
      )}
    </div>
  );
};
