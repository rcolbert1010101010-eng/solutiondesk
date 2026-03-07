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
            <h1 className="text-2xl font-bold text-zinc-100">Dashboard</h1>
            <p className="text-sm text-zinc-500 mt-1">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
          <button
            onClick={() => navigate('/new-issue')}
            className="flex items-center gap-2 bg-amber-400 hover:bg-amber-300 text-zinc-900 font-semibold text-sm px-4 py-2.5 rounded-lg transition-colors"
          >
            <PlusCircle size={16} />
            New Issue
          </button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <KPICard
            title="Open Issues"
            value={open}
            subtitle={`${investigating} investigating`}
            icon={AlertTriangle}
            iconColor="text-amber-400"
            iconBg="bg-amber-400/10"
          />
          <KPICard
            title="Critical"
            value={critical}
            subtitle="need immediate action"
            icon={Activity}
            iconColor="text-red-400"
            iconBg="bg-red-400/10"
          />
          <KPICard
            title="Resolved"
            value={resolved}
            subtitle="total resolutions"
            icon={CheckCircle2}
            iconColor="text-emerald-400"
            iconBg="bg-emerald-400/10"
          />
          <KPICard
            title="Master Incidents"
            value={masterIncidents.length}
            subtitle={`${totalLinked} issues linked`}
            icon={Star}
            iconColor="text-violet-400"
            iconBg="bg-violet-400/10"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Recent Issues */}
          <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-zinc-100">Recent Issues</h2>
              <button onClick={() => navigate('/issues')} className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1">
                View all <ArrowRight size={12} />
              </button>
            </div>
            <div className="space-y-2">
              {recent.map(issue => (
                <div
                  key={issue.id}
                  onClick={() => navigate(`/issues/${issue.id}`)}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-zinc-800 cursor-pointer transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-mono text-zinc-500">{issue.id}</span>
                      {issue.isMasterIncident && (
                        <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full bg-violet-500/15 text-violet-400 border border-violet-500/25">
                          <Star size={9} fill="currentColor" /> Master
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-zinc-200 truncate">{issue.title}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <StatusBadge status={issue.status} size="sm" />
                    <SeverityBadge severity={issue.severity} size="sm" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="space-y-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 size={16} className="text-amber-400" />
                <h2 className="text-sm font-semibold text-zinc-100">System Health</h2>
              </div>
              <div className="space-y-2">
                {[
                  { label: 'Open', count: open, color: 'bg-blue-400' },
                  { label: 'Investigating', count: investigating, color: 'bg-amber-400' },
                  { label: 'Resolved', count: resolved, color: 'bg-emerald-400' },
                  { label: 'Critical', count: critical, color: 'bg-red-400' }
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-3">
                    <span className="text-xs text-zinc-400 w-24">{item.label}</span>
                    <div className="flex-1 bg-zinc-800 rounded-full h-1.5">
                      <div
                        className={`${item.color} h-1.5 rounded-full transition-all`}
                        style={{ width: `${Math.min((item.count / Math.max(issues.length, 1)) * 100, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs font-mono text-zinc-400 w-4 text-right">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Analytics Widgets */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Master Incidents */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Star size={16} className="text-violet-400" />
                <h2 className="text-sm font-semibold text-zinc-100">Top Master Incidents</h2>
              </div>
              <button onClick={() => navigate('/resolution-library')} className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1">
                Library <ArrowRight size={12} />
              </button>
            </div>
            {topMasterIncidents.length === 0 ? (
              <p className="text-xs text-zinc-500 py-4 text-center">No master incidents yet.</p>
            ) : (
              <div className="space-y-2">
                {topMasterIncidents.map(issue => (
                  <div
                    key={issue.id}
                    onClick={() => navigate(`/issues/${issue.id}`)}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-zinc-800 cursor-pointer transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-zinc-200 truncate">{issue.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-zinc-500">
                          <Link size={10} className="inline mr-1" />
                          {issue.linkedIncidentCount ?? 0} linked
                        </span>
                        <ConfidenceBadge score={issue.confidenceScore ?? 0} size="sm" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Most Reused Resolutions */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Award size={16} className="text-amber-400" />
              <h2 className="text-sm font-semibold text-zinc-100">Most Reused Resolutions</h2>
            </div>
            {mostReused.length === 0 ? (
              <p className="text-xs text-zinc-500 py-4 text-center">No reused resolutions yet.</p>
            ) : (
              <div className="space-y-2">
                {mostReused.map(issue => (
                  <div
                    key={issue.id}
                    onClick={() => navigate(`/issues/${issue.id}`)}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-zinc-800 cursor-pointer transition-colors"
                  >
                    <div className="w-7 h-7 rounded-full bg-amber-400/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-amber-400">{issue.referenceCount ?? 0}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-zinc-200 truncate">{issue.title}</p>
                      <p className="text-xs text-zinc-500">{issue.systemAffected}</p>
                    </div>
                    <ConfidenceBadge score={issue.confidenceScore ?? 0} size="sm" />
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
