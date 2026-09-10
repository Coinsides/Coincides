import type { CoordinateContract } from '../placementContractService';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  applyRuntimeHistoryRedo,
  applyRuntimeHistoryUndo,
  getRuntimeHistoryKeyboardIntent,
  isManagedTextFlowHistoryTarget,
  type RuntimeHistoryEntry,
  type RuntimeHistoryKeyboardIntent,
} from '../historyService';
import { buildLayoutHistoryEntry } from '../placementService';
import type { BlockBoxLayout } from '../runtimeLayout';
import type { NoteBlock } from '../runtimeDataTypes';
import type { TableStructuredPayload } from '../types';

export interface UsePlacementHistoryOptions {
  noteId?: string;
  generation?: number;
  beforeHistoryBoundary?: () => boolean | void;
  coordinateContract?: CoordinateContract;
  applyLayoutDrafts: (layouts: Record<string, BlockBoxLayout>) => void;
  persistLayoutSnapshot: (layouts: Record<string, BlockBoxLayout>) => void | boolean | Promise<void | boolean>;
  persistStructuredObject?: (objectId: string, payload: TableStructuredPayload) => Promise<boolean> | boolean;
  restoreBlockForHistory?: (block: NoteBlock, options?: { silent?: boolean }) => Promise<NoteBlock | null>;
  target?: Window | null;
  trashBlockForHistory?: (blockId: string, options?: { silent?: boolean }) => Promise<boolean>;
}

interface RuntimeHistoryScope {
  noteId?: string;
  generation: number;
  active: boolean;
  undo: RuntimeHistoryEntry[];
  redo: RuntimeHistoryEntry[];
  operationTail: Promise<void>;
  replaying: boolean;
}

export function usePlacementHistory({
  noteId,
  generation = 0,
  beforeHistoryBoundary,
  applyLayoutDrafts,
  coordinateContract,
  persistLayoutSnapshot,
  persistStructuredObject,
  restoreBlockForHistory,
  target = typeof window !== 'undefined' ? window : null,
  trashBlockForHistory,
}: UsePlacementHistoryOptions) {
  const scopeRef = useRef<RuntimeHistoryScope | null>(null);
  if (!scopeRef.current || scopeRef.current.noteId !== noteId || scopeRef.current.generation !== generation) {
    if (scopeRef.current) scopeRef.current.active = false;
    scopeRef.current = {
      noteId,
      generation,
      active: true,
      undo: [],
      redo: [],
      operationTail: Promise.resolve(),
      replaying: false,
    };
  }
  const scope = scopeRef.current;
  const [replayingScope, setReplayingScope] = useState<RuntimeHistoryScope | null>(null);
  const isCurrentScope = useCallback(() => scope.active && scopeRef.current === scope, [scope]);
  const isReplaying = useCallback(() => isCurrentScope() && scope.replaying, [isCurrentScope, scope]);

  useEffect(() => {
    scope.active = true;
    return () => { scope.active = false; };
  }, [scope]);

  // Typing finalization, blur persistence and replay share this lane. A new Note
  // gets a new lane, so an old unresolved save cannot hold its history hostage.
  const enqueueRuntimeHistoryOperation = useCallback((operation: () => Promise<boolean>): Promise<boolean> => {
    const result = scope.operationTail.then(async () => {
      if (!isCurrentScope()) return false;
      try {
        const succeeded = await operation();
        return succeeded && isCurrentScope();
      } catch {
        return false;
      }
    });
    scope.operationTail = result.then(() => undefined);
    return result;
  }, [isCurrentScope, scope]);

  const whenHistoryIdle = useCallback(async () => {
    let observedTail: Promise<void>;
    do {
      observedTail = scope.operationTail;
      await observedTail;
    } while (isCurrentScope() && observedTail !== scope.operationTail);
    return isCurrentScope();
  }, [isCurrentScope, scope]);

  const sealRuntimeHistoryBoundary = useCallback(() => {
    if (!isCurrentScope()) return false;
    try {
      return beforeHistoryBoundary?.() !== false;
    } catch {
      return false;
    }
  }, [beforeHistoryBoundary, isCurrentScope]);

  const pushHistoryEntry = useCallback((entry: RuntimeHistoryEntry, options?: { skipBoundary?: boolean }) => {
    if (!isCurrentScope()) return false;
    if (!options?.skipBoundary && !sealRuntimeHistoryBoundary()) return false;
    scope.undo.push(entry);
    if (scope.undo.length > 80) scope.undo.shift();
    scope.redo = [];
    return true;
  }, [isCurrentScope, scope, sealRuntimeHistoryBoundary]);

  const pushLayoutHistory = useCallback((
    before: Record<string, BlockBoxLayout>,
    after: Record<string, BlockBoxLayout>,
  ) => {
    const entry = buildLayoutHistoryEntry(before, after, coordinateContract);
    if (!entry) return;
    pushHistoryEntry({ type: 'layout', entry });
  }, [coordinateContract, pushHistoryEntry]);

  const pushCreatedBlockHistory = useCallback((block: NoteBlock | null | undefined) => {
    if (block) pushHistoryEntry({ type: 'createdBlock', block });
  }, [pushHistoryEntry]);

  const pushTrashedBlockHistory = useCallback((block: NoteBlock | null | undefined) => {
    if (block) pushHistoryEntry({ type: 'trashedBlock', block });
  }, [pushHistoryEntry]);

  const pushStructuredMutationHistory = useCallback((
    objectId: string,
    before: TableStructuredPayload,
    after: TableStructuredPayload,
  ) => {
    pushHistoryEntry({ type: 'structuredMutation', objectId, before, after });
  }, [pushHistoryEntry]);

  const replayRuntimeHistory = useCallback((intent: RuntimeHistoryKeyboardIntent, skipBoundary = false) => {
    if (!skipBoundary && !sealRuntimeHistoryBoundary()) return Promise.resolve(false);
    return enqueueRuntimeHistoryOperation(async () => {
      const source = intent === 'undo' ? scope.undo : scope.redo;
      const entry = source[source.length - 1];
      if (!entry) return false;
      const apply = intent === 'undo' ? applyRuntimeHistoryUndo : applyRuntimeHistoryRedo;
      scope.replaying = true;
      setReplayingScope(scope);
      try {
        const appliedEntry = await apply(entry, {
          applyLayoutDrafts,
          persistLayoutSnapshot,
          persistStructuredObject,
          restoreBlockForHistory,
          trashBlockForHistory,
        });
        // Never remove the recovery entry before persistence succeeds. A rejection,
        // exception, stale Note response or intervening edit leaves it available.
        const currentSource = intent === 'undo' ? scope.undo : scope.redo;
        if (!appliedEntry || !isCurrentScope() || currentSource !== source || source[source.length - 1] !== entry) return false;
        source.pop();
        const destination = intent === 'undo' ? scope.redo : scope.undo;
        destination.push(appliedEntry);
        return true;
      } finally {
        scope.replaying = false;
        if (isCurrentScope()) setReplayingScope(null);
      }
    });
  }, [
    applyLayoutDrafts, enqueueRuntimeHistoryOperation, isCurrentScope, persistLayoutSnapshot,
    persistStructuredObject, restoreBlockForHistory, scope, sealRuntimeHistoryBoundary, trashBlockForHistory,
  ]);

  const undoRuntimeHistory = useCallback(() => replayRuntimeHistory('undo'), [replayRuntimeHistory]);
  const redoRuntimeHistory = useCallback(() => replayRuntimeHistory('redo'), [replayRuntimeHistory]);

  useEffect(() => {
    if (!target) return undefined;
    const handleRuntimeHistoryKeys = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      const intent = getRuntimeHistoryKeyboardIntent(event);
      if (!intent) return;
      const managed = isManagedTextFlowHistoryTarget(event.target);
      // Managed editors never fall through to a second native text undo stack,
      // including when the runtime history is empty or composition blocks a seal.
      if (managed) event.preventDefault();
      if (!sealRuntimeHistoryBoundary()) return;
      const entries = intent === 'undo' ? scope.undo : scope.redo;
      if (!managed && entries.length === 0) return;
      event.preventDefault();
      void replayRuntimeHistory(intent, true);
    };
    target.addEventListener('keydown', handleRuntimeHistoryKeys);
    return () => target.removeEventListener('keydown', handleRuntimeHistoryKeys);
  }, [replayRuntimeHistory, scope, sealRuntimeHistoryBoundary, target]);

  return {
    pushHistoryEntry,
    pushCreatedBlockHistory,
    pushLayoutHistory,
    pushStructuredMutationHistory,
    pushTrashedBlockHistory,
    undoRuntimeHistory,
    redoRuntimeHistory,
    enqueueRuntimeHistoryOperation,
    whenHistoryIdle,
    sealRuntimeHistoryBoundary,
    isReplaying,
    historyReplaying: replayingScope === scope,
  };
}
