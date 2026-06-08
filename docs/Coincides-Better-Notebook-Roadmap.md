# Coincides Better Notebook 路线图

**更新日期**: 2026-06-06
**路线图状态**: ACTIVE / 产品化路线图
**前置路线图**: `docs/Coincides-Roadmap.md`，已关闭的 v2.0-v2.5.6 工程地基路线图
**工作标题**: Better Notebook Productization Track
**核心决定**: 从语义工程地基，转向成熟的人类可读写笔记表面

---

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

但它仍然保留 canvas 的能力：

- A4 / formal page area；
- 页面外 scratch workspace；
- 可选 open canvas mode；
- 多页视图；
- page-in 和 page-out 导出边界；
- 手动自由排版；
- 未来局部知识图谱和 side-note 空间。

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
Phase B0 - Editor Runtime Spike Gate
Phase A7a - Source Library And Provenance Foundation
Phase A7a.1 - Source Operations And Degraded Chain UX
Phase A7b - Relation Definition Runtime And Model Maturity
Phase A7c - Relation Inspector And Relation Mode Seed
Phase A7d - Local Relation Graph And Supernode Folding
Phase A7e - Concept-Lite Search And Inspector UX
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
- Template Studio / Package Studio 进入 advanced tool area。
- source、board、proposal、debug surface 退出日常写作主路径。
- Canvas Document 成为主 note surface，而不是 Course Detail 里的右侧面板。

### 不做

- 不做完整 workspace/folder system；
- 不做 marketplace；
- 不做 external agent integration；
- 不做 mobile/iPad shell。

### 验收

- 用户可以从导航直接进入某篇 note。
- Favorite 能让重要 note 不必先进入 project detail。
- 日常工作区看起来像 notebook，而不是长 admin dashboard。

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

- paragraph、heading、formula、image、code、table、source quote、callout、sticky note 的基础视觉语言。
- structured field display：definition/formula/theorem 等 block 能显示字段，而不是只能显示一整段文本。
- field box / field layout controls：字段位置、宽度、字体、边框和显示样式可调整。
- selected block floating toolbar。
- right-click menu。
- inspector tabs。
- hover 和 selected state。
- source/relation/template/debug indicator 移到 badge 和 inspector。
- 重做 hide、archive、remove、delete、restore 的文案。

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
FieldSchema
FieldValue
FieldLayout / RenderTemplate
Concept
EditorSnapshot
OperationBatch
```

### 新工作

- 定义 layout truth 与 content truth。
- 定义 page/canvas surface object contract。
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
- 定义 TemplateDefinition 如何承载 structured fields，而不让 editor runtime 拥有字段 truth。

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

---

## 14. Phase B0 - Editor Runtime Spike Gate

### 目标

在大规模实现前，决定使用 BlockSuite、hybrid runtime，还是 self-owned editor surface。

### Spike 候选

1. BlockSuite PageEditor + Coincides overlay。
2. BlockSuite Edgeless-as-page。
3. Self-owned minimal surface fallback。

### 必须验证

- natural writing；
- slash command；
- selected toolbar；
- freeform block-box resize；
- right-side spatial insertion；
- A4 formal page；
- outside workspace；
- stable xywh mapping；
- Coincides id sidecar；
- source/relation badges；
- snapshot deletion and rebuild；
- 50-100 page performance feasibility。

### 不做

- 不做全产品迁移；
- 不做 AI note assembly；
- 不让 BlockSuite/AFFiNE snapshot 成为 Coincides truth。

### 验收

- 明确选择外部 runtime、hybrid route 或 self-owned fallback。
- 如果外部 runtime 失败，fallback scope 清楚。
- 后续 phase 不依赖悬空的 editor optimism。

---

## 15. Phase A7a - Source Library And Provenance Foundation

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

## 15.1 Phase A7a.1 - Source Operations And Degraded Chain UX

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

## 16. Phase A7b - Relation Definition Runtime And Model Maturity

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
- 一条视觉 connector 和一条或多条语义 ObjectRelation 的关系可解释。
- 后续 Relation Inspector、Local Graph、GraphRAG adapter 都能复用这套定义。

---

## 17. Phase A7c - Relation Inspector And Relation Mode Seed

### 目标

让 relation 从“画线功能”升级成可查询、可隐藏、可解释的语义连接。

### 新工作

- selected block relation badge。
- relation inspector。
- 复用 A7b 的 relation lifecycle：visual connector、candidate、confirmed ObjectRelation、hidden relation、stale/broken/recovered relation。
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

## 18. Phase A7d - Local Relation Graph And Supernode Folding

### 目标

把已经建立的 relation 变成用户可以消费的局部知识图谱视图，让用户围绕一个 NoteBlock 查看、筛选、展开和压缩相关知识，而不是在正文里默认显示一团线。

### 新工作

- selected block 的 Graph Peek / Local Relation Graph 入口。
- 入口可来自 selected toolbar、right-click menu，未来可探索拖到 Graph Peek hot zone。
- 以 selected block 为中心生成局部图谱。
- 默认只显示有限范围：1-hop、当前页或相邻页、当前 relation group / layer。
- 支持筛选 relation type、relation group、direction、page range、depth。
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
- 用户可以按 relation group/type/page range/depth 缩小图谱。
- 密集区域可以被折叠为可展开的 cluster / supernode。
- supernode folding 明确只是 view projection，不改变 Coincides truth。

---

## 19. Phase A7e - Concept-Lite Search And Inspector UX

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

## 20. Phase F - Performance / Rebuild / Package Safety

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

## 21. Phase G - Source Reconstruction And AI Note Assembly Readiness

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

## 22. 明确推后

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

## 23. 版本拆分建议

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

建议第一轮执行顺序：

```text
V2.BN.0:
  Roadmap reset and foundation inventory.

V2.BN.1:
  Product shell and navigation.

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
  Editor runtime spike gate.

V2.BN.8:
  Source library and provenance foundation.

V2.BN.8.1:
  Source operations and degraded chain UX.

V2.BN.9:
  Relation definition runtime and model maturity.

V2.BN.10:
  Relation inspector and relation mode seed.

V2.BN.11:
  Local relation graph and supernode folding.

V2.BN.12:
  Concept-lite search and inspector UX.
```

实际版本号可以之后再决定。重要规则是：

```text
不要在成熟人类写作和排版体验完成前，启动完整 AI note assembly。
```

---

## 24. 最终决定

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
