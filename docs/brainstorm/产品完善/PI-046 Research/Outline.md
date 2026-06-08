# 产品完善调研 Outline

## 目的

这份 Outline 用来记录 Coincides 在进入下一步工程重构或新路线之前必须完成的系统调研。

当前核心问题不是继续加功能，而是重新判断：

- Coincides 是否应该继续沿当前代码主线打磨；
- 是否应该新开 repo 重做一个更成熟的笔记软件底座；
- 是否应该改编 AFFiNE / BlockSuite；
- 哪些现有 v2.x 成果应该保留为经验、数据结构或可迁移模块；
- 图结构、AI 读取、外部 Agent 调用应该在什么阶段进入。

本轮调研围绕 `PI-046: AFFiNE / BlockSuite Adoption Research Must Start With Coincides Architecture Inventory` 展开。

## 调研总原则

- 先理解 Coincides 自己是什么，再判断 AFFiNE / BlockSuite 能不能承载。
- 先做人类可用的笔记软件，再做 AI 可读的结构化笔记库。
- 先让内置 AI 按 Coincides 规则生成 proposal，再考虑外部 Agent/API 调度。
- 先确认 graph-shaped data model，再决定是否需要 graph database。
- 不把 AFFiNE 当成必然答案，也不把自研当成默认答案。
- 每份报告都要明确回答：解决了什么问题、暴露了什么风险、对 roadmap 有什么影响。

## 最终需要回答的问题

1. Coincides 的第一性目标到底是什么？
2. 当前 Coincides 哪些成果应该保留，哪些应该冻结，哪些应该放弃？
3. 一个不依赖 AI 的 Coincides 最小可用笔记体验是什么？
4. NoteBlock 对用户应该表现成什么，而不是只在数据库里是什么？
5. Page editor 是否必须支持 freeform block-box editing？
6. AFFiNE / BlockSuite 能不能被改造成 Coincides 想要的编辑体验？
7. 如果可以改造，应该 full fork、BlockSuite-first，还是 hybrid？
8. 如果不改造，Coincides 自研需要补哪些 editor/canvas 能力？
9. NoteBlock / ObjectRelation / Source / Template / Domain 的 canonical ownership 应该在哪里？
10. 图结构和图数据库之间应该如何分阶段？
11. 外部 Agent 应该只是调度 Coincides，还是能直接操作底层对象？
12. 下一阶段 roadmap 应该如何重写？

## 调研阶段

### R0: 调研大纲与评分标准

目标：

- 明确本轮调研范围、顺序、输出格式和最终决策标准。
- 给每条候选路线建立统一评分维度。

局部调查清单：

- [x] 重新读取本 Outline，确认 R0-R14 的范围没有互相覆盖或遗漏。
- [x] 定义每份阶段报告都必须包含的固定小节。
- [x] 定义“证据等级”：代码证据、产品体验证据、官方文档证据、第三方观察、推测。
- [x] 定义候选路线评分维度和 1-5 分评分语义。
- [x] 定义每个阶段完成后如何反补前序报告。
- [x] 定义每个阶段完成后如何在 Outline 中挂载后续依赖关系。
- [x] 定义阶段性总结何时触发，以及总结报告需要回答什么。
- [x] 定义最终决策报告如何从 R0-R14 收束到 roadmap 建议。

需要回答：

- 每份调研报告必须回答哪些问题？
- 最终决策报告应该怎样比较路线？
- 哪些维度必须评分：产品体验、工程成本、许可风险、数据模型冲突、长期维护、AI/graph 适配能力？

后续依赖：

- R1-R14 都必须使用 R0 的报告格式、证据等级和评分标准。
- R13 架构路线对比必须直接使用 R0 的评分维度。
- R14 最终决策报告必须引用 R0 的决策方法，避免只凭直觉重写 roadmap。

建议输出：

- `R0-research-method-and-decision-criteria.md`

已完成报告：

- `R0-research-method-and-decision-criteria.md`

完成后反补：

- R0 是方法论报告，不需要反补前序报告。
- 后续 R1-R14 必须使用 R0 的固定报告结构、证据等级、评分维度和反补机制。

### R1: Coincides 当前能力盘点

目标：

- 系统阅读当前代码和文档，明确 v2.x 已经做出了什么。
- 判断哪些是有价值地基，哪些只是实验性施工痕迹。

局部调查清单：

- [x] 盘点当前文档与 release/review 文件，确认 v2.x 已实现范围和施工痕迹。
- [x] 盘点 Source / Snapshot / Scope / Anchor 的 schema、API 和前端入口。
- [x] 盘点 Note / NoteBlock / NoteBlockPlacement / NoteBlockSource 的 schema、API 和前端编辑能力。
- [x] 盘点 Canvas / CanvasNode / CanvasFrame / CanvasEdge 的 schema、API 和前端交互能力。
- [x] 盘点 ObjectRelation / RelationLayer 的语义边能力和当前限制。
- [x] 盘点 TemplateDefinition / CompositionTemplate / DomainBlockSet / PackageManifest 的 runtime 能力。
- [x] 盘点 Proposal / OperationBatch / Recovery 的 proposal-first 和回滚/恢复能力。
- [x] 盘点当前 document parsing、embedding、RAG/search 能力。
- [x] 判断每一类能力属于：可保留地基、实验性施工痕迹、应冻结能力、应迁移经验。
- [x] 标记哪些 R2-R14 阶段必须引用 R1 结论。

需要覆盖：

- Source / Snapshot / Scope / Anchor
- Note / NoteBlock
- Canvas / CanvasNode / CanvasFrame / CanvasEdge
- ObjectRelation / RelationLayer
- TemplateDefinition / CompositionTemplate / DomainBlockSet / PackageManifest
- Proposal / OperationBatch / Recovery
- 当前 RAG / embedding / document parsing

建议输出：

- `R1-current-coincides-capability-inventory.md`

已完成报告：

- `R1-current-coincides-capability-inventory.md`

后续依赖：

- R2 必须引用 R1 的“可保留地基 / 实验性施工痕迹 / 应冻结能力 / 应迁移经验”分类，重新定义产品目标和四阶段路线。
- R3 必须引用 R1 的对象清单，判断 NoteBlock、Source、CanvasNode、ObjectRelation、TemplateDefinition、DomainBlockSet、Proposal 等对象的 canonical ownership。
- R4-R6 必须引用 R1 的 UX 缺口，细化人工笔记体验、freeform block-box、page/canvas/export 边界。
- R7-R8 必须引用 R1，把 AFFiNE / BlockSuite 与 Coincides 当前 source/proposal/template/relation 地基做对照。
- R9-R11 必须引用 R1，判断 adoption route 是否能保留 Coincides 语义层，而不只是换一个编辑器外壳。
- R12 必须引用 R1 的 document/chunk RAG 现状，设计 NoteBlock / Concept / Relation / GraphRAG 的后续检索路线。
- R13 必须引用 R1 的能力分类表进行路线评分。
- R14 必须引用 R1 作为最终 roadmap rewrite 的当前能力基线。

完成后反补：

- R1 不需要反补 R0；R0 的报告格式、证据等级和评分标准仍然适用。
- 如果 R7-R11 发现 AFFiNE / BlockSuite 能直接承载或不能承载某些 Coincides canonical object，需要回到 R1 增补 addendum，更新“可保留地基”和“应冻结能力”的分类。

### R2: Coincides 产品目标重置

目标：

- 把 Coincides 的成长顺序重新定义清楚。

局部调查清单：

- [x] 引用 R1 的当前能力分类，确认哪些能力支撑产品目标、哪些只是施工痕迹。
- [x] 重新定义 Coincides 的第一性目标：先是笔记软件，还是 AI 信息中台。
- [x] 拆解“人能用的笔记软件”阶段需要具备的最低能力。
- [x] 拆解“AI 能读的结构化笔记库”阶段需要具备的最低能力。
- [x] 拆解“内置 AI 帮忙整理 / 生成笔记”阶段需要具备的最低能力。
- [x] 拆解“外部 Agent/API 调度 Coincides”阶段需要具备的最低能力。
- [x] 判断 AI 信息中台、自生长知识库、GraphRAG、外部 Agent 工作流哪些应进入后续阶段，哪些不应压到当前产品地基。
- [x] 明确外部 Agent 是否能直接修改底层对象，还是只能触发 Coincides 内部 proposal。
- [x] 形成对 roadmap 的阶段顺序建议。
- [x] 标记哪些 R3-R14 阶段必须引用 R2 结论。

推荐阶段：

1. 人能用的笔记软件。
2. AI 能读的结构化笔记库。
3. 内置 AI 帮忙整理 / 生成笔记。
4. 外部 Agent/API 调度 Coincides。

需要回答：

- Coincides 首先是不是一个笔记软件？
- AI 信息中台和笔记软件之间的边界是什么？
- 哪些外部 Agent 行为应该只触发 Coincides 内部 proposal，而不是直接改数据？

建议输出：

- `R2-product-reset-and-four-phase-strategy.md`

已完成报告：

- `R2-product-reset-and-four-phase-strategy.md`

后续依赖：

- R3 必须引用 R2 的四阶段路线，判断哪些对象属于人工笔记层、AI-readable substrate、AI generation workflow、外部 Agent orchestration。
- R4-R6 必须服务 R2 的 Layer A，定义不依赖 AI 的成熟笔记体验、freeform block-box、page/canvas/export。
- R7-R8 必须判断 AFFiNE / BlockSuite 能否加速 R2 的人工笔记层，而不是替代 Coincides 全部语义层。
- R9-R11 必须在四阶段路线下比较 full fork、BlockSuite-first、hybrid、自研路线。
- R12 必须服务 R2 的 Layer B，设计 AI-readable structured note substrate。
- R13 必须把路线评分和 R2 的四阶段路线绑定。
- R14 必须把 roadmap rewrite 收束成“先笔记产品，再结构化 substrate，再内置 AI，再外部 Agent”的顺序。

完成后反补：

- R2 不需要改写 R0。
- R2 对 R1 的轻微反补建议是：R1 的“应冻结能力”可以进一步明确包括继续扩展 Calendar / Goal / study planning、继续在 Course Detail 堆面板、让外部 Agent 直接改底层对象。R1 已经表达这些点，暂不修改正文；R13/R14 汇总时统一吸收。

阶段性总结：

- R0-R2 完成后需要产出 `S1-r0-r2-method-inventory-product-reset-summary.md`，总结方法、当前能力和产品目标重置。
- 已完成：`S1-r0-r2-method-inventory-product-reset-summary.md`

### R3: Coincides 核心对象模型

目标：

- 明确哪些对象必须由 Coincides 自己掌控。

局部调查清单：

- [x] 引用 R1 的当前能力盘点和 R2 的四阶段路线，定义对象 ownership 判断标准。
- [x] 判断 NoteBlock 是否是核心知识对象，以及它在人工笔记层和 AI-readable substrate 中的角色。
- [x] 判断 Note / Project / Course 是否是容器、导航对象、graph node，还是产品命名问题。
- [x] 判断 SourceSnapshot / SourceAnchor / SourceScope / EvidenceSet 是节点、边、证据还是 metadata。
- [x] 判断 Canvas / CanvasNode / CanvasFrame / CanvasEdge 是否属于 projection layer。
- [x] 判断 ObjectRelation / RelationLayer 是否是 future graph edge / graph view layer。
- [x] 判断 TemplateDefinition / CompositionTemplate / DomainBlockSet / PackageManifest 是否属于 capability node。
- [x] 判断 Proposal / OperationBatch / MigrationRecord / ImportExportRecord 是否属于 operation/provenance，而不是知识 truth。
- [x] 建立最小 canonical ownership matrix。
- [x] 标记哪些 R4-R14 阶段必须引用 R3 结论。

需要回答：

- NoteBlock 是否是核心知识对象？
- SourceScope / SourceAnchor / EvidenceSet 是节点、边、证据还是 metadata？
- CanvasNode 是否只是投影？
- ObjectRelation 是否是 graph edge candidate？
- TemplateDefinition / DomainBlockSet 是否是 capability node？
- Proposal / OperationBatch 是否是历史记录还是 graph truth？

建议输出：

- `R3-coincides-core-object-model.md`

已完成报告：

- `R3-coincides-core-object-model.md`

后续依赖：

- R4 必须基于“NoteBlock 是内容 truth，presentation 可变化”来设计人工输入体验。
- R5 必须基于“block-box 是 placement/presentation，不是新的内容 truth”来设计 freeform block-box。
- R6 必须基于“Canvas 是 projection/view”来设计 page/canvas/export。
- R7-R8 必须检查 AFFiNE / BlockSuite 是否能保留 Coincides canonical identity mapping。
- R9-R11 必须比较不同 adoption route 对 ownership matrix 的影响。
- R12 必须基于 NoteBlock/ObjectRelation/SourceScope/Template/Domain 的 ownership 设计 AI-readable retrieval。
- R13 必须把 ownership preservation 加入路线评分。
- R14 必须把 ownership matrix 写进 roadmap rewrite 的架构约束。

完成后反补：

- R3 不需要改写 R0 或 R2。
- R3 对 R1 的补充是：R1 的能力分类应在 R13/R14 汇总时加入 ownership matrix，特别强调 CanvasNode 不是 truth、CanvasEdge 不是 semantic edge、ObjectRelation 是 graph edge candidate、Template/Domain/Package 是 capability nodes、Proposal/OperationBatch 是 operation/provenance nodes。

### R4: 人工笔记软件最小可用体验

目标：

- 定义一个不依赖 AI 也好用的 Coincides 笔记体验。

局部调查清单：

- [x] 引用 R2 的 Layer A 和 R3 的 NoteBlock/content truth 判断，定义人工笔记体验边界。
- [x] 盘点当前 Note editor / Course Detail / Canvas Surface 中人工创建和编辑 block 的实际能力。
- [x] 定义空白笔记打开后用户期待看到的状态。
- [x] 定义点击、双击、slash command、toolbar、右键菜单、hover 信息分别承担什么。
- [x] 定义手动创建 text / formula / image / code / table / source quote / callout block 的最低体验。
- [x] 定义 block 选择、移动、删除、复制、resize、样式修改的最低体验。
- [x] 定义手动 block 与 source 连接、批量 source 连接、页/段级 source 连接的最低体验。
- [x] 定义正式页面内容、页面外草稿区、用户备注、导出内容之间的边界。
- [x] 判断当前 v2.x 哪些 UI 能作为 seed，哪些应重做。
- [x] 标记哪些 R5-R14 阶段必须引用 R4 结论。

需要回答：

- 空白笔记打开后用户期待看到什么？
- 点击 / 双击空白区域如何输入？
- slash command 如何创建 block？
- 图片、公式、表格、代码、引用如何插入？
- block 如何选择、移动、删除、复制、调整样式？
- 导出前的正式页面内容和草稿区内容如何区分？

建议输出：

- `R4-manual-notebook-minimum-usable-experience.md`

已完成报告：

- `R4-manual-notebook-minimum-usable-experience.md`

后续依赖：

- R5 必须细化 freeform block-box：如何 resize、并排、collision-aware insertion。
- R6 必须细化 page/canvas/export：formal page、scratch area、multi-page、seamless page stack。
- R7 必须观察 AFFiNE 是否提供类似自然 page editing + edgeless canvas。
- R8 必须检查 BlockSuite 是否能承载 NoteBlock identity、source attach 和 block-box 需求。
- R9-R11 必须把 manual notebook UX 纳入 adoption route 评分。
- R12 必须考虑人工 block 的 source、concept、relation、private/scratch metadata 如何被 AI 读取。
- R13/R14 必须把 manual UX 作为路线选择的首要条件，而不是把 AI 生成能力放在第一。

完成后反补：

- R4 不需要改写 R0-R3。
- R4 强化了 R2 的判断：Coincides 第一阶段必须是人工笔记软件。R13/R14 汇总时应把“页面即编辑入口，而不是表单添加 block”写进 roadmap。

### R5: Page Editor Freeform Block-Box 需求细化

目标：

- 研究 Coincides 独有的页面编辑模型。

局部调查清单：

- [x] 引用 R3 的 ownership matrix，确认 block-box 是 presentation/placement，不是新的内容 truth。
- [x] 引用 R4 的人工笔记体验，定义为什么表单式 block 添加不够。
- [x] 定义普通阅读/编辑状态与 layout edit mode 的区别。
- [x] 细化双击空白处创建 block 的插入规则。
- [x] 细化已存在 block 右侧空白处双击创建并排 block 的规则。
- [x] 细化 block resize 对文本换行、内容流、导出和 AI 读取的影响。
- [x] 判断 block-box 数据应放在 `note_block_placements`、`canvas_nodes`，还是新增 page layout object。
- [x] 判断是否需要 collision-aware insertion、snap/grid、alignment guides。
- [x] 判断哪些需求必须先调研 AFFiNE / BlockSuite 才能决定是否自研。
- [x] 标记哪些 R6-R14 阶段必须引用 R5 结论。

核心用例：

- 双击 page 空白处进入输入。
- 文本像普通文档一样出现光标。
- 输入或 slash command 创建 NoteBlock。
- 切换布局编辑视图后，NoteBlock 表现为可选择的 box。
- block box 可拖动、可 resize。
- 缩窄一个段落 block 后，文字在 box 内提前换行。
- 在右侧空白处双击，可创建与左侧 block 视觉并排的新 block。

需要回答：

- 这是 page editor、canvas editor，还是二者混合？
- 数据上这是 NoteBlock placement、CanvasNode，还是新的 page layout object？
- 是否需要 collision-aware insertion？
- 是否需要把 block 的 text flow shape 作为 layout 属性保存？

建议输出：

- `R5-page-editor-freeform-block-box-requirements.md`

已完成报告：

- `R5-page-editor-freeform-block-box-requirements.md`
- `R4-R5-补充调研.md`

后续依赖：

- R6 必须定义 page/canvas mode 和导出边界，决定 block-box 在 formal page 和 scratch area 中的行为。
- R7 必须观察 AFFiNE 的 page/edgeless 是否支持或接近 block-box。
- R8 必须检查 BlockSuite 的 block schema、layout、selection、drag/resize 能力。
- R9-R11 必须把 block-box 作为 adoption route 评分核心项。
- R12 必须定义 AI 如何读取 block-box layout：内容优先，layout 作为辅助 context。
- R13/R14 必须根据 block-box 实现成本决定自研、fork、hybrid 或 defer。

完成后反补：

- R5 不需要修改 R0-R4。
- R5 强化了 R4 的判断：自然笔记体验不只是“点击输入”，还包括 block 可在页面二维布局中自然存在。R13/R14 汇总时应把 freeform block-box 写成 Layer A 的核心需求之一。
- R4/R5 补充调研进一步明确：用户写作时不应感到被 block 限制；空白处双击默认创建新的独立 NoteBlock；新 text block 默认撑满 formal page 可用宽度，但可 resize；resize 后文字必须 reflow 且高度默认 auto grow；左右并排、左图右文、alignment guide 和 snap 是 editor foundation spike 的核心验收点。

### R6: Canvas / Page 模式需求

目标：

- 定义 formal page area、outside-page workspace、多页视图和导出边界。

局部调查清单：

- [x] 引用 R3 的 projection/view layer 和 R5 的 block-box placement 判断。
- [x] 定义 locked single page、open canvas、multi-page grid、seamless page stack 四种模式。
- [x] 定义 formal page area 与 outside-page workspace 的默认行为。
- [x] 定义页面外 sticky notes / scratch work 是否导出、是否能建立 relation、是否能被 AI 读取。
- [x] 定义 PDF/export、HTML/export、PNG/export、工程文件 export 的不同边界。
- [x] 定义页面内/页面外对象的 export intent 和 visibility metadata。
- [x] 定义多页视图下 page break、page label、internal page index、用户页码之间的关系。
- [x] 判断当前 `learning_canvases` 的 finite/infinite/page_size 能保留什么，还缺什么。
- [x] 判断哪些模式必须先调研 AFFiNE / BlockSuite 或其他画布/文档工具。
- [x] 标记哪些 R7-R14 阶段必须引用 R6 结论。

需要覆盖：

- locked single page
- open canvas
- multi-page grid
- seamless page stack
- page-break guide
- outside-page sticky notes / scratch work
- PDF/export 边界

建议输出：

- `R6-page-canvas-modes-and-export-boundaries.md`

已完成报告：

- `R6-page-canvas-modes-and-export-boundaries.md`

后续依赖：

- R7 必须观察 AFFiNE 的 page/edgeless/export 是否能覆盖 R6 模式。
- R8 必须检查 BlockSuite 是否能支持 page metadata、export intent、outside workspace。
- R9-R11 必须把 page/canvas/export boundary 纳入 route 评分。
- R12 必须考虑 AI 如何读取 formal/scratch/private content。
- R13/R14 必须决定这些模式是 2.x 后续产品打磨，还是新路线第一阶段。

完成后反补：

- R6 不需要修改 R0-R5。
- R6 对 R4/R5 有两个强化：人工笔记体验必须包含导出边界；block-box placement 必须包含 export intent / ai visibility，而不只是 x/y/width/height。

阶段性总结：

- R3-R6 完成后需要产出 `S2-r3-r6-object-model-manual-editor-page-canvas-summary.md`，总结对象模型、人工笔记、block-box、page/canvas/export 边界。
- 已完成：`S2-r3-r6-object-model-manual-editor-page-canvas-summary.md`

### R7: AFFiNE 产品体验调研

目标：

- 从用户体验角度研究 AFFiNE，而不是先看代码。

局部调查清单：

- [x] 引用 S2 的对象模型、人工笔记、block-box、page/canvas/export 约束作为评价标准。
- [x] 盘点 AFFiNE app shell、sidebar、favorites、page entrance 和 workspace navigation。
- [x] 观察 page mode 的空白页输入、block 插入、block 选择、移动和基础编辑体验。
- [x] 观察 edgeless/canvas mode 的 pan、zoom、tool palette、frame、sticky/image/connector 等交互。
- [x] 判断 AFFiNE 是否提供或接近 freeform block-box、并排 block、resize text box、spatial click-to-type。
- [x] 判断 AFFiNE 的 page/edgeless 双模式与 Coincides locked page / open canvas / multi-page / seamless stack / export intent 的关系。
- [x] 记录可以直接借鉴的体验模式。
- [x] 记录与 Coincides source/proposal/template/domain/relation 地基冲突的体验模式。
- [x] 标记 R8-R14 哪些阶段必须引用 R7 结论。

需要观察：

- page mode 如何写作；
- canvas / edgeless mode 如何交互；
- block 如何插入、移动、转换；
- 是否有可 resize 的 block box；
- page 与 canvas 的切换是否适合 Coincides；
- 它有哪些成熟体验值得借鉴；
- 它有哪些体验和 Coincides 目标冲突。

建议输出：

- `R7-affine-product-experience-review.md`

已完成：

- `R7-affine-product-experience-review.md`

后续依赖：

- R8 必须验证 AFFiNE / BlockSuite license、monorepo 复杂度，以及 BlockSuite 是否可独立使用。
- R9 必须专门验证 AFFiNE page editor 是否能承载 freeform block-box，而不能只看 page mode 是否自然。
- R10 必须验证 edgeless canvas 是否能承载 Coincides formal page、outside workspace、多页和 export intent。
- R11 必须基于 R7 的体验结论，设计 Coincides semantic sidecar / adapter / dual-write / ownership mapping。
- R12 必须把 AFFiNE block 体验与 Coincides NoteBlock、ObjectRelation、Concept、Embedding 的 AI-readable 结构联系起来。
- R13 必须同时计算 AFFiNE 成熟体验加分和 source/provenance/semantic ownership 风险扣分。
- R14 必须把“值得深入但不能盲目改编”作为 adoption 决策前提。

完成后反补：

- R7 不修改 R0-R6 正文；它强化了 R4-R6 的判断：自然 page editor 和成熟 edgeless canvas 是 Coincides 必须补齐的产品地基，但 source/proposal/template/domain/relation 层必须保持独立判断。

### R8: AFFiNE / BlockSuite 代码和许可调研

目标：

- 研究 AFFiNE / BlockSuite 是否适合被 fork、copy、依赖或仅借鉴。

局部调查清单：

- [x] 引用 R7 的体验结论，避免只看 license 而忽略产品体验价值。
- [x] 检查 AFFiNE 根目录 license、README license 说明和 package 结构。
- [x] 检查 BlockSuite 独立仓库 / AFFiNE 内 blocksuite 子目录的 license 与 package 结构。
- [x] 判断 AFFiNE 是 app shell + backend + editor + canvas + sync 的整体产品，还是可轻量拆分。
- [x] 判断 BlockSuite 是否可能作为独立 editor runtime 被 Coincides 使用。
- [x] 盘点 AFFiNE / BlockSuite 对 CRDT、local-first、sync、workspace data engine 的依赖。
- [x] 标记 full fork / copy 改造、BlockSuite-first、hybrid、仅借鉴四条路线的代码许可风险。
- [x] 标记 R9-R14 哪些阶段必须引用 R8 结论。

需要回答：

- AFFiNE 哪些部分是 MIT，哪些部分不是？
- BlockSuite 的 MPL-2.0 对我们意味着什么？
- 是否能只使用 BlockSuite 而不 fork 整个 AFFiNE？
- AFFiNE monorepo 的复杂度有多高？
- 后端 / app shell / editor runtime / canvas runtime 如何拆分？

建议输出：

- `R8-affine-blocksuite-code-license-review.md`

已完成：

- `R8-affine-blocksuite-code-license-review.md`

后续依赖：

- R9 必须验证 BlockSuite PageEditor 是否可承载 freeform block-box，而不是只验证自然写作。
- R10 必须验证 BlockSuite EdgelessEditor 是否能承载 formal page / outside workspace / export intent。
- R11 必须设计 BlockSuite block id 与 Coincides NoteBlock / Source / Template / Relation / Proposal 的 sidecar mapping。
- R12 必须基于 R8 的 hybrid 路线，设计 AI-readable substrate 不被 editor runtime 锁死。
- R13 必须把 full fork、BlockSuite-first、hybrid、自研 fallback 四条路线分开评分。
- R14 必须把“不整搬 AFFiNE，优先验证 BlockSuite-first/hybrid”作为中间结论，而不是最终结论。

完成后反补：

- R8 不修改 R0-R7 正文；它把 R7 的“值得深入”收窄为“不要整搬 AFFiNE，优先验证 BlockSuite-first 或 hybrid”。R9-R11 需要继续验证此路线是否真实成立。

### R9: AFFiNE Page Editor 改造可行性

目标：

- 专门判断 AFFiNE / BlockSuite 的普通 page editor 能不能支持 Coincides 的 freeform block-box editing。

局部调查清单：

- [x] 引用 R5/R6 的 block-box、page/canvas/export 需求作为判断标准。
- [x] 引用 R7/R8 的结论，优先验证 BlockSuite-first/hybrid 而不是 full fork。
- [x] 查找 PageEditor / page root / note / paragraph / drag handle / page dragging area 的实现和测试证据。
- [x] 判断普通 page mode 的 block 是否天然是线性 flow。
- [x] 判断普通 page mode 是否已有 resize / box width / parallel block 的机制。
- [x] 判断 edgeless note 的 resize 能否迁移到 page mode，或只能作为 edgeless 能力存在。
- [x] 判断 spatial click-to-type / collision-aware insertion 在 PageEditor 中需要改动哪一层。
- [x] 给出 PageEditor 直接改造、PageEditor + overlay layout、Edgeless-as-page、Coincides sidecar 四种方向的可行性判断。
- [x] 标记 R10-R14 哪些阶段必须引用 R9 结论。

必须验证：

- 直接输入体验能否保留；
- block 是否能成为可 resize box；
- block 是否能在 page 内自由移动；
- spatial click-to-type 是否能实现；
- 是否必须改动核心 block model；
- 改造是否会和 AFFiNE 的线性文档模型冲突。

建议输出：

- `R9-affine-page-editor-adaptation-feasibility.md`

已完成：

- `R9-affine-page-editor-adaptation-feasibility.md`

后续依赖：

- R10 必须把 Edgeless-as-page / formal page in canvas 作为优先验证路线，而不是继续优先强改 PageEditor。
- R10 必须验证 frames、surface、xywh、connectors、viewport、formal page、outside workspace、多页、导出和大文档性能。
- R11 必须设计 Coincides semantic sidecar：BlockSuite block id 只能是 editor/projection id，不能替代 Coincides NoteBlock id。
- R11 必须解决 NoteBlock、SourceAnchor、SourceScope、ObjectRelation、TemplateDefinition、DomainBlockSet 与 BlockSuite runtime 的稳定映射。
- R12 必须把 AI-readable layout 与 PageEditor 线性 flow 解耦；AI 读取应以 Coincides NoteBlock / relation / concept / source 为主，BlockSuite layout 为辅助 context。
- R13 必须给 PageEditor direct modification 较低评分，除非 R10/R11 给出强反证。
- R14 必须把“不要优先强改 PageEditor，优先验证 Edgeless-as-page + Coincides sidecar”写入最终路线建议。

完成后反补：

- R9 不修改 R0-R8 正文。
- R9 强化 R5/R6：freeform block-box 不应强塞进传统文档流；formal page、outside workspace、export intent 更适合由 canvas/page projection 层承担。
- R9 强化 R8：BlockSuite-first / hybrid 仍然值得验证，但重点应从 PageEditor 转向 Edgeless-as-page。

### R10: AFFiNE Edgeless / Canvas 改造可行性

目标：

- 判断 AFFiNE 的 edgeless canvas 是否能承载 Coincides 的页面/画布需求。

局部调查清单：

- [x] 引用 R6/R9 的 formal page、outside workspace、export intent、Edgeless-as-page 结论作为判断标准。
- [x] 查找 EdgelessEditor / root block / surface block / frame block / note block / connector 的官方文档证据。
- [x] 查找 edgeless root、surface、frame、note、connector、viewport、selection、tool palette 的源码或测试证据。
- [x] 判断 formal page area 能否作为 frame/page object 在 edgeless canvas 中存在。
- [x] 判断 outside-page workspace 是否是 edgeless 的自然能力，以及如何和 export intent 区分。
- [x] 判断 multi-page grid 和 seamless page stack 能否通过 frame/page object + page metadata 实现。
- [x] 判断 visual connector 与 Coincides CanvasEdge / ObjectRelation 是否能分层映射。
- [x] 判断大文档、多页面、多 block、多 relation 的性能风险和需要后续 benchmark 的位置。
- [x] 给出 Edgeless-as-page、Edgeless + PageEditor hybrid、Coincides-owned canvas fallback 三种方向的可行性判断。
- [x] 标记 R11-R14 哪些阶段必须引用 R10 结论。

需要回答：

- formal page area 是否能作为 canvas 内对象存在；
- outside-page workspace 是否自然；
- multi-page grid 和 seamless page stack 是否能实现；
- source-linked block / semantic NoteBlock 是否能投射；
- visual edge 与 ObjectRelation 是否能分离；
- 画布性能和大文档场景如何。

建议输出：

- `R10-affine-edgeless-canvas-adaptation-feasibility.md`

已完成：

- `R10-affine-edgeless-canvas-adaptation-feasibility.md`

后续依赖：

- R11 必须定义 sidecar identity map：BlockSuite doc/root/surface/note/frame/connector 与 Coincides Note、NoteBlock、CanvasNode、CanvasFrame、CanvasEdge、ObjectRelation 的稳定映射。
- R11 不能只靠 frame geometry 判断页面归属，必须加入 Coincides page membership / export intent / AI visibility metadata。
- R12 必须把 AI 可读性、formal/scratch/private、source provenance、page label 与 editor runtime 解耦。
- R13 必须给 Edgeless-as-page 较高优先级评分，但同时扣除 export、sidecar、大文档 benchmark 风险。
- R14 必须把“BlockSuite Edgeless-as-page + Coincides semantic sidecar”写入第一候选路线，并保留 Coincides-owned canvas fallback。

完成后反补：

- R10 强化 R6：formal page、outside workspace、multi-page grid、seamless stack 有可承载的空间引擎，但 export intent、page label、formal/scratch/private 仍必须由 Coincides 自己定义。
- R10 强化 R9：PageEditor direct modification 不应优先；R8 的 BlockSuite-first / hybrid 路线应收窄为“BlockSuite Edgeless-as-page + Coincides sidecar”，而不是整体复制 AFFiNE 或强改 PageEditor。

### R11: Coincides 数据模型接入 AFFiNE 的方式

目标：

- 比较 Coincides 语义层和 AFFiNE / BlockSuite 编辑层的接法。

局部调查清单：

- [x] 引用 R3 的 canonical ownership matrix、R8 的 BlockSuite-first/hybrid 判断、R9 的 PageEditor 风险、R10 的 Edgeless-as-page 结论。
- [x] 盘点 Coincides 当前 NoteBlock、SourceAnchor、SourceScope、CanvasNode、CanvasFrame、CanvasEdge、ObjectRelation、TemplateDefinition、DomainBlockSet、Proposal 等核心对象的身份字段。
- [x] 盘点 BlockSuite doc/root/surface/note/frame/connector 的 adapter identity 和可持久化字段。
- [x] 判断 Coincides 对象是否应嵌入 BlockSuite block model、作为 sidecar、双写，还是通过 import/export bridge 映射。
- [x] 设计最小 sidecar identity map：Coincides id、BlockSuite adapter id、target_type、target_id、version、sync status。
- [x] 判断 source-grounded NoteBlock 如何不被 AFFiNE/BlockSuite 模型吞掉。
- [x] 判断 ObjectRelation 如何和 connector / CanvasEdge 对齐，但保持 semantic truth 独立。
- [x] 判断 TemplateDefinition / DomainBlockSet / Concept 等能力层如何被 editor runtime 使用，但不由 editor runtime 拥有。
- [x] 判断 Proposal / OperationBatch / Recovery 如何和编辑器操作记录分离。
- [x] 给出 full fork、BlockSuite-first sidecar、dual-write、import-export bridge、Coincides-owned fallback 的接入判断。
- [x] 标记 R12-R14 哪些阶段必须引用 R11 结论。

候选方案：

- 改 AFFiNE block model。
- Coincides NoteBlock 作为 AFFiNE block sidecar。
- AFFiNE 只负责编辑，Coincides 保留 source/semantic/graph/proposal 层。
- 双写 / adapter / import-export bridge。

需要回答：

- source-grounded NoteBlock 能否不被 AFFiNE 模型吞掉？
- ObjectRelation 如何和 AFFiNE block ID 对齐？
- Canvas placement 谁是 truth？
- 未来 graph model 如何保持稳定？

建议输出：

- `R11-coincides-affine-data-model-bridge.md`

已完成：

- `R11-coincides-affine-data-model-bridge.md`

后续依赖：

- R12 必须以 Coincides sidecar 为基础定义 graph-shaped data，而不是从 BlockSuite editor tree 推导知识图谱。
- R12 必须判断 NoteBlock、ObjectRelation、Concept、SourceAnchor、TemplateDefinition、DomainBlockSet 哪些是 graph node / edge candidate。
- R13 必须把 BlockSuite-first sidecar 作为独立路线评分，不和 full fork 混在一起。
- R13 必须把 adapter/sync/recovery 成本列为 BlockSuite-first sidecar 的主要风险。
- R14 必须把“先做 sidecar spike，再决定是否大规模采用 BlockSuite”写进最终路线建议。

完成后反补：

- R11 强化 R3：CanvasNode / CanvasFrame / CanvasEdge 是 projection；ObjectRelation 是 semantic edge candidate；TemplateDefinition / DomainBlockSet 是 capability node candidate；Proposal / OperationBatch 是 operation/provenance。
- R11 强化 R10：Edgeless-as-page 只有在 Coincides sidecar 成立时才成立；如果 sidecar 失败，BlockSuite 画布能力不能单独解决 Coincides 的产品问题。

阶段性总结：

- R7-R11 完成后产出 `S3-r7-r11-affine-blocksuite-adoption-summary.md`，总结 AFFiNE / BlockSuite 产品体验、代码许可、PageEditor、Edgeless 和 sidecar 接入路线。
- 已完成：`S3-r7-r11-affine-blocksuite-adoption-summary.md`

### R12: Graph Model Before Graph Database

目标：

- 先定义图结构，再判断是否需要图数据库。

局部调查清单：

- [x] 引用 R3 ownership matrix、R6 page/export boundary、R11 sidecar 结论，避免从 editor tree 推导 graph truth。
- [x] 盘点当前 Coincides 已经存在的 graph-shaped objects：NoteBlock、CanvasNode、CanvasEdge、ObjectRelation、RelationLayer、SourceAnchor、SourceScope、TemplateDefinition、DomainBlockSet、Concept 候选。
- [x] 区分 graph node candidate、graph edge candidate、projection object、capability node、operation/provenance node、metadata。
- [x] 定义 ObjectRelation 的底层关系维度：existence、condition、composition/group、directionality、semantic family。
- [x] 判断 CanvasEdge / connector 什么时候只是视觉边，什么时候可以绑定 ObjectRelation。
- [x] 判断 Concept layer 如何辅助跨笔记、跨 project/course、跨领域检索。
- [x] 判断普通 SQLite + relation table 能覆盖哪些功能，GraphDB 何时才必要。
- [x] 判断 NoteBlock embedding + Concept + Role + Relation + Source provenance 如何组成 hybrid RAG。
- [x] 判断 v2.x 应该先收集哪些 graph-native migration evidence。
- [x] 标记 R13-R14 哪些阶段必须引用 R12 结论。

需要回答：

- 什么是 graph-shaped data？
- 什么功能只需要 SQLite + relation table？
- 什么功能需要真正 graph database？
- NoteBlock / ObjectRelation / Source / Evidence / Domain / Template 如何映射图结构？
- 局部知识图谱、AI-readable subgraph、Graph RAG 的最小形态是什么？

建议输出：

- `R12-graph-model-before-graph-database.md`

已完成：

- `R12-graph-model-before-graph-database.md`

后续依赖：

- R13 必须把“SQLite + graph-shaped relation tables”作为当前路线的可行中间态评分。
- R13 必须把 Neo4j / graph-native 重构放到后续阶段，而不是当前 editor foundation 的前置条件。
- R13 必须检查各架构路线是否保护 NoteBlock / ObjectRelation / Concept / Source provenance。
- R14 必须把 Concept layer、ObjectRelation 底层关系维度、Hybrid RAG、Graph-native evidence collection 写入 roadmap rewrite。
- PI-048 source reconstruction 调研必须把 `SourceRegion -> NoteBlockCandidate -> SourceAnchor/Scope -> Concept/Role/Template` 作为 future input path。

完成后反补：

- R12 强化 R3/R11：sidecar 不只是为了接 BlockSuite，也是未来 graph-shaped data 的保护层；BlockSuite editor tree 不应成为 graph truth。
- R12 强化 R6：formal/scratch/private/export 不只是 UI 状态，也会影响 AI 是否读取、GraphRAG 是否纳入、PDF 是否导出、source 是否被信任。

### R13: 架构路线对比

目标：

- 对比下一阶段可走的路线。

局部调查清单：

- [x] 引用 R0 的评分维度、R1 当前能力盘点、R2 四阶段路线、R3 ownership matrix、S3 AFFiNE/BlockSuite 总结、R12 graph model 结论。
- [x] 明确每条路线的适用目标：继续 v2.x、重开 repo、full fork AFFiNE、BlockSuite-first sidecar、Coincides-owned editor/canvas。
- [x] 分别评估人工笔记体验成熟度、工程复杂度、许可风险、source-grounded NoteBlock 适配度、graph model 适配度、AI note assembly 适配度、外部 Agent/API 适配度、长期维护成本。
- [x] 评估每条路线对 v2.x 已有 Source / Template / Domain / Proposal / Relation 地基的保留程度。
- [x] 评估每条路线对 PI-048 source reconstruction 的接入难度。
- [x] 评估每条路线对未来 v3.x graph-native / Neo4j 迁移的影响。
- [x] 给出短期路线、验证 spike、停止扩张项、保留 fallback。
- [x] 标记 R14 必须吸收的路线建议和 roadmap rewrite 约束。

候选路线：

1. 继续当前 Coincides 重构。
2. 新 repo 从零做。
3. AFFiNE full fork / copy 改造。
4. BlockSuite-first editor runtime + Coincides semantic layer。
5. Coincides-owned editor + AFFiNE/BlockSuite 仅作参考。

评分维度：

- 人工笔记体验成熟度；
- 工程复杂度；
- 许可风险；
- source-grounded NoteBlock 适配度；
- graph model 适配度；
- AI note assembly 适配度；
- 外部 Agent API 适配度；
- 长期维护成本。

建议输出：

- `R13-architecture-route-comparison.md`

已完成：

- `R13-architecture-route-comparison.md`

后续依赖：

- R14 必须把 BlockSuite Edgeless-as-page + Coincides semantic sidecar spike 作为第一候选路线。
- R14 必须明确当前 Coincides v2.x 语义地基保留，但当前 Course Detail 堆叠式 UI 扩张需要冻结。
- R14 必须保留 Coincides-owned editor/canvas fallback。
- R14 必须把 AFFiNE full fork、PageEditor direct modification、过早 GraphDB migration 都降级。
- R14 必须把 PI-048 source reconstruction 和 v3.x graph-native / Neo4j 放入后续路线，而不是混进 editor foundation 第一 spike。

完成后反补：

- R13 不修改 R0-R12 正文；它把 R7-R12 的阶段结论收束成路线评分。
- R13 对 R2 的补充是：四阶段路线仍成立，但下一阶段应先做 editor foundation spike，而不是继续扩张当前工程 UI。

### R14: 最终决策与 Roadmap 重写建议

目标：

- 汇总全部调研，给出下一阶段路线建议。

局部调查清单：

- [x] 引用 R0-R13 和 S1-S3 的核心结论，避免只凭最后几份报告决策。
- [x] 判断是否放弃当前 Coincides 主线、是否新开 repo、是否 fork/copy/depend on AFFiNE/BlockSuite。
- [x] 明确当前 v2.x 成果哪些保留为 semantic substrate，哪些冻结为经验，哪些需要重写。
- [x] 给出下一阶段第一 spike：BlockSuite Edgeless-as-page + Coincides semantic sidecar。
- [x] 给出 fallback：Coincides-owned editor/canvas。
- [x] 明确不优先做：AFFiNE full fork、PageEditor direct modification、过早 Neo4j、继续堆 Course Detail UI。
- [x] 给出 roadmap rewrite 建议：editor foundation、source reconstruction、manual notebook UX、AI note assembly、graph-native migration evidence 的顺序。
- [x] 明确 PI-048 与 PI-046 的关系：PI-048 必须在 PI-046 路线基础上接入。
- [x] 给出后续执行检查项和 open questions。
- [x] 标记最终汇总文档需要吸收 R14 结论。

需要回答：

- 是否放弃当前 Coincides 主线？
- 是否新开 repo？
- 是否 fork / copy / depend on AFFiNE or BlockSuite？
- 当前 v2.x 成果哪些保留？
- 哪些功能冻结为经验，不继续扩展？
- 下一阶段 roadmap 如何重写？
- 2.x / 3.x 的分界是否还成立？

建议输出：

- `R14-product-reset-affine-adoption-decision-report.md`

已完成：

- `R14-product-reset-affine-adoption-decision-report.md`

后续依赖：

- 最终汇总文档 `Coincides-product-reset-and-editor-foundation-decision.md` 必须吸收 R14 的路线决策。
- 后续 roadmap rewrite 必须以 editor foundation spike -> manual notebook minimum product -> source reconstruction -> AI note assembly -> hybrid RAG / graph-native planning 为主顺序。
- PI-048 Research 必须以 PI-046 的 editor/data architecture route 为前置，不直接假设 AFFiNE 或自研。

完成后反补：

- R14 不修改 R0-R13 正文；它把全部调查收束成下一阶段决策。
- R14 对整个 PI-046 的最终补充是：v2.x 语义地基保留，当前 UI 扩张冻结，下一步先做 BlockSuite Edgeless-as-page + Coincides sidecar spike。

### R15: Microsoft GraphRAG 采用补充调研

目标：
- 专门研究 Microsoft GraphRAG 是否适合作为 Coincides 后续 graph/RAG 层。
- 明确它解决的是成熟人工笔记软件之后的下一层问题：AI 如何读、连、检索、总结已经进入系统的信息。
- 不把 GraphRAG 当成编辑器、Canvas、Source Reconstruction 或 NoteBlock runtime 的替代品。

当前状态：
- R15 是 R0-R14 之后新增的补充调研。
- 问题清单与调研边界已创建，正式框架能力评估尚未完成。
- 每完成一篇 R15 正式报告，都必须思考并记录：是否需要反哺此前的 R15 报告、PI-046 总结、PI-048 Outline 或 Product Improvement Issue Register。

调研清单：

- [x] 确认 PI-046 已有 GraphRAG / Concept / ObjectRelation / Hybrid RAG 思考，但缺少 Microsoft GraphRAG 框架采用研究。
- [x] 明确 R15 只研究 Microsoft GraphRAG，不扩散为泛 GraphRAG 生态评测。
- [x] 加入图片、手写 PDF、公式、表格、代码、网页等非纯文本材料处理问题。
- [x] 加入 GraphRAG 文档导入、TextUnit 切分、data cleaning、entity / relationship extraction 的边界问题。
- [x] 加入 GraphRAG 输出是否能映射到 SourceRegion、NoteBlockCandidate、Concept、ObjectRelation、Community Report 的问题。
- [x] 加入 GraphRAG 是否能把代码、公式、图表相关结果转成 LaTeX / code block / figure block 的问题。
- [x] 阅读 Microsoft GraphRAG 官方 docs、GitHub 和输入/索引/查询流程。
- [x] 判断 GraphRAG 应该作为主数据结构、可重建索引，还是 query-time context builder。
- [x] 判断它和 PI-048 SourceRegion pipeline、NoteBlock embedding、Concept filter、ObjectRelation traversal 的关系。
- [x] 输出采用建议和第一版 spike 方案。
- [x] 每完成一篇 R15 报告后，完成反哺检查并记录是否需要更新前文。

建议输出：
- `R15-microsoft-graphrag-adoption-research.md`
- `R15-1-microsoft-graphrag-framework-and-input-boundary.md`
- `R15-2-noteblock-to-graphrag-adapter.md`
- `R15-3-relationship-pack-and-objectrelation-boundary.md`
- `R15-4-non-text-source-limitations-and-source-region-dependency.md`
- `R15-5-byog-and-coincides-graph-index-architecture.md`
- `R15-6-first-spike-and-adoption-decision.md`
- `R15-summary-microsoft-graphrag-adoption-decision.md`

已创建：
- `R15-microsoft-graphrag-adoption-research.md`
- `R15-1-microsoft-graphrag-framework-and-input-boundary.md`
- `R15-2-noteblock-to-graphrag-adapter.md`
- `R15-3-relationship-pack-and-objectrelation-boundary.md`
- `R15-4-non-text-source-limitations-and-source-region-dependency.md`
- `R15-5-byog-and-coincides-graph-index-architecture.md`
- `R15-6-first-spike-and-adoption-decision.md`
- `R15-summary-microsoft-graphrag-adoption-decision.md`

正式报告拆分：

1. `R15-1-microsoft-graphrag-framework-and-input-boundary.md`
   - 回答 Microsoft GraphRAG 的框架边界、输入边界、Document/TextUnit/Entity/Relationship/Community Report 结构，以及它是否能直接承担 PI-048 source reconstruction。
2. `R15-2-noteblock-to-graphrag-adapter.md`
   - 回答 DefinitionBlock、FormulaBlock、ProofBlock、ExampleBlock、CodeBlock、SourceQuoteBlock 等 typed NoteBlock 如何转成 GraphRAG 可消费的 text units + metadata。
3. `R15-3-relationship-pack-and-objectrelation-boundary.md`
   - 回答 GraphRAG Relationship、RelationCandidate、Coincides ObjectRelation、Relation Pack / Relationship Group 的边界。
4. `R15-4-non-text-source-limitations-and-source-region-dependency.md`
   - 回答图片、手写 PDF、公式、代码、表格、网页等非纯文本材料是否必须先经过 SourceRegion / reconstruction pipeline。
5. `R15-5-byog-and-coincides-graph-index-architecture.md`
   - 回答 Bring Your Own Graph、Coincides confirmed graph、GraphRAG rebuildable index、SQLite/vector/GraphDB/hybrid 架构如何连接。
6. `R15-6-first-spike-and-adoption-decision.md`
   - 设计第一版 spike，优先使用 PI-046 纯文本研究报告验证 GraphRAG，而不是直接使用手写 PDF。
7. `R15-summary-microsoft-graphrag-adoption-decision.md`
   - 汇总 R15-1 到 R15-6，给出是否采用、如何采用、何时采用、哪些部分不能采用的最终建议。

后续依赖：
- R15 正式调研时必须引用 Microsoft GraphRAG 官方资料，不应只凭“GraphRAG”概念判断。
- R15 必须保持 PI-046 主顺序：先成熟人工笔记 / editor foundation，再 source reconstruction，再 AI note assembly，最后评估 GraphRAG 层。
- R15 必须和 PI-048 对齐：复杂 PDF、手写材料、公式、图片和代码应先经过 SourceRegion / reconstruction pipeline，再判断是否进入 GraphRAG。
- R15 每篇报告都必须包含 `反哺检查` 小节，明确是否需要回改此前 R15 报告、PI-048 Outline、register 或 roadmap。

## 最终汇总文档

完成 R0-R14 后，需要额外写一份总决策文档：

- `Coincides-product-reset-and-editor-foundation-decision.md`

这份文档应作为后续 plan / roadmap / implementation 的核心依据。

已完成：

- `Coincides-product-reset-and-editor-foundation-decision.md`
- `PI-046-stage-summary-synthesis-and-recommendations.md`
- `PI-046-omission-and-backfill-audit.md`

最终状态：

- R0-R14 已完成。
- R15 补充调研问题清单、R15-1 到 R15-6、R15 summary 已完成。
- S1-S3 已完成。
- 最终决策文档已完成。
- 阶段汇总总报告已完成。
- 遗漏与反补审计已完成。
