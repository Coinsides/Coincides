# Coincides v2.3.0 Changelog

## Source Snapshot Foundation

### Added

- Added source snapshot storage with `source_snapshots` and `source_snapshot_pages`.
- Added text-first snapshot generation from existing parsed documents and chunks.
- Added source snapshot list, generate, detail, and pages APIs.
- Added a Course Detail Source Snapshots panel with a minimal text viewer.

### Changed

- Course Detail now exposes source inspection next to material/proposal work.
- v2 tests now include source snapshot migration, generation, idempotency, warning, and scoping coverage.

### Scope notes

- No PDF visual rendering.
- No SourceAnchor or jump-back.
- No source range selection.
- No Source Board or Canvas.

### Verification

- `server npm.cmd run test:v2` passed.
- `server npm.cmd run build` passed.
- `client npm.cmd run build` passed.
- `git diff --check` passed.
- Changed-file secret scan passed.

### Release decision

- Henry v2.3.0 acceptance pending.
