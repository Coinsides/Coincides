# v2.4 Diagram / Flowchart / Connector Editing Reference

**Created**: 2026-05-22
**Status**: Research report 1
**Scope**: Connector endpoints, arrow binding, ports/handles, visual-only edges vs semantic relations, auto-layout, and AI-generated relation review.

---

## 1. Executive Summary

本轮调研的核心结论：

```text
Connector is not just a line.
Connector is an interaction system + visual object + optional semantic bridge.
```

Coincides 必须分清三层：

```text
CanvasEdge:
  visual connector on a canvas.

ObjectRelation:
  semantic / AI-readable relation between domain objects.

RelationLayer:
  a collection / view / purpose layer for relations.
```

最重要的规则：

```text
Not every arrow is a relation.
Not every relation needs to be visible as an arrow.
```

v2.4.1 只需要预留 connector 数据边界，不应该做完整 connector editor。

v2.4.4 才适合实现：

- visual-only edge；
- relation-backed edge；
- endpoint/port binding；
- edge status；
- first ObjectRelation seed；
- AI-generated relation proposal review。

推荐路线：

```text
v2.4.1:
  reserve data contract and adapter assumptions.

v2.4.4:
  implement CanvasEdge + ObjectRelation seed.

v2.4.5+:
  add command/shortcut/layer switching and richer connector workflows.
```

---

## 2. Reference Findings

### 2.1 tldraw

tldraw 是最强的白板 connector 参考之一。

重要发现：

- arrow 是 default shape；
- arrow 可以绑定到其他 shapes；
- binding 可以在对象移动/变形时保持连接；
- binding 有 precise / imprecise 概念；
- arrow 支持 labels、arrowheads、curved / elbow 等形态；
- custom shapes 可以参与 binding；
- bindings 是独立记录，不只是 arrow props；
- editor 删除 shape 时会处理 descendant shapes 和相关 bindings。

对 Coincides 的启发：

```text
Connector attachment should be a first-class record,
not just visual geometry.
```

如果使用 tldraw adapter：

```text
tldraw arrow/binding:
  handles visual binding and interaction.

Coincides CanvasEdge:
  stores projection-level connector.

Coincides ObjectRelation:
  stores semantic relation only after accepted.
```

风险：

- tldraw binding 很强，容易诱导我们把 relation truth 塞进 engine store；
- deletion side effects 需要 adapter 防护；
- shape binding 不等于 domain relation。

结论：

```text
tldraw can handle visual connector UX.
Coincides must own semantic relation records.
```

### 2.2 Excalidraw

Excalidraw 是轻量白板 connector 和 hand-drawn diagram 的重要参考。

重要发现：

- arrow/line 是 scene element；
- arrow 可以绑定到对象；
- arrow 支持 elbow / round / sharp 等视觉形态；
- scene JSON 容易理解；
- export 和 hand-drawn feel 很强。

对 Coincides 的启发：

```text
Visual connector can stay lightweight and expressive.
```

风险：

- scene-first 模型不天然支持 source/evidence/relation lifecycle；
- semantic relation 需要 Coincides 自己建模；
- 如果作为主 engine，relation layer 仍然几乎全是我们的工作。

结论：

```text
Excalidraw is useful as visual connector / export reference.
Not enough as semantic relation system.
```

### 2.3 React Flow

React Flow 是 relation / flow editor 的强候选。

重要发现：

- nodes / edges 是核心模型；
- handle 是端口 / port；
- 用户可以从 handle 拖到 handle 创建 edge；
- edge 支持 `source`, `target`, `sourceHandle`, `targetHandle`, `type`, `data`, `reconnectable`；
- 支持 reconnect edge；
- multiple handles of same type need distinguishable IDs；
- custom nodes / custom edges 是核心能力；
- 可以保存 nodes / edges / viewport。

对 Coincides 的启发：

```text
Port/handle identity is essential.
```

React Flow 很适合：

- relation editing view；
- topic-specific extracted graph；
- formula/proof dependency graph；
- AI suggested relation review；
- ObjectRelation inspection。

不适合：

- general freeform canvas；
- A4-like note surface；
- sticker / annotation / hand-drawn whiteboard；
- rich NoteBlock spatial presentation。

结论：

```text
React Flow should be considered for relation editor or extracted graph views,
not main Learning Canvas.
```

### 2.4 Mermaid

Mermaid 是 text-to-diagram 的强参考。

重要发现：

- flowchart 使用文本定义 nodes 和 edges；
- 支持方向、节点形状、边样式、label、subgraph；
- 很适合 AI 生成 diagram；
- 但不是 interactive visual editor。

对 Coincides 的启发：

```text
AI can generate diagram code as a proposal artifact.
```

适合：

- diagram block；
- generated report fragment；
- proof/flow illustration；
- quick exportable visual。

不适合：

- primary connector editing；
- relation layer truth；
- user drag-and-drop connector interaction。

结论：

```text
Mermaid can be a generated DiagramBlock tool.
It should not replace CanvasEdge / ObjectRelation.
```

### 2.5 yFiles / GoJS / diagrams.net

这类成熟 diagram tools 说明 connector editing 本身是一个重领域。

重要能力包括：

- ports；
- port candidates；
- edge labels；
- bends；
- reconnect；
- orthogonal routing；
- hierarchical / radial / tree layouts；
- edge grouping；
- label placement；
- node label-aware layout；
- keyboard interaction；
- undo / redo；
- GraphML / data binding；
- large graph performance。

对 Coincides 的启发：

```text
Do not underestimate connector editing.
```

但这类工具通常：

- 商业或重量级；
- 更适合专业 diagramming；
- 可能不适合直接进入 v2.4.1；
- 很容易把产品推向“流程图软件”而不是学习工作台。

结论：

```text
Use them as capability checklist and UX reference.
Do not adopt in v2.4.1.
```

### 2.6 ELK / Dagre

ELK / Dagre 等自动布局工具适合 relation graph / flow layout。

重要发现：

- ELK 支持复杂 graph layout；
- ports 可以作为 explicit anchor points；
- layered layout 适合有方向的依赖/流程；
- 自动布局是 graph view 的强工具，但不是自由 Canvas 的全部。

对 Coincides 的启发：

```text
Auto-layout should apply to extracted relation views,
not silently rearrange the user's authored canvas.
```

推荐：

- topic-specific relation graph 可以自动布局；
- AI-generated layout proposal 可以使用自动布局；
- 用户手动 canvas 不应被自动布局无提示改写；
- auto-layout 结果应走 proposal / preview / apply。

---

## 3. Connector State Model

Coincides 应该明确 connector 状态。

建议状态：

```text
dangling:
  no valid endpoint

incomplete:
  one valid endpoint

visual_linked:
  both endpoints are connected, but no semantic relation

relation_suggested:
  visual connector has a suggested ObjectRelation, pending review

relation_backed:
  connector is linked to accepted ObjectRelation

stale:
  connector target changed or referenced object changed enough to require review
```

原因：

- 用户可以自由画线；
- 不是所有线都要污染 knowledge graph；
- AI 可以提出 relation；
- 用户可以接受/拒绝；
- 已接受 relation 需要可追踪；
- target 删除/移动/替换时需要安全状态。

---

## 4. Endpoint And Port Model

### 4.1 Minimum Endpoint Fields

CanvasEdge 应该至少支持：

```text
from_node_id
from_port_id nullable
to_node_id nullable
to_port_id nullable
relation_id nullable
edge_kind
connection_state
visual_style
label
metadata
```

ObjectRelation 应该支持：

```text
from_target_type
from_target_id
to_target_type
to_target_id
relation_type
relation_layer_id nullable
status
visibility
confidence
source_type
evidence_set_id nullable
proposal_id nullable
metadata
```

### 4.2 Port Types

Coincides 可以先定义 soft ports，而不是复杂几何端口。

建议初始 ports：

```text
auto
top
right
bottom
left
content
source
result
prerequisite
example
proof
custom
```

解释：

- `auto` 交给 engine 或 router 选择；
- `top/right/bottom/left` 是几何 port；
- `content/source/result/prerequisite/example/proof` 是语义 port；
- `custom` 留给未来 template/style engine。

v2.4.4 不需要做完整 port editor，但要把字段留出来。

---

## 5. Visual Edge vs Semantic Relation

### 5.1 Visual-only Edge

Visual-only edge 表示：

```text
用户画了一条线。
它可能只是排版、指示、装饰、临时思考。
```

它不应该自动进入 AI-readable graph。

### 5.2 Relation-backed Edge

Relation-backed edge 表示：

```text
这条线对应一个已接受 ObjectRelation。
AI 可以读取它。
RelationLayer 可以过滤它。
Package/export 应该保留它。
```

### 5.3 Upgrade Path

建议流程：

```text
Draw visual edge
  -> both endpoints connected
  -> user chooses relation type OR AI suggests relation
  -> relation proposal / lightweight review
  -> accept
  -> create ObjectRelation
  -> link CanvasEdge.relation_id
```

### 5.4 Downgrade / Detach Path

用户也应该能：

```text
Detach semantic relation from visual edge
Hide relation edge
Keep relation but delete visual connector
Delete visual connector only
Archive/reject relation through review flow
```

这能避免“删除线 = 删除知识关系”的危险误解。

---

## 6. Relation Layer Interaction

Connector UI 不应该只支持一层边。

必须为多 relation layer 预留：

- visible layer；
- hidden AI reading layer；
- source evidence layer；
- formula derivation layer；
- topic-specific layer；
- suggested relation layer；
- user-defined layer。

视觉行为：

```text
show all
show one layer
show selected layers
hide suggested
show source-backed only
show AI hidden layer in advanced mode
```

v2.4.4 可以先只实现最小 layer selector 或数据预留。

v2.4.5 更适合做 command / shortcut / layer switching。

---

## 7. AI-generated Connector Rules

AI 生成边必须遵守 proposal-first。

AI 可以生成：

- relation candidates；
- endpoint suggestions；
- relation type；
- confidence；
- warning；
- source evidence；
- proposed layer；
- proposed visual style；
- proposed view extraction。

AI 不应该直接创建 accepted semantic relations，除非用户已授权某个极窄自动规则。

建议 AI relation proposal payload：

```json
{
  "from_target_type": "note_block",
  "from_target_id": "block-a",
  "to_target_type": "note_block",
  "to_target_id": "block-b",
  "relation_type": "derives_to",
  "relation_layer": "formula_derivation",
  "confidence": 0.82,
  "evidence": ["source_anchor_id"],
  "warnings": [],
  "visual_hint": {
    "edge_style": "arrow",
    "from_port": "result",
    "to_port": "prerequisite"
  }
}
```

Important:

```text
AI visual layout proposal and AI semantic relation proposal are related but separate.
```

---

## 8. Auto-layout Rules

Auto-layout is useful but dangerous.

Suggested rule:

```text
Auto-layout may generate a proposed view.
Auto-layout should not silently rewrite the user's authored canvas.
```

Allowed use cases:

- extracted topic graph；
- formula derivation graph；
- proof chain；
- source evidence graph；
- AI-generated study path；
- new view preset；
- initial layout for newly generated canvas。

Risky use cases:

- reflowing a user-edited canvas without review；
- changing a carefully arranged A4-like page；
- merging relation layout with presentation layout too early。

Recommended v2.4.x behavior:

```text
v2.4.1:
  no auto-layout except simple seed placement.

v2.4.4:
  allow relation graph layout as preview.

v2.4.5+:
  add command: Generate layout proposal / Apply layout proposal.
```

---

## 9. Style And Customization

Connectors will eventually need user-customizable styles:

- arrowhead；
- line width；
- stroke style；
- color；
- elbow / curved / straight；
- label placement；
- relation type style；
- domain-specific connector presets；
- flowchart theme；
- hidden vs visible layer style。

But v2.4.4 should not build full style editor.

Recommended:

```text
v2.4.4:
  store visual_style JSON.
  provide a few system presets.

v2.5+:
  style packs and template engine can define connector styles.
```

---

## 10. Data Model Recommendation

### 10.1 CanvasEdge

```text
canvas_edges:
  id
  canvas_id
  user_id
  course_id
  from_node_id
  from_port_id
  to_node_id
  to_port_id
  relation_id
  edge_kind
  connection_state
  label
  visual_style
  order_index
  metadata
  created_at
  updated_at
```

### 10.2 ObjectRelation

```text
object_relations:
  id
  user_id
  course_id
  relation_layer_id
  from_target_type
  from_target_id
  to_target_type
  to_target_id
  relation_type
  status
  visibility
  confidence
  source_type
  evidence_set_id
  proposal_id
  metadata
  created_at
  updated_at
```

### 10.3 RelationLayer

```text
relation_layers:
  id
  user_id
  course_id
  canvas_id nullable
  title
  layer_kind
  visibility
  status
  owner_type
  metadata
  created_at
  updated_at
```

### 10.4 CanvasEdgeBinding / Optional

If the chosen engine requires separate binding records:

```text
canvas_edge_bindings:
  id
  canvas_edge_id
  engine_binding_id nullable
  from_engine_shape_id nullable
  to_engine_shape_id nullable
  binding_kind
  metadata
```

This can stay optional until tldraw adapter or another engine proves it necessary.

---

## 11. v2.4.x Recommendations

### v2.4.1

Do:

- reserve CanvasEdge fields；
- decide whether external engine supports binding；
- test move node + connector follows node if engine is used；
- do not implement semantic relation apply。

Do not:

- build full connector editor；
- build relation layer UI；
- auto-create ObjectRelation from arrows。

### v2.4.4

Do:

- implement CanvasEdge seed；
- implement ObjectRelation seed；
- implement visual-only vs relation-backed distinction；
- implement endpoint target / port model；
- implement suggested relation state；
- allow user to accept/reject semantic relation；
- link relation-backed CanvasEdge to ObjectRelation。

### v2.4.5

Do:

- relation layer switching；
- connector commands；
- keyboard shortcuts；
- show/hide relation types；
- maybe topic-specific relation view command。

### v2.5+

Do:

- connector style packs；
- domain-specific relation templates；
- flowchart templates；
- relation pattern templates；
- package/export rules。

---

## 12. Open Questions

- Should v2.4.4 implement `object_relations` directly, or only reserve the table in spec?
- Should user-created visual edge with both endpoints connected ask for relation type immediately, or stay visual-only by default?
- Should AI suggested relations appear as dashed visual edges, a side panel, or hidden layer entries?
- Should relation labels be stored on CanvasEdge, ObjectRelation, or both?
- Should relation layer be course-level, canvas-level, note-level, or all three?
- Should a dangling connector be saved, or discarded unless the user explicitly keeps it?
- Should visual-only connectors be included in `.coincides` package exports?
- Should relation-backed edges export differently from visual-only edges?
- How should relation-backed edge deletion behave?

---

## 13. Final Position

Connector editing should be treated as a bridge between:

```text
human visual thinking
and
machine-readable knowledge structure
```

The bridge must be reviewable.

Therefore:

```text
v2.4.1:
  do not overbuild connectors.

v2.4.4:
  build the first real CanvasEdge + ObjectRelation boundary.

v2.4.5+:
  add interaction depth, layer switching, shortcuts, and customization.
```

This keeps Coincides from becoming either:

- a dumb whiteboard with pretty arrows；or
- a rigid graph database UI with no human-friendly spatial thinking。

---

## 14. Core Takeaway

The core model should stay simple and strict:

```text
CanvasEdge:
  visual connector on the canvas.

ObjectRelation:
  semantic / AI-readable relation between domain objects.

RelationLayer:
  collection / view / purpose layer for relations.
```

The most important rule:

```text
Not every arrow is a relation.
Not every relation needs to be visible as an arrow.
```

This should become a long-term guardrail for v2.4.4 and later:

- drawing an arrow should not automatically create accepted knowledge truth;
- accepting a semantic relation should not require showing a visual arrow everywhere;
- AI should propose relations, not silently turn visual layout into truth;
- visual connectors can remain useful even when they are not machine-readable;
- ObjectRelations can remain useful even when hidden from normal reading;
- relation layers decide which semantic relations are shown, hidden, extracted, or used by AI.

In short:

```text
CanvasEdge is how humans draw attention.
ObjectRelation is how the system understands meaning.
RelationLayer is how Coincides chooses which meanings to show or use.
```

---

## 15. Sources

- tldraw Default Shapes: https://tldraw.dev/sdk-features/default-shapes
- tldraw Shapes: https://tldraw.dev/sdk-features/shapes
- tldraw Arrow Binding: https://tldraw.dev/reference/tlschema/TLArrowBinding
- tldraw Create Arrow Example: https://tldraw.dev/examples/create-arrow
- React Flow Introduction: https://reactflow.dev/docs/concepts/introduction
- React Flow Edge Type: https://reactflow.dev/api-reference/types/edge
- React Flow Handle Component: https://reactflow.dev/api-reference/components/handle
- React Flow reconnectEdge: https://reactflow.dev/api-reference/utils/reconnect-edge
- React Flow common handle errors: https://reactflow.dev/learn/troubleshooting/common-errors
- Excalidraw Developer Docs: https://docs.excalidraw.com/
- Excalidraw package docs: https://www.npmjs.com/package/@excalidraw/excalidraw
- Mermaid flowchart syntax: https://mermaid.js.org/syntax/flowchart.html
- yFiles edge docs: https://docs.yworks.com/yfiles-html/dguide/graph/graph_model-edges.html
- yFiles graph model docs: https://docs.yworks.com/yfiles-html/dguide/graph/index.html
- yFiles port placement: https://docs.yworks.com/yfiles-html/dguide/layout/port_placement.html
- yFiles orthogonal layout: https://docs.yworks.com/yfiles-html/dguide/orthogonal_layout/
- ELK overview paper: https://arxiv.org/abs/2311.00533
