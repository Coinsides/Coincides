# R15-6 - 第一版 Spike 与采用判断

## 本篇问题

本篇回答：

> 如果要验证 Microsoft GraphRAG 是否适合 Coincides，第一版 spike 应该怎么做？采用或不采用的判断标准是什么？

结论先行：**第一版 spike 应该使用 PI-046 纯文本研究报告，不应直接使用手写 PDF、公式图像或复杂网页。** 目标不是证明 GraphRAG 很强，而是验证它能不能在 Coincides 的 typed/structured 语义层上产生稳定、有用、可追溯的 graph/RAG 增益。

## 为什么不能直接用手写 PDF 做 spike

手写 PDF 会同时引入太多变量：

- OCR 是否准确；
- 公式 LaTeX 是否正确；
- 图像裁剪是否正确；
- reading order 是否正确；
- SourceRegion 是否设计合理；
- NoteBlockCandidate 是否合理；
- GraphRAG 是否能抽取关系。

如果结果不好，我们无法判断问题来自哪里。

所以第一版不应测试：

```text
handwritten PDF -> GraphRAG
```

而应测试：

```text
already-written PI-046 reports -> GraphRAG
```

因为 PI-046 报告是：

- 纯文本；
- 结构清楚；
- 有明确主题；
- 有跨报告关系；
- 适合验证 entity / relationship / community report；
- 和 Coincides 未来产品决策直接相关。

## Spike 目标

第一版 spike 只验证四件事：

1. GraphRAG 是否能从 Coincides-style research reports 中抽取有用 entities。
2. GraphRAG 是否能生成有意义 relationships。
3. GraphRAG community reports 是否能帮助人类理解阶段性研究。
4. GraphRAG 输出能否映射到 Concept / RelationCandidate / Summary，而不污染 ObjectRelation truth。

不验证：

- OCR；
- formula reconstruction；
- BlockSuite editor；
- canvas layout；
- AI note generation；
- full `.coincides` package；
- Neo4j migration。

## Spike 输入材料

建议输入：

```text
docs/brainstorm/产品完善/PI-046 Research/R0-...
docs/brainstorm/产品完善/PI-046 Research/R1-...
...
docs/brainstorm/产品完善/PI-046 Research/R15-...
S1/S2/S3 summaries
Coincides-product-reset-and-editor-foundation-decision.md
PI-046-stage-summary-synthesis-and-recommendations.md
```

但第一轮可以更小：

```text
R1-current-coincides-capability-inventory.md
R3-coincides-core-object-model.md
R12-graph-model-before-graph-database.md
R14-product-reset-affine-adoption-decision-report.md
R15-1...
R15-2...
R15-3...
```

这样可以验证 GraphRAG 是否能理解：

- Coincides current capability；
- core object model；
- graph model；
- editor adoption route；
- Microsoft GraphRAG adoption boundary。

## Spike 输入格式

第一版建议用 Route A：

```text
Markdown report
  -> plain text document
  -> GraphRAG documents DataFrame
  -> GraphRAG index
```

metadata 应包含：

```text
source_file
research_id
research_stage
document_kind: research_report | stage_summary | final_decision
topic_tags
```

暂时不做：

- NoteBlock-level adapter；
- SourceRegion；
- BYOG；
- relation pack enforced extraction。

原因：第一版先验证框架是否值得继续，不要把 adapter 工程复杂度混进来。

## Spike 评估产物

需要查看 GraphRAG 输出：

```text
entities
relationships
communities
community_reports
text_units
query results
```

并人工检查：

- entities 是否抓到关键对象；
- relationships 是否有意义；
- community reports 是否能总结 PI-046；
- text_unit_ids 是否能追踪回报告；
- 是否出现明显幻觉；
- 是否过度抽取泛词；
- 是否丢掉 Coincides 的核心边界。

## 推荐查询问题

Spike 应使用真实问题，而不是随便问。

### 全局问题

```text
PI-046 最重要的路线决策是什么？
Coincides 为什么不应该继续堆 Course Detail UI？
BlockSuite Edgeless-as-page + Coincides sidecar 的核心风险是什么？
```

### 局部问题

```text
ObjectRelation 和 CanvasEdge 的区别是什么？
为什么 SourceRegion 必须在 GraphRAG 之前？
NoteBlock 为什么不能直接变成普通 text chunk？
```

### 关系问题

```text
哪些报告共同支持 BlockSuite-first sidecar spike？
哪些报告讨论了 graph-native migration evidence？
R12 和 R15 对 GraphRAG 的关系是什么？
```

### 失败诱导问题

```text
Microsoft GraphRAG 是否可以直接替代 Coincides 的 NoteBlock？
Microsoft GraphRAG 是否可以直接处理手写 PDF？
GraphRAG relationship 是否就是 Coincides ObjectRelation？
```

如果 GraphRAG 回答这些诱导问题时胡乱肯定，就说明它必须被严格限制。

## 采用标准

### 可以继续采用的信号

- 能抽出稳定的核心 entities，例如 NoteBlock、SourceRegion、ObjectRelation、BlockSuite、GraphRAG、Concept、TemplateDefinition。
- relationships 能反映真实报告关系，不只是泛泛相关。
- community reports 能帮助人类理解报告群，而不是生成空泛摘要。
- query 结果能引用相关 text units。
- 对失败诱导问题能保持边界，不把 GraphRAG 说成万能。
- 输出可以自然映射到 ConceptCandidate / RelationCandidate / SummaryCandidate。

### 应该降级为外围参考的信号

- entity 抽取过度泛化；
- relationship 大量 hallucination；
- community reports 空泛；
- source provenance 弱；
- 很难映射回 Coincides object；
- prompt tuning 成本过高；
- 输出重复了我们自己更可靠的 summary；
- 对 NoteBlock / ObjectRelation 主权边界理解差。

### 应该暂缓采用的信号

- 无法在本地/Windows 稳定运行；
- 对 provider/key/cache/成本要求过高；
- 输出无法重建或审计；
- 对中文/中英混合材料表现差；
- 与 PI-048 或 BlockSuite spike 强耦合，导致调研先后顺序混乱。

## 采用层级

R15-6 建议采用分级决策：

### Level 0: 不采用

只保留研究结论，不引入 GraphRAG。

### Level 1: 离线研究工具

用来分析研究报告、生成候选概念、辅助 roadmap，但不进入产品。

### Level 2: 可重建 sidecar index

进入 Coincides 内部，但只作为可重建 index，不写 product truth。

### Level 3: Relation/Concept proposal assistant

GraphRAG 输出可生成 ConceptCandidate / RelationCandidate，但必须 proposal-first。

### Level 4: BYOG hybrid

Coincides confirmed Concept/ObjectRelation 进入 GraphRAG BYOG，GraphRAG 生成 community reports 和 query context。

R15 当前推荐：

```text
先验证 Level 1。
如果通过，再设计 Level 2/3。
Level 4 只有在 ObjectRelation/Concept 稳定后再做。
```

## 第一版 spike 的具体步骤

```text
1. 选取 6-10 篇 PI-046 研究报告。
2. 转成 GraphRAG documents DataFrame 或 plain text input。
3. 运行 standard GraphRAG index。
4. 查看 entities / relationships / community_reports。
5. 跑固定问题集。
6. 记录 hallucination、provenance、mapping quality。
7. 判断是否进入 Level 2。
```

## 第一版 spike 的通过条件

至少满足：

- 关键对象识别准确率主观评分 >= 7/10；
- relationship 有用率 >= 50%；
- community reports 对人类阅读有明显帮助；
- 至少 3 个真实查询比普通 vector/全文检索更有价值；
- 输出可以映射成 Coincides candidate，而不是只能作为纯文本答案。

不要求：

- 完美关系；
- 自动创建 ObjectRelation；
- 支持手写 PDF；
- 支持公式；
- 支持 NoteBlock adapter；
- 支持 BYOG。

## 和 PI-048 的关系

如果 spike 通过：

PI-048 应继续做 source reconstruction，并在后期增加：

```text
SourceRegion
  -> GraphRAG Adapter payload
```

如果 spike 不通过：

PI-048 仍然继续，但 GraphRAG 不进入主流方向，只作为参考。

所以 R15 不决定 PI-048 是否存在；它只决定 PI-048 输出是否需要面向 GraphRAG 预留 adapter。

## 反哺检查

需要反哺：

- R15-summary 必须把采用层级 Level 0-4 写成最终建议。
- PI-048 Outline 后续应增加：第一版 source reconstruction spike 不应绑定 GraphRAG，GraphRAG 只在 R15 spike 通过后成为 downstream consumer。
- Product Improvement Issue Register 后续可以增加一个新 PI：GraphRAG adoption spike / graph index sidecar evaluation。

暂不需要反哺：

- R15-1 到 R15-5 不需要回改正文。R15-6 是执行建议，不改变前文判断。
- R0-R14 不需要回改。
