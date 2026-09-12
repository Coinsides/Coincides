import { deriveFrameLocalAutoWidth, resolveWorldRect, selectPlacementFrame, type CoordinateContract } from './placementContractService';
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
  readStoredLayout,
  type PlacementSeedBlock,
} from './placementService';
import {
  derivePlacementPageFrameAffiliation,
} from './pageFrameAffiliationService';
import {
  isCanvasObjectBackingBlock,
} from './shapeTextMountService';
import type { PageFrameModel } from './types';

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

export interface SurfaceVisibilityContext {
  coordinateContract?: CoordinateContract;
  pageFrames?: PageFrameModel[];
  boundary?: 'content' | 'outer';
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function isPageFrameAffiliatedWorkspaceBlock(
  block: PlacementSeedBlock,
  contentWidth: number,
  pageFrames: PageFrameModel[],
  boundary: 'content' | 'outer' = 'outer',
  coordinateContract: CoordinateContract = 'v1',
): boolean {
  if (!isCanvasWorkspaceBlock(block, contentWidth, { contract: coordinateContract, pageFrames })) return false;
  const stored = readStoredLayout(block);
  if (
    !isFiniteNumber(stored?.x)
    || !isFiniteNumber(stored?.y)
    || !isFiniteNumber(stored?.width)
    || !isFiniteNumber(stored?.height)
  ) {
    return false;
  }

  const frame = selectPlacementFrame(stored, pageFrames, coordinateContract);
  const layout = { ...stored, width: deriveFrameLocalAutoWidth(stored, frame, coordinateContract) ?? stored.width } as BlockBoxLayout;
  return derivePlacementPageFrameAffiliation({
    placement: resolveWorldRect(layout, frame, coordinateContract),
    pageFrames,
    boundary,
  }).kind !== 'workspace_only';
}

export function createSurfaceModePolicy(_surfaceMode: SurfaceMode): SurfaceModePolicy {
  return {
    mode: 'page',
    isPageMode: true,
    isCanvasMode: false,
    label: 'Page',
    nextModeLabel: '',
    pageOffsetX: getPrimaryPageOffsetX('page'),
    showWorkspaceBlocks: false,
    useGlobalPageScroll: true,
  };
}

export function getVisibleBlocksForSurface<TBlock extends PlacementSeedBlock & { metadata?: Record<string, unknown> }>(
  blocks: TBlock[],
  _policy: SurfaceModePolicy,
  contentWidth: number,
  context: SurfaceVisibilityContext = {},
): TBlock[] {
  const renderableBlocks = blocks.filter((block) => !isCanvasObjectBackingBlock(block)
    && readStoredLayout(block)?.surface !== 'tray');
  return renderableBlocks.filter((block) => (
      !isCanvasWorkspaceBlock(block, contentWidth, { contract: context.coordinateContract, pageFrames: context.pageFrames })
      || isPageFrameAffiliatedWorkspaceBlock(
        block,
        contentWidth,
        context.pageFrames || [],
        context.boundary,
        context.coordinateContract,
      )
    ));
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

  const maxPlacementWidth = contentWidth;
  const clampedRawX = Math.min(Math.max(rawX, 0), Math.max(0, maxPlacementWidth - MIN_BLOCK_WIDTH));
  const availableWidth = Math.max(MIN_BLOCK_WIDTH, maxPlacementWidth - clampedRawX);
  const width = Math.min(DEFAULT_PAGE_CONTENT_WIDTH, availableWidth);
  const x = Math.min(clampedRawX, Math.max(0, maxPlacementWidth - width));
  const y = Math.max(0, rawY);
  const rawLayout = { x, y, width, height: DEFAULT_BLOCK_HEIGHT };

  return rawLayout;
}
