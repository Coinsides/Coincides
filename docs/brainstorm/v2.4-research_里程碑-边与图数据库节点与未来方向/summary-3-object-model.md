# Summary 3: 对象模型与数据主权

**Created**: 2026-05-22
**Status**: Draft for Henry review
**Scope**: NoteBlock, CanvasNode, CanvasEdge, ObjectRelation, RelationLayer, EditorNode, Proposal, AI-readable structure, and v2.x graph-ready boundaries.

---

## 1. Summary Purpose

这份 summary 不是普通调研归档。

它用于固定 v2.4.x 到 v3.x 之前最重要的对象边界，避免 Canvas、Editor、Graph、Proposal 把职责混在一起。

它会直接影响：

- v2.4.1 Canvas foundation 的数据模型；
- v2.4.4 CanvasEdge + ObjectRelation seed；
- v2.4.5 command / relation layer switching；
- v2.5 template / style / editor engine；
- v3.x Neo4j / graph-native migration planning。

---

## 2. Required Reading Completed

本 summary 写作前已重新阅读以下文件全文：

```text
noteblock-relation-object-model-reference.md
diagram-connector-reference.md
block-editor-document-model-reference.md
knowledge-graph-relation-layer-reference-2.md
ai-readable-knowledge-structure-reference.md
relation-layer-extra-ideas.md
```

---

## 3. Core Thesis

Coincides 的对象模型应该围绕一个稳定原则展开：

```text
Content truth, semantic truth, visual projection, editor state, and reviewed mutation must remain separate.
```

最核心的对象边界是：

```text
NoteBlock:
  source-grounded learning/content object.

CanvasNode:
  projection of a domain object onto a canvas/view.

CanvasEdge:
  visual connector on a canvas.

ObjectRelation:
  semantic / AI-readable relation between domain objects.

RelationLayer:
  collection / view / purpose layer for relations.

EditorNode:
  editor-internal content node.

Proposal:
  reviewed mutation object.
```

一句话版本：

```text
EditorNode edits content.
NoteBlock owns learning truth.
ObjectRelation owns semantic meaning.
CanvasNode owns projection.
Proposal owns reviewed mutation.
```

---

## 4. Confirmed: Object Boundaries

### 4.1 NoteBlock

`NoteBlock` 应该继续作为 v2.x 的主要知识对象。

它不是普通 editor block，也不是 canvas shape。它承担：

- source-grounded content unit；
- proposal apply target；
- template-aware learning object；
- relation endpoint；
- canvas projection target；
- AI-readable context unit；
- future package/export unit。

v2.x 不应该过早引入抽象 `KnowledgeObject` 表。现在更合理的是：

```text
v2.x:
  NoteBlock as primary knowledge node.
  Concrete source/evidence/proposal/canvas tables stay explicit.

v3.x:
  evaluate KnowledgeObject / graph-native abstraction.
```

### 4.2 CanvasNode

`CanvasNode` 是投影对象，不是知识真相。

规则：

- CanvasNode 代表某个 domain object 在某个 canvas/view 上的位置和尺寸。
- 移动 CanvasNode 不改变 NoteBlock 内容。
- 删除 CanvasNode 默认不删除 NoteBlock。
- 同一个 NoteBlock 可以出现在多个 canvas / view。
- CanvasNode 可以缓存标题和摘要，但缓存不是事实源。

这保证未来可以替换 canvas engine，也能让 `.coincides` package 从 Coincides 自己的数据重建画布。

### 4.3 CanvasEdge

`CanvasEdge` 是视觉连接线。

它可以是：

- dangling；
- incomplete；
- visual-only；
- relation-suggested；
- relation-backed；
- stale。

最重要的规则：

```text
Not every arrow is a relation.
Not every relation needs to be visible as an arrow.
```

用户画线不应该自动污染知识图谱。AI 也不能把视觉近邻或箭头几何自动升级成 accepted truth。

### 4.4 ObjectRelation

`ObjectRelation` 是语义关系，是 AI-readable structure 的核心。

它应该至少表达：

```text
from_target_type
from_target_id
to_target_type
to_target_id
relation_type
relation_layer_id
status
visibility
confidence
source_type
source_proposal_id
source_evidence_set_id
metadata
```

ObjectRelation 应该支持灵活 endpoint，而不只支持 NoteBlock 到 NoteBlock。

v2.x 初始 endpoint 可以包括：

```text
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

但语义关系应优先指向 domain object，而不是 canvas projection。

### 4.5 RelationLayer

`RelationLayer` 是关系集合、视图和目的层。

它不是普通 UI filter。它会影响：

- 用户看到哪些关系；
- AI 优先读取哪些关系；
- topic-specific subgraph extraction；
- proof chain / formula derivation / source evidence view；
- future graph-native migration。

RelationLayer 至少需要支持：

```text
main_learning_structure
source_evidence
formula_derivation
ai_reading_order
topic_specific
proof_chain
suggested
user_defined
```

### 4.6 EditorNode

`EditorNode` 是编辑器内部对象。

它处理：

- rich text；
- selection；
- cursor；
- undo/redo；
- inline marks；
- editor commands；
- local document tree。

它不能成为 Coincides 的唯一真相。

未来如果引入 Tiptap、Lexical、BlockNote 或 BlockSuite，也应该走 adapter：

```text
NoteBlock domain object
  -> EditorAdapter
  -> editor document / node
  -> user edit
  -> EditorAdapter
  -> NoteBlock update / proposal
```

### 4.7 Proposal

`Proposal` 是 reviewed mutation object。

它不是单纯 preview。它可以生成：

- NoteBlock；
- SourceScope；
- EvidenceSet；
- ObjectRelation；
- RelationLayer；
- Canvas layout；
- ViewPreset。

Proposal rejected / superseded history 不应被当成 accepted truth，但可以作为审计、避免重复错误和质量改进的上下文。

---

## 5. Direct Edit vs Proposal-first

Coincides 应该把操作分成两类。

### 5.1 可以直接编辑的内容

这些变化通常可以直接保存：

- NoteBlock 的普通文本编辑；
- content_json 的局部字段编辑；
- formatting / inline style；
- CanvasNode 的位置、尺寸、基础 layout；
- viewport / zoom / pan；
- visual-only CanvasEdge 的样式或临时连接；
- board/view 的普通排序；
- 非语义 metadata 的轻量 UI 状态。

前提是：这些操作不改变 source truth、semantic relation、accepted evidence 或 proposal history。

### 5.2 必须 proposal-first 的内容

这些变化必须走 proposal / review / apply：

- AI 生成或重写 NoteBlocks；
- 创建 accepted ObjectRelation；
- 从 visual edge 升级成 semantic relation；
- source reference / SourceAnchor 的语义变更；
- EvidenceSet / reconciliation decision；
- RelationLayer 的 AI-generated 结构变化；
- template migration；
- bulk selected object semantic rewrite；
- AI-created block tree；
- AI-generated layout 如果会改变用户确认过的组织方式；
- 删除或 supersede accepted semantic structure。

核心规则：

```text
AI-readable does not mean AI-owned.
```

AI 可以读结构、提出结构、解释结构，但不能静默把 suggested relation、visual layout、unreviewed inference 升级成 accepted truth。

---

## 6. AI-readable Object Structure

AI 不应该只读取 page text、canvas screenshot 或 raw OCR。

它应该优先读取：

```text
1. accepted ObjectRelations
2. source-backed relations
3. accepted NoteBlocks with template metadata
4. EvidenceSets and SourceAnchors
5. active SourceScopes / SourceBoards
6. visible CanvasNode / ViewPreset summaries
7. suggested relations only when explicitly allowed
8. rejected/superseded proposals only as cautionary context
9. raw text chunks as fallback
```

这会让 AI 从“读一大坨文本”升级成“沿着可信对象和关系导航”。

更深一层意义是：

```text
Coincides gives AI a navigation system, not just a memory.
```

未来 AI 操作应该支持：

```text
select objects
  -> ask AI
  -> generate proposal
  -> review / apply
```

用户可以选择一组 NoteBlocks、CanvasNodes、SourceScopes 或 RelationLayers，然后让 AI 只对这些对象操作。这比单纯依赖自然语言范围描述可靠得多。

---

## 7. Graph-ready Requirements For v2.x

v2.x 仍然应该使用 SQLite 作为主权数据层，但要保持 graph-ready。

这意味着每个相关版本都应该记录：

- future node candidates；
- future edge / relation candidates；
- projection vs truth boundary；
- provenance / status / visibility / confidence；
- AI-readable structure；
- package/export implications；
- v3.x migration risks。

v2.x 不应该现在重写成 Neo4j。

但 v2.x 必须让未来迁移到 Neo4j / graph-native 架构时，不需要从聊天记录和散落表结构里考古。

### 7.1 Future Node Candidates

当前明确的 node candidates：

```text
NoteBlock
Note
SourceMaterial
SourceFragment
MaterialSegment
SourceSnapshot
SourceSnapshotPage
SourceAnchor
SourceScope
EvidenceSet
EvidenceItem
SourceBoard
SourceBoardNode
LearningCanvas
CanvasNode
CanvasFrame
RelationLayer
ViewPreset
Proposal
Topic
Template
```

### 7.2 Future Edge Candidates

当前明确的 edge candidates：

```text
ObjectRelation
NoteBlockSource
CanvasEdge
SourceAnchorLink
EvidenceItem membership
MaterialSegmentFragment membership
SourceBoardNode reference
Proposal apply link
Template relation pattern
ViewPreset object inclusion
```

### 7.3 Projection vs Truth

必须长期保持：

```text
Truth:
  NoteBlock
  Source / Evidence
  accepted ObjectRelation
  Proposal apply record

Projection:
  CanvasNode
  CanvasEdge visual geometry
  ViewPreset
  viewport/camera state
  external canvas engine snapshot/cache

Adapter:
  EditorNode / editor state
  external canvas shape state
```

---

## 8. Roadmap Impact

### 8.1 v2.4.1

v2.4.1 应该专注于 Canvas foundation，但必须预留对象边界：

- LearningCanvas；
- CanvasNode；
- domain object reference；
- layout / projection state；
- external engine adapter assumptions；
- selected object IDs；
- no semantic relation auto-creation。

v2.4.1 不应该做完整 connector editor 或 rich block editor replacement。

### 8.2 v2.4.4

v2.4.4 应该成为第一版真正的 relation boundary：

- CanvasEdge seed；
- ObjectRelation seed；
- RelationLayer seed；
- visual-only vs relation-backed；
- relation status / visibility；
- endpoint target_type / target_id；
- AI suggested relation review。

### 8.3 v2.4.5

v2.4.5 可以承接交互层：

- relation layer switching；
- show/hide relation types；
- command / shortcut；
- selected object operations；
- topic-specific relation view command；
- explain why these blocks are connected。

### 8.4 v2.5

v2.5 应该承接 template / editor / style engine：

- NoteBlockTemplateDefinition split into schema / service / view；
- template relation patterns；
- summary_for_agent；
- connector style packs；
- domain-specific block sets；
- editor adapter spike if current editor becomes bottleneck。

### 8.5 v3.x

v3.x 应该评估 graph-native architecture：

- Neo4j as serious main candidate；
- Kuzu / embedded graph as alternative；
- KnowledgeObject abstraction；
- graph mirror / graph export spike；
- migration from v2.x graph-ready SQLite objects。

---

## 9. Open Questions

- Should `ObjectRelation` support `target_type = canvas_node`, or should semantic relations always resolve to underlying domain objects when possible?
- Should NoteBlock composition use a specialized table, ObjectRelation, or both?
- When should a concept inside a NoteBlock become an independent graph object?
- Should SourceAnchor be a graph node, edge property, or provenance object in v3.x?
- Should EvidenceSet become a graph node, relation bundle, or both?
- Should RelationLayer be course-level, canvas-level, note-level, or all three?
- Should rejected proposal history be available to AI by default or only in debug/review mode?
- Should `ai_only` relations be allowed, or should every accepted relation be human-inspectable?
- Should editor selection and canvas selection use one shared selection scope abstraction?
- How much external canvas/editor engine state belongs in `.coincides` packages?

---

## 10. Confirmed Decisions

- `NoteBlock` remains the v2.x primary knowledge object.
- `CanvasNode` is projection, not truth.
- `CanvasEdge` is visual connector, not automatically semantic relation.
- `ObjectRelation` is the semantic / AI-readable relation layer.
- `RelationLayer` is a first-class purpose/view layer for relations.
- `EditorNode` is adapter-level editor state, not domain truth.
- `Proposal` is the reviewed mutation object.
- AI relation / semantic mutations must stay proposal-first.
- v2.x should stay SQLite-first but graph-ready.
- Neo4j should be treated as a serious v3.x graph-native candidate, not a v2.4 dependency.

---

## 11. Final Summary

Coincides 的对象模型应该避免两个极端：

```text
把一切都交给 canvas/editor engine
```

和：

```text
过早把一切抽象成 graph database
```

当前最稳的路线是：

```text
v2.x:
  concrete source-grounded objects
  graph-ready relation model
  canvas/editor as projection and adapter
  proposal-first semantic mutation

v3.x:
  evaluate graph-native rebuild after objects and relations stabilize
```

这让 v2.4 可以继续往前做 Canvas，同时不牺牲 Coincides 真正的核心差异：

```text
source-grounded objects
reviewed semantic relations
AI-readable structure
rebuildable projections
portable future workspace
```

---

## 12. Follow-up Clarification: CanvasEdge, ObjectRelation, And Package Recovery

Henry raised two important follow-up questions after this summary:

```text
1. If NoteBlock becomes a major graph node, how hard is it to add/remove node types later?
2. If a user draws an arrow from A but never connects it to a stable B, what happens?
```

These clarify an important implementation guardrail.

### 12.1 Node Types Must Stay Extensible

v2.x should not pretend that the final v3.x graph node set is already known.

`NoteBlock` is the strongest current v2.x graph-node candidate, but v3.x may later introduce or promote:

```text
Concept
Formula
Claim
ProofStep
EvidenceSet
SourceAnchor
Topic
Template
ViewPreset
```

The way to avoid painful migration is not to choose the perfect node set now.

The way to avoid painful migration is:

```text
keep target_type / target_id endpoints flexible
keep relation_type explicit
keep provenance/status/visibility/confidence on relations
record graph-native migration notes per version
```

If v2.x keeps this structure, adding a new graph node type later is manageable. Removing or merging node types is also manageable if old relations retain provenance and migration status.

The real danger is not choosing the wrong node count.

The real danger is losing why a node or relation existed.

### 12.2 CanvasEdge Comes First, ObjectRelation Comes After Review

When a user draws from block A toward an unfinished idea, the system should not create a semantic relation.

It should create a `CanvasEdge` only:

```text
connection_state = incomplete
from_node_id = A
to_node_id = null
relation_id = null
```

Later, the edge can become:

```text
visual_linked:
  A and B are connected visually, but no semantic relation exists.

relation_suggested:
  user or AI suggests a semantic relation type.

relation_backed:
  an accepted ObjectRelation exists and CanvasEdge.relation_id points to it.
```

The important model is not:

```text
one object changes from canvas edge into graph edge
```

The better model is:

```text
CanvasEdge:
  visual and interaction object

ObjectRelation:
  semantic / AI-readable graph edge candidate

CanvasEdge.relation_id:
  optional binding between the visual edge and the semantic relation
```

So:

```text
CanvasEdge carries unfinished human thinking.
ObjectRelation carries accepted semantic meaning.
```

### 12.3 Package Recovery Must Preserve Both Layers

The `.coincides` package must not rely on canvas geometry to recover semantic relations.

It should store:

```text
objects:
  NoteBlocks / Sources / EvidenceSets / ...

relations:
  ObjectRelations

canvas:
  CanvasNodes / CanvasEdges

bindings:
  CanvasEdge -> ObjectRelation
```

Import should run in this order:

```text
1. restore domain objects
2. restore ObjectRelations
3. restore CanvasNodes / CanvasEdges
4. restore CanvasEdge -> ObjectRelation bindings
5. produce import validation report
```

If a binding breaks, the system should not silently erase meaning.

Recommended recovery states:

```text
stale_binding:
  CanvasEdge originally pointed to an ObjectRelation,
  but the relation or endpoint could not be restored.

broken_relation:
  ObjectRelation exists,
  but from/to target is missing or invalid.
```

Core recovery rule:

```text
CanvasEdge can degrade.
ObjectRelation must not silently disappear.
Binding can break.
Import must report.
```

This should influence the future `.coincides` package design and v3.x graph-native migration design.
