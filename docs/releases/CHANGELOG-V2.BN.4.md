# CHANGELOG - V2.BN.4

## Added

- Added Page / Canvas mode toggle on the Better Notebook note surface.
- Added a wider Canvas workspace seed with a visible formal page boundary.
- Added outside-page scratch workspace labeling.
- Added first-pass object-level export role.
- Added first-pass object-level AI visibility.
- Added compact export preview seed with included/excluded and AI visible/hidden counts.
- Added selected-block controls to toggle export inclusion and AI visibility.

## Changed

- Upgraded `better_notebook_layout` payload version to `V2.BN.4` when new layout/policy state is persisted.
- Kept old V2.BN.3 layout payloads readable through default policy derivation.
- Moved note title and page controls into canvas-safe top chrome.
- Changed note title saving to Enter / blur autosave instead of a separate Save title button.
- Changed Preview labels into an independent Page labels toggle.
- Hid canvas workspace blocks from Page mode while keeping them visible in Canvas mode.
- Tightened Page-mode NoteBlock spacing and sizing after smoke feedback.
- Kept Canvas / Edgeless as a seed, not a full infinite canvas engine.

## Not Included

- Full PDF export.
- Full edgeless canvas.
- Continuous multi-page canvas.
- Page number editor.
- Source provenance library.
- Relation runtime changes.
- GraphRAG adapter.
- OCR/VLM source reconstruction.
