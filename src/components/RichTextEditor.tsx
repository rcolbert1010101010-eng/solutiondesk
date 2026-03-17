import React, { useEffect, useMemo, useRef, useState } from 'react';
import DOMPurify from 'dompurify';

interface RichTextEditorProps {
  valueHtml: string;
  onChangeHtml: (html: string) => void;
  onChangeText?: (text: string) => void;
  placeholder?: string;
}

interface FormatState {
  bold: boolean;
  italic: boolean;
  underline: boolean;
}

const MAX_IMAGE_BYTES = Math.round(1.5 * 1024 * 1024);
const BLOCK_TAGS = new Set([
  'address', 'article', 'aside', 'blockquote', 'div', 'dl', 'fieldset', 'figcaption', 'figure',
  'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'hr', 'li', 'main', 'nav',
  'ol', 'p', 'pre', 'section', 'table', 'tbody', 'td', 'tfoot', 'th', 'thead', 'tr', 'ul'
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

    const isBlock = BLOCK_TAGS.has(tag);
    if (isBlock) flushLine();

    Array.from(element.childNodes).forEach(walk);

    if (isBlock) flushLine();
  };

  Array.from(doc.body.childNodes).forEach(walk);
  flushLine();

  return lines.join('\n').trim();
}

function normalizeEditorHtml(html: string): string {
  const trimmed = (html ?? '').trim();
  if (!trimmed || trimmed === '<br>' || trimmed === '<p><br></p>') {
    return '<p></p>';
  }
  return trimmed;
}

function hasMeaningfulContent(html: string): boolean {
  if (/<img\b/i.test(html)) return true;
  return stripHtmlToText(html).trim().length > 0;
}

function isSelectionInside(editor: HTMLDivElement): boolean {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return false;
  const range = selection.getRangeAt(0);
  const container = range.commonAncestorContainer;
  return editor.contains(container);
}

function insertImageAtCaret(editor: HTMLDivElement, dataUrl: string): void {
  const selection = window.getSelection();
  const image = document.createElement('img');
  image.src = dataUrl;
  image.alt = 'pasted image';
  image.className = 'max-w-full h-auto rounded-md border border-slate-200 dark:border-zinc-700 my-2';

  if (!selection || selection.rangeCount === 0 || !isSelectionInside(editor)) {
    editor.appendChild(image);
    return;
  }

  const range = selection.getRangeAt(0);
  range.deleteContents();
  range.insertNode(image);

  range.setStartAfter(image);
  range.setEndAfter(image);
  selection.removeAllRanges();
  selection.addRange(range);
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  valueHtml,
  onChangeHtml,
  onChangeText,
  placeholder = 'Write here...'
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [message, setMessage] = useState('');
  const [formatState, setFormatState] = useState<FormatState>({
    bold: false,
    italic: false,
    underline: false,
  });

  const emitChange = () => {
    const editor = editorRef.current;
    if (!editor) return;
    const html = normalizeEditorHtml(editor.innerHTML);
    onChangeHtml(html);
    onChangeText?.(stripHtmlToText(html));
  };

  const updateFormatState = () => {
    const editor = editorRef.current;
    if (!editor) return;

    const active = isSelectionInside(editor);
    if (!active) {
      setFormatState({ bold: false, italic: false, underline: false });
      return;
    }

    setFormatState({
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline'),
    });
  };

  const runCommand = (command: string, value?: string) => {
    const editor = editorRef.current;
    if (!editor) return;

    editor.focus();
    document.execCommand(command, false, value);
    emitChange();
    updateFormatState();
  };

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const normalizedTarget = normalizeEditorHtml(valueHtml);
    const normalizedCurrent = normalizeEditorHtml(editor.innerHTML);
    if (normalizedTarget === normalizedCurrent) return;

    editor.innerHTML = normalizedTarget;
  }, [valueHtml]);

  useEffect(() => {
    const onSelectionChange = () => updateFormatState();
    document.addEventListener('selectionchange', onSelectionChange);
    return () => document.removeEventListener('selectionchange', onSelectionChange);
  }, []);

  const handlePaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
    const editor = editorRef.current;
    if (!editor) return;

    const items = Array.from(event.clipboardData?.items ?? []);
    const imageItem = items.find(item => item.type.startsWith('image/'));
    if (!imageItem) return;

    const blob = imageItem.getAsFile();
    if (!blob) return;

    event.preventDefault();
    if (blob.size > MAX_IMAGE_BYTES) {
      setMessage('Image too large to embed');
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => setMessage('Unable to read pasted image');
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
      if (!dataUrl) {
        setMessage('Unable to read pasted image');
        return;
      }

      editor.focus();
      insertImageAtCaret(editor, dataUrl);
      setMessage('');
      emitChange();
      updateFormatState();
    };

    reader.readAsDataURL(blob);
  };

  const showPlaceholder = useMemo(() => !hasMeaningfulContent(valueHtml), [valueHtml]);

  const toolbarBase = 'h-8 px-2 rounded-md border text-xs transition-colors';
  const toolbarInactive = 'border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800';
  const toolbarActive = 'border-amber-500/50 bg-amber-500/10 text-amber-500';

  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-1.5">
        <button
          type="button"
          className={`${toolbarBase} ${formatState.bold ? toolbarActive : toolbarInactive}`}
          onMouseDown={e => { e.preventDefault(); runCommand('bold'); }}
          title="Bold"
        >
          B
        </button>
        <button
          type="button"
          className={`${toolbarBase} ${formatState.italic ? toolbarActive : toolbarInactive}`}
          onMouseDown={e => { e.preventDefault(); runCommand('italic'); }}
          title="Italic"
        >
          I
        </button>
        <button
          type="button"
          className={`${toolbarBase} ${formatState.underline ? toolbarActive : toolbarInactive}`}
          onMouseDown={e => { e.preventDefault(); runCommand('underline'); }}
          title="Underline"
        >
          U
        </button>
        <button
          type="button"
          className={`${toolbarBase} ${toolbarInactive}`}
          onMouseDown={e => { e.preventDefault(); runCommand('insertUnorderedList'); }}
          title="Bullet list"
        >
          • List
        </button>
        <button
          type="button"
          className={`${toolbarBase} ${toolbarInactive}`}
          onMouseDown={e => { e.preventDefault(); runCommand('insertOrderedList'); }}
          title="Numbered list"
        >
          1. List
        </button>
        <button
          type="button"
          className={`${toolbarBase} ${toolbarInactive}`}
          onMouseDown={e => {
            e.preventDefault();
            const url = window.prompt('Enter URL');
            if (!url) return;
            runCommand('createLink', url.trim());
          }}
          title="Insert link"
        >
          Link
        </button>
        <button
          type="button"
          className={`${toolbarBase} ${toolbarInactive}`}
          onMouseDown={e => {
            e.preventDefault();
            runCommand('removeFormat');
            runCommand('unlink');
          }}
          title="Clear formatting"
        >
          Clear
        </button>
      </div>

      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        className="min-h-[140px] rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-amber-500/20"
        onInput={() => {
          emitChange();
          updateFormatState();
        }}
        onBlur={emitChange}
        onKeyUp={updateFormatState}
        onMouseUp={updateFormatState}
        onPaste={handlePaste}
      />

      <p className="text-xs mt-1 text-slate-500 dark:text-zinc-500">Tip: You can paste screenshots directly (Ctrl+V).</p>
      {message && <p className="text-xs mt-1 text-red-500 dark:text-red-400">{message}</p>}
      {showPlaceholder && (
        <p className="text-xs mt-1 text-slate-400 dark:text-zinc-600">{placeholder}</p>
      )}
    </div>
  );
};

interface SanitizedHtmlContentProps {
  html?: string;
  className?: string;
}

export const SanitizedHtmlContent: React.FC<SanitizedHtmlContentProps> = ({ html, className }) => {
  const safeHtml = useMemo(
    () => DOMPurify.sanitize(html ?? '', {
      USE_PROFILES: { html: true },
      ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|data:image\/)/i,
    }),
    [html]
  );

  if (!safeHtml.trim()) return null;

  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: safeHtml }}
    />
  );
};
