import { useNoteCanvasFrameModel } from './useNoteCanvasLayoutModel';
import type { NoteBlock } from '../runtimeDataTypes';
import type { BlockBoxLayout, SurfaceMode } from '../runtimeLayout';

export interface UseRuntimeFrameModelControllerOptions {
  blockLayouts: Record<string, BlockBoxLayout>;
  defaultDraftLayout: BlockBoxLayout;
  draftActive: boolean;
  draftLayout: BlockBoxLayout | null;
  pageOffsetX: number;
  surfaceMode: SurfaceMode;
  visibleBlocks: NoteBlock[];
}

export function useRuntimeFrameModelController({
  blockLayouts,
  defaultDraftLayout,
  draftActive,
  draftLayout,
  pageOffsetX,
  surfaceMode,
  visibleBlocks,
}: UseRuntimeFrameModelControllerOptions) {
  return useNoteCanvasFrameModel({
    blockLayouts,
    defaultDraftLayout,
    draftActive,
    draftLayout,
    pageOffsetX,
    surfaceMode,
    visibleBlocks,
  });
}
