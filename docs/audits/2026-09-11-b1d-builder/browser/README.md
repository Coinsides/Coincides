# B1d browser evidence

This directory owns the isolated browser fixture and its measurements. It uses the production React NoteDetail page, production human HTTP routes, and one disposable SQLite database under `.codex-tmp/b1d-browser/run-*/fixture.sqlite`. It never opens the application database. Chrome uses a fresh separate profile and is closed after the run.

Run from `server/`:

```powershell
node --import tsx ../docs/audits/2026-09-11-b1d-builder/browser/serve.mjs
```

Then run from the repository root:

```powershell
node docs/audits/2026-09-11-b1d-builder/browser/smoke.mjs
node docs/audits/2026-09-11-b1d-builder/browser/pixel-regression.mjs
```

The source routes are intentionally separate renderers over the **same backend and note**:

| Port | Renderer |
| --- | --- |
| 5200 | Current product source and the single real HTTP/SQLite fixture backend. |
| 5202 | Baseline product source: Vite's `load` hook substitutes saved pre-edit files from `../baseline-source/`, preserving the original module ID and relative import resolution. Unchanged product files remain shared. |
| 5203 | Current product with only the old header restored: the saved NotePaperHeader TSX/CSS, NoteCoverMetadata CSS, skinComponentStyles, and the old `useNoteSkin` title-weight override. Current `buildPaperMaterialStyles` and all current wall/clip behavior remain active. A source guard refuses to silently lose the material call. |

The header compensation identifies the entire visual consequence of the authorized proportion change, including the display band's height, subsequent displayed body offset, sheet bottom, and any resulting viewport/scrollbar changes. It does **not** mask pixels, crop the header, normalize colors, tolerate differences, or resize the source PNGs. `pixel-regression.json` reports both the raw current-versus-baseline differences and the strict compensated comparisons. Each source screenshot is 1440 × 1800 at device scale 1.

`browser-report.json` contains actual computed geometry/paint, complete source-block responses and canvas persistence before/after, hover/active paint comparisons, the 56/10/12/28 header chain, line-height checks, HTTP failures, and browser exceptions. Right-wall active checks press, move 12 screen pixels, return to the start, then release; final stored geometry is compared in full with the pre-test data. No product placement is rewritten to match the reference picture. Pen mode checks that visible walls become paint-only: no separator role and no pointer events. The additional Workbench Overview screenshot covers its engineering grid.

`warm-paper-comparison-two-column.png` is a browser-rendered two-column image of `reference-a.png` and `warm-paper-current-final.png`. The left image is explicitly a reconstruction from spec §八, **not** the missing original Artifact. `../reference-a.html` contains the exact reference source. The root README and handoff contain the source limitation for Henry's original screenshot.

## Root-cause evidence and retained failures

- Original source has symmetric 12px-wide margin hit strips and idle line opacity 0. The baseline screenshots reproduce a right-only line when the pointer is on the right strip; moving away makes both lines invisible. This is a verified mechanism that can produce the reported symptom. The original Henry image was unavailable, so this evidence does not prove it was the unique cause in that image.
- `round1/` preserves the initial material regression: a CSS `calc(...)` value for `overflow-clip-margin` computed to 0px in Chrome, clipping the original outline. `clip-investigation/browser-report.json` records original 34.6875px versus current 0px. Final `clipSupport` records the browser's CSS.supports results. Product code was corrected to numeric lengths.
- `aa-investigation/` preserves the next regression and the isolating probe. Even opacity-zero generated wall pseudo-elements changed Chrome's body antialiasing. Removing their generated content in an audit-only DOM experiment yielded exactly zero differing default pixels against baseline. Final product code does not generate those pseudo-elements for default/quiet-ink. The final normal screenshots require no DOM patch.
- `preview-probe-misclassification/` is an audit mistake, not a product defect: the toolbar's Preview button opens Export Preview; it does not activate read-only content mode. The false read-only assertion was removed; the product was unchanged for this correction.
- `overview-baseline-check.json` and `workbench-overview-{baseline,current}-same-fixture.png` document an existing limitation of this synthetic note's Overview projection: the left edge clips the same text in both versions. Stored canvas data, projected descendant geometry, and visible text compare equal. This follow-up uses only GET requests plus an in-memory fixture preset, does not edit coordinates, and does not replace the 41-check main report.

Optional `B1D_PRESETS=default,quiet-ink` narrows a diagnostic run. Optional `B1D_CSS_PROBE=1` captures a separately named `*-header-baseline-no-idle-pseudo.png` after a clearly identified temporary DOM probe. Neither option is used for the final full audit. `generate-fixture.mjs` documents the one-time derivation of `serve.mjs` from B1c; rerunning it is unnecessary for verification.
