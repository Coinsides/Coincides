# Coincides — Data Model

**Version**: 0.1 (Draft)
**Created**: 2026-03-17

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
│  (id, user_id, name, code, color, weight, created_at)    │
└───┬──────────┬──────────┬──────────┬─────────────────────┘
    │ 1:N      │ 1:N      │ 1:N      │ 1:N
    ▼          ▼          ▼          ▼
  Goal     CardDeck   Document   Statistics
    │          │
    │ 1:N      │ 1:N
    ▼          ▼
  Task       Card ──── CardTag (M:N)
    │
    │ N:1 (optional)
    ▼
RecurringTaskGroup
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
| settings | JSON | DEFAULT '{}' | User preferences (theme, agent name, AI provider config) |
| created_at | DATETIME | NOT NULL | Account creation timestamp |
| updated_at | DATETIME | NOT NULL | Last update timestamp |

`settings` JSON structure:
```json
{
  "theme": "dark",
  "agent_name": "Mr. Zero",
  "ai_providers": {
    "openai": { "api_key": "encrypted_...", "default_model": "gpt-5.4" },
    "anthropic": { "api_key": "encrypted_...", "default_model": "claude-opus" }
  },
  "active_provider": "openai",
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
| weight | INTEGER | DEFAULT 5 | Priority weight 1-10 (used in cross-course arbitration) |
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
| exam_mode | BOOLEAN | DEFAULT FALSE | Whether exam mode is active for this goal |
| status | TEXT | DEFAULT 'active' | active / completed / archived |
| created_at | DATETIME | NOT NULL | |
| updated_at | DATETIME | NOT NULL | |

### 2.4 RecurringTaskGroup

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT (UUID) | PK | |
| user_id | TEXT | FK → User.id, NOT NULL | |
| goal_id | TEXT | FK → Goal.id | Optional parent goal |
| title | TEXT | NOT NULL | Group name (e.g., "Read Chapters 4-8") |
| total_tasks | INTEGER | NOT NULL | Total number of sub-tasks |
| completed_tasks | INTEGER | DEFAULT 0 | Completed count (derived, or cached) |
| start_date | DATE | NOT NULL | First task date |
| end_date | DATE | NOT NULL | Last task date |
| created_at | DATETIME | NOT NULL | |

### 2.5 Task

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT (UUID) | PK | |
| user_id | TEXT | FK → User.id, NOT NULL | |
| course_id | TEXT | FK → Course.id, NOT NULL | Parent course |
| goal_id | TEXT | FK → Goal.id | Optional parent goal |
| recurring_group_id | TEXT | FK → RecurringTaskGroup.id | NULL for one-time tasks |
| title | TEXT | NOT NULL | Task description |
| date | DATE | NOT NULL | Scheduled date |
| priority | TEXT | NOT NULL, DEFAULT 'must' | must / recommended / optional |
| status | TEXT | DEFAULT 'pending' | pending / completed |
| completed_at | DATETIME | | When the task was checked off |
| order_index | INTEGER | DEFAULT 0 | Display order within same date + priority |
| created_at | DATETIME | NOT NULL | |
| updated_at | DATETIME | NOT NULL | |

**Indexes:**
- `(user_id, date)` — Fast lookup for Daily Brief
- `(user_id, course_id, date)` — Course-filtered calendar
- `(recurring_group_id)` — Progress tracking for recurring tasks

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

### 2.7 Card

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT (UUID) | PK | |
| user_id | TEXT | FK → User.id, NOT NULL | |
| deck_id | TEXT | FK → CardDeck.id, NOT NULL | Parent deck |
| template_type | TEXT | DEFAULT 'general' | definition / theorem / formula / general |
| title | TEXT | NOT NULL | Card front — displayed in list and flip face |
| content | JSON | NOT NULL | Card back — structured content (see below) |
| importance | INTEGER | DEFAULT 3 | 1-5 scale |
| source_document_id | TEXT | FK → Document.id | Source document if generated from uploaded material |
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
  "statement": "\\oint_C \\mathbf{F} \\cdot d\\mathbf{r} = \\iint_D \\left( \\frac{\\partial Q}{\\partial x} - \\frac{\\partial P}{\\partial y} \\right) dA",
  "conditions": "C is a positively oriented, piecewise smooth, simple closed curve...",
  "proof_sketch": "Optional proof outline",
  "notes": "Optional"
}
```

Formula:
```json
{
  "formula": "e^{i\\pi} + 1 = 0",
  "variables": {
    "e": "Euler's number",
    "i": "Imaginary unit",
    "\\pi": "Pi"
  },
  "applicable_conditions": "Fundamental relationship in complex analysis",
  "notes": "Optional"
}
```

General:
```json
{
  "body": "Free-form content with LaTeX support",
  "notes": "Optional"
}
```

**Indexes:**
- `(deck_id)` — List cards in a deck
- `(user_id, fsrs_next_review)` — Find cards due for review (Daily Brief)

### 2.8 Tag

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT (UUID) | PK | |
| user_id | TEXT | FK → User.id, NOT NULL | |
| name | TEXT | NOT NULL | Tag name (e.g., "Definition", "Important") |
| is_system | BOOLEAN | DEFAULT FALSE | System tags (Definition, Theorem, Formula) cannot be deleted |
| color | TEXT | | Optional tag color |
| created_at | DATETIME | NOT NULL | |

**UNIQUE constraint:** `(user_id, name)`

### 2.9 CardTag (Junction Table)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| card_id | TEXT | FK → Card.id, NOT NULL | |
| tag_id | TEXT | FK → Tag.id, NOT NULL | |

**PK:** `(card_id, tag_id)`

### 2.10 Document

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT (UUID) | PK | |
| user_id | TEXT | FK → User.id, NOT NULL | |
| course_id | TEXT | FK → Course.id, NOT NULL | Parent course |
| filename | TEXT | NOT NULL | Original filename |
| file_path | TEXT | NOT NULL | Storage path on server |
| file_type | TEXT | NOT NULL | pdf / docx / image |
| file_size | INTEGER | | Size in bytes |
| parse_status | TEXT | DEFAULT 'pending' | pending / parsing / completed / failed |
| parse_channel | TEXT | | 'native' or 'ocr' (set after auto-detection) |
| extracted_text | TEXT | | Full extracted text (for search) |
| summary | TEXT | | AI-generated summary (for Agent context) |
| page_count | INTEGER | | Number of pages |
| created_at | DATETIME | NOT NULL | |
| updated_at | DATETIME | NOT NULL | |

### 2.11 AgentConversation

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT (UUID) | PK | |
| user_id | TEXT | FK → User.id, NOT NULL | |
| title | TEXT | | Auto-generated conversation title |
| created_at | DATETIME | NOT NULL | |
| updated_at | DATETIME | NOT NULL | |

### 2.12 AgentMessage

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

### 2.13 AgentMemory

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT (UUID) | PK | |
| user_id | TEXT | FK → User.id, NOT NULL | |
| category | TEXT | NOT NULL | preference / course_context / decision / general |
| content | TEXT | NOT NULL | The memory content |
| source_conversation_id | TEXT | FK → AgentConversation.id | Where this memory was created |
| relevance_score | REAL | DEFAULT 1.0 | Decayed relevance for retrieval ranking |
| created_at | DATETIME | NOT NULL | |
| last_accessed | DATETIME | | Last time this memory was retrieved |

### 2.14 DailyStatus

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT (UUID) | PK | |
| user_id | TEXT | FK → User.id, NOT NULL | |
| date | DATE | NOT NULL | |
| energy_level | TEXT | NOT NULL | energized / normal / tired |
| created_at | DATETIME | NOT NULL | |

**UNIQUE constraint:** `(user_id, date)`

### 2.15 Proposal

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT (UUID) | PK | |
| user_id | TEXT | FK → User.id, NOT NULL | |
| conversation_id | TEXT | FK → AgentConversation.id | Which conversation generated this |
| type | TEXT | NOT NULL | study_plan / batch_cards / schedule_adjustment |
| status | TEXT | DEFAULT 'pending' | pending / applied / discarded |
| data | JSON | NOT NULL | The proposed changes (tasks, cards, etc.) |
| created_at | DATETIME | NOT NULL | |
| resolved_at | DATETIME | | When applied or discarded |

---

## 3. System-Seeded Data

On user registration, the following are auto-created:

### Default Tags (is_system = true)
- Definition
- Theorem
- Formula
- Important
- Exam-relevant

These cannot be deleted but the user can create additional custom tags.

---

## 4. Key Queries (Performance Considerations)

| Query | Used By | Index Strategy |
|-------|---------|---------------|
| Get all tasks for user on date X | Daily Brief | `(user_id, date)` |
| Get all tasks for user in date range, filtered by course | Calendar | `(user_id, course_id, date)` |
| Get all cards due for review today | Daily Brief, Review Session | `(user_id, fsrs_next_review)` |
| Get all cards in deck, filtered by tag | Card Browser | `(deck_id)` + join on CardTag |
| Get task completion rate for date range | Statistics | `(user_id, status, date)` |
| Search documents by content | Agent | Full-text search on `extracted_text` |
| Retrieve relevant memories | Agent | `(user_id, category)` + text search on `content` |
