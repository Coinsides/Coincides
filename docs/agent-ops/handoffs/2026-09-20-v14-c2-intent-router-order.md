> **状态 (Status)**: done(builder 一轮交付+HQ 收口全绿,2026-09-20:client 223 文件 2274/2274 亲跑定案;git diff --check+secrets(91 文件)双门绿;wilderness 27/27(444s,预算行首见成效);余 2=Python/MinerU 基线)
> **From**: fable(HQ) · **To**: codex(builder)
> **日期**: 2026-09-20
> **单号**: V14 Agent 墙 · C2 意图路由+注意力框+note_patch+答卡(14.4)
> **上游**: `plans/v14-agent-era-plan-draft.md` §14.4(意图路由器=编译器⛔工具;注意力框原语,拍)+§14.1(note_patch=改用户文字唯一合法通道,预告)+ `design/note-page-design.md` §3.3(路由八字「有址在场,无址上桌」;三不变量可见/可拒/可退恒定;仪式四档;「直写」收窄=无痕静默替换唯一永禁)+ live 标本(claude-log §159:自然语言"请记住"→零工具空头支票;手术③=轻映射先行⛔重型 NLP)+ 会议记录 09-16 §三点八(答卡:圈选提问→页边答卡,零新写权)+ C1 板沙箱现物(batch/装卸区,本单编译目标)。**方向已拍,细则照本单,⛔重开方向。**

# C2 · 意图路由+注意力框+note_patch+答卡(Agent 的脑)

**性质**:Agent 学会把「人话」编译成「域动词」。宪法③在本单兑现:**用户文字永不直写,note_patch 提案=唯一合法通道**。五件套,共享一套选区锚机械。

## 一 · 直令识别轻映射(live 标本手术③)

1. **最便宜的刀**(§159 裁向):prompt 契约层加「记忆类自然指令→工具映射」节——"记住/别忘了/下次提醒我"类语句=必须调用 save_memory,⛔空头支票;措辞随单铸进 prompt 契约(F17/A4 amendment 先例通道,还原哈希锁随 --update);
2. 同法覆盖「提案类自然指令」(整理这份材料→create_proposal)——两类映射,⛔更多(超出两类=重型 NLP 禁区);
3. 验收=§143 标本转正:scripted 场景断言自然语「请记住X」产生 save_memory 成功收据(红旗 claim_without_receipt 零)。

## 二 · 注意力框原语(L1 黄金路径)

1. **选区锚**:用户在笔记选中块(现役选区机器)→「问 Agent」入口把 `selection={note_id, block_ids[]}` 作为 contextHint 载荷发进会话(14.2 contextHint schema 现物,扩载荷申报,⛔新信道);
2. Agent prompt 组装携选区语境(块内容经现役 read_note 投影拼入,预算申报上限);
3. 板侧选区⛔本单(板语境=L3 候后)。

## 三 · note_patch 提案型(宪法③的正门)

1. 新提案类型 `note_patch`:payload=`{ note_id, patches: [{ block_id, unit_id?, new_text }] }`(v1=整 unit 文本替换,⛔结构操作⛔跨块移动);Agent 侧经现役 create_proposal 信道发出;
2. **apply=人门**:提案收件箱内呈**就地 diff 逐块采纳**(仪式中档,拍定):逐 patch 显示旧文/新文对照,勾=采纳(以人门 text-save 执行,walk 现役块保存门与撤销)、叉=弃;部分采纳合法;
3. 三不变量全真:可见(diff 预览)/可拒(逐块叉)/可退(text-save 走现役撤销栈);轻档(行内修订痕)与重档(投影区分票)⛔本单——候四件家具终拍;
4. 靶块已变(版本冲突)→该 patch 显示失效不可采纳,⛔盲改。

## 四 · 意图路由器 v1(编译器⛔工具)

1. **编译不执行**:路由器=服务端纯函数族,输入=(粗意图文本+选区锚+域上下文),输出=**计划**(域动词清单,每条绑锚)——⛔注册为 Agent 工具⛔自动执行;
2. v1 编译目标三类:①板整理意图→C1 七动词 batch 计划;②记忆直令→save_memory 提示(与 §一 同源);③笔记修改意图→note_patch 提案草案;
3. **放行仪式**:计划以「计划卡」呈现在聊天流(动词清单+目标对象名),用户「放行」→板域走 C1 batch 执行(共享 batch_id 整批可撤)/笔记域落 note_patch 提案;「再想想」=丢弃零执行;
4. 编译器的意图分类=启发式+关键词层(申报规则表),⛔真实模型内嵌调用(编译器自身零模型依赖;Agent 会话本身的模型照旧)。

## 五 · 答卡机关 v1

1. 选区提问(§二入口)的回答呈现为**页边答卡**:锚在被圈选块的页边眉批位(浮层,天青系 token,样式参照宋史手册答卡),含问题摘句+回答;
2. 出口两个:**散去**(默认,关卡后全文留会话史)/**留下**(人点「插入为块」→以人门在锚点下方插段落块,人的动作零 Agent 写权);**「存走」出口⛔本单**(候四件家具终拍);
3. 答卡=会话消息的投影,零新真相表(锚定关系存会话消息 meta,申报)。

## 六 · 验收与禁区

1. 定向:两类直令映射+prompt 契约 amendment 落档+选区锚载荷往返+note_patch 全生命周期(发/diff/部分采纳/冲突失效/撤销)+编译器三类计划(规则表正反例)+放行与丢弃+答卡锚定与两出口;agent 族回归+client 全库+server 全量;既有回归零破(C1 板沙箱/提案收件箱/收据条/contextHint);
2. **评测跟版:随单 2 场景**——①直令转正(§143 标本:自然"请记住"→save_memory 收据,红旗零);②note_patch 旅程(提案→pending→部分 apply 块文字变+可撤,discard 零变,冲突 patch 失效);
3. 闸群义务:注册表变更(note_patch 提案型+contextHint 载荷扩展)走 effectClassification/指纹 `--update`/说明书 §三/§五 同步;
4. 证据落 `docs/audits/2026-09-20-c2-intent-builder/`(蒸馏件),原始日志留 `.codex-tmp/c2-intent/`;
5. **禁区(全部带射程)**:⛔一切 git 写操作(add/commit/push/reset/改 `.git`);只读 git 明文允许(含验证门内部);git 检查+secrets 两组件留 HQ,其余按「非 git/secrets N 组件」申报;**注册表/写门/prompt 仅限本单五件及其义务面**(⛔动 C1 七动词⛔新读器);⛔Relation/判断域;⛔Agent 直写笔记(note_patch apply=人门执行,唯一路径);⛔TextFlow 真相 schema(unit 文本替换走现役 text-save 门=内容变更非 schema 变更);⛔坐标契约九条;⛔新依赖;⛔真实模型调用(场景 scripted;编译器零模型内嵌);⛔用户库;⛔新设计安全对抗类用例(既有功能回归全库整跑明文允许零排除);合成凭据形值 ≤20 字符;新 `--sk-` token 后段 ≤18 字符。Result:prompt amendment 申报+载荷 schema 申报+note_patch 生命周期申报+编译规则表+逐件行号+两场景断言表+测试数字+说明书申报+未做项。冲突停线举证。

## Result

2026-09-20 · Codex builder。五件已实现并交工作树，未 commit、未做任何 git 写操作。施工无工单冲突；**工程完成不等于全量全绿或 HQ 放行**。总证据：[C2 builder README](../../audits/2026-09-20-c2-intent-builder/README.md)；原始日志 `.codex-tmp/c2-intent/`。基线只读确认为 C1 `fc5b82a4bc6d9280b7d0a142043cfbac07e8e29a`。

### 逐件落点与申报

| 件 | 代码落点（repo 相对路径与行号） | 交付行为 |
|---|---|---|
| 两类直令 / prompt | `server/src/agent/intentRules.ts:4` / `:24` / `:37`；`system-prompt.ts:47`；`server/src/__tests__/v14AgentKnowledgeProjection.test.ts:98` | memory→save_memory、材料整理→create_proposal，有限句首规则同源，不增加第三类自然直令映射。沿 F17/A4 amendment 路径落 [契约补充](../../contracts/Agent-Intent-Prompt-Amendment.md)，精确移除新节/还原旧边界后原 SHA-256 `44affa4b6d7a9aa940e450602900856c567af3ae43fda983b18c3a08820ff2af` 不变；新节561字节、边界166→312，净增707 UTF-8字节，原能力投影预算不变。 |
| 注意力框 / contextHint | `shared/types/agentContextHint.ts:17`；`server/src/validators/agentContextHint.ts:21`；`server/src/agent/attentionContext.ts:4`；`orchestrator.ts:138`；`client/src/pages/Notes/canvasEngine/layers/NoteWritingSurfaceLayer.tsx:1323` | 现役选块/范围锚→问 Agent→既有 `note_view.data.selection={note_id,block_ids[]}`。同note、1–32块；经现役 read_note 投影拼入，优先当前页、至多8页/16000字符，漏块/截断声明。没有新读器或板选区。 |
| note_patch / 人门 | `shared/types/notePatch.ts:1`；`server/src/services/notePatchProposals.ts:45` / `:71` / `:139`；`atomicTextSave.ts:22` / `:39`；`client/src/components/AgentPanel/NotePatchReview.tsx:7`；`useNoteAgentHumanEditor.ts:44`；`useTextFlowHistory.ts:541` | create_proposal 九型增加 note_patch；输入 `{note_id,patches:[{block_id,unit_id?,new_text}]}`，只替换整 unit。创建冻结旧文、revision/hash；diff逐patch采纳/弃，部分采纳合法。采纳仅人门text-save附 `proposal_patch:{proposal_id,patch_index}`，正文与ACK同事务。全案apply409；靶变stale不可采纳；同块兄弟patch仅随本次成功采纳推进基线。撤销/重做沿原history且不重发ACK；首保存失败只恢复本地草稿，零远端旧文写、零无效undo条目。 |
| 编译器 / 计划卡 | `server/src/agent/intentCompiler.ts:16` / `:29`；`server/src/services/agentIntentPlans.ts:45` / `:73`；`server/src/routes/agent.ts:62` / `:91`；`client/src/components/AgentPanel/IntentPlanCard.tsx:8` | 纯函数输入输出，无模型/DB/执行依赖、不注册工具；卡片显示动词与目标名。再想想零执行；放行校验目标未变。板复用未修改的C1七动词、共享会话batch及整批撤销；笔记放行只发提案。延迟放行的tool-call/result仍相邻配对，收据可重载。 |
| 答卡 / 两出口 | `server/src/db/migrations/082_v14_agent_message_meta.ts:7`；`orchestrator.ts:154` / `:384`；`client/src/stores/agentStore.ts:234` / `:256` / `:313`；`NoteAnswerCards.tsx:70`；`useNoteAgentHumanEditor.ts:72` | 既有agent_messages仅加JSON object `meta`默认{}；answer_card存选区锚/问题，intent_plan存计划，无新真相表。SSE携最终持久消息正文，工具前旁白不混入同ID答卡；done/EOF与历史一致。天青页边浮层；散去留会话，插入为块由人点按钮走锚下createBlock与既有createdBlock撤销。 |

人门全生命周期与跨端 candidate 实测见 [note-patch-backend.md](../../audits/2026-09-20-c2-intent-builder/note-patch-backend.md)；真实client编辑历史、失败恢复、答卡与路由过期守卫见 [frontend.md](../../audits/2026-09-20-c2-intent-builder/frontend.md)。后端正文投影已与客户端一致：非目标draft/deprecated unit保留，仅deleted不投影；未改变目标可编辑规则或TextFlow schema。

### 编译规则表

| 规则 | 正例 | 反例 | 目标 |
|---|---|---|---|
| memory-directive | 请记住我喜欢短答案 | 记忆是什么 | save_memory提示，实际走原模型工具收据链 |
| board-grid | 整理这块板，按网格排列 | 解释这块板 | board_move_member；最多100已放置成员，三列 |
| board-sticky | 添加便签“待核对” | 便签是什么意思 | board_create_sticky |
| board-mount | 挂载笔记“note-id” | 挂载是什么 | board_mount_member；明确ID与真实名称 |
| board-member-move | 移动“章节一”到 120,240 | 移动到哪里 | board_move_member |
| board-layer | 把“章节一”放入图层“重点” | 如何创建图层 | board_set_member_layer |
| board-edge | 连接“章节一”到“章节二” | 解释两者的关系 | board_create_edge |
| board-sticky-edit | 便签“待核对”改为“已核对” | 解释便签 | board_update_sticky |
| board-visual-move | 移动装饰“visual-id”到 120,240 | 装饰是什么 | board_patch_visual |
| note-unit-replace | 把“旧文字”改为“新文字” | 解释“旧文字” | create_proposal:note_patch；选区内唯一整unit旧文匹配 |

未匹配、普通问题、缺锚、目标不唯一均回原会话；不猜替换正文。材料整理映射保持原organized_note流程，不另造编译类别。规则表正反例、无变异、确定性、零自动执行、C1整批撤销均有定向断言。

### 两场景断言与测试数字

评测仅新增两个自动发现文件，未改harness注册；全scripted，零真实模型。

| 场景 | 核心断言 | 最终结果 |
|---|---|---|
| `server/scripts/agent-eval/scenarios/09-memory-directive.ts:10` | 自然「请记住」无工具名→save_memory成功；prompt含两类节；库/API/SSE/历史收据一致；零笔记/提案写；claim_without_receipt=0 | 5/5 |
| `server/scripts/agent-eval/scenarios/10-note-patch-journey.ts:45` | 提案pending/旧新diff/零直写；人门部分采纳；逐弃零变；text-save撤销重做revision1/2/3；人改后stale；采纳409；全弃零变；仅create_proposal收据、红旗0 | 10/10 |

10场景的撤销是服务端人门快照重放，客户端真实撤销栈另有宿主测试，不相互冒充。详见 [prompt-and-eval.md](../../audits/2026-09-20-c2-intent-builder/prompt-and-eval.md)。

| 最终验证 | 结果 / 证据 |
|---|---|
| 非 git/secrets 运行时门 | **23/23 PASS**；[gates-summary.json](../../audits/2026-09-20-c2-intent-builder/gates-summary.json)，run `gates-2026-09-20T09-29-19-435Z-18512`；不是完整25组件门放行 |
| 冻结后 client 全库 | **223文件，2274/2274 PASS**，上述门内 `006-test_unit.log`；覆盖最后冲突恢复与多轮答卡修复 |
| 最终 Agent/C2/相邻服务端 | **20文件325/325 PASS**；[targeted-summary.json](../../audits/2026-09-20-c2-intent-builder/targeted-summary.json)，含最后第6项HTTP答卡回归 |
| shared / server / client / agent-eval 类型与构建 | PASS；[typecheck-summary.json](../../audits/2026-09-20-c2-intent-builder/typecheck-summary.json)，client/server生产构建亦在23组件门通过 |
| scripted评测 / harness自测 | **10场景88/88；14/14 PASS**；[evals-summary.json](../../audits/2026-09-20-c2-intent-builder/evals-summary.json)，新增09/10红旗0；既有02阳性对照红旗1为预期 |
| server全量补集 | **105/105文件，1060 tests：1058 pass / 2 fail / 0 cancelled / 0 skipped / 0 todo**；[server-full-summary.json](../../audits/2026-09-20-c2-intent-builder/server-full-summary.json)及[独立TAP核数](../../audits/2026-09-20-c2-intent-builder/server-full-count-audit.json)；零排除 |
| Wilderness | **27/27 PASS，444.175秒**；全量 `005-server_scripts_v13WildernessExecute.test.ts.log`；Node文件预算600000ms、外部660000ms，没有用120秒判红 |

**全量两红保留**：`v2SourceMineruWiring` 模块启动找不到 `python.exe`（ENOENT）；`v2SourceRegionCells` 的MinerU Python启动code101（Unable to create process）。详见 [server-full.md](../../audits/2026-09-20-c2-intent-builder/server-full.md)。未改测试、未豁免、未装依赖，不能称全量全绿。全量启动早于最终答卡补丁；最后受影响的orchestrator/route及HTTP新增断言由随后20文件325项补验覆盖。各套件重叠，不相加称独立总数。

### 闸群、说明书与未做项

create_proposal仍为 `channel_write`；note_patch新增提案型、contextHint只扩载荷，未造工具名。已显式运行知识指纹 `--update`、manifest生成与校验；能力名集合指纹仍 `6b15e1be7ac79342203c14d32bd9ab2900bf6be8d4c337e9f97718f0193ce816`。说明书 `docs/agent-ops/current-state/app-operating-manual.md:79` / `:102` / `:126` / `:128` / `:130`（§三/§五及边界旧描述）已同步；文档索引与inventory已生成，最终docs门通过。

未做：git写/commit/push/PR/merge；HQ保留的git检查与secrets；真实模型、用户库、新依赖、新设计安全对抗用例；C1七动词实现、Relation/判断域、TextFlow真相schema、坐标契约改动；板选区、答卡存走、轻档修订、重档分票。合成凭据按≤20字符使用。浏览器主观验收、Python环境处置、最终复核与放行交HQ；不以组件/HTTP/scripted证据冒充主观验收。原始施工失败日志均保留，最终结论取上述冻结后重跑。
