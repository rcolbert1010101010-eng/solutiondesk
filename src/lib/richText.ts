import { Issue } from '../types';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function plainTextToHtml(text: string): string {
  const normalized = (text ?? '').trim();
  if (!normalized) return '<p></p>';

  const paragraphs = normalized.split(/\n{2,}/);
  return paragraphs
    .map(paragraph => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br />')}</p>`)
    .join('');
}

export function htmlToPlainText(html: string): string {
  const source = (html ?? '').trim();
  if (!source) return '';

  if (typeof window !== 'undefined' && typeof window.DOMParser !== 'undefined') {
    const doc = new window.DOMParser().parseFromString(source, 'text/html');
    return (doc.body.textContent ?? '').replace(/\s+\n/g, '\n').trim();
  }

  return source.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

export function getIssueDescriptionText(issue: Issue): string {
  return issue.descriptionText ?? issue.description ?? '';
}

export function getIssueDescriptionHtml(issue: Issue): string {
  if (issue.descriptionHtml && issue.descriptionHtml.trim()) {
    return issue.descriptionHtml;
  }
  return plainTextToHtml(getIssueDescriptionText(issue));
}
