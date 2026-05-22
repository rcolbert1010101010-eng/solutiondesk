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
 
const STRIP_BLOCK_TAGS = new Set([ 
  'address', 'article', 'aside', 'blockquote', 'div', 'dl', 'fieldset', 'figcaption', 'figure', 
  'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'hr', 'li', 'main', 'nav', 
  'ol', 'p', 'pre', 'section', 'table', 'tbody', 'td', 'tfoot', 'th', 'thead', 'tr', 'ul', 
]); 
 
export function stripHtmlToText(html: string): string { 
  const source = (html ?? '').trim(); 
  if (!source) return ''; 
 
  if (typeof window === 'undefined' || typeof window.DOMParser === 'undefined') { 
    return source 
      .replace(/<br\s*\/?>/gi, '\n') 
      .replace(/<\/\s*(p|div|li|ul|ol|h[1-6]|blockquote|pre|tr|td|th)\s*>/gi, '\n') 
      .replace(/<[^>]*>/g, ' ') 
      .replace(/\u00a0/g, ' ') 
      .replace(/[ \t]+\n/g, '\n') 
      .replace(/\n{3,}/g, '\n\n') 
      .replace(/[ \t]{2,}/g, ' ') 
      .trim(); 
  } 
 
  const doc = new window.DOMParser().parseFromString(source, 'text/html'); 
  const lines: string[] = []; 
  let currentLine = ''; 
 
  const flushLine = () => { 
    const line = currentLine 
      .replace(/\u00a0/g, ' ') 
      .replace(/[ \t]+/g, ' ') 
      .trim(); 
 
    if (line) lines.push(line); 
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
 
    if (tag === 'br') { 
      flushLine(); 
      return; 
    } 
 
    if (tag === 'img') { 
      flushLine(); 
      return; 
    } 
 
    const isBlock = STRIP_BLOCK_TAGS.has(tag); 
    if (isBlock) flushLine(); 
    Array.from(element.childNodes).forEach(walk); 
    if (isBlock) flushLine(); 
  }; 
 
  Array.from(doc.body.childNodes).forEach(walk); 
  flushLine(); 
 
  return lines.join('\n').trim(); 
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
