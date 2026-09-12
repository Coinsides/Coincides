> **Status**: builder verification evidence
> **Date**: 2026-09-12
> **Scope**: source-projection repair 13.6 addendum one; second-round server geometry and authorized regression checks

# Second-round verification

The three targeted server families passed **23/23 tests**, with **0 failures, 0 skipped, 0 cancelled**. The preceding round's one A4-geometry failure and two coordinate failures all passed after the local server mirror was aligned. The existing assertions now compare all four inset fields individually with the imported shared source, in addition to frame width/height and content width.

| Family | Passed |
| --- | --- |
| `v13SourceProjectionRepair.test.ts` | 10/10 |
| `v13SourceReprojection.test.ts` | 8/8 |
| `v13CoordinateContract.test.ts` | 5/5 |

Command, from `server/`, run through the clean-env launcher `.codex-tmp/srcproj-13-6/verify-round2.mjs`:

```text
node --import tsx --test --test-reporter=tap src/__tests__/v13SourceProjectionRepair.test.ts src/__tests__/v13SourceReprojection.test.ts src/__tests__/v13CoordinateContract.test.ts
```

TAP duration: **2377.7278 ms**. Full output and the command/exit record are in `targeted/server-targeted.log` and `targeted/results.json`.

## Compilation and static checks

The existing `.codex-tmp/srcproj-13-6/verify.mjs` was reused with `server-final` and `static`. The runner executes Node with an OS/tool-location-only inherited environment, an explicit `DB_PATH=:memory:`, separate source/assets/uploads paths, a fresh synthetic provider-store directory, and an empty dotenv file. No actual `.env` file was read and no user database was opened.

| Command | Result |
| --- | --- |
| Server `tsc --noEmit` | PASS, 5249 ms |
| Server `npm run build` | PASS, 6952 ms |
| `check:tool-face-manifest` | PASS |
| `check:tool-face-parity` | PASS, 14 public entries; static check only |
| `check:server-shared-runtime-import` | PASS, 233 product files; 0 violations; 7 permitted declaration-level `import type` statements |
| `check:canvas-runtime-boundary` | PASS, 168 checks |
| `check:group-gallery-shell` | PASS |
| `check:groups-rail-shell` | PASS |
| `check:single-editor-shell` | PASS |
| `check:source-experience` | PASS, contract and model checks |
| `check:v2-bn11-legacy-shutdown` | PASS |
| `check:v2-bn11-relation-freshness` | PASS |
| `smoke:canvas-engine-model-contract` | PASS, 60 groups |
| `smoke:canvas-engine-performance` | PASS, 5 scenarios; measured total 13.94 ms |
| `docs:check` | PASS at this verification checkpoint |

`compilation/` and `static/` contain complete logs and exit/duration records. They contain no database, PDF, compiled module or build bundle.

## Scope and exclusions

Independent SHA-256 boundary comparison passed: all **21 named preserved files** exactly match the second-round opening snapshot, including the runtime-import gate. The **20 preceding-round deliverables** among them also exactly match the preceding `numstat.json` final hashes. Both authorized modified files have opening hashes equal to their preceding-round final hashes, and current hashes equal to the geometry agent's recorded final hashes. See `boundary.json`. This checks the named delivery set and gate; it is not a claim that the entire repository was scanned.

No product, test, static-gate or whitelist file was changed by this verification subtask. The geometry agent owns the two authorized geometry/test edits; the root builder owns the browser/API smoke and final handoff Result. This report does not claim the separate browser smoke has completed.

The unchanged client/shared delivery retains the preceding round's validated client collection: **145 files / 1547 cases collected, 1543 passed and 4 credential cases explicitly skipped**. These are preceding-round results, not a new client run. The client collection and shared/client builds were not repeated because the second-round product changes are confined to the server's geometry mirror.

Not run: the aggregate `npm run verify:v2-bn8-runtime` (contains forbidden Git/secret-scanning/security-semantic branches), `git diff --check`, changed-file secret scanning, registry/parity security test suites, and credential controls tests. No Git command or `.git` access, commit, security-class test, user-store access, or actual `.env` key-value read was performed.
