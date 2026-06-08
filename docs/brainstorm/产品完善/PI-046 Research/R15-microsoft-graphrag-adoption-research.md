# R15 - Microsoft GraphRAG 采用补充调研

## 调研定位

R15 是 PI-046 的补充调查，专门研究 Microsoft GraphRAG 这个框架是否适合作为 Coincides 后续的 graph/RAG 层。它不替代 R4/R5 的人工笔记编辑体验，也不替代 PI-048 的 source reconstruction 调研。

当前阶段的顺序应该保持清晰：

```text
成熟的人类笔记软件 / 编辑体验
  -> source reconstruction / SourceRegion
  -> AI note assembly
  -> Microsoft GraphRAG 或其他 graph/RAG 层
```

也就是说，Microsoft GraphRAG 解决的是“后续如何让 AI 更好地读、连、检索、总结已经进入系统的信息”的问题，而不是“用户如何自然输入、拖动、排版、导出一份笔记”的问题。

## 为什么需要 R15

我们在 PI-046 和 Product Improvement Issue Register 中已经多次提到 GraphRAG、Concept layer、ObjectRelation、Hybrid RAG、局部知识图谱、跨笔记检索和 AI-readable subgraph。但这些讨论主要是 Coincides 自己的产品/数据结构思考，还没有专门回答：

- Microsoft GraphRAG 这个现成框架能不能减少我们自己重建 graph/RAG 层的工作量？
- 它的输入、切分、清洗、实体关系抽取和社区摘要，能否映射到 Coincides 的 NoteBlock / Concept / ObjectRelation / SourceRegion？
- 它是否适合处理学习笔记、调研报告、情报整理、代码材料、数学公式和手写扫描 PDF？
- 它应该作为主数据结构、可重建索引，还是仅作为查询时的 context builder？

## 官方资料的初步事实

根据 Microsoft GraphRAG 官方文档，GraphRAG 的默认对象更偏文本语料：输入会进入 `documents` DataFrame，文档再被切成 smaller text units；index 阶段会从 TextUnits 中抽取 entities、relationships、claims，并生成 community summaries。官方说明的默认输入格式主要是 text、CSV、JSON，同时支持自定义 InputReader 或自带 DataFrame。

这意味着 R15 不能假设 Microsoft GraphRAG 自动解决手写 PDF、图片、公式、表格、代码布局和页面 bbox。更合理的初步判断是：GraphRAG 可能应该接收 Coincides / PI-048 已经重建好的文本、SourceRegion 或 NoteBlockCandidate，而不是直接硬吃所有原始文件。

参考资料：

- [Microsoft Research - GraphRAG](https://www.microsoft.com/en-us/research/project/graphrag/)
- [Microsoft GraphRAG documentation](https://microsoft.github.io/graphrag/)
- [Microsoft GraphRAG Inputs](https://microsoft.github.io/graphrag/index/inputs/)
- [microsoft/graphrag GitHub](https://github.com/microsoft/graphrag)

## 本次调研要回答的问题

### 1. 框架边界

- Microsoft GraphRAG 真正负责什么？
- 它的输入对象、输出对象和中间对象分别是什么？
- 它导入文档后，文档会被拆成怎样的形式？
- `Document`、`TextUnit`、`Entity`、`Relationship`、`Community Report` 等对象能否映射到 Coincides 对象？
- 它的数据清洗、chunking、entity extraction、relationship extraction、community detection、summary generation 是否可以拆开使用？
- 它是否支持增量更新，还是更适合离线重建索引？

### 2. 图片、公式、代码和非文本材料

- Microsoft GraphRAG 面对图片时是否会读取图像内容？
- 面对手写扫描 PDF，它是否能自己 OCR，还是必须依赖上游 OCR/VLM？
- 面对数学公式，它是否能生成可靠 LaTeX，还是必须依赖上游 math recognition 工具？
- 面对代码，它是否能保留代码块结构、语言、缩进和语义，还是只把代码当普通文本？
- 面对表格、图表、页面区域、bbox、图文邻近关系，它是否保留结构？
- 如果 GraphRAG 默认不处理这些内容，Coincides 需要在 PI-048 中先完成哪些 reconstruction 层？

### 3. Data cleaning 与重复处理

- Microsoft GraphRAG 的 data cleaning 具体清理什么？
- 它是否会做 source-level dedupe、semantic dedupe、entity merge 或 relationship merge？
- 它的 cleaning 是否会和 Coincides 的 SourceRegion / NoteBlockCandidate / role segmentation / dedupe 流程重复？
- 如果 GraphRAG 产生 cleaned text 或 entity summaries，我们能否把代码、公式、图表相关结果再转换成人类可读的 LaTeX、code block 或 figure block？
- 哪些清洗应放在 GraphRAG 之前，哪些可以交给 GraphRAG？

### 4. 和 Coincides 现有对象的映射

- `TextUnit` 是否对应 `SourceRegion`、`document_chunk`、还是 `NoteBlockCandidate`？
- `Entity` 是否对应未来的 `Concept`？
- `Relationship` 是否对应 `ObjectRelation`，还是只对应临时 graph index edge？
- `Community Report` 是否对应报告摘要、阶段性笔记、relation layer summary，还是只作为 query context？
- `Claim` 是否可以映射到 Evidence / source-backed proposition？
- SourceAnchor、SourceScope、page label、bbox、crop、confidence、tool provenance 应该如何保留？

### 5. 和 Hybrid RAG / GraphRAG 架构的关系

- Microsoft GraphRAG 应该替代普通 vector RAG，还是和 NoteBlock embedding、Concept filter、Role filter、Template filter、ObjectRelation traversal 并存？
- 它应该成为主 graph store，还是可重建 graph index？
- 如果未来使用 Neo4j/Kuzu/其他 graph database，Microsoft GraphRAG 的输出如何迁移或对齐？
- 哪些结果应写回 Coincides，哪些只留在 index sidecar？
- 查询时应该先走 embedding、concept、relation，还是先走 GraphRAG community/global search？

### 6. 对笔记/报告生成的帮助

- Microsoft GraphRAG 能否帮助把大量调研材料收束为人类可读报告？
- 它能否帮助找出跨文档主题、冲突观点、重复观点和证据链？
- 它能否帮助生成局部知识图谱，回答“学习 Green theorem 前需要什么”这类 relation-aware 问题？
- 它输出的社区摘要是否足够 source-grounded，是否能作为 NoteBlock generation 的输入？
- 它是否会弱化 Coincides 对 source provenance 和可追溯性的要求？

### 7. 风险

- LLM 抽取 entity / relationship 时是否会编造或过度概括？
- GraphRAG 的 relationship 是否足够稳定，能否作为 Coincides 的 confirmed ObjectRelation？
- 对数学、代码、手写材料，它是否会丢失结构，导致后续 note generation 质量下降？
- 大规模索引的成本、速度、缓存和重建成本如何？
- 如果 GraphRAG 输出和 Coincides 自己的 Concept / ObjectRelation 冲突，谁是 truth？
- 它是否会把 Coincides 从“精加工信息处理中台”带偏成普通知识库？

## 初步判断，不作为最终结论

- Microsoft GraphRAG 很可能适合作为后续 AI-readable graph/RAG layer 的候选，而不是当前编辑器地基。
- 它应该在 PI-048 source reconstruction 之后接入，因为它更适合处理 text units，而不是直接理解复杂页面。
- 它可能对 Concept、ObjectRelation、局部知识图谱、跨笔记检索和报告级摘要有帮助。
- 它不能替代 NoteBlock、Canvas、SourceRegion、TemplateDefinition、人工编辑体验或 `.coincides` 工程文件。
- 它的 entity / relationship extraction 很可能只能作为 suggestion 或 index evidence，不能直接成为 Coincides truth，除非经过 proposal / review / provenance 机制确认。

## 建议的 R15 输出

R15 正式调研完成时，应至少输出：

1. Microsoft GraphRAG capability matrix。
2. GraphRAG input/output object map。
3. 非文本材料处理能力评估：图片、手写 PDF、公式、代码、表格、网页。
4. Data cleaning 与 Coincides source reconstruction 的边界。
5. `SourceRegion / NoteBlockCandidate / Concept / ObjectRelation` 映射建议。
6. Hybrid RAG 架构建议：vector + concept + graph + source provenance。
7. 第一版 spike 建议：建议先用 PI-046 研究报告这种纯文本材料测试，而不是直接用手写 PDF。

## 第一版 spike 候选

最小 spike 不应直接用复杂扫描 PDF。建议先做：

```text
PI-046 research reports
  -> Microsoft GraphRAG index
  -> entities / relationships / community reports
  -> 对比 Coincides 的 Concept / ObjectRelation / stage summary
  -> 判断是否值得接入 PI-048 后的 SourceRegion pipeline
```

如果这一步都无法产生稳定、有用、可追踪的 graph/RAG 结果，就不应把它放进后续 note assembly 主流程。

## 反哺检查

这份文档是 R15 的入口问题清单，不是最终采用结论。后续 R15-1 到 R15-6 和 R15-summary 已经补充了正式调研结果。

需要反哺：

- `Outline.md` 需要把 R15 拆分为 R15-1 到 R15-6 + summary，并记录每篇报告的反哺检查规则。
- `PI-048 Research/Outline.md` 需要明确：Microsoft GraphRAG 不替代 source reconstruction，但 PI-048 输出应预留 GraphRAG Adapter payload。
- `product-improvement-issue-register.md` 需要新增 GraphRAG adoption spike / sidecar boundary 条目。

已由后续报告完成：

- R15-1 到 R15-6 已逐篇回答本清单中的核心问题。
- R15-summary 已收束采用建议。
