import {
  DEFAULT_DOCUMENT_TYPOGRAPHY_PROFILE,
  DEFAULT_PAGE_FRAME_PAGE_SIZE,
  PAGE_FRAME_PRINT_PRESETS,
} from './pageFramePrintScaleService';
import type {
  CanvasSurfaceBoundaryRole,
  CanvasSurfaceCoordinateSpace,
  CanvasSurfacePageBoundary,
} from '../../../../../shared/types/canvasSurfaceAuthority';

export type SurfaceMode = 'page' | 'canvas';
export type BoundaryKind = 'inside' | 'outside' | 'crossing';
export type ExportRole = 'included' | 'excluded' | 'scratch';
export type AIVisibility = 'visible' | 'hidden';
export type LayoutWidthMode = 'auto' | 'manual';

export interface BlockLayoutSurfaceAuthorityContext {
  coordinateSpace: CanvasSurfaceCoordinateSpace;
  pageBoundary?: CanvasSurfacePageBoundary;
}

export interface BlockBoxLayout {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  export_role?: ExportRole;
  ai_visibility?: AIVisibility;
  surface?: 'formal_page' | 'canvas_workspace';
  width_mode?: LayoutWidthMode;
  coordinate_space?: CanvasSurfaceCoordinateSpace;
  frame_id?: string;
  boundary_role?: CanvasSurfaceBoundaryRole;
  surface_authority?: BlockLayoutSurfaceAuthorityContext;
}

export type PageFrameLocalBlockBoxLayout = BlockBoxLayout & {
  coordinate_space: 'page_frame_local';
};

export type CanvasWorldBlockBoxLayout = BlockBoxLayout & {
  coordinate_space: 'canvas_world';
  surface_authority: BlockLayoutSurfaceAuthorityContext & {
    coordinateSpace: 'canvas_world';
    pageBoundary: CanvasSurfacePageBoundary;
  };
};

export interface SnapGuide {
  x?: number;
  y?: number;
}

export interface LayoutHistoryEntry {
  before: Record<string, BlockBoxLayout>;
  after: Record<string, BlockBoxLayout>;
}

export interface SlashMenuAnchor {
  x: number;
  y: number;
}

export const NOTE_LAYOUT_KEY = 'better_notebook_layout';
const DEFAULT_RUNTIME_PAGE_FRAME_PROFILE = PAGE_FRAME_PRINT_PRESETS[DEFAULT_PAGE_FRAME_PAGE_SIZE];
export const DEFAULT_PAGE_CONTENT_WIDTH = DEFAULT_RUNTIME_PAGE_FRAME_PROFILE.contentWidth;
export const DEFAULT_PAGE_FRAME_CONTENT_INSET = DEFAULT_RUNTIME_PAGE_FRAME_PROFILE.contentInset;
export const DEFAULT_PAGE_FRAME_HEIGHT = DEFAULT_RUNTIME_PAGE_FRAME_PROFILE.height;
export const PAGE_FRAME_BOTTOM_PADDING = 96;
export const CANVAS_WORKSPACE_WIDTH = 4096;
export const CANVAS_WORKSPACE_HEIGHT = 2600;
export const DEFAULT_BLOCK_HEIGHT = 72;
export const DEFAULT_BLOCK_GAP = 0;
export const STACKED_BLOCK_GAP = 0;
export const MIN_BLOCK_WIDTH = 36;
export const MIN_BLOCK_HEIGHT = 42;
export const SNAP_THRESHOLD = 8;
export const ELASTIC_AVOIDANCE_ACTIVATION_DISTANCE = 10;
export const LAYOUT_MEASURE_SUPPRESSION_MS = 350;
export const SLASH_MENU_WIDTH = 420;
export const SLASH_MENU_HEIGHT_ESTIMATE = 320;
export const SLASH_MENU_OFFSET = 8;
export const BLOCK_HORIZONTAL_CHROME = 18;
export const BLOCK_VERTICAL_CHROME = 16;
export const TEXT_LINE_HEIGHT = DEFAULT_DOCUMENT_TYPOGRAPHY_PROFILE.lineHeightPx;
export const TEXT_AVERAGE_CHAR_WIDTH = DEFAULT_DOCUMENT_TYPOGRAPHY_PROFILE.averageCharWidthPx;
