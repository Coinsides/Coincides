> **状态 (Status)**: completed / environment-blocked — 全量已执行，未全绿，待 HQ 机复验
> **日期**: 2026-09-21
> **范围**: T5 builder 第二轮 / server 全量回归与私有测试启动器
> **权威**: 否；本文件为执行证据，权限与验收以工单为准

# Server 验证第二轮

## 结论

按工单补遗一完成全量执行：**111 文件、零排除、600000 ms/文件、并发 4**。退出码 **1**；Node TAP 汇总 **1118 tests / 1116 pass / 2 fail / 0 cancelled / 0 skipped / 0 todo / 0 flaky retries**，Node duration **214636.1826 ms**。两败均为已知 Python 启动环境阻断；本轮没有观测到已运行产品断言失败。此结果**不是 server 全绿**，受阻 suite/子断言未获得成功执行证据，仍须 HQ 机复验。

开始 **2026-09-21T21:26:07.580Z**，结束 **2026-09-21T21:29:49.205Z**，外层实耗 **221625 ms**。全程等待正常结束，未按 120 秒判红、未取消、未排除 Python 测试。

## 调用、清单与隔离

仓根运行：

```powershell
node .codex-tmp/t5-print/round2-server-runner.mjs
```

私有启动器枚举 `server/src` 与 `server/scripts` 下全部 `*.test.ts`，硬断言文件数为 111，并检查 `scripts/v13WildernessExecute.test.ts`、`src/__tests__/v2SourceMineruWiring.test.ts`、`src/__tests__/v2SourceRegionCells.test.ts` 均在清单。实际子命令（cwd=`server`）：

```text
node ../scripts/run-server-test-suite.mjs --test-timeout=600000 --test-concurrency=4 <111 个已记录的绝对路径>
```

完整有序 argv 见 `.codex-tmp/t5-print/round2-server-metadata.json`，清单见 `round2-server-inventory.json`。Node **v22.22.1**。

外层显式 `DB_PATH=:memory:`、`NODE_ENV=test`；`COINCIDES_APP_DATA_DIR` 与空 dotenv 置于系统 Temp 下的新目录 `coincides-t5-round2-server-LXvlAd`，并断言该目录不在仓内。继承的 API key、auth/access token、secret/password 类环境键及 `NODE_OPTIONS` 只删除，不读取或打印值。既有 wrapper 继续以自身系统 Temp 隔离 `CANVAS_ASSET_DIR` 和 `SOURCE_BLOB_DIR`。

Wilderness 用既有合成库执行预览、执行和回滚；未传真实用户库。provider 回归保留已有 mocks 与合成凭据；未启用真实远程模型。真实 OCR 路径读取既有只读样本并实际尝试 pinned MinerU 子进程，未替换为 mock。

## 测试基建分账

本轮仅新增私有 `.codex-tmp/t5-print/round2-server-runner.mjs`，未修改共享测试启动器、任何 server 产品码、测试用例、依赖、外部 Python、PATH、权限或 agent 配置。

| 私有启动器行号 | 做法 |
| --- | --- |
| 16–20 | 全清单与 111 数量/三个必要文件检查，零排除 |
| 21–27 | 系统 Temp 隔离根与空 dotenv，拒绝仓内临时根 |
| 28–30 | 向子进程显式传入有效 `npm_execpath` |
| 31–32 | 清除继承的凭据环境键与 `NODE_OPTIONS` |
| 34、42、49 | 600000 ms 文件预算、真实 spawn、原始 stdout/stderr 与结果回执 |

`npm_execpath` 指向本机已有 `C:/Program Files/nodejs/node_modules/npm/bin/npm-cli.js`。上一轮 `v2TestV2ManifestHook` 的第三败本轮已消除：T-1 复制缺失 dist 目标逐字节一致断言 **PASS**（stdout **63715–63720**），T-2 生命周期接线断言 **PASS**（**63721–63726**）。这是允许的测试启动器修正，不是豁免或产品修复。

## 两项环境阻断

| 文件 / 位置 | 本轮观测 | 原始 stdout 行号 |
| --- | --- | --- |
| `server/src/__tests__/v2SourceMineruWiring.test.ts:60` | 模块加载时调用 PATH 中 `python.exe`，返回 `spawnSync python.exe ENOENT`，该文件以测试失败退出。此文件后续测试无法进入。 | **61783–61814**；suite 失败 **61806** |
| `server/src/__tests__/v2SourceRegionCells.test.ts:183`（调用点 203） | 真实 OCR 进入 pinned MinerU，launcher 返回 **101**：无法创建它所配置的 base Python 进程。`SourceArtifactError` / `parser_failure`，用例实耗 **1978.2574 ms**，不是文件超时。 | **62646–62659**；完整 101 错误 **62652** |

第二项仍指向 `C:/Users/70208/AppData/Roaming/uv/python/cpython-3.12.11-windows-x86_64-none/python.exe`。上一轮已记录直接启动该 base Python 的 Access denied；本轮不重复修改或试图修复权限。依据补遗一，如实归类环境阻断，并继续施工和其余验证；不主张 OCR 已通过。

`v13WildernessExecute` 的入口测试与合成 preview → execute → rollback 路径均通过（stdout **180–191**）。该路径实耗可以超过单个短测试的常见耗时，本轮完整保留 600000 ms 文件预算。

## 原始证据

- `.codex-tmp/t5-print/round2-server-runner.mjs`：本轮私有启动器，可复跑。
- `.codex-tmp/t5-print/round2-server-inventory.json`：完整 111 文件清单。
- `.codex-tmp/t5-print/round2-server-metadata.json`：完整命令与开始、隔离、超时参数。
- `.codex-tmp/t5-print/round2-server-result.json`：退出码、结束时间和外层耗时。
- `.codex-tmp/t5-print/round2-server-full.stdout.log`：完整 TAP；总计 **65910–65918**。
- `.codex-tmp/t5-print/round2-server-full.stderr.log`：空；wrapper 未触发重试。

本子任务没有运行或代替 client 全库、非 git/secrets 25 组件；由主 builder 汇总。既有 `v2McpArtifact` 测试内部照常调用 server build，不将其冒充整个验证门通过。未进行任何 git 写操作。
