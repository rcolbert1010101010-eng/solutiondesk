import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createIssue } from '../lib/db';
import { Severity, Status, Tag, ALL_TAGS } from '../types';
import { TagBadge } from '../components/TagBadge';
import { ArrowLeft, AlertTriangle, Save, X } from 'lucide-react';

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

export const NewIssue: React.FC = () => {
  const navigate = useNavigate();
  const [submitted, setSubmitted] = useState(false);
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);

  const [form, setForm] = useState({
    title: '',
    description: '',
    systemAffected: '',
    severity: 'Medium' as Severity,
    status: 'Open' as Status,
    assignee: '',
    resolution: ''
  });

  const [errors, setErrors] = useState<Partial<typeof form>>({});

  const toggleTag = (tag: Tag) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const validate = (): boolean => {
    const newErrors: Partial<typeof form> = {};
    if (!form.title.trim()) newErrors.title = 'Title is required';
    if (form.title.trim().length < 5) newErrors.title = 'Title must be at least 5 characters';
    if (!form.description.trim()) newErrors.description = 'Description is required';
    if (form.description.trim().length < 10) newErrors.description = 'Description must be at least 10 characters';
    if (!form.systemAffected) newErrors.systemAffected = 'Please select a system';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    const issue = createIssue({
      title: form.title.trim(),
      description: form.description.trim(),
      systemAffected: form.systemAffected,
      severity: form.severity,
      status: form.status,
      assignee: form.assignee.trim() || undefined,
      resolution: form.resolution.trim(),
      tags: selectedTags
    });
    setSubmitted(true);
    setTimeout(() => navigate(`/issues/${issue.id}`), 1200);
  };

  if (submitted) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="w-14 h-14 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Save size={24} className="text-emerald-400" />
          </div>
          <h2 className="text-lg font-semibold text-zinc-100 mb-1">Issue Created</h2>
          <p className="text-sm text-zinc-500">Redirecting to issue detail…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-2xl mx-auto px-6 py-8">
        <button
          onClick={() => navigate('/issues')}
          className="flex items-center gap-2 text-zinc-400 hover:text-zinc-200 text-sm mb-6 transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Issues
        </button>

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-zinc-100">New Issue</h1>
          <p className="text-sm text-zinc-500 mt-1">Document a new IT issue for tracking and resolution.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">Title <span className="text-red-400">*</span></label>
            <input
              type="text"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Brief description of the issue"
              className={`w-full bg-zinc-900 border rounded-lg px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none transition-colors ${
                errors.title ? 'border-red-500/50 focus:border-red-500' : 'border-zinc-800 focus:border-amber-400/50'
              }`}
            />
            {errors.title && <p className="text-xs text-red-400 mt-1.5">{errors.title}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">Description <span className="text-red-400">*</span></label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Detailed description of the issue, symptoms, and impact"
              rows={4}
              className={`w-full bg-zinc-900 border rounded-lg px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none transition-colors resize-none ${
                errors.description ? 'border-red-500/50 focus:border-red-500' : 'border-zinc-800 focus:border-amber-400/50'
              }`}
            />
            {errors.description && <p className="text-xs text-red-400 mt-1.5">{errors.description}</p>}
          </div>

          {/* System */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">System Affected <span className="text-red-400">*</span></label>
            <select
              value={form.systemAffected}
              onChange={e => setForm(f => ({ ...f, systemAffected: e.target.value }))}
              className={`w-full bg-zinc-900 border rounded-lg px-4 py-2.5 text-sm text-zinc-100 focus:outline-none transition-colors ${
                errors.systemAffected ? 'border-red-500/50 focus:border-red-500' : 'border-zinc-800 focus:border-amber-400/50'
              }`}
            >
              <option value="">Select a system…</option>
              {SYSTEMS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            {errors.systemAffected && <p className="text-xs text-red-400 mt-1.5">{errors.systemAffected}</p>}
          </div>

          {/* Severity + Status */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Severity</label>
              <select
                value={form.severity}
                onChange={e => setForm(f => ({ ...f, severity: e.target.value as Severity }))}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-amber-400/50 transition-colors"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Status</label>
              <select
                value={form.status}
                onChange={e => setForm(f => ({ ...f, status: e.target.value as Status }))}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-amber-400/50 transition-colors"
              >
                <option value="Open">Open</option>
                <option value="Investigating">Investigating</option>
                <option value="Resolved">Resolved</option>
                <option value="Closed">Closed</option>
              </select>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">Tags</label>
            <div className="flex flex-wrap gap-2">
              {ALL_TAGS.map(tag => (
                <TagBadge
                  key={tag}
                  tag={tag}
                  size="md"
                  onClick={toggleTag}
                  selected={selectedTags.includes(tag)}
                />
              ))}
            </div>
            {selectedTags.length > 0 && (
              <p className="text-xs text-zinc-500 mt-2">{selectedTags.length} tag{selectedTags.length !== 1 ? 's' : ''} selected</p>
            )}
          </div>

          {/* Assignee */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">Assignee</label>
            <input
              type="text"
              value={form.assignee}
              onChange={e => setForm(f => ({ ...f, assignee: e.target.value }))}
              placeholder="Name of person responsible (optional)"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-400/50 transition-colors"
            />
          </div>

          {/* Resolution notes */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">Resolution Notes</label>
            <textarea
              value={form.resolution}
              onChange={e => setForm(f => ({ ...f, resolution: e.target.value }))}
              placeholder="Initial resolution notes (optional)"
              rows={3}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-400/50 transition-colors resize-none"
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              className="flex items-center gap-2 bg-amber-400 hover:bg-amber-300 text-zinc-900 font-semibold text-sm px-5 py-2.5 rounded-lg transition-colors"
            >
              <Save size={15} />
              Create Issue
            </button>
            <button
              type="button"
              onClick={() => navigate('/issues')}
              className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium text-sm px-5 py-2.5 rounded-lg transition-colors"
            >
              <X size={15} />
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
