> **Status**: evidence - continuation source accounting; not a Git diff

# 13.6 continuation numstat

Baseline: `.tmp/purge-resume-baseline.json`, a snapshot of **973 files captured AFTER batch 1 and BEFORE this continuation**. These numbers describe only that snapshot to the inspected source state. **They are not a Git diff and must not be added to batch 1 counts and presented as the final net diff for the whole order.** Repeated edits to the same lines make separate LCS counts non-additive.

Scope: `client/src`, `client/scripts`, `server/src`, `server/scripts`, `shared`, `scripts`. Includes every snapshot source file and new source files in these exact roots. Excludes node_modules, dist, .tmp, .git, docs, tsbuildinfo, and extensions outside the snapshot inventory. No .git access, Git invocation, credential scanning, or security tests.

Method: exact line LCS after CRLF-to-LF normalization; the final split artifact created by a terminal newline is ignored. Added/deleted files are compared with empty text. JSON records all 973 files, including unchanged ones, with before/after line counts, LCS length and SHA-256 hashes. Source hashes and inventory were rechecked after calculation to detect concurrent source edits.

Captured at: `2026-09-12T18:42:46.763Z`. Baseline SHA-256: `73490fb990695d45986bf5b2c399c8adfa93307e7de5297ead583e5c702782c1`.

| File | Status | Added | Removed |
|---|---|---:|---:|
| `client/scripts/canvasEngineModelContractCheck.ts` | modified | 49 | 64 |
| `client/scripts/canvasRuntimeBoundaryCheck.mjs` | modified | 186 | 243 |
| `client/src/pages/Notes/NoteDetail.module.css` | modified | 1 | 604 |
| `client/src/pages/Notes/canvasEngine/NoteCanvasRuntime.tsx` | modified | 1 | 2 |
| `client/src/pages/Notes/canvasEngine/canvasRetirementPolicy.test.tsx` | modified | 5 | 10 |
| `client/src/pages/Notes/canvasEngine/engineModel.ts` | modified | 0 | 42 |
| `client/src/pages/Notes/canvasEngine/hooks/useCanvasSurfacePointerController.test.tsx` | modified | 1 | 3 |
| `client/src/pages/Notes/canvasEngine/hooks/useCanvasSurfacePointerController.ts` | modified | 1 | 1 |
| `client/src/pages/Notes/canvasEngine/hooks/useNoteCanvasLayerProps.ts` | modified | 0 | 20 |
| `client/src/pages/Notes/canvasEngine/hooks/useNoteCanvasLayoutModel.affiliationVisibility.test.tsx` | modified | 1 | 0 |
| `client/src/pages/Notes/canvasEngine/hooks/useNoteCanvasLayoutModel.ts` | modified | 0 | 1 |
| `client/src/pages/Notes/canvasEngine/hooks/useNoteCanvasRuntimeController.test.tsx` | modified | 22 | 83 |
| `client/src/pages/Notes/canvasEngine/hooks/useNoteCanvasRuntimeController.ts` | modified | 0 | 28 |
| `client/src/pages/Notes/canvasEngine/hooks/useRuntimeNaturalWritingController.ts` | modified | 0 | 22 |
| `client/src/pages/Notes/canvasEngine/hooks/useRuntimePresentationController.ts` | modified | 0 | 42 |
| `client/src/pages/Notes/canvasEngine/hooks/useRuntimeSurfaceStateController.pageReading.test.tsx` | modified | 4 | 4 |
| `client/src/pages/Notes/canvasEngine/hooks/useRuntimeSurfaceStateController.ts` | modified | 9 | 29 |
| `client/src/pages/Notes/canvasEngine/hooks/useSurfaceModeController.test.tsx` | modified | 11 | 154 |
| `client/src/pages/Notes/canvasEngine/hooks/useSurfaceModeController.ts` | modified | 5 | 112 |
| `client/src/pages/Notes/canvasEngine/hooks/useViewportTransformController.ts` | modified | 0 | 59 |
| `client/src/pages/Notes/canvasEngine/imageObjectService.ts` | modified | 1 | 1 |
| `client/src/pages/Notes/canvasEngine/layers/ImageObjectLayer.tsx` | removed | 0 | 168 |
| `client/src/pages/Notes/canvasEngine/layers/NoteChromeLayer.test.tsx` | modified | 0 | 1 |
| `client/src/pages/Notes/canvasEngine/layers/NoteChromeLayer.tsx` | modified | 0 | 2 |
| `client/src/pages/Notes/canvasEngine/layers/NoteRuntimeDocumentLayer.test.tsx` | modified | 3 | 32 |
| `client/src/pages/Notes/canvasEngine/layers/NoteWritingSurfaceLayer.tsx` | modified | 26 | 2519 |
| `client/src/pages/Notes/canvasEngine/layers/ObjectInspectorLayer.tsx` | removed | 0 | 150 |
| `client/src/pages/Notes/canvasEngine/layers/ShapeObjectLayer.tsx` | removed | 0 | 245 |
| `client/src/pages/Notes/canvasEngine/layers/TableObjectLayer.tsx` | removed | 0 | 289 |
| `client/src/pages/Notes/canvasEngine/layers/VisualConnectorLayer.tsx` | removed | 0 | 95 |
| `client/src/pages/Notes/canvasEngine/layers/pageFrameAlignment.test.tsx` | modified | 6 | 28 |
| `client/src/pages/Notes/canvasEngine/layers/textFlowNavigation.surface.test.tsx` | modified | 21 | 32 |
| `client/src/pages/Notes/canvasEngine/modePolicyService.ts` | modified | 13 | 65 |
| `client/src/pages/Notes/canvasEngine/pageCenteringContract.test.ts` | modified | 2 | 3 |
| `client/src/pages/Notes/canvasEngine/placementService.ts` | modified | 4 | 12 |
| `client/src/pages/Notes/canvasEngine/shapeProjectionService.ts` | modified | 1 | 1 |
| `client/src/pages/Notes/canvasEngine/surfaceAuthorityContract.test.ts` | modified | 1 | 0 |
| `client/src/pages/Notes/canvasEngine/tableObjectService.ts` | modified | 1 | 1 |
| `client/src/pages/Notes/canvasEngine/textFlowBlockNavigation.test.tsx` | modified | 3 | 3 |
| `client/src/pages/Notes/canvasEngine/types.ts` | modified | 0 | 7 |
| `client/src/pages/Notes/canvasEngine/viewportService.ts` | modified | 6 | 45 |
| `server/src/__tests__/textFlowIdentityContract.test.ts` | modified | 0 | 1 |
| `server/src/__tests__/v13CanvasRetirement.test.ts` | modified | 20 | 0 |
| `server/src/__tests__/v2CanvasPersistenceCutover.test.ts` | modified | 52 | 36 |
| **Total 44 files** | | **456** | **5259** |

Continuation net lines: **-4803**. Modified files: 39; added files: 0; removed files: 5; unchanged files: 929.

## Protected safety files

Mechanical snapshot comparison only; HQ still owns the Git/secrets closing checks. Security-related filename/path classification covers **17 files, 0 changed**. This explicitly includes the Settings ProvidersSection credential test and provider/authentication files. Exact AST text comparison covers **4 safety-named test/describe blocks, 0 changed**. Result: **PASS**. Full classified paths, titles, and hashes are in the JSON. This finite classification does not claim to identify every implicit security behavior.
