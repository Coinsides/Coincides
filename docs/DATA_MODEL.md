# Coincides — Data Model

**Version**: 1.0
**Created**: 2026-03-17
**Updated**: 2026-03-18

---

## 1. Entity Relationship Overview

```
┌──────────────────────────────────────────────────────────┐
│                         User                             │
│  (id, email, password_hash, name, settings, created_at)  │
└──────────┬───────────────────────────────────────────────┘
           │ 1:N
           ▼
┌──────────────────────────────────────────────────────────┐
│                        Course                            │
│  (id, user_id, name, code, color, weight, description)   │
└───┬──────────┬──────────┬──────────┬─────────────────────┘
    │ 1:N      │ 1:N      │ 1:N      │ 1:N
    ▼          ▼          ▼          ▼
  Goal     CardDeck   Document   TagGroup
    │          │          │          │
    │ 1:N      │ 1:N      │ 1:N      │ 1:N
    ▼          ▼          ▼          ▼
  Task    CardSection  DocChunk    Tag
    │          │                     │
    │ N:1      │ 1:N                 │ M:N
    ▼          ▼                     ▼
 RecurringGrp Card ────────────── CardTag

Agent System:
  AgentConversation → AgentMessage
  AgentMemory (long-term, vector-indexed)
  Proposal (pending → applied/discarded)

Virtual Tables:
  doc_chunk_vec (sqlite-vec 1024d)
  agent_memory_vec (sqlite-vec 1024d)
  document_chunks_fts (FTS5)
  agent_memories_fts (FTS5)
```

---

## 2. Table Definitions

### 2.1 User

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT (UUID) | PK | Unique user identifier |
| email | TEXT | UNIQUE, NOT NULL | Login email |
| password_hash | TEXT | NOT NULL | Bcrypt hashed password |
| name | TEXT | NOT NULL | Display name |
| settings | JSON | DEFAULT '{}' | User preferences (theme, AI config, embedding config) |
| created_at | DATETIME | NOT NULL | Account creation timestamp |
| updated_at | DATETIME | NOT NULL | Last update timestamp |

`settings` JSON structure:
```json
{
  "theme": "dark",
  "agent_name": "Mr. Zero",
  "anthropicKey": "sk-ant-...",
  "voyageKey": "pa-...",
  "selectedModel": "claude-haiku-4-5-20251001",
  "embeddingProvider": "voyage",
  "daily_status_enabled": true,
  "keyboard_shortcuts_enabled": true
}
```

### 2.2 Course

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT (UUID) | PK | Unique course identifier |
| user_id | TEXT | FK → User.id, NOT NULL | Owner |
| name | TEXT | NOT NULL | Course display name (e.g., "Applied Mathematics") |
| code | TEXT | | Course code (e.g., "AMS231") |
| color | TEXT | DEFAULT '#6366f1' | Course accent color for UI differentiation |
| weight | INTEGER | DEFAULT 2 | Priority: 1=不重要, 2=一般, 3=重要 |
| description | TEXT | | Course description |
| semester | TEXT | | Semester label (e.g., "2026 Spring") |
| created_at | DATETIME | NOT NULL | |
| updated_at | DATETIME | NOT NULL | |

### 2.3 Goal

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT (UUID) | PK | |
| user_id | TEXT | FK → User.id, NOT NULL | |
| course_id | TEXT | FK → Course.id, NOT NULL | Parent course |
| title | TEXT | NOT NULL | Goal name (e.g., "Master Linear Algebra Ch.4-8") |
| description | TEXT | | Detailed description |
| deadline | DATE | | Target completion date (e.g., exam date) |
| exam_mode | INTEGER | DEFAULT 0 | Whether exam mode is active for this goal |
| status | TEXT | DEFAULT 'active' | active / completed / archived |
| created_at | DATETIME | NOT NULL | |
| updated_at | DATETIME | NOT NULL | |

### 2.4 RecurringTaskGroup

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT (UUID) | PK | |
| user_id | TEXT | FK → User.id, NOT NULL | |
| goal_id | TEXT | FK → Goal.id, ON DELETE SET NULL | Optional parent goal |
| title | TEXT | NOT NULL | Group name (e.g., "Read Chapters 4-8") |
| total_tasks | INTEGER | NOT NULL | Total number of sub-tasks |
| completed_tasks | INTEGER | DEFAULT 0 | Completed count |
| start_date | DATE | NOT NULL | First task date |
| end_date | DATE | NOT NULL | Last task date |
| created_at | DATETIME | NOT NULL | |

### 2.5 Task

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT (UUID) | PK | |
| user_id | TEXT | FK → User.id, NOT NULL | |
| course_id | TEXT | FK → Course.id, NOT NULL | Parent course |
| goal_id | TEXT | FK → Goal.id, ON DELETE SET NULL | Optional parent goal |
| recurring_group_id | TEXT | FK → RecurringTaskGroup.id, ON DELETE CASCADE | NULL for one-time tasks |
| title | TEXT | NOT NULL | Task description |
| date | DATE | NOT NULL | Scheduled date |
| priority | TEXT | NOT NULL, DEFAULT 'must' | must / recommended / optional |
| status | TEXT | DEFAULT 'pending' | pending / completed |
| completed_at | DATETIME | | When the task was checked off |
| order_index | INTEGER | DEFAULT 0 | Display order within same date + priority |
| is_prerequisite | INTEGER | DEFAULT 0 | Whether this task is a prerequisite |
| time_block_id | TEXT | FK → time_blocks(id), ON DELETE SET NULL | 关联的 Time Block（v1.5 新增） |
| created_at | DATETIME | NOT NULL | |
| updated_at | DATETIME | NOT NULL | |

**Indexes:**
- `(user_id, date)` — Fast lookup for Daily Brief
- `(user_id, course_id, date)` — Course-filtered calendar
- `(recurring_group_id)` — Progress tracking for recurring tasks
- `(time_block_id)` — 任务按 Block 分组查询

### 2.6 CardDeck

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT (UUID) | PK | |
| user_id | TEXT | FK → User.id, NOT NULL | |
| course_id | TEXT | FK → Course.id, NOT NULL | Parent course |
| name | TEXT | NOT NULL | Deck name (e.g., "AMS231 Theorems") |
| description | TEXT | | |
| card_count | INTEGER | DEFAULT 0 | Cached count |
| created_at | DATETIME | NOT NULL | |
| updated_at | DATETIME | NOT NULL | |

### 2.7 CardSection

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT (UUID) | PK | |
| deck_id | TEXT | FK → CardDeck.id, ON DELETE CASCADE | Parent deck |
| user_id | TEXT | FK → User.id, NOT NULL | |
| name | TEXT | NOT NULL | Section name (e.g., "Chapter 4") |
| order_index | INTEGER | DEFAULT 0 | Display order within deck |
| created_at | DATETIME | NOT NULL | |

**Index:** `(deck_id)`

### 2.8 Card

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT (UUID) | PK | |
| user_id | TEXT | FK → User.id, NOT NULL | |
| deck_id | TEXT | FK → CardDeck.id, NOT NULL | Parent deck |
| section_id | TEXT | FK → CardSection.id, ON DELETE SET NULL | Optional section grouping |
| template_type | TEXT | DEFAULT 'general' | definition / theorem / formula / general |
| title | TEXT | NOT NULL | Card front — displayed in list and flip face |
| content | JSON | NOT NULL | Card back — structured content (see below) |
| importance | INTEGER | DEFAULT 3 | 1-5 scale |
| order_index | INTEGER | DEFAULT 0 | Display order within section/deck |
| source_document_id | TEXT | FK → Document.id, ON DELETE SET NULL | Source document if generated from uploaded material |
| source_page | INTEGER | | Page number in source document |
| source_excerpt | TEXT | | Relevant excerpt from source for context |
| fsrs_stability | REAL | | FSRS: memory stability (S) |
| fsrs_difficulty | REAL | | FSRS: card difficulty (D) |
| fsrs_last_review | DATETIME | | FSRS: last review timestamp |
| fsrs_next_review | DATE | | FSRS: next scheduled review date |
| fsrs_reps | INTEGER | DEFAULT 0 | FSRS: total review count |
| created_at | DATETIME | NOT NULL | |
| updated_at | DATETIME | NOT NULL | |

**`content` JSON structure by template type:**

Definition:
```json
{
  "definition": "A vector space is a set V together with...",
  "example": "R^n with standard addition and scalar multiplication",
  "notes": "Optional additional notes"
}
```

Theorem:
```json
{
  "statement": "\\oint_C \\mathbf{F} \\cdot d\\mathbf{r} = ...",
  "conditions": "C is a positively oriented, piecewise smooth, simple closed curve...",
  "proof_sketch": "Optional proof outline",
  "example": "Optional illustrative example (v1.4+)",
  "notes": "Optional"
}
```

Formula:
```json
{
  "formula": "e^{i\\pi} + 1 = 0",
  "variables": { "e": "Euler's number", "i": "Imaginary unit" },
  "applicable_conditions": "Fundamental relationship in complex analysis",
  "example": "Optional illustrative example (v1.4+)",
  "notes": "Optional"
}
```

General:
```json
{
  "body": "Free-form content with LaTeX support",
  "example": "Optional illustrative example (v1.4+)",
  "notes": "Optional"
}
```

**Indexes:**
- `(deck_id)` — List cards in a deck
- `(user_id, fsrs_next_review)` — Find cards due for review (Daily Brief)

### 2.9 TagGroup

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT (UUID) | PK | |
| course_id | TEXT | FK → Course.id, ON DELETE CASCADE | Parent course |
| user_id | TEXT | FK → User.id, NOT NULL | |
| name | TEXT | NOT NULL | Group name (e.g., "Topic", "Difficulty") |
| order_index | INTEGER | DEFAULT 0 | Display order |
| created_at | DATETIME | NOT NULL | |

**UNIQUE constraint:** `(course_id, name)`
**Index:** `(course_id)`

### 2.10 Tag

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT (UUID) | PK | |
| user_id | TEXT | FK → User.id, NOT NULL | |
| name | TEXT | NOT NULL | Tag name (e.g., "Definition", "Important") |
| is_system | INTEGER | DEFAULT 0 | System tags cannot be deleted |
| color | TEXT | | Optional tag color |
| tag_group_id | TEXT | FK → TagGroup.id, ON DELETE CASCADE | Optional group membership |
| created_at | DATETIME | NOT NULL | |

**UNIQUE constraint:** `(user_id, name)`

### 2.11 CardTag (Junction Table)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| card_id | TEXT | FK → Card.id, NOT NULL | |
| tag_id | TEXT | FK → Tag.id, NOT NULL | |

**PK:** `(card_id, tag_id)`

### 2.12 Document

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT (UUID) | PK | |
| user_id | TEXT | FK → User.id, NOT NULL | |
| course_id | TEXT | FK → Course.id, NOT NULL | Parent course |
| filename | TEXT | NOT NULL | Original filename |
| file_path | TEXT | NOT NULL | Storage path on server |
| file_type | TEXT | NOT NULL | pdf / docx / xlsx / image / txt |
| file_size | INTEGER | | Size in bytes |
| parse_status | TEXT | DEFAULT 'pending' | pending / parsing / completed / failed |
| parse_channel | TEXT | | 'native' or 'vision' (set after auto-detection) |
| extracted_text | TEXT | | Full extracted text (for search, also stores small docs that aren't chunked) |
| summary | TEXT | | AI-generated summary (for Agent context) |
| page_count | INTEGER | | Number of pages |
| document_type | TEXT | | Detected document type |
| chunk_count | INTEGER | DEFAULT 0 | Number of chunks created |
| error_message | TEXT | | Error details if parse_status='failed' |
| created_at | DATETIME | NOT NULL | |
| updated_at | DATETIME | NOT NULL | |

### 2.13 DocumentChunk

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT (UUID) | PK | |
| document_id | TEXT | FK → Document.id, ON DELETE CASCADE | Parent document |
| chunk_index | INTEGER | NOT NULL | Order within document |
| content | TEXT | NOT NULL | Chunk text content |
| page_start | INTEGER | | Start page |
| page_end | INTEGER | | End page |
| heading | TEXT | | Section heading if detected |
| created_at | DATETIME | NOT NULL | |

**Index:** `(document_id)`

### 2.14 AgentConversation

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT (UUID) | PK | |
| user_id | TEXT | FK → User.id, NOT NULL | |
| title | TEXT | | Auto-generated conversation title |
| created_at | DATETIME | NOT NULL | |
| updated_at | DATETIME | NOT NULL | |

### 2.15 AgentMessage

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT (UUID) | PK | |
| conversation_id | TEXT | FK → AgentConversation.id, NOT NULL | |
| role | TEXT | NOT NULL | user / assistant / system / tool |
| content | TEXT | NOT NULL | Message content |
| tool_calls | JSON | | Function calls made by assistant |
| tool_results | JSON | | Results returned from function execution |
| token_count | INTEGER | | Token count for this message |
| created_at | DATETIME | NOT NULL | |

### 2.16 AgentMemory

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT (UUID) | PK | |
| user_id | TEXT | FK → User.id, NOT NULL | |
| category | TEXT | NOT NULL | preference / course_context / decision / general |
| content | TEXT | NOT NULL | The memory content |
| source_conversation_id | TEXT | FK → AgentConversation.id, ON DELETE SET NULL | Where this memory was created |
| relevance_score | REAL | DEFAULT 1.0 | Decayed relevance for retrieval ranking |
| created_at | DATETIME | NOT NULL | |
| last_accessed | DATETIME | | Last time this memory was retrieved |

### 2.17 DailyStatus

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT (UUID) | PK | |
| user_id | TEXT | FK → User.id, NOT NULL | |
| date | DATE | NOT NULL | |
| energy_level | TEXT | NOT NULL | energized / normal / tired |
| created_at | DATETIME | NOT NULL | |

**UNIQUE constraint:** `(user_id, date)`

### 2.18 Proposal

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT (UUID) | PK | |
| user_id | TEXT | FK → User.id, NOT NULL | |
| conversation_id | TEXT | FK → AgentConversation.id, ON DELETE SET NULL | Which conversation generated this |
| type | TEXT | NOT NULL | study_plan / batch_cards / schedule_adjustment |
| status | TEXT | DEFAULT 'pending' | pending / applied / discarded |
| data | JSON | NOT NULL | The proposed changes (tasks, cards, etc.) |
| created_at | DATETIME | NOT NULL | |
| resolved_at | DATETIME | | When applied or discarded |

### 2.19 StudyModeTemplate

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT (UUID) | PK | |
| user_id | TEXT | FK → User.id, ON DELETE CASCADE | NULL for system templates |
| name | TEXT | NOT NULL | Template display name |
| slug | TEXT | NOT NULL | URL-safe identifier |
| description | TEXT | NOT NULL | Short description |
| strategy | TEXT | NOT NULL | Detailed strategy explanation |
| is_system | INTEGER | DEFAULT 0 | System templates cannot be deleted |
| config | JSON | DEFAULT '{}' | Template-specific configuration |
| created_at | DATETIME | NOT NULL | |

**Indexes:**
- `(user_id)` — User's custom templates
- `UNIQUE (slug) WHERE user_id IS NULL` — System template slugs must be unique

**7 System Templates (seeded on DB init):**
Spaced Repetition, Interleaving, Active Recall, Feynman Technique, Pomodoro, Spiral Learning, Mastery-Based

### 2.20 StudyActivityLog

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT (UUID) | PK | |
| user_id | TEXT | FK → User.id, NOT NULL | |
| date | DATE | NOT NULL | Activity date |
| activity_type | TEXT | NOT NULL | Type of activity (review, task_complete, etc.) |
| entity_id | TEXT | | Related entity ID |
| entity_type | TEXT | | Related entity type (card, task, etc.) |
| minutes_spent | INTEGER | DEFAULT 0 | Duration in minutes |
| created_at | DATETIME | NOT NULL | |

**Index:** `(user_id, date)`

### 2.21 TimeBlock (v1.3)

周模板时间块，定义用户每周的学习/睡眠/自定义时段。

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PK | UUID |
| user_id | TEXT | FK → users(id) CASCADE | 所属用户 |
| label | TEXT | NOT NULL | 时间块标签（v1.5.1 起自动等于 type，不再单独设置） |
| type | TEXT | NOT NULL DEFAULT 'custom' | 类型（开放字符串）。内置预设：study / sleep / exercise / entertainment / rest / meal；用户可自定义任意类型。study 保持每天最多 1 个的约束。 |
| day_of_week | INTEGER | NOT NULL (0-6) | 星期几（0=周日） |
| start_time | TEXT | NOT NULL (HH:MM) | 开始时间 |
| end_time | TEXT | NOT NULL (HH:MM) | 结束时间 |
| color | TEXT | | 自定义颜色 |
| created_at | TEXT | DEFAULT now | |
| updated_at | TEXT | DEFAULT now | |

**Index:** `(user_id, day_of_week)`

### 2.22 TimeBlockOverride (v1.3)

单日覆盖，允许用户修改某一天的时间块（不影响周模板）。

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PK | UUID |
| user_id | TEXT | FK → users(id) CASCADE | 所属用户 |
| time_block_id | TEXT | FK → time_blocks(id) CASCADE | 关联的周模板时间块 |
| override_date | TEXT | NOT NULL (YYYY-MM-DD) | 覆盖日期 |
| start_time | TEXT | nullable (null = 当天删除) | 覆盖后开始时间 |
| end_time | TEXT | nullable | 覆盖后结束时间 |
| created_at | TEXT | DEFAULT now | |

**Index:** `(user_id, override_date)`
**Unique:** `(time_block_id, override_date)`

### 2.23 GoalDependency (v1.3)

目标依赖关系（DAG 兼容，v1.3 仅用线性链）。

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PK | UUID |
| goal_id | TEXT | FK → goals(id) CASCADE | 当前目标 |
| depends_on_goal_id | TEXT | FK → goals(id) CASCADE | 前置目标 |
| created_at | TEXT | DEFAULT now | |

**Index:** `(goal_id)`, `(depends_on_goal_id)`
**Unique:** `(goal_id, depends_on_goal_id)`
**环检测:** DFS 深度优先搜索，插入前检查是否会形成环

### 2.24 TaskCard (v1.7)

Task ↔ Card 多对多关联表，支持任务级和 Checklist 条目级关联。

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PK | UUID |
| task_id | TEXT | FK → tasks(id) CASCADE | 关联任务 |
| card_id | TEXT | FK → cards(id) CASCADE | 关联卡片 |
| checklist_index | INTEGER | NULLABLE | checklist 条目索引（0-based），NULL 表示任务级关联 |
| created_at | TEXT | DEFAULT now | |

**Index:** `(task_id)`, `(card_id)`
**Unique:** `(task_id, card_id, checklist_index)`

---

## 3. Virtual Tables

### 3.1 Vector Search Tables (sqlite-vec v0.1.7)

| Table | PK | Vector | Dimension | Purpose |
|-------|-----|--------|-----------|---------|
| doc_chunk_vec | chunk_id TEXT | embedding float[1024] | 1024 | Voyage AI embeddings for document chunks |
| agent_memory_vec | memory_id TEXT | embedding float[1024] | 1024 | Voyage AI embeddings for agent memories |

Created via `vec0` module after `sqliteVec.load(db)`.

### 3.2 FTS5 Full-Text Search Tables

| Table | Content Source | Sync Mode | Indexed Column |
|-------|---------------|-----------|----------------|
| document_chunks_fts | document_chunks | content-sync (triggers) | content |
| agent_memories_fts | agent_memories | content-sync (triggers) | content |

**Sync Triggers (6 total):**
- `document_chunks_ai` / `_ad` / `_au` — INSERT/DELETE/UPDATE sync for document chunks
- `agent_memories_ai` / `_ad` / `_au` — INSERT/DELETE/UPDATE sync for agent memories

On DB init, a `'rebuild'` command backfills the FTS5 index from existing data if counts are mismatched.

---

## 4. System-Seeded Data

On user registration, the following are auto-created:

### Default Tags (is_system = 1)
- Definition
- Theorem
- Formula
- Important
- Exam-relevant

These cannot be deleted but the user can create additional custom tags.

### System Study Templates (7 total, seeded on DB init)
Spaced Repetition, Interleaving, Active Recall, Feynman Technique, Pomodoro, Spiral Learning, Mastery-Based

---

## 5. Key Queries (Performance Considerations)

| Query | Used By | Index Strategy |
|-------|---------|---------------|
| Get all tasks for user on date X | Daily Brief | `(user_id, date)` |
| Get all tasks for user in date range, filtered by course | Calendar | `(user_id, course_id, date)` |
| Get all cards due for review today | Daily Brief, Review Session | `(user_id, fsrs_next_review)` |
| Get all cards in deck, filtered by tag | Card Browser | `(deck_id)` + join on CardTag |
| Get task completion rate for date range | Statistics | `(user_id, status, date)` |
| Semantic search documents | Agent (RAG) | `doc_chunk_vec` KNN via `vec_distance_cosine` |
| FTS5 search document chunks | Agent (fallback) | `document_chunks_fts` MATCH query |
| LIKE keyword search | Agent (last resort) | Sequential scan on `extracted_text` |
| Semantic search memories | Agent | `agent_memory_vec` KNN via `vec_distance_cosine` |
| FTS5 search memories | Agent (fallback) | `agent_memories_fts` MATCH query |
| Three-way hybrid search | Agent | Vector → FTS5 → LIKE, auto-deduplicate by chunk_id/memory_id |
| Unfragmented doc search | Agent | LIKE on `documents.extracted_text` for docs with chunk_count=0 |
