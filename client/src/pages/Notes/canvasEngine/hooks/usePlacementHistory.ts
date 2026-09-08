import type { CoordinateContract } from '../placementContractService';
import { useCallback, useEffect, useRef } from 'react';
import {
  applyRuntimeHistoryRedo,
  applyRuntimeHistoryUndo,
  getRuntimeHistoryKeyboardIntent,
  type RuntimeHistoryEntry,
} from '../historyService';
import { buildLayoutHistoryEntry } from '../placementService';
import type { BlockBoxLayout } from '../runtimeLayout';
import type { NoteBlock } from '../runtimeDataTypes';
import type { TableStructuredPayload } from '../types';

export interface UsePlacementHistoryOptions {
  coordinateContract?: CoordinateContract;
  applyLayoutDrafts: (layouts: Record<string, BlockBoxLayout>) => void;
  persistLayoutSnapshot: (layouts: Record<string, BlockBoxLayout>) => void;
  persistStructuredObject?: (objectId: string, payload: TableStructuredPayload) => Promise<boolean> | boolean;
  restoreBlockForHistory?: (block: NoteBlock, options?: { silent?: boolean }) => Promise<NoteBlock | null>;
  target?: Window | null;
  trashBlockForHistory?: (blockId: string, options?: { silent?: boolean }) => Promise<boolean>;
}

export function usePlacementHistory({
  applyLayoutDrafts,
  coordinateContract,
  persistLayoutSnapshot,
  persistStructuredObject,
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
    const entry = buildLayoutHistoryEntry(before, after, coordinateContract);
    if (!entry) return;
    pushHistoryEntry({ type: 'layout', entry });
  }, [coordinateContract, pushHistoryEntry]);

  const pushCreatedBlockHistory = useCallback((block: NoteBlock | null | undefined) => {
    if (!block) return;
    pushHistoryEntry({ type: 'createdBlock', block });
  }, [pushHistoryEntry]);

  const pushTrashedBlockHistory = useCallback((block: NoteBlock | null | undefined) => {
    if (!block) return;
    pushHistoryEntry({ type: 'trashedBlock', block });
  }, [pushHistoryEntry]);

  const pushStructuredMutationHistory = useCallback((
    objectId: string,
    before: TableStructuredPayload,
    after: TableStructuredPayload,
  ) => {
    pushHistoryEntry({
      type: 'structuredMutation',
      objectId,
      before,
      after,
    });
  }, [pushHistoryEntry]);

  const undoRuntimeHistory = useCallback(async () => {
    if (historyBusyRef.current) return false;
    const entry = undoStackRef.current.pop();
    if (!entry) return false;

    historyBusyRef.current = true;
    try {
      const redoEntry = await applyRuntimeHistoryUndo(entry, {
        applyLayoutDrafts,
        persistLayoutSnapshot,
        persistStructuredObject,
        restoreBlockForHistory,
        trashBlockForHistory,
      });
      if (!redoEntry) {
        undoStackRef.current.push(entry);
        return false;
      }
      redoStackRef.current.push(redoEntry);
      return true;
    } finally {
      historyBusyRef.current = false;
    }
  }, [applyLayoutDrafts, persistLayoutSnapshot, persistStructuredObject, restoreBlockForHistory, trashBlockForHistory]);

  const redoRuntimeHistory = useCallback(async () => {
    if (historyBusyRef.current) return false;
    const entry = redoStackRef.current.pop();
    if (!entry) return false;

    historyBusyRef.current = true;
    try {
      const undoEntry = await applyRuntimeHistoryRedo(entry, {
        applyLayoutDrafts,
        persistLayoutSnapshot,
        persistStructuredObject,
        restoreBlockForHistory,
        trashBlockForHistory,
      });
      if (!undoEntry) {
        redoStackRef.current.push(entry);
        return false;
      }
      undoStackRef.current.push(undoEntry);
      return true;
    } finally {
      historyBusyRef.current = false;
    }
  }, [applyLayoutDrafts, persistLayoutSnapshot, persistStructuredObject, restoreBlockForHistory, trashBlockForHistory]);

  useEffect(() => {
    if (!target) return undefined;

    const handleRuntimeHistoryKeys = (event: KeyboardEvent) => {
      const intent = getRuntimeHistoryKeyboardIntent(event);
      if (intent === 'undo') {
        if (undoStackRef.current.length === 0) return;
        event.preventDefault();
        void undoRuntimeHistory();
        return;
      }
      if (intent === 'redo') {
        if (redoStackRef.current.length === 0) return;
        event.preventDefault();
        void redoRuntimeHistory();
      }
    };

    target.addEventListener('keydown', handleRuntimeHistoryKeys);
    return () => target.removeEventListener('keydown', handleRuntimeHistoryKeys);
  }, [redoRuntimeHistory, target, undoRuntimeHistory]);

  return {
    pushHistoryEntry,
    pushCreatedBlockHistory,
    pushLayoutHistory,
    pushStructuredMutationHistory,
    pushTrashedBlockHistory,
    undoRuntimeHistory,
    redoRuntimeHistory,
  };
}
