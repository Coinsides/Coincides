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

export const createTemplateMigrationProposalSchema = z.object({
  source_template_id: z.string().uuid('Invalid source template ID'),
  target_template_id: z.string().uuid('Invalid target template ID').optional(),
  target_template_patch: jsonObjectSchema.optional(),
  migration_mode: z.enum(['alias_mapping', 'soft_migration', 'hard_cascade']),
  course_id: z.string().uuid('Invalid course ID').optional(),
  reason: z.string().max(1000).optional(),
}).refine((value) => value.target_template_id || value.target_template_patch, {
  message: 'target_template_id or target_template_patch is required',
  path: ['target_template_id'],
});

const domainMembershipChangeSchema = z.object({
  change_action: z.enum(['add', 'remove', 'update']).optional().default('add'),
  template_definition_id: z.string().uuid().optional(),
  template_key: z.string().max(160).optional(),
  template_version: z.string().max(50).optional(),
  composition_template_id: z.string().uuid().optional(),
  composition_key: z.string().max(160).optional(),
  composition_version: z.string().max(50).optional(),
  member_role: z.string().max(120).optional(),
  required: z.boolean().optional(),
  order_index: z.number().int().min(0).optional(),
  metadata: jsonObjectSchema.optional(),
});

const domainObjectReclassificationSchema = z.object({
  target_type: z.enum(['note_block', 'template_definition', 'composition_template']),
  target_id: z.string().uuid('Invalid object ID'),
  target_domain_id: z.string().uuid().optional(),
  target_domain_key: z.string().max(160).optional(),
  classification_role: z.string().max(120).optional(),
  confidence: z.number().min(0).max(1).optional(),
  metadata: jsonObjectSchema.optional(),
});

export const createDomainRefinementProposalSchema = z.object({
  source_domain_id: z.string().uuid('Invalid source domain ID'),
  target_domain_id: z.string().uuid('Invalid target domain ID').optional(),
  target_domain_patch: jsonObjectSchema.optional(),
  refinement_action: z.enum(['rename', 'promote', 'split', 'merge', 'fork', 'deprecate', 'reclassify']),
  migration_mode: z.enum(['alias_mapping', 'soft_migration', 'hard_cascade']),
  course_id: z.string().uuid('Invalid course ID').optional(),
  template_membership_changes: z.array(domainMembershipChangeSchema).optional(),
  composition_membership_changes: z.array(domainMembershipChangeSchema).optional(),
  object_reclassifications: z.array(domainObjectReclassificationSchema).optional(),
  reason: z.string().max(1000).optional(),
}).refine((value) => value.target_domain_id || value.target_domain_patch || value.refinement_action === 'deprecate', {
  message: 'target_domain_id, target_domain_patch, or deprecate action is required',
  path: ['target_domain_id'],
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
  block_type: noteBlockTypeSchema,
  title: z.string().max(300).optional(),
  content_json: jsonObjectSchema.optional().default({}),
  plain_text: z.string().max(20000).optional(),
  metadata: jsonObjectSchema.optional(),
  display_overrides_json: jsonObjectSchema.optional(),
  source_references: z.array(sourceReferenceSchema).max(20).optional(),
});

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
