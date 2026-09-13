> **状态 (Status)**: done(HQ 本机全量 570/570 定案;收口见末尾)
> **From**: fable(HQ) · **To**: codex(builder)
> **日期**: 2026-09-14
> **单号**: V14 主线 · 14.1-A2b · delete_time_block ②仪式机关(复述确认+结构化授权)
> **上游**: 裁定书⑦+细则 §二(实施法逐字)+A1/A2 机关现物(recordAgentAction/recordChatTranscription)

# 14.1-A2b · 删除仪式机关

**性质**:细则 §二(不可逆删除)的第一个机器实现。delete_time_block 过户+挂全仪式:**系统生成复述清单→用户 chat 应答→结构化授权单次核销→执行+收据**。**⛔新增动词**——同名动词两段协议(见 §一),免触"新增动词须 Henry 亲批"条款(零新词零射程扩,现役动词加门=收窄)。

## 一 · 两段协议(单动词)

1. **第一段(无授权调用)=系统备案复述**:delete_time_block 收 `{ block_id }`(无 authorization_id)→**⛔执行删除**,而是:系统级计算实际后果集(目标块完整行+将被解绑的 task ID 清单),写 `agent_authorizations` 授权行(见 §二),返回结构化复述数据 `{ authorization_id, restatement: { block 摘要, affected_task 清单, 后果说明 }, expires_at }`——Agent 把它转呈用户征求确认(**清单系统生成 Agent 只转呈**,细则 §二.3 账本他证);
2. **第二段(带授权调用)=核销执行**:收 `{ block_id, authorization_id, user_confirmation_anchor }`(用户对复述的应答原话)→校验:授权存在/未过期/未核销/属同 user 同 block/**当前实际后果集重算哈希与授权哈希一致**(不一致=409 拒绝,细则"清单哈希与实际执行集绑定");全过→同事务:执行删除+解绑、核销授权(consumed_at)、events(verb `time_block_deleted`,meta 携授权 id+原文锚)、收据(含删除块原值+解绑 task 清单);
3. 缺锚=400;授权过期/已核销=409 可读明码;Agent 跳过第一段直给伪 authorization_id=天然 404。

## 二 · agent_authorizations 表(迁移 075)

`{ id, user_id, kind('time_block_delete'), object_ids(json), consequence_hash, created_at, expires_at(=created+24h 与会话收口先到,v1 取 24h), consumed_at(null=未核销) }`;**单次核销**=consumed_at 置位后一切复用 409;表对 agent 面 append-only(核销=唯一合法 UPDATE,físico由 service 封装)。

## 三 · revert 覆盖(机关准入要求)

删除收据存**被删块完整原行+解绑前 task 绑定清单**;revert=同 ID 重建块+恢复 task 绑定(A1 范式 409 护栏:若同 ID 已被重建/占用拒撤)——细则②"事前可拒+事后有据"之上再给真撤销,机关三重准入(注册/immediate/撤销覆盖)不破例。

## 四 · 事件与收据

迁移 075 同扩 events CHECK(`time_block_deleted`);events objects=块+受影响 tasks;收据 source=agent_chat 照 A1。

## 五 · 台账/禁区/验收(照 A2 常备)

零新增挂载期 API;client 全库必跑;server 全量必跑(Python/MinerU 环境红按例申报)。禁区:⛔新增动词/⛔改机关本体(新增授权 service=并列)/⛔提案族/⛔判断域/⛔新设计安全对抗类用例(既有回归照跑零排除)/⛔碰 .git/⛔commit/⛔读 .env key 值/⛔用户库/⛔新依赖/新造凭据形合成值 ≤20 字符(域数据不在射程)。

验收:1) 三端 typecheck/build+全门绿;2) 定向:①第一段⛔删+授权行+复述数据形状 ②第二段核销执行+同事务四件 ③哈希不一致拒(备案后改动后果集→409) ④过期/复用/伪 id 三拒 ⑤缺锚 400 ⑥revert 往返(删→重建+绑定恢复)⑦人门 DELETE 行为零变;3) server 全量+client 全库;4) 证据落 `docs/audits/2026-09-14-a2b-delete-ceremony-builder/`(⛔构建产物⛔原始日志);git/secrets HQ 收口。

## 六 · 申报义务

Result 必含:交付清单+numstat、迁移 075 申报、两段协议实现落点、哈希算法口径、revert 语义、测试数字、未做项。冲突停线举证⛔自作主张。

## Result

**Codex builder 完成**（实际执行日期 2026-09-13 UTC；工单日期沿用 2026-09-14）。完成本单实现、功能验收与全库回归；Python/MinerU 环境红及 git/secrets 门按第五节留 HQ，不宣称全库全绿或代 HQ 放行。

### 交付清单与 numstat

实现/回归及 manifest 共 14 文件，**+783 / -36**，由本轮修改前字节快照作非 git 逐行 LCS 统计（CRLF/LF 等价），零 git 命令：

| 文件 | + | - |
|---|---:|---:|
| server/package.json（新测试接线） | 1 | 1 |
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

另以仓库生成器更新 `docs/generated/object-inventory.md` 与 `docs/agent-ops/INDEX.md`，追加本 Result，证据写入 [builder 档案](../../audits/2026-09-14-a2b-delete-ceremony-builder/report.md)。全部交付文件 numstat（含文档与证据）见 [numstat.tsv](../../audits/2026-09-14-a2b-delete-ceremony-builder/numstat.tsv)，字节摘要见 changes.json；这些数字不代表其他会话工作区差异。

### 协议与迁移申报

- 原 `delete_time_block` 迁入 `DELETE_TIME_BLOCK_TOOL` / AGENT_ACTION_TOOLS：internal、immediate、已有撤销覆盖；legacy 同名定义删除，chat definitions 由 manifest 投影，public 数仍为 14（注册表总数 24）。无新增动词、无射程扩大、无新增挂载期 API。
- `agentAuthorizations.ts#deleteTimeBlockWithAuthorization` 并列实现两段：第一段仅系统计算完整块+实际解绑 task ID，INSERT 授权并返回复述；第二段校验锚、user/block、存在/到期/核销及当前后果哈希，在一个 immediate 事务内完成删除解绑、核销、event、receipt。缺锚 400、无授权 404、失效/复用/后果改变 409 可读明码。
- 新迁移 **075_v14_delete_authorizations** 建八字段 `agent_authorizations` 表，kind=time_block_delete，object_ids 为块及排序 task IDs；expires_at=created_at+24h，v1 不接会话收口 TTL；核销是 service 唯一 UPDATE。events CHECK 增 time_block_deleted，保留旧账、序列、索引、append-only 触发器；schema/EVENT_VERBS 同步，现有动态迁移发现机制无需改 init.ts。仅内存/临时验证库运行，**未迁移用户库**。
- 哈希：完整块对象键及实际解绑 task ID 分别按代码点排序，UTF-8 `JSON.stringify({ version: 1, block, affected_task_ids })` → Node 内置 SHA-256 小写 hex。事件保留 authorization_id、原话 user_confirmation_anchor、consequence_hash 及计数，actor_kind=human / channel=chat / via=chat；收据 source=agent_chat，以 event_seq 关联授权与原话，不把被删块正文写入 events。
- `timeBlocks.ts#deleteTimeBlock` 为人门和 agent 共享删除 service；人门仍即时 DELETE、200 同响应、缺失 404。`recordAgentAction` / `recordChatTranscription` 两处本体未改。

### Revert 语义

收据保存被删块完整原行及解绑前 task 绑定。`toolFaceReceiptRevert.ts` 同事务按原 ID/全部原字段重建块并恢复绑定；原 ID 被占用/重建返回 409，task 丢失/重绑或原 template 不可恢复也拒撤，避免覆写后续劳动。只恢复 task 绑定，原授权保持 consumed；继续沿已有 rolled_back 事件和撤销收据通道。

### 验证数字与异常处理

- 本单定向功能 16/16；既有 event ledger 对齐后的定向 8/8；三端 typecheck/build 全通过。
- client 全库 **167 文件、1722/1722**；server 全量 **81 文件、TAP 报出 739 项、737 通过、2 环境失败**，0 skipped/cancelled/todo，0 文件或名称排除。Python wiring 文件在加载阶段失败，其内部用例未能启动，未将其记作通过。
- 非 git/secrets 全门 21 项均通过：首轮 docs:check 的 INDEX/object inventory 过期由生成器修复，最终单独复验；首轮 server 的旧事件闭集 22→23 与 fixture 074→075 已修，复跑不再失败。既有安全回归照跑，新测试仅工单规定的功能验收，未新设计安全对抗类用例。
- 保留 HQ 环境红：`v2SourceMineruWiring.test.ts` 为 python.exe ENOENT；`v2SourceRegionCells.test.ts` 既有 MinerU table-regions 用例为 Python 启动器失效、退出 101 / parser_failure。未装依赖或改环境掩盖失败。
- 完整命令、各轮退出码和完整 server 测试文件集合落档 validation.json。验证使用隔离 DB、空 dotenv/Vite 目录、TEMP app-data/资产目录；本目录无原始日志、无构建产物。

### 未做项

git diff / secrets 按工单留 HQ；零 git 命令、零 .git 访问、零 commit/push/PR、零 .env key 值读取、零用户库接触、零新增依赖。未触碰提案族/判断域，未执行真实 provider 调用或用户库迁移。新造凭据形测试值 `synthetic` 长 9，缺失授权 ID `missing-auth` 长 12；其他对象 ID/文本为域数据。CodeGraph CLI 与 MCP 均不可用，已尝试后限定目录检索。无未解决的设计冲突；环境修复、用户迁移扳机及最终放行留 HQ / Henry。

---

## HQ 收口(fable,2026-09-14)

1. **本机全量 570/570 零红**(builder 两项 Python 红=沙箱既知);
2. 交付核验:两段协议照单(第一段零删+系统备案复述/第二段五重校验+同事务四件);细则 §二关键条款全部机器化——授权单次核销/后果哈希绑定当前态(备案后改动=409)/复述清单系统生成 Agent 只转呈/事件不存正文;revert=同 ID 重建+绑定恢复带 409 护栏(超出细则"事前可拒+事后有据"底线,给到真撤销);
3. 人门 DELETE 行为零变;legacy 同名定义删除,manifest 投影,零新词零射程扩;
4. git/secrets 入收口单链。

A2b 关门——**executor 12 写动词全数过门,双轨病灶清偿完毕**。余 A3a(提案族服务端统一)随链派发;board_arrangement/note_patch 两新型依"可见"不变量押后至 14.3/14.4 面就位。
