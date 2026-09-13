> **状态 (Status)**: done(HQ 本机全量 594/594 定案;收口见末尾)
> **From**: fable(HQ) · **To**: codex(builder)
> **日期**: 2026-09-14
> **单号**: V14 主线 · 14.2-B1 · 知觉四读器(read_note/read_board/read_content_groups/read_annotations_relations)
> **上游**: plan §14.2(active,Henry 拍转正——四动词逐名在案)+裁定书⑩(新动词入 V2 权威注册表⛔入 legacy 面)
> **法理前置(防误停线)**:四读动词系转正 plan §14.2 逐名点名件("read_note(逐页结构化块流)/read_board(成员+边+摆位图数据,08-30 承诺兑现)/read_content_groups/read_annotations+relations")——plan 经 Henry 拍=名单已亲批,⛔触发"新增动词须 Henry 亲批"条款;纯读零写权零收据零 events(现役 D 族同例),⛔机关准入闸射程(那是写门的闸)。

# 14.2-B1 · 知觉四读器

**性质**:Agent 从学习规划半区走进知识工作台的**读权先行**。四个只读工具,全部=既有人门 service 的投影(⛔新查询逻辑⛔直写 SQL——读也走 service,census D 族教训:executor 内嵌查询=另一种双轨);注册进 V2 权威注册表(read 面)+chat definitions 投影。

## 一 · 四读器契约(HQ 定形,字段名可随现物微调申报)

1. **read_note** `{ note_id, page_index? }`:缺 page_index=返回 `{ note: {id,title,course_id,page_format,page_count}, page_index: 0, blocks: [...] , has_more }`;blocks=该页按版心序的结构化块流 `{ id, kind(text/media/item_ref/...), role(writing_role), text(纯文本投影), media?: {asset_id,type}, item_ref?: {item_id} }`——"纸竖滚逐页读",一次一页;复用既有 note/blocks/placements service(申报复用点);
2. **read_board** `{ board_id }`:`{ board: {id,title,viewport}, members: [{id, member_kind, member_id, x,y,scale,pinned, title_or_summary}], edges: [{id,from_member,to_member,label}], visuals: [{id,type,geometry 摘要}] }`——免截图读板(08-30 承诺);复用 board services;
3. **read_content_groups** `{ course_id? | note_id? }`(至少其一):组清单+每组成员摘要(id/kind/plain_text 首 200 字——跟 courseCards 摘要口径);
4. **read_annotations_relations** `{ note_id? | item_id? }`(至少其一):annotation truths(id/range 摘要/text)+relations 行(**含 confirm 态原样读出**——判断域写保护≠读遮蔽,出处字段一并给,Agent 引用人类判断时有真锚可指);
5. 四器统一:非本人对象=404(ownership 签名法);超长防御=每响应块数/成员数上限(申报取值,超限带 has_more/截断标记⛔静默丢);零写零事务零收据。

## 二 · 注册与投影

四器入 V2 权威注册表(read/internal,零 confirm 零 revert 要求——读器不入写门准入闸);chat definitions 由 manifest 投影(A2b 先例);legacy definitions ⛔新增条目(裁定⑩)。

## 三 · 台账/禁区/验收(照 A2 常备)

零新增挂载期 API;client 全库必跑;server 全量必跑(Python/MinerU 环境红按例申报)。禁区:⛔任何写动词/⛔contextHint(下单)/⛔a11y 树(随行线另单)/⛔改机关本体/⛔判断域写/⛔新设计安全对抗类用例(既有回归照跑零排除)/⛔碰 .git/⛔commit/⛔读 .env key 值/⛔用户库/⛔新依赖/新造凭据形合成值 ≤20 字符(域数据不在射程)。

验收:1) 三端 typecheck/build+全门绿;2) 定向:①四器逐个真夹具读回形状断言 ②分页(多页笔记逐页+has_more)③非本人 404 ④上限截断标记 ⑤relations confirm 态与出处原样 ⑥零写断言(调用前后库字节级不变);3) server 全量+client 全库;4) 证据落 `docs/audits/2026-09-14-b1-read-tools-builder/`(⛔构建产物⛔原始日志);git/secrets HQ 收口。

## 四 · 申报义务

Result 必含:交付清单+numstat、四器复用点(各 service 文件:行号)、上限取值、契约与 §一 的偏差清单、测试数字、未做项。冲突停线举证⛔自作主张。

## Result

**Codex builder 完成**。实际执行日期 2026-09-13 UTC，工单日期沿用 2026-09-14。四器实现、定向回归及全库验证已完成；两项 Python/MinerU 环境红和 git/secrets 按第三节留 HQ，不宣称 server 全绿或代 HQ 放行。

### 交付清单与 numstat

实现/测试/manifest 共 **8 文件，+2068 / -4**，以本轮修改前字节快照作非 git 逐行 LCS（CRLF/LF 等价）：

| 文件 | + | - |
|---|---:|---:|
| docs/generated/tool-face-manifest.json | 1235 | 0 |
| server/package.json（新测试接线） | 1 | 1 |
| server/src/__tests__/v14ReadTools.test.ts | 386 | 0 |
| server/src/agent/tools/definitions.ts | 3 | 3 |
| server/src/agent/tools/executor.ts | 16 | 0 |
| server/src/services/agentReadKnowledge.ts | 124 | 0 |
| server/src/services/agentReadSurfaces.ts | 208 | 0 |
| server/src/toolFace/registry.ts | 95 | 0 |

另更新生成的 `docs/agent-ops/INDEX.md`，重生成 `docs/generated/object-inventory.md`（内容无差异），追加本 Result；证据落 [builder report](../../audits/2026-09-14-b1-read-tools-builder/report.md)、[validation.json](../../audits/2026-09-14-b1-read-tools-builder/validation.json)、[changes.json](../../audits/2026-09-14-b1-read-tools-builder/changes.json)、[numstat.tsv](../../audits/2026-09-14-b1-read-tools-builder/numstat.tsv)。逐文件统计不代表其它会话改动；changes/numstat 不统计自身，避免自引用。本目录无原始日志或构建产物。

四器进入 `AGENT_READ_TOOLS`，V2 注册表总 **28**（public **14** / internal **14**）；均 internal / immediate / read scopes，零 confirm/revert 要求。chat definitions 由 manifest 投影，legacy 手写项零新增；executor 只校验/服务投影/序列化，不经写门机关。

### 四器复用点

以下路径相对 `server/src/services/`，两个新投影模块零新增 SQL：

| 工具 | 复用 service 文件:行号 |
|---|---|
| read_note | notes.ts:136 getNote、:144 listNoteBlocks；canvasObjects.ts:1652 getNoteCanvasPersistence；canvasAssets.ts:159 getCanvasAsset；textFlowUnits.ts:9 validTextFlowUnits |
| read_board | boards.ts:346 getBoard；其 ownership 在 :132、成员解析在 :187，text_range 健康派生沿 boardTextRanges.ts:31 replayBoardTextRange |
| read_content_groups | contentGroups.ts:392 listContentGroups；itemSummaries.ts:7 listItemSummaries；首 200 字摘要沿 courseCards.ts:22 口径 |
| read_annotations_relations | annotationTruths.ts:322 listAnnotationTruths；relations.ts:452 listRelations；notes.ts:136/:144、contentGroups.ts:392、itemSummaries.ts:7 组合既有作用域与成员 |

### 上限、字段及契约偏差申报

- note 每页 **200 块**；board members/edges/visuals **各 200**；groups **100 组**、成员**整响应共 200**；成员摘要**首 200 Unicode 码点**（trim 后截取，text_truncated 显式）。annotations **200 条**、ranges **整响应共 200**、relations **200 行**、note 关联 Item scope **200 个去重 ID**。均有 total/has_more/截断反馈；scope 超限另给 relation_count_complete=false，total_relations 只计实际扫描范围。
- note.kind 保留现役 block_type（paragraph/media/item_ref 等）；role 取 writing_role，多 unit 额外给 text_units。附 placement_id/frame_id/next_page_index。纸帧按持久 y/x 阅读序、页内按版心 y/x 后 placement order；旧无帧笔记视为一页。历史 world 布局仅复现人面的几何归页投影；无任何迁移/修复写。非纸面、crossing、未知 frame 条目以 omitted_blocks.outside_page 计数披露。
- media 失效引用保留 asset_id 并给 type:null/state:missing；board 失效成员 title_or_summary 可 null，附 state/placed；visual.type 沿 visual_kind，geometry 含 x/y/w/h/scale/rotation/pinned。
- groups 沿 service 的非 deleted 清单（含 hidden）；Item 成员读当前正文，其余成员沿 current_content/preview_text/label 既有摘要序。
- Annotation 属 Note，Relation 属 Item：note_id 限定注释、item_id 限定 Relation；仅 item_id 时 annotations=[]、annotations_note_id=null。仅 note_id 时通过现役 active item_ref placements 与非 deleted ContentGroup Item 成员汇集 Relation；不以 origin_note_id 出生证代替 membership。双参同给各自校验与限定对应读面。
- **现物无 confirm 列**：人类判断使用 active/revoked、created_by、affirmed_at、note、origin_purpose_id、双 snapshot 出处等。直接完整保留 listRelations(status:all) 原投影，零遮蔽/伪造 confirm 字段；定向逐行与 getRelation 全对象对照。
- 未新增游标；条目超过上限时明确截断，next_page_index 只指后续纸页，不代表同页被截部分。正文与判断快照不另做隐形文本截断。

### 测试数字

- 本单定向 **11/11**；每次工具调用（包括普通非本人 404）验证 `db.serialize()` 前后完整字节相同、零 db.transaction、零 db.exec、全部 prepared SQL readonly、无 receipt_id。
- 三端 typecheck/build 通过；client 全库 **167 文件、1722/1722**。
- server 动态枚举 src + scripts **83 文件**全量：TAP **763 项、761 通过、2 环境失败**；0 skipped/cancelled/todo，0 文件/名称排除。接线 **83/83 wired、0 exempted**。
- registry **5/5**、manifest **10/10**、parity **10/10**；原 runtime 的 **21 个非 git/secrets 子门最终全通过**。首轮 docs:check 的 INDEX 过期已由生成器修复并复验，shared build 作为前置另计。
- 环境红：v2SourceMineruWiring.test.ts 加载时 python.exe ENOENT（内部测试未启动、不记通过）；v2SourceRegionCells.test.ts 的 MinerU table-regions 用例解释器启动失败，code 101 / parser_failure。按例申报留 HQ。
- 验证使用空 dotenv/Vite 环境目录、OS/工具定位环境白名单、隔离 app-data/assets/blob/uploads、内存/测试自建临时数据库。既有安全回归全部照跑，新测试仅工单功能验收，无新设计安全对抗用例。

### 未做项

git diff / secrets 按单留 HQ：零 git 命令、零 .git 访问、零 commit/push/PR、零真实 .env key 读取、零用户库接触、零新增依赖、零新增挂载期 API。未触碰写动词、contextHint、a11y、机关本体或判断域写；未做 provider 真调用、浏览器主观验收或代 HQ 放行。新造凭据形值仅 `synthetic`（9 字符）；UUID、锚、文本与 SHA 证据是域数据。CodeGraph CLI/MCP 与 rg 不可用，尝试后按限定目录读取。无未解决施工冲突；环境修复和最终放行留 HQ / Henry。

---

## HQ 收口(fable,2026-09-14)

1. **本机全量 594/594 零红**(builder 两项 Python 红=沙箱既知);
2. 交付核验:四读器零新 SQL 全走既有 service 投影;**逐调用库字节级不变断言**(纯读的机器证明,超出验收要求);上限/截断全显式;契约偏差申报诚实(relations 无 confirm 列→原样保留 active/revoked+affirmed_at+双 snapshot 出处,零伪造字段——这比我 §一.4 的写法更对,照收);注册表 28(public 14/internal 14),legacy 面零新增;
3. git/secrets 入收口单链。

B1 关门——Agent 具备免截图结构化读纸/读板/读组/读注与关系的知觉基线;08-30 read_board 承诺兑现。14.2 余件:contextHint 语境线(B2 随链派)+AI-readable 树(随行线候批)。
