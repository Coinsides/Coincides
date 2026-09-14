> **状态 (Status)**: active
> **层 (Layer)**: 验证发现 / Builder evidence
> **日期 (Updated)**: 2026-09-14
> **权威 (Authoritative)**: 否；记录本轮验证的实际边界

# 验证未通过项

## F1 · Anthropic 真机前置未满足

正常应用凭据来源中未解析到 Anthropic key；[预检 summary](live-summary.json) 为 `not_run_missing_anthropic_key`、`apiRequests=0`。这只覆盖该 summary 列出的来源，不宣称整台机器不存在 key。真实多轮缓存写入/读取、行为与 TTFT 留有 key 的机器复跑，不能用本地模拟的协议测试替代。

## F2 · server 全量两处 Python/MinerU 环境失败

本轮动态发现 84 个测试文件（另外枚举 `.test/.spec` 的 TS/TSX/JS/JSX/MJS/CJS/MTS/CTS，其他后缀 0），84 个全部逐文件实际启动。汇总为 **818 tests / 816 pass / 2 fail / 0 cancelled / 0 skipped**，其中 82 文件通过、2 文件失败。计数包含一条顶层文件启动失败，不代表该文件内部用例已执行。[完整计数](server-full-serial-summary.json)

| 文件及失败位置 | 本轮证据 | 判定 |
| --- | --- | --- |
| `server/src/__tests__/v2SourceMineruWiring.test.ts:60` 顶层启动 | 原始 `078-server_src___tests___v2SourceMineruWiring.test.ts.log:5`：`spawnSync python.exe ENOENT` | 解释器未启动，内部用例未展开 |
| `server/src/__tests__/v2SourceRegionCells.test.ts:203` | 原始 `080-server_src___tests___v2SourceRegionCells.test.ts.log:9`：MinerU code 101，`Unable to create process` | Python 启动失败，未到区域几何断言 |

两份原始日志均位于 `.codex-tmp/2026-09-14-prompt-cache-builder/server-full-serial-2026-09-14T07-44-36-255Z-41800/`。与上单 [环境发现](../2026-09-14-toolstream-repair-builder/environment-findings.md) 同形；本单未修改相关代码、测试、解释器配置或依赖，未通过删用例、改预期、安装依赖使其变绿。

## F3 · client 首轮全量选区测试失败

首轮 runtime 的 `test:unit` 为 171 文件 / 1746 tests，170 文件与 1745 tests 通过、1 条失败：`BoardPage.selection.test.tsx:111` 首次框选后找不到 `Selected projections` 工具栏。原始日志为 `.codex-tmp/2026-09-14-prompt-cache-builder/gates-2026-09-14T07-49-21-303Z-39880/004-test_unit.log`。[首轮计数](gates-summary.json)

未改代码、测试或参数，单文件全部 7 项独立复跑 **7/7 pass**。[定向复跑](client-selection-summary.json) 随后原配置复跑 client 全量，**171 文件 / 1746 tests 全部通过**。[全量复跑](client-full-summary.json) 测试仅等待首个成员 DOM，再发指针事件；`BoardPage` 的 viewport ref 由 effect 初始化，未就绪时框选入口直接返回。这是待证实的时序假设，不能凭复跑通过认定根因或宣称已修复。

## HQ 收口边界

按本次用户明确分工，`git diff --check` 和 `check:changed-file-secrets` 未执行。完整 runtime 聚合门、真实 Anthropic 命中和放行均不能标为已通过。代码施工、局部协议验证与本页记录的剩余前置分开申报。
