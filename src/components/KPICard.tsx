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
  iconColor = 'text-amber-500',
  iconBg = 'bg-amber-50',
  trend
}) => {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col gap-4 hover:border-slate-300 transition-colors shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">{title}</span>
          <span className="text-3xl font-bold text-slate-800">{value}</span>
        </div>
        <div className={`p-2.5 rounded-lg ${iconBg}`}>
          <Icon size={20} className={iconColor} />
        </div>
      </div>
      {(subtitle || trend) && (
        <div className="flex items-center gap-2">
          {trend && (
            <span className={`text-xs font-medium ${trend.positive ? 'text-emerald-600' : 'text-red-500'}`}>
              {trend.positive ? '↑' : '↓'} {trend.value}
            </span>
          )}
          {subtitle && <span className="text-xs text-slate-400">{subtitle}</span>}
        </div>
      )}
    </div>
  );
};
