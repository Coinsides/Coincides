import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createCoordinateContractSession } from './coordinateContractSession';
import { applyCanvasLayoutsToBlocks, loadCanvasPersistenceForNote, resolveCanvasPlacementWriteContext, saveBlockCanvasPlacementForNote } from './canvasObjectRepository';
import { resolveScreenRect, selectPlacementFrame } from './placementContractService';
import { buildDefaultBlockLayouts, normalizeBlockLayout } from './placementService';
import type { CanvasBlockLayoutRecord } from './canvasPersistenceNormalizer';
import type { Note, NoteBlock } from './runtimeDataTypes';
import type { PageFrameCollectionModel } from './types';

const transport = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn() }));
vi.mock('@/services/api', () => ({ default: transport }));

const note: Note = {
  id: 'coordinate-session-note', course_id: 'synthetic-course', title: 'Synthetic session',
  description: null, status: 'active', metadata: {},
};
const flagUrl = '/canvas-objects/coordinate-contract';
const canvasUrl = `/canvas-objects/by-note/${note.id}`;

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((complete) => { resolve = complete; });
  return { promise, resolve };
}

beforeEach(() => vi.resetAllMocks());

describe('coordinate contract loading session', () => {
  it('shares one in-flight flag request and waits for it before reading canvas rows', async () => {
    const flag = deferred<{ data: { coordinate_contract: 'v2' } }>();
    transport.get.mockImplementation((url: string) => {
      if (url === flagUrl) return flag.promise;
      if (url === canvasUrl) return Promise.resolve({ data: { blockLayouts: [] } });
      throw new Error('Unexpected synthetic request');
    });
    const contractSession = createCoordinateContractSession();
    const first = loadCanvasPersistenceForNote({ note, importLegacy: false, contractSession });
    const concurrent = loadCanvasPersistenceForNote({ note, importLegacy: false, contractSession });
    expect(transport.get.mock.calls).toEqual([[flagUrl]]);

    flag.resolve({ data: { coordinate_contract: 'v2' } });
    const payloads = await Promise.all([first, concurrent]);
    expect(payloads.map((payload) => payload.coordinateContract)).toEqual(['v2', 'v2']);
    expect(transport.get.mock.calls.map(([url]) => url)).toEqual([flagUrl, canvasUrl, canvasUrl]);
  });

  it('keeps refreshes on the loaded contract and only a new loading session sees a flipped flag', async () => {
    let databaseFlag: 'v1' | 'v2' = 'v1';
    transport.get.mockImplementation(async (url: string) => {
      if (url === flagUrl) return { data: { coordinate_contract: databaseFlag } };
      if (url === canvasUrl) return { data: { blockLayouts: [] } };
      throw new Error('Unexpected synthetic request');
    });
    const session = createCoordinateContractSession();
    expect(Object.isFrozen(session)).toBe(true);
    const first = await loadCanvasPersistenceForNote({ note, importLegacy: false, contractSession: session });
    databaseFlag = 'v2';
    const refresh = await loadCanvasPersistenceForNote({ note, importLegacy: false, contractSession: session });
    expect([first.coordinateContract, refresh.coordinateContract]).toEqual(['v1', 'v1']);
    expect(transport.get.mock.calls.filter(([url]) => url === flagUrl)).toHaveLength(1);

    const reopened = await loadCanvasPersistenceForNote({
      note, importLegacy: false, contractSession: createCoordinateContractSession(),
    });
    expect(reopened.coordinateContract).toBe('v2');
    expect(transport.get.mock.calls.filter(([url]) => url === flagUrl)).toHaveLength(2);
  });

  it('does not hydrate canvas data after an unsupported contract response', async () => {
    transport.get.mockResolvedValue({ data: { coordinate_contract: 'future-contract' } });
    await expect(loadCanvasPersistenceForNote({
      note, importLegacy: false, contractSession: createCoordinateContractSession(),
    })).rejects.toThrow('Unsupported canvas coordinate contract');
    expect(transport.get.mock.calls).toEqual([[flagUrl]]);
  });

  it('does not silently fall back to v1 when the flag request fails', async () => {
    transport.get.mockRejectedValue(new Error('Synthetic transport failure'));
    await expect(loadCanvasPersistenceForNote({
      note, importLegacy: false, contractSession: createCoordinateContractSession(),
    })).rejects.toThrow('Synthetic transport failure');
    expect(transport.get.mock.calls).toEqual([[flagUrl]]);
  });
});

function frameCollection(id: string, y: number): PageFrameCollectionModel {
  return { primaryFrameId: id, pageFrames: [{
    id, role: 'primary_page_frame', exportable: true, pageSize: 'Custom',
    x: 80, y, width: 904, height: 1278,
    contentInset: { left: 72, right: 72, top: 96, bottom: 96 },
  }] };
}

describe('coordinate contract write context', () => {
  it('saves an unplaced default through the repository and reloads the same screen geometry', async () => {
    const target = frameCollection('trace-frame', 0);
    target.pageFrames[0] = { ...target.pageFrames[0], x: 0, height: 1279 };
    const block: NoteBlock = {
      id: 'unplaced-block', placement_id: 'unplaced-placement', block_type: 'paragraph',
      title: null, content_json: {}, plain_text: 'Synthetic paragraph', metadata: {},
      order_index: 0, source_references: [], display_overrides_json: {}, canvas_layout: null,
    };
    let durable: CanvasBlockLayoutRecord | null = null;
    transport.get.mockImplementation(async (url: string) => {
      if (url === flagUrl) return { data: { coordinate_contract: 'v2' } };
      if (url === canvasUrl) return { data: { pageFrameCollection: target, blockLayouts: durable ? [durable] : [] } };
      throw new Error('Unexpected synthetic request');
    });
    transport.put.mockImplementation(async (url: string, payload: { block_id: string; layout: Record<string, unknown> }) => {
      expect(url).toBe(`${canvasUrl}/block-placements/${block.placement_id}`);
      durable = { block_id: payload.block_id, placement_id: block.placement_id, layout: { ...payload.layout } };
      return { data: durable };
    });
    const contractSession = createCoordinateContractSession();
    const initial = await loadCanvasPersistenceForNote({ note, importLegacy: false, contractSession });
    expect(initial.blockLayouts).toEqual([]);
    const fallback = buildDefaultBlockLayouts([block], 760, () => 44)[block.id];
    const normalize = (currentBlock: NoteBlock) => normalizeBlockLayout({
      block: currentBlock, fallback, contentWidth: 760, surfaceMode: 'page',
      contract: 'v2', estimateHeight: () => 44,
    });
    const before = normalize(block);
    const beforeScreen = resolveScreenRect(before, undefined, 'v2');
    const context = await resolveCanvasPlacementWriteContext({
      noteId: note.id, loadedNoteId: note.id, pageFrameCollection: initial.pageFrameCollection, contractSession,
    });
    const saved = await saveBlockCanvasPlacementForNote({ ...context, noteId: note.id, block, layout: before });
    expect(transport.put.mock.calls[0]?.[1]).toMatchObject({
      block_id: block.id,
      layout: { x: 0, y: -96, width: 760, height: 44, frame_id: 'trace-frame',
        coordinate_space: 'page_frame_local', surface: 'formal_page', boundary_role: 'inside' },
    });
    expect(saved.layout).toMatchObject({ x: 0, y: -96, frame_id: 'trace-frame' });

    const reloaded = await loadCanvasPersistenceForNote({ note, importLegacy: false, contractSession });
    const hydratedBlocks = applyCanvasLayoutsToBlocks([block], reloaded.blockLayouts, {
      pageFrameCollection: reloaded.pageFrameCollection, coordinateContract: reloaded.coordinateContract,
    });
    const after = normalize(hydratedBlocks[0]);
    const frame = selectPlacementFrame(after, reloaded.pageFrameCollection?.pageFrames || [], 'v2');
    expect(resolveScreenRect(after, frame, 'v2')).toEqual(beforeScreen);
    expect(after).toMatchObject({ frame_id: 'trace-frame', x: 0, y: -96 });

    const moved = { ...after, y: after.y + 60 };
    await saveBlockCanvasPlacementForNote({ ...context, noteId: note.id, block: hydratedBlocks[0], layout: moved });
    expect(transport.put.mock.calls[1]?.[1].layout).toMatchObject({ x: 0, y: -36, frame_id: 'trace-frame' });
  });

  it('reports the unresolved-frame error for an unplaced block in a genuinely frameless note', async () => {
    await expect(saveBlockCanvasPlacementForNote({
      coordinateContract: 'v2', pageFrameCollection: { pageFrames: [], primaryFrameId: null },
      noteId: note.id, block: { id: 'unplaced-block', placement_id: 'unplaced-placement' },
      layout: { x: 0, y: 0, width: 760, height: 44, coordinate_space: 'page_frame_local' },
    })).rejects.toThrow('A resolved page frame is required to save this coordinate contract');
    expect(transport.put).not.toHaveBeenCalled();
  });

  it.each(['foreign note', 'not yet hydrated'] as const)(
    'loads the target frame collection for v2 recovery from a %s context', async (caseName) => {
      const target = frameCollection('target-frame', 1239);
      transport.get.mockImplementation(async (url: string) => {
        if (url === flagUrl) return { data: { coordinate_contract: 'v2' } };
        if (url === '/canvas-objects/by-note/recovery-target') {
          return { data: { pageFrameCollection: target } };
        }
        throw new Error('Unexpected synthetic request');
      });
      const result = await resolveCanvasPlacementWriteContext({
        noteId: 'recovery-target',
        loadedNoteId: caseName === 'foreign note' ? 'visible-note' : undefined,
        pageFrameCollection: caseName === 'foreign note' ? frameCollection('wrong-frame', 9000) : null,
        contractSession: createCoordinateContractSession(),
      });
      expect(result.coordinateContract).toBe('v2');
      expect(result.pageFrameCollection?.pageFrames).toEqual(target.pageFrames);
      expect(transport.get.mock.calls.map(([url]) => url)).toEqual([
        flagUrl, '/canvas-objects/by-note/recovery-target',
      ]);
    },
  );

  it('keeps v1 writes on their existing collection without a new target-canvas request', async () => {
    transport.get.mockResolvedValue({ data: { coordinate_contract: 'v1' } });
    const currentFrames = frameCollection('visible-frame', 9000);
    const result = await resolveCanvasPlacementWriteContext({
      noteId: 'recovery-target', loadedNoteId: 'visible-note', pageFrameCollection: currentFrames,
      contractSession: createCoordinateContractSession(),
    });
    expect(result.coordinateContract).toBe('v1');
    expect(result.pageFrameCollection).toEqual(currentFrames);
    expect(transport.get.mock.calls).toEqual([[flagUrl]]);
  });

  it('uses the loaded note frame snapshot while retaining the frozen session contract', async () => {
    let databaseFlag: 'v1' | 'v2' = 'v2';
    transport.get.mockImplementation(async () => ({ data: { coordinate_contract: databaseFlag } }));
    const contractSession = createCoordinateContractSession();
    const loadedFrames = frameCollection('loaded-frame', 1239);
    const input = {
      noteId: note.id, loadedNoteId: note.id, pageFrameCollection: loadedFrames, contractSession,
    };
    const first = await resolveCanvasPlacementWriteContext(input);
    databaseFlag = 'v1';
    const next = await resolveCanvasPlacementWriteContext(input);
    expect([first.coordinateContract, next.coordinateContract]).toEqual(['v2', 'v2']);
    expect(next.pageFrameCollection).toEqual(loadedFrames);
    expect(transport.get.mock.calls).toEqual([[flagUrl]]);
  });

  it('keeps v2 recovery pending when the target has no resolvable frame instead of writing world coordinates', async () => {
    transport.get.mockImplementation(async (url: string) => {
      if (url === flagUrl) return { data: { coordinate_contract: 'v2' } };
      if (url === '/canvas-objects/by-note/recovery-target') return { data: { pageFrameCollection: null } };
      throw new Error('Unexpected synthetic request');
    });
    const context = await resolveCanvasPlacementWriteContext({
      noteId: 'recovery-target', loadedNoteId: 'visible-note',
      pageFrameCollection: frameCollection('wrong-frame', 9000),
      contractSession: createCoordinateContractSession(),
    });
    await expect(saveBlockCanvasPlacementForNote({
      ...context, noteId: 'recovery-target', block: { id: 'recovery-block', placement_id: 'recovery-placement' },
      layout: { x: 172, y: 206, width: 320, height: 140,
        surface: 'formal_page', coordinate_space: 'canvas_world', frame_id: 'missing-frame' },
    })).rejects.toThrow(/frame/i);
    expect(transport.put).not.toHaveBeenCalled();
  });

  it('retains the existing v1 world write when its frame cannot be resolved', async () => {
    const layout = { x: 172, y: 206, width: 320, height: 140,
      surface: 'formal_page' as const, coordinate_space: 'canvas_world' as const, frame_id: 'missing-frame' };
    transport.put.mockImplementation(async (_url: string, payload: { layout: Record<string, unknown> }) => ({
      data: { block_id: 'recovery-block', placement_id: 'recovery-placement', layout: payload.layout },
    }));
    await saveBlockCanvasPlacementForNote({
      coordinateContract: 'v1', pageFrameCollection: null,
      noteId: 'recovery-target', block: { id: 'recovery-block', placement_id: 'recovery-placement' }, layout,
    });
    const persisted = transport.put.mock.calls[0]?.[1].layout;
    expect(persisted).toMatchObject({
      x: 172, y: 206, width: 320, height: 140,
      surface: 'formal_page', coordinate_space: 'canvas_world',
    });
    expect(persisted).not.toHaveProperty('frame_id');
  });
});
