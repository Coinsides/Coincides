# F17 explicit history restore smoke

Start the unchanged C-fix1 fixture from `server/`:

```powershell
node --import tsx ../client/scripts/cFix1Smoke/start.mjs
```

It creates a fresh `:memory:` SQLite database and temporary synthetic asset directories;
Vite has `configFile:false / envFile:false`. No user database or environment file is used.
From the repository root, run `node client/scripts/cFix2Smoke/proxy.mjs`, then open
`http://127.0.0.1:5186/scripts/cFix1Smoke/index.html` in Chrome.

The proxy first checks that the upstream identifies the synthetic in-memory fixture.
It forwards real production requests and records text-save requests, response statuses,
returned ranges and revisions at `GET /__c-fix2/journal`. It does not create or replace
history entries, range snapshots, body saves or pointer/keyboard actions.

`POST /__c-fix2/control` injects one HTTP 503 for B's next text-save containing an explicit
range restore intent. All other requests continue normally, so a later-block failure can
exercise the existing document-history partial-progress/retry path. Server unit tests
separately inject a late SQLite failure to verify transaction rollback.

The regression uses C-fix1 A/B text and B's `tu-1` / excerpt `Ta` / offsets `0..2`.
Three ordinary no-op B text saves can establish revision 3 before loading the UI, matching
the upstream request revision numbers. Click A's last unit, Home, Right five times,
Shift+Down, then type `x`: the native selection crosses to B, and B's range becomes drifted.
Ctrl+Z must restore active/0..2/null; Ctrl+Y must restore drifted/null/null/0..2 evidence.
Arm the injection before another Ctrl+Z, observe the visible failure and unchanged B
revision, then retry Ctrl+Z and verify only the incomplete block writes again.

For the positive control after redo, send B's restored, matching before-body through the real
text-save door with the original range's active/0..2/null patch **without** history_restore. Stored status
and pre-edit evidence must remain drifted/0..2. This checks the normal save gate directly.
A mismatching body would derive drift even with the sticky gate removed and is insufficient.

`node client/scripts/cFix2Smoke/evidence.mjs seed` performs the three initial no-op saves.
Other arguments capture and assert checkpoints: `01-before-red` (expected exit 1),
`01-after-undo`, `02-after-redo`, `04-after-failure`, `04-after-retry`, and
`03-positive-control`. The last reads the captured undo body and asserts its excerpt matches.
Checkpoint JSON/logs belong in `docs/audits/2026-09-10-c-fix2-builder/`; the unchanged fixture's
inspection response contains stored block fields and board ranges with existing read-time
status derivation. Server tests additionally assert raw SQL range rows and transaction rollback.

Restarting the upstream resets synthetic data; reload the UI afterward. Stop both helper
processes when done. These helpers do not certify results; the audit records actual runs.
