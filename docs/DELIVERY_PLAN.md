# Coincides — Phased Delivery Plan

**Version**: 0.1 (Draft)
**Created**: 2026-03-17

---

## Overview

The project is delivered in 4 phases, each producing a usable increment. Phases are sequential — each builds on the previous.

After Phase 4, the project enters **Polish Rounds** — iterative refinement cycles driven by user feedback.

---

## Phase 1 — Foundation & Core Data Layer

**Goal**: A running application with user system, course management, calendar, tasks, and goals.

### Deliverables

| # | Feature | Acceptance Criteria |
|---|---------|-------------------|
| 1.1 | Project scaffolding | React + Vite frontend, Express backend, SQLite database, shared types. `npm run setup` works on a clean machine. |
| 1.2 | User authentication | Register with email/password, login, JWT-based session, logout. Protected routes redirect to login. |
| 1.3 | Course CRUD | Create, edit, delete courses. Each course has name, code, color, weight. Courses listed in sidebar. |
| 1.4 | Task system | Create one-time tasks with date, priority (Must/Recommended/Optional), course link. Toggle complete (checkbox). Tasks appear on calendar. |
| 1.5 | Recurring tasks | Create a recurring task group that generates multiple one-time tasks across a date range. Progress bar showing completion. |
| 1.6 | Calendar views | Monthly calendar view showing task density. Daily view showing task list for selected date. Filter by course. |
| 1.7 | Goal Manager | Create goals linked to a course with deadline. Batch-create tasks from a goal (manual — specify dates and titles). View goal progress (% of child tasks completed). |
| 1.8 | Daily Brief page | Home page showing: today's Must/Recommended/Optional tasks from all courses, recurring task progress alerts. |
| 1.9 | Basic UI shell | Navigation sidebar, dark theme, responsive layout, page routing. |
| 1.10 | Settings page | Basic settings: user profile, theme toggle, course management shortcut. |

### Verification
- User can register → login → create 2 courses → add tasks for the next week → view them on calendar → check them off → see progress on Daily Brief.

---

## Phase 2 — Knowledge Card System

**Goal**: Complete card system with decks, templates, tags, LaTeX rendering, visual editor, and FSRS spaced repetition.

### Deliverables

| # | Feature | Acceptance Criteria |
|---|---------|-------------------|
| 2.1 | Card Deck CRUD | Create, edit, delete decks. Each deck linked to a course. Deck list page with course filter. |
| 2.2 | Card CRUD | Create, edit, delete cards within a deck. Card has title, content (structured by template), importance level. |
| 2.3 | Card templates | Four templates: Definition, Theorem, Formula, General. Each renders differently. Template auto-selected when tag is set, or manually chosen. |
| 2.4 | Tag system | System tags (Definition, Theorem, Formula, Important, Exam-relevant) pre-seeded. User can create custom tags. Cards can have multiple tags. |
| 2.5 | LaTeX rendering | All card content renders LaTeX via KaTeX. Formulas display beautifully, never as raw code. |
| 2.6 | Visual formula editor | MathQuill-based editor for creating/editing formulas. Student types math naturally → editor outputs LaTeX → KaTeX renders it. Preview in real-time. |
| 2.7 | Card flip interaction | Single card view: shows title (front), click to flip and reveal content (back). Smooth flip animation. |
| 2.8 | Batch browse mode | Grid view showing all cards in a deck with content visible. For 8 cards: 2x4 or 4x2 grid. For 64+ cards: paginated grid with search/filter. |
| 2.9 | Batch recall mode | All cards face-down → student flips one by one → marks as "Knew it" or "Forgot". Results tracked. |
| 2.10 | Card filtering | Filter cards by: tag, importance, template type. Search by title/content. |
| 2.11 | FSRS integration | ts-fsrs integrated. Each card tracks S/D/R values. After review, FSRS calculates next review date. Cards due for review surfaced in Daily Brief. |
| 2.12 | Review session | Dedicated review mode: shows due cards one at a time → flip → rate (Forgot/Hard/Good/Easy) → FSRS updates scheduling. |

### Verification
- User can create a deck under AMS231 → add 10 cards (mix of Definition, Theorem, Formula) → use visual editor for a formula card → browse cards in grid → start a review session → rate cards → next day, only cards FSRS scheduled appear as due.

---

## Phase 3 — Agent (Mr. Zero)

**Goal**: Fully functional AI agent with document analysis, card generation, study planning, and Proposal mechanism.

**Prerequisite**: User provides a temporary API key for testing.

### Deliverables

| # | Feature | Acceptance Criteria |
|---|---------|-------------------|
| 3.1 | Provider abstraction | Unified AI provider interface. OpenAI and Anthropic implementations. User-configurable API key + model in Settings. |
| 3.2 | Agent chat UI | Floating panel accessible from any page via keyboard shortcut (Ctrl+J or similar). Chat interface with message history. Streaming responses. |
| 3.3 | Function calling | Agent can call all backend actions: create/query tasks, goals, cards, query calendar, query statistics. Function definitions registered with provider. |
| 3.4 | Natural language task creation | User says "Add a task for tomorrow to review Chapter 5 for AMS231" → Agent creates the task correctly. |
| 3.5 | Document upload & parsing | Upload PDF/DOCX via Agent or Documents page. Auto-detect native vs scanned. Parse via appropriate channel. Store extracted text + summary. |
| 3.6 | Document-based card generation | User uploads lecture note → asks Agent to generate cards → Agent extracts key concepts → generates card drafts as a Proposal → user reviews, edits, applies. |
| 3.7 | Study plan generation | User describes goal or uploads document → Agent asks preference questions (hours/day, exam date, study style) → generates Proposal with daily task allocation respecting Must/Recommended/Optional → user edits → applies to calendar. |
| 3.8 | Proposal UI | Interactive proposal view: editable list/timeline of proposed tasks or cards. Each item editable, deletable, reorderable. Apply / Discard buttons. |
| 3.9 | Agent memory — short-term | Sliding window conversation context. Conversation history stored in database. |
| 3.10 | Agent memory — long-term | User preferences and decisions extracted and stored. Retrieved at conversation start via keyword search. |
| 3.11 | Agent memory — document | Analyzed documents summarized and indexed. Agent references summaries during conversation, not full text. |
| 3.12 | Token optimization | Conversation summarization after N turns. Tool result compression. Document summaries used instead of full text. |
| 3.13 | Context-aware invocation | Clicking "Ask Mr. Zero" from a card page pre-loads card context. From calendar pre-loads date context. |
| 3.14 | Agent name customization | User can rename Agent in Settings. All UI and Agent self-references use the custom name. |
| 3.15 | Additional provider support | GenericOpenAI provider for any compatible API. User can add custom API endpoint + key. |

### Verification
- User uploads a 20-page Linear Algebra lecture note PDF → asks Mr. Zero to "create cards for the key theorems in this document" → Agent parses PDF, extracts theorems, generates a Proposal with 8 card drafts → user edits 2 of them → applies → cards appear in the correct deck with LaTeX rendered → user then asks "make me a 2-week study plan for the midterm on April 1" → Agent generates a Proposal with daily tasks → user adjusts and applies → tasks appear on calendar with correct priorities.

---

## Phase 4 — Statistics, Polish & Advanced Features

**Goal**: Statistics dashboard, review system, exam mode, conflict arbitration, daily status, and offline support.

### Deliverables

| # | Feature | Acceptance Criteria |
|---|---------|-------------------|
| 4.1 | Statistics dashboard | Task completion rates (daily/weekly/monthly), per-course breakdowns, streak tracking. |
| 4.2 | Streak visualization | GitHub-style contribution heatmap showing study activity per day. |
| 4.3 | Trend charts | Line charts for completion rate trends. Bar charts for per-course comparison. |
| 4.4 | Motivational messages | Data-driven encouraging messages displayed alongside stats. Based on actual achievement, not generic. |
| 4.5 | Weekly Review | Agent-generated summary: what was accomplished, what fell behind, suggested focus. Triggered via Agent or auto-suggested. |
| 4.6 | Monthly & Semester Review | Broader retrospective reports, same mechanism as weekly but larger scope. |
| 4.7 | Exam Mode | Activatable per goal. Increases Must task density. Increases card review frequency. Suppresses Optional tasks for the course. Visual indicator on UI. |
| 4.8 | Daily status input | Energy level selector on Daily Brief (Energized/Normal/Tired). Agent adjusts recommendations accordingly. |
| 4.9 | Multi-course conflict arbitration | When tasks from multiple courses overlap: auto-prioritize by deadline proximity, behind-schedule status, and course weight. Reflected in Daily Brief ordering. |
| 4.10 | Recurring task progress visualization | Progress bar + "X of Y completed" for each recurring task group. Behind-schedule alerts. Offer to let Agent readjust. |
| 4.11 | Offline support | Service Worker caches card data and calendar for offline review and viewing. Sync on reconnect. |
| 4.12 | Keyboard shortcuts | Global shortcuts for: open Agent (Ctrl+J), create task (Ctrl+T), create card (Ctrl+K), navigate pages. Shortcut reference panel. |

### Verification
- User has been using the app for a simulated 2 weeks of data → opens Statistics → sees streak heatmap, completion charts, per-course breakdown → asks Mr. Zero for a weekly review → receives a meaningful summary → activates Exam Mode for AMS231 midterm → sees task density increase → sets status to "Tired" → Daily Brief reduces to essential Must tasks only → disconnects internet → can still review cards and view calendar.

---

## Post-Phase: Polish Rounds

After Phase 4, the project enters iterative polish:

| Round | Focus |
|-------|-------|
| Polish 1 | UI refinement — colors, spacing, typography, animations, transitions |
| Polish 2 | Agent intelligence — prompt tuning, better proposals, edge case handling |
| Polish 3 | Performance — loading speed, large dataset handling, memory usage |
| Polish 4 | Accessibility — screen reader support, keyboard navigation completeness |
| Polish 5 | Advanced features — Obsidian export, multi-agent routing, custom themes |

Each polish round is one conversation. User provides feedback → developer implements → user reviews.

**Version 1.0** is declared when the user is satisfied with the polish level.

---

## Estimated Conversation Count

| Phase | Est. Conversations |
|-------|-------------------|
| Phase 0 (立项) | 1 (this one) |
| Phase 1 | 2-3 |
| Phase 2 | 2-3 |
| Phase 3 | 3-4 |
| Phase 4 | 2-3 |
| Polish Rounds | 3-5+ |
| **Total** | **~13-19 conversations** |
