# Coincides Roadmap

**Updated**: 2026-05-17  
**Current mainline**: v2.0 NoteBlock Foundation on `feat/v2.0-noteblock`

---

## Current Direction

Coincides is moving toward a **Personal Learning Material OS / 学习管家**.

The product is not trying to become a general AI teacher. Its core value is to help learners organize scattered learning material into source-grounded, editable, reviewable structures.

The v2 architecture treats Workspace / Local Profile as the global user context and Course as the learning-domain root. Course Material Library becomes a first-class asset under each Course.

---

## Branch And Version Status

- `main`: stable historical/mainline branch.
- `feat/v2.0-noteblock`: active v2 development branch.
- v1.8 Cloud/PWA: postponed and kept as historical architecture exploration.
- v1.9 Local-first Stable Core: deferred as a standalone milestone. Useful safety ideas may be folded into v2 work, but v1.9 is not a prerequisite for v2.0.
- v2.0: current mainline.

---

## Completed Foundation

v1.0 through v1.7.x established:

- courses, goals, tasks, calendar, and time blocks,
- Card/Deck system with sections and tags,
- KaTeX math rendering,
- FSRS review,
- document upload, parsing, search, and RAG,
- agent tools and Proposal -> Review -> Apply workflow,
- source-linked AI generation experiments.

This work is valuable, but v1 Card/Deck is now treated as an ancestor of the NoteBlock model, not the final architecture.

---

## v2.0 — NoteBlock Foundation

**Execution plan**: `docs/releases/v2.0-plan.md`

Goal: establish the minimum durable foundation for NoteBlock Library without trying to finish all AI note-generation features at once.

Major themes:

- define Course-rooted learning content model,
- define NoteBlock conceptual and storage model,
- preserve source traceability expectations,
- introduce Projection and ProjectionSnapshot vocabulary,
- reserve compatibility for TypedProposal and OperationBatch,
- keep status/trash and summary dependency concepts in mind where relevant,
- define migration relationship from Card/Deck to NoteBlock/Review Projection,
- keep existing v1 flows usable while the v2 substrate is introduced.

v2.0 should not implement the full Course Material Library, Source Snapshot Viewer, Material Reconciliation, or cross-course concept system. It should avoid blocking those later layers.

---

## v2.1 — AI Note Proposal + Course Material Library Seed

Goal: turn parsed/OCR material into reviewed note proposals while introducing the first course-level material library behavior.

Expected themes:

- SourceFragment extraction pipeline,
- FragmentClassifier and BlockRouter,
- early MaterialSegment detection for chapters, weeks, sections, page ranges, or lecture units,
- Material Map Proposal,
- scope-based note generation,
- confidence and source reference preservation,
- first organized-note generation for real study material.

---

## v2.2 — Material Reconciliation

Goal: make multi-batch, messy, duplicate, out-of-order learning materials usable.

Expected themes:

- cross-batch reconciliation within one Course,
- duplicate detection and canonical NoteBlock creation,
- source evidence list for merged blocks,
- recommended learning order proposal,
- user drag/reorder/edit of material map and note order,
- exclusion/restoration of source scopes,
- stable recovery behavior for merge mistakes.

Principle:

```text
Raw source order is preserved, but learning order is reconstructed.
Duplicate knowledge is merged, but source evidence is retained.
Evidence list first, evidence interpretation later.
```

---

## v2.3 — Source Snapshot Viewer + Scope Selection

Goal: let users inspect sources, select source ranges, and jump from generated notes back to source evidence.

Expected themes:

- Source Snapshot Viewer as the generalized successor to PDF Reader Lite,
- page-level source reference jump from NoteBlock or Projection to source page,
- page/page-range/chapter/week scope selection,
- lazy snapshot generation for large sources,
- stored-but-not-imported and excluded-from-current-scope states,
- no requirement for bbox highlight or full PDF editing in the first version.

---

## v2.4+ — Larger Learning Material OS

Possible directions:

- Study Scope Planner for weekly/chapter/exam pacing,
- Adaptive Layered Summaries and stale/refresh behavior,
- Concept / ConceptMention expansion,
- Concept Focus Notes,
- Scoped Knowledge Maps,
- Learning Inbox,
- Source Library for large materials,
- Material Scale Router,
- textbook-scale indexing,
- optional rerank model for task-aware retrieval,
- Package Studio Lite and later package editors,
- cross-course concept candidates as a long-term idea,
- desktop packaging and hosted services after the v2 foundation proves useful.

Cross-course knowledge graphs are intentionally delayed. They should not enter the v2.0-v2.2 mainline.

---

## Product Guardrails

- Preserve source traceability.
- Keep AI changes proposal-first.
- Do not judge the learner by default.
- Prefer factual organization language.
- Do not protect old Card/Deck architecture if it blocks the better product.
- Do not make packaging, cloud, or community tooling a precondition for the NoteBlock foundation.
- Agent Memory stores user preferences; Course Material Library stores learning content.
