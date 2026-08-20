> **状态 (Status)**: draft
> **层 (Layer)**: 宪法 / Constitution（概念数据模型；**正文已知脱节**）
> **日期 (Updated)**: 2026-06-06
> **权威 (Authoritative)**: 否（2026-08-19 降级）

> **⚠️ 脱节公告 (2026-08-19)**：本文成于 2026-06-06，**早于 V2.BN.9 Purpose / V2.BN.10 Source / V2.BN.11 Item + Relation 三层真相全部落地**，落后三个版本。现行数据真相以 `docs/agent-ops/current-state/README.md §3` 与各 migration 为准。盘点见 `docs/agent-ops/analysis/2026-08-20-doc-triage-assessment.md`。重划待批次二。

# Coincides Data Model

**Updated**: 2026-06-06
**Status**: Active conceptual model for the Better Notebook track
**Note**: This document distinguishes conceptual model boundaries from implemented SQLite tables.

---

## 1. Data Model Role

The Better Notebook track needs a clear separation between:

- content truth;
- layout/projection truth;
- source truth;
- relation truth;
- template/package capability truth;
- adapter/index state.

Existing SQLite tables remain the current implementation substrate. Future versions may add or change tables, but the conceptual ownership boundaries below should remain stable.

---

## 2. Project / Course

User-facing product language should prefer `Project`.

A project may represent:

- a course;
- a research workspace;
- a report package;
- a case file;
- a focused collection of source material.

Internal implementation names such as `course_id` may remain. They should be treated as engineering details, not product identity.

Project/Course is the main boundary for:

- source material;
- notes;
- NoteBlocks;
- canvas/page surfaces;
- relations;
- templates and domain packages when scoped;
- proposals and operation history.

---

## 3. Note

A `Note` is the user-facing document/workspace container.

It may contain:

- formal page content;
- scratch/thinking content;
- canvas placements;
- source-linked blocks;
- user-authored source-free blocks;
- relation-visible and relation-hidden structures.

A note is not merely a vertical list. Better Notebook should support page-first, canvas-backed layout.

---

## 4. NoteBlock

`NoteBlock` is content truth.

It stores meaningful content such as:

- paragraph;
- heading;
- definition;
- theorem;
- proof;
- formula;
- example;
- exercise;
- answer;
- source quote;
- callout;
- code;
- future template-backed variants.

Important rules:

- Moving a block does not change NoteBlock content.
- Resizing a block does not change NoteBlock content.
- User-authored blocks may exist without source references.
- AI-generated source-free claims should be distinguishable from user-authored source-free content.
- Template metadata helps render and interpret blocks but should not hide the underlying content.

Better Notebook should distinguish freeform blocks from structured blocks:

```text
Freeform block:
  paragraph / text / simple note.
  Content can remain ordinary rich text.

Structured block:
  definition / formula / theorem / proof / example / exercise / source quote / code.
  Content is stored as field values guided by a TemplateDefinition.
```

Structured block concepts:

- `FieldSchema`: template-defined field contract, such as `concept_name`, `description`, `latex_input`, `variables`, or `statement`.
- `FieldValue`: the actual value stored on one NoteBlock for one field.
- `FieldLayout` / `RenderTemplate`: how fields are arranged, styled, hidden, or resized on the page/canvas.

Structured fields are system-readable data. Field layout is presentation. A user may edit field values and adjust field layout, but adding, removing, or renaming fields is a template-editing action, not ordinary note editing.

Examples:

```text
DefinitionBlock.concept_name
  -> local graph node label

DefinitionBlock.description
  -> AI readable definition body

FormulaBlock.latex_input
  -> rendered formula and formula search payload
```

---

## 5. BlockBox / CanvasNode / Placement

`BlockBox`, `CanvasNode`, or placement state is layout/projection truth.

It answers:

- where a NoteBlock appears;
- page-in or page-out position;
- width and height;
- z-order;
- selected/hover/editing layout state;
- formal vs scratch role;
- included/excluded from export;
- AI visible/hidden by default.

One conceptual NoteBlock may later support multiple placements if reusable blocks or multi-view placement becomes explicit. Until then, ordinary user deletion should delete the block with undo rather than create hidden ghost placements.

---

## 6. Page / Canvas

Better Notebook uses a page-first, canvas-backed surface.

Conceptual states:

- locked page/document mode for writing and export;
- open canvas/reasoning mode for scratch work, derivations, and exploration;
- export preview mode;
- layout edit mode;
- relation mode;
- debug mode.

Page and canvas state should not become content truth.

---

## 7. Source Truth

Source truth preserves where information came from.

Important source concepts:

- `SourceDocument`: a source identity, such as a textbook, report, web article, PDF, Word file, image, code file, or other imported source.
- `SourceVersion`: a concrete snapshot of a SourceDocument at a specific time. References should bind to a version, not a vague mutable file identity.
- `SourceArtifact`: an internal Coincides object that can be cited later, such as a Note, Report, Section, or NoteBlock.
- `SourceReference`: a citation/provenance link from a NoteBlock, Note, Relation, or Section to an external SourceVersion or internal SourceArtifact.
- `SourceUsage`: project/course usage metadata that distinguishes direct upload from usage via citation.
- `SourceChain`: a traversable provenance path that can show direct source, root source, and full internal processing chain.
- `SourceSnapshot`: normalized source representation.
- `SourceAnchor`: stable location within a source.
- `SourceScope`: selected range or segment of source material.
- `SourceBoard`: course/project-level organization surface for source scopes and anchors.
- `SourceRegion`: future reconstructed region from OCR/VLM/layout extraction.
- `SourceTombstone` / `DeletedSourceRecord`: minimal recovery and warning record retained when a source, note, or block that participates in a chain is deleted.

Source import should record intent separately from file type:

- `ImportMode`: first-version import intent, such as `evidence_source`, `reconstruct_existing_note`, or `archive_only`.
- `SourceKind` / `SourceIntent`: higher-level source role, such as `unprocessed_evidence`, `condensed_note`, `agent_briefing`, `human_interpretation_note`, `draft_report`, `final_report`, or `reasoning_trace`.

A `Condensed Raw Source` is an external material that has already been processed by a human or AI but has not yet become Coincides internal truth. It may become a source root, an internal source chain starting point, a SourceRegion origin, or the basis for future NoteBlockCandidates.

Coincides should eventually distinguish:

```text
Evidence
  External factual basis.

Interpretation
  Human or AI explanation, summary, judgment, or condensed understanding.

Reasoning State
  Hypotheses, assumptions, uncertainty, constraints, missing facts, and inference paths.
```

Source grounding should support page labels, ranges, anchors, future bbox/crops, confidence, tool provenance, and warnings.

First-version internal source granularity should stop at NoteBlock. Sentence-level internal citation, rich-text offset tracking, and block-internal range preservation are deferred. A copied excerpt may keep an excerpt snapshot for human inspection, but the canonical reference should still point to the source NoteBlock.

Source lifecycle and chain health should distinguish at least:

```text
active
changed
outdated
deprecated
archived
deleted
missing
broken
degraded
recovered
```

Important boundaries:

- Removing a `SourceReference` from a block does not delete the source object.
- Clearing all sources from a block removes that block's references only.
- Deleting a source document or source version is a dangerous object deletion that can degrade existing chains.
- If a user removes a source snapshot file outside the app, Coincides should mark the affected references as `missing` or `degraded` rather than crashing or silently deleting the chain.
- External sources may be used by multiple projects/courses. A project source list should distinguish `uploaded_in_this_project` from `used_via_citation`.
- New source versions do not rewrite old references. Migration from one version to another should be explicit and reviewable.

Source reconstruction should happen before serious chunking when possible:

```text
source type detection
  -> reconstruction route
  -> SourceRegion
  -> NoteBlockCandidate
  -> proposal
  -> reviewed NoteBlock
```

---

## 8. Relation Truth

`ObjectRelation` is semantic relation truth.

It should eventually be governed by:

- `RelationType`;
- `RelationGroup` / `RelationPack`;
- directionality;
- condition kind;
- composition kind;
- visibility;
- provenance;
- lifecycle state.

`CanvasEdge` or future `CanvasConnector` is visual/projection state. A user may draw a connector without creating a confirmed ObjectRelation.

Relation design follows `docs/Coincides-Relation-Product-Design.md`.

---

## 9. Link Truth

`Link` / `InternalLink` is navigation truth. It answers where the user can jump, not why a claim is true and not what semantic relation exists.

Possible targets include:

- Note;
- Section;
- NoteBlock;
- page or page label;
- source view;
- local graph view or other future view target.

Important boundaries:

```text
Link:
  navigation / jump target.

SourceReference:
  evidence / provenance.

ObjectRelation:
  semantic relation.
```

A body link to another note does not automatically become a SourceReference. A SourceReference does not need to appear as a body link. An ObjectRelation can exist without a visible link.

---

## 10. Template / Composition / Domain / Package

Runtime capability objects remain important:

- `TemplateDefinition`: block contract, field schema, rendering guidance, source behavior, relation behavior, and agent guidance.
- `TemplateVariant`: the user-selectable concrete template identity, such as `definition.basic` or `formula.math`.
- `TemplateCategoryMembership`: discovery and organization state for slash menu, insert menu, and Template Studio. It is not canonical block identity.
- `CompositionTemplate`: reusable section made from multiple template blocks.
- `DomainBlockSet`: domain package of relevant templates and compositions.
- `PackageManifest`: portable contract for template/domain/package bundles.

These objects guide block creation and AI/tool behavior. They are not user content by themselves.

First-version category entries are intentionally narrow:

```text
Default
Math
User Defined
```

Category membership cannot change primitive family, field schema, source semantics, relation semantics, export role, or AI visibility.

---

## 11. Editor Snapshot / Operation State

Editor runtime state must not be confused with content truth.

- `EditorSnapshot`: optional runtime/session state such as viewport, zoom, selection, open panels, overlay toggles, or layout mode.
- `OperationBatch`: operation audit/recovery seed. It is not yet a complete undo/redo system.
- `OperationRecord`: future granular mutation record with affected objects, before/after payload, reversibility, and provenance.

Persistent truth includes content, field values, placement, source references, object relations, template identity, export role, and AI visibility. Transient state such as hover, selection, drag ghost, resize ghost, slash menu, and preview popover should not enter export or AI context.

Derived state such as `plain_text`, preview overlays, adapter indexes, SourceChain health, or future frame thumbnails should be rebuildable from canonical truth whenever possible.

---

## 12. Concept-Lite Future

`Concept` should begin as a lightweight search/refinement dimension, not a giant ontology.

Concept-lite may help:

- filter blocks;
- improve search;
- support local graph entry points;
- provide future GraphRAG adapter context.

Full concept ontology and refinement proposals are deferred.

---

## 13. Adapter / Index State

Adapters may create derived state:

- editor runtime snapshots;
- GraphRAG sidecar/index;
- OCR/VLM reconstruction outputs;
- import/export recovery records;
- package previews;
- AI candidate relations;
- search embeddings.

Derived state must be explainable and rebuildable from Coincides Core whenever possible.

Adapter/index state is not canonical truth unless a future version explicitly promotes it.

---

## 14. Current Implementation Reminder

The current app already has many v2.x foundation tables and APIs. They are the implementation substrate, not the final Better Notebook experience.

Before each `V2.BN.x` implementation, consult:

- `docs/internal/Better-Notebook-Phase-Plan-Template.md`
- `docs/internal/Better-Notebook-Implementation-Reality-Check.md`
- `docs/Coincides-Better-Notebook-Roadmap.md`
- `docs/Coincides-Relation-Product-Design.md`
