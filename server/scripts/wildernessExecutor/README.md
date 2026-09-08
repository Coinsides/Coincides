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

Without a mutation switch this is the read-only S3 preview for each user, within one consistent read transaction. Preview diagnostics do not predict S4b coordinate exceptions: the executor solves the 4a world and screen equations with the actual page offset (0), then checks hydration, without epsilon/clamp/rounding. Nonfinite/unknown/missing-frame/unsolved formal rows go to tray; negative local values are valid. Structural page-frame rows remain world geometry.

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

The single-user rehearsal preserves S3's local/cross-note rows; both go to tray because their actual horizontal origin prevents simultaneous equality. It adds 24 exact negative-local controls. Its executable fixture starts the foreign placement in tray; the original foreign formal/workspace shapes continue to exercise incomplete-scope refusal in tests. The added two-user rehearsal instead gives the second user one formal paragraph and one structural frame: single-user execute and rollback both refuse without changing database bytes, while the two-user preview → execute → recheck → rollback → restore recheck → execute chain passes. Reports and receipts remain separated by user, and whole-table hashes verify complete restoration.
