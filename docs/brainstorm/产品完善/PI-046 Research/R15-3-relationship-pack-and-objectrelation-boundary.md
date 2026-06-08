# R15-3 - Relationship Pack 与 ObjectRelation 主权边界

## 本篇问题

本篇回答：

> 如果采用 Microsoft GraphRAG，我们是否还需要 Coincides 自己的边关系？GraphRAG 的 relationship 能不能直接替代 ObjectRelation？不同信息处理任务是否需要不同 relationship group？

结论先行：**必须保留 Coincides 自己的 ObjectRelation 系统。** Microsoft GraphRAG 的 relationship 可以作为 relation discovery 和 retrieval evidence，但不能直接成为 Coincides 的 confirmed semantic relation。

## 前置：register 已经给出的关系模型

Product Improvement Issue Register 的 PI-029 / PI-030 / PI-031 已经明确：

- CanvasEdge 是视觉线 / 交互对象；
- ObjectRelation 是系统可读的语义边；
- RelationLayer 是关系显示与用途组织层；
- 不是每条视觉线都是语义关系；
- 不是每条语义关系都应该显示成视觉线；
- 语义关系应作为独立记录保存；
- 多个语义关系可以被一个 visual bundle 表示；
- AI 需要 queryable subgraph，而不是读取所有 canvas lines；
- local graph view 应优先 deterministic，再由 AI 解释或建议。

PI-029 还记录了五层底层关系判断：

```text
1. 是否有关联
2. 是无条件关联，还是有条件关联
3. 是 simple pair，还是 group/composition relation
4. 是 directed / bidirectional / undirected
5. 上层语义是什么
```

这套关系模型比 Microsoft GraphRAG 默认 relationship 更细。

## GraphRAG Relationship 是什么

官方 Outputs 文档说明，GraphRAG 的 `relationships` 是 entity-to-entity relationships，也是 graph edge list。字段包括：

```text
source
target
description
weight
combined_degree
text_unit_ids
```

在 default dataflow 中，GraphRAG 会在每个 TextUnit 上抽取 subgraph，关系包含 source、target、description；同 source/target 的关系会合并 description，再由 LLM summarize。

这意味着：

- `source` / `target` 是 entity 名称，不是 Coincides 的 source material；
- `source` / `target` 不必然表示推导方向；
- `description` 是 LLM 对关系的文字描述；
- `weight` 是关系强度或合并后的权重；
- `text_unit_ids` 是 provenance 线索，但粒度是 GraphRAG TextUnit。

这是一种泛用 graph index edge，不是 Coincides 的 domain-specific relation truth。

官方资料：

- [Outputs - relationships](https://microsoft.github.io/graphrag/index/outputs/)
- [Indexing Dataflow - Entity & Relationship Extraction](https://microsoft.github.io/graphrag/index/default_dataflow/)

## 为什么不能让 GraphRAG 接管 ObjectRelation

如果让 GraphRAG relationship 直接替代 ObjectRelation，会有严重后果：

### 1. 用户意图会丢失

用户手动建立的关系可能是：

- “我不理解这个 theorem”；
- “这是我的考试重点”；
- “这个定义和我的个人目标相关”；
- “这个例子提醒我某个旧错误”。

GraphRAG 很难从文本语料中稳定推断这些关系。它只能推断 corpus 中的 entity-to-entity relation。

### 2. 学习关系会被压扁

数学学习里常见关系包括：

- prerequisite；
- derives_to；
- equivalent_to；
- example_of；
- proof_of；
- uses_formula；
- counterexample_to；
- condition_required。

GraphRAG 默认 relationship 只有 `description`，没有 Coincides 需要的 condition/direction/composition/visibility/provenance 维度。

### 3. 条件关系和组合关系无法稳定表达

例如：

```text
A + B -> C
```

这不是简单 A -> C，也不是 B -> C。它需要 group relation / prerequisite set / hyperedge-like structure。

GraphRAG 默认 edge list 更适合 pairwise entity relations。Coincides 的 `ObjectRelation` 需要支持：

- all_of；
- any_of；
- sequence；
- threshold；
- group_relation；
- relation group。

### 4. 关系状态会不稳定

GraphRAG 是可重建 index。重跑 prompt、模型、chunking、source reconstruction，都可能改变 relationship extraction。

正式笔记里的关系不能每次重建索引就变化。否则：

- 工程文件不稳定；
- 用户手动关系不可靠；
- PDF/报告导出结构不可靠；
- AI 下次读同一份笔记会得到不同图。

### 5. 视觉关系和语义关系会混乱

Coincides 需要：

```text
CanvasEdge
  = 视觉连接

ObjectRelation
  = 语义关系

GraphRAG Relationship
  = 索引关系
```

如果 GraphRAG 接管关系，CanvasEdge、ObjectRelation、RelationLayer 会被混成一个东西。

## 正确分层

推荐架构：

```text
GraphRAG Relationship
  -> RelationCandidate
  -> Proposal / Review
  -> ObjectRelation
```

也就是说：

- GraphRAG 可以提出候选关系；
- Coincides 根据 Relation Pack 和规则做 mapping；
- 不能确定的关系保持 unresolved candidate；
- 用户或 AI review 接受后，才成为 ObjectRelation；
- ObjectRelation 再可反向进入 GraphRAG BYOG。

## RelationCandidate 最小结构

GraphRAG relationship 进入 Coincides 时，应先变成：

```text
RelationCandidate
  id
  source_system: microsoft_graphrag
  source_run_id
  source_text_unit_ids
  candidate_source_entity
  candidate_target_entity
  candidate_source_object_id nullable
  candidate_target_object_id nullable
  proposed_relation_family
  proposed_domain_relation_type
  description
  evidence_text
  confidence
  mapping_status: unresolved | mapped | blocked | accepted | rejected
  warnings
  metadata
```

这个结构不是正式 truth，只是 proposal input。

## Relation Pack / Relationship Group

用户说得很对：不同信息处理任务需要不同关系组。

GraphRAG 是泛用关系发现器；Coincides 需要 domain-specific relation packs。

### 底层通用维度

所有 pack 共享低层关系维度：

```text
relation_existence
condition_kind
composition_kind
directionality
semantic_family
visibility
confidence/provenance
```

### learning.math pack

适合数学学习：

```text
defines
uses_definition
uses_formula
derives_to
equivalent_to
proof_of
example_of
counterexample_to
prerequisite_for
exercise_requires
answers
```

### research.intelligence pack

适合情报/调研：

```text
claims
reports
supports
contradicts
same_event_as
actor_involved
causes
follows
source_reports
uncertain_about
confidence_changed_by
```

### code.analysis pack

适合代码：

```text
calls
implements
imports
depends_on
mutates
throws
tests
configures
overrides
uses_api
```

### source.evidence pack

适合来源与证据：

```text
source_supports
source_contradicts
source_mentions
quoted_from
paraphrased_from
derived_from
needs_verification
```

### writing.report pack

适合报告组织：

```text
introduces
expands
summarizes
contrasts
supports_section
concludes
needs_followup
```

## GraphRAG 如何使用 Relation Pack

GraphRAG 本身不会天然知道 Coincides 的 relation pack。我们需要两层约束：

### 1. 输入侧约束

GraphRAG Adapter 把当前 project/domain/relation pack 写入 metadata 或 prompt context：

```text
active_relation_pack: learning.math
allowed_relation_families:
  - prerequisite_for
  - derives_to
  - example_of
  - proof_of
```

### 2. 输出侧 mapping

GraphRAG 输出 relationship 后，Coincides mapper 再判断：

```text
GraphRAG relationship description
  -> low-level relation dimensions
  -> relation pack type
  -> RelationCandidate
```

如果无法映射：

```text
status: unresolved
```

而不是强行创建 ObjectRelation。

## BYOG 的意义

Microsoft GraphRAG 支持 Bring Your Own Graph。官方说明，用户可以提供：

- `entities.parquet`
- `relationships.parquet`
- `text_units.parquet`

并且假设 text chunking、entity extraction、relationship extraction 已经发生。

这对 Coincides 非常重要。成熟路线不是只让 GraphRAG 从文本中自动猜关系，而是：

```text
Coincides confirmed Concept / ObjectRelation
  -> BYOG entities / relationships
  -> GraphRAG community reports / search
```

这表示 Coincides 可以把自己的 confirmed graph 喂给 GraphRAG，而不是让 GraphRAG 反向统治 Coincides 的 graph truth。

官方资料：

- [Bring Your Own Graph](https://microsoft.github.io/graphrag/index/byog/)

## 对前期笔记软件的影响

这个判断直接影响“前期如何做成熟笔记软件”：

1. 即使没有 GraphRAG，也要做轻量 ObjectRelation。
2. 视觉线可以晚一点打磨，但语义关系不能完全外包。
3. 人工笔记阶段就应该允许用户建立关系。
4. AI note assembly 阶段可以生成 relation suggestions。
5. GraphRAG 阶段可以发现更多 relation candidates。
6. 最终 confirmed relation 必须回到 Coincides。

所以前期 minimum product 不需要复杂图数据库，但需要：

```text
ObjectRelation seed
RelationCandidate proposal
RelationPack definition
RelationLayer / visibility
```

## R15-3 结论

Microsoft GraphRAG 的关系层适合做：

- 自动发现候选关系；
- 跨材料 entity graph；
- community summary；
- query context；
- relation evidence。

Coincides ObjectRelation 适合做：

- 用户确认的语义关系；
- 学习顺序；
- 推导关系；
- 证据关系；
- 条件/组合关系；
- 可导出工程文件中的稳定结构；
- AI 可稳定读取的 note graph。

最终原则：

```text
GraphRAG discovers.
Coincides decides.
```

或者更工程化地说：

```text
GraphRAG Relationship
  = index / suggestion

Coincides ObjectRelation
  = product truth
```

## 反哺检查

需要反哺：

- R15-2 后续 summary 中需要补一句：typed NoteBlock adapter 不仅要传 block metadata，也要传 active relation pack / allowed relation families。
- PI-048 Outline 后续可补：SourceRegion / NoteBlockCandidate 进入 GraphRAG 时，应附带 relation extraction hints，但不能直接产生 confirmed ObjectRelation。
- Product Improvement Issue Register 的 PI-029/030/031 已经足够支撑本结论，暂时不需要回改。

暂不需要反哺：

- R15-1 不需要改。R15-1 已经把 GraphRAG Relationship 和 ObjectRelation 区分开。
- R4/R5 不需要改。人工编辑体验只需保留关系入口，不需要先实现完整 GraphRAG。
