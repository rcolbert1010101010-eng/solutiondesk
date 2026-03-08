import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllIssues } from '../lib/db';
import { Issue } from '../types';
import { ConfidenceBadge } from '../components/ConfidenceBadge';
import { SeverityBadge } from '../components/SeverityBadge';
import { StatusBadge } from '../components/StatusBadge';
import { TagBadge } from '../components/TagBadge';
import { SemanticSearchPanel } from '../components/SemanticSearchPanel';
import { formatRelativeTime } from '../lib/utils';
import {
  BookOpen,
  Search,
  Star,
  CheckCircle2,
  Award,
  TrendingUp,
  Zap,
  X,
  Filter
} from 'lucide-react';
import { Card } from '../components/ui/Card';

export const ResolutionLibrary: React.FC = () => {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [search, setSearch] = useState('');
  const [filterResolved, setFilterResolved] = useState(false);
  const [filterMaster, setFilterMaster] = useState(false);
  const [semanticMode, setSemanticMode] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setIssues(getAllIssues());
  }, []);

  const resolvedIssues = issues.filter(i => i.status === 'Resolved' || i.status === 'Closed');
  const withResolution = resolvedIssues.filter(i => i.resolution);
  const masterCount = issues.filter(i => i.isMasterIncident).length;

  const displayIssues = issues.filter(issue => {
    if (filterResolved && issue.status !== 'Resolved' && issue.status !== 'Closed') return false;
    if (filterMaster && !issue.isMasterIncident) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      issue.title.toLowerCase().includes(q) ||
      issue.description.toLowerCase().includes(q) ||
      issue.systemAffected.toLowerCase().includes(q) ||
      (issue.resolution?.summary ?? '').toLowerCase().includes(q) ||
      (issue.resolution?.rootCause ?? '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-8 h-8 bg-violet-500/10 rounded-lg flex items-center justify-center">
                <BookOpen size={16} className="text-violet-400" />
              </div>
              <h1 className={`text-2xl font-bold text-slate-900 dark:text-zinc-100`}>Resolution Library</h1>
            </div>
            <p className={`text-sm mt-1 text-slate-500 dark:text-zinc-500`}>Search past resolutions using keywords or semantic similarity</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card className="p-4">
            <div className={`text-2xl font-bold text-slate-900 dark:text-zinc-100`}>{withResolution.length}</div>
            <div className={`text-xs mt-1 text-slate-500 dark:text-zinc-500`}>Documented Resolutions</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-bold text-violet-400">{masterCount}</div>
            <div className={`text-xs mt-1 text-slate-500 dark:text-zinc-500`}>Master Incidents</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-bold text-emerald-400">{resolvedIssues.length}</div>
            <div className={`text-xs mt-1 text-slate-500 dark:text-zinc-500`}>Resolved Issues</div>
          </Card>
        </div>

        {/* Search Mode Toggle */}
        <div className="flex gap-3 items-center mb-4">
          <div className={`flex rounded-lg border overflow-hidden border-slate-200 dark:border-zinc-700`}>
            <button
              onClick={() => setSemanticMode(false)}
              className={`px-3 py-2 text-xs font-medium flex items-center gap-1.5 transition-colors ${
                !semanticMode
                  ? 'bg-slate-100 text-slate-900 dark:bg-zinc-700 dark:text-zinc-100'
                  : 'bg-white text-slate-500 hover:text-slate-700 dark:bg-zinc-900 dark:text-zinc-500 dark:hover:text-zinc-300'
              }`}
            >
              <Search size={11} /> Keyword
            </button>
            <button
              onClick={() => setSemanticMode(true)}
              className={`px-3 py-2 text-xs font-medium flex items-center gap-1.5 transition-colors ${
                semanticMode ? 'bg-amber-500/20 text-amber-400' : 'bg-white text-slate-500 hover:text-slate-700 dark:bg-zinc-900 dark:text-zinc-500 dark:hover:text-zinc-300'
              }`}
            >
              <Zap size={11} /> Semantic
            </button>
          </div>

          {!semanticMode && (
            <div className="relative flex-1">
              <Search size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500`} />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by title, system, resolution, root cause..."
                className={`w-full border rounded-lg pl-9 pr-9 py-2 text-sm focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 bg-white border-slate-200 text-slate-900 placeholder-slate-400 dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-100 dark:placeholder-zinc-500`}
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:text-zinc-500 dark:hover:text-zinc-300`}
                >
                  <X size={12} />
                </button>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => setFilterResolved(v => !v)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-colors ${
                filterResolved
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                  : 'border-slate-200 bg-white text-slate-500 hover:text-slate-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
              }`}
            >
              <CheckCircle2 size={11} /> Resolved only
            </button>
            <button
              onClick={() => setFilterMaster(v => !v)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-colors ${
                filterMaster
                  ? 'border-violet-500/40 bg-violet-500/10 text-violet-400'
                  : 'border-slate-200 bg-white text-slate-500 hover:text-slate-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
              }`}
            >
              <Star size={11} /> Master only
            </button>
          </div>
        </div>

        {/* Semantic Search Panel */}
        {semanticMode && (
          <div className="mb-6">
            <SemanticSearchPanel
              onlyResolved={filterResolved}
              placeholder="Describe the problem to find similar resolved incidents..."
              label="Find Similar Incidents"
            />
          </div>
        )}

        {/* Keyword Results */}
        {!semanticMode && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between mb-2">
              <span className={`text-sm text-slate-500 dark:text-zinc-500`}>
                {displayIssues.length} issue{displayIssues.length !== 1 ? 's' : ''}
                {search && ` matching "${search}"`}
              </span>
            </div>

            {displayIssues.length === 0 ? (
              <div className="text-center py-16">
                <BookOpen size={32} className={`mx-auto mb-4 text-slate-300 dark:text-zinc-700`} />
                <p className={`text-sm text-slate-500 dark:text-zinc-500`}>No issues match your current filters.</p>
                <p className={`text-xs mt-1 text-slate-400 dark:text-zinc-600`}>Try semantic search to find similar incidents by meaning.</p>
              </div>
            ) : (
              displayIssues.map(issue => (
                <Card
                  key={issue.id}
                  onClick={() => navigate(`/issues/${issue.id}`)}
                  className="p-4 cursor-pointer transition-all hover:border-slate-300 hover:bg-slate-50 dark:hover:border-zinc-600 dark:hover:bg-zinc-800/50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`text-xs font-mono text-slate-500 dark:text-zinc-500`}>{issue.id}</span>
                        {issue.isMasterIncident && (
                          <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full bg-violet-500/15 text-violet-400 border border-violet-500/25">
                            <Star size={9} fill="currentColor" /> Master
                          </span>
                        )}
                        <StatusBadge status={issue.status} size="sm" />
                        <ConfidenceBadge issue={issue} size="sm" showScore />
                      </div>
                      <h3 className={`text-sm font-semibold text-slate-900 dark:text-zinc-100`}>{issue.title}</h3>
                      <p className={`text-xs mt-1 line-clamp-2 text-slate-500 dark:text-zinc-500`}>{issue.description}</p>
                    </div>
                    <SeverityBadge severity={issue.severity} size="sm" />
                  </div>

                  {issue.resolution && (
                    <div className={`mt-3 pt-3 border-t border-slate-200 dark:border-zinc-800`}>
                      <div className="flex items-center gap-2 mb-1">
                        <CheckCircle2 size={11} className="text-emerald-400" />
                        <span className="text-xs font-medium text-emerald-400">Documented Resolution</span>
                      </div>
                      <p className={`text-xs line-clamp-2 text-slate-700 dark:text-zinc-400`}>{issue.resolution.summary}</p>
                      {issue.resolution.rootCause && (
                        <p className={`text-xs mt-1 text-slate-500 dark:text-zinc-500`}>
                          <span className="text-slate-400 dark:text-zinc-600">Root cause:</span> {issue.resolution.rootCause}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-3 mt-3 flex-wrap">
                    <span className={`text-xs text-slate-500 dark:text-zinc-500`}>{issue.systemAffected}</span>
                    <span className={`text-xs text-slate-400 dark:text-zinc-600`}>•</span>
                    <span className={`text-xs text-slate-500 dark:text-zinc-500`}>{formatRelativeTime(issue.createdAt)}</span>
                    {issue.tags && issue.tags.length > 0 && (
                      <div className="flex gap-1 flex-wrap">
                        {issue.tags.map(tag => (
                          <TagBadge key={tag} tag={tag} size="sm" />
                        ))}
                      </div>
                    )}
                  </div>
                </Card>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
