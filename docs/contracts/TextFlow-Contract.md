# TextFlow Contract

**Status**: V2.BN.8.4 editor seed, updated for TextFlow-first / ContentGroup-aware model

**Purpose**: define how Coincides represents natural writing inside text-like blocks. TextFlow owns the content root for natural writing, writing units, writing roles, local inline render anchors, and the coordinates that other systems use to address content. It does not own final AI interpretation or relation truth.

This document is not a rich text implementation spec, not a migration file, not an annotation contract, and not relation runtime.

## 1. Core Principle

Coincides remains:

```text
TextFlow-first
ContentRange-addressable
Annotation-assisted
ContentGroup-aware
canvas-capable
```

The split is:

```text
Canvas / Block
  where objects live and how they are manipulated

TextFlow
  content root for natural writing

ContentRange
  stable location inside TextFlow / source / future canvas objects

AnnotationTruth / Annotation
  lightweight label / marker over a content range

ContentGroup
  a more serious content package made from one or more ranges

ContentGroup accepted identity
  accepted / reviewed state of a ContentGroup; not a separate object or table
```

TextFlow should let the user write naturally first. Structure should become available without forcing the user to choose a block type for every idea.

## 1.1 Drag / Drop Editing Boundary

V2.BN.8.6.29 and V2.BN.8.6.30 define the first safe drag/drop boundary for TextFlow content:

```text
Draft Range / Label drop on Page or Canvas blank area
  create a copied TextBlock projection

Draft Range / Label drop into an existing TextBlock
  copy-insert near the drop target

Original text / label
  remains in place
```

This is intentionally copy-first. Destructive move, reorder, and cut-style operations are deferred until range offset rebase is mature enough to update AnnotationTruth ranges, ContentGroup members, Petal fragments, source previews, and future relation endpoints without data loss.

## 2. TextBlock

`TextBlock` is the default natural writing container.

It can carry:

- continuous text;
- paragraph / heading / list / quote / todo / toggle rows;
- inline formula / inline code / inline link render anchors;
- ordinary rich text spans;
- range helpers used by annotation, split, merge, paste, and projection workflows.

If the user has no layout need, a single TextBlock should be able to carry a long note. Independent NoteBlocks are needed when the user wants spatial behavior, resize, special rendering, media, table, code region, source snapshot, sticky note, or other object-level interaction.

## 3. TextUnit

`TextUnit` is the internal writing unit inside a TextBlock.

User-facing translation:

```text
TextUnit ~= paragraph / row / list item / heading line / todo item / toggle item
```

First-version rule:

```text
Enter creates a new TextUnit.
Visual soft wrap does not create a new TextUnit.
```

Suggested fields:

```text
TextUnit
  id
  text
  writing_role
  indent_level
  order_index
  metadata
```

`writing_role` controls how the unit is written and displayed. Examples:

```text
paragraph
heading_1
heading_2
heading_3
bullet_item
numbered_item
todo_item
toggle_item
quote
code_line
divider
```

Writing roles are not knowledge roles. A heading is not a semantic endpoint just because it is a heading.

## 4. InlineStructure

`InlineStructure` is a local special render or interaction anchor inside TextFlow.

Examples:

```text
inline_formula
inline_code
inline_link
inline_source_marker
```

It should support stable rendering and editing of content that cannot be represented as plain text alone.

It should not become a fixed semantic taxonomy. For example, `inline_formula` means "render this selected text as a formula"; it does not automatically mean "this is the key theorem of the note." Meaning belongs to later `ReadingInterpretation`, `ContentGroup`, and ContentGroup identity/status layers. An inline structure is only a render / interaction anchor until another layer interprets it.

Suggested fields:

```text
InlineStructure
  id
  kind
  parent_text_unit_id
  anchor_range
  payload
  status
```

`kind` is render/interaction kind, not a final semantic label.

## 5. TextUnitGroup / ContentGroup Direction

`TextUnitGroup` is the V2.BN.8.6.6 writing-layer row group seed. After the 2026-06-18 model realignment, it should be treated as ContentGroup's predecessor / inspiration rather than a long-term independent product object.

The older TextUnitGroup object groups one or more TextUnits so a range can remain stable while the user edits, annotates, extracts, splits, merges, or projects text.

The newer product direction is broader:

```text
ContentGroup
  owns members[]
  each member references ContentRange, AnnotationTruth, Block, or future source/canvas/media object
  may support accepted identity/status on the ContentGroup itself

Petal
  local part inside ContentGroup
  also owns members[]
```

Do not create a separate `GroupOfTextUnitGroup`, and do not expand TextUnitGroup as a semantic structure.

```text
TextUnitGroup should be removed, or rewritten into ContentGroup.
```

Important rules:

- TextUnitGroup is not the default semantic object.
- TextUnitGroup does not own `knowledge_role`.
- TextUnitGroup may help an annotation cover multiple rows.
- TextUnitGroup may help preserve a stable range for future ContentGroup, relation, or source work.
- The meaning of that range belongs to a later `ContentGroup` identity/status or `ReadingInterpretation`, not the raw row group itself.
- Future work should migrate useful TextUnitGroup behavior into a more general ContentGroup model, or remove the old row-group surface from normal UX.

## 6. ContentRange / Annotation Boundary

TextFlow does not decide final meaning. It provides the content and coordinates.

```text
TextUnit
  writing unit

TextUnitGroup
  legacy row group helper / rewrite candidate

InlineStructure
  special render anchor

AnnotationTruth
  label / marker over a range

ContentGroup
  one or more ranges packaged as a serious content package

Petal
  local part inside a ContentGroup

ContentGroup accepted identity
  accepted / reviewed state of that content package
```

Examples:

```text
User writes a paragraph.
  -> TextFlow stores TextUnits.

User selects a phrase and renders it as LaTeX.
  -> InlineStructure stores formula rendering.

User labels that phrase "Power Series definition".
  -> AnnotationTruth stores the visible label / marker.

AI or user decides the definition sentence, paraphrase, and formula belong together.
  -> ContentGroup stores the content package.

AI or the user accepts that ContentGroup identity as "Power Series definition".
  -> ContentGroup.identity.status = accepted.
```

See `docs/contracts/Annotation-Contract.md`.

V2.BN.8.6.2 adds a source-backed range editing reserve:

```text
Annotation range preview
  -> may become an editor later
  -> but any edit must write back to TextFlow source
  -> range_text_cache remains cache
```

TextFlow is therefore responsible for providing stable text-unit source coordinates and conservative offset rebasing helpers. AnnotationTruth remains responsible for lightweight labels and hierarchy. ContentGroup owns packaging and accepted/rejected identity state.

V2.BN.8.6.3 makes the reserve runnable for same-TextUnit text ranges:

```text
range preview edit
  -> replace text in the source TextUnit
  -> project updated plain text
  -> refresh annotation range offsets and range_text_cache

TextUnit source edit
  -> rebase matching annotation ranges
  -> keep preview cache synchronized
```

## 7. V2.BN.8.6.6 TextUnitGroup Editor Boundary

V2.BN.8.6.6 made `TextUnitGroup` a real writing-layer editor seed.

After the later ContentGroup realignment, `TextUnitGroup` should be treated as a legacy seed / rewrite candidate, not a durable product object.

The active rule is:

```text
TextUnitGroup
  groups TextUnit rows inside one TextFlow
  helps selection, annotation, projection, extract, split, and merge workflows
  does not own semantic meaning
```

New `TextUnitGroup` writes must keep `knowledge_role: null`. The field remains in the runtime type only as a compatibility field for earlier prototype data and older notes. New code must not use it to store definition/example/theorem-style meaning.

Supported V2.BN.8.6.6 operations:

- create a group from two or more active TextUnits in one TextBlock;
- rename a group;
- soft-delete / ungroup a group without deleting the source TextUnits;
- show a quiet group rail beside grouped rows;
- project grouped row text for model checks and future extraction workflows.

The user-facing meaning of a row group should remain modest:

```text
these rows are grouped for writing / editing convenience
```

If a group needs to mean "prerequisite pack", "definition cluster", "solution steps", or anything else semantic, that meaning should move toward `ContentGroup` plus accepted identity / `ReadingInterpretation`, not raw `TextUnitGroup`.

The important boundary is: TextFlow owns writable text source, AnnotationTruth owns lightweight labels, ContentGroup owns content packages and accepted/rejected identity state, and `range_text_cache` is only a cached reading of TextFlow source.

Current direction:

```text
TextUnitGroup should be removed, or rewritten into ContentGroup.
```

If the existing implementation remains temporarily, it should be hidden behind writing/editing affordances and should not define future relation endpoints, AI-accepted content packages, or user-facing content lists.

## 8. Addressable Boundary

Future source, relation, AI projection, and export systems should not be limited to whole NoteBlocks.

Candidate addressable objects:

```text
Note
PageFrame
NoteBlock
ContentRange
TextUnit
ContentGroup
InlineStructure
AnnotationTruth
ContentGroup identity / ReadingInterpretation projection
SourceSnapshotObject / SourceRegion future
CanvasObject / Region future
```

Preferred future relation endpoints should be `ContentGroup`, accepted ContentGroup identity, or an explicit future `CompositeEndpoint`. AnnotationTruth can be an input signal and a visible label, but it should not be treated as the only semantic endpoint. Raw TextFlow objects are useful for anchoring and projection, but they should not automatically become graph nodes.

## 9. Split / Merge / Promote / Demote

TextFlow and NoteBlock need bridge operations.

Future operations:

```text
Split Block
Merge Blocks
Promote Selection To Block
Demote Block To Inline
Extract TextUnit To Block
Create Annotation From Selection
Create ContentGroup From Selection / Ranges
Add Selection / Range To ContentGroup
Create Petal Inside ContentGroup
Accept ContentGroup identity
```

V2.BN.8.4 only needs a seed-level editor foundation. Full bridge operations can mature across later V2.BN.8.x and A9 work.

After V2.BN.8.6.8, `TextUnitGroup` is no longer an active product operation. Its useful responsibility moves to ContentGroup member references and Petal member references.

After V2.BN.8.6.9, ContentGroup / Petal member previews must be treated as caches over TextFlow / AnnotationTruth / block source references, not as a second text source.

After V2.BN.8.6.30, dragging a Draft Range or Label into TextFlow is a copy insertion by default.
It does not delete or move the source text.
Destructive move/reorder requires a later explicit mode with offset rebasing or a stronger undo gate.
ContentGroup preview text remains a cache; TextFlow and source references remain the truth.

## 10. Slash / Context Command Boundary

Slash command is not only a block picker.

It may trigger:

```text
create_block
convert_block
insert_structure
inline_action
annotation_action future
```

Long-term command entry points may include slash menu, row gutter, right-click menu, selection toolbar, side palette, inspector, and AI proposal review.

The command surface should avoid menu hell. Commands should appear where they match the user's current context.

## 11. Structure Studio Boundary

A9 Structure Studio / Annotation Studio should not be framed as "make endless block templates."

It should eventually manage:

- writing role display behavior;
- annotation workflow;
- ContentGroup review / assembly workflow;
- Petal editing inside ContentGroup;
- ContentGroup identity review;
- annotation visual styles;
- AI proposal review;
- block shell / special object block behavior;
- appearance and editor behavior;
- projection/debug views.

`TextFlow` remains the writing substrate. `AnnotationTruth` remains the lightweight marker substrate. ContentGroup / Petal / ContentGroup identity / ReadingInterpretation carry the future content package, internal part, review state, and relation endpoint work.

## 12. V2.BN.8 Implementation Seed Map

Current seed areas:

```text
TextFlow type boundary
  client/src/pages/Notes/canvasEngine/runtimeDataTypes.ts

TextFlow projection/debug helper
  client/src/pages/Notes/canvasEngine/textFlowService.ts

Fresh TextBlock initialization and edit rebuild
  client/src/pages/Notes/canvasEngine/blockContentService.ts

Slash command action metadata
  client/src/pages/Notes/noteSlashCommands.ts
```

The product has not entered real use. Old local prototype payloads may be cleared or regenerated instead of preserved through a legacy adapter.

The TextFlow projection seed proves future systems can read below NoteBlock level, but it is not the final AI-readable projection engine and does not decide ContentGroups, ContentGroup identity/status, or relation endpoints.

## 13. Synchronization Rules

When this contract changes, check:

- `docs/contracts/Annotation-Contract.md`
- `docs/contracts/Notebook-Object-Inventory-Contract.md`
- `docs/contracts/Block-Contract.md`
- `PRODUCT.md`
- `docs/PRD.md`
- `docs/Coincides-Better-Notebook-Roadmap.md`
