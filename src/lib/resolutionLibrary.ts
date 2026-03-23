import { plainTextToHtml } from './richText';
import type { Resolution } from '../types';

const DATA_IMAGE_SRC_REGEX = /^data:image\/[a-z0-9.+-]+;base64,[a-z0-9+/=\s]+$/i;
const STEP_BLOCK_TAGS = new Set([
  'address', 'article', 'aside', 'blockquote', 'div', 'dl', 'fieldset', 'figcaption', 'figure',
  'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'hr', 'li', 'main', 'nav',
  'ol', 'p', 'pre', 'section', 'table', 'tbody', 'td', 'tfoot', 'th', 'thead', 'tr', 'ul',
]);

function isSafeDataImageSrc(src: string): boolean {
  return DATA_IMAGE_SRC_REGEX.test(src.trim());
}

function toImageToken(src: string): string {
  return `[img:${src}]`;
}

export function parseResolutionImageToken(line: string): string | null {
  const trimmed = line.trim();
  if (!trimmed.startsWith('[img:') || !trimmed.endsWith(']')) return null;
  const src = trimmed.slice(5, -1).trim();
  return isSafeDataImageSrc(src) ? src : null;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
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

export function normalizeResolutionStepLines(input: unknown): string[] {
  if (Array.isArray(input)) {
    return input
      .flatMap(item => toStepText(item).split(/\r?\n/))
      .map(item => item.trim())
      .filter(Boolean);
  }

  if (typeof input === 'string') {
    const lines = input
      .split(/\r?\n/)
      .map(item => item.trim())
      .filter(Boolean);
    if (lines.length > 1) return lines;
    const single = input.trim();
    return single ? [single] : [];
  }

  if (input && typeof input === 'object') {
    return Object.values(input as Record<string, unknown>)
      .flatMap(item => toStepText(item).split(/\r?\n/))
      .map(item => item.trim())
      .filter(Boolean);
  }

  return [];
}

export function stepsToText(steps?: unknown): string {
  return normalizeResolutionStepLines(steps).join('\n');
}

export function stepsHtmlToLines(html: string): string[] {
  const source = (html ?? '').trim();
  if (!source) return [];

  if (typeof window === 'undefined' || typeof window.DOMParser === 'undefined') {
    return source
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|li|h[1-6]|blockquote|pre|tr|td|th)>/gi, '\n')
      .replace(/<img[^>]*src=["']([^"']+)["'][^>]*>/gi, (_match, src) => (
        isSafeDataImageSrc(String(src)) ? `\n${toImageToken(String(src))}\n` : '\n'
      ))
      .replace(/<[^>]+>/g, '')
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(Boolean);
  }

  const doc = new window.DOMParser().parseFromString(source, 'text/html');
  const lines: string[] = [];
  let currentLine = '';

  const flushLine = () => {
    const normalized = currentLine
      .replace(/\u00a0/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (normalized) lines.push(normalized);
    currentLine = '';
  };

  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      currentLine += node.textContent ?? '';
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const element = node as HTMLElement;
    const tag = element.tagName.toLowerCase();

    if (tag === 'img') {
      const src = element.getAttribute('src') ?? '';
      if (isSafeDataImageSrc(src)) {
        flushLine();
        lines.push(toImageToken(src.trim()));
      }
      return;
    }

    if (tag === 'br') {
      flushLine();
      return;
    }

    const isBlock = STEP_BLOCK_TAGS.has(tag);
    if (isBlock) flushLine();
    Array.from(element.childNodes).forEach(walk);
    if (isBlock) flushLine();
  };

  Array.from(doc.body.childNodes).forEach(walk);
  flushLine();
  return lines;
}

export function stepsLinesToHtml(lines: string[]): string {
  if (lines.length === 0) return '<p></p>';

  const items = lines.map(line => {
    const imageSrc = parseResolutionImageToken(line);
    if (imageSrc) {
      return `<li><img src="${imageSrc}" alt="step image" /></li>`;
    }
    return `<li>${escapeHtml(line)}</li>`;
  });

  return `<ol>${items.join('')}</ol>`;
}

export function getResolutionStepsHtml(resolution: Pick<Resolution, 'steps' | 'stepsHtml'>, maxItems?: number): string {
  if (!maxItems && resolution.stepsHtml && resolution.stepsHtml.trim()) {
    return resolution.stepsHtml;
  }

  const lines = normalizeResolutionStepLines(resolution.steps);
  return stepsLinesToHtml(typeof maxItems === 'number' ? lines.slice(0, maxItems) : lines);
}

export function getResolutionTitle(resolution: Resolution): string {
  return resolution.title ?? resolution.summary ?? 'Resolution';
}

export function getResolutionUpdatedAt(resolution: Resolution): string {
  return resolution.updatedAt ?? resolution.createdAt ?? new Date().toISOString();
}

export function isLibraryResolution(resolution: Resolution): boolean {
  return resolution.sourceType !== 'issue';
}

export function getResolutionSourceLabel(resolution: Resolution): 'Library' | 'From Issue' {
  return isLibraryResolution(resolution) ? 'Library' : 'From Issue';
}

export function getResolutionNotesHtml(resolution: Resolution): string {
  if (resolution.notes && resolution.notes.trim()) {
    return resolution.notes;
  }

  return plainTextToHtml(resolution.notesText ?? '');
}

export function getResolutionDetailPath(resolution: Pick<Resolution, 'id'>): string | null {
  if (!resolution.id) return null;
  return `/resolutions/${resolution.id}`;
}

export function getResolutionEditPath(resolution: Resolution): string | null {
  if (!resolution.id) return null;

  if (isLibraryResolution(resolution)) {
    return `/resolution-library?edit=${encodeURIComponent(resolution.id)}`;
  }

  const issueId = resolution.sourceIssueId ?? resolution.issueId;
  if (!issueId) return null;
  return `/issues/${issueId}?editResolution=${encodeURIComponent(resolution.id)}`;
}

export function getResolutionPreviewText(resolution: Resolution): string {
  const steps = normalizeResolutionStepLines(resolution.steps);
  const notes = (resolution.notesText ?? '').trim();

  if (notes) {
    return notes;
  }

  if (steps.length > 0) {
    return steps.slice(0, 2).join(' ');
  }

  return resolution.sourceIssueTitle ?? '';
}

export function getResolutionSearchText(resolution: Resolution): string {
  return [
    getResolutionTitle(resolution),
    resolution.notesText ?? '',
    resolution.summary ?? '',
    resolution.sourceIssueTitle ?? '',
    ...normalizeResolutionStepLines(resolution.steps),
    ...(resolution.tags ?? []),
  ].join(' ').toLowerCase();
}
