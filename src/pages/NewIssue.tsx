import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { createIssue, getAllIssues } from '../lib/db';
import { Issue, Severity, Status, Tag, ALL_TAGS } from '../types';
import { TagBadge } from '../components/TagBadge';
import { SeverityBadge } from '../components/SeverityBadge';
import { StatusBadge } from '../components/StatusBadge';
import { ArrowLeft, AlertTriangle, Save, X, Search, Lightbulb, ChevronRight, CheckCircle2 } from 'lucide-react';

const SYSTEMS = [
  'Network / VPN',
  'Email / Exchange',
  'Active Directory / Identity',
  'Microsoft 365 / Licensing',
  'ERP / SAP',
  'Web / Customer Portal',
  'Printing / Hardware',
  'Backup / Storage',
  'Security / Firewall',
  'Database / SQL',
  'Cloud Infrastructure',
  'Endpoint / Workstation',
  'Other'
];

function getSimilarIssues(query: string, allIssues: Issue[]): Issue[] {
  if (!query || query.trim().length < 3) return [];
  const words = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  if (words.length === 0) return [];

  const scored = allIssues
    .map(issue => {
      const searchable = [
        issue.title,
        issue.description,
        issue.systemAffected,
        issue.resolution?.rootCause ?? '',
        issue.resolution?.finalResolution ?? '',
        ...(issue.tags ?? [])
      ].join(' ').toLowerCase();

      let score = 0;
      for (const word of words) {
        if (searchable.includes(word)) score += 1;
        if (issue.title.toLowerCase().includes(word)) score += 2;
      }
      return { issue, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(({ issue }) => issue);

  return scored;
}

export const NewIssue: React.FC = () => {
  const navigate = useNavigate();
  const [submitted, setSubmitted] = useState(false);
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [allIssues, setAllIssues] = useState<Issue[]>([]);
  const [suggestions, setSuggestions] = useState<Issue[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionDismissed, setSuggestionDismissed] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [form, setForm] = useState({
    title: '',
    description: '',
    systemAffected: '',
    severity: 'Medium' as Severity,
    status: 'Open' as Status,
    assignee: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setAllIssues(getAllIssues());
  }, []);

  const runSearch = useCallback((title: string, description: string) => {
    const query = `${title} ${description}`.trim();
    const results = getSimilarIssues(query, allIssues);
    setSuggestions(results);
    if (results.length > 0 && !suggestionDismissed) {
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  }, [allIssues, suggestionDismissed]);

  const handleFieldChange = (field: 'title' | 'description', value: string) => {
    const newForm = { ...form, [field]: value };
    setForm(newForm);
    setSuggestionDismissed(false);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      runSearch(newForm.title, newForm.description);
    }, 350);
  };

  const dismissSuggestions = () => {
    setShowSuggestions(false);
    setSuggestionDismissed(true);
  };

  const handleSuggestionClick = (issue: Issue) => {
    navigate(`/issues/${issue.id}`);
  };

  const toggleTag = (tag: Tag) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.title.trim()) errs.title = 'Title is required';
    if (!form.description.trim()) errs.description = 'Description is required';
    if (!form.systemAffected) errs.systemAffected = 'Please select a system';
    return errs;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    createIssue({
      ...form,
      tags: selectedTags
    });
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={32} className="text-emerald-400" />
          </div>
          <h2 className="text-xl font-bold text-zinc-100 mb-2">Issue Created</h2>
          <p className="text-zinc-500 text-sm mb-6">Your issue has been successfully logged and is now visible in the issues list.</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => navigate('/issues')}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium rounded-lg transition-colors"
            >
              View All Issues
            </button>
            <button
              onClick={() => {
                setSubmitted(false);
                setForm({ title: '', description: '', systemAffected: '', severity: 'Medium', status: 'Open', assignee: '' });
                setSelectedTags([]);
                setSuggestions([]);
                setShowSuggestions(false);
                setSuggestionDismissed(false);
              }}
              className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-zinc-900 text-sm font-bold rounded-lg transition-colors"
            >
              New Issue
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-all"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-zinc-100">New Issue</h1>
            <p className="text-sm text-zinc-500 mt-0.5">Log a new support issue for investigation</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title Field with Suggestions */}
          <div className="relative">
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">
              Issue Title <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={form.title}
              onChange={e => handleFieldChange('title', e.target.value)}
              placeholder="Brief summary of the issue..."
              className={`w-full bg-zinc-900 border ${
                errors.title ? 'border-red-500/60' : 'border-zinc-700'
              } rounded-lg px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-400/60 focus:ring-1 focus:ring-amber-400/20 transition-all`}
            />
            {errors.title && (
              <p className="mt-1 text-xs text-red-400 flex items-center gap-1">
                <AlertTriangle size={11} /> {errors.title}
              </p>
            )}

            {/* Similar Issues Suggestions */}
            {showSuggestions && suggestions.length > 0 && (
              <SimilarIssuesSuggestions
                suggestions={suggestions}
                onSelect={handleSuggestionClick}
                onDismiss={dismissSuggestions}
              />
            )}
          </div>

          {/* Description Field */}
          <div className="relative">
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">
              Description <span className="text-red-400">*</span>
            </label>
            <textarea
              value={form.description}
              onChange={e => handleFieldChange('description', e.target.value)}
              placeholder="Detailed description of the issue, steps to reproduce, impact..."
              rows={5}
              className={`w-full bg-zinc-900 border ${
                errors.description ? 'border-red-500/60' : 'border-zinc-700'
              } rounded-lg px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-400/60 focus:ring-1 focus:ring-amber-400/20 transition-all resize-none`}
            />
            {errors.description && (
              <p className="mt-1 text-xs text-red-400 flex items-center gap-1">
                <AlertTriangle size={11} /> {errors.description}
              </p>
            )}

            {/* Show suggestions below description too if title is empty */}
            {showSuggestions && suggestions.length > 0 && !form.title && (
              <SimilarIssuesSuggestions
                suggestions={suggestions}
                onSelect={handleSuggestionClick}
                onDismiss={dismissSuggestions}
              />
            )}
          </div>

          {/* System + Severity Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                System Affected <span className="text-red-400">*</span>
              </label>
              <select
                value={form.systemAffected}
                onChange={e => setForm({ ...form, systemAffected: e.target.value })}
                className={`w-full bg-zinc-900 border ${
                  errors.systemAffected ? 'border-red-500/60' : 'border-zinc-700'
                } rounded-lg px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-amber-400/60 focus:ring-1 focus:ring-amber-400/20 transition-all`}
              >
                <option value="" className="bg-zinc-900 text-zinc-500">Select a system...</option>
                {SYSTEMS.map(s => (
                  <option key={s} value={s} className="bg-zinc-900">{s}</option>
                ))}
              </select>
              {errors.systemAffected && (
                <p className="mt-1 text-xs text-red-400 flex items-center gap-1">
                  <AlertTriangle size={11} /> {errors.systemAffected}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Severity</label>
              <select
                value={form.severity}
                onChange={e => setForm({ ...form, severity: e.target.value as Severity })}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-amber-400/60 focus:ring-1 focus:ring-amber-400/20 transition-all"
              >
                {(['Low', 'Medium', 'High', 'Critical'] as Severity[]).map(s => (
                  <option key={s} value={s} className="bg-zinc-900">{s}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Assignee + Status Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Assignee</label>
              <input
                type="text"
                value={form.assignee}
                onChange={e => setForm({ ...form, assignee: e.target.value })}
                placeholder="Technician name (optional)"
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-400/60 focus:ring-1 focus:ring-amber-400/20 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Initial Status</label>
              <select
                value={form.status}
                onChange={e => setForm({ ...form, status: e.target.value as Status })}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-amber-400/60 focus:ring-1 focus:ring-amber-400/20 transition-all"
              >
                {(['Open', 'Investigating'] as Status[]).map(s => (
                  <option key={s} value={s} className="bg-zinc-900">{s}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Tags</label>
            <div className="flex flex-wrap gap-2">
              {ALL_TAGS.map(tag => (
                <TagBadge
                  key={tag}
                  tag={tag}
                  selected={selectedTags.includes(tag)}
                  onClick={toggleTag}
                  size="sm"
                />
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-all"
            >
              <X size={15} />
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-2.5 bg-amber-400 hover:bg-amber-300 text-zinc-900 text-sm font-bold rounded-lg transition-all"
            >
              <Save size={15} />
              Create Issue
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Similar Issues Suggestions Panel ──────────────────────────────────────────

interface SimilarIssuesSuggestionsProps {
  suggestions: Issue[];
  onSelect: (issue: Issue) => void;
  onDismiss: () => void;
}

const SimilarIssuesSuggestions: React.FC<SimilarIssuesSuggestionsProps> = ({
  suggestions,
  onSelect,
  onDismiss
}) => {
  return (
    <div className="mt-2 bg-zinc-900 border border-amber-400/30 rounded-xl overflow-hidden shadow-xl z-20">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800 bg-amber-400/5">
        <div className="flex items-center gap-2">
          <Lightbulb size={14} className="text-amber-400" />
          <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Similar Issues Found</span>
          <span className="text-xs text-zinc-500">— review before creating a duplicate</span>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="p-1 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
        >
          <X size={13} />
        </button>
      </div>

      {/* Suggestion list */}
      <ul className="divide-y divide-zinc-800/60">
        {suggestions.map(issue => {
          const isResolved = issue.status === 'Resolved' || issue.status === 'Closed';
          const hasResolution = !!issue.resolution;

          return (
            <li key={issue.id}>
              <button
                type="button"
                onClick={() => onSelect(issue)}
                className="w-full text-left px-4 py-3.5 hover:bg-zinc-800/60 transition-colors group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {/* ID + status badges */}
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-zinc-500">{issue.id}</span>
                      {isResolved && (
                        <span className="inline-flex items-center gap-1 rounded-full text-xs px-2 py-0.5 font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 size={9} />
                          Resolved
                        </span>
                      )}
                      {hasResolution && !isResolved && (
                        <span className="inline-flex items-center gap-1 rounded-full text-xs px-2 py-0.5 font-medium bg-sky-500/10 text-sky-400 border border-sky-500/20">
                          Has fix notes
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <p className="text-sm font-semibold text-zinc-200 group-hover:text-white truncate">
                      {issue.title}
                    </p>

                    {/* Short description */}
                    <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2">
                      {issue.description}
                    </p>

                    {/* Resolution summary if available */}
                    {hasResolution && (
                      <div className="mt-2 bg-emerald-500/5 border border-emerald-500/20 rounded-lg px-3 py-2">
                        <p className="text-xs font-medium text-emerald-400 mb-0.5">Resolution</p>
                        <p className="text-xs text-zinc-400 line-clamp-2">
                          {issue.resolution!.finalResolution || issue.resolution!.rootCause}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Arrow */}
                  <ChevronRight
                    size={15}
                    className="text-zinc-600 group-hover:text-amber-400 flex-shrink-0 mt-1 transition-colors"
                  />
                </div>
              </button>
            </li>
          );
        })}
      </ul>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-zinc-800 bg-zinc-900/50">
        <p className="text-xs text-zinc-600">
          Click any suggestion to review it • or dismiss to continue creating a new issue
        </p>
      </div>
    </div>
  );
};
