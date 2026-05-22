import React, { useEffect, useMemo, useRef, useState } from 'react';
import DOMPurify from 'dompurify'; 
import { stripHtmlToText } from '../lib/richText'; 

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
  bulletList: boolean; 
  orderedList: boolean; 
  codeBlock: boolean; 
  heading: 'p' | 'h1' | 'h2' | 'h3'; 
} 

const MAX_IMAGE_BYTES = Math.round(1.5 * 1024 * 1024); 

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

function getSelectedListItem(editor: HTMLDivElement): HTMLLIElement | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;

  const container = selection.getRangeAt(0).commonAncestorContainer;
  const element = container.nodeType === Node.ELEMENT_NODE
    ? container as Element
    : container.parentElement;

  if (!element || !editor.contains(element)) return null;

  const listItem = element.closest('li');
  if (!listItem || !editor.contains(listItem)) return null;

  return listItem;
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
    bulletList: false, 
    orderedList: false, 
    codeBlock: false, 
    heading: 'p', 
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
      setFormatState({ 
        bold: false, 
        italic: false, 
        underline: false, 
        bulletList: false, 
        orderedList: false, 
        codeBlock: false, 
        heading: 'p', 
      }); 
      return; 
    } 
 
    const selection = window.getSelection(); 
    const container = selection && selection.rangeCount > 0 ? selection.getRangeAt(0).commonAncestorContainer : null; 
    const containerElement = container 
      ? (container.nodeType === Node.ELEMENT_NODE ? (container as Element) : container.parentElement) 
      : null; 
    const withinEditor = containerElement ? editor.contains(containerElement) : false; 
    const nearestBlock = withinEditor ? containerElement?.closest('pre,h1,h2,h3,p') : null; 
    const headingCandidate = (nearestBlock?.tagName?.toLowerCase() ?? 'p') as FormatState['heading'] | 'pre'; 
    const codeBlock = withinEditor ? Boolean(containerElement?.closest('pre')) : false; 
 
    setFormatState({ 
      bold: document.queryCommandState('bold'), 
      italic: document.queryCommandState('italic'), 
      underline: document.queryCommandState('underline'), 
      bulletList: document.queryCommandState('insertUnorderedList'), 
      orderedList: document.queryCommandState('insertOrderedList'), 
      codeBlock, 
      heading: headingCandidate === 'h1' || headingCandidate === 'h2' || headingCandidate === 'h3' ? headingCandidate : 'p', 
    }); 
  }; 
 
  const runCommand = (command: string, value?: string) => { 
    const editor = editorRef.current; 
    if (!editor) return; 
 
    editor.focus(); 
    document.execCommand('styleWithCSS', false, 'false'); 
    document.execCommand(command, false, value); 
    emitChange(); 
    updateFormatState(); 
  }; 

  const runListCommand = (command: 'insertUnorderedList' | 'insertOrderedList') => {
    const editor = editorRef.current;
    if (!editor) return;

    editor.focus();
    document.execCommand('styleWithCSS', false, 'false');
    document.execCommand(command, false);
    emitChange();
    updateFormatState(); 
  }; 
 
  const applyBlockFormat = (tag: 'p' | 'h1' | 'h2' | 'h3' | 'pre') => { 
    const editor = editorRef.current; 
    if (!editor) return; 
 
    editor.focus(); 
    document.execCommand('formatBlock', false, tag); 
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

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Tab') return;

    const editor = editorRef.current;
    if (!editor) return;

    const listItem = getSelectedListItem(editor);
    if (!listItem) return;

    event.preventDefault();
    editor.focus();
    document.execCommand('styleWithCSS', false, 'false');
    document.execCommand(event.shiftKey ? 'outdent' : 'indent', false);
    emitChange();
    updateFormatState();
  };

  const showPlaceholder = useMemo(() => !hasMeaningfulContent(valueHtml), [valueHtml]);

  const toolbarBase = 'h-8 px-2 rounded-md border text-xs transition-colors';
  const toolbarInactive = 'border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800';
  const toolbarActive = 'border-amber-500/50 bg-amber-500/10 text-amber-500';

  return ( 
    <div> 
      <div className="mb-2 flex flex-wrap gap-1.5"> 
        <select 
          className="h-8 rounded-md border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 text-xs text-slate-600 dark:text-zinc-300" 
          value={formatState.codeBlock ? 'pre' : formatState.heading} 
          onChange={e => applyBlockFormat(e.target.value as 'p' | 'h1' | 'h2' | 'h3' | 'pre')} 
          title="Text style" 
        > 
          <option value="p">Normal</option> 
          <option value="h1">Heading 1</option> 
          <option value="h2">Heading 2</option> 
          <option value="h3">Heading 3</option> 
          <option value="pre">Code block</option> 
        </select> 
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
          className={`${toolbarBase} ${formatState.bulletList ? toolbarActive : toolbarInactive}`}
          onMouseDown={e => { e.preventDefault(); runListCommand('insertUnorderedList'); }}
          title="Bullet list"
        >
          • List
        </button>
        <button 
          type="button" 
          className={`${toolbarBase} ${formatState.orderedList ? toolbarActive : toolbarInactive}`} 
          onMouseDown={e => { e.preventDefault(); runListCommand('insertOrderedList'); }} 
          title="Numbered list" 
        > 
          1. List 
        </button> 
        <button 
          type="button" 
          className={`${toolbarBase} ${toolbarInactive}`} 
          onMouseDown={e => { e.preventDefault(); runCommand('indent'); }} 
          title="Indent (Tab)" 
        > 
          Indent 
        </button> 
        <button 
          type="button" 
          className={`${toolbarBase} ${toolbarInactive}`} 
          onMouseDown={e => { e.preventDefault(); runCommand('outdent'); }} 
          title="Outdent (Shift+Tab)" 
        > 
          Outdent 
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
        className="min-h-[140px] rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-amber-500/20 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:my-1 [&_a]:text-blue-500 [&_a]:underline"
        onInput={() => {
          emitChange();
          updateFormatState();
        }}
        onBlur={emitChange}
        onKeyDown={handleKeyDown}
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

