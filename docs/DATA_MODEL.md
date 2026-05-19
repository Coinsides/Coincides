# Coincides Data Model

**Updated**: 2026-05-17  
**Status**: current v1 model summary plus v2 conceptual target model

This document distinguishes implemented tables from v2 conceptual entities. A conceptual v2 entity is not automatically an existing table.

---

## 1. Current Implemented Model Summary

The current application is built around:

- users / local profile assumptions,
- courses,
- goals and tasks,
- time blocks,
- decks,
- cards,
- card sections,
- tags and tag groups,
- documents and document chunks,
- embeddings / vector search metadata,
- proposals and agent operation records,
- FSRS review state.

This model remains the migration source for v2 work.

### v2.0 NoteBlock Foundation Tables

v2.0 adds an additive NoteBlock foundation. Existing Card/Deck tables remain unchanged.

#### operation_batches

Tracks user-visible structural operations for future Proposal -> Review -> Apply compatibility.

Key fields: `id`, `user_id`, `course_id`, `source_type`, `source_id`, `label`, `status`, `metadata`, `created_at`, `applied_at`, `reverted_at`.

#### notes

Course-rooted note containers. A note is an ordered view over course-rooted NoteBlocks.

Key fields: `id`, `user_id`, `course_id`, `title`, `description`, `status`, `source_kind`, `page_format`, `metadata`, `operation_batch_id`, `created_at`, `updated_at`, `trashed_at`.

#### note_blocks

Course-rooted canonical learning blocks.

Committed v2.0 block types: `heading`, `paragraph`, `definition`, `theorem`, `proof`, `formula`, `example`, `exercise`, `answer`, `sidenote`.

Key fields: `id`, `user_id`, `course_id`, `block_type`, `title`, `content_json`, `plain_text`, `status`, `source_kind`, `metadata`, `operation_batch_id`, `created_at`, `updated_at`, `trashed_at`.

#### note_block_placements

Connects notes to ordered blocks.

Key fields: `id`, `note_id`, `block_id`, `parent_placement_id`, `order_index`, `display_mode`, `display_overrides_json`.

#### note_block_sources

Stores early SourceReference pointers against existing `documents` and `document_chunks`.

Key fields: `id`, `block_id`, `document_id`, `document_chunk_id`, `source_page_start`, `source_page_end`, `source_excerpt`, `reference_type`, `confidence`, `metadata`.

#### projections

Stores stable projection snapshots. v2.0 supports `organized_note`.

Key fields: `id`, `user_id`, `course_id`, `type`, `title`, `status`, `snapshot_json`, `source_refs_json`, `source_versions_json`, `operation_batch_id`, `metadata`, `created_at`, `updated_at`, `trashed_at`.

---

## 2. Root Model

### Workspace

A global/local user context. It owns global settings, model/provider configuration, user preferences, future backup/sync configuration, and future cross-course concept candidates.

### Course

The learning-domain root. Course should own course-specific schedules, goals, tasks, source materials, material library, NoteBlocks, projections, concepts, and analytics.

Course should not be treated as a weak tag. It is the primary boundary for learning content.

---

## 3. Course Material Library Concepts

### CourseMaterialLibrary

A course-level material asset. It is the structured layer that lets Coincides reason about uploaded material without relying on heavy Agent Memory.

It may expose material status, selected scopes, excluded scopes, source evidence, summaries, and generated projections.

### SourceMaterial

The original user-uploaded or registered source:

- PDF,
- Word document,
- slide deck,
- scan,
- image,
- textbook chapter,
- old notes,
- problem set,
- mixed course archive.

Original sources should be preserved where possible.

### SourceSnapshot

A normalized viewing/reference representation of a source. It may be page images plus optional text layer. It is the long-term direction for PDF Reader Lite and should support page-level references across many source types.

Early reference behavior can be page-level. Region/bbox highlighting can come later.

### SourceFragment

A source-preserving extraction unit. It should capture:

- source material id,
- source snapshot/page reference,
- page or logical location,
- source order,
- raw text,
- image crop reference,
- bounding box when available,
- OCR/parser confidence,
- extraction method,
- status.

### MaterialSegment

A selectable learning range inside a course material library. It may represent:

- chapter,
- week,
- part,
- section,
- page range,
- lecture unit,
- topic cluster,
- user-selected source range.

MaterialSegment lets users generate notes by scope instead of processing an entire course archive at once.

### MaterialSegmentSummary

A structured summary of a segment, including concepts, density, estimated study time, source coverage, block inventory, and readiness for note/review generation.

---

## 4. NoteBlock And Evidence Concepts

### CanonicalNoteBlock

The reconciled reusable learning fragment. It may represent title, paragraph, definition, theorem, proof, formula, example, exercise, answer, diagram crop, image, sidenote, separator, checklist, or step.

This is the future canonical unit for notes and review projections.

### SourceReference

A link from a block, segment, projection, or proposal back to source evidence. Early versions can store page-level reference; later versions may support bbox/crop-level reference.

### MergedSourceEvidence

A relation indicating that multiple source fragments or source references support the same canonical block.

Early behavior should list evidence, not interpret it. Detailedness ranking, authority scoring, and source comparison can come later.

---

## 5. Projection Concepts

### Projection

A user-facing view generated from NoteBlocks and selected material scopes.

Projection types may include organized note, review card set, exercise set, formula sheet, theorem-proof list, concept focus note, scoped knowledge map, exam review set, or study scope plan.

### ProjectionSnapshot

A stable generated projection. It should record generated content, source block ids, source block versions, source references, generation time, and proposal/apply history.

Existing projections should not silently change when an underlying block changes. The system may show that updates are available.

---

## 6. Summary Concepts

### AdaptiveSummary

A summary generated at a granularity determined by content structure, density, importance, concept coverage, and user intent, not just source length.

Types may include:

- source overview summary,
- structural summary,
- concept coverage summary,
- material segment summary,
- NoteBlock library summary,
- projection summary.

### SummaryDependency

A record of what a summary was based on: source ids, fragment ids, segment ids, block ids, projection ids, versions, and generation time.

When dependencies change, the summary should become stale rather than remain silently trusted.

---

## 7. Proposal And Recovery Concepts

### TypedProposal

A typed proposal is a reviewed change plan, not just a UI popup.

Possible types:

- material map proposal,
- scope plan proposal,
- source import proposal,
- note block merge proposal,
- organized note proposal,
- review projection proposal,
- future cross-course link proposal.

TypedProposal should know its affected objects, preview payload, source evidence, user edits, apply operation, and rollback expectations where feasible.

### TrashState

Deletion should be status-based:

```text
active -> trashed -> permanently_deleted
```

Trashed objects remain restorable and should preserve enough relationship data to recover references until permanent deletion.

---

## 8. Concept Model

### Concept

A course-local concept entity such as `gradient`, `Riemann sum`, or `chain rule`.

Concepts should not be global universal truths by default. The same term can mean different things across courses or subjects.

### ConceptMention

A record that a concept appears in a SourceFragment, MaterialSegment, NoteBlock, formula, example, exercise, diagram, or projection.

Cross-course concept linking is a long-term direction. Current design should keep compatibility space but not force global merging.

---

## 9. v1 Card/Deck Interpretation

v1 Card/Deck should be understood as an early experiment in structured learning units. It validated typed learning material, formula rendering, source-linked AI generation, review collections, and proposal review.

Future migrations may map old Card/Deck records into NoteBlocks and Review Projections:

- `cards.front/back` or typed fields -> NoteBlock content,
- card type -> NoteBlock kind or review projection template,
- deck -> projection group or note collection,
- section -> ordering/grouping metadata,
- tags -> concept hints or projection metadata,
- FSRS state -> review projection scheduling metadata.

The migration goal is to preserve the user's material and review history while allowing the product to move beyond the old Card table.

---

## 10. Settings And Keys

Provider credentials are configuration, not data model documentation.

Examples should use neutral placeholders only:

```json
{
  "thinkingModelKey": "<configured-locally>",
  "embeddingModelKey": "<configured-locally>"
}
```

Never commit real provider keys to docs, source code, database fixtures, or migration examples.
