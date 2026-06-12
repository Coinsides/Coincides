import { useCallback, useEffect, useRef } from 'react';
import { buildLayoutHistoryEntry } from '../placementService';
import type {
  BlockBoxLayout,
  LayoutHistoryEntry,
} from '../runtimeLayout';

export interface UsePlacementHistoryOptions {
  applyLayoutDrafts: (layouts: Record<string, BlockBoxLayout>) => void;
  persistLayoutSnapshot: (layouts: Record<string, BlockBoxLayout>) => void;
  target?: Window | null;
}

function isEditableDomTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest('input, textarea, select, [contenteditable="true"]'));
}

export function usePlacementHistory({
  applyLayoutDrafts,
  persistLayoutSnapshot,
  target = typeof window !== 'undefined' ? window : null,
}: UsePlacementHistoryOptions) {
  const layoutUndoStackRef = useRef<LayoutHistoryEntry[]>([]);
  const layoutRedoStackRef = useRef<LayoutHistoryEntry[]>([]);

  const pushLayoutHistory = useCallback((
    before: Record<string, BlockBoxLayout>,
    after: Record<string, BlockBoxLayout>,
  ) => {
    const entry = buildLayoutHistoryEntry(before, after);
    if (!entry) return;
    layoutUndoStackRef.current = [...layoutUndoStackRef.current, entry].slice(-60);
    layoutRedoStackRef.current = [];
  }, []);

  const undoLayoutHistory = useCallback(() => {
    const entry = layoutUndoStackRef.current.pop();
    if (!entry) return false;
    layoutRedoStackRef.current.push(entry);
    applyLayoutDrafts(entry.before);
    persistLayoutSnapshot(entry.before);
    return true;
  }, [applyLayoutDrafts, persistLayoutSnapshot]);

  const redoLayoutHistory = useCallback(() => {
    const entry = layoutRedoStackRef.current.pop();
    if (!entry) return false;
    layoutUndoStackRef.current.push(entry);
    applyLayoutDrafts(entry.after);
    persistLayoutSnapshot(entry.after);
    return true;
  }, [applyLayoutDrafts, persistLayoutSnapshot]);

  useEffect(() => {
    if (!target) return undefined;

    const handleLayoutHistoryKeys = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || isEditableDomTarget(event.target)) return;
      const key = event.key.toLowerCase();
      if (key === 'z' && !event.shiftKey) {
        if (!undoLayoutHistory()) return;
        event.preventDefault();
        return;
      }
      if (key === 'y' || (key === 'z' && event.shiftKey)) {
        if (!redoLayoutHistory()) return;
        event.preventDefault();
      }
    };

    target.addEventListener('keydown', handleLayoutHistoryKeys);
    return () => target.removeEventListener('keydown', handleLayoutHistoryKeys);
  }, [redoLayoutHistory, target, undoLayoutHistory]);

  return {
    pushLayoutHistory,
    undoLayoutHistory,
    redoLayoutHistory,
  };
}
