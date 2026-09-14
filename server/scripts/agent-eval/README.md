# Agent eval v1

在仓库根运行 `npm run eval:agent`。默认 scripted，每场景独立 worker、内存 SQLite、空 dotenv 和独占临时资产目录。只有 provider 回合及场景 5 的 embedding 使用合成数据；原 orchestrator、prompt、工具、写门、删除授权、预算、史记、收据全部执行现物。零新增依赖。

`npm run eval:agent -- --list` 列场景；`--scenario 02-empty-claim` 可重复指定筛选。未知场景/参数、worker 异常、断言失败均退出非零；失败也保留结果。`npm run test:agent-eval` 自测；`npm run typecheck:agent-eval` 检查脚本类型。评测和自测均未接入 verify 总门。

`npm run eval:agent -- --live --dry-run` 只输出计划，不导入场景、不读凭据、不启动数据库或 worker、不发模型请求。未来经 HQ 安排的 `--live` 使用现有机器钥匙库的 dashscope 与合成用户/数据；不继承 provider 环境 key、不读用户库。本单未实跑。未来执行时通过原 resolver 读取 dashscope，在进程内持有，随后切回空凭据目录，避免其他机器 provider 意外联网。

Live 口只采证并检查 SSE/历史传输一致性，**不执行依赖 scripted 注入的六场景判分**：`scenarioAssertionsEvaluated:false`，任务完成率 `0/0, rate:null`，明确输出 `notEvaluatedReason`。原 assertions 保留传输检查结果，传输失败仍退出非零；不把未测项当通过，也不把没有故障注入的正常模型行为误判为失败。live 的场景质量量表与适用性属于后续批。

## 加一个场景

1. 在 `scenarios/` 新增一个 `.ts` 文件，default 导出 `Scenario`（自动发现，无注册表改动）。
2. 填 `name`、`dimensions`、`setup(fixtures)`、`turns:[{user,contextHint?,script}]`、`assertions(ctx)`；动态输入可用函数读取前轮证据。
3. scripted 用 `helpers.tool/answer` 给 provider 回合；嵌套生成以 `definitions.length===0` 区分；必要时 `afterTurn` 排空已接受工作。
4. 用 `await ctx.check('断言名',()=>assert...)` 逐项核原 SSE、`turn.messages/tables/ledger`、`turn.api` 或 `ctx.request('/api/...')`，申报维度。
5. 跑 `npm run eval:agent -- --scenario 文件名不含扩展名` 与 `npm run test:agent-eval`，在工单蒸馏结果。

## 证据与读出

`.eval-runs/<run-id>/`（已忽略）包含 `run.json`、逐场景 JSON（完整 SSE 原字节/事件、逐轮库快照、API 读值、断言及最终库快照）、`scoreboard.json`、`scoreboard.md`。工作进程原始诊断日志在 `.codex-tmp/agent-eval-builder/<run-id>/`；审计目录只放蒸馏件。临时库和资产在场景结束清理，不保留账号、凭据或用户库副本。

采集是原 `routes/agent.ts` POST handler 写出的 SSE bytes；API 读回调用现有 handler，不启应用、不模拟认证、不开户。收件箱、记忆、历史收据和写门收据来自原 GET 路由。现物**没有 events HTTP 读端点**：按工单已授予的隔离库句柄读取 `events`，明确放 `ledger/tables.events`，不虚构 API。handler seam 不覆盖 HTTP socket/JWT 中间件，由既有回归覆盖。每轮公共断言核单次 done/receipt、出生 turn_id、live SSE 与历史 receipt 同值。

量表 JSON 为 `schemaVersion:1`、`runId`、`scenarios[]` 与四组总量；场景项另含 `name/dimensions/mode/scenarioAssertionsEvaluated/notEvaluatedReason?/failures/executionError?`：

| 字段 | 读出依据与口径 |
|---|---|
| `taskCompletion.{passed,total,rate}` | 机器断言通过数/执行断言总数；0 分母为 null；不是用户任务或真实模型成功率 |
| `claimWithoutReceiptCount` | 最终隔离库 `events.verb=claim_without_receipt` 条数；不累加各轮重复快照 |
| `toolMisuse.{count,byTool}` | 原 SSE `tool_end.ok===false`，按 `name` 聚合；包括场景故意制造的超时，不推断主观“误用” |
| `timing.{userTurns,toolRounds,durationMs}` | 已记录用户轮；每轮持久化 assistant 工具调用组数；实际墙钟毫秒，场景总耗时之和（不含父进程启动） |
| `scenarios[].timing.turns[]` | 每轮 `{durationMs,toolRounds}`；fake clock 的 60 秒推进不冒充墙钟耗时 |

原记录还留 `providerRounds`（scripted provider 外层调用诊断值，live 未注入时为 0）；它不是 scoreboard 的轮次来源。使用导出的 `readScoreboard(runId,results)` 可从逐场景 JSON 重放读出，无模型调用。

场景 2 的 1 条空头支票和场景 6 的 1 次失败工具是阳性对照，绿色评测不等于这些计数应为零。删除仪式第一段 `tool_end.ok=true`，但 `turn_receipt.write_fail_count=1`：复述成功不代表删除已完成。超时工具稍后提交也不篡改已保存失败收据。

## 首批场景

| 文件 | 机器断言焦点 | 维度 |
|---|---|---|
| 01 | 三轮目标/子目标/任务行、每轮 SSE/史记/写门收据、撤销注册 | 完成、空头支票、轮次耗时 |
| 02 | 只说“已保存偏好”：1 条窄词观察、零写投影、零记忆 | 完成、空头支票 |
| 03 | 真 organized_note 服务生成 pending/事件/收件箱，笔记零直写 | 完成、空头支票、工具误用 |
| 04 | 两段删除授权、任务解绑、事件/收据、实际撤销恢复 | 完成、工具误用 |
| 05 | 中文 save 去重；semantic-only 样本经检索服务/工具/prompt 三入口命中 | 完成、空头支票、工具误用 |
| 06 | 真 60s 工具预算超时、自纠、晚提交；8 轮触顶和配对历史 | 完成、工具误用、轮次耗时 |

未包含 LLM 评分器、幻觉率、live 实跑和主观验收。此工具未新增应用操作面，应用操作说明书无涉；现有行为仍以说明书为准。
