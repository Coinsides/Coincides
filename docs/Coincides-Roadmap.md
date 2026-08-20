> **状态 (Status)**: archived
> **层 (Layer)**: 历史 / History（已关闭的 v2.0–v2.5.6 工程地基路线图）
> **日期 (Updated)**: 2026-06-05
> **权威 (Authoritative)**: 否（文件自述 CLOSED）

# Coincides Roadmap v2.0-v2.5.6 (Closed Foundation Roadmap)

**Updated**: 2026-06-05
**Roadmap status**: CLOSED / historical foundation roadmap.
**Closed at**: v2.5.6 DomainRefinementProposal Seed.
**Historical mainline**: v2.0-v2.5.6 foundation work on `feat/v2.0-noteblock`
**Next roadmap**: `docs/Coincides-Better-Notebook-Roadmap.md`

---

## 1. Roadmap Role

This roadmap is the closed formal v2.0-v2.5.6 version-direction document.

It defines product direction, version themes, candidate conceptual entities, and major boundaries. It does not lock real database table names, fields, API endpoints, migrations, or UI implementation details.

Closure note:

- This document is now a historical foundation roadmap. It should preserve the v2.0-v2.5.6 engineering, source, canvas, template, package, and graph-readiness decisions.
- Do not append the Better Notebook product rebuild / mature notebook UX roadmap here.
- The next roadmap is `docs/Coincides-Better-Notebook-Roadmap.md`. It starts from the Product Improvement Issue Register, PI-046/PI-048 research, R15 GraphRAG decision work, Better Notebook research, and Henry's post-v2.5 product decision.
- v2.6+, v3.x, and later sections below are retained as historical candidates, not as active commitments.

Document responsibilities:

- **Roadmap**: version direction, sequencing, and candidate conceptual entities.
- **Brainstorm**: open idea pool and unresolved architecture/product thinking.
- **Version Plan**: current version boundary, committed scope, out-of-scope, contracts, and acceptance criteria.
- **Engineering Spec**: concrete implementation design such as real tables, fields, API routes, payloads, migrations, UI entry points, and tests.

Current execution entry:

- Brainstorm: `docs/brainstorm/v2.x-brainstorm.md`
- Product/reference research outline: `docs/brainstorm/v2.x-product-reference-research-outline.md`
- Roadmap revision research summary: `docs/brainstorm/v2.x-roadmap-revision-recommendations.md`
- v2.4 research outline: `docs/brainstorm/v2.4-research_里程碑-边与图数据库节点与未来方向/v2.4-research-outline.md`
- v2.4 Summary 1, Product Direction: `docs/brainstorm/v2.4-research_里程碑-边与图数据库节点与未来方向/summary-1-product-direction.md`
- v2.4 Summary 2, Core Differences: `docs/brainstorm/v2.4-research_里程碑-边与图数据库节点与未来方向/summary-2-core-differences.md`
- v2.4 Summary 3, Object Model: `docs/brainstorm/v2.4-research_里程碑-边与图数据库节点与未来方向/summary-3-object-model.md`
- v2.4 Summary 4, Engine Adoption: `docs/brainstorm/v2.4-research_里程碑-边与图数据库节点与未来方向/summary-4-engine-adoption.md`
- v2.4 Summary 5, Roadmap Revision: `docs/brainstorm/v2.4-research_里程碑-边与图数据库节点与未来方向/summary-5-roadmap-revision.md`
- v2.5 research outline: `docs/brainstorm/V2.5Research/v2.5-research-outline.md`
- v2.5 R1-R4 stage summary: `docs/brainstorm/V2.5Research/r1-r4-template-runtime-foundation-summary.md`
- v2.5 R5-R8 stage summary: `docs/brainstorm/V2.5Research/r5-r8-template-behavior-agent-editor-composition-summary.md`
- v2.5 R9-R11 stage summary: `docs/brainstorm/V2.5Research/r9-r11-domain-package-migration-summary.md`
- v2.5 R12 Rich Editor Adapter Criteria: `docs/brainstorm/V2.5Research/r12-rich-editor-adapter-spike-criteria.md`
- v2.5 R13 Graph-Native Migration Evidence: `docs/brainstorm/V2.5Research/r13-v2.5-graph-native-migration-evidence.md`
- v2.5 R14 Development Guidance: `docs/brainstorm/V2.5Research/r14-v2.5-roadmap-plan-revision-recommendations.md`
- Closed final version plan: `docs/releases/v2.5.6-plan.md`
- Closed final engineering spec: `docs/releases/v2.5.6-engineering-spec.md`
- Next roadmap entry: `docs/Coincides-Better-Notebook-Roadmap.md`

---

## 2. Product Direction

Coincides is moving toward a **Personal Learning Material OS / 学习管家**.

Its deeper product direction is a **source-grounded information workspace**: a system that turns sources into inspectable objects, objects into reviewed relations, relations into multiple views, views into AI-operable workspaces, and workspaces into portable packages.

It is not trying to become a general AI teacher, homework solver, generic chat tutor, or AI chat over files. Its core value is to help users organize scattered material into source-grounded, editable, reviewable, and reusable structures.

v2.x should make Coincides capable of handling real learning material: messy uploads, repeated sources, out-of-order course archives, partial textbook scopes, handwritten notes, formulas, examples, diagrams, and user-controlled review projections.

The first durable product surface is learning, but the architecture should remain compatible with broader personal knowledge and information operations such as research dossiers, briefing generation, evidence boards, investigation boards, game information guides, AI result boards, and future personal information-processing workflows. These broader uses should not expand active version scope prematurely, but they explain why source, evidence, relation, view, proposal, package, and AI observability must be designed as durable foundations.

Longer-term identity:

```text
source-grounded information workspace
  -> observable AI workbench
  -> graph-ready / future graph-native knowledge operating system
```

Closed roadmap shape after v2.5.6:

```text
v2.4.x:
  Canvas-first projection foundation
  relation-ready object model
  selected object operations

v2.5.x:
  Template / Composition / Domain / Package Runtime Infrastructure
  portable workspace and graph-native evidence foundation

post-v2.5.6:
  old roadmap closed
  Better Notebook roadmap to be written separately
  mature notebook UX, editor behavior, source reconstruction, and AI-assisted note/report assembly should be replanned from research

v3.x:
  graph-native architecture decision remains a future candidate
  Neo4j candidate evaluation
  graph migration from v2.x evidence should be reconsidered after Better Notebook planning
```

Core reliability ladder:

```text
Engineering reliability
  -> User reliability
  -> Human-AI reliability
```

This ladder is a core development philosophy, not a version feature.

1. **Engineering reliability first**: Coincides must preserve data, migrations, compatibility, source references, canvas layout recovery, operation history, and performance before UI polish or AI behavior is allowed to become the center of gravity. If the engineering substrate is unstable, better-looking UI and stronger models only make failures harder to reason about.
2. **User reliability second**: Coincides should become comfortable and trustworthy for a human even without heavy AI dependence. A user should be able to create, read, edit, arrange, recover, export, and share work through NoteBlocks, sources, templates, canvas projections, relations, and packages. Product polish is not merely visual polish; it should feed back into engineering decisions such as layout persistence, old-data compatibility, speed, density, recovery, and information loss prevention.
3. **Human-AI reliability third**: AI should become a reliable collaborator only after the human-operated product is stable enough to stand on its own. The first strong AI value is source-grounded decomposition, summary, organization, and NoteBlock/proposal generation. The later goal is smoother human-AI cooperation where agents can read selected objects, source evidence, relation layers, templates, domain packages, operation traces, and user feedback without turning the system into an opaque black box.

Current release-note stance:

- Before the product becomes broadly usable, internal checkpoints matter more than public-facing release notes.
- v1.x was a toy/prototype era; v2.x is an engineering and experimental era; v3.x is expected to be the graph-native architecture rebuild/evaluation era.
- Until at least the post-v3.x product shape is clearer, Henry primarily needs `Plan`, `Engineering Spec`, `Review`, `Experience Review`, and result-style `CHANGELOG` documents.
- Product-facing release notes can wait until Coincides becomes something a normal user can understand, use, and evaluate without reading the construction history.

This is the "quietly getting stronger" phase: build the reliable substrate first, then make it comfortable for humans, then make it genuinely cooperative with AI.

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
- Content truth, semantic truth, visual projection, editor state, and reviewed mutation must remain separate.
- Objects are truth. Relations are meaning. Views are ways of seeing and operating. Exports are outputs. Packages are portable workspaces.
- Coincides is not an AFFiNE clone, a tldraw wrapper, a Notion clone, a JSON Canvas file editor, a generic graph visualizer, or a plain AI tutor / chat RAG app.
- Coincides is a source-grounded information workspace where learning/content objects, evidence, reviewed relations, canvas projections, view presets, and AI proposals remain reconstructable, inspectable, and portable.
- NoteBlock remains the v2.x primary authored content object; future graph-native work should promote traceable content packages and relation endpoints only after v2.x evidence is clearer.
- CanvasNode is projection. CanvasEdge is visual connector. ObjectRelation is semantic / AI-readable relation. RelationLayer is relation purpose/view layer. EditorNode is adapter-level editor state. Proposal is reviewed mutation.
- CanvasEdge can degrade; ObjectRelation must not silently disappear; CanvasEdge -> ObjectRelation binding can break; package import must report recovery state.
- v2.x remains SQLite-first but graph-ready. Each relevant version should preserve future graph node/edge candidates, provenance, projection-vs-truth boundaries, and package/export implications for v3.x graph-native planning.
- External tools may assist interaction, rendering, editing, graph visualization, and export, but they must not own Coincides truth. The stable engine principle is: tool-assisted, not tool-owned.
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
- v2.2.x: Material Reconciliation foundation track completed through v2.2.3; Henry batch acceptance may be deferred.
- v2.3.x: Source Snapshot / Anchor / Scope / Source Board foundation track completed through v2.3.4 planning patch; Henry batch acceptance is deferred until Canvas / Source Board maturity.
- v2.4.x: Canvas / Relation foundation track completed through v2.4.5; Henry batch acceptance may be deferred.
- v2.5.x: Template / Package Runtime Infrastructure track closed through v2.5.6. v2.5.7 was not promoted in this roadmap.

Version locking rule:

- Each active minor or patch version must become decision-complete in `docs/releases/v2.X-plan.md` and later `v2.X-engineering-spec.md` before code work.
- `v2.2+` entries in this document are now historical directional records. Their candidate entities are planning hints, not final table names or implementation commitments.
- Do not promote new post-v2.5.6 work from this closed roadmap. Start a separate Better Notebook roadmap and promote future work from that new document.

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

**Status**: foundation track completed through v2.2.3; Henry batch acceptance can be handled later.

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

**Status**: foundation track completed through v2.3.4 planning patch; subjective UX acceptance deferred until Source Board / Canvas maturity.

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

## 11. v2.4.x — Canvas-first Learning Document + Relation-ready Projection Track

**Status**: active planning track; `v2.4.0` is being promoted into a version plan.

Goal: make Coincides notes and source-grounded learning objects live on a canvas-first document surface without creating a second knowledge universe.

The v2.4 direction is not an AFFiNE-style dual-mode document that switches between "document mode" and "canvas mode." Coincides should default to a single canvas-first document surface. Traditional page-like reading is still supported, but as a canvas projection preset rather than a separate document system.

Summary 2 roadmap impact: v2.4 should build a canvas-first document surface, but the canvas must remain projection. This version track should prove that Coincides can look and feel closer to a mature workspace while still keeping source-grounded objects, reviewed relations, proposal-first AI mutations, and recoverable package structure outside tool-owned canvas state.

Summary 1 roadmap impact: v2.4 should treat Canvas as the main human operating surface for the information workspace, RelationLayer as the meaning layer for AI and knowledge structure, ViewPreset as the long-term basis for multiple ways of seeing and operating on the same objects, and selected object scope as the key entry point for future AI operations.

Summary 5 roadmap revision: v2.4 should not try to finish a mature workspace in one step. It should prove that source-grounded objects can live on a usable canvas without losing truth, while preparing relation-backed edges, selected object operations, and later graph-native migration evidence.

Core mental model:

```text
NoteBlock / Source / Evidence / Proposal
  -> content and source-grounded objects

Canvas-first Document Surface
  -> presentation, layout, movement, reading, and spatial organization
```

Object boundary:

```text
NoteBlock:
  source-grounded learning/content object

CanvasNode:
  projection of a domain object

CanvasEdge:
  visual connector

ObjectRelation:
  semantic / AI-readable relation

RelationLayer:
  relation collection / purpose / visibility layer

EditorNode:
  editor adapter state

Proposal:
  reviewed mutation object
```

Projection presets may include:

- infinite board;
- finite canvas;
- A4 / Letter / common paper sizes;
- 16:9 / presentation sizes;
- dense page-like reading layout;
- source board layout;
- later report / briefing / formula sheet layouts.

Primary themes:

- Learning Canvas as the default document surface over NoteBlocks, SourceAnchors, SourceScopes, SourceBoardNodes, MaterialSegments, EvidenceSets, Proposals, and Projections;
- support finite and infinite canvas documents;
- support page-like reading layouts without introducing a separate document mode;
- preserve propagation/sharing needs: a page-like export, a canvas projection, and an editable project/package must all be possible future outputs over the same source-grounded object set;
- keep ViewPreset / CanvasPreset / ExportPreset concepts visible even if the first implementation only stores the minimum canvas data;
- separate content state, layout state, viewport/session state, and projection preset state;
- support basic pan/zoom/select/move/open-target interactions;
- make selection return stable object scope, not just screen coordinates, so future AI commands can operate on selected objects;
- allow users to manually insert NoteBlocks on the canvas and choose template-aware block options;
- allow agents to propose blocks and layouts through Proposal -> Review -> Apply;
- keep CanvasNode / CanvasEdge as projection records, not canonical truth;
- seed ObjectRelation / RelationLayer and Command & Interaction System after the basic canvas surface exists;
- preserve flexible `target_type` / `target_id` relation endpoints so v2.x remains graph-ready;
- keep external canvas/editor engine snapshots as optional cache or sidecar, not project truth;
- support package recovery rules where visual continuity and semantic continuity can recover independently.
- prevent external tool adoption from turning Coincides into a clone/wrapper; adapters may improve interaction quality, but the product identity remains source-grounded object + relation + proposal + projection.

Candidate conceptual entities / likely tables:

- `LearningCanvas`
- `CanvasPreset`
- `CanvasPageSpec`
- `CanvasNode`
- `CanvasEdge`
- `CanvasFrame`
- `CanvasViewportState`
- `CanvasLayoutProposal`
- `CanvasBlockInsertion`
- `ObjectRelation`
- `RelationLayer`
- `Command`
- `ToolMode`
- `InputBinding`
- `Context`
- `ViewPreset`
- `SelectedObjectScope`
- `AICommandContext`

Candidate external tools for future version planning:

- `tldraw` as the strongest v2.4.1 Canvas adapter spike candidate for infinite canvas SDK, custom shapes, tool mode, store/session, bindings, arrows, and frames.
- Lightweight React/CSS canvas as the fallback if the `tldraw` gate fails.
- `Excalidraw` for lightweight canvas/board prototyping, arrows, frames, rough visual ideation, export reference, and fallback comparison.
- `React Flow` as a v2.4.4 relation editor / extracted graph view candidate, not as the main LearningCanvas.
- `Cytoscape.js` or `AntV G6` as later graph-view candidates for relation inspection or topic-specific extracted views.

Tool ownership rule:

```text
External canvas tools may render and handle interaction.
Coincides owns LearningCanvas, CanvasNode, CanvasEdge, ObjectRelation, RelationLayer, CanvasFrame, source grounding, proposals, and operation history.
```

Before adopting any canvas tool, the active engineering spec must complete the External Tool Gate:

- intended job: rendering, interaction, store/session, shape system, export, or prototyping;
- why current React/CSS surfaces are insufficient;
- license / production runtime restrictions;
- local Windows viability;
- adapter strategy between Coincides objects and canvas shapes;
- whether the tool can be removed without losing Coincides domain data;
- how it affects Source Board, SourceAnchor, SourceScope, NoteBlock, Proposal, and future Command System;
- how it avoids turning tool-native JSON into the source of truth.
- whether the canvas can be rebuilt without the external tool snapshot;
- whether tool-native shape IDs can be removed without breaking Coincides domain IDs;
- how package import reports degraded CanvasEdges, broken relations, stale bindings, and missing source/evidence.

Suggested patch breakdown:

- `v2.4.0`: Canvas-first Document Model + Canvas Data Contract.
  - Lock the single-surface model.
  - Define finite/infinite canvas settings.
  - Define page-size presets such as A4, Letter, 16:9, and custom dimensions.
  - Define content/layout/session/projection separation.
  - Seed ViewPreset / CanvasPreset / ExportPreset vocabulary.
  - Define the External Tool Gate for tldraw / Excalidraw before implementation.
  - Do not implement full tldraw integration, connector editing, ObjectRelation, template insertion, AI layout proposal, or full visual redesign in this patch.
- `v2.4.1`: Canvas Engine Gate + Basic Canvas Viewer / Editor.
  - Run a formal Canvas Engine Gate.
  - Attempt a `tldraw` adapter spike if approved.
  - Keep lightweight React/CSS canvas as fallback.
  - Show an existing canvas document.
  - Support pan, zoom, select, move, resize where reasonable, and open target.
  - Display NoteBlocks, SourceScopes, SourceBoardNodes, and EvidenceSets as nodes.
  - Save CanvasNode layout back to Coincides-owned tables.
  - Return stable selected object IDs from canvas selection.
  - Confirm NoteBlock, Source, Evidence, Proposal, and ObjectRelation truth are not stored only in tool-native metadata.
  - Rebuild canvas from Coincides data if external engine snapshot is missing.
  - Record license, attribution, runtime, and data sovereignty findings in review.
  - Keep visual styling functional and restrained; this is not the final visual redesign.
- `v2.4.2`: Template-aware Block Insertion on Canvas.
  - Let users create a new block directly on the canvas.
  - Use the v2.1.1 template registry concepts: system type, learning role, template id.
  - Support friendly choices such as definition, formula, example, exercise, source quote, warning, and code.
  - Create a CanvasNode projection for the new block while preserving NoteBlock truth outside the canvas engine.
  - Keep low-level system types closed; variants/templates remain the extension layer.
- `v2.4.3`: Agent Canvas Layout Proposal UX.
  - Let the agent propose canvas nodes, positions, frames, and initial layout from selected material, Source Board nodes, or notes.
  - Allow selected SourceBoard nodes, SourceScopes, and NoteBlocks to become layout proposal inputs.
  - Proposal preview must show affected objects, warnings, confidence, and apply behavior.
  - Applying a proposal creates or updates layout records only; it must not rewrite source truth or silently change NoteBlock content.
  - Treat AI layout proposal as a proposal over a view, not direct authorship of truth.
- `v2.4.4`: Canvas Edges + ObjectRelation Seed.
  - Rename the durable semantic model from generic `BlockRelation` to `ObjectRelation` in specs unless an active plan justifies otherwise.
  - Add first CanvasEdge seed and ObjectRelation seed.
  - Add RelationLayer seed.
  - Distinguish visual-only, incomplete, relation-suggested, relation-backed, stale, stale-binding, and broken-relation states.
  - Add first relationship types for learning connections such as `uses_definition`, `uses_formula`, `example_of`, `answers`, `supports`, `contradicts`, `read_before`, and `derives_to`.
  - Keep visual edges proposal-first when AI-generated.
  - Do not treat visual proximity or an arrow as verified truth without review.
  - Evaluate whether `tldraw` arrows/bindings are enough for visible connectors, or whether `React Flow` should support relation editing / extracted relation views.
- `v2.4.5`: Command & Interaction System Seed.
  - Define command, tool mode, input binding, and context.
  - Keyboard shortcuts are one kind of input binding, not the whole system.
  - Add selected-object operation concepts for future AI commands.
  - Seed AI command context with selected objects, active canvas, active relation layers, operation intent, and proposal-first requirement.
  - Add early relation-layer switching / show-hide command concepts where useful.
  - Keep future desktop, large-screen, projector, and gesture interaction paths in mind.
- `v2.4.6`: Composition / Section Template Seed if urgent.
  - Only add this patch if canvas work shows immediate need for reusable formula sheets, side-note sections, evidence tables, reports, or briefing sections.
  - If not urgent, move composition/section template work into v2.5.

Boundary notes:

- Canvas is the default document surface, but it remains a projection over source-grounded objects.
- A plain text or page-like note is a canvas preset, not a separate document mode.
- Canvas nodes should reference existing domain objects rather than copying content.
- Canvas must be able to degrade or rebuild without losing NoteBlocks, Sources, EvidenceSets, Proposals, ObjectRelations, or package-level provenance.
- v2.4 should make the app feel less like isolated engineering panels, but it should not attempt a full Notion/AFFiNE visual redesign before the canvas object model is stable.
- Document reading order and canvas layout order are separate but can be synchronized by a projection preset.
- Canvas AI must remain proposal-first, especially for generated layouts and relation edges.
- Manual block insertion should reuse the template/taxonomy system rather than creating arbitrary low-level block types.
- Keyboard shortcuts should be treated as one input binding inside a broader Command & Interaction System.
- AI commands should eventually operate on selected object scopes rather than vague page text whenever possible.
- AI should use canvas/view structure as an operation surface, but accepted source/evidence/relation truth must stay proposal-first and inspectable.
- Rich NoteBlock editor replacement is not v2.4.1 work. Editor tools should remain adapter-level if evaluated later.
- 2.5D/3D note spaces remain out of v2.4; they are future research ideas after the 2D canvas is excellent.

---

## 12. v2.5.x — Template / Composition / Domain / Package Runtime Infrastructure

**Status**: closed through v2.5.6. v2.5.7 was not promoted in this roadmap.

Goal: establish the runtime, governance, package, and migration foundations that let templates become a durable extension layer for NoteBlocks, compositions, domains, AI behavior, packages, and future graph-native migration.

Closeout note:

- v2.5.0-v2.5.6 completed the runtime/governance foundation needed for later notebook work: TemplateDefinition, Template Studio seed, CompositionTemplate, DomainBlockSet, PackageManifest, TemplateMigrationProposal, package import/export, and DomainRefinementProposal.
- The original v2.5.7 rich editor adapter spike remains deferred. Its concerns are now part of the separate Better Notebook roadmap discussion rather than this closed foundation roadmap.
- Future work should not continue this section by inertia. Use this section as evidence and background for the new roadmap.

R14 guidance: v2.5 is not a "template editor" track. It is the **Template / Composition / Domain / Package Runtime Infrastructure Track**. User-facing template editing matters, but it must come after runtime identity, compatibility, behavior boundaries, AI-readable summaries, and proposal-first migration safety.

Research reference rule: before writing any v2.5 small-version plan, read:

- `docs/brainstorm/V2.5Research/v2.5-research-outline.md`
- `docs/brainstorm/V2.5Research/r14-v2.5-roadmap-plan-revision-recommendations.md`
- the stage summary or research report directly related to that patch
- `docs/continuity/Coincides-Continuity.md`
- `docs/continuity/2.x/v2.x-continuity.md`

For v2.5.0, required references include:

- `docs/brainstorm/V2.5Research/r1-r4-template-runtime-foundation-summary.md`
- `docs/brainstorm/V2.5Research/r5-r8-template-behavior-agent-editor-composition-summary.md`
- `docs/brainstorm/V2.5Research/r13-v2.5-graph-native-migration-evidence.md`

Core v2.5 principles:

- Build the extension engine before the extension UI.
- Preserve truth before improving interaction.
- Record migration evidence before graph-native rewrite.
- Keep `system_type` closed unless a later engineering plan proves otherwise.
- Let template variants, composition templates, and Domain Block Sets be the extension layer.
- Do not silently migrate old NoteBlocks.
- Do not treat template behavior fields as source truth, relation truth, or mutation authorization.
- Keep external rich editors adapter-only; they must not own Coincides truth.
- Treat `.coincides` packages as data/package boundaries first, not executable plugins or marketplace items.

Candidate conceptual entities / likely tables:

- `TemplateDefinition`
- `TemplateCompatibilityReport`
- `CompositionTemplate`
- `CompositionInstance`
- `DomainBlockSet`
- `PackageManifest`
- `PackageImportPreview`
- `TemplateProposal`
- `CompositionTemplateProposal`
- `TemplateMigrationProposal`
- `DomainRefinementProposal`
- `PackageImport`
- `PackageExport`
- package validation metadata
- graph-native migration evidence metadata

Graph-native evidence rule:

Every v2.5 plan and review should include a short `Graph-Native Migration Evidence` section answering:

- Is the new object a future graph node, graph edge, graph property, package object, projection object, or relational side table?
- Does it connect to NoteBlock, SourceAnchor, EvidenceSet, CanvasNode, ObjectRelation, Proposal, or PackageManifest?
- What provenance must survive migration?
- What can be rebuilt from Coincides canonical truth?
- What breaks if this object is missing after `.coincides` import/export?

Suggested patch breakdown:

- `v2.5.0`: Template Definition Runtime.
  - Treat this as the runtime safety version, not the template editor version.
  - Add persistent `template_definitions` and seed it from the v2.1.1 static registry.
  - Add runtime template resolving with UUID + `template_key` + version identity.
  - Preserve compatibility with existing NoteBlocks and keep `note_blocks.block_type` during the transition.
  - Add a compatibility report for `runtime_resolved`, `legacy_inferred`, `template_missing`, `template_deprecated`, `metadata_conflict`, `unknown_legacy_type`, and `manual_review_required`.
  - Define `field_schema`, `default_content`, structured `render_hints`, `source_behavior`, `relation_behavior`, `proposal_behavior`, and `summary_for_agent`.
  - Use strict validation for new runtime-created blocks and soft legacy reading for old blocks.
  - Do not build the full user-facing template editor or silently migrate old blocks.
- `v2.5.1`: User-facing Template Editor Seed.
  - Provide a guided no-code / low-code editor over runtime `TemplateDefinition`.
  - Support template library, template detail, copy-from-system-template, field editor lite, render intent editor lite, source/relation/proposal policy presets, `summary_for_agent` editor lite, preview, lifecycle, and compatibility warnings.
  - Users edit template variants, not low-level system block types.
  - Unsafe changes use proposal-first migration.
- `v2.5.2`: Composition / Section Template Seed.
  - Define reusable multi-block section recipes such as formula sheets, theorem-proof-example clusters, source quote + interpretation sections, evidence comparison sections, briefing sections, and side-note clusters.
  - `CompositionTemplate` is not a larger NoteBlock; it defines slots, allowed templates, required/optional/repeatable behavior, layout behavior, source behavior, relation blueprint, proposal behavior, and AI guidance.
  - Composition apply should remain proposal-first.
  - `relation_blueprint` is design intent, not confirmed `ObjectRelation`.
- `v2.5.3`: Domain Block Set + Package Manifest.
  - Define domain-specific template bundles and package identity.
  - Treat `DomainBlockSet` as a composable domain graph, not a rigid taxonomy tree.
  - Preserve `stable_id`, `domain_key`, aliases, parent/related domains, facets, status, and migration history.
  - Keep package as data, not plugin.
  - Preserve enough structure for future `Template Coverage Check` and `Domain Fit Check`.
- `v2.5.4`: Template Proposal + Migration Proposal.
  - Add preview, diff, warnings, affected object count, sample before/after, source impact, relation impact, render impact, operation batch, and recovery metadata.
  - Support direct-safe vs proposal-required edit classification.
  - Use three migration modes: alias/mapping, soft migration, and hard cascade migration.
  - Reserve or seed `DomainRefinementProposal` for domain promotion, split, merge, rename, deprecate, fork, and reclassification work.
  - Do not silently rewrite old NoteBlocks.
- `v2.5.5`: Package Studio Lite / Export-Import Foundation.
  - Seed `.coincides` package levels: Light and Trusted.
  - Add package/export/import preview, source inclusion choices, validation warnings, conflict detection, recovery reporting, and operation batch.
  - Distinguish source inclusion modes: omit, reference-only metadata, and snapshot text as recovery material.
  - Keep package validation/import/export engine headless so a future standalone authoring tool can reuse it.
  - Do not build marketplace, executable plugin behavior, original file bundling, or full project backup.
- `v2.5.6`: DomainRefinementProposal Seed.
  - Promote the deferred `DomainRefinementProposal` concept after v2.5.5 package import/export evidence.
  - Support proposal-first domain rename, split, merge, deprecate, fork, promotion, and reclassification planning.
  - Generate dry-run impact reports over `DomainBlockSet`, template memberships, composition memberships, package manifests, compatibility reports, and affected NoteBlocks.
  - Apply only conservative metadata/mapping changes with operation batches and recovery records; do not silently rewrite old NoteBlocks or package contents.
  - Preserve domain evolution evidence for future graph-native migration: domain successor links, membership changes, package compatibility impact, and provenance.
- `v2.5.7`: Rich NoteBlock Editor Adapter Spike, deferred / not promoted in this closed roadmap.
  - Do not run this just because the UI is rough.
  - Candidate order if needed: Tiptap/ProseMirror, Lexical, BlockNote, Milkdown, BlockSuite as reference.
  - Any adapter must prove NoteBlock identity, template metadata, source markers, ObjectRelation truth, proposal-first safety, selected object scope, and adapter removability.
  - Editor document model must not become Coincides domain model.
  - Post-v2.5.6 decision: this topic should be reconsidered inside the separate Better Notebook roadmap, together with PI-046 editor/product research and the Product Improvement Issue Register.

Boundary notes:

- Existing v2.1.1/v2.4 template-aware NoteBlocks should remain compatibility samples until v2.5.0 reports prove they are safe to migrate or archive.
- Field schema defines content shape; it must not hide source truth or relation truth inside `content_json`.
- Render hints describe display intention; CSS/view presets own final visual design.
- Normal reading should move toward contextual labels instead of permanent engineering-style type badges.
- Template changes, editor migrations, AI-generated rewrites, package imports, and domain refinements should use proposals when they alter source-grounded or semantic structure.
- v2.5 should create the first AI-readable internal operating manual scaffold so future agents know how to extend Coincides safely.

---

## 13. v2.6+ — Larger Knowledge Operations Expansion

**Status**: historical long-range candidate scope only; superseded by the separate Better Notebook roadmap process for active planning.

Goal: expand beyond learning-only workflows after source grounding, reconciliation, canvas projection, and template systems are stable.

Summary 1 roadmap impact: broader information operations are not a distraction from learning. They are the natural consequence of source-grounded objects, reviewed relations, multiple views, proposal-first AI operations, and portable packages. These features should remain long-range until v2.4/v2.5 foundations are stable, but they should influence architecture boundaries now.

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
- Game Information Guide;
- Observable AI Workbench surfaces;
- AI operation trace / action strength / feedback capture;
- selected-object AI operations across views;
- media/video/audio snapshot extension;
- presentation mode;
- desktop app and local-first packaging;
- large-screen/projector interaction;
- community package marketplace after safety model matures.

Boundary notes:

- These are durable directions, not v2.2-v2.5 commitments.
- Personal knowledge operations should grow from source-grounded learning primitives rather than replacing them.
- After the v2.0-v2.5.6 roadmap closeout, these ideas should be re-evaluated in the new Better Notebook roadmap instead of treated as automatic v2.6 work.

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

## 15. v3.x Graph-native Architecture Candidate

**Status**: long-range architecture candidate; not a v2.4 implementation dependency.

Goal: evaluate whether Coincides should transition from a graph-ready SQLite MVP to a graph-native architecture after v2.x clarifies durable objects, relations, source/evidence provenance, projection boundaries, proposal history, and package/export needs.

Summary 2 roadmap impact: v3.x should evaluate graph-native architecture after v2.x answers what the durable nodes, edges, provenance records, projection objects, and package objects actually are. For now, v3.x remains a coarse architecture direction, not a detailed implementation plan.

Summary 1 roadmap impact: v3.x should remain a coarse architecture-hardening direction until v2.x leaves enough evidence about durable objects, durable relations, source/evidence provenance, AI-readable traversal, projection boundaries, package/import/export needs, and proposal history. The goal is not merely to port tables into a graph database; it is to decide whether Coincides should become a graph-native information processing hub.

Current working hypothesis:

```text
v2.x:
  SQLite source of truth
  graph-ready schema
  concrete objects and relation tables
  migration evidence collection

late v2.x or pre-3.x:
  graph mirror / graph export / Neo4j spike

v3.x:
  evaluate Neo4j-backed graph-native architecture as the main candidate,
  with Kuzu or embedded graph alternatives still considered.
```

Why not migrate immediately:

- v2.x object model is still evolving;
- the final graph node set is not known yet;
- source/evidence/proposal history needs more real usage;
- canvas and editor engines should remain replaceable adapters;
- premature graph-native migration would slow v2.4/v2.5 and risk rework.

What v2.x must preserve for v3.x:

- future graph node candidates;
- future edge/relation candidates;
- object boundaries that show what should become graph nodes, graph edges, graph metadata, or relational side tables;
- `target_type` / `target_id` style flexible endpoints;
- accepted/suggested/rejected/stale/superseded relation states;
- visibility such as visible, hidden, AI-only, advanced-only, or archived;
- source/evidence/proposal provenance;
- projection-vs-truth boundaries;
- view/projection records that can be rebuilt from graph-native truth rather than becoming the graph truth themselves;
- AI-readable traversal requirements, including selected object scopes, hidden AI reading layers, relation layers, and proposal-first mutation paths;
- package import/export recoverability;
- external engine state as cache/sidecar rather than truth.

Graph-native evidence collection rule:

- Every v2.x version that introduces durable objects, durable relationships, projection records, proposal behavior, source/evidence provenance, view presets, package/export behavior, or AI-readable traversal should record what it teaches about a future graph-native rebuild.
- The goal is not to implement graph database storage during v2.x. The goal is to make sure v3.x does not have to infer node/edge/provenance decisions from scattered code and chat history.
- A dedicated continuity register such as `docs/continuity/2.x/v2.x-graph-native-migration-notes.md` should be considered before or during the v2.4/v2.5 closeout period.
- Backfill should include at least v2.0 NoteBlock, v2.1 SourceMaterial/MaterialSegment/Proposal, v2.2 EvidenceSet/Reconciliation, v2.3 SourceSnapshot/Anchor/Scope/Board, and v2.4 LearningCanvas/CanvasNode/CanvasEdge/ObjectRelation/RelationLayer/ViewPreset.

Questions that must be answered before graph-native migration:

- Is `NoteBlock` the graph node, or does a traceable ContentGroup / endpoint model become the graph node?
- Is `SourceAnchor` a node, edge property, or provenance object?
- Is `EvidenceSet` a node, relation bundle, or both?
- Is `CanvasNode` part of the knowledge graph or only projection?
- Does `CanvasEdge` live in graph storage, or only `ObjectRelation`?
- Are `RelationLayer`s graph nodes, relationship properties, labels, or subgraph metadata?
- Does proposal history live in graph storage, SQL storage, or hybrid storage?
- Which tables remain relational even after graph-native migration?
- How should `.coincides` packages export/import graph-native data?
- How should local Neo4j service setup work for local-first/desktop use?

Recommended transition strategy:

```text
1. Continue SQLite graph-ready design.
2. Maintain graph-native migration notes from v2.x evidence.
3. Add a rebuildable graph projection/export from SQLite objects.
4. Mirror selected objects and relations into local Neo4j.
5. Run Cypher queries for prerequisite traversal, source-backed relation lookup, topic subgraph extraction, proof chains, and AI reading paths.
6. Compare Neo4j query power and developer experience against SQLite relation tables.
7. Decide v3.x graph-native architecture.
```

Coarse v3.x direction:

- graph-native storage is a serious candidate, with Neo4j as the current primary ecosystem candidate;
- the v3.x decision should happen only after v2.x has enough real NoteBlock, Source, EvidenceSet, ObjectRelation, RelationLayer, CanvasNode, Proposal, package, and export evidence;
- v3.x should not merely port tables into graph storage. It should redesign Coincides around durable objects, reviewed semantic relations, provenance, projection rebuildability, and AI-readable subgraphs;
- v3.x should evaluate whether Coincides becomes a graph-native source-grounded information workspace with observable AI workbench behavior;
- any graph migration must preserve the ability to export/import editable workspaces, recover broken visual bindings, and explain which semantic relations survived, degraded, or require review.

---

## 16. Later / 3.x+

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

## 17. Product Guardrails

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

## 18. Promotion Rule

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
