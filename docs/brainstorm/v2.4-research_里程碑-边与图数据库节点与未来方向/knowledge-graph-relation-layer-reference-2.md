# v2.4 Knowledge Graph / Relation Layer Reference 2

**Created**: 2026-05-22
**Status**: Research report 2
**Scope**: AI-readable relation graph, GraphRAG patterns, relation ontology, topic-specific subgraph extraction, provenance, and future graph tooling.

---

## 1. Executive Summary

Report 1 解决的是：

```text
Relation Layer 为什么不能只是 Canvas 上的线。
```

Report 2 进一步解决：

```text
Relation Layer 怎样变成 AI 可读取、可抽取、可验证、可打包的知识结构。
```

核心结论：

```text
Coincides 应该先建立自己的轻量 Relation Graph，
而不是立刻引入完整 graph database。
```

GraphRAG、RDF、SKOS、PROV、Property Graph 等体系都证明了一点：真正有价值的图不是“节点和边很多”，而是：

- 边有类型；
- 节点有类型；
- 关系有来源；
- 关系有状态；
- 可以按主题、路径、证据、层级抽取子图；
- AI 能读的是结构化关系，不只是文本块。

对 Coincides 来说，最合理的路线是：

```text
v2.4.4:
  先做 lightweight typed relation graph

v2.4.5:
  做 relation layer switching / filtering

v2.5+:
  做 topic-specific extraction / GraphRAG-style retrieval / package export
```

不建议现在引入 Neo4j、Kuzu 或其他 graph DB 作为运行时依赖；但应研究它们的数据模型和查询思想，避免我们的 schema 以后无法扩展。

---

## 2. What GraphRAG Teaches Us

GraphRAG 的核心价值不是“把所有东西画成图”，而是把原始文本转成实体、关系、社区、摘要和检索路径。

Microsoft GraphRAG 文档把 query 分为多种模式，例如：

- global search；
- local search；
- DRIFT search；
- basic search。

这些模式说明：同一套知识图，不同问题需要不同检索路径。

对 Coincides 的启发：

```text
同一份笔记，不应该只有一个阅读顺序。
Relation Layer 可以定义多种 AI retrieval path。
```

例如：

```text
用户问题：解释 Green theorem 的证明链。
AI 检索：
  proof_chain layer
  formula_derivation layer
  source_evidence layer

用户问题：复习所有三角函数相关知识。
AI 检索：
  topic_specific layer: trigonometric functions
  accepted relations
  visible + hidden reading-order relations
```

这意味着 Relation Layer 不只是视觉层，而是 AI retrieval routing layer。

---

## 3. Local Graph, Global Graph, And Community Summary

GraphRAG 思路里有一个重要区分：

```text
local:
  从某个实体、节点、片段附近展开。

global:
  从整个数据集的社区、主题、摘要层面回答。
```

Coincides 可以对应为：

```text
Local Relation View
  从一个 NoteBlock、SourceAnchor、Formula、Concept 出发展开。

Global Course Relation View
  看一门课的整体主题、章节、概念群。

Topic-specific Extracted View
  从一个主题或查询生成局部图。
```

Report 1 已经提出 focused relation view。Report 2 的补充是：  
Coincides 后续还可以支持 “relation community”。

例如：

```text
微积分课程
  community A: limits and continuity
  community B: derivatives
  community C: integrals
  community D: Green theorem / vector calculus
```

这些 community 不一定要用户手动建，也可以由 AI proposal 生成，然后用户确认。

---

## 4. Property Graph vs RDF-style Graph

知识图谱大致有两类常见表达：

### 4.1 Property Graph

Property Graph 通常是：

```text
node has labels and properties
edge has type and properties
```

它适合产品工程：

- 查询直接；
- edge 可以有 metadata；
- 和 relational DB 互相转换比较自然；
- Neo4j、Kuzu、LlamaIndex property graph 都属于这一类思路。

Coincides 的 `ObjectRelation` 很适合 property graph 风格。

### 4.2 RDF-style Graph

RDF 的基本模型是 triple：

```text
subject predicate object
```

它适合语义互操作：

- 概念标准化；
- ontology；
- external knowledge graph；
- web semantic data。

但 RDF 对普通产品实现会更重。

### 4.3 Recommendation

Coincides 不应该一开始做完整 RDF / OWL。

推荐：

```text
内部用 property graph 风格：
  object_relations table
  relation_type
  metadata
  source/provenance/status

长期保留 RDF-like export / mapping 可能性：
  subject = target
  predicate = relation_type
  object = target
```

这样既工程可控，又不封死未来语义互操作。

---

## 5. SKOS-style Concept Relations

SKOS 是 W3C 用于 concept schemes 的标准，常见关系包括：

```text
broader
narrower
related
exactMatch
closeMatch
```

这对 Coincides 很有启发。

学习笔记里很多关系不是严格证明链，而是概念关系：

```text
trigonometric identity
  broader: trigonometry

Green theorem
  related: line integral
  related: double integral

Stokes theorem
  broader/narrower/related: vector calculus theorem family
```

推荐 Coincides 的 relation type 分两层：

```text
generic semantic relations:
  broader
  narrower
  related
  same_as
  part_of
  depends_on

domain-specific learning relations:
  derives_to
  proves
  explains
  is_example_of
  source_supports
  read_before
```

这样可以兼容普通知识图谱和学习场景。

---

## 6. PROV-style Provenance

W3C PROV 关注 provenance，也就是数据从哪里来、由谁生成、经过什么活动产生。

Coincides 正好需要这个。

Relation 不应该只有：

```text
A -> B
```

还应该知道：

```text
谁创建的？
AI 还是用户？
来自哪个 proposal？
有没有 source evidence？
什么时候被接受？
是否过期？
是否被 superseded？
```

推荐 `object_relations` 保留：

```text
source_type:
  user
  ai_proposal
  source_evidence
  import
  system_rule

source_proposal_id
source_evidence_set_id
created_by
accepted_by
accepted_at
superseded_by
```

这不是过度设计。它是 Coincides 区分“漂亮图”和“可信知识结构”的关键。

---

## 7. Relation Ontology For Coincides

Coincides 不需要一开始拥有完整 ontology，但应该拥有一个最小 typed relation vocabulary。

### 7.1 Base Relation Types

建议第一组通用关系：

```text
related_to
part_of
has_part
depends_on
read_before
same_as
contradicts
supports
explains
```

### 7.2 Learning Relation Types

建议第一组学习关系：

```text
defines
is_definition_of
is_example_of
derives_to
proves
uses_formula
solves
answers
generalizes
specializes
```

### 7.3 Source / Evidence Relation Types

建议第一组 source-grounded 关系：

```text
source_supports
source_mentions
source_contradicts
evidence_supports
evidence_conflicts_with
quoted_from
paraphrased_from
```

### 7.4 AI Workflow Relation Types

建议第一组 AI workflow 关系：

```text
ai_suggests_read_before
ai_suggests_related
ai_suggests_topic_member
ai_suggests_derivation
ai_suggests_needs_review
```

这些不一定全部在 v2.4.4 实现 UI，但 relation vocabulary 可以先在 spec 中规划。

---

## 8. Relation Status Model

Relation 必须有状态，否则 AI 和用户会混淆。

推荐状态：

```text
suggested
  AI 或系统建议，未接受。

accepted
  用户确认或系统确定。

rejected
  用户拒绝。

hidden
  不默认显示，但可被 AI 或高级视图使用。

visible
  默认可以在相应 layer 显示。

stale
  来源或目标变化后可能失效。

superseded
  被新 relation 替代。
```

注意：

`hidden` 更像 visibility，不一定是 status。实际 schema 可以拆成：

```text
status = suggested | accepted | rejected | stale | superseded
visibility = visible | hidden | ai_only | advanced | archived
```

---

## 9. Relation Layer Kinds

Report 1 提到很多 layer。Report 2 进一步建议把 layer 分成两类：

### 9.1 Persistent Layers

用户或系统长期保存的关系层：

```text
main_learning_structure
source_evidence
formula_derivation
ai_reading_order
topic_specific
proof_chain
review_path
```

### 9.2 Generated / Query Layers

临时生成的关系视图：

```text
search_result_layer
topic_extraction_layer
question_answer_context_layer
report_draft_context_layer
```

推荐：

```text
v2.4.4:
  persistent layers only

v2.5+:
  generated/query layers
```

---

## 10. Topic-specific Subgraph Extraction

这是 Henry 重点提出的方向。

目标：

```text
从一份长笔记中抽取某个主题相关的对象和关系，
形成一个单独可阅读、可编辑、可导出的视图。
```

### 10.1 Input

可能输入：

```text
topic text:
  "trigonometric functions"

selected object:
  a formula block

relation layer:
  formula_derivation

source scope:
  pages 3-10

query:
  "everything related to Green theorem"
```

### 10.2 Retrieval Steps

第一版可以是：

```text
1. 找到 topic seed objects
2. 根据 relation types 展开 1-2 hops
3. 过滤 status:
     accepted first
     suggested optional
4. 过滤 visibility:
     visible + hidden if AI mode
5. 保留 source evidence links
6. 生成 extracted view proposal
7. 用户 review/apply
```

### 10.3 Output

输出不应该复制对象，而应该创建 view/projection：

```text
extracted_view
  references existing objects
  contains selected relation ids
  contains layout proposal
  contains source summary
```

这和 `.coincides` 工程包也有关：工程包需要能保存这些 extracted views。

---

## 11. AI Reading Layer

AI Reading Layer 是一个非常重要的独立概念。

它不是给用户看的主干线，而是给 AI 后续处理笔记用的结构。

例子：

```text
User layout:
  Page 1 has definition
  Page 2 has unrelated note
  Page 3 has formula

AI reading layer:
  definition on Page 1
    -> read_before
  formula on Page 3
```

它的意义：

- 弥补用户排版和真实理解顺序之间的差异；
- 帮助 AI 生成更稳定的 summary；
- 帮助 AI 后续重新排版；
- 帮助 AI 生成 quiz / review path；
- 帮助 AI 解释为什么某些 block 有关。

安全规则：

```text
AI reading layer 默认 suggested。
用户确认后才 accepted。
accepted hidden relation 可以被 AI 优先读取。
普通阅读视图默认不显示。
高级用户可以编辑。
```

---

## 12. Proposal-first Relation Creation

Coincides 既然已经建立 proposal-first 工作流，Relation 也必须遵守。

AI 不能直接写 accepted relations。

推荐流程：

```text
AI proposes relation layer changes
  -> relation proposal preview
  -> user accepts / rejects / edits
  -> accepted relations are written
  -> canvas edges can render them
```

Relation proposal 应显示：

- from object；
- to object；
- relation type；
- layer；
- visibility；
- confidence；
- reason；
- source evidence；
- warnings；
- whether it will be visible on canvas。

这个流程会让 AI 能参与整理，但不会让 AI 静默改知识结构。

---

## 13. Should We Use Graph DB?

### Short Answer

现在不应该。

### Why Not Yet

- v2.x 当前使用 SQLite；
- 本地优先；
- 关系规模还未知；
- graph DB 会增加迁移和部署复杂度；
- v2.4.4 只需要第一版 relation layer；
- relational schema 已经能表达 directed typed edges。

### What To Borrow

可以借鉴 graph DB 思路：

- property graph model；
- node labels；
- edge types；
- edge properties；
- graph traversal；
- subgraph extraction；
- shortest path / neighborhood query。

### Future Re-evaluation

如果未来出现：

- 大量跨课程关系；
- 多跳查询频繁；
- topic extraction 复杂；
- graph algorithms 需要性能；
- GraphRAG 成为主路径；

再评估：

- embedded graph DB；
- graph index；
- cached graph projection；
- dedicated graph analytics library。

Kuzu 这类 embedded graph database 值得作为未来候选，而不是 v2.4 默认依赖。

---

## 14. Open-source Tool Directions

这篇不是 open-source adoption matrix，但先记录候选方向：

### For Relation Editing

- React Flow:
  - handles / edges / flow editing；
  - 适合 connector editor；
  - 不适合全局知识图谱分析。

### For Graph Visualization

- Cytoscape.js:
  - graph algorithms；
  - filtering；
  - compound graph；
  - 适合 relation graph view。

- Sigma.js:
  - high-performance graph rendering；
  - 适合大图浏览；
  - 不适合普通 canvas editor。

- AntV G6:
  - graph visualization；
  - 适合图谱 UI；
  - 需要评估 React / local-first integration。

### For Graph Data / Query

- Kuzu:
  - embedded graph database；
  - later candidate。

- Neo4j:
  - powerful but too heavy for v2.4 local-first core。

### For AI Graph Retrieval

- LlamaIndex PropertyGraphIndex；
- Microsoft GraphRAG；
- Neo4j GraphRAG ecosystem。

这些更适合影响 AI retrieval design，而不是马上变成产品依赖。

---

## 15. Proposed v2.4.4 Minimal Contract

第一版 relation layer 可以这样做：

```text
relation_layers
  id
  user_id
  course_id
  canvas_id nullable
  title
  layer_kind
  status
  visibility
  metadata

object_relations
  id
  user_id
  course_id
  relation_layer_id nullable
  from_target_type
  from_target_id
  to_target_type
  to_target_id
  relation_type
  status
  visibility
  confidence
  source_type
  source_proposal_id nullable
  source_evidence_set_id nullable
  metadata

canvas_edges
  relation_id nullable
  visual_style
```

Minimum behavior:

- create visual-only edge；
- create relation-backed edge；
- hide/show layer；
- list relations by layer；
- accepted vs suggested status；
- AI cannot directly create accepted relation。

---

## 16. How This Changes Canvas Pressure

This research reduces the pressure on Canvas.

Canvas does not need to be the brain.

```text
Canvas:
  human spatial interface
  layout
  presentation
  interaction

Relation Graph:
  structure
  meaning
  AI-readable paths
  source/evidence relation
  topic extraction
```

Therefore:

- Canvas engine should be mature and probably external/adapted if possible.
- Relation Layer should be Coincides-owned.
- AI should read Relation Graph, not screenshots.
- Canvas should display selected relation layers, not own them.

---

## 17. Follow-up Questions For Report 3 Or Later

- Which relation types should be hardcoded first?
- How should relation type templates become user-customizable in v2.5?
- What is the exact UX for reviewing AI relation proposals?
- Should topic extraction create a new view preset, a new relation layer, or both?
- How should relation layers be represented inside `.coincides` packages?
- Can relation layers be shared without source material?
- Should relation layers be course-local or cross-course after v2.x?

---

## 18. Sources

- Microsoft GraphRAG documentation: https://microsoft.github.io/graphrag/
- GraphRAG paper: https://arxiv.org/abs/2404.16130
- LlamaIndex Property Graph Index: https://docs.llamaindex.ai/en/stable/module_guides/indexing/lpg_index_guide/
- Neo4j GraphRAG documentation: https://neo4j.com/docs/neo4j-graphrag-python/current/
- Kuzu documentation: https://docs.kuzudb.com/
- W3C RDF 1.1 Concepts: https://www.w3.org/TR/rdf11-concepts/
- W3C SKOS Reference: https://www.w3.org/TR/skos-reference/
- W3C PROV Overview: https://www.w3.org/TR/prov-overview/
- React Flow documentation: https://reactflow.dev/
- Cytoscape.js documentation: https://js.cytoscape.org/
- Sigma.js: https://www.sigmajs.org/
- AntV G6: https://g6.antv.antgroup.com/

