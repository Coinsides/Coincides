export type NoteCanvasMode = 'page' | 'canvas';

export type CanvasSurface = 'formal_page' | 'canvas_workspace';

export type CanvasBoundaryKind = 'inside' | 'outside' | 'crossing';

export interface CanvasPoint {
  x: number;
  y: number;
}

export interface CanvasSize {
  width: number;
  height: number;
}

export interface CanvasRect extends CanvasPoint, CanvasSize {}

export interface CanvasViewport extends CanvasPoint, CanvasSize {
  zoom: number;
}

export interface PageFrameModel extends CanvasRect {
  id: string;
  role: 'primary_page_frame';
  exportable: boolean;
}

export interface CanvasWorldModel extends CanvasSize {
  origin: CanvasPoint;
}

export interface BlockPlacementModel extends CanvasRect {
  blockId: string;
  surface?: CanvasSurface;
  rotation?: number;
}

export interface CanvasObjectReserve extends CanvasRect {
  id: string;
  kind: 'shape' | 'freehand' | 'image' | 'frame' | 'region';
  rotation?: number;
}

export interface RelationEndpointReserve {
  id: string;
  ownerId: string;
  ownerKind: 'note_block' | 'canvas_object' | 'page_frame';
  anchor: CanvasPoint;
  normal?: CanvasPoint;
}

export interface NoteCanvasRuntimeModel {
  version: string;
  route: 'self_owned_minimal_hybrid';
  mode: NoteCanvasMode;
  world: CanvasWorldModel;
  primaryPageFrame: PageFrameModel | null;
  blockPlacements: BlockPlacementModel[];
  visibleBlockIds: string[];
  canvasObjectReserve: CanvasObjectReserve[];
  relationEndpointReserve: RelationEndpointReserve[];
}
