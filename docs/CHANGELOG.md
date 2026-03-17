# Coincides — Changelog

All notable changes to this project will be documented in this file.

---

## [Phase 3] — 2026-03-17

### AI Agent Module — Mr. Zero

#### Backend
- **AI Provider Abstraction**: Multi-provider support (Anthropic primary, OpenAI compatible)
  - `AnthropicProvider`: native SDK with streaming, tool_use blocks, proper message mapping
  - `OpenAIProvider`: OpenAI-compatible API with function calling support
  - `getProviderFromSettings()`: reads user config, falls back to .env ANTHROPIC_API_KEY
- **Agent Orchestrator**: async generator pattern with streaming
  - System prompt builder with user context (courses, energy, memories, doc summaries)
  - Multi-round tool call loop (max 5 rounds per message)
  - SSE chunk types: text, tool_call_start, tool_call_delta, tool_call_end, done, error
  - Accumulates tool calls across rounds, saves full conversation history
- **Function Calling**: 14 tool definitions
  - Query tools: list_courses, get_tasks, list_goals, list_decks, list_cards, get_review_due, get_daily_brief
  - Action tools: create_task, complete_task, create_goal, create_card
  - Proposal tool: create_proposal (batch_cards, study_plan, schedule_adjustment)
  - Memory tools: search_memories, save_memory
  - Tool executor with full SQLite integration and user-scoped data access
- **Proposal System**: Proposal → Review → Apply mechanism
  - Three types: batch_cards (create multiple flashcards), study_plan (create tasks), schedule_adjustment (modify existing tasks)
  - CRUD endpoints: list pending, get details, apply (transaction), discard, update (edit before applying)
  - Apply runs in SQLite transaction: inserts cards/tasks or updates existing tasks
- **Agent Memory**: short-term + long-term memory management
  - Sliding window conversation history (last 20 messages per conversation)
  - Long-term memory extraction: keyword-based relevance scoring
  - Document summary indexing for context
  - Conversation summarization for token optimization
- **Agent Chat API**: SSE streaming endpoint
  - Conversations CRUD (create, list, get messages, delete)
  - `POST /conversations/:id/messages` → SSE stream with named events
  - Zod validation for send message + create conversation schemas
- New DB tables: agent_conversations, agent_messages, agent_memories, proposals
- Dependencies: @anthropic-ai/sdk, dotenv

#### Frontend
- **Agent Floating Panel** (Ctrl+J / Cmd+J toggle):
  - 420px slide-in panel from right with semi-transparent backdrop
  - Conversation selector dropdown with new/delete actions
  - Chat tab: message bubbles (user right-aligned, assistant left-aligned)
  - SSE streaming display: partial text with blinking cursor, tool activity pill with pulse animation
  - Simple markdown rendering: bold, italic, code blocks, lists
  - Input textarea: Enter to send, Shift+Enter for newline, disabled during streaming
- **Proposal UI** (Proposals tab with badge count):
  - Expandable proposal cards with type badges (batch_cards/study_plan/schedule_adjustment)
  - Item list with individual remove button
  - Apply (green) and Discard (red outline) action buttons
  - Toast notifications on apply/discard
- **Settings AI Provider Config**:
  - Provider selector: Anthropic / OpenAI Compatible
  - API key input with show/hide toggle
  - Model selection with sensible defaults (claude-sonnet-4-20250514 / gpt-4o)
  - Save button with green "Connected" indicator when key is saved
- **Context-Aware Invocation**:
  - Sparkle button on Deck Detail page → opens agent with deck context
  - Sparkle button on Calendar page → opens agent with date context
  - Context hints passed through to backend for augmented messages
- Zustand stores: agentStore (conversations + SSE streaming), proposalStore
- uiStore extended: agentPanelOpen, toggleAgentPanel, openAgentWithContext

#### Files
- 8 new files (1,416 lines): agentStore, proposalStore, AgentPanel, MessageBubble, ProposalList + CSS modules
- 10 modified files: uiStore, api.ts, Settings, AppLayout, App.tsx, DeckDetail, Calendar + CSS
- Total: 18 files, ~3,460 lines

---

## [Phase 2] — 2026-03-17

### Knowledge Card System — Decks, Cards, FSRS, Review

#### Backend
- Card Deck CRUD: create, list (with course filter), update, delete (cascade)
- Card CRUD: create with structured JSON content, list with multi-filter support (tag, template, importance, search), update, delete with deck count sync
- Tag CRUD: system tags protected (403 on edit/delete), custom tags with unique constraint per user, color support
- FSRS spaced repetition engine (ts-fsrs): full integration with scheduling algorithm
  - Due cards query: finds cards with `fsrs_next_review <= date` or new cards (`fsrs_reps == 0`)
  - Rating endpoint: accepts 1-4 (Again/Hard/Good/Easy), recalculates stability, difficulty, next review date
  - Reconstructs FSRS card state from DB for existing cards
- Review session API: GET due cards (with deck/course/tag info), GET due count, POST rate
- Daily Brief updated: `cards_due_count` now queries real data instead of hardcoded 0
- Zod validators for all new endpoints (deck, card, tag, rating schemas)
- ts-fsrs dependency installed

#### Frontend
- **Decks page**: deck grid with course color badges, card counts, course filter dropdown, create/edit/delete
- **Deck Detail page**: full card browser with:
  - Grid view (card fronts in responsive grid) + List view (compact table)
  - Filter bar: template type pills, tag multi-select, importance filter, search input
  - Pagination (20 per page)
  - "Start Review" button when due cards exist
- **Card Modal**: template-aware creation/editing form
  - 4 template types: Definition, Theorem, Formula, General
  - Dynamic fields per template (e.g. formula + variable table for Formula type)
  - Live KaTeX preview for formula field
  - Importance 1-5 star selector
  - Tag multi-select checkboxes
  - LaTeX hint placeholders on all textareas
- **Card Flip component**: 3D CSS transform flip animation
  - Front: title, template badge, importance stars, course color
  - Back: structured content rendered per template type via KaTeXRenderer
- **KaTeX Renderer**: detects `$...$` (inline) and `$$...$$` (display) LaTeX, renders via katex.renderToString(), graceful error fallback
- **Card Template Content**: renders Definition/Theorem/Formula/General layouts with appropriate headers and formatting
- **Card View Modal**: flip card + metadata (created, last reviewed, next review, reps)
- **Review Session page**: full-screen focused review mode
  - Progress bar (Card X of Y)
  - Large flip card in center
  - 4 rating buttons (Again=red, Hard=orange, Good=green, Easy=blue) visible after flip
  - Session summary after completion (total, rating distribution, next review dates)
- **Daily Brief updated**: shows real due card count with "Start Review" navigation button
- **Navigation**: added Decks + Review items in sidebar
- Zustand stores: deck, card, tag, review
- KaTeX dependency installed with full font bundle

---

## [Phase 1] — 2026-03-17

### Foundation Build — Core Structure + Task Management

#### Backend (Express + TypeScript + SQLite)
- Full database schema: 15 tables with indexes, foreign keys, WAL mode
- User authentication: register, login, JWT token, `/auth/me` endpoint
- Course CRUD: create, list, update, delete with user-scoped data isolation
- Task system: create, list (by date/course), update status, batch create, delete
  - Priority system: Must / Recommended / Optional
- Recurring Task Groups: create group with auto-distributed tasks, progress tracking
- Goal Manager: CRUD, exam-mode toggle, linked to courses
- Daily Brief API: aggregates today's tasks by priority, cards-due count, recurring alerts
- Daily Status: set energy level (Energized / Normal / Tired)
- Settings API: update user preferences, AI provider config, theme
- Request validation with Zod schemas for all endpoints
- Global error handler middleware
- System tags seeded on user registration (Definition, Theorem, Formula, Important, Exam-relevant)

#### Frontend (React 18 + Vite + Zustand)
- Dark theme design system with CSS custom properties
- Authentication: Login + Register pages with form validation
- App layout: collapsible sidebar navigation with route links
- Daily Brief page: greeting, energy selector, Must/Recommended/Optional task sections (collapsible), recurring alerts, task completion toggle
- Calendar page: month view with day cells showing task dots, day view with task list, course filter
- Goals page: goal cards with progress bars, exam mode badge, create/edit/delete
- Courses page: course cards with color indicators, weight display, create/edit/delete
- Settings page: profile info, theme toggle, agent name customization
- Modal system: TaskModal, CourseModal, GoalModal with form validation
- Toast notification system (success/error)
- Zustand stores: auth, courses, tasks, goals, recurring tasks, daily brief, UI state
- API service: axios with JWT interceptor, 401 auto-redirect
- Vite proxy for `/api` → backend

#### Infrastructure
- Monorepo structure: `/server`, `/client`, `/shared`, `/docs`
- Shared TypeScript types and enums across frontend/backend
- `.gitignore` configured

#### Bug Fixes
- Fixed goal creation: `exam_mode` was hardcoded to 0, now properly reads from request body

---

## [Phase 0] — 2026-03-17

### Project Initialization
- Created GitHub repository: [Coinsides/Coincides](https://github.com/Coinsides/Coincides)
- Created project documentation:
  - `PRD.md` — Full product requirements document covering all 8 feature modules
  - `DATA_MODEL.md` — 15 database tables with field definitions, indexes, and JSON schemas
  - `ARCHITECTURE.md` — Technical stack selection, system diagram, project structure, API design
  - `DELIVERY_PLAN.md` — 4-phase delivery plan with acceptance criteria per feature
  - `CHANGELOG.md` — This file
- Documents synced to Google Drive (Coincides project folder)
- Key decisions recorded:
  - Multi-provider AI support (OpenAI, Anthropic, user-configurable)
  - Target: public release (full user system, data isolation)
  - Local-first with SQLite, deployable on Windows 11
  - Visual formula editor (student has no LaTeX experience)
  - Phased delivery with polish rounds before v1.0
