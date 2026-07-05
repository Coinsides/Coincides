import {
  resolvePageStackContext,
} from './pageStackCollectionService';
import type {
  CanvasRect,
  PageFrameCollectionModel,
  PageFrameModel,
  PageSliceReferenceDescriptor,
  PageSliceSnapshotV1,
} from './types';

interface CreatePageSliceSnapshotInput {
  collection: PageFrameCollectionModel;
  noteId: string;
  pageFrameId: string;
  blockIds?: string[];
  snapshotText?: string | null;
  capturedAt?: string;
  id?: string;
  metadata?: Record<string, unknown>;
}

function pageFrameRect(pageFrame: PageFrameModel): CanvasRect {
  return {
    x: pageFrame.x,
    y: pageFrame.y,
    width: pageFrame.width,
    height: pageFrame.height,
  };
}

function pageFrameContentRect(pageFrame: PageFrameModel): CanvasRect {
  return {
    x: pageFrame.x + pageFrame.contentInset.left,
    y: pageFrame.y + pageFrame.contentInset.top,
    width: Math.max(0, pageFrame.width - pageFrame.contentInset.left - pageFrame.contentInset.right),
    height: Math.max(0, pageFrame.height - pageFrame.contentInset.top - pageFrame.contentInset.bottom),
  };
}

function pageSliceSnapshotHash(text: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `fnv1a:${(hash >>> 0).toString(16)}:${text.length}`;
}

function pageSliceId(input: CreatePageSliceSnapshotInput, capturedAt: string): string {
  return input.id || `page-slice:${input.noteId}:${input.pageFrameId}:${capturedAt}`;
}

function pageSliceLabel(pageNumberLabel: string): string {
  return `Page ${pageNumberLabel}`;
}

export function createPageSliceSnapshot(input: CreatePageSliceSnapshotInput): PageSliceSnapshotV1 | null {
  const pageFrame = input.collection.pageFrames.find((frame) => frame.id === input.pageFrameId);
  if (!pageFrame) return null;
  const context = resolvePageStackContext(input.collection, pageFrame.id);
  if (!context) return null;

  const capturedAt = input.capturedAt || new Date().toISOString();
  const label = pageSliceLabel(context.pageNumberLabel);
  const blockIds = [...(input.blockIds || [])];
  const snapshotText = (input.snapshotText || '').trim()
    || `${label} snapshot (${blockIds.length} block${blockIds.length === 1 ? '' : 's'})`;

  return {
    id: pageSliceId(input, capturedAt),
    kind: 'page_slice_snapshot',
    source: 'page_stack_page',
    noteId: input.noteId,
    pageFrameId: pageFrame.id,
    pageStackId: context.stack.id,
    pageIndex: context.index,
    pageTotal: context.total,
    label,
    bbox: pageFrameRect(pageFrame),
    contentBbox: pageFrameContentRect(pageFrame),
    blockIds,
    snapshotText,
    snapshotHash: pageSliceSnapshotHash(snapshotText),
    capturedAt,
    openOriginal: {
      noteId: input.noteId,
      pageStackId: context.stack.id,
      pageFrameId: pageFrame.id,
    },
    metadata: {
      ...(input.metadata || {}),
      page_number: context.pageNumber,
      page_number_label: context.pageNumberLabel,
    },
  };
}

export function createPageSliceReferenceDescriptor(
  snapshot: PageSliceSnapshotV1,
): PageSliceReferenceDescriptor {
  return {
    mode: 'reference',
    snapshotId: snapshot.id,
    noteId: snapshot.noteId,
    pageFrameId: snapshot.pageFrameId,
    pageStackId: snapshot.pageStackId,
    pageIndex: snapshot.pageIndex,
    pageTotal: snapshot.pageTotal,
    label: snapshot.label,
    previewText: snapshot.snapshotText,
    openOriginal: { ...snapshot.openOriginal },
  };
}
