import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createIssue } from '../lib/db';
import { Severity, Tag, ALL_TAGS } from '../types';
import { TagBadge } from '../components/TagBadge';
import { ArrowLeft, PlusCircle, AlertTriangle } from 'lucide-react';

export const NewIssue: React.FC = () => {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [systemAffected, setSystemAffected] = useState('');
  const [severity, setSeverity] = useState<Severity>('Medium');
  const [assignee, setAssignee] = useState('');
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [error, setError] = useState('');

  const toggleTag = (tag: Tag) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!title.trim()) { setError('Title is required.'); return; }
    if (!description.trim()) { setError('Description is required.'); return; }
    if (!systemAffected.trim()) { setError('System affected is required.'); return; }

    createIssue({
      title: title.trim(),
      description: description.trim(),
      systemAffected: systemAffected.trim(),
      severity,
      status: 'Open',
      assignee: assignee.trim() || undefined,
      tags: selectedTags
    });

    navigate('/issues');
  };

  const severities: Severity[] = ['Low', 'Medium', 'High', 'Critical'];
  const severityColors: Record<Severity, string> = {
    Low: 'border-zinc-500/40 text-zinc-400',
    Medium: 'border-sky-500/40 text-sky-400',
    High: 'border-orange-500/40 text-orange-400',
    Critical: 'border-red-500/40 text-red-400'
  };
  const severityActiveColors: Record<Severity, string> = {
    Low: 'bg-zinc-500/20 border-zinc-500 text-zinc-300',
    Medium: 'bg-sky-500/20 border-sky-500 text-sky-300',
    High: 'bg-orange-500/20 border-orange-500 text-orange-300',
    Critical: 'bg-red-500/20 border-red-500 text-red-300'
  };

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-2xl mx-auto px-6 py-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 mb-6 transition-colors"
        >
          <ArrowLeft size={16} /> Back
        </button>

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-zinc-100">Create New Issue</h1>
          <p className="text-sm text-zinc-500 mt-1">Document a new IT support issue</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
              <AlertTriangle size={15} />
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Title *</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Brief description of the issue"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-amber-500/50 transition-colors"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Description *</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Detailed description of the issue, symptoms, and impact..."
              rows={5}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-amber-500/50 transition-colors resize-none"
            />
          </div>

          {/* System Affected */}
          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">System Affected *</label>
            <input
              type="text"
              value={systemAffected}
              onChange={e => setSystemAffected(e.target.value)}
              placeholder="e.g. Network / VPN, Active Directory, Microsoft 365..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-amber-500/50 transition-colors"
            />
          </div>

          {/* Severity */}
          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Severity</label>
            <div className="flex gap-2 flex-wrap">
              {severities.map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSeverity(s)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                    severity === s ? severityActiveColors[s] : severityColors[s] + ' bg-transparent hover:bg-zinc-800'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Tags</label>
            <div className="flex gap-2 flex-wrap">
              {ALL_TAGS.map(tag => (
                <TagBadge
                  key={tag}
                  tag={tag}
                  size="md"
                  selected={selectedTags.includes(tag)}
                  onClick={toggleTag}
                />
              ))}
            </div>
          </div>

          {/* Assignee */}
          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Assignee</label>
            <input
              type="text"
              value={assignee}
              onChange={e => setAssignee(e.target.value)}
              placeholder="Assign to a team member (optional)"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-amber-500/50 transition-colors"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex-1 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-zinc-900 rounded-lg text-sm font-semibold transition-colors"
            >
              <PlusCircle size={16} />
              Create Issue
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
