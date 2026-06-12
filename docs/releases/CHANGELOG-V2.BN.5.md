# CHANGELOG - V2.BN.5

## Added

- Added first-version structured field values for Definition and Formula NoteBlocks.
- Added fixed visual seeds for Definition and Formula blocks.
- Added Default / Math / User Defined grouping for Better Notebook block insertion.
- Added V2.BN.5 patch documentation.

## Changed

- Narrowed the first-version insert and slash command surface so historical theorem/proof/example/exercise templates are not presented as default Better Notebook writing choices.
- Updated static and seeded template definitions for Definition and Formula to include structured field schemas while preserving `body` fallback content.
- Stabilized layout mode interaction after manual smoke testing:
  - structured block height now follows rendered field content;
  - dragging a block persists affected collision-avoidance layouts together;
  - stale selected/active block state is cleared when another block is selected;
  - selected block toolbars stay above tightly adjacent blocks;
  - first-version layout undo/redo handles block move/resize operations.
- Replaced brittle deterministic structured conversion with conservative field mapping:
  - Definition conversion maps current text to `description` and leaves `concept_name` empty;
  - Formula conversion maps current text to `latex_input`;
  - colon splitting and formula delimiter guessing are no longer used.
- Split block identity from block operations:
  - introduced a separate Block Type Badge;
  - kept the floating operation surface focused as the Block Control Bar;
  - added a preview switch for showing type badges across the page.
- Cleaned up preview overlay controls so block type, AI visibility, and export status overlays use compact icon toggles instead of bulky text rows.
- Closed V2.BN.5 after Henry acceptance on 2026-06-10.

## Verified

- `client npm.cmd run build`
- `server npm.cmd run build`
- `server npm.cmd run test:v2`
- Browser smoke with a disposable local account confirmed structured Definition and Formula rendering from field values.

## Deferred

- Full Template Studio productization.
- Field layout editor.
- Rich block style editor.
- AI-driven template selection.
- Wide-viewport Insert panel polish.
