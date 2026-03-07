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
  const activeFilterCount =
    (statusFilter !== 'All' ? 1 : 0) +
    (severityFilter !== 'All' ? 1 : 0) +
    (tagFilter !== 'All' ? 1 : 0);

  const statusOptions: (Status | 'All')[] = ['All', 'Open', 'Investigating', 'Resolved', 'Closed'];
  const severityOptions: (Severity | 'All')[] = ['All', 'Critical', 'High', 'Medium', 'Low'];

  const clearAll = () => {
    setSearch('');
    setStatusFilter('All');
    setSeverityFilter('All');
    setTagFilter('All');
  };

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-zinc-100">Issues</h1>
            <p className="text-sm text-zinc-500 mt-1">{filteredIssues.length} issue{filteredIssues.length !== 1 ? 's' : ''} found</p>
          </div>
          <button
            onClick={() => navigate('/new-issue')}
            className="flex items-center gap-2 bg-amber-400 hover:bg-amber-300 text-zinc-900 font-semibold text-sm px-4 py-2 rounded-lg transition-colors"
          >
            <PlusCircle size={16} />
            New Issue
          </button>
        </div>

        {/* Search + controls */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Search by title, description, system, tag…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-400/50 transition-colors"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300">
                <X size={14} />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowFilters(v => !v)}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
              showFilters || activeFilterCount > 0
                ? 'bg-amber-400/10 border-amber-400/30 text-amber-400'
                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
            }`}
          >
            <SlidersHorizontal size={15} />
            Filters
            {activeFilterCount > 0 && (
              <span className="bg-amber-400 text-zinc-900 text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
          <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-1">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded transition-colors ${
                viewMode === 'table' ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <List size={15} />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded transition-colors ${
                viewMode === 'grid' ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <LayoutGrid size={15} />
            </button>
          </div>
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-4 space-y-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-zinc-300">Filters</span>
              {activeFilterCount > 0 && (
                <button onClick={clearAll} className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1 transition-colors">
                  <X size={12} /> Clear all
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-2 uppercase tracking-wider">Status</label>
                <div className="flex flex-wrap gap-1.5">
                  {statusOptions.map(s => (
                    <button
                      key={s}
                      onClick={() => setStatusFilter(s)}
                      className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-colors ${
                        statusFilter === s
                          ? 'bg-amber-400/20 border-amber-400/40 text-amber-300'
                          : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-2 uppercase tracking-wider">Severity</label>
                <div className="flex flex-wrap gap-1.5">
                  {severityOptions.map(s => (
                    <button
                      key={s}
                      onClick={() => setSeverityFilter(s)}
                      className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-colors ${
                        severityFilter === s
                          ? 'bg-amber-400/20 border-amber-400/40 text-amber-300'
                          : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-2 uppercase tracking-wider">Tag</label>
                <div className="flex flex-wrap gap-1.5">
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
            </div>
          </div>
        )}

        {/* Active tag filter pill */}
        {tagFilter !== 'All' && !showFilters && (
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs text-zinc-500">Tag:</span>
            <TagBadge
              tag={tagFilter as Tag}
              size="sm"
              removable
              onRemove={() => setTagFilter('All')}
            />
          </div>
        )}

        {/* Results */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          {viewMode === 'table' ? (
            <IssueTable issues={filteredIssues} />
          ) : (
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredIssues.length === 0 ? (
                <div className="col-span-2 text-center py-20">
                  <p className="text-zinc-500 text-sm">No issues found matching your filters.</p>
                </div>
              ) : (
                filteredIssues.map(issue => <IssueCard key={issue.id} issue={issue} />)
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
