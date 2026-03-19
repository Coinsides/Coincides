# Coincides

**AI-Powered Learning Operating System**

Coincides helps students organize their entire semester through intelligent study planning. An AI agent named **Mr. Zero** analyzes your lecture notes, generates study plans, creates knowledge cards, and manages your schedule — all through natural conversation.

Built around the **Minimum Working Flow** philosophy: maintain learning continuity through a small daily minimum, not cramming.

![Status](https://img.shields.io/badge/version-1.3.1-blue)
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

- **Node.js** 22.x (LTS) — download at [nodejs.org](https://nodejs.org). Node 25 has known ESM compatibility issues on Windows.
- **npm** 9+ (comes with Node.js)
- **Anthropic API Key** — sign up at [console.anthropic.com](https://console.anthropic.com), go to API Keys and create one
- **Voyage AI API Key** (optional, enables semantic search) — sign up at [dash.voyageai.com](https://dash.voyageai.com)

### 1. Clone & Install

```bash
# Clone the repo
git clone https://github.com/Coinsides/Coincides.git
cd Coincides

# Install all dependencies (root + server + client)
npm run setup
```

### 2. Configure API Keys

Create a file called `.env` in the **project root** folder (not inside server/):

```
# .env (project root)

# Required — Anthropic API key for the AI agent (Mr. Zero)
ANTHROPIC_API_KEY=sk-ant-api03-xxxxx

# Optional — Voyage AI key for semantic search & document RAG
VOYAGE_API_KEY=pa-xxxxx
```

> **How to get an Anthropic key:** Go to [console.anthropic.com](https://console.anthropic.com) → Sign up → API Keys → Create Key. You need to add credit to your account for API usage.
>
> **Note:** The `.env` file must be in the project root, not inside `server/`. The server reads it from `cwd` using dotenv.

### 3. Start the App

You need **two terminal windows** (or two tabs):

**Terminal 1 — Start the backend:**

```bash
cd Coincides
node --import jiti/register server/src/index.ts
```

You should see: `Server running on port 3001`

**Terminal 2 — Start the frontend:**

```bash
cd Coincides/client
npm run dev
```

You should see: `Local: http://localhost:5173/`

### 4. Open in Browser

Go to **http://localhost:5173** — you're in.

### 5. First Time Setup

1. **Register** — Create an account (everything stays on your computer, no cloud)
2. **Create a course** — e.g. "Linear Algebra"
3. **Upload materials** — Drop your lecture PDFs or notes
4. **Set your schedule** — Drag on the calendar to mark when you study (optional)
5. **Talk to Mr. Zero** — Ask the AI to build you a study plan. It will create a Proposal for you to review and approve.

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
