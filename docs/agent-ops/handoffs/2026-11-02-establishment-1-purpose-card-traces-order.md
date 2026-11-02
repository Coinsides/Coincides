> **from**: claude(Main_Designer)
> **to**: 临时工程对话1(builder)
> **status**: ready(《知识建制更新 plan》已翻牌射程内直开;单 builder 串行,**排保真 1a 之后开工**;§二 D5 第 6 点申报的范围收缩 Henry 2026-11-02 已认,无未决项)
> **单号**: 建制Ⅰ · purpose 卡补层 + 导入事由捕获 + 痕迹开读与补墨
> **上游**: 《知识建制更新 plan》§三缺口 1+3、§四分期表(Henry 2026-11-02 翻牌:①教义铸宪②分期认③锁=UX 图标点选、机理从便、必要用布尔④普查暂落项目页);教义正文见方向宪章增补节;11-02 五路设计侦察(引证散落文内)

# 建制Ⅰ · 事由领册 + 痕迹开读

## 〇 · 目标一句话

purposes 从「形状在、零接线」变成活体:补原话层/解读层/锁三件;导入零问话自动领册或出卡;events 账本开出第一个生产读者(项目页 purpose 卡);复习评分与引用/编辑的人墨痕迹落账。**不等转写**(与保真线无依赖)。

## 一 · 教义对位(验收的宪法依据,全文见宪章增补节)

- 第 7 条:item 不带 purpose,purpose 全在组(透镜)——本期只建 purpose 侧,⛔给 items 加任何 purpose 字段;
- 第 8 条(二性律):用户亲笔=事实(原话层),机器推断=假设(解读层),假设见用户信号一步让路;
- 第 9 条(痕迹账本):行为=账本条目;**字段由问题倒推,没有消费者的 verb 不记**;两种墨水,成年只认人墨;署名随进入路径;
- 第 10 条(记录不裁定):痕迹只陈列,⛔任何「会不会」判定上脸;
- 第 11 条(purpose 卡):原话层一字不动=授权;解读层=agent 假设、事件驱动修正;锁=解读升格事实、agent 修卡权收回,锁后漂移照记、卡不动;机器不得无中生有造 purpose(起草/扩写/修正是分内事);
- 第 12 条:退休缓建——本期⛔做归档典礼/义务清零,见 D3 的 status 说明。

## 二 · 设计决策(D1–D8)

### D1 · 锁 = 新布尔列,不复用 status='sealed'

Henry 翻牌③授权「必要用布尔」。不复用 sealed 的硬理由:sealed 是生命周期值,客户端 activePurposeFrames 只留 status==='active'(purposeService.ts:169-175)、ContentGroupPanel 下拉排除非 active(ContentGroupPanel.tsx:1409-1418)——**锁住的 purpose 必须照常活着、照常可用**,塞进 sealed 会把它从一切现有读面上打掉。sealed 原语义(生命周期封存)保留给缓建的退休机制。宪章增补节「锁↔sealed 二次重发现」注记维持原文,施工单在此裁定分道:**撞合的是形状,分家的是语义**。

### D2 · purposes 补列(迁移一支;编号取开工时现头+1,写单时现头 084,1a 会先占一号)

```sql
ALTER TABLE purposes ADD COLUMN user_verbatim TEXT;                -- 原话层:用户原文,一字不动
ALTER TABLE purposes ADD COLUMN interpretation_json TEXT NOT NULL DEFAULT '{}';  -- 解读层(agent 假设)
ALTER TABLE purposes ADD COLUMN interpretation_locked INTEGER NOT NULL DEFAULT 0; -- 锁
ALTER TABLE purposes ADD COLUMN locked_at TEXT;
```

- ⚠️ purposes/purpose_members 的 DDL **只活在迁移 044 里,schema.sql 没有对应段**(侦察意外发现)——本迁移同样只住迁移文件,⛔试图去 schema.sql 找同步点;但 events 的 CHECK 两边都有,见 D6。
- interpretation_json 形状(zod 管,DB 不加 CHECK,随库中惯例):`{ true_goal?, territory?, behavior_pattern?, time_window?, draft_status?: 'pending'|'ready'|'failed', drafted_by?, revised_at?, revision? }`——**draft_status 可选**:人门 POST /api/purposes 建的卡与既有回填行都是 '{}',无 draft_status = 人建卡,卡面不显示起草状态(pending/failed 只属导入起草流)。
- 布尔语义:locked=1 ⇒ 解读层对机器只读(修卡服务拒写),人的一切权利不变。

### D3 · purposes 开 UPDATE 竖井(现状:生产代码零 UPDATE,amend/seal 连域函数带路由全缺)

services/purposes.ts 新增,全部要求 db.inTransaction(与 createPurpose 同款约定,purposes.ts:106-111):
- `amendPurpose(db, userId, purposeId, patch)`——人墨专用:title/intent/scope_note/user_verbatim/**interpretation(解读层人改)**/status。**解读层人改即落锁**(patch 带 interpretation 时同笔置 interpretation_locked=1):这是二性律的机械化——人动过的解读就是用户信号,机器不得再改写,恰等于第 11 条「锁=解读升格事实」;UI 以「保存并锁定」明示,用户事后可解锁重新放飞机器。此设计同时守住 CLAUDE.md §2 红线「**Agent 能编辑的,人类必须 100% 都能编辑**」(机器有解读写面,人也有)。status 只允许 active↔archived 翻转(**纯可见性开关**,给误生成的导入卡一个收纳处;⛔做成退休:无典礼、无义务清零、可随时翻回——第 12 条缓建红线);
- `setPurposeLock(db, userId, purposeId, locked)`——人墨专用;
- `revisePurposeInterpretation(db, userId, purposeId, draft, {actor})`——机器墨:locked=1 时 throw AppError(409,错误码 `purpose_interpretation_locked`;随库中锁/冲突用 409 的惯例,全仓无 423 先例),**不**静默跳过;
- 路由:`PATCH /api/purposes/:purposeId`(amend+lock,走 runRecordedAction 发 purpose_amended;meta 带改了哪些字段与 lock 动作);解读层修订**不开公网路由**,只作服务内部调用(D5 的导入起草与卡上「重新起草」动作经专路由 `POST /api/purposes/:purposeId/redraft` 触发,服务端自己调 provider)。
- runRecordedAction 的 verb 白名单(recordedAction.ts:6-8)加 'purpose_amended';底层 EVENT_VERBS 已含它(recordEvent.ts:23-25),**零 events 迁移**。purpose_sealed 这个 verb 继续空置(名字属于缓建的退休语义,⛔挪用来记锁;锁动作记在 purpose_amended 的 meta)。
- ⛔动 toolFace/effectClassification:本期不给 agent 开 purpose 写工具(谁要加,先过 assertToolEffectCoverage 的覆盖闸——明示后续单再说)。

### D4 · purpose_members 解封 + 'source' 入册

- 057 的两个无条件触发器把 purpose_members 的 INSERT/UPDATE 全封死(purpose_members_writer_retired_insert/_update,057:100-109)——**迁移里 DROP 这两个触发器**,这是本单一切名册写入的前置闸。purposes 自己的 note_purpose_writer_retired 触发器(note_id/is_note_default 冻结)**保留**,那是旧 note-purpose 链的退役钢印,与本期无关。
- 服务层新增 `addPurposeMember(db, userId, purposeId, {member_kind, member_id, metadata})`:zod enum member_kind ∈ {'content_group','item','source'}(DDL 本无 CHECK,照库中「约束在 zod」惯例;'source' 为本期新增——类型侧两处同步:services/purposes.ts:28、client runtimeDataTypes.ts:380;validators 现**无** member_kind schema,是新建不是同步);UNIQUE(purpose_id, member_kind, member_id) 已有(044:59-61),重复入册幂等处理。**本件连同类型同步归段 1**(段 2 的捕获直接消费它);
- fitness 列本期**不碰**(「这轮略过」=建制Ⅱ普查的墨水,现在没有消费者)。

### D5 · 导入零问话捕获事由(有上文取上文,无上文起草默认卡)

**对账单位 = 一次导入动作**,不是一条 source_record(侦察申报:precheck 命中会静默补 placement 短路 /upload,sourceFileIntake.ts:1333-1356;zip 展开一动作多记录;dedup 一动作零新记录——三条路都要进同一张网):

1. **没有可复用的「intake 事务」**(已核,三条入口在 placement 点均无环绕事务:precheck 路由裸调 ensureSourceProjectPlacement,routes/sources.ts:71-78→sourceFileIntake.ts:1350;dedup 的 finalizeDuplicate 同样裸调,1137-1146;fresh 路唯一事务 stageIdentity(1223-1252)在文件 rename/ready 翻转(1285-1293)**之前**就提交了)。所以 `capturePurposeForIntake(db, userId, {courseId, sourceRecordId, via})` **自开 db.transaction**(createPurpose + addPurposeMember + recordEvent 三件同笔),调用点放三条入口的**成功收尾处**:fresh = ready 翻转之后(⛔塞进 stageIdentity——rename 失败的清理只裸删 source_records(1307-1309),先开卡会留下指向已删源件的孤儿名册);dedup = finalizeDuplicate 成功返回后;precheck = **仅 placement_created=true 时**(已在位文件的重复 precheck 不再捕获,防反复开卡);
2. 闸条件按**落点**裁定,⛔按枚举字符串硬比对:目标 course 为系统 Home(library_upload 轨,sourceFileIntake.ts:666-667)→ **不出卡不领册**——入库=藏书上架,用户没给事由,机器凭空立卡就是第 11 条禁的「无中生有」,候后续认领;目标为真实 course(project_upload 与预留值 'import' 同轨、必带 course_id,sourceFileIntake.ts:49,669-670)→ 捕获。origin_entry_kind 是三值枚举,按落点裁定天然盖住第三值;
3. 规则(按序):
   a. 该 course 恰有一个 status='active' 的 purpose → 领册:addPurposeMember(member_kind='source'),member metadata 记 `{attached_by:'importer', nature:'hypothesis'}`(二性律:这是机器推断,普查/卡面展示要能区分)。领册路**不另发事件**(member metadata 的 attached_by 即痕迹,⛔为此造新 verb);
   b. 零个或多个 active → **新开导入卡**:createPurpose(created_by='importer',title=`研读《${display_name 去扩展名}》`,course_id=目标 course,user_verbatim=NULL,interpretation_json={draft_status:'pending'}),同事务领册全部 sourceRecordIds。多个不猜——错挂比多卡贵(机器污染用户名册 vs 多一张可收纳的卡);
   c. **同批合并窗**:若该 course 最近一张 created_by='importer' **且 status='active'** 的卡 created_at 距今 <10 分钟,领册到它、不开新卡(多文件连传不刷屏;刚被 archived 收纳的卡**不吸新件**;窗口大小 builder 可调,回执申报)。zip 展开是对每个条目递归 intakeSourceTempFile(sourceFileIntake.ts:874-907),没有天然的批量钩子——「一包一卡」就靠本合并窗兜住,capture 按单条 source_record 调用;
4. 授权锚:capturePurposeForIntake **自己的事务**内 recordEvent(purpose_created,actor_kind='human'——**导入是用户亲手动作**,卡由它派生;channel=真实入口路由字面量**由路由层传入**,遵守 recordEvent.ts:60-70「不得自报身份」契约;meta `{via:'intake', source_record_id}`);
5. **解读层异步起草**:capture 事务提交后 setImmediate(照物化链模式,sourceMaterialization.ts:517-543)调 provider 起一份解读草稿(getProviderFromSettings → AIProvider.chat,providers/index.ts:33-73;无会话依赖,侦察已核);写回走 revisePurposeInterpretation(actor='agent:interpreter'——actor_kind 的 `agent:${string}` 命名空间已预留未用,recordEvent.ts:34;发 purpose_amended 事件,meta `{field:'interpretation', trigger:'intake_draft'}`);失败翻 draft_status='failed',卡面给「重新起草」。⛔起草失败阻塞导入——文件照进,卡照立,解读候补;
6. **申报的范围收缩(Henry 2026-11-02 已认)**:plan 缺口 1 写的「事件驱动修正(痕迹到账=判断窗口)」本期**降格**为「导入起草一次 + 卡上手动重起草」——按痕迹逐条触发模型调用 = 判断密度与成本失配;真正的事件驱动判断窗口候建制Ⅱ痕迹读面成熟后(普查联查给出「解读 vs 痕迹漂移」的廉价信号)再接。此为对已翻牌 plan 的显式偏离,遵「先报墙」家法记档升 Henry,其答「认」(讲解含三理由:痕迹高频成本失配/普查面未立判断材料薄/二性律锁面压缩有效射程)。

### D6 · 人墨 verb 窄幅增补(三个,各有五消费者里的买主)+ 评分落账

events 加 verb 需重建表迁移(范式照 073:建新→按 seq 拷贝→DROP→RENAME→重索引重触发器→恢复 sqlite_sequence 高水位)。**只加三个**:

| verb | 买主(五消费者) | 发射点 |
|---|---|---|
| `card_reviewed` | 成年扳机预备/画像/情景问答;meta.rating 同时承载「练」(2-4)与「错」(1=Again) | POST /api/review/:cardId/rate(review.ts:91-189) |
| `item_cited` | 画像/普查「有痕」预备 | item_ref 块建立(notes.ts:234 路)、content_group 收 item 成员(contentGroups.ts:296-305 路) |
| `item_edited` | 成年扳机预备/漏定义 | PUT /api/items/:itemId 与 retire 路的**路由层**(裁定见下方注入层 bullet;updateItem 服务内已有事务+ensureSnapshot,items.ts:461-500,但⛔在服务内发射) |

- **⛔不加「标」**:没有现成操作、没有消费者(「这轮略过」=purpose_members.fitness,建制Ⅱ普查随附)——第 9 条「没有消费者的字段不记」的正用;
- **⛔不记块级编辑**(note_blocks 的改):高频噪音,公民是 item 不是块;
- 板上 mount item 已发 'mounted' 且 objects 带 {kind:'item'}(routes/boards.ts:246-253)——「引」的板侧**已在账**,读侧直接消费,⛔重复发射;
- **item_cited 组路注意**:真实写入是 replaceContentGroupMembers **整册替换**(contentGroups.ts:315-385,每次保存全量 upsert)——发射前按 existingIds(323-327)做差集,**只对新进册的 kind='item' 成员发射**,否则每次保存组全员重复入账=痕迹灌水;
- **item_edited 注入层裁定**:**路由层 runRecordedAction 为主案**(人门 PUT /api/items/:itemId 与 retire 路各自包,'item_edited' 入白名单)——recordEvent 契约禁业务码自报身份(recordEvent.ts:66-68),塞进 updateItem 服务内就要穿 actor/channel 参数、还连累直调服务的测试,不取;
- **评分落账 = card_reviewed 一条事件,不另立 review_logs 表**:meta 收 ts-fsrs 的 result.log(现被原地丢弃,review.ts:137-138)——`{rating, state, elapsed_days, review_ts}` + 结果 `{stability, difficulty, next_review, reps}`;**objects=[{kind:'card'},{kind:'deck'},{kind:'course'}] 三级都进**(course 经 JOIN card_decks,GET /due 已有范式 review.ts:36-38;⛔只挂 card——那样项目/事由侧读面永远够不着评分痕迹)。侦察点破:FSRS 持久化有损(lapses/state/learning_steps 无列,rate 时硬编码重建,review.ts:112-123),这条事件流就是未来重放 FSRS 状态的唯一原料——字段按此倒推,别省;
- **顺手把 rate 路由焊成一笔**:现状 UPDATE cards + INSERT study_activity_log 无事务且 UPDATE 的 WHERE 不带 user_id(review.ts:142-165)——包进一个事务(recordEvent 本就强制 inTransaction),UPDATE 补 user_id 条件;走 runRecordedAction(回调全同步,侦察核过可套)并把 'card_reviewed' 入其白名单;study_activity_log 照旧双写(统计页活在它上面,⛔动);
- 署名随进入路径:复习入口无 purpose 语境(cards⟂items/purposes,桥不存在,侦察问六已判)——**本期不造 card↔item 桥**(负空间,候建制Ⅱ建点后再议),card 痕迹先挂 card/deck/course 三级,如实即可;
- ⚠️ **schema.sql 的 events CHECK 已经失守**(基表 23 词 vs 迁移终态 25 词,fresh DB 靠 076/081 的重建守卫补齐)——本迁移把 schema.sql 的 CHECK 一并修到全集(25+3=28),且新迁移的重建守卫要在「schema.sql 已含新词的新库」上正确跳过、在「旧库」上正确重建——两边一起想,夹具两种库各证一次;
- ⚠️ **必撞测试点名(预算进段 1)**:①v13EventsLedger.test.ts——VERBS 副本(17-23)与 deepEqual(231)、计数 25→28(241)、夹具迁移清单(37-51)要加新迁移,且 **:125 是 schema.sql CHECK 与迁移重建 DDL 的逐 token 等值闸**——新迁移的 verb 列表必须与修后 schema.sql **同序同拼写**;②v13ItemFloor.test.ts:136-137(item_edited 撞闭集断言);③新迁移的 verb 列表以 081/schema.sql 全集 25 词为底、新三词**追加在尾**——⛔照抄 073 的 15 词旧列表(少 8 个 planning 词,旧账拷贝会过不了新 CHECK)。其余路若再撞整账断言(v13BoardRoutes.test.ts:107-125 本单不动 board 路应不撞),逐个改并回执申报。

### D7 · 痕迹开读:第一个生产读者

- 服务端新模块 `services/eventsLedger.ts`(只读):`listEventsForObjects(db, userId, refs: {kind,id}[], {verbs?, limit, beforeSeq?})`,实现用 `json_each(events.objects)` 展开匹配,ORDER BY seq DESC;人类规模(万级行)SQLite 无压力,先不加索引,慢了再议;
- 路由 `GET /api/purposes/:purposeId/traces?limit=`:refs = purpose 自身 + 其名册成员(member_id 批量,封顶 200 成员,超了取最近);返回 `{events: [...], member_count, scanned_refs}`;
- **消费者 = 项目页 purpose 卡**(见 D8)。这就是验收点「events 有第一个生产读者」的落点。

### D8 · 项目页 purpose 卡(普查暂落项目页的先遣面)

- 挂点:CourseDetail 新 section(骨架照 Goals/Decks 同构:styles.section/sectionHeader/sectionTitle/sectionCount,CourseDetail.tsx:1579-1702),位置排在 ProjectIdentity 之后、Goals 之前;数据 `GET /api/purposes?project_id=&status=active`(服务层现成,purposes.ts:88-93;**带 status='active'**,archived 收纳才真生效——本期收纳即从 section 消失,翻收纳箱候后续);
- 卡面(第 10 条约束:只陈列,零裁定):title;原话层(有则引号原文,无则「(导入推定)」徽标);解读层摘要(draft_status pending/failed 给状态与「重新起草」);**锁图标**(翻牌③:图标点选可锁可解——lucide Lock/LockOpen,点击 PATCH 翻 interpretation_locked,无确认弹窗;解读层人改另按 D3 自动落锁);成员计数;最近痕迹 3-5 条(D7 路由,verb+摘要+相对时间);
- 编辑:title/intent/原话层行内可改(amendPurpose);**解读层行内可改**(保存即落锁,按钮文案「保存并锁定」——D3 裁定的 UI 落点);archived 翻转收纳;
- GET /api/purposes/:purposeId 与列表读面带上新列(hydrate 补 user_verbatim/interpretation_json/interpretation_locked/locked_at)+ **member_count 子查询**——hydratePurpose 默认 members=[],只有 legacy by-note 读挂名册(purposes.ts:46-68),不加计数则卡面成员数恒 0;顺手改掉 58-59 行「历史名册只供 legacy 读」的旧注释(source 成员起,名册就是活的);
- 文案进 locales/en、zh 两份 translation.json;客户端数据层扩 purposeRepository.ts(⛔新开 zustand store,照 repository 惯例);
- ⛔碰 ContentGroupPanel/BoardList 的现有 purpose 消费面(它们按 active 过滤的现状不变)。

## 三 · 验收(测试面=功能/数据/回归)

**功能**:
1. 零问话出卡:project 页导入(无 active purpose)→ 导入卡自动出现,title 含文件名,解读层 pending→ready(测试用桩 provider);恰一 active purpose → 领册不新开卡,member metadata 带 hypothesis 标;10 分钟窗内第二件 → 并入同卡;zip 一包多件 → 一卡多成员(合并窗兜);precheck 去重短路路 → placement_created=true 时照样领册、已在位重复 precheck 不再触发;library 页导入 → **零卡零册**;
2. 锁行为正确:锁后 revisePurposeInterpretation 被 409 拒(错误码 purpose_interpretation_locked,与 D3 对齐)且痕迹照常入账;人改 title/原话照常;解锁恢复;锁动作本身有 purpose_amended 事件;
3. 第一个生产读者:卡上最近痕迹随真实动作(**引用/编辑**)出现——评分痕迹挂 card/deck/course 三级,与 purpose 名册不相交(cards⟂purposes 无桥,本期如实),⛔在 purpose 卡上验评分,它的验收在第 4 条账本层;
4. 评分落账:rate 一张卡 → events 行含 rating+FSRS 前后值、objects 三级齐,与 cards 表更新、study_activity_log 同事务(断言三件同成同败);
5. item_cited/item_edited 在各自路上发射(三个新 verb 当前全是人门,actor_kind='human'——agent 侧本无这些写工具);组路只对**新进册** item 发射(差集断言,重存组不灌水);
6. archived 翻转往返:收纳后项目页 section 消失、翻回即现(翻回走 PATCH /api/purposes/:purposeId——本期无收纳箱 UI);无典礼、无义务清零(第 12 条自我设界的夹具)。

**数据**:events append-only 触发器仍立(UPDATE/DELETE 被拒);28 词 CHECK 新旧两种库夹具各过;purposes 新列默认值回填正确;importer 卡 created_by='importer'。

**回归**:既有整账断言测试全绿(改动的逐个申报);410 墓碑原样(compiled-scope、by-note PUT);purposes_note_writer_retired_insert/_update 两触发器仍立(按真名查,'note_purpose_writer_retired' 只是其 ABORT 消息文本);统计页(study_activity_log 读者)零变化;ContentGroupPanel/BoardList 的 purpose 下拉零变化;两侧 tsc 0;`npm run check:changed-file-secrets` 过。

## 四 · 风险与止损

- 导入卡刷屏:合并窗 + 仅 project_upload + archived 收纳三道缓冲;若 Tester 轮仍觉吵,收紧为「零 purpose 的 course 才出卡」回炉再议;
- 解读起草走真实 provider(岛上由用户配置的供应方)——**开发与测试全程桩 provider,⛔builder 调真实模型**;起草 prompt 短平(输入=文件名+course 名+既有 purposes 标题,输出=解读 JSON),单次调用,无工具;
- events 表重建迁移在活库上执行:照 12 步法纪律,迁移前后 COUNT(*) 与 MAX(seq) 守恒断言写进迁移测试;
- 整账断言连环爆:预算进段 1,逐个改并申报,⛔为过测试而删断言语义。

## 五 · 纪律(现役全套照抄)

⛔一切 git 写操作;⛔读 .env 的 key 值;⛔动依赖锁文件;⛔真实模型调用(桩之外一律禁,含「只调一次试试」);⛔共享树换码对照;合成凭据 ≤20 字符或带 `synthetic-key-not-real-` 标;措辞中性,⛔安全类测试设计;迁移照 foreignKeysOff 运行器纪律;时间盒照段;证据落 `docs/audits/2026-11-02-establishment-1-builder/`。

## 六 · 分段与回执

- **段 1(地基)**:迁移(purposes 补列 + members 解封 + events 三词与 schema.sql 对齐)+ purposes UPDATE 竖井 + addPurposeMember 服务与 member_kind validators/类型同步(D4)+ rate 路由焊事务落账 + item_cited/item_edited 发射 + eventsLedger 读模块(带针对性测试与两种库夹具);
- **段 2(导入捕获)**:capturePurposeForIntake 三入口收口 + 合并窗 + 异步起草(桩)+ purpose_created 授权锚;
- **段 3(卡面)**:traces 路由 + CourseDetail purpose section + 锁图标 + redraft 按钮 + 文案;
- 每段回执追加在本文件尾部 `## Result`,完工发短讯。依赖:无(不等转写);排期:保真 1a 完工后开工。

## Result（段 1 · 地基,builder 2026-11-02）

**执行状态**:单内段 1 全部完工,外加你短讯里的 PATCH 路由与 redraft 骨架;未提交。全量回归 1 条红,为既有问题(申报 1)。

**改动**:
- 迁移 `086_v2_purpose_card_ink_verbs.ts`(现头 085+1):purposes 四列、DROP `purpose_members_writer_retired_insert/_update`、events 三词重建;`schema.sql` 的 CHECK 修到 28 词,与迁移同序同拼写。
- `services/purposes.ts`:`amendPurpose`、`setPurposeLock`、`revisePurposeInterpretation`、`addPurposeMember`,以及内部用的 `assertPurposeInterpretationUnlocked`、`markPurposeDraftPending/Failed`。读面带上新列。
- `validators/purposes.ts`:解读层、amend、member_kind 的 zod。类型同步到 `services/purposes.ts` 与客户端 `runtimeDataTypes.ts`。
- 新增 `services/eventsLedger.ts`(只读)、`services/purposeDrafting.ts`(骨架)。
- 路由:`PATCH /api/purposes/:purposeId`、`POST /:purposeId/redraft`;`POST /api/review/:cardId/rate` 焊成一笔并落 `card_reviewed`;`PUT /api/items/:itemId` 与 retire 落 `item_edited`;`POST /api/notes/:id/blocks` 与内容组四条写路落 `item_cited`。
- `RECORDED_ACTION_VERBS` 加 `purpose_amended`、`card_reviewed`、`item_cited`、`item_edited`;`EVENT_VERBS` 尾部加三词。

**证据**:`docs/audits/2026-11-02-establishment-1-builder/`
- `new-suite-full.txt`:新套件完整输出,文件头有标记;
- `full-suite-summary.txt`:全量统计与失败清单;
- `gates.txt`:两侧 tsc 与各检查的结果;
- `migration-rehearsal.txt`:迁移在 scratch 库副本上的演练。

**两侧 tsc**:0 / 0(服务端前提仍是 `shared/dist` 已构建)。

**测试清单**:
- 新套件 `establishment1Foundation.test.ts` 22/22:旧库重建守恒(COUNT、seq、sqlite_sequence、append-only)、新库跳过重建、note-purpose 触发器仍立与 410 墓碑、事务约定、原话逐字、人改落锁与机器 409、锁往返、status 翻转、路由校验与属主、redraft(桩)、锁赢过进行中的起草、成员三类与幂等、评分落账与三件同成同败、item_edited、item_cited 两条建块路与差集、账本读模块。
- 全量:见 `full-suite-summary.txt`,唯一的红是申报 1。

**改动的既有测试**(都是单内 D6 点名的):
- `v13EventsLedger.test.ts`:VERBS 副本加三词、夹具加 086 与最小 purposes 表、计数 25→28、标题改 twenty-eight。逐 token 等值闸没动,已通过。
- `v13ItemFloor.test.ts`:verb 序列在两个 `mounted` 后加两个 `item_edited`(该流程里确实改了一次、退休了一次)。

**申报项**:
1. **全量 1 红,既有**:agent-eval harness,同保真 1a 段 1 申报 1。
2. **单面未写明、我定的**:
   - **item_cited 差集按 `item_id`,不按单内写的成员 `existingIds`。** 按成员 id 差集时,同一 item 换一个成员行 id 再存会被算作新引用,就是灌水。测试有这一条。差集放在路由层,服务不穿 actor。
   - **内容组四条写路都发射**:POST、PUT `/:id`、PUT `/by-note/:noteId`、POST `/import-note-metadata`。后两条单内没点名,但它们走同一个整册替换,不发射就会漏账。
   - **item_ref 的两条建块路都发射**:`client_create_key` 路是 UI 实际走的。replay 不重复发射。
   - **评分 meta 比单内多**:加了 `before`、`scheduled_days`、`next_state`,理由是单内说这条流是重放 FSRS 的唯一原料、别省。
   - **人改解读时**:若卡上有 `draft_status`,同笔翻成 `ready`。否则人已写定,卡面还会显示 pending/failed。传 `null` 清字段。人不能写 `draft_status`、`drafted_by`、`revision` 这些记账字段。
   - **sealed 行翻 status 返回 409** `purpose_status_transition_forbidden`。其他字段照常可改。
   - **redraft 请求本身记一条人墨 `purpose_amended`**(trigger `redraft_requested`),落稿时再记一条 `agent:interpreter`。
3. **redraft 只是骨架**:默认 drafter `unconnectedPurposeDrafter` 直接抛错,卡翻 `failed`,**代码里不引 provider,所以不可能调到模型**。段 2 换成真接线。现在部署后点 redraft 必然 failed,段 3 前没有 UI 入口。
4. **服务重启后可能卡在 pending**:redraft 进行中服务重启,卡会留在 `pending`,本段没有恢复逻辑。可以再点一次 redraft 恢复。段 2 接导入起草时要一起考虑。
5. **`member_count` 与 traces 路由没做**:按单内分段归段 3。`addPurposeMember` 本段只有服务,没有公网路由,单内也没要求。
6. **迁移演练的射程**:走真实启动流程,在 scratch 库副本上从 085 升到 086,触发器、外键检查、完整性检查都正常(`migration-rehearsal.txt`)。**但那份库 events 是 0 行**,所以有数据时的守恒只由旧库夹具证明(054→081 的真实迁移加最小 companion 表)。没有在岛上数据的副本上演练过。
7. **`check:test-wiring` 仍红**:新套件未接 curated 脚本,同既有口径,未改 `package.json`。
8. **未碰**:`toolFace`、`effectClassification`、`fitness` 列、ContentGroupPanel/BoardList;统计页只读 `study_activity_log`,写入形状没变。零模型调用,未读 `.env`,未动依赖。

## Result（段 1 修复轮,builder 2026-11-02）

**执行状态**:2 major + 1 minor 全修,未提交。v13 两闸没动。

**逐条**:
| 项 | 修法 | 测试 |
|---|---|---|
| major 1 · import-note-metadata 灌人墨 | 该路恢复直调 `replaceNoteContentGroups`,搬运照做,不发射。搬运后的行成为差集基线 | `moving legacy metadata records nothing...`:导入零事件,重存零事件,真加新 item 只记那一条 |
| major 2 · cast 旁门漏账 | `POST /api/items/cast` 走 `runRecordedAction`,发 `item_cited`,meta `{via:'cast'}`,objects 含 item 与 content_group | `casting cites the item once...`:cast 记一条,紧接的组路全量替换(新成员 id)不重复,已被认领的 anchor 再 cast 被拒且不记账 |
| minor · 图标锁搁浅 pending | `setPurposeLock(true)` 同笔把已有的 `draft_status` 翻 `ready`,与人改落锁一致。卡上没有该键时不写 | 门控 drafter 测试扩成四臂(起草成功/失败 × 人改锁/图标锁);另加无起草时不写状态 |

**cast 触发方核查(墨色依据)**:
- 服务端:`castItem` 只有 `routes/items.ts` 一个调用方。`toolFace`、`mcp`、`agent` 对 `/items/cast` 零命中。
- 客户端:`castItemFromAnchors` 只有 `ContentGroupPanel.tsx` 的 `handleCast` 一处,挂在 Cast 按钮上,`created_by`/`claimed_by` 都写 `'human'`。
- 结论:没有导入或机器流能调到它,所以按人墨发。路由的 `created_by` 字段可由请求方填别的值,但我没拿它定墨色(`recordEvent` 契约禁自报身份),`actor_kind` 由路由盖章。

**证据**(`docs/audits/2026-11-02-establishment-1-builder/`):`fix-new-suite-full.txt`(文件头有标记)、`fix-full-suite-summary.txt`、`fix-gates.txt`。

**闸**:新套件 25/25;服务端全量见 `fix-full-suite-summary.txt`,唯一的红是既有 harness;两侧 tsc 0 / 0(服务端前提同前);secrets 过。

**申报项**:
1. **同类残口,没修,请你裁定**:`mergeEntityAndLegacyContentGroups`(`contentGroupRepository.ts`)。笔记已有部分 entity 行时不走自动导入,而是把 legacy 组合并进前端状态;用户下一次保存走 `PUT /by-note`,这些 legacy 成员就第一次落库,会被记成今天的人墨 `item_cited`。用户确实按了保存,但引用不是他这次做的。修它要让路由分辨「成员来自 legacy 合并」,比如前端做标记或服务端比对 note metadata,范围超出本轮。触发条件窄:同时有 entity 行和含 item 成员的 legacy metadata。代码读出来的,没有实测复现。
2. **其他写内容组的路径不发射**:直调 `upsertContentGroup` 的服务内流程(如 organized proposal 应用、Agent 路径)不走这些路由,所以不记 `item_cited`,且写入后成为基线。这符合「三个 verb 全是人门」,但意味着一个机器加的 item 之后被人留在组里,不会再记人墨。
3. **图标锁翻 `ready` 不区分原值**:`failed` 也翻 `ready`,与人改落锁一致。锁着时 redraft 本来就 409,解锁后卡面显示 `ready` 但解读可能是空的;要重新起草得手动点。
4. **单内 `by-note` 路的触发方也核过**:`saveContentGroupsForNote` 的调用方是 `useNoteCanvasDataAdapter` 的 `saveContentGroups` 和 `saveGalleryRecord`,都是用户保存动作,不是读触发。

## 段 1 复核判语(Main_Designer,2026-11-02)

**结论:段 1 通过(经一轮修复),收割入仓;段 2 即派。** 首轮对抗复核(10 agents)验真地基全部:迁移 086 守恒(seq 逐行拷贝+sqlite_sequence 高水位恢复+重跑无害)、28 词 verb 表与 schema.sql 逐 token 等值、触发器外科手术精准、rate 焊事务+user_id 旧洞补、append-only 原样;坐实 2 major+1 minor,修复轮全清并经独立核验(核验 agent 亲跑 25/25、v13 两闸 10/10、全量 1218/1217 唯一红=既有 harness)。

**裁定与定案**:
- **import-note-metadata 零发射**定案:该路是读触发的旧数据搬运,搬运照做、引用零入账,搬运行即差集基线——二性律守住(首轮 major 1);
- **cast 门人墨入账**定案:route 层 runRecordedAction,objects 形状与组路同构;独立审计确认无机器触达(server 仅 routes/items.ts,client 仅 ContentGroupPanel Cast 按钮;castBoardSticky 归 mounted 已在账不漏)(首轮 major 2);
- **图标锁同笔结算 draft_status**定案(pending/failed→ready,与人改翻法同构;四臂门控测试);
- **残口更正(重要)**:builder 修复轮申报 1 所述「混态笔记下次保存灌人墨」**不可达**——mergeEntityAndLegacyContentGroups 名为 merge 实为择一,有 entity 行时 legacy 组整体弃置不进保存载荷;**真残口=混态笔记上未导入的 legacy 组静默不可见、永不迁移**,属既有可见性债(该服务 HEAD 原样),⛔本单修,记 tech-debt;
- **防复燃记录两件**(不修,记档):①import 路由=零墨全量替换且不验载荷出身于 note.metadata,未来新调用方误用即静默写组+种基线;②迁移后 legacy metadata 键不剥离(stripLegacyContentGroupMetadata 零生产调用方),混态笔记永存——今后若有人恢复「legacy 合并进前端态」,人墨险即重开,动那块前先读本节。

**builder 自决四项终裁**:(a) item_id 差集(优于单面写法)、(b) 四写路全包+by-note 纳入、(c) 人改翻 ready、(d) 评分 meta 增 before/scheduled_days/next_state——全认。

**部署前置(未了)**:迁移 086 虽经夹具与零行真启动演练,部署前在岛库备份副本上实跑一次守恒核对(builder 段 1 申报建议,采)。

## Result（段 2 · 导入捕获,builder 2026-11-02）

**执行状态**:单内段 2 全部完工,未提交。全程桩 provider,零真实模型调用。全量回归 1 条红,为既有 harness。

**改动**:
- 新增 `services/purposeCapture.ts`:`capturePurposeForIntake`(自开事务,createPurpose + addPurposeMember + recordEvent 同笔)、`capturePurposeAfterIntake`(外层兜错)。
- `services/purposeDrafting.ts`:真接线 `createProviderPurposeDrafter`(`getProviderFromSettings` → `AIProvider.chat`,无工具,60 秒超时)、串行队列、启动恢复 `resumePurposeDrafts`;段 1 的占位 drafter 删除。
- `services/sourceFileIntake.ts`:新选项 `purposeCapture`,调用点在 `finishStoredSourceIntake` 开头(fresh 与 dedup 共用的收尾处,在 ready 翻转之后、zip 展开之前)和 `precheckSourceHash`(仅 `placement_created=true`)。
- `routes/sources.ts`:upload、precheck 各传自己的 channel 字面量。`index.ts`:启动恢复。

**证据**(`docs/audits/2026-11-02-establishment-1-builder/`):`seg2-capture-tests-full.txt`、`seg2-full-suite-summary.txt`、`seg2-gates.txt`,都带标记行。

**两侧 tsc**:0 / 0(服务端前提同前)。

**测试清单**:新套件 `establishment1Capture.test.ts`(逐条见证据),段 1 的 `establishment1Foundation.test.ts` 仍全过。全量结果见 `seg2-full-suite-summary.txt`。
- 功能 1:零 active 出卡、恰一领册且不发事件、多个开新卡、合并窗(窗内并入、archived 不吸、11 分钟过期、9 分钟仍在)、zip 一包一卡、library 与直传 Home 零卡零册、dedup 新 Project 捕获且重复不再开、precheck 只在建 placement 时捕获、rename 失败零残留。
- 数据:三件同成同败(成员和事件各注入一次失败),回滚后不排起草。
- 起草:桩跑通真实逻辑、无工具、只取已知字段、不可用回复翻 failed、挂起超时翻 failed 且队列不堵、一次一个。
- 恢复:pending 续跑,locked/ready/failed/人建卡不动。

**重启恢复方案(段 1 缺口)**:启动时 `resumePurposeDrafts` 把 `draft_status='pending'` 且未锁的卡重新排队,channel `startup:purpose-draft-resume`,trigger `resume`。失败翻 `failed`,所以不会每次重启都反复调模型。下次手动 redraft 也能自愈。

**申报项**:
1. **没有测到的一跳**:`configuredProvider`,即读用户 settings 再走 `getProviderFromSettings` 这一步。测试替换的正是这里,之后的 prompt、流读取、解析、写回都跑了真代码。这一步与 organized note 共用同一函数,但**真实模型的回复质量、prompt 效果完全没验过**,要等岛上首次真跑。
2. **单外加了测试硬闸**:`configuredProvider` 开头检查 `NODE_TEST_CONTEXT`,测试环境直接抛错。原因:既有测试会走 upload 路由,而解析凭据时可能读到本机存的真实 key,一个忘了桩的夹具就可能真调模型。这是生产代码里的测试分支,我认为值得,不同意可以改成别的隔离方式。
3. **捕获失败不阻塞导入**:文件已落盘时事务失败只打 warn,不返回错误。这样卡可能漏开,且 dedup 重传能补,precheck 路不能补(placement 已建)。单内只明确了起草失败不阻塞,这一条是我定的。
4. **我定的规则**:
   - **规则 a 排除 note-bound 旧 purpose**(`note_id IS NULL` 才算卡)。否则一个旧笔记魂会让导入错挂到退役对象上。
   - **合并窗只在「多个 active」时才起作用**:照单内顺序,恰一 active 走规则 a,哪怕是一周前的导入卡也领册。这意味着导入卡开出后,该 Project 后续导入都进这张卡,直到用户再建一张。窗口 10 分钟,未调整。
   - **防重开**:source 已在本 Project 任何状态的卡上就跳过,所以 dedup 路没有 placement 闸也不会反复开卡,已收纳的卡也不会被重传带回来。
   - **zip 的容器本身也入册**,卡名取 zip 名;失败的展开不影响已开的卡。
   - **事件 objects 含 source**,单内只写了 meta。
5. **起草串行**:所有用户共用一个进程内队列,一次一个,单次最长 60 秒。批量导入多个 Project 时后面的卡会等。
6. **起草结果语言**:prompt 要求跟随文件名语言。title 固定中文「研读《…》」,照单,英文界面下也是中文。
7. **未碰**:traces 路由、CourseDetail 卡面、文案,归段 3。`check:test-wiring` 同既有口径未改。
8. **部署前置未变**:迁移 086 仍需在岛库备份副本上跑一次守恒核对。本段没有新迁移。
