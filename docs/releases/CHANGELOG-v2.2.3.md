# Coincides v2.2.3 Changelog

## Role-aware Reconciliation

### Added

- Added deterministic learning-role hints for material reconciliation candidate groups.
- Added template candidate hints using the v2.1.1 NoteBlock template registry.
- Added safety-blocked proposal metadata for active exclusions and open conflicts.
- Added Course Detail display for role/template/safety hints.

### Changed

- Accepted EvidenceSets now preserve role-aware proposal metadata.
- Reconciliation exclusion/conflict metadata now stores source evidence scope ids for future safety matching.

### Scope notes

- No canonical NoteBlocks.
- No automatic truth resolution.
- No source deletion or destructive hiding.
- No Source Viewer, Source Board, or Canvas.

### Verification

- `server npm.cmd run test:v2`: PASS, 27 tests.
- `server npm.cmd run build`: PASS.
- `client npm.cmd run build`: PASS.
- `git diff --check`: PASS.
- Changed-file secret scan: PASS.

### Release decision

- Henry v2.2.x batch acceptance pending.
