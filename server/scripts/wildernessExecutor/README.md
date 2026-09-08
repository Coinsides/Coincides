# V13.2 S4b explicit executor

This offline tool imports the unchanged S3 census/routing/conservation and 4a coordinate readers. It has no startup registration, environment loader, default database, network service or product writer dependency. Real database execution is reserved for Henry's trigger day.

From `server`, supply all three arguments and a **new extension-free basename directly in `docs/audits`**:

```text
node --import tsx scripts/v13WildernessExecute.ts --db <explicit-path> --user <scope> --out docs/audits/<new-name>
node --import tsx scripts/v13WildernessExecute.ts --db <explicit-path> --user <scope> --out docs/audits/<new-name> --execute
node --import tsx scripts/v13WildernessExecute.ts --db <explicit-path> --user <scope> --out docs/audits/<new-name> --rollback
node --import tsx scripts/v13WildernessExecute.ts --db <explicit-path> --user <first> --user <second> --out docs/audits/<new-name> --execute
node --import tsx scripts/v13WildernessExecute.ts --db <explicit-path> --user <second>,<first> --out docs/audits/<new-name> --rollback
```

`--user` can repeat or contain a comma-separated list. Whitespace is trimmed, duplicates removed, and order is immaterial; empty entries are refused. All modes use the same explicit user set. JSON reports contain `scopeUserIds` and a `users` array; Markdown has a section for each user. Execution JSON version is `v13.2-s4b-multi-user`, and preview version is `v13.2-s4b-multi-user-preview`.

Without a mutation switch this is the read-only S3 preview for each user, within one consistent read transaction. Preview diagnostics do not predict S4b coordinate exceptions. Under addendum 4 the executor generates a candidate by tag: `canvas_world` subtracts the frame content origin on both axes; local/untagged keeps x and subtracts the y origin. Every candidate and every persisted normalized row must replay the unchanged live hydration function followed by the 4a screen reader (page offset 0). Only exact hydrated screen and surface ownership equality passes; world and raw-storage screen equality are not invariants. Negative local values are valid; no epsilon, clamp or rounding. Replay includes all same-user/note frames in production order and the live print baseline. Missing/invalid frame context is an exception, never silently omitted.

The block replay first uses the production `projectCanvasPlacementLayout` mapping (including its existing read-side four-axis rounding), then the same hydration/screen chain used by the Source probe. The mapper was extracted without changing product behavior. Stored candidates are never rounded. Generic objects instead replay the existing `resolveGenericPlacementToWorld`; their renderer directly consumes the resulting rectangle. This is their display comparison, not an additional world constraint on blocks. Unresolved consumers are exceptions. Boundary/frame receipts are retained for diagnosis but do not add hidden equality requirements.

The normalization fuse uses the same hydrated ruler: each user's checked rows divided by **all non-structural formal candidates**, including malformed rows, must be at least 50%. Below that, `FAILED: normalization_rate_anomaly` aborts the entire multi-user transaction, including backups, receipts and flag; refer the law-level anomaly to HQ. An empty cohort has rate N/A. Isolated nonfinite/unknown/missing-frame/unsolved rows go to tray only when the cohort passes the fuse. Structural page-frame rows remain world geometry. Execution reports and the final CLI line expose `normalized`, `tray`, and `exceptions` together.

Execution uses one `BEGIN IMMEDIATE` transaction for all listed users: one shared set of immutable full three-table backups, each user's coordinate normalization and S3 wilderness routing plus exception relocation, one `recordEvent(migrated)` per user, then one v2 flag update. Actual same-SQL census and all normalized rows are rechecked before commit; the CLI also repeats every user's census on an independent read-only connection in a single read transaction afterward. Exceptions preserve full original SQLite values, including tagged nonfinite numbers and 64-bit integers, in the JSON report. Only placement geometry/metadata/surface/order changes; object/mount areas are derived through their placements, as in S3.

The database-wide flag requires that every user with non-structural non-tray placements be explicitly listed. Missing any such user refuses execution with zero database writes; listing all permits the shared transaction. The executor never silently extends `--user`. Schema through 056 must already exist; the CLI never applies schema migrations. Existing fixed-name backups are always refused, even if the flag is v1.

Rollback requires the exact execution user set (in any order) and unchanged post-execution three-table and dependent-table fingerprints. Missing or extra users are refused before any writes. It restores every original column through SQL updates on the same identities (no cascading object deletion), restores v1 once, verifies each user's original census, and records one `rolled_back` per user. The version-2 journal stores the complete set and each census; legacy version-1 single-user journals remain supported. Successful rollback renames immutable snapshots with the final rollback event sequence; their contents and triggers remain intact. This frees fixed active names for a second execution without overwriting history. Failed execute/rollback leaves the complete preceding database state, including every user's events and DDL, intact. Backup retention/removal is outside this tool.

Report creation reserves new paths before opening the database. A filesystem or concurrent post-commit verification failure can occur after commit; the CLI explicitly reports that distinction. Inspect `coordinate_contract`, events and active backup state before retrying; rollback refuses subsequent writes instead of erasing them.

Synthetic rehearsal (accepts only a new audit basename, never a database path):

```text
node --import tsx scripts/wildernessExecutor/rehearsal.ts docs/audits/<new-name-合成>
node --import tsx scripts/wildernessExecutor/multiUserRehearsal.ts docs/audits/<new-name-合成双用户>
npm run typecheck:v13-wilderness-executor
npm run test:v13-wilderness-executor
```

The rehearsals preserve S3's local/cross-note placement rows; both now normalize (y=-210/-2010) and retain formal with identical hydrated screens. The 24 negative-local controls remain. Those deliberately small S3/S4 frames are explicitly declared Custom in the executor fixture so the live print baseline preserves their stated geometry; S3's own fixture is unchanged. Three added production positives use explicit A4 frames at (80,80): ordinary local rows with insets (72,96) and (54,112), plus the full-width Source canvas_world row (152,176,650,72). Source must become (0,0), remain formal and keep its hydrated screen. The single-user fixture starts the foreign placement in tray; the two-user fixture has a second user's formal paragraph and frame. Scope refusal, full execute/recheck/rollback/restore/re-execute, and the hydration-fuse zero-write case are exercised. Reports and receipts remain separated by user; whole-table hashes verify restoration, and archived backup generations remain intact.

Trigger-day expectation declared by the issuer: **checked≈126, exceptions≈0, tray≈21 wilderness placements**. These are unmeasured expectations for Henry's database, not synthetic counts or a release authorization. This builder never opens the user database or removes its events or archived backups.
