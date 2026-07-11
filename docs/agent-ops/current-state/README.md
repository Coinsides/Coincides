> **状态 (Status)**: active
> **层 (Layer)**: 现状 / Current-State
> **日期 (Updated)**: 2026-07-11
> **权威 (Authoritative)**: 是 / Yes
> **取代 (Supersedes)**: —
> **被取代 (Superseded by)**: —

# Coincides — Current State

**Primary audience: the agents working in this repo (Claude + Codex).** This is a *living* document. It describes what is **true right now**, and it changes often. When a summary elsewhere (e.g. `AGENT_CONTEXT.md`) disagrees with this folder, **this folder wins**.

Read before any non-trivial work, together with `PRODUCT.md`, `../DOCUMENTATION-SYSTEM.md`, and the `active` ADRs in `../decisions/`.

---

## 1. Main line & version

> **2026-07-11 authoritative override:** V2.BN.8 Canvas Engine is closed, V2.BN.9 Purpose Foundation is complete, and V2.BN.10 Source is active. V2.BN.10.1 Source Identity And Placement Floor is engineering-complete; the next active subversion is **V2.BN.10.2 File Intake And Storage Lifecycle**. Older lines in this file that route directly from 8.11 to ContentGroup projection are stale.

- **Main-line branch**: `codex/v2-bn-canvas-engine` ("Better Notebook" line). Fastest-moving and the real main line — not a side branch, not "finish-then-merge-back".
- **Version system**: `V2.BN.x`. The old `v2.0–v2.5.6` line is a **closed engineering-foundation roadmap** (`docs/Coincides-Roadmap.md`); some of its product philosophy is outdated (notably **block-first**, now replaced by **TextFlow-first / ContentGroup-aware**).
- **Current frontier**: `V2.BN.10.2 File Intake And Storage Lifecycle`（10.1 已建立 Source identity / file / materialization / Project placement 四层地板；尚未开放上传、解析、投影或 Source UI）。
- Roadmap: `docs/Coincides-Better-Notebook-Roadmap.md`.

## 2. Tech snapshot

| Layer | Stack |
|-------|-------|
| Frontend | React 18 + TypeScript + Vite + Zustand; i18n (en / zh) |
| Backend | Node.js + Express + TypeScript; SQLite (better-sqlite3) |
| Shared | TypeScript types in `shared/` |
| Embedding | Voyage AI + sqlite-vec — **present but dormant for the BN line** (see pillar 4) |

## 3. Four pillars — status

Strict dependency order. **Do not work on a later pillar before the earlier ones are stable.**

| # | Pillar | Truth it owns | Status |
|---|--------|---------------|--------|
| 1 | **TextFlow** | Content truth | **Usable core + typography baseline; not frozen** |
| 2 | **ContentGroup** | Knowledge-structure truth | **Core entity layer stable; full integration deferred** |
| 3 | **Canvas Engine** | Spatial / layout truth | **V2.BN.8 engineering-closed; later maturity remains** |
| 4 | **Agent + Graph Database** | — | **Not started** |

### Pillar 1 — TextFlow
- **Built**: custom text editing (textarea + overlay, *not* contenteditable); `TextUnit` model (paragraph / heading / quote / list / todo / toggle / code-line); inline structures (inline formula / code / link / source marker); split / merge / indent / role-change; annotation create + render.
- **Typography baseline complete (V2.BN.8.10)**: font family, size, line height, paragraph spacing, shared measurement estimates, and a selection mini-toolbar exist. Rich selected-range styling, measured Word-like pagination, and a frozen TextFlow contract remain later.

### Pillar 2 — ContentGroup
- **Stable (V2.BN.8.7 result)**: core entity layer `ContentGroup / GroupFolder / Member / Petal / Fragment` (frontend + backend tables + `/api/content-groups`); three surfaces — **Rail = collect**, **Gallery = organize**, **Single Editor = refine**. Stable enough to support projection work.
- **Still growing**: the set of item kinds that can be added to a group is still increasing.
- **Deferred**: projection onto canvas; reuse UI (reference / duplicate / fork / materialize); full Source integration. Current routing places these after Source and Relation foundations rather than immediately after V2.BN.8.

### Pillar 3 — Canvas Engine
- **In progress (V2.BN.8.8, self-owned)**: substantial frontend runtime model — `engineModel`, CanvasObject / CanvasPlacement / ContentMount / PageFrame, viewport, PageStack, block projection, Canvas AI Tree, plus a large contract test. Engine version stamp: `V2.BN.8-self-owned-minimal-hybrid-0`. Route decision: **ADR-0001**.
- **持久化已落地**（更新 2026-06-28，取代旧 "thin/absent"）：`canvas_objects / canvas_placements / content_mounts / page_frame_extensions / canvas_page_collections`（migration 035）+ annotation truths（036）+ block 身份硬化（037）。`PRAGMA foreign_keys=ON`（`server/src/db/init.ts:30`，单连接 singleton）→ FK 级联生效。
- **kind-general 管线已落地（8.11.1.2）**：server 端 kind handler registry + 通用 `saveCanvasObject/deleteCanvasObject` + 通用 PUT/DELETE 路由 + validator discriminatedUnion；**新 kind = 注册一个三元组，核心零 if-kind**。page_frame 仍走专属 collection 路径（generic save/delete 都拒它）。审查结论见 `../handoffs/2026-06-28-canvas-object-kind-general-pipeline.md` §11。
- **generic object live path 已接通**：shape / sticky note / visual connector 已能通过 generic CanvasObject 持久化、runtime hydrate、Canvas 渲染与 AI-readable tree 读取。page_frame 仍走专属 collection 路径（generic save/delete 都拒它）。
- **visual connector 已落地（8.11.6）**：`visual_connector_extensions`（migration 040）保存 visual-only endpoint；endpoint 绑定 CanvasObject，不复用 relation endpoint；`relationKind` 固定为 `visual_only`；删除 endpoint object 会清理引用它的 visual connector。
- **table / structured object 已落地（8.11.8）**：`structured_object_extensions`（migration 042）保存 table.v1 payload；table 作为 `structured-backed CanvasObject` 读写、渲染、编辑单元格、增删行列，并进入 AI-readable tree 的 `structuredRef`。
- **Now**: V2.BN.8 Canvas Engine and Structured Object Family are engineering-closed. The active line has moved through V2.BN.9 Purpose Foundation into V2.BN.10 Source.
- **Open risk**: whether TextFlow can be edited stably inside a pan/zoom-transformed canvas (recorded in ADR-0001).

### Cross-cutting foundation — Source
- **V2.BN.10.1 complete (2026-07-11)**: migration 045 adds `source_records / source_files / source_materializations / source_project_placements`; Source identity is global, Project is a placement lens, and Origin is a retained receipt.
- **Identity seams complete**: per-user hash uniqueness, placement uniqueness, one-run v1 rule, Home system course identity, `notes.note_class`, receipt columns, canvas-backing system classification, and `stale` status roundtrip coverage.
- **Not yet built**: file intake/copy-in, parser execution, atomic projection publication, SourceProjection guards/UI, Course-delete migration policy, Source hard-delete compensation, and legacy Documents migration.

### Pillar 4 — Agent + Graph Database
- **Not started** on the v2/BN line. The embedding pipeline is intentionally disconnected; relation runtime / GraphRAG are not yet timely.
- Do **not** build toward this pillar until pillars 1–3 are stable.

## 4. Watch list (known open items, not necessarily defects)

- **Source lifecycle** — 10.1 is only the identity floor; file/DB crash compensation and materialization atomicity are the next load-bearing gates.
- **TextFlow Typography** — baseline exists, but rich inline style truth and measured pagination remain unfrozen.
- **Contract layer** — most `docs/contracts/` files are `draft` / `deferred`; do not treat them as authoritative until marked `frozen`.
- **UI-mode growth** (Page / Canvas / ContentGroup / Gallery / Rail / Editor) — growing but currently controlled.
- **Embedding pipeline** — disconnected **by design** (pillar 4), not a bug.
- **TextFlow-in-transformed-canvas** — load-bearing assumption of the self-owned hybrid engine; recommend a minimal spike before scaling 8.8 (see ADR-0001).

## 5. Maintenance

Updating this folder is part of every `V2.BN.x` **definition of done**. If a version changes pillar status, the version is not "done" until this folder reflects it.
