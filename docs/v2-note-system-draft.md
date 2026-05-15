# Coincides v2.x Note System Draft

> Status: Early draft / 初步规划，讨论中，未定稿
> Purpose: Capture early v2.x product and engineering direction for the Note system.
> Naming rule: code and data models should use neutral names such as `Note`, `NoteBlock`, and `NoteTemplate`; UI may call the feature "拼图笔记", "整理笔记", or another product-facing name.
> Scope note: This document records direction and architecture preparation. It does not mean every capability listed here must ship in v2.0.

---

## 1. Background

Coincides was first built to make review periods more efficient: organize courses, tasks, goals, documents, knowledge cards, and AI-generated study plans around the user's own materials.

The v2.x direction extends this from "review-period efficiency" into a daily learning system. A major part of that expansion is a Note system that can help the user turn uploaded lecture notes, handwritten notes, screenshots, and course documents into structured, editable, source-aware study notes.

The central product idea is "拼图": a note is not a single opaque AI-generated article. It is assembled from reusable learning components such as Definition, Theorem, Example, Formula, Sidenote, Diagram, Question, Mistake/Weak Point, and Summary.

---

## 2. Core Product Principles

### 2.1 Preserve Classroom Context

The system should adapt to the student's uploaded materials and the professor's original academic style instead of rewriting everything into a generic textbook or public Anki-deck style.

Preserve three things whenever possible:

- Original order: the professor's sequence of explanation, examples, definitions, proofs, and diagrams.
- Original structure: headings, side notes, formulas, proof steps, examples, diagrams, and local emphasis.
- Original style: the professor's way of explaining, such as example-first, theorem-first, intuition-first, or proof-heavy.

AI should clean, organize, and componentize the material while staying close to the course context.

### 2.2 Human-Editable by Default

Anything the AI can create or modify must also be editable by the user through visible tools.

The Note system must not produce AI-only artifacts that cannot be manually corrected. This is especially important for formulas, theorem statements, diagrams, and extracted handwritten content.

### 2.3 Proposal First

AI-generated notes or note blocks should use the existing Proposal -> Review -> Apply philosophy.

The AI may propose a note structure, extracted blocks, cleaned text, source mappings, and templates. The user approves, edits, discards, or revises them.

### 2.4 Neutral Internal Naming

Use stable, neutral code names:

- `Note`
- `NoteBlock`
- `NoteTemplate`
- `NoteEditor`
- `NoteAgent`

Do not use product metaphors such as `PuzzleNote` in core code. UI copy can still call the feature "拼图笔记" or "整理笔记".

This keeps the system compatible with future use as a function-agent module under a larger AI housekeeper / personal agent system.

---

## 3. Concept: Notes as Blocks

A Note is a structured document made from ordered NoteBlocks.

Example block types:

- `paragraph`
- `heading`
- `definition`
- `theorem`
- `proof`
- `formula`
- `example`
- `sidenote`
- `summary`
- `question`
- `mistake`
- `image`
- `diagram`
- `source_excerpt`

Each block should be independently editable, reorderable, source-aware, and potentially reusable.

This model is intentionally close to the existing Card template idea, but broader: cards are optimized for review, while note blocks are optimized for organizing and reading course context.

---

## 4. Suggested Data Model

Initial conceptual model:

```ts
type Note = {
  id: string;
  user_id: string;
  course_id: string;
  title: string;
  template_id?: string;
  source_document_ids?: string[];
  style_profile_id?: string;
  created_at: string;
  updated_at: string;
};

type NoteBlock = {
  id: string;
  user_id: string;
  note_id: string;
  type: string;
  data: Record<string, unknown>;
  order_index: number;

  source_document_id?: string;
  source_page?: number;
  source_excerpt?: string;
  source_bbox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  source_order?: number;

  layout_role?: 'main' | 'sidenote' | 'diagram_nearby' | 'proof_indent' | string;
  style_hint?: string;
  confidence?: number;

  created_at: string;
  updated_at: string;
};

type NoteTemplate = {
  id: string;
  user_id?: string;
  name: string;
  description?: string;
  target: 'note' | 'block';
  schema: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};
```

Optional future model:

```ts
type NoteStyleProfile = {
  id: string;
  user_id: string;
  course_id?: string;
  name: string;
  description?: string;
  rules: Record<string, unknown>;
  examples?: Record<string, unknown>[];
  created_at: string;
  updated_at: string;
};
```

`NoteStyleProfile` can start as a placeholder or simple JSON record. Later, the AI can summarize style preferences from uploaded notes or previously edited notes.

---

## 5. Template Direction

The current card system has fixed concepts such as Definition, Theorem, Formula, and General. In v2.x, templates and tags should be separated.

Recommended separation:

- Tag: used for filtering and organization, e.g. `Definition`, `Important`, `Exam`, `Chapter 4`.
- Card Template: defines fields and rendering for review cards.
- Note Block Template: defines fields and rendering for a block type.
- Note Layout Template: defines a default sequence for a note, e.g. Summary -> Definitions -> Theorems -> Examples -> Common Mistakes -> Questions.

AI-assisted template creation should also use Proposal. The user can describe a desired template in natural language, and AI generates a structured draft. The user then edits fields, order, required status, labels, and rendering preferences.

Do not store templates as prompt-only text. Use structured schemas so the UI can render and edit them.

Example:

```ts
{
  name: "Theorem",
  target: "block",
  fields: [
    { key: "statement", label: "Statement", type: "rich_text", required: true },
    { key: "conditions", label: "Conditions", type: "rich_text" },
    { key: "intuition", label: "Intuition", type: "rich_text" },
    { key: "proof_sketch", label: "Proof Sketch", type: "rich_text" },
    { key: "example", label: "Example", type: "rich_text" }
  ],
  render_layout: "stacked"
}
```

---

## 6. Display Modes

These modes are not different storage formats. They are different renderings of the same structured NoteBlock data.

### 6.1 Study View

Default reading mode. It should look like a clean review handout while preserving block identity internally.

Characteristics:

- Hide most editing controls.
- Render each block with polished, readable styles.
- Keep the note linear and easy to review.
- Show only lightweight source/action affordances.

### 6.2 Edit View

Editing mode. It should expose the structure.

Characteristics:

- Show block boundaries.
- Show fields for each block.
- Support drag reorder.
- Show source metadata, confidence, and block type.
- Allow adding, deleting, converting, and editing blocks.

### 6.3 Export View

Export rendering. It should transform the same NoteBlock data into output formats such as:

- PDF
- Markdown
- HTML

Markdown should be treated as an export format, not the core storage format.

---

## 7. Editor and Open Source Direction

The editor choice mainly affects Edit View. Study View and Export View can be custom React renderers over NoteBlock JSON.

Candidates to evaluate:

- BlockNote: React block editor, Notion-like, strong fit for block-based notes and custom blocks.
- Tiptap: powerful ProseMirror-based editor, more flexible but higher engineering cost.
- Editor.js: clean JSON block output, conceptually close, but may need more integration work for a polished React app.
- Excalidraw: useful later for editable diagram blocks.
- React Flow: better suited for knowledge graphs and relation views than default note editing.
- Mermaid: useful for structured diagrams generated from text.

Initial recommendation: evaluate BlockNote first, Tiptap second.

Keep the core NoteBlock data model independent from any single editor library to avoid lock-in.

---

## 8. Image and Diagram Strategy

For early versions, prioritize preserving original diagrams over AI redrawing.

Recommended first implementation:

1. Detect image/diagram regions from uploaded handwritten notes, PDFs, or screenshots.
2. Crop the original region.
3. Insert it as an `image` or `diagram` block.
4. Store source page and `source_bbox`.
5. Let AI generate captions or explanations.
6. Let the user move, replace, crop, or delete the image block.

Avoid making AI-generated diagrams a first-version dependency. Mathematical and scientific diagrams are high-risk: a visually plausible but inaccurate diagram can damage trust.

Future additions:

- Mermaid block for flowcharts, relations, and simple structured diagrams.
- Excalidraw block for editable hand-drawn diagrams.
- AI-generated diagram drafts that are fully editable by the user.

---

## 9. AI Note Organization Flow

Conceptual flow:

1. User uploads or selects source materials.
2. Existing OCR/document parsing extracts text, formulas, pages, and possible image regions.
3. AI proposes NoteBlocks while preserving source order and classroom style.
4. User reviews the proposal.
5. Approved blocks become a Note.
6. User edits blocks in Note Editor.
7. Blocks can later generate cards, tasks, weak-point items, or source-linked questions.

Important: AI should not directly commit a final note without review.

---

## 10. Relationship to Existing Coincides Systems

### Documents

Notes should link back to uploaded documents through `source_document_id`, `source_page`, `source_excerpt`, and `source_bbox`.

### Cards

NoteBlocks should be able to generate cards or link to existing cards.

Examples:

- A `definition` block can create a Definition card.
- A `theorem` block can create a Theorem card.
- An `example` block can create a Q&A or worked-example card.

### Tasks and Goals

Blocks can later become learning tasks or checklist items. For example, a weak theorem block could generate a Must/Recommended review task.

### Agent

Future function-agent structure may include:

- `LearningAgent`
- `NoteAgent`
- `ReviewAgent`
- `ScheduleAgent`

The Note system should be designed as a module that these agents can operate on.

---

## 11. Learning Material Analytics

This is an early idea for letting users "play with their own notes and knowledge" after uploading and parsing materials.

Once source materials are uploaded, Coincides has raw extracted text, OCR output, chunks, future NoteBlocks, source metadata, cards, tags, and course structure. This enables lightweight analytics that help users explore their own learning materials without requiring a full knowledge graph.

Principle:

> Coincides should help users inspect and manipulate their own learning materials, not only read AI-generated summaries.

### 11.1 Concept Analytics

Concept analytics should surface what appears in the user's own materials.

Possible views:

- Concept bubble chart for a course, chapter, note, deck, or selected source range.
- Chapter concept heatmap.
- Concept timeline across lecture order or upload order.
- Concept co-occurrence view.
- Block type distribution for a chapter or note.
- Source density map for pages, formulas, diagrams, and extracted blocks.
- Review readiness dashboard showing which concepts have notes, cards, examples, diagrams, or source links.

Example bubble chart dimensions:

- Size: concept frequency.
- Color: chapter, source document, or block type.
- Border: whether the concept already has cards.
- Opacity: extraction confidence or source coverage.

Language should stay factual. Prefer "appears frequently in your materials" over "you should master this first" unless the user explicitly asks for prioritization.

### 11.2 Data Direction

Concept analytics can start from relatively simple data before any full knowledge map exists.

Candidate model:

```ts
type Concept = {
  id: string;
  course_id: string;
  canonical_name: string;
  aliases?: string[];
};

type ConceptMention = {
  id: string;
  concept_id: string;
  source_type: "document_chunk" | "note_block" | "card";
  source_id: string;
  document_id?: string;
  page?: number;
  block_type?: string;
  context_excerpt?: string;
  confidence?: number;
};
```

This layer can be built from document chunks, NoteBlocks, cards, tags, and source excerpts. The first version can use keyword/keyphrase extraction and frequency counts. Later versions can use embeddings or LLM-assisted canonicalization for aliases and related concepts.

### 11.3 Relationship to Knowledge Maps

Learning Material Analytics should come before full knowledge graph features.

It can become the entry point for scoped maps:

```text
Click "trigonometric functions" bubble
-> choose courses / decks / notes / relation types
-> create a Scoped Knowledge Map proposal
```

This keeps map generation user-scoped and avoids a noisy global graph.

---

## 12. Open Source and Local-First Direction

This is an early product and operating-model direction. Coincides is not being designed as a commercial SaaS by default. It is primarily a personal learning assistant and a future Learning Module inside the user's own AI housekeeper ecosystem.

Proposed positioning:

> Coincides is an open-source, local-first learning operating system with a community ecosystem for templates, styles, learning workflows, and DIY packages.

### 12.1 Core Distribution Model

The main version should remain stable, local-first, and self-hostable.

Recommended direction:

- Local deployment as the primary mode.
- Open-source core.
- User-owned data and API keys.
- Community website for documentation, downloads, showcases, package sharing, and discussion.
- Optional future hosted services only if they become clearly useful; they should not be the main product assumption.

The community website should not need to store user learning data. It can focus on releases, docs, package gallery, examples, and community discussion.

### 12.2 Community DIY Model

The core app should provide stable primitives and guardrails. The community can build on top of them.

Community DIY scope may include:

- Note block templates.
- Card templates.
- Visual themes.
- Renderer presets.
- Layout rules.
- Pencil sketch styles.
- Knowledge map layouts.
- Learning path templates.
- Import/export adapters.
- Later, carefully sandboxed plugin logic.

The core should behave like a stable learning engine; community packages behave like maps, skins, rulesets, and mods.

### 12.3 Security Responsibility Boundary

Local-first distribution reduces the project owner's security burden because the project does not need to host user notes, API keys, personal documents, or study data.

Still-required guardrails:

- Do not expose API keys in logs or UI.
- Do not let first-stage community packages execute arbitrary code.
- Keep imported package permissions visible.
- Keep local services bound to localhost by default.
- Require explicit user action before enabling LAN or remote access.
- Treat file parsing as untrusted input.
- Provide disclaimers for community websites, forums, and third-party packages.

### 12.4 Local Profile Instead of Online Account

If Coincides remains local-first, the current Register/Login experience should eventually be reframed.

Product direction:

- Replace the online-account mental model with a `Local Profile` or local workspace.
- First launch can create a default local profile.
- The UI should not imply that Coincides is providing cloud accounts by default.
- Multi-profile support can remain useful for local separation.
- Internally, keeping `user_id` is still valuable for data isolation and future profile switching.

Suggested UX language:

- `Create Local Profile`
- `Open Profile`
- `Local Workspace`

Instead of:

- `Register`
- `Login`
- `Online Account`

Implementation note for future work: the existing internal auth/user model does not need to be removed immediately. It can be adapted into an automatic local-profile session, preserving `user_id` while removing unnecessary account friction from the default local-first flow.

---

## 13. Composable Product Architecture

This is an early direction, not a finalized platform spec. The larger product direction is that Coincides itself should become composable, not only Notes.

The long-term goal is a schema-based composition system first, and only later an executable plugin system if the safety model is mature enough.

### 13.1 Composable Objects

Community and user-built components may eventually include:

- `NoteBlockTemplate`: fields and semantics for a note block type.
- `CardTemplate`: fields and semantics for a card type.
- `NoteTheme`: whole-note presentation theme.
- `BlockStyle`: visual style for a block type.
- `RendererSlot`: a safe built-in renderer option selected by templates.
- `LayoutRule`: declarative display and ordering rules.
- `LearningPathRule`: source -> block -> card/task/review mapping rules.
- `CommunityPackage`: installable bundle of templates, styles, themes, and rules.

First-stage community scope should be templates and styles only. Community packages should not upload or execute arbitrary JavaScript in the first stage.

### 13.2 Schema First

Templates and packages should be stored as structured schemas, not as prompts or opaque text.

The registry should be able to:

- Install, preview, duplicate, customize, update, and remove packages.
- Track package author, version, compatibility, category, language, and license.
- Distinguish the original package version from a user's local customized copy.
- Validate package structure before it can affect Notes, Cards, or Review.

### 13.3 Semantic and Visual Separation

Block semantics and block presentation should remain separate.

Example:

```ts
NoteBlock.type = "theorem";
BlockStyle.theme_id = "math-formal";
```

A theorem remains a theorem regardless of whether it is rendered as a formal proof block, a compact exam-review block, or a color-coded classroom block.

### 13.4 Design Constitution Check

Community packages must pass a Design Constitution check before installation or publication.

Packages must not:

- Make decisions on behalf of the user without approval.
- Monitor the user or infer private behavior patterns.
- Use punitive, shaming, or failure-centered language.
- Lock schedules or learning actions into forced execution.
- Hide AI-only behavior behind visuals that the user cannot inspect or edit.

---

## 14. External Agent Integration

This is an early integration direction for a future AI housekeeper / personal agent system. Coincides should be callable as a Learning Module, not expanded into a general-purpose assistant.

The boundary:

> Jarvis or another housekeeper agent receives outside-world inputs and user intent; Coincides turns learning materials into structured learning assets.

### 14.1 Capability Layer

External agents should call a stable capability layer instead of directly manipulating internal tables.

Candidate capabilities:

- `import_source`
- `create_note_proposal`
- `generate_knowledge_points`
- `ensure_course`
- `create_card_proposal`
- `get_job_status`
- `get_result_link`

These capabilities may later be exposed through REST and/or MCP. The API shape should describe learning intentions, not database internals.

### 14.2 Learning Inbox

External sources with uncertain placement should enter a Learning Inbox first.

Supported source inputs may include:

- URL
- PDF or document file
- Image or screenshot
- Markdown or raw text
- Web article metadata
- User intent from the external agent

If course or deck placement is unclear, Coincides should create a placement proposal or keep the item in Inbox instead of guessing a permanent location.

### 14.3 External Agent Permissions

External agents should not receive the same permissions as a full user session.

Initial default:

- Allowed: import source, parse source, generate draft, generate proposal.
- Requires approval or explicit scoped permission: create course, create deck, create final note, create cards, move large batches, merge, delete, rollback.

High-risk actions should be wrapped in Proposal or a confirmation flow.

### 14.4 Provenance and Idempotency

Every external import should carry provenance:

```ts
{
  imported_by: "jarvis",
  external_request_id: "...",
  source_url: "...",
  imported_at: "...",
  operation_batch_id: "..."
}
```

External requests should support idempotency keys so retries do not duplicate courses, notes, decks, or cards.

---

## 15. Recoverability and Correction Layer

This layer is essential if Coincides will be operated by AI agents, community packages, and batch workflows. Human and AI mistakes are expected; the system must make recovery calm and cheap.

Principle:

> AI may create quickly, but the user must be able to recover calmly.

Related principle:

> Every AI-created structure must be movable, mergeable, and traceable.

### 15.1 ImportBatch and OperationBatch

An external import or Proposal apply may create many related objects. These should be grouped.

Example batch contents:

- Imported document
- Generated note
- Generated note blocks
- Created deck or sections
- Proposed or created cards
- Linked tags, source references, and tasks

Batch grouping enables:

- View what was created.
- Move everything to another course.
- Reassign the batch.
- Undo or rollback the batch.
- Ask an external agent to correct the batch.

### 15.2 Operation Log

Important user, AI, external-agent, and system actions should write an operation log.

Conceptual model:

```ts
type OperationLog = {
  id: string;
  actor_type: "user" | "agent" | "external_agent" | "system";
  actor_id?: string;
  operation_type: string;
  target_type: string;
  target_id: string;
  before_snapshot?: Record<string, unknown>;
  after_snapshot?: Record<string, unknown>;
  operation_batch_id?: string;
  proposal_id?: string;
  external_request_id?: string;
  created_at: string;
};
```

This is for undo, audit, debugging, and transparency, not for judging user behavior.

### 15.3 Soft Delete and Trash

Core user-visible assets should use soft delete by default:

- Course
- Deck
- Card
- Note
- NoteBlock
- Document
- Goal
- Task
- Template
- Community package

Trash should support restore, permanent delete, original-location display, and dependency-aware restore.

Restore may need options:

- Restore to original location.
- Restore with missing parent.
- Restore to Learning Inbox.
- Choose a new parent.

### 15.4 Version History

Content-heavy objects should support version history:

- Note
- NoteBlock
- Card
- Template
- Theme or style rule
- Generation or layout rule

This allows a single theorem block, card wording, or template schema to be restored without rolling back a whole course.

### 15.5 Move, Merge, and Reassign

Correction must be available to both the human UI and future external agents.

Human-facing operations should include:

- Batch move cards to another deck or section.
- Move notes and documents to another course.
- Merge decks.
- Merge courses, including related decks, notes, documents, goals, tasks, and schedules.
- Reassign an import batch to another course.

Agent-facing capabilities may include:

- `move_cards`
- `move_note`
- `move_document`
- `merge_courses`
- `merge_decks`
- `reassign_import_batch`
- `inspect_recent_imports`

High-risk operations such as course merge, bulk move, and rollback should require Proposal or explicit confirmation.

### 15.6 Recent Changes and Diff View

A Recent Changes panel should show AI and external-agent activity in human terms.

Example:

```text
Jarvis imported "Green's Theorem Article"
- Created 1 note
- Created 12 note blocks
- Proposed 8 cards
- Linked to AMS231
[View] [Move] [Undo]
```

Diff views should be available for Notes, NoteBlocks, Cards, Templates, and batch placement changes.

---

## 16. Phased Roadmap Proposal

### v1.9: Local-First Stable Core

- Treat local deployment as the main path.
- Improve first-run setup, local profile creation, diagnostics, backup, restore, and upgrade safety.
- Keep `user_id` internally, but move product language away from cloud-style Register/Login.
- Add the minimum Recovery Layer needed before larger AI batch workflows: soft delete, Recent Changes, OperationBatch, and Proposal apply logs.
- Make community sharing package-based rather than account-data-based.
- Keep optional hosted services out of the critical path.

### v2.0: Note Foundation

- Add `notes`, `note_blocks`, and `note_templates`.
- Add manual Note creation.
- Add core block types: paragraph, heading, definition, theorem, formula, example, sidenote, image.
- Add Study View and basic Edit View.
- Keep code names neutral: `Note`, not `PuzzleNote`.

### v2.1: AI Note Proposal

- Add Agent tools for note proposals.
- Convert selected documents/OCR outputs into proposed NoteBlocks.
- Preserve source order, source links, block boundaries, and confidence metadata.
- Add proposal review/apply flow for notes.
- Preserve original image/diagram regions as source-linked image blocks before attempting AI redrawing.

### v2.2: Template + Style Registry

- Add custom block templates.
- Separate tags from templates.
- Support AI-assisted template proposal.
- Let users edit fields, labels, order, and required status.
- Add a schema-first template/style registry.
- Support local packages before public community sharing.
- Keep community scope to templates and styles first.
- Add package preview, duplication, local customization, and compatibility metadata.
- Do not execute arbitrary community code in the first stage.

### v2.3: Learning Material Analytics

- Add concept extraction and `ConceptMention` records from documents, NoteBlocks, and cards.
- Add course/chapter/note-level concept bubble charts.
- Add concept frequency, source occurrence, block type distribution, and review readiness views.
- Use analytics as an entry point for scoped knowledge maps instead of generating global graphs.
- Keep analytics factual and non-judgmental; the app should not tell users that they are weak or failing.

### v2.4: External Agent Capability Layer

- Add Learning Inbox as the safe intake layer for external agents.
- Add capability-level APIs for source import, note proposal, card proposal, status, and result links.
- Track provenance and idempotency for external requests.
- Keep structural writes behind Proposal or explicit scoped permission.

### v2.5: Scoped Knowledge Map

- Let users choose the scope: Courses, Decks, NoteBlocks, Cards, Concepts, and relation types.
- Avoid automatic global knowledge graphs.
- Prefer 2.5D / pencil-sketch visualizations over large 3D graph scenes.
- Build this on top of Learning Material Analytics rather than treating it as the first graph feature.

### Later

- Classroom style preservation with `NoteStyleProfile`.
- Editable Mermaid or Excalidraw diagram blocks.
- NoteBlock -> weak point / mistake book workflows.
- Export to PDF/Markdown/HTML.
- Public community website and package gallery.
- Sandboxed plugin logic after the package security model is mature.
- Optional hosted services such as cloud sync, PWA, PostgreSQL, and hosted community features.

### v2.x Recovery Layer

- Add soft delete and Trash for core assets.
- Add operation batches and operation logs.
- Attach Proposal apply and external imports to operation batches.
- Add recent changes, batch undo, and dependency-aware restore.
- Expand move/merge/reassign workflows for Courses, Decks, Notes, Documents, Cards, Tasks, and import batches.

These infrastructure items are architecture preparation and staged implementation targets. They do not imply that v2.0 must ship the full community marketplace, full Jarvis integration, and full rollback system at once.

---

## 17. Engineering Risk Assessment

### Highest Risk: Editor

The editor must support structured blocks, custom templates, inline edits, drag reorder, and future source metadata. Choosing an editor too early without an adapter layer may create lock-in.

Mitigation: keep NoteBlock JSON as the app's domain model and treat the editor as an implementation detail.

### High Risk: Scope Creep

"AI organizes notes" can expand into layout reconstruction, OCR correction, diagram generation, style imitation, card generation, and knowledge graph creation all at once.

Mitigation: v2.0 should focus on manually editable NoteBlocks first.

### Medium Risk: AI Trust

AI may misclassify definitions, theorems, examples, or diagrams.

Mitigation: store confidence and source references; keep Proposal review mandatory.

### Medium Risk: Future Rework

If notes are stored as Markdown only, later block-level editing, source tracing, style preservation, and AI partial updates become difficult.

Mitigation: store structured NoteBlock JSON from the beginning. Markdown is export only.

### High Risk: Plugin Scope

Community customization can easily expand from templates and styles into executable plugins, AI generation logic, and arbitrary rendering code.

Mitigation: start with schema-based templates, styles, and safe renderer slots. Defer executable plugins until there is a mature sandbox, permission model, and review process.

### High Risk: AI Recovery Trust

External agents and AI workflows can create many objects quickly. Without logs, Trash, and batch rollback, users may be afraid to let AI help.

Mitigation: attach AI-created objects to operation batches, use soft delete, and make move/merge/reassign operations first-class.

### Medium Risk: Local Deployment Friction

Local-first reduces hosted security responsibility but increases setup, migration, backup, and native dependency friction.

Mitigation: prioritize first-run setup, local profile defaults, diagnostics, backup/restore, and clear data-directory conventions before adding cloud-only assumptions.

### Medium Risk: Account Model Confusion

Register/Login UI can make users assume Coincides hosts accounts or learning data.

Mitigation: reframe the default experience as Local Profile / Local Workspace while preserving internal `user_id` for isolation.

### Medium Risk: Misleading Analytics

Concept frequency is useful, but frequency alone does not prove importance or learning priority.

Mitigation: present analytics as material facts ("appears often", "appears across chapters", "has cards") rather than as judgments about what the user must learn.

---

## 18. Open Questions

- Which editor should be used first: BlockNote, Tiptap, Editor.js, or a custom lightweight editor?
- Should v2.0 include AI note generation, or should it first ship manual Note editing?
- What are the minimum required block types for the first usable version?
- How much source layout metadata should be stored before full layout preservation exists?
- Should Note templates and Card templates share one template engine or remain separate with shared primitives?
- How should NoteBlocks link to Cards: one-way generated-from, two-way relation, or both?
- Should "拼图笔记" be the final UI name, or only a working metaphor?
- What is the minimum package registry needed before any community sharing?
- Which external-agent capabilities should be exposed first: import-only, proposal-only, or limited writes with scopes?
- What is the first practical undo target: import batch, applied proposal, or any operation batch?
- How long should Trash retain deleted objects before permanent purge?
- Which license best matches the open-source/community goal: MIT, Apache-2.0, GPL, AGPL, or another option?
- Should v1.9 explicitly pivot from cloud deployment to local-first stable core?
- What is the minimum Local Profile flow needed to replace Register/Login in the default local deployment?
- Should the community website support only package sharing at first, or also discussion/forum features?
- Which analytics should ship first: concept bubble chart, chapter heatmap, source density map, or review readiness dashboard?
- Should `Concept` be course-local by default, with optional cross-course linking later?
- How should aliases be handled for math concepts with symbols, English names, Chinese names, and LaTeX forms?
