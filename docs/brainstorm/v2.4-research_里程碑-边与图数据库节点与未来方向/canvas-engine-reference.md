# v2.4 Canvas Engine / Whiteboard Engine Reference

**Created**: 2026-05-22
**Status**: Research report 1
**Scope**: Canvas engine candidates, whiteboard/editor interaction layer, adapter strategy, v2.x MVP boundary, and v3.x expansion direction.

---

## 1. Executive Summary

本轮调研的核心结论：

```text
Coincides 仍然需要 Canvas。
但 Coincides 不应该重度自研 Canvas engine。
Coincides 应该自研数据主权、Relation Layer、Adapter、Package；
成熟 Canvas / whiteboard engine 应该承担渲染和交互。
```

原因：

- Canvas 是人的空间工作台、展示层、传播层、导出层。
- Relation Layer / Knowledge Graph 才是结构和 AI-readable 语义层。
- 如果 Canvas engine 不成熟，拖拽、缩放、选择、连线、frame、历史、快捷键、导出都会变成长期底层负担。
- 如果直接让外部 engine store 成为真实数据，也会绑架 Coincides 的 source / evidence / proposal / relation 模型。

推荐路线：

```text
v2.x:
  Canvas engine = MVP interaction / projection layer
  Coincides owns data
  external engine is optional renderer/interaction layer
  avoid engine store as source of truth

v3.x:
  Canvas engine can mature into full workspace/presentation surface
  Graph-native object/relation model becomes deeper foundation
  Canvas engine remains replaceable through adapter if possible
```

当前候选判断：

```text
tldraw:
  strongest candidate for v2.4.1 adapter spike.

Excalidraw:
  strong reference for lightweight scene/export/hand-drawn whiteboard.
  less ideal as Coincides' main structured canvas engine.

BlockSuite / AFFiNE Edgeless:
  strongest architecture reference for document/canvas shared runtime.
  too heavy to adopt or fork immediately.

React Flow:
  strong connector/flow editor candidate for relation editing.
  not a general whiteboard engine.

JSON Canvas:
  useful open interchange reference.
  not enough for Coincides source-grounded project format.
```

---

## 2. What Should Canvas Engine Do In v2.x vs v3.x?

Henry asked an important boundary question:

```text
v2.x 是整体思路研究和 MVP 小实验阶段。
Canvas / Whiteboard engine 到底应该做到什么程度？
3.x 又应该扩展到什么程度？
```

### 2.1 v2.x Canvas Engine Goal

v2.x should prove the projection model.

It should support:

- open a LearningCanvas;
- render CanvasNodes;
- pan / zoom;
- select and move nodes;
- save node positions;
- open / jump to node targets;
- show A4-like and infinite-like canvas presets;
- seed from SourceBoard / SourceScope / NoteBlock;
- reserve CanvasEdge / relation-backed edge concepts;
- keep engine state separate from Coincides source of truth.

v2.x does not need:

- perfect whiteboard maturity;
- full custom tool system;
- complete design-token/style editor;
- advanced relation layer UI;
- multiplayer;
- production-grade plugin ecosystem;
- final export/package system;
- full parity with tldraw / Excalidraw / AFFiNE.

The v2.x goal:

```text
Can Coincides objects live on a usable canvas without losing data sovereignty?
```

### 2.2 v3.x Canvas Engine Goal

v3.x should expand only after:

- Relation Layer is stable;
- ObjectRelation / graph-native model is clearer;
- Package/export requirements are better known;
- v2.x has proven which canvas interactions are truly needed.

v3.x may support:

- mature canvas workspace;
- graph-native relation-aware layout;
- advanced relation layer switching;
- topic-specific extracted graph views;
- full project package import/export;
- style/template packages;
- user-defined backgrounds, arrows, frames, stickers, flowchart themes;
- presentation/report views;
- possible graph-native backend integration.

The v3.x goal:

```text
Can Coincides become a graph-native, source-grounded knowledge workspace with a mature canvas/presentation layer?
```

### 2.3 Practical Boundary

v2.x should not try to beat mature canvas tools.

v2.x should answer:

```text
Which mature engine can help us without taking over our data?
```

v3.x can answer:

```text
How far should Coincides customize or replace the canvas engine after the graph-native model stabilizes?
```

---

## 3. Tool Findings

### 3.1 tldraw

tldraw is the strongest candidate for a v2.4.1 adapter spike.

Relevant findings:

- tldraw has a reactive store that holds shapes, pages, bindings, assets, and records.
- Snapshots separate `document` state from `session` state. This maps well to Coincides' need to separate persistent canvas content from per-user camera/selection state.
- Shapes are JSON records with base properties and shape-specific `props`.
- The SDK supports custom shapes through `ShapeUtil`.
- Bindings create persistent relationships between shapes. Arrow bindings attach to shapes and update as shapes move.
- Default shapes cover text, notes, geometry, drawing, image/video/bookmark/embed, frame/group, and arrow.
- Arrow binding supports precise/imprecise attachment, curved/elbow routes, labels, and arrowhead styles.
- Options include providing your own store and shape visibility rules.

Why this matters for Coincides:

```text
tldraw already solves many hard canvas problems:
  pan/zoom/select/move
  shapes
  arrows
  binding
  frames
  session/document split
  custom shapes
  migrations
```

Potential adapter model:

```text
Coincides CanvasNode
  -> tldraw custom shape

Coincides CanvasEdge
  -> tldraw arrow + binding

tldraw document snapshot
  -> optional renderer cache / projection snapshot

Coincides DB
  -> source of truth
```

Major risks:

- tldraw store is powerful and may tempt us to make it the real project document.
- License/runtime terms need careful recording, especially for future open-source/downstream users.
- Custom shapes and migrations require careful maintenance.
- Adapter mapping must avoid putting NoteBlock / Source / Evidence truth only inside tldraw shape props.

Current recommendation:

```text
Use tldraw as the main v2.4.1 candidate for an adapter spike.
Do not make tldraw store the Coincides project format.
```

### 3.2 Excalidraw

Excalidraw is excellent as a lightweight whiteboard and scene/export reference.

Relevant findings:

- Excalidraw scene data is element-based.
- `.excalidraw` files contain elements, appState, and files.
- Export/restore utilities normalize elements and app state.
- AppState is broad and includes tool state, selection, zoom, dialogs, preferences, and export settings.
- Elements include rectangle, ellipse, diamond, arrow, line, freedraw, text, image, frame, embeddable, and iframe.
- Arrow/line elements include points, bindings, arrowheads, and elbow behavior.
- Collaboration is not included in the package by default; host app implements it.
- Export utilities support canvas export and file data.

Why this matters for Coincides:

```text
Excalidraw is strong for:
  quick sketching
  hand-drawn feel
  arrows and frames
  JSON scene files
  PNG/SVG export ideas
  lightweight visual communication
```

Risks:

- It is more scene-oriented than source-grounded object-oriented.
- Its element model is not naturally a Coincides object graph.
- It is less obviously suited to structured NoteBlock / SourceAnchor / EvidenceSet projection than tldraw custom shapes.
- If used as primary engine, Coincides may need more bridge code for semantic nodes and relation layers.

Current recommendation:

```text
Use Excalidraw as reference and fallback candidate.
Do not choose it as the default structured canvas engine unless tldraw adapter fails.
```

### 3.3 BlockSuite / AFFiNE Edgeless

BlockSuite / AFFiNE Edgeless is the strongest architecture reference for combining document and canvas editors.

Relevant findings:

- BlockSuite includes `PageEditor` and `EdgelessEditor`.
- EdgelessEditor is an infinite canvas for whiteboard and graphic editing.
- It includes shapes, brushes, connectors, text, frames, groups, link cards, customizable toolbars, and widgets.
- It shares rich text capabilities with PageEditor.
- BlockSuite emphasizes runtime compatibility between page editor and edgeless editor: the same doc object can attach to different editor instances.
- Its architecture separates document and editor, preserving operation history when switching editors.
- Components include Editor, Block, Widget, Fragment, and advanced blocks such as Surface Block, Database Block, Frame Block, Link Blocks, Embed Blocks.

Why this matters for Coincides:

```text
BlockSuite/AFFiNE proves that document and canvas can share the same content substrate.
```

This is very close to Coincides' desired idea:

```text
Single object graph
Multiple projections
```

Risks:

- BlockSuite is a full editor framework, not a small canvas widget.
- Importing it may turn Coincides into an AFFiNE-like editor platform migration.
- It may conflict with Coincides' source/evidence/proposal model.
- Forking or deeply adapting it could be more expensive than using a focused canvas adapter.

Current recommendation:

```text
Treat BlockSuite/AFFiNE as architecture reference first.
Do not adopt or fork it for v2.4.1.
Re-evaluate after canvas adapter research if NoteBlock editor / page-canvas shared runtime becomes the main bottleneck.
```

### 3.4 React Flow

React Flow is strong for interactive flowgraphs, not general whiteboards.

Relevant findings:

- It models nodes connected by edges.
- Nodes can have handles, also called ports.
- Users can drag from handle to handle to create edges.
- Edges support source, target, sourceHandle, targetHandle, type, visibility, selectability, reconnectability, and arbitrary data.
- Viewport has x, y, zoom.
- React Flow can save and restore nodes, edges, and viewport.
- Custom nodes and custom edges are core capabilities.

Why this matters for Coincides:

React Flow maps beautifully to:

```text
Canvas Edges + BlockRelation Seed
Relation Layer editing
Connector/handle workflows
Graph-like relation views
```

Risks:

- React Flow is not a full freeform whiteboard.
- It is diagram/flow oriented.
- It is less suited for arbitrary A4 page-like note layout, free drawing, stickers, hand-drawn shapes, and general whiteboard editing.

Current recommendation:

```text
Do not use React Flow as the main Canvas engine.
Keep it as a serious candidate for v2.4.4 relation/connector editing or extracted graph views.
```

### 3.5 JSON Canvas / Obsidian Canvas

JSON Canvas is a useful open format reference.

Relevant findings:

- JSON Canvas has nodes and edges.
- Nodes have id, type, position, width, height, color, and type-specific fields.
- Edges have id, fromNode, toNode, optional sides, ends, color, and label.
- It is built for infinite canvas interoperability.

Why this matters for Coincides:

```text
JSON Canvas is a good minimum interchange shape.
```

It can inspire:

- `.coincides` canvas projection section;
- import/export compatibility;
- simple external graph/canvas export;
- fallbacks if no canvas engine exists.

Risks:

- It is not enough to represent source/evidence/proposal/relation lifecycle.
- It treats canvas graph mostly as visual data.
- Coincides needs richer provenance, relation status, AI policy, package levels, and source-grounding.

Current recommendation:

```text
Use JSON Canvas as external/export reference, not internal truth format.
```

---

## 4. Comparison Matrix

| Candidate | Best For | Weakness | v2.4.1 Fit | Long-term Fit |
| --- | --- | --- | --- | --- |
| tldraw | Mature infinite canvas SDK, custom shapes, bindings, arrows, frames, store/session split | Store can become too central; license/runtime must be reviewed | Strong | Strong if adapter boundary holds |
| Excalidraw | Lightweight whiteboard, hand-drawn diagrams, scene/export reference | Scene-first, less structured for source-grounded objects | Medium | Medium as export/whiteboard reference |
| BlockSuite/AFFiNE | Document/canvas shared architecture, editor runtime | Full framework, heavy adoption/fork cost | Low for implementation, high as reference | High as architecture reference |
| React Flow | Nodes/edges/handles, relation graph editor | Not a general whiteboard or A4 canvas | Medium for relation spike, low as main canvas | Strong for relation views |
| JSON Canvas | Open file/interchange format | Too simple for Coincides truth | Low as engine, high as reference | Strong as export/interchange reference |
| Pure self-build | Maximum fit | High cost, immature interaction | Low unless forced | Only if adapters fail |

---

## 5. Data Sovereignty Rule

No matter which engine we choose:

```text
Coincides owns:
  NoteBlock
  SourceAnchor
  SourceScope
  EvidenceSet
  Proposal
  LearningCanvas
  CanvasNode
  CanvasEdge
  RelationLayer
  ObjectRelation
  Project Package

Engine owns:
  UI rendering
  selection
  drag
  pan / zoom
  shape interaction
  connector manipulation
  transient editor state
```

Never store irreversible knowledge truth only in:

- tldraw shape props;
- Excalidraw element metadata;
- React Flow edge data;
- BlockSuite internal doc state;
- raw JSON Canvas nodes/edges.

External engine data may be:

- cache;
- rendering projection;
- adapter snapshot;
- import/export sidecar;
- debug data.

It must not be the authoritative Coincides object graph.

---

## 6. Recommended v2.4.1 Strategy

Recommended v2.4.1 plan title:

```text
v2.4.1: Canvas Engine Gate + Basic Canvas Viewer / Editor
```

Recommended steps:

```text
Step 0: Canvas Engine Gate
  Compare tldraw, Excalidraw, React Flow, pure self-build.

Step 1: tldraw adapter spike
  Render Coincides CanvasNode as custom or mapped shapes.
  Persist Coincides CanvasNode x/y/size separately.
  Keep tldraw snapshot optional.

Step 2: Basic interaction
  pan / zoom
  select node
  move node
  save position
  open node target

Step 3: Engine boundary tests
  deleting or moving engine shape must not delete NoteBlock truth.
  external snapshot can be regenerated from Coincides data.
  no source/evidence/proposal truth is stored only in engine metadata.
```

If tldraw adapter is blocked, fallback:

```text
React/CSS lightweight viewer for v2.4.1
plus continue tldraw/Excalidraw spike in parallel or v2.4.1.1.
```

Do not make v2.4.1 implement full relation layer, full edges, or full template insertion. Those remain v2.4.2-v2.4.4 work.

---

## 7. Adapter Architecture

Preferred architecture:

```text
Coincides DB
  LearningCanvas
  CanvasNode
  CanvasEdge
  CanvasViewportState
  ObjectRelation

Canvas Adapter
  maps Coincides objects to engine objects
  listens to engine events
  writes back allowed projection changes

Canvas Engine
  tldraw / Excalidraw / other
  renders shapes and interactions
```

Allowed write-back from engine:

- node position;
- node size;
- z-index/order;
- visual style if explicitly allowed;
- viewport state;
- visual connector geometry.

Not allowed direct write-back:

- NoteBlock content truth;
- SourceAnchor truth;
- EvidenceSet truth;
- accepted ObjectRelation truth;
- Proposal status;
- source provenance.

Semantic mutations must still go through Coincides services and proposal/review gates.

---

## 8. Relation Layer Implications

Canvas engine selection must support or at least not block:

- visual-only connectors;
- relation-backed connectors;
- hidden relation layer display;
- layer show/hide;
- topic-specific extracted views;
- AI reading-order layers;
- port/handle attachment.

tldraw already has bindings and arrows, which is promising.

React Flow already has handles and edges, which is promising for relation-specific views.

Excalidraw has arrows and bindings, but the scene model may be less suited for typed semantic relation layers.

BlockSuite/AFFiNE has edgeless connectors and shared document runtime, but adoption cost is high.

---

## 9. Export / Package Implications

Canvas engine choice must not break future `.coincides` packages.

Future package should contain:

```text
Coincides objects
Coincides relations
Coincides projections
source snapshots
evidence
templates
assets
optional engine snapshots
```

Engine snapshots should be optional:

```text
If engine snapshot exists:
  use it as fast render cache or fidelity sidecar.

If engine snapshot missing:
  rebuild canvas from Coincides CanvasNode / CanvasEdge / RelationLayer.
```

This is the most important reason not to let engine store become project truth.

---

## 10. Open-source Adoption Question

This report does not fully answer open-source adoption / fork feasibility. That is the next research direction.

However, early assessment:

```text
tldraw:
  likely adapter candidate, not fork-first.

Excalidraw:
  likely reference/fallback, possible export/scene inspiration.

BlockSuite/AFFiNE:
  architecture reference, not v2.4.1 adoption.

React Flow:
  relation editor candidate.
```

Fork/adaptation may still be valid, but only after open-source adoption matrix evaluates:

- license;
- project size;
- modularity;
- build complexity;
- long-term maintenance;
- whether partial reuse is realistic.

---

## 11. Recommended Answer To Henry's MVP Question

In v2.x:

```text
Canvas Engine should be good enough to prove that Coincides objects can be spatially arranged, moved, opened, and exported/rebuilt as projections.
```

It does not need to become a full professional design tool.

In v3.x:

```text
Canvas Engine can become a mature workspace layer over a graph-native object/relation model.
```

It may then support:

- mature relation layer visualization;
- topic graph extraction;
- custom style/template packs;
- presentation/report generation;
- more complete export/package workflows;
- possibly deeper external engine integration or replacement.

The key:

```text
v2.x proves the projection boundary.
v3.x expands after the graph-native model stabilizes.
```

---

## 12. Final Recommendation

Recommended direction for v2.4.1:

```text
Primary candidate:
  tldraw adapter spike

Secondary candidate:
  lightweight React/CSS viewer fallback

Reference:
  Excalidraw for export/scene/hand-drawn whiteboard
  BlockSuite/AFFiNE for document-canvas architecture
  React Flow for relation/connector editing
  JSON Canvas for interchange format
```

Do not:

- pure self-build a full canvas engine in v2.4.1;
- adopt BlockSuite/AFFiNE as main editor stack in v2.4.1;
- use any external engine store as Coincides truth;
- collapse CanvasEdge and ObjectRelation into the same thing.

---

## 13. Sources

- tldraw persistence: https://tldraw.dev/docs/persistence
- tldraw store: https://tldraw.dev/sdk-features/store
- tldraw shapes: https://tldraw.dev/docs/shapes
- tldraw bindings: https://tldraw.dev/sdk-features/bindings
- tldraw default shapes: https://tldraw.dev/sdk-features/default-shapes
- tldraw options: https://tldraw.dev/sdk-features/options
- Excalidraw developer docs: https://docs.excalidraw.com/
- Excalidraw npm / API docs: https://www.npmjs.com/package/@excalidraw/excalidraw
- Excalidraw AppState docs: https://excalidraw-excalidraw.mintlify.app/api/types/app-state
- Excalidraw initial data: https://excalidraw-excalidraw.mintlify.app/api/initial-data
- Excalidraw restore utilities: https://excalidraw-excalidraw.mintlify.app/api/restore-utils
- BlockSuite Edgeless Editor: https://blocksuite.io/components/editors/edgeless-editor
- BlockSuite component types: https://blocksuite.io/guide/component-types
- BlockSuite GitHub overview: https://github.com/toeverything/blocksuite
- BlockSuite document-centric editors article: https://blocksuite.io/blog/document-centric.html
- React Flow introduction: https://reactflow.dev/docs/concepts/introduction
- React Flow Edge type: https://reactflow.dev/api-reference/types/edge
- React Flow Handle component: https://reactflow.dev/api-reference/components/handle
- React Flow Save and Restore: https://reactflow.dev/examples/interaction/save-and-restore
- JSON Canvas spec: https://jsoncanvas.org/spec/1.0/
- Obsidian Canvas product page: https://obsidian.md/canvas

