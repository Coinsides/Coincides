# V2.BN.8 Review

## V2.BN.8.1 Final Browser Harness Attempt

```text
scope: final Browser Harness smoke gate
status: blocked by Chrome remote debugging authorization
date: 2026-06-13
```

### Evidence

- `browser-harness` from PATH failed before page inspection.
- The local project-installed `browser-harness.exe` failed with the same CDP websocket handshake timeout.
- Both failures reported the same required user action: open `chrome://inspect/#remote-debugging`, enable "Allow remote debugging for this browser instance", then click Allow in the Chrome popup.

### Result

- Browser Harness smoke is not passed.
- No browser interaction evidence was collected in this attempt.
- `V2.BN.8.1` remains open until Browser Harness can connect and Henry manually confirms the experience passed.

## V2.BN.8.1 Runtime Root Closure Assessment

```text
scope: L2 runtime root / L12 NoteDetail decommission
status: code replacement path is effectively closed; final acceptance still pending
browser smoke: deferred by Henry until all replacement work is complete
```

### Assessment

- `NoteDetail.tsx` is already a route/provider shell.
- `NoteCanvasRuntime.tsx` is already the Note page runtime host.
- `useNoteCanvasRuntimeController()` now composes the surface state, document data, layout model, block operations, and presentation boundary controllers.
- Further splitting the runtime root before browser smoke would likely add indirection without reducing meaningful risk.
- The next acceptance gate should be final Browser Harness smoke plus Henry manual pass, not another root-compression refactor.

## V2.BN.8.1 Runtime Presentation Controller Seed

```text
scope: L4 frame model / L9 layer props / L12 runtime root compression
status: applied
browser smoke: deferred by Henry until all replacement work is complete
```

### What Changed

- Added `client/src/pages/Notes/canvasEngine/hooks/useRuntimePresentationController.ts`.
- The new controller composes:
  - `useRuntimeFrameModelController()`;
  - `useNoteCanvasLayerProps()`.
- `useNoteCanvasRuntimeController()` no longer imports or calls those two presentation-facing hooks directly.
- `UseNoteCanvasLayerPropsInput` is now exported so the presentation controller can reuse the existing layer props contract instead of duplicating it.

### Review Notes

- This checkpoint is a boundary extraction only.
- PageFrame height, Canvas runtime model, export preview model, chrome props, writing surface props, floating panel props, and all user-visible controls are unchanged.
- The useful ownership change is that frame model output is now converted into layer props inside a presentation boundary, not inside the runtime root.
- Browser Harness is intentionally deferred until the full replacement pass is complete.

### Verification

- `npm run build:client` passed.
- `npm run smoke:canvas-engine-performance` passed.
- `server` `npm run build` passed.
- `git diff --check` passed.
- Changed-file secret scan passed.

## V2.BN.8.1 Runtime Layer Props Side Effect Boundary Seed

```text
scope: L8 block operations side effects / L9 layer props UI side effects / L12 runtime root compression
status: applied
browser smoke: deferred by Henry until all replacement work is complete
```

### What Changed

- `useRuntimeBlockOperationsController()` now reads `addToast` from `useUIStore()` for natural writing / slash command feedback.
- `useNoteCanvasLayerProps()` now reads `navigate` from `useNavigate()` for Back Project and `addToast` from `useUIStore()` for Favorite placeholder feedback.
- `useNoteCanvasRuntimeController()` no longer imports or calls `useNavigate()` or `useUIStore()`.
- The runtime root still passes the same callbacks and state into the layer props boundary, but it no longer owns these two UI-side effects.

### Review Notes

- This checkpoint is a boundary extraction only.
- Back Project navigation, Favorite placeholder toast, slash command disabled reason toast, template unavailable toast, and all block operations are unchanged.
- The ownership rule is now cleaner: runtime root composes engine controllers; UI-facing hook boundaries own UI store and navigation side effects.
- Browser Harness is intentionally deferred until the full replacement pass is complete.

### Verification

- `npm run build:client` passed.
- `npm run smoke:canvas-engine-performance` passed.
- `server` `npm run build` passed.
- `git diff --check` passed.
- Changed-file secret scan passed.

## V2.BN.8.1 Runtime Block Operations Controller Seed

```text
scope: L6 block editing / L7 measurement reflow / L8 natural writing and placement interaction / L11 block history / L12 runtime root compression
status: applied
browser smoke: deferred by Henry until all replacement work is complete
```

### What Changed

- Added `client/src/pages/Notes/canvasEngine/hooks/useRuntimeBlockOperationsController.ts`.
- The new controller composes:
  - `useRuntimeBlockHistoryController()`;
  - `useRuntimeNaturalWritingController()`;
  - `useRuntimeBlockEditingController()`;
  - `useRuntimePlacementInteractionController()`.
- `useNoteCanvasRuntimeController()` no longer imports or calls those four block-operation controllers directly.
- The runtime root still passes the same data and callbacks to `useNoteCanvasLayerProps()`, but receives them from one block operations boundary.

### Review Notes

- This checkpoint is a boundary extraction only.
- Create / trash / undo-redo, draft persistence, slash command behavior, structured field draft updates, measured height reflow, move / resize, snap, and elastic avoidance are unchanged.
- The useful ownership change is that block operations now have one composition entry before entering the runtime root, which makes later L6/L7/L8/L11 work easier to audit.
- Browser Harness is intentionally deferred until the full replacement pass is complete.

### Verification

- `npm run build:client` passed.
- `npm run smoke:canvas-engine-performance` passed.
- `server` `npm run build` passed.
- `git diff --check` passed.
- Changed-file secret scan passed.

## V2.BN.8.1 Runtime Document Data Controller Seed

```text
scope: L2 runtime data adapter / L5 layout draft state / L6 document stats / L12 runtime root compression
status: applied
browser smoke: deferred by Henry until all replacement work is complete
```

### What Changed

- Added `client/src/pages/Notes/canvasEngine/hooks/useRuntimeDocumentDataController.ts`.
- The new controller composes:
  - `useLayoutDraftController()`;
  - `useNoteLoadResetController()`;
  - `useNoteCanvasDataAdapter()`;
  - `useRuntimeDocumentStatsController()`.
- `useNoteCanvasRuntimeController()` no longer imports or calls those four document/data hooks directly.
- The document data controller returns the same note/block data, layout draft callbacks, and `sourceReferenceCount` consumed by the rest of the runtime.

### Review Notes

- This checkpoint is a boundary extraction only.
- Note/block API behavior, title draft, block text/field drafts, source anchors, source jump state, layout draft truth, layout persistence callbacks, and source reference stats are unchanged.
- The useful ownership change is that note-load cleanup now lives beside the document data adapter instead of being hand-wired in the runtime root.
- Browser Harness is intentionally deferred until the full replacement pass is complete.

### Verification

- `npm run build:client` passed.
- `npm run smoke:canvas-engine-performance` passed.
- `server` `npm run build` passed.
- `git diff --check` passed.
- Changed-file secret scan passed.

## V2.BN.8.1 Runtime Surface State Controller Seed

```text
scope: L8 interaction state / L9 overlay state / L10 surface mode / L12 runtime root compression
status: applied
browser smoke: deferred by Henry until all replacement work is complete
```

### What Changed

- Added `client/src/pages/Notes/canvasEngine/hooks/useRuntimeSurfaceStateController.ts`.
- The new controller composes:
  - `useRuntimeInteractionController()`;
  - `useRuntimeLayoutRefsController()`;
  - `useLayoutInteractionController()`;
  - `useFloatingOverlayController()`;
  - `useBlockSelectionController()`;
  - `useSurfaceModeController()`.
- `useNoteCanvasRuntimeController()` no longer imports or calls those six lower-level surface / overlay / selection / mode hooks directly.
- The root controller still receives the same state and callbacks, but now through one surface state boundary.

### Review Notes

- This checkpoint is a boundary extraction only.
- Page / Canvas switching, layout mode, snap on/off, block selection, preview / insert / more / info overlays, chrome collapse, and measured reflow suppression are unchanged.
- This boundary is intentionally broad because these states are already interdependent: mode switching closes overlays, clears snap guide, clears selection, and selection suppresses transient measurement reflow.
- Browser Harness is intentionally deferred until the full replacement pass is complete.

### Verification

- `npm run build:client` passed.
- `npm run smoke:canvas-engine-performance` passed.
- `server` `npm run build` passed.
- `git diff --check` passed.
- Changed-file secret scan passed.

## V2.BN.8.1 Runtime Natural Writing Controller Seed

```text
scope: L8 natural writing / L9 slash command / L10 surface policy entry / L12 runtime root compression
status: applied
browser smoke: deferred by Henry until all replacement work is complete
```

### What Changed

- Added `client/src/pages/Notes/canvasEngine/hooks/useRuntimeNaturalWritingController.ts`.
- The new controller composes:
  - `useDraftBlockController()`;
  - `useSlashCommandController()`;
  - `useCanvasSurfacePointerController()`.
- `useNoteCanvasRuntimeController()` no longer imports or calls those three lower-level natural writing hooks directly.
- The natural writing controller returns the same draft, slash, and surface pointer callbacks consumed by `useNoteCanvasLayerProps()`.

### Review Notes

- This checkpoint is a boundary extraction only.
- Draft persistence, slash command filtering/selection, Ctrl+Enter behavior, blank double-click placement, snap on/off placement policy, and blank surface selection clearing are unchanged.
- Browser Harness is intentionally deferred until the full replacement pass is complete.

### Verification

- Covered by the later consolidated non-browser verification pass:
  - `npm run build:client` passed.
  - `npm run smoke:canvas-engine-performance` passed.
  - `server` `npm run build` passed.
  - `git diff --check` passed.
  - Changed-file secret scan passed.

## V2.BN.8.1 Runtime Placement Interaction Controller Seed

```text
scope: L5 placement interaction / L7 text height estimate dependency / L8 pointer session / L12 runtime root compression
status: applied
browser smoke: deferred by Henry until all replacement work is complete
```

### What Changed

- Added `client/src/pages/Notes/canvasEngine/hooks/useRuntimePlacementInteractionController.ts`.
- The new controller wraps `useBlockPlacementInteractions()` and supplies `estimateBlockHeightForText()` internally.
- `useNoteCanvasRuntimeController()` no longer imports:
  - `useBlockPlacementInteractions`;
  - `estimateBlockHeightForText`.

### Review Notes

- This checkpoint is a boundary extraction only.
- Move / resize behavior, snap behavior, elastic avoidance, layout history, and persistence callbacks are unchanged.
- Text height estimation remains the same function; it is just no longer wired directly by the runtime root.
- Browser Harness is intentionally deferred until the full replacement pass is complete.

### Verification

- Covered by the later consolidated non-browser verification pass:
  - `npm run build:client` passed.
  - `npm run smoke:canvas-engine-performance` passed.
  - `server` `npm run build` passed.
  - `git diff --check` passed.
  - Changed-file secret scan passed.

## V2.BN.8.1 Runtime Document Stats Controller Seed

```text
scope: L6/L9 note chrome stats / L12 runtime root compression
status: applied
browser smoke: deferred by Henry until all replacement work is complete
```

### What Changed

- Added `client/src/pages/Notes/canvasEngine/hooks/useRuntimeDocumentStatsController.ts`.
- Moved `sourceReferenceCount` calculation out of `useNoteCanvasRuntimeController()`.
- `useNoteCanvasRuntimeController()` no longer imports `useMemo` for local note-level stats.

### Review Notes

- This checkpoint is a view-model/statistics boundary extraction only.
- Source reference truth and source reference rendering are unchanged.
- Note chrome still receives the same `sourceReferenceCount` value.
- Browser Harness is intentionally deferred until the full replacement pass is complete.

### Verification

- Covered by the later consolidated non-browser verification pass:
  - `npm run build:client` passed.
  - `npm run smoke:canvas-engine-performance` passed.
  - `server` `npm run build` passed.
  - `git diff --check` passed.
  - Changed-file secret scan passed.

## V2.BN.8.1 Runtime Block Editing Controller Seed

```text
scope: L6 structured field draft / L7 measured reflow / L12 runtime root compression
status: applied
browser smoke: deferred by Henry until all replacement work is complete
```

### What Changed

- Added `client/src/pages/Notes/canvasEngine/hooks/useRuntimeBlockEditingController.ts`.
- The new controller composes:
  - `useBlockFieldDraftController()`;
  - `useMeasuredBlockReflowController()`.
- `useNoteCanvasRuntimeController()` now consumes `updateBlockFieldDraft` and `handleMeasuredBlockHeight` from the new controller.
- `useNoteCanvasRuntimeController()` no longer imports or calls the two lower-level block editing hooks directly.

### Review Notes

- This checkpoint is a boundary extraction only.
- Definition / Formula field truth is unchanged.
- Measured height reflow, collision resolution, movement suppression, and active structured block expansion behavior are unchanged.
- Browser Harness is intentionally deferred until the replacement pass is complete.

### Verification

- Covered by the later consolidated non-browser verification pass:
  - `npm run build:client` passed.
  - `npm run smoke:canvas-engine-performance` passed.
  - `server` `npm run build` passed.
  - `git diff --check` passed.
  - Changed-file secret scan passed.

## V2.BN.8.1 Runtime Frame Model Controller Seed

```text
scope: L4 PageFrame / workspace model composition / L12 runtime root compression
status: applied
browser smoke: deferred by Henry until all replacement work is complete
```

### What Changed

- Added `client/src/pages/Notes/canvasEngine/hooks/useRuntimeFrameModelController.ts`.
- Moved the direct `useNoteCanvasFrameModel()` call out of `useNoteCanvasRuntimeController()`.
- The new controller returns the existing frame/runtime model outputs:
  - `exportPreview`;
  - `noteCanvasRuntime`;
  - `pageContentHeight`;
  - `primaryPageFrame`.

### Review Judgment

This is a narrow but useful L4 boundary. PageFrame height, formal frame creation, Canvas runtime model composition, export preview, and relation endpoint reserve are still implemented by the existing model hook, but the root controller no longer directly owns the frame-model call. That makes the future PageFrame / workspace replacement surface easier to find and review.

### Residual Risk

- Browser smoke is intentionally deferred per Henry instruction.
- This is still a controller wrapper, not a rewritten PageFrame engine.
- Multi-frame productization, pan/zoom-aware frame transforms, and PageFrame ruler controls remain out of scope for V2.BN.8.1.

## V2.BN.8.1 Runtime Layout Model Controller Seed

```text
scope: L3 viewport width / L5 placement model composition / L12 runtime root compression
status: applied
browser smoke: deferred by Henry until all replacement work is complete
```

### What Changed

- Added `client/src/pages/Notes/canvasEngine/hooks/useRuntimeLayoutModelController.ts`.
- Moved the following direct calls out of `useNoteCanvasRuntimeController()`:
  - `useCanvasContentWidth()`;
  - `useNoteCanvasResolvedLayoutModel()`;
  - `useLayoutPersistenceController()`.
- The new controller returns:
  - `contentWidth`;
  - `visibleBlocks`;
  - `blockLayouts`;
  - `defaultDraftLayout`;
  - `persistChangedBlockLayouts`;
  - `persistLayoutSnapshot`.

### Review Judgment

This is aligned with the L3-L5 replacement target. The runtime root still orchestrates higher-level dependencies, but it no longer has to know how viewport width becomes resolved block layouts or how layout snapshots become persistence callbacks. This keeps placement truth inside the Canvas Engine boundary instead of letting it sprawl back into the root controller.

### Residual Risk

- Browser smoke is intentionally deferred per Henry instruction.
- The hook is still a composition wrapper over existing services; it does not yet introduce full pan/zoom viewport ownership or a final placement writer contract.
- The frame model still runs after draft state because it needs `draftActive` / `draftLayout`; that remains a later composition boundary if we want to shrink the root further.

## V2.BN.8.1 Runtime Block History Controller Seed

```text
scope: L11 state persistence / L12 runtime root compression
status: applied
browser smoke: deferred by Henry until all replacement work is complete
```

### What Changed

- Added `client/src/pages/Notes/canvasEngine/hooks/useRuntimeBlockHistoryController.ts`.
- Moved the direct `usePlacementHistory()` call out of `useNoteCanvasRuntimeController()`.
- Moved toolbar trash history glue into the new controller:
  - find the current block before trash;
  - call `trashBlock(blockId)`;
  - when trash succeeds, register `pushTrashedBlockHistory(block)`.
- `useNoteCanvasRuntimeController()` now consumes:
  - `handleTrashBlock`;
  - `pushCreatedBlockHistory`;
  - `pushLayoutHistory`.

### Review Judgment

This is a good small L11/L12 cut. It does not solve every runtime-history concern, but it removes another direct history/service coupling from the large root controller. The new boundary is narrow enough to review: it only connects block lifecycle callbacks to placement history.

### Residual Risk

- Browser smoke is intentionally deferred per Henry instruction.
- The behavior still depends on `usePlacementHistory()` for actual undo / redo stack execution.
- Empty draft undo, convert-block undo, source/relation undo, and inline formula undo remain out of scope.

## V2.BN.8.1 Runtime History Direct Draft Bridge Cleanup

```text
status: technical validation passed, browser smoke deferred
scope: L11 history boundary / L12 runtime root compression
client build: passed
browser smoke: deferred until the full replacement pass, per Henry instruction
```

Completed:

- Removed the `pushCreatedBlockHistoryRef` bridge from `useNoteCanvasRuntimeController()`.
- Moved `usePlacementHistory()` earlier in the root hook order so draft persistence can receive `pushCreatedBlockHistory` directly.
- Kept `usePlacementHistory()` as the owner of layout/create/trash undo-redo stacks.
- Kept visual behavior and data mutation callbacks unchanged.

Still intentionally out of scope:

- No new undo scope beyond the existing layout/create/trash seed.
- No browser smoke in this checkpoint.

## V2.BN.8.1 Canvas Engine Performance Seed

```text
status: technical validation passed, browser smoke deferred
scope: L12 performance seed
command: npm run smoke:canvas-engine-performance
result: passed
browser smoke: deferred until the full replacement pass, per Henry instruction
```

Completed:

- Added `client/scripts/canvasEnginePerformanceSeed.ts`.
- Added `client/scripts/tsconfig.canvas-performance.json`.
- Added root/client `smoke:canvas-engine-performance` scripts.
- Covered five non-browser runtime model scenarios:
  - `50 blocks smoke`;
  - `200 blocks smoke`;
  - `long paragraph block`;
  - `formula-heavy note`;
  - `page + workspace mixed note`.
- The seed exercises production pure functions for placement, collision resolution, height-change reflow, snap, runtime model assembly, relation endpoint reserve, and layout history diff.
- Latest run passed with a total reported seed time of `8.89ms`.

Still intentionally out of scope:

- This is not DOM render performance.
- This is not Browser Harness smoke.
- This is not Henry manual experience acceptance.

## V2.BN.8.1 Shared Overlay Placement Helper Seed

```text
status: technical validation passed, browser smoke deferred
scope: L9 Floating Overlay Layer
client build: passed
browser smoke: deferred until the full replacement pass, per Henry instruction
```

Completed:

- Added `placeOverlayInViewport()` as a shared viewport overlay placement helper.
- Rewired slash menu, selected block control bar, and Formula help tooltip to use the same helper.
- Centralized viewport padding, basic clamp, below/above fallback, and right/left fallback behavior.
- Kept existing overlay ownership unchanged: `FloatingOverlayLayer` renders the portal; individual layer/components still own their visual content.

Still intentionally out of scope:

- No real world/screen transform anchor service for future pan/zoom yet.
- No full collision engine for multiple simultaneous overlays.
- No browser smoke in this checkpoint; browser harness testing is intentionally deferred until the current replacement pass is complete.

## V2.BN.8.1 Formula Help Overlay Portal Seed

```text
status: technical validation passed, browser smoke blocked
scope: L9 Floating Overlay Layer
client build: passed
browser smoke: blocked by Chrome remote debugging authorization handshake
```

Completed:

- Moved FormulaBlock `?` help tooltip into `FloatingOverlayLayer` free placement.
- Added `getTooltipAnchor()` as a first-version viewport anchor for help / small explanatory overlays.
- Formula help now follows the help button viewport rect and can flip above the button near the viewport bottom.
- The tooltip no longer participates in block measurement, block-local clipping, or selected block stacking.
- Formula input rules, paste sanitizer, preview rendering, and `latex_input` field truth are unchanged.

Still intentionally out of scope:

- No complete collision / flip / viewport clamp service yet.
- No inline TextBlock `Convert to formula` command yet.
- Browser visual smoke is blocked by the Chrome remote debugging authorization handshake; Henry manual retest is still required.

## V2.BN.8.1 Slash Menu And Block Control Overlay Portal Seed

```text
status: technical validation passed, browser smoke pending
scope: L9 Floating Overlay Layer
client build: passed
browser smoke: not run in this checkpoint
```

Completed:

- Moved `SlashMenuLayer` into `FloatingOverlayLayer` free placement.
- Slash command anchor now uses viewport/caret coordinates instead of block-list-relative coordinates.
- Moved `BlockControlBarLayer` into `FloatingOverlayLayer` free placement.
- Added a selected-block viewport anchor seed through `getBlockControlAnchor`.
- `BlockEditorLayer` now measures the active block DOM rect for toolbar placement instead of letting the toolbar live in block flow.
- The toolbar keeps existing button behavior for move, export visibility, AI visibility, save, and trash.
- The portal shell remains pointer-events isolated; only the toolbar body is interactive.

Still intentionally out of scope:

- No full overlay collision / flip service yet.
- Browser visual smoke and Henry manual retest are still required.

## V2.BN.8.1 Insert And Source Overlay Portal Seed

```text
status: technical validation passed, browser smoke pending
scope: L9 Floating Overlay Layer
client build: passed
browser smoke: not run in this checkpoint
```

Completed:

- Added `client/src/pages/Notes/canvasEngine/layers/NoteFloatingPanelLayer.tsx`.
- Moved Insert floating action, Advanced Insert panel, and Source jump panel out of `NoteChromeLayer.tsx`.
- Extended `FloatingOverlayLayer` with `free` placement for viewport-fixed controls.
- Kept Note info, More actions, Export preview in the top-right overlay stack.
- Moved Source jump into the viewport overlay stack.
- `NoteRuntimeDocumentLayer` now composes the floating panel layer from its own module.

Still intentionally out of scope:

- Slash menu remains writing-surface anchored.
- Block control bar remains block-local.
- Formula help tooltip is now covered by the later Formula Help Overlay Portal Seed checkpoint.
- No overlay collision / flip / viewport clamp service yet.

## V2.BN.8.1 Floating Overlay Portal Seed

```text
status: technical validation passed, browser smoke pending
scope: L9 Floating Overlay Layer
client build: passed
server build: passed
browser smoke: not run in this checkpoint
```

Completed:

- Added `client/src/pages/Notes/canvasEngine/layers/FloatingOverlayLayer.tsx`.
- Moved Note info, More actions, and Export preview panels into a shared viewport-level portal stack.
- Export preview now uses the same floating panel positioning class as the other chrome panels.
- The new overlay portal uses pointer-events isolation: the portal shell does not swallow the page, while the actual panels remain interactive.
- `canvasEngine/index.ts` now exports `FloatingOverlayLayer` for later L9 expansion.

Still intentionally out of scope:

- Slash menu remains in the writing surface layer.
- Insert panel and source jump panel remain in `NoteFloatingPanelLayer`.
- Block control bar remains block-local rather than viewport anchored.
- Formula help tooltip is now covered by the later Formula Help Overlay Portal Seed checkpoint.
- No overlay collision/flip service yet.

Review note:

- This patch addresses the first z-index / stacking-context boundary: preview/info/action panels no longer depend on `noteChrome` local absolute positioning.
- It does not close L9. L9 still needs a real overlay anchor service for block toolbars, source picker, relation picker, slash command, and formula help.

## V2.BN.8.1 L12 Decommission Evidence Audit

```text
status: code decommission achieved, acceptance incomplete
scope: L12 NoteDetail decommission / runtime replacement evidence
branch: codex/v2-bn-canvas-engine
current commit: ab25d5f
browser smoke: blocked by Chrome remote debugging authorization
Henry manual pass: still required
```

Current code evidence:

- `client/src/pages/Notes/NoteDetail.tsx` now reads only the `noteId` route param.
- `NoteDetail.tsx` mounts `NoteCanvasRuntimeProvider` and renders `NoteCanvasRuntime`.
- The old NoteDetail runtime body is no longer present in `NoteDetail.tsx`.
- The following L12 cleanup symbols are absent from `NoteDetail.tsx`: `blockLayouts`, `layoutDrafts`, `normalizeBlockLayout`, `beginMoveBlock`, `beginResizeBlock`, `getSlashMenuAnchor`, `SlashMenu`, `BlockEditor`.
- Canvas Engine now owns the note-page runtime path through `client/src/pages/Notes/canvasEngine/NoteCanvasRuntime.tsx` and `hooks/useNoteCanvasRuntimeController.ts`.

Interpretation:

- Earlier sections that say `NoteDetail.tsx` is still the old runtime body are historical startup snapshots from before the replacement work.
- The current risk has shifted from "old NoteDetail still owns runtime" to "Canvas Engine owns runtime, but its controller/layer/service boundaries still need acceptance hardening."
- `V2.BN.8.1` is therefore not complete yet: browser smoke, performance seed, and Henry manual `passed` are still required before closing the stage.

## V2.BN.8.1 PageFrame Content Inset Seed

```text
status: technical validation passed
scope: L4 PageFrame and Workspace / ISSUE-010 content inset seed
client build: passed
server build: passed
git diff check: passed
changed-file secret scan: false positives only
browser smoke: blocked by Chrome remote debugging authorization
```

Completed:

- `PageFrameModel` now carries `contentInset`.
- Default PageFrame runtime geometry separates outer frame width from formal content width.
- Existing block placement coordinates remain content-area-relative for this seed.
- Canvas mode formal PageFrame boundary now renders from the outer frame coordinate rather than the content origin.
- State, architecture, interaction, open issue, and changelog docs were updated.

Still intentionally out of scope:

- No draggable ruler UI.
- No page style inspector.
- No persisted database field or migration.
- No automatic reflow policy for future ruler changes.

Verification:

- client build passed.
- server build passed.
- `git diff --check` passed with line-ending warnings only.
- changed-file secret scan only matched documentation text such as `secret scan` / `visual token`.
- Browser Harness smoke could not complete because Chrome remote debugging authorization timed out; Henry visual retest is still needed.

## V2.BN.8.1 Runtime History Boundary Seed

```text
status: technical validation passed
scope: L11 state persistence and undo boundary seed
client build: passed
server build: passed
git diff check: passed
changed-file secret scan: false positives only
browser smoke: blocked by Chrome remote debugging authorization
```

Completed:

- `usePlacementHistory` now owns one runtime history stack rather than separate placement-only stacks.
- Existing move / resize undo remains supported through `layout` history entries.
- Draft block creation now registers a `createdBlock` history entry after the block is persisted.
- Undoing a created block uses the existing soft-delete route and removes the block from local state.
- Redoing a created block uses the existing note-block update route with `status: active` and restores the block into local state.
- Toolbar block delete now registers a `trashedBlock` history entry after the soft-delete succeeds.
- Undoing a toolbar-deleted block uses the same restore route; redoing it soft-deletes the block again.
- `useNoteCanvasDataAdapter` now exposes `restoreBlock()` and lets history call `trashBlock()` silently.

Still intentionally out of scope:

- No cross-note undo.
- No source/reference/relation mutation undo.
- No long-term history or version timeline UI.
- No inline formula conversion undo.
- No full trash management UI or long-term deleted-object browser beyond this created/trashed block undo-redo seed.

Verification:

- client build passed.
- server build passed.
- `git diff --check` passed with line-ending warnings only.
- changed-file secret scan only matched documentation text that mentions secret scan status.
- Browser Harness smoke could not complete because Chrome remote debugging authorization timed out; Henry can re-run after clicking Allow if prompted.

## V2.BN.8.1 Runtime Placement Record Seed

```text
status: technical validation passed
scope: L5 placement service contract hardening
client build: passed
server build: passed
browser smoke: blocked by Chrome remote debugging authorization
```

Completed:

- Added `buildRuntimeBlockPlacement()` in `placementService`.
- Added `buildRelationEndpointReserveForPlacement()` as a relation endpoint reserve seed only.
- Extended `BlockPlacementModel` from a visual rect into a runtime placement record:
  - `placementId`
  - `objectId`
  - `objectKind`
  - `canvasId`
  - optional `frameId`
  - `boundaryRole`
  - `zIndex`
  - `snapState`
  - `visibilityState`
- Updated `useNoteCanvasLayoutModel()` so Canvas runtime placement construction is no longer hand-assembled inside the hook.

Still intentionally out of scope:

- No database migration.
- No API change.
- No multi-frame runtime.
- No relation runtime.
- No visible connector UI.

Verification:

- client build passed.
- server build passed.
- `git diff --check` passed.
- changed-file secret scan passed.
- Browser Harness smoke could not complete because Chrome remote debugging authorization timed out; Henry can re-run after clicking Allow if prompted.

## V2.BN.8.1 Formula Input Sanitizer And Help Seed

```text
status: technical validation passed
client build: passed
manual formula paste smoke: pending Henry retest
```

已完成部分：

- 新增 `normalizeFormulaLatexInput()`，把独立 FormulaBlock 的 whole-input delimiter 清洗成纯 LaTeX body。
- `formulaFieldsFromBlock()` 读取旧字段时会宽容清洗 `$...$` / `$$...$$` / `\(...\)` / `\[...\]`。
- `contentForFormula()` 保存时也会清洗 `latex_input`，让 field truth 保持为公式 body，而不是 display/inline wrapper。
- `FormulaBlockProjection` 增加 paste sanitizer：用户粘贴完整包裹公式时，插入进 textarea 的就是 body。
- Formula input 失焦保存前会再次归一化，降低旧 wrapper 被保存回字段 truth 的风险。
- active Formula editor 增加 `?` help seed；它最初作为 block-local tooltip 落地，当前已由后续 checkpoint 迁入统一 FloatingOverlayLayer。

已验证：

- client build passed。

仍需验收：

- Henry 粘贴 `$a^2+b^2=c^2$`，输入区应保存为 `a^2+b^2=c^2`，预览正常渲染。
- Henry 粘贴 `$$...$$` 多行公式，输入区应保存为 body，预览按 display mode 渲染。
- hover `?` 时说明不应被 block 裁切或遮挡到不可读。
- 正文 inline math 暂未实现，仍归入后续 TextBlock rich text / context menu 设计。

## V2.BN.8.1 Canvas Shell And PageFrame Boundary Patch

```text
status: technical validation passed
client build: passed
browser smoke: passed
manual visual acceptance: pending Henry retest
```

已完成部分：

- `NoteCanvasRuntime` 根据当前 surface mode 给根节点增加 Canvas shell class。
- Canvas mode 下根节点固定为 viewport 高度并关闭全局页面滚动。
- `documentShellCanvas` 改为填满 runtime root，不再手写 `100vw - 320px` 宽度估算。
- `writingSurfaceCanvas` 去掉外层 card/bubble 边框和阴影，只保留 grid workspace。
- `blockListCanvas` 的高度改用 CanvasWorld height；formal PageFrame boundary 继续使用 PageFrame 内容高度。
- PageFrame 初始 X offset 调整到 96px，保证进入 Canvas mode 时主 PageFrame 横向完整可见。
- `+ Insert` floating action 在 Canvas mode 下固定在右侧中部。
- `NoteWritingSurfaceLayerProps.noteCanvasRuntime` 改为正式 `NoteCanvasRuntimeModel` 类型，避免 layer props 把 world 类型写窄。

已验证：

- client build passed。
- `git diff --check` passed。
- browser smoke passed：
  - Canvas mode `bodyCanScroll = false`；
  - `shellOverflowY = hidden`；
  - `surfaceOverflowY = auto`；
  - formal PageFrame boundary 横向完整位于 writing surface 内；
  - `rootCanvasWorldHeight = 2600px`；
  - console error 为空。

仍需人工观察：

- Henry 在真实宽屏/收起 sidebar 两种状态下确认 canvas 是否填满剩余区域；
- 在 Canvas mode 中滚动较长 workspace 时，确认只滚动 canvas workspace；
- 手动拖动 PageFrame 内最底部 block 向下时，确认 PageFrame 是否按内容自然延伸。

## V2.BN.8.1 Slash Menu Caret Anchor Patch

```text
status: technical validation passed
client build: passed
browser smoke: runtime reload passed
manual anchor smoke: pending Henry retest
```

已完成部分：

- `getSlashMenuAnchor()` 从 element boundary anchor 升级为 caret-first anchor。
- 对 textarea / input，anchor service 会创建临时 mirror，按当前 caret index 计算当前输入点的 client rect。
- `useSlashCommandController()` 现在把 caret index 传给 `getSlashMenuAnchor()`。
- 菜单仍挂在 `blockList` 定位上下文内，x/y 仍会相对 `blockList` clamp。
- 本轮不改变 slash command 内容、disabled 状态、template lookup、draft persist 或 block convert 行为。

已验证：

- client build passed。
- browser runtime reload smoke passed：
  - `data-canvas-engine-version = V2.BN.8-self-owned-minimal-hybrid-0`；
  - `data-canvas-engine-route = self_owned_minimal_hybrid`；
  - textarea count = 2；
  - console error 为空。

验证限制：

- 当前 Browser 输入 API 因虚拟剪贴板限制无法稳定执行 `/for` 输入交互，所以菜单实际贴近 caret 的体验仍需 Henry 手动复测。

## V2.BN.8.1 Definition Field Truth And Active Reflow Patch

```text
status: technical validation passed
client build: passed
browser smoke: lightweight runtime smoke passed
```

已完成部分：

- `definitionFieldsFromBlock()` 现在在检测到 stored structured fields 时停止使用 `body` / `plain_text` 作为 description fallback。
- 这让 `concept_name` 与 `description` 回到独立 field value：只填 `CS:GO` 不会再把 `CS:GO` 自动写进 description。
- `DefinitionBlockProjection` 的 blur 保存改为读取最新字段 ref，降低 Tab 切换输入框时保存旧字段的风险。
- `useMeasuredBlockReflowController()` 允许 active Definition 和 active Formula 一样触发 measured-height reflow。
- `useBlockMeasurement()` 增加 requestAnimationFrame 复测，覆盖 structured field 切换/textarea resize 后的下一帧高度。
- Browser smoke 确认当前 note 仍挂在 Canvas Engine runtime：
  - `data-canvas-engine-version = V2.BN.8-self-owned-minimal-hybrid-0`；
  - `data-canvas-engine-route = self_owned_minimal_hybrid`；
  - 当前页面存在 4 个 article；
  - console error 为空。

仍需验收：

- Henry 重新测试：新建 DefinitionBlock，输入 Concept name 后按 Tab，Description 应保持空白。
- Henry 重新测试：DefinitionBlock active 展开时，下方 block 应被稳定推开，不再穿模。
- 需要继续观察 paragraph -> Definition 转换路径是否仍符合“全文进 description，concept name 留空”的产品约定。

## V2.BN.8.1 L2/L12 Runtime Controller Composition Hook Seed

```text
status: in progress
client build: passed
server build: passed
browser smoke: not run
```

已完成部分：

- 新增 `hooks/useNoteCanvasRuntimeController.ts`。
- `NoteCanvasRuntime.tsx` 中的 controller graph orchestration 已迁入 runtime controller hook：
  - data adapter；
  - block selection；
  - draft block；
  - layout draft；
  - layout interaction；
  - surface mode；
  - floating overlay；
  - block placement interaction；
  - slash command；
  - measurement / reflow；
  - layer props composition。
- `NoteCanvasRuntime.tsx` 当前约 24 行，只负责 loading shell、`NoteChromeLayer` 和 `NoteRuntimeDocumentLayer` 渲染。
- `canvasEngine/index.ts` 已导出 `useNoteCanvasRuntimeController`。
- 本轮属于 L2 runtime root 与 L12 decommission 的收口 seed：Canvas Engine runtime root 仍存在，但 root render 文件不再直接持有 controller wiring。

仍需验收：

- 打开 note 后是否仍正常进入 Canvas Engine runtime；
- Page / Canvas、Preview、Layout、Info、More、Insert 是否仍正常；
- block 创建 / 编辑 / slash / move / resize / formula expand / definition edit 是否仍正常；
- controller hook 是否需要继续按 L3-L11 分区拆小，避免长期形成新的大 hook；
- diff check、secret scan 尚待本 checkpoint 最终执行；浏览器 smoke 尚未执行。

## V2.BN.8.1 CodeBlock Projection Smoke

```text
status: partial smoke passed
client build: passed
server build: passed
browser smoke: passed for code projection / preview sanity
```

已验证：

- smoke note reload 后仍挂在 Canvas Engine runtime：
  - `data-canvas-engine-version = V2.BN.8-self-owned-minimal-hybrid-0`；
  - `data-canvas-engine-route = self_owned_minimal_hybrid`。
- 页面仍能显示 Page / Preview / Layout / Insert 入口。
- Code snippet 现在渲染为 `CodeBlockProjection`，不再只走普通 text projection。
- 选中 code block 后可见 `CODE` badge。
- Preview 面板仍可打开，并显示 export preview / overlay controls。
- 本轮浏览器 smoke 未观察到 console error。

仍需验收：

- Code block 行级复制 / gutter 多行选择尚未实现；
- Definition 字段内容、Formula input、Page / Canvas mode、move / resize / undo 等完整 L12 体验仍需单独 smoke；
- Henry 手动确认之前，V2.BN.8.1 不能标记 passed。

## V2.BN.8.1 Formula Preview Display Body Patch

```text
status: partial technical validation passed
client build: passed
```

已完成部分：

- `formulaPreviewText()` 现在把裸 `latex_input` 作为独立公式 body 处理，默认输出 `$$...$$` display math。
- 已包裹 `$$...$$` 的输入保持不变。
- 单 `$...$` 输入保持 inline；如果内部是多行或 `\begin...` 环境，升级为 display math。
- 使用 Green theorem / `aligned` body 直接调用 KaTeX display mode 验证可渲染。

仍需验收：

- 浏览器里编辑 FormulaBlock 并保存后，确认 reload 后仍保留纯 LaTeX body；
- `cases` / `matrix` / `array` 等常见环境仍需补测；
- Formula help tooltip 已进入统一 overlay layer；完整输入说明与正文 inline formula conversion 仍需后续补齐。

## V2.BN.8.1 L7/L12 Runtime Refs And Load Reset Controller Seed

```text
status: in progress
client build: passed
server build: passed
browser smoke: not run
```

已完成部分：

- 新增 `hooks/useRuntimeLayoutRefsController.ts`。
- `blockListRef`、`movingBlockIdRef`、`suppressMeasuredReflowUntilRef` 已从 `NoteCanvasRuntime.tsx` 迁出。
- selection 前临时 suppress measured reflow 的 callback 已从 `NoteCanvasRuntime.tsx` 迁出。
- 新增 `hooks/useNoteLoadResetController.ts`。
- note loaded 后的 `resetLayoutDrafts()` / `clearBlockSelection()` orchestration 已从 `NoteCanvasRuntime.tsx` 迁出。
- `NoteCanvasRuntime.tsx` 当前约 439 行，不再直接导入 `useRef` / `LAYOUT_MEASURE_SUPPRESSION_MS`。

仍需验收：

- note 切换或 reload 后 selection 是否仍清空；
- note load 后 layout drafts 是否仍 reset；
- block focus / select 前 measured-height reflow suppression 是否仍阻止误推开；
- moving block measured reflow suppression 是否仍能避开拖拽中的 block；
- diff check、secret scan 已通过；浏览器 smoke 尚未执行。

## V2.BN.8.1 L6/L9 Runtime Document Layer Composition Seed

```text
status: in progress
client build: passed
server build: passed
browser smoke: not run
```

已完成部分：

- 新增 `layers/NoteRuntimeDocumentLayer.tsx`。
- `documentShell` / `documentShellCanvas` 的 DOM 壳层已从 `NoteCanvasRuntime.tsx` 迁出。
- `templateWarning`、`NoteFloatingPanelLayer`、`NoteWritingSurfaceLayer` 的组合挂载已迁入 document layer。
- `NoteFloatingPanelLayerProps` 和 `NoteWritingSurfaceLayerProps` 现在作为显式 props contract 导出，方便后续继续拆分 overlay / writing surface。
- `NoteCanvasRuntime.tsx` 当前约 442 行，继续保留 controller orchestration 和 props composition；它不再直接拥有 document shell DOM。

仍需验收：

- Insert floating panel 打开/关闭、添加 block、source jump panel close 是否仍正常；
- writing surface 里的 block projection、draft、slash menu、snap guide 是否仍正常；
- Page / Canvas mode 下 document shell class 是否仍正确；
- diff check、secret scan 已通过；浏览器 smoke 尚未执行。

## V2.BN.8.1 L6/L7/L11 Runtime Decision Controller Seed

```text
status: in progress
client build: passed
server build: passed
```

已完成部分：

- 新增 `hooks/useBlockFieldDraftController.ts`。
- 新增 `hooks/useLayoutPersistenceController.ts`。
- 新增 `hooks/useMeasuredBlockReflowController.ts`。
- `NoteCanvasRuntime.tsx` 不再内联：
  - Definition / Formula field draft 到 text draft 的派生；
  - changed layout 是否需要落盘的判断；
  - undo / redo layout snapshot 的 persistence callback；
  - measured block height 是否允许推开后续 block 的 reflow decision。
- `NoteCanvasRuntime.tsx` 当前约 447 行，继续保留 runtime controller / layer composition 角色。后续 document layer composition checkpoint 已继续把 document shell DOM 迁出。

仍需验收：

- Definition concept / description field draft 是否仍正确同步 text draft；
- Formula latex field draft 是否仍正确同步 text draft；
- move / resize 后 layout persistence 是否仍能跳过 unchanged layout；
- Ctrl+Z / Ctrl+Y placement history 是否仍会 persist snapshot；
- measured height reflow 是否仍避开 moving block，且 active formula 仍允许 reflow；
- 浏览器 smoke 尚未执行。

## V2.BN.8.1 L3-L5 Layout Model Hook Seed

```text
status: in progress
client build: passed
server build: passed
```

已完成部分：

- 新增 `hooks/useNoteCanvasLayoutModel.ts`。
- `NoteCanvasRuntime.tsx` 不再直接组合以下模型：
  - visible blocks for current surface；
  - resolved `blockLayouts`；
  - default draft layout；
  - PageFrame content height；
  - primary PageFrame；
  - canvas block placements；
  - `noteCanvasRuntime` model；
  - export preview model。
- `measurementService.ts` 现在提供 `estimateBlockHeightForText()` / `estimateBlockHeight()`，root runtime 不再内联 formula-like height heuristic。
- 本轮保持 `useDraftBlockController()` 所需的 `defaultDraftLayout` 顺序不变：先由 layout model hook 解析 block layout，再把 default draft layout 注入 draft controller，最后由 frame model hook 使用 draft 状态组合 PageFrame/runtime model。

仍需验收：

- Page mode visible blocks 是否仍过滤 workspace block；
- Canvas mode 是否仍显示 workspace block；
- PageFrame height 是否仍跟随 page block 和 draft block bottom；
- export preview Included / Excluded / AI visible / AI hidden 统计是否仍正常；
- move / resize 后 reload 是否仍保持 placement；
- 浏览器 smoke 尚未执行。

## V2.BN.8.1 Current Runtime Decommission Snapshot

```text
status: in progress
NoteDetail shell: achieved
runtime replacement: partially achieved
```

当前事实：

- `client/src/pages/Notes/NoteDetail.tsx` 当前只负责读取 `noteId` route param，并通过 `NoteCanvasRuntimeProvider` 渲染 `NoteCanvasRuntime`。
- 旧的 `NoteDetail.tsx` 大型 runtime 主体已经清退；当前剩余替换工作集中在 `canvasEngine/NoteCanvasRuntime.tsx` 内部继续分层。
- `NoteCanvasRuntime.tsx` 当前仍保留：
  - runtime controller / layer composition；
  - note data adapter orchestration；
  - block list、moving block、measured reflow suppression refs；
  - controller-to-layer handler wiring。
- 因此当前状态不是“NoteDetail 仍是旧 runtime”，而是“Canvas Engine 已成为 note 页面 runtime root，但 runtime root 内部仍需继续瘦身和验收”。

下一步验收重点：

- 继续减少 `NoteCanvasRuntime.tsx` 对 controller / layer wiring 的直接持有；
- 对 Page / Canvas mode、block edit、draft、slash、resize/reflow、preview overlay 做浏览器 smoke；
- 完成 L12 acceptance 后再判断 `V2.BN.8.1` 是否可以关闭。

## V2.BN.8.1 L6/L9 Writing Surface Layer Seed

```text
status: in progress
client build: passed
server build: passed
```

已完成部分：

- 新增 `layers/NoteWritingSurfaceLayer.tsx`。
- writing surface 的 DOM 壳层已从 `NoteCanvasRuntime.tsx` 迁出：
  - `writingSurface` / `blockList` shell；
  - Canvas debug data attributes；
  - PageFrame boundary seed；
  - Scratch workspace label；
  - snap guide rendering；
  - `visibleBlocks.map(...)` 的 block projection 挂载；
  - draft textarea；
  - slash menu；
  - empty page prompt。
- `BlockEditorLayer` 和 `SlashMenuLayer` 现在由 `NoteWritingSurfaceLayer` 挂载。
- `NoteCanvasRuntime.tsx` 继续保留：
  - `blockLayouts` 计算；
  - field draft -> text draft derivation；
  - measured height -> layout draft reflow decision；
  - placement / resize / draft / slash controller callbacks；
  - runtime model composition。
- `NoteCanvasRuntime.tsx` 从约 640 行降到约 568 行。

仍需验收：

- block focus / select / toolbar 是否仍正常；
- block text change / field draft change / save 是否仍正常；
- measured height reflow 是否仍推开后续 block；
- draft blur 保存 / 空 draft 消失是否仍正常；
- slash menu anchor 和 command select 是否仍正常；
- empty prompt 是否仍只在空 note 出现；
- 浏览器 smoke 尚未执行。

## V2.BN.8.1 L9 Note Chrome And Floating Panel Layer Seed

```text
status: in progress
client build: passed
server build: passed
```

已完成部分：

- 新增 `layers/NoteChromeLayer.tsx`。
- 顶部 note chrome 已从 `NoteCanvasRuntime.tsx` 迁入 `NoteChromeLayer`：
  - back project；
  - title input；
  - Page / Canvas mode button；
  - Preview button；
  - Layout button；
  - favorite placeholder；
  - note info；
  - more actions；
  - chrome collapse / expand。
- Note info、More actions、Export preview 的 popover 编排已随 note chrome 迁入 layer。
- Insert page tool rail / Advanced insert panel 已迁入 `NoteFloatingPanelLayer`。
- Source jump panel 已迁入 `NoteFloatingPanelLayer`。
- `NoteCanvasRuntime.tsx` 从约 874 行降到约 640 行，继续保留 controller、data adapter、block layout、block projection composition 和 runtime model composition。

仍需验收：

- Note title blur / Enter 保存是否仍正常；
- Page / Canvas、Preview、Layout、Info、More、Collapse / Expand 按钮是否仍正常；
- Advanced insert 是否仍能添加 block 并 focus 到新 block；
- Source jump panel 是否仍能打开和关闭；
- Preview overlay toggles 是否仍在关闭 panel 后保留；
- 浏览器 smoke 尚未执行。

## V2.BN.8.1 L5/L7 Layout Draft Controller Hook Seed

```text
status: in progress
client build: passed
server build: passed
```

已完成部分：

- 新增 `hooks/useLayoutDraftController.ts`。
- `layoutDrafts` state 已从 `NoteCanvasRuntime.tsx` 迁出。
- `resetLayoutDrafts()` 已迁入 hook，并继续在 note loaded 时调用。
- `clearLayoutDraftForBlock()` / `setLayoutDraftForBlock()` 已迁入 hook，继续供 data adapter 在 trash / persist layout 时使用。
- `mergeLayoutDrafts()` 已迁入 hook，继续供 placement history undo / redo draft merge 使用。
- measured height -> layout draft reflow 已通过 `applyMeasuredBlockHeightDraft()` 进入 hook。
- resolved `blockLayouts` 暂时仍留在 `NoteCanvasRuntime.tsx`，原因是它需要 `visibleBlocks` / `contentWidth` / `surfaceMode`，而这些数据目前横跨 data adapter、surface policy 和 placement seed。强行迁出会制造新的依赖环。

仍需验收：

- block move / resize 后 draft 是否仍即时生效；
- block move / resize 后 reload 是否仍落盘；
- formula / definition measured height 变化是否仍推开后续 block；
- undo / redo placement history 是否仍能合并 draft；
- 浏览器 smoke 尚未执行。

## V2.BN.8.1 L8 Layout Interaction Controller Hook Seed

```text
status: in progress
client build: passed
server build: passed
```

已完成部分：

- 新增 `hooks/useLayoutInteractionController.ts`。
- `layoutMode` state 已从 `NoteCanvasRuntime.tsx` 迁出。
- `snapGuide` state 已从 `NoteCanvasRuntime.tsx` 迁出。
- `snapEnabled` state 已从 `NoteCanvasRuntime.tsx` 迁出。
- Layout 按钮 toggle 逻辑已迁入 hook。
- Snap alignment toggle 逻辑已迁入 hook。
- toggle layout / snap 时清空 snap guide 的规则已集中到 hook。

仍需验收：

- Layout 按钮是否仍能进入/退出 layout mode；
- Snap alignment 开关是否仍能切换 On / Off；
- move / resize 时 snap guide 是否仍正常出现并清理；
- 浏览器 smoke 尚未执行。

## V2.BN.8.1 L8 Canvas Surface Pointer Controller Hook Seed

```text
status: in progress
client build: passed
server build: passed
```

已完成部分：

- 新增 `hooks/useCanvasSurfacePointerController.ts`。
- document shell 的空白点击取消 selection 已从 `NoteCanvasRuntime.tsx` 迁出。
- block list 的空白点击取消 selection 已从 `NoteCanvasRuntime.tsx` 迁出。
- PageFrame 空白双击创建 draft 的落点计算已迁入 hook。
- `createBlankDraftLayout()` 现在由 surface pointer controller 调用，不再由 runtime 主文件直接调用。
- 新 draft 落点仍使用当前 `surfacePolicy` / `snapEnabled` / `pageOffsetX` / `contentWidth` / `defaultDraftLayout`，保持行为不变。

仍需验收：

- 点空白处是否仍取消 block 选中；
- 点击 block / toolbar / input / panel 是否不会误清 selection；
- 双击 PageFrame 空白处是否仍创建 draft；
- snap on/off 下 draft 落点是否仍符合现有策略；
- 浏览器 smoke 尚未执行。

## V2.BN.8.1 L8 Block Selection Controller Hook Seed

```text
status: in progress
client build: passed
server build: passed
```

已完成部分：

- 新增 `hooks/useBlockSelectionController.ts`。
- block selection 的本地状态已从 `NoteCanvasRuntime.tsx` 迁出：
  - focus block；
  - active block；
  - selected block。
- clear selection / mark focused / mark selected 三个动作已迁入 hook。
- block focus 和 block select 仍会写入对应 interaction state。
- 进入 focus / select 前的 measurement suppression 仍由 runtime 注入 hook，避免本轮改变测量/重排行为。
- `NoteCanvasRuntime.tsx` 仍把 selection setter 传给 draft / slash / placement hooks，后续可继续把这些边界收口到更完整的 L8 controller。

仍需验收：

- 点击 block 后 toolbar / badge / active 样式是否仍正常；
- 文本 block focus 后是否仍进入编辑态；
- 空白区域点击是否仍取消选中；
- draft 创建后是否仍能 focus 到新 block；
- drag / resize 后是否仍保持 selected block；
- 浏览器 smoke 尚未执行。

## V2.BN.8.1 L8 Draft Block Controller Hook Seed

```text
status: in progress
client build: passed
server build: passed
```

已完成部分：

- 新增 `hooks/useDraftBlockController.ts`。
- draft block 的本地状态已从 `NoteCanvasRuntime.tsx` 迁出：
  - active state；
  - text state；
  - creating state；
  - focus nonce；
  - draft layout；
  - draft textarea ref；
  - draft text ref；
  - creating guard ref。
- draft focus / auto-height effect 已迁入 hook。
- `persistDraft()` 已迁入 hook，仍复用现有 `createBlock()` / `saveBlock()` API。
- `activateDraft()` 已迁入 hook，仍负责取消当前 active/selected block 并写入 `editingTextInteraction()`。
- empty draft discard 已迁入 hook，runtime 只在 blur 时决定调用它并清理 slash target。
- draft textarea height update 已通过 `resizeDraftFromTextarea()` 进入 hook。

仍需验收：

- server build；
- 双击空白创建 draft 后是否仍自动 focus；
- 输入 `/` 后 slash menu 是否仍正常；
- draft blur 后有内容是否仍保存成 block；
- draft blur 后无内容是否仍自然消失；
- `/formula` / `/definition` 从 draft 创建 structured block 是否仍正常；
- 浏览器 smoke 尚未执行。

## V2.BN.8.1 L10 Surface Mode Controller Hook Seed

```text
status: in progress
client build: passed
server build: passed
```

已完成部分：

- 新增 `hooks/useSurfaceModeController.ts`。
- `surfaceMode` state 已从 `NoteCanvasRuntime.tsx` 迁出。
- `surfacePolicy` / `pageOffsetX` 派生已进入 surface mode controller。
- Page / Canvas mode toggle 的副作用已统一收口到 controller：
  - close overlay；
  - clear snap guide；
  - clear current block selection。
- `NoteCanvasRuntime.tsx` 不再直接调用 `createSurfaceModePolicy()` / `getNextSurfaceMode()`。

仍需验收：

- client build / server build；
- Page / Canvas toggle 是否仍保持原有视觉行为；
- Preview / Insert / Info / More overlay 是否在切换模式时正常关闭；
- snap guide 是否在切换模式时清空；
- selected block 是否在切换模式时取消选中。

## V2.BN.8.1 L9 Floating Overlay Controller Hook Seed

```text
status: in progress
client build: passed
```

已完成部分：

- 新增 `hooks/useFloatingOverlayController.ts`。
- 顶部 chrome collapsed state 已从 `NoteCanvasRuntime.tsx` 迁出。
- Insert / Note info / More actions / Preview 的互斥打开状态已从 `NoteCanvasRuntime.tsx` 迁出。
- Preview debug overlay toggles 已从 `NoteCanvasRuntime.tsx` 迁出，并继续保持关闭 preview 后不丢开关状态。
- `NoteCanvasRuntime.tsx` 不再直接写入 `openingMenuInteraction('noteInfo' | 'moreActions' | 'insert')` 或 `previewingInteraction()`；这些 interaction state 由 floating overlay controller 管理。

仍需验收：

- Browser smoke 验证 Insert / Preview / Info / More 任意时刻仍只有一个打开。
- Browser smoke 验证关闭 panel 后 interaction state 能回到 idle。
- Browser smoke 验证关闭 Preview 后，block type / AI visibility / export status overlay 开关状态仍保留。
- Browser smoke 验证折叠 / 展开 top chrome 后页面工具仍可使用。
- 后续 L9 仍需决定是否把这些面板 JSX 继续迁入独立 `FloatingOverlayLayer` / `NoteChromeLayer`。

## V2.BN.8.1 L9 Slash Command Controller Hook Seed

```text
status: in progress
client build: passed
```

已完成部分：

- 新增 `hooks/useSlashCommandController.ts`。
- Slash command 的 target state、命令列表、template availability 判断、draft/block change handler、Esc / Ctrl+Enter handler 和 command selection flow 已从 `NoteCanvasRuntime.tsx` 迁出。
- `NoteCanvasRuntime.tsx` 不再直接拥有 slash trigger detection / command filtering / slash anchor calculation。
- `SlashMenuLayer.tsx` 继续负责菜单渲染；`overlayService.ts` 继续负责 anchor 计算。
- hook 边界显式接收 draft persistence、block save、template conversion、block text draft setter、focus setter 和 interaction state setter。

仍需验收：

- Browser smoke 验证 draft 中输入 `/` 时菜单仍出现在 caret 附近。
- Browser smoke 验证已有 block 中输入 `/definition` / `/formula` 仍能打开菜单并转换。
- Browser smoke 验证 Esc 能关闭 draft/block slash menu。
- Browser smoke 验证 Ctrl+Enter 在 draft/block 场景仍保持原行为。
- 后续 L9 仍需继续迁出 note info / more actions / insert panel / preview state 到统一 floating overlay controller 或 overlay portal。

## V2.BN.8.1 L8 Placement Interaction Session Hook Seed

```text
status: in progress
client build: passed
```

已完成部分：

- 新增 `hooks/useBlockPlacementInteractions.ts`。
- block move / resize 的 pointer session lifecycle 已从 `NoteCanvasRuntime.tsx` 迁出。
- `NoteCanvasRuntime.tsx` 不再直接拥有 `attachWindowPointerSession` 调用。
- drag / resize 仍通过 `interactionController.ts` 的 `calculateDraggedBlockLayouts` / `calculateResizedBlockLayouts` 执行核心布局计算。
- hook 边界显式接收 layout draft writer、history writer、persistence callback、measurement suppression refs 和 mode policy。

仍需验收：

- Browser smoke 验证拖动 block 的 snap / elastic avoidance 手感是否保持。
- Browser smoke 验证 resize block 后下方 block 是否仍能稳定 reflow。
- Browser smoke 验证 Ctrl+Z / Ctrl+Y 对 move / resize 的撤回重做是否仍然有效。
- 后续 L8 仍需继续迁出 blank click / selection / draft creation / mode transitions 等 interaction controller 行为。

## V2.BN.8.1 L3 Content Width Hook Seed

```text
status: in progress
client build: passed
```

已完成部分：

- 新增 `hooks/useCanvasContentWidth.ts`。
- `NoteCanvasRuntime.tsx` 不再直接维护 content width state。
- `ResizeObserver`、`window.resize` 监听和 Page/Canvas mode 下的 available width 计算已迁入 hook。
- `canvasEngine/index.ts` 导出 `useCanvasContentWidth`，作为后续 viewport hook / viewport service 继续收口的入口之一。

仍需验收：

- Browser smoke 验证 sidebar 收起 / 展开后 Page mode 宽度是否仍然正确。
- Browser smoke 验证 Canvas mode 下 workspace 宽度是否仍然按 PageFrame offset 正常计算。
- 后续 L3 仍需把真实 viewport state、pan / zoom、world-screen transform 和 overlay anchor 统一起来；本次只迁出 content width observer。

## 负责什么

本文负责 V2.BN.8 / V2.BN.8.x 的工程质量 review：

- 当前实现状态；
- 已完成验证；
- 失败和风险；
- benchmark 结果；
- fallback trigger；
- Henry 必须拍板事项。

## 不负责什么

- 不替代 `Experience-Review.md`；
- 不替代 `CHANGELOG.md`；
- 不替代 acceptance。

## 当前状态

```text
Status: Research / route lock completed; first engine seed implemented
Code implementation: Minimal Canvas Engine model and NoteDetail bridge added
Canvas Engine branch: codex/v2-bn-canvas-engine
Recommended route: Self-owned Minimal Hybrid NoteCanvas Engine
```

## Review Checklist

- [x] Clean branch status recorded；
- [x] Canvas Engine Research R0-R9/Summary completed；
- [x] Engineering Spec updated；
- [x] Architecture Spec updated；
- [x] Interaction Contract updated；
- [x] State/Data Contract updated；
- [x] Spike/Benchmark Plan updated；
- [x] Fallback Strategy updated；
- [x] First Canvas Engine seed implemented；
- [x] Client build completed；
- [ ] Browser smoke completed when needed；
- [ ] Benchmark completed when needed；
- [x] Experience Review updated；
- [x] CHANGELOG updated；
- [ ] Document promotion / merge review completed at release close。

## 验证记录

```text
client build: passed
server build: passed
git diff --check: passed with CRLF conversion warnings only
changed-file secret scan: passed
browser smoke: blocked
  - browser-harness: Chrome remote debugging Allow prompt not accepted
  - bundled Playwright fallback: playwright-core package missing from runtime bundle
benchmark: not run yet
```

本次 browser-harness 连接 Chrome 时被 remote debugging 握手卡住，需要 Henry 在 Chrome 提示中允许远程调试后重试。随后尝试 bundled Playwright fallback，但本地 bundled runtime 中 `playwright` 缺少 `playwright-core`，无法启动。没有把浏览器验证伪装成通过。

## V2.BN.8.1 Runtime Replacement Progress

### L0 - Startup Gate And Baseline

```text
status: completed
branch: codex/v2-bn-canvas-engine
baseline commit before replacement work: 150fd28
client build: passed
server build: passed
```

L0 结论：

- 当前 branch 正确；
- `V2.BN.8` 局部文档区完整；
- `Open-Issue-And-Brainstorm-Checklist.md` 已经能作为 V2.BN.8.1 验收输入；
- `NoteDetail.tsx` 仍然承担旧 runtime 主体职责，包括 layout、measurement、selection、drag/resize、slash anchor、preview/overlay、Page/Canvas mode；
- `canvasEngine/` 仍是 seed，不是真正 runtime root。

### L1 - Local Test Data Reset

```text
status: completed
backup location: .codex-tmp/local-db-backups/20260612-155215
users: 1
courses/projects: 1
notes: 1
note_blocks: 0
documents: 0
source_snapshots: 0
uploads: cleared
```

L1 结论：

- 已停止本地 `3001` dev server 后备份旧 `server/coincides.db*`；
- 已备份并清空本地 `server/uploads` 测试文件；
- 已删除旧 dev database 并通过 `initDb()` 重建 schema；
- 已创建本地 smoke 账户、Project 和 Note；
- 后续 V2.BN.8.1 smoke 应从干净 note 开始，避免旧 `better_notebook_layout` payload 干扰。

### L2 - Runtime Root

```text
status: in progress
client build: passed
```

L2 已完成部分：

- 新增 `client/src/pages/Notes/canvasEngine/NoteCanvasRuntime.tsx`；
- 新增 `client/src/pages/Notes/canvasEngine/NoteCanvasRuntimeProvider.tsx`；
- 新增 `client/src/pages/Notes/canvasEngine/hooks/useNoteCanvasRuntime.ts`；
- `NoteDetail.tsx` 已退化为薄 route shell：
  - 读取 `noteId` route param；
  - 注入 `NoteCanvasRuntimeProvider`；
  - 渲染 `NoteCanvasRuntime`。

L2 尚未完成部分：

- 新增 `hooks/useNoteCanvasDataAdapter.ts`；
- `NoteCanvasRuntime.tsx` 不再直接持有 note / blocks / template options / source anchors / block CRUD / title save 的 API state 和 API calls；
- `useNoteCanvasDataAdapter` 现在集中负责：
  - note / block loading；
  - runtime template options loading；
  - source anchor generation / loading；
  - title save；
  - create / save / convert / trash / reorder block；
  - block layout persistence；
  - source jump target loading。
- `NoteCanvasRuntime.tsx` 仍保留 route chrome、focus、draft、selection、placement draft、interaction state 和 canvas UI composition。

L2 仍需继续：

- data adapter 目前仍通过 callbacks 清理 runtime layout draft，后续可以用 provider/model boundary 继续收紧；
- `NoteCanvasRuntime.tsx` 仍然较胖，后续 L3-L11 需要继续迁出 viewport、measurement、interaction session 和 overlay state。

### L3 / L4 - Viewport, World, PageFrame And Workspace

```text
status: in progress
client build: passed
```

已完成部分：

- 新增 `viewportService.ts`：
  - `getPrimaryPageOffsetX(surfaceMode)`；
  - `createRuntimeViewport(surfaceMode, pageFrameHeight)`；
  - `createRuntimeWorld(surfaceMode, pageFrameHeight)`。
- 新增 `pageFrameService.ts`：
  - `createDefaultDraftLayout(...)`；
  - `calculatePageFrameHeight(...)`；
  - `createRuntimePageFrame(...)`。
- `NoteCanvasRuntime.tsx` 不再直接手写 viewport/world/PageFrame 构造。
- PageFrame 高度不再在 Canvas mode 下直接使用 `CANVAS_WORKSPACE_HEIGHT`。
- PageFrame 高度现在按正式页面内容计算：

```text
max(default page frame height, bottom-most in-frame block bottom + bottom padding)
```

仍需验收：

- Canvas mode 是否仍存在双滚动条；
- Canvas mode 是否保留 PageFrame boundary / margin；
- workspace block 是否不再撑高 formal PageFrame；
- sidebar 收起后 workspace 是否自动填充。

### L5 - Placement Service

```text
status: in progress
client build: passed
```

已完成部分：

- 新增 `placementService.ts`；
- 迁出 `NoteCanvasRuntime.tsx` 中的 placement 周边逻辑：
  - stored layout read；
  - workspace block 判断；
  - default block layout；
  - normalized block layout；
  - layout payload writer；
  - boundary kind；
  - export role / AI visibility effective state；
  - layout equality；
  - layout history entry；
  - stacked collision resolve；
  - measured-height reflow；
  - snap target / move snap。
- `placementService.ts` 使用泛型 `PlacementSeedBlock`，不直接绑定 `NoteBlock`，为后续 CanvasObject / image / shape placement 留入口。

仍需验收：

- 移动后 reload 位置是否保持；
- resize 后 reload 宽高是否保持；
- Page/Canvas 切换是否仍把 workspace block 夹回 PageFrame；
- snap on/off 是否只影响 placement 计算，不污染 content truth。

### L7 - Measurement And Reflow Service

```text
status: in progress
client build: passed
```

已完成部分：

- 新增 `measurementService.ts`；
- 新增 `hooks/useBlockMeasurement.ts`；
- 迁出第一批 measurement seed：
  - textarea auto-height；
  - DOM content height measurement；
  - text block estimated height。
- 迁出 measured height / resized layout -> placement reflow application：
  - `applyMeasuredBlockHeightToLayouts`；
  - `applyMeasuredBlockLayoutToLayouts`。
- `BlockEditorLayer.tsx` 不再直接拥有 `ResizeObserver` / measured rect callback wiring。
- `NoteCanvasRuntime.tsx` 仍保留 measured height 的 state entrypoint，但不再直接拼装 measured height reflow。

仍需验收：

- Formula input expanded/collapsed 是否触发稳定 measurement；
- Definition fields active/editing 是否稳定推开下方 block；
- resize width 后 text reflow 是否仍然稳定；
- measurement registry 尚未完成，当前仍是 service + hook seed，runtime 仍持有 React state update 入口。

### L6 - Block Projection Layer

```text
status: in progress
client build: passed
```

已完成部分：

- 新增 `blockContentService.ts`；
- 新增 `layers/BlockEditorLayer.tsx`；
- 新增 `runtimeDataTypes.ts`；
- 从 `NoteCanvasRuntime.tsx` 迁出第一批 block content truth / projection helper：
  - `FieldValueRecord`；
  - `BlockPresentationKind`；
  - structured field reader；
  - definition / formula field extraction；
  - definition / formula save payload builder；
  - plain text projection；
  - block presentation kind detection；
  - formula preview text wrapper。
- `BlockEditor` 组件本体已从 `NoteCanvasRuntime.tsx` 迁入 Canvas Engine DOM projection layer。
- `NoteCanvasRuntime.tsx` 现在只负责把 block 的 runtime state 和 callbacks 传给 `BlockEditorLayer`。
- 新增 `layers/BlockControlBarLayer.tsx`，把 block control bar 从 `BlockEditorLayer` 内联 JSX 中迁出。
- 新增 `layers/BlockSourceReferenceLayer.tsx`，把 source reference / source jump view entry 从 `BlockEditorLayer` 内联 JSX 中迁出。
- 新增 `layers/BlockStatusBadgeLayer.tsx`，把 block type / AI / export / boundary badges 从 `BlockEditorLayer` 内联 JSX 中迁出。
- 新增 `blocks/DefinitionBlockProjection.tsx`，把 Definition structured field editor / read projection 从 `BlockEditorLayer` 中迁出。
- 新增 `blocks/FormulaBlockProjection.tsx`，把 Formula preview / LaTeX input projection 从 `BlockEditorLayer` 中迁出。
- 新增 `blocks/TextBlockProjection.tsx`，把 paragraph / heading / quote textarea projection 从 `BlockEditorLayer` 中迁出。
- 新增 `blocks/CodeBlockProjection.tsx`，把 code snippet 从普通 text projection 中分离出来。
- 新增 `layers/BlockResizeHandleLayer.tsx`，把 resize handle 从 `BlockEditorLayer` 中迁出。
- Code block badge 已收敛为 `CODE`，并拥有独立代码背景、monospace 输入区和轻量行号 gutter。

仍需验收：

- `BlockEditorLayer` 内部仍包含 block shell 和 projection composition；
- 下一轮可以继续把 block shell / selected overlay anchor 边界拆出；
- 需要 browser smoke 验证 definition / formula / code / source badge 的表现没有回归。
- Code block 的行级复制 / 多行选择暂未实现，仍按后续 polish 处理。

### L9 - Overlay Layer Seed

```text
status: in progress
client build: passed
```

已完成部分：

- 新增 `layers/SlashMenuLayer.tsx`；
- 新增 `SlashMenuAnchor` runtime layout type；
- `NoteCanvasRuntime.tsx` 不再内联 `SlashMenu` 渲染函数；
- 新增 `overlayService.ts`；
- slash menu anchor 计算已从 `NoteCanvasRuntime.tsx` 迁入 overlay service；
- 主 runtime 只保留 slash trigger 和 command selection；
- slash menu rendering 进入 floating overlay layer seed；
- 新增 `exportPreviewService.ts`；
- 新增 `layers/ExportPreviewLayer.tsx`；
- export preview 的 model、row label、group rendering 已从 runtime 主文件迁出；
- `NoteCanvasRuntime.tsx` 现在只负责控制 preview 开关与 preview overlay callbacks。
- 新增 `layers/BlockControlBarLayer.tsx`；
- block control bar 已从 block projection 主体中迁出，后续可继续接入 selected block anchor / overlay portal。
- 新增 `layers/BlockSourceReferenceLayer.tsx`；
- source reference / source jump view entry 已从 block projection 主体中迁出，后续可继续接入统一 source jump overlay。

仍需验收：

- overlay portal / z-index service 尚未建立；
- block control bar 仍使用当前 block 内部定位样式，尚未完全 viewport overlay 化；
- source jump 仍只是 view entry 抽层，尚未完全 viewport overlay 化；
- note info、more actions、insert panel 等浮层尚未迁出；
- formula help tooltip 已由后续 checkpoint 迁入统一 overlay layer。

### L8 - Interaction Controller Seed

```text
status: in progress
client build: passed
```

已完成部分：

- 新增 `interactionController.ts`；
- 建立第一版 runtime interaction state：
  - `idle`；
  - `hoveringBlock`；
  - `selectedBlock`；
  - `editingText`；
  - `draggingBlock`；
  - `resizingBlock`；
  - `panningCanvas`；
  - `openingMenu`；
  - `previewing`。
- `NoteCanvasRuntime.tsx` 已开始在这些入口写入 interaction state：
  - block focus / select；
  - block drag start / drag end；
  - block resize start / resize end；
  - draft editing；
  - slash menu；
  - preview / note info / more actions / insert panel。
- canvas root 现在输出 debug data attributes：
  - `data-canvas-interaction-mode`；
  - `data-canvas-interaction-target`；
  - `data-canvas-interaction-block`。
- `interactionController.ts` 新增第一批 drag/resize layout calculation helpers：
  - `calculateDraggedBlockLayouts`；
  - `calculateResizedBlockLayouts`。
- `interactionController.ts` 新增 `attachWindowPointerSession`，集中管理 window pointermove / pointerup session lifecycle。
- `NoteCanvasRuntime.tsx` 不再内联 drag move / resize move 的 layout math，也不再直接 add/remove window pointer listeners。
- `NoteCanvasRuntime.tsx` 仍保留 begin move / begin resize 的 session orchestration、finish callbacks 和 React state entrypoint。

仍需验收：

- 后续需要继续把 begin move / begin resize session orchestration 和 blank click 的 controller 行为迁出；
- 需要 browser smoke 验证 pointer session helper 没有改变 drag / resize 手感；
- 需要 browser smoke 验证 interaction debug state 不影响现有手感。

### L10 - Page / Canvas Mode Policy Seed

```text
status: in progress
client build: passed
```

已完成部分：

- 新增 `modePolicyService.ts`；
- 集中处理第一批 Page/Canvas policy：
  - mode label / next mode label；
  - primary page offset；
  - Page mode 是否隐藏 workspace blocks；
  - Page mode 是否允许 page collision resolve；
  - elastic avoidance 触发条件；
  - blank double-click draft placement。
- `modePolicyService.ts` 新增 `createSurfaceModeTransitionPolicy()`；
- Page / Canvas 切换时关闭 overlay、清空 snap guide、清除 block selection 的 transient cleanup 规则现在由 mode policy 输出；
- `useSurfaceModeController()` 只执行 transition record，不再自行决定切换副作用；
- `visibleBlocks` 不再在 runtime 主文件里直接判断 `surfaceMode === 'page'`；
- 双击空白创建 block 的规则进入 mode policy：

```text
snap on + Page mode -> 使用自然写作流的 default draft layout
snap off 或 Canvas mode -> 使用双击位置创建 draft
```

仍需验收：

- Canvas mode 的全局 scroll / workspace fill / PageFrame boundary 仍需要浏览器验证；
- mode policy 还没有接管完整 pan / zoom / viewport scroll 行为；
- Page mode 和 Canvas mode 的 toolbar / shell CSS 仍在主 runtime JSX 内。

### L11 - State Persistence And Undo Boundary Seed

```text
status: in progress
client build: passed
```

已完成部分：

- 新增 `hooks/usePlacementHistory.ts`；
- 新增 `historyService.ts`；
- `NoteCanvasRuntime.tsx` 不再直接持有 placement undo / redo refs；
- `NoteCanvasRuntime.tsx` 不再直接注册 Ctrl+Z / Ctrl+Y keyboard listener；
- Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z 的按键意图判断已迁入 `getRuntimeHistoryKeyboardIntent()`；
- `usePlacementHistory` 现在集中负责：
  - move / resize 前后 layout snapshot 生成；
  - undo stack；
  - redo stack；
  - Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z；
  - 避开 input / textarea / select / contenteditable 内部输入时的快捷键冲突。
- `NoteCanvasRuntime.tsx` 仍提供：
  - `applyLayoutDrafts`；
  - `persistLayoutSnapshot`；
  - move / resize 完成时调用 `pushLayoutHistory`。

仍需验收：

- 需要 browser smoke 验证 move / resize 后 Ctrl+Z / Ctrl+Y 仍然稳定；
- create block / delete empty draft / convert block type 的 undo 仍未进入 L11；
- placement history 仍通过 runtime callback 持久化，后续可以进一步迁入 placement writer boundary。

## V2.BN.8.1 World Overlay Anchor Seed

```text
status: in progress
scope: L9 Floating Overlay Layer
browser smoke: deferred by Henry until all replacement work is complete
```

已完成部分：

- `overlayService.ts` 新增 normalized viewport anchor record；
- `overlayService.ts` 新增 world rect 到 viewport rect 的转换 seed；
- `placeAnchoredOverlay()` 可以从 anchor record 进入 shared viewport placement helper；
- `getSlashMenuAnchor()`、`getBlockControlAnchor()`、`getTooltipAnchor()` 已迁入 normalized anchor record 调用路径；
- 该 seed 复用 `geometry.ts` 中已有的 `worldToScreen()`，没有引入第二套坐标数学。

工程判断：

- 这是 L9 的底层接缝，不改变现有 overlay 视觉行为；
- 当前 slash menu、block control bar、Formula help tooltip 的 anchor record 仍可由 DOM rect fallback 生成；
- 后续 pan/zoom、virtualization、relation endpoint、canvas object overlay 应逐步迁移到 anchor record，而不是在组件内硬算位置。

仍需验收：

- 需要后续 Browser smoke 验证 pan/zoom seed 后 overlay 是否跟随对象；
- 需要后续决定 caret anchor 是否也进入 world/caret anchor record，而不是只用 textarea mirror rect；
- 需要继续完成完整 collision / flip / clamp service。

## Henry Must Decide

- 是否确认第一版主路线为 self-owned minimal hybrid NoteCanvas Engine；
- PageFrame 外 workspace block 是否第一版就允许真实创建和保存；
- V2.BN.8.1 是否接受先以 engine shell 稳定为第一优先级，视觉细节随后补齐；
- 如果自研 Canvas Engine 失败，是否先回退有限大画布，还是重新评估 BlockSuite / tldraw 局部接入。

## 同步规则

- 每个小版本收口时更新本文。
- Benchmark 或 browser smoke 失败时更新本文。
- 工程风险变成体验风险时同步 `Experience-Review.md`。
- 路线风险触发时同步 `Canvas-Engine-Fallback-Strategy.md`。

## V2.BN.8.1 Non-Browser Verification Refresh - 2026-06-13

```text
status: passed for non-browser gates
scope: current codex/v2-bn-canvas-engine branch
browser harness: intentionally deferred until all replacement work is ready for one combined pass
Henry manual pass: still required
```

本轮只刷新非浏览器证据，不运行 Browser Harness。

已通过：

- `npm run build:client`；
- `npm run smoke:canvas-engine-performance`；
- `server/npm run build`；
- `git diff --check`；
- changed-file secret scan：当前没有 changed/untracked files，因此没有可扫描的新增文件。

当前工程判断：

- `client/src/pages/Notes/NoteDetail.tsx` 仍然只是 route/provider shell；
- `NoteCanvasRuntime.tsx` 仍然是 Note 页面 runtime host；
- `useNoteCanvasRuntimeController()` 继续只组合 surface state、document data、layout model、block operations、presentation boundary controller；
- 本轮没有新增产品代码改动，也没有发现新的非浏览器工程红灯。

未完成项保持不变：

- 最终 Browser Harness smoke；
- Henry 手动视觉/交互验收；
- `Open-Issue-And-Brainstorm-Checklist.md` 中被保留为后续 polish / patch backlog 的项目。

## V2.BN.8.1 Layer Acceptance Audit - 2026-06-13

新增逐层审计文档：

- `docs/releases/V2.BN.8/V2.BN.8.1-Layer-Acceptance-Audit.md`

审计结论：

- L0-L12 的代码替换证据已经逐层记录；
- L1 local test data reset 没有在本轮执行，因为这是破坏性操作，应在 Henry 确认后或最终测试被旧数据污染时再做；
- `NoteDetail.tsx` shell、Canvas Engine runtime root、runtime controller composition boundary、非浏览器 gates 均已有证据；
- Browser Harness smoke 和 Henry manual pass 仍是最终硬门槛；
- 未勾选的 formula / inline math / structured block / code block / ruler 等条目被归入后续 `V2.BN.8.x` polish backlog，不再混同为当前 runtime replacement 的硬阻塞。

## V2.BN.8.1 Final Smoke Protocol - 2026-06-13

新增最终验收协议：

- `docs/releases/V2.BN.8/V2.BN.8.1-Final-Smoke-Protocol.md`

协议用途：

- 固定最终 Browser Harness smoke 的检查范围；
- 固定 Henry manual pass 的验收口径；
- 明确 local test data reset 不是默认动作，必须由 Henry 决定或由旧数据污染触发；
- 明确哪些 polish backlog 不阻塞 `V2.BN.8.1`；
- 明确只有 Browser Harness smoke 和 Henry manual pass 都完成后，才能关闭本目标。

## V2.BN.8.1 Final Browser Harness Retry - 2026-06-13

```text
status: blocked
branch: codex/v2-bn-canvas-engine
client port: 5173 listening
server port: 3001 listening
worktree: clean before retry
command: browser-harness page_info()
```

结果：

- Browser Harness 仍无法完成 CDP websocket handshake；
- 错误指向 Chrome remote debugging authorization；
- 浏览器真实 smoke 未执行；
- Henry manual pass 仍未开始；
- 因此 `V2.BN.8.1` 不能标记 complete。

关键错误：

```text
fatal: CDP WS handshake failed: timed out during opening handshake -- click Allow in Chrome if prompted, then retry
```

下一步需要 Henry 在 Chrome 中打开：

```text
chrome://inspect/#remote-debugging
```

勾选 `Allow remote debugging for this browser instance`，并在弹窗中点击 `Allow`。之后再按 `V2.BN.8.1-Final-Smoke-Protocol.md` 重跑最终 Browser Harness smoke。

## V2.BN.8.1 Deferred Browser Smoke Recheck - 2026-06-13

```text
status: non-browser gates passed again
browser harness: intentionally deferred by Henry until all remaining work is done
branch: codex/v2-bn-canvas-engine
worktree: clean before and after recheck
```

本轮不运行 Browser Harness。Henry 已明确要求先不要用 Browser Harness 做中途测试，等全部做完后再统一补跑。

重新验证通过：

- `npm run build:client`；
- `npm run build`；
- `npm run smoke:canvas-engine-performance`；
- `git diff --check`；
- `NoteDetail.tsx` 仍然只是 route/provider shell；
- 旧 runtime 符号没有回流到 `NoteDetail.tsx`。

本轮没有新增产品代码改动。`V2.BN.8.1` 仍不能关闭，因为最终 Browser Harness smoke 和 Henry manual pass 仍是硬门槛。

## V2.BN.8.1 Runtime Boundary Check Script - 2026-06-13

```text
status: passed
command: npm run check:canvas-runtime-boundary
browser harness: not used
```

新增可重复运行的非浏览器边界检查：

- root script：`npm run check:canvas-runtime-boundary`；
- client script：`npm run check:canvas-runtime-boundary`；
- checker file：`client/scripts/canvasRuntimeBoundaryCheck.mjs`。

它验证：

- `NoteDetail.tsx` 仍然只导入 route/runtime shell 必需内容；
- `NoteDetail.tsx` 不包含旧 runtime 符号；
- `NoteCanvasRuntime.tsx` 仍然只是 runtime host；
- `NoteCanvasRuntime.tsx` 不重新持有 block layer、slash menu、preview layer、ResizeObserver、pointer listener 等实现细节；
- `useNoteCanvasRuntimeController()` 只组合一级 runtime controllers；
- runtime type contract 暴露 viewport、placement、canvas object reserve、relation endpoint reserve；
- engine model / viewport service / PageFrame service / placement service / measurement service / mode policy service / history service 的核心入口存在；
- 必要 runtime layer / block projection 文件存在；
- writing surface 暴露 Browser smoke 所需的 `data-canvas-*` debug attributes。

本轮重新验证通过：

- `npm run check:canvas-runtime-boundary`；
- `npm run build:client`；
- `npm run build`；
- `npm run smoke:canvas-engine-performance`。

该脚本只证明源码边界，没有证明真实浏览器交互体验。最终 Browser Harness smoke 和 Henry manual pass 仍然必须执行。

2026-06-13 refresh：该脚本已从 18 项检查扩展到 26 项检查，新增覆盖 L3/L4/L5/L7/L10/L11 的服务边界。

## V2.BN.8.1 Non-Browser Gate Aggregator - 2026-06-13

```text
status: passed
command: npm run verify:v2-bn8-runtime
browser harness: not used
```

新增 root 级聚合验收命令：

```text
npm run verify:v2-bn8-runtime
```

它按顺序执行：

- `npm run check:canvas-runtime-boundary`；
- `npm run build:client`；
- `npm run build`；
- `npm run smoke:canvas-engine-performance`；
- `git diff --check`。

该命令用于最终 Browser Harness 前的非浏览器 gate，避免遗漏 runtime boundary、client build、server build 或 performance seed 中任一项。

本命令已通过。它不替代最终 Browser Harness smoke，也不替代 Henry manual pass。

## V2.BN.8.1 Diff Hygiene In Aggregator - 2026-06-13

```text
status: passed
command: npm run verify:v2-bn8-runtime
browser harness: not used
```

`npm run verify:v2-bn8-runtime` 现在也包含 `git diff --check`，因此最终 Browser Harness 前的非浏览器 gate 会同时覆盖：

- Canvas runtime boundary；
- client build；
- server build；
- Canvas Engine performance seed；
- diff whitespace / conflict-marker hygiene。

当时 changed-file secret scan 仍保留为单独检查；后续已通过 `npm run check:changed-file-secrets` 脚本化，并纳入 `npm run verify:v2-bn8-runtime`。

## V2.BN.8.1 Changed-File Secret Scan Script - 2026-06-13

```text
status: passed
command: npm run check:changed-file-secrets
browser harness: not used
```

新增 root 级 changed-file secret scan：

```text
npm run check:changed-file-secrets
```

它只扫描当前 changed / staged / untracked files，并跳过二进制或超大文件，避免把整个仓库历史资料扫成噪声。

随后已将该检查纳入：

```text
npm run verify:v2-bn8-runtime
```

因此最终 Browser Harness 前的非浏览器 gate 现在覆盖：

- Canvas runtime boundary；
- Canvas Engine model contract；
- client build；
- server build；
- Canvas Engine performance seed；
- `git diff --check`；
- changed-file secret scan。

该命令已通过。它仍不替代最终 Browser Harness smoke 和 Henry manual pass。

## V2.BN.8.1 Canvas Engine Model Contract Check - 2026-06-13

```text
status: passed
command: npm run smoke:canvas-engine-model-contract
browser harness: not used
```

新增纯逻辑模型合同 smoke：

- viewport and world seed；
- PageFrame and workspace policy；
- placement and runtime model；
- measurement mode and history。

该检查直接执行 Canvas Engine service 函数，验证 Page mode / Canvas mode visibility、PageFrame height、workspace placement、relation endpoint reserve、measurement reflow、elastic avoidance policy、Ctrl+Z / Ctrl+Y intent 等基础规则。

随后 `npm run verify:v2-bn8-runtime` 已纳入该检查。它不替代 Browser Harness，也不替代 Henry manual pass。

## V2.BN.8.1 Shared Type Runtime Import Build Fix - 2026-06-13

```text
status: passed
command: npm run verify:v2-bn8-runtime
browser harness: not used
```

聚合验证首次复跑时，client production build 暴露 `@shared/types` runtime import 解析问题：Vite 会优先看到本地生成的 `shared/types/index.js`，导致 enum / default export 在 Rollup 阶段不可用。

修补内容：

- `client/vite.config.ts` 为 `@shared/types` 添加精确 TS 源别名；
- `DailyBrief` 不再把 `EnergyLevel` 作为运行时 enum 导入；
- `CourseDetail`、`BlockEditorLayer`、`templateOptions` 不再 default import `@shared/types`。

修补后 `npm run verify:v2-bn8-runtime` passed。该结果仍不替代最终 Browser Harness smoke 和 Henry manual pass。

## V2.BN.8.1 Browser Harness Smoke - 2026-06-13

```text
status: passed
tool: Browser Harness
target: http://localhost:5173/#/notes/85f33834-3d27-4b5d-b86e-92837e83ae27
henry manual pass: pending
```

Browser Harness 覆盖：

- Project 页进入 existing note；
- Note 页 runtime smoke attributes 存在：
  - `data-canvas-engine-version=V2.BN.8-self-owned-minimal-hybrid-0`；
  - `data-canvas-engine-route=self_owned_minimal_hybrid`；
  - `data-canvas-surface-mode=page`；
- Page mode -> Canvas mode -> Page mode 往返；
- Preview 打开/关闭；
- Layout 按钮点击不触发前端异常。

本次 Browser Harness 首次发现 Page -> Canvas 切换会触发白屏。错误监听捕获：

```text
Maximum update depth exceeded
useBlockMeasurement -> useMeasuredBlockReflowController -> useLayoutDraftController
```

修复方式：`useBlockMeasurement` 记录上一次上报的 measured height；高度没有实质变化时，不再重复触发 `onMeasuredHeight`，避免 layout draft 写入循环。

修复后重新执行 Browser Harness smoke，错误监听为空，Page/Canvas 往返通过。

该 smoke 证明浏览器内基础 runtime 路径可用；最终阶段通过仍需要 Henry manual pass。
