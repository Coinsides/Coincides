import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadCanvasPersistenceForNote, saveGenericCanvasObjectForNote } from './canvasObjectRepository';
import { normalizeCanvasPersistencePayload } from './canvasPersistenceNormalizer';
import { toStoredGenericCanvasObjectPayload } from './placementContractService';
import type { Note } from './runtimeDataTypes';
import type { PageFrameCollectionModel, PageFrameModel } from './types';

const transport = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn() }));
vi.mock('@/services/api', () => ({ default: transport }));

const frames: PageFrameModel[] = [80, 1239].map((y, index) => ({
  id: `source-page-${index + 1}`, role: index === 0 ? 'primary_page_frame' : 'secondary_page_frame',
  exportable: true, x: 80 + index * 160, y, width: 794, height: 1123,
  pageSize: 'A4', contentInset: { left: 72, top: 96, right: 72, bottom: 96 },
}));
const collection: PageFrameCollectionModel = {
  primaryFrameId: frames[0].id, pageFrames: frames,
};
const note: Note = {
  id: 'generic-contract-note', course_id: 'synthetic-course', title: 'Synthetic images',
  description: null, status: 'active', metadata: {},
};

function imagePayload(local: boolean) {
  return {
    pageFrameCollection: collection,
    canvasObjects: frames.map((_, index) => ({ id: `source-image-${index}`, kind: 'image' })),
    canvasPlacements: frames.map((frame, index) => ({
      id: `placement-${index}`, object_id: `source-image-${index}`, frame_id: frame.id,
      surface: 'formal_page', boundary_role: 'inside',
      x: local ? 12 : frame.x + frame.contentInset.left + 12,
      y: local ? 34 : frame.y + frame.contentInset.top + 34,
      width: 320, height: 180,
      metadata: local
        ? { placement_kind: 'source_image', layout_policy: { coordinate_space: 'page_frame_local' } }
        : { placement_kind: 'source_image' },
    })),
  };
}

beforeEach(() => vi.resetAllMocks());

describe('generic canvas coordinate boundaries', () => {
  it('preserves the complete v1 normalized placement and the exact outgoing payload object', async () => {
    const payload = imagePayload(true);
    const v1 = normalizeCanvasPersistencePayload(payload, 'v1');
    expect(v1).toEqual(normalizeCanvasPersistencePayload(payload));
    expect(v1.canvasPlacements[0]).toEqual({
      placementId: 'placement-0', objectId: 'source-image-0', canvasId: 'primary-note-canvas',
      frameId: frames[0].id, surface: 'formal_page', boundaryRole: 'inside',
      x: 12, y: 34, width: 320, height: 180, rotation: 0, zIndex: 0, orderIndex: null,
      snapState: undefined, visibilityState: undefined, renderVisibility: undefined,
    });
    const outgoing = { kind: 'image', placement: payload.canvasPlacements[0], metadata: { caption: 'Unchanged' } };
    const rawResponse = { canvasPlacement: payload.canvasPlacements[0] };
    transport.put.mockResolvedValue({ data: rawResponse });
    const response = await saveGenericCanvasObjectForNote({
      noteId: note.id, objectId: 'source-image-0', payload: outgoing,
      coordinateContract: 'v1', pageFrameCollection: collection,
    });
    expect(transport.put.mock.calls[0][1]).toBe(outgoing);
    expect(response).toBe(rawResponse);
  });

  it('projects v2 Source image rows in both axes when the repository loads the frozen contract', async () => {
    const local = imagePayload(true);
    transport.get.mockImplementation(async (url: string) => ({
      data: url.endsWith('/coordinate-contract') ? { coordinate_contract: 'v2' } : local,
    }));
    const loaded = await loadCanvasPersistenceForNote({ note, importLegacy: false });
    const legacyWorld = normalizeCanvasPersistencePayload(imagePayload(false), 'v1');
    expect(loaded.canvasPlacements).toEqual(legacyWorld.canvasPlacements);
    expect(loaded.canvasPlacements.map(({ x, y }) => [x, y])).toEqual([[164, 210], [324, 1369]]);
    expect(local.canvasPlacements.map(({ x, y }) => [x, y])).toEqual([[12, 34], [12, 34]]);

    const unconverted = ['page_frame', 'workspace', 'tray', 'missing-frame', 'world'].map((kind) => ({
      ...local.canvasPlacements[0], id: kind, object_id: kind,
      surface: kind === 'workspace' ? 'canvas_workspace' : kind === 'tray' ? 'tray' : 'formal_page',
      frame_id: kind === 'missing-frame' ? 'absent' : frames[0].id,
      metadata: { layout_policy: { coordinate_space: kind === 'world' ? 'canvas_world' : 'page_frame_local' } },
    }));
    const exclusions = normalizeCanvasPersistencePayload({
      canvasObjects: unconverted.map((row) => ({ id: row.object_id, kind: row.id === 'page_frame' ? 'page_frame' : 'image' })),
      canvasPlacements: unconverted,
    }, 'v2', frames);
    expect(exclusions.canvasPlacements.map(({ x, y }) => [x, y])).toEqual(unconverted.map(({ x, y }) => [x, y]));
  });

  it('saves v2 generic world placements as local and returns raw rows for one adapter projection across two rounds', async () => {
    const frame = frames[1];
    let worldPlacement = { x: 324, y: 1369, width: 320, height: 180, frame_id: frame.id, surface: 'formal_page' };
    const rawResponses: object[] = [];
    transport.put.mockImplementation(async (_url: string, payload: Record<string, unknown>) => {
      const placement = payload.placement as Record<string, unknown>;
      const response = {
        canvasObjects: [{ id: 'roundtrip-image', kind: 'image' }],
        canvasPlacements: [{
          ...placement, id: 'roundtrip-placement', object_id: 'roundtrip-image',
          metadata: { layout_policy: { coordinate_space: placement.coordinate_space } },
        }],
      };
      rawResponses.push(response);
      return { data: response };
    });
    for (let round = 0; round < 2; round += 1) {
      const result = await saveGenericCanvasObjectForNote({
        noteId: note.id, objectId: 'roundtrip-image', payload: { kind: 'image', placement: worldPlacement },
        coordinateContract: 'v2', pageFrameCollection: collection,
      });
      expect(result).toBe(rawResponses[round]);
      expect(transport.put.mock.calls[round][1].placement).toMatchObject({
        x: 12, y: 34, frame_id: frame.id, coordinate_space: 'page_frame_local',
      });
      const hydrated = normalizeCanvasPersistencePayload(result, 'v2', frames).canvasPlacements[0];
      expect([hydrated.x, hydrated.y]).toEqual([324, 1369]);
      worldPlacement = { ...worldPlacement, x: hydrated.x, y: hydrated.y };
    }
    for (const payload of [
      { kind: 'page_frame', placement: worldPlacement },
      { kind: 'image', placement: { ...worldPlacement, surface: 'tray' } },
      { kind: 'image', placement: { ...worldPlacement, surface: 'canvas_workspace' } },
    ]) {
      expect(toStoredGenericCanvasObjectPayload(payload, frames, 'v2')).toBe(payload);
    }
    expect(() => toStoredGenericCanvasObjectPayload({
      kind: 'image', placement: { ...worldPlacement, frame_id: 'absent' },
    }, frames, 'v2')).toThrow('A resolved page frame is required');
  });
});
