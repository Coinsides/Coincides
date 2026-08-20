> **教义更替公告 (2026-07-13 · V2.BN.11)**: §22 Relation / ObjectRelation 所述"future endpoints 偏好 ContentGroup / accepted ContentGroup identity / CompositeEndpoint / NoteBlock / SourceRegion"**已被取代:唯一 durable endpoint = Item（卡）**;legacy `object_relations / canvas_edges / relation_layers` 经活性盘点数据全死,047 落表,legacy Courses 学习画布页整体下架。§17.1 Petal 机制随花瓣退役日落（V2.BN.11.1,见 `Petal-Contract.md`）。对象清单新增:**Item / ItemAnchor（一表两态:原料池+锚集,使用收据）/ ItemSnapshot（判断收据）/ Relation（种子九类,单活边）/ RelationAssessment（AI 署名判定）**——权威:`docs/agent-ops/analysis/relation-item-graph-concept-design.md`（v1.1）。其余对象边界继续有效。

> **状态 (Status)**: archived
> **层 (Layer)**: 历史 / History（已冻结的 V2.BN.8 对象清单）
> **日期 (Updated)**: 2026-08-20（冻结）
> **权威 (Authoritative)**: 否
> **被取代 (Superseded by)**: [`Notebook-Object-Boundary-Contract.md`](Notebook-Object-Boundary-Contract.md)

> # ⛔ 整体冻结公告（2026-08-20）
>
> **本文件已整体冻结，不作为任何工作的依据。现行契约 = [`Notebook-Object-Boundary-Contract.md`](Notebook-Object-Boundary-Contract.md)。**
>
> ## 为什么是冻结而不是更正
>
> 本文件是 **859 行手写事实面**。2026-06-23 成文（V2.BN.8 时代），07-13 打过一层教义横幅，08-19 打第二层 —— **而正文始终停在 V8**。2026-07-15 会议卷 §二 Henry 亲自点名它时的判词是：**「横幅补丁救不了正文脱节」**。
>
> 根因不是没人维护，是**形制本身**：手写事实面的半衰期约等于**下一次 migration**。新契约因此只装**边界与意图**，事实面（表 / 路由 / kind / 操作）改由 `scripts/docs-inventory.mjs` **从代码生成**（07-15 §三.1 生成层：能派生的不手写）。文件名也从 **Inventory** 改为 **Boundary** —— 让名字本身挡住复发。
>
> **征候留档**：本文件有**两个 §22**（Relation 与 Source 重号）。手写事实面失控的直接证据。
>
> ## 逐节判定
>
> 见新契约 §5（被取代 6 / 部分 6 / 存活 2）。其中 **§14 SelectionDraft 不仅存活还被升级** —— 宪章 §8 把它升格为「选区收据 ＝ 还没保存的锚」，是 V2.BN.12 必修③。**§23 User-Facing Translation 判存活但未搬运**，留待随 V12 组件语言重做时从本件取用。

# Notebook Object Inventory Contract（已冻结）

**Status**: V2.BN.8 object model alignment

**Purpose**: provide a single overview of the Better Notebook object stack after the TextFlow-first / ContentGroup-aware turn. This document is the inventory outline for product, contract, and engineering work.

It is not a database schema, migration plan, UI mockup, or final API spec.

## 0. 2026-06-22 Active Object Doctrine

The current source of truth is:

```text
TextFlow
  content root

ContentRange
  address root

SelectionDraft
  temporary user selection before an action commits

Label / AnnotationTruth
  visual marker and reusable range package

ContentGroup
  serious content package assembled from traceable members

Petal
  local role inside one ContentGroup

GroupFolder
  organization path, Gallery boundary, and future local graph scope
```

`AnnotationSet`, `TextUnitGroup`, and child label are historical/prototype concepts. Useful parts should be rewritten into ContentGroup, Petal, GroupFolder, SelectionDraft, or command-surface workflows. They should not be treated as long-term product roots.

## 1. Root Model

```text
Project
  Note
    NoteCanvas
      PageFrame
      FrameOutsideWorkspace
      Block / NoteBlock
        TextFlow
          TextUnit
          TextUnitGroup legacy / rewrite candidate
          InlineStructure
      CanvasObject
      SelectionDraft
      ContentRange
      AnnotationTruth
      AnnotationDisplayState
      GroupFolder
      ContentGroup
      Petal
      ContentGroup identity / ReadingInterpretation projection
      ContentGroup Gallery / derived group views
      AnnotationSet legacy / transitional
      ReadingInterpretation
      Relation / ObjectRelation future
```

The key split:

```text
Block
  where and how something is presented

TextFlow
  content root for natural writing

AnnotationTruth
  durable label / marker over a content range

SelectionDraft
  what the user is temporarily selecting before an action commits

ContentRange
  where content is located inside TextFlow / source / future canvas objects

GroupFolder
  organization, path, browsing boundary, and relation-view boundary for ContentGroups

ContentGroup
  a serious content package made from member references

Petal
  a local part inside a ContentGroup, also made from member references

ContentGroup identity/status
  accepted / rejected / draft state of a ContentGroup

ContentGroup Gallery / derived group views
  user-facing browsing and query views over ContentGroups, usually scoped by GroupFolder

AnnotationDisplayState
  how confirmed annotations are currently shown or hidden in the UI

Relation
  how confirmed objects imply, support, depend on, cite, contrast with, or otherwise relate
```

## 2. Project

`Project` is the user-facing container.

It may represent a course, research package, case file, report workspace, or personal learning area.

It owns notes, source materials, future relation views, and project-local conventions.

## 3. Note

`Note` is a durable writing and thinking unit.

One Note owns one `NoteCanvas`.

Future note types may start page-first or canvas-first, but both should still be understood as a note with a canvas-backed surface.

## 4. NoteCanvas

`NoteCanvas` is the spatial root of a note.

It contains:

- one main `PageFrame` in the current V2.BN.8 product boundary;
- a workspace outside that PageFrame;
- Blocks;
- future CanvasObjects;
- overlays, selections, and relation endpoint anchors.

V2.BN.8 does not productize multiple PageFrames, but the model should not block that future.

## 5. PageFrame

`PageFrame` is an exportable fixed region inside the canvas.

It is not the whole canvas.

Page mode focuses on the PageFrame. Canvas mode shows the PageFrame and outside workspace together.

## 6. FrameOutsideWorkspace

`FrameOutsideWorkspace` is the scratch / thinking area outside the PageFrame.

Objects here can be useful, AI-visible, source-aware, or relation-ready, but they should not enter formal export by default.

## 7. Block / NoteBlock

`Block` is the spatial, render, and interaction object.

It answers:

- where does this object live?
- how large is it?
- how is it selected, moved, resized, rendered, and controlled?
- does it need special object-level behavior?

Blocks should not be inflated into a universal knowledge taxonomy.

Independent block families remain useful for:

- TextBlock shell;
- large display FormulaBlock;
- CodeBlock;
- ImageBlock / media block future;
- TableBlock future;
- StickyNote;
- SourceSnapshotBlock;
- special render or interaction objects.

Knowledge roles such as definition, theorem, example, claim, step, and evidence should normally become annotation labels, not block families.

## 8. TextFlow

`TextFlow` is the natural writing model inside a text-like block.

It owns:

- TextUnits;
- TextUnitGroup range helpers;
- InlineStructure special render anchors;
- writing roles such as paragraph, heading, list item, todo item, toggle item, quote line, and code line.

It does not own final semantic truth.

## 9. TextUnit

`TextUnit` is the internal writing unit.

User-facing translation:

```text
TextUnit ~= paragraph / line item / heading line / list item / todo item / toggle item
```

Enter creates a new TextUnit. Visual soft wrap does not.

The user does not need to know the term `TextUnit`; the UI can show it as a line, paragraph, or row-level handle.

## 10. TextUnitGroup

`TextUnitGroup` is a legacy writing-layer range helper and rewrite candidate.

It originally grouped TextUnits so the system could preserve a stable range across writing operations.

It was useful for:

- selecting several TextUnits as a movable or addressable writing range;
- helping an annotation cover multiple lines;
- preserving a stable range for future extraction, split, merge, or projection;
- supporting debug/projection work.

It is not the default semantic object and not the default relation endpoint.

If the user asks "what does this group mean?", the answer should normally come from a later `ContentGroup`, ContentGroup identity/status, or `ReadingInterpretation`, not from TextUnitGroup itself.

After the ContentGroup model matured, the direction is stricter:

```text
TextUnitGroup should be removed, or rewritten into ContentGroup.
```

Its independent long-term value is weak:

- it can harm natural writing by adding visible row controls and rails;
- it overlaps with ContentGroup's job of packaging ranges;
- its positive value was mainly conceptual: it helped reveal the need for ContentGroup.

Historical note:

V2.BN.8.6.6 made TextUnitGroup editable enough for manual use:

- selected TextUnits in one TextBlock can be grouped;
- row groups can be renamed;
- row groups can be ungrouped / soft-deleted without deleting text;
- grouped rows show a quiet rail in the writing surface;
- new row groups keep `knowledge_role: null`.

Future work should either migrate this implementation into ContentGroup creation / editing, or remove it from normal UI.

## 11. InlineStructure

`InlineStructure` is a special render or interaction anchor inside TextFlow.

Examples:

- inline formula;
- inline code;
- inline link;
- inline source marker;
- future inline media marker.

InlineStructure should not become a fixed semantic taxonomy. Its meaning can be annotated later through `AnnotationTruth`.

## 12. AnnotationTruth

`AnnotationTruth` is the durable label / marker root.

It records a confirmed mark over one or more ranges.

Examples:

- user highlights a phrase and labels it "Power Series definition";
- AI proposes several examples and the user accepts them;
- a note region is marked as "Assignment 1 step 2";
- a media region is marked as "important diagram" in the future.

See `docs/contracts/Annotation-Contract.md`.

V2.BN.8.6.2 clarifies that AnnotationTruth can be hierarchical:

```text
root AnnotationTruth
  parent_annotation_id = null

child AnnotationTruth
  parent_annotation_id = root or another annotation id
```

Child annotations are historical label refinements inside a parent label. They must not behave like unrelated sibling labels in normal UI surfaces.

After the 2026-06-18 model realignment, AnnotationTruth should not be treated as the default content package truth. It is a visible and durable mark over content. Some annotations may feed a ContentGroup, but many annotations are only user-facing highlights, doubts, reminders, or personal reading marks.

After the Petal model matured, child labels should not be expanded as the main way to model internal knowledge parts. Their legitimate responsibility moves to `Petal` inside `ContentGroup`.

## 13. AnnotationDisplayState

`AnnotationDisplayState` is a runtime display object.

It answers:

- should label overlays be shown right now?
- should annotation highlights and local badges be visible on the writing surface?
- should block-level annotation badges render as fallback?

It does not answer:

- does the annotation exist?
- is the annotation hidden, deleted, or active?
- what does the annotation mean?

First version:

```text
AnnotationDisplayState
  labelsVisible
```

Turning label display off must never mutate `AnnotationTruth`.

## 14. SelectionDraft

`SelectionDraft` is the runtime/editor selection object.

It records what the user is temporarily selecting before the system commits an action such as annotate, child label, inline formula, split, merge, link, or future relation endpoint creation.

It owns:

- selected ranges;
- range order;
- additive selection state;
- selection toolbar anchor;
- optional parent annotation context;
- temporary draft highlight lifecycle.

It does not own durable content truth or semantic truth.

```text
Browser selection
  input signal only

SelectionDraft
  Coincides-owned temporary selection truth

AnnotationTruth
  durable confirmed label / marker truth
```

V2.BN.8.6.1 makes `SelectionDraft` a first-class foundation component because browser-native selection is not reliable enough for Coincides annotation, child label, multi-range selection, and future cross-block selection.

## 15. ContentRange

`ContentRange` is the location root.

It identifies a concrete span or region inside content:

- a text span inside one TextUnit;
- a whole TextUnit;
- a group of TextUnits;
- a range inside a source snapshot;
- a future media / canvas object region.

SelectionDraft can create a ContentRange. AnnotationTruth can label a ContentRange. ContentGroup can package several ContentRanges.

ContentRange is not the same as meaning. It answers "where is this content?", not "what does this content mean?"

ContentRange should remain independent from ContentGroup:

```text
ContentRange
  independent location / address

ContentGroup.members[]
  references ContentRange or other member objects

Petal.members[]
  references ContentRange or other member objects
```

ContentGroup does not directly contain text. It contains traceable member references.

## 16. GroupFolder

`GroupFolder` is the organization and browsing object for ContentGroup work.

It is not a content package and not semantic relation truth.

It answers:

- where is this ContentGroup organized?
- what folder path does the user see?
- what local Gallery scope is open?
- what relation graph boundary should be used from this area?
- what context should AI read before scanning the groups inside it?

Project and Note are still document scopes, not GroupFolders. However, each Project and Note may own a lifecycle-bound system root GroupFolder:

```text
Project
  system Project root GroupFolder

Note
  system Note root GroupFolder
```

Rules:

- system root folders are created by the system;
- the user cannot delete a Project or Note root folder while its owner exists;
- deleting the owner may delete or archive its bound root folder;
- ordinary folders can be nested under system roots;
- user-created folders can also exist outside a Project/Note root for cross-scope organization.

There is only one GroupFolder object type. Do not introduce separate project-folder, note-folder, pinned-folder, linked-folder, or shortcut-folder models.

GroupFolder owns organization, not source truth:

```text
GroupFolder
  id
  parent_folder_id?
  bound_scope?
  title
  origin: user | system | ai
  status: active | temporary | archived
  order

ContentGroupPlacement
  folder_id
  content_group_id
```

Folder path derives depth:

```text
GroupFolder.path
  -> derived browsing depth
  -> derived graph scope
  -> derived AI reading context
```

ContentGroup should not store primary depth. It is organized under folder paths.

AI may create temporary GroupFolders as projection folders, for example "all power series items across math, engineering, and CS". Saving such a projection makes it a normal folder; discarding it removes the organization view without moving original ContentGroups.

See `docs/contracts/ContentGroup-GroupFolder-Contract.md`.

## 17. ContentGroup

`ContentGroup` is a serious content package.

It can group:

- one or more ContentRanges;
- annotation-backed ranges;
- unannotated ranges that AI or the user decides are needed together;
- future source, media, table, or canvas regions.

ContentGroup is stricter than AnnotationTruth. A user may label many things casually, but only some marked or selected content should become a serious package for reading, relation, source, Gallery, or AI interpretation work.

ContentGroup can be user-created, AI-proposed, or system-created during source reconstruction. It should be editable and reviewable before it can be treated as accepted.

Current field draft:

```text
ContentGroup
  id
  project_id
  note_id?
  primary_folder_id?
  placements[]
  title
  topic?
  local_role?
  summary?
  status
  created_by
  created_at
  updated_at
  members[]
  petals[]
  identity
  view_state?
```

V2.BN.8.7.1 through V2.BN.8.7.4 implementation status:

```text
ContentGroup
  independent database root entity
  persisted through content_groups and /api/content-groups

ContentGroupMember
  group-owned child entity
  persisted through content_group_members
  hydrated back into ContentGroupV1.members[]

GroupFolder
  independent organization entity
  persisted through group_folders and content_group_folder_placements

ContentGroupFragment / Petal
  group-owned child entities
  persisted through content_group_fragments and content_group_petals
  Petal-to-Fragment assignment persisted through content_group_petal_fragments
  hydrated back into ContentGroupV1.fragments[] and ContentGroupV1.petals[]
```

The active save path no longer treats `canvas_engine_content_groups_v1` in note metadata as ContentGroup truth. That metadata key is legacy import/fallback only; normal folder metadata writes strip it rather than continuing to preserve it as a second group store.

`title` is the direct user naming field. The user may name a group freely. `topic`, `local_role`, and `summary` are lightweight interpretation fields on the group. If those fields are accepted/reviewed, the accepted state belongs to `identity.status`.

`primary_folder_id` / `placements[]` organize the group. They do not define its source truth. Derived depth comes from the folder path, not from a primary `depth` field on the ContentGroup.

V2.BN.8.6.10 replaces the earlier `interpretation` wording with an identity state machine:

```text
identity.status = none
  ordinary content package with no proposed knowledge identity

identity.status = draft
  proposed role/topic/summary; former interpretation idea

identity.status = accepted
  accepted / reviewed ContentGroup identity

identity.status = rejected
  should not currently be treated as accepted/reviewed

identity.status = archived
  previously useful identity hidden from default index views
```

If members or Petals change after acceptance, the accepted identity must fall back to `draft`. Renaming the ContentGroup title alone does not invalidate accepted identity.

ContentGroup members are references:

```text
ContentGroup.members[]
  - kind: content_range
    range_id
    role_hint?

  - kind: annotation
    annotation_id
    role_hint?

  - kind: block
    block_id
    role_hint?

  - kind: future_object
    object_id
    role_hint?

  - kind: content_group
    content_group_id
    role_hint?
```

V2.BN.8.6.9 hardens this rule with member integrity metadata:

```text
integrity_status
  valid | stale | orphaned | unsupported

integrity_reason
  compact explanation for stale/orphaned/unsupported state

preview_refreshed_at
  last time preview_text was rebuilt from source
```

`preview_text` is only a cache for display. It must be refreshable from source references and must not become the editable source of truth.

V2.BN.8.7 begins the first embedded source-ref model on `ContentGroupMember`:

```text
current_content
  group-local member truth

source_ref
  source artifact / note / block / range pointer plus snapshot text and hash

source_sync_status
  fresh | changed | missing | detached | unsupported
```

This is not a full database migration yet. The first rule is product-level clarity:

```text
Member changes do not automatically rewrite source.
Source changes do not automatically rewrite member.
preview_text never becomes a second content truth.
```

V2.BN.8.7.3 cuts `ContentGroupMember` into an independent persistence entity without turning it into a standalone user-facing object:

```text
ContentGroupMember
  lifecycle owner: ContentGroup
  persistence: content_group_members
  deletion: hard delete
  cascade: prune dependent Petal / fragment child entities
  product surface: ContentGroup child, not a standalone Gallery object
```

Member deletion removes the member row. Any Petal or Fragment child entity that depends on the deleted member is removed in the same write. This does not delete or rewrite source text, source ranges, labels, note blocks, or source artifacts.

V2.BN.8.7.4 cuts `ContentGroupFragment` and `ContentGroupPetal` into independent persistence entities without turning them into standalone Gallery resources:

```text
ContentGroupFragment
  lifecycle owner: ContentGroup
  persistence: content_group_fragments
  source pointer: source_member_id -> content_group_members.id
  deletion: hard delete

ContentGroupPetal
  lifecycle owner: ContentGroup
  persistence: content_group_petals
  assignment persistence: content_group_petal_fragments
  deletion: hard delete
```

Fragment deletion, Petal deletion, and Petal assignment removal are hard data changes inside the ContentGroup system. They do not delete or rewrite source text, labels, blocks, source ranges, source artifacts, or ContentGroupMember rows unless the parent ContentGroupMember itself is deleted.

## 17.1 Petal

`Petal` is a local part inside a ContentGroup.

It replaces the valid part of the older child-label idea: describing a semantic part inside a larger content package.

Examples:

```text
ContentGroup: Green's Theorem

petals:
  condition
  statement
  proof idea
  example
```

Petal is not a global schema field and not a fixed template slot. It is local to one ContentGroup.

Petal also owns traceable members:

```text
Petal
  id
  content_group_id
  label
  order
  members[]
```

`Petal.members[]` can reference ContentRanges, annotations, blocks, or future source/media/canvas regions, just like ContentGroup members.

V2.BN.8.6.9 applies the same integrity rule to Petal members. A Petal can display `source missing` or `unsupported` without deleting source text, labels, blocks, or the parent ContentGroup.

## 18. ContentGroup Identity / Status

The separate accepted-content object concept is retired in the active Better Notebook model.

In the current model, accepted identity means:

```text
ContentGroup.identity.status = accepted
```

The user still manages a ContentGroup. Engineering and AI projection layers should not introduce a separate accepted-content table, panel, or command target.

Examples:

- this ContentGroup is a definition;
- this ContentGroup is a theorem prerequisite;
- this ContentGroup is an example problem;
- this ContentGroup is a user's doubt or working step;
- this ContentGroup is source-backed evidence for a claim.

ContentGroup identity/status belongs to review. It should not be forced into user writing as a fixed global schema, and it should not become a second persisted object users have to maintain.

## 19. GroupFolder / ContentGroup Gallery

`ContentGroup Gallery` is the user-facing browsing surface over GroupFolders and ContentGroups.

It replaces the earlier narrow `ContentGroupIndex / Group Index` framing.

Examples:

- all definitions in this note;
- definitions plus theorems in this chapter;
- all examples related to demand;
- all user-marked doubts;
- all source-backed evidence candidates.

The Gallery should usually be scoped by GroupFolder:

```text
Project root folder
  all project groups

Note root folder
  groups organized for this note

User-created folder
  custom cross-note / cross-project collection

AI temporary folder
  projected working set for one user request
```

Query/list views can still exist, but they should be derived views over ContentGroups and folders, not a second truth table.

The earlier "all of X" list need should be handled through Gallery filters, search, or AI-created temporary folders, not manual AnnotationSets.

## 20. AnnotationSet

`AnnotationSet` is now a legacy / transitional organizer.

The V2.BN.8.6.6 implementation can remain as a useful seed, but the product direction should not keep expanding AnnotationSet as the primary content package model.

Because the product has not been deployed as a real user dataset, compatibility is not a product requirement. Future work may delete and rebuild AnnotationSet rather than preserve a migration adapter.

Its former responsibilities split into:

- ContentGroup for serious content packages;
- GroupFolder / ContentGroup Gallery for organization and dynamic user-facing lists;
- CompositeEndpoint / RelationEndpoint for relation-side grouped premises;
- Annotation display / marker controls for visible label management.

Historical note:

V2.BN.8.6.6 makes AnnotationSet an active editor seed:

- sets can be created from selected annotations;
- sets can store label, description, color token, ordered member ids, and kind;
- supported set kinds are `collection`, `sequence`, `all_of`, and reserved `custom`;
- members can be added, removed, and reordered;
- deleting a set does not delete member AnnotationTruth records;
- reading projection can print set kind, ordered members, previews, and child summaries.

Future work should decide whether to migrate this seed into ContentGroup / GroupFolder / ContentGroup Gallery rather than preserving a separate user-facing AnnotationSet concept.
The preferred direction is now stronger: migrate useful implementation ideas into ContentGroup / GroupFolder / Gallery, and remove AnnotationSet from the normal product model.

## 21. ReadingInterpretation

`ReadingInterpretation` is AI's temporary reading/proposal layer.

It may propose annotations, topics, ContentGroups, Petals, and relation candidates. It may also read legacy child labels while the old annotation UI exists.

It is not truth until reviewed and accepted.

## 22. Relation / ObjectRelation

`ObjectRelation` remains semantic relation truth.

After the TextFlow-first / ContentGroup-aware turn, future relation endpoints should prefer serious packages and interpreted objects:

```text
ContentGroup
accepted ContentGroup identity
CompositeEndpoint
NoteBlock
SourceRegion
CanvasObject / media region future
```

AnnotationTruth can still be a lightweight input signal or fallback endpoint, but it should not be the only endpoint model.

Relations should not be created just because two objects are visually close or connected by a drawn line.

## 22. Source And Provenance

Source truth remains separate from annotation truth.

```text
Link
  navigation

SourceReference
  provenance / evidence

AnnotationTruth
  confirmed label / marker

ContentGroup
  packaged content candidate

ObjectRelation
  semantic relation
```

One object can participate in all four, but they must not collapse into one concept.

## 23. User-Facing Translation

The UI should not expose every internal term.

```text
TextUnit
  shown as row / paragraph / list item / heading line

TextUnitGroup
  shown only as legacy grouped lines if the seed remains; otherwise replaced by ContentGroup workflow

SelectionDraft
  shown as current selection / temporary highlight / selection toolbar

AnnotationTruth
  shown as label / highlight / named selection / reading mark

AnnotationDisplayState
  shown as label display on / off

AnnotationSet
  shown as legacy group / collection only while the seed exists; not a product destination

GroupFolder
  shown as folder / collection / gallery section / organization area

ContentGroup
  shown as saved selection / content package / knowledge candidate / extracted piece

Petal
  shown as part / piece / local component inside a content package

ContentGroup identity/status
  not shown as a separate object; accepted ContentGroup identity may be shown as confirmed content group / AI-reviewed item

ContentGroup Gallery / derived group views
  shown as folder view / definitions list / examples list / topic list / content group gallery

ReadingInterpretation
  shown as AI suggestion / proposal / review panel
```

The product should feel like writing and marking a notebook, not operating a database.

## 24. Synchronization Rules

When this inventory changes, check:

- `PRODUCT.md`
- `docs/PRD.md`
- `docs/contracts/TextFlow-Contract.md`
- `docs/contracts/Annotation-Contract.md`
- `docs/contracts/ContentGroup-GroupFolder-Contract.md`
- `docs/contracts/Command-Surface-Contract.md`
- `docs/contracts/Block-Contract.md`
- `docs/contracts/Canvas-Page-Surface-Contract.md`
- `docs/contracts/Link-Source-Relation-Boundary-Contract.md`
- `docs/contracts/Source-Provenance-Contract.md`
- `docs/Coincides-Relation-Product-Design.md`
- `docs/Coincides-Better-Notebook-Roadmap.md`
