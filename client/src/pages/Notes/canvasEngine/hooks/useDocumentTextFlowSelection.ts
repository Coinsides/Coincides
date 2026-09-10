import { createContext, useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { NoteBlock, TextBlockContentV1 } from '../runtimeDataTypes';
import type { FlowPoint } from '../textFlowSelection';
import {
  documentFlowSelectionText, orderedDocumentFlowSelection, replaceDocumentFlowSelection,
  type DocumentFlowBlock, type DocumentFlowEdit, type DocumentFlowPoint, type DocumentFlowSelection,
} from '../documentTextFlowSelection';

interface Editor {
  flow: TextBlockContentV1;
  editable: boolean;
  focus: (point: DocumentFlowPoint) => void;
  anchor: () => FlowPoint | null;
}

interface Options {
  noteId: string;
  visibleBlocks: readonly NoteBlock[];
  disabled?: boolean;
  applyDocumentEdit?: (changes: DocumentFlowEdit[]) => Promise<boolean>;
}

/** A Note owns the range; mounted editors only contribute their live flow and caret. */
export function useDocumentTextFlowSelection(options: Options) {
  const latest = useRef(options);
  latest.current = options;
  const token = useMemo(() => ({}), [options.noteId]);
  const editors = useMemo(() => new Map<string, Editor>(), [token]);
  const range = useMemo(() => ({ current: null as DocumentFlowSelection | null }), [token]);
  const traversing = useMemo(() => ({ current: false }), [token]);
  const pendingFocus = useMemo(() => ({ current: null as DocumentFlowPoint | null }), [token]);
  const [revision, render] = useState(0);
  const clear = useCallback(() => {
    if (!range.current) return;
    range.current = null;
    render((value) => value + 1);
  }, [range]);
  const blocks = (): DocumentFlowBlock[] => latest.current.visibleBlocks.map((block) => {
    const editor = editors.get(block.id);
    return { block, flow: editor?.flow ?? { textflow_version: 'TextBlockContentV1', units: [], inline_structures: [], metadata: {} },
      editable: Boolean(editor?.editable) && !latest.current.disabled };
  });
  const focus = (point: DocumentFlowPoint) => {
    traversing.current = true;
    try { editors.get(point.blockId)?.focus(point); }
    finally { traversing.current = false; }
  };
  const select = (anchor: DocumentFlowPoint, focusPoint: DocumentFlowPoint) => {
    const selection = { anchor, focus: focusPoint };
    if (!latest.current.applyDocumentEdit || !orderedDocumentFlowSelection(blocks(), selection)) return false;
    if (anchor.blockId === focusPoint.blockId && anchor.unitId === focusPoint.unitId && anchor.offset === focusPoint.offset) {
      clear();
      focus(focusPoint);
      return true;
    }
    range.current = selection;
    render((value) => value + 1);
    focus(focusPoint);
    return true;
  };
  useLayoutEffect(() => {
    if (range.current && !orderedDocumentFlowSelection(blocks(), range.current)) clear();
    if (pendingFocus.current) {
      const point = pendingFocus.current;
      pendingFocus.current = null;
      focus(point);
    }
  });
  const register = useCallback((id: string, editor: Editor | null) => {
    if (editor) editors.set(id, editor);
    else editors.delete(id);
  }, [editors]);

  // A normal click or a focus change outside selection traversal ends the range.
  useLayoutEffect(() => {
    const pointer = (event: PointerEvent) => {
      if (!event.shiftKey || !(event.target instanceof HTMLTextAreaElement)
        || !editors.has(event.target.dataset.blockId ?? '')) clear();
    };
    document.addEventListener('pointerdown', pointer, true);
    return () => document.removeEventListener('pointerdown', pointer, true);
  }, [clear, editors]);

  return {
    revision, selection: range.current, read: () => range.current, traversing, register, clear, select, focus,
    anchorFor: (blockId: string) => editors.get(blockId)?.anchor() ?? null,
    ordered: () => range.current ? orderedDocumentFlowSelection(blocks(), range.current) : null,
    text: () => range.current ? documentFlowSelectionText(blocks(), range.current) : '',
    replace(text: string, inputType = 'insertText') {
      if (!range.current || latest.current.disabled || !latest.current.applyDocumentEdit) return false;
      const replacement = replaceDocumentFlowSelection(blocks(), range.current, text, inputType);
      if (!replacement) { clear(); return false; }
      clear();
      pendingFocus.current = replacement.caret;
      // Restore after optimistic drafts render, never after a network round trip.
      void latest.current.applyDocumentEdit(replacement.changes);
      return true;
    },
  };
}

export const DocumentTextFlowSelectionContext = createContext<ReturnType<typeof useDocumentTextFlowSelection> | null>(null);
