import React, { useEffect, useMemo, useRef, useState } from 'react';
import DOMPurify from 'dompurify';

interface RichTextEditorProps {
  valueHtml: string;
  onChangeHtml: (html: string) => void;
  onChangeText?: (text: string) => void;
  placeholder?: string;
}

const MAX_IMAGE_BYTES = Math.round(1.5 * 1024 * 1024);

export function stripHtmlToText(html: string): string {
  const source = (html ?? '').trim();
  if (!source) return '';

  if (typeof window !== 'undefined' && typeof window.DOMParser !== 'undefined') {
    const doc = new window.DOMParser().parseFromString(source, 'text/html');
    return (doc.body.textContent ?? '').replace(/\s+\n/g, '\n').trim();
  }

  return source.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
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

function insertImageAtCaret(editor: HTMLDivElement, dataUrl: string): void {
  const selection = window.getSelection();
  const image = document.createElement('img');
  image.src = dataUrl;
  image.alt = 'pasted image';
  image.className = 'max-w-full h-auto rounded-md border border-slate-200 dark:border-zinc-700 my-2';

  if (!selection || selection.rangeCount === 0) {
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

  const emitChange = () => {
    const editor = editorRef.current;
    if (!editor) return;
    const html = normalizeEditorHtml(editor.innerHTML);
    onChangeHtml(html);
    onChangeText?.(stripHtmlToText(html));
  };

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const normalizedTarget = normalizeEditorHtml(valueHtml);
    const normalizedCurrent = normalizeEditorHtml(editor.innerHTML);
    if (normalizedTarget === normalizedCurrent) return;

    editor.innerHTML = normalizedTarget;
  }, [valueHtml]);

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
    };

    reader.readAsDataURL(blob);
  };

  const showPlaceholder = useMemo(() => !hasMeaningfulContent(valueHtml), [valueHtml]);

  return (
    <div>
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        className="min-h-[140px] rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-amber-500/20"
        onInput={emitChange}
        onBlur={emitChange}
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
