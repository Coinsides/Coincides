> **状态 (Status)**: active（builder 蒸馏证据；非 HQ 放行）
> **日期 (Updated)**: 2026-09-14
> **范围**: V14 agent eval 第一批；工单 `docs/agent-ops/handoffs/2026-09-14-v14-agent-eval-harness-order.md`

# Agent eval builder 交付证据

已交付 `server/scripts/agent-eval/` 骨架、六个单文件场景和 JSON/Markdown 读出器。根命令 `npm run eval:agent` 默认 scripted；评测及其自测未接入 verify。生产 `server/src`、注册表、prompt、写门和采集机关均未修改；无新依赖。

## 形状与现物接线

| 层 | 交付与边界 |
|---|---|
| 注册/入口 | `discovery.ts` 枚举 `scenarios/*.ts`；`runner.ts/options.ts` 默认 scripted，支持 `--scenario`、`--list`、`--live --dry-run`；加场景无需中心注册表 |
| 隔离 | `worker.ts/isolation.ts` 每场景独立进程、`:memory:`、空 dotenv、独占 OS 临时资产与空凭据目录；环境 allowlist 去掉旧 provider key、NODE_OPTIONS、用户 DB_PATH；清理前核临时目录真实路径 |
| 执行 | `harness.ts` 调原 SSE POST handler；scripted 只注入 `OpenAIProvider.chat`、场景 5 注入 `VoyageProvider.embed`；不造 executor、claim detector、receipt projector 或 budget 副本 |
| 采集 | `routes.ts` 原样存真实 route.write 的 SSE 字节及解码事件，包含 `turn_receipt/tool_start/tool_end/round_limit/error/done`；history/inbox/memory/receipt 回读原 GET handler |
| events 来源 | **现物没有 events HTTP 读端点**。按工单授予的隔离库句柄读原 `events` 追加账本，字段 `turn.ledger/tables.events`，不伪装为 HTTP API，不新增采集端 |
| 断言接口 | `setup(fixtures),turns:[{user,contextHint?,script}],assertions(ctx)`，另有可选 `afterTurn` 排空晚提交；ctx 提供库句柄、先前轮快照、API request、逐项 check |
| 读出 | `scoreboard.ts` 从已保存 SSE/最终库快照输出 v1 四数组及每场景结果；累计 ledger 只用最终快照一次，不重复加各轮；未知工具名包括 `__proto__` 也正常计失败 |
| 产物 | `.eval-runs/<run-id>/` 忽略入库，存 run manifest、逐场景原始证据 JSON、scoreboard JSON/Markdown；进程诊断日志在 `.codex-tmp/agent-eval-builder/`，本目录仅蒸馏 |

每轮公共断言：单次 done 与 turn_receipt、持久化消息同属有效出生 turn_id、历史 API 投影与 SSE receipt 同值、无非预期 error。此 seam 不覆盖 HTTP socket/JWT；相应边界由既有回归承担。

## 逐场景断言表

| 场景 | 用户轮/工具轮 | 自有 + 公共断言 | 对账焦点 | 量表维度 |
|---|---:|---:|---|---|
| 1 目标—任务 | 3/3 | 9+3=12/12 | create_goal→create_sub_goal→create_task；每轮精确行/父子链接、先前行稳定；工具 ID 与结果、event_seq、operation_batch、receipt API、资源 ID/状态散列、撤销注册贯通 | 完成/空头支票/误用/轮次耗时 |
| 2 空头支票 | 1/0 | 3+1=4/4 | 只有“已保存偏好”无工具；原观察事件恰 1，message/conversation 锚正确；SSE/历史零写；记忆表与 API 零行 | 完成/空头支票/轮次耗时 |
| 3 提案 | 1/1 | 5+1=6/6 | 真 organized_note 服务、材料 segments、AI generation mode；pending 与 proposal_issued、收件箱 list/detail 一致；信道写成功；notes/blocks/placements 零直写 | 完成/空头支票/误用/轮次耗时 |
| 4 删除仪式 | 2/2 | 6+2=8/8 | 首轮完整系统复述、24h 未消费授权、零删除/零门收据；次轮原话锚+同授权删除块，仅解绑保留任务；event/receipt 精确资源；实际人门 revert 恢复完整原行和绑定、授权仍 consumed | 完成/误用/轮次耗时 |
| 5 记忆 | 3/3 | 8+3=11/11 | 中文 save 与重复同 ID/一行/一次文档 embedding；FTS、LIKE 均无候选的中文样本，经共享 MemoryManager、search_memories、真实环境 prompt 三入口语义命中；外用户过滤及最后访问时间 | 完成/空头支票/误用/轮次耗时 |
| 6 循环韧性 | 2/10 | 9+2=11/11 | 真 59,999ms 尚无结果、60s 超时→配对错误 ToolResult→下一 provider 回合读工具自纠；已接受提案晚提交且无重复 end；另 8 轮读触顶，单次 round_limit/error/receipt/done，10 对历史 API/回放无孤儿或重复 | 完成/误用/轮次耗时 |

删除复述首轮原 SSE `tool_end.ok=true`，原 receipt `write_ok_count=0,write_fail_count=1`：复述成功不代表删除成功。超时后提交的提案保留原失败收据，不能把失败回执当未发生写入的证明。

## 读出字段与本次读数

JSON：`schemaVersion,runId,scenarios[],taskCompletion,claimWithoutReceiptCount,toolMisuse,timing`。每场景另有 `name,dimensions,mode,scenarioAssertionsEvaluated,notEvaluatedReason?,failures,executionError?`。

| 字段 | 口径 | 最终 scripted run |
|---|---|---:|
| `taskCompletion.{passed,total,rate}` | 已执行机器断言；不是真实模型任务成功率；0 分母 null | 52/52，1 |
| `claimWithoutReceiptCount` | 最终 events 的窄词观察事件计数 | 1（场景 2 阳性对照） |
| `toolMisuse.{count,byTool}` | SSE tool_end ok=false，按工具名聚合；不推断主观误用 | 1，`create_proposal:1`（场景 6 故意超时） |
| `timing.{userTurns,toolRounds,durationMs}` | 用户轮；持久化 assistant 工具调用组；场景实际墙钟耗时之和 | 12/19，3114.6132ms |
| `scenarios[].timing.turns[]` | 每轮实际 SSE 执行毫秒与工具组数；fake clock 不冒充墙钟 | 已输出 |

最终 run ID：`2026-09-14T10-45-17-283Z-b6a54834`。完整 scoreboard 留 `.eval-runs/`，由 HQ 择要入库。本表是本单验收读数蒸馏，不是模型能力榜。

## 验证记录

| 验证 | 结果与证据边界 |
|---|---|
| 六场景 scripted | 6/6，52/52；最终执行退出 0 |
| harness/读出自测 | 14/14；自动注册/无效模块/参数/独占隔离/SSE 分片/累计快照不重计/空分母/特殊工具名；真实场景 2 先绿，删除其 claim 证据后恰有一条原断言变红 |
| 独立脚本类型检查 | `npm run typecheck:agent-eval` 通过 |
| Live dry | `npm run eval:agent -- --live --dry-run` 通过；自测以 spawn/fetch/钥匙库读取触发即抛错的 guard 验 dry/list 零执行 |
| Agent 族 | 274/274，退出 0，无 flaky retry |
| client 全库 | 172 文件、1762/1762，退出 0 |
| server 全量 test:v2 | **初跑 743 测试，740 pass / 3 fail**。Node IPC 文件故障 1 处由既有 wrapper 单次隔离复跑 49/49 恢复；两项 Python/MinerU 环境红项仍在，**最终退出 1，不声称全绿，也不把重试计数加成唯一测试数** |
| Runtime verify | 依现行 `verify:v2-bn8-runtime` 定义逐项跑非 git/secrets 的 23 个组件；22 项首次通过（含 client/server 构建），docs:check 依次暴露过期 `docs/agent-ops/INDEX.md` 与 `docs/generated/object-inventory.md`，仅按原生成器重生成这两件后补验 PASS，**23/23 非 git/secrets 组件最终通过**。git/secrets 两项按用户指示留 HQ，未调用总串行命令以免越过该边界 |

Server 红项证据定位（生产未改）：

- `v2CanvasPersistenceCutover.test.ts`：Node `Unable to deserialize cloned data due to invalid or unsupported version.`；既有 wrapper 只复跑一次，49/49，恢复。
- `v2SourceMineruWiring.test.ts:60`：模块启动时 `spawnSync python.exe ENOENT`；当前 PATH 无可解析的 python.exe。
- `v2SourceRegionCells.test.ts:203`：MinerU code 101，固定 Python 3.12.11 解释器无法创建进程；路径存在不等于可运行。留 HQ 的可运行环境补验，不安装依赖、不改 parser/测试跳过项。

原始日志：`.codex-tmp/agent-eval-builder/scripted-final.log`、`selftest-final.log`、`typecheck.log`、`live-dry-run.log`、`verification/*.log` 与逐组件退出 JSON。分工 smoke 的原日志亦在 `.codex-tmp/agent-eval-builder/{journeys,runtime}/`；场景 1–3 首轮 smoke 在 `.codex-tmp/agent-eval-first-scenarios/`。初期临时验证驱动的格式/相对路径问题已修正，未将其失败算作任何测试通过。

## 未做项与交接

LLM 评分器、幻觉率、live 真模型调用、主观验收均未做。`--live` 仅留现有 dashscope 真通路；未来执行只采证和检查传输一致性，`scenarioAssertionsEvaluated:false`，任务完成率为 null；不把依赖 scripted 故障注入的未评估项当通过或模型失败。

未触碰 `.git`，未 commit/push/PR/merge，未修改 agent 权限/操作指令，未开真实账号、未读真实钥匙库/用户 DB、未新增动词/依赖。`.gitignore` 仅新增 `.eval-runs/`。README 的“加一个场景”步骤为 5 行。应用操作说明书申报：**无涉**（本单只增开发评测命令，无新增应用操作面）。HQ 接手：两项 Python/MinerU 环境补验及 git/secrets 收口；builder 不作放行判定。
