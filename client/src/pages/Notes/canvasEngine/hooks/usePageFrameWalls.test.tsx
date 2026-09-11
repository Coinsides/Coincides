import React, { useRef, useState } from 'react';
import { act, fireEvent, render } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
// @ts-expect-error -- Optional audit output runs in Vitest's Node host.
import { writeFileSync } from 'node:fs';
import { createPageFrameCollectionSeed, insertPageFrameAfter } from '../pageFrameCollectionService';
import { appendPageFrameToStack } from '../pageStackCollectionService';
import { projectWallPlacements, type PageFrameWallSnapshot } from '../pageFrameWallService';
import { createSurfaceModePolicy } from '../modePolicyService';
import { resolveScreenRect } from '../placementContractService';
import { DEFAULT_DOCUMENT_TYPOGRAPHY_PROFILE } from '../typographyProfileService';
import type { BlockBoxLayout } from '../runtimeLayout';
import type { NoteBlock } from '../runtimeDataTypes';
import type { CanvasObject, CanvasPlacement, PageFrameCollectionModel, PageFrameModel } from '../types';
import { useNoteCanvasResolvedLayoutModel } from './useNoteCanvasLayoutModel';
import { usePageFrameWalls } from './usePageFrameWalls';
import { usePlacementHistory } from './usePlacementHistory';
import type { TextFlowHistoryHost } from './useTextFlowHistory';

declare const process: { env: Record<string, string | undefined> };

// Native-layout claims are excluded: React handlers and window pointer events
// execute in jsdom, with synthetic rows and an in-memory save transport.
class SyntheticPointerEvent extends MouseEvent {
  readonly pointerId: number;
  constructor(type: string, init: PointerEventInit = {}) {
    super(type, init);
    this.pointerId = init.pointerId ?? 1;
  }
}
beforeAll(() => vi.stubGlobal('PointerEvent', SyntheticPointerEvent));
afterAll(() => vi.unstubAllGlobals());
afterEach(() => vi.restoreAllMocks());

const frame: PageFrameModel = {
  id: 'wall-frame', role: 'primary_page_frame', exportable: true,
  x: 0, y: 0, width: 904, height: 1279, pageSize: 'A4',
  contentInset: { left: 72, right: 72, top: 96, bottom: 88 },
};
const baseLayout: BlockBoxLayout = {
  x: 0, y: 120.25, width: 760, height: 100,
  coordinate_space: 'page_frame_local', frame_id: frame.id, surface: 'formal_page', boundary_role: 'inside',
};
function block(id: string, layout: Partial<BlockBoxLayout>): NoteBlock {
  return { id, placement_id: `placement:${id}`, block_type: 'paragraph', title: null,
    content_json: {}, plain_text: 'Synthetic wall paragraph', metadata: {}, order_index: 0,
    source_references: [], display_overrides_json: {}, canvas_layout: { ...baseLayout, ...layout } };
}
const objects: CanvasObject[] = [
  { objectId: 'image', canvasId: 'wall-canvas', kind: 'image', backing: 'asset', objectClass: 'media', status: 'active' },
  { objectId: 'ink', canvasId: 'wall-canvas', kind: 'freehand', backing: 'none', objectClass: 'pure', status: 'active' },
];
const originalPlacements: CanvasPlacement[] = objects.map((item) => ({
  objectId: item.objectId, placementId: `placement:${item.objectId}`, canvasId: 'wall-canvas', frameId: frame.id,
  surface: 'formal_page', boundaryRole: 'inside', x: 522, y: 126, width: 300, height: 100,
  rotation: 0, zIndex: 0, sourceCoordinateSpace: 'page_frame_local',
}));
interface State { collection: PageFrameCollectionModel; blocks: NoteBlock[]; placements: CanvasPlacement[] }
interface HarnessApi {
  walls: ReturnType<typeof usePageFrameWalls>;
  history: ReturnType<typeof usePlacementHistory>;
  resolved: ReturnType<typeof useNoteCanvasResolvedLayoutModel>;
  state: State;
}
function mountWalls({ zoom = 1, outcome = async (_snapshot: PageFrameWallSnapshot) => true,
  boundary = () => true }: { zoom?: number; outcome?: (snapshot: PageFrameWallSnapshot) => Promise<boolean>; boundary?: () => boolean } = {}) {
  let api: HarnessApi;
  const save = vi.fn(outcome);
  const layoutReplay = vi.fn();
  function Harness({ noteId = 'wall-note', generation = 0 }: { noteId?: string; generation?: number }) {
    const [state, setState] = useState<State>(() => {
      const seeded = createPageFrameCollectionSeed(frame);
      return { collection: appendPageFrameToStack(seeded, seeded.primaryStackId!, frame.id, { id: 'second-frame' }),
        blocks: [block('auto', {}), block('manual', { x: 360, width: 400, width_mode: 'manual' }),
          block('wide', { x: 0, width: 700, width_mode: 'manual' })],
        placements: originalPlacements.map((item) => ({ ...item })) };
    });
    const history = usePlacementHistory({ noteId, generation, coordinateContract: 'v2',
      applyLayoutDrafts: layoutReplay, persistLayoutSnapshot: async () => true, target: null });
    const host = useRef<TextFlowHistoryHost | null>(history);
    host.current = history;
    const walls = usePageFrameWalls({ noteId, generation, enabled: true, coordinateContract: 'v2',
      collection: state.collection, blocks: state.blocks, layoutDrafts: {}, objects, placements: state.placements,
      zoom, history: host, boundary, save: async (snapshot) => {
        const succeeded = await save(snapshot);
        if (succeeded) setState((previous) => ({
          collection: snapshot.collection,
          blocks: previous.blocks.map((row) => {
            const update = snapshot.layoutUpdates.find((item) => item.block.id === row.id);
            return update ? { ...row, canvas_layout: { ...update.layout } } : row;
          }),
          placements: projectWallPlacements(previous.placements, objects, previous.collection, snapshot.collection,
            'v2', snapshot.objectLayoutUpdates),
        }));
        return succeeded;
      } });
    const resolved = useNoteCanvasResolvedLayoutModel({ coordinateContract: 'v2', contentWidth: 1000,
      documentTypographyProfile: DEFAULT_DOCUMENT_TYPOGRAPHY_PROFILE, layoutDrafts: {}, sortedBlocks: state.blocks,
      pageFrames: walls.collection!.pageFrames, surfaceMode: 'page', surfacePolicy: createSurfaceModePolicy('page') });
    api = { walls, history, resolved, state };
    return <div>
      <button data-testid="left-wall" onPointerDown={(event) => walls.begin(event, frame.id, 'left')}>left</button>
      <button data-testid="right-wall" onPointerDown={(event) => walls.begin(event, frame.id, 'right')}>right</button>
    </div>;
  }
  const view = render(<Harness />);
  return { get current() { return api!; }, view, save, layoutReplay,
    switchScope: (noteId: string, generation = 0) => view.rerender(<Harness noteId={noteId} generation={generation} />) };
}
function begin(subject: ReturnType<typeof mountWalls>, side: 'left' | 'right', x = 400) {
  fireEvent.pointerDown(subject.view.getByTestId(`${side}-wall`), { clientX: x, pointerId: 7, button: 0 });
}
function pointer(type: 'pointermove' | 'pointerup' | 'pointercancel', x: number, pointerId = 7) {
  window.dispatchEvent(new SyntheticPointerEvent(type, { clientX: x, pointerId, button: 0 }));
}
async function finish(subject: ReturnType<typeof mountWalls>, x: number) {
  await act(async () => { pointer('pointerup', x); await subject.current.history.whenHistoryIdle(); });
}
const evidence: Record<string, unknown>[] = [];
afterAll(() => {
  const evidencePath = process.env.COINCIDES_D1_WALL_SMOKE_EVIDENCE;
  if (!evidencePath) return;
  writeFileSync(evidencePath, JSON.stringify({
    environment: 'synthetic React pointer events and real usePlacementHistory/useNoteCanvasResolvedLayoutModel in jsdom',
    databaseAccess: false, transport: 'in-memory snapshot saves; HTTP atomicity covered separately',
    screenshots: 0, cases: evidence,
  }, null, 2));
});

describe('D1 wall pointer, projection and shared placement history', () => {
  it('previews right-wall contraction, commits one combined snapshot, and replays one symmetric undo/redo', async () => {
    const subject = mountWalls({ zoom: 0.5 });
    const before = JSON.stringify(subject.current.state);
    const originalAuto = JSON.stringify(subject.current.state.blocks[0]);
    begin(subject, 'right');
    act(() => pointer('pointermove', 320)); // -80 screen = -160 layout = right 232.
    expect(subject.current.walls.activeWall).toEqual({ frameId: frame.id, side: 'right' });
    expect(subject.current.walls.collection!.pageFrames.map((item) => item.contentInset.right)).toEqual([232, 232]);
    expect(subject.current.resolved.blockLayouts.auto.width).toBe(600);
    expect(JSON.stringify(subject.current.state)).toBe(before);
    expect(subject.save).not.toHaveBeenCalled();
    await finish(subject, 320);
    expect(subject.save).toHaveBeenCalledTimes(1);
    const after = JSON.stringify(subject.current.state);
    const saved = subject.save.mock.calls[0][0];
    expect(saved.layoutUpdates.map((item) => [item.block.id, item.layout.x, item.layout.width])).toEqual([
      ['manual', 200, 400], ['wide', 0, 600],
    ]);
    expect(saved.objectLayoutUpdates.map((item) => [item.objectId, item.layout.x, item.layout.width])).toEqual([['image', 300, 300]]);
    expect(JSON.stringify(subject.current.state.blocks[0])).toBe(originalAuto);
    expect(subject.current.state.placements[1]).toEqual(originalPlacements[1]);
    await act(async () => { expect(await subject.current.history.undoRuntimeHistory()).toBe(true); });
    expect(subject.save).toHaveBeenCalledTimes(2);
    expect(JSON.stringify(subject.current.state)).toBe(before);
    await act(async () => { expect(await subject.current.history.undoRuntimeHistory()).toBe(false); });
    await act(async () => { expect(await subject.current.history.redoRuntimeHistory()).toBe(true); });
    expect(subject.save).toHaveBeenCalledTimes(3);
    expect(JSON.stringify(subject.current.state)).toBe(after);
    await act(async () => { expect(await subject.current.history.redoRuntimeHistory()).toBe(false); });
    evidence.push({ smoke: '1+3', rightInset: [72, 232], autoWidths: [760, 600], zoom: 0.5,
      saveCallsForCommitUndoRedo: subject.save.mock.calls.length, snapshots: subject.save.mock.calls.map(([snapshot]) => snapshot),
      exactUndo: true, exactRedo: true, autoStoredBytesUnchanged: true, inkUnchanged: true });
  });

  it('widens the right wall past 760 and creates both new-page forms with inherited insets', async () => {
    const subject = mountWalls();
    const stored = JSON.stringify(subject.current.state.blocks);
    begin(subject, 'right');
    act(() => pointer('pointermove', 448));
    expect(subject.current.resolved.blockLayouts.auto.width).toBe(808);
    await finish(subject, 448);
    expect(subject.save).toHaveBeenCalledTimes(1);
    expect(subject.save.mock.calls[0][0]).toMatchObject({ layoutUpdates: [], objectLayoutUpdates: [] });
    expect(JSON.stringify(subject.current.state.blocks)).toBe(stored);
    const current = subject.current.state.collection;
    const inserted = insertPageFrameAfter(current, frame.id, { id: 'inserted-after-wall' });
    const appended = appendPageFrameToStack(current, current.primaryStackId!, frame.id, { id: 'appended-after-wall' });
    const insets = [inserted, appended].map((item, index) => item.pageFrames.find((page) =>
      page.id === (index === 0 ? 'inserted-after-wall' : 'appended-after-wall'))!.contentInset);
    expect(insets).toEqual([{ left: 72, right: 24, top: 96, bottom: 88 }, { left: 72, right: 24, top: 96, bottom: 88 }]);
    evidence.push({ smoke: '1+4', rightInset: [72, 24], autoWidths: [760, 808], storedBytesUnchanged: true,
      insertAppendInsets: insets, blockWrites: 0, genericWrites: 0 });
  });

  it('moves a manual block and image with the left wall while stored local coordinates and ink stay unchanged', async () => {
    const subject = mountWalls();
    const original = JSON.stringify(subject.current.state.blocks);
    const manual = subject.current.resolved.blockLayouts.manual;
    const screenBefore = resolveScreenRect(manual, frame, 'v2').x + frame.contentInset.left;
    begin(subject, 'left');
    act(() => pointer('pointermove', 352));
    const liveFrame = subject.current.walls.collection!.pageFrames[0];
    const screenAfter = resolveScreenRect(subject.current.resolved.blockLayouts.manual, liveFrame, 'v2').x + liveFrame.contentInset.left;
    expect(screenAfter - screenBefore).toBe(-48);
    expect(subject.current.walls.placements[0].x).toBe(originalPlacements[0].x - 48);
    expect(subject.current.walls.placements[1]).toEqual(originalPlacements[1]);
    await finish(subject, 352);
    expect(JSON.stringify(subject.current.state.blocks)).toBe(original);
    expect(subject.save.mock.calls[0][0]).toMatchObject({ layoutUpdates: [], objectLayoutUpdates: [] });
    evidence.push({ smoke: '2', leftInset: [72, 24], manualLocalX: 360, manualPaperX: [screenBefore, screenAfter],
      imageWorldX: [originalPlacements[0].x, subject.current.state.placements[0].x],
      blockWrites: 0, genericWrites: 0, storedBytesUnchanged: true, inkUnchanged: true });
  });

  it.each(['false', 'throw'] as const)('does not add an undo entry when save returns %s', async (failure) => {
    const subject = mountWalls({ outcome: async () => { if (failure === 'throw') throw new Error('synthetic wall failure'); return false; } });
    const before = JSON.stringify(subject.current.state);
    begin(subject, 'right');
    await finish(subject, 240);
    expect(subject.save).toHaveBeenCalledTimes(1);
    expect(subject.current.walls.saving).toBe(false);
    expect(subject.current.walls.activeWall).toBe(null);
    expect(JSON.stringify(subject.current.state)).toBe(before);
    await act(async () => { expect(await subject.current.history.undoRuntimeHistory()).toBe(false); });
  });

  it.each(['Escape', 'pointercancel', 'blur'] as const)('cancels %s without writes or history', async (kind) => {
    const subject = mountWalls();
    const before = JSON.stringify(subject.current.state);
    begin(subject, 'right');
    act(() => pointer('pointermove', 240));
    act(() => {
      if (kind === 'Escape') window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      else if (kind === 'blur') window.dispatchEvent(new Event('blur'));
      else pointer('pointercancel', 240);
    });
    await finish(subject, 240);
    expect(subject.save).not.toHaveBeenCalled();
    expect(subject.current.walls.collection).toBe(subject.current.state.collection);
    expect(JSON.stringify(subject.current.state)).toBe(before);
    await act(async () => { expect(await subject.current.history.undoRuntimeHistory()).toBe(false); });
  });

  it('keeps wall edits in the same stack as block moves and seals the boundary once', async () => {
    const boundary = vi.fn(() => true);
    const subject = mountWalls({ boundary });
    act(() => subject.current.history.pushLayoutHistory({ manual: { ...baseLayout, x: 0 } }, { manual: { ...baseLayout, x: 20 } }));
    begin(subject, 'right');
    await finish(subject, 240);
    expect(boundary).toHaveBeenCalledTimes(1);
    await act(async () => { expect(await subject.current.history.undoRuntimeHistory()).toBe(true); });
    expect(subject.save).toHaveBeenCalledTimes(2);
    expect(subject.layoutReplay).not.toHaveBeenCalled();
    await act(async () => { expect(await subject.current.history.undoRuntimeHistory()).toBe(true); });
    expect(subject.layoutReplay).toHaveBeenLastCalledWith({ manual: { ...baseLayout, x: 0 } });
    await act(async () => { expect(await subject.current.history.redoRuntimeHistory()).toBe(true); });
    await act(async () => { expect(await subject.current.history.redoRuntimeHistory()).toBe(true); });
    expect(subject.save).toHaveBeenCalledTimes(3);
  });

  it('queues undo behind a pending wall save and prevents an overlapping gesture', async () => {
    let release!: (value: boolean) => void;
    const pending = new Promise<boolean>((resolveSave) => { release = resolveSave; });
    let first = true;
    const subject = mountWalls({ outcome: async () => { if (first) { first = false; return pending; } return true; } });
    const before = JSON.stringify(subject.current.state);
    begin(subject, 'right');
    await act(async () => { pointer('pointerup', 240); await Promise.resolve(); });
    expect(subject.current.walls.saving).toBe(true);
    expect(subject.save).toHaveBeenCalledTimes(1);
    begin(subject, 'left');
    expect(subject.current.walls.activeWall).toBe(null);
    const undo = subject.current.history.undoRuntimeHistory();
    await act(async () => { release(true); expect(await undo).toBe(true); await subject.current.history.whenHistoryIdle(); });
    expect(subject.save).toHaveBeenCalledTimes(2);
    expect(subject.current.walls.saving).toBe(false);
    expect(JSON.stringify(subject.current.state)).toBe(before);
  });

  it('removes active drag listeners on unmount without saving', async () => {
    const subject = mountWalls();
    begin(subject, 'right');
    act(() => pointer('pointermove', 240));
    subject.view.unmount();
    act(() => { pointer('pointermove', 200); pointer('pointerup', 200); });
    await act(async () => { await Promise.resolve(); });
    expect(subject.save).not.toHaveBeenCalled();
  });

  it.each(['note', 'generation'] as const)('isolates old pending-save state and callbacks when the %s changes', async (change) => {
    let release!: (value: boolean) => void;
    const subject = mountWalls({ outcome: () => new Promise<boolean>((resolveSave) => { release = resolveSave; }) });
    begin(subject, 'right');
    await act(async () => { pointer('pointerup', 240); await Promise.resolve(); });
    const oldHistory = subject.current.history;
    expect(subject.current.walls.saving).toBe(true);
    subject.switchScope(change === 'note' ? 'another-wall-note' : 'wall-note', change === 'generation' ? 1 : 0);
    expect(subject.current.walls.activeWall).toBe(null);
    expect(subject.current.walls.collection).toBe(subject.current.state.collection);
    expect(subject.current.walls.saving).toBe(false);
    begin(subject, 'left');
    act(() => pointer('pointermove', 352));
    await act(async () => { release(false); await oldHistory.whenHistoryIdle(); });
    expect(subject.current.walls.activeWall).toEqual({ frameId: frame.id, side: 'left' });
    expect(subject.current.walls.collection!.pageFrames[0].contentInset.left).toBe(24);
    expect(subject.current.walls.saving).toBe(false);
    act(() => pointer('pointercancel', 352));
    await act(async () => { expect(await subject.current.history.undoRuntimeHistory()).toBe(false); });
  });

  it('ignores another pointer and an unchanged release, and refuses an unsealed editing boundary', async () => {
    const subject = mountWalls();
    begin(subject, 'right');
    act(() => { pointer('pointermove', 240, 8); pointer('pointerup', 240, 8); });
    expect(subject.current.walls.collection!.pageFrames[0].contentInset.right).toBe(72);
    await finish(subject, 400);
    expect(subject.save).not.toHaveBeenCalled();
    subject.view.unmount();
    const refused = mountWalls({ boundary: () => false });
    begin(refused, 'right');
    await finish(refused, 240);
    expect(refused.save).not.toHaveBeenCalled();
    expect(refused.current.walls.activeWall).toBe(null);
  });
});
