> **状态 (Status)**: active
> **层 (Layer)**: 宪法 / Constitution
> **日期 (Updated)**: 2026-08-20
> **权威 (Authoritative)**: 是
> **取代 (Supersedes)**: —
> **被取代 (Superseded by)**: —

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

> **Note on scope (2026-08-20)**: learning is the **leading scenario** — the material the author knows best, used to draft and to judge. It is not a narrowing of who the product is for. All four groups above remain in range.

## Product Purpose

Coincides is a refined information-processing notebook. Its job is to help humans and AI turn selected materials into readable, editable, source-aware notes and reports.

**Structurally, it is a receipts database that grows projections.** The five truths are the tables; the receipts — anchors, birth certificates, judgment snapshots — are foreign keys with honest degradation; and the reading surface, the canvas, an HTML export, and a vault export are four views of the same rows. The contrast that names it: **a highlight made in a browser dies inside that file; a selection made here lives on as a receipt.** Obsidian is a note app on top of a filesystem; Coincides is a refining system on top of a database.

**What it serves is a life, not a subject.** Coincides is built for the whole of its author's ordinary working life — study is part of that life, not the boundary of it. Research, report assembly, and long-horizon material organization are the same act on different material.

**Learning is the leading scenario, not a narrowing of identity.** It is the material its author knows best, so it is where initial designs get drafted and where acceptance gets judged. Choosing a proving ground is not the same as choosing a smaller product. *(Shape and scope adjudicated personally by Henry, 2026-08-20.)*

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

> 📜 **历史教义（2026-06-20）**。其确立的 `TextFlow-first / ContentGroup-aware`（取代 block-first）**至今有效**；其中 `Petal` 已于 V2.BN.11 退役（节内已有 07-13 补丁）。表面模型部分见上方「Current surface model」。**保留原文作为思想沿革。**

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

> **2026-07-13 update (V2.BN.11)**: the knowledge-identity layer is now `Item` — an independently editable knowledge card cast from collected material, carrying its own body, type/topic, and anchor receipts back to sources. `ContentGroup` returns to being pure organization (a bundle of Items and other traceable members). `Petal` is retired (V2.BN.11.1 code surgery + table drop in migration 047); its "local structure" job dissolves into Items and derived views. `Relation` connects Items only. Authority: `docs/agent-ops/analysis/relation-item-graph-concept-design.md` (v1.1) and the updated "Relations Connect Meaning-Bearing Nodes" section below.

## Core Product Commitments

User-facing language should prefer `Project` as the main container name. A project may be a course, a research package, a report workspace, a case file, or another focused collection of material. Internal implementation names such as `course_id` may remain as engineering details, but the product surface should not force every workflow to feel like school coursework.

Coincides should separate the formal document layer from the thinking layer. The formal layer is what becomes a note, report, export, or shareable reading surface. The thinking layer includes sticky notes, remarks, scratch work, temporary reasoning, and page-outside canvas objects. These objects may still be useful to the user and AI, but they should not silently pollute the formal document structure or default export.

> ⚠️ **2026-08-19 更替**：以下两段描述的「canvas-backed + Page-first / Canvas-first 两模式」已被表面重划取代（拍板记录 待拍-1 / 待拍-2）。**保留原文作为思想沿革，不作为现行依据** —— 现行表述见本节末。

The clean product model is canvas-backed rather than three separate surfaces. A Note owns an underlying infinite canvas/workspace. A Page is a fixed exportable frame inside that canvas, with a realistic page size such as A4 only describing the frame, not the whole canvas. Scratch / Workspace content is the area outside the Page frame on the same canvas, not a third independent document type.

Coincides is text-first, annotation-aware, and canvas-capable. The default writing path should let the user write naturally inside TextBlocks. TextFlow quietly keeps the writing organized into TextUnits, writing roles, inline render anchors, and range helpers. AnnotationTruth records durable labels after the user or an accepted AI proposal marks a range. Canvas organizes where visual objects live. GroupFolder organizes where serious content packages are browsed, collected, and used as local graph boundaries. ContentGroups explain which pieces deserve serious AI/user interpretation, and accepted status lives on the ContentGroup itself rather than in a second object.

User-authored blocks do not need to start with source references. A user may create an original thought, summary, side note, or explanation first, then later attach one source, multiple sources, a page, a range, or a more precise anchor. Source grounding should be easy to add, inspect, and revise without making manual writing feel bureaucratic.

Canvas behavior should support two broad modes. A Page-first note gives the user a stable Page frame for writing, export, sharing, and formal reading while still keeping an outside-canvas workspace for scratch thinking. A Canvas-first note lets the user start directly from the open infinite workspace for non-linear understanding, presentation, relation exploration, and large spatial layouts. AI-generated formal notes should respect the selected Page frame unless the user asks for exploratory canvas work.

**Current surface model (2026-08-19).** **Note is the only document unit.** The default writing surface is a **stream assembly surface** — a one-dimensional component stream where layout is handled by the flow, not placed by hand; good formatting is what the defaults give you, not what you tune your way into. The canvas is kept for what it is genuinely good at: **arranging** (spatial organization, walls, whole-view) and **circling** (selection, anchoring, red-pen marking on originals). The page frame retires from being a content container into being an **export viewfinder**; A4 and pagination become export concerns, not writing concerns.

⚠️ Retiring the page frame is a **direction, not a demolition**: during V2.BN.12 the page-frame machinery is not physically removed — the new surface routes around it.

Relations are semantic structures, not merely visible lines. A line may be useful at close range, especially inside one page or local graph view, but the durable value is that blocks can have inspectable, queryable, filterable relationships. Relations should support local graph exploration, AI reading, and user correction without requiring every relation to appear as a permanent visual edge.

Source handling is part of the product identity, and it works as a **three-rung ladder**:

- **Rung 0 — view the original.** Hash and blob; zero-cost entry. No parsing, no extraction, no understanding. The original is cold evidence and never changes.
- **Rung 1 — original plus anchors.** ⭐ **A region anchor requires no parsing.** You can circle an area on an untouched original and ask about it. Anchor coordinates are **format-native**: page + bbox for PDF, element path + offset for DOCX, cell address for XLSX. An anchor carries geometry and an excerpt, never semantics.
- **Rung 2 — cited source.** Narrow-waist parsing into a typed component stream with reading order and source coordinates. **Parsing happens on demand, not on intake** — the cost is paid at first use, not at the door.

Reconstruction is never note generation, and parse output is always a **derivative, never truth**: it can be re-run, discarded, or produced by a different backend. Chunking comes after reconstruction planning, not before it. Contract: `docs/contracts/Source-Ladder-Contract.md`.

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

Free writing and structured meaning should coexist, but the system should not force every meaningful piece to become a separate block or every mark to become a serious content package. A user may write a long natural TextBlock first. Later, parts of that writing can be located as ContentRanges, marked with lightweight labels, packaged into ContentGroups, organized through GroupFolders, accepted or rejected through ContentGroup identity/status, connected to sources, or claimed as anchor evidence for Items — the durable relation endpoints — without breaking the paragraph apart. Independent NoteBlocks should be used when the user needs spatial layout, media, special rendering, large display formulas, code regions, tables, sticky notes, source snapshots, or other object-level behavior.

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

### 8. Free Layout On The Canvas Should Still Feel Orderly

> **Scope (2026-08-19)**: this principle governs the **canvas surface**, not the default writing surface. The default surface is the stream assembly surface, whose layout comes from typographic presets and the compiler — good formatting is given by defaults, not tuned into existence.

On the canvas, Coincides should support left text and right image, formulas beside explanations, notes beside proofs, scratch work outside the formal page, and other spatial layouts. But freedom should come with alignment guides, snapping, export boundaries, and clear interaction states.

> 📜 **Retired 2026-08-20**: `Elastic Avoidance` — a light page-layout assist where one block gently pushed another aside during arrangement. It began as an accidental behavior noticed during development and was kept for its writing feel. It was scoped to **Page mode**, and it retires together with Page mode as a content container. Adjudicated by Henry. Original clauses remain in this file's git history.

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

## 2026-06-29 Design Grammar And Telos Sharpening

These principles were settled in the 2026-06-28 main-line session (recorded in `docs/brainstorm/产品完善/会议记录/2026-06-28-Better-Notebook-ContentGroup-Relation-Philosophy-And-Source-Ingestion-Meeting-Notes.md` §十). They sharpen, not replace, the doctrine and principles above.

### State Carries Purpose; The Relative Is Never Welded To The Absolute

The single structural law under all of Coincides' separation-of-truths: a property that is relative to a context or purpose must live with that context, and must never be fused onto a thing's intrinsic identity. Welding the relative onto the absolute breaks reuse, leaks meaning across contexts, and lets the relative usurp the absolute.

Consequences:

- An object's intrinsic identity carries no purpose-specific role, judgment, or state. All purpose-judgments live with the frame: the placement, the purpose-context, or the view.
- Prefer purpose-relative fitness-states (usable / unusable for a given purpose — a scoped state machine that states fit, not worth) over absolute attitude-laden verdicts (good / bad, or accepted / rejected used as a judgment). A thing has no good or bad until it is inside a frame; under a purpose there is necessarily a reference, a standard, and a contrast, and the product needs them, but they must stay scoped to that purpose.
- Keep two views un-mixed: a process view (frame-free, non-judging, faithfully preserved — the user's thinking and detours are all material) and a purpose view (framed, stateful, allocating finite attention).

This sharpens Principle 4 and underlies the project-scope and relation rules below.

### One Knowledge Space; Project Is A Lens, Not An Owner

A user's knowledge lives in one personal space. A `Project` (course, research package, report workspace) is a lens, membership, or view over that space, not an exclusive owner of what is created inside it. Three relationships must stay separate:

- Origin — where a thing came from (this ContentGroup was distilled from that note; this object was first created on that note). An immutable provenance fact, always kept.
- Containment — where a thing is filed or viewed (folders, projects, lenses), the way a GroupFolder holds a ContentGroup. Non-exclusive: a thing can be filed in many places at once, and deleting a container must not delete the thing.
- Binding — exclusive ownership that traps a thing in one container. This is the shape to avoid. A required project-scope owner (such as `course_id` as a mandatory owner column) is an instance of welding a relative lens onto an absolute identity.

Knowledge, relations, and sources are therefore not trapped in the project where they first appeared. The same understanding can be seen through many projects without duplication; a relation can connect ideas first met in different projects; a source belongs to no single project. "Local" / "project" is a view scope, not a storage boundary. This sharpens the `Project` naming commitment, the cross-project Source Library in Principle 5, and Principle 11.

### Telos: A Prosthetic For Thinking, Not Only A Notebook

Coincides' north star is to become a prosthetic for thinking: a place that preserves not only what a user concluded but the trace of how they came to think it, across long stretches of time, so the user can externalize and revisit their own reasoning and be at peace with forgetting the rest.

This is reached in stages. Today, and at the usable line, Coincides is a knowledge base — content, structure, layout, source. It graduates into a thinking-prosthetic when a trace layer lands. The trace is not a keystroke log; it is the sparse set of turns and singularities in a user's thinking, kept as a thin first-class anchor (a user-marked turn, an explicit "this understanding supersedes that one") plus a derived, source-grounded re-narration reconstructed on demand from kept evidence. The trace's full design is deliberately deferred to the Agent era; what matters now is to cheaply keep the raw record (what was done, the version stream) so the trace can be distilled later rather than reconstructed from nothing. The mechanism here is direction, not a frozen contract.

### Relations Connect Meaning-Bearing Nodes, And The Graph Is Grown By Use

> 2026-07-13 (V2.BN.11): endpoint doctrine updated — the durable endpoint is `Item`. The earlier wording of this section named ContentGroup/Petal as endpoints; that wording is superseded.

A relation endpoint must be a node that can bear meaning: an `Item` — an independent knowledge card with its own editable body, type/topic, and anchor receipts back to its sources — not a raw block, not a raw `ContentRange`, and not a container. A raw range is content; to participate in the graph of understanding it must first be collected as material and cast into an Item. The act of casting material into Items, and then connecting Items, is itself the "use" that grows the graph. ContentGroups bundle and organize Items; Purposes give them situational role and direction; neither is a relation endpoint.

The graph is grown by purposeful use, not pre-computed. Coincides does not try to measure infinite knowledge with a finite, eager index. It owns the truth — the relations the user and AI deliberately make, each carrying a judgment receipt (endpoint snapshots frozen at judgment time) — and any retrieval index (embeddings, GraphRAG) is a rebuildable sidecar built on top of that truth, never the truth itself, and never a prerequisite for creating relations. This sharpens and corrects the "Relations are semantic structures" principle: where the surface elsewhere loosely says blocks can have relationships, the durable endpoint is the Item.

### Build The Substrate For Both Human And Agent; Defer The Operator

Every human-AI-shared capability splits into a substrate (the truth model — a human can create and use it manually, and it is AI-readable) and an operator (the AI that grows, proposes, or retrieves over it). Build the substrate while the human is already a valid first consumer; defer the operator to the Agent era. A reliable Agent is impossible on a messy substrate and achievable on a clean, separated, source-grounded one, so building the substrate well is the most direct path to a reliable Agent. Relation, Source provenance, and the trace record each have a human-usable substrate worth building now; their AI operators (auto-organization, distillation, retrieval) wait for the Agent. This extends Principle 7 and Principle 9.

## 2026-08-19 统一方向教义

上游：`docs/agent-ops/analysis/unified-direction-concept-design.md`（v1 权威，12 条拍板记录附其文末）。

本节不取代 06-20 与 06-29 两节 —— 它们是这一节的思想上游。本节增补的是「智能进来之后，这个产品是什么形状」。

### 三句钉语

智能会贬值，真相不会。智能是租的，手是自己的。
手为什么长这个形状 —— 那个「为什么」，就是核。

### 三层不绑架

大脑（模型）全租，前沿一档，provider 缝可换。
穿戴者（harness）可换可多：管家、工程、产房各有其一。
外骨骼（应用）**唯一不换**：真相层 + 末端执行器 + 守卫 + 收据。

两条纪律：**穿戴者只许点菜不许下厨**；**外骨骼不为任何穿戴者整容** —— 改锥形状由螺丝决定。

### 能力归应用，编排归用户

每项能力都暴露为工具面（MCP），带守卫与收据。编排层归用户，应用不被任何 LLM 或 harness 绑架。

这是红线「Agent 能做的，人类必须 100% 能做」在架构上的兑现方式：**同一道门，同一把钥匙。**

### 零模型荣誉榜

客观判分、机械新鲜度、沉降、选区捕捉、锚定位、compiled scope —— 全机械，零 token。

**设计健康度的另一半，是有多少事情不需要模型。**

### 选区收据

一切手势（多选 / 框选 / 文字选区 / 红笔圈 / 文字指代）在客户端解析成对象身份，归一为 `{对象 IDs, 文字范围, 几何, 时刻}`。

**选区收据 ＝ 还没保存的锚** —— 锚系统的前半生。零 OCR：不需要用眼睛认自己亲手画的东西。

### 组件语言与成长路径

组件不是预先设计齐的，是**长出来的**：产房现搓 → 案例库留存并积使用收据 → **凭使用收据晋升转正**，获完整真相层待遇。与字段晋升、沉降同律。

⭐ **内容与壳分离**：数据（带源锚）走真相层，交互壳走沙盒 —— **转正只升级壳，内容从未流浪。**

### 投影与导出

**真相存对象，投影出 HTML。** 应用内打开的是本人，导出的是照片 —— 编辑视图与导出成品共用同一套组件渲染与 token（所见即将得）。

**格式即承诺**：分享出去的导出格式是永久对外契约，版本化，永远向后可读。

**使用 ≠ 修改**：应用外的折叠、勾选、做题都是使用，不需要回家机制。

### 学习闭环（产品的理论层）

双层结构：理解层与骨架层，折叠决定的是提取还是编码。

**教学装置不可删** ——「AI 笔记 ＝ 缩短」是错方向。写入一比特，读取全分辨率。

credence 逐块、属于用户，且与 provenance 正交。

### 我们是在补哪一半

artifact 与 design 工具的页是**终点**（孤儿成品）；我们的页是**投影**（背后有真相层）。

不是重做它们，是补上它们没有的那一半。

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
