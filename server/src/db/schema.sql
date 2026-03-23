-- Coincides Database Schema — PostgreSQL
-- Converted from SQLite for cloud deployment (v1.8)

-- ============================================================
-- 1. User
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  settings JSONB NOT NULL DEFAULT '{}',
  onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
  exam_mode BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'active',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
  time_block_id TEXT,
  title TEXT NOT NULL,
  description TEXT,
  date TEXT NOT NULL,
  start_time TEXT,
  end_time TEXT,
  priority TEXT NOT NULL DEFAULT 'must',
  status TEXT NOT NULL DEFAULT 'pending',
  completed_at TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  is_prerequisite BOOLEAN NOT NULL DEFAULT FALSE,
  serves_must TEXT,
  checklist TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_card_sections_deck ON card_sections(deck_id);

-- ============================================================
-- 7c. Document (moved before Card due to FK dependency)
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
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_course_id ON documents(course_id);

-- ============================================================
-- 7d. DocumentChunk
-- ============================================================
CREATE TABLE IF NOT EXISTS document_chunks (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  page_start INTEGER,
  page_end INTEGER,
  heading TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_document_chunks_document_id ON document_chunks(document_id);

-- ============================================================
-- 7e. Card
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
  fsrs_stability DOUBLE PRECISION,
  fsrs_difficulty DOUBLE PRECISION,
  fsrs_last_review TEXT,
  fsrs_next_review TEXT,
  fsrs_reps INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
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
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  color TEXT,
  tag_group_id TEXT REFERENCES tag_groups(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
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
-- 10. (Document and DocumentChunk moved to section 7c/7d above)
-- ============================================================

-- ============================================================
-- 11. AgentConversation
-- ============================================================
CREATE TABLE IF NOT EXISTS agent_conversations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
  relevance_score DOUBLE PRECISION NOT NULL DEFAULT 1.0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_accessed TIMESTAMPTZ
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
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
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
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
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
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_study_mode_templates_user ON study_mode_templates(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_study_mode_templates_system_slug ON study_mode_templates(slug) WHERE user_id IS NULL;

-- ============================================================
-- 17. TimeBlock (date-based instances, post migration 013)
-- ============================================================
CREATE TABLE IF NOT EXISTS time_blocks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  template_id TEXT,
  date TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'study',
  label TEXT,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  color TEXT,
  template_set_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_time_blocks_user_date ON time_blocks(user_id, date);

-- ============================================================
-- 18. TimeBlock Template System
-- ============================================================
CREATE TABLE IF NOT EXISTS time_block_template_sets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tb_template_sets_user ON time_block_template_sets(user_id);

CREATE TABLE IF NOT EXISTS time_block_templates (
  id TEXT PRIMARY KEY,
  template_set_id TEXT NOT NULL REFERENCES time_block_template_sets(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL,
  type TEXT NOT NULL DEFAULT 'study',
  label TEXT,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  color TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tb_templates_set ON time_block_templates(template_set_id);

-- ============================================================
-- 19. GoalDependency
-- ============================================================
CREATE TABLE IF NOT EXISTS goal_dependencies (
  id TEXT PRIMARY KEY,
  goal_id TEXT NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  depends_on_goal_id TEXT NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
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
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_study_activity_user_date ON study_activity_log(user_id, date);

-- ============================================================
-- 21. TaskCards (M:N junction, migration 011)
-- ============================================================
CREATE TABLE IF NOT EXISTS task_cards (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  checklist_index INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_cards_task ON task_cards(task_id);
CREATE INDEX IF NOT EXISTS idx_task_cards_card ON task_cards(card_id);

-- ============================================================
-- 22. Migration Tracking
-- ============================================================
CREATE TABLE IF NOT EXISTS db_migrations (
  id TEXT PRIMARY KEY,
  description TEXT NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Full-Text Search (PostgreSQL tsvector approach)
-- ============================================================

-- GIN indexes for full-text search on document_chunks and agent_memories
CREATE INDEX IF NOT EXISTS idx_document_chunks_fts ON document_chunks USING GIN (to_tsvector('english', content));
CREATE INDEX IF NOT EXISTS idx_agent_memories_fts ON agent_memories USING GIN (to_tsvector('english', content));
