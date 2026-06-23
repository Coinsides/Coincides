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
  type ExportRole,
  type LayoutWidthMode,
  type LayoutHistoryEntry,
  type SnapGuide,
  type SurfaceMode,
} from './runtimeLayout';
import type {
  BlockPlacementModel,
  CanvasBoundaryKind,
  PageFrameModel,
  RelationEndpointReserve,
} from './types';

export interface PlacementSeedBlock {
  id: string;
  placement_id?: string;
  display_overrides_json?: Record<string, unknown> | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function isExportRole(value: unknown): value is ExportRole {
  return value === 'included' || value === 'excluded' || value === 'scratch';
}

function isAIVisibility(value: unknown): value is AIVisibility {
  return value === 'visible' || value === 'hidden';
}

function isStoredLayoutSurface(value: unknown): value is NonNullable<BlockBoxLayout['surface']> {
  return value === 'formal_page' || value === 'canvas_workspace';
}

function isLayoutWidthMode(value: unknown): value is LayoutWidthMode {
  return value === 'auto' || value === 'manual';
}

export function readStoredLayout(block: PlacementSeedBlock): Partial<BlockBoxLayout> | null {
  const layout = block.display_overrides_json?.[NOTE_LAYOUT_KEY];
  if (!isRecord(layout)) return null;
  return {
    ...layout,
    rotation: typeof layout.rotation === 'number' ? layout.rotation : undefined,
    export_role: isExportRole(layout.export_role) ? layout.export_role : undefined,
    ai_visibility: isAIVisibility(layout.ai_visibility) ? layout.ai_visibility : undefined,
    surface: isStoredLayoutSurface(layout.surface) ? layout.surface : undefined,
    width_mode: isLayoutWidthMode(layout.width_mode) ? layout.width_mode : undefined,
  };
}

export function isCanvasWorkspaceBlock(block: PlacementSeedBlock, contentWidth: number): boolean {
  const stored = readStoredLayout(block);
  if (stored?.surface === 'canvas_workspace') return true;
  if (stored?.surface === 'formal_page') return false;

  return typeof stored?.x === 'number' && stored.x >= contentWidth;
}

export function normalizeBlockLayout<TBlock extends PlacementSeedBlock>({
  block,
  fallback,
  contentWidth,
  surfaceMode,
  estimateHeight,
}: {
  block: TBlock;
  fallback: BlockBoxLayout;
  contentWidth: number;
  surfaceMode: SurfaceMode;
  estimateHeight: (block: TBlock, width: number) => number;
}): BlockBoxLayout {
  const stored = readStoredLayout(block);
  const useStoredPlacement = !(surfaceMode === 'page' && stored?.surface === 'canvas_workspace');
  const isWorkspaceLayout = surfaceMode === 'canvas' && stored?.surface === 'canvas_workspace';
  const maxPlacementWidth = isWorkspaceLayout
    ? CANVAS_WORKSPACE_WIDTH
    : contentWidth;
  const shouldUseStoredWidth = useStoredPlacement
    && typeof stored?.width === 'number'
    && (isWorkspaceLayout || stored.width_mode === 'manual');
  const width = clamp(
    shouldUseStoredWidth ? stored.width as number : fallback.width,
    MIN_BLOCK_WIDTH,
    Math.max(MIN_BLOCK_WIDTH, maxPlacementWidth),
  );
  const x = clamp(
    useStoredPlacement && typeof stored?.x === 'number' ? stored.x : fallback.x,
    0,
    Math.max(0, maxPlacementWidth - width),
  );
  const y = Math.max(0, useStoredPlacement && typeof stored?.y === 'number' ? stored.y : fallback.y);
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
  };
}

export function normalizeResolvedBlockLayout<TBlock extends PlacementSeedBlock>({
  block,
  layout,
  contentWidth,
  surfaceMode,
  estimateHeight,
}: {
  block: TBlock;
  layout: BlockBoxLayout;
  contentWidth: number;
  surfaceMode: SurfaceMode;
  estimateHeight: (block: TBlock, width: number) => number;
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
  const x = clamp(layout.x, 0, Math.max(0, maxPlacementWidth - width));
  const y = Math.max(0, layout.y);
  const naturalHeight = estimateHeight(block, width);

  return {
    ...layout,
    x,
    y,
    width,
    height: Math.max(MIN_BLOCK_HEIGHT, naturalHeight, layout.height),
    width_mode: layout.width_mode === 'manual' ? 'manual' : undefined,
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
    acc[block.id] = { x: 0, y: cursorY, width, height };
    cursorY += height + DEFAULT_BLOCK_GAP;
    return acc;
  }, {});
}

export function getBoundaryKind(layout: Pick<BlockBoxLayout, 'x' | 'width'>): BoundaryKind {
  if (layout.x >= DEFAULT_PAGE_CONTENT_WIDTH) return 'outside';
  if (layout.x + layout.width <= DEFAULT_PAGE_CONTENT_WIDTH) return 'inside';
  return 'crossing';
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
  zIndex,
}: {
  block: PlacementSeedBlock;
  canvasId: string;
  layout: BlockBoxLayout;
  pageOffsetX: number;
  pageFrame: PageFrameModel | null;
  zIndex: number;
}): BlockPlacementModel {
  const boundary = toCanvasBoundaryKind(getBoundaryKind(layout));
  const surface = boundary === 'inside' ? 'formal_page' : 'canvas_workspace';
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
    frameId: boundary === 'inside' ? pageFrame?.id : undefined,
    x: layout.x + pageOffsetX,
    y: layout.y,
    width: layout.width,
    height: layout.height,
    rotation: layout.rotation || 0,
    surface,
    boundaryRole: boundary,
    zIndex,
    snapState: 'free',
    visibilityState,
  };
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

export function buildLayoutPayload(layout: BlockBoxLayout): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    x: Math.round(layout.x),
    y: Math.round(layout.y),
    width: Math.round(layout.width),
    height: Math.round(layout.height),
    surface: getBoundaryKind(layout) === 'inside' ? 'formal_page' : 'canvas_workspace',
    version: 'V2.BN.8',
  };
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

export function layoutsEqual(a: BlockBoxLayout, b: BlockBoxLayout): boolean {
  return Math.round(a.x) === Math.round(b.x)
    && Math.round(a.y) === Math.round(b.y)
    && Math.round(a.width) === Math.round(b.width)
    && Math.round(a.height) === Math.round(b.height)
    && Math.round((a.rotation || 0) * 1000) === Math.round((b.rotation || 0) * 1000)
    && a.export_role === b.export_role
    && a.ai_visibility === b.ai_visibility
    && a.surface === b.surface
    && a.width_mode === b.width_mode;
}

export function buildLayoutHistoryEntry(
  before: Record<string, BlockBoxLayout>,
  after: Record<string, BlockBoxLayout>,
): LayoutHistoryEntry | null {
  const beforeChanged: Record<string, BlockBoxLayout> = {};
  const afterChanged: Record<string, BlockBoxLayout> = {};
  const ids = new Set([...Object.keys(before), ...Object.keys(after)]);

  ids.forEach((id) => {
    const beforeLayout = before[id];
    const afterLayout = after[id];
    if (!beforeLayout || !afterLayout || layoutsEqual(beforeLayout, afterLayout)) return;
    beforeChanged[id] = { ...beforeLayout };
    afterChanged[id] = { ...afterLayout };
  });

  return Object.keys(afterChanged).length > 0
    ? { before: beforeChanged, after: afterChanged }
    : null;
}

export function getEffectiveExportRole(layout: BlockBoxLayout): ExportRole {
  if (layout.export_role) return layout.export_role;
  return getBoundaryKind(layout) === 'outside' ? 'scratch' : 'included';
}

export function getEffectiveAIVisibility(layout: BlockBoxLayout): AIVisibility {
  if (layout.ai_visibility) return layout.ai_visibility;
  return getBoundaryKind(layout) === 'outside' ? 'hidden' : 'visible';
}

function hasHorizontalOverlap(a: BlockBoxLayout, b: BlockBoxLayout): boolean {
  return Math.min(a.x + a.width, b.x + b.width) > Math.max(a.x, b.x) + 1;
}

export function resolveStackedLayoutCollisions(
  layouts: Record<string, BlockBoxLayout>,
  orderedBlockIds: string[],
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
): Record<string, BlockBoxLayout> {
  const delta = nextLayout.height - previousLayout.height;
  const nextLayouts = { ...layouts, [blockId]: nextLayout };
  if (Math.abs(delta) < 1) return nextLayouts;

  const previousBottom = previousLayout.y + previousLayout.height;
  Object.entries(layouts).forEach(([id, layout]) => {
    if (id === blockId) return;
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
): { layout: BlockBoxLayout; guide: SnapGuide | null } {
  const otherLayouts = Object.entries(layouts)
    .filter(([id]) => id !== blockId)
    .map(([, item]) => item);
  const xTargets = [0, contentWidth - layout.width, ...otherLayouts.flatMap((item) => [item.x, item.x + item.width])];
  const yTargets = [0, ...otherLayouts.flatMap((item) => [item.y, item.y + item.height])];
  const snappedX = snapToTargets(layout.x, xTargets);
  const snappedY = snapToTargets(layout.y, yTargets);
  const next = { ...layout, x: snappedX.value, y: snappedY.value };
  const guide = snappedX.snapped !== undefined || snappedY.snapped !== undefined
    ? { x: snappedX.snapped, y: snappedY.snapped }
    : null;
  return { layout: next, guide };
}
