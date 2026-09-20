> **状态 (Status)**: active
> **层 (Layer)**: 审计 / Builder evidence
> **日期 (Updated)**: 2026-09-20
> **权威 (Authoritative)**: 否；工程交付证据，复核与放行留 HQ

# V14 C2 / 14.4 builder 交付

范围严格取自 [C2 工单](../../agent-ops/handoffs/2026-09-20-v14-c2-intent-router-order.md)。基线只读核验为 `fc5b82a4bc6d9280b7d0a142043cfbac07e8e29a`（C1）。零 git 写操作；预存的无关未跟踪文件未编辑。CodeGraph 已优先探测，但当前 CLI 不在 PATH、无可调用 MCP，因此用源文件和只读 git 完成现物考古。

## 现物与逐件接线

| 项 | 现役依据 / 实现入口 | 行为与验证 |
|---|---|---|
| prompt 直令 | `server/src/agent/intentRules.ts:4`、`system-prompt.ts:47`；F17/A4 amendment 先例 `docs/contracts/TextFlow-Contract.md:167` / `:177` | 只增 memory / material-proposal 两类自然直令；[amendment](../../contracts/Agent-Intent-Prompt-Amendment.md) 保留原还原 SHA-256，净增707 UTF-8字节。详见 [prompt 与评测](prompt-and-eval.md)。 |
| B2 contextHint 扩载荷 | `shared/types/agentContextHint.ts:17`、`server/src/validators/agentContextHint.ts:21`、`server/src/agent/attentionContext.ts:4`、`orchestrator.ts:138` | `note_view.data.selection={note_id,block_ids[]}`，同 note 校验、1–32块；复用 read_note，最多8页/16000字符，漏块与截断显式提示。没有新 Agent 读器、没有板侧选区。 |
| 人的选区入口 | `client/src/pages/Notes/canvasEngine/layers/NoteWritingSurfaceLayer.tsx:1323` | 复用现役块/范围选择，先完成普通编辑保存，再向同一会话传 contextHint；[前端证据](frontend.md)。 |
| a3a / proposal-inbox 扩族 | `shared/types/notePatch.ts`、`server/src/validators/notePatch.ts`、`server/src/services/notePatchProposals.ts`、`server/src/agent/tools/definitions.ts:114` | 九型中的 note_patch；经既有 create_proposal 信道发出，创建冻结版本/旧文，无正文写入。详见 [生命周期](note-patch-backend.md)。 |
| 唯一正文人门 | `server/src/services/atomicTextSave.ts`、`client/src/pages/Notes/canvasEngine/hooks/useNoteAgentHumanEditor.ts:44`、`useTextFlowHistory.ts:541` | 逐 patch diff / 采纳 / 弃；首保存正文与 ACK 同事务。既有撤销/重做不重发 ACK。首保存失败只恢复本地草稿，不写回旧文、不入撤销栈。 |
| 纯编译器 | `server/src/agent/intentCompiler.ts:16` / `:29` | 纯输入输出；不调用模型、DB、时间、随机数或执行器，不注册 Agent 工具。规则表见下。 |
| 人放行计划 | `server/src/services/agentIntentPlans.ts:45` / `:73`、`server/src/routes/agent.ts:62` / `:91`、`client/src/components/AgentPanel/IntentPlanCard.tsx` | 保存计划不执行；再想想零执行；放行前重读目标校验，板计划复用未修改的 C1 七动词、会话 batch_id 与整批撤销，笔记计划只发 note_patch。执行收据按原 tool-call/result 相邻配对入会话史，延后放行仍保留配对。 |
| 答卡投影 | `server/src/db/migrations/082_v14_agent_message_meta.ts:7`、`server/src/agent/orchestrator.ts:154` / `:384`、`client/src/stores/agentStore.ts:234`、`NoteAnswerCards.tsx:70` | 仅在既有 agent_messages 增 JSON object meta 列；选区锚/问题存 answer_card，计划存 intent_plan。SSE message_meta 携最终持久正文，避免多轮工具前旁白混入同ID答卡；done/EOF与历史一致。天青页边答卡；散去保留会话史，插入为块走人门及既有 createdBlock 撤销。无新真相表。 |

## 编译规则表（有限启发式）

下表是纯函数 `INTENT_COMPILER_RULES` 的申报；每行正反例由 `v14IntentRouter.test.ts` 实跑。无匹配、目标不唯一、缺锚或普通提问都回到原会话，不编造执行参数。材料整理的第二类自然直令留在普通模型 + create_proposal 会话流程，不增加第四类编译计划。

| 规则 | 正例 | 反例 | 编译目标 |
|---|---|---|---|
| memory-directive | 请记住我喜欢短答案 | 记忆是什么 | save_memory 提示；实际写仍需成功工具收据 |
| board-grid | 整理这块板，按网格排列 | 解释这块板 | board_move_member；至多100个已放置成员，三列网格 |
| board-sticky | 添加便签“待核对” | 便签是什么意思 | board_create_sticky |
| board-mount | 挂载笔记“note-id” | 挂载是什么 | board_mount_member；按明确ID解析并显示真实名称 |
| board-member-move | 移动“章节一”到 120,240 | 移动到哪里 | board_move_member |
| board-layer | 把“章节一”放入图层“重点” | 如何创建图层 | board_set_member_layer |
| board-edge | 连接“章节一”到“章节二” | 解释两者的关系 | board_create_edge |
| board-sticky-edit | 便签“待核对”改为“已核对” | 解释便签 | board_update_sticky |
| board-visual-move | 移动装饰“visual-id”到 120,240 | 装饰是什么 | board_patch_visual |
| note-unit-replace | 把“旧文字”改为“新文字” | 解释“旧文字” | create_proposal:note_patch；选区内唯一整 unit 旧文匹配 |

## schema、写权与闸群申报

- note_patch 输入为 `{note_id,patches:[{block_id,unit_id?,new_text}]}`；多 unit 块须明确 unit_id。存储附旧文、block revision/hash、patch 状态。只允许整 unit 替换；不改 TextFlow schema、结构或跨块位置。非目标 unit 正文投影与真实客户端一致。
- 人门 `PUT /note-blocks/:id/text-save` 可附 `proposal_patch:{proposal_id,patch_index}`，严格核验提案快照与本次候选内容；正文与采纳状态同事务。全案 `/apply` 对 note_patch 返回409，不能绕过笔记编辑 runtime。
- meta JSON object 为既有会话消息的附属投影信息；schema 默认 `{}` 兼容历史消息。`intent_basis` 是服务端冻结的输入/上下文摘要，非新业务真相表。
- 未新增/修改 C1 七动词。create_proposal 仍属 `channel_write`；contextHint 只是载荷扩展，能力名集合不变。已运行 `check-agent-knowledge.ts --update` 与 tool-face manifest 生成/校验；名集合指纹仍为 `6b15e1be7ac79342203c14d32bd9ab2900bf6be8d4c337e9f97718f0193ce816`。原始证据 `knowledge-update.log` / `manifest-update.log`。
- 说明书 [§三 / §五](../../agent-ops/current-state/app-operating-manual.md) 已同步 note_patch 人门/部分采纳/失效/撤销、两类直令、注意力预算、计划放行和答卡出口；同步封面边界旧描述。INDEX / inventory 随最终文档生成。

## 验证口径

最终计数见本目录各 `*-summary.json` 与工单 Result。原始输出统一留 `.codex-tmp/c2-intent/`，早期施工失败日志保留，不以重跑覆盖原日志。验证器 [run-validation.mjs](run-validation.mjs) 使用内存DB、空 dotenv/Vite env 和隔离临时目录，无用户库/真实模型。server/src + server/scripts 全量自动发现，不排除既有安全回归；每文件 Node 600000ms、外部660000ms，包括 Wilderness。运行时门拆为**非 git/secrets 23组件**，完整25组件门不宣称通过，git检查与secrets留 HQ。

最终服务端 C2/Agent 邻接定向 **20文件325/325**（`targeted-2026-09-20T09-28-51-878Z-2644`），包含最后追加的多轮答卡真实 HTTP 回归；shared/client/server/agent-eval 编译检查全部通过（`typecheck-2026-09-20T09-29-19-260Z-16560`）。scripted **10场景88/88**、harness **14/14**（`evals-2026-09-20T09-29-17-578Z-10468`）。这些套件彼此有重叠，不相加冒充独立测试总数。

server 全量 **105/105文件整跑，1060 tests：1058 pass / 2 fail / 0 cancelled / 0 skipped / 0 todo**，不宣称全绿。两项失败均为 Python 进程启动错误：`v2SourceMineruWiring` 找不到 `python.exe`（ENOENT）；`v2SourceRegionCells` 的 MinerU Python 无法创建进程（code101）。未改测试、未排除、未装依赖绕过，具体环境证据见 [server-full.md](server-full.md)。Wilderness **27/27，444.175秒**，按600秒 Node预算完整执行。全量 TAP 与105文件清单另经 [独立核数](server-full-count-audit.json) 对账。

全量启动早于最后答卡修复；它的 Attention 文件为5项，随后最终 Agent 定向20文件325项覆盖修改后的 orchestrator / route 与新增第6项 HTTP 回归。最终客户端全库来自冻结后的 `gates-2026-09-20T09-29-19-435Z-18512`：**223文件2274/2274**。较早 `client-full-summary.json` 是修复前执行记录，不作为最终客户端覆盖证明。

最终**非 git/secrets 23/23组件全部通过**，含 client/server 生产构建、工具投影/指纹、canvas边界/性能与docs门，详见 [gates-summary.json](gates-summary.json)。工单追加Result并生成索引后又单独执行docs检查，PASS，原始日志 `.codex-tmp/c2-intent/docs-final-check.log`。完整25组件门中的git检查与secrets仍待HQ。

## 未做项 / 交接边界

未做 git 写操作、commit、push、PR、merge；未跑 HQ 保留的 git检查/secrets。没有真实模型或用户库访问、新依赖、新设计安全对抗用例、Relation/判断域、坐标契约、TextFlow真相schema、C1动词实现变更。没有板选区、答卡“存走”、轻档行内修订或重档投影分票。浏览器主观验收与最终放行仍由 HQ 处理；组件/HTTP/scripted 测试不冒充主观验收。
