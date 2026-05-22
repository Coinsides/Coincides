# Coincides v2.3.1 Changelog

## Source Anchor + Jump Back

### Added

- Added SourceAnchor storage with `source_anchors` and `source_anchor_links`.
- Added SourceAnchor generation from NoteBlock source references and EvidenceItems.
- Added source anchor list, generate, detail, jump-target, and refresh APIs.
- Added Note editor `View source` jump-back for anchored source references.

### Changed

- Note editor can now open a focused text-first source snapshot panel from source references.
- v2 tests now include SourceAnchor migration, generation, idempotency, jump target, refresh, warning, and scoping coverage.

### Scope notes

- No source range selection.
- No Source Board.
- No annotation editor.
- No PDF visual rendering.
- No Canvas.

### Verification

- `server npm.cmd run test:v2` passed.
- `server npm.cmd run build` passed.
- `client npm.cmd run build` passed.
- `git diff --check` passed.
- Changed-file secret scan passed.

### Release decision

- Henry v2.3.x batch acceptance pending.
