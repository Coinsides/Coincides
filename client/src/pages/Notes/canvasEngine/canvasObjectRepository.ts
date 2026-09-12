import api from '@/services/api';
import { assertNoRetiredCanvasWrite, requireCanvasObjectWritePayload, requireCanvasPlacementWritePayload } from './canvasRetirementPolicy';
import { createCoordinateContractSession, type CoordinateContractSession } from './coordinateContractSession';
import {
  requiresFrameLocalWriteContext,
  normalizeBlockLayoutForSave,
  toStoredGenericCanvasObjectPayload,
  type CoordinateContract,
} from './placementContractService';
import {
  buildLayoutPayload,
  reconcileHydratedBlockLayoutSurfaceAuthority,
} from './placementService';
import {
  NOTE_PAGE_FRAME_COLLECTION_METADATA_KEY,
  normalizePageFrameCollection,
  pageFrameCollectionFromMetadata,
} from './pageFrameCollectionService';
import {
  normalizeCanvasPersistencePayload,
  type CanvasBlockLayoutRecord,
  type NoteCanvasPersistencePayload,
} from './canvasPersistenceNormalizer';
import type {
  Note,
  NoteBlock,
} from './runtimeDataTypes';
import type {
  BlockBoxLayout,
} from './runtimeLayout';
import type {
  PageFrameCollectionModel,
} from './types';

export function stripLegacyPageFrameMetadata(metadata: Record<string, unknown> | undefined): Record<string, unknown> {
  const next = { ...(metadata || {}) };
  delete next[NOTE_PAGE_FRAME_COLLECTION_METADATA_KEY];
  return next;
}

/** Recovery receipts can belong to a different note from the mounted editor. */
export async function resolveCanvasPlacementWriteContext(input: {
  noteId: string;
  loadedNoteId?: string;
  pageFrameCollection?: PageFrameCollectionModel | null;
  contractSession: CoordinateContractSession;
}): Promise<{ coordinateContract: CoordinateContract; pageFrameCollection: PageFrameCollectionModel | null }> {
  const coordinateContract = await input.contractSession.load();
  if (!requiresFrameLocalWriteContext(coordinateContract)
    || (input.noteId === input.loadedNoteId && input.pageFrameCollection)) {
    return { coordinateContract, pageFrameCollection: input.pageFrameCollection || null };
  }
  const response = await api.get<NoteCanvasPersistencePayload>(`/canvas-objects/by-note/${input.noteId}`);
  return {
    coordinateContract,
    pageFrameCollection: normalizeCanvasPersistencePayload(response.data, coordinateContract).pageFrameCollection,
  };
}

// Note and canvas DTOs can use bare / prefixed IDs for the same placement.
// Normalize only the read key; preserve both DTOs' IDs for their write paths.
function placementHydrationKey(id: string): string {
  return id.replace(/^canvas-placement:/, '');
}

export function applyCanvasLayoutsToBlocks(
  blocks: NoteBlock[],
  blockLayouts: CanvasBlockLayoutRecord[],
  options: {
    pageFrameCollection?: PageFrameCollectionModel | null;
    coordinateContract?: CoordinateContract;
  } = {},
): NoteBlock[] {
  if (blockLayouts.length === 0) return blocks;
  const pageFrames = options.pageFrameCollection?.pageFrames || [];
  const layoutsByBlockId = new Map(blockLayouts.map((item) => [
    item.block_id,
    reconcileHydratedBlockLayoutSurfaceAuthority(item.layout, pageFrames, options.coordinateContract),
  ]));
  const layoutsByPlacementId = new Map(blockLayouts.map((item) => [
    placementHydrationKey(item.placement_id),
    reconcileHydratedBlockLayoutSurfaceAuthority(item.layout, pageFrames, options.coordinateContract),
  ]));
  return blocks.map((block) => {
    const layout = block.placement_id
      ? layoutsByPlacementId.get(placementHydrationKey(block.placement_id))
      : layoutsByBlockId.get(block.id);
    return layout ? { ...block, canvas_layout: layout } : block;
  });
}

export async function loadCanvasPersistenceForNote(input: {
  note: Note;
  importLegacy?: boolean;
  contractSession?: CoordinateContractSession;
}): Promise<NoteCanvasPersistencePayload> {
  const coordinateContract = await (input.contractSession || createCoordinateContractSession()).load();
  const response = await api.get<NoteCanvasPersistencePayload>(`/canvas-objects/by-note/${input.note.id}`);
  const legacyCollection = pageFrameCollectionFromMetadata(input.note.metadata);
  const entityPayload = {
    ...normalizeCanvasPersistencePayload(response.data, coordinateContract, legacyCollection?.pageFrames), coordinateContract,
  };

  if (input.importLegacy !== false && !entityPayload.pageFrameCollection && legacyCollection) {
    const savedCollection = await savePageFrameCollectionForNote({
      noteId: input.note.id,
      collection: legacyCollection,
    });
    return {
      ...entityPayload,
      pageFrameCollection: savedCollection,
    };
  }

  return entityPayload;
}

export interface PageFrameBlockLayoutUpdate {
  block: Pick<NoteBlock, 'id' | 'placement_id'>;
  layout: BlockBoxLayout;
}

export interface PageFrameObjectLayoutUpdate {
  objectId: string;
  placementId: string;
  /** Stored frame-local layout captured for this collection, not world geometry. */
  layout: Record<string, unknown>;
}

export async function savePageFrameCollectionForNote(input: {
  noteId: string;
  collection: PageFrameCollectionModel;
  layoutUpdates?: PageFrameBlockLayoutUpdate[];
  objectLayoutUpdates?: PageFrameObjectLayoutUpdate[];
  coordinateContract?: CoordinateContract;
}): Promise<PageFrameCollectionModel> {
  const normalized = normalizePageFrameCollection(input.collection);
  const layoutUpdates = input.layoutUpdates?.map(({ block, layout }) => {
    assertNoRetiredCanvasWrite(layout);
    return {
      placement_id: block.placement_id,
      block_id: block.id,
      layout: requireCanvasPlacementWritePayload(buildLayoutPayload(
        normalizeBlockLayoutForSave(layout, normalized, input.coordinateContract),
        input.coordinateContract,
        normalized.pageFrames,
      )),
    };
  });
  const objectLayoutUpdates = input.objectLayoutUpdates?.map(({ objectId, placementId, layout }) => ({
    object_id: objectId,
    placement_id: placementId,
    layout: requireCanvasPlacementWritePayload(layout),
  }));
  const response = await api.put<PageFrameCollectionModel>(
    `/canvas-objects/by-note/${input.noteId}/page-frame-collection`,
    {
      collection: normalized,
      ...(layoutUpdates?.length ? { layout_updates: layoutUpdates } : {}),
      ...(objectLayoutUpdates?.length ? { object_layout_updates: objectLayoutUpdates } : {}),
    },
  );
  return normalizePageFrameCollection(response.data || normalized);
}

export async function saveBlockCanvasPlacementForNote(input: {
  noteId: string;
  block: Pick<NoteBlock, 'id' | 'placement_id'>;
  layout: BlockBoxLayout;
  pageFrameCollection?: PageFrameCollectionModel | null;
  coordinateContract?: CoordinateContract;
}): Promise<CanvasBlockLayoutRecord> {
  assertNoRetiredCanvasWrite(input.layout);
  const response = await api.put<CanvasBlockLayoutRecord>(
    `/canvas-objects/by-note/${input.noteId}/block-placements/${input.block.placement_id}`,
    {
      block_id: input.block.id,
      layout: requireCanvasPlacementWritePayload(buildLayoutPayload(
        normalizeBlockLayoutForSave(input.layout, input.pageFrameCollection, input.coordinateContract),
        input.coordinateContract,
        input.pageFrameCollection?.pageFrames,
      )),
    },
  );
  return {
    ...response.data,
    layout: reconcileHydratedBlockLayoutSurfaceAuthority(
      response.data.layout,
      input.pageFrameCollection?.pageFrames || [],
      input.coordinateContract,
    ),
  };
}

export async function saveGenericCanvasObjectForNote(input: {
  noteId: string;
  objectId: string;
  payload: Record<string, unknown>;
  coordinateContract?: CoordinateContract;
  pageFrameCollection?: PageFrameCollectionModel | null;
}): Promise<Record<string, unknown>> {
  if (input.payload.placement && typeof input.payload.placement === 'object') {
    assertNoRetiredCanvasWrite(input.payload.placement);
  }
  const response = await api.put<Record<string, unknown>>(
    `/canvas-objects/by-note/${input.noteId}/objects/${input.objectId}`,
    requireCanvasObjectWritePayload(toStoredGenericCanvasObjectPayload(input.payload, input.pageFrameCollection?.pageFrames || [], input.coordinateContract)),
  );
  return response.data;
}

export async function deleteGenericCanvasObjectForNote(input: {
  noteId: string;
  objectId: string;
}): Promise<Record<string, unknown>> {
  const response = await api.delete<Record<string, unknown>>(
    `/canvas-objects/by-note/${input.noteId}/objects/${input.objectId}`,
  );
  return response.data;
}
