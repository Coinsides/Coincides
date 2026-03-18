// ============================================================
// Coincides — Shared Type Definitions
// ============================================================

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
  created_at: string;
  updated_at: string;
}

export interface UserSettings {
  theme?: 'dark' | 'light';
  agent_name?: string;
  ai_providers?: Record<string, AIProviderConfig>;
  active_provider?: string;
  daily_status_enabled?: boolean;
  keyboard_shortcuts_enabled?: boolean;
  embedding_provider?: string;
  embedding_api_key?: string;
  embedding_model?: string;
}

export interface AIProviderConfig {
  api_key?: string;
  default_model?: string;
}

export interface Course {
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
  exam_boost?: boolean;
  is_prerequisite?: boolean;
  created_at: string;
  updated_at: string;
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
  notes?: string;
}

export interface FormulaContent {
  formula: string;
  variables?: Record<string, string>;
  applicable_conditions?: string;
  notes?: string;
}

export interface GeneralContent {
  body: string;
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
  code?: string;
  color?: string;
  weight?: number;
  description?: string;
  semester?: string;
}

export interface UpdateCourseRequest {
  name?: string;
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
  minimum_working_flow: {
    must_tasks_count: number;
    cards_due_count: number;
    estimated_minutes: number;
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
  expected_completed: number;
  days_behind: number;
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
