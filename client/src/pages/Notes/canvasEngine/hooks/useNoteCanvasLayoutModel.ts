import { useMemo } from 'react';
import { buildNoteCanvasRuntimeModel } from '../engineModel';
import { buildExportPreviewModel } from '../exportPreviewService';
import { estimateBlockHeight } from '../measurementService';
import {
  getVisibleBlocksForSurface,
  type SurfaceModePolicy,
} from '../modePolicyService';
import {
  calculatePageFrameHeight,
  createDefaultDraftLayout,
  createRuntimePageFrame,
} from '../pageFrameService';
import {
  buildRelationEndpointReserveForPlacement,
  buildDefaultBlockLayouts,
  buildRuntimeBlockPlacement,
  normalizeBlockLayout,
} from '../placementService';
import {
  type BlockBoxLayout,
  type SurfaceMode,
} from '../runtimeLayout';
import type { NoteBlock } from '../runtimeDataTypes';
import type { BlockPlacementModel, RelationEndpointReserve } from '../types';
import {
  createRuntimeViewport,
  createRuntimeWorld,
} from '../viewportService';

export interface UseNoteCanvasResolvedLayoutModelOptions {
  contentWidth: number;
  layoutDrafts: Record<string, BlockBoxLayout>;
  sortedBlocks: NoteBlock[];
  surfaceMode: SurfaceMode;
  surfacePolicy: SurfaceModePolicy;
}

export interface UseNoteCanvasFrameModelOptions {
  blockLayouts: Record<string, BlockBoxLayout>;
  defaultDraftLayout: BlockBoxLayout;
  draftActive: boolean;
  draftLayout: BlockBoxLayout | null;
  pageOffsetX: number;
  surfaceMode: SurfaceMode;
  visibleBlocks: NoteBlock[];
}

export function useNoteCanvasResolvedLayoutModel({
  contentWidth,
  layoutDrafts,
  sortedBlocks,
  surfaceMode,
  surfacePolicy,
}: UseNoteCanvasResolvedLayoutModelOptions) {
  const visibleBlocks = useMemo(
    () => getVisibleBlocksForSurface(sortedBlocks, surfacePolicy, contentWidth),
    [contentWidth, sortedBlocks, surfacePolicy],
  );

  const blockLayouts = useMemo(() => {
    const defaults = buildDefaultBlockLayouts(visibleBlocks, contentWidth, estimateBlockHeight);
    return visibleBlocks.reduce<Record<string, BlockBoxLayout>>((acc, block) => {
      const draft = layoutDrafts[block.id];
      acc[block.id] = draft || normalizeBlockLayout({
        block,
        fallback: defaults[block.id],
        contentWidth,
        surfaceMode,
        estimateHeight: estimateBlockHeight,
      });
      return acc;
    }, {});
  }, [contentWidth, layoutDrafts, surfaceMode, visibleBlocks]);

  const defaultDraftLayout = useMemo(() => {
    return createDefaultDraftLayout(blockLayouts, contentWidth);
  }, [blockLayouts, contentWidth]);

  return {
    visibleBlocks,
    blockLayouts,
    defaultDraftLayout,
  };
}

export function useNoteCanvasFrameModel({
  blockLayouts,
  defaultDraftLayout,
  draftActive,
  draftLayout,
  pageOffsetX,
  surfaceMode,
  visibleBlocks,
}: UseNoteCanvasFrameModelOptions) {
  const pageContentHeight = useMemo(() => {
    return calculatePageFrameHeight({
      blockLayouts,
      draftActive,
      draftLayout,
      defaultDraftLayout,
    });
  }, [blockLayouts, draftActive, draftLayout, defaultDraftLayout]);

  const primaryPageFrame = useMemo(
    () => createRuntimePageFrame({
      x: pageOffsetX,
      height: pageContentHeight,
    }),
    [pageContentHeight, pageOffsetX],
  );

  const canvasBlockPlacements = useMemo<BlockPlacementModel[]>(
    () => visibleBlocks.flatMap((block, index) => {
      const layout = blockLayouts[block.id];
      if (!layout) return [];
      return [buildRuntimeBlockPlacement({
        block,
        canvasId: 'primary-note-canvas',
        layout,
        pageOffsetX,
        pageFrame: primaryPageFrame,
        zIndex: index,
      })];
    }),
    [blockLayouts, pageOffsetX, primaryPageFrame, visibleBlocks],
  );

  const relationEndpointReserve = useMemo<RelationEndpointReserve[]>(
    () => canvasBlockPlacements.flatMap(buildRelationEndpointReserveForPlacement),
    [canvasBlockPlacements],
  );

  const noteCanvasRuntime = useMemo(() => {
    const viewport = createRuntimeViewport(surfaceMode, pageContentHeight);

    return buildNoteCanvasRuntimeModel({
      mode: surfaceMode,
      world: createRuntimeWorld(surfaceMode, pageContentHeight),
      primaryPageFrame,
      viewport,
      blockPlacements: canvasBlockPlacements,
      relationEndpointReserve,
    });
  }, [canvasBlockPlacements, pageContentHeight, primaryPageFrame, relationEndpointReserve, surfaceMode]);

  const exportPreview = useMemo(() => {
    return buildExportPreviewModel(visibleBlocks, blockLayouts);
  }, [visibleBlocks, blockLayouts]);

  return {
    canvasBlockPlacements,
    exportPreview,
    noteCanvasRuntime,
    pageContentHeight,
    primaryPageFrame,
  };
}
