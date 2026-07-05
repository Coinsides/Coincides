import type { RefObject } from 'react';
import { useCanvasContentWidth } from './useCanvasContentWidth';
import { useLayoutPersistenceController } from './useLayoutPersistenceController';
import { useNoteCanvasResolvedLayoutModel } from './useNoteCanvasLayoutModel';
import type { SurfaceModePolicy } from '../modePolicyService';
import type { NoteBlock } from '../runtimeDataTypes';
import type { BlockBoxLayout, SurfaceMode } from '../runtimeLayout';
import type { DocumentTypographyProfile } from '../types';

export interface UseRuntimeLayoutModelControllerOptions {
  blocks: NoteBlock[];
  blockListRef: RefObject<HTMLElement>;
  documentTypographyProfile: DocumentTypographyProfile;
  layoutDrafts: Record<string, BlockBoxLayout>;
  pageOffsetX: number;
  persistBlockLayout: (block: NoteBlock, layout: BlockBoxLayout) => void | Promise<void>;
  sortedBlocks: NoteBlock[];
  surfaceMode: SurfaceMode;
  surfacePolicy: SurfaceModePolicy;
}

export function useRuntimeLayoutModelController({
  blocks,
  blockListRef,
  documentTypographyProfile,
  layoutDrafts,
  pageOffsetX,
  persistBlockLayout,
  sortedBlocks,
  surfaceMode,
  surfacePolicy,
}: UseRuntimeLayoutModelControllerOptions) {
  const contentWidth = useCanvasContentWidth({
    containerRef: blockListRef,
    pageOffsetX,
    surfaceMode,
  });

  const {
    blockLayouts,
    defaultDraftLayout,
    visibleBlocks,
  } = useNoteCanvasResolvedLayoutModel({
    contentWidth,
    documentTypographyProfile,
    layoutDrafts,
    sortedBlocks,
    surfaceMode,
    surfacePolicy,
  });

  const {
    persistChangedBlockLayouts,
    persistLayoutSnapshot,
  } = useLayoutPersistenceController({
    blocks,
    blockLayouts,
    persistBlockLayout,
  });

  return {
    blockLayouts,
    contentWidth,
    defaultDraftLayout,
    persistChangedBlockLayouts,
    persistLayoutSnapshot,
    visibleBlocks,
  };
}
