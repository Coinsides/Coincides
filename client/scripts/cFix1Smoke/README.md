# C fix 1 paper interaction fixture

From `server`, run `node --import tsx ../client/scripts/cFix1Smoke/start.mjs`.
Open `http://127.0.0.1:5185/scripts/cFix1Smoke/index.html` in Chrome.

The real paper controller, Chrome/document layers, history, notes/block/canvas/annotation routes
use this process's new `:memory:` SQLite database. Vite uses `configFile:false` and `envFile:false`.
Asset directories are fresh `.codex-tmp/c-fix1-assets-*` paths. No user database is opened.
Other catalog reads use a local synthetic transport. The fixture has no production app route.

- Page one: adjacent three-unit A/B blocks both have `tu-1`, `inline-1`, an annotation and a board range.
  Use them for reorder, cross-block collision remapping, extraction, typing, navigation, selection and undo.
- An eight-role block covers paragraph, heading, quote, bullet, numbered, todo, toggle and code line.
- Page two: text and code blocks, empty space for extraction/ink, and a long block near the page edge
  for production overflow/continuation inspection; a third blank frame makes the next page available.
  Initial stored placements remain `formal_page/inside`; the fixture does not forge retired crossing placements.
- The printed inspection URL exposes only the synthetic rows and requests from this process.
  Browser refresh retains this database; restarting the process resets it.
- Print buttons dispatch the production `beforeprint`/`afterprint` lifecycle for DOM inspection.
  These controls do not operate a physical printer.

The fixture itself does not automate pointer events or certify any smoke result.

`[data-c-fix1-pointer-log]` is a read-only JSON DOM output of document-capture pointer events
and the next animation frame: event trust, pointer identity/buttons/target, visible insertion
indicator count and geometry. The collapsed observation panel shows recent rows on demand.
Listeners are passive; they never prevent, synthesize or dispatch events, capture a pointer,
or update production state. Records describe observations, not an assertion of successful drag.
