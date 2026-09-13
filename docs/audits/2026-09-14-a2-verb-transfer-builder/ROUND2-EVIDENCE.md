> **状态 (Status)**: active
> **性质**: 14.1-A2 二轮施工与验证收据
> **工单日期**: 2026-09-14；本机实跑日期 2026-09-13
> **From**: codex builder

# 二轮施工证据

依据工单全文及补遗一施工。补遗一解决了一轮的 link_task_cards 事实冲突；原一轮 Result 和 STOP-LINK-SEMANTICS.md 保留原文。

## 交付与运行链

8 个动词已过户到权威 registry，均为 immediate/internal；chat definitions 从已生成 manifest 投影，现 chat 30 项无重名、registry 23 项，其中 public 仍 14 项。没有新增挂载 API，MCP public 写射程不增加。

| 动词 | 共用人门业务 | 事件 | 收据资源与撤销 |
|---|---|---|---|
| create_sub_goal | 既有 services/goals.ts#createGoal；executor 仅适配父 goal 的 course 继承 | goal_created | goal 实际 ID + 整行 hash；原行未改且无子 goal/task/recurring group/dependency 引用才删除 |
| create_task | services/tasks.ts#createTask | task_created | task 实际 ID + 整行 hash；已改、task_cards 或活动历史引用时 409 |
| create_deck | services/decks.ts#createDeck | deck_created | deck 实际 ID + 整行 hash；已改或有 section/card 时 409 |
| create_section | services/sections.ts#createSection | section_created | section 实际 ID + 整行 hash；已改或有 card 时 409 |
| create_time_blocks | services/timeBlocks.ts#createTimeBlocks | time_blocks_created | 一张收据包含全部实际 time_block ID；整批预检 hash/任务引用，通过后同事务删除 |
| update_time_block | services/timeBlocks.ts#updateTimeBlock | time_block_updated | 存整行 before 和 after hash；恢复 label/type/start_time/end_time/color/updated_at，后续修改时 409 |
| link_task_cards | 循环 services/tasks.ts#linkTaskCard | task_cards_linked | 严格单链 404/409；错误含 card_id；整批业务/event/receipt 同事务；撤销只删实际 ID 清单，旧链接保留 |
| complete_task | services/tasks.ts#completeTask 状态闭包 | task_completed | before status/completed_at/updated_at + 活动记录 + 周期组前后快照；恢复原值、删本次活动、恢复 completed_tasks；后续漂移时 409 |

除 complete_task 外，以上经原 recordAgentAction。新增平行函数 services/recordChatTranscription.ts；要求非空 user_utterance_anchor，缺锚 400。事件为 actor_kind=human、channel=chat，meta 保留原文锚、conversation_id、tool、via=chat；收据 source_type=agent_chat，agent_context 仍为 agent/chat。两个机关都把业务、事件、实际资源收据放在同步 immediate 事务中，准入要求注册对象、immediate 和可执行撤销覆盖。

074_v14_agent_planning_events 扩展七个事件词：task_created / deck_created / section_created / time_blocks_created / time_block_updated / task_cards_linked / task_completed。goal_created 复用。EVENT_VERBS、schema.sql、迁移 CHECK 同为 22 词。内存迁移验证：历史完整行不变；序列高水位 50 保留，下一新事件为 51；七新词全部可写；两个 append-only trigger 保留；重跑无变化。既有 ledger 回归同步 074 后 8/8 通过，073 历史用例原样保留。

## 行为变化与范围

- create_task 从拒绝桩恢复为带收据可撤销的单任务门；生成整套学习计划仍走既有提案流程。
- create_sub_goal 复用人门 sibling sort_order=MAX+1；父 ID 必填且校验，省略 course_id 时继承，goal service 零改动。
- section 服务端默认从 0 改为 MAX+1；client sectionStore 移除默认补 0；显式 order_index 保留。旧 executor 原本已有 MAX+1，现归共用服务。
- link_task_cards 从跳过缺卡/重复并计数改为任一失败整批回滚；成功响应保留 created 数并增实际 links，skipped 退出。收据只在全成时产生，空 links 校验拒绝。
- complete_task 从无锚直接更新变为人类原话转录；随人门补齐活动日志与 recurring count。重复完成遵循人门，保留已有 completed_at，不重复累计。人门状态与调度字段整次写入也由事务保护。
- 时间块与链接使用共用 Zod：字符串字段不再接受 SQLite 曾自动转换的数字；checklist_index 不再接受小数或数字字符串。原支持的 nullable color/type/template 等按各字段保留；HTTP 校验错统一为 400。Agent 空时间块批次校验拒绝，人门原有 201 [] 保留。创建时间块现可沿人门接收 template_id，返回完整实际行。
- 8 个动词的成功返回均含 receipt_id；旧内联错误转为共用 AppError/Zod 校验，chat orchestrator 仍用既有错误呈现机制。
- create_card 原 definitions 已无条目，仅留退役注释；本轮清除注释、executor 拒绝桩及 system-prompt 的旧动词引用。create_proposal 卡型未改。prompt 同步 create_task 恢复、complete_task 原话锚和严格链接批次。
- link_task_cards 既有人门是 REST POST /api/tasks/:taskId/cards；源码无对应 client 写调用（TaskViewModal 只读）。registry 如实标注 `none (human REST only)`，没有伪造 call site 或宣称浏览器可达；本单按工单指定 REST 人门过户。

## 验证

定向和 8 动词真实 HTTP/provider stub 冒烟详见 TEST-SMOKE.md：50/50，零跳过。包括每动词 events/receipt 存储失败回滚、实际 ID、撤销失败回滚与最终完整复原、完成出处和严格链接批次。人门 tasks/goals/decks/sections/timeBlocks 均进入对应 HTTP 回归。

client 全库 167 文件、1722/1722 通过，零排除；client build、server build、shared tsc -b 和 server noEmit 均通过。tool registry 5/5、manifest 10/10、parity 10/10；80 个 server 测试文件全部显式接线，0 豁免/0 未接线。14 项 public 静态 parity 通过；60 组 canvas model contract 和 performance seed 通过；其余 runtime 静态门与 docs:check 通过。

verify:v2-bn8-runtime 顶层脚本含 git diff 与 secrets 扫描，遵工单由 HQ 承接，因此未调用含禁令命令的整串；其余每个验证子命令逐项执行，无跳过测试。docs:check 首次因 HQ 已新增文档而发现 agent-ops INDEX 过期，按生成器同步后通过，object inventory 无变化。

server 第一次全量遍历 server/src + server/scripts 的全部 80 个 .test.ts：723 项，719 通过、4 失败、0 跳过。其中本轮事件闭集旧期望 15→22 已同步；另一个失败是已授权 card-cover 交付后的旧 notes 源码指纹未更新，按下节取证后仅同步既有断言。修复后再次提交完整 80 文件，最终 **723 项 / 721 通过 / 2 失败 / 0 skipped / 0 cancelled / 0 todo**（107.47 秒）。仅有以下环境红，均未排除，按工单留 HQ：

1. v2SourceMineruWiring.test.ts：收集阶段 `spawnSync python.exe ENOENT`，解释器发现失败；文件内子测试未能运行。
2. v2SourceRegionCells.test.ts 的 MinerU table regions 用例：`MinerU exited abnormally (code 101)`，本地 uv CPython 3.12.11 目标进程无法创建。

没有安装、替换 Python/MinerU 或新增依赖。原始日志在 `C:\Users\70208\AppData\Local\Temp\coincides-a2-validation-L8amM4`，首次及最终全量分别为 server-all-initial.log / server-all.log；本目录不复制这些原始日志。

运行隔离：显式 :memory: 数据库/测试自产临时库；asset/blob 临时目录；Vite envDir 指向空临时目录，dotenv 指向空临时文件；应用凭据路径为临时目录，真实 provider 调用由 stub 替代。未读取仓内 .env key 或用户库。原始日志只在 OS temp，审计目录仅放整理后的证据。

## 既有 notes 指纹修复的证据

notes.ts 与 v2NotesLifecycle.test.ts 在首轮全量失败时均与二轮开工快照逐字节一致。notes.ts 文件 SHA-256=31f741db3cf6014b0279738f9c4d73a2ac84ac73d777515a6e13a01a24da2155；旧测试文件 SHA-256=f2144a03465ca99fe6055fa537ee12dcf1d731dd2a6412a5033c2c2a3941ec67。

工单 docs/agent-ops/handoffs/2026-09-13-v14-card-cover-order.md 已 done；§一.1、Result 交付表及校验点明确授权 notes POST/PUT 资产检查、binding 兄弟键合并。其 preimage 中 handler 正是旧预期 0dfd76eb9fa0f7c0f8002596663a4ff2fa052f0aa8c7e7d01318d1436f559b57。

当前 handler 的 41593a991c0fba093d9057f79a4781f6a5b0966b81006a3e0052842a4fae776c，只需移除 assertNoteCoverAsset 一行，并把 currentMetadata + mergeNoteCoverBinding 两行还原成原 mergeNoteSkin(JSON.parse(current.metadata || '{}'), data.metadata, data.skin)，即精确重现旧指纹。由此同步既有测试标题、出处注释及一个期望 hash，完整 handler 锁与所有功能断言保留；notes.ts 未修改。该既有套件 13/13 通过，零跳过。

## 范围核证

基准为二轮开工源码副本，numstat 按 Node 行 LCS 计算，统一行尾，不依赖 git、不是相对提交。独立 AST/源码比较确认：executor 恰为 8 动词改变 + create_card 删除，其余 case（含 delete_time_block、D 族、提案族）原样；人门只改工单指定 handlers，其余（含 task batch）原样；goals.ts 和 recordAgentAction.ts 未改。未新增依赖、endpoint、判断字段或安全对抗用例。新造唯一 provider 凭据形值 a2-synthetic 为 12 字符；既有回归原样运行。git/secrets、Python/MinerU 环境及主观验收留 HQ。
