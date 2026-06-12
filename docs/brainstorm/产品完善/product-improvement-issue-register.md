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

### PI-019: Empty Note Should Behave Like A Blank Editable Document

- **Status**: Open
- **Problem**:
  - A user may create a completely blank note and expect it to behave like a normal writing surface.
  - The current engineering UI uses an explicit block creation panel instead of a natural click-to-type document surface.
- **User Expectation**:
  - Opening an empty note should feel closer to a blank Word/Notion-style document.
  - Clicking or double-clicking the blank area should place a text cursor near the left writing boundary.
  - Typing should create or activate a default paragraph/text NoteBlock without requiring the user to first choose a block type from an engineering-style form.
- **Important Product Rule**:
  - This should still create a real NoteBlock under the hood.
  - It should not become raw canvas text disconnected from Coincides' NoteBlock/template/provenance system.
- **Source Rule**:
  - The note and block may be entirely user-authored and source-free.
  - The note still belongs to a Project/Course container, but it does not need to be attached to any uploaded document, source material, source snapshot, or source reference.
- **Suggested Behavior**:
  - Empty note shows a quiet placeholder/caret target.
  - First text input creates a `text.paragraph` / paragraph-like runtime template block.
  - Empty placeholder blocks should not necessarily be persisted until the user types real content.
  - Enter creates the next block; slash/template shortcuts can later choose Definition, Formula, Example, Exercise, Sticky Note, etc.
  - Autosave should preserve the user's writing without making the UI feel like a database form.
- **Why It Matters**:
  - Coincides must support both source-grounded AI note generation and ordinary human writing.
  - A user-authored blank note is a first-class workflow, not an exception.
  - This is one of the clearest differences between an engineering prototype and a usable writing product.

### PI-020: Users Need A Manual Way To Link Existing Blocks To Sources

- **Status**: Open
- **Problem**:
  - Users may create a source-free text block first, then later realize it was inspired by or supported by an existing source.
  - Users need a natural way to connect an already-created NoteBlock to a source/resource after the fact.
- **Current Implementation Reality**:
  - NoteBlock creation can insert `note_block_sources` if `source_references` are provided at create time.
  - Organized AI proposals can create source-backed blocks.
  - SourceAnchor generation can create jump-back anchors from existing `note_block_sources`.
  - There is not yet a polished UI or dedicated API for "attach this existing NoteBlock to this selected source range" after the block already exists.
- **Desired User Flow**:
  - User selects a block.
  - User chooses "Link source" / "Attach reference" / "Cite source".
  - User selects one or many existing SourceScopes, SourceAnchors, SourceSnapshot pages/ranges, MaterialSegments, SourceBoard nodes, or source materials.
  - Coincides creates a source reference record and optionally generates/refreshes a SourceAnchor.
  - The block then shows a subtle source indicator and can jump back to the source.
- **Granularity Requirements**:
  - Link to one source.
  - Link to multiple sources in one action.
  - Link to a whole source material.
  - Link to a page.
  - Link to a page range.
  - Link to a source scope.
  - Link to a material segment.
  - Future: link to paragraph / text-span / bbox-level range when source annotation and richer snapshot tools mature.
- **Batch Use Case**:
  - A user reads two or three uploaded documents, writes an original summary or reflection, and then attaches that user-authored block to all relevant sources at once.
  - This is not a contradiction: the block is still user-authored, but its inspiration/provenance can point to multiple references.
- **Possible Interaction Models**:
  - Drag a SourceScope onto a NoteBlock.
  - Select block -> click "Attach source" -> choose from source side panel.
  - Multi-select source scopes/pages -> click "Attach to selected block".
  - Select source text/range -> click "Attach to selected block".
  - Ask Agent: "Link this paragraph to the theorem source from page 12."
- **Important Boundary**:
  - Linking source is not the same as saying the block is fully proven by that source.
  - Link type should distinguish:
    - `cites`
    - `inspired_by`
    - `supports`
    - `derived_from`
    - `contradicts`
    - `background`
    - `user_claim_needs_source`
- **Why It Matters**:
  - User-authored notes should remain first-class, but Coincides should let users add provenance later.
  - This bridges Notion-like free writing with Coincides' source-grounded workspace identity.
  - It is also a prerequisite for stronger AI review: AI can later identify unsupported blocks and suggest sources.
- **Current Feasibility Note**:
  - Page/page-range/source-scope-level linking is aligned with the current v2.3 Source Snapshot / SourceScope / SourceAnchor foundation.
  - Paragraph/span/bbox-level linking is not ready yet and should wait for richer source annotation or visual snapshot tooling.

### PI-021: Canvas-First Must Still Feel Like A Notion-Class Writing Surface

- **Status**: Open
- **Problem**:
  - Coincides has chosen a canvas-first direction, but normal writing should not feel like manually placing database cards on a board.
  - Users expect a blank note to support Notion-like typing, block creation, selection, and lightweight structure.
- **Product Tension**:
  - Notion-like products usually use a linear document editor first.
  - Coincides wants the document surface to be a canvas projection.
  - If the canvas feels too freeform too early, simple writing becomes clumsy.
- **Desired Direction**:
  - The default canvas mode should behave like a clean writing page when locked to A4 / document mode.
  - Blocks should auto-flow vertically by default, like a normal document.
  - Users should be able to click and type without thinking about coordinates.
  - The same canvas can later unlock into open canvas mode for reasoning, annotations, and spatial organization.
- **Possible Model**:
  - **Page-locked canvas mode**:
    - Notion-like block flow.
    - Auto-positioned blocks.
    - Click-to-type.
    - A4/page export-friendly.
  - **Open canvas mode**:
    - Free movement.
    - Scratch work.
    - Sticky notes.
    - Relation exploration.
    - Source boards and evidence maps.
- **Important Boundary**:
  - Canvas-first does not mean every user must manually drag every block.
  - Canvas-first means the visual surface is the primary projection, while Coincides still owns NoteBlocks, templates, source references, and relation data.
- **Likely Future Need**:
  - A layout mode / view mode system:
    - `document_flow`
    - `locked_page`
    - `open_canvas`
    - `presentation`
    - `debug`
  - This may be more important than copying any single existing editor.

### PI-022: Canvas Document Editing Needs Collision-Aware Text Insertion

- **Status**: Open
- **Problem**:
  - In a canvas-first document surface, users may have images, sticky notes, source cards, frames, or other blocks near the place where they want to write.
  - If double-clicking the canvas always creates text at the global left edge, the new text may appear behind or on top of an existing object.
  - This creates an awkward recovery workflow: move the object away, find the tiny text block, delete or move it, then restore the original object.
- **Desired Interaction**:
  - Double-clicking a writable page/canvas area starts document editing.
  - The insertion point should be near the user's clicked row, not blindly at the top-left of the page.
  - The system should find the nearest valid writing lane on that row.
  - If an existing object blocks the left side, new text should start to the right of that object.
  - If the row has no reasonable free lane, the system can create text below the obstructing object or show a subtle insertion preview before committing.
- **Mental Model**:
  - The canvas behaves like a document when the user wants to write.
  - It behaves like a layout surface when objects occupy space.
  - Text insertion should respect nearby objects instead of ignoring them.
- **First Version Rule**:
  - Use simple bounding-box collision detection.
  - Find objects intersecting the clicked horizontal band.
  - Choose the nearest free x-range with enough minimum text width.
  - Create a default text/paragraph NoteBlock at that location only after the user types.
- **Future Version Rule**:
  - Support smarter text flow around images, sticky notes, and side cards.
  - Support optional manual text wrapping behavior around selected objects.
  - Support insertion preview so users can see where the text block will appear before typing.
- **Why It Matters**:
  - This is the difference between "canvas as a toy board" and "canvas as a usable document surface."
  - Users should not have to manage invisible or tiny blocks created in bad positions.

### PI-023: Block-Level Ruler / Indentation Controls May Be Useful But Should Stay Local

- **Status**: Open
- **Problem**:
  - Traditional Word-like editors expose global rulers for first-line indent, right indent, and margins.
  - Coincides is block-based, so global document rulers may conflict with independently resizable blocks.
- **Current Product Thought**:
  - A full global Word-style ruler may be too heavy for the first productization pass.
  - But selected text blocks may still need local paragraph controls:
    - first-line indent;
    - left padding;
    - right padding;
    - block width;
    - alignment;
    - line spacing.
- **Desired Direction**:
  - Treat indentation as block-level style/template/render metadata first.
  - Show ruler-like controls only when a text block is selected or when the user opens a formatting inspector.
  - Bulk operations can later apply the same indentation/style preset to multiple selected blocks.
- **Why It Matters**:
  - Users coming from Word expect some margin/indent control.
  - But Coincides should not accidentally become a legacy word processor.
  - Block-level local controls better match the NoteBlock + CanvasNode architecture.

### PI-024: Mature Canvas / Document-Canvas Tools Need Focused Product Research

- **Status**: Open
- **Problem**:
  - Many canvas/document interaction problems have likely already been explored by mature products.
  - Coincides should not invent every insertion, collision, formatting, selection, and mixed document/canvas interaction from scratch.
- **Research Need**:
  - Study mature tools that combine writing, blocks, canvas, sticky notes, images, whiteboard objects, or page/document modes.
  - Focus on interaction behavior, not direct code copying.
- **Candidate Product / Tool Families**:
  - AFFiNE / BlockSuite
  - tldraw
  - Excalidraw
  - Miro / FigJam-like whiteboards
  - Notion-style block editors
  - Figma/FigJam text and object insertion behavior
  - Obsidian Canvas / JSON Canvas ecosystem
  - Apple Freeform / Microsoft Whiteboard / OneNote-style canvas-note hybrids
- **Questions To Research**:
  - How do they decide where new text starts after click/double-click?
  - How do they avoid text colliding with existing sticky notes, images, shapes, or cards?
  - Do they use text wrapping around objects, row/lane insertion, frames, or free objects?
  - How do they expose local formatting, indentation, alignment, and width controls?
  - How do they distinguish document content from scratch notes or free canvas objects?
  - How do they keep objects selectable while allowing natural text editing?
  - Which interactions are worth borrowing, and which would conflict with Coincides' data model?
- **Coincides Constraint**:
  - Coincides is not simply "typing into a canvas engine."
  - The user may click on a canvas, but the system should create or edit a real NoteBlock, CanvasNode, source reference, annotation, or relation object.
  - The canvas engine can assist interaction, but Coincides-owned data remains canonical.
- **Why It Matters**:
  - Henry's current ideas are valuable, but they cannot cover every real user edge case.
  - Research should expose the hidden interaction problems mature products already solved.
  - Borrowing product patterns can reduce avoidable UX mistakes while preserving Coincides' unique source-grounded architecture.

### PI-025: Canvas Should Likely Stay A Spatial Layer, Not A Text Editor Owner

- **Status**: Open
- **Problem**:
  - Coincides needs a document-canvas experience, but the canvas engine should probably not own rich text editing, document semantics, source references, template state, or relation truth.
- **Current Product Hypothesis**:
  - Canvas provides spatial interaction:
    - positioning;
    - selection;
    - viewport;
    - pan/zoom;
    - object handles;
    - visual connectors;
    - layout surface.
  - Coincides owns editing semantics:
    - NoteBlock content;
    - TemplateDefinition;
    - source references;
    - ObjectRelation;
    - provenance;
    - package/export state.
- **Open Research Question**:
  - Should the canvas have zero native text editing, or should it host an embedded editor widget for selected text blocks?
  - If an embedded editor is used, how do we prevent the canvas/editor library from becoming the source of truth?
- **Likely Rule**:
  - Canvas can host editing UI, but it should not own the canonical content model.
  - Text editing should persist through Coincides NoteBlock APIs/runtime, not the canvas engine's internal scene model.

### PI-026: Rich Text / Inline Formatting Needs A Productization Plan

- **Status**: Open
- **Problem**:
  - Users will expect standard writing controls:
    - font family;
    - font size;
    - bold;
    - italic;
    - underline;
    - strikethrough;
    - color;
    - highlight;
    - alignment;
    - lists;
    - inline code;
    - links;
    - maybe math/LaTeX spans.
- **Current Gap**:
  - v2.x NoteBlocks are template-aware, but the normal writing/rich-text experience is still primitive.
  - Canvas blocks currently render more like engineering cards than polished note content.
- **Desired Direction**:
  - Use existing product/editor references rather than inventing every formatting interaction.
  - Decide whether formatting is stored as:
    - structured `content_json`;
    - markdown-like text;
    - rich-text document JSON;
    - or template-specific field data.
- **Important Boundary**:
  - Formatting belongs to the NoteBlock/content renderer, not to canvas geometry.
  - Canvas may show a floating toolbar, but the actual content mutation should update the NoteBlock.

### PI-027: Canvas Edge Visual Routing And Styling Need A Dedicated Pass

- **Status**: Open
- **Problem**:
  - Current edge interaction uses four ports per rectangular block: top, right, bottom, left.
  - Dragging from one port to another can create a visual edge and later bind an ObjectRelation.
  - The data model has the right early separation, but visual behavior is still basic.
- **Current UX Gap**:
  - Edges remain connected when blocks move, but the line may look visually awkward.
  - Edge routing, bends, curves, obstacle avoidance, arrowhead style, labels, and relation semantics are not mature.
  - The visual style may not match the intended meaning of the relation.
- **Desired Future Capabilities**:
  - Straight, elbow, curved, and orthogonal connectors.
  - Automatic rerouting after block movement.
  - Optional manual bend points.
  - Better arrowheads and line styles.
  - Edge labels that do not overlap blocks.
  - Relation type styles:
    - `read_before`;
    - `supports`;
    - `contradicts`;
    - `derives_to`;
    - etc.
  - Layer-based visibility and style presets.
- **Research Need**:
  - Study how tldraw, Excalidraw, diagrams.net, Miro/FigJam, React Flow, and graph editors handle connectors.
  - Decide which behavior belongs in v2.x product polish and which should wait for stronger graph/native relation planning.
- **Important Boundary**:
  - CanvasEdge visual style is not the same as ObjectRelation truth.
  - A beautiful arrow can still be visual-only.
  - A meaningful ObjectRelation may be hidden or represented differently depending on the active RelationLayer/ViewPreset.

### PI-028: Large Canvas Rendering And Loading Performance Will Become A Core Constraint

- **Status**: Open
- **Problem**:
  - Small notes with a few blocks are easy to render.
  - Real AI-generated notes may become dozens of pages long with many NoteBlocks, CanvasNodes, CanvasEdges, frames, source indicators, relation labels, and overlays.
  - A 70-80 page note with dense blocks and many cross-page relations could become slow or visually overwhelming.
- **Risk Scenario**:
  - User asks AI to generate a long note.
  - The result spans many pages.
  - Each page contains many blocks.
  - Blocks are connected by many relations.
  - Some relations cross from page 1 to page 80.
  - Rendering every block and edge at once makes the canvas laggy.
- **Desired Direction**:
  - Treat performance as a product design constraint, not only a late optimization.
  - Use view modes and layer filters to avoid rendering everything all the time.
- **Candidate Techniques**:
  - Canvas/page virtualization.
  - Only render visible or near-visible pages/objects.
  - Lazy-load block details and source previews.
  - Collapse distant cross-page relations into jump indicators.
  - Render relation edges only for selected objects, active layer, nearby viewport, or explicit relation mode.
  - Use overview/minimap for long documents.
  - Use page/chapter frames as loading boundaries.
  - Cache layout calculations.
  - Keep source preview panels unloaded until opened.
  - Store and restore viewport state without rebuilding every visual object immediately.
- **Relation-Specific Performance Ideas**:
  - Hide long-distance relation lines by default.
  - Show "related elsewhere" badges instead of drawing every edge.
  - On selecting a block, reveal only its immediate relation neighborhood.
  - Provide a relation graph/extracted view for dense relation reading instead of drawing all edges on the formal document canvas.
- **Why It Matters**:
  - If Coincides succeeds at AI-generated notes, large documents are not edge cases.
  - Performance and visual clarity must be designed together.
  - A source-grounded information workspace can fail simply by trying to show too much truth at once.

### PI-029: Relation Semantics Need A Layered Model Beyond Visual Edges

- **Status**: Open
- **Problem**:
  - Different fields can create many domain-specific relation types.
  - A naive list of relation types may grow without limit and become impossible for users or AI to manage.
  - The same pair of blocks may have multiple relationships at once.
- **Example**:
  - `A = sin/cos`
  - `B = tangent`
  - `C = combined example`
  - A and B may have:
    - `read_before`: A before B;
    - `derives_to`: A derives B;
    - `conceptually_related`: A and B are bidirectionally related.
  - C may require both A and B together:
    - `A + B -> C`;
    - A alone does not establish the relation;
    - B alone does not establish the relation.
- **Core Design Question**:
  - Should one visual edge carry multiple semantic relations, or should multiple ObjectRelations be stored separately and visually bundled?
- **Likely Direction**:
  - Keep semantic relations as separate records.
  - Let a visual CanvasEdge represent one or more semantic relations through a bundle/summary when needed.
  - Do not force the UI to draw three overlapping lines between the same two blocks.
- **Low-Level Relation Dimensions**:
  - `relation_existence`:
    - unrelated;
    - related;
  - `condition_kind`:
    - unconditional;
    - conditional;
  - `composition_kind`:
    - simple_pair;
    - group_relation;
    - all_of;
    - any_of;
    - sequence;
    - threshold;
  - `directionality`:
    - directed;
    - bidirectional;
    - undirected/associative;
  - `semantic_family`:
    - learning_order;
    - derivation;
    - evidence;
    - example_exercise;
    - contrast;
    - source_provenance;
    - user_visual;
  - `domain_relation_type`:
    - domain-specific label such as `uses_formula`, `example_of`, `contradicts`, `inspired_by`;
  - `visibility`:
    - visible;
    - hidden;
    - layer_only;
    - selected_only;
  - `confidence/provenance`:
    - user-created;
    - AI-suggested;
    - source-derived;
    - inferred;
    - verified.
- **Preferred Bottom-Up Relation Stack**:
  - **Important captured decision**: this five-step stack is not a casual note. It is the current best candidate for how Coincides should define whether two or more blocks truly have a relation before applying domain-specific labels.
  1. Are these objects related at all?
  2. Is the relation unconditional or conditional?
  3. Is it a simple pair relation or a composition/group relation?
  4. What is its directionality?
  5. What upper-level semantic meaning does it carry?
- **Plain-Language Version**:
  - Do these objects have a relation?
  - Does the relation need conditions?
  - Does the relation require multiple objects to be true together?
  - Does the relation have direction?
  - What is this relation called in the learning/domain context?
- **Why This Stack Is Safer**:
  - It prevents domain relation types from becoming the foundation.
  - It lets `read_before`, `derives_to`, `example_of`, and other semantic labels sit above a stable lower model.
  - It makes future graph-native migration easier because low-level relation mechanics are not mixed with domain vocabulary.
- **Conditional Relation Need**:
  - Some relations are not simple A -> B.
  - They may require a set of inputs:
    - A and B together imply C;
    - any of A/B/C can support D;
    - A then B then C should be read as a sequence.
  - v2.x can store this as metadata or a relation group.
  - v3.x graph-native planning should decide whether `RelationGroup`, `PrerequisiteSet`, or `Hyperedge` becomes a real graph node.
- **Visual Strategy**:
  - The canvas should avoid drawing overlapping duplicate lines.
  - If multiple relations exist between the same objects, show:
    - a bundled edge;
    - a small relation count badge;
    - a hover/inspector list;
    - layer-based filtering;
    - or separate relation view.
- **Why It Matters**:
  - Relation semantics are the bridge from canvas notes to graph-native intelligence.
  - AI study guidance, prerequisite paths, source reasoning, and concept maps all depend on clear relation semantics.
  - This must be researched before relation types become uncontrolled domain-specific clutter.

### PI-030: AI Needs A Queryable Subgraph View, Not Just Canvas Lines

- **Status**: Open
- **Problem**:
  - As notes grow, AI should not read the whole document or all canvas edges.
  - AI needs a filtered, structured subgraph around the user's question.
- **Example Query**:
  - "Organize a note containing everything related to sine/sin: definitions, theorems, examples, practice questions, and graphs."
- **Desired AI Retrieval Flow**:
  1. Resolve the user's query into concepts/topics and aliases.
  2. Find matching NoteBlocks, SourceScopes, SourceMaterials, Examples, Exercises, Graph blocks, and related concepts.
  3. Traverse only relevant relation families and layers.
  4. Collect source references and provenance.
  5. Return a compact graph context to the AI.
- **AI-Readable Context Should Look Like**:
  - `nodes`: relevant NoteBlocks / Concepts / SourceScopes / Evidence / Examples / Exercises.
  - `relations`: typed relationships such as `uses_formula`, `example_of`, `prerequisite_for`, `derives_to`, `supports`.
  - `relation_groups`: conditional/group dependencies such as `A + B -> C`.
  - `summaries`: short content summaries, not full raw text unless needed.
  - `source_refs`: jump-back evidence and citations.
  - `warnings`: weak links, missing source, unresolved concept, conflicting relation.
- **Important Insight**:
  - Graph search becomes easier only if relation semantics remain disciplined.
  - Random unlimited relation types can make retrieval worse, not better.
  - The system needs stable low-level relation mechanics and controlled semantic families.
- **Likely Future Need**:
  - Concept/Topic nodes or ConceptMention-like records.
  - Alias handling, e.g. `sine`, `sin`, `trigonometric sine`.
  - Learning-role filters, e.g. definition/theorem/example/exercise/graph.
  - Relation-layer filters, e.g. learning path, derivation, evidence, user visual, AI hidden.
  - Depth limits and relevance scoring so AI gets a useful subgraph instead of the whole graph.
- **Why It Matters**:
  - This is where Coincides can outperform normal notes: AI can retrieve a structured local knowledge graph instead of guessing from long text.
  - It also supports future study guidance, "what should I learn first", and "make a focused note about this topic" workflows.

### PI-031: Local Knowledge Graph Views Should Be Deterministic Before They Are AI-Assisted

- **Status**: Open
- **Problem**:
  - Once ObjectRelations are stored as their own records, many local graph views can be generated without AI.
  - AI should not be required for basic graph traversal, filtering, or "show related blocks" behavior.
- **Core Idea**:
  - User selects Block A.
  - Coincides opens a second-level view or local graph panel.
  - The system queries relation records and renders the local graph around A.
- **Deterministic Query Examples**:
  - Show all blocks directly related to A.
  - Show only `read_before` upstream of A.
  - Show only `read_before` downstream from A.
  - Show all prerequisites for A.
  - Show examples that depend on A.
  - Show exercises that require A.
  - Show source-backed support or contradictions for A.
  - Show relation depth 1 / 2 / 3.
  - Show only selected RelationLayer.
- **AI Role Boundary**:
  - Deterministic system should handle:
    - graph traversal;
    - relation filtering;
    - direction filtering;
    - depth limits;
    - layer visibility;
    - rendering a local knowledge graph.
  - AI should handle:
    - explaining the graph;
    - summarizing why relations matter;
    - suggesting missing relations;
    - generating study paths;
    - resolving ambiguous user language into graph filters;
    - proposing new relations for review.
- **Why This Matters**:
  - Deterministic graph views are faster, cheaper, and more trustworthy than AI-generated diagrams.
  - AI should enhance the graph, not invent the graph every time.
  - This also gives users reliable inspection tools and gives future agents a stable operation surface.

### PI-032: PDF / Source Parsing Needs Layout-Aware Structure Extraction

- **Status**: Open
- **Problem**:
  - Current document parsing is mostly text-first.
  - It does not reliably split a PDF page into layout regions such as title, subtitle, paragraph, image, code block, table, figure caption, header, footer, or margin note.
- **Current Implementation Reality**:
  - Native PDF parsing extracts text.
  - OCR fallback asks the model to preserve structure as much as possible, but returns text, not region objects.
  - `document_chunks` store content, heading, page_start, and page_end.
  - Source Snapshot pages are page-like text sections.
  - The system does not currently produce one structured block per visual PDF region.
- **User Question**:
  - If a PDF page contains a title, subtitle, text, image, code area, header, and footer, should every region become a block?
- **Likely Answer**:
  - Not immediately.
  - The first stable layer should distinguish:
    - source page;
    - source chunk;
    - material segment;
    - source scope;
    - generated NoteBlock.
  - Later, richer source parsing can create layout-aware source regions.
- **Future Source Region Types**:
  - title;
  - heading;
  - paragraph;
  - formula;
  - code;
  - table;
  - figure;
  - image;
  - caption;
  - header;
  - footer;
  - sidebar/margin note;
  - bibliography/reference item.
- **Important Boundary**:
  - A source region is not automatically a NoteBlock.
  - Source regions are evidence/source objects.
  - NoteBlocks are user-facing synthesized or extracted learning/content objects.
  - A proposal can choose which source regions become NoteBlocks.
- **Why It Matters**:
  - Layout-aware extraction would make source viewer, source anchoring, citation, formula/code/image handling, and AI note generation much stronger.
  - But if every visual region automatically becomes a NoteBlock, the note can become noisy and hard to read.
- **Research / Future Work**:
  - Study PDF.js, layout detection, OCR region extraction, document AI, table/figure extraction, and multimodal parsing.
  - Decide whether v2.x should add source-region records or wait until Source Annotation / Media Snapshot maturity.

### PI-033: Source Document Reconstruction Into Editable Blocks Is A Separate Workflow

- **Status**: Open
- **Problem**:
  - Some users may not want AI summarization.
  - They may want Coincides to reconstruct an existing paper/article/document into editable blocks while preserving the original structure and layout as much as possible.
- **Example Use Case**:
  - User writes a paper.
  - Advisor rejects it and asks for revision.
  - User imports the paper into Coincides.
  - Coincides splits the paper into blocks that mirror the original document:
    - title;
    - abstract;
    - headings;
    - paragraphs;
    - figures;
    - captions;
    - tables;
    - formulas;
    - references;
    - footnotes.
  - User edits, deletes, reorders, rewrites, and annotates blocks on the canvas.
- **Important Distinction**:
  - This is not the same as "generate a learning note from source."
  - This is closer to `document reconstruction` or `source-to-editable-document`.
- **Why It Is Natural**:
  - Users often want to revise their own existing documents, not only learn from external materials.
  - Blockizing a document can make large revisions easier.
  - It fits Coincides' future canvas-first editing model.
- **Major Risk**:
  - A 1-page document is easy.
  - A 200-page paper/book/manual is a scale and performance problem.
  - Blindly converting every detected region into an editable block can create thousands of blocks, slow rendering, noisy UX, and difficult recovery.
- **Possible Modes**:
  - `preview_only`: show detected structure before creating editable blocks.
  - `page_by_page`: convert selected pages only.
  - `section_by_section`: convert one section/chapter at a time.
  - `full_reconstruction`: convert the whole document, but with virtualization and background processing.
  - `source_preserving`: keep source snapshot as truth and create editable overlay blocks only where user edits.
- **AI Role**:
  - AI can help classify regions and infer block types.
  - AI should not silently create thousands of blocks without preview, batching, and recovery.
  - Reconstruction should be proposal-first or preview-first.
- **Open Technical Questions**:
  - How accurate must layout detection be before this is useful?
  - Should reconstructed blocks preserve page coordinates?
  - Should references/footnotes/captions become separate blocks or metadata?
  - How should updates map back to export/PDF/Word?
  - Should this use PDF.js, OCR layout detection, or external document-layout AI?
- **Why It Matters**:
  - This could become a powerful editing workflow beyond learning.
  - It also creates dangerous scale if built naively.
  - The right architecture must distinguish source reconstruction from note synthesis.

### PI-036: Document Reconstruction Needs Block Fusion And Repeated Decoration Handling

- **Status**: Open
- **Problem**:
  - Reconstructing a document into editable blocks is not only "detect region -> create block."
  - The system must decide which detected regions should merge, which should stay separate, and which are not content blocks at all.
- **Block Fusion Cases**:
  - A paragraph split across two pages should usually remain one logical paragraph block.
  - A paragraph split by PDF line wrapping or hyphenation should be repaired.
  - Related paragraphs may belong to one section/frame but should not necessarily become one giant block.
  - Long sections should become a section/composition containing many blocks, not one massive block.
- **Fusion Signals**:
  - continuing sentence across page break;
  - no paragraph-ending punctuation;
  - matching font/indent/line spacing;
  - hyphenated word continuation;
  - no intervening heading;
  - same column/layout lane.
- **Repeated Decoration Cases**:
  - page numbers;
  - running headers;
  - running footers;
  - repeated chapter titles;
  - repeated document title / author line;
  - repeated corner labels.
- **Desired Treatment**:
  - Repeated decorative text should become page decoration rules or source layout artifacts, not hundreds of NoteBlocks.
  - A 200-page document should not create 200 page-number blocks or 800 corner decoration blocks.
- **Possible Objects**:
  - `SourceRegion`
  - `DocumentSection`
  - `PageDecoration`
  - `PageNumberingRule`
  - `ReconstructionProposal`
  - `ReconstructedBlockGroup`
- **Why It Matters**:
  - Without fusion, reconstructed documents become fragmented and painful to edit.
  - Without repeated-decoration detection, large imports waste storage, rendering time, and user attention.
  - This is a core requirement for any serious source-to-editable-document workflow.

### PI-034: Page-Aware Querying Must Bridge Content, Canvas Projection, And Page Decorations

- **Status**: Open
- **Problem**:
  - Page numbers, headers, and footers may be page decorations rather than NoteBlocks.
  - NoteBlocks are content objects.
  - CanvasNodes are projections of objects onto a canvas/page.
  - Users and AI will still ask page-aware questions that require these layers to line up.
- **Example Question**:
  - "Which page first contains a trigonometry concept?"
  - "Where is the first sine-related definition?"
  - "Which page has the first example involving tangent?"
- **Why This Is Hard**:
  - Keyword search may find matching NoteBlocks.
  - But page numbers are not NoteBlocks.
  - The answer requires knowing where the matching NoteBlock is projected on the canvas/page.
- **Needed Bridge**:
  - A page-aware projection index that maps:
    - `NoteBlock -> CanvasNode -> CanvasPageSpec/page_index/export_page`
    - `SourceReference -> SourceSnapshotPage`
    - `PageDecoration -> CanvasPageSpec/page_index`
  - AI should not infer this from screen pixels.
  - The system should expose it as structured query data.
- **Possible Query Flow**:
  1. Resolve query topic: trigonometry / sine / tangent.
  2. Find relevant NoteBlocks by text, template metadata, learning role, concept tags, or future concept nodes.
  3. Find their CanvasNode projections.
  4. Map CanvasNode y-position or page assignment to page index.
  5. Return the earliest matching page and the matching blocks.
- **Important Boundary**:
  - Page decorations are not content, but they define visible/export page identity.
  - Canvas projection is not truth, but it tells where content appears.
  - AI needs an API that combines content search with projection/page mapping.
- **Why It Matters**:
  - Without a page-aware query layer, AI will confuse content truth with visual/page location.
  - This is required for natural questions about "where" something appears in a generated note.
  - It also supports export, navigation, minimap, table of contents, and review workflows.

### PI-035: Page Numbering Needs Internal Page Index And User-Facing Page Labels

- **Status**: Open
- **Problem**:
  - Internal page index and user-visible page number often do not match.
  - Covers, front matter, table of contents, agenda, outline, and chapter-opening pages may use no page number or Roman numerals.
  - The visible "page 1" of the document may correspond to internal/generated page 8.
- **Examples**:
  - Internal page 1 = cover, no visible page number.
  - Internal pages 2-7 = front matter, labeled i, ii, iii, iv, v, vi.
  - Internal page 8 = first main content page, labeled 1.
- **Required Distinction**:
  - `internal_page_index`: stable zero/one-based internal page position.
  - `export_page_index`: page position in exported PDF.
  - `display_page_label`: what the user sees, e.g. `Cover`, `i`, `ii`, `1`, `2`, `A-1`.
  - `page_numbering_scheme`: none, arabic, roman_lower, roman_upper, chapter_prefix, custom.
  - `page_numbering_start`: the internal page where a numbering section starts.
- **AI Query Implication**:
  - If a user asks "which page", the system may need to answer with both:
    - user-facing page label;
    - internal/generated page index if useful.
- **Possible Answer Format**:
  - "It appears on visible page 1, which is internal generated page 8."
  - "It appears in the front matter on page iv."
- **Why It Matters**:
  - Users think in visible page labels.
  - The system navigates by internal page index.
  - Export, source citation, and AI navigation must not confuse these two.
- **Future Need**:
  - Page numbering editor / page label rules.
  - Different numbering sections inside the same document.
  - Support for no-number cover pages, Roman front matter, and Arabic main content.

### PI-037: Template / Style Editing Should Be A Separate Optional Studio Plugin But Deeply Bound To The App

- **Status**: Open
- **Problem**:
  - Coincides needs powerful editing tools for templates, block styles, arrow/edge styles, relation styles, canvas backgrounds, and possibly package/domain assets.
  - Putting all of this into the daily app surface may make the product heavy and confusing.
  - Fully separating it into an unrelated app may make templates hard to use immediately.
- **Desired Product Shape**:
  - The main app remains clean for reading, writing, source work, and canvas use.
  - Advanced creation tools live in a Template/Style Studio.
  - The studio can be optional / separately downloadable / plugin-like.
  - The main app can open the studio from Settings, Template Studio, or an advanced tools menu.
  - Edits made in the studio should become immediately available in the main app after save/sync.
- **Installation Model Idea**:
  - User can install only the base app and use default templates/styles.
  - User can optionally install the Template/Style Studio plugin.
  - The plugin is separate in engineering/deployment but feels integrated in product use.
  - Plugin install path and local data path must be designed so edited templates/styles are immediately visible to the main app.
- **Studio Scope May Include**:
  - TemplateDefinition editor.
  - CompositionTemplate editor.
  - DomainBlockSet / package editor.
  - block visual style editor.
  - sticky note style editor.
  - arrow / edge style editor.
  - relation visual style presets.
  - canvas background/theme editor.
  - export/page style presets.
- **Block Style Example**:
  - `paragraph` can render as plain invisible-frame text.
  - The same semantic paragraph system type may also use a sticky-note style, boxed note style, callout style, margin note style, or other user-created visual variants.
  - Style affects padding, border, background, shadow, handles, selected-state frame, and content safe area.
- **Important Boundary**:
  - Visual style variants should not redefine core semantic system types.
  - A styled paragraph is still text/paragraph content unless the template/metadata says otherwise.
  - The studio edits presentation and template contracts; it should not silently rewrite user content.
- **Research Need**:
  - Study existing visual editors/style editors/design-system editors rather than building every control from scratch.
  - Look for reusable UI patterns or libraries for inspecting and editing styles, tokens, borders, spacing, shadows, arrows, and component variants.
- **Not A Photoshop Clone**:
  - The studio does not need to become a full drawing/image-editing tool.
  - Users who want custom visuals can upload image assets instead of drawing everything inside Coincides.
  - The first useful version should support choosing, cropping, positioning, and applying uploaded assets to backgrounds, stickers, note styles, and canvas decorations.
- **Theme / App Appearance Editing**:
  - The studio may also edit the app's visual theme:
    - app background;
    - canvas background;
    - panel background;
    - button colors;
    - accent colors;
    - typography presets;
    - border styles;
    - scrollbar / drag handle style;
    - section/card/panel frame style;
    - selected/hover/focus states.
- **Asset Handling Direction**:
  - Support image upload as style assets.
  - Support simple crop/fit/fill/position options.
  - Support applying an image to:
    - app background;
    - canvas background;
    - sticky note skin;
    - block frame;
    - decorative stamp/sticker;
    - page template.
  - Avoid implementing complex painting, layers, filters, or Photoshop-like editing unless a future product plan explicitly needs it.
- **Why It Matters**:
  - This preserves a clean daily product while still giving power users and AI-assisted workflows a creation environment.
  - It also fits Henry's long-term "Warcraft map editor" analogy without forcing every user to live inside the editor.

### PI-038: Default Interface Should Stay Minimal Because Custom Styling Comes Later

- **Status**: Open
- **Problem**:
  - If users can later customize backgrounds, borders, arrows, block skins, and themes, the default interface should not compete for attention.
  - The main workspace must leave visual and cognitive space for writing, drawing, arranging, and editing blocks.
- **Default UX Direction**:
  - Minimal.
  - Clean.
  - Low visual noise.
  - Smooth lines and motion.
  - No decorative overload.
  - Function-first layout.
- **Canvas Priority**:
  - The canvas should maximize usable editing space.
  - Panels should collapse, hide, or move out of the way when not needed.
  - Toolbars should be compact and contextual.
  - Metadata should appear on selection/hover/inspector, not always.
- **Interaction Inspiration**:
  - Notion-like simplicity is useful as a reference for clarity, not as a clone target.
  - Coincides should feel clean enough for writing and flexible enough for canvas layout.
- **Why It Matters**:
  - Custom style packs and uploaded assets can come later.
  - The default product must be useful and visually calm even before customization exists.
  - A clean base also makes user-created styles easier to judge.

### PI-039: Calendar / Goals / TimeBlock Features Need Product Boundary Review

- **Status**: Open
- **Problem**:
  - Coincides currently has learning-adjacent productivity features such as calendar, goals, time blocks, and planning.
  - The product is now evolving toward a source-grounded information workspace.
  - It is unclear whether calendar/goal features should remain core, become optional modules, or be split out.
- **Original Product Value**:
  - The v1.x product helped Henry prepare for exams.
  - User could upload notes under a course.
  - Agent could generate learning cards and study plans.
  - Agent could schedule study tasks into time blocks or calendar-like events.
- **Why It May Still Matter**:
  - Study planning is a natural extension of learning notes.
  - Relation graphs and prerequisites can support "what should I study first?"
  - AI can generate a schedule from selected material, available time, and learning goals.
  - For course-style projects, "uploaded material -> study plan -> calendar/time blocks" is still a coherent and useful workflow.
  - This workflow can make the learning branch of Coincides feel genuinely practical instead of only being a note generator.
- **Why It May Need Separation**:
  - Calendar/goal UI may distract from the core writing/source/canvas workspace.
  - The new product identity is broader than learning plans.
  - Research/game/report workflows may not need goals/time blocks.
- **Possible Directions**:
  - Keep as optional project module.
  - Keep only for `course` project type.
  - Move to a separate Planning workspace.
  - Hide by default until the user enables learning planning.
  - Preserve backend capabilities but simplify main navigation.
- **Key Question**:
  - Is Coincides a note/source/canvas workspace with optional planning, or a full study operating system?
- **Likely Recommendation**:
  - Do not delete these features.
  - Reclassify them as optional workflow modules, especially for learning/course projects.
  - Keep the main product surface focused on Project, Sources, Notes/Canvas, Agent, and Studio.
  - Keep the scheduling engine available behind a learning-plan action, not as a permanent default sidebar burden.
  - Treat Calendar / Goals / TimeBlocks as a planning layer that can be enabled by project type or user choice.

### PI-040: Page Canvas Needs Page Area, Outside-Page Workspace, And Multi-Page Modes

- **Status**: Open
- **Reference Observation**:
  - AFFiNE's canvas mode is useful as a visual reference: it shows a document-like page embedded inside a larger canvas.
  - In AFFiNE, the central page is still mostly a document editor, while the surrounding area is the canvas/whiteboard area.
  - Coincides is different: the A4 page itself should also be a canvas, because NoteBlocks, sticky notes, figures, annotations, and layout objects can be placed directly on it.
- **Core Difference From AFFiNE**:
  - AFFiNE separates page editing and surrounding canvas more clearly.
  - Coincides should treat the page as the primary editable canvas surface.
  - The outside-page area is still useful, but it should not become the main document content by default.
- **Page Area Rule**:
  - Objects inside the page area are part of the formal note/export surface unless explicitly marked otherwise.
  - Objects outside the page area are workspace objects by default: scratch notes, temporary icons, sticky reminders, visual aids, planning fragments, or non-export annotations.
  - Export should normally include page content and exclude outside-page workspace objects unless the user chooses a special export mode.
- **Needed Canvas Modes**:
  - **Single locked page mode**: one A4/page canvas, with movement constrained to the page.
  - **Open canvas mode**: unlocks the surrounding workspace for scratch notes, sticky notes, icons, and extended reasoning.
  - **Multi-page grid mode**: pages appear like a Word-style multi-page overview, for example 1-5 in the first row and 6-10 in the second row.
  - **Seamless page stack mode**: pages connect vertically with only a dashed page-break line between them, useful for handwriting-like or iPad-like continuous note taking.
- **Multi-Page Layout Concern**:
  - If many pages are shown in a row, outside-page objects such as sticky notes or icons can create visual clutter.
  - Pages need enough spacing between them so users can attach remarks or temporary objects without blocking formal content.
  - The product should not assume one row can safely show too many pages at once.
- **Seamless Page Stack Concern**:
  - Seamless mode should feel like one continuous canvas.
  - Page breaks should remain visible as dashed guide lines so users understand where PDF/export page cuts will happen.
  - Objects crossing a page break may be allowed visually, but export behavior must be explicit.
- **Open Questions**:
  - Which outside-page objects should be exportable by user choice?
  - Should sticky notes outside the page be attached to a page, a block, or only to canvas coordinates?
  - How should the app warn users when an object crosses a page boundary and may be split during PDF export?
  - Should multi-page grid mode support per-row page count controls, automatic responsive layout, or both?
  - Should AI-generated notes stay inside the selected page mode while user-authored scratch work can live outside it?

### PI-041: Favorites Need Note-Level And Project-Level Quick Access

- **Status**: Open
- **Problem**:
  - The current course/project model can hide important notes several clicks deep.
  - A user may have many projects, and each project may contain many notes, boards, or canvases.
  - Some notes may be checked daily or repeatedly, so they need direct navigation from the app shell.
- **Reference Observation**:
  - AFFiNE keeps a Favorite area in the sidebar.
  - This is useful not because Coincides should copy the UI, but because quick access matters once the workspace grows.
- **Desired Direction**:
  - Sidebar Favorites should support direct links to frequently used notes.
  - Favorites may eventually include projects, notes, canvases, source boards, packages, or templates, but note-level favorites are the first important case.
  - A favorite note should be reachable from the home/navigation shell without first entering its parent course/project.
- **Why It Matters**:
  - If Coincides becomes a real personal knowledge and source workspace, navigation depth becomes a daily friction point.
  - Favorites give users a stable "return here every day" path.
  - This also helps preserve the value of long-running notes, study plans, research boards, and personal dashboards.
- **Open Questions**:
  - Should Favorites belong globally to the user, or be grouped by workspace/project type?
  - Should favorite notes open directly in page/canvas mode, or restore the last used view mode?
  - Should favorite items appear in the sidebar only, or also in a home dashboard?
  - Should favorites support pinned ordering, folders, or tags?

### PI-042: Inputs / Outputs / Retrieval Architecture Need A Systematic Audit

- **Status**: Open
- **Problem**:
  - Coincides already has many pieces of an input/output/RAG system, but they are scattered across versions and documents.
  - The current product can ingest some source materials, create snapshots/scopes/boards, generate notes/proposals, store template/domain/package runtime records, and draw canvas relations.
  - However, there is no single systematic definition of:
    - what counts as an input;
    - what counts as an output;
    - what intermediate retrieval/index layers exist;
    - which parts are mature, partial, or only conceptual;
    - how v3.x should move toward graph-native and Graph RAG.
- **Why This Is Heavy**:
  - This is not a small UX issue.
  - It is a structural review of the data model and the whole product pipeline after the v2.5 foundation.
  - It should examine what Coincides has actually implemented, not only what the roadmap imagines.
- **Input Categories To Define**:
  - Source inputs: PDF, documents, markdown, webpages, images, handwritten notes, tables, code, future media/transcripts.
  - User inputs: user-authored NoteBlocks, sticky notes, scratch work, questions, corrections, manual relations, personal remarks.
  - Agent inputs: proposals, generated blocks, layout suggestions, relation suggestions, template suggestions, migration suggestions.
  - System inputs: templates, composition templates, domain packages, package imports, source snapshots, anchors, scopes, operation history.
- **Output Categories To Define**:
  - Human-facing outputs: canvas notes, page notes, PDFs, HTML, images, reports, briefings, study plans.
  - Project outputs: `.coincides` project files, package bundles, reusable templates, domain packages, style/theme packs.
  - AI-facing outputs: selected context, graph context, source-grounded evidence bundles, relation-filtered subgraphs, task-specific prompt payloads.
  - Recovery/provenance outputs: operation batches, migration records, import/export records, compatibility reports.
- **Retrieval / RAG Layers To Define**:
  - Keyword and structured lookup.
  - Source snapshot / source scope lookup.
  - Vector retrieval over source text and NoteBlocks.
  - Relation traversal over ObjectRelations and future graph-native edges.
  - Hybrid retrieval that combines semantic recall, source evidence, relation traversal, and user/project filters.
  - Future Graph RAG, where AI receives a compact source-grounded subgraph instead of raw long text.
- **Likely Long-Term Architecture Direction**:
  - Do not turn everything into a pure graph database.
  - Keep ordinary database storage for product state, accounts, templates, package records, operation history, status machines, and compatibility records.
  - Keep object/file storage for original files, snapshots, media, and export artifacts.
  - Keep vector/RAG indexes for semantic recall.
  - Use graph database or graph index for knowledge structure: NoteBlocks, SourceScopes, Evidence, Concepts, Domain objects, and ObjectRelations.
  - Use Graph RAG as an orchestration layer over SQL + source storage + vector index + graph structure.
- **Capability Audit Needed**:
  - For each implemented area, classify it as:
    - mature enough;
    - usable but rough;
    - foundation only;
    - conceptual / not implemented;
    - blocked by missing UX;
    - blocked by missing data model.
  - This should include at least:
    - source ingestion;
    - source snapshot / anchor / scope / board;
    - note generation and manual NoteBlock editing;
    - canvas page and open workspace;
    - relation layer / ObjectRelation;
    - templates / compositions / domain packages / package import-export;
    - proposal/apply/recovery flows;
    - AI provider usage and future agent workflow.
- **Why It Matters**:
  - Before v3.x graph-native migration, Coincides needs to know what its real data boundaries are.
  - Without this audit, Graph RAG could be designed around imagined capabilities instead of implemented ones.
  - A clear input/output/retrieval map will also make future roadmap planning less scattered.
- **Open Questions**:
  - What is the canonical list of input types Coincides should support first?
  - Which outputs are user-facing exports, and which are machine/project artifacts?
  - Which current data tables are product state, which are knowledge state, and which are only projection/cache?
  - Which data should become graph nodes or graph edges in v3.x?
  - What should remain in ordinary SQL even after graph-native migration?
  - What is the minimum useful Graph RAG pipeline for Coincides?
  - Should the v3.x graph store be primary truth, a rebuildable graph index, or a hybrid knowledge truth layer?

### PI-043: Interaction Inventory / Command Surface Audit Is Required Before UX Rebuild

- **Status**: Open
- **Problem**:
  - Coincides already has many actions, modes, metadata hints, object types, and AI-assisted workflows.
  - The current UX risks becoming a surface full of buttons, panels, and hidden functionality if command placement is not designed systematically.
  - Before a serious UX rebuild, Coincides needs a clear inventory of what users can do and where each action should live.
- **Core Question**:
  - For every action or piece of information, should it be:
    - a visible button;
    - a contextual button;
    - a hover affordance;
    - a right-click menu item;
    - a toolbar mode;
    - an inspector/property panel field;
    - a keyboard shortcut;
    - an Agent command;
    - a hidden advanced action;
    - or not exposed at all?
- **Why This Matters**:
  - Button placement decides what users discover and what they miss.
  - Too many visible buttons make the workspace feel like an engineering console.
  - Too many hidden actions make the product feel unusable.
  - Coincides needs a clean daily writing/canvas surface while still keeping powerful operations available.
- **Inventory Dimensions**:
  - Command / action name.
  - User intent.
  - Target object: Project, Source, NoteBlock, CanvasNode, CanvasEdge, ObjectRelation, Template, Package, etc.
  - Frequency: high, medium, low.
  - Risk level: safe, reversible, destructive, proposal-required.
  - Best surface: visible button, hover, right-click, toolbar, inspector, Agent command, shortcut.
  - Fallback surface.
  - Whether the action needs confirmation.
  - Whether Agent can trigger it directly or only through proposal-first review.
- **Surfaces To Audit**:
  - Main sidebar and home navigation.
  - Project / Course workspace.
  - Source material area.
  - NoteBlock / CanvasNode.
  - Canvas toolbar and page mode controls.
  - Relation / edge editing.
  - Source linking and source jump-back.
  - Template Studio and Package Studio.
  - Agent chat / command interface.
  - Export and sharing.
  - Settings / appearance / style studio.
- **Initial Placement Intuition**:
  - High-frequency safe actions can stay visible.
  - Object-specific actions should usually be contextual, right-click, or inspector-based.
  - Lightweight metadata should often appear on hover or selection.
  - Complex configuration should live in an inspector or studio page.
  - AI/Agent actions should be available, but risky mutations should stay proposal-first.
- **Open Questions**:
  - Which actions must be visible for first-time usability?
  - Which actions are expert-only and should be hidden behind right-click or inspector panels?
  - Which actions should be available through both UI and Agent command?
  - What needs keyboard shortcuts once the product becomes a desktop/iPad-style workspace?
  - How should the interface communicate that an action exists without turning everything into buttons?

### PI-044: SQLite-To-Graph Boundary Audit Is Needed Before v3.x

- **Status**: Open
- **Problem**:
  - Coincides has grown a large SQLite-backed product/data model through v2.x.
  - v3.x is expected to consider graph-native reconstruction, but not every table should become graph storage.
  - The project needs a systematic internal audit of current code and schema before deciding what stays in ordinary SQL, what becomes graph-native, and what becomes rebuildable index/projection.
- **Audit Goal**:
  - Read the current implementation, not only roadmap notes.
  - Classify each data area by future storage role:
    - keep in SQLite / ordinary relational database;
    - migrate to graph database as durable knowledge truth;
    - keep as rebuildable graph/vector/search index;
    - keep as file/object storage;
    - keep as projection/cache/view state;
    - keep as operation/provenance/history.
- **Likely SQL-Owned Areas**:
  - users, settings, auth/session-like records;
  - project/course shell metadata;
  - operation batches, proposal status, migration records, import/export records;
  - template/package lifecycle and compatibility reports where relational versioning is simpler;
  - UI/session/view preferences that are not knowledge truth.
- **Likely Graph-Native Candidates**:
  - NoteBlock / content objects;
  - SourceScope / SourceAnchor / EvidenceSet where they form source-grounded evidence nodes;
  - ObjectRelation as semantic edge candidate;
  - Concept/Topic nodes if introduced;
  - DomainBlockSet / TemplateDefinition / CompositionTemplate as capability/semantic nodes if graph traversal proves useful;
  - user-authored questions, scratch notes, and private knowledge-state markers if they need AI reasoning over relations.
- **Likely Projection / Cache / Index Areas**:
  - CanvasNode, CanvasFrame, CanvasEdge visual state, viewport state;
  - source snapshot pages when used as display/recovery surfaces;
  - vector embeddings and FTS tables;
  - graph indexes rebuilt from durable SQL/graph truth;
  - package preview/import preview artifacts.
- **Key Distinction**:
  - Graph-native does not mean "put every table into Neo4j."
  - It means making the knowledge/relation layer graph-aware while keeping product control, recovery, compatibility, and UI state in the storage model best suited to each job.
- **Research Questions**:
  - Which current tables are product administration state?
  - Which tables represent durable knowledge objects?
  - Which records are only projections of another truth?
  - Which records are operation history rather than knowledge truth?
  - Which relationships should become graph edges, and which should stay relational joins or metadata?
  - What migration path avoids breaking existing v2.x data?
  - Should v3.x use Neo4j as primary knowledge truth, a rebuildable graph index, or a hybrid graph truth layer beside SQL?
- **Why It Matters**:
  - A naive graph migration could make the product more complex without improving AI retrieval or user experience.
  - A deliberate boundary audit can turn v2.x into clean migration evidence rather than technical debt.
  - This audit should happen before any v3.x graph database implementation plan.

### PI-045: Note Assembly Must Become A Real v2.x Product Capability

- **Status**: Open
- **Priority**: High
- **Target Timing**: v2.x, not deferred to v3.x
- **Problem**:
  - Coincides has built much of the engineering foundation for NoteBlock, source grounding, templates, domains, packages, canvas projection, and relation records.
  - It still lacks a mature product flow for turning real materials into genuinely useful notes.
  - The system cannot treat every uploaded material the same way: a 2200-page textbook, a teacher lecture note, a paper, a problem set, a code document, a history source, and a user-authored note need different assembly strategies.
- **Core Product Requirement**:
  - Coincides must learn how to decide what kind of note should be produced before it produces the note.
  - This is not only a future graph-native concern. It is necessary in v2.x for the product to become useful as a real note-making system.
- **Three-Layer Note Assembly Model**:
  - **Source / Chunk Layer**:
    - Parse and chunk original source material for traceability and evidence.
    - Keep raw source truth separate from generated or user-authored NoteBlocks.
    - Improve chunking so long textbooks, lecture notes, papers, handwritten notes, code, formulas, tables, figures, and repeated decorations can be handled intentionally.
  - **Summary / Navigation Layer**:
    - Generate document-level summaries, chapter-level summaries, section summaries, and main-line outlines.
    - Let AI reason over "what this material is about" before choosing what to include.
    - Use summaries as navigation and planning objects, not final note content by themselves.
  - **NoteBlock / Knowledge Layer**:
    - Convert selected, condensed, or reorganized knowledge into NoteBlocks.
    - Distinguish source quotes, definitions, formulas, theorems, examples, exercises, proofs, warnings, user remarks, and domain-specific variants.
    - Preserve source links when a block is source-grounded, while still allowing user-authored source-free blocks.
- **Material Strategy Examples**:
  - A textbook should be filtered, condensed, and reorganized into a smaller study note, with unimportant passages omitted or summarized.
  - A lecture note is usually already dense and should be cleaned, structured, lightly annotated, and laid out rather than aggressively rewritten.
  - A problem set should become a practice-oriented note with questions, answer slots, solution hints, worked examples, and error patterns.
  - A paper should preserve argument structure, methods, evidence, claims, limitations, and bibliography-like source context.
  - A history source may mostly use paragraph/note/source-quote structures, while math, engineering, biology, coding, and other fields may need more specialized template variants.
- **Template / Type Decision Requirement**:
  - Fixed `system_type` should remain closed and stable.
  - Domain/template variants under the fixed system types should be extensible.
  - The near-term goal is not to let AI freely invent templates or judge design quality.
  - Users and developers should be able to define templates, classify them, and attach domain/subdomain/material-use tags.
  - AI should first select from the classified template space instead of reading every template or guessing from names alone.
  - If no suitable classified template exists, AI should fall back safely and record a template gap warning rather than silently forcing everything into generic paragraph blocks.
  - Examples:
    - `formula.math`, `formula.engineering`, `formula.biology`;
    - `definition.math`, `definition.calculus`, `definition.engineering`;
    - code-oriented templates under the fixed `code` system type;
    - paragraph variants with different rendering or study behavior.
- **Template Classification System Requirement**:
  - Coincides needs an explicit classification layer for templates before attempting advanced AI template reasoning.
  - Each template should be classifiable by:
    - fixed `system_type`;
    - learning role;
    - domain tags such as math, biology, engineering, history, programming;
    - subdomain tags such as calculus, algebra, mechanics, cell biology;
    - material type tags such as textbook, lecture note, paper, problem set, code document;
    - usage context such as study note, proof detail, example bank, research brief, source quote, scratch note;
    - fallback template and safe generic fallback.
  - Some templates should be marked as broad-domain reusable, such as all-math or all-history.
  - Some templates should be marked as narrow-domain only, such as calculus-only or algebra-only.
  - Template classification is primarily a user/developer/editor responsibility in the near term.
- **Template Selection Engine Requirement**:
  - AI still needs a simple engine to choose templates from the classified template space.
  - The first version should be conservative:
    - classify material domain and material type;
    - detect the content role such as definition, formula, theorem, example, exercise, code, source quote;
    - retrieve candidate templates by domain/subdomain/material tags;
    - prefer the most specific matching active template;
    - fall back to broader domain templates, then generic learning-role templates, then safe text/note templates;
    - emit warnings when only a generic fallback was used.
  - This is different from advanced AI design judgment.
  - The engine should help AI choose within human-defined boundaries, not replace the template editor or designer.
- **Layered Presentation Requirement**:
  - Not all generated material should be displayed flatly.
  - Main-line content should remain directly visible.
  - Long examples, practice problems, proof details, alternate explanations, source excerpts, and user remarks may need collapse/expand behavior.
  - Future NoteBlocks may need display metadata such as importance, detail level, default collapse state, export policy, and source-grounding status.
- **Planning Before Generation**:
  - Large materials should not jump directly from upload to final note.
  - A `NoteAssemblyPlan` or similar proposal should first estimate:
    - material type and intent;
    - document/chapter/section structure;
    - proposed note size;
    - included vs omitted content categories;
    - likely NoteBlock roles/templates;
    - source coverage;
    - collapse/layering strategy;
    - canvas/page layout direction.
  - This lets the user review "how the note will be made" before hundreds of blocks are created.
- **Initial Note Assembly Pipeline Idea**:
  - The pipeline should not jump directly from raw chunks to knowledge-level deduplication.
  - A safer first architecture is:
    1. Source parse.
    2. Layout-aware chunking.
    3. Source-level reconciliation for exact duplicates, overlap, repeated scans, and duplicated files.
    4. Content role segmentation to identify definition, formula, theorem, proof, example, exercise, paragraph, source quote, and other role-like regions inside chunks.
    5. Candidate knowledge unit extraction from role-aware source regions.
    6. Role-aware knowledge reconciliation.
    7. Note assembly plan.
    8. NoteBlock generation.
    9. Canvas/page layout.
  - Knowledge-level reconciliation should compare like with like:
    - definition with definition;
    - formula with formula;
    - theorem with theorem;
    - example with example;
    - proof with proof;
    - exercise with exercise.
  - Example reconciliation should usually cluster examples rather than delete them.
  - Theorem reconciliation should prefer the most complete statement while preserving incomplete notes, extra conditions, proof details, or useful remarks as supporting material.
  - Source quotes should remain source-faithful and should not be casually rewritten.
  - The first implementation should use rules, domain hints, and conservative AI assistance rather than pure model judgment.
- **Developer Tools / Studio Requirement**:
  - Coincides will need a systematic developer-facing tool suite, not only a simple template editor.
  - The tool suite should eventually cover:
    - Template Studio for `TemplateDefinition`, field schema, source behavior, relation behavior, proposal behavior, and agent summaries.
    - Role Studio for domain-defined roles such as `detective.clue`, `intelligence.claim`, `biology.observation`, or `engineering.constraint`.
    - Domain / Subdomain Studio for organizing which roles, templates, compositions, and behaviors belong to each knowledge area.
    - Behavior Preset Studio for reconciliation behavior, display behavior, source behavior, relation behavior, and proposal behavior.
    - Visual Style Studio for block frames, typography, borders, backgrounds, arrows, table styles, sticky notes, canvas backgrounds, icons, stickers, and uploaded visual assets.
    - Agent Guidance Studio for `summary_for_agent`, `use_when`, `avoid_when`, examples, fallback rules, and common mistakes.
    - Package / Extension Studio for packaging and sharing templates, roles, domains, styles, behaviors, and future editor extensions.
  - Normal users should get safe presets and guided controls.
  - Advanced users and developers should eventually get deeper extension points, including dangerous areas such as CSS-like styling or advanced display behavior.
  - Because the project may be released under a permissive open-source license, developers can fork and modify internals anyway.
  - Therefore Coincides should prefer official, traceable, reviewable, and recoverable extension surfaces over forcing developers to patch core code directly.
  - The product should still distinguish:
    - safe user configuration;
    - advanced developer configuration;
    - raw/internal extension hooks;
    - unsupported fork-level modification.
  - The long-term goal is not to prevent deep customization, but to make it visible, packageable, reversible, and understandable by both humans and agents.
- **Why It Matters**:
  - v2.x should not only be a graph/database foundation.
  - v2.x must prove that Coincides can actually help make notes from real materials.
  - Good NoteBlock extraction and note assembly will also create cleaner evidence for v3.x graph-native migration.
  - If this layer is weak, graph migration will only preserve weak note data in a more complex database.

### PI-046: AFFiNE / BlockSuite Adoption Research Must Start With Coincides Architecture Inventory

- **Status**: Open
- **Problem**:
  - Coincides needs to reconsider whether building a complete note editor and canvas experience from scratch is the right path.
  - AFFiNE / BlockSuite may provide a mature document editor, block editor, and edgeless canvas foundation.
  - A direct fork/copy/adaptation may reduce some editor UX work, but it may also force Coincides into another product's data model.
  - The research cannot start by only asking "can AFFiNE do our canvas?".
  - It must first clarify what Coincides actually is structurally, then compare whether AFFiNE can be adapted toward that structure.
- **Required First Step: Coincides Self-Inventory**:
  - Identify Coincides' current and desired core objects:
    - Project / Course;
    - Source / Snapshot / Scope / Anchor;
    - Note / NoteBlock;
    - Canvas / CanvasNode / CanvasFrame / CanvasEdge;
    - ObjectRelation / RelationLayer;
    - TemplateDefinition / CompositionTemplate / DomainBlockSet / PackageManifest;
    - Proposal / OperationBatch / Recovery records;
    - future graph-shaped knowledge view.
  - Classify which objects are:
    - user-facing document objects;
    - source/evidence objects;
    - semantic knowledge objects;
    - canvas projection objects;
    - operation/history/proposal objects;
    - graph-node or graph-edge candidates.
- **AFFiNE / BlockSuite Comparison Questions**:
  - What is AFFiNE's actual document/page/canvas data model?
  - Which parts are page editor, which parts are edgeless canvas, and which parts are app shell/backend?
  - Can the page editor support Coincides' desired editing model:
    - double-click a blank page area to enter page editing mode;
    - show a normal text cursor for direct typing;
    - create a block naturally from typing or slash commands;
    - switch into a layout/edit view where each block is represented as a selectable box;
    - resize a block by dragging its edges/corners;
    - move a block freely within the page area;
    - adjust the text flow/shape by resizing the block box rather than by choosing fixed columns.
  - Can the page editor support spatial click-to-type behavior:
    - if an existing text block has been narrowed to the left side of the page;
    - and the user double-clicks the empty right-side area on the same visual row;
    - the editor creates a new editable NoteBlock/text box in that empty area;
    - the new block visually aligns with the nearby block rather than forcing insertion below the whole document flow.
  - The goal is not a fixed two-column or three-column page template.
  - Side-by-side text/image/formula layouts should be an outcome of freely resizing and moving block boxes, not the primary abstraction.
  - This is an explicit test case for whether AFFiNE / BlockSuite can be modified enough, because Coincides should avoid building a full rich text engine from scratch if a mature open-source editor can be adapted safely.
  - If AFFiNE's normal page editor is mostly linear/Notion-like, can it be adapted without fighting its core model?
  - Can the edgeless canvas support Coincides' formal page area, outside-page workspace, multi-page grid, and seamless page stack ideas?
  - Can Coincides keep its source-grounded NoteBlock and ObjectRelation model as sidecar data while using AFFiNE/BlockSuite for editing?
  - Would adapting AFFiNE require changing its internal block model, or can Coincides map its NoteBlocks onto AFFiNE blocks?
  - What parts of AFFiNE are safe to copy, fork, or depend on under their current licenses?
- **Graph Structure Question**:
  - The goal is knowledge-point association and non-linear navigation, not graph database adoption for its own sake.
  - Research should separate:
    - graph-shaped data structure;
    - graph visualization;
    - Graph RAG retrieval;
    - actual graph database storage.
  - Coincides may first need a graph model over NoteBlocks and ObjectRelations before deciding whether to migrate storage to Neo4j or another graph database.
  - The AFFiNE adoption study should ask whether graph-shaped semantic data can live alongside or inside AFFiNE/BlockSuite data.
- **Likely Evaluation Paths**:
  - Full AFFiNE fork/copy and adaptation.
  - BlockSuite-first editor/canvas integration while preserving Coincides' own backend/data model.
  - Coincides-owned editor with AFFiNE/BlockSuite used only as UX/architecture reference.
  - Hybrid: use mature editor runtime for block editing, keep Coincides-owned source/semantic/graph/proposal layers.
- **Why It Matters**:
  - A mature editor/canvas foundation could save large amounts of product UX work.
  - A wrong adoption could bury Coincides' source-grounded NoteBlock and future graph model under an incompatible document model.
  - The first question is not "can we use AFFiNE?" but "what must remain Coincides-owned even if we use AFFiNE?".

### PI-047: Evolvable Concept Layer For Cross-Note Knowledge Retrieval

- **Status**: Open
- **Problem**:
  - Tags alone are too weak for cross-note and cross-project knowledge retrieval.
  - Directly connecting every related NoteBlock to every other NoteBlock would create an unmanageable graph.
  - Coincides needs a middle layer that can normalize knowledge identities across notes, projects, domains, and material types.
  - The layer must support evolution because early classifications will be incomplete or wrong as the user's knowledge base grows.
- **Core Direction**:
  - Introduce a first-class `Concept` layer between NoteBlocks and large-scale graph views.
  - A NoteBlock can link to multiple Concepts, and a Concept can be shared across many notes, projects, and domains.
  - Concepts should not be a single rigid taxonomy tree.
  - They should support multi-dimensional classification such as:
    - domain: math, politics, sociology, engineering, biology;
    - method: statistics, polling methodology, proof technique, simulation;
    - geography: United States, China, Europe, local region;
    - event/topic: presidential election, mining policy, supply chain disruption;
    - material/use: news, research source, textbook, lecture note, case file, personal interest.
  - Tags, text search, source metadata, templates, and embeddings can suggest Concepts, but confirmed Concept links should be stored as their own records.
- **What It Solves**:
  - Cross-note lookup: find all NoteBlocks that discuss the same knowledge point across many notes.
  - Cross-project lookup: connect related knowledge from courses, research projects, intelligence reports, case files, and personal notes.
  - Local graph views: select one NoteBlock or Concept and generate a focused graph without rendering the whole knowledge base.
  - Role-aware deduplication: group repeated statements, proofs, examples, and applications under a shared Concept while preserving source/evidence differences.
  - AI-readable navigation: let AI retrieve by knowledge identity, not only by text similarity.
- **Impact On RAG / GraphRAG**:
  - Concept matching becomes an additional retrieval signal beside keyword search and embeddings.
  - Retrieval can follow this shape:
    - user query;
    - identify candidate Concepts and Concept dimensions;
    - retrieve linked NoteBlocks;
    - rerank by embedding similarity, role, source confidence, relation distance, and project scope;
    - expand through ObjectRelations only where useful;
    - return an explainable context package.
  - This should improve:
    - recall, because related blocks can be found even when wording differs;
    - precision, because unrelated text-similar blocks can be filtered out;
    - explainability, because the system can say why each block was selected;
    - token efficiency, because Concept filters can reduce irrelevant context before model reading.
  - Concept does not replace embeddings.
  - It complements embeddings:
    - embedding finds semantic similarity;
    - Concept finds normalized knowledge identity;
    - ObjectRelation finds logical path;
    - Template/Role finds content function;
    - Source/Evidence finds provenance.
- **Concept Link Rules**:
  - A Concept link should record:
    - target object, usually NoteBlock first;
    - concept id;
    - confidence;
    - source: user, AI, import, rule, migration, refinement proposal;
    - status: suggested, confirmed, rejected, stale;
    - evidence or rationale when available.
  - User-confirmed links should carry more weight than AI-suggested links.
  - AI should be allowed to recommend Concept links, but important bulk changes should be proposal-first.
- **Create / Update / Delete Rules**:
  - Concept should support create, rename, split, merge, deprecate, hide, and successor mapping.
  - Hard delete should generally be avoided because historical NoteBlocks and recovery records may depend on old Concept identities.
  - A deprecated Concept should remain resolvable through alias or successor records.
  - Concept changes should preserve history instead of silently rewriting old links.
- **Concept Dimension Rules**:
  - Adding a new classification dimension is stronger than adding a normal Concept.
  - Example: adding an `interest` dimension after the knowledge base already contains politics, mathematics, sociology, and news concepts.
  - This should use a dedicated `ConceptDimensionProposal` shape:
    - define the new dimension;
    - define scope: global, project, note, or package;
    - define initial rules;
    - preview affected Concepts and NoteBlocks;
    - generate backfill candidates with confidence bands;
    - apply only approved historical links.
  - Dimension backfill should be batchable and reversible.
- **Proposal Types To Research Later**:
  - `ConceptCreationProposal`: create a new ordinary Concept or alias set.
  - `ConceptRefinementProposal`: rename, split, merge, deprecate, hide, or remap existing Concepts.
  - `ConceptDimensionProposal`: add or revise a classification dimension and optionally backfill history.
  - All should follow Coincides' existing proposal-first pattern: dry-run, impact report, apply, recovery record.
- **Embedding / Indexing Implications**:
  - NoteBlock embeddings should remain valuable, but Concept metadata can improve retrieval candidates before reranking.
  - Concept embeddings may also be useful:
    - concept label/aliases;
    - concept summary;
    - representative NoteBlocks;
    - dimension-specific descriptions.
  - A future retrieval score may combine:
    - text similarity;
    - keyword score;
    - concept match score;
    - concept dimension match;
    - relation distance;
    - role/template priority;
    - source confidence;
    - user interest or project scope.
- **Why It Matters**:
  - Concept is the bridge between ordinary note search and future GraphRAG.
  - It lets Coincides avoid both extremes:
    - a flat tag system that cannot support deep retrieval;
    - a huge always-on graph that becomes visually and computationally chaotic.
  - It supports the long-term goal: users can ask for all relevant knowledge around a topic across many notes, and Coincides can retrieve it through structured, explainable paths.

### PI-048: Source Reconstruction Toolchain Research For OCR / VLM / Web / AFFiNE Bridge

- **Status**: Open
- **Problem**:
  - Notion-style import experiments show that a handwritten image-only PDF can be reconstructed into typed text, LaTeX-like formula blocks, and preserved diagram/image crops.
  - This means a large part of "AI makes a useful note" begins before note writing: the source must first be reconstructed into trustworthy structured regions.
  - Coincides should not start by asking "how do we chunk this file?".
  - It should first ask:
    - what kind of source is this;
    - what extraction route fits this source;
    - which regions exist on the page or webpage;
    - which parts are text, formula, table, figure, code, handwritten annotation, decoration, advertisement, or navigation.
  - General VLMs may be expensive and intelligent, but they are not always better than specialized models for formula recognition, table extraction, OCR, layout detection, reading order, or webpage boilerplate removal.
- **Core Need**:
  - Build a source reconstruction research track covering:
    - pure text PDFs;
    - scanned / image-only PDFs;
    - mixed PDFs with text layer, figures, tables, and formulas;
    - handwritten STEM notes;
    - DOCX / PPTX / XLSX / Markdown / text files;
    - webpages and saved webpage snapshots;
    - image-only sources.
  - The preferred pipeline shape is:
    - upload source;
    - classify file/source type;
    - generate extraction plan;
    - run the right tool/model chain;
    - produce page/web regions;
    - attach confidence and provenance;
    - produce `SourceRegion` records or candidates;
    - convert selected regions into `NoteBlockCandidate` records;
    - assemble note/layout proposals.
  - Chunking should happen after source type detection and source reconstruction planning, not before.
- **Required `SourceRegion` Output Shape To Research**:
  - Each reconstructed region should eventually be able to record:
    - source id and snapshot id;
    - page index and visible page label, when applicable;
    - web DOM/path/URL position, when applicable;
    - bounding box or region geometry;
    - region kind: title, paragraph, formula, table, figure, chart, code, handwritten note, caption, header, footer, page number, ad, navigation, unknown;
    - reading order;
    - extracted text;
    - extracted LaTeX, when applicable;
    - table HTML/JSON, when applicable;
    - image crop / asset reference, when applicable;
    - confidence;
    - extraction tool/model provenance;
    - warnings and uncertain fields.
- **Candidate Tool Families To Research**:
  - General document reconstruction / document intelligence:
    - Docling;
    - MinerU;
    - PaddleOCR / PaddleOCR-VL;
    - Marker;
    - Unstructured.
  - OCR, layout, reading order, table recognition:
    - Surya;
    - PaddleOCR / PP-Structure;
    - pdfplumber / Camelot for deterministic PDF/table baselines;
    - GROBID for scholarly PDF metadata, references, and scientific document structure.
  - Handwriting / scanned document / VLM OCR:
    - olmOCR;
    - PaddleOCR-VL;
    - Nanonets docext / OCR models;
    - specialist VLM workflows.
  - Math formula recognition:
    - Pix2Text;
    - RapidLaTeXOCR / LaTeX-OCR family;
    - PaddleOCR-VL / MinerU formula recognition;
    - compare against commercial-quality references when useful.
  - Web extraction and evidence snapshot:
    - Mozilla Readability;
    - Trafilatura;
    - Defuddle;
    - SingleFile or similar full-page snapshot tools.
- **Research Goals**:
  - Evaluate each tool family by:
    - supported source types;
    - output format: Markdown, JSON, HTML, region schema, bbox, assets;
    - formula recognition quality;
    - table structure quality;
    - handwritten note quality;
    - figure/image crop preservation;
    - header/footer/page-number handling;
    - webpage ad/navigation removal;
    - ability to preserve source evidence and jump-back anchors;
    - Windows/local/Docker feasibility;
    - CPU/GPU requirements;
    - license and model-weight restrictions;
    - whether it can be used as a library, CLI, service, or sidecar worker;
    - whether it can be tested on Henry's local material set.
  - The evaluation should use real materials:
    - handwritten math notes;
    - typed PDF lecture notes;
    - mixed formula/diagram PDFs;
    - source web articles;
    - saved webpage snapshots;
    - DOCX/PPTX examples where available.
- **AFFiNE / BlockSuite Bridge Research**:
  - If Coincides later forks or adapts AFFiNE / BlockSuite, this source reconstruction layer still needs a clear owner.
  - Research must answer:
    - Can reconstructed source regions become AFFiNE blocks directly, or should they become Coincides-owned `NoteBlockCandidate` records first?
    - Can image crops, formula blocks, tables, and diagrams be inserted into AFFiNE while preserving Coincides `SourceAnchor` / `SourceRegion` provenance?
    - Can AFFiNE's editor/canvas data model store enough source evidence, or should evidence remain a Coincides sidecar layer?
    - How would source reconstruction proposals appear inside an adapted AFFiNE editor?
    - How can imported blocks remain editable while still keeping source trust, page labels, and recovery records?
    - Which parts of the pipeline should happen before AFFiNE insertion, and which should happen inside the editor/canvas runtime?
  - This bridge research is mandatory before deciding whether AFFiNE is only a UI/editor foundation or can participate in the source-to-note workflow.
- **Important Boundary**:
  - Source reconstruction is not the same as final note generation.
  - It may reconstruct a source faithfully into regions or editable blocks.
  - Note generation still decides what to keep, condense, cluster, rewrite, collapse, cite, and lay out.
  - A textbook, lecture note, research paper, webpage, and user-authored note may need different reconstruction and note-assembly strategies.
- **Why It Matters**:
  - Without source reconstruction, Coincides will keep asking reasoning models to compensate for weak extraction.
  - With source reconstruction, AI can reason over cleaner units, stronger evidence anchors, and explicit uncertainty.
  - This is the missing bridge between imported materials and serious NoteBlock generation.
  - It also affects whether an AFFiNE-based rebuild can preserve Coincides' source-grounded identity instead of becoming only a generic editor fork.

### PI-049: Microsoft GraphRAG Adoption Spike And Graph/RAG Sidecar Boundary

- **Status**: Open
- **Source**:
  - Added after PI-046 R15 Microsoft GraphRAG supplemental research.
- **Problem**:
  - Many Coincides goals overlap with GraphRAG-shaped needs: cross-note retrieval, local knowledge graph views, relation-aware AI context, concept discovery, report synthesis, and source-grounded query.
  - Microsoft GraphRAG may help with entity extraction, relationship discovery, community reports, and graph-powered query.
  - However, Microsoft GraphRAG is not a source reconstruction tool, not a note editor, not a NoteBlock runtime, and not Coincides' semantic truth store.
  - Its default relationship model is a generic entity-to-entity index edge, while Coincides needs finer semantic relations such as learning order, derivation, evidence support, source provenance, conditional/group relation, user-visible/hidden layers, and domain-specific relation packs.
- **Core Decision So Far**:
  - Coincides owns truth.
  - Microsoft GraphRAG may own a rebuildable graph/RAG index.
  - GraphRAG relationships should become `RelationCandidate` or index evidence, not confirmed `ObjectRelation`.
  - Confirmed `ObjectRelation` may later be exported into Microsoft GraphRAG through BYOG.
- **Recommended Adoption Ladder**:
  - Level 0: do not adopt.
  - Level 1: use as offline research tool.
  - Level 2: use as rebuildable sidecar index.
  - Level 3: use as Concept / Relation proposal assistant.
  - Level 4: use BYOG hybrid with Coincides confirmed Concept / ObjectRelation graph.
- **First Spike Recommendation**:
  - Use PI-046 pure text research reports, not handwritten PDFs or complex source materials.
  - Test whether GraphRAG can produce useful:
    - entities;
    - relationships;
    - community reports;
    - query contexts;
    - traceable references back to text units.
  - Compare outputs with Coincides concepts, ObjectRelation candidates, and stage summaries.
- **Important Boundary**:
  - PI-048 still owns source reconstruction:
    - OCR;
    - VLM;
    - formula recognition;
    - code parsing;
    - table extraction;
    - web extraction;
    - SourceRegion schema;
    - NoteBlockCandidate pipeline.
  - GraphRAG can consume PI-048 output later through a typed adapter:
    - `SourceRegion / NoteBlockCandidate -> GraphRAG Adapter payload`.
- **Relation Pack Need**:
  - Coincides likely needs domain-specific relation packs before GraphRAG output can safely become useful:
    - `learning.math`;
    - `research.intelligence`;
    - `code.analysis`;
    - `source.evidence`;
    - `writing.report`.
  - GraphRAG can suggest relationships, but Coincides must map them through the active relation pack before proposing an ObjectRelation.
- **Research Dependencies**:
  - `PI-046 Research/R15-1-microsoft-graphrag-framework-and-input-boundary.md`
  - `PI-046 Research/R15-2-noteblock-to-graphrag-adapter.md`
  - `PI-046 Research/R15-3-relationship-pack-and-objectrelation-boundary.md`
  - `PI-046 Research/R15-4-non-text-source-limitations-and-source-region-dependency.md`
  - `PI-046 Research/R15-5-byog-and-coincides-graph-index-architecture.md`
  - `PI-046 Research/R15-6-first-spike-and-adoption-decision.md`
  - `PI-046 Research/R15-summary-microsoft-graphrag-adoption-decision.md`
- **Open Questions**:
  - Can Microsoft GraphRAG reliably consume typed NoteBlock payloads without flattening Coincides semantics?
  - Can GraphRAG relationships be mapped into `RelationCandidate` without creating noisy relation clutter?
  - Does BYOG allow Coincides confirmed Concept / ObjectRelation graph to produce better community reports than raw extraction?
  - How should GraphRAG index staleness be detected after NoteBlocks or ObjectRelations change?
  - Should `.coincides` packages include GraphRAG index metadata, or only rebuild recipes?
  - What minimum score should the PI-046 text-report spike reach before GraphRAG enters product architecture?

### PI-050: Existing Notes Import And Condensed Raw Source Workflow

- **Status**: Open
- **Source**:
  - Added after the Better Notebook source-chain discussion and the Notion handwritten PDF import observation.
- **Formalized In**:
  - `PRODUCT.md`
  - `docs/PRD.md`
  - `docs/DATA_MODEL.md`
  - `docs/ARCHITECTURE.md`
  - `docs/Coincides-Better-Notebook-Roadmap.md`
  - `docs/brainstorm/BetterNoteBook Research/Better-Notebook-UX-Inventory-and-Interaction-Contract.md`
  - `docs/internal/Better-Notebook-Implementation-Reality-Check.md`
- **Core Reframe**:
  - `Raw Source` should mean any external material that has entered Coincides but has not yet become Coincides-owned internal truth.
  - `Raw Source` does not mean the material is low-quality or unprocessed.
  - A user's existing handwritten note, lecture note, Notion export, Markdown note, or already-condensed PDF is still a raw source from Coincides' perspective, but it is a special subtype:

```text
Raw Source
  Unprocessed Raw Source
    textbook / paper / webpage / long report / raw news pack

  Condensed Raw Source
    handwritten note / lecture note / existing study note / agent briefing / user draft report

  Archive Raw Source
    stored attachment / reference material / future processing candidate
```

- **Why This Matters**:
  - Earlier source planning focused mostly on unprocessed materials:
    - upload a textbook, paper, report, or webpage;
    - extract useful material;
    - condense, dedupe, cite, and lay it out as a new note/report.
  - Existing notes need a different contract.
  - They are already human-processed or agent-processed information.
  - Their layout, order, diagrams, formula placement, margin marks, and grouping may already encode understanding.
  - Coincides should not treat them as disposable raw text to summarize away.
- **Primary User Goals**:
  - **Archive**:
    - collect scattered notes from iPad, PDF, Notion, Word, Markdown, images, screenshots, or handwritten scans into Coincides.
  - **Reconstruct as editable objects**:
    - convert the note into text blocks, formula blocks, image blocks, diagram crops, structured blocks, and layout placements.
  - **Preserve original layout when useful**:
    - preserve reading order, diagram adjacency, centered formulas, arrows, annotations, and visual grouping where they matter.
  - **Make the note AI-readable**:
    - handwritten/image-only notes should become searchable, embeddable, source-referenceable, relation-linkable, and reusable by later AI workflows.
  - **Allow continued processing**:
    - users can edit, rearrange, add sources, add relations, convert freeform blocks to structured blocks, and merge the imported note into larger reports.
  - **Align with other sources**:
    - users may upload their own notes and a textbook together, then ask Coincides to connect note concepts to textbook sections, pages, proofs, formulas, or examples.
  - **Build relations inside the note itself**:
    - even without a textbook, users may want Coincides to find derivation, prerequisite, example, support, conflict, timeline, or interpretation relations inside the condensed source.
  - **Merge multiple condensed sources over time**:
    - weekly notes may later become a semester note, exam review note, project briefing, or master report.
- **Learning Scenario**:
  - A student attends class and writes handwritten notes.
  - They upload the handwritten note and possibly the textbook.
  - Their goals may include:
    - preserve their own note;
    - OCR ordinary text;
    - convert formulas to LaTeX;
    - crop diagrams;
    - find the textbook pages behind each idea;
    - reveal missing conditions or skipped explanations;
    - build `derived_to`, `read_before`, `example_of`, and `source_supports` relations;
    - combine week 1, week 2, and later weekly notes into a semester-level study note.
  - This reverses the usual pipeline:

```text
textbook -> generate note
```

  - It also supports:

```text
my note -> align with textbook -> deepen understanding
```

- **News / Intelligence Scenario**:
  - A user or external agent gathers many reports about one event.
  - Sources may include:
    - news articles;
    - official statements;
    - social posts;
    - screenshots;
    - agent-generated briefings;
    - the user's own handwritten or typed field notes.
  - User goals may include:
    - reconstruct and preserve the agent/user notes;
    - compare sources;
    - build a timeline;
    - mark conflicting claims;
    - distinguish reported fact, interpretation, uncertainty, and opinion;
    - connect notes to original reports;
    - produce a traceable briefing or research report.
  - In this scenario, a condensed source may be an intermediate analysis artifact, not just evidence.
- **Reasoning / Investigation Scenario**:
  - A user may upload evidence, witness statements, reasoning notes, timelines, and diagrams.
  - User goals may include:
    - track evidence chains;
    - manage hypotheses;
    - support abductive reasoning, deductive reasoning, and constraint reasoning;
    - identify contradictions or impossible timelines;
    - record what is known, unknown, inferred, suspected, and disproven;
    - preserve the user's reasoning trace.
  - Condensed source may represent `Reasoning State`, not only source evidence.
- **Three Kinds Of Information Coincides Must Eventually Distinguish**:

```text
Evidence
  External factual basis.

Interpretation
  Human or AI explanation, summary, judgment, or condensed understanding.

Reasoning State
  Current hypotheses, assumptions, uncertainty, constraints, missing facts, and inference paths.
```

- **Product Implication**:
  - Coincides is not only a tool for turning unprocessed sources into notes.
  - It is also a place where existing human or AI knowledge artifacts can enter, become editable, become source-aware, and continue evolving.
  - This supports the deeper product position:

```text
Coincides helps users bring evidence, interpretation, and reasoning state
into one editable, traceable, relation-aware understanding system.
```

- **Required Future Design Concepts**:
  - `ImportMode`:
    - `evidence_source`;
    - `reconstruct_existing_note`;
    - `archive_only`;
    - possibly `agent_briefing` or `reasoning_trace` later.
  - `SourceKind` / `SourceIntent`:
    - unprocessed evidence;
    - condensed note;
    - agent briefing;
    - human interpretation note;
    - draft report;
    - final report;
    - reasoning trace.
  - `ReconstructionPlan`:
    - OCR text;
    - formula recognition;
    - diagram crop;
    - layout preservation;
    - structured block candidate extraction;
    - relation candidate extraction;
    - source alignment with other uploaded materials.
  - `CondensedSourceAlignment`:
    - aligns imported notes with textbook/report/web sources in the same Project/Course.
  - `CondensedSourceMergeProposal`:
    - merges weekly notes or related condensed sources into a larger note/report without silently rewriting originals.
- **Boundary With PI-048**:
  - PI-048 owns the source reconstruction toolchain:
    - OCR;
    - VLM;
    - formula recognition;
    - layout extraction;
    - image crops;
    - `SourceRegion`;
    - `NoteBlockCandidate`.
  - PI-050 adds product intent:
    - not every reconstructed source should be summarized;
    - existing notes often need reconstruction, preservation, alignment, relation building, and merge workflows.
- **Boundary With Source Chain / Provenance**:
  - A condensed source can become a source root.
  - A reconstructed NoteBlock can still cite the original condensed source region.
  - If the condensed source is aligned with a textbook, the block may carry both:
    - direct source: the user's imported note;
    - root/evidence source: textbook page or section.
  - Source provenance should not collapse user interpretation into external evidence.
- **Boundary With ObjectRelation**:
  - Relations discovered inside a condensed source should begin as candidates or proposals.
  - Coincides should distinguish:
    - relation explicitly written/drawn by the user in the original note;
    - relation inferred from reconstructed content;
    - relation created later by the user inside Coincides.
  - A diagram arrow in a handwritten note may become a visual clue, not automatically a confirmed `ObjectRelation`.
- **Open Questions**:
  - How should Coincides ask the user what an uploaded file is intended to be: evidence source, existing note, archive, briefing, draft report, or reasoning trace?
  - Should `Condensed Raw Source` be a source subtype, an import mode, or both?
  - How much original layout should be preserved by default?
  - Should a reconstructed existing note be editable immediately, or first appear as a proposal preview?
  - How should weekly notes be merged without losing weekly provenance?
  - How should Coincides show that a block came from the user's note but is grounded in a textbook page?
  - How should relation candidates extracted from a user's own note differ from relation candidates inferred by AI?
  - Should imported human notes receive higher trust than AI-generated briefings?
  - How should Coincides mark claims that are interpretation rather than evidence?
  - When should an imported note become a `SourceArtifact` that can itself be cited by later notes?

### PI-051: Canvas Page Frame And Repagination Proposal

- **Status**: Open
- **Source**:
  - Added after the Better Notebook V2.BN.6 canvas/page/scratch model discussion.
- **Problem**:
  - Coincides previously treated page mode, canvas mode, and scratch/workspace as if they could become three separate concepts.
  - The cleaner model is that a Note owns an underlying canvas, while a Page is a fixed exportable frame inside that canvas.
  - Scratch / Workspace content is the area outside the Page frame on the same canvas, not a separate document type.
- **Canonical Product Language**:
  - `Canvas`:
    - the underlying spatial workspace for a Note.
    - eventually may be infinite / edgeless.
  - `PageFrame`:
    - a fixed exportable region inside the canvas.
    - page size such as A4 / A3 / A2 / A1 refers to the frame size, not the canvas size.
  - `FrameOutsideWorkspace` / `ScratchArea`:
    - the canvas area outside the PageFrame.
    - used for scratch work, derivation, temporary layout, drawings, exploratory notes, and canvas-first reasoning.
- **Page-First Note**:
  - Starts with a PageFrame as the primary working area.
  - Best for PDF/image export, sharing, formal reading, and report-like notes.
  - The surrounding canvas remains available for scratch/workspace content.
- **Canvas-First Note**:
  - Starts from the open canvas as the primary working area.
  - Best for spatial understanding, relation exploration, large layouts, presentation-style navigation, and non-linear learning/research.
  - First version should not promise normal PDF export for a canvas-first note.
- **Important Conversion Rule**:
  - Canvas/page preset switching should not be a direct toggle.
  - If the user wants to move from Infinite Canvas to A4 Page, A4 to A2, or another preset, the safer model is:
    1. duplicate the note or create a target note/canvas;
    2. copy selected NoteBlocks, SourceReferences, ObjectRelations, and relevant layout metadata;
    3. generate an AI-assisted repagination / relayout proposal;
    4. let the user review and apply the proposal.
- **Why It Matters**:
  - A canvas-first note may contain hundreds of blocks placed in all directions.
  - Forcing those blocks into an A4 frame as a simple mode switch would destroy user intent.
  - A proposal-first repagination flow preserves data, makes layout migration reversible, and keeps user judgment in control.
- **Likely Roadmap Impact**:
  - V2.BN.6 should define the contract language: `Canvas`, `PageFrame`, `FrameOutsideWorkspace`, page preset, canvas-first, page-first.
  - V2.BN.8 / Editor Runtime / Canvas Engine Spike Gate should validate whether the chosen editor runtime can support this model.
  - AI-assisted repagination proposal belongs after the Better Notebook human-writing foundation is stable, not in the current Better Notebook core slice.
- **Open Questions**:
  - Which page presets should be offered first: A4 only, A4 + Letter, or a small set of common print/presentation frames?
  - Should canvas-first notes support region export, frame export, screenshot export, or presentation path export before PDF export?
  - How should users select which objects are copied into a target repagination proposal?
  - Should source references and object relations be copied by default, or selected per migration proposal?
  - How much should AI be allowed to rearrange block order, grouping, relation lines, and scratch content during repagination?

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
12. Should the empty Note editor persist placeholder blocks immediately, or only after the user enters content?
13. Should blank-note writing happen in a page editor first, then project into Canvas, or should the Canvas itself provide the primary click-to-type surface?
14. What is the default relationship type when a user manually links a block to a source: cite, support, inspiration, or provenance?
15. Should source linking be direct mutation, or should high-confidence AI-suggested links use a proposal-first review flow?
16. Should page-locked canvas behave like a block-flow editor while open canvas behaves like a spatial workspace?
17. Can Coincides make one surface support both Notion-like writing and canvas-style reasoning without reintroducing a confusing dual-mode document model?
18. Should double-click insertion use collision-aware row/lane selection from the first version, or start simpler with insertion preview only?
19. Should indentation controls live in a selected-block inspector, a floating mini-ruler, or template style settings?
20. Which mature document-canvas products should become required references before implementing collision-aware editing?
21. Which behaviors should Coincides borrow as interaction patterns while rejecting their data model as the source of truth?
22. Should rich text be stored as markdown, structured block content JSON, editor JSON, or template field data?
23. Should canvas connector routing be handled by an external canvas/diagram engine, or by Coincides-owned edge rendering?
24. Which relation styles should be semantic defaults, and which should be user visual preferences?
25. What is the maximum number of pages/blocks/edges a normal canvas view should try to render at once?
26. Should long-distance relations render as lines, badges, minimap links, relation panel entries, or extracted graph views?
27. Which performance limits should be part of the product design before AI can generate very long notes?
28. Should multiple semantic relations between the same objects be stored as multiple ObjectRelations, or one relation with multiple labels?
29. What is the minimum relation dimension model needed before v3.x graph-native migration?
30. Should conditional relations become relation metadata in v2.x and graph nodes/hyperedges in v3.x?
31. Does Coincides need first-class Concept/Topic nodes before AI topic-specific note generation can become reliable?
32. What should be the standard AI-readable subgraph payload shape?
33. How should relation traversal depth and layer filters be controlled for focused AI retrieval?
34. What local graph filters should be available without AI from day one?
35. Should the local knowledge graph view be a side panel, a second-layer canvas view, or a separate graph page?
36. Should source layout regions be first-class source objects before they can become NoteBlocks?
37. Which source region types are worth extracting first: headings, formulas, code, tables, figures, or captions?
38. Should document reconstruction be a separate mode from AI note generation?
39. What is the safe maximum scope for automatic document-to-block reconstruction before requiring page/section batching?
40. Should imported source documents be editable overlays over source snapshots, or fully converted into NoteBlocks?
41. What is the first page-aware query API shape for "where does this concept appear"?
42. Should page assignment be derived from CanvasNode coordinates, stored as explicit page index, or both?
43. How should AI distinguish source page number from generated-note page number?
44. How should Coincides store visible page labels that differ from internal page indexes?
45. Should AI answers include both visible page label and internal/generated page index?
46. How should page numbering sections be represented for cover/front matter/main content?
47. What are the first block-fusion rules needed for document reconstruction?
48. Should repeated headers/footers/page numbers become PageDecoration rules, SourceRegions, or both?
49. Should Template/Style Studio ship as an optional plugin, bundled advanced module, or separate companion app?
50. What style editing capabilities are required before users can make their own block and edge visual variants?
51. How much app-level theming should be exposed to users without making the product visually chaotic?
52. Should image assets be treated as theme resources, canvas resources, package resources, or all three?
53. Which appearance controls are worth supporting first: background, colors, borders, scrollbars, buttons, or block frames?
54. Which navigation items belong in the default app shell, and which should be optional modules?
55. Should Calendar / Goals / TimeBlocks remain first-class, become course-only, or move to an optional planning module?
56. What is the cleanest workflow for "turn selected material into a study plan and calendar schedule" without cluttering non-learning projects?
57. How should Coincides distinguish formal page content from outside-page workspace objects?
58. Which page modes are required first: locked single page, open canvas, multi-page grid, or seamless page stack?
59. How should page-break guides behave when objects cross export boundaries?
60. Should Favorites start with note-level shortcuts, or support projects/canvases/source boards/templates from the first version?
61. Should favorite notes restore their last view mode or open in a default reading/canvas mode?
62. What is the canonical input taxonomy for Coincides after v2.5?
63. What is the canonical output taxonomy: human exports, project files, AI context, package artifacts, and recovery records?
64. Which current components are mature, usable-but-rough, foundation-only, or only conceptual?
65. What should be stored in ordinary SQL, what should become graph-native, and what should remain a rebuildable index?
66. What is the first practical Graph RAG pipeline for Coincides?
67. What is the complete command inventory before the UX rebuild?
68. Which commands deserve visible buttons, and which should be hover/right-click/inspector/Agent actions?
69. Which actions are safe direct actions, and which must remain proposal-first?
70. Which current SQLite tables should stay relational in v3.x, and which should become graph-native?
71. Which current records are durable knowledge truth, projection/cache state, operation history, or rebuildable indexes?
72. Should Neo4j become the primary knowledge store, a graph index beside SQL, or a hybrid truth layer?
73. What is the first practical `NoteAssemblyPlan` proposal shape?
74. How should Coincides classify uploaded materials by learning/workflow intent before generating notes?
75. What are the minimum strategies for textbook, lecture note, paper, problem set, source archive, code document, and user note inputs?
76. Which parts of note generation should be filter/condense/rewrite/re-layout/reconstruct instead of one generic summarize action?
77. How should AI decide that existing template variants are insufficient for a new domain?
78. Should new template/domain suggestions be direct drafts, proposal-first changes, or package-level recommendations?
79. What display metadata should NoteBlocks carry for collapse, detail level, importance, source grounding, and export policy?
80. How should source-grounded AI blocks, user-authored blocks, and AI-condensed source blocks differ in UI and retrieval?
81. How should large textbook-to-note generation be batched so the user can review chapter plans before block creation?
82. Which note assembly outputs should be graph-native evidence later, and which are only proposal/history records?
83. What is the minimum template classification schema needed before AI can reliably choose templates?
84. Should template domain/subdomain/material-use tags be free tags, controlled vocabulary, hierarchy, or hybrid?
85. How should broad-domain templates and narrow-domain templates compete during selection?
86. What is the safe fallback order when no classified template matches a content role?
87. How should Template Studio expose template classification without becoming too complex for normal use?
88. Should Template Selection Engine produce a visible template-use plan before generating blocks?
89. What is the minimum `ContentRoleSegmentation` contract before knowledge-level reconciliation?
90. Which content roles should be built into the default learning pipeline, and which should be domain-defined?
91. How should role-aware reconciliation differ for definition, formula, theorem, proof, example, exercise, paragraph, and source quote?
92. Should example deduplication produce clusters instead of single kept examples?
93. How should incomplete or lower-quality theorem/proof notes be preserved as supporting evidence instead of deleted?
94. How much of content role detection can be rule-based before AI assistance is needed?
95. What should be included in the first full Coincides Developer Tools inventory?
96. Which extension points are safe for normal users, advanced users, developers, and fork-level maintainers?
97. How should dangerous styling or display behavior extensions be made traceable and recoverable?
98. Should role definitions be packaged with domain packages, template packages, or their own role packages?
99. How should Agent Guidance Studio teach AI how to use custom roles, templates, and behaviors?
100. Which low-level extension hooks should remain unsupported even if the project is open source?
101. What is the exact Coincides core object model before comparing it with AFFiNE / BlockSuite?
102. Which Coincides objects must remain canonical even if a mature editor/runtime is adopted?
103. Can AFFiNE's normal page editor support freeform block-box editing without turning everything into edgeless canvas?
104. Can AFFiNE / BlockSuite support direct page typing plus a layout/edit view where blocks become resizable and movable boxes?
105. Can AFFiNE / BlockSuite support spatial click-to-type insertion into empty page regions beside existing narrowed blocks?
106. Should Coincides prefer full AFFiNE fork, BlockSuite-first integration, or UX reference only?
107. Can source-grounded NoteBlocks and ObjectRelations live as sidecar data beside AFFiNE blocks?
108. What is the minimum graph model needed for knowledge-point association before adopting a graph database?
109. Which knowledge-point features require graph-shaped data but not necessarily a graph database?
110. Which graph queries would make Neo4j or another graph database clearly worth the migration cost?
111. How should graph-shaped semantic data connect to page/canvas editing data?
112. What is the minimum Concept object model before cross-note retrieval becomes useful?
113. Should Concept links attach first to NoteBlocks only, or also to Notes, Sources, SourceScopes, Domains, and Templates?
114. What Concept dimensions are needed first: domain, method, event, geography, material type, user interest, or source type?
115. How should ConceptCreationProposal, ConceptRefinementProposal, and ConceptDimensionProposal differ?
116. What is the safest rule for Concept deprecation, merge, split, and successor mapping?
117. How should Concept backfill preview classify high-confidence, medium-confidence, and low-confidence historical matches?
118. Which Concept fields should be embedded, and which should remain structured filters?
119. How should Concept match score, embedding similarity, ObjectRelation distance, and source confidence combine during retrieval?
120. When should a local Concept graph view become a saved Graph View?
121. What is the first practical Concept-aware GraphRAG payload shape for AI?
122. What is the minimum source type detection contract before chunking begins?
123. Which source types need separate extraction plans: pure text PDF, scanned PDF, mixed PDF, DOCX, PPTX, webpage, saved webpage snapshot, image, Markdown, and plain text?
124. What is the first canonical `SourceRegion` schema that can represent PDF pages, images, and webpages without overfitting to one tool?
125. Which open-source document intelligence tools should become required benchmarks: Docling, MinerU, PaddleOCR, Marker, Surya, olmOCR, Pix2Text, Unstructured, GROBID, Readability, Trafilatura, Defuddle, and SingleFile?
126. Which tools provide region coordinates, reading order, page labels, asset crops, formulas, tables, and confidence scores in a form Coincides can trust?
127. Which tools are realistic on local Windows, Docker, CPU-only, GPU, or remote sidecar service setups?
128. How should Coincides preserve image crops, formula crops, and original source evidence after extraction?
129. How should Coincides compare Notion-like handwritten import quality against open-source toolchains?
130. Should source reconstruction produce final NoteBlocks, `NoteBlockCandidate` records, or proposal-first reconstruction plans?
131. If AFFiNE / BlockSuite is adapted, which layer owns reconstructed regions: AFFiNE blocks, Coincides NoteBlocks, or a Coincides sidecar?
132. How should source anchors and source trust survive when reconstructed blocks are edited inside an AFFiNE-like editor?
133. Which parts of source reconstruction should happen before editor insertion, and which parts should remain interactive inside the editor/canvas?

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
Blank Note / Click-To-Type Writing Experience
Manual Block -> Source Linking Flow
Canvas Document Flow / Page-Locked Writing Mode
Collision-Aware Text Insertion
Block-Level Formatting / Indentation Controls
Document-Canvas Interaction Research
Rich Text / Inline Formatting Plan
Canvas Edge Routing And Style Polish
Large Canvas Performance / Virtualization Strategy
Relation Semantics / Conditional Relation Model Research
AI-Readable Subgraph Retrieval Research
Deterministic Local Knowledge Graph View
Layout-Aware Source Parsing / Source Region Extraction
Document Reconstruction / Source-To-Editable-Blocks Workflow
Page-Aware Content / Projection Query Layer
Page Numbering / Page Label Model
Block Fusion / Repeated Decoration Detection
Template / Style Studio Plugin Architecture
Theme / Asset / Appearance Editing Strategy
Minimal Default App Shell / Workspace UX
Calendar / Goals / Planning Module Boundary Review
Page Canvas Modes / Outside-Page Workspace Model
Canvas PageFrame / Frame-Outside Workspace Model
Canvas Preset Repagination Proposal
Favorites / Quick Access Navigation
Input / Output / Retrieval Architecture Audit
Current Capability Maturity Map
Hybrid SQL + Vector + Graph RAG Architecture Research
Interaction Inventory / Command Surface Audit
SQLite-To-Graph Boundary Audit
Note Assembly Plan / Study Note Generation Strategy
Material Intent Classification
Content Role Segmentation
Candidate Knowledge Unit Extraction
Role-Aware Knowledge Reconciliation
Source-Grounded NoteBlock Extraction
Template Classification System
Template Selection Engine
Coincides Developer Tools / Studio Inventory
Role Studio / Domain Role Definition
Behavior Preset Studio
Visual Style Studio
Agent Guidance Studio
Template Variant Suggestion Workflow
Layered Note Presentation / Collapse Policy
Coincides Core Object Model Self-Inventory
AFFiNE / BlockSuite Adoption Feasibility Review
Page Editor Freeform Block-Box Layout Research
Spatial Click-To-Type / Collision-Aware Block Insertion Research
Graph Model Before Graph Database Research
Evolvable Concept Layer / Concept Dimension Research
Concept Refinement Proposal / Dimension Backfill Workflow
Concept-Aware Embedding And Retrieval Strategy
Concept + ObjectRelation GraphRAG Payload Design
Source Reconstruction Toolchain Research
Existing Notes Import / Condensed Raw Source Workflow
Import Mode: Evidence Source / Reconstruct Existing Note / Archive Only
Condensed Source Alignment With Textbook Or Raw Sources
Weekly Notes To Semester Note Merge Workflow
Evidence / Interpretation / Reasoning State Classification
Human Note / Agent Briefing / Draft Report As SourceKind
Source Chain / Provenance Library
External Source Root And SourceVersion Model
Internal Note / Report / NoteBlock As Derived Source
Source-First Global Source Library
Direct Source / Root Source / Full Source Chain UX
Cross-Project Source Usage And Used-Via-Citation Display
Source Delete / Tombstone / Broken-Degraded Chain UX
/add source Command And Source Picker
Batch Source Attach / Remove / Clear Operations
Future Source Migration Proposal
Internal Link / Navigation Link Boundary
Link vs SourceReference vs ObjectRelation
Structured NoteBlock Field Schema
Structured Field Layout / Render Template
Slash Create Or Convert Structured Block
Paragraph To Structured Block Conversion
Graph Node Label From Structured Fields
Template-Controlled Field Schema With User-Controlled Field Layout
OCR / VLM / Math Recognition Tool Matrix
Source Type Detection Before Chunking
Canonical SourceRegion Schema
Handwritten STEM Note Reconstruction Evaluation
Web Snapshot Extraction And Evidence Preservation
AFFiNE Source Reconstruction Bridge Research
External Agent Interface Research
Real AI + Real Materials End-to-End Evaluation
```

The exact version numbers are intentionally not locked here.
