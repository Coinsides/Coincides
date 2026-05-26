# v2.4 NoteBlock / Relation Object Model Reference

**Created**: 2026-05-22
**Status**: Research report 1
**Scope**: NoteBlock as knowledge object, relation endpoints, CanvasNode projection boundary, editor node vs domain object, and v3.x graph-native implications.

---

## 1. Executive Summary

本轮调研的核心问题不是：

```text
哪一个 block editor 更好用？
```

而是：

```text
NoteBlock 在 Coincides 里到底是什么？
它能不能成为 relation / graph 的主要节点？
CanvasNode、ObjectRelation、SourceAnchor、EvidenceSet、Proposal 和它是什么关系？
```

当前结论：

```text
v2.x:
  NoteBlock 应该作为主要知识对象和主要 relation node。

v3.x:
  NoteBlock 可能升级为 KnowledgeObject 的一种，
  或者成为 Concept / Claim / Formula / Evidence / Step 等更细对象的组合容器。
```

这个结论有两个保护作用：

- v2.x 不需要一开始就把所有知识拆成过细 graph object；
- v3.x 也不会被 NoteBlock 粒度锁死。

最重要的边界：

```text
NoteBlock = source-grounded learning/content object
CanvasNode = projection of a domain object
CanvasEdge = visual connector
ObjectRelation = semantic / AI-readable relation
RelationLayer = relation collection / view / purpose layer
KnowledgeObject = possible v3.x generalized object abstraction
```

一句话：

```text
NoteBlock 可以是 v2.x 的主节点。
但 Coincides 必须从现在开始为 v3.x 的 KnowledgeObject 留出口。
```

---

## 2. Why This Matters

v2.4 的风险不是只来自 Canvas。

更深的风险是：

```text
如果 NoteBlock 只是普通 editor block，
Relation Layer 就会变成画布线条；
AI-readable structure 就会变成页面文本猜测；
CanvasNode 就可能变成第二套知识本体。
```

这会让 Coincides 失去自己的核心差异。

Coincides 的核心不是普通 block editor，而是：

```text
source-grounded learning objects
  + proposal-first AI mutation
  + evidence / source provenance
  + relation layer
  + canvas / view projection
```

所以这轮调研把 NoteBlock 放在中心，重新解释 Canvas 和 Relation。

---

## 3. Reference Models

### 3.1 BlockSuite / AFFiNE

BlockSuite 是本轮最重要的 editor architecture reference。

它的关键启发：

- 每个 `doc` 管理一个 block tree；
- block 类型通过 schema 定义；
- block schema 可以声明 props、role、parent/children 约束；
- block spec 拆成 schema、service、view；
- 同一个 block model 可以有多个 view / widget / editor implementation；
- selection、command、service 是 editor runtime 的一部分，不应该散在 UI 里；
- PageEditor / EdgelessEditor 证明“同一份 doc，多种 editor / view”是可行的。

对 Coincides 的启发：

```text
NoteBlock 不应该只是 React component。
NoteBlock 也不应该只是数据库里一行 plain_text。
```

未来 NoteBlockTemplateDefinition 应该拆出：

```text
schema
renderer
editor_behavior
service / commands
proposal_behavior
source_behavior
relation_behavior
view_specs
```

但 BlockSuite 不能直接替代 Coincides：

- 它的 block 是 editor framework block；
- Coincides 的 NoteBlock 是 source-grounded learning object；
- BlockSuite 不负责 EvidenceSet、SourceAnchor、Proposal lifecycle、AI review gate；
- 直接采用会把项目变成 editor platform integration，过早且过重。

结论：

```text
学习 BlockSuite 的分层。
暂不采用 BlockSuite 作为依赖。
不要让 BlockSuite doc 成为 Coincides truth。
```

### 3.2 Tana

Tana 的关键启发是：

```text
ordinary node + supertag = typed object
```

它不是把每一种语义都变成底层 node type，而是用 supertag / fields / templates 给节点叠加结构。

对 Coincides 的启发：

```text
NoteBlock 可以保持稳定底层对象。
learning_role / template_id / domain tags 可以让它成为不同类型的学习对象。
```

Tana 还说明：

- typed object 不一定需要底层系统类型爆炸；
- field 是结构化属性；
- pinned field 是重要视图维度；
- optional field 避免模板太重；
- AI autofill 可以依赖类型/字段定义。

这支持 Coincides 当前方向：

```text
system_type = broad capability
learning_role = semantic role
template_id = reusable variant
domain / relation layer = contextual organization
```

但 Coincides 比 Tana 多一层 source/evidence/proposal 约束。

### 3.3 Anytype

Anytype 的关键启发是：

```text
Objects have Types.
Types should generally stay broad.
Templates refine repeated structures under a Type.
```

这和 v2.1.1 的 taxonomy 很契合。

对 Coincides 的启发：

- 不要把 `definition.math`、`definition.engineering`、`formula.physics` 都做成系统 type；
- 让 broad system type 稳定；
- 让 template variant 细化；
- 让未来 package / template library 提供更多变体。

结论：

```text
NoteBlock 的底层 type 应该稳定。
学习语义和模板变体应该开放。
```

### 3.4 Logseq / Roam

Logseq / Roam 的关键启发是：

```text
block can be an addressable node.
block reference can make small units reusable and linkable.
```

这支持 NoteBlock 成为 v2.x 主要 graph node。

但它也提醒我们：

- 如果一切都是 block reference，页面可能变得难维护；
- block-level graph 容易过细；
- source provenance 和 proposal history 不是普通 outliner 自动拥有的能力；
- page / block / reference 的边界必须清楚。

对 Coincides 的结论：

```text
NoteBlock 应该 addressable。
NoteBlock 应该 linkable。
但不是所有 inline span 都应该立即升格为 graph node。
```

### 3.5 Obsidian Canvas

Obsidian Canvas 的关键启发是：

```text
Canvas card can be a real note file,
or a temporary text card.
Temporary text cards do not participate in backlinks until converted.
```

这对 Coincides 很重要。

我们可以允许 Canvas 上存在临时视觉对象，但必须分清：

```text
CanvasVisual:
  pure visual object, not knowledge truth

CanvasNode:
  projection of NoteBlock / SourceScope / EvidenceSet / Proposal / other domain object

NoteBlock:
  source-grounded learning object
```

结论：

```text
临时 CanvasVisual 可以存在。
进入正式知识系统前，必须转成 NoteBlock / SourceScope / ObjectRelation / Proposal。
```

### 3.6 Notion

Notion 的关键启发是：

```text
block = typed content unit
page/database/property = higher-level structure
```

它把 paragraph、heading、code、toggle、table、media 等做成 block type。

对 Coincides 的启发：

- editor block 类型不等于学习语义类型；
- page/database/property split 很有用；
- block children 很重要；
- API 支持递归读取 children，说明 tree 是基础能力。

但 Coincides 不应该复制 Notion：

- Notion block 不天然 source-grounded；
- database relation 不等于 evidence-backed relation；
- AI proposal / review gate 不是 Notion 的核心模型。

### 3.7 ProseMirror / Lexical

ProseMirror 和 Lexical 的共同启发是：

```text
editor node is an editor document model.
domain object should not automatically equal editor node.
```

ProseMirror 强调 schema 定义 document tree、nodes、marks、children 关系。

Lexical 强调 editor state 里的 nodes 同时构成 visual editor view 和 editor data model，并支持 custom nodes / serialization。

对 Coincides 的启发：

- 可以借鉴 schema / node / serialization / command / transform；
- 但不能把 editor state 当作 Coincides 的唯一业务真相；
- 如果未来引入 Lexical/ProseMirror，应该作为 NoteBlock editor adapter，而不是替代 NoteBlock domain model。

结论：

```text
EditorNode 可以服务 NoteBlock 编辑。
NoteBlock 不应该被 EditorNode 吞掉。
```

### 3.8 Property Graph / RDF

图模型给了一个基本建模提醒：

```text
node = object / entity
edge = relationship
properties = attributes on node or edge
```

RDF 的 subject-predicate-object 三元组提醒我们：

```text
一个关系本身应该能被明确表达。
```

Property graph 则提醒我们：

```text
节点和边都可以带属性。
```

对 Coincides 来说，ObjectRelation 不应该只是：

```text
from_id
to_id
```

它还需要：

```text
relation_type
relation_layer_id
status
visibility
confidence
source_type
proposal_id
evidence_set_id
created_by
metadata
```

---

## 4. Proposed Coincides Object Model

### 4.1 v2.x Main Model

v2.x 建议维持：

```text
NoteBlock as primary knowledge object
```

NoteBlock 在 v2.x 应该承担：

- source-grounded content unit；
- proposal apply target；
- template-aware learning object；
- canvas projection target；
- relation endpoint；
- AI-readable context unit；
- future package/export unit。

### 4.2 v3.x Exit Hatch

为了避免 v2.x 被 NoteBlock 粒度锁死，从现在开始预留：

```text
KnowledgeObject
```

v3.x 可能把以下对象统一到 KnowledgeObject 层：

- NoteBlock；
- Concept；
- Claim；
- Formula；
- ProofStep；
- Example；
- Exercise；
- SourceEvidence；
- Topic；
- RelationLayer；
- ViewPreset。

但 v2.x 不要急着实现通用 KnowledgeObject 表。

建议：

```text
v2.x:
  keep concrete tables
  collect migration notes
  keep target_type / target_id flexible

v3.x:
  decide whether KnowledgeObject becomes the core abstraction
```

---

## 5. Boundaries

### 5.1 NoteBlock vs CanvasNode

```text
NoteBlock:
  content / learning / source-grounded truth

CanvasNode:
  projection / layout / view-specific representation
```

Rules:

- CanvasNode must reference a domain object when it represents knowledge.
- Moving CanvasNode does not change NoteBlock truth.
- Deleting CanvasNode should not delete NoteBlock by default.
- Same NoteBlock can appear in multiple canvases / views.
- CanvasNode may cache display title/summary, but source truth lives elsewhere.

### 5.2 CanvasEdge vs ObjectRelation

```text
CanvasEdge:
  visual connector

ObjectRelation:
  semantic relation
```

Rules:

- Not every visual edge is a relation.
- Not every relation is visible as an edge.
- A CanvasEdge may be:
  - dangling;
  - incomplete;
  - visual-only;
  - relation-backed.
- AI reads ObjectRelation, not screenshot pixels.

### 5.3 SourceAnchor / EvidenceSet

SourceAnchor and EvidenceSet are not just metadata.

They may become graph nodes or graph-adjacent objects because they are:

- addressable;
- source/provenance-bearing;
- reusable across notes, proposals, and relations;
- important for trust.

v2.x recommendation:

```text
Keep them as concrete domain objects.
Allow relations to target them.
Record graph-native migration notes.
```

### 5.4 Proposal

Proposal should be treated as a mutation/review object, not just a UI preview.

It can generate:

- NoteBlock;
- SourceScope;
- EvidenceSet;
- ObjectRelation;
- Canvas layout;
- ViewPreset.

v2.x recommendation:

```text
proposal-generated object changes remain traceable.
proposal rejected/superseded history should remain available for audit,
but should not be treated as accepted knowledge truth.
```

---

## 6. Relation Endpoint Model

Recommended minimum endpoint support:

```text
target_type:
  note_block
  note
  source_anchor
  source_scope
  source_material
  material_segment
  evidence_set
  evidence_item
  proposal
  canvas_node
  canvas_edge
  relation_layer
  topic
```

Important distinction:

```text
Domain relation:
  should usually target domain objects, such as NoteBlock or SourceAnchor.

Projection relation:
  may target CanvasNode or CanvasEdge.
```

When possible:

```text
Prefer NoteBlock -> NoteBlock
over CanvasNode -> CanvasNode
for semantic learning relations.
```

But keep CanvasNode target support for:

- visual-only relation;
- unresolved projection relation;
- temporary user sketch;
- relation proposal before domain target resolution.

---

## 7. NoteBlock Hierarchy And Composition

This report reinforces an earlier conclusion:

```text
NoteBlock cannot stay flat forever.
```

v2.x should not force full tree editing immediately, but should reserve:

- parent/child composition;
- section/composition template;
- proof step grouping;
- exercise/answer grouping;
- theorem/proof/example grouping;
- source quote with explanation;
- formula sheet section;
- generated report section.

Possible future model:

```text
note_block_compositions:
  id
  parent_block_id
  child_block_id
  relation_kind
  order_index
  metadata
```

or more generally:

```text
object_relations:
  from_target_type = note_block
  from_target_id = parent
  to_target_type = note_block
  to_target_id = child
  relation_type = contains / explains / proves / example_of / answer_to
```

Open question:

```text
Should composition be a specialized table or a relation type?
```

Recommendation:

```text
Keep specialized placement/composition tables for UI order/layout.
Use ObjectRelation for semantic relation.
Do not collapse both too early.
```

---

## 8. Template Implications

Tana / Anytype / BlockSuite together suggest:

```text
Template should define structure and behavior,
not just visual style.
```

Future NoteBlockTemplateDefinition should likely include:

```text
template_id
label
system_type
learning_role
domain_tags
fields
optional_fields
default_content
renderer
editor_behavior
source_behavior
proposal_behavior
relation_behavior
canvas_default_behavior
summary_for_agent
```

Important:

```text
Template may define relation patterns,
but it should not silently create accepted relations.
```

Example:

```text
theorem.basic:
  expected relation patterns:
    theorem -> proof
    theorem -> example
    theorem -> prerequisite concept

AI may propose these relations.
User/review gate accepts them.
```

---

## 9. AI-readable Implications

AI should be able to read:

- NoteBlock metadata;
- SourceAnchor / SourceScope;
- EvidenceSet;
- ObjectRelation;
- RelationLayer;
- Proposal history;
- CanvasNode projection summaries.

AI should not need to infer everything from:

- screenshots;
- OCR;
- visual arrow geometry;
- flattened page text.

Recommended AI context hierarchy:

```text
1. accepted ObjectRelations
2. source-backed relations
3. accepted NoteBlocks with template metadata
4. EvidenceSets and SourceAnchors
5. visible Canvas layout summaries
6. suggested relations only when explicitly allowed
```

Hidden AI reading-order layers should remain:

- inspectable;
- editable;
- proposal-first if AI generated;
- never silently promoted to truth.

---

## 10. v2.4 / v2.5 / v3.x Impact

### v2.4.4 Canvas Edges + BlockRelation Seed

Must implement or reserve:

- visual-only CanvasEdge;
- relation-backed CanvasEdge;
- ObjectRelation seed;
- RelationLayer seed;
- suggested / accepted / rejected status;
- endpoint target_type / target_id;
- source-backed relation metadata.

Do not make every arrow semantic.

### v2.5 Template Engine / Package Studio

Should include:

- template field definitions;
- optional fields;
- relation patterns;
- source behavior;
- agent summary;
- template package/export rules;
- style and canvas default behavior separated from domain truth.

### v3.x Graph-native Migration

This report strengthens the need for:

```text
v2.x graph-native migration notes
```

At the end of each v2.x version, record:

- new graph node candidates;
- new edge candidates;
- projection vs truth boundary changes;
- source/evidence/proposal objects that need graph representation;
- whether NoteBlock is still sufficient as primary node.

---

## 11. Recommendations

### Recommendation 1

Use NoteBlock as the v2.x primary knowledge node.

Reason:

- already implemented;
- source-grounded;
- template-aware;
- proposal-applied;
- visible to user;
- suitable for Canvas projection;
- suitable for AI context.

### Recommendation 2

Do not introduce generic `KnowledgeObject` in v2.4 yet.

Reason:

- too abstract too early;
- v2.x concrete objects are still evolving;
- would slow implementation;
- risks making the product feel like a schema lab instead of a learning workspace.

### Recommendation 3

Design ObjectRelation with flexible endpoints now.

Reason:

- NoteBlock is enough for many relations;
- SourceAnchor/EvidenceSet/MaterialSegment also need to participate;
- v3.x may split NoteBlock into finer objects.

### Recommendation 4

Keep CanvasNode as projection.

Reason:

- prevents second knowledge universe;
- preserves package/export clarity;
- allows multiple views over one object;
- keeps external canvas engine replaceable.

### Recommendation 5

Learn from BlockSuite, Tana, Anytype, Logseq, ProseMirror, and Lexical, but do not import their truth model.

Reason:

- their editor models are mature;
- Coincides has stronger source/evidence/proposal requirements;
- external editor state must remain adapter-level if adopted later.

---

## 12. Open Questions

- Should `ObjectRelation` support `target_type = canvas_node`, or should CanvasNode relations always resolve to the underlying domain target when possible?
- Should NoteBlock composition use a specialized table, ObjectRelation, or both?
- When should a concept inside a NoteBlock become an independent graph object?
- Should `SourceAnchor` be modeled as a node or as provenance on an edge in v3.x?
- Should `EvidenceSet` become a graph node, a relation bundle, or both?
- Should templates define relation patterns, canvas defaults, or both?
- Should relation proposal history be part of AI context after rejection?
- How much of editor state should be allowed inside NoteBlock metadata?
- Should v2.4.4 introduce `KnowledgeObject` only as a conceptual term in docs, not as code?

---

## 13. Final Position

The best current position is:

```text
NoteBlock is the v2.x primary knowledge object.
ObjectRelation is the semantic connection layer.
CanvasNode is the projection layer.
KnowledgeObject is a v3.x migration candidate, not a v2.4 implementation requirement.
```

This keeps v2.x practical while preserving the path to a graph-native v3.x.

---

## 14. Sources

- BlockSuite Working with Block Tree: https://blocksuite.io/guide/working-with-block-tree
- BlockSuite Block Schema: https://blocksuite.io/guide/block-schema
- BlockSuite Component Types: https://blocksuite.io/guide/component-types
- BlockSuite Edgeless Editor: https://blocksuite.io/components/editors/edgeless-editor
- Tana Supertags: https://outliner.tana.inc/learn/features/supertags
- Anytype Types: https://doc.anytype.io/anytype-docs/getting-started/types
- Logseq Blocks and Pages: https://chrislasar.github.io/logseq-doc/docs/explanation/blocks-and-pages/
- Logseq block references discussion: https://discuss.logseq.com/t/the-basics-of-logseq-block-references/8458
- Notion Block API: https://developers.notion.com/reference/block
- Obsidian Canvas: https://obsidian.md/help/plugins/canvas
- ProseMirror reference: https://prosemirror.net/docs/ref/
- Lexical Nodes: https://lexical.dev/docs/concepts/nodes
- RDF Concepts: https://w3c.github.io/rdf-concepts/spec/
- Neo4j Graph Database Concepts: https://neo4j.com/docs/getting-started/appendix/graphdb-concepts/
