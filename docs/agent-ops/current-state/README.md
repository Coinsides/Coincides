> **状态 (Status)**: active
> **层 (Layer)**: 现状 / Current-State
> **日期 (Updated)**: 2026-06-28
> **权威 (Authoritative)**: 是 / Yes
> **取代 (Supersedes)**: —
> **被取代 (Superseded by)**: —

# Coincides — Current State

**Primary audience: the agents working in this repo (Claude + Codex).** This is a *living* document. It describes what is **true right now**, and it changes often. When a summary elsewhere (e.g. `AGENT_CONTEXT.md`) disagrees with this folder, **this folder wins**.

Read before any non-trivial work, together with `PRODUCT.md`, `../DOCUMENTATION-SYSTEM.md`, and the `active` ADRs in `../decisions/`.

---

## 1. Main line & version

> **2026-06-30 update (authoritative override):** `V2.BN.8.11 Structured Object Family` is engineering-closed. Henry skipped `V2.BN.8.11.10 First Structured Family Gate`; `V2.BN.8.11.11 Closure Gate` passed runtime + server verification. The next active version is **V2.BN.8.12 ContentGroup Projection And Reuse**. Any older line in this file saying "next 8.11.3 shape", "next 8.11.6 Visual Connector", "next 8.11.7 image", "next 8.11.8 table", "next 8.11.9 inspector", "next 8.11.10", or "next 8.11.11" is stale.

- **Main-line branch**: `codex/v2-bn-canvas-engine` ("Better Notebook" line). Fastest-moving and the real main line — not a side branch, not "finish-then-merge-back".
- **Version system**: `V2.BN.x`. The old `v2.0–v2.5.6` line is a **closed engineering-foundation roadmap** (`docs/Coincides-Roadmap.md`); some of its product philosophy is outdated (notably **block-first**, now replaced by **TextFlow-first / ContentGroup-aware**).
- **Current frontier**: `V2.BN.8.12 ContentGroup Projection And Reuse`（8.11 Structured Object Family 已工程收口；普通对象管线、shape / sticky / visual connector / image / table / object inspector 已落地；ContentGroup 作为特殊 CanvasObject projection 进入下一线）。
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
| 1 | **TextFlow** | Content truth | **Usable core, not frozen** |
| 2 | **ContentGroup** | Knowledge-structure truth | **Core entity layer stable; projection/reuse/source deferred** |
| 3 | **Canvas Engine** | Spatial / layout truth | **In progress (active dev)** |
| 4 | **Agent + Graph Database** | — | **Not started** |

### Pillar 1 — TextFlow
- **Built**: custom text editing (textarea + overlay, *not* contenteditable); `TextUnit` model (paragraph / heading / quote / list / todo / toggle / code-line); inline structures (inline formula / code / link / source marker); split / merge / indent / role-change; annotation create + render.
- **Not frozen**: **Typography** — font family, size, line height, paragraph spacing are not done yet.

### Pillar 2 — ContentGroup
- **Stable (V2.BN.8.7 result)**: core entity layer `ContentGroup / GroupFolder / Member / Petal / Fragment` (frontend + backend tables + `/api/content-groups`); three surfaces — **Rail = collect**, **Gallery = organize**, **Single Editor = refine**. Stable enough to support projection work.
- **Still growing**: the set of item kinds that can be added to a group is still increasing.
- **Deferred**: projection onto canvas; reuse UI (reference / duplicate / fork / materialize); Source integration.

### Pillar 3 — Canvas Engine
- **In progress (V2.BN.8.8, self-owned)**: substantial frontend runtime model — `engineModel`, CanvasObject / CanvasPlacement / ContentMount / PageFrame, viewport, PageStack, block projection, Canvas AI Tree, plus a large contract test. Engine version stamp: `V2.BN.8-self-owned-minimal-hybrid-0`. Route decision: **ADR-0001**.
- **持久化已落地**（更新 2026-06-28，取代旧 "thin/absent"）：`canvas_objects / canvas_placements / content_mounts / page_frame_extensions / canvas_page_collections`（migration 035）+ annotation truths（036）+ block 身份硬化（037）。`PRAGMA foreign_keys=ON`（`server/src/db/init.ts:30`，单连接 singleton）→ FK 级联生效。
- **kind-general 管线已落地（8.11.1.2）**：server 端 kind handler registry + 通用 `saveCanvasObject/deleteCanvasObject` + 通用 PUT/DELETE 路由 + validator discriminatedUnion；**新 kind = 注册一个三元组，核心零 if-kind**。page_frame 仍走专属 collection 路径（generic save/delete 都拒它）。审查结论见 `../handoffs/2026-06-28-canvas-object-kind-general-pipeline.md` §11。
- **generic object live path 已接通**：shape / sticky note / visual connector 已能通过 generic CanvasObject 持久化、runtime hydrate、Canvas 渲染与 AI-readable tree 读取。page_frame 仍走专属 collection 路径（generic save/delete 都拒它）。
- **visual connector 已落地（8.11.6）**：`visual_connector_extensions`（migration 040）保存 visual-only endpoint；endpoint 绑定 CanvasObject，不复用 relation endpoint；`relationKind` 固定为 `visual_only`；删除 endpoint object 会清理引用它的 visual connector。
- **table / structured object 已落地（8.11.8）**：`structured_object_extensions`（migration 042）保存 table.v1 payload；table 作为 `structured-backed CanvasObject` 读写、渲染、编辑单元格、增删行列，并进入 AI-readable tree 的 `structuredRef`。
- **Now**: 8.11 Structured Object Family 工程收口完成；下一步 **8.12 ContentGroup Projection And Reuse**。
- **Open risk**: whether TextFlow can be edited stably inside a pan/zoom-transformed canvas (recorded in ADR-0001).

### Pillar 4 — Agent + Graph Database
- **Not started** on the v2/BN line. The embedding pipeline is intentionally disconnected; relation runtime / GraphRAG are not yet timely.
- Do **not** build toward this pillar until pillars 1–3 are stable.

## 4. Watch list (known open items, not necessarily defects)

- **Backend canvas persistence** — ✅ 已落地（035-038 + 8.11.1.2/.1.3，均经 Claude 对抗审查）。**仍 watch**：generic 持久化通路 **inert**，8.11.3 须接 data adapter（见 Pillar 3 ⚠️#1）。〔mount join 歧义已由 038 partial unique index 解决〕
- **TextFlow Typography** — unfrozen; blocks freezing the TextFlow contract.
- **Contract layer** — most `docs/contracts/` files are `draft` / `deferred`; do not treat them as authoritative until marked `frozen`.
- **UI-mode growth** (Page / Canvas / ContentGroup / Gallery / Rail / Editor) — growing but currently controlled.
- **Embedding pipeline** — disconnected **by design** (pillar 4), not a bug.
- **TextFlow-in-transformed-canvas** — load-bearing assumption of the self-owned hybrid engine; recommend a minimal spike before scaling 8.8 (see ADR-0001).

## 5. Maintenance

Updating this folder is part of every `V2.BN.x` **definition of done**. If a version changes pillar status, the version is not "done" until this folder reflects it.
