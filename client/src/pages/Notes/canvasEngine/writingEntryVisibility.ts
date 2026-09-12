import {
  hasMeaningfulRenderableBlockContent,
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
  annotationTruths,
  blockTextDrafts,
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

  return false;
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
