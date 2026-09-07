import { useMemo } from 'react';
import { buildNoteCanvasRuntimeModel } from '../engineModel';
import { buildExportPreviewModel } from '../exportPreviewService';
import { estimateBlockHeight } from '../measurementService';
import {
  getVisibleBlocksForSurface,
  isPageFrameAffiliatedWorkspaceBlock,
  type SurfaceModePolicy,
} from '../modePolicyService';
import {
  calculatePageFrameHeight,
  createDefaultDraftLayout,
  createPageModeFocusViewport,
  createRuntimePageFrame,
} from '../pageFrameService';
import {
  normalizePageFrameCollection,
} from '../pageFrameCollectionService';
import {
  buildRelationEndpointReserveForPlacement,
  buildDefaultBlockLayouts,
  buildRuntimeBlockPlacement,
  normalizeBlockLayout,
  normalizeResolvedBlockLayout,
} from '../placementService';
import {
  buildTextByContentTargetId,
} from '../shapeTextMountService';
import {
  type BlockBoxLayout,
  type SurfaceMode,
} from '../runtimeLayout';
import type { NoteBlock } from '../runtimeDataTypes';
import type {
  BlockPlacementModel,
  CanvasObject,
  CanvasPlacement,
  CanvasViewport,
  ContentMount,
  DocumentTypographyProfile,
  ImageCanvasObject,
  PageFrameCollectionModel,
  PageFrameModel,
  RelationEndpointReserve,
  StructuredCanvasObject,
  VisualConnector,
} from '../types';
import {
  createRuntimeViewport,
  createRuntimeWorld,
} from '../viewportService';

export interface UseNoteCanvasResolvedLayoutModelOptions {
  contentWidth: number;
  documentTypographyProfile: DocumentTypographyProfile;
  layoutDrafts: Record<string, BlockBoxLayout>;
  sortedBlocks: NoteBlock[];
  pageFrames: PageFrameModel[];
  surfaceMode: SurfaceMode;
  surfacePolicy: SurfaceModePolicy;
}

export interface UseNoteCanvasFrameModelOptions {
  blockLayouts: Record<string, BlockBoxLayout>;
  defaultDraftLayout: BlockBoxLayout;
  documentTypographyProfile: DocumentTypographyProfile;
  draftActive: boolean;
  draftLayout: BlockBoxLayout | null;
  pageFrameCollection: PageFrameCollectionModel | null;
  persistedCanvasObjects: CanvasObject[];
  persistedCanvasPlacements: CanvasPlacement[];
  persistedContentMounts: ContentMount[];
  persistedVisualConnectors: VisualConnector[];
  persistedImageObjects: ImageCanvasObject[];
  persistedStructuredObjects: StructuredCanvasObject[];
  contentLookupBlocks?: NoteBlock[];
  pageOffsetX: number;
  surfaceMode: SurfaceMode;
  viewportTransform: CanvasViewport;
  pageReadingViewport?: CanvasViewport;
  visibleBlocks: NoteBlock[];
}

export function useNoteCanvasResolvedLayoutModel({
  contentWidth,
  documentTypographyProfile,
  layoutDrafts,
  pageFrames,
  sortedBlocks,
  surfaceMode,
  surfacePolicy,
}: UseNoteCanvasResolvedLayoutModelOptions) {
  const estimateBlockHeightWithTypography = useMemo(
    () => (block: NoteBlock, width: number) => estimateBlockHeight(block, width, documentTypographyProfile),
    [documentTypographyProfile],
  );

  const visibleBlocks = useMemo(
    () => getVisibleBlocksForSurface(sortedBlocks, surfacePolicy, contentWidth, {
      pageFrames,
      boundary: 'outer',
    }),
    [contentWidth, pageFrames, sortedBlocks, surfacePolicy],
  );

  const pageAffiliatedWorkspaceBlockIds = useMemo(
    () => new Set(
      surfacePolicy.isPageMode
        ? visibleBlocks
          .filter((block) => isPageFrameAffiliatedWorkspaceBlock(
            block,
            contentWidth,
            pageFrames,
            'outer',
          ))
          .map((block) => block.id)
        : [],
    ),
    [contentWidth, pageFrames, surfacePolicy.isPageMode, visibleBlocks],
  );

  const blockLayouts = useMemo(() => {
    const defaults = buildDefaultBlockLayouts(visibleBlocks, contentWidth, estimateBlockHeightWithTypography);
    return visibleBlocks.reduce<Record<string, BlockBoxLayout>>((acc, block) => {
      const draft = layoutDrafts[block.id];
      const normalizationSurfaceMode = pageAffiliatedWorkspaceBlockIds.has(block.id)
        ? 'canvas'
        : surfaceMode;
      const resolved = draft || normalizeBlockLayout({
        block,
        fallback: defaults[block.id],
        contentWidth,
        surfaceMode: normalizationSurfaceMode,
        estimateHeight: estimateBlockHeightWithTypography,
      });
      acc[block.id] = normalizeResolvedBlockLayout({
        block,
        layout: resolved,
        contentWidth,
        surfaceMode: normalizationSurfaceMode,
        estimateHeight: estimateBlockHeightWithTypography,
      });
      return acc;
    }, {});
  }, [
    contentWidth,
    estimateBlockHeightWithTypography,
    layoutDrafts,
    pageAffiliatedWorkspaceBlockIds,
    surfaceMode,
    visibleBlocks,
  ]);

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
  documentTypographyProfile,
  draftActive,
  draftLayout,
  pageFrameCollection,
  persistedCanvasObjects,
  persistedCanvasPlacements,
  persistedContentMounts,
  persistedVisualConnectors,
  persistedImageObjects,
  persistedStructuredObjects,
  contentLookupBlocks,
  pageOffsetX,
  surfaceMode,
  viewportTransform,
  pageReadingViewport,
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

  const primaryPageFrameSeed = useMemo(
    () => createRuntimePageFrame({
      contentX: pageOffsetX,
      height: pageContentHeight,
    }),
    [pageContentHeight, pageOffsetX],
  );

  const runtimePageFrameCollection = useMemo(
    () => normalizePageFrameCollection(pageFrameCollection, {
      fallbackPageFrame: primaryPageFrameSeed,
    }),
    [pageFrameCollection, primaryPageFrameSeed],
  );

  const primaryPageFrame = useMemo(() => (
    runtimePageFrameCollection.pageFrames.find((frame) => frame.id === runtimePageFrameCollection.primaryFrameId)
    || runtimePageFrameCollection.pageFrames[0]
    || null
  ), [runtimePageFrameCollection]);

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
    const seedViewport = createRuntimeViewport(surfaceMode, pageContentHeight, viewportTransform);
    const viewport = surfaceMode === 'page' && primaryPageFrame
      ? createPageModeFocusViewport({
        pageFrame: primaryPageFrame,
        viewport: seedViewport,
        presentationViewport: pageReadingViewport,
      })
      : seedViewport;

    return buildNoteCanvasRuntimeModel({
      mode: surfaceMode,
      world: createRuntimeWorld(surfaceMode, pageContentHeight, {
        pageFrames: runtimePageFrameCollection.pageFrames,
        blockPlacements: canvasBlockPlacements,
        canvasObjectReserve: [],
      }),
      primaryPageFrame,
      pageFrames: runtimePageFrameCollection.pageFrames,
      pageStacks: runtimePageFrameCollection.pageStacks,
      viewport,
      blockPlacements: canvasBlockPlacements,
      documentTypography: documentTypographyProfile,
      relationEndpointReserve,
      genericCanvasObjects: persistedCanvasObjects,
      genericCanvasPlacements: persistedCanvasPlacements,
      genericContentMounts: persistedContentMounts,
      genericVisualConnectors: persistedVisualConnectors,
      genericImageObjects: persistedImageObjects,
      genericStructuredObjects: persistedStructuredObjects,
      textByContentTargetId: buildTextByContentTargetId(contentLookupBlocks || visibleBlocks),
    });
  }, [
    canvasBlockPlacements,
    contentLookupBlocks,
    documentTypographyProfile,
    pageContentHeight,
    primaryPageFrame,
    persistedCanvasObjects,
    persistedCanvasPlacements,
    persistedContentMounts,
    persistedImageObjects,
    persistedStructuredObjects,
    persistedVisualConnectors,
    relationEndpointReserve,
    runtimePageFrameCollection.pageFrames,
    runtimePageFrameCollection.pageStacks,
    surfaceMode,
    viewportTransform,
    pageReadingViewport,
  ]);

  const exportPreview = useMemo(() => {
    return buildExportPreviewModel(visibleBlocks, blockLayouts, {
      pageFrames: noteCanvasRuntime.pageFrames,
      pageStacks: noteCanvasRuntime.pageStacks,
      blockPlacements: noteCanvasRuntime.blockPlacements,
      primaryPageFrameId: noteCanvasRuntime.primaryPageFrame?.id || null,
      documentTypography: documentTypographyProfile,
    });
  }, [visibleBlocks, blockLayouts, documentTypographyProfile, noteCanvasRuntime]);

  return {
    canvasBlockPlacements,
    exportPreview,
    noteCanvasRuntime,
    pageContentHeight,
    primaryPageFrame,
    runtimePageFrameCollection,
  };
}
