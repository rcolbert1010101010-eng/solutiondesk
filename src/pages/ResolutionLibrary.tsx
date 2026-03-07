import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllIssues } from '../lib/db';
import { Issue } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { SeverityBadge } from '../components/SeverityBadge';
import { formatRelativeTime, formatDate } from '../lib/utils';
import { Search, BookOpen, CheckCircle2, Clock, Monitor, User, ArrowRight, X, AlertTriangle } from 'lucide-react';

export const ResolutionLibrary: React.FC = () => {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    setIssues(getAllIssues());
  }, []);

  const results = useMemo(() => {
    const q = search.toLowerCase().trim();

    let list: Issue[];
    if (q === '') {
      list = [...issues];
    } else {
      list = issues.filter(issue => {
        const inTitle = issue.title.toLowerCase().includes(q);
        const inDesc = issue.description.toLowerCase().includes(q);
        const inResolution = (issue.resolution ?? '').toLowerCase().includes(q);
        const inRootCause = (issue.resolutionData?.rootCause ?? '').toLowerCase().includes(q);
        const inSystem = issue.systemAffected.toLowerCase().includes(q);
        const inFinalResolution = (issue.resolutionData?.finalResolution ?? '').toLowerCase().includes(q);
        return inTitle || inDesc || inResolution || inRootCause || inSystem || inFinalResolution;
      });
    }

    // Resolved/Closed first, then by createdAt descending
    return list.sort((a, b) => {
      const aResolved = a.status === 'Resolved' || a.status === 'Closed';
      const bResolved = b.status === 'Resolved' || b.status === 'Closed';
      if (aResolved && !bResolved) return -1;
      if (!aResolved && bResolved) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [issues, search]);

  const resolvedCount = issues.filter(i => i.status === 'Resolved' || i.status === 'Closed').length;

  const highlight = (text: string, query: string): React.ReactNode => {
    if (!query.trim()) return text;
    const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase()
        ? <mark key={i} className="bg-amber-400/30 text-amber-300 rounded px-0.5">{part}</mark>
        : part
    );
  };

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 bg-emerald-400/10 rounded-lg flex items-center justify-center">
              <BookOpen size={18} className="text-emerald-400" />
            </div>
            <h1 className="text-2xl font-bold text-zinc-100">Resolution Library</h1>
          </div>
          <p className="text-sm text-zinc-500 ml-12">
            Search and browse past resolved issues and their solutions.
          </p>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-6 mb-6">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={14} className="text-emerald-400" />
            <span className="text-sm text-zinc-400">
              <span className="font-semibold text-zinc-100">{resolvedCount}</span> resolved issues
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Clock size={14} className="text-zinc-500" />
            <span className="text-sm text-zinc-400">
              <span className="font-semibold text-zinc-100">{issues.length}</span> total issues
            </span>
          </div>
        </div>

        {/* Search bar */}
        <div className="relative mb-8">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by title, description, root cause, or resolution..."
            className="w-full bg-zinc-900 border border-zinc-700 rounded-xl pl-11 pr-10 py-3.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-400/60 focus:ring-1 focus:ring-amber-400/20 transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Results label */}
        {search && (
          <p className="text-xs text-zinc-500 mb-4">
            {results.length === 0
              ? 'No issues found'
              : `${results.length} result${results.length === 1 ? '' : 's'} for "${search}"`}
          </p>
        )}

        {/* Results list */}
        {results.length === 0 && search ? (
          <div className="text-center py-20">
            <AlertTriangle size={36} className="text-zinc-700 mx-auto mb-4" />
            <p className="text-zinc-400 font-medium">No matching issues found</p>
            <p className="text-zinc-600 text-sm mt-1">Try different keywords or clear the search</p>
            <button
              onClick={() => setSearch('')}
              className="mt-4 text-sm text-amber-400 hover:text-amber-300 transition-colors"
            >
              Clear search
            </button>
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-20">
            <BookOpen size={36} className="text-zinc-700 mx-auto mb-4" />
            <p className="text-zinc-400 font-medium">No issues yet</p>
            <p className="text-zinc-600 text-sm mt-1">Issues will appear here once they are created</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {results.map(issue => {
              const isResolved = issue.status === 'Resolved' || issue.status === 'Closed';
              return (
                <div
                  key={issue.id}
                  onClick={() => navigate(`/issues/${issue.id}`)}
                  className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 cursor-pointer hover:border-zinc-600 hover:bg-zinc-800/50 transition-all duration-150 group"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Title row */}
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-xs font-mono text-zinc-500">{issue.id}</span>
                        {isResolved && (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 rounded-full px-2 py-0.5">
                            <CheckCircle2 size={10} />
                            Has Resolution
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-semibold text-zinc-100 group-hover:text-white mb-2 leading-snug">
                        {highlight(issue.title, search)}
                      </h3>

                      {/* Description snippet */}
                      <p className="text-xs text-zinc-500 line-clamp-2 mb-3">
                        {highlight(issue.description, search)}
                      </p>

                      {/* Resolution snippet if exists and search matches */}
                      {isResolved && issue.resolutionData?.rootCause && (
                        <div className="bg-zinc-800/60 border border-zinc-700/50 rounded-lg px-3 py-2 mb-3">
                          <p className="text-xs text-zinc-400 font-medium mb-0.5">Root Cause</p>
                          <p className="text-xs text-zinc-500 line-clamp-2">
                            {highlight(issue.resolutionData.rootCause, search)}
                          </p>
                        </div>
                      )}
                      {isResolved && issue.resolution && !issue.resolutionData?.rootCause && (
                        <div className="bg-zinc-800/60 border border-zinc-700/50 rounded-lg px-3 py-2 mb-3">
                          <p className="text-xs text-zinc-400 font-medium mb-0.5">Resolution</p>
                          <p className="text-xs text-zinc-500 line-clamp-2">
                            {highlight(issue.resolution, search)}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Right side */}
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <SeverityBadge severity={issue.severity} size="sm" />
                      <StatusBadge status={issue.status} size="sm" />
                      <ArrowRight size={14} className="text-zinc-600 group-hover:text-zinc-400 transition-colors mt-1" />
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center gap-4 flex-wrap pt-1">
                    <span className="flex items-center gap-1 text-xs text-zinc-600">
                      <Monitor size={11} />
                      {issue.systemAffected}
                    </span>
                    {issue.assignee && (
                      <span className="flex items-center gap-1 text-xs text-zinc-600">
                        <User size={11} />
                        {issue.assignee}
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-xs text-zinc-600">
                      <Clock size={11} />
                      {isResolved && issue.resolutionData?.resolvedAt
                        ? `Resolved ${formatRelativeTime(issue.resolutionData.resolvedAt)}`
                        : `Created ${formatRelativeTime(issue.createdAt)}`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
