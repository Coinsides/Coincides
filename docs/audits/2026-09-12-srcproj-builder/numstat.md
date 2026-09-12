# Per-turn numstat

Per-turn initial working-tree UTF-8 snapshot; CRLF-normalized line LCS; no Git or .git access. numstat files exclude themselves to avoid recursive bookkeeping.

Product/tests/generated inventory/handoff: **23 files, +1589 / -91**.

| + | - | File |
| ---: | ---: | --- |
| 26 | 0 | `client/src/locales/en/translation.json` |
| 26 | 0 | `client/src/locales/zh/translation.json` |
| 6 | 11 | `client/src/pages/Notes/canvasEngine/pageFramePrintScaleService.ts` |
| 11 | 1 | `client/src/pages/Sources/SourceDetailDialog.tsx` |
| 37 | 0 | `client/src/pages/Sources/SourceLibrary.module.css` |
| 27 | 1 | `client/src/pages/Sources/SourceLibrary.tsx` |
| 15 | 0 | `client/src/pages/Sources/SourceList.tsx` |
| 195 | 0 | `client/src/pages/Sources/SourceReprojectionDialog.test.tsx` |
| 180 | 0 | `client/src/pages/Sources/SourceReprojectionDialog.tsx` |
| 33 | 9 | `client/src/pages/Sources/sourceApi.ts` |
| 55 | 0 | `docs/agent-ops/handoffs/2026-09-12-v13-6-source-projection-repair-order.md` |
| 19 | 18 | `docs/generated/object-inventory.md` |
| 11 | 4 | `server/src/__tests__/v13CoordinateContract.test.ts` |
| 283 | 0 | `server/src/__tests__/v13SourceProjectionRepair.test.ts` |
| 253 | 0 | `server/src/__tests__/v13SourceReprojection.test.ts` |
| 30 | 0 | `server/src/db/migrations/069_v13_source_reprojection_receipts.ts` |
| 12 | 0 | `server/src/routes/sources.ts` |
| 34 | 6 | `server/src/services/courseLifecycle.ts` |
| 9 | 0 | `server/src/services/sourceMaterialization.ts` |
| 103 | 0 | `server/src/services/sourcePageFurniture.ts` |
| 77 | 41 | `server/src/services/sourceProjectionMaterializer.ts` |
| 140 | 0 | `server/src/services/sourceReprojection.ts` |
| 7 | 0 | `shared/types/pageGeometry.ts` |

Evidence (excluding this numstat pair): **33 files, +4626 / -0**.

| + | - | File |
| ---: | ---: | --- |
| 14 | 0 | `docs/audits/2026-09-12-srcproj-builder/database-meta-setup.json` |
| 640 | 0 | `docs/audits/2026-09-12-srcproj-builder/materialization-regression.log` |
| 522 | 0 | `docs/audits/2026-09-12-srcproj-builder/pipeline-tests-pending-geometry.log` |
| 636 | 0 | `docs/audits/2026-09-12-srcproj-builder/reprojection-tests.log` |
| 69 | 0 | `docs/audits/2026-09-12-srcproj-builder/smoke-setup.md` |
| 22 | 0 | `docs/audits/2026-09-12-srcproj-builder/smoke-shutdown.json` |
| 1484 | 0 | `docs/audits/2026-09-12-srcproj-builder/source-targeted-final.log` |
| 271 | 0 | `docs/audits/2026-09-12-srcproj-builder/verification-logs/verification-client-tests-1789193938013-client-full-functional.log` |
| 8 | 0 | `docs/audits/2026-09-12-srcproj-builder/verification-logs/verification-client-tests-1789193938013-results.json` |
| 10 | 0 | `docs/audits/2026-09-12-srcproj-builder/verification-logs/verification-docs-only-1789194103039-docs_check.log` |
| 8 | 0 | `docs/audits/2026-09-12-srcproj-builder/verification-logs/verification-docs-only-1789194103039-results.json` |
| 8 | 0 | `docs/audits/2026-09-12-srcproj-builder/verification-logs/verification-manifest-tests-1789193996370-results.json` |
| 79 | 0 | `docs/audits/2026-09-12-srcproj-builder/verification-logs/verification-manifest-tests-1789193996370-test_tool-face-manifest.log` |
| 14 | 0 | `docs/audits/2026-09-12-srcproj-builder/verification-logs/verification-server-final-1789194187212-results.json` |
| 80 | 0 | `docs/audits/2026-09-12-srcproj-builder/verification-logs/verification-server-final-1789194187212-server-build-final.log` |
| 181 | 0 | `docs/audits/2026-09-12-srcproj-builder/verification-logs/verification-static-1789193937878-check_canvas-runtime-boundary.log` |
| 9 | 0 | `docs/audits/2026-09-12-srcproj-builder/verification-logs/verification-static-1789193937878-check_group-gallery-shell.log` |
| 9 | 0 | `docs/audits/2026-09-12-srcproj-builder/verification-logs/verification-static-1789193937878-check_groups-rail-shell.log` |
| 5 | 0 | `docs/audits/2026-09-12-srcproj-builder/verification-logs/verification-static-1789193937878-check_server-shared-runtime-import.log` |
| 9 | 0 | `docs/audits/2026-09-12-srcproj-builder/verification-logs/verification-static-1789193937878-check_single-editor-shell.log` |
| 10 | 0 | `docs/audits/2026-09-12-srcproj-builder/verification-logs/verification-static-1789193937878-check_source-experience.log` |
| 75 | 0 | `docs/audits/2026-09-12-srcproj-builder/verification-logs/verification-static-1789193937878-check_tool-face-manifest.log` |
| 5 | 0 | `docs/audits/2026-09-12-srcproj-builder/verification-logs/verification-static-1789193937878-check_tool-face-parity.log` |
| 9 | 0 | `docs/audits/2026-09-12-srcproj-builder/verification-logs/verification-static-1789193937878-check_v2-bn11-legacy-shutdown.log` |
| 9 | 0 | `docs/audits/2026-09-12-srcproj-builder/verification-logs/verification-static-1789193937878-check_v2-bn11-relation-freshness.log` |
| 6 | 0 | `docs/audits/2026-09-12-srcproj-builder/verification-logs/verification-static-1789193937878-docs_check.log` |
| 80 | 0 | `docs/audits/2026-09-12-srcproj-builder/verification-logs/verification-static-1789193937878-results.json` |
| 73 | 0 | `docs/audits/2026-09-12-srcproj-builder/verification-logs/verification-static-1789193937878-smoke_canvas-engine-model-contract.log` |
| 18 | 0 | `docs/audits/2026-09-12-srcproj-builder/verification-logs/verification-static-1789193937878-smoke_canvas-engine-performance.log` |
| 76 | 0 | `docs/audits/2026-09-12-srcproj-builder/verification-logs/verification-types-build-1789193937778-client-build-vite.log` |
| 38 | 0 | `docs/audits/2026-09-12-srcproj-builder/verification-logs/verification-types-build-1789193937778-results.json` |
| 80 | 0 | `docs/audits/2026-09-12-srcproj-builder/verification-logs/verification-types-build-1789193937778-server-build.log` |
| 69 | 0 | `docs/audits/2026-09-12-srcproj-builder/verification.md` |
