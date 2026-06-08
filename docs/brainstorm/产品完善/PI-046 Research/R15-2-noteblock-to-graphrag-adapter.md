# R15-2 - NoteBlock 到 Microsoft GraphRAG 的 Adapter 设计

## 本篇问题

本篇回答：

> 如果 Coincides 以后采用 Microsoft GraphRAG，不同类型的 NoteBlock 如何进入 GraphRAG？GraphRAG 如何知道它们是 Definition、Formula、Proof、Example、Code、SourceQuote 等不同 block？

结论先行：**不能把 NoteBlock 直接当普通文章段落交给 GraphRAG。** Coincides 必须有一个 `GraphRAG Adapter`，把 typed NoteBlock 转成 GraphRAG 可消费的 text + metadata + provenance。GraphRAG 可以读这些内容，但 NoteBlock 的类型、模板、来源、角色和正式关系仍由 Coincides 拥有。

## 官方能力基础

R15-1 已确认，GraphRAG 的输入会进入 `documents` DataFrame，并有 `metadata` 字段。官方也允许：

- bring-your-own DataFrame；
- custom InputReader；
- metadata prepend 到每个 text chunk；
- manual prompt tuning；
- auto prompt tuning；
- custom workflow/providers。

这些能力意味着：Coincides 不必让 GraphRAG 原生理解 NoteBlock。我们可以用 adapter 把 NoteBlock 编译成 GraphRAG 能稳定消费的文档格式。

参考：

- [GraphRAG Inputs](https://microsoft.github.io/graphrag/index/inputs/)
- [Manual Prompt Tuning](https://microsoft.github.io/graphrag/prompt_tuning/manual_prompt_tuning/)
- [Auto Prompt Tuning](https://microsoft.github.io/graphrag/prompt_tuning/auto_prompt_tuning/)
- [GraphRAG Architecture](https://microsoft.github.io/graphrag/index/architecture/)

## 不推荐的方案

### 方案 A：把整篇 Coincides note 当成普通文档

```text
Coincides note
  -> plain text
  -> GraphRAG document
```

问题：

- NoteBlock 边界会丢失；
- Formula / Proof / Example / Code / SourceQuote 被压成普通文本；
- SourceAnchor / SourceScope / bbox / page label 很难保留；
- Canvas formal/scratch/private/export intent 丢失；
- GraphRAG relationship 无法稳定回写到具体 block；
- 用户手动 relation 和 AI-suggested relation 难区分。

这种方案只能做低价值全文搜索，不适合作为 Coincides 主路线。

### 方案 B：每个 NoteBlock 都直接当 GraphRAG document

```text
NoteBlock
  -> GraphRAG document
```

好处：

- block identity 稳定；
- provenance 容易保留；
- relationship 结果容易映射回 block。

问题：

- 太短的 block 可能不利于 entity/relationship extraction；
- 跨 block 上下文不足；
- proof steps / examples / formulas 之间的局部语境可能断裂；
- GraphRAG 的 community report 可能变成碎片化聚类。

这个方案比方案 A 好，但仍然不够。

### 方案 C：让 GraphRAG 自动发现 block 类型

```text
raw note text
  -> GraphRAG
  -> 自动判断 block role/type
```

不推荐。GraphRAG 的 prompt tuning 可以帮助 domain adaptation，但它不是 Coincides 的 template selection engine。NoteBlock type 应该来自 Coincides runtime，而不是 GraphRAG 的 entity extraction。

## 推荐方案：Typed GraphRAG Adapter

推荐路线：

```text
Coincides NoteBlock / SourceRegion / NoteBlockCandidate
  -> GraphRAG Adapter
  -> typed text document + metadata
  -> GraphRAG index
```

Adapter 的目标不是把所有 Coincides 对象变成 GraphRAG truth，而是构造一种“GraphRAG 可读，同时保留 Coincides 语义”的输入。

## Adapter 输出形态

每个 NoteBlock 应该被转换为一个带结构提示的文本单元。例如：

```text
[COINCIDES_NOTE_BLOCK]
block_id: nb_123
note_id: note_456
project_id: project_789
block_role: formula
template_key: formula.math.calculus
system_type: formula
learning_role: derivation
source_anchor_ids: sa_1, sa_2
source_scope_ids: ss_1
concept_tags: green theorem, vector field, line integral
canvas_zone: formal_page
visibility: exportable
provenance: ai_generated_with_source

plain_text:
Green's theorem relates a line integral around a simple closed curve to a double integral over the plane region bounded by the curve.

latex:
\oint_C P\,dx + Q\,dy = \iint_D \left(\frac{\partial Q}{\partial x} - \frac{\partial P}{\partial y}\right)\,dA
```

GraphRAG 仍然看到 text，但 text 内部明确带有 Coincides 的 block identity 和 semantic metadata。

## 不同 NoteBlock 的 adapter 规则

### DefinitionBlock

GraphRAG 输入应包含：

- 被定义术语；
- 定义文本；
- domain / subdomain；
- source；
- aliases；
- related concepts。

示意：

```text
block_role: definition
term: tangent plane
definition_text: ...
aliases: tangent plane approximation
domain: calculus / multivariable calculus
```

目标：

- 帮 GraphRAG 抽取 concept/entity；
- 避免 definition 和 example 混淆；
- 让 relation mapper 能识别 `defines`、`uses_definition`。

### FormulaBlock

GraphRAG 输入应包含：

- LaTeX；
- natural language explanation；
- variable glossary；
- conditions；
- source anchor；
- 使用场景。

示意：

```text
block_role: formula
latex: ...
variables:
  P: vector field component
  Q: vector field component
conditions: C is positively oriented, simple closed, piecewise smooth
```

目标：

- GraphRAG 可以理解公式相关概念；
- 但公式本身的解析和 LaTeX 质量不交给 GraphRAG；
- 后续 relation candidate 可落到 `uses_formula`、`derives_to`、`equivalent_to`。

### TheoremBlock / PropositionBlock

输入应包含：

- theorem statement；
- assumptions；
- conclusion；
- required definitions；
- related formulas；
- proof link。

目标：

- 把 theorem 的条件和结论分开；
- 避免 GraphRAG 把 theorem 简化成普通 paragraph。

### ProofBlock

输入应包含：

- proof target；
- proof steps；
- step order；
- used theorem/formula/definition；
- unresolved gaps。

目标：

- 支持 `proof_of`、`uses_theorem`、`uses_formula`、`derives_to`；
- 不让 GraphRAG 把 proof steps 合并成泛泛摘要。

### ExampleBlock / ExerciseBlock

输入应包含：

- problem statement；
- solution outline；
- final answer；
- required concepts；
- difficulty；
- associated theorem/formula。

目标：

- 支持 `example_of`、`exercise_requires`、`answers`；
- 允许后续检索“所有 Green theorem examples”。

### CodeBlock

输入应包含：

- language；
- code；
- symbol summary；
- function/class names；
- imports/dependencies；
- behavior summary；
- tests or examples。

GraphRAG 不应该独自解析代码结构。更稳的是先用 code parser / tree-sitter / LSP / CodeGraph 类工具生成结构摘要，再喂给 GraphRAG。

目标：

- 支持 `calls`、`implements`、`depends_on`、`configures` 等 code relation pack；
- 保留代码原文和结构摘要。

### SourceQuoteBlock

输入应包含：

- quoted text；
- source identity；
- page/region；
- quotation context；
- whether it is direct quote, paraphrase, or summary。

目标：

- 避免 GraphRAG 把引用当成 Coincides 自己的结论；
- 后续 relation candidate 应更偏 `source_supports`、`claims`、`reports`。

### Image / Diagram / Figure Block

GraphRAG 不能直接稳定处理图像内容。输入应来自 PI-048：

```text
image crop
  -> caption / OCR / diagram description / source region
  -> typed text payload
  -> GraphRAG
```

目标：

- GraphRAG 只消费重建后的 textual representation；
- 原图、crop、bbox、confidence 仍保留在 Coincides。

## GraphRAG Document 粒度建议

建议不要采用单一粒度，而是使用两层输入：

### 1. Block-level documents

每个重要 NoteBlock / SourceRegion / NoteBlockCandidate 一个 document。

适合：

- source provenance；
- block-level relation mapping；
- 精确回写；
-局部知识图谱。

### 2. Section-level documents

由若干相关 NoteBlock 组成 section-level document。

适合：

- GraphRAG entity/relationship extraction；
- community report；
- 跨 block 上下文；
- 报告级总结。

推荐：

```text
block documents
  + section documents
  -> same GraphRAG index
```

但需要在 metadata 中标明：

```text
document_granularity: block | section
contained_block_ids: [...]
```

## metadata 最小字段

GraphRAG document metadata 至少应包含：

```text
coincides_object_type
coincides_object_id
project_id
note_id
block_id
block_role
template_definition_id
template_key
system_type
learning_role
source_anchor_ids
source_scope_ids
concept_ids / concept_tags
domain_block_set_id
canvas_zone
export_intent
visibility
provenance_kind
confidence
created_by
updated_at
```

这些 metadata 不只是检索辅助，也是回写和审计所需的桥。

## GraphRAG prompt tuning 的作用

GraphRAG 支持 manual prompt tuning 和 auto prompt tuning。R15-2 的判断是：

- prompt tuning 可以让 GraphRAG 更懂当前 domain；
- 可以限制 entity types；
- 可以指导 relationship extraction；
- 可以把输出风格调成更适合 Coincides；
- 但不能替代 Coincides 的 template/runtime/role system。

也就是说：

```text
prompt tuning
  = 帮 GraphRAG 更好读 Coincides 输入

template/runtime
  = 决定 Coincides 的真实结构
```

## Adapter 进入 GraphRAG 的两种路线

### Route 1: documents DataFrame

把 NoteBlock 编译成 GraphRAG `documents` DataFrame。

优点：

- 符合官方输入机制；
- 支持 metadata；
- 实现成本低；
- 适合第一版 spike。

缺点：

- GraphRAG 仍然会重新 chunk；
- TextUnit 边界可能不完全等于 NoteBlock 边界；
- 需要用 metadata/prepend 保护 Coincides identity。

### Route 2: BYOG / custom graph

Coincides 先生成自己的 entities / relationships / text_units，再交给 GraphRAG 做 community reports 和 query。

优点：

- 最大限度保留 Coincides truth；
- ObjectRelation 可直接进入 GraphRAG；
- 适合 mature architecture。

缺点：

- 工程复杂；
- 需要更清楚的 Concept/ObjectRelation schema；
- 不适合第一版验证。

建议：

```text
第一版 spike: Route 1
成熟路线: Route 1 + Route 2 hybrid
```

## 对 Coincides 的架构判断

如果采用 Microsoft GraphRAG，Coincides 应该保留：

- NoteBlock runtime；
- TemplateDefinition；
- SourceRegion / SourceAnchor / SourceScope；
- Concept layer；
- ObjectRelation；
- Relation Pack；
- Proposal / Review；
- Canvas / export model。

GraphRAG 只作为：

- typed input consumer；
- relation discovery helper；
- community summarizer；
- query context builder；
- rebuildable index。

## 反哺检查

需要反哺：

- R15-1 对 TextUnit 的判断需要在后续 summary 中补充：GraphRAG TextUnit 可以由 Coincides adapter 编译生成，但不应覆盖 Coincides NoteBlock/SourceRegion 边界。
- PI-048 Outline 后续应增加：PI-048 输出不仅要支持 NoteBlockCandidate，也要支持 GraphRAG Adapter payload。

暂不需要反哺：

- R15-microsoft-graphrag-adoption-research.md 暂不改。它是总问题清单，不需要提前塞入 adapter 细节。
- R4/R5 不需要回改；人工编辑体验仍然独立于 GraphRAG adapter。
