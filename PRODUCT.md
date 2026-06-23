# Product

## Register

product

## Users

Coincides is for people who want to use AI tools to support learning, research, and material organization.

Primary users include:

- students who need to turn course material, lecture notes, textbooks, papers, examples, and practice problems into readable study notes;
- independent learners who want AI to help organize unfamiliar material without losing source traceability;
- researchers and builders who collect many reports, documents, web pages, code files, PDFs, notes, and AI outputs, then need to turn them into human-readable notes or reports;
- people who want deep human-AI collaboration, where AI can help process information, but humans still review, edit, arrange, and decide what the final notebook or report means.

The first real user is Henry. The product should be optimized for serious self-use before it tries to become broadly marketable.

## Product Purpose

Coincides is a refined information-processing notebook. Its job is to help humans and AI turn selected materials into readable, editable, source-aware notes and reports.

The product exists because AI can produce and process more information than a human can comfortably read in a chat window. A long conversation, a stack of research reports, a textbook chapter, or a group of source files can quickly become too much for linear reading. Coincides gives that information a better human surface: structured blocks, free layout, source grounding, relation awareness, and report-like presentation.

Because Coincides is an information-processing center, traceability is central to the product. Notes and reports created inside Coincides should preserve a clear path back to the uploaded documents, source snapshots, source ranges, pages, anchors, or other source objects that supported them. The user should be able to read a refined note, inspect where a claim or block came from, and return to the original material when needed.

Coincides is not trying to be a raw file vault or a low-level RAG database. It is the place where selected information is refined. A user may bring in several sources, ask AI to organize them into a note, review the generated structure, adjust layout, inspect evidence, refine relations, and continue working with both human judgment and AI assistance.

The primary purpose is organization: turning selected material into structured, readable, source-aware notes and reports. A secondary purpose is question answering: helping users ask targeted questions about specific NoteBlocks, source-backed claims, relations, or sections after the material has already been organized. Question answering should grow from the organized notebook surface, not replace it with a generic chat experience.

Notebook and report are treated as related forms:

- A note is freer, more exploratory, and closer to ongoing thinking.
- A report is more refined, more structured, more source-conscious, and more shareable.
- The difference is mainly rigor, granularity, layout, length, and level of detail.

The long-term purpose is to become a high-density, high-precision information service center for human-AI collaboration. Humans should be able to read and understand the refined output. External AI agents should also be able to call, inspect, and reuse the organized results through controlled interfaces.

## 2026-06-20 Better Notebook Doctrine

The current Better Notebook direction is `TextFlow-first / ContentGroup-aware`, not block-first and not annotation-first.

The stable product stack is:

```text
Raw Source
  original evidence truth

TextFlow
  Coincides-owned content truth for natural writing

Label / AnnotationTruth
  visual marker and reusable range package

ContentGroup
  serious content package assembled from ranges, labels, blocks, media regions, source regions, or other traceable members

Petal
  local role inside one ContentGroup

GroupFolder
  resource manager, browsing path, and future relation-view boundary for ContentGroups

Relation
  later logical relationship between accepted/refined content packages or their local parts
```

This keeps the user experience natural. In normal writing mode, the user should see a note, not an engineering structure. In organizing mode, the user should feel like they are collecting useful fragments into named boxes. In deep editing mode, a single ContentGroup can be refined into Petals without moving or damaging the original text.

Labels remain useful, but they are not the final knowledge object. A label is a visible mark and a convenient way to package one or more ranges. A ContentGroup is the stronger organizing object. Petals describe the local structure inside a ContentGroup. GroupFolders decide where ContentGroups live and what scope a Gallery or future local graph should browse.

## Core Product Commitments

User-facing language should prefer `Project` as the main container name. A project may be a course, a research package, a report workspace, a case file, or another focused collection of material. Internal implementation names such as `course_id` may remain as engineering details, but the product surface should not force every workflow to feel like school coursework.

Coincides should separate the formal document layer from the thinking layer. The formal layer is what becomes a note, report, export, or shareable reading surface. The thinking layer includes sticky notes, remarks, scratch work, temporary reasoning, and page-outside canvas objects. These objects may still be useful to the user and AI, but they should not silently pollute the formal document structure or default export.

The clean product model is canvas-backed rather than three separate surfaces. A Note owns an underlying infinite canvas/workspace. A Page is a fixed exportable frame inside that canvas, with a realistic page size such as A4 only describing the frame, not the whole canvas. Scratch / Workspace content is the area outside the Page frame on the same canvas, not a third independent document type.

Coincides is text-first, annotation-aware, and canvas-capable. The default writing path should let the user write naturally inside TextBlocks. TextFlow quietly keeps the writing organized into TextUnits, writing roles, inline render anchors, and range helpers. AnnotationTruth records durable labels after the user or an accepted AI proposal marks a range. Canvas organizes where visual objects live. GroupFolder organizes where serious content packages are browsed, collected, and used as local graph boundaries. ContentGroups explain which pieces deserve serious AI/user interpretation, and accepted status lives on the ContentGroup itself rather than in a second object.

User-authored blocks do not need to start with source references. A user may create an original thought, summary, side note, or explanation first, then later attach one source, multiple sources, a page, a range, or a more precise anchor. Source grounding should be easy to add, inspect, and revise without making manual writing feel bureaucratic.

Canvas behavior should support two broad modes. A Page-first note gives the user a stable Page frame for writing, export, sharing, and formal reading while still keeping an outside-canvas workspace for scratch thinking. A Canvas-first note lets the user start directly from the open infinite workspace for non-linear understanding, presentation, relation exploration, and large spatial layouts. AI-generated formal notes should respect the selected Page frame unless the user asks for exploratory canvas work.

Relations are semantic structures, not merely visible lines. A line may be useful at close range, especially inside one page or local graph view, but the durable value is that blocks can have inspectable, queryable, filterable relationships. Relations should support local graph exploration, AI reading, and user correction without requiring every relation to appear as a permanent visual edge.

Source reconstruction is part of the product identity. Before source material becomes useful note content, Coincides should detect source type, recover meaningful regions, preserve page labels and provenance, and distinguish text, formulas, tables, diagrams, handwriting, code, and decorative page elements where possible. Chunking should come after source reconstruction planning, not before it.

Raw source should mean any external material that has entered Coincides but has not yet become Coincides-owned internal truth. It does not mean the material is low-quality. Coincides should distinguish at least:

```text
Unprocessed Raw Source
  textbook / paper / webpage / long report / raw news pack

Condensed Raw Source
  handwritten note / lecture note / existing study note / agent briefing / user draft report

Archive Raw Source
  stored attachment / reference material / future processing candidate
```

Existing notes and condensed sources are important inputs. A handwritten note, lecture note, Notion export, Markdown note, or agent briefing may already contain condensed human or AI work. The default goal is not to summarize it away, but to reconstruct, preserve, structure, align, relate, and make it editable and AI-readable.

Condensed sources may contain three different kinds of information:

```text
Evidence
  External factual basis.

Interpretation
  Human or AI explanation, summary, judgment, or condensed understanding.

Reasoning State
  Current hypotheses, assumptions, uncertainty, constraints, missing facts, and inference paths.
```

Coincides should preserve this distinction. A user's imported note may be a source root, an interpretation artifact, a reasoning trace, or a later source for another note.

## Brand Personality

Coincides should feel:

- quiet;
- reliable;
- clear;
- simple;
- intuitive;
- serious without feeling cold;
- powerful without looking noisy.

The interface should feel like a focused research notebook, not a dashboard full of machinery. It should give the user confidence that information is organized, recoverable, traceable, and ready for continued thinking.

## Anti-references

Coincides should not feel like:

- an engineering admin panel;
- a pile of database cards;
- a noisy whiteboard toy;
- a pure chat box;
- a low-end RAG file search tool;
- a generic AI tutor;
- a raw Obsidian replacement;
- a Notion clone;
- an AFFiNE clone;
- a canvas where users must manually fight every object into position;
- a product where source, relation, template, and debug metadata constantly interrupt reading.

Coincides may learn from Notion, AFFiNE, Word, FigJam, tldraw, Obsidian, and other tools, but it should not copy their product identity or surrender its own data model.

## Design Principles

### 1. Click First, Then Write

A blank note should invite writing. The user should be able to click a page and start typing without first choosing a template, opening an engineering panel, or understanding the underlying object model.

### 2. Human Reading Comes First

The product should make dense information easier for humans to read, understand, compare, and continue working with. AI output is only useful when it lands in a human-readable form.

### 3. Structure Should Appear When Needed

Source references, relations, templates, concepts, operation history, and debug metadata are important, but they should not dominate the reading surface. They should appear through badges, hover states, selected-object controls, inspectors, local graph views, search, export preview, and debug mode.

Free writing and structured meaning should coexist, but the system should not force every meaningful piece to become a separate block or every mark to become a serious content package. A user may write a long natural TextBlock first. Later, parts of that writing can be located as ContentRanges, marked with lightweight labels, packaged into ContentGroups, organized through GroupFolders, accepted or rejected through ContentGroup identity/status, connected to sources, or used as future relation endpoints without breaking the paragraph apart. Independent NoteBlocks should be used when the user needs spatial layout, media, special rendering, large display formulas, code regions, tables, sticky notes, source snapshots, or other object-level behavior.

First-version structured conversion should stay conservative. Converting text into a FormulaBlock should place the current text into `latex_input`. Definition-like meaning should be created through annotation workflow and should preserve the selected text instead of pretending the system knows `concept_name` or `description` unless the user or a later AI proposal confirms it. Coincides should not use brittle punctuation rules, such as colon splitting, to pretend it understands semantic fields. AI-assisted semantic conversion belongs later as a reviewable proposal, not as silent deterministic rewriting.

The preferred long-term content stack is:

```text
TextBlock
  Natural writing container.

TextUnit
  Internal semantic writing unit: paragraph, heading, list item, quote line, todo item, toggle item.

InlineStructure
  Special render / interaction anchor inside TextFlow: inline formula, inline code, inline link, inline source marker.

TextUnitGroup
  Writing-layer range helper for grouped TextUnits.

AnnotationTruth
  Durable label / marker over text, block, media, source, or canvas ranges.

ContentRange
  Stable location inside TextFlow, source, or future canvas/media objects.

GroupFolder
  Organization path and browsing boundary for ContentGroups. Project and Note can own system root GroupFolders, while user/AI folders can collect groups across notes or projects without moving source truth.

ContentGroup
  Serious content package made from one or more ranges; candidate for AI/user interpretation.

ContentGroup accepted identity
  Accepted / reviewed state of a ContentGroup. This is not a separate object or table.

ContentGroup Gallery / derived group views
  User-facing folder/gallery view over ContentGroups, plus derived lists such as all definitions, all examples, all doubts, or all source-backed claims.
```

Block template work should therefore narrow into two clearer roles: special object blocks and block shells. FormulaBlock, CodeBlock, ImageBlock, TableBlock, StickyNote, SourceSnapshotBlock, video or 3D preview blocks still matter because they provide display, media, interaction, and spatial behavior. They should not be mistaken for the only way to represent knowledge structure. Definition, theorem, example, claim, evidence, step, and similar ideas should normally become annotation labels or AI reading proposals, not default block families.

Navigation, evidence, and semantic meaning are separate concerns:

```text
Link = navigation
SourceReference = provenance / evidence
ObjectRelation = semantic relation
```

A clickable internal link only means "go there." It does not automatically mean the linked object is evidence. A source reference means "this content is grounded in that source." An object relation means "these objects have a semantic relationship." One block may carry all three, but the UI and data model should not collapse them.

### 4. Content And Layout Are Separate

TextFlow is content truth. ContentRange is location truth. AnnotationTruth is label / marker truth. GroupFolder is organization/path truth for ContentGroup browsing and local relation-view boundaries. ContentGroup carries the serious package / interpretation path, including its accepted/rejected identity state. Source references and special object payloads remain separate evidence and media truth. `NoteBlock` is the canvas/page object that carries or presents content. `BlockBox`, `CanvasNode`, or placement state is layout truth. Moving, resizing, aligning, and arranging objects should not rewrite the underlying TextFlow, annotations, GroupFolders, ContentGroups, special object payload, evidence, or source chain.

### 5. Source Grounding Must Stay Inspectable

Coincides should preserve where information came from. A user should be able to connect blocks to sources, inspect provenance, jump back to evidence, and distinguish source-backed content from user-authored or AI-condensed content.

Source grounding should be understood as an evidence chain, not just file attachment. External source files are evidence roots. Internal notes, reports, sections, and NoteBlocks are derived/internal sources that can be reused by later notes. The user should be able to see the direct source, the original/root source, and the full chain when needed.

The global Source Library should help users understand how original material was processed, cited, reused, and transformed across projects. Deleting, replacing, or versioning a source must not silently break notes that already depend on it; broken or degraded chains should be visible and recoverable where possible.

### 6. Organize First, Answer Second

The core product loop is organizing material into readable notes and reports. Answering user questions is valuable, especially for questions about a specific NoteBlock, source, relation, or section, but it should be built on top of the organized workspace.

### 7. AI Should Collaborate, Not Take Over

AI may help organize material, deduplicate knowledge, suggest layout, build relations, and refine notes. But important structural changes should remain reviewable, recoverable, and understandable.

### 8. Free Layout Should Still Feel Orderly

Coincides should support left text and right image, formulas beside explanations, notes beside proofs, scratch work outside the formal page, and other spatial layouts. But freedom should come with alignment guides, snapping, export boundaries, and clear interaction states.

Coincides may also preserve useful interaction discoveries when they improve the feel of writing. One example is `Elastic Avoidance`: a light page-layout assist where one block can gently push another block away while the user is arranging objects. This began as an accidental behavior noticed during development, but it matches the desired notebook feel: flexible, tactile, and less brittle than simple overlap.

Elastic Avoidance should remain bounded:

- it belongs to Page mode and layout editing, not every surface;
- it should only appear when snap alignment is off or when the user is doing free placement;
- its first implementation should stay conservative and vertical-only until boundary behavior is mature;
- it must not rewrite NoteBlock content;
- it is not permission for Page-mode overlap; if a block cannot be pushed within page bounds, it should stop rather than overlap;
- it must not prevent intentional overlap in open canvas / edgeless workspace;
- it should feel like gentle assistance, not the system fighting the user.

### 9. Engineering Reliability Comes Before Polish

Visual polish matters, but it must sit on stable data. Notes, sources, relations, templates, layouts, exports, and recovery records must remain reconstructable and safe.

### 10. The Interface Should Stay Quiet By Default

Advanced structure should be available without becoming visual clutter. Template metadata, relation details, source anchors, concept tags, debug records, and operation history belong in contextual surfaces such as inspectors, hover states, local graph views, command menus, and export previews.

Application chrome should protect the work surface. The sidebar, top bar, bottom dock, inspector, and floating toolbars are product controls, not page content. They should be collapsible or contextual where possible, and they must leave clear recovery controls when hidden. The page/canvas area should stay focused on the user's note, report, scratch work, and relation objects rather than carrying permanent engineering panels.

Block identity and block operations should be separated:

- `Block Control Bar` is the floating operation surface for move, resize, save, source/export/AI visibility, delete, and future block actions.
- `Block Type Badge` is a lightweight identity marker for Definition, Formula, Code, Image, and other block types.
- The control bar should appear only in hover, selected, layout, or explicit editing states.
- The type badge should be outside-first and non-obstructive: it should not occupy content layout, should not cover image/text content by default, and should not intercept normal block clicks.
- Preview/debug surfaces may provide a `Show block types` switch so users can inspect all block identities at once without making the writing surface permanently noisy.

### 11. Project Surfaces Should Support Different Work Types

The same container should be able to support learning, research, report writing, source comparison, and other information-processing workflows. The product may still use course-like defaults when the project is clearly educational, but the interface should not make non-course work feel like a misuse of the app.

## Accessibility & Inclusion

Coincides should aim for a calm, readable, keyboard-friendly product interface.

Initial accessibility expectations:

- strong text contrast;
- clear focus states;
- keyboard access for writing, command menus, selection, and common block operations;
- readable typography for long study and research sessions;
- reduced-motion support where motion is added;
- interaction states that do not rely only on color;
- layout behavior that remains understandable at different zoom levels and screen sizes.

The product should support long sessions of focused work. It should avoid visual noise, hidden irreversible actions, and ambiguous destructive controls.
