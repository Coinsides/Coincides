> **状态 (Status)**: done(二轮;一轮停线=运行时 enum 违 shared 隔离门,裁类型单源+运行时本地;HQ 本机全量 583/583 定案)
> **From**: fable(HQ) · **To**: codex(builder)
> **日期**: 2026-09-14
> **单号**: V14 主线 · 14.1-A3a · 提案族服务端统一(枚举合并+proposal_issued+organized_note 入 chat)
> **上游**: plan §14.1 提案族段+裁定书③(create_proposal=C 自域,补 proposal_issued)+census §4.16
> **射程裁定(HQ)**:board_arrangement/note_patch 两新型**⛔本单**——其预览/采纳面按 plan 归 14.3(装卸区)/14.4(差异预览),无面先立型=违"可见"不变量;chat 提案的通用可见面按 Henry 既裁归 Staging 谈判桌(V14 整体批),过渡面⛔造。

# 14.1-A3a · 提案族服务端统一

**性质**:提案数据层的族谱归一。现状=agent chat 5 型(executor create_proposal 直写 proposals 表)与材料库 3 型(proposals 路由三专用创建)两套词汇两套写路。本单:**统一枚举+统一创建 service+事件接线+organized_note 开放给 chat**。零新提案型,零新 UI。

## 一 · 统一枚举与创建 service

1. **型枚举归一**:盘点两族现型(agent 5 型以 executor E:222–241 实际接受值为准;材料 3 型=material_map/organized_note/material_reconciliation),合并为 shared 单一闭集(shared/types 落点申报);server 校验两路同吃此枚举;**⛔改任何现型的 data 契约**;
2. **统一创建 service**:`services/proposals.ts`(或既有文件扩展,申报)出 `createProposal(db, userId, input)`——材料三专用创建内部改调它(专用校验保留在各自入口,落库层归一);executor create_proposal case 同调它;
3. **proposal_issued 事件接线**(裁定书③):统一创建 service 内=INSERT proposals 与 `recordEvent(verb: proposal_issued)` 同事务(词已在闭集,census §5.2 记未接);actor 按来源:chat 路=agent、人门路=human(via 对应);⛔收据(提案 pending 本身≠执行,细则口径:pending 对下游=不存在)。

## 二 · organized_note 入 chat 枚举(plan 原文:零新直写路径的第一扩面)

1. executor create_proposal 的可受理型加入 `organized_note`——复用既有 `createOrganizedNoteProposal` service(R/proposals.ts:88 所调者),⛔第二套实现;
2. chat definitions 的 create_proposal 参数枚举同步;
3. 既有 organized_note 的人门创建/预览/apply 流零变(它已有 CourseDetail 完整面,"可见"不变量已满足——这正是它先行扩面的原因)。

## 三 · 台账/禁区/验收(照 A2 常备)

零新增挂载期 API;client 全库必跑;server 全量必跑(Python/MinerU 环境红按例申报)。禁区:⛔board_arrangement/note_patch;⛔新 UI/过渡提案面;⛔改现型 data 契约;⛔判断域;⛔改机关本体;⛔新设计安全对抗类用例(既有回归照跑零排除);⛔碰 .git;⛔commit;⛔读 .env key 值;⛔用户库;⛔新依赖;新造凭据形合成值 ≤20 字符(域数据不在射程)。

验收:1) 三端 typecheck/build+全门绿;2) 定向:①两族型全过统一枚举(非法型两路同拒)②材料三入口行为零变(既有 proposals 测试全绿)③chat 建 organized_note 提案→pending 行+proposal_issued 事件(actor=agent)→人门 CourseDetail 流 apply 可达(API 级)④proposal_issued 两路 actor 正确;3) server 全量+client 全库;4) 证据落 `docs/audits/2026-09-14-a3a-proposal-builder/`(⛔构建产物⛔原始日志);git/secrets HQ 收口。

## 四 · 申报义务

Result 必含:交付清单+numstat、枚举落点与两族现型盘点、统一 service 落点、事件接线口径、chat organized_note 参数形状、测试数字、未做项。冲突停线举证⛔自作主张。

## Result

**状态：停线，未完成；needs: HQ。** 工单保持 `ready`，未翻 `done`。本轮源码与功能回归已实施，但现有 shared 运行时架构门及裸 Node 产物加载失败，不能把测试世界通过写成完成。记录日期为工单 2026-09-14，实际验证发生于 UTC 2026-09-13，精确时间入证据。

### 停线证据与所需裁定

工单要求 shared 单一闭集且 server 两路共用；现有 `scripts/check-server-shared-runtime-import.mjs` 禁止 server 产品代码非 `import type` 地引用 shared，本次直接枚举接线命中 **6 处**（definitions/executor/validators/三材料 service）。编译虽通过，裸 Node 导入 `server/dist/validators/index.js` 实报 **`ERR_MODULE_NOT_FOUND`**，指向不存在的 `shared/types/index.js`；产物实际在 `shared/dist/types/index.js`。

active `current-state/tech-debt.md` **TD-21** 尚未清偿真共享；既例 A1′ 为本地副本加跨端全等测试，没有现成的 shared 枚举单源投影。**请 HQ 明确本单允许的运行时交付方式（A1′ 镜像例外或获准的定向投影/真包路径）后续建。** 本轮未擅自复制第二份手工闭集、放宽门、用动态 import 绕门或修改构建架构。两个指定机关本体均与开工快照字节一致。

另有独立红：`docs:check` 报 `docs/agent-ops/INDEX.md` 过期；本轮未改该索引，留 HQ。Python/MinerU 两项环境红见下，不与上述产品架构失败混为一类。

### 已实施清单与 numstat（未验收成品）

统计口径：本轮开工字节快照→停线现物的行 LCS，计数仅归一 CRLF；**未使用 git，不代表全工作树差分**。源码/测试 10 文件共 **+439/−83**。

| 文件 | + | − | 内容 |
|---|---:|---:|---|
| `shared/types/index.ts` | 15 | 0 | ProposalType 八型 + chat 六型子集 |
| `server/package.json` | 1 | 1 | 新回归加入既有 test:v2，依赖未变 |
| `server/src/agent/tools/definitions.ts` | 19 | 13 | chat 六型与两种 data 参数描述 |
| `server/src/agent/tools/executor.ts` | 23 | 7 | 闭集校验、统一创建、organized 复用 |
| `server/src/validators/index.ts` | 3 | 0 | proposalTypeSchema；原材料 schema 未变 |
| `server/src/services/proposals.ts` | 50 | 0 | 统一创建与同事务 issuance |
| `server/src/services/materialMapProposals.ts` | 13 | 23 | 专用创建改调统一 service |
| `server/src/services/materialReconciliationProposals.ts` | 4 | 16 | 同上 |
| `server/src/services/organizedNoteProposals.ts` | 13 | 23 | 同上，异步生成后同步写尾部 |
| `server/src/__tests__/v14ProposalUnification.test.ts` | 298 | 0 | 13 条功能回归 |

文档另交：`docs/audits/2026-09-14-a3a-proposal-builder/report.md`、`validation.json`、`changes.json`，以及本 Result。档案含命令、测试文件分母与字节指纹；无原始日志或构建产物。

### 枚举、service、事件与 chat 参数

- **两族现型**：chat 五型 `batch_cards/study_plan/goal_breakdown/schedule_adjustment/time_block_setup`；材料三型 `material_map/organized_note/material_reconciliation`。原 executor 无 type 闭集校验（census §4.16 G1），五型来源为现役 definitions；不把任意旧字符串扩认成合法型。shared 原三型 enum 在 `shared/types/index.ts` 补齐八型；`CHAT_PROPOSAL_TYPES` 只向 chat 扩 `organized_note`。
- **统一落点**：`services/proposals.ts:createProposal(db,userId,{type,data,context})`。三材料专用创建保留校验与生成，统一落库；三个 data 对象及全部 apply 源码经基线比较未变。map/organized 的材料状态更新与创建同在外层事务，organized 的 await 在事务之外。
- **事件口径**：统一 service 的 INSERT 与 `recordEvent(verb='proposal_issued')` 同一同步 immediate 事务；`objects=[{kind:'proposal',id}]`，meta 包含 proposal_type/conversation_id。chat `actor_kind=agent, channel=chat`；人门 `human/ui`；现有 channel 表达 via，不另造字段。chat 同时保存 proposals.conversation_id。**零执行收据、零自动 apply**。
- **chat organized_note 输入**：`{type:'organized_note',data:{course_id,document_ids?,source_material_ids?,segment_ids?,source_scope_ids?,source_board_id?,note_title?}}`。沿既有 `createOrganizedNoteProposalSchema`：course_id 必填 UUID，ID 数组与 source_board_id 为 UUID，note_title 可选 1–200 字符；不传 blocks，不要求旧五型 items。executor 复用 `createOrganizedNoteProposal`，返回 id/type/status/course_id/blocks_count/message。definitions 的 organized data 分支直接投影既有 Zod schema。

### 验证数字

| 验证 | 结果 |
|---|---|
| shared/server/client typecheck + build | 6/6 阶段通过；不代表产物能加载 |
| 定向 A3a + 既有材料库 | **72/72**（新 13 + 既有 59），0 skipped |
| client 全库 | **167 文件、1722/1722 测试通过** |
| server 全量 | **82 文件、752 条测试记录：750 pass / 2 fail / 0 skipped / 0 cancelled** |
| runtime 非 git/secrets 子门 | **21 项全发起，19 pass / 2 fail**（shared 导入门、docs:check） |
| 裸 Node 编译后 validator 导入 | **FAIL：ERR_MODULE_NOT_FOUND** |
| git diff / changed-file secrets | 按工单留 HQ，零执行 |

定向证成：八型共用校验、普通非法型 service/chat 同抛 ZodError；五型 data 原样 pending；三材料人门事件 human/ui；human/agent 普通外层事务取消时 proposal/event 同退；chat organized_note → pending+agent 事件 → GET 列表/详情 → 人工 POST apply → note/blocks/source references。pending 时下游域表及操作批次不增，apply 后才出现执行批次。未设计安全对抗类用例，既有测试零排除。

两项环境红留 HQ：①`v2SourceMineruWiring.test.ts` 在模块初始化 `spawnSync python.exe ENOENT`，该文件纳入运行但内部用例未能加载；②`v2SourceRegionCells.test.ts` 的 MinerU 表格区域测试解释器无法启动，code 101 / `parser_failure`。`docs:check` 的 inventory/glossary 子检查因前置 INDEX 失败未执行，未冒报通过。

### 未做项与边界

未完成 shared 运行时架构裁定及修复，故未完成验收、未翻 done。未修文档索引及 Python/MinerU；git/secrets 留 HQ。未增两新型/UI/过渡面/挂载期 API/判断域写；未改现型 data 契约、机关、依赖、权限和 agent 操作指令；零 `.git` 访问与 git 命令、零 commit、未读 `.env` key 值或用户库。验证使用空环境配置与 TEMP provider/资产目录、内存或既有测试自建临时库；新凭据形合成值最长 19 字符。真实 provider 与浏览器主观体验未测，本单证据仅为隔离 API 级。详细证据见 [停线报告](../../audits/2026-09-14-a3a-proposal-builder/report.md)。

---

## 补遗一(HQ 裁定,2026-09-14 二轮)

停线成立:运行时 enum 入 shared 违 server-shared 运行时隔离门(门是对的,⛔松门)。裁**类型单源+运行时各端本地**:

1. shared/types 落 **string-literal union 类型**(`type ProposalType = 'material_map' | ...`)——类型级单源,零运行时导出;
2. server 本地 `const PROPOSAL_TYPES = [...] as const satisfies readonly ProposalType[]` + 类型等式断言(union 成员与数组元素互覆盖,漂移=编译错)——运行时闭集本地化,契约仍锁 shared;
3. client 若需运行时清单,同款本地 const + satisfies(⛔跨端共享运行时值);
4. 已写的 enum 形态改造为上述;既有 ProposalStatus 若同病同修(申报)。

工单其余零变,续工。

## Result（二轮，按补遗一续工）

**builder 已完成，status 翻 done。** HQ 裁定的类型单源/各端本地运行时方案已落地，原 shared 导入架构门保持原样并转绿，裸 Node 加载通过；文档索引红已修复。Python/MinerU 两项环境红、git/secrets 与最终放行留 HQ。此段更新一轮停线结论；一轮 Result 与证据作为当轮记录原样保留。工单日期为 2026-09-14，实际验证为 UTC 2026-09-13，精确时间见二轮证据。

### 交付清单与二轮 numstat

二轮计数为开工字节快照→最终文件的行 LCS，仅归一 CRLF；零 git，不代表全工作树差分，也不与一轮计数相加冒充原始→最终差分。源码/测试 **9 文件，+68/−54**。

| 文件 | + | − | 二轮内容 |
|---|---:|---:|---|
| `shared/types/index.ts` | 11 | 23 | ProposalType/ProposalStatus 改纯 union，chat 子集改类型 |
| `server/src/services/proposalTypes.ts` | 28 | 0 | 本地八型/六型 const，satisfies + 双向类型等式 |
| `server/src/validators/index.ts` | 2 | 2 | `z.enum(PROPOSAL_TYPES)` |
| `server/src/agent/tools/definitions.ts` | 1 | 1 | chat 枚举改导本地闭集 |
| `server/src/agent/tools/executor.ts` | 2 | 2 | 本地闭集与 union 字面值 |
| `server/src/services/materialMapProposals.ts` | 1 | 2 | 去 shared 运行时引用 |
| `server/src/services/materialReconciliationProposals.ts` | 1 | 2 | 同上 |
| `server/src/services/organizedNoteProposals.ts` | 1 | 2 | 同上 |
| `server/src/__tests__/v14ProposalUnification.test.ts` | 21 | 20 | 迁移原 13 条回归枚举引用，零新场景 |

一轮 `services/proposals.ts` 统一创建、`server/package.json` 回归接线继续交付，二轮均未改。文档另交 `docs/audits/2026-09-14-a3a-proposal-builder/` 下 `report-round2.md`、`validation-round2.json`、`changes-round2.json`，本 Result/status，以及自动生成的 `docs/agent-ops/INDEX.md`。文档 numstat/指纹另列 changes-round2.json；无构建产物、无原始日志入档。

### 枚举、service、事件和 chat 参数

- **两族现型**：chat 原五型 `batch_cards/study_plan/goal_breakdown/schedule_adjustment/time_block_setup`；材料三型 `material_map/organized_note/material_reconciliation`。原 executor 未做闭集校验，五型仍以现役 definitions 为据，不扩认旧任意字符串。
- **类型单源**：`shared/types/index.ts` 的 `ProposalType` 八型 union；`ChatProposalType = Exclude<ProposalType,'material_map'|'material_reconciliation'>`。server 本地 `PROPOSAL_TYPES` 与 `CHAT_PROPOSAL_TYPES` 各以 `as const satisfies readonly ...[]` 加 `SameMembers/Assert` 双向等式锁漂移；两创建路径仍同吃 `proposalTypeSchema`。shared 提案族零运行时导出，未跨端共享运行时值。
- **ProposalStatus 同修申报**：改为 `'pending'|'applied'|'discarded'` 纯 union。server/client 源码无其运行时消费者；client 无上述提案枚举值消费，无需本地运行时清单。
- **统一 service**：`server/src/services/proposals.ts:createProposal(db,userId,{type,data,context})`。材料三入口保留专用校验/生成，executor 五型直调统一创建；organized_note 复用既有 `createOrganizedNoteProposal`，零第二套生成实现。
- **事件口径**：INSERT pending 与 `recordEvent(verb='proposal_issued')` 同一同步 immediate 事务；map/organized 的材料状态尾写同属外层事务，organized await 在事务外。chat `agent/chat`、人门 `human/ui`；channel 承载 via，objects 为 proposal 身份，meta 为 proposal_type/conversation_id。零执行收据、零自动 apply。
- **chat organized_note 入参**：`{type:'organized_note',data:{course_id,document_ids?,source_material_ids?,segment_ids?,source_scope_ids?,source_board_id?,note_title?}}`，沿既有人门 Zod schema：course_id 必填 UUID；ID 数组/source_board_id 为 UUID；note_title 可选 1–200 字符。不传 blocks、不要求旧五型 items。返回 id/type/status/course_id/blocks_count/message。

三个材料 data initializer 与全部 apply 函数相对二轮基线均未变；统一 service、recordEvent、recordAgentAction、原架构门及 package/lockfile 均字节未变。未松门、未改构建架构。

### 验证数字

| 验证 | 二轮结果 |
|---|---|
| shared/server/client typecheck + build | **6/6 阶段通过** |
| 定向 A3a + 既有材料库 | **72/72**（原 13 + 59），0 skipped |
| client 全库 | **167 文件、1722/1722** |
| server 全量 | **82 文件、752 条记录：750 pass / 2 fail / 0 skipped / 0 cancelled** |
| runtime 非 git/secrets 子门 | 原总门前 **21 项，21/21 通过**，含 shared 导入门与完整 docs:check |
| 裸 Node 产物加载 | validator/本地闭集/四提案 service/definitions/executor 共 **8 模块通过**；shared 产物无提案族运行时导出 |
| git diff / changed-file secrets | 工单指定 HQ 收口，零执行 |

定向证成八型与 chat 六型、普通非法型双路同拒、材料三入口行为、两路 actor、普通业务外层事务取消时 proposal/event 同退；chat organized_note → pending+agent 事件 → GET 列表/详情 → 人工 POST apply → note/blocks/source references。pending 时下游域表与操作批次不增，apply 后才新增执行批次。

环境红按例留 HQ：①`v2SourceMineruWiring.test.ts` 初始化 `spawnSync python.exe ENOENT`，文件入运行集合但内部用例未能加载；②`v2SourceRegionCells.test.ts` MinerU 表格区域测试解释器启动失败，code 101 / parser_failure。既有回归全量零排除，未改预期值掩盖环境失败。

### 未做项与证据边界

未修 Python/MinerU，未运行 git/secrets，未代 HQ 放行。未新造安全对抗场景、提案型、UI/过渡面、挂载期 API、判断域写入或 data 契约；未改机关、依赖、权限及 agent 操作指令。二轮未新增凭据形合成值，一轮测试沿用 email 19 字符、password_hash 9 字符。

零 .git 访问/零 git 命令/零 commit；未读 .env key 或用户库。外层白名单环境、空 dotenv/Vite 配置、TEMP provider/资产、内存或既有测试临时库隔离验证。未调真实 provider 或做主观浏览器验收。**本单证据为 API 级可达**：现有 CourseDetail 没有取回 chat pending 的界面入口，本单按零 UI 射程未补，因此不声称该真实 UI 链已通过。完整二轮证据见 [二轮报告](../../audits/2026-09-14-a3a-proposal-builder/report-round2.md)。

---

## HQ 收口(fable,2026-09-14)

1. 一轮停线成立(架构门拦运行时越界,门对)——裁定"shared 纯 union 类型+各端本地闭集 satisfies 锁漂移"落地,门零松动;
2. 二轮交付核验:两族提案型过统一枚举+统一创建 service(材料三入口行为零变)+proposal_issued 同事务接线(actor 分路正确)+organized_note 入 chat 枚举(复用既有 service 零二套);
3. **本机全量 583/583 零红**;定向 72/72+client 1722/1722(builder);git/secrets 入收口单链;
4. board_arrangement/note_patch 两新型依射程裁定押 14.3/14.4 面就位。

A3a 关门——**14.1 同门同钥重铸今夜射程全清**(A0 普查→十裁→A1 机关→A2 八动词→A2b 仪式→A3a 提案族)。
