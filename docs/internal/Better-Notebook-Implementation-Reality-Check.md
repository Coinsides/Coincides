# Better Notebook Implementation Reality Check

**Updated**: 2026-06-06
**Status**: Current code capability inventory for V2.BN planning
**Purpose**: distinguish implemented substrate from Better Notebook target UX

---

## 1. Summary

The current repo contains a substantial v2.x semantic foundation, but it does not yet contain the mature Better Notebook product surface.

Implemented substrate exists for:

- notes and NoteBlocks;
- course/project-like containers;
- source snapshots, anchors, scopes, and boards;
- learning canvas and canvas nodes;
- visual canvas edges and semantic object relations;
- template, composition, domain, package, and migration governance;
- proposal-first operations.

Major Better Notebook UX gaps remain:

- natural blank-page writing;
- freeform text-box-like NoteBlock layout;
- polished page/canvas surface;
- formal/scratch layer UX;
- source attachment as lightweight user workflow;
- mature relation definitions and relation inspector;
- local relation graph;
- product shell/navigation redesign.

---

## 2. App Shell / Navigation

Current implementation has a general app shell with routes for major areas such as courses, calendar, goals, decks, statistics, settings, notes, and templates.

Reality:

- `client/src/components/Layout/AppLayout.tsx` exists.
- Course-oriented navigation exists.
- Template Studio exists at `client/src/pages/Templates/TemplateStudio.tsx`.

Better Notebook gap:

- user-facing `Project` language is not yet the dominant product surface;
- note-first navigation is not yet the main experience;
- advanced foundation features are still too visible as product areas.

---

## 3. Course / Project Surface

Current implementation still centers on courses.

Reality:

- `client/src/pages/Courses/Courses.tsx`
- `client/src/pages/Courses/CourseDetail.tsx`
- backend `server/src/routes/courses.ts`

Better Notebook gap:

- product surface should shift toward `Project`;
- Course Detail currently carries many source/canvas/proposal panels;
- future work should make the main note/report surface the primary entry, not a crowded engineering dashboard.

---

## 4. Notes And NoteBlocks

Current implementation has a v2 NoteBlock foundation.

Reality:

- backend routes: `notes.ts`, `noteBlocks.ts`, `projections.ts`;
- migration: `015_v2_note_foundation.ts`;
- frontend page: `client/src/pages/Notes/NoteDetail.tsx`;
- NoteBlocks support basic content and editing foundations.

Better Notebook gap:

- blank page does not yet feel like a mature writing surface;
- NoteBlocks do not yet behave like natural resizable text/content boxes;
- slash command, rich text selection toolbar, layout edit mode, and polished block states are not yet mature;
- slash command does not yet distinguish create-new-block from convert-current-block;
- internal link/navigation model is not yet defined as separate from SourceReference and ObjectRelation;
- structured NoteBlock field schema / field values / field layout are not yet part of the Better Notebook contract;
- local graph, AI reading, and export cannot yet rely on structured fields such as `concept_name`, `description`, or `latex_input`;
- deletion/undo behavior needs Better Notebook-level contract.

---

## 5. Canvas Surface And CanvasNode Layout

Current implementation has a learning canvas foundation.

Reality:

- backend routes: `learningCanvases.ts`, `canvasNodes.ts`;
- service: `learningCanvases.ts`;
- migration: `023_v2_learning_canvas.ts`;
- frontend surface: `client/src/pages/Courses/LearningCanvasSurface.tsx`;
- canvas nodes can represent projected objects and store layout.

Better Notebook gap:

- canvas is not yet the main polished note surface;
- page/document boundary, A4/page modes, outside scratch space, and export preview need product-grade UX;
- freeform text/image/formula placement needs a deliberate block-box model.

---

## 6. CanvasEdge / ObjectRelation / RelationLayer

Current implementation has the first relation seed.

Reality:

- migration: `024_v2_canvas_relations.ts`;
- backend routes: `canvasEdges.ts`, `objectRelations.ts`, `relationLayers.ts`;
- current model separates visual edge from semantic object relation;
- relation layers exist as seed visibility/grouping surface.

Better Notebook gap:

- RelationType is still underdefined;
- RelationGroup / RelationPack is not yet mature;
- group/composite relation is not first-class;
- relation lifecycle needs product-level implementation;
- relation inspector and relation mode need a better UX;
- local relation graph and supernode folding are future work.

Authority doc:

- `docs/Coincides-Relation-Product-Design.md`

---

## 7. Source Snapshot / Scope / Board

Current implementation has source foundation.

Reality:

- migrations: `019_v2_source_snapshots.ts`, `020_v2_source_anchors.ts`, `021_v2_source_scopes.ts`, `022_v2_source_boards.ts`;
- backend services/routes for source snapshots, anchors, scopes, boards, and board nodes;
- source boards can organize source scopes and seed canvas/proposal workflows.

Better Notebook gap:

- source attachment is not yet a lightweight writing workflow;
- source system does not yet support internal note/report/NoteBlock as derived source;
- source system does not yet support external source versioning;
- source operation language does not yet clearly separate remove reference, clear references, archive, deprecate, and delete source object;
- source chain health does not yet expose missing, broken, degraded, or recovered states;
- source system does not yet distinguish unprocessed evidence, condensed note source, agent briefing, reasoning trace, or archive-only material;
- source system does not yet have an explicit ImportMode such as evidence source, reconstruct existing note, or archive only;
- existing note reconstruction, condensed source alignment, and condensed source merge proposals are not implemented;
- precise source region / OCR/VLM source reconstruction is not implemented;
- source badges, source inspector, jump targets, and user-authored source-free block UX need productization.

---

## 8. Template / Composition / Domain / Package

Current implementation has a strong v2.5 runtime foundation.

Reality:

- `TemplateDefinition` runtime exists through routes/services and migration `025_v2_template_definitions.ts`;
- `CompositionTemplate` exists through migration `026_v2_composition_templates.ts`;
- `DomainBlockSet` and `PackageManifest` exist through migration `027_v2_domain_packages.ts`;
- template migration, package import/export, and domain refinement foundations exist through migrations `028`, `029`, and `030`;
- Template Studio exists.

Better Notebook gap:

- these systems are powerful but still feel like advanced tooling;
- ordinary writing should not require understanding template/domain/package internals;
- future Better Notebook versions should surface templates through slash commands, block creation, and guided inspectors.

---

## 9. Proposal-First Mutation

Current implementation has multiple proposal-first workflows.

Reality:

- organized note proposals;
- material map/reconciliation proposals;
- canvas layout proposals;
- composition template proposals;
- template migration proposals;
- domain refinement proposals;
- operation batches.

Better Notebook gap:

- proposal-first is appropriate for generated/migration/risky changes;
- ordinary manual notebook editing should feel direct and undoable;
- the product needs a clearer boundary between direct editing, undo, proposal-first migration, and adapter-generated candidate.

---

## 10. Gap To Roadmap Mapping

The gaps above are not a separate backlog outside the roadmap. They should be treated as implementation evidence for the following `V2.BN.x` phases.

| Reality gap | Primary roadmap phase | Data / contract concern |
| --- | --- | --- |
| Product shell is still course/source-panel oriented | `V2.BN.1` Product shell and navigation | User-facing `Project` language can remain UI-only unless favorites, note-first navigation, or project grouping needs persisted state. |
| Blank page writing is not natural yet | `V2.BN.2` Natural page writing | Direct NoteBlock creation, default block metadata, delete/undo, and ordinary edit persistence must be checked before UI work is accepted. |
| Slash command does not distinguish creation from conversion | `V2.BN.2` Natural page writing | `/definition`, `/formula`, and similar commands should create structured blocks when empty and convert current freeform blocks when non-empty. |
| NoteBlocks do not behave like freeform text boxes | `V2.BN.3` Freeform NoteBlock box and layout mode | Placement / BlockBox fields must support resize, text reflow, snapping, grouping, and rebuild. If `canvas_nodes` / placements are not enough, this phase should add the missing data contract instead of faking it in React state. |
| Page/canvas/export boundary is not mature | `V2.BN.4` Page/canvas/export boundary | Formal layer, scratch/thinking layer, export visibility, page coordinate, and AI visibility need explicit persisted meaning. |
| Block visual language is still engineering-card-like | `V2.BN.5` Block visual language and control layer | Prefer UI state first, but any durable user choice such as block style variant or visibility role must have canonical storage. |
| Structured fields do not yet have a UX contract | `V2.BN.5` Block visual language and control layer | Field display, field box layout, selected field controls, and template-controlled schema must be distinct from ordinary text editing. |
| Data model is carrying v2.x foundation assumptions | `V2.BN.6` Better Notebook data contract | Consolidate truth boundaries, backfill decisions, rebuild rules, deletion/undo semantics, and adapter boundaries across earlier phases. |
| Link / SourceReference / ObjectRelation are not yet formalized as separate objects | `V2.BN.6` Better Notebook data contract | Link should remain navigation, SourceReference provenance, and ObjectRelation semantic relation. One block may carry all three without collapsing them. |
| Source attachment is not a lightweight writing workflow | `V2.BN.8` Source library and provenance foundation | Source references must support user-written blocks, multiple sources, external source versions, internal notes/blocks, direct/root/full chain, cross-project usage, and source-free writing without treating it as an error. |
| Source operation and deletion states are underdefined | `V2.BN.8.1` Source operations and degraded chain UX | Remove reference, clear references, archive, deprecate, delete, missing snapshot, tombstone, broken chain, and degraded chain states need explicit UX and data rules. |
| Existing notes / condensed sources are not represented as a distinct import workflow | `V2.BN.6` data contract, `V2.BN.8` Source Library, Phase G source reconstruction readiness | ImportMode and SourceKind/SourceIntent should distinguish evidence source, reconstruct existing note, archive-only, condensed note, agent briefing, human interpretation, draft/final report, and reasoning trace. |
| Existing note reconstruction is not implemented | Phase G source reconstruction readiness | Handwritten notes, lecture notes, agent briefings, and draft reports need preservation-first reconstruction, alignment, and merge workflows before they become production features. |
| Relation is still underdefined | `V2.BN.9` Relation definition runtime and model maturity | RelationType / RelationGroup / RelationPack, directionality, condition, group relation, lifecycle, visibility, provenance, and GraphRAG mapping need a runtime contract. |
| Relation operations are not yet explainable to users | `V2.BN.10` Relation inspector and relation mode seed | Visual connector, semantic ObjectRelation, hidden relation, stale/broken relation, and relation bundle states must be visible and editable without corrupting truth. |
| Local graph view does not exist | `V2.BN.11` Local relation graph and supernode folding | Graph view should be a projection/query view. Supernode folding must not merge real NoteBlocks or ObjectRelations. |
| Concept search/metadata does not exist | `V2.BN.12` Concept-lite search and inspector UX | Concept-lite should help retrieval and filtering without replacing template, source, relation, or embedding dimensions. |

Data gap rule:

`V2.BN.x` is a productization track, but it is not UI-only. If a user workflow depends on a missing field, table, lifecycle state, rebuild rule, undo rule, or compatibility rule, that data gap should be fixed in the same phase that introduces the workflow. `V2.BN.6` is the consolidation and audit phase; it must not become a dumping ground that delays data fixes needed by `V2.BN.2` to `V2.BN.5`.

---

## 11. Immediate Planning Implication

Future `V2.BN.x` work should not assume the target Better Notebook UX exists.

Recommended next sequence:

```text
V2.BN.1  Product shell and navigation
V2.BN.2  Natural page writing
V2.BN.3  Freeform NoteBlock box and layout mode
V2.BN.4  Page/canvas/export boundary
V2.BN.5  Block visual language and control layer
V2.BN.6  Better Notebook data contract
```

Only after the human writing/layout surface is stable should full AI note assembly or source reconstruction become the main implementation focus.
