export interface Note {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  status: string;
  metadata?: Record<string, unknown>;
}

export interface SourceReference {
  id?: string;
  document_id?: string | null;
  source_page_start?: number | null;
  source_page_end?: number | null;
  source_excerpt?: string | null;
  confidence?: number | null;
}

export interface SourceAnchor {
  id: string;
  source_snapshot_id: string;
  source_snapshot_page_id: string | null;
  anchor_kind: string;
  page_start: number | null;
  page_end: number | null;
  metadata: {
    note_block_source_id?: string;
    [key: string]: unknown;
  };
}

export interface SourceJumpTarget {
  anchor: SourceAnchor;
  snapshot: {
    id: string;
    title: string;
    source_filename: string;
  };
  page: {
    id: string;
    page_number: number;
    page_label: string | null;
    text_content: string;
  };
  focus: {
    page_start: number | null;
    page_end: number | null;
    text_start_offset: number | null;
    text_end_offset: number | null;
  };
  warnings: string[];
}

export type TextFlowContentVersion = 'TextBlockContentV1';

export type TextUnitWritingRole =
  | 'paragraph'
  | 'heading'
  | 'quote'
  | 'bullet_item'
  | 'numbered_item'
  | 'todo_item'
  | 'toggle_item'
  | 'code_line';

export type TextFlowObjectStatus = 'active' | 'draft' | 'deprecated' | 'deleted';

export interface TextUnit {
  id: string;
  text: string;
  writing_role: TextUnitWritingRole;
  indent_level: number;
  order_index: number;
  metadata: Record<string, unknown>;
  status: TextFlowObjectStatus;
}

export type InlineStructuredObjectSemanticKind =
  | 'inline_formula'
  | 'inline_code'
  | 'inline_definition'
  | 'inline_source_marker'
  | 'inline_link'
  | 'inline_concept_mention'
  | 'inline_claim'
  | 'custom';

export interface InlineStructuredObject {
  id: string;
  semantic_kind: InlineStructuredObjectSemanticKind;
  parent_text_unit_id: string;
  anchor_text: string | null;
  anchor_range: {
    start: number;
    end: number;
  } | null;
  field_values: Record<string, unknown>;
  metadata: Record<string, unknown>;
  status: TextFlowObjectStatus;
}

export type AnnotationRangeTargetKind =
  | 'text_unit'
  | 'text_span'
  | 'block'
  | 'inline_structure'
  | 'canvas_object'
  | 'source_region';

export type AnnotationMarkerKind = 'highlight' | 'underline' | 'badge' | 'quiet';
export type AnnotationStatus = 'active' | 'hidden' | 'deleted';
export type AnnotationCreatedBy = 'human' | 'ai_proposal' | 'importer';
export type ContentGroupStatus = 'active' | 'hidden' | 'deleted';
export type ContentGroupCreatedBy = 'human' | 'ai_proposal' | 'importer';
export type ContentGroupMemberKind =
  | 'content_range'
  | 'annotation'
  | 'block'
  | 'content_group'
  | 'canvas_object'
  | 'table_region'
  | 'image_region'
  | 'future_object';
export type ContentGroupMemberIntegrityStatus = 'valid' | 'stale' | 'orphaned' | 'unsupported';
export type ContentGroupMemberSourceSyncStatus =
  | 'fresh'
  | 'changed'
  | 'missing'
  | 'detached'
  | 'unsupported';
export type GroupFolderStatus = 'active' | 'archived' | 'deleted';
export type GroupFolderOrigin = 'system' | 'human' | 'ai_proposal';
export type GroupFolderScopeKind = 'workspace' | 'project' | 'note' | 'custom';
export type ReadingInterpretationStatus = 'draft' | 'proposed' | 'accepted' | 'rejected' | 'superseded';
export type ReadingInterpretationCreatedBy = 'ai' | 'importer' | 'human_debug';

export interface AnnotationRangeV1 {
  id: string;
  target_kind: AnnotationRangeTargetKind;
  block_id?: string;
  text_flow_id?: string;
  text_unit_id?: string;
  inline_structure_id?: string;
  canvas_object_id?: string;
  source_region_id?: string;
  start_offset?: number;
  end_offset?: number;
  range_text_cache?: string;
}

export interface AnnotationTruthV1 {
  id: string;
  note_id: string;
  canvas_id: string;
  raw_label: string;
  ranges: AnnotationRangeV1[];
  parent_annotation_id: string | null;
  child_annotation_ids: string[];
  visual_style: {
    color_token: string;
    marker_kind: AnnotationMarkerKind;
  };
  created_by: AnnotationCreatedBy;
  status: AnnotationStatus;
  created_at: string;
  updated_at: string;
  metadata?: Record<string, unknown>;
}

export interface ContentGroupMemberSourceRefV1 {
  source_artifact_id?: string | null;
  note_id?: string | null;
  block_id?: string | null;
  range?: AnnotationRangeV1 | null;
  snapshot_text?: string | null;
  snapshot_hash?: string | null;
  status?: ContentGroupMemberSourceSyncStatus;
  updated_at?: string | null;
  metadata?: Record<string, unknown>;
}

export interface ContentGroupMemberV1 {
  id: string;
  kind: ContentGroupMemberKind;
  target_id?: string | null;
  content_range?: AnnotationRangeV1 | null;
  label?: string | null;
  current_content?: string | null;
  source_ref?: ContentGroupMemberSourceRefV1 | null;
  source_sync_status?: ContentGroupMemberSourceSyncStatus;
  preview_text?: string | null;
  order_index: number;
  metadata?: {
    integrity_status?: ContentGroupMemberIntegrityStatus;
    integrity_reason?: string | null;
    preview_refreshed_at?: string;
    [key: string]: unknown;
  };
}

export interface ContentGroupFragmentV1 {
  id: string;
  source_member_id: string;
  content_range: AnnotationRangeV1 | null;
  label?: string | null;
  preview_text?: string | null;
  order_index: number;
  status: ContentGroupStatus;
  created_at: string;
  updated_at: string;
  metadata?: Record<string, unknown>;
}

export interface ContentGroupPetalV1 {
  id: string;
  label: string;
  members: ContentGroupMemberV1[];
  fragment_ids?: string[];
  order_index: number;
  status: ContentGroupStatus;
  created_at: string;
  updated_at: string;
  metadata?: Record<string, unknown>;
}

export type ContentGroupIdentityStatus = 'none' | 'draft' | 'accepted' | 'rejected' | 'archived';
export type ContentGroupIdentityCreatedBy = 'human' | 'ai' | 'system';

export interface ContentGroupIdentityV1 {
  status: ContentGroupIdentityStatus;
  role?: string | null;
  topic?: string | null;
  summary?: string | null;
  created_by?: ContentGroupIdentityCreatedBy;
  reviewed_by?: ContentGroupIdentityCreatedBy | null;
  confidence?: number | null;
  updated_at: string;
  accepted_at?: string | null;
  metadata?: Record<string, unknown>;
}

export interface ContentGroupV1 {
  id: string;
  project_id: string;
  note_id: string;
  canvas_id: string;
  folder_id?: string | null;
  parent_group_id?: string | null;
  placements?: {
    folder_id: string;
    order_index: number;
    added_at: string;
    added_by: ContentGroupCreatedBy;
  }[];
  depth: number;
  title: string;
  status: ContentGroupStatus;
  created_by: ContentGroupCreatedBy;
  created_at: string;
  updated_at: string;
  members: ContentGroupMemberV1[];
  fragments?: ContentGroupFragmentV1[];
  petals: ContentGroupPetalV1[];
  identity: ContentGroupIdentityV1;
  view_state?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface GroupFolderScopeV1 {
  kind: GroupFolderScopeKind;
  project_id?: string | null;
  note_id?: string | null;
  label?: string | null;
}

export interface GroupFolderV1 {
  id: string;
  title: string;
  parent_folder_id: string | null;
  scope: GroupFolderScopeV1;
  origin: GroupFolderOrigin;
  system_root: boolean;
  status: GroupFolderStatus;
  order_index: number;
  created_at: string;
  updated_at: string;
  metadata?: Record<string, unknown>;
}

export type AnnotationProposalStatus = 'draft' | 'pending' | 'accepted' | 'rejected' | 'superseded';

export interface AnnotationProposalV1 {
  id: string;
  note_id: string;
  canvas_id?: string;
  interpretation_id?: string;
  proposed_label: string;
  proposed_ranges: AnnotationRangeV1[];
  reasoning_summary: string;
  status: AnnotationProposalStatus;
  created_by: 'ai' | 'importer';
  created_at: string;
  updated_at: string;
  metadata?: Record<string, unknown>;
}

export interface ReadingInterpretationV1 {
  id: string;
  note_id: string;
  canvas_id: string;
  summary: string;
  proposed_annotation_ids: string[];
  status: ReadingInterpretationStatus;
  created_by: ReadingInterpretationCreatedBy;
  created_at: string;
  updated_at: string;
  metadata?: Record<string, unknown>;
}

export interface TextBlockContentV1 {
  textflow_version: TextFlowContentVersion;
  units: TextUnit[];
  inline_structures: InlineStructuredObject[];
  metadata: Record<string, unknown>;
}

export type AddressableKnowledgeObjectKind =
  | 'note'
  | 'page_frame'
  | 'note_block'
  | 'text_unit'
  | 'inline_structured_object'
  | 'anchored_span'
  | 'source_snapshot_object';

export interface TextFlowProjectionAddressableObject {
  kind: AddressableKnowledgeObjectKind;
  id: string;
  parent_id: string | null;
  label: string | null;
  text: string;
  metadata: Record<string, unknown>;
}

export interface TextFlowProjection {
  textflow_version: TextFlowContentVersion;
  owner_block_id: string | null;
  plain_text: string;
  text_units: TextUnit[];
  inline_structures: InlineStructuredObject[];
  addressable_objects: TextFlowProjectionAddressableObject[];
  debug_warnings: string[];
}

export interface NoteBlock {
  id: string;
  placement_id: string;
  display_overrides_json: Record<string, unknown>;
  block_type: string;
  title: string | null;
  content_json: Record<string, unknown>;
  plain_text: string | null;
  metadata: Record<string, unknown>;
  order_index: number;
  source_references: SourceReference[];
}
