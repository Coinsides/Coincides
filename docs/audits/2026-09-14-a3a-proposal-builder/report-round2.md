> **状态 (Status)**: active（builder 二轮完成；Python/MinerU 环境红与 git/secrets 留 HQ）
> **日期**: 2026-09-14（工单日期；实跑 UTC 2026-09-13，时间见 validation-round2.json）
> **From**: codex builder
> **权威 (Authoritative)**: 否；工程回执，非 HQ 放行

# 14.1-A3a · 二轮完成报告

按工单补遗一完成改造。一轮的 shared 运行时导入冲突、裸 Node 加载失败与文档索引过期均已解决；本次相关代码门全绿。server 全量仍有两项已知 Python/MinerU 环境失败，按工单申报留 HQ。原 report.md、validation.json、changes.json 与一轮 Result 保留为当轮停线记录；当前结论以本二轮报告及工单末尾二轮 Result 为准。

## 实现与枚举落点

- `shared/types/index.ts`：`ProposalType` 为八成员 string-literal union；`ChatProposalType` 为排除 `material_map/material_reconciliation` 后的六型类型。提案族零运行时导出。
- `server/src/services/proposalTypes.ts`：本地 `PROPOSAL_TYPES` 与 `CHAT_PROPOSAL_TYPES`，各自 `as const satisfies readonly ...[]`；`SameMembers`/`Assert` 编译期双向覆盖断言拒绝成员增加或遗漏造成的漂移。
- `server/src/validators/index.ts`：`z.enum(PROPOSAL_TYPES)`。definitions/executor 与三个材料 service 不再运行时引用 shared；service 参数受共享 union 约束，创建时仍走同一 schema。
- `ProposalStatus` 同修为 `'pending' | 'applied' | 'discarded'`。本轮限定扫描 server/src、client/src、shared/types 未发现其运行时消费者；client 也无这两个枚举的运行时消费，不新增 client 清单。
- 一轮统一创建、事件接线、organized_note chat 扩面和 13 条功能回归全部保留；测试只迁移枚举引用与断言，没有增加测试场景。

| 两族盘点 | 原有现役型 |
|---|---|
| chat 五型 | `batch_cards`, `study_plan`, `goal_breakdown`, `schedule_adjustment`, `time_block_setup` |
| 材料三型 | `material_map`, `organized_note`, `material_reconciliation` |

chat 只扩 `organized_note`。原 executor 没有 type 闭集校验，五型以现役 definitions 为据；不把旧任意字符串认作合法型。旧无产品调用方的 canvas_layout 遗留不在本单现役八型内，未扩改。

## 创建、事件与参数

统一落点仍为 `server/src/services/proposals.ts:createProposal(db,userId,{type,data,context})`。三材料入口保留专用校验和生成，落库统一；executor 的旧五型直接调用统一 service，organized_note 复用既有 `createOrganizedNoteProposal`。该统一 service 二轮字节未变。

INSERT pending proposal 与 `recordEvent(verb='proposal_issued')` 同一同步 immediate 事务；map/organized 的材料状态尾写同在外层事务，organized 的异步生成在事务外。事件 `objects=[{kind:'proposal',id}]`，meta 为 proposal_type/conversation_id。chat 来源为 `agent/chat`，人门为 `human/ui`；现有 channel 承载 via 语义。零执行收据、零自动 apply。

chat 输入为 `{type:'organized_note',data:{course_id,document_ids?,source_material_ids?,segment_ids?,source_scope_ids?,source_board_id?,note_title?}}`，复用既有人门 Zod schema。course_id 必填 UUID；ID 数组、source_board_id 为 UUID；note_title 可选 1–200 字符。不给 blocks、不要求旧五型 items；返回 id/type/status/course_id/blocks_count/message。

三个材料 data initializer 与全部 apply 函数经二轮字节快照/AST 提取比对均未变；recordEvent、recordAgentAction、原架构门、package/lockfile 均未变，指纹见 validation-round2.json。未松门或改变构建体系。

## 验收

| 验证 | 本轮结果 |
|---|---|
| shared/server/client typecheck + build | 6/6 阶段通过 |
| 定向 A3a + 既有材料库 | 72/72，13 + 59，0 skipped |
| client 全库 | 167 文件，1722/1722 |
| server 全量 | 动态枚举 82 文件，752 条测试记录：750 pass / 2 fail / 0 skipped / 0 cancelled |
| runtime 非 git/secrets 子门 | 原总门前 21 项逐项执行，21/21 通过 |
| 裸 Node 产物加载 | validator、本地闭集、四个提案 service、definitions、executor 共 8 模块加载通过；shared 产物无提案族运行时导出 |
| docs:check | INDEX、inventory、glossary 全部通过；只重生成 agent-ops/INDEX.md |
| git / changed-file secrets | 工单明确留 HQ，本轮零执行 |

定向回归覆盖：八型共用校验、普通非法型双路同拒、五型 data 原样 pending、三材料人门 human/ui 事件、human/agent 普通外层业务事务取消时 proposal/event 同退、chat organized_note → pending/agent 事件 → GET 列表/详情 → 人工 POST apply → note/blocks/source references。pending 时下游域表和操作批次不增，apply 后才新增操作批次。

两项环境红分别为：`v2SourceMineruWiring.test.ts` 模块初始化 `spawnSync python.exe ENOENT`（文件纳入运行，但内部用例未能加载）；`v2SourceRegionCells.test.ts` 的 MinerU 表格区域测试解释器启动失败，code 101 / parser_failure。未排除、未修环境、未改期望值。

验收为隔离 API 级。现有 CourseDetail 只持有本地创建响应的 activeProposal，尚无取回 chat pending 的界面入口；本单按工单禁止新增 UI，因此不声称真实 UI 全链已验或该入口已补齐。

## 二轮 numstat 与证据

计数为二轮开工字节快照到最终文件的行 LCS，仅归一 CRLF；未使用 git，不代表全工作树差分。源码/测试 **9 文件，+68/−54**；一轮 +439/−83 仍是独立历史口径，不能与二轮相加冒充原始到最终差分。

| 文件 | + | − |
|---|---:|---:|
| shared/types/index.ts | 11 | 23 |
| server/src/services/proposalTypes.ts | 28 | 0 |
| server/src/validators/index.ts | 2 | 2 |
| server/src/agent/tools/definitions.ts | 1 | 1 |
| server/src/agent/tools/executor.ts | 2 | 2 |
| server/src/services/materialMapProposals.ts | 1 | 2 |
| server/src/services/materialReconciliationProposals.ts | 1 | 2 |
| server/src/services/organizedNoteProposals.ts | 1 | 2 |
| server/src/__tests__/v14ProposalUnification.test.ts | 21 | 20 |

文档另交本报告、validation-round2.json、changes-round2.json、工单追加 Result/status done，以及生成的 agent-ops/INDEX.md。文档行数与指纹另列 changes-round2.json，避免与源码计数混用。验证记录包含命令、时间、82 文件完整分母、失败分类及守门/数据完整性指纹；不归档原始日志或构建产物。

## 边界与未做项

Python/MinerU 环境与 git/secrets 收口留 HQ；HQ 主观验收/放行未代行。未增加 board_arrangement/note_patch、UI/过渡面、挂载期 API、判断域写入、现型 data 契约、依赖或安全对抗场景。未改机关、权限或 agent 操作指令。

零 git 命令、零 .git 访问、零 commit；未读 .env key 或用户库。验证外层只继承 OS/工具环境白名单，dotenv/Vite 指向空 TEMP，provider/上传/资产均在 TEMP，数据库为内存或既有回归自建临时库。二轮未新增凭据形合成值；沿用一轮 19 字符 email 与 9 字符 synthetic password_hash，既有全库回归零排除。
