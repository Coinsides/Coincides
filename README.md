# Coincides

**AI-Powered Learning Operating System**

Coincides is a study planning and knowledge management application designed to help students organize their entire semester. It features an AI agent named **Mr. Zero** that can analyze lecture notes, generate study plans, create knowledge cards, and manage your learning schedule.

## Core Features

- **Calendar & Task System** — Daily tasks with Must / Recommended / Optional priorities
- **Knowledge Cards** — Flashcards with LaTeX rendering, tags, templates, and FSRS spaced repetition
- **Goal Manager** — Create goals, batch-generate tasks, link to courses
- **Agent (Mr. Zero)** — Natural language interface for all operations, document analysis, study planning
- **Statistics** — Visual progress tracking, weekly/monthly/semester reviews
- **Daily Brief** — Aggregated daily view of what needs to be done

## Tech Stack

- **Frontend**: React + TypeScript
- **Backend**: Node.js + Express
- **Database**: SQLite (local-first)
- **AI**: Multi-provider support (OpenAI, Anthropic, etc.) via unified abstraction layer
- **PDF Parsing**: Dual-channel (Marker for native PDFs, PaddleOCR for scanned documents)
- **Spaced Repetition**: FSRS (Free Spaced Repetition Scheduler) via ts-fsrs

## Project Status

🟡 Phase 0 — Project Initialization (In Progress)

## Documentation

All project documentation is maintained in the `/docs` directory:

- `docs/PRD.md` — Product Requirements Document
- `docs/ARCHITECTURE.md` — Technical Architecture
- `docs/DATA_MODEL.md` — Entity Relationship & Schema Design
- `docs/DELIVERY_PLAN.md` — Phased Delivery Plan & Acceptance Criteria
- `docs/CHANGELOG.md` — Change Log

## License

TBD
