# S1 - R0-R2 阶段性总结：方法、当前能力与产品目标重置

## 总结范围

本阶段总结覆盖：

- `R0-research-method-and-decision-criteria.md`
- `R1-current-coincides-capability-inventory.md`
- `R2-product-reset-and-four-phase-strategy.md`

它的目标不是替代三份报告，而是把后续 R3-R14 必须继承的结论整理出来。

## 一句话结论

Coincides 目前已经有很强的 source-grounded、proposal-first、template/domain/package-aware 工程地基，但产品目标需要重置为：先做成熟的人工笔记软件，再做 AI-readable 结构化笔记库，再做内置 AI 生成笔记，最后做外部 Agent/API 调度。

## R0 的阶段结论

R0 建立了本轮 PI-046 调研的方法：

- 每个阶段报告都必须回答：解决什么、暴露什么风险、影响什么 roadmap。
- 每个结论要标注证据等级，区分代码事实、文档事实、产品观察和推测。
- 每个阶段结束后必须回到 Outline：
  - 更新局部 checklist；
  - 标记完成报告；
  - 标记后续依赖；
  - 判断是否反补前序报告。
- 最终 R13/R14 必须用同一评分标准比较路线，而不是靠直觉选择 AFFiNE / BlockSuite / 自研。

R0 对后续的硬要求是：PI-046 不能变成松散聊天记录，必须形成可追踪的研究链。

## R1 的阶段结论

R1 证明当前 Coincides 有四类资产：

### 可保留地基

- SourceAnchor / SourceScope / SourceBoard。
- NoteBlock identity / metadata / placement。
- CanvasNode projection 与 truth 分离。
- CanvasEdge / ObjectRelation 分离。
- TemplateDefinition / CompositionTemplate / DomainBlockSet / PackageManifest。
- Proposal / OperationBatch / Recovery。
- documents / chunks / VectorStore。
- v2 test strategy 和 additive migration discipline。

### 实验性施工痕迹

- Course Detail 超长复合页面。
- 当前 LearningCanvasSurface 视觉和交互。
- 当前 Source Snapshot / Scope / Board UI。
- 当前 Template Studio 工程面板。
- 当前 documentParser / chunking。

### 应冻结能力

- 在产品目标未重置前继续扩展 Calendar / Goal / study planning。
- 继续在 Course Detail 中堆更多 source/canvas/template 面板。
- 未调研前继续从零自研 rich editor / full canvas paint tool。
- 让外部 Agent 直接改底层对象。

### 应迁移经验

- proposal-first。
- warning/blocker/recovery-first。
- source provenance。
- template/domain/package governance。
- graph-native evidence 记录方式。

R1 最重要的判断是：Coincides 的 UI 不是最大资产，语义层和治理层才是最大资产。

## R2 的阶段结论

R2 把 Coincides 的产品目标重置成四阶段：

```text
人能用的笔记软件
  -> AI 能读的结构化笔记库
  -> 内置 AI proposal-first 整理/生成笔记
  -> 外部 Agent/API 调度 Coincides
```

这意味着：

- Coincides 首先应是笔记软件，不是直接做抽象信息中台。
- AI 不应替代第一层产品体验。
- 内置 AI 生成笔记必须走 source reconstruction、role segmentation、template selection、proposal-first。
- 外部 Agent 应通过 Coincides API/Tool 触发内部工作流，而不是绕过 Coincides 规则直接写数据。

## 对后续调研的总约束

### R3 的约束

R3 做核心对象模型时，必须同时考虑：

- 哪些对象属于人工笔记层；
- 哪些对象属于 AI-readable substrate；
- 哪些对象属于 AI generation workflow；
- 哪些对象属于 external orchestration/provenance。

### R4-R6 的约束

R4-R6 必须服务“人能用的笔记软件”：

- 空白笔记如何开始输入；
- NoteBlock 如何表现得像自然文档内容；
- freeform block-box 是否必要；
- page/canvas/export 边界如何定义；
- 页面外 scratch work 是否导出；
- formal page area 和 open canvas 如何并存。

### R7-R11 的约束

调研 AFFiNE / BlockSuite 时，不能只看外观或成熟度。必须回答：

- 它们能否承载 Coincides 的 source/proposal/template/domain/relation truth；
- 它们能否支持更自然的人类笔记体验；
- 它们的 license、monorepo、runtime、data model 是否允许改编；
- 如果采用，它们是产品壳、editor engine，还是 full fork base。

### R12 的约束

R12 不能只谈 graph database。它必须回答：

- NoteBlock、Concept、ObjectRelation、SourceRegion、TemplateDefinition 如何参与 AI-readable retrieval；
- 当前 document/chunk embedding 如何升级；
- 什么时候需要 GraphRAG；
- 什么应该留 SQL，什么可以进入 graph index 或 graph database。

### R13/R14 的约束

R13/R14 必须把路线选择和 roadmap rewrite 建立在 R0-R12 的证据链上：

- 不凭“我想 fork AFFiNE”或“我想自研”做决定；
- 不把当前 v2.x UI 当成必须保留的产品形态；
- 不丢掉 source/proposal/template/domain/relation 这些 v2.x 地基；
- 不过早把 Coincides 推成自生长知识库。

## 当前阶段已经回答的问题

1. **Coincides 是否从零开始？**
   不是。v2.x 已有强工程地基。

2. **Coincides 是否已经是成熟笔记软件？**
   不是。人工笔记体验和文档编辑体验仍是最大短板。

3. **下一步是否应该继续加底层 feature？**
   不应该。应该先完成 PI-046，决定产品壳和 editor/canvas route。

4. **AI 是不是第一优先级？**
   不是。第一优先级是人能用；第二优先级是 AI 能读；第三优先级才是 AI 帮忙生成。

5. **外部 Agent 应该怎么接入？**
   通过 Coincides 内部 API/workflow/proposal，不直接改底层对象。

## 当前阶段未解决的问题

- Coincides core object model 是否已经足够稳定。
- Page editor 和 canvas editor 是否应该合并、分层或采用 AFFiNE/BlockSuite。
- AFFiNE / BlockSuite 的 license 和架构是否适合。
- NoteBlock 是否适合作为图节点。
- ObjectRelation 是否足以成为图边。
- Concept layer 应如何设计。
- SourceRegion 与 NoteBlockCandidate 如何接入。
- Graph database 是 3.x 主库、sidecar index，还是 hybrid retrieval component。

这些问题将由 R3-R14 继续回答。

## 阶段性 Roadmap 建议

当前只给出方向，不直接改 roadmap：

1. 先完成 PI-046 全部调研。
2. 再完成 PI-048 Source Reconstruction 调研。
3. 然后用 PI-046 + PI-048 重写后续 roadmap。
4. 后续工程不应继续按“多加几个小功能”的方式推进，而应按产品层级推进：
   - manual notebook product；
   - AI-readable substrate；
   - internal AI note assembly；
   - external agent orchestration。

## S1 结论

R0-R2 已经把本轮调研从“想不想 fork AFFiNE”的局部问题，提升为“Coincides 作为笔记产品、结构化知识 substrate 和 AI workflow 平台应该如何分阶段成长”的总体问题。

后续 R3-R14 的任务，就是把这个总体问题拆成对象模型、人工体验、page/canvas、AFFiNE/BlockSuite、AI-readable structure、路线评分和 roadmap rewrite。
