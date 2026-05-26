# CHANGELOG v2.4.1 - Canvas Engine Gate + Basic Canvas Viewer / Editor

**Created**: 2026-05-23
**Updated**: 2026-05-23
**Status**: Implemented / pending Henry v2.4.x batch acceptance

---

## Summary

v2.4.1 upgrades the Learning Canvas from a static A4 preview into a basic interactive canvas viewer/editor.

## Added

- Added v2.4.1 release plan, engineering spec, quality review, and experience review.
- Added local interactive canvas fallback surface.
- Added pan, zoom, select, move, resize, and reset view behavior.
- Added selected object scope display for future AI command work.

## Changed

- Replaced the static Canvas Document preview with a movable/resizable canvas node surface.
- Canvas node layout now persists through existing `canvas_nodes`.
- Canvas viewport now persists through existing `canvas_viewport_states`.
- Recorded tldraw as preferred future adapter candidate but did not adopt it in this patch.

## Verified

- v2 server tests passed.
- server build passed.
- client build passed.
- `git diff --check` passed.
- changed-file secret scan passed.

## Open

- Henry v2.4.x batch acceptance.
- Dedicated tldraw adapter spike after license/key/dependency decision.
- v2.4.2 template-aware block insertion on canvas.
- v2.4.4 CanvasEdge / ObjectRelation / RelationLayer.
