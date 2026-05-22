# Coincides v2.2.1 Changelog

## Evidence Set + Conservative Merge Apply

### Added

- Added additive reconciliation evidence tables:
  - `evidence_sets`
  - `evidence_items`
  - `material_reconciliation_decisions`
- Added group-level reconciliation decisions:
  - `accepted_evidence_set`
  - `kept_separate`
  - `deferred`
- Added conservative apply behavior for `material_reconciliation` proposals.
- Added Course Detail controls for choosing reconciliation group actions.

### Changed

- `POST /api/proposals/:id/apply` now accepts optional reconciliation `group_decisions`.
- Empty reconciliation apply remains review-shell-only for v2.2.0 compatibility.
- Accepted evidence groups persist source evidence membership without creating canonical NoteBlocks.

### Scope notes

- No canonical NoteBlocks.
- No source deletion or hiding.
- No note rewrite.
- No recovery/unmerge yet.
- No Source Viewer, Source Board, or Canvas.

### Verification

- `server npm.cmd run test:v2`: PASS, 21 tests.
- `server npm.cmd run build`: PASS.
- `client npm.cmd run build`: PASS.
- `git diff --check`: PASS.
- Changed-file secret scan: PASS.

### Release decision

- Pending Henry release/hold decision.
