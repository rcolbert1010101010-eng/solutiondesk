import React from 'react';
import { LucideIcon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

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
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className={`border rounded-xl p-5 flex flex-col gap-4 transition-colors ${
      isDark
        ? 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
        : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
    }`}>
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <span className={`text-xs font-medium uppercase tracking-wider ${
            isDark ? 'text-zinc-500' : 'text-slate-400'
          }`}>{title}</span>
          <span className={`text-3xl font-bold ${
            isDark ? 'text-zinc-100' : 'text-slate-800'
          }`}>{value}</span>
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
          {subtitle && <span className={`text-xs ${
            isDark ? 'text-zinc-500' : 'text-slate-400'
          }`}>{subtitle}</span>}
        </div>
      )}
    </div>
  );
};
