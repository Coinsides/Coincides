export type BoardJsonObject = Record<string, unknown>;

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
  soul_id: string;
  project_id: string | null;
  viewport: BoardViewport;
  created_at: string;
  updated_at: string;
}

export type BoardMemberKind = 'note' | 'item' | 'content_group' | 'text_range';
export type BoardWritableMemberKind = 'note' | 'content_group';

export interface BoardMemberReference {
  kind: BoardMemberKind;
  id: string;
  state: 'available' | 'unavailable' | 'missing';
  reason: string | null;
  title: string | null;
  note_id: string | null;
}

export interface BoardMember extends BoardGeometry {
  id: string;
  board_id: string;
  member_kind: BoardMemberKind;
  member_id: string;
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

export type BoardVisualKind = 'freehand' | 'shape' | 'image' | 'table' | 'connector';

export interface BoardVisual extends BoardGeometry {
  id: string;
  board_id: string;
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
}

export interface MountBoardMemberInput extends Partial<BoardGeometry> {
  id?: string;
  member_kind: BoardWritableMemberKind;
  member_id: string;
  metadata?: BoardJsonObject;
  summary?: string;
}

export type PatchBoardMemberInput = Partial<BoardGeometry>;

export interface CreateBoardEdgeInput {
  from_member_id: string;
  to_member_id: string;
  style?: BoardJsonObject;
  label?: string | null;
}

export type PatchBoardEdgeInput = Partial<CreateBoardEdgeInput>;

export interface CreateBoardVisualInput extends Partial<BoardGeometry> {
  visual_kind: BoardVisualKind;
  rotation?: number;
  data: BoardJsonObject;
  metadata?: BoardJsonObject;
}

export type PatchBoardVisualInput = Partial<Omit<CreateBoardVisualInput, 'visual_kind'>>;

export interface BoardCandidate {
  member_kind: BoardWritableMemberKind;
  member_id: string;
  note_id: string;
  title: string;
  summary: string;
  project_title: string;
}
