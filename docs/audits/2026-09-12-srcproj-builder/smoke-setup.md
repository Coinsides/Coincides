> **Status**: evidence / stopped, fixture retained
> **Date**: 2026-09-12
> **Scope**: 13.6 Source projection isolated verification setup; no production code changes

# Isolation and verification setup

This record documents the prepared environment, not completed browser acceptance. The root builder owns final test and browser results.

## Prepared synthetic environment (now stopped)

- Client: `http://127.0.0.1:62505` (Vite with programmatic `envFile:false`).
- Server: `http://127.0.0.1:62504` (the ordinary `server/src/index.ts` entrypoint).
- Workspace run directory: `.codex-tmp/srcproj-13-6/smoke-run-hWVJh9/`.
- SQLite: `synthetic-smoke.db` in that run directory. It was created empty; no existing user database was opened or copied.
- Five-page A4 PDF: `Projection Alignment (2).pdf` in that run directory. Every original page has a repeated synthetic header, a distinct page heading, eight distinct body lines, and `Page N of 5` footer. Generated locally with the installed `pdf-lib`; no user artifact or remote content.
- `database-meta.json`, `seed.log`, `server.log`, and `client.log` are in the same directory. `current-smoke.json` points to this run.
- Test user: `srcproj-136@example.test`; onboarding is already complete. It has an empty Home project and no provider configuration.

The launcher is `.codex-tmp/srcproj-13-6/launch-smoke.mjs`; seeding and Vite support files live beside it. It runs subprocesses with only OS/tool-location variables inherited. `NODE_OPTIONS`, provider variables, `VITE_*`, parser-selection variables, and arbitrary environment variables are not inherited. The parser choice remains the application's ordinary default.

At closure, the task's recorded server PID 16316, client PID 37988 and original launcher PID 25872 were stopped. Both ports 62504 and 62505 were confirmed closed at `2026-09-12T06:23:41.228Z`. No other process was targeted. `shutdown.json` is preserved in the run directory, and the isolated database, PDF and logs remain available for an explicitly unblocked continuation. Browser upload approval and the shared-geometry decision remain unresolved; these URLs do not currently serve the app.

All storage paths are explicit: `DB_PATH`, `SOURCE_BLOB_DIR`, `CANVAS_ASSET_DIR`, `UPLOAD_DIR`. `DOTENV_CONFIG_PATH` points to a newly written empty synthetic file; `COINCIDES_VALIDATION_ENV_DIR` points to the empty directory. `COINCIDES_APP_DATA_DIR` points to a newly created OS temporary directory because the production credential store rejects repository paths; this avoids its fallback to the user's local provider store. No actual `.env` key values or credential stores were read.

## Measured coordinate contract

The fresh migrated synthetic database had `SELECT * FROM database_meta` = `[]`, and `readCoordinateContract(db)` returned `v1`. Migration 056 creates the metadata table without setting the v2 contract. The seed then explicitly set only this synthetic database's `coordinate_contract` to `v2`; both SQL readback and `readCoordinateContract(db)` returned `v2`. This is evidence for the isolated validation target, not a claim about the prohibited user database.

## Commands and prohibited aggregate stages

The exact root `verify:v2-bn8-runtime` aggregate includes `git diff --check` and `check:changed-file-secrets`. It must not be executed verbatim for this order. The existing `scripts/run-isolated-coordinate-validation.mjs` also invokes Git before any work. The existing `scripts/run-text-range-validation.mjs` default mode also eventually invokes Git. Neither default runner is valid here.

Allowed functional/build/static stages, run with the isolated environment above:

| Purpose | Command / scope |
| --- | --- |
| Shared types | `node server/node_modules/typescript/bin/tsc -b shared/tsconfig.json` |
| Client typecheck | From `client`: `node node_modules/typescript/bin/tsc -b --noEmit` |
| Server typecheck | From `server`: `node node_modules/typescript/bin/tsc --noEmit` |
| Client full collection | Vitest programmatic `startVitest('test', [], { run:true, watch:false }, { envFile:false })`; report any safety-class exclusions separately |
| Client build | Client `tsc -b`, then Vite programmatic `build({ envFile:false })` with existing config |
| Server build | `npm run build` from `server` |
| Source regressions | From `server`: `node --import tsx --test src/__tests__/v2SourceMaterialization.test.ts src/__tests__/v13CoordinateContract.test.ts`, plus the new 13.6 functional suites after review |
| Manifest projection tests | `npm run test:tool-face-manifest` |
| Manifest static gate | `npm run check:tool-face-manifest` |
| Human/tool mapping static gate | `npm run check:tool-face-parity` |
| Server/shared import gate | `npm run check:server-shared-runtime-import` |
| Runtime/shell gates | `check:canvas-runtime-boundary`, `check:group-gallery-shell`, `check:groups-rail-shell`, `check:single-editor-shell` |
| Source/lifecycle static gates | `check:source-experience`, `check:v2-bn11-legacy-shutdown`, `check:v2-bn11-relation-freshness` |
| Canvas model/performance | `smoke:canvas-engine-model-contract`, `smoke:canvas-engine-performance` |
| Documentation | `docs:check`; its index freshness can fail independently of implementation (B1e recorded pre-existing index drift) |

Explicitly exclude `git diff --check` and `check:changed-file-secrets`. The registry test suite contains an existence-disclosure assertion; the parity test suite tests internal/test exposure leaks. Following the B1e evidence's classification, exclude `test:tool-face-registry` and `test:tool-face-parity` instead of treating them as functional-only. Their production static counterparts are still allowed. Client `ProvidersSection.test.tsx` has the suite title `Settings provider credential controls`; if filtering safety-class titles, report that suite's skipped count and do not label the unfiltered full aggregate green.

## Browser acceptance sequence

1. Log in to the isolated Vite URL, open Sources, and import the five-page synthetic PDF using the UI.
2. Wait for Ready, open its reading projection, inspect all five source pages, and measure source blocks against the 760-column content region. Confirm no left truncation, the title `Projection Alignment (2)` and the import description.
3. Return to Sources, open the rematerialize preview, confirm all six counts and annotation-removal text, then execute.
4. Reopen the new note, repeat the frame/block geometry and cover checks, and compare page appearance. Verify persistence and receipt contents directly only in the synthetic database.
5. Save screenshots and measured JSON under this audit directory; keep generated PDF, SQLite and build outputs under scratch paths.

## Deletion and existing B1e observations

- `note_blocks` has no `note_id` FK (migration 015), so deleting the old note cascades placements but leaves block truths. Precollect old projection block IDs, reject external references, and explicitly delete the old block rows in the same replacement transaction. Otherwise deterministic IDs collide on the next publication.
- `annotation_truths` and `annotation_ranges` both cascade with note deletion (migration 036); the receipt should `SELECT *` without status filtering. `getProjectionUserWork` counts active annotations only, so its count query cannot also serve as the complete annotation snapshot.
- `content_mounts.target_id` and `board_text_ranges` source identities deliberately lack block FKs. The old six-count query sees external note placements only, so rematerialization must also reject live mounts / board ranges before deleting old blocks. Root builder owns that implementation.
- A receipt table with the six specified columns, no `course_id`, and no course FK requires no `courseLifecyclePolicies` entry. That registry discovers `course_id` columns and FKs to `courses`.
- Current B1e sources already gate wall rendering, hook, and history by Layout mode. Source read-only policy separately disables wall edits. `normalizePageFramePrintBaseline` preserves persisted custom insets and tall frame height, so 13.6 shared A4 geometry changes need not alter B1e interactions.
