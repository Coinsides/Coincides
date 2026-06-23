# 2026-06-22 ContentGroup Shell Gap Research Outline

## Purpose

This folder records the next ContentGroup visual-shell research pass.

The goal is not to immediately copy the OpenDesign HTML into React. The goal is to compare:

```text
OpenDesign shell ideal
vs
current V2.BN.8.7 ContentGroup implementation
vs
actual product doctrine after entity cutover
```

Then decide what should be added, what should be adapted, what should be ignored, and what must wait for later Canvas / projection work.

## Context

Current engineering state:

- V2.BN.8.7 is now `ContentGroup System Maturity`.
- ContentGroup, GroupFolder, ContentGroupMember, ContentGroupFragment, and ContentGroupPetal have been cut toward independent entity-backed truth.
- The workspace closure patch has classified the current dirty local workspace and verified the ContentGroup baseline.
- The next UI direction can now look at OpenDesign shell parity, but the shell should follow the data model, not overwrite it.

Current product boundary:

```text
Rail = collect
Gallery = organize
Single Editor = refine
```

Current doctrine:

- `ContentGroupMember` is group-local content truth.
- `ContentRange / SourceAnchor` is source-location truth.
- `preview_text` is display cache, not a second truth.
- `Petal` is internal ContentGroup structure, not a source-text Label.
- `GroupFolder` manages organization position, not source truth.
- CanvasObject / canvas projection is later, not part of this shell research unless used as a deferral boundary.

## Source Material

### OpenDesign shell references

Local copied references:

- local brainstorm assets folder: `assets/2026-06-20-contentgroup-visual-reference/opendesign-html/group-gallery.html`
- local brainstorm assets folder: `assets/2026-06-20-contentgroup-visual-reference/opendesign-html/groups-rail.html`
- local brainstorm assets folder: `assets/2026-06-20-contentgroup-visual-reference/opendesign-html/single-contentgroup-editor.html`

Original user-provided OpenDesign files:

- `C:/Users/70208/OneDrive/Desktop/Working/Open design/Coincides_Content_group_design/group-gallery.html`
- `C:/Users/70208/OneDrive/Desktop/Working/Open design/Coincides_Content_group_design/groups-rail.html`
- `C:/Users/70208/OneDrive/Desktop/Working/Open design/Coincides_Content_group_design/single-contentgroup-editor.html`

### Current implementation references

Rail:

- `client/src/pages/Notes/canvasEngine/panels/ContentGroupPanel.tsx`
- `client/src/pages/Notes/NoteDetail.module.css`

Gallery:

- `client/src/pages/GroupGallery/GroupGallery.tsx`
- `client/src/pages/GroupGallery/GroupGallery.module.css`
- `client/src/pages/GroupGallery/groupGalleryData.ts`

Single Editor:

- `client/src/pages/GroupGallery/SingleContentGroupEditor.tsx`
- `client/src/pages/GroupGallery/singleContentGroupEditorService.ts`

Shared data / behavior:

- `client/src/pages/Notes/canvasEngine/contentGroupService.ts`
- `client/src/pages/Notes/canvasEngine/contentGroupRepository.ts`
- `client/src/pages/Notes/canvasEngine/groupFolderService.ts`
- `client/src/pages/Notes/canvasEngine/groupFolderRepository.ts`
- `client/src/pages/Notes/canvasEngine/contentGroupSurfaceRoleService.ts`
- `client/src/pages/Notes/canvasEngine/contentGroupReuseService.ts`
- `client/src/pages/Notes/canvasEngine/runtimeDataTypes.ts`

Server/entity references:

- `server/src/services/contentGroups.ts`
- `server/src/services/groupFolders.ts`
- `server/src/routes/contentGroups.ts`
- `server/src/routes/groupFolders.ts`
- `server/src/db/migrations/031_v2_content_groups.ts`
- `server/src/db/migrations/032_v2_group_folders.ts`
- `server/src/db/migrations/033_v2_content_group_members.ts`
- `server/src/db/migrations/034_v2_content_group_petals.ts`

Docs:

- `docs/releases/V2.BN.8/V2.BN.8.7.4.1-Workspace-Closure-Before-OpenDesign-Shell-Patch-Note.md`
- `docs/releases/V2.BN.8/V2.BN.8.6.31-ContentGroup-OpenDesign-Visual-Parity-Plan.md`
- `docs/releases/V2.BN.8/V2.BN.8.6.31-ContentGroup-OpenDesign-Visual-Parity-Patch-Note.md`
- `docs/contracts/ContentGroup-GroupFolder-Contract.md`
- `docs/contracts/Petal-Contract.md`
- `docs/contracts/Notebook-Object-Inventory-Contract.md`
- `docs/releases/V2.BN.8/Open-Issue-And-Brainstorm-Checklist.md`

## Proposed Research Outputs

This research can produce four reports.

### Report 1: OpenDesign Shell Anatomy

Suggested file:

```text
2026-06-22-ContentGroup-Shell-Anatomy-Report.md
```

Purpose:

- Describe what the OpenDesign shell actually contains.
- Split it into stable ideas, decorative choices, interaction affordances, and mock-only assumptions.
- Identify which visual ideas are reusable without copying the HTML structure directly.

Questions:

- What does the shell make obvious that the current UI hides?
- Which controls are real product controls, and which are only visual decoration?
- Which information hierarchy is valuable across all three surfaces?
- Which shell features depend on data that already exists?
- Which shell features depend on data that does not exist yet?

Expected sections:

- Group Gallery shell anatomy.
- Groups Rail shell anatomy.
- Single ContentGroup Editor shell anatomy.
- Shared visual language: dark workspace, folder tree, chips, badges, role tabs, status signals.
- Mock-only items and dangerous assumptions.

### Report 2: Current Implementation Capability Map

Suggested file:

```text
2026-06-22-ContentGroup-Current-Capability-Map.md
```

Purpose:

- Describe what the current implementation already supports.
- Separate real data-backed capability from visual affordance.
- Prevent rebuilding features that already exist under a rougher shell.

Questions:

- What can Rail already do?
- What can Gallery already do?
- What can Single Editor already do?
- Which capabilities are backend/entity-backed and therefore safe to expose more visually?
- Which capabilities are only local/client-level helpers?
- Which capabilities are technically present but too hidden, ugly, or confusing to use?

Expected sections:

- Rail current state.
- Gallery current state.
- Single Editor current state.
- Entity-backed data available to UI.
- Current missing polish that is not actually missing functionality.
- Current missing functionality that cannot be solved by CSS.

### Report 3: Shell Gap Matrix And Version Proposal

Suggested file:

```text
2026-06-22-ContentGroup-Shell-Gap-Matrix-And-Version-Proposal.md
```

Purpose:

- Compare OpenDesign shell against current implementation.
- Decide what to build first.
- Produce an implementation order without turning visual shell work into CanvasObject work.

Questions:

- What does the shell have that the current product lacks?
- What does the current product have that the shell does not show?
- What looks beautiful but is not valuable enough to build now?
- What requires CanvasObject / projection and must be deferred?
- What should become the next small version?

Expected matrix columns:

```text
surface
shell feature
current support
data readiness
product value
implementation cost
risk
recommendation
target version
```

Recommendation categories:

```text
build now
adapt now
keep current behavior, reskin only
document and defer
reject / mock only
needs Henry decision
```

### Report 4: Cross-Surface Interaction Flow

Suggested file:

```text
2026-06-22-ContentGroup-Cross-Surface-Interaction-Flow.md
```

Purpose:

- Explain how the three shells should work together as one ContentGroup System.
- Describe how a user moves between Rail, Gallery, and Single Editor without losing context.
- Identify which transitions should feel instant, which should open a full page, and which should be deferred to Canvas projection.

Questions:

- What is the natural user flow from writing to collecting to organizing to refining?
- When should Rail open Gallery?
- When should Rail open Single Editor?
- When should Gallery open Single Editor?
- What state should be preserved across the transition: folder, note, group, selected member, active Petal, query, or mode?
- Which cross-surface interactions are already supported?
- Which cross-surface interactions only look possible in the shell but need later data/model work?
- How do we keep the surfaces visually related without making them all do the same job?

Expected sections:

- System-level mental model.
- Rail to Gallery.
- Rail to Single Editor.
- Gallery to Single Editor.
- Single Editor back to Gallery / source note.
- Shared state and URL/query semantics.
- Drag/drop and reference-flow assumptions.
- What must wait for CanvasObject / projection.

## Research Method

### Step 1: Read OpenDesign Shells

For each HTML shell:

- list visible regions;
- list controls;
- list status indicators;
- list drag/drop or interaction assumptions;
- list data fields implied by the UI;
- list features that are only mock data.

Do not copy HTML scripts or mock data into product code.

### Step 2: Read Current Product Surfaces

For each current surface:

- identify active user workflows;
- identify data-backed actions;
- identify hidden or awkward actions;
- identify missing empty/loading/error states;
- identify parts that violate the surface role boundary.

Use the three-surface doctrine:

```text
Rail = collect
Gallery = organize
Single Editor = refine
```

### Step 3: Build A Feature/Capability Matrix

Compare shell and current product feature by feature.

Important distinction:

```text
visual absence does not always mean product absence
visual presence does not always mean product readiness
```

Examples to watch:

- A shell card may show a status chip; current product may already have `ContentGroupStabilitySummary`.
- A shell folder tree may look like a resource manager; current product may already have entity-backed GroupFolder placement.
- A shell workbench may imply free canvas editing; current product should not fake CanvasObject maturity in 8.7.
- A shell Petal view may look like source labels; current product doctrine says Petal stays group-internal.

### Step 4: Separate Three Kinds Of Missing Work

Classify missing work as:

```text
visual shell gap
interaction/workflow gap
data model gap
```

This matters because:

- visual shell gaps can be fixed in the OpenDesign parity pass;
- workflow gaps need product behavior;
- data model gaps must wait for a later entity or CanvasObject version.

### Step 5: Produce A Version-Safe Recommendation

The final report should answer:

- What can enter the next Group Gallery shell parity patch?
- What should enter Groups Rail shell parity?
- What is safe to polish in Single Editor before Canvas?
- What should be explicitly deferred to 8.8+?
- What should be rejected because it only looks good in the prototype?

## Early Hypotheses To Verify

These are not conclusions yet.

### Likely Build Now

- Gallery folder tree density and hierarchy polish.
- Gallery card visual structure: role chip, topic signal, source note, stability/status chip.
- Search and mode tabs visual polish.
- Rail compact folder path and current-scope header.
- Rail group rows with clearer drop affordance and open-editor entry.

### Likely Adapt Now

- OpenDesign Gallery "Folder / Topic / Role" views, because current `GalleryMode` already exists.
- Gallery resource-manager layout, because GroupFolder entities and placements now exist.
- Compact status language, because stability summary already exists.
- Topic/role visual language, because identity topic/role already exists.

### Likely Defer

- Full Single Editor workbench/canvas redesign.
- Canvas-object-like free placement of member pieces.
- ContentGroup projection as canvas object.
- Source/evidence drawer if it requires SourceArtifact / SourceAnchor maturity.
- Relation endpoint / graph view behavior.

### Needs Careful Comparison

- Whether Gallery should show all groups across workspace by default or keep current scoped folder behavior.
- Whether Rail should include Topic / Role / All mode tabs or stay even lighter.
- Whether Single Editor should use the OpenDesign "workbench" look now as a static layout, or wait until Canvas foundations are ready.
- Whether OpenDesign shell omits some current power features that should remain visible.

## Non-Goals

This research does not implement:

- OpenDesign shell React rewrite.
- CSS reskin.
- CanvasObject / canvas projection.
- relation runtime.
- GraphRAG.
- SourceArtifact / SourceAnchor migration.
- destructive source mutation.
- true reorder / offset rebase.

## Done Criteria For The Research Pass

The research pass is complete when:

- OpenDesign shell features have been listed and classified.
- Current implementation capabilities have been listed and classified.
- Each gap has a recommendation.
- The next implementation surface is chosen.
- The report clearly says what not to build yet.
- Henry can read the output and decide the next small version without scanning code.
