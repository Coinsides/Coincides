# R10 - Better Notebook Roadmap Synthesis

## 0. 报告定位

R10 收束 R0-R9，产出新版 Better Notebook roadmap 的草稿结构。

这不是正式 roadmap 文件，而是给正式 roadmap 使用的决策型蓝图。它回答：

```text
旧 v2.x 工程成果怎样冻结和复用？
Better Notebook 应该按什么阶段重建？
哪些东西必须先做？
哪些东西必须推后？
哪些 reference 必须写进新 roadmap startup reading？
```

## 1. 新 roadmap 建议标题

建议新 roadmap 命名为：

```text
Coincides Better Notebook Roadmap
```

副标题：

```text
From semantic engineering substrate to mature human-readable notebook surface
```

中文理解：

```text
从语义工程地基，走向成熟的人类可读写笔记表面。
```

## 2. 总体路线判断

R0-R9 的总判断是：

```text
Coincides v2.x 已经建立了强大的语义地基；
现在最缺的是成熟的人类笔记体验；
Better Notebook 第一阶段必须先让人类自然写、自然排版、自然导出；
然后再把 source / relation / concept / AI / GraphRAG 接进这个成熟表面。
```

也就是说，下一轮不是继续堆 SourceBoard、Canvas、Template、Package、GraphRAG 工程面板，而是把已有能力重新安放到一个日常可用的 notebook 产品里。

## 3. Roadmap Phase 草案

R10 建议新版 roadmap 使用以下阶段。

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

阶段编号可以在正式 roadmap 中调整，但推荐保留这个顺序。

## 4. Phase 0 - Roadmap Reset And Legacy v2.x Freeze

### 目标

把旧 v2.x roadmap 视为已完成的工程地基阶段，不再继续往里面塞新方向。

### 必做

- 标记旧 v2.x roadmap 已进入工程地基完成状态；
- 把 Better Notebook 作为新路线单独启动；
- 把 v2.x 成果列成可复用 substrate；
- 标记旧 Course Detail 工程面板不再扩张；
- 把 Better Notebook research 作为新 roadmap startup reading。

### Out of Scope

- 不删除旧功能；
- 不迁移数据库；
- 不重写全部 UI；
- 不做正式 release note。

### 必读 Reference

- `R0-reference-index-and-research-intake.md`
- `S1-r0-r2-better-notebook-position-and-core-ux-summary.md`
- `docs/Coincides-Roadmap.md`
- `docs/continuity/2.x/v2.x-continuity.md`

### 验收标准

- 新 roadmap 不依赖聊天记忆；
- 旧 v2.x 成果被列为 substrate；
- 新路线明确优先做成熟人工笔记体验。

## 5. Phase A1 - Product Shell And Navigation

### 目标

建立日常笔记软件的外壳，让用户第一眼能理解：

```text
Project / Note / Source / Template Studio / Favorites / Search / Settings
```

### 必做

- `Course` 产品文案逐步转向 `Project`；
- `Course` 成为 project type；
- Sidebar 支持 favorites；
- Template Studio / Package Studio 进入 advanced tool area；
- Source/Board/Proposal 等工程区从主页面退到侧栏、inspector 或 review layer；
- Canvas Document 不再长在材料列表右侧，而是主工作区。

### Out of Scope

- 不做完整项目文件夹系统；
- 不做完整 Agent workspace；
- 不做 marketplace；
- 不做 mobile/iPad。

### 必读 Reference

- R1；
- S1；
- product register PI-003、PI-004、PI-006；
- AFFiNE product experience references from PI-046。

### 验收标准

- 用户能从 sidebar 进入项目、笔记、favorite note；
- 主工作区看起来是 notebook surface，不是 Course Detail 长页面；
- Template/Package/Debug 不污染日常写作界面。

## 6. Phase A2 - Natural Page Writing

### 目标

用户打开空白 note 后，能像正常笔记软件一样开始写。

### 必做

- 空白页首次点击出现 caret；
- 输入后创建默认 `text.paragraph` NoteBlock；
- 空 draft 不持久化；
- `/` 打开基础 block type menu；
- Enter / Shift+Enter 语义明确；
- typing/autosave 不像填表单。

### Out of Scope

- 不做复杂 freeform layout；
- 不做 AI note generation；
- 不做完整 rich text editor customization；
- 不做 source reconstruction。

### 必读 Reference

- R2；
- S1；
- R5；
- Notion / AFFiNE mature notebook baseline。

### 验收标准

- 用户无需点击 Add Block 就能写；
- 默认 block 对用户来说像正文，不像工程卡片；
- slash command 至少支持 text、heading、formula、image、code、quote。

## 7. Phase A3 - Freeform NoteBlock Box And Layout Mode

### 目标

实现 Coincides 与 Notion/AFFiNE 的核心差异：NoteBlock 可以像文本框一样自由调整大小和位置。

### 必做

- NoteBlock 可选中、移动、resize；
- width 变化后 text reflow；
- height auto grow；
- 左侧 block 缩窄后，右侧空白可创建并排 block；
- 图片/公式/文本可自然左右并排；
- layout mode 显示边框、handles、snap guides；
- reading mode 隐藏工程边框。

### Out of Scope

- 不做复杂自动绕图；
- 不做完整多列 flow 引擎；
- 不做 Photoshop 式绘图工具；
- 不做复杂 style editor。

### 必读 Reference

- R2；
- R4；
- S1；
- S2；
- PI-046 R4/R5/R4-R5 补充调研。

### 验收标准

- 左文右图、左文右文、公式旁注能手动排出来；
- resize 不改 NoteBlock 内容 truth；
- layout 操作只改 placement/surface。

## 8. Phase A4 - Page / Canvas / Export Boundary

### 目标

把 Better Notebook 定义为 page-first、canvas-backed 的文档表面。

### 必做

- formal page area；
- outside workspace / scratch area；
- locked A4 / page mode；
- open canvas mode；
- page-in / page-out 默认 export intent；
- object-level export_role；
- object-level ai_visibility；
- page labels / internal page index 初步规则；
- export preview seed。

### Out of Scope

- 不做完整 PDF export engine；
- 不做复杂 page numbering editor；
- 不做多页 grid 所有细节；
- 不做 full project package。

### 必读 Reference

- R3；
- S2；
- product register PI-010、PI-011、PI-034、PI-035；
- AFFiNE edgeless/page observations。

### 验收标准

- page 内默认导出；
- page 外默认不导出；
- 用户可改变 export intent；
- page 外 scratch 仍可保存、关联、给 AI 读取，前提是 visibility 允许。

## 9. Phase A5 - Block Visual Language And Control Layer

### 目标

让 NoteBlock 看起来像内容，而不是后台对象。

### 必做

- paragraph/heading/formula/image/code/table/source quote/sticky 的基础视觉语言；
- block type/source/relation/template metadata 默认隐藏；
- hover/selected/inspector/debug 分层；
- selected block floating toolbar；
- right-click menu；
- inspector tabs；
- hide/remove/archive/delete/export 文案重做；
- source/relation/template/debug ids 不常驻正文。

### Out of Scope

- 不做完整 Style Studio；
- 不做用户自由设计所有样式；
- 不做复杂动画；
- 不做 marketplace style packs。

### 必读 Reference

- R4；
- R5；
- S2；
- product register PI-017、PI-037、PI-038、PI-039。

### 验收标准

- 正常阅读看内容；
- 选中时看操作；
- inspector 看结构；
- debug mode 才看 ids。

## 10. Phase A6 - Better Notebook Data Contract

### 目标

把 A2-A5 的 UX 变成稳定数据合同，避免 UI 做出来后数据混乱。

### 必做

- 定义 `DocumentSurface` 或等价对象；
- 定义 `SurfaceObject / BlockBox`；
- layout truth 与 content truth 分离；
- `placement_role`；
- `export_role`；
- `ai_visibility`；
- editor snapshot cache / sidecar；
- rebuild contract；
- source/relation/template/concept 不归 editor snapshot 所有。

### Out of Scope

- 不必一次写完整 migration；
- 不做 v3.x graph database；
- 不做完整 Concept 表；
- 不做 SourceRegion 表，除非 PI-048 已形成明确决策。

### 必读 Reference

- R6；
- S3；
- v2.4 Canvas / v2.5 Template/Package review files。

### 验收标准

- snapshot 丢失后可重建 minimal readable page；
- movement/resize 不影响 NoteBlock truth；
- source/relation/template metadata 不污染 editor runtime；
- export/AI visibility 有明确字段或等价 metadata。

## 11. Phase B0 - Editor Runtime Spike Gate

### 目标

在正式大规模开发前，验证外部 runtime 是否能承载 Better Notebook。

### 必做 Spike

1. BlockSuite PageEditor + Overlay；
2. BlockSuite Edgeless-as-page；
3. Self-owned minimal surface fallback。

### 必须验证

- natural writing；
- slash；
- selected toolbar；
- block-box resize；
- right-side spatial insertion；
- A4 formal page；
- outside workspace；
- xywh mapping；
- Coincides id sidecar；
- source/relation badge overlay；
- snapshot deletion rebuild；
- 50-100 page virtualization feasibility。

### Out of Scope

- 不迁移全产品；
- 不做真实用户数据导入；
- 不做 AI note assembly；
- 不让 BlockSuite snapshot 成为 truth。

### 必读 Reference

- R7；
- S3；
- PI-046 R7-R14；
- AFFiNE / BlockSuite local code notes。

### 验收标准

- 明确选择 BlockSuite、混合路线或自研 fallback；
- 失败也要产出 fallback scope；
- 不允许路线悬空进入全面 UI 实作。

## 12. Phase A7a - Source Attachment And Provenance UX

### 目标

让用户自然地把自己写的 block 连接到来源。

### 必做

- selected toolbar / right-click / inspector source entry；
- source picker；
- multiple sources；
- source material / page / range / SourceScope / SourceAnchor / SourceBoard node；
- source badge；
- source inspector；
- jump target；
- source-free user block 正常显示；
- AI-generated unsupported block 有 warning。

### Out of Scope

- 不做完整 SourceRegion；
- 不做 OCR/VLM source reconstruction；
- 不自动生成所有 citations；
- 不做 source authority ranking。

### 必读 Reference

- R8；
- product register PI-015、PI-020；
- PI-048 Outline；
- v2.3 Source Snapshot / SourceAnchor / SourceScope / SourceBoard reviews。

### 验收标准

- 用户可给已有 block attach one/multiple sources；
- source count badge 可打开 inspector；
- source-free 与 source-grounded 在 UI 上可区分但不羞辱用户。

## 13. Phase A7b - Relation Inspector And Local Graph UX

### 目标

让 relation 从“画线功能”升级成可查询、可隐藏、可解释的语义连接。

### 必做

- selected block relation inspector；
- relation count badge；
- same-page visible line；
- cross-page related badge / jump list；
- local graph view；
- relation layer filter；
- visual edge 与 ObjectRelation 分离；
- bundled relation display；
- relation low-level dimensions 进入 metadata/advanced inspector。

### Out of Scope

- 不做完整 graph database；
- 不做 AI relation proposal；
- 不默认画所有线；
- 不做完整 Relation Studio。

### 必读 Reference

- R8；
- product register PI-029、PI-030、PI-031；
- v2.4.4 review；
- PI-046 R15 GraphRAG reports。

### 验收标准

- 用户选中 block 可看到相关对象；
- AI 不需要重新发明 local graph；
- 跨页关系默认不画长线；
- visual-only edge 和 semantic relation 不混淆。

## 14. Phase A7c - Concept-Lite Search And Inspector UX

### 目标

为跨笔记检索和未来 GraphRAG 预留 Concept 层，但不把第一版 Better Notebook 变成标签维护系统。

### 必做

- inspector 中 Concepts tab；
- concept-like chips 可选显示；
- search/filter 支持 concept-like metadata；
- AI context payload 可包含 concept candidates；
- Concept 与 Template/Domain 区分清楚。

### Out of Scope

- 不做完整 Concept Studio；
- 不做 ConceptRefinementProposal；
- 不做全库 backfill；
- 不做 ConceptDimensionProposal。

### 必读 Reference

- R8；
- product register open questions 112-121；
- PI-046 R15；
- v2.5 DomainRefinement review。

### 验收标准

- Concept 不抢正文视觉；
- 检索可以利用 concept-like metadata；
- 后续可升级为完整 Concept layer。

## 15. Phase F - Performance / Rebuild / Package Safety

### 目标

保证 Better Notebook 能面对真实规模，不是 1 页 demo。

### 必做

- viewport/page virtualization；
- block layout cache；
- relation lazy loading；
- source inspector lazy loading；
- page-aware projection index；
- export plan / batch rendering；
- editor snapshot loss rebuild；
- package reopen recovery；
- S/M/L/XL/XXL benchmark matrix。

### Out of Scope

- 不做性能完美主义；
- 不要求 200 页全功能丝滑；
- 不做完整 cloud sync；
- 不做 full backup。

### 必读 Reference

- R9；
- S3；
- product register PI-028、PI-034、PI-035、PI-036；
- v2.5.5 package import/export review。

### 验收标准

- 10 页日常可流畅；
- 50 页可用；
- 100 页可打开、导航、局部编辑；
- snapshot 丢失不丢内容；
- package reopen 有 recovery tray。

## 16. Phase G - Source Reconstruction And AI Note Assembly Readiness

### 目标

在 Better Notebook surface 成熟后，重新进入 AI note assembly、Source Reconstruction 和 GraphRAG readiness。

### 必做

- PI-048 Source Reconstruction research 落地为 spike；
- source type detection before chunking；
- SourceRegion schema；
- NoteBlockCandidate pipeline；
- NoteAssemblyPlan proposal；
- template selection engine；
- content role segmentation；
- role-aware reconciliation；
- GraphRAG sidecar spike；
- real materials evaluation harness。

### Out of Scope

- 不让 AI 绕过 proposal-first；
- 不让 GraphRAG 成为 truth；
- 不把所有 SourceRegions 自动变成 NoteBlocks；
- 不让外部 Agent 直接改核心数据。

### 必读 Reference

- PI-048 Outline；
- product register PI-045、PI-048、PI-049；
- PI-046 R15 series；
- V2.5Research summaries；
- R9 performance constraints。

### 验收标准

- 能处理 typed lecture note、手写数学 PDF、mixed formula/image PDF 的初步 reconstruction；
- 先产出 preview/proposal，再创建 NoteBlocks；
- AI-generated blocks 有 source/provenance；
- GraphRAG 只做 sidecar/proposal assistant。

## 17. 旧 v2.x 成果复用清单

应复用：

- NoteBlock foundation；
- note_block_sources；
- source snapshots；
- source anchors；
- source scopes；
- source boards；
- learning canvases；
- canvas nodes；
- canvas frames；
- canvas edges；
- object relations；
- relation layers；
- layout proposal；
- template definitions；
- template studio seed；
- composition templates；
- domain block sets；
- package manifests；
- package import/export；
- migration proposals；
- operation batches；
- proposal-first apply/discard pattern；
- continuity / review discipline。

这些都不应该被丢弃。它们只是不能继续以工程面板的方式直接暴露给普通用户。

## 18. 旧 UI 冻结建议

建议冻结继续扩张：

- Course Detail 长页面继续堆新 panel；
- Source Snapshot / Source Scope / Source Board / Canvas 都裸露在同一 rail；
- canvas node 常驻显示内部类型和 source board node 文案；
- selected object scope 常驻；
- relation layers 作为工程列表直接显示；
- Add Block 表单作为主要创建入口；
- Hide / Archive / Delete 文案混用。

冻结不等于删除。它们可以保留为 debug/dev mode 或过渡面板，但不要再作为新主线扩张。

## 19. 需要推后的能力

推后但不放弃：

- full AI note generation；
- Source Reconstruction；
- Microsoft GraphRAG product adoption；
- Neo4j / graph database migration；
- full Concept system；
- Role Studio；
- Style Studio；
- Package marketplace；
- external Agent API；
- iPad / handwriting surface；
- full PDF visual rendering；
- full project backup。

这些能力有价值，但都需要成熟 Better Notebook surface 承接。

## 20. 是否需要新 repo / spike repo

R10 建议：

```text
BlockSuite / editor runtime spike 可以在当前 repo 的实验目录或单独 spike repo 里做。
正式产品重构不建议立即开新主 repo。
```

原因：

- 当前 repo 已经有 v2.x substrate；
- 新 repo 容易丢掉历史工程证据；
- 但 spike 需要隔离依赖和失败风险；
- 如果 BlockSuite 依赖冲突严重，单独 spike repo 更干净。

建议正式 roadmap 写：

```text
Phase B0 may use an isolated spike workspace before committing runtime dependencies to main app.
```

## 21. Continuity 建议新增长期项

建议新增：

### BN-001: Better Notebook First Principle

Better Notebook 第一优先级是成熟人工笔记体验；AI note assembly、Source Reconstruction、GraphRAG 都必须服务这个表面。

### BN-002: Coincides Data Sovereignty

外部 editor runtime 只能是 interaction/runtime/cache，不得成为 source/relation/template/concept/proposal truth。

### BN-003: Editor Runtime Spike Gate Required

在大规模 UI 重构前，必须完成 BlockSuite PageEditor、BlockSuite Edgeless 和 self-owned fallback spike。

### BN-004: SourceRegion Deferred Until PI-048

SourceRegion 是未来 source reconstruction 的关键对象，但正式 schema 应等 PI-048 研究后再锁。

### BN-005: Concept-Lite Before Full Concept System

Concept 第一阶段只做 search/filter/inspector/AI context 的轻量入口，完整 refinement/backfill 后置。

### BN-006: Performance Is Product Design

长笔记性能、viewport virtualization、source lazy load、relation lazy load、snapshot rebuild 必须从设计阶段进入验收。

## 22. R10 对 Outline phase 草案的调整

Outline 原草案是：

```text
Phase A - Better Notebook Product Spec + UI Shell
Phase B - Natural Page Editing + Freeform NoteBlock
Phase C - Page / Canvas / Export Boundary
Phase D - Block Visual Language + Template Runtime Integration
Phase E - Source / Relation / Concept UX Integration
Phase F - Performance / Rebuild / Package Safety
Phase G - Source Reconstruction And AI Note Assembly Readiness
```

R10 调整为更细的阶段，是因为 R6-R9 显示：

- data contract 必须独立成阶段；
- editor runtime route 必须有 spike gate；
- source/relation/concept 不应混成一个一次性阶段；
- performance/rebuild 需要反向约束早期阶段。

## 23. R10 结论

新版 Better Notebook roadmap 应该以这句话为核心：

```text
先做一个成熟的人类笔记软件；
再把 Coincides 已有的 source、relation、template、proposal、package、AI-ready 语义能力安静地接进去；
最后再进入 Source Reconstruction、AI Note Assembly 和 GraphRAG。
```

这不是否定 v2.x，而是 v2.x 的真正出口。

v2.x 建好了很多“骨头”，Better Notebook 要把它变成一具能走路、能写字、能给人读的身体。正式 roadmap 不应该再从零发明，也不应该盲目 fork AFFiNE。它应该以 R0-R10 为索引，按阶段把 Coincides 从工程原型带到成熟自用笔记产品。
