# Coincides v2.0 Changelog

## NoteBlock Foundation implementation start - 2026-05-19

### Changed

- Added the v2 NoteBlock foundation migration with `operation_batches`, `notes`, `note_blocks`, `note_block_placements`, `note_block_sources`, and `projections`.
- Added authenticated backend routes for notes, note blocks, and projection snapshots.
- Added the first course-rooted Notes UI surface and a basic Note editor.
- Added a v2 backend behavior test file covering additive tables, ordered note placements, and stable projection snapshots.

### Scope notes

- This does not implement AI Note Proposal, OCR routing, Course Material Library UI, Source Snapshot Viewer, or Card/Deck migration.
- Existing Card/Deck flows are left intact.

### Verification

- `server` v2 behavior tests pass: additive tables, ordered note placements, and stable projection snapshots.
- `server` TypeScript build passes.
- `client` production build passes, with existing Vite bundle-size/dynamic-import warnings.
