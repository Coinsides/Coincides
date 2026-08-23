> **状态 (Status)**: active
> **层 (Layer)**: 现状 / Current-State
> **日期 (Updated)**: 2026-08-19
> **权威 (Authoritative)**: 是 / Yes
> **取代 (Supersedes)**: —
> **被取代 (Superseded by)**: —

# Coincides — Current State

**Primary audience: the agents working in this repo (Claude + Codex).** This is a *living* document. It describes what is **true right now**, and it changes often. When a summary elsewhere (e.g. `AGENT_CONTEXT.md`) disagrees with this folder, **this folder wins**.

Read before any non-trivial work, together with `PRODUCT.md`, `../DOCUMENTATION-SYSTEM.md`, and the `active` ADRs in `../decisions/`.

---

## 1. Main line & version

> **⭐ 2026-08-19 authoritative override — V12 direction turn.**
> The V12 scope defined on 2026-07-14/07-15 (break-in polish of the old surface) is **superseded**. `docs/agent-ops/analysis/unified-direction-concept-design.md` was raised to **v1 authority** on 2026-08-19 by sovereign-delegation rulings (12 items adjudicated; ruling table at the end of that file; authorization receipt in `../claude-log/2026-08-19.md` entries 1–2; Henry retains full override).
>
> **V2.BN.12 is now「外骨骼与地板」/ "Exoskeleton and Floor"** — *what must exist before the agent arrives* — not "polish" (ruling 待拍-8).
>
> - **必修五件 (five required)**: ① **MCP 工具面** — expose operations as tools + guards + receipts (the 末端执行器 made real for the first time); ② **流式装配面 + 地板组件** — a one-dimensional component stream as the default writing surface; ③ **选区收据系统** — every gesture normalized to `{object IDs, text range, geometry, moment}`; ④ **层0/层1 + 抽取矩阵** — original-viewing and anchors, parse-on-demand, **层0 schema and the narrow-waist contract are frozen in this version** (层2 VLM belongs to the Agent era); ⑤ **token 预设 v0 + root-cause 并案修理** (fix only what lives on).
> - **随行三线 (three parallel lines)**: ingestion receipts; data isolation & backup discipline; AI-readable tree aligned to DOM.
> - **明确不带 (explicitly out of scope)**: knowledge graph, Relation consumption surface + assessment executor, order-spec detailing, 产房 sandbox, intent router, AI grading, homing projection, 墙 register.
> - **真相层一寸不动**: this is surface re-division plus an exoskeleton, **not a sixth truth layer**. Charter §4: 「革新=搬家非拆迁,真相层零移动」.
> - **Canvas 减负 (ruling 待拍-1)**: keep writing-adjacency / assembly / selection-anchoring / scatter-and-rearrange; release infinite polish, Figma-grade freedom, and showmanship. This is a **scope contraction, not a reversal of ADR-0001**.
> - **page frame 退役 (ruling 待拍-2)**: Note becomes the only document unit; page frame demotes from content container to **export viewfinder**. ⚠️ **During V12 the page-frame machinery is NOT physically removed** — the new stream surface routes around it; physical teardown is a separate project.

> **2026-07-14 authoritative override (still valid as to the truth floor):** V2.BN.8 Canvas Engine is closed, V2.BN.9 Purpose Foundation is complete, V2.BN.10 Source Floor is engineering-complete, and **V2.BN.11 Item + Relation truth floor is engineering-complete**: all seven sub-versions (11.1–11.7) passed independent third-party re-review, and the 26-item Closure Gate returned PASS on 2026-07-14 (handoff `2026-07-14-v2bn11.7-closure-third-party-review.md`). The five truths — TextFlow / ContentGroup / Canvas / Source / Relation — are all landed. The concentrated browser experience gate is deferred, not waived.

- **Current working branch**: `fable/v2-bn12-exoskeleton` (created 2026-08-19; the V12 construction line).
- **Historical main line**: `codex/v2-bn-canvas-engine` (the V8–V11 "Better Notebook" line).
- **Version system**: `V2.BN.x`. The old `v2.0–v2.5.6` line is a **closed engineering-foundation roadmap** (`docs/Coincides-Roadmap.md`); some of its product philosophy is outdated (notably **block-first**, now replaced by **TextFlow-first / ContentGroup-aware**).
- **Current frontier**: **V2.BN.12「外骨骼与地板」in progress.** V2.BN.12.1「编辑基座」minted 2026-08-20, patch **V2.BN.12.1.1** minted 2026-08-22 (legacy canvas-only notes render; journey 18/18). **12.2a sub-plan closed 2026-08-23**: server zod registry → faithful manifest → parity gate (three independent killers, wired into `verify`) → receipt axis (`mcp`/`proposed`/`revert_outcome` + consumer guard) → **MCP transport skeleton live at `/api/mcp`** (Host/Origin guard → existing JWT → per-request server; `tools/list` filters internal/`__`; `tools/call list_notes` byte-equivalent to REST; production artifact carries the manifest by bytes). TD-8 receipt timestamps cleared. Declared boundaries: `scopes` descriptive only (TD-14); no propose/confirm tool and no human review entry yet (12.2b); TD-6/9/10/12/16/17 open. Next: 12.2b first write tool + review queue.
- Roadmap: **`docs/ROADMAP.md`** — the sole ACTIVE roadmap since 2026-08-20.
  > The former `docs/Coincides-Better-Notebook-Roadmap.md` was **archived in full** on 2026-08-20 under ruling 待拍-12. It retains the V8–V11 decision history and nothing else; do not work from it.

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

> **2026-08-19 — what V12 does to each pillar.** V12 adds no truth layer. It re-divides the surface and builds the exoskeleton (tool face + guards + receipts) on top of the five landed truths.
>
> - **Pillar 1 TextFlow** — **most affected.** V12 required items ② (stream assembly surface + floor components) and ⑤ (root-cause repair) both sit on this kernel; the charter states the new surface rides *the same TextFlow kernel* (§4), so the 2026-08-08 four 🅰 defects (focus / dead-end / pollution / visible-vs-editable mismatch) must be diagnosed at the kernel, not patched per surface — 「噪声随面死,机件随面活,只修活的」. `contracts/TextFlow-Contract.md` is still `draft` and is the single contract most in need of freezing this version.
> - **Pillar 2 ContentGroup / Item** — unchanged in V12. Relation consumption surface and the assessment executor are on the **explicitly-out-of-scope** list; the floor sleeps at zero cost.
> - **Pillar 3 Canvas Engine** — scope **contracts** per ruling 待拍-1 (see §1). ADR-0001 stays `active`; the self-owned engine route is not reversed. page_frame machinery is not physically removed this version (ruling 待拍-2).
> - **Pillar 4 Agent + Graph** — still not started; the knowledge graph is on V12's out-of-scope list. V12's job is to build the **substrate the agent will plug into** (the MCP tool face), not the agent.
> - **New in V12, not a pillar**: 层0/层1 Source ladder + extraction matrix (required item ④). The **层0 schema and narrow-waist contract get frozen this version**; 层2 (VLM parsing) belongs to the Agent era. This activates the currently-`deferred` `contracts/Source-Provenance-Contract.md`.

### Pillar 1 — TextFlow
- **Built**: custom text editing (textarea + overlay, *not* contenteditable); `TextUnit` model (paragraph / heading / quote / list / todo / toggle / code-line); inline structures (inline formula / code / link / source marker); split / merge / indent / role-change; annotation create + render.
- **Typography baseline complete (V2.BN.8.10)**: font family, size, line height, paragraph spacing, shared measurement estimates, and a selection mini-toolbar exist. Rich selected-range styling, measured Word-like pagination, and a frozen TextFlow contract remain later.

### Pillar 2 — ContentGroup
- **Historical V2.BN.8.7 baseline (superseded in V2.BN.11.1)**: the entity layer once included `ContentGroup / GroupFolder / Member / Petal / Fragment` and the three surfaces **Rail = collect**, **Gallery = organize**, **Single Editor = refine**. Petal / Fragment are no longer current entities; the next line is authoritative for the active model.
- **V2.BN.11 拍定（2026-07-13 记）**: **Petal / Fragment 精修层退役** — `V2.BN.11.1` 代码手术停止产生新数据（client 模型/CRUD/Single Editor 花瓣入口 → server hydrate/replace/prune）,migration 047 删除三张支持表（034 全家:fragments / petals / petal_fragments）。ContentGroup 的新定位 = **Item（独立知识卡）的捆绑/组织方式**;`content_group_members` 增 `item_id` 成员类（原子包 B）、`purpose_members` 增 `member_kind='item'`（原子包 A）。权威:概念设计 v1.1 + `docs/releases/V2.BN.11-plan.md`。
- **V2.BN.11.3 + 11.3.1 complete and independently re-reviewed（2026-07-13）**: Item CRUD / retire / active-successor、Snapshot、ContentGroup-scoped Anchor pool、单 Anchor 快铸与多 Anchor 融铸已经形成首条可用纵切；Rail 提供最小人工入口，Package B 只挂 Item identity，不复制 Item 正文。fresh / legacy 数据库的 Item member 索引形状一致，相同正文重存复用 Snapshot；真实浏览器旅程和 review-fix gates 已通过。
- **V2.BN.11.4 complete + independent PASS（2026-07-13）**: `purpose_members` 的直接成员支持 `content_group | item`；Item edge 可增删、排序并保存 role / fitness。deleted / missing ContentGroup 与 retired / missing Item 使用统一 hidden-edge recovery，stale pre-retirement payload 不会误删或改写历史边。Purpose compiled scope 在读时汇总 direct 与 ContentGroup-derived active Item，按身份去重、保留来源路径且不反写；Purpose-bounded Item search 已为后续 Relation Inspector 留出入口。
- **V2.BN.11.5 complete + independent PASS（2026-07-14）**: 九个 seed Relation type 的 directionality 由 server registry 拥有；Relation create/get/list/revoke/reaffirm、Item/Purpose-scope 无图读取、双 Snapshot 判断收据与 assessment 历史读取兼容已经落地。新边只接受同用户 active Item，无向边规范序、单 active、self-loop 与 receipt 归属由 service + DB 共同背书；`origin_purpose_id` 只作出处收据。第三方唯一 LOW（directed 同向重复 409 缺专项断言）已随 11.6 补齐。
- **V2.BN.11.6 complete + independent PASS（2026-07-14）**: Relation 四态 `fresh / from_changed / to_changed / both_changed` 只比较当前 Item canonical `plain_text` hash 与判断 Snapshot hash，在每次读取时派生；latest assessment 只贡献 checkpoint，不覆盖 hash 事实。用户级 active Item 搜索与 Item Inspector active Relation 列表、directed 相对方向、create/reaffirm/revoke 已接通；retired endpoint 可读可撤销但不可重申。无 freshness/sync 持久列、后台 sweep、队列、Snapshot/diff/history 面板或图谱 UI。
- **V2.BN.11.7 complete + independent closure PASS（2026-07-14）**: Purpose full replacement 现在对 surviving ID 原地 reconcile，不再因 delete/reinsert 洗掉 Relation 的 `origin_purpose_id`；真正 omitted Purpose 只删除组织边并让 receipt 降级。Note / Project / ContentGroup 删除及 Item retirement 的生命周期集成测试证明 Item、Snapshot、Anchor 与 Relation 真相不会被容器误删。五个旧 Relation/Canvas route 与 `canvas_edges / relation_layers / object_relations` dead service branches 已物理移除，active template metadata 只指向 Item Relation。244 条 server V2 测试、60 组 model contract 和总 runtime gate 全绿。
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
- **V2.BN.11.5 Relation 边界**: Purpose compiled scope 只是一份 Purpose-bounded Item 候选集；Relation list 要求双端都在该圈内，但 origin Purpose 不构成 applicability truth。当前只有 SQLite Relation 真相与无图读取 API，不是 Relation runtime、Graph layout 或 GraphRAG 索引。
- Do **not** build toward this pillar until pillars 1–3 are stable.

## 4. Watch list (known open items, not necessarily defects)

- **⭐ 文档脱节 / documentation drift (2026-08-19, highest-priority open item)** — a full-repo triage (`../analysis/2026-08-20-doc-triage-assessment.md`) found that **the new charter's vocabulary had zero penetration into the normative layer**: none of 「外骨骼 / MCP / 末端执行器 / 组件语言 / 订货方 / 收据数据库 / 流式装配」appeared in `PRODUCT.md`, `ARCHITECTURE.md`, `DATA_MODEL.md`, `PRD.md`, `contracts/**`, this folder, or the roadmap. This override plus the `AGENT_CONTEXT.md` update is the **first-aid batch**; constitutional re-division (`PRODUCT.md`) and four rebuilds (roadmap / inventory contract / source-reconstruction intake / repo README) are commissioned but **not yet done**. Until they land, treat the files listed in `AGENT_CONTEXT.md §7` as known-stale.
- **2026-08-08 four 🅰 editing defects** — focus / dead-end / pollution / visible-vs-editable mismatch. Root-cause investigation is V12's first work order; they live in the shared editing machinery, so they are **not** fixed by the new surface alone.
- **Source closure gate** — 10.4/10.5 expose the durable Source states and deletion lifecycles through shared client models; third-party browser review must still verify real file journeys, authenticated blob opening, cross-Project dedup visibility, SourceProjection lock, Project dynamic delete defaults, move-to-Home preservation, Source hard-delete warnings, and Console/Network cleanliness.
- **V2.BN.11 concentrated experience gate (deferred)** — engineering closure passed 2026-07-14; the combined browser/UX acceptance for Purpose / Relation / Item journeys moves into the V12 break-in phase alongside the 10.4/10.5 Source browser gate.
- **TextFlow Typography** — baseline exists, but rich inline style truth and measured pagination remain unfrozen.
- **Contract layer** — most `docs/contracts/` files are `draft` / `deferred`; do not treat them as authoritative until marked `frozen`.
- **UI-mode growth** (Page / Canvas / ContentGroup / Gallery / Rail / Editor) — growing but currently controlled.
- **Embedding pipeline** — disconnected **by design** (pillar 4), not a bug.
- **TextFlow-in-transformed-canvas** — load-bearing assumption of the self-owned hybrid engine; recommend a minimal spike before scaling 8.8 (see ADR-0001).

## 5. Maintenance

Updating this folder is part of every `V2.BN.x` **definition of done**. If a version changes pillar status, the version is not "done" until this folder reflects it.
