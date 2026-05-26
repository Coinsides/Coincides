# Summary 4: 引擎与开源工具采用策略

**Created**: 2026-05-22
**Status**: Draft for Henry review
**Scope**: Canvas engine, whiteboard engine, connector tools, block editor tools, template/style tooling, external tool gate, and version-level adoption strategy.

---

## 1. Summary Purpose

这份 summary 用来回答一个现实问题：

```text
v2.4.1 以后，Coincides 到底应该自研哪些东西，接入哪些工具，只参考哪些工具？
```

它不是工具清单归档，而是后续 roadmap 和小版本 plan 的决策材料。

它会直接影响：

- v2.4.1 Canvas foundation 是否选择 tldraw adapter spike；
- v2.4.4 CanvasEdge / ObjectRelation / connector editing 的工具边界；
- v2.5 Template / Block / Style Engine 是否引入 rich editor；
- v3.x graph-native workspace 是否继续保持 external engine replaceable。

---

## 2. Required Reading Completed

本 summary 写作前已重新阅读以下文件全文：

```text
canvas-engine-reference.md
open-source-adoption-matrix.md
diagram-connector-reference.md
block-editor-document-model-reference.md
custom-template-style-engine-reference.md
relation-layer-extra-ideas.md
```

---

## 3. Core Thesis

Coincides 应该大胆使用成熟工具，但不能被成熟工具拥有。

稳定原则：

```text
Use mature tools for interaction, rendering, editing, layout, and export.
Keep Coincides truth in Coincides-owned objects, relations, proposals, and packages.
```

换句话说：

```text
Tool-assisted, not tool-owned.
```

外部工具可以帮助我们解决：

- pan / zoom / select / drag；
- whiteboard rendering；
- arrows / bindings / handles；
- graph visualization；
- rich text editing；
- diagram rendering；
- export sidecar；
- style/template editing UI。

外部工具不能接管：

- NoteBlock truth；
- Source / Evidence；
- Proposal lifecycle；
- ObjectRelation；
- RelationLayer；
- `.coincides` package truth；
- AI-readable accepted structure。

---

## 4. Confirmed: Adoption Categories

本轮总结使用五类采用级别。

| Category | Meaning |
| --- | --- |
| Direct use | 可直接作为依赖使用，问题边界窄，替换成本较低 |
| Adapter | 可使用，但必须包在 Coincides adapter 后面 |
| Fork / adapt | 可以深度改编，但必须接受长期维护成本 |
| Reference only | 只作为架构、交互或产品参考 |
| Avoid for now | 当前阶段不应引入 |

默认偏好：

```text
Direct use for bounded helpers.
Adapter for engines with their own state.
Reference before fork.
Fork only after adapter proves insufficient.
```

---

## 5. Tool Decision Matrix

| Tool | Recommended Category | Best Use | Not For | Timing |
| --- | --- | --- | --- | --- |
| tldraw | Adapter | Canvas / whiteboard interaction, custom shapes, arrows, bindings, frames | Coincides truth store | v2.4.1 spike candidate |
| Excalidraw | Adapter / Reference | Lightweight whiteboard, scene/export, hand-drawn visual style | Primary structured source-grounded canvas | fallback/reference |
| BlockSuite / AFFiNE | Reference only for now | document/canvas shared architecture, edgeless editor ideas | v2.4.1 dependency or fork | v2.5+ re-evaluate only if needed |
| React Flow | Direct / Adapter | relation editor, node-edge-handle interaction, extracted graph view | main LearningCanvas | v2.4.4 candidate |
| Cytoscape.js | Direct | graph view, relation inspection, topic subgraph visualization | freeform canvas authoring | v2.4.x/v3.x candidate |
| AntV G6 | Direct | graph visualization, Chinese ecosystem comparison | main canvas engine | compare with Cytoscape |
| JSON Canvas | Reference only | interchange/export/reference shape | internal truth format | package/export reference |
| ProseMirror / Tiptap | Adapter | rich NoteBlock editor, template field editing | v2.4.1 canvas foundation | v2.5 candidate |
| Lexical | Adapter | rich editor runtime, custom editor nodes | source/evidence/proposal truth | v2.5 candidate |
| BlockNote | Adapter / Reference | faster block editor UI expectations | domain truth model | v2.5 spike candidate |
| Mermaid | Direct | generated diagram blocks, report fragments | interactive canvas relation editing | supporting tool |
| diagrams.net / draw.io | Reference only | connector UX, shape libraries, diagram patterns | dependency/fork now | reference |
| Pure self-build | Avoid as full engine | fallback viewer / thin projection layer | mature whiteboard engine replacement | only if adapter path blocked |

---

## 6. v2.4.1 Decision

### 6.1 Recommended Path

v2.4.1 should use:

```text
Primary:
  tldraw adapter spike

Fallback:
  lightweight React/CSS canvas viewer/editor

Reference:
  Excalidraw for scene/export feel
  BlockSuite/AFFiNE for architecture
  React Flow for later relation editing
```

The v2.4.1 goal is not to build a perfect whiteboard.

The goal is:

```text
Can Coincides objects live on a usable canvas without losing data sovereignty?
```

### 6.2 Minimum v2.4.1 Spike Requirements

The tldraw adapter spike should prove:

- render CanvasNodes from Coincides data；
- move/select CanvasNodes；
- save x/y/size/order back to Coincides tables；
- open the target object from a CanvasNode；
- keep NoteBlock / Source / Evidence / Proposal outside tldraw store；
- rebuild the canvas from Coincides DB if tldraw snapshot is missing；
- avoid semantic ObjectRelation creation from arrows；
- record license/runtime findings in review。

### 6.3 What v2.4.1 Must Not Do

v2.4.1 should not:

- fork tldraw；
- adopt BlockSuite/AFFiNE；
- replace the NoteBlock editor；
- build full connector editor；
- build full relation layer UI；
- make external engine store the project truth；
- implement graph-native database migration。

### 6.4 External Tool Gate

tldraw must pass an External Tool Gate before production-like integration.

Required questions:

- What license path applies to Henry's local/personal use?
- What happens if the project is later open-sourced?
- Is a license key required?
- Is a watermark required?
- Do downstream users need their own license?
- Can the canvas still be rebuilt without tldraw snapshot?
- Can tldraw be removed or replaced later without losing Coincides truth?

If the gate fails:

```text
Use lightweight self-built Canvas viewer/editor for v2.4.1.
Do not block all v2.4 progress.
Continue adapter research separately.
```

---

## 7. v2.4.4 Connector / Relation Tool Strategy

v2.4.4 is where connector/relation work becomes serious.

The correct split is:

```text
CanvasEdge:
  visual connector.

ObjectRelation:
  semantic / AI-readable relation.

RelationLayer:
  relation collection / purpose / visibility layer.
```

Tool strategy:

- tldraw arrows/bindings can help with visible canvas connectors；
- React Flow can help with relation editor or extracted graph views；
- Cytoscape.js / AntV G6 can help with graph inspection；
- Mermaid can help with generated diagram blocks；
- diagrams.net / yFiles / GoJS remain UX capability references。

Do not make any tool's edge model equal to accepted ObjectRelation.

Recommended v2.4.4 implementation boundary:

```text
Coincides owns:
  CanvasEdge
  ObjectRelation
  RelationLayer
  relation status / visibility / confidence / provenance

External tool owns:
  visual drag
  edge drawing
  handle binding
  graph rendering
```

---

## 8. v2.5 Editor / Template / Style Tool Strategy

v2.5 is a better place than v2.4.1 to evaluate rich editor and template tooling.

### 8.1 Editor Tools

Candidate editor tools:

```text
Tiptap:
  mature ProseMirror ecosystem, easier than raw ProseMirror.

Lexical:
  modern React-friendly editor runtime.

BlockNote:
  faster block editor UI path.

BlockSuite:
  architecture reference, possible deeper study.
```

Recommended approach:

```text
adapter spike, not migration
```

Test with one or two real NoteBlock templates:

- definition.basic；
- formula.math；
- source.quote；
- exercise.general。

The editor must preserve:

- NoteBlock identity；
- template metadata；
- source markers；
- unknown metadata；
- proposal-first semantic changes；
- selectable object scope。

### 8.2 Template / Style Tools

Template and style engine should be mostly Coincides-owned.

Reason:

```text
Templates carry source behavior, relation behavior, proposal behavior, and agent-readable summaries.
```

These cannot be delegated to a generic style or form tool.

External tools may help with:

- schema-driven form UI；
- preview editors；
- code-like JSON/YAML editing；
- design-token editing；
- diagram block rendering。

But Coincides must own:

- TemplateDefinition；
- CompositionTemplate；
- StylePack；
- DomainPack；
- summary_for_agent；
- relation_behavior；
- source_behavior；
- proposal_behavior。

---

## 9. Package / Export Implications

All engine choices must support future `.coincides` packages.

Package truth should be:

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

External engine snapshots may exist as:

- fast render cache；
- fidelity sidecar；
- export artifact；
- debug data。

But if the engine snapshot is missing, Coincides must still restore the core workspace from its own objects.

Important recovery rule from Summary 3:

```text
CanvasEdge can degrade.
ObjectRelation must not silently disappear.
Binding can break.
Import must report.
```

This rule applies to every engine choice.

---

## 10. Graph-native / v3.x Implications

v2.x should remain SQLite-first and graph-ready.

External engines should not make v3.x graph-native migration harder.

Therefore:

- tldraw shape IDs must not become permanent graph IDs；
- Excalidraw element IDs must not become permanent graph IDs；
- React Flow edge IDs must not become accepted semantic relation IDs unless mapped through ObjectRelation；
- editor node IDs must not replace NoteBlock IDs；
- engine snapshots must remain projection/cache, not graph truth。

v3.x may evaluate Neo4j-backed graph-native architecture.

The v2.x engine strategy should make that possible by preserving:

- domain object IDs；
- relation endpoint target_type / target_id；
- relation provenance；
- projection-vs-truth boundaries；
- package import/export recoverability。

---

## 11. Open Questions

- Is tldraw's license path acceptable for Henry's personal/local use and possible future open-source distribution?
- Should v2.4.1 implement a tldraw spike directly, or first write a formal External Tool Gate note?
- If tldraw is used, should its snapshot be stored at all, or only generated on demand?
- Should React Flow enter v2.4.4 as a relation editor, or should tldraw arrows be enough for the first relation-backed edge seed?
- Should Cytoscape.js or AntV G6 be evaluated before v2.4.5, or deferred until topic-specific graph view work?
- Should v2.5 editor spike compare Tiptap, Lexical, and BlockNote with the same template fixtures?
- Should Mermaid be introduced as a first supporting tool for DiagramBlock before full connector editing?
- How much template/style editing should be form-first versus code-like advanced editing?
- How should external tool attribution be displayed if the project is later shared or open-sourced?

---

## 12. Confirmed Decisions

- Coincides should use mature tools where they clearly reduce engine burden.
- Coincides must not let external tools own truth.
- tldraw is the strongest v2.4.1 canvas adapter candidate.
- tldraw must pass license/data-sovereignty gate before production-like integration.
- Lightweight self-built canvas remains the fallback if tldraw gate fails.
- Excalidraw is reference/fallback, not first structured canvas choice.
- BlockSuite/AFFiNE is architecture reference, not v2.4.1 dependency.
- React Flow is a relation editor / extracted graph candidate, not main canvas.
- Cytoscape.js / AntV G6 are graph-view candidates, not authoring canvas engines.
- ProseMirror/Tiptap/Lexical/BlockNote are v2.5 editor candidates, not v2.4.1 decisions.
- Template/style/domain pack engine must be mostly Coincides-owned.
- External engine snapshots are optional cache/sidecar, not project truth.

---

## 13. Roadmap Impact

### v2.4.1

Create a formal Canvas Engine Gate and attempt a tldraw adapter spike if approved.

### v2.4.2 / v2.4.3

Keep canvas node layout and source-grounded projection data engine-independent.

### v2.4.4

Introduce CanvasEdge / ObjectRelation / RelationLayer boundary. Evaluate whether tldraw arrows are sufficient or whether React Flow should support relation editing.

### v2.4.5

Add relation layer switching, command patterns, selected object operations, and possibly early graph-view commands.

### v2.5

Run rich editor/template engine spikes:

- Tiptap；
- Lexical；
- BlockNote；
- BlockSuite reference；
- template/style/domain pack model。

### v3.x

Evaluate graph-native workspace with Neo4j as serious candidate while keeping canvas/editor engines replaceable.

---

## 14. Final Position

The best strategy is not:

```text
build everything ourselves
```

and not:

```text
hand the app to tldraw / AFFiNE / BlockSuite / React Flow
```

The best strategy is:

```text
Coincides owns the knowledge system.
Mature tools help render and operate it.
Adapters protect the boundary.
Packages preserve recoverability.
```

This lets v2.4 move quickly without sacrificing the long-term graph-native direction.

