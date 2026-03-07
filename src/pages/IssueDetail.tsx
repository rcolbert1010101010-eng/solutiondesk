import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getIssueById, updateIssue, deleteIssue, addResolution } from '../lib/db';
import { Issue, Status, Severity, Resolution } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { SeverityBadge } from '../components/SeverityBadge';
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
  FileText
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
            ← Back to Issues
          </button>
        </div>
      </div>
    );
  }

  const handleSave = () => {
    const updated = updateIssue(issue.id, editForm);
    if (updated) {
      setIssue(updated);
      setEditing(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  };

  const handleDelete = () => {
    deleteIssue(issue.id);
    navigate('/issues');
  };

  const handleAddResolution = () => {
    if (!resolutionForm.rootCause.trim() || !resolutionForm.finalResolution.trim()) return;
    const updated = addResolution(issue.id, {
      ...resolutionForm,
      resolvedAt: new Date().toISOString()
    });
    if (updated) {
      setIssue(updated);
      setShowResolutionForm(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  };

  const statuses: Status[] = ['Open', 'Investigating', 'Resolved', 'Closed'];
  const severities: Severity[] = ['Low', 'Medium', 'High', 'Critical'];

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate('/issues')}
            className="flex items-center gap-2 text-zinc-400 hover:text-zinc-100 transition-colors text-sm"
          >
            <ArrowLeft size={16} />
            Back to Issues
          </button>
          <div className="flex items-center gap-2">
            {saveSuccess && (
              <span className="flex items-center gap-1.5 text-sm text-emerald-400">
                <CheckCircle2 size={14} />
                Saved
              </span>
            )}
            {!editing ? (
              <>
                <button
                  onClick={() => setEditing(true)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm transition-colors"
                >
                  <Edit3 size={14} />
                  Edit
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm transition-colors"
                >
                  <Trash2 size={14} />
                  Delete
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => { setEditing(false); setEditForm(issue); }}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm transition-colors"
                >
                  <X size={14} />
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-zinc-900 font-medium text-sm transition-colors"
                >
                  <Save size={14} />
                  Save Changes
                </button>
              </>
            )}
          </div>
        </div>

        {/* Delete Confirm */}
        {showDeleteConfirm && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-between gap-4">
            <p className="text-sm text-red-400">Are you sure you want to delete this issue? This cannot be undone.</p>
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-3 py-1.5 rounded-lg bg-red-500 hover:bg-red-400 text-white text-sm font-medium transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        )}

        {/* Main Card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1 min-w-0">
              <span className="text-xs font-mono text-zinc-500 mb-2 block">{issue.id}</span>
              {editing ? (
                <input
                  type="text"
                  value={editForm.title || ''}
                  onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full text-xl font-bold text-zinc-100 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 focus:outline-none focus:border-amber-400"
                />
              ) : (
                <h1 className="text-xl font-bold text-zinc-100">{issue.title}</h1>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {!editing && <SeverityBadge severity={issue.severity} />}
              {!editing && <StatusBadge status={issue.status} />}
            </div>
          </div>

          {/* Meta */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6 p-4 bg-zinc-800/50 rounded-lg">
            <div>
              <p className="text-xs text-zinc-500 mb-1 flex items-center gap-1"><Monitor size={11} /> System</p>
              {editing ? (
                <input
                  type="text"
                  value={editForm.systemAffected || ''}
                  onChange={e => setEditForm(f => ({ ...f, systemAffected: e.target.value }))}
                  className="w-full text-xs text-zinc-100 bg-zinc-700 border border-zinc-600 rounded px-2 py-1 focus:outline-none focus:border-amber-400"
                />
              ) : (
                <p className="text-sm text-zinc-200 font-medium">{issue.systemAffected}</p>
              )}
            </div>
            <div>
              <p className="text-xs text-zinc-500 mb-1 flex items-center gap-1"><AlertTriangle size={11} /> Severity</p>
              {editing ? (
                <select
                  value={editForm.severity || issue.severity}
                  onChange={e => setEditForm(f => ({ ...f, severity: e.target.value as Severity }))}
                  className="w-full text-xs text-zinc-100 bg-zinc-700 border border-zinc-600 rounded px-2 py-1 focus:outline-none focus:border-amber-400"
                >
                  {severities.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              ) : (
                <SeverityBadge severity={issue.severity} size="sm" />
              )}
            </div>
            <div>
              <p className="text-xs text-zinc-500 mb-1 flex items-center gap-1"><Clock size={11} /> Status</p>
              {editing ? (
                <select
                  value={editForm.status || issue.status}
                  onChange={e => setEditForm(f => ({ ...f, status: e.target.value as Status }))}
                  className="w-full text-xs text-zinc-100 bg-zinc-700 border border-zinc-600 rounded px-2 py-1 focus:outline-none focus:border-amber-400"
                >
                  {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              ) : (
                <StatusBadge status={issue.status} size="sm" />
              )}
            </div>
            <div>
              <p className="text-xs text-zinc-500 mb-1 flex items-center gap-1"><User size={11} /> Assignee</p>
              {editing ? (
                <input
                  type="text"
                  value={editForm.assignee || ''}
                  onChange={e => setEditForm(f => ({ ...f, assignee: e.target.value }))}
                  placeholder="Unassigned"
                  className="w-full text-xs text-zinc-100 bg-zinc-700 border border-zinc-600 rounded px-2 py-1 focus:outline-none focus:border-amber-400"
                />
              ) : (
                <p className="text-sm text-zinc-200 font-medium">{issue.assignee || <span className="text-zinc-500">Unassigned</span>}</p>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="mb-4">
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Description</p>
            {editing ? (
              <textarea
                value={editForm.description || ''}
                onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                rows={4}
                className="w-full text-sm text-zinc-300 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 focus:outline-none focus:border-amber-400 resize-none"
              />
            ) : (
              <p className="text-sm text-zinc-300 leading-relaxed">{issue.description}</p>
            )}
          </div>

          {/* Created */}
          <div className="flex items-center gap-1 text-xs text-zinc-500">
            <Calendar size={11} />
            Created {formatDate(issue.createdAt)} &middot; {formatRelativeTime(issue.createdAt)}
          </div>
        </div>

        {/* Resolution Section */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
              <FileText size={16} className="text-amber-400" />
              Resolution
            </h2>
            {!showResolutionForm && issue.status !== 'Resolved' && issue.status !== 'Closed' && (
              <button
                onClick={() => setShowResolutionForm(true)}
                className="text-xs px-3 py-1.5 rounded-lg bg-amber-400/10 hover:bg-amber-400/20 text-amber-400 transition-colors"
              >
                + Add Resolution
              </button>
            )}
          </div>

          {issue.resolutionData ? (
            <div className="space-y-4">
              <div>
                <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">Root Cause</p>
                <p className="text-sm text-zinc-300">{issue.resolutionData.rootCause}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">Steps Taken</p>
                <p className="text-sm text-zinc-300 whitespace-pre-wrap">{issue.resolutionData.stepsTaken}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">Final Resolution</p>
                <p className="text-sm text-zinc-300">{issue.resolutionData.finalResolution}</p>
              </div>
              {issue.resolutionData.preventionNotes && (
                <div>
                  <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">Prevention Notes</p>
                  <p className="text-sm text-zinc-300">{issue.resolutionData.preventionNotes}</p>
                </div>
              )}
              <p className="text-xs text-zinc-500">
                Resolved on {formatDate(issue.resolutionData.resolvedAt)}
              </p>
            </div>
          ) : issue.resolution ? (
            <p className="text-sm text-zinc-300">{issue.resolution}</p>
          ) : showResolutionForm ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Root Cause <span className="text-red-400">*</span></label>
                <textarea
                  value={resolutionForm.rootCause}
                  onChange={e => setResolutionForm(f => ({ ...f, rootCause: e.target.value }))}
                  rows={2}
                  placeholder="What caused this issue?"
                  className="w-full text-sm text-zinc-300 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 focus:outline-none focus:border-amber-400 resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Steps Taken</label>
                <textarea
                  value={resolutionForm.stepsTaken}
                  onChange={e => setResolutionForm(f => ({ ...f, stepsTaken: e.target.value }))}
                  rows={3}
                  placeholder="Describe the steps taken to investigate and fix the issue..."
                  className="w-full text-sm text-zinc-300 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 focus:outline-none focus:border-amber-400 resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Final Resolution <span className="text-red-400">*</span></label>
                <textarea
                  value={resolutionForm.finalResolution}
                  onChange={e => setResolutionForm(f => ({ ...f, finalResolution: e.target.value }))}
                  rows={2}
                  placeholder="How was the issue resolved?"
                  className="w-full text-sm text-zinc-300 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 focus:outline-none focus:border-amber-400 resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Prevention Notes</label>
                <textarea
                  value={resolutionForm.preventionNotes}
                  onChange={e => setResolutionForm(f => ({ ...f, preventionNotes: e.target.value }))}
                  rows={2}
                  placeholder="How can this be prevented in the future?"
                  className="w-full text-sm text-zinc-300 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 focus:outline-none focus:border-amber-400 resize-none"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowResolutionForm(false)}
                  className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddResolution}
                  className="px-4 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-zinc-900 font-medium text-sm transition-colors"
                >
                  Save Resolution
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-zinc-500 italic">No resolution recorded yet.</p>
          )}
        </div>
      </div>
    </div>
  );
};
