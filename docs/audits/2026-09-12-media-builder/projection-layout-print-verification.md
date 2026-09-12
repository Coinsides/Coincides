# Media projection, layout and print verification

Synthetic unit fixtures only; no database, browser upload, Git command, environment secret read, or security test.

`COINCIDES_VALIDATION_ENV_DIR` was set to `.tmp/media-builder/empty-env` for Vitest.

Command: `npm.cmd run test:unit -- src/pages/Notes/canvasEngine/blocks/MediaBlockProjection.test.tsx src/pages/Notes/canvasEngine/mediaBlockLayout.test.ts src/pages/Notes/canvasEngine/hooks/usePageFrameWalls.test.tsx src/pages/Notes/canvasEngine/layers/BlockEditorLayer.test.tsx src/pages/Notes/canvasEngine/layers/NotePrintLayer.test.tsx src/pages/Notes/canvasEngine/layers/ExportPreviewLayer.media.test.tsx`

Result: **6 files, 59 tests passed**. This includes 10 new tests: media projection 4, geometry 2, export preview 1, BlockEditor dispatch 1, wall clamp/history 1, print placeholder 1.

- Projection: loading, accessible image/alt, loading failure, image decode failure, malformed metadata, late response disposal, asset replacement disposal, unmount disposal.
- Geometry: a 120 × 6 media block remains 120 × 6; a 60 × 3 draft remains 60 × 3. Stored media height wins over text estimates; absent height derives from natural dimensions. Manual media does not participate in auto width or TextFlow navigation.
- Editor: media has no text editor, no text-unit insertion action, and no DOM text-height measurement callback. Selection and the existing Move block handle work.
- Wall/history: a media block at x=360, width=400, height=20 clamps to x=200 under a 600-wide content area in the wall transaction; one undo restores exact block bytes and redo reapplies the clamp.
- Print: beforeprint renders an alt-labelled placeholder at the 400 × 20 block rect without requesting the asset blob. Export preview uses the same placeholder with its stored/resolved rectangle.

`node node_modules/typescript/bin/tsc -b --pretty false` completed with exit 0 in `client`.

These tests validate React handlers and geometry in jsdom. Native browser rendering, pointer drag, and the isolated database lifecycle are covered by the parent builder's smoke evidence.

Follow-up: the precursor hides the media resize handle because the inherited text-width gesture does not preserve image aspect ratio. Existing Move block remains available. A further geometry test proves a 20 × 10 image survives both normalizers below the 36px text minimum width. Rerun: media geometry 3 + BlockEditor 17 = **20 tests passed**. The projection/layout/print additions now comprise **11 new tests**, with **60 total tests** across the six targeted files.
