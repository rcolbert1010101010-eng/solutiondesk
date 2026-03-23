import { supabase } from './supabaseClient';
import type {
  Issue,
  IssueRelationship,
  RelationshipType,
  Resolution,
  Severity,
  Status,
  SystemAffected,
  Tag,
  TagReference,
} from '../types';
import { htmlToPlainText, plainTextToHtml } from './richText';

export const TAGS_STORAGE_KEY = 'resolution_desk_tags';
export const ISSUES_STORAGE_KEY = 'resolution_desk_issues';
export const RESOLUTIONS_STORAGE_KEY = 'resolution_desk_resolutions';
export const RELATIONSHIPS_STORAGE_KEY = 'resolution_desk_relationships';
export const MIGRATION_FLAG_KEY = 'resolution_desk_migrated_to_supabase';
export const MERGE_DONE_FLAG_KEY = 'resolution_desk_supabase_merge_done';
export const MIGRATION_DISABLED_KEY = 'migration_disabled';
export const TAGS_CHANGED_EVENT = 'resolution_desk_tags_changed';
export const ISSUES_CHANGED_EVENT = 'resolution_desk_issues_changed';
export const RESOLUTIONS_CHANGED_EVENT = 'resolution_desk_resolutions_changed';
export const SYSTEMS_AFFECTED_CHANGED_EVENT = 'resolution_desk_systems_affected_changed';

const LEGACY_STORAGE_KEYS = [
  TAGS_STORAGE_KEY,
  ISSUES_STORAGE_KEY,
  RESOLUTIONS_STORAGE_KEY,
  RELATIONSHIPS_STORAGE_KEY,
  'issues_db',
] as const;

const HEX_COLOR_REGEX = /^#[0-9a-fA-F]{6}$/;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DATA_IMAGE_SRC_REGEX = /^data:image\/[a-z0-9.+-]+;base64,[a-z0-9+/=\s]+$/i;

interface TagRow {
  id: string;
  name: string;
  color: string | null;
  created_at: string;
  updated_at: string;
}

interface SystemAffectedRow {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

interface IssueRow {
  id: string;
  legacy_id: string | null;
  title: string;
  description_html: string | null;
  description_text: string | null;
  system_affected: string | null;
  status: string | null;
  severity: string | null;
  confidence: string | null;
  assignee: string | null;
  tags: string[] | null;
  is_master_incident: boolean | null;
  master_incident_id: string | null;
  relationship_type: RelationshipType | null;
  linked_at: string | null;
  linked_incident_count: number | null;
  last_linked_at: string | null;
  reference_count: number | null;
  confidence_score: number | null;
  created_at: string;
  updated_at: string;
}

interface ResolutionRow {
  id: string;
  issue_id: string | null;
  legacy_id: string | null;
  title: string;
  steps: unknown;
  notes: string | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
}

interface LegacyRelationshipRecord {
  sourceId?: string;
  masterId?: string;
  type?: RelationshipType;
  linkedAt?: string;
  source_issue_id?: string;
  master_issue_id?: string;
  relationship_type?: RelationshipType;
  linked_at?: string;
}

interface IssueWriteShape extends Partial<Issue> {
  title: string;
  systemAffected: string;
  severity: Severity;
  status: Status;
  description?: string;
  descriptionText?: string;
  descriptionHtml?: string;
  tags?: string[];
  assignee?: string;
  confidence?: string | null;
  isMasterIncident?: boolean;
  masterIncidentId?: string;
  relationshipType?: RelationshipType;
  linkedAt?: string;
  linkedIncidentCount?: number;
  lastLinkedAt?: string;
  referenceCount?: number;
  confidenceScore?: number;
  legacyId?: string | null;
}

interface ResolutionWriteShape extends Partial<Resolution> {
  issueId?: string | null;
  legacyId?: string | null;
  title: string;
  steps: string[];
  notes?: string;
  notesText?: string;
  tags?: string[];
}

let bootstrapPromise: Promise<void> | null = null;
let tagsCache: Tag[] = [];
let issuesCache: Issue[] = [];
let libraryResolutionsCache: Resolution[] = [];
let systemsAffectedCache: SystemAffected[] = [];
let tagsLoaded = false;
let issuesLoaded = false;
let libraryResolutionsLoaded = false;
let systemsAffectedLoaded = false;

function nowIso(): string {
  return new Date().toISOString();
}

function dispatchWindowEvent(eventName: string): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(eventName));
  }
}

function clearLegacyLocalStorage(): void {
  if (typeof window === 'undefined') return;

  for (const key of LEGACY_STORAGE_KEYS) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // ignore storage cleanup failures
    }
  }
}

function getLocalStorageItem(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function setLocalStorageItem(key: string, value: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // ignore storage write failures
  }
}

export function formatSupabaseError(error: unknown, fallback: string): Error {
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string' && error.message.trim()) {
    return new Error(error.message.trim());
  }
  return new Error(fallback);
}

function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

export function normalizeTagNameKey(name: string): string {
  return normalizeName(name).toLowerCase();
}

export function normalizeSystemAffectedNameKey(name: string): string {
  return normalizeName(name).toLowerCase();
}

function normalizeColor(color?: string | null): string | undefined {
  if (!color) return undefined;
  const value = color.trim();
  if (!value) return undefined;
  if (!HEX_COLOR_REGEX.test(value)) {
    throw new Error('Please provide a valid hex color (example: #3B82F6).');
  }
  return value.toUpperCase();
}

function normalizeStatus(status?: string | null): Status {
  return status === 'Investigating' || status === 'Resolved' || status === 'Closed' ? status : 'Open';
}

function normalizeSeverity(severity?: string | null): Severity {
  return severity === 'Low' || severity === 'High' || severity === 'Critical' ? severity : 'Medium';
}

function isUuid(value: string | null | undefined): value is string {
  return Boolean(value && UUID_REGEX.test(value));
}

function createUuid(): string {
  return crypto.randomUUID();
}

function sortTags(tags: Tag[]): Tag[] {
  return [...tags].sort((a, b) => a.name.localeCompare(b.name));
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function isSafeDataImageSrc(src: string): boolean {
  return DATA_IMAGE_SRC_REGEX.test(src.trim());
}

function parseImageToken(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed.startsWith('[img:') || !trimmed.endsWith(']')) return null;
  const src = trimmed.slice(5, -1).trim();
  return isSafeDataImageSrc(src) ? src : null;
}

function stepsLinesToHtml(lines: string[]): string {
  if (lines.length === 0) return '<p></p>';
  const items = lines.map(line => {
    const imageSrc = parseImageToken(line);
    if (imageSrc) {
      return `<li><img src="${imageSrc}" alt="step image" /></li>`;
    }
    return `<li>${escapeHtml(line)}</li>`;
  });
  return `<ol>${items.join('')}</ol>`;
}

function toStepText(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function normalizeResolutionSteps(steps: unknown): string[] {
  if (Array.isArray(steps)) {
    return steps
      .flatMap(step => toStepText(step).split(/\r?\n/))
      .map(step => step.trim())
      .filter(Boolean);
  }

  if (typeof steps === 'string') {
    return steps
      .split(/\r?\n/)
      .map(step => step.trim())
      .filter(Boolean);
  }

  if (steps && typeof steps === 'object') {
    return Object.values(steps as Record<string, unknown>)
      .flatMap(value => toStepText(value).split(/\r?\n/))
      .map(step => step.trim())
      .filter(Boolean);
  }

  return [];
}

function normalizeResolutionNotesHtml(input: Partial<Resolution> | Record<string, any>): string | undefined {
  const notes = typeof input.notes === 'string' ? input.notes.trim() : '';
  if (notes) return notes;

  const notesText = typeof input.notesText === 'string' ? input.notesText.trim() : '';
  if (notesText) return plainTextToHtml(notesText);

  const segments = [
    typeof input.summary === 'string' ? input.summary.trim() : '',
    typeof input.rootCause === 'string' ? input.rootCause.trim() : '',
    typeof input.finalResolution === 'string' ? input.finalResolution.trim() : '',
    typeof input.preventionNotes === 'string' ? input.preventionNotes.trim() : '',
  ].filter(Boolean);

  if (segments.length === 0) return undefined;
  return plainTextToHtml(segments.join('\n\n'));
}

function normalizeResolutionTitle(input: Partial<Resolution> | Record<string, any>, steps: string[]): string {
  const candidates = [
    typeof input.title === 'string' ? input.title.trim() : '',
    typeof input.summary === 'string' ? input.summary.trim() : '',
    steps[0] ?? '',
    typeof input.finalResolution === 'string' ? input.finalResolution.trim() : '',
  ];

  return candidates.find(Boolean) ?? 'Resolution';
}

function normalizeDescriptionFields(input: {
  description?: string | null;
  descriptionText?: string | null;
  descriptionHtml?: string | null;
}): { description: string; descriptionText: string; descriptionHtml: string } {
  const nextText = (
    input.descriptionText
    ?? input.description
    ?? htmlToPlainText(input.descriptionHtml ?? '')
  ).trim();

  const nextHtml = input.descriptionHtml?.trim()
    ? input.descriptionHtml.trim()
    : plainTextToHtml(nextText);

  return {
    description: nextText,
    descriptionText: nextText,
    descriptionHtml: nextHtml,
  };
}

function mapTagRow(row: TagRow): Tag {
  return {
    id: row.id,
    name: row.name,
    color: row.color ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapSystemAffectedRow(row: SystemAffectedRow): SystemAffected {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapTagIdsToNames(tagIds: string[] | null | undefined, tagsById: Map<string, Tag>): string[] {
  return (tagIds ?? [])
    .map(tagId => tagsById.get(tagId)?.name)
    .filter((name): name is string => Boolean(name));
}
function buildRelationshipStats(rows: IssueRow[]): {
  counts: Map<string, number>;
  lastLinkedAt: Map<string, string>;
} {
  const counts = new Map<string, number>();
  const lastLinkedAt = new Map<string, string>();

  for (const row of rows) {
    if (!row.master_incident_id) continue;
    counts.set(row.master_incident_id, (counts.get(row.master_incident_id) ?? 0) + 1);

    const linkedAt = row.linked_at ?? row.updated_at;
    if (!linkedAt) continue;
    const current = lastLinkedAt.get(row.master_incident_id);
    if (!current || new Date(linkedAt).getTime() > new Date(current).getTime()) {
      lastLinkedAt.set(row.master_incident_id, linkedAt);
    }
  }

  return { counts, lastLinkedAt };
}

function mapResolutionRow(row: ResolutionRow, tagsById: Map<string, Tag>): Resolution {
  const steps = normalizeResolutionSteps(row.steps);
  const notesHtml = row.notes?.trim() || undefined;
  const notesText = notesHtml ? htmlToPlainText(notesHtml) : undefined;
  const summary = row.title?.trim() || steps[0] || notesText || 'Resolution';
  const rootCause = notesText ? notesText.split(/\r?\n/).map(line => line.trim()).find(Boolean) : undefined;

  return {
    id: row.id,
    issueId: row.issue_id,
    title: row.title,
    summary,
    rootCause,
    steps,
    stepsHtml: stepsLinesToHtml(steps),
    notes: notesHtml,
    notesText,
    tags: mapTagIdsToNames(row.tags, tagsById),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function groupResolutionsByIssue(rows: ResolutionRow[], tagsById: Map<string, Tag>): Map<string, Resolution[]> {
  const grouped = new Map<string, Resolution[]>();

  for (const row of rows) {
    if (!row.issue_id) continue;
    const resolution = mapResolutionRow(row, tagsById);
    const current = grouped.get(row.issue_id) ?? [];
    current.push(resolution);
    grouped.set(row.issue_id, current);
  }

  for (const [issueId, list] of grouped.entries()) {
    grouped.set(issueId, list.sort((a, b) => new Date(b.updatedAt ?? b.createdAt ?? 0).getTime() - new Date(a.updatedAt ?? a.createdAt ?? 0).getTime()));
  }

  return grouped;
}

function mapIssueRow(
  row: IssueRow,
  tagsById: Map<string, Tag>,
  rows: IssueRow[],
  issueResolutions: Map<string, Resolution[]>,
): Issue {
  const { counts, lastLinkedAt } = buildRelationshipStats(rows);
  const descriptions = normalizeDescriptionFields({
    descriptionText: row.description_text,
    descriptionHtml: row.description_html,
  });
  const resolutions = issueResolutions.get(row.id) ?? [];

  return {
    id: row.id,
    title: row.title,
    description: descriptions.description,
    descriptionText: descriptions.descriptionText,
    descriptionHtml: descriptions.descriptionHtml,
    systemAffected: row.system_affected ?? '',
    severity: normalizeSeverity(row.severity),
    status: normalizeStatus(row.status),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    assignee: row.assignee ?? undefined,
    tags: mapTagIdsToNames(row.tags, tagsById),
    resolution: resolutions[0],
    resolutions,
    isMasterIncident: Boolean(row.is_master_incident || (counts.get(row.id) ?? 0) > 0),
    masterIncidentId: row.master_incident_id ?? undefined,
    linkedIncidentCount: counts.get(row.id) ?? row.linked_incident_count ?? 0,
    lastLinkedAt: lastLinkedAt.get(row.id) ?? row.last_linked_at ?? undefined,
    referenceCount: row.reference_count ?? 0,
    confidenceScore: row.confidence_score ?? undefined,
  };
}

function getCachedTagByName(name: string): Tag | undefined {
  const key = normalizeTagNameKey(name);
  if (!key) return undefined;
  return tagsCache.find(tag => normalizeTagNameKey(tag.name) === key);
}

async function fetchTagsFromSupabase(): Promise<Tag[]> {
  try {
    await ensureSupabaseBootstrap();

    const { data, error } = await supabase
      .from('tags')
      .select('id,name,color,created_at,updated_at')
      .order('name', { ascending: true });

    if (error) throw error;

    tagsCache = sortTags((data ?? []).map(row => mapTagRow(row as TagRow)));
    tagsLoaded = true;
    return [...tagsCache];
  } catch (error) {
    console.error('Unable to load tags from Supabase.', error);
    tagsCache = [];
    tagsLoaded = true;
    return [];
  }
}

async function fetchSystemsAffectedFromSupabase(): Promise<SystemAffected[]> {
  try {
    await ensureSupabaseBootstrap();

    const { data, error } = await supabase
      .from('systems_affected')
      .select('id,name,created_at,updated_at')
      .order('name', { ascending: true });

    if (error) throw error;

    systemsAffectedCache = (data ?? []).map(row => mapSystemAffectedRow(row as SystemAffectedRow));
    systemsAffectedLoaded = true;
    return [...systemsAffectedCache];
  } catch (error) {
    console.error('Unable to load systems affected from Supabase.', error);
    systemsAffectedCache = [];
    systemsAffectedLoaded = true;
    return [];
  }
}

async function fetchIssueRowsFromSupabase(): Promise<IssueRow[]> {
  try {
    await ensureSupabaseBootstrap();

    const { data, error } = await supabase
      .from('issues')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return (data ?? []) as IssueRow[];
  } catch (error) {
    console.error('Unable to load issues from Supabase.', error);
    return [];
  }
}

async function fetchIssueRowByIdFromSupabase(id: string): Promise<IssueRow | undefined> {
  try {
    await ensureSupabaseBootstrap();

    const { data, error } = await supabase
      .from('issues')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data as IssueRow | undefined;
  } catch (error) {
    console.error(`Unable to load issue ${id} from Supabase.`, error);
    return undefined;
  }
}

async function fetchResolutionRowsFromSupabase(): Promise<ResolutionRow[]> {
  try {
    await ensureSupabaseBootstrap();

    const { data, error } = await supabase
      .from('resolutions')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return (data ?? []) as ResolutionRow[];
  } catch (error) {
    console.error('Unable to load resolutions from Supabase.', error);
    return [];
  }
}

async function fetchIssueResolutionRowsFromSupabase(issueId: string): Promise<ResolutionRow[]> {
  try {
    await ensureSupabaseBootstrap();

    const { data, error } = await supabase
      .from('resolutions')
      .select('*')
      .eq('issue_id', issueId)
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return (data ?? []) as ResolutionRow[];
  } catch (error) {
    console.error(`Unable to load resolutions for issue ${issueId}.`, error);
    return [];
  }
}

async function fetchLibraryResolutionRowsFromSupabase(): Promise<ResolutionRow[]> {
  try {
    await ensureSupabaseBootstrap();

    const { data, error } = await supabase
      .from('resolutions')
      .select('*')
      .is('issue_id', null)
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return (data ?? []) as ResolutionRow[];
  } catch (error) {
    console.error('Unable to load library resolutions from Supabase.', error);
    return [];
  }
}

async function fetchIssuesFromSupabase(): Promise<Issue[]> {
  const [rows, tags, resolutionRows] = await Promise.all([
    fetchIssueRowsFromSupabase(),
    fetchTagsFromSupabase(),
    fetchResolutionRowsFromSupabase(),
  ]);

  const tagMap = new Map(tags.map(tag => [tag.id, tag]));
  const resolutionsByIssue = groupResolutionsByIssue(resolutionRows, tagMap);
  issuesCache = rows.map(row => mapIssueRow(row, tagMap, rows, resolutionsByIssue));
  issuesLoaded = true;
  return [...issuesCache];
}

async function fetchIssueFromSupabase(id: string): Promise<Issue | undefined> {
  const [row, rows, tags, resolutionRows] = await Promise.all([
    fetchIssueRowByIdFromSupabase(id),
    fetchIssueRowsFromSupabase(),
    fetchTagsFromSupabase(),
    fetchIssueResolutionRowsFromSupabase(id),
  ]);

  if (!row) return undefined;

  const tagMap = new Map(tags.map(tag => [tag.id, tag]));
  const resolutionsByIssue = groupResolutionsByIssue(resolutionRows, tagMap);
  const issue = mapIssueRow(row, tagMap, rows, resolutionsByIssue);

  const index = issuesCache.findIndex(item => item.id === issue.id);
  if (index >= 0) {
    issuesCache[index] = issue;
  } else if (issuesLoaded) {
    issuesCache = [issue, ...issuesCache.filter(item => item.id !== issue.id)];
  }

  return issue;
}

async function fetchLibraryResolutionsFromSupabase(): Promise<Resolution[]> {
  const [tags, rows] = await Promise.all([
    fetchTagsFromSupabase(),
    fetchLibraryResolutionRowsFromSupabase(),
  ]);

  const tagMap = new Map(tags.map(tag => [tag.id, tag]));
  libraryResolutionsCache = rows.map(row => mapResolutionRow(row, tagMap));
  libraryResolutionsLoaded = true;
  return [...libraryResolutionsCache];
}

async function ensureTagsLoaded(): Promise<Tag[]> {
  if (tagsLoaded) return [...tagsCache];
  return fetchTagsFromSupabase();
}

async function ensureSystemsAffectedLoaded(): Promise<SystemAffected[]> {
  if (systemsAffectedLoaded) return [...systemsAffectedCache];
  return fetchSystemsAffectedFromSupabase();
}

async function ensureIssuesLoaded(): Promise<Issue[]> {
  if (issuesLoaded) return [...issuesCache];
  return fetchIssuesFromSupabase();
}

async function ensureLibraryResolutionsLoaded(): Promise<Resolution[]> {
  if (libraryResolutionsLoaded) return [...libraryResolutionsCache];
  return fetchLibraryResolutionsFromSupabase();
}

function parseLegacyTags(raw: string | null): Tag[] {
  if (!raw || !raw.trim()) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const timestamp = nowIso();

    if (parsed.every(item => typeof item === 'string')) {
      const seen = new Set<string>();
      return (parsed as string[])
        .map(item => normalizeName(item))
        .filter(Boolean)
        .filter(name => {
          const key = normalizeTagNameKey(name);
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .map(name => ({
          id: createUuid(),
          name,
          createdAt: timestamp,
          updatedAt: timestamp,
        }));
    }

    const seen = new Set<string>();
    const tags: Tag[] = [];

    for (const item of parsed) {
      if (!item || typeof item !== 'object') continue;
      const candidate = item as Partial<Tag>;
      const name = normalizeName(candidate.name ?? '');
      if (!name) continue;

      const key = normalizeTagNameKey(name);
      if (seen.has(key)) continue;
      seen.add(key);

      tags.push({
        id: isUuid(candidate.id) ? candidate.id : createUuid(),
        name,
        color: normalizeColor(candidate.color),
        createdAt: candidate.createdAt ?? timestamp,
        updatedAt: candidate.updatedAt ?? candidate.createdAt ?? timestamp,
      });
    }

    return tags;
  } catch {
    return [];
  }
}
function parseLegacyRelationships(raw: string | null): LegacyRelationshipRecord[] {
  if (!raw || !raw.trim()) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as LegacyRelationshipRecord[]) : [];
  } catch {
    return [];
  }
}

function normalizeLegacyResolution(resolution: Resolution, issueId?: string): Resolution {
  const steps = normalizeResolutionSteps(resolution.steps ?? resolution.stepsTaken ?? resolution.stepsHtml ?? '');
  const notes = normalizeResolutionNotesHtml(resolution);
  const notesText = notes ? htmlToPlainText(notes) : undefined;
  const title = normalizeResolutionTitle(resolution, steps);
  const timestamp = resolution.updatedAt ?? resolution.createdAt ?? resolution.resolvedAt ?? nowIso();

  return {
    ...resolution,
    id: resolution.id || createUuid(),
    issueId: resolution.issueId ?? issueId ?? null,
    title,
    summary: resolution.summary ?? title,
    rootCause: resolution.rootCause ?? (notesText ? notesText.split(/\r?\n/).find(Boolean) : undefined),
    steps,
    stepsHtml: stepsLinesToHtml(steps),
    notes,
    notesText,
    tags: Array.isArray(resolution.tags) ? resolution.tags : [],
    createdAt: resolution.createdAt ?? resolution.resolvedAt ?? timestamp,
    updatedAt: timestamp,
  };
}

function dedupeResolutions(resolutions: Resolution[]): Resolution[] {
  const seen = new Set<string>();
  const list: Resolution[] = [];

  for (const resolution of resolutions) {
    const key = resolution.id || JSON.stringify({
      title: resolution.title,
      steps: resolution.steps,
      notes: resolution.notes,
      issueId: resolution.issueId ?? null,
    });

    if (seen.has(key)) continue;
    seen.add(key);
    list.push(resolution);
  }

  return list;
}

function parseLegacyIssues(raw: string | null): Issue[] {
  if (!raw || !raw.trim()) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return (parsed as Issue[]).map(issue => {
      const descriptions = normalizeDescriptionFields({
        description: issue.description,
        descriptionText: issue.descriptionText,
        descriptionHtml: issue.descriptionHtml,
      });

      const legacyResolutions = dedupeResolutions([
        ...(Array.isArray(issue.resolutions) ? issue.resolutions : []),
        ...(issue.resolution ? [issue.resolution] : []),
      ].map(resolution => normalizeLegacyResolution(resolution, issue.id)));

      return {
        ...issue,
        ...descriptions,
        systemAffected: issue.systemAffected ?? '',
        severity: normalizeSeverity(issue.severity),
        status: normalizeStatus(issue.status),
        tags: Array.isArray(issue.tags) ? Array.from(new Set(issue.tags.map(tag => normalizeName(tag)).filter(Boolean))) : [],
        resolution: legacyResolutions[0],
        resolutions: legacyResolutions,
        createdAt: issue.createdAt ?? nowIso(),
        updatedAt: issue.updatedAt ?? issue.createdAt ?? nowIso(),
      };
    });
  } catch {
    return [];
  }
}

function applyLegacyRelationships(issues: Issue[], relationships: LegacyRelationshipRecord[]): Issue[] {
  if (relationships.length === 0) return issues;

  const byId = new Map(issues.map(issue => [issue.id, { ...issue }]));

  for (const relationship of relationships) {
    const sourceId = relationship.sourceId ?? relationship.source_issue_id;
    const masterId = relationship.masterId ?? relationship.master_issue_id;
    const type = relationship.type ?? relationship.relationship_type;
    const linkedAt = relationship.linkedAt ?? relationship.linked_at ?? nowIso();

    if (!sourceId || !masterId || !type) continue;

    const sourceIssue = byId.get(sourceId);
    const masterIssue = byId.get(masterId);
    if (!sourceIssue || !masterIssue) continue;

    sourceIssue.masterIncidentId = masterId;
    sourceIssue.updatedAt = linkedAt;
    masterIssue.isMasterIncident = true;
    masterIssue.lastLinkedAt = linkedAt;
  }

  return Array.from(byId.values());
}

function mergeLegacyTags(tags: Tag[], issues: Issue[], resolutions: Resolution[] = []): Tag[] {
  const merged = new Map<string, Tag>();

  for (const tag of tags) {
    merged.set(normalizeTagNameKey(tag.name), tag);
  }

  for (const issue of issues) {
    for (const tagName of issue.tags ?? []) {
      const key = normalizeTagNameKey(tagName);
      if (!key || merged.has(key)) continue;
      const timestamp = nowIso();
      merged.set(key, {
        id: createUuid(),
        name: normalizeName(tagName),
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    }

    for (const resolution of issue.resolutions ?? []) {
      for (const tagName of resolution.tags ?? []) {
        const key = normalizeTagNameKey(tagName);
        if (!key || merged.has(key)) continue;
        const timestamp = nowIso();
        merged.set(key, {
          id: createUuid(),
          name: normalizeName(tagName),
          createdAt: timestamp,
          updatedAt: timestamp,
        });
      }
    }
  }

  for (const resolution of resolutions) {
    for (const tagName of resolution.tags ?? []) {
      const key = normalizeTagNameKey(tagName);
      if (!key || merged.has(key)) continue;
      const timestamp = nowIso();
      merged.set(key, {
        id: createUuid(),
        name: normalizeName(tagName),
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    }
  }

  return sortTags(Array.from(merged.values()));
}

function collectLegacyIssueResolutions(issues: Issue[]): Resolution[] {
  return issues.flatMap(issue => (issue.resolutions ?? []).map(resolution => ({
    ...resolution,
    issueId: issue.id,
  })));
}

function parseLegacyResolutions(raw: string | null): Resolution[] {
  if (!raw || !raw.trim()) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return dedupeResolutions(
      parsed
        .filter((item): item is Resolution => Boolean(item && typeof item === 'object'))
        .map(item => normalizeLegacyResolution(item)),
    );
  } catch {
    return [];
  }
}

function hasLegacyStoreData(): boolean {
  return LEGACY_STORAGE_KEYS.some(key => Boolean(getLocalStorageItem(key)?.trim()));
}

async function migrateLegacyLocalStorageToSupabase(): Promise<void> {
  if (typeof window === 'undefined') return;

  if (getLocalStorageItem(MIGRATION_DISABLED_KEY) === '1') {
    return;
  }

  if (!hasLegacyStoreData()) {
    return;
  }

  const legacyRelationships = parseLegacyRelationships(getLocalStorageItem(RELATIONSHIPS_STORAGE_KEY));
  const legacyIssues = applyLegacyRelationships(parseLegacyIssues(getLocalStorageItem(ISSUES_STORAGE_KEY)), legacyRelationships);
  const localIssueResolutions = collectLegacyIssueResolutions(legacyIssues);
  const standaloneResolutions = parseLegacyResolutions(getLocalStorageItem(RESOLUTIONS_STORAGE_KEY));
  const legacyResolutions = dedupeResolutions([...localIssueResolutions, ...standaloneResolutions]);
  const legacyTags = mergeLegacyTags(parseLegacyTags(getLocalStorageItem(TAGS_STORAGE_KEY)), legacyIssues, legacyResolutions);

  if (legacyTags.length === 0 && legacyIssues.length === 0 && legacyResolutions.length === 0) {
    return;
  }

  const { data: existingTags, error: existingTagsError } = await supabase
    .from('tags')
    .select('id,name,color,created_at,updated_at')
    .order('name', { ascending: true });
  if (existingTagsError) throw existingTagsError;

  const existingTagIdByName = new Map(
    ((existingTags ?? []) as TagRow[]).map(tag => [normalizeTagNameKey(tag.name), tag.id]),
  );

  const tagsToInsert: TagRow[] = legacyTags
    .filter(tag => !existingTagIdByName.has(normalizeTagNameKey(tag.name)))
    .map(tag => ({
      id: isUuid(tag.id) ? tag.id : createUuid(),
      name: normalizeName(tag.name),
      color: normalizeColor(tag.color) ?? null,
      created_at: tag.createdAt ?? nowIso(),
      updated_at: tag.updatedAt ?? tag.createdAt ?? nowIso(),
    }));

  if (tagsToInsert.length > 0) {
    const { error } = await supabase.from('tags').insert(tagsToInsert);
    if (error) throw error;
  }

  const { data: mergedTags, error: mergedTagsError } = await supabase
    .from('tags')
    .select('id,name')
    .order('name', { ascending: true });
  if (mergedTagsError) throw mergedTagsError;

  const oldTagIdToNewId = new Map<string, string>();
  const tagIdByName = new Map<string, string>();
  for (const row of (mergedTags ?? []) as Array<Pick<TagRow, 'id' | 'name'>>) {
    tagIdByName.set(normalizeTagNameKey(row.name), row.id);
  }
  for (const tag of legacyTags) {
    const mappedId = tagIdByName.get(normalizeTagNameKey(tag.name));
    if (mappedId) {
      oldTagIdToNewId.set(tag.id, mappedId);
    }
  }

  const resolveLegacyTagRefs = (refs?: TagReference[]): string[] => {
    if (!Array.isArray(refs)) return [];

    return Array.from(new Set(refs
      .map(ref => {
        if (!ref) return undefined;
        return oldTagIdToNewId.get(ref) ?? tagIdByName.get(normalizeTagNameKey(ref));
      })
      .filter((value): value is string => Boolean(value))));
  };

  const issuesToMerge = legacyIssues.filter(issue => {
    if (typeof issue.id === 'string' && issue.id.trim()) return true;
    console.warn('Skipping legacy issue without id during Supabase merge.', issue);
    return false;
  });

  const issueUpsertRows = issuesToMerge.map(issue => {
    const descriptions = normalizeDescriptionFields({
      description: issue.description,
      descriptionText: issue.descriptionText,
      descriptionHtml: issue.descriptionHtml,
    });
    const linkedAt = issue.updatedAt ?? issue.createdAt ?? nowIso();

    return {
      ...toIssueRowPayload({
        title: issue.title,
        descriptionHtml: descriptions.descriptionHtml,
        descriptionText: descriptions.descriptionText,
        systemAffected: issue.systemAffected ?? '',
        status: normalizeStatus(issue.status),
        severity: normalizeSeverity(issue.severity),
        confidence: null,
        tags: resolveLegacyTagRefs(issue.tags),
        assignee: issue.assignee ?? null,
        isMasterIncident: Boolean(issue.isMasterIncident),
        masterIncidentId: null,
        relationshipType: null,
        linkedAt: issue.masterIncidentId ? linkedAt : null,
        lastLinkedAt: issue.lastLinkedAt ?? null,
        linkedIncidentCount: issue.linkedIncidentCount ?? 0,
        referenceCount: issue.referenceCount ?? 0,
        confidenceScore: issue.confidenceScore ?? null,
        legacyId: issue.id,
      }),
      created_at: issue.createdAt ?? nowIso(),
      updated_at: issue.updatedAt ?? issue.createdAt ?? nowIso(),
    };
  });

  if (issueUpsertRows.length > 0) {
    const { error } = await supabase
      .from('issues')
      .upsert(issueUpsertRows, { onConflict: 'legacy_id' });
    if (error) throw error;
  }

  const issueLegacyIds = issuesToMerge.map(issue => issue.id);
  const mergedIssueRows = issueLegacyIds.length > 0
    ? await supabase
        .from('issues')
        .select('id,legacy_id')
        .in('legacy_id', issueLegacyIds)
    : { data: [], error: null };
  if (mergedIssueRows.error) throw mergedIssueRows.error;

  const issueIdByLegacyId = new Map<string, string>();
  for (const row of (mergedIssueRows.data ?? []) as Array<Pick<IssueRow, 'id' | 'legacy_id'>>) {
    if (row.legacy_id) issueIdByLegacyId.set(row.legacy_id, row.id);
  }

  const issueRelationshipRows = issuesToMerge.map(issue => {
    const linkedAt = issue.updatedAt ?? issue.createdAt ?? nowIso();
    return {
      legacy_id: issue.id,
      master_incident_id: issue.masterIncidentId ? (issueIdByLegacyId.get(issue.masterIncidentId) ?? null) : null,
      relationship_type: null,
      linked_at: issue.masterIncidentId ? linkedAt : null,
    };
  });

  for (const relationship of legacyRelationships) {
    const sourceId = relationship.sourceId ?? relationship.source_issue_id;
    const masterId = relationship.masterId ?? relationship.master_issue_id;
    const type = relationship.type ?? relationship.relationship_type;
    const linkedAt = relationship.linkedAt ?? relationship.linked_at ?? nowIso();
    if (!sourceId || !masterId || !type) continue;

    const target = issueRelationshipRows.find(row => row.legacy_id === sourceId);
    if (!target) continue;
    target.master_incident_id = issueIdByLegacyId.get(masterId) ?? null;
    target.relationship_type = type;
    target.linked_at = linkedAt;
  }

  if (issueRelationshipRows.length > 0) {
    const { error } = await supabase
      .from('issues')
      .upsert(issueRelationshipRows, { onConflict: 'legacy_id' });
    if (error) throw error;
  }

  const resolutionsToMerge = legacyResolutions.filter(resolution => {
    if (typeof resolution.id === 'string' && resolution.id.trim()) return true;
    console.warn('Skipping legacy resolution without id during Supabase merge.', resolution);
    return false;
  });

  const resolutionUpsertRows = resolutionsToMerge.map(resolution => {
    const steps = normalizeResolutionSteps(resolution.steps ?? resolution.stepsHtml ?? resolution.stepsTaken ?? '');
    const notes = normalizeResolutionNotesHtml(resolution);

    return {
      ...toResolutionRowPayload({
        issueId: resolution.issueId ? (issueIdByLegacyId.get(resolution.issueId) ?? null) : null,
        legacyId: resolution.id,
        title: normalizeResolutionTitle(resolution, steps),
        steps,
        notes,
        tags: resolveLegacyTagRefs(resolution.tags),
      }),
      created_at: resolution.createdAt ?? resolution.resolvedAt ?? nowIso(),
      updated_at: resolution.updatedAt ?? resolution.createdAt ?? resolution.resolvedAt ?? nowIso(),
    };
  });

  if (resolutionUpsertRows.length > 0) {
    const { error } = await supabase
      .from('resolutions')
      .upsert(resolutionUpsertRows, { onConflict: 'legacy_id' });
    if (error) throw error;
  }

  console.info(`Merged ${issueUpsertRows.length} issues, ${resolutionUpsertRows.length} resolutions, ${legacyTags.length} tags`);
  setLocalStorageItem(MERGE_DONE_FLAG_KEY, '1');
  setLocalStorageItem(MIGRATION_FLAG_KEY, '1');
  clearLegacyLocalStorage();
}

async function ensureSupabaseBootstrap(): Promise<void> {
  if (!bootstrapPromise) {
    bootstrapPromise = migrateLegacyLocalStorageToSupabase().catch(error => {
      bootstrapPromise = null;
      throw error;
    });
  }

  await bootstrapPromise;
}

async function resolveTagIds(tagRefs?: TagReference[]): Promise<string[]> {
  if (!Array.isArray(tagRefs) || tagRefs.length === 0) return [];

  const tags = await ensureTagsLoaded();
  const tagMap = new Map(tags.map(tag => [normalizeTagNameKey(tag.name), tag.id]));
  const resolved = tagRefs
    .map(ref => tagMap.get(normalizeTagNameKey(String(ref))))
    .filter((tagId): tagId is string => Boolean(tagId));

  return Array.from(new Set(resolved));
}

function toIssueWriteShape(base: Partial<Issue>, updates?: Partial<Issue>): IssueWriteShape {
  const merged = { ...base, ...updates };
  const descriptions = normalizeDescriptionFields({
    description: merged.description,
    descriptionText: merged.descriptionText,
    descriptionHtml: merged.descriptionHtml,
  });

  return {
    title: (merged.title ?? '').trim(),
    systemAffected: merged.systemAffected ?? '',
    severity: normalizeSeverity(merged.severity),
    status: normalizeStatus(merged.status),
    assignee: merged.assignee?.trim() || undefined,
    tags: Array.isArray(merged.tags) ? merged.tags : [],
    description: descriptions.description,
    descriptionText: descriptions.descriptionText,
    descriptionHtml: descriptions.descriptionHtml,
    confidence: (merged as { confidence?: string | null }).confidence ?? null,
    isMasterIncident: Boolean(merged.isMasterIncident),
    masterIncidentId: merged.masterIncidentId,
    relationshipType: (merged as { relationshipType?: RelationshipType }).relationshipType,
    linkedAt: (merged as { linkedAt?: string }).linkedAt,
    linkedIncidentCount: merged.linkedIncidentCount,
    lastLinkedAt: merged.lastLinkedAt,
    referenceCount: merged.referenceCount,
    confidenceScore: merged.confidenceScore,
    legacyId: (merged as { legacyId?: string | null }).legacyId ?? null,
  };
}

function toResolutionWriteShape(base: Partial<Resolution>, updates?: Partial<Resolution>): ResolutionWriteShape {
  const merged = { ...base, ...updates };
  const steps = normalizeResolutionSteps(merged.steps ?? merged.stepsHtml ?? merged.stepsTaken ?? '');
  const notes = normalizeResolutionNotesHtml(merged);
  const notesText = notes ? htmlToPlainText(notes) : undefined;

  return {
    issueId: merged.issueId ?? null,
    legacyId: (merged as { legacyId?: string | null }).legacyId ?? null,
    title: normalizeResolutionTitle(merged, steps),
    steps,
    notes,
    notesText,
    tags: Array.isArray(merged.tags) ? merged.tags : [],
  };
}

export function toIssueRowPayload(input: Partial<Issue> | any): Record<string, any> {
  return {
    title: input.title ?? '',
    description_html: ('descriptionHtml' in input ? input.descriptionHtml : input.description_html) ?? null,
    description_text: ('descriptionText' in input ? input.descriptionText : input.description_text) ?? null,
    system_affected: ('systemAffected' in input ? input.systemAffected : input.system_affected) ?? '',
    status: input.status ?? null,
    severity: input.severity ?? null,
    confidence: input.confidence ?? null,
    tags: Array.isArray(input.tags) ? input.tags : [],
    assignee: input.assignee ?? null,
    confidence_score: ('confidenceScore' in input ? input.confidenceScore : input.confidence_score) ?? null,
    is_master_incident: ('isMasterIncident' in input ? input.isMasterIncident : input.is_master_incident) ?? false,
    master_incident_id: ('masterIncidentId' in input ? input.masterIncidentId : input.master_incident_id) ?? null,
    relationship_type: ('relationshipType' in input ? input.relationshipType : input.relationship_type) ?? null,
    linked_at: ('linkedAt' in input ? input.linkedAt : input.linked_at) ?? null,
    last_linked_at: ('lastLinkedAt' in input ? input.lastLinkedAt : input.last_linked_at) ?? null,
    linked_incident_count: ('linkedIncidentCount' in input ? input.linkedIncidentCount : input.linked_incident_count) ?? 0,
    reference_count: ('referenceCount' in input ? input.referenceCount : input.reference_count) ?? 0,
    legacy_id: ('legacyId' in input ? input.legacyId : input.legacy_id) ?? null,
  };
}

export function toResolutionRowPayload(input: Partial<Resolution> | any): Record<string, any> {
  return {
    issue_id: ('issueId' in input ? input.issueId : input.issue_id) ?? null,
    legacy_id: ('legacyId' in input ? input.legacyId : input.legacy_id) ?? null,
    title: input.title ?? 'Resolution',
    steps: Array.isArray(input.steps) ? input.steps : normalizeResolutionSteps(input.steps),
    notes: input.notes ?? null,
    tags: Array.isArray(input.tags) ? input.tags : [],
  };
}
async function toIssueInsertRow(issue: Omit<Issue, 'id' | 'createdAt'>): Promise<Record<string, any>> {
  const normalized = toIssueWriteShape(issue);
  if (!normalized.title) {
    throw new Error('Issue title is required.');
  }

  return toIssueRowPayload({
    ...normalized,
    tags: await resolveTagIds(normalized.tags),
    legacyId: null,
  });
}

async function toIssueUpdateRow(current: Issue, updates: Partial<Issue>): Promise<Record<string, any>> {
  const normalized = toIssueWriteShape(current, updates);
  return toIssueRowPayload({
    ...normalized,
    tags: await resolveTagIds(normalized.tags),
  });
}

async function toResolutionInsertRow(issueId: string | null, resolution: Omit<Resolution, 'id'> | Resolution): Promise<Record<string, any>> {
  const normalized = toResolutionWriteShape({
    ...resolution,
    issueId,
  });

  return toResolutionRowPayload({
    ...normalized,
    issueId,
    tags: await resolveTagIds(normalized.tags),
  });
}

async function toResolutionUpdateRow(current: Resolution, updates: Partial<Resolution>): Promise<Record<string, any>> {
  const normalized = toResolutionWriteShape(current, updates);
  return toResolutionRowPayload({
    ...normalized,
    tags: await resolveTagIds(normalized.tags),
  });
}

async function refreshTagsAndDispatch(options?: { alsoIssues?: boolean; alsoLibraryResolutions?: boolean }): Promise<void> {
  await fetchTagsFromSupabase();
  dispatchWindowEvent(TAGS_CHANGED_EVENT);

  if (options?.alsoIssues) {
    await fetchIssuesFromSupabase();
    dispatchWindowEvent(ISSUES_CHANGED_EVENT);
  }

  if (options?.alsoLibraryResolutions) {
    await fetchLibraryResolutionsFromSupabase();
    dispatchWindowEvent(RESOLUTIONS_CHANGED_EVENT);
  }
}

async function refreshIssuesAndDispatch(): Promise<void> {
  await fetchIssuesFromSupabase();
  dispatchWindowEvent(ISSUES_CHANGED_EVENT);
}

async function refreshLibraryResolutionsAndDispatch(): Promise<void> {
  await fetchLibraryResolutionsFromSupabase();
  dispatchWindowEvent(RESOLUTIONS_CHANGED_EVENT);
}

export async function listTagsFromStore(): Promise<Tag[]> {
  return fetchTagsFromSupabase();
}

export async function listSystemsAffected(): Promise<SystemAffected[]> {
  return fetchSystemsAffectedFromSupabase();
}

export async function createSystemAffected(name: string): Promise<SystemAffected> {
  const normalizedName = normalizeName(name);
  if (!normalizedName) {
    throw new Error('System name is required.');
  }

  const systems = await ensureSystemsAffectedLoaded();
  const duplicate = systems.find(system => normalizeSystemAffectedNameKey(system.name) === normalizeSystemAffectedNameKey(normalizedName));
  if (duplicate) {
    return duplicate;
  }

  const { data, error } = await supabase
    .from('systems_affected')
    .insert({ name: normalizedName })
    .select('id,name,created_at,updated_at')
    .single();

  if (error) {
    const refreshed = await fetchSystemsAffectedFromSupabase();
    const existing = refreshed.find(system => normalizeSystemAffectedNameKey(system.name) === normalizeSystemAffectedNameKey(normalizedName));
    if (existing) return existing;
    throw formatSupabaseError(error, 'Unable to create system.');
  }

  await fetchSystemsAffectedFromSupabase();
  dispatchWindowEvent(SYSTEMS_AFFECTED_CHANGED_EVENT);
  return mapSystemAffectedRow(data as SystemAffectedRow);
}

export async function getTagByNameFromStore(name: string): Promise<Tag | undefined> {
  const key = normalizeTagNameKey(name);
  if (!key) return undefined;

  const cached = getCachedTagByName(name);
  if (cached) return cached;

  const tags = await ensureTagsLoaded();
  return tags.find(tag => normalizeTagNameKey(tag.name) === key);
}

export async function createTagInStore(input: { name: string; color?: string }): Promise<Tag> {
  const name = normalizeName(input.name);
  if (!name) {
    throw new Error('Tag name is required.');
  }

  const tags = await ensureTagsLoaded();
  const duplicate = tags.find(tag => normalizeTagNameKey(tag.name) === normalizeTagNameKey(name));
  if (duplicate) {
    return duplicate;
  }

  const payload = {
    name,
    color: normalizeColor(input.color) ?? null,
  };

  const { data, error } = await supabase
    .from('tags')
    .insert(payload)
    .select('id,name,color,created_at,updated_at')
    .single();

  if (error) {
    const existing = await getTagByNameFromStore(name);
    if (existing) return existing;
    throw formatSupabaseError(error, 'Unable to create tag.');
  }

  await refreshTagsAndDispatch();
  return mapTagRow(data as TagRow);
}

export async function updateTagInStore(id: string, updates: { name?: string; color?: string }): Promise<Tag> {
  const tags = await ensureTagsLoaded();
  const current = tags.find(tag => tag.id === id);
  if (!current) {
    throw new Error('Tag not found.');
  }

  const hasNameUpdate = typeof updates.name === 'string';
  const hasColorUpdate = Object.prototype.hasOwnProperty.call(updates, 'color');
  const nextName = hasNameUpdate ? normalizeName(updates.name ?? '') : current.name;

  if (!nextName) {
    throw new Error('Tag name is required.');
  }

  const duplicate = tags.find(tag => tag.id !== id && normalizeTagNameKey(tag.name) === normalizeTagNameKey(nextName));
  if (duplicate) {
    throw new Error(`Tag "${nextName}" already exists.`);
  }

  const { data, error } = await supabase
    .from('tags')
    .update({
      name: nextName,
      color: hasColorUpdate ? (normalizeColor(updates.color) ?? null) : current.color ?? null,
    })
    .eq('id', id)
    .select('id,name,color,created_at,updated_at')
    .single();

  if (error) throw formatSupabaseError(error, 'Unable to update tag.');

  await refreshTagsAndDispatch({ alsoIssues: true, alsoLibraryResolutions: true });
  return mapTagRow(data as TagRow);
}

export async function deleteTagInStore(id: string): Promise<void> {
  const [issueRows, resolutionRows] = await Promise.all([
    fetchIssueRowsFromSupabase(),
    fetchResolutionRowsFromSupabase(),
  ]);

  const affectedIssues = issueRows.filter(row => (row.tags ?? []).includes(id));
  const affectedResolutions = resolutionRows.filter(row => (row.tags ?? []).includes(id));

  for (const row of affectedIssues) {
    const nextTags = (row.tags ?? []).filter(tagId => tagId !== id);
    const { error } = await supabase
      .from('issues')
      .update({ tags: nextTags })
      .eq('id', row.id);

    if (error) throw formatSupabaseError(error, 'Unable to remove deleted tag from issues.');
  }

  for (const row of affectedResolutions) {
    const nextTags = (row.tags ?? []).filter(tagId => tagId !== id);
    const { error } = await supabase
      .from('resolutions')
      .update({ tags: nextTags })
      .eq('id', row.id);

    if (error) throw formatSupabaseError(error, 'Unable to remove deleted tag from resolutions.');
  }

  const { error } = await supabase
    .from('tags')
    .delete()
    .eq('id', id);

  if (error) throw formatSupabaseError(error, 'Unable to delete tag.');

  await refreshTagsAndDispatch({ alsoIssues: affectedIssues.length > 0, alsoLibraryResolutions: affectedResolutions.length > 0 });
}

export async function getAllIssuesFromStore(): Promise<Issue[]> {
  return fetchIssuesFromSupabase();
}

export async function getIssueByIdFromStore(id: string): Promise<Issue | undefined> {
  const cached = issuesCache.find(issue => issue.id === id);
  if (cached) return cached;
  return fetchIssueFromSupabase(id);
}

export async function addIssueToStore(newIssue: Omit<Issue, 'id' | 'createdAt'>): Promise<Issue> {
  const payload = await toIssueInsertRow(newIssue);

  const { data, error } = await supabase
    .from('issues')
    .insert(payload)
    .select('id')
    .single();

  if (error) throw formatSupabaseError(error, 'Unable to create issue.');

  await refreshIssuesAndDispatch();
  const created = await fetchIssueFromSupabase((data as { id: string }).id);
  if (!created) {
    throw new Error('Issue was created but could not be reloaded.');
  }
  return created;
}

export async function updateIssueInStore(id: string, updates: Partial<Issue>): Promise<Issue | undefined> {
  const current = await getIssueByIdFromStore(id);
  if (!current) return undefined;

  const payload = await toIssueUpdateRow(current, updates);
  const { error } = await supabase
    .from('issues')
    .update(payload)
    .eq('id', id);

  if (error) throw formatSupabaseError(error, 'Unable to update issue.');

  await refreshIssuesAndDispatch();
  return fetchIssueFromSupabase(id);
}

export async function deleteIssueFromStore(id: string): Promise<boolean> {
  const current = await getIssueByIdFromStore(id);
  if (!current) return false;

  const rows = await fetchIssueRowsFromSupabase();
  const dependentRows = rows.filter(row => row.master_incident_id === id);

  for (const row of dependentRows) {
    const { error } = await supabase
      .from('issues')
      .update({
        master_incident_id: null,
        relationship_type: null,
        linked_at: null,
      })
      .eq('id', row.id);

    if (error) throw formatSupabaseError(error, 'Unable to clear linked issues before delete.');
  }

  const { error } = await supabase
    .from('issues')
    .delete()
    .eq('id', id);

  if (error) throw formatSupabaseError(error, 'Unable to delete issue.');

  await refreshIssuesAndDispatch();
  return true;
}

export async function listLibraryResolutions(): Promise<Resolution[]> {
  const [tags, rows, issues] = await Promise.all([
    fetchTagsFromSupabase(),
    fetchResolutionRowsFromSupabase(),
    fetchIssueRowsFromSupabase(),
  ]);

  const tagMap = new Map(tags.map(tag => [tag.id, tag]));
  const issueTitleById = new Map(issues.map(issue => [issue.id, issue.title]));
  libraryResolutionsCache = rows.map(row => {
    const resolution = mapResolutionRow(row, tagMap);
    if (row.issue_id) {
      return {
        ...resolution,
        sourceType: 'issue' as const,
        sourceIssueId: row.issue_id,
        sourceIssueTitle: issueTitleById.get(row.issue_id) ?? 'Issue',
      };
    }

    return {
      ...resolution,
      sourceType: 'library' as const,
    };
  });
  libraryResolutionsLoaded = true;
  return [...libraryResolutionsCache];
}

export async function getResolutionById(id: string): Promise<Resolution | undefined> {
  const [{ data, error }, tags, issues] = await Promise.all([
    supabase
      .from('resolutions')
      .select('*')
      .eq('id', id)
      .maybeSingle(),
    fetchTagsFromSupabase(),
    fetchIssueRowsFromSupabase(),
  ]);

  if (error) throw formatSupabaseError(error, 'Unable to load resolution.');
  if (!data) return undefined;

  const row = data as ResolutionRow;
  const tagMap = new Map(tags.map(tag => [tag.id, tag]));
  const issueTitleById = new Map(issues.map(issue => [issue.id, issue.title]));
  const resolution = mapResolutionRow(row, tagMap);

  if (row.issue_id) {
    return {
      ...resolution,
      sourceType: 'issue',
      sourceIssueId: row.issue_id,
      sourceIssueTitle: issueTitleById.get(row.issue_id) ?? 'Issue',
    };
  }

  return {
    ...resolution,
    sourceType: 'library',
  };
}

export async function createLibraryResolution(resolution: Omit<Resolution, 'id'>): Promise<Resolution> {
  const payload = await toResolutionInsertRow(null, resolution);

  const { data, error } = await supabase
    .from('resolutions')
    .insert(payload)
    .select('*')
    .single();

  if (error) throw formatSupabaseError(error, 'Unable to create library resolution.');

  await refreshLibraryResolutionsAndDispatch();
  const tags = await ensureTagsLoaded();
  return mapResolutionRow(data as ResolutionRow, new Map(tags.map(tag => [tag.id, tag])));
}

export async function updateLibraryResolution(id: string, updates: Partial<Resolution>): Promise<Resolution | undefined> {
  const current = (await ensureLibraryResolutionsLoaded()).find(resolution => resolution.id === id);
  if (!current) return undefined;

  const payload = await toResolutionUpdateRow({ ...current, issueId: null }, { ...updates, issueId: null });
  const { data, error } = await supabase
    .from('resolutions')
    .update(payload)
    .eq('id', id)
    .is('issue_id', null)
    .select('*')
    .maybeSingle();

  if (error) throw formatSupabaseError(error, 'Unable to update library resolution.');
  if (!data) return undefined;

  await refreshLibraryResolutionsAndDispatch();
  const tags = await ensureTagsLoaded();
  return mapResolutionRow(data as ResolutionRow, new Map(tags.map(tag => [tag.id, tag])));
}

export async function deleteLibraryResolution(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('resolutions')
    .delete()
    .eq('id', id)
    .is('issue_id', null);

  if (error) throw formatSupabaseError(error, 'Unable to delete library resolution.');

  await refreshLibraryResolutionsAndDispatch();
  return true;
}

export async function listIssueResolutions(issueId: string): Promise<Resolution[]> {
  const tags = await ensureTagsLoaded();
  const rows = await fetchIssueResolutionRowsFromSupabase(issueId);
  const tagMap = new Map(tags.map(tag => [tag.id, tag]));
  return rows.map(row => mapResolutionRow(row, tagMap));
}

export async function addIssueResolution(issueId: string, resolution: Omit<Resolution, 'id'>): Promise<Resolution> {
  const payload = await toResolutionInsertRow(issueId, resolution);

  const { data, error } = await supabase
    .from('resolutions')
    .insert(payload)
    .select('*')
    .single();

  if (error) throw formatSupabaseError(error, 'Unable to add issue resolution.');

  await refreshIssuesAndDispatch();
  const tags = await ensureTagsLoaded();
  return mapResolutionRow(data as ResolutionRow, new Map(tags.map(tag => [tag.id, tag])));
}

export async function updateIssueResolution(id: string, updates: Partial<Resolution>): Promise<Resolution | undefined> {
  const { data: currentRow, error: currentError } = await supabase
    .from('resolutions')
    .select('*')
    .eq('id', id)
    .not('issue_id', 'is', null)
    .maybeSingle();

  if (currentError) throw formatSupabaseError(currentError, 'Unable to load issue resolution.');
  if (!currentRow) return undefined;

  const tags = await ensureTagsLoaded();
  const current = mapResolutionRow(currentRow as ResolutionRow, new Map(tags.map(tag => [tag.id, tag])));
  const payload = await toResolutionUpdateRow(current, updates);

  const { data, error } = await supabase
    .from('resolutions')
    .update(payload)
    .eq('id', id)
    .not('issue_id', 'is', null)
    .select('*')
    .maybeSingle();

  if (error) throw formatSupabaseError(error, 'Unable to update issue resolution.');
  if (!data) return undefined;

  await refreshIssuesAndDispatch();
  return mapResolutionRow(data as ResolutionRow, new Map(tags.map(tag => [tag.id, tag])));
}

export async function deleteIssueResolution(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('resolutions')
    .delete()
    .eq('id', id)
    .not('issue_id', 'is', null);

  if (error) throw formatSupabaseError(error, 'Unable to delete issue resolution.');

  await refreshIssuesAndDispatch();
  return true;
}

export async function addResolutionToStore(issueId: string, resolution: Omit<Resolution, 'id'>): Promise<Issue | undefined> {
  await addIssueResolution(issueId, resolution);
  return fetchIssueFromSupabase(issueId);
}

export async function updateResolutionInStore(
  issueId: string,
  resolutionId: string,
  updates: Partial<Resolution>,
): Promise<Issue | undefined> {
  const updated = await updateIssueResolution(resolutionId, updates);
  if (!updated) return undefined;
  return fetchIssueFromSupabase(issueId);
}

export async function deleteResolutionFromStore(issueId: string, resolutionId: string): Promise<Issue | undefined> {
  const deleted = await deleteIssueResolution(resolutionId);
  if (!deleted) return undefined;
  return fetchIssueFromSupabase(issueId);
}

export async function incrementIssueReferenceCount(issueId: string, _resolutionId?: string): Promise<Issue | undefined> {
  const current = await getIssueByIdFromStore(issueId);
  if (!current) return undefined;

  const { error } = await supabase
    .from('issues')
    .update({
      reference_count: (current.referenceCount ?? 0) + 1,
    })
    .eq('id', issueId);

  if (error) throw formatSupabaseError(error, 'Unable to update issue reference count.');

  await refreshIssuesAndDispatch();
  return fetchIssueFromSupabase(issueId);
}

export async function promoteIssueToMaster(issueId: string): Promise<Issue | undefined> {
  return updateIssueInStore(issueId, { isMasterIncident: true });
}

export async function demoteIssueFromMaster(issueId: string): Promise<Issue | undefined> {
  const rows = await fetchIssueRowsFromSupabase();
  const dependents = rows.filter(row => row.master_incident_id === issueId);

  for (const row of dependents) {
    const { error } = await supabase
      .from('issues')
      .update({
        master_incident_id: null,
        relationship_type: null,
        linked_at: null,
      })
      .eq('id', row.id);

    if (error) throw formatSupabaseError(error, 'Unable to demote master incident.');
  }

  return updateIssueInStore(issueId, {
    isMasterIncident: false,
    linkedIncidentCount: 0,
    lastLinkedAt: undefined,
  });
}

export async function linkIssueToMasterInStore(
  sourceId: string,
  masterId: string,
  type: RelationshipType,
): Promise<IssueRelationship | undefined> {
  const source = await getIssueByIdFromStore(sourceId);
  const master = await getIssueByIdFromStore(masterId);
  if (!source || !master) return undefined;

  const linkedAt = nowIso();
  const { error } = await supabase
    .from('issues')
    .update({
      master_incident_id: masterId,
      relationship_type: type,
      linked_at: linkedAt,
    })
    .eq('id', sourceId);

  if (error) throw formatSupabaseError(error, 'Unable to link issue to master incident.');

  if (!master.isMasterIncident) {
    const { error: promoteError } = await supabase
      .from('issues')
      .update({ is_master_incident: true })
      .eq('id', masterId);

    if (promoteError) throw formatSupabaseError(promoteError, 'Unable to promote master incident.');
  }

  await refreshIssuesAndDispatch();
  return {
    sourceId,
    masterId,
    type,
    linkedAt,
  };
}

export async function unlinkIssueInStore(sourceId: string): Promise<boolean> {
  const current = await getIssueByIdFromStore(sourceId);
  if (!current || !current.masterIncidentId) return false;

  const { error } = await supabase
    .from('issues')
    .update({
      master_incident_id: null,
      relationship_type: null,
      linked_at: null,
    })
    .eq('id', sourceId);

  if (error) throw formatSupabaseError(error, 'Unable to unlink issue.');

  await refreshIssuesAndDispatch();
  return true;
}

export async function getRelationshipsForMasterFromStore(masterId: string): Promise<IssueRelationship[]> {
  const rows = await fetchIssueRowsFromSupabase();
  return rows
    .filter(row => row.master_incident_id === masterId)
    .map(row => ({
      sourceId: row.id,
      masterId,
      type: row.relationship_type ?? undefined,
      linkedAt: row.linked_at ?? undefined,
    }))
    .filter((relationship): relationship is IssueRelationship => Boolean(relationship.type));
}

export async function getRelationshipForSourceFromStore(sourceId: string): Promise<IssueRelationship | undefined> {
  const row = await fetchIssueRowByIdFromSupabase(sourceId);
  if (!row || !row.master_incident_id || !row.relationship_type) return undefined;

  return {
    sourceId,
    masterId: row.master_incident_id,
    type: row.relationship_type,
    linkedAt: row.linked_at ?? undefined,
  };
}
