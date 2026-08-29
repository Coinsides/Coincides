import { useMemo, type RefObject } from 'react';
import { useCanvasContentWidth } from './useCanvasContentWidth';
import { useLayoutPersistenceController } from './useLayoutPersistenceController';
import { useNoteCanvasResolvedLayoutModel } from './useNoteCanvasLayoutModel';
import type { SurfaceModePolicy } from '../modePolicyService';
import { createRuntimePageFrame } from '../pageFrameService';
import type { NoteBlock } from '../runtimeDataTypes';
import {
  DEFAULT_PAGE_FRAME_HEIGHT,
  type BlockBoxLayout,
  type SurfaceMode,
} from '../runtimeLayout';
import type {
  DocumentTypographyProfile,
  PageFrameCollectionModel,
} from '../types';

export interface UseRuntimeLayoutModelControllerOptions {
  blocks: NoteBlock[];
  blockListRef: RefObject<HTMLElement>;
  documentTypographyProfile: DocumentTypographyProfile;
  layoutDrafts: Record<string, BlockBoxLayout>;
  pageOffsetX: number;
  pageFrameCollection: PageFrameCollectionModel | null;
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
  pageFrameCollection,
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

  const pageFrames = useMemo(() => {
    if (pageFrameCollection) return pageFrameCollection.pageFrames;
    return [createRuntimePageFrame({
      contentX: pageOffsetX,
      height: DEFAULT_PAGE_FRAME_HEIGHT,
    })];
  }, [pageFrameCollection, pageOffsetX]);

  const {
    blockLayouts,
    defaultDraftLayout,
    visibleBlocks,
  } = useNoteCanvasResolvedLayoutModel({
    contentWidth,
    documentTypographyProfile,
    layoutDrafts,
    pageFrames,
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
    pageFrames,
    visibleBlocks,
  };
}
