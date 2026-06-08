# R2 - Coincides 产品目标重置与四阶段路线

## 本阶段问题

R2 要回答的是：Coincides 的第一性目标到底是什么，以及它应该按照什么顺序成长。

R1 已经确认：当前 Coincides 有很强的 source/proposal/template/domain/package/canvas projection 地基，但还不是成熟的笔记软件。R2 因此不再把“继续加功能”当成默认路线，而是重新定义产品顺序。

## 证据来源与证据等级

- A 级代码证据：R1 已盘点的 NoteBlock、Source、Canvas、Template、Proposal、Parser/RAG 代码和测试。
- B 级文档证据：v2.x release/review 文档多次记录 `PASS_WITH_FOLLOWUP` 和 UX deferred。
- D 级产品讨论证据：用户明确提出当前产品“不伦不类”，希望反思是否应先做好人工笔记软件，再做 AI 笔记生成和外部 Agent 调度。

R2 的判断建立在 R1 之上：当前工程地基值得保留，但产品目标需要重新排序。

## 总体结论

Coincides 的第一性目标应重置为：

> 做一个能承载 source-grounded、可结构化、可被 AI 读取和协助生成的笔记软件。

它可以在长期成为 AI 信息处理中台，但不应该在产品地基还没成熟时直接以“信息中台”或“自生长知识库”为第一目标。

合理成长顺序是：

1. **人能用的笔记软件**
   用户不用 AI，也能自然写、改、排版、引用 source、导出和分享。

2. **AI 能读的结构化笔记库**
   笔记中的 NoteBlock、Source、Relation、Template、Domain、Concept 等对象足够清晰，使 AI 能可靠检索和理解。

3. **内置 AI 帮忙整理 / 生成笔记**
   AI 根据 source reconstruction、role segmentation、template selection 和 proposal-first 流程生成可审阅笔记。

4. **外部 Agent/API 调度 Coincides**
   外部 Agent 触发 Coincides 内部 workflow / proposal，而不是绕过 Coincides 直接乱改底层数据。

这个顺序不是降低目标，而是给目标加上地基。AI 信息中台是结果，不是第一步。

## 1. 为什么 Coincides 首先必须是笔记软件

用户真正进入 Coincides 时，第一需求不是理解 SourceAnchor、TemplateDefinition 或 ObjectRelation，而是：

- 打开一个空白笔记；
- 在空白处开始输入；
- 插入公式、图片、代码、表格、引用；
- 移动、缩放、排版 block；
- 把某段内容和 source 建立联系；
- 导出成别人能看的 PDF / HTML / 图片 / 工程文件；
- 以后还能打开继续编辑。

如果这些体验不成立，后面的 AI / graph / package / domain 能力都会变成“工程上很强，但用户摸不到”的隐藏层。

R1 说明当前 Coincides 已经有 NoteBlock、CanvasNode、SourceScope、ObjectRelation、TemplateDefinition 等对象；但这些对象还没有变成一个自然的笔记产品。R2 因此把“人工笔记体验”放回第一阶段。

## 2. AI 信息中台和笔记软件的边界

Coincides 可以服务 AI 信息处理中台，但不能一开始就把自己当成完整信息中台。

更稳的定义是：

- Coincides 保存 source-grounded note objects。
- Coincides 保存用户编辑过、AI 可读的结构化知识碎片。
- Coincides 维护 source provenance、relation、template/domain/classification。
- Coincides 通过 API 或 internal workflow 给 AI 提供检索、proposal、修改入口。

但 Coincides 不必一开始承担：

- 自生长知识库；
- 所有外部 Agent 的长期 memory；
- 全局跨软件任务规划；
- 独立替代 Obsidian / Notion / AFFiNE / graph database / RAG platform 的全部职责。

R2 判断：

> Coincides 的核心不是“AI 自己长知识库”，而是“人和 AI 都能可靠操作的结构化笔记工作台”。

## 3. 阶段一：人能用的笔记软件

### 最低目标

阶段一必须让普通用户在不依赖 AI 的情况下完成一篇笔记。

最低能力包括：

- 空白笔记打开后可直接输入。
- 双击或点击 page 空白处能创建 text block。
- slash command 或 toolbar 能切换 block type。
- NoteBlock 在页面上表现为自然文档内容，而不是工程卡片。
- 用户可以插入图片、公式、代码、表格、source quote、callout。
- 用户可以拖动 block、resize block、并排放置 block。
- 用户可以连接 source，但不强制每个 block 都有 source。
- 用户可以区分正式导出区域和页面外草稿区。
- 用户可以导出 PDF / HTML / PNG / 工程文件。

### 对当前 v2.x 的影响

R1 已经说明当前 Course Detail 和 LearningCanvasSurface 是工程 seed。阶段一意味着：

- 必须重新设计 page editor / canvas document shell。
- 必须研究 AFFiNE / BlockSuite 是否能减少 rich editor 和 canvas editor 的自研成本。
- 必须把 NoteBlock 的用户表现从“卡片”变成“自然文档 block”。
- Calendar / Goal / study planning 这类周边功能应冻结，不应继续抢主线。

## 4. 阶段二：AI 能读的结构化笔记库

### 最低目标

阶段二的目标不是让 AI 生成笔记，而是让 AI 能可靠读懂人已经写好的笔记。

最低能力包括：

- NoteBlock 有稳定 identity。
- NoteBlock 有 template / role / domain / concept / source provenance。
- SourceAnchor / SourceScope 能让 AI 回到 source。
- ObjectRelation 能表达 block 与 block 的语义关系。
- Concept 层能帮助跨笔记、跨项目、跨领域检索。
- NoteBlock embedding 与 document chunk embedding 能协同工作。
- 局部知识图谱可以按 block、concept、relation type、domain 生成。

### 对当前 v2.x 的影响

当前 v2.x 已有一些地基：

- NoteBlock identity。
- SourceAnchor / SourceScope。
- ObjectRelation seed。
- TemplateDefinition / DomainBlockSet。
- document chunk embedding。

但缺口仍很大：

- 没有 Concept layer。
- 没有 NoteBlock embedding。
- 没有 SourceRegion。
- 没有 role-aware source reconstruction。
- 没有 GraphRAG。
- relation model 还没有支持 condition / group / directionality / semantic family 的完整表达。

R2 判断：

> 阶段二不是 UI polish，而是把笔记对象变成 AI 可读的结构化 substrate。

## 5. 阶段三：内置 AI 帮忙整理 / 生成笔记

### 最低目标

阶段三才进入真正的 AI note generation。

这时 AI 不应该直接“读全文 -> 写一堆 block”。它应该走 pipeline：

1. Source type detection。
2. Source reconstruction planning。
3. OCR / layout / formula / table / handwriting / web extraction tool route。
4. SourceRegion。
5. Reconstruction-aware chunking。
6. Content role segmentation。
7. Source-level dedupe。
8. Knowledge-level dedupe。
9. Template/domain/role selection。
10. NoteBlockCandidate。
11. Layout proposal。
12. 用户审阅后 apply。

这条路线解释了为什么 PI-048 很关键：没有 source reconstruction，AI note generation 会不稳定。

### 对当前 v2.x 的影响

当前 organized note proposal 是重要 seed，但离 serious note generation 还很远。

阶段三需要补：

- textbook / lecture note / paper / problem set / handwritten STEM / web article 的不同策略；
- role definition system；
- template classification system；
- template selection engine；
- content quality scoring；
- source trust 和 missing source warning；
- proposal preview 中的 sample before/after 和 source trace。

R2 判断：

> 内置 AI 应该先生成 proposal，而不是直接修改笔记。AI 产物必须能被 source、role、template、layout 和 recovery 追踪。

## 6. 阶段四：外部 Agent/API 调度 Coincides

### 最低目标

外部 Agent 的角色应该是调度 Coincides，而不是替 Coincides 执行所有内部逻辑。

外部 Agent 可以：

- 创建 project。
- 上传 source。
- 请求 source reconstruction。
- 请求 note generation proposal。
- 请求 layout proposal。
- 请求 migration/refinement proposal。
- 查询 NoteBlock、Concept、Relation、SourceScope。
- 读取 recovery/provenance。

外部 Agent 不应该默认：

- 直接改写 NoteBlock 内容。
- 绕过 proposal 创建 ObjectRelation。
- 绕过 migration proposal 改 template/domain。
- 绕过 Coincides resolver 自行发明 template/domain。
- 直接操作底层数据库。

### 推荐边界

外部 Agent 应通过 API/Tool 调用 Coincides 的内部工作流。

最佳边界是：

```text
External Agent request
  -> Coincides API / Tool
  -> internal validation / resolver / proposal
  -> user review or deterministic safe apply
  -> operation batch / recovery record
```

这能避免角色混乱：外部 Agent 是“总管/调度者”，Coincides 内部 Agent 是“熟悉 Coincides 规则的执行者”。

## 7. 哪些能力不应压到当前阶段

R2 建议暂缓或冻结：

- 自生长知识库 workflow。
- 全局跨软件 memory 平台。
- 未调研前的完整 GraphDB 迁移。
- 未调研前的 rich editor 从零自研。
- 未调研前的复杂画布绘图工具。
- 当前 Course Detail 里继续加越来越多面板。
- 让外部 Agent 直接写底层对象。

这些能力不是不重要，而是不应该压在产品地基之前。

## 8. 对 Roadmap 的阶段顺序建议

R2 建议 roadmap 改成更清晰的四层：

### Layer A: Manual Notebook Product

目标：不用 AI 也能写出好笔记。

关键调研：

- R4 manual notebook UX。
- R5 freeform block-box。
- R6 page/canvas/export。
- R7 AFFiNE product experience。
- R8 AFFiNE / BlockSuite code/license。

### Layer B: AI-readable Structured Note Substrate

目标：AI 能读懂笔记结构。

关键调研：

- R3 core object model。
- R12 AI-readable / graph-shaped retrieval。
- PI-048 SourceRegion / reconstruction。

### Layer C: Internal AI Note Assembly

目标：AI 能根据 source 生成 proposal-first 笔记。

关键方向：

- SourceRegion -> NoteBlockCandidate。
- content role segmentation。
- template/domain selection。
- source/knowledge dedupe。
- layout proposal。

### Layer D: External Agent Orchestration

目标：外部 Agent 能通过 API 调度 Coincides。

关键方向：

- API/tool contracts。
- skill/manual。
- proposal boundary。
- recovery/provenance visibility。

## 9. R2 解决的问题

R2 解决了四个问题：

1. Coincides 首先是笔记软件，不是先做抽象信息中台。
2. AI 不是第一层体验；AI 应建立在成熟人工笔记和结构化对象之上。
3. 外部 Agent 不应直接改底层数据，而应触发 Coincides 内部 proposal/workflow。
4. 当前 v2.x 的工程地基值得保留，但下一阶段重点应转向产品壳、editor、source reconstruction 和 AI-readable substrate。

## 10. 暴露的风险

1. **路线膨胀风险**
   如果同时做笔记软件、AI 中台、GraphRAG、外部 Agent、自生长知识库，会失去主线。

2. **过早 GraphDB 风险**
   ObjectRelation 和 Domain/Template 已有 graph evidence，但 Concept、Relation taxonomy、NoteBlock retrieval 还没稳定。过早迁移会把未定结构固化。

3. **外部 Agent 越权风险**
   外部 Agent 如果直接写底层对象，会破坏 proposal/recovery/source trust。

4. **AI 生成质量风险**
   如果没有 source reconstruction 和 role segmentation，AI note generation 会依赖模型直觉，不稳定且难以回溯。

## 11. 后续阶段依赖

- R3 必须引用 R2 的四阶段路线，判断哪些对象属于人工笔记层、AI-readable substrate、AI generation workflow、外部 Agent orchestration。
- R4-R6 必须服务 Layer A，定义不依赖 AI 的成熟笔记体验。
- R7-R8 必须判断 AFFiNE / BlockSuite 能否加速 Layer A，而不是替代 Coincides 全部语义层。
- R9-R11 必须在四阶段路线下比较 full fork、BlockSuite-first、hybrid、自研路线。
- R12 必须服务 Layer B，设计 AI-readable structured note substrate。
- R13 必须把路线评分和四阶段路线绑定。
- R14 必须把 roadmap rewrite 收束成“先笔记产品，再结构化 substrate，再内置 AI，再外部 Agent”的顺序。

## 12. 反补前序报告

R2 不需要改写 R0。

R2 对 R1 的轻微反补建议是：

- R1 的“应冻结能力”可以明确包括：在产品目标未重置前继续扩展 Calendar / Goal / study planning、继续在 Course Detail 堆面板、让外部 Agent 直接改底层对象。
- R1 已经表达这些点，因此暂不需要修改 R1 正文；等 R13/R14 汇总时统一吸收即可。

## Roadmap 影响

R2 对 roadmap 的影响很重：

- 下一阶段不应直接进入更多 v2.x feature expansion。
- 应先完成 PI-046，决定 editor/canvas route。
- PI-048 应作为 serious note generation 的前置，而不是可选 polish。
- v2.x 现有地基应被定位为 semantic/backend/proposal layer，而不是完整产品 shell。
- 如果未来 fork / adopt AFFiNE / BlockSuite，Coincides 的四阶段路线仍成立，只是 Layer A 的 editor 实现路径发生变化。

## R2 结论

Coincides 的路线应从“继续加底层能力”转为：

```text
人能用的笔记软件
  -> AI 能读的结构化笔记库
  -> 内置 AI proposal-first 整理/生成笔记
  -> 外部 Agent/API 调度 Coincides
```

这条路线能同时保住 v2.x 已经做出的工程地基，又避免产品继续在粗糙 UI 和过早 AI/graph ambition 中膨胀。
