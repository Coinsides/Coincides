# Summary 2: 核心差异与竞品边界

**Created**: 2026-05-22
**Status**: Draft for Henry review
**Scope**: Core differences between Coincides and AFFiNE, tldraw, Excalidraw, BlockSuite, Notion, Obsidian/JSON Canvas, graph tools, and block editors.

---

## 1. Summary Purpose

这份 summary 用来回答：

```text
Coincides 借鉴了哪些成熟产品和工具？
但为什么 Coincides 不是它们的 clone、wrapper、fork 或普通替代品？
```

这份文档会直接影响：

- v2.4.x Canvas / Relation 版本边界；
- v2.5 Template / Editor / Package Studio 边界；
- v3.x graph-native architecture 规划；
- 未来开源工具采用、署名、adapter、fork 的判断。

---

## 2. Required Reading Completed

本 summary 写作前已重新阅读以下文件全文：

```text
open-source-adoption-matrix.md
canvas-engine-reference.md
block-editor-document-model-reference.md
diagram-connector-reference.md
multi-view-projection-reference.md
relation-layer-extra-ideas.md
```

---

## 3. Core Thesis

Coincides 的核心差异不是“也有 block，也有 canvas，也有 graph”。

核心差异是：

```text
source-grounded objects
  + reviewed semantic relations
  + proposal-first AI mutations
  + multiple projections
  + recoverable project/package structure
```

稳定边界：

```text
Objects are truth.
Relations are meaning.
Views are ways of seeing and operating.
Exports are outputs.
Packages are portable workspaces.
```

因此，Coincides 可以大量借鉴成熟产品，但不能把自己的事实源交给它们。

---

## 4. Difference From AFFiNE / BlockSuite

AFFiNE / BlockSuite 是最重要的架构参考之一。

我们借鉴：

- document / canvas 可以共享内容 substrate；
- PageEditor / EdgelessEditor 证明同一内容可以多视图呈现；
- block schema / service / view 的分层；
- edgeless canvas 的交互、frame、connector、widget；
- document-centric editor runtime。

但 Coincides 不能直接等于 AFFiNE：

- AFFiNE 的重点是 document/editor workspace；
- Coincides 的重点是 source-grounded knowledge workspace；
- AFFiNE 不拥有 Coincides 的 SourceAnchor、EvidenceSet、Proposal lifecycle、Material Reconciliation、ObjectRelation review gate；
- BlockSuite block 是 editor framework block；
- Coincides NoteBlock 是 source-grounded learning/content object；
- Coincides 的 AI 结构修改必须 proposal-first；
- Coincides 需要未来 `.coincides` package 恢复 source/evidence/relation，而不只是恢复 editor document。

关键差异：

```text
AFFiNE proves document/canvas shared runtime.
Coincides needs source/evidence/proposal/relation sovereignty on top of that idea.
```

Roadmap impact:

- v2.4 不采用 AFFiNE dual-mode UI；
- v2.4 采用 canvas-first single surface；
- BlockSuite 继续作为架构参考；
- v2.5 后如需 editor spike，也必须 adapter-first，不做 BlockSuite migration。

---

## 5. Difference From tldraw

tldraw 是 v2.4.1 最强的 Canvas adapter 候选。

我们借鉴：

- pan / zoom / select / move；
- infinite canvas SDK；
- custom shapes；
- arrows / bindings；
- frames；
- store / session split；
- shape migrations；
- mature interaction layer。

但 Coincides 不能变成 tldraw wrapper：

- tldraw store 不能成为 Coincides project truth；
- tldraw shape props 不能是 NoteBlock / Source / Evidence 的唯一存储；
- tldraw arrow binding 不等于 ObjectRelation；
- tldraw snapshot 只能是 cache / sidecar / render fidelity，不能替代 `.coincides` package；
- tldraw shape IDs 不能成为永久 graph IDs；
- tldraw 的 license / downstream terms 必须通过 External Tool Gate。

关键差异：

```text
tldraw owns canvas interaction.
Coincides owns knowledge objects and semantic relations.
```

Roadmap impact:

- v2.4.1 可以尝试 tldraw adapter spike；
- 必须能从 Coincides DB 重建 canvas；
- tldraw snapshot 缺失时不能丢失核心工作区；
- 如果 tldraw gate 失败，使用 lightweight fallback，不阻塞 v2.4。

---

## 6. Difference From Excalidraw

Excalidraw 是很好的轻量白板和导出参考。

我们借鉴：

- hand-drawn / rough visual feel；
- simple scene model；
- arrows / frames；
- PNG / SVG / scene export；
- lightweight whiteboard interaction；
- visual communication simplicity。

但 Coincides 不能只是 Excalidraw scene：

- Excalidraw element 是 visual-first；
- Coincides object 是 source/evidence/proposal/relation-aware；
- `.excalidraw` scene 不足以表达 ObjectRelation 状态、EvidenceSet、Proposal history、AI policy；
- scene restore 不能等同于 source-grounded project restore。

关键差异：

```text
Excalidraw is excellent at visual sketching.
Coincides needs recoverable source-grounded semantics.
```

Roadmap impact:

- Excalidraw 是 reference/fallback；
- 可作为 export / sketch / annotation idea；
- 不作为第一 structured LearningCanvas engine。

---

## 7. Difference From Notion

Notion 是 block/page/database/product UX 参考。

我们借鉴：

- broad block taxonomy；
- page/database/property split；
- templates；
- views / filters / sorts / groups；
- linked views；
- page-like reading and editing expectations；
- database view 作为 first-class resource 的思路。

但 Coincides 不能变成 Notion clone：

- Notion block 不天然 source-grounded；
- Notion database relation 不等于 evidence-backed ObjectRelation；
- Notion template 不等于 Coincides template with source_behavior / relation_behavior / proposal_behavior；
- Notion AI 不是围绕 source/evidence/proposal review gate 设计；
- Coincides 不应该把 editor block 当作全部真相；
- Coincides 的 ViewPreset 必须支持 source inspection、relation layers、AI operation scope、package/export recoverability。

关键差异：

```text
Notion organizes user-authored workspace objects.
Coincides organizes source-grounded, reviewable, AI-readable knowledge objects.
```

Roadmap impact:

- v2.5 可以借鉴 Notion templates / views；
- 但模板变化不能静默迁移旧 NoteBlocks；
- ViewPreset 可以借鉴 Notion view concept，但必须扩展到 source/evidence/relation/canvas/export。

---

## 8. Difference From Obsidian / JSON Canvas

Obsidian / JSON Canvas 是 canvas interoperability 和 local-first reference。

我们借鉴：

- markdown/vault local-first spirit；
- notes can be embedded on canvas；
- canvas node/edge JSON interchange；
- graph/backlink view；
- portable file thinking。

但 Coincides 不能停留在 JSON Canvas 级别：

- JSON Canvas node/edge 太轻，不能表达 source/evidence/proposal lifecycle；
- Obsidian backlink 不等于 typed ObjectRelation；
- canvas-only links 和 graph/backlinks 容易分裂；
- Coincides 必须明确 CanvasEdge 与 ObjectRelation 的桥；
- `.coincides` package 必须保存 objects、relations、canvas、bindings，而不只是 visual nodes/edges。

关键差异：

```text
JSON Canvas can describe a visual canvas.
Coincides package must reconstruct a source-grounded workspace.
```

Roadmap impact:

- JSON Canvas 可作为 export/reference sidecar；
- `.coincides` package 必须自定义；
- package import 必须报告 degraded CanvasEdges、broken relations、stale bindings。

---

## 9. Difference From React Flow / Diagram Tools

React Flow、diagrams.net、yFiles、GoJS、Mermaid 等是 connector / diagram / flow reference。

我们借鉴：

- handles / ports；
- node-edge editing；
- reconnect；
- labels；
- auto-layout；
- flowchart conventions；
- generated diagrams；
- relation graph visualization。

但 Coincides 不能变成流程图工具：

- diagram edge 不等于 accepted semantic relation；
- diagram layout 不等于 user knowledge truth；
- auto-layout 不能静默重排用户确认过的 canvas；
- Mermaid code 不等于 interactive relation layer；
- React Flow 更适合 relation editor / extracted graph view，不适合 main LearningCanvas。

关键差异：

```text
Diagram tools edit diagrams.
Coincides uses diagrams and connectors to expose reviewed knowledge relations.
```

Roadmap impact:

- v2.4.4 可评估 React Flow 作为 relation editor；
- Mermaid 可作为 generated DiagramBlock；
- auto-layout 应生成 proposal / preview，而不是直接重写 authored canvas。

---

## 10. Difference From Graph Tools / Graph Database Thinking

Cytoscape.js、AntV G6、Neo4j、GraphRAG 等是 graph view / graph-native reference。

我们借鉴：

- property graph thinking；
- typed nodes and edges；
- graph traversal；
- relation filtering；
- topic-specific subgraph extraction；
- GraphRAG retrieval paths；
- Neo4j / Cypher as future graph-native candidate。

但 Coincides 现在不能直接变成 graph database UI：

- v2.x object model 还在稳定；
- final node set 还不确定；
- SourceAnchor / EvidenceSet / Proposal history 在 graph-native 里怎么表示仍需研究；
- CanvasNode 可能只是 projection，不一定是 graph node；
- ObjectRelation 是未来 graph edge candidate，但 v2.x 仍应 SQLite-first；
- graph visualization 不是作者工作台本身。

关键差异：

```text
Graph tools expose graph structure.
Coincides must first decide what deserves to become graph structure.
```

Roadmap impact:

- v2.x 继续 graph-ready SQLite；
- v3.x 评估 Neo4j-backed graph-native architecture；
- 需要保留 graph-native migration notes；
- 不提前把全部产品变成 graph DB migration 项目。

---

## 11. Difference From Generic Block Editors

ProseMirror、Tiptap、Lexical、BlockNote、BlockSuite 都是 editor reference。

我们借鉴：

- document tree；
- schema；
- nodes / marks；
- commands；
- history；
- selection；
- custom nodes；
- rich inline editing。

但 Coincides 不能把 editor document 作为 domain model：

- EditorNode 只编辑内容；
- NoteBlock 才拥有 learning truth；
- editor undo 不等于 proposal history；
- editor tree 不等于 ObjectRelation；
- inline source marker 应引用 SourceAnchor，而不只是粘贴 citation text；
- rich editor 应该是 adapter，不是 Coincides data model。

关键差异：

```text
Generic block editors own editing state.
Coincides owns source-grounded NoteBlock state.
```

Roadmap impact:

- v2.4.1 不替换 NoteBlock editor；
- v2.5 可做 rich editor adapter spike；
- editor spike 必须证明 source markers、template metadata、unknown metadata、proposal-first semantic changes 可保留。

---

## 12. Difference From Plain AI Tutor / Chat RAG

Coincides 不是单纯 AI tutor 或聊天式 RAG 工具。

我们借鉴：

- LLM 能解释、总结、重写、生成；
- RAG 能从 source chunks 找相关材料；
- GraphRAG 能用关系结构引导检索。

但 Coincides 的重点不是让 AI “更会聊天”。

Coincides 的重点是让 AI 在明确对象、来源、关系、视图、proposal gate 内工作：

```text
select objects
  -> ask AI
  -> generate proposal
  -> review / apply
```

AI 可以回答问题，但它更重要的角色是：

- 整理 source-grounded objects；
- 生成 proposal；
- 推荐 relation；
- 帮助 layout；
- 解释 accepted relation；
- 对选中对象做局部操作；
- 留下可观察、可审查的工作痕迹。

关键差异：

```text
AI chat gives answers.
Coincides gives AI a navigable, reviewable workbench.
```

Roadmap impact:

- AI-readable structure 是产品优势；
- AI-owned structure 是产品风险；
- v2.4 / v2.5 必须保留 selected object scope 和 proposal-first 机制；
- 未来 AI tutor 可以自然生长，但不应该吞掉 source/evidence/relation 工作台方向。

---

## 13. Confirmed Boundaries

- Coincides is not an AFFiNE clone.
- Coincides is not a tldraw wrapper.
- Coincides is not an Excalidraw scene manager.
- Coincides is not a Notion clone.
- Coincides is not a JSON Canvas file editor.
- Coincides is not a generic graph visualization tool.
- Coincides is not a generic block editor.
- Coincides is not a plain AI tutor or chat RAG app.

Positive definition:

```text
Coincides is a source-grounded information workspace
where learning/content objects, evidence, reviewed relations,
canvas projections, view presets, and AI proposals
remain reconstructable, inspectable, and portable.
```

---

## 14. Roadmap Impact

### v2.4.x

v2.4 should build a canvas-first document surface, but canvas must remain projection.

It should adopt mature interaction tooling only through adapter, and it should preserve CanvasNode / CanvasEdge / ObjectRelation separation.

### v2.5.x

v2.5 should build template / domain / style / editor layers, but template/editor systems must not become arbitrary low-level type creation or editor-truth migration.

### v3.x

v3.x should evaluate graph-native architecture, especially Neo4j, after v2.x answers what the durable nodes, edges, provenance, projections, and package objects actually are.

---

## 15. Final Position

Coincides should learn aggressively from mature systems.

But the product identity is not:

```text
Notion + canvas
tldraw + notes
AFFiNE clone
graph database UI
AI chat over files
```

The product identity is:

```text
source-grounded objects
  + reviewed semantic relations
  + canvas / graph / page / source / report views
  + proposal-first AI operations
  + recoverable project packages
```

This is the boundary that lets us use external tools without becoming them.

