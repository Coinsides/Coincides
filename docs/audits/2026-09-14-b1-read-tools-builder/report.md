> **状态 (Status)**: complete（builder 实现及可执行验证完成；Python/MinerU 与 git/secrets 留 HQ）
> **层 (Layer)**: 审计 / Builder evidence
> **工单日期**: 2026-09-14
> **实际执行日期**: 2026-09-13 UTC（环境时钟）
> **权威 (Authoritative)**: 否；供 HQ / reviewer 复核

# V14 · 14.2-B1 知觉四读器交付证据

四动词依据 active plan §14.2 的逐名授权及裁定⑩，进入 V2 注册表的 internal / immediate / read 面。chat definitions 从生成的 manifest 投影；legacy 手写定义没有新增条目。注册表 28 条，其中 public 14、internal 14。executor 仅做输入校验、调用投影、输出校验和 JSON 序列化，不调用写门机关。

## 交付与非 git numstat

实现、回归及 manifest 共 8 文件，**+2068 / -4**。依据本轮修改前字节快照作逐行 LCS；CRLF/LF 等价。数字不是 git 历史差分，不代表其它会话的改动。

| 文件 | + | - |
|---|---:|---:|
| docs/generated/tool-face-manifest.json | 1235 | 0 |
| server/package.json | 1 | 1 |
| server/src/__tests__/v14ReadTools.test.ts | 386 | 0 |
| server/src/agent/tools/definitions.ts | 3 | 3 |
| server/src/agent/tools/executor.ts | 16 | 0 |
| server/src/services/agentReadKnowledge.ts | 124 | 0 |
| server/src/services/agentReadSurfaces.ts | 208 | 0 |
| server/src/toolFace/registry.ts | 95 | 0 |

另更新生成的 agent-ops INDEX，重生成 object inventory（内容无差异），追加工单 Result，并交付本目录 report、validation、changes 和 numstat。逐文件字节摘要与统计见 [changes.json](changes.json) 和 [numstat.tsv](numstat.tsv)。二者不统计自身，避免自引用；验证脚本、修改前快照留本机 `.codex-tmp/v14-b1-*`，不计入交付或构建产物。

## 四器复用点

所有 SQL 仍由既有人门 service 拥有；两个新模块只做服务组合、排序、摘要与截断，没有新增 SQL、事务、事件或收据写入。

| 工具 / 新投影入口 | 复用的既有人门 service |
|---|---|
| read_note · agentReadSurfaces.ts:115 | notes.ts:136 `getNote`、:144 `listNoteBlocks`；canvasObjects.ts:1652 `getNoteCanvasPersistence`；canvasAssets.ts:159 `getCanvasAsset`；textFlowUnits.ts:9 `validTextFlowUnits` |
| read_board · agentReadSurfaces.ts:180 | boards.ts:346 `getBoard`（:132 ownership、:187 引用解析；text_range 健康派生复用 boardTextRanges.ts:31 `replayBoardTextRange`） |
| read_content_groups · agentReadKnowledge.ts:23 | contentGroups.ts:392 `listContentGroups`（含 course/note ownership 与成员投影）；itemSummaries.ts:7 `listItemSummaries`；摘要沿 courseCards.ts:22 的首 200 字口径 |
| read_annotations_relations · agentReadKnowledge.ts:58 | annotationTruths.ts:322 `listAnnotationTruths`；relations.ts:452 `listRelations`；notes.ts:136/:144、contentGroups.ts:392、itemSummaries.ts:7 提供作用域身份与既有成员 |

上述 service 路径均相对 `server/src/services/`。注册入口 `server/src/toolFace/registry.ts:895` 的 `AGENT_READ_TOOLS` 独立于 `AGENT_ACTION_TOOLS`；读器不需 confirm、revert 或 actor context。未改 recordAgentAction / recordChatTranscription 本体、MCP public bindings 或 HTTP 挂载。

## 上限与契约收敛

| 维度 | 上限 | 显式反馈 |
|---|---:|---|
| note 每页块 | 200 | total_blocks、truncated、has_more；后续页用 next_page_index |
| board members / edges / visuals | 各 200 | total_counts、各集合 truncated、has_more |
| content groups | 100 | total_groups、has_more、truncated |
| content group members | 整个响应共 200 | 每组 total_members / has_more、响应 total_members |
| 成员 plain_text 摘要 | 200 Unicode 码点 | text_truncated；trim 后截取，与 SQLite substr 口径一致 |
| annotation truths | 200 | total_annotations、has_more、truncated |
| annotation ranges | 整个响应共 200 | total_ranges、各 annotation total_ranges / has_more |
| relations | 200 | total_relations、has_more、truncated |
| note 关联 Item 扫描范围 | 200 个去重 ID | relation_scope.total_items / has_more、relation_count_complete |

相对工单 §一的字段/语义细化如下，未扩大写射程：

1. `read_note.kind` 保留现役 `block_type`（如 paragraph/media/item_ref），`role` 取现役 writing_role；多 unit 块额外给 text_units 保留各 unit 角色。附 placement_id/frame_id，纸帧按持久 y/x 阅读序，同页按版心 y/x 后 placement order 排序。无纸帧旧笔记为一页；无布局旧块按首纸与 placement order。历史 world 布局按人面现有几何 affiliation 规则做纯投影，无迁移/修复写。板外、crossing、未知 frame 的块以 omitted_blocks.outside_page 计数披露。
2. 读到失效媒体引用时保留 asset_id，并给 `type:null,state:missing`；板失效成员的 title_or_summary 可为 null，保留 state/placed。visual 使用现役 visual_kind，并附 x/y/w/h/scale/rotation/pinned 几何字段。
3. 内容组不加新的状态过滤：沿 service 的非 deleted 清单，保留 hidden；成员 Item 读当前正文，其它成员沿 current_content → preview_text → label 的既有摘要优先序。
4. Annotation 属于 Note，Relation 端点属于 Item。给 note_id 时读该 Note 注释；给 item_id 时读该 Item 所有状态的 Relation。仅 item_id 时 annotations=[]、annotations_note_id=null。仅 note_id 时从其 active item_ref placements 与非 deleted ContentGroup Item 成员汇集 Relation；不拿 origin_note_id 出生证充当 membership。两个参数同给时各自限定对应读面、各自做所有权校验。
5. 现役 Relation 没有独立 `confirm` 列，判断存为 active/revoked、created_by、affirmed_at、note、origin_purpose_id、snapshot IDs/内容和时间戳。全部直接保留 `listRelations(status:'all')` 原输出，无遮蔽、无伪造 confirm 字段；测试逐行与 `getRelation` 全对象相等。
6. 条目截断不提供新增游标。每页超过 200 块或板/组/注释清单超限时明确提示截断；note.next_page_index 只表示下一纸页，不把同页被截条目伪称为下一页。Relation Item 范围超限时 total_relations 只计已扫描范围，relation_count_complete=false。文本正文、原始判断快照不做另一个隐形文本截断。

## 验证结果

| 验证 | 结果 |
|---|---|
| 本单定向 | 11/11，通过，零 skip/cancel/todo |
| 三端 typecheck | shared / server / client 均通过 |
| 三端 build | shared tsc、server tsc+artifact、client tsc+Vite 均通过 |
| client 全库 | 167 文件，1722/1722，通过，零排除/跳过 |
| server 全量 | 动态枚举 server/src + server/scripts 全部 83 个 .test.ts；TAP 763 项，761 通过、2 环境失败，零 skip/cancel/todo/名称或文件排除 |
| 测试接线 | 83/83 wired、0 exempted、0 unwired |
| registry / manifest / parity | 5/5、10/10、10/10 |
| runtime 非 git/secrets 门 | 21 项最终全部通过；先行 shared build 另计 |

定向 fixture 是纯合成内存库。每一次 executeTool 调用（包括工单要求的普通 ownership 404）都断言：调用前后 `db.serialize()` 完整字节相同、零 db.transaction、零 db.exec、全部准备语句 readonly、无 receipt_id。这覆盖分页、四器输出、全部条目上限、两作用域和人类判断出处。未新增安全对抗类用例；既有安全回归进入完整集合照跑。

隔离执行沿 A2b：环境变量只继承 OS/工具定位白名单；空 DOTENV_CONFIG_PATH、空 Vite 环境目录、临时 app-data / assets / blobs / uploads；显式内存或既有测试自建临时数据库。没有读取真实 `.env`、provider 凭证或用户库。

首轮 docs:check 报 agent-ops INDEX 过期，已由 docs:index / docs:inventory 生成器更新并复验通过。各轮命令、完整 server 文件集合、退出码、计数与修复记录见 [validation.json](validation.json)，本目录不包含原始日志或构建产物。

## 留 HQ 与未做项

- `v2SourceMineruWiring.test.ts` 在模块加载阶段因 python.exe ENOENT 失败，其内部用例未启动，不记为通过；`v2SourceRegionCells.test.ts` 的 MinerU table-regions 用例因解释器无法启动，返回 101 / parser_failure。与 A2b 同类，未改环境或测试掩盖红灯。
- 根 runtime wrapper 末尾的 git diff 与 changed-file secrets 门按工单留 HQ，未执行 wrapper；仅按原顺序跑 21 个获准子门。没有 git 命令、.git 访问、commit/push/PR。
- 未触碰 contextHint、a11y、写动词、判断写、机关本体、用户库或依赖；没有新增 API 挂载或 provider 调用。新造凭据形值仅 fixture password_hash=`synthetic`，9 字符；UUID、源锚、文本与 SHA 摘要为域/证据数据。
- 未做浏览器主观验收、外部账号操作或 HQ 放行。没有未解决的施工冲突；环境修复及最终收口留 HQ / Henry。
