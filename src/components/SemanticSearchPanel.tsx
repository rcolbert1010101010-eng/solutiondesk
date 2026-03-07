import React, { useState, useEffect, useRef } from 'react';
import { getAllIssues } from '../lib/db';
import { semanticSearch, SemanticMatch } from '../lib/semanticSearch';
import { SemanticMatchCard } from './SemanticMatchCard';
import { Search, X, Loader2, Lightbulb } from 'lucide-react';
import { Issue } from '../types';
import { useTheme } from '../context/ThemeContext';

interface SemanticSearchPanelProps {
  query?: string;
  currentIssueId?: string;
  onlyResolved?: boolean;
  onSelect?: (issueId: string) => void;
  placeholder?: string;
  label?: string;
  autoSearch?: boolean;
}

export const SemanticSearchPanel: React.FC<SemanticSearchPanelProps> = ({
  query: externalQuery,
  currentIssueId,
  onlyResolved = false,
  onSelect,
  placeholder = 'Describe the issue to find similar past incidents...',
  label = 'Semantic Search',
  autoSearch = false,
}) => {
  const [internalQuery, setInternalQuery] = useState('');
  const [results, setResults] = useState<SemanticMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [allIssues, setAllIssues] = useState<Issue[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const effectiveQuery = externalQuery !== undefined ? externalQuery : internalQuery;

  useEffect(() => {
    setAllIssues(getAllIssues());
  }, []);

  useEffect(() => {
    if (!autoSearch && externalQuery === undefined) return;
    if (!effectiveQuery || effectiveQuery.trim().length < 3) {
      setResults([]);
      setSearched(false);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      runSearch(effectiveQuery);
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [effectiveQuery, allIssues, autoSearch, externalQuery]);

  function runSearch(q: string) {
    if (!q.trim() || q.trim().length < 3) return;
    setLoading(true);
    setTimeout(() => {
      const matches = semanticSearch(q, allIssues, {
        currentIssueId,
        onlyResolved,
        topK: 5,
        minScore: 0.05,
      });
      setResults(matches);
      setSearched(true);
      setLoading(false);
    }, 120);
  }

  const handleManualSearch = () => {
    runSearch(effectiveQuery);
  };

  const isControlled = externalQuery !== undefined;

  return (
    <div className="flex flex-col gap-3">
      {!isControlled && (
        <div>
          <label className={`block text-xs font-medium mb-1.5 ${
            isDark ? 'text-zinc-400' : 'text-slate-600'
          }`}>{label}</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${
                isDark ? 'text-zinc-500' : 'text-slate-400'
              }`} />
              <input
                type="text"
                value={internalQuery}
                onChange={e => setInternalQuery(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleManualSearch(); }}
                placeholder={placeholder}
                className={`w-full border rounded-lg pl-9 pr-9 py-2 text-sm placeholder-zinc-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 ${
                  isDark
                    ? 'bg-zinc-800 border-zinc-700 text-zinc-100'
                    : 'bg-white border-slate-300 text-slate-800 placeholder:text-slate-400'
                }`}
              />
              {internalQuery && (
                <button
                  onClick={() => { setInternalQuery(''); setResults([]); setSearched(false); }}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 ${
                    isDark ? 'text-zinc-500 hover:text-zinc-300' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <X size={12} />
                </button>
              )}
            </div>
            <button
              onClick={handleManualSearch}
              disabled={loading || internalQuery.trim().length < 3}
              className="px-4 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-zinc-900 text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Search
            </button>
          </div>
        </div>
      )}

      {loading && (
        <div className={`flex items-center gap-2 text-sm py-2 ${
          isDark ? 'text-zinc-500' : 'text-slate-400'
        }`}>
          <Loader2 size={14} className="animate-spin" />
          Finding similar issues...
        </div>
      )}

      {!loading && searched && results.length === 0 && (
        <div className="text-center py-6 text-sm">
          <Lightbulb size={20} className={`mx-auto mb-2 ${
            isDark ? 'text-zinc-600' : 'text-slate-300'
          }`} />
          <span className={isDark ? 'text-zinc-500' : 'text-slate-400'}>
            No similar issues found. This may be a new type of problem.
          </span>
        </div>
      )}

      {!loading && results.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className={`text-xs font-medium ${
              isDark ? 'text-zinc-500' : 'text-slate-500'
            }`}>
              {results.length} similar issue{results.length !== 1 ? 's' : ''} found
            </span>
            <span className={`text-xs ${
              isDark ? 'text-zinc-600' : 'text-slate-400'
            }`}>Ranked by relevance</span>
          </div>
          {results.map((match, i) => (
            <SemanticMatchCard
              key={match.issue.id}
              match={match}
              rank={i + 1}
              onSelect={onSelect}
              compact={isControlled}
            />
          ))}
        </div>
      )}
    </div>
  );
};
