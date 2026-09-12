import type { CoordinateContract } from '../placementContractService';
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
  notePagePreset?: string;
  coordinateContract?: CoordinateContract;
  blocks: NoteBlock[];
  blockListRef: RefObject<HTMLElement>;
  documentTypographyProfile: DocumentTypographyProfile;
  layoutDrafts: Record<string, BlockBoxLayout>;
  pageOffsetX: number;
  pageFrameCollection: PageFrameCollectionModel | null;
  persistBlockLayout: (block: NoteBlock, layout: BlockBoxLayout) => void | boolean | Promise<void | boolean>;
  sortedBlocks: NoteBlock[];
  surfaceMode: SurfaceMode;
  surfacePolicy: SurfaceModePolicy;
}

export function useRuntimeLayoutModelController({
  notePagePreset,
  blocks,
  coordinateContract,
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
  const measuredContentWidth = useCanvasContentWidth({
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

  const webFrame = notePagePreset === 'screen_note'
    ? pageFrameCollection?.pageFrames.find((frame) => frame.id === pageFrameCollection.primaryFrameId)
      || pageFrameCollection?.pageFrames[0]
    : undefined;
  // New Web notes have a fixed frame, including while the editor DOM is still
  // mounting. Their content width must not wait for a window resize to be known.
  const contentWidth = webFrame
    ? Math.max(0, webFrame.width - webFrame.contentInset.left - webFrame.contentInset.right)
    : measuredContentWidth;

  const {
    blockLayouts,
    defaultDraftLayout,
    visibleBlocks,
  } = useNoteCanvasResolvedLayoutModel({
    contentWidth,
    coordinateContract,
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
    coordinateContract,
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
