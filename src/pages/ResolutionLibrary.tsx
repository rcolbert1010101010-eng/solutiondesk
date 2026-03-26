import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, LayoutGrid, List, Plus, Save, Search, SlidersHorizontal, Tag as TagIcon, X } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { AttachmentPanel } from '../components/AttachmentPanel';
import { RichTextEditor } from '../components/RichTextEditor';
import { ResolutionCard } from '../components/ResolutionCard';
import { ResolutionPreviewDialog } from '../components/ResolutionPreviewDialog';
import { ResolutionTable } from '../components/ResolutionTable';
import { TagBadge } from '../components/TagBadge';
import { createAttachmentDraftState, getAttachmentSyncInput, type AttachmentDraftState } from '../lib/attachments';
import { plainTextToHtml } from '../lib/richText';
import {
  getResolutionStepsHtml,
  getResolutionSearchText,
  getResolutionUpdatedAt,
  stepsHtmlToLines,
} from '../lib/resolutionLibrary';
import { listTags, normalizeTagName, TAGS_CHANGED_EVENT } from '../lib/tags';
import { addOrSelectQuickTag, findQuickTagMatch } from '../lib/tagQuickAdd';
import {
  createLibraryResolution,
  deleteLibraryResolution,
  formatSupabaseError,
  listLibraryResolutions,
  RESOLUTIONS_CHANGED_EVENT,
  syncResolutionAttachmentsInStore,
  updateLibraryResolution,
} from '../lib/supabaseData';
import type { Resolution, Tag } from '../types';

interface ResolutionFormState {
  title: string;
  stepsHtml: string;
  notesHtml: string;
  notesText: string;
  tags: string[];
}

const EMPTY_FORM: ResolutionFormState = {
  title: '',
  stepsHtml: '<p></p>',
  notesHtml: '<p></p>',
  notesText: '',
  tags: [],
};

type ViewMode = 'table' | 'grid';
type SourceFilter = 'All' | 'Library' | 'From Issue';

export const ResolutionLibrary: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [resolutions, setResolutions] = useState<Resolution[]>([]);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [search, setSearch] = useState('');
  const [tagFilter, setTagFilter] = useState<string | 'All'>('All');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('All');
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [showFilters, setShowFilters] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ResolutionFormState>(EMPTY_FORM);
  const [attachmentDraftState, setAttachmentDraftState] = useState<AttachmentDraftState>(createAttachmentDraftState());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [previewingResolution, setPreviewingResolution] = useState<Resolution | null>(null);
  const [quickTagInput, setQuickTagInput] = useState('');
  const [quickTagMessage, setQuickTagMessage] = useState('');
  const [quickTagMessageTone, setQuickTagMessageTone] = useState<'info' | 'success' | 'error'>('info');

  useEffect(() => {
    const load = async () => {
      const [nextResolutions, nextTags] = await Promise.all([
        listLibraryResolutions(),
        listTags(),
      ]);
      setResolutions(nextResolutions);
      setAvailableTags(nextTags);
    };

    void load();
    window.addEventListener(RESOLUTIONS_CHANGED_EVENT, load);
    window.addEventListener(TAGS_CHANGED_EVENT, load);
    return () => {
      window.removeEventListener(RESOLUTIONS_CHANGED_EVENT, load);
      window.removeEventListener(TAGS_CHANGED_EVENT, load);
    };
  }, []);

  useEffect(() => {
    if (tagFilter === 'All') return;
    const exists = availableTags.some(tag => tag.name === tagFilter);
    if (!exists) {
      setTagFilter('All');
    }
  }, [availableTags, tagFilter]);

  const filteredResolutions = useMemo(() => {
    const query = search.trim().toLowerCase();

    return [...resolutions]
      .filter(resolution => {
        const matchesSearch = query === '' || getResolutionSearchText(resolution).includes(query);
        const matchesTag = tagFilter === 'All' || (resolution.tags ?? []).includes(tagFilter);
        const matchesSource =
          sourceFilter === 'All'
          || (sourceFilter === 'Library' && resolution.sourceType !== 'issue')
          || (sourceFilter === 'From Issue' && resolution.sourceType === 'issue');

        return matchesSearch && matchesTag && matchesSource;
      })
      .sort((a, b) => new Date(getResolutionUpdatedAt(b)).getTime() - new Date(getResolutionUpdatedAt(a)).getTime());
  }, [resolutions, search, sourceFilter, tagFilter]);

  const activeFilterCount = [
    tagFilter !== 'All',
    sourceFilter !== 'All',
  ].filter(Boolean).length;

  const quickTagNormalized = normalizeTagName(quickTagInput);
  const duplicateQuickTag = quickTagNormalized
    ? findQuickTagMatch(quickTagInput, availableTags)
    : undefined;
  const draftSteps = stepsHtmlToLines(form.stepsHtml);

  const resetForm = () => {
    setError('');
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(false);
    setAttachmentDraftState(createAttachmentDraftState());
    setQuickTagInput('');
    setQuickTagMessage('');
  };

  const startCreate = () => {
    setError('');
    setEditingId(null);
    setForm(EMPTY_FORM);
    setAttachmentDraftState(createAttachmentDraftState());
    setQuickTagInput('');
    setQuickTagMessage('');
    setShowForm(true);
  };

  const startEdit = (resolution: Resolution) => {
    setError('');
    setEditingId(resolution.id ?? null);
    setForm({
      title: resolution.title ?? resolution.summary ?? '',
      stepsHtml: getResolutionStepsHtml(resolution),
      notesHtml: resolution.notes ?? plainTextToHtml(resolution.notesText ?? ''),
      notesText: resolution.notesText ?? '',
      tags: Array.isArray(resolution.tags) ? resolution.tags : [],
    });
    setAttachmentDraftState(createAttachmentDraftState(resolution.attachments ?? []));
    setQuickTagInput('');
    setQuickTagMessage('');
    setShowForm(true);
  };

  useEffect(() => {
    const requestedEditId = searchParams.get('edit');
    if (!requestedEditId) return;

    const requestedResolution = resolutions.find(resolution => (
      resolution.id === requestedEditId && resolution.sourceType !== 'issue'
    ));
    if (!requestedResolution) return;

    startEdit(requestedResolution);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('edit');
    setSearchParams(nextParams, { replace: true });
    window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }, [resolutions, searchParams, setSearchParams]);

  const toggleTag = (tagName: string) => {
    setForm(current => ({
      ...current,
      tags: current.tags.includes(tagName)
        ? current.tags.filter(tag => tag !== tagName)
        : [...current.tags, tagName],
    }));
  };

  const selectTag = (tagName: string) => {
    setForm(current => ({
      ...current,
      tags: current.tags.includes(tagName) ? current.tags : [...current.tags, tagName],
    }));
  };

  const handleQuickAddTag = async () => {
    if (!quickTagNormalized) return;

    const result = await addOrSelectQuickTag(quickTagInput, availableTags);
    setAvailableTags(result.availableTags);
    if (result.selectedTagName) {
      selectTag(result.selectedTagName);
    }
    if (result.clearInput) {
      setQuickTagInput('');
    }
    setQuickTagMessage(result.message);
    setQuickTagMessageTone(result.tone);
  };

  const handleSubmit = async () => {
    const steps = stepsHtmlToLines(form.stepsHtml);
    const title = form.title.trim();
    if (!title || steps.length === 0) {
      setError('Title and at least one step are required.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const payload: Omit<Resolution, 'id'> = {
        title,
        summary: title,
        stepsHtml: form.stepsHtml.trim(),
        steps,
        notes: form.notesText.trim() ? form.notesHtml.trim() : undefined,
        notesText: form.notesText.trim() || undefined,
        tags: form.tags,
      };

      const savedResolution = editingId
        ? await updateLibraryResolution(editingId, payload)
        : await createLibraryResolution(payload);

      if (savedResolution?.id) {
        const attachmentSync = getAttachmentSyncInput(attachmentDraftState);
        if (attachmentSync.attachmentIdsToDelete.length > 0 || attachmentSync.filesToUpload.length > 0) {
          await syncResolutionAttachmentsInStore(savedResolution.id, attachmentSync);
        }
      }

      resetForm();
      setResolutions(await listLibraryResolutions());
    } catch (err) {
      setError(formatSupabaseError(err, 'Unable to save library resolution.').message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm('Delete this library resolution?');
    if (!confirmed) return;

    setError('');
    try {
      await deleteLibraryResolution(id);
      setResolutions(await listLibraryResolutions());
      if (editingId === id) {
        resetForm();
      }
    } catch (err) {
      setError(formatSupabaseError(err, 'Unable to delete library resolution.').message);
    }
  };

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-zinc-100">Resolution Library</h1>
            <p className="text-sm mt-1 text-slate-500 dark:text-zinc-500">{resolutions.length} total resolutions tracked</p>
          </div>
          <button
            onClick={startCreate}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 text-zinc-900 text-sm font-semibold hover:bg-amber-400 transition-colors"
          >
            <Plus size={14} />
            New Library Resolution
          </button>
        </div>

        <div className="flex flex-col gap-3 mb-6">
          <div className="flex gap-3 items-center">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
              <input
                type="text"
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder="Search by title, notes, steps, or tag..."
                className="w-full border rounded-lg pl-9 pr-9 py-2 text-sm focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 bg-white border-slate-200 text-slate-900 placeholder-slate-400 dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-100 dark:placeholder-zinc-500"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:text-zinc-500 dark:hover:text-zinc-300"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowFilters(value => !value)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                showFilters || activeFilterCount > 0
                  ? 'border-amber-500/50 bg-amber-500/10 text-amber-400'
                  : 'border-slate-200 bg-white text-slate-500 hover:text-slate-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
              }`}
            >
              <SlidersHorizontal size={14} />
              Filters
              {activeFilterCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-amber-400 text-zinc-900 text-xs font-bold flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>

            <div className="flex rounded-lg border overflow-hidden border-slate-200 dark:border-zinc-700">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-2 transition-colors ${
                  viewMode === 'table'
                    ? 'bg-slate-100 text-slate-900 dark:bg-zinc-700 dark:text-zinc-100'
                    : 'bg-white text-slate-500 hover:text-slate-700 dark:bg-zinc-900 dark:text-zinc-500 dark:hover:text-zinc-300'
                }`}
              >
                <List size={14} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-2 transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-slate-100 text-slate-900 dark:bg-zinc-700 dark:text-zinc-100'
                    : 'bg-white text-slate-500 hover:text-slate-700 dark:bg-zinc-900 dark:text-zinc-500 dark:hover:text-zinc-300'
                }`}
              >
                <LayoutGrid size={14} />
              </button>
            </div>
          </div>

          {showFilters && (
            <div className="flex flex-wrap gap-4 p-4 border rounded-xl bg-white border-slate-200 dark:bg-zinc-900 dark:border-zinc-800">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-zinc-500">Source</label>
                <div className="flex gap-1.5 flex-wrap">
                  {(['All', 'Library', 'From Issue'] as const).map(source => (
                    <button
                      key={source}
                      type="button"
                      onClick={() => setSourceFilter(source)}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                        sourceFilter === source
                          ? 'bg-amber-400/15 text-amber-400 border border-amber-500/30'
                          : 'bg-slate-50 text-slate-700 border border-slate-200 hover:border-slate-300 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-600'
                      }`}
                    >
                      {source}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-zinc-500">
                  <span className="flex items-center gap-1"><TagIcon size={10} /> Tags</span>
                </label>
                <div className="flex gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setTagFilter('All')}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                      tagFilter === 'All'
                        ? 'bg-amber-400/15 text-amber-400 border border-amber-500/30'
                        : 'bg-slate-50 text-slate-700 border border-slate-200 hover:border-slate-300 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-600'
                    }`}
                  >
                    All
                  </button>
                  {availableTags.map(tag => (
                    <TagBadge
                      key={tag.id}
                      tag={tag.name}
                      label={tag.name}
                      color={tag.color}
                      selected={tagFilter === tag.name}
                      onClick={() => setTagFilter(tagFilter === tag.name ? 'All' : tag.name)}
                    />
                  ))}
                </div>
              </div>

              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={() => { setTagFilter('All'); setSourceFilter('All'); }}
                  className="flex items-center gap-1 text-xs transition-colors mt-auto text-slate-500 hover:text-red-500 dark:text-zinc-500 dark:hover:text-red-400"
                >
                  <X size={11} /> Clear filters
                </button>
              )}
            </div>
          )}
        </div>

        {(showForm || error) && (
          <div className="mb-6 border rounded-xl p-5 bg-white border-slate-200 dark:bg-zinc-900 dark:border-zinc-800">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-zinc-100">
                {editingId ? 'Edit Library Resolution' : 'New Library Resolution'}
              </h2>
              <button
                onClick={resetForm}
                className="text-slate-400 hover:text-slate-700 dark:text-zinc-500 dark:hover:text-zinc-300"
              >
                <X size={16} />
              </button>
            </div>

            {error && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-600 dark:border-red-500/25 dark:bg-red-500/10 dark:text-red-300">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="text-xs mb-1 block text-slate-500 dark:text-zinc-500">Title *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={event => setForm(current => ({ ...current, title: event.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500 bg-white border-slate-200 text-slate-900 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-200"
                  placeholder="Reusable VPN reset playbook"
                />
              </div>

              <div>
                <label className="text-xs mb-1 block text-slate-500 dark:text-zinc-500">Steps *</label>
                <RichTextEditor
                  valueHtml={form.stepsHtml}
                  onChangeHtml={html => setForm(current => ({ ...current, stepsHtml: html }))}
                  placeholder="Resolution steps, ordered list items, and screenshots..."
                />
              </div>

              <div>
                <label className="text-xs mb-1 block text-slate-500 dark:text-zinc-500">Notes</label>
                <RichTextEditor
                  valueHtml={form.notesHtml}
                  onChangeHtml={html => setForm(current => ({ ...current, notesHtml: html }))}
                  onChangeText={text => setForm(current => ({ ...current, notesText: text }))}
                  placeholder="Root cause, caveats, screenshots, or escalation notes..."
                />
              </div>

              <div>
                <label className="text-xs mb-2 block text-slate-500 dark:text-zinc-500">Tags</label>
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="text"
                    value={quickTagInput}
                    onChange={event => {
                      setQuickTagInput(event.target.value);
                      setQuickTagMessage('');
                    }}
                    onKeyDown={event => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        void handleQuickAddTag();
                      }
                    }}
                    placeholder="New tag..."
                    className="flex-1 border rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 bg-white border-slate-200 text-slate-900 placeholder-slate-400 dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-100 dark:placeholder-zinc-500"
                  />
                  <button
                    type="button"
                    onClick={() => { void handleQuickAddTag(); }}
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
                <div className="flex flex-wrap gap-2">
                  {availableTags.map(tag => {
                    const selected = form.tags.includes(tag.name);
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => toggleTag(tag.name)}
                        className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                          selected
                            ? 'border-amber-500/40 bg-amber-500/10 text-amber-400'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:text-zinc-100'
                        }`}
                      >
                        {tag.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <AttachmentPanel
                mode="edit"
                title="Attachments"
                draftState={attachmentDraftState}
                onChangeDraftState={setAttachmentDraftState}
                busy={saving}
                emptyMessage="No attachments selected for this resolution."
              />

              <div className="flex gap-2">
                <button
                  onClick={handleSubmit}
                  disabled={saving || draftSteps.length === 0}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500 text-zinc-900 text-xs font-semibold hover:bg-amber-400 transition-colors disabled:opacity-50"
                >
                  <Save size={12} />
                  {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Create Resolution'}
                </button>
                <button
                  onClick={resetForm}
                  className="px-4 py-2 rounded-lg text-xs transition-colors bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-slate-500 dark:text-zinc-500">
              {filteredResolutions.length} resolution{filteredResolutions.length !== 1 ? 's' : ''}
              {search && ` matching "${search}"`}
            </span>
          </div>
          {viewMode === 'table' ? (
            <ResolutionTable
              resolutions={filteredResolutions}
              onPreview={setPreviewingResolution}
              onEdit={startEdit}
              onDelete={handleDelete}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredResolutions.map(resolution => (
                <ResolutionCard
                  key={resolution.id ?? `${resolution.title}-${getResolutionUpdatedAt(resolution)}`}
                  resolution={resolution}
                  onPreview={setPreviewingResolution}
                  onEdit={startEdit}
                  onDelete={handleDelete}
                />
              ))}
              {filteredResolutions.length === 0 && (
                <div className="col-span-full text-center py-20">
                  <BookOpen size={32} className="mx-auto mb-4 text-slate-300 dark:text-zinc-700" />
                  <p className="text-sm text-slate-500 dark:text-zinc-500">No resolutions found matching your filters.</p>
                  <p className="text-xs mt-1 text-slate-400 dark:text-zinc-600">Create a library item or add a resolution to an issue.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <ResolutionPreviewDialog
        resolution={previewingResolution}
        onClose={() => setPreviewingResolution(null)}
      />
    </div>
  );
};
