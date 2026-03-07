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
  PlusCircle,
  BookOpen,
  Lightbulb,
  Wrench,
  FileCheck,
  ShieldCheck
} from 'lucide-react';

const statusOptions: Status[] = ['Open', 'Investigating', 'Resolved', 'Closed'];
const severityOptions: Severity[] = ['Low', 'Medium', 'High', 'Critical'];

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

export const IssueDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [issue, setIssue] = useState<Issue | null>(null);
  const [editing, setEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showResolutionForm, setShowResolutionForm] = useState(false);
  const [resolutionSaved, setResolutionSaved] = useState(false);

  const [editForm, setEditForm] = useState<Partial<Issue>>({});

  const [resolutionForm, setResolutionForm] = useState({
    rootCause: '',
    stepsTaken: '',
    finalResolution: '',
    preventionNotes: ''
  });
  const [resolutionErrors, setResolutionErrors] = useState<Partial<typeof resolutionForm>>({});

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
          <p className="text-zinc-600 text-sm mt-1">The issue you're looking for doesn't exist.</p>
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

  const validateResolution = (): boolean => {
    const errors: Partial<typeof resolutionForm> = {};
    if (!resolutionForm.rootCause.trim()) errors.rootCause = 'Root cause is required';
    if (!resolutionForm.stepsTaken.trim()) errors.stepsTaken = 'Steps taken is required';
    if (!resolutionForm.finalResolution.trim()) errors.finalResolution = 'Final resolution summary is required';
    setResolutionErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveResolution = () => {
    if (!validateResolution()) return;
    const resolution: Resolution = {
      rootCause: resolutionForm.rootCause.trim(),
      stepsTaken: resolutionForm.stepsTaken.trim(),
      finalResolution: resolutionForm.finalResolution.trim(),
      preventionNotes: resolutionForm.preventionNotes.trim(),
      resolvedAt: new Date().toISOString()
    };
    const updated = addResolution(issue.id, resolution);
    if (updated) {
      setIssue(updated);
      setEditForm(updated);
      setShowResolutionForm(false);
      setResolutionSaved(true);
      setTimeout(() => setResolutionSaved(false), 4000);
    }
  };

  const isResolved = issue.status === 'Resolved' || issue.status === 'Closed';

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate('/issues')}
            className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors group"
          >
            <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
            Back to Issues
          </button>
          <div className="flex items-center gap-2">
            {!editing && !issue.resolutionData && (
              <button
                onClick={() => setShowResolutionForm(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 rounded-lg text-sm font-medium transition-all"
              >
                <CheckCircle2 size={14} />
                Add Resolution
              </button>
            )}
            {!editing && (
              <button
                onClick={() => { setEditing(true); setEditForm(issue); }}
                className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-700 rounded-lg text-sm font-medium transition-all"
              >
                <Edit3 size={14} />
                Edit
              </button>
            )}
            {editing && (
              <>
                <button
                  onClick={() => { setEditing(false); setEditForm(issue); }}
                  className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-zinc-200 rounded-lg text-sm font-medium transition-all"
                >
                  <X size={14} />
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="flex items-center gap-2 px-3 py-1.5 bg-amber-400 text-zinc-900 hover:bg-amber-300 rounded-lg text-sm font-semibold transition-all"
                >
                  <Save size={14} />
                  Save Changes
                </button>
              </>
            )}
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 rounded-lg text-sm font-medium transition-all"
            >
              <Trash2 size={14} />
              Delete
            </button>
          </div>
        </div>

        {/* Success banners */}
        {saveSuccess && (
          <div className="mb-4 px-4 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-2 text-emerald-400 text-sm">
            <CheckCircle2 size={16} />
            Issue updated successfully.
          </div>
        )}
        {resolutionSaved && (
          <div className="mb-4 px-4 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-2 text-emerald-400 text-sm">
            <CheckCircle2 size={16} />
            Resolution added! Issue status changed to Resolved.
          </div>
        )}

        {/* Issue Card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1 min-w-0">
              <span className="text-xs font-mono text-zinc-500 mb-2 block">{issue.id}</span>
              {editing ? (
                <input
                  value={editForm.title || ''}
                  onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-100 text-lg font-semibold focus:outline-none focus:border-amber-400/60 transition-colors"
                />
              ) : (
                <h1 className="text-xl font-bold text-zinc-100">{issue.title}</h1>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {editing ? (
                <select
                  value={editForm.severity || issue.severity}
                  onChange={e => setEditForm(f => ({ ...f, severity: e.target.value as Severity }))}
                  className="bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1 text-zinc-300 text-sm focus:outline-none focus:border-amber-400/60"
                >
                  {severityOptions.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              ) : (
                <SeverityBadge severity={issue.severity} />
              )}
              {isResolved && !editing && (
                <span className="inline-flex items-center gap-1.5 rounded-full font-medium text-xs px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <CheckCircle2 size={11} />
                  Resolved
                </span>
              )}
            </div>
          </div>

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-4 mb-5 pb-5 border-b border-zinc-800">
            <div className="flex items-center gap-1.5 text-xs text-zinc-500">
              <Calendar size={12} />
              Created {formatDate(issue.createdAt)}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-zinc-500">
              <Clock size={12} />
              {formatRelativeTime(issue.createdAt)}
            </div>
            {issue.assignee && (
              <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                <User size={12} />
                {issue.assignee}
              </div>
            )}
            <div className="flex items-center gap-1.5 text-xs text-zinc-500">
              <Monitor size={12} />
              {issue.systemAffected}
            </div>
          </div>

          {/* Status + System edit row */}
          {editing && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
              <div>
                <label className="block text-xs text-zinc-500 mb-1.5">Status</label>
                <select
                  value={editForm.status || issue.status}
                  onChange={e => setEditForm(f => ({ ...f, status: e.target.value as Status }))}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-300 text-sm focus:outline-none focus:border-amber-400/60"
                >
                  {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1.5">System Affected</label>
                <select
                  value={editForm.systemAffected || issue.systemAffected}
                  onChange={e => setEditForm(f => ({ ...f, systemAffected: e.target.value }))}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-300 text-sm focus:outline-none focus:border-amber-400/60"
                >
                  {SYSTEMS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1.5">Assignee</label>
                <input
                  value={editForm.assignee || ''}
                  onChange={e => setEditForm(f => ({ ...f, assignee: e.target.value }))}
                  placeholder="Unassigned"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-300 text-sm focus:outline-none focus:border-amber-400/60"
                />
              </div>
            </div>
          )}

          {/* Status badge when not editing */}
          {!editing && (
            <div className="flex items-center gap-3 mb-5">
              <StatusBadge status={issue.status} />
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Description</label>
            {editing ? (
              <textarea
                value={editForm.description || ''}
                onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                rows={4}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-zinc-300 text-sm focus:outline-none focus:border-amber-400/60 transition-colors resize-none"
              />
            ) : (
              <p className="text-sm text-zinc-400 leading-relaxed">{issue.description}</p>
            )}
          </div>
        </div>

        {/* Resolution Form */}
        {showResolutionForm && !issue.resolutionData && (
          <div className="bg-zinc-900 border border-emerald-500/30 rounded-xl p-6 mb-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-emerald-500/10 rounded-lg flex items-center justify-center">
                  <CheckCircle2 size={16} className="text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-zinc-100">Add Resolution</h2>
                  <p className="text-xs text-zinc-500">Document how this issue was resolved</p>
                </div>
              </div>
              <button
                onClick={() => { setShowResolutionForm(false); setResolutionErrors({}); }}
                className="text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-5">
              {/* Root Cause */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">
                  <AlertTriangle size={12} className="text-amber-400" />
                  Root Cause <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={resolutionForm.rootCause}
                  onChange={e => setResolutionForm(f => ({ ...f, rootCause: e.target.value }))}
                  placeholder="What was the underlying cause of this issue?"
                  rows={3}
                  className={`w-full bg-zinc-800 border rounded-lg px-3 py-2.5 text-zinc-300 text-sm focus:outline-none transition-colors resize-none placeholder:text-zinc-600 ${
                    resolutionErrors.rootCause ? 'border-red-500/50 focus:border-red-400/60' : 'border-zinc-700 focus:border-emerald-400/60'
                  }`}
                />
                {resolutionErrors.rootCause && (
                  <p className="text-xs text-red-400 mt-1">{resolutionErrors.rootCause}</p>
                )}
              </div>

              {/* Steps Taken */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">
                  <Wrench size={12} className="text-sky-400" />
                  Steps Taken to Fix <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={resolutionForm.stepsTaken}
                  onChange={e => setResolutionForm(f => ({ ...f, stepsTaken: e.target.value }))}
                  placeholder="List the steps you took to resolve this issue..."
                  rows={4}
                  className={`w-full bg-zinc-800 border rounded-lg px-3 py-2.5 text-zinc-300 text-sm focus:outline-none transition-colors resize-none placeholder:text-zinc-600 ${
                    resolutionErrors.stepsTaken ? 'border-red-500/50 focus:border-red-400/60' : 'border-zinc-700 focus:border-emerald-400/60'
                  }`}
                />
                {resolutionErrors.stepsTaken && (
                  <p className="text-xs text-red-400 mt-1">{resolutionErrors.stepsTaken}</p>
                )}
              </div>

              {/* Final Resolution Summary */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">
                  <FileCheck size={12} className="text-emerald-400" />
                  Final Resolution Summary <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={resolutionForm.finalResolution}
                  onChange={e => setResolutionForm(f => ({ ...f, finalResolution: e.target.value }))}
                  placeholder="Briefly summarize how the issue was resolved..."
                  rows={3}
                  className={`w-full bg-zinc-800 border rounded-lg px-3 py-2.5 text-zinc-300 text-sm focus:outline-none transition-colors resize-none placeholder:text-zinc-600 ${
                    resolutionErrors.finalResolution ? 'border-red-500/50 focus:border-red-400/60' : 'border-zinc-700 focus:border-emerald-400/60'
                  }`}
                />
                {resolutionErrors.finalResolution && (
                  <p className="text-xs text-red-400 mt-1">{resolutionErrors.finalResolution}</p>
                )}
              </div>

              {/* Prevention Notes */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">
                  <ShieldCheck size={12} className="text-purple-400" />
                  Prevention Notes
                  <span className="text-zinc-600 font-normal normal-case tracking-normal ml-1">(optional)</span>
                </label>
                <textarea
                  value={resolutionForm.preventionNotes}
                  onChange={e => setResolutionForm(f => ({ ...f, preventionNotes: e.target.value }))}
                  placeholder="How can we prevent this issue from recurring?"
                  rows={3}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-zinc-300 text-sm focus:outline-none focus:border-emerald-400/60 transition-colors resize-none placeholder:text-zinc-600"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => { setShowResolutionForm(false); setResolutionErrors({}); }}
                  className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveResolution}
                  className="flex items-center gap-2 px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-semibold rounded-lg transition-all"
                >
                  <CheckCircle2 size={15} />
                  Save Resolution & Mark Resolved
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Resolution Display */}
        {issue.resolutionData && (
          <div className="bg-zinc-900 border border-emerald-500/20 rounded-xl p-6 mb-6">
            <div className="flex items-center gap-3 mb-5 pb-4 border-b border-zinc-800">
              <div className="w-9 h-9 bg-emerald-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <BookOpen size={18} className="text-emerald-400" />
              </div>
              <div className="flex-1">
                <h2 className="text-base font-semibold text-zinc-100">Resolution Record</h2>
                <p className="text-xs text-zinc-500">
                  Resolved {formatDate(issue.resolutionData.resolvedAt)} · {formatRelativeTime(issue.resolutionData.resolvedAt)}
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full font-medium text-xs px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 size={11} />
                Resolved
              </span>
            </div>

            <div className="space-y-5">
              {/* Root Cause */}
              <div className="bg-zinc-800/50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle size={14} className="text-amber-400" />
                  <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Root Cause</span>
                </div>
                <p className="text-sm text-zinc-300 leading-relaxed">{issue.resolutionData.rootCause}</p>
              </div>

              {/* Steps Taken */}
              <div className="bg-zinc-800/50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Wrench size={14} className="text-sky-400" />
                  <span className="text-xs font-semibold text-sky-400 uppercase tracking-wider">Steps Taken to Fix</span>
                </div>
                <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-line">{issue.resolutionData.stepsTaken}</p>
              </div>

              {/* Final Resolution */}
              <div className="bg-zinc-800/50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <FileCheck size={14} className="text-emerald-400" />
                  <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Final Resolution Summary</span>
                </div>
                <p className="text-sm text-zinc-300 leading-relaxed">{issue.resolutionData.finalResolution}</p>
              </div>

              {/* Prevention Notes */}
              {issue.resolutionData.preventionNotes && (
                <div className="bg-purple-500/5 border border-purple-500/15 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <ShieldCheck size={14} className="text-purple-400" />
                    <span className="text-xs font-semibold text-purple-400 uppercase tracking-wider">Prevention Notes</span>
                  </div>
                  <p className="text-sm text-zinc-300 leading-relaxed">{issue.resolutionData.preventionNotes}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Prompt to add resolution if not resolved */}
        {!issue.resolutionData && !showResolutionForm && issue.status !== 'Closed' && (
          <div className="bg-zinc-900 border border-dashed border-zinc-700 rounded-xl p-5 mb-6">
            <div className="flex items-center gap-4">
              <div className="w-9 h-9 bg-zinc-800 rounded-lg flex items-center justify-center flex-shrink-0">
                <BookOpen size={16} className="text-zinc-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-zinc-400">No resolution recorded yet</p>
                <p className="text-xs text-zinc-600 mt-0.5">Capture the root cause, fix steps, and prevention notes to build your knowledge base.</p>
              </div>
              <button
                onClick={() => setShowResolutionForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 rounded-lg text-sm font-medium transition-all whitespace-nowrap flex-shrink-0"
              >
                <PlusCircle size={14} />
                Add Resolution
              </button>
            </div>
          </div>
        )}

        {/* Delete Confirm */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 max-w-sm w-full shadow-2xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-500/10 rounded-lg flex items-center justify-center">
                  <Trash2 size={18} className="text-red-400" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-zinc-100">Delete Issue</h3>
                  <p className="text-xs text-zinc-500">This action cannot be undone</p>
                </div>
              </div>
              <p className="text-sm text-zinc-400 mb-5">
                Are you sure you want to delete <span className="font-medium text-zinc-200">{issue.title}</span>? All data including resolution records will be permanently removed.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-4 py-2 bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-white rounded-lg text-sm font-medium transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-400 text-white rounded-lg text-sm font-semibold transition-all"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
