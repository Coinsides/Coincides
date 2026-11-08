# A-19 acceptance notes (Tester(1), scratch)

## Environment (all local, never the island)
- pre  = fdeacb5d (island 21st). Backend 3591 from a19acc/pre (server+shared+scripts+docs/generated, manifest generated),
  client = edacc/dist-r23c (fdeacb5d client == 9bc45e69+22, 63/63 package r2.3c) on 5591.
- post = fdeacb5d + package src (to come). Backend 3592 from a19acc/post, client dist on 5592 (rebuild, 63/63 vs package).
- legacy = copy of pre data dir after pre imports -> post server on 3593, client post dist on 5593.
- Backends bound to 127.0.0.1 via bind-local.mjs preload (server hard-codes <ip>, firewall off). Code untouched.
- docx converter: tester-kit fake-soffice.cjs, ctl = a19acc/ctl (fixture.pdf 12 pages, release present).

## Fixtures (a19/fixtures, self-made, manifest.json)
- 23 files; Chrome decode check 22/23 as expected; truncated png decodes as 800x600 mostly blank (expectation corrected).

## Pre baselines (5591/3591)
- image probe: png/jpeg-exif6/webp/png-huge -> note yes, NO image on screen (A-19 reproduced; negative control for the probe).
- bad-garbage.png, other-avif: upload ok, materialization stays "received" (no projection) for 30 s.
- bad-empty.png: 400 "Source file is empty".
- bad-truncated, bad-pngbytes-named.jpg: note, no image.
- lineage: PDF lands Pages, 12 chips, jumps 3/7/11 exact. docx lands Pages, 0 chips (docx text has no page refs) ->
  docx criterion = lands Pages + chip count equal to pre.

## 1a regression environment (ready on the pre side)
- verify-p2/arm-a = fdeacb5d client+shared (+ node_modules junction); old 1a arms moved to arm-a-1a-old / arm-b-1a-old;
  old outputs moved to run/out-1a-2026-11-05.
- pre 1a backend 3594 (CTL_DIR = verify-p2/run/ctl, data a19acc/data-pre1a); vite a on 5581 -> 3594 (binds ::1).
- smoke on arm a: "HELD text top=800 (before 800)", 0 exceptions -> harness works on the new tree.
- post side: verify-p2/arm-b = fdeacb5d client+shared + package client src; post 1a backend 3595; vite b 5582 -> 3595.
  run: node run.mjs <group> --arms a --backend 3594 ; node run.mjs <group> --arms b --backend 3595 (same out file, arm field).

## Legacy library (Main_Designer 11-08: page registry gains text_view; old pages lack it)
- legacy-seed.mjs on pre 3591: account in a19acc/legacy-account.json (scratch, local only), map a19acc/legacy-map.json:
  18 good images (note yes), garbage + avif (no note), truncated + png-as-jpg (note), PDF 12 pages, docx 12 pages.
  Pre page fields: page_number, asset_id, image_width, image_height, pdf_width, pdf_height (no text_view).
- legacy-probe on pre (same notes), baseline:
  images: reg status none, no image, no generate button.
  PDF: Pages default, text 32 blocks, 12 chips, jumps 3/7/11 exact, back=Text, reload=Pages.
  docx: Pages default, text 160 blocks, 0 chips, back=Text, reload=Pages.
  (first run read back/reload too early; probe now waits for the pressed toggle, up to 15 s)
- Snapshot frozen: a19acc/data-legacy (copied from data-pre with the pre backend stopped, 127 files, 92M).
- Post criterion for the 18 legacy images (Main_Designer 11-08, e21c17e0): a generate button must be there and bring the
  picture up (ratio, bytes = original). No button on post = red. legacy-probe clicks generate/retry when no image shows.
- When the package lands: post server on 3593 with data dir a19acc/data-legacy, front 5593 (post dist) ->
  legacy-probe legacy-on-post; compare row by row with legacy-on-pre(-text).

## To do when the package lands
1. sha256 -c src.sha256; overlay on fdeacb5d archive (client+server+shared+scripts+docs/generated); build dist, 63/63 vs package dist.
2. diff package server/package.json vs fdeacb5d: only test:v2 list; lock untouched.
3. post backend 3592 + front 5592; image probe ALL; lineage x2; bad files; delete + Rebuild residue (list blobs/assets/appdata before/after, DB rows).
4. legacy: pre imports (all good fixtures) -> stop pre -> copy data -> post server on it -> open, Generate, visible.
5. 1a regression: vite arms a=pre client src, b=post client src (verify-p2/arm-a, arm-b; move old 1a arms aside),
   backends 3591/3592 with CTL = verify-p2/run/ctl; groups smoke,n1,noconv,pagestabs,pagesback,entries,notice,textpos,td1.
6. 3001 cross-check: one png on builder's 3001 vs my post.
