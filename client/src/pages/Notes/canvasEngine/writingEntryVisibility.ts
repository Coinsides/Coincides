import {
  hasMeaningfulRenderableBlockContent,
  textFromContent,
} from './blockContentService';
import type { RuntimeInteractionState } from './interactionController';
import type {
  AnnotationTruthV1,
  NoteBlock,
} from './runtimeDataTypes';
import {
  textFocusReceiptsEqual,
  type TextFocusReceipt,
} from './textFocusReceipt';
import type {
  CanvasObject,
  CanvasPlacement,
  ContentMount,
  ImageCanvasObject,
  StructuredCanvasObject,
} from './types';

export interface MeaningfulWritingSurfaceContentInput {
  allBlocks: NoteBlock[];
  annotationTruths: AnnotationTruthV1[];
  blockTextDrafts: Record<string, string>;
  canvasObjects: CanvasObject[];
  canvasPlacements: CanvasPlacement[];
  contentMounts: ContentMount[];
  imageObjects: ImageCanvasObject[];
  surfaceMode: 'page' | 'canvas';
  structuredObjects: StructuredCanvasObject[];
  visibleBlocks: NoteBlock[];
}

export function hasMeaningfulWritingSurfaceContent({
  allBlocks,
  annotationTruths,
  blockTextDrafts,
  canvasObjects,
  canvasPlacements,
  contentMounts,
  imageObjects,
  surfaceMode,
  structuredObjects,
  visibleBlocks,
}: MeaningfulWritingSurfaceContentInput): boolean {
  const visibleBlockIds = new Set(visibleBlocks.map((block) => block.id));
  if (visibleBlocks.some((block) => (
    hasMeaningfulRenderableBlockContent(block)
    || Boolean(blockTextDrafts[block.id]?.trim())
  ))) return true;

  if (annotationTruths.some((annotation) => (
    annotation.status === 'active'
    && annotation.ranges.some((range) => Boolean(range.block_id && visibleBlockIds.has(range.block_id)))
  ))) return true;

  // Image, table, and shape layers are Canvas-only. Page must not hide its
  // writing entry for an object that the current surface cannot render.
  if (surfaceMode !== 'canvas') return false;

  const canvasObjectById = new Map(canvasObjects.map((object) => [object.objectId, object]));
  const renderableCanvasObjectIds = new Set(
    canvasPlacements
      .filter((placement) => canvasObjectById.get(placement.objectId)?.status === 'active')
      .map((placement) => placement.objectId),
  );
  const imageObjectIds = new Set(imageObjects.map((object) => object.objectId));
  const structuredObjectIds = new Set(structuredObjects.map((object) => object.objectId));
  if ([...renderableCanvasObjectIds].some((objectId) => {
    const object = canvasObjectById.get(objectId);
    return (object?.kind === 'image' && imageObjectIds.has(objectId))
      || (object?.kind === 'table' && structuredObjectIds.has(objectId));
  })) return true;

  const activeShapeIds = new Set(
    [...renderableCanvasObjectIds]
      .filter((objectId) => canvasObjectById.get(objectId)?.kind === 'shape'),
  );
  const blockById = new Map(allBlocks.map((block) => [block.id, block]));
  return contentMounts.some((mount) => {
    if (!activeShapeIds.has(mount.objectId) || mount.targetKind !== 'note_block') return false;
    const block = blockById.get(mount.targetId);
    if (!block) return false;
    if (Object.prototype.hasOwnProperty.call(blockTextDrafts, block.id)) {
      return Boolean(blockTextDrafts[block.id]?.trim());
    }
    return hasMeaningfulRenderableBlockContent(block) || Boolean(textFromContent(block).trim());
  });
}

export interface PendingWritingEditorInput {
  creatingDraft: boolean;
  draftActive: boolean;
  focusedTextOwner: TextFocusReceipt | null;
  interactionState: RuntimeInteractionState;
  placementPending: boolean;
}

export function hasLegitimatePendingWritingEditor({
  creatingDraft,
  draftActive,
  focusedTextOwner,
  interactionState,
  placementPending,
}: PendingWritingEditorInput): boolean {
  if (draftActive || creatingDraft || placementPending) return true;
  if (interactionState.mode !== 'editingText' || interactionState.target !== 'block') return false;
  const interactionReceipt = interactionState.blockId
    && interactionState.textFlowId
    && interactionState.textUnitId
    ? {
      blockId: interactionState.blockId,
      textFlowId: interactionState.textFlowId,
      textUnitId: interactionState.textUnitId,
    }
    : null;
  return textFocusReceiptsEqual(focusedTextOwner, interactionReceipt);
}
