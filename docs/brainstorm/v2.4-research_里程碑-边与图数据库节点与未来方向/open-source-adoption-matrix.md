# v2.4 Open-source Adoption / Fork Feasibility Matrix

**Created**: 2026-05-22
**Status**: Research report 1
**Scope**: Open-source / source-available tool adoption strategy for Canvas, relation editing, graph visualization, block editing, and future package/export work.

---

## 1. Executive Summary

本轮调研的核心结论：

```text
Coincides 应该大胆使用开源和成熟工具。
但 Coincides 不能把自己的数据主权交给任何外部工具。
```

更具体地说：

```text
可以用成熟工具解决交互、渲染、布局、导出、编辑器体验。
不可以让成熟工具成为 NoteBlock / Source / Evidence / Proposal / Relation 的唯一事实源。
```

当前推荐：

```text
v2.4.1:
  tldraw adapter spike 是最值得尝试的方向。
  但必须通过 External Tool Gate，明确 license key / hobby license / downstream 用户问题。

v2.4.4:
  React Flow 可以作为 relation / connector editor 候选。
  Cytoscape.js 或 AntV G6 可作为 graph view / extracted subgraph 候选。

v2.5+:
  ProseMirror / Tiptap / Lexical 可以用于重新评估 NoteBlock editor。
  BlockSuite / AFFiNE 继续作为架构参考，不建议现在 fork。

长期:
  JSON Canvas / Excalidraw scene / tldraw snapshot 都可以作为 package/export sidecar 参考。
  但 `.coincides` 工程包必须由 Coincides 自己定义。
```

---

## 2. Adoption Categories

本报告使用五类判断：

| Category | Meaning |
| --- | --- |
| Can use directly | 可以作为依赖直接接入，风险较低，边界清晰 |
| Can use through adapter | 可以使用，但必须包在 Coincides adapter 后面 |
| Can fork / adapt | 可以 fork 或深度改编，但维护成本需要正式接受 |
| Reference only | 只作为架构、产品、交互参考 |
| Avoid for now | 当前阶段不适合引入 |

这里的判断不等于永久结论。它只服务于 v2.4.x / v2.5 前的路线选择。

---

## 3. High-level Matrix

| Tool | Category | Best Use | Main Risk | Current Recommendation |
| --- | --- | --- | --- | --- |
| tldraw | Can use through adapter | Mature canvas interaction, custom shapes, arrows, bindings, frames | SDK license key / production terms; store may become too central | Strong v2.4.1 adapter candidate, not truth store |
| Excalidraw | Can use through adapter / Reference only | Lightweight whiteboard, sketching, export, scene model | Scene-first, less structured for Coincides source/evidence model | Reference/fallback, not primary structured engine |
| BlockSuite / AFFiNE | Reference only for now | Document/canvas shared architecture, edgeless editor model | Full editor platform, heavy adoption/fork cost | Study deeply; do not adopt in v2.4.1 |
| React Flow / xyflow | Can use directly or through adapter | Node/edge/handle editor, relation graph UI | Not a general canvas or page-like workspace | Candidate for v2.4.4 relation editor |
| Cytoscape.js | Can use directly | Graph visualization, graph analysis, layouts | Better for graph view than freeform canvas authoring | Candidate for extracted graph views |
| AntV G6 | Can use directly | Graph visualization, layouts, Chinese ecosystem familiarity | Larger visualization framework, version/license history needs confirmation | Candidate for graph view comparison |
| JSON Canvas | Reference only | Interchange format for canvas nodes/edges | Too simple for source/evidence/proposal truth | Use as export/reference, not engine |
| ProseMirror / Tiptap | Can use through adapter | Rich text/block editor foundation | Can become editor-platform migration | v2.5+ NoteBlock editor candidate |
| Lexical | Can use through adapter | Modern editor runtime, structured editor state | Requires custom block/source integration | v2.5+ NoteBlock editor candidate |
| Mermaid | Can use directly | Text-defined diagrams and exportable diagrams | Not interactive canvas editing | Useful for generated diagram blocks |
| diagrams.net / draw.io | Reference only | Mature diagramming UX, connectors, shape library | Full app, not small embeddable core for our model | Reference for connector/style UX |

---

## 4. Tool-by-tool Notes

### 4.1 tldraw

**Category**: Can use through adapter

tldraw is still the strongest candidate for a v2.4.1 Canvas adapter spike.

Why it is attractive:

- mature infinite canvas SDK;
- pan / zoom / select / move already solved;
- default shapes, arrows, frames, images, embeds, bookmarks;
- custom shapes;
- persistent bindings between arrows and shapes;
- document/session split;
- migrations and store architecture;
- good fit for rendering Coincides CanvasNode / CanvasEdge as engine objects.

Why it must be gated:

- tldraw SDK is source-available, not permissively open-source under the SDK license;
- production use requires a trial, commercial, or hobby license key;
- hobby/non-commercial use may require watermark display;
- downstream users may need their own valid license if the SDK is included in an open-source Coincides distribution;
- if we deeply depend on tldraw store, later replacement becomes expensive.

Recommended v2.4.1 use:

```text
Use tldraw only behind a CanvasEngineAdapter.
Persist Coincides CanvasNode / CanvasEdge in our DB.
Treat tldraw snapshot as optional projection cache.
Do not store NoteBlock / Source / Evidence truth only inside shape props.
```

Adoption gate:

```text
Henry must explicitly approve tldraw trial/hobby/commercial/license-key path
before production-like integration.
```

Verdict:

```text
Best v2.4.1 technical candidate.
License and downstream terms are the main concern.
```

### 4.2 Excalidraw

**Category**: Can use through adapter / Reference only

Excalidraw is excellent for lightweight whiteboard and hand-drawn communication.

Why it is attractive:

- widely used;
- embeddable React package;
- simple scene model;
- strong export story;
- good arrow/frame/sketch UX;
- `.excalidraw` scene format is easy to reason about;
- good reference for future package/export sidecars.

Why it may not be primary:

- scene elements are visual-first;
- source/evidence/proposal semantics would need a large bridge layer;
- less ideal for source-grounded structured objects than tldraw custom shapes;
- relation layers and AI-readable edges would still be mostly our work.

Possible uses:

- fallback if tldraw license is unacceptable;
- export / scene snapshot reference;
- sketch-style canvas mode later;
- light annotation or diagram tool reference.

Verdict:

```text
Useful reference and possible fallback.
Not the first choice for structured CanvasNode projection.
```

### 4.3 BlockSuite / AFFiNE

**Category**: Reference only for now

BlockSuite / AFFiNE is highly relevant because it proves a document/canvas shared runtime can work.

Why it is attractive:

- PageEditor and EdgelessEditor model;
- shared document substrate across document and canvas modes;
- rich block system;
- edgeless editor with shapes/connectors/frames/groups/widgets;
- closest known architecture reference to "single object graph, multiple projections."

Why not adopt now:

- it is a full editor framework, not a small canvas library;
- adoption may become a platform migration;
- Coincides already has source/evidence/proposal/reconciliation concepts that AFFiNE does not own;
- fork cost would be high;
- our NoteBlock taxonomy and source-grounded learning model would still need custom integration;
- v2.4.1 needs an adapter experiment, not a full editor replacement.

Potential future use:

- architecture reference for page/canvas shared model;
- block runtime ideas for v2.5+;
- interaction reference for edgeless mode;
- maybe deeper evaluation if our own NoteBlock editor becomes the main bottleneck.

Verdict:

```text
Study seriously, do not fork now.
```

### 4.4 React Flow / xyflow

**Category**: Can use directly or through adapter

React Flow is not a whiteboard engine, but it is very strong for relation/connector editing.

Why it is attractive:

- nodes, edges, handles/ports are first-class;
- custom nodes and custom edges;
- save/restore nodes, edges, viewport;
- MIT license;
- fits semantic relation editing better than general whiteboard tools;
- good candidate for topic-specific extracted graph views.

Why not primary canvas:

- it is diagram/flow oriented;
- not ideal for A4-like note pages, free positioning of rich blocks, stickers, frames, hand-drawn objects, or general whiteboard UX;
- if used as the only Canvas engine, it may make Coincides feel like a flowchart app.

Best fit:

```text
v2.4.4 Canvas Edges + BlockRelation Seed
RelationLayer editor
AI-suggested relation review
extracted topic graph views
```

Verdict:

```text
Strong relation editor candidate.
Not main canvas engine.
```

### 4.5 Cytoscape.js

**Category**: Can use directly

Cytoscape.js is a mature graph visualization and analysis library.

Why it is attractive:

- MIT license;
- graph theory model plus renderer;
- layouts and first-party extensions;
- can visualize relational data;
- useful for topic-specific subgraph extraction;
- can support AI-readable graph inspection without becoming the source of truth.

Why not primary canvas:

- graph visualization is not the same as freeform canvas editing;
- less suited for page-like layout and NoteBlock authoring;
- user-authored whiteboard interactions would need separate UX.

Best fit:

```text
Graph view
RelationLayer inspection
topic-specific extracted subgraph
AI reading path visualization
```

Verdict:

```text
Good graph-view candidate for v2.4.x / v3.x research.
```

### 4.6 AntV G6

**Category**: Can use directly

AntV G6 is another strong graph visualization candidate.

Why it is attractive:

- active JavaScript graph visualization framework;
- Chinese ecosystem familiarity may help if we later consider domestic docs/examples/community;
- suitable for graph layouts and interactive graph views;
- MIT for current major versions according to package metadata sources.

Risks:

- larger visualization stack;
- version/license history should be checked carefully before adoption;
- not a freeform canvas editor;
- may overlap with Cytoscape.js / React Flow.

Best fit:

```text
Compare with Cytoscape.js for extracted graph views.
Possibly useful for Chinese-language ecosystem and graph visualization patterns.
```

Verdict:

```text
Worth comparing, not a main Canvas engine.
```

### 4.7 JSON Canvas

**Category**: Reference only

JSON Canvas is useful because it gives a simple public model for canvas interoperability.

Why it is attractive:

- simple nodes and edges;
- positions, sizes, colors;
- open canvas interchange mindset;
- useful for Obsidian-style canvas export/import reference.

Why insufficient:

- does not represent Coincides source/evidence/proposal lifecycle;
- does not represent relation status, AI policy, confidence, provenance, or package levels;
- visual graph cannot become knowledge truth.

Best fit:

```text
external export
import/export sidecar
minimum canvas fallback model
inspiration for `.coincides` projection section
```

Verdict:

```text
Reference/export format, not internal truth.
```

### 4.8 ProseMirror / Tiptap

**Category**: Can use through adapter

ProseMirror / Tiptap are serious candidates for a future richer NoteBlock editor.

Why they are attractive:

- mature rich-text editing foundations;
- schema-driven document model;
- extensibility;
- many editor features already solved;
- Tiptap lowers adoption friction over raw ProseMirror.

Risks:

- may pull Coincides toward an editor-framework data model;
- integrating source references, template metadata, NoteBlock fields, proposals, and canvas projection could be complex;
- too much for v2.4.1.

Best fit:

```text
v2.5+ NoteBlock editor upgrade research
structured block fields / rich inline editing
```

Verdict:

```text
Do not adopt in v2.4.1.
Re-evaluate for v2.5 template/block editor work.
```

### 4.9 Lexical

**Category**: Can use through adapter

Lexical is another rich editor candidate.

Why it is attractive:

- modern editor runtime;
- custom nodes;
- structured editor state;
- good React ecosystem fit;
- may support custom block nodes well.

Risks:

- source/evidence/proposal integration remains custom;
- still requires a careful adapter boundary;
- may not solve canvas/whiteboard needs.

Best fit:

```text
v2.5+ NoteBlock rich editor comparison with ProseMirror/Tiptap.
```

Verdict:

```text
Keep as editor candidate, not v2.4 Canvas candidate.
```

### 4.10 Mermaid

**Category**: Can use directly

Mermaid is not a canvas engine, but it can be useful for diagram blocks.

Why it is attractive:

- text-defined diagrams;
- easy AI generation;
- good for flowcharts, sequence diagrams, class diagrams, etc.;
- can render inside a NoteBlock or report;
- low interaction burden compared with full diagram editing.

Risks:

- not a visual editor;
- generated diagrams may be hard for users to modify unless paired with a visual editor;
- does not solve canvas relation editing.

Best fit:

```text
diagram/code-like block type
AI-generated diagram proposal
exportable report fragments
```

Verdict:

```text
Useful supporting tool, not Canvas foundation.
```

### 4.11 diagrams.net / draw.io

**Category**: Reference only

diagrams.net is a mature diagramming product reference.

Why it is useful:

- connector UX;
- shape libraries;
- diagram templates;
- grouping/layers;
- export expectations.

Why not adopt now:

- full app, not small focused engine;
- our source-grounded object model would not naturally live inside it;
- embedding/forking would be a large integration project.

Verdict:

```text
Good reference for connectors, style libraries, and diagram template UX.
Not v2.4.1 dependency.
```

---

## 5. Direct Use vs Adapter vs Fork

### 5.1 Direct Use

Direct use is acceptable when:

- tool output is not core truth;
- license is permissive or clearly acceptable;
- the tool solves a bounded problem;
- replacing it later would not destroy Coincides data.

Examples:

- Mermaid for rendered diagram blocks;
- Cytoscape.js for extracted graph visualization;
- React Flow for a specific relation editor view, if scoped.

### 5.2 Adapter Use

Adapter use is required when:

- tool has its own strong data model;
- users interact with it directly;
- tool state could drift from Coincides state;
- engine replacement must remain possible.

Examples:

- tldraw;
- Excalidraw;
- React Flow if used for editable ObjectRelations;
- ProseMirror / Tiptap / Lexical if used for NoteBlock editing.

Adapter must define:

```text
Coincides -> tool mapping
tool event -> allowed Coincides update
tool snapshot -> cache / sidecar rules
tool deletion -> non-destructive rules
package/export behavior
```

### 5.3 Fork / Adapt

Forking should be rare.

Fork only if:

- the tool is a near-perfect strategic match;
- license allows the intended use;
- upstream extension points are insufficient;
- maintenance cost is acceptable;
- the fork can be isolated in a clear subsystem;
- Henry explicitly accepts long-term maintenance burden.

Current fork judgment:

```text
tldraw:
  do not fork first; adapter first.

Excalidraw:
  do not fork first; reference/fallback first.

BlockSuite/AFFiNE:
  do not fork now; too large and strategically risky.

React Flow:
  no fork needed; likely usable as library.
```

---

## 6. External Tool Gate Checklist

Before adding any dependency or fork, answer:

- Why is existing Coincides code insufficient?
- Is the tool solving rendering/interaction, or trying to own truth?
- Can Coincides rebuild core state without this tool?
- What is the license?
- Does production use require a license key?
- Does open-source distribution affect downstream users?
- Does it work in local Windows development?
- Does it require cloud service?
- Does it introduce heavy build/runtime complexity?
- Does it support adapter boundaries?
- Can we export or serialize enough state for `.coincides` packages?
- What is the fallback if it is removed later?

For tldraw specifically, also answer:

- trial / hobby / commercial license path;
- watermark requirement;
- downstream license requirement;
- whether a public license key can be shipped;
- whether the SDK is acceptable for Henry's intended distribution model.

---

## 7. Recommendation For v2.4.1

Recommended v2.4.1 decision:

```text
Do a tldraw adapter spike after External Tool Gate approval.
Keep a lightweight React/CSS fallback.
Do not fork any canvas engine in v2.4.1.
Do not adopt BlockSuite/AFFiNE in v2.4.1.
Do not make external engine store the truth.
```

Minimum spike should prove:

- render existing CanvasNodes;
- move nodes and save positions back to Coincides;
- create simple visual connectors without committing semantic ObjectRelation too early;
- keep NoteBlock/source/evidence data outside tldraw;
- rebuild the canvas view from Coincides DB if tldraw snapshot is missing;
- record license/runtime findings in review.

If tldraw gate fails:

```text
Use lightweight self-built viewer/editor for v2.4.1,
continue Excalidraw / React Flow / Cytoscape research for scoped features,
do not block all v2.4 progress.
```

---

## 8. Recommendation For Later Versions

### v2.4.4 Relation / Connector Work

Candidates:

- React Flow for relation editor;
- tldraw arrows/bindings for canvas-visible connectors;
- Cytoscape.js / AntV G6 for extracted graph view;
- Mermaid for generated diagram blocks.

Key decision:

```text
Visual connector and semantic relation should remain separate until reviewed/accepted.
```

### v2.5 Template / Block / Style Engine

Candidates:

- ProseMirror / Tiptap;
- Lexical;
- BlockSuite as reference;
- Mermaid as generated diagram block;
- design-token / JSON schema form tools to be researched later.

Key decision:

```text
Template engine should own user-facing structure and style,
not the low-level canvas engine.
```

### v3.x Graph-native / Mature Workspace

Candidates to re-evaluate:

- graph database / graph index tools;
- Cytoscape.js / AntV G6 / Sigma.js for graph views;
- mature package/export tooling;
- deeper canvas engine integration or replacement.

Key decision:

```text
v3.x can become graph-native only after v2.x collects enough object/relation evidence.
```

---

## 9. Final Recommendation

The best near-term strategy:

```text
Use mature tools for what they are good at.
Keep Coincides truth outside them.
Prefer adapter before fork.
Fork only after an adapter proves insufficient.
```

Most important v2.4.1 recommendation:

```text
tldraw adapter spike, gated by license and data-sovereignty checks.
```

Most important long-term recommendation:

```text
Coincides should become tool-assisted, not tool-owned.
```

---

## 10. Sources

- tldraw license: https://tldraw.dev/community/license
- tldraw SDK license file: https://github.com/tldraw/tldraw/blob/main/LICENSE.md
- tldraw npm package: https://www.npmjs.com/package/@tldraw/tldraw
- Excalidraw developer docs: https://docs.excalidraw.com/
- Excalidraw npm package: https://www.npmjs.com/package/@excalidraw/excalidraw
- BlockSuite Edgeless Editor: https://blocksuite.io/components/editors/edgeless-editor
- BlockSuite component types: https://blocksuite.io/guide/component-types
- BlockSuite package/license reference: https://npm.io/package/@blocksuite/editor
- React Flow / xyflow open source: https://xyflow.com/open-source
- React Flow docs: https://reactflow.dev/
- Cytoscape.js docs: https://js.cytoscape.org/
- Cytoscape.js GitHub: https://github.com/cytoscape/cytoscape.js
- AntV G6 installation/docs: https://g6.antv.vision/manual/getting-started/installation
- AntV G6 package/license reference: https://packages.ecosyste.ms/registries/npmjs.org/packages/%40antv%2Fg6/versions
- JSON Canvas specification: https://jsoncanvas.org/spec/1.0/
