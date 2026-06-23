# Command Surface Contract

Status: V2.BN.8.6.5 seed contract, updated after TextFlow-first / ContentGroup realignment

## Purpose

Command surfaces are contextual user command entry points. They include right-click menus, TextUnit handle menus, future mini toolbars, and future keyboard-command entry points.

This contract exists because Better Notebook now has multiple command surfaces that look similar but operate on different truth layers. Text selection acts on `SelectionDraft` and `TextFlow`; label operations act on `AnnotationTruth`; row handles act on `TextUnit`; folder/gallery operations act on `GroupFolder`; package operations act on `ContentGroup`; block shell controls act on `NoteBlock` placement and rendering.

## Product Language

- Internal model: `AnnotationTruth`, `SelectionDraft`, `TextFlow`, `TextUnit`, `GroupFolder`, future `ContentGroup`.
- User-facing language: `Label`, `Folder`, `Content package`, `Part`, `Turn into`, `Inline`, `Open label`.
- User-facing menus should say `Label`, not `Annotate`.
- `AnnotationTruth` remains the internal durable label / marker object.
- `ContentGroup` is the future serious content package, and should not be confused with casual visible labels.

2026-06-22 clarification: Annotation Stack internal menus still need a future refresh after the ContentGroup / Petal turn. They should not keep adding child-label or AnnotationSet-specific actions as if those were long-term product roots.

## Surface Kinds

- `text_selection`
- `annotation_range_preview`
- `annotation_highlight`
- `annotation_badge`
- `text_unit_handle`
- `text_unit_group`
- `group_folder_reserved`
- `content_group_reserved`
- `block_shell_reserved`
- `canvas_blank_reserved`
- `canvas_object_reserved`

## Menu Inventory Status

Every researched or planned menu must have one explicit status:

- `active`: implemented and user-visible in the current product.
- `reserved`: designed in contract, not yet user-visible.
- `deferred`: intentionally postponed to another version.
- `removed`: previously considered or implemented but intentionally removed.

## Menu Inventory

| Surface | Status | First active version | Owner layer | User name | Internal name | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Text selection menu | active | V2.BN.8.6.5 | TextFlow / SelectionDraft | Selection menu | `text_selection` | Normal text selection context menu. |
| Annotation range preview menu | active | V2.BN.8.6.5 | AnnotationTruth / TextFlow | Range menu | `annotation_range_preview` | Label panel range preview menu; `Label` becomes `Child label`. |
| Annotation highlight menu | active | V2.BN.8.6.5 | AnnotationTruth | Label menu | `annotation_highlight` | Highlight-level management seed. |
| Annotation badge right-click menu | deferred | TBD | AnnotationTruth | Badge menu | `annotation_badge` | Badge uses click / double-click first because the target is small. |
| Annotation Stack internal menu refresh | reserved | TBD | AnnotationTruth / ContentGroup | Stack menu | `annotation_stack_internal_refresh` | Existing stack range / child-label menu needs redesign after child label and AnnotationSet retreat; mark only, do not expand in the current patch. |
| TextUnit handle menu | active | V2.BN.8.6.5 | TextUnit | Row menu | `text_unit_handle` | TextUnit writing-role command seed. |
| TextUnitGroup rail menu | transitional | V2.BN.8.6.6 | TextFlow legacy | Row group menu | `text_unit_group` | Writing-layer group commands for grouped rows; should be removed or rewritten into ContentGroup workflow. |
| Annotation Organizer commands | transitional | V2.BN.8.6.6 | AnnotationSet legacy | Label set organizer | `annotation_set` | Existing seed for grouping labels; migrate useful behavior into ContentGroup / Petal / GroupFolder / Gallery. |
| GroupFolder / Gallery commands | active seed | V2.BN.8.6.11 | GroupFolder | Folder / Gallery | `group_folder` | Folder create/select and group move/create seed inside the Groups panel. |
| ContentGroup organizer commands | active seed | V2.BN.8.6.11 | ContentGroup | Content package | `content_group` | Serious package creation and add-selected seed; full Gallery/detail editor remains future polish. |
| Block shell menu | active seed | V2.BN.8.6.12 | Block shell | Block menu | `block_shell` | Block-level shell actions now include Add block to content group. |
| Canvas blank menu | deferred | TBD | Canvas / PageFrame | Canvas menu | `canvas_blank_reserved` | Deferred until Canvas engine and CanvasObject work matures. |
| CanvasObject menu | deferred | V2.BN.8.7+ | CanvasObject | Object menu | `canvas_object_reserved` | Depends on image / drawing / shape object seed. |
| Comment / Label Comment menu | deferred | TBD | Label Comment | Comment | `label_comment_reserved` | Comment is not peer to Label; future Label Comment design. |
| Mini toolbar | deferred | Better Notebook polish | TextFlow formatting | Mini toolbar | `mini_toolbar_reserved` | Writing-format helper, not core command foundation. |
| Relation endpoint menu | deferred | Relation version | Relation | Relation menu | `relation_endpoint_reserved` | Future relation creation / inspection surface. |
| Source attach / cite menu | deferred | Source / relation version | SourceReference | Source menu | `source_attach_reserved` | Future source citation and attachment surface. |

## Text Selection Menu

Active first-level items:

- `Copy`
- `Cut` (visible, disabled until custom multi-range text mutation is safe)
- `Paste` (visible, disabled until custom paste routing is safe)
- `Label`
- `Add to content group`
- `Open groups`

Active submenus:

- `Turn into`: Heading, Quote, Bullet list, Numbered list, To-do list, Toggle list.
- `Inline`: Formula and Code are reserved disabled entries.
- `Link`: reserved disabled entry.

Rules:

- Text selection menus must not show block shell actions.
- `Duplicate block`, `Delete block`, `AI visibility`, and `Export status` must not appear here.
- `Turn into` can operate on the whole TextUnit touched by the selection.
- Inline conversion is reserved until TextFlow inline structure editing is stable.

## Annotation Range Preview Menu

Active first-level items:

- `Copy`
- `Cut` (visible, disabled)
- `Paste` (visible, disabled)
- `Child label`

Reserved submenus:

- `Inline`: Formula and Code.
- `Link`.

Rules:

- Annotation range preview menus use `Child label` instead of `Label`.
- Range preview is a light editing projection over source TextFlow, not a second text truth.
- Full rich text / inline structure sync is not required in V2.BN.8.6.5.

## Annotation Highlight Menu

Active first-level items:

- `Open label`
- `Hide label`
- `Copy`
- `Add label to content group`

Reserved / disabled:

- `Change color` is visible but routes users to the Annotation Stack color palette for this version.
- `Remove label from this range` is visible but disabled until multi-range disambiguation is stable.

Rules:

- Do not show `Rename` here.
- Rename belongs to badge double-click or the Label panel.
- If a highlighted area contains multiple labels, open the Label panel for the cluster before destructive edits.

## TextUnit Handle Menu

Active first-level items:

- `Turn into`: Text, Heading, Quote, Bullet list, Numbered list, To-do list, Toggle list.
- `Label this unit`.
- `Group selected rows` when two or more TextUnits in the same TextBlock are selected.

Reserved / disabled:

- `Split block from here`
- `Extract to new block`
- `Duplicate unit`
- `Delete unit`

Rules:

- This menu is line / paragraph / TextUnit level.
- It must not own inline formula/code/link.
- Structural commands require undo and split/merge rules before activation.

## TextUnitGroup Rail Menu

Active first-level items:

- `Rename group`
- `Ungroup`
- `Delete group`

Rules:

- This surface acts on `TextUnitGroup`, not AnnotationTruth.
- Ungrouping or deleting a TextUnitGroup must not delete source TextUnits.
- This menu must not expose semantic label or relation commands.
- Future ContentGroup creation may consume selected rows/ranges, but it should be exposed as a content-package action rather than hidden inside row grouping language.
- Long-term product direction is to remove this surface or rewrite it into ContentGroup creation / editing.

## Annotation Organizer Commands

Active entries:

- Open label organizer from Annotation Stack.
- Open label organizer from annotation highlight context menu.
- Create set from selected labels.
- Create set from the current label.
- Add selected labels to an existing set.
- Remove a label from a set.
- Reorder set members.

Rules:

- AnnotationSet commands currently operate on groups of confirmed labels.
- Legacy child label creation remains inside the Annotation Stack / parent annotation flow, not the Organizer.
- AnnotationSet is transitional after the ContentGroup realignment. New product design should prefer ContentGroup for serious packages, Petal for internal parts, GroupFolder / ContentGroup Gallery for organization and dynamic lists, and CompositeEndpoint for relation-side grouped premises.
- Command surfaces must not pretend relation runtime exists yet.

## Annotation Stack Internal Menu Refresh

Status: reserved / marked for later.

The Annotation Stack currently still carries legacy child-label and range-preview operations. After the ContentGroup realignment:

- Child label is no longer the main way to model internal knowledge parts; Petal inside ContentGroup is the preferred long-term direction.
- AnnotationSet should not keep growing as a label-grouping product surface.
- Stack range text can still expose copy and local editing commands, but serious content packaging should route toward ContentGroup.
- Do not expand this menu in the current patch. Revisit it when Annotation Stack is simplified around label inspection and ContentGroup/Petal entry points.

## ContentGroup Commands

Active seed entries:

- Create content package from selection / ranges.
- Create content package from a label.
- Create content package from a block.
- Add current item to a specific content package row in the Groups Rail.
- Create / rename / delete part inside content package.
- Add selected range to part.
- Add selected label to content package.
- Add selected block to content package.

Reserved entries:

- Remove one specific range from content package through a context menu.
- Split one rough member into exact fragments from the future full detail editor.
- Review / accept content package identity.
- Show content package in ContentGroup Gallery.

Rules:

- ContentGroup commands are more serious than `Label`.
- They may use existing annotations as input, but they must also support unannotated ContentRanges.
- ContentGroup and Part commands should write member references, not copied text.
- They should be reviewable before future relation runtime consumes them.
- Do not introduce a separate accepted-content command target here. An accepted ContentGroup remains a ContentGroup with accepted identity/status.

## ContentGroup Command Surface Status

Commands must be marked as one of:

- `ready`: the command has a clear target and writes or navigates immediately.
- `opens_surface`: the command only opens Rail / Gallery / Editor and must be named as such.
- `disabled_with_reason`: the command is visible but cannot run, with a plain explanation.
- `hidden_until_ready`: the command is not exposed because it would create noise or false expectations.
- `deferred`: the command is recorded for a later version.

Rules:

- No ContentGroup command may appear as a primary visible button unless it has a clear target and a clear writeback result.
- `Create group` may create a new ContentGroup from the current selection, label, or block.
- `Add current item` must live on a specific group row or drop target, because it needs a target group.
- `Open groups` is the correct label when the command only opens the rail.
- Disabled inline, link, and petal-assignment commands should not sit in the main selection toolbar.

## GroupFolder / Gallery Commands

Active seed entries:

- Create folder.
- Select folder.
- Create ContentGroup in selected folder.
- Move ContentGroup to selected folder.

Reserved entries:

- Open full ContentGroup Gallery.
- Rename folder.
- Move folder.
- Copy folder.
- Delete user-created folder when safe.
- Add selected ContentGroup to folder.
- Remove ContentGroup from folder.
- Open relation view from current folder boundary.
- Save temporary AI projection folder.
- Discard temporary AI projection folder.

Rules:

- GroupFolder commands organize ContentGroups; they do not edit source text or member references.
- GroupFolder commands must not create ObjectRelation truth by themselves.
- Move/copy folder changes organization, not provenance.
- Do not add `pin`, `link folder`, or shortcut semantics in this contract yet.

## Deferrals

- Canvas blank menu is deferred until Canvas engine object work is stable.
- Comment is reserved as future Label Comment, not a peer to Label.
- Word-like mini toolbar is a future writing helper, not a core command foundation.
