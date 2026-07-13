> **状态 (Status)**: active（⚠️ 日落中,见下方公告）
> **层 (Layer)**: 契约 / Contract
> **日期 (Updated)**: 2026-07-13
> **权威 (Authoritative)**: 是（仅至 V2.BN.11.1 落地）
> **取代 (Supersedes)**: —
> **被取代 (Superseded by)**: —（V2.BN.11.1 落地后整体转 superseded）

> **日落公告 (Sunset · 2026-07-13)**: V2.BN.11 已拍定**花瓣退役**（2026-07-11 Relation 卷 §二十;概念设计 v1.1 §5）。本契约描述的机制在 `V2.BN.11.1` 停止产生新数据（代码手术:client 模型/CRUD/Single Editor 入口 → server hydrate/replace/prune）,migration 047 删除三张支持表。**§4 "Petal 可投影为细粒度 relation endpoint 候选"已被取代:Relation 唯一 durable endpoint = Item（卡）**,权威见 `docs/agent-ops/analysis/relation-item-graph-concept-design.md`（v1.1）。在 11.1 落地前,本契约对仍在运行的旧代码依然是准确描述。

# Petal Contract

**Status**: V2.BN.8.7.4 entity boundary contract

**Purpose**: define `Petal` as the local role layer inside a `ContentGroup`.

Petal is not a child label, not a global schema field, and not a source object.
It is the place where a rough content package can be refined into local parts such as concept name, condition, statement, description, example, result, or any other role that only needs to make sense inside the current group.

## 1. Boundary

```text
ContentGroup
  serious content package
  owns top-level member references

ContentGroupMember
  traceable source pointer
  may point to a range, label, block, content group, or future region

ContentGroupFragment
  local split of one top-level member
  keeps source_member_id
  may narrow to a content range

Petal
  local role inside one ContentGroup
  references fragments and may keep legacy member references during migration
```

The source text, label, block, table, image, or future object remains outside the Petal.
Deleting a Petal must not delete the original source, the parent ContentGroup member, or any label.

## 2. Why Petal Exists

Users may first throw rough pieces into a ContentGroup:

```text
ContentGroup: Power Series Definition
  member: label "definition" with three ranges
  member: draft range with one explanatory sentence
  member: block reference with a worked example
```

That rough package is useful, but still messy. Petal lets the user or AI refine the inside of the package:

```text
Petal: concept name
  fragment from label range: "power series"

Petal: description
  fragment from label range: "a series of the form ..."

Petal: example result
  fragment from block member: "radius of convergence is ..."
```

The important point is that these local roles do not become a global fixed template.
Another group may use petals named `claim`, `evidence`, `setup`, `answer`, or anything else.

## 3. Data Rules

Petal references should prefer fragments:

```ts
ContentGroupV1 {
  members: ContentGroupMemberV1[];
  fragments?: ContentGroupFragmentV1[];
  petals: ContentGroupPetalV1[];
}

ContentGroupFragmentV1 {
  source_member_id: string;
  content_range: AnnotationRangeV1 | null;
  label?: string | null;
  preview_text?: string | null;
}

ContentGroupPetalV1 {
  label: string;
  fragment_ids?: string[];
  members: ContentGroupMemberV1[]; // legacy/display compatibility only
}
```

Rules:

- `source_member_id` must point to a top-level ContentGroup member.
- a fragment may reuse the whole member if the member cannot be split yet.
- a fragment may narrow to one range inside a multi-range label.
- one top-level member may feed multiple Petals.
- removing a fragment from a Petal removes only the Petal reference.
- top-level members remain the source package truth.

After V2.BN.8.7.4, Petal and Fragment are entity-backed:

- `content_group_fragments` owns Fragment rows;
- `content_group_petals` owns Petal rows;
- `content_group_petal_fragments` owns Petal-to-Fragment assignment;
- `ContentGroupV1.fragments[]` and `ContentGroupV1.petals[]` remain the client DTO shape;
- `petals.members[]` remains compatibility/display payload, not active source truth.

Deletion rules:

- deleting a Petal removes the Petal row and assignment rows;
- deleting a Petal does not delete Fragment rows, ContentGroupMember rows, source text, labels, blocks, or source ranges;
- deleting a Fragment removes the Fragment row and assignment rows;
- deleting a ContentGroupMember removes dependent Fragments and dependent Petals inside the same ContentGroup write.

## 4. Relation Boundary

Petal can later be projected as a fine-grained relation endpoint candidate:

```text
ContentGroup endpoint
  Power Series Definition

Petal endpoint
  Power Series Definition / condition
```

This contract does not create relation truth.
It only guarantees that a future relation system can address a smaller local part without losing provenance.

## 5. UI Boundary

The expected first workflow is:

```text
1. Add rough members into a ContentGroup.
2. Open Single ContentGroup Editor.
3. Create Petals.
4. Assign member fragments into Petals.
5. Edit/rename/remove Petals without moving source writing.
```

Petal editing belongs to the Single ContentGroup Editor, not the note writing surface and not the lightweight Groups Rail.

## 5.1 Source-Surface Display Boundary

Petal should not appear as a standalone label directly on source text by default.

Reason:

- a Label belongs to the visible reading surface;
- a Petal belongs to a parent ContentGroup;
- showing Petal like another free-floating label creates "label on label" confusion.

If Petal is projected back onto source text, it must be shown through a parent ContentGroup context such as an active Single Group Editor, ContentGroup Lens, selected group overlay, or "used in this group" inspection state. The base text layout should not shrink or reorder just to show Petal structure.

## 5.2 V2.BN.8.7 Refinement Boundary

V2.BN.8.7 adds the first mature Petal refinement pass:

- Petal order is a ContentGroup-local structure order.
- Moving a Petal must not move, rewrite, or rebase any source text.
- Moving a Petal must preserve top-level `ContentGroupMember.current_content`.
- Moving a Petal must preserve `ContentGroupMember.source_ref` and its snapshot fields.
- Moving a Petal must preserve `ContentGroupFragment` records and move fragment ownership with the Petal.
- Petal reorder must not create a source-text Label, source projection, or CanvasObject projection.

The Single ContentGroup Editor may expose drag sorting for Petals, but the operation is still a pure ContentGroup refinement action. It belongs to `Single Editor = refine`, not to Rail collection and not to Gallery organization.

## 6. Non-Goals

Petal v1 must not:

- revive child labels as a knowledge schema;
- require global role presets;
- own raw source text;
- delete source content when removed;
- decide relation truth;
- implement relation runtime, source-text projection, or CanvasObject projection as part of Petal refinement.
