import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllIssues } from '../lib/db';
import { Issue, Status, Severity, Tag, ALL_TAGS } from '../types';
import { IssueTable } from '../components/IssueTable';
import { IssueCard } from '../components/IssueCard';
import { TagBadge } from '../components/TagBadge';
import { Search, PlusCircle, SlidersHorizontal, LayoutGrid, List, X, Tag as TagIcon } from 'lucide-react';

type ViewMode = 'table' | 'grid';

export const Issues: React.FC = () => {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<Status | 'All'>('All');
  const [severityFilter, setSeverityFilter] = useState<Severity | 'All'>('All');
  const [tagFilter, setTagFilter] = useState<Tag | 'All'>('All');
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [showFilters, setShowFilters] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setIssues(getAllIssues());
  }, []);

  const filtered = useCallback(() => {
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
      const matchesTag = tagFilter === 'All' || (issue.tags && issue.tags.includes(tagFilter as Tag));
      return matchesSearch && matchesStatus && matchesSeverity && matchesTag;
    });
  }, [issues, search, statusFilter, severityFilter, tagFilter]);

  const filteredIssues = filtered();
  const hasActiveFilters = search !== '' || statusFilter !== 'All' || severityFilter !== 'All' || tagFilter !== 'All';

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('All');
    setSeverityFilter('All');
    setTagFilter('All');
  };

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-zinc-100">Issues</h1>
            <p className="text-sm text-zinc-500 mt-1">{filteredIssues.length} issue{filteredIssues.length !== 1 ? 's' : ''} found</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                showFilters || hasActiveFilters
                  ? 'bg-amber-400/10 text-amber-400 border-amber-500/30'
                  : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700'
              }`}
            >
              <SlidersHorizontal size={15} />
              Filters
              {hasActiveFilters && (
                <span className="bg-amber-400 text-zinc-900 rounded-full w-4 h-4 text-xs flex items-center justify-center font-bold">
                  !
                </span>
              )}
            </button>
            <div className="flex border border-zinc-800 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('table')}
                className={`p-2 transition-colors ${
                  viewMode === 'table' ? 'bg-zinc-700 text-zinc-100' : 'bg-zinc-900 text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <List size={16} />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 transition-colors ${
                  viewMode === 'grid' ? 'bg-zinc-700 text-zinc-100' : 'bg-zinc-900 text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <LayoutGrid size={16} />
              </button>
            </div>
            <button
              onClick={() => navigate('/new-issue')}
              className="flex items-center gap-2 px-4 py-2 bg-amber-400 hover:bg-amber-300 text-zinc-900 rounded-lg text-sm font-semibold transition-colors"
            >
              <PlusCircle size={16} />
              New Issue
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Search issues by title, description, system, or tag..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-4 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-amber-500/50 transition-colors"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-4">
            <div className="flex flex-wrap gap-4">
              <div>
                <label className="text-xs text-zinc-500 font-medium uppercase tracking-wider block mb-1.5">Status</label>
                <div className="flex gap-1.5 flex-wrap">
                  {(['All', 'Open', 'Investigating', 'Resolved', 'Closed'] as const).map(s => (
                    <button
                      key={s}
                      onClick={() => setStatusFilter(s)}
                      className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                        statusFilter === s
                          ? 'bg-amber-400/15 text-amber-400 border-amber-500/40'
                          : 'text-zinc-400 border-zinc-700 hover:border-zinc-600'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-zinc-500 font-medium uppercase tracking-wider block mb-1.5">Severity</label>
                <div className="flex gap-1.5 flex-wrap">
                  {(['All', 'Critical', 'High', 'Medium', 'Low'] as const).map(s => (
                    <button
                      key={s}
                      onClick={() => setSeverityFilter(s)}
                      className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                        severityFilter === s
                          ? 'bg-amber-400/15 text-amber-400 border-amber-500/40'
                          : 'text-zinc-400 border-zinc-700 hover:border-zinc-600'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-zinc-500 font-medium uppercase tracking-wider block mb-1.5">Tag</label>
                <div className="flex gap-1.5 flex-wrap">
                  <button
                    onClick={() => setTagFilter('All')}
                    className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                      tagFilter === 'All'
                        ? 'bg-amber-400/15 text-amber-400 border-amber-500/40'
                        : 'text-zinc-400 border-zinc-700 hover:border-zinc-600'
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
              {hasActiveFilters && (
                <div className="flex items-end">
                  <button
                    onClick={clearFilters}
                    className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1 transition-colors"
                  >
                    <X size={12} /> Clear all
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Content */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          {viewMode === 'table' ? (
            <IssueTable issues={filteredIssues} />
          ) : (
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredIssues.length === 0 ? (
                <div className="col-span-full text-center py-20">
                  <p className="text-zinc-500 text-sm">No issues found matching your filters.</p>
                </div>
              ) : (
                filteredIssues.map(issue => (
                  <IssueCard key={issue.id} issue={issue} />
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
