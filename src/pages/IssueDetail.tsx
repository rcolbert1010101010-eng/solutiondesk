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
  BookOpen
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
  const [masterIssue, setMasterIssue] = useState<Issue | null>(null);

  const [editForm, setEditForm] = useState<Partial<Issue>>({});
  const [editTags, setEditTags] = useState<Tag[]>([]);
  const [resolutionForm, setResolutionForm] = useState<Resolution>({
    rootCause: '',
    stepsTaken: '',
    finalResolution: '',
    preventionNotes: '',
    resolvedAt: new Date().toISOString()
  });

  const loadIssue = () => {
    if (id) {
      const found = getIssueById(id);
      if (found) {
        setIssue(found);
        setEditForm(found);
        setEditTags(found.tags ?? []);
        if (found.isMasterIncident) {
          setLinkedRelationships(getRelationshipsForMaster(id));
        }
        const srcRel = getRelationshipForSource(id);
        setSourceRelationship(srcRel);
        if (srcRel) {
          const mi = getIssueById(srcRel.master_issue_id);
          setMasterIssue(mi ?? null);
        } else {
          setMasterIssue(null);
        }
      }
    }
  };

  useEffect(() => {
    loadIssue();
  }, [id]);

  if (!issue) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle size={40} className="text-zinc-600 mx-auto mb-4" />
          <p className="text-zinc-400 text-base font-medium">Issue not found</p>
          <p className="text-zinc-600 text-sm mt-1">The issue you are looking for does not exist.</p>
          <button onClick={() => navigate('/issues')} className="mt-4 text-sm text-amber-400 hover:text-amber-300">
            Back to Issues
          </button>
        </div>
      </div>
    );
  }

  const isResolved = issue.status === 'Resolved' || issue.status === 'Closed';
  const confidenceScore = issue.confidenceScore ?? calculateConfidenceScore(issue);

  const handleSave = () => {
    if (!id) return;
    const updated = updateIssue(id, { ...editForm, tags: editTags });
    if (updated) {
      setIssue(updated);
      setEditing(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
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
      setShowResolutionForm(false);
    }
  };

  const handlePromote = () => {
    if (!id) return;
    const updated = promoteToMasterIncident(id);
    if (updated) {
      setIssue(updated);
      setLinkedRelationships(getRelationshipsForMaster(id));
    }
  };

  const handleDemote = () => {
    if (!id) return;
    const updated = demoteMasterIncident(id);
    if (updated) setIssue(updated);
  };

  const handleUnlink = () => {
    if (!id || !sourceRelationship) return;
    unlinkIssue(id, sourceRelationship.master_issue_id);
    setSourceRelationship(undefined);
    setMasterIssue(null);
    loadIssue();
  };

  const toggleTag = (tag: Tag) => {
    setEditTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const statusOptions: Status[] = ['Open', 'Investigating', 'Resolved', 'Closed'];
  const severityOptions: Severity[] = ['Low', 'Medium', 'High', 'Critical'];

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate('/issues')}
            className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-zinc-500">{issue.id}</span>
              {issue.isMasterIncident && (
                <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-300 border border-violet-500/30 font-medium">
                  <Star size={10} fill="currentColor" /> Master Incident
                </span>
              )}
              {issue.masterIncidentId && (
                <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-300 border border-sky-500/30">
                  <Link size={10} /> Linked
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {saveSuccess && (
              <span className="text-xs text-emerald-400 flex items-center gap-1">
                <CheckCircle2 size={14} /> Saved
              </span>
            )}
            {!editing ? (
              <>
                <button
                  onClick={() => setEditing(true)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-zinc-700 text-zinc-300 hover:bg-zinc-800 text-sm transition-colors"
                >
                  <Edit3 size={14} /> Edit
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 text-sm transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleSave}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-zinc-900 font-semibold text-sm transition-colors"
                >
                  <Save size={14} /> Save
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-zinc-700 text-zinc-300 hover:bg-zinc-800 text-sm transition-colors"
                >
                  <X size={14} /> Cancel
                </button>
              </>
            )}
          </div>
        </div>

        {showDeleteConfirm && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
            <p className="text-sm text-red-400 mb-3">Are you sure you want to delete this issue? This cannot be undone.</p>
            <div className="flex gap-2">
              <button onClick={handleDelete} className="px-3 py-1.5 bg-red-500 hover:bg-red-400 text-white text-sm rounded-lg font-medium">Delete</button>
              <button onClick={() => setShowDeleteConfirm(false)} className="px-3 py-1.5 border border-zinc-700 text-zinc-300 text-sm rounded-lg hover:bg-zinc-800">Cancel</button>
            </div>
          </div>
        )}

        {/* Issue Info */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Title & Description */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              {editing ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-zinc-500 mb-1.5 block">Title</label>
                    <input
                      type="text"
                      value={editForm.title ?? ''}
                      onChange={e => setEditForm(p => ({ ...p, title: e.target.value }))}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500 mb-1.5 block">Description</label>
                    <textarea
                      value={editForm.description ?? ''}
                      onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))}
                      rows={4}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-500 resize-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500 mb-1.5 block">System Affected</label>
                    <input
                      type="text"
                      value={editForm.systemAffected ?? ''}
                      onChange={e => setEditForm(p => ({ ...p, systemAffected: e.target.value }))}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-zinc-500 mb-1.5 block">Status</label>
                      <select
                        value={editForm.status ?? issue.status}
                        onChange={e => setEditForm(p => ({ ...p, status: e.target.value as Status }))}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-500"
                      >
                        {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-zinc-500 mb-1.5 block">Severity</label>
                      <select
                        value={editForm.severity ?? issue.severity}
                        onChange={e => setEditForm(p => ({ ...p, severity: e.target.value as Severity }))}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-500"
                      >
                        {severityOptions.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500 mb-2 block">Tags</label>
                    <div className="flex flex-wrap gap-2">
                      {ALL_TAGS.map(tag => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => toggleTag(tag)}
                          className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                            editTags.includes(tag)
                              ? 'bg-amber-400/20 text-amber-300 border-amber-400/50'
                              : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:border-zinc-500'
                          }`}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500 mb-1.5 block">Assignee</label>
                    <input
                      type="text"
                      value={editForm.assignee ?? ''}
                      onChange={e => setEditForm(p => ({ ...p, assignee: e.target.value }))}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <h1 className="text-xl font-bold text-zinc-100 mb-3">{issue.title}</h1>
                  <p className="text-sm text-zinc-400 leading-relaxed">{issue.description}</p>
                </div>
              )}
            </div>

            {/* Resolution Section */}
            {isResolved && issue.resolution && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-5">
                  <CheckCircle2 size={18} className="text-emerald-400" />
                  <h2 className="text-base font-semibold text-zinc-100">Resolution Details</h2>
                  {issue.isMasterIncident && (
                    <ConfidenceBadge score={confidenceScore} />
                  )}
                </div>
                <div className="space-y-4">
                  {[
                    { label: 'Root Cause', value: issue.resolution.rootCause },
                    { label: 'Steps Taken', value: issue.resolution.stepsTaken },
                    { label: 'Final Resolution', value: issue.resolution.finalResolution },
                    { label: 'Prevention Notes', value: issue.resolution.preventionNotes }
                  ].map(item => item.value && (
                    <div key={item.label}>
                      <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1.5">{item.label}</p>
                      <p className="text-sm text-zinc-300 leading-relaxed bg-zinc-800/50 rounded-lg p-3">{item.value}</p>
                    </div>
                  ))}
                  <div className="pt-2 border-t border-zinc-800">
                    <p className="text-xs text-zinc-600">
                      Resolved {formatRelativeTime(issue.resolution.resolvedAt)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Linked Incidents (Master Incident view) */}
            {issue.isMasterIncident && (
              <LinkedIncidentsPanel
                masterId={issue.id}
                relationships={linkedRelationships}
                onNavigate={navigate}
              />
            )}

            {/* Linked to Master Incident (source view) */}
            {masterIssue && sourceRelationship && (
              <div className="bg-zinc-900 border border-violet-500/20 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Link2 size={16} className="text-violet-400" />
                  <h3 className="text-sm font-semibold text-zinc-100">Linked to Master Incident</h3>
                </div>
                <div
                  className="flex items-center gap-3 p-3 bg-zinc-800 rounded-lg hover:bg-zinc-700 cursor-pointer transition-colors"
                  onClick={() => navigate(`/issues/${masterIssue.id}`)}
                >
                  <Star size={14} className="text-violet-400 flex-shrink-0" fill="currentColor" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-200 truncate">{masterIssue.title}</p>
                    <p className="text-xs text-zinc-500">
                      {masterIssue.id} · {RELATIONSHIP_LABELS[sourceRelationship.relationship_type]} · linked by {sourceRelationship.linked_by}
                    </p>
                  </div>
                  <ChevronRight size={14} className="text-zinc-600 flex-shrink-0" />
                </div>
                <button
                  onClick={handleUnlink}
                  className="mt-2 text-xs text-red-400 hover:text-red-300 transition-colors"
                >
                  Remove link
                </button>
              </div>
            )}

            {/* Add Resolution form */}
            {!isResolved && !showResolutionForm && (
              <button
                onClick={() => setShowResolutionForm(true)}
                className="w-full border border-dashed border-zinc-700 rounded-xl p-4 text-sm text-zinc-500 hover:text-zinc-300 hover:border-zinc-500 transition-colors"
              >
                + Add Resolution Details
              </button>
            )}

            {showResolutionForm && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-zinc-100">Add Resolution</h3>
                  <button onClick={() => setShowResolutionForm(false)} className="text-zinc-500 hover:text-zinc-300">
                    <X size={16} />
                  </button>
                </div>
                <div className="space-y-4">
                  {([
                    { key: 'rootCause', label: 'Root Cause' },
                    { key: 'stepsTaken', label: 'Steps Taken' },
                    { key: 'finalResolution', label: 'Final Resolution' },
                    { key: 'preventionNotes', label: 'Prevention Notes' }
                  ] as { key: keyof Resolution; label: string }[]).map(field => (
                    <div key={field.key}>
                      <label className="text-xs text-zinc-500 mb-1.5 block">{field.label}</label>
                      <textarea
                        value={resolutionForm[field.key]}
                        onChange={e => setResolutionForm(p => ({ ...p, [field.key]: e.target.value }))}
                        rows={3}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-500 resize-none"
                      />
                    </div>
                  ))}
                  <button
                    onClick={handleAddResolution}
                    className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-sm py-2.5 rounded-lg transition-colors"
                  >
                    Mark as Resolved
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Meta info */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
              <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4">Issue Details</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-zinc-600 mb-1">Status</p>
                  <StatusBadge status={issue.status} />
                </div>
                <div>
                  <p className="text-xs text-zinc-600 mb-1">Severity</p>
                  <SeverityBadge severity={issue.severity} />
                </div>
                <div>
                  <p className="text-xs text-zinc-600 mb-1">System</p>
                  <p className="text-sm text-zinc-300">{issue.systemAffected}</p>
                </div>
                {issue.assignee && (
                  <div>
                    <p className="text-xs text-zinc-600 mb-1">Assignee</p>
                    <p className="text-sm text-zinc-300">{issue.assignee}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-zinc-600 mb-1">Created</p>
                  <p className="text-sm text-zinc-300">{formatDate(issue.createdAt)}</p>
                </div>
                {issue.tags && issue.tags.length > 0 && (
                  <div>
                    <p className="text-xs text-zinc-600 mb-2">Tags</p>
                    <div className="flex flex-wrap gap-1">
                      {issue.tags.map(tag => <TagBadge key={tag} tag={tag} size="sm" />)}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Master Incident Stats */}
            {issue.isMasterIncident && (
              <div className="bg-violet-500/5 border border-violet-500/20 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Star size={14} className="text-violet-400" fill="currentColor" />
                  <h3 className="text-xs font-semibold text-violet-300 uppercase tracking-wider">Master Incident</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-zinc-500">Linked Incidents</span>
                    <span className="text-sm font-semibold text-zinc-200">{issue.linkedIncidentCount ?? 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-zinc-500">References</span>
                    <span className="text-sm font-semibold text-zinc-200">{issue.referenceCount ?? 0}</span>
                  </div>
                  {issue.lastLinkedAt && (
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-zinc-500">Last Linked</span>
                      <span className="text-xs text-zinc-400">{formatRelativeTime(issue.lastLinkedAt)}</span>
                    </div>
                  )}
                  <div className="pt-2 border-t border-violet-500/20">
                    <ConfidenceBadge score={confidenceScore} />
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
              <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Actions</h3>
              <div className="space-y-2">
                {/* Link to Existing Resolution */}
                {!issue.isMasterIncident && (
                  <button
                    onClick={() => setShowLinkModal(true)}
                    className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 hover:bg-sky-500/20 text-sm font-medium transition-colors"
                  >
                    <Link2 size={14} />
                    Link to Existing Resolution
                  </button>
                )}

                {/* Promote / Demote Master Incident */}
                {isResolved && !issue.isMasterIncident && (
                  <button
                    onClick={handlePromote}
                    className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-400 hover:bg-violet-500/20 text-sm font-medium transition-colors"
                  >
                    <Star size={14} />
                    Promote to Master Incident
                  </button>
                )}
                {issue.isMasterIncident && (
                  <button
                    onClick={handleDemote}
                    className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-400 hover:bg-zinc-700 text-sm transition-colors"
                  >
                    <Star size={14} />
                    Remove Master Status
                  </button>
                )}

                <button
                  onClick={() => { incrementReferenceCount(id!); loadIssue(); }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-400 hover:bg-zinc-700 text-sm transition-colors"
                >
                  <BookOpen size={14} />
                  Mark as Referenced
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Link Modal */}
      {showLinkModal && (
        <LinkResolutionModal
          currentIssueId={issue.id}
          onClose={() => setShowLinkModal(false)}
          onLinked={() => { setShowLinkModal(false); loadIssue(); }}
        />
      )}
    </div>
  );
};

// ==================== LinkedIncidentsPanel ====================
interface LinkedIncidentsPanelProps {
  masterId: string;
  relationships: IssueRelationship[];
  onNavigate: (path: string) => void;
}

const LinkedIncidentsPanel: React.FC<LinkedIncidentsPanelProps> = ({ masterId, relationships, onNavigate }) => {
  const linkedIssues = relationships.map(r => ({
    rel: r,
    issue: getIssueById(r.source_issue_id)
  })).filter(x => x.issue !== undefined) as { rel: IssueRelationship; issue: Issue }[];

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Link size={16} className="text-sky-400" />
        <h3 className="text-sm font-semibold text-zinc-100">Linked Incidents</h3>
        <span className="ml-auto text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full">{linkedIssues.length}</span>
      </div>
      {linkedIssues.length === 0 ? (
        <p className="text-xs text-zinc-500 py-2">No incidents linked to this master incident yet.</p>
      ) : (
        <div className="space-y-2">
          {linkedIssues.map(({ rel, issue }) => (
            <div
              key={rel.id}
              onClick={() => onNavigate(`/issues/${issue.id}`)}
              className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-lg hover:bg-zinc-800 cursor-pointer transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-zinc-500">{issue.id}</span>
                  <span className="text-xs text-zinc-600">{RELATIONSHIP_LABELS[rel.relationship_type]}</span>
                </div>
                <p className="text-sm text-zinc-300 truncate mt-0.5">{issue.title}</p>
                <p className="text-xs text-zinc-600">Linked {formatRelativeTime(rel.linked_at)} by {rel.linked_by}</p>
              </div>
              <ChevronRight size={14} className="text-zinc-600" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ==================== LinkResolutionModal ====================
interface LinkResolutionModalProps {
  currentIssueId: string;
  onClose: () => void;
  onLinked: () => void;
}

const LinkResolutionModal: React.FC<LinkResolutionModalProps> = ({ currentIssueId, onClose, onLinked }) => {
  const [search, setSearch] = useState('');
  const [selectedMaster, setSelectedMaster] = useState<Issue | null>(null);
  const [relationshipType, setRelationshipType] = useState<RelationshipType>('similar');
  const [linkedBy, setLinkedBy] = useState('');
  const [results, setResults] = useState<Issue[]>([]);
  const [promoteMode, setPromoteMode] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const all = getAllIssues();
    const resolved = all.filter(i =>
      (i.status === 'Resolved' || i.status === 'Closed') &&
      i.id !== currentIssueId
    );
    if (search.trim().length === 0) {
      setResults(resolved.filter(i => i.isMasterIncident).slice(0, 8));
    } else {
      const q = search.toLowerCase();
      setResults(
        resolved.filter(i =>
          i.title.toLowerCase().includes(q) ||
          i.systemAffected.toLowerCase().includes(q) ||
          (i.resolution?.rootCause?.toLowerCase().includes(q) ?? false)
        ).slice(0, 8)
      );
    }
  }, [search, currentIssueId]);

  const handleLink = () => {
    if (!selectedMaster) return;
    const by = linkedBy.trim() || 'Technician';
    linkIssueToMaster(currentIssueId, selectedMaster.id, relationshipType, by);
    onLinked();
  };

  const handlePromoteAndLink = () => {
    const current = getIssueById(currentIssueId);
    if (!current) return;
    promoteToMasterIncident(currentIssueId);
    onLinked();
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-zinc-800">
          <div>
            <h2 className="text-base font-semibold text-zinc-100">Link to Existing Resolution</h2>
            <p className="text-xs text-zinc-500 mt-0.5">Search resolved issues and master incidents</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-5 space-y-4">
          {!promoteMode ? (
            <>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Search by title, system, or root cause..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-9 pr-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                {results.length === 0 && (
                  <p className="text-xs text-zinc-500 text-center py-4">No matching resolved issues found.</p>
                )}
                {results.map(r => (
                  <div
                    key={r.id}
                    onClick={() => setSelectedMaster(r)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      selectedMaster?.id === r.id
                        ? 'border-amber-500/50 bg-amber-500/5'
                        : 'border-zinc-800 bg-zinc-800/50 hover:border-zinc-600'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-zinc-500">{r.id}</span>
                      {r.isMasterIncident && (
                        <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full bg-violet-500/15 text-violet-400 border border-violet-500/25">
                          <Star size={9} fill="currentColor" /> Master
                        </span>
                      )}
                      {r.confidenceScore !== undefined && (
                        <ConfidenceBadge score={r.confidenceScore} size="sm" />
                      )}
                    </div>
                    <p className="text-sm text-zinc-200">{r.title}</p>
                    {r.resolution?.rootCause && (
                      <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{r.resolution.rootCause}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-zinc-600">{r.systemAffected}</span>
                      {(r.linkedIncidentCount ?? 0) > 0 && (
                        <span className="text-xs text-zinc-600">
                          <Link size={9} className="inline mr-0.5" />{r.linkedIncidentCount} linked
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {selectedMaster && (
                <div className="space-y-3 pt-2 border-t border-zinc-800">
                  <div>
                    <label className="text-xs text-zinc-500 mb-1.5 block">Relationship Type</label>
                    <select
                      value={relationshipType}
                      onChange={e => setRelationshipType(e.target.value as RelationshipType)}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-500"
                    >
                      <option value="duplicate">Duplicate</option>
                      <option value="similar">Similar Issue</option>
                      <option value="derived_from">Derived From</option>
                      <option value="confirmed_same_root_cause">Same Root Cause</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500 mb-1.5 block">Your Name</label>
                    <input
                      type="text"
                      placeholder="Technician name"
                      value={linkedBy}
                      onChange={e => setLinkedBy(e.target.value)}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <button
                    onClick={handleLink}
                    className="w-full bg-amber-400 hover:bg-amber-300 text-zinc-900 font-semibold text-sm py-2.5 rounded-lg transition-colors"
                  >
                    Confirm Link
                  </button>
                </div>
              )}

              <div className="pt-3 border-t border-zinc-800">
                <p className="text-xs text-zinc-500 mb-2">No good match found?</p>
                <button
                  onClick={() => setPromoteMode(true)}
                  className="flex items-center gap-2 text-sm text-violet-400 hover:text-violet-300 transition-colors"
                >
                  <Star size={14} /> Promote this issue as a new Master Incident
                </button>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <Star size={40} className="text-violet-400 mx-auto mb-4" fill="currentColor" />
              <h3 className="text-base font-semibold text-zinc-100 mb-2">Promote as Master Incident</h3>
              <p className="text-sm text-zinc-400 mb-6">This will mark the current issue as a Master Incident, making it a reference for future similar issues.</p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={handlePromoteAndLink}
                  className="bg-violet-500 hover:bg-violet-400 text-white font-semibold text-sm px-5 py-2.5 rounded-lg transition-colors"
                >
                  Promote to Master Incident
                </button>
                <button
                  onClick={() => setPromoteMode(false)}
                  className="border border-zinc-700 text-zinc-300 hover:bg-zinc-800 text-sm px-5 py-2.5 rounded-lg transition-colors"
                >
                  Back
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
