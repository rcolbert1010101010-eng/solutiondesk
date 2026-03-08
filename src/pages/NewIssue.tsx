import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { addIssue, getAllIssues } from '../lib/db';
import { Severity, Tag, ALL_TAGS, Issue } from '../types';
import { TagBadge } from '../components/TagBadge';
import { SeverityBadge } from '../components/SeverityBadge';
import { SemanticMatchCard } from '../components/SemanticMatchCard';
import { semanticSearch, SemanticMatch } from '../lib/semanticSearch';
import {
  Save,
  X,
  AlertTriangle,
  Monitor,
  FileText,
  Tag as TagIcon,
  ChevronDown,
  Lightbulb,
  Loader2,
  Zap
} from 'lucide-react';

const SEVERITY_OPTIONS: Severity[] = ['Low', 'Medium', 'High', 'Critical'];

export const NewIssue: React.FC = () => {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [systemAffected, setSystemAffected] = useState('');
  const [severity, setSeverity] = useState<Severity>('Medium');
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [assignee, setAssignee] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Semantic suggestions
  const [allIssues, setAllIssues] = useState<Issue[]>([]);
  const [suggestions, setSuggestions] = useState<SemanticMatch[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [selectedSuggestionId, setSelectedSuggestionId] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setAllIssues(getAllIssues());
  }, []);

  // Build search query from title + description + system
  const searchQuery = [title, description, systemAffected].filter(Boolean).join(' ');

  useEffect(() => {
    if (searchQuery.trim().length < 10) {
      setSuggestions([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSuggestionsLoading(true);
      setTimeout(() => {
        const matches = semanticSearch(searchQuery, allIssues, {
          topK: 4,
          minScore: 0.06,
        });
        setSuggestions(matches);
        setSuggestionsLoading(false);
      }, 100);
    }, 500);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery, allIssues]);

  const toggleTag = (tag: Tag) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!title.trim()) newErrors.title = 'Title is required';
    if (!description.trim()) newErrors.description = 'Description is required';
    if (!systemAffected.trim()) newErrors.systemAffected = 'Affected system is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setTimeout(() => {
      const newIssue = addIssue({
        title: title.trim(),
        description: description.trim(),
        systemAffected: systemAffected.trim(),
        severity,
        status: 'Open',
        assignee: assignee.trim() || undefined,
        tags: selectedTags,
      });
      navigate(`/issues/${newIssue.id}`);
    }, 300);
  };

  const handleSelectSuggestion = (issueId: string) => {
    setSelectedSuggestionId(issueId);
    navigate(`/issues/${issueId}`);
  };

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className={`text-2xl font-bold text-slate-900 dark:text-zinc-100`}>Log New Issue</h1>
            <p className={`text-sm mt-1 text-slate-500 dark:text-zinc-500`}>Capture a new incident or support ticket</p>
          </div>
          <button
            onClick={() => navigate('/issues')}
            className={`flex items-center gap-2 text-sm transition-colors text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-100`}
          >
            <X size={16} /> Cancel
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Form */}
          <form onSubmit={handleSubmit} className="lg:col-span-3 flex flex-col gap-5">

            {/* Title */}
            <div>
              <label className={`block text-xs font-medium mb-1.5 text-slate-700 dark:text-zinc-400`}>
                Issue Title <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Brief description of the problem"
                className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 transition-colors bg-white text-slate-900 placeholder-slate-400 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-500 ${
                  errors.title
                    ? 'border-red-500/50 focus:border-red-500/50 focus:ring-red-500/20'
                    : `border-slate-200 dark:border-zinc-700 focus:border-amber-500/50 focus:ring-amber-500/20`
                }`}
              />
              {errors.title && <p className="text-xs text-red-400 mt-1">{errors.title}</p>}
            </div>

            {/* Description */}
            <div>
              <label className={`block text-xs font-medium mb-1.5 text-slate-700 dark:text-zinc-400`}>
                Description <span className="text-red-400">*</span>
              </label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Detailed description of the issue, symptoms, and impact..."
                rows={5}
                className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 transition-colors resize-none bg-white text-slate-900 placeholder-slate-400 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-500 ${
                  errors.description
                    ? 'border-red-500/50 focus:border-red-500/50 focus:ring-red-500/20'
                    : `border-slate-200 dark:border-zinc-700 focus:border-amber-500/50 focus:ring-amber-500/20`
                }`}
              />
              {errors.description && <p className="text-xs text-red-400 mt-1">{errors.description}</p>}
            </div>

            {/* System Affected */}
            <div>
              <label className={`block text-xs font-medium mb-1.5 text-slate-700 dark:text-zinc-400`}>
                System Affected <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <Monitor size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500`} />
                <input
                  type="text"
                  value={systemAffected}
                  onChange={e => setSystemAffected(e.target.value)}
                  placeholder="e.g. Network / VPN, Email / Exchange, Active Directory"
                  className={`w-full border rounded-lg pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-1 transition-colors bg-white text-slate-900 placeholder-slate-400 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-500 ${
                    errors.systemAffected
                      ? 'border-red-500/50 focus:border-red-500/50 focus:ring-red-500/20'
                      : `border-slate-200 dark:border-zinc-700 focus:border-amber-500/50 focus:ring-amber-500/20`
                  }`}
                />
              </div>
              {errors.systemAffected && <p className="text-xs text-red-400 mt-1">{errors.systemAffected}</p>}
            </div>

            {/* Severity */}
            <div>
              <label className={`block text-xs font-medium mb-1.5 text-slate-700 dark:text-zinc-400`}>Severity</label>
              <div className="flex gap-2 flex-wrap">
                {SEVERITY_OPTIONS.map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSeverity(s)}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                      severity === s
                        ? 'border-amber-500/50 bg-amber-500/10 text-amber-400'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:border-zinc-600'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className={`block text-xs font-medium mb-1.5 text-slate-700 dark:text-zinc-400`}>
                <span className="flex items-center gap-1"><TagIcon size={12} /> Tags</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {ALL_TAGS.map(tag => (
                  <TagBadge
                    key={tag}
                    tag={tag}
                    selected={selectedTags.includes(tag)}
                    onClick={toggleTag}
                  />
                ))}
              </div>
            </div>

            {/* Assignee */}
            <div>
              <label className={`block text-xs font-medium mb-1.5 text-slate-700 dark:text-zinc-400`}>Assignee (optional)</label>
              <input
                type="text"
                value={assignee}
                onChange={e => setAssignee(e.target.value)}
                placeholder="Name of the person handling this issue"
                className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-colors bg-white border-slate-200 text-slate-900 placeholder-slate-400 dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-100 dark:placeholder-zinc-500`}
              />
            </div>

            {/* Submit */}
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 px-6 py-2.5 bg-amber-400 hover:bg-amber-300 text-zinc-900 font-semibold text-sm rounded-lg transition-colors disabled:opacity-50"
              >
                <Save size={16} />
                {submitting ? 'Logging...' : 'Log Issue'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/issues')}
                className={`px-4 py-2.5 border rounded-lg text-sm transition-colors border-slate-200 text-slate-500 hover:text-slate-900 hover:border-slate-300 dark:border-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:border-zinc-600`}
              >
                Cancel
              </button>
            </div>
          </form>

          {/* Suggestions Panel */}
          <div className="lg:col-span-2">
            <div className="sticky top-6">
              <div className={`border rounded-xl overflow-hidden bg-white border-slate-200 dark:bg-zinc-900 dark:border-zinc-800`}>
                <div className={`flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-zinc-800`}>
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 bg-amber-400/10 rounded-md flex items-center justify-center">
                      <Lightbulb size={11} className="text-amber-400" />
                    </div>
                    <span className={`text-xs font-semibold text-slate-900 dark:text-zinc-300`}>Similar Past Issues</span>
                  </div>
                  <button
                    onClick={() => setShowSuggestions(v => !v)}
                    className={`transition-colors text-slate-400 hover:text-slate-700 dark:text-zinc-500 dark:hover:text-zinc-300`}
                  >
                    <ChevronDown size={14} className={`transition-transform ${showSuggestions ? '' : '-rotate-90'}`} />
                  </button>
                </div>

                {showSuggestions && (
                  <div className="p-3">
                    {searchQuery.trim().length < 10 ? (
                      <div className="text-center py-6">
                        <Zap size={20} className={`mx-auto mb-2 text-slate-300 dark:text-zinc-700`} />
                        <p className={`text-xs text-slate-500 dark:text-zinc-500`}>Start filling in the form to see similar past issues suggested here.</p>
                      </div>
                    ) : suggestionsLoading ? (
                      <div className={`flex items-center gap-2 text-xs py-4 justify-center text-slate-500 dark:text-zinc-500`}>
                        <Loader2 size={13} className="animate-spin" />
                        Searching for similar issues...
                      </div>
                    ) : suggestions.length === 0 ? (
                      <div className="text-center py-6">
                        <Lightbulb size={20} className={`mx-auto mb-2 text-slate-300 dark:text-zinc-700`} />
                        <p className={`text-xs text-slate-500 dark:text-zinc-500`}>No similar issues found. This may be a novel incident.</p>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        <p className={`text-xs mb-1 text-slate-500 dark:text-zinc-500`}>
                          {suggestions.length} similar incident{suggestions.length !== 1 ? 's' : ''} found — check before logging.
                        </p>
                        {suggestions.map((match, i) => (
                          <SemanticMatchCard
                            key={match.issue.id}
                            match={match}
                            rank={i + 1}
                            onSelect={handleSelectSuggestion}
                            compact
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
