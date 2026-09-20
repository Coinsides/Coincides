> **状态 (Status)**: 第二轮件②取证及场景回归完成，待 HQ 复核；不自标债务已清
> **日期 (Updated)**: 2026-09-20
> **范围**: D4 小单② agent-eval live 夹具 segments 播种
> **上游**: [D4 工单](../../agent-ops/handoffs/2026-09-20-v14-d4-three-smalls-order.md)

# live 夹具 segments 核查

**第二轮实况**：06 scripted 对照已补齐，03/06 × live/scripted setup 矩阵共 12/12；claim 实现稳定后，完整 13 scripted 场景 122/122。播种通路已证通，本项零代码改动。细节与原始日志见下方「第二轮补验」；上方第一轮记录保留为停线时事实。

初步结论：现物播种通路已存在，已跑的三份隔离标本均有四种 segments 及对应 fragment 链接；本项零生产代码、零夹具代码改动。整单因③引用判别的规格与原 live 标本条件矛盾暂停，本项未完成全部计划验证，不标记债务已清。

## 现物行号

- `server/scripts/agent-eval/harness.ts:65`：两种模式共用 `scenario.setup(fixture)`。
- `server/scripts/agent-eval/scenarios/03-proposal-journey.ts:22`、`:23`：`listCourseMaterials` 后调用 `ensureSegmentsForMaterial`，不以模式分支限制播种。
- `server/scripts/agent-eval/scenarios/06-loop-resilience.ts:41`、`:42`：同样先无条件播种；`:44` 的 scripted 分支只在其后开启合成计时器。
- `server/scripts/agent-eval/runner.ts:31`：dry-run 输出计划后返回，故 dry-run 本身不是数据库播种证据。

## 已执行证据

`npm.cmd run eval:agent -- --live --dry-run` exit 0，计划模式为 live、provider 为 dashscope，发现 **13 场景**；未启动场景 worker、读取机器凭据或调用模型。原始输出：[eval-live-dry-run.log](../../../.codex-tmp/d4-smalls/eval-live-dry-run.log)。

播种取证使用临时 [eval-segments-probe.mts](../../../.codex-tmp/d4-smalls/eval-segments-probe.mts)。其第 20 行将请求模式仅传给原场景 `setup`，第 62 行仍使用真实 harness 的 **scripted 隔离环境**；`turns: []`，已有 fetch guard 保持启用。没有执行 live provider 分支，也没有假称完整 live 运行。每份标本独立进程、内存 SQLite、空 dotenv 与独占临时资产目录，取证后由原 harness 清理。

| 场景 setup | 断言 | segments | fragment 链接 | provider turns | 原始标本 / 日志 |
|---|---:|---:|---:|---:|---|
| 03 proposal，live | 3/3 | 4 | 4 | 0 | [JSON](../../../.codex-tmp/d4-smalls/eval-segments-03-live.json) · [日志](../../../.codex-tmp/d4-smalls/eval-segments-03-live.log) |
| 03 proposal，scripted | 3/3 | 4 | 4 | 0 | [JSON](../../../.codex-tmp/d4-smalls/eval-segments-03-scripted.json) · [日志](../../../.codex-tmp/d4-smalls/eval-segments-03-scripted.log) |
| 06 resilience，live | 3/3 | 4 | 4 | 0 | [JSON](../../../.codex-tmp/d4-smalls/eval-segments-06-live.json) · [日志](../../../.codex-tmp/d4-smalls/eval-segments-06-live.log) |

三份标本合计 **9/9 核查断言**，不是完整场景回归断言。每份均有 `documents`、`document_chunks`、`source_materials`、`source_fragments` 各 1 行；material 的 `fragment_status=ready`、`segment_status=proposed`。四种 segment 为 `document`、`heading`、`page_range`、`chunk_group`，均属同一合成用户/课程/material、`status=proposed`、页码 1–1，每枚链接到实际播种的 fragment。

首次命令曾因相对路径多一级及 PowerShell 的 `npm.ps1` 执行策略未能启动；改为正确的 `../.codex-tmp/` 与 `npm.cmd` 后完成上述运行。这些未启动的命令不计入验证分母。

## 停线边界

未执行 06 scripted setup 对照、03/06 完整 scripted 场景回归、harness 自测或新增测试；未执行真实模型调用、读取用户库、操作真实凭据。未改 harness 架构、脚本场景、生产服务、prompt、schema、依赖或台账，也未进行任何 git 写操作。评测场原工单的台账追加未完成；本文件仅保存停线前事实，整单停止理由由主 builder 在 D4 工单 Result 举证。

## 第二轮补验（2026-09-20）

按 D4 补遗一恢复核查。保留上方停线时事实及原日志；本轮仍为零生产代码、零场景及 harness 改动。

### 06 scripted setup 对照

沿用原 probe，命令在 `server/` 执行：

```text
node --import tsx ../.codex-tmp/d4-smalls/eval-segments-probe.mts 06-loop-resilience scripted ../.codex-tmp/d4-smalls/r2-eval-segments-06-scripted.json
```

**exit 0，3/3**。`documents`、`document_chunks`、`source_materials`、`source_fragments` 各 1 行；`material_segments` 4 行、`material_segment_fragments` 4 行。四种 segment 及其真实 fragment 链接与第一轮 06 live setup 的核查结果一致；provider turns 为 0。标本 [JSON](../../../.codex-tmp/d4-smalls/r2-eval-segments-06-scripted.json)、[日志](../../../.codex-tmp/d4-smalls/r2-eval-segments-06-scripted.log) 与[两模式对照摘要](../../../.codex-tmp/d4-smalls/r2-eval-segments-06-comparison.json) 已保留。

连同第一轮三份标本，03/06 × live/scripted 的 setup 矩阵现为 **4 份、12/12 核查断言**。该数字只表示播种核查，不能当作 live 模型评测。

### 完整 scripted 场景回归

在根目录执行 `npm.cmd run eval:agent`，未传 `--live`、未筛选场景，覆盖当前 **13 场景**。初轮 run `2026-09-20T18-23-52-726Z-345d42cb` **exit 0、122/122**；各场景断言数依次为 **12、4、6、8、11、11、9、12、5、10、20、6、8**，无 executionError 或失败断言。共 **36 用户轮 / 29 工具轮**。

02 空头支票场景 **4/4、claim 1**；09 自然记忆直令场景 **5/5、claim 0**；03 提案 **6/6**、06 循环韧性 **11/11**。读出器全场 claim 计数为 1；失败工具计数为 2（06 的 `create_proposal` 超时与 13 的 `ui_focus_object` 页码超界，均为既有场景预期阳性，不应归零）。

初轮[入口日志](../../../.codex-tmp/d4-smalls/r2-eval-scripted-initial.log)、[完整结果与 scoreboard](../../../.codex-tmp/d4-smalls/r2-eval-scripted-initial-results/scoreboard.json)、[worker 原始日志](../../../.codex-tmp/d4-smalls/r2-eval-scripted-initial-workers/) 均留存；`.eval-runs/` 原运行产物保持原样。最终代码稳定后的复核结果见下方追加。

### claim 实现稳定后的最终复核

主 builder 通知 claim 实现及定向测试已落稳后，再执行同一完整命令 `npm.cmd run eval:agent`。最终 run `2026-09-20T18-27-45-687Z-0eb7f14d`：**exit 0，13/13 场景、122/122 断言、0 失败**；各场景断言数与初轮相同。共 **36 用户轮 / 29 工具轮**，场景耗时合计 **6588.1372ms**。初轮与最终复核不相加为 244 个独立断言。

02 仍为 **4/4、claim 1**；09 仍为 **5/5、claim 0**；03 为 **6/6**、06 为 **11/11**。全场 claim 1、失败工具 2，均保持上述既有阳性意义。全场使用默认 scripted 隔离 worker，既有 fetch guard 生效，无真实模型或用户库调用。

最终[入口日志](../../../.codex-tmp/d4-smalls/r2-eval-scripted-final.log)、[完整结果与 scoreboard](../../../.codex-tmp/d4-smalls/r2-eval-scripted-final-results/scoreboard.json)、[worker 原始日志](../../../.codex-tmp/d4-smalls/r2-eval-scripted-final-workers/) 已复制归档到本单原始证据目录，原 `.eval-runs/2026-09-20T18-27-45-687Z-0eb7f14d/` 保留。

### 件②结论与台账实况

**通，证据了案提交复核**：现物两场景 setup 已在模式分支之前调用真实 segments builder，live/setup 与 scripted/setup 的四份隔离标本全部通过，完整 scripted 场景也通过；无需最小修，未改生产、harness 或场景。已在 [评测场原工单 Result 后](../../agent-ops/handoffs/2026-09-14-v14-agent-eval-harness-order.md) 追加「D4 第二轮 · live segments 挂账核查实况」，写入该核查结论及边界，不改原状态、不自标已清。

本子任务未执行真实 live 模型、未读取真实凭据/用户库、未改 prompt/工具面/schema/依赖、未设计新增安全对抗用例、未做任何 git 写操作。harness 自测、类型检查及 §四 agent/client/server/非 git/secrets 全量门由主 builder 汇总；本节只申报件② setup 与场景取证。
