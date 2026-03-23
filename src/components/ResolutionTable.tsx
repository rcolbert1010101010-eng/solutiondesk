import React from 'react';
import { Link } from 'react-router-dom';
import { Pencil, Trash2 } from 'lucide-react';
import type { Resolution } from '../types';
import { TagBadge } from './TagBadge';
import { SanitizedHtmlContent } from './RichTextEditor';
import { useTheme } from '../context/ThemeContext';
import {
  getResolutionPreviewText,
  getResolutionStepsHtml,
  getResolutionTitle,
  getResolutionUpdatedAt,
  isLibraryResolution,
} from '../lib/resolutionLibrary';
import { formatRelativeTime } from '../lib/utils';

interface ResolutionTableProps {
  resolutions: Resolution[];
  onEdit: (resolution: Resolution) => void;
  onDelete: (id: string) => void;
}

export const ResolutionTable: React.FC<ResolutionTableProps> = ({ resolutions, onEdit, onDelete }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  if (resolutions.length === 0) {
    return (
      <div className="text-center py-20">
        <p className={`text-sm ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>No resolutions found matching your filters.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[860px]">
        <thead>
          <tr className={`border-b ${isDark ? 'border-zinc-800' : 'border-slate-200'}`}>
            <th className={`text-left text-xs font-medium uppercase tracking-wider pb-3 px-4 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>Title</th>
            <th className={`text-left text-xs font-medium uppercase tracking-wider pb-3 px-4 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>Tags</th>
            <th className={`text-left text-xs font-medium uppercase tracking-wider pb-3 px-4 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>Updated</th>
            <th className={`text-left text-xs font-medium uppercase tracking-wider pb-3 px-4 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>Source</th>
            <th className={`text-left text-xs font-medium uppercase tracking-wider pb-3 px-4 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>Actions</th>
          </tr>
        </thead>
        <tbody className={`divide-y ${isDark ? 'divide-zinc-800/60' : 'divide-slate-100'}`}>
          {resolutions.map(resolution => {
            const libraryResolution = isLibraryResolution(resolution);
            const preview = getResolutionPreviewText(resolution);
            const stepsHtml = getResolutionStepsHtml(resolution, 3);

            return (
              <tr
                key={resolution.id ?? `${getResolutionTitle(resolution)}-${getResolutionUpdatedAt(resolution)}`}
                className={`transition-colors ${isDark ? 'hover:bg-zinc-800/40' : 'hover:bg-slate-50'}`}
              >
                <td className="py-3.5 px-4">
                  <div className="min-w-0 max-w-md">
                    <div className={`text-sm font-medium truncate ${isDark ? 'text-zinc-200' : 'text-slate-700'}`}>
                      {getResolutionTitle(resolution)}
                    </div>
                    {stepsHtml !== '<p></p>' && (
                      <div className="mt-1">
                        <SanitizedHtmlContent
                          html={stepsHtml}
                          className="prose prose-sm max-w-none text-xs text-slate-600 dark:text-zinc-400 dark:prose-invert prose-ol:my-0 prose-ul:my-0 prose-li:my-0.5 prose-img:rounded-md prose-img:border prose-img:border-slate-200 dark:prose-img:border-zinc-700"
                        />
                      </div>
                    )}
                    {preview && (
                      <p className={`mt-1 text-xs line-clamp-2 ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>
                        {preview}
                      </p>
                    )}
                  </div>
                </td>
                <td className="py-3.5 px-4">
                  <div className="flex items-center gap-1 flex-wrap">
                    {(resolution.tags ?? []).slice(0, 2).map(tag => (
                      <TagBadge key={`${resolution.id}-${tag}`} tag={tag} size="sm" />
                    ))}
                    {(resolution.tags?.length ?? 0) > 2 && (
                      <span className={`text-xs ${isDark ? 'text-zinc-600' : 'text-slate-400'}`}>
                        +{(resolution.tags?.length ?? 0) - 2}
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-3.5 px-4">
                  <span className={`text-xs ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
                    {formatRelativeTime(getResolutionUpdatedAt(resolution))}
                  </span>
                </td>
                <td className="py-3.5 px-4">
                  <div className="flex flex-col gap-1">
                    <span className={`inline-flex w-fit items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                      libraryResolution
                        ? 'border-violet-500/30 bg-violet-500/10 text-violet-400'
                        : 'border-blue-500/30 bg-blue-500/10 text-blue-400'
                    }`}>
                      {libraryResolution ? 'Library' : 'From Issue'}
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
                </td>
                <td className="py-3.5 px-4">
                  {libraryResolution && resolution.id ? (
                    <div className="flex items-center gap-2">
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
                    </div>
                  ) : (
                    <span className={`text-xs ${isDark ? 'text-zinc-600' : 'text-slate-400'}`}>Managed from issue</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
