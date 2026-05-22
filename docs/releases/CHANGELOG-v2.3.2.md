# CHANGELOG v2.3.2 - Source Scope Selection

**Status**: Engineering complete / Henry batch acceptance pending

## Added

- Added SourceScope persistence with additive `source_scopes` schema.
- Added SourceScope APIs for create, list, detail, update, archive, restore, and jump target.
- Added Course Detail source snapshot page/page-range scope selection.
- Added active selected scopes list with open/jump and archive actions.
- Added optional `source_scope_ids` support to material map, organized note, and material reconciliation proposal creation.
- Added automated tests for scope creation, ownership validation, archive/restore, jump targets, non-mutating behavior, and proposal narrowing.

## Changed

- Updated v2.x continuity so v2.3.2 remains part of the later Source Board / Canvas batch acceptance.
- Updated proposal payloads to preserve `source_scope_ids` and `scope_summary` for later Source Board use.

## Verification

- `server npm.cmd run test:v2`: pass, 40 tests.
- `server npm.cmd run build`: pass.
- `client npm.cmd run build`: pass.
- `git diff --check`: pass.
- Changed-file secret scan: no literal secrets found.

## Notes

- Henry subjective acceptance remains deferred to later v2.3.x / v2.4-v2.5 batch testing.
- Client build still reports existing Vite chunk-size / import warnings; they are not blocking v2.3.2.
