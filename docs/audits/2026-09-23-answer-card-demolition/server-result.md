> 状态: completed
> 日期: 2026-09-23
> 测试面: 功能 / 回归定向

# 服务端拆除与回归记录

`server/src/agent/orchestrator.ts` 删除 answer-card metadata 构造与 `UPDATE agent_messages SET meta` 写入。保留最终持久 assistant ID/content，成功回合继续通过 `message_meta` 将权威正文交给会话面；此事件现在与选区、答卡无关，meta 为 `{}`。`intent_plan` 的编译、写入、放行及丢弃路径不变。

`v14AttentionContext.test.ts` 将新答卡正断言改为 SSE、历史及持久行均无 `answer_card` 的负断言；覆盖选区仍进入 scripted provider、带/不带选区的多轮最终正文与持久行一致，并加入旧 answer-card 行逐字段保持不变的回归。保留既有字符预算、截断、缺块、失效页、计划及放行历史用例。

`v14AgentRouteLifecycle.test.ts`、`v14ClaimReceipt.test.ts`、`v14LoopRobustness.test.ts` 接纳与答卡脱钩的正文事件。收据通过事件名取出，顺序仍断言 `turn_receipt → message_meta → done`；补持久 message ID/content 对照。错误、断连、超时、8 轮限制、并发回合隔离及收据计数原断言保留。

运行命令：`node docs/audits/2026-09-23-answer-card-demolition/server-run-functional.mjs`。

| 证据 | 结果 | 说明 |
|---|---|---|
| `server-functional-initial.log` | 110 pass / 11 fail / 121 total | 初次回归识别旧用例按倒数位置取收据；通用正文事件改变了尾部位置。 |
| `server-functional-intermediate.log` | 120 pass / 1 fail / 121 total | 新增 8 轮正文断言误从不投影 ID 的测试 helper 取 ID；改为查询实际持久行。 |
| `server-functional.log` | **121 pass / 0 fail / 121 total** | 9 个定向文件；cancelled/skipped/todo/flaky-retries 均为 0。 |
| `server-functional-run.json` | exitCode 0 | Node 版本、文件清单与隔离方式。 |

九个文件：`v14NotePatch`、`v14IntentRouter`、`v14AttentionContext`、`v14ContextHint`、`v14LoopRobustness`、`v14AgentRouteLifecycle`、`v14ClaimReceipt`、`v14TurnIdentity`、`v14EpisodeStorage`。

执行前已审阅 runner、SQLite 初始化、凭据解析及各测试 fixture：全部数据库是 `:memory:`；fixture 凭据目录、runner 上传及资源目录均为新建临时目录；只继承启动必需的环境变量，provider key 初始均空，测试使用短合成值；模型使用 scripted provider / SDK / fetch stub。没有应用启动入口、dotenv 加载、用户库或真实模型调用。

未做：未改选区/contextHint/attentionContext 任何生产链路；未改 migration 082、未新增 migration、未清洗旧历史；未改 note_patch/收件箱/intent_plan/收据生产路径；未执行全库验证或压测；未做 git 写、用户库操作、真实模型调用、.env 或真实 key 读取。`v14EpisodeStorage` 中旧 answer-card 夹具保留，用于历史兼容回归。
