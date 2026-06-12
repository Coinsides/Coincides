# CHANGELOG - V2.BN.2

## Added

- Added a natural note writing surface in `NoteDetail`.
- Added click-to-write draft state for blank notes and existing notes.
- Added a grouped slash command seed for text, heading, quote, definition, formula, code, and planned image.
- Added deterministic paragraph-to-definition and paragraph-to-formula conversion preview helpers.
- Added a conversion confirmation panel before mutating existing block metadata.

## Changed

- Moved the old Add Block form into an `Advanced block form` fallback.
- Restyled note blocks so they read as document content first and reveal controls on hover/active state.
- New block creation now omits empty `title` instead of sending `null`.

## Deferred

- Image/media block creation is visible as a planned command but disabled until the media data contract exists.
- True delete-with-undo remains deferred; current block delete still uses existing trash behavior.
- Freeform resize, side-by-side layout, A4 page tooling, source picker, and relation mode remain future Better Notebook work.

## Verification

- `client npm.cmd run build` passed.
- Browser smoke passed with the local dev server.
