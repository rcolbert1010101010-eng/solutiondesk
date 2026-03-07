import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getIssueById, updateIssue, deleteIssue } from '../lib/db';
import { Issue, Status, Severity } from '../types';
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
  Clock
} from 'lucide-react';

export const IssueDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [issue, setIssue] = useState<Issue | null>(null);
  const [editing, setEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [editForm, setEditForm] = useState<Partial<Issue>>({});

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
      setTimeout(() => setSaveSuccess(false), 2500);
    }
  };

  const handleDelete = () => {
    deleteIssue(issue.id);
    navigate('/issues');
  };

  const handleStatusChange = (status: Status) => {
    const updated = updateIssue(issue.id, { status });
    if (updated) setIssue(updated);
  };

  const statusOptions: Status[] = ['Open', 'Investigating', 'Resolved', 'Closed'];
  const severityOptions: Severity[] = ['Low', 'Medium', 'High', 'Critical'];

  const SYSTEMS = [
    'Network / VPN', 'Email / Exchange', 'Active Directory / Identity',
    'Microsoft 365 / Licensing', 'ERP / SAP', 'Web / Customer Portal',
    'Printing / Hardware', 'Backup / Storage', 'Security / Firewall',
    'Database / SQL', 'Cloud Infrastructure', 'Endpoint / Workstation', 'Other'
  ];

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <button
            onClick={() => navigate('/issues')}
            className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-100 transition-colors group"
          >
            <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
            All Issues
          </button>
          <div className="flex items-center gap-2">
            {saveSuccess && (
              <span className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-3 py-1.5 rounded-lg">
                <CheckCircle2 size={12} /> Saved
              </span>
            )}
            {!editing ? (
              <>
                <button
                  onClick={() => setEditing(true)}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-lg border border-zinc-700 text-sm font-medium text-zinc-400 hover:text-zinc-100 hover:border-zinc-600 transition-colors"
                >
                  <Edit3 size={14} /> Edit
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-lg border border-red-500/20 text-sm font-medium text-red-400 hover:bg-red-500/10 hover:border-red-500/40 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => { setEditing(false); setEditForm(issue); }}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-lg border border-zinc-700 text-sm font-medium text-zinc-400 hover:text-zinc-100 transition-colors"
                >
                  <X size={14} /> Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-zinc-900 text-sm font-semibold transition-colors"
                >
                  <Save size={14} /> Save Changes
                </button>
              </>
            )}
          </div>
        </div>

        {/* Delete Confirm */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
            <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-sm">
              <div className="w-10 h-10 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
                <Trash2 size={18} className="text-red-400" />
              </div>
              <h3 className="text-base font-semibold text-zinc-100 mb-1">Delete Issue</h3>
              <p className="text-sm text-zinc-400 mb-6">Are you sure you want to delete <strong className="text-zinc-200">{issue.title}</strong>? This action cannot be undone.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-2.5 rounded-lg border border-zinc-700 text-sm font-medium text-zinc-400 hover:text-zinc-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 py-2.5 rounded-lg bg-red-500 hover:bg-red-400 text-white text-sm font-semibold transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 flex flex-col gap-5">
            {/* Title & Description */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-mono text-zinc-500">{issue.id}</span>
                <StatusBadge status={issue.status} />
                <SeverityBadge severity={issue.severity} />
              </div>

              {editing ? (
                <input
                  type="text"
                  value={editForm.title || ''}
                  onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-lg font-bold text-zinc-100 focus:outline-none focus:border-amber-400/50 mb-4"
                />
              ) : (
                <h1 className="text-xl font-bold text-zinc-100 mb-4">{issue.title}</h1>
              )}

              <div>
                <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Description</p>
                {editing ? (
                  <textarea
                    rows={5}
                    value={editForm.description || ''}
                    onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-amber-400/50 resize-none"
                  />
                ) : (
                  <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{issue.description}</p>
                )}
              </div>
            </div>

            {/* Resolution */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 size={16} className={issue.resolution ? 'text-emerald-400' : 'text-zinc-600'} />
                <p className="text-sm font-semibold text-zinc-200">Resolution Notes</p>
                {!issue.resolution && !editing && (
                  <span className="text-xs text-zinc-600 bg-zinc-800 px-2 py-0.5 rounded-full">Not yet resolved</span>
                )}
              </div>
              {editing ? (
                <textarea
                  rows={4}
                  placeholder="Describe the resolution steps taken..."
                  value={editForm.resolution || ''}
                  onChange={e => setEditForm(f => ({ ...f, resolution: e.target.value }))}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-400/50 resize-none"
                />
              ) : issue.resolution ? (
                <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-lg p-4">
                  <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{issue.resolution}</p>
                </div>
              ) : (
                <div className="bg-zinc-800/50 rounded-lg p-4 text-center">
                  <Clock size={20} className="text-zinc-600 mx-auto mb-2" />
                  <p className="text-sm text-zinc-500">No resolution recorded yet.</p>
                  <p className="text-xs text-zinc-600 mt-0.5">Edit this issue to add resolution steps once resolved.</p>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar / Meta */}
          <div className="flex flex-col gap-4">
            {/* Properties */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4">Properties</p>
              <div className="flex flex-col gap-4">
                {/* Status */}
                <div>
                  <p className="text-xs text-zinc-600 mb-2">Status</p>
                  {editing ? (
                    <div className="grid grid-cols-2 gap-1.5">
                      {statusOptions.map(s => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setEditForm(f => ({ ...f, status: s }))}
                          className={`py-1.5 px-2 rounded-lg border text-xs font-medium transition-all ${
                            editForm.status === s
                              ? 'border-amber-400/50 bg-amber-400/10 text-amber-300'
                              : 'border-zinc-700 bg-zinc-800 text-zinc-500 hover:border-zinc-600'
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {statusOptions.map(s => (
                        <button
                          key={s}
                          onClick={() => handleStatusChange(s)}
                          title={`Set status to ${s}`}
                          className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                            issue.status === s
                              ? 'border-amber-400/40 bg-amber-400/10 text-amber-300 font-medium'
                              : 'border-zinc-700 text-zinc-500 hover:border-zinc-600 hover:text-zinc-400'
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Severity */}
                <div>
                  <p className="text-xs text-zinc-600 mb-2">Severity</p>
                  {editing ? (
                    <div className="grid grid-cols-2 gap-1.5">
                      {severityOptions.map(s => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setEditForm(f => ({ ...f, severity: s }))}
                          className={`py-1.5 px-2 rounded-lg border text-xs font-medium transition-all ${
                            editForm.severity === s
                              ? 'border-amber-400/50 bg-amber-400/10 text-amber-300'
                              : 'border-zinc-700 bg-zinc-800 text-zinc-500 hover:border-zinc-600'
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <SeverityBadge severity={issue.severity} />
                  )}
                </div>

                {/* System */}
                <div>
                  <p className="text-xs text-zinc-600 mb-2">System Affected</p>
                  {editing ? (
                    <select
                      value={editForm.systemAffected || ''}
                      onChange={e => setEditForm(f => ({ ...f, systemAffected: e.target.value }))}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-amber-400/50"
                    >
                      {SYSTEMS.map(s => (
                        <option key={s} value={s} className="bg-zinc-800">{s}</option>
                      ))}
                    </select>
                  ) : (
                    <span className="flex items-center gap-1.5 text-xs text-zinc-300">
                      <Monitor size={12} className="text-zinc-500" />
                      {issue.systemAffected}
                    </span>
                  )}
                </div>

                {/* Assignee */}
                <div>
                  <p className="text-xs text-zinc-600 mb-2">Assignee</p>
                  {editing ? (
                    <input
                      type="text"
                      value={editForm.assignee || ''}
                      onChange={e => setEditForm(f => ({ ...f, assignee: e.target.value }))}
                      placeholder="Unassigned"
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-400/50"
                    />
                  ) : (
                    <span className="flex items-center gap-1.5 text-xs text-zinc-300">
                      <User size={12} className="text-zinc-500" />
                      {issue.assignee || <span className="text-zinc-600">Unassigned</span>}
                    </span>
                  )}
                </div>

                {/* Created */}
                <div>
                  <p className="text-xs text-zinc-600 mb-2">Created</p>
                  <span className="flex items-center gap-1.5 text-xs text-zinc-300">
                    <Calendar size={12} className="text-zinc-500" />
                    {formatDate(issue.createdAt)}
                  </span>
                  <p className="text-xs text-zinc-600 mt-0.5 ml-4">{formatRelativeTime(issue.createdAt)}</p>
                </div>
              </div>
            </div>

            {/* Quick Status Change */}
            {!editing && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Quick Actions</p>
                <div className="flex flex-col gap-2">
                  {issue.status !== 'Resolved' && issue.status !== 'Closed' && (
                    <button
                      onClick={() => handleStatusChange('Resolved')}
                      className="w-full py-2 px-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium rounded-lg hover:bg-emerald-500/20 transition-colors flex items-center gap-2"
                    >
                      <CheckCircle2 size={13} /> Mark as Resolved
                    </button>
                  )}
                  {issue.status === 'Open' && (
                    <button
                      onClick={() => handleStatusChange('Investigating')}
                      className="w-full py-2 px-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium rounded-lg hover:bg-amber-500/20 transition-colors flex items-center gap-2"
                    >
                      <AlertTriangle size={13} /> Start Investigating
                    </button>
                  )}
                  {(issue.status === 'Resolved') && (
                    <button
                      onClick={() => handleStatusChange('Closed')}
                      className="w-full py-2 px-3 bg-zinc-800 border border-zinc-700 text-zinc-400 text-xs font-medium rounded-lg hover:bg-zinc-700 transition-colors"
                    >
                      Close Issue
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
