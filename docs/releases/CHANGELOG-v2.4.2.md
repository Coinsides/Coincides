# CHANGELOG v2.4.2

**Version**: v2.4.2
**Status**: Implemented - pending Henry v2.4.x batch acceptance
**Date**: 2026-05-23

---

## Summary

v2.4.2 adds template-aware NoteBlock insertion directly from the Canvas Document surface.

---

## Added

- Added `POST /api/canvases/:id/note-blocks` for canvas-side semantic NoteBlock creation.
- Added canvas backing note creation/reuse for canvas-created NoteBlocks.
- Added template-aware NoteBlock metadata writes from canvas insertion.
- Added CanvasNode projection creation for newly inserted NoteBlocks.
- Added an Add block panel to the Canvas Document surface.
- Added v2 tests for creation, backing note reuse, template metadata, projection, and invalid-template rollback.

## Changed

- Canvas node validation now treats `note_block` as a validated target type.
- v2.4.2 records the boundary between `NoteBlock`, `CanvasShape`, `CanvasEdge`, and `ObjectRelation`.
- Improved the Canvas Document `Add board nodes` state so already-seeded boards show `Board nodes added` instead of a confusing zero-count success message.

## Verified

- `server npm.cmd run test:v2` - passed, 54 tests.
- `server npm.cmd run build` - passed.
- `client npm.cmd run build` - passed.
- `git diff --check` - passed.
- changed-file secret scan - passed.

## Follow-ups

- CanvasShape, CanvasEdge, ObjectRelation, and RelationLayer remain deferred to later v2.4.x work.
- Henry v2.4.x subjective batch acceptance remains pending.
