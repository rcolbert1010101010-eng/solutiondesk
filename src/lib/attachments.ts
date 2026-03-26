import { supabase } from './supabaseClient';
import type { Attachment, AttachmentParentType } from '../types';

export const ATTACHMENTS_BUCKET = 'solutiondesk-attachments';
export const ATTACHMENTS_CHANGED_EVENT = 'resolution_desk_attachments_changed';

const ACCEPTED_ATTACHMENT_EXTENSIONS = [
  'png',
  'jpg',
  'jpeg',
  'gif',
  'webp',
  'pdf',
  'doc',
  'docx',
  'xls',
  'xlsx',
  'txt',
] as const;

const IMAGE_ATTACHMENT_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp']);
const ACCEPTED_ATTACHMENT_EXTENSION_SET = new Set<string>(ACCEPTED_ATTACHMENT_EXTENSIONS);

const MIME_BY_EXTENSION: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  txt: 'text/plain',
};

interface AttachmentRow {
  id: string;
  issue_id: string | null;
  resolution_id: string | null;
  bucket_name: string;
  storage_path: string;
  file_name: string;
  mime_type: string | null;
  file_size: number | null;
  file_extension: string | null;
  created_at: string;
  updated_at: string;
}

export interface AttachmentSyncInput {
  attachmentIdsToDelete: string[];
  filesToUpload: File[];
}

export interface AttachmentDraftItem {
  id: string;
  kind: 'existing' | 'new';
  attachment?: Attachment;
  file?: File;
  fileName: string;
  mimeType: string;
  fileSize: number;
  removed: boolean;
}

export interface AttachmentDraftState {
  items: AttachmentDraftItem[];
  messages: string[];
}

function formatAttachmentError(error: unknown, fallback: string): Error {
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string' && error.message.trim()) {
    return new Error(error.message.trim());
  }

  return new Error(fallback);
}

export const ATTACHMENT_INPUT_ACCEPT = ACCEPTED_ATTACHMENT_EXTENSIONS.map(extension => `.${extension}`).join(',');

export function getAttachmentExtension(fileName: string): string {
  const segments = fileName.trim().split('.');
  return segments.length > 1 ? segments.at(-1)?.toLowerCase() ?? '' : '';
}

export function isAllowedAttachmentFile(fileName: string): boolean {
  const extension = getAttachmentExtension(fileName);
  return ACCEPTED_ATTACHMENT_EXTENSION_SET.has(extension);
}

export function isImageAttachment(input: Pick<Attachment, 'fileName' | 'fileExtension' | 'mimeType'>): boolean {
  const extension = input.fileExtension?.toLowerCase() || getAttachmentExtension(input.fileName);
  if (extension && IMAGE_ATTACHMENT_EXTENSIONS.has(extension)) return true;
  return input.mimeType.toLowerCase().startsWith('image/');
}

export function formatAttachmentFileSize(fileSize: number): string {
  if (fileSize < 1024) return `${fileSize} B`;
  if (fileSize < 1024 * 1024) return `${(fileSize / 1024).toFixed(1)} KB`;
  return `${(fileSize / (1024 * 1024)).toFixed(1)} MB`;
}

export function createAttachmentDraftState(attachments: Attachment[] = []): AttachmentDraftState {
  return {
    items: attachments.map(attachment => ({
      id: attachment.id,
      kind: 'existing' as const,
      attachment,
      fileName: attachment.fileName,
      mimeType: attachment.mimeType,
      fileSize: attachment.fileSize,
      removed: false,
    })),
    messages: [],
  };
}

export function replaceAttachmentDraftState(_current: AttachmentDraftState, attachments: Attachment[] = []): AttachmentDraftState {
  return createAttachmentDraftState(attachments);
}

export function addFilesToAttachmentDraftState(current: AttachmentDraftState, files: File[]): AttachmentDraftState {
  const nextItems = [...current.items];
  const nextMessages = [...current.messages];

  for (const file of files) {
    if (!isAllowedAttachmentFile(file.name)) {
      nextMessages.push(`Unsupported file type for ${file.name}. Allowed: ${ACCEPTED_ATTACHMENT_EXTENSIONS.join(', ')}.`);
      continue;
    }

    nextItems.push({
      id: `new:${crypto.randomUUID()}`,
      kind: 'new',
      file,
      fileName: file.name,
      mimeType: file.type || MIME_BY_EXTENSION[getAttachmentExtension(file.name)] || 'application/octet-stream',
      fileSize: file.size,
      removed: false,
    });
  }

  return {
    items: nextItems,
    messages: nextMessages.slice(-3),
  };
}

export function removeAttachmentDraftItem(current: AttachmentDraftState, itemId: string): AttachmentDraftState {
  return {
    ...current,
    items: current.items.flatMap(item => {
      if (item.id !== itemId) return [item];
      if (item.kind === 'existing') {
        return [{ ...item, removed: true }];
      }
      return [];
    }),
  };
}

export function restoreAttachmentDraftItem(current: AttachmentDraftState, itemId: string): AttachmentDraftState {
  return {
    ...current,
    items: current.items.map(item => item.id === itemId ? { ...item, removed: false } : item),
  };
}

export function clearAttachmentDraftMessages(current: AttachmentDraftState): AttachmentDraftState {
  return { ...current, messages: [] };
}

export function getVisibleAttachmentDraftItems(current: AttachmentDraftState): AttachmentDraftItem[] {
  return current.items.filter(item => !item.removed);
}

export function getAttachmentSyncInput(current: AttachmentDraftState): AttachmentSyncInput {
  return {
    attachmentIdsToDelete: current.items
      .filter(item => item.kind === 'existing' && item.removed && item.attachment?.id)
      .map(item => item.attachment!.id),
    filesToUpload: current.items
      .filter(item => item.kind === 'new' && item.file)
      .map(item => item.file as File),
  };
}

function sanitizeFileName(fileName: string): string {
  return fileName
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    || 'attachment';
}

function mapAttachmentRow(row: AttachmentRow): Attachment {
  const parentType: AttachmentParentType = row.resolution_id ? 'resolution' : 'issue';
  const parentId = row.resolution_id ?? row.issue_id ?? '';

  return {
    id: row.id,
    issueId: row.issue_id,
    resolutionId: row.resolution_id,
    parentType,
    parentId,
    bucketName: row.bucket_name,
    storagePath: row.storage_path,
    fileName: row.file_name,
    mimeType: row.mime_type ?? 'application/octet-stream',
    fileSize: row.file_size ?? 0,
    fileExtension: row.file_extension ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function groupAttachmentsByIssueId(attachments: Attachment[]): Map<string, Attachment[]> {
  const grouped = new Map<string, Attachment[]>();

  for (const attachment of attachments) {
    if (!attachment.issueId) continue;
    const current = grouped.get(attachment.issueId) ?? [];
    current.push(attachment);
    grouped.set(attachment.issueId, current);
  }

  return grouped;
}

export function groupAttachmentsByResolutionId(attachments: Attachment[]): Map<string, Attachment[]> {
  const grouped = new Map<string, Attachment[]>();

  for (const attachment of attachments) {
    if (!attachment.resolutionId) continue;
    const current = grouped.get(attachment.resolutionId) ?? [];
    current.push(attachment);
    grouped.set(attachment.resolutionId, current);
  }

  return grouped;
}

export function mergeAttachments(...attachmentGroups: Array<Attachment[] | undefined>): Attachment[] {
  const seen = new Set<string>();
  const merged: Attachment[] = [];

  for (const group of attachmentGroups) {
    for (const attachment of group ?? []) {
      if (seen.has(attachment.id)) continue;
      seen.add(attachment.id);
      merged.push(attachment);
    }
  }

  return merged.sort((left, right) => {
    return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
  });
}

export async function listAttachmentsByIssueIds(issueIds: string[]): Promise<Attachment[]> {
  const normalizedIds = Array.from(new Set(issueIds.filter(Boolean)));
  if (normalizedIds.length === 0) return [];

  const { data, error } = await supabase
    .from('attachments')
    .select('*')
    .in('issue_id', normalizedIds)
    .order('created_at', { ascending: false });

  if (error) throw formatAttachmentError(error, 'Unable to load issue attachments.');
  return (data ?? []).map(row => mapAttachmentRow(row as AttachmentRow));
}

export async function listAttachmentsByResolutionIds(resolutionIds: string[]): Promise<Attachment[]> {
  const normalizedIds = Array.from(new Set(resolutionIds.filter(Boolean)));
  if (normalizedIds.length === 0) return [];

  const { data, error } = await supabase
    .from('attachments')
    .select('*')
    .in('resolution_id', normalizedIds)
    .order('created_at', { ascending: false });

  if (error) throw formatAttachmentError(error, 'Unable to load resolution attachments.');
  return (data ?? []).map(row => mapAttachmentRow(row as AttachmentRow));
}

export async function listAttachmentsForIssue(issueId: string): Promise<Attachment[]> {
  return listAttachmentsByIssueIds([issueId]);
}

export async function listAttachmentsForResolution(resolutionId: string): Promise<Attachment[]> {
  return listAttachmentsByResolutionIds([resolutionId]);
}

async function uploadAttachment(parent: { issueId?: string | null; resolutionId?: string | null }, file: File): Promise<Attachment> {
  const extension = getAttachmentExtension(file.name);
  if (!ACCEPTED_ATTACHMENT_EXTENSION_SET.has(extension)) {
    throw new Error(`Unsupported file type for ${file.name}.`);
  }

  const parentType: AttachmentParentType = parent.resolutionId ? 'resolution' : 'issue';
  const parentId = parent.resolutionId ?? parent.issueId;
  if (!parentId) {
    throw new Error('Attachment parent id is required.');
  }

  const storagePath = `${parentType}s/${parentId}/${crypto.randomUUID()}-${sanitizeFileName(file.name)}`;
  const contentType = file.type || MIME_BY_EXTENSION[extension] || 'application/octet-stream';

  const { error: uploadError } = await supabase
    .storage
    .from(ATTACHMENTS_BUCKET)
    .upload(storagePath, file, {
      upsert: false,
      contentType,
    });

  if (uploadError) throw formatAttachmentError(uploadError, `Unable to upload ${file.name}.`);

  const { data, error } = await supabase
    .from('attachments')
    .insert({
      issue_id: parent.issueId ?? null,
      resolution_id: parent.resolutionId ?? null,
      bucket_name: ATTACHMENTS_BUCKET,
      storage_path: storagePath,
      file_name: file.name,
      mime_type: contentType,
      file_size: file.size,
      file_extension: extension || null,
    })
    .select('*')
    .single();

  if (error) {
    await supabase.storage.from(ATTACHMENTS_BUCKET).remove([storagePath]);
    throw formatAttachmentError(error, `Unable to save attachment metadata for ${file.name}.`);
  }

  return mapAttachmentRow(data as AttachmentRow);
}

async function deleteAttachmentRecord(attachment: Attachment): Promise<void> {
  const { error: storageError } = await supabase
    .storage
    .from(attachment.bucketName)
    .remove([attachment.storagePath]);

  if (storageError) {
    throw formatAttachmentError(storageError, `Unable to remove ${attachment.fileName} from storage.`);
  }

  const { error } = await supabase
    .from('attachments')
    .delete()
    .eq('id', attachment.id);

  if (error) throw formatAttachmentError(error, `Unable to remove ${attachment.fileName}.`);
}

async function getAttachmentsByIds(attachmentIds: string[]): Promise<Attachment[]> {
  const normalizedIds = Array.from(new Set(attachmentIds.filter(Boolean)));
  if (normalizedIds.length === 0) return [];

  const { data, error } = await supabase
    .from('attachments')
    .select('*')
    .in('id', normalizedIds);

  if (error) throw formatAttachmentError(error, 'Unable to load attachments.');
  return (data ?? []).map(row => mapAttachmentRow(row as AttachmentRow));
}

export async function syncIssueAttachments(issueId: string, input: AttachmentSyncInput): Promise<Attachment[]> {
  const existingToDelete = await getAttachmentsByIds(input.attachmentIdsToDelete);
  for (const attachment of existingToDelete) {
    await deleteAttachmentRecord(attachment);
  }

  for (const file of input.filesToUpload) {
    await uploadAttachment({ issueId }, file);
  }

  return listAttachmentsForIssue(issueId);
}

export async function syncResolutionAttachments(resolutionId: string, input: AttachmentSyncInput): Promise<Attachment[]> {
  const existingToDelete = await getAttachmentsByIds(input.attachmentIdsToDelete);
  for (const attachment of existingToDelete) {
    await deleteAttachmentRecord(attachment);
  }

  for (const file of input.filesToUpload) {
    await uploadAttachment({ resolutionId }, file);
  }

  return listAttachmentsForResolution(resolutionId);
}

export async function deleteAttachmentsForIssue(issueId: string): Promise<void> {
  const attachments = await listAttachmentsForIssue(issueId);
  for (const attachment of attachments) {
    await deleteAttachmentRecord(attachment);
  }
}

export async function deleteAttachmentsForResolution(resolutionId: string): Promise<void> {
  const attachments = await listAttachmentsForResolution(resolutionId);
  for (const attachment of attachments) {
    await deleteAttachmentRecord(attachment);
  }
}

export async function getAttachmentSignedUrl(attachment: Attachment, expiresIn = 60): Promise<string> {
  const { data, error } = await supabase
    .storage
    .from(attachment.bucketName)
    .createSignedUrl(attachment.storagePath, expiresIn);

  if (error || !data?.signedUrl) {
    throw formatAttachmentError(error, `Unable to access ${attachment.fileName}.`);
  }

  return data.signedUrl;
}

export async function openAttachment(attachment: Attachment): Promise<void> {
  const signedUrl = await getAttachmentSignedUrl(attachment);
  window.open(signedUrl, '_blank', 'noopener,noreferrer');
}

export async function downloadAttachment(attachment: Attachment): Promise<void> {
  const signedUrl = await getAttachmentSignedUrl(attachment);
  const link = window.document.createElement('a');
  link.href = signedUrl;
  link.download = attachment.fileName;
  link.rel = 'noopener noreferrer';
  window.document.body.appendChild(link);
  link.click();
  window.document.body.removeChild(link);
}
