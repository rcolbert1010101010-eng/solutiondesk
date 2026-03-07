import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllIssues } from '../lib/db';
import { Issue, Status, Severity } from '../types';
import { IssueTable } from '../components/IssueTable';
import { IssueCard } from '../components/IssueCard';
import { Search, PlusCircle, SlidersHorizontal, LayoutGrid, List, X } from 'lucide-react';

type ViewMode = 'table' | 'grid';

export const Issues: React.FC = () => {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<Status | 'All'>('All');
  const [severityFilter, setSeverityFilter] = useState<Severity | 'All'>('All');
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
        issue.id.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'All' || issue.status === statusFilter;
      const matchesSeverity = severityFilter === 'All' || issue.severity === severityFilter;
      return matchesSearch && matchesStatus && matchesSeverity;
    });
  }, [issues, search, statusFilter, severityFilter]);

  const filteredIssues = filtered();
  const activeFilterCount = (statusFilter !== 'All' ? 1 : 0) + (severityFilter !== 'All' ? 1 : 0);

  const statusOptions: (Status | 'All')[] = ['All', 'Open', 'Investigating', 'Resolved', 'Closed'];
  const severityOptions: (Severity | 'All')[] = ['All', 'Critical', 'High', 'Medium', 'Low'];

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-zinc-100">Issues</h1>
            <p className="text-sm text-zinc-500 mt-1">
              {filteredIssues.length} of {issues.length} issues
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

        {/* Search and Controls */}
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Search issues by title, system, or ID..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-400/50 focus:ring-1 focus:ring-amber-400/20 transition-colors"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <button
            onClick={() => setShowFilters(f => !f)}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
              showFilters || activeFilterCount > 0
                ? 'bg-amber-400/10 border-amber-400/30 text-amber-400'
                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:border-zinc-700'
            }`}
          >
            <SlidersHorizontal size={14} />
            Filters
            {activeFilterCount > 0 && (
              <span className="w-4 h-4 bg-amber-400 text-zinc-900 rounded-full text-xs flex items-center justify-center font-bold">
                {activeFilterCount}
              </span>
            )}
          </button>

          <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-1">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === 'table' ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <List size={14} />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === 'grid' ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <LayoutGrid size={14} />
            </button>
          </div>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-4 flex flex-wrap gap-6">
            <div>
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Status</p>
              <div className="flex flex-wrap gap-1.5">
                {statusOptions.map(s => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${
                      statusFilter === s
                        ? 'bg-amber-400/10 border-amber-400/30 text-amber-400'
                        : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Severity</p>
              <div className="flex flex-wrap gap-1.5">
                {severityOptions.map(s => (
                  <button
                    key={s}
                    onClick={() => setSeverityFilter(s)}
                    className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${
                      severityFilter === s
                        ? 'bg-amber-400/10 border-amber-400/30 text-amber-400'
                        : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            {activeFilterCount > 0 && (
              <div className="flex items-end">
                <button
                  onClick={() => { setStatusFilter('All'); setSeverityFilter('All'); }}
                  className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1 transition-colors"
                >
                  <X size={12} /> Clear filters
                </button>
              </div>
            )}
          </div>
        )}

        {/* Issues Display */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          {viewMode === 'table' ? (
            <div className="p-4">
              <IssueTable issues={filteredIssues} />
            </div>
          ) : (
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredIssues.length === 0 ? (
                <div className="col-span-2 text-center py-16">
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
