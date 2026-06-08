# R15-1 - Microsoft GraphRAG 框架与输入边界

## 本篇问题

本篇只回答一个核心问题：

> Microsoft GraphRAG 到底吃什么输入、生成什么中间对象、输出什么结构；它能不能直接承担 PI-048 的 source reconstruction？

结论先行：**不能直接承担**。Microsoft GraphRAG 是面向文本语料的 graph/RAG indexing and query framework。它可以成为 Coincides 后续 graph/RAG 层的重要候选，但它不应该替代 SourceRegion、NoteBlockCandidate、OCR/VLM、公式识别、代码结构识别或人类笔记编辑体验。

## 官方框架定位

Microsoft GraphRAG 官方把 indexing package 定义为一个 data pipeline and transformation suite，目标是从 unstructured text 中抽取 meaningful structured data。标准 pipeline 做几件事：

- 从 raw text 抽取 entities、relationships、claims；
- 对 entity graph 做 community detection；
- 生成多层 community summaries / reports；
- 把 text 和 descriptions 写入 vector space；
- 默认把输出存为 Parquet tables，并把 embeddings 写到配置的 vector store。

这说明它的主场不是页面编辑，也不是 PDF 重建，而是：

```text
text corpus
  -> graph-shaped index
  -> community reports
  -> query context
```

官方资料：

- [GraphRAG Overview](https://microsoft.github.io/graphrag/index/overview/)
- [Indexing Dataflow](https://microsoft.github.io/graphrag/index/default_dataflow/)
- [Outputs](https://microsoft.github.io/graphrag/index/outputs/)

## 输入边界

官方输入文档显示，GraphRAG 支持的 out-of-the-box 输入格式主要是：

- plain text；
- CSV；
- JSON。

所有输入都会被加载成一个 `documents` DataFrame，核心 schema 是：

```text
id
text
title
creation_date
metadata
```

其中 `text` 是完整文本。随后 GraphRAG 把 document 切成 smaller `TextUnit`，再基于 TextUnit 做 graph extraction。

它也支持：

- bring-your-own DataFrame；
- custom InputReader；
- 把 metadata prepend 到每个 chunk。

这对 Coincides 很重要：我们可以把自己处理好的 NoteBlock / SourceRegion / NoteBlockCandidate 转成 GraphRAG 能吃的 `documents` DataFrame，而不必被它默认的 txt/csv/json 文件加载方式绑住。

官方资料：

- [Inputs](https://microsoft.github.io/graphrag/index/inputs/)

## 默认知识模型

Microsoft GraphRAG 的默认 knowledge model 包括：

```text
Document
TextUnit
Entity
Relationship
Covariate / Claim
Community
Community Report
```

它们的逻辑关系大致是：

```text
Document
  -> TextUnit
  -> Entity / Relationship / Claim
  -> Community
  -> Community Report
  -> Query Context
```

其中：

- `Document` 是输入文档；
- `TextUnit` 是用于分析的文本块；
- `Entity` 是从 TextUnit 中抽取出来的实体；
- `Relationship` 是 entity-to-entity 关系；
- `Covariate` 是可选 claim；
- `Community` 是 entity graph 的聚类；
- `Community Report` 是对 community 的总结。

这套模型适合做 corpus-level graph index，但它没有原生理解 Coincides 的：

- NoteBlock type；
- TemplateDefinition；
- Role / learning_role；
- SourceRegion bbox；
- Canvas placement；
- ObjectRelation 的低层关系维度；
- 用户可见/隐藏 relation layer；
- `.coincides` 工程文件。

## TextUnit 是关键边界

GraphRAG 的第一阶段是 Compose TextUnits。官方文档说明 TextUnit 是 graph extraction 的分析块，同时也是 knowledge item 回到原始文本的 provenance/breadcrumb。

这给 Coincides 一个重要启发：

```text
GraphRAG TextUnit
  不是 Coincides NoteBlock
  也不是 SourceRegion
  而是 GraphRAG 自己的分析块
```

如果 Coincides 直接把一整篇笔记或一整篇 PDF 当成 text 丢进去，GraphRAG 会按自己的 chunking 规则切块。这会导致几个问题：

- Definition / Formula / Proof / Example 的边界可能被切断；
- 同一 NoteBlock 可能被拆到多个 TextUnit；
- 多个 NoteBlock 可能被合并到同一个 TextUnit；
- SourceAnchor / page label / bbox / crop 可能丢失；
- Canvas formal/scratch/private/export intent 无法表达；
- 关系抽取结果难以回写到具体 NoteBlock。

所以 Coincides 不能把 GraphRAG 的 TextUnit 当成唯一切分层。更合理的是：

```text
Coincides SourceRegion / NoteBlockCandidate / NoteBlock
  -> GraphRAG adapter
  -> GraphRAG-friendly document/text unit input
```

## 输出边界

官方 Outputs 文档显示，GraphRAG 的默认输出包括：

- `documents`
- `text_units`
- `entities`
- `relationships`
- `covariates`
- `communities`
- `community_reports`

其中 `relationships` 是所有 entity-to-entity relationships，也是 graph edge list。字段包括：

```text
source
target
description
weight
combined_degree
text_unit_ids
```

这和 Coincides 的 `ObjectRelation` 不同。GraphRAG 的 `source` / `target` 是两个 entity 名称，不是 source material，也不必然表示“从 A 推导到 B”。`description` 是 LLM-derived relationship description。它服务于 GraphRAG 的索引和检索，不是 Coincides 的 confirmed semantic edge。

因此：

```text
GraphRAG Relationship
  = index edge / inferred relation / query evidence

Coincides ObjectRelation
  = product truth / semantic relation / user-reviewable relation
```

## Query 边界

GraphRAG Query Engine 运行在已经完成的 indexes 上。官方 query 类型包括：

- Local Search；
- Global Search；
- DRIFT Search；
- Basic vector RAG；
- Question Generation。

其中：

- Local Search 把 knowledge graph 的 structured data 和 raw document text chunks 合在一起；
- Global Search 使用 community reports 做 map-reduce；
- DRIFT 在 local/global 之间加入 community insight；
- Basic Search 是基础向量检索对照。

这说明 GraphRAG 更像一个 query/index layer，而不是 authoring layer。它可以帮 Coincides 做：

- 跨笔记主题总结；
- 局部 entity-centered search；
- community-level report；
- relation discovery；
- question generation。

但它不能帮 Coincides 直接解决：

- 空白文档双击输入；
- block resize / reflow；
- A4 / open canvas；
- SourceRegion bbox；
- 手写公式识别；
- block layout；
- relation inspector；
- PDF export intent。

官方资料：

- [Query Overview](https://microsoft.github.io/graphrag/query/overview/)
- [Local Search](https://microsoft.github.io/graphrag/query/local_search/)

## 对 PI-048 的直接影响

R15-1 对 PI-048 的结论很明确：

**PI-048 不能以 Microsoft GraphRAG 为 source reconstruction 主工具。**

PI-048 仍然必须独立解决：

- PDF 类型识别；
- 扫描 PDF / handwritten PDF OCR；
- formula / LaTeX reconstruction；
- code block detection；
- table and figure extraction；
- layout region / bbox；
- page label；
- crop；
- source provenance；
- region-level confidence；
- `SourceRegion -> NoteBlockCandidate`。

GraphRAG 可以接在 PI-048 后面：

```text
raw source
  -> PI-048 source reconstruction
  -> SourceRegion / NoteBlockCandidate
  -> typed GraphRAG input
  -> entities / relationships / community reports
```

而不是：

```text
raw source
  -> Microsoft GraphRAG
  -> finished notes
```

## 当前采用判断

Microsoft GraphRAG 适合进入 Coincides 的位置：

```text
AI-readable graph/RAG sidecar
```

不适合的位置：

```text
editor runtime
source reconstruction runtime
NoteBlock truth store
ObjectRelation truth store
layout engine
project export format
```

更具体地说，它适合作为：

- 可重建 graph index；
- relation discovery assistant；
- community/report summarization engine；
- cross-note/cross-source retrieval layer；
- downstream AI context builder。

它不应该成为：

- Coincides 主数据库；
- NoteBlock 定义者；
- TemplateDefinition 选择器；
- confirmed ObjectRelation 创建者；
- source provenance 的唯一来源。

## 对后续 R15 报告的要求

R15-2 必须研究：

- typed NoteBlock 如何进入 GraphRAG；
- 是否应该把每个 NoteBlock 转成独立 document；
- 是否应该把多个 NoteBlock 合成 GraphRAG document；
- metadata 是否足够保留 template/source/relation/context。

R15-3 必须研究：

- GraphRAG Relationship 是否只能作为 RelationCandidate；
- Coincides Relation Pack 如何约束 GraphRAG 关系抽取；
- accepted ObjectRelation 是否可以反向进入 GraphRAG BYOG。

R15-4 必须研究：

- 非文本材料为什么必须先经过 SourceRegion；
- GraphRAG custom InputReader 是否足够，还是仍然需要 PI-048 toolchain。

R15-5 必须研究：

- BYOG 是否允许 Coincides confirmed graph 进入 GraphRAG；
- GraphRAG 是 rebuildable index 还是 durable truth。

R15-6 必须研究：

- 第一版 spike 为什么应该先用 PI-046 纯文本报告；
- 如何验证 GraphRAG 对 Coincides 的真实收益。

## 反哺检查

需要反哺：

- `R15-microsoft-graphrag-adoption-research.md` 已经说 GraphRAG 更适合接在 PI-048 后面；R15-1 强化了这个判断，但不需要改写原文。
- `PI-048 Research/Outline.md` 后续应在正式启动 PI-048 时补一句：Microsoft GraphRAG 不替代 source reconstruction，PI-048 输出应优先形成 SourceRegion / NoteBlockCandidate，再考虑 GraphRAG adapter。

暂不需要反哺：

- R0-R14 正文不需要回改，因为 R15 是新增补充调研。
- Product Improvement Issue Register 暂不需要新增条目；R15 全部完成后再统一决定是否补入 GraphRAG-specific PI。
