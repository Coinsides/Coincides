> **状态 (Status)**: partial / 停线前事实取证，非放行
> **日期 (Updated)**: 2026-09-20
> **范围**: D4 小单② agent-eval live 夹具 segments 播种
> **上游**: [D4 工单](../../agent-ops/handoffs/2026-09-20-v14-d4-three-smalls-order.md)

# live 夹具 segments 核查

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
