import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllIssues } from '../lib/db';
import { Issue } from '../types';
import { KPICard } from '../components/KPICard';
import { IssueCard } from '../components/IssueCard';
import { StatusBadge } from '../components/StatusBadge';
import { SeverityBadge } from '../components/SeverityBadge';
import { formatRelativeTime } from '../lib/utils';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp,
  PlusCircle,
  ArrowRight,
  Activity
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const [issues, setIssues] = useState<Issue[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    setIssues(getAllIssues());
  }, []);

  const open = issues.filter(i => i.status === 'Open').length;
  const investigating = issues.filter(i => i.status === 'Investigating').length;
  const resolved = issues.filter(i => i.status === 'Resolved').length;
  const critical = issues.filter(i => i.severity === 'Critical').length;

  const recent = [...issues]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 4);

  const activeIssues = issues.filter(i => i.status === 'Open' || i.status === 'Investigating');
  const criticalIssues = issues.filter(i => i.severity === 'Critical' && i.status !== 'Closed' && i.status !== 'Resolved');

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-zinc-100">Dashboard</h1>
            <p className="text-sm text-zinc-500 mt-1">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
          <button
            onClick={() => navigate('/new-issue')}
            className="flex items-center gap-2 bg-amber-400 hover:bg-amber-300 text-zinc-900 text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors"
          >
            <PlusCircle size={16} />
            New Issue
          </button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <KPICard
            title="Open Issues"
            value={open}
            subtitle="Awaiting action"
            icon={AlertTriangle}
            iconColor="text-blue-400"
            iconBg="bg-blue-400/10"
          />
          <KPICard
            title="Investigating"
            value={investigating}
            subtitle="In progress"
            icon={Activity}
            iconColor="text-amber-400"
            iconBg="bg-amber-400/10"
          />
          <KPICard
            title="Resolved"
            value={resolved}
            subtitle="This period"
            icon={CheckCircle2}
            iconColor="text-emerald-400"
            iconBg="bg-emerald-400/10"
          />
          <KPICard
            title="Critical"
            value={critical}
            subtitle="Need urgent attention"
            icon={TrendingUp}
            iconColor="text-red-400"
            iconBg="bg-red-400/10"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Issues */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-zinc-100">Recent Issues</h2>
              <button
                onClick={() => navigate('/issues')}
                className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 transition-colors"
              >
                View all <ArrowRight size={12} />
              </button>
            </div>
            <div className="flex flex-col gap-3">
              {recent.map(issue => (
                <IssueCard key={issue.id} issue={issue} />
              ))}
            </div>
          </div>

          {/* Right Column */}
          <div className="flex flex-col gap-6">
            {/* Critical Issues */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-zinc-100">🔴 Critical Issues</h2>
                <span className="text-xs bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-full">
                  {criticalIssues.length}
                </span>
              </div>
              {criticalIssues.length === 0 ? (
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 text-center">
                  <CheckCircle2 size={24} className="text-emerald-400 mx-auto mb-2" />
                  <p className="text-sm text-zinc-400">No critical issues</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {criticalIssues.map(issue => (
                    <button
                      key={issue.id}
                      onClick={() => navigate(`/issues/${issue.id}`)}
                      className="bg-zinc-900 border border-red-500/20 rounded-xl p-4 text-left hover:border-red-500/40 transition-colors w-full"
                    >
                      <p className="text-xs font-mono text-zinc-500 mb-1">{issue.id}</p>
                      <p className="text-sm font-medium text-zinc-100 line-clamp-2 mb-2">{issue.title}</p>
                      <StatusBadge status={issue.status} size="sm" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Activity Feed */}
            <div>
              <h2 className="text-base font-semibold text-zinc-100 mb-4">Activity</h2>
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <div className="flex flex-col gap-3">
                  {activeIssues.slice(0, 5).map(issue => (
                    <div key={issue.id} className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-2 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-zinc-300 font-medium truncate">{issue.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <SeverityBadge severity={issue.severity} size="sm" />
                          <span className="text-xs text-zinc-600">{formatRelativeTime(issue.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {activeIssues.length === 0 && (
                    <p className="text-xs text-zinc-500 text-center py-2">No active issues</p>
                  )}
                </div>
              </div>
            </div>

            {/* Status Breakdown */}
            <div>
              <h2 className="text-base font-semibold text-zinc-100 mb-4">Status Breakdown</h2>
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col gap-3">
                {(['Open', 'Investigating', 'Resolved', 'Closed'] as const).map(status => {
                  const count = issues.filter(i => i.status === status).length;
                  const pct = issues.length > 0 ? Math.round((count / issues.length) * 100) : 0;
                  const barColors: Record<string, string> = {
                    Open: 'bg-blue-400',
                    Investigating: 'bg-amber-400',
                    Resolved: 'bg-emerald-400',
                    Closed: 'bg-zinc-500'
                  };
                  return (
                    <div key={status}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-zinc-400">{status}</span>
                        <span className="text-xs font-semibold text-zinc-300">{count}</span>
                      </div>
                      <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${barColors[status]}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
