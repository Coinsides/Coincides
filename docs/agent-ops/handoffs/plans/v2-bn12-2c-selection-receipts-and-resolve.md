> **状态 (Status)**: draft(Fable 设计稿;Opus 拆单前先读)
> **层 (Layer)**: 计划 / Plan(12.2c)
> **日期 (Updated)**: 2026-08-26
> **权威 (Authoritative)**: 否(拆单依据;裁定以 selection 设计 v1 与本文「裁定」段为准)

# V2.BN.12.2c:选区收据(值,不是行)+ `resolve_selection`(只读解析)

## 0. 一句话

用户圈的东西要能被 Agent 指着说「这个」。12.2c 把客户端已有的 `SelectionDraftV1` 投影为可传递的 `SelectionReceiptV1`(纯值、零几何、零新表),并给工具面加第一个**只读解析工具** `resolve_selection`:收据进,当前对象身份出——机械、零模型。

## 1. 继承与核实(只指针)

- selection 设计 **v1**(2026-08-24 拍板,同名文件):零几何 / receipt 非第四态 / 不动锚池 / 晋升推迟——四条裁定的理由与码上实证都在核实报告 `analysis/2026-08-24-selection-receipt-precheck.md`,不重述。
- 12.2a/12.2b 既有:注册表→manifest→parity→收据轴→`/api/mcp` seam;`list_notes` 为只读工具先例。
- 测试档:**P0–P3(Henry 2026-08-24 亲拍,log 08-24 #1)**;略过的测试记 `current-state/deferred-tests.md`。

## 2. 裁定(拍死)

1. **收据是值,不是行**:不建表、不动 `item_anchors` pool、不碰九处 `content_group` 硬编码。`SelectionReceiptV1` 由投影函数按需产出;唯一持久化=作为工具入参随既有收据轴 `metadata.intended_input` 落盘(零新机关)。
2. **零几何**:身份 = `refs`(owner 三元组)+ `text_ranges`(offsets+excerpt)+ `at` + 信封 `note_id`;`anchorRect` 不入收据。
3. **receipt 不是 draft 的第四态**:`SelectionDraftPhase` 枚举与 8 个既有消费者一字不动;receipt=导出的不可变快照,改选=重新投影。
4. **`resolve_selection` 是只读工具**(**08-24 晚订正,原文「不写收据」作废**——先例方向引反了:transport 对一切工具无条件写收据,`list_notes` 即写 `applied`/`immediate` 收据且被 K-0 锁死。「只读」的真义=**不改真相层**,不是「不留痕迹」;收据轴是**审计轴**,读操作留审计痕迹恰恰是对的):K-8 = **验合规不验缺席**——①调用后 `notes`/`note_blocks` 逐字段不变(真·只读);②收据形状与 `list_notes` 一致(`applied`/`immediate`/`metadata.tool`)。解析按 range 逐条:`found` / `missing` / `text_drifted`(excerpt 与当前文本严格字符串比对,机械);非本用户 ref 拒绝形状=逐条 `missing`(§3.1 B)。
5. **锚池/晋升整体推迟**(设计 v1 §3/§4):ownership 验证源重设计 + 静默 SQL 字面量修理是设计级工程,与工具面主线无关;「圈选→锚」「保存为标记」触发不做。
6. **测试按 P0–P3**:常驻套件 + 先红后绿 + `resolve_selection` 的**最小 ownership 正控一条**(B 用户携 A 的 ref → 按 c-2 拍死的拒绝形状断言);不扩输入矩阵——略过的矩阵由拆单方记台账。

## 3. 范围(前置核实 ×1 + 两单串行 + 旅程)

| 步 | 交付物 | 归属 |
|---|---|---|
| **c-0 前置核实** | server 侧按 owner 三元组(block/textFlow/textUnit)查**存在性与归属**的现实路径:表结构、note→user 链、excerpt 所需当前文本在 server 侧的重建可行性;结论回我点名。**有类型 ≠ 有查询路——先核后点名**(b-1 同法)。 | Opus(读码)→ Fable 点名 |
| **c-1 客户端投影** | shared 类型 `SelectionReceiptV1` + `selectionDraftToReceipt()`(消费既有 `SelectionDraftV1`,复用零长度守卫)+ 导出口(供工具入参侧取当前选区收据)+ 单测(投影正确/不可变/**无几何字段**为断言)。⛔ 不动 `SelectionDraftV1`/phase 枚举/8 个既有消费者。可与 c-0 并行。 | builder 5.6 |
| **c-2 `resolve_selection`** | 注册表条目(真 zod `.strict()`;`truth:'content'`;只读 tier 同 `list_notes`;`exposure:'public'`)+ binding + 解析 service(新 `server/src/services/selectionResolve.ts`,名字以 c-0 后点名为准)+ manifest 重生成 + parity 正控 + 真实 `/api/mcp` 端到端。**c-0 结论未回不发此单。** | builder 5.6 |
| **c-3 旅程(段收口)** | 预期先冻结:圈一段文字 → 投影收据 → 经 MCP `resolve_selection` → 身份齐;改该段文字 → `text_drifted`;删 block → `missing`;B 用户携 A 的 ref → 拒绝形状。四步全 2 分才铸段。 | Opus 实走 |

## 3.1 裁定补记(2026-08-24,c-0 后;核实依据 `analysis/2026-08-24-c0-resolve-selection-server-paths.md`)

- **A(deleted unit 的归态)**:被标 `deleted` 的 unit = **`missing`**。理由:既有投影约定(`status !== 'deleted'` 过滤)就是「什么存在」的权威;`text_drifted` 只留给「位置还在、文本变了」。不发明第四态。
- **B(拒绝形状)**:**逐条 `missing`**,foreign 与 nonexistent 折叠不可区分(同 `trashNoteAsUser` 先例);整体 4xx 只用于入参本身坏(zod 不过)。**硬约束原样入 c-2 单:⛔ 任何时候不得把 `missing` 细分出 `forbidden`/`not_owned` 类值——那会泄露他人对象存在性。**
- **C(textFlowId 去留)**:**保留**(守 12.2 §2.1 已拍语汇 + 与 `annotation_ranges` 同构),但**不许「带着不用」**(那是静默字面量的镜像):resolve 做一致性校验,不一致 → 该 ref = `missing`(折叠,不泄露、不整单炸)。(08-24 深夜:校验函数的取法经 §3.2 A1′ 修订——改用 server 侧契约锁定实现,原「必须 import 同一个函数」句让位于 A1′。)
- **D(解析约定共用)**:**零语义提取**——把 `items.ts` `textFlowProjection` 内「什么算一个有效 unit」的解析/过滤约定提为共享 server 模块,`textFlowProjection` 与 resolve service **同源 import**(S1a 形状:提取共用,不复制;反 TD-15)。killer 同 b-1:既有投影字节等价 / 提取非复制。**§5 边界据此修订**:`server/src/services/items.ts` 允许**仅此一个 hunk**(解析约定外提 + import 回接),其余仍禁区。
- **c-0 能力缺口记实**:unit 级存在性验证是全新能力(现有 `verifyAnchorTarget` 只到 block 粒度),c-2 单里不得写「复用既有 unit 校验」之类措辞。
- **权限面**:归属由 block 行一步解决(`user_id` 同行),unit 层零权限逻辑——c-2 的 ownership 正控一条打在 block 查询上即可(P0–P3 档下的最小正控)。

## 3.2 裁定补记 2(2026-08-24 晚,c-2 首派停手后;builder 报两处允许面内不可达,复验成立)

- **A(textFlowId 同源):裁 A1 下沉 `shared/`**。c-0 报告「全仓 5 产地同一函数」漏了侧位——11 处命中全在 client,server 因 `rootDir` 无法 import ⇒ C 裁定在原允许面内不可达。修法:新增机械小单 **c-1b**:`textFlowIdForBlock` 移入 `shared/`(与 `SelectionReceiptV1` 同理:跨端身份约定住 shared),回接全部 client 调用点(纯 import 改道,零语义),killer=既有测试全绿+行为逐字节不变;c-2 自 shared import,C 裁定原文继续成立。**不采 A2**(行为锁替身份锁=C 裁定自废)、**不采 A3**(字段在没人用=C 裁定点名要防的形状)。
- **A1′(08-24 深夜,依据 b-0 现物翻案;原 A1 保留在上供对照)**:b-0 揭示 A1 真实价格=一次构建体系重设计——①`tsc` 不改写 import 说明符,`@shared/*` 在 dev(jiti)与产物(裸 Node)两个世界 `ERR_MODULE_NOT_FOUND`;②相对路径在产物世界指向不存在的源码路径;③唯一让三个世界一致的是「shared 变真包」(代价最大);④且 **server↔shared 类型只(type-only)是 `manifest.ts` 顶注成文的既有设计决定**(`@ts-ignore TS6305`)。⇒ 翻案为 **A1′**:shared 源码仍是唯一真相,client 半按原样(沉 shared + 调用点回接,打包器读源码不受影响);**server 侧在 §3.1 D 共享解析模块内本地实现同名函数**;**常驻跨界契约测试**锁「server 本地 ≡ shared canon」——tests 世界(tsx)可同时 import 两侧,代表性输入全等 + killer(改 server 侧拼法 ⇒ 契约测试须红);测试内 shared import 按 `manifest.ts` 成文的 `@ts-ignore TS6305` 模式,门仍拒则停手上报。**原则未变(同源优先),变的是同源的执行点**:从 import 链移到常驻契约测试,因为 import 链的价格是构建体系重设计,而本函数是 2 行模板字面量。c-2 的 C 裁定校验改用 server 侧函数(保真由契约测试锁定)。构建体系(通电已声明的 references / shared 变真包)记 TD,触发器=第一个**非平凡**运行时值需要真共享,b-0 报告为届时设计输入。
- **B(只读语义)**:见 §2 裁定 4 订正(同步改,宣布与正文一致)。
- **复核批次**:c-1b 为机械单,其复核可并入 c-2 复核同一轮(位点分列),省一轮往返——调度方执行。
- **责任记实**:A 的根=c-0 漏「哪一侧」+ 我 C 裁定点名函数时未核侧位;B 的根=调度方引先例未开先例 + 我计划裁定 4 同句自相矛盾(「不写收据」与「收据行为同 list_notes」并存)。两案并入自律卡「点名机关先核」分则的扩写(存在+方向+侧位)。

## 4. 不做

不建 selection 表;不动 pool 九处;不做几何;不做跨 note 选区;不做选区历史 UI;不做锚晋升;12.4 手势产出同形收据(形状定于此,面在 12.4 接);客户端「把收据递给 Agent 面板」的 UI 打磨归 12.2d/12.4,c-1 只交导出口。

> ⚠️ **更正(Fable 裁,2026-08-26)**:上句「归 12.2d」**作废** —— **12.2d = S6(独立待处理队列 + 旧 `ProposalList.tsx` 退场)**,不是这件。
> **「把选区收据递给 Agent 面板」推迟,不进 V12**:它的消费者是「在应用内对话的 Agent」,属 **Agent 版**;按**纪元隔离**(router / 对话面全家桶一件不进 V12)与「形状勿跑能力前」两条,本版不建。
> ⛔ **连接口预留位都不留**(辩论 J 板块家法)。**触发器 = Agent 版启动时**。c-1 交付的导出口(`selectionDraftToReceipt`)保持现状:**已存在、零产品消费者**,这是如实状态,不是缺口。

## 5. 触及面预估

`shared/types/**`(+1 或并入既有)· client 投影新模块 + 单测(`selectionDraftService.ts` 旁,不改它)· **c-1b:`shared/` 新 textFlow 派生模块 + client 全部调用点 import 改道 + server 侧本地实现 + 跨界契约测试(§3.2 A1′)** · `server/src/toolFace/registry.ts`(+1 条)· `server/src/mcp/bindings.ts`(+1)· 新 resolve service · 新共享解析模块(§3.1 D 外提物)· `docs/generated/tool-face-manifest.json` 重生成 · 常驻测试。`server/src/services/items.ts`:**仅允许 §3.1 D 点名的一个 hunk**(解析约定外提 + import 回接,零语义),其余部位禁区。**不碰**:schema/migration、selection 既有消费者、transport 骨架 Host/Origin/auth 段、协议文件。

## 6. 给 Opus 的拆单注记

- c-0 没回来不发 c-2;c-1 可先行(纯客户端)。
- 每单写死:P0–P3 档 + 略过测试记台账 + 零语义(既有 selection 服务一字不动)+ 写 Result 不需确认 + 验不了就停的机械判定(先跑此命令贴输出)+ `.run()` 实参侧禁区 + ⛔ 不碰 `docs/agent-ops` 协议文件(工单自身 `## Result` 除外)。
- Spark 不适合本段(两单都挨接缝)。
- 绝对量词发单前先对允许面过一遍(不可能条款,三先例在案)。
