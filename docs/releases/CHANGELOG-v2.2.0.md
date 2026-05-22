# Coincides v2.2.0 Changelog

## Material Reconciliation Proposal Shell - Pending Henry Validation

### Changed

- Added first review-only `material_reconciliation` proposal shell.
- Added candidate groups for duplicate, overlap, same-concept evidence, and conflict review.
- Added deterministic first-pass grouping over existing course material fragments.
- Added Course Detail entry point for reconciliation proposals.
- Added review-only apply behavior that records review without merging source material.

### Scope notes

- No real merge apply.
- No persistent EvidenceSet.
- No exclusion/conflict recovery.
- No Source Viewer.
- No Source Board.
- No Canvas.
- No external dependencies.

### Verification

- `server npm run test:v2`: PASS, 18 tests.
- `server npm run build`: PASS.
- `client npm run build`: PASS.
- `git diff --check`: PASS.
- Changed-file secret scan: PASS.
- Browser smoke: pending Henry local validation; Codex environment blocked temporary background-server launch.

### Release decision

- Pending Henry release/hold decision.
