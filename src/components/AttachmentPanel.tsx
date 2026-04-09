import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Download,
  Eye,
  FileImage,
  FileSpreadsheet,
  FileText,
  Loader2,
  Paperclip,
  RotateCcw,
  Trash2,
  Upload,
} from 'lucide-react';
import type { Attachment } from '../types';
import {
  addFilesToAttachmentDraftState,
  ATTACHMENT_INPUT_ACCEPT,
  createAttachmentDraftState,
  downloadAttachment,
  formatAttachmentFileSize,
  getAttachmentExtension,
  getAttachmentSignedUrl,
  getVisibleAttachmentDraftItems,
  isImageAttachment,
  openAttachment,
  removeAttachmentDraftItem,
  restoreAttachmentDraftItem,
  type AttachmentDraftItem,
  type AttachmentDraftState,
} from '../lib/attachments';

interface AttachmentPanelProps {
  title?: string;
  mode?: 'read' | 'edit';
  attachments?: Attachment[];
  draftState?: AttachmentDraftState;
  onChangeDraftState?: (next: AttachmentDraftState) => void;
  busy?: boolean;
  emptyMessage?: string;
}

function getAttachmentIcon(name: string): React.ReactNode {
  const extension = getAttachmentExtension(name);
  if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(extension)) return <FileImage size={16} className="text-blue-400" />;
  if (['xls', 'xlsx'].includes(extension)) return <FileSpreadsheet size={16} className="text-emerald-400" />;
  return <FileText size={16} className="text-slate-400 dark:text-zinc-500" />;
}

interface AttachmentPreviewItem {
  attachment?: Attachment;
  file?: File;
  fileName: string;
}

const AttachmentPreview: React.FC<{ item: AttachmentPreviewItem }> = ({ item }) => {
  const [src, setSrc] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const isImage = useMemo(() => {
    if (item.attachment) return isImageAttachment(item.attachment);
    if (!item.file) return false;
    return item.file.type.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(getAttachmentExtension(item.file.name));
  }, [item]);

  useEffect(() => {
    if (!isImage) {
      setSrc('');
      setLoading(false);
      return undefined;
    }

    if (item.attachment) {
      let active = true;
      setLoading(true);
      void getAttachmentSignedUrl(item.attachment, 600)
        .then(nextSrc => {
          if (!active) return;
          setSrc(nextSrc);
        })
        .catch(() => {
          if (!active) return;
          setSrc('');
        })
        .finally(() => {
          if (active) setLoading(false);
        });

      return () => {
        active = false;
      };
    }

    if (item.file) {
      const objectUrl = URL.createObjectURL(item.file);
      setSrc(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    }

    return undefined;
  }, [isImage, item]);

  if (!isImage) {
    return (
      <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 dark:border-zinc-700 dark:bg-zinc-800">
        {getAttachmentIcon(item.fileName)}
      </div>
    );
  }

  return (
    <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-100 dark:border-zinc-700 dark:bg-zinc-800">
      {loading ? (
        <Loader2 size={14} className="animate-spin text-slate-400 dark:text-zinc-500" />
      ) : src ? (
        <img src={src} alt={item.fileName} className="h-full w-full object-cover" />
      ) : (
        <FileImage size={16} className="text-slate-400 dark:text-zinc-500" />
      )}
    </div>
  );
};

export const AttachmentPanel: React.FC<AttachmentPanelProps> = ({
  title = 'Attachments',
  mode = 'read',
  attachments = [],
  draftState,
  onChangeDraftState,
  busy = false,
  emptyMessage = 'No attachments added.',
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [actionError, setActionError] = useState('');
  const effectiveDraftState = draftState ?? createAttachmentDraftState(attachments);
  const visibleDraftItems = useMemo(() => getVisibleAttachmentDraftItems(effectiveDraftState), [effectiveDraftState]);
  const readOnlyItems = useMemo(
    () => attachments.map(attachment => ({ attachment, fileName: attachment.fileName, fileSize: attachment.fileSize })),
    [attachments],
  );

  const handleSelectFiles = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (mode !== 'edit' || !onChangeDraftState) return;
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;
    onChangeDraftState(addFilesToAttachmentDraftState(effectiveDraftState, files));
    event.target.value = '';
  };

  const handleOpen = async (attachment: Attachment) => {
    setActionError('');
    try {
      await openAttachment(attachment);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : `Unable to open ${attachment.fileName}.`);
    }
  };

  const handleDownload = async (attachment: Attachment) => {
    setActionError('');
    try {
      await downloadAttachment(attachment);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : `Unable to download ${attachment.fileName}.`);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-zinc-800 dark:bg-zinc-900/70">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-zinc-500">{title}</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-zinc-500">
            {mode === 'edit'
              ? 'Any file type can be attached.'
              : `${attachments.length} file${attachments.length === 1 ? '' : 's'} attached.`}
          </p>
        </div>
        {mode === 'edit' && (
          <>
            <input
              ref={inputRef}
              type="file"
              multiple
              accept={ATTACHMENT_INPUT_ACCEPT}
              className="hidden"
              onChange={handleSelectFiles}
            />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-400 transition-colors hover:bg-amber-500/15 disabled:opacity-50"
            >
              {busy ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
              {busy ? 'Uploading...' : 'Add Files'}
            </button>
          </>
        )}
      </div>

      {actionError && (
        <p className="mb-3 rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs text-red-400">
          {actionError}
        </p>
      )}

      {mode === 'edit' && visibleDraftItems.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 px-4 py-5 text-center dark:border-zinc-700">
          <Paperclip size={16} className="mx-auto mb-2 text-slate-400 dark:text-zinc-500" />
          <p className="text-xs text-slate-500 dark:text-zinc-500">{emptyMessage}</p>
        </div>
      ) : mode === 'read' && attachments.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-zinc-500">{emptyMessage}</p>
      ) : (
        <div className="space-y-3">
          {mode === 'edit'
            ? effectiveDraftState.items.map(item => {
                const attachment = item.attachment;
                const itemMuted = item.removed ? 'opacity-50' : '';

                return (
                  <div
                    key={item.id}
                    className={`flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5 dark:border-zinc-700 dark:bg-zinc-900 ${itemMuted}`}
                  >
                    <AttachmentPreview item={item} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-slate-800 dark:text-zinc-200">{item.fileName}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-zinc-500">
                        <span>{formatAttachmentFileSize(item.fileSize)}</span>
                        <span>{item.kind === 'new' ? (busy && !item.removed ? 'Uploading on save' : 'Queued for upload') : 'Saved'}</span>
                        {item.removed && <span className="text-red-400">Will be removed on save</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {attachment && !item.removed && (
                        <>
                          <button
                            type="button"
                            onClick={() => void handleOpen(attachment)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 transition-colors hover:bg-slate-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                          >
                            <Eye size={11} />
                            Open
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDownload(attachment)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 transition-colors hover:bg-slate-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                          >
                            <Download size={11} />
                            Download
                          </button>
                        </>
                      )}
                      {item.removed ? (
                        <button
                          type="button"
                          onClick={() => onChangeDraftState?.(restoreAttachmentDraftItem(effectiveDraftState, item.id))}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 transition-colors hover:bg-slate-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                        >
                          <RotateCcw size={11} />
                          Undo
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onChangeDraftState?.(removeAttachmentDraftItem(effectiveDraftState, item.id))}
                          className="inline-flex items-center gap-1 rounded-lg border border-red-500/30 bg-red-500/10 px-2 py-1 text-xs text-red-400 transition-colors hover:bg-red-500/20"
                        >
                          <Trash2 size={11} />
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            : readOnlyItems.map(item => {
                const attachment = item.attachment;
                return (
                  <div
                    key={attachment.id}
                    className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5 dark:border-zinc-700 dark:bg-zinc-900"
                  >
                          <AttachmentPreview item={{ attachment, fileName: attachment.fileName }} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-slate-800 dark:text-zinc-200">{item.fileName}</p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-zinc-500">{formatAttachmentFileSize(item.fileSize)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => void handleOpen(attachment)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 transition-colors hover:bg-slate-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                      >
                        <Eye size={11} />
                        Open
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDownload(attachment)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 transition-colors hover:bg-slate-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                      >
                        <Download size={11} />
                        Download
                      </button>
                    </div>
                  </div>
                );
              })}
        </div>
      )}
    </div>
  );
};
