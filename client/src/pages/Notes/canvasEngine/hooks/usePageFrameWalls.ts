import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject, type PointerEvent as ReactPointerEvent } from 'react';
import { buildPageFrameWallEdit, movePageFrameWall, projectWallPlacements, type PageFrameWallSide, type PageFrameWallSnapshot } from '../pageFrameWallService';
import type { CoordinateContract } from '../placementContractService';
import type { BlockBoxLayout } from '../runtimeLayout';
import type { NoteBlock } from '../runtimeDataTypes';
import type { CanvasObject, CanvasPlacement, PageFrameCollectionModel } from '../types';
import type { TextFlowHistoryHost } from './useTextFlowHistory';

interface Options {
  noteId?: string;
  generation?: number;
  enabled: boolean;
  coordinateContract: CoordinateContract;
  collection: PageFrameCollectionModel | null;
  getCollection?: () => PageFrameCollectionModel | null;
  blocks: NoteBlock[];
  layoutDrafts: Record<string, BlockBoxLayout>;
  objects: CanvasObject[];
  placements: CanvasPlacement[];
  zoom: number;
  history: MutableRefObject<TextFlowHistoryHost | null>;
  boundary: () => boolean;
  save: (snapshot: PageFrameWallSnapshot) => Promise<boolean>;
}

export function usePageFrameWalls(options: Options) {
  const latest = useRef(options);
  latest.current = options;
  const scope = useMemo(() => ({ busy: false, cleanup: null as (() => void) | null }), [options.noteId, options.generation]);
  const activeScope = useRef(scope);
  activeScope.current = scope;
  const [previewState, setPreviewState] = useState<{ scope: typeof scope; collection: PageFrameCollectionModel } | null>(null);
  const [activeState, setActiveState] = useState<{ scope: typeof scope; wall: { frameId: string; side: PageFrameWallSide } } | null>(null);
  const [savingScope, setSavingScope] = useState<typeof scope | null>(null);
  const preview = previewState?.scope === scope ? previewState.collection : null;
  const activeWall = activeState?.scope === scope ? activeState.wall : null;
  const saving = savingScope === scope;
  useEffect(() => () => { scope.cleanup?.(); }, [scope]);

  const begin = useCallback((event: ReactPointerEvent<HTMLElement>, frameId: string, side: PageFrameWallSide) => {
    const start = latest.current;
    const history = start.history.current;
    const collection = start.collection || start.getCollection?.();
    if (event.button !== 0 || !start.enabled || start.coordinateContract !== 'v2' || scope.busy || !collection || !history
      || history.isReplaying?.() || !start.boundary()) return;
    event.preventDefault();
    event.stopPropagation();
    scope.cleanup?.();
    scope.busy = true;
    let nextCollection = collection;
    const x = event.clientX;
    const pointerId = event.pointerId;
    const element = event.currentTarget;
    const target = element.ownerDocument.defaultView || window;
    const zoom = start.zoom > 0 ? start.zoom : 1;
    const move = (pointer: PointerEvent) => {
      if (pointer.pointerId !== pointerId) return;
      const delta = (pointer.clientX - x) / zoom * (side === 'right' ? -1 : 1);
      nextCollection = movePageFrameWall(collection, frameId, side, delta);
      setPreviewState({ scope, collection: nextCollection });
    };
    const reset = () => {
      target.removeEventListener('pointermove', move);
      target.removeEventListener('pointerup', end);
      target.removeEventListener('pointercancel', cancel);
      target.removeEventListener('keydown', key, true);
      target.removeEventListener('blur', cancel);
      if (element.hasPointerCapture?.(pointerId)) element.releasePointerCapture(pointerId);
      scope.cleanup = null;
      if (activeScope.current === scope) setActiveState(null);
    };
    const cancel = () => { reset(); if (activeScope.current === scope) setPreviewState(null); scope.busy = false; };
    const key = (keyboard: KeyboardEvent) => {
      if (keyboard.key === 'Escape') { keyboard.preventDefault(); keyboard.stopPropagation(); cancel(); }
      if ((keyboard.ctrlKey || keyboard.metaKey) && keyboard.key.toLowerCase() === 'z') {
        keyboard.preventDefault(); keyboard.stopImmediatePropagation();
      }
    };
    const end = (pointer: PointerEvent) => {
      if (pointer.pointerId !== pointerId) return;
      move(pointer);
      reset();
      if (JSON.stringify(nextCollection) === JSON.stringify(collection)) { setPreviewState(null); scope.busy = false; return; }
      const edit = buildPageFrameWallEdit({ before: collection, after: nextCollection, blocks: start.blocks,
        layoutDrafts: start.layoutDrafts, objects: start.objects, placements: start.placements, coordinateContract: start.coordinateContract });
      setSavingScope(scope);
      void history.enqueueRuntimeHistoryOperation(async () => {
        const saved = await start.save(edit.after);
        if (!saved) return false;
        return history.pushHistoryEntry({ type: 'reversibleEdit', undo: () => start.save(edit.before), redo: () => start.save(edit.after) }, { skipBoundary: true });
      }).finally(() => {
        scope.busy = false;
        if (activeScope.current === scope) { setPreviewState(null); setSavingScope(null); }
      });
    };
    scope.cleanup = cancel;
    setActiveState({ scope, wall: { frameId, side } });
    element.setPointerCapture?.(pointerId);
    target.addEventListener('pointermove', move);
    target.addEventListener('pointerup', end);
    target.addEventListener('pointercancel', cancel);
    target.addEventListener('keydown', key, true);
    target.addEventListener('blur', cancel);
  }, [scope]);

  const placements = useMemo(() => preview && options.collection
    ? projectWallPlacements(options.placements, options.objects, options.collection, preview, options.coordinateContract)
    : options.placements, [options.placements, options.objects, options.collection, options.coordinateContract, preview]);
  return { collection: preview || options.collection, placements, activeWall, saving, begin };
}
