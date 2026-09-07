import { z } from 'zod';

// --- Auth ---

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(1, 'Name is required').max(100),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// --- Course ---

export const createCourseSchema = z.object({
  name: z.string().min(1, 'Course name is required').max(200),
  code: z.string().max(20).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Invalid hex color').optional(),
  weight: z.number().int().min(1).max(3).optional(),
  description: z.string().max(2000).optional(),
  semester: z.string().max(50).optional(),
});

export const updateCourseSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  code: z.string().max(20).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Invalid hex color').optional(),
  weight: z.number().int().min(1).max(3).optional(),
  description: z.string().max(2000).optional(),
  semester: z.string().max(50).optional(),
});

// --- Task ---

const taskPriority = z.enum(['must', 'recommended', 'optional']);
const taskStatus = z.enum(['pending', 'completed']);
const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format');
const jsonObjectSchema = z.record(z.unknown());
const v2StatusSchema = z.enum(['active', 'archived', 'trashed']);
export const noteBlockTypeSchema = z.enum([
  'heading',
  'paragraph',
  'definition',
  'theorem',
  'proof',
  'formula',
  'example',
  'exercise',
  'answer',
  'sidenote',
]);

const checklistItemSchema = z.object({
  text: z.string().min(1).max(500),
  done: z.boolean(),
});

export const createTaskSchema = z.object({
  title: z.string().min(1, 'Task title is required').max(500),
  date: dateString,
  priority: taskPriority.optional().default('must'),
  course_id: z.string().uuid('Invalid course ID'),
  goal_id: z.string().uuid('Invalid goal ID').optional(),
  recurring_group_id: z.string().uuid().optional(),
  order_index: z.number().int().min(0).optional(),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  description: z.string().max(5000).optional(),
  checklist: z.array(checklistItemSchema).optional(),
  time_block_id: z.string().uuid().optional(),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  date: dateString.optional(),
  priority: taskPriority.optional(),
  status: taskStatus.optional(),
  completed_at: z.string().nullable().optional(),
  order_index: z.number().int().min(0).optional(),
  start_time: z.string().nullable().optional(),
  end_time: z.string().nullable().optional(),
  description: z.string().max(5000).nullable().optional(),
  checklist: z.array(checklistItemSchema).nullable().optional(),
  time_block_id: z.string().uuid().nullable().optional(),
});

export const batchCreateTasksSchema = z.object({
  tasks: z.array(createTaskSchema).min(1, 'At least one task is required').max(100),
});

// --- Recurring Task ---

export const createRecurringTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500),
  course_id: z.string().uuid('Invalid course ID'),
  goal_id: z.string().uuid('Invalid goal ID').optional(),
  priority: taskPriority.optional().default('must'),
  start_date: dateString,
  end_date: dateString,
  task_titles: z.array(z.string().min(1).max(500)).min(1, 'At least one task title is required'),
});

// --- Goal ---

export const createGoalSchema = z.object({
  title: z.string().min(1, 'Goal title is required').max(500),
  description: z.string().max(2000).optional(),
  deadline: dateString.optional(),
  course_id: z.string().uuid('Invalid course ID'),
  exam_mode: z.boolean().optional().default(false),
  parent_id: z.string().uuid('Invalid parent goal ID').optional(),
});

export const updateGoalSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(2000).optional(),
  deadline: dateString.optional(),
  status: z.enum(['active', 'completed', 'archived']).optional(),
  exam_mode: z.boolean().optional(),
  parent_id: z.string().uuid('Invalid parent goal ID').nullable().optional(),
});

// --- Daily Status ---

export const setDailyStatusSchema = z.object({
  energy_level: z.enum(['energized', 'normal', 'tired']),
  date: dateString.optional(),
});

// --- Settings ---

export const updateSettingsSchema = z.object({
  settings: z.object({
    theme: z.enum(['dark', 'light']).optional(),
    language: z.enum(['en', 'zh']).optional(),
    agent_name: z.string().max(50).optional(),
    daily_status_enabled: z.boolean().optional(),
    keyboard_shortcuts_enabled: z.boolean().optional(),
    ai_providers: z.record(z.object({
      api_key: z.string().optional(),
      default_model: z.string().optional(),
    })).optional(),
    active_provider: z.string().optional(),
    embedding_provider: z.enum(['voyage', 'openai', 'cohere']).optional(),
    embedding_api_key: z.string().optional(),
    embedding_model: z.string().optional(),
  }),
});

// --- Deck ---

export const createDeckSchema = z.object({
  name: z.string().min(1, 'Deck name is required').max(200),
  description: z.string().max(2000).optional(),
  course_id: z.string().uuid('Invalid course ID'),
});

export const updateDeckSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
});

// --- Card ---

const templateType = z.enum(['definition', 'theorem', 'formula', 'general']);

export const createCardSchema = z.object({
  deck_id: z.string().uuid('Invalid deck ID'),
  section_id: z.string().uuid().optional(),
  template_type: templateType.optional().default('general'),
  title: z.string().min(1, 'Card title is required').max(500),
  content: z.record(z.unknown()),
  importance: z.number().int().min(1).max(5).optional().default(3),
  tag_ids: z.array(z.string().uuid()).optional(),
});

export const updateCardSchema = z.object({
  template_type: templateType.optional(),
  title: z.string().min(1).max(500).optional(),
  content: z.record(z.unknown()).optional(),
  importance: z.number().int().min(1).max(5).optional(),
  section_id: z.string().uuid().nullable().optional(),
  tag_ids: z.array(z.string().uuid()).optional(),
});

// --- Card Batch Operations ---

export const reorderCardsSchema = z.object({
  deck_id: z.string().uuid(),
  updates: z.array(z.object({
    id: z.string().uuid(),
    section_id: z.string().uuid().nullable(),
    order_index: z.number().int().min(0),
  })).min(1),
});

export const batchDeleteCardsSchema = z.object({
  card_ids: z.array(z.string().uuid()).min(1, 'At least one card ID is required').max(200),
});

export const batchMoveCardsSchema = z.object({
  card_ids: z.array(z.string().uuid()).min(1, 'At least one card ID is required').max(200),
  target_deck_id: z.string().uuid('Invalid target deck ID'),
  target_section_id: z.string().uuid().optional(),
});

// --- Card Section ---

export const reorderSectionsSchema = z.object({
  deck_id: z.string().uuid(),
  order: z.array(z.string().uuid()).min(1),
});

export const createSectionSchema = z.object({
  deck_id: z.string().uuid('Invalid deck ID'),
  name: z.string().min(1, 'Section name is required').max(200),
  order_index: z.number().int().min(0).optional().default(0),
});

export const updateSectionSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  order_index: z.number().int().min(0).optional(),
});

// --- Tag Group ---

export const createTagGroupSchema = z.object({
  course_id: z.string().uuid('Invalid course ID'),
  name: z.string().min(1, 'Tag group name is required').max(50),
});

export const updateTagGroupSchema = z.object({
  name: z.string().min(1).max(50),
});

// --- Tag ---

export const createTagSchema = z.object({
  name: z.string().min(1, 'Tag name is required').max(50),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Invalid hex color').optional(),
  tag_group_id: z.string().uuid('Invalid tag group ID').optional(),
});

export const updateTagSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Invalid hex color').optional(),
});

// --- Review ---

export const rateCardSchema = z.object({
  rating: z.number().int().min(1).max(4),
});

// --- Agent ---

export const sendMessageSchema = z.object({
  message: z.string().min(1, 'Message is required').max(10000),
  context_hint: z.object({
    type: z.string(),
    data: z.any(),
  }).optional(),
  image: z.object({
    media_type: z.string(),
    data: z.string(),
  }).optional(),
});

export const createConversationSchema = z.object({
  title: z.string().max(200).optional(),
});

// --- Proposals ---

export const updateProposalSchema = z.object({
  data: z.any(),
});

export const createMaterialMapProposalSchema = z.object({
  course_id: z.string().uuid('Invalid course ID'),
  document_ids: z.array(z.string().uuid()).optional(),
  source_material_ids: z.array(z.string().uuid()).optional(),
  source_scope_ids: z.array(z.string().uuid()).optional(),
  source_board_id: z.string().uuid().optional(),
});

export const createOrganizedNoteProposalSchema = z.object({
  course_id: z.string().uuid('Invalid course ID'),
  source_material_ids: z.array(z.string().uuid()).optional(),
  segment_ids: z.array(z.string().uuid()).optional(),
  document_ids: z.array(z.string().uuid()).optional(),
  source_scope_ids: z.array(z.string().uuid()).optional(),
  source_board_id: z.string().uuid().optional(),
  note_title: z.string().min(1).max(200).optional(),
});

export const createMaterialReconciliationProposalSchema = z.object({
  course_id: z.string().uuid('Invalid course ID'),
  document_ids: z.array(z.string().uuid()).optional(),
  source_material_ids: z.array(z.string().uuid()).optional(),
  segment_ids: z.array(z.string().uuid()).optional(),
  source_scope_ids: z.array(z.string().uuid()).optional(),
  source_board_id: z.string().uuid().optional(),
});

export const createCanvasLayoutProposalSchema = z.object({
  course_id: z.string().uuid('Invalid course ID'),
  canvas_id: z.string().uuid('Invalid canvas ID'),
  source_board_id: z.string().uuid().optional(),
  canvas_node_ids: z.array(z.string().uuid()).optional(),
  source_scope_ids: z.array(z.string().uuid()).optional(),
  note_block_ids: z.array(z.string().uuid()).optional(),
  layout_goal: z.enum(['a4_reading', 'board_overview']).optional(),
});

export const createCompositionTemplateProposalSchema = z.object({
  course_id: z.string().uuid('Invalid course ID'),
  canvas_id: z.string().uuid('Invalid canvas ID'),
  composition_template_id: z.string().uuid().optional(),
  composition_key: z.string().max(160).optional(),
  source_scope_ids: z.array(z.string().uuid()).optional(),
  source_board_id: z.string().uuid().optional(),
  slot_inputs: z.array(z.object({
    slot_key: z.string().min(1).max(120),
    template_definition_id: z.string().uuid().optional(),
    template_key: z.string().max(160).optional(),
    title: z.string().max(200).optional(),
    plain_text: z.string().max(20000).optional(),
    content_json: jsonObjectSchema.optional(),
    source_references: z.array(jsonObjectSchema).optional(),
    metadata: jsonObjectSchema.optional(),
  })).optional(),
  partial_slot_keys: z.array(z.string().max(120)).optional(),
  layout_goal: z.enum(['a4_section', 'canvas_cluster']).optional(),
});

// --- Document Upload ---

export const uploadDocumentSchema = z.object({
  course_id: z.string().uuid('Invalid course ID'),
});

// --- v2 Notes / NoteBlocks ---

export const createNoteSchema = z.object({
  course_id: z.string().uuid('Invalid course ID'),
  title: z.string().min(1, 'Note title is required').max(300),
  description: z.string().max(2000).optional(),
  page_format: z.string().max(50).optional().default('flow'),
  metadata: jsonObjectSchema.optional(),
});

export const updateNoteSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  description: z.string().max(2000).nullable().optional(),
  page_format: z.string().max(50).optional(),
  metadata: jsonObjectSchema.optional(),
  status: v2StatusSchema.optional(),
});

const contentGroupRuntimeIdSchema = z.string().min(1).max(180);

const contentGroupIdentitySchema = z.object({
  status: z.enum(['none', 'draft', 'accepted', 'rejected', 'archived']).optional(),
  type: z.string().max(160).nullable().optional(),
  role: z.string().max(160).nullable().optional(),
  topic: z.string().max(240).nullable().optional(),
  summary: z.string().max(4000).nullable().optional(),
  created_by: z.enum(['human', 'ai', 'system']).optional(),
  reviewed_by: z.enum(['human', 'ai', 'system']).nullable().optional(),
  confidence: z.number().min(0).max(1).nullable().optional(),
  updated_at: z.string().max(80).optional(),
  accepted_at: z.string().max(80).nullable().optional(),
  metadata: jsonObjectSchema.optional(),
});

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

export const contentGroupMemberSchema = z.object({
  id: contentGroupRuntimeIdSchema.optional(),
  kind: contentGroupMemberKindSchema.optional(),
  target_id: contentGroupRuntimeIdSchema.nullable().optional(),
  item_id: contentGroupRuntimeIdSchema.nullable().optional(),
  label: z.string().max(1000).nullable().optional(),
  current_content: z.string().nullable().optional(),
  preview_text: z.string().nullable().optional(),
  content_range: jsonObjectSchema.nullable().optional(),
  source_ref: jsonObjectSchema.nullable().optional(),
  source_sync_status: z.enum(['fresh', 'changed', 'missing', 'detached', 'unsupported', 'stale']).optional(),
  order_index: z.number().int().optional(),
  metadata: jsonObjectSchema.optional(),
}).passthrough().superRefine((member, context) => {
  if (member.kind === 'item') {
    if (!member.item_id) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Item members require item_id',
        path: ['item_id'],
      });
    }
    if (member.target_id) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Item members cannot use target_id',
        path: ['target_id'],
      });
    }
  } else if (member.item_id) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Non-Item members cannot use item_id',
      path: ['item_id'],
    });
  }
});

export const upsertContentGroupSchema = z.object({
  id: contentGroupRuntimeIdSchema.optional(),
  course_id: z.string().uuid('Invalid course ID').optional(),
  project_id: z.string().uuid('Invalid project ID').optional(),
  note_id: z.string().uuid('Invalid note ID').nullable().optional(),
  // Hydrated note-scoped groups use an empty string when no canvas identity exists.
  // Accept the service's own read shape so GET -> PUT remains a valid round trip.
  canvas_id: z.union([contentGroupRuntimeIdSchema, z.literal('')]).nullable().optional(),
  folder_id: contentGroupRuntimeIdSchema.nullable().optional(),
  parent_group_id: contentGroupRuntimeIdSchema.nullable().optional(),
  title: z.string().min(1).max(300),
  status: z.enum(['active', 'hidden', 'deleted']).optional(),
  created_by: z.enum(['human', 'ai_proposal', 'importer']).optional(),
  identity: contentGroupIdentitySchema.optional(),
  placements: z.array(jsonObjectSchema).optional(),
  members: z.array(contentGroupMemberSchema).optional(),
  view_state: jsonObjectSchema.optional(),
  metadata: jsonObjectSchema.optional(),
  created_at: z.string().max(80).optional(),
  updated_at: z.string().max(80).optional(),
}).refine((value) => value.course_id || value.project_id || value.note_id, {
  message: 'course_id, project_id, or note_id is required',
  path: ['course_id'],
});

export const replaceNoteContentGroupsSchema = z.object({
  groups: z.array(upsertContentGroupSchema).max(500),
});

const itemCreatedBySchema = z.enum(['human', 'user', 'ai', 'ai_proposal', 'importer', 'system']);
const itemPlainTextSchema = z.string().max(200000);

function requireItemBody(
  value: { body_json?: Record<string, unknown>; plain_text?: string },
  context: z.RefinementCtx,
) {
  const bodyText = typeof value.body_json?.body === 'string' ? value.body_json.body.trim() : '';
  if (!value.plain_text?.trim() && !bodyText && !value.body_json?.text_flow) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'plain_text or body_json content is required',
      path: ['plain_text'],
    });
  }
}

export const createItemSchema = z.object({
  body_json: jsonObjectSchema.optional(),
  plain_text: itemPlainTextSchema.optional(),
  item_type: z.string().max(160).nullable().optional(),
  topic: z.string().max(240).nullable().optional(),
  origin_course_id: z.string().uuid('Invalid origin project ID').nullable().optional(),
  origin_note_id: z.string().uuid('Invalid origin note ID').nullable().optional(),
  created_by: itemCreatedBySchema.optional(),
  metadata: jsonObjectSchema.optional(),
}).strict().superRefine(requireItemBody);

export const updateItemSchema = z.object({
  body_json: jsonObjectSchema.optional(),
  plain_text: itemPlainTextSchema.optional(),
  item_type: z.string().max(160).nullable().optional(),
  topic: z.string().max(240).nullable().optional(),
  metadata: jsonObjectSchema.optional(),
}).strict().refine((value) => Object.keys(value).length > 0, {
  message: 'At least one Item field is required',
});

export const retireItemSchema = z.object({
  successor_item_id: contentGroupRuntimeIdSchema.nullable().optional(),
}).strict();

const itemAnchorTargetKindSchema = z.enum([
  'block',
  'content_range',
  'canvas_object',
  'table_region',
  'image_region',
]);

export const collectItemAnchorSchema = z.object({
  pool_scope_kind: z.literal('content_group'),
  pool_scope_id: contentGroupRuntimeIdSchema,
  target_kind: itemAnchorTargetKindSchema,
  target_id: contentGroupRuntimeIdSchema,
  range_json: jsonObjectSchema.nullable().optional(),
  excerpt: z.string().min(1).max(200000),
  reference_mode: z.string().min(1).max(80).optional(),
  source_record_id: contentGroupRuntimeIdSchema.nullable().optional(),
  collected_for: z.string().max(1000).nullable().optional(),
  metadata: jsonObjectSchema.optional(),
  created_by: itemCreatedBySchema.optional(),
}).strict();

export const castItemSchema = z.object({
  anchor_ids: z.array(contentGroupRuntimeIdSchema).min(1).max(50),
  body_json: jsonObjectSchema.optional(),
  plain_text: itemPlainTextSchema.optional(),
  item_type: z.string().max(160).nullable().optional(),
  topic: z.string().max(240).nullable().optional(),
  origin_course_id: z.string().uuid('Invalid origin project ID').nullable().optional(),
  origin_note_id: z.string().uuid('Invalid origin note ID').nullable().optional(),
  created_by: itemCreatedBySchema.optional(),
  claimed_by: z.string().min(1).max(160).optional(),
  metadata: jsonObjectSchema.optional(),
}).strict().superRefine(requireItemBody);

export const itemPoolQuerySchema = z.object({
  pool_scope_kind: z.literal('content_group'),
  pool_scope_id: contentGroupRuntimeIdSchema,
}).strict();

export const itemListQuerySchema = z.object({
  status: z.enum(['active', 'retired', 'all']).optional(),
  origin_course_id: contentGroupRuntimeIdSchema.optional(),
  origin_note_id: contentGroupRuntimeIdSchema.optional(),
  q: z.string().max(240).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
}).strict();

const purposeMemberSchema = z.object({
  id: contentGroupRuntimeIdSchema.optional(),
  purpose_id: contentGroupRuntimeIdSchema.optional(),
  member_kind: z.enum(['content_group', 'item']).optional(),
  member_id: contentGroupRuntimeIdSchema,
  role: z.string().max(160).nullable().optional(),
  fitness: z.string().max(160).optional(),
  order_index: z.number().int().optional(),
  metadata: jsonObjectSchema.optional(),
  created_at: z.string().max(80).optional(),
  updated_at: z.string().max(80).optional(),
});

const purposeSchema = z.object({
  id: contentGroupRuntimeIdSchema.optional(),
  course_id: z.string().uuid('Invalid course ID').nullable().optional(),
  project_id: z.string().uuid('Invalid project ID').nullable().optional(),
  note_id: z.string().uuid('Invalid note ID').nullable().optional(),
  title: z.string().min(1).max(300),
  intent: z.string().max(4000).nullable().optional(),
  scope_note: z.string().max(4000).nullable().optional(),
  status: z.enum(['active', 'archived']).optional(),
  is_note_default: z.boolean().optional(),
  created_by: z.enum(['human', 'ai', 'system', 'ai_proposal', 'importer']).optional(),
  members: z.array(purposeMemberSchema).max(500).optional(),
  metadata: jsonObjectSchema.optional(),
  created_at: z.string().max(80).optional(),
  updated_at: z.string().max(80).optional(),
});

export const replaceNotePurposesSchema = z.object({
  purposes: z.array(purposeSchema).max(100),
}).strict();

export const purposeItemSearchQuerySchema = z.object({
  q: z.string().max(240).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
}).strict();

export const relationTypeSchema = z.enum([
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

export const createRelationSchema = z.object({
  from_item_id: contentGroupRuntimeIdSchema,
  to_item_id: contentGroupRuntimeIdSchema,
  relation_type: relationTypeSchema,
  note: z.string().max(4000).nullable().optional(),
  created_by: itemCreatedBySchema.optional(),
  origin_purpose_id: contentGroupRuntimeIdSchema.nullable().optional(),
}).strict();

export const listRelationsQuerySchema = z.object({
  item_id: contentGroupRuntimeIdSchema.optional(),
  purpose_id: contentGroupRuntimeIdSchema.optional(),
  status: z.enum(['active', 'revoked', 'all']).optional(),
}).strict().superRefine((value, context) => {
  if (Boolean(value.item_id) === Boolean(value.purpose_id)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Exactly one of item_id or purpose_id is required',
      path: ['item_id'],
    });
  }
});

export const relationCommandSchema = z.object({}).strict();

export const importNoteMetadataContentGroupsSchema = z.object({
  note_id: z.string().uuid('Invalid note ID'),
  groups: z.array(upsertContentGroupSchema).max(500),
});

export const groupFolderScopeSchema = z.object({
  kind: z.enum(['workspace', 'project', 'note', 'custom', 'temporary']).optional(),
  project_id: z.string().uuid('Invalid project ID').nullable().optional(),
  note_id: z.string().uuid('Invalid note ID').nullable().optional(),
  label: z.string().max(160).nullable().optional(),
});

export const upsertGroupFolderSchema = z.object({
  id: contentGroupRuntimeIdSchema.optional(),
  title: z.string().trim().min(1).max(160),
  parent_folder_id: contentGroupRuntimeIdSchema.nullable().optional(),
  scope: groupFolderScopeSchema.optional(),
  origin: z.enum(['human', 'system', 'ai_proposal', 'user', 'ai']).optional(),
  system_root: z.boolean().optional(),
  status: z.enum(['active', 'temporary', 'archived', 'deleted']).optional(),
  order_index: z.number().int().optional(),
  metadata: jsonObjectSchema.optional(),
});

export const replaceNoteGroupFoldersSchema = z.object({
  folders: z.array(upsertGroupFolderSchema).max(500),
});

export const importNoteGroupFoldersSchema = z.object({
  note_id: z.string().uuid('Invalid note ID'),
  folders: z.array(upsertGroupFolderSchema).max(500),
});

export const updateContentGroupFolderPlacementSchema = z.object({
  folder_id: contentGroupRuntimeIdSchema.nullable(),
  placement_role: z.enum(['primary', 'reference', 'temporary']).optional(),
  order_index: z.number().int().optional(),
  added_by: z.enum(['human', 'ai_proposal', 'ai', 'system', 'importer']).optional(),
  metadata: jsonObjectSchema.optional(),
});

const sourceReferenceSchema = z.object({
  document_id: z.string().uuid().optional(),
  document_chunk_id: z.string().uuid().optional(),
  source_page_start: z.number().int().min(1).optional(),
  source_page_end: z.number().int().min(1).optional(),
  source_excerpt: z.string().max(5000).optional(),
  reference_type: z.string().max(50).optional().default('page'),
  confidence: z.number().min(0).max(1).optional(),
  metadata: jsonObjectSchema.optional(),
}).refine(
  data => data.source_page_start === undefined || data.source_page_end === undefined || data.source_page_end >= data.source_page_start,
  { message: 'source_page_end must be greater than or equal to source_page_start', path: ['source_page_end'] }
);

export const createNoteBlockSchema = z.object({
  client_create_key: z.string().trim().min(1).max(220).optional(),
  block_type: noteBlockTypeSchema,
  title: z.string().max(300).optional(),
  content_json: jsonObjectSchema.optional().default({}),
  plain_text: z.string().max(20000).optional(),
  metadata: jsonObjectSchema.optional(),
  display_overrides_json: jsonObjectSchema.optional(),
  source_references: z.array(sourceReferenceSchema).max(20).optional(),
});

export const discardClientNoteBlockCreateSchema = z.object({
  client_create_key: z.string().trim().min(1).max(220),
}).strict();

export const updateNoteBlockSchema = z.object({
  block_type: noteBlockTypeSchema.optional(),
  title: z.string().max(300).nullable().optional(),
  content_json: jsonObjectSchema.optional(),
  plain_text: z.string().max(20000).nullable().optional(),
  metadata: jsonObjectSchema.optional(),
  status: v2StatusSchema.optional(),
});

export const reorderNoteBlocksSchema = z.object({
  placements: z.array(z.object({
    placement_id: z.string().uuid(),
    order_index: z.number().int().min(0),
  })).min(1),
});

export const updateNoteBlockPlacementSchema = z.object({
  display_overrides_json: jsonObjectSchema,
});

const canvasRuntimeIdSchema = z.string().min(1).max(220);
const canvasSurfaceSchema = z.enum(['formal_page', 'canvas_workspace', 'tray']);
const canvasBoundaryRoleSchema = z.enum(['inside', 'outside', 'crossing']);
const canvasVisibilityStateSchema = z.enum(['normal', 'scratch', 'ai_hidden', 'export_hidden']);
const canvasRenderVisibilitySchema = z.enum(['visible', 'hidden', 'collapsed']);

const canvasPlacementCoreSchema = z.object({
  placement_id: canvasRuntimeIdSchema.optional(),
  x: z.number().finite(),
  y: z.number().finite(),
  width: z.number().finite().min(0),
  height: z.number().finite().min(0),
  rotation: z.number().finite().optional(),
  frame_id: canvasRuntimeIdSchema.nullable().optional(),
  surface: canvasSurfaceSchema.optional(),
  boundary_role: canvasBoundaryRoleSchema.optional(),
  z_index: z.number().int().optional(),
  order_index: z.number().int().nullable().optional(),
  visibility_state: canvasVisibilityStateSchema.optional(),
  render_visibility: canvasRenderVisibilitySchema.optional(),
  export_role: z.enum(['included', 'excluded', 'scratch']).optional(),
  ai_visibility: z.enum(['visible', 'hidden']).optional(),
  width_mode: z.enum(['auto', 'manual']).optional(),
}).passthrough();

const canvasObjectMetadataSchema = jsonObjectSchema.optional();
const canvasObjectSourceSchema = jsonObjectSchema.optional();

const saveParagraphBlockProjectionObjectSchema = z.object({
  kind: z.literal('paragraph_block_projection'),
  placement: canvasPlacementCoreSchema,
  extension: z.object({
    block_id: canvasRuntimeIdSchema,
  }),
  mount: z.object({
    mount_id: canvasRuntimeIdSchema.optional(),
    target_id: canvasRuntimeIdSchema.optional(),
    projection_mode: z.enum(['owned', 'reference', 'duplicate', 'fork', 'materialized']).optional(),
    sync_policy: z.enum(['manual', 'read_through', 'snapshot']).optional(),
  }).optional(),
  metadata: canvasObjectMetadataSchema,
  source: canvasObjectSourceSchema,
});

const saveTestProbeObjectSchema = z.object({
  kind: z.literal('__test_probe'),
  placement: canvasPlacementCoreSchema,
  metadata: canvasObjectMetadataSchema,
  source: canvasObjectSourceSchema,
});

const shapeContentMountSchema = z.object({
  mount_id: canvasRuntimeIdSchema.optional(),
  target_id: canvasRuntimeIdSchema.optional(),
  projection_mode: z.literal('owned').optional(),
  sync_policy: z.literal('manual').optional(),
});

const canvasObjectStyleMetadataSchema = z.object({
  preset_id: z.enum(['shape.default', 'shape.sticky_note']),
  family: z.literal('shape').optional(),
  variant: z.enum(['default', 'yellow']).optional(),
  text_inset: z.number().min(0).max(32).optional(),
}).passthrough();

const saveShapeObjectSchema = z.object({
  kind: z.literal('shape'),
  backing: z.enum(['none', 'note_block']).optional(),
  object_class: z.enum(['pure', 'block_backed']).optional(),
  placement: canvasPlacementCoreSchema,
  metadata: z.object({
    shape_type: z.enum(['rectangle', 'ellipse']),
    object_style: canvasObjectStyleMetadataSchema.optional(),
  }).passthrough(),
  extension: z.object({
    block_id: canvasRuntimeIdSchema,
  }).optional(),
  mount: shapeContentMountSchema.optional(),
  source: canvasObjectSourceSchema,
}).superRefine((value, ctx) => {
  const backing = value.backing || 'none';
  const objectClass = value.object_class || 'pure';
  const stylePreset = value.metadata.object_style?.preset_id;
  if (backing === 'none') {
    if (stylePreset === 'shape.sticky_note') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['metadata', 'object_style'],
        message: 'Sticky note style requires a note_block-backed shape',
      });
    }
    if (objectClass !== 'pure') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['object_class'],
        message: 'Pure shape must use object_class="pure"',
      });
    }
    if (value.extension || value.mount) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['extension'],
        message: 'Pure shape cannot include note_block backing payload',
      });
    }
    return;
  }
  if (objectClass !== 'block_backed') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['object_class'],
      message: 'note_block-backed shape must use object_class="block_backed"',
    });
  }
  if (!value.extension?.block_id) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['extension', 'block_id'],
      message: 'block-backed shape requires extension.block_id',
    });
  }
  if (value.mount?.target_id && value.extension?.block_id && value.mount.target_id !== value.extension.block_id) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['mount', 'target_id'],
      message: 'shape mount target_id must match extension.block_id',
    });
  }
  if (stylePreset === 'shape.sticky_note' && value.metadata.shape_type !== 'rectangle') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['metadata', 'shape_type'],
      message: 'Sticky note style currently requires rectangle shape_type',
    });
  }
});

const visualConnectorAnchorSchema = z.enum(['auto', 'center', 'north', 'east', 'south', 'west']);
const visualConnectorObjectEndpointSchema = z.object({
  kind: z.literal('object'),
  object_id: canvasRuntimeIdSchema.optional(),
  objectId: canvasRuntimeIdSchema.optional(),
  anchor: visualConnectorAnchorSchema.optional(),
}).passthrough().superRefine((value, ctx) => {
  if (!value.object_id && !value.objectId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['object_id'],
      message: 'object endpoint requires object_id',
    });
  }
});
const visualConnectorPointEndpointSchema = z.object({
  kind: z.literal('point'),
  x: z.number().finite(),
  y: z.number().finite(),
}).passthrough();
const visualConnectorEndpointSchema = z.union([
  visualConnectorObjectEndpointSchema,
  visualConnectorPointEndpointSchema,
]);

const visualConnectorExtensionSchema = z.object({
  start: visualConnectorEndpointSchema,
  end: visualConnectorEndpointSchema,
  line_style: z.enum(['solid', 'dashed', 'dotted']).optional(),
  lineStyle: z.enum(['solid', 'dashed', 'dotted']).optional(),
  stroke: z.string().trim().min(1).max(64).optional(),
  stroke_width: z.number().finite().min(0.5).max(16).optional(),
  strokeWidth: z.number().finite().min(0.5).max(16).optional(),
  start_marker: z.enum(['none', 'arrow']).optional(),
  startMarker: z.enum(['none', 'arrow']).optional(),
  end_marker: z.enum(['none', 'arrow']).optional(),
  endMarker: z.enum(['none', 'arrow']).optional(),
  relation_kind: z.literal('visual_only').optional(),
  relationKind: z.literal('visual_only').optional(),
  metadata: canvasObjectMetadataSchema,
}).passthrough();

const saveVisualConnectorObjectSchema = z.object({
  kind: z.literal('visual_connector'),
  backing: z.literal('none').optional(),
  object_class: z.literal('pure').optional(),
  placement: canvasPlacementCoreSchema,
  metadata: canvasObjectMetadataSchema,
  extension: visualConnectorExtensionSchema,
  source: canvasObjectSourceSchema,
  mount: z.never().optional(),
  contentMount: z.never().optional(),
}).superRefine((value, ctx) => {
  if (value.backing && value.backing !== 'none') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['backing'],
      message: 'Visual connector must use backing="none"',
    });
  }
  if (value.object_class && value.object_class !== 'pure') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['object_class'],
      message: 'Visual connector must use object_class="pure"',
    });
  }
  if (value.mount || value.contentMount) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['mount'],
      message: 'Visual connector cannot include content mounts',
    });
  }
});

const saveImageObjectSchema = z.object({
  kind: z.literal('image'),
  backing: z.literal('asset'),
  object_class: z.literal('media'),
  placement: canvasPlacementCoreSchema,
  metadata: canvasObjectMetadataSchema,
  extension: z.object({
    asset_id: canvasRuntimeIdSchema.optional(),
    assetId: canvasRuntimeIdSchema.optional(),
    fit: z.enum(['contain', 'cover']).optional(),
    caption: z.string().max(2000).nullable().optional(),
    alt_text: z.string().max(4000).nullable().optional(),
    altText: z.string().max(4000).nullable().optional(),
    natural_width: z.number().int().min(0).optional(),
    naturalWidth: z.number().int().min(0).optional(),
    natural_height: z.number().int().min(0).optional(),
    naturalHeight: z.number().int().min(0).optional(),
    metadata: canvasObjectMetadataSchema,
  }).passthrough(),
  source: canvasObjectSourceSchema,
  mount: z.never().optional(),
  contentMount: z.never().optional(),
}).superRefine((value, ctx) => {
  if (!value.extension.asset_id && !value.extension.assetId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['extension', 'asset_id'],
      message: 'Image CanvasObject requires extension.asset_id',
    });
  }
  if (value.mount || value.contentMount) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['mount'],
      message: 'Image CanvasObject cannot include content mounts',
    });
  }
});

const tableRowSchema = z.object({
  rowId: canvasRuntimeIdSchema,
  index: z.number().int().min(0),
  height: z.number().finite().positive().optional(),
}).passthrough();

const tableColumnSchema = z.object({
  columnId: canvasRuntimeIdSchema,
  index: z.number().int().min(0),
  width: z.number().finite().positive().optional(),
  label: z.string().max(200).optional(),
}).passthrough();

const tableCellSchema = z.object({
  cellId: canvasRuntimeIdSchema,
  rowId: canvasRuntimeIdSchema,
  columnId: canvasRuntimeIdSchema,
  rowIndex: z.number().int().min(0),
  columnIndex: z.number().int().min(0),
  text: z.string().max(2000),
  valueType: z.literal('text'),
}).passthrough();

function validateContinuousIndexes(
  values: Array<{ index: number }>,
  path: Array<string | number>,
  ctx: z.RefinementCtx,
) {
  const indexes = [...values.map((value) => value.index)].sort((a, b) => a - b);
  for (let index = 0; index < indexes.length; index += 1) {
    if (indexes[index] !== index) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path,
        message: 'Table row and column indexes must be continuous from 0',
      });
      return;
    }
  }
}

const tableStructuredExtensionSchema = z.object({
  structured_kind: z.literal('table').optional(),
  structuredKind: z.literal('table').optional(),
  schema_version: z.literal('table.v1').optional(),
  schemaVersion: z.literal('table.v1').optional(),
  rows: z.array(tableRowSchema).min(1).max(50),
  columns: z.array(tableColumnSchema).min(1).max(20),
  cells: z.array(tableCellSchema).min(1).max(1000),
  metadata: canvasObjectMetadataSchema,
}).passthrough().superRefine((value, ctx) => {
  validateContinuousIndexes(value.rows, ['rows'], ctx);
  validateContinuousIndexes(value.columns, ['columns'], ctx);
  if (value.cells.length !== value.rows.length * value.columns.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['cells'],
      message: 'Table cells must cover every row and column pair exactly once',
    });
  }
  const rowIds = new Set(value.rows.map((row) => row.rowId));
  const columnIds = new Set(value.columns.map((column) => column.columnId));
  const seenPairs = new Set<string>();
  for (const [index, cell] of value.cells.entries()) {
    if (!rowIds.has(cell.rowId)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['cells', index, 'rowId'],
        message: 'Table cell rowId must reference an existing row',
      });
    }
    if (!columnIds.has(cell.columnId)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['cells', index, 'columnId'],
        message: 'Table cell columnId must reference an existing column',
      });
    }
    const key = `${cell.rowId}:${cell.columnId}`;
    if (seenPairs.has(key)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['cells', index],
        message: 'Table cells cannot duplicate a row and column pair',
      });
    }
    seenPairs.add(key);
  }
});

const saveTableObjectSchema = z.object({
  kind: z.literal('table'),
  backing: z.literal('structured_object'),
  object_class: z.literal('structured'),
  placement: canvasPlacementCoreSchema,
  metadata: canvasObjectMetadataSchema,
  extension: tableStructuredExtensionSchema,
  source: canvasObjectSourceSchema,
  mount: z.never().optional(),
  contentMount: z.never().optional(),
}).superRefine((value, ctx) => {
  if (value.mount || value.contentMount) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['mount'],
      message: 'Table CanvasObject cannot include content mounts',
    });
  }
});

export const savePageFrameCollectionSchema = z.object({
  collection: jsonObjectSchema,
});

export const saveCanvasBlockPlacementSchema = z.object({
  block_id: canvasRuntimeIdSchema,
  layout: canvasPlacementCoreSchema,
});

export const saveCanvasObjectSchema = z.union([
  saveParagraphBlockProjectionObjectSchema,
  saveShapeObjectSchema,
  saveVisualConnectorObjectSchema,
  saveImageObjectSchema,
  saveTableObjectSchema,
  saveTestProbeObjectSchema,
]);

export const replaceNoteAnnotationTruthsSchema = z.object({
  annotations: z.array(jsonObjectSchema).max(1000),
});

export const createProjectionSchema = z.object({
  course_id: z.string().uuid('Invalid course ID'),
  type: z.enum(['organized_note']),
  title: z.string().min(1).max(300),
  source_note_id: z.string().uuid().optional(),
  snapshot_json: jsonObjectSchema.optional(),
  source_refs_json: z.array(z.unknown()).optional(),
  source_versions_json: jsonObjectSchema.optional(),
  metadata: jsonObjectSchema.optional(),
});

// --- v2.1 Course Materials ---

export const updateMaterialSegmentSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  summary: z.string().max(2000).nullable().optional(),
  status: z.enum(['proposed', 'accepted', 'needs_review', 'discarded']).optional(),
  order_index: z.number().int().min(0).optional(),
  metadata: jsonObjectSchema.optional(),
});

// --- Query params ---

export const dateQuerySchema = z.object({
  date: dateString.optional(),
  from: dateString.optional(),
  to: dateString.optional(),
  course_id: z.string().uuid().optional(),
});
