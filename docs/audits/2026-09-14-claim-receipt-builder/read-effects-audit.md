> **状态 (Status)**: active（第二次复工：22 项 read 源码核对完成；施工与动态验收见 builder Result）
> **层 (Layer)**: 审计蒸馏 / Audit
> **日期 (Updated)**: 2026-09-14
> **权威 (Authoritative)**: 否；分类授权仍以工单 HQ 裁定为准
> **范围**: V14 宣称-收据对账器；18 个 legacy read + 4 个注册读器的 executor 与传递调用链

# Read 效果审计与覆盖反例

**第二次复工更新**：HQ 工单尾部已明确 `read = AGENT_READ_TOOLS import 投影 + 18 legacy`，下文初轮的四读器覆盖冲突已经获得授权补正。§1–5 保留第一次复工审计的取证时态；最新核对结论、四 V2 读器完整调用链及簿记全集见 §6。此次共 22 项 read 均与补正裁定一致，未发现新的领域持久化冲突。

## 结论

HQ 列出的 18 项均已逐项核对源码：未发现工具执行路径修改领域内容、任务、目标、卡组、时间块或提案。`search_memories` 有两层簿记写：命中记忆的 `last_accessed` 更新时间，以及该 UPDATE 触发的 FTS 索引同内容重建；其余 17 项未发现工具自身的本地持久化写。`collect_preferences` 只返回表单 marker，通用聊天记录保存会把 marker 存为工具结果，未保存用户偏好。

**另有确定的分类覆盖冲突，须停线：**实际 chat 暴露面除 HQ 的 10 个 door_write、2 个 channel_write、18 个 read 外，还包含 `AGENT_READ_TOOLS` 的 4 个注册读器。三个封闭集若严格按裁定构造，现物 34 项中有 4 项未分类。不能自行把它们并入 read，也不能删暴露面或绕过完整性闸。

本审计只读源码，未执行 executor、未读取真实数据库或凭据、未调用网络；结论是源码路径核对，非动态无写证明。

## 1. 四个遗漏读器的独立证据

| 现物 | 位置 | 对覆盖的意义 |
|---|---|---|
| `registeredDefinitions` 映射 `[...AGENT_ACTION_TOOLS, ...AGENT_READ_TOOLS]` | `server/src/agent/tools/definitions.ts:10` | 两张注册表都在真实工具定义投影中 |
| `toolDefinitions` 展开 `...registeredDefinitions` | `server/src/agent/tools/definitions.ts:41` | 四读器不是仅存在于未使用常量中 |
| 10 个写门条目 | `server/src/toolFace/registry.ts:814`（数组至 818） | 与 HQ door_write 数量一致 |
| `read_note` | `server/src/toolFace/registry.ts:896`；`server/src/agent/tools/executor.ts:44` | 暴露且分派到 `readNoteForAgent`；不在 HQ 18 项 |
| `read_board` | `server/src/toolFace/registry.ts:900`；`server/src/agent/tools/executor.ts:45` | 暴露且分派到 `readBoardForAgent`；不在 HQ 18 项 |
| `read_content_groups` | `server/src/toolFace/registry.ts:904`；`server/src/agent/tools/executor.ts:46` | 暴露且分派到 `readContentGroupsForAgent`；不在 HQ 18 项 |
| `read_annotations_relations` | `server/src/toolFace/registry.ts:908`；`server/src/agent/tools/executor.ts:47` | 暴露且分派到 `readAnnotationsRelationsForAgent`；不在 HQ 18 项 |

`executor.ts:39-49` 在 legacy switch 前查找、校验并执行这 4 项。反例不依赖工具名字推断，也不依赖旧文档。四项底层领域效果的全链审计未在本报告中宣称完成；现物覆盖缺口已足以触发工单“冲突停线举证”。

## 2. HQ 指定的 18 项逐项核对

下表 executor 位置均为 `server/src/agent/tools/executor.ts`。所有路径共同调用 `getDb()`（`:36`）；`server/src/db/init.ts:16-21` 仅返回已初始化的连接，不会隐式执行初始化、迁移或建表。表中“自身簿记”不包括通用聊天记录，后者在 §4 单列。

| 工具 | Executor 路径与实际读取 | 传递调用 / 自身簿记 | 与 HQ read 裁定 |
|---|---|---|---|
| `list_courses` | `:53-56`，`:54` SELECT courses | 无传递业务调用；无自身簿记 | 一致 |
| `get_tasks` | `:58-76`，`:60-74` SELECT tasks JOIN courses，按参数增补筛选 | 数组参数、SQL 字符串拼装；无自身簿记 | 一致 |
| `list_goals` | `:111-148`，`:113-117` SELECT goals JOIN courses；hierarchy 分支 `:134-136` SELECT tasks | `Map`、children/tasks 为返回对象的内存拼装；无自身簿记 | 一致 |
| `list_decks` | `:183-191`，`:185-189` SELECT card_decks JOIN courses | 无传递业务调用；无自身簿记 | 一致 |
| `list_sections` | `:208-214`，`:210-212` SELECT card_sections | 无传递业务调用；无自身簿记 | 一致 |
| `list_cards` | `:230-239`，`:232-237` SELECT cards | SQL 参数筛选；无自身簿记 | 一致 |
| `get_review_due` | `:241-247`，`:243-245` SELECT cards JOIN card_decks | 返回数组长度与现有 due rows；无自身簿记 | 一致 |
| `get_daily_brief` | `:249-270`，`:251-253` SELECT tasks JOIN courses，`:259-261` SELECT COUNT cards | 优先级分组与计数均内存计算；无自身簿记 | 一致 |
| `get_study_templates` | `:305-313`，`:306-308` SELECT study_mode_templates | `:309-312` 只 JSON.parse 返回行 config；不调 seedStudyTemplates；无自身簿记 | 一致 |
| `get_statistics_overview` | `:315-366`，`:317-323` / `:334-359` SELECT tasks、study_activity_log | streak 与日期在内存中推导；无自身簿记 | 一致 |
| `suggest_next_topics` | `:368-418`，`:379-409` SELECT courses/tasks/cards/card_decks/goals | 只输出数据与 analysis_hint；未调用模型生成或写入主题；无自身簿记 | 一致 |
| `generate_weekly_review` | `:420-473`，`:436-463` SELECT tasks/study_activity_log/courses | 日期、聚合与 narrative_hint；不保存 review；无自身簿记 | 一致 |
| `search_memories` | `:475-478` 调 `searchMemories(userId, query, {category})` | `memory/service.ts:15-73`；SQL、向量/FTS 读取及可选 embedding 网络请求。**簿记 B1/B2** 见 §3 | 一致（使用 HQ 明示 last_accessed 例外） |
| `get_time_blocks` | `:486-543`，日期范围 `:503-505`、单日 `:528-530`、默认 `:539-541` 均 SELECT time_blocks | study minutes、日期填空只在内存计算；不调用 createTimeBlocks/updateTimeBlock；无自身簿记 | 一致 |
| `get_goal_dependencies` | `:545-593`，`:549-551` / `:560-562` / `:574-580` / `:585-591` SELECT goal_dependencies JOIN goals | include_chain 只循环读取、拼内存数组；无自身簿记 | 一致 |
| `search_documents` | `:595-700`，metadata `:607-617`；semantic `:639-645`；FTS `:653`；LIKE `:657-667` | `VectorStore.searchChunksWithContent`、`ftsSearchChunks` 与可选 embedding 网络请求（§3）；无自身簿记 | 一致 |
| `get_document_content` | `:702-770`，`:708-714` SELECT documents；`:744-746` / `:755-757` / `:762-764` SELECT document_chunks | 文本截断与分页返回；未触发解析器/分片生成；无自身簿记 | 一致 |
| `collect_preferences` | `:772-781`，`:776-780` 返回 `{__type:'preference_form', questions, message}` | executor 无 SQL 写；orchestrator `:267-275` 仅辨认 marker，`:319-320` 发 SSE；通用工具结果记录见 §4 | 一致；“发出表单”不是“保存偏好” |

## 3. 搜索链与簿记例外

### `search_memories`

- `server/src/agent/memory/service.ts:24-30` 是 LIKE + `ftsSearchMemories`；`:34-44` 是可选 query embedding + `searchMemoriesWithContent`；`:51-66` 是内存去重、过滤、截限。
- `server/src/embedding/vectorStore.ts:216-267` 的 `searchMemoriesWithContent` 只 SELECT vec 表与 agent_memories，再内存过滤；`:357-394` 的 `ftsSearchMemories` 只 SELECT FTS JOIN agent_memories。未调用该类的 upsert/delete 成员。
- **B1**：`server/src/agent/memory/service.ts:67-70` 在有命中时只写命中行的 `agent_memories.last_accessed`，限定 user_id + selected IDs；不改 content/category/relevance_score，不插入记忆。
- **B2**：`server/src/db/init.ts:131-134` 的 `agent_memories_au AFTER UPDATE` 因 B1 更新而执行 FTS 的 delete marker + 同内容 insert。FTS 数据为检索派生簿记，没有新记忆或语义内容变更。已检查 `server/src/db/` 当前源码中该表相关触发器声明，未发现额外 UPDATE 触发的领域写链。

### `search_documents`

- `server/src/embedding/vectorStore.ts:112-181` 的 `searchChunksWithContent` 只 SELECT doc_chunk_vec、document_chunks、documents；`:274-352` 的 `ftsSearchChunks` 只 SELECT FTS 与 documents，合并在内存中完成；无 last_accessed 更新。
- `search_documents` 与 `search_memories` 共用 `server/src/embedding/index.ts:12-37` 的 provider 选择器，读取 users.settings、解析配置；其 credential resolver 在 `server/src/services/providerCredentials.ts:132-134` 调只读 `readCredentials`（`:76-101`），没有调用 writeCredentials。
- 当前创建分支为 Voyage（`server/src/embedding/index.ts:60-68`）；`server/src/embedding/voyage.ts:19-36` / `:39-65` 把查询发到 embedding 服务并返回向量，未执行本地 SQL 或文件写。此处外部 API 请求可能有 provider 侧计费/日志，不属于本单的领域持久化分类。本审计未运行 provider、未加载凭据值、未发出请求。

## 4. 所有 18 项共有的会话簿记

原工单本身以 `agent_messages.tool_calls/tool_results` 为收据事实源。所有成功或失败的工具执行结果均经 `server/src/agent/orchestrator.ts:302-312` 的通用路径保存；`server/src/agent/memory/manager.ts:93-109` 在 `:103-105` 插入 agent_messages，在 `:108` 更新 agent_conversations.updated_at。这个共同调用记录不使每个 read 工具变成 channel_write。

对 `collect_preferences` 需特别声明：`questions` 和 marker 因通用 tool_results 聊天记录而持久存在；其 executor **没有保存偏好到 agent_memories 或任何偏好领域表**。`orchestrator.ts:319-320` 的 preference_form SSE 也没有独立领域写。此处“只发表单不持久”按工具效果解释，并非声称聊天历史不留表单记录。

## 5. 证据、运行与未做项

- 原始静态源码摘录与 SHA256：`.codex-tmp/claim-receipt-builder/read-audit/source-excerpts.log`；可复核脚本：同目录 `capture.cjs`。脚本仅读取明确列出的 11 个源码文件，未 import 应用模块。
- 源码取证脚本运行 1 次，退出码 0。**本子任务动态测试 0 项，广回归 0 次**；不借源码检查数字冒充验收测试。
- 18 个 HQ read executor 核对已完成；4 个注册读器仅完成暴露/分派反例核对，未宣称底层全链审计完成。
- 本子任务未做任何功能代码、注册表、操作说明书或工单改动；未触碰 `.git`、运行 git 或 commit；未读 .env、机器凭据数据或用户库；未装依赖。只新增本蒸馏件与 `.codex-tmp` 原始取证脚本/日志。
- 完整性闸、分类模块、收据投影/UI、红旗事件与验收仍须由 builder 主任务处理；本报告记录的新冲突须先由 HQ 澄清，不能据此报告擅自扩展封闭集。

## 6. 第二次复工：22 项 read 核对完成（2026-09-14）

**本节取代前文“仍待澄清”的施工前提。** 依据工单末尾「HQ 裁定补正（第二次复工令）」，read 的两个来源已经明确：注册读器通过 `AGENT_READ_TOOLS` import 投影加入，18 项 legacy 使用 HQ 明列集合。分类应为 door_write 10、channel_write 2、read 22，共 34 项；实际常驻完整性闸的动态结果由主任务单独申报，本静态审计不代替该测试。

### 6.1 四 V2 读器逐项调用链

分派入口仍是 `server/src/agent/tools/executor.ts:39`（表查找）、`:41`（输入 schema parse）、`:44–47`（四分派）、`:49`（输出 schema parse）。以下均已追到实际 SQL 与最终纯计算助手，并非根据工具名字或“read”注释判断。

| 工具 | 实际路径与 SQL 落点 | 效果结论 / 簿记例外 |
|---|---|---|
| `read_note` | `agentReadSurfaces.ts:115` → `notes.ts:136` 的 `getNote`（`:138` SELECT notes）、`:144` 的 `listNoteBlocks`（`:149` 调 `routes/notes.ts:66` 的只读归属核验；`:151–200` SELECT placements/blocks/sources）→ `canvasObjects.ts:1652` 的 `getNoteCanvasPersistence`（`:1657` 只读归属核验；`:1658–1768` SELECT objects/placements/mounts/connectors/images/assets/structured objects/page collection/block layouts；`:1748` 调 `listPageFrameRows`，`:1604–1649` SELECT）。媒体分支 `agentReadSurfaces.ts:100–108` → `canvasAssets.ts:159–170` SELECT 元数据并返回 missing 降级。 | 零领域持久化；零自身簿记。页框缺扩展时的 `recovered/degraded`（`canvasObjects.ts:1555–1601`）只在返回对象补记，没有修库；missing asset 不调用上传或清理。 |
| `read_board` | `agentReadSurfaces.ts:180` → `boards.ts:346–354` 的 `getBoard`，读取 board/member/edge/visual/layer；`:144–154` 读 board identity Item。`:249–251` hydrate member → `:187–246` 解析 note/item/content-group/text-range 引用；所有直接路径均 SELECT。text-range 特别分支 `:195–197` → `boardTextRanges.ts:65–68` SELECT range，再 `:31–62` replay（`:32` → `ownedNote :19–22` SELECT note；`:39–42` SELECT block/placement）。 | 零领域持久化；零自身簿记。`active/lost/drifted` 与摘录都是读时计算，不回写 range 状态、偏移或 board updated_at；未调用 `touchBoard`。 |
| `read_content_groups` | `agentReadKnowledge.ts:23–55` → `contentGroups.ts:392–425` 的 `listContentGroups`；`:397–400` 的 ensureNote/ensureCourse 只 SELECT（`:139–148`）；`:416–421` SELECT group；`:423` → `groupFolders.ts:498–518` SELECT active folder placements；`:424` → `contentGroups.ts:182–192` SELECT members；`agentReadKnowledge.ts:38` → `itemSummaries.ts:7–27` SELECT Item/board，摘要在内存生成。 | 零领域持久化；零自身簿记。此路径不调用 folder root 创建/修复函数，不保存截断结果或 orphan 降级标记。 |
| `read_annotations_relations` | `agentReadKnowledge.ts:58–126`：Note/Item 校验沿上述只读 getNote/listItemSummaries；`:70` → `annotationTruths.ts:322–368` SELECT annotations/ranges/block states；note-only scope 沿 listNoteBlocks/listContentGroups；`:100–102` → `relations.ts:452–472` 的 **item scope**，`:466` → `ownedEndpoint :196–212` SELECT Item；`:467` → `listRelationRows :351–362`，使用 `RELATION_SELECT :126–182` SELECT relations/snapshots/current Items/latest assessment；`:267–334` hydrate → `deriveRelationFreshness :241–260` → `items.ts:195–197` 仅 SHA256。 | 零领域持久化；零自身簿记。annotation anchor 状态、Relation freshness/checkpoint 只投影；**不调用**同文件导入的 `ensureCurrentItemSnapshot`，不插入 Snapshot、assessment 或 Relation；此工具仅传 item_id，未进入 purpose scope 分支。 |

表内未写全前缀的路径均位于 `server/src/services/`。进一步复核的叶节点：`noteHydration.ts:1–25` 为 JSON parse；`canvasPlacementLayout.ts:8–29` 与 `canvasObjects.ts:297–304` 为 layout 投影；`textFlowUnits.ts:3–20` 为筛选排序；`textFlowIdentity.ts:1–3` 为 ID 字符串；`graphemes.ts:8–64` 为 Intl.Segmenter/字符串裁切；`skin.ts:4–10` 及 `validators/skin.ts` 为 JSON/Zod 校验。它们没有 SQL、文件写或网络调用。

### 6.2 18 项 legacy 再核与完整簿记清单

已再读 §2 的全部 executor 分支及 §3 的搜索传递链；既有表中的 18 项路径/行号继续有效。新取证时，旧审计列出的 11 个源文件 SHA256 **11/11 相同**，并把四 V2 链补足到共 32 个明确列出的源文件。此数字是静态文件一致性证据，不是测试通过数。

- **工具自身唯一簿记 B1/B2**：仅 `search_memories` 会在 `memory/service.ts:67–70` 更新命中行 `last_accessed`；触发 `db/init.ts:131–134` 的 FTS 同内容删除标记 + 重插入。没有新语义记忆或内容修改。其余 **21 项 read 自身无本地持久化写**。
- **全 22 项共有的会话记录**：通用编排保存 tool_calls/tool_results 到 `agent_messages`，并更新 `agent_conversations.updated_at`；取证时入口 `orchestrator.ts:302–312` → `memory/manager.ts:93–109`。这属于收据事实源的会话簿记，并不把 read 改判成 channel_write。主任务可能移动编排器/manager 行号；此处行号对应本次静态快照，最终接线以 Result 行号为准。
- **`collect_preferences`**：`executor.ts:772–780` 仅返回表单 marker。questions 随通用工具结果入聊天历史，`preference_form` SSE 不单独写偏好。用户之后回复/确认是另一次交互，不是此工具已保存偏好的证据。
- **两个 search 的外部请求边界**：`search_memories` 与 `search_documents` 可调用 Voyage query embedding（`embedding/index.ts:12–68`；`embedding/voyage.ts:19–65`），provider 侧可能有请求日志/计费；本地路径不写 embedding/凭据文件。此次只读 resolver 源码，未读取其所指向的凭据数据、未运行 provider、未发请求。

### 6.3 本次原始证据与未做项

- 原始件只在 `.codex-tmp/claim-receipt-builder/second-resume-read-audit/`：`capture.cjs`、`source-full.log`、`capture-summary.json` 和 `inspect.cjs`/逐文件 AST 摘录。`capture.cjs` 明列 32 个源码路径，只读源码、记录哈希与行号，不 import 应用、不访问用户库或凭据；完整取证运行 1 次，退出码 0。初期逐符号查看不计入测试数字。
- 本子任务 **动态测试 0 项、广回归 0 次**，没有把静态无写检查宣称为数据库运行证明。常驻分类闸及全套验收由 builder 主任务处理。
- 本子任务只更新本蒸馏件与 `.codex-tmp` 原始证据；没有修改产品代码、注册表、写门、工单或说明书，没有触碰 `.git`、执行 git/commit、安装依赖、读取 key 值或用户库。
- **最新结论：22/22 read 源码核对与 HQ 补正一致，无新增停线冲突。**
