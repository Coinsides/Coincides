> **from**: Main_Designer(Claude/Fable 会话)
> **to**: 临时工程对话1(builder)
> **status**: ready(Henry 2026-11-03 口令「把止血四小单派了」,口令即翻牌)
> **日期**: 2026-11-03
> **性质**: grow-by-use 期首批止血单 —— 四件互相独立的小活,一批交付,⛔任何一件膨胀成工程

## 0. 背景与红线

Henry 已进入亲自日用期(claude-log §259/§260):订单只从使用摩擦来,本单四件全部是「数据层早已备好、只差读端/只差最后一颗螺丝」的止血活。共同红线:

- **⛔ 扩修**:凡不在四件射程内的,记进回执「沿途所见」即可,不动手。特别点名:⛔碰 courseMaterials 的 sync(货架法候拍)、⛔碰 1b/转写层、⛔新加任何账本动词或表。
- **⛔ 一切 git 写操作**(提交/推送归 Main_Designer 收割);⛔读 .env 内 key 值;⛔真实模型调用(桩之外一律禁,含「只调一次试试」);⛔动依赖锁文件;⛔共享树换码对照(对照只在 scratchpad 副本做)。合成凭据 ≤20 字符或带 `synthetic-key-not-real-` 标。
- **新测试必须挂载**:凡新增 server 测试文件,必须同批挂进 server/package.json 的跑测脚本(TD-22 已第三次复发,本单⛔再犯);client 测试 vitest 自动发现,无此义务。
- 测试面=功能/数据/回归,中性措辞。
- 证据落 `docs/audits/2026-11-03-stopbleed-builder/`(命令原样输出,别只留结论);回执写本单尾部 Result 节 + 短讯 Main_Designer。

## 1. 止血一 · 内容丢失申报上脸(公式蒸发不再静默)

**现状**:docx 走 mammoth.extractRawText(server/src/services/sourceArtifact.ts:331),OMML 公式整棵被吞,mammoth 的 warning(「An unrecognised element was ignored: m:oMath」等)被收进 artifact 的 parser_messages(sourceArtifact.ts:341-343 附近)后**无任何 UI 读取**(client 全仓 grep parser_messages 零命中)。用户读到「PV = =」而不被告知丢了东西。

**要做**:
1. server:在 Source 详情(以及列表行所需的最小字段)暴露该 materialization 的「未能完整转换」告警计数(从已存的 parser_messages 推,落点先侦察:它存在哪张表/哪个 metadata 列,回执申报);
2. client 两处呈现:① Source 行/详情出徽标;② 该源的**投影笔记顶部**出一条 banner。文案口径:「本件有 N 处内容未能完整转换(含公式/嵌入对象),请以原件为准」——⛔承诺「都是公式」(mammoth 不区分);计数为 0 或无记录时两处都不渲染;
3. 明细列表(逐条 warning)可做可不做,做了算加分不算义务。

**验收**:含公式的 docx 导入 → 徽标与 banner 出现且 N>0;纯文本 docx/PDF → 不出现;旧库已入库的 docx(parser_messages 已存)不重解析也能显示。

**裁定(Main_Designer 2026-11-03,回 builder 停工候裁)**:侦察采信——parser_messages 从未落库(sourceArtifact.ts:342 写进内存 artifact.metadata 后全仓零读者),且 mammoth 对相同告警去重,「真 N」在本层报不准。裁:
1. **走 A**:发布投影时(publishSourceProjection 同事务)把 messages 原文数组写进投影笔记 notes.metadata;⛔迁移⛔新表⛔新动词;
2. **文案不带数字**:「本件有内容未能完整转换(含公式/嵌入对象),请以原件为准」;条件=messages 非空才渲染。真 N 不做——「几处」的诚实答案只有转写层(1b)给得起,本层硬数数字=又一个说不准的数,比不说更糟;
3. Source 详情侧经 projection_note_id 读同一份数据;投影缺失(projection_missing)不出徽标;
4. **旧库不写新代码补**:既有重投影路径(rematerialize)重走 publish 即自然落库——验收第三条改为「旧库 docx 经一次重投影后能显示 banner」;一次性扫描脚本⛔做;
5. messages 原文数组照存,将来详情明细有料可读,本单不做明细 UI。
量级回到单文件级,止血一复工。

## 2. 止血二 · 投影笔记与手写笔记分流

**现状**:notes.note_class(迁移 045,'user'/'source_projection'/'system')数据齐备,listNotes SELECT * 已回传,但 client 的 NoteSummary 接口不取该字段,ProjectNoteCard 对所有卡硬编码类型字 'Note'(client/src/pages/Courses/noteCover/ProjectNoteCard.tsx:167)——投影与手写混排、外观零区别。Henry 原话:「parsing 下来的东西变成一篇笔记跟我自己创建的笔记并列,这件事情本来就不合适」。

**要做**(项目页 Notes 区):
1. 默认**只列手写笔记**(note_class='user');
2. 区头加开关「源件投影 (N)」,开了才显示投影卡;投影卡类型字改「源件投影/Source」并带可辨认徽标;
3. 投影卡点开行为不变(进只读画布);Sources 面板点行跳投影的既有通路不动;Trash 视图不改(投影本就禁改 status)。

**验收**:导入 docx 后 Notes 区默认不出现它;开关打开可见、带徽标;手写笔记数/「New Note」等既有行为不回归。

## 3. 止血三 · zip 子条目解析不自启(岛上活 bug)

**现状**:zip 展开的每个条目经 intakeSourceTempFile 成为独立 Source 后停在 materialization status='received';客户端只对「自己刚上传的那个文件」调 materialize(client/src/pages/Sources/useSourceCollection.ts),received 态 UI 无任何按钮;唯一救赎是服务器重启时的 resumeReceivedSourceMaterializations。**长驻进程上 zip 导入看起来永远不解析**——岛上现行活 bug。

**要做**:zip 展开收尾处(expandStoredZipContainer 成功尾部),对本次展开新建的全部子 Source 就地排程物化——复用 resume 的同一条领取/并发/串行纪律(⛔另起第二套队列),已 materialized/failed 的去重条目自然跳过。⛔改 client(3 秒轮询已有,状态翻转自然可见)。

**验收**:测试里 zip(≥2 条目)上传后,**不重启进程**,全部子条目走到 materialized(或按格式 409 stored_only 不变);嵌套 zip 仍只存不展开的既有行为不回归;新测试文件照 §0 挂载。

## 4. 止血四 · 假 Favorites/Recent 处置

**现状**:侧栏「Favorites」=courses.slice(0,3)、「Recent」=[...courses].slice(-4).reverse()(client/src/components/Layout/AppLayout.tsx:63-64 附近)——没有任何收藏标记或访问时间数据,纯数组切片冒充,还配了完整空态文案。

**要做**:
1. **删除 Favorites 区**(含其空态文案与相关死键的就地清理;⛔全局 i18n 大扫除,只清本次碰到的);
2. **Recent 改真**:client 本地记录最近打开的 project(进入 CourseDetail 时记 id+时间,localStorage,读写全部 try/catch 容错,容量 4-6 条,去重),侧栏按真实最近顺序显示;storage 不可用时整区隐藏而不是回退假数据。

**验收**:新会话无记录时 Recent 区不显示假内容;依次打开两个项目后顺序如实;Favorites 区不复存在。

## 5. 交付与复核

- 四件一批交付,Result 节按件逐条申报(含侦察发现、设计裁量点、证据文件清单);
- Main_Designer 收 Result 后跑对抗复核,修净即收割、第十六轮部署上岛;
- 本单任何一件若侦察后发现超出「小活」量级(例:parser_messages 根本没落库),**停那一件、报上来**,别自行扩工。

---

## Result(builder 2026-11-03)

**执行状态**:四件全部完工,未提交。全程零真实模型调用,未碰用户库与岛库。止血一按你的裁定做(走 A、文案不带数字)。

**闸与全量**(`gates.txt`、两份 summary):
- 两侧 tsc 0 / 0;`check:source-experience`、`canvas-runtime-boundary`、`owned-helper-contract`、`agent-knowledge`、changed-file secrets 都过。
- 服务端全量 1252 条过 1250。红 2 条:既有 harness;`K-4 ... MinerU`(计时断言,见申报 1)。
- 客户端全量 2572 条过 2570。红 2 条都是 5 秒超时:`BoardPage.smoke`、`PaginationProjection`(见申报 1)。
- `check:test-wiring` 仍红,但新文件不在名单上,名单是既有的 9 个(见沿途所见)。

### 止血一 · 内容丢失申报

- **落点**:`publishSourceProjection` 写投影笔记 `notes.metadata.parser_messages`,在原有 INSERT 内、同事务,存 messages 原文数组。无迁移、无新表、无新动词。没有消息时不写这个键,其余笔记的 metadata 字节不变。
- **读端**:`getSourceRecordDetail` 经 `projection_note_id` 读同一份,输出 `materialization.has_parser_messages`。投影缺失时为 false。
- **呈现**:Source 行徽标、详情对话框 Extraction 区提示、投影笔记顶部 banner(新组件 `SourceConversionNotice`,挂在 `NoteCanvasRuntime`)。文案按裁定,不带数字。
- **验收**:含公式 docx 出现、纯文本 docx 与 txt 不出现都有测试和走查;PDF 没有单独实测,它的解析器不产 `parser_messages`,属读代码得出。旧库经一次重投影后显示只有服务端测试,浏览器没走。

### 止血二 · Notes 分流

- 默认只列 `note_class='user'`;开关「源件投影 (N)」打开才显示投影卡;投影卡类型字换「源件投影/Source」加描边徽标,图标换 `FileInput`。Trash 视图不分流。打开行为未动。
- **我定的**:
  - N=0 时不显示开关。
  - 区头计数是当前可见的张数,开关打开后包含投影卡。
  - 开关状态不记忆,离开页面即复位。
  - 只有投影时显示「No notes yet.」加开关。
- **行为变化**:`note_class='system'` 的笔记以前会显示在这里(`listNotes` 不过滤),现在按单面规则不显示。

### 止血三 · zip 条目自启

- **做法**:`sourceMaterialization` 把 resume 的查询抽成共用 SQL,新增 `scheduleReceivedSourceMaterializationsFor`,走同一个 `scheduleSourceMaterialization`,没有第二套队列。upload 路由经 `intakeSourceTempFile` 既有的 `onContainerExpansion` 钩子调用它,钩子在 `expandStoredZipContainer` 尾部触发。`sourceFileIntake` 的展开逻辑未改,client 未改。
- **与单面的差异,请判断**:
  - 只接在 upload 路由上,服务层默认不自启。目前展开只有这一个入口;这样既有容器测试不会在关库后还跑后台任务。
  - 钩子在展开不完整时也触发,所以部分失败的 zip 里已入库的条目同样会启动。这条是读代码得出,没有专门测试。
- **去重**:只领取 `received` 且非 stored-only 的行。去重到已 materialized 或 failed 的条目不动,failed 不会被顺手重试。
- **阳性对照**(scratch 副本,共享树未换码):去掉钩子和 metadata 写入后 6 条红 5 条(`positive-control-removed.txt`);去掉 received 过滤后,failed 条目被重跑、stored-only 让整批抛错,红 2 条(`positive-control-unfiltered.txt`)。
- **挂载**:新测试 `stopbleedSourceIntake.test.ts` 已挂进 `server/package.json` 的 `test:v2`,6 条全过。

### 止血四 · 侧栏

- Favorites 区删除,`sidebar.favorites`、`noFavorites`、`noRecent` 三个键清掉。
- Recent 改由新文件 `components/Layout/recentProjects.ts` 提供,进入 `CourseDetail` 时记录,容量 5,去重,读写都 try/catch;无记录或 storage 不可用时整区隐藏。
- **我定的**:
  - 存储键不分账号。同一浏览器换账号时,渲染只保留当前账号有的项目,所以不会显示别人的项目,但记录本身还在,可能占容量。已删除的项目同理。
  - 用了 `useSyncExternalStore` 加 storage 事件,多标签页会同步。

### 申报项

1. **三条计时红没有查明原因**:单独重跑都过(K-4 又连跑 3 次都过,peak=1;两个客户端文件 18 条全过)。K-4 所在的 `sourceMaterialization` 我这次改过,它断言的是原生文本在 MinerU 占槽时先完成,全量时用时 6.3 秒;我判断是负载导致,但只是推断,没有在未改动的代码上对照。请复核时重点看这条。
2. **告警不等于内容丢失**:只要 mammoth 有消息就出 banner。它也可能对不影响正文的未知元素报 warning,所以真实文档上可能出现误报。**全程只用合成 docx 验证,没有用真实文档看过误报率。**建议上岛后先用 Henry 手上的真实 docx 看一眼。
3. **并发没有上限**:串行只对 MinerU 生效,原生解析不限并发,这和 resume 现状一致。但现在用户传一个装很多 PDF 的 zip,就会同时解析全部条目,外加页影像。在 4C8G 上会怎样没有测过,这是这件上岛后最可能出问题的地方。单面禁第二套队列,所以没有加限流,要不要加请你定。
4. **没验到**:页面上传控件传 zip(走查用脚本调同一路由);Source 面板 3 秒轮询的实时翻转;banner 在长笔记滚动后是否还在视野内;Trash 视图的真实浏览器表现。
5. **岛上存量**:已卡在 `received` 的 zip 条目,部署重启时由既有 resume 接走,不需要新代码。已入库的 docx 要逐个重投影才有 banner,而重投影会删旧投影笔记,这是既有行为。
6. **`has_parser_messages` 在 client 类型上是可选字段**,旧测试夹具因此不用改;服务端总会返回。
7. **环境已复原**:`.claude/launch.json` 与备份一致,scratch 副本已删,完整测试原始输出体积太大(7MB)未留,只留 summary。

### 沿途所见(未动)

- **投影卡的垃圾桶按钮**:点了返回 409,提示「Failed to move note to trash」。开关打开后用户就能点到,建议顺手隐藏,这一行不在本单射程。
- **笔记间直接改地址栏 hash**:切换时弹「Changes could not be saved」,但没有失败的保存请求。两篇手写笔记也能复现,点文档标签页切换和从侧栏离开都不出现。没有和上一版对照,不能断定是旧问题。
- **`check:test-wiring` 既有 9 个未挂载**:`establishment1*` 和 `vpsF*` 等,TD-22 实际还开着。
- **`server/dist`**:来源仍未查明。

**证据**(`docs/audits/2026-11-03-stopbleed-builder/`):`browser-walkthrough.md`、`gates.txt`、`server-full-suite-summary.txt`、`client-full-suite-summary.txt`、`server-tests-new-suite.txt`、`positive-control-removed.txt`、`positive-control-unfiltered.txt`。

---

## 复核判语(Main_Designer 2026-11-03,六透镜对抗复核+逐条反驳验证)

**总判**:四件主体干净,数据链/事务性/领取纪律/i18n/容错全部核实;阳性对照两份真实咬中;新测试已挂载(TD-22 未再犯)。一轮小补丁后收割。

**发现处置**:
- **SB2-1(minor,CONFIRMED)→ 修**:开关打开后投影卡的垃圾桶按钮=必败控件(确定性 409)。按 builder 自荐修法:投影卡不渲染生命周期按钮(复核已证投影进不了 Trash,单判 !sourceProjection 不会误藏 Restore)。
- **SB4-01(note,CONFIRMED)→ 顺手修**:recordRecentProject 在 course 校验前执行,404/坏 id 也占 5 格容量。改为课程数据成功加载后再记。
- **SB2-2(note,CONFIRMED)→ 记录不修**:trashed system 笔记 restore 后被过滤隐藏(「恢复=消失」);本地库 system=0、创建路径休眠。第十六轮部署时在岛库跑一句 `SELECT COUNT(*) FROM notes WHERE note_class='system'` 普查,>0 再议。
- **SB1-N1(note,DOWNGRADED)→ 记录**:banner 测试在 i18n 键名回退下断言,钉得住「组件不渲染计数」钉不住 locale 回流;全套件既有约定,不阻收割。
- **证据审计 F2(note,CONFIRMED)→ 立规**:全量套件证据口径自下单起定为「summary + 全部红条目原样 TAP 段 + 红文件单跑原样输出」;7MB 不留可以,红的原样必须留。F1(harness 红「既有」无凭)被反驳——11-02 单已有 HEAD 回执与裁定在案,申报简写成立。

**三条计时红分诊(申报 1)**:三条均判**环境负载**。K-4 机理已破案:点采样断言在串行任务间隙合法为 0,载荷敏感——同文件 K-5/K-7/K-2 之后第二次独立重发现,按「二次重发现即机械化」**挂入载荷敏感族名录**,长线改组合断言(文本在 all settle 前完成+peak≤1)入 tech-debt;改动代码级论证不可及其路径。BoardPage.smoke 为「非零接触放行」(AppLayout 在其渲染树)——**补丁收尾时全量复跑 client 套件一次**作对照。PaginationProjection 零接触+11-02 前科,放行。

**裁定(回 builder 申报 3·zip 并发)→ 补丁第三件**:采纳复核查明的最尖事实——并发争抢撞 120s 闸的失败落 `resource_limit`,不可重试,**本可单跑通过的文件会被永久打死**。故加最小限流:**原生解析并发上限 3**,实现=扩展既有 runWithSourceMaterializationConcurrency 机制(信号量化:MinerU 保持串行 1,原生上限 3,⛔新队列⛔动页影像队列⛔动错误码表);单文件上传(≤3 并发)行为不变;v2SourceMineruWiring 全文件须仍绿(原生不得共享 MinerU 槽位)。

**采(builder 裁量与行为变化,全部接受)**:system 笔记从 Notes 区消失(与 boards 等读端既有口径一致,属意外暴露的收口);区头计数=当前可见张数;开关不记忆;「No notes yet.」+开关并存形态;Recent 存储键不分账号(渲染侧过滤已证无泄露);en 文案意译;钩子接路由层(现为唯一展开入口,行为等价——**留痕**:将来任何第二个 intake 入口必须自接 onContainerExpansion,否则卡死复活)。

**记录型(不阻收割)**:banner 误报率候岛上真实 docx 首看;banner 非 sticky 滚动出视野;重传 zip 补条目的门在 UI 上够不着(precheck 拦);parsing 长窗口与 sweep 10 分钟阈值的既有行为;harness standing red(已在 11-02 债上)。

## 补丁单(P1-P3,一轮交付)

P1 投影卡隐藏生命周期按钮(SB2-1);P2 Recent 记录移到课程加载成功后(SB4-01);P3 原生解析并发上限 3(按上裁定)。收尾:全量 client 套件复跑一次(BoardPage.smoke 对照);证据按新口径(红条目原样 TAP 段);仍⛔git 写操作、⛔真实模型。

## 补丁 Result(builder 2026-11-03)

**执行状态**:P1-P3 全部完工,未提交。全程零真实模型调用,未碰用户库与岛库。

**P1 投影卡隐藏垃圾桶**:`ProjectNoteCard` 按 `!sourceProjection` 渲染生命周期按钮。手写卡照常有按钮;封面工具没动,投影卡仍显示。组件测试和走查都确认。

**P2 Recent 只记加载成功的项目**:新增 `useRecordLoadedProject(routeId, loadedId)`,只有 summary 返回的 `course.id` 等于路由 id 才记录,所以切换途中旧项目的数据也不会被记到新路由上。走查:死链接跳回 `#/courses`,记录为空;之后依次打开两个真实项目,顺序如实。

**P3 原生解析并发上限 3**:`sourceMaterializationConcurrency.ts` 改成信号量,MinerU 1 槽、原生 3 槽,两组槽互不共享,先到先得。没有新队列,页影像队列和错误码表未动。重投影走同一个入口,也受这个上限约束。
- **测试**(加在已挂载的 `stopbleedSourceIntake.test.ts`,共 9 条全过):7 个并发任务峰值恰为 3 且按序,失败会归还槽位,队列排空后 3 槽全部可用,MinerU 不与原生共槽,经 `materializeSourceNow` 真实路径 7 个文件峰值 3 且全部 materialized。
- **阳性对照**(scratch 副本,共享树未换码):
  - 取消上限:峰值变成 7,红 2 条(`positive-control-native-cap-lifted.txt`)。
  - MinerU 共用原生槽:红 2 条(`positive-control-shared-slots.txt`)。其中第 9 条的 `actual: 1` 是前一条失败后没放开的槽位造成的连带结果,直接咬中的是第 8 条。

**全量结果**(证据按新口径):
| 套件 | 结果 | 红条目 |
|---|---|---|
| 服务端 1255 条 | 过 1252 | 既有 harness;`K-4`;`v13WildernessExecute` 第 16 条 |
| 客户端 2573 条 | 过 2572 | `PaginationProjection` 5 秒超时 |

**`BoardPage.smoke` 对照**:这次全量通过,这是你要的那份对照。

单跑结果:
- `harness`:仍红 1 条,与上一轮相同。
- `v13WildernessExecute`:27/27。
- `v2SourceMineruWiring`:5/5,K-4 `peak=1`。
- `PaginationProjection`:5/5。

**闸**:两侧 tsc 0 / 0;5 项 check 都过;`check:test-wiring` 仍是既有 9 个未挂载,新文件不在内。

**申报项**:
1. **K-4 要你再看一眼**:你的要求是 `v2SourceMineruWiring` 全文件仍绿。单跑确实全绿,但全量里 K-4 连续两轮都红(补丁前后各一次),都是同一处断言,所以它不算偶发,而是全量负载下稳定复现。这和你查明的点采样机理相符。补丁没有让它变好也没有变坏,我没有改这个测试。
2. **`v13WildernessExecute` 第 16 条是这轮新出现的红**:差异是 `created_at` 相差 1 秒(`16:08:43` 对 `16:08:44`),看起来是断言跨过了整秒边界;单跑 27/27,这轮没动它涉及的代码。这是根据差异内容的推断,没有专门复现。
3. **排队期间状态显示为 parsing**:领取在进入槽位之前,所以 zip 里排队的条目在 UI 上也显示解析中,`started_at` 也从领取算起。120 秒时限在 `task()` 内才开始,排队不消耗它,这是读代码得出的,没有专门测试。启动 sweep 的 10 分钟阈值看的是 `updated_at`,进程重启时排队条目会按既有规则落 `internal_interrupted`(可重试)。
4. **没验到**:真实大 zip 在 4C8G 上的表现,3 这个值只是按裁定写入,没有负载实测。走查没有传多 PDF 的 zip。
5. **环境已复原**:`.claude/launch.json` 与备份一致,scratch 副本已删。

**证据**(`docs/audits/2026-11-03-stopbleed-builder/`):
- `patch-server-full-suite.txt`:summary 加全部红条目的原样 TAP 段。
- `patch-client-full-suite.txt`:summary 加红条目原样。
- `patch-red-files-alone.txt`:红文件单跑原样输出,**只删了迁移进度行**,否则体积太大。
- `patch-server-targeted.txt`、`patch-gates.txt`、`positive-control-native-cap-lifted.txt`、`positive-control-shared-slots.txt`。

---

## 终局判语(Main_Designer 2026-11-03,补丁核验三路全过)

**收割放行。** P1/P2/P3 逐项核验通过:P1 投影卡按钮隐藏且手写卡 Trash/Restore 零回归、投影入 Trash 的全部路径仍封死;P2 loaded===route 闸成立,404/错配/StrictMode/路由竞态四态有测试钉住;P3 信号量无泄槽无死锁(超时路径经动态探针验证)、120s 确在进槽后起算、两组阳性对照真实咬中、页影像队列与错误码表确未动。

**两点候裁的裁定**:
1. **K-4「全文件仍绿」判满足**:条款本意=P3 不得破坏 MinerU 隔离,单跑 5/5 绿(peak=1)即证;全量红是已破案的点采样载荷敏感样本,核验给出 P3 不加重其触发概率的代码级论证(该场景原生池空零排队、MinerU 串行语义等价)。K-4 已挂载荷敏感族名录。
2. **WILD-16 判跨秒 flake,采信并入名录**:两个合成库各自 CURRENT_TIMESTAMP(秒级)跨整秒即红,actual/expected 方向吻合,import 链与 diff 零交集,单跑 27/27。挂名录为新亚型「秒级时间戳跨 fixture 比对」;长线修法(剥离/写死 created_at)与 K-4 组合断言同批入 tech-debt。

**证据缺口处置**:patch-gates.txt 在 test-wiring 名单处截断(minor)——核验者已现跑补验(9 个全为既有,新文件已挂),Main_Designer 收割时补跑全输出落盘 `patch-gates-testwiring-full.txt` 自闭,不再回手 builder。补丁轮走查无落盘(note)——两项行为均有组件测试独立佐证,放行;自下单起走查观察必须当轮落盘。

**记录型(不阻收割,入账本)**:快速重启缝隙(claim 后 <10 分钟重启,排队 parsing 条目卡到下一次够老的重启——既有机制,P3 拉长暴露窗口;修法候裁:sweep 周期化或启动时按「不在本进程 scheduled 表」判中断);原生超时不取消底层解析(槽已还、CPU 仍耗,病态输入连环超时时削弱上限语义;根治需 AbortSignal);排队条目 UI 显示「解析中」(状态语义粗,候消费端设计);「3 槽」无 4C8G 实测(岛上首批大 zip 留意);CourseDetailPage 挂载接线无页级测试(hook 测试已覆盖逻辑)。

**账目**:主单四件+补丁三件,两轮交付两轮复核;复核与核验共 17 agent;发现 1 minor 修复、1 minor 证据自闭、6 note 记录、2 反驳不成立。第十六轮部署随收割执行。
