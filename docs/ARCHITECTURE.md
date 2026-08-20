> **状态 (Status)**: draft
> **层 (Layer)**: 宪法 / Constitution（架构边界；**正文已知脱节**）
> **日期 (Updated)**: 2026-06-06
> **权威 (Authoritative)**: 否（2026-08-19 降级；冲突处以 `agent-ops/current-state/` 与方向宪章为准）

> **⚠️ 脱节公告 (2026-08-19)**：本文成于 2026-06-06。已确认失效点：①§4 / §5 通篇沿用 `ObjectRelation` 词汇 —— 旧三表 `object_relations / canvas_edges / relation_layers` 已由 migration 047 落表，**Relation 的唯一 durable endpoint = `Item`**；②§5 Source Reconstruction Adapter 的"入库即重建"前提已被更替为**三层梯子 + 解析按需**（宪章 §3）；③缺「MCP 工具面 / 末端执行器」边界章节，而该边界是 V2.BN.12 必修①。
>
> 注意：方向宪章 §2 / §10 仍引用本文 §5.4 的 GraphRAG sidecar 结论 —— **该结论有效，其周边词汇已过时**。盘点见 `docs/agent-ops/analysis/2026-08-20-doc-triage-assessment.md`（冲突 C5 / C6 / C8）。重划待批次二。

# Coincides Architecture

**Updated**: 2026-06-06
**Status**: Active architecture boundary for the Better Notebook track
**Active roadmap**: `docs/ROADMAP.md` （2026-08-20 起；旧 `docs/Coincides-Better-Notebook-Roadmap.md` 已整体冻结）

---

## 1. Architecture Role

This document describes the active architecture boundary for Coincides after the v2.0-v2.5.6 foundation work.

The earlier v2 foundation remains valuable: notes, source snapshots, source scopes, source boards, learning canvas, canvas edges, object relations, template definitions, composition templates, domain packages, package import/export, and proposal-first mutation are the current substrate.

The next track is not more raw foundation expansion. It is Better Notebook productization: turning the substrate into a mature notebook/report surface.

---

## 2. Current Stack

Coincides currently runs as a local-first web application stack:

- frontend: React, TypeScript, Vite, Zustand-style client state, CSS modules;
- backend: Node.js, Express, TypeScript runtime;
- database: SQLite with additive migrations;
- math rendering: KaTeX;
- review: FSRS;
- document processing: upload, parse, chunk, index, search;
- AI workflow: proposal-first operations and review/apply behavior.

This stack remains the implementation base for Better Notebook work.

---

## 3. Core Architecture Principle

Coincides Core owns truth.

```text
Coincides Core
  owns content, source, relation, template, package, operation history.

Editor / Canvas Surface
  renders and edits projections of core objects.

Adapters / External Tools
  produce candidates, proposals, indexes, or projections.
  They do not become canonical truth by default.
```

This applies to AFFiNE/BlockSuite, GraphRAG, OCR/VLM tools, source reconstruction tools, external agents, import/export packages, and future graph databases.

---

## 4. Better Notebook Object Boundary

### Content Truth

`NoteBlock` is the canonical content unit. It stores meaningful content such as paragraph, heading, formula, definition, proof, example, exercise, source quote, callout, code, or future template-backed block variants.

Editing text or structured content updates NoteBlock content. Moving or resizing does not.

Structured NoteBlocks may store template-guided field values. For example, a definition block may have `concept_name` and `description`; a formula block may have `formula_name`, `latex_input`, and `variables`. These fields are content truth. Their visual boxes, positions, typography, and page arrangement are layout/render state.

`TemplateDefinition` may define field schema and render guidance. Ordinary note editing changes field values and field layout. Changing the available fields belongs to Template Studio or another template-governance flow.

### Layout Truth

`BlockBox`, `CanvasNode`, placement, page position, size, z-order, and export role are layout/projection state.

Layout state answers:

- where the block appears;
- how large it is;
- whether it is page-in or page-out;
- whether it is formal or scratch;
- whether it is included in export;
- whether it is visible to AI by default.

### Page And Canvas Surface

The Better Notebook surface is page-first and canvas-backed.

- Page/document mode provides a stable writing and export surface.
- Canvas/reasoning mode provides room for scratch, derivation, local graph, and exploratory layout.

The surface is not the source of truth. It projects Coincides objects.

### Source Truth

Source objects preserve evidence and provenance:

- source document identity;
- source version identity;
- original material or registered source;
- normalized source snapshot;
- source anchor;
- source scope;
- source board;
- future source region.

Generated or user-authored blocks may attach source references later. A source-free user block is valid; an unsupported AI-generated claim should be visibly different.

Source truth belongs to Coincides Core. The editor/canvas surface may display source badges, inspectors, warnings, and pickers, but it must not own source truth. A source reference may point to an external source version or an internal artifact such as a note, report, section, or NoteBlock.

Source import intent belongs to Coincides Core. A source should be able to record whether it is being used as unprocessed evidence, a condensed note, an agent briefing, a human interpretation note, a draft report, a final report, a reasoning trace, or an archive-only material. This intent is not just UI text; it affects reconstruction, source-chain interpretation, AI visibility, and future alignment or merge proposals.

Condensed raw sources need preservation-first handling. A handwritten note, lecture note, or imported briefing may already encode layout, diagrams, formula placement, human interpretation, or reasoning state. Reconstruction adapters may recover regions and candidates, but they must not silently summarize, delete, or rewrite those materials as if they were unprocessed textbooks.

External source snapshots may become missing because a user deletes files outside the app. Source versions may become outdated, deprecated, archived, deleted, broken, degraded, or recovered. These states should be represented as source-chain health, not as editor runtime errors.

Internal source chain is a provenance graph. It is not the same thing as semantic `ObjectRelation`, although relation systems and future GraphRAG adapters may read source provenance as evidence input.

### Relation Truth

`ObjectRelation` is semantic relation truth. `CanvasEdge` or future `CanvasConnector` is visual/projection interaction.

Users may draw a connector without creating a confirmed relation. A confirmed relation requires a relation type, resolvable endpoints, and lifecycle state.

Relation design follows `docs/Coincides-Relation-Product-Design.md`.

### Link Truth

`Link` / `InternalLink` is navigation state. It lets the user jump to another note, block, page, source view, or future view target. It is not evidence truth and it is not semantic relation truth.

```text
Link:
  where to go.

SourceReference:
  what evidence supports this content.

ObjectRelation:
  what semantic relation exists between objects.
```

These may coexist on the same block, but one must not automatically create the others.

---

## 5. Adapter Boundary

Adapters are allowed and expected, but they must not replace Coincides Core.

### Editor Runtime Adapter

An editor runtime may render page/canvas objects and provide selection, text editing, layout, or connector interaction. It must map changes back to Coincides objects.

It must not swallow source grounding, NoteBlock identity, ObjectRelation identity, template metadata, or operation history.

### Source Reconstruction Adapter

OCR, VLM, formula recognition, web extraction, and layout extraction tools should produce:

```text
SourceRegion
  -> NoteBlockCandidate
  -> proposal
  -> reviewed NoteBlock / source anchor / source scope
```

They should not directly create final note truth without review.

Source reconstruction is not the same thing as note generation. Reconstruction recovers source regions, reading order, formulas, tables, image crops, diagrams, and layout evidence. Note generation decides what to select, condense, rewrite, merge, cite, or lay out as a refined note/report. Existing-note import may choose preservation-first reconstruction instead of summarization.

Visible arrows, spatial grouping, or diagram marks in an imported condensed source may become relation clues or relation candidates. They must not automatically create confirmed ObjectRelations.

Adapters, OCR/VLM tools, GraphRAG, importers, and external agents may produce source candidates, SourceRegions, indexes, or proposals. They must not overwrite canonical SourceVersion, SourceReference, or SourceChain truth directly.

### GraphRAG / Graph Adapter

GraphRAG may help discover candidate relationships or provide a query/index layer. It must not define Coincides relation truth.

Accepted ObjectRelations may be exported into a graph/RAG sidecar later, but the sidecar remains adapter/index state unless a future version explicitly changes the storage model.

### Package Adapter

`.coincides` packages and future import/export flows are portability boundaries. Import preview and records protect recovery and provenance. Packages do not silently overwrite existing truth.

---

## 6. Operation Safety

Structural changes should be reviewable, recoverable, and explainable.

Current foundation patterns remain valid:

- proposal-first mutation for risky generated or migration operations;
- operation batches for applied structural changes;
- migration/record tables for template, domain, package, and future relation changes;
- undo/redo for ordinary notebook editing where the user expects direct manipulation.

Ordinary block deletion should feel direct but must support undo. Dangerous migrations should remain proposal-first.

---

## 7. Active Product Surface Priorities

Better Notebook architecture should prioritize:

1. product shell and navigation;
2. natural page writing;
3. freeform NoteBlock boxes and layout mode;
4. page/canvas/export boundaries;
5. block visual language and control layer;
6. stable data contract;
7. source attachment UX;
8. relation definition runtime;
9. relation inspector and relation mode;
10. local relation graph and supernode folding;
11. concept-lite search and inspector.

Full AI note assembly should wait until the human writing and layout surface is stable.

---

## 8. Historical Notes

The closed v2.0-v2.5.6 roadmap remains historical foundation evidence in `docs/Coincides-Roadmap.md`.

Do not append Better Notebook feature work to the closed roadmap.
