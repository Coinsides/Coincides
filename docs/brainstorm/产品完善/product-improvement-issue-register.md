# Product Improvement Issue Register

> Purpose: Record product-level problems, workflow questions, UX gaps, and AI collaboration ideas that are not yet tied to a specific version plan.
>
> This file is a living brainstorm register. Items here may later become roadmap revisions, release plans, research tasks, or continuity items.

## 1. Current Product Problem Map

### PI-001: Agent Chat Cannot Yet Generate Full Notes Like A Normal AI Product

- **Status**: Open
- **Problem**: Coincides has organized-note proposal machinery, but the conversational Agent cannot yet take a user request and orchestrate the full note-generation workflow.
- **Current Gap**:
  - Agent tools are not yet aligned with v2.x capabilities such as `organized_note`, `material_map`, `source_scope`, `source_board`, `canvas_layout`, `composition_template`, template/package/domain proposal flows, or canvas-aware note assembly.
  - The user cannot simply say: "Use these files and make me a note/project."
- **Desired Direction**:
  - Agent chat should become the primary natural entry point for creating a Project, ingesting files, generating source material, creating proposals, and placing resulting blocks onto the selected canvas.
  - Agent actions should remain proposal-first for meaningful mutations.
- **Likely Roadmap Impact**:
  - Needs a dedicated Agent Workflow / Productization track after the current template/package foundation work.

### PI-002: Chat File Ingestion Is Missing

- **Status**: Open
- **Problem**: Users should be able to drop files directly into the Agent conversation and ask Coincides to organize them into a project.
- **Current Gap**:
  - File upload exists in the document manager, but it is attached to an existing course/project workflow.
  - Agent chat currently does not act as a general file-ingest and project-bootstrap surface.
- **Desired Direction**:
  - Chat upload should support multiple files.
  - The Agent should be able to create or select a Project, upload files, parse them, create source material, generate source scopes/boards if needed, and create note proposals.
  - The first version can be conservative: files create draft source material and proposals; user reviews before apply.

### PI-003: Course Should Become Project

- **Status**: Open
- **Problem**: `Course` is too narrow. It represents a learning use case, but Coincides is growing into a broader information-processing workspace.
- **Desired Direction**:
  - Product language should move toward `Project`.
  - `Course` should become one project type, not the root concept for every workflow.
- **Possible Project Types**:
  - `course`
  - `research`
  - `briefing`
  - `game_research`
  - `writing`
  - `general`
- **Implementation Caution**:
  - A hard database rename from `course` to `project` should be delayed until the blast radius is understood.
  - A safer path is product-language rename first, then additive `project_type` / folder metadata, then later structural migration if needed.

### PI-004: Projects Need Folders / Collections

- **Status**: Open
- **Problem**: A flat course/project list will not scale once Coincides supports learning, research, games, reports, personal knowledge, and AI output boards.
- **Desired Direction**:
  - Add project folders or collections.
  - Folders can represent user-facing categories such as Courses, Research, Game Research, Reports, and Personal Knowledge.
  - Project type and folder should be separate concepts: a project can be of type `course` while living in a folder named "Math".

### PI-005: File Type Coverage Is Still Narrow

- **Status**: Open
- **Current Supported Direction**:
  - PDF
  - DOCX
  - XLSX
  - JPG / JPEG / PNG / WebP
  - TXT
  - Markdown
- **Major Missing Types**:
  - PPT / PPTX
  - CSV as a first-class source
  - HTML / webpage snapshot
  - EPUB
  - audio / video
  - ZIP / project bundles
  - code files and repositories
  - LaTeX `.tex`
  - JSON / structured data
- **Desired Direction**:
  - Expand ingestion in stages instead of promising "all files" at once.
  - Keep source snapshot / source anchor behavior explicit for each file family.

### PI-006: Product UX Needs A Full Restructure

- **Status**: Open
- **Problem**: Many functions exist, but the current interface exposes them like construction scaffolding instead of a coherent product.
- **Examples**:
  - Course detail contains too many panels.
  - Source Snapshot, Source Scope, Source Board, Canvas, Proposal, Template, and Package workflows are not yet organized by user mental model.
  - Canvas still feels embedded in a panel instead of acting like the main document surface.
- **Desired Direction**:
  - Notion/AFFiNE-like efficiency should be studied as product reference, not copied blindly.
  - Coincides needs a cleaner shell:
    - Project workspace
    - Source workspace
    - Canvas/Note workspace
    - Agent workspace
    - Template/Package Studio as an advanced tool area

### PI-007: Canvas Needs Locked Page Mode And Open Canvas Mode

- **Status**: Open
- **Problem**: A single infinite canvas mode is not enough.
- **Desired Modes**:
  - **Locked Page Canvas**:
    - A4 or other fixed page size.
    - Users cannot freely drag beyond the document boundary.
    - Best for readable notes, export, sharing, and AI-generated document layouts.
  - **Open Canvas**:
    - Infinite or expandable canvas.
    - Best for user reasoning, scratch work, relation exploration, and extended annotation.
- **Important Boundary**:
  - AI-generated notes should respect the user's selected canvas mode.
  - If the user selected A4 locked mode, AI should compose within that selected page/canvas boundary instead of scattering content across an infinite space.

### PI-008: User Workflow And AI Workflow Are Not Yet Settled

- **Status**: Open
- **Problem**: Coincides needs one or more clear work paths that match user expectations.
- **Candidate Primary Workflow**:
  1. User talks to Agent.
  2. User drops files.
  3. Agent creates or selects a Project.
  4. Coincides parses sources.
  5. Agent creates reviewed proposals.
  6. User applies selected proposals.
  7. Notes appear on the selected canvas.
  8. User edits, adds comments, expands with open canvas if needed.
- **Key Principle**:
  - AI should orchestrate structured workflows, not become an opaque shortcut that mutates everything directly.

### PI-009: External Agent Integration Is Undefined

- **Status**: Open
- **Problem**: Future external "manager" agents may need to use Coincides as an information workspace, but their authority and API boundaries are not defined.
- **Desired Direction**:
  - External agents should call guarded Coincides APIs.
  - They should create proposals, previews, import drafts, or operation requests.
  - They should not directly bypass proposal-first safety for high-impact mutations.
- **Future Question**:
  - Should Coincides expose an Agent Workspace API, MCP server, local command surface, or all three?

## 2. Canvas And Note Workflow Ideas

### PI-010: AI Note Generation Should Be Bound To The Current Selected Canvas

- **Status**: Open
- **Idea**:
  - When AI helps make a note, it should generate within the currently selected canvas or page mode.
  - This keeps AI layout predictable and prevents AI from abusing the infinite canvas.
- **Reason**:
  - Infinite canvas is useful for user freedom, but AI-generated notes need constraints to stay readable.
- **Possible Rule**:
  - AI can generate the first draft inside locked A4/page mode.
  - User can later unlock or extend the canvas for personal scratch work, relation exploration, or additional notes.

### PI-011: Infinite Canvas As User Reasoning Space

- **Status**: Open
- **Idea**:
  - Infinite canvas is not only for browsing. It can become the user's scratch space while reading or learning.
- **Use Cases**:
  - User sees an example and wants to solve it beside the note.
  - User sees a proof and wants to re-derive it manually.
  - User forgets how an equation was derived and wants to work it out without leaving the page.
  - Future iPad use: handwriting, stylus scratch work, informal derivations, margin thinking.
- **Product Meaning**:
  - Locked page mode is the formal document.
  - Open canvas mode is the user's thinking space around the document.

### PI-012: User Notes / Remarks As Sticky Notes

- **Status**: Open
- **Idea**:
  - User remarks can be represented visually as sticky notes attached around the main canvas/page.
- **Possible Visual Forms**:
  - small sticky note
  - long sticky note
  - auto-height sticky note based on content
  - pinned sticky note with a pushpin-like visual marker
  - color/style variants in future style packs
- **Important Boundary**:
  - Sticky notes are a visual/user-experience form, not necessarily a new source of truth.
  - Later design must decide whether they are:
    - regular NoteBlocks with a sticky-note template;
    - CanvasShapes with optional text;
    - or a separate `UserAnnotation` / `CanvasRemark` type.
- **Likely Future Fit**:
  - This may connect to source annotation, canvas annotation, and user scratch work.

### PI-013: Remarks Must Not Pollute AI-Generated Document Structure

- **Status**: Open
- **Problem**:
  - If users freely write remarks around a formal note, AI must know which objects are part of the official note and which are personal scratch/remarks.
- **Possible Distinction**:
  - `document_content`
  - `user_remark`
  - `scratch_work`
  - `source_annotation`
  - `ai_suggested_note`
- **Why It Matters**:
  - Export, AI reading, relation building, and future graph-native migration need to know which layer an object belongs to.

### PI-014: Canvas-Side Scratch Work Needs Its Own Object/Lane

- **Status**: Open
- **Problem**:
  - Users may write proofs, derivations, attempts, reminders, or informal notes outside the generated page area on an open canvas.
  - These objects should not automatically become part of the formal exported note.
- **Current Implementation Reality**:
  - v2.4.2 supports creating real semantic NoteBlocks from the canvas.
  - v2.4.4 supports CanvasEdges / ObjectRelations.
  - There is not yet a mature `CanvasShape`, `CanvasRemark`, `ScratchBlock`, or layer-aware canvas annotation object.
- **Desired Direction**:
  - Separate formal note content from user scratch work.
  - Scratch work may still be saved, searchable, and selectable, but it should be marked as informal or outside-document.
  - Future canvas modes may use a `content_role` or `canvas_layer` distinction such as:
    - `document_content`
    - `user_remark`
    - `scratch_work`
    - `source_annotation`
    - `layout_decoration`
- **Open Question**:
  - Should scratch work be implemented as a NoteBlock template variant, a Canvas-only object, or a separate annotation/remark object?

### PI-015: NoteBlocks Do Not Always Need Source References

- **Status**: Open
- **Problem**:
  - Not every block should be required to point back to an uploaded source.
  - Users may add original thoughts, personal summaries, synthesis across multiple sources, comments, or explanations.
- **Current Implementation Reality**:
  - Manual NoteBlock creation accepts optional `source_references`.
  - Canvas-created NoteBlocks can be source-free.
  - Organized AI proposals usually try to attach source references when generated from source material, but source references are not a universal database requirement.
- **Desired Rule**:
  - AI-generated source-grounded notes should strongly prefer source-backed blocks.
  - User-authored blocks may be source-free.
  - Synthesized blocks should be allowed, but should carry provenance metadata if they combine multiple sources or user input.
- **Possible Provenance Labels**:
  - `source_grounded`
  - `user_authored`
  - `user_synthesis`
  - `ai_synthesis`
  - `scratch_work`
  - `unverified`
- **Why It Matters**:
  - Source-free user content is normal and should not be treated as invalid.
  - AI-generated unsupported claims should remain visible as lower-confidence or unverified, not silently treated as grounded evidence.

### PI-016: Existing NoteBlocks Need A Natural "Bring To Canvas" Flow

- **Status**: Open
- **Problem**:
  - Users should be able to take an existing NoteBlock and place it onto a canvas naturally.
- **Current Implementation Reality**:
  - Backend can create a `CanvasNode` for an existing `note_block`.
  - Current UI mainly supports creating a new block directly from canvas and seeding nodes from boards/scopes.
  - There is not yet a polished "drag existing block from library/note into canvas" interaction.
- **Desired Direction**:
  - Existing NoteBlocks should be draggable or addable from a NoteBlock library/sidebar/search result.
  - Re-adding an archived/hidden canvas node should restore it instead of duplicating it.
  - The UI should make the difference between "same block, another projection" and "new copied block" explicit.

### PI-017: NoteBlock Visual Rendering On Canvas Is Too Raw

- **Status**: Open
- **Problem**:
  - Current canvas blocks look like large engineering cards with type labels and raw text.
  - This is useful for debugging but poor for real note reading.
- **Desired Direction**:
  - By default, a block should render like clean note content, not like a database row.
  - The border and metadata should appear only when selected, hovered, or when an inspector/debug mode is open.
  - Type, template, source, and relation metadata should be available through an inspector or small expandable affordance.
- **Candidate Interaction**:
  - Normal view: clean text/formula/content rendering.
  - Hover: subtle border / handle.
  - Select: visible frame, resize handles, action buttons.
  - Inspector: template type, source references, attached note/project, relation layer, provenance, history.
- **Possible Metadata Reveal**:
  - Show block type outside the border only when selected.
  - Provide an expand button to show which note/backing note/project/source references the block belongs to.
  - Keep "debug labels everywhere" as a developer mode, not normal UX.

### PI-018: Formal Note Layer And Canvas Layer Need A Clean Boundary

- **Status**: Open
- **Problem**:
  - A canvas can contain formal note content, user remarks, scratch derivations, source annotations, visual decorations, and relation edges.
  - Treating all of these as the same kind of NoteBlock will confuse export, AI reading, and user mental model.
- **Desired Direction**:
  - Keep NoteBlock as semantic content.
  - Add or define separate canvas-side roles for visual/scratch/annotation objects.
  - Every canvas object should be clear about whether it participates in:
    - formal note export;
    - AI reading;
    - search;
    - graph relation inference;
    - package export;
    - source provenance.

## 3. Open Questions For Future Brainstorming

1. Should `Project` become a product-label-only change first, or should v2.x add a real project model before v3.x?
2. What is the minimum useful Agent toolchain for "drop files -> make project -> make note"?
3. How strict should locked A4 mode be?
4. Should sticky notes be template-backed NoteBlocks or a separate annotation object?
5. Which file types should be prioritized after PDF/DOCX/XLSX/images/text/Markdown?
6. What is the first external-agent interface: local API, MCP, command contract, or package/import surface?
7. How should user scratch work be exported, if at all?
8. How should AI distinguish official note content from user remarks and scratch derivations?
9. How should source-free user-authored blocks be shown differently from source-grounded AI blocks?
10. Should the normal canvas hide block type/source labels until selection?
11. What is the right object model for sticky notes and scratch proofs?

## 4. Initial Roadmap Pressure

These issues suggest a future productization track after the v2.5 template/package foundation:

```text
Product Issue Register / UX Audit
Project Naming + Project Type + Project Folders
Agent Note Assembly Toolchain
Chat File Ingest + Project Bootstrap
Project Workspace UX Reconstruction
Locked Page Canvas + Open Canvas Mode
Sticky Notes / User Remarks / Scratch Layer
Existing NoteBlock -> Canvas Placement Flow
Canvas Block Visual Rendering Pass
External Agent Interface Research
Real AI + Real Materials End-to-End Evaluation
```

The exact version numbers are intentionally not locked here.
