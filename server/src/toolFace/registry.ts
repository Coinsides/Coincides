import { z, type ZodTypeAny } from 'zod';
import { BOARD_ACTION_TOOLS } from './boardActions.js';
import { AGENT_UI_TOOLS } from './uiActions.js';
export { AGENT_UI_TOOLS } from './uiActions.js';
import {
  createGoalSchema,
  createTaskSchema,
  createDeckSchema,
  createSectionSchema,
  batchCreateTimeBlocksSchema,
  updateTimeBlockSchema,
  linkTaskCardSchema,
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

// The root-goal chat surface retains its A1 fields; sub-goals use the same
// human creation schema through their own registered projection below.
export const createAgentGoalInputSchema = createGoalSchema.pick({
  title: true, course_id: true, deadline: true, description: true,
});

export const CREATE_GOAL_TOOL: ToolRegistryEntry = {
  name: 'create_goal',
  description: 'Create a new goal for a course.',
  input_schema: createAgentGoalInputSchema,
  output_schema: z.object({
    id: z.string().uuid(),
    title: z.string(),
    message: z.literal('Goal created successfully'),
    receipt_id: z.string().uuid(),
  }).strict(),
  truth: 'purpose',
  tier: 'immediate',
  human_entry: {
    route: 'POST /api/goals',
    client_call_site: 'client/src/stores/goalStore.ts#createGoal',
  },
  // Chat already exposes this verb. A1 does not open a new MCP write channel.
  exposure: 'internal',
  scopes: ['goals:write'],
};

export const createAgentSubGoalInputSchema = createAgentGoalInputSchema.extend({
  parent_id: createGoalSchema.shape.parent_id.unwrap(),
  course_id: createGoalSchema.shape.course_id.optional(),
});
export const createAgentTimeBlocksInputSchema = batchCreateTimeBlocksSchema.extend({
  blocks: batchCreateTimeBlocksSchema.shape.blocks.min(1),
});
export const updateAgentTimeBlockInputSchema = updateTimeBlockSchema.extend({
  block_id: z.string().min(1),
});
export const deleteAgentTimeBlockInputSchema = z.object({
  block_id: z.string().min(1),
  authorization_id: z.string().min(1).optional(),
  user_confirmation_anchor: z.string().optional(),
}).strict();
export const linkAgentTaskCardsInputSchema = z.object({
  task_id: z.string().min(1),
  links: z.array(linkTaskCardSchema).min(1),
});
export const completeAgentTaskInputSchema = z.object({
  task_id: z.string().min(1),
  user_utterance_anchor: z.string().refine((value) => value.trim().length > 0, 'User utterance anchor is required'),
});

const actionReceiptOutputShape = { message: z.string(), receipt_id: z.string().uuid() };
const createdActionOutputShape = { id: z.string().uuid(), ...actionReceiptOutputShape };

export const CREATE_SUB_GOAL_TOOL: ToolRegistryEntry = {
  name: 'create_sub_goal',
  description: 'Create a sub-goal under an existing goal. Inherits course_id from the parent when omitted.',
  input_schema: createAgentSubGoalInputSchema,
  output_schema: z.object({ ...createdActionOutputShape, title: z.string(), parent_id: z.string().uuid() }).strict(),
  truth: 'purpose', tier: 'immediate', exposure: 'internal', scopes: ['goals:write'],
  human_entry: { route: 'POST /api/goals', client_call_site: 'client/src/stores/goalStore.ts#createGoal' },
};

export const CREATE_TASK_TOOL: ToolRegistryEntry = {
  name: 'create_task',
  description: 'Create an individual task explicitly requested by the student. Generated study plans still use create_proposal.',
  input_schema: createTaskSchema,
  output_schema: z.object({ ...createdActionOutputShape, title: z.string() }).strict(),
  truth: 'purpose', tier: 'immediate', exposure: 'internal', scopes: ['tasks:write'],
  human_entry: { route: 'POST /api/tasks', client_call_site: 'client/src/stores/taskStore.ts#createTask' },
};

export const CREATE_DECK_TOOL: ToolRegistryEntry = {
  name: 'create_deck',
  description: 'Create a card deck in a course when no suitable deck exists.',
  input_schema: createDeckSchema,
  output_schema: z.object({ ...createdActionOutputShape, name: z.string(), course_id: z.string().uuid(), course_name: z.string() }).strict(),
  truth: 'knowledge', tier: 'immediate', exposure: 'internal', scopes: ['decks:write'],
  human_entry: { route: 'POST /api/decks', client_call_site: 'client/src/stores/deckStore.ts#createDeck' },
};

export const CREATE_SECTION_TOOL: ToolRegistryEntry = {
  name: 'create_section',
  description: 'Create a deck section. Omitted order_index appends after the current maximum.',
  input_schema: createSectionSchema,
  output_schema: z.object({ ...createdActionOutputShape, name: z.string(), deck_id: z.string().uuid(), order_index: z.number().int() }).strict(),
  truth: 'knowledge', tier: 'immediate', exposure: 'internal', scopes: ['sections:write'],
  human_entry: { route: 'POST /api/sections', client_call_site: 'client/src/stores/sectionStore.ts#createSection' },
};

export const CREATE_TIME_BLOCKS_TOOL: ToolRegistryEntry = {
  name: 'create_time_blocks',
  description: 'Create time blocks for specific dates. All blocks, their event and the receipt are created together.',
  input_schema: createAgentTimeBlocksInputSchema,
  output_schema: z.object({ created: z.array(jsonObjectSchema).min(1), ...actionReceiptOutputShape }).strict(),
  truth: 'purpose', tier: 'immediate', exposure: 'internal', scopes: ['time_blocks:write'],
  human_entry: { route: 'POST /api/time-blocks', client_call_site: 'client/src/stores/timeBlockStore.ts#createInstances' },
};

export const UPDATE_TIME_BLOCK_TOOL: ToolRegistryEntry = {
  name: 'update_time_block',
  description: 'Update one time block instance, retaining its original field values in a reversible receipt.',
  input_schema: updateAgentTimeBlockInputSchema,
  output_schema: z.object({ updated: jsonObjectSchema, ...actionReceiptOutputShape }).strict(),
  truth: 'purpose', tier: 'immediate', exposure: 'internal', scopes: ['time_blocks:write'],
  human_entry: { route: 'PUT /api/time-blocks/:id', client_call_site: 'client/src/stores/timeBlockStore.ts#updateInstance' },
};

export const DELETE_TIME_BLOCK_TOOL: ToolRegistryEntry = {
  name: 'delete_time_block',
  description: 'First call with block_id only to receive a system-generated deletion restatement and authorization_id; this does not delete anything. Present the complete restatement to the user and obtain their explicit confirmation. Then call with the same block_id, authorization_id and the user\'s exact reply in user_confirmation_anchor. Authorization expires after 24 hours and can be consumed only once; changed consequences require a new restatement.',
  input_schema: deleteAgentTimeBlockInputSchema,
  output_schema: z.union([
    z.object({
      authorization_id: z.string(),
      restatement: z.object({
        block: z.object({
          id: z.string(), user_id: z.string(), template_id: z.string().nullable(),
          label: z.string(), type: z.string(), date: z.string(),
          start_time: z.string(), end_time: z.string(), color: z.string().nullable(),
          created_at: z.string(), updated_at: z.string(),
        }).strict(),
        affected_task_ids: z.array(z.string()),
        consequences: z.string(),
      }).strict(),
      expires_at: z.string(),
    }).strict(),
    z.object({
      message: z.literal('Time block deleted'),
      receipt_id: z.string().uuid(),
      deleted_block_id: z.string(),
      unbound_task_ids: z.array(z.string()),
    }).strict(),
  ]),
  truth: 'purpose', tier: 'immediate', exposure: 'internal', scopes: ['time_blocks:write'],
  human_entry: { route: 'DELETE /api/time-blocks/:id', client_call_site: 'client/src/stores/timeBlockStore.ts#deleteInstance' },
};

export const LINK_TASK_CARDS_TOOL: ToolRegistryEntry = {
  name: 'link_task_cards',
  description: 'Link cards to a task using the strict single-card door. Any missing or duplicate card link fails the entire batch; the error identifies card_id.',
  input_schema: linkAgentTaskCardsInputSchema,
  output_schema: z.object({ task_id: z.string(), created: z.number().int().min(1), links: z.array(jsonObjectSchema).min(1), ...actionReceiptOutputShape }).strict(),
  truth: 'knowledge', tier: 'immediate', exposure: 'internal', scopes: ['tasks:write'],
  // The existing human door is REST-only; TaskViewModal reads links but has no
  // link creation call site. Do not claim a nonexistent UI writer.
  human_entry: { route: 'POST /api/tasks/:taskId/cards', client_call_site: 'none (human REST only)' },
};

export const COMPLETE_TASK_TOOL: ToolRegistryEntry = {
  name: 'complete_task',
  description: 'Transcribe the student\'s explicit statement that this task is complete. Require their original words in user_utterance_anchor; never infer completion.',
  input_schema: completeAgentTaskInputSchema,
  output_schema: z.object({ task_id: z.string(), status: z.literal('completed'), ...actionReceiptOutputShape }).strict(),
  truth: 'purpose', tier: 'immediate', exposure: 'internal', scopes: ['tasks:write'],
  human_entry: { route: 'PUT /api/tasks/:id', client_call_site: 'client/src/stores/taskStore.ts#updateTask' },
};

/** Chat provider definitions project these registered writes from the manifest. */
export const AGENT_ACTION_TOOLS = [
  ...BOARD_ACTION_TOOLS,
  CREATE_GOAL_TOOL, CREATE_SUB_GOAL_TOOL, CREATE_TASK_TOOL, CREATE_DECK_TOOL,
  CREATE_SECTION_TOOL, CREATE_TIME_BLOCKS_TOOL, UPDATE_TIME_BLOCK_TOOL, DELETE_TIME_BLOCK_TOOL,
  LINK_TASK_CARDS_TOOL, COMPLETE_TASK_TOOL,
];

const readIdSchema = z.string().trim().min(1);
const readCountSchema = z.number().int().nonnegative();
export const readNoteInputSchema = z.object({
  note_id: readIdSchema, page_index: readCountSchema.optional(),
}).strict();
export const readBoardInputSchema = z.object({ board_id: readIdSchema }).strict();
export const readContentGroupsInputSchema = z.object({
  course_id: readIdSchema.optional(), note_id: readIdSchema.optional(),
}).strict().refine((input) => input.course_id || input.note_id, 'course_id or note_id is required');
export const readAnnotationsRelationsInputSchema = z.object({
  note_id: readIdSchema.optional(), item_id: readIdSchema.optional(),
}).strict().refine((input) => input.note_id || input.item_id, 'note_id or item_id is required');

const readNoteOutputSchema = z.object({
  note: z.object({ id: z.string(), title: z.string(), course_id: z.string(),
    page_format: z.string(), page_count: readCountSchema }).strict(),
  page_index: readCountSchema, frame_id: z.string().nullable(),
  blocks: z.array(z.object({
    id: z.string(), placement_id: z.string(), kind: z.string(), role: z.string().nullable(), text: z.string(),
    text_units: z.array(z.object({ id: z.string().nullable(), role: z.string().nullable(), text: z.string() }).strict()).optional(),
    media: z.object({ asset_id: z.string(), type: z.string().nullable(), state: z.literal('missing').optional() }).strict().optional(),
    item_ref: z.object({ item_id: z.string() }).strict().optional(),
  }).strict()).max(200),
  has_more: z.boolean(), next_page_index: readCountSchema.nullable(), truncated: z.boolean(),
  total_blocks: readCountSchema, omitted_blocks: z.object({ outside_page: readCountSchema }).strict(),
}).strict();

const readBoardOutputSchema = z.object({
  board: z.object({ id: z.string(), title: z.string(), viewport: jsonObjectSchema }).strict(),
  members: z.array(z.object({ id: z.string(), member_kind: z.string(), member_id: z.string(),
    x: z.number(), y: z.number(), scale: z.number(), pinned: z.boolean(), title_or_summary: z.string().nullable(),
    placed: z.boolean(), state: z.string() }).strict()).max(200),
  edges: z.array(z.object({ id: z.string(), from_member: z.string(), to_member: z.string(),
    label: z.string().nullable() }).strict()).max(200),
  visuals: z.array(z.object({ id: z.string(), type: z.string(),
    geometry: z.object({ x: z.number(), y: z.number(), w: z.number(), h: z.number(),
      scale: z.number(), rotation: z.number(), pinned: z.boolean() }).strict(), text: z.string().optional(),
  }).strict()).max(200),
  has_more: z.boolean(),
  truncated: z.object({ members: z.boolean(), edges: z.boolean(), visuals: z.boolean() }).strict(),
  total_counts: z.object({ members: readCountSchema, edges: readCountSchema, visuals: readCountSchema }).strict(),
}).strict();

const readContentGroupsOutputSchema = z.object({
  groups: z.array(z.object({ id: z.string(), course_id: z.string(), note_id: z.string().nullable(),
    title: z.string(), status: contentGroupStatusSchema,
    members: z.array(z.object({ id: z.string(), kind: contentGroupMemberKindSchema,
      target_id: z.string().nullable(), item_id: z.string().nullable(),
      plain_text: z.string(), text_truncated: z.boolean() }).strict()).max(200),
    total_members: readCountSchema, has_more: z.boolean(),
  }).strict()).max(100),
  total_groups: readCountSchema, total_members: readCountSchema, has_more: z.boolean(), truncated: z.boolean(),
}).strict();

const readAnnotationRangeSchema = z.object({
  id: z.string(), target_kind: z.string(), block_id: z.string().optional(), text_flow_id: z.string().optional(),
  text_unit_id: z.string().optional(), inline_structure_id: z.string().optional(),
  canvas_object_id: z.string().optional(), source_region_id: z.string().optional(),
  start_offset: z.number().optional(), end_offset: z.number().optional(),
  range_text_cache: z.string().optional(), metadata: jsonObjectSchema,
}).strict();
const readAnnotationsRelationsOutputSchema = z.object({
  annotations_note_id: z.string().nullable(),
  annotations: z.array(z.object({ id: z.string(), note_id: z.string(), text: z.string(),
    ranges: z.array(readAnnotationRangeSchema).max(200), total_ranges: readCountSchema, has_more: z.boolean(),
    status: z.string(), created_by: z.string(), created_at: z.string(), updated_at: z.string(), metadata: jsonObjectSchema,
  }).strict()).max(200),
  relations: z.array(relationOutputSchema).max(200),
  relation_scope: z.object({ item_ids: z.array(z.string()).max(200), total_items: readCountSchema,
    unavailable_item_ids: z.array(z.string()).max(200), has_more: z.boolean() }).strict(),
  total_annotations: readCountSchema, total_ranges: readCountSchema, total_relations: readCountSchema,
  relation_count_complete: z.boolean(), has_more: z.boolean(), truncated: z.boolean(),
}).strict();

/** Plan 14.2: read-only chat projections; no write admission, receipt or revert. */
export const AGENT_READ_TOOLS: ToolRegistryEntry[] = [
  { name: 'read_note', description: 'Read one page of an owned note in paper order. page_index defaults to 0; follow next_page_index for later pages. Inspect truncated for a per-page block cap.',
    input_schema: readNoteInputSchema, output_schema: readNoteOutputSchema,
    truth: 'content', tier: 'immediate', exposure: 'internal', scopes: ['notes:read'],
    human_entry: { route: 'GET /api/notes/:id/blocks', client_call_site: 'client/src/pages/Notes/canvasEngine/hooks/useNoteCanvasDataAdapter.ts#fetchNote' } },
  { name: 'read_board', description: 'Read an owned board viewport, member identities and positions, edges, and visual geometry. Inspect truncation flags for omitted rows.',
    input_schema: readBoardInputSchema, output_schema: readBoardOutputSchema,
    truth: 'spatial', tier: 'immediate', exposure: 'internal', scopes: ['boards:read'],
    human_entry: { route: 'GET /api/boards/:id', client_call_site: 'client/src/pages/Boards/boardRepository.ts#boardRepository.get' } },
  { name: 'read_content_groups', description: 'Read groups scoped by course_id and/or note_id, with member identities and the first 200 characters of each text. Inspect has_more for omitted groups or members.',
    input_schema: readContentGroupsInputSchema, output_schema: readContentGroupsOutputSchema,
    truth: 'knowledge', tier: 'immediate', exposure: 'internal', scopes: ['content_groups:read'],
    human_entry: { route: 'GET /api/content-groups', client_call_site: 'client/src/pages/GroupGallery/groupGalleryData.ts#loadGroupGalleryRecords' } },
  { name: 'read_annotations_relations', description: 'Read annotation truths for note_id and original judgment/receipt rows for item_id. With note_id alone, Relations follow placed Item refs and group memberships. With item_id alone, no annotation Note scope is implied. Judgment state and provenance are preserved; inspect truncation and relation_count_complete.',
    input_schema: readAnnotationsRelationsInputSchema, output_schema: readAnnotationsRelationsOutputSchema,
    truth: 'semantic', tier: 'immediate', exposure: 'internal', scopes: ['notes:read', 'relations:read'],
    human_entry: { route: 'GET /api/relations', client_call_site: 'client/src/pages/Notes/canvasEngine/relationRepository.ts#loadRelations' } },
];

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
  ...AGENT_ACTION_TOOLS,
  ...AGENT_READ_TOOLS,
  ...AGENT_UI_TOOLS,
];
