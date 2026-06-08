# R12 - Graph Model Before Graph Database

## 本阶段目标

R12 回答一个容易被过早技术化的问题：

```text
Coincides 是否需要图数据库？
```

R12 的结论不是直接选 Neo4j，也不是继续回避图结构，而是先定义：

```text
什么数据天然是 graph-shaped？
什么关系应该成为 semantic edge？
什么只是 canvas/editor projection？
什么只是 operation/provenance？
```

只有先把图模型想清楚，后续才有资格判断 v2.x 继续用 SQLite + relation tables，还是在 v3.x 进入 Neo4j / graph-native 重构。

## 证据来源

本阶段引用：

- R3：canonical ownership matrix。
- R6：formal/scratch/export/AI visibility/page label 边界。
- R10：Edgeless-as-page 只能做 projection surface。
- R11：BlockSuite adapter id 不能替代 Coincides semantic truth。
- 当前 Coincides 代码：
  - `source_anchors`
  - `source_anchor_links`
  - `source_scopes`
  - `canvas_nodes`
  - `canvas_edges`
  - `object_relations`
  - `relation_layers`
  - `template_definitions`
  - `domain_block_sets`
  - `domain_object_classifications`
  - migration / import / refinement records。

证据等级：

- A 级代码证据：当前 v2.x 已有表、服务、路由和对象分层。
- B 级结构推断：graph node/edge/projection/provenance 分类。
- D 级产品需求证据：用户希望局部知识图谱、跨笔记检索、AI 精准读取、source-grounded note assembly。

## 一句话结论

**Coincides 现在不应该直接跳到图数据库，但必须立即按 graph-shaped data 继续建模。**

v2.x 的合理策略是：

```text
SQLite remains source of truth.
Relation tables preserve graph-shaped evidence.
ObjectRelation / Concept / Source / Template / Domain mapping keeps graph-native migration possible.
```

v3.x 再根据 v2.x 收集到的证据决定 Neo4j / graph-native 主数据库如何重建。

## 1. Graph-shaped data 不等于 GraphDB

Graph-shaped data 指的是数据天然以“节点 + 边 + 路径 + 局部子图”的方式被理解。

例如：

```text
NoteBlock A
  -- derives_to -->
NoteBlock B

NoteBlock C
  -- example_of -->
NoteBlock B

NoteBlock B
  -- supported_by -->
SourceScope S
```

这些关系即使存储在 SQLite 表里，本质上也已经是图结构。

GraphDB 是一种更适合查询和遍历这种结构的数据库实现。它不是图模型本身。

因此 R12 的原则是：

```text
先把图模型做对。
再决定是否换图数据库。
```

## 2. Coincides 对象分类

### Graph node candidate

这些对象未来很可能成为 graph node：

- NoteBlock
- Note
- Project / Course
- SourceSnapshot
- SourceAnchor
- SourceScope
- EvidenceSet
- TemplateDefinition
- CompositionTemplate
- DomainBlockSet
- PackageManifest
- Concept
- CompositionInstance

它们的特点是：

- 有稳定身份；
- 可以被多个对象引用；
- 对 AI 检索有意义；
- 可以作为局部知识图谱的起点；
- 可以被 source / relation / template / domain / package 连接。

### Graph edge candidate

这些对象或关系未来很可能成为 graph edge：

- ObjectRelation
- NoteBlock -> SourceAnchor / SourceScope
- NoteBlock -> TemplateDefinition
- NoteBlock -> DomainBlockSet / Concept
- DomainBlockSet -> TemplateDefinition
- DomainBlockSet -> CompositionTemplate
- PackageManifest -> DomainBlockSet
- Template migration alias/successor mapping
- Domain refinement alias/successor/split/merge/fork mapping

### Projection object

这些不应默认成为知识图谱真相：

- CanvasNode
- CanvasFrame
- CanvasEdge
- BlockSuite connector
- BlockSuite frame
- BlockSuite note view id
- viewport state
- layout preview overlay

它们可以影响用户体验和 AI context，但不是知识 truth。

### Capability node

这些对象不一定是知识内容，但对 AI 工作流和模板选择非常重要：

- TemplateDefinition
- CompositionTemplate
- DomainBlockSet
- PackageManifest
- future RoleDefinition
- future VisualStyleDefinition

它们更像能力节点，决定 AI 如何生成、拆分、显示和组织 NoteBlock。

### Operation / provenance node

这些对象更像历史或恢复证据：

- Proposal
- OperationBatch
- TemplateMigrationProposal / Record
- DomainRefinementProposal / Record
- PackageExport / PackageImport
- Import record items

它们不一定进入知识图谱主图，但可能进入 provenance graph。

## 3. ObjectRelation 的底层关系维度

此前我们讨论过一个重要判断：不要直接从 `read_before`、`derives_to`、`example_of` 这些上层语义开始定义关系。

更稳的底层关系应该拆成五层：

```text
relation_existence:
  unrelated / related

condition_kind:
  unconditional / conditional

composition_kind:
  simple_pair / group_relation / all_of / any_of / sequence / threshold

directionality:
  directed / bidirectional / undirected

semantic_family / domain_relation_type:
  read_before / derives_to / example_of / supports / contradicts / etc.
```

换成人话是：

```text
它们有没有关系？
这个关系需不需要条件？
这个关系是不是多个对象共同成立？
这个关系有没有方向？
这个关系在学习语境或领域语境里叫什么？
```

这比只用“箭头从 A 到 B”稳定得多。

原因是，同一对对象之间可能同时存在多种关系：

```text
A 与 B 可以互相解释。
A 又可以在学习顺序上早于 B。
A 也可能与 B 一起构成理解 C 的前置条件。
```

如果把这些关系都画成重叠线，视觉上会乱；但在数据上，可以是一组 semantic relation records，必要时再由视图选择如何显示。

## 4. CanvasEdge 与 ObjectRelation 必须继续分离

CanvasEdge / connector 负责视觉连接。

ObjectRelation 负责语义连接。

它们的关系应该是：

```text
CanvasEdge
  connection_state:
    incomplete
    visual_only
    relation_suggested
    relation_backed
    stale_binding
    broken_relation

ObjectRelation
  semantic relation candidate
  future graph edge candidate
```

在 R12 的图模型里：

- incomplete edge 不进入 semantic graph；
- visual_only edge 不进入 semantic graph；
- relation_suggested 可以进入 proposal / review layer；
- relation_backed 才是 graph edge candidate；
- stale/broken relation 需要保留 recovery/provenance，而不是静默删除。

这让用户可以画草稿线，也让系统避免“画线污染知识图谱”。

## 5. Concept layer 是跨笔记、跨 project/course 的关键补丁

单靠 NoteBlock -> Note -> Course 的层级，无法很好解决跨笔记检索。

例如用户问：

```text
找出所有和 Green theorem 有关的内容。
```

仅靠 embedding 可能会找出：

- green 颜色；
- theorem 一般定理；
- Green theorem；
- 相关但不精准的数学文本。

Concept layer 可以把检索维度补上：

```text
NoteBlock
  -> Concept: green_theorem
  -> Concept: vector_calculus
  -> Concept: double_integral
  -> Concept: applied_math
```

Concept 不是简单 tag。它应该是可演化、多维度、可 refinement 的 classification layer：

- 同一个 NoteBlock 可以有多个 Concept；
- Concept 可以属于不同维度；
- Concept 可以被细化、合并、别名映射；
- Concept 新增后，可以通过 proposal 回填旧 NoteBlock；
- Concept 不应轻易删除，只应 deprecated / merged / refined。

R12 判断：Concept 是未来 GraphRAG 的关键节点候选。

## 6. Hybrid RAG 的合理顺序

Coincides 未来不应该只靠普通 RAG，也不应该只靠图遍历。

更合理的是 hybrid retrieval：

```text
1. Embedding / lexical search
   大范围召回语义相近内容。

2. Concept filter / expansion
   用概念层缩小或扩展范围。

3. Role / Template filter
   根据用户要找 definition、proof、example、exercise、source quote 等进一步筛选。

4. ObjectRelation traversal
   根据 read_before、derives_to、example_of、supports 等关系找上下游或邻接子图。

5. Source provenance check
   检查 source anchor / source scope / evidence trust。

6. AI reasoning
   在已缩小、已带来源、已带关系路径的材料上回答或生成 proposal。
```

这解决了用户之前提出的场景：

```text
我想知道学 Green theorem 之前要学什么。
```

这类问题不应该只靠 embedding；它天然需要 relation traversal。

但另一个问题：

```text
有哪些笔记提到 Green theorem？
```

则可以先 embedding + concept，再 relation 扩展。

## 7. SQLite + relation tables 现在能覆盖什么

v2.x 继续用 SQLite + relation table 可以覆盖：

- NoteBlock 和 source grounding；
- CanvasNode / CanvasEdge / ObjectRelation 基础关系；
- SourceAnchor / SourceScope jump-back；
- Template / Domain / Package capability layer；
- proposal-first migration / refinement / import-export；
- 局部知识图谱；
- 单篇 Note 范围内的 relation traversal；
- 小规模跨 project/course 检索；
- Concept classification seed；
- Graph-native migration evidence collection。

SQLite 阶段的优势：

- 实现成本低；
- 数据结构可控；
- 适合继续试错；
- 迁移和恢复更简单；
- 不必在产品方向未定时大规模重构。

## 8. GraphDB 什么时候才必要

GraphDB 在以下场景变得必要：

1. 跨 project/course 的 relation traversal 很频繁；
2. Concept / Domain / Template / Source / NoteBlock 之间关系数量快速增长；
3. 用户需要复杂路径查询，例如：
   - 从某个 concept 出发，找三跳以内所有相关 theorem 和 exercise；
   - 找所有由某个 source 支撑但被另一个 source 反驳的 NoteBlock；
   - 找一个 domain refinement 后受影响的所有 package/template/composition/note；
4. GraphRAG 成为核心能力；
5. 外部 agent 需要稳定查询局部子图；
6. SQLite relation tables 开始出现大量手写 JOIN 和递归查询；
7. performance / maintainability 证明 SQLite 已经不是合适抽象。

在这些条件出现前，直接上 GraphDB 会让工程复杂度提前爆炸。

## 9. v2.x 应该收集的 graph-native migration evidence

v2.x 每个版本都应该继续记录：

- 哪些对象被频繁当作节点使用；
- 哪些关系被频繁当作边使用；
- 哪些 CanvasEdge 最终没有成为 ObjectRelation；
- 哪些 Concept / Domain / Template 分类最影响检索质量；
- 哪些 proposal / migration record 只适合留在 SQL/history；
- 哪些查询已经需要多跳 traversal；
- 哪些 relation type 太粗或太细；
- 哪些 source provenance 在 AI 回答中最有价值；
- 哪些 editor/runtime id 只应作为 adapter，不应进入 graph truth。

这些证据会决定 v3.x 的 Neo4j 迁移，而不是现在凭直觉重写。

## 10. R12 解决的问题

R12 解决了：

1. Graph model 与 GraphDB 是两件事。
2. Coincides 现在应先做 graph-shaped data，而不是直接换数据库。
3. NoteBlock、SourceAnchor、SourceScope、TemplateDefinition、DomainBlockSet、Concept 等是 node candidate。
4. ObjectRelation、source link、template/domain membership、migration mapping 等是 edge candidate。
5. CanvasNode/CanvasFrame/CanvasEdge/BlockSuite connector 是 projection，不是默认 graph truth。
6. Concept layer 对跨笔记检索和 GraphRAG 非常关键。
7. Hybrid RAG 应结合 embedding、concept、role/template、relation traversal、source provenance。

## 11. 暴露的风险

1. **Concept 爆炸风险**
   如果 Concept 可以无限增长且没有 refinement proposal，会变成另一套混乱 tag 系统。

2. **Relation type 爆炸风险**
   不同领域可能有大量 relation type。必须用底层维度 + 上层语义分层，否则会失控。

3. **Projection 污染 graph truth 风险**
   如果把 CanvasEdge / connector 直接当 graph edge，知识图谱会被草稿线污染。

4. **过早 GraphDB 风险**
   产品和 editor 路线还没定，过早迁移 Neo4j 会带来巨大维护成本。

5. **RAG 过度简化风险**
   只靠 embedding 无法回答“前置知识是什么”“有哪些推导路径”“source 支撑在哪里”这类问题。

## 12. 对后续阶段的影响

- R13 必须把“SQLite + graph-shaped relation tables”作为当前路线的可行中间态评分。
- R13 必须把“Neo4j / graph-native 重构”放到后续阶段，而不是当前 editor foundation 的前置条件。
- R13 必须检查各架构路线是否能保护 NoteBlock / ObjectRelation / Concept / Source provenance。
- R14 必须把 Concept layer、ObjectRelation 底层关系维度、Hybrid RAG、Graph-native evidence collection 写入 roadmap rewrite。
- PI-048 source reconstruction 调研必须把 `SourceRegion -> NoteBlockCandidate -> SourceAnchor/Scope -> Concept/Role/Template` 作为 future input path。

## 13. 反补前序报告

R12 不修改 R0-R11 正文。

但 R12 强化了 R3/R11：

- sidecar 不只是为了接 BlockSuite，也是未来 graph-shaped data 的保护层；
- BlockSuite editor tree 不应成为 graph truth；
- Coincides 的 graph model 应从 NoteBlock、ObjectRelation、Source、Concept、Template、Domain、Proposal provenance 这些对象中生长出来。

R12 也强化了 R6：

- formal/scratch/private/export 不是纯 UI 状态；
- 它们会影响 AI 是否读取、GraphRAG 是否纳入、PDF 是否导出、source 是否被信任。

## R12 结论

Coincides 的下一步不应该是“立刻上图数据库”，而应该是：

```text
继续用 SQLite 作为 v2.x source of truth。
把 NoteBlock / Source / ObjectRelation / Concept / Template / Domain 做成 graph-shaped data。
严格区分 projection edge 和 semantic edge。
建立 Concept layer 和 relation 底层维度。
用 Hybrid RAG 组合 embedding、concept、role、relation、source provenance。
每个版本记录 graph-native migration evidence。
等 v2.x / editor foundation / source reconstruction 更清晰后，再在 v3.x 认真设计 Neo4j 迁移。
```

这条路线能让我们今天不被 GraphDB 拖慢，同时不牺牲未来向 graph-native 进化的能力。
