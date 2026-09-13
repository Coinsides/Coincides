> **状态 (Status)**: active（builder 停线证据，非验收放行）
> **层 (Layer)**: 审计 / A1 实现与验证证据
> **日期 (Updated)**: 2026-09-14（工单日期；实跑 2026-09-13 UTC）
> **权威 (Authoritative)**: 仅对本次施工和验证结果负责

# 14.1-A1 Agent 写门公共机关与 create_goal 试点

实现已落工作树，**未达到全量验收条件，工单不翻 done**。最终 server 全量 79 文件、673 tests：670 pass / 3 fail / 0 skipped；client 全库 167 文件、1722 tests 全绿。依工单“真冲突停线”保留当前成果，等待既有 Python 运行时可访问后续验；未排除任何测试、未安装依赖、未更换真实解析器为假实现。

## 交付与机关落点

| 要求 | 落点与行为 |
|---|---|
| actor/channel 管道 | `server/src/agent/orchestrator.ts` 注入 `{ actor:'agent', channel:'chat', conversationId, callId }`；`executeTool` 接结构化 context；`recordAgentAction` 拒绝缺失 context，不从环境推断身份 |
| 同事务业务与史记 | `server/src/services/recordAgentAction.ts` 的同一个 SQLite immediate 事务内依次执行业务、`recordEvent`、收据写入；错误向外传播，三者共同回滚 |
| 收据 | 复用 `toolFaceReceipts.ts` / `operation_batches`；新 source=`agent_chat`，harness=`agent_chat`，`source_id` 为调用 ID；resources 含实际 `{ kind:'goal', id, outcome:'created', state_hash }`；agent_context 含 actor/channel/conversation_id/event_seq |
| 撤销机械闸 | `toolFaceReceiptRevert.ts` 中同一 executable map 同时承担准入查询和撤销分派；未注册处理器不得进入 `recordAgentAction` |
| 共用人门 | `services/goals.ts#createGoal(db,userId,input)` 内用原 `createGoalSchema`，返回完整 SQLite 行；人门 `POST /api/goals` 为薄壳，保留 201、ZodError 400、归属 404、排序、父级和 exam_mode 行为 |
| 试点过户 | executor 的 `create_goal` 直写 SQL 已移除；唯一调用共享 service 经上述机关；`create_sub_goal` 和其它 case 均未迁移 |
| 注册与投影 | `CREATE_GOAL_TOOL` 进入 V2 权威 registry，tier=`immediate`、scope=`goals:write`、exposure=`internal`；现有 chat 定义只在此项改读生成 manifest 投影。输入只投影原 title/course_id/deadline/description 四字段；不新增 MCP 写入口 |

registry 现在 15 项，其中 14 public；`create_goal` 排在原 14 项后，保持原有顺序。参数校验取自人门 Zod 字段，最终 service 再经过完整人门 schema。`scopes` 是现有登记元数据，本单不宣称另造 scope 授权执行器。

### 迁移 073 申报

`073_v14_agent_goal_event.ts` 扩 events 动词 CHECK，新增 `goal_created`；重建时保留历史行各值、seq、sqlite_sequence 高水位、两个索引与 append-only 触发器。`schema.sql` 同步闭集。`recordEvent.ts` 允许裸 `actor_kind='agent'`，保留 `human` / `system` / `agent:…`。实际数据库列仍叫 **actor_kind**，不是新增 actor 列。

迁移由既有目录扫描自动发现，`db/init.ts` 零改。已测试 fresh schema、真 073 前 CHECK 的升级保史和重复运行；只在内存/临时测试库执行，未触发用户库迁移。

### Revert 扩点申报

沿用 `POST /api/tool-receipts/:id/revert`，默认实现改为 `revertToolReceipt`，按 source/tool 调度。原 `trash_notes` handler 保留；新增 agent `create_goal` handler 在同事务内精确删除创建行、写 human/ui `rolled_back` event、更新原收据为 reverted 并记录 deleted ID / revert event_seq。

准入撤销的边界为**原创建行仍在原态且无后续引用**。目标已修改、缺失、或已有子目标/tasks/recurring_task_groups/goal_dependencies 引用时返回 409，避免删除或解绑后续工作。此边界是创建撤销，不是任意 goal 的删除能力。

新增挂载期 API **0**；新增路由 **0**；新 source 的已执行/已撤销收据可通过既有列表 API 查询。客户端代码、收据/撤销 UI、其它动词、提案族和判断域零修改。

## 验证结果

| 验证 | 最终结果 |
|---|---|
| A1 新功能集成文件 | 6/6 pass：共用 Zod 字段与注册投影；人门/agent 实体语义和排序；人门 parent/exam/default/响应；events 存储故障；receipt 存储故障；编排到 HTTP 撤销往返 |
| events ledger | 8/8 pass，包含本单新增 1 条旧 CHECK 升级保史功能回归 |
| server 全量 | 79/79 文件全部投入；673 tests，670 pass / 3 fail / 0 skipped / 0 cancelled / 0 todo；106.19s |
| client 全库 | 167/167 files、1722/1722 tests pass，0 skipped；96.44s |
| 三端 typecheck + build | shared/client/server 全绿；server 最终 build 在全量 artifact 用例内再次通过 |
| test wiring / tech debt | 79/79 测试接线、0 exemptions；tech-debt table pass |
| registry / manifest / parity | 5 / 10 / 10 tests pass；manifest 生成与复制及 parity check pass |
| 静态门 | shared runtime import、canvas runtime boundary、gallery/rail/single-editor shells、source experience、legacy shutdown、relation freshness 均 pass |
| canvas model / performance | 60 groups pass；5 scenes pass |
| docs:check | 索引再生后，index/inventory/glossary 全部 pass |

完整运行使用已有 server test wrapper，枚举 `server/src`、`server/scripts` 全部 `.test.ts`，未使用名称、文件、目录排除。`test:v2` 不是全库清单，故未把它独称全量。新增 A1 文件已接入 `server/package.json` 的 `test:v2`。项目未找到既有独立 goals 测试族，本单人门契约由新集成文件补足。

根 `verify:v2-bn8-runtime` 尾部包含 `git diff --check` 与 `check:changed-file-secrets`。工单 §五.4 已明确这两项交 HQ，故逐项完成前 21 门，**不声称运行过或通过了原样总入口**。三端 typecheck 另补。全文零 git 命令，未访问 `.git`；既有安全相关回归原样跑，未设计新的安全对抗用例。

### 隔离冒烟

`v14AgentWriteDoor.test.ts` 使用 `initDb(':memory:')` 和 synthetic 测试用户，post-auth fixture 注入固定测试身份。只替换 provider.chat 输出；`runAgent`、executor、业务 service、SQLite events/receipts 和 HTTP revert 均为实际实现。

实际链为“帮我建目标 X”→provider tool result→goal 行→actor_kind=agent/channel=chat 的 `goal_created` event→`agent_chat` 收据（实际 goal ID）→现有 API revert→goal 消失、原收据 reverted、human/ui `rolled_back` event。还注入撤销收据存储失败，确认 goal 删除和新增事件一并回滚，再去掉故障完成往返。

不加载真实 .env，不访问用户库；client 使用既有 `COINCIDES_VALIDATION_ENV_DIR` 指向空目录，全量 runner 使用白名单环境与临时 assets/blobs/uploads/app-data。新造凭据形值仅 `synthetic` / `a1-synthetic`，分别 9 / 12 字符；没有新造认证 JWT。模型、远端服务均未调用。

## 未通过的门与停线证据

| 最终失败 | 现物证据 | 本次处置 |
|---|---|---|
| `v2SourceMineruWiring.test.ts:60` 文件加载 | Windows 分支硬调 `python.exe -c ...`，当前 PATH 无可执行 Python，`spawnSync python.exe ENOENT` | 未排除用例、未新增依赖；需宿主提供可访问的既有 Python 到 PATH |
| `v2SourceRegionCells.test.ts:39,198` 真实 MinerU 回归 | 固定 `D:/Coinsides/v12.9-selection/tools/mineru/.venv/Scripts/python.exe`；其 uv 基础 Python 在当前沙箱 PermissionDenied，直接 `--version` 同样失败；解析返回 code 101 | 用例覆盖 COINCIDES_MINERU_PYTHON，单设变量无效；未改测试/外部 venv/权限，需恢复固定运行时可访问性 |
| `v2NotesLifecycle.test.ts:432` 旧 handler hash | expected `0dfd76eb9fa0f7c0f8002596663a4ff2fa052f0aa8c7e7d01318d1436f559b57`；actual `41593a991c0fba093d9057f79a4781f6a5b0966b81006a3e0052842a4fae776c` | notes.ts 本单零改；未盲换旧 hash，保留为 HQ 续验的基线更新项 |

第三项已追溯：当前 notes.ts 整文件 SHA 与 `docs/audits/2026-09-13-card-cover-builder/round2-numstat.md` 的 afterSha 一致；编辑前镜像 `.codex-tmp/card-cover-round2-before/server/src/routes/notes.ts` 的 PUT hash 正好等于旧断言。当前 handler 只多封面资产校验和 binding metadata 合并；内存逆转这两处后逐字恢复旧 handler。合法来源为 done 的 `2026-09-13-v14-card-cover-order.md`；这项是既有测试基线滞后，不是 A1 产品回归。未改封面工单或历史证据。

首轮全量曾为 664 pass / 9 fail；本单引入的 6 项已修复并在完整复跑中通过：新测试类型收窄影响 artifact 两项、internal 注册项放首位影响旧 MCP fixture 两项、撤销 dispatcher 更名影响静态断言两项。最终只剩上表三项。

停线边界：工单要求 server 全量绿且零排除，而当前沙箱无法执行其固定运行时；禁止新依赖且无权限升级入口。不能自行安装/搬迁运行时或豁免用例来宣称完成。等待 HQ 恢复环境并处理已证实的旧 hash 后，重跑全量并完成复核，才可翻 done。

## 交付清单与无 git numstat

以下对比本会话**编辑前的文件字节备份**，不是 HEAD/index/提交差异。行数按 LF 归一后的 LCS 计数；不统计正常构建产物、`.tmp` 执行器/备份/原始日志。该目录仅此提炼报告，没有构建产物或原始日志。工单和本报告自身的 numstat 计入表中。

<!-- A1_NUMSTAT_START -->
| 文件 | + | - |
|---|---:|---:|
| `server/package.json` | 1 | 1 |
| `server/src/agent/orchestrator.ts` | 3 | 1 |
| `server/src/agent/tools/definitions.ts` | 9 | 12 |
| `server/src/agent/tools/executor.ts` | 17 | 7 |
| `server/src/db/recordEvent.ts` | 3 | 2 |
| `server/src/db/schema.sql` | 1 | 1 |
| `server/src/db/migrations/073_v14_agent_goal_event.ts` | 51 | 0 |
| `server/src/services/goals.ts` | 51 | 0 |
| `server/src/services/recordAgentAction.ts` | 78 | 0 |
| `server/src/services/toolFaceReceipts.ts` | 27 | 18 |
| `server/src/services/toolFaceReceiptRevert.ts` | 67 | 0 |
| `server/src/routes/goals.ts` | 3 | 41 |
| `server/src/routes/toolReceipts.ts` | 3 | 3 |
| `server/src/toolFace/registry.ts` | 29 | 0 |
| `server/src/__tests__/v13EventsLedger.test.ts` | 49 | 8 |
| `server/src/__tests__/v14AgentWriteDoor.test.ts` | 210 | 0 |
| `server/src/__tests__/v2NotesListService.test.ts` | 4 | 4 |
| `docs/generated/tool-face-manifest.json` | 68 | 0 |
| `docs/agent-ops/INDEX.md` | 5 | 2 |
| `docs/agent-ops/handoffs/2026-09-14-v14-1-a1-agent-write-door-order.md` | 25 | 0 |
| `docs/audits/2026-09-14-a1-write-door-builder/README.md` | 110 | 0 |
| **合计：21 文件** | **814** | **100** |
<!-- A1_NUMSTAT_END -->

本单未做：其它动词过户、提案族、判断域物理只读实装、客户端/UI、新 MCP 写入口、用户库迁移、真实模型/浏览器主观验收、git/secrets HQ 收口、commit/push/PR。所有产物仍待 HQ 复核与环境续验。
