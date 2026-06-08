# S4 - R9-R10 Performance And Roadmap Synthesis Summary

## 1. Summary Scope

S4 总结 R9-R10：

- R9：Performance / Scale / Rebuild Benchmark；
- R10：Better Notebook Roadmap Synthesis。

这两份报告把 Better Notebook 从“体验方向”进一步推到“可执行路线”：

```text
如果要把 Coincides 做成成熟自用笔记软件，
它必须同时有阶段顺序、性能约束和重建能力。
```

## 2. R9 的核心决策

R9 最重要的判断是：

```text
性能不是后期优化，而是产品设计约束。
```

Better Notebook 如果成功，就不会只处理 1 页 demo。它会面对：

- 10 页日常笔记；
- 50 页课程/报告；
- 100 页大型材料；
- 200 页候选压力测试；
- 大量 source badge；
- 大量 relation；
- 大量图片/公式；
- 页面外 scratch；
- export preview；
- package reopen。

因此必须从设计阶段加入：

- viewport/page virtualization；
- relation lazy loading；
- source inspector lazy loading；
- block layout cache；
- page-aware projection index；
- editor snapshot rebuild；
- export plan / batch rendering；
- package reopen recovery；
- benchmark fixtures。

R9 还明确：

```text
不要一次渲染全部 truth；
不要把 editor snapshot 当 truth；
不要让 source/relation/concept 默认全显；
不要让 SourceRegion 自动变成 NoteBlock；
不要把 export 设计成当前屏幕截图。
```

## 3. R10 的核心决策

R10 把 R0-R9 收成新版 roadmap 草稿。

核心原则是：

```text
先做一个成熟的人类笔记软件；
再把 Coincides 已有的 source、relation、template、proposal、package、AI-ready 语义能力安静地接进去；
最后再进入 Source Reconstruction、AI Note Assembly 和 GraphRAG。
```

R10 推荐新路线：

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

## 4. 最重要的顺序判断

S4 认为 R9-R10 共同锁定了顺序：

1. 先冻结旧工程面板继续扩张；
2. 先建立 Product Shell；
3. 先让用户能自然写；
4. 再让 NoteBlock 能自由排版；
5. 再明确 page/canvas/export；
6. 再做视觉语言和控制层；
7. 再把这些写成数据契约；
8. 再做 editor runtime spike；
9. 再做 source/relation/concept UX；
10. 再做性能、重建、package safety；
11. 最后进入 source reconstruction / AI note assembly / GraphRAG。

这不是保守，而是为了避免重演旧问题：语义能力很强，但用户看到的是工程现场。

## 5. Roadmap 必须继承的 v2.x 成果

S4 强调：新路线不是推倒 v2.x。

应复用：

- NoteBlock；
- note_block_sources；
- source snapshots；
- source anchors/scopes/boards；
- learning canvases；
- canvas nodes/frames/edges；
- ObjectRelation；
- RelationLayer；
- layout proposal；
- TemplateDefinition；
- CompositionTemplate；
- DomainBlockSet；
- PackageManifest；
- package import/export；
- migration/refinement proposals；
- operation batches；
- proposal-first discipline。

这些不是废稿，而是 Better Notebook 的骨架。

## 6. Roadmap 必须冻结的旧 UI 扩张

应停止把新功能继续塞进：

- Course Detail 长页面；
- 右侧不断增长的 source/material rail；
- Canvas 作为 panel 的布局；
- 工程卡片式 canvas node；
- 常驻 selected object scope；
- 常驻 relation layer debug list；
- Add Block 表单作为主要入口；
- Hide / Archive / Delete 混用文案。

这些可以保留为 debug/dev mode 或过渡 UI，但不能再作为主产品方向。

## 7. 需要推后的能力

R9-R10 再次确认，以下能力重要但应推后：

- full AI note generation；
- Source Reconstruction；
- Microsoft GraphRAG product adoption；
- Neo4j / graph database migration；
- full Concept system；
- Role Studio；
- Style Studio；
- external Agent API；
- iPad handwriting surface；
- full PDF visual rendering；
- full project backup。

原因不是它们不重要，而是它们需要一个成熟 notebook surface 承载。

## 8. S4 对正式 roadmap 的要求

正式 roadmap 不能只写：

```text
做 Better Notebook
```

必须写：

- 为什么旧 v2.x 冻结；
- 哪些旧能力复用；
- 哪些旧 UI 不再扩张；
- 每个 phase 的目标；
- 每个 phase 的 out of scope；
- 每个 phase 的必读 reference；
- 每个 phase 的验收标准；
- 哪些能力推后；
- editor runtime spike gate；
- performance/rebuild gate；
- continuity 新增项。

## 9. S4 结论

R9-R10 最终把路线定成：

```text
Better Notebook 不是继续堆工程能力；
也不是直接 fork AFFiNE；
也不是马上进入 AI/GraphRAG；
而是把 v2.x 语义地基重新安放成成熟的人类笔记产品。
```

下一步应该写最终总报告，再基于最终总报告正式起草新的 `Coincides Better Notebook Roadmap`。
