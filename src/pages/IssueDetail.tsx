import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getIssueById, updateIssue, deleteIssue, addResolution } from '../lib/db';
import { Issue, Status, Severity, Resolution, Tag, ALL_TAGS } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { SeverityBadge } from '../components/SeverityBadge';
import { TagBadge } from '../components/TagBadge';
import { formatDate, formatRelativeTime } from '../lib/utils';
import {
  ArrowLeft,
  Edit3,
  Trash2,
  Save,
  X,
  Monitor,
  Calendar,
  User,
  CheckCircle2,
  AlertTriangle,
  Clock,
  FileText,
  Tag as TagIcon
} from 'lucide-react';

export const IssueDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [issue, setIssue] = useState<Issue | null>(null);
  const [editing, setEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showResolutionForm, setShowResolutionForm] = useState(false);

  const [editForm, setEditForm] = useState<Partial<Issue>>({});
  const [editTags, setEditTags] = useState<Tag[]>([]);
  const [resolutionForm, setResolutionForm] = useState<Resolution>({
    rootCause: '',
    stepsTaken: '',
    finalResolution: '',
    preventionNotes: '',
    resolvedAt: new Date().toISOString()
  });

  useEffect(() => {
    if (id) {
      const found = getIssueById(id);
      if (found) {
        setIssue(found);
        setEditForm(found);
        setEditTags(found.tags ?? []);
      }
    }
  }, [id]);

  if (!issue) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle size={40} className="text-zinc-600 mx-auto mb-4" />
          <p className="text-zinc-400 text-base font-medium">Issue not found</p>
          <p className="text-zinc-600 text-sm mt-1">The issue you&apos;re looking for doesn&apos;t exist.</p>
          <button
            onClick={() => navigate('/issues')}
            className="mt-4 text-sm text-amber-400 hover:text-amber-300 transition-colors"
          >
            Back to Issues
          </button>
        </div>
      </div>
    );
  }

  const isResolved = issue.status === 'Resolved' || issue.status === 'Closed';

  const handleSave = () => {
    if (!id) return;
    const updated = updateIssue(id, { ...editForm, tags: editTags });
    if (updated) {
      setIssue(updated);
      setEditForm(updated);
      setEditTags(updated.tags ?? []);
      setEditing(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    }
  };

  const handleDelete = () => {
    if (!id) return;
    deleteIssue(id);
    navigate('/issues');
  };

  const handleAddResolution = () => {
    if (!id) return;
    const updated = addResolution(id, resolutionForm);
    if (updated) {
      setIssue(updated);
      setEditForm(updated);
      setShowResolutionForm(false);
    }
  };

  const toggleEditTag = (tag: Tag) => {
    setEditTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* Back */}
        <button
          onClick={() => navigate('/issues')}
          className="flex items-center gap-2 text-zinc-400 hover:text-zinc-200 text-sm mb-6 transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Issues
        </button>

        {saveSuccess && (
          <div className="mb-4 flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm px-4 py-2.5 rounded-lg">
            <CheckCircle2 size={15} />
            Changes saved successfully
          </div>
        )}

        {/* Header */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-mono text-zinc-500">{issue.id}</span>
                {isResolved && (
                  <span className="inline-flex items-center gap-1 rounded-full text-xs px-2 py-0.5 font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <CheckCircle2 size={10} /> Resolved
                  </span>
                )}
              </div>
              {editing ? (
                <input
                  type="text"
                  value={editForm.title || ''}
                  onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-base font-semibold text-zinc-100 focus:outline-none focus:border-amber-400/50"
                />
              ) : (
                <h1 className="text-xl font-bold text-zinc-100">{issue.title}</h1>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {editing ? (
                <>
                  <button
                    onClick={handleSave}
                    className="flex items-center gap-1.5 bg-amber-400 hover:bg-amber-300 text-zinc-900 font-semibold text-xs px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <Save size={13} /> Save
                  </button>
                  <button
                    onClick={() => { setEditing(false); setEditForm(issue); setEditTags(issue.tags ?? []); }}
                    className="flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <X size={13} /> Cancel
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setEditing(true)}
                    className="flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <Edit3 size={13} /> Edit
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="flex items-center gap-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs px-3 py-1.5 rounded-lg border border-red-500/20 transition-colors"
                  >
                    <Trash2 size={13} /> Delete
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Meta */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5 pt-5 border-t border-zinc-800">
            <div>
              <p className="text-xs text-zinc-500 mb-1.5">Status</p>
              {editing ? (
                <select
                  value={editForm.status || issue.status}
                  onChange={e => setEditForm(f => ({ ...f, status: e.target.value as Status }))}
                  className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-100 focus:outline-none"
                >
                  {(['Open','Investigating','Resolved','Closed'] as Status[]).map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              ) : (
                <StatusBadge status={issue.status} size="sm" />
              )}
            </div>
            <div>
              <p className="text-xs text-zinc-500 mb-1.5">Severity</p>
              {editing ? (
                <select
                  value={editForm.severity || issue.severity}
                  onChange={e => setEditForm(f => ({ ...f, severity: e.target.value as Severity }))}
                  className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-100 focus:outline-none"
                >
                  {(['Low','Medium','High','Critical'] as Severity[]).map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              ) : (
                <SeverityBadge severity={issue.severity} size="sm" />
              )}
            </div>
            <div>
              <p className="text-xs text-zinc-500 mb-1.5">System</p>
              {editing ? (
                <input
                  type="text"
                  value={editForm.systemAffected || ''}
                  onChange={e => setEditForm(f => ({ ...f, systemAffected: e.target.value }))}
                  className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-100 focus:outline-none w-full"
                />
              ) : (
                <span className="flex items-center gap-1 text-xs text-zinc-300">
                  <Monitor size={11} className="text-zinc-500" />
                  {issue.systemAffected}
                </span>
              )}
            </div>
            <div>
              <p className="text-xs text-zinc-500 mb-1.5">Assignee</p>
              {editing ? (
                <input
                  type="text"
                  value={editForm.assignee || ''}
                  onChange={e => setEditForm(f => ({ ...f, assignee: e.target.value }))}
                  placeholder="Unassigned"
                  className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none w-full"
                />
              ) : (
                <span className="flex items-center gap-1 text-xs text-zinc-300">
                  <User size={11} className="text-zinc-500" />
                  {issue.assignee || 'Unassigned'}
                </span>
              )}
            </div>
          </div>

          {/* Dates */}
          <div className="flex items-center gap-4 mt-4 pt-4 border-t border-zinc-800/60">
            <span className="flex items-center gap-1.5 text-xs text-zinc-500">
              <Calendar size={11} />
              Created {formatDate(issue.createdAt)}
            </span>
            <span className="flex items-center gap-1.5 text-xs text-zinc-500">
              <Clock size={11} />
              {formatRelativeTime(issue.createdAt)}
            </span>
          </div>

          {/* Tags */}
          <div className="mt-4 pt-4 border-t border-zinc-800/60">
            <div className="flex items-center gap-2 mb-2">
              <TagIcon size={12} className="text-zinc-500" />
              <span className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Tags</span>
            </div>
            {editing ? (
              <div className="flex flex-wrap gap-2">
                {ALL_TAGS.map(tag => (
                  <TagBadge
                    key={tag}
                    tag={tag}
                    size="sm"
                    onClick={toggleEditTag}
                    selected={editTags.includes(tag)}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {issue.tags && issue.tags.length > 0
                  ? issue.tags.map(tag => <TagBadge key={tag} tag={tag} size="sm" />)
                  : <span className="text-xs text-zinc-600">No tags</span>}
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-5">
          <h2 className="text-sm font-semibold text-zinc-300 mb-3 flex items-center gap-2">
            <FileText size={14} className="text-zinc-500" />
            Description
          </h2>
          {editing ? (
            <textarea
              value={editForm.description || ''}
              onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
              rows={5}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-amber-400/50 resize-none"
            />
          ) : (
            <p className="text-sm text-zinc-400 leading-relaxed whitespace-pre-wrap">{issue.description}</p>
          )}
        </div>

        {/* Resolution Details */}
        {issue.resolutionDetails && (
          <div className="bg-zinc-900 border border-emerald-500/20 rounded-xl p-6 mb-5">
            <h2 className="text-sm font-semibold text-emerald-400 mb-4 flex items-center gap-2">
              <CheckCircle2 size={14} />
              Resolution Details
            </h2>
            <div className="space-y-4">
              {([
                { label: 'Root Cause', value: issue.resolutionDetails.rootCause },
                { label: 'Steps Taken', value: issue.resolutionDetails.stepsTaken },
                { label: 'Final Resolution', value: issue.resolutionDetails.finalResolution },
                { label: 'Prevention Notes', value: issue.resolutionDetails.preventionNotes },
              ]).map(({ label, value }) => value ? (
                <div key={label}>
                  <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">{label}</p>
                  <p className="text-sm text-zinc-300 leading-relaxed">{value}</p>
                </div>
              ) : null)}
              <div>
                <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">Resolved At</p>
                <p className="text-sm text-zinc-300">{formatDate(issue.resolutionDetails.resolvedAt)}</p>
              </div>
            </div>
          </div>
        )}

        {/* Resolution notes */}
        {issue.resolution && !issue.resolutionDetails && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-5">
            <h2 className="text-sm font-semibold text-zinc-300 mb-3 flex items-center gap-2">
              <CheckCircle2 size={14} className="text-emerald-400" />
              Resolution Notes
            </h2>
            <p className="text-sm text-zinc-400 leading-relaxed">{issue.resolution}</p>
          </div>
        )}

        {/* Add Resolution CTA */}
        {!isResolved && !showResolutionForm && (
          <button
            onClick={() => setShowResolutionForm(true)}
            className="w-full flex items-center justify-center gap-2 border border-dashed border-zinc-700 hover:border-emerald-500/50 text-zinc-500 hover:text-emerald-400 text-sm font-medium py-4 rounded-xl transition-colors mb-5"
          >
            <CheckCircle2 size={16} />
            Mark as Resolved — Add Resolution Details
          </button>
        )}

        {/* Resolution Form */}
        {showResolutionForm && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-5">
            <h2 className="text-sm font-semibold text-zinc-300 mb-4 flex items-center gap-2">
              <CheckCircle2 size={14} className="text-emerald-400" />
              Add Resolution Details
            </h2>
            <div className="space-y-4">
              {([
                { key: 'rootCause', label: 'Root Cause', placeholder: 'What caused this issue?' },
                { key: 'stepsTaken', label: 'Steps Taken', placeholder: 'What steps were taken to investigate and fix the issue?' },
                { key: 'finalResolution', label: 'Final Resolution', placeholder: 'How was the issue ultimately resolved?' },
                { key: 'preventionNotes', label: 'Prevention Notes', placeholder: 'How can this be prevented in future?' },
              ] as { key: keyof Resolution; label: string; placeholder: string }[]).map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">{label}</label>
                  <textarea
                    value={resolutionForm[key] as string}
                    onChange={e => setResolutionForm(f => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder}
                    rows={3}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50 resize-none"
                  />
                </div>
              ))}
            </div>
            <div className="flex items-center gap-3 mt-4">
              <button
                onClick={handleAddResolution}
                className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-sm px-4 py-2 rounded-lg transition-colors"
              >
                <Save size={14} /> Save Resolution
              </button>
              <button
                onClick={() => setShowResolutionForm(false)}
                className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm px-4 py-2 rounded-lg transition-colors"
              >
                <X size={14} /> Cancel
              </button>
            </div>
          </div>
        )}

        {/* Delete Confirm */}
        {showDeleteConfirm && (
          <div className="bg-zinc-900 border border-red-500/20 rounded-xl p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-zinc-100 mb-1">Delete this issue?</p>
                <p className="text-xs text-zinc-500 mb-4">This action cannot be undone. The issue and all its data will be permanently removed.</p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleDelete}
                    className="flex items-center gap-2 bg-red-500 hover:bg-red-400 text-white font-semibold text-sm px-4 py-2 rounded-lg transition-colors"
                  >
                    <Trash2 size={14} /> Delete Issue
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm px-4 py-2 rounded-lg transition-colors"
                  >
                    <X size={14} /> Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
