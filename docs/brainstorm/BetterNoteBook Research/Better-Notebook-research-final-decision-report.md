# Better Notebook Research Final Decision Report

## 0. 一句话结论

Coincides 下一阶段应该正式转入：

```text
Better Notebook Productization Track
```

核心目标不是继续堆工程能力，也不是马上进入 AI / GraphRAG / Source Reconstruction，而是先做一个成熟、自用、自然可写、可自由排版、可导出、可重建的笔记软件。

更准确地说：

```text
先把人类笔记体验做成熟；
再把 v2.x 已经做好的 source / relation / template / proposal / package / graph-ready 能力安静地接进去；
最后再进入 AI note assembly、Source Reconstruction 和 GraphRAG。
```

## 1. 当前现状判断

### 1.1 v2.x 不是失败，而是工程地基

v2.x 已经积累了大量有价值的底层对象：

- NoteBlock；
- source snapshot；
- source anchor；
- source scope；
- source board；
- learning canvas；
- canvas node；
- canvas edge；
- ObjectRelation；
- RelationLayer；
- TemplateDefinition；
- CompositionTemplate；
- DomainBlockSet；
- PackageManifest；
- migration / refinement proposal；
- package import/export；
- operation batch；
- proposal-first apply/discard。

这些能力说明 Coincides 已经不是一个简单笔记 demo，而是一个 source-grounded、relation-aware、proposal-first 的语义工程地基。

### 1.2 真正的问题是产品表面不成熟

当前主要问题不是“缺表”或“缺概念”，而是用户体验仍像工程现场：

- Course Detail 继续承载太多功能；
- source/material/canvas/template/proposal 都挤在一个长页面；
- Canvas Document 仍偏工程面板；
- NoteBlock 在 canvas 上仍像后台卡片；
- source / relation / selected scope 暴露得太直接；
- 用户还不能像正常笔记软件一样点击空白页开始写；
- 左文右图、自由 block-box、resize/reflow、正式页面/页面外 workspace 还没有成为主体验。

因此，下一步重点不是继续做更多“底层能力”，而是把这些底层能力重新安放到成熟 notebook surface 后面。

## 2. 产品定位重新确认

Coincides 的目标不是替代 Obsidian，也不是成为低端 RAG 数据库。

它更像：

```text
精加工信息处理中台 + 成熟笔记/报告表面
```

它处理的不是“把所有文件粗暴 chunk 后搜索”，而是：

```text
把用户选中的材料、调研、课程、报告、网页、文档、笔记进行提炼、去重、重排、溯源、组织、展示，
最终变成人类可阅读、可研究、可继续修改、AI 也能读取的笔记/报告。
```

笔记和报告在这里不是两种完全不同的产品：

```text
未完全整理、较自由的是笔记；
精简去重、结构更稳定的是报告。
```

Coincides 应同时服务这两种形态。

## 3. 最关键的产品原则

### 3.1 用户第一秒不应理解 NoteBlock

用户打开空白 note 后，应该是：

```text
点击，写。
```

而不是：

```text
选择模板，填写表单，添加节点，理解 canvas_node。
```

NoteBlock 仍是底层 truth，但体验上应该像自然文本框。

### 3.2 NoteBlock 是内容，BlockBox 是排版

必须区分：

```text
NoteBlock = 内容 truth
BlockBox / SurfaceObject = 位置和呈现
```

用户移动、resize、并排、拖拽，只应改变 placement，不应改变 NoteBlock 的内容、source、relation、template truth。

### 3.3 Better Notebook 是 page-first, canvas-backed

它不是普通线性 editor，也不是纯无限白板。

它应该有：

- formal page；
- outside workspace；
- page/canvas/export boundary；
- source/relation/concept metadata；
- freeform block-box；
- export intent；
- AI visibility。

### 3.4 复杂能力按需显露

source、relation、concept、template、debug id 都重要，但不能常驻正文。

它们应该进入：

- badge；
- tooltip；
- selected toolbar；
- right-click；
- inspector；
- local graph；
- search/filter；
- export preview；
- AI context preview。

### 3.5 AI 必须站在成熟笔记表面之后

AI note assembly、Source Reconstruction、GraphRAG 都非常重要，但它们需要一个成熟 notebook surface 承载。

否则 AI 生成得越多，界面越乱，性能越差，用户越难编辑。

## 4. 技术路线决策

### 4.1 不建议 full fork AFFiNE

AFFiNE 是极重要的产品和代码参考，但不建议把 full AFFiNE fork 作为主线。

原因：

- AFFiNE 是完整产品，不只是 editor runtime；
- 它的数据模型、workspace、sync、cloud/local 架构会和 Coincides 冲突；
- source-grounded、proposal-first、template/domain/object relation 不是 AFFiNE 的天然主线；
- full fork 容易让外部 snapshot 接管 Coincides truth。

### 4.2 建议做 BlockSuite-focused spike

推荐路线：

```text
数据主权自研；
交互运行时先评估 BlockSuite；
AFFiNE 作为产品和代码参考；
full fork 不作为主线；
自研 surface + rich text 内核作为 fallback。
```

必须 spike：

1. `BlockSuite PageEditor + Overlay`；
2. `BlockSuite Edgeless-as-page`；
3. `Self-owned minimal surface fallback`。

Spike 必须验证：

- natural writing；
- slash；
- selected toolbar；
- block-box resize；
- right-side insertion；
- A4 formal page；
- outside workspace；
- source/relation badges；
- Coincides sidecar；
- snapshot rebuild；
- 50-100 页性能可行性。

## 5. 数据路线决策

Better Notebook 需要明确数据合同。

推荐核心对象：

```text
NoteBlock = 内容 truth
DocumentSurface = page/canvas/export/workspace 上下文
SurfaceObject / BlockBox = 呈现和排版
SourceReference / SourceRegion = 来源证据
CanvasEdge = 视觉连接
ObjectRelation = 语义关系
RelationLayer = 显示、筛选和用途组织层
TemplateDefinition = 内容能力契约
Concept = 未来跨笔记检索主题维度
EditorSnapshot = cache / sidecar
OperationBatch = 审阅与恢复
```

其中：

- SourceRegion 等 PI-048 后再正式落表；
- Concept 第一阶段只做 concept-lite；
- editor snapshot 不得成为 truth；
- canvas edge 不得自动等于 ObjectRelation。

## 6. Roadmap 建议

正式新版 roadmap 建议命名：

```text
Coincides Better Notebook Roadmap
```

推荐阶段：

```text
Phase 0 - Roadmap Reset And Legacy v2.x Freeze
Phase A1 - Product Shell And Navigation
Phase A2 - Natural Page Writing
Phase A3 - Freeform NoteBlock Box And Layout Mode
Phase A4 - Page / Canvas / Export Boundary
Phase A5 - Block Visual Language And Control Layer
Phase A6 - Better Notebook Data Contract
Phase B0 - Editor Runtime Spike Gate
Phase A7a - Source Attachment And Provenance UX
Phase A7b - Relation Inspector And Local Graph UX
Phase A7c - Concept-Lite Search And Inspector UX
Phase F - Performance / Rebuild / Package Safety
Phase G - Source Reconstruction And AI Note Assembly Readiness
```

## 7. 近期最优先的工程方向

### 第一优先：Phase 0

冻结旧 roadmap 扩张，把旧 v2.x 明确视为 semantic substrate。

### 第二优先：Phase A1-A2

让产品像一个笔记软件：

- shell；
- sidebar；
- favorite；
- note surface；
- 空白页点击输入；
- slash command；
- 默认 text NoteBlock。

### 第三优先：Phase A3-A5

做出 Coincides 与 Notion/AFFiNE 的差异：

- freeform block-box；
- resize/reflow；
- 左文右图；
- page/canvas/export；
- block visual language；
- toolbar/right-click/inspector。

### 第四优先：Phase A6 + B0

用数据合同和 runtime spike 防止 UI 重构走偏。

### 第五优先：Phase A7 + F

把 source/relation/concept 接进成熟表面，并确认性能和重建能力。

## 8. 明确推后的东西

以下能力不要在第一轮 Better Notebook 抢主线：

- full AI note generation；
- Source Reconstruction；
- Microsoft GraphRAG product adoption；
- Neo4j migration；
- full Concept system；
- Role Studio；
- Style Studio；
- external Agent API；
- iPad handwriting surface；
- full PDF visual rendering；
- full project backup；
- marketplace。

它们是后续能力，不是第一轮成熟 notebook 的入口。

## 9. 必须写进新 roadmap 的 reference

正式 roadmap 应把以下作为 startup reading：

- `docs/brainstorm/BetterNoteBook Research/Outline.md`
- `docs/brainstorm/BetterNoteBook Research/R0-reference-index-and-research-intake.md`
- `docs/brainstorm/BetterNoteBook Research/S1-r0-r2-better-notebook-position-and-core-ux-summary.md`
- `docs/brainstorm/BetterNoteBook Research/S2-r3-r5-page-canvas-block-control-summary.md`
- `docs/brainstorm/BetterNoteBook Research/S3-r6-r8-data-source-relation-concept-summary.md`
- `docs/brainstorm/BetterNoteBook Research/S4-r9-r10-performance-and-roadmap-synthesis-summary.md`
- `docs/brainstorm/BetterNoteBook Research/R10-better-notebook-roadmap-synthesis.md`
- `docs/brainstorm/产品完善/product-improvement-issue-register.md`
- `docs/brainstorm/产品完善/PI-046 Research/R14-product-reset-affine-adoption-decision-report.md`
- `docs/brainstorm/产品完善/PI-046 Research/R15-summary-microsoft-graphrag-adoption-decision.md`
- `docs/brainstorm/产品完善/PI-048 Research/Outline.md`
- `docs/brainstorm/V2.5Research/r14-v2.5-roadmap-plan-revision-recommendations.md`

## 10. 风险

### 10.1 继续堆旧 UI

如果继续把功能塞进 Course Detail，产品会越来越强，但越来越难用。

### 10.2 盲目 full fork AFFiNE

会快速得到成熟外观，但长期可能失去 Coincides 数据主权。

### 10.3 过早进入 AI

AI 生成能力没有成熟 surface 承接，会制造更多乱 block。

### 10.4 Concept 过早复杂化

Concept 很强，但第一阶段变成全量标签系统会压垮用户体验。

### 10.5 性能后补

长笔记、source、relation、concept 如果不从设计阶段做 lazy/virtualized/filter，会在真实材料下卡死。

## 11. 最终建议

我的建议很明确：

```text
现在不要继续往旧 v2.x roadmap 里加小版本。
现在也不要马上写 AI note assembly。
下一步先写新的 Coincides Better Notebook Roadmap。
```

新版 roadmap 应以人类成熟笔记体验为中心，把 v2.x 工程成果收纳进去，而不是继续展示出来。

正式开工顺序建议：

1. 写新版 Better Notebook roadmap；
2. 建 Phase 0 状态文件；
3. 做 Product Shell / Natural Page Writing；
4. 做 Freeform NoteBlock Box；
5. 做 Page/Canvas/Export；
6. 做 Data Contract；
7. 做 BlockSuite / self-owned runtime spike gate；
8. 再接 source/relation/concept；
9. 再进入性能和重建；
10. 最后回到 Source Reconstruction / AI Note Assembly / GraphRAG。

这条路线是最稳的：它不否定 v2.x 的努力，也不被 AFFiNE 或 GraphRAG 带偏。它把 Coincides 拉回最初真正想要解决的问题：

```text
让人类更好地理解、整理、研究和继续加工信息。
```

## 12. 最终判断

Coincides 的下一阶段不是“更强的工程系统”，而是：

```text
有工程深度的成熟笔记产品。
```

Better Notebook 是这个转折点。
