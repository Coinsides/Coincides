# CHANGELOG - V2.BN.3

## Added

- Added first freeform NoteBlock BlockBox layout seed on the note page.
- Added layout mode toggle in note top chrome.
- Added block selection state for layout work.
- Added move grip for block repositioning.
- Added right-edge resize handle for block width changes.
- Added text reflow behavior after resizing.
- Added basic snap guide lines for nearby page/block alignment.
- Added spatial empty-area insertion for new draft blocks.
- Added placement override persistence through `note_block_placements.display_overrides_json`.
- Added `PUT /api/notes/:id/block-placements/:placementId` for layout persistence.

## Changed

- Note blocks on the formal page are now projected as positioned BlockBoxes instead of only vertical flow items.
- New note blocks can be created with initial placement overrides.
- Old blocks without layout data receive deterministic default layout boxes in the client.

## Deferred

- Full page mode vs open canvas mode switch remains V2.BN.4.
- Corner resize, vertical manual resize, and richer layout controls remain future polish.
- Final typed BlockBox data model remains V2.BN.6.
- Source picker, relation mode, local graph, GraphRAG, and OCR/VLM import are not touched.

## Verification

- `client npm.cmd run build` passed.
- `server npm.cmd run build` passed.
- Browser smoke pending after Henry restarts frontend/backend.
