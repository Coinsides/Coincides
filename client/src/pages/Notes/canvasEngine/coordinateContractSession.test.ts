import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createCoordinateContractSession } from './coordinateContractSession';
import { loadCanvasPersistenceForNote, resolveCanvasPlacementWriteContext, saveBlockCanvasPlacementForNote } from './canvasObjectRepository';
import type { Note } from './runtimeDataTypes';
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
