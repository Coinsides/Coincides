import api from '@/services/api';
import { createCoordinateContractSession, type CoordinateContractSession } from './coordinateContractSession';
import {
  requiresFrameLocalWriteContext,
  requireStoredLayout,
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
    item.placement_id,
    reconcileHydratedBlockLayoutSurfaceAuthority(item.layout, pageFrames, options.coordinateContract),
  ]));
  return blocks.map((block) => {
    const layout = block.placement_id
      ? layoutsByPlacementId.get(block.placement_id)
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

export async function savePageFrameCollectionForNote(input: {
  noteId: string;
  collection: PageFrameCollectionModel;
}): Promise<PageFrameCollectionModel> {
  const normalized = normalizePageFrameCollection(input.collection);
  const response = await api.put<PageFrameCollectionModel>(
    `/canvas-objects/by-note/${input.noteId}/page-frame-collection`,
    { collection: normalized },
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
  const response = await api.put<CanvasBlockLayoutRecord>(
    `/canvas-objects/by-note/${input.noteId}/block-placements/${input.block.placement_id}`,
    {
      block_id: input.block.id,
      layout: buildLayoutPayload(requireStoredLayout(input.layout, input.pageFrameCollection?.pageFrames || [], input.coordinateContract)),
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
  const response = await api.put<Record<string, unknown>>(
    `/canvas-objects/by-note/${input.noteId}/objects/${input.objectId}`,
    toStoredGenericCanvasObjectPayload(input.payload, input.pageFrameCollection?.pageFrames || [], input.coordinateContract),
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
