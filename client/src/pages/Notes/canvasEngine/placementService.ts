import {
  classifyCanvasSurfaceAuthority,
  type CanvasSurfaceAuthorityDecision,
  type CanvasSurfacePageBoundary,
} from '../../../../../shared/types/canvasSurfaceAuthority';
import {
  DEFAULT_BLOCK_GAP,
  CANVAS_WORKSPACE_WIDTH,
  DEFAULT_PAGE_CONTENT_WIDTH,
  MIN_BLOCK_HEIGHT,
  MIN_BLOCK_WIDTH,
  NOTE_LAYOUT_KEY,
  SNAP_THRESHOLD,
  STACKED_BLOCK_GAP,
  type AIVisibility,
  type BlockBoxLayout,
  type BoundaryKind,
  type CanvasWorldBlockBoxLayout,
  type ExportRole,
  type LayoutWidthMode,
  type LayoutHistoryEntry,
  type SnapGuide,
  type SurfaceMode,
} from './runtimeLayout';
import {
  snapRectToPageFrameGuides,
} from './pageFrameGuideService';
import {
  placementCoordinateIdentityEqual,
  preserveContractLayoutCoordinates,
  projectContractLayoutToWorld,
  reconcileContractHydratedLayout,
  resolveWorldRect,
  sameLayoutFrame,
  selectPlacementFrame,
  toStoredLayout,
  type CoordinateContract,
} from './placementContractService';
import type {
  BlockPlacementModel,
  CanvasBoundaryKind,
  PageFrameModel,
  RelationEndpointReserve,
} from './types';

export interface PlacementSeedBlock {
  id: string;
  placement_id?: string;
  canvas_layout?: Record<string, unknown> | null;
  display_overrides_json?: Record<string, unknown> | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function localContentPageFrame(contentWidth: number): PageFrameModel {
  return {
    id: 'local-content-page-frame',
    role: 'primary_page_frame',
    exportable: true,
    x: 0,
    y: 0,
    width: contentWidth,
    height: 0,
    contentInset: {
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    },
  };
}

function isExportRole(value: unknown): value is ExportRole {
  return value === 'included' || value === 'excluded' || value === 'scratch';
}

function isAIVisibility(value: unknown): value is AIVisibility {
  return value === 'visible' || value === 'hidden';
}

function isStoredLayoutSurface(value: unknown): value is NonNullable<BlockBoxLayout['surface']> {
  return value === 'formal_page' || value === 'canvas_workspace' || value === 'tray';
}

function isStoredCoordinateSpace(value: unknown): value is NonNullable<BlockBoxLayout['coordinate_space']> {
  return value === 'page_frame_local' || value === 'canvas_world';
}

function isStoredBoundaryRole(value: unknown): value is NonNullable<BlockBoxLayout['boundary_role']> {
  return value === 'inside' || value === 'crossing' || value === 'outside';
}

function isLayoutWidthMode(value: unknown): value is LayoutWidthMode {
  return value === 'auto' || value === 'manual';
}

export function readStoredLayout(block: PlacementSeedBlock): Partial<BlockBoxLayout> | null {
  const layout = isRecord(block.canvas_layout)
    ? block.canvas_layout
    : block.display_overrides_json?.[NOTE_LAYOUT_KEY];
  if (!isRecord(layout)) return null;
  return {
    ...layout,
    rotation: typeof layout.rotation === 'number' ? layout.rotation : undefined,
    export_role: isExportRole(layout.export_role) ? layout.export_role : undefined,
    ai_visibility: isAIVisibility(layout.ai_visibility) ? layout.ai_visibility : undefined,
    surface: isStoredLayoutSurface(layout.surface) ? layout.surface : undefined,
    width_mode: isLayoutWidthMode(layout.width_mode) ? layout.width_mode : undefined,
    coordinate_space: isStoredCoordinateSpace(layout.coordinate_space) ? layout.coordinate_space : undefined,
    frame_id: typeof layout.frame_id === 'string' && layout.frame_id.trim() ? layout.frame_id : undefined,
    boundary_role: isStoredBoundaryRole(layout.boundary_role) ? layout.boundary_role : undefined,
  };
}

type SurfaceClassifiableLayout = Pick<BlockBoxLayout, 'x' | 'width'>
  & Partial<Pick<BlockBoxLayout, 'surface' | 'coordinate_space' | 'frame_id' | 'surface_authority'>>;

function pageBoundaryForFrame(pageFrame: PageFrameModel): CanvasSurfacePageBoundary {
  return {
    left: pageFrame.x + pageFrame.contentInset.left,
    right: pageFrame.x + pageFrame.width - pageFrame.contentInset.right,
    frameId: pageFrame.id,
  };
}

export function classifyBlockSurfaceAuthority(
  layout: SurfaceClassifiableLayout,
  options: {
    pageFrame?: PageFrameModel | null;
    pageLocalWidth?: number;
  } = {},
): CanvasSurfaceAuthorityDecision {
  const pageLocalWidth = options.pageLocalWidth ?? DEFAULT_PAGE_CONTENT_WIDTH;
  const internalAuthority = layout.surface_authority;
  if (internalAuthority?.pageBoundary) {
    return classifyCanvasSurfaceAuthority({
      coordinateSpace: internalAuthority.coordinateSpace,
      box: layout,
      pageBoundary: internalAuthority.pageBoundary,
      pageLocalWidth: internalAuthority.pageBoundary.right - internalAuthority.pageBoundary.left,
      explicitSurface: layout.surface,
    });
  }

  if (layout.coordinate_space === 'canvas_world') {
    return classifyCanvasSurfaceAuthority({
      coordinateSpace: 'canvas_world',
      box: layout,
      pageBoundary: options.pageFrame ? pageBoundaryForFrame(options.pageFrame) : undefined,
      explicitSurface: layout.surface,
    });
  }

  if (!layout.coordinate_space && layout.surface) {
    return classifyCanvasSurfaceAuthority({
      coordinateSpace: 'canvas_world',
      box: layout,
      explicitSurface: layout.surface,
    });
  }

  return classifyCanvasSurfaceAuthority({
    coordinateSpace: 'page_frame_local',
    box: layout,
    pageBoundary: {
      left: 0,
      right: pageLocalWidth,
      frameId: layout.frame_id || options.pageFrame?.id || null,
    },
    pageLocalWidth,
    explicitSurface: layout.surface,
  });
}

function layoutSurface(value: unknown): BlockBoxLayout['surface'] | undefined {
  return isStoredLayoutSurface(value) ? value : undefined;
}

function layoutCoordinateSpace(value: unknown): BlockBoxLayout['coordinate_space'] | undefined {
  return isStoredCoordinateSpace(value) ? value : undefined;
}

function layoutFrameId(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function applyAuthorityDecisionToHydratedLayout(
  layout: Record<string, unknown>,
  decision: CanvasSurfaceAuthorityDecision,
): Record<string, unknown> {
  const next: Record<string, unknown> = {
    ...layout,
    surface: decision.surface,
    boundary_role: decision.boundaryRole,
  };
  if (decision.frameId) next.frame_id = decision.frameId;
  else delete next.frame_id;
  return next;
}

/**
 * Hydration is an explicit coordinate conversion boundary. Legacy layouts
 * without a coordinate-space receipt keep their explicit surface; migration
 * is responsible for tagging rows before geometry may override that value.
 */
export function reconcileHydratedBlockLayoutSurfaceAuthority(
  layout: Record<string, unknown>,
  pageFrames: PageFrameModel[],
  contract: CoordinateContract = 'v1',
): Record<string, unknown> {
  return reconcileContractHydratedLayout(layout, pageFrames, contract, reconcileLegacyHydratedBlockLayoutSurfaceAuthority);
}

function reconcileLegacyHydratedBlockLayoutSurfaceAuthority(
  layout: Record<string, unknown>,
  pageFrames: PageFrameModel[],
): Record<string, unknown> {
  if (layout.surface === 'tray') return layout;
  const x = typeof layout.x === 'number' ? layout.x : Number.NaN;
  const width = typeof layout.width === 'number' ? layout.width : Number.NaN;
  if (!Number.isFinite(x) || !Number.isFinite(width)) return layout;

  const explicitSurface = layoutSurface(layout.surface);
  const coordinateSpace = layoutCoordinateSpace(layout.coordinate_space);
  if (!coordinateSpace && explicitSurface) return layout;

  const requestedFrameId = layoutFrameId(layout.frame_id);
  const requestedFrame = requestedFrameId
    ? pageFrames.find((frame) => frame.id === requestedFrameId)
    : undefined;
  const orderedFrames = requestedFrame
    ? [requestedFrame, ...pageFrames.filter((frame) => frame.id !== requestedFrame.id)]
    : pageFrames;

  if (coordinateSpace === 'canvas_world') {
    const classified = orderedFrames.map((pageFrame) => ({
      pageFrame,
      pageBoundary: pageBoundaryForFrame(pageFrame),
      decision: classifyCanvasSurfaceAuthority({
        coordinateSpace: 'canvas_world',
        box: { x, width },
        pageBoundary: pageBoundaryForFrame(pageFrame),
        explicitSurface,
      }),
    }));
    const insideMatch = classified.find((item) => item.decision.boundaryRole === 'inside');
    const crossingMatch = classified.find((item) => item.decision.boundaryRole === 'crossing');
    const worldContext = insideMatch || crossingMatch || classified[0];
    const decision = insideMatch?.decision || crossingMatch?.decision || classifyCanvasSurfaceAuthority({
      coordinateSpace: 'canvas_world',
      box: { x, width },
      pageBoundary: worldContext?.pageBoundary,
      explicitSurface,
    });
    const reconciled = applyAuthorityDecisionToHydratedLayout(layout, decision);
    if (!insideMatch) {
      return {
        ...reconciled,
        coordinate_space: 'canvas_world',
        surface_authority: worldContext
          ? {
            coordinateSpace: 'canvas_world',
            pageBoundary: worldContext.pageBoundary,
          }
          : layout.surface_authority,
      };
    }
    const next: Record<string, unknown> = {
      ...reconciled,
      x: x - insideMatch.pageBoundary.left,
      coordinate_space: 'page_frame_local',
      surface_authority: {
        coordinateSpace: 'page_frame_local',
        pageBoundary: {
          left: 0,
          right: insideMatch.pageBoundary.right - insideMatch.pageBoundary.left,
          frameId: insideMatch.pageFrame.id,
        },
      },
    };
    return next;
  }

  const pageFrame = requestedFrame || orderedFrames[0];
  const pageLocalWidth = pageFrame
    ? Math.max(0, pageFrame.width - pageFrame.contentInset.left - pageFrame.contentInset.right)
    : DEFAULT_PAGE_CONTENT_WIDTH;
  const decision = classifyCanvasSurfaceAuthority({
    coordinateSpace: 'page_frame_local',
    box: { x, width },
    pageBoundary: {
      left: 0,
      right: pageLocalWidth,
      frameId: pageFrame?.id || requestedFrameId || null,
    },
    pageLocalWidth,
    explicitSurface,
  });
  return {
    ...applyAuthorityDecisionToHydratedLayout(layout, decision),
    coordinate_space: 'page_frame_local',
    surface_authority: pageFrame
      ? {
        coordinateSpace: 'page_frame_local',
        pageBoundary: {
          left: 0,
          right: pageLocalWidth,
          frameId: pageFrame.id,
        },
      }
      : layout.surface_authority,
  };
}

export function isCanvasWorkspaceBlock(block: PlacementSeedBlock, contentWidth: number): boolean {
  const stored = readStoredLayout(block);
  if (!stored) return false;
  if ((typeof stored.x !== 'number' || typeof stored.width !== 'number') && !stored.surface) return false;
  return classifyBlockSurfaceAuthority({
    ...stored,
    x: typeof stored.x === 'number' ? stored.x : Number.NaN,
    width: typeof stored.width === 'number' ? stored.width : Number.NaN,
  }, {
    pageLocalWidth: contentWidth,
  }).surface === 'canvas_workspace';
}

export function normalizeBlockLayout<TBlock extends PlacementSeedBlock>({
  block,
  fallback,
  contentWidth,
  surfaceMode,
  estimateHeight,
  contract = 'v1',
}: {
  block: TBlock;
  fallback: BlockBoxLayout;
  contentWidth: number;
  surfaceMode: SurfaceMode;
  estimateHeight: (block: TBlock, width: number) => number;
  contract?: CoordinateContract;
}): BlockBoxLayout {
  const stored = readStoredLayout(block) ?? fallback;
  const useStoredPlacement = !(surfaceMode === 'page' && stored?.surface === 'canvas_workspace');
  const isWorkspaceLayout = surfaceMode === 'canvas' && stored?.surface === 'canvas_workspace';
  const maxPlacementWidth = isWorkspaceLayout
    ? CANVAS_WORKSPACE_WIDTH
    : contentWidth;
  const shouldUseStoredWidth = useStoredPlacement
    && typeof stored?.width === 'number'
    && (isWorkspaceLayout || stored.width_mode === 'manual');
  const preserveWorldCoordinates = useStoredPlacement
    && preserveContractLayoutCoordinates(stored, contract);
  const width = clamp(
    shouldUseStoredWidth ? stored.width as number : fallback.width,
    MIN_BLOCK_WIDTH,
    Math.max(MIN_BLOCK_WIDTH, maxPlacementWidth),
  );
  const requestedX = useStoredPlacement && typeof stored?.x === 'number' ? stored.x : fallback.x;
  const x = preserveWorldCoordinates
    ? requestedX
    : clamp(requestedX, 0, Math.max(0, maxPlacementWidth - width));
  const requestedY = useStoredPlacement && typeof stored?.y === 'number' ? stored.y : fallback.y;
  const y = preserveWorldCoordinates ? requestedY : Math.max(0, requestedY);
  const naturalHeight = estimateHeight(block, width);
  const storedHeight = useStoredPlacement && typeof stored?.height === 'number' ? stored.height : 0;
  const height = Math.max(MIN_BLOCK_HEIGHT, naturalHeight, storedHeight);

  return {
    x,
    y,
    width,
    height,
    rotation: typeof stored?.rotation === 'number' ? stored.rotation : undefined,
    export_role: stored?.export_role,
    ai_visibility: stored?.ai_visibility,
    surface: useStoredPlacement ? stored?.surface : undefined,
    width_mode: useStoredPlacement && stored?.width_mode === 'manual' ? 'manual' : undefined,
    coordinate_space: useStoredPlacement
      ? stored?.coordinate_space
        || (stored?.surface === 'canvas_workspace' ? undefined : 'page_frame_local')
      : undefined,
    frame_id: useStoredPlacement ? stored?.frame_id : undefined,
    boundary_role: useStoredPlacement ? stored?.boundary_role : undefined,
    surface_authority: useStoredPlacement ? stored?.surface_authority : undefined,
  };
}

export function normalizeResolvedBlockLayout<TBlock extends PlacementSeedBlock>({
  block,
  layout,
  contentWidth,
  surfaceMode,
  estimateHeight,
  contract = 'v1',
}: {
  block: TBlock;
  layout: BlockBoxLayout;
  contentWidth: number;
  surfaceMode: SurfaceMode;
  estimateHeight: (block: TBlock, width: number) => number;
  contract?: CoordinateContract;
}): BlockBoxLayout {
  const isWorkspaceLayout = surfaceMode === 'canvas' && layout.surface === 'canvas_workspace';
  const maxPlacementWidth = isWorkspaceLayout
    ? CANVAS_WORKSPACE_WIDTH
    : contentWidth;
  const width = clamp(
    isWorkspaceLayout || layout.width_mode === 'manual'
      ? layout.width
      : Math.min(DEFAULT_PAGE_CONTENT_WIDTH, contentWidth),
    MIN_BLOCK_WIDTH,
    Math.max(MIN_BLOCK_WIDTH, maxPlacementWidth),
  );
  const preserveWorldCoordinates = preserveContractLayoutCoordinates(layout, contract);
  const x = preserveWorldCoordinates
    ? layout.x
    : clamp(layout.x, 0, Math.max(0, maxPlacementWidth - width));
  const y = preserveWorldCoordinates ? layout.y : Math.max(0, layout.y);
  const naturalHeight = estimateHeight(block, width);

  return {
    ...layout,
    x,
    y,
    width,
    height: Math.max(MIN_BLOCK_HEIGHT, naturalHeight, layout.height),
    width_mode: layout.width_mode === 'manual' ? 'manual' : undefined,
    coordinate_space: layout.coordinate_space
      || (layout.surface === 'canvas_workspace' ? undefined : 'page_frame_local'),
  };
}

export function buildDefaultBlockLayouts<TBlock extends { id: string }>(
  blocks: TBlock[],
  contentWidth: number,
  estimateHeight: (block: TBlock, width: number) => number,
): Record<string, BlockBoxLayout> {
  let cursorY = 0;
  const width = Math.min(DEFAULT_PAGE_CONTENT_WIDTH, contentWidth);
  return blocks.reduce<Record<string, BlockBoxLayout>>((acc, block) => {
    const height = estimateHeight(block, width);
    acc[block.id] = {
      x: 0,
      y: cursorY,
      width,
      height,
      coordinate_space: 'page_frame_local',
    };
    cursorY += height + DEFAULT_BLOCK_GAP;
    return acc;
  }, {});
}

export function getBoundaryKind(layout: SurfaceClassifiableLayout): BoundaryKind {
  return classifyBlockSurfaceAuthority(layout, {
    pageLocalWidth: DEFAULT_PAGE_CONTENT_WIDTH,
  }).boundaryRole;
}

function toCanvasBoundaryKind(boundary: BoundaryKind): CanvasBoundaryKind {
  return boundary;
}

export function buildRuntimeBlockPlacement({
  block,
  canvasId,
  layout,
  pageOffsetX,
  pageFrame,
  pageFrames = pageFrame ? [pageFrame] : [],
  contract = 'v1',
  zIndex,
}: {
  block: PlacementSeedBlock;
  canvasId: string;
  layout: BlockBoxLayout;
  pageOffsetX: number;
  pageFrame: PageFrameModel | null;
  pageFrames?: PageFrameModel[];
  contract?: CoordinateContract;
  zIndex: number;
}): BlockPlacementModel {
  const resolvedFrame = selectPlacementFrame(layout, pageFrames, contract, pageFrame);
  const authority = classifyBlockSurfaceAuthority(layout, {
    pageFrame: resolvedFrame,
    pageLocalWidth: DEFAULT_PAGE_CONTENT_WIDTH,
  });
  const boundary = toCanvasBoundaryKind(authority.boundaryRole);
  const rect = resolveWorldRect(layout, resolvedFrame, contract, pageOffsetX);
  const visibilityState = layout.export_role === 'scratch'
    ? 'scratch'
    : layout.ai_visibility === 'hidden'
      ? 'ai_hidden'
      : layout.export_role === 'excluded'
        ? 'export_hidden'
        : 'normal';

  return {
    blockId: block.id,
    placementId: block.placement_id || `placement:${block.id}`,
    objectId: block.id,
    objectKind: 'note_block',
    canvasId,
    frameId: authority.frameId || (boundary === 'inside' ? resolvedFrame?.id : undefined),
    x: rect.x,
    y: rect.y,
    width: layout.width,
    height: layout.height,
    rotation: layout.rotation || 0,
    surface: authority.surface,
    boundaryRole: boundary,
    zIndex,
    snapState: 'free',
    visibilityState,
  };
}

export function projectPageFrameLocalLayoutToCanvasLayout({
  layout,
  pageFrame,
  pageOffsetX,
  contract = 'v1',
}: {
  layout: BlockBoxLayout;
  pageFrame: PageFrameModel | null | undefined;
  pageOffsetX: number;
  contract?: CoordinateContract;
}): BlockBoxLayout {
  return projectContractLayoutToWorld(layout, pageFrame, pageOffsetX, contract, () => projectLegacyPageFrameLocalLayoutToCanvasLayout({ layout, pageFrame, pageOffsetX }));
}

function projectLegacyPageFrameLocalLayoutToCanvasLayout({ layout, pageFrame, pageOffsetX }: {
  layout: BlockBoxLayout;
  pageFrame: PageFrameModel | null | undefined;
  pageOffsetX: number;
}): BlockBoxLayout {
  if (!pageFrame || layout.surface === 'canvas_workspace') return layout;

  const pageBoundary = pageBoundaryForFrame(pageFrame);
  const localOffsetX = pageBoundary.left;
  const localOffsetY = pageFrame.y + pageFrame.contentInset.top;
  void pageOffsetX;
  return {
    ...layout,
    x: layout.x + localOffsetX,
    y: layout.y + localOffsetY,
    surface: 'formal_page',
    coordinate_space: 'canvas_world',
    frame_id: pageFrame.id,
    surface_authority: {
      coordinateSpace: 'canvas_world',
      pageBoundary,
    },
  } satisfies CanvasWorldBlockBoxLayout;
}

export function buildRelationEndpointReserveForPlacement(placement: BlockPlacementModel): RelationEndpointReserve[] {
  const centerY = placement.y + placement.height / 2;
  return [
    {
      id: `${placement.placementId}:relation-port:left`,
      ownerId: placement.objectId,
      ownerKind: 'note_block',
      anchor: { x: placement.x, y: centerY },
      normal: { x: -1, y: 0 },
    },
    {
      id: `${placement.placementId}:relation-port:right`,
      ownerId: placement.objectId,
      ownerKind: 'note_block',
      anchor: { x: placement.x + placement.width, y: centerY },
      normal: { x: 1, y: 0 },
    },
  ];
}

export function buildLayoutPayload(
  layout: BlockBoxLayout,
  contract: CoordinateContract = 'v1',
  pageFrames: PageFrameModel[] = [],
): Record<string, unknown> {
  layout = toStoredLayout(layout, pageFrames, contract);
  if (layout.surface === 'tray') {
    return {
      x: 0, y: 0, width: 0, height: 0, rotation: 0,
      surface: 'tray', boundary_role: 'outside', frame_id: null,
      order_index: layout.order_index ?? null,
      export_role: layout.export_role, ai_visibility: layout.ai_visibility,
      width_mode: layout.width_mode,
    };
  }
  // A v2 write must retain the geometry displayed at the current zoom, including
  // fractional drag coordinates. Integer quantization shifts the block on save.
  const roundedLayout: BlockBoxLayout = contract === 'v2' ? layout : {
    ...layout,
    x: Math.round(layout.x),
    y: Math.round(layout.y),
    width: Math.round(layout.width),
    height: Math.round(layout.height),
  };
  const authority = classifyBlockSurfaceAuthority(roundedLayout, {
    pageLocalWidth: DEFAULT_PAGE_CONTENT_WIDTH,
  });
  const payload: Record<string, unknown> = {
    x: roundedLayout.x,
    y: roundedLayout.y,
    width: roundedLayout.width,
    height: roundedLayout.height,
    surface: authority.surface,
    boundary_role: authority.boundaryRole,
    version: 'V2.BN.8',
  };
  if (layout.coordinate_space) payload.coordinate_space = layout.coordinate_space;
  else if (!layout.surface) payload.coordinate_space = 'page_frame_local';
  if (authority.frameId) payload.frame_id = authority.frameId;
  if (typeof layout.rotation === 'number' && layout.rotation !== 0) payload.rotation = layout.rotation;
  if (layout.export_role) payload.export_role = layout.export_role;
  if (layout.ai_visibility) payload.ai_visibility = layout.ai_visibility;
  if (layout.width_mode === 'manual') payload.width_mode = 'manual';
  return payload;
}

export function writeLayoutOverride(block: PlacementSeedBlock, layout: BlockBoxLayout): Record<string, unknown> {
  return {
    ...block.display_overrides_json,
    [NOTE_LAYOUT_KEY]: buildLayoutPayload(layout),
  };
}

export function layoutsEqual(a: BlockBoxLayout, b: BlockBoxLayout, contract: CoordinateContract = 'v1'): boolean {
  return Math.round(a.x) === Math.round(b.x)
    && Math.round(a.y) === Math.round(b.y)
    && Math.round(a.width) === Math.round(b.width)
    && Math.round(a.height) === Math.round(b.height)
    && Math.round((a.rotation || 0) * 1000) === Math.round((b.rotation || 0) * 1000)
    && a.export_role === b.export_role
    && a.ai_visibility === b.ai_visibility
    && a.surface === b.surface
    && a.order_index === b.order_index
    && a.width_mode === b.width_mode
    && placementCoordinateIdentityEqual(a, b, contract);
}

export function buildLayoutHistoryEntry(
  before: Record<string, BlockBoxLayout>,
  after: Record<string, BlockBoxLayout>,
  contract: CoordinateContract = 'v1',
): LayoutHistoryEntry | null {
  const beforeChanged: Record<string, BlockBoxLayout> = {};
  const afterChanged: Record<string, BlockBoxLayout> = {};
  const ids = new Set([...Object.keys(before), ...Object.keys(after)]);

  ids.forEach((id) => {
    const beforeLayout = before[id];
    const afterLayout = after[id];
    if (!beforeLayout || !afterLayout || layoutsEqual(beforeLayout, afterLayout, contract)) return;
    beforeChanged[id] = { ...beforeLayout };
    afterChanged[id] = { ...afterLayout };
  });

  return Object.keys(afterChanged).length > 0
    ? { before: beforeChanged, after: afterChanged }
    : null;
}

export function getEffectiveExportRole(layout: BlockBoxLayout): ExportRole {
  if (layout.export_role) return layout.export_role;
  return classifyBlockSurfaceAuthority(layout, {
    pageLocalWidth: DEFAULT_PAGE_CONTENT_WIDTH,
  }).boundaryRole === 'outside' ? 'scratch' : 'included';
}

export function getEffectiveAIVisibility(layout: BlockBoxLayout): AIVisibility {
  if (layout.ai_visibility) return layout.ai_visibility;
  return classifyBlockSurfaceAuthority(layout, {
    pageLocalWidth: DEFAULT_PAGE_CONTENT_WIDTH,
  }).boundaryRole === 'outside' ? 'hidden' : 'visible';
}

function hasHorizontalOverlap(a: BlockBoxLayout, b: BlockBoxLayout): boolean {
  return Math.min(a.x + a.width, b.x + b.width) > Math.max(a.x, b.x) + 1;
}

export function resolveStackedLayoutCollisions(
  layouts: Record<string, BlockBoxLayout>,
  orderedBlockIds: string[],
  contract: CoordinateContract = 'v1',
): Record<string, BlockBoxLayout> {
  const nextLayouts = { ...layouts };
  const orderedIds = orderedBlockIds
    .filter((id) => nextLayouts[id])
    .sort((a, b) => {
      const layoutA = nextLayouts[a];
      const layoutB = nextLayouts[b];
      return layoutA.y - layoutB.y || orderedBlockIds.indexOf(a) - orderedBlockIds.indexOf(b);
    });

  orderedIds.forEach((id, index) => {
    let current = nextLayouts[id];
    for (let previousIndex = 0; previousIndex < index; previousIndex += 1) {
      const previous = nextLayouts[orderedIds[previousIndex]];
      if (!sameLayoutFrame(current, previous, contract)) continue;
      if (!hasHorizontalOverlap(current, previous)) continue;
      const minimumY = previous.y + previous.height + STACKED_BLOCK_GAP;
      if (current.y < minimumY && current.y >= previous.y - 1) {
        current = { ...current, y: minimumY };
        nextLayouts[id] = current;
      }
    }
  });

  return nextLayouts;
}

export function reflowLayoutsAfterHeightChange(
  layouts: Record<string, BlockBoxLayout>,
  blockId: string,
  previousLayout: BlockBoxLayout,
  nextLayout: BlockBoxLayout,
  contract: CoordinateContract = 'v1',
): Record<string, BlockBoxLayout> {
  const delta = nextLayout.height - previousLayout.height;
  const nextLayouts = { ...layouts, [blockId]: nextLayout };
  if (Math.abs(delta) < 1) return nextLayouts;

  const previousBottom = previousLayout.y + previousLayout.height;
  Object.entries(layouts).forEach(([id, layout]) => {
    if (id === blockId) return;
    if (!sameLayoutFrame(layout, previousLayout, contract)) return;
    if (layout.y < previousBottom - 1) return;
    if (!hasHorizontalOverlap(layout, previousLayout)) return;
    nextLayouts[id] = { ...layout, y: Math.max(0, layout.y + delta) };
  });

  return nextLayouts;
}

export function snapToTargets(value: number, targets: number[]): { value: number; snapped?: number } {
  for (const target of targets) {
    if (Math.abs(value - target) <= SNAP_THRESHOLD) {
      return { value: target, snapped: target };
    }
  }
  return { value };
}

export function applyMoveSnap(
  layout: BlockBoxLayout,
  blockId: string,
  layouts: Record<string, BlockBoxLayout>,
  contentWidth: number,
  contract: CoordinateContract = 'v1',
): { layout: BlockBoxLayout; guide: SnapGuide | null } {
  const otherLayouts = Object.entries(layouts)
    .filter(([id, item]) => id !== blockId && sameLayoutFrame(layout, item, contract))
    .map(([, item]) => item);
  const pageFrameSnap = snapRectToPageFrameGuides({
    rect: {
      x: layout.x,
      y: layout.y,
      width: layout.width,
      height: layout.height,
    },
    pageFrame: localContentPageFrame(contentWidth),
  });
  const xTargets = otherLayouts.flatMap((item) => [item.x, item.x + item.width]);
  const yTargets = [0, ...otherLayouts.flatMap((item) => [item.y, item.y + item.height])];
  const snappedX = pageFrameSnap.snappedAxes.x
    ? { value: pageFrameSnap.rect.x, snapped: pageFrameSnap.guide?.x }
    : snapToTargets(layout.x, xTargets);
  const snappedY = snapToTargets(layout.y, yTargets);
  const next = { ...layout, x: snappedX.value, y: snappedY.value };
  const guide = snappedX.snapped !== undefined || snappedY.snapped !== undefined
    ? { x: snappedX.snapped, y: snappedY.snapped }
    : null;
  return { layout: next, guide };
}
