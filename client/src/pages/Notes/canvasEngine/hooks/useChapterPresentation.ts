import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import { deriveChapterProjection, getCollapsedChapterBlockIds, moveChapterBlocks } from '../chapterProjectionService';
import type { ChapterNode } from '../chapterProjectionService';
import type { DocumentPageFlowPlan } from '../documentPageFlowService';
import { normalizePageStacksWithFrameCoverage } from '../pageStackCollectionService';
import { resolveWorldRect, selectPlacementFrame, toStoredLayout, type CoordinateContract } from '../placementContractService';
import { layoutsEqual } from '../placementService';
import type { NoteBlock, TextBlockContentV1 } from '../runtimeDataTypes';
import { DEFAULT_BLOCK_GAP, type BlockBoxLayout } from '../runtimeLayout';
import type { PageFrameCollectionModel } from '../types';
import type { TextFlowHistoryHost } from './useTextFlowHistory';

interface ChapterMoveContext {
  layouts: Record<string, BlockBoxLayout>;
  collection: PageFrameCollectionModel | null;
  plan?: DocumentPageFlowPlan;
}

interface ChapterPresentationInput {
  noteId?: string; blocks: NoteBlock[]; orderedBlocks: NoteBlock[];
  flowDrafts: Record<string, TextBlockContentV1>; layouts: Record<string, BlockBoxLayout>;
  coverFrameId?: string | null; readOnly: boolean;
  coordinateContract?: CoordinateContract;
  getMoveContext: () => ChapterMoveContext;
  persistLayoutSnapshot: (layouts: Record<string, BlockBoxLayout>) => void | boolean | Promise<void | boolean>;
  whenWritesIdle?: () => Promise<void>;
  reorderBlocks: (ids: readonly string[]) => Promise<boolean>;
  history: React.MutableRefObject<TextFlowHistoryHost | null>;
  beforeStructure: () => boolean;
}

/** Expand the derived range into existing placement edits. Auto flow keeps its
 * stored geometry; changing its stack only changes its frame affiliation. */
function chapterPlacementSnapshots(api: ChapterPresentationInput, chapter: ChapterNode, targetId: string, edge: 'before' | 'after',
  destination?: { x: number; y: number }) {
  const before: Record<string, BlockBoxLayout> = {};
  const after: Record<string, BlockBoxLayout> = {};
  const context = api.getMoveContext();
  const frames = context.collection?.pageFrames || [];
  const contract = api.coordinateContract || 'v1';
  const source = context.layouts[chapter.blockId];
  const targetFragments = context.plan?.fragments.filter((fragment) => fragment.blockId === targetId);
  const targetFragment = targetFragments?.[edge === 'after' ? targetFragments.length - 1 : 0];
  const target = targetFragment?.layout || context.layouts[targetId];
  if (!source || !target) return { before, after };
  const targetFrame = selectPlacementFrame(target, frames, contract);
  const sourceWorld = resolveWorldRect(source, selectPlacementFrame(source, frames, contract), contract);
  const targetWorld = resolveWorldRect(target, targetFrame, contract);
  const worldLayouts = chapter.blockIds.flatMap((id) => {
    const layout = context.layouts[id];
    return layout ? [resolveWorldRect(layout, selectPlacementFrame(layout, frames, contract), contract)] : [];
  });
  const chapterBottom = Math.max(sourceWorld.y + sourceWorld.height, ...worldLayouts.map((layout) => layout.y + layout.height));
  const delta = destination ? { x: destination.x - sourceWorld.x, y: destination.y - sourceWorld.y }
    : { x: targetWorld.x - sourceWorld.x,
      y: edge === 'after' ? targetWorld.y + targetWorld.height + DEFAULT_BLOCK_GAP - sourceWorld.y
        : targetWorld.y - DEFAULT_BLOCK_GAP - chapterBottom };
  const stacks = normalizePageStacksWithFrameCoverage(context.collection);
  const targetStack = stacks.find((stack) => stack.frameIds.includes(targetFrame?.id || ''));
  const targetFrames = frames.filter((frame) => frame.id !== api.coverFrameId
    && (!targetStack || targetStack.frameIds.includes(frame.id)));
  const flowIds = new Set(context.plan?.fragments.map((fragment) => fragment.blockId));
  for (const id of chapter.blockIds) {
    const stored = api.layouts[id];
    const displayed = context.layouts[id];
    if (!stored || !displayed) continue;
    let moved = stored;
    if (flowIds.has(id)) {
      const sourceStack = stacks.find((stack) => stack.frameIds.includes(stored.frame_id || ''));
      if (targetFrame && sourceStack?.id !== targetStack?.id) {
        moved = toStoredLayout({ ...stored, frame_id: targetFrame.id }, frames, contract);
      }
    } else {
      const world = resolveWorldRect(displayed, selectPlacementFrame(displayed, frames, contract), contract);
      moved = { ...stored, x: world.x + delta.x, y: world.y + delta.y };
      if (contract === 'v2' && targetFrame) {
        const worldInput = { ...moved, coordinate_space: 'canvas_world' as const, frame_id: undefined, surface: 'formal_page' as const };
        const frame = selectPlacementFrame(worldInput, targetFrames, contract) || targetFrame;
        moved = toStoredLayout({ ...worldInput, frame_id: frame.id }, frames, contract);
      }
    }
    if (!layoutsEqual(stored, moved, contract)) { before[id] = { ...stored }; after[id] = moved; }
  }
  return { before, after };
}

const rendered = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

/** Session presentation only. Neither tree membership nor folding is saved. */
export function useChapterPresentation(input: ChapterPresentationInput) {
  const [state, setState] = useState<{ noteId?: string; collapsed: ReadonlySet<string>; numbered: boolean }>(
    () => ({ noteId: input.noteId, collapsed: new Set(), numbered: true }));
  const empty = useMemo(() => new Set<string>(), [input.noteId]);
  const collapsed = state.noteId === input.noteId ? state.collapsed : empty;
  const numbered = state.noteId === input.noteId ? state.numbered : true;
  useEffect(() => setState({ noteId: input.noteId, collapsed: new Set(), numbered: true }), [input.noteId]);
  const excluded = useMemo(() => new Set(input.blocks.filter((block) => input.coverFrameId
    && input.layouts[block.id]?.frame_id === input.coverFrameId).map((block) => block.id)),
  [input.blocks, input.layouts, input.coverFrameId]);
  const projection = useMemo(() => deriveChapterProjection(input.blocks, input.flowDrafts, excluded),
    [input.blocks, input.flowDrafts, excluded]);
  const hiddenBlockIds = useMemo(() => getCollapsedChapterBlockIds(projection, collapsed), [projection, collapsed]);
  const visibleBlocks = useMemo(() => input.blocks.filter((block) => !hiddenBlockIds.has(block.id)), [input.blocks, hiddenBlockIds]);
  const latest = useRef(input);
  latest.current = input;
  const [movingNoteId, setMovingNoteId] = useState<string | null>(null);
  const moving = useRef<object | null>(null);
  const isMoving = movingNoteId === (input.noteId || '');
  useEffect(() => { moving.current = null; setMovingNoteId(null); }, [input.noteId]);
  const whileMoving = useCallback(async (noteId: string | undefined, action: () => Promise<boolean>) => {
    if (moving.current || latest.current.noteId !== noteId || latest.current.readOnly) return false;
    const operation = {};
    moving.current = operation;
    setMovingNoteId(noteId || '');
    try {
      // Let A1 stop scheduling, then wait for any already issued placement write.
      await rendered();
      if (latest.current.noteId !== noteId || latest.current.readOnly) return false;
      await latest.current.whenWritesIdle?.().catch(() => undefined);
      await rendered();
      if (latest.current.noteId !== noteId || latest.current.readOnly) return false;
      return await action();
    } finally {
      if (moving.current === operation) { moving.current = null; setMovingNoteId(null); }
    }
  }, []);
  const onToggleChapter = useCallback((id: string) => {
    setState((previous) => {
      const next = new Set(previous.noteId === input.noteId ? previous.collapsed : []);
      if (next.has(id)) next.delete(id); else next.add(id);
      return { noteId: input.noteId, collapsed: next, numbered };
    });
  }, [input.noteId, numbered]);
  const onRevealChapter = useCallback((id: string) => {
    const remove = new Set<string>();
    let chapter = projection.chapters.find((entry) => entry.id === id);
    while (chapter) { remove.add(chapter.id); chapter = projection.chapters.find((entry) => entry.id === chapter!.parentId); }
    setState((previous) => ({ noteId: input.noteId, numbered,
      collapsed: new Set([...(previous.noteId === input.noteId ? previous.collapsed : [])].filter((key) => !remove.has(key))) }));
  }, [projection, input.noteId, numbered]);
  const onToggleNumbering = useCallback(() => setState({ noteId: input.noteId, collapsed, numbered: !numbered }),
    [input.noteId, collapsed, numbered]);
  const moveChapter = useCallback(async (id: string, targetBlockId: string, edge: 'before' | 'after'): Promise<boolean> => {
    const api = latest.current;
    if (api.readOnly || moving.current || !api.beforeStructure()) return false;
    if (api.coverFrameId && api.layouts[targetBlockId]?.frame_id === api.coverFrameId) return false;
    const noteId = api.noteId;
    const write = async (order: readonly string[], layouts: Record<string, BlockBoxLayout>) => {
      if (latest.current.noteId !== noteId || latest.current.readOnly) return false;
      const current = latest.current.orderedBlocks.map((block) => block.id);
      const known = new Set(current);
      // Preserve later unrelated insertions when replaying the order snapshot.
      const restored = [...order.filter((blockId) => known.has(blockId)), ...current.filter((blockId) => !order.includes(blockId))];
      const placements = Object.fromEntries(Object.entries(layouts).filter(([blockId]) => known.has(blockId)));
      if (Object.keys(placements).length && await latest.current.persistLayoutSnapshot(placements) === false) return false;
      if (latest.current.noteId !== noteId || latest.current.readOnly) return false;
      if (restored.every((blockId, index) => current[index] === blockId)) return true;
      return latest.current.reorderBlocks(restored);
    };
    const host = api.history.current;
    if (!host) return false;
    return host.enqueueRuntimeHistoryOperation(() => whileMoving(noteId, async () => {
      const current = latest.current;
      const excludedIds = new Set(current.blocks.filter((block) => current.coverFrameId
        && current.layouts[block.id]?.frame_id === current.coverFrameId).map((block) => block.id));
      const chapter = deriveChapterProjection(current.blocks, current.flowDrafts, excludedIds).chapters.find((entry) => entry.id === id);
      if (!chapter || excludedIds.has(targetBlockId)) return false;
      const before = current.orderedBlocks.map((block) => block.id);
      if (chapter.blockIds.includes(targetBlockId) || !before.includes(targetBlockId)
        || chapter.blockIds.some((blockId) => !before.includes(blockId))) return false;
      const reordered = moveChapterBlocks(current.orderedBlocks, chapter, targetBlockId, edge);
      const after = reordered || before;
      const context = current.getMoveContext();
      const captured = { ...current, getMoveContext: () => context };
      const placements = chapterPlacementSnapshots(captured, chapter, targetBlockId, edge);
      let afterLayouts = placements.after;
      const flowIds = new Set(context.plan?.fragments.map((fragment) => fragment.blockId));
      const manualIds = new Set(chapter.blockIds.filter((blockId) => !flowIds.has(blockId) && current.layouts[blockId]));
      const followsFlowHeading = flowIds.has(chapter.blockId) && manualIds.size > 0;
      if (!reordered && (flowIds.has(chapter.blockId) || !Object.keys(placements.after).length)) return false;
      // Manual residents follow the final full-flow heading anchor, including
      // when removing the chapter shifts the destination earlier in this stack.
      if (followsFlowHeading) for (const blockId of manualIds) placements.before[blockId] = { ...current.layouts[blockId]! };
      const restore = (order: readonly string[], layouts: Record<string, BlockBoxLayout>) => whileMoving(noteId, () => write(order, layouts));
      if (!host.pushHistoryEntry({ type: 'reversibleEdit',
        undo: () => restore(before, placements.before), redo: () => restore(after, afterLayouts) }, { skipBoundary: true })) return false;
      if (!followsFlowHeading) return write(after, afterLayouts);
      const flowLayouts = Object.fromEntries(Object.entries(afterLayouts).filter(([blockId]) => !manualIds.has(blockId)));
      if (!await write(after, flowLayouts)) return false;
      await rendered();
      if (latest.current.noteId !== noteId || latest.current.readOnly) return false;
      const updated = latest.current.getMoveContext();
      const heading = updated.layouts[chapter.blockId];
      if (!heading) return false;
      const contract = current.coordinateContract || 'v1';
      const destination = resolveWorldRect(heading, selectPlacementFrame(heading, updated.collection?.pageFrames || [], contract), contract);
      afterLayouts = chapterPlacementSnapshots(captured, chapter, targetBlockId, edge, destination).after;
      const manualLayouts = Object.fromEntries(Object.entries(afterLayouts).filter(([blockId]) => manualIds.has(blockId)));
      return !Object.keys(manualLayouts).length || await latest.current.persistLayoutSnapshot(manualLayouts) !== false;
    }));
  }, [whileMoving]);
  const cancelDrag = useRef<(() => void) | null>(null);
  useEffect(() => () => cancelDrag.current?.(), [input.noteId]);
  const beginChapterMove = useCallback((event: PointerEvent<HTMLElement>, block: NoteBlock): boolean => {
    const chapter = projection.chapters.find((entry) => entry.blockId === block.id);
    if (!chapter) return false;
    event.preventDefault(); event.stopPropagation();
    if (latest.current.readOnly || !latest.current.beforeStructure()) return true;
    cancelDrag.current?.();
    const origin = { x: event.clientX, y: event.clientY };
    const pointerId = event.pointerId;
    const root = event.currentTarget.closest('[data-note-navigation-row]') || document;
    let target: { blockId: string; edge: 'before' | 'after'; element: HTMLElement } | null = null;
    const clearTarget = () => { if (target) delete target.element.dataset.chapterDrop; target = null; };
    const move = (next: globalThis.PointerEvent) => {
      if (next.pointerId !== pointerId) return;
      clearTarget();
      if (Math.hypot(next.clientX - origin.x, next.clientY - origin.y) < 5) return;
      let distance = Infinity;
      for (const element of root.querySelectorAll<HTMLElement>('[data-block-id]')) {
        const blockId = element.dataset.blockId!;
        if (chapter.blockIds.includes(blockId) || !latest.current.blocks.some((candidate) => candidate.id === blockId)) continue;
        if (latest.current.coverFrameId && latest.current.layouts[blockId]?.frame_id === latest.current.coverFrameId) continue;
        const rect = element.getBoundingClientRect();
        if (!rect.height || !rect.width) continue;
        const middle = rect.top + rect.height / 2;
        const d = Math.abs(next.clientY - middle);
        if (d < distance) { distance = d; target = { blockId, edge: next.clientY < middle ? 'before' : 'after', element }; }
      }
      if (target) (target as { element: HTMLElement; edge: string }).element.dataset.chapterDrop = (target as { edge: string }).edge;
    };
    const cleanup = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', cleanup); clearTarget(); cancelDrag.current = null; };
    const up = (next: globalThis.PointerEvent) => {
      if (next.pointerId !== pointerId) return;
      const destination = target; cleanup();
      if (destination) void moveChapter(chapter.id, destination.blockId, destination.edge);
    };
    cancelDrag.current = cleanup;
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', cleanup);
    return true;
  }, [projection, moveChapter]);
  return { projection, hiddenBlockIds, visibleBlocks, beginChapterMove, moveChapter, isMoving,
    presentation: { projection, collapsedChapterIds: collapsed, numbered, onToggleChapter, onRevealChapter, onToggleNumbering } };
}
