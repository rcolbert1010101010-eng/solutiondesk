
import { supabase } from './supabaseClient';
import type { Issue, IssueRelationship, RelationshipType, Resolution, Severity, Status, Tag } from '../types';
import { htmlToPlainText, plainTextToHtml } from './richText';

export const TAGS_STORAGE_KEY = 'resolution_desk_tags';
export const ISSUES_STORAGE_KEY = 'resolution_desk_issues';
export const RELATIONSHIPS_STORAGE_KEY = 'resolution_desk_relationships';
export const TAGS_CHANGED_EVENT = 'resolution_desk_tags_changed';
export const ISSUES_CHANGED_EVENT = 'resolution_desk_issues_changed';

const LEGACY_STORAGE_KEYS = [
  TAGS_STORAGE_KEY,
  ISSUES_STORAGE_KEY,
  RELATIONSHIPS_STORAGE_KEY,
  'issues_db',
] as const;

const HEX_COLOR_REGEX = /^#[0-9a-fA-F]{6}$/;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface TagRow {
  id: string;
  name: string;
  color: string | null;
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
  resolution: Resolution | null;
  resolutions: Resolution[] | null;
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
  resolutions?: Resolution[];
  resolution?: Resolution;
  isMasterIncident?: boolean;
  masterIncidentId?: string;
  linkedIncidentCount?: number;
  lastLinkedAt?: string;
  referenceCount?: number;
  confidenceScore?: number;
}

function toIssueRowPayload(input: Partial<Issue> | any): Record<string, any> {
  return {
    title: input.title ?? '',
    description_html: ('descriptionHtml' in input ? input.descriptionHtml : input.description_html) ?? null,
    description_text: ('descriptionText' in input ? input.descriptionText : input.description_text) ?? null,
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

let bootstrapPromise: Promise<void> | null = null;
let tagsCache: Tag[] = [];
let issuesCache: Issue[] = [];
let tagsLoaded = false;
let issuesLoaded = false;

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

function formatSupabaseError(error: unknown, fallback: string): Error {
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

function createResolutionId(): string {
  return `RES-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function normalizeResolutionContent(resolution: Resolution): Resolution {
  const normalized = { ...resolution };
  const timestamp = nowIso();

  if (!normalized.id) {
    normalized.id = createResolutionId();
  }
  if (!normalized.createdAt) {
    normalized.createdAt = normalized.resolvedAt ?? timestamp;
  }
  if (!normalized.updatedAt) {
    normalized.updatedAt = normalized.createdAt ?? timestamp;
  }

  if (normalized.notes && !normalized.notesText) {
    normalized.notesText = htmlToPlainText(normalized.notes);
  } else if (!normalized.notes && normalized.notesText) {
    normalized.notes = plainTextToHtml(normalized.notesText);
  }

  return normalized;
}

function normalizeResolutionList(resolutions?: Resolution[] | null, fallback?: Resolution | null): Resolution[] {
  const source = Array.isArray(resolutions)
    ? resolutions
    : fallback
      ? [fallback]
      : [];

  return source.map(normalizeResolutionContent);
}

function normalizeSingleResolution(resolution?: Resolution | null, resolutions?: Resolution[] | null): Resolution | undefined {
  if (resolution) return normalizeResolutionContent(resolution);
  const normalized = normalizeResolutionList(resolutions);
  return normalized[0];
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
function mapIssueRow(row: IssueRow, tagsById: Map<string, Tag>, rows: IssueRow[]): Issue {
  const { counts, lastLinkedAt } = buildRelationshipStats(rows);
  const descriptions = normalizeDescriptionFields({
    descriptionText: row.description_text,
    descriptionHtml: row.description_html,
  });
  const resolutions = normalizeResolutionList(row.resolutions, row.resolution);

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
    tags: (row.tags ?? [])
      .map(tagId => tagsById.get(tagId)?.name)
      .filter((tagName): tagName is string => Boolean(tagName)),
    resolution: normalizeSingleResolution(row.resolution, resolutions),
    resolutions,
    isMasterIncident: Boolean(row.is_master_incident || (counts.get(row.id) ?? 0) > 0),
    masterIncidentId: row.master_incident_id ?? undefined,
    linkedIncidentCount: counts.get(row.id) ?? 0,
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

async function fetchIssuesFromSupabase(): Promise<Issue[]> {
  const [rows, tags] = await Promise.all([
    fetchIssueRowsFromSupabase(),
    fetchTagsFromSupabase(),
  ]);
  const tagMap = new Map(tags.map(tag => [tag.id, tag]));
  issuesCache = rows.map(row => mapIssueRow(row, tagMap, rows));
  issuesLoaded = true;
  return [...issuesCache];
}

async function ensureTagsLoaded(): Promise<Tag[]> {
  if (tagsLoaded) return [...tagsCache];
  return fetchTagsFromSupabase();
}

async function ensureIssuesLoaded(): Promise<Issue[]> {
  if (issuesLoaded) return [...issuesCache];
  return fetchIssuesFromSupabase();
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
        updatedAt: candidate.updatedAt ?? timestamp,
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
      const resolutions = normalizeResolutionList(issue.resolutions, issue.resolution);

      return {
        ...issue,
        ...descriptions,
        systemAffected: issue.systemAffected ?? '',
        severity: normalizeSeverity(issue.severity),
        status: normalizeStatus(issue.status),
        tags: Array.isArray(issue.tags) ? Array.from(new Set(issue.tags.map(tag => normalizeName(tag)).filter(Boolean))) : [],
        resolution: normalizeSingleResolution(issue.resolution, resolutions),
        resolutions,
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
    masterIssue.isMasterIncident = true;
    masterIssue.lastLinkedAt = linkedAt;
  }

  return Array.from(byId.values());
}
function mergeLegacyTags(tags: Tag[], issues: Issue[]): Tag[] {
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
  }

  return sortTags(Array.from(merged.values()));
}

async function migrateLegacyLocalStorageToSupabase(): Promise<void> {
  if (typeof window === 'undefined') return;

  const [tagCountResult, issueCountResult] = await Promise.all([
    supabase.from('tags').select('id', { count: 'exact', head: true }),
    supabase.from('issues').select('id', { count: 'exact', head: true }),
  ]);

  if (tagCountResult.error) throw tagCountResult.error;
  if (issueCountResult.error) throw issueCountResult.error;

  const tagCount = tagCountResult.count ?? 0;
  const issueCount = issueCountResult.count ?? 0;

  if (tagCount > 0 || issueCount > 0) {
    clearLegacyLocalStorage();
    return;
  }

  const legacyRelationships = parseLegacyRelationships(window.localStorage.getItem(RELATIONSHIPS_STORAGE_KEY));
  const legacyIssues = applyLegacyRelationships(
    parseLegacyIssues(window.localStorage.getItem(ISSUES_STORAGE_KEY)),
    legacyRelationships,
  );
  const legacyTags = mergeLegacyTags(parseLegacyTags(window.localStorage.getItem(TAGS_STORAGE_KEY)), legacyIssues);

  if (legacyIssues.length === 0 && legacyTags.length === 0) {
    return;
  }

  const idMap = new Map<string, string>();
  for (const issue of legacyIssues) {
    idMap.set(issue.id, isUuid(issue.id) ? issue.id : createUuid());
  }

  const migratedTags: TagRow[] = legacyTags.map(tag => ({
    id: isUuid(tag.id) ? tag.id : createUuid(),
    name: tag.name,
    color: tag.color ?? null,
    created_at: tag.createdAt ?? nowIso(),
    updated_at: tag.updatedAt ?? tag.createdAt ?? nowIso(),
  }));

  const tagIdByName = new Map(migratedTags.map(tag => [normalizeTagNameKey(tag.name), tag.id]));

  const migratedIssues: IssueRow[] = legacyIssues.map(issue => {
    const descriptions = normalizeDescriptionFields({
      description: issue.description,
      descriptionText: issue.descriptionText,
      descriptionHtml: issue.descriptionHtml,
    });
    const resolutions = normalizeResolutionList(issue.resolutions, issue.resolution);
    const migratedId = idMap.get(issue.id) ?? createUuid();

    return {
      id: migratedId,
      legacy_id: issue.id,
      title: issue.title,
      description_html: descriptions.descriptionHtml,
      description_text: descriptions.descriptionText,
      system_affected: issue.systemAffected ?? '',
      status: normalizeStatus(issue.status),
      severity: normalizeSeverity(issue.severity),
      confidence: null,
      assignee: issue.assignee ?? null,
      tags: (issue.tags ?? [])
        .map(tagName => tagIdByName.get(normalizeTagNameKey(tagName)))
        .filter((tagId): tagId is string => Boolean(tagId)),
      resolution: normalizeSingleResolution(issue.resolution, resolutions) ?? null,
      resolutions,
      is_master_incident: Boolean(issue.isMasterIncident),
      master_incident_id: issue.masterIncidentId ? (idMap.get(issue.masterIncidentId) ?? null) : null,
      relationship_type: null,
      linked_at: null,
      linked_incident_count: issue.linkedIncidentCount ?? 0,
      last_linked_at: issue.lastLinkedAt ?? null,
      reference_count: issue.referenceCount ?? 0,
      confidence_score: issue.confidenceScore ?? null,
      created_at: issue.createdAt ?? nowIso(),
      updated_at: issue.updatedAt ?? issue.createdAt ?? nowIso(),
    };
  });

  for (const issue of legacyIssues) {
    if (!issue.masterIncidentId) continue;
    const migratedId = idMap.get(issue.id);
    const migratedMasterId = idMap.get(issue.masterIncidentId);
    if (!migratedId || !migratedMasterId) continue;

    const target = migratedIssues.find(row => row.id === migratedId);
    if (!target) continue;

    target.master_incident_id = migratedMasterId;
    target.linked_at = issue.updatedAt ?? issue.createdAt ?? nowIso();
  }

  for (const relationship of legacyRelationships) {
    const sourceId = relationship.sourceId ?? relationship.source_issue_id;
    const masterId = relationship.masterId ?? relationship.master_issue_id;
    const type = relationship.type ?? relationship.relationship_type;
    const linkedAt = relationship.linkedAt ?? relationship.linked_at ?? nowIso();
    if (!sourceId || !masterId || !type) continue;

    const migratedSourceId = idMap.get(sourceId);
    const migratedMasterId = idMap.get(masterId);
    if (!migratedSourceId || !migratedMasterId) continue;

    const target = migratedIssues.find(row => row.id === migratedSourceId);
    if (!target) continue;

    target.master_incident_id = migratedMasterId;
    target.relationship_type = type;
    target.linked_at = linkedAt;
  }

  if (migratedTags.length > 0) {
    const { error } = await supabase.from('tags').insert(migratedTags);
    if (error) throw error;
  }

  if (migratedIssues.length > 0) {
    const { error } = await supabase.from('issues').insert(migratedIssues);
    if (error) throw error;
  }

  clearLegacyLocalStorage();
  console.info('SolutionDesk localStorage data migrated to Supabase.');
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

async function resolveTagIds(tagNames?: string[]): Promise<string[]> {
  if (!tagNames || tagNames.length === 0) return [];

  const tags = await ensureTagsLoaded();
  const tagMap = new Map(tags.map(tag => [normalizeTagNameKey(tag.name), tag.id]));
  const resolved = tagNames
    .map(tagName => tagMap.get(normalizeTagNameKey(tagName)))
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
  const resolutions = normalizeResolutionList(merged.resolutions, merged.resolution);

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
    resolutions,
    resolution: normalizeSingleResolution(merged.resolution, resolutions),
    isMasterIncident: Boolean(merged.isMasterIncident),
    masterIncidentId: merged.masterIncidentId,
    linkedIncidentCount: merged.linkedIncidentCount,
    lastLinkedAt: merged.lastLinkedAt,
    referenceCount: merged.referenceCount,
    confidenceScore: merged.confidenceScore,
  };
}
async function toIssueInsertRow(issue: Omit<Issue, 'id' | 'createdAt'>): Promise<Omit<IssueRow, 'id' | 'created_at' | 'updated_at'>> {
  const normalized = toIssueWriteShape(issue);
  if (!normalized.title) {
    throw new Error('Issue title is required.');
  }

  return toIssueRowPayload({
    ...normalized,
    tags: await resolveTagIds(normalized.tags),
    confidence: null,
    legacyId: null,
  }) as Omit<IssueRow, 'id' | 'created_at' | 'updated_at'>;
}

async function toIssueUpdateRow(current: Issue, updates: Partial<Issue>): Promise<Partial<IssueRow>> {
  const normalized = toIssueWriteShape(current, updates);

  return toIssueRowPayload({
    ...normalized,
    tags: await resolveTagIds(normalized.tags),
  }) as Partial<IssueRow>;
}

async function refreshTagsAndDispatch(alsoIssues = false): Promise<void> {
  await fetchTagsFromSupabase();
  dispatchWindowEvent(TAGS_CHANGED_EVENT);
  if (alsoIssues) {
    await fetchIssuesFromSupabase();
    dispatchWindowEvent(ISSUES_CHANGED_EVENT);
  }
}

async function refreshIssuesAndDispatch(): Promise<void> {
  await fetchIssuesFromSupabase();
  dispatchWindowEvent(ISSUES_CHANGED_EVENT);
}

export async function listTagsFromStore(): Promise<Tag[]> {
  return fetchTagsFromSupabase();
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
    throw new Error(`Tag "${name}" already exists.`);
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

  if (error) throw formatSupabaseError(error, 'Unable to create tag.');

  await refreshTagsAndDispatch(false);
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

  await refreshTagsAndDispatch(current.name !== nextName);
  return mapTagRow(data as TagRow);
}

export async function deleteTagInStore(id: string): Promise<void> {
  const rows = await fetchIssueRowsFromSupabase();
  const affected = rows.filter(row => (row.tags ?? []).includes(id));

  for (const row of affected) {
    const nextTags = (row.tags ?? []).filter(tagId => tagId !== id);
    const { error } = await supabase
      .from('issues')
      .update({ tags: nextTags })
      .eq('id', row.id);

    if (error) throw formatSupabaseError(error, 'Unable to remove deleted tag from issues.');
  }

  const { error } = await supabase
    .from('tags')
    .delete()
    .eq('id', id);

  if (error) throw formatSupabaseError(error, 'Unable to delete tag.');

  await refreshTagsAndDispatch(affected.length > 0);
}
export async function getAllIssuesFromStore(): Promise<Issue[]> {
  return fetchIssuesFromSupabase();
}

export async function getIssueByIdFromStore(id: string): Promise<Issue | undefined> {
  const issues = await ensureIssuesLoaded();
  const cached = issues.find(issue => issue.id === id);
  if (cached) return cached;

  const refreshed = await fetchIssuesFromSupabase();
  return refreshed.find(issue => issue.id === id);
}

export async function addIssueToStore(newIssue: Omit<Issue, 'id' | 'createdAt'>): Promise<Issue> {
  const payload = await toIssueInsertRow(newIssue);

  const { data, error } = await supabase
    .from('issues')
    .insert(payload)
    .select('*')
    .single();

  if (error) throw formatSupabaseError(error, 'Unable to create issue.');

  await refreshIssuesAndDispatch();
  const issue = issuesCache.find(item => item.id === (data as IssueRow).id);
  if (!issue) {
    throw new Error('Issue was created but could not be reloaded.');
  }
  return issue;
}

export async function updateIssueInStore(id: string, updates: Partial<Issue>): Promise<Issue | undefined> {
  const current = await getIssueByIdFromStore(id);
  if (!current) return undefined;

  const payload = await toIssueUpdateRow(current, updates);
  const { data, error } = await supabase
    .from('issues')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw formatSupabaseError(error, 'Unable to update issue.');

  await refreshIssuesAndDispatch();
  return issuesCache.find(item => item.id === (data as IssueRow).id);
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

export async function addResolutionToStore(issueId: string, resolution: Omit<Resolution, 'id'>): Promise<Issue | undefined> {
  const current = await getIssueByIdFromStore(issueId);
  if (!current) return undefined;

  const nextResolutions = [...(current.resolutions ?? []), normalizeResolutionContent(resolution)];
  return updateIssueInStore(issueId, {
    resolutions: nextResolutions,
    resolution: nextResolutions[0],
  });
}

export async function updateResolutionInStore(
  issueId: string,
  resolutionId: string,
  updates: Partial<Resolution>,
): Promise<Issue | undefined> {
  const current = await getIssueByIdFromStore(issueId);
  if (!current || !Array.isArray(current.resolutions)) return undefined;

  let found = false;
  const nextResolutions = current.resolutions.map(resolution => {
    if (resolution.id !== resolutionId) return resolution;
    found = true;
    return normalizeResolutionContent({
      ...resolution,
      ...updates,
      id: resolution.id,
      createdAt: resolution.createdAt ?? nowIso(),
      updatedAt: nowIso(),
    });
  });

  if (!found) {
    return undefined;
  }

  return updateIssueInStore(issueId, {
    resolutions: nextResolutions,
    resolution: nextResolutions[0],
  });
}

export async function deleteResolutionFromStore(issueId: string, resolutionId: string): Promise<Issue | undefined> {
  const current = await getIssueByIdFromStore(issueId);
  if (!current || !Array.isArray(current.resolutions)) return undefined;

  const nextResolutions = current.resolutions.filter(resolution => resolution.id !== resolutionId);
  if (nextResolutions.length === current.resolutions.length) {
    return undefined;
  }

  return updateIssueInStore(issueId, {
    resolutions: nextResolutions,
    resolution: nextResolutions[0],
  });
}

export async function incrementIssueReferenceCount(issueId: string, resolutionId?: string): Promise<Issue | undefined> {
  const current = await getIssueByIdFromStore(issueId);
  if (!current) return undefined;

  const nextResolutions = Array.isArray(current.resolutions)
    ? current.resolutions.map(resolution => (
        resolution.id === resolutionId
          ? { ...resolution, referenceCount: (resolution.referenceCount ?? 0) + 1 }
          : resolution
      ))
    : current.resolutions;

  return updateIssueInStore(issueId, {
    referenceCount: (current.referenceCount ?? 0) + 1,
    resolutions: nextResolutions,
    resolution: normalizeSingleResolution(current.resolution, nextResolutions),
  });
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
  const rows = await fetchIssueRowsFromSupabase();
  const row = rows.find(item => item.id === sourceId && item.master_incident_id);
  if (!row || !row.master_incident_id || !row.relationship_type) return undefined;

  return {
    sourceId,
    masterId: row.master_incident_id,
    type: row.relationship_type,
    linkedAt: row.linked_at ?? undefined,
  };
}
