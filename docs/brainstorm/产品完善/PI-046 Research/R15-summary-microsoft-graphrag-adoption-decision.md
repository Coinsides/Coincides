# R15 Decision Brief - Microsoft GraphRAG 采用决策说明

## 1. 一句话决策

Microsoft GraphRAG **值得做 spike**，但在 Coincides 里只能先作为：

```text
可重建的 graph/RAG sidecar index
```

它不应该成为：

```text
主数据库
SourceRegion 层
NoteBlock 层
confirmed ObjectRelation 层
编辑器 / Canvas 层
工程文件格式
```

核心原则：

```text
Coincides owns truth.
Microsoft GraphRAG owns discovery / query / sidecar index.
```

更短一点：

```text
GraphRAG discovers.
Coincides decides.
```

## 2. 为什么调查它

Coincides 以后一定会遇到这类问题：

- 跨很多笔记找某个主题；
- 从很多材料里发现共同概念；
- 找出知识点之间的潜在关系；
- 从大批调研文档里总结阶段性报告；
- 帮 AI 读取局部知识图谱，而不是整篇整篇读长文本。

这些问题看起来都很像 GraphRAG 可以解决的范围。

所以 R15 的真正问题不是“Microsoft GraphRAG 强不强”，而是：

> 它能不能进入 Coincides，同时不破坏 Coincides 自己的 NoteBlock、SourceRegion、ObjectRelation 和 source provenance 主权？

## 3. 最终判断

R15 的判断是：**可以进入，但必须降级为辅助层。**

推荐位置：

```text
SourceRegion / NoteBlock / ObjectRelation
  -> GraphRAG Adapter
  -> Microsoft GraphRAG sidecar index
  -> ConceptCandidate / RelationCandidate / CommunityReport
  -> Proposal / Review
  -> Coincides truth
```

不推荐位置：

```text
raw PDF / handwritten note / web snapshot
  -> Microsoft GraphRAG
  -> finished notes
```

这个不推荐路线会把 Coincides 降级成普通 RAG 系统，并丢掉我们真正要做的精加工结构。

## 4. 它能做什么

Microsoft GraphRAG 适合做：

- 从文本中抽取 entities；
- 从文本中发现 relationships；
- 生成 community reports；
- 支持 global / local / DRIFT search；
- 帮 AI 构造 query context；
- 对大批文本材料做主题聚类和摘要；
- 作为离线研究工具或可重建索引。

在 Coincides 里，它最可能有价值的场景是：

```text
已经整理过的 NoteBlocks / SourceRegions / research reports
  -> GraphRAG
  -> 发现候选概念、候选关系、社区摘要
```

## 5. 它不能做什么

Microsoft GraphRAG 不适合直接做：

- OCR；
- 手写 PDF 重建；
- 数学公式识别；
- 代码结构解析；
- 表格重建；
- 网页正文 / 广告 / 导航区分；
- SourceRegion bbox / crop / page label；
- NoteBlock 类型判断；
- Canvas 排版；
- 用户编辑体验；
- confirmed ObjectRelation。

这些仍然属于 Coincides 或 PI-048 source reconstruction toolchain。

## 6. 对 PI-048 的决定性影响

R15 不会替代 PI-048。

PI-048 仍然要解决：

```text
raw source
  -> source type detection
  -> OCR / layout / formula / code / table / web extraction
  -> SourceRegion
  -> NoteBlockCandidate
```

但 R15 要求 PI-048 多预留一个输出方向：

```text
SourceRegion / NoteBlockCandidate
  -> GraphRAG Adapter payload
```

所以 PI-048 的方向变成：

```text
source reconstruction for note generation
source reconstruction for evidence/provenance
source reconstruction for future GraphRAG index
```

这会影响 SourceRegion schema。它不只要能服务人类笔记，也要能服务未来 AI-readable graph/RAG。

## 7. NoteBlock 怎么接 GraphRAG

不能把 NoteBlock 压成普通段落。

需要 adapter：

```text
DefinitionBlock / FormulaBlock / ProofBlock / ExampleBlock / CodeBlock
  -> typed text + metadata
  -> Microsoft GraphRAG
```

每个输入至少要保留：

- block id；
- note/project id；
- block role；
- template key；
- system type；
- learning role；
- source anchor/scope；
- concept tags；
- canvas zone；
- export intent；
- provenance；
- confidence。

这样 GraphRAG 才知道它读的是一个带语义的知识块，而不是普通文章 chunk。

## 8. 边关系怎么处理

这是最关键的边界。

Microsoft GraphRAG 的 relationship 是泛用的 entity-to-entity index edge。它通常包含：

```text
source
target
description
weight
text_unit_ids
```

但 Coincides 的 `ObjectRelation` 更精细。它要表达：

- 是否有关联；
- 是否有条件；
- 是否是组合关系；
- 是否有方向；
- 学习 / 证据 / 代码 / 情报 / 报告语境；
- 是否可见；
- 是否由用户创建；
- 是否由 AI 建议；
- 是否经过 source 支撑；
- 是否已经确认。

所以 GraphRAG relationship 只能先进候选层：

```text
GraphRAG Relationship
  -> RelationCandidate
  -> Proposal / Review
  -> ObjectRelation
```

GraphRAG 可以发现关系，但不能替 Coincides 确认关系。

## 9. Relation Pack 是必要的

不同任务需要不同关系组。

学习数学不是情报分析，情报分析也不是代码分析。

所以后续需要类似：

```text
learning.math
research.intelligence
code.analysis
source.evidence
writing.report
```

GraphRAG 发现的关系必须通过当前 project 的 active relation pack 映射。

如果映射不了，只能保留为：

```text
unresolved RelationCandidate
```

不能强行变成正式 ObjectRelation。

## 10. BYOG 的意义

Microsoft GraphRAG 支持 Bring Your Own Graph。

这对我们很重要，因为成熟路线可以变成：

```text
Coincides confirmed Concept / ObjectRelation
  -> BYOG
  -> GraphRAG community reports / query
```

也就是说，未来不是 GraphRAG 统治 Coincides 的图，而是 Coincides 把已经确认的图喂给 GraphRAG，让它做更强的摘要、检索和上下文生成。

## 11. 采用阶梯

R15 建议分级采用，不要一步到位：

```text
Level 0: 不采用
Level 1: 离线研究工具
Level 2: 可重建 sidecar index
Level 3: Concept / Relation proposal assistant
Level 4: BYOG hybrid
```

当前建议：

```text
先验证 Level 1。
通过后才讨论 Level 2 / Level 3。
Level 4 等 Concept 和 ObjectRelation 稳定后再做。
```

## 12. 第一版 Spike 应该怎么做

第一版不要拿手写 PDF 测。

应该先拿 PI-046 的纯文本研究报告测：

```text
PI-046 reports
  -> Microsoft GraphRAG index
  -> entities / relationships / community reports
  -> query test
  -> adoption decision
```

原因：

- 纯文本变量少；
- 可以先验证 GraphRAG 本身；
- 不会把 OCR、公式识别、SourceRegion、GraphRAG 全混在一起；
- 结果好坏更容易判断。

第一版要验证：

- entities 是否抓到 Coincides 核心对象；
- relationships 是否有用；
- community reports 是否比普通摘要更有帮助；
- query 是否能正确回答 PI-046 路线问题；
- 是否能保留来源线索；
- 是否容易映射为 ConceptCandidate / RelationCandidate。

## 13. 通过条件

可以继续推进的信号：

- 能稳定识别 NoteBlock、SourceRegion、ObjectRelation、Concept、BlockSuite、GraphRAG 等核心对象；
- relationship 不是泛泛相关，而是真能帮助理解报告之间的关系；
- community report 对人类阅读有帮助；
- query 能回到正确材料；
- 不会把 GraphRAG 说成万能；
- 输出能进入 Coincides candidate/proposal 层。

应该降级或暂缓的信号：

- relationship 太泛；
- community report 空泛；
- source provenance 弱；
- 无法映射回 Coincides object；
- 中文 / 中英混合表现差；
- prompt tuning 成本太高；
- 运行或重建成本太大；
- 输出会误导 ObjectRelation。

## 14. 对产品路线的影响

R15 不改变 PI-046 的主顺序：

```text
1. 成熟人工笔记 / editor foundation
2. source reconstruction
3. AI note/report assembly
4. graph/RAG sidecar
5. future graph-native planning
```

Microsoft GraphRAG 只能进入第 4 步。

它不能提前挤进第 1 步，也不能替代第 2 步。

## 15. 现阶段决策

现阶段正式决策：

```text
不把 Microsoft GraphRAG 纳入当前 editor foundation。
不让它替代 PI-048。
不让它替代 ObjectRelation。
保留为 R15 后续 Level 1 spike 候选。
```

如果 Level 1 spike 成功，再设计：

```text
typed NoteBlock / SourceRegion payload
  -> GraphRAG sidecar index
  -> candidate/proposal layer
```

如果失败，GraphRAG 只保留为参考，不进入主架构。

## 16. 最终建议

R15 最终建议：

```text
Keep Coincides semantic sovereignty.
Use Microsoft GraphRAG only as a rebuildable discovery/query/report sidecar until proven otherwise.
```

中文解释：

> Coincides 的语义主权不能交出去。Microsoft GraphRAG 可以帮我们发现关系、组织检索、生成社区摘要，但它必须先被证明有用，而且只能通过 adapter / candidate / proposal 进入系统。

## 17. 反哺检查

已经反哺：

- `PI-048 Research/Outline.md` 已补充：Microsoft GraphRAG 不替代 source reconstruction，但 PI-048 输出应支持 GraphRAG Adapter payload。
- `product-improvement-issue-register.md` 已新增 `PI-049: Microsoft GraphRAG Adoption Spike And Graph/RAG Sidecar Boundary`。
- `PI-046 Research/Outline.md` 已记录 R15-1 到 R15-6 + summary 完成，并要求每篇报告都做反哺检查。

后续还需要：

- 后续 roadmap rewrite 应把 GraphRAG 放在 source reconstruction 和 AI note/report assembly 之后。
- 如果以后做 Level 1 spike，需要新增独立 spike plan。

## 18. 主要参考资料

- [GraphRAG Overview](https://microsoft.github.io/graphrag/index/overview/)
- [GraphRAG Inputs](https://microsoft.github.io/graphrag/index/inputs/)
- [Indexing Dataflow](https://microsoft.github.io/graphrag/index/default_dataflow/)
- [GraphRAG Outputs](https://microsoft.github.io/graphrag/index/outputs/)
- [Bring Your Own Graph](https://microsoft.github.io/graphrag/index/byog/)
- [Query Overview](https://microsoft.github.io/graphrag/query/overview/)
- [Local Search](https://microsoft.github.io/graphrag/query/local_search/)
- [Manual Prompt Tuning](https://microsoft.github.io/graphrag/prompt_tuning/manual_prompt_tuning/)
- [Auto Prompt Tuning](https://microsoft.github.io/graphrag/prompt_tuning/auto_prompt_tuning/)
- [Indexing Methods](https://microsoft.github.io/graphrag/index/methods/)
