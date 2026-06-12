import {
  DEFAULT_CANVAS_WORLD,
  DEFAULT_PRIMARY_PAGE_FRAME,
} from './engineModel';

export type SurfaceMode = 'page' | 'canvas';
export type BoundaryKind = 'inside' | 'outside' | 'crossing';
export type ExportRole = 'included' | 'excluded' | 'scratch';
export type AIVisibility = 'visible' | 'hidden';

export interface BlockBoxLayout {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  export_role?: ExportRole;
  ai_visibility?: AIVisibility;
  surface?: 'formal_page' | 'canvas_workspace';
}

export interface SnapGuide {
  x?: number;
  y?: number;
}

export interface LayoutHistoryEntry {
  before: Record<string, BlockBoxLayout>;
  after: Record<string, BlockBoxLayout>;
}

export const NOTE_LAYOUT_KEY = 'better_notebook_layout';
export const DEFAULT_PAGE_CONTENT_WIDTH = DEFAULT_PRIMARY_PAGE_FRAME.width;
export const CANVAS_WORKSPACE_WIDTH = DEFAULT_CANVAS_WORLD.width;
export const CANVAS_WORKSPACE_HEIGHT = DEFAULT_CANVAS_WORLD.height;
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
export const TEXT_LINE_HEIGHT = 27;
export const TEXT_AVERAGE_CHAR_WIDTH = 8.2;
