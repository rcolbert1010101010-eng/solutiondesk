import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllIssues } from '../lib/db';
import { Issue, Status, Severity, Tag, ALL_TAGS } from '../types';
import { IssueTable } from '../components/IssueTable';
import { IssueCard } from '../components/IssueCard';
import { TagBadge } from '../components/TagBadge';
import { SemanticSearchPanel } from '../components/SemanticSearchPanel';
import { semanticSearch, SemanticMatch } from '../lib/semanticSearch';
import { SemanticMatchCard } from '../components/SemanticMatchCard';
import { Search, PlusCircle, SlidersHorizontal, LayoutGrid, List, X, Tag as TagIcon, Zap, ChevronDown } from 'lucide-react';

type ViewMode = 'table' | 'grid';
type SearchMode = 'keyword' | 'semantic';

export const Issues: React.FC = () => {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [search, setSearch] = useState('');
  const [searchMode, setSearchMode] = useState<SearchMode>('keyword');
  const [statusFilter, setStatusFilter] = useState<Status | 'All'>('All');
  const [severityFilter, setSeverityFilter] = useState<Severity | 'All'>('All');
  const [tagFilter, setTagFilter] = useState<Tag | 'All'>('All');
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [showFilters, setShowFilters] = useState(false);
  const [semanticResults, setSemanticResults] = useState<SemanticMatch[]>([]);
  const [semanticLoading, setSemanticLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setIssues(getAllIssues());
  }, []);

  // Run semantic search when in semantic mode
  useEffect(() => {
    if (searchMode !== 'semantic' || !search.trim() || search.trim().length < 3) {
      setSemanticResults([]);
      return;
    }
    setSemanticLoading(true);
    const timer = setTimeout(() => {
      const results = semanticSearch(search, issues, { topK: 10, minScore: 0.04 });
      setSemanticResults(results);
      setSemanticLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, searchMode, issues]);

  const filtered = useCallback(() => {
    if (searchMode === 'semantic' && search.trim().length >= 3) {
      // In semantic mode, apply status/severity/tag filters on top of semantic results
      const semanticIssues = semanticResults.map(r => r.issue);
      return semanticIssues.filter(issue => {
        const matchesStatus = statusFilter === 'All' || issue.status === statusFilter;
        const matchesSeverity = severityFilter === 'All' || issue.severity === severityFilter;
        const matchesTag = tagFilter === 'All' || (issue.tags && issue.tags.includes(tagFilter));
        return matchesStatus && matchesSeverity && matchesTag;
      });
    }

    return issues.filter(issue => {
      const matchesSearch =
        search === '' ||
        issue.title.toLowerCase().includes(search.toLowerCase()) ||
        issue.description.toLowerCase().includes(search.toLowerCase()) ||
        issue.systemAffected.toLowerCase().includes(search.toLowerCase()) ||
        issue.id.toLowerCase().includes(search.toLowerCase()) ||
        (issue.tags && issue.tags.some(t => t.toLowerCase().includes(search.toLowerCase())));
      const matchesStatus = statusFilter === 'All' || issue.status === statusFilter;
      const matchesSeverity = severityFilter === 'All' || issue.severity === severityFilter;
      const matchesTag = tagFilter === 'All' || (issue.tags && issue.tags.includes(tagFilter));
      return matchesSearch && matchesStatus && matchesSeverity && matchesTag;
    });
  }, [issues, search, searchMode, statusFilter, severityFilter, tagFilter, semanticResults]);

  const displayIssues = filtered();

  const activeFilterCount = [
    statusFilter !== 'All',
    severityFilter !== 'All',
    tagFilter !== 'All'
  ].filter(Boolean).length;

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className={`text-2xl font-bold text-slate-900 dark:text-zinc-100`}>Issues</h1>
            <p className={`text-sm mt-1 text-slate-500 dark:text-zinc-500`}>{issues.length} total incidents tracked</p>
          </div>
          <button
            onClick={() => navigate('/new-issue')}
            className="flex items-center gap-2 px-4 py-2 bg-amber-400 hover:bg-amber-300 text-zinc-900 font-semibold text-sm rounded-lg transition-colors"
          >
            <PlusCircle size={16} />
            New Issue
          </button>
        </div>

        {/* Search + Filters */}
        <div className="flex flex-col gap-3 mb-6">
          <div className="flex gap-3 items-center">
            {/* Search Mode Toggle */}
            <div className={`flex rounded-lg border overflow-hidden flex-shrink-0 border-slate-200 dark:border-zinc-700`}>
              <button
                onClick={() => setSearchMode('keyword')}
                className={`px-3 py-2 text-xs font-medium flex items-center gap-1.5 transition-colors ${
                  searchMode === 'keyword'
                    ? 'bg-slate-100 text-slate-900 dark:bg-zinc-700 dark:text-zinc-100'
                    : 'bg-white text-slate-500 hover:text-slate-700 dark:bg-zinc-900 dark:text-zinc-500 dark:hover:text-zinc-300'
                }`}
              >
                <Search size={11} /> Keyword
              </button>
              <button
                onClick={() => setSearchMode('semantic')}
                className={`px-3 py-2 text-xs font-medium flex items-center gap-1.5 transition-colors ${
                  searchMode === 'semantic'
                    ? 'bg-amber-500/20 text-amber-400'
                    : 'bg-white text-slate-500 hover:text-slate-700 dark:bg-zinc-900 dark:text-zinc-500 dark:hover:text-zinc-300'
                }`}
              >
                <Zap size={11} /> Semantic
              </button>
            </div>

            {/* Search Box */}
            <div className="relative flex-1">
              <Search size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500`} />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={
                  searchMode === 'semantic'
                    ? 'Describe the problem to find semantically similar issues...'
                    : 'Search by title, description, system, ID, or tag...'
                }
                className={`w-full border rounded-lg pl-9 pr-9 py-2 text-sm focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 bg-white border-slate-200 text-slate-900 placeholder-slate-400 dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-100 dark:placeholder-zinc-500`}
              />
              {search && (
                <button
                  onClick={() => { setSearch(''); setSemanticResults([]); }}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:text-zinc-500 dark:hover:text-zinc-300`}
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(v => !v)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                showFilters || activeFilterCount > 0
                  ? 'border-amber-500/50 bg-amber-500/10 text-amber-400'
                  : 'border-slate-200 bg-white text-slate-500 hover:text-slate-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
              }`}
            >
              <SlidersHorizontal size={14} />
              Filters
              {activeFilterCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-amber-400 text-zinc-900 text-xs font-bold flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* View Toggle */}
            <div className={`flex rounded-lg border overflow-hidden border-slate-200 dark:border-zinc-700`}>
              <button
                onClick={() => setViewMode('table')}
                className={`p-2 transition-colors ${
                  viewMode === 'table'
                    ? 'bg-slate-100 text-slate-900 dark:bg-zinc-700 dark:text-zinc-100'
                    : 'bg-white text-slate-500 hover:text-slate-700 dark:bg-zinc-900 dark:text-zinc-500 dark:hover:text-zinc-300'
                }`}
              >
                <List size={14} />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-slate-100 text-slate-900 dark:bg-zinc-700 dark:text-zinc-100'
                    : 'bg-white text-slate-500 hover:text-slate-700 dark:bg-zinc-900 dark:text-zinc-500 dark:hover:text-zinc-300'
                }`}
              >
                <LayoutGrid size={14} />
              </button>
            </div>
          </div>

          {/* Semantic mode hint */}
          {searchMode === 'semantic' && !search && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/5 border border-amber-500/15 text-xs text-amber-400/80">
              <Zap size={11} />
              Semantic mode finds issues even when the wording is different — powered by concept matching.
            </div>
          )}

          {/* Expanded Filters */}
          {showFilters && (
            <div className={`flex flex-wrap gap-4 p-4 border rounded-xl bg-white border-slate-200 dark:bg-zinc-900 dark:border-zinc-800`}>
              {/* Status */}
              <div className="flex flex-col gap-1.5">
                <label className={`text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-zinc-500`}>Status</label>
                <div className="flex gap-1.5 flex-wrap">
                  {(['All', 'Open', 'Investigating', 'Resolved', 'Closed'] as const).map(s => (
                    <button
                      key={s}
                      onClick={() => setStatusFilter(s)}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                        statusFilter === s
                          ? 'bg-amber-400/15 text-amber-400 border border-amber-500/30'
                          : 'bg-slate-50 text-slate-700 border border-slate-200 hover:border-slate-300 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-600'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Severity */}
              <div className="flex flex-col gap-1.5">
                <label className={`text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-zinc-500`}>Severity</label>
                <div className="flex gap-1.5 flex-wrap">
                  {(['All', 'Low', 'Medium', 'High', 'Critical'] as const).map(s => (
                    <button
                      key={s}
                      onClick={() => setSeverityFilter(s)}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                        severityFilter === s
                          ? 'bg-amber-400/15 text-amber-400 border border-amber-500/30'
                          : 'bg-slate-50 text-slate-700 border border-slate-200 hover:border-slate-300 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-600'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tags */}
              <div className="flex flex-col gap-1.5">
                <label className={`text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-zinc-500`}>
                  <span className="flex items-center gap-1"><TagIcon size={10} /> Tags</span>
                </label>
                <div className="flex gap-1.5 flex-wrap">
                  <button
                    onClick={() => setTagFilter('All')}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                      tagFilter === 'All'
                        ? 'bg-amber-400/15 text-amber-400 border border-amber-500/30'
                        : 'bg-slate-50 text-slate-700 border border-slate-200 hover:border-slate-300 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-600'
                    }`}
                  >
                    All
                  </button>
                  {ALL_TAGS.map(tag => (
                    <TagBadge
                      key={tag}
                      tag={tag}
                      selected={tagFilter === tag}
                      onClick={() => setTagFilter(tagFilter === tag ? 'All' : tag)}
                    />
                  ))}
                </div>
              </div>

              {activeFilterCount > 0 && (
                <button
                  onClick={() => { setStatusFilter('All'); setSeverityFilter('All'); setTagFilter('All'); }}
                  className={`flex items-center gap-1 text-xs transition-colors mt-auto text-slate-500 hover:text-red-500 dark:text-zinc-500 dark:hover:text-red-400`}
                >
                  <X size={11} /> Clear filters
                </button>
              )}
            </div>
          )}
        </div>

        {/* Semantic Results View */}
        {searchMode === 'semantic' && search.trim().length >= 3 && (
          <div className="mb-6">
            {semanticLoading ? (
              <div className={`flex items-center gap-2 text-sm py-4 text-slate-500 dark:text-zinc-500`}>
                <div className={`w-4 h-4 border-2 border-t-amber-400 rounded-full animate-spin border-slate-300 dark:border-zinc-600`} />
                Finding semantically similar issues...
              </div>
            ) : semanticResults.length > 0 ? (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap size={14} className="text-amber-400" />
                    <span className={`text-sm font-semibold text-slate-700 dark:text-zinc-300`}>
                      {semanticResults.length} semantically similar issue{semanticResults.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <span className={`text-xs text-slate-500 dark:text-zinc-500`}>Ranked by relevance + confidence</span>
                </div>
                {semanticResults
                  .filter(r => {
                    const issue = r.issue;
                    const matchesStatus = statusFilter === 'All' || issue.status === statusFilter;
                    const matchesSeverity = severityFilter === 'All' || issue.severity === severityFilter;
                    const matchesTag = tagFilter === 'All' || (issue.tags && issue.tags.includes(tagFilter));
                    return matchesStatus && matchesSeverity && matchesTag;
                  })
                  .map((match, i) => (
                    <SemanticMatchCard
                      key={match.issue.id}
                      match={match}
                      rank={i + 1}
                    />
                  ))}
              </div>
            ) : (
              <div className="text-center py-10">
                <Zap size={24} className={`mx-auto mb-3 text-slate-300 dark:text-zinc-700`} />
                <p className={`text-sm text-slate-500 dark:text-zinc-500`}>No semantically similar issues found for this query.</p>
                <p className={`text-xs mt-1 text-slate-400 dark:text-zinc-600`}>Try different wording or switch to keyword search.</p>
              </div>
            )}
          </div>
        )}

        {/* Standard Issues List (keyword mode or semantic mode with no query) */}
        {(searchMode === 'keyword' || search.trim().length < 3) && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className={`text-sm text-slate-500 dark:text-zinc-500`}>
                {displayIssues.length} issue{displayIssues.length !== 1 ? 's' : ''}
                {search && searchMode === 'keyword' && ` matching "${search}"`}
              </span>
            </div>
            {viewMode === 'table' ? (
              <IssueTable issues={displayIssues} />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {displayIssues.map(issue => (
                  <IssueCard key={issue.id} issue={issue} />
                ))}
                {displayIssues.length === 0 && (
                  <div className="col-span-full text-center py-20">
                    <p className={`text-sm text-slate-500 dark:text-zinc-500`}>No issues found matching your filters.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
