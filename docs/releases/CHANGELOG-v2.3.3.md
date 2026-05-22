# CHANGELOG v2.3.3 - Source Board Seed

**Status**: Engineering complete / Henry batch acceptance pending

## Added

- Added persistent `source_boards` and `source_board_nodes`.
- Added SourceBoard APIs for create, list, detail, update, archive, restore, seeding from SourceScopes, node updates, node archive/restore, and node jump targets.
- Added Course Detail Source Board panel for creating/selecting boards, adding selected SourceScopes, opening board nodes, and archiving nodes.
- Added optional `source_board_id` support to material map, organized note, and material reconciliation proposal creation.
- Added automated tests for multiple boards, idempotent seeding, non-mutating behavior, board node jump targets, proposal narrowing, archived board rejection, and empty-board fallback warnings.

## Changed

- Updated v2.x continuity so Source Board Seed remains part of deferred v2.3.x / v2.4-v2.5 batch acceptance.
- Updated proposal payloads to preserve `source_board_id` when board-scoped proposals are created.

## Verification

- `server npm.cmd run test:v2`: pass, 45 tests.
- `server npm.cmd run build`: pass.
- `client npm.cmd run build`: pass.
- `git diff --check`: pass.
- Changed-file secret scan: no literal secrets found.

## Notes

- Henry subjective acceptance remains deferred to later v2.3.x / v2.4-v2.5 batch testing.
- Real API key tests are deferred to a separate post-v2.3.3 provider test plan.
- Client build still reports existing Vite chunk-size / import warnings; they are not blocking v2.3.3.
