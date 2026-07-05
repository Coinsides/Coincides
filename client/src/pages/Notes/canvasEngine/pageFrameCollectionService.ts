import { createPrimaryPageFrame } from './engineModel';
import { normalizePageFramePrintBaseline } from './pageFramePrintScaleService';
import {
  createPageStackFromFrame,
  normalizePageStacksWithFrameCoverage,
} from './pageStackCollectionService';
import type {
  PageFrameCollectionModel,
  PageFrameModel,
  PageStackModel,
} from './types';

export const NOTE_PAGE_FRAME_COLLECTION_METADATA_KEY = 'canvas_engine_page_frames_v1';
export const PAGE_FRAME_COLLECTION_VERSION = 'V2.BN.8.9.14';

const PAGE_FRAME_INSERT_GAP = 80;
const MIN_PAGE_FRAME_CONTENT_WIDTH = 240;
const MIN_PAGE_FRAME_CONTENT_HEIGHT = 320;

type PageFrameUpdatePatch = Partial<Pick<
  PageFrameModel,
  | 'x'
  | 'y'
  | 'width'
  | 'height'
  | 'contentInset'
  | 'templateId'
  | 'pageSize'
  | 'background'
  | 'exportable'
>>;

function validPageFrame(item: unknown): item is PageFrameModel {
  if (!item || typeof item !== 'object') return false;
  const frame = item as Partial<PageFrameModel>;
  return typeof frame.id === 'string'
    && typeof frame.x === 'number'
    && typeof frame.y === 'number'
    && typeof frame.width === 'number'
    && typeof frame.height === 'number'
    && typeof frame.exportable === 'boolean'
    && Boolean(frame.contentInset)
    && typeof frame.contentInset?.top === 'number'
    && typeof frame.contentInset?.right === 'number'
    && typeof frame.contentInset?.bottom === 'number'
    && typeof frame.contentInset?.left === 'number';
}

function nextPageFrameId(pageFrames: PageFrameModel[]): string {
  const existing = new Set(pageFrames.map((frame) => frame.id));
  let index = pageFrames.length + 1;
  let candidate = `page-frame-${index}`;
  while (existing.has(candidate)) {
    index += 1;
    candidate = `page-frame-${index}`;
  }
  return candidate;
}

function normalizeFrame(frame: PageFrameModel, primaryFrameId: string | null): PageFrameModel {
  const printScaledFrame = normalizePageFramePrintBaseline(frame);
  return {
    ...printScaledFrame,
    role: printScaledFrame.id === primaryFrameId ? 'primary_page_frame' : 'secondary_page_frame',
    exportable: printScaledFrame.exportable ?? true,
    contentInset: printScaledFrame.contentInset,
  };
}

function clampOperablePageFrameGeometry(frame: PageFrameModel): PageFrameModel {
  const minWidth = frame.contentInset.left + frame.contentInset.right + MIN_PAGE_FRAME_CONTENT_WIDTH;
  const minHeight = frame.contentInset.top + frame.contentInset.bottom + MIN_PAGE_FRAME_CONTENT_HEIGHT;
  return {
    ...frame,
    width: Math.max(frame.width, minWidth),
    height: Math.max(frame.height, minHeight),
  };
}

function normalizeFramesWithFallback(
  pageFrames: PageFrameModel[],
  fallbackPageFrame?: PageFrameModel | null,
): PageFrameModel[] {
  if (pageFrames.length === 0) return fallbackPageFrame ? [fallbackPageFrame] : [];
  if (!fallbackPageFrame) return pageFrames;
  return pageFrames.map((frame) => (
    frame.id === fallbackPageFrame.id
      ? {
        ...fallbackPageFrame,
        exportable: frame.exportable,
        contentInset: frame.contentInset || fallbackPageFrame.contentInset,
      }
      : frame
  ));
}

function resolveStackIdForFrame(
  pageStacks: PageStackModel[],
  frameId: string | null | undefined,
): string | null {
  if (!frameId) return null;
  return pageStacks.find((stack) => stack.frameIds.includes(frameId))?.id || null;
}

export function normalizePageFrameCollection(
  collection: PageFrameCollectionModel | null | undefined,
  options: { fallbackPageFrame?: PageFrameModel | null } = {},
): PageFrameCollectionModel {
  const explicitPageFrames = collection ? collection.pageFrames.filter(validPageFrame) : [];
  const pageFrames = normalizeFramesWithFallback(explicitPageFrames, collection ? null : options.fallbackPageFrame);
  const primaryFrameId = pageFrames.some((frame) => frame.id === collection?.primaryFrameId)
    ? collection?.primaryFrameId || null
    : pageFrames[0]?.id || null;
  const selectedFrameId = pageFrames.some((frame) => frame.id === collection?.selectedFrameId)
    ? collection?.selectedFrameId || primaryFrameId
    : primaryFrameId;
  const normalizedPageFrames = pageFrames.map((frame) => normalizeFrame(frame, primaryFrameId));
  const pageStacks = normalizePageStacksWithFrameCoverage({
    pageFrames: normalizedPageFrames,
    pageStacks: collection?.pageStacks || [],
    primaryFrameId,
    selectedFrameId,
  });
  const stackIds = new Set(pageStacks.map((stack) => stack.id));
  const primaryStackId = collection?.primaryStackId && stackIds.has(collection.primaryStackId)
    ? collection.primaryStackId
    : pageStacks[0]?.id || null;
  const selectedFrameStackId = resolveStackIdForFrame(pageStacks, selectedFrameId);
  const selectedStackId = collection?.selectedStackId
    && stackIds.has(collection.selectedStackId)
    && (!selectedFrameStackId || collection.selectedStackId === selectedFrameStackId)
    ? collection.selectedStackId
    : selectedFrameStackId || primaryStackId;

  return {
    pageFrames: normalizedPageFrames,
    pageStacks,
    primaryFrameId,
    primaryStackId,
    selectedFrameId,
    selectedStackId,
  };
}

export function createPageFrameCollectionSeed(
  primaryPageFrame: PageFrameModel = createPrimaryPageFrame(),
): PageFrameCollectionModel {
  const primaryStack = createPageStackFromFrame(primaryPageFrame, {
    createdFrom: 'a4_note_seed',
  });
  return normalizePageFrameCollection({
    pageFrames: [primaryPageFrame],
    pageStacks: [primaryStack],
    primaryFrameId: primaryPageFrame.id,
    primaryStackId: primaryStack.id,
    selectedFrameId: primaryPageFrame.id,
    selectedStackId: primaryStack.id,
  });
}

function createInsertedFrame({
  source,
  pageFrames,
  id,
}: {
  source: PageFrameModel;
  pageFrames: PageFrameModel[];
  id?: string;
}): PageFrameModel {
  return {
    ...source,
    id: id || nextPageFrameId(pageFrames),
    role: 'secondary_page_frame',
    y: source.y + source.height + PAGE_FRAME_INSERT_GAP,
  };
}

export function insertPageFrameAfter(
  collection: PageFrameCollectionModel,
  afterFrameId: string,
  options: { id?: string } = {},
): PageFrameCollectionModel {
  const normalized = normalizePageFrameCollection(collection);
  const sourceIndex = normalized.pageFrames.findIndex((frame) => frame.id === afterFrameId);
  const source = sourceIndex >= 0
    ? normalized.pageFrames[sourceIndex]
    : normalized.pageFrames[normalized.pageFrames.length - 1];
  if (!source) return normalized;
  const insertedFrame = createInsertedFrame({
    source,
    pageFrames: normalized.pageFrames,
    id: options.id,
  });
  const insertIndex = sourceIndex >= 0 ? sourceIndex + 1 : normalized.pageFrames.length;

  return normalizePageFrameCollection({
    ...normalized,
    pageFrames: [
      ...normalized.pageFrames.slice(0, insertIndex),
      insertedFrame,
      ...normalized.pageFrames.slice(insertIndex),
    ],
    selectedFrameId: insertedFrame.id,
  });
}

export function duplicatePageFrame(
  collection: PageFrameCollectionModel,
  frameId: string,
  options: { id?: string } = {},
): PageFrameCollectionModel {
  const normalized = normalizePageFrameCollection(collection);
  const source = normalized.pageFrames.find((frame) => frame.id === frameId);
  if (!source) return normalized;
  return insertPageFrameAfter(normalized, source.id, options);
}

export function setPrimaryPageFrame(
  collection: PageFrameCollectionModel,
  frameId: string,
): PageFrameCollectionModel {
  const normalized = normalizePageFrameCollection(collection);
  if (!normalized.pageFrames.some((frame) => frame.id === frameId)) return normalized;
  return normalizePageFrameCollection({
    ...normalized,
    primaryFrameId: frameId,
    selectedFrameId: frameId,
  });
}

export function selectPageFrame(
  collection: PageFrameCollectionModel,
  frameId: string,
): PageFrameCollectionModel {
  const normalized = normalizePageFrameCollection(collection);
  if (!normalized.pageFrames.some((frame) => frame.id === frameId)) return normalized;
  return {
    ...normalized,
    selectedFrameId: frameId,
  };
}

export function updatePageFrameInCollection(
  collection: PageFrameCollectionModel,
  frameId: string,
  patch: PageFrameUpdatePatch,
): PageFrameCollectionModel {
  const normalized = normalizePageFrameCollection(collection);
  let updated = false;
  const pageFrames = normalized.pageFrames.map((frame) => {
    if (frame.id !== frameId) return frame;
    updated = true;
    return clampOperablePageFrameGeometry({
      ...frame,
      ...patch,
      contentInset: patch.contentInset || frame.contentInset,
    });
  });
  if (!updated) return normalized;
  return normalizePageFrameCollection({
    ...normalized,
    pageFrames,
    selectedFrameId: frameId,
  });
}

export function movePageFrameInCollection(
  collection: PageFrameCollectionModel,
  frameId: string,
  delta: { dx: number; dy: number },
): PageFrameCollectionModel {
  const normalized = normalizePageFrameCollection(collection);
  const frame = normalized.pageFrames.find((item) => item.id === frameId);
  if (!frame) return normalized;
  return updatePageFrameInCollection(normalized, frameId, {
    x: frame.x + delta.dx,
    y: frame.y + delta.dy,
  });
}

export function resizePageFrameInCollection(
  collection: PageFrameCollectionModel,
  frameId: string,
  size: { width: number; height: number },
): PageFrameCollectionModel {
  return updatePageFrameInCollection(collection, frameId, {
    width: size.width,
    height: size.height,
  });
}

export function deletePageFrameFromCollection(
  collection: PageFrameCollectionModel,
  frameId: string,
): PageFrameCollectionModel {
  const normalized = normalizePageFrameCollection(collection);
  const deletedIndex = normalized.pageFrames.findIndex((frame) => frame.id === frameId);
  if (deletedIndex < 0) return normalized;
  const pageFrames = normalized.pageFrames.filter((frame) => frame.id !== frameId);
  const nextPrimaryFrameId = normalized.primaryFrameId === frameId
    ? pageFrames[deletedIndex]?.id || pageFrames[Math.max(0, deletedIndex - 1)]?.id || null
    : normalized.primaryFrameId;
  return normalizePageFrameCollection({
    ...normalized,
    pageFrames,
    pageStacks: normalized.pageStacks,
    primaryFrameId: nextPrimaryFrameId,
    selectedFrameId: nextPrimaryFrameId,
  });
}

export function pageFrameCollectionFromMetadata(
  metadata: Record<string, unknown> | undefined,
): PageFrameCollectionModel | null {
  const raw = metadata?.[NOTE_PAGE_FRAME_COLLECTION_METADATA_KEY];
  if (!raw || typeof raw !== 'object') return null;
  const payload = raw as Partial<PageFrameCollectionModel> & {
    pageFrames?: unknown;
    pageStacks?: unknown;
  };
  if (!Array.isArray(payload.pageFrames)) return null;
  return normalizePageFrameCollection({
    pageFrames: payload.pageFrames.filter(validPageFrame),
    pageStacks: Array.isArray(payload.pageStacks)
      ? payload.pageStacks.filter((stack): stack is PageStackModel => Boolean(stack) && typeof stack === 'object')
      : [],
    primaryFrameId: typeof payload.primaryFrameId === 'string' ? payload.primaryFrameId : null,
    primaryStackId: typeof payload.primaryStackId === 'string' ? payload.primaryStackId : null,
    selectedFrameId: typeof payload.selectedFrameId === 'string' ? payload.selectedFrameId : null,
    selectedStackId: typeof payload.selectedStackId === 'string' ? payload.selectedStackId : null,
  });
}

export function writePageFrameCollectionMetadata(
  metadata: Record<string, unknown> | undefined,
  collection: PageFrameCollectionModel,
): Record<string, unknown> {
  const normalized = normalizePageFrameCollection(collection);
  return {
    ...(metadata || {}),
    [NOTE_PAGE_FRAME_COLLECTION_METADATA_KEY]: {
      version: PAGE_FRAME_COLLECTION_VERSION,
      pageFrames: normalized.pageFrames,
      pageStacks: normalized.pageStacks || [],
      primaryFrameId: normalized.primaryFrameId,
      primaryStackId: normalized.primaryStackId || null,
      selectedFrameId: normalized.selectedFrameId || normalized.primaryFrameId,
      selectedStackId: normalized.selectedStackId || normalized.primaryStackId || null,
    },
  };
}
