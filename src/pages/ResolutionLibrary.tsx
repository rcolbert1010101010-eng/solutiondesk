import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Pencil, Plus, Save, Search, Trash2, X } from 'lucide-react';
import { RichTextEditor, SanitizedHtmlContent } from '../components/RichTextEditor';
import { TagBadge } from '../components/TagBadge';
import { formatRelativeTime } from '../lib/utils';
import { plainTextToHtml } from '../lib/richText';
import { listTags, TAGS_CHANGED_EVENT } from '../lib/tags';
import {
  createLibraryResolution,
  deleteLibraryResolution,
  formatSupabaseError,
  listLibraryResolutions,
  RESOLUTIONS_CHANGED_EVENT,
  updateLibraryResolution,
} from '../lib/supabaseData';
import type { Resolution, Tag } from '../types';

function normalizeStepLines(input: unknown): string[] {
  if (Array.isArray(input)) {
    return input
      .flatMap(item => String(item ?? '').split(/\r?\n/))
      .map(item => item.trim())
      .filter(Boolean);
  }

  if (typeof input === 'string') {
    return input
      .split(/\r?\n/)
      .map(item => item.trim())
      .filter(Boolean);
  }

  if (input && typeof input === 'object') {
    return Object.values(input as Record<string, unknown>)
      .flatMap(item => String(item ?? '').split(/\r?\n/))
      .map(item => item.trim())
      .filter(Boolean);
  }

  return [];
}

function stepsToText(steps?: unknown): string {
  return normalizeStepLines(steps).join('\n');
}

interface ResolutionFormState {
  title: string;
  stepsText: string;
  notesHtml: string;
  notesText: string;
  tags: string[];
}

const EMPTY_FORM: ResolutionFormState = {
  title: '',
  stepsText: '',
  notesHtml: '<p></p>',
  notesText: '',
  tags: [],
};

export const ResolutionLibrary: React.FC = () => {
  const [resolutions, setResolutions] = useState<Resolution[]>([]);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ResolutionFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

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

  const filteredResolutions = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return resolutions;

    return resolutions.filter(resolution => {
      const haystack = [
        resolution.title ?? '',
        resolution.summary ?? '',
        resolution.notesText ?? '',
        resolution.sourceIssueTitle ?? '',
        ...normalizeStepLines(resolution.steps),
        ...(resolution.tags ?? []),
      ].join(' ').toLowerCase();

      return haystack.includes(query);
    });
  }, [resolutions, search]);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(false);
  };

  const startCreate = () => {
    setError('');
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const startEdit = (resolution: Resolution) => {
    setError('');
    setEditingId(resolution.id ?? null);
    setForm({
      title: resolution.title ?? resolution.summary ?? '',
      stepsText: stepsToText(resolution.steps),
      notesHtml: resolution.notes ?? plainTextToHtml(resolution.notesText ?? ''),
      notesText: resolution.notesText ?? '',
      tags: Array.isArray(resolution.tags) ? resolution.tags : [],
    });
    setShowForm(true);
  };

  const toggleTag = (tagName: string) => {
    setForm(current => ({
      ...current,
      tags: current.tags.includes(tagName)
        ? current.tags.filter(tag => tag !== tagName)
        : [...current.tags, tagName],
    }));
  };

  const handleSubmit = async () => {
    const steps = normalizeStepLines(form.stepsText);
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
        steps,
        notes: form.notesText.trim() ? form.notesHtml.trim() : undefined,
        notesText: form.notesText.trim() || undefined,
        tags: form.tags,
      };

      if (editingId) {
        await updateLibraryResolution(editingId, payload);
      } else {
        await createLibraryResolution(payload);
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
            <div className="flex items-center gap-3 mb-1">
              <div className="w-8 h-8 bg-violet-500/10 rounded-lg flex items-center justify-center">
                <BookOpen size={16} className="text-violet-400" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-zinc-100">Resolution Library</h1>
            </div>
            <p className="text-sm mt-1 text-slate-500 dark:text-zinc-500">Shared global resolutions available on every signed-in device.</p>
          </div>
          <button
            onClick={startCreate}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 text-zinc-900 text-sm font-semibold hover:bg-amber-400 transition-colors"
          >
            <Plus size={14} />
            New Library Resolution
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="border rounded-xl p-4 bg-white border-slate-200 dark:bg-zinc-900 dark:border-zinc-800">
            <div className="text-2xl font-bold text-slate-900 dark:text-zinc-100">{resolutions.length}</div>
            <div className="text-xs mt-1 text-slate-500 dark:text-zinc-500">All Resolution Entries</div>
          </div>
          <div className="border rounded-xl p-4 bg-white border-slate-200 dark:bg-zinc-900 dark:border-zinc-800">
            <div className="text-2xl font-bold text-violet-400">{resolutions.filter(item => item.sourceType === 'library').length}</div>
            <div className="text-xs mt-1 text-slate-500 dark:text-zinc-500">Library Resolutions</div>
          </div>
          <div className="border rounded-xl p-4 bg-white border-slate-200 dark:bg-zinc-900 dark:border-zinc-800">
            <div className="text-2xl font-bold text-emerald-400">{resolutions.filter(item => item.sourceType === 'issue').length}</div>
            <div className="text-xs mt-1 text-slate-500 dark:text-zinc-500">From Issue</div>
          </div>
        </div>

        <div className="relative mb-6">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Search titles, notes, steps, or tags..."
            className="w-full border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 bg-white border-slate-200 text-slate-900 placeholder-slate-400 dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-100 dark:placeholder-zinc-500"
          />
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
                <label className="text-xs mb-1 block text-slate-500 dark:text-zinc-500">Steps * (one per line)</label>
                <textarea
                  value={form.stepsText}
                  onChange={event => setForm(current => ({ ...current, stepsText: event.target.value }))}
                  rows={6}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500 bg-white border-slate-200 text-slate-900 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-200"
                  placeholder="1. Verify the VPN adapter status\n2. Restart the service\n3. Re-authenticate the client"
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

              <div className="flex gap-2">
                <button
                  onClick={handleSubmit}
                  disabled={saving}
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
          {filteredResolutions.length === 0 ? (
            <div className="text-center py-16 border rounded-xl bg-white border-slate-200 dark:bg-zinc-900 dark:border-zinc-800">
              <BookOpen size={32} className="mx-auto mb-4 text-slate-300 dark:text-zinc-700" />
              <p className="text-sm text-slate-500 dark:text-zinc-500">No resolutions found.</p>
              <p className="text-xs mt-1 text-slate-400 dark:text-zinc-600">Create a library item or add a resolution to an issue.</p>
            </div>
          ) : (
            filteredResolutions.map(resolution => {
              const steps = normalizeStepLines(resolution.steps);
              const isLibraryResolution = resolution.sourceType !== 'issue';
              return (
                <div
                  key={resolution.id}
                  className="border rounded-xl p-4 bg-white border-slate-200 dark:bg-zinc-900 dark:border-zinc-800"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                          isLibraryResolution
                            ? 'border-violet-500/30 bg-violet-500/10 text-violet-400'
                            : 'border-blue-500/30 bg-blue-500/10 text-blue-400'
                        }`}>
                          {isLibraryResolution ? 'Library' : 'From Issue'}
                        </span>
                        {!isLibraryResolution && resolution.sourceIssueId && (
                          <Link
                            to={`/issues/${resolution.sourceIssueId}`}
                            className="text-xs text-blue-500 hover:text-blue-400 hover:underline"
                          >
                            {resolution.sourceIssueTitle ?? 'View source issue'}
                          </Link>
                        )}
                      </div>
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-100">
                        {resolution.title ?? resolution.summary ?? 'Resolution'}
                      </h3>
                      <p className="text-xs mt-1 text-slate-500 dark:text-zinc-500">
                        {formatRelativeTime(resolution.updatedAt ?? resolution.createdAt ?? new Date().toISOString())}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {isLibraryResolution && (
                        <>
                          <button
                            onClick={() => startEdit(resolution)}
                            className="text-xs px-2 py-1 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                          >
                            <span className="inline-flex items-center gap-1"><Pencil size={11} /> Edit</span>
                          </button>
                          {resolution.id && (
                            <button
                              onClick={() => handleDelete(resolution.id as string)}
                              className="text-xs px-2 py-1 rounded border border-red-500/30 bg-red-500/10 text-red-500 hover:bg-red-500/20"
                            >
                              <span className="inline-flex items-center gap-1"><Trash2 size={11} /> Delete</span>
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {steps.length > 0 && (
                    <ol className="space-y-1 mb-3">
                      {steps.slice(0, 5).map((step, index) => (
                        <li key={`${resolution.id}-${index}`} className="text-xs flex gap-2 text-slate-700 dark:text-zinc-300">
                          <span className="shrink-0 text-slate-400 dark:text-zinc-600">{index + 1}.</span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ol>
                  )}

                  {resolution.notes && (
                    <div className="pt-3 border-t border-slate-200 dark:border-zinc-800">
                      <SanitizedHtmlContent
                        html={resolution.notes}
                        className="prose prose-sm max-w-none text-xs text-slate-700 dark:text-zinc-300 dark:prose-invert"
                      />
                    </div>
                  )}

                  {(resolution.tags ?? []).length > 0 && (
                    <div className="flex gap-1 flex-wrap mt-3">
                      {(resolution.tags ?? []).map(tag => (
                        <TagBadge key={`${resolution.id}-${tag}`} tag={tag} size="sm" />
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
