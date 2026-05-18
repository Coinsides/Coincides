# Coincides Architecture

**Updated**: 2026-05-17  
**Status**: v1 implemented architecture plus v2 target architecture

---

## 1. Current Implemented Architecture

Coincides currently runs as a local-first web application stack:

- **Frontend**: React, TypeScript, Vite, Zustand, CSS modules.
- **Backend**: Node.js, Express, TypeScript runtime.
- **Database**: SQLite with migrations and local persistence.
- **Math rendering**: KaTeX.
- **Review**: FSRS.
- **Document processing**: uploaded files are parsed, chunked, indexed, and made available to agent tools.
- **Search/RAG**: full-text and embedding-based retrieval.
- **AI workflow**: agent proposes structured operations; user reviews before applying.

This architecture is real and should be respected during migration work, but it is not the final v2 knowledge architecture.

---

## 2. v2 Root Model

The v2 product should separate global/user context from learning-domain content:

```text
Workspace / Local Profile
  -> Course
    -> Schedule / Goals / Tasks
    -> Source Library
    -> Course Material Library
    -> NoteBlock Library
    -> Projection System
    -> Concept Index
```

`Workspace / Local Profile` stores global settings, model configuration, user preferences, and future cross-course relationships.

`Course` is the learning-content root. Course-level material, notes, review sets, concepts, source references, and learning projections should be scoped there first.

Agent Memory should stay lightweight and preference-oriented. It may remember language, style, learning preferences, and interaction habits. It should not become the primary store for course knowledge. Course knowledge belongs in Course Material Library.

---

## 3. v2 Processing Flow

The target material flow is:

```text
Upload / Import
  -> Original Source
  -> Normalized Source Snapshot
  -> SourceFragment
  -> MaterialSegment
  -> Material Reconciliation
  -> Canonical NoteBlock
  -> Projection Snapshot
```

Key layers:

- **Original Source**: the uploaded PDF, Word file, image, scan, slide deck, textbook, or mixed material preserved as user evidence.
- **Normalized Source Snapshot**: a uniform viewing/reference layer, such as page images plus optional text layer. This expands the PDF Reader idea into a source viewer for many file types.
- **SourceFragment**: raw extraction units with source order, page, optional bbox, raw text, image crop, OCR/parser confidence, and extraction method.
- **MaterialSegment**: a course-level selectable learning range such as chapter, week, part, section, page range, lecture unit, or topic cluster.
- **Material Reconciliation**: the layer that handles out-of-order uploads, duplicate knowledge, missing-bridge candidates, excluded scopes, and recommended learning order.
- **Canonical NoteBlock**: a reconciled learning block such as theorem, formula, definition, proof, example, exercise, answer, diagram crop, or paragraph.
- **Projection Snapshot**: a stable generated view such as organized note, review set, formula sheet, concept focus note, or exam review set.

The principle is:

```text
Raw source order is preserved, but learning order is reconstructed.
Duplicate knowledge is merged, but source evidence is retained.
Evidence list first, evidence interpretation later.
```

---

## 4. Source Evidence And Canonical Blocks

Source evidence and canonical NoteBlocks must remain separate.

A theorem may appear in three or sixty sources. The canonical NoteBlock should not erase those sources or pretend that all sources are identical. Early v2 should simply keep an evidence list:

```text
Canonical theorem block
  -> source A page 3
  -> source B page 12
  -> source C page 40
```

Ranking sources by detail, authority, or usefulness can come later. The first reliable version should list evidence, preserve source references, and let the user inspect where the material came from.

---

## 5. Projection Architecture

A projection is a user-facing view over course material and NoteBlocks.

Examples:

- Organized Notes,
- Review Card Sets,
- Exercise Sets,
- Formula Sheets,
- Theorem-Proof Lists,
- Concept Focus Notes,
- Scoped Knowledge Maps,
- Study Scope Plans.

Generated projections should be stable snapshots. If an underlying NoteBlock changes later, the existing projection should not silently mutate. The system may show that newer source material or block versions are available and offer regenerate, compare, or ignore actions.

---

## 6. Adaptive Layered Summaries

Coincides should not summarize only by file length. Summary depth should be driven by content structure, density, importance, and concept coverage.

Useful summary layers include:

- **Source Overview Summary**: what a source is and what it broadly covers.
- **Structural Summary**: chapters, sections, weeks, parts, and detected boundaries.
- **Concept Coverage Summary**: which concepts appear where and in what form.
- **MaterialSegment Summary**: what each selectable learning range contains.
- **NoteBlock Library Summary**: inventory of definitions, theorems, formulas, examples, exercises, diagrams, and source references.
- **Projection Summary**: what a generated note or review set covers and which material it used.

Summaries must track dependencies. If source material, segments, blocks, or projections change, dependent summaries should be marked stale rather than treated as current truth.

---

## 7. Typed Proposal System

Proposal is not just a modal. It is Coincides' safety execution protocol.

Future proposal types may include:

- `material_map_proposal`,
- `scope_plan_proposal`,
- `source_import_proposal`,
- `note_block_merge_proposal`,
- `organized_note_proposal`,
- `review_projection_proposal`,
- `cross_course_link_proposal` later.

Each proposal should be able to describe affected objects, preview results, carry source evidence, accept user edits, apply changes, and support rollback where feasible.

---

## 8. State, Trash, And Recovery

Course material objects need explicit state, not only existence.

Candidate states include:

```text
uploaded -> parsed -> indexed -> segmented -> reconciled -> ready_for_note -> used_in_projection
```

Other state flags may include:

```text
excluded_from_scope
needs_review
failed
stale
trashed
```

Deletion should be status-based:

```text
active -> trashed -> permanently_deleted
```

Trash should not be a separate storage universe. It should preserve references and support restore until the user permanently deletes the item.

---

## 9. Model Roles

The architecture should support model roles without requiring every role in v2.0.

- `thinking_model`: reasoning, proposal generation, extraction decisions, routing decisions, reconciliation, and hard synthesis.
- `embedding_model`: semantic indexing and retrieval.
- `vision_or_ocr_model`: optional role for scanned notes, diagrams, and image-heavy PDFs.
- `rerank_model`: future optional role for textbook-scale, full-course, or multi-source retrieval where task-aware ordering matters.
- `fast_model`: optional role for low-latency classification or UI assistance; can be replaced by the thinking model when speed is not critical.

Provider choice should remain separate from role design.

---

## 10. API And Contract Rule

Every v2 version plan must define affected contracts before implementation:

- backend API routes,
- frontend service contracts,
- database migration contracts,
- agent tool input/output contracts,
- proposal payload shape,
- operation batch behavior,
- validation and rollback expectations.

APIs should be designed for stability, efficiency, and output quality. Do not add an API only because it is convenient for one UI screen if it weakens the long-term model.

---

## 11. Local-First Direction

The active architecture remains local-first and self-hostable. Desktop packaging, cloud sync, hosted accounts, and PostgreSQL may be revisited later, but they are not prerequisites for v2.0.

The architecture should not assume that user material leaves the local environment unless the user explicitly configures an AI provider or hosted service.

---

## 12. Secret Handling

Architecture docs must never include real API keys. Use placeholders such as `<provider-api-key>` in examples, or describe the configuration path without showing a value.
