# Coincides — Phased Delivery Plan

**Version**: 1.0
**Created**: 2026-03-17
**Updated**: 2026-03-18

---

## Overview

The project was delivered in 4 initial phases plus 4 polish/feature rounds, culminating in v1.0. All phases are complete.

**Total development time:** ~22 hours across multiple sessions
**Total commits:** 27
**Total code:** ~21,400 lines

---

## Phase 0 — Documentation ✅

**Deliverables:** PRD, Data Model, Architecture, Delivery Plan
**Status:** ✅ Completed

---

## Phase 1 — Foundation & Core Data Layer ✅

**Goal**: A running application with user system, course management, calendar, tasks, and goals.

| # | Feature | Status |
|---|---------|--------|
| 1.1 | Project scaffolding (React + Vite + Express + SQLite) | ✅ |
| 1.2 | User authentication (register, login, JWT) | ✅ |
| 1.3 | Course CRUD | ✅ |
| 1.4 | Task system (date, priority, course link) | ✅ |
| 1.5 | Recurring tasks | ✅ |
| 1.6 | Calendar views (monthly + daily) | ✅ |
| 1.7 | Goal Manager | ✅ |
| 1.8 | Daily Brief page | ✅ |
| 1.9 | Basic UI shell (sidebar, dark theme, routing) | ✅ |
| 1.10 | Settings page | ✅ |

---

## Phase 2 — Knowledge Card System ✅

**Goal**: Complete card system with decks, templates, tags, LaTeX rendering, and FSRS spaced repetition.

| # | Feature | Status |
|---|---------|--------|
| 2.1 | Card Deck CRUD | ✅ |
| 2.2 | Card CRUD | ✅ |
| 2.3 | Card templates (definition/theorem/formula/general) | ✅ |
| 2.4 | Tag system (system tags + custom tags) | ✅ |
| 2.5 | LaTeX rendering via KaTeX | ✅ |
| 2.6 | Visual formula editor (MathQuill) | ❌ Not implemented — KaTeX preview in card modal instead |
| 2.7 | Card flip interaction (3D flip animation) | ✅ |
| 2.8 | Batch browse mode (grid view) | ✅ |
| 2.9 | Batch recall mode | ✅ |
| 2.10 | Card filtering (tag, importance, search) | ✅ |
| 2.11 | FSRS integration (ts-fsrs) | ✅ |
| 2.12 | Review session | ✅ |

---

## Phase 3 — Agent (Mr. Zero) ✅

**Goal**: Fully functional AI agent with document analysis, card generation, study planning, and Proposal mechanism.

| # | Feature | Status |
|---|---------|--------|
| 3.1 | Provider abstraction (Anthropic primary) | ✅ (OpenAI code exists, excluded from v1.0) |
| 3.2 | Agent chat UI (floating panel, Ctrl+J) | ✅ |
| 3.3 | Function calling (18+ tools) | ✅ |
| 3.4 | Natural language task creation | ✅ |
| 3.5 | Document upload & parsing (PDF/DOCX/XLSX/image/TXT) | ✅ |
| 3.6 | Document-based card generation via Proposal | ✅ |
| 3.7 | Study plan generation via Proposal | ✅ |
| 3.8 | Proposal UI (review, edit, apply/discard) | ✅ |
| 3.9 | Agent memory — short-term (sliding window) | ✅ |
| 3.10 | Agent memory — long-term (keyword + vector) | ✅ |
| 3.11 | Agent memory — document (summary + chunk RAG) | ✅ |
| 3.12 | Token optimization (summarization, compression) | ✅ |
| 3.13 | Context-aware invocation | ✅ |
| 3.14 | Agent name customization | ✅ |
| 3.15 | Additional provider support (GenericOpenAI) | ⚠️ Code exists, excluded from v1.0 |

---

## Phase 4 — Statistics, Polish & Advanced Features ✅

**Goal**: Statistics dashboard, review system, exam mode, conflict arbitration, daily status, and offline support.

| # | Feature | Status |
|---|---------|--------|
| 4.1 | Statistics dashboard | ✅ |
| 4.2 | Streak visualization | ✅ |
| 4.3 | Trend charts (custom CSS/SVG) | ✅ |
| 4.4 | Motivational messages | ✅ |
| 4.5 | Weekly Review (Agent-generated) | ✅ |
| 4.6 | Monthly & Semester Review | ✅ |
| 4.7 | Exam Mode | ⚠️ exam_mode field exists, no UI behavior change implemented |
| 4.8 | Daily status input (energy level) | ✅ |
| 4.9 | Multi-course conflict arbitration | ❌ Not implemented |
| 4.10 | Recurring task progress visualization | ✅ |
| 4.11 | Offline support (Service Worker) | ❌ Not implemented |
| 4.12 | Keyboard shortcuts | ⚠️ Only Ctrl+J (Agent panel) implemented |

---

## Post-Phase: Polish & Feature Rounds

After Phase 4, the project entered iterative rounds — each adding polish and new capabilities.

### Round 1 (Polish Round 1) ✅

| Step | Feature |
|------|---------|
| Polish Round 1 | Agent fixes, course weight system (1/2/3), calendar improvements |
| Patch | Card sections (grouping within decks) |

### Round 2 ✅

| Step | Feature |
|------|---------|
| Step 1 | Card grid + KaTeX preview in card list |
| Step 2 | Tag Group system (course-level tag organization) |
| Step 3 | Document upload + multi-format parsing (PDF双通道/DOCX/XLSX/image/TXT) |
| Step 3 Patch | 12 audit fixes across upload and parsing |
| Step 4 | Agent document tools (search_documents, get_document_content) |
| Step 5 | Drag-and-drop sorting (cards, sections, tasks) |

### Round 3 ✅

| Step | Feature |
|------|---------|
| Step 1+2 | Glassmorphism design system + core pages |
| Step 3+4 | Glassmorphism complete — all 26 CSS modules |
| Hotfix v2 | Glassmorphism black screen fix (--bg-* variables to solid colors + @supports fallback) |
| Patch | Deployment black screen fix + global UI scale-up (8-12%) |
| Step 5 | Review mode selector (7 modes) + Agent image upload panel |

### Round 4 ✅

| Step | Feature |
|------|---------|
| Step 1 | sqlite-vec + Voyage AI embedding pipeline |
| Step 2 | Semantic search + Agent RAG (vector-powered document retrieval) |
| Step 3 | FTS5 full-text search + three-way hybrid search engine |

### v1.0 Hotfix ✅

| Fix | Description |
|-----|-------------|
| Model ID | Update Haiku model ID to `claude-haiku-4-5-20251001` |
| API Key | documentParser reads API key from user Settings (priority: Settings > .env) |

---

## v1.0 Summary

**Round 4 completion = Coincides v1.0 milestone.**

| Metric | Value |
|--------|-------|
| Total features planned | 49 |
| ✅ Completed | 43 (88%) |
| ⚠️ Partially implemented | 3 (6%) |
| ❌ Not implemented | 3 (6%) |
| Total commits | 27 |
| Lines of code | ~21,400 |
| Database tables | 20 physical + 4 virtual |
| Development time | ~22 hours |
