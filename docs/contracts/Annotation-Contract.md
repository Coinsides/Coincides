> **状态 (Status)**: draft
> **层 (Layer)**: 契约 / Contract
> **日期 (Updated)**: 2026-06-23
> **权威 (Authoritative)**: 否
> **取代 (Supersedes)**: —
> **被取代 (Superseded by)**: —

# Annotation Contract

**Status**: V2.BN.8.6 annotation editor seed, updated after ContentGroup model realignment

**Purpose**: define how Coincides records durable labels / marks on top of natural writing, canvas objects, source snapshots, media regions, and future relation endpoint candidates.

This document is not a rich text editor spec, not a global taxonomy of knowledge roles, and not the relation runtime. It defines the annotation marker layer that sits above TextFlow / ContentRange and feeds future GroupFolder / ContentGroup, ContentGroup identity/status, Relation, and AI reading workflows.

## 1. Core Position

Coincides now separates content, marks, content packages, and interpretation:

```text
Block
  spatial / render / interaction root

TextFlow
  content root for natural writing

ContentRange
  location root inside TextFlow / source / future canvas objects

AnnotationTruth
  durable label / marker root

ContentGroup
  serious content package candidate

ContentGroup accepted identity
  accepted / reviewed state of a ContentGroup; not a separate object or table
```

The user writes naturally first. The user or AI may later mark meaningful ranges. A mark becomes durable only after it is confirmed as `AnnotationTruth`.

This avoids forcing every idea into a block type, a role schema, or a fixed field template.

2026-06-22 clarification: a Label is a useful visible mark and a reusable range package. It is not the final content package and should not be expanded into a second knowledge-object system. Serious packaging belongs to ContentGroup; local internal roles belong to Petal.

## 2. AnnotationTruth

`AnnotationTruth` is a confirmed, addressable label / marker object.

It may represent:

- a definition label chosen by the user;
- a theorem, example, exercise, claim, evidence, step, topic, warning, personal remark, or any other user label;
- a project-local or note-local meaning;
- an AI-proposed label accepted by the user;
- an input signal for future ContentGroup / accepted identity / relation work.

It does not require a global canonical role.

V2.BN.8.6 adds an important editor rule: multiple annotations may point to the same range or overlapping ranges. This is normal and must not be treated as a conflict. The render layer can summarize stacked labels, but the truth layer must preserve every confirmed annotation.

After the ContentGroup realignment, AnnotationTruth should not be treated as the complete content-package truth. It is a durable mark over a range. Some annotations may inform ContentGroup creation; many annotations are only personal or organizational marks such as "hard", "review later", or "unclear". Accepted identity belongs to the ContentGroup, not to the annotation itself.

Suggested first-version fields:

```text
AnnotationTruth
  id
  note_id
  raw_label
  ranges
  parent_annotation_id
  children
  visual_style
  status
  created_by
  created_at
  updated_at
  metadata
```

Important rules:

- `raw_label` preserves what the user or accepted proposal actually called the mark.
- `raw_label` is not normalized into a forced global role such as definition/example/claim.
- Similar labels may later be grouped, searched, or interpreted by AI, but that interpretation is not the annotation truth.
- An annotation can be meaningful even if it is only a word, a sentence, several non-contiguous spans, a whole block, an image region, or a future source snapshot region.
- `parent_annotation_id` is the parent/child hierarchy truth. `children` or `child_annotation_ids` may remain as compatibility/cache, but new readers should prefer the child-side parent id.
- Not every annotation becomes a ContentGroup. Annotation is a lightweight marker; ContentGroup is a more serious content package.

## 3. Annotation Range

`AnnotationRange` points to what was marked.

First-version candidate targets:

```text
TextUnit range
Text span inside TextUnit
TextUnitGroup range helper
InlineStructure anchor
NoteBlock
CanvasObject
Image region
Table region future
SourceSnapshotObject / SourceRegion future
```

Suggested first-version shape:

```text
AnnotationRange
  id
  target_type
  target_id
  anchor
  quote_snapshot optional
  range_role optional
  status
```

`anchor` may be coarse in V2.BN.8.5. It only needs to be stable enough for local selection, highlight, and debug display. High-quality range recovery can mature later.

V2.BN.8.6 supports:

- precise text-span ranges inside a TextUnit;
- multi-TextUnit or multi-range annotations;
- whole-block annotation ranges;
- future `canvas_object` ranges as reserve for V2.BN.8.7.

V2.BN.8.6.1 adds a selection boundary: annotation ranges should be created from Coincides `SelectionDraft` rather than directly trusting browser-native selection. Browser selection can provide pointer/offset signals, but it is not the annotation range truth.

The first editor seed may still use conservative range rebasing after arbitrary text edits. It should not silently expand a partial text selection into a whole block unless the user explicitly chose block-level annotation.

## 4. Child Annotation

Child annotations are optional refinements inside a larger annotation.

Example:

```text
AnnotationTruth
  raw_label: "Power series definition"
  ranges:
    selected paragraph region
  children:
    raw_label: "term name"
    raw_label: "description"
    raw_label: "condition"
```

Child annotations are not required for every annotation. They exist when the user or AI needs finer resolution.

This replaces the old idea that every role must have a fixed global slot schema. Slot-like behavior can emerge from child annotations, but the system should not force all users into a predefined slot template.

Superseding note:

After the ContentGroup / Petal model matured, child annotations should not continue growing as the main internal-structure model. Annotation is now a visible label / marker layer. The valid "part inside a larger knowledge package" responsibility moves to `Petal` inside `ContentGroup`.

V2.BN.8.6.1 interaction rule:

```text
select existing parent annotation
  -> select a subrange inside that parent annotation
  -> toolbar offers Add child label
  -> child AnnotationTruth stores the subrange
  -> parent.child_annotation_ids includes the child id
```

Child annotation creation should not primarily be a generic Inspector text field that duplicates the whole parent range. The Inspector may display, rename, hide, show, or delete children while legacy child labels remain, but new product design should prefer creating Petals inside ContentGroup.

V2.BN.8.6.2 hierarchy truth rule:

```text
parent_annotation_id === null
  -> root annotation
  -> may render as a top-level Annotation Stack card

parent_annotation_id !== null
  -> child annotation
  -> must render inside its parent annotation context
  -> must not appear as a sibling top-level card by default
```

Parent / child lifecycle:

```text
hide parent
  -> child is hidden from normal visual surfaces through parent context

delete parent
  -> descendants must not remain as visible child ghosts

delete child
  -> parent remains active
```

The conservative V2.BN.8.6.2 behavior is that parent deletion cascades visual deletion to descendants, while child deletion does not delete the parent.

## 5. AnnotationSet Legacy / Migration Boundary

`AnnotationSet` is a V2.BN.8.6.6 editor seed for grouping `AnnotationTruth` objects. After the 2026-06-18 ContentGroup model realignment, it should be treated as transitional / legacy product language rather than the main user-facing content package model.

Because the product has not been used as a production dataset, migration compatibility is not required. AnnotationSet may be removed and rebuilt as ContentGroup instead of adapter-preserved.

It was useful when several annotations needed to be handled together.

Examples:

```text
AnnotationSet: "Power Series prerequisites"
  AnnotationTruth: definition of sequence
  AnnotationTruth: theorem about convergence
  AnnotationTruth: example problem

AnnotationSet: "Assignment 1 step chain"
  AnnotationTruth: step 1
  AnnotationTruth: step 2
  AnnotationTruth: step 3
```

Suggested first-version fields:

```text
AnnotationSet
  id
  note_id
  label optional
  members
  ordering
  status
  metadata
```

Earlier wording allowed `AnnotationSet` to appear as a group, collection, or knowledge cluster. The newer model routes those responsibilities differently:

```text
multiple ranges / annotations packaged together
  -> ContentGroup

user-facing list of definitions / examples / theorems
  -> GroupFolder / ContentGroup Gallery view

relation-side composite premise
  -> CompositeEndpoint / RelationEndpoint

visible label management
  -> Annotation display / marker layer
```

V2.BN.8.6 stores AnnotationSet as a service and persistence seed. A full set editor is not required yet.

V2.BN.8.6.6 upgrades `AnnotationSet` from a seed into the first editable organization surface.

Active V2.BN.8.6.6 fields:

```text
AnnotationSet
  id
  note_id
  canvas_id
  label
  description optional
  set_kind
  annotation_ids ordered
  visual_style optional
  status
  created_at
  updated_at
  metadata
```

`set_kind` currently supports:

```text
collection
  these labels belong together

sequence
  these labels should be read in this order

all_of
  these labels act together as a prerequisite / composite pack

custom
  reserved for later product language
```

Legacy rules while AnnotationSet still exists in code:

- The legacy AnnotationSet seed may contain independent AnnotationTruth objects.
- AnnotationSet is not a child label. Child labels explain a subrange inside one parent annotation.
- Removing an annotation from a set must not delete the AnnotationTruth.
- Deleting a set must not delete its member annotations.
- Member order is meaningful for `sequence` and future AI reading projection.
- New product work should not expand AnnotationSet as the main route for content lists or relation endpoints. Prefer ContentGroup / GroupFolder / ContentGroup Gallery / accepted ContentGroup identity / CompositeEndpoint.
- If this implementation is useful, migrate its label, description, color, ordering, and member management ideas into ContentGroup / Petal / GroupFolder / ContentGroup Gallery rather than preserving AnnotationSet as a separate destination.

## 6. CompositeEndpoint

`CompositeEndpoint` is the technical role a relation runtime may use when one side of a relation is made from multiple accepted objects.

Example:

```text
from: CompositeEndpoint(A, B)
relation: implies / prerequisite_for
to: ContentGroup(C)
```

In product language, the user may see a content pack, accepted content group, or relation premise. In relation runtime, the same accepted pack may behave as a composite endpoint.

Do not assume AnnotationSet is enough. The preferred long-term path is ContentGroup / GroupFolder / ContentGroup Gallery / accepted ContentGroup identity / CompositeEndpoint.

## 7. ReadingInterpretation

`ReadingInterpretation` is AI's temporary interpretation layer.

It may include:

- topic segmentation;
- possible labels;
- possible Petals inside ContentGroups;
- possible legacy child annotations while the old UI exists;
- possible relation candidates;
- confidence;
- rationale;
- source hints.

It is not truth.

Flow:

```text
AI reads note/source
  -> proposes ReadingInterpretation
  -> user reviews
  -> accepted parts become AnnotationTruth / ContentGroup / accepted ContentGroup identity / relation proposal
```

The system should be comfortable with AI using local labels. It should not require AI to squeeze every note into a universal canonical role set.

## 8. AnnotationProposal

`AnnotationProposal` is the reviewable output of a ReadingInterpretation.

It may propose:

- new AnnotationTruth;
- edits to existing AnnotationTruth;
- child annotations;
- ContentGroup membership / packaging;
- ContentGroup identity update;
- possible relation endpoint candidates.

It is not truth until accepted.

Suggested first-version fields:

```text
AnnotationProposal
  id
  note_id
  proposed_label
  proposed_ranges
  proposed_children
  rationale
  confidence optional
  status
```

Statuses:

```text
draft
accepted
rejected
superseded
```

Accepted proposals should write or update AnnotationTruth. Rejected proposals should remain inspectable only if the product needs audit/debug history.

V2.BN.8.6 keeps ReadingInterpretation and AnnotationProposal as local proposal/debug seeds. No external AI call is implied by this contract.

## 9. Relation Endpoint Reserve

Future relation endpoints may point to:

```text
ContentGroup
accepted ContentGroup identity
CompositeEndpoint
AnnotationTruth as lightweight input / fallback
NoteBlock
TextFlow range
SourceRegion
CanvasObject / media region future
```

The preferred semantic endpoint is `ContentGroup`, accepted ContentGroup identity, or a future `CompositeEndpoint`, because they preserve a traceable content package plus a reviewable identity layer.

`AnnotationTruth` may be enough for simple user-facing marks, but it should not be the only semantic endpoint model. `TextUnitGroup` may help stabilize a row range, but it is a transitional helper, not the semantic endpoint by default.

## 10. Source-Backed Range Editing Reserve

Annotation range previews are inspectable views over source text, not detached editable copies.

V2.BN.8.6.2 defines the first source-backed editing rule:

```text
edit range preview text
  -> update original TextFlow source
  -> rebase affected annotation ranges
  -> preserve parent/child hierarchy
  -> mark ambiguous boundary-crossing ranges for review
```

`range_text_cache` is a cache. It must not become the content truth.

The first rebase seed supports same-TextUnit edits:

```text
range before edit
  -> unchanged

range after edit
  -> shifted by text delta

range overlapping edit boundary
  -> invalidated for manual review

full TextUnit range
  -> cache follows the updated TextUnit text
```

V2.BN.8.6.3 implements the first runnable source-backed loop:

```text
Annotation Stack range preview edit
  -> writes back to TextFlow / TextUnit source
  -> updates the edited annotation range
  -> rebases other same-TextUnit ranges
  -> refreshes range_text_cache
  -> preserves parent_annotation_id hierarchy
```

Exact edited ranges should follow the replacement text. Ambiguous overlapping child or sibling ranges should be preserved but marked for review instead of silently guessed.

## 11. Annotation Display State

Annotation display state is UI state, not AnnotationTruth.

V2.BN.8.6.4 adds a first display state:

```text
AnnotationDisplayState
  labelsVisible
```

Rules:

- Turning label overlay off must not hide, delete, rename, or mutate AnnotationTruth.
- Display filtering may hide highlights, local badges, block fallback badges, and overlay artifacts.
- Annotation Stack may still inspect selected annotations because inspection is management UI, not truth mutation.
- Draft selection highlight remains separate from label overlay visibility.
- Text-backed labels should prefer local TextUnit clusters. Block-level label badges are fallback for block annotation ranges only.

## 12. Non-Goals

V2.BN.8.6 does not need:

- global canonical role taxonomy;
- role slot editor;
- full AI interpretation engine;
- mature relation runtime;
- cross-project label normalization;
- AnnotationSet as the main user-facing knowledge list model;
- ContentGroup identity/status implementation beyond the written boundary and future routing;
- perfect range recovery;
- graph database integration.

## 13. Synchronization Rules

When this contract changes, check:

- `docs/contracts/TextFlow-Contract.md`
- `docs/contracts/Block-Contract.md`
- `docs/contracts/Notebook-Object-Inventory-Contract.md`
- `PRODUCT.md`
- `docs/PRD.md`
- `docs/Coincides-Better-Notebook-Roadmap.md`
- `docs/Coincides-Relation-Product-Design.md`
