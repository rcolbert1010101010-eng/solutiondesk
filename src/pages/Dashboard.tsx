import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllIssues, getConfidenceLevel, rankIssues } from '../lib/db';
import { Issue } from '../types';
import { KPICard } from '../components/KPICard';
import { StatusBadge } from '../components/StatusBadge';
import { SeverityBadge } from '../components/SeverityBadge';
import { ConfidenceBadge } from '../components/ConfidenceBadge';
import { formatRelativeTime } from '../lib/utils';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp,
  PlusCircle,
  ArrowRight,
  Activity,
  Star,
  Link,
  Award,
  BarChart3
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
  const masterIncidents = issues.filter(i => i.isMasterIncident);
  const totalLinked = issues.reduce((sum, i) => sum + (i.linkedIncidentCount ?? 0), 0);

  const recent = [...issues]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 4);

  const topMasterIncidents = rankIssues(masterIncidents).slice(0, 5);
  const mostReused = [...issues]
    .filter(i => (i.referenceCount ?? 0) > 0)
    .sort((a, b) => (b.referenceCount ?? 0) - (a.referenceCount ?? 0))
    .slice(0, 4);

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-zinc-100">Dashboard</h1>
            <p className="text-sm mt-1 text-slate-500 dark:text-zinc-500">Support intelligence overview</p>
          </div>
          <button
            onClick={() => navigate('/new-issue')}
            className="flex items-center gap-2 px-4 py-2 bg-amber-400 hover:bg-amber-300 text-zinc-900 rounded-lg text-sm font-semibold transition-colors"
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
            icon={Activity}
            iconColor="text-blue-400"
            iconBg="bg-blue-400/10"
            subtitle="Active"
          />
          <KPICard
            title="Investigating"
            value={investigating}
            icon={Clock}
            iconColor="text-amber-400"
            iconBg="bg-amber-400/10"
            subtitle="In progress"
          />
          <KPICard
            title="Resolved"
            value={resolved}
            icon={CheckCircle2}
            iconColor="text-emerald-400"
            iconBg="bg-emerald-400/10"
            subtitle="Completed"
          />
          <KPICard
            title="Critical"
            value={critical}
            icon={AlertTriangle}
            iconColor="text-red-400"
            iconBg="bg-red-400/10"
            subtitle="High priority"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Master Incidents */}
          <div className="lg:col-span-2 border rounded-xl p-5 bg-white border-slate-200 dark:bg-zinc-900 dark:border-zinc-800">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Star size={16} className="text-violet-400" fill="currentColor" />
                <h2 className="text-sm font-semibold text-slate-900 dark:text-zinc-200">Master Incidents</h2>
                <span className="text-xs bg-violet-500/15 text-violet-400 border border-violet-500/25 px-1.5 py-0.5 rounded-full">{masterIncidents.length}</span>
              </div>
              <button onClick={() => navigate('/issues')} className="text-xs flex items-center gap-1 transition-colors text-slate-500 hover:text-slate-700 dark:text-zinc-500 dark:hover:text-zinc-300">
                View all <ArrowRight size={12} />
              </button>
            </div>
            {topMasterIncidents.length === 0 ? (
              <p className="text-sm text-center py-8 text-slate-500 dark:text-zinc-600">No master incidents yet.</p>
            ) : (
              <div className="space-y-2">
                {topMasterIncidents.map(issue => (
                  <div
                    key={issue.id}
                    onClick={() => navigate(`/issues/${issue.id}`)}
                    className="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors group hover:bg-slate-50 dark:hover:bg-zinc-800"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-mono text-slate-500 dark:text-zinc-600">{issue.id}</span>
                        <StatusBadge status={issue.status} size="sm" />
                      </div>
                      <p className="text-sm truncate font-medium text-slate-700 group-hover:text-slate-900 dark:text-zinc-300 dark:group-hover:text-white">{issue.title}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {issue.linkedIncidentCount && issue.linkedIncidentCount > 0 ? (
                        <span className="flex items-center gap-1 text-xs text-violet-400">
                          <Link size={11} />{issue.linkedIncidentCount}
                        </span>
                      ) : null}
                      <SeverityBadge severity={issue.severity} size="sm" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="flex flex-col gap-4">
            <div className="border rounded-xl p-5 bg-white border-slate-200 dark:bg-zinc-900 dark:border-zinc-800">
              <div className="flex items-center gap-2 mb-3">
                <Link size={14} className="text-violet-400" />
                <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-200">Linked Incidents</h3>
              </div>
              <p className="text-3xl font-bold text-slate-900 dark:text-zinc-100">{totalLinked}</p>
              <p className="text-xs mt-1 text-slate-500 dark:text-zinc-500">Across {masterIncidents.length} master incidents</p>
            </div>
            <div className="border rounded-xl p-5 bg-white border-slate-200 dark:bg-zinc-900 dark:border-zinc-800">
              <div className="flex items-center gap-2 mb-3">
                <Award size={14} className="text-amber-400" />
                <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-200">Resolution Rate</h3>
              </div>
              <p className="text-3xl font-bold text-slate-900 dark:text-zinc-100">
                {issues.length > 0 ? Math.round((resolved / issues.length) * 100) : 0}%
              </p>
              <p className="text-xs mt-1 text-slate-500 dark:text-zinc-500">{resolved} of {issues.length} issues resolved</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Issues */}
          <div className="border rounded-xl p-5 bg-white border-slate-200 dark:bg-zinc-900 dark:border-zinc-800">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-zinc-200">Recent Issues</h2>
              <button onClick={() => navigate('/issues')} className="text-xs flex items-center gap-1 transition-colors text-slate-500 hover:text-slate-700 dark:text-zinc-500 dark:hover:text-zinc-300">
                View all <ArrowRight size={12} />
              </button>
            </div>
            <div className="space-y-2">
              {recent.map(issue => (
                <div
                  key={issue.id}
                  onClick={() => navigate(`/issues/${issue.id}`)}
                  className="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors group hover:bg-slate-50 dark:hover:bg-zinc-800"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate font-medium text-slate-700 group-hover:text-slate-900 dark:text-zinc-300 dark:group-hover:text-white">{issue.title}</p>
                    <p className="text-xs mt-0.5 text-slate-500 dark:text-zinc-600">{formatRelativeTime(issue.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <SeverityBadge severity={issue.severity} size="sm" />
                    <StatusBadge status={issue.status} size="sm" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Most Reused Resolutions */}
          <div className="border rounded-xl p-5 bg-white border-slate-200 dark:bg-zinc-900 dark:border-zinc-800">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BarChart3 size={14} className="text-amber-400" />
                <h2 className="text-sm font-semibold text-slate-900 dark:text-zinc-200">Most Referenced</h2>
              </div>
              <button onClick={() => navigate('/resolution-library')} className="text-xs flex items-center gap-1 transition-colors text-slate-500 hover:text-slate-700 dark:text-zinc-500 dark:hover:text-zinc-300">
                Library <ArrowRight size={12} />
              </button>
            </div>
            {mostReused.length === 0 ? (
              <p className="text-sm text-center py-8 text-slate-500 dark:text-zinc-600">No referenced issues yet.</p>
            ) : (
              <div className="space-y-2">
                {mostReused.map(issue => (
                  <div
                    key={issue.id}
                    onClick={() => navigate(`/issues/${issue.id}`)}
                    className="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors group hover:bg-slate-50 dark:hover:bg-zinc-800"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate font-medium text-slate-700 group-hover:text-slate-900 dark:text-zinc-300 dark:group-hover:text-white">{issue.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {issue.resolution && <ConfidenceBadge issue={issue} size="sm" />}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className="text-sm font-bold text-amber-400">{issue.referenceCount}</span>
                      <p className="text-xs text-slate-500 dark:text-zinc-600">refs</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
