export interface Note {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  status: string;
  note_class?: 'user' | 'source_projection' | 'system' | string;
  source_kind?: 'manual' | 'source_projection' | 'system' | string;
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
  | 'page_slice'
  | 'canvas_object'
  | 'table_region'
  | 'image_region'
  | 'future_object'
  | 'item';
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
  metadata?: Record<string, unknown>;
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
  item_id?: string | null;
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

export type ContentGroupIdentityStatus = 'none' | 'draft' | 'accepted' | 'rejected' | 'archived';
export type ContentGroupIdentityCreatedBy = 'human' | 'ai' | 'system';

export interface ContentGroupIdentityV1 {
  status: ContentGroupIdentityStatus;
  type?: string | null;
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
  identity: ContentGroupIdentityV1;
  view_state?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export type ItemStatus = 'active' | 'retired';
export type ItemAnchorTargetKind =
  | 'block'
  | 'content_range'
  | 'canvas_object'
  | 'table_region'
  | 'image_region';

export interface ItemSnapshotV1 {
  id: string;
  item_id: string;
  user_id: string;
  content: string;
  content_hash: string;
  created_at: string;
}

export interface ItemAnchorV1 {
  id: string;
  user_id: string;
  item_id: string | null;
  pool_scope_kind: string | null;
  pool_scope_id: string | null;
  target_kind: ItemAnchorTargetKind;
  target_id: string;
  range_json: Record<string, unknown> | null;
  excerpt: string;
  reference_mode: string;
  source_record_id: string | null;
  collected_for: string | null;
  claimed_at: string | null;
  claimed_by: string | null;
  metadata: Record<string, unknown>;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ItemV1 {
  id: string;
  user_id: string;
  body_json: Record<string, unknown>;
  plain_text: string;
  item_type: string | null;
  topic: string | null;
  status: ItemStatus;
  retired_into_item_id: string | null;
  origin_course_id: string | null;
  origin_note_id: string | null;
  origin_board_id: string | null;
  origin_board_title: string | null;
  created_by: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  current_snapshot: ItemSnapshotV1;
  anchors: ItemAnchorV1[];
}

export type RelationDirectionality = 'directed' | 'undirected';
export type RelationStatus = 'active' | 'revoked';
export type RelationFreshness = 'fresh' | 'from_changed' | 'to_changed' | 'both_changed';
export type RelationSeedTypeId =
  | 'derives_to'
  | 'depends_on'
  | 'supports'
  | 'contradicts'
  | 'example_of'
  | 'equivalent_to'
  | 'analogous_to'
  | 'contrasts_with'
  | 'companion_of';

export interface RelationTypeDefinitionV1 {
  id: RelationSeedTypeId;
  directionality: RelationDirectionality;
}

export interface RelationEndpointItemV1 {
  id: string;
  plain_text: string;
  item_type: string | null;
  topic: string | null;
  status: ItemStatus;
  retired_into_item_id: string | null;
  updated_at: string;
}

export interface RelationV1 {
  id: string;
  user_id: string;
  from_item_id: string;
  to_item_id: string;
  relation_type: string;
  directionality: RelationDirectionality;
  from_snapshot_id: string;
  to_snapshot_id: string;
  note: string | null;
  created_by: string;
  origin_purpose_id: string | null;
  status: RelationStatus;
  created_at: string;
  updated_at: string;
  affirmed_at: string;
  freshness: RelationFreshness;
  from_changed: boolean;
  to_changed: boolean;
  inspection_checkpoint_at: string;
  latest_assessment: RelationAssessmentV1 | null;
  from_snapshot: ItemSnapshotV1;
  to_snapshot: ItemSnapshotV1;
  from_item: RelationEndpointItemV1;
  to_item: RelationEndpointItemV1;
}

export interface RelationAssessmentV1 {
  id: string;
  relation_id: string;
  user_id: string;
  verdict: 'still_holds' | 'questionable';
  model_key: string;
  created_at: string;
}

export type PurposeStatus = 'active' | 'sealed' | 'archived';
export type PurposeCreatedBy = 'human' | 'ai' | 'system' | 'ai_proposal' | 'importer';
export type PurposeMemberKind = 'content_group' | 'item';

export interface PurposeMemberV1 {
  id: string;
  purpose_id: string;
  member_kind: PurposeMemberKind;
  member_id: string;
  role?: string | null;
  fitness: string;
  order_index: number;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface PurposeFrameV1 {
  id: string;
  project_id: string | null;
  course_id?: string | null;
  note_id?: string | null;
  title: string;
  intent?: string | null;
  scope_note?: string | null;
  status: PurposeStatus;
  is_note_default: boolean;
  created_by: PurposeCreatedBy;
  members: PurposeMemberV1[];
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export type PurposeCompiledMembershipKind = 'direct' | 'derived' | 'direct_and_derived';

export interface PurposeCompiledItemPathV1 {
  kind: 'direct' | 'content_group';
  purpose_member_id: string;
  role: string | null;
  fitness: string;
  order_index: number;
  content_group_id: string | null;
  content_group_title: string | null;
  content_group_member_id: string | null;
  content_group_order_index: number | null;
}

export interface PurposeScopedItemV1 {
  id: string;
  body_json: Record<string, unknown>;
  plain_text: string;
  item_type: string | null;
  topic: string | null;
  status: ItemStatus;
  retired_into_item_id: string | null;
  origin_course_id: string | null;
  origin_note_id: string | null;
  created_by: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface PurposeCompiledItemV1 {
  item: PurposeScopedItemV1;
  direct: boolean;
  derived: boolean;
  membership_kind: PurposeCompiledMembershipKind;
  paths: PurposeCompiledItemPathV1[];
}

export interface PurposeCompiledScopeV1 {
  purpose_id: string;
  note_id: string | null;
  project_id: string | null;
  query?: string;
  items: PurposeCompiledItemV1[];
  total: number;
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
  canvas_layout?: Record<string, unknown> | null;
  block_type: string;
  title: string | null;
  content_json: Record<string, unknown>;
  plain_text: string | null;
  metadata: Record<string, unknown>;
  order_index: number;
  source_kind?: 'manual' | 'source_projection' | 'system' | string;
  source_references: SourceReference[];
}
