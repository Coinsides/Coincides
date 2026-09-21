> **状态 (Status)**: stopped — required local OCR cannot launch under this session's execution permissions
> **日期**: 2026-09-21
> **范围**: T5 builder / server regression and runtime-gate inspection

# Server verification — T5

## Result

The full server inventory was submitted with **111 files, zero exclusions, 600000 ms per-file timeout, concurrency 4**. The run returned **exit 1: 1118 tests, 1115 passed, 3 failed, 0 cancelled, 0 skipped, 0 todo, 0 flaky retries**. Node's reported duration was **100311.6327 ms**. The required local OCR failed at Python process launch, not at a 120-second test timeout. This is **not a passing full-server regression**.

Execution stopped after the permission conflict was established. No server test/source, dependency, external Python installation, agent instructions, git state, or user database was changed. No new test was started after the stop-line finding. The separate `npm_execpath` runner omission remains uncorrected in this run, so its failure is reported rather than waived.

## Invocation and isolation

Working directory: `D:/Coinsides/v2.x/Coincides/server`.

```powershell
$testFiles = @(Get-ChildItem -LiteralPath 'server/src','server/scripts' -Filter '*.test.ts' -Recurse -File |
  Sort-Object FullName | ForEach-Object { $_.FullName })
# Enumeration above ran from the repository root; assert count == 111, then cd server.
node ../scripts/run-server-test-suite.mjs --test-timeout=600000 --test-concurrency=4 @testFiles
```

The exact ordered file list is preserved in `.codex-tmp/t5-print/server-tests-files.txt`. The existing wrapper isolates `CANVAS_ASSET_DIR` and `SOURCE_BLOB_DIR` in a system temporary directory. The parent invocation additionally set `DB_PATH=:memory:`, `NODE_ENV=test`, a fresh system-temporary `COINCIDES_APP_DATA_DIR`, and an empty temporary dotenv file. Inherited Anthropic/OpenAI/DeepSeek/DashScope/generic/Voyage keys, `ANTHROPIC_AUTH_TOKEN`, and `NODE_OPTIONS` were cleared without reading or printing their values.

The inventory includes `server/scripts/v13WildernessExecute.test.ts`, `v2SourceMineruWiring.test.ts`, and `v2SourceRegionCells.test.ts`. Wilderness executor synthetic preview/execute/rollback coverage ran; no real user library was supplied. Provider regressions use their existing synthetic credentials and fetch/SDK mocks; no remote provider call was intentionally enabled. The local OCR fixture reads the existing selection sample and attempts its pinned MinerU subprocess, as explicitly required by T5.

Run timestamps: **2026-09-21 21:14:57.497 UTC → 21:16:38.952 UTC**. Node: **v22.22.1**.

## Three recorded failures

| Suite | Observed failure | Evidence |
| --- | --- | --- |
| `server/src/__tests__/v2SourceMineruWiring.test.ts` | Existing line 60 resolves `python.exe` through PATH at module load. Child launch returns `spawnSync python.exe ENOENT`; suite exits 1 before its tests can run. `Get-Command python.exe` also returned no executable. | `server-full.stdout.log:61782` onward; failed suite at line 61806 |
| `server/src/__tests__/v2SourceRegionCells.test.ts` | Required real OCR raises `SourceArtifactError`, `code: parser_failure`: pinned venv launcher exits **101**, unable to create its configured base Python process. Test duration **2120.0453 ms**. | `server-full.stdout.log:62646–62659` |
| `server/src/__tests__/v2TestV2ManifestHook.test.ts` | Existing line 32 asserts `npm_execpath`; the direct-Node invocation did not inherit npm's lifecycle variable. No code failure is inferred; no recovery run was performed after the OCR permission conflict. | `server-full.stdout.log:63716–63733` |

The Python launch error named:

```text
C:\Users\70208\AppData\Roaming\uv\python\cpython-3.12.11-windows-x86_64-none\python.exe
```

Read-only follow-up at **21:17:21–21:17:22 UTC** established the stop-line condition:

- Both the base executable above and `D:/Coinsides/v12.9-selection/tools/mineru/.venv/Scripts/python.exe` exist.
- The venv's existing `pyvenv.cfg` points to that base Python.
- Direct `basePython -B --version` failed with **Access is denied**, PowerShell `NativeCommandFailed` / `ApplicationFailedException`; no process exit code exists because it did not launch.
- `pinnedVenvPython -B --version` returned **101** and `Unable to create process using ...` for the same base path in the tool response (session observation; not captured in the transcript). The primary on-disk evidence for **exit 101** is the original full-suite error at **`server-full.stdout.log:62652`**.
- The session runs as `Fish\CodexSandboxOffline` and does not permit approval escalation. No ACL, interpreter, PATH, dependency, or external environment repair was attempted.

This proves a local execution-permission conflict for the required OCR runtime. It does not prove which underlying Windows permission mechanism owns the denial. The PATH failure is a separate launch-environment omission; changing PATH alone would not cure the confirmed base-Python access denial.

## Runtime gate inspection

`package.json` defines 27 sequential components in `verify:v2-bn8-runtime`. T5 leaves `git diff --check` and `check:changed-file-secrets` with HQ, so the correct builder scope is **非 git/secrets 25 组件**. Those components, in order:

1. `check:test-wiring`
2. `test:agent-knowledge`
3. `check:agent-knowledge`
4. `check:tech-debt-table`
5. `test:unit`
6. `test:tool-face-registry`
7. `test:tool-face-manifest`
8. `check:tool-face-manifest`
9. `test:tool-face-parity`
10. `check:tool-face-parity`
11. `check:server-shared-runtime-import`
12. `check:owned-helper-contract`
13. `test:owned-helper-contract`
14. `check:canvas-runtime-boundary`
15. `check:group-gallery-shell`
16. `check:groups-rail-shell`
17. `check:single-editor-shell`
18. `check:source-experience`
19. `check:v2-bn11-legacy-shutdown`
20. `check:v2-bn11-relation-freshness`
21. `smoke:canvas-engine-model-contract`
22. `build:client`
23. `build`
24. `smoke:canvas-engine-performance`
25. `docs:check`

This subtask inspected that gate but did not execute the 25 components separately. `check:agent-knowledge` writes only with explicit `--update` (not present in the gate); docs generators run with `--check`; the manifest checker runs with `--check`. The full server regression's existing `v2McpArtifact.test.ts` itself invokes the server build with an isolated manifest-copy fixture; this existing behavior was retained and disclosed to the main builder to avoid simultaneous server builds.

## Raw evidence

- `.codex-tmp/t5-print/server-tests-files.txt` — exact 111-file inventory.
- `.codex-tmp/t5-print/server-run-metadata.json` — command, isolation path, timeout, start timestamp, zero exclusions.
- `.codex-tmp/t5-print/server-run-result.json` — exit, count, timeout, concurrency and end timestamp.
- `.codex-tmp/t5-print/server-full.stdout.log` — complete TAP output; summary at lines **65923–65931**.
- `.codex-tmp/t5-print/server-full.stderr.log` — separate wrapper stderr (empty for this run).
- `.codex-tmp/t5-print/python-launch-probe.log` — read-only probe transcript, including the full PowerShell access-denied error. PowerShell's deferred formatting omitted some normal stdout from the transcript; the tool response and the explicit result receipt below preserve the observed launcher exit.
- `.codex-tmp/t5-print/python-launch-probe-result.json` — derived receipt of file existence and the two observed launch outcomes from the tool response; it is not a raw process log. Exit 101 has independent raw evidence at `server-full.stdout.log:62652`.

The main builder was notified immediately after the three failures were extracted and again immediately after the access-denied probe confirmed the stop-line conflict.
