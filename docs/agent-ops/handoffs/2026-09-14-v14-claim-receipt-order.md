> **状态 (Status)**: done
> **From**: fable(HQ) · **To**: codex(builder)
> **日期**: 2026-09-14
> **单号**: V14 · 心智线针三 · 宣称-收据对账器
> **上游**: claude-log §143(dashscope"已保存偏好"零 save_memory 行=空头支票标本)+§146 四针+说明书§五"宣称以收据为准⛔回复文字"——本单把这条操作者纪律**机械化进面**

# 针三 · 宣称-收据对账器

**性质**:宣称-效果脱钩(claimed-effect-without-effect)已实测坐实。治法⛔语义判官(NLP 判"它是否在宣称"=高误报),治法=**让收据与宣称并排可见+红旗可数**。三件事:轮次收据摘要(服务端投影)、面上收据条(client)、观测性红旗事件(台账)。**⛔阻断/改写模型回复;⛔新写动词;⛔改写门/注册表机关。**

## 一 · 轮次收据摘要(服务端,derive⛔新表)

1. **单位=一次 runAgent 轮次**。事实源=已持久化的 tool_calls/tool_results(agent_messages 现有列)+权威注册表的读/写分类(AGENT_ACTION_TOOLS vs AGENT_READ_TOOLS)——**摘要=纯投影,零新 SQL 表零新列**;
2. 摘要形状(申报最终字段):每轮 `{write_calls:[{name,ok}], read_calls:[{name,ok}], write_ok_count, write_fail_count}`;分类以注册表现物为准,⛔手写清单;
3. **两条出口**:①流尾 SSE 新事件 `turn_receipt`(done 前发,带本轮摘要);②GET 会话消息端点对历史 assistant 消息**读时投影**同形摘要(旧轮次也能回看,零回填)。

## 二 · 面上收据条(client)

1. AgentPanel 每条 assistant 消息下渲染小收据条:有写动作→逐个 `✓/✗ 动词名`;纯读轮→不占位或极简"仅查阅";**零写动作但消息文本存在→显示「本轮无写动作」**——空头支票从此与宣称并排可见,判断权在人;
2. 视觉从简(既有 token/样式),⛔新面板⛔可交互动作;live 用 turn_receipt 事件,历史用读时投影;
3. 说明书§五「宣称以收据为准」条目顺改:收据条在哪、怎么读(防腐条款义务)。

## 三 · 观测性红旗(台账,⛔碰回复)

1. 服务端流尾检查:本轮 assistant 文本命中**窄效果宣称词表**(中英各≤10 词,如 已保存/已创建/已记住/saved/created/recorded——最终表申报)且 `write_ok_count=0` → 记 `claim_without_receipt` 事件入 events 台账(带 conversation_id/消息 id/命中词);
2. **纯观测**:⛔阻断⛔改写⛔提示注入;误报可容忍(它只是评测集的计数器——幻觉效果率的第一颗探针);
3. system prompt 宣称纪律段若需一句对齐(工具成功后才可宣称效果,措辞按收据),≤3 行顺改并申报字节差。

## 四 · 验收

1. 定向:①摘要投影(写轮/纯读轮/失败写/混合轮/旧史读时投影)②turn_receipt 事件时序(done 前)③红旗事件(命中+零收据=记;命中+有收据=不记;不命中=不记)④client 收据条三态渲染⑤既有 SSE 消费者兼容;
2. agent 族回归+server 全量+client 全库;
3. 证据落 `docs/audits/2026-09-14-claim-receipt-builder/`(**只放蒸馏件**,原始日志留 .codex-tmp);git/secrets HQ 收口。

## 五 · 禁区与申报

⛔新写动词/新表/新列;⛔语义 NLP 判官;⛔阻断改写回复;⛔碰写门/注册表/仪式机关;⛔碰 .git;⛔commit;⛔读 .env key 值;⛔用户库;⛔新依赖;合成凭据 ≤20 字符;既有回归零排除。Result 必含:摘要字段形状+词表全文+逐处行号+测试数字+说明书条目更新申报+未做项。冲突停线举证。

## Builder Stop — 2026-09-14（未完成，待 HQ 裁定）

**按“冲突停线举证”暂停；不将工单标 done。** 指定双表不覆盖全部现役 chat 工具：`server/src/toolFace/registry.ts:814` 的 `AGENT_ACTION_TOOLS` 只有 10 项，`:895` 的 `AGENT_READ_TOOLS` 只有 4 项。静态 AST 核对另有 20 项直接定义的 chat 工具不在两表内。

关键反例是本单发端工具 `save_memory`：`server/src/agent/tools/definitions.ts:187` 仍向模型暴露；`server/src/agent/tools/executor.ts:480` 调用真实保存并返回成功；`server/src/agent/memory/service.ts:108` 对新内容实际写库。但它不在指定分类来源中。仅从这两表投影，会把成功保存算成 `write_ok_count=0`，显示“本轮无写动作”，文本含“已保存”时还会触发红旗。`create_proposal` 同样在表外（定义 `definitions.ts:112`，执行 `executor.ts:272`）。此处是分类事实缺失，不是可容忍的语言误报。

请 HQ 提供完整权威分类来源或相应修订工单；builder 不手写补分类、不修改注册表、不将未知工具强行归类。

- 蒸馏证据：[preflight-stop.md](../../audits/2026-09-14-claim-receipt-builder/preflight-stop.md)。原始脚本/结果/源码摘录：`.codex-tmp/claim-receipt-builder/preflight/`。
- 静态核对 1 次，退出码 0，另经独立只读交叉核对；定向/agent/server/client/runtime 验收均未运行，未声称通过。
- 摘要字段与最终词表未实施；服务端、shared、system prompt 均未改，prompt 字节差 0。client 四文件中间补丁已逐块撤销并核对无残留，净功能修改为零。
- 说明书申报：未更新，功能尚未交付。三件套与完整验收均为未做项；无完成版 Result。
- 未碰 `.git`、未运行 git、未 commit；未读 `.env` key 值、机器凭据或用户库；未增加依赖、表、列或写动词。git/secrets 收口仍留 HQ。

## HQ 裁定(2026-09-14,复工令)

**停线成立,举证优秀。** 工单注记②的假设事实不完整:双表=写门动作表(10 写门动词)+四读器,是**过门工具**的权威;20 个 legacy 直定义工具(裁定⑩的过渡面)不在其中,其中 `save_memory`/`create_proposal` 真持久化。**概念修正:写门动作表≠效果分类表**——对账器要的是后者,它今天不存在,本单顺势把它建出来(带完整性闸,机械化⛔文档化)。

### 裁定一 · 新建效果分类模块(权威=HQ 本裁定,交付=代码)

新模块 `server/src/agent/tools/effectClassification.ts`,三个封闭集:

1. **door_write**:从 `AGENT_ACTION_TOOLS` **import 投影**(⛔复制数组)——写门动词自动跟随注册表;
2. **channel_write**(HQ 裁定,本单硬编码即为权威):`save_memory`(写 agent_memories)、`create_proposal`(写 proposals+proposal_issued 事件)——信道写:不过域写门但用户可观察其持久效果;
3. **read**(HQ 裁定):`list_courses, get_tasks, list_goals, list_decks, list_sections, list_cards, get_review_due, get_daily_brief, get_study_templates, get_statistics_overview, suggest_next_topics, generate_weekly_review, search_memories, get_time_blocks, get_goal_dependencies, search_documents, get_document_content, collect_preferences`(collect_preferences 只发表单不持久,归 read 并注释申报);
4. **完整性闸(本单核心机关)**:接线测试遍历 `toolDefinitions` 现物,**任何暴露工具未被三集覆盖=测试红**——未来新工具不分类就过不了门(知识随版的第一道机械闸);
5. **builder 核对义务**:对每个 read 类工具核对 executor 现物路径确无域持久化(last_accessed 类簿记除外,逐项申报簿记例外)——与本裁定表不符=停线举证⛔默从表。

### 裁定二 · 对账器语义顺改

- `write_calls`/`write_ok_count` 覆盖 door_write+channel_write 两类(收据条与红旗同口径);收据条可区分显示(写门动词 ✓verb,信道写 ✓save_memory/✓create_proposal 同形即可,⛔过度设计);
- 注册表文件本体照旧⛔碰(只 import);其余原工单条款(三件套/验收/禁区)不变。

**裁定链**:凡引用权威表当分类依据的工单,HQ 起草时应先跑一次覆盖普查——本次缺口由 builder 的 preflight 普查暴露,该普查模式(AST 对表+反例推导)值得成为工单模板动作。复工。

## Builder Stop — 2026-09-14（复工后新覆盖冲突，未完成）

**按本轮用户“遇新的真冲突停线举证”暂停；保留 ready，不写完成版 Result。** HQ 明列三封闭集共 30 项（door_write 10 + channel_write 2 + read 18），实际 `toolDefinitions` 为 34 项。新增的明确缺口是四个注册读器：`read_note`、`read_board`、`read_content_groups`、`read_annotations_relations`。上次 `save_memory` / `create_proposal` 争议已由 HQ 解决，本次不是重提该争议。

`server/src/agent/tools/definitions.ts:10` 同时投影 `AGENT_ACTION_TOOLS` 和 `AGENT_READ_TOOLS`，`:41` 把结果放入暴露现物；`server/src/toolFace/registry.ts:895` 定义上述四读器；`server/src/agent/tools/executor.ts:39`、`:44`、`:45`、`:46`、`:47` 有其实际分派路径。它们均不在复工令 read 的 18 项之内，也不在另两集内。擅自补入会扩大明确的封闭集，不补则违反“任何暴露工具未覆盖即测试红”。

- **有效完整性探针**：实际 import `toolDefinitions` 与 `AGENT_ACTION_TOOLS`（door_write 未复制），从 HQ read 声明行提取 18 项；34 个暴露名无重名，三集无交叠，已分类但未暴露 0，未覆盖精确 4。**1 test / 0 pass / 1 fail / 0 skipped，exit 1，失败为覆盖断言**。首跑脚本相对路径错误，未进入覆盖断言；修正后得到上述有效证据。两次启动原始日志都保留，不将启动错误算覆盖证据。
- **read 核对义务**：已做 18 项源码调用链核对，逐项路径/行号/簿记例外见 [read-effects-audit.md](../../audits/2026-09-14-claim-receipt-builder/read-effects-audit.md)。`search_memories` 经 `executor.ts:475`、`:477` 调 `memory/service.ts:69`、`:70` 更新 `agent_memories.last_accessed`；该 UPDATE 触发 `db/init.ts:131` 的 `agent_memories_au`，在 `:132`、`:133` 同内容维护 FTS 索引。`collect_preferences` 在 `executor.ts:772`、`:776` 只返回表单 marker，不持久保存偏好。这些为静态核对，未运行真实 executor/用户库。
- **分类模块与三件套**：本轮未创建 `effectClassification.ts`，临时探针未冒充常驻完整性闸；产品代码修改为零。摘要字段/最终词表未落地，服务端摘要、历史投影、SSE、client 收据条和红旗事件均未实施。
- **验证与说明书申报**：定向功能、agent 族、server 全量、client 全库、runtime 验证门均未跑；未声称通过或豁免。说明书未更新（功能未交付）；system prompt 字节差 0。
- **证据纪律**：蒸馏件 [resume-preflight-stop.md](../../audits/2026-09-14-claim-receipt-builder/resume-preflight-stop.md)；原始覆盖脚本/两次日志/源码/哈希留 `.codex-tmp/claim-receipt-builder/resume-preflight/`，read 审计原始件留 `.codex-tmp/claim-receipt-builder/read-audit/`。未碰 `.git`、未运行 git、未 commit；未改注册表/写门/仪式机关，未读 `.env` key/机器凭据/用户库，未增依赖/表/列/写动词，无合成凭据。git/secrets 收口留 HQ。

**待 HQ 明确**：四注册读器的效果分类归属。建议将 read 明确为 `AGENT_READ_TOOLS` import 投影 + 明列 18 项，并扩展 read 核对义务；该建议尚未视为授权执行。分类模块、常驻完整性闸、三件套、完整验收、说明书更新与完成版 Result 均为未做项。

## HQ 裁定补正(2026-09-14,第二次复工令)

**停线再次成立,采纳 builder 建议原文。** 裁定一§3 的 read 封闭集是 HQ 手列 18 项 legacy 读器时漏掉了四个 V2 读器——door_write 用了 import 投影,read 却手列,同一条裁定里双标,漏项即双标的代价。修正:

- **read = `AGENT_READ_TOOLS` import 投影(⛔复制)+ 明列 18 项 legacy 读工具**——两侧读器同归 read 集,注册表新增读器自动跟随;
- read 核对义务同样覆盖四个 V2 读器(14.2-B1 交付即"纯投影零新 SQL",应速核速过);
- 完整性闸、其余裁定条款不变。覆盖探针显示三集并集 30+4=34=暴露现物,复工后闸应转绿。

**HQ 自省入台账**:同一裁定内 door 集投影、read 集手列——凡权威表存在就投影,手列只兜表外余项。复工。

## Builder Stop — 2026-09-14（第二次复工后：并发轮次归属冲突，未完成）

**按本轮用户“遇新的真冲突停线举证”停线；状态保持 ready，不写完成版 Result。** 上轮分类争议已解决：`server/src/agent/tools/effectClassification.ts:5`/`:6`/`:7` 已按两表 import 投影 + 2 channel + 18 legacy 落地，实际 toolDefinitions **34/34 覆盖**；`:27` 的常驻完整性闸已接 `v14ClaimReceipt.test.ts:19`/`:28`/`:33`，合成未分类工具确实触发红闸。read 全链核对 **22/22**，四 V2 读器无域持久化，唯一工具自身簿记仍为 search_memories.last_accessed 与同内容 FTS 维护。本次不是第三次重提分类表。

**新冲突现物：同会话重叠 run 的历史无法可靠归属。** 用真实 runAgent、真实 save_memory、SQLite `:memory:` 与实际 GET handler 复现：先落 user A/user B，A 写一次记忆并回复，B 只有普通回复。A live `write_ok_count=1`、B live `=0`；GET 历史却 A/B 都 `=1`，B 借到了 A 的写收据。复现 **1 test / 1 pass / 0 fail / 0 skipped / exit0 只证明缺陷存在，不是验收绿**。原始程序与结果在 `.codex-tmp/claim-receipt-builder/concurrent-preflight/`，真实调用/GET 断言为 `reproduce.test.ts:69`/`:71`/`:98`/`:103`。

`server/src/db/schema.sql:265`–`:274` 无 run 关联列；`memory/manager.ts:101` 每行随机 UUID，`:104`–`:105` 不存父轮次。live 所用 `orchestrator.ts:140`–`:149` 的 persistedIds 仅在闭包；GET `routes/agent.ts:52`–`:55` 只有消息行，`turnReceipt.ts:64`–`:80` 按 user 边界切段不能处理上述交错；POST `routes/agent.ts:68`/`:90`/`:140` 每请求独立执行。排序和 call/result ID 只保证工具配对，不能把最终 assistant 连回原 run。**需 HQ 裁定未来轮次归属的持久化载体或同会话串行语义，并另定无归属旧史的诚实降级。** builder 未自行挪用正文/token_count、改变 UUID 含义、增 run 列或加并发门。

已保留的施工现物：效果分类/完整性闸、服务端落库事实投影、turn_receipt SSE、历史出口、client 收据条、红旗模块及 events CHECK 扩容迁移076。**均不冒充整体交付。** 逐处行号、完整测试账、迁移边界、原始日志索引及经手文件清单见 [concurrent-turn-stop.md](../../audits/2026-09-14-claim-receipt-builder/concurrent-turn-stop.md)。read 审计见 [read-effects-audit.md](../../audits/2026-09-14-claim-receipt-builder/read-effects-audit.md) 第87行起；观测子件见 [claim-events.md](../../audits/2026-09-14-claim-receipt-builder/claim-events.md)。

- **当前摘要形状**：`{write_calls:[{name,ok}],read_calls:[{name,ok}],write_ok_count,write_fail_count,unclassified_calls?:[{name,ok}]}`，name:string、ok:boolean、count:number。未知旧工具不猜类，client 不因此断言无写；摘要不落库。delete_time_block 仅复述未获删除收据不计成功，create_proposal 成功不等于人采纳。
- **已落词表全文**：中文 `已保存 / 已创建 / 已记住 / 已记录 / 已更新 / 已删除 / 已完成`；英文 `saved / created / remembered / recorded / updated / deleted / completed`，各7项。事件 `claim_without_receipt` meta=`{conversation_id,message_id,matched_terms,message_ids?}`，actor_kind=system、channel=chat；零成功写且命中才记录，不改变回复。system prompt 字节差 **0**。
- **测试数字**：当前新定向 **27/27**；观测+既有ledger **17/17**；两份loop/route兼容 **24/24**；agent族 **251/251**（早于最后重复call ID/纯读fixture修补）；server `test:v2` **725 tests / 723 pass / 2 fail / 0 skipped**（MinerU两处既有Python不可启动）；client全库 **172 files / 1758 tests 全过**（早于最后纯读空白小修），client最终定向 **27/27**、tsc exit0。runtime按原脚本顺序执行授权部分，**18步过，第19步server build因新shared类型缺预编译产物失败**；预编译尝试又遇shared/dist写入EPERM，临时build前缀已撤销，未更改既有build门命令。后续performance/docs、git/secrets未运行，不宣称完整门通过。各初跑失败/启动错误均有原始记录，零排除。
- **说明书更新申报**：`app-operating-manual.md:53` 保留操作者纪律，`:55` 新增收据读法明确标 **“施工中，尚未交付”**，并注明并发历史不可据以核销宣称；未把半成品写成权威已交付能力。
- **未做项**：归属冲突待裁；持久化/extractMemories意外异常兜底路径仍欠；shared构建与Python环境未解决；最终全量/剩余runtime门、主观验收、实际API、用户库迁移、git/secrets与完成版Result未做。补丁留树供后续复工，不自动清除。
- **纪律**：原始件只留 `.codex-tmp`，本审计目录仅蒸馏 Markdown；未碰 `.git`、未运行git/commit/push/PR/merge、未读.env key/机器钥匙/用户库，未改工具注册表本体/写门/仪式机件，未加依赖/工具写动词/最终持久表列。076只扩指定观测事件CHECK，测试仅用合成内存库；git/secrets仍留HQ收口。

## HQ 裁定三(2026-09-14,第三次复工令)

**停线成立,这次是真设计发现**:归属信息在写入时没登记,任何读时投影算法都无法事后恢复(builder 论证正确:"仅换纯投影算法不能解决信息缺失")。裁定采**出生登记**路线(与 item 谱系"血统出生时注册"同一性原则):

1. **解除⛔新列一项**(仅此一列):migration 077 `ALTER TABLE agent_messages ADD COLUMN turn_id TEXT`(可空,零回填,零索引);
2. **orchestrator 每次 runAgent 生成一个 turn_id(uuid)**,该轮所有 saveMessage(user 首条/工具轮成对行/final/interrupted 落史)一律携带;MemoryManager.saveMessage 加可选参;
3. **历史投影按 turn_id 精确分组**;收据条挂该轮末条 assistant 行(呈现细节 builder 裁量申报);**turn_id 为 NULL 的旧史=不出收据条**(⛔邻接猜测⛔降级标注复杂化——说明书已有"没有收据条≠没有写动作"兜底,诚实缺省即可);
4. **⛔同会话串行化/排队/拒绝语义**——turn_id 使重叠可归属,行为策略另案候裁;
5. builder 自报的遗留补齐:异常持久化/extractMemories 抛错路径的兜底收据;说明书§五"施工中"段改为交付态读法;
6. 其余裁定(分类模块/完整性闸/词表/红旗/证据纪律)不变。既施工现物保留续建。复工,完成后状态改 done。

## Result

**2026-09-14 · codex builder · 第三次复工施工完成，状态改 done；不代表 HQ 放行。** 按 HQ 裁定三落实出生登记，前两次分类裁定及已施工三件套全部保留。三次停线时的“未交付/未做”陈述仍是当时事实；本 Result 取代其作为当前完成状态的读法，不回改停线记录。归属冲突已由定向用例转绿；异常落史/extractMemories 兜底、说明书交付态与客户端真实异常终结顺序已补齐。最终 server 仍有 **2 个既有 Python 环境失败**，零排除；runtime **21 个获准步骤全部通过**，原门末尾 git/secrets 按本单禁区留 HQ。

### 全量源码落点（含继承现物，行号以本次最终树为准）

| 文件与行号 | 交付内容 |
|---|---|
| `server/src/agent/tools/effectClassification.ts:5`、`:6`、`:7`、`:27` | door_write/read 注册表 import 投影；HQ 信道写与 legacy read；常驻覆盖完整性闸 |
| `server/src/agent/turnReceipt.ts:35`、`:65` | 已保存工具调用/结果投影；历史按 turn_id 精确分组、只挂末 assistant；NULL 不猜归属、不出条 |
| `server/src/agent/claimObservation.ts:6`、`:9`、`:23`、`:40`、`:50`、`:60` | 最终窄词表、一次流尾观测、消息锚与固定失败诊断，不阻断/改写回复 |
| `server/src/agent/orchestrator.ts:40`、`:141`、`:144`、`:155`、`:241`、`:247`、`:322`、`:327`、`:351`、`:358` | 每次 runAgent 一个 UUID；首 user/工具对子/final/interrupted 全传 turnId；统一异常尾部按 turn_id 回读，发一次收据后 error 或 done |
| `server/src/agent/memory/manager.ts:93`、`:99`、`:105` | saveMessage 第六可选参数 turnId，写 agent_messages.turn_id；旧调用默认 NULL，消息 UUID 语义不变 |
| `server/src/agent/providers/types.ts:42` | StreamChunk 增 turn_receipt，旧事件保留 |
| `server/src/routes/agent.ts:52`、`:161` | GET 取 turn_id 后读时投影；SSE 转发摘要，无新增同会话串行/排队/拒绝 |
| `server/src/db/recordEvent.ts:29` | 现有 events verb 增 claim_without_receipt |
| `server/src/db/migrations/076_v14_claim_without_receipt_event.ts:6` | 保留既施工 events CHECK 扩容，历史/seq/索引/append-only 保全；最终无新增持久表/列 |
| `server/src/db/migrations/077_v14_agent_message_turn_id.ts:6`、`:10` | 唯一新列 `ALTER TABLE agent_messages ADD COLUMN turn_id TEXT`；可空、零回填、零索引；基线 schema 不动，fresh init 走既有迁移机制 |
| `shared/types/agentTurnReceipt.ts:1`、`:7`；`shared/types/index.ts:378`、`:388`、`:389` | 摘要公共类型、可选 turn_id 和 turn_receipt；摘要不落 SQL |
| `client/src/stores/agentStore.ts:33`、`:68`、`:224`、`:241`、`:267`、`:280`、`:297`、`:319` | live 摘要校验与保存；done/error/EOF 保留；error 已消费的条不被后续 done 复制，模型原文保留 |
| `client/src/components/AgentPanel/AgentPanel.tsx:28`、`:64`、`:220` | 流中收据接线与自动跟随 |
| `client/src/components/AgentPanel/MessageBubble.tsx:107`、`:140`、`:162`；`MessageBubble.module.css:41`、`:53` | assistant/流中简收据条：写成功/失败、无写文本、纯读、未知工具与缺省；既有 token，无新面板或交互 |
| `server/src/__tests__/v14ClaimReceipt.test.ts:21`、`:30`、`:35`、`:108`、`:187`、`:236`、`:262`、`:321` | 分类闸及反例；摘要/真实 SSE+GET/NULL旧史；两种并发完成顺序；六类异常注入，共26例 |
| `server/src/__tests__/v14ClaimObservation.test.ts:40`、`:51`、`:82`、`:124`、`:136`、`:167` | 词表、计数、回复不变、失败不阻断、076历史/高水位/事务边界，共9例 |
| `server/src/__tests__/v14TurnIdentity.test.ts:37`、`:54`、`:74`、`:94`、`:103`、`:121`、`:136` | 077精确schema差、幂等/回滚、同call ID隔离、NULL缺省、中断、fresh init、真实GET，共7例 |
| `server/src/__tests__/v13EventsLedger.test.ts:225` | 既有封闭事件词表接入新观测项，原账本断言保留 |
| `server/src/__tests__/v14LoopRobustness.test.ts:186`、`:201`；`v14AgentRouteLifecycle.test.ts:173` | 既有loop/route适配新事件；异常仍一次error/done，旧消费者过滤扩展后事件保持，timer清理断言保留 |
| `client/src/components/AgentPanel/AgentPanel.turnReceipt.test.tsx:106`、`:170`、`:203` | 三态渲染、chunked SSE、未知事件、done/error/EOF；新增两种实际终结顺序×有/无文本四例 |
| `server/package.json:34` | 三份新定向文件接 test:v2；原 build 和根 verify 命令未改 |
| `docs/agent-ops/current-state/app-operating-manual.md:49`、`:55` | §五交付态读法；区分域写门/信道写，明确NULL旧史与异常空条边界 |
| `docs/audits/2026-09-14-claim-receipt-builder/delivery-evidence.md:1`；本工单；`docs/agent-ops/INDEX.md` | 蒸馏证据、完整回执与状态；INDEX 由原生成器刷新，非手改 |

明列源文件/字节/SHA 对照在 `.codex-tmp/claim-receipt-builder/resume-third/final-source-inventory.json`，含 **25 个经手或继承源码/说明书文件 + 4 个只读参照**，不冒充 git diff 或全工作区普查。上述蒸馏件、工单和生成索引另行列出；编译产物由原 build 生成。

### 完整性闸与 read 核对

实际暴露 **34** = door_write **10** + channel_write **2** + read **22**，漏项/陈旧项/交叠/重复定义均为空；door_write 与四个注册读器均直接 import 投影，未复制注册数组。常驻闸在 test:v2/agent族真实执行。独立进程探针现物 **exit0**；仅向输入追加 `synthetic_unclassified_tool` 后 **exit1**，missing 精确为该名、其余差集仍为空，证明闸会拒绝未来未分类工具；不是把“测试不红”当作有牙证明。原始件：`resume-third/targeted/coverage-green.log`、`coverage-red.log`、`coverage-exits.json`。

read **22/22 静态全链核对**继承 [read-effects-audit.md](../../audits/2026-09-14-claim-receipt-builder/read-effects-audit.md) §6；32个原源码快照中30个当前SHA一致，仅本单orchestrator/manager变化，所有executor/读器/底层业务路径不变。唯一工具自身簿记例外仍为 search_memories.last_accessed 及其同内容FTS维护；collect_preferences 只返回表单marker，不持久保存偏好。通用会话落史/updated_at和既有用户模式自动记忆抽取不归入read工具域写。此项不冒充真实用户库的动态无写测试。

### 最终摘要形状与词表

```ts
{
  write_calls: Array<{ name: string; ok: boolean }>;
  read_calls: Array<{ name: string; ok: boolean }>;
  write_ok_count: number;
  write_fail_count: number;
  unclassified_calls?: Array<{ name: string; ok: boolean }>;
}
```

write 覆盖 door_write + channel_write；未知/退役名不猜类，有未知项时client不凭空断言无写。ok 表示配对的已保存工具结果报告成功，缺失/重复call ID或结果保守不计成功；删除复述没有成功删除收据不计成功，create_proposal 成功不等于人采纳。摘要纯投影，不回填、不持久化。

词表全文：中文 **已保存 / 已创建 / 已记住 / 已记录 / 已更新 / 已删除 / 已完成**；英文 **saved / created / remembered / recorded / updated / deleted / completed**，各 **7** 项。中文字面子串；英文不分大小写、带单词边界；不判断否定、引用或意图，不做NLP判官。零成功写且本轮已落史assistant文字命中才追加一条 `claim_without_receipt`，meta=`{conversation_id,message_id,matched_terms,message_ids?}`，actor_kind=system、channel=chat。不阻断、改写、注入模型回复。**system prompt未改，字节差0，SHA与停线快照一致。**

### 并发归属与异常定向

原并发复现留在 `.codex-tmp/claim-receipt-builder/concurrent-preflight/` 作历史原证；程序机制已转入常驻 `v14ClaimReceipt.test.ts:262`，现在断言归属正确：两次真实runAgent先各落user后才分别放行；A真实save_memory一次、B无工具。A先结束时live/GET均A=1/B=0；B先结束且说“已保存”时仍A=1/B=0，仅B的消息记红旗。每次不同turn_id，A四行/B两行，各仅末assistant有条；不存在串行化。另有跨轮同call ID成功/失败+多轮读的交错投影用例，不跨轮借结果。NULL旧史无条、无回填、GET零写均亲测。

六类异常（首user、工具对子事务、final、interrupted、最终行已提交后的updated_at簿记、extractMemories）均断言一次 `turn_receipt → error → done`，收据等于已提交历史投影。**已提交域写不一定能保存工具历史**：对子落史回滚用例中memory确为1、摘要为空；未伪造调用证据或宣称回滚。说明书已明示这种边界。断线/既有硬超时已关闭transport时不能保证live送达；初始化尚无证据或数据库不可读时也不伪造历史/空条。

client真实异常终结顺序的重复条由最终审查发现：新增4例，修前16例中2例明确失败，修后三文件31/31；error→receipt→done的round_limit路径及原模型文字继续保留。

### 最终验证账（零排除；不将重复覆盖相加为独立用例）

原始路径以下均相对 `.codex-tmp/claim-receipt-builder/`。

| 验证 | 最终结果 | 原始件 / 边界 |
|---|---|---|
| 新server定向（收据26+观测9+身份7） | **42 tests /42 pass /0 fail /0 skipped，exit0** | `resume-third/targeted/claim-first.log` |
| 077/历史单独定向 | **7/7，exit0** | `resume-third/migration-history/turn-identity-test.log`，含于上行 |
| 既有loop/route兼容 | **24/24，exit0** | `resume-third/targeted/loop-route-final.log` |
| 完整agent族，14文件 | **266/266，0 skipped，exit0** | `third-resume-env/final-agent-second/agent-family.log` |
| server全部13个test脚本 | **953次测试执行 /951 pass /2 fail /0 skipped** | 前12脚本213/213（逐脚本6/27/16/28/8/10/9/5/10/49/2/43）；含跨脚本重复覆盖，不称953独立用例；`third-resume-env/final-server/` |
| 其中原命令完整test:v2复跑 | **740 tests /738 pass /2 fail /0 skipped，exit1** | `third-resume-env/final-server-v2-second/test-v2.log`；只余下述Python环境两项 |
| client最终定向+TS | **31/31；tsc exit0** | `resume-third/review/client-terminal-after-fix.log`、`client-terminal-typecheck.log` |
| client全库最终 | **172 files /1762 tests全过** | `third-resume-env/final-runtime-second/test-unit.log` |
| runtime原序授权范围 | **21/21步骤通过** | 前20步 `third-resume-env/final-runtime-second/results.jsonl`；第21 docs索引刷新后 `resume-third/docs-check-first.log`，最终文档收尾再核；原门最后git/secrets未运行，不宣称完整23段门全绿 |

两处server失败精确原因：`v2SourceMineruWiring.test.ts:60` 裸 `python.exe` **ENOENT**；`v2SourceRegionCells.test.ts:203` 固定MinerU `.venv` launcher **exit101**，底层已装Python直启 **EPERM / Access is denied**。独立原证 `third-resume-env/python-probe.json`；不是本单新设计冲突，未修改测试/路径/依赖或排除失败项。shared原预编译本次已exit0，原server/client build均通过，前次EPERM不再阻挡。

失败尝试全部保留：首定向日志目录cwd错误未实际启动测试（不计覆盖）；agent首跑265/266是旧异常事件顺序断言未对齐，修后266/266；server首跑Node IPC导致MaterialLibrary未正常回报，原完整test:v2复跑后该文件31项通过、总数恢复740；runtime首跑client Board选择用例1项失败，原序整体复跑172/1762全绿；第21 docs首次仅生成INDEX过期，原生成器刷新后通过。没有删日志、改门、降并发配置或排除旧断言来造绿。

### 说明书申报与未做项

§五已把“施工中/并发不可核销”段改为交付态读法：位置在Agent回复底部；✓/✗含义；无写/仅查阅/未知项；live流尾、历史按出生归属挂末assistant；NULL旧史不出条；缺条及落史异常空条不证明未写或回滚；红旗只观测。并纠正本节“全部过写门”的旧括注，区分域写与提案/记忆信道写；操作者查记忆表、断线后先查收据的纪律保留。

**未做/保留给HQ**：上述Python环境两项尚未通过；原runtime末尾git diff/secrets收口、主观/新浏览器体感验收、真实模型API、用户库迁移、commit/push/PR/merge均未做。用户数据迁移扳机未扣动。没有引入同会话串行化策略、旧史归属回填、语义判官、新工具写动词、新依赖、新持久表或077以外的新列。

**纪律申报**：原始脚本/日志/快照仅在 `.codex-tmp`，审计目录只新增蒸馏Markdown；未碰`.git`、未运行git/commit、未读.env key/机器凭据/用户库。注册表本体、definitions、executor及system prompt与前次停线SHA相同，未动写门/仪式机件。本单新合成provider key长度11；全部定向使用合成内存库。放行与git/secrets最终收口仍属HQ。

**末步验证回读**：Result与done落下后，原生成器只更新 `docs/agent-ops/INDEX.md`（其余8个索引字节不变）；最终 `npm run docs:check` **exit0**，原始日志 `resume-third/docs-check-final.log`，索引前后SHA在 `resume-third/index-final-comparison.json`。因此授权runtime第21步已完成，非仍待补验。
