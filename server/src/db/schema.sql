-- Coincides Database Schema
-- SQLite with WAL mode

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- ============================================================
-- 1. User
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  settings TEXT NOT NULL DEFAULT '{}',
  onboarding_completed INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- 2. Course
-- ============================================================
CREATE TABLE IF NOT EXISTS courses (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT,
  color TEXT NOT NULL DEFAULT '#6366f1',
  weight INTEGER NOT NULL DEFAULT 2,
  description TEXT,
  semester TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_courses_user_id ON courses(user_id);

-- ============================================================
-- 3. Goal
-- ============================================================
CREATE TABLE IF NOT EXISTS goals (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  parent_id TEXT REFERENCES goals(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  deadline TEXT,
  exam_mode INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_course_id ON goals(course_id);
CREATE INDEX IF NOT EXISTS idx_goals_parent_id ON goals(parent_id);

-- ============================================================
-- 4. RecurringTaskGroup
-- ============================================================
CREATE TABLE IF NOT EXISTS recurring_task_groups (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  goal_id TEXT REFERENCES goals(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  total_tasks INTEGER NOT NULL,
  completed_tasks INTEGER NOT NULL DEFAULT 0,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_recurring_task_groups_user_id ON recurring_task_groups(user_id);

-- ============================================================
-- 5. Task
-- ============================================================
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  goal_id TEXT REFERENCES goals(id) ON DELETE SET NULL,
  recurring_group_id TEXT REFERENCES recurring_task_groups(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  date TEXT NOT NULL,
  start_time TEXT,
  end_time TEXT,
  priority TEXT NOT NULL DEFAULT 'must',
  status TEXT NOT NULL DEFAULT 'pending',
  completed_at TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  is_prerequisite INTEGER NOT NULL DEFAULT 0,
  serves_must TEXT,
  checklist TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
-- NOTE: time_block_id column added by migration 009_task_time_block

CREATE INDEX IF NOT EXISTS idx_tasks_user_date ON tasks(user_id, date);
CREATE INDEX IF NOT EXISTS idx_tasks_user_course_date ON tasks(user_id, course_id, date);
CREATE INDEX IF NOT EXISTS idx_tasks_recurring_group ON tasks(recurring_group_id);

-- ============================================================
-- 6. CardDeck
-- ============================================================
CREATE TABLE IF NOT EXISTS card_decks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  card_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_card_decks_user_id ON card_decks(user_id);
CREATE INDEX IF NOT EXISTS idx_card_decks_course_id ON card_decks(course_id);

-- ============================================================
-- 7a. CardSection
-- ============================================================
CREATE TABLE IF NOT EXISTS card_sections (
  id TEXT PRIMARY KEY,
  deck_id TEXT NOT NULL REFERENCES card_decks(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_card_sections_deck ON card_sections(deck_id);

-- ============================================================
-- 7b. Card
-- ============================================================
CREATE TABLE IF NOT EXISTS cards (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  deck_id TEXT NOT NULL REFERENCES card_decks(id) ON DELETE CASCADE,
  section_id TEXT REFERENCES card_sections(id) ON DELETE SET NULL,
  template_type TEXT NOT NULL DEFAULT 'general',
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  importance INTEGER NOT NULL DEFAULT 3,
  order_index INTEGER NOT NULL DEFAULT 0,
  source_document_id TEXT REFERENCES documents(id) ON DELETE SET NULL,
  source_page INTEGER,
  source_excerpt TEXT,
  fsrs_stability REAL,
  fsrs_difficulty REAL,
  fsrs_last_review TEXT,
  fsrs_next_review TEXT,
  fsrs_reps INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_cards_deck_id ON cards(deck_id);
CREATE INDEX IF NOT EXISTS idx_cards_user_fsrs ON cards(user_id, fsrs_next_review);

-- ============================================================
-- 8a. TagGroup
-- ============================================================
CREATE TABLE IF NOT EXISTS tag_groups (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(course_id, name)
);

CREATE INDEX IF NOT EXISTS idx_tag_groups_course ON tag_groups(course_id);

-- ============================================================
-- 8b. Tag
-- ============================================================
CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_system INTEGER NOT NULL DEFAULT 0,
  color TEXT,
  tag_group_id TEXT REFERENCES tag_groups(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, name)
);

CREATE INDEX IF NOT EXISTS idx_tags_user_id ON tags(user_id);

-- ============================================================
-- 9. CardTag (Junction)
-- ============================================================
CREATE TABLE IF NOT EXISTS card_tags (
  card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (card_id, tag_id)
);

-- ============================================================
-- 10. Document
-- ============================================================
CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER,
  parse_status TEXT NOT NULL DEFAULT 'pending',
  parse_channel TEXT,
  extracted_text TEXT,
  summary TEXT,
  page_count INTEGER,
  document_type TEXT,
  chunk_count INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_course_id ON documents(course_id);

-- ============================================================
-- 10b. DocumentChunk
-- ============================================================
CREATE TABLE IF NOT EXISTS document_chunks (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  page_start INTEGER,
  page_end INTEGER,
  heading TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_document_chunks_document_id ON document_chunks(document_id);

-- ============================================================
-- 11. AgentConversation
-- ============================================================
CREATE TABLE IF NOT EXISTS agent_conversations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_agent_conversations_user_id ON agent_conversations(user_id);

-- ============================================================
-- 12. AgentMessage
-- ============================================================
CREATE TABLE IF NOT EXISTS agent_messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES agent_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  tool_calls TEXT,
  tool_results TEXT,
  token_count INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_agent_messages_conversation_id ON agent_messages(conversation_id);

-- ============================================================
-- 13. AgentMemory
-- ============================================================
CREATE TABLE IF NOT EXISTS agent_memories (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  content TEXT NOT NULL,
  source_conversation_id TEXT REFERENCES agent_conversations(id) ON DELETE SET NULL,
  relevance_score REAL NOT NULL DEFAULT 1.0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_accessed TEXT
);

CREATE INDEX IF NOT EXISTS idx_agent_memories_user_id ON agent_memories(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_memories_user_category ON agent_memories(user_id, category);

-- ============================================================
-- 14. DailyStatus
-- ============================================================
CREATE TABLE IF NOT EXISTS daily_statuses (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  energy_level TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_daily_statuses_user_date ON daily_statuses(user_id, date);

-- ============================================================
-- 15. Proposal
-- ============================================================
CREATE TABLE IF NOT EXISTS proposals (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  conversation_id TEXT REFERENCES agent_conversations(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  data TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  resolved_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_proposals_user_id ON proposals(user_id);

-- ============================================================
-- 16. StudyModeTemplate
-- ============================================================
CREATE TABLE IF NOT EXISTS study_mode_templates (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT NOT NULL,
  strategy TEXT NOT NULL,
  is_system INTEGER NOT NULL DEFAULT 0,
  config TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_study_mode_templates_user ON study_mode_templates(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_study_mode_templates_system_slug ON study_mode_templates(slug) WHERE user_id IS NULL;

-- ============================================================
-- 17. TimeBlock + 18. TimeBlockOverride + Templates
-- NOTE: These tables are FULLY managed by migrations 007, 012, 013.
-- schema.sql does NOT create them to avoid conflicts with post-migration state.
-- Migration 007 creates the original time_blocks + time_block_overrides.
-- Migration 012 creates time_block_template_sets + time_block_templates.
-- Migration 013 rebuilds time_blocks as date-based, drops time_block_overrides.
-- ============================================================

-- ============================================================
-- 19. GoalDependency (v1.3)
-- ============================================================
CREATE TABLE IF NOT EXISTS goal_dependencies (
  id TEXT PRIMARY KEY,
  goal_id TEXT NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  depends_on_goal_id TEXT NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(goal_id, depends_on_goal_id)
);

CREATE INDEX IF NOT EXISTS idx_goal_deps_goal ON goal_dependencies(goal_id);
CREATE INDEX IF NOT EXISTS idx_goal_deps_depends ON goal_dependencies(depends_on_goal_id);

-- ============================================================
-- 20. StudyActivityLog
-- ============================================================
CREATE TABLE IF NOT EXISTS study_activity_log (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  activity_type TEXT NOT NULL,
  entity_id TEXT,
  entity_type TEXT,
  minutes_spent INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_study_activity_user_date ON study_activity_log(user_id, date);

-- ============================================================
-- 18. v2 OperationBatch
-- ============================================================
CREATE TABLE IF NOT EXISTS operation_batches (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id TEXT REFERENCES courses(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL DEFAULT 'manual',
  source_id TEXT,
  label TEXT,
  status TEXT NOT NULL DEFAULT 'applied',
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  applied_at DATETIME,
  reverted_at DATETIME
);
CREATE INDEX IF NOT EXISTS idx_operation_batches_user_course ON operation_batches(user_id, course_id);
CREATE INDEX IF NOT EXISTS idx_operation_batches_source ON operation_batches(source_type, source_id);

-- ============================================================
-- 19. v2 Notes
-- ============================================================
CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  source_kind TEXT NOT NULL DEFAULT 'manual',
  page_format TEXT NOT NULL DEFAULT 'flow',
  metadata TEXT NOT NULL DEFAULT '{}',
  operation_batch_id TEXT REFERENCES operation_batches(id) ON DELETE SET NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  trashed_at DATETIME
);
CREATE INDEX IF NOT EXISTS idx_notes_user_course_status ON notes(user_id, course_id, status);
CREATE INDEX IF NOT EXISTS idx_notes_course_updated ON notes(course_id, updated_at);

-- ============================================================
-- 20. v2 NoteBlocks
-- ============================================================
CREATE TABLE IF NOT EXISTS note_blocks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  block_type TEXT NOT NULL,
  title TEXT,
  content_json TEXT NOT NULL DEFAULT '{}',
  plain_text TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  source_kind TEXT NOT NULL DEFAULT 'manual',
  metadata TEXT NOT NULL DEFAULT '{}',
  operation_batch_id TEXT REFERENCES operation_batches(id) ON DELETE SET NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  trashed_at DATETIME
);
CREATE INDEX IF NOT EXISTS idx_note_blocks_user_course_status ON note_blocks(user_id, course_id, status);
CREATE INDEX IF NOT EXISTS idx_note_blocks_course_type ON note_blocks(course_id, block_type);
CREATE INDEX IF NOT EXISTS idx_note_blocks_course_updated ON note_blocks(course_id, updated_at);

CREATE TABLE IF NOT EXISTS note_block_placements (
  id TEXT PRIMARY KEY,
  note_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  block_id TEXT NOT NULL REFERENCES note_blocks(id) ON DELETE CASCADE,
  parent_placement_id TEXT REFERENCES note_block_placements(id) ON DELETE SET NULL,
  order_index INTEGER NOT NULL,
  display_mode TEXT NOT NULL DEFAULT 'default',
  display_overrides_json TEXT NOT NULL DEFAULT '{}',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(note_id, block_id)
);
CREATE INDEX IF NOT EXISTS idx_note_block_placements_note_order ON note_block_placements(note_id, order_index);
CREATE INDEX IF NOT EXISTS idx_note_block_placements_block ON note_block_placements(block_id);

CREATE TABLE IF NOT EXISTS note_block_sources (
  id TEXT PRIMARY KEY,
  block_id TEXT NOT NULL REFERENCES note_blocks(id) ON DELETE CASCADE,
  document_id TEXT REFERENCES documents(id) ON DELETE SET NULL,
  document_chunk_id TEXT REFERENCES document_chunks(id) ON DELETE SET NULL,
  source_page_start INTEGER,
  source_page_end INTEGER,
  source_excerpt TEXT,
  reference_type TEXT NOT NULL DEFAULT 'page',
  confidence REAL,
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_note_block_sources_block ON note_block_sources(block_id);
CREATE INDEX IF NOT EXISTS idx_note_block_sources_document ON note_block_sources(document_id);
CREATE INDEX IF NOT EXISTS idx_note_block_sources_chunk ON note_block_sources(document_chunk_id);

-- ============================================================
-- 21. v2 Projections
-- ============================================================
CREATE TABLE IF NOT EXISTS projections (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  snapshot_json TEXT NOT NULL DEFAULT '{}',
  source_refs_json TEXT NOT NULL DEFAULT '[]',
  source_versions_json TEXT NOT NULL DEFAULT '{}',
  operation_batch_id TEXT REFERENCES operation_batches(id) ON DELETE SET NULL,
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  trashed_at DATETIME
);
CREATE INDEX IF NOT EXISTS idx_projections_user_course_type_status ON projections(user_id, course_id, type, status);
CREATE INDEX IF NOT EXISTS idx_projections_course_updated ON projections(course_id, updated_at);

-- ============================================================
-- 22. v2.1 Course Materials
-- ============================================================
CREATE TABLE IF NOT EXISTS source_materials (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL DEFAULT 'document',
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  parse_status TEXT NOT NULL DEFAULT 'pending',
  fragment_status TEXT NOT NULL DEFAULT 'not_started',
  segment_status TEXT NOT NULL DEFAULT 'not_started',
  proposal_status TEXT NOT NULL DEFAULT 'not_proposed',
  used_in_note_count INTEGER NOT NULL DEFAULT 0,
  confidence REAL,
  warnings_json TEXT NOT NULL DEFAULT '[]',
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, document_id)
);
CREATE INDEX IF NOT EXISTS idx_source_materials_user_course_status ON source_materials(user_id, course_id, status);
CREATE INDEX IF NOT EXISTS idx_source_materials_document ON source_materials(document_id);

CREATE TABLE IF NOT EXISTS source_fragments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  source_material_id TEXT NOT NULL REFERENCES source_materials(id) ON DELETE CASCADE,
  document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  document_chunk_id TEXT REFERENCES document_chunks(id) ON DELETE SET NULL,
  fragment_type TEXT NOT NULL DEFAULT 'chunk',
  title TEXT,
  content TEXT NOT NULL,
  page_start INTEGER,
  page_end INTEGER,
  order_index INTEGER NOT NULL DEFAULT 0,
  confidence REAL,
  warnings_json TEXT NOT NULL DEFAULT '[]',
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_source_fragments_material_order ON source_fragments(source_material_id, order_index);
CREATE INDEX IF NOT EXISTS idx_source_fragments_course ON source_fragments(user_id, course_id);
CREATE INDEX IF NOT EXISTS idx_source_fragments_chunk ON source_fragments(document_chunk_id);

CREATE TABLE IF NOT EXISTS material_segments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  source_material_id TEXT REFERENCES source_materials(id) ON DELETE CASCADE,
  segment_type TEXT NOT NULL DEFAULT 'chunk_group',
  title TEXT NOT NULL,
  summary TEXT,
  status TEXT NOT NULL DEFAULT 'proposed',
  order_index INTEGER NOT NULL DEFAULT 0,
  page_start INTEGER,
  page_end INTEGER,
  confidence REAL,
  warnings_json TEXT NOT NULL DEFAULT '[]',
  metadata TEXT NOT NULL DEFAULT '{}',
  accepted_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_material_segments_course_status_order ON material_segments(user_id, course_id, status, order_index);
CREATE INDEX IF NOT EXISTS idx_material_segments_source_material ON material_segments(source_material_id);

CREATE TABLE IF NOT EXISTS material_segment_fragments (
  segment_id TEXT NOT NULL REFERENCES material_segments(id) ON DELETE CASCADE,
  fragment_id TEXT NOT NULL REFERENCES source_fragments(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (segment_id, fragment_id)
);
CREATE INDEX IF NOT EXISTS idx_material_segment_fragments_fragment ON material_segment_fragments(fragment_id);

-- ============================================================
-- 23. v2.2.1 Reconciliation Evidence Sets
-- ============================================================
CREATE TABLE IF NOT EXISTS evidence_sets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  evidence_kind TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  confidence REAL,
  source_proposal_id TEXT REFERENCES proposals(id) ON DELETE SET NULL,
  source_group_id TEXT,
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_evidence_sets_user_course_status ON evidence_sets(user_id, course_id, status);
CREATE INDEX IF NOT EXISTS idx_evidence_sets_source_proposal ON evidence_sets(source_proposal_id, source_group_id);

CREATE TABLE IF NOT EXISTS evidence_items (
  id TEXT PRIMARY KEY,
  evidence_set_id TEXT NOT NULL REFERENCES evidence_sets(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  source_material_id TEXT REFERENCES source_materials(id) ON DELETE SET NULL,
  source_fragment_id TEXT REFERENCES source_fragments(id) ON DELETE SET NULL,
  material_segment_id TEXT REFERENCES material_segments(id) ON DELETE SET NULL,
  document_id TEXT REFERENCES documents(id) ON DELETE SET NULL,
  document_chunk_id TEXT REFERENCES document_chunks(id) ON DELETE SET NULL,
  page_start INTEGER,
  page_end INTEGER,
  excerpt TEXT,
  reason TEXT,
  confidence REAL,
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_evidence_items_set ON evidence_items(evidence_set_id);
CREATE INDEX IF NOT EXISTS idx_evidence_items_course ON evidence_items(user_id, course_id);
CREATE INDEX IF NOT EXISTS idx_evidence_items_fragment ON evidence_items(source_fragment_id);

CREATE TABLE IF NOT EXISTS material_reconciliation_decisions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  proposal_id TEXT NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  group_id TEXT NOT NULL,
  decision TEXT NOT NULL,
  evidence_set_id TEXT REFERENCES evidence_sets(id) ON DELETE SET NULL,
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(proposal_id, group_id)
);
CREATE INDEX IF NOT EXISTS idx_material_reconciliation_decisions_course ON material_reconciliation_decisions(user_id, course_id);
CREATE INDEX IF NOT EXISTS idx_material_reconciliation_decisions_proposal ON material_reconciliation_decisions(proposal_id);

-- ============================================================
-- 24. v2.2.2 Reconciliation Safety
-- ============================================================
CREATE TABLE IF NOT EXISTS excluded_material_scopes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  scope_type TEXT NOT NULL,
  source_material_id TEXT REFERENCES source_materials(id) ON DELETE SET NULL,
  source_fragment_id TEXT REFERENCES source_fragments(id) ON DELETE SET NULL,
  material_segment_id TEXT REFERENCES material_segments(id) ON DELETE SET NULL,
  evidence_set_id TEXT REFERENCES evidence_sets(id) ON DELETE SET NULL,
  proposal_id TEXT REFERENCES proposals(id) ON DELETE SET NULL,
  group_id TEXT,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  source_proposal_id TEXT REFERENCES proposals(id) ON DELETE SET NULL,
  source_decision_id TEXT REFERENCES material_reconciliation_decisions(id) ON DELETE SET NULL,
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_excluded_material_scopes_course_status ON excluded_material_scopes(user_id, course_id, status);
CREATE INDEX IF NOT EXISTS idx_excluded_material_scopes_source ON excluded_material_scopes(source_proposal_id, group_id);

CREATE TABLE IF NOT EXISTS conflict_review_items (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  proposal_id TEXT REFERENCES proposals(id) ON DELETE SET NULL,
  group_id TEXT,
  evidence_set_id TEXT REFERENCES evidence_sets(id) ON DELETE SET NULL,
  conflict_kind TEXT NOT NULL DEFAULT 'other',
  status TEXT NOT NULL DEFAULT 'open',
  title TEXT NOT NULL,
  summary TEXT,
  severity TEXT NOT NULL DEFAULT 'medium',
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_conflict_review_items_course_status ON conflict_review_items(user_id, course_id, status);
CREATE INDEX IF NOT EXISTS idx_conflict_review_items_source ON conflict_review_items(proposal_id, group_id);

CREATE TABLE IF NOT EXISTS reconciliation_recovery_events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  previous_status TEXT,
  next_status TEXT,
  reason TEXT,
  operation_batch_id TEXT REFERENCES operation_batches(id) ON DELETE SET NULL,
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_reconciliation_recovery_events_course ON reconciliation_recovery_events(user_id, course_id, created_at);
CREATE INDEX IF NOT EXISTS idx_reconciliation_recovery_events_target ON reconciliation_recovery_events(target_type, target_id);

CREATE TABLE IF NOT EXISTS source_snapshots (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  source_material_id TEXT REFERENCES source_materials(id) ON DELETE CASCADE,
  document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  snapshot_kind TEXT NOT NULL DEFAULT 'parsed_pages',
  status TEXT NOT NULL DEFAULT 'ready',
  title TEXT NOT NULL,
  source_filename TEXT NOT NULL,
  page_count INTEGER,
  chunk_count INTEGER NOT NULL DEFAULT 0,
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_source_snapshots_material_unique ON source_snapshots(user_id, source_material_id);
CREATE INDEX IF NOT EXISTS idx_source_snapshots_course_status ON source_snapshots(user_id, course_id, status);
CREATE INDEX IF NOT EXISTS idx_source_snapshots_document ON source_snapshots(document_id);

CREATE TABLE IF NOT EXISTS source_snapshot_pages (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  source_snapshot_id TEXT NOT NULL REFERENCES source_snapshots(id) ON DELETE CASCADE,
  document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  page_number INTEGER NOT NULL,
  page_label TEXT,
  text_content TEXT NOT NULL,
  chunk_ids TEXT NOT NULL DEFAULT '[]',
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_source_snapshot_pages_snapshot_page ON source_snapshot_pages(source_snapshot_id, page_number);
CREATE INDEX IF NOT EXISTS idx_source_snapshot_pages_course ON source_snapshot_pages(user_id, course_id);

-- ============================================================
-- 26. v2.3.1 Source Anchors
-- ============================================================
CREATE TABLE IF NOT EXISTS source_anchors (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  source_snapshot_id TEXT NOT NULL REFERENCES source_snapshots(id) ON DELETE CASCADE,
  source_snapshot_page_id TEXT REFERENCES source_snapshot_pages(id) ON DELETE SET NULL,
  document_id TEXT REFERENCES documents(id) ON DELETE SET NULL,
  document_chunk_id TEXT REFERENCES document_chunks(id) ON DELETE SET NULL,
  source_material_id TEXT REFERENCES source_materials(id) ON DELETE SET NULL,
  source_fragment_id TEXT REFERENCES source_fragments(id) ON DELETE SET NULL,
  material_segment_id TEXT REFERENCES material_segments(id) ON DELETE SET NULL,
  anchor_kind TEXT NOT NULL,
  page_start INTEGER,
  page_end INTEGER,
  text_start_offset INTEGER,
  text_end_offset INTEGER,
  status TEXT NOT NULL DEFAULT 'active',
  confidence REAL,
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_source_anchors_course_status ON source_anchors(user_id, course_id, status);
CREATE INDEX IF NOT EXISTS idx_source_anchors_snapshot_page ON source_anchors(source_snapshot_id, page_start, page_end);
CREATE INDEX IF NOT EXISTS idx_source_anchors_document_chunk ON source_anchors(document_id, document_chunk_id);

CREATE TABLE IF NOT EXISTS source_anchor_links (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  source_anchor_id TEXT NOT NULL REFERENCES source_anchors(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  link_role TEXT NOT NULL DEFAULT 'source',
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(source_anchor_id, target_type, target_id)
);
CREATE INDEX IF NOT EXISTS idx_source_anchor_links_target ON source_anchor_links(user_id, course_id, target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_source_anchor_links_anchor ON source_anchor_links(source_anchor_id);

-- ============================================================
-- 27. v2.3.2 Source Scopes
-- ============================================================
CREATE TABLE IF NOT EXISTS source_scopes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  source_snapshot_id TEXT REFERENCES source_snapshots(id) ON DELETE CASCADE,
  source_snapshot_page_id TEXT REFERENCES source_snapshot_pages(id) ON DELETE SET NULL,
  source_anchor_id TEXT REFERENCES source_anchors(id) ON DELETE SET NULL,
  source_material_id TEXT REFERENCES source_materials(id) ON DELETE SET NULL,
  source_fragment_id TEXT REFERENCES source_fragments(id) ON DELETE SET NULL,
  material_segment_id TEXT REFERENCES material_segments(id) ON DELETE SET NULL,
  document_id TEXT REFERENCES documents(id) ON DELETE SET NULL,
  document_chunk_id TEXT REFERENCES document_chunks(id) ON DELETE SET NULL,
  scope_kind TEXT NOT NULL,
  label TEXT NOT NULL,
  page_start INTEGER,
  page_end INTEGER,
  text_start_offset INTEGER,
  text_end_offset INTEGER,
  status TEXT NOT NULL DEFAULT 'active',
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_source_scopes_course_status ON source_scopes(user_id, course_id, status);
CREATE INDEX IF NOT EXISTS idx_source_scopes_snapshot_page ON source_scopes(source_snapshot_id, page_start, page_end);
CREATE INDEX IF NOT EXISTS idx_source_scopes_anchor ON source_scopes(source_anchor_id);
CREATE INDEX IF NOT EXISTS idx_source_scopes_material ON source_scopes(source_material_id);
CREATE INDEX IF NOT EXISTS idx_source_scopes_segment ON source_scopes(material_segment_id);

-- ============================================================
-- 28. v2.3.3 Source Boards
-- ============================================================
CREATE TABLE IF NOT EXISTS source_boards (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_source_boards_course_status ON source_boards(user_id, course_id, status);

CREATE TABLE IF NOT EXISTS source_board_nodes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  source_board_id TEXT NOT NULL REFERENCES source_boards(id) ON DELETE CASCADE,
  node_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  source_scope_id TEXT REFERENCES source_scopes(id) ON DELETE SET NULL,
  source_anchor_id TEXT REFERENCES source_anchors(id) ON DELETE SET NULL,
  source_material_id TEXT REFERENCES source_materials(id) ON DELETE SET NULL,
  material_segment_id TEXT REFERENCES material_segments(id) ON DELETE SET NULL,
  evidence_set_id TEXT REFERENCES evidence_sets(id) ON DELETE SET NULL,
  note_block_id TEXT REFERENCES note_blocks(id) ON DELETE SET NULL,
  proposal_id TEXT REFERENCES proposals(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  summary TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  order_index INTEGER NOT NULL DEFAULT 0,
  layout_x REAL,
  layout_y REAL,
  layout_width REAL,
  layout_height REAL,
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_source_board_nodes_board_status ON source_board_nodes(source_board_id, status, order_index);
CREATE INDEX IF NOT EXISTS idx_source_board_nodes_target ON source_board_nodes(user_id, course_id, node_type, target_id);
CREATE INDEX IF NOT EXISTS idx_source_board_nodes_scope ON source_board_nodes(source_scope_id);
CREATE INDEX IF NOT EXISTS idx_source_board_nodes_anchor ON source_board_nodes(source_anchor_id);

-- ============================================================
-- 29. v2.4.0 Learning Canvas
-- ============================================================
CREATE TABLE IF NOT EXISTS learning_canvases (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  canvas_kind TEXT NOT NULL DEFAULT 'finite',
  preset TEXT NOT NULL DEFAULT 'page',
  page_size TEXT NOT NULL DEFAULT 'a4',
  orientation TEXT NOT NULL DEFAULT 'portrait',
  width REAL NOT NULL DEFAULT 794,
  height REAL NOT NULL DEFAULT 1123,
  background_style TEXT NOT NULL DEFAULT 'plain',
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_learning_canvases_course_status ON learning_canvases(user_id, course_id, status);

CREATE TABLE IF NOT EXISTS canvas_nodes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  canvas_id TEXT NOT NULL REFERENCES learning_canvases(id) ON DELETE CASCADE,
  node_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  note_block_id TEXT REFERENCES note_blocks(id) ON DELETE SET NULL,
  source_scope_id TEXT REFERENCES source_scopes(id) ON DELETE SET NULL,
  source_anchor_id TEXT REFERENCES source_anchors(id) ON DELETE SET NULL,
  source_board_node_id TEXT REFERENCES source_board_nodes(id) ON DELETE SET NULL,
  source_material_id TEXT REFERENCES source_materials(id) ON DELETE SET NULL,
  material_segment_id TEXT REFERENCES material_segments(id) ON DELETE SET NULL,
  evidence_set_id TEXT REFERENCES evidence_sets(id) ON DELETE SET NULL,
  proposal_id TEXT REFERENCES proposals(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  summary TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  x REAL NOT NULL DEFAULT 0,
  y REAL NOT NULL DEFAULT 0,
  width REAL NOT NULL DEFAULT 280,
  height REAL NOT NULL DEFAULT 160,
  z_index INTEGER NOT NULL DEFAULT 0,
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_canvas_nodes_canvas_status ON canvas_nodes(canvas_id, status, z_index);
CREATE INDEX IF NOT EXISTS idx_canvas_nodes_target ON canvas_nodes(user_id, course_id, node_type, target_id);
CREATE INDEX IF NOT EXISTS idx_canvas_nodes_scope ON canvas_nodes(source_scope_id);
CREATE INDEX IF NOT EXISTS idx_canvas_nodes_anchor ON canvas_nodes(source_anchor_id);
CREATE INDEX IF NOT EXISTS idx_canvas_nodes_board_node ON canvas_nodes(source_board_node_id);

CREATE TABLE IF NOT EXISTS canvas_frames (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  canvas_id TEXT NOT NULL REFERENCES learning_canvases(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  x REAL NOT NULL DEFAULT 0,
  y REAL NOT NULL DEFAULT 0,
  width REAL NOT NULL DEFAULT 640,
  height REAL NOT NULL DEFAULT 480,
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_canvas_frames_canvas_status ON canvas_frames(canvas_id, status);

CREATE TABLE IF NOT EXISTS canvas_viewport_states (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  canvas_id TEXT NOT NULL REFERENCES learning_canvases(id) ON DELETE CASCADE,
  viewport_x REAL NOT NULL DEFAULT 0,
  viewport_y REAL NOT NULL DEFAULT 0,
  zoom REAL NOT NULL DEFAULT 1,
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, canvas_id)
);
CREATE INDEX IF NOT EXISTS idx_canvas_viewport_states_canvas ON canvas_viewport_states(canvas_id, user_id);

-- ============================================================
-- 30. V2.BN.11 Item Identity And Relation Truth Floor
-- ============================================================
CREATE TABLE IF NOT EXISTS items (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body_json TEXT NOT NULL DEFAULT '{}',
  plain_text TEXT NOT NULL,
  item_type TEXT,
  topic TEXT,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'retired')),
  retired_into_item_id TEXT REFERENCES items(id) ON DELETE SET NULL,
  origin_course_id TEXT REFERENCES courses(id) ON DELETE SET NULL,
  origin_note_id TEXT REFERENCES notes(id) ON DELETE SET NULL,
  created_by TEXT NOT NULL DEFAULT 'user',
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_items_user_status_updated
  ON items(user_id, status, updated_at);
CREATE INDEX IF NOT EXISTS idx_items_origin_course
  ON items(user_id, origin_course_id);
CREATE INDEX IF NOT EXISTS idx_items_origin_note
  ON items(user_id, origin_note_id);
CREATE INDEX IF NOT EXISTS idx_items_retired_into
  ON items(retired_into_item_id);

CREATE TABLE IF NOT EXISTS item_snapshots (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(item_id, content_hash),
  UNIQUE(item_id, id)
);
CREATE INDEX IF NOT EXISTS idx_item_snapshots_user_item_created
  ON item_snapshots(user_id, item_id, created_at);

CREATE TABLE IF NOT EXISTS item_anchors (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_id TEXT REFERENCES items(id) ON DELETE CASCADE,
  pool_scope_kind TEXT,
  pool_scope_id TEXT,
  target_kind TEXT NOT NULL,
  target_id TEXT NOT NULL,
  range_json TEXT,
  excerpt TEXT NOT NULL,
  reference_mode TEXT NOT NULL DEFAULT 'quote',
  source_record_id TEXT REFERENCES source_records(id) ON DELETE SET NULL,
  collected_for TEXT,
  claimed_at TEXT,
  claimed_by TEXT,
  metadata TEXT NOT NULL DEFAULT '{}',
  created_by TEXT NOT NULL DEFAULT 'user',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CHECK (
    (item_id IS NOT NULL AND pool_scope_kind IS NULL AND pool_scope_id IS NULL)
    OR
    (item_id IS NULL AND pool_scope_kind IS NOT NULL AND pool_scope_id IS NOT NULL)
  )
);
CREATE INDEX IF NOT EXISTS idx_item_anchors_user_item
  ON item_anchors(user_id, item_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_item_anchors_pool
  ON item_anchors(user_id, pool_scope_kind, pool_scope_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_item_anchors_target
  ON item_anchors(user_id, target_kind, target_id);
CREATE INDEX IF NOT EXISTS idx_item_anchors_source_record
  ON item_anchors(source_record_id);

CREATE TABLE IF NOT EXISTS relations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  from_item_id TEXT NOT NULL REFERENCES items(id),
  to_item_id TEXT NOT NULL REFERENCES items(id),
  relation_type TEXT NOT NULL,
  directionality TEXT NOT NULL DEFAULT 'directed'
    CHECK (directionality IN ('directed', 'undirected')),
  from_snapshot_id TEXT NOT NULL REFERENCES item_snapshots(id),
  to_snapshot_id TEXT NOT NULL REFERENCES item_snapshots(id),
  note TEXT,
  created_by TEXT NOT NULL DEFAULT 'user',
  origin_purpose_id TEXT REFERENCES purposes(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'revoked')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  affirmed_at TEXT NOT NULL,
  CHECK (from_item_id != to_item_id),
  CHECK (directionality = 'directed' OR from_item_id < to_item_id),
  FOREIGN KEY (from_item_id, from_snapshot_id)
    REFERENCES item_snapshots(item_id, id),
  FOREIGN KEY (to_item_id, to_snapshot_id)
    REFERENCES item_snapshots(item_id, id)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_relations_active
  ON relations(from_item_id, to_item_id, relation_type)
  WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_relations_user_from_status
  ON relations(user_id, from_item_id, status, updated_at);
CREATE INDEX IF NOT EXISTS idx_relations_user_to_status
  ON relations(user_id, to_item_id, status, updated_at);
CREATE INDEX IF NOT EXISTS idx_relations_origin_purpose
  ON relations(origin_purpose_id);

CREATE TABLE IF NOT EXISTS relation_assessments (
  id TEXT PRIMARY KEY,
  relation_id TEXT NOT NULL REFERENCES relations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  verdict TEXT NOT NULL
    CHECK (verdict IN ('still_holds', 'questionable')),
  model_key TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_relation_assessments_relation_created
  ON relation_assessments(relation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_relation_assessments_user_created
  ON relation_assessments(user_id, created_at);

-- ============================================================
-- 30.1 V2.BN.8.7.1 ContentGroup Root Entity
-- ============================================================
CREATE TABLE IF NOT EXISTS content_groups (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  note_id TEXT REFERENCES notes(id) ON DELETE SET NULL,
  canvas_id TEXT,
  primary_folder_id TEXT,
  parent_group_id TEXT REFERENCES content_groups(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_by TEXT NOT NULL DEFAULT 'human',

  identity_status TEXT NOT NULL DEFAULT 'none',
  identity_role TEXT,
  identity_topic TEXT,
  identity_summary TEXT,
  identity_created_by TEXT NOT NULL DEFAULT 'human',
  identity_reviewed_by TEXT,
  identity_confidence REAL,
  identity_updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  identity_accepted_at DATETIME,
  identity_metadata TEXT NOT NULL DEFAULT '{}',

  placements_json TEXT NOT NULL DEFAULT '[]',
  members_json TEXT NOT NULL DEFAULT '[]',
  fragments_json TEXT NOT NULL DEFAULT '[]',
  petals_json TEXT NOT NULL DEFAULT '[]',
  view_state_json TEXT NOT NULL DEFAULT '{}',
  metadata TEXT NOT NULL DEFAULT '{}',

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_content_groups_course_note_status
  ON content_groups(user_id, course_id, note_id, status);
CREATE INDEX IF NOT EXISTS idx_content_groups_course_updated
  ON content_groups(user_id, course_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_content_groups_identity
  ON content_groups(user_id, course_id, identity_status, status);
CREATE INDEX IF NOT EXISTS idx_content_groups_primary_folder
  ON content_groups(user_id, course_id, primary_folder_id, status);
CREATE INDEX IF NOT EXISTS idx_content_groups_parent
  ON content_groups(parent_group_id);

CREATE TABLE IF NOT EXISTS content_group_members (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content_group_id TEXT NOT NULL REFERENCES content_groups(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  note_id TEXT REFERENCES notes(id) ON DELETE SET NULL,

  kind TEXT NOT NULL,
  target_id TEXT,
  item_id TEXT REFERENCES items(id),
  label TEXT,

  current_content TEXT,
  preview_text TEXT,

  content_range_json TEXT,
  source_ref_json TEXT,
  source_sync_status TEXT NOT NULL DEFAULT 'fresh',

  order_index INTEGER NOT NULL DEFAULT 0,
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CHECK (
    (kind = 'item' AND item_id IS NOT NULL AND target_id IS NULL)
    OR
    (kind != 'item' AND item_id IS NULL)
  )
);
CREATE INDEX IF NOT EXISTS idx_content_group_members_group_order
  ON content_group_members(user_id, content_group_id, order_index);
CREATE INDEX IF NOT EXISTS idx_content_group_members_course_note
  ON content_group_members(user_id, course_id, note_id);
CREATE INDEX IF NOT EXISTS idx_content_group_members_target
  ON content_group_members(user_id, kind, target_id);
CREATE INDEX IF NOT EXISTS idx_content_group_members_source_status
  ON content_group_members(user_id, source_sync_status);

CREATE TABLE IF NOT EXISTS group_folders (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id TEXT REFERENCES courses(id) ON DELETE CASCADE,
  note_id TEXT REFERENCES notes(id) ON DELETE CASCADE,
  parent_folder_id TEXT REFERENCES group_folders(id) ON DELETE SET NULL,

  scope_kind TEXT NOT NULL DEFAULT 'note',
  scope_project_id TEXT,
  scope_note_id TEXT,
  scope_label TEXT,

  title TEXT NOT NULL,
  origin TEXT NOT NULL DEFAULT 'user',
  system_root INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  order_index INTEGER NOT NULL DEFAULT 0,
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_group_folders_user_scope
  ON group_folders(user_id, scope_kind, scope_project_id, scope_note_id, status);
CREATE INDEX IF NOT EXISTS idx_group_folders_course_note
  ON group_folders(user_id, course_id, note_id, status);
CREATE INDEX IF NOT EXISTS idx_group_folders_parent
  ON group_folders(user_id, parent_folder_id, status);
CREATE INDEX IF NOT EXISTS idx_group_folders_order
  ON group_folders(user_id, parent_folder_id, order_index, title);

CREATE TABLE IF NOT EXISTS content_group_folder_placements (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content_group_id TEXT NOT NULL REFERENCES content_groups(id) ON DELETE CASCADE,
  folder_id TEXT NOT NULL REFERENCES group_folders(id) ON DELETE CASCADE,
  placement_role TEXT NOT NULL DEFAULT 'primary',
  status TEXT NOT NULL DEFAULT 'active',
  order_index INTEGER NOT NULL DEFAULT 0,
  added_by TEXT NOT NULL DEFAULT 'human',
  added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  metadata TEXT NOT NULL DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS idx_cg_folder_placements_folder
  ON content_group_folder_placements(user_id, folder_id, status, order_index);
CREATE INDEX IF NOT EXISTS idx_cg_folder_placements_group
  ON content_group_folder_placements(user_id, content_group_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_cg_folder_placements_one_primary
  ON content_group_folder_placements(user_id, content_group_id)
  WHERE placement_role = 'primary' AND status = 'active';

-- ============================================================
-- 31. v2.5.0 Template Definition Runtime
-- ============================================================
CREATE TABLE IF NOT EXISTS template_definitions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  template_key TEXT NOT NULL,
  version TEXT NOT NULL DEFAULT '1.0.0',
  origin TEXT NOT NULL DEFAULT 'system_seed',
  scope_type TEXT NOT NULL DEFAULT 'global',
  scope_id TEXT NOT NULL DEFAULT '',
  label TEXT NOT NULL,
  description TEXT,
  system_type TEXT NOT NULL,
  learning_role TEXT NOT NULL,
  legacy_block_type TEXT NOT NULL,
  field_schema TEXT NOT NULL DEFAULT '[]',
  default_content TEXT NOT NULL DEFAULT '{}',
  render_hints TEXT NOT NULL DEFAULT '{}',
  source_behavior TEXT NOT NULL DEFAULT '{}',
  relation_behavior TEXT NOT NULL DEFAULT '{}',
  proposal_behavior TEXT NOT NULL DEFAULT '{}',
  summary_for_agent TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active',
  is_system INTEGER NOT NULL DEFAULT 0,
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, template_key, version, scope_type, scope_id)
);
CREATE INDEX IF NOT EXISTS idx_template_definitions_user_status ON template_definitions(user_id, status, template_key);
CREATE INDEX IF NOT EXISTS idx_template_definitions_lookup ON template_definitions(user_id, template_key, version, scope_type, scope_id);
CREATE INDEX IF NOT EXISTS idx_template_definitions_taxonomy ON template_definitions(user_id, system_type, learning_role, status);

-- ============================================================
-- V13.2 events ledger (migration 054)
-- Identity values are historical references, without cascading foreign keys.
-- Append-only triggers are installed by migration 054 after this base schema.
-- Do not put trigger bodies here: initDb splits this file on semicolons.
-- ============================================================
CREATE TABLE IF NOT EXISTS events (
  seq INTEGER PRIMARY KEY AUTOINCREMENT,
  ts TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  user_id TEXT NOT NULL,
  actor_kind TEXT NOT NULL,
  channel TEXT NOT NULL,
  verb TEXT NOT NULL CHECK (verb IN (
    'migrated', 'rolled_back', 'note_created', 'board_created',
    'mounted', 'unmounted', 'purpose_created', 'purpose_amended',
    'purpose_sealed', 'proposal_issued', 'proposal_approved',
    'proposal_rejected', 'published'
  )),
  objects TEXT NOT NULL CHECK (json_valid(objects) AND json_type(objects) = 'array'),
  summary TEXT NOT NULL,
  meta TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(meta))
);
CREATE INDEX IF NOT EXISTS idx_events_user_ts ON events(user_id, ts);
CREATE INDEX IF NOT EXISTS idx_events_verb ON events(verb);
