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

## Result(builder 回执区,候填)
