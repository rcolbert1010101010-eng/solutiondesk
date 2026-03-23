import React, { useEffect, useState } from 'react';
import { ArrowLeft, Edit3 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { ResolutionDetailPanel } from '../components/ResolutionDetailPanel';
import { getResolutionEditPath } from '../lib/resolutionLibrary';
import { getResolutionById, RESOLUTIONS_CHANGED_EVENT, formatSupabaseError } from '../lib/supabaseData';
import type { Resolution } from '../types';

export const ResolutionDetail: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [resolution, setResolution] = useState<Resolution | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) {
      setLoading(false);
      setError('Resolution not found.');
      return undefined;
    }

    const load = async () => {
      setLoading(true);
      setError('');

      try {
        const nextResolution = await getResolutionById(id);
        if (!nextResolution) {
          setResolution(null);
          setError('Resolution not found.');
          return;
        }

        setResolution(nextResolution);
      } catch (err) {
        setResolution(null);
        setError(formatSupabaseError(err, 'Unable to load resolution.').message);
      } finally {
        setLoading(false);
      }
    };

    void load();
    window.addEventListener(RESOLUTIONS_CHANGED_EVENT, load);
    return () => window.removeEventListener(RESOLUTIONS_CHANGED_EVENT, load);
  }, [id]);

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate('/resolution-library');
  };

  const handleEdit = () => {
    if (!resolution) return;

    const editPath = getResolutionEditPath(resolution);
    if (editPath) {
      navigate(editPath);
    }
  };

  return (
    <div className="flex-1 overflow-auto">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-6 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center gap-2 text-sm text-slate-500 transition-colors hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            <ArrowLeft size={16} />
            Back
          </button>

          {resolution && getResolutionEditPath(resolution) && (
            <button
              type="button"
              onClick={handleEdit}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            >
              <Edit3 size={13} />
              Edit
            </button>
          )}
        </div>

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center text-sm text-slate-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-500">
            Loading resolution...
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-4 text-sm text-red-600 dark:border-red-500/25 dark:bg-red-500/10 dark:text-red-300">
            {error}
          </div>
        ) : resolution ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <ResolutionDetailPanel resolution={resolution} />
          </div>
        ) : null}
      </div>
    </div>
  );
};
