# CHANGELOG v2.4.0 - Canvas-first Document Model + Canvas Data Contract

**Created**: 2026-05-22
**Updated**: 2026-05-22
**Status**: Implemented / pending Henry release decision

---

## Summary

v2.4.0 opens the Learning Canvas / Board Projection track and implements the first Canvas-first document foundation.

This version bridges v2.3 Source Snapshot / Source Board foundations into a cleaner canvas-first document workspace model.

## Added

- Created `docs/releases/v2.4.0-plan.md`.
- Created initial v2.4.0 quality and experience review scaffolds.
- Added additive Learning Canvas schema.
- Added canvas services and routes.
- Added Course Detail `Canvas Document` seed panel.
- Added Source Board to Canvas seeding.
- Added canvas node jump-target behavior for source-backed nodes.
- Added Canvas tests to the v2 test suite.

## Changed

- Promoted the AFFiNE-like layout clarity carryover into v2.4.0 planning while choosing a canvas-first single-surface model instead of dual document/canvas modes.
- Chose not to adopt a third-party canvas SDK in v2.4.0.
- Reserved tldraw / Excalidraw evaluation for v2.4.1.

## Verified

Completed:

- v2 server tests passed.
- server build passed.
- client build passed.
- light browser smoke confirmed the Course Detail Canvas Document entry.
- `git diff --check` passed.
- changed-file secret scan passed.

## Open

- Henry v2.4.0 release/hold decision.
- v2.4.1 canvas viewer and basic interaction plan.
- External Tool Gate for any future canvas SDK adoption.
