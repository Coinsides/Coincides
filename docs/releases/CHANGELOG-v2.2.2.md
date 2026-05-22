# Coincides v2.2.2 Changelog

## Exclusion / Conflict / Recovery

### Added

- Added reversible exclusion records for reconciliation candidates.
- Added conflict review records.
- Added recovery event audit trail.
- Extended reconciliation apply with `excluded` and `mark_conflict`.
- Added reconciliation safety API routes.
- Added Course Detail safety summary and restore/resolve/reopen actions.

### Changed

- Reconciliation proposal review now supports five decisions:
  - `accepted_evidence_set`
  - `kept_separate`
  - `deferred`
  - `excluded`
  - `mark_conflict`

### Scope notes

- No canonical NoteBlocks.
- No source deletion or destructive hiding.
- No note rewrite.
- No Source Viewer, Source Board, or Canvas.

### Verification

- `server npm.cmd run test:v2`: PASS, 24 tests.
- `server npm.cmd run build`: PASS.
- `client npm.cmd run build`: PASS.
- `git diff --check`: PASS.
- Changed-file secret scan: PASS.

### Release decision

- Henry v2.2.x batch acceptance pending.
