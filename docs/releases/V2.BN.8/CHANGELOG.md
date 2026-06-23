# CHANGELOG - V2.BN.8

# Verified - 2026-06-23 V2.BN.8.7.9.0 Main Group Verification

- Added `V2.BN.8.7.9.0-Main-Group-Verification-Report.md`.
- Verified backend ContentGroup entity cutover with `server npm run test:v2`, `server npm run build`, and `git diff --check -- server shared`; 129 server tests passed.
- Verified frontend ContentGroup surfaces with Gallery / Rail / Single Editor shell contract checks, model-contract smoke, client build, and client diff check.
- Verified broader editor foundation through Canvas runtime boundary check, model-contract smoke, client build, and client diff check.
- Verified docs/contracts/design evidence with `git diff --check -- PRODUCT.md docs` and `npm run check:changed-file-secrets`; secret scan passed across 263 changed files.
- Deleted ignored build outputs `client/dist` and `server/dist` again after verification regenerated them.
- No staging, commit, reset, broad cleanup, source migration, or line-ending normalization was performed.

# Added - 2026-06-23 V2.BN.8.7.9.0 Commit Boundary Plan

- Added `V2.BN.8.7.9.0-Commit-Boundary-Plan.md`.
- Split the dirty workspace into five recommended commit boundaries: backend ContentGroup entity cutover, frontend ContentGroup surfaces, editor foundation / TextFlow / Annotation / Canvas runtime work, server material/template/domain foundation, and docs/contracts/release/design evidence.
- Marked `.codex-tmp/` and `tmp/` as local ignored evidence / backup folders that should stay out of commits.
- Confirmed no staging or commit was performed during boundary planning.

# Changed - 2026-06-23 V2.BN.8.7.9.0 Workspace Commitability Cleanup

- Added `V2.BN.8.7.9.0-Workspace-Commitability-Cleanup-Patch-Note.md`.
- Added `V2.BN.8.7.9.0-Workspace-Commitability-Cleanup-Report.md`.
- Classified the dirty workspace into backend ContentGroup entity cutover, frontend ContentGroup surfaces, broader Better Notebook foundation work, and docs / contracts / design evidence.
- Deleted ignored generated build output directories `client/dist` and `server/dist` after verifying both resolved inside the workspace.
- Kept `tmp` and `.codex-tmp` because they contain backup / visual evidence and do not block Git commitability.
- No staging, commit, reset, broad clean, source migration, code rewrite, or line-ending normalization was performed.

# Added - 2026-06-23 V2.BN.8.7.9 ContentGroup System Closure Gate

- Added `V2.BN.8.7.9-ContentGroup-System-Closure-Gate-Plan.md`.
- Added V2.BN.8.7.9 to the Better Notebook roadmap as the final ContentGroup System closure gate before CanvasObject work.
- Added an Open Issues closure checklist for entity truth audit, remaining browser/manual smokes, and the final closure report.
- Clarified that mature ContentGroup reuse UI depends on CanvasObject / projection, so Reference / Duplicate / Fork / Materialize UI remains a V2.BN.8.8+ handoff rather than a forced 8.7 feature.
- Kept V2.BN.8.7.9 scoped to verification, small defect fixes, and release closure; no new SourceArtifact migration, CanvasObject projection, relation runtime, GraphRAG, destructive source mutation, true reorder, or offset rebase is introduced.

# Added - 2026-06-22 V2.BN.8.7.8 Single Editor Refine Shell And Logic Foundation

- Added `V2.BN.8.7.8-Single-Editor-Refine-Shell-And-Logic-Foundation-Plan.md`.
- Added `V2.BN.8.7.8-Single-Editor-Refine-Shell-And-Logic-Foundation-Patch-Note.md`.
- Added `singleContentGroupEditorShellModel.ts` as the Single Editor display-model layer for title, status, topic, role, summary, source note, folder path, member count, Petal count, and stability state.
- Added `check:single-editor-shell` to protect the non-canvas `Single Editor = refine` shell.
- Added a missing root `check:group-gallery-shell` script so Gallery / Rail / Single Editor shell checks can all run from the workspace root.
- Rebuilt Single Editor into a scoped refine shell with compact topbar, expandable summary bar, material shelf, Petal dock, and source drawer.
- Preserved existing Single Editor behavior: draft save, accept/reject/archive, member drop intake, member deletion, Petal create/rename/delete/reorder, fragment assignment, and return-to-source navigation.
- Browser-smoked the OpenDesign target and current Single Editor implementation at 1920 x 900 and recorded screenshots under `.codex-tmp`.
- Kept true workbench / CanvasObject / projection / Materialize / source mutation out of 8.7.8.

# Added - 2026-06-22 V2.BN.8.7.6 Groups Rail OpenDesign Shell Parity

- Added `V2.BN.8.7.6-Groups-Rail-OpenDesign-Shell-Parity-Plan.md`.
- Added `V2.BN.8.7.6-Groups-Rail-OpenDesign-Shell-Parity-Patch-Note.md`.
- Added `contentGroupRailShellModel.ts` as the Rail display-model layer for group row display, folder path, topic color, selection label, and member preview.
- Added `check:groups-rail-shell` to keep the Rail aligned with the collect-surface role and OpenDesign rail anatomy.
- Rebuilt Groups Rail as a right-side 360px collect panel with header, folder path bar, tool row, search row, local Folder / Topic / Role / All tabs, compact group rows, expanded drop area, and bottom status bar.
- Preserved current Rail workflows: create group, add current item, drag/drop member intake, open Gallery, open Single Editor, folder placement move, and soft delete.
- Browser-smoked Rail open, search filtering, Role tab switch, expanded `Open editor`, and Header open Gallery routing.
- Compared the implementation against the user-owned OpenDesign `groups-rail.html` prototype and documented fixed, kept, deferred, and rejected differences.

# Added - 2026-06-22 V2.BN.8.7.5 ContentGroup Gallery OpenDesign Shell Parity

- Added `V2.BN.8.7.5-ContentGroup-Gallery-OpenDesign-Shell-Parity-Plan.md`.
- Added `V2.BN.8.7.5-ContentGroup-Gallery-OpenDesign-Shell-Parity-Patch-Note.md`.
- Added `groupGalleryShellModel.ts` as the Gallery display-model layer for role/topic/source/status/member/Petal card facts.
- Added `check:group-gallery-shell` to prevent the Gallery shell from losing its OpenDesign resource-manager anchors.
- Rebuilt Group Gallery as a two-column resource-manager shell with folder tree, top search/actions, Folder/Topic/Role view tabs, current-folder breadcrumb, card grid, and bottom status bar.
- Updated Gallery cards with role tabs, topic signals, source note labels, status chips, member/Petal facts, and compact card actions.
- Preserved `note_id`, `folder_id`, `mode`, and `query` across Gallery browsing and Single Editor entry.
- Browser-smoked Gallery creation, folder create/delete, Topic view, search URL state, card-to-editor, and card-to-source-note flows.
- Compared the implementation against the user-owned OpenDesign `group-gallery.html` prototype and documented kept/fixed/deferred/rejected differences.

# Added - 2026-06-22 V2.BN.8.7.4.1 Workspace Closure Before OpenDesign Shell

- Added `V2.BN.8.7.4.1-Workspace-Closure-Before-OpenDesign-Shell-Patch-Note.md`.
- Inventoried the current dirty local workspace before starting OpenDesign shell parity work.
- Classified current local files into V2.BN.8.7 baseline, earlier V2.BN.8 foundation, later Henry decision items, and generated / temporary files.
- Confirmed that no obvious generated / temporary files are currently visible in Git status.
- Updated `v2GroupFolders` test coverage so folder placement checks `content_group_members` as active member truth instead of stale `content_groups.members_json`.
- Kept the cleanup as a documentation and classification patch only: no reset, clean, delete, stage, commit, CanvasObject work, or OpenDesign shell implementation.

# Changed - 2026-06-22 V2.BN.8.7.4 ContentGroupPetal And Fragment Entity Cutover

- Added `V2.BN.8.7.4-ContentGroupPetal-And-Fragment-Entity-Cutover-Plan.md`.
- Added `V2.BN.8.7.4-ContentGroupPetal-And-Fragment-Entity-Cutover-Patch-Note.md`.
- Defined the planned `content_group_fragments`, `content_group_petals`, and `content_group_petal_fragments` cutover.
- Added migration `034_v2_content_group_petals` and base schema definitions for the three Petal / Fragment tables.
- Moved active Fragment / Petal persistence out of `content_groups.fragments_json` / `content_groups.petals_json`.
- Hydrated entity rows back into `ContentGroupV1.fragments[]` and `ContentGroupV1.petals[]`.
- Cut `upsertContentGroup` over to entity-backed Fragment / Petal writes while clearing legacy JSON fields.
- Locked Petal / Fragment hard-delete semantics without source mutation.
- Added entity-backed cascade pruning when a `ContentGroupMember` is hard-deleted.
- Changed client Petal deletion to hard DTO removal while preserving the old function name as a compatibility wrapper.
- Kept `ContentGroupV1.fragments[]` and `ContentGroupV1.petals[]` as the client boundary.
- Confirmed that Single Editor visual redesign remains outside 8.7.4.

# Added - 2026-06-22 V2.BN.8.7.3 ContentGroupMember Entity Cutover Plan

- Added `V2.BN.8.7.3-ContentGroupMember-Entity-Cutover-Plan.md`.
- Added `V2.BN.8.7.3-ContentGroupMember-Entity-Cutover-Patch-Note.md`.
- Clarified that `ContentGroupMember` is a group-owned child entity, not a standalone product surface.
- Locked the 8.7.3 deletion rule: member deletion is hard delete, and dependent embedded Petals / fragments are pruned in the same write.
- Kept `ContentGroupV1.members[]` as the API shape while moving active persistence to `content_group_members`.

# Added - 2026-06-22 V2.BN.8.7.2 GroupFolder Entity And Placement Cutover Plan

- Added `V2.BN.8.7.2-GroupFolder-Entity-And-Placement-Cutover-Plan.md`.
- Reprioritized 8.7.2 as the `GroupFolder` / folder placement entity cutover.
- Moved `ContentGroupMember` and `ContentGroupPetal` entity cutovers to later 8.7.x versions.
- Clarified that `GroupFolder` owns organization truth and `content_group_folder_placements` owns group-folder membership, while source/member/petal truth remains unchanged.

# Changed - 2026-06-22 V2.BN.8.7.1 ContentGroup Entity Cutover Foundation

- Added the backend `content_groups` root table and mounted `/api/content-groups`.
- Added server-side ContentGroup service functions for list/get/upsert/replace-by-note/import-from-note-metadata.
- Added validator coverage that accepts existing runtime ids such as `content-group-*` instead of forcing UUID ids for frontend-created groups.
- Added frontend `contentGroupRepository.ts` so Rail / Gallery / Single Editor can load and save ContentGroups through entity APIs.
- Kept legacy note metadata groups as one-time import/fallback input only when a note has no entity-backed groups.
- Added folder-only metadata writing that strips legacy `canvas_engine_content_groups_v1` instead of continuing to write ContentGroups into note metadata.
- Updated Canvas adapter and Group Gallery data paths so ContentGroup saves no longer update note metadata arrays.
- Added model-contract coverage for entity-first merge behavior and legacy metadata stripping.
- Verified with model contract, runtime boundary check, client build, server v2 tests, and server build.

# Added - 2026-06-22 V2.BN.8.7 ContentGroup Reuse Service Boundary

- Added `contentGroupReuseService.ts`.
- Defined `ContentGroupReuseMode` as `reference`, `duplicate`, `fork`, `materialize`, and `open_original`.
- Added pure descriptor helpers for reference and open-original actions.
- Added duplicate and fork helpers that create new ContentGroup identities in a target context.
- Added fork lineage metadata.
- Added materialize plan generation with `moves_source = false` and one planned block per member.
- Added model-contract coverage for the reuse vocabulary and safe materialize plan behavior.

# Changed - 2026-06-22 V2.BN.8.7 GroupFolder Resource Manager First Pass

- Added `activeGroupFolders` as the service-owned active folder filter.
- Extended `groupFolderChildren` with an `includeArchived` management option while keeping default children active-only.
- Kept folder delete guards aware of archived children and active ContentGroups.
- Updated Gallery data helpers to use the service-owned active folder filter.
- Added model-contract coverage proving ContentGroup folder moves preserve member `current_content` and source snapshots.
- Documented that GroupFolder movement is organization only and does not move source truth.

# Changed - 2026-06-22 V2.BN.8.7 ContentGroup Member Source Boundary First Pass

- Added `ContentGroupMemberSourceSyncStatus` and `ContentGroupMemberSourceRefV1` to the runtime data contract.
- Extended `ContentGroupMemberV1` with `current_content`, `source_ref`, and `source_sync_status`.
- Added source-ref normalization and snapshot hashing in `contentGroupService.ts`.
- Added `compareContentGroupMemberWithSource` and `refreshContentGroupMemberFromSource` so compare and refresh are separate actions.
- Updated member display helpers to prefer `current_content` and keep `preview_text` as display cache.
- Added model-contract coverage for member/source divergence, changed source, missing source, and explicit refresh.
- Updated ContentGroup / GroupFolder and Notebook Object Inventory contracts with the first member/source boundary.

# Changed - 2026-06-22 V2.BN.8.7 ContentGroup Surface Role Contract First Pass

- Added `contentGroupSurfaceRoleService.ts` to stabilize the three ContentGroup surface roles: Rail = Collect, Gallery = Organize, Single Editor = Refine.
- Extended `canvasEngineModelContractCheck.ts` with a `ContentGroup surface roles` smoke group so these labels and verbs cannot drift silently.
- Added surface/role data markers to Groups Rail, Group Gallery, and Single ContentGroup Editor.
- Routed visible surface labels through the shared role contract.
- Reduced one Rail visual-noise issue by hiding the new-group intake/drop target when there is no active candidate selection.
- Added `V2.BN.8.6.31-ContentGroup-OpenDesign-Visual-Parity-Patch-Note.md` to track OpenDesign parity progress and remaining visual gaps.

# Changed - 2026-06-22 V2.BN.8.7 ContentGroup System Maturity Reassignment

- Reassigned `V2.BN.8.7` from CanvasObject / media / drawing seed to `ContentGroup System Maturity`.
- Added `V2.BN.8.7-ContentGroup-System-Maturity-Plan.md` as the active 8.7 planning target.
- Added `V2.BN.8.7-ContentGroup-System-Maturity-Master-Plan.md` as the execution-control plan for sub-plan sequencing, verification loops, and 8.6 deferred-scope triage.
- Deferred the earlier CanvasObject / media / drawing seed to `V2.BN.8.8+` or the next Canvas track, with the historical plan retained as a deferred draft.
- Shifted Canvas reliability / scale / export reserve to `V2.BN.8.9+`.
- Synced Roadmap, V2.BN.8 README, Plan, and Open Issues with the new sequencing.

# Changed - 2026-06-22 ContentGroup Doctrine Docs Sync

- Synced Product, PRD, Roadmap, Relation Product Design, TextFlow Contract, Petal Contract, ContentGroup / GroupFolder Contract, and Notebook Object Inventory with the 2026-06-20 Better Notebook ContentGroup reflection.
- Reaffirmed that TextFlow is content truth, Label is a visible marker / reusable range package, ContentGroup is the serious content package, Petal is the local group-internal role layer, and GroupFolder is the resource manager / Gallery scope.
- Recorded the V2.BN.8.6.27-8.6.30 editor foundation lane and kept destructive move / reorder deferred until range offset rebase is safe.
- Prepared the release docs for a handoff document that can reference current synced contracts instead of stale brainstorming notes.

# Changed - V2.BN.8.6.13-8.6.22 ContentGroup Gallery And Editor

- Added shared ContentGroup metadata helpers for groups, folders, annotations, reading interpretations, and proposals.
- Added GroupFolder as the ContentGroup organization/path layer, with ContentGroup depth derived from folder path.
- Added ContentGroup / GroupFolder graph integrity checks to the canvas model contract smoke.
- Added a reusable ContentGroup drag payload service for Draft Range, Label, and future block/object intake.
- Added draggable Draft Range and Label badge sources, plus Groups Rail drop intake for creating or appending ContentGroup members.
- Added the full-page `Group Gallery` route and left navigation entry.
- Added Gallery folder/topic/role browsing, note/folder context routing, folder creation, inline folder rename, group creation, and source-note jump links.
- Added Single ContentGroup Editor v1 for title/topic/role/summary editing, identity save/accept/reject, member previews, and Petal create/rename/archive.
- Added `V2.BN.8.6.13-8.6.22-ContentGroup-Gallery-And-Editor-Maturity-Review.md` as the manual-test handoff and maturity gate.
- Verified with model contract smoke and client build; remaining visual and command-surface polish is explicitly deferred.

# Changed - V2.BN.8.6.10 ContentGroup Identity Seed

- Replaced active ContentGroup `interpretation` usage with `identity`.
- Added identity statuses: `none`, `draft`, `accepted`, `rejected`, and `archived`.
- Treated `identity.status = accepted` as a ContentGroup state without adding a separate user-facing accepted-content object.
- Added accepted-to-draft invalidation when ContentGroup members or Petals change; title rename keeps accepted identity.
- Added reading projection for accepted identities (`knowledge_objects`) and draft identities (`draft_knowledge_candidates`).
- Model contract smoke now covers stale interpretation normalization, identity transitions, invalidation, and reading projection.

# Changed - V2.BN.8.6.9 ContentGroup Hardening And Integrity Gate

- Added ContentGroup member integrity metadata: `valid`, `stale`, `orphaned`, and `unsupported`.
- Added source-backed preview refresh helpers for ContentGroup and Petal members.
- Added ContentGroup integrity audit helpers so broken member references become visible instead of silently trusting stale preview text.
- ContentGroup Panel now shows compact stale/source-missing/unsupported member states and can refresh preview caches from source.
- Model contract smoke now covers ContentGroup integrity marking, source-backed preview refresh, orphan detection, and Petal-member audit behavior.
- Verified with `npm run smoke:canvas-engine-model-contract` and `npm run build:client`.

# Changed - V2.BN.8.6.6 TextFlow-First / ContentGroup Model Sync

- Synced V2.BN.8 docs after the 2026-06-18 model realignment: TextFlow is the content root, ContentRange is the location root, AnnotationTruth is the durable label / marker layer, and ContentGroup becomes the serious content-package direction.
- Marked AnnotationSet as a transitional V2.BN.8.6.6 seed instead of the long-term primary content-package model.
- Updated Product, PRD, TextFlow Contract, Annotation Contract, Notebook Object Inventory Contract, Command Surface Contract, Better Notebook Roadmap, Relation Product Design, Plan, and Open Issue handoff language.

# Changed - V2.BN.8.6.6 TextUnitGroup And AnnotationSet Editor Foundation Patch

- Added the first editable TextUnitGroup row-group workflow: row handle selection, group creation, quiet group rail, rename, and ungroup / soft delete.
- Kept TextUnitGroup as writing-layer infrastructure; new groups write `knowledge_role: null` and do not become semantic truth.
- Upgraded AnnotationSet with label, description, kind, color token, member order, normalization, persistence, and editor service helpers.
- Added Annotation Organizer panel for creating, editing, reordering, and deleting label sets without deleting the underlying AnnotationTruth records.
- Added context-menu entries for opening the label organizer and creating sets from labels.
- Upgraded reading projection so AnnotationSet output includes set kind, ordered member labels, range previews, and child summaries.
- Extended model contract smoke coverage for TextUnitGroup and AnnotationSet behavior.
- Verification passed: `npm run smoke:canvas-engine-model-contract` and `npm run build:client`.

# Changed - V2.BN.8.6.5 Context Menu Foundation Patch

- Added `docs/contracts/Command-Surface-Contract.md` to define active, reserved, deferred, and removed command surfaces.
- Added `commandSurfaceService.ts` and `ContextMenuLayer.tsx` as the first shared command menu foundation.
- Added text selection, annotation range preview, annotation highlight, and TextUnit handle context menu seeds.
- Renamed user-facing annotation action language to `Label` while keeping `AnnotationTruth` internal.
- Reserved Canvas blank, CanvasObject, Label Comment, mini toolbar, relation endpoint, source attach, and unsafe text mutation commands for later versions.
- Reduced the old floating annotation toolbar so single-range text selection is less intrusive.

# Changed - V2.BN.8.6.4 Annotation Display And Inspector Polish Patch

- Implemented `annotationDisplayService.ts` for label overlay visibility, visible annotation filtering, text-unit badge clusters, and block-level badge fallback.
- Added Preview-level label overlay toggle and threaded the state through the canvas runtime, chrome, writing surface, block editor, text projection, and annotation overlay.
- Moved text-backed label display away from whole-block corner piles and into local TextUnit clusters with `label +N` behavior.
- Flattened Annotation Stack hierarchy so metadata stays collapsed and ranges / children remain the main working area.
- Removed internal `Draft` wording from the selection toolbar display path.
- Applied the `impeccable` product UI gate for this visual polish pass.
- Added model contract smoke coverage for annotation display behavior.

# Changed - V2.BN.8.6.3 Source-Backed Annotation Range Editing Patch

- Implemented source-backed range preview editing: range preview edits now write back to original TextUnit / TextFlow source.
- Added range rebase helpers for same-TextUnit source edits and annotation preview edits.
- Kept `range_text_cache` as cache only, refreshed from source after supported edits.
- Preserved annotation hierarchy while marking ambiguous overlapping ranges for review.
- Added model contract smoke coverage for source-backed annotation range editing.

## Added - V2.BN.8.6.4 Annotation Display And Inspector Polish Plan

- Added `V2.BN.8.6.4-Annotation-Display-And-Inspector-Polish-Plan.md` as a narrow annotation display and inspector polish subversion before V2.BN.8.7.
- V2.BN.8.6.4 receives the visual/experience tails deferred from V2.BN.8.6.3: label overlay show/hide toggle, Annotation Stack hierarchy cleanup, text-near label badge, local multi-label clusters, and SelectionDraft toolbar polish.
- Marked V2.BN.8.6.4 as an explicit `impeccable`-gated product UI polish version. `taste skill` can be used as supplemental critique when Henry asks for it, but product UI constraints remain primary.
- Updated `README.md`, `Plan.md`, and `Open-Issue-And-Brainstorm-Checklist.md` so V2.BN.8.6.4 is treated as an explicit execution step rather than a loose future polish bucket.

## Added - V2.BN.8.6.3 Source-Backed Annotation Range Editing Plan

- Added `V2.BN.8.6.3-Source-Backed-Annotation-Range-Editing-Plan.md` as a narrow data-consistency subversion before V2.BN.8.7.
- V2.BN.8.6.3 is scoped to two-way sync between Annotation Stack range preview and TextFlow source: range preview edits write back to original TextUnit text, and normal TextUnit edits refresh annotation range cache.
- Explicitly separated annotation label edits from range source edits: label rename changes `raw_label`; it must not change original text or range preview source.
- Routed annotation visual tails to V2.BN.8.6.4: label visibility toggle, Annotation Stack redesign, local badge anchoring, multi-label cluster behavior, and mature selection polish.

## Closed - V2.BN.8.6.2 Annotation Hierarchy / SelectionDraft Closure

- Recorded Henry manual acceptance for V2.BN.8.6.2 on 2026-06-16 Toronto time.
- Closed the final TextUnit immediate-editing regression found during manual retest: a freshly created TextUnit is editable immediately, normal textarea clicks own caret placement, and delayed block autofocus no longer pulls the caret back to the wrong TextUnit after switching blocks.
- Confirmed the Annotation Stack hierarchy behavior is acceptable for this seed: child labels remain subordinate to parent annotations, and range-source direct editing stays deferred to a later 8.6.x / editor polish pass.
- Verification for the closing patch passed: `npm run smoke:canvas-engine-model-contract`, `npm run build`, `git diff --check`, and `npm run check:changed-file-secrets`.
- Handoff is now open for V2.BN.8.7 CanvasObject, Media Annotation, Drawing Tool, And Image Insert Seed.

## Changed - V2.BN.8.6.2 Annotation Hierarchy And Range Source Contract

- Added `parent_annotation_id` to `AnnotationTruthV1`, making child label ownership a data truth rather than a UI-only inference.
- Added annotation hierarchy helpers for root lookup, parent lookup, child lookup, inspector root resolution, hierarchy normalization, and visible hierarchy filtering.
- Updated child-label creation so children write both parent-side compatibility links and child-side parent truth.
- Updated Annotation Stack rendering so child labels remain inside parent annotation cards and can be focused without becoming sibling top-level cards.
- Added a same-TextUnit range rebase service seed for future source-backed range preview editing.
- Synced Annotation, TextFlow, and Notebook Object Inventory contracts with the hierarchy and range-source rules.

## Added - V2.BN.8.6.1 Selection Draft Engine Plan

- Added `V2.BN.8.6.1-Selection-Draft-Engine-Plan.md` as an inserted foundation subversion between V2.BN.8.6 and V2.BN.8.7.
- Added `V2.BN.8.6.1-Selection-Draft-Engine-Patch-Note.md`.
- Defined `SelectionDraft` as Coincides-owned runtime/editor selection truth; browser-native selection is now only an input signal for pointer / offset capture.
- Folded the unfinished child-label entry cleanup into V2.BN.8.6.1: child labels should be created by selecting a subrange inside an active parent annotation, not primarily through a generic Inspector text field.
- Synced `SelectionDraft` and the child-label interaction boundary into `Annotation-Contract.md`, `Notebook-Object-Inventory-Contract.md`, README, Plan, Open Issue, and roadmap.
- Marked V2.BN.8.7 CanvasObject / media annotation work as dependent on a stable SelectionDraft foundation.

## Fixed - V2.BN.8.6 Annotation Stack Editing And Additive Range Selection Hotfix

- Fixed the concrete Annotation Inspector input crash by reading input values before React functional state updates; this covers rename, same-range labels, and child-label inputs.
- Isolated Annotation Inspector / Stack pointer, click, double-click, and keyboard events so stack text editing does not leak into the canvas or block interaction layers.
- Added Ctrl / Command + mouse selection as a first additive annotation range-draft interaction.
- Added temporary inline highlights for uncommitted additive draft ranges, so Ctrl / Command selected ranges are no longer invisible.
- Prevented modifier-key release from clearing the just-added additive range draft.
- Kept Ctrl / Command additive selection sessions alive through textarea `select` events, so regular selection handling no longer wipes the draft before the temporary highlight can render.
- Blank page clicks and normal non-additive selections now clear mistaken additive draft ranges before the next annotation is committed.
- Added range identity / merge helpers so multi-range drafts deduplicate repeated selected spans before commit.
- Expanded the canvas model contract smoke to cover range identity and multi-range draft deduplication.
- Verification passed: `npm run smoke:canvas-engine-model-contract` and `npm run build:client`.

## Changed - V2.BN.8.6 Annotation Editor And ReadingInterpretation Seed Implementation

- Added `V2.BN.8.6-Annotation-Editor-And-ReadingInterpretation-Seed-Patch-Note.md`.
- Added overlap-aware annotation rendering, exact partial-span highlights, annotation stack summaries, block-level annotation entry, context annotation entry, and multi-range annotation draft controls.
- Added same-range label, child annotation, AnnotationSet, ReadingInterpretation, AnnotationProposal, and AI-readable projection service seeds.
- Annotation Inspector now supports stacked selected annotations and first-version edit/hide/show/delete/child-label actions.
- Note metadata persistence now includes seeds for AnnotationTruth, AnnotationSet, ReadingInterpretation, and AnnotationProposal records.
- Henry manual visual testing remains pending; do not treat this subversion as accepted until manual pass is recorded.

## Added - V2.BN.8.7 CanvasObject, Media Annotation, Drawing Tool, And Image Insert Seed Plan

- Added `V2.BN.8.7-CanvasObject-Media-Annotation-Drawing-Image-Seed-Plan.md` as the seventh V2.BN.8 subversion execution plan.
- V2.BN.8.7 is scoped as the first usable CanvasObject seed: minimal pen, rectangle shape, image insert, region selection, CanvasObject rendering/persistence, and CanvasObject/media-region annotation range support.
- The plan incorporates the V2.BN.8 Open Issue handoff items for CanvasObject, drawing/writing tool first, image insert, region reserve, and media annotation, while keeping mature infinite canvas, virtualization, relation overlay, multi-frame, presentation mode, and full export out of scope.
- Expanded the 8.7 plan and Open Issue handoff with explicit triage for deferred Project surface redesign, source snapshot fidelity, TextFlow assembly/editor work, complete media system, complete drawing app, and relation/graph work.
- Added 8.6-to-8.7 handoff preconditions and a deferred Open Issue routing section so CanvasObject work does not reopen annotation editor, TextFlow assembly, export, relation, source, or Project surface redesign scopes.
- README and V2.BN.8 Plan now point to the 8.7 plan.

## Added - V2.BN.8.6 Annotation Editor And ReadingInterpretation Seed Plan

- Added `V2.BN.8.6-Annotation-Editor-And-ReadingInterpretation-Seed-Plan.md` as the sixth V2.BN.8 subversion execution plan.
- V2.BN.8.6 is scoped as the first usable annotation editor seed: multiple labels on the same range, overlapping ranges, annotation stack badges, block-level annotation, multi-TextUnit / multi-range annotation, upgraded inspector behavior, and context entry points from selection / gutter / block toolbar.
- The plan incorporates the V2.BN.8 Open Issue 8.6 handoff items and makes `ReadingInterpretation` / `AnnotationProposal` a proposal layer instead of a truth-writing AI agent.
- The plan explicitly excludes full AI agent work, Relation runtime, SourceReference attach, media annotation, drawing tools, Structure Studio, global canonical role taxonomy, and fixed role slot schema.
- README and V2.BN.8 Plan now point to the 8.6 plan.

## Fixed - V2.BN.8.5 Partial Span Highlight Visibility

- Added first-version partial annotation highlight segments so exact text-span ranges are visibly marked without painting the whole TextUnit.
- Layered the visible highlight behind TextUnit textareas, preserving normal editing while making local annotations such as a selected suffix or a single word visible.
- Kept multi-label overlap blending, robust range rebasing, and richer span editing deferred to V2.BN.8.6.

## Fixed - V2.BN.8.5 Selection Range Expansion

- Tightened AnnotationTruth range creation so partial TextUnit selections keep only the selected substring in `range_text_cache`.
- Prevented collapsed selections from falling back to the whole TextUnit text cache.
- Adjusted TextBlock annotation rendering so full-row background only appears when an annotation range covers the whole TextUnit.
- Recorded multi-label, overlapping annotation, block-level annotation, and precise span rendering as V2.BN.8.6 handoff items in `Open-Issue-And-Brainstorm-Checklist.md`.

## Changed - V2.BN.8.5 Selection And AnnotationTruth Seed Implementation

- Added `V2.BN.8.5-Selection-And-AnnotationTruth-Seed-Patch-Note.md`.
- Added the first AnnotationTruth runtime/model seed, including annotation ranges, annotation sets, and proposal helpers.
- Added TextUnit selection capture and a compact selection toolbar for creating user-confirmed annotation labels.
- Added a low-noise annotation display seed and Annotation Inspector seed for rename, soft delete, status, marker, and range preview.
- Stored first-version annotation truth records on note metadata under `canvas_engine_annotations_v1`.
- Routed `/definition` to `annotation_action` metadata instead of independent DefinitionBlock creation.
- Verification passed so far: `npm run smoke:canvas-engine-model-contract` and `npm run build:client`.
- Browser Harness is intentionally skipped for this pass; Henry manual testing remains the final gate.

## Added - V2.BN.8.5 Selection And AnnotationTruth Seed Plan

- Added `V2.BN.8.5-Selection-And-AnnotationTruth-Seed-Plan.md` as the fifth V2.BN.8 subversion execution plan.
- V2.BN.8.5 is scoped as the first selection and annotation truth seed: text selection capture, `AnnotationTruth` runtime/service, subtle annotation render, selection toolbar / right-click entry, annotation inspector seed, and `AnnotationProposal` / `ReadingInterpretation` seed.
- Historical wording: the plan kept TextFlow as the writing substrate and AnnotationTruth as the semantic substrate. This is superseded by the 2026-06-18 TextFlow-first / ContentGroup model sync, where AnnotationTruth is the durable label / marker layer.
- `/definition` is routed toward selection -> AnnotationTruth workflow rather than independent DefinitionBlock creation.
- README and V2.BN.8 Plan now point to the 8.5 plan.

## Changed - V2.BN.8.4 Annotation-First Wording Sync

- Historical wording: updated `V2.BN.8.4-TextUnit-Editor-Seed-Plan.md` to replace older TextFlow-as-semantics wording with the then-current annotation-first model. This is superseded by the 2026-06-18 TextFlow-first / ContentGroup model sync.
- Definition now routes to future `AnnotationTruth.raw_label` and `ReadingInterpretation` proposal language instead of TextUnitGroup knowledge-role or role-slot language.
- InlineStructure is described as special rendering / stable anchor, not final semantic truth.

## Fixed - V2.BN.8.4 TextUnit Role Preservation And Reflow

- Fixed a TextUnit editor failure where Enter, slash writing-role conversion, or tail empty-line edits could temporarily desync plain text from `text_flow.units` and flatten list/toggle/todo roles back to paragraph.
- TextFlow alignment now preserves existing TextUnit identity and writing roles by line, only creating new units for newly added lines.
- Enter after toggle now exits to a normal paragraph row; Enter after todo now creates another unchecked todo row.
- Active paragraph/text measurement reflow now pushes following blocks down instead of letting a growing TextBlock overlap them.
- Browser Harness verified paragraph Enter, toggle Enter, `/todo`, todo Enter, and downstream block reflow; `npm run smoke:canvas-engine-model-contract` and client `npm run build` passed.

## Fixed - V2.BN.8.4 TextUnit Manual Test Follow-up

- Fixed first-layer TextUnit editor issues found during Henry's manual test.
- TextUnit `Enter` splitting now synchronously publishes the new TextFlow and focuses the new line before the next typed character.
- Plain TextUnit rows now use the full writing width instead of shrinking into the marker column.
- Numbered list display now starts from `1.` inside a continuous same-level numbered-list run instead of using the global TextUnit index.
- Todo TextUnits now render a real checkbox backed by `metadata.checked`.
- Toggle TextUnits now render a real collapse / expand marker backed by `metadata.collapsed`.
- Model contract now covers tail split, numbered ordinals, marker display, and todo metadata updates.
- Verification passed: `npm run smoke:canvas-engine-model-contract` and `npm run build:client`.

## Changed - V2.BN.8.4 TextUnit Editor Seed Implementation

- Added `V2.BN.8.4-TextUnit-Editor-Seed-Patch-Note.md`.
- Added first-version TextUnit editor service for split, merge, writing role, indent, paste parser, and TextFlow split / merge seed.
- TextBlock editing now renders TextUnits as quiet line-level editors instead of one flat textarea.
- TextUnit gutter seed now supports insert-below and writing role changes without becoming a new block control bar.
- Slash writing role commands now route `/heading`, `/quote`, `/bullet`, `/numbered`, `/todo`, and `/toggle` through TextUnit writing roles.
- `/definition` remains retired from active independent block creation; `/code` remains an independent CodeBlock command.
- Verification passed: `npm run smoke:canvas-engine-model-contract` and `npm run build:client`.

## Added - V2.BN.8.4 TextUnit Editor Seed Plan

- Added `V2.BN.8.4-TextUnit-Editor-Seed-Plan.md` as the fourth V2.BN.8 subversion execution plan.
- V2.BN.8.4 is scoped as the first TextUnit editor seed: Enter / Backspace / Tab, TextUnit gutter, writing roles, paste-to-TextFlow parser, and split / merge seed.
- The plan records the next block-retreat decision: `Heading` should no longer be an active independent block family; it becomes a TextUnit writing role.
- The plan keeps CodeBlock conservative: inline code / code line can move into TextFlow, but multiline / copyable / language-aware code regions remain independent CodeBlocks.
- README, V2.BN.8 plan, and Better Notebook roadmap now point to the 8.4 plan.

## Changed - V2.BN.8.3 Block Retreat And Definition Retirement

- Added `V2.BN.8.3-Block-Retreat-And-Definition-Retirement-Patch-Note.md` to record Henry-approved scope for the 8.3 patch.
- V2.BN.8.3 now treats `Definition` as a future AnnotationTruth label / ReadingInterpretation proposal direction, not as a default independent block family.
- Slash command registry no longer lets `/definition` create an independent DefinitionBlock; it remains only as a disabled future TextFlow role-marking command.
- Advanced Insert no longer includes `definition.basic` in the active default insert templates.
- Open Issue now separates the immediate 8.3 patch bucket from the V2.BN.8.x handoff buckets.
- Roadmap / V2.BN.8 plan / README now route TextUnit editor, TextUnit gutter, paste parser, split/merge, annotation actions, AnnotationTruth editor, ReadingInterpretation proposal seed, drawing tools, image insert, scale and export reserve into later V2.BN.8.x subversions.
- Verification passed: `npm run smoke:canvas-engine-model-contract`, `npm run build:client`, `git diff --check`, and `npm run check:changed-file-secrets`.
- Henry manual pass recorded; V2.BN.8.3 is closed.

## Added - V2.BN.8.3 TextFlow Seed And Slash Command Foundation

- Added first-version `TextBlockContentV1` runtime types: `TextUnit`, `TextUnitGroup`, legacy-named `InlineStructuredObject` runtime records, `TextFlowProjection`, and addressable projection objects. Product-facing docs now call this layer `InlineStructure`.
- Added `textFlowService.ts` as the TextFlow projection seed. It initializes fresh TextBlocks as one paragraph TextUnit, reads valid TextFlow payloads, falls back softly for malformed development data, and exposes TextUnit / TextUnitGroup / legacy inline-structure projection records.
- Non-structured text-like blocks now attach fresh TextFlow when created or edited. Definition and Formula blocks keep their field payloads as their current content truth.
- Text-like block read paths now prefer valid TextFlow projection before `body` / `plain_text` cache, so the seed behaves like content truth instead of an attached label.
- Slash commands now carry explicit command metadata: `create_block`, `convert_block`, `insert_structure`, and `inline_action`, plus object-kind metadata. Future list / inline formula / divider commands are visible as disabled reserved items rather than pretending to be implemented.
- `canvasEngineModelContractCheck` now covers the TextFlow seed, TextFlow-before-body read priority, and slash command foundation. The check uses local command/template fixtures instead of loading the runtime template service.
- This implementation intentionally does not add a legacy adapter. Existing local prototype accounts and test data are not product data; new TextBlocks should enter the fresh TextFlow path directly.
- TextUnitGroup addressable projection now resolves child TextUnit text recursively instead of exposing only child ids, keeping the projection seed AI/read/search/relation useful.
- Browser Use smoke was recorded for `/for`: the slash menu anchors near the active text block, `Formula` is active, disabled `Inline Formula` explains its future scope, and ArrowDown / ArrowUp move active selection.
- Fixed the viewport-level Advanced Insert entry by restoring pointer-events on floating tool rail / insert panel children.
- Advanced Insert now labels the `code.snippet` template as `Code`, matching the `CODE` block badge and avoiding the older `Code Snippet` wording.

## Changed - V2.BN.8 Canvas And TextFlow Roadmap Sync

- V2.BN.8 总目标从单纯 Canvas Engine Foundation 扩展为 Canvas Engine And TextFlow Foundation。
- V2.BN.8.3 明确为 TextFlow Seed And Slash Command Foundation：需要落下 `TextBlock` / `TextUnit` / `InlineStructure` / `TextUnitGroup` 的代码和合同种子，不只是产品定义文档。
- V2.BN.8.x 后续小版本重新排布为 TextUnit editor、selection / annotation truth、annotation editor / ReadingInterpretation、CanvasObject / drawing tool / image insert seed 等渐进地基。
- A9 从原先偏 block template 的设想升级为 Structure Studio And Editor Productization，负责 annotation workflow、AI reading proposal、annotation style、block shell、appearance 和 editor behavior。
- 新增 `docs/contracts/TextFlow-Contract.md`，并同步 PRODUCT、PRD、Block Contract、Relation Product 和 V2.BN.8 文档入口。

## Changed - V2.BN.8.2 Canvas Shell And Viewport Transform Patch

- Runtime model now exposes `viewport`, so the UI can reason about current Canvas viewport state instead of only using viewport as an internal visibility filter.
- Added first-version viewport transform helpers for canvas initial headroom, pan, scroll, zoom, and viewport-to-world coordinate conversion.
- Added `useViewportTransformController` to own Canvas viewport state under the surface state boundary.
- Canvas mode now uses a transformed world layer inside a single viewport surface instead of depending on nested native scroll areas.
- Canvas mode supports:
  - Space / middle-button drag panning;
  - wheel / trackpad panning;
  - Ctrl/Command + wheel zooming;
  - Ctrl/Command + `+` / `-` / `0` keyboard zoom in / zoom out / reset.
- Double-click block creation and block move/resize now compensate for Canvas zoom.
- Slash menu now supports keyboard selection with ArrowUp / ArrowDown and Enter.
- Overlay anchor records now preserve explicit source labels (`caret`, `block`, `fixed_viewport`, `formula_help`, `source_picker`, `relation_endpoint`) and the model contract covers world rect -> viewport rect conversion.
- Empty Canvas drafts now disappear when the user clicks blank canvas space instead of leaving a stray focused draft behind.
- Added `V2.BN.8.2-Mature-Notebook-Baseline-Audit.md` to record the mature notebook baseline and avoid letting Canvas work displace core note quality.
- Verification passed:
  - `npm run smoke:canvas-engine-model-contract`;
  - `npm run build:client`;
  - `npm run verify:v2-bn8-runtime`;
  - Browser Use smoke for Canvas mode viewport headroom, wheel pan, keyboard zoom, Page/Canvas round trip, slash keyboard commit, workspace block reload persistence, empty draft cleanup, toolbar follow, and Preview overlay hit-test.

## Added - V2.BN.8.2 Canvas Shell And Viewport Transform Plan

- 新增 `V2.BN.8.2-Canvas-Shell-And-Viewport-Transform-Plan.md`，锁定下一小版本范围：
  - Priority 1：Canvas Shell 打磨稳定；
  - Priority 2：Pan / Zoom / Viewport Transform；
  - Priority 3：Overlay / Anchor 统一，并补入 slash menu 键盘上下选择与 Enter 确认；
  - Priority 4：成熟笔记 baseline audit。
- 明确本小版本排除 Relation、Graph DB、GraphRAG、Agent、Template Studio、完整 drawing tool、多 frame 产品化、presentation mode 和完整导入导出系统。
- `README.md` 已加入 V2.BN.8.2 计划入口。

## Changed - V2.BN.8.1 Canvas Runtime Workspace / Snap / Scroll Patch

- 修复 Canvas mode 下 workspace block 重新进入 note 后被还原进 PageFrame 的问题：workspace layout 在 Canvas mode 还原时使用 canvas workspace 宽度，不再被 page content width 夹回正式页面区域。
- `normalizeBlockLayout()` 现在会保留已存储的 measured height，避免 Definition / Formula / Code 等 structured block 在刷新或重新测量前使用过矮的估算高度，降低偶发穿模和 snap 失效风险。
- block 拖动现在按 surface mode 使用不同的 X 轴边界：Page mode 使用 page content width，Canvas mode 使用 workspace width。
- snap alignment 开启时，拖动候选布局会进入 stacked collision resolution，避免 snap on 但 block 仍互相重叠的状态。
- Canvas mode 进入时会给 app main scroll 加 runtime lock，让外层页面不再和 canvas surface 同时滚动；Canvas surface 自己保留水平/垂直滚动。
- `canvasEngineModelContractCheck` 新增 workspace restore 与 snap-on collision 回归断言。
- 验证通过：
  - `npm run verify:v2-bn8-runtime`
  - Browser Harness 当前 note smoke：Page mode 无错误覆盖；切换 Canvas mode 后 body runtime lock 生效、main overflow 为 hidden、content padding 为 0、canvas surface 负责 X/Y 滚动。

## Changed - V2.BN.8.1 Browser Harness Status Sync

- `Review.md` / `Experience-Review.md` 同步最新 Browser Harness 结果：最终基础 smoke 已通过，早先 Chrome remote debugging blocker 只保留为 superseded historical attempt。
- `V2.BN.8.1-Runtime-Replacement-Plan.md`、`V2.BN.8.1-Layer-Acceptance-Audit.md`、`V2.BN.8.1-Final-Smoke-Protocol.md` 同步为 Browser Harness passed / Henry manual pass pending。
- `V2.BN.8.1` 仍不能关闭，唯一剩余硬门槛是 Henry manual visual / interaction pass。

## Changed - V2.BN.8.1 Non-Browser Verification Refresh

- 刷新 `V2.BN.8.1` 非浏览器验收证据：
  - `npm run build:client` passed；
  - `npm run smoke:canvas-engine-performance` passed；
  - `server/npm run build` passed；
  - `git diff --check` passed；
  - changed-file secret scan 无新增文件可扫。
- `Review.md` 后续已更新：Browser Harness 暂缓是历史状态，最终基础 smoke 已补跑并通过。
- `Open-Issue-And-Brainstorm-Checklist.md` 明确区分 `V2.BN.8.1` runtime replacement 硬门槛与后续 `V2.BN.8.x` polish backlog。
- 新增 `V2.BN.8.1-Layer-Acceptance-Audit.md`，逐层记录 L0-L12 当前证据、剩余硬门槛和后续 polish backlog。
- 新增 `V2.BN.8.1-Final-Smoke-Protocol.md`，固定最终 Browser Harness / Henry manual pass 的执行范围与记录格式。
- 早先最终 Browser Harness retry 曾被 Chrome remote debugging authorization / CDP websocket handshake timeout 阻塞；该阻塞后续已被通过的 Browser Harness smoke 取代。本小版本仍需 Henry manual pass 才能关闭。

## Changed - V2.BN.8.1 Runtime Presentation Controller Seed

- 新增 `hooks/useRuntimePresentationController.ts`，把 PageFrame / Canvas runtime model composition 与 `NoteChromeLayer` / `NoteRuntimeDocumentLayer` props composition 收进一个 L4/L9/L12 presentation boundary。
- `useNoteCanvasRuntimeController()` 不再直接调用 `useRuntimeFrameModelController()` 或 `useNoteCanvasLayerProps()`。
- `useNoteCanvasLayerPropsInput` 现在作为导出类型供 presentation controller 复用，避免重复手写 layer props contract。
- 本轮不改变 PageFrame height、export preview、chrome props、writing surface props、floating panel props 或任何用户可见行为。

## Changed - V2.BN.8.1 Runtime Layer Props Side Effect Boundary Seed

- `useNoteCanvasLayerProps()` 现在自己读取 route navigation 和 favorite toast callback，不再要求 `useNoteCanvasRuntimeController()` 传入 `navigate` 或 favorite `addToast`。
- `useRuntimeBlockOperationsController()` 现在自己读取 slash/natural-writing 所需的 toast callback，不再要求 runtime root 传入 `addToast`。
- `useNoteCanvasRuntimeController()` 不再直接导入 `useNavigate()` 或 `useUIStore()`；root 继续只组合 runtime controllers、frame model 和 layer props。
- 本轮不改变返回 Project、Favorite 提示、slash command disabled/template warning toast 或任何用户可见行为。

## Changed - V2.BN.8.1 Runtime Block Operations Controller Seed

- 新增 `hooks/useRuntimeBlockOperationsController.ts`，把 block lifecycle history、natural writing、structured field editing、measured reflow、move / resize placement interaction 组合进一个 L6/L7/L8/L11 block operations boundary。
- `useNoteCanvasRuntimeController()` 不再直接调用 `useRuntimeBlockHistoryController()`、`useRuntimeNaturalWritingController()`、`useRuntimeBlockEditingController()` 或 `useRuntimePlacementInteractionController()`。
- 本轮不改变 create / trash / undo-redo、slash command、draft persistence、Definition / Formula field draft、measured height reflow、move / resize、snap 或 elastic avoidance 行为，只继续压缩 runtime root 对 block operation 细节的直接感知。

## Changed - V2.BN.8.1 Runtime Document Data Controller Seed

- 新增 `hooks/useRuntimeDocumentDataController.ts`，把 layout draft state、note load reset、note data adapter 和 note-level source stats 组合进一个 L2/L5/L6 document data boundary。
- `useNoteCanvasRuntimeController()` 不再直接调用 `useLayoutDraftController()`、`useNoteLoadResetController()`、`useNoteCanvasDataAdapter()` 或 `useRuntimeDocumentStatsController()`。
- 本轮不改变 note/block API、layout draft truth、source reference count、title 保存、block 创建/保存/删除或 source jump 行为，只继续压缩 runtime root 的 document data composition。

## Changed - V2.BN.8.1 Runtime Surface State Controller Seed

- 新增 `hooks/useRuntimeSurfaceStateController.ts`，把 interaction state、layout/snap mode、floating overlay、block selection、surface mode 和 layout refs 组合进一个 L8/L9/L10 surface state boundary。
- `useNoteCanvasRuntimeController()` 不再直接调用 `useRuntimeInteractionController()`、`useRuntimeLayoutRefsController()`、`useLayoutInteractionController()`、`useFloatingOverlayController()`、`useBlockSelectionController()` 或 `useSurfaceModeController()`。
- 本轮不改变 Page / Canvas 切换、preview / insert / more / info overlay、block 选中、layout mode、snap on/off 或 measured reflow suppression 行为，只继续压缩 runtime root 的 surface state composition。

## Changed - V2.BN.8.1 Runtime Natural Writing Controller Seed

- 新增 `hooks/useRuntimeNaturalWritingController.ts`，把 draft block lifecycle、slash command controller 和 blank surface pointer creation/selection clearing 组合进一个 L8/L9/L10 natural writing boundary。
- `useNoteCanvasRuntimeController()` 不再直接调用 `useDraftBlockController()`、`useSlashCommandController()` 或 `useCanvasSurfacePointerController()`。
- 本轮不改变 draft 持久化、`/` 命令、Ctrl+Enter、新 block 落点、snap on/off 或空白点击取消选中行为，只继续压缩 runtime root 的自然写作入口 composition。

## Changed - V2.BN.8.1 Runtime Placement Interaction Controller Seed

- 新增 `hooks/useRuntimePlacementInteractionController.ts`，把 block move / resize interaction session 与 text height estimate dependency 收进一个 L5/L7/L8 controller boundary。
- `useNoteCanvasRuntimeController()` 不再直接调用 `useBlockPlacementInteractions()`，也不再直接导入 `estimateBlockHeightForText()`。
- 本轮不改变 move / resize、snap、elastic avoidance、layout history 或 measured reflow 行为，只继续压缩 runtime root 对 placement interaction 细节的感知。

## Changed - V2.BN.8.1 Runtime Document Stats Controller Seed

- 新增 `hooks/useRuntimeDocumentStatsController.ts`，把 note-level source reference count 从 runtime root 中迁出。
- `useNoteCanvasRuntimeController()` 不再直接使用 `useMemo()` 计算 `sourceReferenceCount`，而是消费 document stats controller 的输出。
- 本轮不改变 source reference truth、Note chrome 展示、Preview 统计或 Source Library 行为，只继续压缩 runtime root 的 document stats composition。

## Changed - V2.BN.8.1 Runtime Block Editing Controller Seed

- 新增 `hooks/useRuntimeBlockEditingController.ts`，把 structured field draft update 和 measured block height reflow 组合进一个 L6/L7 block editing boundary。
- `useNoteCanvasRuntimeController()` 不再直接调用 `useBlockFieldDraftController()` 或 `useMeasuredBlockReflowController()`。
- 本轮不改变 Definition / Formula 字段 truth、不改变 measured height reflow、不改变 active structured block 展开推开下方 block 的行为，只继续压缩 runtime root 的 block editing composition。

## Changed - V2.BN.8.1 Runtime Frame Model Controller Seed

- 新增 `hooks/useRuntimeFrameModelController.ts`，把 PageFrame height、primary PageFrame、Canvas runtime model、relation endpoint reserve 和 export preview model 的组合放进 L4 frame model boundary。
- `useNoteCanvasRuntimeController()` 不再直接调用 `useNoteCanvasFrameModel()`。
- 本轮不改变 PageFrame 计算、workspace policy、export preview 内容、relation endpoint reserve 或用户可见布局，只继续压缩 runtime root 的 frame/model composition。

## Changed - V2.BN.8.1 Runtime Layout Model Controller Seed

- 新增 `hooks/useRuntimeLayoutModelController.ts`，把 content width、visible blocks、resolved block layouts、default draft layout 和 layout persistence callbacks 组合进一个 L3-L5 controller boundary。
- `useNoteCanvasRuntimeController()` 不再直接调用 `useCanvasContentWidth()`、`useNoteCanvasResolvedLayoutModel()` 或 `useLayoutPersistenceController()`。
- 本轮不改变 placement 计算、Page / Canvas mode policy、layout draft truth、layout persistence payload 或用户可见行为，只继续压缩 runtime root 的 layout/model composition。

## Changed - V2.BN.8.1 Runtime Block History Controller Seed

- 新增 `hooks/useRuntimeBlockHistoryController.ts`，把 `usePlacementHistory()` 与 block trash history glue 从 `useNoteCanvasRuntimeController()` 中迁出。
- `useNoteCanvasRuntimeController()` 继续组合 runtime controllers，但不再直接拥有 placement history hook 或 toolbar trash 后的 history 登记逻辑。
- `trashBlock()` 成功后登记 `trashedBlock` history 的行为保持不变；draft 创建仍直接接入 `pushCreatedBlockHistory`。
- 本轮不改变 create / trash / undo / redo 的用户可见行为，只继续压缩 runtime root 的历史状态边界。

## Changed - V2.BN.8.1 Runtime History Direct Draft Bridge Cleanup

- `useNoteCanvasRuntimeController()` 不再用 `pushCreatedBlockHistoryRef` 桥接 draft 创建历史。
- `usePlacementHistory()` 现在在 draft controller 之前初始化，`onDraftPersisted` 直接接入 `pushCreatedBlockHistory`。
- 该改动不改变 create / trash / undo / redo 行为，只减少 runtime root 内的临时 ref glue。

## Added - V2.BN.8.1 Canvas Engine Performance Seed

- 新增 `npm run smoke:canvas-engine-performance`，作为不依赖浏览器的 Canvas Engine 纯逻辑性能 seed。
- 覆盖 50 blocks、200 blocks、long paragraph、formula-heavy、page + workspace mixed note 五个场景。
- 该 seed 调用 `placementService` / `engineModel` 的生产纯函数，验证 placement、reflow、snap、runtime model、relation endpoint reserve 和 layout history diff 的基础路径。
- 本 seed 不替代 Browser Harness 或 Henry 手动体验验收；它只证明核心布局模型在非 DOM 场景下没有明显算法退化。

## Changed - V2.BN.8.1 Runtime History Keyboard Intent Service Seed

- 新增 `historyService.ts`，集中定义 `RuntimeHistoryEntry`、`RuntimeHistoryKeyboardIntent` 和 `getRuntimeHistoryKeyboardIntent()`。
- Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z 的按键意图判断从 `usePlacementHistory()` 中迁出，进入纯 history service。
- `usePlacementHistory()` 继续持有 undo / redo stacks 和真实数据 mutation callbacks，但不再自行解释快捷键语义。
- 本轮不改变 move / resize / create / trash 的 undo-redo 行为，也不实现 source / relation / inline formula undo。

## Changed - V2.BN.8.1 Surface Mode Transition Policy Seed

- `modePolicyService.ts` 新增 `SurfaceModeTransitionPolicy` 和 `createSurfaceModeTransitionPolicy()`。
- Page / Canvas 切换时的 transient cleanup 规则现在由 mode policy 产出：关闭 overlay、清空 snap guide、清除 block selection。
- `useSurfaceModeController()` 不再自行决定这些副作用，只执行 mode policy 返回的 transition record。
- 本轮不改变 Page / Canvas 的用户可见行为，也不实现 pan / zoom；它只是 L10 mode policy 的进一步收口。

## Changed - V2.BN.8.1 Overlay Callers Anchor Record Migration

- `getSlashMenuAnchor()`、`getBlockControlAnchor()` 和 `getTooltipAnchor()` 现在先创建 `ViewportOverlayAnchor`，再通过 `placeAnchoredOverlay()` 进入 shared placement helper。
- 这让当前三个真实 overlay 调用点开始使用 normalized anchor record，而不是各自直接把 DOM rect 塞进 placement helper。
- 本轮不改变用户可见 placement 行为；DOM rect 仍是当前 fallback 来源，后续再逐步替换为真正的 world/caret anchor。
- 这一步关闭 “individual overlay callers 尚未全面迁移到 anchor record” 的第一版技术缺口，但不关闭完整 caret/world anchor service。

## Changed - V2.BN.8.1 World Overlay Anchor Seed

- `overlayService.ts` 新增 `ViewportOverlayAnchor`、`createViewportOverlayAnchor()`、`worldRectToViewportRect()`、`createWorldOverlayAnchor()` 和 `placeAnchoredOverlay()`。
- 这一步把 L9 的 overlay anchor 从“直接拿 DOM rect 摆位置”推进到“可以表达 viewport anchor，并能从 Canvas world rect 转成 browser viewport rect”。
- 当前只是 world/screen anchor seed，不改变现有 slash menu、block control bar、Formula help tooltip 的用户可见行为。
- 后续 pan/zoom、virtualization、canvas object、relation endpoint 等功能可以复用这套 anchor record，而不是各自硬算浮层位置。
- 这仍不是完整 overlay collision / flip / viewport clamp engine，也不是最终 cursor/caret world anchoring。

## Changed - V2.BN.8.1 Shared Overlay Placement Helper Seed

- `overlayService.ts` 新增 `placeOverlayInViewport()`，作为第一版 shared viewport overlay placement helper。
- Slash menu、selected block control bar、Formula help tooltip 现在都通过同一个 helper 做 viewport padding、基础 clamp 和简单 fallback placement。
- Slash menu 继续优先出现在 caret 下方，空间不足时可翻到上方。
- Block control bar 继续优先出现在 selected block 右侧，右侧空间不足时可翻到左侧。
- Formula help tooltip 继续优先出现在 help button 下方，底部空间不足时可翻到上方。
- 这仍是 L9 seed，不是完整 collision / flip / viewport clamp engine；未来 pan/zoom/world transform 仍需要更正式的 anchor service。
- client build passed。

## Changed - V2.BN.8.1 Formula Help Overlay Portal Seed

- `FormulaBlockProjection` 的 `?` help tooltip 现在通过 `FloatingOverlayLayer` free placement 渲染，不再作为 block-local hover 子元素参与 block DOM 层级。
- `overlayService.ts` 新增 `getTooltipAnchor`，用 help button 的 viewport rect 计算第一版 tooltip anchor，并在靠近 viewport 底部时向上翻转。
- Formula help tooltip 继续只说明独立 FormulaBlock 的 LaTeX body / delimiter 规则，不改变 `latex_input` field truth、paste sanitizer、preview render 或保存路径。
- `NoteDetail.module.css` 新增 `formulaHelpTooltipFloating`，让说明气泡作为 pointer-events isolated 的 viewport overlay 显示。
- 本轮仍不实现完整 overlay collision / flip service，也不实现正文 inline formula conversion。
- client build passed。

## Changed - V2.BN.8.1 Slash Menu And Block Control Overlay Portal Seed

- `SlashMenuLayer` 现在通过 `FloatingOverlayLayer` free placement 渲染，菜单坐标从 block-list-relative seed 改成 viewport/caret anchor seed。
- `BlockControlBarLayer` 现在通过 `FloatingOverlayLayer` free placement 渲染，只在 active block 上显示。
- `BlockEditorLayer` 为当前 active block 计算 viewport anchor，使 control bar 不再作为 block DOM flow / measurement 的一部分。
- `overlayService.ts` 新增 `getBlockControlAnchor`，先用 selected block 的 viewport rect 做第一版锚点计算。
- `NoteDetail.module.css` 新增 `blockToolbarFloating`，让 portal 内 control bar 可交互且不依赖 `.blockActive .blockToolbar` 局部层级。
- 本轮不改变 control bar 的按钮能力；Move、AI visibility、export status、save、trash 仍沿用既有回调。
- 完整 overlay collision / flip service 仍留给后续 L9 work。
- client build passed。

## Changed - V2.BN.8.1 Insert And Source Overlay Portal Seed

- 新增 `canvasEngine/layers/NoteFloatingPanelLayer.tsx`，把 Insert floating action / Advanced Insert panel / Source jump panel 从 `NoteChromeLayer.tsx` 中拆出。
- `FloatingOverlayLayer` 增加 `free` placement，用来承载 viewport-fixed controls，而不是强制所有浮层进入右上角 stack。
- `+ Insert` / Advanced Insert 现在通过 `FloatingOverlayLayer` free placement 渲染，继续保持 viewport floating action，不参与 PageFrame / block measurement。
- Source jump panel 迁入 `FloatingOverlayLayer` viewport overlay stack，不再作为 document shell 内部内容撑开页面。
- `NoteRuntimeDocumentLayer` 改为消费独立的 `NoteFloatingPanelLayer`，`NoteChromeLayer` 回到只负责 note top chrome / info / actions / preview。
- 本轮仍不迁移 slash menu、block control bar、formula help tooltip；这些继续保留为后续 L9 overlay anchor work。
- client build passed。

## Changed - V2.BN.8.1 Floating Overlay Portal Seed

- 新增 `canvasEngine/layers/FloatingOverlayLayer.tsx`，作为第一版 viewport-level overlay portal / z-index stack。
- `NoteChromeLayer` 中的 Note info、More actions、Export preview 面板迁入 `FloatingOverlayLayer`，不再依赖 `noteChrome` 局部 absolute stacking context。
- `ExportPreviewLayer` 增加 floating panel class，使 preview 面板在 portal 中使用统一层级和尺寸规则。
- `NoteDetail.module.css` 新增 `floatingOverlayPortal` / `floatingOverlayStack` / `floatingPanelPopover`，让 floating panels 覆盖 block toolbar，而不吞掉页面其它点击。
- `Canvas-Engine-Interaction-Contract.md` 同步 overlay portal 规则：主浮层进入 viewport overlay stack，portal shell 不吞掉页面点击。
- 本轮不迁移 slash menu、insert panel、source jump、block control bar 或 formula help tooltip；这些仍是后续 L9 work。

## Changed - V2.BN.8.1 L12 Decommission Evidence Audit

- `V2.BN.8.1-Runtime-Replacement-Plan.md` 更新当前状态：`NoteDetail.tsx` 已经不是旧 runtime 主体，而是 `noteId` route shell + `NoteCanvasRuntimeProvider` + `NoteCanvasRuntime`。
- `Review.md` 新增 L12 decommission evidence audit，明确旧 startup snapshot 已被当前代码状态 superseded。
- `Experience-Review.md` 新增 L12 runtime ownership note，说明用户进入 note 页面时已经进入 Canvas Engine runtime path。
- 本轮不改产品代码；仍不把 V2.BN.8.1 标记为完成，因为 browser smoke、performance seed 和 Henry manual pass 仍未完成。

## Changed - V2.BN.8.1 PageFrame Content Inset Seed

- `PageFrameModel` 新增 `contentInset`，用来区分 formal page outer boundary 和正式书写 content area。
- 默认 PageFrame 现在由 `760px` content width 加左右 `72px` inset 组成；block placement 坐标仍保持为 content area 坐标，避免现有测试布局大迁移。
- Canvas mode 的 formal PageFrame boundary 现在使用 outer frame 起点和宽度渲染，不再把正文起点当作页面外框起点。
- Writing surface 增加 `data-page-frame-inset-left/right` debug attributes，便于后续 Browser/DevTools 验证。
- 本轮不实现完整 Word-like ruler UI，也不改变 Page mode 的自然文档滚动与 block content truth。

## Changed - V2.BN.8.1 Runtime History Boundary Seed

- `usePlacementHistory` 升级为第一版 runtime history boundary，不再只保存 placement move / resize snapshot。
- Runtime history 当前支持三类可撤回动作：
  - `layout`: move / resize 的 before / after layout snapshot；
  - `createdBlock`: draft 持久化创建出的 block lifecycle seed。
  - `trashedBlock`: toolbar 删除 block 后可通过 soft-restore 撤回，也可通过 redo 再次 trash。
- Draft block 持久化成功后会登记 `createdBlock` history entry。
- `Ctrl+Z` 在非输入框焦点下可以撤回最近创建的 block：通过现有 note block soft-delete 路径把 block 标记为 `trashed`。
- `Ctrl+Y` / `Ctrl+Shift+Z` 可以恢复刚撤回的 created block：通过现有 `PUT /api/note-blocks/:id` status update 把 block 恢复为 `active`。
- `useNoteCanvasDataAdapter` 新增 `restoreBlock()`，并让 `trashBlock()` 支持 silent history 调用。
- 本轮仍不实现 cross-note undo、source/relation mutation undo、完整历史版本 UI、inline formula conversion undo。
- client build passed；server build passed。

## Changed - V2.BN.8.1 Runtime Placement Record Seed

- L5 placement service now owns a first-version runtime placement record builder.
- Runtime placements now include `placementId`, `objectId`, `objectKind`, `canvasId`, optional `frameId`, `boundaryRole`, `zIndex`, `snapState`, and `visibilityState`.
- The runtime now reserves left/right relation endpoint anchors for every block placement without enabling relation runtime.
- `useNoteCanvasLayoutModel` now asks `placementService` to build Canvas runtime placements instead of assembling them inline.
- No database migration, API change, multi-frame productization, or relation runtime behavior is included in this patch.

## Fixed - V2.BN.8.1 Formula Input Sanitizer And Help Seed

- `FormulaBlock` 的 `latex_input` 现在在读取旧内容、保存新内容时都会归一成纯 LaTeX body。
- Whole-input `$...$`、`$$...$$`、`\(...\)`、`\[...\]` 会被接受，但保存时去掉外层 delimiter，避免用户猜格式后污染 field truth。
- Formula input 增加 paste sanitizer：用户粘贴完整包裹公式时，会把插入内容清洗为 body，再进入预览和保存路径。
- Formula active editor 增加轻量 `?` help 入口，说明纯 body 与常见 delimiter 的处理规则。
- 本轮只处理独立 FormulaBlock；正文 TextBlock 内的 inline formula 仍保留为后续选区右键 `Convert to formula` 能力。
- client build passed。

## Fixed - V2.BN.8.1 Canvas Shell And PageFrame Boundary

- Canvas mode root 现在增加 `pageCanvas` shell，top bar 以下交给 runtime document shell；Canvas mode 不再依赖全局页面滚动。
- `documentShellCanvas` 改为 flex viewport fill，不再使用 `calc(100vw - 320px)` 估算宽度，sidebar 展开/收起时由主内容区自然决定可用宽度。
- `writingSurfaceCanvas` 去掉外层 page/card 边框和阴影，只保留 canvas grid 与 formal PageFrame 自身边界。
- Canvas block list 在 Canvas mode 使用 `noteCanvasRuntime.world.height` 作为 workspace 高度，同时 formal PageFrame boundary 继续使用 `pageContentHeight`，避免把 PageFrame 撑成 2600px 的巨大空白。
- Canvas mode 的 `+ Insert` 入口改为 viewport floating action，放在右侧中部，并限制展开面板最大高度。
- `CANVAS_PRIMARY_PAGE_OFFSET_X` 从 640 调整为 96，让 Canvas mode 初始视野中能完整看到主 PageFrame，而不是只露出页面右侧。
- client build passed；browser smoke passed：Canvas mode `bodyCanScroll=false`、`surfaceOverflowY=auto`、formal PageFrame 横向完整可见、console error 为空。

## Fixed - V2.BN.8.1 Slash Menu Caret Anchor

- `getSlashMenuAnchor()` 现在优先用 textarea / input 的 caret rect 计算菜单位置，不再只用整个输入框的边界。
- `useSlashCommandController()` 将当前 caret index 传入 overlay anchor service。
- 对多行 textarea、长文本 block、页面滚动后的 block，slash menu 应跟随当前输入行附近，而不是漂到 block 顶部或页面上方。
- 本轮不改变 slash command filtering、template conversion、draft persistence 或 command menu content。
- client build passed；browser runtime smoke passed；由于当前 Browser 输入 API 受虚拟剪贴板限制，caret 位置的完整交互仍需 Henry 手动复测。

## Fixed - V2.BN.8.1 Definition Field Truth And Active Reflow

- `DefinitionBlock` 现在把已存在的 `field_values` / `structured_fields` 视为字段 truth。
- 当 Definition 已经有 structured fields 时，`description` 不再从 `body` / `plain_text` fallback 反推，避免只填写 `concept_name` 后把概念名复制进 description。
- `DefinitionBlockProjection` 在 blur 保存时使用最新字段草稿，避免 Tab / blur 时保存上一帧字段。
- block measurement 在 layout effect 内增加一帧复测，降低 textarea resize / structured field 展开后一拍测量不足的风险。
- active structured block reflow 从仅允许 Formula 扩展为 Definition + Formula，Definition 编辑展开时可以推开下方 block。
- client build passed；浏览器手测仍需 Henry 验收。

## Changed - V2.BN.8.1 L2/L12 Runtime Controller Composition Hook Seed

- 新增 `hooks/useNoteCanvasRuntimeController.ts`。
- 将 `NoteCanvasRuntime.tsx` 中的数据加载、selection、layout draft、surface mode、floating overlay、placement interaction、slash command、measurement/reflow、layer props composition 的 controller wiring 迁入 runtime controller hook。
- `NoteCanvasRuntime.tsx` 现在只负责 loading shell 和 `NoteChromeLayer` / `NoteRuntimeDocumentLayer` 渲染，文件约 24 行，不再直接组合 controller graph。
- `canvasEngine/index.ts` 导出 `useNoteCanvasRuntimeController`，作为后续 L12 decommission / runtime acceptance 的明确入口。
- 本轮不改变 Note 页面可见行为、block content truth、layout payload、Page / Canvas mode、slash command、preview overlay、move / resize、undo / redo 或 persistence API。
- L2/L12 runtime controller composition hook seed 迁出后 client build / server build passed。

## Changed - V2.BN.8.1 L7/L12 Runtime Refs And Load Reset Controller Seed

- 新增 `hooks/useRuntimeLayoutRefsController.ts`，将 `blockListRef`、`movingBlockIdRef`、measured reflow suppression ref 和 selection 前的 measured reflow suppression callback 从 `NoteCanvasRuntime.tsx` 迁出。
- 新增 `hooks/useNoteLoadResetController.ts`，将 note loaded 后的 layout draft reset / block selection clear orchestration 从 `NoteCanvasRuntime.tsx` 迁出。
- `NoteCanvasRuntime.tsx` 不再直接导入 `useRef` 或 `LAYOUT_MEASURE_SUPPRESSION_MS`，measurement suppression hack 已有明确 controller 边界。
- 本轮不改变 block measurement、formula active reflow exception、move / resize session、note load data adapter、selection clearing 或 layout draft truth。
- L7/L12 runtime refs and load reset controller seed 迁出后 client build / server build passed。

## Changed - V2.BN.8.1 L6/L9 Runtime Document Layer Composition Seed

- 新增 `layers/NoteRuntimeDocumentLayer.tsx`。
- 将 document shell、template warning、Insert / source jump floating panel 和 writing surface 的组合挂载从 `NoteCanvasRuntime.tsx` 迁入 Canvas Engine layer。
- `NoteChromeLayer.tsx` 导出 `NoteFloatingPanelLayerProps`，`NoteWritingSurfaceLayer.tsx` 导出 `NoteWritingSurfaceLayerProps`，让 document layer 以明确 props contract 组合下层 UI。
- `NoteCanvasRuntime.tsx` 继续作为 controller / layer props composition root，但不再直接持有 document shell DOM。
- 本轮不改变 Page / Canvas mode、floating panel 内容、writing surface 行为、slash menu、block projection、measurement 或 persistence API。
- L6/L9 runtime document layer composition seed 迁出后 client build / server build passed。

## Changed - V2.BN.8.1 L6/L7/L11 Runtime Decision Controller Seed

- 新增 `hooks/useBlockFieldDraftController.ts`，将 structured field draft -> text draft derivation 从 `NoteCanvasRuntime.tsx` 迁出。
- 新增 `hooks/useLayoutPersistenceController.ts`，将 changed layout diff 判断、layout snapshot persistence callback 从 `NoteCanvasRuntime.tsx` 迁出。
- 新增 `hooks/useMeasuredBlockReflowController.ts`，将 measured block height -> layout draft reflow decision 从 `NoteCanvasRuntime.tsx` 迁出。
- `NoteCanvasRuntime.tsx` 继续作为 controller / layer composition root，但不再直接知道 Definition / Formula 字段如何拼接文本，不再直接判断 layout 是否 changed，也不再内联 measured height reflow policy。
- 本轮不改变 field value truth、block save API、layout payload、undo/redo history、measurement tolerance、collision resolution 或 formula active reflow 例外规则。
- L6/L7/L11 runtime decision controller seed 迁出后 client build / server build passed。

## Changed - V2.BN.8.1 L3-L5 Layout Model Hook Seed

- 新增 `hooks/useNoteCanvasLayoutModel.ts`。
- 将 visible blocks resolution、resolved `blockLayouts`、default draft layout、PageFrame height、primary PageFrame、canvas block placements、runtime model composition 和 export preview model 从 `NoteCanvasRuntime.tsx` 迁入 Canvas Engine hook。
- 将 formula-like block 高度估算辅助函数从 `NoteCanvasRuntime.tsx` 迁入 `measurementService.ts`，让 root runtime 不再直接持有 formula preview height heuristic。
- `NoteCanvasRuntime.tsx` 继续保留 placement persistence callback、measured-height reflow decision、field draft -> text draft derivation 和 controller composition；本轮只收口 L3-L5 的 layout/model composition 边界。
- 本轮不改变 Page / Canvas mode 行为、layout payload、PageFrame 尺寸规则、export preview 分组、block measurement tolerance 或 persistence API。
- L3-L5 layout model hook seed 迁出后 client build / server build passed。

## Changed - V2.BN.8.1 L6/L9 Writing Surface Layer Seed

- 新增 `layers/NoteWritingSurfaceLayer.tsx`。
- 将 writing surface shell、block list data attributes、PageFrame boundary seed、scratch workspace label、snap guide rendering、visible block projection map、draft textarea、slash menu 和 empty prompt 从 `NoteCanvasRuntime.tsx` 迁入 Canvas Engine layer。
- `NoteCanvasRuntime.tsx` 继续持有 layout resolution、measurement reflow decision、field draft text derivation、draft persistence、slash command controller 和 placement callbacks，只把它们作为 props 注入 writing surface layer。
- `BlockEditorLayer` 与 `SlashMenuLayer` 不改变内部行为；本轮只改变它们被挂载的位置。
- 本轮属于 L6 block projection layer 与 L9 overlay layer 的交界 seed，不改变 block content truth、field value 写入、draft blur 保存、slash command 选择、snap guide 坐标或 empty prompt 文案。
- L6/L9 writing surface layer seed 迁出后 client build / server build passed。

## Changed - V2.BN.8.1 L9 Note Chrome And Floating Panel Layer Seed

- 新增 `layers/NoteChromeLayer.tsx`。
- 将顶部 note chrome、collapsed chrome、note info popover、more actions popover、export preview 入口编排从 `NoteCanvasRuntime.tsx` 迁入 Canvas Engine layer。
- 将 Insert floating panel 与 source jump panel 从 `NoteCanvasRuntime.tsx` 迁入同一层文件中的 `NoteFloatingPanelLayer`。
- `NoteCanvasRuntime.tsx` 继续持有 controller / adapter / callback 边界，只把 title save、surface mode、layout mode、preview overlay、snap toggle、insert block、source jump close 等动作作为 props 传入 layer。
- 本轮属于 L9 floating overlay layer seed，不改变按钮顺序、popover 样式、insert 行为、source jump 内容、preview overlay state 或 top chrome collapsed state。
- L9 note chrome / floating panel layer seed 迁出后 client build / server build passed。

## Changed - V2.BN.8.1 L5/L7 Layout Draft Controller Hook Seed

- 新增 `hooks/useLayoutDraftController.ts`。
- 将 `layoutDrafts` state、单 block draft 写入/清理、note load reset、history draft merge、measured height draft update 从 `NoteCanvasRuntime.tsx` 迁入 Canvas Engine hook。
- `NoteCanvasRuntime.tsx` 仍保留 resolved `blockLayouts` 的计算，因为它目前需要等待 `useNoteCanvasDataAdapter()` 提供 `visibleBlocks` 后才能安全计算，避免在 data adapter 和 placement service 之间制造依赖环。
- `useNoteCanvasDataAdapter()`、`useBlockPlacementInteractions()`、`usePlacementHistory()` 继续通过 hook 暴露的 draft writer 工作，保持 layout persistence / undo history / move / resize 行为不变。
- 本轮属于 L5 placement service 与 L7 measurement / reflow service 的交界 seed，不改变 block layout truth、collision resolution、measurement tolerance 或 persistence payload。
- L5/L7 layout draft controller hook seed 迁出后 client build / server build passed。

## Changed - V2.BN.8.1 L8 Layout Interaction Controller Hook Seed

- 新增 `hooks/useLayoutInteractionController.ts`。
- 将 `layoutMode` / `snapGuide` / `snapEnabled` state 从 `NoteCanvasRuntime.tsx` 迁入 Canvas Engine hook。
- Layout 按钮和 Snap alignment 开关现在调用 `toggleLayoutMode()` / `toggleSnapEnabled()`，并由 hook 统一清除当前 snap guide。
- `NoteCanvasRuntime.tsx` 继续把 `setLayoutMode` / `setSnapGuide` / `snapEnabled` 传给 placement interaction hook，保持 move / resize 行为不变。
- 本轮属于 L8 layout interaction state seed，不改变 snap 计算、guide 渲染、layout mode 视觉或 More actions 面板内容。
- L8 layout interaction controller hook seed 迁出后 client build / server build passed。

## Changed - V2.BN.8.1 L8 Canvas Surface Pointer Controller Hook Seed

- 新增 `hooks/useCanvasSurfacePointerController.ts`。
- 将 document shell 空白点击清 selection、block list 空白点击清 selection、PageFrame 空白双击创建 draft 的交互编排从 `NoteCanvasRuntime.tsx` 迁入 Canvas Engine hook。
- `NoteCanvasRuntime.tsx` 不再直接导入 `createBlankDraftLayout()`；snap on/off 下的新 draft 落点计算由 surface pointer controller 触发。
- 本轮保持既有行为：只有点到真正空白 surface / block list 时才取消选中，双击 PageFrame 空白处仍按 `surfacePolicy` 与 `snapEnabled` 创建 draft。
- L8 canvas surface pointer controller hook seed 迁出后 client build / server build passed。

## Changed - V2.BN.8.1 L8 Block Selection Controller Hook Seed

- 新增 `hooks/useBlockSelectionController.ts`。
- 将 `focusBlockId` / `activeBlockId` / `selectedBlockId` state，以及 block focus / select / clear selection 编排从 `NoteCanvasRuntime.tsx` 迁入 Canvas Engine hook。
- `NoteCanvasRuntime.tsx` 继续把 selection setters 传给 draft / slash / placement hooks，保持当前 block 创建、slash 转换、move / resize 的既有边界。
- block focus / select 仍写入 `editingTextInteraction(blockId)` / `selectedBlockInteraction(blockId)`，debug interaction state 不变。
- 本轮属于 L8 selection controller seed，不改变 block 视觉选中态、layout mode、drag / resize、空白双击创建或 surface click 清空行为。
- L8 block selection controller hook seed 迁出后 client build / server build passed。

## Changed - V2.BN.8.1 L8 Draft Block Controller Hook Seed

- 新增 `hooks/useDraftBlockController.ts`。
- 将 draft block state、draft textarea focus / height effect、draft persistence、empty draft discard、draft activation 从 `NoteCanvasRuntime.tsx` 迁入 Canvas Engine hook。
- `NoteCanvasRuntime.tsx` 继续把 draft controller 暴露的 `draftText` / `draftTextRef` / `persistDraft` / `activateDraft` 接给 slash command controller，保持 `/` 创建或转换 block 的现有行为。
- draft textarea onChange 现在通过 `resizeDraftFromTextarea()` 进入 draft controller，不再由 runtime 主文件直接计算草稿高度。
- 本轮属于 L8 natural writing / blank draft creation 的 controller seed，不改变 draft block 视觉、保存 API 或 slash command 行为。

## Changed - V2.BN.8.1 L10 Surface Mode Controller Hook Seed

- 新增 `hooks/useSurfaceModeController.ts`。
- 将 `surfaceMode` state、`surfacePolicy` 派生、`pageOffsetX` 派生，以及 Page / Canvas mode toggle 的副作用从 `NoteCanvasRuntime.tsx` 迁入 Canvas Engine hook。
- `NoteCanvasRuntime.tsx` 不再直接调用 `createSurfaceModePolicy()` 或 `getNextSurfaceMode()`；runtime 只消费 controller 返回的 mode / policy / toggle。
- mode toggle 仍会统一关闭浮层、清除 snap guide、取消当前 block selection，保持前序体验不变。
- 本轮属于 L10 Page / Canvas Mode Policy 的 controller seed，不改变 pan / zoom / viewport scroll 行为。

## Changed - V2.BN.8.1 L9 Floating Overlay Controller Hook Seed

- 新增 `hooks/useFloatingOverlayController.ts`。
- 将 top chrome collapsed state、Insert / Note info / More actions / Preview 的互斥浮层状态，以及 preview 中 block type / AI visibility / export status overlay toggles 从 `NoteCanvasRuntime.tsx` 迁入 Canvas Engine hook。
- `NoteCanvasRuntime.tsx` 不再直接调用 `openingMenuInteraction('noteInfo' | 'moreActions' | 'insert')` 或 `previewingInteraction()`；这些 interaction state 写入现在由 floating overlay controller 统一处理。
- Preview overlay toggle 状态仍然在关闭 preview panel 后保留，保持前序体验约定。
- 本次迁移不改变浮层视觉、位置或面板内容，只收口顶部 chrome / floating overlay state orchestration。
- L9 floating overlay controller hook seed 迁出后 client build passed。

## Changed - V2.BN.8.1 L9 Slash Command Controller Hook Seed

- 新增 `hooks/useSlashCommandController.ts`。
- 将 slash command 的 target state、命令过滤、template availability 判断、draft/block 文本触发检测、Esc / Ctrl+Enter 键盘处理和命令选择后的 template 转换流程从 `NoteCanvasRuntime.tsx` 迁入 Canvas Engine hook。
- `NoteCanvasRuntime.tsx` 不再直接导入 `detectSlashTrigger`、`filterSlashCommands`、`findTemplateForCommand`、`removeSlashTrigger` 或 `getSlashMenuAnchor`。
- Slash menu rendering 仍由 `layers/SlashMenuLayer.tsx` 负责；本次迁移只抽离 controller / state orchestration，不改变菜单视觉或命令行为。
- `NoteCanvasRuntime.tsx` 继续提供 draft persistence、block save、template conversion、focus setter 和 interaction state setter 作为边界输入，后续可继续收口到 Floating Overlay Layer / overlay portal。
- L9 slash command controller hook seed 迁出后 client build passed。

## Changed - V2.BN.8.1 L8 Placement Interaction Session Hook Seed

- 新增 `hooks/useBlockPlacementInteractions.ts`。
- 将 block move / resize 的 pointer session orchestration 从 `NoteCanvasRuntime.tsx` 迁入 Canvas Engine hook。
- `NoteCanvasRuntime.tsx` 不再直接调用 `attachWindowPointerSession`，也不再内联 drag / resize session 的 pointermove / pointerup lifecycle。
- move / resize 仍复用 `interactionController.ts` 中已有的 layout calculation helpers，行为目标保持不变。
- `NoteCanvasRuntime.tsx` 继续提供 layout drafts、history、persistence 和 measurement suppression refs 作为边界输入，后续可继续收口到 placement writer / interaction controller。
- L8 placement interaction session hook seed 迁出后 client build passed。

## Changed - V2.BN.8.1 L3 Content Width Hook Seed

- 新增 `hooks/useCanvasContentWidth.ts`。
- 将 `NoteCanvasRuntime.tsx` 中的 content width state、`ResizeObserver` 和 `window.resize` 监听迁入 Canvas Engine hook。
- `NoteCanvasRuntime.tsx` 继续使用 `contentWidth` 作为 block layout / visible block / PageFrame 计算输入，但不再直接拥有宽度监听职责。
- 这一步属于 L3 Viewport And World 的窄迁出，为后续 viewport / pan / zoom / world-screen transform 接管减少主 runtime 里的直接 DOM 监听。
- L3 content width hook seed 迁出后 client build passed。

## Added

- 新增 `docs/releases/V2.BN.8/` 局部密集文档区。
- 新增 `Canvas-Engine-Research/` 正式调研目录。
- 新增 `Canvas-Engine-Research/Outline.md` 和 `R0-R9/Summary` 调研报告。
- 新增 `README.md` 说明 V2.BN.8 文档区职责。
- 新增 `Workflow.md` 作为 V2.BN.8 debug / intensive workflow。
- 新增 `Engineering-Spec.md`。
- 新增 `Canvas-Engine-Architecture-Spec.md`。
- 新增 `Canvas-Engine-Interaction-Contract.md`。
- 新增 `Canvas-Engine-State-And-Data-Contract.md`。
- 新增 `Canvas-Engine-Spike-And-Benchmark-Plan.md`。
- 新增 `Canvas-Engine-Fallback-Strategy.md`。
- 新增 `Experience-Review.md`。
- 新增 `Review.md`。
- 新增 `client/src/pages/Notes/canvasEngine/` 第一版 engine seed：
  - `types.ts` 定义 NoteCanvas / PageFrame / BlockPlacement / CanvasObject reserve / RelationEndpoint reserve；
  - `geometry.ts` 定义 world/screen coordinate transform、viewport rect、visible block 计算；
  - `engineModel.ts` 定义 `Self-owned Minimal Hybrid NoteCanvas Engine` 的 runtime model seed。

## Changed

- 将 `docs/releases/V2.BN.8-plan.md` 迁移为 `docs/releases/V2.BN.8/Plan.md`。
- V2.BN.8 plan 将在局部文档区内继续维护，避免旧位置和新位置长期并存。
- 锁定 V2.BN.8 第一版推荐路线为 `Self-owned Minimal Hybrid NoteCanvas Engine`。
- 更新 `Plan.md`、`Workflow.md`、`Engineering-Spec.md`、Canvas Engine specs 和 Roadmap，使其引用调研结论和路线排除理由。
- `NoteDetail.tsx` 轻量接入 `noteCanvasRuntime`：
  - 当前 UI 仍沿用 V2.BN.1-V2.BN.5 打磨出的写作体验；
  - block list 带上 engine version / route / visible block / page frame data attributes；
  - formal PageFrame width、canvas world width 从 engine seed 读取；
  - `better_notebook_layout` payload 预留 `rotation`，版本标记升为 `V2.BN.8`。

## Not Changed

- 尚未重写真正的 viewport pan / zoom / hit-testing / virtualization runtime。
- 没有新增 migration。
- 没有把外部 engine 引入为主 runtime。

## Next

- 基于 engine seed 继续实现第一版 visible window / hit-testing / overlay portal。
- 做 server build 和 browser smoke。
- 根据 smoke 结果更新 Review / Experience Review。
## Added - V2.BN.8.1 Planning

- 新增 `V2.BN.8.1-Runtime-Replacement-Plan.md`，作为 Canvas Engine 第一个小版本的逐层接管蓝图。
- 明确 `V2.BN.8.1` 的目标是让 Canvas Engine 接管旧 `NoteDetail.tsx` runtime，使 `NoteDetail.tsx` 退化为 route/data shell。
- 明确本地测试数据 reset 策略：停止 server、备份 `server/coincides.db*`、重建本地 dev database、重新创建 smoke account/project/note。

## Changed - V2.BN.8.1 L0-L1

- 完成 V2.BN.8.1 startup baseline：
  - 当前 branch 确认是 `codex/v2-bn-canvas-engine`；
  - client build passed；
  - server build passed；
  - `NoteDetail.tsx` 仍是旧 runtime 主体，`canvasEngine/` 仍是 seed。
- 完成本地 dev data reset：
  - 旧 `server/coincides.db*` 已备份到 `.codex-tmp/local-db-backups/20260612-155215`；
  - 本地 `server/uploads` 测试文件已备份并清空；
  - 新 dev database 已通过 `initDb()` 重建；
  - 已创建本地 smoke account / Project / Note。

## Changed - V2.BN.8.1 L2

- 将旧 `NoteDetail.tsx` 中的大段 runtime 主体迁入 `client/src/pages/Notes/canvasEngine/NoteCanvasRuntime.tsx`。
- 将 `NoteDetail.tsx` 缩成 route shell：
  - 读取 `noteId`；
  - 通过 `NoteCanvasRuntimeProvider` 注入 runtime context；
  - 渲染 `NoteCanvasRuntime`。
- 新增 `NoteCanvasRuntimeProvider.tsx` 和 `hooks/useNoteCanvasRuntime.ts`，作为后续 viewport、placement、overlay、interaction 分层接管的上下文入口。
- `canvasEngine/index.ts` 导出 runtime provider。
- L2 迁移后 client build passed。

## Changed - V2.BN.8.1 L2 Data Adapter Seed

- 新增 `hooks/useNoteCanvasDataAdapter.ts`。
- 将 note / blocks / template options / source anchors / block CRUD / title save / source jump target loading 从 `NoteCanvasRuntime.tsx` 迁入 data adapter hook。
- `NoteCanvasRuntime.tsx` 继续负责 focus、draft、selection、placement draft、interaction state 和 canvas UI composition。
- `canvasEngine/index.ts` 导出 `useNoteCanvasDataAdapter`。
- L2 data adapter seed 抽离后 client build passed。

## Changed - V2.BN.8.1 L11 Placement History Seed

- 新增 `hooks/usePlacementHistory.ts`。
- 将 placement move / resize 的 undo stack、redo stack 和 Ctrl+Z / Ctrl+Y keyboard listener 从 `NoteCanvasRuntime.tsx` 迁入 placement history hook。
- `NoteCanvasRuntime.tsx` 继续提供 layout draft application 和 layout snapshot persistence callbacks。
- `canvasEngine/index.ts` 导出 `usePlacementHistory`。
- L11 placement history seed 抽离后 client build passed。

## Changed - V2.BN.8.1 L3-L4

- 新增 `viewportService.ts`，集中处理 runtime viewport / world / primary page offset seed。
- 新增 `pageFrameService.ts`，集中处理 default draft placement、PageFrame height 和 runtime PageFrame 构造。
- `NoteCanvasRuntime.tsx` 不再直接手写 viewport/world/PageFrame 构造。
- Canvas mode 下 PageFrame height 不再使用完整 workspace height，改为 formal page 内容底部驱动，避免把 PageFrame 撑成巨大空白。
- L3-L4 抽离后 client build passed。

## Changed - V2.BN.8.1 L5

- 新增 `placementService.ts`，集中处理 placement 读写和布局计算。
- 从 `NoteCanvasRuntime.tsx` 迁出：
  - `readStoredLayout`；
  - `isCanvasWorkspaceBlock`；
  - `normalizeBlockLayout`；
  - `buildDefaultBlockLayouts`；
  - `buildLayoutPayload` / `writeLayoutOverride`；
  - `layoutsEqual` / `buildLayoutHistoryEntry`；
  - `getBoundaryKind`；
  - `getEffectiveExportRole` / `getEffectiveAIVisibility`；
  - `resolveStackedLayoutCollisions`；
  - `reflowLayoutsAfterHeightChange`；
  - `snapToTargets` / `applyMoveSnap`。
- `placementService.ts` 使用泛型 placement seed，不直接绑定 `NoteBlock`，为后续 CanvasObject placement 预留接口。
- L5 抽离后 client build passed。

## Changed - V2.BN.8.1 L7 Seed

- 新增 `measurementService.ts`。
- 新增 `hooks/useBlockMeasurement.ts`。
- 从 `NoteCanvasRuntime.tsx` 迁出第一批 measurement seed：
  - textarea content resize；
  - block DOM content height measurement；
  - text block estimated height。
- `measurementService.ts` 新增 measured height / resized layout -> placement reflow application helpers：
  - `applyMeasuredBlockHeightToLayouts`；
  - `applyMeasuredBlockLayoutToLayouts`。
- `BlockEditorLayer.tsx` 不再直接拥有 `ResizeObserver` / block content height measurement wiring。
- `NoteCanvasRuntime.tsx` 仍保留 React state update entrypoint，但不再直接拼装 measured height / resize reflow。
- L7 seed 抽离后 client build passed。

## Changed - V2.BN.8.1 L6/L9 Layers

- 新增 `blockContentService.ts`，集中处理 block content truth / projection helper：
  - field values 读取；
  - definition / formula fields；
  - structured block save payload；
  - plain text projection；
  - presentation kind detection；
  - formula preview text。
- 新增 `runtimeDataTypes.ts`，把 Note / NoteBlock / SourceAnchor / SourceJumpTarget 从 runtime 主文件迁出。
- 新增 `layers/BlockEditorLayer.tsx`，把 block DOM projection 从 `NoteCanvasRuntime.tsx` 迁入 Canvas Engine layer。
- 新增 `layers/SlashMenuLayer.tsx`，把 slash command menu 渲染迁入 floating overlay layer seed。
- 新增 `SlashMenuAnchor` runtime layout type。
- `NoteCanvasRuntime.tsx` 不再内联 slash menu 渲染函数。
- `NoteCanvasRuntime.tsx` 不再内联 `BlockEditor` 组件本体。
- L6/L9 layer 抽离后 client build passed。

## Changed - V2.BN.8.1 L9 Overlay Preview Layer

- 新增 `overlayService.ts`，把 slash menu anchor 计算从 `NoteCanvasRuntime.tsx` 迁出。
- 新增 `exportPreviewService.ts`，集中生成 export preview model、row label、AI visibility label 和 export role label。
- 新增 `layers/ExportPreviewLayer.tsx`，把 export preview panel 与 preview group rendering 从 runtime 主文件迁出。
- `NoteCanvasRuntime.tsx` 继续保留 preview 开关状态和 callbacks，但不再内联 preview panel 结构。
- L9 overlay preview layer 抽离后 client build passed。

## Changed - V2.BN.8.1 L9 Block Control Bar Layer

- 新增 `layers/BlockControlBarLayer.tsx`。
- `BlockEditorLayer.tsx` 不再内联 block control bar 的移动、导出、AI 可见性、保存、删除按钮结构。
- block control bar 仍复用当前 block 内部定位样式，后续再接入 selected block anchor / overlay portal / z-index service。
- L9 block control bar layer 抽离后 client build passed。

## Changed - V2.BN.8.1 L9 Source Reference Layer

- 新增 `layers/BlockSourceReferenceLayer.tsx`。
- `BlockEditorLayer.tsx` 不再内联 source reference badge 和 View source jump button。
- source jump 仍是 block 内 entry seed，后续再接入统一 source jump overlay / z-index service。
- L9 source reference layer 抽离后 client build passed。

## Changed - V2.BN.8.1 L6 Status Badge Layer

- 新增 `layers/BlockStatusBadgeLayer.tsx`。
- `BlockEditorLayer.tsx` 不再内联 block type、AI visibility、export status、Page boundary badges。
- status badges 仍是 projection sublayer，后续是否 viewport overlay 化取决于 preview/debug overlay 体验。
- L6 status badge layer 抽离后 client build passed。

## Changed - V2.BN.8.1 L6 Block Projection Sublayers

- 新增 `blocks/DefinitionBlockProjection.tsx`。
- 新增 `blocks/FormulaBlockProjection.tsx`。
- 新增 `blocks/TextBlockProjection.tsx`。
- 新增 `blocks/CodeBlockProjection.tsx`，让 code snippet 不再走普通 Text projection。
- 新增 `layers/BlockResizeHandleLayer.tsx`。
- `BlockEditorLayer.tsx` 不再内联 Definition / Formula / Text 的具体 JSX projection。
- `BlockEditorLayer.tsx` 现在把 code snippet 分流到 `CodeBlockProjection`，badge 显示为 `CODE`。
- `BlockEditorLayer.tsx` 不再内联 resize handle。
- `BlockEditorLayer.tsx` 继续保留 block shell 和 control/source/status/content sublayer composition，后续再迁入 shell boundary / selected overlay anchor。
- L6 block projection sublayers 抽离后 client build passed。

## Fixed - V2.BN.8.1 CodeBlock Projection Seed

- Code block 增加独立 projection、代码背景、monospace 输入区域和轻量行号 gutter。
- Code block type badge 从较长的 `CODE SNIPPET` 收敛为 `CODE`。
- 本补丁只完成代码块视觉区分；行级复制 / gutter 多行选择仍保留为后续 polish。
- client build passed。

## Fixed - V2.BN.8.1 Formula Preview Display Body

- Formula block 的裸 `latex_input` 现在默认按 display math 渲染，不再被强行包成单行 inline `$...$`。
- 用户输入已经包裹好的 `$$...$$` 时保持原样。
- 用户输入单 `$...$` 时仍保持 inline；如果单 `$...$` 内是多行或 `\begin...` 环境，会自动升级为 display math。
- Green theorem / `aligned` body 已用 KaTeX display mode 验证可渲染。
- client build passed。

## Changed - V2.BN.8.1 L8/L10 Seeds

- 新增 `interactionController.ts`，建立 Canvas Engine 第一版 interaction state boundary：
  - idle；
  - hoveringBlock；
  - selectedBlock；
  - editingText；
  - draggingBlock；
  - resizingBlock；
  - panningCanvas；
  - openingMenu；
  - previewing。
- `NoteCanvasRuntime.tsx` 开始在 block focus/select、drag、resize、slash menu、preview、info/more/insert panel 等入口写入 interaction state。
- canvas root 新增 interaction debug data attributes，方便后续 smoke 和 browser harness 验证：
  - `data-canvas-interaction-mode`；
  - `data-canvas-interaction-target`；
  - `data-canvas-interaction-block`。
- `interactionController.ts` 新增 drag/resize layout calculation helpers：
  - `calculateDraggedBlockLayouts`；
  - `calculateResizedBlockLayouts`。
- `interactionController.ts` 新增 `attachWindowPointerSession`，集中处理 drag / resize 期间的 window pointermove / pointerup session lifecycle。
- `NoteCanvasRuntime.tsx` 不再内联 drag move / resize move 的布局计算，也不再直接 add/remove window pointer listeners。
- `NoteCanvasRuntime.tsx` 仍暂时保留 begin move / begin resize session orchestration、finish callbacks 和 React state entrypoint。
- 新增 `modePolicyService.ts`，集中处理第一批 Page/Canvas policy：
  - visible block filtering；
  - PageFrame offset；
  - mode label；
  - collision resolve policy；
  - elastic avoidance policy；
  - blank double-click draft placement。
- 双击空白创建 block 的规则调整为：
  - Page mode + snap alignment on：进入自然写作流；
  - snap alignment off 或 Canvas mode：落在双击位置。
- L8/L10 seed 抽离后 client build passed。
- L8 pointer session helper 抽离后 client build passed。

## Verified - V2.BN.8.1 Deferred Browser Smoke Recheck

- 按 Henry 要求，Browser Harness 中途测试暂缓到最终统一验收。
- 重新通过 `npm run build:client`。
- 重新通过 `npm run build`。
- 重新通过 `npm run smoke:canvas-engine-performance`。
- 重新通过 `git diff --check`。
- 确认 `NoteDetail.tsx` 仍然只是 route/provider shell。
- 确认旧 runtime 符号没有回流到 `NoteDetail.tsx`。

## Added - V2.BN.8.1 Runtime Boundary Check

- 新增 `client/scripts/canvasRuntimeBoundaryCheck.mjs`。
- 新增 root script：`npm run check:canvas-runtime-boundary`。
- 新增 client script：`npm run check:canvas-runtime-boundary`。
- 该检查固定 `NoteDetail.tsx` shell boundary、`NoteCanvasRuntime.tsx` host boundary、runtime root controller composition、必要 layer/projection 文件和 Browser smoke debug attributes。
- `npm run check:canvas-runtime-boundary` passed。
- `npm run build:client` passed。
- `npm run build` passed。
- `npm run smoke:canvas-engine-performance` passed。

## Added - V2.BN.8.1 Non-Browser Gate Aggregator

- 新增 root script：`npm run verify:v2-bn8-runtime`。
- 该命令聚合 Canvas runtime boundary check、client build、server build 和 Canvas Engine performance seed。
- 更新 `V2.BN.8.1-Final-Smoke-Protocol.md`，把最终 Browser Harness 前置非浏览器检查收束到该命令。
- `npm run verify:v2-bn8-runtime` passed。

## Changed - V2.BN.8.1 Runtime Verification Aggregator

- `npm run verify:v2-bn8-runtime` 现在包含 `git diff --check`。
- `V2.BN.8.1-Final-Smoke-Protocol.md` 同步更新：diff hygiene 已纳入非浏览器聚合 gate。
- 当时 changed-file secret scan 仍作为独立检查保留；后续已在下一条记录中纳入聚合 gate。
- `npm run verify:v2-bn8-runtime` passed。

## Added - V2.BN.8.1 Changed-File Secret Scan

- 新增 `scripts/changedFileSecretScan.mjs`。
- 新增 root script：`npm run check:changed-file-secrets`。
- 该脚本扫描当前 changed / staged / untracked files，跳过二进制和超大文件。
- `npm run verify:v2-bn8-runtime` 现在包含 changed-file secret scan。
- `V2.BN.8.1-Final-Smoke-Protocol.md` 同步更新：changed-file secret scan 已纳入非浏览器聚合 gate。
- `npm run check:changed-file-secrets` passed。
- `npm run verify:v2-bn8-runtime` passed。

## Changed - V2.BN.8.1 Runtime Boundary Check Coverage

- `client/scripts/canvasRuntimeBoundaryCheck.mjs` 从 18 项检查扩展到 26 项检查。
- 新增覆盖 runtime type contract、engine model、viewport service、PageFrame service、placement service、measurement service、mode policy service、history service。
- 这使 L3/L4/L5/L7/L10/L11 的结构性证据也进入 `npm run verify:v2-bn8-runtime`。
- `npm run check:canvas-runtime-boundary` passed。

## Added - V2.BN.8.1 Canvas Engine Model Contract Check

- 新增 `client/scripts/canvasEngineModelContractCheck.ts`。
- 新增 `client/scripts/tsconfig.canvas-model-contract.json`。
- 新增 root/client script：`npm run smoke:canvas-engine-model-contract`。
- 该检查覆盖 viewport/world seed、PageFrame/workspace policy、placement/runtime model、measurement/mode/history 规则。
- `npm run verify:v2-bn8-runtime` 现在包含 Canvas Engine model contract check。
- `npm run smoke:canvas-engine-model-contract` passed。

## Fixed - V2.BN.8.1 Shared Type Runtime Import Build Stability

- `client/vite.config.ts` 明确把 `@shared/types` 解析到 `shared/types/index.ts`，避免生产构建误解析到本地生成的 CommonJS `index.js`。
- 移除前端对 `@shared/types` 的 default runtime import，改用命名导入或 type-only 导入。
- `DailyBrief` 的 `EnergyLevel` 运行时值改为本地字符串常量，避免把共享 enum 当成浏览器运行时依赖。
- 该修补来自 `npm run verify:v2-bn8-runtime` 暴露的 build failure；修补后聚合验证 passed。

## Changed - V2.BN.8.7 ContentGroup Petal Refinement

- 新增 `moveContentGroupPetal`，把 Petal reorder 固定为 ContentGroup 内部 refine 行为。
- Single ContentGroup Editor 的 Petal 卡片新增拖动手柄，可在编辑器内调整 Petal 顺序。
- Canvas Engine model contract 新增 `ContentGroup Petal refinement boundary` 检查，覆盖 local order、member truth、source snapshot、fragment ownership、source-text projection non-goal。
- 更新 `docs/contracts/Petal-Contract.md`，明确 Petal reorder 不移动 source truth，不创建 Label / CanvasObject / relation runtime。
- 验证通过：`npm run smoke:canvas-engine-model-contract`、`npm run build:client`。

## Changed - V2.BN.8.7 ContentGroup Stability Summary

- 新增 `ContentGroupStabilitySummary`，用于派生 ContentGroup edge state，而不是创建新的 truth table。
- 覆盖 empty group、empty Petal、stale / missing source、deleted source note context、archived folder context、accepted-with-stale、materialize target unavailable。
- `ContentGroupIndexEntry` 新增 stability summary，并把 member source issue 纳入 `has_integrity_issue`。
- Rail、Gallery、Single ContentGroup Editor 现在展示轻量状态摘要。
- Single ContentGroup Editor 的 `Accept` 会在空 group、deleted group、source/member 风险状态下禁用并提供原因。
- 验证通过：`npm run smoke:canvas-engine-model-contract`、`npm run build:client`。

## Verified - V2.BN.8.7 ContentGroup Browser Gate First Pass

- 本地 dev app 通过 in-app browser 跑通：创建项目、创建笔记、Rail 创建空 ContentGroup、Gallery 打开组织视图、Single Editor 打开 refine 视图、创建 Petal、保存 draft。
- Rail / Gallery / Single Editor 分别显示 `Collect` / `Organize` / `Refine` 表面语义。
- 空 ContentGroup 的 stability label 在三层界面可见，Single Editor 对空 group 禁用 `Accept`。
- Petal 创建保持在 Single Editor 的 `Local roles` 区域，没有 source-text Label 投射或 CanvasObject 行为。
- 控制台未观察到新增 app error；仅存在 React Router v7 future-flag warnings。
- 截图已保存到 `C:\Users\70208\AppData\Local\Temp\bn87-contentgroup-gate\`。

## Fixed - V2.BN.8.1 Browser Harness Page Canvas Switch Crash

- Browser Harness final smoke 发现 Note 页从 Page mode 切到 Canvas mode 时会白屏。
- 抓到的异常是 `Maximum update depth exceeded`，调用链为 `useBlockMeasurement -> useMeasuredBlockReflowController -> useLayoutDraftController`。
- `useBlockMeasurement` 增加 measured-height 去抖保护；同一 block 的高度没有实质变化时不再反复上报 layout draft。
- 修补后 Browser Harness 验证 Page -> Canvas -> Page 往返通过，Preview 打开/关闭通过，Layout 点击无异常。
