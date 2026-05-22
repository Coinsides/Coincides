# Coincides Roadmap

**Updated**: 2026-05-21
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
- Product/reference research outline: `docs/brainstorm/v2.x-product-reference-research-outline.md`
- Roadmap revision research summary: `docs/brainstorm/v2.x-roadmap-revision-recommendations.md`
- Current version plan: `docs/releases/v2.1.1-plan.md`

---

## 2. Product Direction

Coincides is moving toward a **Personal Learning Material OS / 学习管家**.

It is not trying to become a general AI teacher, homework solver, or generic chat tutor. Its core value is to help learners organize scattered learning material into source-grounded, editable, reviewable structures.

v2.x should make Coincides capable of handling real learning material: messy uploads, repeated sources, out-of-order course archives, partial textbook scopes, handwritten notes, formulas, examples, diagrams, and user-controlled review projections.

The first durable product surface is learning, but the architecture should remain compatible with broader personal knowledge operations such as research dossiers, briefing generation, evidence boards, investigation boards, and AI result boards. These broader uses should not expand active v2.2/v2.3 scope prematurely.

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
- NoteBlock, SourceMaterial, Projection, and future Canvas/Board surfaces must not split into separate knowledge universes.
- Canvas and Board surfaces are projection surfaces over source-grounded objects, not separate sources of truth.
- AI structural edits should carry typed proposal, scope, evidence, diff, warnings, operation batch, and recovery path.
- Template variants, composition templates, and Domain Block Sets are preferred over arbitrary low-level system block type creation.

---

## 4. Branch And Version Status

- `main`: stable historical/mainline branch.
- `feat/v2.0-noteblock`: active v2 development branch.
- v1.8 Cloud/PWA: postponed and kept as historical architecture exploration.
- v1.9 Local-first Stable Core: deferred as a standalone milestone; useful safety ideas may be folded into v2.
- v2.0: released NoteBlock Foundation baseline.
- v2.1: AI Note Proposal + Course Material Library Seed implementation track.
- v2.1.1: accepted Learning Block Template Engine Seed foundation patch.

Version locking rule:

- Each active minor or patch version must become decision-complete in `docs/releases/v2.X-plan.md` and later `v2.X-engineering-spec.md` before code work.
- `v2.2+` remain directional in this roadmap. Their candidate entities are planning hints, not final table names or implementation commitments.
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

**Status**: released foundation baseline.
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

**Status**: implemented track; v2.1 quality and experience reviews are maintained in release docs.

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

## 8. v2.1.1 — Learning Block Template Engine Seed

**Status**: accepted foundation patch.
**Execution plan**: `docs/releases/v2.1.1-plan.md`

Goal: split NoteBlock category thinking into system type, learning/semantic role, and template variant without introducing a full user template editor.

Primary themes:

- keep low-level system types closed for now;
- seed `system_type`, `learning_role`, `template_id`, and `taxonomy_version`;
- preserve legacy `block_type` compatibility;
- make manual NoteBlock creation and organized note proposals template-aware;
- treat Learning-specific blocks as the first Domain Block Set sample, not as low-level block types;
- defer full user-facing template editing.

Candidate conceptual entities:

- `SystemBlockType`
- `SemanticRole`
- `TemplateVariant`
- `DomainBlockSet`
- `CompositionTemplate`
- `BlockRelation`

Boundary notes:

- v2.1.1 does not add canvas, full template editor, Package Studio, or external editor dependencies.
- Future templates should extend variants and domain sets, not casually create new low-level system block types.

---

## 9. v2.2.x — Material Reconciliation Track

**Status**: directional; not locked until v2.2 planning begins.

Goal: make multi-batch, messy, duplicate, out-of-order learning materials usable inside a Course.

Primary themes:

- conservative proposal-first reconciliation;
- separate duplicate, overlap, same-concept evidence, and conflict cases;
- preserve source evidence while creating candidate canonical learning objects;
- support exclusion, conflict review, recovery, split, and unmerge;
- keep source evidence separate from evidence interpretation;
- identify learning role candidates without building full template editor.

Candidate conceptual entities / likely tables:

- `CanonicalNoteBlock`
- `EvidenceSet`
- `EvidenceItem`
- `MergedSourceEvidence`
- `ExcludedMaterialScope`
- `MaterialReconciliationProposal`
- `ReconciliationCandidateGroup`
- `ConflictReviewItem`
- `NoteBlockMergeProposal`
- recovery metadata for split/unmerge/restore
- reconciliation confidence metadata

Suggested patch breakdown:

- `v2.2.0`: Reconciliation Data Model + Proposal Shell.
- `v2.2.1`: Evidence Set + Conservative Merge Apply.
- `v2.2.2`: Exclusion / Conflict / Recovery.
- `v2.2.3`: Role-aware Reconciliation.

Boundary notes:

- Evidence interpretation, source authority ranking, and deep source comparison can wait.
- Cross-course reconciliation is not part of v2.2.
- Full Source Snapshot Viewer and free canvas are not part of v2.2.
- AI must not silently merge or delete source evidence.

---

## 10. v2.3.x — Source Snapshot Viewer + Source Board Seed

**Status**: directional; not locked until v2.3 planning begins.

Goal: let users inspect sources, anchor evidence, select source ranges, and jump between generated notes and source evidence.

Primary themes:

- implement Source Snapshot Viewer as the generalized successor to PDF Reader Lite;
- introduce SourceAnchor as a stable evidence pointer;
- support page-level source reference jumps from NoteBlock or Projection;
- support page/page-range/chapter/week scope selection;
- seed a lightweight Source Board for selected ranges, related NoteBlocks, evidence groups, and proposal entry points;
- use lazy snapshot generation for large sources;
- preserve original source while exposing normalized snapshots;
- allow stored-but-not-imported and excluded-from-current-scope states.

Candidate conceptual entities / likely tables:

- `SourceSnapshot`
- `SourceSnapshotPage`
- `SourceAnchor`
- page-level `SourceReference`
- `SourceImportScope`
- `SelectedMaterialScope`
- `SourceBoard`
- `SourceBoardNode`
- `StoredButNotImportedScope`
- snapshot generation/cache metadata

Candidate external tools for future version planning:

- `EmbedPDF` or `PDF.js` for PDF rendering/viewing.
- `Mozilla Readability`, `DOMPurify`, and `Playwright` for Web Snapshot pipeline.
- `SingleFile` as a possible complete webpage archive reference or candidate.

Suggested patch breakdown:

- `v2.3.0`: Source Snapshot Foundation.
- `v2.3.1`: Source Anchor + Jump Back.
- `v2.3.2`: Scope Selection.
- `v2.3.3`: Source Board Seed.
- `v2.3.4`: Source Annotation / Media Snapshot Planning Patch if needed.

Boundary notes:

- Full PDF editing is not required.
- bbox highlight and region selection may come later.
- The first viewer should prioritize source trust, page jump, source anchor, and scope selection over annotation features.
- Source Board seed is not a full free canvas.
- Video/audio snapshots are future media-source extensions, not core v2.3 requirements.

---

## 11. v2.4.x — Learning Canvas / Board Projection Track

**Status**: directional; not locked until v2.4 planning begins.

Goal: make the same source-grounded learning objects usable in spatial board/canvas views without creating a second knowledge universe.

Primary themes:

- Learning Canvas as projection surface over NoteBlocks, SourceAnchors, MaterialSegments, and Projections;
- separate content state, layout state, and session state;
- support basic pan/zoom/select/move/open-target interactions;
- propose canvas nodes, edges, frames, and layout through AI proposal review/apply;
- seed BlockRelation for learning relationships;
- seed Command & Interaction System near canvas work.

Candidate conceptual entities / likely tables:

- `LearningCanvas`
- `CanvasNode`
- `CanvasEdge`
- `CanvasFrame`
- `CanvasSessionState`
- `CanvasLayoutProposal`
- `BlockRelation`
- `Command`
- `ToolMode`
- `InputBinding`
- `Context`

Candidate external tools for future version planning:

- `Excalidraw` for lightweight canvas/board prototyping.
- `tldraw` for infinite canvas SDK, custom shapes, tool mode, store/session, and interaction-system spike.

Suggested patch breakdown:

- `v2.4.0`: Learning Canvas Data Model.
- `v2.4.1`: Canvas Viewer + Basic Layout.
- `v2.4.2`: Canvas Proposal UX.
- `v2.4.3`: BlockRelation Seed.
- `v2.4.4`: Command & Interaction System Seed.
- `v2.4.5`: Composition Template Seed if organized sections become urgent.

Boundary notes:

- Canvas nodes should reference existing domain objects rather than copying content.
- Document order and canvas layout are separate.
- Canvas AI must remain proposal-first, especially for relation edges.
- Keyboard shortcuts should be treated as one input binding inside a broader Command & Interaction System.

---

## 12. v2.5.x — Template Engine + Domain Block Sets + Package Studio Seed

**Status**: directional; not locked until v2.5 planning begins.

Goal: let users and agents safely extend template variants, composition templates, and domain block sets without opening arbitrary low-level system block types or executable plugins.

Primary themes:

- persistent `TemplateDefinition` runtime;
- user-facing template editor seed;
- Composition Template / Section Template editor seed;
- Domain Block Set manifest;
- TemplateProposal, CompositionTemplateProposal, and TemplateMigrationProposal;
- Package Studio Lite for professional creators;
- agent-facing template summaries and visual risk notes.

Candidate conceptual entities / likely tables:

- `TemplateDefinition`
- `CompositionTemplate`
- `DomainBlockSet`
- `TemplateProposal`
- `CompositionTemplateProposal`
- `TemplateMigrationProposal`
- package manifest
- package validation metadata

Candidate external tools for future version planning:

- `BlockNote` for a future block-based Note editor substrate spike.
- `Lexical`, `ProseMirror`, `Tiptap`, or `Milkdown` for richer editor substrate evaluation.
- `BlockSuite` as an architecture reference for schema/service/view/widgets separation.

Suggested patch breakdown:

- `v2.5.0`: Template Definition Runtime.
- `v2.5.1`: User-facing Template Editor Seed.
- `v2.5.2`: Composition Template Editor Seed.
- `v2.5.3`: Domain Block Set + Package Manifest.
- `v2.5.4`: Template Proposal + Migration Proposal.
- `v2.5.5`: Package Studio Lite.

Boundary notes:

- System block types should stay closed unless a later engineering plan proves otherwise.
- Template variants and Domain Block Sets are the preferred extension layer.
- Template changes should not silently migrate old blocks.
- First-stage Package Studio should remain schema-first and no-code/low-code; executable plugin marketplace can wait.

---

## 13. v2.6+ — Larger Knowledge Operations Expansion

**Status**: long-range direction; candidate scope only.

Goal: expand beyond learning-only workflows after source grounding, reconciliation, canvas projection, and template systems are stable.

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
- Briefing / Report Projection;
- Research Dossier;
- Evidence Board;
- Investigation Board;
- AI Result Board;
- media/video/audio snapshot extension;
- presentation mode;
- desktop app and local-first packaging;
- large-screen/projector interaction;
- community package marketplace after safety model matures.

Boundary notes:

- These are durable directions, not v2.2-v2.5 commitments.
- Personal knowledge operations should grow from source-grounded learning primitives rather than replacing them.

---

## 14. External Tool Evaluation Rule

External tools may power UI, rendering, viewer, editor, snapshot, or prototyping layers, but Coincides should own its domain model, source evidence, proposals, templates, and operation history.

Before adding a new external tool to an active version, the version plan or engineering spec should answer:

- license / runtime restriction;
- local-first viability;
- Windows development fit;
- whether it can run without taking over Coincides domain model;
- adapter strategy;
- export/backup/migration path;
- what data remains if the dependency is removed.

Henry's current product direction allows broader evaluation of GPL, AGPL, open-core, and SDK-licensed tools because Coincides is personal/open-source-first rather than closed commercial-first. The license details should still be recorded for future contributors or downstream users.

---

## 15. Later / 3.x+

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

## 16. Product Guardrails

- Preserve source traceability.
- Keep AI changes proposal-first.
- Do not judge the learner by default.
- Prefer factual organization language.
- Do not protect old Card/Deck architecture if it blocks the better product.
- Do not make packaging, cloud, or community tooling a precondition for the NoteBlock foundation.
- Keep Agent Memory lightweight and preference-oriented.
- Keep course learning content in Course Material Library and NoteBlock Library, not in opaque model memory.
- Keep Canvas / Board as projection surfaces unless a future plan explicitly creates another source-of-truth layer.
- Prefer template variants, composition templates, and Domain Block Sets over arbitrary low-level block type creation.
- AI-generated relations, canvas structures, template migrations, and reconciliation decisions require proposal review before apply.

---

## 17. Promotion Rule

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
