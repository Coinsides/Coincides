# D1 third continuation: browser replay

The browser run uses the real `NoteWritingSurfaceLayer`, its full CSS,
`usePageFrameWalls`, `useNoteCanvasResolvedLayoutModel`, and `usePlacementHistory`.
The synthetic fixture mounts no application data-loading controller. Its API
interceptor rejects application transport; wall saves only update in-memory
React state and append a snapshot to the fixture ledger. No live note/database
was opened or changed for this run.

Run `node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5179 --strictPort`
from `client/`, then visit `http://localhost:5179/d1-wall-geometry.html`.
The two tiny `client/d1-wall-geometry.*` files are the browser entry point;
the substantive fixture is `result-3-ui-browser.tsx` in this directory.
They are never imported by the application entry point.

## Geometry mode

Click **Capture geometry**, **Toggle selection**, **Capture geometry**,
**Toggle inset**, **Capture geometry**. The results are displayed as JSON below
the paper. The first three records in `result-3-ui-geometry.json` cover 18 real
button boxes: block x=0/88, unit indent=0/1/2, inset=24/72, idle/selected.
Each is 11.2×16 CSS pixels after the button transform, retains its declared
14×20 B10 box, sits 7px left of the content wall, stays inside the paper, and
is returned by `document.elementFromPoint` at its center. At inset=24 the handle
left edge is 5.8px inside the paper. The existing B10 test file was not edited.

Clicking the indented unit's actual handle opens the original Text unit menu;
`result-3-gutter-menu.txt` and `.png` record that browser action. This fixture
does not provide content mutations, so menu mutation entries remain disabled.
Existing 27 unit-handle tests verify the production drag/menu behavior.

## Wall mode

Click **Switch audit mode**. The fixture has two page frames sharing insets,
one auto block (stored width 760), a right-aligned manual block x=440/width=320,
and a wide manual block x=0/width=700. Start at scale 1.

1. Drag the right wall left by 160 CSS pixels: preview auto widths change before
   any save; release yields span 600 and one save batch containing both manual
   clamps (x=280 and width=600).
2. **Undo wall**, then **Redo wall**: old insets and both manual layouts restore;
   the redo snapshot equals the original save snapshot byte for byte.
3. Drag the right wall outward to inset 24: auto width becomes 808, with an empty
   layout-update batch. Undo this expansion to prepare the next comparison.
4. Drag the left wall outward from inset 72 to 24: the right-aligned manual
   block follows left by 48px, and every stored block layout remains unchanged.
5. **Toggle half scale**. Drag the right wall outward by 104 screen pixels:
   the controller reads scale 0.5, applies 208 layout pixels, and auto reaches
   width 856. Further outward drag leaves inset=24 and adds no save.
6. Drag inward past inset 240: inset clamps at 240 and auto width is 640.

`result-3-wall-browser-flow.json` contains 61 captured production renders and
8 in-memory save snapshots. `result-3-wall-browser-summary.json` records 16/16
checks. It distinguishes a single in-memory save callback from HTTP transaction
validation, which is covered separately by the builder's adapter/server suites.
The raw `result-3-wall-flow-partial.json` preserves the earlier five-save point.

`result-3-wall-hover.json` records both lines at opacity 0 with the pointer away,
and the right line at opacity 1 while hovered with `active=false`; the real drag
ledger records the active line at opacity 1 during movement. Screenshots capture
the gutter at minimum inset, the original menu, contraction, left expansion,
half-scale expansion, and hover. Frame spans never fall below 320 in this fixture;
the narrow-frame span-floor cases are in the dedicated functional suites.

## Validation

UI directional run: 4 files / 55 tests passed: wall UI 2, unchanged B10 gutter 3,
unit-handle behavior 27, frame alignment 23. Physical geometry assertions use
Chromium's real layout and hit testing, not jsdom rectangle mocks.

The browser-harness connection could not read Chrome's profile port file, so the
browser run used the installed CUA Chrome extension. Initial direct `@fs` audit
HTML URLs were outside Vite's default serving list; the explicit client fixture
entry point resolves the imported audit module without changing permissions or
the app's Vite configuration. No product behavior was altered for the probe.
