import { useCallback, useMemo, useRef } from 'react';
import { paperFreehandSavePayload } from '../freehandService';
import type { RuntimeHistoryEntry } from '../historyService';
import type { CanvasObject, CanvasPlacement } from '../types';
import type { PersistCanvasObjectInput } from './useNoteCanvasDataAdapter';

interface Options {
  noteId?: string;
  generation: number;
  objects: CanvasObject[];
  placements: CanvasPlacement[];
  persistCanvasObject: (input: PersistCanvasObjectInput) => Promise<boolean>;
  deleteCanvasObject: (objectId: string) => Promise<boolean>;
  boundary: () => boolean;
  pushHistoryEntry: (entry: RuntimeHistoryEntry, options?: { skipBoundary?: boolean }) => boolean;
  enqueueRuntimeHistoryOperation: (operation: () => Promise<boolean>) => Promise<boolean>;
}

/** Ink uses the same command lane and reversible entries as typing and layout. */
export function usePaperInkCommands(options: Options) {
  const latest = useRef(options);
  latest.current = options;
  const scope = useMemo(() => ({}), [options.noteId, options.generation]);
  const activeScope = useRef(scope);
  activeScope.current = scope;
  // Keep a confirmed snapshot available even when erase follows create before
  // React publishes the adapter's next render. This is not a history store.
  const snapshots = useMemo(() => new Map<string, PersistCanvasObjectInput | null>(), [scope]);

  const persist = useCallback(async (input: PersistCanvasObjectInput): Promise<boolean> => {
    if (input.canvasObject.kind !== 'freehand') return options.persistCanvasObject(input);
    if (activeScope.current !== scope || !options.boundary()) return false;
    const snapshot = structuredClone(input);
    return options.enqueueRuntimeHistoryOperation(async () => {
      if (activeScope.current !== scope) return false;
      const existing = latest.current.objects.some((object) => object.objectId === snapshot.canvasObject.objectId)
        || Boolean(snapshots.get(snapshot.canvasObject.objectId));
      const save = async () => {
        if (activeScope.current !== scope) return false;
        const saved = await latest.current.persistCanvasObject(snapshot);
        if (saved && activeScope.current === scope) snapshots.set(snapshot.canvasObject.objectId, snapshot);
        return saved;
      };
      const remove = async () => {
        if (activeScope.current !== scope) return false;
        const removed = await latest.current.deleteCanvasObject(snapshot.canvasObject.objectId);
        if (removed && activeScope.current === scope) snapshots.set(snapshot.canvasObject.objectId, null);
        return removed;
      };
      if (!await save()) return false;
      // Generic placement updates keep their existing semantics; only a new
      // stroke adds the create/delete entry required by the ink tool.
      return existing || options.pushHistoryEntry({ type: 'reversibleEdit', undo: remove, redo: save }, { skipBoundary: true });
    });
  }, [options.persistCanvasObject, options.boundary, options.enqueueRuntimeHistoryOperation, options.pushHistoryEntry, scope, snapshots]);

  const remove = useCallback(async (objectId: string): Promise<boolean> => {
    if (snapshots.has(objectId) && snapshots.get(objectId) === null) return false;
    const object = latest.current.objects.find((candidate) => candidate.objectId === objectId);
    const confirmed = snapshots.get(objectId);
    if (object?.kind !== 'freehand' && !confirmed) return options.deleteCanvasObject(objectId);
    if (activeScope.current !== scope || !options.boundary()) return false;
    return options.enqueueRuntimeHistoryOperation(async () => {
      if (activeScope.current !== scope) return false;
      // Read inside the lane so repeated eraser samples cannot register a
      // second delete while the first sample is still being persisted.
      if (snapshots.has(objectId) && snapshots.get(objectId) === null) return false;
      const canvasObject = latest.current.objects.find((candidate) => candidate.objectId === objectId);
      const placement = latest.current.placements.find((candidate) => candidate.objectId === objectId);
      const current = canvasObject?.kind === 'freehand' && placement
        ? { canvasObject, placement, contentMounts: [], payload: paperFreehandSavePayload(canvasObject, placement) }
        : snapshots.get(objectId);
      if (!current) return false;
      const snapshot = structuredClone(current);
      const save = async () => {
        if (activeScope.current !== scope) return false;
        const saved = await latest.current.persistCanvasObject(snapshot);
        if (saved && activeScope.current === scope) snapshots.set(objectId, snapshot);
        return saved;
      };
      const erase = async () => {
        if (activeScope.current !== scope) return false;
        const removed = await latest.current.deleteCanvasObject(objectId);
        if (removed && activeScope.current === scope) snapshots.set(objectId, null);
        return removed;
      };
      if (!await erase()) return false;
      return options.pushHistoryEntry({ type: 'reversibleEdit', undo: save, redo: erase }, { skipBoundary: true });
    });
  }, [options.deleteCanvasObject, options.boundary, options.enqueueRuntimeHistoryOperation, options.pushHistoryEntry, scope, snapshots]);

  return { persistCanvasObject: persist, deleteCanvasObject: remove };
}
