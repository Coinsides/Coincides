# Coincides — Product Requirements Document (PRD)

**Version**: 1.0
**Created**: 2026-03-17
**Updated**: 2026-03-18
**Author**: Perplexity Computer (on behalf of henryfeng349)
**Status**: Active

---

## 1. Product Overview

### 1.1 What is Coincides?

Coincides is an AI-powered **learning operating system** for university students. It combines study planning, knowledge card management, calendar-based task tracking, and an AI agent (Mr. Zero) into a single integrated application.

The core philosophy: **the system plans and organizes; the student executes.** Coincides does not replace studying — it removes the overhead of planning, tracking, and organizing so the student can focus entirely on learning.

### 1.2 Target User

University students who:
- Take multiple courses per semester with exams and deadlines
- Need to manage lecture notes, formulas, definitions, and theorems
- Want a structured daily learning rhythm (Minimum Working Flow philosophy)
- Have no technical background (cannot write LaTeX, don't understand code)
- Want AI assistance for planning and knowledge organization, not for solving problems (other tools do that better)

### 1.3 Core Philosophy — Minimum Working Flow

Every day, the student should have a clear, achievable minimum set of tasks. This creates a sustainable rhythm:

- **Must** — Non-negotiable daily tasks. Completing these means the day is a success.
- **Recommended** — Beneficial tasks to do if time permits after Must tasks.
- **Optional** — Low-priority but helpful. The student can choose to skip without guilt.

The AI agent must understand and respect this priority hierarchy when generating study plans.

### 1.4 Product Positioning

| Existing Product | What It Does | What Coincides Does Differently |
|-----------------|-------------|-------------------------------|
| Anki | Spaced repetition flashcards | Cards + Calendar + Goals + AI Agent, all integrated |
| RemNote | Notes + flashcards | No note-taking; focused on planning and card management with AI |
| Notion | General-purpose workspace | Purpose-built for studying; AI agent understands academic context |
| ChatGPT | General AI assistant | Embedded agent with direct access to user's study data and calendar |
| Motion | AI calendar scheduling | Study-specific; understands courses, exams, knowledge cards |

---

## 2. Information Architecture

### 2.1 Top-Level Entity: Course

**Course is the root of everything.** All goals, card decks, tasks, and documents belong to a course. Filtering by course is the primary navigation mechanism.

Example: A student taking AMS231 (Applied Math) and PHY102 (Physics) can filter any view to show only one course's data.

### 2.2 Entity Hierarchy

```
Course
├── Goal (linked to Course)
│   └── Task (generated from Goal)
│       ├── One-time Task
│       └── Recurring Task (composed of multiple one-time tasks)
├── Card Deck (linked to Course)
│   └── Card
│       ├── Tags: Definition / Theorem / Formula / Custom
│       ├── Priority / Importance
│       ├── LaTeX-rendered content
│       └── Source: linked to Document + page/position
├── Document (uploaded lecture notes, PDFs, etc.)
│   └── Indexed and searchable by Agent
└── Statistics (aggregated per course)
```

### 2.3 Cross-Course Layer

- **Calendar** — Shows tasks from ALL courses on a unified timeline
- **Daily Brief** — Aggregates today's Must/Recommended/Optional from all courses
- **Agent (Mr. Zero)** — Has access to all courses; handles cross-course conflict arbitration
- **Statistics Dashboard** — Can show per-course or aggregated views

---

## 3. Feature Specifications

### 3.1 Calendar & Task System

#### Tasks
- **One-time Task**: A single action on a specific date (e.g., "Review Chapter 5")
- **Recurring Task**: A series of one-time tasks composing a larger effort (e.g., "Read Chapters 4-8 over two weeks"). Displayed as individual daily tasks but linked to a parent recurring task with progress tracking.
- **Priority Levels**: Must / Recommended / Optional — visually distinct, filterable
- **Status**: Pending / Completed (checkbox ✓)
- **Course Association**: Every task belongs to a course

#### Calendar Views
- Daily view (primary — used in Daily Brief)
- Weekly view
- Monthly view
- Tasks are displayed on the calendar, grouped by priority level

#### Recurring Task Progress
- Visual progress indicator showing how far through the recurring task the student is
- If behind schedule: system prompts "You are 2 days behind on [task]. Would you like Mr. Zero to readjust the remaining schedule?"

### 3.2 Goal Manager

#### Goals
- Linked to a Course
- Have a deadline (e.g., exam date)
- Description of what the goal covers
- Can batch-generate tasks (one-time and recurring)
- Status tracking: percentage of child tasks completed

#### Exam Mode
- Activated manually or suggested by Agent when a goal's deadline is approaching
- Increases Must task density for the relevant course
- Suppresses Optional tasks to reduce noise
- Card review frequency increases for the relevant course

### 3.3 Knowledge Card System

#### Card Decks
- Linked to a Course
- Contain multiple Cards
- Filterable by course, by tag type

#### Cards
- **Title**: Displayed on the card face (e.g., "Green's Theorem")
- **Content**: Displayed on card back — supports LaTeX rendering (KaTeX), rich text, images
- **Tags**: System-defined (Definition, Theorem, Formula) + user-defined custom tags
- **Priority/Importance**: User-settable
- **Source**: Links to a specific document + page/position for traceability
- **Editable**: Students can always edit any card, whether AI-generated or manual

#### Card Templates
Different card types render differently:
- **Definition**: Term → Definition text + optional example
- **Theorem**: Theorem name → Statement + Conditions + optional proof sketch
- **Formula**: Formula name → LaTeX-rendered formula + variable meanings + applicable conditions

#### Card Interaction Modes
1. **Single Card Flip**: Default state shows title only. Click/tap to flip and reveal content. Aids active recall.
2. **Batch Browse**: Grid layout showing all cards in a deck with content visible. For quick scanning and concentrated memorization (e.g., 8 cards at a glance).
3. **Batch Recall Mode**: All cards shown face-down → student tries to recall → flips to verify → marks known/unknown.
4. **Large Deck Strategy**: For 64+ cards, paginated grid or scrollable view with search/filter.

#### Card Creation
- **Manual**: Student creates via visual editor. LaTeX input through visual formula editor (MathQuill-style) — student never writes raw LaTeX.
- **Agent-assisted**: Student tells Mr. Zero to create a card from uploaded material. Agent generates a draft → student reviews → edits if needed → confirms to save.

#### Spaced Repetition (FSRS)
- Integrated FSRS algorithm via ts-fsrs
- Tracks per-card memory state (Stability, Difficulty, Retrievability)
- Calculates optimal review intervals
- Cards due for review appear in Daily Brief
- Exam Mode overrides: increases review frequency for exam-relevant cards

### 3.4 Document Management

#### Upload & Storage
- Students upload lecture notes (PDF, DOCX, images)
- Documents are stored persistently under their Course
- Documents are indexed for Agent retrieval

#### Dual-Channel PDF Parsing
- **Channel A (Native PDF)**: Uses Marker for text extraction. Preserves tables, LaTeX formulas, code blocks, structure. No OCR needed.
- **Channel B (Scanned/Image PDF)**: Uses PaddleOCR for text extraction + LLM for semantic correction. Math formula regions detected and sent to Vision API for LaTeX conversion.
- **Auto-detection**: System tries text extraction first. If text yield is below expected threshold → routes to Channel B.

#### Document-Card Traceability
- Cards generated from documents maintain a link to source document + page
- Student can click the source link on a card to view the original context

### 3.5 Agent — Mr. Zero

#### Identity
- Default name: Mr. Zero (user-customizable)
- Personality: Helpful, concise, study-focused. Not a chatbot — a work assistant.

#### AI Provider Architecture
- Unified provider abstraction layer
- Supports: OpenAI, Anthropic, Google, and any OpenAI-compatible API
- User configures their own API keys in Settings
- Model selection: user can choose which model to use
- Intent-based routing (future): simple queries → cheaper model, complex analysis → stronger model

#### Capabilities (Actions via Function Calling)
| Action | Description |
|--------|-------------|
| `create_task` | Create a one-time task on the calendar |
| `create_recurring_task` | Create a recurring task spanning multiple days |
| `create_goal` | Create a new goal under a course |
| `generate_study_plan` | Analyze workload and generate a Proposal |
| `create_card` | Create a knowledge card in a deck |
| `batch_create_cards` | Generate multiple cards from document analysis |
| `query_calendar` | Look up what's scheduled for a date range |
| `query_statistics` | Retrieve progress data for reporting |
| `analyze_document` | Parse and extract knowledge from uploaded document |

#### Proposal Mechanism (Critical UX Flow)
When Agent generates a study plan or batch of cards:

1. Agent analyzes input (document, natural language request, or goal parameters)
2. Agent asks user preference questions if needed ("How many hours per day?", "When is the exam?", "Morning or evening study preference?")
3. Agent generates a **Proposal** — a structured, editable draft
4. Proposal is displayed as an interactive list/timeline. Student can:
   - Edit any item
   - Delete items
   - Reorder items
   - Adjust dates
   - Change priority levels
5. Student clicks **Apply** → changes are written to the system
6. Student clicks **Discard** → nothing changes

This applies to: study plan generation, batch card creation, schedule adjustments.

#### Agent Memory System
- **Short-term**: Current conversation context (sliding window, most recent N turns)
- **Long-term**: User preferences, past decisions, course context stored in database. Retrieved via keyword + semantic search and injected into system prompt at conversation start.
- **Document memory**: Analyzed documents are summarized and indexed. Agent references summaries, not full text, to save tokens.
- **Memory retrieval**: Agent automatically searches long-term memory when context seems needed. Student can also explicitly ask "Do you remember what I said about AMS231?"

#### Token Optimization
- Summaries over raw text (analyzed documents → structured summaries)
- Tool results compression (backend filters before returning to Agent)
- Conversation summarization after N turns (early turns compressed)
- Intent-based model routing (light tasks → cheap model, heavy tasks → strong model)

#### Agent UI
- **Global floating panel** — accessible from any page via keyboard shortcut or button
- Not a separate page — a slide-in overlay that doesn't disrupt current workflow
- Can be invoked from context: e.g., clicking "Ask Mr. Zero" on a difficult card pre-loads that card's context

### 3.6 Daily Brief

The first thing the student sees when opening the app.

#### Content
- Today's date and a one-line motivational message
- **Must tasks** (from all courses, ordered by priority)
- **Recommended tasks** (collapsed by default, expandable)
- **Optional tasks** (collapsed by default, expandable)
- **Cards due for review** (count by course, click to start review session)
- **Recurring task progress alerts** ("You're 2 days behind on Linear Algebra Ch.4-8")

#### Daily Status Input (Optional)
- On opening Daily Brief, student can optionally set today's energy level: Energized / Normal / Tired
- If "Tired": Agent reduces Recommended suggestions, surfaces only critical Must tasks
- If "Energized": Agent surfaces more Recommended tasks and suggests bonus activities

### 3.7 Statistics System

#### Tracked Metrics
- Daily/weekly/monthly task completion rate (Must, Recommended, Optional separately)
- Consecutive study days (streak)
- Per-course task completion
- Cards reviewed per day
- Study time distribution across courses (based on task completion timestamps)

#### Visualization
- Clean, visually strong charts (not complex — inspiring, not overwhelming)
- Streak calendar (similar to GitHub contribution graph)
- Trend lines for completion rates
- Per-course progress bars

#### Motivational Element
- Short encouraging messages alongside statistics
- E.g., "You completed all Must tasks for 7 consecutive days. Consistency is your superpower."
- Generated based on actual data, not generic — the student sees their own achievement reflected.

#### Reviews (Agent-Generated)
- **Weekly Review**: Summary of the week — what was accomplished, what fell behind, suggested focus for next week
- **Monthly Review**: Broader trends, course-by-course progress
- **Semester Review**: Full retrospective
- Triggered on-demand by student asking Mr. Zero, or suggested by Agent at appropriate times

### 3.8 Multi-Course Conflict Arbitration

When tasks from multiple courses overlap on the same day:
- Course with nearer exam deadline → higher priority
- Course that is more behind schedule → higher priority
- Student can manually set course weight ("This semester, math is most important")
- Agent considers all factors when generating Proposals

### 3.9 User System

#### Authentication
- Email + password registration/login
- Session management with JWT
- Data isolation: each user sees only their own data

#### Settings
- AI provider configuration (API key input, model selection)
- Agent name customization (default: Mr. Zero)
- Theme preference (dark mode default)
- Notification preferences
- Course management

---

## 4. Design Principles

### 4.1 UX Philosophy

Inspired by Notion's usability and Apple's humanistic design:

- **Reduce navigation**: Minimize clicks to reach any function. Daily Brief is the home page — not a dashboard that requires further clicking.
- **Agent as universal entry point**: Any operation can be performed by talking to Mr. Zero. The UI is for browsing and reviewing; the Agent is for doing.
- **Never surprise the user**: All AI-generated changes go through Proposal → Review → Apply. The system suggests; the human decides.
- **Respect the student's state**: Energy level input, priority tiers, non-judgmental tone. The system adapts to the student, not the other way around.
- **Make progress visible**: Statistics and streaks are not vanity metrics — they are psychological fuel. Design them to inspire.

### 4.2 UI Guidelines (High-Level)

- **Dark mode as default** (students study at night)
- **Keyboard-first**: All primary actions have keyboard shortcuts
- **Card flip animations**: Smooth, satisfying, not slow
- **Minimal chrome**: Content takes priority over UI decoration
- **Responsive**: Works on desktop (primary) and tablet. Mobile is secondary.
- **Visual formula rendering**: Students see rendered math, never raw LaTeX

### 4.3 Offline Capability

> **v1.0 Status**: Offline support (Service Worker) was NOT implemented in v1.0. The app requires network for all features. This remains a future consideration.

- Card review and calendar viewing could work offline (future)
- Agent requires network (API calls)

---

## 5. Out of Scope (Intentional)

These are explicitly NOT part of Coincides:

- **Problem solving / homework help** — Other AI tools (ChatGPT, Claude) do this well. Mr. Zero explains concepts but does not solve exercises.
- **Note-taking** — Coincides is not a note editor. Students upload existing notes; they don't write notes inside Coincides.
- **Social features** — No sharing, no collaborative decks, no leaderboards. This is a personal tool.
- **Mobile app** — Web-first. Responsive design covers tablet use. Native mobile app is a future consideration.

---

## 6. Open Questions

1. **External integrations**: Should Coincides support import/export with Obsidian, Anki, or other tools? — Deferred to post-v1
2. **Multi-agent architecture**: Should Mr. Zero internally route to specialized sub-agents? — ✅ Resolved: Single agent with 18+ function tools, no sub-agent routing needed for v1.0
3. **Versioning strategy**: When is v1.0? — ✅ Resolved: v1.0 = Round 4 completion (Phase 0-4 + 4 polish rounds)
4. **Long-term memory retrieval**: Exact mechanism for retrieval — ✅ Resolved: Three-way hybrid search (Voyage AI vectors + FTS5 + LIKE fallback)
5. **Obsidian / NotebookLM integration**: Potential for external knowledge base connection — Deferred to post-v1
