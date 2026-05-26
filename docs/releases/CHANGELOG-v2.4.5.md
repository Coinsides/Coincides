# CHANGELOG v2.4.5 - Command & Interaction System Seed

## Added

- Added a read-only canvas command context API.
- Added selected object command context for canvas nodes and canvas edges.
- Added a frontend command registry and command panel in the Canvas Document surface.
- Added focused-canvas keyboard shortcuts for add block, connect mode, escape/cancel, zoom in/out, and reset view.
- Added AI command context seed metadata without calling real AI providers.

## Changed

- Canvas actions are now exposed through a clearer command surface while continuing to use existing safe APIs.
- v2.x continuity now records command context and input binding as graph-native migration learnings.

## Fixed

- Kept command context read-only so future AI interaction planning does not accidentally become a mutation path.

## Verification

- `server npm.cmd run test:v2` passed.
- `server npm.cmd run build` passed.
- `client npm.cmd run build` passed.
- `git diff --check` passed.
- Changed-file secret scan found no candidate secrets.
- Browser smoke passed for command panel visibility, Add Block command, Connect command, and focused canvas zoom/reset shortcuts.

## Notes

- v2.4.5 does not call real AI providers.
- v2.4.5 does not introduce a new external dependency.
