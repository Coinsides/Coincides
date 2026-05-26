# CHANGELOG v2.4.3

**Version**: v2.4.3
**Status**: Engineering complete / Henry v2.4.x batch acceptance pending
**Date**: 2026-05-23

---

## Summary

v2.4.3 adds proposal-first Canvas Layout planning.

---

## Added

- Added `canvas_layout` proposal creation through `POST /api/proposals/canvas-layout`.
- Added deterministic A4/page-first canvas layout planning.
- Added layout-only apply behavior for `canvas_nodes`, `canvas_frames`, and canvas projection metadata.
- Added Course Detail `Plan layout` action and proposal review preview.
- Added canvas preview overlays for planned frames and node placements.

## Changed

- Extended proposal apply to support `canvas_layout`.
- Updated Canvas Document UI so selected Source Board / Source Scope inputs can feed a layout proposal.
- Updated v2 tests with canvas layout safety coverage.

## Verified

- `server npm.cmd run test:v2` passed 56/56 tests.
- `server npm.cmd run build` passed.
- `client npm.cmd run build` passed.
- `git diff --check` passed.
- Changed-file secret scan passed.

## Follow-ups

- CanvasEdge / ObjectRelation / RelationLayer remain deferred to v2.4.4+.
- Real AI provider layout planning remains deferred.
- Henry v2.4.x subjective batch acceptance remains pending.
