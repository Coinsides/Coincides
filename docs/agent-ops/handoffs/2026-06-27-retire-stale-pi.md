> from: claude | to: henry | status: closed | re: retire-stale-pi | date: 2026-06-27

# Spec：给 7 条过时 PI 标 superseded / 重锚到 TextFlow-first

## 背景

`docs/brainstorm/产品完善/product-improvement-issue-register.md` 里 PI-001..051 全部标着 `- **Status**: Open`。其中 7 条是 **block-first / BlockSuite 时代**的产物，已被当前权威模型（TextFlow-first / ContentGroup-aware）和 **ADR-0001**（自研最小混合 canvas 引擎，取代 BlockSuite 路线）作废。

风险：它们还挂着 `Open`，未来任何 agent 冷读这份 register，可能把已死的 BlockSuite 路线或 block-first UX 复活，违背 ADR-0001。

本交接**只改 `product-improvement-issue-register.md` 一个文件，不动代码**。

## 任务

对下列每条 PI：

1. 把该 PI 的 `- **Status**: Open` 改为表中指定的新状态。
2. 紧接其后插入一条 `- **Status Update (2026-06-27)**:` 子弹，写明「被什么取代 / 有效内核搬去了哪」（用表中要点，可微调措辞）。
3. **不要删除或改写 PI 的原有正文** —— 历史就地冻结，只追加状态注记（见 `docs/agent-ops/DOCUMENTATION-SYSTEM.md` 历史冻结规矩）。

| PI（在 register 中的标题行） | 新 Status | Status Update 注记要点 |
|----|-----------|--------------------------|
| **PI-046** AFFiNE/BlockSuite Adoption Research | `Superseded` | 作为**实现路线依据**被 ADR-0001（`docs/agent-ops/decisions/ADR-0001-canvas-self-owned-engine-supersedes-pi-046.md`，自研引擎）取代。PI-046 作为**历史研究依据仍有效**，非「错了」—— 与 ADR-0001 口径一致。 |
| **PI-021** Canvas-First Must Still Feel Like A Notion-Class Writing Surface | `Superseded (re-anchored)` | 有效内核「写作必须自然」现由 **TextFlow + Canvas Engine** 承载；原 locked_page / open_canvas 双文档模式框架过时，被 PageFrame/PageStack 模型取代。 |
| **PI-017** NoteBlock Visual Rendering On Canvas Is Too Raw | `Superseded (re-anchored)` | block-first 时代产物：内容真相现为 **TextFlow**，非 database-row block 卡片；「清理 block 卡片外壳」框架不再对应当前渲染模型。 |
| **PI-022** Canvas Document Editing Needs Collision-Aware Text Insertion | `Superseded (re-anchored)` | 预设了 freeform-block-on-canvas 写作面；当前 **TextFlow 为内容真相 + PageFrame 分页为布局路径**，lane-collision 插入在解一个当前架构不会产生的问题。 |
| **PI-016** Existing NoteBlocks Need A Natural "Bring To Canvas" Flow | `Superseded (re-anchored)` | block-投影心智早于 ContentGroup 投影；复用现为 **ContentGroup projection（V2.BN.8.12：Reference/Duplicate/Fork/Materialize）**，非 NoteBlock 拖拽。 |
| **PI-020** Users Need A Manual Way To Link Existing Blocks To Sources | `Superseded (re-anchored)` | 溯源现由 **ContentGroup member + 未来 SourceArtifact/SourceAnchor 链**承载，非 per-block `note_block_sources` UI；block 级「事后挂源」是 pre-ContentGroup 框架。 |
| **PI-012** User Notes / Remarks As Sticky Notes | `Superseded (re-anchored)` | 「是 NoteBlock / CanvasShape / UserAnnotation？」之争已被当前对象族化解：它是 **PageFrame 外 scratch 区的一个 CanvasObject**（见 PI-051），内容为 TextFlow。 |

## 约束 / 边界

- 只改 `product-improvement-issue-register.md` 一个文件。
- 不删原文，只追加状态注记。
- 不碰其余 PI（PI-051 等仍 active 的不动）。
- 不改任何代码、不改 roadmap。

## 验收

- 上述 7 条 PI 每条都带一条 dated `Status Update (2026-06-27)` 注记，且 `Status` 已改成表中值。
- PI-046 明确引用 ADR-0001，并保留「历史研究依据仍有效」口径。
- 无任何 PI 原文被删除。
- `git diff --stat` 只显示 `product-improvement-issue-register.md` 一个文件被改。

## Closed —— redirected to Claude（协议第一课）

本交接**错投**了。清化石 PI 是文档 / current-state 治理，属 **Claude 的领域**（文档守门），不是 Codex 的代码建造领域。Claude 已于 2026-06-27 在对话中**直接完成**这 7 条标注（PI-046 / 021 / 017 / 022 / 016 / 020 / 012），未经 Codex。

留存它作为协议的第一课：

> **handoff 只搬「跨 agent」的活** —— Claude→Codex 的代码 spec、Codex→Claude 的结果回执。**Claude 自己领域内的活（文档/审查/研究/模拟）直接做，不需要 handoff。**

第一份**真正的** Codex handoff 应是一个**代码任务**（如 Canvas 持久化 cutover spec，待 Claude 读完 `canvas_engine_page_frames_v1` 种子形状后写）。
