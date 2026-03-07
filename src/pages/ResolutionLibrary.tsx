import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllIssues } from '../lib/db';
import { Issue, Tag, ALL_TAGS } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { SeverityBadge } from '../components/SeverityBadge';
import { TagBadge } from '../components/TagBadge';
import { formatRelativeTime, formatDate } from '../lib/utils';
import { Search, BookOpen, CheckCircle2, Clock, Monitor, User, ArrowRight, X, AlertTriangle } from 'lucide-react';

export const ResolutionLibrary: React.FC = () => {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [search, setSearch] = useState('');
  const [tagFilter, setTagFilter] = useState<Tag | 'All'>('All');
  const navigate = useNavigate();

  useEffect(() => {
    setIssues(getAllIssues());
  }, []);

  const results = useMemo(() => {
    const q = search.toLowerCase().trim();
    let list = issues.filter(i => i.status === 'Resolved' || i.status === 'Closed');

    if (tagFilter !== 'All') {
      list = list.filter(i => i.tags && i.tags.includes(tagFilter as Tag));
    }

    if (q === '') return list;

    return list.filter(issue => {
      const inTitle = issue.title.toLowerCase().includes(q);
      const inDesc = issue.description.toLowerCase().includes(q);
      const inSystem = issue.systemAffected.toLowerCase().includes(q);
      const inResolution = issue.resolution?.toLowerCase().includes(q) ?? false;
      const inRootCause = issue.resolutionDetails?.rootCause.toLowerCase().includes(q) ?? false;
      const inSteps = issue.resolutionDetails?.stepsTaken.toLowerCase().includes(q) ?? false;
      const inFinal = issue.resolutionDetails?.finalResolution.toLowerCase().includes(q) ?? false;
      const inTags = issue.tags?.some(t => t.toLowerCase().includes(q)) ?? false;
      return inTitle || inDesc || inSystem || inResolution || inRootCause || inSteps || inFinal || inTags;
    });
  }, [issues, search, tagFilter]);

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-amber-400/10 rounded-lg">
              <BookOpen size={18} className="text-amber-400" />
            </div>
            <h1 className="text-2xl font-bold text-zinc-100">Resolution Library</h1>
          </div>
          <p className="text-sm text-zinc-500">Browse resolved issues and reuse solutions for recurring problems.</p>
        </div>

        {/* Search + Tag Filter */}
        <div className="space-y-3 mb-6">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Search resolved issues, root causes, tags…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-10 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-400/50 transition-colors"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300">
                <X size={14} />
              </button>
            )}
          </div>

          {/* Tag filter row */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-zinc-500 font-medium">Filter by tag:</span>
            <button
              onClick={() => setTagFilter('All')}
              className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-colors ${
                tagFilter === 'All'
                  ? 'bg-amber-400/20 border-amber-400/40 text-amber-300'
                  : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600'
              }`}
            >
              All
            </button>
            {ALL_TAGS.map(tag => (
              <TagBadge
                key={tag}
                tag={tag}
                size="sm"
                onClick={() => setTagFilter(tagFilter === tag ? 'All' : tag)}
                selected={tagFilter === tag}
              />
            ))}
          </div>
        </div>

        {/* Results count */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs text-zinc-500">
            {results.length} resolved issue{results.length !== 1 ? 's' : ''}
            {tagFilter !== 'All' && <span className="ml-1">tagged <span className="text-zinc-300">#{tagFilter}</span></span>}
          </p>
          {(search || tagFilter !== 'All') && (
            <button
              onClick={() => { setSearch(''); setTagFilter('All'); }}
              className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1 transition-colors"
            >
              <X size={11} /> Clear
            </button>
          )}
        </div>

        {/* Cards */}
        {results.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={20} className="text-zinc-600" />
            </div>
            <p className="text-zinc-500 text-sm font-medium">No resolved issues found</p>
            <p className="text-zinc-600 text-xs mt-1">Try adjusting your search or tag filter.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {results.map(issue => (
              <div
                key={issue.id}
                className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition-colors cursor-pointer group"
                onClick={() => navigate(`/issues/${issue.id}`)}
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-xs font-mono text-zinc-500">{issue.id}</span>
                      <span className="inline-flex items-center gap-1 rounded-full text-xs px-2 py-0.5 font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 size={10} /> Resolved
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-zinc-100 group-hover:text-white">{issue.title}</h3>
                  </div>
                  <SeverityBadge severity={issue.severity} size="sm" />
                </div>

                {/* Tags */}
                {issue.tags && issue.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3" onClick={e => e.stopPropagation()}>
                    {issue.tags.map(tag => (
                      <TagBadge
                        key={tag}
                        tag={tag}
                        size="sm"
                        onClick={() => setTagFilter(tagFilter === tag ? 'All' : tag)}
                        selected={tagFilter === tag}
                      />
                    ))}
                  </div>
                )}

                {issue.resolutionDetails ? (
                  <div className="bg-zinc-800/50 rounded-lg p-3 mb-3 border border-zinc-700/50">
                    <p className="text-xs font-medium text-zinc-400 mb-1">Root Cause</p>
                    <p className="text-xs text-zinc-300 line-clamp-2">{issue.resolutionDetails.rootCause}</p>
                  </div>
                ) : issue.resolution ? (
                  <div className="bg-zinc-800/50 rounded-lg p-3 mb-3 border border-zinc-700/50">
                    <p className="text-xs font-medium text-zinc-400 mb-1">Resolution</p>
                    <p className="text-xs text-zinc-300 line-clamp-2">{issue.resolution}</p>
                  </div>
                ) : null}

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 text-xs text-zinc-500">
                      <Monitor size={11} />
                      {issue.systemAffected}
                    </span>
                    {issue.assignee && (
                      <span className="flex items-center gap-1 text-xs text-zinc-500">
                        <User size={11} />
                        {issue.assignee}
                      </span>
                    )}
                    {issue.resolutionDetails && (
                      <span className="flex items-center gap-1 text-xs text-zinc-500">
                        <Clock size={11} />
                        {formatDate(issue.resolutionDetails.resolvedAt)}
                      </span>
                    )}
                  </div>
                  <span className="flex items-center gap-1 text-xs text-amber-400 group-hover:text-amber-300 transition-colors">
                    View details <ArrowRight size={11} />
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
