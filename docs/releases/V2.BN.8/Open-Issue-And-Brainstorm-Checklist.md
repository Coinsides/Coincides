# V2.BN.8 Open Issue And Brainstorm Checklist

## 2026-06-23 V2.BN.8.7.9.0 Workspace Commitability Cleanup

status: first cleanup pass complete
date: 2026-06-23

- [x] Write `V2.BN.8.7.9.0-Workspace-Commitability-Cleanup-Patch-Note.md`.
- [x] Write `V2.BN.8.7.9.0-Workspace-Commitability-Cleanup-Report.md`.
- [x] Write `V2.BN.8.7.9.0-Commit-Boundary-Plan.md`.
- [x] Write `V2.BN.8.7.9.0-Main-Group-Verification-Report.md`.
- [x] Classify dirty workspace into commitability boundaries.
- [x] Delete ignored generated build output directories `client/dist` and `server/dist`.
- [x] Keep `tmp` and `.codex-tmp` as ignored local backup / visual-evidence folders.
- [x] Run main group verification across backend, frontend, editor foundation, server foundation, and docs.
- [ ] Stage and verify backend ContentGroup entity cutover as a coherent commit boundary.
- [ ] Stage and verify frontend ContentGroup surfaces as a coherent commit boundary.
- [ ] Audit broader Better Notebook foundation work before staging.
- [ ] Stage docs / contracts / design evidence after deciding whether to split into smaller documentation commits.

Rule:

- The current workspace problem is commitability, not trash.
- Do not use broad `git add .`, broad `git clean`, or destructive reset.
- Stage one coherent boundary at a time.

## 2026-06-23 V2.BN.8.7.9 ContentGroup System Closure Gate

status: completed closure gate before CanvasObject work
date: 2026-06-23

- [x] Add `V2.BN.8.7.9-ContentGroup-System-Closure-Gate-Plan.md`.
- [x] Audit ContentGroup / GroupFolder / Member / Petal / Fragment active truth after entity cutovers.
- [x] Browser-smoke Petal reorder with at least two Petals.
- [x] Browser-smoke member-to-Petal assignment after the Single Editor shell refactor.
- [x] Browser-smoke Rail direct `Open editor`.
- [x] Browser-smoke richer Gallery folder move/delete with at least two folders and a non-empty group.
- [x] Run Gallery and Single Editor narrow/mobile viewport check.
- [x] Write `V2.BN.8.7.9-ContentGroup-System-Closure-Gate-Report.md`.
- [x] Decide whether V2.BN.8.7 can close and V2.BN.8.8+ can start CanvasObject work.

Closure result:

- [x] V2.BN.8.7 can close as the ContentGroup System maturity lane.
- [x] V2.BN.8.8+ can start CanvasObject / projection work from a stabilized ContentGroup foundation.
- [ ] Carry forward richer mobile/narrow Gallery polish to 8.8+.
- [ ] Carry forward ContentGroupProjection / usage records to CanvasObject work.
- [ ] Carry forward Reference / Duplicate / Fork / Materialize UI to Canvas interaction design.
- [ ] Carry forward SourceArtifact / SourceAnchor full system to a dedicated source architecture pass.

Closure principle:

- 8.7.9 is not another ContentGroup feature expansion.
- Reuse language can stay as a stable service boundary, but mature reuse UI depends on CanvasObject / projection.
- CanvasObject is the medium that makes ContentGroup reference, projection, and materialization feel natural; without it, reuse should not be forced into awkward UI.
- Any work requiring SourceArtifact / SourceAnchor, CanvasObject projection, Materialize UI, relation runtime, GraphRAG, destructive source mutation, true reorder, or offset rebase must be recorded as 8.8+ or later, not implemented inside 8.7.9.

## 2026-06-22 V2.BN.8.7.8 Single Editor Scope Guard

status: first scoped pass complete; richer interaction smoke remains
date: 2026-06-22

- [x] Keep Single Editor workbench/free-canvas behavior deferred to 8.8+.
- [x] Compare current implementation with `single-contentgroup-editor.html` after the non-canvas shell pass.
- [ ] Browser-smoke Petal reorder with at least two Petals.
- [ ] Browser-smoke member-to-Petal assignment after shell refactor.
- [x] Keep source text mutation, source-text Petal projection, CanvasObject projection, and Materialize UI out of 8.7.8.

Reason:

- V2.BN.8.7.8 intentionally focuses on `Single Editor = refine`.
- The OpenDesign prototype is a visual and mental-model target, but its free workbench/canvas area depends on the later CanvasObject track.
- The current useful work is to stabilize title/status/summary/member/Petal/source logic and make the page feel like a focused refinement surface.

## 2026-06-22 V2.BN.8.7.6 Groups Rail Shell Follow-up

status: deferred after Groups Rail OpenDesign shell parity
date: 2026-06-22

- [ ] Decide whether Rail `Folder / Topic / Role / All` tabs should remain lightweight current-note modes or become richer mini-Gallery modes.
- [ ] Decide whether the Rail folder selector should stay shallow, or whether folder selection should always open Gallery for full organization work.
- [ ] Run a richer pointer drag/drop browser smoke into an expanded group with selected text / label / block data.
- [ ] Run create-from-selected-content smoke with a fresh live selection after the next manual pass.
- [ ] Run mobile/narrow viewport Rail shell smoke.
- [ ] Keep Single Editor OpenDesign shell alignment outside 8.7.6. Non-canvas refine shell is now tracked in 8.7.8; true workbench/canvas behavior remains 8.8+.

Reason:

- V2.BN.8.7.6 intentionally focused on Rail as the `collect` surface.
- The OpenDesign prototype is the visual target, but full organization still belongs to Gallery.
- Rail collect actions must update ContentGroupMember truth only and must not mutate source text.

## 2026-06-22 V2.BN.8.7.5 Gallery Shell Follow-up

status: deferred after Gallery OpenDesign shell parity
date: 2026-06-22

- [ ] Decide whether Gallery should add an explicit `All` view, or keep all-groups discovery through search plus Topic / Role views.
- [ ] Keep saved graph scopes out of real Gallery data until graph scope/runtime exists.
- [ ] Defer ContentGroup projection / materialization UI to 8.8+ CanvasObject / projection work.
- [ ] Defer Reference / Duplicate / Fork / Materialize card actions until reuse UI is designed.
- [ ] Run a richer Move-here browser smoke with at least two folders and a non-empty card target.
- [ ] Run a mobile/narrow viewport Gallery shell smoke.

Reason:

- V2.BN.8.7.5 intentionally focused on Gallery as the `organize` surface.
- The OpenDesign prototype is the visual target, but graph scopes and projection-like actions are mock/future signals, not current 8.7 truth.
- Gallery folder placement must keep meaning organization position only, not source movement.

## 2026-06-22 V2.BN.8.7.4.1 Workspace Closure Follow-up

status: documented follow-up after local workspace inventory
date: 2026-06-22

- [ ] Decide whether the superseded `V2.BN.8.7-CanvasObject-Media-Annotation-Drawing-Image-Seed-Plan.md` should be renamed or moved into an 8.8+ planning lane.
- [ ] Decide whether older V2.BN.8.2-V2.BN.8.6 plans should remain directly in the release folder or get an archive/index convention.
- [ ] Decide whether 2026-06-18 cleanup/audit brainstorm reports should remain in the main brainstorm folder or move under a historical audit subsection.

Reason:

- The 8.7.4.1 inventory found no obvious generated / temporary files to delete.
- Most untracked files are active ContentGroup System code, backend entity cutover files, release plans, contracts, or historical design evidence.
- Workspace cleanup should therefore proceed by baseline preservation and documentation decisions, not broad deletion.

## 2026-06-22 Frontend Bundle Cleanup Follow-up

status: deferred optimization; not part of V2.BN.8.7.2 data cleanup patch
date: 2026-06-22

- [ ] Investigate Vite production build warnings about large chunks.
- [ ] Review `taskStore` import shape: it is dynamically imported by `goalStore` but also statically imported by several UI pages/components, so Vite cannot split it into a separate chunk.
- [ ] Decide whether this should become a later frontend performance cleanup patch with route-level splitting or manual chunks.

Reason:

- This is a bundle/performance optimization issue, not a ContentGroup / GroupFolder data-truth issue.
- It should not block the V2.BN.8.7.2 GroupFolder entity cleanup patch.

## 2026-06-22 V2.BN.8.7.1-8.7.3 Entity Cutover Follow-up

status: 8.7.1 through 8.7.3 engineering passes complete; Petal / fragment entity cut remains pending
date: 2026-06-22

Completed in 8.7.1 through 8.7.3:

- [x] Add independent `content_groups` backend table.
- [x] Add `/api/content-groups` entity routes.
- [x] Add frontend repository boundary for entity-first ContentGroup load/save.
- [x] Import legacy note metadata groups only when a note has no entity-backed groups.
- [x] Stop normal Rail / Gallery / Single Editor save paths from writing ContentGroup arrays into note metadata.
- [x] Strip legacy `canvas_engine_content_groups_v1` during folder-only metadata saves.
- [x] Keep runtime ids such as `content-group-*` valid instead of forcing UUID-only ContentGroup ids.
- [x] Cut `GroupFolder` / primary folder placement into independent entities.
- [x] Cut `ContentGroupMember` into `content_group_members` as a group-owned child entity.
- [x] Keep `ContentGroupV1.members[]` stable at the client boundary while moving active member persistence out of `members_json`.
- [x] Use hard delete for ContentGroupMember and prune dependent embedded Petals / fragments in the same write.

Still pending after 8.7.3:

- [x] V2.BN.8.7.4 plan written: cut `ContentGroupPetal` / fragment records into independent child entities.
- [x] V2.BN.8.7.4 implementation: table cutover, write path, cascade integrity, docs, verification.
- [ ] Decide whether 8.7.x needs a one-time local test-data cleanup script before deeper child-entity cuts.
- [x] Add browser/manual smoke for entity-backed create, edit, delete, reload, and Gallery navigation.
  - 2026-06-22 smoke result: Gallery Topic view, Single Editor hydration, Petal rename persistence, and Member-delete cascade pruning all passed.
- [x] Clarify Single Editor structure-save affordance: Petal rename is now a controlled local draft, and `Save draft` applies current Petal label drafts before identity changes.
  - 2026-06-22 patch result: editing a Petal label and clicking `Save draft` before a separate blur step persisted after backend read and browser reload.

Explicitly still out of scope:

- [ ] SourceArtifact / SourceAnchor full migration.
- [ ] ContentGroupProjection / CanvasObject reuse.
- [ ] Relation runtime / GraphRAG.
- [ ] Destructive source mutation, true reorder, or offset rebase.

## 2026-06-22 V2.BN.8.6.27-8.6.30 Deferred Scope Register

status: active follow-up register
date: 2026-06-22

This section records the functions that were deliberately left out while implementing V2.BN.8.6.27 through V2.BN.8.6.30. These are not accidental omissions. They were held because the current small versions needed to establish safe foundations first: scope-aware Groups Rail, Petal v1, copied drop-to-block, and copied TextFlow insertion.

### V2.BN.8.6.27 Scope-Aware Groups Rail v2

Deliberately deferred in 8.6.27:

- [ ] Project / Workspace level Rail entry outside the current note page.
- [ ] Folder row and group row context menus inside the Rail.
- [ ] Full GroupFolder manager inside the Rail.
- [ ] Petal assignment from the Rail.
- [ ] OpenDesign visual parity for the Rail.
- [x] Page / Canvas drop-to-block was deferred from 8.6.27 and then picked up by V2.BN.8.6.29 as a first foundation pass.

Reason:

- Groups Rail must stay a lightweight collect surface.
- Full organization belongs to Group Gallery.
- Full refinement belongs to Single ContentGroup Editor.

### V2.BN.8.6.28 Single ContentGroup Editor / Petal v1

Deliberately deferred in 8.6.28:

- [ ] Petal drag sorting.
- [ ] AI-created Petals.
- [ ] Table / image / canvas-object internal fragments.
- [ ] OpenDesign visual parity for the Single ContentGroup Editor.
- [ ] Relation truth / mature relation endpoint behavior for ContentGroup and Petal.

Reason:

- 8.6.28 only established the first safe Petal boundary: Petal is a local part inside ContentGroup, and removing a Petal fragment must not delete source text, source label, or top-level ContentGroup members.

### V2.BN.8.6.29 Global Drop-to-Block Foundation

Deliberately deferred in 8.6.29:

- [x] Precise insertion into existing paragraphs was deferred from 8.6.29 and then picked up by V2.BN.8.6.30 as a copy-insert safety pass.
- [ ] Destructive move semantics.
- [ ] Complex block copy fidelity for non-simple blocks.
- [ ] Full drop preview polish.

Reason:

- Dropping into Page / Canvas creates copied visible content.
- Dropping into ContentGroup remains reference-only.
- Source text and labels must not be silently moved or destroyed.

### V2.BN.8.6.30 TextFlow Drag Insert Safety Gate

Deliberately deferred in 8.6.30:

- [ ] Destructive move.
- [ ] True reorder of original source text.
- [ ] Full offset rebase engine for AnnotationTruth ranges, ContentGroup member ranges, and Petal fragments.
- [ ] Cross-block precise move.
- [ ] Table / image / formula block internal drag.
- [ ] AI-driven TextFlow rewrite.
- [ ] Full undo stack support for drag insert / move operations.

Reason:

- 8.6.30 intentionally supports copy insertion first.
- Moving original text would mutate source offsets and can make AnnotationTruth, ContentGroup members, and Petal fragments stale.
- Destructive move / reorder should not ship until there is a real offset rebase strategy or a stronger history / undo gate.

### Priority Interpretation

Highest-risk deferred item:

- [ ] `move / reorder + offset rebase`.

This is the dangerous cluster. It should not be treated as a small UI patch because it changes source truth positions and can corrupt downstream references if implemented casually.

Useful later polish / feature items:

- [ ] Rail context menus.
- [ ] OpenDesign visual parity.
- [ ] Petal drag sorting.
- [ ] Complex block copy fidelity.
- [ ] Drop preview polish.

Future platform items:

- [ ] AI-created Petals.
- [ ] AI-driven TextFlow rewrite.
- [ ] Relation truth and mature endpoint behavior.
- [ ] Table / image / canvas-object internal fragment support.

## 2026-06-21 Post-8.6.28/29/30 Docs Sync Hold

status: pending until V2.BN.8.6.28, V2.BN.8.6.29, and V2.BN.8.6.30 implementation work is complete
date: 2026-06-21

This is a deliberate hold item. Another development thread is actively working on V2.BN.8.6.28 / 8.6.29 / 8.6.30, so the formal documentation sync should wait until those implementation patches settle. Do not update the core contract and review documents from this section while those small versions are still in motion unless Henry explicitly asks for an early sync.

When 8.6.28-8.6.30 are complete, run a focused docs sync pass and update:

- [ ] `docs/releases/V2.BN.8/README.md` with the post-8.6.22 sequence, including 8.6.23-8.6.31.
- [ ] `docs/releases/V2.BN.8/Plan.md` with a post-8.6.22 continuation lane instead of leaving 8.7 as the only visible next major step.
- [ ] `docs/releases/V2.BN.8/Review.md` with current 8.6.13-8.6.31 engineering review state.
- [ ] `docs/releases/V2.BN.8/Experience-Review.md` with current ContentGroup / GroupFolder / Petal / three-surface experience state.
- [ ] `docs/contracts/ContentGroup-GroupFolder-Contract.md` with the June 20 model: `Groups Rail = collect`, `Group Gallery = organize`, `Single ContentGroup Editor = refine`.
- [ ] `docs/Coincides-Relation-Product-Design.md` with the latest relation doctrine: relation is a recorded judgment / reasoning artifact, formal endpoints prefer ContentGroup / Petal, ContentRange is usually an evidence anchor, and ordinary note canvas should not default-render all relation lines.
- [ ] `docs/contracts/Notebook-Object-Inventory-Contract.md` with the clarified ContentGroup / Petal / ContentRange endpoint boundary.
- [ ] `PRODUCT.md` with a short product-positioning update: Coincides is also an AI-readable external reasoning workspace, not only a note/report surface.
- [ ] `docs/Coincides-Better-Notebook-Roadmap.md` with future Knowledge API / MCP / Skill / external-agent integration language, while keeping this outside the immediate Better Notebook UX implementation lane.

Reference notes for the later sync:

- Use `docs/brainstorm/产品完善/2026-06-20-Better-Notebook-ContentGroup-Reflection-Meeting-Notes.md` as the main meeting reference.
- Preserve the current implementation order: finish 8.6.28 / 8.6.29 / 8.6.30 first, then sync documents.
- Treat this as contract promotion, not broad rewriting: promote settled product decisions from brainstorm into formal docs, but avoid inventing new scope during the sync pass.

## 2026-06-18 TextFlow-First / ContentGroup Model Realignment

status: active model sync; branch documents must be updated before the next structural code pass
date: 2026-06-18

Henry and Codex re-evaluated the V2.BN.8.5-8.6 annotation direction after testing TextUnitGroup and AnnotationSet.

New root model:

```text
TextFlow
  content root

ContentRange
  location / anchor root

AnnotationTruth
  durable label / marker over a range

GroupFolder
  organization / path / Gallery scope / relation-view boundary

ContentGroup
  serious content package made from ranges

ContentGroup accepted identity
  accepted / reviewed state of a ContentGroup, not a separate object

ContentGroup Gallery / derived group views
  folder-scoped browsing and dynamic user-facing list views over ContentGroups
```

ContentGroup depth decision correction:

```text
GroupFolder.path
  derives browsing depth / graph scope / AI reading context

ContentGroup
  does not own primary depth
```

Rationale:

- Do not hard-code semantic scale names such as chapter, topic, section, or knowledge item into the ContentGroup itself.
- Folder path is a better organization primitive than a primary numeric depth field on ContentGroup.
- Project and Note can own system root GroupFolders without pretending Project/Note are ContentGroups.
- User-created and AI-created GroupFolders can collect cross-note / cross-project ContentGroups without moving source truth.
- Meaning belongs to ContentGroup identity / review; organization belongs to GroupFolder.

Core decisions:

- [x] Stop treating this branch as `annotation-first`.
- [x] Reframe it as `TextFlow-first / ContentGroup-aware`.
- [x] Treat AnnotationTruth as label / marker truth, not the default content-package truth.
- [x] Treat AnnotationSet as a V2.BN.8.6.6 transitional seed, not the long-term main object.
- [x] Route AnnotationSet responsibilities toward ContentGroup, GroupFolder / ContentGroup Gallery, CompositeEndpoint, and annotation display.
- [ ] Decide how much of the current AnnotationSet implementation should be migrated, renamed, hidden, or kept as compatibility.
- [ ] Design ContentGroup creation from selection, ranges, annotations, and AI proposals.
- [x] Retire primary ContentGroup `depth`; derive depth from GroupFolder path.
- [x] Design GroupFolder as the organization/path object for ContentGroup Gallery.
- [ ] Design ContentGroup Gallery as the user-facing "all definitions / all examples / all doubts" list surface instead of forcing manual sets.
- [ ] Update future relation endpoint language to prefer ContentGroup / accepted ContentGroup identity / CompositeEndpoint.
- [ ] Decide whether V2.BN.8 needs any extra cleanup subversion before later CanvasObject work.

Latest 2026-06-18 refinement:

- [x] Treat `TextUnitGroup` as ContentGroup's predecessor / inspiration, not a long-term independent object.
- [x] If TextUnitGroup can be rewritten into ContentGroup, rewrite it; otherwise remove it from normal UX.
- [x] Treat `ChildLabel` as superseded by `Petal` for ContentGroup internal parts.
- [x] Treat `AnnotationSet` as a removable seed, not a compatibility obligation.
- [x] Define `ContentGroup.members[]` as traceable member references, not copied text.
- [x] Define `Petal.members[]` with the same traceable member-reference model.
- [x] Keep `ContentRange` independent from ContentGroup as the location root.
- [x] Define GroupFolder as organization/path/relation-view boundary, not content truth.
- [x] Define Project/Note system root GroupFolders as lifecycle-bound roots.
- [x] Define AI temporary projection folders as discardable/savable working scopes.
- [x] Add V2.BN.8.6.7 as the planned ContentGroup rebuild / legacy retreat subversion.
- [ ] Execute `docs/releases/V2.BN.8/V2.BN.8.6.7-ContentGroup-Rebuild-And-Legacy-Retreat-Plan.md` before the V2.BN.8.7 ContentGroup System maturity pass.

### ContentGroup Editor Design Draft

status: active brainstorm; do not treat as implementation contract yet
date: 2026-06-18

Design style direction:

- [x] Prefer a `VS Code Settings` / sharp property-sheet style for ContentGroup panels and editor surfaces.
- [x] Avoid bubble-card stacking for dense editor UI.
- [x] Keep rounded bubble/card styling only where the workflow is already simplified and sparse.
- [ ] Translate this into a later visual spec for `ContentGroupPanel` and the full `ContentGroupEditor`.

User mental model:

```text
Source Note
  the original writing surface / puzzle-piece pile

Selection / Label / Block / future media region
  rough content fragments that the user can pick up

ContentGroup right rail
  lightweight organizer / collection box

ContentGroup Editor
  full sorting table where sources can be decomposed, assigned, reordered, and reviewed
```

Core workflow draft:

- [ ] Original note content should stay in place; ContentGroup creates traceable references / copied views / organization mapping, not destructive moves.
- [ ] User can drag or add a label, selection, block, future image region, or future table region into a ContentGroup as a rough source package.
- [ ] Right rail should behave like a lightweight collection box: create group, add selected content, show collapsed groups, remove members, and jump to full editor.
- [ ] Full ContentGroup Editor should handle detailed sorting, Petal assignment, member ordering, source preview, and later bidirectional source-backed editing.

Important design correction:

Not every item dropped into a ContentGroup is an atomic fragment.

```text
ContentGroup receives sources.
Petal receives assignable fragments from those sources.
```

Source package examples:

- [ ] Continuous selection: one contiguous text range by default, but later splittable in the editor.
- [ ] Ctrl / multi-range selection: multiple discrete ranges that should remain separate fragments.
- [ ] Label / AnnotationTruth: named source package that may already contain multiple ranges.
- [ ] Block: source package that may contain TextUnits, inline structures, labels, and ranges.
- [ ] Future image / table region: source package with subregions that may become assignable fragments.

Editor decomposition draft:

```text
ContentGroup
  members
    member source: label "Example 1"
      fragments
        range A
        range B
        range C

  petals
    concept name
      uses member source / range A

    description
      uses member source / range B

    result / example
      uses member source / range C
```

Open design questions:

- [ ] Define whether this is named `ContentGroupMemberSource`, `ContentGroupMember`, or another term.
- [ ] Define the fragment model under a source package without duplicating `ContentRange`.
- [ ] Define how users split a continuous range inside the full editor.
- [ ] Define how users assign multi-range Label fragments into different Petals.
- [ ] Decide which operations belong in the right rail versus the full ContentGroup Editor.
- [ ] Decide how SelectionDraft, right-click menu, Label, and drag-to-ContentGroup interact without competing.

### ContentGroup Gallery / Editor Workflow Draft

status: active brainstorm; reviewed by Henry before being recorded
date: 2026-06-18

Core metaphor:

- [x] The current Page / Canvas remains the original writing table.
- [x] A ContentGroup is an organizing box or circle on the side.
- [x] Putting content into a ContentGroup must not move or destroy the original note content.
- [x] ContentGroup creates references, copied views, and organization mappings back to the original source.

Source package model:

- [ ] User can add a continuous text selection into a ContentGroup.
- [ ] User can add a Ctrl / multi-range selection into a ContentGroup.
- [ ] User can add an existing Label / AnnotationTruth into a ContentGroup.
- [ ] User can add a whole Block into a ContentGroup.
- [ ] Future image regions and table regions should follow the same source package model.

Important source-package correction:

Not every source package is atomic. A Label may contain several ranges. A multi-range selection may contain separate fragments. A Block may contain TextUnits, labels, inline structures, and future media. Therefore:

```text
ContentGroup receives rough source packages.
ContentGroup Editor decomposes those packages into assignable fragments.
Petal receives selected fragments from those packages.
```

Right-side Groups Rail:

- [ ] A `Groups` button should live on the right side of the note workspace.
- [ ] Opening it shows the lightweight ContentGroup rail for the current scope.
- [ ] The rail should list ContentGroups collapsed by display name by default.
- [ ] First open should not expand any ContentGroup automatically.
- [ ] The rail should support creating a new ContentGroup.
- [ ] A new group may temporarily show a drop zone / staging area.
- [ ] Existing groups should accept dragged content directly without showing noisy permanent drop zones.
- [ ] Expanding a group should show only a compact preview of its source packages and members.
- [ ] The rail is for collection and quick inspection, not full decomposition.

ContentGroup Gallery:

- [ ] ContentGroup Gallery should be treated as a parallel workspace beside Page / Canvas, not as another modal stacked on the note.
- [ ] The user can enter it from the right rail, main navigation, future shortcuts, or gesture-like transitions.
- [ ] The workspace may visually switch sideways or vertically, like moving to a neighboring workspace rather than opening a popup.
- [ ] From inside a note, Gallery should default to that note's ContentGroups.
- [ ] From Home / global navigation, Gallery should start from project selection.
- [ ] Future scope levels should support note, project, and eventually cross-project ContentGroups.

Gallery organization view:

- [ ] Gallery should show ContentGroups as clear knowledge-card-like items.
- [ ] It should support browsing by GroupFolder path, parent folder, topic, role, identity state, and status.
- [ ] It should support batch operations such as delete, duplicate, folder reassignment, ordering, and opening a group editor.
- [ ] It should become the natural place for future derived list/index views.

Single ContentGroup Editor:

- [ ] Opening one ContentGroup should enter a focused editor for that group.
- [ ] The editor should support display name, topic, role, summary, folder placement, identity state, and status editing.
- [ ] It should show member source packages without pretending they are already atomic.
- [ ] It should let the user expand a source package and split it into fragments.
- [ ] It should let the user create, delete, rename, reorder, and inspect Petals.
- [ ] It should let the user assign fragments from source packages into Petals.
- [ ] It should preserve traceability from every Petal member back to the original source range / object.
- [ ] Later versions should add bidirectional source-backed editing only after the trace model is stable.

Three-layer product split:

```text
Groups Rail
  collection and quick inspection

ContentGroup Gallery
  organization, filtering, batch management, and index-like browsing

Single ContentGroup Editor
  decomposition, Petal assignment, refinement, and review
```

Short rule:

```text
Rail is collection.
Gallery is organization.
Editor is decomposition and refinement.
```

Visual direction for these surfaces:

- [x] Prefer a `VS Code Settings` / sharp property-sheet style for dense ContentGroup surfaces.
- [x] Avoid nested rounded bubble windows for forms, inspectors, and multi-section editors.
- [x] Use flatter sections, dividers, property rows, compact inputs, left stripes / row highlights, and restrained borders.
- [x] Keep the design adaptable to both light and dark themes, because the user's writing background may be customizable later.

Important correction to older sections:

- Older `Annotation-first Notebook Model` notes below are preserved as historical brainstorm, but their root claim is superseded.
- `AnnotationTruth = semantic root` should now be read as `AnnotationTruth = durable label / marker root`.
- `AnnotationSet = group of AnnotationTruth` should now be read as an implemented seed whose long-term role is under review.
- `TextUnitGroup` should now be read as ContentGroup's predecessor / inspiration. It should either be rewritten into ContentGroup workflow or removed from normal UX.

## V2.BN.8.6.6 Floating Insert Retreat And TextUnit Gutter Doubt

status: discovered during Henry manual retest; immediate small patch plus product discussion required
date: 2026-06-17

Henry's manual review clarified that the fixed `+ Insert` action no longer matches the current TextFlow-first notebook direction:

- [x] Hide the fixed viewport `+ Insert` entry for now.
- [ ] Later delete or redesign Advanced Insert as part of a more coherent command surface instead of keeping it as a permanent floating page tool.
- [ ] Re-check whether any remaining creation flow still depends on Advanced Insert before final deletion.

Product reason:

- The current notebook no longer treats fixed block templates as the primary writing path.
- Natural writing, slash commands, right-click command surfaces, and future CanvasObject tools should carry creation flows more cleanly.
- Keeping a permanent `+ Insert` rail competes with the writing surface and keeps suggesting a block-first model that V2.BN.8.3+ is intentionally retreating from.

Henry also raised a broader TextUnit gutter question:

- [ ] Re-evaluate the per-row gutter controls before committing to them as mature UX.
- [ ] `Insert TextUnit below` may be unnecessary because Enter already creates the next writing unit.
- [ ] `Annotate this row` may be unnecessary because selection + right-click Label covers the same user intent more naturally.
- [ ] The row select / group affordance needs a clearer product reason before it permanently occupies text-column width.
- [ ] Decide whether TextUnit row grouping should stay in the always-visible gutter, move to a hover-only/context-menu affordance, or wait for a more mature TextUnitGroup editor surface.

### Cross TextUnit Selection Bug

status: discovered during Henry manual retest; patch required before TextUnitGroup can feel usable
date: 2026-06-17

Henry observed that selection cannot naturally cross TextUnit boundaries:

- [ ] Drag-selecting from the end of one TextUnit upward into the previous TextUnit does not select both rows.
- [ ] Drag-selecting across adjacent TextUnits should produce a coherent multi-TextUnit selection draft.
- [ ] This blocks normal user-facing TextUnitGroup creation, because the current group flow depends on row handles / API-like selection rather than natural text selection.
- [ ] This also affects multi-line Label creation, because users expect to drag across lines and then right-click `Label`.

Initial diagnosis:

- Each TextUnit is currently rendered as an independent editable surface.
- Browser-native selection cannot reliably span separate textarea/editable roots.
- Coincides therefore needs a custom cross-TextUnit selection path for drag selection, not only Ctrl / Command additive selection inside individual TextUnits.

Patch direction:

- Treat browser selection as pointer / offset input only.
- On drag across TextUnits, compute a Coincides-owned `SelectionDraft` that spans the start unit / offset and end unit / offset.
- Render the temporary highlight across all affected TextUnits before commit.
- Make `Label` and future `Group selected rows` consume that draft instead of requiring hidden row-handle selection.

Initial product stance:

- Text content should keep priority over row-level controls.
- TextUnit tools should be discoverable but quiet.
- A row-level control is worth keeping only if it solves a distinct problem that ordinary Enter, selection, right-click, and block-level movement cannot solve.

## V2.BN.8.6.5 Context Menu Manual Retest Discovery

status: discovered during Henry manual retest; patch required
date: 2026-06-17

Henry manual testing found a product-breaking command-surface issue:

- [ ] Choosing `Label` from the main writing-surface context menu opens a browser-native `window.prompt()` dialog (`Label name`) instead of a Coincides-owned input surface.
- [ ] Replace `window.prompt()` label entry with an app-native lightweight label input.
- [ ] The replacement should cover all current `promptForLabel()` call sites, including normal `Label`, `Child label`, and `New annotation set`, unless a specific flow gets its own designed editor.
- [ ] The new input should stay visually attached to the command surface or selected range, not block the page with a browser modal.
- [x] Superseded by V2.BN.8.6.29/8.6.30: generic Label creation must use neutral `Label N` naming, not `definition`. Explicit `/definition`-style commands may still create a definition label only when the user intentionally chooses that role.

Design note:

The right-click menu itself is now mostly reachable, but command execution cannot leak back to browser primitives. Context menu actions should either complete directly, open a Coincides popover / inline input, or route to an existing panel.

### Annotation Stack Internal Context Menu Refresh

status: marked for later; do not implement in the current patch
date: 2026-06-18

- [ ] Annotation Stack range / child-label context menus need a future update after the ContentGroup realignment.
- [ ] Do not expand legacy child-label commands as the main internal-structure workflow.
- [ ] Do not continue growing AnnotationSet / same-range-label style commands inside the stack.
- [ ] Future stack menus should stay focused on label inspection, source-backed range editing, copy, and routing selected content toward ContentGroup / Petal workflows.
- [ ] This is a command-surface design item, not a current code patch.

### Refresh-time Block Measurement / Position Drift

status: discovered during Henry manual retest; patch required
date: 2026-06-17

Henry observed that block spacing can become wrong immediately after refreshing the note page:

- [ ] After refresh, a paragraph/TextBlock can render in a compressed or partially overlapped position relative to the block above it.
- [ ] Clicking the block control bar's six-dot `move block` button causes the layout to jump back into the correct expanded position.
- [ ] The same note can therefore alternate between an incorrect post-refresh layout and a corrected post-interaction layout.

Initial diagnosis:

- This looks like a measured-height / initial reflow timing issue rather than a drag-specific bug.
- The stored placement height or estimated height appears to win during first render.
- A later interaction, such as entering move/layout behavior, likely triggers a fresh DOM measurement or layout recalculation that corrects the block height and downstream positions.

Patch direction:

- Audit the first-load measurement path for TextBlockProjection / BlockEditorLayer / `useBlockMeasurement`.
- Ensure measured height is reported after TextFlow content, annotation overlays, local label badges, and active row controls have finished rendering.
- Ensure the runtime reflow path runs from initial measured height changes, not only after user interactions.
- Confirm that refreshing, reopening the note, and then doing nothing leaves block spacing identical to the post-interaction corrected state.

## V2.BN.8.6.6 TextUnitGroup And AnnotationSet Editor Foundation Handoff

status: implemented for Henry manual test
date: 2026-06-17
planning: captured by `docs/releases/V2.BN.8/V2.BN.8.6.6-TextUnitGroup-And-AnnotationSet-Editor-Foundation-Plan.md`
patch note: `docs/releases/V2.BN.8/V2.BN.8.6.6-TextUnitGroup-And-AnnotationSet-Editor-Foundation-Patch-Note.md`

V2.BN.8.6.6 turns two previously loose foundations into usable editor seeds:

- [x] TextUnitGroup is now an active writing-layer row group, not semantic truth.
- [x] New TextUnitGroup writes keep `knowledge_role: null`.
- [x] TextUnit rows can be selected from the gutter and grouped.
- [x] Grouped rows render a quiet left rail.
- [x] TextUnitGroup can be renamed and ungrouped without deleting text.
- [x] AnnotationSet now has editable label, description, kind, color token, and ordered members.
- [x] Annotation Organizer can create sets, add/remove labels, reorder members, and delete sets.
- [x] Reading projection now prints set kind, ordered member labels, range previews, and child summaries.
- [x] Model contract smoke covers TextUnitGroup and AnnotationSet behavior.
- [ ] Henry manual visual test should decide whether group rail affordance and Annotation Organizer interaction are understandable enough before later ContentGroup maturity and CanvasObject work.

Deferred:

- [ ] Drag-and-drop set member reorder.
- [ ] Cross-note or project-level AnnotationSet.
- [ ] Relation runtime using AnnotationSet as CompositeEndpoint.
- [ ] A9 Annotation Studio / advanced organizer.
- [ ] CanvasObject / media annotations joining AnnotationSet in V2.BN.8.8+ or later Canvas track.

## V2.BN.8.6.2 Annotation Hierarchy And Range Source Contract Handoff

status: core foundation implemented; Henry manual pass accepted; source-backed range preview editing routed to V2.BN.8.6.3
date: 2026-06-16
planning: captured by `docs/releases/V2.BN.8/V2.BN.8.6.2-Annotation-Hierarchy-And-Range-Source-Contract-Plan.md`
closure: accepted by Henry manual pass on 2026-06-16; remaining visual/editor polish is deferred

V2.BN.8.6.1 manual testing exposed that child labels are not merely nested UI rows. They require an explicit hierarchy contract. A child label can have its own id, label, range, status, and future endpoint behavior, but its product meaning is subordinate to a parent annotation. It exists to explain a semantic part inside the parent label and must not render or behave as a sibling top-level label.

Core decision:

- [x] Add explicit parent ownership to `AnnotationTruthV1`, preferably `parent_annotation_id: string | null`.
- [x] Treat `parent_annotation_id === null` as the top-level Annotation Stack root condition.
- [x] Treat `parent_annotation_id !== null` as child / nested annotation state.
- [x] Make parent ownership the hierarchy truth. Parent-side `child_annotation_ids` can remain as compatibility/cache during the transition, but must not be the only truth.
- [x] Add hierarchy helpers for root resolution, child lookup, orphan detection, cycle protection, and parent/child attach/detach.
- [x] Update Annotation Stack so top-level cards are always roots; child labels are rendered and managed only inside their parent card.
- [x] Update selection behavior so selecting a child label resolves to the parent stack context and can focus the child, not a sibling card.
- [x] Define hide/delete semantics for parent and child annotations before relation endpoints depend on them.
- [x] Update `Annotation-Contract.md`, `Notebook-Object-Inventory-Contract.md`, and model contract smoke checks with hierarchy rules.

Range source editing route:

- [x] V2.BN.8.6.2 should build the range identity and source-editing foundation: source-backed range references, offset rebasing rules, affected-child preservation, and undo/redo expectations.
- [x] The actual editable range-preview text UI should stay deferred unless the hierarchy contract is already stable inside 8.6.2. The safer default is V2.BN.8.6.3.
- [x] V2.BN.8.6.3 should make range preview text editing source-backed instead of detached: it must update the original TextFlow source, recalculate affected annotation offsets, preserve child annotations, and keep parent/child hierarchy valid.
- [x] V2.BN.8.6.3 should also sync the other direction: when the user edits the TextUnit source directly, the affected annotation range preview cache must update instead of keeping stale saved text.
- [ ] Label rename remains separate from source editing. Editing annotation label text must not change original TextFlow source or range preview text.
- [x] V2.BN.8.6.4 now has a dedicated plan for annotation visual/experience tails: label display toggle, Stack redesign, badge anchoring near text, multi-label local clusters, and mature-enough selection toolbar polish.
- [x] V2.BN.8.6.4 is explicitly marked as a visual / interaction polish version that must use `impeccable` before implementation. `taste skill` may be used as a supplemental critique if Henry asks for it, but product UI constraints stay primary.
- [x] Execute `docs/releases/V2.BN.8/V2.BN.8.6.4-Annotation-Display-And-Inspector-Polish-Plan.md` after V2.BN.8.6.3 source-backed range editing is accepted.

Acceptance shape:

- [x] Creating child labels never produces sibling top-level cards.
- [x] Existing child data can be normalized into the new parent-owned shape.
- [x] Orphan child annotations cannot appear as normal root annotations without an explicit recovery path.
- [x] Parent hide/delete behavior cannot leave visible child ghosts.
- [x] Range source editing has a written contract and testable service helpers before UI editing is enabled.

## V2.BN.8.6.1 Selection Draft Engine Handoff

status: planned; ready for implementation after Henry confirms the 8.6.1 maturity boundary
date: 2026-06-16
planning: captured by `docs/releases/V2.BN.8/V2.BN.8.6.1-Selection-Draft-Engine-Plan.md`

V2.BN.8.6 manual testing showed that browser-native selection is not stable enough to serve as Coincides annotation truth. The next inserted subversion must build a Coincides-owned `SelectionDraft` foundation before CanvasObject / media annotation work starts.

- [ ] Replace browser-selection truth with `SelectionDraft`.
- [ ] Keep browser selection as pointer / offset input signal only.
- [ ] Normal text selection replaces the current draft.
- [ ] Ctrl / Command + mouse selection appends a new range to the current draft.
- [ ] If the user first makes a normal selection and then presses Ctrl / Command to select another range, the first selection is upgraded into the draft instead of being lost.
- [ ] Temporary draft highlights are rendered by Coincides and visibly match the draft ranges before commit.
- [ ] Selection toolbar is light, temporary, and escapable.
- [ ] Blank canvas/page click, Esc, or toolbar close clears the draft.
- [ ] Annotation creation consumes `SelectionDraft` ranges instead of directly trusting browser selection.
- [ ] Same-range label creation consumes the same draft model.
- [ ] Child label creation is strengthened from the unfinished 8.6 path: select an existing parent annotation, then select a subrange inside it, then show the child label entry.
- [ ] Child label should commit the selected subrange, not silently copy or reuse the whole parent range.
- [ ] Data model leaves room for cross-block selection, but 8.6.1 does not productize full cross-block selection UI.
- [ ] Add `SelectionDraft` to the Notebook Object Inventory as runtime/editor state.
- [ ] Sync Annotation Contract with the parent annotation internal reselection rule.

8.6.1 accepts one deliberate carry-over from V2.BN.8.6: the child label entry was technically present but conceptually placed in the wrong interaction surface. It now belongs to SelectionDraft because child labels are selection-first behavior.

### Annotation Stack Responsibility Cleanup Follow-up

status: patched for Henry manual retest
date: 2026-06-16

Henry's manual review clarified that Annotation Stack should be a management and refinement surface, not a second temporary selection toolbar.

- [x] Remove `Add same-range label` from Annotation Stack. Same-range labels should be created by reselecting the same source text and annotating again.
- [x] Remove the blank `Add child label` input from Annotation Stack. Child labels should be created from a real sub-selection inside an existing parent annotation range.
- [x] Keep range previews visible because they are useful: each marked source fragment should remain inspectable in the stack.
- [x] Allow a parent annotation range preview to become the source for a child label draft: select text inside the preview, then expose a lightweight child-label action.
- [x] Show child annotations under the parent in the stack so the user can inspect and manage them.
- [x] Keep child labels subordinate to their parent label in Annotation Stack. Child labels may have their own data ids, but they must not render as sibling top-level label cards.
- [x] Move created-by, status, ranges count, and children count into a collapsed details area. These are useful state, but should not dominate the normal editing surface.
- [x] Hide or demote `Draft N` in the selection toolbar. It is an internal selection-draft state, not a primary user action.
- [x] Fix selection-toolbar placement so it does not appear uncontrolled at the top of the screen.

Deferred to V2.BN.8.6.2 or V2.BN.8.6.3:

- [ ] Source-backed range text editor. Editing range text inside Annotation Stack must update the original TextFlow source, recalculate affected annotation offsets, preserve child annotations, and integrate with undo/redo. This is too important to hide inside the current cleanup patch.

### Label Visibility And Annotation Visual Polish

status: planned as V2.BN.8.6.4 after source-backed range editing
date: 2026-06-16
planning: captured by `docs/releases/V2.BN.8/V2.BN.8.6.4-Annotation-Display-And-Inspector-Polish-Plan.md`

Henry's manual review after V2.BN.8.6.2 clarified that annotation visibility needs a calmer display model before it can scale to real notes.

- [x] V2.BN.8.6.4 should add a Preview-level label display toggle. First version is show all labels / hide all labels.
- [x] V2.BN.8.6.4 should keep label overlay visibility as UI state, not AnnotationTruth status. Turning labels off must not hide, delete, or mutate annotation truth.
- [x] V2.BN.8.6.4 should let Annotation Stack remain available for selected annotations even when global label overlay is off.
- [x] V2.BN.8.6.4 should flatten Annotation Stack information hierarchy. Metadata stays collapsed; range previews and children stay readable.
- [x] V2.BN.8.6.4 should stop piling every label badge on the top-right corner of the whole block. Text-backed label badges should anchor near the relevant TextUnit / text range.
- [x] V2.BN.8.6.4 should define multi-label badge behavior near a text range: several labels on the same range should appear as a local cluster instead of a block-level badge pile.
- [x] V2.BN.8.6.4 should keep block-level annotation badge as fallback only for `target_kind === "block"`.
- [x] V2.BN.8.6.4 should polish SelectionDraft toolbar wording and escape behavior without turning it into a full custom selection engine rewrite.
- [x] V2.BN.8.6.4 implementation must start with an `impeccable` product UI pass: quiet notebook surface, consistent controls, collapsed metadata, no badge pile, no card-in-card inspector, no decorative redesign.
- [x] V2.BN.8.6.4 adds the first controlled label color-token palette for parent and child annotations.
- [ ] Per-label visibility filters, full label style editor, and full Annotation Stack design-system productization remain deferred beyond V2.BN.8.6.4.

## V2.BN.8.6 Annotation Completion Handoff

status: manual testing active; Inspector input crash and additive range draft visibility hotfix is ready for Henry retest
date: 2026-06-16
planning: captured by `docs/releases/V2.BN.8/V2.BN.8.6-Annotation-Editor-And-ReadingInterpretation-Seed-Plan.md`; engineering implementation and non-browser verification are complete; Henry manual pass found blocker bugs, and the Inspector input / additive range draft hotfix is ready for retest.

V2.BN.8.5 only establishes the AnnotationTruth seed. The following annotation behaviors are intentionally left for V2.BN.8.6 so the next plan can make the first annotation editor feel complete instead of only technically present.

- [ ] Support multiple labels on the same selected text range. Example: the same word can be marked as `game`, while the containing sentence is also part of `definition`.
- [ ] Support overlapping annotation ranges without forcing one annotation to visually replace another.
- [ ] Design badge/overlay behavior for multiple annotations on the same word, phrase, TextUnit, or TextBlock.
- [ ] Add Block-level annotation UI. Data can already reserve block ranges, but users need an explicit way to label an entire block.
- [ ] Add multi-TextUnit annotation creation with explicit range boundaries instead of silently expanding to the whole block.
- [ ] Add precise span-level visual rendering for partial TextUnit selections. V2.BN.8.5 may store exact offsets while rendering conservatively; V2.BN.8.6 should make the visible highlight match the selected characters.
- [ ] Decide how Annotation Inspector lists several annotations that touch the same range.
- [ ] Decide whether annotation creation also needs right-click / row gutter entry, not only selection toolbar.

### 2026-06-16 Henry Manual Test Discovery

status: second hotfix patched for manual retest before V2.BN.8.6 acceptance

- [x] P0 bug patched for retest: Editing anything inside the Annotation Stack / Inspector can make the note surface visually explode into a black screen. Root cause found in delayed `event.currentTarget.value` reads inside React state updaters.
- [x] P0 bug path patched for retest: `rename`, `add same range label`, and child label input now capture input values before updating state.
- [x] Overlapping annotation creation/render is basically usable before opening or editing the Annotation Stack.
- [x] Whole-block annotation creation is basically usable.
- [ ] Child annotation needs manual retest after the Annotation Stack editing hotfix because its validation path depends on inspector text input.
- [x] First multi-range selection entry patched for retest: Ctrl / Command + mouse selection now appends the selected span to the annotation draft.
- [x] Draft visibility patched for retest: additive draft ranges now render as temporary inline highlights before commit, and Ctrl / Command selection sessions are preserved through textarea `select` events so the draft is not immediately cleared.
- [x] Draft cleanup patched for retest: blank page click or a normal non-additive selection clears mistaken draft ranges.
- [ ] Multi-range selection still needs mature UX polish because the current path is Coincides range-draft behavior, not a full custom selection engine.

Triage note:

- First patch target has been applied to the Annotation Stack / Inspector controlled-input path. Retest rename, same-range labels, child labels, and inspector text editing together.
- Additive selection has a visible seed now, but the final custom range-selection model remains a later interaction design problem.
- Multi-range annotation needs a real selection-entry design. Until the user can add separate ranges intentionally, this remains an interaction gap rather than a simple bug.

## V2.BN.8.3 TextFlow Seed Current Notes

status: closed; non-browser smoke passed; Browser Use smoke recorded; Henry manual pass recorded
date: 2026-06-15

- [x] Text First / Structure Aware philosophy has been promoted into V2.BN.8.3 plan, roadmap, PRODUCT, PRD, Block Contract, Relation Product, and `docs/contracts/TextFlow-Contract.md`.
- [x] V2.BN.8.3 does not require a legacy adapter. Existing local users and note data are prototype/test data and can be cleared before real TextFlow work.
- [x] Fresh text-like block content now receives `TextBlockContentV1` with one initial TextUnit.
- [x] Valid TextFlow projection now wins over `body` / `plain_text` cache for text-like block reads.
- [x] Projection seed exists for TextUnit, TextUnitGroup, InlineStructuredObject, and addressable object output.
- [x] Slash commands now carry first-version action metadata: `create_block`, `convert_block`, `insert_structure`, `inline_action`.
- [x] Future slash commands are recorded as disabled seeds instead of half-implemented behavior.
- [x] Browser Use smoke confirmed the menu and disabled-command experience in the actual note surface.
- [x] Henry manual pass recorded as the final acceptance signal.
- [x] Role Slot Mapping, structured source snapshot, AI projection, relation endpoint runtime, full TextUnit editor, full TextUnitGroup editor, and mature slash command menu architecture are recorded as future work.

## V2.BN.8.3 Manual Testing Discovery - TextFlow / Block Retreat

status: Henry manual testing discovery recorded; 8.3 immediate patch applied; V2.BN.8.x handoff split out
date: 2026-06-15

V2.BN.8.3 手测后确认了一个比单个 bug 更重要的产品转向：

```text
Block is no longer the primary knowledge taxonomy.
TextFlow is the primary writing and knowledge structure.
Block becomes a spatial rendering object on Page / Canvas.
```

这意味着 V2.BN.8.3 之后，`Block` 不应该继续承担主要知识分类职责。它更应该回答：

```text
Where is this object placed?
Does it need an independent shell?
Does it need special rendering?
Does it need special interaction?
Does it need independent resize / move / canvas behavior?
```

它不应该主要回答：

```text
Is this a definition?
Is this an explanation?
Is this a proof?
Is this an example?
```

这些知识角色不应该继续作为独立 block family。V2.BN.8.3 当时的中间结论是下沉到 TextFlow；V2.BN.8.5 之后更准确的方向是：自然写作留在 TextFlow，语义身份进入 `AnnotationTruth.label`、`AnnotationSet` 和 AI 的 `ReadingInterpretation` proposal。

### 8.3 Product Tree

当前工作树模型：

```text
Project
  Note[]
    NoteCanvas
      PageFrame[] or workspace-only canvas
        Block[]
          TextFlow
            TextUnit[]
            TextUnitGroup[]
            InlineStructuredObject[]
```

解释：

- Project 管组织和归属。
- Note 管一份知识作品 / 一张知识画布。
- NoteCanvas 是 note 的空间根。
- PageFrame 是正式页面区域、导出边界、接近现实纸张的排版区域。
- Workspace 是 PageFrame 外的 scratch / 推导 / 旁注 / 自由空间。
- Block 生活在 NoteCanvas 上，可以在 PageFrame 内，也可以在 workspace 中。
- Block 承载 placement、size、shell、special renderer 和特殊交互。
- TextFlow 承载真正的写作结构和知识结构。

### 8.3 Block Retreat

Block 不会消失，但它要从 knowledge identity 退回到 spatial / rendering responsibility。

Blocks 仍然有价值，当内容需要：

```text
independent placement
independent visual shell
independent resize behavior
special renderer
special interaction
canvas-level manipulation
```

仍然适合作为 independent block 的例子：

- TextBlock：自然写作容器。
- FormulaBlock：display math / 大公式 / 展示型公式。
- CodeBlock：代码背景、语言、行级操作、复制、未来执行/解释工作流。
- ImageBlock：独立 placement、resize、crop、annotation、visual relation。
- TableBlock：独立表格编辑、尺寸和 layout。
- StickyNote / CanvasObject：空间思考和 scratch work。
- Structured Source Snapshot / Source View：未来 source import 工作流。

不应继续作为 independent block family 的例子：

- Definition
- Explanation
- Proof
- Example
- Heading
- Quote
- Bullet list
- Numbered list
- Todo list
- Toggle list

它们应该成为 writing role、annotation label、AnnotationSet / ReadingInterpretation proposal，或必要时成为 special render anchor；不应默认成为独立 block family。

### 8.3 DefinitionBlock Retirement

V2.BN.8.3 手测后发现最明确的 active block debt 是 DefinitionBlock。

DefinitionBlock 应该从 active user-createable block set 退场，因为它的职责已经被下面几层覆盖：

```text
AnnotationTruth
  label = definition / Power Series 的定义 / 用户自己的任意标签
  ranges = selected text / TextUnit / TextUnitGroup / InlineStructure / media region

AnnotationSet
  optional group of related AnnotationTruth objects

ReadingInterpretation
  AI proposal for definition-like regions, confirmed by the user before truth
```

Definition 是 annotation label / reading interpretation result，不是默认 spatial object，也不是固定 `knowledge_role` schema。

V2.BN.8.3 patch 候选：

- [x] Remove Definition from active slash menu creation.
- [x] Remove Definition from Advanced Insert.
- [x] Keep `/definition` only as a future disabled command or future mark-role command.
- [x] Document DefinitionBlock as deprecated / removed from the active block set.
- [x] Since the app has no production data, no legacy adapter is required.

### 8.3 TextUnit Definition

TextUnit 是逻辑写作单位，不是屏幕上的视觉折行。

```text
Automatic wrapping inside a paragraph
  -> not a new TextUnit

User presses Enter to create a new paragraph / item
  -> new TextUnit

Numbered list item
  -> TextUnit with writing_role = numbered_item

Indented child list item
  -> TextUnit with parent / indent / list group information
```

Notion-like list 在 Coincides 中可以理解为：

```text
TextBlock
  TextUnit 1: numbered_item, order = 1
  TextUnit 2: numbered_item, order = 2
    TextUnit 2a: numbered_item, indent = 1
    TextUnit 2b: numbered_item, indent = 1
    TextUnit 2c: numbered_item, indent = 1
```

它们可以同属一个 TextBlock，也可以后续被 TextUnitGroup 包起来。

### 8.3 Inline Versus Independent Block

很多内容类型未来会同时有两种存在形式：

```text
Inline / TextFlow form
  Lives inside TextBlock as TextUnit or InlineStructuredObject.
  Good for natural writing and reading flow.

Independent Block form
  Lives as a canvas/page object.
  Good for layout, resizing, special rendering, and manipulation.
```

例子：

```text
inline formula
  -> InlineStructuredObject

display formula
  -> FormulaBlock

inline code
  -> InlineStructuredObject

code block
  -> CodeBlock

inline image / small embedded image
  -> future inline media structure

independent image
  -> ImageBlock

inline table / small structured table
  -> future inline table structure

independent table
  -> TableBlock
```

判断标准：

- 如果用户是在自然写作，就尽量保留在 TextFlow 内。
- 如果用户需要排版、resize、拖动、独立交互，就 promote 成 independent block。

### 8.3 TextUnit Gutter

参考 Notion / AFFINE 的自然写作体验，每个 TextUnit 需要一个轻量操作锚点。

不一定复制 Notion 六点按钮，但需要一个 Coincides 自己的 `TextUnit gutter`：

```text
TextUnit gutter
  hidden or very quiet by default
  appears on hover / focus
  shows a small unit handle
  may show a small insert affordance
```

它未来应支持：

- Insert TextUnit below.
- Turn current TextUnit into heading / quote / bullet / numbered / todo / toggle.
- Move / duplicate / delete current TextUnit.
- Create TextUnitGroup from selected units.
- Create annotation / label selected units.
- Open future AI / source / relation actions.

#### 2026-06-16 Initial `+` And Handle Split

status: early product hypothesis, not final interaction contract

当前 TextUnit gutter 里的 `+` 和竖向 handle 先保留。它们不应该被理解成两个“换行按钮”，而应该承担两类不同的操作心智。

```text
 button
  Insert entry near this TextUnit.
  Answers: what should I add here?

vertical handle
  Operate on this whole TextUnit.
  Answers: what should I do to this line / paragraph?
```

初步分工：

- `Enter` 仍然是自然写作流：创建下一行 / 下一个 TextUnit。
- `+` 是结构插入入口：未来可用于插入 TextUnit、list、divider、formula、image、table、inline object，或打开轻量 insert menu。
- 竖向 handle 是 TextUnit 操作入口：拖拽时移动当前 TextUnit；点击时选中当前 TextUnit；右键或后续菜单用于 `Turn into`、bullet / numbered / todo / toggle、heading、字体、颜色、split / merge、delete、knowledge role 等操作。
- 当前 hover / focus 才显示这组控件是可以接受的，因为它能提示用户“当前正在编辑的是哪一个 TextUnit”。
- 竖向 handle 旁边的预留位置暂时不定死功能。它未来可能成为 role badge、knowledge marker、comment/source/relation indicator，或只是 TextUnit 选中状态的视觉锚点。

设计原则：

```text
Cursor = write text
+ = insert structure nearby
Handle = operate on this TextUnit
```

### 8.3 Operation Surfaces

未来不能把全部操作塞进 slash menu。当前拆分：

```text
Slash menu
  Fast typing command surface.
  Good for /formula, /code, /heading, /todo, /quote.

TextUnit gutter
  Current TextUnit operation surface.
  Good for add below, move, duplicate, delete, turn into.

Right-click / selection menu
  Selected text or selected unit operation surface.
  Good for inline formula, inline code, create annotation, create TextUnitGroup range helper, bind source.

Block control bar
  Whole block / canvas object operation surface.
  Good for move block, resize, export visibility, AI visibility, delete block.
```

这个拆分必要，因为 Coincides 至少有三种颗粒度：

```text
Block
TextUnit / TextUnitGroup
Selected span / InlineStructuredObject
```

每一种都需要自己的操作 surface。

### 8.3 Paste To TextFlow

粘贴行为需要区分上下文：

```text
If user focuses a TextUnit / caret / selected span:
  paste into current TextFlow
  replace selected span or insert at caret

If user has no active block / unit / caret:
  create a new TextBlock
  paste content into that TextBlock
```

隐含原则：

```text
有上下文，就进入上下文。
没有上下文，就创建新容器。
```

未来从 Notion / AFFINE / Word / Markdown / browser 粘贴时，不应该只退化成 plain text。理想 parser：

```text
clipboard HTML / Markdown / plain text
  -> detect paragraph / heading / list / indent / checkbox / quote
  -> convert to TextUnit[]
  -> preserve writing_role
  -> preserve indent_level
  -> preserve order
  -> keep inline styles conservatively
```

这不是 V2.BN.8.3 immediate patch，应该进入后续 TextUnit editor / paste parser pass。

### 8.3 TextFlow Assembly Operations

用户可能先把想法写成一个个小 block，漂浮在 workspace 里，之后像拼图一样整理成正式笔记。为此需要一组 assembly operations。

#### Split

```text
selected span / selected TextUnits inside one TextBlock
  -> content before selection = Block A
  -> selected content = Block B
  -> content after selection = Block C

caret only, no selection
  -> content before caret = Block A
  -> content after caret = Block B
```

#### Merge

```text
select adjacent TextBlocks
  -> merge into one TextBlock
  -> preserve TextUnit boundaries
  -> do not flatten everything into one giant paragraph
```

#### Extract / Promote

```text
selected TextUnit / span inside TextBlock
  -> remove from original TextFlow
  -> create independent block nearby
```

Examples:

```text
inline formula -> FormulaBlock
inline code -> CodeBlock
inline image -> ImageBlock
inline table -> TableBlock
```

Product language:

```text
Promote to independent block
```

#### Insert Block Into TextFlow

```text
independent block C
dragged between TextUnit A and TextUnit B
  -> show insertion line
  -> on drop, insert C content into target TextFlow
  -> either keep original block or remove it depending on Copy / Move mode
```

Recommended safety policy:

```text
Copy into TextFlow
  default first version; original block remains

Move into TextFlow
  requires explicit confirmation or a strong drag intent
```

These assembly operations are not V2.BN.8.3 immediate patch. They depend on TextUnit editor, selection model, TextUnitGroup, inline structure, operation history, and drag insertion target.

### 8.3 Immediate Patch Bucket

V2.BN.8.3 只处理最小清债和入口收束，不把后续 TextUnit editor 大工程塞进当前 patch。

- [x] Remove DefinitionBlock from active user creation.
- [x] Remove Definition from Advanced Insert.
- [x] Change `/definition` to future disabled or future mark-role command.
- [x] Sync docs so Definition is described as an annotation label / ReadingInterpretation proposal, not a primary block type.
- [x] Patch note: `V2.BN.8.3-Block-Retreat-And-Definition-Retirement-Patch-Note.md`.

### 8.3 Current Open Questions

- [x] Should DefinitionBlock be deleted from code now or only removed from user entry points first? Decision: remove active entry points first; keep compatibility renderer/runtime until clean reset or later cleanup.
- [x] Should `/definition` disappear from the slash menu or remain visible as disabled future role marking? Decision: it may remain only as a disabled future mark-role command, not as live block creation.
- [ ] Should FormulaBlock remain in the active block set as display math only?
- [ ] Should CodeBlock remain active immediately, or wait for code-specific visual polish?
- [ ] What is the minimum TextUnit gutter affordance that feels useful without making the page noisy?
- [ ] How much structure should paste preserve in the first implementation?
- [ ] When inline table / image / code exists, what is the user action to promote it into an independent block?
- [ ] Should insert-block-into-TextFlow default to Copy, Move, or ask every time?

## Brainstorm Result - AnnotationTruth And ReadingInterpretation

status: brainstorm result recorded; impacts later TextFlow / AI projection / relation endpoint design
date: 2026-06-16

这次讨论形成了一个比 `knowledge_role` / `canonical role` 更成熟的方向：

```text
Coincides 不用有限 schema 去预设知识，而是记录人和 AI 对内容的局部标注与阅读解释。
```

### 1. 数据怎么标注

底层真相应该是 `AnnotationTruth`，也就是用户或 AI 提议后被用户确认的真实标注。

它不预设 `definition / example / claim` 这些固定角色，也不预设 `concept_name / description / answer` 这些固定 slot。

它只记录：

```text
AnnotationTruth
  label: 用户/AI 写下的原始标签
  ranges: 被标注的范围，可以是词、句子、TextUnit、TextUnitGroup、Block、图片、公式等
  children: 更细的子标注
  visual_style: 颜色、高亮、边框、标记样式
  note: 可选说明
  created_by: user / ai_proposal_confirmed
```

比如用户标：

```text
label = Power Series 的定义
range A = Power Series
range B = a series of the form Σ a_n(x-c)^n
```

后面如果他想更细，可以继续标：

```text
Power Series -> concept name
a series of the form... -> description
Σ a_n(x-c)^n -> formula
```

这些 `concept name / description` 不是系统 slot，而是局部子标签。

### 2. 用户怎么标注

用户视角应该像读书划线，而不是填表。

流程是：

```text
自然写作
-> 选中一段、一句、几个词、几行
-> 起一个自由 label
-> 系统显示为高亮/标记
-> 需要时继续在里面做子标注
```

用户可以标：

```text
定义
我觉得很难
考试重点
这里是反驳点
Power Series 相关
小狗
```

系统不阻止，也不强行归类。因为这些 label 代表的是用户当下的理解和使用意图。

### 3. AI 怎么理解用户标注

AI 不应该把 label 当成固定 schema，而应该把它当成局部语义证据。

它读到的是：

```text
用户把这些范围标成了“Power Series 相关”。
其中某些子范围被标成了“concept name / description”。
同一段内容还被标成了“我觉得很难”。
```

AI 的任务不是抹平这些混乱，而是解释这些混乱。

所以当前方向是不做强制 normalization，不把所有“解释 / 含义 / definition / concept name”永久归并成一个标准字段。

更合理的是：

```text
AI 在具体任务里临时解释 label。
```

比如用户问：

```text
找出这篇笔记里的定义。
```

AI 可以临时判断：

```text
“Power Series 的定义”
“解释”
“这个东西叫什么”
```

这些可能都相关。但这个判断只是阅读解释，不改写原始标注。

### 4. AI 的阅读过程

AI 的内部过程可以叫：

```text
ReadingInterpretation
```

它不是数据真相，而是某一次阅读任务的解释结果。

流程是：

```text
1. 通读全文
2. 判断这篇笔记/文档整体在做什么
3. 划分 topic region
4. 在每个 topic 里判断局部结构
5. 生成局部 role label
6. 提出 annotation proposal
7. 用户确认后才变成 AnnotationTruth
```

在数学笔记里，AI 可能标：

```text
定义 / 公式 / 例题 / 步骤 / 答案
```

在议论文里，AI 可能标：

```text
论点 / 论据 / 转折 / 反驳 / 结论
```

在散文或诗里，AI 可能标：

```text
意象 / 情绪转折 / 隐喻 / 主题回扣
```

这些 role 都是局部阅读结果，不是全局系统类型。

### 5. AI 整理原始文档时怎么做

原始文档仍然是唯一 source truth。不能丢。

AI 整理时应该分两层：

```text
Raw Source Truth
原始 PDF / 图片 / 文档 / 手写笔记。

Structured Source Snapshot
AI/OCR/解析后生成的可读投影。
```

然后 AI 做阅读：

```text
1. 保留原始 source
2. 生成 structured source snapshot
3. 把内容切成 TextUnit / Block / media object
4. 保留原始 layout 信息
5. 通读 source snapshot
6. 划分 topic region
7. 判断局部 role
8. 生成 annotation proposal
9. 根据用户需求整理成 note
10. 用户确认后进入正式笔记层
```

也就是说，AI 不是先套 schema，而是先像人一样读懂材料，再提出标注和整理方案。

### 6. 当前原则

```text
用户写作是自由的。
用户标注是局部的。
AI 角色判断是阅读解释，不是系统真相。
原始 label 不被覆盖。
schema 不预设世界。
结构从标注中浮现。
AI 只能提出 proposal，不能偷偷创造不可编辑结构。
```

这套思路保留了人类自然写作的混乱和自由，同时给 AI 留出了足够的语义线索去理解、整理、检索和建立关系。

Coincides 不是一个“让人填结构”的笔记软件，而是一个“让自然文本逐渐变得可读、可标注、可解释、可连接”的知识系统。

### 7. Root Reframe - Annotation As Semantic Root

这次讨论进一步确认：Coincides 的根模型再次发生变化。

之前的方向是从 `Block` 退到 `TextUnit / TextFlow`，现在更准确的说法是：

```text
TextUnit = 写作根
AnnotationTruth = 语义根
Block = 空间根
ReadingInterpretation = AI 解释层
```

这不是推翻 TextUnit。TextUnit 仍然负责自然写作、回车、段落、列表、heading、quote 等人类编辑体验。

但 TextUnit 不再是最终语义单位。真正的语义来自用户或 AI proposal 被确认后的 `AnnotationTruth`。

`AnnotationTruth` 可以覆盖：

```text
一个字
一个词
一句话 / 一个 TextUnit
多个 TextUnit
一个 TextUnitGroup
一个不连续的 span 集合
一个 InlineObject / formula / code fragment
一个 Block
一张图片
图片中的局部区域
一个 table
table 的局部 cell / range
source snapshot 中的某个区域
```

也就是说，未来 relation endpoint 更自然的候选不是“某个段落本身”，而是：

```text
用户或 AI 确认过的 AnnotationTruth。
```

示例：

```text
AnnotationTruth: Green's theorem 的适用条件
  members:
    - TextUnit A 里的一句话
    - 一个 inline formula
    - 图片里的一个箭头区域
    - 表格里的两个 cell
```

这组内容共同构成了一个语义对象。Relation 应该优先连接这种被确认过的语义对象，而不是粗暴连接整个 Block，或脆弱连接某个文本 offset。

这也意味着：

```text
TextUnitGroup 不再优先是 knowledge role 容器。
TextUnitGroup 更像 annotation range helper / stable range package。
```

它可以帮助 annotation 稳定地包住一组 TextUnit，但它自己不必天然知道自己是 definition、example、proof 还是其他角色。

### 8. InlineStructure Demotion

`InlineStructuredObject` 也需要重新定位。

它不应该再承担“大语义分类”的主要职责。尤其是 `inline_definition`、`inline_claim` 这类固定 semantic kind，未来可能会退场或降级。

更稳的方向是：

```text
InlineStructure = special rendering + stable inline anchor
```

它主要负责两类事情：

```text
1. 特殊显示
   inline formula
   inline code
   link
   source badge / citation marker
   variable / notation

2. 稳定锚点
   让局部内容可以被 annotation、source、relation、AI proposal 指到。
```

例如：

```text
InlineObject:
  这里有一个需要特殊渲染的公式。

AnnotationTruth:
  用户把这个公式和前后文字一起标成“Power Series 的定义”。
```

这样语义归语义，渲染归渲染，锚点归锚点。`formula` 仍然有 inline structure 的价值，因为它需要特殊渲染；但 `definition` 更适合作为 annotation label，而不是 inline object 的固定系统类型。

### 9. Implication For TextUnitGroup And InlineStructure

这个转向会影响既有 `TextUnitGroup` 和 `InlineStructuredObject` 定位：

- `TextUnitGroup` 不应该优先被理解成 `knowledge_role = definition/example/...` 的容器，而应该优先被理解成 `AnnotationTruth` 的范围承载器：它可以承载一组连续或不连续的 TextUnit，也可以成为某个 annotation 的 range。
- `InlineStructuredObject` 不应该过早等同于 `inline_definition / inline_claim` 这类固定 semantic kind。更稳的方向是让它退回为可寻址的局部 span / inline object，具体意义由 `AnnotationTruth.label` 和 AI 的 `ReadingInterpretation` 临时解释。
- `knowledge_role` 仍然可以作为 AI 阅读过程中的局部解释结果出现，但不应作为底层固定 taxonomy 强制进入用户写作模型。
- 未来 relation endpoint 不应只绑定 `NoteBlock`，也不应直接绑定脆弱文本 offset。更好的候选是：被 `AnnotationTruth` 确认过的 range、TextUnitGroup、Inline span、SourceSnapshotObject 或 Block。
- 后续 TextUnitGroup editor / InlineStructure editor 的目标，应从“填 role / slot schema”转向“选择范围、命名标注、编辑子标注、确认或拒绝 AI annotation proposal”。

### 10. Consolidated Annotation-First Notebook Model v0.1

status: brainstorm definition consolidated; should inform Annotation contract, TextFlow contract, relation endpoint contract, and A9 Structure Studio / Annotation Studio
date: 2026-06-16

这组定义把旧版 `TextUnitGroup` 的混合职责拆清楚，并把 `AnnotationTruth` / `AnnotationSet` 作为后续语义、整理、relation 和 AI proposal 的核心。

#### Block

`Block` 是空间 / 渲染对象。

它负责：

```text
放在哪里
多大
外壳长什么样
能不能拖动 / resize
有没有特殊渲染
有没有特殊交互
```

它不再主要负责判断“这是不是 definition / theorem / example”。

Examples:

```text
TextBlock
FormulaBlock
CodeBlock
ImageBlock
TableBlock
StickyNote
CanvasObject
```

#### TextFlow

`TextFlow` 是 `TextBlock` 内部的自然写作流。

它负责让用户像普通笔记软件一样写：

```text
输入文字
回车换段
缩进
list
heading
quote
todo
toggle
```

用户不需要知道它叫 `TextFlow`。用户只会感受到“我在一个文本块里自然写作”。

#### TextUnit

`TextUnit` 是 `TextFlow` 里的最小自然写作单位。

通常对应：

```text
一段
一行 list item
一个 heading
一个 quote item
一个 todo item
一个 toggle item
```

用户不需要知道它叫 `TextUnit`。在用户眼里，它就是“这一行 / 这一段”。

#### TextUnitGroup

`TextUnitGroup` 是写作层的范围工具。

它负责把多个 TextUnit 或文本范围稳定捆起来。

用途：

```text
多行一起移动
多行一起折叠
多行一起复制
多行一起被标注
作为稳定 range anchor
```

它不再是 `knowledge_role` 容器，也不再承担 relation 的组合逻辑。

一句话：

```text
TextUnitGroup 管文本范围，不管语义身份。
```

#### InlineStructure

`InlineStructure` 是特殊渲染锚点。

它负责：

```text
inline formula
inline code
inline link
inline source marker
```

它不负责判断“这段内容在知识上是什么”。

一句话：

```text
InlineStructure 管显示方式，不管语义解释。
```

#### AnnotationTruth

`AnnotationTruth` 是被确认的可寻址标注对象。

它可以由用户创建，也可以由 AI 提议后由用户确认。

它记录：

```text
label
ranges
child annotations
visual style
created_by
status
note
```

它可以表示：

```text
知识点
定义
定理
例题
步骤
疑问
吐槽
重点
考试内容
个人备注
source evidence
```

`AnnotationTruth` 不只是语义节点。它同时是：

```text
1. 语义对象
   这段内容在某个理解视角下是什么。

2. 写作 / 整理对象
   用户可以查看、复制、抽取、聚焦、投影、重新展示。

3. 关系对象
   它可以成为 relation endpoint，也可以成为 AnnotationSet 的成员。
```

一句话：

```text
AnnotationTruth 是语义根，也是用户整理知识的基本对象。
```

#### AnnotationSet

`AnnotationSet` 是一组 `AnnotationTruth`。

它是用户可以理解的“标注组”。

用途：

```text
知识点分组
复习分组
作业步骤分组
展示分组
relation 的组合前提
relation 的组合结论
```

Example:

```text
AnnotationSet: Power Series prerequisites
  A: Power series definition
  B: Radius of convergence theorem
```

用户看到的是：

```text
我把这几个 annotation 放进一组。
```

底层可以在不同语境中复用同一个 AnnotationSet：

```text
organization view
review view
knowledge point view
presentation / projection view
relation endpoint
```

#### CompositeEndpoint

`CompositeEndpoint` 是底层 relation 技术角色，不是用户主要面对的概念。

当一个 `AnnotationSet` 被用于 relation 时，它就扮演 `CompositeEndpoint`。

Example:

```text
(A and B) -> C
```

底层可以表达为：

```text
from: AnnotationSet(A, B)
operator: all_of
to: Annotation C
```

一句话：

```text
CompositeEndpoint = AnnotationSet 在 relation 里的逻辑角色。
```

#### Relation

`Relation` 是对象之间的关系边。

它可以连接：

```text
AnnotationTruth -> AnnotationTruth
AnnotationSet -> AnnotationTruth
AnnotationTruth -> AnnotationSet
AnnotationSet -> AnnotationSet
Block -> AnnotationTruth
SourceRegion -> AnnotationTruth
```

数学逻辑视角里，它有点像 implication：

```text
A -> B
A and B -> C
A then B -> C
```

但产品上不需要一开始做得很复杂。第一版可以先支持：

```text
single endpoint relation
AnnotationSet as all_of prerequisite
```

#### AnnotationProjection

`AnnotationProjection` 是把 annotation 拿出来重新展示的视图。

它不改原文，只是投影。

Example:

一段 definition 散落在一个长段落里的四个位置。用户标出来后，系统可以生成一个干净视图：

```text
Definition View
  fragment 1
  fragment 2
  fragment 3
  fragment 4
```

原文不动，展示层靠近排列。

#### ReadingInterpretation

`ReadingInterpretation` 是 AI 的阅读解释层。

它不是 truth。

它负责：

```text
通读全文
划分 topic
理解局部角色
提出 annotation proposal
解释 annotation label
生成 projection / relation 建议
```

只有用户确认后，proposal 才能变成 `AnnotationTruth`。

#### Core Layering

```text
Project
  Note
    NoteCanvas
      Block
        TextFlow
          TextUnit
          TextUnitGroup
          InlineStructure

AnnotationTruth
  points to ranges inside TextFlow / Block / CanvasObject / SourceRegion

AnnotationSet
  groups AnnotationTruth

Relation
  connects AnnotationTruth or AnnotationSet

ReadingInterpretation
  proposes annotations / sets / relations
```

#### One-Line Summary

```text
Block 管空间。
TextFlow 管写作。
TextUnit 管自然段落。
TextUnitGroup 管文本范围。
InlineStructure 管特殊显示。
AnnotationTruth 管可寻址标注对象和语义真相。
AnnotationSet 管标注集合。
CompositeEndpoint 是 AnnotationSet 在 relation 里的底层角色。
Relation 管推导、依赖、证据和关联。
AnnotationProjection 管标注对象的重新展示。
ReadingInterpretation 管 AI 的临时理解和 proposal。
```

#### User-Facing Principle

用户真正需要理解的不是这些工程名词。

用户看到的应该只是：

```text
自然写作
选中内容
转成公式 / 代码 / 链接等特殊显示
给内容打 label
把多个 label 放进一组
查看某组 label 的干净视图
让 AI 帮忙提出标注 / 分组 / 关系建议
```

工程复杂度藏在系统内部，用户心智保持简单自然。

## V2.BN.8.x Handoff From V2.BN.8.3

status: extracted from 8.3 chapter so current patch stays small
date: 2026-06-15

### V2.BN.8.4 TextUnit Editor Seed

status: promoted to implementation plan
document: docs/releases/V2.BN.8/V2.BN.8.4-TextUnit-Editor-Seed-Plan.md

- [ ] TextUnit editor seed.
- [ ] TextUnit gutter first affordance.
- [ ] Writing roles: heading, quote, bullet, numbered, todo, toggle.
- [ ] Enter / Backspace / Tab behavior.
- [ ] Paste-to-TextFlow parser first pass.
- [ ] Split / merge TextBlock and TextUnit operations.
- [ ] Retire Heading as active independent block family; keep it as TextUnit writing role.
- [ ] Keep CodeBlock conservative: inline code / code_line move toward TextFlow, but multiline / copyable code remains an independent CodeBlock.
- [ ] Clarify ordinary quote versus provenance-oriented SourceReference / source chain boundary.

### V2.BN.8.5 Selection And AnnotationTruth Seed

- [ ] Selection model.
- [ ] First `AnnotationTruth` data truth.
- [ ] Text highlight / annotation render.
- [ ] Right-click / selection toolbar annotation entry.
- [ ] Annotation inspector seed.
- [ ] Annotation contract draft.
- [ ] Inline formula / inline code / inline link as special render anchors, not semantic mainline.

### V2.BN.8.6 Annotation Editor And ReadingInterpretation Seed

- [ ] Multi-range annotation.
- [ ] Child annotation.
- [ ] Annotation edit / delete / visibility.
- [ ] AI-readable annotation projection.
- [ ] `ReadingInterpretation` / annotation proposal seed.
- [ ] TextUnitGroup as annotation range helper / stable range package.
- [ ] Future relation endpoint reserve.

### V2.BN.8.7 ContentGroup System Maturity

status: active planning target after 2026-06-22 roadmap correction
date: 2026-06-22
planning: captured by `docs/releases/V2.BN.8/V2.BN.8.7-ContentGroup-System-Maturity-Plan.md`; keep checkboxes open until implementation and Henry manual pass.
scope note: 8.7 is the ContentGroup System 1.0 maturity pass, not the CanvasObject / media / drawing seed.

- 2026-06-22 first engineering pass:
  - [x] Added shared surface role vocabulary: Rail = Collect, Gallery = Organize, Single Editor = Refine.
  - [x] Added model-contract smoke coverage for stable surface roles.
  - [x] Added surface/role UI markers to the three ContentGroup surfaces.
  - [x] Reduced Rail visual noise by hiding the large intake zone when no candidate selection exists.
  - [ ] Run browser/manual screenshot pass for Rail, Gallery, and Single Editor.
  - [ ] Finish OpenDesign visual parity beyond this first role/marker pass.
  - [x] Added first embedded `ContentGroupMember.source_ref`, `current_content`, and `source_sync_status` model.
  - [x] Added compare-with-source and explicit refresh-from-source helper boundary.
  - [x] Updated display helpers to prefer member-local `current_content` over `preview_text`.
  - [ ] Design visible UI states for changed / missing / detached source members.
  - [ ] Keep `Apply member back to source` behind a future explicit diff/impact action.
  - [x] Added service-owned active GroupFolder filtering.
  - [x] Added archived-child-aware folder delete guard coverage.
  - [x] Verified moving a ContentGroup between folders preserves member content and source snapshot.
  - [ ] Add explicit archived-folder recovery / restore UI later.
  - [ ] Keep full folder manager out of Rail.
  - [x] Added pure ContentGroup reuse service boundary.
  - [x] Stabilized Reference / Duplicate / Fork / Materialize / Open original vocabulary in code.
  - [x] Added materialize plan generation with `moves_source = false`.
  - [ ] Decide which UI surfaces expose Duplicate / Fork / Materialize first.
  - [ ] Keep CanvasObject projection / usage deferred to 8.8+.
- [ ] Rail / Gallery / Single Editor role cleanup.
- [ ] OpenDesign visual parity follow-through for the three ContentGroup surfaces.
- [x] Member/source boundary hardening first pass: `ContentGroupMember` is group-local content truth; `ContentRange` / `SourceAnchor` is source location truth.
- [x] Start modeling member current content, source reference, source snapshot, sync status, and refresh from source.
- [ ] Keep apply member back to source as a later explicit action.
- [x] GroupFolder / Gallery resource-manager maturity first pass.
- [x] Reference / Duplicate / Fork / Materialize / Open original language and first service boundaries.
- [ ] Empty, stale, orphaned, archived, deleted, rejected, draft, and accepted states are understandable in normal ContentGroup use.
- [ ] V2.BN.8 docs no longer present CanvasObject seed as the active 8.7 target.

Deferred from 8.7:

- [ ] CanvasObject / media / drawing seed.
- [ ] Cross-note CanvasObject reuse.
- [ ] Full database migration out of note metadata.
- [ ] Full GraphRAG / graph database storage.
- [ ] Relation runtime / relation line overlay.
- [ ] Full source reconstruction or full bidirectional source editing.

### V2.BN.8.8+ CanvasObject, Media Annotation, Drawing Tool, And Image Insert Seed

status: deferred from the original V2.BN.8.7 slot
date: 2026-06-16
planning: captured by historical draft `docs/releases/V2.BN.8/V2.BN.8.7-CanvasObject-Media-Annotation-Drawing-Image-Seed-Plan.md`; reissue or renumber before implementation.
scope note: this is the first playable CanvasObject seed after ContentGroup System maturity, not the mature infinite-canvas / drawing-app / export / relation version.

- [ ] Minimal drawing tool.
- [ ] Minimal shape object.
- [ ] Image insert as block / canvas object seed.
- [ ] Region selection reserve.
- [ ] CanvasObject layer reserve.
- [ ] Image region / CanvasObject / media region as annotation range.
- [ ] CanvasObject persistence in note metadata.
- [ ] CanvasObject selection / move / delete seed.
- [ ] CanvasObject annotation appears in Annotation Inspector as a readable `canvas_object` range.
- [ ] Object export / AI visibility policy is stored as seed data only; no real export engine in this version.

Deferred from CanvasObject seed:

- [ ] Mature infinite canvas pack: viewport culling / virtualization, true boundless world dynamic expansion, mini map, multi-frame, presentation mode, export region, and high-object-count performance work.
- [ ] Complete drawing app: eraser, lasso, pressure, stroke smoothing, grouping, layer panel, and shape library.
- [ ] Complete media system: image asset backend, crop editor, PDF/video/audio/3D preview, and source-library media binding.
- [ ] Project surface redesign: calendar restore, favorites semantics, Project Material / Documents merge, source snapshot fidelity, and empty Project layout redesign.
- [ ] TextFlow assembly/editor work: split / merge / promote, paste fidelity, TextUnitGroup editor, and right-click command palette.
- [ ] Relation runtime / relation overlay / graph database work.

### V2.BN.8.9+ Reliability / Scale / Export Reserve Closure

- [ ] 50 / 200 / 1000 block reliability smoke.
- [ ] Formula-heavy note smoke.
- [ ] Workspace outside PageFrame stability.
- [ ] Visible render window / virtualization reserve.
- [ ] PageFrame export boundary reserve.
- [ ] CanvasObject / relation endpoint reserve.

### Register Candidates After V2.BN.8 Closure

- [ ] TextFlow-first notebook model.
- [ ] Block retreat and independent spatial object policy.
- [ ] TextUnit gutter and operation surfaces.
- [ ] Paste-to-TextFlow structure preservation.
- [ ] Inline versus independent media/code/table promotion.
- [ ] TextFlow assembly operations: split, merge, extract, promote, insert.

> 本文记录 Henry 在 V2.BN.8 / V2.BN.8.x 测试过程中发现的问题、直觉、临时想法和待修补点。
>
> 它不是正式 patch note，也不是最终 spec。它的作用是先把问题留住，等测试阶段结束后再统一整理成 patch plan。

## 使用规则

- Henry 测试过程中发现的问题先记在这里，不急着立刻修。
- 每个问题先用 checklist 记录，后续再补复现步骤、判断和修复建议。
- 如果某个问题已经进入正式 patch plan，在本文件中标记为 `moved to patch plan`。
- 如果某个问题被确认不是 bug，而是产品决策或未来版本需求，也保留记录并标注原因。
- 如果同一类问题反复出现，应该回到 `Canvas-Engine-Interaction-Contract.md` 或 `Canvas-Engine-Architecture-Spec.md`，不要只靠零散补丁。
- 如果 V2.BN.8 全部小版本结束后仍有未完成的 open question，收口时要提炼核心问题并同步到 `docs/brainstorm/产品完善/product-improvement-issue-register.md`，作为后续持续目标。

## 当前测试状态

```text
Branch: codex/v2-bn-canvas-engine
Stage: V2.BN.8.2 Canvas Shell And Viewport Transform
Status: Browser Use evidence recorded; Henry manual pass pending
```

V2.BN.8.2 当前测试口径：

- 当前小版本暂时使用 Browser Use 作为浏览器自动体验验证，不再新增 Browser Harness gate；
- 下方 Browser Harness 相关段落保留为 V2.BN.8.1 历史记录，不代表 V2.BN.8.2 的当前阻塞项；
- V2.BN.8.2 的最终通过仍以 Henry manual pass 为硬门槛。

## V2.BN.8.2 Overlay Anchor Model Closure

patch: V2.BN.8.2 Overlay Anchor Source Model
status: Stage 1 bugfix applied; non-browser verification passed; Henry manual retest pending

Stage 1 patch note: `V2.BN.8.2-Stage-1-Bugfix-Patch-Note.md`.
Current result: toolbar drift fix is applied; Henry manual retest remains the gate.

- [x] Add explicit overlay anchor source labels: `caret`, `block`, `fixed_viewport`, `formula_help`, `source_picker`, `relation_endpoint`.
- [x] Add model contract coverage for world rect -> viewport rect conversion.
- [x] Add model contract coverage for anchor source and owner id preservation.
- [x] Add model contract coverage for viewport clamp.
- [x] Browser Use retest: block toolbar follows selected block after pan / zoom.
- [x] Browser Use retest: Preview panel overlays selected block chrome cleanly after pan / zoom.
- [x] BUG: selected block 的 block control bar 在 scroll / pan 后会和 block 分离，自由漂移。
- [x] Patch: control bar anchor 必须跟随 viewport transform / selected block world rect，而不是只依赖初次 DOM rect。
- [ ] Henry manual feel pass: toolbar side placement is acceptable in ordinary writing and layout work.

## V2.BN.8.2 Browser Use Evidence Closure

patch: V2.BN.8.2 Canvas Shell And Viewport Transform
status: Browser Use evidence recorded; Henry manual pass pending

- [x] Page mode shows formal PageFrame blocks only after reload.
- [x] Canvas mode restores Scratch Workspace blocks after reload instead of pulling them into PageFrame.
- [x] `/for` opens slash menu near the active draft.
- [x] ArrowDown / ArrowUp / Enter commits Formula through the slash/manual keyboard path.
- [x] Empty Canvas draft disappears after clicking blank canvas space.
- [x] Keyboard zoom changes Canvas viewport zoom without resizing app chrome.
- [x] Preview panel hit-test returns Preview content above selected block content.
- [ ] Real mouse / trackpad Ctrl-or-Command wheel zoom feel still needs Henry manual check.
- [ ] Henry manual pass remains the final gate for V2.BN.8.2.

## V2.BN.8.2 Panel / Layout Mode UX Optimization Notes

status: focused patch applied; non-browser verification passed; Henry manual retest pending

Patch note: `V2.BN.8.2-Panel-And-Layout-Mode-Closure-Patch-Note.md`.

这组问题不是底层 engine bug，而是当前工具入口、信息面板和 layout mode 心智需要重新收束。本轮只做 panel 和 layout mode 的交互收束，不处理 Project surface、Canvas shell、导出、画笔工具或完整无限画布能力。

- [x] Note Info 和 Export Preview 职责边界完成第一版收束：保留两个入口，但让职责明显分离。
- [x] Note Info 当前作为 note summary；Export Preview 明确承担 export boundary、AI visibility、export status、block type overlay 开关。
- [x] Note Actions 不再承载 `Snap alignment` 这类高频 layout 设置；`Snap alignment` 已移动到 Layout 面板内。
- [x] Layout 入口区分两种模式：
  - 持续 Layout Mode：用户手动点击 top bar 的 Layout 开关后持续开启，适合批量排版。
  - 临时 Layout Mode：用户点击 block control bar 的 move block 按钮后临时进入，只服务当前拖动 / resize 操作。
- [x] 临时 Layout Mode 在当前拖动 / resize 操作结束或用户离开当前 selection flow 后自动退出，避免用户被迫长期停留在 layout 状态。
- [x] Layout 面板已承载 `Snap alignment` 第一版入口。
- [x] Layout 点击只负责开启/关闭 persistent Layout Mode；Layout 控制面板改为 hover 后出现，关闭面板不再退出 Layout Mode。
- [x] Block control bar 已降到 top bar 下方的 floating layer，并增加 top-bar safe clipping；手动滚动穿过 top bar 时不应该遮挡 Page / Preview / Layout / More 等按钮。
- [ ] Layout 面板未来仍可继续承载 grid/snap guide、overlay visibility、block type badge / AI visibility / export status 这类排版检查开关。
- [ ] More Actions / Note Info / Export Preview 的最终合并方式仍待单独设计；本轮只完成职责边界和 Layout 交互收束。

## V2.BN.8.2 Responsive PageFrame / Block Size Bug

status: Stage 1 bugfix applied; non-browser verification passed; Henry manual retest pending

Stage 1 patch note: `V2.BN.8.2-Stage-1-Bugfix-Patch-Note.md`.
Current result: auto-width / manual-width distinction is applied; Henry manual retest remains the gate.

- [x] BUG: Chrome 从全屏切到窗口化后，PageFrame 会随浏览器窗口变窄，但已有 block 的 width / placement 没有跟随 PageFrame 重新约束，导致 block 内容和边框横向溢出画布。
- [x] 判断 PageFrame resize 时哪些 block 属于 formal PageFrame flow，哪些 block 属于 user-resized fixed layout，避免把用户手动缩放过的 block 强行改回默认宽度。
- [x] 默认写作流 block 应跟随 PageFrame inner width 重新计算宽度；workspace / scratch block 不应该因为 PageFrame resize 被错误拉回或压缩。
- [x] 后续 patch 需要明确 `auto-width block` 与 `manual-width block` 的区别，否则浏览器窗口 resize、sidebar collapse、Page / Canvas mode 切换都会持续造成脱节。

## Future Project Surface / Source Snapshot UX Issues

status: Henry manual observation recorded; not current V2.BN.8.2 scope

这组问题属于 Project 详情页、Source Library、source snapshot 策略和材料管理工作流，不直接属于当前 Canvas Shell 小版本。先记录在这里，后续应同步到 Project surface / Source Library / Source Chain 相关版本计划。

- [ ] Project 空状态 layout 很粗糙：当前空白项目页以一组大横向虚线区域展示 Notes / Material / Goals / Decks / Documents，视觉密度低、层级笨重，不像一个成熟项目工作台。
- [ ] Project 有内容后的 layout 更混乱：上传 source / 生成 note 后，左侧出现大量空白，右侧堆叠 source snapshot / source scope / source board 等窗口，用户很难判断当前主任务是什么。
- [ ] Project 页面需要重新定义主信息区：Notes、Sources、Goals、Decks、Documents 不应该只是平铺大格子；需要区分常用入口、当前工作流、材料状态和历史/低频能力。
- [ ] 当前 Project / source 区域仍存在文本乱码或编码显示问题，需要单独排查是文件名、source parser、snapshot renderer、还是 UI 字体/编码链路导致。
- [ ] Source snapshot 生成策略不自然：当前需要用户手动 generate，后续要重新判断哪些 source 应该自动生成 snapshot，哪些需要用户确认，哪些只生成轻量索引。
- [ ] Snapshot 当前更像 markdown 化文本投影：表格、版式、区域关系、原文视觉结构会被剥离，导致用户看到的是散落数据，而不是可追溯、可检查的原始材料视图。
- [ ] 后续 source snapshot 需要区分 `fidelity view` 和 `extraction view`：前者尽量保留原始布局/页/表格/图片位置，后者服务 AI / search / note proposal，不应混成同一个东西。
- [ ] Source snapshot 策略要和 condensed raw source / external raw source / internal source chain 一起重想，避免后续导入笔记、上传教材、上传 Word/PDF 时继续走同一套失真的 markdown 投影。
- [ ] Calendar 入口 / calendar context 可能在 Project 页面重排中消失：代码和历史文档仍有 Calendar / Goal 设计，Project Goals 功能原本也和 Calendar 有关联；后续要确认这是显示回归、导航入口缺失，还是新 Project surface 信息架构没有接上 Calendar。
- [ ] Card Decks 暂时保留：Notebook / NoteBlock 可以被抽取成 card，和旧 card system 是前后继承关系，不必急着删除；但需要重新定义 card 与 note / deck / review 的关系，避免 Project 页面继续堆旧系统入口。
- [ ] Project Material 与 Documents 职责非常接近：一个偏总览，一个偏细节；后续 Project surface 设计应考虑合并或做成同一 Source/Material 区域下的不同视图。
- [ ] Favorites 区域存在误导：用户未主动 favorite 时，sidebar 却自动显示最近的两个 project，容易让用户误以为它们已经被收藏；Favorites 和 Recent 必须严格区分。
- [ ] 这组 Project surface / source snapshot / favorites / calendar / material 信息架构问题，后续需要用 Taste + Impeccable 做专门视觉与信息架构审查，不应该只靠临时 CSS 调整。

## Final Browser Harness Attempt

patch: V2.BN.8.1 Final Browser Harness Attempt
status: blocked by Chrome remote debugging authorization
date: 2026-06-13

- [x] Confirm frontend dev server is listening on `5173`.
- [x] Confirm backend dev server is listening on `3001`.
- [x] Attempt Browser Harness through PATH `browser-harness`.
- [x] Attempt Browser Harness through local project-installed executable.
- [x] Record that both attempts failed before page inspection with CDP websocket handshake timeout.
- [ ] Henry opens `chrome://inspect/#remote-debugging`, enables remote debugging for this browser instance, and clicks Allow in Chrome.
- [x] ~~Re-run final Browser Harness smoke after authorization.~~ Superseded by Henry manual visual testing for this branch state.
- [x] Henry manual visual/interaction pass.

## Runtime Root Closure Assessment

patch: V2.BN.8.1 Runtime Root Closure Assessment
status: code replacement path effectively closed; final browser/manual acceptance pending

- [x] Confirm `NoteDetail.tsx` is a route/provider shell.
- [x] Confirm `NoteCanvasRuntime.tsx` is the Note page runtime host.
- [x] Confirm `useNoteCanvasRuntimeController()` now composes controller boundaries instead of owning direct runtime internals.
- [x] Record that further root-compression before browser smoke is not currently worth the indirection cost.
- [x] ~~Final Browser Harness smoke after all replacement work is done.~~ Superseded by Henry manual visual testing for this branch state.
- [x] Henry manual visual/interaction pass.

## Runtime Presentation Controller Seed

patch: V2.BN.8.1 Runtime Presentation Controller Seed
status: code applied, full non-browser verification passed

- [x] Add `useRuntimePresentationController.ts`.
- [x] Compose frame model and layer props inside presentation boundary.
- [x] Export and reuse `UseNoteCanvasLayerPropsInput`.
- [x] Remove direct root controller imports of `useRuntimeFrameModelController()` and `useNoteCanvasLayerProps()`.
- [x] Run full non-browser checks.
- [x] Henry manual visual retest: PageFrame height, Preview, chrome controls, floating panels, and writing surface should not regress.
- [x] ~~Browser Harness retest deferred until the full replacement pass is done.~~ Superseded by Henry manual visual testing for this branch state.

## Runtime Layer Props Side Effect Boundary Seed

patch: V2.BN.8.1 Runtime Layer Props Side Effect Boundary Seed
status: code applied, full non-browser verification passed

- [x] Move Favorite placeholder toast lookup into `useNoteCanvasLayerProps()`.
- [x] Move Back Project navigation lookup into `useNoteCanvasLayerProps()`.
- [x] Move natural-writing slash toast lookup into `useRuntimeBlockOperationsController()`.
- [x] Remove direct root controller imports of `useNavigate()` and `useUIStore()`.
- [x] Run full non-browser checks.
- [x] Henry manual visual retest: Back Project, Favorite placeholder toast, and slash command warning toasts should not regress.
- [x] ~~Browser Harness retest deferred until the full replacement pass is done.~~ Superseded by Henry manual visual testing for this branch state.

## Runtime Block Operations Controller Seed

patch: V2.BN.8.1 Runtime Block Operations Controller Seed
status: code applied, full non-browser verification passed

- [x] Add `useRuntimeBlockOperationsController.ts`.
- [x] Keep block lifecycle history behavior unchanged.
- [x] Keep draft creation and slash command behavior unchanged.
- [x] Keep structured field draft updates and measured reflow behavior unchanged.
- [x] Keep move / resize placement interaction behavior unchanged.
- [x] Remove direct root controller imports of `useRuntimeBlockHistoryController()`, `useRuntimeNaturalWritingController()`, `useRuntimeBlockEditingController()`, and `useRuntimePlacementInteractionController()`.
- [x] Run full non-browser checks.
- [x] Henry manual visual retest: create/trash/undo-redo, slash menu, Definition / Formula editing, move / resize, snap, and elastic avoidance should not regress.
- [x] ~~Browser Harness retest deferred until the full replacement pass is done.~~ Superseded by Henry manual visual testing for this branch state.

## Runtime Document Data Controller Seed

patch: V2.BN.8.1 Runtime Document Data Controller Seed
status: code applied, full non-browser verification passed

- [x] Add `useRuntimeDocumentDataController.ts`.
- [x] Keep note/block API behavior unchanged.
- [x] Keep layout draft truth and note-load reset behavior unchanged.
- [x] Keep source reference stats unchanged.
- [x] Keep title, block draft, source anchor, and source jump state unchanged.
- [x] Remove direct root controller imports of `useLayoutDraftController()`, `useNoteLoadResetController()`, `useNoteCanvasDataAdapter()`, and `useRuntimeDocumentStatsController()`.
- [x] Run full non-browser checks.
- [x] Henry manual visual retest: note load, title save, block save/create/trash, layout reload, and source stats should not regress.
- [x] ~~Browser Harness retest deferred until the full replacement pass is done.~~ Superseded by Henry manual visual testing for this branch state.

## Runtime Surface State Controller Seed

patch: V2.BN.8.1 Runtime Surface State Controller Seed
status: code applied, full non-browser verification passed

- [x] Add `useRuntimeSurfaceStateController.ts`.
- [x] Keep interaction state behavior unchanged.
- [x] Keep layout mode and snap behavior unchanged.
- [x] Keep overlay panel toggles and chrome collapse behavior unchanged.
- [x] Keep block selection / focus / clear-selection behavior unchanged.
- [x] Keep Page / Canvas mode transition cleanup behavior unchanged.
- [x] Remove direct root controller imports of `useRuntimeInteractionController()`, `useRuntimeLayoutRefsController()`, `useLayoutInteractionController()`, `useFloatingOverlayController()`, `useBlockSelectionController()`, and `useSurfaceModeController()`.
- [x] Run full non-browser checks.
- [x] Henry manual visual retest: Page / Canvas switch, overlay toggles, block selection clearing, Layout mode, and snap toggle should not regress.
- [x] ~~Browser Harness retest deferred until the full replacement pass is done.~~ Superseded by Henry manual visual testing for this branch state.

## Runtime Natural Writing Controller Seed

patch: V2.BN.8.1 Runtime Natural Writing Controller Seed
status: code applied, consolidated non-browser verification passed

- [x] Add `useRuntimeNaturalWritingController.ts`.
- [x] Keep draft block lifecycle behavior unchanged.
- [x] Keep slash command behavior unchanged.
- [x] Keep blank surface pointer and double-click creation behavior unchanged.
- [x] Remove direct root controller imports of `useDraftBlockController()`, `useSlashCommandController()`, and `useCanvasSurfacePointerController()`.
- [x] Run full non-browser checks.
- [x] Henry manual visual retest: draft creation, slash menu, Ctrl+Enter, and blank click/double-click should not regress.
- [x] ~~Browser Harness retest deferred until the full replacement pass is done.~~ Superseded by Henry manual visual testing for this branch state.

## Runtime Placement Interaction Controller Seed

patch: V2.BN.8.1 Runtime Placement Interaction Controller Seed
status: code applied, consolidated non-browser verification passed

- [x] Add `useRuntimePlacementInteractionController.ts`.
- [x] Keep move / resize interaction behavior unchanged.
- [x] Keep text height estimate function unchanged.
- [x] Remove direct root controller import of `useBlockPlacementInteractions()` and `estimateBlockHeightForText()`.
- [x] Run non-browser checks.
- [x] Henry manual visual retest: move / resize / snap / elastic avoidance should not regress.
- [x] ~~Browser Harness retest deferred until the full replacement pass is done.~~ Superseded by Henry manual visual testing for this branch state.

## Runtime Document Stats Controller Seed

patch: V2.BN.8.1 Runtime Document Stats Controller Seed
status: code applied, consolidated non-browser verification passed

- [x] Add `useRuntimeDocumentStatsController.ts`.
- [x] Move `sourceReferenceCount` calculation out of `useNoteCanvasRuntimeController()`.
- [x] Keep source reference truth and chrome/preview consumers unchanged.
- [x] Run non-browser checks.
- [x] Henry manual visual retest: Note chrome / Preview source stats should not regress.
- [x] ~~Browser Harness retest deferred until the full replacement pass is done.~~ Superseded by Henry manual visual testing for this branch state.

## Runtime Block Editing Controller Seed

patch: V2.BN.8.1 Runtime Block Editing Controller Seed
status: code applied, consolidated non-browser verification passed

- [x] Add `useRuntimeBlockEditingController.ts`.
- [x] Keep Definition / Formula field truth unchanged.
- [x] Keep measured height reflow behavior unchanged.
- [x] Remove direct root controller calls to `useBlockFieldDraftController()` and `useMeasuredBlockReflowController()`.
- [x] Run non-browser checks.
- [x] Henry manual visual retest: Definition / Formula field editing and expansion should not regress.
- [x] ~~Browser Harness retest deferred until the full replacement pass is done.~~ Superseded by Henry manual visual testing for this branch state.

已确认：

- [x] DevTools 可以读到 `data-canvas-engine-version` 等 engine seed data attributes。
- [x] Note 页面已经挂在新的 engine seed 上。
- [x] 视觉体验与上一版本相比没有明显退化。

## Runtime Replacement Checkpoint

```text
status: L12 code decommission achieved, acceptance incomplete
date: 2026-06-13
```

当前判断：

- `NoteDetail.tsx` 已经退化为 route shell；
- Note 页面真实 runtime path 已经进入 `canvasEngine/NoteCanvasRuntime.tsx`；
- 后续 patch 不应继续把旧 `NoteDetail.tsx` 当作主要修补对象；
- 新问题优先落到 Canvas Engine 的 layer / hook / service 边界中处理；
- 本清单中较早提到“旧 NoteDetail 仍承担 runtime 主体”的条目保留为历史问题来源，当前已被 L12 decommission audit 覆盖；
- `V2.BN.8.1` 仍未完成，因为 browser smoke 和 Henry manual passed 仍是硬验收；performance seed 已有非浏览器 CLI 证据。

性能 seed 当前证据：

- [x] `npm run smoke:canvas-engine-performance` passed；
- [x] 覆盖 50 blocks；
- [x] 覆盖 200 blocks；
- [x] 覆盖 long paragraph；
- [x] 覆盖 formula-heavy note；
- [x] 覆盖 page + workspace mixed note；
- [x] ~~Browser Harness 真实渲染性能 smoke 待完整替换阶段结束后统一补跑。~~ Superseded by Henry manual visual testing for this branch state.

## L3-L5 Runtime Layout Model Checkpoint

```text
status: layout model controller seed applied, pending Henry visual retest
patch: V2.BN.8.1 Runtime Layout Model Controller Seed
```

已完成：

- [x] `useRuntimeLayoutModelController()` 已接管 content width、visible blocks、resolved block layouts、default draft layout 和 layout persistence callbacks 的组合。
- [x] `useNoteCanvasRuntimeController()` 不再直接调用 `useCanvasContentWidth()`、`useNoteCanvasResolvedLayoutModel()` 或 `useLayoutPersistenceController()`。
- [x] 本轮不改变 layout truth、placement persistence payload、Page / Canvas mode policy 或用户可见布局。

仍需复测：

- [ ] Henry 手动复测：Page / Canvas 切换后 block 宽度、位置、workspace visibility 与上一轮保持一致。
- [x] ~~Browser Harness 真实渲染 smoke 仍按 Henry 要求等全部替换完成后统一补跑。~~ Superseded by Henry manual visual testing for this branch state.

## L4 Runtime Frame Model Checkpoint

```text
status: frame model controller seed applied, pending Henry visual retest
patch: V2.BN.8.1 Runtime Frame Model Controller Seed
```

已完成：

- [x] `useRuntimeFrameModelController()` 已接管 PageFrame height、primary PageFrame、Canvas runtime model、relation endpoint reserve 和 export preview model 的组合入口。
- [x] `useNoteCanvasRuntimeController()` 不再直接调用 `useNoteCanvasFrameModel()`。
- [x] 本轮不改变 PageFrame height 计算、workspace policy、export preview 内容或用户可见布局。

仍需复测：

- [ ] Henry 手动复测：Canvas mode 下 formal PageFrame 边界和 Page mode 下页面高度没有退化。
- [x] ~~Browser Harness 真实渲染 smoke 仍按 Henry 要求等全部替换完成后统一补跑。~~ Superseded by Henry manual visual testing for this branch state.

## L9 Floating Overlay Checkpoint

```text
status: portal seed expanded again, pending Henry visual retest
patch: V2.BN.8.1 Floating Overlay Portal Seed + Insert/Source Overlay Portal Seed + Slash Menu Portal Seed + Block Control Overlay Portal Seed + Formula Help Overlay Portal Seed + Shared Overlay Placement Helper Seed + World Overlay Anchor Seed
```

已完成：

- Note info / More actions / Export preview 进入 `FloatingOverlayLayer` viewport portal；
- Preview panel 不再依赖 `noteChrome` 局部 absolute stacking context；
- `+ Insert` / Advanced Insert 已从 document shell 中拆出，进入 `NoteFloatingPanelLayer`；
- `+ Insert` / Advanced Insert 使用 `FloatingOverlayLayer` 的 free placement，不再作为 canvas content；
- Source jump panel 已进入 `FloatingOverlayLayer` viewport overlay stack；
- Slash menu 已进入 `FloatingOverlayLayer` free placement，并使用 viewport/caret anchor seed；
- Block control bar 已进入 `FloatingOverlayLayer` free placement，并使用 selected block viewport anchor seed；
- Formula help tooltip 已进入 `FloatingOverlayLayer` free placement，并使用 help-button viewport anchor seed；
- Slash menu / Block control bar / Formula help tooltip 已共用第一版 viewport placement helper seed；
- `overlayService` 已有 normalized viewport anchor record、world rect 到 viewport rect 的转换 seed 和 `placeAnchoredOverlay()`；
- Slash menu / Block control bar / Formula help tooltip 三个现有调用点已迁到 normalized anchor record path；
- portal shell 不吞掉页面点击，只有实际面板可交互。

仍未完成：

- 现有 anchor record 仍主要由 DOM rect fallback 生成，尚未全面迁到真正 world/caret anchor；
- full caret/world anchor service、完整 collision / flip / viewport clamp service 尚未完成；
- 需要 Henry 手动复测 Preview 是否覆盖 selected block toolbar，而不是混层。

## L10 Surface Mode Policy Checkpoint

```text
status: transition policy seed expanded, pending Henry visual retest
patch: V2.BN.8.1 Surface Mode Controller Seed + Surface Mode Transition Policy Seed
```

已完成：

- Page / Canvas label、next label、page offset、workspace visibility、blank draft placement 已进入 `modePolicyService`；
- Page / Canvas 切换时关闭 overlay、清空 snap guide、清除 block selection 的规则已进入 `createSurfaceModeTransitionPolicy()`；
- `useSurfaceModeController()` 现在执行 transition record，不再自行定义这些清理规则。

仍未完成：

- full pan / zoom transition policy 尚未完成；
- viewport scroll ownership policy beyond current shell seed 尚未完成；
- 需要 Henry 手动复测模式切换后是否还会残留 overlay、snap guide 或 selected block。

## L11 Runtime History Checkpoint

最新补充：

- [x] `useRuntimeBlockHistoryController()` 已接管 `usePlacementHistory()` 的挂载和 toolbar trash 后的 history 登记。
- [x] `useNoteCanvasRuntimeController()` 不再直接拥有 placement history hook，也不再内联 trash history glue。
- [ ] Henry 手动复测：toolbar 删除 block 后，Ctrl+Z / Ctrl+Y 的恢复和再次删除仍然符合预期。

```text
status: keyboard intent service seed expanded, pending Henry visual retest
patch: V2.BN.8.1 Runtime History Boundary Seed + Runtime History Keyboard Intent Service Seed
```

已完成：

- move / resize undo-redo 已进入 `usePlacementHistory()`；
- created block / trashed block 已通过 soft-delete / restore 进入 runtime history seed；
- Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z 的按键意图判断已迁入 `historyService.ts`；
- `usePlacementHistory()` 继续负责 stack 与实际 mutation callback。
- draft 创建历史已去掉 `useNoteCanvasRuntimeController()` 内的临时 ref bridge，改为直接接入 `pushCreatedBlockHistory`。

仍未完成：

- empty draft undo 尚未完成；
- convert block type undo 尚未完成；
- inline formula conversion undo 尚未完成；
- source / relation mutation undo 尚未完成；
- 需要 Henry 手动复测快捷键触发条件，尤其是输入框内部不应抢走用户输入撤回。

## Open Issue Checklist

### L5 Runtime Placement Record Checkpoint

- [x] `CHECKPOINT-L5-PLACEMENT-RECORD` Canvas runtime placement now has a formal builder in `placementService`.
- [x] Runtime placement records include identity fields, frame membership seed, boundary role, z-index seed, snap state, visibility state, and rotation seed.
- [x] Relation endpoint reserve is now generated from runtime placements as a future connector anchor seed.
- [x] Henry manual visual retest: no visible regression should appear from this checkpoint.
- [ ] Future promotion review: decide when the runtime placement record becomes a stable docs/contracts or database-facing contract.

### 1. Slash command menu anchor 错位

- [ ] `ISSUE-001` 自由创建下方 block 后，输入 `/` 时 slash command menu 没有出现在当前输入窗口附近。

```text
status: patch applied, pending Henry visual retest
patch: V2.BN.8.1 Slash Menu Caret Anchor + Slash Menu Portal Anchor Seed
```

#### Henry 初步观察

在较靠下的新 block 中输入 slash command 时，菜单漂到页面上方/远离当前 block 的区域，视觉上会让用户误以为命令菜单属于上面的内容。

#### 初步判断

这更像是 overlay anchor / coordinate conversion 问题，不是 slash command 本身的问题。

可能原因：

- 旧 `getSlashMenuAnchor` 仍按输入框整体 rect 计算，没有追踪 caret rect；
- 页面 scroll、block absolute placement、PageFrame offset、engine seed data attributes 之间还没有统一；
- 该菜单已经归入 Canvas Engine 的 `FloatingOverlayLayer` free placement；后续剩余风险是 pan/zoom 后的 full world/screen anchor service。

#### 待补信息

- [ ] 记录 page mode / canvas mode 是否都会出现。
- [ ] 记录是在 draft block 还是已有 block 中触发。
- [ ] 记录菜单实际位置和期望位置。
- [ ] 判断是否与浏览器 scroll position 有关。
- [x] 已将 anchor service 改成 textarea/input caret-first 计算。
- [x] 已让 slash command controller 把当前 caret index 传入 overlay anchor。
- [x] 已将 slash menu 迁入 `FloatingOverlayLayer` free placement。
- [ ] Henry 手动复测：下方 block 中输入 `/for` 时菜单应贴近当前输入行。

### 2. Formula block LaTeX input 规则不符合用户直觉

- [ ] `ISSUE-002` Formula block 目前对 `$...$`、`$$...$$`、多行 LaTeX 的处理不够直觉。

```text
status: patch applied, pending Henry retest
patch: V2.BN.8.1 Formula Preview Display Body + Formula Input Sanitizer And Help Seed
```

#### Henry 初步观察

用户直接复制 Green theorem 的 LaTeX 输入后，预览没有正确渲染。尤其是多行 `$...$` 会直接显示原文。

#### 已确认的技术原因

当前 `KaTeXRenderer` 对 inline math 的解析规则只支持单行：

```text
$...$
```

而多行 display math 需要：

```text
$$
...
$$
```

但这不符合 formula block 的产品直觉。用户在 formula block 中输入的就应该是 LaTeX body，而不是自己判断何时加 `$` 或 `$$`。

#### 产品判断

需要分两种场景处理，不能混成一个规则。

场景 A：独立封装的 FormulaBlock。

Formula block 应该把 `latex_input` 当作独立公式对象处理：

- 用户输入 LaTeX body；
- 系统默认用 display mode 渲染；
- 用户可以继续使用 `$...$` 或 `$$...$$`，但系统必须给清楚提示；
- 如果用户粘贴了 `$...$` 或 `$$...$$`，系统可以做宽容清洗或兼容，而不是失败。
- 当前 patch 已覆盖 whole-input `$...$`、`$$...$$`、`\(...\)`、`\[...\]` 的读取/粘贴/保存归一化。

FormulaBlock UI 需要一个轻量帮助入口：

- 在 LaTeX input 区域附近放一个 `?` help button；
- hover 后显示悬浮气泡；
- 气泡解释 `$...$`、`$$...$$`、纯 LaTeX body、换行公式、常见环境；
- 气泡必须出现在 block 外层 overlay 上，不应该被 block size 裁切；
- 气泡内容必须完整可读。

场景 B：正文 TextBlock / Paragraph / Definition 中夹杂的小公式。

正文里的数学片段不应该自动拆成 FormulaBlock。第一版应该支持用户主动转换：

```text
用户选中一段字符
  -> 右键 / floating toolbar
  -> Convert to formula
  -> 将选中范围转换成 inline math span 或可编辑公式片段
```

右键菜单仍然需要保留正常文本操作：

- copy；
- paste；
- cut；
- 其他常规编辑项；
- 功能区里提供 `Convert to formula`。

转换后必须允许用户微调：

- 如果系统判断 `$...$` / `$$...$$` / LaTeX body 的方式不符合用户预期，用户可以手动改；
- 转换结果需要保留 raw LaTeX；
- 用户可以再次进入编辑状态修改；
- 必须支持 undo；
- 如果转换效果不如原文，用户可以一键撤回。

#### 待补信息

- [x] 确认 `aligned` 环境在 display mode 下可渲染。
- [ ] 确认 `cases` / `matrix` / `array` 等常见环境是否可渲染。
- [ ] 确认 formula block 是否应该默认居中显示。
- [ ] 确认 formula block 的 LaTeX input 展开/折叠行为。
- [x] 确认保存路径会把完整包裹公式归一为纯 LaTeX body。
- [ ] Henry 手动复测：保存后再次打开是否保留纯 LaTeX body。
- [ ] 确认正文 inline math span 的数据结构归属：TextBlock rich text schema 还是临时 markdown-like parser。
- [ ] 确认 `Convert to formula` 第一版是只支持 `$...$` / `$$...$$`，还是支持普通数学表达的弱识别。
- [ ] 确认右键菜单和 floating toolbar 是否共用同一套 command registry。
- [ ] 确认 undo 是走 text operation history，还是走 block-level operation history。
- [x] 已新增 FormulaBlock `?` help seed。
- [x] 已将 FormulaBlock `?` help tooltip 迁入 `FloatingOverlayLayer` free placement。
- [x] 已新增 FormulaBlock paste sanitizer。

### 3. Definition block field draft 初始化错误

- [ ] `ISSUE-003` 手动创建 DefinitionBlock 后，先输入 `concept name`，再按 Tab 切换到 `description`，description 会自动复制 concept name。

```text
status: patch applied, pending Henry retest
patch: V2.BN.8.1 Definition Field Truth And Active Reflow
```

#### Henry 初步观察

操作流程：

```text
创建 DefinitionBlock
  -> 在 Concept name 输入 `CS:GO`
  -> 按 Tab 进入 Description
  -> Description 中自动出现 `CS:GO`
```

这不符合用户预期。Description 应该从空白开始，除非用户主动输入或粘贴内容。

#### 初步判断

这可能不是 UI 本身的问题，而是 structured field draft / text fallback 的同步问题。

可能原因：

- DefinitionBlock 仍然把 `text` 当作 fallback description；
- `concept_name` 修改时同步了 combined text；
- description 读取时又从 combined text / plain text fallback 中取值；
- draft fields 和 block text draft 之间没有明确区分 field truth。

#### 期望行为

- `concept_name` 和 `description` 是两个独立 field value；
- 新建 DefinitionBlock 时，description 初始为空；
- Tab 只负责切换 focus，不写入任何文本；
- 如果用户从 paragraph 转换为 DefinitionBlock，第一版也不做冒号启发式拆分，全文默认进 description，concept name 留空；
- 已经进入 structured block 后，不应继续用冒号/文本 fallback 自动改写字段。

#### 待补信息

- [ ] 确认该问题只发生在新建 DefinitionBlock，还是 paragraph convert 后也发生。
- [ ] 确认保存后刷新页面是否仍复制。
- [x] 检查 `definitionFieldsFromBlock` / `combinedDefinitionText` / fieldDraft 同步路径。
- [x] 已修复 stored field values 被 `body` / `plain_text` fallback 反推 description 的问题。
- [x] 已修复 blur 保存可能拿到上一帧 fields 的风险。

### 4. Active DefinitionBlock 展开后与下方 block 穿模

- [ ] `ISSUE-004` 下方存在 block 时，选中/展开 DefinitionBlock 会与下方 block overlap。

```text
status: patch applied, pending Henry retest
patch: V2.BN.8.1 Definition Field Truth And Active Reflow
```

#### Henry 初步观察

当 DefinitionBlock 进入 active editing 状态后，内部字段区域变高，但下方 block 没有被稳定推开，导致视觉穿模。

#### 初步判断

这是 measurement / reflow 问题，和之前 formula input 展开穿模属于同一类 bug family。

可能原因：

- active structured block 的实际 DOM 高度变化没有及时写回 layout height；
- `onMeasuredHeight` 被 suppression window 拦掉；
- 旧 `NoteDetail` 中 measurement、selection、layout collision 仍然混在一起；
- floating toolbar / field label / input 的高度未被完整计入 block measured height。

#### 期望行为

- structured block active 后，高度变化必须触发 measurement；
- page mode 下，下方 block 应该被稳定 reflow；
- 不应该靠“点一下空白处随机恢复”；
- canvas/workspace mode 后续可以更自由，但 page mode 不能 overlap。

#### 待补信息

- [x] 确认 DefinitionBlock 和 FormulaBlock 是否共用同一个穿模根因。
- [ ] 确认 layout mode on/off 是否影响复现。
- [ ] 确认 snap on/off 是否影响复现。
- [ ] 确认穿模是否只发生于 active 状态。
- [x] 已修复 active Definition 被 measured reflow suppression 拦住的问题。
- [x] 已给 block measurement 增加下一帧复测，降低 active structured fields 展开后一拍测量不足的风险。

### 5. 新建 draft block 的落点需要区分自然写作和自由排版

- [ ] `ISSUE-005` 双击空白处创建新 block 时，落点应该受 `snap alignment` 状态影响。

#### Henry 初步观察

当前行为：

```text
用户在页面任意位置双击
  -> 新 draft block 出现在用户双击的精确位置
```

这个行为适合自由排版，但不完全符合普通写作心智。

#### 产品判断

需要区分两种场景：

```text
snap alignment on:
  偏自然写作。
  双击空白处创建新 block 时，默认贴到上一 block 下方，并左对齐页面内容起点。

snap alignment off:
  偏自由排版。
  保留当前行为，用户在哪里双击，新 block 就在哪里出现。
```

也就是说，`snap alignment` 不只是拖动时的吸附开关，也可以成为“自然排版辅助”的开关。

#### 期望行为

- 默认 `snap alignment on` 时，普通用户可以连续写作，不需要精确点击；
- 新 block 自动进入正常纵向书写流；
- 它应该顶到上一个 block 的底部；
- 它应该左对齐 formal PageFrame 的内容起点；
- 如果用户关闭 snap alignment，才进入自由落点模式；
- canvas/workspace mode 可以保留更自由的空间行为，但 page mode 应优先自然写作。

#### 待补信息

- [ ] 确认 page mode 和 canvas mode 是否共用同一规则。
- [ ] 确认“上一 block”是视觉位置上的上一 block，还是创建顺序上的上一 block。
- [ ] 确认多列布局时，snap on 是否仍然贴到全局上一 block 下方，还是贴到点击区域所在 column。
- [ ] 确认已有右侧 block 时，左对齐新建是否会破坏用户意图。

### 6. CodeBlock 需要独立视觉语言和行级复制/选择能力

- [ ] `ISSUE-006` CodeBlock 当前看起来太像普通 TextBlock，缺少代码区域的视觉区分和复制辅助。

```text
status: partially fixed
patch: V2.BN.8.1 CodeBlock Projection Seed
```

#### Henry 初步观察

当前 CodeBlock：

- 背景和普通 text block 几乎一致；
- 边框/输入区域没有明显代码语义；
- 长时间阅读时，代码和正文容易混在一起；
- block type badge 显示 `CODE SNIPPET`，略长，可以简化成 `CODE`。

#### 产品判断

CodeBlock 应该拥有和普通 TextBlock 明显不同的视觉语言，参考 Codex / ChatGPT 的代码区域：

- 使用不同背景；
- 使用更清晰的代码边框；
- 使用 monospace code font；
- 行距、padding、光标区域和普通段落区分；
- block type badge 简化为 `CODE`。

#### 行级复制 / 选择想法

可以逐步设计：

```text
第一版:
  在代码区域左侧提供行选择 gutter。
  点击某一行左侧按钮/区域，选中整行。
  拖动左侧 gutter，可以选中多行。

后续:
  每行 hover 时出现复制图标。
  点击复制图标复制当前行。
  多行选中后复制选中代码。
```

这个功能的目标不是把 CodeBlock 做成完整 IDE，而是让用户在笔记里保存和复用命令、代码片段时更舒服。

#### 待补信息

- [x] 确认是否第一版只做视觉区分，不做行级复制。
- [x] 第一版已实现独立 code projection、`CODE` badge、代码背景、monospace 输入区和轻量行号 gutter。
- [ ] 确认是否需要语言标签，例如 `PowerShell` / `Python` / `TypeScript`。
- [ ] 确认是否需要整块复制按钮。
- [ ] 确认行级选择是否会和普通文本选择冲突。
- [ ] 确认 CodeBlock 是否需要语法高亮。

### 7. Canvas mode shell 需要铺满工作区，避免气泡边界和双滚动条

- [x] `ISSUE-007` Canvas mode 当前仍像被装在一个页面气泡/容器里，边界和滚动行为不符合真正 canvas 工作区。

#### Henry 初步观察

Canvas mode 下可以明显看到外层容器边缘：

- 左侧边缘很累赘；
- canvas 没有顶到右侧 navigator/sidebar 的边缘；
- navigator bar 收起后，canvas 也应该自动填满释放出来的空间；
- 当前 canvas 区域像一个嵌入卡片，不像主工作区。

#### 产品判断

Canvas mode 应该更接近 workspace：

```text
Canvas mode:
  顶部保留 top bar
  top bar 以下全部交给 canvas workspace
  不保留外层 page/card/gap 边界
  左侧贴紧 navigator/sidebar
  navigator/sidebar collapse 后自动填满
```

Page mode 可以保留更像纸张的边界；Canvas mode 不应该继续像一张被放在容器里的纸。

#### Top bar 高度优化

Henry 观察到滚动后 top bar 会变成一个更紧凑的高度，这个高度反而更适合长期保留。

期望：

- Canvas mode 使用紧凑 top bar；
- Page mode 也可以考虑统一为紧凑 top bar；
- top bar 保留：
  - back to Project；
  - note title；
  - mode / preview / layout / favorite / info / more / collapse 等按钮；
- top bar 不应该占用过多垂直空间。

#### 双滚动条问题

当前 Canvas mode 右侧出现两套 scroll：

```text
外层全局页面 scroll
canvas 内部 workspace scroll
```

Canvas mode 下不应该有全局页面 scroll。只保留 canvas workspace 自己的滚动/移动。

期望：

- Canvas mode 下 body/page shell 不滚动；
- 只允许 canvas workspace 区域滚动；
- 用户在任意 canvas 空白区域滚轮时，都应该移动 canvas workspace，而不是触发全局页面 scroll；
- Page mode 保留普通上下滚动。

#### Insert / Advanced Insert floating action 位置

当前 `+ Insert` / Advanced Insert 按钮位置不理想。

期望：

- 先保留该按钮作为 future advanced insert 入口；
- 在 Canvas mode 下放到右侧垂直居中附近；
- 不要贴在页面内部滚动条附近；
- 不要随着 canvas 内容滚动跑远；
- 它应该属于 viewport/floating UI，而不是 canvas content。

#### 待补信息

- [x] 确认 sidebar 展开/收起时 canvas 是否都能填满剩余区域。当前实现不再使用 `100vw - 320px`，改由 runtime page flex shell 填满主内容区。
- [ ] 确认 Page mode 是否也同步使用紧凑 top bar。当前只在 Canvas mode 固定紧凑 top bar。
- [x] 确认 Canvas mode 下是否需要彻底隐藏 documentShell 的边框/阴影。当前 Canvas mode 去掉 writing surface 边框和阴影，只保留 PageFrame 自身边界。
- [x] 确认 Insert floating action 是右侧居中，还是未来进入 bottom/side toolbar。当前作为 viewport floating action 放在右侧中部；未来可迁入 bottom/side toolbar。
- [ ] 确认 canvas 内部滚轮目前是 scroll，不是 pan；未来是否改为 space-drag / wheel pan。

### 8. Canvas mode 中 PageFrame 高度过度延伸

- [x] `ISSUE-008` Page mode 正常，但切换到 Canvas mode 后，PageFrame 下方出现过大的空白区域。

#### Henry 初步观察

同一篇 note：

- Page mode 下最后一个 block 后的页面边界基本正常；
- 切换到 Canvas mode 后，PageFrame / formal page area 下方保留了一大段空白；
- 这段空白不像是用户创建的内容空间，而像是系统默认留出来的过度高度。

#### 产品判断

Canvas mode 中的主 PageFrame 高度应该接近 Page mode 的正式页面高度：

```text
PageFrame height = max(基础页面高度, 最底部 block bottom + 页面底部留白)
```

不应该因为进入 canvas mode 就强行变成一个很高的 workspace 高度。

如果用户真的想让 PageFrame 继续向下延伸：

- 用户在 PageFrame 内把最底部 block 往下拖；
- PageFrame 随着内容向下自然延伸；
- 这时延伸是有用户行为依据的。

如果用户想把 block 放到 PageFrame 下方的 scratch/workspace：

- 用户应先把 block 水平方向拖出 PageFrame；
- 再绕到 PageFrame 下方；
- 这样可以避免 page content 和 workspace content 混在一起。

#### 待补信息

- [x] 确认当前过度空白来自 `CANVAS_WORKSPACE_HEIGHT` 还是 `pageContentHeight` 计算。当前已拆分：Canvas world 高度只驱动 workspace，PageFrame 边界仍用 `pageContentHeight`。
- [x] 确认 PageFrame height 和 CanvasWorld height 是否被混用。当前 block list 在 Canvas mode 使用 world height，formal PageFrame boundary 使用 page content height。
- [x] 确认 PageFrame 底部留白默认值。当前仍由 `PAGE_FRAME_BOTTOM_PADDING = 96` 驱动。
- [ ] 确认 block 在 PageFrame 内下移时，PageFrame 是否自动延伸。需要 Henry 后续手测拖动场景。

### 9. Canvas mode 必须保留 PageFrame 边界和页面留白

- [x] `ISSUE-009` 从 Page mode 切到 Canvas mode 后，外层 PageFrame 边界/页面留白感消失。

#### Henry 初步观察

Page mode 下可以看到：

- block 蓝色边框；
- 外层 page 边界；
- block 与 page 边缘之间有一段空白。

切到 Canvas mode 后：

- page 外层边界消失或不明显；
- block 看起来贴近 canvas 边缘；
- 原本 A4 页面中的左右留白感丢失。

#### 产品判断

即使进入 Canvas mode，用户仍然是在一个 NoteCanvas 中查看主 PageFrame。

所以应该保留：

- PageFrame 边界；
- PageFrame 背景；
- PageFrame 内边距/margin；
- block 与 PageFrame 边缘之间的默认书写留白。

Canvas mode 不是删除 PageFrame，而是把 PageFrame 放进更大的 workspace。

#### 待补信息

- [x] 确认 Page mode 和 Canvas mode 是否使用同一套 PageFrame visual token。当前 Canvas mode 的 formal PageFrame 继续使用 `var(--border-default)` / `var(--bg-primary)`。
- [x] 确认 PageFrame 边框在深色主题下的可见性。Browser smoke 中 formal PageFrame boundary 可见且横向完整进入视野。
- [ ] 确认 PageFrame 内边距是否进入 layout truth。
- [ ] 确认 block x/y 是相对 PageFrame content area，还是相对 PageFrame outer boundary。

### 10. PageFrame 需要类似 Word ruler 的左右边界/内容宽度调节

- [ ] `ISSUE-010` PageFrame 需要一个用于调整内容左右边界的标尺 / ruler 控件。

```text
status: contract seed applied, pending Henry visual retest
patch: V2.BN.8.1 PageFrame Content Inset Seed
```

#### Henry 初步观察

当前左右留白不太符合普通用户对文档页面的心智。Word 的页面标尺是一个很好的参考：

- 用户可以调左侧内容起点；
- 用户可以调右侧内容边界；
- 页面内容宽度变化后，已有 block 应自然跟随。

#### 产品判断

PageFrame 应该区分：

```text
PageFrame outer bounds
Content area bounds
Left content inset
Right content inset
```

block 默认应该位于 content area 内，而不是直接贴 PageFrame 外边界。

如果用户调整 ruler：

- 左侧内容起点改变；
- 右侧内容边界改变；
- 所有“跟随页面内容宽度”的 block 自动更新宽度；
- 已经被用户手动调整成自由宽度/自由位置的 block 是否跟随，需要后续定义。

#### 初步交互

可以参考 Word：

```text
顶部 ruler
  left marker = content left inset
  right marker = content right inset
```

第一版不一定要完整实现 ruler，但需要先把 PageFrame content inset 这个数据概念写清楚。

#### 待补信息

- [ ] 确认默认 PageFrame 左右留白比例参考 Word 还是自定义。
- [ ] 确认 ruler 是否只在 Page mode 显示，还是 Canvas mode 选中 PageFrame 时也显示。
- [ ] 确认已有 block 自动扩展的条件。
- [ ] 确认自由排版 block 是否脱离 ruler 管理。
- [x] 确认 content inset 是否属于 PageFrame layout truth。当前已进入 `PageFrameModel.contentInset` runtime seed。
- [x] 第一版 Canvas mode PageFrame boundary 已使用 outer frame；block 仍按 content area origin 布局，避免现有坐标大迁移。
- [ ] Henry 手动复测：Canvas mode 下 PageFrame 外框是否能表现出左右书写留白，而不是 block 贴边。

## Brainstorm

### Formula block 的更合理契约

第一版可以这样定：

```text
latex_input = pure LaTeX body
preview = katex displayMode render
storage = 尽量不保存外层 $ / $$，但允许兼容用户粘贴
paste sanitizer = 可以自动识别首尾 $...$ 或 $$...$$
```

这样以后 AI/OCR 生成 formula block 时也更干净：

```text
OCR / VLM -> latex_input -> display render
```

不需要 AI 猜测用户到底想要 inline math 还是 display math。

### 正文数学片段的长期契约

正文中的公式更像 rich text inline object，而不是完整 NoteBlock。

理想结构：

```text
TextBlock
  text segment
  inline_math_span(raw_latex, display = false)
  text segment
  inline_math_span(raw_latex, display = false)
```

display math 也可以临时存在正文流里，但如果用户希望它成为独立知识对象，再主动转换为 FormulaBlock。

### Agent 未来可调用的小能力

这个能力未来可以变成内部 tool / skill：

```text
Math Formula Conversion Tool
```

它服务于两种入口：

- UI 手动入口：用户选中字符后右键转换；
- Agent 入口：用户要求 agent 把某个 TextBlock 中的公式区域转换为视觉友好的公式。

Agent 调用时必须 proposal-first：

```text
检测到 7 处疑似公式
  -> 展示候选
  -> 用户确认
  -> 执行转换
```

不要让 Agent 静默批量改写用户正文。

### Slash command menu 的长期归属

Slash menu 不应该长期由 `NoteDetail.tsx` 自己算位置。更合理的未来结构是：

```text
Canvas Engine
  -> FloatingOverlayLayer
    -> SlashCommandMenu(anchor = world rect / caret rect)
```

也就是说，slash menu、block control bar、preview popover、source picker、relation picker 都应该慢慢归到同一个 overlay 层。

## 待测试输入样本

### Green theorem display body

```latex
\oint_{\partial D} P\,dx + Q\,dy
=
\iint_D \left(
\frac{\partial Q}{\partial x}
-
\frac{\partial P}{\partial y}
\right)\,dA
```

### Green theorem aligned body

```latex
\begin{aligned}
\oint_{\partial D} P\,dx + Q\,dy
&=
\iint_D \left(
\frac{\partial Q}{\partial x}
-
\frac{\partial P}{\partial y}
\right)\,dA,\\
D &\subset \mathbb{R}^2,\quad
\partial D \text{ positively oriented.}
\end{aligned}
```

## Patch Plan Draft

暂时不执行，等 Henry 测试差不多后统一整理。

- [x] Patch A: 修复 slash command menu anchor。
- [ ] Patch B: 重写 Formula block preview input contract。
- [x] Patch C: 增加 formula paste sanitizer。
- [x] Patch D: 增加 FormulaBlock help tooltip，并迁入 viewport overlay seed。
- [ ] Patch E: 设计正文选区 `Convert to formula` 右键菜单入口。
- [ ] Patch F: 修复 DefinitionBlock field draft 初始化和 Tab focus 行为。
- [ ] Patch G: 修复 active structured block measurement / reflow 穿模。
- [ ] Patch H: 调整 snap alignment on/off 对新建 draft block 落点的影响。
- [ ] Patch I: CodeBlock badge 改为 `CODE`，并建立独立代码视觉样式。
- [ ] Patch J: 设计 CodeBlock 行级选择 / 复制 gutter。
- [x] Patch K: Canvas mode shell 铺满工作区，去掉外层气泡边界和全局 scroll。
- [x] Patch L: 统一紧凑 top bar 高度。
- [x] Patch M: 调整 `+ Insert` floating action 到右侧中部 viewport 层。
- [x] Patch N: 修 PageFrame height 在 Canvas mode 里过度延伸的问题。
- [x] Patch O: Canvas mode 保留 PageFrame 边界、背景和内容留白。
- [x] Patch P: 定义 PageFrame content inset / ruler 控件的第一版契约。
- [ ] Patch Q: 将 slash menu / formula preview / inline math conversion / structured block measurement / draft block placement / code block visual language / canvas shell layout / PageFrame ruler 经验同步到 `Canvas-Engine-Interaction-Contract.md`。
  - [x] 已同步 FormulaBlock input sanitizer / help seed / inline formula boundary。
  - [x] 已同步 FloatingOverlayLayer portal seed / preview-info-more actions stacking boundary。

## Next V2.BN.8.x Candidate Scope - Canvas Shell And Viewport Transform

```text
status: proposed by Henry, recorded as next small-version target
current meaning: do not forget these canvas-engine gaps after V2.BN.8.1 closure
```

下一小版本不应该继续只做零散补丁。它的主线应该是把 Canvas mode 从“可工作的 engine seed”推进到“稳定的 canvas shell + 第一版 viewport transform”。

### Priority 1: Canvas Shell 打磨稳定

- [ ] Canvas mode 单滚动 / 单工作区：去掉全局页面滚动干扰，只让 canvas workspace 拥有横向与纵向移动能力。
- [ ] Canvas mode 铺满主工作区：sidebar 展开/收起后都能自动填满，不再出现外层气泡容器感。
- [ ] Canvas 初始视角：切换到 Canvas mode 后，主 PageFrame / workspace 不应该像被锁死在左上角；需要给用户一个更自然的初始视角。
- [ ] PageFrame 边界稳定：Canvas mode 里继续保留主 PageFrame 的边界、背景、内容留白和可导出区域感。
- [ ] PageFrame 高度规则稳定：PageFrame 高度由正式内容决定，不被 workspace 高度强行撑大。
- [ ] Workspace placement 持久化：放到 PageFrame 外的 block 在刷新 / 重新进入 note 后仍留在 workspace，不被挤回 PageFrame。
- [ ] PageFrame 内 block 与 workspace block 的 surface 归属在 runtime model 中可被稳定区分。

### Priority 2: Pan / Zoom / Viewport Transform

- [ ] Pan / drag canvas：从“滚动为主”升级为成熟的抓手拖动画布体验。
- [ ] 全向画布感：Canvas mode 不能让用户感到左上角已经到头；应通过 pan / world origin / viewport offset 让 workspace 呈现为可向多方向展开的平面。
- [ ] Canvas zoom：建立独立 canvas zoom，不依赖浏览器整页缩放。
- [ ] Viewport transform：定义 `world coordinate -> viewport coordinate` 的统一转换入口。
- [ ] World transform policy：block、selection、snap guide、overlay、future relation endpoint 都必须能基于同一套 transform 计算位置。
- [ ] 输入策略：明确滚轮、触控板、空格拖拽、Ctrl/Command + wheel zoom 等基础交互。
- [ ] 模式策略：Page mode 和 Canvas mode 对 pan / zoom 的可用范围要有清晰区别。

### Priority 3: Overlay / Anchor 统一

- [ ] Slash menu anchor：继续从 DOM rect fallback 迁向 caret/world anchor。
- [ ] Block toolbar anchor：随 block 的 world rect -> viewport rect 变化，不被 scroll / zoom / pan 甩开。
- [ ] Preview panel：属于 viewport overlay，不参与 canvas content flow，不和 selected block toolbar 混层。
- [ ] Formula help / source picker / future relation picker：统一进入 FloatingOverlayLayer 的 anchor path。
- [ ] Future relation endpoints：先保留 endpoint reserve 和 anchor record，不急着做完整 relation overlay。

### Registered But Not Next-Scope Heavy Work

- [ ] Viewport culling / virtualization：上千 block 时不能全量渲染，但下一小版本可先定义触发点和测量指标，不要求完整实现。
- [ ] CanvasObject layer：画笔、shape、frame、region、图片对象未来需要进入 CanvasObject 层；下一小版本只保留接口和命名空间，不做完整 drawing tool。
- [ ] Drawing / writing tool first：Henry 更倾向于先做画笔、shape、文本/富文本相关工具，获得“正在做笔记软件”的真实操作感，再进入更重的无限画布工程。
- [ ] Mature infinite canvas later pack：上千 block 的 viewport culling / virtualization；真正无边界 world 的动态扩展；多 frame；drawing tool / shape / image / region；relation line overlay；mini map；export region；大量对象下的性能优化。
- [ ] Relation overlay layer：关系线、端点、关系层显示未来必须接入 transform；下一小版本只验证 anchor 预留，不做关系系统产品化。
- [ ] 多 frame / export region：当前只保留一个主 PageFrame，不做多 frame 产品化，不做 presentation mode。
- [ ] Export baseline：导出是基础笔记能力，但当前 Canvas Engine 打磨阶段还无法完整测试；V2.BN.8 结束时若仍未处理，需要进入 register，后续作为独立持续目标。
- [ ] Notebook baseline audit：导出之外，仍需要复查其他基础笔记软件能力是否漏掉；本清单先只记录和 Canvas Engine / PageFrame / workspace 直接相关的问题。

## Notebook Baseline Audit - Mature Notebook First, Canvas Native Later

```text
status: brainstorm recorded before next V2.BN.8.x planning
product stance: early Coincides should be notebook-first; canvas helps the note before it becomes the main product philosophy
```

当前阶段要避免把产品做成一个炫技 canvas demo。成熟笔记能力仍然是第一优先级：用户首先要能自然、稳定、安静地写笔记；Canvas mode / workspace 的早期职责是辅助用户整理想法、推演、验算、吐槽、临时目标和局部自由排版。

长期看，Canvas 会逐渐反过来成为主哲学。等 Page mode、NoteBlock、Source、Relation、Template 都成熟之后，PageFrame 会变成 Canvas 中一种高密度、可导出的信息对象；画笔、shape、图片、公式、表格、代码、3D preview、relation layer 和多个区域会共同组成真正的知识空间。

### Mature Notebook Capability Layers

- [ ] Layer 1 - 安全与可靠：autosave、完整 undo/redo、trash/restore、version history、数据损坏提示、本地备份/恢复。
- [ ] Layer 2 - 写作基础：rich text、段落对齐、列表、heading、inline link、inline math、formula block、code block、table、图片/附件/PDF embed。
- [ ] Layer 3 - 组织与导航：Project 内 note 管理、全局搜索、note 内搜索、recent/favorites、tags、internal links/backlinks、table of contents、note metadata。
- [ ] Layer 4 - 导入与迁移：Markdown / PDF / image / Word / text import、复制 block 时保留 source chain、condensed source import。
- [ ] Layer 5 - 模板与复用：note template、block template、Default / Math / User-defined category、Template Studio、常用 block 快捷插入、slash command 分类。
- [ ] Layer 6 - 阅读与整理：read/edit mode、focus mode、preview overlay、source inspector、block type / AI visibility / export overlays、section folding、长文性能稳定。

### Version Placement Notes

- [ ] V2.BN.8.x 可以优先审查 Layer 1-3 中和当前 runtime / canvas shell 直接相关的能力。
- [ ] Layer 4-5 多数属于 Better Notebook 后续主线或 Template Studio 职责，不强行塞进当前 Canvas Engine polish。
- [ ] Layer 6 和 CanvasObject / relation / presentation / complex media 的成熟形态更接近 Canvas-native 长期阶段。
- [ ] 如果 V2.BN.8 全部小版本结束后这些 notebook baseline 项仍未归档，需要提炼成 register 条目，避免被 Canvas Engine 的工程细节淹没。

## Relation Storage Question - Graph DB As Sidecar, Not Product Model

```text
status: brainstorm recorded before returning to V2.BN.8.x implementation
product stance: graph database can help relation querying, but it cannot define Coincides relation semantics
```

后续 Relation 阶段需要认真评估图数据库，但不能把“用了图数据库”误认为“Relation 设计已经完成”。图数据库最多替代一部分存储、遍历、路径查询和局部图谱查询实现；它不能替 Coincides 决定什么是 `derives_to`、什么关系属于 note-local / project-local / cross-project、什么关系是用户确认的 truth、什么关系只是 AI candidate。

### Working Principle

- [ ] Coincides Core 仍然保存 canonical truth：NoteBlock、Source、ObjectRelation、RelationType、RelationScope、RelationStatus 等产品语义由 Coincides 定义。
- [ ] Graph DB / graph index 只能作为 projection / sidecar / accelerator：从 Coincides Core 派生，用于邻居查询、路径查询、局部图谱、GraphRAG / Agent 检索。
- [ ] Graph DB sidecar 必须可重建、可丢弃、可重新同步；不能成为第一主权数据库。
- [ ] Relation product contract 先行，graph-native adapter 后置；不要让底层工具反过来绑架产品语法。

### Future Evaluation Questions

- [ ] 普通数据库邻接表是否足够支持早期 relation maturity、relation inspector 和 local graph？
- [ ] 何时需要 graph-native sidecar：路径查询变重、跨 note/project 邻居展开变重，还是 Agent/RAG 检索需要更强图遍历？
- [ ] 嵌入式图数据库是否适合个人桌面应用打包？和 Neo4j / RDF triple store 这类更重方案相比，维护成本如何？
- [ ] 图索引如何处理 candidate relation、confirmed relation、source provenance relation 和 semantic ObjectRelation 的分层？
- [ ] 如果 V2.BN.8 结束后仍未形成清晰答案，需要整理到 register，作为 Relation 阶段前置调研问题。

## Current V2.BN.8.1 Closure Status - 2026-06-13

```text
code replacement: effectively closed for the current layer-by-layer replacement goal
non-browser verification: refreshed and passed
browser harness: deferred until the combined final pass
manual acceptance: pending Henry
```

当前未勾选的 Patch B / E / F / G / H / I / J / Q 不再被视为阻塞 `V2.BN.8.1` runtime replacement 的硬门槛。它们进入后续 `V2.BN.8.x` polish / interaction backlog，除非 Henry 在最终手测中明确把其中某项提升为当前小版本必须修复的问题。

保留这个区分的原因：

- `V2.BN.8.1` 的核心目标是旧 `NoteDetail` runtime 的逐层接管；
- 当前代码已经证明 `NoteDetail.tsx` 不再承载旧 runtime 主体；
- 未勾选 patch 多数属于体验细节、长期契约或后续 block / formula / code polish；
- ~~Browser Harness 和 Henry manual pass 仍是最终是否通过的硬验收。~~ Current branch state uses Henry manual visual testing as the final visual gate.

## Final Smoke Protocol

```text
status: ready for later execution
document: docs/releases/V2.BN.8/V2.BN.8.1-Final-Smoke-Protocol.md
browser harness: not run yet
Henry manual pass: pending
```

- [x] Final smoke protocol created.
- [x] ~~Browser Harness smoke executed by protocol.~~ Superseded by Henry manual visual testing for this branch state.
- [x] Henry manual pass recorded by protocol.
- [ ] Failure/pass result synced back to Review / Experience Review / CHANGELOG.

## Final Browser Harness Retry - 2026-06-13

```text
status: blocked
reason: Chrome remote debugging authorization / CDP websocket handshake timeout
```

- [x] Confirmed branch was clean and synced before retry.
- [x] Confirmed client `5173` and server `3001` were listening before retry.
- [x] Retried `browser-harness` `page_info()`.
- [x] Recorded failure in Review and Experience Review.
- [ ] Henry allows Chrome remote debugging.
- [x] ~~Browser Harness final smoke re-run after authorization.~~ Superseded by Henry manual visual testing for this branch state.
- [x] Henry manual pass.

## Next V2.BN.8.x Candidate Scope - Text Block And Slash Command Foundation

```text
status: promoted to V2.BN.8.3 plan
document: docs/releases/V2.BN.8/V2.BN.8.3-Text-Block-And-Slash-Command-Foundation-Plan.md
product stance: mature notebook writing grammar before drawing tool expansion
```

V2.BN.8.2 已经通过 Henry manual pass。下一小版本不应该立刻优先扩张 drawing tool，而应该先把成熟笔记软件最基础的写作语法补稳：TextBlock / Paragraph、heading、list、quote、divider、formula/definition/code 的 slash command 创建与转换路径。

- [ ] 明确 `TextBlock` 是否是所有文本类 block 的基石。
- [ ] 明确 `Paragraph` 是 block type 还是 `TextBlock.text_role = paragraph`。
- [ ] 明确 `Heading` 是否应从独立 block type 下沉为 TextBlock role。
- [ ] 明确 bullet / numbered / todo / toggle list 是否属于 TextBlock 的 list role。
- [ ] 明确 ordinary quote 和 provenance-oriented `SourceQuote` 的边界。
- [ ] 明确 FormulaBlock 和 inline formula 的边界。
- [ ] 明确 Definition 是否是 structured text knowledge block，而不是普通 text role。
- [ ] 明确 Divider 是轻量 NoteBlock 还是 CanvasObject / visual separator。
- [ ] 明确 slash command 的四种语义：create block、convert current block、insert structure、inline action。
- [ ] 设计 slash menu 第一版 Default / Math / User Defined 分组。
- [ ] 设计 arrow key / Enter / Escape 在 slash command 中的统一键盘行为。
- [ ] 保留 drawing tool / CanvasObject layer 作为后续版本目标，不放进 V2.BN.8.3 主线。

### V2.BN.8.3 Implementation Smoke - 2026-06-15

```text
status: TextFlow seed implemented; Browser Use smoke recorded; Henry manual pass recorded
```

- [x] TextFlow type seed exists for `TextUnit`, recursive `TextUnitGroup`, `InlineStructuredObject`, and projection objects.
- [x] Fresh text-like blocks initialize through the TextFlow path.
- [x] Text-like read paths prefer valid TextFlow projection before `body` / `plain_text` fallback.
- [x] TextUnitGroup addressable projection resolves child TextUnit text recursively instead of exposing only child ids.
- [x] V2.BN.8.3 intentionally does not add a legacy adapter; local prototype accounts/data can be cleared instead of preserved.
- [x] Slash command registry distinguishes `create_block`, `convert_block`, `insert_structure`, and `inline_action`.
- [x] Browser Use checked `/for` slash menu anchoring, active Formula state, disabled Inline Formula explanation, and ArrowDown / ArrowUp active movement.
- [x] Browser Use exposed and rechecked the Advanced Insert floating panel pointer-events bug.
- [x] Advanced Insert now shows `Code` instead of `Code Snippet`.
- [x] Henry manual writing-feel pass recorded as the final acceptance gate.

## Product Philosophy Turning Point - Text First, Structure Aware, Canvas Capable

superseded note: this section is preserved as historical brainstorm. Its `InlineStructuredObject as default knowledge granule` and `knowledge_role / semantic_kind` language has been superseded by `Consolidated Annotation-First Notebook Model v0.1`: `AnnotationTruth` is the semantic root, `AnnotationSet` is the user-facing annotation group, `TextUnitGroup` is a writing-range helper, and `InlineStructure` is a special render anchor.

```text
time: 2026-06-14 20:45 America/Toronto
status: brainstorm recorded before V2.BN.8.3 scope discussion
trigger: rethink TextBlock, InlineStructuredObject, relation endpoint, and natural writing
```

这次讨论形成了一个重要拐点：Coincides 不应该继续被理解成纯粹的 block-first notebook。

更成熟的方向是：

```text
Coincides = text-first, structure-aware, canvas-capable notebook
```

### Discussion Path

最开始的问题是：`Paragraph`、`Heading`、`Formula`、`Definition`、`Code`、`SourceQuote` 到底应该是独立 block type，还是 `TextBlock` 的 role / structure。

随后讨论发现，如果用户自然写作，他们经常不会主动拆很多 block。尤其在学习资料整理、教材摘录、课堂笔记和自然段写作中，用户可能只想连续写一整个段落：

```text
上文说明
  -> 某一句其实是 definition
  -> 后文继续解释、举例、推导
```

如果强制把这段内容拆成：

```text
ParagraphBlock before
DefinitionBlock
ParagraphBlock after
```

就会打断自然写作，违背人类书写习惯。

但如果所有东西都只放进一个普通 TextBlock，又会失去 Coincides 的核心优势：AI 无法稳定读到 definition、formula、source、relation 等结构化知识，系统也无法把它们作为可寻址的信息节点处理。

因此形成了第三层：

```text
InlineStructuredObject / InlineStructuredSpan
```

它不是普通富文本样式，也不是独立 NoteBlock，而是 TextBlock 内部被结构化标记的知识对象。

### Revised Model

```text
TextBlock
  默认写作容器。
  承载自然文本、轻结构、inline structured objects。

InlineStructuredObject
  默认知识颗粒。
  可以是 InlineDefinition、InlineFormula、InlineSourceMarker、InlineCode、InlineExample 等。

Independent NoteBlock
  排版、强调、独立移动、resize、图文并排、表格、图片、大公式、definition card 等场景才需要。
```

这不是“全部都是 TextBlock”，也不是“全部拆成独立 block”。

更准确的原则是：

```text
Inline first.
Block when needed.
```

### Why Notion / AFFiNE Do Not Need This Much Complexity

Notion / AFFiNE 的 block 系统主要优化的是人类编辑体验和页面组织体验。它们不需要让每一个局部知识点都天然成为 AI / relation / provenance 可读的结构对象。

Coincides 的区别不应该是“有更多 block type”，而是：

```text
视觉上像自然笔记。
数据上是可寻址知识结构。
```

因此 Coincides 的 block 系统不应该把用户逼进复杂 block taxonomy，而应该让用户自然写作，同时允许系统在文本内部识别、保存、读取结构化知识颗粒。

### Three Optimization Targets

这套模型同时优化三件事：

```text
用户书写自然程度
  不强迫用户为了语义结构拆散段落。

AI 阅读自然程度
  AI 不靠猜，而是能读到 InlineStructuredObject 的 kind、field values、anchor、context。

Relation 表达自然程度
  relation 可以连接真正的信息颗粒，而不是只能粗暴连接整个 NoteBlock。
```

### Relation Endpoint Implication

这进一步改变了 relation 节点定义。

旧假设：

```text
NoteBlock 是 relation 的主要节点。
```

新假设：

```text
NoteBlock 只是最常见的 relation 节点。
真正能成为 relation endpoint 的，是可寻址知识对象。
```

也就是说：

```text
Addressable Content Package / Endpoint:
  NoteBlock
  InlineStructuredObject
  SourceArtifact / SourceRegion future
  ConceptEntity future
  CanvasObject / Region future
```

但必须有约束：

```text
不是任意一段普通文字都能成为 relation endpoint。
只有被用户确认、系统结构化、source 绑定、relation 绑定、或 AI proposal 被接受的内容，才获得稳定 addressable identity。
```

如果 InlineDefinition 被 relation 指向，它就不能只是普通 rich-text span，必须进入可追踪对象层：

```text
inline_object_id
parent_block_id
semantic_kind
field_values
anchor_range / anchor_text
status
```

如果父 TextBlock 被编辑导致 anchor 失效，该 inline object 应进入 `stale / degraded / broken`，而不是静默消失。

### Slash Command Implication

Slash command 也随之改变定位。

它不应该只是 block picker，而应该是让用户把自然文本局部结构化的 writing command palette。

```text
/definition
  选中文字 -> 标记为 InlineDefinition
  当前句子 -> 标记为 InlineDefinition
  空 block -> 创建独立 DefinitionBlock
  当前 block -> 提升/转换为 DefinitionBlock

/formula
  选中文字 -> 标记为 InlineFormula
  当前行 -> 提升为 FormulaBlock
  空 block -> 创建独立 FormulaBlock

/code
  选中文字 -> 标记为 InlineCode
  多行内容 -> 提升为 CodeBlock

/source
  选中文字 -> 添加 SourceReference / InlineSourceMarker
  整个 block -> 添加 block-level SourceReference
```

因此 slash command 必须区分：

```text
create_block
convert_block
insert_structure
inline_action
```

后续必须单独设计 Slash Command Foundation。当前只能确认它不再只是 block picker，而是 context-aware writing command palette；具体如何承载 create / convert / insert / inline action / mark role / bind source / create relation / promote selection / group TextUnit，暂时不要过早定死。

风险：如果所有能力都塞进一个 `/` 菜单，会形成 menu hell。未来需要评估 slash、右键菜单、selection toolbar、side palette、AI proposal 之间如何分担入口。

### Durable Product Principle

这次讨论形成的长期原则：

```text
自然文本承载知识。
inline structure 提取知识。
独立 block 承载布局。
canvas 承载空间关系。
relation 承载语义连接。
```

这应该成为 V2.BN.8.3 之后重新审视 Block Contract、Slash Command Contract、Relation Endpoint Contract 和 AI Readable Projection 的核心输入。
## V2.BN.8.6.5 Context Menu / Command Surface Closure

Status: implemented seed, pending Henry manual test.

- Active now:
  - Text selection context menu.
  - Annotation range preview context menu.
  - Annotation highlight context menu seed.
  - TextUnit handle context menu seed.
- Reserved now:
  - Cut / Paste custom multi-range text mutation.
  - Inline formula / inline code / link conversion.
  - Range-level label removal.
  - TextUnit split / extract / duplicate / delete.
- Deferred:
  - Canvas blank menu.
  - CanvasObject menu.
  - Label Comment / comment system.
  - Word-like mini toolbar.
  - Relation endpoint menu.
  - Source attach / cite menu.
- Product language decision:
  - User-facing command says `Label`.
  - Internal durable object remains `AnnotationTruth`.
- Contract:
  - `docs/contracts/Command-Surface-Contract.md` is now the inventory source for command surface status.

## V2.BN.8.6.6 Browser-Harness Manual Checklist Discovery

```text
date: 2026-06-17
status: browser-harness partial pass; patch required before Henry manual acceptance
scope: TextUnitGroup + AnnotationSet manual checklist
```

### TextUnitGroup

- [x] In a TextBlock with 3-5 rows, left gutter row selection can select multiple TextUnits.
- [x] Right-clicking the selected row area exposes `Group selected rows`.
- [x] Group creation renders a quiet row group rail and does not lose text.
- [x] Renaming the group works and persists after refresh.
- [x] Ungrouping preserves the original text.
- [x] Replace native `Group name` browser prompts with a Coincides-owned input flow.
- [x] Widen or soften the row group rail hit target; the current hit area is too narrow and near-misses open the Block menu.
- [ ] Re-check the Enter-to-new-TextUnit path that produced a leading newline in the last seeded TextUnit during browser-harness setup.

### AnnotationSet / Organizer

- [x] Existing labels can be used as AnnotationSet members.
- [x] Organizer can create a set from the currently selected label.
- [x] `Add selected` can add the currently selected loose label when Organizer remains open.
- [x] Set kind can be changed from `collection` to `sequence` before refresh.
- [x] Replace native `Label name` and `Set name` browser prompts with Coincides-owned input flows.
- [x] Fix top-right overlap: the floating `+ Insert` button can cover or steal clicks from Annotation Stack / Organizer controls such as `Sets`.
- [x] Keep Organizer open when selecting loose labels for membership; currently clicking a loose label can switch back to Annotation Stack/details.
- [x] Fix set description editing black-screen. Browser harness reproduced a black page with empty app root after editing AnnotationSet description; root cause was delayed React event access in Annotation Organizer draft state updates.
- [x] After the black-screen blocker is fixed, re-run persistence for set kind, description, color, add/remove member, member order, and refresh survival.
  - 2026-06-17 browser-harness result: description saves, `all_of` kind persists, teal color persists, and reordered members persist after refresh.
  - 2026-06-17 follow-up patch: Label / Child label / AnnotationSet / TextUnitGroup naming now uses Coincides-owned inline input instead of native browser prompts; row group rail hit target is wider; `+ Insert` hides while Annotation Stack / Organizer is open; Organizer loose-label selection stays inside Organizer as member-selection draft.

## V2.BN.8.7 ContentGroup Petal Refinement Follow-up

```text
status: technical seed implemented
owner: V2.BN.8.7 G browser/manual gate
```

- [x] Add pure `moveContentGroupPetal` service boundary.
- [x] Add model contract check for Petal reorder preserving member/source truth.
- [x] Add Single ContentGroup Editor drag handle for Petal local reorder.
- [ ] Browser-check Petal drag reorder in Single Editor.
- [ ] Decide whether Petal reorder also needs keyboard up/down controls.
- [ ] Polish drop target feedback if the first browser pass feels unclear.
- [ ] Keep Petal source-surface projection deferred; do not make Petal appear as a standalone source-text Label.

## V2.BN.8.7 ContentGroup Stability Follow-up

```text
status: technical seed implemented
owner: V2.BN.8.7 G browser/manual gate and later source resolver pass
```

- [x] Add derived `ContentGroupStabilitySummary`.
- [x] Add model contract coverage for empty/stale/orphan/deleted/archived/materialize-unavailable states.
- [x] Show a lightweight primary stability state in Rail, Gallery, and Single Editor.
- [x] Disable unsafe Identity Accept in Single Editor when the group is empty, deleted, or source/member state is unresolved.
- [ ] Browser-check whether Ready / Empty / Source changed / Source missing labels are visually clear.
  - 2026-06-22 first G gate: Empty group and Empty Petal were browser-checked and readable across Rail / Gallery / Single Editor.
  - Ready / Source changed / Source missing still need richer seeded data.
- [ ] Decide whether `Accept` should allow stale member state with an explicit confirmation instead of disabled state.
- [ ] Connect `sourceNoteAvailable` to a real source resolver when SourceArtifact / SourceAnchor entities mature.
- [ ] Connect `materializeTargetAvailable` to the future Materialize UI when that action is exposed.

## V2.BN.8.7 ContentGroup Browser Gate Follow-up

```text
status: first G gate passed; deeper manual scenarios pending
owner: V2.BN.8.7 continuation or Henry manual pass
```

- [x] Run local app through in-app browser.
- [x] Create smoke project and note without resetting local database.
- [x] Verify Rail `Collect` surface with quiet no-selection state.
- [x] Create an empty ContentGroup from Rail and verify empty stability label.
- [x] Verify Gallery `Organize` surface and card-level stability label.
- [x] Verify Single Editor `Refine` surface, disabled `Accept`, Petal creation, and draft save.
- [ ] Browser-test Rail `Editor` button directly from an expanded Rail group.
- [ ] Browser-test Petal drag reorder with at least two Petals.
- [ ] Browser-test GroupFolder move/delete behavior with richer folder data.
- [ ] Browser-test reuse UI once Reference / Duplicate / Fork / Materialize actions are exposed.
- [ ] Run mobile viewport check for Gallery and Single Editor.
