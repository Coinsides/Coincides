export type BoardJsonObject = Record<string, unknown>;
import type { BoardTextRangeSelection, BoardTextRangeStatus } from '@shared/types/boardTextRange';
export type { BoardLayer } from '@shared/types/boardLayers';
import type { BoardLayer } from '@shared/types/boardLayers';

/** Includes the virtual Base layer. */
export const BOARD_LAYER_LIMIT = 12;

export interface BoardViewport {
  x: number;
  y: number;
  zoom: number;
}

/** Geometry belongs to the projection, never to the referenced paper. */
export interface BoardGeometry {
  x: number;
  y: number;
  w: number;
  h: number;
  scale: number;
  z_index: number;
  pinned: boolean;
}

export interface Board {
  id: string;
  user_id: string;
  title: string;
  /** The stored Board–Item bridge; title and identity description are independent. */
  identity_item_id: string | null;
  identity_description: string | null;
  soul_id: string;
  project_id: string | null;
  viewport: BoardViewport;
  base_layer_visible?: boolean;
  created_at: string;
  updated_at: string;
}

export type BoardMemberKind = 'note' | 'item' | 'content_group' | 'text_range';
export type BoardWritableMemberKind = 'note' | 'content_group' | 'item' | 'text_range';

export interface BoardMemberReference {
  kind: BoardMemberKind;
  id: string;
  state: 'available' | 'unavailable' | 'missing';
  reason: string | null;
  title: string | null;
  note_id: string | null;
  summary?: string;
  plain_text?: string;
  item_type?: string | null;
  topic?: string | null;
  item_status?: 'active' | 'retired' | 'missing';
  origin_board_id?: string | null;
  origin_board_title?: string | null;
  anchor_status?: BoardTextRangeStatus;
  block_id?: string | null;
  start_offset?: number | null;
  end_offset?: number | null;
}

export interface BoardMember extends BoardGeometry {
  id: string;
  board_id: string;
  /** Omitted in older snapshots; null is the virtual Base layer. */
  layer_id?: string | null;
  member_kind: BoardMemberKind;
  member_id: string;
  /** Older in-flight projections omit these; only explicit false means staging.
   * Current server DTOs always hydrate both fields (true / human are the legacy defaults). */
  placed?: boolean;
  mounted_actor?: string;
  metadata: BoardJsonObject;
  reference: BoardMemberReference;
  created_at: string;
  updated_at: string;
}

export interface BoardEdge {
  id: string;
  board_id: string;
  from_member_id: string;
  to_member_id: string;
  style: BoardJsonObject;
  label: string | null;
  created_at: string;
}

export type BoardVisualKind = 'freehand' | 'shape' | 'image' | 'table' | 'connector' | 'sticky';

export interface BoardVisual extends BoardGeometry {
  id: string;
  board_id: string;
  layer_id?: string | null;
  visual_kind: BoardVisualKind;
  rotation: number;
  data: BoardJsonObject;
  metadata: BoardJsonObject;
  created_at: string;
  updated_at: string;
}

export interface BoardDetail {
  board: Board;
  members: BoardMember[];
  edges: BoardEdge[];
  visuals: BoardVisual[];
  layers?: BoardLayer[];
}

export interface TrayRelocationResult {
  board_id: string;
  batch_id: string;
  placement_ids: string[];
  visual_ids: string[];
  member_ids: string[];
  applied: boolean;
  geometry: {
    preserved_placement_ids: string[];
    default_grid_placement_ids: string[];
  };
}

export interface CreateBoardPurposeInput {
  title: string;
  project_id?: string | null;
  intent?: string | null;
  scope_note?: string | null;
  created_by?: 'human' | 'ai' | 'system' | 'ai_proposal' | 'importer';
  metadata?: BoardJsonObject;
}

export type CreateBoardInput = {
  title: string;
  project_id?: string | null;
  viewport?: BoardViewport;
  summary?: string;
  purpose_summary?: string;
} & (
  | { soul_id: string; purpose?: never }
  | { purpose: CreateBoardPurposeInput; soul_id?: never }
);

export interface PatchBoardInput {
  title?: string;
  viewport?: BoardViewport;
  base_layer_visible?: boolean;
}

export interface CreateBoardLayerInput { name: string }
export interface PatchBoardLayerInput { name?: string; visible?: boolean }

export interface MountBoardMemberInput extends Partial<BoardGeometry> {
  layer_id?: string | null;
  placed?: boolean;
  id?: string;
  member_kind: BoardWritableMemberKind;
  member_id: string;
  metadata?: BoardJsonObject;
  summary?: string;
}

export type PatchBoardMemberInput = Partial<BoardGeometry> & { placed?: boolean; layer_id?: string | null };

export interface MountBoardTextRangeInput extends Partial<BoardGeometry> {
  layer_id?: string | null;
  placed?: boolean;
  text_range: BoardTextRangeSelection;
}

export interface CreateBoardEdgeInput {
  from_member_id: string;
  to_member_id: string;
  style?: BoardJsonObject;
  label?: string | null;
}

export type PatchBoardEdgeInput = Partial<CreateBoardEdgeInput>;

export interface CreateBoardVisualInput extends Partial<BoardGeometry> {
  layer_id?: string | null;
  visual_kind: BoardVisualKind;
  rotation?: number;
  data: BoardJsonObject;
  metadata?: BoardJsonObject;
}

export type PatchBoardVisualInput = Partial<Omit<CreateBoardVisualInput, 'visual_kind'>>;

export interface BoardCandidate {
  member_kind: BoardWritableMemberKind;
  member_id: string;
  note_id: string | null;
  title: string;
  summary: string;
  project_title: string;
  item_type?: string | null;
  topic?: string | null;
}
