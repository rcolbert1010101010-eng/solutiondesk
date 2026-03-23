import React, { useEffect } from 'react';
import { ExternalLink, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Resolution } from '../types';
import { getResolutionDetailPath } from '../lib/resolutionLibrary';
import { ResolutionDetailPanel } from './ResolutionDetailPanel';

interface ResolutionPreviewDialogProps {
  resolution: Resolution | null;
  onClose: () => void;
}

export const ResolutionPreviewDialog: React.FC<ResolutionPreviewDialogProps> = ({ resolution, onClose }) => {
  useEffect(() => {
    if (!resolution) return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, resolution]);

  if (!resolution) return null;

  const detailPath = getResolutionDetailPath(resolution);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 px-4 py-6 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-[#121214]"
        onClick={event => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Resolution preview"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-zinc-800">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-zinc-500">Preview</p>
            <p className="text-sm text-slate-700 dark:text-zinc-300">Read-only resolution details</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 bg-white p-2 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            aria-label="Close preview"
          >
            <X size={16} />
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-5">
          <ResolutionDetailPanel resolution={resolution} compact />
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-4 dark:border-zinc-800">
          {detailPath && (
            <Link
              to={detailPath}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              <ExternalLink size={12} />
              Open
            </Link>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-zinc-900 transition-colors hover:bg-amber-400"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
