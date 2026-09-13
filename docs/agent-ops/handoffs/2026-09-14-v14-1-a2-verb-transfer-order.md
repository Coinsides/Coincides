> **状态 (Status)**: done(二轮;一轮停线=HQ 裁定⑨事实错误经补遗修正;HQ 本机全量 554/554 定案)
> **From**: fable(HQ) · **To**: codex(builder)
> **日期**: 2026-09-14
> **单号**: V14 主线 · 14.1-A2 · B 族动词批量过户(8 动词)+create_card 退役
> **上游**: `analysis/2026-09-14-v14-1-census-adjudication.md`(裁定书①⑥⑧⑨适用)+`analysis/2026-09-14-v14-1-executor-census.md`(§4 逐动词明细/§6.2 抽取表)+A1 已铸机关(`services/recordAgentAction.ts`,commit 9a33e4e)

# 14.1-A2 · B 族批量过户

**性质**:A1 机关的批量应用。8 个动词照 create_goal 试点同款过户:人门闭包抽 service→两门同 service 同 zod→executor SQL 直写删除→经 `recordAgentAction`(注册+immediate+撤销覆盖三重准入)→events+收据同事务。**⛔改机关本体**(除新增§二.3 转录变体);`delete_time_block` **⛔本单**(②仪式机关归 A2b)。

## 一 · 过户清单(8 动词,census §6.2 行号为准)

| 动词 | 人门抽取点 | 特别条款 |
|---|---|---|
| create_sub_goal | 与 create_goal 共用 services/goals.ts#createGoal(census:两动词一份业务) | 仅 executor 侧改造,service 零新增 |
| create_task(恢复) | R/tasks.ts:54 闭包抽 service | 裁定①:拒绝桩删除,全套门恢复 |
| create_deck | R/decks.ts:30–57 | — |
| create_section | R/sections.ts:33–59 | 裁定⑧:order 默认=**MAX+1**,两门统一(人门若现为 0 值一并改,申报行为变化) |
| create_time_blocks | R/timeBlocks.ts:149–192 | 批量=一收据含全部实际 ID |
| update_time_block | R/timeBlocks.ts:195–221 | **收据存原字段值**(revert 要恢复原值,仅哈希不够) |
| link_task_cards | R/tasks.ts:296–333 | 裁定⑨:跳过语义跟人门;收据必含**实际创建链接 ID 清单** |
| complete_task | R/tasks.ts:156–236(核心 :179–209 状态闭包) | 裁定⑥,见 §二.3 |

## 二 · 机关扩展三件

1. **events 动词闭集扩**(迁移 074,照 073 保史范式):`goal_created` 复用;新增本批所需(如 task_created/deck_created/section_created/time_blocks_created/time_block_updated/task_cards_linked/task_completed——具体拼法申报,与 CHECK+schema.sql 同步);
2. **revert executables 逐动词**:create_* → 删所建行(409 护栏照 A1:已编辑/被引用拒撤);update_time_block → 按收据原值恢复;link_task_cards → 删收据清单中的链接;complete_task → 恢复原状态(收据存原 status/completed_at);
3. **转录变体 `recordChatTranscription`**(裁定⑥的机关面):complete_task 的"完成"=人类判断的 chat 转录——工具入参**强制** `user_utterance_anchor`(用户原话,缺锚=400 拒绝);events 行记 `actor_kind='human', channel='chat'`,meta 携原文锚+conversation_id(细则 §一.2 逐字);收据照常 source=agent_chat(执行体仍是 agent,出处是人)。⛔用 actor=agent 冒记人类判断,⛔无锚放行。

## 三 · create_card 退役(裁定②)

executor 拒绝桩 case 删除;definitions.ts 条目删除;system prompt 若引用该动词同步清理(申报);卡片创建唯一通道=create_proposal 卡型(零改动,现状已通)。

## 四 · 台账义务

预期零新增挂载期 API(revert 沿用既有端点);client 全库必跑;server 全量必跑(Python/MinerU 环境红按例申报留 HQ)。

## 五 · 禁区

⛔delete_time_block(A2b);⛔提案族(A3);⛔D 族读动词;⛔改 recordAgentAction 本体语义(新增转录变体=并列函数⛔改造);⛔判断域字段;⛔新设计安全对抗类用例(既有功能回归照跑,全库零排除);⛔碰 .git;⛔commit;⛔读 .env key 值;⛔用户库;⛔新依赖;新造凭据形合成值 ≤20 字符(域数据字符串不在射程)。

## 六 · 验收

1. typecheck+build 三端绿;`check:test-wiring`/`check:tech-debt-table` 绿;受影响静态门绿;
2. 定向:每动词 A1 五断言同款(同 service 同校验/同事务回滚/收据实际 ID/revert 往返/actor 正确)——complete_task 额外断言:无锚 400+events actor=human via=chat 带锚;create_card 断言:动词不存在;人门族回归全绿(tasks/goals/decks/sections/timeBlocks);server 全量+client 全库;
3. 冒烟(隔离库 API 级,provider stub 照 A1):8 动词各走一遍建→查收据→revert→复原;
4. 证据落 `docs/audits/2026-09-14-a2-verb-transfer-builder/`(⛔构建产物⛔原始日志目录);git/secrets HQ 收口。

## 七 · 申报义务

Result 必含:交付清单+numstat、迁移 074 动词拼法、各 revert 语义、转录变体落点、create_card 清理射程、行为变化清单(section order 等)、测试数字、未做项。冲突停线举证⛔自作主张。

## Result

> **结果**: BLOCKED / 未完工；2026-09-13 核证，工单日期为 2026-09-14。
> **From**: codex builder
> **needs**: fable(HQ) / claude 更正裁定⑨及本单对应条款。

施工前发现真冲突，依本单及用户指令停线；status 保持 ready，未翻 done。裁定⑨称“跟人门现语义(INSERT OR IGNORE 跳过+计数)”，但人门 `server/src/routes/tasks.ts:296–333` 实际为单 card_id、卡不存在 404、显式查重后 409、普通 INSERT、201 回完整链接；跳过与计数实为旧 executor `:905–937` 的语义。普查 §4.31（`:427–434`）及 §6.2（`:501`）与源码一致，独立只读复核未找到另一条批量人门可解此矛盾。未自行改变人门或选择批量失败政策。

停线证据及待裁边界见 [`STOP-LINK-SEMANTICS.md`](../../audits/2026-09-14-a2-verb-transfer-builder/STOP-LINK-SEMANTICS.md)，含现物行号、搜索射程与 SHA-256。若最终采用跳过，还需明确全跳过/实际链接清单为空时的收据语义：A1 `recordAgentAction.ts:47–50` 拒绝空 resources，本单禁止改其本体。

- **交付清单**：本 Result 与上述停线证据；产品交付 0 文件。numstat 以开工工作树副本为基准，未使用 git，最终实测见下。
- **迁移 074 / events 拼法**：未实施，未申报任何新增闭集动词为现物。
- **各 revert / 转录变体落点**：均未实施；A1 机关保持原样，未动 delete_time_block。
- **create_card 清理射程**：0；拒绝桩、definitions、prompt 均未修改。
- **行为变化清单**：0；section order 等尚未改造，8 动词均未过户。
- **测试数字**：0；typecheck/build、静态门、server 全量、client 全库、人门回归和隔离 API 冒烟均未启动；没有排除测试或设计安全对抗用例。
- **环境申报**：Python/MinerU 测试未跑，不能称已复现环境红；只确认准备快照时 `python` 命令不在 PATH，随后用现有 Node 完成快照。未修环境、未新增依赖。
- **未做项**：全部 A2 产品施工及验收待⑨更正后续工；git/secrets 留 HQ。零 git 命令、零 `.git` 访问、零 commit、未读 `.env` key 值、未触用户库、未新增凭据形合成值。

本轮 numstat（相对开工副本；排除行尾编码差异，非相对提交）：

| 新增行 | 删除行 | 文件 |
|---:|---:|---|
| 26 | 0 | `docs/agent-ops/handoffs/2026-09-14-v14-1-a2-verb-transfer-order.md` |
| 60 | 0 | `docs/audits/2026-09-14-a2-verb-transfer-builder/STOP-LINK-SEMANTICS.md` |

---

## 补遗一(HQ 裁定修正,2026-09-14 二轮)

builder 停线成立:裁定⑨原文把旧 executor 的"跳过+计数"误写为人门语义(HQ 事实错误,census §4.31 本就记对了)。**修正**:

1. link_task_cards 过户口径=**循环调人门单链 service(strict:缺卡 404/重复 409),同事务 all-or-nothing**——任一失败整批回滚,错误信息带肇事 card_id 明细(模型据此修正重试);
2. 收据=实际创建链接 ID 清单;全成才落账,与 recordAgentAction 非空 resources 约束天然兼容(空清单场景不存在——失败即无收据);
3. 行为变化申报:旧 agent 语义"跳过重复"→"整批失败",列入 Result 行为变化清单;
4. 裁定书原文已同步修正(保留删除线存证)。工单其余零变,续工。

## Result（二轮）

> **结果**: DONE / 二轮工程完工；按补遗一续工，status 翻 done。一轮停线记录原样保留。
> **From**: codex builder
> **实跑日期**: 2026-09-13；工单日期 2026-09-14。
> **留 HQ**: Python/MinerU 两项环境红、git/secrets 收口及主观验收。

### 交付清单

8 动词全部过户：人门闭包抽至 tasks/decks/sections/timeBlocks 四个 service，两门共享 Zod；create_sub_goal 复用原 goals#createGoal。executor 已删除对应 SQL 直写。registry 新增八个 immediate/internal 条目；definitions 由 manifest 投影九个已过户 chat 写动词（含 A1 create_goal），chat 共 30 项无重复，registry 23 项/public 仍 14 项。未新增挂载 API。

新增 recordChatTranscription 平行变体、迁移 074 及全部撤销覆盖；create_task 拒绝桩恢复、create_card 退役。client sectionStore 不再默补 order_index=0。新建 50 项定向功能回归并接入 test:v2；既有事件闭集回归同步 074；既有 notes 指纹回归按已授权 card-cover 交付同步过期基线。生成 manifest 和 agent-ops INDEX 已同步。

整理证据：[`ROUND2-EVIDENCE.md`](../../audits/2026-09-14-a2-verb-transfer-builder/ROUND2-EVIDENCE.md)、[`TEST-SMOKE.md`](../../audits/2026-09-14-a2-verb-transfer-builder/TEST-SMOKE.md)。审计目录无构建产物、无原始日志。

### 迁移 074 与 revert 语义

迁移 `074_v14_agent_planning_events` 新增七词：`task_created`、`deck_created`、`section_created`、`time_blocks_created`、`time_block_updated`、`task_cards_linked`、`task_completed`；子目标复用 `goal_created`。EVENT_VERBS、CHECK、schema.sql 同步为 22 词。保史实测：旧行全列原样、序列高水位 50→新首行 51、七新词可写、两条 append-only trigger 保留、重跑幂等。

| 动词 | 收据和撤销 |
|---|---|
| create_sub_goal | 实际 goal ID + 整行 hash；删本次行；已改或被子 goal/task/周期组/dependency 引用时 409 |
| create_task | 实际 task ID + 整行 hash；删本次行；已改、卡链接或活动历史引用时 409 |
| create_deck | 实际 deck ID + 整行 hash；删本次行；已改或有 section/card 时 409 |
| create_section | 实际 section ID + 整行 hash；删本次行；已改或有 card 时 409 |
| create_time_blocks | 一收据含全部实际 time_block ID；整批预检 hash/任务引用后同事务删除，任一不符 409 |
| update_time_block | 收据保存完整 before 原值及 after hash；恢复 label/type/start_time/end_time/color/updated_at；后续漂移 409 |
| link_task_cards | 仅实际新建 task_card ID 清单；同事务删除清单，保留旧链接；链接已改/缺失 409 |
| complete_task | 保存原 status/completed_at/updated_at、实际新增活动行、周期组前后快照；恢复原任务及计数、删本次活动；后续漂移 409 |

上述撤销通过既有 endpoint，业务、rolled_back 事件、收据状态更新同事务。events 历史保留。

### 转录变体与退役射程

`services/recordChatTranscription.ts` 与 A1 并列，原 `recordAgentAction.ts` 逐字节未改。complete_task 工具入参强制非空 `user_utterance_anchor`，缺锚 400；事件 `actor_kind=human/channel=chat`，meta 含未经改写的原文锚、conversation_id、tool、via=chat。收据仍 source_type=agent_chat，执行体 agent_context 仍 agent/chat，保留注册/immediate/revert 覆盖准入和同事务要求。

create_card 原 definitions 已无条目；本轮移除其陈旧注释、executor 拒绝桩、system-prompt 全部旧动词引用。四处 live 源（definitions/executor/prompt/manifest）文本查询为零引用；未知工具断言通过。create_proposal 卡型和其余提案族未改。

### 行为变化申报

1. link_task_cards 原“跳过缺卡/重复+计数”改为循环严格单链 service、任一 404/409 整批回滚；错误携肇事 card_id，成功增实际 links，skipped 字段退出；失败无事件/无收据，空 links 校验拒绝。
2. section 人门默认 0→MAX+1，client 默认补 0 同步撤除；显式顺序仍保留，旧 executor 原有追加行为归共用 service。create_sub_goal 新遵循人门 sibling MAX+1，并校验父 ID/course；父 ID 必填，course 省略则继承。
3. create_task 从拒绝桩恢复单任务创建；所有本批成功返回增加 receipt_id。生成学习计划、goal breakdown 仍按既有提案流程。
4. complete_task 仅转录人亲口完成；随人门补活动记录和周期计数，重复完成不重置原 completed_at、不重复累计。人门状态+调度字段整次更新也有事务保护。
5. 时间块/链接改为共享 Zod，原 SQLite 可自动转换的数字不再作为字符串字段接收；checklist_index 不再接受小数/数字字符串；校验错误统一 400。Agent 空时间块批次拒绝，人门既有 201 [] 保留。时间块创建沿人门支持 template_id，响应含完整实际行。
6. 原 inline 错误 JSON 改由共用 AppError/Zod 拒绝，chat 使用既有 orchestrator 错误投影；system prompt 同步新动词语义。

### 测试数字与验证边界

- A2 定向 **50/50 PASS**，含 8 条实际 HTTP SSE/provider stub→查实际收据→既有 HTTP revert→全域快照复原；每动词 apply 存储失败和 revert 存储失败回滚。人门 tasks/goals/decks/sections/timeBlocks 全部进入 HTTP 对照回归。
- server **全量 80 文件、723 项：721 PASS / 2 FAIL / 0 skipped / 0 cancelled / 0 todo**。无排除；第一次 719/723 后修复两个回归基线并完整重跑，剩余仅下列环境项。
- client **全库 167 文件、1722/1722 PASS**；零排除。server/client/shared typecheck/build 均绿。
- check:test-wiring **80 wired / 0 exempted / 0 unwired**；check:tech-debt-table 绿；registry **5/5**、manifest **10/10**、parity **10/10**，manifest check 绿，public 静态门 **14 项**绿；其余 runtime 静态门、**60 组** canvas model contract、performance seed、docs:check 均绿。
- `verify:v2-bn8-runtime` 内嵌 git/secrets，按本单禁令不运行该整串；其余每个验证子命令已逐项实跑，git/secrets 留 HQ。没有以过滤测试绕红。
- 既有 ledger 回归 **8/8**、notes lifecycle **13/13**、A1 **6/6** 通过。notes.ts 未改；其旧指纹锁与已 done 的 card-cover 工单脱节，精确逆转该工单两处 delta 可重现旧 hash，故仅同步现有断言标题/出处/期望值，未弱化完整 handler 校验。证据详见 ROUND2-EVIDENCE。

环境红实证留 HQ：`v2SourceMineruWiring.test.ts` 收集阶段 `spawnSync python.exe ENOENT`，文件内子测试未能启动；`v2SourceRegionCells.test.ts` 的 MinerU table regions 用例 `parser_failure/code 101`，本地 uv CPython 3.12.11 进程无法创建。未安装或修改 Python/MinerU。所有数据库/资产为测试自产内存或临时件；Vite/env 路径指向空临时目录/文件，未读仓内 .env key。

### 未做项与范围核证

未做项仅为按例留 HQ 的环境修复、git/secrets 和主观验收；没有宣称 server 全绿。link_task_cards 既有人门为 REST POST，client 仅有读消费，无创建 call site，registry 如实标 `none (human REST only)`；未假造人面路径或新增 UI。

零 git 命令、零 .git 访问、零 commit、零用户库访问、零新依赖；未新设计安全对抗用例。新 provider 合成值 `a2-synthetic` 为 12 字符；域对象 ID 不作为凭据。独立 AST/字节核证：delete_time_block 完全原样，D/提案族及其余 executor cases 原样，goals service 与 recordAgentAction 本体原样；人门仅工单指定 handlers 改动。构建产物只在本地既有构建目录，原始日志只在 OS temp。

### 二轮 numstat

相对二轮开工工作树文本副本，Node LCS 逐行计数并统一行尾；不是相对提交，未调用 git；仅列交付文本文件，不计构建产物。

<!-- A2_ROUND2_NUMSTAT -->

| Added | Deleted | File |
|---:|---:|---|
| 1 | 1 | client/src/stores/sectionStore.ts |
| 104 | 1 | docs/agent-ops/handoffs/2026-09-14-v14-1-a2-verb-transfer-order.md |
| 3 | 2 | docs/agent-ops/INDEX.md |
| 68 | 0 | docs/audits/2026-09-14-a2-verb-transfer-builder/ROUND2-EVIDENCE.md |
| 49 | 0 | docs/audits/2026-09-14-a2-verb-transfer-builder/TEST-SMOKE.md |
| 722 | 0 | docs/generated/tool-face-manifest.json |
| 1 | 1 | server/package.json |
| 7 | 3 | server/src/__tests__/v13EventsLedger.test.ts |
| 429 | 0 | server/src/__tests__/v14AgentVerbTransfer.test.ts |
| 10 | 8 | server/src/__tests__/v2NotesLifecycle.test.ts |
| 8 | 6 | server/src/agent/system-prompt.ts |
| 8 | 131 | server/src/agent/tools/definitions.ts |
| 113 | 166 | server/src/agent/tools/executor.ts |
| 58 | 0 | server/src/db/migrations/074_v14_agent_planning_events.ts |
| 7 | 0 | server/src/db/recordEvent.ts |
| 2 | 0 | server/src/db/schema.sql |
| 3 | 19 | server/src/routes/decks.ts |
| 3 | 18 | server/src/routes/sections.ts |
| 37 | 132 | server/src/routes/tasks.ts |
| 22 | 73 | server/src/routes/timeBlocks.ts |
| 18 | 0 | server/src/services/decks.ts |
| 80 | 0 | server/src/services/recordChatTranscription.ts |
| 21 | 0 | server/src/services/sections.ts |
| 112 | 0 | server/src/services/tasks.ts |
| 46 | 0 | server/src/services/timeBlocks.ts |
| 199 | 3 | server/src/services/toolFaceReceiptRevert.ts |
| 112 | 3 | server/src/toolFace/registry.ts |
| 36 | 1 | server/src/validators/index.ts |

Total: 28 files, +2279 / -568 lines.

---

## HQ 收口(fable,2026-09-14)

1. **一轮停线成立且系 HQ 之误**:裁定⑨把旧 executor 的"跳过+计数"误写为人门语义,builder 双拼举证(工单行号 vs 普查 §4.31)——修正裁定=循环人门单链 service 同事务 all-or-nothing,裁定书带删除线存证;
2. 二轮交付核验:8 动词全过户(executor 对应 SQL 直写全数删除)+create_card 退役(桩/definitions/prompt 三清)+`recordChatTranscription` 转录变体(无锚 400 抽查在案)+revert 全覆盖(update/complete 存原值恢复);
3. 敏感改动两处核过:sectionStore 默认值让位服务端 MAX+1(裁定⑧);v2NotesLifecycle 源锁基线推进**带完整授权链**(引单4 工单+回 B1c SHA 重构路径,⛔盲换——顺带解释了 A1 builder 环境红里那一项:基线在单4 后本就该走这次授权推进);
4. **本机全量 554/554 零红**(A2 新测 50 项入列);client 1722/1722(builder);Python/MinerU 两项=builder 沙箱既知;git/secrets 入收口单链。

A2 关门。12 写动词中 10 个已过门(A1 create_goal+本批 8+create_card 退役),余 delete_time_block(A2b ②仪式)+提案族(A3)。
