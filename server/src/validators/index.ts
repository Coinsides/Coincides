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

export const createTaskSchema = z.object({
  title: z.string().min(1, 'Task title is required').max(500),
  date: dateString,
  priority: taskPriority.optional().default('must'),
  course_id: z.string().uuid('Invalid course ID'),
  goal_id: z.string().uuid('Invalid goal ID').optional(),
  recurring_group_id: z.string().uuid().optional(),
  order_index: z.number().int().min(0).optional(),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  date: dateString.optional(),
  priority: taskPriority.optional(),
  status: taskStatus.optional(),
  completed_at: z.string().nullable().optional(),
  order_index: z.number().int().min(0).optional(),
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
});

export const updateGoalSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(2000).optional(),
  deadline: dateString.optional(),
  status: z.enum(['active', 'completed', 'archived']).optional(),
  exam_mode: z.boolean().optional(),
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
    agent_name: z.string().max(50).optional(),
    daily_status_enabled: z.boolean().optional(),
    keyboard_shortcuts_enabled: z.boolean().optional(),
    ai_providers: z.record(z.object({
      api_key: z.string().optional(),
      default_model: z.string().optional(),
    })).optional(),
    active_provider: z.string().optional(),
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

export const batchDeleteCardsSchema = z.object({
  card_ids: z.array(z.string().uuid()).min(1, 'At least one card ID is required').max(200),
});

export const batchMoveCardsSchema = z.object({
  card_ids: z.array(z.string().uuid()).min(1, 'At least one card ID is required').max(200),
  target_deck_id: z.string().uuid('Invalid target deck ID'),
  target_section_id: z.string().uuid().optional(),
});

// --- Card Section ---

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
});

export const createConversationSchema = z.object({
  title: z.string().max(200).optional(),
});

// --- Proposals ---

export const updateProposalSchema = z.object({
  data: z.any(),
});

// --- Query params ---

export const dateQuerySchema = z.object({
  date: dateString.optional(),
  from: dateString.optional(),
  to: dateString.optional(),
  course_id: z.string().uuid().optional(),
});
