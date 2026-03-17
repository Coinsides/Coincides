# Coincides — Changelog

All notable changes to this project will be documented in this file.

---

## [Round 2 Step 1] — 2026-03-17

### 卡片尺寸修复 + KaTeX 预览渲染

#### Card Grid 尺寸调整
- Grid 列宽从 `minmax(280px, 1fr)` 改为 `minmax(200px, 1fr)`，卡片更窄、可显示更多列
- 卡片最小高度从 130px → 200px，更高的纵向比例，显示更多内容
- 预览文本行数从 3 行增至 4 行

#### 卡片内容预览 KaTeX 渲染
- Grid 视图：卡片内容预览现在通过 `KaTeXRenderer` 渲染，数学公式（`$...$` / `$$...$$`）不再显示原始 LaTeX
- List 视图：标题下方新增内容预览行，同样通过 KaTeX 渲染
- 按模板类型提取预览字段：Definition → definition, Theorem → statement, Formula → formula, General → body
- 预览文本带长度截断（Grid 120字符，List 80字符），确保不溢出
- KaTeX 渲染尺寸在预览区域内适当缩小（grid 0.9em, list 0.85em）
- Display 模式公式左对齐、缩小 margin

#### Files
- 修改 2 个文件: DeckDetail.tsx, DeckDetail.module.css

---

## [Polish Round 1 Patch] — 2026-03-17

### Section 管理增强 + Review 联动

#### Section 删除（二次确认 + 级联删除）
- Section 删除现在会弹出自定义确认对话框，显示将被删除的卡片数量
- 后端级联删除: 删除 section 时同时删除该 section 下所有卡片，并更新 deck card_count
- 使用 SQLite transaction 保证数据一致性

#### Section 重命名（内联编辑）
- Section header 新增编辑按钮（笔图标），hover 时显示
- 点击后 section 名称变为可编辑输入框
- Enter 保存，Escape 取消，blur 保存

#### Section 内搜索/筛选
- Section header 新增搜索按钮，hover 时显示
- 点击后展开搜索输入框，支持按卡片标题模糊筛选（客户端过滤）
- Unsectioned 区域同样支持搜索

#### 批量选取 → Review 选中卡片
- 当处于选择模式且有选中卡片时，Review 按钮变为 "Review Selected (N)"
- 点击后仅复习选中的卡片，不受 FSRS 到期时间限制
- reviewStore 新增 `setCustomCards` 方法，支持预加载自定义卡片列表
- Review 页面检测到预加载卡片时跳过 fetchDueCards

#### UI 细节
- Section header 操作按钮（编辑/搜索/删除）仅在 hover 时显示，不干扰视觉
- 删除确认对话框使用自定义 Modal（非 window.confirm），与整体设计风格一致
- Section 内搜索输入框样式与全局搜索保持统一

---

## [Polish Round 1] — 2026-03-17

### Bug 修复 + 核心体验改进

#### P0: Agent 卡死 Bug 修复
- **Anthropic provider**: 补充 fallback `done` 事件 — 当 SSE 流正常结束但没有 `message_stop` 时，确保发出 `done` 信号
- **Orchestrator**: 每轮 Agent 对话增加 30 秒超时机制，防止 API 挂起导致无限等待
- **Agent route**: 增加 120 秒请求级超时，超时后自动发送 error + done 事件并关闭连接
- **前端 agentStore**: error 事件现在在聊天中显示错误消息气泡（之前只 console.error，用户看不到任何反馈）
- **前端 agentStore**: 网络异常时同样显示错误消息气泡

#### Course Weight 三档化 + Description 字段
- Weight 从 1-10 灰度条改为三档选择：重要(3) / 一般(2) / 不重要(1)
- CourseModal 新增 Description 文本域
- 课程卡片展示 description 和新的 weight badge
- DB migration: courses 表新增 `description` 列
- validators 更新: weight 限制为 1-3

#### Calendar 周视图 + 年份选择
- 新增 Month / Week 视图切换按钮
- 新增年份选择下拉（当前年份 ±5 年范围）
- Week 视图: 7 列（Mon-Sun），每列显示当日任务列表，支持完成/新建操作
- 默认选中今天，月视图和周视图共享筛选逻辑

#### Deck 卡片预览改进
- Grid 视图卡片尺寸放大
- 卡片标题下方新增内容摘要（2-3 行），按模板类型提取：
  - Definition → definition 字段前 80 字符
  - Theorem → statement 字段前 80 字符
  - Formula → formula 字段
  - General → body 字段前 80 字符
- List 视图同步增加内容预览列

#### Deck 内分组（Section）功能
- 新增 `card_sections` 表: id, deck_id, user_id, name, order_index
- Cards 表新增 `section_id` + `order_index` 字段
- 新增 sections CRUD API: GET/POST/PUT/DELETE /api/sections
- DeckDetail 页面按 Section 分组展示卡片，每组可折叠
- 未分组卡片显示在 "Unsorted" 区域
- 新建卡片时可选择 Section
- CardModal 增加 Section 选择器

#### 批量选取 + 批量删除/移动
- DeckDetail header 新增 Select 模式按钮
- 选中模式下卡片显示 checkbox
- 底部浮动操作栏: 显示已选数量 + Delete + Move to 按钮
- Move to 弹出目标 Deck 选择器
- 后端新增: POST /api/cards/batch-delete, POST /api/cards/batch-move

#### UI 整体字体/间距调大
- 基础字体从 14px → 15px
- 行高 1.4 → 1.55
- 全局 padding/margin 增加 10-15%
- 卡片、按钮、输入框间距统一调大

#### Files
- 新增文件: server/src/routes/sections.ts
- 修改 22 个文件, +1,106 / -229 行

---

## [Phase 4] — 2026-03-17

### Statistics, Minimum Working Flow & Smart Planning

#### Backend
- **Minimum Working Flow Engine**: Daily Brief API now returns `minimum_working_flow` object with must task count, cards due, estimated study time, and exam mode status. Replaces motivational messages with actionable minimum daily targets.
- **Study Mode Templates**: New `study_mode_templates` table with 7 built-in learning strategies:
  - Spaced Repetition, Interleaving, Active Recall, Feynman Technique, Pomodoro, Spiral Learning, Mastery-Based
  - Each template includes description, learning science rationale, and configurable parameters
  - GET /api/study-templates endpoint for Agent and UI access
- **Agent Intelligence Upgrade**:
  - 4 new tools: `get_study_templates`, `get_statistics_overview`, `suggest_next_topics`, `generate_weekly_review`
  - Enhanced system prompt with "Minimum Working Flow Philosophy" and "Study Plan Creation Protocol"
  - Agent now follows 5-step flow when creating study plans: present templates → ask learning mode → ask capacity → ask prerequisite needs → generate Proposal
  - Prerequisite/foundation knowledge support via `is_prerequisite` task flag
  - Next-topic suggestion using course context + model reasoning
- **Statistics API** (4 endpoints):
  - `GET /overview`: Current/longest streak, today/week/month task + card stats
  - `GET /heatmap?months=6`: Daily activity counts with 0-4 intensity levels
  - `GET /trends?period=weekly&weeks=12`: Completion rate trends over time
  - `GET /courses`: Per-course breakdown with completion rates and goal counts
- **Study Activity Logging**: Automatic logging when tasks are completed or cards are reviewed (`study_activity_log` table)
- **Exam Mode Logic**: Active exam goals suppress Optional tasks, boost Must tasks with `exam_boost` flag
- **Multi-Course Conflict Arbitration**: Daily Brief sorting by exam status → deadline proximity → course weight → order index
- New DB tables: study_mode_templates, study_activity_log
- Tasks table extended: `is_prerequisite` column

#### Frontend
- **Daily Brief Refactored**:
  - New MWF (Minimum Working Flow) card at top: shows must tasks, cards due, estimated minutes
  - Exam mode warning banner when active exam goals detected
  - Lightning bolt (⚡) indicator on exam-boosted tasks
  - Removed generic greeting text
- **Statistics Dashboard** (new page at /statistics):
  - Overview cards: current streak, today/week/month stats
  - Activity heatmap: GitHub-style SVG grid (26 weeks, 5 color levels)
  - Trend chart: pure SVG area chart showing 12-week completion rate
  - Per-course breakdown: progress bars, completion rates, card counts
  - All charts built as pure SVG — no external charting libraries
- **Exam Mode UI**: Prominent "⚡ EXAM MODE" pill on goal cards when active
- **Keyboard Shortcuts**:
  - `Ctrl+T` / `Cmd+T`: Create new task
  - `Ctrl+K` / `Cmd+K`: Create new card
  - `?`: Show shortcuts reference panel
  - Shortcuts panel: modal overlay listing all available shortcuts
- Navigation: Statistics page added to sidebar (BarChart3 icon)
- Zustand store: statisticsStore for dashboard data

#### Files
- Backend: 2 new files + 11 modified (2,439 lines total)
- Frontend: 5 new files + 7 modified (1,350 lines total)
- Grand total: ~3,800 lines across 25 files

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
