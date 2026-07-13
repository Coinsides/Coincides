> **状态 (Status)**: active
> **层 (Layer)**: 现状 / Current-State
> **日期 (Updated)**: 2026-07-13
> **权威 (Authoritative)**: 是 / Yes
> **取代 (Supersedes)**: —
> **被取代 (Superseded by)**: —

# Coincides — Current State

**Primary audience: the agents working in this repo (Claude + Codex).** This is a *living* document. It describes what is **true right now**, and it changes often. When a summary elsewhere (e.g. `AGENT_CONTEXT.md`) disagrees with this folder, **this folder wins**.

Read before any non-trivial work, together with `PRODUCT.md`, `../DOCUMENTATION-SYSTEM.md`, and the `active` ADRs in `../decisions/`.

---

## 1. Main line & version

> **2026-07-11 authoritative override:** V2.BN.8 Canvas Engine is closed, V2.BN.9 Purpose Foundation is complete, and the V2.BN.10 Source Floor is engineering-complete. V2.BN.10.1–10.5 are implemented and pass automated engineering gates; the combined V2.BN.10.4 + 10.5 third-party browser journey remains pending, so V2.BN.10 is not yet fully closed. Older lines that route directly from 8.11 to ContentGroup projection are stale.

- **Main-line branch**: `codex/v2-bn-canvas-engine` ("Better Notebook" line). Fastest-moving and the real main line — not a side branch, not "finish-then-merge-back".
- **Version system**: `V2.BN.x`. The old `v2.0–v2.5.6` line is a **closed engineering-foundation roadmap** (`docs/Coincides-Roadmap.md`); some of its product philosophy is outdated (notably **block-first**, now replaced by **TextFlow-first / ContentGroup-aware**).
- **Current frontier**: combined `V2.BN.10.4 + 10.5` Source experience / lifecycle browser closure gate（工程实现已完成；在 handoff 返回结论前不伪写成 V2.BN.10 fully closed）。
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
- **V2.BN.11 拍定（2026-07-13 记）**: **Petal / Fragment 精修层退役** — `V2.BN.11.1` 代码手术停止产生新数据（client 模型/CRUD/Single Editor 花瓣入口 → server hydrate/replace/prune）,migration 047 删除三张支持表（034 全家:fragments / petals / petal_fragments）。ContentGroup 的新定位 = **Item（独立知识卡）的捆绑/组织方式**;`content_group_members` 增 `item_id` 成员类（原子包 B）、`purpose_members` 增 `member_kind='item'`（原子包 A）。权威:概念设计 v1.1 + `docs/releases/V2.BN.11-plan.md`。
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
- **V2.BN.10.2 complete (2026-07-11)**: managed multipart temp intake, format/magic validation, server-authoritative SHA-256, staging-to-ready blob commit, hash deduplication with cross-Project placement, safe list/detail/blob endpoints, typed missing-blob diagnostics, and startup reconciliation sweep.
- **V2.BN.10.3 complete (2026-07-11)**: versioned transient `source-artifact.v1`; PDF/DOCX/TXT/Markdown/image parser registry and resource/error gates; conditional claim/retry and startup recovery; atomic text/image SourceProjection publication; server write guards, client read-only policy seam, and legacy scanner exclusion.
- **V2.BN.10.4 engineering-complete (2026-07-11; browser gate pending)**: real Source Library and Project Sources share one DTO/status/open/upload path; client hash precheck and automatic materialize trigger; active-only visibility-aware polling; authenticated original preview/download; search/type/status filters; cross-Project dedup placement visibility; legacy Documents intake retired; SourceProjection title/text/layout/object controls visibly locked while Annotation/ContentGroup/Purpose seams remain.
- **V2.BN.10.5 engineering-complete (2026-07-11; combined browser gate pending)**: Project deletion now has an impact query, server-derived dynamic default and explicit delete-projection / move-to-Home branches; Source hard delete uses same-volume quarantine, DB compensation and durable managed-file cleanup retry; receipt FKs degrade with `SET NULL` while excerpt/locator/mode survive; course-scoped tables are covered by a machine-checked lifecycle registry; Source and Project deletion dialogs expose these consequences before mutation.
- **Not yet built**: legacy Documents / SourceAnchor / SourceSnapshot migration, Source replacement/rebuild/publication, and a user-facing cleanup-job operations surface. Deleting a Source with an active materialization is deliberately blocked rather than cancelling the run. The combined 10.4 + 10.5 browser/adversarial result remains pending in its `to: claude` handoff.

### Pillar 4 — Agent + Graph Database
- **Not started** on the v2/BN line. The embedding pipeline is intentionally disconnected; relation runtime / GraphRAG are not yet timely.
- **但注意（2026-07-13）**: **V2.BN.11 Item + Relation 真相层已进入施工线**（概念设计 v1.1 判断点 a–k 全拍;plan 七纵切已审 PASS）——端点=Item、判断收据（快照对）、机械新鲜度读时派生。这是**知识真相层**,不是本柱的图谱运行时/GraphRAG（后者仍属 Agent 时代,sidecar 教义不变）。
- Do **not** build toward this pillar until pillars 1–3 are stable.

## 4. Watch list (known open items, not necessarily defects)

- **Source closure gate** — 10.4/10.5 expose the durable Source states and deletion lifecycles through shared client models; third-party browser review must still verify real file journeys, authenticated blob opening, cross-Project dedup visibility, SourceProjection lock, Project dynamic delete defaults, move-to-Home preservation, Source hard-delete warnings, and Console/Network cleanliness.
- **TextFlow Typography** — baseline exists, but rich inline style truth and measured pagination remain unfrozen.
- **Contract layer** — most `docs/contracts/` files are `draft` / `deferred`; do not treat them as authoritative until marked `frozen`.
- **UI-mode growth** (Page / Canvas / ContentGroup / Gallery / Rail / Editor) — growing but currently controlled.
- **Embedding pipeline** — disconnected **by design** (pillar 4), not a bug.
- **TextFlow-in-transformed-canvas** — load-bearing assumption of the self-owned hybrid engine; recommend a minimal spike before scaling 8.8 (see ADR-0001).

## 5. Maintenance

Updating this folder is part of every `V2.BN.x` **definition of done**. If a version changes pillar status, the version is not "done" until this folder reflects it.
