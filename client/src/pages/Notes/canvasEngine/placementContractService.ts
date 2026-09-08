import { classifyCanvasSurfaceAuthority } from '../../../../../shared/types/canvasSurfaceAuthority';
import { derivePlacementPageFrameAffiliation } from './pageFrameAffiliationService';
import { DEFAULT_BLOCK_GAP, DEFAULT_BLOCK_HEIGHT, DEFAULT_PAGE_CONTENT_WIDTH, type BlockBoxLayout, type SurfaceMode } from './runtimeLayout';
import type { CanvasRect, PageFrameModel } from './types';

/** The contract belongs to the loaded canvas session, never to an individual row. */
export type CoordinateContract = 'v1' | 'v2';

export function requiresFrameLocalWriteContext(contract: CoordinateContract): boolean {
  return contract === 'v2';
}

export interface PlacementContractContext {
  contract?: CoordinateContract;
  pageFrames?: PageFrameModel[];
  pageOffsetX?: number;
  surfaceMode?: SurfaceMode;
}

function contentOrigin(frame: PageFrameModel): { x: number; y: number } {
  return { x: frame.x + frame.contentInset.left, y: frame.y + frame.contentInset.top };
}

/** Explicit ownership wins; world geometry otherwise selects a frame in both axes. */
export function selectPlacementFrame(
  layout: Partial<BlockBoxLayout>,
  frames: PageFrameModel[],
  contract: CoordinateContract = 'v1',
  fallback?: PageFrameModel | null,
): PageFrameModel | undefined {
  if (contract === 'v1') return fallback === undefined ? frames[0] : fallback || undefined;
  if (layout.frame_id) return frames.find((frame) => frame.id === layout.frame_id);
  if (layout.coordinate_space !== 'canvas_world') return undefined;
  if (![layout.x, layout.y, layout.width, layout.height].every((value) => typeof value === 'number' && Number.isFinite(value))) {
    return undefined;
  }
  const affiliation = derivePlacementPageFrameAffiliation({
    placement: layout as CanvasRect,
    pageFrames: frames,
  });
  return frames.find((frame) => frame.id === affiliation.pageFrameId);
}

export function resolveWorldRect(
  layout: BlockBoxLayout,
  frame: PageFrameModel | null | undefined,
  contract: CoordinateContract = 'v1',
  pageOffsetX = 0,
): CanvasRect {
  if (contract === 'v1') {
    return { x: layout.coordinate_space === 'canvas_world' ? layout.x : layout.x + pageOffsetX,
      y: layout.y, width: layout.width, height: layout.height };
  }
  if (!frame || layout.coordinate_space !== 'page_frame_local' || layout.surface === 'tray') {
    return { x: layout.x, y: layout.y, width: layout.width, height: layout.height };
  }
  const origin = contentOrigin(frame);
  return { x: layout.x + origin.x, y: layout.y + origin.y, width: layout.width, height: layout.height };
}

/** The continuous paper's horizontal origin remains the existing page offset. */
export function resolveScreenRect(
  layout: BlockBoxLayout,
  frame: PageFrameModel | null | undefined,
  contract: CoordinateContract = 'v1',
  pageOffsetX = 0,
): CanvasRect {
  if (contract === 'v1') return { x: layout.x + pageOffsetX, y: layout.y, width: layout.width, height: layout.height };
  const world = resolveWorldRect(layout, frame, contract, pageOffsetX);
  return { ...world, x: layout.x + pageOffsetX };
}

export function resolveAffiliationRect(
  layout: BlockBoxLayout,
  frame: PageFrameModel | null | undefined,
  contract: CoordinateContract = 'v1',
  pageOffsetX = 0,
): CanvasRect {
  return contract === 'v1'
    ? { x: layout.x + pageOffsetX, y: layout.y, width: layout.width, height: layout.height }
    : resolveWorldRect(layout, frame, contract, pageOffsetX);
}

/** V2 writes only explicit world inputs through an axis-complete conversion. */
export function toStoredLayout(
  layout: BlockBoxLayout,
  frames: PageFrameModel[],
  contract: CoordinateContract = 'v1',
): BlockBoxLayout {
  if (contract === 'v1' || layout.surface === 'tray' || layout.surface === 'canvas_workspace') return layout;
  const frame = selectPlacementFrame(layout, frames, contract);
  if (!frame) return layout;
  const origin = contentOrigin(frame);
  const x = layout.coordinate_space === 'canvas_world' ? layout.x - origin.x : layout.x;
  const y = layout.coordinate_space === 'canvas_world' ? layout.y - origin.y : layout.y;
  const pageBoundary = { left: 0, right: frame.width - frame.contentInset.left - frame.contentInset.right, frameId: frame.id };
  const authority = classifyCanvasSurfaceAuthority({
    coordinateSpace: 'page_frame_local', box: { x, width: layout.width }, pageBoundary, explicitSurface: layout.surface,
  });
  return {
    ...layout, x, y, coordinate_space: 'page_frame_local', frame_id: frame.id,
    surface: authority.surface, boundary_role: authority.boundaryRole,
    surface_authority: { coordinateSpace: 'page_frame_local', pageBoundary },
  };
}

export function reconcileContractHydratedLayout(
  layout: Record<string, unknown>,
  frames: PageFrameModel[],
  contract: CoordinateContract,
  legacy: (layout: Record<string, unknown>, frames: PageFrameModel[]) => Record<string, unknown>,
): Record<string, unknown> {
  if (contract === 'v1') return legacy(layout, frames);
  if (layout.surface === 'tray' || layout.surface === 'canvas_workspace') return layout;
  if (![layout.x, layout.y, layout.width, layout.height].every((value) => typeof value === 'number' && Number.isFinite(value))) return layout;
  // Unknown historical tags are not evidence for a coordinate conversion.
  if (layout.coordinate_space !== 'canvas_world' && layout.coordinate_space !== 'page_frame_local') return layout;
  return toStoredLayout(layout as unknown as BlockBoxLayout, frames, contract) as unknown as Record<string, unknown>;
}

/** Unresolved historical rows may be read, but cannot become new v2 world writes. */
export function requireStoredLayout(
  layout: BlockBoxLayout,
  frames: PageFrameModel[],
  contract: CoordinateContract = 'v1',
): BlockBoxLayout {
  const stored = toStoredLayout(layout, frames, contract);
  if (contract === 'v2' && stored.surface !== 'tray' && stored.surface !== 'canvas_workspace'
    && (stored.coordinate_space !== 'page_frame_local' || !frames.some((frame) => frame.id === stored.frame_id))) {
    throw new Error('A resolved page frame is required to save this coordinate contract');
  }
  return stored;
}

export function sameLayoutFrame(a: BlockBoxLayout, b: BlockBoxLayout, contract: CoordinateContract = 'v1'): boolean {
  return contract === 'v1' || a.frame_id === b.frame_id;
}

export function preserveContractLayoutCoordinates(
  layout: Partial<BlockBoxLayout> | null,
  contract: CoordinateContract = 'v1',
): boolean {
  return layout?.coordinate_space === 'canvas_world'
    || (contract === 'v2' && layout?.coordinate_space === 'page_frame_local');
}

export function placementCoordinateIdentityEqual(a: BlockBoxLayout, b: BlockBoxLayout, contract: CoordinateContract = 'v1'): boolean {
  return contract === 'v1' || (a.frame_id === b.frame_id
    && a.coordinate_space === b.coordinate_space && a.boundary_role === b.boundary_role);
}

export function moveAffiliatedLayout(
  layout: BlockBoxLayout,
  frame: PageFrameModel,
  delta: { x: number; y: number },
  contract: CoordinateContract = 'v1',
): BlockBoxLayout {
  if (contract === 'v2' && layout.coordinate_space === 'page_frame_local' && layout.frame_id === frame.id) return layout;
  return { ...layout, x: layout.x + delta.x, y: layout.y + delta.y };
}

export function projectContractLayoutToWorld(
  layout: BlockBoxLayout,
  frame: PageFrameModel | null | undefined,
  pageOffsetX: number,
  contract: CoordinateContract,
  legacy: () => BlockBoxLayout,
): BlockBoxLayout {
  if (contract === 'v1') return legacy();
  if (!frame || layout.surface === 'tray' || layout.coordinate_space !== 'page_frame_local') return layout;
  return {
    ...layout, ...resolveWorldRect(layout, frame, contract, pageOffsetX),
    surface: 'formal_page', coordinate_space: 'canvas_world', frame_id: frame.id,
    surface_authority: { coordinateSpace: 'canvas_world', pageBoundary: {
      left: frame.x + frame.contentInset.left, right: frame.x + frame.width - frame.contentInset.right, frameId: frame.id,
    } },
  };
}

export function applyWorldRectToLayout(
  layout: BlockBoxLayout,
  currentWorld: CanvasRect,
  nextWorld: CanvasRect,
  contract: CoordinateContract = 'v1',
  legacy: () => BlockBoxLayout,
): BlockBoxLayout {
  if (contract === 'v1') return legacy();
  return { ...layout, x: layout.x + nextWorld.x - currentWorld.x, y: layout.y + nextWorld.y - currentWorld.y };
}

/** Converts a new pointer/drop rectangle from the continuous paper, never a stored row. */
export function screenLayoutToLocal(
  layout: BlockBoxLayout,
  frames: PageFrameModel[],
  contract: CoordinateContract = 'v1',
): BlockBoxLayout {
  if (contract === 'v1') return layout;
  const frame = frames.find((candidate) => {
    const origin = contentOrigin(candidate);
    const width = candidate.width - candidate.contentInset.left - candidate.contentInset.right;
    const height = candidate.height - candidate.contentInset.top - candidate.contentInset.bottom;
    return layout.y >= origin.y && layout.y < origin.y + height
      && layout.x < width && layout.x + layout.width > 0;
  }) || frames.find((candidate) => candidate.id === layout.frame_id);
  if (!frame) return layout;
  return toStoredLayout({
    ...layout, y: layout.y - contentOrigin(frame).y,
    coordinate_space: 'page_frame_local', surface: 'formal_page', frame_id: frame.id,
  }, frames, contract);
}

export function draftAuthorityBoundary(frame: PageFrameModel, contract: CoordinateContract = 'v1') {
  const origin = contentOrigin(frame);
  const width = frame.width - frame.contentInset.left - frame.contentInset.right;
  return { left: contract === 'v1' ? origin.x : 0, right: contract === 'v1' ? origin.x + width : width, frameId: frame.id };
}

export function resolveFlowFrameStartLayout(
  frame: PageFrameModel,
  draft: BlockBoxLayout,
  _pageOffsetX: number,
  contract: CoordinateContract,
  legacy: () => BlockBoxLayout,
): BlockBoxLayout {
  if (contract === 'v1') return legacy();
  return toStoredLayout({
    ...draft, x: 0, y: 0,
    width: Math.min(draft.width, frame.width - frame.contentInset.left - frame.contentInset.right || draft.width),
    coordinate_space: 'page_frame_local', surface: 'formal_page', frame_id: frame.id, boundary_role: 'inside',
  }, [frame], contract);
}

export function canonicalizeDraftLayout(
  layout: BlockBoxLayout,
  frame: PageFrameModel,
  pageOffsetX: number,
  layoutCoordinates: 'page_frame_local' | 'runtime_surface',
  contract: CoordinateContract,
  legacy: () => BlockBoxLayout,
): BlockBoxLayout {
  if (contract === 'v1') return legacy();
  const input = layout.coordinate_space === 'canvas_world'
    ? layout
    : layout.coordinate_space === 'page_frame_local' || layoutCoordinates === 'page_frame_local'
      ? { ...layout, coordinate_space: 'page_frame_local' as const }
      : { ...layout, x: layout.x + pageOffsetX, coordinate_space: 'canvas_world' as const };
  return toStoredLayout({ ...input, frame_id: frame.id, surface: 'formal_page' }, [frame], contract);
}

export function resolveDefaultDraftLayout(
  layouts: Record<string, BlockBoxLayout>,
  contentWidth: number,
  frames: PageFrameModel[],
  contract: CoordinateContract,
  legacy: () => BlockBoxLayout,
): BlockBoxLayout {
  if (contract === 'v1' || frames.length === 0) return legacy();
  const pageLayouts = Object.values(layouts).filter((layout) => layout.surface !== 'tray' && layout.surface !== 'canvas_workspace');
  const frame = [...frames].reverse().find((candidate) => pageLayouts.some((layout) => layout.frame_id === candidate.id)) || frames[0];
  const bottoms = pageLayouts.filter((layout) => layout.frame_id === frame.id)
    .map((layout) => toStoredLayout(layout, frames, contract))
    .map((layout) => layout.y + layout.height);
  return toStoredLayout({
    x: 0, y: bottoms.length > 0 ? Math.max(...bottoms) + DEFAULT_BLOCK_GAP : 0,
    width: Math.min(DEFAULT_PAGE_CONTENT_WIDTH, contentWidth, frame.width - frame.contentInset.left - frame.contentInset.right),
    height: DEFAULT_BLOCK_HEIGHT, coordinate_space: 'page_frame_local', surface: 'formal_page', frame_id: frame.id,
  }, frames, contract);
}

export function resolveFlowCurrentFrameId(
  draft: BlockBoxLayout,
  legacyId: string | null | undefined,
  contract: CoordinateContract = 'v1',
): string | null | undefined {
  return contract === 'v1' ? legacyId : draft.frame_id || legacyId;
}

/** Generic canvas consumers retain world geometry; conversion happens once at I/O. */
export function resolveGenericPlacementToWorld<T extends CanvasRect & { frameId?: string; surface: string }>(
  placement: T,
  objectKind: string | undefined,
  coordinateSpace: unknown,
  frames: PageFrameModel[],
  contract: CoordinateContract = 'v1',
): T {
  if (contract === 'v1' || objectKind === 'page_frame' || placement.surface !== 'formal_page'
    || coordinateSpace !== 'page_frame_local') return placement;
  const frame = frames.find((candidate) => candidate.id === placement.frameId);
  if (!frame) return placement;
  const origin = contentOrigin(frame);
  return { ...placement, x: placement.x + origin.x, y: placement.y + origin.y };
}

/** Generic editors supply world values, including after a previous save/reload. */
export function toStoredGenericCanvasObjectPayload(
  payload: Record<string, unknown>,
  frames: PageFrameModel[],
  contract: CoordinateContract = 'v1',
): Record<string, unknown> {
  if (contract === 'v1' || payload.kind === 'page_frame') return payload;
  const placement = payload.placement;
  if (!placement || typeof placement !== 'object' || Array.isArray(placement)) return payload;
  const raw = placement as Record<string, unknown>;
  if (raw.surface !== 'formal_page'
    || ![raw.x, raw.y, raw.width, raw.height].every((value) => typeof value === 'number' && Number.isFinite(value))) return payload;
  const frame = selectPlacementFrame({
    x: raw.x as number, y: raw.y as number, width: raw.width as number, height: raw.height as number,
    frame_id: typeof raw.frame_id === 'string' ? raw.frame_id : undefined,
    coordinate_space: 'canvas_world', surface: 'formal_page',
  }, frames, contract);
  if (!frame) throw new Error('A resolved page frame is required to save this coordinate contract');
  const origin = contentOrigin(frame);
  return {
    ...payload,
    placement: {
      ...raw, x: (raw.x as number) - origin.x, y: (raw.y as number) - origin.y,
      coordinate_space: 'page_frame_local', frame_id: frame.id,
    },
  };
}
