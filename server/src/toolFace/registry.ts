import { z, type ZodTypeAny } from 'zod';
import {
  createNoteSchema,
  updateNoteSchema,
} from '../validators/index.js';

export type ToolTruth =
  | 'content'
  | 'knowledge'
  | 'spatial'
  | 'provenance'
  | 'semantic'
  | 'purpose'
  | 'package';

export type ToolTier = 'immediate' | 'propose' | 'confirm';
export type ToolExposure = 'public' | 'internal' | 'test';

export interface ToolRegistryHumanEntry {
  route: string;
  client_call_site: string;
}

export interface ToolRegistryThreshold {
  batch_field: string;
}

export interface ToolRegistryEntry {
  name: string;
  description: string;
  input_schema: ZodTypeAny;
  output_schema: ZodTypeAny;
  truth: ToolTruth;
  tier: ToolTier;
  threshold?: ToolRegistryThreshold;
  human_entry: ToolRegistryHumanEntry;
  exposure: ToolExposure;
  scopes: string[];
}

const createNoteShape = createNoteSchema.shape;
const updateNoteShape = updateNoteSchema.shape;

export const listNotesInputSchema = createNoteSchema
  .pick({ course_id: true })
  .extend({
    status: updateNoteShape.status.unwrap().optional().default('active'),
  })
  .strict();

const noteOutputSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  course_id: createNoteShape.course_id,
  title: createNoteShape.title,
  description: createNoteShape.description.unwrap().nullable(),
  status: updateNoteShape.status.unwrap(),
  source_kind: z.string().min(1),
  note_class: z.string().min(1),
  page_format: createNoteShape.page_format.removeDefault().unwrap(),
  metadata: createNoteShape.metadata.unwrap(),
  operation_batch_id: z.string().uuid().nullable(),
  created_at: z.string().min(1),
  updated_at: z.string().min(1),
  trashed_at: z.string().min(1).nullable(),
}).strict();

export const listNotesOutputSchema = z.array(noteOutputSchema);
export const getNoteInputSchema = z.object({
  note_id: z.string(),
}).strict();
export const getNoteOutputSchema = noteOutputSchema;

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

const jsonValueSchema: z.ZodType<JsonValue> = z.lazy(() => z.union([
  z.string(),
  z.number().finite(),
  z.boolean(),
  z.null(),
  z.array(jsonValueSchema),
  z.record(jsonValueSchema),
]));

const jsonObjectSchema: z.ZodType<Record<string, JsonValue>> = z.record(jsonValueSchema);

export const listNoteBlocksInputSchema = z.object({
  note_id: z.string(),
}).strict();

const noteBlockSourceReferenceOutputSchema = z.object({
  id: z.string(),
  document_id: z.string().nullable(),
  document_chunk_id: z.string().nullable(),
  source_page_start: z.number().int().nullable(),
  source_page_end: z.number().int().nullable(),
  source_excerpt: z.string().nullable(),
  reference_type: z.string(),
  confidence: z.number().finite().nullable(),
  metadata: z.string(),
}).strict();

const noteBlockOutputSchema = z.object({
  placement_id: z.string(),
  note_id: z.string(),
  block_id: z.string(),
  parent_placement_id: z.string().nullable(),
  order_index: z.number().int(),
  display_mode: z.string(),
  display_overrides_json: jsonObjectSchema,
  id: z.string(),
  user_id: z.string(),
  course_id: z.string(),
  block_type: z.string(),
  title: z.string().nullable(),
  content_json: jsonObjectSchema,
  plain_text: z.string().nullable(),
  status: z.literal('active'),
  source_kind: z.string(),
  metadata: jsonObjectSchema,
  operation_batch_id: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  text_save_revision: z.number().int().nonnegative(),
  trashed_at: z.string().nullable(),
  source_references: z.array(noteBlockSourceReferenceOutputSchema),
}).strict();

export const listNoteBlocksOutputSchema = z.array(noteBlockOutputSchema);

const itemStatusSchema = z.enum(['active', 'retired']);
const itemAnchorTargetKindSchema = z.enum([
  'block',
  'content_range',
  'canvas_object',
  'table_region',
  'image_region',
]);

export const listItemsInputSchema = z.object({
  status: z.enum(['active', 'retired', 'all']).optional(),
  origin_course_id: z.string().optional(),
  origin_note_id: z.string().optional(),
  q: z.string().optional(),
  limit: z.number().finite().optional(),
}).strict();

export const getItemInputSchema = z.object({
  item_id: z.string(),
}).strict();

const itemSnapshotOutputSchema = z.object({
  id: z.string(),
  item_id: z.string(),
  user_id: z.string(),
  content: z.string(),
  content_hash: z.string(),
  created_at: z.string(),
}).strict();

const itemAnchorOutputSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  item_id: z.string().nullable(),
  pool_scope_kind: z.string().nullable(),
  pool_scope_id: z.string().nullable(),
  target_kind: itemAnchorTargetKindSchema,
  target_id: z.string(),
  range_json: jsonObjectSchema.nullable(),
  excerpt: z.string(),
  reference_mode: z.string(),
  source_record_id: z.string().nullable(),
  collected_for: z.string().nullable(),
  claimed_at: z.string().nullable(),
  claimed_by: z.string().nullable(),
  metadata: jsonObjectSchema,
  created_by: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
}).strict();

const itemOutputSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  body_json: jsonObjectSchema,
  plain_text: z.string(),
  item_type: z.string().nullable(),
  topic: z.string().nullable(),
  status: itemStatusSchema,
  retired_into_item_id: z.string().nullable(),
  origin_course_id: z.string().nullable(),
  origin_note_id: z.string().nullable(),
  origin_board_id: z.string().nullable(),
  origin_board_title: z.string().nullable(),
  created_by: z.string(),
  metadata: jsonObjectSchema,
  created_at: z.string(),
  updated_at: z.string(),
  current_snapshot: itemSnapshotOutputSchema,
  anchors: z.array(itemAnchorOutputSchema),
}).strict();

const listedItemOutputSchema = itemOutputSchema.extend({
  anchors: z.array(itemAnchorOutputSchema).length(0),
});

export const listItemsOutputSchema = z.array(listedItemOutputSchema);
export const getItemOutputSchema = itemOutputSchema;

const contentGroupStatusSchema = z.enum(['active', 'hidden', 'deleted']);
const contentGroupCreatedBySchema = z.enum(['human', 'ai_proposal', 'importer']);
const contentGroupMemberKindSchema = z.enum([
  'content_range',
  'annotation',
  'block',
  'content_group',
  'page_slice',
  'canvas_object',
  'table_region',
  'image_region',
  'future_object',
  'item',
]);
const contentGroupSourceSyncStatusSchema = z.enum([
  'fresh',
  'changed',
  'missing',
  'detached',
  'unsupported',
  'stale',
]);

export const listContentGroupsInputSchema = z.object({
  course_id: z.string().optional(),
  note_id: z.string().optional(),
  status: z.enum(['active', 'hidden', 'deleted', 'all']).optional(),
}).strict().superRefine((input, context) => {
  if (!input.course_id?.trim() && !input.note_id?.trim()) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'course_id or note_id is required',
      path: ['course_id'],
    });
  }
});

const normalizedContentGroupPlacementOutputSchema = z.object({
  id: z.string(),
  content_group_id: z.string(),
  folder_id: z.string(),
  placement_role: z.enum(['primary', 'reference', 'temporary']),
  status: z.literal('active'),
  order_index: z.number().finite(),
  added_by: z.enum(['human', 'ai_proposal', 'system', 'importer']),
  added_at: z.string(),
  updated_at: z.string(),
  metadata: jsonObjectSchema,
}).strict();

const normalizedContentGroupMemberOutputSchema = z.object({
  id: z.string(),
  kind: contentGroupMemberKindSchema,
  target_id: z.string().nullable(),
  item_id: z.string().nullable(),
  content_range: jsonObjectSchema.nullable(),
  label: z.string().nullable(),
  current_content: z.string().nullable(),
  source_ref: jsonObjectSchema.nullable(),
  source_sync_status: contentGroupSourceSyncStatusSchema,
  preview_text: z.string().nullable(),
  order_index: z.number().finite(),
  metadata: jsonObjectSchema,
}).strict();

// When the normalized child tables have no rows, the service deliberately
// returns the persisted legacy JSON arrays verbatim. Keep that real branch
// explicit instead of pretending every historical child has normalized keys.
const contentGroupPlacementOutputSchema = z.union([
  normalizedContentGroupPlacementOutputSchema,
  jsonObjectSchema,
]);
const contentGroupMemberOutputSchema = z.union([
  normalizedContentGroupMemberOutputSchema,
  jsonObjectSchema,
]);

const contentGroupIdentityOutputSchema = z.object({
  status: z.enum(['none', 'draft', 'accepted', 'rejected', 'archived']),
  type: z.string().nullable(),
  role: z.string().nullable(),
  topic: z.string().nullable(),
  summary: z.string().nullable(),
  created_by: z.enum(['human', 'ai', 'system']),
  reviewed_by: z.enum(['human', 'ai', 'system']).nullable(),
  confidence: z.number().finite().nullable(),
  updated_at: z.string(),
  accepted_at: z.string().nullable(),
  metadata: jsonObjectSchema,
}).strict();

const contentGroupOutputSchema = z.object({
  id: z.string(),
  project_id: z.string(),
  note_id: z.string(),
  canvas_id: z.string(),
  folder_id: z.string().nullable(),
  parent_group_id: z.string().nullable(),
  placements: z.array(contentGroupPlacementOutputSchema),
  depth: z.literal(0),
  title: z.string(),
  status: contentGroupStatusSchema,
  created_by: contentGroupCreatedBySchema,
  created_at: z.string(),
  updated_at: z.string(),
  members: z.array(contentGroupMemberOutputSchema),
  identity: contentGroupIdentityOutputSchema,
  view_state: jsonObjectSchema,
  metadata: jsonObjectSchema,
}).strict();

export const listContentGroupsOutputSchema = z.array(contentGroupOutputSchema);

const relationDirectionalitySchema = z.enum(['directed', 'undirected']);
const relationStatusSchema = z.enum(['active', 'revoked']);
const relationFreshnessSchema = z.enum([
  'fresh',
  'from_changed',
  'to_changed',
  'both_changed',
]);
const relationTypeIdSchema = z.enum([
  'derives_to',
  'depends_on',
  'supports',
  'contradicts',
  'example_of',
  'equivalent_to',
  'analogous_to',
  'contrasts_with',
  'companion_of',
]);

export const listRelationsInputSchema = z.object({
  item_id: z.string().optional(),
  purpose_id: z.string().optional(),
  status: z.enum(['active', 'revoked', 'all']).optional(),
}).strict().superRefine((input, context) => {
  const hasItem = Boolean(input.item_id?.trim());
  const hasPurpose = Boolean(input.purpose_id?.trim());
  if (hasItem === hasPurpose) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Exactly one Relation scope is required',
      path: ['item_id'],
    });
  }
});

export const listRelationTypesInputSchema = z.object({}).strict();

const relationAssessmentOutputSchema = z.object({
  id: z.string(),
  relation_id: z.string(),
  user_id: z.string(),
  verdict: z.enum(['still_holds', 'questionable']),
  model_key: z.string(),
  created_at: z.string(),
}).strict();

const relationEndpointItemOutputSchema = z.object({
  id: z.string(),
  plain_text: z.string(),
  item_type: z.string().nullable(),
  topic: z.string().nullable(),
  status: itemStatusSchema,
  retired_into_item_id: z.string().nullable(),
  updated_at: z.string(),
}).strict();

const relationOutputSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  from_item_id: z.string(),
  to_item_id: z.string(),
  relation_type: z.string(),
  directionality: relationDirectionalitySchema,
  from_snapshot_id: z.string(),
  to_snapshot_id: z.string(),
  note: z.string().nullable(),
  created_by: z.string(),
  origin_purpose_id: z.string().nullable(),
  status: relationStatusSchema,
  created_at: z.string(),
  updated_at: z.string(),
  affirmed_at: z.string(),
  freshness: relationFreshnessSchema,
  from_changed: z.boolean(),
  to_changed: z.boolean(),
  inspection_checkpoint_at: z.string(),
  latest_assessment: relationAssessmentOutputSchema.nullable(),
  from_snapshot: itemSnapshotOutputSchema,
  to_snapshot: itemSnapshotOutputSchema,
  from_item: relationEndpointItemOutputSchema,
  to_item: relationEndpointItemOutputSchema,
}).strict();

const relationTypeDefinitionOutputSchema = z.object({
  id: relationTypeIdSchema,
  directionality: relationDirectionalitySchema,
}).strict();

export const listRelationsOutputSchema = z.array(relationOutputSchema);
export const listRelationTypesOutputSchema = z.array(relationTypeDefinitionOutputSchema);

const sourceScopeKindSchema = z.enum([
  'page',
  'page_range',
  'anchor',
  'source_material',
  'material_segment',
]);
const sourceScopeStatusSchema = z.enum(['active', 'archived']);
const sourceAnchorTargetTypeSchema = z.enum([
  'note_block',
  'note_block_source',
  'evidence_set',
  'evidence_item',
  'proposal',
]);
const nullableSourceOffsetSchema = z.number().int().nullable();
const nullableSourceTimestampSchema = z.string().nullable();

export const listSourceScopesInputSchema = z.object({
  course_id: z.string(),
  status: sourceScopeStatusSchema.optional(),
}).strict();

export const getSourceScopeJumpTargetInputSchema = z.object({
  scope_id: z.string(),
}).strict();

export const listSourceAnchorsInputSchema = z.object({
  course_id: z.string(),
  target_type: sourceAnchorTargetTypeSchema.optional(),
  target_id: z.string().optional(),
}).strict();

export const getSourceAnchorJumpTargetInputSchema = z.object({
  anchor_id: z.string(),
}).strict();

const sourceScopeOutputSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  course_id: z.string(),
  source_snapshot_id: z.string().nullable(),
  source_snapshot_page_id: z.string().nullable(),
  source_anchor_id: z.string().nullable(),
  source_material_id: z.string().nullable(),
  source_fragment_id: z.string().nullable(),
  material_segment_id: z.string().nullable(),
  document_id: z.string().nullable(),
  document_chunk_id: z.string().nullable(),
  scope_kind: sourceScopeKindSchema,
  label: z.string(),
  page_start: nullableSourceOffsetSchema,
  page_end: nullableSourceOffsetSchema,
  text_start_offset: nullableSourceOffsetSchema,
  text_end_offset: nullableSourceOffsetSchema,
  status: sourceScopeStatusSchema,
  metadata: jsonObjectSchema,
  created_at: nullableSourceTimestampSchema,
  updated_at: nullableSourceTimestampSchema,
}).strict();

const sourceAnchorOutputSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  course_id: z.string(),
  source_snapshot_id: z.string(),
  source_snapshot_page_id: z.string().nullable(),
  document_id: z.string().nullable(),
  document_chunk_id: z.string().nullable(),
  source_material_id: z.string().nullable(),
  source_fragment_id: z.string().nullable(),
  material_segment_id: z.string().nullable(),
  anchor_kind: z.string(),
  page_start: nullableSourceOffsetSchema,
  page_end: nullableSourceOffsetSchema,
  text_start_offset: nullableSourceOffsetSchema,
  text_end_offset: nullableSourceOffsetSchema,
  status: z.string(),
  confidence: z.number().finite().nullable(),
  metadata: jsonObjectSchema,
  created_at: nullableSourceTimestampSchema,
  updated_at: nullableSourceTimestampSchema,
}).strict();

const sourceSnapshotOutputSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  course_id: z.string(),
  source_material_id: z.string().nullable(),
  document_id: z.string(),
  snapshot_kind: z.string(),
  status: z.string(),
  title: z.string(),
  source_filename: z.string(),
  page_count: z.number().int().nullable(),
  chunk_count: z.number().int(),
  metadata: jsonObjectSchema,
  created_at: nullableSourceTimestampSchema,
  updated_at: nullableSourceTimestampSchema,
}).strict();

const sourceSnapshotPageOutputSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  course_id: z.string(),
  source_snapshot_id: z.string(),
  document_id: z.string(),
  page_number: z.number().int(),
  page_label: z.string().nullable(),
  text_content: z.string(),
  chunk_ids: z.string(),
  metadata: jsonObjectSchema,
  created_at: nullableSourceTimestampSchema,
  updated_at: nullableSourceTimestampSchema,
}).strict();

// The scope service's no-page-in-range fallback returns the selected page row
// without parsing its persisted metadata string. Keep that existing branch
// explicit instead of widening the whole jump-target payload.
const sourceScopeFallbackPageOutputSchema = sourceSnapshotPageOutputSchema.extend({
  metadata: z.union([jsonObjectSchema, z.string()]),
}).strict();

const sourceJumpFocusOutputSchema = z.object({
  page_start: nullableSourceOffsetSchema,
  page_end: nullableSourceOffsetSchema,
  text_start_offset: nullableSourceOffsetSchema,
  text_end_offset: nullableSourceOffsetSchema,
}).strict();

export const listSourceScopesOutputSchema = z.array(sourceScopeOutputSchema);
export const listSourceAnchorsOutputSchema = z.array(sourceAnchorOutputSchema);
export const getSourceAnchorJumpTargetOutputSchema = z.object({
  anchor: sourceAnchorOutputSchema,
  snapshot: sourceSnapshotOutputSchema,
  page: sourceSnapshotPageOutputSchema,
  focus: sourceJumpFocusOutputSchema,
  warnings: z.array(z.string()),
}).strict();
export const getSourceScopeJumpTargetOutputSchema = z.union([
  z.object({
    scope: sourceScopeOutputSchema,
    anchor: sourceAnchorOutputSchema,
    snapshot: sourceSnapshotOutputSchema,
    page: sourceSnapshotPageOutputSchema,
    focus: sourceJumpFocusOutputSchema,
    warnings: z.array(z.string()),
  }).strict(),
  z.object({
    scope: sourceScopeOutputSchema,
    snapshot: sourceSnapshotOutputSchema,
    page: sourceScopeFallbackPageOutputSchema,
    pages: z.array(sourceSnapshotPageOutputSchema),
    focus: sourceJumpFocusOutputSchema,
    warnings: z.array(z.string()),
  }).strict(),
]);

export const trashNotesInputSchema = z.object({
  note_ids: z.array(z.string().uuid()).min(1).max(50),
}).strict();

const trashNotesResultSchema = z.discriminatedUnion('outcome', [
  z.object({
    note_id: z.string().uuid(),
    outcome: z.literal('trashed'),
  }).strict(),
  z.object({
    note_id: z.string().uuid(),
    outcome: z.literal('missing'),
  }).strict(),
  z.object({
    note_id: z.string().uuid(),
    outcome: z.literal('skipped'),
    reason: z.enum(['already_trashed', 'read_only_projection']),
  }).strict(),
]);

export const trashNotesOutputSchema = z.object({
  results: z.array(trashNotesResultSchema),
}).strict();

const selectionReceiptRefShape = {
  blockId: z.string().min(1),
  textFlowId: z.string().min(1),
  textUnitId: z.string().min(1),
};

const selectionReceiptRefSchema = z.object(selectionReceiptRefShape).strict();

const selectionReceiptTextRangeSchema = z.object({
  ...selectionReceiptRefShape,
  startOffset: z.number().int().nonnegative(),
  endOffset: z.number().int().nonnegative(),
  excerpt: z.string(),
}).strict().refine(
  (range) => range.excerpt.length === range.endOffset - range.startOffset,
  { message: 'excerpt length must equal the selected offset window', path: ['excerpt'] },
);

export const resolveSelectionInputSchema = z.object({
  note_id: z.string().uuid(),
  refs: z.array(selectionReceiptRefSchema),
  text_ranges: z.array(selectionReceiptTextRangeSchema),
  at: z.string().min(1),
}).strict();

const resolvedSelectionIdentityShape = {
  ...selectionReceiptRefShape,
};

const resolveSelectionResultSchema = z.discriminatedUnion('outcome', [
  z.object({
    outcome: z.literal('found'),
    ...resolvedSelectionIdentityShape,
  }).strict(),
  z.object({
    outcome: z.literal('text_drifted'),
    ...resolvedSelectionIdentityShape,
  }).strict(),
  z.object({ outcome: z.literal('missing') }).strict(),
]);

export const resolveSelectionOutputSchema = z.object({
  results: z.array(resolveSelectionResultSchema),
}).strict();

/**
 * The only authoritative V2.BN.12 tool directory. JSON manifests are derived
 * from these runtime entries; legacy v1 toolDefinitions are intentionally not
 * imported or adapted here.
 */
export const TOOL_REGISTRY: ToolRegistryEntry[] = [
  {
    name: 'list_notes',
    description: 'List notes in one Project, optionally filtered by lifecycle status.',
    input_schema: listNotesInputSchema,
    output_schema: listNotesOutputSchema,
    truth: 'content',
    tier: 'immediate',
    human_entry: {
      route: 'GET /api/notes',
      client_call_site: 'client/src/pages/Courses/CourseDetail.tsx#fetchSummary',
    },
    exposure: 'public',
    scopes: ['notes:read'],
  },
  {
    name: 'get_note',
    description: 'Read one owned Note with hydrated metadata.',
    input_schema: getNoteInputSchema,
    output_schema: getNoteOutputSchema,
    truth: 'content',
    tier: 'immediate',
    human_entry: {
      route: 'GET /api/notes/:id',
      client_call_site: 'client/src/pages/Notes/canvasEngine/hooks/useNoteCanvasDataAdapter.ts#fetchNote',
    },
    exposure: 'public',
    scopes: ['notes:read'],
  },
  {
    name: 'list_note_blocks',
    description: 'List active NoteBlocks and placements in one owned Note.',
    input_schema: listNoteBlocksInputSchema,
    output_schema: listNoteBlocksOutputSchema,
    truth: 'content',
    tier: 'immediate',
    human_entry: {
      route: 'GET /api/notes/:id/blocks',
      client_call_site: 'client/src/pages/Notes/canvasEngine/hooks/useNoteCanvasDataAdapter.ts#fetchNote',
    },
    exposure: 'public',
    scopes: ['notes:read'],
  },
  {
    name: 'list_items',
    description: 'List owned Items with optional lifecycle, origin, search, and limit filters.',
    input_schema: listItemsInputSchema,
    output_schema: listItemsOutputSchema,
    truth: 'knowledge',
    tier: 'immediate',
    human_entry: {
      route: 'GET /api/items',
      client_call_site: 'client/src/pages/Notes/canvasEngine/itemRepository.ts#searchItems',
    },
    exposure: 'public',
    scopes: ['items:read'],
  },
  {
    name: 'get_item',
    description: 'Read one owned Item with its current Snapshot and claimed Anchor receipts.',
    input_schema: getItemInputSchema,
    output_schema: getItemOutputSchema,
    truth: 'knowledge',
    tier: 'immediate',
    human_entry: {
      route: 'GET /api/items/:itemId',
      client_call_site: 'client/src/pages/Notes/canvasEngine/itemRepository.ts#loadItem',
    },
    exposure: 'public',
    scopes: ['items:read'],
  },
  {
    name: 'list_content_groups',
    description: 'List owned ContentGroups in one Project or Note with hydrated organization data.',
    input_schema: listContentGroupsInputSchema,
    output_schema: listContentGroupsOutputSchema,
    truth: 'knowledge',
    tier: 'immediate',
    human_entry: {
      route: 'GET /api/content-groups',
      client_call_site: 'client/src/pages/Notes/canvasEngine/contentGroupRepository.ts#loadContentGroupsForNote',
    },
    exposure: 'public',
    scopes: ['content_groups:read'],
  },
  {
    name: 'list_relations',
    description: 'List owned semantic Relations in one Item or Purpose scope.',
    input_schema: listRelationsInputSchema,
    output_schema: listRelationsOutputSchema,
    truth: 'semantic',
    tier: 'immediate',
    human_entry: {
      route: 'GET /api/relations',
      client_call_site: 'client/src/pages/Notes/canvasEngine/relationRepository.ts#loadRelations',
    },
    exposure: 'public',
    scopes: ['relations:read'],
  },
  {
    name: 'list_relation_types',
    description: 'List the static semantic Relation type definitions shared by all users.',
    input_schema: listRelationTypesInputSchema,
    output_schema: listRelationTypesOutputSchema,
    truth: 'semantic',
    tier: 'immediate',
    human_entry: {
      route: 'GET /api/relations/types',
      client_call_site: 'client/src/pages/Notes/canvasEngine/relationRepository.ts#loadRelationTypes',
    },
    exposure: 'public',
    scopes: ['relations:read'],
  },
  {
    name: 'list_source_scopes',
    description: 'List existing source scopes in one owned Project, optionally filtered by lifecycle status.',
    input_schema: listSourceScopesInputSchema,
    output_schema: listSourceScopesOutputSchema,
    truth: 'provenance',
    tier: 'immediate',
    human_entry: {
      route: 'GET /api/source-scopes',
      client_call_site: 'client/src/pages/Courses/CourseDetail.tsx#fetchSourceScopes',
    },
    exposure: 'public',
    scopes: ['sources:read'],
  },
  {
    name: 'get_source_scope_jump_target',
    description: 'Resolve one owned source scope to its existing snapshot jump target.',
    input_schema: getSourceScopeJumpTargetInputSchema,
    output_schema: getSourceScopeJumpTargetOutputSchema,
    truth: 'provenance',
    tier: 'immediate',
    human_entry: {
      route: 'GET /api/source-scopes/:id/jump-target',
      client_call_site: 'client/src/pages/Courses/CourseDetail.tsx#handleOpenSourceScope',
    },
    exposure: 'public',
    scopes: ['sources:read'],
  },
  {
    name: 'list_source_anchors',
    description: 'List existing source anchors in one owned Project, optionally filtered by target.',
    input_schema: listSourceAnchorsInputSchema,
    output_schema: listSourceAnchorsOutputSchema,
    truth: 'provenance',
    tier: 'immediate',
    human_entry: {
      route: 'GET /api/source-anchors',
      client_call_site: 'client/src/pages/Notes/canvasEngine/hooks/useNoteCanvasDataAdapter.ts#fetchSourceAnchors',
    },
    exposure: 'public',
    scopes: ['sources:read'],
  },
  {
    name: 'get_source_anchor_jump_target',
    description: 'Resolve one owned source anchor to its existing snapshot page jump target.',
    input_schema: getSourceAnchorJumpTargetInputSchema,
    output_schema: getSourceAnchorJumpTargetOutputSchema,
    truth: 'provenance',
    tier: 'immediate',
    human_entry: {
      route: 'GET /api/source-anchors/:id/jump-target',
      client_call_site: 'client/src/pages/Notes/canvasEngine/hooks/useNoteCanvasDataAdapter.ts#handleViewSource',
    },
    exposure: 'public',
    scopes: ['sources:read'],
  },
  {
    name: 'resolve_selection',
    description: 'Resolve a text selection receipt against the current owned TextFlow content.',
    input_schema: resolveSelectionInputSchema,
    output_schema: resolveSelectionOutputSchema,
    truth: 'content',
    tier: 'immediate',
    human_entry: {
      route: 'GET /api/notes/:id/blocks',
      client_call_site: 'client/src/pages/Notes/canvasEngine/hooks/useNoteCanvasDataAdapter.ts#fetchNote',
    },
    exposure: 'public',
    scopes: ['notes:read'],
  },
  {
    name: 'trash_notes',
    description: 'Move one note to trash immediately, or record a multi-note proposal for human review.',
    input_schema: trashNotesInputSchema,
    output_schema: trashNotesOutputSchema,
    truth: 'content',
    tier: 'confirm',
    threshold: { batch_field: 'note_ids' },
    human_entry: {
      route: 'DELETE /api/notes/:id',
      client_call_site: 'client/src/pages/Courses/CourseDetail.tsx#handleTrashNote',
    },
    exposure: 'public',
    scopes: ['notes:write'],
  },
];
