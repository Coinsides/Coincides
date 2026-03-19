# Coincides — Technical Architecture

**Version**: 1.0
**Created**: 2026-03-17
**Updated**: 2026-03-18

---

## 1. System Overview

```
┌─────────────────────────────────────────────────┐
│                   Client (Browser)               │
│                                                   │
│  React 18 + TypeScript + Vite 5                   │
│  ├── Pages (8: DailyBrief, Calendar, Decks, etc.) │
│  ├── Agent Panel (floating, Ctrl+J)               │
│  ├── KaTeX (LaTeX rendering)                      │
│  ├── Zustand (state management, 16 stores)        │
│  ├── CSS Modules + Glassmorphism design           │
│  ├── lucide-react (icons)                         │
│  └── date-fns (date utilities)                    │
│                                                   │
└──────────────────┬──────────────────────────────┘
                   │ REST API (JSON) + SSE (Agent streaming)
                   ▼
┌─────────────────────────────────────────────────┐
│                   Server (Node.js)               │
│                                                   │
│  Express 4 + TypeScript (jiti runtime)             │
│  ├── Auth middleware (JWT)                         │
│  ├── REST API routes (18 modules)                 │
│  ├── Agent orchestrator                           │
│  │   ├── Anthropic Claude (Haiku 4.5 / Sonnet 4)  │
│  │   ├── 18+ function tools                       │
│  │   ├── Memory manager (short + long term)       │
│  │   └── Proposal engine                          │
│  ├── Document processor                           │
│  │   ├── pdf-parse (native PDF text extraction)   │
│  │   ├── Claude Haiku Vision (scanned/image PDF)  │
│  │   ├── mammoth (DOCX), xlsx (Excel)             │
│  │   └── Direct read (TXT), Vision API (images)   │
│  ├── Embedding pipeline                           │
│  │   ├── Voyage AI voyage-4 (1024d embeddings)    │
│  │   └── sqlite-vec v0.1.7 (vector storage + KNN) │
│  ├── FTS5 (full-text search, content-sync mode)   │
│  ├── FSRS engine (ts-fsrs)                        │
│  └── SQLite via better-sqlite3 (WAL mode)         │
│                                                   │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│              SQLite Database (Local)              │
│  coincides.db — 20 tables + 4 virtual tables     │
└─────────────────────────────────────────────────┘
                   │
              (API calls)
                   ▼
┌─────────────────────────────────────────────────┐
│           External AI Services                    │
│  Anthropic Claude (chat + Vision OCR)             │
│  Voyage AI (text embedding)                       │
│  Note: OpenAI provider exists but excluded in v1.0│
└─────────────────────────────────────────────────┘
```

---

## 2. Technology Choices & Rationale

### 2.1 Frontend: React + TypeScript + Vite

**Why React:**
- Largest ecosystem for component libraries, UI primitives
- Component model fits well: Card, Task, Calendar, Agent Panel are all natural components
- Zustand for state management handles complex UI state (open panels, filters, edit modes)

**Why TypeScript:**
- Product-grade application. Type safety prevents entire categories of bugs.
- Shared types between frontend and backend (shared `types/` directory)

**Why Vite:**
- Fast development builds (HMR in milliseconds)
- Optimized production builds
- Native ESM support
- `base: './'` configured for portable deployment

### 2.2 Backend: Node.js + Express + TypeScript

**Why Node.js:**
- Same language (TypeScript) as frontend — shared types, shared logic
- Excellent for I/O-heavy workloads (API calls to AI providers, file processing)
- Student can run it locally with a single `npm start`

**Why Express:**
- Minimal, unopinionated — we control the architecture
- Most documented and understood Node.js framework

**Runtime:** jiti (TypeScript execution without compilation step; replaced tsx in v1.3.1 due to Windows ESM compatibility issues)

### 2.3 Database: SQLite via better-sqlite3

**Why SQLite:**
- **Zero setup**: No database server to install. The entire database is a single file.
- **Local-first**: Data lives on the user's machine. Full privacy.
- **Portable**: Copy the .db file and you have a complete backup.
- **WAL mode**: Enabled for better concurrent read performance.
- **Foreign keys**: Enabled for referential integrity.

**Why better-sqlite3 (not sqlite3 or Prisma):**
- Synchronous API — simpler code, no callback hell
- Significantly faster than the async `sqlite3` package
- Direct SQL — full control, no ORM abstraction hiding performance issues
- Prepared statements for security and performance

### 2.4 AI Providers

**Anthropic Claude** — Primary chat + OCR provider
- `claude-haiku-4-5-20251001` — Default model for Agent conversation + Vision OCR
- `claude-sonnet-4-20250514` — Available for heavier tasks
- Used via `@anthropic-ai/sdk`

**Voyage AI** — Embedding provider
- `voyage-4` model, 1024 dimensions, $0.06/M tokens
- Used for document chunk and agent memory vectorization

**Provider abstraction layer:**
```typescript
// server/src/agent/providers/
AnthropicProvider — Implements streaming chat + function calling
OpenAIProvider — Code exists but excluded from v1.0 (user cannot bind payment)
```

**API key priority:** `User Settings > .env environment variable > Error`

Both documentParser and embedding modules follow this priority. Keys are stored as plaintext in the user's `settings` JSON field (not encrypted).

### 2.5 Document Processing

All document processing is done in Node.js — no Python required.

**Supported formats:**
| Format | Library | Method |
|--------|---------|--------|
| PDF (digital) | pdf-parse | Native text extraction |
| PDF (scanned/image) | Claude Haiku 4.5 Vision | Send page images in batches of 50 |
| DOCX | mammoth | HTML → text conversion |
| XLSX | xlsx | Sheet → text extraction |
| Images (PNG/JPG) | Claude Haiku 4.5 Vision | Direct OCR via Vision API |
| TXT | Node.js fs | Direct read |

**PDF auto-detection logic:**
```
1. Attempt text extraction via pdf-parse
2. If extracted text < threshold → classify as scanned
   → Split into page images via pdf-lib
   → Send to Claude Haiku 4.5 Vision API (50 pages per batch)
3. Long documents chunked for embedding storage
```

### 2.6 Embedding + Vector Search

**Pipeline:** Document text → chunk → Voyage AI embedding → sqlite-vec storage

- **Voyage AI voyage-4**: 1024-dimensional embeddings
- **sqlite-vec v0.1.7**: Vector storage as `vec0` virtual tables, KNN via `vec_distance_cosine`
- **Graceful degradation**: If no embedding provider configured, falls back to text-only search

**Three-way hybrid search (for both documents and memories):**
```
Priority 1: Semantic vector search (Voyage AI + sqlite-vec KNN)
    ↓ if results insufficient
Priority 2: FTS5 full-text search (BM25 ranking)
    ↓ if results insufficient
Priority 3: LIKE keyword search (last resort)
    → Auto-deduplicate across all three result sets
```

### 2.7 FTS5 Full-Text Search

- Two FTS5 virtual tables: `document_chunks_fts`, `agent_memories_fts`
- Content-sync mode: triggers automatically sync INSERT/DELETE/UPDATE
- Backfill on startup: if FTS count < source count, runs `'rebuild'`
- Used as fallback when vector search unavailable or returns insufficient results

### 2.8 Spaced Repetition: ts-fsrs

- Official TypeScript implementation of FSRS algorithm
- MIT licensed
- Handles: scheduling, difficulty calculation, stability tracking
- Integrated with the Card table's `fsrs_*` fields

### 2.9 LaTeX Rendering: KaTeX

**Why KaTeX over MathJax:**
- 100x faster rendering
- Smaller bundle size
- Covers 95%+ of math notation students need

Card content is stored with LaTeX markup, rendered client-side via KaTeX. Students can write LaTeX directly or use the preview in card creation modal.

### 2.10 Statistics Visualization

Statistics are rendered using custom CSS and SVG — no external charting library is used. This includes:
- Task completion rate displays
- Study streak tracking
- Per-course breakdowns
- Motivational messages based on actual data

---

## 3. Project Structure

```
Coincides/
├── docs/                    # Project documentation (see docs/README.md)
│   ├── README.md            # Documentation index
│   ├── PRD.md, DATA_MODEL.md, ARCHITECTURE.md
│   ├── DELIVERY_PLAN.md, Coincides-Roadmap.md
│   ├── workflow/            # Workflow + Onboarding docs
│   └── changelog/           # Per-version changelogs
├── client/                  # Frontend (React + TypeScript + Vite)
│   ├── src/
│   │   ├── App.tsx          # HashRouter route definitions
│   │   ├── main.tsx         # Entry point
│   │   ├── services/api.ts  # Axios + JWT interceptors
│   │   ├── stores/          # 16 Zustand stores
│   │   ├── pages/           # 8 page components
│   │   │   ├── Auth/, DailyBrief/, Courses/
│   │   │   ├── Decks/, Goals/, Calendar/
│   │   │   ├── Review/, Statistics/, Settings/
│   │   └── components/      # Reusable components
│   │       ├── AgentPanel/  # AI chat panel (Ctrl+J)
│   │       ├── CardFlip/    # 3D flip card
│   │       ├── CardModal/   # Card create/edit
│   │       ├── DocumentManager/
│   │       ├── TagGroupManager/
│   │       └── KaTeX/       # LaTeX renderer
│   ├── vite.config.ts       # base: './'
│   └── package.json
├── server/                  # Backend (Node.js + Express)
│   ├── src/
│   │   ├── index.ts         # Express entry, port 3001
│   │   ├── db/
│   │   │   ├── schema.sql   # 20 tables + indexes
│   │   │   └── init.ts      # DB init + FTS5 + sqlite-vec + seeds
│   │   ├── routes/          # 18 route modules
│   │   ├── agent/
│   │   │   ├── orchestrator.ts    # SSE streaming, max 5 tool rounds
│   │   │   ├── system-prompt.ts   # System prompt builder
│   │   │   ├── providers/         # Anthropic + OpenAI adapters
│   │   │   ├── tools/
│   │   │   │   ├── definitions.ts # 18+ function tool definitions
│   │   │   │   └── executor.ts    # Tool executor (hybrid search)
│   │   │   └── memory/manager.ts  # Short + long term memory
│   │   ├── embedding/
│   │   │   ├── index.ts           # Embedding pipeline entry
│   │   │   ├── voyage.ts          # Voyage AI client
│   │   │   ├── vectorStore.ts     # sqlite-vec + three-way search
│   │   │   └── types.ts
│   │   ├── services/
│   │   │   └── documentParser.ts  # Multi-format parser
│   │   └── middleware/            # auth, errorHandler, upload
│   └── package.json
├── shared/
│   └── types/index.ts       # Frontend + backend shared types
├── .env                     # ANTHROPIC_API_KEY + VOYAGE_API_KEY
├── .gitignore
└── package.json             # Root: npm run setup, install:all
```

---

## 4. API Design (Key Endpoints)

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | /api/auth/register | Create account |
| POST | /api/auth/login | Login, receive JWT |
| GET | /api/auth/me | Get current user |

### Courses
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/courses | List all courses |
| POST | /api/courses | Create course |
| PUT | /api/courses/:id | Update course |
| DELETE | /api/courses/:id | Delete course (cascades) |

### Tasks
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/tasks?date=YYYY-MM-DD | Get tasks for a date |
| GET | /api/tasks?from=...&to=... | Get tasks in date range |
| POST | /api/tasks | Create task |
| PUT | /api/tasks/:id | Update task |
| DELETE | /api/tasks/:id | Delete task |
| PUT | /api/tasks/reorder | Reorder tasks (drag-and-drop) |

### Goals
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/goals | List goals |
| POST | /api/goals | Create goal |
| PUT | /api/goals/:id | Update goal |
| DELETE | /api/goals/:id | Delete goal |

### Decks & Cards
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/decks | List decks |
| POST | /api/decks | Create deck |
| PUT | /api/decks/:id | Update deck |
| DELETE | /api/decks/:id | Delete deck |
| GET | /api/cards?deck_id=... | List cards in deck |
| POST | /api/cards | Create card |
| PUT | /api/cards/:id | Update card |
| DELETE | /api/cards/:id | Delete card |
| PUT | /api/cards/reorder | Reorder cards |

### Sections
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/sections?deck_id=... | List sections in deck |
| POST | /api/sections | Create section |
| PUT | /api/sections/:id | Update section |
| DELETE | /api/sections/:id | Delete section |

### Tags & Tag Groups
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/tags | List user's tags |
| POST | /api/tags | Create tag |
| GET | /api/tag-groups?course_id=... | List tag groups |
| POST | /api/tag-groups | Create tag group |

### Documents
| Method | Path | Description |
|--------|------|-------------|
| POST | /api/documents/upload | Upload + auto-parse document |
| GET | /api/documents?course_id=... | List documents |
| GET | /api/documents/:id | Get document details + text |
| DELETE | /api/documents/:id | Delete document |

### Embedding
| Method | Path | Description |
|--------|------|-------------|
| POST | /api/embedding/search | Semantic search documents |
| GET | /api/embedding/status | Check embedding provider status |

### Agent
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/conversations | List conversations |
| POST | /api/conversations | Create conversation |
| POST | /api/conversations/:id/messages | Send message (SSE streaming) |
| GET | /api/conversations/:id/messages | Get conversation messages |

### Proposals
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/proposals | List proposals |
| POST | /api/proposals/:id/apply | Apply a proposal |
| POST | /api/proposals/:id/discard | Discard a proposal |

### Review
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/review/due | Get cards due for review |
| POST | /api/review/:cardId | Submit review result (FSRS) |

### Daily Brief & Status
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/daily-brief | Aggregated daily view |
| GET | /api/daily-status | Get today's status |
| POST | /api/daily-status | Set energy level |

### Statistics & Study Templates
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/statistics/overview | Overview stats |
| GET | /api/study-templates | List study mode templates |

### Settings
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/settings | Get user settings |
| PUT | /api/settings | Update settings |

---

## 5. Security Considerations

- **JWT Authentication**: All API routes (except auth) require valid JWT in-memory token
- **API Key Storage**: Keys stored as plaintext in user's `settings` JSON field. Future improvement: encrypt at rest.
- **Input Validation**: All inputs validated and sanitized (zod schemas)
- **SQL Injection Prevention**: Parameterized queries via better-sqlite3 prepared statements
- **CORS**: Configured to allow only the frontend origin
- **File Upload**: Size limits (multer), type validation, sandboxed storage in `uploads/` directory

---

## 6. Deployment (Local)

For the student to run on Windows 11:

### Prerequisites
- Node.js 22.x LTS (Node 25 has known ESM compatibility issues on Windows)
- No Python required (all processing is Node.js native)

### Setup
```bash
# Clone the repository
git clone https://github.com/Coinsides/Coincides.git
cd Coincides

# Install all dependencies (root + server + client)
npm run setup

# Create .env file with API keys
# ANTHROPIC_API_KEY=sk-ant-...
# VOYAGE_API_KEY=pa-...

# Start backend (Terminal 1) — must run from project root
node --import jiti/register server/src/index.ts
# → Running on http://localhost:3001

# Start frontend (Terminal 2)
cd client && npm run dev
# → Running on http://localhost:5173
```

**Important:**
- Server must be started from project root directory (dotenv reads .env from cwd)
- `npm run setup` = `npm run install:all` = installs root + server + client dependencies
- sqlite-vec and better-sqlite3 are native modules; if Node.js version changes after `git pull`, run `npm rebuild` or `npm run setup`
- API keys can also be entered in the Settings page (takes priority over .env)
