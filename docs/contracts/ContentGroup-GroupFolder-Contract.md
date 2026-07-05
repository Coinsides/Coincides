> **状态 (Status)**: active
> **层 (Layer)**: 契约 / Contract
> **日期 (Updated)**: 2026-06-23
> **权威 (Authoritative)**: 是
> **取代 (Supersedes)**: —
> **被取代 (Superseded by)**: —

# ContentGroup / GroupFolder Contract

**Status**: V2.BN.8.7.4 entity boundary contract

**Purpose**: define the boundary between `GroupFolder` organization and `ContentGroup` content packaging after the 2026-06-18 ContentGroup Editor realignment.

This is not a database migration plan, final UI mockup, or relation runtime spec.

## 0.0 2026-06-22 Active Doctrine

The active model after the 2026-06-20 reflection is:

```text
Label
  visual marker / reusable range package

ContentGroup
  serious content package

Petal
  local role inside one ContentGroup

GroupFolder
  resource manager and browsing path
```

ContentGroup is not a prettier AnnotationSet. It is the object the user or AI uses when several fragments should be treated as one meaningful package. GroupFolder is not semantic truth; it controls where groups live, how Gallery browses them, and what boundary a later relation view can use.

The three editor surfaces have fixed responsibilities:

```text
Groups Rail
  collect quickly in the current scope

Group Gallery
  organize folders and groups across workspace / project / note scopes

Single ContentGroup Editor
  refine one group into members, fragments, and Petals
```

## 0. Implementation Checkpoint

V2.BN.8.6.11 / V2.BN.8.6.12 turns this contract from direction into an initial runtime seed.

Current implementation facts:

- `GroupFolderV1` exists as the organization/path object.
- Project and Note system root folders are seeded from note runtime metadata.
- `ContentGroupV1.folder_id` and `ContentGroupV1.placements` replace `depth` as the primary organization path.
- `ContentGroupFragmentV1` exists so a rough member can later be refined into Petals.
- Petal's local-role boundary is defined in `docs/contracts/Petal-Contract.md`.
- `ContentGroupIndex` is a derived list from current groups and folders, not a new truth table.
- Relation endpoint candidates are projections from accepted/active ContentGroups and their members/Petals; no relation edge truth is created here.

V2.BN.8.7.1 cuts the first real database boundary:

- `ContentGroup` now has an independent backend root table, `content_groups`.
- Active Rail / Gallery / Single Editor save paths write ContentGroups through `/api/content-groups`.
- Legacy note metadata groups under `canvas_engine_content_groups_v1` are read only as import/fallback input when a note has no entity-backed groups yet.
- `GroupFolder` and primary ContentGroup folder placement are entity-backed after V2.BN.8.7.2.
- Legacy folder metadata under `canvas_engine_group_folders_v1` is import input only and is stripped after successful entity import.
- `ContentGroupMember` is stored in `content_group_members` after V2.BN.8.7.3.
- `ContentGroupFragment` is stored in `content_group_fragments` after V2.BN.8.7.4.
- `ContentGroupPetal` is stored in `content_group_petals` after V2.BN.8.7.4.
- Petal-to-Fragment assignment is stored in `content_group_petal_fragments` after V2.BN.8.7.4.
- View state and miscellaneous group metadata remain embedded payloads.
- `ContentGroupMember` is a group-owned child entity, not a global Gallery object or standalone product surface.

V2.BN.8.6.26 adds a stronger resource-manager safety layer:

- folder deletion checks both child folders and active ContentGroups placed in that folder;
- Gallery disables delete unless the selected folder is an empty user-created folder;
- ContentGroup index uses folder path first, then recent update time inside the folder;
- helper functions expose folder children and delete eligibility so UI does not duplicate folder safety rules.

V2.BN.8.7 starts the resource-manager maturity pass:

- `activeGroupFolders` exposes active folders for normal Gallery / Rail browsing;
- archived folders are excluded from default active folder children;
- management checks can still include archived children so parent deletion cannot silently strand archived organization state;
- moving a ContentGroup between folders changes `folder_id` / `placements` only and must preserve member `current_content` and `source_ref`;
- deleting a non-empty folder remains blocked unless an explicit future destructive mode is introduced.

V2.BN.8.6.27 through V2.BN.8.6.30 add the current editor foundation:

- V2.BN.8.6.27 keeps Groups Rail as a lightweight collection surface, not a full editor.
- V2.BN.8.6.28 seeds Petal fragment assignment inside the Single ContentGroup Editor.
- V2.BN.8.6.29 lets Draft Range / Label drops create copied TextBlocks on Page / Canvas surfaces.
- V2.BN.8.6.30 lets Draft Range / Label drops copy-insert into existing TextFlow, while destructive move / reorder and offset rebase remain deferred.

Current implementation stop:

- one primary folder placement is supported;
- folder move/create and group move/create are seeded in the note-side Groups panel;
- full drag-and-drop Gallery, global cross-project Gallery, and relation graph UI remain future work;
- old groups without folder placement are still shown from the Note root as compatibility orphans until test data is reset.

## 1. Core Split

```text
Project / Note
  document scope

GroupFolder
  organization, placement, path, browsing boundary, and relation-view boundary

ContentGroup
  serious content package made from traceable member references

ContentGroupMember / PetalMember
  source pointers into text, labels, blocks, source regions, media regions, or other content objects

Petal
  local part inside a ContentGroup
```

For detailed Petal rules, especially the fragment-first model and source-preservation boundary, see `docs/contracts/Petal-Contract.md`.

## 1.2 ContentGroup Editor Surfaces

V2.BN.8.6.27 fixes the first implementation split between the three ContentGroup surfaces:

```text
Groups Rail
  collect surface
  lightweight current-scope intake
  active group selection
  quick jump to Gallery / Single Editor

Group Gallery
  organize surface
  full-page resource manager
  folder tree and derived topic / role views

Single ContentGroup Editor
  refine surface
  one ContentGroup at a time
  member and Petal workbench
```

Rules:

- Rail is not the full ContentGroup editor;
- Rail should not show full topic / role / summary forms;
- Rail should not manage Petals;
- Gallery owns broad organization;
- Single Editor owns detailed refinement.

The short rule:

```text
Folder organizes.
Folder path derives depth.
Folder boundary limits relation view.
ContentGroup stays focused on content.
```

## 1.3 Member / Source Boundary

V2.BN.8.7 starts making the previously discussed boundary explicit in runtime data:

```text
ContentGroupMember
  group-local content truth

ContentRange / SourceAnchor
  source location truth

preview_text
  display cache only
```

V2.BN.8.7.3 changes ContentGroupMember persistence:

```text
ContentGroupMember
  stored in content_group_members
  owned by exactly one ContentGroup
  kept as ContentGroupV1.members[] at the client API boundary
```

Rules:

- `current_content` is the member-local content truth;
- `source_ref` / `content_range` locate where the member came from;
- `preview_text` is a display cache, never a second content truth;
- deleting a member is hard deletion;
- any embedded Petal or fragment that depends on the deleted member is removed in the same write;
- deleting a member does not mutate source text, source ranges, labels, or blocks.

A member can now carry:

```text
current_content
  the member text/content as currently organized inside this ContentGroup

source_ref
  source artifact, note/block/range pointer, source snapshot, hash, and sync status

source_sync_status
  fresh | changed | missing | detached | unsupported
```

Rules:

- editing a member does not automatically edit the original source range;
- editing source text does not automatically rewrite a member;
- comparing with source may mark a member `changed` or `missing` without changing `current_content`;
- refreshing from source is an explicit operation that updates `current_content`, `preview_text`, and the source snapshot;
- applying member content back to source is still a separate action boundary and is not implemented automatically in this pass.

V2.BN.8.7.4 changes Petal / Fragment persistence:

```text
ContentGroupFragment
  stored in content_group_fragments
  owned by exactly one ContentGroup
  points to one ContentGroupMember through source_member_id

ContentGroupPetal
  stored in content_group_petals
  owned by exactly one ContentGroup
  uses content_group_petal_fragments for fragment assignment
  keeps members_json only as compatibility/display payload
```

Rules:

- removing a fragment from a Petal removes only the assignment row;
- deleting a Petal removes the Petal row and assignment rows;
- deleting a Fragment removes the Fragment row and assignment rows;
- deleting a ContentGroupMember removes dependent fragments and dependent Petals;
- none of these operations mutate source text, labels, blocks, source ranges, or source artifacts.

## 1.4 Stability Summary Boundary

V2.BN.8.7 adds a lightweight `ContentGroupStabilitySummary` helper for edge-state readability.

It covers:

- deleted group;
- empty group;
- empty Petal;
- changed member source;
- missing / unsupported member source;
- deleted source note context;
- archived folder context;
- accepted identity with stale member/source state;
- unavailable materialize target.

Rules:

- the summary is derived state, not a new truth table;
- it must not repair source text automatically;
- it must prefer clear disabled reasons over silent mutation;
- Rail, Gallery, and Single Editor may show the primary state, but should not become full integrity inspectors;
- materialize and identity acceptance should respect `can_materialize`, `materialize_disabled_reason`, and `accept_disabled_reason`.

## 1.1 Item Drag Payload

V2.BN.8.6.25 establishes `Draft Range`, `Label`, and `Block` as the first supported draggable content items.

V2.BN.8.6.25.1 hardens the Draft Range drag affordance:

- Draft Range drag starts from a floating handle above the selected text;
- the handle must not participate in text flow or shift writing layout;
- clicking the handle must not clear the current Draft Range;
- dragging from the handle still writes `kind: draft_range`;
- Page / Canvas / TextBlock-body drop-to-block remains guarded until a dedicated projection version.

```text
Draft Range
  temporary range package from the current selection draft

Label
  named, durable range package backed by AnnotationTruth

Block
  visible block shell / rendering object used as a group member reference
```

Payload rules:

- new Draft Range writes use `kind: draft_range`;
- legacy `kind: draft_ranges` may be read only for compatibility;
- Label payloads should include `annotation_id`, `label`, and ranges when available;
- Block payloads should include `block_id`, label, and preview when available;
- empty range arrays are invalid;
- unknown payload kinds are ignored.

Drop rules:

- dropping into a ContentGroup creates member references;
- dropping into a ContentGroup must not move, delete, or rewrite the source text/block;
- member preview text is cache, not source truth;
- source reference and content range are the truth;
- document/page/canvas drop creates visible content only when a safe copy/projection path exists;
- destructive move semantics require a later explicit mode and undo.

## 2. GroupFolder

`GroupFolder` is the organization object for ContentGroup work.

It answers:

- where is this ContentGroup organized?
- what browsing path does the user see?
- what local collection is the ContentGroup part of?
- what relation view boundary should be used when the user opens a local graph from here?
- what context should AI read before scanning the groups inside this area?

It does not answer:

- what does the content mean?
- which exact source ranges make up the content?
- which Petal is concept name, condition, example, proof idea, or result?
- which semantic relation is true?

Those belong to `ContentGroup`, members, Petals, and later relation truth.

## 3. One Folder Type

There should be one `GroupFolder` object type.

Do not split the model into separate scoped folder types such as:

- project folder;
- note folder;
- cross-project folder;
- pinned folder;
- linked folder;
- shortcut folder.

The same folder type should support:

- system-created roots;
- user-created folders;
- AI-created temporary projections;
- cross-note organization;
- cross-project organization;
- nested folders;
- move / copy operations.

This keeps the model simple and avoids future adapter debt.

## 4. System Root Folders

Project and Note are document scopes, not GroupFolders.

However, each Project and Note may own a system root GroupFolder:

```text
Project
  system Project root GroupFolder

Note
  system Note root GroupFolder
```

Rules:

- the root folder is lifecycle-bound to its Project or Note;
- the root folder is system-created;
- the user cannot delete it while the owning Project or Note exists;
- deleting the Project or Note may delete or archive its bound root folder;
- the root folder can contain ordinary user-created folders and ContentGroups.

This gives ContentGroup Gallery a stable starting point without pretending Project or Note is itself a ContentGroup.

## 5. Folder Path And Derived Depth

`ContentGroup.depth` should not be a primary field.

Depth is derived from folder position:

```text
GroupFolder.path
  -> derived browsing depth
  -> derived graph scope
  -> derived AI reading context
```

Earlier draft language used:

```text
depth = 0 project
depth = 1 note
depth >= 2 content-level groups
```

The corrected direction is:

```text
Project root folder
  project-level organization boundary

Note root folder
  note-level organization boundary

Nested user folders
  progressively finer organization boundaries
```

The folder path is the depth. The ContentGroup does not need to store its own main depth number.

## 6. ContentGroup Placement

A ContentGroup belongs to one or more organizational contexts through folder placement.

First implementation may allow one primary folder placement. Future versions may allow additional references if needed, but the product should start conservatively.

Folder placement does not rewrite source truth:

```text
ContentGroup
  members[] -> source references / ContentRanges / labels / blocks / future regions

GroupFolder
  contains / organizes ContentGroup references
```

Moving a ContentGroup between folders changes organization, not the underlying member references.

## 7. ContentGroup As Member

A ContentGroup may reference another ContentGroup as a member.

That is a content reference, not folder nesting.

Example:

```text
ContentGroup: Power Series Applications
  member: ContentGroup(Power Series Definition)
  member: ContentGroup(Convergence Theorem)
  member: text range from engineering note
```

This lets a group compose other groups without confusing the folder tree with the content graph.

## 8. Move, Copy, And No Pin

Supported folder operations:

- create folder;
- rename folder;
- move folder;
- copy folder;
- delete user-created folder when safe;
- add ContentGroup to folder;
- remove ContentGroup from folder;
- reorder / sort later.

Do not introduce `pin`, `link folder`, or shortcut semantics now.

Reason:

- pin/link/shortcut semantics are harder than move/copy;
- they blur organization and reference truth;
- they create lifecycle questions before the product needs them.

## 9. Temporary AI Projection Folders

AI may create a temporary GroupFolder projection for a user request.

Example:

```text
User:
  Show everything related to power series across my math, engineering, and CS projects.

AI:
  creates temporary GroupFolder
  copies references to relevant ContentGroups into it
  opens a relation / gallery view from that folder boundary
```

Rules:

- original ContentGroups are not moved;
- source truth is not rewritten;
- the temporary folder can be saved as a normal folder if the user likes it;
- the temporary folder can be discarded if the user rejects it.

Possible folder state:

```text
origin: user | system | ai
status: active | temporary | archived
```

## 10. Relation Boundary

GroupFolder does not own relation truth.

It defines the boundary for relation display and exploration.

```text
ObjectRelation
  durable semantic relation truth

GroupFolder
  current graph / gallery scope
```

Opening a graph from a folder should mean:

```text
show relations among ContentGroups in this folder boundary
plus optional related external groups if the user expands the scope
```

This supports note-local, project-local, and cross-project views without creating fake relation facts.

## 11. Source / Provenance Boundary

GroupFolder placement is not provenance.

ContentGroup members preserve traceability to their original ranges, labels, blocks, source regions, or future media/table/canvas regions.

Folder copy or move must not create a new source chain unless the user explicitly creates a new derived artifact.

## 11.1 Reuse Action Boundary

V2.BN.8.7 defines the first service vocabulary for ContentGroup reuse:

```text
Reference
  points to an existing ContentGroup without copying members or changing body data

Duplicate
  creates a new ContentGroup copy in the current context

Fork
  creates a new ContentGroup copy with lineage metadata for local editing

Materialize
  creates a plan to write members into note blocks, one member = one block in the first version

Open original
  navigates to the original group / note / folder context
```

Rules:

- `Reference` returns a descriptor, not copied body data;
- `Duplicate` and `Fork` create new group identities;
- `Fork` preserves `forked_from_group_id` / lineage metadata;
- `Materialize` returns a plan and does not directly mutate TextFlow;
- materialize plans set `moves_source = false`;
- Canvas projection / CanvasObject reuse remains deferred.

## 12. Product Surfaces

The ContentGroup Editor direction has three surfaces:

```text
Right rail
  lightweight entry point and current-scope folder/group list

ContentGroup Gallery
  folder-oriented browsing surface parallel to the note/page surface

ContentGroup Detail Editor
  one group at a time; member management, Petals, source previews, identity/status
```

The right rail should not become a nested bubble stack. Prefer a quiet property-sheet / VS Code Settings-like style for dense controls.

## 13. Acceptance Checklist

- [ ] `GroupFolder` is documented as an organization/path object.
- [ ] `ContentGroup` is documented as a content package, not a folder.
- [ ] Project/Note root folders are system-created and lifecycle-bound.
- [ ] ContentGroup depth is derived from GroupFolder path.
- [ ] Temporary AI projection folders are allowed without moving originals.
- [ ] Relation graph boundary can be opened from a folder without changing relation truth.
- [ ] Source/provenance stays with ContentGroup members, not folder placement.
