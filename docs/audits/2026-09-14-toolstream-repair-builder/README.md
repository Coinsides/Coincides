> **状态 (Status)**: active
> **层 (Layer)**: 验证证据 / Builder evidence
> **日期 (Updated)**: 2026-09-14
> **权威 (Authoritative)**: 否；实施回执见工单 Result，放行留 HQ

# 工具流修复验证证据

工单：[2026-09-14-v14-toolstream-repair-order.md](../../agent-ops/handoffs/2026-09-14-v14-toolstream-repair-order.md)。本目录是本单的实现、测试与边界证据，不代表外网模型或主观体验验收。

> **HQ 收口注记（2026-09-14）**：下文各时间戳目录原含约 8.8M 原始跑批日志，违反工单「⛔原始日志入证据目录」条款；HQ 已将原始日志整体移至 `.codex-tmp/toolstream-repair-runs/`（本机保留、不入库），每目录的 `summary.json` / `aggregate.json`（命令、分母、计数、退出码、日志索引）抽入 `run-summaries/` 入库。下文引用按此对照。

- `run-validation.mjs`：本单一次性证据执行器，沿用上单隔离方案；不改项目 package scripts、检查门或豁免表。server 全量动态枚举 `server/src` 与 `server/scripts` 下全部 `.test.ts`；本次另行枚举确认这两棵树无 `.test/.spec` 的 JS/MJS/CJS/TSX 文件。全量无用例过滤。
- `targeted-2026-09-14T07-19-40-098Z-30224/`：已有 provider 与 Agent route 两个测试文件，62/62 通过，含本单新增 15 个协议用例与 13 个 HTTP 集成用例。
- `gates-2026-09-14T07-15-39-975Z-35160/`：原 runtime 门的全部 21 个非 Git/secrets 子检查。初次测试文件接线失败保留原始日志；client 全库 171 个文件 / 1746 条通过，其余 19 个子检查通过。
- `closeout-2026-09-14T07-20-11-507Z-38764/`：新增用例合回已有测试文件后，接线检查 84/84、0 豁免、0 未接线；最终 server build 与 docs check 通过。项目机关没有改动。
- `server-full-2026-09-14T07-20-11-312Z-40056/`：首轮多文件全量，报告 797 tests / 794 pass / 3 fail / 0 skipped；一项 Node 测试 IPC 反序列化异常、两项 Python/MinerU 环境失败。不能作为全绿证据，故继续逐文件全量复跑。
- `server-full-serial-2026-09-14T07-23-41-188Z-10420/`：全部 84/84 文件逐文件执行，82 文件通过、2 文件 Python/MinerU 环境失败；815 tests / 813 pass / 2 fail / 0 cancelled / 0 skipped。原 IPC 失败文件逐文件通过。`aggregate.json` 逐项累加该目录 `summary.json` 中全部 `.test.ts` 步骤的计数，保留分母和失败日志索引；文件级启动失败不代表其内部用例已执行。
- `smoke-long-arguments.ts` 与 `smoke-long-arguments-result.json`：本机 HTTP 分块 provider → 真实 OpenAIProvider → orchestrator → executor → organized_note 服务 → 隔离 SQLite/收件箱 API。384 份合成材料；15110 字符成功创建 pending 提案，15091 字符截断向模型返回错误且不创建提案；空枪 **0/2**。

## 复跑方式与隔离

从仓库根执行 `node docs/audits/2026-09-14-toolstream-repair-builder/run-validation.mjs <mode>`，支持 `targeted / gates / server-full / server-full-serial / client-full / typechecks / closeout`。`targeted` 默认选已接线的 `providers/index.test.ts` 和 `v14ContextHint.test.ts`，亦可显式指定已发现的测试路径。每次保存命令、文件分母、计数、退出码和日志。

`docs-final` 模式在工单 Result/status 回填后运行既有索引生成器与 docs:check，仅同步文档派生索引并验证最终文档。

长参数冒烟从 `server/` 执行：`node --import tsx ../docs/audits/2026-09-14-toolstream-repair-builder/smoke-long-arguments.ts`。

执行器只继承操作系统路径环境；使用 `DB_PATH=:memory:`、独占的系统临时 appdata/assets/uploads/source-blobs、空 dotenv 文件与空 Vite env 目录。新造凭据形合成值均不超过 20 字符。临时删除仅针对自建、已核验在系统临时目录内的绝对路径。没有读取真实 `.env` key、用户数据库或机器 provider 凭据。

## 证据边界

`max_tokens=16384` 对齐 Anthropic；有工具的 OpenAI 兼容请求显式 `parallel_tool_calls=true`。错误诊断仅保留工具名、finish_reason、JS 字符串长度与最多 32 个 UTF-16 code units 的前缀；短串同样不完整回显。失败参数不送 executor，模型收到对应 ID 的 ToolResult 错误。

本机重放使用合成 provider，`liveModelCall=false`、`authenticatedBrowserJourney=false`。没有用真实外部模型估算空枪率；0/2 只适用于这两次确定性重放。client 未修改，既有消费者兼容新增 `id/ok` 字段，尚未按它们展示并发身份与失败态。

Git/secrets 两个检查按工单留 HQ，未运行任何 git 命令，未碰 `.git`，未 commit。未设计新的安全对抗用例，既有回归零排除；Python/MinerU 环境修复留 HQ，未安装依赖或改变解释器配置。
