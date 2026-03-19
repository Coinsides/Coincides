# Coincides

**AI-Powered Learning Operating System**

Coincides helps students organize their entire semester through intelligent study planning. An AI agent named **Mr. Zero** analyzes your lecture notes, generates study plans, creates knowledge cards, and manages your schedule — all through natural conversation.

Built around the **Minimum Working Flow** philosophy: maintain learning continuity through a small daily minimum, not cramming.

![Status](https://img.shields.io/badge/version-1.3-blue)
![License](https://img.shields.io/badge/license-MIT-green)

---

## Features

**📅 Calendar & Tasks** — Daily tasks with Must / Recommended / Optional priorities. Week view with Time Block visualization. Drag-and-drop task ordering.

**🎯 Goal Manager** — Set goals with deadlines, define prerequisite chains (A → B → C), and let AI schedule tasks in dependency order.

**📚 Knowledge Cards** — Flashcards with LaTeX rendering (KaTeX), multiple templates (Definition, Theorem, Formula), tagging, and FSRS spaced repetition.

**🤖 Agent (Mr. Zero)** — Chat-based interface for everything: analyze documents, create study plans, generate flashcards, reschedule tasks. All AI changes go through a Proposal → Review → Apply flow — the system suggests, you decide.

**⏰ Time Blocks** — Define your weekly study/sleep schedule. AI automatically respects your available time when scheduling. Supports single-day overrides and midnight-crossing blocks.

**📊 Statistics** — Streaks, completion rates, weekly/monthly reviews. Passive tracking only — no monitoring, no guilt.

**📝 Daily Brief** — Today's tasks at a glance, review cards due, study schedule overview.

**📄 Document Management** — Upload PDFs, DOCX, PPTX. Dual-channel parsing (text extraction + OCR fallback). AI can reference your materials when creating study plans.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite 5 |
| State | Zustand |
| Backend | Node.js + Express 4 + TypeScript |
| Database | SQLite (better-sqlite3), WAL mode |
| AI Chat | Anthropic Claude API |
| Embeddings | Voyage AI (voyage-4, 1024-dim) |
| Vector Search | sqlite-vec |
| Full-Text Search | SQLite FTS5 |
| Spaced Repetition | ts-fsrs (FSRS algorithm) |
| Math Rendering | KaTeX |
| i18n | i18next (English + Chinese) |

---

## Getting Started

### Prerequisites

- **Node.js** 18+ (tested with 20.x)
- **npm** 9+
- **Anthropic API Key** — get one at [console.anthropic.com](https://console.anthropic.com)
- **Voyage AI API Key** (optional, for semantic search) — get one at [dash.voyageai.com](https://dash.voyageai.com)

### Installation

```bash
# Clone the repo
git clone https://github.com/Coinsides/Coincides.git
cd Coincides

# Install all dependencies (root + server + client)
npm run setup
```

### Configuration

Create a `.env` file in the `server/` directory:

```bash
# server/.env

# Required — Anthropic API key for Mr. Zero
ANTHROPIC_API_KEY=sk-ant-xxxxx

# Optional — Voyage AI for semantic search & RAG
VOYAGE_API_KEY=pa-xxxxx

# Optional — Server port (default: 3001)
PORT=3001
```

### Running

```bash
# Terminal 1 — Start the backend
npm run dev:server

# Terminal 2 — Start the frontend
npm run dev:client
```

Or run both at once:

```bash
npm run dev:all
```

Then open **http://localhost:5173** in your browser.

### First Launch

1. Register an account (data stays local in SQLite)
2. Follow the onboarding: create a course → upload materials → set your time blocks → let AI plan
3. Start chatting with Mr. Zero to build your study plan

---

## Project Structure

```
Coincides/
├── client/              # React frontend
│   ├── src/
│   │   ├── components/  # Reusable components
│   │   ├── pages/       # Route pages (Calendar, DailyBrief, etc.)
│   │   ├── stores/      # Zustand state stores
│   │   └── locales/     # i18n translations (en/zh)
├── server/              # Express backend
│   ├── src/
│   │   ├── agent/       # AI agent (system prompt, tools, scheduling)
│   │   ├── db/          # SQLite schema, migrations
│   │   ├── embedding/   # Voyage AI integration
│   │   └── routes/      # REST API endpoints
├── shared/              # Shared TypeScript types
│   └── types/
└── docs/                # Project documentation
    ├── PRD.md
    ├── ARCHITECTURE.md
    ├── DATA_MODEL.md
    └── releases/        # Version plans & changelogs
```

---

## Design Principles

Three rules that cannot be broken:

1. **Never decide for the user** — AI only breaks down, suggests, and executes
2. **Never monitor the user** — No time tracking, no energy judgment, no unsolicited content
3. **Never create frustration** — No locked schedules, no failure reviews, zero penalty for skipping tasks

---

## Documentation

All project docs live in `/docs`:

- [PRD.md](docs/PRD.md) — Product Requirements
- [ARCHITECTURE.md](docs/ARCHITECTURE.md) — Technical Architecture
- [DATA_MODEL.md](docs/DATA_MODEL.md) — Database Schema
- [Coincides-Roadmap.md](docs/Coincides-Roadmap.md) — Development Roadmap

---

## License

MIT
