# 2026-06-18 23:47 Meeting Notes - V2.BN.8.6.11 / 8.6.12 Test Review And Optimization Direction

## Meeting Topic

Record Henry's manual test feedback and optimization discussion for the recent two Better Notebook subversions:

- `V2.BN.8.6.11 GroupFolder Manager And ContentGroup Editor`
- `V2.BN.8.6.12 ContentGroup Stabilization And Relation Readiness Gate`

This note is for brainstorm / product-improvement tracking. It is not a final PRD, not a patch note, and not a completed acceptance report.

## Background

The current implementation reaches a hand-testable seed:

- `GroupFolder` exists as the organization/path layer.
- `ContentGroup` exists as the serious content package.
- The current UI is still a right-side Groups panel with a folder list, group list, and group detail editor.
- The full `ContentGroup Gallery` as a parallel surface is not yet implemented.
- Relation runtime is not implemented; only relation-readiness projection exists.

## Current UI Interpretation

### Right-Side Groups Panel

The current right-side panel temporarily carries multiple responsibilities:

- folder selection;
- new folder creation;
- new ContentGroup creation;
- visible ContentGroup list under the selected folder;
- selected-content candidate display.

This is a seed of the future Gallery, not the final Gallery.

### ContentGroup Detail Editor

Clicking one ContentGroup opens the current detail editor seed:

- title;
- folder path;
- topic / role / summary;
- identity status;
- members;
- petals.

This is a seed of the future single ContentGroup editor, not the final detailed editing surface.

### Gallery Entry Question

Current answer:

- there is no separate full Gallery entry yet;
- the right-side Groups panel acts as the current mini-gallery seed;
- future design should decide how the full Gallery is opened from note/page/canvas/home surfaces.

## Henry Test Feedback

### 2026-06-18 23:47 Round 1

### Passed / Acceptable

- TBD

### Confusing / Needs Explanation

- Difference between right-side Groups panel, future Gallery, and ContentGroup detail editor.
- Whether the current panel should be understood as a sidebar, mini-gallery, or temporary editor shell.
- How the final full Gallery should be entered.

### Bugs

- Dragging selected text into `New group` or an existing ContentGroup is not implemented yet.
  - Current behavior: user can select text and see a draft range, but cannot drag that selected content into a group as a member.
  - Desired behavior: selected text / draft range should be draggable into `New group` or an existing ContentGroup, then become a rough member for later detail editing.

### UX Friction

- The current right-side ContentGroups panel is visually and spatially too heavy.
  - It occupies a large part of the writing canvas.
  - It blocks the user's writing space instead of feeling parallel to writing.
  - The current width and two-column layout are not acceptable as a writing-time sidebar.
- The panel title `Content groups` may be unnecessary.
  - User enters this panel from the `Groups` button, so the title repeats known context.
  - Possible direction: remove the title and keep only a close button / compact control.
- The folder column is too wide in the current sidebar.
  - Current left folder area consumes horizontal space that should belong to writing.
  - Proposed direction: make folders a vertical strip above or beside the `New group` area, using the same width as the group list below.
  - The folder picker should feel parallel to the writing task, not like a full management panel.
- The detail editor opens too abruptly and feels over-exposed.
  - Entering a newly created group shows too many controls at once.
  - `Identity` should become a compact menu/select-style control rather than four exposed buttons.
  - `Save draft`, `Accept`, `Reject`, and `Archive` should not all sit as equal primary buttons in the first visible layer.

### Visual Design Concerns

- Current visual optimization does not match the earlier 2026-06-18 afternoon design discussion.
  - The current panel still reads like a large nested control box.
  - It needs to follow the VS Code Settings / property-sheet direction discussed earlier: quieter, sharper, less bubble-like, lower visual weight.
  - Right-side writing support should be compact and operational, not a large modal-like inspector.
- The current ContentGroup sidebar should be redesigned before it becomes the long-term Groups rail / Gallery entry.

## Optimization Directions

### 1. Clarify Surface Roles

Need a clear product distinction:

```text
Groups sidebar
  lightweight collector and quick navigator

ContentGroup Gallery
  full organization / browsing / batch-management surface

Single ContentGroup Editor
  detailed member, fragment, Petal, identity, and source-preview editor
```

The current implementation blends these roles because it is a seed. Future versions should separate them more clearly.

Current Henry interpretation:

- the sidebar should not try to be the full Gallery;
- the sidebar should be a lightweight rail for collection and quick operations;
- full organization and batch browsing should move to the future Gallery surface;
- detailed refinement should move to the single ContentGroup editor.

### 2. Define Gallery Entry

Open question:

- Should Gallery open from the right-side Groups button?
- Should Gallery be a parallel surface beside Page / Canvas?
- Should Gallery also exist at Home / Project level?
- Should clicking a folder path open the Gallery directly at that folder boundary?

### 3. Keep Sidebar Lightweight

The sidebar should probably avoid becoming a heavy nested editor.

Possible future rule:

```text
Sidebar collects and previews.
Gallery organizes.
Detail Editor refines.
```

Specific sidebar optimization directions from test:

- remove or collapse the `Content groups` title;
- keep close/exit control visible but compact;
- compress folder navigation into a narrow vertical region;
- align the folder/navigation width with the main group list width instead of using a large two-column split;
- avoid exposing identity state actions as multiple equal buttons in the sidebar detail view;
- route deeper editing to a full detail editor or Gallery, rather than overloading the sidebar.

### 5. Add Drag-To-Group Interaction

Selected content should be movable into ContentGroup by direct manipulation:

```text
select text / draft range
drag selected content into New group or existing ContentGroup
group receives a new rough member
source text remains in place
detail editor later refines the member into fragments / Petals
```

This interaction is important because it matches the "puzzle pieces into a sorting box" mental model discussed earlier.

### 4. Manual Testing Focus

Manual testing should verify:

- folder creation and selection;
- group creation under selected folder;
- selected text / label / block added as group members;
- group detail opens and returns correctly;
- member and Petal areas do not destroy original text;
- refresh preserves folders, groups, members, and identity status;
- current UI is understandable enough as a seed even if not final.

## Follow-Up Decisions

- [ ] Decide whether 8.6.11/8.6.12 need another small polish patch before moving forward.
- [ ] Decide the exact entry model for full ContentGroup Gallery.
- [ ] Decide whether the current right-side panel should remain a sidebar or be renamed / visually reduced.
- [ ] Decide what belongs in the single ContentGroup detail editor versus the Gallery.

## Related Documents

- `docs/releases/V2.BN.8/V2.BN.8.6.11-ContentGroupIndex-Seed-Plan.md`
- `docs/releases/V2.BN.8/V2.BN.8.6.12-ContentGroup-Stabilization-And-Relation-Readiness-Gate-Plan.md`
- `docs/releases/V2.BN.8/V2.BN.8.6.11-8.6.12-ContentGroup-Engine-Patch-Note.md`
- `docs/contracts/ContentGroup-GroupFolder-Contract.md`
- `docs/contracts/Command-Surface-Contract.md`
