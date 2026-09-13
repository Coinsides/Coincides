> **状态 (Status)**: active（K-0 普查报告；归类与映射供 HQ 裁定，非重铸开工授权）
> **层 (Layer)**: 分析 / executor 现工作树普查
> **日期**: 2026-09-14（工单日期；源码指纹采集时间见 §1）
> **权威 (Authoritative)**: 否；法源以 Agent 宪法及实施法为准
> **From**: codex builder
> **工单**: `../handoffs/2026-09-14-v14-1-executor-census-order.md`（14.1-A0 / K-0）
> **上游**: `../handoffs/plans/v14-agent-era-plan-draft.md` §14.1；`../current-state/agent-constitution.md`；`../design/agent-constitution-bylaws.md`

# V14 · 14.1 executor 动词→人门映射普查

## 1. 射程、口径与现物

本单仅读源码和文档、写本报告及工单 Result。未运行 git 命令、未访问 `.git`，未 commit，未改产品代码，未执行产品、构建或测试，未设计安全对抗用例，未读取 `.env` 或实际凭证，未连接或读取用户数据库。对 SQL、触发器、网络调用的描述均来自源码，**不声称经过运行验证或用户库验证**。

已按开工入口读取 AGENT_CONTEXT、方向宪章、current-state 的索引/现状及相关条目、active ADR-0001 和指定工单。V14 plan 虽文件名带 draft 且残留旧权威字段，其顶部 active 转正公告及本工单已明确指定 §14.1；四禁令的旧简写不覆盖 2026-09-13 宪法实施法。未改这些上游文档。

定位工具：仓根 `.codegraph/` 存在；本会话可用工具清单无 CodeGraph MCP，`Get-Command codegraph` 未找到 CLI；`rg` 也不在 PATH，故退回限定目录的 PowerShell `Get-Content -Encoding UTF8` / `Select-String` / 文件枚举。源码射程为 `server/src/agent`、相关 `routes/services/toolFace/mcp/middleware/embedding/db`（含迁移与 schema 源码）、`server/src/index.ts`，以及相关 `client/src` 的 Agent 表单、存储与调用入口。未枚举仓根的隐藏内容或用户数据目录。下文 **GAP** 仅表示在该源码与现行路由挂载射程内未找到效果等价人门；相关接口能拼出部分数据，不等于已有等价动词。

源码字节指纹（SHA-256；采集于 **2026-09-13T07:13:44Z** 前的同轮只读核查；不用提交号表示工作树）：

| 文件 | 行数 / 字节数 | SHA-256 |
|---|---|---|
| `server/src/agent/tools/executor.ts` | 933 / 44072 | `F4E21D09B51E69C0091F01A47B11965750BE32259A81F78328A0CACF47990B40` |
| `server/src/agent/orchestrator.ts` | 297 / 10404 | `590D4DDBC5C1296466D1AACB4E93F0CEFBABB61D5FC26DDCE6EA5704AA02A322` |
| `server/src/agent/tools/definitions.ts` | 442 / 20513 | `3F8AC6BB8C7FD76C83F91F5ACE481088DD7D112FEC313807C55036AB23C22713` |

**计数单位为 switch 的 case，不是定义表条数，也不是 SQL 语句数。** 现物为 **31/31 case**；其中 **29 个 legacy 工具定义 + 2 个拒绝桩**。有持久域写的 case **12**，纯读/计算 **16**，自域表单标记 **1**，拒绝桩 **2**。`search_memories` 会 UPDATE，不能按名字列纯读；`create_task` / `create_card` 已拒绝，不能按名字列写。

分类记账：**A=0、B=9、C=1、D=16；另 5 项归类「候 HQ 裁」**（不是新增第五族）：`create_task`、`create_card`、`create_proposal`、`search_memories`、`save_memory`。覆盖闭合：`31 = 0 + 9 + 1 + 16 + 5`。候选族只说明待裁方向，不偷偷计入确定族；A=0 只针对本次确定归类，不能推出未来没有可复用 service。

行号记法：`E:n–m` = `server/src/agent/tools/executor.ts:n–m`；`R/x.ts:n` = `server/src/routes/x.ts:n`；`S/x.ts:n` = `server/src/services/x.ts:n`。所有路由下文带 `/api` 的完整前缀；挂载可核 `server/src/index.ts:123–168`，memory 子路由另见 `R/settings.ts:13`。表中“偏差数”只数逐动词明细的编号条目；共性欠账在 §2 / §5 独立列示，不伪装成人门已具备的优势。

## 2. 跨动词事实与宪法对照口径

### 2.1 两个工具面及同门缺口

Legacy 链为 `orchestrator.ts:153,167–177,221–244` → `E:7–15` → switch 内 SQL。`agent/providers/types.ts:35–39` 的定义只有 name/description/parameters；参数送给 provider 不等于执行时经过共同 zod。当前入口只有 `toolName,args,userId`，没有可信 actor/channel、结构化授权对象或撤销覆盖参数。

V2 权威工具面是另一条链：`server/src/toolFace/registry.ts:648–651` 明言不导入/适配 legacy 定义；`:653–851` 的 14 项注册与这 29 个定义分离。`server/src/mcp/transport.ts:213–278` 的 tier/confirm/receipt 流程不在本 executor 调用链上。已存在的 `tool-receipts/:id/revert` 只接 `trash_notes`（`S/toolFaceReceiptRevert.ts:23–44`），不能当本次 12 个写动词已有撤销覆盖。

**不能把“注册工具内部采用 SQL”单独判成④翻窗。** 当前 29 项经过 legacy 动词面，但绕开人门业务层和 V2 权威注册/记账通道；这个遗留面在实施法第四条下的过渡地位 **候 HQ 裁**。可证缺口是未接共同校验/actor/事务史记/收据/撤销准入，不能扩大成“整个产品任何地方都无法撤销这些领域动作”。

### 2.2 对照符号与必须补齐的门

- **① 判断域**：按效果判定，不能因为不叫 Relation 就自动免责。真正的人类判断只能提案；合法 chat 转录需逐项真实应答、`actor=human,via=chat,原文锚`，批量另记 batch-confirmed/size。涉及语义歧义明确交 HQ；本报告不自行宣布普通业务字段属于或不属于人的判断。
- **② 不可逆**：结构化授权（对象 ID、本人原文锚、时间、TTL、单次核销）+执行端复述确认；实际级联生成清单并绑定哈希；事件层留据且不存正文。自行新造一张同内容行不证明能退回原 ID/引用关系。自产物豁免也要证明未核准/未引用并留据，不能从表名或创建者猜。
- **③ 人的字**：修改 protected/ratified 内容需可见、可拒、可退的痕迹/changeset；复制派生、口述、新内容被人采纳也有出处/双粘滞位义务。新建元数据本身不等于已经覆写人的字；条件性触点在明细注明。现物不能辨别 protected/ratified 的路径不能被授予无痕改写资格。
- **④ 通道 / 机械闸**：状态动词需注册、权限记账、收据与人类撤销覆盖；新增动词或扩写射程是需批准的立法事项。实际 12 个写 case 均有 §2.1 的共同准入缺口。业务 route 已存在不等于它已满足 V14 宪法，B 族抽取也不等于完成这些共性工程。

无持久域写的 D 项只报告本动词效果；正常 chat 自身会保存消息、召回/抽取记忆（`agent/memory/manager.ts:100–115,135–176`），这不是把所有 D 都重分类为写的理由。读取型 embedding 工具会发 provider 请求作计算，但本单没有调用它们。

## 3. 31 个 case 总表

“候裁”均指 **候 HQ 裁**；括号为候选，不代表结论。偏差数中的 G 表示无人门时的具体缺口数，C 表示自域协议差距数，并非与不存在的人门比较。

| # | 动词 / E 行区间 | 性质 | 族 | 人门落点（route → service / 闭包） | 偏差数 | 宪法触点 |
|---|---|---|---|---|---:|---|
| 01 | list_courses / 16–19 | 读 | D | GET /api/courses；R/courses.ts:22 → S/courseCards.ts:22 listCourseCards | 3 | 无直接写效果 |
| 02 | get_tasks / 21–39 | 读 | D | GET /api/tasks；R/tasks.ts:27，闭包 | 4 | 无直接写效果 |
| 03 | create_task / 41–44 | 拒绝，无域读写 | 候裁（D 拒绝桩） | 潜在 POST /api/tasks；R/tasks.ts:54；今日未执行 | 2 | 不得借映射恢复写权 |
| 04 | complete_task / 46–54 | 写 | B | PUT /api/tasks/:id；R/tasks.ts:156，状态闭包 :179–209 | 4 | ①语义候裁；④准入缺口 |
| 05 | list_goals / 56–93 | 读 | D | GET /api/goals；R/goals.ts:19；children :55 / progress :68 | 4 | 无直接写效果 |
| 06 | create_goal / 95–103 | 写 | B | POST /api/goals；R/goals.ts:166，闭包 | 4 | ③出处条件触点；④ |
| 07 | create_sub_goal / 105–121 | 读写 | B | 同 POST /api/goals；R/goals.ts:166，闭包 | 5 | ③出处条件触点；④ |
| 08 | list_decks / 123–131 | 读 | D | GET /api/decks；R/decks.ts:12，闭包 | 2 | 无直接写效果 |
| 09 | create_deck / 133–144 | 读写 | B | POST /api/decks；R/decks.ts:30，闭包 | 2 | ③出处条件触点；④ |
| 10 | list_sections / 146–152 | 读 | D | GET /api/sections；R/sections.ts:12，闭包 | 2 | 无直接写效果 |
| 11 | create_section / 154–173 | 读写 | B | POST /api/sections；R/sections.ts:33，闭包 | 3 | ③出处条件触点；④ |
| 12 | list_cards / 175–184 | 读 | D | GET /api/cards；R/cards.ts:35，闭包 | 4 | 无直接写效果 |
| 13 | create_card / 186–189 | 拒绝，无域读写 | 候裁（D 拒绝桩） | 潜在 POST /api/cards；R/cards.ts:103；今日未执行 | 2 | 不得借映射恢复写权 |
| 14 | get_review_due / 191–197 | 读 | D | GET /api/review/due；R/review.ts:28，闭包；count :78 | 4 | 无直接写效果 |
| 15 | get_daily_brief / 199–220 | 读计算 | D | GET /api/daily-brief；R/dailyBrief.ts:9，闭包 | 6 | 无直接写效果 |
| 16 | create_proposal / 222–241 | 写 | 候裁（C / GAP） | **GAP 通用创建**；R/proposals.ts:71–111 仅专用创建，:124 是应用 | G5 | ①③随 payload；④ |
| 17 | get_study_templates / 243–251 | 读 | D | GET /api/study-templates；R/studyTemplates.ts:16，闭包 / parseConfig :8 | 1 | 无直接写效果 |
| 18 | get_statistics_overview / 253–304 | 读计算 | D | GET /api/statistics/overview；R/statistics.ts:8，闭包 / calculateStreak :237 | 3 | 无直接写效果 |
| 19 | suggest_next_topics / 306–356 | 读计算 | D | **GAP 完整聚合**；R/statistics.ts:195 / tasks.ts:27 / goals.ts:19 仅部分 | G4 | 建议不等于人的判断写入 |
| 20 | generate_weekly_review / 358–411 | 读计算 | D | **GAP 完整周复盘**；R/statistics.ts:8,126 / tasks.ts:27 仅部分 | G4 | 不写 review 记录 |
| 21 | search_memories / 413–473 | 读写，含 FTS | 候裁（B / C） | **GAP search+access-touch**；GET /api/settings/agent-memories，R/agentMemories.ts:33 仅列表 | 4 | 非纯读；④边界候裁 |
| 22 | save_memory / 475–499 | 写，含 FTS/异步 vec | 候裁（C / GAP） | **GAP 创建**；R/agentMemories.ts:33,39,61 只有查改删 | G4 | ①decision/③出处条件触点；④ |
| 23 | get_time_blocks / 501–558 | 读计算 | D | GET /api/time-blocks / week/:date；R/timeBlocks.ts:98,125 → getBlocksForDate :65 / getAvailableStudyMinutes :72 | 5 | 无直接写效果 |
| 24 | get_goal_dependencies / 560–608 | 读 | D | GET /api/goals/:id/dependencies / dependency-chain；R/goals.ts:381,474 → 私有 walkBack :484 | 4 | 无直接写效果 |
| 25 | search_documents / 610–715 | 读 + 外部计算 | D | **GAP hybrid search**；GET /api/documents，R/documents.ts:73 仅列表 | G4 | 无直接写效果 |
| 26 | get_document_content / 717–785 | 读 | D | GET /api/documents/:id / :id/chunks；R/documents.ts:94,109，闭包 | 3 | 无直接写效果 |
| 27 | collect_preferences / 787–796 | 自域表单标记 | C | 无人门 CRUD 需求；orchestrator.ts:225–233,249–252 → SSE/表单 | C2 | 普通问卷不能冒充①②确认门 |
| 28 | create_time_blocks / 798–843 | 写 | B | POST /api/time-blocks；R/timeBlocks.ts:149，原生支持批量的闭包 | 3 | ③出处条件触点；④ |
| 29 | update_time_block / 845–879 | 读写 | B | PUT /api/time-blocks/:id；R/timeBlocks.ts:195，闭包 | 2 | ③已有 label；②恢复边界；④ |
| 30 | delete_time_block / 881–893 | 读写，含 FK | B | DELETE /api/time-blocks/:id；R/timeBlocks.ts:224，闭包 | 1 | ②硬删及任务解绑；③宿主字；④ |
| 31 | link_task_cards / 895–928 | 读写 | B | POST /api/tasks/:taskId/cards；R/tasks.ts:296，闭包 | 4 | ④；关联不等于判断确认 |

## 4. 逐动词明细

### 01 · list_courses（E:16–19；D）

读 `courses`。人门 `GET /api/courses` → `R/courses.ts:22–25` → **现成** `S/courseCards.ts:22–77 listCourseCards(db,userId)`，另读 `notes/note_block_placements/note_blocks`。

1. E 按 name 排序；service 按 created_at DESC（`:53`）。
2. E 只返 id/name/code/color/weight；service 取 c.* 并 hydrateCourseSkin（`:25,66`）。
3. E 无最新 active note/正文摘要；service 挑最新 note、拼 active blocks 前 200 字（`:26–50,67–74`）。

可共用现成 service 后投影，但是否为此摘要动词引入额外 note 查询、采用何种排序候 HQ 定映射。无①②③④直接写效果；不因有现成 service 把纯读改计 A。

### 02 · get_tasks（E:21–39；D）

读 `tasks/courses`。人门 `GET /api/tasks` → `R/tasks.ts:27–51`，查询在闭包，无独立 service。

1. E 的 from_date/to_date 可单边生效；人门 from/to 要同时存在（`:37–40`）。
2. E 可筛 status，人门 GET 无此筛选。
3. E 按 date/priority/order_index，LIMIT 50；人门按 date/order_index/created_at，无 LIMIT（`:47`）。
4. E JOIN course_name 且返摘要；人门 SELECT * 并经 parseTask 解析 checklist（`:11–16,31,49–50`）。

可抽基础筛选/查询，再分别投影；现不能直接把 route 响应当等价。无四禁令直接写效果。

### 03 · create_task（E:41–44；候 HQ 裁）

无表读写，只返回 BLOCKED；`agent/tools/definitions.ts:28–30` 明示已从 Agent tools 移除。四族未明文覆盖拒绝桩，D 仅候选。潜在人门 `POST /api/tasks` → `R/tasks.ts:54–94`，不是今日已经执行的映射。

1. E 不创建任务，亦不自动创建 proposal，只要求再调用 create_proposal(study_plan/goal_breakdown)；人门 POST 直接创建。
2. E 无可对照的现行写 SQL；人门 createTaskSchema（`server/src/validators/index.ts:68–81`）、verifyCourseBelongsToUser（`R/tasks.ts:18–24`）、goal/recurring/order/time/checklist 等默认均未进入此 case。

当前没有成功写、相应史记或收据，不应登记为“写完漏据”。提案采纳另在 `R/proposals.ts:197–270` 自写任务，未共用上述 POST 业务，属于后续 proposal 统一边界。现桩无四禁令写效果；恢复注册/写权须另行批准，不列本次 B 抽取工作。

### 04 · complete_task（E:46–54；B）

E 仅 UPDATE `tasks`。人门 `PUT /api/tasks/:id` → `R/tasks.ts:156–236`，还读 tasks、写 `study_activity_log/recurring_task_groups`；无独立 service。

1. E 每次重置 completed_at；人门只在非 completed → completed 时设置首次完成时间（`:183–186`）。
2. E 漏人门的 study_activity_log(task_completed)（`:188–192`）。
3. E 漏 recurring group completed_tasks +1（`:194–199`）。
4. E 固定摘要；人门重新读取并解析完整 task（`:227–228`）。

需抽状态转换业务 `:179–209`（连同现态读取），保留前后状态、活动记录与循环计数。两轨共有的 events/receipt/actor 欠账另见 §5；活动日志不等于宪法收据。

**①候 HQ 裁**：completed 是否声称“人已亲自完成/判断”，不能靠字段名字裁轻。若属于判断域，须提案或真实人类 chat 逐项应答转录（human/via/chat/原文锚），E 没有这些参数/门。未见删除/正文替换；④及撤销准入缺口成立于 §2 所限证据。

### 05 · list_goals（E:56–93；D）

读 `goals/courses`，hierarchy 时另读 `tasks`。人门 `GET /api/goals` → `R/goals.ts:19–52`（另读 goal_dependencies）；children `:55–65`、progress `:68–124` 均是闭包。

1. E 不支持 parent_id 筛选；人门可筛根级 'null' / 指定 parent（`:31–36`）。
2. E created_at DESC；人门 sort_order ASC,created_at ASC（`:38`）。
3. E 摘要 + course_name；人门完整字段及逐目标 dependencies（`:42–49`），含 exam_mode/sort_order。
4. E 自行构整树、挂直接 tasks、只返 !parent_id 根；人门 list/children/progress 分离，progress 递归统计后代，不是现成 hierarchy service。

可共用基础 goals/tasks 读取，再定树组装与响应。读取 status 不等于替人写判断，无四禁令直接写效果。

### 06 · create_goal（E:95–103；B）

E INSERT `goals`。人门 `POST /api/goals` → `R/goals.ts:166–216`，无独立 service。

1. E 未执行 createGoalSchema 的非空/长度/日期/UUID 校验（`server/src/validators/index.ts:115–122`）。
2. E 未核 course 归属；人门明确核验（`:184–188`）。
3. E 不算兄弟 sort_order；人门 MAX+1 后写入（`:190–205`），E 留给 DB 默认。
4. E 无 parent_id/exam_mode 入参，仅返摘要；人门支持这些字段并返完整 row（`:207–208`）。

需抽整个创建业务，与下一项共用。新建 title/description 未观察到覆写旧字；若是口述/人的文字派生，③要求 authored-via-dictation/protected 继承与出处，目前未处理。没有根据把所有 goal 新建判成①；无②删除。此写无 actor、events、tool receipt/undo 接线，人门同样不因存在就自动合规。

### 07 · create_sub_goal（E:105–121；B）

读/写 `goals`，人门同 `R/goals.ts:166–216`，无独立 service。

1. 缺 createGoalSchema 的 title/description/date/UUID 校验。
2. **仅缺 course_id 时才核 parent**；显式传 course_id 则跳过 parent 存在/归属核验。人门只要有 parent_id 就核（`:173–177`）。
3. 缺 course 所有权核验；人门必查（`:184–188`）。
4. 缺兄弟 sort_order=MAX+1（人门 `:190–205`）。
5. E 支持从 parent 继承缺失 course_id；人门 schema 的 course_id 目前 required（validators `:119`），不能因 route 注释声称入口已支持省略。E 摘要输出也不同于人门整行。

需在与 create_goal 共用的抽取业务上明确继承适配；不另造第二套创建 service。③出处条件触点同上，未观察到旧字替换/删除；此写无 actor/events/tool receipt/undo。

### 08 · list_decks（E:123–131；D）

读 `card_decks/courses`；人门 `GET /api/decks` → `R/decks.ts:12–27`，无 service。

1. E JOIN courses 并返 course_name；人门只读 card_decks。
2. E 返摘要，人门完整 deck row。

两轨 course 筛选、created_at DESC 相同，均读储存的 card_count，人门此处不重算。可共用基础查询后投影；无四禁令直接写效果。

### 09 · create_deck（E:133–144；B）

读 `courses`、写 `card_decks`；人门 `POST /api/decks` → `R/decks.ts:30–57`，需从闭包抽创建业务。

1. E 无 createDeckSchema 的 name 非空/≤200、description≤2000、course UUID 校验（validators `:162–166`）。双方都验证 course 归属。
2. E 摘要 + course_name；人门完整 deck row。

INSERT 字段、description || null、card_count=0、时间默认相同，未见额外级联差。新名/描述若源自人的口述/复制需③出处门；未见旧字替换或②删除。双方均无可信 actor、events/tool receipt/undo，抽取后仍须补共性门。

### 10 · list_sections（E:146–152；D）

读 `card_sections`；人门 `GET /api/sections` → `R/sections.ts:12–30`，还读 card_decks，无 service。

1. E 不做 deck_id 必填和 deck 归属前检；人门 `:16–23` 返回明确 400/404，E 可能只给空集。
2. E 仅 id/name/order_index；人门完整 row。

排序同为 order_index ASC,created_at ASC。可抽共用前检/查询；无四禁令直接写效果。

### 11 · create_section（E:154–173；B）

读 `card_decks/card_sections(MAX)`，写 `card_sections`；人门 `POST /api/sections` → `R/sections.ts:33–59`，无 service。

1. E 缺 deck UUID、name 非空/≤200、order 整数非负校验（validators `:224–228`）。
2. **E 缺 order 时 MAX+1 追加，人门 schema 默认 0 后直接写入**（`R/sections.ts:48`）。默认政策 **候 HQ 裁**，不自行选一边。
3. E 摘要；人门重新读取完整 row（`:50–51`）。

两者核 deck 所有权，未见额外级联差。需抽创建闭包；新名的口述/派生有③出处义务，未见旧字替换或删除。此写与人门均未接 actor/events/tool receipt/undo。

### 12 · list_cards（E:175–184；D）

读 `cards`；人门 `GET /api/cards` → `R/cards.ts:35–86`，另读 card_decks/card_tags/tags，无 service。

1. E 无 deck_id 必填/所有权前检（人门 `:39–47`）。
2. E 仅 template_type/title 搜索；人门另支持 tag_id/importance，搜索 title OR content（`:54–74`）。
3. E created_at DESC LIMIT 50；人门 section NULLS LAST/order_index/created_at，无 LIMIT（`:76`）。
4. E 摘要；人门解析 content JSON、hydrate tags（`:79–83`）。

可抽筛选/读取后投影；无四禁令直接写效果。

### 13 · create_card（E:186–189；候 HQ 裁）

无域读写，仅 BLOCKED；definitions `:144–146` 明示移出工具。D 拒绝桩只是候选。潜在人门 `POST /api/cards` → `R/cards.ts:103–158`。

1. E 不创建 card，也不代调 proposal；人门真实创建。
2. E 无可逐 SQL 对照的当前写路径；人门要求 schema/deck 归属/**section_id 必填**（`:114–117`），写 card/tags（`:138–141`）及 deck card_count +1（`:143–144`），并 hydrate 输出。

另一个实际落地路径 `R/proposals.ts:153–196` 允许 section_id=null、单独 normalizeCardContent，未共用人门。这是后续提案统一的边界事实，不算本 stub 的写。当前无四禁令写效果/成功收据；恢复写权须另获批准。

### 14 · get_review_due（E:191–197；D）

读 `cards/card_decks`；人门 `GET /api/review/due` → `R/review.ts:28–75`，count `:78–88`，另可读 card_tags/tags，无 service。

1. E `next_review IS NULL OR <= date`；人门 `<= date+'T23:59:59' OR fsrs_reps=0`（`:45–46`）。当天带时间、reps=0 且未来 due、reps>0 且 NULL 的集合口径会不同。
2. E 无 deck/section/tag filters；人门 `:48–59` 有。
3. E 无 ORDER、LIMIT20，count 只是截断数组长度；人门排序 reps/next_review，无列表截断，另有全量 count（`:65,78–88`）。
4. E 摘要；人门含 content/tags/course_id/完整字段。

可抽共同 due 查询/count；due 语义先候 HQ 定映射。纯读，不写复习判断或人的字。

### 15 · get_daily_brief（E:199–220；D）

读 `tasks/courses/cards`；人门 `GET /api/daily-brief` → `R/dailyBrief.ts:9–166` 还读 goals/recurring_task_groups/daily_statuses/time_blocks，调用 `R/timeBlocks.ts:65–70 getBlocksForDate`；没有 brief service。

1. E 接任意 date；人门恒为 today（`:11`）。
2. E 缺 exam mode 的 optional 过滤与 must exam_boost（`:29–44`）。
3. E 缺 exam→goal deadline→course weight→order 排序（`:61–85`）。
4. cards due 同上一项的 date-only/NULL 与 end-of-day/reps=0 差异（`:87–91`）。
5. E 缺 recurring alerts、energy、time blocks、minimum_working_flow/exam courses（`:93–164`）。
6. E 摘要任务和 cards_due/total_tasks/completed_tasks；人门完整任务、cards_due_count 等响应契约不同。

可抽日简报构建和内嵌 sortTasks；仍按实际纯读计 D，无四禁令直接写效果。

### 16 · create_proposal（E:222–241；候 HQ 裁）

写独立 `proposals(status=pending)`，不在此执行 payload。**GAP：通用提案创建无人门**。`R/proposals.ts:53–68,113–121` 是读，`:124–320` 是 apply，`:323–332` 是 discard，`:335–352` 是 edit；`:71–111` 的 material_map/organized_note/material_reconciliation 专用创建会调各自 service，不能冒充本动词五类通用提案的创建 service（五类见 definitions `:175–178`）。

G1. 运行时不校验 type 枚举，仅作 string 解构。

G2. 只验证 data object/items 非空，未校验各类 items、title/description/目标归属。

G3. INSERT 未传 conversation_id、原文锚或 actor；ProposalRow 虽有 conversation_id（`R/proposals.ts:44`），并未在 E 落下。

G4. pending 住独立表，但无 expiry/超时作废处理；没有自动接受，不等于已有 TTL 门。

G5. 无独立事件/收据/撤销引用；proposal 业务对象不是 tool receipt。

自域候选 C，但通用创建的人面对称要求与提案自域边界 **候 HQ 裁**，不把“能人工编辑/采纳”偷换成“已有人类创建门”。①类 payload 须独立提案、原文引用、中立呈现；③类后续变更须留痕。现 `R/proposals.ts:272–285` 的 schedule_adjustment apply 直改 title/status 不是现成 note_patch/changeset，该问题属于后续采纳链，不算 E 当前已经改 tasks。此 case 无②删除；④和共性账本缺口见 §2/5。

### 17 · get_study_templates（E:243–251；D）

读 `study_mode_templates`；人门 `GET /api/study-templates` → `R/studyTemplates.ts:16–26`，parseConfig `:8–13`，无 service。

1. E 投影 id/name/slug/description/strategy/config/is_system；人门 SELECT *（`:21–25`）。

两者可见性 user_id IS NULL OR 本人、系统优先/name 排序、config JSON 失败保留原值相同。可抽共用查询/parseConfig；无四禁令直接写效果。

### 18 · get_statistics_overview（E:253–304；D）

读 `tasks/study_activity_log`；人门 `GET /api/statistics/overview` → `R/statistics.ts:8–67`，私有 calculateStreak `:237–280`、getWeekStart/getWeekEnd `:282–296`，无 service。

1. E this_week 周一→today；人门周一→周日（`:25–35`），未来排程任务分母不同。
2. E 仅 current streak；人门还算 longest，current 逻辑相同。
3. E 缺 this_month；人门统计整月（`:37–65`）。

可抽 overview/helper（目前 helper 未 export 且使用 getDb）；纯读，不写完成/判断记录。

### 19 · suggest_next_topics（E:306–356；D）

读 `courses/tasks/cards/card_decks/goals`。**GAP：完整 suggest 聚合人门缺失**；`GET /api/statistics/courses`（`R/statistics.ts:195–233`）、tasks GET `:27`、goals GET `:19` 仅部分相邻，无完整 service。

G1. course_stats 的 task/card 计数可共用，但 E 返 code，人门另有 color/completion_rate/active_goals 数（statistics `:199–228`）。

G2. E course_id 仅筛 courseStats，recent completed/active goals/upcoming pending 未跟随过滤（E `:326–347`）。

G3. E 固定近7天 completed LIMIT20 与 today 起 pending LIMIT20；tasks 人门另有日期/filter/排序，不能原样替代。

G4. E 组合活跃目标摘要和 analysis_hint；无人门单次返回此组合。

可共用事实读取再组装。建议文本本身不是“人亲判”的写记录；若输出声称人已判过 X，才需真实判断出处，不据此把本纯读动词判①违规。

### 20 · generate_weekly_review（E:358–411；D）

读 `tasks/study_activity_log/courses`。**GAP：完整 weekly_review 人门缺失**；`R/statistics.ts:8–67,126–192` overview/trends 与 tasks GET 仅部分相邻，无完整 service。

G1. E week_offset 选择周一→周日；overview 仅当前周、trends 另种聚合，均无同形偏移入口。

G2. E 一次组合 completed/pending/total、复习活动数、按课程名完成数；人门分散。

G3. behind_schedule 只有 date<today AND date>=所选周起点，**无所选周终点上限**（E `:395–401`）；回看历史周可带上那周以后至昨天的任务。

G4. byCourse GROUP BY c.name，同名课程合并；最近人门 courses statistics 按 course.id 分项。

可复用计数/日期 helper，但完整业务仍 GAP；narrative_hint 不是写入 review，无四禁令直接写效果。

### 21 · search_memories（E:413–473；候 HQ 裁）

读 `agent_memories/agent_memories_fts/agent_memory_vec`，间接读 users.settings；**UPDATE last_accessed**，并触发 FTS delete/insert。最近人门 `GET /api/settings/agent-memories` → `R/settings.ts:13` → `R/agentMemories.ts:33–37`；私有 getMemory `:17–23` 只用于人工改删。**GAP：无同效果 search+access-touch 人门/service**。

1. 人门按 julianday(created_at) DESC,id ASC 全量列举；E 语义>FTS>LIKE 去重取10。
2. E category 只用于 LIKE（`:418–421`），FTS/向量未传 category（`:427,436`），合并后不再筛选。
3. E 更新 last_accessed（`:466–470`）；人门 GET 不写；FTS UPDATE trigger 在 db/init `:131–133` 无条件同步索引。
4. 人门返 source_conversation_id/last_accessed（`R/agentMemories.ts:11`）；E 缺这两项，可另带 similarity_score。

有人管理门，不能从表名自动归 C；完整效果又不等于人工列表，故 **B/C 归类候 HQ 裁**，绝不能列 D。访问时间不是正文替换/判断或永删，但写性、actor/收据/撤销准入边界不能省略。查询方法 `embedding/vectorStore.ts:216–266,357–394` 本身是 SELECT，写点来自 E，不是外部向量搜索推定。

### 22 · save_memory（E:475–499；候 HQ 裁）

**GAP：创建人门不存在**。`R/agentMemories.ts:33,39,61` 只有 GET/PUT/DELETE；PUT strict content 校验 `:12–15`、`:42–50` 事务内改既有记录并删旧向量，DELETE `:61–68` 删除向量/记忆，均不等价于 E INSERT。不能称整域“人完全不能管理”，也不能称 CRUD 四门齐全。

写 `agent_memories`（relevance_score=1.0，未填 source_conversation_id/last_accessed；schema `:281–290`）；INSERT 触发 FTS（db/init `:121–122`），另异步 DELETE/INSERT `agent_memory_vec`（E `:484–496` → vectorStore `:46–50`）。

G1. 无创建 route/service，不能直接借 PUT。

G2. E 无 content 非空/类别运行时校验，工具定义枚举不是执行端 parse。

G3. 未记录会话原文锚/actor 出处。

G4. 向量任务不与 memory INSERT 共事务，结果不进入工具返回/收据；成功返回不证明 embedding 写成功。

**C 自域 / 创建人门 GAP 的归类候 HQ 裁**。新建通常未覆写旧字，但人的口述/派生需③出处及 protected；category=decision 若声称“人亲判过”，须①真实出处，不能仅凭类别字面判合法或违法。无现行授权/来源机械标记，无 events/tool receipt。

### 23 · get_time_blocks（E:501–558；D）

只读 `time_blocks`。人门 `GET /api/time-blocks` → `R/timeBlocks.ts:98–122`，`GET /api/time-blocks/week/:date` → `:125–146`。现成导出函数位于 **route 文件**：getBlocksForDate `:65–70`、getAvailableStudyMinutes `:72–91`、detectOverlaps `:45–60`；不是 services 层。

1. E 对 study 直接“结束-开始”累加后取非负（`:505–514`）；人门跨午夜拆段并合并重叠（timeBlocks `:35–42,72–90`），分钟数不同。
2. 无参时 E 返回 today 至 +14 天（含终点）；人门返全部实例（`:117–121`）。
3. range/date 同时给时 E range 优先，人门 date 优先（`:102,109`）。
4. E range 按天补空日期、返每日分钟数；人门 from/to 返 flat 数组，周接口另返7天 map。
5. E 摘要且无 overlaps；人门日期/周响应有 overlaps，SELECT *。

可共用上述查询/计算 helper；时间算法与输出契约仍须统一映射，不照搬现 E 重复算法。无四禁令直接写效果。

### 24 · get_goal_dependencies（E:560–608；D）

读 `goal_dependencies/goals`。人门 `GET /api/goals/:id/dependencies` → `R/goals.ts:381–404`，`/:id/dependency-chain` → `:474–507`，私有 walkBack `:484–497`；课程/全用户相邻列表是 GET /api/goals `:19–52`。无独立 service。

1. 人门单 goal/链先核归属（`:384–385,477–478`）；E 的 goal_id 和 course_id 分支缺 user 条件/归属前检，只有全用户分支限制 g1.user_id（E `:605`）。
2. 人门返 depends_on/dependents 双向及 status；E 仅正向且字段少。
3. 人门 walkBack 遍历全部依赖分支并含当前 goal；E 每步 LIMIT1，仅走一条链且不含起点。
4. 人门链 enrich id/title/status/course_id/deadline（`:502–504`）；E 仅 goal_id/title，课程/全用户 flat edges 也非人门“对象+IDs”响应。

可抽 owned dependency 读取/遍历后投影，不能把缺 user 条件当适配签名差异略去。纯读，读取 status 不构成判断写；仅记静态范围差，不设计/执行对抗用例。

### 25 · search_documents（E:610–715；D）

读 `documents/courses/document_chunks/document_chunks_fts/doc_chunk_vec`，间接 users.settings。最近人门 `GET /api/documents?course_id=...` → `R/documents.ts:73–91`，闭包，无 hybrid search service。**GAP：完整三路搜索能力**。

G1. 人门要求 course_id（`:74–76`），E 可跨课程搜索。

G2. E 语义/FTS/文件名-summary LIKE，file_type 筛选，最多10文档，chunks 各截500字；人门仅 created_at DESC 元数据列表，无搜索/限数/chunk 摘要。

G3. E LIKE 分支要求 completed（`:675`），semantic/FTS 经 lookupDocs 却无一致 completed 限制（`:625–632`；vectorStore `:141–156,291–298`）；人门明返各状态/错误，不能声称 E 全链“只搜解析完成文档”。

G4. E JOIN course_name；人门无 JOIN，另返 file_size/parse_channel/error/timestamps 等。

可复用 owned 文档元数据与 VectorStore 查询（`:112–181,274–352` 仅 SELECT），再决定 hybrid 查询人门。getEmbeddingProvider 读取配置的源码调用本身无本地写；embed 会请求外部 provider，故不是纯本地计算，但不因此计入域写。无四禁令直接写效果；本单未触发 provider。

### 26 · get_document_content（E:717–785；D）

读 `documents/document_chunks`。人门 `GET /api/documents/:id` → `R/documents.ts:94–106`，`/:id/chunks` → `:109–125`；均有归属校验，无 service。E 先按 id+user 核 document，再读 chunks，不能误报缺归属。

1. E 仅 completed 可读；人门 detail/chunks 无此状态限制。
2. E 非分块正文截50000字，分块默认3条，可指定 index/all；人门 detail 全文，chunks 全量。
3. E 精简 meta/chunk 字段；人门 detail SELECT * 后去 file_path，chunks SELECT *。

可共用 owned document/chunk 查询并保留 Agent 上下文投影；无四禁令直接写效果。

### 27 · collect_preferences（E:787–796；C）

不读写业务表，只返 `__type:preference_form` 和 questions，是工单点名的 Agent 自域协议。**不是需补人工 CRUD 的 GAP**。orchestrator `:225–233,249–252` → `R/agent.ts:113–114` → `client/src/stores/agentStore.ts:197–206` 的临时 preferenceForms；用户提交（`:299–308`）才另发 [PREFERENCE_RESPONSE] chat，没有本 case 直接 UPDATE users.settings。

C1. definitions `:306–364` 有 questions schema（含 default_value），E 未运行时验证；只是协议标记，没有独立 actor/tool receipt（会话存档另见 §5）。

C2. 表单可预填 default（`client/src/components/AgentPanel/PreferenceForm.tsx:15–30`），且未绑定执行集/授权锚/TTL/单次核销；**不能当现成判断转录或永删确认门**。

普通问卷当前未替人写判断或删除；若扩为①②仪式门，其资格 **候 HQ 裁**，不能因表单可达就认定法定确认已实现。换会话仅恢复 messages、不恢复表单临时状态（agentStore `:95,100–103`），也不是持久授权对象。

### 28 · create_time_blocks（E:798–843；B）

写 `time_blocks`。人门 **同一 POST 原生支持批量**：`POST /api/time-blocks` → `R/timeBlocks.ts:149–192`。需抽参数归一/校验 `:151–167` 与事务创建 `:169–189`；无独立 service，不虚构 /batch-add。

1. 人门接受单对象或 blocks 数组；E 只接受 blocks 并拒空数组，人门空数组会201返回空数组。
2. 人门允许 template_id（`:154,180`）；E 固定 null（`:834`）。
3. 人门返回完整行数组/单行，E created 摘要缺 user_id/template_id/color/timestamps。

两轨必填/date/time regex、custom/type、null/color、UUID/now/批事务相同；两者此处均未验证真实日历/小时范围/overlap，不能记成人门独有校验。新 label 的口述/派生有③出处义务，未见旧字覆写或删除；共同缺 actor/events/tool receipt/可退登记。

### 29 · update_time_block（E:845–879；B）

读写 `time_blocks`。人门 `PUT /api/time-blocks/:id` → `R/timeBlocks.ts:195–221`；需抽 owned lookup + 字段更新闭包，无 service。

1. E not found/no fields 返 error JSON；人门抛404/400 AppError。
2. E 返 {updated,message}；人门返更新行本体。

两者同样先 id+user SELECT，再改 label/type/start/end/color、更新 updated_at，最终 UPDATE/SELECT 只用 id；均不能改 date/template_id，均无 PUT 时间/枚举校验。**未见其余 SQL/default/级联差，不能把共同缺陷写成人门优势。**

③明确触点：可改已有 label，未识别 protected/ratified、无 revision/diff/proposal，updated_at 不是文字痕迹。清空 label 等把信息推出恢复射程时亦涉及②，恢复边界 **候 HQ 裁**，不能按“只是 UPDATE”免除。双方无 actor/events/tool receipt/restore 信息。

### 30 · delete_time_block（E:881–893；B）

先读 `time_blocks`，再硬 DELETE；`server/src/db/migrations/014_fix_tasks_fk.ts:39` 使 `tasks.time_block_id` ON DELETE SET NULL。人门 `DELETE /api/time-blocks/:id` → `R/timeBlocks.ts:224–233`，同一 FK 效果，需抽归属查询+删除闭包，无 service。

1. E not found 返回 error JSON；人门抛404。成功 message 相同，未见不同级联。

②明确触点：硬删及关联任务解绑，现输入只 block_id（definitions `:409–417`）；没有结构化授权、系统生成实际执行清单、包含解绑后果的复述确认、哈希绑定或事件收据。源码未给恢复路径，不能把人工 DELETE 门视为 Agent 已合规。label 随宿主消亡涉及③，按删除仪式处理；未见判断表关联，不臆造“其中有 N 条人判断”。共同缺 actor/events/tool receipt/restore；message 不是收据。

### 31 · link_task_cards（E:895–928；B）

读 `tasks/cards`，写 `task_cards`。人门 `POST /api/tasks/:taskId/cards` → `R/tasks.ts:296–333`；无 service，需抽单链接校验/显式查重/插入，再定批量适配。

1. 人门必填单 card_id（`:301–303`）；E 遍历 links，无数组/单项运行时校验。
2. 无归属/不存在的 card 人门404（`:312–314`）；E skipped 后继续，可能混合成功失败。
3. 人门用 checklist_index IS ? 显式查重后409（`:319–323`）；E INSERT OR IGNORE。`011_task_cards.ts:12–14` 的可空 checklist_index + 三列 UNIQUE 不能替代对 NULL 的显式查重，重复语义不同。
4. E 整批事务，只返 created/skipped；人门单项返完整 link，含关联 ID/created_at（`:331–332`）。

两轨都核 task/card 归属、默认 checklist_index=null；均不核 checklist 范围、无 actor/events/tool receipt。批量失败/重复策略 **候 HQ 裁**，不自行选“静默跳过”或“整批拒绝”。关联不等于 relations.confirm，无已见①②③直接效果；仍需④写准入和可撤。已有人工 DELETE 链接（`R/tasks.ts:336–351`）不证明 E 接到了人类撤销栈。

## 5. 史记、收据与 HQ 工具事件点修

### 5.1 yield、会话存档、事件账本是三层

现工作树的工具事件 **yield 位于 `server/src/agent/orchestrator.ts:208–247`**：先逐项发 start，再执行 `Promise.all`，全体等待结束后逐项发 end。`E` 仍是返回 `Promise<string>` 的普通 async 函数。这里只记现物位置，未依据历史版本重建 HQ 点修内容。

`R/agent.ts:99–114` 将其转成 SSE `tool_start/tool_end`，载荷只有 name；`client/src/stores/agentStore.ts:186–195` 更新 `activeToolName`。异常也会在 `orchestrator.ts:237–240` 转为 ToolResult，故 end 不表示写成功，更不包含 actor、授权锚、实际对象集或 receipt ID。

`orchestrator.ts:266–280` 在域操作之后另经 `agent/memory/manager.ts:100–115` 写 `agent_messages` 并更新 `agent_conversations`；这是工具 calls/results 的**会话存档**。它没有与前面的业务写共事务；会话可经 `R/agent.ts:55–62` 删除，消息外键 `server/src/db/schema.sql:267` 为 ON DELETE CASCADE，不能充作永存 append-only 事件层。

真正 `events` 入口 `server/src/db/recordEvent.ts:61–83` 要求调用方已有事务，且校验 actor/channel/objects；`server/src/middleware/recordedAction.ts:29–58` 的人门包装固定 actor=human（`:49`），不能直接借用来冒记 Agent。其动词闭集也不是本次 12 项的通用包装。`recordEvent.ts:5–20` 大部分现行写效果没有对应 verb；`proposal_issued` 虽有，`create_proposal` 未调用。迁移 `054_v13_events_ledger.ts:31–37`、`058_v13_board_deleted_event.ts:41–47` 的 trigger 禁止改删 events，并不自动替业务 SQL 生成 events。

V2 tool receipt 实存 `operation_batches(source_type='mcp')`，由 `S/toolFaceReceipts.ts:147–182` 写入；没有一张名为 tool_receipts 的同等现物可凭名字假定。该 service 自身另有状态/metadata UPDATE（`:197–209,251–255`），不能连这层也一概叫 append-only。Proposal 行、学习活动日志、FTS、向量索引均不等于 tool-face receipt。

### 5.2 每个写动词的落账现状

下表“无”是指定 executor 调用链及随行源码触发器内未写入；不拿会话事件冒充持久操作收据。正常完整 chat 回合可另有共同会话存档，但不保证与域写原子落盘。

| 写动词 | 实际持久副作用 | events | tool-face receipt / 可送现行 revert 的收据 |
|---|---|---|---|
| complete_task | `E:49–51` UPDATE tasks | 无；也遗漏人门 study_activity_log | 无 |
| create_goal | `E:99–101` INSERT goals | 无 | 无 |
| create_sub_goal | `E:117–119` INSERT goals | 无 | 无 |
| create_deck | `E:140–142` INSERT card_decks | 无 | 无 |
| create_section | `E:169–171` INSERT card_sections | 无 | 无 |
| create_proposal | `E:237–239` INSERT proposals(pending) | 无；未发 proposal_issued | 无；pending proposal 不是 receipt |
| search_memories | `E:466–470` UPDATE last_accessed；FTS 更新触发器 | 无 | 无 |
| save_memory | `E:479–481` INSERT memories；FTS 插入触发器；`:484–496` 异步 vec DELETE/INSERT | 无 | 无；也无向量写完成结果 |
| create_time_blocks | `E:823–840` 事务批量 INSERT | 无；有事务不等于有史记 | 无 |
| update_time_block | `E:875` UPDATE time_blocks | 无 | 无 |
| delete_time_block | `E:891` DELETE time_blocks；tasks FK SET NULL | 无 | 无；无删除清单/授权引用 |
| link_task_cards | `E:907–926` 事务 INSERT OR IGNORE | 无 | 无；返回 created/skipped 计数，不含新链接 ID 清单 |

memory 附属写证据：`server/src/db/init.ts:118–136` 只把 memories INSERT/UPDATE/DELETE 同步到 FTS；`server/src/embedding/vectorStore.ts:46–50` 的 `upsertMemoryEmbedding` 只 DELETE/INSERT `agent_memory_vec`，未接 events/receipt。时间块 FK 见 `server/src/db/migrations/014_fix_tasks_fk.ts:39`。

## 6. GAP、B 族抽取规模与待裁项

### 6.1 GAP 清单（6 项；自域与拒绝桩另列，不混算）

| GAP | 证据及最近人门 | 拆单所需工作 / 粗估 |
|---|---|---|
| create_proposal：通用五型提案创建 | §4.16；R/proposals.ts:71–111 是三种专用创建，:124–320 是采纳 | **先裁 C 自域与人面对称边界**；若需共享通用创建，创建层本身约 0.5–1 人日。统一类型、逐型校验与原文出处涉及 definitions / proposal route / 专用 services；采纳链 tasks/cards/schedule_adjustment 双轨另估，不能塞进该半张小单 |
| search_memories：搜索 + access-touch | §4.21；人工 GET 只有全量列表 | **先裁 B/C 与访问元数据写边界**；三路查询/统一 category/filter + access-touch 抽取约 0.5–1 人日；是否新增人工搜索入口由 HQ 决定 |
| save_memory：创建 | §4.22；人工只有 GET/PUT/DELETE | **先裁 C 或补创建人门**；创建服务、来源参数及索引任务结果边界约 0.5–1 人日；若补人面，UI/交互工作另估，不能以 PUT 已存在抵销 GAP |
| suggest_next_topics：完整组合查询 | §4.19；statistics/courses + tasks/goals 只有部分数据 | 纯读组合与过滤/日期口径收敛约 0.5–1 人日；无需因此自动新增写动词 |
| generate_weekly_review：指定周复盘 | §4.20；overview/trends/tasks 不同形 | 纯读聚合、选周范围和 course.id 分组收敛约 0.5–1 人日；是否保留 hint/新建人面查询由 HQ 定 |
| search_documents：hybrid 三路搜索 | §4.25；人工 documents 仅课程内列表 | 共用检索读取、统一 completed/filter/投影约 0.5–1.5 人日；若补人工搜索 UI，单独估，不宣称已有同门 |

以上估值是依据已读函数规模的**工程量判断，不是执行耗时实测或排期承诺**；不含 HQ 裁定等待、下述公共宪法工程、产品验收或新 UI。六项也不宜无条件相加：部分只需保留自域协议，是否补门须先裁。

`collect_preferences` 是工单明指 C 族：没有人工 CRUD 不构成产品缺门，不列 GAP。`create_task/create_card` 是主动拒绝桩：潜在直接创建人门已存在，今日拒绝不是缺门；归类保留候 HQ 裁，不借此恢复写权。基础查询虽已有对应 route、响应仍有差异的 D 项（如 list_goals 的 hierarchy）在明细列组合差，不把所有投影差异膨胀成新增 GAP。

### 6.2 确定 B：9 个动词，8 个闭包抽取点

下表“拟抽业务”是范围说明，**不是声称已有某个同名 service 函数**。这些文件内没有能给 E 直接薄接的完整人门写 service。估值只到业务抽离、两端接入及现有行为契约对齐，不把“搬出闭包”冒充完成 V14 写权重铸。

| 拟抽业务（待命名） | 原人门及范围 | 对应动词 | 主要复杂度 | 粗估工程人日 |
|---|---|---|---|---:|
| task 状态转换 | R/tasks.ts:156–236，核心 :179–209 | complete_task | 原状态/完成时间、activity log、recurring 计数；①语义先裁 | 0.5–1 |
| goal 创建 | R/goals.ts:166–216 | create_goal、create_sub_goal | parent/course 归属、course 继承适配、兄弟排序；两动词一份业务 | 0.5–1 |
| deck 创建 | R/decks.ts:30–57 | create_deck | schema + 归属 + 返回投影 | 0.25–0.5 |
| section 创建 | R/sections.ts:33–59 | create_section | schema + deck 归属；order 默认 0/MAX+1 待裁 | 0.25–0.5 |
| time block 批量创建 | R/timeBlocks.ts:149–192 | create_time_blocks | 人门已原生支持批量，参数归一/template_id/输出适配 | 0.25–0.5 |
| time block 更新 | R/timeBlocks.ts:195–221 | update_time_block | owned lookup + 字段 patch；③留痕工程另计 | 0.25–0.5 |
| time block 删除 | R/timeBlocks.ts:224–233 | delete_time_block | 删除闭包短，但②复述清单/FK 后果/收据工程另计 | 0.25–0.5 |
| task-card 链接创建 | R/tasks.ts:296–333 | link_task_cards | 单项查重/NULL、批量失败政策、实际资源 ID 回传 | 0.5–1 |

**纯抽取与接线合计约 2.75–5.5 工程人日，涉及 5 个 route 文件、8 组业务。** 两个 goal 动词不能重复估成两个创建 service。抽出纯读 helper 可以同域搭车，但其余 D 的完整查询重构不在此合计。人工删除/修改能力只证明有人门，不能替代人类撤销栈覆盖证据。

### 6.3 与抽取分开的共性地基（不能用上述人日包票）

1. Legacy → 权威注册的边界、执行时共同 schema 校验、由入口导出的 actor/channel；`recordedAction` 当前写死人类 actor，不是安全薄适配的现成答案。
2. 写业务与 events 同事务；多数现行动词需要扩事件闭集及数据库 CHECK 的配套迁移。proposal_issued 已有词，但调用未接。需要 HQ 定统一落账语义后才能估全部工期。
3. 实际对象清单/工具收据、人类撤销覆盖及准入闸。现 trash_notes 的 receipt/revert 不能替本次 12 写背书；无撤销覆盖的写权不得因 SQL 改调用 service 就认定可注册。
4. ②删除的结构化授权、系统级实际清单/哈希、执行端复述确认、不可逆收据；③已有 label/后续 proposal apply 的 protected/ratified、留痕与可回退 changeset；①疑义字段及真实 chat 转录。普通 collect_preferences 和 SSE tool_end 都不能代替这些门。
5. 提案枚举/应用族统一是 §14.1 同段工作，但本次仅普查 E。organized_note 现有人门专用创建不能证明已经进入 chat 五型枚举；board_arrangement/note_patch 也不能靠本报告宣称已实现。安家 S 案、正文门重铸不在这 31 case 的 K-0 完成结论内。

这些是从现法与现码得到的待施工范围，不是本单新增设计或用例。公共机关的形态和拆单先后 **候 HQ 裁**，本单不实施、不授予写权。

### 6.4 候 HQ 裁索引

| 待裁项 | 需要裁的边界 | 本单保留状态 |
|---|---|---|
| create_task / create_card 归类 | 四族如何记无副作用拒绝桩；D 可作统计候选 | 两项未计入 D/A/B，不恢复注册 |
| create_proposal 归类 | 通用提案创建是 C 自域还是须补人门；不与采纳混同 | 未决，GAP 保留 |
| search_memories 归类 | 人类管理域与搜索/access-touch 自域界限，B/C 及写元数据准入 | 未决，明确为写 |
| save_memory 归类 | C 自域或补创建人门；GET/PUT/DELETE 不等于创建已齐 | 未决，GAP 保留 |
| complete_task 判断语义 | completed 是否含“人亲自判断/完成”的出处断言，需何种提案/转录门 | ①候裁，不按普通字段免责 |
| legacy 注册面的过渡地位 | 与④权威注册/准入机械闸的关系 | 不以“用了 SQL”自行判翻窗或宣告合规 |
| section order 默认 | 0 与 MAX+1 采用哪种统一业务语义 | 并列现物，不自选 |
| task-card 批量与重复 | 无效项跳过/整批拒绝、NULL checklist 显式去重政策 | 并列现物，不自选 |
| 用户文字/删除恢复边界 | label、口述/派生、decision memory 的效果分类；②实际级联仪式 | 不主张从轻；按实施法送裁 |
| 纯读口径与 GAP 产品落位 | due 日期、课程/类别过滤、指定周范围、统计分母、聚合入口是否补人门 | 所有差异留明细，未改算法 |

归类未决仅前四行涉及 **5 个 case**；其余是语义/适配/制度裁定，不重复计入未分类分母。

## 7. 交付与限制

本报告是源码普查及工程量估计，不是宪法符合性放行、产品修复或测试通过证明。31 个 case 均有总表及明细；实际写路径逐条列账。疑义保留「候 HQ 裁」；不恢复两个拒绝桩、不新增注册动词、不替 HQ 决定映射。工单要求的产物范围为本报告和工单末尾 Result / status；本单无测试、构建义务。

收口文档核对：源码 case 清单、总表、逐项标题均为31，双向差集为空；无残留编写占位。核过显式源码引用的文件存在性/行号边界（排除 §1 的 x.ts 记法示例）；executor/orchestrator/definitions 三份收口 SHA-256 与 §1 一致。另对写路径与事件链做只读交叉审校；这些是文档与静态证据核对，未运行产品测试或构建。
