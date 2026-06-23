# Coincides Better Notebook 路线图

**更新日期**: 2026-06-06
**路线图状态**: ACTIVE / 产品化路线图
**前置路线图**: `docs/Coincides-Roadmap.md`，已关闭的 v2.0-v2.5.6 工程地基路线图
**工作标题**: Better Notebook Productization Track
**核心决定**: 从语义工程地基，转向成熟的人类可读写笔记表面

---

## 2026-06-22 Active Roadmap Correction

Better Notebook is now explicitly `TextFlow-first / ContentGroup-aware`.

The V2.BN.8.6.x lane from 8.6.23 onward is the ContentGroup Editor maturity lane, not miscellaneous polish:

```text
8.6.23-8.6.26
  command-surface reality, unified draggable items, and GroupFolder resource-manager foundation

8.6.27-8.6.30
  Groups Rail v2, Petal v1, Page/Canvas drop-to-block, and safe TextFlow copy-insert

8.6.31+
  OpenDesign visual parity, Gallery / Rail / Single Editor experience cleanup, and handoff closure
```

Before later relation-heavy work, the first-version ContentGroup Editor should be coherent enough for real use: the user can collect fragments, organize groups in folders, refine a group into Petals, and keep the original note text traceable and undamaged.

`V2.BN.8.7` is reassigned from the earlier CanvasObject / media / drawing seed to a dedicated `ContentGroup System Maturity` version.

The earlier CanvasObject seed is deferred to `V2.BN.8.8+` or the next Canvas track. This keeps Canvas from becoming a second confused entry point before ContentGroup can answer its core product questions:

```text
What am I?
Where am I organized?
What are my members?
Where did I come from?
Am I synced with the source?
What happens when I am referenced, duplicated, forked, or materialized?
```

The new 8.7 target is:

```text
ContentGroup System 1.0:
make ContentGroup stable, understandable, reusable, and ready to be referenced by future Canvas projections.
```

## 2026-06-23 V2.BN.8.7 Closure Result

V2.BN.8.7 is closed as the `ContentGroup System Maturity` lane.

The accepted foundation is:

```text
Rail = collect
Gallery = organize
Single Editor = refine
```

The data foundation is now stable enough for the next pillar:

```text
ContentGroup        = root content package entity
GroupFolder         = organization truth
ContentGroupMember  = group-local content truth
ContentGroupPetal   = internal group structure
Fragment assignment = internal Petal/material structure
```

The V2.BN.8.8+ lane should now start the CanvasObject / projection track. Canvas should consume ContentGroup as a stable object, create usage/projection records for canvas placement, and keep materialization explicit. Canvas must not reinterpret member content as source truth or silently move source text.

Accepted carry-forward items:

- CanvasObject projection and placement records.
- Reference / Duplicate / Fork / Materialize UI.
- SourceArtifact / SourceAnchor full migration.
- relation runtime / GraphRAG.
- AI-created Petals.
- richer mobile polish for Gallery.

## 1. 路线图职责

这份路线图是 v2.0-v2.5.6 工程地基路线图关闭之后的新主动方向。

旧路线图已经建立了大量底层语义能力：`NoteBlock`、`Source Snapshot`、`SourceAnchor`、`SourceScope`、`SourceBoard`、`CanvasNode`、`CanvasEdge`、`ObjectRelation`、`RelationLayer`、`TemplateDefinition`、`CompositionTemplate`、`DomainBlockSet`、`PackageManifest`、proposal-first mutation、operation batch、package import/export，以及 graph-native evidence。

这些工作不是废掉，而是要换一个重心。

```text
旧重心:
  建立语义工程地基。

新重心:
  把这些地基能力收进一个成熟的笔记/报告产品里，
  让人类可以舒服地写、排版、阅读、导出，之后再让 AI 稳定接入。
```

这不是面向普通用户的 release note，也不是继续堆底层功能的版本清单。它是为了把 Coincides 做成一个真正可自用、可写作、可排版、可导出、可恢复的 notebook/report 产品。

---

## 2. 产品北极星

Coincides 下一阶段应该成为：

```text
一个精加工信息处理中台式 notebook:
  source-grounded,
  page-first,
  canvas-backed,
  block-based,
  relation-aware,
  exportable,
  AI-readable,
  并且对人类写作友好。
```

它的当前目标不是：

- 通用 RAG 数据库；
- 更好的 Obsidian；
- AFFiNE 克隆；
- Notion 克隆；
- 纯白板工具；
- AI chat-over-files 工具。

它的当前目标是一个成熟的笔记/报告表面：用户把选中的材料、调研、课程内容、网页、文档或报告放进来，Coincides 帮助人类把它们变成可读、可编辑、可溯源、可继续研究的笔记或报告。

工作定位：

```text
精加工信息处理中台 + 成熟笔记/报告表面
```

在这里，笔记和报告不是两个完全无关的产品：

```text
笔记:
  更自由，更探索性，更接近草稿。

报告:
  更精简，更去重，更结构化，更适合分享。
```

Coincides 应该同时支持这两种形态，而不是把它们拆成互不相干的系统。

---

## 3. 产品原则

### 3.1 点击，然后书写

用户第一秒的体验必须足够简单：

```text
打开空白 note。
点击空白页面。
开始输入。
```

用户不应该在开始写作前理解 `NoteBlock`、`CanvasNode`、template metadata、source scope、board node、proposal 或 graph edge。

`NoteBlock` 仍然是底层内容 truth，但产品体验上应该像自然写作。

### 3.2 NoteBlock 是内容，BlockBox 是排版

必须区分内容和布局：

```text
NoteBlock:
  canonical content object，内容真相。

BlockBox / SurfaceObject:
  页面或画布上的位置、尺寸、导出意图、可见性和排版行为。
```

用户移动、resize、对齐、并排摆放 block，应该只改变 placement，不应该改写内容 truth、source truth、relation truth 或 template truth。

### 3.3 Page-first, Canvas-backed

主笔记表面应该首先像一个正式页面，而不是像一个技术画布面板。

更准确的模型是：Note 底层拥有一张 canvas。Page 是这张 canvas 上的正式可导出 frame，页面尺寸例如 A4/A3/A2/A1 只描述 Page frame 的尺寸，不描述整张 canvas。Page frame 外的 scratch/workspace 是同一张 canvas 上的非正式区域，不是第三种独立 surface。

这意味着它仍然保留 canvas 的能力：

- A4 / formal page area；
- 页面外 scratch workspace；
- 可选 open canvas mode；
- 多页视图；
- page-in 和 page-out 导出边界；
- 手动自由排版；
- 未来局部知识图谱和 side-note 空间。

Canvas preset / Page preset 的切换不能被设计成普通开关。如果用户从 Infinite Canvas 迁移到 A4 Page，或从 A4 迁移到更大 PageFrame，应该创建新 note 或新 target canvas，把 NoteBlocks / SourceReferences / ObjectRelations 复制过去，再生成 AI-assisted repagination proposal，由用户确认后应用。

### 3.4 工程 metadata 必须退到幕后

source、relation、concept、template、debug id、proposal state 都重要，但不能常驻污染正文。

它们应该通过以下方式出现：

- 小 badge；
- hover tooltip；
- selected object toolbar；
- right-click menu；
- inspector panel；
- search/filter；
- local graph view；
- export preview；
- debug mode；
- AI context preview。

### 3.5 AI 必须站在成熟的人类表面之后

AI note assembly、Source Reconstruction、OCR/VLM import、GraphRAG、external agent integration 都重要。

但它们不应该领导下一阶段。

如果 Coincides 还不能让人类舒服地写、摆、缩放、对齐、编辑、检查和导出 block，那么 AI 生成得越多，界面只会越乱。

可靠性顺序仍然是：

```text
工程可靠
  -> 用户可靠
  -> 人机协作可靠
```

---

## 4. 学习模板与产品参考

这些对象是学习参考，不是数据主权转移对象。

### Notion

学习重点：

- 空白页自然写作；
- slash command；
- 低摩擦 block 创建；
- 干净阅读表面；
- 轻量 block handle；
- 命令发现方式；
- 少量可见 metadata。

不要照搬：

- 严格线性单列 block 布局作为 Coincides 最终限制；
- markdown-first 或 database-first 产品身份。

### AFFiNE / BlockSuite

学习重点：

- page 与 edgeless 的关系；
- sidebar、favorites、workspace navigation；
- canvas tools；
- frame、sticky、connector 的视觉语言；
- 成熟 editor runtime 的可能性；
- 产品级交互 polish。

重要边界：

- AFFiNE 是产品和代码参考，也是 runtime spike 的重要候选。
- full AFFiNE fork 不是主线，除非未来 spike 明确推翻这个决定。
- Coincides 必须保留数据主权。

### Word / Google Docs / Apple Notes

学习重点：

- 页面心智；
- 正式写作；
- print/PDF export；
- page label 和 page boundary；
- 文本编辑心智。

### tldraw / Excalidraw / FigJam / Miro / diagrams.net

学习重点：

- selection；
- pan / zoom；
- visual connector；
- sticky note；
- frame；
- snapping / alignment；
- local graph 或 freeform relation visualization。

这些工具不能定义 Coincides truth。

### Obsidian / Logseq

学习重点：

- backlink / graph discovery；
- local-first knowledge practice；
- cross-note navigation。

不要把 Coincides 重新定位成 better Obsidian 或原始 personal RAG database。

---

## 5. 必读调研索引

后续每个 phase 的计划都必须带着相关调研进入，不允许只凭聊天记忆开工。

### Active Product References

这些不是普通调研材料，而是后续 Better Notebook phase plan 的产品契约入口：

- `PRODUCT.md`
  - 定义 Coincides 的产品定位、用户、信息处理中台边界、source grounding、正式层 / thinking layer、AI 协作原则。
- `docs/Coincides-Relation-Product-Design.md`
  - 定义 CanvasConnector、ObjectRelation、RelationType、RelationGroup、ConnectionPoint、Relation Lifecycle、GraphRAG sidecar 边界。
- `docs/brainstorm/BetterNoteBook Research/Better-Notebook-UX-Inventory-and-Interaction-Contract.md`
  - 定义 Better Notebook 的对象 inventory、操作入口、状态、快捷键、危险操作、toolbar / context menu / inspector 分层、layout mode、relation mode 和第一版交互契约。
- `docs/internal/Better-Notebook-Phase-Plan-Template.md`
  - 定义未来每个 `V2.BN.x` / `V2.BN.x.y` 版本计划必须回答的用户流程、数据影响、source/relation/export/AI visibility 影响和验收规则。
- `docs/internal/Better-Notebook-Implementation-Reality-Check.md`
  - 记录当前代码真实能力和 Better Notebook 缺口，防止后续计划把目标体验误认为已实现功能。

任何涉及产品定位、NoteBlock 体验、relation、source grounding、GraphRAG adapter、external adapter 或具体用户交互的 phase，都必须先读这些 active reference 文档。

### Contract / Spec Documents

`PRODUCT.md` 和 UX Inventory 不能替代数据契约。凡是会同时影响数据结构、UI 行为、导出、AI 可读性、迁移或 adapter 的核心对象，都应该有单独的 contract/spec 文档。

这些文档的职责是回答：

```text
这个对象是什么？
它的 canonical truth 在哪里？
它有哪些状态？
哪些字段是稳定契约，哪些只是 UI cache / projection？
它如何被创建、更新、删除、恢复、迁移？
它和 source / relation / template / export / AI visibility 的边界是什么？
旧数据如何兼容？
```

第一批应优先建立：

- `docs/contracts/Block-Contract.md`
  - 定义 NoteBlock、BlockBox / placement、primitive family、template variant、field schema、field value、field layout、reading/selected/editing/debug 状态。
- `docs/contracts/Source-Reconstruction-Contract-Intake.md`
  - 定义 SourceRegion、NoteBlockCandidate、source type detection、reconstruction-aware chunking、adapter candidate/proposal 边界。
- `docs/contracts/Source-Provenance-Contract.md`
  - 定义 SourceDocument、SourceVersion、SourceReference、SourceChain、SourceUsage、tombstone、broken/degraded/recovered 状态。
- `docs/contracts/Canvas-Page-Surface-Contract.md`
  - 定义 NoteCanvas、PageFrame、FrameOutsideWorkspace、placement、rotation future、connector endpoint 预留和 Canvas Engine clean branch/fallback 边界。
- `docs/contracts/Link-Source-Relation-Boundary-Contract.md`
  - 定义 Link、SourceReference、ObjectRelation 三分法，并预留 CandidateRelation / relation budget 边界。
- `docs/contracts/Template-Category-Contract.md`
  - 定义 TemplateDefinition、template variant、category/domain membership、未来 Structure Studio productization、field schema 与 render/layout 的边界。
- `docs/contracts/TextFlow-Contract.md`
  - 定义 TextBlock、TextUnit、TextUnitGroup、InlineStructure、writing_role、range anchor 与 TextFlow 内部编辑边界；它不承载最终语义标签真相。
- `docs/contracts/Annotation-Contract.md`
  - 定义 AnnotationTruth、AnnotationRange、child annotation、visual style、ReadingInterpretation、AnnotationProposal、relation endpoint reserve；它不预设全局 canonical role / slot schema。
- `docs/contracts/Notebook-Object-Inventory-Contract.md`
  - 定义 Better Notebook 的对象总览和根分工：Project、Note、NoteCanvas、PageFrame、Block、TextFlow、TextUnit、TextUnitGroup、InlineStructure、ContentRange、AnnotationTruth、GroupFolder、ContentGroup、ContentGroup identity/status、ContentGroup Gallery / derived views、ReadingInterpretation、Relation 的边界。
- `docs/contracts/ContentGroup-GroupFolder-Contract.md`
  - 定义 GroupFolder 与 ContentGroup 的边界：Folder 管组织、路径、浏览边界和局部 relation view scope；ContentGroup 管严肃内容包、成员引用、Petal 和身份审查状态。
- `docs/contracts/Editor-State-Rebuild-Contract.md`
  - 定义 editor state、operation/undo 边界、rebuild 行为和 adapter rebuild 限制。

这些 contract/spec 文档不是替代 Product、Roadmap 或 UX Inventory，而是把其中成熟下来的对象规则固化成工程可执行契约。后续小版本如果改变这些对象的数据结构或生命周期，必须同步更新相应 contract/spec。

### CodeGraph / 索引使用规则

CodeGraph 是后续 Better Notebook 代码实施时的结构阅读和导航工具，但它不是事实本身，也不是 build / test / lint 的替代品。

规则：

- 写代码前，如果需要理解现有结构、调用关系或影响范围，优先使用 CodeGraph。
- 改完代码后，如果还要继续依赖 CodeGraph 判断刚改过的文件、调用关系或影响范围，必须先检查 CodeGraph status。
- 如果 CodeGraph 显示 pending sync，或者工具提示某些文件 edited since last index sync，不能把旧索引当作当前事实；要直接读取 pending 文件，或等待/重试 status 直到同步完成。
- 每个涉及代码实现的 `V2.BN.x` / `V2.BN.x.y` plan checklist 都必须包含：

```text
CodeGraph status checked after edits before further CodeGraph-dependent analysis
```

- CodeGraph 可以帮助找结构和减少盲搜，但最终验收仍以源码、测试、build、browser smoke 和 Henry 人工通过为准。

### Better Notebook Research

主参考：

- `docs/brainstorm/BetterNoteBook Research/Better-Notebook-research-final-decision-report.md`
- `docs/brainstorm/BetterNoteBook Research/R10-better-notebook-roadmap-synthesis.md`
- `docs/brainstorm/BetterNoteBook Research/S1-r0-r2-better-notebook-position-and-core-ux-summary.md`
- `docs/brainstorm/BetterNoteBook Research/S2-r3-r5-page-canvas-block-control-summary.md`
- `docs/brainstorm/BetterNoteBook Research/S3-r6-r8-data-source-relation-concept-summary.md`
- `docs/brainstorm/BetterNoteBook Research/S4-r9-r10-performance-and-roadmap-synthesis-summary.md`
- `docs/brainstorm/BetterNoteBook Research/Outline.md`

详细参考：

- `docs/brainstorm/BetterNoteBook Research/R1-notion-affine-mature-notebook-baseline.md`
- `docs/brainstorm/BetterNoteBook Research/R2-better-notebook-core-interaction-spec.md`
- `docs/brainstorm/BetterNoteBook Research/R3-page-canvas-export-boundary-spec.md`
- `docs/brainstorm/BetterNoteBook Research/R4-block-visual-language-and-content-types.md`
- `docs/brainstorm/BetterNoteBook Research/R5-controls-toolbar-context-menu-and-shortcuts.md`
- `docs/brainstorm/BetterNoteBook Research/R6-better-notebook-data-contract.md`
- `docs/brainstorm/BetterNoteBook Research/R7-editor-runtime-route-decision.md`
- `docs/brainstorm/BetterNoteBook Research/R8-source-relation-concept-user-experience.md`
- `docs/brainstorm/BetterNoteBook Research/R9-performance-scale-and-rebuild-benchmark.md`

### Product Improvement Register

- `docs/brainstorm/产品完善/product-improvement-issue-register.md`

这是开放 idea pool，不代表里面每一项都已经进入当前承诺范围。

### PI-046 Research

主参考：

- `docs/brainstorm/产品完善/PI-046 Research/Coincides-product-reset-and-editor-foundation-decision.md`
- `docs/brainstorm/产品完善/PI-046 Research/PI-046-stage-summary-synthesis-and-recommendations.md`
- `docs/brainstorm/产品完善/PI-046 Research/R14-product-reset-affine-adoption-decision-report.md`
- `docs/brainstorm/产品完善/PI-046 Research/R15-summary-microsoft-graphrag-adoption-decision.md`

重要支持参考：

- `docs/brainstorm/产品完善/PI-046 Research/R4-manual-notebook-minimum-usable-experience.md`
- `docs/brainstorm/产品完善/PI-046 Research/R4-R5-补充调研.md`
- `docs/brainstorm/产品完善/PI-046 Research/R5-page-editor-freeform-block-box-requirements.md`
- `docs/brainstorm/产品完善/PI-046 Research/R6-page-canvas-modes-and-export-boundaries.md`
- `docs/brainstorm/产品完善/PI-046 Research/R7-affine-product-experience-review.md`
- `docs/brainstorm/产品完善/PI-046 Research/R8-affine-blocksuite-code-license-review.md`
- `docs/brainstorm/产品完善/PI-046 Research/R9-affine-page-editor-adaptation-feasibility.md`
- `docs/brainstorm/产品完善/PI-046 Research/R10-affine-edgeless-canvas-adaptation-feasibility.md`
- `docs/brainstorm/产品完善/PI-046 Research/R11-coincides-affine-data-model-bridge.md`
- `docs/brainstorm/产品完善/PI-046 Research/R15-1-microsoft-graphrag-framework-and-input-boundary.md`
- `docs/brainstorm/产品完善/PI-046 Research/R15-2-noteblock-to-graphrag-adapter.md`
- `docs/brainstorm/产品完善/PI-046 Research/R15-3-relationship-pack-and-objectrelation-boundary.md`
- `docs/brainstorm/产品完善/PI-046 Research/R15-4-non-text-source-limitations-and-source-region-dependency.md`
- `docs/brainstorm/产品完善/PI-046 Research/R15-5-byog-and-coincides-graph-index-architecture.md`
- `docs/brainstorm/产品完善/PI-046 Research/R15-6-first-spike-and-adoption-decision.md`

### PI-048 Research

- `docs/brainstorm/产品完善/PI-048 Research/Outline.md`

PI-048 不是第一轮实现重点，但它必须分成两个 gate 影响路线图：

```text
PI-048 Contract Intake:
  Phase A6 前必须完成。
  不要求完成全部 OCR/VLM tool matrix，
  但必须完成会影响 SourceRegion / ImportMode / SourceKind / Condensed Raw Source / NoteBlockCandidate 的调研结论。

PI-048 Full Research:
  Phase G 前必须完成。
  必须覆盖 OCR/VLM/math/table/web reconstruction、handwritten STEM import、Notion-like import benchmark、
  SourceRegion -> NoteBlockCandidate pipeline、AFFiNE bridge、runtime/tool integration、第一版 spike 建议。
```

这样做是为了避免 A6 过早锁死 source data contract，同时也避免把完整 source reconstruction production work 提前拉进第一轮 Better Notebook。

### v2.5 Runtime Research

- `docs/brainstorm/V2.5Research/r14-v2.5-roadmap-plan-revision-recommendations.md`
- `docs/brainstorm/V2.5Research/r1-r4-template-runtime-foundation-summary.md`
- `docs/brainstorm/V2.5Research/r5-r8-template-behavior-agent-editor-composition-summary.md`
- `docs/brainstorm/V2.5Research/r9-r11-domain-package-migration-summary.md`
- `docs/brainstorm/V2.5Research/r13-v2.5-graph-native-migration-evidence.md`

当复用 `TemplateDefinition`、`CompositionTemplate`、`DomainBlockSet`、`PackageManifest` 或 package migration 时，必须读这些材料。

---

## 6. 主阶段路线

本路线图先使用 phase，不急着锁死小版本号。每个 phase 成熟后，再拆成具体版本计划。

推荐顺序：

```text
Phase 0  - Roadmap Reset And Foundation Freeze
Phase A1 - Product Shell And Navigation
Phase A2 - Natural Page Writing
Phase A3 - Freeform NoteBlock Box And Layout Mode
Phase A4 - Page / Canvas / Export Boundary
Phase A5 - Block Visual Language And Control Layer
Gate     - PI-048 Contract Intake
Phase A6 - Better Notebook Data Contract
Phase A7 - Runtime Autopsy, Branch Closure, And Canvas Engine Gate
Phase A8 - Canvas Engine And TextFlow Foundation
Phase A8.x - Canvas / TextFlow Reliability And UX Polish Buffer
Phase A9 - Structure Studio And Editor Productization
Phase A9a - Source Library And Provenance Foundation
Phase A9a.1 - Source Operations And Degraded Chain UX
Phase A9b - Relation Definition Runtime And Model Maturity
Phase A9c - Relation Inspector And Relation Mode Seed
Phase A9d - Local Relation Graph And Supernode Folding
Phase A9e - Concept-Lite Search And Inspector UX
Phase F  - Performance / Rebuild / Package Safety
Gate     - PI-048 Full Research
Phase G  - Source Reconstruction And AI Note Assembly Readiness
```

---

## 7. Phase 0 - Roadmap Reset And Foundation Freeze

### 目标

明确 v2.0-v2.5.6 已经完成的是工程地基，避免下一阶段继续变成工程面板扩张。

### 复用 v2.x

- source model；
- canvas projection model；
- template/package runtime；
- proposal/operation batch；
- relation/graph-native evidence。

### 新工作

- 把 `docs/Coincides-Roadmap.md` 视为历史路线图。
- 本文件成为新的主动方向。
- 后续 phase plan 从本路线图派生。
- Product Improvement Register 保持为 idea pool，不等于承诺范围。

### 不做

- 不做数据库迁移；
- 不做 UI 重写；
- 不做 release note 运动；
- 不做 AI generation。

### 验收

- 旧 roadmap 不再追加 Better Notebook 工作。
- 新工作从 Better Notebook Research 出发。
- 后续计划必须列出启动前必读 reference。

---

## 8. Phase A1 - Product Shell And Navigation

### 目标

先让 Coincides 看起来像一个笔记产品，而不是工程后台。

### 产品形态

主导航应该围绕：

```text
Projects
Notes
Favorites
Sources
Templates / Studio
Search
Settings
```

`Course` 应该逐渐变成 project type，而不是整个产品的通用名称。

### 新工作

- 产品 shell 重构。
- Sidebar 支持 projects 和 favorites。
- Note-first workspace area。
- Project detail 必须先展示 note list / note dashboard，而不是直接把用户送进某一个 Canvas Document。
- 打开 note 之后，Canvas Document / page editor 才成为主 workspace。
- Structure Studio / Package Studio 进入 advanced tool area。
- source、board、proposal、debug surface 退出日常写作主路径。
- Canvas Document 成为主 note surface，而不是 Course Detail 里的右侧面板或嵌套 dashboard card。
- 第一轮 shell 不应该继续强化紫色 glassmorphism / 透明卡片风格。视觉基线 reset 拆成 `V2.BN.1.1`，紧跟 `V2.BN.1` 执行。

### 不做

- 不做完整 workspace/folder system；
- 不做 marketplace；
- 不做 external agent integration；
- 不做 mobile/iPad shell。

### 验收

- 用户可以从导航直接进入某篇 note。
- 用户进入 Project 后先看到 note-first project detail，而不是自动打开 Canvas Document。
- Favorite 能让重要 note 不必先进入 project detail。
- 日常工作区看起来像 notebook，而不是长 admin dashboard。
- 打开 note 后，工作区是顶层写作/画布表面，不是多层悬浮卡片里的小画布。

### 建议小版本拆分

```text
V2.BN.1:
  Product shell and note-first navigation.
  修正 Project -> Note -> Workspace 的信息架构。

V2.BN.1.1:
  Visual baseline and theme reset.
  移除默认 purple glassmorphism，建立纯白 / 纯黑初始主题、实色 surface、清晰按钮和统一控制样式。

V2.BN.1.2:
  Note-first workspace restructure.
  Project detail 先展示 notes / canvas documents，打开具体 note 后才进入顶层 workspace。
```

---

## 9. Phase A2 - Natural Page Writing

### 目标

支持最基础、最重要的体验：

```text
空白 note -> 点击 -> 光标 -> 输入。
```

### 新工作

- 空白 note 第一次点击创建默认 text NoteBlock。
- 没有内容的 draft caret state 不持久化。
- `/` 打开 block type selection。
- Slash command 支持 create / convert 双重行为：空 block 中创建 structured block，已有 paragraph 中触发 convert-to-structured-block。
- 支持自由 paragraph -> definition / formula / theorem 等 structured block 的第一版转换入口。
- 基础文字编辑不依赖表单面板。
- 明确 Enter / Shift+Enter 语义。
- 默认 block 在 reading mode 不显示工程标签。

### 核心交互要求

用户打开空白 note 后，点击空白页面，光标应该出现在自然的第一写作位置。系统背后可以创建默认 text NoteBlock，但用户感受到的是写作，不是对象创建。

### 不做

- 不做完整 freeform layout；
- 不做 AI note generation；
- 不做 full rich editor customization；
- 不做 source reconstruction。

### 验收

- 用户无需点击 Add Block 就能写。
- Slash command 至少支持 text、heading、formula、image、code、quote。
- `/definition`、`/formula` 等命令能解释当前是创建新 block 还是转换当前 block。
- Paragraph 转 structured block 第一版使用 deterministic guess + user confirm，不依赖 AI。
- 页面体验接近 Notion/AFFiNE 的写作，而不是当前工程卡片。

### 建议小版本拆分

```text
V2.BN.2:
  Natural page writing seed.
  空白 note 可以点击写作，slash command 支持基础 create / convert。

V2.BN.2.1:
  Paragraph flow spacing patch.
  收紧 paragraph block 间距，去掉隐藏 toolbar 对正文 flow 的占位，让相邻 text block 更像自然换行。

V2.BN.2.2:
  Note chrome and tool surface patch.
  把 title / save / favorite / info / more / mode switch 归到 top bar；
  top bar 支持像 sidebar 一样折叠并保留恢复按钮；
  Advanced block form 从页面底部移到 popover / inspector / fallback surface；
  修复长内容 block 高度不能自然撑开的 auto-resize 问题；
  为后续 page mode / open canvas mode 切换预留工具 chrome 边界。
```

---

## 10. Phase A3 - Freeform NoteBlock Box And Layout Mode

### 目标

实现 Coincides 和 Notion/AFFiNE 的核心差异：`NoteBlock` 可以像文本框或内容框一样，在正式页面上自由调整大小和位置。

### 新工作

- NoteBlock 可选中、移动、resize。
- width 改变后 text reflow。
- height 随内容自然增长。
- 左侧 block 缩窄后，右侧空白处可以创建并排 block。
- image、formula、code、text、quote 可以自然左右并排。
- layout mode 显示边框、handle、resize affordance 和 snap guide。
- Page mode 中保留 `Elastic Avoidance / 弹性避让` 作为轻量 collision assist：第一版只保留保守纵向 stacked avoidance，不把它当作 Page-mode overlap permission；横向避让、反向挤压和边界 clamp 行为留给后续 layout engine 打磨。open canvas / edgeless workspace 默认允许 intentional overlap。
- reading mode 隐藏重工程边框。

### 必须支持的用户场景

1. 用户打开空白 note。
2. 用户点击并写一段文字。
3. 用户把这段文字缩窄到半页宽。
4. 用户点击右侧空白区域。
5. 右侧自然出现新 block。
6. 用户通过 slash command 把它改成图片或公式。
7. 两个 block 可以水平对齐，并保持可读。

### 不做

- 不做 Photoshop 式绘图编辑器；
- 不做完整多列自动 flow engine；
- 不做 AI 自动 layout；
- 不做完整 style editor。

### 验收

- 左文右图能手动排出来。
- 左文右文能手动排出来。
- 公式旁边可以放解释。
- Resize 只改变布局，不改变 NoteBlock truth。

---

## 11. Phase A4 - Page / Canvas / Export Boundary

### 目标

把 Better Notebook 定义成 page-first、canvas-backed 的文档表面。

### 新工作

- formal A4/page area；
- outside-page scratch workspace；
- locked page mode；
- open canvas mode；
- 多页阅读方向决策；
- page-in 和 page-out 默认导出规则；
- object-level export role；
- object-level AI visibility；
- internal page index 和 visible page label 规则；
- export preview seed。

### 产品规则

formal page area 内的对象默认可导出。formal page area 外的对象默认是个人 workspace/scratch object，但仍然可以保存、关联、搜索，并且在用户允许时被 AI 读取。

### 不做

- 不做完整 PDF export engine；
- 不做 full project backup；
- 不做完整 page number editor；
- 不做完整 continuous multi-page canvas。

### 验收

- 产品能解释哪些内容会导出、哪些不会。
- 页面外备注仍然可以连接页面内内容。
- AI visibility 和 export visibility 是两个独立概念。

---

## 12. Phase A5 - Block Visual Language And Control Layer

### 目标

让 block 看起来像内容，而不是后端卡片。

### 新工作

- 第一版默认 block visual language 先收窄到高频、基础、可解释的集合：paragraph/text、heading、definition、formula、code、source quote、sticky/scratch note。
- heading 是视觉/结构辅助 block，不是知识对象。
- formula 是第一版纯 LaTeX structured block。
- definition 是第一版 structured knowledge block。
- Field Values 是 `V2.BN.5` 必须先想清楚的核心规则：definition/formula 不能只是一整段文本，至少要明确字段值第一版存放、读取、编辑和 fallback 方式。
- Definition / Formula 的字段化体验是本版本的 structured block seed：它们要证明“字段化内容 + 自由排版”这条路可用。
- Field Layout 在本版本只做固定视觉样板和边界确认，不做成熟字段布局编辑器。
- Category Membership 在本版本只定规则：Default、Math、User Defined；不做重型分类管理。
- theorem、proof、example、exercise、answer、table、image/diagram 暂不作为第一版默认 structured preset；它们可以保留为兼容 template、Structure Studio 高级入口或后续用户自建 template variant。
- callout 不作为 Better Notebook 默认 block 或推荐用户自建方向；如果旧 runtime 数据包含 callout/warning template，只保留兼容读取。
- structured field display：definition/formula 等第一版 structured block 能显示字段，而不是只能显示一整段文本。
- field box / field layout controls：本阶段先提供固定样板和轻量呈现，不把字段位置、字体、边框、显示样式的成熟编辑做进本版本。
- selected block floating toolbar。
- right-click menu。
- inspector tabs。
- hover 和 selected state。
- source/relation/template/debug indicator 移到 badge 和 inspector。
- 重做 hide、archive、remove、delete、restore 的文案。

### 默认 block 与模板边界

`V2.BN.5` 的默认 block 入口不等于系统全部 `TemplateDefinition` 能力。

第一版日常 slash / insert 只展示少量默认 block，避免把用户第一次写作体验变成模板库浏览器。更细的学科模板，例如 `formula.math`、`formula.engineering`、`definition.chemistry`、`definition.biology`、theorem/proof/example/exercise 变体，不应继续压在 block type taxonomy 上；它们应进入后续 A9 Structure Studio / Annotation Studio，通过 annotation workflow、AI reading proposal、annotation style、block shell 和 special object block 共同表达。固定知识角色、固定角色字段、固定语义类别不再作为长期主线。

### 三个周边契约的阶段归属

```text
Field Values:
  V2.BN.5 必须定义第一版规则。
  V2.BN.6 正式数据契约化。

Field Layout:
  V2.BN.5 只做固定视觉样板。
  V2.BN.6 定义 layout truth / override 边界。
  A9 进入 Structure Studio / appearance editor 默认 layout 编辑。

Category Membership:
  V2.BN.5 只定 Default / Math / User Defined 规则。
  V2.BN.6 定义 category membership 数据边界。
  A9 在 Structure Studio 中产品化。
```

### 不做

- 不做 full Style Studio；
- 不做用户完整自定义主题引擎；
- 不做普通 note 编辑中的字段 schema 编辑；
- 不做 marketplace style pack；
- 不做复杂动画。

### 验收

- Reading mode 看内容。
- Selected mode 看操作。
- Inspector mode 看结构。
- Structured block 的字段值可读，字段布局可调，但字段 schema 由 template 控制。
- Formula / Definition 的 field values 有明确第一版规则，AI / search / export 不需要只靠猜整段文本。
- Field Layout 不被误做成完整 layout editor。
- Category Membership 不被误做成完整 taxonomy。
- Debug mode 才看 ids 和后端状态。

---

## 13. Phase A6 - Better Notebook Data Contract

### 目标

锁定数据契约，让 UX polish 不破坏语义 truth。

### 前置条件

- 完成 PI-048 Contract Intake：
  - source type taxonomy；
  - canonical `SourceRegion` 最小 schema；
  - reconstruction-aware chunking 边界；
  - `SourceRegion -> NoteBlockCandidate` 基本路径；
  - AFFiNE / BlockSuite bridge 对 source truth 的最低影响判断。
- 这里不要求完成完整 OCR/VLM tool matrix，也不要求跑 production import spike。

重要边界：A6 不是把所有数据问题都拖到最后的垃圾桶。`V2.BN.2` 到 `V2.BN.5` 如果发现用户流程必须依赖新的字段、表、状态、undo/rebuild 规则或兼容规则，就应该在对应小版本里修掉。A6 的职责是统一审计、补齐跨版本契约、确认没有 UX state 偷偷变成脆弱 cache。

### 候选概念

```text
DocumentSurface
NoteCanvas
PageFrame
SurfaceObject / BlockBox
NoteBlock
SourceReference
SourceDocument
SourceVersion
SourceArtifact
SourceUsage
SourceChain
SourceTombstone / DeletedSourceRecord
SourceRegion
ImportMode
SourceKind / SourceIntent
Condensed Raw Source
Link / InternalLink
CanvasEdge
ObjectRelation
RelationLayer
TemplateDefinition
PrimitiveBlockFamily
TemplateVariant
TemplateCategory / TemplateDomainMembership
FieldSchema
FieldValue
FieldLayout / RenderTemplate
Concept (internal/search/AI dimension, not user-facing insert block)
EditorSnapshot
OperationBatch
CanvasPresetConversionProposal (future)
```

### 新工作

- 建立第一批 Better Notebook contract/spec 文档，至少包括 block、source、relation、template 四类核心对象。
- 定义 layout truth 与 content truth。
- 定义 page/canvas surface object contract。
- 定义 NoteCanvas / PageFrame / frame-outside workspace 的统一模型。
- 定义 page size 只表示 Canvas 内可导出 PageFrame 的尺寸。
- 定义 canvas-first note 与 page-first note 的边界。
- 定义 canvas preset conversion 不是直接 toggle，而是 duplicate note + AI-assisted repagination proposal 的未来迁移路线。
- 定义 export role。
- 定义 AI visibility。
- 定义 placement role。
- 定义 editor snapshot 只能是 cache/sidecar。
- 定义 rebuild behavior。
- 定义 source/relation/template/concept metadata 如何接入，但不归 editor runtime 所有。
- 定义 external source 与 internal source/artifact。
- 定义 SourceDocument / SourceVersion，确保引用绑定到具体 version。
- 定义 SourceReference target polymorphism：external SourceVersion 或 internal Note / Report / Section / NoteBlock。
- 定义 source usage across Project/Course，区分 direct upload 和 used via citation。
- 定义 direct source / root source / full source chain。
- 定义 source delete、tombstone、missing、broken、degraded、recovered 状态。
- 定义 ImportMode：evidence_source、reconstruct_existing_note、archive_only。
- 定义 SourceKind / SourceIntent：unprocessed_evidence、condensed_note、agent_briefing、human_interpretation_note、draft_report、final_report、reasoning_trace。
- 定义 Condensed Raw Source 如何作为 source root、SourceRegion origin、NoteBlockCandidate origin 和后续内部 source chain 的起点。
- 定义 Evidence / Interpretation / Reasoning State 的产品和数据边界。
- 定义 Link / InternalLink 与 SourceReference / ObjectRelation 的边界。
- 定义 structured block schema、field values、field layout / render template。
- 确认 V2.BN.5 的临时 field values 规则是否升级为长期 `NoteBlock` 内容契约，或需要迁移到更正式的字段结构。
- 定义 field layout 的两层边界：template default layout 与 block-level layout override。
- 定义 TemplateDefinition 如何承载 structured fields，而不让 editor runtime 拥有字段 truth。
- 定义 primitive block family、template variant 和 template category membership 的边界：
  - `formula` / `definition` / `text` / `code` 是 primitive family；
  - `formula.math`、`formula.engineering`、`definition.chemistry`、`definition.biology` 是 template variant；
  - 第一版 category 入口只保留 Default、Math、User Defined；
  - 不预置 Physics、Chemistry、Biology、History、Engineering、Research 等入口；
  - 同一个 template variant 可以出现在多个 category 中；
  - category 不应该变成无限嵌套的 type tree，也不应该成为 canonical block identity。

### 不做

- 不做完整 graph database migration；
- 不做完整 SourceRegion implementation；
- 不做完整 Concept system；
- 不做 full package backup。

### 验收

- Editor snapshot 丢失不会毁掉可读内容。
- Placement change 不会改写 NoteBlock content。
- Source、relation、template 数据保留在 visual editor 之外的 canonical 层。
- Source version 替换不会静默污染旧 note。
- Source snapshot 缺失或删除时，note/block 能进入 broken/degraded 状态，而不是崩溃或静默删链。
- 同一个 PDF 可以按 import intent 被解释为 textbook evidence、existing note reconstruction 或 archive-only material。
- Existing note / agent briefing / reasoning trace 不会被默认当作未加工 source 总结掉。
- Link 只表示 navigation，不自动创建 SourceReference 或 ObjectRelation。
- Graph/local graph/AI/export 可以读取 structured fields，例如 concept_name、description、latex_input。
- Slash / insert / Structure Studio 可以按 category 展示 template variant，但长期语义 truth 应由 AnnotationTruth contract 承载；`TemplateDefinition`、TextFlow contract 与字段契约只保留结构、渲染、编辑和兼容职责。
- `docs/contracts/Block-Contract.md`、`Source-Reconstruction-Contract-Intake.md`、`Canvas-Page-Surface-Contract.md`、`Source-Provenance-Contract.md`、`Link-Source-Relation-Boundary-Contract.md`、`Template-Category-Contract.md`、`Editor-State-Rebuild-Contract.md` 至少有第一版可执行草案，且不与 Product / UX Inventory / Roadmap 冲突。

---

## 14. Phase A7 - Runtime Autopsy, Branch Closure, And Canvas Engine Gate

### 目标

把前几个版本已经做出来的 self-owned editor surface 系统做结案审计，给当前 branch 收口，并为下一阶段 Canvas Engine clean branch 准备证据、需求和调研缺口。

这一阶段不是继续无限打磨交互，也不是正式开发无限画布引擎。它是一次“先做实物，再反推图纸”的沉淀版本：把已经跑通的 natural writing、slash command、block control bar、resize/reflow、layout mode、overlay、structured field value、undo/redo 等能力整理成清晰的 runtime autopsy，并判断哪些经验应进入 Canvas Engine，哪些旧实现不应被继承。

### 前置条件

- `V2.BN.2-V2.BN.5` 已经做出 self-owned editor surface 的真实交互雏形。
- `V2.BN.6` 已定义 NoteBlock、BlockBox/Placement、FieldValue、FieldLayout、Link、SourceReference、ObjectRelation、NoteCanvas/PageFrame 等关键数据边界。
- 现有 runtime patch 已经暴露出真实风险：block resize、auto-height、slash menu 定位、preview overlay、layout mode、elastic avoidance、undo/redo、page/canvas 切换等。

### 新工作

- Current runtime autopsy：列出现有 runtime 已经证明的产品规则、踩过的坑、未来必须重建的 engine 能力。
- Branch closure report：把当前 branch 定位为 experiment / fallback / reference，不再把它误当成未来 Canvas Engine 的长期地基。
- Canvas Engine requirement draft：整理下一阶段必须具备的 NoteCanvas、PageFrame、viewport、pan/zoom、selection、placement、measurement、overlay、connector reserve 等基础能力。
- Canvas Engine research gap report：复用 PI-046 / Better Notebook 旧调研，标出哪些结论可用、哪些必须重估、哪些需要新增调研或技术 spike。
- Route decision draft：比较 self-owned Canvas Engine、hybrid route、AFFiNE/BlockSuite-first route，并给出默认路线和 fallback trigger。
- Hardening checklist：列出 Canvas Engine 前必须压住的技术风险，例如 coordinate model、focus/selection state、overlay z-index、auto-height measurement、large note performance、snapshot rebuild。

### 当前状态判断

```text
Self-owned editor runtime seed:
  已经有相当多真实肌肉，但还不是成熟引擎。

Runtime autopsy / branch closure:
  已经完成一部分风险探索，但缺少系统沉淀、branch 收口、Canvas Engine 需求草案和调研缺口报告。

Mature canvas-backed notebook:
  仍然需要后续 Canvas Engine And TextFlow Foundation 才能成立。
```

这一阶段要避免两个误区：

- 不要因为已有 prototype 就假设 runtime 已经成熟；
- 不要因为交互还有瑕疵就无限补丁化，把 gate 变成无底洞。

允许小规模代码修补，但每个修补都必须服务于 runtime contract、路线确认或风险压实。

### 不做

- 不做完整 Canvas Engine；
- 不做真正 infinite canvas pan/zoom；
- 不做 Structure Studio 产品化；
- 不做 Source Library；
- 不做 Relation runtime；
- 不做 AI note assembly；
- 不做全产品迁移；
- 不让 BlockSuite/AFFiNE snapshot 成为 Coincides truth。

### 验收

- 明确当前 branch 作为 experiment / fallback / reference 的定位。
- 明确哪些体验规则要继承到 Canvas Engine，哪些实现方式不能继承。
- 明确第八阶段 Canvas Engine And TextFlow Foundation 的最低能力。
- 明确哪些 Canvas Engine 问题已有调研可用，哪些必须补调研。
- 如果保留 AFFiNE / BlockSuite 作为备选，必须写清楚 fallback trigger。
- 后续 Canvas Engine、Structure Studio、Source、Relation 不依赖悬空的 editor optimism。

---

## 15. Phase A8 - Canvas Engine And TextFlow Foundation

### 目标

在 editor runtime 路线确认后，正式把 Coincides 的 document surface 从“有限 page-like surface”推进为真正 canvas-backed note：一个 Note 拥有统一 NoteCanvas，PageFrame 是 Canvas 内可导出的固定区域，FrameOutsideWorkspace 是 PageFrame 外的自由工作区。

同时，V2.BN.8 必须把内容层从 `NoteBlock-only` 推进到 `TextFlow-aware` 和 `Annotation-aware`。Canvas 解决“对象放在哪里”；TextFlow 解决“自然文字如何被写”；AnnotationTruth 解决“被确认的意义是什么”。如果没有 TextBlock、TextUnit、InlineStructure、TextUnitGroup range helper 和 AnnotationTruth 的第一版地基，后续 source、relation、AI projection、Structure Studio 都会继续被迫粗暴连接整块 NoteBlock。

V2.BN.8 正式调研后的第一版推荐路线是：

```text
Self-owned Minimal Hybrid NoteCanvas Engine
  DOM NoteBlock content layer
  SVG/DOM overlay layer
  CSS transform viewport
  explicit world/screen coordinate conversion
  measurement cache
  visible render window
  PageFrame + Workspace unified coordinate model
  CanvasObject / RelationEndpoint placeholders
```

TextFlow 的第一版推荐路线是：

```text
TextFlow Seed
  TextBlock as default natural writing container
  TextUnit as internal semantic writing unit
  InlineStructure placeholder
  TextUnitGroup placeholder / projection seed
  AnnotationTruth / ReadingInterpretation boundary
  TextUnitGroup as annotation range helper
  AddressableContentEndpoint boundary
  fresh TextBlock -> one paragraph TextUnit initialization
```

这里的 `Hybrid` 是经过 DOM / SVG / HTML Canvas / WebGL / hybrid / existing engine 比较后的结论，不是默认假设。tldraw、Excalidraw、React Flow、Konva、Fabric.js、PixiJS、BlockSuite / AFFiNE Edgeless 都作为参考或未来局部 adapter，不作为 V2.BN.8 第一版主 runtime。

路线依据：

- `docs/releases/V2.BN.8/Canvas-Engine-Research/Summary-Report.md`
- `docs/releases/V2.BN.8/Canvas-Engine-Research/R9-route-decision-report.md`

### 必须验证

- PageFrame inside canvas；
- canvas-first note seed；
- outside workspace；
- frame-outside objects stay outside formal page；
- stable xywh mapping；
- basic pan/zoom/viewport model；
- page-first note 与 canvas-first note 的差异；
- PageFrame 内外对象不被模式切换硬夹回 page；
- exportable PageFrame 与 non-export workspace 的边界；
- 50-100 page performance feasibility。
- clean branch feasibility：Canvas Engine 可以在新 branch 中重写 Canvas-native runtime，不要求长期兼容当前实验性 `better_notebook_layout`；
- fallback feasibility：如果 infinite canvas 在大量 blocks、relation 渲染或媒体内容下不可控，可以回到当前有限大画布路线。

### V2.BN.8.x 打磨空间

V2.BN.8 不应该被设计成“一次性做完 Canvas Engine”的单版本。Canvas Engine 和 TextFlow 是 Better Notebook 后续所有高级能力的双地基，必须预留 `V2.BN.8.1`、`V2.BN.8.2`、`V2.BN.8.3` 等小版本空间，用来反复打磨新建的 Canvas 画布和 text-first 写作层。

这些小版本的目标不是堆新功能，而是让 Canvas Engine 达到两个标准：

```text
1. 工程可靠
   坐标、viewport、selection、measurement、resize、overlay、TextFlow initialization / projection、rebuild、fallback 都稳定。

2. 用户体验可靠
   至少接近 V2.BN.1-V2.BN.5 已经磨合出的自然写作、block control、preview overlay、page/canvas boundary、structured field editing 等稳定体验；
   如果 Canvas-native 架构允许，应逐步超过旧 runtime 的手感和可解释性。
```

建议预留方向：

- `V2.BN.8.1` Runtime Replacement / Engine Shell：旧 NoteDetail runtime 逐层接管，建立 NoteCanvasRuntime、CanvasViewport、CanvasWorld、PageFrame、BlockLayer、OverlayLayer。
- `V2.BN.8.2` Canvas Shell And Viewport Transform：稳定 PageFrame、workspace、pan/zoom seed、overlay anchor、single-scroll / viewport ownership、PageFrame 外对象持久化。
- `V2.BN.8.3` TextFlow Seed And Slash Command Foundation：建立 TextBlock / TextUnit / InlineStructure / TextUnitGroup 的代码与合同种子，重写 slash command 为 context-aware writing command palette；同时收束 DefinitionBlock 等旧 block-first 入口。V2.BN.8.5 后的正式口径是：Definition 是 annotation label / ReadingInterpretation proposal，不是默认独立 block family，也不是固定知识角色 schema。Status：2026-06-15 已通过 Henry manual pass 收口。
- `V2.BN.8.4` TextUnit Editor Seed：Enter/Backspace/Tab、TextUnit gutter、heading/list/quote/todo/toggle writing role、paste-to-TextFlow parser first pass、TextBlock / TextUnit split-merge seed、undo boundary；同时把 `Heading` 从 active independent block family 下沉为 TextUnit writing role，并明确 `Code` 只做边界收束：inline code / code_line 进入 TextFlow，multi-line / copyable / language-aware CodeBlock 继续保留为 independent block。
- `V2.BN.8.5` Selection And AnnotationTruth Seed：建立选区模型、第一版 `AnnotationTruth` 数据真相、文本高亮 / 标注渲染、右键 / selection toolbar 标注入口、annotation inspector seed、annotation contract 实现同步；inline formula / inline code / inline link 降级为特殊渲染与稳定锚点能力，不再作为语义主线。
- `V2.BN.8.6` Annotation Editor And ReadingInterpretation Seed：支持多范围 annotation、子标注、annotation 编辑 / 删除 / 可见性、AI-readable annotation projection、`ReadingInterpretation` / annotation proposal seed；`TextUnitGroup` 退为 annotation range helper / stable range package，不再作为默认 `knowledge_role` 容器。
- `V2.BN.8.6.1` Selection Draft Engine：插入式地基小版本，把浏览器原生 selection 降级为输入信号，建立 Coincides-owned `SelectionDraft` truth、临时选区高亮、Ctrl / Command 追加选区、selection toolbar 逃逸规则，并把 child label 入口改为 parent annotation 内部二次选区触发。
- `V2.BN.8.6.6` TextUnitGroup And AnnotationSet Editor Foundation：把 TextUnitGroup 做成可创建 / 可重命名 / 可取消的写作层 row group；把 AnnotationSet 做成可创建 / 可编辑 / 可排序 / 可投影的 label organization seed。2026-06-18 之后的新口径是：AnnotationSet 属于过渡 seed，后续应被拆入 ContentGroup、GroupFolder / ContentGroup Gallery、CompositeEndpoint / RelationEndpoint，而不是继续作为主知识对象模型扩张。
- `V2.BN.8.7` ContentGroup System Maturity：把 ContentGroup / Member / Petal / GroupFolder / Gallery / Rail / Single Editor 收束成稳定、可理解、可复用的知识包系统；明确 Member 与 source 的分离、Reference / Duplicate / Fork / Materialize 语言，以及未来 Canvas projection 的前置边界。2026-06-22 调整：视觉套壳降为次重点，8.7 优先拆出 ContentGroup / GroupFolder / ContentGroupMember / ContentGroupPetal 四个独立实体小版本，具体 plan 另写。
- `V2.BN.8.7.1` ContentGroup Entity Cutover Foundation：把 ContentGroup 从 note metadata 数组项提升为独立实体 / 表；保留 workspace / project / note scope、identity / status、topic / role / summary、created_from / version 等基础字段；详细计划见 `docs/releases/V2.BN.8/V2.BN.8.7.1-ContentGroup-Entity-Cutover-Foundation-Plan.md`。
- `V2.BN.8.7.2` GroupFolder Entity And Placement Cutover：把 GroupFolder 从 note metadata 中拆出，建立 workspace / project / note scope 的资源管理器实体，并预留 ContentGroupFolderPlacement / membership 关系；本小版本只登记版本槽位，具体 plan 另写。
- `V2.BN.8.7.3` ContentGroupMember Entity Cutover：把 ContentGroupMember 从 ContentGroup 内嵌数组拆成 group-owned 子实体 / 表；稳定 `member_id`、`group_id`、`order_index`、`kind`、`current_content`、preview / source status / metadata，继续保持 Member != SourceRange；删除 Member 使用 hard delete，并同步清理依赖它的 Petal / fragment 结构；详细计划见 `docs/releases/V2.BN.8/V2.BN.8.7.3-ContentGroupMember-Entity-Cutover-Plan.md`。
- `V2.BN.8.7.4` ContentGroupPetal And Fragment Entity Cutover：把 `ContentGroupFragment` / `ContentGroupPetal` 从 ContentGroup 内嵌结构拆成 group-owned 子实体 / 表；稳定 `fragment_id`、`petal_id`、`group_id`、name / role / order / summary / status，并用 Petal-Fragment assignment 表达内部结构；详细计划见 `docs/releases/V2.BN.8/V2.BN.8.7.4-ContentGroupPetal-And-Fragment-Entity-Cutover-Plan.md`。
- `V2.BN.8.7.5` ContentGroup Gallery OpenDesign Shell Parity：在实体化的 ContentGroup / GroupFolder / Member / Petal 基础上，把 Gallery 收束成真正的资源管理器界面；优先对齐 folder tree、top search/actions、Folder / Topic / Role views、card role tab、topic signal、source note、status chip、empty/loading/error、current folder target 状态条；不引入 Graph scope runtime、CanvasObject projection、Reference / Duplicate / Fork / Materialize UI。
- `V2.BN.8.7.6` Groups Rail OpenDesign Shell Parity：把 note 右侧 Rail 收束成轻量 collect 面板；加强 folder path、selected-content drop zone、compact group row、role/topic/status signal、expanded group 的 Open editor / drop affordance；保持 Rail 不变成完整 Gallery，Folder / Topic / Role / All tabs 是否进入 Rail 需要单独产品判断。
- `V2.BN.8.7.7` ContentGroup Cross-Surface Integration Closure：收口 Gallery 与 Rail 的状态保留和视觉语言一致性；保证 `note_id` / `folder_id` / `group_id` 跳转上下文、返回路径、create/drop/move/delete/empty state 的手动体验可解释；Single Editor 只做作为跳转终点的轻量一致性检查，不做 Canvas/workbench 重写。
- `V2.BN.8.7.8` Single Editor Refine Shell And Logic Foundation：把 Single ContentGroup Editor 收束成非 Canvas 的 refine surface；对齐 OpenDesign 的 topbar、summary、member/material、Petal dock、source/status drawer 心智，但不实现真正 workbench / CanvasObject / projection。
- `V2.BN.8.7.9` ContentGroup System Closure Gate：作为 8.7 的收口验收小版本，盘点 ContentGroup / GroupFolder / Member / Petal / Fragment 实体化、Rail / Gallery / Single Editor 三层体验、source/member 边界和 reuse 语义底座；只修 closure gate 暴露出的明确缺陷，不再扩张功能，并把 CanvasObject projection、Materialize UI、SourceArtifact / SourceAnchor、Relation / GraphRAG 明确顺延到 8.8+。
- `V2.BN.8.8+` CanvasObject, Media Annotation, Drawing Tool, And Image Insert Seed：在 8.7 ContentGroup maturity closure 完成后，顺延此前的 CanvasObject seed，接入最小画笔、shape、image block / image object、region selection reserve，并让图片区域、CanvasObject、media region 能成为 annotation range；不做完整设计软件、完整媒体系统或多 frame 产品化。
- `V2.BN.8.9+` Canvas Reliability / Scale / Export Reserve Closure：验证 50/200/1000 blocks、formula-heavy、workspace outside frame、visible render window / virtualization reserve、PageFrame export boundary、CanvasObject / endpoint reserve。
- `V2.BN.8.x` 视实际测试追加：只要 Canvas Engine 和 TextFlow 没达到工程可靠和用户体验可靠，就不要急着进入 Structure Studio、Source Library 或 Relation runtime。

### 不做

- 不做 Structure Studio 产品化；
- 不做 source/relation 的完整 UI；
- 不做 AI note assembly；
- 不做 canvas preset 之间的直接 destructive switch；
- 不做 AI repagination proposal，只保留未来接口。
- 不做完整 drawing design app、多 frame 产品化、完整 media editor 或完整 PDF/export engine；CanvasObject / media / drawing seed 已顺延到 V2.BN.8.8+，并且必须排在 V2.BN.8.7 ContentGroup 数据实体独立与 Gallery/Rail shell closure 之后；V2.BN.8.7 的视觉套壳服务于 ContentGroup maturity，不提前进入 CanvasObject projection。

### 验收

- NoteCanvas / PageFrame / FrameOutsideWorkspace 的 runtime 行为可解释。
- Page mode 只显示 PageFrame 的正式区域，Canvas mode 能显示 PageFrame 外 workspace。
- frame-outside blocks 不会在切换回 page mode 时污染正式 PageFrame。
- TextBlock / TextUnit / TextUnitGroup / InlineStructure 的第一版边界可解释，并且新建普通文本能从一开始进入 TextFlow 路径。
- `AnnotationTruth` / `GroupFolder` / `ContentGroup` / `ReadingInterpretation` 的边界可解释：TextFlow 是内容根，ContentRange 是定位根，AnnotationTruth 是标记根，GroupFolder 是组织路径和局部视图边界，ContentGroup 是严肃内容包，ContentGroup identity/status 是审查状态，ReadingInterpretation 是 AI 解释层，Block 是空间根。
- Roadmap 明确 annotation contract 是 V2.BN.8.5 的正式产物，避免继续把语义责任压在固定知识角色、固定语义类别或角色字段 schema 上。
- 后续 source、relation、local graph 可以基于稳定 xywh 和 viewport 模型工作。
- 后续 source、relation、AI projection 可以基于 ContentRange / GroupFolder / ContentGroup / accepted ContentGroup identity 边界读取 NoteBlock 以下的对象，而不是只能连接整个 NoteBlock。
- Canvas Engine branch 有明确 clean reset / fallback 决策记录。
- Roadmap 明确预留 V2.BN.8.x 打磨空间，不把 Canvas Engine 当作一版完成的功能。

---

## 16. Phase A9 - Structure Studio And Editor Productization

### 目标

把 V2.BN.8 建立的 Canvas Engine、TextFlow 与 AnnotationTruth 地基产品化成一套 editor / structure studio：用户、开发者和未来 Mr.Zero 可以管理 annotation workflow、AI reading proposal、可见标注样式、block shell、appearance 和 editor behavior。

早期的 `Template Studio` 概念偏向 block template。TextFlow / AnnotationTruth 之后，知识表达的核心不再是“做更多 block type”，也不是预设无限多的 canonical knowledge role，而是让自然文本可以被标注、解释、连接，并在用户确认后逐步结构化。A9 的职责因此升级为 Structure Studio / Annotation Studio：它既保留 block shell / special object block 的定义能力，也重点支持 annotation UI、annotation style、AI proposal review、projection/debug view，以及必要时的 project-local annotation pattern。

### 前置条件

- `V2.BN.5` 已完成默认 block visual language 和基础 insert/slash 体验。
- `V2.BN.6` 已定义 primitive family、template variant、category membership、FieldSchema、FieldValue、FieldLayout / RenderTemplate 的边界。
- `V2.BN.7` 已完成 runtime autopsy、branch closure 和 Canvas Engine gate。
- `V2.BN.8` 已启动或完成 Canvas Engine And TextFlow Foundation，至少证明 TextBlock / TextUnit / AnnotationTruth / ReadingInterpretation seed 能进入可靠的 canvas-native runtime；TextUnitGroup 和 InlineStructure 作为 annotation range helper / special rendering anchor 保留。
- v2.5.x `TemplateDefinition` runtime 和工程版 Template Studio 可以作为地基复用。

### 新工作

- Structure Studio 的用户入口，放在 advanced tool area，不污染日常写作。
- 定义 annotation workflow：选择范围、命名标签、设置样式、编辑子标注、确认/拒绝 AI proposal。
- 定义 `AnnotationTruth` 的可编辑安全子集，例如 raw_label、ranges、child annotations、visual style、created_by / status。
- 定义 `ReadingInterpretation` 的 review/debug 视图，例如 topic segmentation、local role reading、annotation proposal、confidence、rationale。
- 定义 InlineStructure 的特殊渲染边界，例如 inline_formula、inline_code、inline_source_marker、inline_link；不把它作为固定 semantic kind 分类器。
- 定义 `TextUnitGroup` 作为 annotation range helper / stable range package 的使用边界，而不是默认 knowledge role 容器。
- 定义 AI readable projection：哪些 TextUnit / InlineStructure / annotation range / child annotation 会被投影成 AI 可读上下文；projection 是解释层，不反写成全局固定 schema。
- 定义 block shell / appearance 的安全子集，例如边框、背景、标题区、sticky note 外观、code block 外观。
- 定义 canvas / PageFrame / workspace 的默认外观 seed，例如背景、grid、PageFrame style、workspace theme。
- 保留特殊对象 block 的定义能力，例如 code、image、video、table、3D preview、source snapshot，但不把普通知识结构重新塞回 block template。
- 定义并管理 category membership：Default、Math、User Defined。
- 不在第一版预置 Physics、Chemistry、Biology、History、Engineering、Research 等 category；这些应由用户后续通过 User Defined 建立，或由未来 domain/package 机制提供。
- 同一个 template variant 可以加入多个 category。
- Slash / insert / selection toolbar / inspector 能按 category 和上下文展示 command、annotation action、special render anchor、special object block。
- Structure Studio 里能预览 reading / editing / debug / proposal 状态。
- Structure Studio 里能区分 writing_role、AnnotationTruth、ReadingInterpretation、InlineStructure special render anchor、block shell、special object block 和 category，不让用户误以为它们是同一层 type。

### 第一版默认策略

```text
TextFlow definitions:
  writing_role:
    paragraph / heading / quote / bullet_item / numbered_item / todo_item / toggle_item

Annotation definitions:
  AnnotationTruth:
    raw_label / ranges / child_annotations / visual_style / created_by / status

  ReadingInterpretation:
    topic segmentation / local role reading / annotation proposal / confidence / rationale

Special render anchors:
  inline_formula / inline_code / inline_source_marker / inline_link

Special object blocks:
  formula_display
  code
  image
  table
  source_snapshot
  sticky_note

Block shell / appearance:
  plain text block shell
  sticky note shell
  code block shell
  media block shell
  source snapshot shell

Compatibility/internal only:
  concept.*
  warning.callout / callout.* only if old runtime data needs compatibility
```

### 不做

- 不做 full Style Studio；
- 不做完整 Appearance Studio；
- 不做用户自由写底层 CSS；
- 不做箭头样式编辑器；
- 不做 marketplace；
- 不做 package import/export 重新设计；
- 不做 AI 自动判断并创建 template；
- 不做普通 note 编辑中的全局 schema / canonical role / fixed slot 级修改。

### 验收

- 用户可以定义或复制自己的 annotation workflow / annotation style / proposal review view。
- 用户可以编辑 annotation 的 child annotation / visibility / projection 安全子集，并理解它不是全局固定 slot schema。
- 用户可以定义 block shell / special object block 的外观安全子集。
- Slash / insert / selection toolbar 不再平铺所有 runtime template，而是按高频、最近使用、category、上下文和搜索组织。
- `formula` 可以同时存在为 inline special render anchor / display block；`definition` 不再强行成为默认 block type，而应通过 annotation label / AI reading proposal / user highlight 表达。
- theorem/proof/example/exercise 可以作为 annotation label、AI reading proposal 或 future special projection 出现，但不强行成为第一版默认 block preset。
- 用户能理解 writing_role、AnnotationTruth、ReadingInterpretation、InlineStructure special render anchor、block shell、special object block、category 的区别。
- Structure Studio 的产物能回到普通 note 中被创建、预览、编辑值、投影给 AI，并被后续 relation/source 阶段读取。

---

## 17. Phase A9a - Source Library And Provenance Foundation

### 目标

让 source 从“外部上传文件列表”升级为 source-first provenance library。外部 source 是证据根，内部 note/report/NoteBlock 是加工路径，用户可以理解材料如何被引用、复用和继续加工。

### 新工作

- Source-first global Source Library。
- Source Library 区分 unprocessed evidence、condensed note source、agent briefing、reasoning trace、internal derived artifact 和 archive-only material。
- 外部 source 显示 direct upload / used via citation。
- internal note/report/NoteBlock 可作为 derived/internal source。
- direct source / root source / full chain。
- external source versioning；新版不覆盖旧版引用。
- block 上显示 source badge。
- note-level source inspector。
- block-level local source chain view。
- jump target。
- cross-project/course source usage display。
- 区分 source-free user writing 和 unsupported AI-generated claims。

### 不做

- 不做 OCR/VLM SourceRegion extraction；
- 不做 source authority ranking；
- 不做自动生成全部 citations。
- 不做 source migration proposal。
- 不做 sentence-level internal citation。

### 验收

- 用户可以给一段自写总结连接多个材料。
- 用户可以把已有 note/report/NoteBlock 当作 source。
- 用户可以看到某个 source 是直接上传的 evidence、已有笔记、agent briefing、reasoning trace、内部加工产物，还是 archive-only material。
- 用户可以看到一个 external source 被哪些 project/note/block 直接或间接使用。
- 用户可以区分当前 block 的 direct source、root source 和完整来源链。
- 外部 source 新版本不会改写旧引用。
- Source-free user block 仍然允许存在。
- AI-generated source-free block 可以被不同方式标记。

---

## 17.1 Phase A9a.1 - Source Operations And Degraded Chain UX

### 目标

把 source 相关操作做清楚，避免 remove、clear、archive、deprecate、delete 混在一起。允许真实 delete source，但必须有影响预览、二次确认和 broken/degraded UX。

### 新工作

- `/add source` command。
- Source Picker：服务 slash command、selected toolbar、right-click、inspector、batch mode。
- Remove source reference：只移除当前 block 的一条 source reference。
- Clear all source references：清空当前 block 的全部 source references。
- Batch attach/remove/clear source references。
- Archive source document。
- Deprecate source version。
- Delete source document/version：危险操作，显示影响范围和二次确认。
- Note 顶部 broken/degraded source warning。
- 受影响 block 显示轻量 warning badge。
- Source inspector 显示 missing / deleted / version outdated / internal chain broken。

### 不做

- 不做自动修复 source chain；
- 不做自动迁移旧引用到新版 source；
- 不做 block 内句子级 source range；
- 不做 OCR/VLM bbox 级引用。

### 验收

- 用户能通过 `/add source` 给当前 block 添加 external/internal source。
- 用户能清楚地区分 remove reference、clear references、archive、deprecate、delete。
- 删除 source 后，受影响 note/block 不崩溃、不静默丢链，而是进入 broken/degraded 状态。
- Batch source 操作能显示影响范围。

---

## 18. Phase A9b - Relation Definition Runtime And Model Maturity

### 目标

把 relation 从“少数固定 relation_type 字符串”升级成可解释、可扩展、可迁移、可被 AI / GraphRAG adapter 理解的关系契约。

Relation 是 NoteBlock 之间真正产生结构联系的地方。Block 本身相对好定义，但 relation 决定了 Coincides 能不能从普通笔记软件升级为可研究、可追踪、可推理的信息整理系统。

### 新工作

- RelationType runtime contract。
- RelationGroup / RelationPack seed。
- directionality：directed / bidirectional / undirected。
- condition_kind：unconditional / conditional。
- composition_kind：simple_pair / group_relation / all_of / any_of / sequence / threshold。
- relation visibility：visible / hidden / AI-only / export-hidden。
- relation provenance：human-created / AI-candidate / source-derived / imported / recovered。
- relation lifecycle：candidate / confirmed / stale / broken / deprecated / recovered。
- relation budget：默认不全量生成或渲染所有潜在关系；每个视图、节点、relation type 和 AI proposal flow 都需要预算。
- CandidateRelation：GraphRAG / AI / importer 发现的关系默认是 candidate/proposal/query result，不自动进入 confirmed ObjectRelation。
- visual connector 与 ObjectRelation 的绑定、解绑、冲突和恢复规则。
- 一个 visual connector 可承载多个 ObjectRelation 的 relation bundle contract。
- 自定义 RelationType 的最低安全规则。
- GraphRAG / graph-native adapter 所需的 mapping 字段只作为 contract，不做完整同步。

### 不做

- 不做完整 Relation Studio；
- 不做 AI relation proposal；
- 不做 Local Relation Graph；
- 不做 Microsoft GraphRAG product adoption；
- 不做 Neo4j / graph-native migration；
- 不做复杂 relation type migration proposal。

### 验收

- RelationType 不再只是固定字符串，而是有清晰契约。
- 系统能表达 directed、bidirectional、undirected 和基本 group relation。
- 系统能区分 visible relation、hidden relation、AI-only relation 和 export-hidden relation。
- 系统能区分 CandidateRelation / proposal / query-time relation 和 confirmed ObjectRelation。
- 系统有 relation budget / noise control 的第一版规则，避免把 Project 变成无限增殖关系垃圾场。
- 一条视觉 connector 和一条或多条语义 ObjectRelation 的关系可解释。
- 后续 Relation Inspector、Local Graph、GraphRAG adapter 都能复用这套定义。

---

## 19. Phase A9c - Relation Inspector And Relation Mode Seed

### 目标

让 relation 从“画线功能”升级成可查询、可隐藏、可解释的语义连接。

### 新工作

- selected block relation badge。
- relation inspector。
- 复用 A9b 的 relation lifecycle：visual connector、candidate、confirmed ObjectRelation、hidden relation、stale/broken/recovered relation。
- same-page visible relation line，在有价值时显示。
- cross-page relation 默认显示为 badge/jump list。
- relation layer filter。
- visual CanvasEdge 与 semantic ObjectRelation 保持分离。
- relation bundle，避免大量重叠线。
- relation type / relation group 只做最小可读与选择，不做完整编辑器。

### 不做

- 不做完整 graph database；
- 不做 AI relation proposal；
- 不做 GraphRAG sync state；
- 不做完整 relation budget / noise control 系统；
- 不默认画出全部 relation line；
- 不做完整 Relation Studio。

### 验收

- 用户选中 block 后能看到相关对象。
- 跨页关系不会让文档不可读。
- Relation lifecycle 在产品层可解释，至少能区分 visual-only、candidate、confirmed、hidden、stale/broken。

---

## 20. Phase A9d - Local Relation Graph And Supernode Folding

### 目标

把已经建立的 relation 变成用户可以消费的局部知识图谱视图，让用户围绕一个 NoteBlock 查看、筛选、展开和压缩相关知识，而不是在正文里默认显示一团线。

### 新工作

- selected block 的 Graph Peek / Local Relation Graph 入口。
- 入口可来自 selected toolbar、right-click menu，未来可探索拖到 Graph Peek hot zone。
- 以 selected block 为中心生成局部图谱。
- 默认只显示有限范围：1-hop、当前页或相邻页、当前 relation group / layer。
- 支持筛选 relation type、relation group、direction、page range、GroupFolder path / graph scope。
- 图谱节点使用轻量卡片：type、短标题、relation count、source badge、formal/scratch 状态。
- 图谱里的 cluster / supernode 只是视图压缩，不合并真实 NoteBlock 或 ObjectRelation。
- 研究并记录 graph coarsening、community detection、graph summarization、supernode folding 的适用边界。
- 当局部图谱过密时，可以把密集区域折叠成 cluster node，用户点击后再展开。

### 不做

- 不做全局知识图谱；
- 不默认渲染整篇 note 的所有关系；
- 不把 NoteBlock 真实合并成 supernode；
- 不把 ObjectRelation 真实压缩成 superedge；
- 不做 Microsoft GraphRAG product adoption；
- 不做 Neo4j / graph-native migration。

### 验收

- 用户可以围绕一个 block 打开局部图谱。
- 默认图谱不会因为跨页或关系过多而视觉爆炸。
- 用户可以按 relation group/type/page range/GroupFolder path / graph scope 缩小图谱。
- 密集区域可以被折叠为可展开的 cluster / supernode。
- supernode folding 明确只是 view projection，不改变 Coincides truth。

---

## 21. Phase A9e - Concept-Lite Search And Inspector UX

### 目标

先把 concept 作为搜索和 refinement 维度引入，不要一开始就做成巨型 taxonomy project。

### 新工作

- block 上的 concept-lite metadata。
- concept search/filter。
- inspector display。
- concept suggestion 作为 proposal 或 reviewable metadata。
- 区分 concept、template、role、source、relation。

### 不做

- 不做 full ConceptRefinementProposal；
- 不做完整 concept ontology；
- 不做自动 cross-project concept graph；
- 不做 GraphRAG concept ingestion。

### 验收

- Concept 能帮助缩小搜索范围。
- Concept 不替代 embedding、source、relation 或 template。
- 用户可以检查和修正 concept metadata。

---

## 22. Phase F - Performance / Rebuild / Package Safety

### 目标

让 Better Notebook 能承受真实文档。

### 必须覆盖的场景

- 50-100 页 notebook；
- 每页多个 block；
- 大量隐藏和可见 relation；
- source-heavy blocks；
- cache loss 后重新打开；
- export preview；
- package import/export recovery。

### 新工作

- page/viewport virtualization；
- lazy relation loading；
- lazy source loading；
- relation budget / noise control 初步规则：不要一次性渲染、查询或导出全部关系。
- layout cache；
- canonical tables rebuild；
- package safety audit；
- large-note benchmark fixtures。

### 不做

- 不做 full project backup；
- 不打包 original source files；
- 不做 marketplace sync。

### 验收

- 大笔记仍可导航。
- 隐藏 metadata 不会一次性全加载。
- Snapshot/cache 丢失不会破坏 content truth。
- relation 过多时，默认视图仍然清晰，系统能按 selected block、relation layer、viewport 或 local graph 限制加载范围。

---

## 23. Phase G - Source Reconstruction And AI Note Assembly Readiness

### 目标

在 notebook surface 成熟之后，准备真正的 AI-assisted note/report generation。

### 依赖条件

- Better Notebook surface 稳定；
- Source attachment UX 稳定；
- Data contract 稳定；
- Editor runtime route 已决策；
- PI-048 Full Research 完成。

### 未来工作

- source type detection；
- SourceRegion；
- OCR/VLM/math/table/web reconstruction；
- Existing Notes Import / Condensed Raw Source Reconstruction；
- ImportMode route：evidence_source / reconstruct_existing_note / archive_only；
- condensed source alignment：把已有笔记与同 Project/Course 中的 textbook、paper、webpage 或 report 对齐；
- condensed source merge proposal：把 weekly notes、agent briefings 或 draft reports 合并成 master note/report；
- NoteBlockCandidate；
- Template selection engine；
- role segmentation；
- dedupe and content selection；
- layout proposal；
- source-grounded AI note/report assembly；
- GraphRAG sidecar/index，只在有用时接入。
- GraphRAG sync state：not indexed、indexed、stale、mapping failed、recovered 等状态，等 GraphRAG sidecar 进入产品路线后再实现。
- relation budget / noise control 完整版：控制哪些关系进入 ObjectRelation、哪些停留为 candidate、哪些只进入 GraphRAG query context。

### 第一轮 Better Notebook 不做

- full AI tutor；
- fully autonomous research workspace；
- Microsoft GraphRAG as truth store；
- GraphRAG sync state；
- full relation budget / noise control engine；
- Neo4j migration；
- external agent API。

### 验收

- 产品能解释未来 AI 输出如何变成可编辑 NoteBlocks。
- 产品能解释 existing note 如何重建成可编辑 NoteBlocks，而不是被默认总结或覆盖。
- AI 生成结果会落到成熟表面，而不是落到原始工程 board。

---

## 24. 明确推后

除非后续 phase plan 明确提升，否则第一轮 Better Notebook 不拉入这些内容：

- full AI note generation；
- Source Reconstruction production pipeline；
- Existing Notes Import production pipeline；
- Microsoft GraphRAG product adoption；
- GraphRAG sync state；
- Neo4j / graph-native migration；
- full Concept system；
- full relation budget / noise control engine；
- Role Studio；
- Style Studio；
- External Agent API；
- iPad handwriting surface；
- full PDF visual rendering；
- full project backup；
- marketplace；
- full AFFiNE fork。

---

## 25. 版本拆分建议

这份路线图先使用 phase。等某个 phase 足够清楚后，再拆成一个或多个版本计划。

### 命名规则

Better Notebook 优化版本使用独立命名格式：

```text
V2.BN.x
```

其中：

- `V2` 表示它仍属于 Coincides v2.x 阶段；
- `BN` 表示 Better Notebook 产品化路线；
- `x` 表示 Better Notebook 主小版本序号，是数字；
- 如需继续细分，使用 `V2.BN.x.y` 作为该 Better Notebook 版本内部的小补丁或子阶段，`y` 也是数字。

这个命名用于区分 Better Notebook 产品化阶段和 v2.0-v2.5.6 的工程 foundation sprint。

Better Notebook 不预设小版本上限。这个阶段的目标不是凑一个最小 MVP，而是把 Coincides 打磨成成熟的 notebook/report 软件；如果产品体验、数据契约、模板能力、source、relation、performance 或 AI 可读性需要继续细分，就继续增加 `V2.BN.x` 或 `V2.BN.x.y`。

建议第一轮执行顺序：

```text
V2.BN.0:
  Roadmap reset and foundation inventory.

V2.BN.1:
  Product shell and navigation.

V2.BN.1.1:
  Visual baseline and theme reset.

V2.BN.1.2:
  Note-first workspace restructure.

V2.BN.2:
  Natural page writing.

V2.BN.3:
  Freeform NoteBlock box and layout mode.

V2.BN.4:
  Page/canvas/export boundary.

V2.BN.5:
  Block visual language and control layer.

V2.BN.6:
  Better Notebook data contract.

V2.BN.7:
  Runtime autopsy, branch closure, and Canvas Engine gate.

V2.BN.8:
  Canvas Engine and TextFlow foundation.

V2.BN.9:
  Structure Studio and editor productization.

V2.BN.10:
  Source library and provenance foundation.

V2.BN.10.1:
  Source operations and degraded chain UX.

V2.BN.11:
  Relation definition runtime and model maturity.

V2.BN.12:
  Relation inspector and relation mode seed.

V2.BN.13:
  Local relation graph and supernode folding.

V2.BN.14:
  Concept-lite search and inspector UX.
```

实际版本号可以之后再决定。重要规则是：

```text
不要在成熟人类写作和排版体验完成前，启动完整 AI note assembly。
```

---

## 26. 最终决定

Coincides 下一阶段不是继续做 foundation-feature sprint。

它是：

```text
Better Notebook Productization:
  先把人类笔记/报告表面做成熟，
  再把 source、relation、concept、template、package 和 AI 能力接回去。
```

这条路线最稳定，因为它保留 v2.x 的工程成果，同时把 Coincides 拉回最初真正要解决的问题：

```text
帮助人类更好地理解、整理、研究和继续加工信息。
```
