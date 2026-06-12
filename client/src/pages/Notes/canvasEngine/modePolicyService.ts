import { getPrimaryPageOffsetX } from './viewportService';
import {
  DEFAULT_BLOCK_HEIGHT,
  DEFAULT_PAGE_CONTENT_WIDTH,
  ELASTIC_AVOIDANCE_ACTIVATION_DISTANCE,
  MIN_BLOCK_WIDTH,
  type BlockBoxLayout,
  type SurfaceMode,
} from './runtimeLayout';
import {
  isCanvasWorkspaceBlock,
  type PlacementSeedBlock,
} from './placementService';

export interface SurfaceModePolicy {
  mode: SurfaceMode;
  isPageMode: boolean;
  isCanvasMode: boolean;
  label: 'Page' | 'Canvas';
  nextModeLabel: string;
  pageOffsetX: number;
  showWorkspaceBlocks: boolean;
  useGlobalPageScroll: boolean;
}

export function createSurfaceModePolicy(surfaceMode: SurfaceMode): SurfaceModePolicy {
  const isCanvasMode = surfaceMode === 'canvas';
  return {
    mode: surfaceMode,
    isPageMode: !isCanvasMode,
    isCanvasMode,
    label: isCanvasMode ? 'Canvas' : 'Page',
    nextModeLabel: isCanvasMode ? 'Switch to locked page mode' : 'Switch to open canvas mode',
    pageOffsetX: getPrimaryPageOffsetX(surfaceMode),
    showWorkspaceBlocks: isCanvasMode,
    useGlobalPageScroll: !isCanvasMode,
  };
}

export function getNextSurfaceMode(surfaceMode: SurfaceMode): SurfaceMode {
  return surfaceMode === 'page' ? 'canvas' : 'page';
}

export function getVisibleBlocksForSurface<TBlock extends PlacementSeedBlock>(
  blocks: TBlock[],
  policy: SurfaceModePolicy,
  contentWidth: number,
): TBlock[] {
  return policy.showWorkspaceBlocks
    ? blocks
    : blocks.filter((block) => !isCanvasWorkspaceBlock(block, contentWidth));
}

export function shouldResolvePageCollisions(policy: SurfaceModePolicy): boolean {
  return policy.isPageMode;
}

export function shouldUseElasticAvoidance({
  policy,
  snapEnabled,
  deltaY,
}: {
  policy: SurfaceModePolicy;
  snapEnabled: boolean;
  deltaY: number;
}): boolean {
  return policy.isPageMode
    && !snapEnabled
    && Math.abs(deltaY) >= ELASTIC_AVOIDANCE_ACTIVATION_DISTANCE;
}

export function createBlankDraftLayout({
  policy,
  snapEnabled,
  rawX,
  rawY,
  contentWidth,
  defaultDraftLayout,
}: {
  policy: SurfaceModePolicy;
  snapEnabled: boolean;
  rawX: number;
  rawY: number;
  contentWidth: number;
  defaultDraftLayout: BlockBoxLayout;
}): BlockBoxLayout {
  if (snapEnabled && policy.isPageMode) return defaultDraftLayout;

  const availableWidth = Math.max(MIN_BLOCK_WIDTH, contentWidth - rawX);
  const width = Math.min(DEFAULT_PAGE_CONTENT_WIDTH, availableWidth);
  const x = Math.min(Math.max(rawX, 0), Math.max(0, contentWidth - width));
  const y = Math.max(0, rawY);
  return { x, y, width, height: DEFAULT_BLOCK_HEIGHT };
}
