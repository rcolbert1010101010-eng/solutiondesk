import { Issue, Tag } from '../types';

export const TAGS_STORAGE_KEY = 'resolution_desk_tags';
export const TAGS_CHANGED_EVENT = 'resolution_desk_tags_changed';

const ISSUES_STORAGE_KEY = 'resolution_desk_issues';
const HEX_COLOR_REGEX = /^#[0-9a-fA-F]{6}$/;

const DEFAULT_TAGS: Array<{ id: string; name: string; color: string }> = [
  { id: 'tag-network', name: 'network', color: '#3B82F6' },
  { id: 'tag-database', name: 'database', color: '#A855F7' },
  { id: 'tag-authentication', name: 'authentication', color: '#F59E0B' },
  { id: 'tag-api', name: 'api', color: '#06B6D4' },
  { id: 'tag-permissions', name: 'permissions', color: '#F43F5E' },
  { id: 'tag-timeout', name: 'timeout', color: '#F97316' },
  { id: 'tag-deployment', name: 'deployment', color: '#10B981' },
];

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

function normalizeColor(color?: string): string | undefined {
  if (!color) return undefined;
  const value = color.trim();
  if (!value) return undefined;
  if (!HEX_COLOR_REGEX.test(value)) {
    throw new Error('Please provide a valid hex color (example: #3B82F6).');
  }
  return value.toUpperCase();
}

function createDefaultTags(): Tag[] {
  const timestamp = nowIso();
  return DEFAULT_TAGS.map(tag => ({
    ...tag,
    createdAt: timestamp,
    updatedAt: timestamp,
  }));
}

function dispatchTagsChanged(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(TAGS_CHANGED_EVENT));
  }
}

function writeTags(tags: Tag[]): void {
  localStorage.setItem(TAGS_STORAGE_KEY, JSON.stringify(tags));
}

function persistTags(tags: Tag[]): void {
  writeTags(tags);
  dispatchTagsChanged();
}

function persistTagsIfChanged(tags: Tag[], existingRaw?: string): void {
  const nextRaw = JSON.stringify(tags);
  if (existingRaw === nextRaw) return;
  localStorage.setItem(TAGS_STORAGE_KEY, JSON.stringify(tags));
  dispatchTagsChanged();
}

function generateTagId(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 24) || 'tag';
  return `tag-${slug}-${Math.random().toString(36).slice(2, 8)}`;
}

function migrateStoredTags(parsed: unknown): Tag[] | null {
  if (!Array.isArray(parsed)) return null;
  const timestamp = nowIso();

  const fromStrings = parsed.every(item => typeof item === 'string');
  if (fromStrings) {
    const seen = new Set<string>();
    const tags = (parsed as string[])
      .map(name => normalizeName(name))
      .filter(name => name.length > 0)
      .filter(name => {
        const key = name.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map(name => ({
        id: generateTagId(name),
        name,
        createdAt: timestamp,
        updatedAt: timestamp,
      }));
    return tags;
  }

  const seen = new Set<string>();
  const migrated: Tag[] = [];
  for (const item of parsed) {
    if (!item || typeof item !== 'object') continue;
    const candidate = item as Partial<Tag>;
    const name = normalizeName(candidate.name ?? '');
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const id = (candidate.id && candidate.id.trim()) ? candidate.id : generateTagId(name);
    const color = normalizeColor(candidate.color);
    migrated.push({
      id,
      name,
      color,
      createdAt: candidate.createdAt ?? timestamp,
      updatedAt: candidate.updatedAt ?? timestamp,
    });
  }

  return migrated;
}

function loadTags(): Tag[] {
  const stored = localStorage.getItem(TAGS_STORAGE_KEY);

  if (!stored || !stored.trim()) {
    const seeded = createDefaultTags();
    persistTags(seeded);
    return seeded;
  }

  try {
    const parsed = JSON.parse(stored);
    const migrated = migrateStoredTags(parsed);
    if (!migrated || migrated.length === 0) {
      const seeded = createDefaultTags();
      persistTags(seeded);
      return seeded;
    }
    persistTagsIfChanged(migrated, stored);
    return migrated;
  } catch {
    const seeded = createDefaultTags();
    persistTags(seeded);
    return seeded;
  }
}

function saveIssues(issues: Issue[]): void {
  localStorage.setItem(ISSUES_STORAGE_KEY, JSON.stringify(issues));
}

function cascadeIssueTags(oldName: string, newName?: string): void {
  const rawIssues = localStorage.getItem(ISSUES_STORAGE_KEY);
  if (!rawIssues) return;

  let issues: Issue[];
  try {
    issues = JSON.parse(rawIssues) as Issue[];
  } catch {
    return;
  }

  const from = oldName.toLowerCase();
  let changed = false;

  const updated = issues.map(issue => {
    if (!issue.tags || !Array.isArray(issue.tags) || issue.tags.length === 0) {
      return issue;
    }

    const nextTags = issue.tags
      .map(tag => {
        if (tag.toLowerCase() !== from) return tag;
        changed = true;
        return newName;
      })
      .filter((tag): tag is string => Boolean(tag));

    const deduped = Array.from(new Set(nextTags));
    if (deduped.length === issue.tags.length && deduped.every((tag, idx) => tag === issue.tags![idx])) {
      return issue;
    }

    return { ...issue, tags: deduped };
  });

  if (changed) {
    saveIssues(updated);
  }
}

export function listTags(): Tag[] {
  return [...loadTags()].sort((a, b) => a.name.localeCompare(b.name));
}

export function getTagByName(name: string): Tag | undefined {
  const key = normalizeName(name).toLowerCase();
  if (!key) return undefined;
  return listTags().find(tag => tag.name.toLowerCase() === key);
}

export function createTag(input: { name: string; color?: string }): Tag {
  const name = normalizeName(input.name);
  if (!name) {
    throw new Error('Tag name is required.');
  }

  const tags = loadTags();
  const duplicate = tags.find(tag => tag.name.toLowerCase() === name.toLowerCase());
  if (duplicate) {
    throw new Error(`Tag "${name}" already exists.`);
  }

  const timestamp = nowIso();
  const tag: Tag = {
    id: generateTagId(name),
    name,
    color: normalizeColor(input.color),
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  persistTags([...tags, tag]);
  return tag;
}

export function updateTag(id: string, updates: { name?: string; color?: string }): Tag {
  const tags = loadTags();
  const index = tags.findIndex(tag => tag.id === id);
  if (index === -1) {
    throw new Error('Tag not found.');
  }

  const current = tags[index];
  const hasNameUpdate = typeof updates.name === 'string';
  const hasColorUpdate = Object.prototype.hasOwnProperty.call(updates, 'color');

  const nextName = hasNameUpdate ? normalizeName(updates.name ?? '') : current.name;
  if (!nextName) {
    throw new Error('Tag name is required.');
  }

  const duplicate = tags.find(tag => tag.id !== id && tag.name.toLowerCase() === nextName.toLowerCase());
  if (duplicate) {
    throw new Error(`Tag "${nextName}" already exists.`);
  }

  const nextColor = hasColorUpdate ? normalizeColor(updates.color) : current.color;
  const updated: Tag = {
    ...current,
    name: nextName,
    color: nextColor,
    updatedAt: nowIso(),
  };

  tags[index] = updated;
  persistTags(tags);

  if (current.name !== nextName) {
    cascadeIssueTags(current.name, nextName);
  }

  return updated;
}

export function deleteTag(id: string): void {
  const tags = loadTags();
  const tag = tags.find(item => item.id === id);
  if (!tag) {
    throw new Error('Tag not found.');
  }

  persistTags(tags.filter(item => item.id !== id));
  cascadeIssueTags(tag.name);
}
