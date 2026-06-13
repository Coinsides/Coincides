import type {
  BlockPlacementModel,
  CanvasObjectReserve,
  CanvasViewport,
  CanvasWorldModel,
  NoteCanvasMode,
  NoteCanvasRuntimeModel,
  PageFrameModel,
  RelationEndpointReserve,
} from './types';
import { getVisibleBlockIds } from './geometry';

export const NOTE_CANVAS_ENGINE_VERSION = 'V2.BN.8-self-owned-minimal-hybrid-0';

export const DEFAULT_CANVAS_WORLD: CanvasWorldModel = {
  origin: { x: 0, y: 0 },
  width: 4096,
  height: 2600,
};

export const DEFAULT_PRIMARY_PAGE_CONTENT_WIDTH = 760;
export const DEFAULT_PRIMARY_PAGE_FRAME_CONTENT_INSET = {
  top: 0,
  right: 72,
  bottom: 96,
  left: 72,
};

export const DEFAULT_PRIMARY_PAGE_FRAME: PageFrameModel = {
  id: 'primary-page-frame',
  role: 'primary_page_frame',
  exportable: true,
  x: 0,
  y: 0,
  width: DEFAULT_PRIMARY_PAGE_CONTENT_WIDTH
    + DEFAULT_PRIMARY_PAGE_FRAME_CONTENT_INSET.left
    + DEFAULT_PRIMARY_PAGE_FRAME_CONTENT_INSET.right,
  height: 580,
  contentInset: DEFAULT_PRIMARY_PAGE_FRAME_CONTENT_INSET,
};

export const CANVAS_PRIMARY_PAGE_OFFSET_X = 96;

export function createPrimaryPageFrame(options: Partial<PageFrameModel> = {}): PageFrameModel {
  return {
    ...DEFAULT_PRIMARY_PAGE_FRAME,
    ...options,
    id: options.id || DEFAULT_PRIMARY_PAGE_FRAME.id,
    role: 'primary_page_frame',
    exportable: options.exportable ?? true,
    contentInset: options.contentInset || DEFAULT_PRIMARY_PAGE_FRAME.contentInset,
  };
}

export function createViewport(options: Partial<CanvasViewport> = {}): CanvasViewport {
  return {
    x: 0,
    y: 0,
    width: 1280,
    height: 720,
    zoom: 1,
    ...options,
  };
}

export function buildNoteCanvasRuntimeModel({
  mode,
  world = DEFAULT_CANVAS_WORLD,
  primaryPageFrame,
  viewport,
  blockPlacements,
  canvasObjectReserve = [],
  relationEndpointReserve = [],
}: {
  mode: NoteCanvasMode;
  world?: CanvasWorldModel;
  primaryPageFrame: PageFrameModel | null;
  viewport: CanvasViewport;
  blockPlacements: BlockPlacementModel[];
  canvasObjectReserve?: CanvasObjectReserve[];
  relationEndpointReserve?: RelationEndpointReserve[];
}): NoteCanvasRuntimeModel {
  return {
    version: NOTE_CANVAS_ENGINE_VERSION,
    route: 'self_owned_minimal_hybrid',
    mode,
    world,
    primaryPageFrame,
    blockPlacements,
    visibleBlockIds: getVisibleBlockIds(blockPlacements, viewport),
    canvasObjectReserve,
    relationEndpointReserve,
  };
}
