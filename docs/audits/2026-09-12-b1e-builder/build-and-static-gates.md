# B1e builder — build and allowed static/model checks

Date: 2026-09-12. Executor: Codex builder walls sub-agent.

Only the commands below were executed. The combined `verify:v2-bn8-runtime` script was not run because it contains `git diff --check` and the secret scanner, both outside this task's authorization. No Git command, security test, `.env` read, or frozen audit edit was performed. Build output stayed in the configured `client/dist`, `server/dist`, `shared/dist`, and `.codex-tmp` locations; this audit directory contains logs and reports only.

## Build results

| Command | Result | Evidence |
| --- | --- | --- |
| `client/node_modules/.bin/tsc -b shared/tsconfig.json` | PASS (exit 0) | `build-shared-result.json`, `build-shared.log` |
| `npm --prefix server run build` | PASS (exit 0); manifest current, 14 entries / 14 public | `build-server-result.json`, `build-server.log` |
| `npm --prefix client run build` | Initial attempt: 3 TypeScript diagnostics; appearance union missing twice and unsupported test `exact` option once. Reported for repair; appearance sub-agent owns the final rerun. | `build-client-result.json`, `build-client.log` |
| `npm --prefix client run build` (final desktop CSS) | PASS (exit 0), TypeScript and Vite; built in 3.78 s. Existing bundle-size advisory remains. | `desk-build-final.log` |

The client command set `COINCIDES_VALIDATION_ENV_DIR` to `D:\Coinsides\v2.x\Coincides\.tmp\b1e\empty-env`; `vite.config.ts` consumes it as `envDir`. This prevents loading project `.env` files. The server build runs manifest validation, TypeScript compilation, and manifest copy; it does not start the server or import environment configuration.

## Allowed verification gates

All nine command groups passed, each exit 0; see `static-gates-results.json` for exact commands and logs.

| Gate | Result |
| --- | --- |
| canvas runtime boundary | 168 checks passed; repeated after final desktop spread-paint CSS, again 168 passed (`desk-boundary-final.log`) |
| group gallery shell | 8 checks passed |
| single editor shell | Passed |
| groups rail shell | Passed |
| V2.BN.11 legacy shutdown | Passed |
| V2.BN.11 relation freshness | Passed |
| source experience | Static contract and compiled model contract both passed |
| canvas engine model contract | 60 groups passed |
| canvas engine performance | 5 scenarios passed, total reported 14.25 ms; synthetic loads of 50, 200, 80, 120, and 160 blocks |

These checks are static/model checks and do not claim real-browser or database smoke coverage. Client full-suite verification and real-browser smoke are coordinated by the main builder thread.

## Desktop overflow and print inspection

The final desktop extension uses a solid spread box-shadow on the page host. It does not change the layout box measured by `usePageReadingPresentation`, nor does it contribute to scrollable overflow. The existing app scrollport clips its paint; the selector excludes modal hosts and canvas mode. `min-width: fit-content` was rejected by the main builder after browser inspection because it changed placement and did not cover the entire horizontal overflow.

No additional print reset is needed: `NotePrintLayer` portals its print root to `document.body`; its print CSS hides every other body child and descendant with `visibility: hidden !important`. The screen host and its background/spread paint are consequently hidden, while the print tree does not match the page-host selector. This is a source inspection, not a new print smoke claim.
