# Coincides PRD

**Updated**: 2026-06-06
**Status**: Active product requirements for the Better Notebook track
**Active roadmap**: `docs/Coincides-Better-Notebook-Roadmap.md`
**Historical roadmap**: `docs/Coincides-Roadmap.md`

---

## 1. Product Definition

Coincides is a refined information-processing notebook. It helps humans and AI turn selected materials into readable, editable, source-aware notes and reports.

Coincides is not a raw file vault, generic RAG database, AI tutor, whiteboard toy, or Notion/AFFiNE clone. It is the place where selected information is refined into a human-readable surface: structured blocks, free layout, source grounding, relation awareness, and report-like presentation.

The product should support both:

- **notes**: freer, exploratory, and closer to ongoing thinking;
- **reports**: more refined, structured, source-conscious, and shareable.

The difference is mainly rigor, granularity, layout, length, and level of detail. The underlying product should support both forms.

---

## 2. Core Problem

AI can produce and process more information than a human can comfortably read in a chat window. Long conversations, research reports, textbook chapters, web pages, lecture notes, code files, and source documents quickly become too much for linear reading.

Coincides solves the next layer of the problem: transforming selected material into a durable, readable, editable, source-aware workspace that humans can understand and AI can later inspect.

The core product loop is:

```text
selected sources / materials
  -> structured notes or reports
  -> human review and layout
  -> source inspection
  -> relation and concept refinement
  -> future AI-readable workspace
```

---

## 3. Target Users

Primary users:

- students turning lecture notes, textbooks, examples, and practice problems into readable study notes;
- independent learners organizing unfamiliar material without losing source traceability;
- researchers and builders refining many reports, documents, web pages, PDFs, code files, notes, and AI outputs into human-readable outputs;
- people who want deep human-AI collaboration where AI helps process information but humans still review, edit, arrange, and decide what the final note or report means.

The first real user is Henry. Coincides should optimize for serious self-use before broad marketability.

User-facing language should prefer `Project` as the main container. A project may be a course, research package, report workspace, case file, or other focused collection of material. Internal implementation names such as `course_id` may remain as engineering details.

---

## 4. Product Commitments

### Better Notebook Surface

Coincides must feel like a mature notebook/report product, not an engineering panel. A blank note should invite writing. The user should be able to click and write before understanding `NoteBlock`, `CanvasNode`, `SourceScope`, or relation metadata.

The writing surface should support both free blocks and structured blocks. `paragraph` / `text` blocks are freeform. First-version structured defaults should stay narrow: `definition` and `formula` are the primary structured knowledge blocks, while theorem/proof/example/exercise-style variants should come through Template Studio or later domain packages instead of crowding the default menu. Users may create structured blocks directly with slash commands, or write freely first and convert an existing block into a structured block later.

Slash commands must support two behaviors:

```text
Empty block + /definition
  -> create DefinitionBlock

Non-empty paragraph + /definition
  -> convert current block to DefinitionBlock with user confirmation
```

First-version conversion should be conservative and predictable, not clever. Paragraph-to-definition should move the full paragraph into `description` and leave `concept_name` blank. Paragraph-to-formula should move the full paragraph into `latex_input`. The first version should not infer field meaning from colons, dollar signs, regular expressions, or brittle scripts. Smarter conversion belongs to a later AI-assisted workflow. Users should edit field values in the note surface. Adding, removing, or renaming fields belongs to Template Studio.

Navigation, evidence, and semantic relation must remain separate:

```text
Link
  Navigation to another note, block, page, or view.

SourceReference
  Provenance / evidence for why this content exists.

ObjectRelation
  Semantic relation between objects.
```

Clicking a link must not automatically create a source citation or semantic relation. A source citation does not need to be visible as a body-text link. A semantic relation does not need to render as a visible link or line.

### Source Grounding

Traceability is central. Notes and reports created inside Coincides should preserve a clear path back to uploaded documents, source snapshots, source ranges, pages, anchors, or other source objects.

User-authored blocks do not need to start with source references. A user may create an original thought, summary, or side note first, then later attach one source, multiple sources, a page, a range, or a precise anchor.

Source grounding must support both external sources and internal artifacts. A user may reuse an existing note, report, section, or NoteBlock as the source for later work. Copying a whole NoteBlock should preserve its provenance chain by default. Copying a text excerpt from a block may preserve an excerpt snapshot, but the first-version canonical internal reference remains the source NoteBlock rather than a sentence-level range.

Users should be able to attach sources through `/add source`, selected-object controls, right-click menus, inspectors, and batch source operations. The first-version source picker should support external source, page, page range, whole internal note/report, and internal NoteBlock references.

External sources must be version-aware. A later upload can create a new version of a source, but it must not silently overwrite the version already cited by existing notes. Deleting a source document or source version is allowed only as a dangerous action with impact preview and confirmation. Affected notes and blocks should show broken or degraded source indicators instead of failing silently.

The Source Library should default to a source-first view. A single note should have a note-first source inspector, and a single block should have a local chain view showing direct source, root source, and a folded full chain.

Source import must support intent, not only file type. A PDF may be a textbook to summarize, a handwritten note to reconstruct, or an attachment to archive. First-version product language should distinguish:

```text
Unprocessed Raw Source
  Material to understand, select from, condense, cite, and reorganize.

Condensed Raw Source
  Existing notes, lecture notes, handwritten PDFs, agent briefings, user draft reports, or other already-processed material to reconstruct and continue working with.

Archive Raw Source
  Material stored for later use without immediate extraction or note creation.
```

For condensed sources, the default behavior should not be aggressive summarization. The product should preserve original order and layout when useful, reconstruct editable text/formula/image blocks, keep uncertain regions visible, and allow the user to align the imported note with textbooks, reports, webpages, or other sources in the same project.

Coincides should also distinguish evidence, interpretation, and reasoning state. A user's handwritten note, an agent-generated briefing, and a textbook page may all be sources, but they do not carry the same epistemic role. Existing-note import should preserve whether a material is being used as evidence, human interpretation, AI interpretation, draft report, final report, or reasoning trace.

### Content And Layout Separation

`NoteBlock` is content truth. `BlockBox`, `CanvasNode`, or placement state is layout truth. Moving, resizing, aligning, and arranging blocks must not rewrite the underlying content or evidence.

### Formal And Thinking Layers

Coincides should separate the formal document layer from the thinking layer.

- Formal layer: note/report/export/shareable reading surface.
- Thinking layer: sticky notes, scratch work, remarks, derivations, page-outside canvas objects, and temporary reasoning.

Thinking-layer objects may be useful to the user and AI, but they should not silently pollute formal export or document structure.

### Relation Awareness

Relations are semantic structures, not merely visible lines. A visible connector can be useful at close range, but the durable value is an inspectable, queryable, filterable relationship between objects.

Relation design must follow `docs/Coincides-Relation-Product-Design.md`.

### AI Position

AI should collaborate, not take over. The primary purpose is organization: turning selected material into structured, readable, source-aware notes and reports.

Question answering is secondary. It should grow from the organized notebook surface and help users ask targeted questions about specific NoteBlocks, source-backed claims, relations, or sections.

---

## 5. Current Product Direction

The active product direction is the Better Notebook Productization Track:

```text
source-grounded
page-first
canvas-backed
block-based
relation-aware
exportable
AI-readable later
human-writing-friendly now
```

The immediate priority is not full AI note assembly. The priority is a human-usable notebook/report surface:

- product shell and navigation;
- natural blank-page writing;
- freeform NoteBlock boxes and layout mode;
- page/canvas/export boundaries;
- quiet visual language and controls;
- stable data contract;
- source attachment UX;
- relation definition and relation inspection;
- local relation graph after relation definitions mature.

---

## 6. Non-Goals For The Current Track

The Better Notebook track should not begin by building:

- a generic file RAG database;
- full AI tutor behavior;
- full Source Reconstruction production pipeline;
- Microsoft GraphRAG product adoption;
- Neo4j migration;
- full AFFiNE fork;
- full Relation Studio;
- marketplace or executable plugin system;
- external agent API;
- iPad handwriting workflow;
- full PDF visual rendering.

These may become future phases, but they should not lead the first Better Notebook productization work.

---

## 7. Success Criteria

Coincides succeeds in the Better Notebook track when:

- a user can open a project and reach the main note surface without navigating through engineering panels;
- a blank note feels writable immediately;
- blocks can be moved, resized, aligned, and arranged without losing content;
- formal content and scratch content are visually and structurally distinct;
- source references can be attached, inspected, and revised;
- relation state is understandable and does not turn the document into visual noise;
- metadata appears through badges, hover, inspectors, local graph, export preview, and debug mode instead of overwhelming reading mode;
- future AI work can read the organized structure instead of scraping visual layout.
