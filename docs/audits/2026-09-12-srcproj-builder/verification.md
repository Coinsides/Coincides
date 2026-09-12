> **Status**: builder verification evidence
> **Date**: 2026-09-12
> **Scope**: 13.6 non-security full client collection, compilation/build and affected static checks

# Verification results

Client functional tests and shared/client/server compilation and builds passed. The affected runtime and source static checks passed. After the root builder refreshed the affected generated object inventory, a second `docs:check` passed. Root-reported server projection/coordinate tests still include three failures pending the shared-geometry decision. This record does not claim that the prohibited complete runtime aggregate or the browser import journey passed.

## Test collection and exclusion proof

The complete client test collection discovered **145 files / 1547 tests**. **144 files / 1543 tests passed**, **1 file / 4 tests were explicitly skipped**, with **0 failures and 0 unhandled errors**. Duration: 86.42 seconds.

The four skipped tests are the `Settings provider credential controls` suite in `client/src/pages/Settings/ProvidersSection.test.tsx`. The Vitest result tree confirms each test's actual state was `skip`; no other tests were skipped. The exclusion was applied through Vitest's programmatic `testNamePattern`, with a final collected-result assertion. This was not a command-line pattern assumed to work without inspecting results.

The source rematerialization UI tests present in this collection passed. Server rematerialization/coordinate targeted suites are owned and reported separately by the root builder, and are not counted in the numbers above. At this checkpoint the root reported: the combined targeted run had **23 tests, 20 passed / 3 failed** (one geometry test and two coordinate tests, pending shared geometry wiring); the ordinary-title allowlisted materialization regression passed **9/9**, with two security-class cases excluded; the new rematerialization suite passed **8/8**, already included in the combined targeted run. These overlapping suite counts must not be added together.

Manifest serialization/freshness suite: **10/10 tests passed**. The registry and parity test suites were not run because their bodies contain security-semantic assertions; their production static checks were run.

## Compilation and build

| Command | Result |
| --- | --- |
| Shared `tsc -b shared/tsconfig.json` | PASS |
| Client `tsc -b --noEmit` | PASS |
| Server `tsc --noEmit` | PASS |
| Client `tsc -b` | PASS |
| Client programmatic Vite build (`envFile:false`) | PASS |
| Server `npm run build` | PASS |

No build output was copied into this audit directory. The ordinary Vite bundle-size warning remains non-fatal.

After the final `sourceMaterialization.ts` correction to prefer the current projection note's `operation_batch_id`, **server typecheck and server build were rerun and both passed** (4.71s and 6.76s). Root separately reported the updated rematerialization tests as 8/8 passed. Client tests and unaffected static checks were not unnecessarily repeated.

## Static and model checks

| Stage | Result / counts |
| --- | --- |
| `check:tool-face-manifest` | PASS |
| `check:tool-face-parity` | PASS; 14 public entries; this static check does not verify human journeys |
| `check:server-shared-runtime-import` | PASS; 233 product files, 0 violations, 7 allowed import-type declarations |
| `check:canvas-runtime-boundary` | PASS; 168 checks |
| `check:group-gallery-shell` | PASS |
| `check:groups-rail-shell` | PASS |
| `check:single-editor-shell` | PASS |
| `check:source-experience` | PASS |
| `check:v2-bn11-legacy-shutdown` | PASS |
| `check:v2-bn11-relation-freshness` | PASS |
| `smoke:canvas-engine-model-contract` | PASS; 60 groups |
| `smoke:canvas-engine-performance` | PASS; 5 scenarios, total 14.52ms |
| `docs:check` | Final PASS after root refreshed only the inventory affected by migration 069. The first run failed on stale `docs/generated/object-inventory.md`; its failure log is retained. No generated document was rewritten by this verification subtask. |

## Isolation, logs and browser limit

All child commands inherited only OS/tool-location variables. Each verification group had its own empty env directory, explicit in-memory database default, source/assets/uploads roots, and fresh temporary provider-store directory. Vite/Vitest used `envFile:false`; server dotenv configuration pointed only to a synthetic empty file. No user database, actual `.env` key values, or user credential store was read.

Commands were run through `.codex-tmp/srcproj-13-6/verify.mjs`; stdout/stderr were captured under these scratch directories:

- `verification-client-tests-1789193938013/`
- `verification-types-build-1789193937778/`
- `verification-static-1789193937878/`
- `verification-manifest-tests-1789193996370/`
- `verification-docs-only-1789194103039/` (final `docs:check` PASS)
- `verification-server-final-1789194187212/` (final server typecheck/build PASS)

Copied test/check logs and command result JSON are under this audit directory's `verification-logs/`. No generated bundle, compiled module, PDF or database is included there.

The isolated server was restarted on `http://127.0.0.1:62504` after rematerialization code landed, with Vite on `http://127.0.0.1:62505`. At closure the task's server, client and original launcher PIDs were stopped, and both ports were verified closed; isolated data and the fixture were retained. The root builder reports that automatic approval rejected the browser's synthetic PDF upload. This subtask did not retry or replace that import through an API, CDP or another route. The browser import → projection → rematerialization journey therefore remains unverified.

Not run: `npm run verify:v2-bn8-runtime`, `git diff --check`, changed-file secret scanning, registry/parity security-semantic test suites, and the four explicitly skipped credential controls tests. No Git commands or `.git` access occurred.
