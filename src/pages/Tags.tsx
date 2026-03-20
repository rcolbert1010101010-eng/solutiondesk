import React, { useEffect, useState } from 'react';
import { createTag, deleteTag, listTags, TAGS_CHANGED_EVENT, updateTag } from '../lib/tags';
import { Tag } from '../types';
import { Edit3, PlusCircle, Save, Trash2 } from 'lucide-react';

export const Tags: React.FC = () => {
  const [tags, setTags] = useState<Tag[]>([]);
  const [error, setError] = useState<string>('');
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#3B82F6');
  const [useNewColor, setUseNewColor] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('#3B82F6');
  const [useEditColor, setUseEditColor] = useState(false);

  const refreshTags = async () => setTags(await listTags());

  useEffect(() => {
    void refreshTags();
    window.addEventListener(TAGS_CHANGED_EVENT, refreshTags);
    return () => window.removeEventListener(TAGS_CHANGED_EVENT, refreshTags);
  }, []);

  const resetCreateForm = () => {
    setNewName('');
    setNewColor('#3B82F6');
    setUseNewColor(false);
  };

  const startEditing = (tag: Tag) => {
    setError('');
    setEditingId(tag.id);
    setEditName(tag.name);
    setEditColor(tag.color ?? '#3B82F6');
    setUseEditColor(Boolean(tag.color));
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditName('');
    setEditColor('#3B82F6');
    setUseEditColor(false);
  };

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    try {
      await createTag({
        name: newName,
        color: useNewColor ? newColor : undefined,
      });
      resetCreateForm();
      await refreshTags();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create tag.');
    }
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    setError('');
    try {
      await updateTag(editingId, {
        name: editName,
        color: useEditColor ? editColor : undefined,
      });
      cancelEditing();
      await refreshTags();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update tag.');
    }
  };

  const handleDelete = async (tag: Tag) => {
    setError('');
    if (!window.confirm(`Delete tag "${tag.name}"? This will remove it from all issues.`)) {
      return;
    }
    try {
      await deleteTag(tag.id);
      if (editingId === tag.id) {
        cancelEditing();
      }
      await refreshTags();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete tag.');
    }
  };

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-zinc-100">Tags</h1>
          <p className="text-sm mt-1 text-slate-500 dark:text-zinc-500">
            Manage reusable issue tags. Changes sync through Supabase for all signed-in users.
          </p>
        </div>

        <div className="border rounded-xl p-5 mb-6 bg-white border-slate-200 dark:bg-zinc-900 dark:border-zinc-800">
          <h2 className="text-sm font-semibold mb-4 flex items-center gap-2 text-slate-900 dark:text-zinc-200">
            <PlusCircle size={14} className="text-emerald-500" />
            Create Tag
          </h2>
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
            <div className="md:col-span-3">
              <label className="block text-xs font-medium mb-1.5 text-slate-600 dark:text-zinc-400">Name</label>
              <input
                value={newName}
                onChange={event => setNewName(event.target.value)}
                placeholder="e.g. vpn"
                className="w-full border rounded-lg px-3 py-2 text-sm bg-white border-slate-200 text-slate-900 focus:outline-none focus:border-amber-500 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium mb-1.5 text-slate-600 dark:text-zinc-400">Color (optional)</label>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={useNewColor}
                  onChange={event => setUseNewColor(event.target.checked)}
                  className="rounded border-slate-300 dark:border-zinc-600"
                />
                <input
                  type="color"
                  value={newColor}
                  onChange={event => setNewColor(event.target.value)}
                  disabled={!useNewColor}
                  className="h-9 w-full border rounded-lg px-1 py-1 bg-white border-slate-200 dark:bg-zinc-800 dark:border-zinc-700 disabled:opacity-40"
                />
              </div>
            </div>
            <button
              type="submit"
              className="h-9 flex items-center justify-center gap-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-zinc-900 text-sm font-semibold transition-colors"
            >
              <Save size={13} />
              Create
            </button>
          </form>
        </div>

        {error && (
          <div className="mb-4 px-4 py-2.5 rounded-lg text-sm bg-red-50 border border-red-200 text-red-600 dark:bg-red-500/10 dark:border-red-500/25 dark:text-red-300">
            {error}
          </div>
        )}

        <div className="border rounded-xl overflow-hidden bg-white border-slate-200 dark:bg-zinc-900 dark:border-zinc-800">
          <div className="px-5 py-3 border-b border-slate-200 dark:border-zinc-800">
            <p className="text-sm font-semibold text-slate-900 dark:text-zinc-200">
              Existing Tags ({tags.length})
            </p>
          </div>

          {tags.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-slate-500 dark:text-zinc-500">
              No tags yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-200 dark:divide-zinc-800">
              {tags.map(tag => {
                const editing = editingId === tag.id;
                return (
                  <div key={tag.id} className="px-5 py-3 flex flex-col md:flex-row md:items-center gap-3">
                    <div className="flex items-center gap-2 md:w-1/3">
                      <span
                        className="w-3 h-3 rounded-full border border-slate-300 dark:border-zinc-600"
                        style={{ backgroundColor: tag.color ?? 'transparent' }}
                      />
                      {editing ? (
                        <input
                          value={editName}
                          onChange={event => setEditName(event.target.value)}
                          className="w-full border rounded-lg px-2.5 py-1.5 text-sm bg-white border-slate-200 text-slate-900 focus:outline-none focus:border-amber-500 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100"
                        />
                      ) : (
                        <span className="text-sm font-medium text-slate-800 dark:text-zinc-200">{tag.name}</span>
                      )}
                    </div>

                    <div className="md:w-1/3">
                      {editing ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={useEditColor}
                            onChange={event => setUseEditColor(event.target.checked)}
                            className="rounded border-slate-300 dark:border-zinc-600"
                          />
                          <input
                            type="color"
                            value={editColor}
                            onChange={event => setEditColor(event.target.value)}
                            disabled={!useEditColor}
                            className="h-8 w-full border rounded-lg px-1 py-1 bg-white border-slate-200 dark:bg-zinc-800 dark:border-zinc-700 disabled:opacity-40"
                          />
                        </div>
                      ) : (
                        <span className="text-xs text-slate-500 dark:text-zinc-500">
                          {tag.color ?? 'No custom color'}
                        </span>
                      )}
                    </div>

                    <div className="md:w-1/3 flex items-center justify-start md:justify-end gap-2">
                      {editing ? (
                        <>
                          <button
                            onClick={handleSaveEdit}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/10 text-emerald-600 border border-emerald-200 hover:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/25"
                          >
                            Save
                          </button>
                          <button
                            onClick={cancelEditing}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700 dark:hover:bg-zinc-700"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => startEditing(tag)}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 bg-blue-500/10 text-blue-600 border border-blue-200 hover:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/25"
                          >
                            <Edit3 size={12} />
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(tag)}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 bg-red-500/10 text-red-600 border border-red-200 hover:bg-red-500/20 dark:text-red-300 dark:border-red-500/25"
                          >
                            <Trash2 size={12} />
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
