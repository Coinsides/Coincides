# Coincides v2.1 Changelog

## AI Note Proposal + Course Material Library Seed - Pending Henry acceptance

### Changed

- Added the v2.1 Course Material Library seed migration with `source_materials`, `source_fragments`, `material_segments`, and `material_segment_fragments`.
- Added authenticated backend routes for course material sources, fragments, current segments, and material segment updates.
- Added deterministic source material/fragment seeding from existing `documents` and `document_chunks`.
- Added deterministic material segment derivation for document, heading, page-range, and chunk-group segments.
- Linked material segments back to source fragments.
- Added material map proposal creation at `POST /api/proposals/material-map`.
- Added material map apply behavior through the existing proposal apply route.
- Applying material map proposals accepts material segments and records a proposal-sourced operation batch without creating notes.
- Discarding material map proposals remains side-effect free for notes and accepted segments.
- Added organized note proposal creation at `POST /api/proposals/organized-note`.
- Added AI-first organized note proposal generation through existing provider settings.
- Added deterministic fallback organized note proposal generation when no AI key is available, the provider fails, or AI output cannot be validated.
- Organized note proposals include candidate NoteBlocks, source references, confidence, and warnings.
- Added organized note apply behavior through the existing proposal apply route.
- Applying organized note proposals creates real v2 notes, NoteBlocks, placements, source references, and a proposal-sourced operation batch.
- Discarding organized note proposals does not create notes or mutate source material usage state.
- Added Course Detail Course Material / Proposal workspace.
- Added material source status, segment preview, and proposal status display.
- Added review/apply/discard UI for material map proposals and organized note proposals.
- Applying an organized note proposal opens the generated v2 Note editor.
- Added v2.1 material library tests to the server v2 test command.

### Scope notes

- v2.1 does not implement full Material Reconciliation.
- v2.1 does not implement Source Snapshot Viewer.
- v2.1 does not migrate old Card/Deck data.
- v2.1 does not add custom NoteBlock types or drag-and-drop NoteBlock polish unless required for proposal review/apply.

### Verification

- `server` v2 tests pass, including v2.1 material library seed and deterministic segment derivation coverage.
- `server` v2 tests pass, including material map proposal create/apply/discard coverage.
- `server` v2 tests pass, including organized note proposal fallback/create/apply/discard coverage.
- `server` TypeScript build passes.
- `client` TypeScript/Vite build passes.
- `git diff --check` passes.
- Secret scan over changed server/shared/client/docs files found no real keys.
- Browser smoke verified course material -> material map proposal -> apply -> organized note proposal -> apply -> note editor.

### Release decision

- Pending Henry acceptance.
