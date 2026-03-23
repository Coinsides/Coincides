# Coincides

**AI-Powered Learning Operating System**

Coincides helps students organize their entire semester through intelligent study planning. An AI agent named **Mr. Zero** analyzes your lecture notes, generates study plans, creates knowledge cards, and manages your schedule — all through natural conversation.

Built around the **Minimum Working Flow** philosophy: maintain learning continuity through a small daily minimum, not cramming.

![Version](https://img.shields.io/badge/version-1.7.3-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Node](https://img.shields.io/badge/node-22.x-brightgreen)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6)

---

## Features

### 📅 Calendar & Tasks
Daily tasks with **Must / Recommended / Optional** priorities. Week view with Time Block visualization. Drag-and-drop task ordering. Recurring task groups with progress tracking.

### 🎯 Goal Manager
Hierarchical goals with deadlines. Define prerequisite chains (A → B → C) and let AI schedule tasks in dependency order. Exam mode for focused prep periods.

### 📚 Knowledge Cards
Flashcards with LaTeX rendering (KaTeX), multiple templates (Definition, Theorem, Formula, Q&A), tagging system with tag groups, and **FSRS spaced repetition** for optimal review scheduling.

### 🤖 Agent (Mr. Zero)
Chat-based AI assistant for everything: analyze documents, create study plans, generate flashcards, reschedule tasks. All AI changes go through a **Proposal → Review → Apply** flow — the system suggests, you decide.

### ⏰ Time Blocks
Define your weekly study/sleep schedule with reusable templates. AI automatically respects your available time when scheduling. Supports template sets, single-day overrides, and midnight-crossing blocks.

### 📊 Statistics
Streaks, completion rates, heatmaps, weekly/monthly trends, per-course breakdowns. Passive tracking only — no monitoring, no guilt.

### 📝 Daily Brief
Today's tasks at a glance, review cards due, recurring task alerts, energy level tracking, exam mode highlights.

### 📄 Document Management
Upload PDFs, DOCX, XLSX, images. Dual-channel parsing (text extraction + OCR fallback via Claude Vision). Semantic search + full-text search across all your materials.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite 5 |
| State | Zustand |
| UI | Custom components + Lucide icons |
| Backend | Node.js 22 + Express 4 + TypeScript |
| Database | SQLite (better-sqlite3), WAL mode |
| AI Agent | Anthropic Claude (Sonnet 4) |
| Embeddings | Voyage AI (voyage-4, 1024-dim) |
| Vector Search | sqlite-vec |
| Full-Text Search | SQLite FTS5 |
| Spaced Repetition | ts-fsrs (FSRS algorithm) |
| Math Rendering | KaTeX |
| i18n | i18next (English + 中文) |

---

## Getting Started

### Prerequisites

- **Node.js 22.x** (LTS) — [nodejs.org](https://nodejs.org)
- **npm 9+** (comes with Node.js)
- **Anthropic API Key** — [console.anthropic.com](https://console.anthropic.com)
- **Voyage AI API Key** (optional, enables semantic search) — [dash.voyageai.com](https://dash.voyageai.com)

> **Note:** Node 25 has known ESM compatibility issues on Windows. Use Node 22 LTS.

### 1. Clone & Install

```bash
git clone https://github.com/Coinsides/Coincides.git
cd Coincides
npm run setup
```

### 2. Configure Environment

Create `.env` in the **project root**:

```env
# Required — AI agent (Mr. Zero)
ANTHROPIC_API_KEY=sk-ant-api03-xxxxx

# Optional — semantic search & document RAG
VOYAGE_API_KEY=pa-xxxxx
```

> You can also configure API keys in the app's Settings page after first launch.

### 3. Start the App

**Terminal 1 — Backend:**

```bash
cd Coincides
node --import jiti/register server/src/index.ts
```

**Terminal 2 — Frontend:**

```bash
cd Coincides/client
npm run dev
```

### 4. Open & Register

Go to **http://localhost:5173** → Register an account → Start using.

Everything runs locally on your machine. No cloud, no telemetry.

### 5. First Time Setup

1. **Create a course** — e.g. "Linear Algebra"
2. **Upload materials** — Drop your lecture PDFs or notes
3. **Set your schedule** — Define study time blocks (optional)
4. **Talk to Mr. Zero** — Ask the AI to build a study plan. It creates a Proposal for you to review and approve.

---

## Project Structure

```
Coincides/
├── client/              # React frontend
│   ├── src/
│   │   ├── components/  # Reusable UI components
│   │   ├── pages/       # Route pages (Calendar, DailyBrief, etc.)
│   │   ├── stores/      # Zustand state stores
│   │   └── locales/     # i18n translations (en/zh)
├── server/              # Express backend
│   ├── src/
│   │   ├── agent/       # AI agent (system prompt, tools, scheduling)
│   │   ├── db/          # Database schema & migrations
│   │   ├── embedding/   # Voyage AI vector search
│   │   ├── routes/      # REST API endpoints
│   │   └── services/    # Document parsing, file processing
├── shared/              # Shared TypeScript types
│   └── types/
└── docs/                # Project documentation
    ├── PRD.md           # Product Requirements
    ├── ARCHITECTURE.md  # Technical Architecture
    ├── DATA_MODEL.md    # Database Schema
    ├── Coincides-Roadmap.md
    └── releases/        # Version changelogs
```

---

## Design Principles

Three rules that **cannot** be broken:

1. **Never decide for the user** — AI only breaks down, suggests, and executes
2. **Never monitor the user** — No time tracking, no energy judgment, no unsolicited content
3. **Never create frustration** — No locked schedules, no failure reviews, zero penalty for skipping

---

## Version History

| Version | Highlights |
|---------|-----------|
| **v1.7.3** | Time Block template system, auto-apply schedules, midnight-crossing blocks |
| v1.7 | Time Blocks, weekly schedule, AI scheduling integration |
| v1.6 | Tag groups, card sections, drag-and-drop reordering |
| v1.5 | Document management, dual-channel parsing, semantic search |
| v1.4 | Knowledge cards, FSRS spaced repetition, LaTeX rendering |
| v1.3 | Goal dependencies, recurring tasks, Proposal system |
| v1.2 | AI Agent (Mr. Zero), tool-calling architecture |
| v1.1 | Course management, task system, daily brief |
| v1.0 | Initial release |

> **Coming in v1.8:** Cloud deployment (PostgreSQL + online access + PWA offline support)

---

## Documentation

All project docs live in [`/docs`](docs/):

- [PRD.md](docs/PRD.md) — Product Requirements
- [ARCHITECTURE.md](docs/ARCHITECTURE.md) — Technical Architecture
- [DATA_MODEL.md](docs/DATA_MODEL.md) — Database Schema
- [Coincides-Roadmap.md](docs/Coincides-Roadmap.md) — Development Roadmap

---

## Contributing

This project is in active development. Issues and pull requests are welcome.

---

## License

MIT
