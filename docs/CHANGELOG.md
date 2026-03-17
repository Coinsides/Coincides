# Coincides — Changelog

All notable changes to this project will be documented in this file.

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
