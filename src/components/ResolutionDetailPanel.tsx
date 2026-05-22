import React from 'react';
import { Clock, Link as LinkIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Resolution } from '../types';
import { AttachmentPanel } from './AttachmentPanel';
import { RICH_TEXT_RENDER_CLASSNAME, SanitizedHtmlContent } from './RichTextEditor'; 
import { TagBadge } from './TagBadge';
import {
  getResolutionNotesHtml,
  getResolutionSourceLabel,
  getResolutionStepsHtml,
  getResolutionTitle,
  getResolutionUpdatedAt,
  isLibraryResolution,
} from '../lib/resolutionLibrary';
import { formatDate, formatRelativeTime } from '../lib/utils';

interface ResolutionDetailPanelProps {
  resolution: Resolution;
  compact?: boolean;
}

export const ResolutionDetailPanel: React.FC<ResolutionDetailPanelProps> = ({ resolution, compact = false }) => {
  const sourceLabel = getResolutionSourceLabel(resolution);
  const updatedAt = getResolutionUpdatedAt(resolution);
  const notesHtml = getResolutionNotesHtml(resolution);
  const stepsHtml = getResolutionStepsHtml(resolution);
  const hasNotes = notesHtml.trim() !== '<p></p>' && notesHtml.trim() !== '';
  const hasSteps = stepsHtml.trim() !== '<p></p>' && stepsHtml.trim() !== '';

  return (
    <div className={compact ? 'space-y-5' : 'space-y-6'}>
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`inline-flex w-fit items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${
            isLibraryResolution(resolution)
              ? 'border-violet-500/30 bg-violet-500/10 text-violet-400'
              : 'border-blue-500/30 bg-blue-500/10 text-blue-400'
          }`}>
            {sourceLabel}
          </span>
          {!isLibraryResolution(resolution) && resolution.sourceIssueId && (
            <Link
              to={`/issues/${resolution.sourceIssueId}`}
              className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 hover:underline"
            >
              <LinkIcon size={11} />
              {resolution.sourceIssueTitle ?? 'View source issue'}
            </Link>
          )}
        </div>

        <div>
          <h2 className={`${compact ? 'text-xl' : 'text-2xl'} font-semibold text-slate-900 dark:text-zinc-100`}>
            {getResolutionTitle(resolution)}
          </h2>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-zinc-500">
            <span className="inline-flex items-center gap-1.5">
              <Clock size={11} />
              Updated {formatDate(updatedAt)}
            </span>
            <span>{formatRelativeTime(updatedAt)}</span>
          </div>
        </div>

        {(resolution.tags ?? []).length > 0 && (
          <div className="flex flex-wrap gap-2">
            {(resolution.tags ?? []).map(tag => (
              <TagBadge key={`${resolution.id}-${tag}`} tag={tag} size="sm" />
            ))}
          </div>
        )}
      </div>

      <div className={`grid gap-4 ${compact ? 'grid-cols-1' : 'grid-cols-1 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]'}`}>
        <section className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-zinc-800 dark:bg-zinc-900/70">
          <div className="mb-3">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-zinc-500">Steps</p>
          </div>
          {hasSteps ? ( 
            <SanitizedHtmlContent 
              html={stepsHtml} 
              className={RICH_TEXT_RENDER_CLASSNAME} 
            /> 
          ) : ( 
            <p className="text-sm text-slate-500 dark:text-zinc-500">No steps documented.</p> 
          )} 
        </section>

        <section className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-zinc-800 dark:bg-zinc-900/70">
          <div className="mb-3">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-zinc-500">Notes</p>
          </div>
          {hasNotes ? ( 
            <SanitizedHtmlContent 
              html={notesHtml} 
              className={RICH_TEXT_RENDER_CLASSNAME} 
            /> 
          ) : ( 
            <p className="text-sm text-slate-500 dark:text-zinc-500">No notes attached.</p> 
          )} 
        </section>
      </div>

      <AttachmentPanel
        title="Attachments"
        attachments={resolution.attachments ?? []}
        emptyMessage="No files attached to this resolution."
      />
    </div>
  );
};
