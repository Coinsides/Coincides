# R15-5 - BYOG 与 Coincides Graph Index 架构

## 本篇问题

本篇回答：

> Microsoft GraphRAG 是否应该成为 Coincides 的主图结构？还是应该作为可重建的 graph/RAG index？Coincides confirmed NoteBlock / Concept / ObjectRelation 能否通过 BYOG 进入 GraphRAG？

结论先行：**Microsoft GraphRAG 不应成为 Coincides 主权数据结构；它更适合作为可重建的 graph/RAG index 和 query context layer。** 它可以通过 Bring Your Own Graph 消费 Coincides 已确认的 graph，也可以从 typed NoteBlock payload 中发现候选关系，但不能取代 Coincides 的 NoteBlock、Concept、ObjectRelation、Source provenance。

## BYOG 的官方意义

Microsoft GraphRAG 的 Bring Your Own Graph 文档说明，用户可以带入已有 graph。最小表包括：

```text
entities.parquet
relationships.parquet
text_units.parquet
```

官方描述的 BYOG 路线假设：

- text chunking 已经发生；
- entity extraction 已经发生；
- relationship extraction 已经发生。

然后 GraphRAG 可以运行较少的 workflow，例如：

```text
create_communities
create_community_reports
generate_text_embeddings
```

这正好符合 Coincides 的需要：我们不必把 GraphRAG 当作唯一关系抽取器，而是可以让 Coincides confirmed graph 进入 GraphRAG 做社区摘要和查询。

官方资料：

- [Bring Your Own Graph](https://microsoft.github.io/graphrag/index/byog/)

## Coincides 的主权层

Coincides 必须继续拥有：

```text
Project / Course
Note
NoteBlock
SourceRegion
SourceAnchor
SourceScope
Concept
ObjectRelation
RelationPack
TemplateDefinition
DomainBlockSet
CanvasNode / CanvasFrame / CanvasEdge
Proposal / OperationBatch
```

这些对象不仅用于检索，也用于：

- 用户编辑；
- source grounding；
- proposal/review；
- PDF/project export；
- relation inspection；
- AI note assembly；
- compatibility/recovery；
- future graph-native migration。

GraphRAG 不能替代这些对象，因为 GraphRAG 的默认输出是 query/index artifacts，不是产品运行时对象。

## GraphRAG 作为可重建 index

推荐原则：

```text
Coincides owns truth.
GraphRAG owns rebuildable index.
```

这意味着：

- Coincides 数据库中保存 confirmed NoteBlock / Concept / ObjectRelation；
- GraphRAG index 可以根据这些数据重建；
- GraphRAG 输出可以被丢弃、刷新、重跑；
- GraphRAG suggestion 不能直接变成 truth；
- 用户导出的 `.coincides` 文件不依赖 GraphRAG index；
- 如果 GraphRAG 重建失败，笔记仍可打开、编辑、导出。

## 推荐架构

```text
Coincides Runtime Truth
  NoteBlock
  SourceRegion
  Concept
  ObjectRelation
  TemplateDefinition
  DomainBlockSet
        |
        v
GraphRAG Adapter
        |
        v
GraphRAG Index Sidecar
  documents / text_units
  entities
  relationships
  communities
  community_reports
  embeddings
        |
        v
Query / Discovery / Suggestions
        |
        v
RelationCandidate / ConceptCandidate / ReportCandidate
        |
        v
Proposal / Review
        |
        v
Coincides Runtime Truth
```

## 两种输入路线

### Route A: Typed documents DataFrame

由 Coincides Adapter 生成 GraphRAG `documents` DataFrame。

适合第一版：

- 实现轻；
- 使用官方输入路线；
- 能保留 metadata；
- 能验证 GraphRAG 对 typed NoteBlock 的帮助。

风险：

- GraphRAG 仍会按自己的 TextUnit 切分；
- entity/relationship extraction 仍可能偏泛用；
- 需要 prompt tuning 和 relation pack mapping。

### Route B: Bring Your Own Graph

Coincides 生成：

```text
entities.parquet
relationships.parquet
text_units.parquet
```

适合成熟路线：

- 可以把 confirmed Concept / ObjectRelation 送入 GraphRAG；
- 更好保护 Coincides truth；
- GraphRAG 专注 community/report/query；
- 更接近未来 v3 graph-native 迁移。

风险：

- 需要 Coincides 先有稳定 Concept/ObjectRelation；
- 需要自己定义 entity canonicalization；
- 需要权重、text_unit_ids、description 等字段映射；
- 需要导出/更新策略。

## Hybrid 路线

最现实的是混合：

```text
Confirmed Coincides graph
  -> BYOG

Typed NoteBlock/SourceRegion payload
  -> GraphRAG default extraction

GraphRAG extracted relationships
  -> RelationCandidate

Accepted candidates
  -> ObjectRelation
  -> next BYOG run
```

这能形成闭环：

1. Coincides 给 GraphRAG 一个已确认基础图；
2. GraphRAG 发现候选关系；
3. Coincides review；
4. accepted relation 回到 Coincides truth；
5. 下一轮 GraphRAG 使用更强的 confirmed graph。

## 和 SQLite / vector / GraphDB 的关系

R15-5 不建议立即把 Microsoft GraphRAG 当成 Neo4j 替代品。

更合理的分层：

```text
SQLite / relational store
  - product truth
  - notes, templates, packages, proposals, recovery

Object/file storage
  - source snapshots
  - crops
  - exported bundles

Vector store
  - NoteBlock / SourceRegion / community report embeddings

GraphRAG index
  - rebuildable graph/RAG artifact
  - entities, relationships, communities, reports

Future GraphDB
  - optional v3 graph-native truth or graph-serving layer
```

如果未来 v3 使用 Neo4j/Kuzu：

- Coincides ObjectRelation / Concept / NoteBlock 可能迁移为 graph-native truth；
- Microsoft GraphRAG 可以消费 graph-native exports；
- GraphRAG 本身仍不一定是 graph database；
- GraphRAG 更像 graph-powered retrieval/report engine。

## update / incremental 问题

Coincides 是用户持续编辑的笔记软件，GraphRAG 更适合 index run。需要研究：

- 用户改一个 NoteBlock 后是否重建整个 index？
- 是否只重建 affected project/note/section？
- GraphRAG 输出如何标记 stale？
- RelationCandidate 是否绑定到 GraphRAG run id？
- index 失败时是否保持旧 index？
- `.coincides` 导出是否包含 GraphRAG index？

建议：

```text
GraphRAG index can be stale.
Coincides truth cannot be stale.
```

所以每个 GraphRAG 结果都应带：

```text
graph_index_run_id
source_snapshot_hash
note_block_version
generated_at
staleness_status
```

## graph truth 与 suggestion 的写回规则

GraphRAG 结果写回 Coincides 时必须经过不同通道：

### 可以直接写缓存/index

- community report text；
- entity summaries；
- retrieval traces；
- search context logs；
- index metrics。

### 必须进入 proposal

- new Concept；
- merged Concept；
- new ObjectRelation；
- relation pack suggestion；
- source-backed claim；
- note/report generation plan。

### 不应写回 truth

- raw GraphRAG relationship；
- low-confidence entity；
- community title；
- query answer；
- LLM-generated explanation without source evidence。

## 对 `.coincides` 工程文件的影响

`.coincides` 工程文件应该包含：

- NoteBlocks；
- SourceRegions / anchors / scopes；
- Concepts；
- ObjectRelations；
- RelationPacks；
- Templates；
- Canvas/projection；
- proposal/recovery history。

不应强制包含：

- GraphRAG index；
- embeddings；
- community reports；
- temporary query context；
- GraphRAG cache。

可选包含：

- GraphRAG index summary；
- last index metadata；
- graph adoption notes；
- index rebuild recipe。

原因：GraphRAG index 应该可重建，不能成为工程文件不可缺少的一部分。

## 反哺检查

需要反哺：

- R15-3 的 `GraphRAG Relationship -> RelationCandidate -> ObjectRelation` 路线被 BYOG 闭环强化。R15 summary 必须把它写成主架构。
- R15-2 的 Route 1 / Route 2 判断被 R15-5 明确为：第一版用 typed documents DataFrame，成熟版用 BYOG hybrid。
- PI-048 Outline 后续应补：SourceRegion pipeline 的输出不仅支持 NoteBlockCandidate，也应支持可导出的 text_units / entity candidates / relation candidates。

暂不需要反哺：

- R15-1 不需要改，因为它已经把 GraphRAG 定义成 index/query layer。
- Product Improvement Issue Register 暂不改，等 R15-summary 统一补 GraphRAG adoption issue。
