import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllIssues, getConfidenceLevel, rankIssues, calculateConfidenceScore } from '../lib/db';
import { Issue, Tag, ALL_TAGS } from '../types';
import { TagBadge } from '../components/TagBadge';
import { SeverityBadge } from '../components/SeverityBadge';
import { ConfidenceBadge } from '../components/ConfidenceBadge';
import { formatRelativeTime } from '../lib/utils';
import {
  Search,
  BookOpen,
  Star,
  Link,
  Filter,
  ChevronRight,
  Award,
  TrendingUp,
  Shield
} from 'lucide-react';

type LibraryFilter = 'all' | 'master' | 'high-confidence';

export const ResolutionLibrary: React.FC = () => {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [search, setSearch] = useState('');
  const [tagFilter, setTagFilter] = useState<Tag | 'All'>('All');
  const [libraryFilter, setLibraryFilter] = useState<LibraryFilter>('all');
  const navigate = useNavigate();

  useEffect(() => {
    const all = getAllIssues();
    const resolved = all.filter(i => i.status === 'Resolved' || i.status === 'Closed');
    setIssues(rankIssues(resolved));
  }, []);

  const filtered = useCallback(() => {
    return issues.filter(issue => {
      const matchesSearch =
        search === '' ||
        issue.title.toLowerCase().includes(search.toLowerCase()) ||
        issue.description.toLowerCase().includes(search.toLowerCase()) ||
        issue.systemAffected.toLowerCase().includes(search.toLowerCase()) ||
        (issue.resolution?.rootCause?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
        (issue.resolution?.finalResolution?.toLowerCase().includes(search.toLowerCase()) ?? false);
      const matchesTag = tagFilter === 'All' || (issue.tags && issue.tags.includes(tagFilter as Tag));
      const matchesLib =
        libraryFilter === 'all' ||
        (libraryFilter === 'master' && issue.isMasterIncident) ||
        (libraryFilter === 'high-confidence' && (issue.confidenceScore ?? calculateConfidenceScore(issue)) >= 65);
      return matchesSearch && matchesTag && matchesLib;
    });
  }, [issues, search, tagFilter, libraryFilter]);

  const masterCount = issues.filter(i => i.isMasterIncident).length;
  const highConfidenceCount = issues.filter(i => (i.confidenceScore ?? 0) >= 65).length;
  const totalLinked = issues.reduce((sum, i) => sum + (i.linkedIncidentCount ?? 0), 0);

  const results = filtered();

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-amber-400/10 rounded-lg">
              <BookOpen size={20} className="text-amber-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-zinc-100">Resolution Library</h1>
              <p className="text-sm text-zinc-500">Ranked resolutions — proven solutions rise to the top</p>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-zinc-100">{issues.length}</p>
            <p className="text-xs text-zinc-500 mt-1">Total Resolutions</p>
          </div>
          <div className="bg-zinc-900 border border-violet-500/20 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-violet-300">{masterCount}</p>
            <p className="text-xs text-zinc-500 mt-1">Master Incidents</p>
          </div>
          <div className="bg-zinc-900 border border-emerald-500/20 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-emerald-300">{totalLinked}</p>
            <p className="text-xs text-zinc-500 mt-1">Incidents Linked</p>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="space-y-3 mb-6">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Search resolutions, root causes, systems..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Library Filters */}
            {([
              { key: 'all', label: 'All Resolutions', icon: BookOpen },
              { key: 'master', label: 'Master Incidents', icon: Star },
              { key: 'high-confidence', label: 'High Confidence', icon: Shield }
            ] as { key: LibraryFilter; label: string; icon: React.ElementType }[]).map(f => (
              <button
                key={f.key}
                onClick={() => setLibraryFilter(f.key)}
                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                  libraryFilter === f.key
                    ? 'bg-amber-400/15 border-amber-500/40 text-amber-300'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-600'
                }`}
              >
                <f.icon size={12} />
                {f.label}
              </button>
            ))}

            <div className="h-4 w-px bg-zinc-800" />

            {/* Tag Filters */}
            <button
              onClick={() => setTagFilter('All')}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                tagFilter === 'All'
                  ? 'bg-zinc-700 border-zinc-600 text-zinc-200'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-600'
              }`}
            >
              All Tags
            </button>
            {ALL_TAGS.map(tag => (
              <button
                key={tag}
                onClick={() => setTagFilter(tagFilter === tag ? 'All' : tag)}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                  tagFilter === tag
                    ? 'bg-zinc-700 border-zinc-600 text-zinc-200'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-600'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* Results */}
        <div className="space-y-3">
          {results.length === 0 && (
            <div className="text-center py-16">
              <BookOpen size={36} className="text-zinc-700 mx-auto mb-3" />
              <p className="text-zinc-500 text-sm">No resolutions match your search.</p>
            </div>
          )}
          {results.map((issue, idx) => {
            const score = issue.confidenceScore ?? calculateConfidenceScore(issue);
            return (
              <div
                key={issue.id}
                onClick={() => navigate(`/issues/${issue.id}`)}
                className="bg-zinc-900 border border-zinc-800 hover:border-zinc-600 rounded-xl p-5 cursor-pointer transition-all group"
              >
                <div className="flex items-start gap-4">
                  {/* Rank */}
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center">
                    <span className="text-xs font-bold text-zinc-500">#{idx + 1}</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="text-xs font-mono text-zinc-500">{issue.id}</span>
                      {issue.isMasterIncident && (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-300 border border-violet-500/25 font-medium">
                          <Star size={9} fill="currentColor" /> Master Incident
                        </span>
                      )}
                      <ConfidenceBadge score={score} size="sm" />
                      <SeverityBadge severity={issue.severity} size="sm" />
                    </div>

                    <h3 className="text-base font-semibold text-zinc-100 group-hover:text-white mb-1">{issue.title}</h3>
                    <p className="text-xs text-zinc-500 mb-2">{issue.systemAffected}</p>

                    {issue.resolution?.rootCause && (
                      <p className="text-sm text-zinc-400 line-clamp-2 mb-3">
                        <span className="text-zinc-600">Root Cause: </span>
                        {issue.resolution.rootCause}
                      </p>
                    )}

                    {issue.tags && issue.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {issue.tags.map(tag => <TagBadge key={tag} tag={tag} size="sm" />)}
                      </div>
                    )}

                    <div className="flex items-center gap-4 text-xs text-zinc-600">
                      {(issue.linkedIncidentCount ?? 0) > 0 && (
                        <span className="flex items-center gap-1">
                          <Link size={11} /> {issue.linkedIncidentCount} linked incidents
                        </span>
                      )}
                      {(issue.referenceCount ?? 0) > 0 && (
                        <span className="flex items-center gap-1">
                          <TrendingUp size={11} /> {issue.referenceCount} references
                        </span>
                      )}
                      {issue.lastLinkedAt && (
                        <span>Last used {formatRelativeTime(issue.lastLinkedAt)}</span>
                      )}
                    </div>
                  </div>

                  <ChevronRight size={16} className="text-zinc-600 group-hover:text-zinc-400 flex-shrink-0 mt-1 transition-colors" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
