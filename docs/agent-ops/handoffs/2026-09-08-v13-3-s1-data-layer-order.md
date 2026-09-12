> **From**: fable
> **To**: codex
> **Status**: done(2026-09-12 状态头补翻:交付与 Result 早已在案,头未跟上;派发期原头:ready;两层制;13.3 单 1=板/魂数据与服务层,server 大单)
> **日期 (Date)**: 2026-09-08
> **性质**: 施工单(允许多轮内部推进)

# 13.3 · 单 1 · 板/魂数据与服务层(含书记官业务面首秀)

## 〇 · 上游(先读,顺序)

1. 段 plan:`plans/v13-3-board-mvp-plan.md`;
2. 单 0 报告全文(四题+§五拆单建议,本单改动面地图):`analysis/2026-09-08-v13-3-s0-recon.md`;
3. 图二(骨相法源):`analysis/2026-09-07-board-data-model-design.md`。

## 一 · 四项 HQ 冻结裁定(单 0 §5.1 四决定的回答)

**裁定甲(画物承载)**:新建**板自有画物层**(建议表名 `board_visuals`,迁移内定):board-owned,承载①画笔笔迹(新 kind freehand:points/path/style)②将来自准备区搬迁的孤儿画物(shape/image/table/connector 以板自有画物身份重新安家,几何/rotation/扩展数据全量保全;connector 裸点与样式原样保留,⛔ 强转 board_edges)。**board_members 保持纯引用**(图二四 kind,⛔ 扩枚举);本段 UI 只产 `note`/`content_group` 两种成员,`item`/`text_range` 留 CHECK 位、新写 13.4 开闸;rotation 归 visuals,members 无 rotation。

**裁定乙(旧魂承接)**:迁移退役三遗物按"新写禁令式":note_id/is_note_default 列保留,默认魂部分唯一索引 drop,project_id(course_id)语义放宽照图二;**server 旧行为两刀**——GET 读现存⛔ 隐式补建默认魂;PUT/替换名单类端点拒绝(410,错误名 `note_purpose_writer_retired`)。存量 note-default 魂原地保留(active),⛔ 本段迁移或删除;client 旧 Purpose writer UI 出口的摘除列入单 2 首块(本单 Result 申报受影响 client 消费面清单即可)。

**裁定丙(编译缓存)**:13.3 **零编译实现**——purpose_members 停写(新写禁令,表留),名单=三本自动账现算,编译视图候第一个真实消费者(13.4+)。⛔ 新旧双写过渡。

**裁定丁(事件面)**:13.3 入钢仅四 verb——`purpose_created`/`board_created`(挂靠开板也记,objects 含 soul 引用)/`mounted`/`unmounted`;板改名/viewport/几何/连线/笔迹⛔ 入钢(非落定点,单人打磨噪音);**v1 ⛔ 提供删板与改魂 UI**(删板与 purpose_amended 接线候后段,停车场记);无删板即无隐式 unmount 难题。书记官包装按单 0 §3.2 推荐方案逐条执行(认证后绑定通道/同步事务回调/channel=路由模板名/⛔ body 自报/事件失败业务同滚)。

**附**:boards 的 item 族身份=13.4 统一桥接,本段 boards 独立建表⛔ 接 item 表;`soul_id NOT NULL`+一魂至多一板(唯一索引)照图二。

## 二 · 施工范围

1. 迁移(编号开工复核,候选 057;fresh/upgrade 等价义务照 054 先例):`boards`/`board_members`/`board_edges`/`board_visuals` + purposes 三遗物处置;
2. server routes/services:板 CRUD(建/读/改名/viewport;⛔ 删)、开板立魂(新立/挂靠,核魂未占板)、成员 mount/unmount(四粒度 resolver,本段两种可产)、连线 CRUD、visuals CRUD;authMiddleware 同层挂载;
3. 书记官事务包装器+四 verb 接线;
4. purposes service/validator/旧 writer 退役(裁定乙/丙);courseLifecyclePolicies 等字面量登记面照单 0 §一 清单核销;
5. 单测:魂非空/一魂一板/成员粒度 CHECK/410 退役错误/动作与事件原子(含失败同滚)/fresh==upgrade 形状。

## 三 · 验证(段纪律)

server typecheck/build;§二.5 单测;一条冒烟:合成库全链(立魂开板→mount 两种成员→连线→visuals 写→事件四 verb 齐且原子)。

## 四 · 回执与边界

apply_patch 追加 ## Result(numstat+验证+client 受影响消费面清单+未做);⛔ commit(工作树交 HQ);⛔ 读 .env;⛔ 打印 key;⛔ 用户库;⛔ client 施工(单 2 财产);不动 3001/5173。现物冲突⇒停线举证。

## Result

> **From**: codex（builder）
> **日期**: 2026-09-08
> **交付状态**: server 施工与本单定向验证已完成；**存在下述验证纪律偏差，交 HQ 裁定，不宣告合规验收/放行**。工作树交接，未 commit；本单 header 保留供 HQ 翻牌。

### 0. 必须先读的执行偏差

补核旧 Purpose 消费语义时，主 builder 将三份相关常驻测试的更新及运行交给子任务，未在首次运行指令中将「禁安全类测试」落实为按名称选择。子任务全跑了 `v2RelationLifecycleClosure.test.ts`、`v2Relations.test.ts`、`v2SourceLifecycleClosure.test.ts`；其中 `v2Relations.test.ts` 包含跨用户拒绝断言。**这违反段 plan / 图二的禁安全类测试纪律。** 三文件 20/20 PASS 是实跑事实，不能作为合规验收结论。主 builder 已向用户披露并停止追加测试；本回执保留事实，不以通过结果抹去偏差。此后仅核对 diff、最终 server typecheck 和填写回执。

这三份测试的 DB 入口均已改为显式 `:memory:`；Source 文件仅使用测试自身的 `mkdtemp` 合成素材/补偿夹具。未读取 .env、未触用户库、未打印 key、未修改 client、未操作 3001/5173；没有 commit/push/PR。没有发生需改判四项冻结裁定的现物冲突；上述属于执行偏差，交 HQ 处理。

### 1. 已交付

- 编号复核最高 056，新增 `057_v13_boards.ts`；base schema 同步 boards / board_members / board_edges / board_visuals，触发器仅放 migration，兼容现有按分号执行 base schema 的启动方式。boards 独立建表，不接 Item。
- `soul_id NOT NULL` + 唯一索引保证一魂至多一板；魂外键 RESTRICT。board.project_id / purpose.course_id 均是可空弱标签，删 Project 时 SET NULL；不据此筛成员，不将库级魂随纸搬 Home。已核销 `courseLifecyclePolicies` 与 `courseLifecycle` 字面量。
- members 仅引用，DB CHECK 保留 note/item/content_group/text_range 四种，服务新写仅 note/content_group。几何含 x/y/w/h/scale/z_index/pinned，**无 rotation**。同一内容可有多个投影实例；边引用成员实例，通过同板复合 FK 约束，unmount 级联清理相关边。
- 四分支 resolver：note / content_group 按同用户与活状态解析（允许普通纸及 source_projection，拒 system/canvas_backing）；item 可读既有身份状态；text_range 明确返回 reserved/unavailable，本段不伪造范围身份、不开放新写。内容 soft trash / hard delete 保留投影及几何，读取给 available/unavailable/missing；恢复可重新显现，不把内容删除偷偷当 unmount。
- visuals 是板自有层，kind=freehand/shape/image/table/connector；独立保存几何、rotation、data、metadata。freehand 支持 points/path/style，旧画物的扩展 JSON、connector 裸点和样式有无损承载位置；几何 PATCH 不覆盖这些数据，不强转 board_edges。
- Purpose 三遗物按新写禁令退役：保留 note_id/is_note_default 列、原 FK 与存量行，drop 默认魂部分唯一索引；trigger 禁新增 note/default 写及字段改变。purpose_members 禁 INSERT/UPDATE，新服务无名单维护或双写；DELETE 仅保留既有 FK 生命周期清理能力，未提供业务写口或编译器。
- GET by-note 只读既有 active 历史魂/名单，不补建默认魂；PUT by-note 无论旧 payload 是否可解析均返回 **410 note_purpose_writer_retired**。旧 service writer 和 exported replacement validator 亦封口。
- 库级魂 create/list/get 保持 project_id=NULL，不再擦成空串；存储三态 active/sealed/archived 原样读回；创建固定 active，created_by 延续五枚举；无改魂/目的树/出版接口。
- 本段零编译实现：旧 compiled-scope/searchPurposeItems 显式 **410 purpose_compiled_scope_deferred**。因此 Relation 的 purpose-bounded list（含复用该服务的工具分支）同样暂不可用；按 Item 的 Relation 读取、出生魂核验和 origin_purpose_id 仍保留。
- 新 `runRecordedAction` 在认证后绑定 userId/human/固定模板路由 channel；同步回调内执行动作及 recordEvent，任何失败全回滚，提交后才响应。服务不收 actor/channel。只接 purpose_created / board_created / mounted / unmounted；挂靠开板也记 board_created，objects 包含 soul；实际 INSERT/DELETE 才记 mounted/unmounted。重复 mount ID 返回原几何、created=false；重复 unmount removed=false，不造新事件。
- 改名、viewport、成员几何、边和画物 CRUD 使用普通同步事务，不入钢；未接删板/改魂。生产 `index.ts` 把 /api/boards 与 /api/purposes 同层挂在 authMiddleware 之后。
- 常驻旧 Purpose 测试换为本段退役语义；相关 Relation/Source 生命周期夹具改用库级魂。保留 Project 删除后魂与出生引用存活、弱标签归 NULL、Item/ContentGroup 存活，以及显式删除无板魂后 origin_purpose_id SET NULL 的 FK 断言。

### 2. 单 2 / 单 3 可接的 HTTP 契约

| 路由 | 输入 / 输出与约束 |
|---|---|
| GET /api/purposes；GET /api/purposes/:id | 列表 {purposes} / 单个 {purpose}；可按 project_id、status 筛；库级 DTO project_id/course_id nullable，旧历史 note/default 字段保留但无新写语义 |
| POST /api/purposes | {title, project_id?, intent?, scope_note?, created_by?, metadata?, summary?} → 201 {purpose}；立魂与 purpose_created 同事务 |
| GET /api/boards | 可选 project_id 标签查询 → {boards} |
| POST /api/boards | {title, soul_id **或** purpose:{上述领域输入，不含summary}, project_id?, viewport?, summary?, purpose_summary?} → 201 {board}；两种立魂路径二选一，占魂返回409 |
| GET /api/boards/:boardId | {board,members,edges,visuals}；成员带 reference 状态及可用的 note_id/title |
| PATCH /api/boards/:boardId | {title?,viewport?}；viewport={x,y,zoom}，无限平移、zoom>0；不修改纸内排版 |
| POST /api/boards/:boardId/members | {id?,member_kind,member_id,x?,y?,w?,h?,scale?,z_index?,pinned?,metadata?,summary?} → {member,created}；新建201、同实例同引用重试200；多个投影须用不同实例ID |
| PATCH /api/boards/:boardId/members/:memberId | 仅几何/pinned；不可改引用，移动不重新 mounted |
| DELETE /api/boards/:boardId/members/:memberId | 可选 {summary} → {member,removed}；重复移除不记事件 |
| POST /api/boards/:boardId/edges；PATCH/DELETE .../edges/:edgeId | from_member_id/to_member_id/style/label；读回随板详情，写入不入钢 |
| POST /api/boards/:boardId/visuals；PATCH/DELETE .../visuals/:visualId | visual_kind + 几何/rotation + data/metadata；kind不可通过PATCH改变；读回随板详情，不入钢 |

summary / purpose_summary 提供时原文保存（含空白）；省略时各路由使用明确的机械文案，例如 Created board: + title / Created purpose: + title / Mounted 或 Unmounted + kind/id。channel 为方法加模板路由名，不使用 body 自报或具体资源ID拼出的通道。

### 3. 验证实跑与证据范围

| 验证 | 结果 |
|---|---|
| server `node node_modules/typescript/bin/tsc --noEmit` | PASS；最终包含三份回归夹具调整后再次通过 |
| server `npm.cmd run build` | PASS；manifest check + tsc + manifest 复制完成。现有递归 JSON schema 转换提示仍输出，未报构建错误；运行在追加三份测试夹具调整前，产品实现相同 |
| server `npm.cmd run test:v13-boards` | **18/18 PASS**；schema4 + services4 + routes2 + wrapper2 + Purpose6 |
| schema fresh/upgrade | 真实 base schema 与 001–057 迁移构造纯内存库；升级夹具在057前插入历史魂/名单/Relation；比较六表 SQL/index/trigger/FK，旧行逐行保真、foreign_key_check空、057重跑幂等 |
| 全链冒烟 | 真实router + 注入认证后userId + 临时随机loopback端口；库为 :memory:。独立立魂挂板、新立魂开板、跨Project note/CG上板、连线、freehand、重读、几何打磨、下板；四verb共7事件；note/CG原行与空名单未变 |
| 原子失败注入 | board_created 插入失败回滚新魂/板及前一条 purpose_created；mounted 失败回滚成员/板时间；unmounted 失败恢复成员、相关边、板状态及账 |
| 三份关联回归 | 子任务实跑20/20 PASS；**包含禁跑的跨用户断言，执行偏差见§0，不计作合规放行依据** |
| diff 边界 | 本次产品/测试修改仅 server；client/shared 零diff；暂存区空；现有个人/审计未跟踪文件保留 |

冒烟输出：

```text
V13_S1_BOARD_SMOKE_PASS db=:memory: verbs=4 events=7 note_and_group=PASS edge=PASS visual=PASS no_content_writes=PASS
V13_S1_BOARD_ATOMICITY_PASS create_with_soul=PASS mount=PASS unmount_with_edges=PASS
```

未运行整套 `npm run verify:v2-bn8-runtime`：按本单点名的段内定向验证及段 plan「不跑马拉松/禁安全类测试」限制执行；该整套门包含广泛 client 测试与安全扫描，**不将它记为 PASS 或已豁免**。本次也未运行完整 server test:v2、应用启动、浏览器/Henry走查或用户库迁移。上述执行偏差仍由 HQ 裁定。

### 4. client 受影响消费面清单（本单零修改）

以下 E = `client/src/pages/Notes/canvasEngine/`。核对了单0清单并重新限定检索生产调用；单2首块应先对齐退役writer与nullable DTO。

| 消费面 | 文件与下一单需处理的行为 |
|---|---|
| 旧DTO/归一化 | E/runtimeDataTypes.ts、E/purposeService.ts：project_id 不得NULL→空串；sealed需保真；默认魂排序/成员增删、role与order逻辑退役 |
| 旧HTTP writer/read | E/purposeRepository.ts：GET by-note 可能返回空数组；savePurposeFramesForNote 的PUT固定410；loadPurposeCompiledScope固定410 |
| 纸内活writer出口 | E/hooks/useNoteCanvasDataAdapter.ts、E/panels/ContentGroupPanel.tsx：savePurposeFrames、成员增删/角色/排序入口摘除；不能仅把服务410吞掉当保存成功 |
| 活装配透传链 | E/hooks/useNoteCanvasRuntimeController.ts、E/hooks/useNoteCanvasLayerProps.ts、E/hooks/useRuntimeDocumentDataController.ts、E/hooks/useRuntimePresentationController.ts、E/layers/NoteRuntimeDocumentLayer.tsx、E/layers/NoteWritingSurfaceLayer.tsx：PurposeFrame与保存回调传播；不借此次对齐重做纸行为 |
| 纸路由及导出壳 | client/src/pages/Notes/NoteDetail.tsx、E/NoteCanvasRuntime.tsx、E/index.ts：依然是活装配/类型导出面，目录名canvas不等于已死 |
| Gallery聚合与保存 | client/src/pages/GroupGallery/groupGalleryData.ts、SingleContentGroupEditor.tsx、GroupGallery.tsx：按project→notes读魂不再能枚举库级魂；Single Editor现仍在保存group后upsertDefaultPurposeRoleForContentGroup并写旧名单；saveGalleryRecord传purposes会410，groups/folders可已先保存，须摘掉该活出口 |
| Relation出生引用（保留） | E/relationRepository.ts、E/relationService.ts、E/runtimeDataTypes.ts、E/panels/ContentGroupPanel.tsx：保留 origin_purpose_id/purpose_id 身份收据；出生魂选择需改库级来源，勿连出生引用一起退役；Purpose范围读取当前410 |
| 尚无活UI调用的读取辅助 | E/readingInterpretationService.ts 的 projectContentGroupsForReading、purposeRepository.ts 的 loadPurposeCompiledScope：不是已接通UI，不把旧缓存当新材料集复活 |
| 删除后果文案 | client/src/pages/Courses/ProjectDeleteDialog.tsx、client/src/pages/Sources/SourceDeleteDialog.tsx：当前仍描述目的随纸搬/删，需与库级弱标签及下述legacy限制对齐 |
| 板新UI挂点（尚未施工） | client/src/App.tsx、components/Layout/AppLayout.tsx/.module.css、pages/DailyBrief/DailyBrief.tsx；单2/3接库级入口与独立viewport；双击可用现有/notes/:id |

### 5. 未做、限制与停车场

- 未实施 client 单2/单3、准备区搬迁动作、笔迹UI、删板、改魂、purpose_amended 接线、出版sealed状态机、Item桥接、item/text_range新写或材料集编译。
- 保留旧 note FK 是裁定乙的存量边界，**没有宣称已解除全部历史魂的随葬关系**。已挂板的旧note魂受boards.soul_id RESTRICT保护，其宿主note硬删（含经Project/Source删除）会被拒；当前旧删除预览未解释这个新限制，FK错误仍由旧错误处理呈现500。Source已有DB回滚/文件补偿路径未改；普通软trash/restore不触此FK。未挂板旧魂仍保留原级联行为；存量解挂/迁移及删除体验由HQ后段处理，不在本单暗改用户存量。
- members保留缺失投影、edges保留到显式unmount；这是引用降级，不作隐式成员删除，不要求在旧删内容路由伪造unmounted。
- 画物层只提供保全结构与CRUD，本单没有从用户准备区读取/搬迁任何行，未把历史零几何tray声称为可恢复摆阵。
- server构建仅生成产物；未启动现有应用、未发请求到3001/5173，未碰磁盘用户库/.env/凭证/执行器。全部工作树未暂存、未commit；放行与后续应用迁移仍交HQ。

### 6. Numstat

代码/测试 **23文件，+1963 / -1463**，不含本工单仅追加的Result。已跟踪文件按 `git diff --numstat`；新文件未暂存，按全文新增行计。

| 文件（均相对仓根） | + | - |
|---|---:|---:|
| server/package.json | 1 | 0 |
| server/src/__tests__/v2Purposes.test.ts | 164 | 706 |
| server/src/__tests__/v2RelationLifecycleClosure.test.ts | 14 | 27 |
| server/src/__tests__/v2Relations.test.ts | 13 | 30 |
| server/src/__tests__/v2SourceLifecycleClosure.test.ts | 8 | 9 |
| server/src/db/schema.sql | 74 | 0 |
| server/src/index.ts | 2 | 0 |
| server/src/routes/purposes.ts | 61 | 41 |
| server/src/services/courseLifecycle.ts | 4 | 7 |
| server/src/services/courseLifecyclePolicies.ts | 2 | 1 |
| server/src/services/purposes.ts | 116 | 641 |
| server/src/validators/index.ts | 5 | 1 |
| server/src/__tests__/helpers/v13BoardsFixture.ts | 40 | 0 |
| server/src/__tests__/v13BoardRoutes.test.ts | 181 | 0 |
| server/src/__tests__/v13BoardSchema.test.ts | 178 | 0 |
| server/src/__tests__/v13BoardServices.test.ts | 165 | 0 |
| server/src/__tests__/v13RecordedAction.test.ts | 67 | 0 |
| server/src/db/migrations/057_v13_boards.ts | 114 | 0 |
| server/src/middleware/recordedAction.ts | 59 | 0 |
| server/src/routes/boards.ts | 188 | 0 |
| server/src/services/boards.ts | 382 | 0 |
| server/src/validators/boards.ts | 99 | 0 |
| server/src/validators/purposes.ts | 26 | 0 |
