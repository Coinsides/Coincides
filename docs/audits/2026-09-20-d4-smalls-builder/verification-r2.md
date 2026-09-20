> **状态 (Status)**: active（验收收据；server 全量两项环境受阻、docs 索引过期，非整单放行）
> **层 (Layer)**: Audit / 第二轮验证证据
> **日期 (Updated)**: 2026-09-20
> **权威 (Authoritative)**: 否；记录实跑结果，清债与放行留 HQ

# D4 第二轮 · 全量验收执行证据

## 清点与边界

- 现役 `package.json#verify:v2-bn8-runtime` 共 27 段；`git diff --check` 与 `check:changed-file-secrets` 两组件留 HQ，本轮执行范围为 **非 git/secrets 25 组件**。
- server 全量按 `server/src` 与 `server/scripts` 中所有 `.test.ts` 盘点，**109 文件 = test:v2 主集 82 + 补集 27**。零排除；补集明确包含 `scripts/v13WildernessExecute.test.ts`。
- server 全量与 agent 族通过现役 `scripts/run-server-test-suite.mjs`，传 `--test-timeout=600000 --test-concurrency=4`；不是 120s 文件预算。现役 runner 自建临时素材目录；测试按既有隔离夹具执行。
- 保留现有测试（包括全库原有功能/守卫回归），未新设计安全对抗用例；未调用真实模型、未访问用户库、未读写真实凭据、未执行 git 写操作、未运行留 HQ 的两组件。
- 清点明细、每条命令/开始时刻/退出码/耗时与完整原始日志在 `.codex-tmp/d4-smalls/verification-inventory-r2.json`、`verification-*-r2.json`、`*-r2.log`。临时编排器 `verification-r2.mjs` 仅组合现役命令，未修改生产验证脚本。

## 结果（各组独立报告，不把重复覆盖相加）

| 批次 | 覆盖 | 实跑数字 | 退出码 / 耗时 |
|---|---|---|---|
| client 全库 | 227 文件，零排除 | **2319/2319 pass** | 0；进程 35.026s，Vitest 34.12s |
| server 首跑 | 109 文件 = 82 + 27，零排除 | **1103 总计 / 1100 pass / 3 fail**；cancelled/skip/todo/自动 retry 均 0 | **1**；进程 99.605s，Node 99.066s |
| server 有因重跑 | 同一 109 文件，零排除 | **1103 总计 / 1101 pass / 2 fail**；cancelled/skip/todo/自动 retry 均 0 | **1**；进程 98.826s，Node 98.301s |
| agent 族 | 下列 18 文件 | **260/260 pass**；fail/cancelled/skip/todo/自动 retry 均 0 | 0；进程 7.898s，Node 7.813s |
| runtime 门非 git/secrets | 25 组件 | **24 pass / 1 fail（docs:check）** | 不冒充 25/25 或原 27 段总门通过 |

server 总计中包含无法加载的 `v2SourceMineruWiring.test.ts` 文件级失败，不能把 1103 宣称为该文件内部断言均已运行。原始首跑红保留，后一次数字单列。两次都实际尝试所有 109 文件，没有缩补集、过滤测试名或以超时替代完成。

`v13WildernessExecute.test.ts` 两次均 **28/28**：首跑 TAP 各 case `duration_ms` 合计 **98,814.2204ms**；重跑合计 **98,045.5443ms**。这是同步 case 耗时合计，非另测的文件进程 wall clock。原始日志第 174–337 行覆盖这 28 条；文件预算均 600000ms。

### 两项仍受阻，一项编排问题已纠正

1. `server/src/__tests__/v2SourceMineruWiring.test.ts:60` 在模块加载时用 `execFileSync('python.exe', ...)` 取得解释器。当前 PATH 无 `python.exe`，两轮均 **spawnSync python.exe ENOENT**，尚未进入该文件内部测试。证据：首跑和重跑 `server-full*-r2.log` 第 60834–60865 行；`python-path-r2.log`。
2. `server/src/__tests__/v2SourceRegionCells.test.ts:40` 固定 `D:/Coinsides/v12.9-selection/tools/mineru/.venv/Scripts/python.exe`，`:191` 用该固定值，`:203` 启动真实既有解析回归。venv 文件存在，底层 `C:/Users/70208/AppData/Roaming/uv/python/cpython-3.12.11-windows-x86_64-none/python.exe` 也存在，但对后者执行 **`--version` 返回 Access is denied / NativeCommandFailed**；venv `--version` 返回 **Unable to create process**。原回归因解释器不能启动返回 `parser_failure`，不是 D4 断言不符或 120s 超时。证据：重跑日志第 61696–61709 行；`python-base-r2.log`、`python-venv-r2.log`。没有改固定解释器、外部配置、权限或安装依赖，也没有复制解释器绕过执行限制。
3. 首跑 `server/src/__tests__/v2TestV2ManifestHook.test.ts:32` 缺 `npm_execpath`：由临时编排器直接用 Node 调现役 runner 所致。只给子进程补已核存在的 npm CLI 路径 `C:/Program Files/nodejs/node_modules/npm/bin/npm-cli.js`，不改机器环境、代码或断言；然后**完整重跑原 109 文件**。原 T-1 断言在重跑日志第 62766 行通过。此有因重跑不计为生产 runner 的自动 flaky retry，亦不抹去首跑红。

### 非 git/secrets 25 组件清单

| # | 现役组件 | 结果 |
|---|---|---|
| 1 | check:test-wiring | pass；109 wired / 0 exempted / 0 unwired |
| 2 | test:agent-knowledge | pass；29/29 |
| 3 | check:agent-knowledge | pass；现役知识 fingerprint 无漂移 |
| 4 | check:tech-debt-table | pass；仅现有 TD-6/12/28 grandfathered 提示 |
| 5 | test:unit | pass；227 文件 / 2319 测试 |
| 6 | test:tool-face-registry | pass；5/5 |
| 7 | test:tool-face-manifest | pass；10/10 |
| 8 | check:tool-face-manifest | pass |
| 9 | test:tool-face-parity | pass；10/10 |
| 10 | check:tool-face-parity | pass；静态必要条件，不冒充人类入口体验验收 |
| 11 | check:server-shared-runtime-import | pass |
| 12 | check:owned-helper-contract | pass |
| 13 | test:owned-helper-contract | pass；12/12 |
| 14 | check:canvas-runtime-boundary | pass |
| 15 | check:group-gallery-shell | pass |
| 16 | check:groups-rail-shell | pass |
| 17 | check:single-editor-shell | pass |
| 18 | check:source-experience | pass |
| 19 | check:v2-bn11-legacy-shutdown | pass |
| 20 | check:v2-bn11-relation-freshness | pass |
| 21 | smoke:canvas-engine-model-contract | pass；60 组 |
| 22 | build:client | pass |
| 23 | build | pass |
| 24 | smoke:canvas-engine-performance | pass；5 场景 |
| 25 | docs:check | fail；`docs/agent-ops/INDEX.md` 过期；原链后续两检查未执行，后单独补跑均过，仍不改组件失败判定 |

24 项的独立退出码为 0，docs:check 为 1；见 `verification-first-r2.json`、`verification-second-r2.json`、`verification-final-r2.json`。两留 HQ 组件未执行，不计入 N。

`docs:check` 在主单第二轮 Result 与三处台账落稳后执行。过期差异只两处：现役 INDEX 缺 D4 整条工单记录（415→416 文档），D3a 工单状态仍录 `ready` 而其现物已由 HQ 置 `done`。本轮未改这两个工单的状态头，追加正文不会生成此差异；没有为了过门改 D3a 原文或手改 INDEX。使用现役生成器在临时目录生成期望文本并比对，证据 `docs-index-expected-r2.md`、`docs-index-diff-r2.json`；派生 INDEX 仍未写回。

为补齐原 `&&` 链未执行的只读检查，随后独立运行 **`node scripts/docs-inventory.mjs --check` → exit 0**（`object-inventory.md` 最新），以及 **`npm.cmd run check:glossary-shape-vs-capability` → exit 0，K-1 至 K-3 通过**。原始日志为 `docs-inventory-check-r2.log`、`check-glossary-shape-vs-capability-r2.log`；命令与耗时见 `verification-docs-remainder-r2.json`。这两项补跑不新增 N 的分母，也不将 docs:check 洗为通过；**最终仍为非 git/secrets 25 组件中 24 pass / 1 fail**。

### server 补集 27 文件

下列路径相对 `server/`；主集 82 文件完整枚举见 `verification-inventory-r2.json#main`，全部 109 见同文件 `all`。

```text
scripts/agent-eval/harness.test.ts
scripts/v13WildernessExecute.test.ts
scripts/v13WildernessShadowRun.test.ts
scripts/v14OwnershipContract.test.ts
scripts/v2Bn12LifecycleMigration.test.ts
src/__tests__/v13BoardCeremonyNote.test.ts
src/__tests__/v13BoardIdentity.test.ts
src/__tests__/v13BoardRoutes.test.ts
src/__tests__/v13BoardSchema.test.ts
src/__tests__/v13BoardServices.test.ts
src/__tests__/v13BoardWave1.test.ts
src/__tests__/v13CoordinateContract.test.ts
src/__tests__/v13ItemFloor.test.ts
src/__tests__/v13RecordedAction.test.ts
src/__tests__/v14AttentionContext.test.ts
src/__tests__/v14BoardSandbox.test.ts
src/__tests__/v14EpisodeContext.test.ts
src/__tests__/v14EpisodeStorage.test.ts
src/__tests__/v14IntentRouter.test.ts
src/__tests__/v14NotePatch.test.ts
src/__tests__/v14UiCommands.test.ts
src/__tests__/v2McpArtifact.test.ts
src/__tests__/v2McpTransport.test.ts
src/__tests__/v2NotesLifecycle.test.ts
src/__tests__/v2NotesListService.test.ts
src/__tests__/v2TrashNotesTool.test.ts
src/toolFace/registry.test.ts
```

### agent 族 18 文件

清单亦在 `agent-files-r2.json`。不从这组绿色推导整库绿色；整库剩余两项环境失败仍如上。

```text
scripts/agent-eval/harness.test.ts
src/__tests__/v13AgentMemories.test.ts
src/__tests__/v14AgentKnowledgeProjection.test.ts
src/__tests__/v14AgentRouteLifecycle.test.ts
src/__tests__/v14AgentVerbTransfer.test.ts
src/__tests__/v14AgentWriteDoor.test.ts
src/__tests__/v14AttentionContext.test.ts
src/__tests__/v14ClaimObservation.test.ts
src/__tests__/v14ClaimReceipt.test.ts
src/__tests__/v14EpisodeContext.test.ts
src/__tests__/v14EpisodeStorage.test.ts
src/__tests__/v14IntentRouter.test.ts
src/__tests__/v14LoopRobustness.test.ts
src/__tests__/v14MemoryQuickwins.test.ts
src/__tests__/v14NotePatch.test.ts
src/__tests__/v14TurnIdentity.test.ts
src/__tests__/v14UiCommands.test.ts
src/agent/providers/index.test.ts
```

## 执行备注

临时编排器首次启动时仓库路径多退一级，读取 `package.json` 返回 ENOENT；尚未启动任何验收命令。修正临时脚本路径后正常开始；此项不是产品测试失败或测试重试。client build 保留现有动态/静态混合导入与 chunk 大小警告，退出码为 0。
