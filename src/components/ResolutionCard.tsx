import React from 'react';
import { Link } from 'react-router-dom';
import { Clock, ExternalLink, Eye, Pencil, Trash2 } from 'lucide-react';
import type { Resolution } from '../types';
import { RICH_TEXT_RENDER_CLASSNAME_COMPACT, SanitizedHtmlContent } from './RichTextEditor'; 
import { TagBadge } from './TagBadge';
import { useTheme } from '../context/ThemeContext';
import {
  getResolutionDetailPath,
  getResolutionPreviewText,
  getResolutionSourceLabel,
  getResolutionStepsHtml,
  getResolutionTitle,
  getResolutionUpdatedAt,
  isLibraryResolution,
} from '../lib/resolutionLibrary';
import { formatRelativeTime } from '../lib/utils';

interface ResolutionCardProps {
  resolution: Resolution;
  onPreview: (resolution: Resolution) => void;
  onEdit: (resolution: Resolution) => void;
  onDelete: (id: string) => void;
}

export const ResolutionCard: React.FC<ResolutionCardProps> = ({ resolution, onPreview, onEdit, onDelete }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const libraryResolution = isLibraryResolution(resolution);
  const preview = getResolutionPreviewText(resolution);
  const stepsHtml = getResolutionStepsHtml(resolution, 3);
  const detailPath = getResolutionDetailPath(resolution);

  return (
    <div
      className={`border rounded-xl p-5 transition-all duration-150 ${
        isDark
          ? 'bg-zinc-900 border-zinc-800 hover:border-zinc-600 hover:bg-zinc-800/50'
          : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50 shadow-sm'
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${
              libraryResolution
                ? 'border-violet-500/30 bg-violet-500/10 text-violet-400'
                : 'border-blue-500/30 bg-blue-500/10 text-blue-400'
            }`}>
              {getResolutionSourceLabel(resolution)}
            </span>
            {!libraryResolution && resolution.sourceIssueId && (
              <Link
                to={`/issues/${resolution.sourceIssueId}`}
                className="text-xs text-blue-500 hover:text-blue-400 hover:underline"
              >
                {resolution.sourceIssueTitle ?? 'View source issue'}
              </Link>
            )}
          </div>
          <h3 className={`text-sm font-semibold truncate ${isDark ? 'text-zinc-100' : 'text-slate-800'}`}>
            {getResolutionTitle(resolution)}
          </h3>
        </div>
        <span className={`inline-flex items-center gap-1 text-xs ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
          <Clock size={10} />
          {formatRelativeTime(getResolutionUpdatedAt(resolution))}
        </span>
      </div>

      {stepsHtml !== '<p></p>' && ( 
        <div className="mb-3"> 
          <SanitizedHtmlContent 
            html={stepsHtml} 
            className={`${RICH_TEXT_RENDER_CLASSNAME_COMPACT} text-slate-600 dark:text-zinc-400`} 
          /> 
        </div> 
      )} 

      {preview && (
        <p className={`text-xs mb-3 line-clamp-2 ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>
          {preview}
        </p>
      )}

      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {(resolution.tags ?? []).map(tag => (
          <TagBadge key={`${resolution.id}-${tag}`} tag={tag} size="sm" />
        ))}
      </div>

      <div className="flex items-center justify-between gap-3">
        <span className={`text-xs ${isDark ? 'text-zinc-600' : 'text-slate-400'}`}>
          {libraryResolution ? 'Reusable library item' : 'Linked to an issue resolution'}
        </span>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <button
            type="button"
            onClick={() => onPreview(resolution)}
            className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
          >
            <Eye size={11} />
            Preview
          </button>
          {detailPath && (
            <Link
              to={detailPath}
              className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            >
              <ExternalLink size={11} />
              Open
            </Link>
          )}
          {libraryResolution && resolution.id ? (
            <>
              <button
                type="button"
                onClick={() => onEdit(resolution)}
                className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
              >
                <Pencil size={11} />
                Edit
              </button>
              <button
                type="button"
                onClick={() => onDelete(resolution.id as string)}
                className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded border border-red-500/30 bg-red-500/10 text-red-500 hover:bg-red-500/20"
              >
                <Trash2 size={11} />
                Delete
              </button>
            </>
          ) : (
            <span className={`text-xs ${isDark ? 'text-zinc-600' : 'text-slate-400'}`}>Managed from issue</span>
          )}
        </div>
      </div>
    </div>
  );
};
