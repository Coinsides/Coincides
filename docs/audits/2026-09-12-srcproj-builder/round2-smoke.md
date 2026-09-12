> **Status**: builder evidence / browser page-alignment FAIL
> **Date**: 2026-09-12
> **Scope**: 13.6 addendum one; isolated API intake/rematerialization and real Chrome verification

# Second-round smoke

The API intake, geometry mirror and replacement pipeline passed. The real browser exposed a page-alignment defect: all five source bodies render in frame 1, and frame 3 navigation lands on a blank area. This smoke was executed; it did **not** pass overall. Matching before/after appearance does not make the incorrect initial page distribution acceptable.

## Isolation and commands

- Fresh run: `.codex-tmp/srcproj-13-6/smoke-run-wkxsqo/`; created empty and migrated, never copied from a user database.
- Server: `http://127.0.0.1:52002`; client: `http://127.0.0.1:52003`.
- Database: `synthetic-smoke.db`; generated fixture: `Projection Alignment (2).pdf`, exactly five original A4 pages. The PDF and database stay in scratch, outside audit.
- Existing launcher uses an OS/tool-location-only environment, explicit isolated source/assets/uploads/database paths, an empty synthetic dotenv file, `envFile:false` for Vite and a fresh temporary provider store. No parser-selection variable is inherited or changed.
- `node .codex-tmp/srcproj-13-6/launch-smoke.mjs`; `restart-server.mjs` restarted only this run's server after the mirror edit, ensuring the tested process loaded the new geometry.
- `node .codex-tmp/srcproj-13-6/round2/api-smoke.mjs import` created the multipart upload, scheduled materialization and asserted the persisted frame/block/cover state.
- `node .codex-tmp/srcproj-13-6/round2/api-smoke.mjs reproject` read the six-count preview, performed two `confirm:true` replacements and compared snapshots and IDs.
- The addendum names `POST /api/sources`; the implemented intake route is **`POST /api/sources/upload`**. The script uses that existing route, with no route modification. Upload returned **201**, materialization scheduling returned **202**.
- Browser-harness could not read Chrome's debug-port file. The already-connected Chrome browser was operated through the provided browser tool instead. Only the task's new isolated tab was used. **No browser upload was attempted.**

## Findings

| Check | Observed result |
| --- | --- |
| Coordinate contract | Fresh metadata was empty/default v1; seed explicitly set only this isolated database to v2. API-smoke SQL snapshots read back `coordinate_contract=v2`. No claim about the user database. |
| Persisted page mapping | PASS: 5 original pages, exactly 5 frames and 5 blocks; page N block references frame N; all block x/y = 0/0 in page-frame-local coordinates. |
| A4 geometry | PASS: all frames 904×1278, inset `{top:0,right:72,bottom:96,left:72}`, blocks 760 wide. |
| Browser frame count and reading width | PASS: Overview reports 5 with five stable frame IDs. Every ordinary reading block is inside the 760 CSS-pixel content column; the 904 CSS-pixel paper is 980 rendered pixels at the current scale. Left/right block bounds exactly equal content-column bounds. Ordinary reading text starts visibly without left truncation. |
| Cover | PASS before/after: `Projection Alignment (2)` and `源文档 · 5 页 · 导入于 2026-09-12`. |
| Furniture | PASS in persisted receipts: repeated header and `Page N of 5` footer retained in per-frame typography receipts and absent from body blocks. |
| Preview and replace | PASS: preview gives all six counters = 0 and leaves the note ID unchanged; two confirmed replacements create two new note IDs and two receipts. Previous note IDs no longer exist. |
| Stable identity/content/geometry | PASS: all frame rows and selected block rows are deeply equal across initial/first/second publication; frame and block IDs are stable. New note IDs differ as intended. First HTTP replacement took 16.96 ms at this synthetic scale. |
| Browser before/after consistency | PASS as an equality observation: five block DOM IDs, text, styles and rendered rectangles match exactly. The three before/after PNG pairs (reading top, overview, page 3 target) are byte-identical. |
| **Browser page N → frame N** | **FAIL**: all five bodies use continuous DOM top positions 0,276,552,828,1104 in the first frame. Overview frames 2–5 are empty; `Read page 3` opens a blank area before and after replacement. Preview Boundary seed lists five blocks under primary frame 1 and zero under frames 2–5. |

The browser finding is independently explained by the isolated API payload: note blocks carry bare UUID `placement_id`s, whereas matching canvas layouts carry `canvas-placement:<UUID>`. The client hydration lookup misses all five placements, leaving no `canvas_layout` and invoking default continuous layout. See `round2-browser-hydration-api.json` and `round2-browser-finding.md`. This is a rendering failure despite correct stored page identities, not evidence that the server page mapping failed.

## Evidence and limitations

- `round2-smoke-before.json` / `round2-smoke-after.json`: upload/materialization and replacement responses, exact isolated SQL snapshots and receipts.
- `round2-before-dom-geometry.json` / `round2-after-dom-geometry.json`, `round2-after-overview.json`: browser DOM measurements.
- `round2-browser-comparison.json`: derived width checks, stable DOM comparison and image SHA-256 values.
- `round2-{before,after}-{page1,overview,read-page3}.png`: real browser screenshots; the page-3 images are deliberately blank evidence of the defect.
- `round2-before-preview-ax.txt`: page classification read from the visible Preview panel.
- No annotation was seeded in this browser fixture; nonempty annotation snapshots and removal remain covered by the 8/8 isolated server reprojection suite, not claimed as a browser finding.
- Leaving the old note after its API replacement briefly displayed an unsaved-changes toast; the Sources row returned Ready and opened the new note successfully. No browser edit was performed. This observation was not repaired or independently diagnosed.
- No security tests, Git access, commit, actual `.env` key-value read or user-store access. Other delivered product code and all gates remain unchanged.

The task tab is closed. Owned process shutdown and port-closure evidence are recorded separately in `round2-smoke-shutdown.json`. The new browser failure requires a narrowly scoped follow-up ruling; this round does not expand into client hydration repairs or mark the order done.
