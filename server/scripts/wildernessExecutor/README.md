# V13.2 S4b explicit executor

This offline tool imports the unchanged S3 census/routing/conservation and 4a coordinate readers. It has no startup registration, environment loader, default database, network service or product writer dependency. Real database execution is reserved for Henry's trigger day.

From `server`, supply all three arguments and a **new extension-free basename directly in `docs/audits`**:

```text
node --import tsx scripts/v13WildernessExecute.ts --db <explicit-path> --user <scope> --out docs/audits/<new-name>
node --import tsx scripts/v13WildernessExecute.ts --db <explicit-path> --user <scope> --out docs/audits/<new-name> --execute
node --import tsx scripts/v13WildernessExecute.ts --db <explicit-path> --user <scope> --out docs/audits/<new-name> --rollback
```

Without a mutation switch this is precisely the read-only S3 preview. Preview diagnostics do not predict S4b coordinate exceptions: the executor solves the 4a world and screen equations with the actual page offset (0), then checks hydration, without epsilon/clamp/rounding. Nonfinite/unknown/missing-frame/unsolved formal rows go to tray; negative local values are valid. Structural page-frame rows remain world geometry.

Execution uses one `BEGIN IMMEDIATE` transaction: immutable full three-table backups, coordinate normalization, S3 wilderness routing plus exception relocation, `recordEvent(migrated)`, then v2 flag. Actual same-SQL census and all normalized rows are rechecked before commit; the CLI also repeats the census on an independent read-only connection afterward. Exceptions preserve full original SQLite values, including tagged nonfinite numbers and 64-bit integers, in the JSON report. Only placement geometry/metadata/surface/order changes; object/mount areas are derived through their placements, as in S3.

The database-wide flag requires no other user's non-structural non-tray placements. A scoped executor refuses that condition; it never silently extends `--user`. Schema through 056 must already exist; the CLI never applies schema migrations. Existing fixed-name backups are always refused, even if the flag is v1.

Rollback requires unchanged post-execution three-table and dependent-table fingerprints. It restores every original column through SQL updates on the same identities (no cascading object deletion), restores v1, verifies the original census, and records `rolled_back`. Successful rollback renames immutable snapshots with that event sequence; their contents and triggers remain intact. This frees fixed active names for a second execution without overwriting history. Failed execute/rollback leaves the complete preceding database state, including events and DDL, intact. Backup retention/removal is outside this tool.

Report creation reserves new paths before opening the database. A filesystem or concurrent post-commit verification failure can occur after commit; the CLI explicitly reports that distinction. Inspect `coordinate_contract`, events and active backup state before retrying; rollback refuses subsequent writes instead of erasing them.

Synthetic rehearsal (accepts only a new audit basename, never a database path):

```text
node --import tsx scripts/wildernessExecutor/rehearsal.ts docs/audits/<new-name-合成>
npm run typecheck:v13-wilderness-executor
npm run test:v13-wilderness-executor
```

The rehearsal preserves S3's local/cross-note rows; both go to tray because their actual horizontal origin prevents simultaneous equality. It adds 24 exact negative-local controls. Original S3 foreign formal/workspace rows exercise execution refusal in tests; the executable fixture starts that one foreign placement in tray and documents the difference.
