> **状态 (Status)**: recorded / builder verification receipt
> **日期 (Updated)**: 2026-09-21 America/Toronto
> **权威 (Authoritative)**: 否；本单执行证据，非产品现状/放行结论
> **工单**: `docs/agent-ops/handoffs/2026-09-21-v14-t8-visual-relations-order.md`

# T8 回归与环境证据

最终 client 全库 **238/238 文件、2463/2463 测试通过**，production build 通过。server 完整纳入 111 文件，**109 文件通过、2 文件环境阻断**。非 git/secrets **25/25 组件最终全部通过**；不宣称 server 或原始 27 组件全门全绿。持久机器收据见同目录 `verification-results.json`，逐项保留精确退出码与首轮/复验。

## 射程与运行方式

- Node `v22.22.1`。PowerShell 的 `npm.ps1` 被执行策略拒绝，执行 npm 命令统一用现有 `node` + `C:/Program Files/nodejs/node_modules/npm/bin/npm-cli.js`，未修改执行策略。
- 原始日志和一次性 runner 均在 `.codex-tmp/t8-relations/`。验证 runner 未修改生产或测试源码；本批施工改动另见墨色/几何收据。未增添依赖，未做 git 写操作。
- server 全量由 `server/src`、`server/scripts` 递归投影所有 `.test.ts`：**111 文件，零过滤、零排除**。`check:test-wiring` 同时报告 `111 wired / 0 exempted / 0 unwired`。
- 使用既有 `scripts/run-server-test-suite.mjs`，参数 `--test-timeout=600000 --test-concurrency=2`；文件预算 600000 ms，无 120 s 外层截断。`v13WildernessExecute.test.ts`、`v2SourceRegionCells.test.ts` 真本地 OCR 均在文件清单。
- 测试 DB 原本使用 `:memory:`/测试临时目录；runner 另设 `DB_PATH=:memory:` 兜底，既有 wrapper 隔离 assets/blobs。应用凭据目录指向新建的系统临时空目录，清空继承的 `*_API_KEY`；provider 功能测试使用既有 fetch mocks。未读取用户库，未调用远程模型，未引入合成凭据。

## server 全量：最终执行轮

命令：`node .codex-tmp/t8-relations/run-server-full.mjs server-full-corrected`

- 清单：`server-full-files.json`，111 文件。
- UTC 开始 `2026-09-22T03:20:58.345Z`，结束 `2026-09-22T03:24:11.014Z`；总耗时约 192.7 s，退出 1。
- 主轮 Node 原始汇总：**1077 reported tests / 1074 pass / 3 fail / 0 cancelled / 0 skipped / 0 todo**。
- 其中 `v2MaterialLibrary.test.ts` 是 Node IPC 的 `Unable to deserialize cloned data due to invalid or unsupported version.` 文件占位失败；既有 wrapper 自动单次隔离重试 **59 tests / 59 pass / 0 fail**，恢复成功。不得把这个 IPC 占位失败与恢复后的 59 条重复计数。
- 最终 **109/111 文件通过，2/111 文件为环境阻断**。未遗留功能断言失败；不宣称 server 全绿。
- `v13WildernessExecute.test.ts` 的 27 条既有功能测试实际执行并通过；未排除执行器补集。
- 最终 `pageFramePrintScaleService.ts` 默认预设变化落盘在全量轮后；`server/scripts/wildernessExecutor/coordinates.ts` 直接导入该模块。因此针对最终源码补跑 `node ../scripts/run-server-test-suite.mjs --test-timeout=600000 scripts/v13WildernessExecute.test.ts`，**27/27 通过，0 skip/cancel，96.6 s，0 IPC retry**，原始日志 `server-wilderness-final.log`。本单没有修改 `normalizePageFramePrintBaseline`，没有改坐标契约。

| 环境文件 | 实际失败 | 归因及收口 |
|---|---|---|
| `server/src/__tests__/v2SourceMineruWiring.test.ts` | 模块加载时 `spawnSync python.exe ENOENT` | 当前 PATH 没有可执行 Python；文件确已进入全量，未将其跳过。HQ 环境复验。 |
| `server/src/__tests__/v2SourceRegionCells.test.ts` | 真 OCR 的 MinerU 退出 101，无法启动固定 UV Python | 样本和固定 venv 存在；独立无模型探针 `spawnSync` 固定 UV `python.exe` 得 `EPERM`，验证是执行权限阻断。HQ 环境复验。 |

原始证据：`server-full-corrected.log`、`server-full-corrected-result.json`、`python-probe.json`、`python-probe.log`。

## server 首轮保留记录（不作为最终轮）

`server-full.log` / `server-full-result.json`：同样完整 111 文件、600000 ms 文件预算；首轮 1114 reported tests / 1100 pass / 14 fail。2 个 IPC 文件 (`v14UiCommands`、`v2BlockRestoreDoor`) 经既有 wrapper 单次重试分别 6/6、4/4 通过。另 10 条 `v2MaterialLibrary` 失败是一次性 runner 把空凭据目录放在仓库内，触发 `providerCredentials.ts` 的“凭据不可在仓库内”保护。runner 改用系统临时空目录后重跑完整 111 文件；该组在最终轮隔离重试 59/59 通过。余下 2 项为上述 Python/MinerU 环境阻断。首轮原始日志保留，不覆写、不将其环境错误包装为产品问题。

## runtime gate：25 个非 git/secrets 组件

从根 `package.json#verify:v2-bn8-runtime` 的真实命令串投影；27 组件中 **`git diff --check` 与 `check:changed-file-secrets` 按工单留 HQ**，本单分母固定 **25**。不将 docs 子门拆开增加分母。

基础轮（`node .codex-tmp/t8-relations/run-gate.mjs base`）先执行除 `test:unit`、`build:client` 外的 23 组件：**21 pass / 2 fail**。精确每项命令、时间、退出码见 `gate-base-result.json`，原始日志 `01-...log` 至 `25-...log`。

| 基础轮红项 | 证据与后续 |
|---|---|
| `smoke:canvas-engine-model-contract` | 首轮 PageFrame 创建 y 断言 `expected 112, got 184`；几何施工修正依赖 top=0 的既有夹具/硬值后，验证 agent 独立复跑 **60 groups 全绿**，日志 `21-model-contract-final.log`，首轮红日志保留。 |
| `docs:check` | 首轮 `docs/agent-ops/INDEX.md` 过期；最终 handoff 状态更新、索引生成后，完整 `npm run docs:check` 退出 0（`25-docs-check-docs.log`）。首轮为消除 `&&` 短路遗漏，曾单独补跑 inventory 与 glossary，两者均通过；日志 `docs-inventory-direct.log`、`glossary-direct.log`，不增加组件计数。 |

基础 23 项最终全部通过；末轮 client 全库与 production build 已通过，合计非 git/secrets **25/25 组件退出 0**。git 与 secrets 两项未跑，按工单留 HQ。

client 首轮：238 文件中 233 通过、5 失败；2463 测试中 2451 通过、12 失败，36.14 s。失败集中在 `BoardPage.unboxing`（5）、`BoardNewNoteDialog`（2）、`notePagePresets`（2）、`usePageReadingPresentation`（2）、`usePaperSize`（1）的默认纸面 inset/高度联动；交几何施工核查。首轮原始日志 `05-test-unit-round1.log` 保留。首轮 build 已通过，但 runner 当时统一继承 `NODE_ENV=test`，故不作为最终 production 构建证据；runner 已改为 `build:client` 显式 `NODE_ENV=production`，随修正后的 client 全库再验。原始 build 与两组件收据保留为 `22-build-client-round1.log`、`gate-client-round1-result.json`。

client 第二轮：12 条缺省联动红已消失；全库 238 文件中 228 通过、10 失败，2463 测试中 2449 通过、14 失败。13 条命中既有 5000 ms 测试时限，另 1 条异步 bookmark 等待未到；日志 `05-test-unit-round2.log`。后续以同一全库 `--maxWorkers=2` 再跑，保留原测试时限、零排除，用于验证并发资源饱和归因。本轮显式 production build 已通过，Vite 构建 8.86 s，日志 `22-build-client-client.log`，仅有大包提示。

client 最终全库：`node C:/Program Files/nodejs/node_modules/npm/bin/npm-cli.js --prefix client run test:unit -- --maxWorkers=2`，**238/238 文件、2463/2463 测试通过，136.04 s，退出 0**。未延长既有 5000 ms 测试时限，未过滤、排除或单独替换失败文件。第二轮全部 14 红由同源码全库通过收口，归因为并发/异步等待资源饱和。日志 `05-test-unit-unit.log`、命令与时戳 `gate-unit-result.json`。

全库启动后，root 对测试辅助扫描器的渐变 named color 解析作最后收紧，没有生产改动；对最终辅助源码补跑 scanner **23/23 通过，6.55 s**（`contrast-final-review.log`），`tsc -b` 退出 0（`contrast-final-tsc-build.log`）。root 首次错猜不存在的 `tsconfig.app.json` 所得 TS5058 命令错误保留在 `contrast-final-tsc.log`，不归为源码失败、不增加组件分母。
