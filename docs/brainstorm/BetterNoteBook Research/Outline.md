# Better Notebook Research Outline

**Created**: 2026-06-05
**Status**: Draft for Henry review
**Purpose**: 在写新的 Better Notebook roadmap 之前，完成最后一轮产品级调研，把 Notion / AFFiNE 的成熟体验、Coincides 既有研究成果、以及 Henry 的 freeform NoteBlock 需求收束成可执行路线。

---

## 1. 本轮调研定位

本轮调研不是 MVP 调研，也不是继续给旧 v2.x roadmap 加一个小版本。

本轮目标是回答：

```text
Coincides 如何从工程原型转向成熟的自用笔记软件？
```

成熟标准不是“能创建 block”，而是：

- 用户打开空白 note 后能像正常笔记软件一样自然输入；
- 用户不需要理解 NoteBlock / CanvasNode / TemplateDefinition 才能写东西；
- NoteBlock 可以像文本框一样自由调整大小和位置；
- 页面可以支持左右并排、图文并排、公式/图片/文本混排；
- A4 / 多页 / 无限 scratch 区 / 导出边界清晰；
- 数据架构仍然保持 Coincides 自己的 source、relation、template、domain、proposal truth；
- Notion / AFFiNE 是成熟体验参考，不是数据主权接管者。

本轮调研完成后，输出应直接服务于新的 Better Notebook roadmap。

---

## 2. 核心体验假设

这次调研必须把以下体验当作核心差异点，而不是边缘功能。

### 2.1 空白页自然输入

用户打开一个空白 note：

1. 第一次单击或双击空白页面；
2. 页面左上角出现默认光标；
3. 系统创建一个默认 text NoteBlock；
4. 用户开始输入；
5. 用户不需要先点击 Add Block。

如果左上角已有 NoteBlock，新的默认输入点应顺序避让已有内容，落在合理的下一处可用位置。

### 2.2 NoteBlock 像文本框一样可调整

NoteBlock 是内容 truth，但用户看到的应该像自然文本框：

- 可选中；
- 可移动；
- 可调整宽度和高度；
- 宽度变化后文字自动重排；
- 不应裁掉文字或让文字溢出不可读；
- 阅读状态下边框应尽量隐藏；
- 编辑 / layout 状态下才显示边框、拖拽点、resize handle。

### 2.3 Freeform block-box 并排排版

用户可以把一个文本 NoteBlock 缩到半页宽，然后在右侧加入图片、公式、另一个文本 block、source quote 或其他 block。

关键体验：

```text
左侧 text block 缩窄
  -> 右侧空白处点击
  -> 新 text block / slash block 在右侧自然生成
  -> 与左侧 block 对齐
  -> 用户仍可自由移动和 resize
```

这不是 Notion 的单列 block，也不是普通白板贴纸，而是 Coincides 的 Better Notebook 特色。

### 2.4 Slash command 和 block 类型入口

新 block 默认是 text。用户输入 `/` 后可以选择：

- text / paragraph；
- heading；
- latex / formula；
- image；
- code；
- table；
- quote / source quote；
- callout；
- sticky note / side note；
- future custom template block。

### 2.5 Formal page 与 outside workspace

Better Notebook 应支持：

- formal page area：用于正式笔记、报告、导出；
- outside workspace / scratch area：用于草稿、推导、备注、暂存、私人理解；
- export intent：明确哪些内容导出，哪些只留在工程文件里；
- source / relation / AI visibility：即使不导出，仍可被用户或 AI 作为上下文读取，前提是权限和可见性允许。

---

## 3. 调研总规则

### 3.1 参考对象

本轮调研以两个产品为主参考：

- **Notion**：自然 block 输入、slash menu、页面写作流、信息架构、右键/hover/toolbar 收纳；
- **AFFiNE**：page / edgeless、canvas 工具、sidebar/favorite、frame/connector、文档与画布体验。

可以补充观察其他工具，但不能让调研失焦。

### 3.2 旧研究必须被复用

每份 R1+ 报告开始前，必须先读取 R0 产出的 reference index 中与该阶段相关的旧材料。

PI-046 是本轮 Better Notebook 调研的主锚点。除非明确写出理由和证据，否则后续 R1-R10 不应重新发明、跳过或推翻 PI-046 已经得到的核心判断。

旧材料不能只当背景，而要进入报告正文：

- 哪些结论被继承；
- 哪些结论被修正；
- 哪些结论被推翻；
- 哪些结论应进入新 roadmap；
- 哪些结论只作为历史参考保留。

如果新阶段结论与 PI-046 冲突，报告必须新增：

```text
PI-046 Consistency / Conflict Check
```

并说明：

- 冲突的是 PI-046 哪一份报告、哪一个结论；
- 新证据是什么；
- 是修正 PI-046、局部例外，还是仅保留为 unresolved question；
- 是否需要回写 R0 reference index 或新 roadmap 风险项。

### 3.3 每份报告必须产生 roadmap 草稿影响

每份报告末尾必须有：

```text
Roadmap Draft Impact
```

至少回答：

- 这个阶段建议新 roadmap 增加什么 phase / milestone？
- 哪些能力必须先做，哪些必须推后？
- 哪些旧 v2.x 成果应复用？
- 哪些风险需要进入 continuity？
- 哪些 reference 必须写进新 roadmap 的 startup reading？
- 是否需要反补前序报告？

### 3.4 允许后续阶段反补前序阶段

如果 R3 的调研发现 R2 的结论不完整，必须回写：

- R2 addendum；
- Outline dependency note；
- 最终 roadmap synthesis 中的修正说明。

不要假装调研是线性一次过。Better Notebook 的体验问题会互相影响。

### 3.5 证据等级

每份报告应标注证据来源：

- `Direct product observation`：亲自使用 Notion / AFFiNE / Coincides 后观察；
- `Code / repo evidence`：来自 Coincides 或开源项目源码；
- `Existing Coincides research`：来自 PI-046 / PI-048 / v2.5 research；
- `Design inference`：基于用户心智和产品推理；
- `Open question`：仍需后续验证。

### 3.6 Browser Harness 高频观察规则

本轮 Better Notebook 调研将 `Browser Harness` 作为高频主要工具之一，但限定它的职责：

- Browser Harness 负责真实浏览器交互观察、重复流程复现、截图记录和状态证据采集；
- Browser Harness 不替代 PI-046 / R0 reference 阅读；
- Browser Harness 不替代源码/架构调研；
- Browser Harness 不替代最终设计判断；
- 涉及 Notion / AFFiNE / Coincides 交互体验的阶段，默认优先用 Browser Harness 做至少一轮可观察流程记录；
- 如果 Browser Harness 观察结果和旧研究结论冲突，报告必须写入 `PI-046 Consistency / Conflict Check`，不要只凭单次交互体验推翻旧结论；
- Browser Harness 观察结果应进入报告正文，而不只是作为聊天里的临时印象。

推荐使用场景：

- 空白页首次点击 / 双击后的输入行为；
- slash command、hover handle、右键菜单、工具栏收纳；
- block 创建、选择、移动、拖拽、resize；
- 图片、公式、代码、表格、quote 等 block 插入；
- AFFiNE page / edgeless 切换；
- canvas 工具、connector、frame、sticky note、favorite/sidebar；
- Coincides 当前实现与 Notion / AFFiNE 的同任务对比。

报告中建议新增一个小节：

```md
## Browser Harness Observation Log
```

该小节记录：

- 观察对象；
- 操作步骤；
- 关键截图或状态；
- 与 Coincides 目标体验的差距；
- 是否需要反补前序报告或 roadmap 草稿。

### 3.7 不提前写 Agent 路线

Better Notebook 第一轮路线以成熟人工笔记体验为主。

Agent、AI note assembly、GraphRAG、Source Reconstruction 可以作为后续依赖进入 roadmap，但不要抢走第一阶段重点。

### 3.8 目标模式与阶段执行规则

如果使用 Codex 目标模式或长任务模式执行本轮调研，必须遵守以下顺序。

每进入一个阶段前，例如 R0、R1、R2：

1. 先回到本 `Outline.md`；
2. 在对应 Rn 小节中补充或更新 `局部执行大纲`；
3. 局部执行大纲至少包含：
   - 本阶段目标；
   - 本阶段必须读取的旧 reference；
   - 本阶段必须观察的 Notion / AFFiNE / Coincides 行为；
   - 本阶段必须回答的问题；
   - 本阶段输出文件；
   - 本阶段可能反补哪些前序阶段；
   - 本阶段对新 roadmap 的预期影响；
4. 更新 `3.9 阶段状态清单`，把该阶段标记为 `Outline Expanded` 或 `In Progress`；
5. 再开始正式调查和写报告。

每完成一个阶段后：

1. 回到本 `Outline.md`；
2. 在对应 Rn 小节补充：
   - `已完成报告`；
   - `核心结论摘要`；
   - `Roadmap Draft Impact 摘要`；
   - `Backfeed Notes`；
3. 更新 `3.9 阶段状态清单`，把该阶段标记为 `Done`；
4. 如果该阶段反补了前序阶段，也要在被反补的小节记录 addendum。

这个规则的目的不是增加形式主义，而是防止上下文压缩后把调研做散，也防止新报告和 PI-046 / v2.5 research 断开。

### 3.9 阶段状态清单

状态含义：

- `Not Started`：尚未展开局部大纲；
- `Outline Expanded`：已补充本阶段局部执行大纲，尚未开始正式报告；
- `In Progress`：正在调查或写报告；
- `Done`：报告完成，Outline 已回填完成信息；
- `Backfilled`：该阶段后来被其他阶段反补过。

当前状态：

- [x] R0: 内部参考索引与旧调研整合 - `Done`
- [x] R1: Notion / AFFiNE 成熟笔记体验基线 - `Done`
- [x] R2: Coincides Better Notebook 核心交互规格 - `Done`
- [x] R3: Page / Canvas / Export 边界 - `Done`
- [x] R4: Block 视觉语言与内容类型 - `Done`
- [x] R5: 编辑控制、工具栏、右键菜单与快捷键 - `Done`
- [x] R6: Better Notebook 数据契约 - `Done`
- [x] R7: AFFiNE / BlockSuite / 自研路线再评估 - `Done`
- [x] R8: Source / Relation / Concept 在 Better Notebook 中的用户体验 - `Done`
- [x] R9: 性能、规模与重建能力 - `Done`
- [x] R10: Better Notebook Roadmap Synthesis - `Done`

### 3.10 阶段总结节奏

本轮调研不是等到 R10 才一次性总结。为了避免最终报告变成流水账，后续应按阶段写尖端总结：

- `S1-r0-r2-better-notebook-position-and-core-ux-summary.md`：总结 R0-R2，收束产品定位、成熟 baseline、核心交互规格。
- `S2-r3-r5-page-canvas-block-control-summary.md`：总结 R3-R5，收束 page/canvas/export、block 视觉语言、controls/toolbar/context menu。
- `S3-r6-r8-data-source-relation-concept-summary.md`：总结 R6-R8，收束 data contract、editor route、source/relation/concept UX。
- `S4-r9-r10-performance-and-roadmap-synthesis-summary.md`：总结 R9-R10，收束性能/规模/重建和 roadmap synthesis。
- `Better-Notebook-research-final-decision-report.md`：最终总体报告，作为新版 Better Notebook roadmap 的直接决策依据。

阶段总结只提炼决策、风险、roadmap 影响和需要反补的地方，不重复每份报告的全文。

当前阶段总结状态：

- [x] S1: R0-R2 定位与核心 UX 总结 - `Done`
- [x] S2: R3-R5 page/canvas/block/control 总结 - `Done`
- [x] S3: R6-R8 data/source/relation/concept 总结 - `Done`
- [x] S4: R9-R10 performance/roadmap 总结 - `Done`
- [x] Final: Better Notebook 总体决策报告 - `Done`

---

## 4. R0: 内部参考索引与旧调研整合

### 目标

R0 不是外部产品调研，而是内部审查。

目标是把已经做过的研究重新变成新 roadmap 的可用索引，避免过去调研被浪费。

### 必读材料

R0 至少应读取并分类以下材料。

#### Product Improvement Register

- `docs/brainstorm/产品完善/product-improvement-issue-register.md`

重点提取：

- Better Notebook 相关问题；
- page/canvas/export 问题；
- NoteBlock freeform 排版问题；
- source attach / provenance 问题；
- relation / concept / GraphRAG 问题；
- UX / sidebar / project / favorite / import 问题；
- developer tools / template/style/role 问题。

#### PI-046 Research

- `docs/brainstorm/产品完善/PI-046 Research/Outline.md`
- `docs/brainstorm/产品完善/PI-046 Research/R1-current-coincides-capability-inventory.md`
- `docs/brainstorm/产品完善/PI-046 Research/R2-product-reset-and-four-phase-strategy.md`
- `docs/brainstorm/产品完善/PI-046 Research/R3-coincides-core-object-model.md`
- `docs/brainstorm/产品完善/PI-046 Research/R4-manual-notebook-minimum-usable-experience.md`
- `docs/brainstorm/产品完善/PI-046 Research/R5-page-editor-freeform-block-box-requirements.md`
- `docs/brainstorm/产品完善/PI-046 Research/R4-R5-补充调研.md`
- `docs/brainstorm/产品完善/PI-046 Research/R6-page-canvas-modes-and-export-boundaries.md`
- `docs/brainstorm/产品完善/PI-046 Research/R7-affine-product-experience-review.md`
- `docs/brainstorm/产品完善/PI-046 Research/R8-affine-blocksuite-code-license-review.md`
- `docs/brainstorm/产品完善/PI-046 Research/R9-affine-page-editor-adaptation-feasibility.md`
- `docs/brainstorm/产品完善/PI-046 Research/R10-affine-edgeless-canvas-adaptation-feasibility.md`
- `docs/brainstorm/产品完善/PI-046 Research/R11-coincides-affine-data-model-bridge.md`
- `docs/brainstorm/产品完善/PI-046 Research/S1-r0-r2-method-inventory-product-reset-summary.md`
- `docs/brainstorm/产品完善/PI-046 Research/S2-r3-r6-object-model-manual-editor-page-canvas-summary.md`
- `docs/brainstorm/产品完善/PI-046 Research/S3-r7-r11-affine-blocksuite-adoption-summary.md`
- `docs/brainstorm/产品完善/PI-046 Research/R14-product-reset-affine-adoption-decision-report.md`
- `docs/brainstorm/产品完善/PI-046 Research/Coincides-product-reset-and-editor-foundation-decision.md`
- `docs/brainstorm/产品完善/PI-046 Research/PI-046-stage-summary-synthesis-and-recommendations.md`
- `docs/brainstorm/产品完善/PI-046 Research/R15-summary-microsoft-graphrag-adoption-decision.md`

重点提取：

- v2.x semantic substrate 保留项；
- 冻结 Course Detail 面板扩张的理由；
- freeform block-box 需求；
- page/canvas/export 边界；
- AFFiNE / BlockSuite 可借鉴点；
- 不 full fork AFFiNE 的理由；
- BlockSuite / Edgeless-as-page 是否仍应作为候选；
- GraphRAG 只能做 downstream discovery / query，不做 source reconstruction。

#### PI-048 Research

- `docs/brainstorm/产品完善/PI-048 Research/Outline.md`

重点提取：

- SourceRegion；
- OCR / VLM / formula / layout / web extraction；
- SourceRegion -> NoteBlockCandidate；
- source reconstruction 与 editor surface 的衔接。

#### v2.5 Research

- `docs/brainstorm/V2.5Research/v2.5-research-outline.md`
- `docs/brainstorm/V2.5Research/r1-r4-template-runtime-foundation-summary.md`
- `docs/brainstorm/V2.5Research/r5-r8-template-behavior-agent-editor-composition-summary.md`
- `docs/brainstorm/V2.5Research/r9-r11-domain-package-migration-summary.md`
- `docs/brainstorm/V2.5Research/r12-rich-editor-adapter-spike-criteria.md`
- `docs/brainstorm/V2.5Research/r13-v2.5-graph-native-migration-evidence.md`
- `docs/brainstorm/V2.5Research/r14-v2.5-roadmap-plan-revision-recommendations.md`

重点提取：

- TemplateDefinition runtime 对 Better Notebook 的作用；
- render hints / display modes；
- source / relation / proposal behavior；
- CompositionTemplate 对章节/报告块的作用；
- DomainBlockSet / PackageManifest 对 template selection 的作用；
- rich editor adapter 评估标准；
- graph-native migration evidence。

#### Roadmap / Continuity

- `docs/Coincides-Roadmap.md`
- `docs/continuity/Coincides-Continuity.md`
- `docs/continuity/2.x/v2.x-continuity.md`

重点提取：

- 旧 roadmap 已封到 v2.5.6；
- 新 Better Notebook roadmap 必须单开；
- 工程可靠 -> 用户可靠 -> 人机可靠；
- graph-native / Neo4j 推后；
- 每个新阶段要保留 graph-native evidence。

### R0 输出

建议输出：

- `R0-reference-index-and-research-intake.md`

必须包含：

- `Must-read for new roadmap`；
- `Must-read for editor/page/canvas work`；
- `Must-read for source reconstruction work`；
- `Must-read for template/block visual work`；
- `Must-read for relation/concept/GraphRAG work`；
- `Historical only`；
- `Open questions requiring new investigation`。

### R0 局部执行大纲

#### 本阶段目标

把旧 roadmap、continuity、Product Improvement Register、PI-046、PI-048、v2.5 research 重新整理成新 Better Notebook roadmap 可直接引用的 reference index。

R0 不做新的 Notion / AFFiNE 交互观察，也不提前决定新 roadmap 的版本号。R0 只回答：后续 R1-R10 调研和新 roadmap 应该优先读取哪些旧材料、继承哪些判断、保留哪些风险。

#### 本阶段必须读取的旧 reference

- `docs/brainstorm/产品完善/product-improvement-issue-register.md`
- `docs/brainstorm/产品完善/PI-046 Research/Outline.md`
- `docs/brainstorm/产品完善/PI-046 Research/R1-current-coincides-capability-inventory.md`
- `docs/brainstorm/产品完善/PI-046 Research/R2-product-reset-and-four-phase-strategy.md`
- `docs/brainstorm/产品完善/PI-046 Research/R3-coincides-core-object-model.md`
- `docs/brainstorm/产品完善/PI-046 Research/R4-manual-notebook-minimum-usable-experience.md`
- `docs/brainstorm/产品完善/PI-046 Research/R5-page-editor-freeform-block-box-requirements.md`
- `docs/brainstorm/产品完善/PI-046 Research/R4-R5-补充调研.md`
- `docs/brainstorm/产品完善/PI-046 Research/R6-page-canvas-modes-and-export-boundaries.md`
- `docs/brainstorm/产品完善/PI-046 Research/R7-affine-product-experience-review.md`
- `docs/brainstorm/产品完善/PI-046 Research/R8-affine-blocksuite-code-license-review.md`
- `docs/brainstorm/产品完善/PI-046 Research/R9-affine-page-editor-adaptation-feasibility.md`
- `docs/brainstorm/产品完善/PI-046 Research/R10-affine-edgeless-canvas-adaptation-feasibility.md`
- `docs/brainstorm/产品完善/PI-046 Research/R11-coincides-affine-data-model-bridge.md`
- `docs/brainstorm/产品完善/PI-046 Research/S1-r0-r2-method-inventory-product-reset-summary.md`
- `docs/brainstorm/产品完善/PI-046 Research/S2-r3-r6-object-model-manual-editor-page-canvas-summary.md`
- `docs/brainstorm/产品完善/PI-046 Research/S3-r7-r11-affine-blocksuite-adoption-summary.md`
- `docs/brainstorm/产品完善/PI-046 Research/R14-product-reset-affine-adoption-decision-report.md`
- `docs/brainstorm/产品完善/PI-046 Research/Coincides-product-reset-and-editor-foundation-decision.md`
- `docs/brainstorm/产品完善/PI-046 Research/PI-046-stage-summary-synthesis-and-recommendations.md`
- `docs/brainstorm/产品完善/PI-046 Research/R15-summary-microsoft-graphrag-adoption-decision.md`
- `docs/brainstorm/产品完善/PI-048 Research/Outline.md`
- `docs/brainstorm/V2.5Research/v2.5-research-outline.md`
- `docs/brainstorm/V2.5Research/r1-r4-template-runtime-foundation-summary.md`
- `docs/brainstorm/V2.5Research/r5-r8-template-behavior-agent-editor-composition-summary.md`
- `docs/brainstorm/V2.5Research/r9-r11-domain-package-migration-summary.md`
- `docs/brainstorm/V2.5Research/r12-rich-editor-adapter-spike-criteria.md`
- `docs/brainstorm/V2.5Research/r13-v2.5-graph-native-migration-evidence.md`
- `docs/brainstorm/V2.5Research/r14-v2.5-roadmap-plan-revision-recommendations.md`
- `docs/Coincides-Roadmap.md`
- `docs/continuity/Coincides-Continuity.md`
- `docs/continuity/2.x/v2.x-continuity.md`

#### 本阶段必须观察的 Notion / AFFiNE / Coincides 行为

R0 不做新的 Browser Harness 观察。R0 只整理旧观察结果，并把需要在 R1-R9 重新观察的行为列入 `Open questions requiring new investigation`。

#### 本阶段必须回答的问题

- 新 roadmap 的 startup reading 应如何分层，而不是笼统要求“读所有 research”？
- 哪些 PI-046 结论是后续 R1-R10 不应轻易推翻的主锚点？
- 哪些 v2.x 工程成果应作为 Better Notebook 的 semantic substrate 保留？
- 哪些旧 UI / Course Detail 工程面板应冻结，不再继续扩张？
- 哪些 source reconstruction、template、relation、concept、GraphRAG 议题应推后到 Better Notebook 基础体验之后？
- 哪些问题需要 Browser Harness 在 R1-R9 重新验证？

#### 本阶段输出文件

- `R0-reference-index-and-research-intake.md`

#### 本阶段可能反补哪些前序阶段

R0 是第一阶段，不反补前序阶段。但 R0 应为后续 R1-R10 提供 reference selection 规则。

#### 本阶段对新 roadmap 的预期影响

R0 应产出可直接写进新 roadmap 的 `Reference Index`，并建议新 roadmap 的 startup flow 按阶段读取材料：产品定位、编辑器体验、数据契约、source reconstruction、template/domain/package、relation/concept/GraphRAG、性能与重建。

### R0 Roadmap Draft Impact

R0 需要直接产出一份可写进新 roadmap 的 reference index。

新 roadmap 的 startup reading 不应只写“读所有 research”，而应按阶段列出最相关材料。

### R0 完成记录

**已完成报告**：`R0-reference-index-and-research-intake.md`

**核心结论摘要**：

- Better Notebook 新路线应继承 v2.x 的语义地基，但冻结 v2.x 的工程面板式 UI 扩张。
- PI-046 仍是本轮调研主锚点；后续 R1-R10 不应轻易推翻“不要 full fork AFFiNE、不要交出数据主权、优先做人类可用 notebook”的结论。
- 新 roadmap 的第一阶段不应立刻做 AI note generation，而应先做 clean product shell、natural blank note editing、freeform NoteBlock / block-box、page/canvas/export boundary 和稳定重建。
- Browser Harness 应在 R1-R9 中作为交互观察证据使用，但 R0 本身只整理旧研究，不做新的浏览器观察。

**Roadmap Draft Impact 摘要**：

- 新 roadmap 开头应设置分层 `Required Research References`，而不是笼统写“读全部 research”。
- 新 roadmap 应按产品定位、核心笔记体验、page/canvas/export、block visual/control、data contract/editor route、source/relation/concept、performance/rebuild 分阶段读取旧材料。
- v2.x 的 Source、NoteBlock、CanvasNode、ObjectRelation、TemplateDefinition、CompositionTemplate、DomainBlockSet、PackageManifest、Proposal、OperationBatch 等能力应作为 semantic substrate 保留；现有 Course Detail 工程面板形态不应继承。

**Backfeed Notes**：

- R0 是第一阶段，不反补前序报告。
- R0 已在本 outline 中加入阶段总结节奏，后续每完成复数阶段需要写对应尖端总结。

---

## 5. R1: Notion / AFFiNE 成熟笔记体验基线

### 目标

建立成熟笔记软件的体验基线。

R1 不研究 Coincides 数据结构，先回答：

```text
普通用户为什么觉得 Notion / AFFiNE 比当前 Coincides 好用？
```

### 调研对象

- Notion 空白页；
- Notion block 输入、slash menu、hover handle、drag、right click；
- Notion 图片/公式/code/table 插入；
- AFFiNE page mode；
- AFFiNE edgeless / canvas mode；
- AFFiNE sidebar、Favorites、All docs、workspace shell；
- AFFiNE 工具栏、connector、frame、sticky note。

### 需要回答

- 用户打开空白文档时，第一秒看到什么？
- 用户如何开始输入？
- 用户如何创建第二个 block？
- 用户如何插入图片、公式、代码、表格？
- block 边框、handle、toolbar 何时出现？
- 用户如何拖动或重排 block？
- Notion 和 AFFiNE 如何隐藏复杂功能？
- 哪些体验是 Coincides 必须接近的？
- 哪些体验 Coincides 不应该照搬？

### 建议输出

- `R1-notion-affine-mature-notebook-baseline.md`

### R1 局部执行大纲

#### 本阶段目标

建立成熟笔记软件的体验基线，重点回答：为什么用户打开 Notion / AFFiNE 时会觉得它们像一个“可以直接写东西的产品”，而当前 Coincides 更像一个工程施工现场。

R1 不评估 Coincides 数据结构是否正确，也不提前决定是否采用 BlockSuite。R1 只收集成熟体验标准，为 R2-R5 的 Coincides 具体交互规格提供基准。

#### 本阶段必须读取的旧 reference

- `docs/brainstorm/BetterNoteBook Research/R0-reference-index-and-research-intake.md`
- `docs/brainstorm/产品完善/PI-046 Research/R4-manual-notebook-minimum-usable-experience.md`
- `docs/brainstorm/产品完善/PI-046 Research/R5-page-editor-freeform-block-box-requirements.md`
- `docs/brainstorm/产品完善/PI-046 Research/R4-R5-补充调研.md`
- `docs/brainstorm/产品完善/PI-046 Research/R7-affine-product-experience-review.md`
- `docs/brainstorm/产品完善/PI-046 Research/S1-r0-r2-method-inventory-product-reset-summary.md`
- `docs/brainstorm/产品完善/PI-046 Research/S3-r7-r11-affine-blocksuite-adoption-summary.md`
- `docs/brainstorm/产品完善/product-improvement-issue-register.md`

#### 本阶段必须观察的 Notion / AFFiNE / Coincides 行为

使用 Browser Harness 或等价浏览器观察方式记录：

- Notion 空白页首次点击 / 输入 / Enter / slash command；
- Notion hover handle、block 右键、图片/公式/code/table 插入入口；
- Notion block 的边界、选中态、工具栏收纳；
- AFFiNE page mode 的空白文档输入、block 操作、sidebar/favorite；
- AFFiNE edgeless / canvas mode 的工具栏、frame、connector、sticky note；
- AFFiNE page 与 edgeless 的切换心智；
- 如果外部产品需要登录或受限，记录可观察范围与限制，不用强行绕过。

R1 可以暂不观察当前 Coincides；Coincides 对比会在 R2 作为同任务对照重点展开。

#### 本阶段必须回答的问题

- 成熟笔记软件的第一屏如何降低用户开始写作的摩擦？
- Notion / AFFiNE 如何隐藏 block 结构，让用户先感觉是在写文档？
- slash command、hover handle、右键菜单、floating toolbar 分别承担什么职责？
- 哪些控件常驻，哪些只在选中或 hover 时出现？
- Notion 的单列 block 心智和 AFFiNE 的 page/edgeless 心智分别适合什么？
- Coincides 需要接近哪些体验，哪些体验不应该照搬？
- 这些观察如何支撑后续 R2 的 freeform NoteBlock 规格？

#### 本阶段输出文件

- `R1-notion-affine-mature-notebook-baseline.md`

#### 本阶段可能反补哪些前序阶段

- 若观察发现 R0 reference index 缺少关键旧材料，应回写 R0 addendum。
- 若观察发现 PI-046 对 Notion / AFFiNE 体验判断过时或不完整，应在本报告写 `PI-046 Consistency / Conflict Check`，并在 R10 synthesis 中处理。

#### 本阶段对新 roadmap 的预期影响

R1 应产出 Better Notebook 的成熟体验基准：空白页自然输入、低摩擦 block 创建、slash command、hover/context 收纳、弱边界 block 呈现、清晰 sidebar/favorite、page/canvas 模式心智。新 roadmap 的第一阶段应把这些作为产品验收标准，而不是只验收数据表或 API。

### R1 完成记录

**已完成报告**：`R1-notion-affine-mature-notebook-baseline.md`

**核心结论摘要**：

- Notion 的成熟基线是“先写，后理解 block”：底层全是 block，但用户第一次进入时感受到的是自然文档。
- Notion 的 slash command、hover handle、selected text toolbar 和 block menu 证明复杂 block 系统可以被收纳在光标、hover、selection 和右键附近，而不是铺成工程面板。
- AFFiNE 的成熟基线是“page 与 edgeless/canvas 可以在同一产品中并存”：workspace shell、sidebar/favorite、page mode、edgeless tool palette、frame、connector、sticky note 都值得学习。
- Coincides 不应照搬 Notion 的单列文档流，也不应照搬 AFFiNE 的双模式或交出语义主权；它需要吸收二者成熟度，同时保留 source-grounded semantic truth。
- Browser Harness 已在 2026-06-05 补做 R1 观察：Notion 官方 writing/slash docs、Notion 登录态 workspace 的通用 UI 结构、AFFiNE app shell、公开 overview、当前 `affine.pro/whiteboard` Edgeless/Whiteboard 入口与 Mintlify 文档索引均已记录；旧 `docs.affine.pro/features/edgeless` 404 已确认为路径过时问题。R1 仍保留限制说明，即未在私有 workspace 中新建/编辑内容，AFFiNE page/edgeless 细操作留给后续 R7 或对应 spike。

**Roadmap Draft Impact 摘要**：

- 新 Better Notebook roadmap 的第一阶段应增加一个明确目标：`Notebook Surface Must Feel Writable Before It Feels Powerful`。
- 第一阶段验收应包括空白 note 自然输入、默认 text NoteBlock 自动创建、slash command、弱边界 block、hover/selection 操作收纳、基础 block 插入、sidebar/favorite/project note navigation。
- R2 必须把空白页首次点击/双击、normal writing mode、layout edit mode、右侧空白创建并排 block、slash command 与 runtime template 的关系写成具体规格。

**Backfeed Notes**：

- R1 不反补 R0。
- R1 将 R2 的重点进一步压实为“自然写作 + freeform block-box”的交互规格，而不是继续讨论抽象产品定位。

---

## 6. R2: Coincides Better Notebook 核心交互规格

### 目标

把 Henry 提出的 freeform NoteBlock 体验转成可设计、可实现、可验收的产品规格。

### 必须覆盖的核心工作流

#### 空白页首次点击

- 单击还是双击触发；
- 首个光标默认位置；
- 如何创建默认 text NoteBlock；
- 如果左上角已有内容，如何选择下一个可用位置。

#### 已有 block 右侧创建新 block

- 左侧 block 缩窄后；
- 用户点击右侧空白；
- 新 block 如何生成；
- 如何与左侧 block 对齐；
- 默认宽度和高度如何计算。

#### Resize 与文字重排

- 宽度变化如何触发 reflow；
- 高度是手动、自动，还是混合；
- 文本不应被吞掉；
- overset / overflow 如何提示。

#### Layout edit mode

- 阅读状态；
- 编辑文字状态；
- 布局状态；
- 选中状态；
- 快捷键进入 layout mode；
- 鼠标 hover 显示轻量 handle。

#### Slash command

- 默认 text；
- `/` 切换类型；
- `/image`、`/latex`、`/code`、`/table`、`/quote`；
- 自定义 runtime template 何时出现。

### 需要回答

- Coincides 是否应该单击就创建 block，还是双击更安全？
- 如何避免用户误点生成大量空 block？
- 默认 block 宽度应该是整页、半页、还是当前位置到右边界？
- 同一行多个 block 的 baseline / top alignment 如何处理？
- block resize 是否影响 source/relation/template truth？

### 建议输出

- `R2-better-notebook-core-interaction-spec.md`

### R2 局部执行大纲

#### 本阶段目标

把 Henry 反复强调的“像普通文档一样写、像文本框一样排版”的体验，压成 Better Notebook 第一阶段可以验收的交互规格。R2 不再讨论是否要做 Better Notebook，而是假设该路线已经成立，具体回答用户点击哪里、光标在哪里、新 block 怎样产生、resize 后文本怎样重排、slash command 怎样连接 runtime template。

#### 本阶段必须读取的旧 reference

- `docs/brainstorm/BetterNoteBook Research/R0-reference-index-and-research-intake.md`
- `docs/brainstorm/BetterNoteBook Research/R1-notion-affine-mature-notebook-baseline.md`
- `docs/brainstorm/产品完善/PI-046 Research/R4-manual-notebook-minimum-usable-experience.md`
- `docs/brainstorm/产品完善/PI-046 Research/R5-page-editor-freeform-block-box-requirements.md`
- `docs/brainstorm/产品完善/PI-046 Research/R4-R5-补充调研.md`

#### 本阶段必须观察的 Notion / AFFiNE / Coincides 行为

- 复用 R1 已完成的 Notion / AFFiNE Browser Harness 观察：空白文档、slash command、block handle、page / edgeless / whiteboard 心智。
- 观察当前 Coincides 的 NoteDetail 与 LearningCanvasSurface 代码：确认当前仍是模板下拉、textarea、Add block、卡片列表、canvas insert panel，而不是自然 page editor。
- 尝试用 Browser Harness 打开当前本地 Coincides；如果本地服务未运行，报告中必须记录限制，不得伪造活界面观察。

#### 本阶段必须回答的问题

- 空白 note 第一次单击是否创建 block，还是只创建临时 insertion focus？
- 双击空白处与 Enter / Shift+Enter 如何分工？
- 用户误点时如何避免持久化大量空 block？
- 默认 text block 的 x/y/width/height 如何计算？
- 左侧已有缩窄 block、图片或公式时，右侧空白点击如何创建并排 block？
- resize 后是否自动 reflow，height 是否 auto grow？
- normal writing mode、selection state、layout edit mode 如何分层？
- slash command 如何调用 TemplateDefinition，而不暴露工程字段？
- movement / resize / visual layout 是否影响 source、relation、template truth？

#### 本阶段输出文件

- `R2-better-notebook-core-interaction-spec.md`

#### 本阶段可能反补哪些前序阶段

- 不反补 R0。
- 不推翻 R1，但会把 R1 的成熟体验基线收束成 Coincides 自己的交互规则。
- 如果 R2 发现 R4/R5 的“单击/双击”仍不够明确，应在 R2 中写成决策，而不是回改 PI-046 旧报告。

#### 本阶段对新 roadmap 的预期影响

新 roadmap 的第一个工程阶段必须包含 `Natural Page Editing + Freeform NoteBlock Box`，且验收标准不再是“能 Add block”，而是“用户打开空白 note 后可以自然写作、自然创建并排 block、自然 resize/reflow，并且这些行为只改 layout/projection，不改语义 truth”。

### R2 完成记录

**已完成报告**：`R2-better-notebook-core-interaction-spec.md`

**核心结论摘要**：

- Better Notebook 的第一层体验必须从“Add block 面板”升级为“点击页面即进入写作”。
- 空白 formal page 的首次单击应创建 draft insertion focus，而不是立刻持久化空 NoteBlock；只有用户输入内容、粘贴内容或选择 slash command 后才写入 NoteBlock / placement。
- 双击空白区域表示在该空间位置创建独立 block draft；它和 Enter / Shift+Enter 的文本编辑语义不同。
- 默认 text block 宽度应取当前可用矩形：无阻挡时 full content width；右侧空白与已有 block 同行时，生成并排 block。
- Resize 改 layout / projection，不改 NoteBlock 内容 truth，也不改 source、relation、template truth；文本必须 reflow，height 第一版应 auto grow。
- Better Notebook 至少需要 reading、writing、selection、layout edit 四种状态分层；强边框、resize handles、snap guides 只应在选中或 layout edit mode 显示。
- Slash command 是 runtime `TemplateDefinition` 的人类入口；UI 应显示 Text、Formula、Image、Code、Table、Quote、Source Quote 等命令，而不是工程字段。
- Browser Harness 登录后观察确认：当前 Coincides 已经有 Canvas Document 主工作区、Add block、Connect、Plan layout、Use composition、Hide/Restore、Relation Layers、Selected Object Scope 等工程能力，但仍不是自然 page editor。

**Roadmap Draft Impact 摘要**：

- 新 roadmap 的第一批工程阶段必须包含 `Natural Page Editing + Freeform NoteBlock Box`。
- 第一阶段验收标准应包含：空白 note 单击出现 caret、输入后自动创建 `text.paragraph`、空 draft 不持久化、slash command、text block resize/reflow、右侧空白创建并排 block、状态分层、layout 操作不改语义 truth。
- 完整 rich text style editor、复杂自动绕图、多列自动 flow、完整 table editor、AI note assembly、GraphRAG、Source Reconstruction 都应推后到自然 notebook surface 之后。

**Backfeed Notes**：

- R2 不反补 R0。
- R2 把 R1 的成熟体验基线转成 Coincides 自己的默认交互规则。
- R2 要求 R3 继续定义 formal page / outside scratch / export boundary，要求 R4 继续定义 block 视觉语言，要求 R5 继续定义 toolbar / right-click / shortcut / inspector 分工。

---

## 7. R3: Page / Canvas / Export 边界

### 目标

定义 formal page、outside workspace、locked page、open canvas、multi-page、seamless page stack 和导出规则。

### 需要研究

- A4 locked page；
- 可选 page size；
- open canvas；
- formal page 外的 scratch area；
- 多页垂直排列；
- 多页网格排列；
- seamless page stack；
- page boundary / export boundary；
- export PDF / image / HTML / project package。

### 需要回答

- 页面内内容默认导出，页面外内容默认不导出，这条规则是否成立？
- 页面外内容是否仍可关联页面内 NoteBlock？
- 页面外内容能否被 AI 读取？
- 多页模式下，block 可以跨页吗？
- block 跨页时导出如何切分？
- 页眉、页脚、页码是 NoteBlock、CanvasDecoration，还是 PageTemplate？
- 用户页码和内部页码不一致时如何处理？

### 建议输出

- `R3-page-canvas-export-boundary-spec.md`

### R3 局部执行大纲

#### 本阶段目标

把 R2 的 `Natural Page Editing + Freeform NoteBlock Box` 继续推进到 page/canvas/export 边界。R3 不设计完整导出引擎，也不进入多页实现，而是先锁定 formal page、outside scratch workspace、export intent、AI visibility、page label mapping 的产品规则。

#### 本阶段必须读取的旧 reference

- `docs/brainstorm/BetterNoteBook Research/R2-better-notebook-core-interaction-spec.md`
- `docs/brainstorm/BetterNoteBook Research/S1-r0-r2-better-notebook-position-and-core-ux-summary.md`
- `docs/brainstorm/产品完善/PI-046 Research/R6-page-canvas-modes-and-export-boundaries.md`
- `docs/brainstorm/产品完善/PI-046 Research/S2-r3-r6-object-model-manual-editor-page-canvas-summary.md`

#### 本阶段必须观察的 Notion / AFFiNE / Coincides 行为

- 复用 R1 对 Notion / AFFiNE 的成熟体验观察，不重复重新调研。
- 使用 Browser Harness 观察当前登录后的 Coincides Canvas Document。
- 重点观察当前 Coincides 是否已经有 A4 page seed、nodes、hidden nodes、relation layers、selected object scope、source panels 与 canvas 主工作区。
- 不点击、不创建、不移动、不删除任何数据。

#### 本阶段必须回答的问题

- 页面内内容默认导出、页面外内容默认不导出是否成立？
- 页面外内容是否仍能 relation 到页面内对象？
- 页面外内容是否能被 AI 读取？
- 导出意图是否应该独立于视觉位置？
- hide / restore 是否能等同于 export visibility？
- 多页模式和跨页 block 第一阶段是否应该实现？
- 页眉、页脚、页码是否应该是普通 NoteBlock？
- internal page index、display page label、source page label、export page index 如何分开？

#### 本阶段输出文件

- `R3-page-canvas-export-boundary-spec.md`

#### 本阶段可能反补哪些前序阶段

- 不反补 R0-R2。
- R3 会强化 R2：layout / projection 不只包含 x/y/width/height，还必须预留 export role、export visibility、AI visibility。

#### 本阶段对新 roadmap 的预期影响

新版 Better Notebook roadmap 在 `Natural Page Editing + Freeform NoteBlock Box` 之后，应增加 `Page Boundary and Export Intent Seed`。第一阶段至少要有 formal page、outside scratch、object export intent、AI visibility、page label mapping 的最小设计，不应等到 PDF export 阶段才补。

### R3 完成记录

**已完成报告**：`R3-page-canvas-export-boundary-spec.md`

**核心结论摘要**：

- Better Notebook 不能只是一个可拖动 NoteBlock 的 canvas，必须区分 formal page、outside scratch workspace、export intent、AI visibility、page label mapping。
- 页面内默认正式、默认导出；页面外默认 scratch/private/annotation、默认不导出；但这些都只是默认值，最终必须由 explicit intent 控制。
- 页面外对象不是垃圾。它可以 relation 到页面内对象，也可以被 AI 读取，但 AI 必须知道它不是默认正式正文。
- 第一阶段建议先做单页 formal page + 最小 outside scratch，不做真正跨页 block。
- 页眉、页脚、页码不应该是每页复制出来的普通 NoteBlock，而应作为 PageDecoration / PageTemplate 概念处理。
- 跨页 relation 不应默认画成长线，应通过 inspector、local graph、relation summary 或筛选模式展示。
- 当前 Coincides 已有 A4 canvas、nodes、viewport、hide/restore、relation layers、selected object scope，是可复用底座；缺口是 page sequence、export role、AI visibility、page label mapping、outside workspace policy。

**Roadmap Draft Impact 摘要**：

- 新 roadmap 第一阶段应拆出或追加 `Phase A2 - Page Boundary and Export Intent Seed`。
- R4 必须继续定义 formal block、scratch note、private note、source quote、relation badge 的视觉差异。
- R5 必须定义 export visibility、move to formal page、move to scratch area、mark private、include in export 等控制入口。
- R6 数据契约必须决定 page / placement / export intent 放在哪里。

**Backfeed Notes**：

- R3 不反补 R0-R2。
- R3 强化 R2 的布局原则：movement / resize 仍只改 projection，但 projection 需要承载导出和 AI 可读边界。

---

## 8. R4: Block 视觉语言与内容类型

### 目标

定义 Better Notebook 中不同 block 的视觉呈现规则，使它们像内容而不是工程卡片。

### 需要覆盖

- text / paragraph；
- heading；
- definition；
- theorem / proof；
- formula / LaTeX；
- image；
- code；
- table；
- source quote；
- callout；
- sticky note / side note；
- scratch note；
- future custom template block。

### 需要回答

- 普通 paragraph 是否默认无边框？
- 什么时候显示 block type？
- block type 是 hover 显示、选中显示，还是 inspector 显示？
- formula block 如何同时支持 inline 和 display？
- 图片 block 如何 resize / crop / caption？
- sticky note 与普通 NoteBlock 的区别是什么？
- source quote 如何显示来源？
- debug metadata 如何隐藏到 inspector？
- 用户自定义 block style 应在什么时候进入 roadmap？

### 建议输出

- `R4-block-visual-language-and-content-types.md`

### R4 局部执行大纲

#### 本阶段目标

把 R2 的自然写作和 R3 的 formal/scratch/export 边界继续推进到 block 视觉语言。R4 要回答：不同内容类型在 Better Notebook 里应该怎样显示，哪些 metadata 应该隐藏到 hover/selected/inspector/debug，而不是常驻正文。

#### 本阶段必须读取的旧 reference

- `docs/brainstorm/BetterNoteBook Research/R1-notion-affine-mature-notebook-baseline.md`
- `docs/brainstorm/BetterNoteBook Research/R2-better-notebook-core-interaction-spec.md`
- `docs/brainstorm/BetterNoteBook Research/R3-page-canvas-export-boundary-spec.md`
- `docs/brainstorm/产品完善/PI-046 Research/R4-manual-notebook-minimum-usable-experience.md`
- `docs/brainstorm/产品完善/PI-046 Research/R5-page-editor-freeform-block-box-requirements.md`
- `docs/brainstorm/产品完善/PI-046 Research/R4-R5-补充调研.md`
- `docs/brainstorm/产品完善/PI-046 Research/R7-affine-product-experience-review.md`
- `docs/brainstorm/产品完善/product-improvement-issue-register.md`

#### 本阶段必须观察的 Notion / AFFiNE / Coincides 行为

- 复用 R1/R7 对 Notion / AFFiNE 的成熟体验观察，不重复重新调研。
- 使用 Browser Harness 观察当前 Coincides Canvas Document 的节点视觉。
- 读取当前 NoteDetail / LearningCanvasSurface 的组件和 CSS，确认当前 block/card 的真实视觉结构。
- 不点击、不创建、不移动、不删除任何数据。

#### 本阶段必须回答的问题

- 普通 paragraph 是否默认无边框？
- 什么时候显示 block type？
- source / relation / template / debug metadata 应该在哪一层显示？
- formula block 如何支持 inline 与 display？
- image / figure / code / table / source quote / callout / sticky note 的第一版视觉边界是什么？
- sticky note 与普通 NoteBlock 的差异是 truth 差异，还是 placement/export/AI role 差异？
- 用户自定义 block style 应何时进入 roadmap？

#### 本阶段输出文件

- `R4-block-visual-language-and-content-types.md`

#### 本阶段可能反补哪些前序阶段

- 不反补 R0-R3。
- R4 强化 R2：用户不应一直看见 NoteBlock 的工程边框。
- R4 强化 R3：formal / scratch / private / annotation 不只是数据字段，也必须有克制但可理解的视觉差异。

#### 本阶段对新 roadmap 的预期影响

新版 Better Notebook roadmap 应加入 `Block Visual Language Pass`。第一阶段需要把 paragraph、heading、definition、theorem、proof、formula、source quote、callout、code、sticky/scratch note 的默认视觉语言打磨成熟；image/table 可以先做最小 seed 或进入后续阶段，但不能继续只靠工程卡片表示所有内容。

### R4 完成记录

**已完成报告**：`R4-block-visual-language-and-content-types.md`

**核心结论摘要**：

- Better Notebook 的 block 视觉语言必须从“工程卡片”升级为“内容优先、结构按需显露”。
- 普通 paragraph 默认应无明显边框；阅读态应像自然正文，hover/selected/layout edit mode 才逐步显示结构。
- block type 不应常驻显示；Reading 隐藏或极弱显示，Hover 显示小 badge，Selected 显示 type/role，Inspector 显示完整 template/system type/learning role，Debug 才显示 id。
- Source / Relation / Template / Proposal / Provenance metadata 不应常驻正文，应进入 badge、selected toolbar、inspector、debug mode。
- Formula 需要区分 inline formula 与 display formula block；当前 KaTeX preview 是好种子，但最终应让阅读态只看公式，编辑态才看源码/预览。
- Sticky note / scratch note 不一定是新 truth type，第一阶段更应通过 placement/export/AI role 与视觉形态区分。
- 当前默认模板已有 paragraph、heading、definition、theorem、proof、formula、example、exercise、answer、source quote、callout、code，但 image/table/figure/caption/sticky/scratch 视觉块仍是 gap。
- 用户自定义 style 不应在第一阶段全面开放；应先做默认核心 block 视觉，再进入 render hint / style preset / Visual Style Studio / style pack。

**Roadmap Draft Impact 摘要**：

- 新 roadmap 应加入 `Phase A3 - Block Visual Language Pass`。
- R5 必须决定 block type、source、relation、export intent、AI visibility、debug info 分别放在 hover、selected toolbar、right-click、inspector、debug mode 的哪里。
- R6 数据契约必须支持 content role、placement role、interaction state、style profile 或等价字段。
- R7/R8 若继续评估 AFFiNE / BlockSuite，必须验证其是否能隐藏 debug metadata、弱化 block 边界、支持 selected/layout state、支持 Coincides source/relation/template badges。

**Backfeed Notes**：

- R4 不反补 R0-R3。
- R4 直接进入 S2 的总结范围，S2 应把 R3/R4/R5 收束成 page/canvas/block/control 的产品规格。

---

## 9. R5: 编辑控制、工具栏、右键菜单与快捷键

### 目标

决定哪些能力放在表面按钮，哪些放进 hover、右键、slash、快捷键、inspector。

### 需要覆盖

- top toolbar；
- floating toolbar；
- slash menu；
- block context menu；
- right sidebar inspector；
- resize handle；
- drag handle；
- alignment guides；
- snap toggle；
- keyboard shortcuts；
- undo / redo；
- delete / archive / hide；
- source attach；
- relation attach；
- export intent toggle。

### 需要回答

- 哪些按钮必须常驻？
- 哪些只在选中 block 后出现？
- 哪些只在 layout mode 出现？
- 哪些放进右键菜单？
- 哪些放进 inspector？
- Archive / Delete / Hide 三者如何区分？
- 用户删除 block 时是删除 truth，还是只移出当前 projection？
- 如何避免界面像工程后台？

### 建议输出

- `R5-controls-toolbar-context-menu-and-shortcuts.md`

### R5 局部执行大纲

- [x] 读取 R1-R4 的阶段结论，尤其是 R4 对 metadata 显隐、block visual state 和 debug 隐藏的要求。
- [x] 读取 PI-046 R4/R5、R4-R5 补充调研、AFFiNE 产品体验报告和 product improvement register 中的 PI-043。
- [x] 使用 Browser Harness 观察当前 Coincides 登录后的 Course/Canvas 页面，只观察不创建、不移动、不删除数据。
- [x] 对照当前代码中的 `LearningCanvasSurface`、`CourseDetail`、`NoteDetail`，记录已有 command / inspector / hide / archive / selection seed。
- [x] 定义常驻 topbar、slash、hover、selected toolbar、layout mode、right-click、inspector、debug/agent command 的分工。
- [x] 明确 Delete / Hide / Archive / Remove from page / Exclude from export 的产品语义和数据风险。
- [x] 写出 R5 对 R6 数据契约、R7/R8 AFFiNE/BlockSuite 评估和新 roadmap 的影响。

### R5 完成记录

R5 已完成，输出为 `R5-controls-toolbar-context-menu-and-shortcuts.md`。

核心结论：

- Better Notebook 不应该把所有能力铺成工程按钮，而应按频率、风险、对象和上下文分层。
- 常驻 topbar 只放 note/page 级高频操作；slash command 负责自然创建和类型转换；hover 只显示轻量 handle/badge；selected toolbar 承担 block 级高频操作；layout mode 显示 resize/snap/alignment；right-click 放低频对象操作；inspector 放 source/relation/layout/export/AI/history/debug。
- `Delete`、`Hide`、`Archive`、`Remove from page`、`Exclude from export` 必须分开。`Move to trash` 影响内容 truth；`Remove from page` 只移除 projection；`Hide` 主要用于临时视觉隐藏；`Archive` 是生命周期；`Exclude from export` 是输出策略。
- Source attach 和 relation attach 应首先作为 selected block toolbar / right-click / inspector 能力，而不是常驻页面大面板。
- Debug ids、selected object scope 和 raw metadata 应进入 inspector/debug mode，不应污染普通阅读与写作界面。
- R6 必须支持这些状态区分，否则 UI 文案再清楚也会产生误删和误解。
- 新 roadmap 应加入 `Phase A4 - Command Surface / Inspector / Control Layer`。

---

## 10. R6: Better Notebook 数据契约

### 目标

把用户体验和 Coincides 数据主权连接起来，防止 editor surface 接管 truth。

### 必须坚持的边界

```text
NoteBlock = 内容 truth
BlockBox / CanvasNode / Placement = 布局与呈现
CanvasShape = 纯视觉对象
CanvasEdge = 视觉连接 / interaction object
ObjectRelation = 语义关系
SourceAnchor / SourceRegion = 来源证据
TemplateDefinition = block 能力契约
DomainBlockSet = template/composition 选择范围
Proposal / OperationBatch = 审阅与恢复
```

### 需要回答

- Freeform block-box 应存在哪里？
- `note_block_placements` 与 `canvas_nodes` 是否需要统一或分层？
- page editor layout 与 canvas layout 是否同一套 projection？
- 如果使用 BlockSuite，BlockSuite snapshot 是 cache、sidecar，还是 source of truth？
- 断开 external editor runtime 后，能否重建页面？
- source / relation / template metadata 如何挂在 NoteBlock 上而不污染编辑器？
- 页面外 scratch block 是否是 NoteBlock、CanvasShape，还是 ScratchBlock？

### 建议输出

- `R6-better-notebook-data-contract.md`

### R6 局部执行大纲

- [x] 读取 R3-R5 和 S2 结论，确认 page/canvas/export、block visual、command surface 对数据层的要求。
- [x] 使用 CodeGraph 读取当前 `LearningCanvasSurface` 命令/选择/布局/边关系 seed。
- [x] 检查当前 schema 中 `note_blocks`、`note_block_placements`、`note_block_sources`、`learning_canvases`、`canvas_nodes`、`canvas_edges`、`object_relations`、`relation_layers` 等表。
- [x] 比较 `note_block_placements.display_overrides_json`、`canvas_nodes` 和独立 surface object 层三种承载 freeform block-box 的路线。
- [x] 定义 NoteBlock、BlockBox/SurfaceObject、DocumentSurface、CanvasEdge、ObjectRelation、SourceReference、TemplateDefinition、EditorSnapshot 的职责边界。
- [x] 明确 Hide / Remove / Archive / Trash / Exclude from export 的数据语义差异。
- [x] 写出对 R7 技术路线评估和 v3.x graph-native migration evidence 的要求。

### R6 完成记录

R6 已完成，输出为 `R6-better-notebook-data-contract.md`。

核心结论：

- `NoteBlock` 应继续作为内容 truth；move、resize、hide、export intent、AI visibility 不应改写 NoteBlock 内容。
- `note_block_placements` 是线性 placement seed，`canvas_nodes` 是 canvas projection seed；二者都可短期复用，但不宜成为 Better Notebook formal page layout 的唯一长期合同。
- 目标契约应引入或等价表达 `DocumentSurface` / `DocumentSurfaceObject` 层，用来承载 formal page、outside workspace、page mode、placement role、export role、AI visibility、x/y/width/height、page index/label、status 和 render hints。
- 外部 editor runtime 的 snapshot 必须是 cache/sidecar，不是 Coincides source of truth。
- 有内容意义的 scratch 是 NoteBlock + scratch/private placement；纯视觉对象是 CanvasShape/SurfaceShape；页眉页脚页码是 PageDecoration/PageTemplate，不应成为普通 NoteBlock。
- R7 评估 AFFiNE / BlockSuite / 自研路线时，必须验证其是否能支持 Coincides object identity、surface object、export intent、AI visibility、source/relation/template truth 和 snapshot 缺失后的重建。

---

## 11. R7: AFFiNE / BlockSuite / 自研路线再评估

### 目标

在 Better Notebook 具体体验被定义后，重新判断技术路线。

### 候选路线

1. Coincides 自研 editor/canvas；
2. BlockSuite Edgeless-as-page + Coincides sidecar；
3. BlockSuite PageEditor + 自定义 overlay；
4. AFFiNE fork / partial copy；
5. 其他 editor runtime，如 Tiptap / Lexical / BlockNote / ProseMirror。

### 需要回答

- 哪条路线最能支持 freeform block-box？
- 哪条路线最能支持自然文本输入？
- 哪条路线最能支持 page/canvas/export 边界？
- 哪条路线最不伤害 Coincides truth？
- 哪条路线维护成本可接受？
- 哪条路线最适合先做 spike？
- 如果 BlockSuite 不能满足需求，自研 fallback 的最小范围是什么？

### 建议输出

- `R7-editor-runtime-route-decision.md`

### 局部执行大纲

R7 已在 R3-R6 的基础上重新评估 editor / canvas 技术路线，重点比较：

- Coincides 自研 editor/canvas；
- BlockSuite Edgeless-as-page + Coincides sidecar；
- BlockSuite PageEditor + 自定义 overlay；
- AFFiNE fork / partial copy；
- Tiptap / Lexical / BlockNote / ProseMirror 等其他 editor runtime；
- 当前 Coincides canvas seed 继续迭代。

本阶段必须继承 PI-046 的核心判断：不要让外部 editor runtime 接管 Coincides 的 source、relation、template、proposal-first 和 future graph-native truth。

### 已完成报告

- `R7-editor-runtime-route-decision.md`

### 核心结论摘要

R7 不建议把 full AFFiNE fork 作为主线。更稳的路线是：

```text
数据主权自研；
交互运行时先评估 BlockSuite；
AFFiNE 作为产品和代码参考；
full fork 不作为主线；
自研 surface + rich text 内核作为 fallback；
当前 Coincides canvas seed 继续作为验证基线。
```

优先 spike：

1. `BlockSuite PageEditor + Overlay`：验证自然写作、slash、selected toolbar、block-box resize、右侧空白并排 block、Coincides id sidecar、snapshot rebuild。
2. `BlockSuite Edgeless-as-page`：验证 A4 formal page、outside workspace、xywh、connector、export intent overlay、snapshot rebuild。
3. `Self-owned minimal surface fallback`：作为 BlockSuite 不适配时的最小兜底。

R7 的路线红线：

- `NoteBlock` 仍是内容 truth；
- `SurfaceObject` 仍是 placement/projection truth；
- editor snapshot 只能是 cache / sidecar；
- source provenance 留在 Coincides source tables；
- `ObjectRelation` 是语义边；
- canvas / BlockSuite connector 只是视觉或交互对象，除非显式 bind；
- proposal-first governance 和 `OperationBatch` 必须保留。

### Roadmap Draft Impact 摘要

新的 Better Notebook roadmap 应在正式 UI 重构前加入一个 `Phase B0 - Editor Runtime Spike Gate`。

Phase B0 不做完整迁移，而是用小范围 spike 判断：

- BlockSuite PageEditor 是否能承载自然写作；
- BlockSuite Edgeless 是否能承载 formal page + outside workspace；
- adapter 是否能把外部 runtime object 映射到 Coincides `NoteBlock` / `SurfaceObject`；
- 删除 editor snapshot 后是否仍能从 Coincides records 重建；
- 最终采用 BlockSuite、混合路线，还是自研 fallback。

### Backfeed Notes

R7 反补 R6：R6 的数据契约应在新 roadmap 中被提升为 adapter 验收标准，而不是只作为抽象设计。

R7 也反补 R1/R2：成熟产品体验可以借鉴 AFFiNE / Notion，但 Coincides 的核心体验不是复制双模式文档，而是建立 page-first、canvas-backed、source-aware、relation-capable 的自有文档表面。

---

## 12. R8: Source / Relation / Concept 在 Better Notebook 中的用户体验

### 目标

决定 source、relation、concept 这些语义能力在成熟笔记体验中如何出现，而不是继续以工程面板出现。

### 需要覆盖

- 用户给 block attach source；
- 单 source / 多 source；
- page / page range / SourceRegion；
- source quote；
- source inspector；
- relation visible line / hidden relation / local graph view；
- concept tag / domain / role / template filtering；
- AI visibility；
- export visibility。

### 需要回答

- 用户如何把自己写的 block 关联到多个来源？
- source attach 是右键、inspector，还是 source picker？
- relation 什么时候显示成线，什么时候只在 inspector/local graph 出现？
- 跨页 relation 是否默认隐藏？
- concept 是否在 Better Notebook 第一阶段出现，还是推后？
- SourceRegion 是否要等 PI-048 后再进入正式工程？

### 建议输出

- `R8-source-relation-concept-user-experience.md`

### 局部执行大纲

R8 在 R6 数据契约和 R7 editor runtime 路线之后，研究 source、relation、concept 怎样作为成熟 UX 出现，而不是继续作为工程面板堆在页面上。

本阶段重点读取：

- `R6-better-notebook-data-contract.md`
- `R7-editor-runtime-route-decision.md`
- `S2-r3-r5-page-canvas-block-control-summary.md`
- `product-improvement-issue-register.md` 中 PI-015、PI-020、PI-029、PI-030、PI-031、PI-049 与 open questions 112-121
- 当前 schema 中 `note_block_sources`、`source_anchors`、`source_scopes`、`canvas_edges`、`object_relations`、`relation_layers`、`domain_object_classifications`

本阶段还使用 Browser Harness 观察当前 Coincides 页面，确认 source board node、note block、selected object scope、relation layers、hidden nodes 等能力已经存在 seed，但正常 UI 仍偏工程调试。

### 已完成报告

- `R8-source-relation-concept-user-experience.md`

### 核心结论摘要

R8 结论：

```text
Source = 为什么可信，能不能回到来源
Relation = 这个内容和别的内容怎样相连
Concept = 这个内容属于哪些可检索、可筛选、可演化的主题维度
```

Better Notebook 中 source、relation、concept 的正确出现位置不是正文里的工程标签，而是：

```text
badge
tooltip
selected toolbar
right-click
inspector
local graph
search/filter
export preview
AI context preview
```

排序建议：

1. Source 先进入第一轮：它直接影响可信度、citation、jump-back 和 source-free/user-authored block 的正常化。
2. Relation 第二进入：现有 v2.4.4 seed 有价值，但需要从视觉线升级成可查询、可隐藏、可绑定、可过滤的语义连接。
3. Concept 第三进入：Concept 对跨笔记检索和 GraphRAG 重要，但第一轮只做 concept-lite inspector/search/filter，不做完整 Concept Studio。

### Roadmap Draft Impact 摘要

新 roadmap 应增加：

```text
Phase A7 - Source / Relation / Concept Interaction Layer
```

或拆成：

```text
Phase A7a - Source Attachment And Provenance UX
Phase A7b - Relation Inspector And Local Graph UX
Phase A7c - Concept-Lite Search And Inspector UX
```

最小验收：

- selected block 可 attach one/multiple sources；
- source picker 支持 source material、page/range、SourceScope、SourceAnchor、SourceBoard node；
- block 显示轻量 source badge；
- relation 同页可线、跨页默认 badge/list/local graph；
- visual edge 和 ObjectRelation 保持分离；
- relation layer 可过滤；
- inspector 有 Concepts tab；
- full Concept model、ConceptRefinementProposal、backfill 后置；
- `SourceRegion` 等 PI-048 后再进入正式工程。

### Backfeed Notes

R8 反补 R7：无论采用 BlockSuite 还是自研 surface，source/relation/concept 必须作为 Coincides-owned overlay / sidecar / inspector 能力接入，不能塞进 editor snapshot 成为不可控私有结构。

R8 反补 R6：R6 的 data contract 需要为 `SourceAttachment`、relation low-level dimensions 和 future `ConceptLink` 预留空间，但第一版不必立刻新增完整 Concept 表。

---

## 13. R9: 性能、规模与重建能力

### 目标

确保 Better Notebook 不只是 1 页 demo，而能面对真实笔记规模。

### Benchmark 场景

- 1 页；
- 10 页；
- 50 页；
- 100 页；
- 200 页候选压力测试；
- 每页 5-20 个 block；
- 多图片；
- 多公式；
- 多 relation；
- 页面外 scratch 内容；
- source-backed blocks；
- project package reopen。

### 需要回答

- 是否需要 viewport virtualization？
- block layout 如何缓存？
- relation/edge 如何按需加载？
- source inspector 如何 lazy load？
- 多页导出如何避免卡死？
- editor snapshot 丢失后如何从 Coincides records 重建？
- undo / redo / operation history 的成本如何控制？

### 建议输出

- `R9-performance-scale-and-rebuild-benchmark.md`

### 局部执行大纲

R9 在 R6-R8 之后研究 Better Notebook 如何支撑真实笔记规模，而不是停留在 1 页 demo。

本阶段重点读取：

- `S3-r6-r8-data-source-relation-concept-summary.md`
- `R6-better-notebook-data-contract.md`
- `R7-editor-runtime-route-decision.md`
- `R8-source-relation-concept-user-experience.md`
- `product-improvement-issue-register.md` 中 PI-028、PI-029、PI-030、PI-031、PI-034、PI-035、PI-036、PI-049

本阶段重点回答 viewport virtualization、relation lazy loading、source inspector lazy load、layout cache、export batching、snapshot rebuild、package reopen 和 operation history 成本。

### 已完成报告

- `R9-performance-scale-and-rebuild-benchmark.md`

### 核心结论摘要

R9 结论：

```text
不要试图一次渲染全部 truth；
不要把 editor snapshot 当 truth；
不要让 source/relation/concept 默认全显；
不要让 SourceRegion 自动变成 NoteBlock；
不要把 export 设计成当前屏幕截图。
```

Better Notebook 必须把规模能力从“后期优化”提前为产品设计约束：

- viewport/page virtualization；
- relation lazy loading；
- source inspector lazy loading；
- block layout cache；
- page-aware projection index；
- editor snapshot loss rebuild；
- export plan / batch rendering；
- package reopen recovery；
- S/M/L/XL/XXL benchmark matrix。

### Roadmap Draft Impact 摘要

新 roadmap 应增加：

```text
Phase F - Performance / Rebuild / Package Safety
```

并把性能约束反向写入更早阶段：

- `Phase A6` data contract 必须支持 rebuild；
- `Phase B0` editor runtime spike 必须验证 virtualization 与 snapshot rebuild；
- `Phase A7` source/relation/concept UX 必须默认 lazy / filtered；
- `Phase F` 再做系统 benchmark、package reopen 和 recovery tray。

### Backfeed Notes

R9 反补 R7：runtime spike 不能只看功能能不能跑，还必须测试 50-100 页规模、snapshot 删除后的重建、relation/source lazy load 和 sidecar stale/orphan 检测。

R9 反补 R8：跨页 relation 默认隐藏、source preview 默认 lazy、Concept 不满屏显示不仅是 UX 选择，也是性能选择。

---

## 14. R10: Better Notebook Roadmap Synthesis

### 目标

把 R0-R9 收束成新 Better Notebook roadmap 的草稿。

### 必须产出

- 新 roadmap 建议标题；
- roadmap phase 划分；
- 每个 phase 的目标；
- 每个 phase 的 out of scope；
- 每个 phase 的必读 reference；
- 每个 phase 的验收标准；
- 哪些 v2.x 成果复用；
- 哪些旧 UI 冻结；
- 哪些新能力先做；
- 哪些 AI / Source Reconstruction / GraphRAG 能力推后；
- 是否需要新 repo / spike repo；
- 是否需要 BlockSuite spike；
- continuity 需要新增哪些长期项。

### 建议 phase 草案

```text
Phase A - Better Notebook Product Spec + UI Shell
Phase B - Natural Page Editing + Freeform NoteBlock
Phase C - Page / Canvas / Export Boundary
Phase D - Block Visual Language + Template Runtime Integration
Phase E - Source / Relation / Concept UX Integration
Phase F - Performance / Rebuild / Package Safety
Phase G - Source Reconstruction And AI Note Assembly Readiness
```

R10 可以调整这个草案，但必须解释为什么调整。

### 建议输出

- `R10-better-notebook-roadmap-synthesis.md`

### 局部执行大纲

R10 收束 R0-R9，产出新版 Better Notebook roadmap 的草稿结构。

本阶段重点读取：

- `S1-r0-r2-better-notebook-position-and-core-ux-summary.md`
- `S2-r3-r5-page-canvas-block-control-summary.md`
- `S3-r6-r8-data-source-relation-concept-summary.md`
- `R9-performance-scale-and-rebuild-benchmark.md`

本阶段必须回答 roadmap 标题、phase 划分、每个 phase 的目标、out of scope、必读 reference、验收标准、旧 v2.x 成果复用、旧 UI 冻结、AI/Source Reconstruction/GraphRAG 推后、spike repo 需求和 continuity 新增项。

### 已完成报告

- `R10-better-notebook-roadmap-synthesis.md`

### 核心结论摘要

R10 建议新版 roadmap 命名为：

```text
Coincides Better Notebook Roadmap
```

总原则：

```text
先做一个成熟的人类笔记软件；
再把 Coincides 已有的 source、relation、template、proposal、package、AI-ready 语义能力安静地接进去；
最后再进入 Source Reconstruction、AI Note Assembly 和 GraphRAG。
```

建议 phase：

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

### Roadmap Draft Impact 摘要

R10 本身就是新 roadmap 的直接草稿来源。正式 roadmap 应从 R10 开始写，而不是从聊天记忆重新拼。

### Backfeed Notes

R10 调整了 Outline 原本的 A-G 粗略草案：把 data contract 和 editor runtime spike gate 独立出来，并把 source / relation / concept 拆分成三个子阶段。

---

## 15. 报告固定格式

每份 R1-R10 报告建议使用以下结构：

```md
# Rn - Title

## 目的
## 本报告必须回答的问题
## 本阶段必须读取的旧 reference
## PI-046 Consistency / Conflict Check
## Browser Harness Observation Log
## Notion / AFFiNE 观察
## Coincides 需求对照
## 可复用旧成果
## 新增设计判断
## 风险与未决问题
## Roadmap Draft Impact
## Backfeed Notes
```

R0 使用单独的 reference index 格式。

---

## 16. Acceptance Criteria

本轮 research 完成后，应满足：

- R0 产出可写进新 roadmap 的 reference index；
- R1-R9 都有独立报告；
- 每份报告都引用相关旧 research；
- 每份报告都有 Roadmap Draft Impact；
- 后续发现能反补前序报告；
- R10 产出新 Better Notebook roadmap 草稿结构；
- 新 roadmap 可以直接从 R10 开始写，而不是重新聊天回忆。

---

## 17. 当前不做

本轮调研不直接实现代码。

本轮调研不做：

- Agent note generation；
- full source reconstruction implementation；
- Microsoft GraphRAG integration；
- Neo4j migration；
- complete template/style developer studio；
- full AFFiNE fork；
- marketplace；
- public release note。

这些可以进入 roadmap，但不是本轮调研本身。
