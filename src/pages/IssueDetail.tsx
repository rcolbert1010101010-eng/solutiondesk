import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getIssueById,
  updateIssue,
  deleteIssue,
  addResolution,
  promoteToMasterIncident,
  demoteMasterIncident,
  linkIssueToMaster,
  unlinkIssue,
  getRelationshipsForMaster,
  getRelationshipForSource,
  getAllIssues,
  getConfidenceLevel,
  calculateConfidenceScore,
  incrementReferenceCount
} from '../lib/db';
import { Issue, Status, Severity, Resolution, Tag, ALL_TAGS, RelationshipType, IssueRelationship } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { SeverityBadge } from '../components/SeverityBadge';
import { TagBadge } from '../components/TagBadge';
import { ConfidenceBadge } from '../components/ConfidenceBadge';
import { formatDate, formatRelativeTime } from '../lib/utils';
import { useTheme } from '../context/ThemeContext';
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
  Tag as TagIcon,
  Star,
  Link,
  Link2,
  Search,
  Plus,
  ChevronRight,
  Shield,
  BookOpen,
  Copy,
  Check
} from 'lucide-react';

const RELATIONSHIP_LABELS: Record<RelationshipType, string> = {
  duplicate: 'Duplicate',
  similar: 'Similar Issue',
  derived_from: 'Derived From',
  confirmed_same_root_cause: 'Same Root Cause'
};

export const IssueDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [issue, setIssue] = useState<Issue | null>(null);
  const [editing, setEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showResolutionForm, setShowResolutionForm] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkedRelationships, setLinkedRelationships] = useState<IssueRelationship[]>([]);
  const [sourceRelationship, setSourceRelationship] = useState<IssueRelationship | undefined>();
  const [allIssues, setAllIssues] = useState<Issue[]>([]);
  const [linkSearch, setLinkSearch] = useState('');
  const [selectedLinkTarget, setSelectedLinkTarget] = useState<string>('');
  const [selectedRelType, setSelectedRelType] = useState<RelationshipType>('duplicate');
  const [copied, setCopied] = useState(false);
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    systemAffected: '',
    severity: 'Medium' as Severity,
    status: 'Open' as Status,
    assignee: '',
    tags: [] as Tag[]
  });

  const [resolutionForm, setResolutionForm] = useState({
    title: '',
    steps: '',
    notes: ''
  });

  const loadIssue = () => {
    if (!id) return;
    const found = getIssueById(id);
    if (!found) { navigate('/issues'); return; }
    setIssue(found);
    setEditForm({
      title: found.title,
      description: found.description,
      systemAffected: found.systemAffected,
      severity: found.severity,
      status: found.status,
      assignee: found.assignee ?? '',
      tags: found.tags ?? []
    });
    if (found.isMasterIncident) {
      setLinkedRelationships(getRelationshipsForMaster(found.id));
    }
    const srcRel = getRelationshipForSource(found.id);
    setSourceRelationship(srcRel);
  };

  useEffect(() => {
    loadIssue();
    setAllIssues(getAllIssues());
  }, [id]);

  if (!issue) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className={isDark ? 'text-zinc-500' : 'text-slate-500'}>Loading...</p>
      </div>
    );
  }

  const handleSave = () => {
    if (!id) return;
    updateIssue(id, {
      title: editForm.title,
      description: editForm.description,
      systemAffected: editForm.systemAffected,
      severity: editForm.severity,
      status: editForm.status,
      assignee: editForm.assignee || undefined,
      tags: editForm.tags
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
    setEditing(false);
    loadIssue();
  };

  const handleDelete = () => {
    if (!id) return;
    deleteIssue(id);
    navigate('/issues');
  };

  const handleAddResolution = () => {
    if (!id || !resolutionForm.title.trim() || !resolutionForm.steps.trim()) return;
    const steps = resolutionForm.steps.split('\n').filter(s => s.trim());
    addResolution(id, {
      title: resolutionForm.title.trim(),
      steps,
      notes: resolutionForm.notes.trim() || undefined
    });
    setResolutionForm({ title: '', steps: '', notes: '' });
    setShowResolutionForm(false);
    loadIssue();
  };

  const handlePromote = () => {
    if (!id) return;
    promoteToMasterIncident(id);
    loadIssue();
  };

  const handleDemote = () => {
    if (!id) return;
    demoteMasterIncident(id);
    loadIssue();
  };

  const handleLink = () => {
    if (!id || !selectedLinkTarget) return;
    linkIssueToMaster(id, selectedLinkTarget, selectedRelType);
    setShowLinkModal(false);
    setSelectedLinkTarget('');
    setLinkSearch('');
    loadIssue();
  };

  const handleUnlink = () => {
    if (!id) return;
    unlinkIssue(id);
    loadIssue();
  };

  const handleCopyLink = () => {
    const currentUrl = new URL(window.location.href);
    navigator.clipboard.writeText(currentUrl.toString()).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      // fallback
      const textArea = document.createElement('textarea');
      textArea.value = currentUrl.toString();
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleIncrementReference = (resolutionId: string) => {
    if (!id) return;
    incrementReferenceCount(id, resolutionId);
    loadIssue();
  };

  const toggleTag = (tag: Tag) => {
    setEditForm(prev => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag]
    }));
  };

  const isResolved = issue.status === 'Resolved' || issue.status === 'Closed';
  const confidence = getConfidenceLevel(issue);
  const confidenceScore = calculateConfidenceScore(issue);

  const linkableMasters = allIssues.filter(i =>
    i.id !== issue.id &&
    i.isMasterIncident &&
    (linkSearch === '' ||
      i.title.toLowerCase().includes(linkSearch.toLowerCase()) ||
      i.id.toLowerCase().includes(linkSearch.toLowerCase()))
  );

  const masterIssue = sourceRelationship
    ? allIssues.find(i => i.id === sourceRelationship.masterId)
    : undefined;

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Back + Actions */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate('/issues')}
            className={`flex items-center gap-2 text-sm transition-colors ${isDark ? 'text-zinc-400 hover:text-zinc-100' : 'text-slate-500 hover:text-slate-900'}`}
          >
            <ArrowLeft size={16} />
            Back to Issues
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLink}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors border ${
                isDark
                  ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border-zinc-700'
                  : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200'
              }`}
              title="Copy link to this issue"
            >
              {copied ? <Check size={13} className="text-emerald-400" /> : <Link size={13} />}
              {copied ? 'Copied!' : 'Copy Link'}
            </button>
            {!editing && (
              <button
                onClick={() => setEditing(true)}
                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors border ${
                  isDark
                    ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border-zinc-700'
                    : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200'
                }`}
              >
                <Edit3 size={13} />
                Edit
              </button>
            )}
            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors border border-red-500/20"
              >
                <Trash2 size={13} />
                Delete
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className={`text-xs ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>Confirm delete?</span>
                <button
                  onClick={handleDelete}
                  className="text-xs px-3 py-1.5 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
                >
                  Yes, Delete
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className={`text-xs px-3 py-1.5 rounded-lg transition-colors border ${
                    isDark
                      ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border-zinc-700'
                      : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200'
                  }`}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>

        {saveSuccess && (
          <div className="mb-4 px-4 py-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-2">
            <CheckCircle2 size={14} />
            Changes saved successfully.
          </div>
        )}

        {/* Main Card */}
        <div className={`border rounded-xl p-6 mb-6 ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200'}`}>
          {/* Header */}
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <span className={`text-xs font-mono ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>{issue.id}</span>
                {issue.isMasterIncident && (
                  <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-400 border border-violet-500/25 font-medium">
                    <Star size={10} fill="currentColor" /> Master Incident
                  </span>
                )}
                {sourceRelationship && (
                  <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    <Link2 size={10} /> Linked
                  </span>
                )}
                {isResolved && (
                  <span className="inline-flex items-center gap-1 rounded-full text-xs px-2 py-0.5 font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <CheckCircle2 size={10} /> Resolved
                  </span>
                )}
              </div>
              {editing ? (
                <input
                  className={`w-full border rounded-lg px-3 py-2 text-lg font-semibold focus:outline-none focus:border-amber-500 ${
                    isDark
                      ? 'bg-zinc-800 border-zinc-700 text-zinc-100'
                      : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                  value={editForm.title}
                  onChange={e => setEditForm(p => ({ ...p, title: e.target.value }))}
                />
              ) : (
                <h1 className={`text-xl font-bold ${isDark ? 'text-zinc-100' : 'text-slate-900'}`}>{issue.title}</h1>
              )}
            </div>
            <div className="flex flex-col items-end gap-2">
              {editing ? (
                <select
                  className={`border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-amber-500 ${
                    isDark
                      ? 'bg-zinc-800 border-zinc-700 text-zinc-100'
                      : 'bg-white border-slate-200 text-slate-900'
                  }`}
                  value={editForm.severity}
                  onChange={e => setEditForm(p => ({ ...p, severity: e.target.value as Severity }))}
                >
                  {(['Low','Medium','High','Critical'] as Severity[]).map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              ) : (
                <SeverityBadge severity={issue.severity} />
              )}
              <ConfidenceBadge issue={issue} showScore />
            </div>
          </div>

          {/* Meta */}
          <div className={`flex flex-wrap gap-4 text-xs mb-4 ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>
            <span className="flex items-center gap-1.5">
              <Monitor size={12} />
              {editing ? (
                <input
                  className={`border rounded px-2 py-0.5 focus:outline-none focus:border-amber-500 ${
                    isDark
                      ? 'bg-zinc-800 border-zinc-700 text-zinc-300'
                      : 'bg-white border-slate-200 text-slate-700'
                  }`}
                  value={editForm.systemAffected}
                  onChange={e => setEditForm(p => ({ ...p, systemAffected: e.target.value }))}
                />
              ) : issue.systemAffected}
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar size={12} />
              {formatDate(issue.createdAt)}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock size={12} />
              {formatRelativeTime(issue.createdAt)}
            </span>
            {issue.assignee && (
              <span className="flex items-center gap-1.5">
                <User size={12} />
                {editing ? (
                  <input
                    className={`border rounded px-2 py-0.5 focus:outline-none focus:border-amber-500 ${
                      isDark
                        ? 'bg-zinc-800 border-zinc-700 text-zinc-300'
                        : 'bg-white border-slate-200 text-slate-700'
                    }`}
                    value={editForm.assignee}
                    onChange={e => setEditForm(p => ({ ...p, assignee: e.target.value }))}
                  />
                ) : issue.assignee}
              </span>
            )}
          </div>

          {/* Status */}
          <div className="flex items-center gap-3 mb-4">
            {editing ? (
              <select
                className={`border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-amber-500 ${
                  isDark
                    ? 'bg-zinc-800 border-zinc-700 text-zinc-100'
                    : 'bg-white border-slate-200 text-slate-900'
                }`}
                value={editForm.status}
                onChange={e => setEditForm(p => ({ ...p, status: e.target.value as Status }))}
              >
                {(['Open','Investigating','Resolved','Closed'] as Status[]).map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            ) : (
              <StatusBadge status={issue.status} />
            )}
          </div>

          {/* Tags */}
          <div className="mb-4">
            {editing ? (
              <div>
                <p className={`text-xs mb-2 ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>Tags</p>
                <div className="flex flex-wrap gap-1.5">
                  {ALL_TAGS.map(tag => (
                    <TagBadge
                      key={tag}
                      tag={tag}
                      selected={editForm.tags.includes(tag)}
                      onClick={toggleTag}
                    />
                  ))}
                </div>
              </div>
            ) : issue.tags && issue.tags.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {issue.tags.map(tag => <TagBadge key={tag} tag={tag} />)}
              </div>
            ) : null}
          </div>

          {/* Description */}
          <div className="mb-4">
            <p className={`text-xs font-medium uppercase tracking-wider mb-2 flex items-center gap-1.5 ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>
              <FileText size={11} /> Description
            </p>
            {editing ? (
              <textarea
                className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500 min-h-[100px] resize-y ${
                  isDark
                    ? 'bg-zinc-800 border-zinc-700 text-zinc-300'
                    : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}
                value={editForm.description}
                onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))}
              />
            ) : (
              <p className={`text-sm leading-relaxed whitespace-pre-wrap ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>{issue.description}</p>
            )}
          </div>

          {/* Edit Actions */}
          {editing && (
            <div className={`flex items-center gap-2 pt-4 border-t ${isDark ? 'border-zinc-800' : 'border-slate-200'}`}>
              <button
                onClick={handleSave}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500 text-zinc-900 text-sm font-semibold hover:bg-amber-400 transition-colors"
              >
                <Save size={14} /> Save Changes
              </button>
              <button
                onClick={() => { setEditing(false); loadIssue(); }}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm transition-colors border ${
                  isDark
                    ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border-zinc-700'
                    : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200'
                }`}
              >
                <X size={14} /> Cancel
              </button>
            </div>
          )}
        </div>

        {/* Master Incident Controls */}
        <div className={`border rounded-xl p-5 mb-6 ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Star size={15} className="text-violet-400" />
              <h2 className={`text-sm font-semibold ${isDark ? 'text-zinc-200' : 'text-slate-900'}`}>Master Incident</h2>
            </div>
            {issue.isMasterIncident ? (
              <button
                onClick={handleDemote}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                  isDark
                    ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 border-zinc-700'
                    : 'bg-white text-slate-600 hover:bg-slate-50 border-slate-200'
                }`}
              >
                Demote from Master
              </button>
            ) : (
              <button
                onClick={handlePromote}
                className="text-xs px-3 py-1.5 rounded-lg bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 border border-violet-500/20 transition-colors"
              >
                Promote to Master
              </button>
            )}
          </div>

          {issue.isMasterIncident ? (
            <div>
              <div className={`flex items-center gap-4 text-xs mb-4 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                <span className="flex items-center gap-1.5">
                  <Link2 size={11} />
                  {linkedRelationships.length} linked incident{linkedRelationships.length !== 1 ? 's' : ''}
                </span>
                {typeof issue.linkedIncidentCount === 'number' && (
                  <span className={isDark ? 'text-zinc-500' : 'text-slate-500'}>({issue.linkedIncidentCount} total tracked)</span>
                )}
              </div>
              {linkedRelationships.length > 0 ? (
                <div className="space-y-2">
                  {linkedRelationships.map(rel => {
                    const src = allIssues.find(i => i.id === rel.sourceId);
                    return src ? (
                      <div
                        key={rel.id}
                        className={`flex items-center justify-between px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                          isDark
                            ? 'bg-zinc-800/60 border-zinc-700/50 hover:border-zinc-600'
                            : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                        }`}
                        onClick={() => navigate(`/issues/${src.id}`)}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`text-xs font-mono shrink-0 ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>{src.id}</span>
                          <span className={`text-xs truncate ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>{src.title}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`text-xs ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>{RELATIONSHIP_LABELS[rel.relationshipType]}</span>
                          <ChevronRight size={12} className={isDark ? 'text-zinc-600' : 'text-slate-400'} />
                        </div>
                      </div>
                    ) : null;
                  })}
                </div>
              ) : (
                <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>No linked incidents yet. Other issues can be linked to this master incident.</p>
              )}
            </div>
          ) : (
            <div>
              {sourceRelationship && masterIssue ? (
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-xs mb-1 ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>Linked to master incident:</p>
                    <button
                      onClick={() => navigate(`/issues/${masterIssue.id}`)}
                      className={`flex items-center gap-2 text-sm text-violet-400 transition-colors ${isDark ? 'hover:text-violet-300' : 'hover:text-violet-500'}`}
                    >
                      <Star size={12} fill="currentColor" />
                      <span className="font-mono text-xs">{masterIssue.id}</span>
                      <span className="truncate max-w-xs">{masterIssue.title}</span>
                      <ChevronRight size={12} />
                    </button>
                    <p className={`text-xs mt-1 ${isDark ? 'text-zinc-600' : 'text-slate-400'}`}>{RELATIONSHIP_LABELS[sourceRelationship.relationshipType]}</p>
                  </div>
                  <button
                    onClick={handleUnlink}
                    className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                      isDark
                        ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 border-zinc-700'
                        : 'bg-white text-slate-600 hover:bg-slate-50 border-slate-200'
                    }`}
                  >
                    Unlink
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>This issue is not linked to any master incident.</p>
                  <button
                    onClick={() => setShowLinkModal(true)}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20 transition-colors"
                  >
                    <Link2 size={12} /> Link to Master
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Resolutions */}
        <div className={`border rounded-xl p-5 mb-6 ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BookOpen size={15} className="text-amber-400" />
              <h2 className={`text-sm font-semibold ${isDark ? 'text-zinc-200' : 'text-slate-900'}`}>Resolutions</h2>
              {issue.resolutions && issue.resolutions.length > 0 && (
                <span className="text-xs px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  {issue.resolutions.length}
                </span>
              )}
            </div>
            <button
              onClick={() => setShowResolutionForm(!showResolutionForm)}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/20 transition-colors"
            >
              <Plus size={12} />
              Add Resolution
            </button>
          </div>

          {showResolutionForm && (
            <div className={`mb-4 p-4 rounded-lg border ${isDark ? 'bg-zinc-800/50 border-zinc-700' : 'bg-slate-50 border-slate-200'}`}>
              <p className={`text-xs font-semibold mb-3 ${isDark ? 'text-zinc-300' : 'text-slate-900'}`}>New Resolution</p>
              <div className="space-y-3">
                <div>
                  <label className={`text-xs mb-1 block ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>Title *</label>
                  <input
                    className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500 ${
                      isDark
                        ? 'bg-zinc-900 border-zinc-700 text-zinc-200'
                        : 'bg-white border-slate-200 text-slate-900'
                    }`}
                    placeholder="Resolution title..."
                    value={resolutionForm.title}
                    onChange={e => setResolutionForm(p => ({ ...p, title: e.target.value }))}
                  />
                </div>
                <div>
                  <label className={`text-xs mb-1 block ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>Steps * (one per line)</label>
                  <textarea
                    className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500 min-h-[80px] resize-y ${
                      isDark
                        ? 'bg-zinc-900 border-zinc-700 text-zinc-200'
                        : 'bg-white border-slate-200 text-slate-900'
                    }`}
                    placeholder="Step 1&#10;Step 2&#10;Step 3"
                    value={resolutionForm.steps}
                    onChange={e => setResolutionForm(p => ({ ...p, steps: e.target.value }))}
                  />
                </div>
                <div>
                  <label className={`text-xs mb-1 block ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>Notes (optional)</label>
                  <textarea
                    className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500 min-h-[60px] resize-y ${
                      isDark
                        ? 'bg-zinc-900 border-zinc-700 text-zinc-200'
                        : 'bg-white border-slate-200 text-slate-900'
                    }`}
                    placeholder="Additional notes..."
                    value={resolutionForm.notes}
                    onChange={e => setResolutionForm(p => ({ ...p, notes: e.target.value }))}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleAddResolution}
                    disabled={!resolutionForm.title.trim() || !resolutionForm.steps.trim()}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500 text-zinc-900 text-xs font-semibold hover:bg-amber-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Save size={12} /> Save Resolution
                  </button>
                  <button
                    onClick={() => { setShowResolutionForm(false); setResolutionForm({ title: '', steps: '', notes: '' }); }}
                    className={`px-4 py-2 rounded-lg text-xs transition-colors ${
                      isDark ? 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600' : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {issue.resolutions && issue.resolutions.length > 0 ? (
            <div className="space-y-3">
              {issue.resolutions.map((res, idx) => (
                <div key={res.id ?? idx} className={`p-4 rounded-lg border ${isDark ? 'bg-zinc-800/40 border-zinc-700/50' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="flex items-start justify-between mb-2">
                    <h3 className={`text-sm font-semibold ${isDark ? 'text-zinc-200' : 'text-slate-900'}`}>{res.title}</h3>
                    <div className="flex items-center gap-2">
                      {(res.referenceCount ?? 0) > 0 && (
                        <span className={`text-xs ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>{res.referenceCount} use{res.referenceCount !== 1 ? 's' : ''}</span>
                      )}
                      <button
                        onClick={() => handleIncrementReference(res.id ?? '')}
                        className={`flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors ${
                          isDark
                            ? 'bg-zinc-700 text-zinc-400 hover:bg-zinc-600 hover:text-zinc-200'
                            : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
                        }`}
                        title="Mark as used"
                      >
                        <BookOpen size={10} /> Used
                      </button>
                    </div>
                  </div>
                  <ol className="space-y-1 mb-2">
                    {res.steps.map((step, si) => (
                      <li key={si} className={`text-xs flex gap-2 ${isDark ? 'text-zinc-400' : 'text-slate-700'}`}>
                        <span className={`shrink-0 ${isDark ? 'text-zinc-600' : 'text-slate-400'}`}>{si + 1}.</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                  {res.notes && (
                    <p className={`text-xs mt-2 pt-2 border-t italic ${isDark ? 'text-zinc-500 border-zinc-700/50' : 'text-slate-500 border-slate-200'}`}>{res.notes}</p>
                  )}
                  {res.createdAt && (
                    <p className={`text-xs mt-2 ${isDark ? 'text-zinc-600' : 'text-slate-400'}`}>{formatRelativeTime(res.createdAt)}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>No resolutions documented yet. Add one to help future troubleshooting.</p>
          )}
        </div>

        {/* Confidence Info */}
        <div className={`border rounded-xl p-5 ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center gap-2 mb-3">
            <Shield size={15} className="text-zinc-400" />
            <h2 className={`text-sm font-semibold ${isDark ? 'text-zinc-200' : 'text-slate-900'}`}>Confidence Score</h2>
          </div>
          <div className="flex items-center gap-3 mb-3">
            <div className={`flex-1 h-2 rounded-full overflow-hidden ${isDark ? 'bg-zinc-800' : 'bg-slate-200'}`}>
              <div
                className={`h-full rounded-full transition-all ${
                  confidenceScore >= 70 ? 'bg-emerald-500' :
                  confidenceScore >= 40 ? 'bg-amber-500' : 'bg-zinc-500'
                }`}
                style={{ width: `${confidenceScore}%` }}
              />
            </div>
            <span className={`text-sm font-bold ${isDark ? 'text-zinc-200' : 'text-slate-900'}`}>{confidenceScore}%</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className={`flex items-center justify-between px-3 py-2 rounded-lg ${isDark ? 'bg-zinc-800/50' : 'bg-slate-50'}`}>
              <span className={isDark ? 'text-zinc-500' : 'text-slate-500'}>Resolutions</span>
              <span className={`font-medium ${ (issue.resolutions?.length ?? 0) > 0 ? 'text-emerald-400' : 'text-zinc-600'}`}>
                {(issue.resolutions?.length ?? 0) > 0 ? `${issue.resolutions!.length} added` : 'None'}
              </span>
            </div>
            <div className={`flex items-center justify-between px-3 py-2 rounded-lg ${isDark ? 'bg-zinc-800/50' : 'bg-slate-50'}`}>
              <span className={isDark ? 'text-zinc-500' : 'text-slate-500'}>Reference Uses</span>
              <span className={`font-medium ${ (issue.referenceCount ?? 0) > 0 ? 'text-emerald-400' : 'text-zinc-600'}`}>
                {issue.referenceCount ?? 0}
              </span>
            </div>
            <div className={`flex items-center justify-between px-3 py-2 rounded-lg ${isDark ? 'bg-zinc-800/50' : 'bg-slate-50'}`}>
              <span className={isDark ? 'text-zinc-500' : 'text-slate-500'}>Status</span>
              <span className={`font-medium ${isResolved ? 'text-emerald-400' : 'text-zinc-400'}`}>
                {isResolved ? 'Resolved' : 'Active'}
              </span>
            </div>
            <div className={`flex items-center justify-between px-3 py-2 rounded-lg ${isDark ? 'bg-zinc-800/50' : 'bg-slate-50'}`}>
              <span className={isDark ? 'text-zinc-500' : 'text-slate-500'}>Linked Incidents</span>
              <span className={`font-medium ${ (issue.linkedIncidentCount ?? 0) > 0 ? 'text-violet-400' : 'text-zinc-600'}`}>
                {issue.linkedIncidentCount ?? 0}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Link Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`border rounded-2xl w-full max-w-md shadow-2xl ${isDark ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-slate-200'}`}>
            <div className={`flex items-center justify-between p-5 border-b ${isDark ? 'border-zinc-800' : 'border-slate-200'}`}>
              <div className="flex items-center gap-2">
                <Link2 size={16} className="text-blue-400" />
                <h3 className={`text-sm font-semibold ${isDark ? 'text-zinc-100' : 'text-slate-900'}`}>Link to Master Incident</h3>
              </div>
              <button
                onClick={() => { setShowLinkModal(false); setSelectedLinkTarget(''); setLinkSearch(''); }}
                className={`transition-colors ${isDark ? 'text-zinc-500 hover:text-zinc-300' : 'text-slate-400 hover:text-slate-700'}`}
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-5">
              <div className="relative mb-3">
                <Search size={13} className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`} />
                <input
                  className={`w-full border rounded-lg pl-8 pr-3 py-2 text-sm focus:outline-none focus:border-amber-500 ${
                    isDark
                      ? 'bg-zinc-800 border-zinc-700 text-zinc-200'
                      : 'bg-white border-slate-200 text-slate-900'
                  }`}
                  placeholder="Search master incidents..."
                  value={linkSearch}
                  onChange={e => setLinkSearch(e.target.value)}
                />
              </div>
              <div className="mb-3">
                <label className={`text-xs mb-1 block ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>Relationship Type</label>
                <select
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500 ${
                    isDark
                      ? 'bg-zinc-800 border-zinc-700 text-zinc-200'
                      : 'bg-white border-slate-200 text-slate-900'
                  }`}
                  value={selectedRelType}
                  onChange={e => setSelectedRelType(e.target.value as RelationshipType)}
                >
                  {(Object.keys(RELATIONSHIP_LABELS) as RelationshipType[]).map(rt => (
                    <option key={rt} value={rt}>{RELATIONSHIP_LABELS[rt]}</option>
                  ))}
                </select>
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1.5 mb-4">
                {linkableMasters.length === 0 ? (
                  <p className={`text-xs text-center py-4 ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>No master incidents found.</p>
                ) : linkableMasters.map(mi => (
                  <div
                    key={mi.id}
                    onClick={() => setSelectedLinkTarget(mi.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors border ${
                      selectedLinkTarget === mi.id
                        ? 'bg-blue-500/15 border-blue-500/40 text-blue-300'
                        : (isDark ? 'bg-zinc-800/50 border-zinc-700/50 hover:border-zinc-600 text-zinc-300' : 'bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-700')
                    }`}
                  >
                    <Star size={10} className="text-violet-400 shrink-0" fill="currentColor" />
                    <span className={`text-xs font-mono shrink-0 ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>{mi.id}</span>
                    <span className="text-xs truncate">{mi.title}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleLink}
                  disabled={!selectedLinkTarget}
                  className="flex-1 py-2 rounded-lg bg-blue-500 text-white text-sm font-semibold hover:bg-blue-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Link Issue
                </button>
                <button
                  onClick={() => { setShowLinkModal(false); setSelectedLinkTarget(''); setLinkSearch(''); }}
                  className={`px-4 py-2 rounded-lg text-sm border transition-colors ${
                    isDark
                      ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border-zinc-700'
                      : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200'
                  }`}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
