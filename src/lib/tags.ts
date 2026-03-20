import type { Tag } from '../types';
import {
  createTagInStore,
  deleteTagInStore,
  getTagByNameFromStore,
  listTagsFromStore,
  normalizeTagNameKey,
  TAGS_CHANGED_EVENT,
  TAGS_STORAGE_KEY,
  updateTagInStore,
} from './supabaseData';

export { TAGS_CHANGED_EVENT, TAGS_STORAGE_KEY };

export function normalizeTagName(name: string): string {
  return normalizeTagNameKey(name);
}

export async function listTags(): Promise<Tag[]> {
  return listTagsFromStore();
}

export async function getTagByName(name: string): Promise<Tag | undefined> {
  return getTagByNameFromStore(name);
}

export async function createTag(input: { name: string; color?: string }): Promise<Tag> {
  return createTagInStore(input);
}

export async function updateTag(id: string, updates: { name?: string; color?: string }): Promise<Tag> {
  return updateTagInStore(id, updates);
}

export async function deleteTag(id: string): Promise<void> {
  return deleteTagInStore(id);
}
