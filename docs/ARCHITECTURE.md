# Coincides — Technical Architecture

**Version**: 0.1 (Draft)
**Created**: 2026-03-17

---

## 1. System Overview

```
┌─────────────────────────────────────────────────┐
│                   Client (Browser)               │
│                                                   │
│  React + TypeScript + Vite                        │
│  ├── Pages (Daily Brief, Calendar, Cards, etc.)   │
│  ├── Agent UI (floating panel)                    │
│  ├── KaTeX (LaTeX rendering)                      │
│  ├── MathQuill (visual formula editor)            │
│  ├── Chart.js (statistics visualization)          │
│  └── Service Worker (offline caching)             │
│                                                   │
└──────────────────┬──────────────────────────────┘
                   │ REST API (JSON)
                   ▼
┌─────────────────────────────────────────────────┐
│                   Server (Node.js)               │
│                                                   │
│  Express.js + TypeScript                          │
│  ├── Auth middleware (JWT)                         │
│  ├── REST API routes                              │
│  ├── Agent orchestrator                           │
│  │   ├── Provider abstraction layer               │
│  │   ├── Function calling executor                │
│  │   ├── Memory manager                           │
│  │   └── Proposal engine                          │
│  ├── Document processor                           │
│  │   ├── Channel detector                         │
│  │   ├── Marker (native PDF)                      │
│  │   └── PaddleOCR (scanned PDF)                  │
│  ├── FSRS engine (ts-fsrs)                        │
│  └── SQLite via better-sqlite3                    │
│                                                   │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│              SQLite Database (Local)              │
│  coincides.db                                     │
└─────────────────────────────────────────────────┘
                   │
              (API calls)
                   ▼
┌─────────────────────────────────────────────────┐
│           External AI Providers                   │
│  OpenAI / Anthropic / Google / Compatible APIs    │
└─────────────────────────────────────────────────┘
```

---

## 2. Technology Choices & Rationale

### 2.1 Frontend: React + TypeScript + Vite

**Why React:**
- Largest ecosystem for component libraries, UI primitives
- Component model fits well: Card, Task, Calendar, Agent Panel are all natural components
- React's state management (zustand or jotai) handles complex UI state (open panels, filters, edit modes)
- Abundant open-source calendar, chart, and editor components

**Why TypeScript:**
- This is a product-grade application. Type safety prevents entire categories of bugs.
- Shared types between frontend and backend (shared `types/` directory)

**Why Vite:**
- Fast development builds (HMR in milliseconds)
- Optimized production builds
- Native ESM support
- Simple configuration

### 2.2 Backend: Node.js + Express + TypeScript

**Why Node.js:**
- Same language (TypeScript) as frontend — shared types, shared logic
- Excellent for I/O-heavy workloads (API calls to AI providers, file processing)
- Massive package ecosystem (PDF parsing, crypto, auth libraries)
- Student can run it locally with a single `npm start`

**Why Express:**
- Minimal, unopinionated — we control the architecture
- Most documented and understood Node.js framework
- Easy for future contributors to understand

**Why not Next.js or similar fullstack framework:**
- This application has distinct frontend and backend concerns
- The backend does heavy processing (PDF parsing, Agent orchestration) that benefits from clean separation
- Keeping them separate makes it possible to eventually deploy the backend independently

### 2.3 Database: SQLite via better-sqlite3

**Why SQLite:**
- **Zero setup**: No database server to install. The entire database is a single file.
- **Local-first**: Data lives on the user's machine. Full privacy.
- **Portable**: Copy the .db file and you have a complete backup.
- **Fast enough**: For a single-user or small multi-user application, SQLite handles thousands of queries per second.
- **Reliable**: SQLite is the most deployed database engine in the world.

**Why better-sqlite3 (not sqlite3 or Prisma):**
- Synchronous API — simpler code, no callback hell
- Significantly faster than the async `sqlite3` package
- Direct SQL — full control, no ORM abstraction hiding performance issues
- Prepared statements for security and performance

**Migration path to PostgreSQL:**
- If the application scales to many users, the SQL is standard enough to migrate
- The data access layer will use a thin abstraction (repository pattern) to make this swap feasible

### 2.4 AI Provider Abstraction

```typescript
interface AIProvider {
  name: string;
  chat(messages: Message[], tools?: Tool[]): Promise<AIResponse>;
  chatStream(messages: Message[], tools?: Tool[]): AsyncGenerator<AIChunk>;
}

class OpenAIProvider implements AIProvider { ... }
class AnthropicProvider implements AIProvider { ... }
class GenericOpenAIProvider implements AIProvider { ... }  // For any OpenAI-compatible API
```

**Why abstraction layer:**
- User can switch providers without any code change
- Future providers added by implementing one interface
- Function calling / tool use normalized across providers (OpenAI and Anthropic have different formats)

**API key security:**
- Keys stored encrypted in the database (AES-256)
- Decrypted only in memory when making API calls
- Never sent to frontend; frontend triggers actions, backend executes with stored keys

### 2.5 PDF Processing

**Marker (Channel A — Native PDFs):**
- Open source, 15k+ GitHub stars
- Handles LaTeX, tables, code blocks, multi-column layouts
- Outputs structured Markdown
- Runs as a Python subprocess called from Node.js

**PaddleOCR (Channel B — Scanned PDFs):**
- Best spatial structure preservation among OCR engines
- Handles Chinese and English text
- Called as a Python subprocess

**Auto-detection logic:**
```
1. Attempt text extraction via Marker
2. If extracted text length < (page_count * 100 characters):
   → Classify as scanned → Route to PaddleOCR
3. For math formula regions detected by layout analysis:
   → Send region image to Vision API → Get LaTeX output
```

**Note:** Both Marker and PaddleOCR are Python tools. They will be installed in a Python virtual environment alongside the Node.js application. Node.js calls them via `child_process.spawn`.

### 2.6 Spaced Repetition: ts-fsrs

- Official TypeScript implementation of FSRS algorithm
- MIT licensed
- Handles: scheduling, difficulty calculation, stability tracking
- We wrap it in a `ReviewEngine` class that interfaces with our Card table

### 2.7 LaTeX Rendering: KaTeX

**Why KaTeX over MathJax:**
- 100x faster rendering
- Server-side rendering capable (for offline caching)
- Smaller bundle size
- Covers 95%+ of math notation students need

### 2.8 Visual Formula Editor: MathQuill (or math-field)

- Students type naturally; the editor renders LaTeX in real-time
- Output is LaTeX source code (stored in card content)
- Displayed via KaTeX
- Student never sees raw LaTeX unless they choose to

### 2.9 Charts: Chart.js

- Lightweight, well-documented
- Covers all our needs: line charts (trends), bar charts (completion), calendar heatmap (streaks)
- Animated, responsive

---

## 3. Project Structure

```
Coincides/
├── docs/                    # Project documentation
│   ├── PRD.md
│   ├── DATA_MODEL.md
│   ├── ARCHITECTURE.md
│   ├── DELIVERY_PLAN.md
│   └── CHANGELOG.md
├── client/                  # Frontend (React + TypeScript)
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/           # Page-level components
│   │   │   ├── DailyBrief/
│   │   │   ├── Calendar/
│   │   │   ├── Cards/
│   │   │   ├── Goals/
│   │   │   ├── Documents/
│   │   │   ├── Statistics/
│   │   │   └── Settings/
│   │   ├── features/        # Feature-specific logic
│   │   │   ├── agent/       # Agent panel UI + chat logic
│   │   │   ├── cards/       # Card flip, review mode, editor
│   │   │   └── calendar/    # Calendar views
│   │   ├── hooks/           # Custom React hooks
│   │   ├── stores/          # State management (zustand)
│   │   ├── services/        # API client functions
│   │   ├── types/           # Shared TypeScript types
│   │   ├── utils/           # Utilities
│   │   └── styles/          # Global styles, theme
│   ├── public/
│   ├── index.html
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── package.json
├── server/                  # Backend (Node.js + Express)
│   ├── src/
│   │   ├── routes/          # Express route handlers
│   │   ├── middleware/       # Auth, error handling
│   │   ├── services/        # Business logic
│   │   │   ├── agent/       # Agent orchestration
│   │   │   │   ├── providers/    # AI provider implementations
│   │   │   │   ├── tools/        # Function definitions for Agent
│   │   │   │   ├── memory/       # Long-term memory manager
│   │   │   │   └── proposal/     # Proposal generation & management
│   │   │   ├── documents/   # PDF processing pipeline
│   │   │   ├── cards/       # Card CRUD + FSRS integration
│   │   │   └── stats/       # Statistics aggregation
│   │   ├── db/              # Database setup, migrations, queries
│   │   ├── types/           # Shared TypeScript types
│   │   └── utils/           # Utilities (encryption, validation)
│   ├── tsconfig.json
│   └── package.json
├── shared/                  # Shared types between client and server
│   └── types/
├── scripts/                 # Setup, migration, and utility scripts
│   ├── setup.sh             # One-command setup for new users
│   └── migrate.ts           # Database migration runner
├── python/                  # Python environment for PDF processing
│   ├── requirements.txt     # Marker, PaddleOCR dependencies
│   └── process_pdf.py       # PDF processing entry point
├── .gitignore
├── package.json             # Root workspace config
└── README.md
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
| PUT | /api/tasks/:id | Update task (including toggle complete) |
| DELETE | /api/tasks/:id | Delete task |
| POST | /api/tasks/batch | Create multiple tasks (from Proposal) |

### Goals
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/goals?course_id=... | List goals, optionally filtered by course |
| POST | /api/goals | Create goal |
| PUT | /api/goals/:id | Update goal |
| PUT | /api/goals/:id/exam-mode | Toggle exam mode |
| DELETE | /api/goals/:id | Delete goal |

### Cards & Decks
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/decks?course_id=... | List decks |
| POST | /api/decks | Create deck |
| GET | /api/decks/:id/cards?tag=... | List cards in deck, with optional tag filter |
| POST | /api/cards | Create card |
| PUT | /api/cards/:id | Update card |
| POST | /api/cards/:id/review | Submit review result (FSRS update) |
| GET | /api/cards/due | Get cards due for review today |
| POST | /api/cards/batch | Create multiple cards (from Proposal) |

### Documents
| Method | Path | Description |
|--------|------|-------------|
| POST | /api/documents/upload | Upload document |
| GET | /api/documents?course_id=... | List documents |
| GET | /api/documents/:id | Get document details + extracted text |

### Agent
| Method | Path | Description |
|--------|------|-------------|
| POST | /api/agent/chat | Send message, receive response (streaming) |
| GET | /api/agent/conversations | List conversations |
| GET | /api/agent/conversations/:id | Get conversation messages |
| POST | /api/agent/proposals/:id/apply | Apply a proposal |
| POST | /api/agent/proposals/:id/discard | Discard a proposal |

### Statistics
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/stats/daily?date=... | Daily stats |
| GET | /api/stats/range?from=...&to=... | Stats for date range |
| GET | /api/stats/streak | Current streak data |
| GET | /api/stats/course/:id | Per-course statistics |

### Settings
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/settings | Get user settings |
| PUT | /api/settings | Update settings |
| PUT | /api/settings/ai-provider | Update AI provider config |

### Daily Brief
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/daily-brief | Aggregated daily view (tasks + due cards + alerts) |
| POST | /api/daily-status | Set today's energy level |

---

## 5. Security Considerations

- **JWT Authentication**: All API routes (except auth) require valid JWT
- **API Key Encryption**: User's AI provider keys encrypted with AES-256 before storage
- **Input Validation**: All inputs validated and sanitized (zod schemas)
- **SQL Injection Prevention**: Parameterized queries via better-sqlite3 prepared statements
- **CORS**: Configured to allow only the frontend origin
- **Rate Limiting**: Applied to auth routes and Agent chat endpoint
- **File Upload**: Size limits, type validation, sandboxed storage

---

## 6. Deployment (Local)

For the student to run on Windows 11:

### Prerequisites
- Node.js 20+ (LTS)
- Python 3.10+ (for PDF processing)

### Setup (One Command)
```bash
# Clone the repository
git clone https://github.com/Coinsides/Coincides.git
cd Coincides

# Run setup script (installs all dependencies)
npm run setup

# Start the application
npm start
```

`npm start` launches both the backend (Express) and frontend (Vite dev server or built static files).

The application opens at `http://localhost:3000`.

### What `npm run setup` does:
1. Install Node.js dependencies for client and server
2. Create Python virtual environment
3. Install Marker and PaddleOCR in the venv
4. Initialize SQLite database with schema
5. Seed system tags
