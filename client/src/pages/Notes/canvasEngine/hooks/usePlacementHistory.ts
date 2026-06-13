import { useCallback, useEffect, useRef } from 'react';
import { buildLayoutHistoryEntry } from '../placementService';
import type {
  BlockBoxLayout,
  LayoutHistoryEntry,
} from '../runtimeLayout';
import type { NoteBlock } from '../runtimeDataTypes';

type RuntimeHistoryEntry =
  | { type: 'layout'; entry: LayoutHistoryEntry }
  | { type: 'createdBlock'; block: NoteBlock }
  | { type: 'trashedBlock'; block: NoteBlock };

export interface UsePlacementHistoryOptions {
  applyLayoutDrafts: (layouts: Record<string, BlockBoxLayout>) => void;
  persistLayoutSnapshot: (layouts: Record<string, BlockBoxLayout>) => void;
  restoreBlockForHistory?: (block: NoteBlock, options?: { silent?: boolean }) => Promise<NoteBlock | null>;
  target?: Window | null;
  trashBlockForHistory?: (blockId: string, options?: { silent?: boolean }) => Promise<boolean>;
}

function isEditableDomTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest('input, textarea, select, [contenteditable="true"]'));
}

export function usePlacementHistory({
  applyLayoutDrafts,
  persistLayoutSnapshot,
  restoreBlockForHistory,
  target = typeof window !== 'undefined' ? window : null,
  trashBlockForHistory,
}: UsePlacementHistoryOptions) {
  const undoStackRef = useRef<RuntimeHistoryEntry[]>([]);
  const redoStackRef = useRef<RuntimeHistoryEntry[]>([]);
  const historyBusyRef = useRef(false);

  const pushHistoryEntry = useCallback((entry: RuntimeHistoryEntry) => {
    undoStackRef.current = [...undoStackRef.current, entry].slice(-80);
    redoStackRef.current = [];
  }, []);

  const pushLayoutHistory = useCallback((
    before: Record<string, BlockBoxLayout>,
    after: Record<string, BlockBoxLayout>,
  ) => {
    const entry = buildLayoutHistoryEntry(before, after);
    if (!entry) return;
    pushHistoryEntry({ type: 'layout', entry });
  }, [pushHistoryEntry]);

  const pushCreatedBlockHistory = useCallback((block: NoteBlock | null | undefined) => {
    if (!block) return;
    pushHistoryEntry({ type: 'createdBlock', block });
  }, [pushHistoryEntry]);

  const pushTrashedBlockHistory = useCallback((block: NoteBlock | null | undefined) => {
    if (!block) return;
    pushHistoryEntry({ type: 'trashedBlock', block });
  }, [pushHistoryEntry]);

  const undoRuntimeHistory = useCallback(async () => {
    if (historyBusyRef.current) return false;
    const entry = undoStackRef.current.pop();
    if (!entry) return false;

    historyBusyRef.current = true;
    try {
      if (entry.type === 'layout') {
        redoStackRef.current.push(entry);
        applyLayoutDrafts(entry.entry.before);
        persistLayoutSnapshot(entry.entry.before);
        return true;
      }

      if (entry.type === 'createdBlock') {
        if (!trashBlockForHistory) {
          undoStackRef.current.push(entry);
          return false;
        }

        const removed = await trashBlockForHistory(entry.block.id, { silent: true });
        if (!removed) {
          undoStackRef.current.push(entry);
          return false;
        }
        redoStackRef.current.push(entry);
        return true;
      }

      if (!restoreBlockForHistory) {
        undoStackRef.current.push(entry);
        return false;
      }

      const restored = await restoreBlockForHistory(entry.block, { silent: true });
      if (!restored) {
        undoStackRef.current.push(entry);
        return false;
      }
      redoStackRef.current.push({ type: 'trashedBlock', block: restored });
      return true;
    } finally {
      historyBusyRef.current = false;
    }
  }, [applyLayoutDrafts, persistLayoutSnapshot, restoreBlockForHistory, trashBlockForHistory]);

  const redoRuntimeHistory = useCallback(async () => {
    if (historyBusyRef.current) return false;
    const entry = redoStackRef.current.pop();
    if (!entry) return false;

    historyBusyRef.current = true;
    try {
      if (entry.type === 'layout') {
        undoStackRef.current.push(entry);
        applyLayoutDrafts(entry.entry.after);
        persistLayoutSnapshot(entry.entry.after);
        return true;
      }

      if (entry.type === 'createdBlock') {
        if (!restoreBlockForHistory) {
          redoStackRef.current.push(entry);
          return false;
        }

        const restored = await restoreBlockForHistory(entry.block, { silent: true });
        if (!restored) {
          redoStackRef.current.push(entry);
          return false;
        }
        undoStackRef.current.push({ type: 'createdBlock', block: restored });
        return true;
      }

      if (!trashBlockForHistory) {
        redoStackRef.current.push(entry);
        return false;
      }

      const removed = await trashBlockForHistory(entry.block.id, { silent: true });
      if (!removed) {
        redoStackRef.current.push(entry);
        return false;
      }
      undoStackRef.current.push(entry);
      return true;
    } finally {
      historyBusyRef.current = false;
    }
  }, [applyLayoutDrafts, persistLayoutSnapshot, restoreBlockForHistory, trashBlockForHistory]);

  useEffect(() => {
    if (!target) return undefined;

    const handleRuntimeHistoryKeys = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || isEditableDomTarget(event.target)) return;
      const key = event.key.toLowerCase();
      if (key === 'z' && !event.shiftKey) {
        if (undoStackRef.current.length === 0) return;
        event.preventDefault();
        void undoRuntimeHistory();
        return;
      }
      if (key === 'y' || (key === 'z' && event.shiftKey)) {
        if (redoStackRef.current.length === 0) return;
        event.preventDefault();
        void redoRuntimeHistory();
      }
    };

    target.addEventListener('keydown', handleRuntimeHistoryKeys);
    return () => target.removeEventListener('keydown', handleRuntimeHistoryKeys);
  }, [redoRuntimeHistory, target, undoRuntimeHistory]);

  return {
    pushCreatedBlockHistory,
    pushLayoutHistory,
    pushTrashedBlockHistory,
    undoRuntimeHistory,
    redoRuntimeHistory,
  };
}
