import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getIssueById,
  updateIssue,
  deleteIssue,
  addResolution,
  updateResolution,
  deleteResolution,
  promoteToMasterIncident,
  demoteMasterIncident,
  linkIssueToMaster,
  unlinkIssue,
  getRelationshipsForMaster,
  getRelationshipForSource,
  getAllIssues,
  calculateConfidenceScore,
  incrementReferenceCount,
  ISSUES_CHANGED_EVENT
} from '../lib/db';
import { Issue, Resolution, Status, Severity, TagReference, RelationshipType, IssueRelationship, Tag } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { SeverityBadge } from '../components/SeverityBadge';
import { TagBadge } from '../components/TagBadge';
import { ConfidenceBadge } from '../components/ConfidenceBadge';
import { RichTextEditor, SanitizedHtmlContent } from '../components/RichTextEditor';
import { formatDate, formatRelativeTime } from '../lib/utils';
import { createTag, getTagByName, listTags, normalizeTagName, TAGS_CHANGED_EVENT } from '../lib/tags';
import { getIssueDescriptionHtml, getIssueDescriptionText, plainTextToHtml } from '../lib/richText';
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
  Star,
  Link,
  Link2,
  Search,
  Plus,
  ChevronRight,
  Shield,
  BookOpen,
  Check
} from 'lucide-react';

const RELATIONSHIP_LABELS: Record<RelationshipType, string> = {
  duplicate: 'Duplicate',
  similar: 'Similar Issue',
  derived_from: 'Derived From',
  confirmed_same_root_cause: 'Same Root Cause'
};

const STATUS_OPTIONS: Status[] = ['Open', 'Investigating', 'Resolved', 'Closed'];

const DATA_IMAGE_SRC_REGEX = /^data:image\/[a-z0-9.+-]+;base64,[a-z0-9+/=\s]+$/i;
const STEP_BLOCK_TAGS = new Set([
  'address', 'article', 'aside', 'blockquote', 'div', 'dl', 'fieldset', 'figcaption', 'figure',
  'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'hr', 'li', 'main', 'nav',
  'ol', 'p', 'pre', 'section', 'table', 'tbody', 'td', 'tfoot', 'th', 'thead', 'tr', 'ul'
]);

function isSafeDataImageSrc(src: string): boolean {
  return DATA_IMAGE_SRC_REGEX.test(src.trim());
}

function toImageToken(src: string): string {
  return `[img:${src}]`;
}

function parseImageToken(line: string): string | null {
  const trimmed = line.trim();
  if (!trimmed.startsWith('[img:') || !trimmed.endsWith(']')) return null;
  const src = trimmed.slice(5, -1).trim();
  return isSafeDataImageSrc(src) ? src : null;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function stepsHtmlToLines(html: string): string[] {
  const source = (html ?? '').trim();
  if (!source) return [];

  if (typeof window === 'undefined' || typeof window.DOMParser === 'undefined') {
    return source
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|li|h[1-6]|blockquote|pre|tr|td|th)>/gi, '\n')
      .replace(/<img[^>]*src=["']([^"']+)["'][^>]*>/gi, (_m, src) => (
        isSafeDataImageSrc(String(src)) ? `\n${toImageToken(String(src))}\n` : '\n'
      ))
      .replace(/<[^>]+>/g, '')
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(Boolean);
  }

  const doc = new window.DOMParser().parseFromString(source, 'text/html');
  const lines: string[] = [];
  let currentLine = '';

  const flushLine = () => {
    const normalized = currentLine
      .replace(/\u00a0/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (normalized) lines.push(normalized);
    currentLine = '';
  };

  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      currentLine += node.textContent ?? '';
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const element = node as HTMLElement;
    const tag = element.tagName.toLowerCase();

    if (tag === 'img') {
      const src = element.getAttribute('src') ?? '';
      if (isSafeDataImageSrc(src)) {
        flushLine();
        lines.push(toImageToken(src.trim()));
      }
      return;
    }

    if (tag === 'br') {
      flushLine();
      return;
    }

    const isBlock = STEP_BLOCK_TAGS.has(tag);
    if (isBlock) flushLine();
    Array.from(element.childNodes).forEach(walk);
    if (isBlock) flushLine();
  };

  Array.from(doc.body.childNodes).forEach(walk);
  flushLine();
  return lines;
}

function toStepText(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function normalizeSteps(steps: unknown): string[] {
  if (Array.isArray(steps)) {
    return steps
      .flatMap(step => toStepText(step).split(/\r?\n/))
      .map(step => step.trim())
      .filter(step => step.length > 0);
  }

  if (typeof steps === 'string') {
    const lines = steps
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line.length > 0);
    if (lines.length > 1) return lines;
    const single = steps.trim();
    return single ? [single] : [];
  }

  if (steps && typeof steps === 'object') {
    return Object.values(steps as Record<string, unknown>)
      .flatMap(value => toStepText(value).split(/\r?\n/))
      .map(step => step.trim())
      .filter(step => step.length > 0);
  }

  return [];
}

function stepsLinesToHtml(lines: string[]): string {
  if (lines.length === 0) return '<p></p>';
  const items = lines.map(line => {
    const imageSrc = parseImageToken(line);
    if (imageSrc) {
      return `<li><img src=\"${imageSrc}\" alt=\"step image\" /></li>`;
    }
    return `<li>${escapeHtml(line)}</li>`;
  });
  return `<ol>${items.join('')}</ol>`;
}

function resolutionStepsToHtml(resolution: Resolution): string {
  if (resolution.stepsHtml && resolution.stepsHtml.trim()) return resolution.stepsHtml;
  return stepsLinesToHtml(normalizeSteps(resolution.steps));
}

function renderStepValue(step: string, index: number): React.ReactNode {
  const imageSrc = parseImageToken(step);
  if (imageSrc) {
    return (
      <img
        src={imageSrc}
        alt={`Step image ${index + 1}`}
        className="max-w-full h-auto rounded-md border border-slate-200 dark:border-zinc-700"
      />
    );
  }

  return <span>{step}</span>;
}

export const IssueDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [issue, setIssue] = useState<Issue | null>(null);
  const [editing, setEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [actionError, setActionError] = useState('');
  const [showResolutionForm, setShowResolutionForm] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkedRelationships, setLinkedRelationships] = useState<IssueRelationship[]>([]);
  const [sourceRelationship, setSourceRelationship] = useState<IssueRelationship | undefined>();
  const [allIssues, setAllIssues] = useState<Issue[]>([]);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [quickTagInput, setQuickTagInput] = useState('');
  const [quickTagMessage, setQuickTagMessage] = useState('');
  const [quickTagMessageTone, setQuickTagMessageTone] = useState<'info' | 'success' | 'error'>('info');
  const [linkSearch, setLinkSearch] = useState('');
  const [selectedLinkTarget, setSelectedLinkTarget] = useState<string>('');
  const [selectedRelType, setSelectedRelType] = useState<RelationshipType>('duplicate');
  const [copied, setCopied] = useState(false);
  const [inlineStatusSaving, setInlineStatusSaving] = useState(false);
  const [inlineStatusSaved, setInlineStatusSaved] = useState(false);
  const [editingResolutionId, setEditingResolutionId] = useState<string | null>(null);
  const [resolutionEditForm, setResolutionEditForm] = useState({
    stepsHtml: '<p></p>',
    notesHtml: '<p></p>',
    notesText: ''
  });

  const [editForm, setEditForm] = useState({
    title: '',
    descriptionHtml: '<p></p>',
    descriptionText: '',
    systemAffected: '',
    severity: 'Medium' as Severity,
    status: 'Open' as Status,
    assignee: '',
    tags: [] as TagReference[]
  });

  const [resolutionForm, setResolutionForm] = useState({
    stepsHtml: '<p></p>',
    notesHtml: '<p></p>',
    notesText: ''
  });

  const loadIssue = async () => {
    if (!id) return;
    const found = await getIssueById(id);
    if (!found) { navigate('/issues'); return; }
    setIssue(found);
    setEditForm({
      title: found.title,
      descriptionHtml: getIssueDescriptionHtml(found),
      descriptionText: getIssueDescriptionText(found),
      systemAffected: found.systemAffected,
      severity: found.severity,
      status: found.status,
      assignee: found.assignee ?? '',
      tags: found.tags ?? []
    });
    if (found.isMasterIncident) {
      setLinkedRelationships(await getRelationshipsForMaster(found.id));
    }
    const srcRel = await getRelationshipForSource(found.id);
    setSourceRelationship(srcRel);
  };

  useEffect(() => {
    const loadPageData = async () => {
      await loadIssue();
      setAllIssues(await getAllIssues());
      setAvailableTags(await listTags());
    };

    void loadPageData();
  }, [id]);

  useEffect(() => {
    const refreshTags = async () => {
      const tags = await listTags();
      const availableNames = new Set(tags.map(tag => tag.name));
      setAvailableTags(tags);
      setEditForm(prev => ({
        ...prev,
        tags: prev.tags.filter(tag => availableNames.has(tag))
      }));
      setIssue(prev => {
        if (!prev || !Array.isArray(prev.tags)) return prev;
        return {
          ...prev,
          tags: prev.tags.filter(tag => availableNames.has(tag))
        };
      });
    };
    const refreshIssue = async () => {
      await loadIssue();
      setAllIssues(await getAllIssues());
    };
    window.addEventListener(ISSUES_CHANGED_EVENT, refreshIssue);
    window.addEventListener(TAGS_CHANGED_EVENT, refreshTags);
    return () => {
      window.removeEventListener(ISSUES_CHANGED_EVENT, refreshIssue);
      window.removeEventListener(TAGS_CHANGED_EVENT, refreshTags);
    };
  }, []);

  if (!issue) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-slate-500 dark:text-zinc-500">Loading...</p>
      </div>
    );
  }

  const handleSave = async () => {
    if (!id) return;
    setActionError('');
    try {
      await updateIssue(id, {
        title: editForm.title,
        description: editForm.descriptionText,
        descriptionText: editForm.descriptionText,
        descriptionHtml: editForm.descriptionHtml,
        systemAffected: editForm.systemAffected,
        severity: editForm.severity,
        status: editForm.status,
        assignee: editForm.assignee || undefined,
        tags: editForm.tags
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
      setEditing(false);
      await loadIssue();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to update issue.');
    }
  };

  const handleInlineStatusChange = async (nextStatus: Status) => {
    if (!id || !issue || nextStatus === issue.status) return;
    setActionError('');
    setInlineStatusSaving(true);
    try {
      const updated = await updateIssue(id, { status: nextStatus });
      if (updated) {
        setIssue(updated);
        setEditForm(prev => ({ ...prev, status: nextStatus }));
        setAllIssues(await getAllIssues());
        setInlineStatusSaved(true);
        setTimeout(() => setInlineStatusSaved(false), 1200);
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to update issue status.');
    } finally {
      setInlineStatusSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    await deleteIssue(id);
    navigate('/issues');
  };

  const handleAddResolution = async () => {
    const steps = stepsHtmlToLines(resolutionForm.stepsHtml);
    if (!id || steps.length === 0) return;
    setActionError('');
    try {
      const notesText = resolutionForm.notesText.trim();
      const notesHtml = resolutionForm.notesHtml.trim();
      const stepsHtml = resolutionForm.stepsHtml.trim();
      await addResolution(id, {
        stepsHtml,
        steps,
        notes: notesText ? notesHtml : undefined,
        notesText: notesText || undefined
      });
      setResolutionForm({ stepsHtml: '<p></p>', notesHtml: '<p></p>', notesText: '' });
      setShowResolutionForm(false);
      await loadIssue();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to add resolution.');
    }
  };

  const startResolutionEdit = (resolution: Resolution) => {
    if (!resolution.id) return;
    setShowResolutionForm(false);
    setEditingResolutionId(resolution.id);
    setResolutionEditForm({
      stepsHtml: resolutionStepsToHtml(resolution),
      notesHtml: resolution.notes ?? plainTextToHtml(resolution.notesText ?? ''),
      notesText: resolution.notesText ?? ''
    });
  };

  const cancelResolutionEdit = () => {
    setEditingResolutionId(null);
    setResolutionEditForm({
      stepsHtml: '<p></p>',
      notesHtml: '<p></p>',
      notesText: ''
    });
  };

  const handleSaveResolutionEdit = async () => {
    if (!id || !editingResolutionId) return;
    const steps = stepsHtmlToLines(resolutionEditForm.stepsHtml);
    if (steps.length === 0) return;
    setActionError('');
    try {
      const notesText = resolutionEditForm.notesText.trim();
      const notesHtml = resolutionEditForm.notesHtml.trim();
      const updated = await updateResolution(id, editingResolutionId, {
        stepsHtml: resolutionEditForm.stepsHtml.trim(),
        steps,
        notes: notesText ? notesHtml : undefined,
        notesText: notesText || undefined,
      });

      if (!updated) return;
      setIssue(updated);
      setAllIssues(await getAllIssues());
      cancelResolutionEdit();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to update resolution.');
    }
  };

  const handleDeleteResolution = async (resolutionId: string) => {
    if (!id) return;
    const confirmed = window.confirm('Delete this resolution?');
    if (!confirmed) return;
    setActionError('');
    try {
      const updated = await deleteResolution(id, resolutionId);
      if (!updated) return;
      setIssue(updated);
      setAllIssues(await getAllIssues());

      if (editingResolutionId === resolutionId) {
        cancelResolutionEdit();
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to delete resolution.');
    }
  };

  const handlePromote = async () => {
    if (!id) return;
    await promoteToMasterIncident(id);
    await loadIssue();
  };

  const handleDemote = async () => {
    if (!id) return;
    await demoteMasterIncident(id);
    await loadIssue();
  };

  const handleLink = async () => {
    if (!id || !selectedLinkTarget) return;
    await linkIssueToMaster(id, selectedLinkTarget, selectedRelType);
    setShowLinkModal(false);
    setSelectedLinkTarget('');
    setLinkSearch('');
    await loadIssue();
  };

  const handleUnlink = async () => {
    if (!id) return;
    await unlinkIssue(id);
    await loadIssue();
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

  const handleIncrementReference = async (resolutionId: string) => {
    if (!id) return;
    setActionError('');
    try {
      await incrementReferenceCount(id, resolutionId);
      await loadIssue();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to update reference count.');
    }
  };

  const toggleTag = (tag: TagReference) => {
    setEditForm(prev => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag]
    }));
  };

  const selectTag = (tagName: string) => {
    setEditForm(prev => ({
      ...prev,
      tags: prev.tags.includes(tagName) ? prev.tags : [...prev.tags, tagName]
    }));
  };

  const quickTagNormalized = normalizeTagName(quickTagInput);
  const duplicateQuickTag = quickTagNormalized
    ? availableTags.find(tag => normalizeTagName(tag.name) === quickTagNormalized)
    : undefined;

  const handleQuickAddTag = async () => {
    if (!quickTagNormalized) return;

    if (duplicateQuickTag) {
      selectTag(duplicateQuickTag.name);
      setQuickTagMessage('Tag already exists - selected it.');
      setQuickTagMessageTone('info');
      return;
    }

    try {
      const created = await createTag({ name: quickTagInput });
      setAvailableTags(await listTags());
      selectTag(created.name);
      setQuickTagInput('');
      setQuickTagMessage('Tag added and selected.');
      setQuickTagMessageTone('success');
    } catch (err) {
      const existing = await getTagByName(quickTagInput);
      if (existing) {
        selectTag(existing.name);
        setQuickTagMessage('Tag already exists - selected it.');
        setQuickTagMessageTone('info');
        setAvailableTags(await listTags());
        return;
      }
      setQuickTagMessage(err instanceof Error ? err.message : 'Unable to add tag.');
      setQuickTagMessageTone('error');
    }
  };

  const isResolved = issue.status === 'Resolved' || issue.status === 'Closed';
  const confidenceScore = calculateConfidenceScore(issue);
  const issueResolutions = Array.isArray(issue.resolutions) ? issue.resolutions : [];
  const resolutionDraftSteps = stepsHtmlToLines(resolutionForm.stepsHtml);
  const resolutionEditDraftSteps = stepsHtmlToLines(resolutionEditForm.stepsHtml);
  const isResolutionEditing = editingResolutionId !== null;

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
            className={`flex items-center gap-2 text-sm transition-colors text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-100`}
          >
            <ArrowLeft size={16} />
            Back to Issues
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLink}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors border bg-white text-slate-700 hover:bg-slate-50 border-slate-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 dark:border-zinc-700`}
              title="Copy link to this issue"
            >
              {copied ? <Check size={13} className="text-emerald-400" /> : <Link size={13} />}
              {copied ? 'Copied!' : 'Copy Link'}
            </button>
            {!editing && (
              <button
                onClick={() => setEditing(true)}
                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors border bg-white text-slate-700 hover:bg-slate-50 border-slate-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 dark:border-zinc-700`}
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
                <span className={`text-xs text-slate-500 dark:text-zinc-400`}>Confirm delete?</span>
                <button
                  onClick={handleDelete}
                  className="text-xs px-3 py-1.5 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
                >
                  Yes, Delete
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className={`text-xs px-3 py-1.5 rounded-lg transition-colors border bg-white text-slate-700 hover:bg-slate-50 border-slate-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 dark:border-zinc-700`}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>

        {actionError && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-600 dark:border-red-500/25 dark:bg-red-500/10 dark:text-red-300">
            {actionError}
          </div>
        )}

        {saveSuccess && (
          <div className="mb-4 px-4 py-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-2">
            <CheckCircle2 size={14} />
            Changes saved successfully.
          </div>
        )}

        {/* Main Card */}
        <div className={`border rounded-xl p-6 mb-6 bg-white border-slate-200 dark:bg-zinc-900 dark:border-zinc-800`}>
          {/* Header */}
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <span className={`text-xs font-mono text-slate-500 dark:text-zinc-500`}>{issue.id}</span>
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
                  className={`w-full border rounded-lg px-3 py-2 text-lg font-semibold focus:outline-none focus:border-amber-500 bg-slate-50 border-slate-200 text-slate-900 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100`}
                  value={editForm.title}
                  onChange={e => setEditForm(p => ({ ...p, title: e.target.value }))}
                />
              ) : (
                <h1 className={`text-xl font-bold text-slate-900 dark:text-zinc-100`}>{issue.title}</h1>
              )}
            </div>
            <div className="flex flex-col items-end gap-2">
              {editing ? (
                <select
                  className={`border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-amber-500 bg-white border-slate-200 text-slate-900 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100`}
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
          <div className={`flex flex-wrap gap-4 text-xs mb-4 text-slate-500 dark:text-zinc-500`}>
            <span className="flex items-center gap-1.5">
              <Monitor size={12} />
              {editing ? (
                <input
                  className={`border rounded px-2 py-0.5 focus:outline-none focus:border-amber-500 bg-white border-slate-200 text-slate-700 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-300`}
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
                    className={`border rounded px-2 py-0.5 focus:outline-none focus:border-amber-500 bg-white border-slate-200 text-slate-700 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-300`}
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
                className={`border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-amber-500 bg-white border-slate-200 text-slate-900 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100`}
                value={editForm.status}
                onChange={e => setEditForm(p => ({ ...p, status: e.target.value as Status }))}
              >
                {STATUS_OPTIONS.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            ) : (
              <div className="flex items-center gap-2">
                <StatusBadge status={issue.status} />
                <select
                  className="border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-amber-500 bg-white border-slate-200 text-slate-900 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100"
                  value={issue.status}
                  disabled={inlineStatusSaving}
                  onChange={e => handleInlineStatusChange(e.target.value as Status)}
                >
                  {STATUS_OPTIONS.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                {inlineStatusSaving && <span className="text-xs text-slate-500 dark:text-zinc-500">Saving...</span>}
                {!inlineStatusSaving && inlineStatusSaved && <span className="text-xs text-emerald-500">Saved</span>}
              </div>
            )}
          </div>

          {/* Tags */}
          <div className="mb-4">
            {editing ? (
              <div>
                <p className={`text-xs mb-2 text-slate-500 dark:text-zinc-500`}>Tags</p>
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="text"
                    value={quickTagInput}
                    onChange={e => {
                      setQuickTagInput(e.target.value);
                      setQuickTagMessage('');
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleQuickAddTag();
                      }
                    }}
                    placeholder="New tag name..."
                    className="flex-1 border rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 bg-white border-slate-200 text-slate-900 placeholder-slate-400 dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-100 dark:placeholder-zinc-500"
                  />
                  <button
                    type="button"
                    onClick={handleQuickAddTag}
                    disabled={!quickTagNormalized}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-400 text-zinc-900 hover:bg-amber-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Add
                  </button>
                </div>
                {quickTagMessage && (
                  <p className={`text-xs mb-2 ${
                    quickTagMessageTone === 'error'
                      ? 'text-red-500'
                      : quickTagMessageTone === 'success'
                        ? 'text-emerald-500'
                        : 'text-amber-500'
                  }`}>
                    {quickTagMessage}
                  </p>
                )}
                {!quickTagMessage && duplicateQuickTag && (
                  <p className="text-xs mb-2 text-amber-500">
                    Tag already exists. Click Add to select it.
                  </p>
                )}
                <div className="flex flex-wrap gap-1.5">
                  {availableTags.map(tag => (
                    <TagBadge
                      key={tag.id}
                      tag={tag.name}
                      label={tag.name}
                      color={tag.color}
                      selected={editForm.tags.includes(tag.name)}
                      interactive
                      onClick={toggleTag}
                    />
                  ))}
                </div>
              </div>
            ) : Array.isArray(issue.tags) && issue.tags.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {issue.tags.map(tag => <TagBadge key={tag} tag={tag} />)}
              </div>
            ) : null}
          </div>

          {/* Description */}
          <div className="mb-4">
            <p className={`text-xs font-medium uppercase tracking-wider mb-2 flex items-center gap-1.5 text-slate-500 dark:text-zinc-500`}>
              <FileText size={11} /> Description
            </p>
            {editing ? (
              <RichTextEditor
                valueHtml={editForm.descriptionHtml}
                onChangeHtml={html => setEditForm(p => ({ ...p, descriptionHtml: html }))}
                onChangeText={text => setEditForm(p => ({ ...p, descriptionText: text }))}
                placeholder="Describe symptoms, impact, and context..."
              />
            ) : (
              <SanitizedHtmlContent
                html={issue.descriptionHtml ?? plainTextToHtml(getIssueDescriptionText(issue))}
                className="prose prose-sm max-w-none text-slate-700 dark:text-zinc-300 dark:prose-invert prose-img:rounded-md prose-img:border prose-img:border-slate-200 dark:prose-img:border-zinc-700"
              />
            )}
          </div>

          {/* Edit Actions */}
          {editing && (
            <div className={`flex items-center gap-2 pt-4 border-t border-slate-200 dark:border-zinc-800`}>
              <button
                onClick={handleSave}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500 text-zinc-900 text-sm font-semibold hover:bg-amber-400 transition-colors"
              >
                <Save size={14} /> Save Changes
              </button>
              <button
                onClick={() => { setEditing(false); loadIssue(); }}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm transition-colors border bg-white text-slate-700 hover:bg-slate-50 border-slate-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 dark:border-zinc-700`}
              >
                <X size={14} /> Cancel
              </button>
            </div>
          )}
        </div>

        {/* Master Incident Controls */}
        <div className={`border rounded-xl p-5 mb-6 bg-white border-slate-200 dark:bg-zinc-900 dark:border-zinc-800`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Star size={15} className="text-violet-400" />
              <h2 className={`text-sm font-semibold text-slate-900 dark:text-zinc-200`}>Master Incident</h2>
            </div>
            {issue.isMasterIncident ? (
              <button
                onClick={handleDemote}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-colors bg-white text-slate-600 hover:bg-slate-50 border-slate-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:border-zinc-700`}
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
              <div className={`flex items-center gap-4 text-xs mb-4 text-slate-500 dark:text-zinc-400`}>
                <span className="flex items-center gap-1.5">
                  <Link2 size={11} />
                  {linkedRelationships.length} linked incident{linkedRelationships.length !== 1 ? 's' : ''}
                </span>
                {typeof issue.linkedIncidentCount === 'number' && (
                  <span className="text-slate-500 dark:text-zinc-500">({issue.linkedIncidentCount} total tracked)</span>
                )}
              </div>
              {linkedRelationships.length > 0 ? (
                <div className="space-y-2">
                  {linkedRelationships.map(rel => {
                    const src = allIssues.find(i => i.id === rel.sourceId);
                    return src ? (
                      <div
                        key={rel.id}
                        className={`flex items-center justify-between px-3 py-2 rounded-lg border cursor-pointer transition-colors bg-slate-50 border-slate-200 hover:border-slate-300 dark:bg-zinc-800/60 dark:border-zinc-700/50 dark:hover:border-zinc-600`}
                        onClick={() => navigate(`/issues/${src.id}`)}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`text-xs font-mono shrink-0 text-slate-500 dark:text-zinc-500`}>{src.id}</span>
                          <span className={`text-xs truncate text-slate-700 dark:text-zinc-300`}>{src.title}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`text-xs text-slate-500 dark:text-zinc-500`}>{RELATIONSHIP_LABELS[rel.relationshipType]}</span>
                          <ChevronRight size={12} className="text-slate-400 dark:text-zinc-600" />
                        </div>
                      </div>
                    ) : null;
                  })}
                </div>
              ) : (
                <p className={`text-xs text-slate-500 dark:text-zinc-500`}>No linked incidents yet. Other issues can be linked to this master incident.</p>
              )}
            </div>
          ) : (
            <div>
              {sourceRelationship && masterIssue ? (
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-xs mb-1 text-slate-500 dark:text-zinc-500`}>Linked to master incident:</p>
                    <button
                      onClick={() => navigate(`/issues/${masterIssue.id}`)}
                      className={`flex items-center gap-2 text-sm text-violet-400 transition-colors hover:text-violet-500 dark:hover:text-violet-300`}
                    >
                      <Star size={12} fill="currentColor" />
                      <span className="font-mono text-xs">{masterIssue.id}</span>
                      <span className="truncate max-w-xs">{masterIssue.title}</span>
                      <ChevronRight size={12} />
                    </button>
                    <p className={`text-xs mt-1 text-slate-400 dark:text-zinc-600`}>{RELATIONSHIP_LABELS[sourceRelationship.relationshipType]}</p>
                  </div>
                  <button
                    onClick={handleUnlink}
                    className={`text-xs px-3 py-1.5 rounded-lg border transition-colors bg-white text-slate-600 hover:bg-slate-50 border-slate-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:border-zinc-700`}
                  >
                    Unlink
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <p className={`text-xs text-slate-500 dark:text-zinc-500`}>This issue is not linked to any master incident.</p>
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
        <div className={`border rounded-xl p-5 mb-6 bg-white border-slate-200 dark:bg-zinc-900 dark:border-zinc-800`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BookOpen size={15} className="text-amber-400" />
              <h2 className={`text-sm font-semibold text-slate-900 dark:text-zinc-200`}>Resolutions</h2>
              {issueResolutions.length > 0 && (
                <span className="text-xs px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  {issueResolutions.length}
                </span>
              )}
            </div>
            <button
              onClick={() => setShowResolutionForm(!showResolutionForm)}
              disabled={isResolutionEditing}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Plus size={12} />
              Add Resolution
            </button>
          </div>

          {showResolutionForm && (
            <div className={`mb-4 p-4 rounded-lg border bg-slate-50 border-slate-200 dark:bg-zinc-800/50 dark:border-zinc-700`}>
              <p className={`text-xs font-semibold mb-3 text-slate-900 dark:text-zinc-300`}>New Resolution</p>
              <div className="space-y-3">
                <div>
                  <label className={`text-xs mb-1 block text-slate-500 dark:text-zinc-500`}>Steps * (one per line)</label>
                  <RichTextEditor
                    valueHtml={resolutionForm.stepsHtml}
                    onChangeHtml={html => setResolutionForm(p => ({ ...p, stepsHtml: html }))}
                    placeholder="Step 1, Step 2, Step 3 (one per line). You can also paste images."
                  />
                </div>
                <div>
                  <label className={`text-xs mb-1 block text-slate-500 dark:text-zinc-500`}>Notes (optional)</label>
                  <RichTextEditor
                    valueHtml={resolutionForm.notesHtml}
                    onChangeHtml={html => setResolutionForm(p => ({ ...p, notesHtml: html }))}
                    onChangeText={text => setResolutionForm(p => ({ ...p, notesText: text }))}
                    placeholder="Additional notes..."
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleAddResolution}
                    disabled={resolutionDraftSteps.length === 0}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500 text-zinc-900 text-xs font-semibold hover:bg-amber-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Save size={12} /> Save Resolution
                  </button>
                  <button
                    onClick={() => { setShowResolutionForm(false); setResolutionForm({ stepsHtml: '<p></p>', notesHtml: '<p></p>', notesText: '' }); }}
                    className={`px-4 py-2 rounded-lg text-xs transition-colors bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600`}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {issueResolutions.length > 0 ? (
            <div className="space-y-3">
              {issueResolutions.map((res, idx) => {
                const steps = normalizeSteps(res.steps);
                const hasStepsHtml = typeof res.stepsHtml === 'string' && res.stepsHtml.trim().length > 0;
                const isEditingThis = Boolean(res.id) && editingResolutionId === res.id;
                const disableActions = isResolutionEditing && !isEditingThis;
                return (
                  <div key={res.id ?? idx} className={`p-4 rounded-lg border bg-slate-50 border-slate-200 dark:bg-zinc-800/40 dark:border-zinc-700/50`}>
                    <div className="flex items-start justify-between mb-2">
                      <h3 className={`text-sm font-semibold text-slate-900 dark:text-zinc-200`}>
                        {isEditingThis ? 'Edit Resolution' : `Resolution #${idx + 1}`}
                      </h3>
                      <div className="flex items-center gap-2">
                        {!isEditingThis && (res.referenceCount ?? 0) > 0 && (
                          <span className={`text-xs text-slate-500 dark:text-zinc-500`}>{res.referenceCount} use{res.referenceCount !== 1 ? 's' : ''}</span>
                        )}
                        {!isEditingThis && (
                          <>
                            <button
                              onClick={() => handleIncrementReference(res.id ?? '')}
                              disabled={disableActions || !res.id}
                              className={`flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200 dark:bg-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-600 dark:hover:text-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed`}
                              title="Mark as used"
                            >
                              <BookOpen size={10} /> Used
                            </button>
                            <button
                              onClick={() => startResolutionEdit(res)}
                              disabled={disableActions || !res.id}
                              className="text-xs px-2 py-1 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteResolution(res.id ?? '')}
                              disabled={disableActions || !res.id}
                              className="text-xs px-2 py-1 rounded border border-red-500/30 bg-red-500/10 text-red-500 hover:bg-red-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    {isEditingThis ? (
                      <div className="space-y-3">
                        <div>
                          <label className={`text-xs mb-1 block text-slate-500 dark:text-zinc-500`}>Steps *</label>
                          <RichTextEditor
                            valueHtml={resolutionEditForm.stepsHtml}
                            onChangeHtml={html => setResolutionEditForm(p => ({ ...p, stepsHtml: html }))}
                            placeholder="Resolution steps..."
                          />
                        </div>
                        <div>
                          <label className={`text-xs mb-1 block text-slate-500 dark:text-zinc-500`}>Notes (optional)</label>
                          <RichTextEditor
                            valueHtml={resolutionEditForm.notesHtml}
                            onChangeHtml={html => setResolutionEditForm(p => ({ ...p, notesHtml: html }))}
                            onChangeText={text => setResolutionEditForm(p => ({ ...p, notesText: text }))}
                            placeholder="Additional notes..."
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={handleSaveResolutionEdit}
                            disabled={resolutionEditDraftSteps.length === 0}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500 text-zinc-900 text-xs font-semibold hover:bg-amber-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <Save size={12} /> Save
                          </button>
                          <button
                            onClick={cancelResolutionEdit}
                            className="px-4 py-2 rounded-lg text-xs transition-colors bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {hasStepsHtml ? (
                          <SanitizedHtmlContent
                            html={res.stepsHtml}
                            className="prose prose-sm max-w-none mb-2 text-slate-700 dark:text-zinc-300 dark:prose-invert prose-li:my-0 prose-img:rounded-md prose-img:border prose-img:border-slate-200 dark:prose-img:border-zinc-700"
                          />
                        ) : steps.length > 0 ? (
                          <ol className="space-y-1 mb-2">
                            {steps.map((step, si) => (
                              <li key={si} className={`text-xs flex gap-2 text-slate-700 dark:text-zinc-400`}>
                                <span className={`shrink-0 text-slate-400 dark:text-zinc-600`}>{si + 1}.</span>
                                {renderStepValue(step, si)}
                              </li>
                            ))}
                          </ol>
                        ) : (
                          <p className={`text-xs mb-2 text-slate-500 dark:text-zinc-500`}>No steps available.</p>
                        )}
                        {(res.notes || res.notesText) && (
                          <div className="mt-2 pt-2 border-t border-slate-200 dark:border-zinc-700/50">
                            <SanitizedHtmlContent
                              html={res.notes ?? plainTextToHtml(res.notesText ?? '')}
                              className="prose prose-sm max-w-none text-xs italic text-slate-600 dark:text-zinc-400 dark:prose-invert prose-img:rounded-md prose-img:border prose-img:border-slate-200 dark:prose-img:border-zinc-700"
                            />
                          </div>
                        )}
                      </>
                    )}
                    {res.createdAt && (
                      <p className={`text-xs mt-2 text-slate-400 dark:text-zinc-600`}>{formatRelativeTime(res.createdAt)}</p>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className={`text-xs text-slate-500 dark:text-zinc-500`}>No resolutions documented yet. Add one to help future troubleshooting.</p>
          )}
        </div>

        {/* Confidence Info */}
        <div className={`border rounded-xl p-5 bg-white border-slate-200 dark:bg-zinc-900 dark:border-zinc-800`}>
          <div className="flex items-center gap-2 mb-3">
            <Shield size={15} className="text-zinc-400" />
            <h2 className={`text-sm font-semibold text-slate-900 dark:text-zinc-200`}>Confidence Score</h2>
          </div>
          <div className="flex items-center gap-3 mb-3">
            <div className={`flex-1 h-2 rounded-full overflow-hidden bg-slate-200 dark:bg-zinc-800`}>
              <div
                className={`h-full rounded-full transition-all ${
                  confidenceScore >= 70 ? 'bg-emerald-500' :
                  confidenceScore >= 40 ? 'bg-amber-500' : 'bg-zinc-500'
                }`}
                style={{ width: `${confidenceScore}%` }}
              />
            </div>
            <span className={`text-sm font-bold text-slate-900 dark:text-zinc-200`}>{confidenceScore}%</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className={`flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 dark:bg-zinc-800/50`}>
              <span className="text-slate-500 dark:text-zinc-500">Resolutions</span>
              <span className={`font-medium ${ issueResolutions.length > 0 ? 'text-emerald-400' : 'text-zinc-600'}`}>
                {issueResolutions.length > 0 ? `${issueResolutions.length} added` : 'None'}
              </span>
            </div>
            <div className={`flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 dark:bg-zinc-800/50`}>
              <span className="text-slate-500 dark:text-zinc-500">Reference Uses</span>
              <span className={`font-medium ${ (issue.referenceCount ?? 0) > 0 ? 'text-emerald-400' : 'text-zinc-600'}`}>
                {issue.referenceCount ?? 0}
              </span>
            </div>
            <div className={`flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 dark:bg-zinc-800/50`}>
              <span className="text-slate-500 dark:text-zinc-500">Status</span>
              <span className={`font-medium ${isResolved ? 'text-emerald-400' : 'text-zinc-400'}`}>
                {isResolved ? 'Resolved' : 'Active'}
              </span>
            </div>
            <div className={`flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 dark:bg-zinc-800/50`}>
              <span className="text-slate-500 dark:text-zinc-500">Linked Incidents</span>
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
          <div className={`border rounded-2xl w-full max-w-md shadow-2xl bg-white border-slate-200 dark:bg-zinc-900 dark:border-zinc-700`}>
            <div className={`flex items-center justify-between p-5 border-b border-slate-200 dark:border-zinc-800`}>
              <div className="flex items-center gap-2">
                <Link2 size={16} className="text-blue-400" />
                <h3 className={`text-sm font-semibold text-slate-900 dark:text-zinc-100`}>Link to Master Incident</h3>
              </div>
              <button
                onClick={() => { setShowLinkModal(false); setSelectedLinkTarget(''); setLinkSearch(''); }}
                className={`transition-colors text-slate-400 hover:text-slate-700 dark:text-zinc-500 dark:hover:text-zinc-300`}
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-5">
              <div className="relative mb-3">
                <Search size={13} className={`absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500`} />
                <input
                  className={`w-full border rounded-lg pl-8 pr-3 py-2 text-sm focus:outline-none focus:border-amber-500 bg-white border-slate-200 text-slate-900 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-200`}
                  placeholder="Search master incidents..."
                  value={linkSearch}
                  onChange={e => setLinkSearch(e.target.value)}
                />
              </div>
              <div className="mb-3">
                <label className={`text-xs mb-1 block text-slate-500 dark:text-zinc-500`}>Relationship Type</label>
                <select
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500 bg-white border-slate-200 text-slate-900 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-200`}
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
                  <p className={`text-xs text-center py-4 text-slate-500 dark:text-zinc-500`}>No master incidents found.</p>
                ) : linkableMasters.map(mi => (
                  <div
                    key={mi.id}
                    onClick={() => setSelectedLinkTarget(mi.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors border ${
                      selectedLinkTarget === mi.id
                        ? 'bg-blue-500/15 border-blue-500/40 text-blue-300'
                        : 'bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-700 dark:bg-zinc-800/50 dark:border-zinc-700/50 dark:hover:border-zinc-600 dark:text-zinc-300'
                    }`}
                  >
                    <Star size={10} className="text-violet-400 shrink-0" fill="currentColor" />
                    <span className={`text-xs font-mono shrink-0 text-slate-500 dark:text-zinc-500`}>{mi.id}</span>
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
                  className={`px-4 py-2 rounded-lg text-sm border transition-colors bg-white text-slate-700 hover:bg-slate-50 border-slate-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 dark:border-zinc-700`}
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

