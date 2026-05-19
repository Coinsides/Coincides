# Coincides Roadmap

**Updated**: 2026-05-19  
**Current mainline**: v2.0 NoteBlock Foundation on `feat/v2.0-noteblock`

---

## 1. Roadmap Role

This roadmap is the formal v2.x version-direction document.

It defines product direction, version themes, candidate conceptual entities, and major boundaries. It does not lock real database table names, fields, API endpoints, migrations, or UI implementation details.

Document responsibilities:

- **Roadmap**: version direction, sequencing, and candidate conceptual entities.
- **Brainstorm**: open idea pool and unresolved architecture/product thinking.
- **Version Plan**: current version boundary, committed scope, out-of-scope, contracts, and acceptance criteria.
- **Engineering Spec**: concrete implementation design such as real tables, fields, API routes, payloads, migrations, UI entry points, and tests.

Current execution entry:

- Brainstorm: `docs/brainstorm/v2.x-brainstorm.md`
- Current version plan: `docs/releases/v2.0-plan.md`

---

## 2. Product Direction

Coincides is moving toward a **Personal Learning Material OS / 学习管家**.

It is not trying to become a general AI teacher, homework solver, or generic chat tutor. Its core value is to help learners organize scattered learning material into source-grounded, editable, reviewable structures.

v2.x should make Coincides capable of handling real learning material: messy uploads, repeated sources, out-of-order course archives, partial textbook scopes, handwritten notes, formulas, examples, diagrams, and user-controlled review projections.

---

## 3. Core Architecture Principles

The v2 architecture is organized around these principles:

```text
Workspace / Local Profile stores global user context.
Course stores learning-domain content.

Agent Memory stores user preferences.
Course Material Library stores learning knowledge.

Raw source order is preserved, but learning order is reconstructed.
Duplicate knowledge is merged, but source evidence is retained.
Evidence list first, evidence interpretation later.
```

Practical consequences:

- Course is the learning-content root, not a weak tag.
- Course Material Library becomes a first-class Course asset.
- NoteBlock Library becomes the canonical learning-fragment substrate.
- Organized notes, review sets, formula sheets, theorem-proof lists, concept focus notes, and study plans become projections over course material and NoteBlocks.
- AI structural edits must remain Proposal -> Review -> Apply.
- Cross-course knowledge linking is delayed until course-local systems are stable.

---

## 4. Branch And Version Status

- `main`: stable historical/mainline branch.
- `feat/v2.0-noteblock`: active v2 development branch.
- v1.8 Cloud/PWA: postponed and kept as historical architecture exploration.
- v1.9 Local-first Stable Core: deferred as a standalone milestone; useful safety ideas may be folded into v2.
- v2.0: current version and the only v2 version that should be locked in detail through plan/spec before implementation.

Version locking rule:

- `v2.0` must become decision-complete in `docs/releases/v2.0-plan.md` and later `v2.0-engineering-spec.md` before code work.
- `v2.1+` remain directional in this roadmap. Their candidate entities are planning hints, not final table names or implementation commitments.
- Before starting any later minor version, promote that roadmap section into `docs/releases/v2.X-plan.md` and then an engineering spec.

---

## 5. Completed Foundation

v1.0 through v1.7.x established:

- courses, goals, tasks, calendar, and time blocks;
- Card/Deck system with sections and tags;
- KaTeX math rendering;
- FSRS review;
- document upload, parsing, search, and RAG;
- agent tools and Proposal -> Review -> Apply workflow;
- source-linked AI generation experiments.

This work is valuable, but v1 Card/Deck is now treated as an ancestor of the NoteBlock model, not the final architecture.

---

## 6. v2.0 — NoteBlock Foundation

**Status**: current version; must be made decision-complete in the version plan/spec.  
**Execution plan**: `docs/releases/v2.0-plan.md`

Goal: establish the minimum durable foundation for NoteBlock Library without trying to finish all AI note-generation features at once.

Primary themes:

- define Course-rooted learning content model;
- define NoteBlock conceptual and storage model;
- introduce Projection and ProjectionSnapshot vocabulary;
- preserve source traceability expectations;
- reserve compatibility for TypedProposal and OperationBatch;
- keep status/trash and summary dependency concepts in mind where relevant;
- define migration relationship from Card/Deck to NoteBlock / Review Projection;
- keep existing v1 flows usable while the v2 substrate is introduced.

Candidate conceptual entities / likely tables:

- `Note`
- `NoteBlock`
- `Projection`
- `ProjectionSnapshot`
- `ReviewProjection`
- `SourceReference`
- `OperationBatch`
- status/trash metadata where relevant

Explicitly not v2.0:

- full Course Material Library UI;
- full Material Reconciliation;
- Source Snapshot Viewer / PDF Reader;
- adaptive summary generation engine;
- full OCR pipeline;
- cross-course concept linking;
- textbook-scale ingestion;
- Package Studio.

v2.0 should not build these later layers, but it must avoid blocking them.

---

## 7. v2.1 — AI Note Proposal + Course Material Library Seed

**Status**: directional; not locked until v2.1 planning begins.

Goal: turn parsed/OCR material into reviewed note proposals while introducing the first course-level material library behavior.

Primary themes:

- create the first SourceFragment pipeline;
- classify fragments and route them toward candidate NoteBlocks;
- detect early MaterialSegments such as chapters, weeks, sections, page ranges, or lecture units;
- generate Material Map Proposal;
- support scope-based note generation;
- preserve confidence and source references;
- generate the first organized notes from real user material.

Candidate conceptual entities / likely tables:

- `SourceMaterial`
- `SourceFragment`
- `MaterialSegment`
- `MaterialMapProposal`
- early `TypedProposal` shape
- early parser/OCR confidence metadata
- source status metadata

Boundary notes:

- v2.1 can seed Course Material Library but should not try to solve all reconciliation, source snapshot, or large textbook workflows.
- v2.1 output should remain proposal-first and user-reviewable.

---

## 8. v2.2 — Material Reconciliation

**Status**: directional; not locked until v2.2 planning begins.

Goal: make multi-batch, messy, duplicate, out-of-order learning materials usable inside a Course.

Primary themes:

- reconcile multiple upload batches within the same Course;
- detect duplicate or overlapping knowledge;
- create canonical NoteBlocks from repeated source evidence;
- list source evidence without over-interpreting it;
- propose recommended learning order;
- support user drag/reorder/edit of material map and note order;
- support exclusion/restoration of source scopes;
- provide stable recovery behavior for merge mistakes.

Candidate conceptual entities / likely tables:

- `CanonicalNoteBlock`
- `MergedSourceEvidence`
- `ExcludedMaterialScope`
- `MaterialReconciliationProposal`
- `NoteBlockMergeProposal`
- recovery metadata for split/unmerge/restore
- reconciliation confidence metadata

Boundary notes:

- Evidence interpretation, source authority ranking, and deep source comparison can wait.
- Cross-course reconciliation is not part of v2.2.

---

## 9. v2.3 — Source Snapshot Viewer + Scope Selection

**Status**: directional; not locked until v2.3 planning begins.

Goal: let users inspect sources, select source ranges, and jump from generated notes back to source evidence.

Primary themes:

- implement Source Snapshot Viewer as the generalized successor to PDF Reader Lite;
- support page-level source reference jumps from NoteBlock or Projection;
- support page/page-range/chapter/week scope selection;
- use lazy snapshot generation for large sources;
- preserve original source while exposing normalized snapshots;
- allow stored-but-not-imported and excluded-from-current-scope states.

Candidate conceptual entities / likely tables:

- `SourceSnapshot`
- `SourceSnapshotPage`
- page-level `SourceReference`
- `SourceImportScope`
- `SelectedMaterialScope`
- `StoredButNotImportedScope`
- snapshot generation/cache metadata

Boundary notes:

- Full PDF editing is not required.
- bbox highlight and region selection may come later.
- The first viewer should prioritize source trust, page jump, and scope selection over annotation features.

---

## 10. v2.4+ — Larger Learning Material OS

**Status**: long-range direction; candidate scope only.

Goal: expand Course Material Library into a larger learning-material operating system.

Possible themes:

- Study Scope Planner for weekly/chapter/exam pacing;
- Adaptive Layered Summaries and stale/refresh behavior;
- expanded Concept / ConceptMention workflows;
- Concept Focus Notes;
- Scoped Knowledge Maps;
- Learning Inbox;
- Material Scale Router;
- textbook-scale indexing;
- optional rerank model for task-aware retrieval;
- Package Studio Lite and later package editors.

Candidate conceptual entities / likely tables:

- `AdaptiveSummary`
- `SummaryDependency`
- `StudyScopePlan`
- `StudyScopeWeek`
- expanded `ConceptMention`
- `LearningInboxItem`
- `MaterialScaleDecision`
- optional `RerankTrace` or retrieval-quality metadata
- Package Studio schemas such as `StylePack`, `BlockVocabulary`, `LayoutRecipe`, `ReviewProjectionRule`

Boundary notes:

- Package Studio should come after core capabilities, but its schema needs should influence earlier design.
- Rerank should remain optional until retrieval scale or quality requires it.

---

## 11. Later / 3.x+

Long-term directions that should not drive v2.0-v2.2 implementation:

- cross-course concept candidates;
- workspace-level knowledge maps;
- broader cross-domain learning graphs;
- hosted sync or hosted community services;
- desktop packaging and distribution;
- external orchestrator integration with Coincides as a learning module;
- community package marketplace;
- sandboxed community logic after the safety model matures.

Cross-course knowledge graphs are intentionally delayed. Course-local material structure comes first.

---

## 12. Product Guardrails

- Preserve source traceability.
- Keep AI changes proposal-first.
- Do not judge the learner by default.
- Prefer factual organization language.
- Do not protect old Card/Deck architecture if it blocks the better product.
- Do not make packaging, cloud, or community tooling a precondition for the NoteBlock foundation.
- Keep Agent Memory lightweight and preference-oriented.
- Keep course learning content in Course Material Library and NoteBlock Library, not in opaque model memory.

---

## 13. Promotion Rule

A roadmap section becomes executable only when it is promoted into a version plan.

For the active version, the plan must define:

- Goal;
- Scope;
- Out of Scope;
- API / Contracts;
- Data Model;
- Agent Tool Contract;
- Migration;
- Test Matrix;
- Acceptance Criteria.

After the version plan is approved, an engineering spec should define concrete implementation details.
