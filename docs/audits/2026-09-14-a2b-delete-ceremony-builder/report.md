> **状态 (Status)**: complete (builder 实现与可执行验证完成；环境红与 HQ 门如实保留)
> **层 (Layer)**: 审计 / Builder evidence
> **工单日期**: 2026-09-14
> **实际验证日期**: 2026-09-13 UTC（按执行环境时钟，非工单日期）
> **权威 (Authoritative)**: 否；供 HQ / reviewer 复核

# V14 14.1-A2b · delete_time_block 删除仪式交付证据

## 1. 交付与边界

依据工单、裁定书⑦、细则 §二及 A1/A2 现物，原 `delete_time_block` 已过户为同名两段协议。V2 注册表增列既有动词，legacy 同名定义删除，由 manifest 投影提供 chat 参数。注册表共 24 条，public 仍为 14 条；本动词为 internal / immediate，并有可执行 revert 覆盖。无新动词、无扩大写射程、无新增挂载 API。

`recordAgentAction.ts` 与 `recordChatTranscription.ts` 本体未修改。新增 `agentAuthorizations.ts` 与两者并列，复用现有事件及收据接口；人门 DELETE 与 agent 执行共用 `timeBlocks.ts#deleteTimeBlock`。

实现及回归文件（含 manifest）共 14 个，非 git numstat 为 **+783 / -36**。另更新自动 object inventory、agent-ops INDEX，追加工单 Result 与本目录证据。完整逐文件数字见 [numstat.tsv](numstat.tsv)，17 个有前后版本或新实现的文件字节摘要见 [changes.json](changes.json)。统计相对于本轮各执行者修改前的字节快照；逐行 LCS、CRLF/LF 等价、增加=新行数−LCS、删除=旧行数−LCS，**不是 git 历史差分**，不代表其他会话的工作区变化。

| 实现 / 回归文件 | + | - |
|---|---:|---:|
| server/package.json | 1 | 1 |
| server/src/agent/tools/executor.ts | 2 | 11 |
| server/src/agent/tools/definitions.ts | 0 | 11 |
| server/src/db/schema.sql | 16 | 1 |
| server/src/db/migrations/075_v14_delete_authorizations.ts | 68 | 0 |
| server/src/db/recordEvent.ts | 1 | 0 |
| server/src/routes/timeBlocks.ts | 2 | 8 |
| server/src/services/agentAuthorizations.ts | 144 | 0 |
| server/src/services/timeBlocks.ts | 26 | 0 |
| server/src/services/toolFaceReceiptRevert.ts | 54 | 0 |
| server/src/toolFace/registry.ts | 36 | 1 |
| server/src/__tests__/v14DeleteCeremony.test.ts | 266 | 0 |
| server/src/__tests__/v13EventsLedger.test.ts | 5 | 3 |
| docs/generated/tool-face-manifest.json | 162 | 0 |

## 2. 两段协议与同事务落点

第一段 `{ block_id }`：在 immediate 事务中读取所属用户的完整块行，枚举所有实际 FK 将解绑的 task ID（不以用户过滤缩小实际后果集），写一行 `agent_authorizations`，返回 `{ authorization_id, restatement: { block, affected_task_ids, consequences }, expires_at }`。清单与后果说明由 service 生成，说明包含不可恢复及任务保留/解绑语义，要求完整转呈并等待明确应答；此段不删除、不核销、不产生已执行收据。

第二段 `{ block_id, authorization_id, user_confirmation_anchor }`：缺锚返回 400；授权按 user 查询，不存在为 `authorization_not_found` / 404；已用、到期、目标不符、后果变化分别为可读 409。先查授权核销状态，再查块，使重复调用在原块已删除时仍准确返回 409。

同一个 immediate 事务内重算哈希，调用共享删除 service（FK 将 tasks.time_block_id 置空），仅允许 `consumed_at` 从 NULL 核销，追加 `time_block_deleted` event 与 `agent_chat` operation_batches 收据。输出 schema 校验也位于事务内；失败抛出使全部回滚。三项普通存储故障回归覆盖授权核销、event、receipt 写失败，均恢复四件前态。

事件的 `actor_kind=human`、`channel=chat`、`meta.via=chat`；meta 保留授权 ID、用户应答原话、conversation ID、后果哈希、块数及 task 数。objects 为块及实际解绑 tasks；事件不写被删块正文，完整原行只保存在可撤销内容收据中。收据通过 event_seq 关联此授权与原文锚。

## 3. 哈希与授权表

`timeBlockConsequenceHash` 使用 Node 内置 SHA-256，无新增依赖。先对完整 `SELECT *` 块对象的键按 JavaScript 默认代码点顺序排序，对实际解绑 task ID 列表同样排序，然后计算 UTF-8 `JSON.stringify({ version: 1, block, affected_task_ids })` 的 SHA-256，保存小写十六进制摘要。块任意字段变化或实际解绑 task 集变化都会使旧授权拒绝执行。

迁移 **075_v14_delete_authorizations** 新建八字段授权表：id、user_id、kind、object_ids、consequence_hash、created_at、expires_at、consumed_at。kind 固定 time_block_delete，object_ids 为 `[block_id, ...排序后的 task IDs]`。TTL 为创建起 24 小时；本单 v1 按工单不接会话收口 TTL。service 只暴露创建与一次消费，无 agent 更新/删除授权入口。

075 同时扩 events CHECK 加 time_block_deleted，保留历史行、序列、索引、append-only 触发器；schema.sql 与 EVENT_VERBS 同步。现有 migrate.ts 自动发现迁移，init.ts 不需修改。新内存库、旧 ledger 正向升级、历史保留及重复 up 已验证。**未对用户库执行迁移**；用户库迁移扳机留 HQ / Henry。

## 4. 撤销语义

删除收据第一项保存完整原块行，后续每项保存解绑 task ID 及原 time_block_id。revert 在同一个 immediate 事务先检查原 ID 未占用、原 template 可用、所有任务存在且当前仍未绑定，再按原 ID 和全部原字段重建块，恢复任务绑定，沿已有 finishAgentRevert 留 rolled_back 事件及撤销状态。

原 ID 被重建/占用为 409；task 丢失/重绑或 template 不可恢复也以可读 409 拒撤。撤销只恢复 task 绑定，不覆写 task 内容；原授权仍保持 consumed，撤销不重新激活授权。

## 5. 验证与修复

精确执行命令、退出码、测试文件集合及各轮结果见 [validation.json](validation.json)。验证使用内存/既有测试临时 DB、空 dotenv/Vite 环境、TEMP 内 app-data 与资产目录；验证进程环境只继承 OS/工具白名单，不继承 provider key。既有测试未按名称或文件排除。

| 项目 | 结果 |
|---|---|
| 本单定向功能验收 | 16/16，通过；零跳过 |
| 既有 events ledger 回归修复后 | 8/8，通过 |
| shared typecheck/build、server typecheck、client typecheck | 全部通过 |
| server build、client build | 全部通过 |
| client 全库 | 167 文件，1722/1722，通过 |
| server 全量最终轮 | 81 文件；TAP 报出 739 项，737 通过、2 环境失败；0 skipped/cancelled/todo；0 排除 |
| 全门非 git/secrets 子项 | 21 项均通过（docs:check 生成修复后单独复验） |
| git diff / changed-file secrets | 未执行，工单指定留 HQ |

首轮 server 为 739 项、736 通过、3 失败。除两项环境红外，旧 v13EventsLedger 用例仍列 22 个事件且 fixture 只迁移到 074；已更新原用例的闭集、数量和 fixture 至 075，未增加对抗用例。修后先定向 8/8，再全量复跑至 737/739。

docs:check 首轮发现 agent-ops INDEX 过期；其后发现 object inventory 行号/条目过期。分别用现有生成器更新，不手改派生内容；最终 docs:check 独立复验。无需重跑此前已绿且未受影响的 client / build / 性能门。

环境红保留两项：

1. `v2SourceMineruWiring.test.ts` 在模块加载阶段调用 python.exe，返回 ENOENT；该文件内部用例未能启动，739 为实际 TAP 报出数，不冒充其内部断言已执行。
2. `v2SourceRegionCells.test.ts` 的既有 c-1b-2 表格区域用例，MinerU 返回 101 / parser_failure：所配置 uv Python 启动器无法创建 Python 3.12.11 进程。

## 6. 未做与交接

未安装/修复 Python、MinerU 或任何新依赖；上述环境失败按工单例外留 HQ。未执行任何 git 命令或访问 .git、未 commit / push / PR，未读 .env key 值、未接触用户库、未发起真实 provider 请求。git/secrets 与用户数据迁移/主观验收由 HQ 收口，builder 不代放行。

新增测试仅覆盖工单点名的协议、事务、失效状态、撤销与人门功能回归；未新设计安全对抗类用例。新造凭据形测试值使用 `synthetic`（9 字符）；不存在的授权 ID 为 `missing-auth`（12 字符），其余对象 IDs/后果文本属于域数据。CodeGraph 目录存在，但 CLI 未安装、无可用 MCP 工具，尝试失败后采用限定目录检索。

本目录仅存整理后的证据、文件集合、摘要与 numstat；原始运行日志和构建产物未收入档案。
