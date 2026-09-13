// ============================================================
// Coincides — Shared Type Definitions
// ============================================================

import type { SkinSelection } from './skin.js';
export * from './skin.js';
export * from './palette.js';
export * from './noteCover.js';

// --- Enums ---

export enum TaskPriority {
  Must = 'must',
  Recommended = 'recommended',
  Optional = 'optional',
}

export enum TaskStatus {
  Pending = 'pending',
  Completed = 'completed',
}

export enum EnergyLevel {
  Energized = 'energized',
  Normal = 'normal',
  Tired = 'tired',
}

export enum GoalStatus {
  Active = 'active',
  Completed = 'completed',
  Archived = 'archived',
}

export enum CardTemplateType {
  Definition = 'definition',
  Theorem = 'theorem',
  Formula = 'formula',
  General = 'general',
}

export enum DocumentFileType {
  PDF = 'pdf',
  DOCX = 'docx',
  Image = 'image',
  XLSX = 'xlsx',
  TXT = 'txt',
  MD = 'md',
}

export enum DocumentType {
  Textbook = 'textbook',
  Notes = 'notes',
  Slides = 'slides',
  ProblemSet = 'problem_set',
  Reference = 'reference',
  Other = 'other',
}

export enum DocumentParseStatus {
  Pending = 'pending',
  Parsing = 'parsing',
  Completed = 'completed',
  Failed = 'failed',
}

export enum DocumentParseChannel {
  Native = 'native',
  OCR = 'ocr',
}

export enum AgentMessageRole {
  User = 'user',
  Assistant = 'assistant',
  System = 'system',
  Tool = 'tool',
}

export enum AgentMemoryCategory {
  Preference = 'preference',
  CourseContext = 'course_context',
  Decision = 'decision',
  General = 'general',
}

export enum ProposalType {
  StudyPlan = 'study_plan',
  BatchCards = 'batch_cards',
  ScheduleAdjustment = 'schedule_adjustment',
}

export enum ProposalStatus {
  Pending = 'pending',
  Applied = 'applied',
  Discarded = 'discarded',
}

export enum SourceMaterialStatus {
  Active = 'active',
  Archived = 'archived',
  NeedsReview = 'needs_review',
  Failed = 'failed',
}

export enum SourceFragmentStatus {
  NotStarted = 'not_started',
  Ready = 'ready',
  Failed = 'failed',
  NeedsReview = 'needs_review',
}

export enum MaterialSegmentStatus {
  Proposed = 'proposed',
  Accepted = 'accepted',
  NeedsReview = 'needs_review',
  Discarded = 'discarded',
}

export enum TimeBlockType {
  Study = 'study',
  Sleep = 'sleep',
  Custom = 'custom',
}

export interface ChecklistItem {
  text: string;
  done: boolean;
}

// --- Entity Interfaces ---

export interface User {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  settings: UserSettings;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserSettings {
  skin?: SkinSelection | null;
  theme?: 'dark' | 'light';
  language?: 'en' | 'zh';
  agent_name?: string;
  ai_providers?: Record<string, AIProviderConfig>;
  active_provider?: string;
  daily_status_enabled?: boolean;
  keyboard_shortcuts_enabled?: boolean;
  embedding_provider?: string;
  embedding_model?: string;
}

export interface AIProviderConfig {
  default_model?: string;
  base_url?: string;
}

export interface Course {
  skin?: SkinSelection | null;
  id: string;
  user_id: string;
  name: string;
  code: string | null;
  color: string;
  weight: number;
  description: string | null;
  semester: string | null;
  created_at: string;
  updated_at: string;
}

export interface Goal {
  id: string;
  user_id: string;
  course_id: string;
  title: string;
  description: string | null;
  deadline: string | null;
  exam_mode: boolean;
  status: GoalStatus;
  parent_id: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface RecurringTaskGroup {
  id: string;
  user_id: string;
  goal_id: string | null;
  title: string;
  total_tasks: number;
  completed_tasks: number;
  start_date: string;
  end_date: string;
  created_at: string;
}

export interface Task {
  id: string;
  user_id: string;
  course_id: string;
  goal_id: string | null;
  recurring_group_id: string | null;
  title: string;
  date: string;
  priority: TaskPriority;
  status: TaskStatus;
  completed_at: string | null;
  order_index: number;
  start_time: string | null;
  end_time: string | null;
  description: string | null;
  checklist: ChecklistItem[] | null;
  time_block_id?: string | null;
  serves_must?: string | null;
  exam_boost?: boolean;
  is_prerequisite?: boolean;
  created_at: string;
  updated_at: string;
}

export interface TaskCardLink {
  id: string;
  task_id: string;
  card_id: string;
  checklist_index: number | null;
  created_at: string;
}

export interface CardDeck {
  id: string;
  user_id: string;
  course_id: string;
  name: string;
  description: string | null;
  card_count: number;
  created_at: string;
  updated_at: string;
}

export interface Card {
  id: string;
  user_id: string;
  deck_id: string;
  section_id: string | null;
  template_type: CardTemplateType;
  title: string;
  content: CardContent;
  importance: number;
  order_index: number;
  source_document_id: string | null;
  source_page: number | null;
  source_excerpt: string | null;
  fsrs_stability: number | null;
  fsrs_difficulty: number | null;
  fsrs_last_review: string | null;
  fsrs_next_review: string | null;
  fsrs_reps: number;
  created_at: string;
  updated_at: string;
}

export interface CardSection {
  id: string;
  deck_id: string;
  user_id: string;
  name: string;
  order_index: number;
  created_at: string;
}

export type CardContent =
  | DefinitionContent
  | TheoremContent
  | FormulaContent
  | GeneralContent;

export interface DefinitionContent {
  definition: string;
  example?: string;
  notes?: string;
}

export interface TheoremContent {
  statement: string;
  conditions?: string;
  proof_sketch?: string;
  example?: string;
  notes?: string;
}

export interface FormulaContent {
  formula: string;
  variables?: Record<string, string>;
  applicable_conditions?: string;
  example?: string;
  notes?: string;
}

export interface GeneralContent {
  body: string;
  example?: string;
  notes?: string;
}

export interface TagGroup {
  id: string;
  course_id: string;
  user_id: string;
  name: string;
  order_index: number;
  created_at: string;
  tags?: Tag[];
}

export interface Tag {
  id: string;
  user_id: string;
  name: string;
  is_system: boolean;
  color: string | null;
  tag_group_id?: string;
  created_at: string;
}

export interface CardTag {
  card_id: string;
  tag_id: string;
}

export interface Document {
  id: string;
  user_id: string;
  course_id: string;
  filename: string;
  file_path: string;
  file_type: DocumentFileType;
  file_size: number | null;
  parse_status: DocumentParseStatus;
  parse_channel: DocumentParseChannel | null;
  extracted_text: string | null;
  summary: string | null;
  page_count: number | null;
  document_type: DocumentType | null;
  chunk_count: number;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface DocumentChunk {
  id: string;
  document_id: string;
  chunk_index: number;
  content: string;
  page_start: number | null;
  page_end: number | null;
  heading: string | null;
  created_at: string;
}

export interface AgentConversation {
  id: string;
  user_id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
}

export interface AgentMessage {
  id: string;
  conversation_id: string;
  role: AgentMessageRole;
  content: string;
  tool_calls: unknown | null;
  tool_results: unknown | null;
  token_count: number | null;
  created_at: string;
}

export interface AgentMemory {
  id: string;
  user_id: string;
  category: AgentMemoryCategory;
  content: string;
  source_conversation_id: string | null;
  relevance_score: number;
  created_at: string;
  last_accessed: string | null;
}

export interface DailyStatus {
  id: string;
  user_id: string;
  date: string;
  energy_level: EnergyLevel;
  created_at: string;
}

export interface Proposal {
  id: string;
  user_id: string;
  conversation_id: string | null;
  type: ProposalType;
  status: ProposalStatus;
  data: unknown;
  created_at: string;
  resolved_at: string | null;
}

export interface SourceMaterial {
  id: string;
  user_id: string;
  course_id: string;
  document_id: string;
  source_type: 'document';
  title: string;
  status: SourceMaterialStatus;
  parse_status: DocumentParseStatus;
  fragment_status: SourceFragmentStatus;
  segment_status: 'not_started' | 'proposed' | 'accepted' | 'failed' | 'needs_review';
  proposal_status: 'not_proposed' | 'map_proposed' | 'map_accepted' | 'note_proposed' | 'note_applied';
  used_in_note_count: number;
  confidence: number | null;
  warnings: string[];
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface SourceFragment {
  id: string;
  user_id: string;
  course_id: string;
  source_material_id: string;
  document_id: string;
  document_chunk_id: string | null;
  fragment_type: 'document' | 'chunk' | 'page_range' | 'heading';
  title: string | null;
  content: string;
  page_start: number | null;
  page_end: number | null;
  order_index: number;
  confidence: number | null;
  warnings: string[];
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface MaterialSegment {
  id: string;
  user_id: string;
  course_id: string;
  source_material_id: string | null;
  segment_type: 'document' | 'chunk_group' | 'page_range' | 'heading';
  title: string;
  summary: string | null;
  status: MaterialSegmentStatus;
  order_index: number;
  page_start: number | null;
  page_end: number | null;
  confidence: number | null;
  warnings: string[];
  metadata: Record<string, unknown>;
  accepted_at: string | null;
  created_at: string;
  updated_at: string;
}

// --- v2.1.1 NoteBlock Templates ---

export const NOTE_BLOCK_TAXONOMY_VERSION = 'v2.1.1' as const;

export type NoteBlockSystemType =
  | 'text'
  | 'latex'
  | 'code'
  | 'source_quote'
  | 'task'
  | 'media'
  | 'table';

export type NoteBlockLearningRole =
  | 'note'
  | 'concept'
  | 'definition'
  | 'theorem'
  | 'proof'
  | 'formula'
  | 'example'
  | 'exercise'
  | 'answer'
  | 'warning'
  | 'source';

export type NoteBlockTemplateFieldKind =
  | 'text'
  | 'latex'
  | 'textarea'
  | 'list'
  | 'code'
  | 'checkbox';

export interface NoteBlockTemplateField {
  key: string;
  label: string;
  kind: NoteBlockTemplateFieldKind;
  required?: boolean;
}

export interface NoteBlockTemplateMetadata {
  system_type: NoteBlockSystemType;
  learning_role: NoteBlockLearningRole;
  template_id: string;
  taxonomy_version: typeof NOTE_BLOCK_TAXONOMY_VERSION;
}

export interface NoteBlockMediaMetadata {
  asset_id: string;
  naturalWidth: number;
  naturalHeight: number;
  alt?: string;
}

export interface NoteBlockTemplateDefinition {
  template_id: string;
  label: string;
  system_type: NoteBlockSystemType;
  learning_role: NoteBlockLearningRole;
  description: string;
  fields: NoteBlockTemplateField[];
  default_content: Record<string, unknown>;
  render_hint: string;
  proposal_allowed: boolean;
  source_reference_allowed: boolean;
  legacy_block_type: 'heading' | 'paragraph' | 'definition' | 'theorem' | 'proof' | 'formula' | 'example' | 'exercise' | 'answer' | 'sidenote' | 'media';
}

export const NOTE_BLOCK_TEMPLATES: NoteBlockTemplateDefinition[] = [
  {
    template_id: 'text.paragraph',
    label: 'Paragraph',
    system_type: 'text',
    learning_role: 'note',
    description: 'General note text.',
    fields: [{ key: 'body', label: 'Body', kind: 'textarea', required: true }],
    default_content: { body: '' },
    render_hint: 'paragraph',
    proposal_allowed: true,
    source_reference_allowed: true,
    legacy_block_type: 'paragraph',
  },
  {
    template_id: 'formula.math',
    label: 'Formula',
    system_type: 'latex',
    learning_role: 'formula',
    description: 'A math formula or equation.',
    fields: [
      { key: 'latex_input', label: 'LaTeX input', kind: 'latex', required: true },
      { key: 'formula_name', label: 'Formula name', kind: 'text', required: false },
      { key: 'explanation', label: 'Explanation', kind: 'textarea', required: false },
    ],
    default_content: {
      body: '',
      field_values: {
        latex_input: '',
        formula_name: '',
        explanation: '',
      },
    },
    render_hint: 'formula',
    proposal_allowed: true,
    source_reference_allowed: true,
    legacy_block_type: 'formula',
  },
  {
    template_id: 'code.snippet',
    label: 'Code Snippet',
    system_type: 'code',
    learning_role: 'example',
    description: 'A code example or snippet.',
    fields: [{ key: 'body', label: 'Code', kind: 'code', required: true }],
    default_content: { body: '', language: '' },
    render_hint: 'code',
    proposal_allowed: true,
    source_reference_allowed: true,
    legacy_block_type: 'paragraph',
  },
  {
    template_id: 'media.image',
    label: 'Image',
    system_type: 'media',
    learning_role: 'note',
    description: 'An image backed by a canvas asset.',
    fields: [],
    default_content: {},
    render_hint: 'media',
    proposal_allowed: false,
    source_reference_allowed: false,
    legacy_block_type: 'media',
  },
];

const TEMPLATE_BY_ID = new Map(NOTE_BLOCK_TEMPLATES.map((template) => [template.template_id, template]));

const LEGACY_TEMPLATE_BY_BLOCK_TYPE: Record<string, string> = {
  media: 'media.image',
  paragraph: 'text.paragraph',
  heading: 'text.paragraph',
  definition: 'text.paragraph',
  theorem: 'text.paragraph',
  proof: 'text.paragraph',
  formula: 'formula.math',
  example: 'text.paragraph',
  exercise: 'text.paragraph',
  answer: 'text.paragraph',
  sidenote: 'text.paragraph',
};

export function listNoteBlockTemplates(): NoteBlockTemplateDefinition[] {
  return NOTE_BLOCK_TEMPLATES;
}

export function getNoteBlockTemplate(templateId: string | undefined | null): NoteBlockTemplateDefinition | undefined {
  return templateId ? TEMPLATE_BY_ID.get(templateId) : undefined;
}

export function inferNoteBlockTemplateMetadata(blockType: string | undefined | null): NoteBlockTemplateMetadata {
  const templateId = LEGACY_TEMPLATE_BY_BLOCK_TYPE[String(blockType || '').toLowerCase()] || 'text.paragraph';
  const template = getNoteBlockTemplate(templateId) || NOTE_BLOCK_TEMPLATES[0];
  return {
    system_type: template.system_type,
    learning_role: template.learning_role,
    template_id: template.template_id,
    taxonomy_version: NOTE_BLOCK_TAXONOMY_VERSION,
  };
}

export function normalizeNoteBlockTemplateMetadata(
  metadata: Record<string, unknown> | null | undefined,
  fallbackBlockType?: string | null,
): NoteBlockTemplateMetadata {
  const raw = metadata || {};
  const template = getNoteBlockTemplate(
    typeof raw.template_id === 'string' ? raw.template_id : undefined,
  );
  if (template) {
    return {
      system_type: template.system_type,
      learning_role: template.learning_role,
      template_id: template.template_id,
      taxonomy_version: NOTE_BLOCK_TAXONOMY_VERSION,
    };
  }
  return inferNoteBlockTemplateMetadata(fallbackBlockType);
}

export function mergeNoteBlockTemplateMetadata(
  metadata: Record<string, unknown> | null | undefined,
  fallbackBlockType?: string | null,
): Record<string, unknown> {
  return {
    ...(metadata || {}),
    ...normalizeNoteBlockTemplateMetadata(metadata, fallbackBlockType),
  };
}

export function legacyBlockTypeForTemplate(templateId: string | undefined | null): NoteBlockTemplateDefinition['legacy_block_type'] {
  return getNoteBlockTemplate(templateId)?.legacy_block_type || 'paragraph';
}

export function getNoteBlockTemplateLabel(metadata: Record<string, unknown> | null | undefined, fallbackBlockType?: string | null): string {
  const normalized = normalizeNoteBlockTemplateMetadata(metadata, fallbackBlockType);
  return getNoteBlockTemplate(normalized.template_id)?.label || 'Paragraph';
}

// --- Time Block ---

export interface TimeBlock {
  id: string;
  user_id: string;
  template_id: string | null;    // Source template (for tracing), nullable
  label: string;
  type: string;
  date: string;                  // 'YYYY-MM-DD' — each instance is date-specific
  start_time: string;            // 'HH:MM'
  end_time: string;              // 'HH:MM'
  color: string | null;
  created_at: string;
  updated_at: string;
}

export interface TimeBlockTemplateSet {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface TimeBlockTemplate {
  id: string;
  template_set_id: string;
  user_id: string;
  label: string;
  type: string;
  day_of_week: number;           // 0=Sun, 1=Mon, ..., 6=Sat
  start_time: string;            // 'HH:MM'
  end_time: string;              // 'HH:MM'
  color: string | null;
  created_at: string;
  updated_at: string;
}

export interface GoalDependency {
  id: string;
  goal_id: string;
  depends_on_goal_id: string;
  created_at: string;
}

// --- Time Block Request Types ---

export interface CreateTimeBlockInstanceRequest {
  label: string;
  type?: string;
  date: string;                 // 'YYYY-MM-DD'
  start_time: string;
  end_time: string;
  color?: string;
  template_id?: string;
}

export interface UpdateTimeBlockRequest {
  label?: string;
  type?: string;
  start_time?: string;
  end_time?: string;
  color?: string;
}

export interface ApplyTemplateRequest {
  dates: string[];              // Array of 'YYYY-MM-DD'
  overwrite: boolean;
}

export interface CreateTemplateSetRequest {
  name: string;
}

export interface SaveTemplateItemsRequest {
  items: Array<{
    label: string;
    type?: string;
    day_of_week: number;
    start_time: string;
    end_time: string;
    color?: string;
  }>;
}

export interface CreateGoalDependencyRequest {
  depends_on_goal_id: string;
}

// --- API Request Types ---

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface CreateCourseRequest {
  name: string;
  skin?: SkinSelection | null;
  code?: string;
  color?: string;
  weight?: number;
  description?: string;
  semester?: string;
}

export interface UpdateCourseRequest {
  name?: string;
  skin?: SkinSelection | null;
  code?: string;
  color?: string;
  weight?: number;
  description?: string;
  semester?: string;
}

export interface CreateTaskRequest {
  title: string;
  date: string;
  priority?: TaskPriority;
  course_id: string;
  goal_id?: string;
  recurring_group_id?: string;
  order_index?: number;
  start_time?: string;
  end_time?: string;
  description?: string;
  checklist?: ChecklistItem[];
  time_block_id?: string;
}

export interface UpdateTaskRequest {
  title?: string;
  date?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
  completed_at?: string | null;
  order_index?: number;
  start_time?: string | null;
  end_time?: string | null;
  description?: string | null;
  checklist?: ChecklistItem[] | null;
  time_block_id?: string | null;
}

export interface BatchCreateTasksRequest {
  tasks: CreateTaskRequest[];
}

export interface CreateRecurringTaskRequest {
  title: string;
  course_id: string;
  goal_id?: string;
  priority?: TaskPriority;
  start_date: string;
  end_date: string;
  task_titles: string[];
}

export interface CreateGoalRequest {
  title: string;
  description?: string;
  deadline?: string;
  course_id: string;
  parent_id?: string;
}

export interface UpdateGoalRequest {
  title?: string;
  description?: string;
  deadline?: string;
  status?: GoalStatus;
  parent_id?: string | null;
}

export interface SetDailyStatusRequest {
  energy_level: EnergyLevel;
  date?: string;
}

export interface UpdateSettingsRequest {
  settings: Partial<UserSettings>;
}

// --- API Response Types ---

export interface AuthResponse {
  token: string;
  user: Omit<User, 'password_hash'>;
}

export interface ApiError {
  error: string;
  details?: unknown;
}

export interface DailyBriefResponse {
  date: string;
  tasks: {
    must: Task[];
    recommended: Task[];
    optional: Task[];
  };
  cards_due_count: number;
  recurring_alerts: RecurringTaskAlert[];
  energy_level: EnergyLevel | null;
  time_blocks: TimeBlock[];
  minimum_working_flow: {
    must_tasks_count: number;
    cards_due_count: number;
    exam_mode_active: boolean;
    exam_courses: Array<{
      course_id: string;
      course_name: string;
      goal_title: string;
      deadline: string;
    }>;
  };
}

export interface RecurringTaskAlert {
  group_id: string;
  title: string;
  total_tasks: number;
  completed_tasks: number;
}

export interface RecurringTaskGroupWithProgress extends RecurringTaskGroup {
  progress: {
    completed: number;
    total: number;
  };
}

export interface StudyModeTemplate {
  id: string;
  user_id: string | null;
  name: string;
  slug: string;
  description: string;
  strategy: string;
  is_system: boolean;
  config: Record<string, unknown>;
  created_at: string;
}

export default {
  NOTE_BLOCK_TAXONOMY_VERSION,
  NOTE_BLOCK_TEMPLATES,
  getNoteBlockTemplate,
  getNoteBlockTemplateLabel,
  inferNoteBlockTemplateMetadata,
  legacyBlockTypeForTemplate,
  listNoteBlockTemplates,
  mergeNoteBlockTemplateMetadata,
  normalizeNoteBlockTemplateMetadata,
};
