import type { Tag } from '../types';
import { createTag, getTagByName, listTags, normalizeTagName } from './tags';

export type QuickTagMessageTone = 'info' | 'success' | 'error';

export interface QuickTagResult {
  availableTags: Tag[];
  selectedTagName?: string;
  message: string;
  tone: QuickTagMessageTone;
  clearInput: boolean;
}

export function findQuickTagMatch(input: string, availableTags: Tag[]): Tag | undefined {
  const normalized = normalizeTagName(input);
  if (!normalized) return undefined;
  return availableTags.find(tag => normalizeTagName(tag.name) === normalized);
}

export async function addOrSelectQuickTag(input: string, availableTags: Tag[]): Promise<QuickTagResult> {
  const duplicate = findQuickTagMatch(input, availableTags);
  if (duplicate) {
    return {
      availableTags,
      selectedTagName: duplicate.name,
      message: 'Tag already exists - selected it.',
      tone: 'info',
      clearInput: false,
    };
  }

  try {
    const created = await createTag({ name: input });
    const nextTags = await listTags();
    return {
      availableTags: nextTags,
      selectedTagName: created.name,
      message: 'Tag added and selected.',
      tone: 'success',
      clearInput: true,
    };
  } catch (error) {
    const existing = await getTagByName(input);
    if (existing) {
      const nextTags = await listTags();
      return {
        availableTags: nextTags,
        selectedTagName: existing.name,
        message: 'Tag already exists - selected it.',
        tone: 'info',
        clearInput: false,
      };
    }

    return {
      availableTags,
      message: error instanceof Error ? error.message : 'Unable to add tag.',
      tone: 'error',
      clearInput: false,
    };
  }
}
