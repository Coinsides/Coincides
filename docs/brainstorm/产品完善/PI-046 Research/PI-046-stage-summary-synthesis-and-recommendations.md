# PI-046 阶段汇总总报告：现状与建议

## 文档定位

本报告基于 PI-046 已完成的阶段汇总与最终决策文件整理：

- `S1-r0-r2-method-inventory-product-reset-summary.md`
- `S2-r3-r6-object-model-manual-editor-page-canvas-summary.md`
- `S3-r7-r11-affine-blocksuite-adoption-summary.md`
- `R12-graph-model-before-graph-database.md`
- `R13-architecture-route-comparison.md`
- `R14-product-reset-affine-adoption-decision-report.md`
- `Coincides-product-reset-and-editor-foundation-decision.md`
- `PI-046-omission-and-backfill-audit.md`

它不是替代上述报告，而是把所有阶段结论压缩成一个可用于后续 roadmap、continuity、register 和 spike plan 的执行判断。

## 一句话总判断

Coincides v2.x 不是失败，而是完成了非常有价值的语义地基；但当前产品 UI 和编辑器路线不应继续扩张，下一阶段必须从“继续堆功能”转向“重建 editor foundation”，先让人类能舒服地写笔记，再让 AI 能可靠地读和生成笔记。

## 当前现状

### 1. 工程地基已经相当强

v2.x 已经沉淀出一批应该保留的核心能力：

- SourceSnapshot / SourceAnchor / SourceScope / SourceBoard；
- NoteBlock / NoteBlockPlacement / NoteBlockSource；
- CanvasNode / CanvasFrame / CanvasEdge；
- ObjectRelation / RelationLayer；
- TemplateDefinition / CompositionTemplate；
- DomainBlockSet / PackageManifest；
- TemplateMigrationProposal / DomainRefinementProposal；
- Package import / export；
- proposal-first、operation batch、recovery；
- SQLite + graph-shaped relation tables；
- graph-native migration evidence 的记录纪律。

这些能力说明 Coincides 已经不只是一个普通 UI 原型，而是具备 source-grounded、proposal-first、template/domain/package-aware、graph-ready 的语义底座。

### 2. 用户体验仍然不合格

当前最大的短板不是底层表不够，也不是 proposal 不够，而是人类使用体验没有过关：

- Course Detail 页面承载了太多工程面板；
- Source Snapshot、Source Scope、Source Board、Canvas、Template Studio 都有明显施工痕迹；
- 空白笔记不能像正常文档一样自然输入；
- NoteBlock 看起来仍像工程卡片，而不是自然笔记内容；
- Canvas 没有真正成为文档 surface；
- Add Block、Source、Board、Layout 等动作更像调试入口，不像日常工作流；
- sidebar、favorite、project navigation、import、search 等产品级入口还没有形成成熟体系。

因此，继续在当前 UI 上增加功能会让系统更复杂，而不会自然变成好用的笔记软件。

### 3. 产品目标已经被重新排序

PI-046 最重要的收获，是把 Coincides 的成长顺序重新排清楚：

```text
人能舒服写的笔记软件
  -> AI 能读的结构化笔记库
  -> 内置 AI proposal-first 整理/生成笔记
  -> 外部 Agent/API 调度 Coincides
```

这意味着 AI 不是第一优先级。第一优先级是人能自然写、改、排版和导出。只有这一层稳定，AI-readable substrate、AI note assembly、外部 agent 才有可靠落点。

### 4. NoteBlock / Canvas / Relation 的边界已经明确

当前对象边界应继续坚持：

```text
NoteBlock = 内容 truth
CanvasNode / BlockBox = 布局与投影
CanvasEdge = 视觉连接
ObjectRelation = 语义关系 / future graph edge candidate
Template / Domain / Package = capability layer
Proposal / OperationBatch = operation / provenance layer
```

这条边界很关键。它避免了两个危险：

- 把画布上的临时线条误当成知识图谱真相；
- 把 editor runtime 的内部 block id 误当成 Coincides 的 canonical id。

### 5. AFFiNE 值得借鉴，但不应 full fork

AFFiNE 的产品体验、app shell、sidebar、favorite、page/edgeless、toolbar 和 canvas tools 都值得认真学习。但 full fork / copy 整个 AFFiNE 不适合作为主线：

- 它是完整大型产品，不只是 editor runtime；
- 维护成本高；
- 会把 Coincides 的 source/proposal/template/domain/relation 地基绑进 AFFiNE 的产品结构；
- 后续 v3.x graph-native 迁移会更复杂。

更合理的判断是：借鉴 AFFiNE 产品体验，重点验证 BlockSuite 作为 editor/canvas runtime 的可能性。

### 6. BlockSuite Edgeless-as-page 是当前第一候选

当前最值得验证的路线是：

```text
BlockSuite Edgeless-as-page
  + Coincides semantic sidecar
```

BlockSuite 可以提供：

- infinite canvas；
- frame / note / connector；
- viewport / selection / resize；
- outside-page workspace；
- formal page frame；
- multi-page / seamless page stack 的潜在 surface。

但 Coincides 必须自己保留：

- NoteBlock identity；
- source provenance；
- ObjectRelation；
- export intent；
- AI visibility；
- page label mapping；
- Template / Domain / Package；
- Proposal / OperationBatch / Recovery；
- Concept / GraphRAG metadata。

也就是说：BlockSuite 做 surface，Coincides 做 truth。

### 7. 图数据库不是现在的第一步

R12 已经明确：Graph model 与 GraphDB 是两件事。

v2.x 现在应该继续做：

```text
SQLite source of truth
  + graph-shaped relation tables
  + ObjectRelation
  + Concept layer
  + source/template/domain mappings
  + graph-native migration evidence
```

Neo4j / GraphDB 应放到 v3.x 前再做系统性迁移设计。现在直接迁移图数据库，会把尚未稳定的 editor、source reconstruction、Concept、ObjectRelation 和 AI note assembly 都提前固化，风险过高。

## 当前最重要的问题

### 问题 1：继续开发旧 UI 会放大债务

当前 Course Detail 堆叠式 UI 已经完成了工程验证价值，但不适合作为产品主线。继续把功能塞进去，会让产品越来越像后台管理系统，而不是笔记软件。

### 问题 2：还没有真正的笔记编辑器地基

Coincides 现在有 NoteBlock 数据模型，但还没有成熟的自然编辑体验：

- 空白页点击输入；
- slash command；
- block selection；
- block resize / drag；
- 并排 block；
- layout edit mode；
- page/canvas/export 边界；
- rich text / formula / image / source quote 的自然呈现。

这些是“AI 帮我整理笔记”之前必须补上的产品地基。

### 问题 3：Source Reconstruction 尚未系统化

PI-048 需要继续解决：

- source type detection；
- OCR / VLM / layout / formula / table / handwriting / web extraction；
- SourceRegion schema；
- SourceRegion -> NoteBlockCandidate；
- bbox / crop / page label / confidence / provenance；
- handwritten STEM PDF、typed PDF、web article、mixed source benchmark。

没有 SourceRegion，AI note assembly 会继续停留在粗糙 chunking + LLM 总结。

### 问题 4：AI Note Assembly 的输入层还不够可靠

AI 要真正做笔记，不能只靠“大模型读一堆 chunk”。它需要更明确的中间层：

```text
SourceRegion
  -> role segmentation
  -> source-level dedupe
  -> knowledge-level dedupe
  -> template selection
  -> concept assignment
  -> NoteBlockCandidate
  -> proposal-first assembly
```

这些能力应在 manual notebook foundation 和 source reconstruction 之后推进。

### 问题 5：Concept / Relation / Hybrid RAG 还只是设计方向

当前已经知道 Concept layer、ObjectRelation、role/template filter、source provenance 对未来检索很重要，但它们尚未形成完整工程闭环。

这部分不应该抢在 editor foundation 前面，但必须在后续 roadmap 中保留位置。

## 我的建议

### 建议 1：立刻冻结当前 Course Detail 堆叠式扩张

当前 UI 可以保留为工程入口和回归测试入口，但不要继续作为主要产品界面扩展。

后续新增功能应优先进入新的 editor foundation / Template Studio / Source Reconstruction workflow，而不是继续堆在 Course Detail 右侧长栏里。

### 建议 2：下一步做 BlockSuite Edgeless-as-page + Coincides sidecar spike

这是最关键的工程验证。

Spike 要验证：

- Coincides NoteBlock 能否投射成 BlockSuite edgeless note；
- Coincides CanvasFrame 能否投射成 formal page frame；
- BlockSuite connector 能否映射成 Coincides CanvasEdge；
- CanvasEdge 能否 bind 成 ObjectRelation；
- export intent / AI visibility / page label 能否存在 Coincides sidecar；
- 删除或忽略 BlockSuite snapshot 后，是否能从 Coincides records 重建；
- 50-100 页、多 block、多 connector 下性能是否可接受。

如果成功，下一阶段可以围绕 BlockSuite runtime 重建产品壳。
如果失败，再回到 Coincides-owned editor/canvas fallback。

### 建议 3：不要现在 full fork AFFiNE，也不要现在新开完整产品 repo

新 repo 不是禁区，但应等 spike 结果出来再决定。

现在更稳的顺序是：

```text
先 spike
再决定是否新 repo
再决定哪些 v2.x substrate 迁移
```

不要用“重开”替代路线验证。否则很容易重新造一遍地基，又再次卡在 editor/canvas 体验上。

### 建议 4：把后续 roadmap 重写成产品层级，而不是版本功能堆叠

建议 roadmap 变成：

```text
Phase A - Editor Foundation Spike
Phase B - Manual Notebook Minimum Product
Phase C - Source Reconstruction Foundation
Phase D - AI Note Assembly
Phase E - Retrieval / Graph-shaped Data / Hybrid RAG
Phase F - v3.x Graph-native Planning
```

这比继续写“下一个小版本做某个功能”更稳。因为当前最大问题不是缺某一个小功能，而是产品层级顺序需要重排。

### 建议 5：PI-048 必须接在 PI-046 后面，而不是平行乱跑

PI-048 的 source reconstruction 输出不应该直接写进某个 editor tree。

正确路径应是：

```text
Source type detection
  -> OCR / VLM / layout / formula / table / web extraction
  -> SourceRegion
  -> NoteBlockCandidate
  -> Coincides sidecar
  -> editor/canvas projection
```

如果 BlockSuite spike 成功，PI-048 再研究如何把这些候选内容投射到 BlockSuite surface。
如果 spike 失败，PI-048 转向 Coincides-owned pipeline。

### 建议 6：Concept 和 GraphRAG 放进路线，但不要提前压过 editor foundation

Concept layer 很重要，尤其对跨笔记、跨 project/course 的检索有决定性价值。

但建议顺序是：

```text
先让 NoteBlock / SourceRegion / ObjectRelation 稳定
再做 Concept assignment
再做 Hybrid RAG
最后再决定 GraphDB / Neo4j
```

现在应该继续收集 graph-native evidence，而不是立即做数据库大迁移。

### 建议 7：保留 v2.x 语义地基，明确它的新角色

v2.x 不应被当成“产品最终形态”，而应被重新定义为：

```text
Coincides semantic substrate prototype
```

它的价值是证明和保留：

- source grounding；
- NoteBlock identity；
- proposal-first；
- runtime template/domain/package；
- relation/projection 分层；
- migration/recovery；
- graph-shaped evidence。

它不是用户最终看到的产品壳。

## 建议的下一步执行清单

1. 把本报告、R14 和最终决策同步进 `docs/Coincides-Roadmap.md`。
2. 同步进 `docs/continuity/2.x/v2.x-continuity.md`，防止后续上下文压缩后误读。
3. 更新 `product-improvement-issue-register.md`，标记 PI-046 的最终建议。
4. 写 `BlockSuite Edgeless-as-page + Coincides semantic sidecar spike` 的独立计划。
5. 决定 spike 放在当前 repo、实验 repo，还是 workspace 子包。
6. 为 spike 准备 benchmark：
   - 1 页；
   - 10 页；
   - 50 页；
   - 100 页；
   - 多 connector；
   - outside scratch；
   - export boundary；
   - source-backed block。
7. 在正式做 PI-048 报告前，要求每份 PI-048 报告引用 PI-046 的路线结论。

## 最终建议

我建议不要推翻 Coincides，也不要继续照旧施工。

最稳的判断是：

```text
把 v2.x 当作语义地基。
把当前 UI 当作工程原型。
用 BlockSuite Edgeless-as-page 验证 editor/canvas surface。
用 Coincides semantic sidecar 保住 source / relation / template / domain / proposal truth。
用 spike 结果决定是否正式切换路线或新开 repo。
```

这条路线承认两个事实：

1. 过去做出来的底层能力很有价值，不应该丢。
2. 当前用户体验确实不适合作为正式产品继续扩张。

因此下一阶段的核心不是“再加一个功能”，而是把 Coincides 从工程原型转成真正的笔记产品地基。
