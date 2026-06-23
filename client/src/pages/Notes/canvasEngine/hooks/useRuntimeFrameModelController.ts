import { useNoteCanvasFrameModel } from './useNoteCanvasLayoutModel';
import type { NoteBlock } from '../runtimeDataTypes';
import type { BlockBoxLayout, SurfaceMode } from '../runtimeLayout';
import type { CanvasViewport } from '../types';

export interface UseRuntimeFrameModelControllerOptions {
  blockLayouts: Record<string, BlockBoxLayout>;
  defaultDraftLayout: BlockBoxLayout;
  draftActive: boolean;
  draftLayout: BlockBoxLayout | null;
  pageOffsetX: number;
  surfaceMode: SurfaceMode;
  viewportTransform: CanvasViewport;
  visibleBlocks: NoteBlock[];
}

export function useRuntimeFrameModelController({
  blockLayouts,
  defaultDraftLayout,
  draftActive,
  draftLayout,
  pageOffsetX,
  surfaceMode,
  viewportTransform,
  visibleBlocks,
}: UseRuntimeFrameModelControllerOptions) {
  return useNoteCanvasFrameModel({
    blockLayouts,
    defaultDraftLayout,
    draftActive,
    draftLayout,
    pageOffsetX,
    surfaceMode,
    viewportTransform,
    visibleBlocks,
  });
}
