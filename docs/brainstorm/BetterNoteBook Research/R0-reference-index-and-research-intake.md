# R0 - Reference Index And Research Intake

**Created**: 2026-06-05
**Status**: Complete
**Scope**: Better Notebook Research R0
**Evidence Level**: Existing Coincides research, roadmap/continuity evidence, design inference

## 目的

R0 的任务不是重新调研 Notion / AFFiNE，也不是提前写新版 roadmap。R0 的任务是把 Coincides 已经完成的大量 v2.x、PI-046、PI-048、v2.5 research 和 product improvement register 收束成一个可执行索引。

后续 R1-R10 每一阶段都应先回到这份索引，按阶段读取对应旧材料，再做新的观察、判断和 roadmap 草稿。这样可以避免两个问题：

- 旧研究被遗忘，导致同一问题反复重做；
- 新研究和 PI-046 / v2.5 research 脱节，导致 roadmap 内部自相矛盾。

## R0 总判断

Better Notebook 新路线应继承 v2.x 的语义地基，但冻结 v2.x 的工程面板式 UI 扩张。

v2.x 不是失败版本，它建立了 Source、NoteBlock、CanvasNode、ObjectRelation、TemplateDefinition、CompositionTemplate、DomainBlockSet、PackageManifest、Proposal、OperationBatch 等关键语义对象。但这些对象现在主要以工程面板和后台能力存在，还没有变成一个人类自然好用的笔记产品。

新路线的首要目标应是：

```text
先做一个人能舒服写、排版、阅读、导出的成熟笔记软件；
再把已有 source / template / relation / concept / package 能力嵌入进去；
最后再推进 AI note assembly、source reconstruction、GraphRAG 和外部 Agent 协作。
```

PI-046 的核心结论仍然成立：Coincides 不应 full fork AFFiNE，也不应把数据主权交给外部 editor runtime。更稳妥的方向是借鉴 Notion / AFFiNE 的交互成熟度，必要时 spike BlockSuite Edgeless-as-page，但 Coincides canonical truth 必须仍由自己的 NoteBlock、Source、Relation、Template、Domain、Proposal 记录掌握。

## Reference Selection Rules

后续报告读取旧材料时，不需要每次全量重读所有文档。建议按以下规则选择：

- 涉及产品定位、阶段顺序、是否重置 UI 路线：优先读 PI-046 synthesis / decision reports。
- 涉及空白页输入、freeform block-box、文本框式 NoteBlock、左右排版：优先读 PI-046 R4/R5 和 R4-R5 补充调研。
- 涉及 formal page、outside scratch、multi-page、export boundary：优先读 PI-046 R6。
- 涉及 AFFiNE / BlockSuite / 自研路线：优先读 PI-046 R7-R11、S3、最终 decision。
- 涉及 source reconstruction / OCR / VLM / Notion import：优先读 PI-048 Outline。
- 涉及模板、组合、领域包、开发者工具：优先读 v2.5 research R12-R14 和阶段总结。
- 涉及 relation / concept / GraphRAG：优先读 product improvement register、PI-046 R15、v2.5 R13。
- 涉及当前已经做过什么：优先读 roadmap closed section、release review files、continuity，再按需查代码。

## Must-read for new roadmap

### `docs/brainstorm/产品完善/PI-046 Research/PI-046-stage-summary-synthesis-and-recommendations.md`

用途：新版 Better Notebook roadmap 的主锚点。它把 v2.x 的“保留资产”和“需要停止继续堆叠的工程 UI”区分清楚。

必须继承：

- v2.x semantic substrate 保留；
- Course Detail 长面板式扩张应冻结；
- NoteBlock / CanvasNode / Source / Relation / Template / Domain / Proposal 都是可复用资产；
- 新路线应先做人类可用的 notebook，再做 AI-readable library，再做 AI proposal-first note assembly；
- GraphDB / Neo4j 迁移不是当前第一步。

### `docs/brainstorm/产品完善/PI-046 Research/Coincides-product-reset-and-editor-foundation-decision.md`

用途：新版路线的技术路线约束。它明确不 full fork AFFiNE、不直接把 AFFiNE 当 truth store、不马上 Neo4j。

必须继承：

- 第一候选 spike 是 BlockSuite Edgeless-as-page + Coincides semantic sidecar；
- Coincides-owned fallback 必须保留；
- editor runtime 可以提供交互，但不能拥有 NoteBlock / source / relation truth；
- Better Notebook 需要正式验证 formal page、outside scratch、layout save/rebuild、connector mapping、export/non-export boundary、multipage performance。

### `docs/Coincides-Roadmap.md`

用途：新版 roadmap 的边界文件。当前 roadmap 已关闭在 v2.0-v2.5.6，不应继续往旧 roadmap 里塞 Better Notebook 主线。

必须继承：

- v2.0-v2.5.6 是 closed foundation roadmap；
- Better Notebook 应单开新 roadmap；
- 产品总优先级是工程可靠 -> 用户可靠 -> 人机可靠。

### `docs/continuity/Coincides-Continuity.md`

用途：长期连续性约束。新版 roadmap 应保留 AFFiNE/BlockSuite reference-first、source-grounded identity、v3.x graph-native gate、AI-readable manual 等方向。

必须继承：

- Coincides 不是普通 Notion clone；
- AFFiNE/BlockSuite 是 reference，不是主权接管者；
- v3.x 前需要系统性 graph-native / Neo4j rebuild research gate；
- AI-readable operating manual 应继续作为工程纪律。

### `docs/continuity/2.x/v2.x-continuity.md`

用途：v2.x 遗留问题和开放项索引。新版 roadmap 要把其中 UI 原始、Source panel 堆叠、NoteBlock 卡片感、体验验收后置等问题吸收进去。

必须继承：

- v2.5 research / R14 是 v2.5 后续计划的参考；
- Engineering spec 是实施契约；
- v2.0-v2.5.6 roadmap 已关闭；
- graph-native evidence discipline 仍应保留。

## Must-read for editor/page/canvas work

### `docs/brainstorm/产品完善/PI-046 Research/R4-manual-notebook-minimum-usable-experience.md`

用途：定义“空白 note 应该像普通笔记软件一样自然开始写”的最低体验。R1/R2 必读。

重点继承：

- 空白页不能要求用户先理解 Add Block；
- 第一次点击应出现自然输入入口；
- 用户应该感觉自己在写文档，而不是在操作工程对象。

### `docs/brainstorm/产品完善/PI-046 Research/R5-page-editor-freeform-block-box-requirements.md`

用途：定义 Coincides 与 Notion/AFFiNE 的核心差异：NoteBlock 既是内容单位，又需要像文本框一样支持自由排版。

重点继承：

- NoteBlock 需要可移动、可 resize；
- 页面不应只能单列；
- 左文右图、左右双段、公式/图片/文本混排是核心差异，不是锦上添花；
- layout truth 和 content truth 必须分离。

### `docs/brainstorm/产品完善/PI-046 Research/R4-R5-补充调研.md`

用途：R2 的直接输入。它把用户最新强调的七项体验需求细化为工程判断。

重点继承：

- 用户不应感觉被 block 限制；
- 空白处点击/双击可以创建新 block；
- resize 改变排版，不改变内容 truth；
- 文本宽度变化后必须自动 reflow；
- block 边界默认弱显示，选中/布局模式才强调；
- 左右边界和 snap/alignment guide 是 Coincides 相对 Notion/AFFiNE 的关键增强点。

### `docs/brainstorm/产品完善/PI-046 Research/R6-page-canvas-modes-and-export-boundaries.md`

用途：R3 必读。它定义 formal page、outside workspace、locked page、open canvas、multipage 和 export boundary。

重点继承：

- 页面内内容默认导出，页面外 scratch 默认不导出；
- 页面外内容仍可作为用户私有备注、AI context 或 relation context；
- 页码、页眉、页脚、用户可见 page label 和内部 page index 不能混为一谈；
- seamless page stack / multipage view 需要和 PDF export 分离设计。

### `docs/brainstorm/产品完善/PI-046 Research/S2-r3-r6-object-model-manual-editor-page-canvas-summary.md`

用途：R2/R3/R6 的阶段总入口。它已经把 object ownership matrix 梳理出来。

重点继承：

- NoteBlock = content truth；
- CanvasNode / BlockBox = projection/layout；
- CanvasEdge = visual connector；
- ObjectRelation = semantic relation；
- SourceAnchor/SourceScope = evidence/provenance；
- Proposal/OperationBatch = operation/provenance。

## Must-read for source reconstruction work

### `docs/brainstorm/产品完善/PI-048 Research/Outline.md`

用途：Better Notebook 后续进入 AI note assembly 前的 source reconstruction 主大纲。

重点继承：

- Source reconstruction 不是最终 note generation；
- 先 source type detection，再 tool/model route，再 SourceRegion，再 NoteBlockCandidate；
- Notion handwritten scanned PDF import 是重要参考样本；
- SourceRegion 需要 page label、bbox、kind、reading order、text、latex、table、crop、confidence、tool provenance；
- 专项 OCR / layout / formula / VLM 工具优先于“最强模型硬扫全部”；
- PI-048 必须接入 PI-046 选定的 editor route。

### `docs/brainstorm/产品完善/product-improvement-issue-register.md`

用途：source reconstruction 相关需求的原始 register。R8/R10 和后续 source roadmap 必读。

重点继承：

- PI-032 layout-aware source parsing；
- PI-033 source document reconstruction into editable blocks；
- PI-036 block fusion / repeated decoration；
- PI-035 page numbering and visible page labels；
- PI-048 source reconstruction toolchain；
- source parsing 后应支持 NoteBlockCandidate、role segmentation、dedupe、template selection、note assembly proposal。

## Must-read for template/block visual work

### `docs/brainstorm/V2.5Research/r14-v2.5-roadmap-plan-revision-recommendations.md`

用途：v2.5 runtime 的总指导。R4/R6/R8 必读。

重点继承：

- TemplateDefinition 是契约，不是编辑器；
- runtime first, editor second；
- proposal-first 是危险变更边界；
- package 是数据，不是 executable plugin；
- behavior fields 是 policy，不是 truth；
- every version records graph-native evidence。

### `docs/brainstorm/V2.5Research/r12-rich-editor-adapter-spike-criteria.md`

用途：R7 必读。判断是否引入外部 editor runtime 时必须使用它的 hard gates。

重点继承：

- 外部 editor 只能是 adapter，不能成为 source of truth；
- NoteBlock identity、template metadata、source marker、ObjectRelation 必须 round-trip；
- adapter snapshot 可以缓存，但必须可删除后由 Coincides records 重建；
- Tiptap/ProseMirror、Lexical、BlockNote、Milkdown、BlockSuite 都只能作为候选，不应提前押死。

### `docs/brainstorm/V2.5Research/r13-v2.5-graph-native-migration-evidence.md`

用途：R6/R8/R10 必读。它定义哪些对象未来可能是 graph node/edge，哪些只是 projection/cache。

重点继承：

- NoteBlock、TemplateDefinition、CompositionTemplate、DomainBlockSet、PackageManifest、Proposal、OperationBatch 是强 graph node candidates；
- NoteBlock -> TemplateDefinition、NoteBlock -> SourceAnchor、DomainBlockSet -> Template/Composition 是强 edge candidates；
- CanvasNode layout、viewport、render hints、editor snapshot 是 projection/cache，不是 knowledge truth。

### `docs/brainstorm/V2.5Research/r1-r4-template-runtime-foundation-summary.md`

用途：R4/R6/R8 的模板基础参考。

重点继承：

- NoteBlock 要通过 runtime template metadata 解析；
- 旧 block 必须继续可读；
- 新 block 应写 runtime template metadata；
- template selection 后续要和 DomainBlockSet / PackageManifest 结合。

### `docs/brainstorm/V2.5Research/r5-r8-template-behavior-agent-editor-composition-summary.md`

用途：R4/R8 的 composition / behavior reference。

重点继承：

- CompositionTemplate 适合报告段落、公式组、证据对比等可复用 section；
- behavior/policy 决定 source、relation、proposal 怎么被建议，而不是直接改 truth；
- AI-readable manual / skill-like guide 对未来 agent 使用模板很重要。

### `docs/brainstorm/V2.5Research/r9-r11-domain-package-migration-summary.md`

用途：R8/R10 的 domain/package reference。

重点继承：

- DomainBlockSet 是模板选择范围，不是普通标签；
- package manifest 是本地数据合约，不是插件执行系统；
- domain / template / package 都需要 proposal-first migration 和 recovery。

## Must-read for relation/concept/GraphRAG work

### `docs/brainstorm/产品完善/product-improvement-issue-register.md`

用途：relation / concept / graph thinking 的原始需求池。R8 必读。

重点继承：

- PI-029 layered relation semantics beyond visual edges；
- PI-030 queryable subgraph view；
- PI-031 deterministic local knowledge graph views；
- PI-047 evolvable Concept layer；
- PI-049 Microsoft GraphRAG sidecar boundary。

其中 relation 的底层分解应作为后续 R8 的输入：

```text
relation_existence: unrelated / related
condition_kind: unconditional / conditional
composition_kind: simple_pair / group_relation / all_of / any_of / sequence / threshold
directionality: directed / bidirectional / undirected
semantic_family / domain_relation_type: read_before / derives_to / example_of / supports / ...
```

这不是最终 schema，但它是后续 relation design 不能遗忘的思考成果。

### `docs/brainstorm/产品完善/PI-046 Research/R15-summary-microsoft-graphrag-adoption-decision.md`

用途：R8/R10 和后续 GraphRAG 方向必读。

重点继承：

- Microsoft GraphRAG 值得 spike，但只能作为 rebuildable sidecar index；
- Coincides owns truth，GraphRAG owns discovery/query；
- GraphRAG discovers, Coincides decides；
- GraphRAG 关系不能直接变成 ObjectRelation；
- GraphRAG relation 应变成 RelationCandidate，再走 proposal/review；
- GraphRAG 不解决 OCR、公式识别、SourceRegion、layout、NoteBlock type、canvas projection。

### `docs/brainstorm/V2.5Research/r13-v2.5-graph-native-migration-evidence.md`

用途：判断哪些 Better Notebook 数据应为 v3.x graph-native 做证据。

重点继承：

- ObjectRelation 是未来 graph edge candidate；
- CanvasEdge 只是 projection/interaction object；
- relation layer 是显示、筛选、用途组织层；
- graph-native 迁移前仍应 SQLite-first，保留可重建 graph-shaped evidence。

## Historical only

以下材料仍有价值，但不应直接决定 Better Notebook 第一轮路线：

- `docs/releases/*v2.0-v2.5.6*` 版本状态文件：用于追溯某项能力为什么存在，但不要把它们当作新 roadmap 的产品形态。
- v2.3 Source Snapshot / SourceAnchor / SourceScope / SourceBoard 的具体 Course Detail UI：功能资产保留，当前展开式 UI 不保留。
- v2.4 Canvas Engine / Edge / Layout Proposal 的粗糙面板形态：数据模型和 projection 思路保留，视觉形态不继承。
- v2.5 Template Studio / Package Studio 的现有页面形态：runtime 和治理能力保留，日常用户界面不应照搬。
- 旧 Course 命名和课程式侧边栏：可作为历史来源，但新产品语义应重新考虑 Project / Notebook / Folder / Favorite。

## Open questions requiring new investigation

### Notion / AFFiNE mature baseline

- Notion 空白页首次点击、Enter、slash command、hover handle、右键菜单、drag handle 的真实行为是什么？
- AFFiNE page mode 和 edgeless mode 的切换、frame、connector、sticky note、favorite/sidebar 是如何暴露给用户的？
- 哪些控件常驻，哪些在 hover/selection/context menu 中出现？

### Freeform block-box interaction

- Coincides 应采用单击还是双击创建首个 block？
- 空白处点击创建新 block 时，如何避免误触产生大量空 block？
- 当左侧已有缩窄 text block 时，右侧点击的默认 block 宽度、高度、baseline 如何计算？
- resize 后 auto-height、manual height、overflow/overset 的优先级是什么？

### Page / canvas / export boundary

- formal page 内外内容的导出默认规则是否足够符合用户心智？
- outside scratch 中的 NoteBlock 是否应该默认可被 AI 读取？
- 跨页 block、跨页 hand-drawing、seamless page stack 如何导出？
- 页码、页眉、页脚是 PageTemplate、CanvasDecoration，还是特殊 repeated block？

### Editor runtime route

- BlockSuite Edgeless-as-page 是否真的能满足自然输入 + freeform resize/reflow + page boundary？
- 如果 BlockSuite 不满足，Coincides 自研最小 editor/canvas surface 到底需要多大？
- 外部 editor snapshot 删除后，能否从 Coincides records 重建？

### Source / relation / concept integration

- 用户如何给自己写的 block 批量 attach source？
- relation 何时显示成线，何时只进入 local graph / inspector？
- concept layer 第一版是否进入 Better Notebook 基础阶段，还是推后到 AI/RAG 阶段？
- SourceRegion 是否必须先等 PI-048 完整调研后才能进工程？

### Performance and rebuild

- 50/100/200 页 notebook 如何 virtualization？
- relation / source inspector / image / formula 如何 lazy load？
- project package reopen 后 layout 是否稳定？
- editor sidecar/cache 损坏后如何完整重建？

## Browser Harness Follow-up Targets

R0 不做新的 Browser Harness 观察，但后续阶段应优先观察以下流程：

- R1：Notion 空白页、slash command、hover handle、图片/公式/code/table 插入；AFFiNE page/edgeless、connector、frame、sticky note、favorite/sidebar。
- R2：Coincides 当前空白 note 和 canvas block 创建流程，与 Notion/AFFiNE 同任务对比。
- R3：AFFiNE edgeless 的 page/canvas 边界、frame、outside object；Coincides formal page / canvas panel 当前缺陷。
- R4：Notion/AFFiNE block 的默认视觉边界、选中态、hover 态、图片/公式/code/table 的视觉语言。
- R5：Notion/AFFiNE 工具栏、右键菜单、floating toolbar、keyboard shortcut 和 inspector 收纳。
- R7：如做 BlockSuite spike，需要 Browser Harness 验证自然输入、resize/reflow、side-by-side block、page boundary。

## Stage Summary Cadence

为避免最终报告变成流水账，本轮 Better Notebook research 应在以下阶段产出阶段总结：

- `S1-r0-r2-better-notebook-position-and-core-ux-summary.md`：总结 R0-R2，回答产品定位、成熟 baseline、核心交互规格。
- `S2-r3-r5-page-canvas-block-control-summary.md`：总结 R3-R5，回答 page/canvas/export、block visual language、controls/toolbar/context menu。
- `S3-r6-r8-data-source-relation-concept-summary.md`：总结 R6-R8，回答 data contract、editor route、source/relation/concept UX。
- `S4-r9-r10-performance-and-roadmap-synthesis-summary.md`：总结 R9-R10，回答性能/规模/重建和 roadmap synthesis。
- `Better-Notebook-research-final-decision-report.md`：最终总体报告，收束为新版 Better Notebook roadmap 的决策依据。

阶段总结不是重复报告正文，而是提炼：

- 已确定的产品决策；
- 仍未决的问题；
- 对 roadmap phase 的直接影响；
- 需要回填到 earlier reports 的修正；
- 需要进入 continuity 的长期约束。

## Roadmap Draft Impact

新版 Better Notebook roadmap 的 startup reading 不应写成“读全部旧研究”，而应分阶段引用。

建议新 roadmap 开头设置 `Required Research References`，并按以下层级组织：

1. **Product reset and direction**：PI-046 synthesis、decision report、closed roadmap、general continuity。
2. **Core notebook UX**：PI-046 R4/R5/R4-R5 supplement、R1/R2 本轮新报告。
3. **Page/canvas/export**：PI-046 R6、R3 本轮新报告。
4. **Block visual and controls**：v2.5 R12/R14、R4/R5 本轮新报告。
5. **Data contract and editor route**：PI-046 R3/R7-R11、v2.5 R13、R6/R7 本轮新报告。
6. **Source/relation/concept**：product register PI-020/029/030/031/047/048/049、PI-048 Outline、PI-046 R15、R8 本轮新报告。
7. **Performance and rebuild**：PI-046 decision criteria、R9 本轮新报告。

新版 roadmap 的第一阶段不应立刻做 AI note generation。第一阶段应聚焦：

- clean product shell；
- natural blank note editing；
- freeform NoteBlock / block-box；
- page/canvas/export boundary；
- minimum stable persistence/rebuild；
- enough block visual language to stop looking like engineering cards。

AI note assembly、source reconstruction、GraphRAG、external Agent API 应进入后续阶段，并且依赖 Better Notebook 基础体验稳定。

## Backfeed Notes

R0 是第一阶段，不反补前序阶段。

但 R0 对本轮 outline 有两个直接补充建议：

- outline 应明确阶段总结节奏，避免只到 R10 才一次性收束；
- R1-R9 报告中的 Browser Harness observation 应作为 evidence section，而不是临时聊天印象。
