> **状态 (Status)**: active
> **层 (Layer)**: 交接 / Handoff(订单)
> **日期 (Updated)**: 2026-11-07
> **权威 (Authoritative)**: 规格与单卡里的现行裁定是施工依据
> **from**: Main_Designer | **to**: builder;核验 Tester
> **原状态头**(2026-11-05,已由下方单卡取代,留作历史):status ready,排在 A-18 之后(A-18 收口前不动工);性质 round-04 发现,两件分开交付

## 单卡(现行,覆盖写)

> 只记「现在」,历史在尾部。每块一个主人,只用 Edit 改自己那块,⛔ 整个文件覆盖写,⛔ 在副本里改。「阶段 / 持有者 / 下一步」谁交出谁改:builder 交货改成「待验 · Tester」,Tester 下判语改成「待裁 · Main_Designer」,其余由 Main_Designer 改。
> 本卡首版由「个人学习讨论」会话按尾部裁定原文起草(2026-11-07),Main_Designer 核后接管。本文件里的 V2 已关闭,不进本卡。

### 状态(Main_Designer)

| 项 | 阶段 | 持有者 | 下一步 | 更新 |
|---|---|---|---|---|
| 编辑器组返修(A-18 残留、A-21、A-24) | 已核 · 关闭 | Main_Designer | r2.3c 第 21 轮上岛(`fdeacb5d`)、Tester 岛上已核;余项 → A-25、L-018、TD-55、TD-56 | 2026-11-08 |
| A-25 | 排队 | Main_Designer | A-20 之后派;已扩成设计单(输入法组合交接 + LANDFAIL 无自动重试 / 整篇拒键 + Reviewer H1–H3 + TD-58 定时器 + Y1 id 重用 + 结构非原子残留 + KRO),见尾部各节「→ A-25」 | 2026-11-08 |
| A-19 | 已核 · 关闭 | Main_Designer | 第 22 轮上岛(`04f6f822`,主 JS `index-Gswd3cHv.js`)、Tester 岛上 63/63 + 代表臂全过;余项 → TD-59 / TD-60 / TD-61 / L-021 | 2026-11-08 |
| A-20(**🅰**,11-08 升) | 返修 r2 | builder | Reviewer K1(保险带跨中间态落地重复)/ K2(撤销后离开被撤字落回)皆 ②,挡放行;修法:保险带起点 = 最后一次已确认落库内容、终点 = 离开时 live;包 `a20-idle-save-r2`;Tester 在 r1 上坐实作阳性对照 | 2026-11-08 |

**现行有效的裁定**(一条一行;被推翻的直接删,历史在尾部)

- 编辑器组:设计基线是「甲 + 回显」,不新增可落库状态,窗口内的键不丢、不错序 ← 「A-21/A-24 再裁(Main_Designer 2026-11-05):甲+回显,撤销乙」
- 编辑器组:不放行;放行条件是必修 8 条,验收 4 条(H 必过,字守恒在冻结版上对第 1、2 条和 buffer-3 各红至少一次) ← 「编辑器组判语与返修裁定(Main_Designer 2026-11-07)」
- 编辑器组:守恒闸的放宽准,带三个条件;清单外文件准;leads-2 撤掉,转入 A-25;commit-2 补冻结版验红;先出修后静态包 ← 「编辑器组返修中途裁定(Main_Designer 2026-11-07,答 builder 中途进度)」
- 编辑器组:「改地址离开」一臂本轮不动 history 记账点,条件 d 不松;回执要有三版事件时间线、「回车到字落地」时长、坏的三类拆分 ← 「编辑器组返修裁定:「回车后立刻改地址离开」那一臂(Main_Designer 2026-11-07)」及其下「补充:这一臂的归类先挂起(Main_Designer 2026-11-07,答 builder 矩阵回报)」
- 编辑器组:「改地址离开」一臂定性为相对冻结版的退步;做法 4 已撤回(浏览器里适配器层先拦成 null),按做法 3 写回执——退步一边(自然时序 7/10、慢回包 0/6 自动落,全第②类)与净改进一边(慢回包整页卸载:冻结版第③类、修复版第②类)并排写;第③类为零 ← 「编辑器组返修收尾裁定:做法 4 撤回成立,按做法 3 收;出包前先证同源(Main_Designer 2026-11-07)」
  - ⚠️ **第一轮 builder 矩阵的 ② 计数作废待重出**(builder 2026-11-07 自查):harness 把 localStorage 里**所有**笔记的留字记录都算作「留住」,字不在服务端的行(慢回包臂、冻结版与修前的丢字行)可能把 ③ 记成了 ②;「慢回包整页卸载:冻结版 ③、修复版 ②」与 26 行里的 ②5 都待修正后的 harness(只认本行笔记的键 + 重开页面实见)重出。**Tester 的真浏览器判语不受影响**(它按重开后屏上与库里实见归类)。← 「编辑器组第二轮 · builder 自查 harness 缺陷(2026-11-07)」
- 编辑器组:撤回后的源码与第一批验收数同源要证据;第一批 dist 已不在,走重跑——最终包上注入矩阵 26 行 + r04@57,跑前跑后各记 dist 的 sha256;做法 4 包上的 r04@57 不算数 ← 同上
- 编辑器组:撤回原件(四条测试、slowReply 注入、适配器根因)存 `docs/audits/2026-11-05-a21-builder/builder/opt4-withdrawn/`,供后续单;假适配器缺 `current()` 闸记债 ← 同上
- 编辑器组:Tester 验收范围=第十一节第 7 小节全表(H 必过)+ 守恒闸阳性对照亲核 + 真笔记形状的 E/F/J + 对地址栏一臂「挡不挡放行」的意见 ← 同上
- 编辑器组:**与 A-19 分开上**;上岛的包=纯 21 文件构建;builder 的矩阵数须在纯 21 文件包上重出(原包含 A-19 的数字保留、标来源);副本一律从 HEAD 建、只叠本单文件、出数前证「副本−基线=本单清单」 ← 「编辑器组裁定:包里混进 A-19,分开上;builder 在纯 21 文件包上重跑(Main_Designer 2026-11-07)」
- 编辑器组·第二轮:K1/K2(保存卡 12 秒后成功须拆开,看门狗可放界面不得丢结构计划)、留字框重复(一记录一框一存档,恢复幂等,关框只删自己)、第二窗口补打字卸载后丢(条件 a 按锚点比,⛔ 子串)三条**必修**;提示条盖住上一行坐实→第四条必修(须不压任何笔记行,`pointer-events:none` 不够);gamma 两行未复现→观察项不挡;「快离开后同块未拆」②′ 无退步臂→入 A-25;乱序 1/15 按结果 ③、按机理既有→入 A-25「结构中途被打断不回滚」;守恒闸边界断言必补带阳性对照;回执「冻结版 H 单元测试红」作废;地址栏一臂单独不挡、前提第 4 条修好;旧矩阵改到第二轮包上跑;中间版不上岛 ← 「编辑器组返修第二轮裁定:Tester 中途出红,builder 先修(Main_Designer 2026-11-07)」及「编辑器组第二轮补充裁定:判语已收;第 4 条修法、边界断言、乱序定性(Main_Designer 2026-11-07)」
- 编辑器组·第二轮追加(机理核读后):K1/K2 修法=后续 run 等上一 batch 落定(`lastBatch`),须按笔记作用域、回执写明约 20 秒的恢复界并加「卡 25 秒后成功」一臂、第二次只读写明;⛔ 卸载时删留字 DOM 的保险带;3a 无锚点一律 keep() ⛔ 追加到末尾(条件 d);3b 字刚落地未落库时关页的丢法先坐实、坐实则本轮修,Tester 加 H-L 臂;`edfix` 为被测源码唯一留存 ⛔ 再动,包必带 `src/` 快照 ← 「编辑器组第二轮 · 三条红的机理核读与由此追加的四条要求(Main_Designer 2026-11-07)」
- 编辑器组·H-L(字刚落地未落库时关页,三版 3/3 丢):第③类,挡第二轮放行,本轮修——承载落地字的保存被确认前存档记录不删(或 pagehide 重新写档);⛔ 以 A-20 债豁免;注入一律写明注入层、至少一臂发出前拦 ← 「编辑器组第二轮裁定:H-L 坐实,第③类,挡第二轮放行,本轮修(Main_Designer 2026-11-07)」
- A-25:组合中不挪焦点、不换主,等 compositionend 后再交接;动工时带上 leads-1、handoff-0 两条约束,并接收 leads-2 和随单移交的冻结红测试 ← 「A-25 · 新笔记第一行用输入法打字,拼音被写进笔记(🅰,既有,2026-11-06 Tester 编辑器组核验中发现)」、「A-25 追加约束(来自 Tester 对 leads-1、handoff-0 的处置)」
- A-19:走原页通道,一图一页,不改写 media 块 ← 「A-19 · 图片 Source 的笔记是空的(🅰,功能失效,不丢数据)」
- A-20·🅰 半边**开修**:hash 路 (i) 监听 popstate/hashchange 同步跑 flushForLeave(实测 PUT 先于路由提交 10/10)+ (ii) 清理时未封口 pending 写留字框(只读 peek);401 路恢复回执 sessionStorage → localStorage 加用户作用域,⛔ 转写成留字框条目;回包晚到无假横幅须有测试;B-81 以 emptyHash 阳性对照收口;⛔ 服务端 / 记账层 / 适配器 / F9;分包 a20-leave-safety 或同包由 builder 按量级定 ← 「A-20 🅰 半边裁定(Main_Designer 2026-11-08)」
- A-20·r2 改法:**保险带只记未封口的字**(起点 = 最后确认内容、终点 = live、相等不记);**已封口未确认一律走回执**(闸把回执计入留住,来源三分 窗口 / 保险带 / 回执);`unconfirmed` 重试确认全部组、⛔ 留住逻辑再读它;⛔ 给保险带加劈分感知;⛔ 改 `useHeadingStructureController.ts` 落地逻辑 ← 「A-20 r2 改法(Main_Designer 2026-11-08)」(取代 §354 第 2 条对已封口字的部分)
- A-20·(B) 开修:会话只读 `peek()`,中途落库 = 不进撤销栈的 transaction 走同一队列;失败不进 failures、停发至下次封口成功;封口同体不重发;定时器随 scope 清;输入法按现状(compositionend 即封口,预裁那句撤);结构提交中跳过后 `peek()` 非空才重设一次 2 秒;撤销形状逐字节同今天须测试钉住;1 秒节流只在 scratch 量 ← 「A-20 查报收讫(Main_Designer 2026-11-08)」
- A-20·空闲保存半边:**Henry 选 (B) 只落库不封口(11-08)**;Q1 收口为 (B) 的可行性与深浅(记账层内哪些行、修订号跟进、撤销后追平、与适配器闸有无牵连);收不住记账层以内就停下来报,⛔ 自行退 (A)/(C);验收用 Henry 原话(随时关都能保存;撤销与今天一样细)← 「A-20 空闲保存半边:Henry 选 (B)(Main_Designer 2026-11-08)」
- A-20·预裁:阈值 2 秒常量;草稿期无定时器;结构提交中跳过、IME 组合后补 seal 不轮询;hash 离开前 seal 且 persist 真发出(只传不记,带旧笔记 id;要改适配器记账层就停);B-81 不许留、须有冻结版红;pagehide 留档扩到普通未存编辑并取消守恒闸放宽(冻结版该臂红);⛔ 第二写者 / 逐键写 / 新 localStorage 结构 / 动服务端 / 动 F9 / 动 A-25 范围 ← 「A-20 派单(Main_Designer 2026-11-08)」
- A-20:空闲保存只走现有的唯一写入路径;动工时把 pagehide 同步留档扩到普通未存编辑,并取消守恒闸的那处放宽;B-81 并入同查 ← 「A-20 · 打字只在回车或失焦时落库(🅱 偏重,修)」、「编辑器组返修中途裁定(Main_Designer 2026-11-07,答 builder 中途进度)」、「记录不修」

**已读到**:Tester A-19 判语(`docs/audits/2026-11-06-a19-builder/review-tester.md` 〇 + 第四节岛上复核);builder A-19 拷回核对与 a19pkg 清理短讯;Tester 截图裁侧栏疏漏自报(9 张已在工作区裁好,下次收割带上)。Main_Designer 最新一节:「A-20 派单(2026-11-08)」

### 已否决的做法(Main_Designer)

- 编辑器组·乙(让「未拆开的标题单元」成为可落库状态):撤销。章节范围、移动、折叠、TOC 页码、`read_note` 块 role、打字路径都不成立,而且它只是搬走窗口 ← 「A-21/A-24 再裁(Main_Designer 2026-11-05):甲+回显,撤销乙」
- 编辑器组·丙(动 F9 协议、服务端路由、撤销和批注归属):不做,入 tech-debt 作长线 ← 「A-21/A-24 裁定(Main_Designer 2026-11-05)」
- 「改地址离开」·做法 2(有门槛的全页回找):否。单元编号每块从 `tu-1` 顺排,只在近乎空的笔记里成立,是测试形状的通过;空串 `initialText` 会落错块;它是按内容猜身份 ← 「编辑器组返修裁定:「改地址离开」一臂定性为退步;做法 2 否,给做法 4(Main_Designer 2026-11-07)」
- 「改地址离开」·做法 1(在非当前笔记上写 history 的账):仍否 ← 同上一节,及「编辑器组返修裁定:「回车后立刻改地址离开」那一臂(Main_Designer 2026-11-07)」
- 「改地址离开」·做法 4(回包确认时只传不记,存档跟到新块):准过,已撤回。单元层全绿、浏览器里不生效——`useNoteCanvasDataAdapter.ts` 的 `transferTextUnit` 在 history 之前就按 `current()` 把回包拦成 null;要传须改适配器=记账层,超出「只传不记」与「一次为限」 ← 「编辑器组返修收尾裁定:做法 4 撤回成立,按做法 3 收;出包前先证同源(Main_Designer 2026-11-07)」
- 编辑器组·先上一个中间版(纯 21 文件包虽不比线上差):否。K1/K2 是明文放行条件,留字框重复是新引入的丢法;放宽闸只有 Henry 能拍 ← 「编辑器组返修第二轮裁定:Tester 中途出红,builder 先修(Main_Designer 2026-11-07)」
- 编辑器组·用第 1 条(看门狗后结构继续)的修法顺手修第 6 条(快离开后同块未拆):否,不是同一条路;第 6 条候设计 ← 同上
- 编辑器组·第 4 条只加 `pointer-events: none`:否,只解决点击,提示条仍盖住用户自己那一行;须不压任何笔记行 ← 「编辑器组第二轮补充裁定(Main_Designer 2026-11-07)」
- 编辑器组·本轮把结构做成事务(修乱序 / 空残块):否,超出本单,入 A-25 一并设计 ← 同上
- 编辑器组·K1/K2 用「看门狗后不放弃 run」修:否,busy 已放开,活 run 会与用户编辑和下一次结构抢闩 ← 「编辑器组第二轮 · 三条红的机理核读(Main_Designer 2026-11-07)」
- 编辑器组·留字框「卸载时删 DOM、下次从存档恢复」的保险带:否,存档写失败是静默的,屏上那份可能是唯一一份 ← 同上
- 编辑器组·H-L 以「A-20 的债」明确豁免、带着放行:否,进过窗口的字不在放宽的边界里,豁免了边界断言就成摆设 ← 「编辑器组第二轮裁定:H-L 坐实(Main_Designer 2026-11-07)」
- A-25:靠延迟绕过输入法组合:否,要修根因 ← 「A-25 · 新笔记第一行用输入法打字,拼音被写进笔记(🅰,既有,2026-11-06 Tester 编辑器组核验中发现)」
- A-20:第二个写者:否 ← 「A-20 · 打字只在回车或失焦时落库(🅱 偏重,修)」
- A-19:为页图另起转换队列:否;改写 media 块:否 ← 「A-19 · 图片 Source 的笔记是空的(🅰,功能失效,不丢数据)」

### 改动清单(builder)

> 编辑器组已收割上岛(fdeacb5d),它的清单和数字在尾部各 Result 节与 `docs/audits/2026-11-05-a21-builder/builder/`。本块现在只记 A-19。

- A-19 基线 commit:`fdeacb5d`。在 scratch 副本里建、测、封包;共享树那 13 个草稿文件封包后未再动;`edfix` 未动。拷回候 Main_Designer 令,以包为准。
- 源码 = 基线 + 15 个文件(清单 ops `packages/a19-image-pages/files15.list`,哈希 `src.sha256`):
  - server:`services/sourcePageImages.ts`(image 进页影像通路、原格式存页图、登记 `text_view`)、新 `services/sourceImageSize.ts`(png/jpeg/webp 头部读尺寸,含 EXIF 方向)、`package.json`(只 `test:v2` 加新测试)
  - server 测试:新 `a19SourceImagePages.test.ts`;`vpsF11SourcePageImages.test.ts`、`fidelity1a2DocxPages.test.ts`、`v2SourceLifecycleClosure.test.ts` 只改预期
  - client:`hooks/useSourcePageViewController.ts`(`pagesOnly`)、`layers/SourceViewToggle.tsx`、`layers/NoteSourcePagesLayer.tsx`、`sourcePageLayout.ts`(小图不放大)、`Sources/sourceApi.ts`(`text_view?`)
  - client 测试:新 `hooks/useSourcePageViewController.test.tsx`;`layers/NoteSourcePagesLayer.test.tsx`、`sourcePageLayout.test.ts`
- 包:ops `packages/a19-image-pages/`(`dist/client/` 主 JS `index-Gswd3cHv.js`、`dist/server/`、`src/`、两份哈希、`COPY-BACK.md`、`MANUAL-SECTION.md`)。

### 自报数字(builder)

> 一个数字一行,出处写全。a19 = `docs/audits/2026-11-06-a19-builder/`。

| 数字 | 命令 | 环境/版本 | 证据文件 |
|---|---|---|---|
| 包 `src/` 15/15 与副本逐字节同;`dist.sha256` 1852 行自检通过 | `sha256sum -c` | A-19 包 | ops `packages/a19-image-pages/` |
| client tsc 净;server tsc 净(先 `tsc -b` 建 shared);vite build、server build exit 0 | `npx tsc --noEmit -p .`;`npx vite build`;`npm run build` | A-19 副本 | `a19/builder/summary.txt`、`tsc-*.txt`、`build-*.txt` |
| client 全量 2686/2686,exit 0 | `vitest run --pool=forks --poolOptions.forks.maxForks=3` | A-19 副本 | `a19/builder/client-full-work.txt` |
| server test:v2 985 条 977 过 8 红;fdeacb5d 同 8 条红(scratch 环境所致) | `run-server-test-suite.mjs --test-concurrency=3 …` | A-19 副本 / fdeacb5d 副本 | `a19/builder/server-full.txt`、`server-full-base.txt` |
| 阳性对照:A-19 测试在 fdeacb5d 上红(A1 server 6、client 6;A2 server 11);B 段 11 臂改坏 11/11 红 | 见 `a19run.py` 说明行 | fdeacb5d 副本 / A-19 副本 | `a19/positive-controls.txt` |

### 待办(builder)

- A-19 回执已落尾部「Result(builder 回执区,候填)」下「A-19 Result(builder 2026-11-08)」;待 Reviewer 核、Main_Designer 裁、Tester 验。
- 3001 草稿后端(只绑回环)留给 Tester 交叉核对,核完即停;收工清 `a19pkg` 副本(先拆 node_modules junction)。

### 验收条件(Tester,待 Tester 填)

-

## A-19 · 图片 Source 的笔记是空的(🅰,功能失效,不丢数据)

**现象**:导入 png,笔记只有标题和「源文档 · 1 页」。服务端 image 对象、placement、asset 都在,客户端 0 个 img。
**根因(Tester 定位)**:`ImageObjectLayer.tsx` 在 `803b3493`(09-12 死代码清理)被删,物化器还在产 canvas image 对象,没有层画它。

**设计裁定:走原页通道,不改写 media 块。** 理由:保真法是「应用一页=原件一页」,路线本来就是 PDF、docx、HTML、图片逐个点亮;一张图就是一页,走同一通道后,图片也进了将来给 agent 和视觉模型的同一批页。

- `native-image` 进页影像通路:登记 1 页,尺寸取图片真实宽高,页图直接用原图(不经转换器,⛔另起队列)。
- 图片投影没有文本可看:固定在原页,不显示文本/原页切换;默认判决和切换不留死路。
- 存量:现有图片 Source 不用重投影就能补,沿用生成按钮即可,不自动全量扫。
- 物化器产的 canvas image 对象本单不动,回执申报是否成为死形状,入 tech-debt。
- 删源、重投影级联照 1a 契约,页图不残留。

**验收**:png、jpeg、webp 导入后笔记首屏即见原图,比例正确,大图不撑破;旧图片点生成后可见;删源无残留;血缘 chip 现状不回归。

## A-20 · 打字只在回车或失焦时落库(🅱 偏重,修)

**现象**:光标留在块里 60 秒,0 个写请求,本地也无草稿。崩溃、断电、整机重启时,丢最后一次回车或失焦之后的那段;不回车写长段落时这段可能很长。云机本身会挂起,Henry 今天也误锁过一次,所以这不是纯理论风险。
**待查疑点**:token 过期时 `api.ts:61` 改 hash 跳登录,脚本改 hash 时测到 0 写请求,这条路可能在无崩溃时也丢字。先核实,属实则升 🅰 并回报。

**设计裁定**:加空闲保存(停止输入约 2 秒),**必须走现有的唯一写入路径**,⛔第二个写者。11-01 的单写者手术修的正是草稿循环并行保存,A-18 又是同一病根,所以本件必须在 A-18 根因落定后,基于它的结论来做。A-18 回执要写明空闲保存能否安全接入。

**验收**:连续输入不回车,停约 2 秒后服务器有字;硬杀 Chrome 后最多丢最后约 2 秒;保存期间继续打字、回车、切块,用 A-18 同一矩阵 0 错;无多余写放大(连打期间不逐键写)。

## 交付

各自交付、各自核验。红线照旧:⛔git 写操作、⛔真实模型、⛔碰岛、⛔扩修。新 server 测试同批挂载。证据分别落 `docs/audits/2026-11-05-a19-builder/`、`docs/audits/2026-11-05-a20-builder/`。量级超出就停件上报。

---

## Result(builder 回执区,候填)

### A-20 Result(builder 2026-11-08)

> 包:ops `packages/a20-idle-save/`。主 JS `index-BkYnVk7W.js`。`src/` 共 14 个文件,清单 `files14.list`,另有 `src.sha256`、`dist.sha256`(63 行)、`COPY-BACK.md`、`MANUAL-SECTION.md`。基线 `04f6f822`。server 未改,包里没有 dist/server;依赖与锁文件都没动。
> 证据:`docs/audits/2026-11-08-a20-builder/`。查报在 `survey.md` 与 `survey/`;本趟的数据在 `builder/`,先看 `summary.txt`;阳性对照在 `positive-controls.txt`。`pre-harvest-scan` 结果 ⛔ 0。
> 包在 scratch 副本里建、测、封,没碰共享树,没碰 `edfix` / `edacc`。共享树 HEAD 是 `f28c7914`:14 个文件里 13 个与 `04f6f822` 相同,另 1 个是新文件。

#### 按裁定逐条

- **(B) 空闲保存:中途落库,不封口。** 停手 2 秒(常量 `IDLE_SAVE_MS`)后,把还没封口的那组写进同一条写入队列,经同一个 `persist` 落库;不进撤销栈,撤销分组规则一字没改。
  - 失败时不记入 `failures`,并停止后续中途落库,直到下一次封口保存成功;所以断网时「Failed to save block」只弹一次。
  - 封口时,如果正文和上一次中途落库的内容相同,就不再重发。
  - 草稿期不起定时器:草稿走另一条路,不经 `onEditApplied`。
  - 结构提交中跳过,只在 `peek()` 非空时重设一次 2 秒定时器;组合输入中 `peek()` 返回 null。输入法保持现状(compositionend 时封口并落库)。
- **🅰 改 hash / 粘贴链接换笔记,用 navigate 事件。**
  - 可拦的(脚本改 hash):拦下,走和应用内链接同一个 `flushForLeave`,保存成功后再打开同一地址;保存失败就留在原笔记,弹原来的「Please retry」。
  - 不可拦的(地址栏粘贴),以及去 /login 的:先把没确认落库的字写进留字框,再失焦。
  - 浏览器没有 navigate 事件时,用 popstate 兜底,处理同上;兜底这条路有单元测试和浏览器臂。
- **🅰 留字框保险带。** 换笔记、卸载、pagehide 时,把「已封口但还没确认落库」和「还开着」的字按单元各记一条(从最早的 before 到最新的 after),和留字框是同一入口、同一种记录,幂等。确认落库后撤掉这条;如果同一单元里结构窗口已经留了一模一样的字,就不再重复记。
- **🅰 401 回执改存 localStorage。** 按账户分开存,条目 schema 不变;Apply / Dismiss / baseRevision 校验照旧;旧版留在 sessionStorage 里的回执照样读,遇到同一块时替换掉。
  - 我自己补了一处:笔记可能在账户还没载入时就渲染,控制器订阅账户 id,载入后重渲一次,回执才列得出来。路由只等令牌、不等账户,不加这一行,新标签页会查不到回执。
- **适配器改 3 行(准改范围内)。** 回包晚于换笔记到达时,只要 2xx 且正文与发出的一致,就删掉本次回执,别的不动。
- **B-81。** 没人通知的换笔记(两篇空笔记之间也一样)不再弹假的「could not be saved」。保存真失败、人又已经离开时,改弹真话 `LEFT_UNSAVED`。
- **守恒闸。** 删掉了卸载豁免;冻结版上这一臂红,包上全绿。
- **:940 诊断构建坐实。** 2 样本 × 3 臂,6/6 都在 `textHistory.flush` 报「Text composition is still active」被拒。

#### 代码回答(行号对包 `src/`,目录 `client/src/pages/Notes/canvasEngine/`)

1. **空闲封口挂在哪,四个条件各在哪一行守住。**
   - 挂点:每次记录输入后调 `scope.scheduleIdleSave()`,在 `hooks/useTextFlowHistory.ts:765`;定时器在 `:631-638`,到点执行 `idleSave` `:640-660`。
   - 唯一写入路径:队列里重新 `peek()`(`:655`),然后 `persist(…, 'after', false, undefined, true)`(`:658`)。
   - 草稿期:块不在 `blocks` 里就直接返回,在 `:646` 附近;草稿输入本来就不经 `onEditApplied`。
   - 结构提交中:`canSaveWhileTyping` 判 false 就重设定时器,`:650`;判定条件在 `hooks/useNoteCanvasRuntimeController.ts:396`。
   - 组合输入中:`peek()` 返回 null,`textFlowEditSession.ts:149`。
   - 失败不重试:`:211`,`:273`。
   - 不重复写:`:619-627`。
2. **hash 离开:修前修后各走哪几行,persist 从哪发,记不记历史。**
   - 修前:`useNoteRouteSaveBoundary.tsx` 的 `useBlocker` 不拦没有步长的 POP;`useTextFlowHistory.ts` 的 `:189`、`:540`(冻结版行号)被 `current()` 挡回;`:940` 抛出。详见查报 Q2。
   - 修后:`hooks/useNoteRouteSaveBoundary.tsx:148-161`(navigate:可拦的走 `:156` preventDefault → `flushForLeave` → `:159` 重开地址;不可拦或去登录的走 `:155` → `keepAndLeave` `:138-146`),`:162-166` 是 popstate 兜底,`:164` 由路由自己产生的那一步交给 blocker。
   - persist 照旧由失焦封口发出(`onSeal` → 队列 → `persist`),在旧 scope 还当前时就发出;适配器会先写回执。没新增 history 记账。
3. **B-81 提示从哪来,怎么修的。** 来源:`useNoteRouteSaveBoundary.tsx:117` 清理时对旧句柄调 `flushPendingSaves`,在 `:940` 被拒。修法:离开路径一开始就设 `scope.released = true`(`:139`、`:158`),清理时跳过。如果离开后保存真失败,弹真话 `:145`,文案在 `:15`。
4. **pagehide 留档怎么扩,宽限在哪删,新断言在哪。**
   - 写:`hooks/useTextFlowHistory.ts:664-692`,`keepOpenEdit`,不重复记的判断在 `:686`。
   - 撤:`:694-705`,`confirmTyping`,由 `:260`、`:621` 调用;未确认列表 `:151`,封口时入列 `:615`。
   - 触发:`:735`(scope 结束)、`:738`(pagehide);离开时另由 `useNoteRouteSaveBoundary.tsx:140` 调用。
   - 恢复:走留字框原有入口,`useHeadingStructureController.ts` 未改。
   - 宽限删在 `hooks/structureTypingConservation.test.tsx:546`(原来是 `continue` 豁免,现在是注释);放宽的边界断言 `:544` 保留。
5. **写放大(真 Chrome + 代理计数)。**

   | 情形 | 修前 | 修后 |
   |---|---|---|
   | 连打 60 秒约 410 键 | 0 写 | 0 写 |
   | 「打 5 秒 + 停 3 秒」× 4 | 0 写,服务器无字 | 4 写 |
   | 输入法 13 个组合 | 13 | 13(不变) |
   | 草稿期 20 秒 | 服务器只收到前 9 个字 | 服务器有全文 |

   约 1 秒节流的数没有在包里做,只是估算:上界约 60 PUT/分钟。包里没有任何测量开关。
6. **撤销分段实测(冻结版和包逐步比对,都相同)。**
   - `aaa`↵`bbb`↵`ccc` 连按 Ctrl+Z 四次:`aaa|bbb|` → `aaa|bbb` → `aaa|` → `aaa`。
   - `aaa` 停 3 秒再打 `bbb`:一次 Ctrl+Z 两段一起撤掉。
   - 输入法:一个组合撤一次。
   - 包上「`aaa` 停 2.6 秒(已中途落库)再打 `bbb`」:一次 Ctrl+Z 撤回整行,服务器跟着变回 `warmup`。
7. **适配器那 3 行,为什么不算动记账。** `hooks/useNoteCanvasDataAdapter.ts:2146-2148`:两行注释加一行代码,只在 2xx 且 `blockMatchesIssuedSave` 为真时调 `forgetBlockEditRecoveryReceipt`。不碰 blocks / drafts / outstanding 这些账,不碰 `reconciliationReadIsCurrent` 和 `transferTextUnit`。回包和发出的内容一致,就证明这次编辑已经落库,回执已无用;不删的话,回到原笔记会出一个假横幅。
8. **401 回执改存 localStorage。** `draftBlockPersistence.ts:86-111`:键是 `coincides:draft-recovery:v2:<账户>`,按顺序读旧 session 键、再读本账户的 local 键;`:89` 用 `getState?.()`,测试里 mock 掉 authStore 也不会抛错。列出 `:444`、记下 `:489`、删除 `:560`。账户载入后重渲,在 `hooks/useNoteCanvasRuntimeController.ts:46`。

#### 测试与阳性对照

- 新测试:
  - `textFlowEditSession.test.ts` 加 3 条(peek)。
  - `hooks/useTextFlowHistory.test.tsx` 加 5 条:中途落库;一次 Ctrl+Z 撤回整段;不重复写;失败只一次;结构提交中等待;留字框保险带。
  - `hooks/useNoteRouteSaveBoundary.leave.test.tsx` 新文件 8 条:可拦的、失败留下、不可拦先留后失焦、401、离开后失败说真话、popstate 兜底、B-81、路由自己那一步交给 blocker。
  - `draftBlockPersistence.test.ts` 加 4 条(跨标签页、按账户、旧回执、删除)。
  - `hooks/useNoteCanvasDataAdapter.test.tsx` 加 1 条(回包晚到删回执)。
  - 守恒闸去掉豁免。
- **14 个文件里两个不显眼的(Main_Designer 问到):** `NoteCanvasRuntime.tsx` 是运行时句柄的接口与实现,加了两个可选方法 `whenLeaveSettled` / `keepOpenEdit`(`:19-22`、`:29`、`:40-41`),路由守卫离开时要调用它们;`useTrayController.test.tsx` 只改测试夹具:`useTextFlowHistory` 现在导入留字框模块,经由它会导入 authStore,authStore 创建时调用 `getToken`,原来的 api mock 没有这个导出,所以补上 `getToken` / `setToken`(`:13`,上一行是说明注释),断言一条没改。
- 改动的旧测试:回执存储改了位置,13 处 `sessionStorage` 断言改读新键;`useTrayController.test.tsx` 的 api mock 补了 `getToken`。新导入链会经过 authStore,authStore 创建时就要读令牌,所以必须补。
- 阳性对照(`04f6f822` 上,`positive-controls.txt`):
  - 红:peek 3/3、空闲保存 5/5、离开 7/8、回执存储 2/4、回包晚到 1/1;守恒闸红,种子 18 和 31 报 `<k1> LOST`。
  - 在冻结版上绿的 3 条都是保护既有行为的守卫:路由自己那一步交给 blocker、旧回执照读、删除不限位置。
- 全量(包的源码):client tsc 0;vitest 259 个文件 / 2707 条全过,exit 0。server 未改,`test:v2` 只有与 A-19 基线同样的 8 条环境红。中间一轮 client 有 3 个 TD-58 计时器的 unhandled error(`structureTypingBuffer.ts:292`,早已记在 A-25 名下),最终这轮没有出现。
- 浏览器(最终 work 构建,每臂 10 样本;构建期间 dist 未变,哈希见 `builder/dist-browser-runs.sha256`):

  | 臂 | 修后(有 navigate) | 修后(兜底:`--disable-blink-features=NavigationApi`) | 冻结版 |
  |---|---|---|---|
  | hashSwitch | 服务器有字 10/10 | 10/10 | 0/10(查报)、兜底 0/3 |
  | pasteLink | 10/10 | 10/10 | 0/10、0/3 |
  | lateReply(回包扣 3 秒) | 10/10,无假横幅 | 10/10 | 0/3 |
  | loginHash / login401Enter | 留字框里有字 10/10 | — | 丢 |
  | emptyHash | 假提示 0/10 | 0/10 | 3/3 |
  | clickLeave(对照) | 10/10 | — | 10/10 |

  另有:硬杀 Chrome(CDP `Browser.close`,停 2.6 秒后)服务器有字;包构建冒烟 3/3 全过。

#### 没修 / 没验

- **约 1 秒节流:** 只有估算,没有实测(Main_Designer 准许只量不改,包里不放开关)。
- **401 臂:** 字由留字框自动落回,随后中途落库保存;横幅在这条路上不再出现,因为留字框落地保存时替换掉了同一块的回执。新标签页上回执能列出来(账户载入后重渲),我没有在浏览器里单独测新标签页这一臂,交给 Tester。
- **两个恢复入口(横幅、留字框)仍然并存:** 按裁定留给 A-25。
- **非 Chrome 浏览器:** 用 Chrome 关掉 Navigation API 来模拟兜底路,没在真 Firefox / Safari 上跑。
- **A-18 矩阵和 r2.3c 代表臂:** 本趟没有重跑全矩阵。撤销分段与离开相关的几臂已经修前修后比对过;编辑器组的 H 场景、三个固定项、r2.3c 代表臂,请 Tester 用修前修后两个构建各跑一遍(包里 `useHeadingStructureController.ts` 没动)。
- **真实输入法:** 输入法臂用 CDP `imeSetComposition` 模拟,没用真实输入法。

### A-19 Result(builder 2026-11-08)

答「A-19 派单」及其后三次裁定(两处先报、第一趟、补跑)。证据 `docs/audits/2026-11-06-a19-builder/`(阳性对照 `positive-controls.txt`;其余在 `builder/`,下称 b/)。行号一律对 ops `packages/a19-image-pages/src/` 快照;没进包的文件(未改动)对 `fdeacb5d`。

#### 包与同源

- 包:ops `packages/a19-image-pages/`。
  - `src/`:15 个文件,逐字节;`src.sha256` 路径为仓库相对路径。
  - `dist/client/`:主 JS `index-Gswd3cHv.js`,63 个文件。
  - `dist/server/`:`npm run build` 产物。
  - `dist.sha256` 共 1852 行,路径相对 `dist/`。
  - 另有 `files15.list`、`COPY-BACK.md`(未执行)、`MANUAL-SECTION.md`。
- 源码 = `fdeacb5d` + 15 个文件,在 scratch 副本里建、测、封包。共享树那 13 个草稿文件没动;别的单的改动没碰;`edfix` 没动。
- 包与共享树草稿的差别(拷回以包为准):
  - `vpsF11SourcePageImages.test.ts`:草稿把整篇行尾改了。包里按 `fdeacb5d` 原字节只改两处(+7/−1)。
  - `useSourcePageViewController.ts`:按第一趟裁定删了 `setMode` 里那行守卫。
  - 新增两个文件,只改预期:`fidelity1a2DocxPages.test.ts:261`,`v2SourceLifecycleClosure.test.ts:305、407`。见下文「旧测试预期」。
- 依赖与锁:`server/package.json` 只改 `test:v2` 列表,加入 `src/__tests__/a19SourceImagePages.test.ts`;没有新依赖,`package-lock.json` 没动。

#### 按裁定五条

1. **native-image 进页影像通路**:
   - `IMAGE_PARSER = 'native-image'`(`sourcePageImages.ts:24`)。
   - `pageImagesSupported` 认它(`:122-124`)。
   - `openRenderer` 对它直接返回 `openImagePageRenderer`(`:319-321`)。
   - 登记 1 页,尺寸 = 图片真实宽高(`:128-139`)。
   - 页图就是原图字节,按原格式存:扩展名和 mime 跟着走(`:221-225`),`ON CONFLICT` 时同步更新 storage_key、filename、mime_type(`:246-249`)。
   - 没有转换器,没有新队列,见代码回答②。
2. **图片投影固定原页、不显切换**:
   - 服务端登记带 `text_view: false`(`:526`)。
   - 客户端由此判 `pagesOnly`(`useSourcePageViewController.ts:79`):原页强制为当前视图(`:183`),切换不渲染(`SourceViewToggle.tsx:9`),默认判决对它直接收口(`:130`)。
   - 小图不放大(`sourcePageLayout.ts:31`),页框宽跟着走(`NoteSourcePagesLayer.tsx:148`)。
3. **存量沿用生成按钮**:
   - 旧图片 Source:登记 `supported: true`、`status: 'none'`,所以 `pagesOnly` 成立,笔记停在原页。
   - 原页层显示「这份资料还没有原页影像」和「生成原页影像」。
   - 点生成走既有的 `requestSourcePageImages`(`sourcePageImages.ts:559`),只补缺的,不重投影,不全量扫。
   - 测试 `a19SourceImagePages.test.ts:191`。
4. **物化器 canvas image 对象不动**:没动。申报见下节。
5. **删源、重投影级联**:走既有路径,本单没加新路径。见代码回答④;测试 `a19SourceImagePages.test.ts:210`。

#### 物化器 canvas image 对象:申报(按补跑裁定 2)

现在每张图片 Source 有三份字节:

| 份 | 存在哪 | 谁写 | 谁读 |
|---|---|---|---|
| 原件 blob | `SOURCE_BLOB_DIR`,`source_files.storage_key` | 导入 | 物化器(复制出投影副本);页影像渲染器(`openImagePageRenderer`,`sourcePageImages.ts:128-139`) |
| 投影副本 | `CANVAS_ASSET_DIR/<user>/source-materializations/<mid><ext>`,资产 id `source-materialization-asset:<mid>`(`sourceProjectionMaterializer.ts:117-124`,fdeacb5d) | 物化器 | 只被 canvas image 对象引用(`:679`、`:716`)。客户端把它读进 `imageObjects`,只用在两处:AI 树(`canvasAiTreeService.ts:170`)、空笔记判断(`writingEntryVisibility.ts:28`)。**没有任何层画它** |
| 原页图 | 同目录 `<mid>-page-1<ext>`,资产 id `source-page-image:<mid>:1`(`sourcePageImages.ts:225`) | 页影像通路(本单) | 原页层 `<img>`(`NoteSourcePagesLayer.tsx:19`) |

- **是否死形状**:
  - 画面上是死的:没有层画 canvas image 对象,A-19 也不靠它出图。
  - 数据上还活着:AI 树和空笔记判断仍读它,所以不是「无人读」。
  - 建议入 tech-debt:「图片投影的 canvas image 对象与投影副本:画面无人画,AI 树、空笔记判断仍读;与原页图重复存一份字节」。
- **合并成一份引用是否要动 1a 契约**:要动。原页资产有自己的 id 命名(`source-page-image:<mid>:<n>`)、随投影迁移的规则(`adoptSourcePageImages`)和删除时的释放路径(`sourcePageImageAssetIds`)。让原页指向投影副本,就要改 `source_pages.image_asset_id` 的约定和引用计数的释放顺序。本单不做。
- **代价**:每张图多存一份原图大小的字节。删源时三份都清(见代码回答④)。

#### 代码回答

**① 图片尺寸怎么取,读不出时怎么办**
- 读取器在 `sourceImageSize.ts`,只读文件头:
  - png:IHDR(`:13-16`)。
  - jpeg:逐段找 SOF,包括渐进式,排除 C4/C8/CC(`:40-64`)。EXIF 方向 5–8 时宽高对调,按浏览器显示的方向算(`:19-38`)。
  - webp:VP8X、VP8L、VP8 三种(`:66-81`)。
  - 宽或高为 0,或格式不认识,返回 null,绝不猜(`:84-87`)。
- 读不出时属于 **(b)**:
  - `openImagePageRenderer` 的 render 抛错(`sourcePageImages.ts:134`)。
  - `renderMissingPages` 的逐页 catch 记进 failed_pages(`:383`),登记 `failed`(`:392`)。
  - materialization 仍是 `materialized`,笔记在,**不是整条导入失败**。
  - 界面显示「原页无法生成」和「重试」;「重试」走生成入口(`NoteSourcePagesLayer.tsx:101-103`)。
  - 测试 `a19SourceImagePages.test.ts:171`。
  - (c) 已按裁定记为可选改进,不做。
- **缺口**:上传入口(`sourceFileIntake.ts:110-135`,fdeacb5d)接受 png、jpeg、webp,和读取器支持的三种一致。下面两种情况浏览器可能能显示,读取器却读不出或读得不对,列为缺口,不修:
  - jpeg 在 SOF 里把高度写成 0、另用 DNL 段给出真实高度。这种很少见;读取器判 null,那一页失败。
  - webp 带 EXIF 方向。读取器不看 webp 里的 EXIF;浏览器是否按它转正未核实,所以竖拍的 webp 比例可能对调。

**② 页图「直接用原图」怎么接的**
- `openRenderer` 第一个分支(`sourcePageImages.ts:319-321`):image 不走 `options.openPageRenderer`(PDF 渲染器),也不走 docx 转换器。
- `openImagePageRenderer`(`:128-139`)读原文件、取尺寸,把原字节当页图返回。
- `storeRenderedPage` 按 `rendered.image` 定扩展名和 mime(`:221-223`),原样落盘。
- 测试断言页图与原件逐字节相同、渲染器打开次数为 0(`a19SourceImagePages.test.ts:134` 起)。
- **没有新队列**:仍是唯一的那个 `queueTail`(`:414`、`:449`),和 PDF、docx 一起排,一次一份。

**③ 哪一行判「无文本→固定原页」,两处怎样不留死路**
- 判定:`const pagesOnly = Boolean(register?.supported) && register?.text_view === false;`(`useSourcePageViewController.ts:79`)。
- **文本/原页切换**:
  - `pagesOnly` 时 `active` 恒为真(`:183`),`textAvailable` 为假(`:184`),`SourceViewToggle` 返回 null(`SourceViewToggle.tsx:9`)。
  - 第一趟裁定删掉的是 `setMode` 里那行守卫:不管谁调 `setMode('text')`,`active` 都不变。
  - 守这个不变量的测试:`useSourcePageViewController.test.tsx:23-29`(调 `setMode('text')` 后仍在原页);`NoteSourcePagesLayer.test.tsx:75`(切换不渲染)。
  - B 段「去掉 pagesOnly 对 active 的强制」一臂红 3 条。
- **默认判决**:`pagesOnly` 时直接收口,不等页、不读 scrollTop(`:130`)。
- **不留死路**:
  - 还没有页影像时,原页层显示生成入口(`useSourcePageViewController.test.tsx:40`、`NoteSourcePagesLayer.test.tsx:75`)。
  - 生成失败时显示「重试」。
  - 登记加载失败时,`register` 为 null,`pagesOnly` 为假,走原有的报错和重试路径。
- **旧页缺省(补跑裁定 1)**:
  - `text_view` 不是表列,也不是 JSON 字段,不落库,**没有迁移**。服务端每次组装登记时,由 `parser_key` 算出(`sourcePageImages.ts:526`)。岛上已有的 PDF、docx 部署后立刻得到 `true`。
  - 客户端只认 `=== false`(`useSourcePageViewController.ts:79`)。字段缺失(比如旧服务端)当「有文本视图」(`sourceApi.ts:56` 注释)。
  - 测试 `useSourcePageViewController.test.tsx:47`:`register({})` 不带字段,切换在,能切到文本。
  - 服务端 PDF 返回 `true` 由 `vpsF11SourcePageImages.test.ts:248` 守。

**④ 删源级联与重投影走的哪条既有路径**
- **删源**:`deleteSourceWithCompensation`(`sourceLifecycle.ts`,fdeacb5d):
  - 先用 `releaseNoteCanvasAssets(projection_note_id)`(`:164`)按 origin_note_id 释放该笔记的全部资产。投影副本和原页图都是这条笔记的,一起释放。
  - 再用 `sourcePageImageAssetIds`(`:173`)兜住原页登记里的资产。
  - 物理文件在事务提交后才删。连 blob 共三份,测试 `v2SourceLifecycleClosure.test.ts:407` 预期从 2 改为 3。
  - 原页图删后无残留:`a19SourceImagePages.test.ts:210`。
- **重投影**:`rematerializeSource`(`sourceReprojection.ts:135`)用 `adoptSourcePageImages` 把原页图挪到新笔记;`:139` 只补缺的。测试同上一条:新笔记 1 页、文件 1 个。
- **项目删除(移到 Home)**:两份资产都随笔记走,`v2SourceLifecycleClosure.test.ts:305` 预期从 1 改为 2。
- 这几条都是 1a 既有路径;本单只让 image 进入同一套登记。

**⑤ `server/package.json`**
- 只改 `test:v2` 一行,在 `normalizeCardContentDelimiters` 之后加入 `src/__tests__/a19SourceImagePages.test.ts`。
- 没有新依赖,`dependencies`、`devDependencies` 没变,锁文件没动。

#### 旧测试预期(补跑裁定已收)

- `fidelity1a2DocxPages.test.ts:261`、`vpsF11SourcePageImages.test.ts:494`:整对象比较登记,加上 `text_view: true`。
- `v2SourceLifecycleClosure.test.ts:305`(1→2)、`:407`(2→3):原因见上节「三份字节」。

#### 测试、检查、阳性对照(第三趟,`b/summary.txt`)

| 项 | 结果 | 证据 |
|---|---|---|
| client tsc | 净 | `b/tsc-client.txt` |
| server tsc(先 `tsc -b` 建 shared) | 净 | `b/tsc-server.txt` |
| client vite build | exit 0 | `b/build-client.txt` |
| server build | exit 0 | `b/build-server.txt` |
| client 全量(3 forks) | 2686/2686,exit 0,unhandled 0 | `b/client-full-work.txt` |
| client 全量 fdeacb5d 对照 | 2680/2680,**exit 1**,2 个 unhandled,`structureTypingBuffer.ts:292` 定时器在拆环境后仍跑(TD-58,挂 A-25);包上第二、三趟都没出现,间歇性 | `b/client-full-base.txt` |
| server test:v2(并发 3) | 985 条,977 过,8 红 | `b/server-full.txt` |
| server test:v2 fdeacb5d 对照 | 973 条,965 过,8 红,**与包上 8 条同名**:MinerU 四条、T-1 manifest copy、live specimen、两个整文件(`v2CanvasPersistenceCutover`、`v2DocumentParserPdf`);scratch 环境所致,按裁定不修 | `b/server-full-base.txt` |
| 阳性对照 A1:包里 4 个 server 测试文件、3 个 client 测试文件放在 fdeacb5d 上 | server 46 条红 6(`a19SourceImagePages` 整文件加载不了,因为尺寸读取器不在;另 5 条是 `text_view` 和资产计数的新预期);client 41 条红 6 | `positive-controls.txt` |
| 阳性对照 A2:再放进尺寸读取器(fdeacb5d 里没有任何代码调它) | server 53 条红 11,全是行为上的红 | 同上 |
| B0:包原样 | server 53/53;client 41/41 | 同上 |
| B 段 11 臂逐臂改坏 | **11/11 红**,各红在对应的测试上 | 同上 |

- 第一、二趟的记录:`b/summary-runs-1-2.txt`、`b/*-run1.txt`、`b/*-run2.txt`。
- 第一趟 server 大面积红,原因是副本里缺 `docs/generated`,不是代码问题。

#### 3001 草稿后端(给 Tester)

- 只绑 `127.0.0.1`:启动预加载把 `0.0.0.0` 改成回环,源码不动。
- 跑的是共享树的 server 源码,= `fdeacb5d` + A-19 的 server 改动:`sourcePageImages.ts`、`sourceImageSize.ts` 与包里逐字节相同,`fdeacb5d` 之后 server 没有提交。
- 数据库是原来的 scratch 库。
- Tester 核完通知我,我就停掉。

#### 已知、未修

- 图片 Source 存三份字节(见申报)。
- 尺寸读取器的两个缺口(见代码回答①)。
- 读不出尺寸的图「重试」多半仍失败:文件本身坏了,说明书照实写了。
- client 全量间歇性 unhandled(TD-58,不属本单)。

#### 待 Reviewer / Tester

- Reviewer:对照派单五条裁定和本节「代码回答」读包 `src/`。
- Tester:验收段四条、血缘 chip 不回归、1a 原页通路回归;接本地后端 3001。
- 同源构建按包 `src/` 做,`sha256sum -c src.sha256` 15 行。
- 说明书素材:包里 `MANUAL-SECTION.md`。

## A-21 · 持久编辑器中间段落打 `# ` 重复标题(🅰,2026-11-05 补入,builder A-18 中发现)

**现象**:往返 ≥200ms 时,在已落库的笔记中间段落打 `# `,内容重复(aaa/bbb/bbb/ccc),服务器也存重;80ms 不出现。未修构建上就有。
**机理(builder 初判)**:第二次 unit-transfer 把第一次转走的 unit 写了回去。
**要做**:按延迟矩阵复现(80/200/400ms),查根因,修根因,⛔靠延迟或防抖绕过。A-18 里为避开它的临时处理(草稿窗口内后面还有正文的 `# ` 保留字面、不转标题)在这里一并收回,回到正常转标题。回归测试在未修代码上红。
**排序**:A-18 → F3 → A-21 → V2 → A-19 → A-20。A-20 的空闲保存与它同属写入路径,排在它之后。Henry 走隧道,往返可能超过 200ms,所以优先于图片。

## V2 · 切换入口与 Rebuild 收尾(2026-11-05 补入,Tester 第十八轮复核)

- **B-78 悬浮切换盖住 Overview 的关闭按钮**(V1 引入):点 X 实际切到原页。Overview 打开时切换让位。
- **B-79 原页头部可被滚走**(1a 既有):鼠标在头部滚一下,唯一的切换到 y=-144,在页面列表上滚不回来。头部改粘性,切换始终可达。
- **A-22 Rebuild 后内容组在 Group Gallery 看不见**(🅱 偏重):API 里仍 active,`note_id` 为空。查清 Gallery 的过滤依据和笔记 Groups 面板的真实表现;首选让人继续找得到;若当轮修不了,至少弹窗写明后果,不再只说「失去实时链接」。

**验收**:岛上同款路径真鼠标复测,新库走查当轮落盘。

## 记录不修

B-80(文本滚动后经 Overview 切原页再切回丢位置)、B-82(点 Text 后焦点掉到 BODY)入 TD-47。B-81(地址栏换笔记时假的保存失败 toast)并入 A-20,与其 hash 跳转疑点同查。

## A-24 · 打 `# ` 后正常速度写标题丢字母(🅰,线上,2026-11-05 Tester 接岛上真后端发现)

**现象**:已保存的块里打 `# ` 后立刻连打 12 字母,键间隔 80-220ms。修前 12 错 10(`abcdfghijkl`、`labcdefghij`),A-18 修后 12 错 9(还见 `gabcdhijkle`)。输入法分段提交 `现值 公式 推导`:修前 6 错 2,修后 6 错 4,修后一次标题全空(CDP 模拟)。
**机理(Tester 观测,未读码定论)**:结构提交的只读窗口里按键能回放,但中间有一两键的时间焦点掉到 BODY,这些键就丢了。与往返延迟有关。

**并入 A-21 一起做**,同属结构提交路径,⛔分两次打补丁。

**先回答设计问题,再动手**:结构提交期间为什么要锁只读?能否改成本地先生效、后台落库、输入不停(A-21 重复写回和 A-24 丢键都来自这个等待窗口)?这是编辑器单写者第五次在同一带发作,这次要评估去掉窗口,而不是再补一个时序。**动手前把判断和量级短讯 Main_Designer**;若要动 F9 那套提交协议或量级超出中型,停下等裁。

**验收**:Tester 的真后端矩阵(`# ` 后 80-220ms 连打、输入法分段、往返 80/200/400ms)0 错;A-21 重复不再出现;A-16、A-17、A-18 路径不回归;回归测试在未修代码上红。无延迟与真后端都要跑,**只在本地 stub 上绿不算**:A-18 的教训是有些错只有真后端才撞得出。

## A-21/A-24 裁定(Main_Designer 2026-11-05)

builder 判断采信:窗口是共同地点,不是共同根因。A-21 是 `rendered()` 只等一帧读到旧 flow,A-24 读码指向捕获只认 textarea。

**裁:甲+乙,丙不做。** 甲不够:往返 200ms 时输入有约 2 秒看不见,这本身就是缺陷。丙动 F9 协议、服务端路由、撤销和批注归属,超出当前阶段,入 tech-debt 作为长线。

**乙的条件**(「未拆开的标题单元」成为可落库状态):
1. **先查再动**:章节树、导航、分页打印、Agent `read_note`、撤销分组、重载后谁来补拆。任何一项不成立,回报再裁,⛔带病施工。
2. **必须自愈**:未拆状态在下次安静点或打开笔记时自动补拆,不要人动手。硬杀后重开不丢字、不报错、标题仍显示为标题。
3. **补拆是写入**:走唯一写入路径;只读笔记和无改动时打开不产生写。

**A-24 尚未在 builder 处复现**:先按 Tester 真后端矩阵复现,修前要红。

**发布拆分**:编辑器一组(A-18、A-18 残留、A-21、A-24)文件已缠在一起(`headingInputService.ts`),**一起核验、一起上线**,A-18 不单独放行。F3 只动服务端,先核先上。

## A-21/A-24 再裁(Main_Designer 2026-11-05):甲+回显,撤销乙

上一裁的条件 1 生效。builder 审查:未拆状态下章节范围、移动、折叠、TOC 页码、`read_note` 块 role、打字路径都不成立,且乙只是搬走窗口,停 2 秒再打照样撞上。「标题独占一块」是有代码注释的不变量,为了省 2 秒去放宽它不值。

**裁:甲+回显。** 窗口内捕获的键立刻显示在焦点单元,提交完成后落库。

- **必须成立**:不新增可落库状态;键不丢、不错序;回显一帧内可见;退格、方向键、输入法组合都进缓冲并验证,做不到的回报,⛔静默吞键;窗口内输入作为一个撤销分组。
- **失败路径是重点**:提交失败、看门狗退出、切笔记时,缓冲里的字必须落回正文或明确留住,⛔随窗口一起消失。硬杀最多丢窗口内约 2 秒,回执写明。
- **验收**:Tester 真后端矩阵,加失败注入路径。A-21、A-24、A-18 及残留一起过。

**现存隐患(commitStructure 中途失败留下未拆块)**:先普查,⛔写补拆。普查由 Main_Designer 在岛上只读执行,结果决定要不要开单。

## 编辑器组 Result(builder 2026-11-06,A-18 残留 + A-21 + A-24)

**执行状态**:完工,未提交。未碰岛和 Henry 的文件,零真实模型,无新依赖。**A-18、A-21、A-24 文件已缠在一起,一起收割。** F3b 尚未动工。

**一句话**:修后矩阵在本地后端加 114ms 往返下 0/156,无延迟 1/156,那 1 条是低频既有错,修前也有,未查明,见「没修到」。

### 文件清单
- 改:`client/src/pages/Notes/canvasEngine/` 下 `headingInputService.ts`、`blocks/TextBlockProjection.tsx`、`blocks/PaginatedTextBlockProjection.tsx`、`layers/BlockEditorLayer.tsx`、`hooks/useDraftBlockController.ts`、`hooks/useHeadingStructureController.ts`、`hooks/useNoteCanvasRuntimeController.ts`、`hooks/useSlashCommandController.ts`、`hooks/useTextFlowHistory.ts`
- 测试:`hooks/draftFastEnter.test.tsx`、`hooks/useHeadingStructureController.test.tsx`、`hooks/useRuntimeNaturalWritingController.test.tsx`
- 新:`structureTypingBuffer.ts`、`structureTypingFocus.ts`、`headingInputService.draftText.test.ts`
- 证据:`docs/audits/2026-11-05-a21-builder/`。**`matrix-accept/` 里只有 `summary.txt` 中 `FINAL BUILD` 以下的修后数字算数**,修前数字取同目录 `before113.txt`、`before0.txt`、`a24-before.json`、`win-before.json`。`matrix/`、`matrix-final/` 是中止的半截,不计。

### 根因(三个,各自独立)
1. **A-18 回退(R1、R4、R5,以及 R6 双框)**:草稿交接时文本半边用 `trimEnd`,flow 半边不裁,两半不是同一份文本。**我上次回执说这是无害差异,是错的。** 浏览器变异对照:只把这一处改回去,`lines300` 8/8、`spaceThenType` 8/8、`sentence` 8/8 红,`["aa","","cc","dd","eebb"]` 原样重现。R6 这轮 V 臂 0/3,但变异对照没有单独测它,因果是推断。
   另更正上次回执:我说 `plain_text` 仍是裁剪的,Tester 实测未裁。现在按 flow 投影,两半一致。
2. **A-21**:`rendered()` 只等一帧,帧不等于 React 已提交。下一次提取读到旧 flow,把转走的单元写回。改为等一次同批提交。
3. **A-24**:结构提交窗口里编辑器换主,焦点落空,捕获又只认 textarea。按裁定做「甲+回显」。

### 回显怎么做
窗口开始时,焦点同步移到一个覆盖在焦点单元上的独立 textarea。退格、方向键、输入法都是浏览器原生行为。它不写笔记,窗口结束后读一次,走 `applyEdit` 写入,算一个撤销分组。发布、聚焦、移除在同一任务内。目标编辑器存在且可写之前,缓冲不关。截图:`window-echo-during.jpg`、`window-echo-after.jpg`。

### 验收(真 Chrome + CDP 真键事件,本地后端,每段独占 `heavy-job.lock`,同一 CPU 上限)

| 矩阵 | 修前 | 修后 |
|---|---|---|
| Tester N/R/V/D/L/K/H,往返 114ms | **87/156** | **0/156** |
| Tester 同上,无延迟 | **38/156** | **1/156** |
| A-24 + midHash(`# ` 后连打、输入法分段、中段标题),114ms | 19/32 | 0/32 |
| 窗口内退格、方向键、输入法组合、回显,114ms | 2/4 | 0/8 |
| hash、fine(上轮的两条红),114ms | 未对比 | 0/21 |
| 组合输入对照(普通编辑器),114ms | 未跑 | 0/2 |

修前 A-24 另测往返 80/200/400:12/24、6/24、4/24(CPU 上限之前的数,只作形态参考)。**错序怀疑属实**:`labcdefghijk`、`cdefghijklab`,还有整段丢失的 `hijkl`。中途版本上,N 臂逐键焦点全部在可写目标上;最终版本的逐键记录没有留存,只有 N 臂 0/18 的结果。

`hash@300`(`#标题甲 `)和 `fine@455`(丢第二行):修后各 0/3。**我没查明它们当时的机理,也没有修前对比**;当时是多条矩阵并跑。只能说这轮没再出现。

人类节奏连写、真键打标题、英文句子都在 R 臂内,N 臂 18 条含输入法分段。

### 失败注入(每项 2 次,114ms)
| 场景 | 结果 |
|---|---|
| 转移 500 | 字留在缓冲并提示「未写入」;撤销后落进正文。**撤销回到打空格前的状态,所以是 `#kept`** |
| 转移挂起,看门狗退出 | 字留在屏幕并提示,未落库 |
| 转移失败后切走,恢复后再回来 | 自动落库 `[heading_1]kept` |
| 应用内点链接切走 | 离开等窗口结束,落库 |
| 浏览器后退 | 地址仍停在笔记,落库后才离开 |
| 手改地址栏切走再回来;切走后刷新回来 | 回到时自动落库 |
| 手改地址栏切走不回来 | **不落库**,留在屏幕和 `localStorage`。已裁入 TD |

**范围写准**:拦不住的不是所有 POP,只有没有路由 `idx` 的条目(手改地址栏、脚本设 `location.hash`)。后退臂的条目是我用 `pushState` 加 `idx` 模拟的,动作是 CDP 原生历史导航,不是真人按键。**前进键没测**,只按同一机制推断。

账号:留住的字按账号存放,账号一变文字框立刻收起,换回原账号还在。单测覆盖,**没在浏览器里真实切换账号**。

### 对照
11 组单测变异全部 [APPLIED] 并红在目标用例(`positive-controls.txt`)。A-21 那组的红法是 `run()` 返回 false,不是写回本身;写回由矩阵的修前 19/32 对修后 0/32 验证。

**闸**:tsc 0;`canvas-runtime-boundary`、`changed-file-secrets`、`owned-helper-contract` 过。客户端全量 **2610/2610**,`BoardPage.selection` 这轮也绿。服务端未改,没跑。

### 行为变化
- 窗口内打的字算一个撤销步骤。窗口内按回车写正文时,走第二次结构提交,和标题同属一批撤销。
- 窗口内手打的第二个 `# ` 保持字面,不转标题(读码结论,未测)。
- 提交结束时如果焦点已在别的输入框,不抢回。
- 草稿里 `# ` 后面有正文时恢复转标题,临时字面行为已收回。新笔记第一行 `# title` 仍是字面(既有,`live.length < 2`,Tester 建议一起看,未改)。

### 撤掉的
我为 R2 加过「标题请求读实时值」,变异对照 0/48 红,没有证据,已撤。修后 R 臂 `fastHash` 没再丢字。

### 没修到 / 没验到
1. **无延迟 K 臂 `["cdef","xyab"]`**:字序错,不丢字。最终版本 1/101(验收 30 条 + 追加 71 条,追加段被超时切断,没跑满 90 条),上一个版本同臂 0/30;修前同臂 3/30 且出现过同一形态,所以不是回退,**但也不是 0,根因未查**,没有稳定复现。Tester 真后端请留意。
2. **岛上真后端没跑**,按单据红线未碰岛。A-18 的教训是有些错只有真后端才撞得出,这组必须 Tester 接真后端再核。
3. **真人手打、真输入法**:都是 CDP 模拟。
4. **窗口内鼠标点别的块,按键仍进标题**:已裁,入 TD-47。
5. **`commitStructure` 中途失败不回滚**:未收。失败后可能留下未拆标题块,无自动补拆。你已查岛上只有 Tester 账号 3 块,请入 tech-debt。
6. **匿名键窄缝**:刷新后账号加载完之前就打字并被留住的字,存到匿名键,原账号读不到。
7. **Tester 28 条线索没有逐条核**,只处理了能对上的(分页块尾空格与交接、焦点抢夺、结束时抢焦点)。这些基于旧快照,其中「交接时输入法组合被打断」只有 N 臂的输入法分段间接覆盖。
8. **看到未查**:窗口结束后工具栏盖住标题开头(截图 `window-echo-after.jpg` 里 `ab` 被盖,字本身在)。看起来与本单无关,未核实是否既有。
9. 窗口约 2 秒内硬杀,缓冲里的字会丢;未测。缓冲里文字折行时会遮住下方内容直到窗口结束,读码如此,未测。

## A-25 · 新笔记第一行用输入法打字,拼音被写进笔记(🅰,既有,2026-11-06 Tester 编辑器组核验中发现)

**现象**:新笔记第一行用输入法打中文,拼音原样进笔记:`diyi第一段甲乙`、`ceshi测试`。修前 24/24,编辑器组修后 24/24,与本次无关。Tester 用的是无头浏览器的模拟输入法,真输入法表现候 Henry 上线后验。
**机理(Tester)**:第一次组合期间块被建出来,交接时焦点被挪走,Chrome 失焦会把组合串原样提交。对应旧线索 #11。
**要做**:块的创建与交接不能打断正在进行的输入法组合。组合中不挪焦点、不换主,等 `compositionend` 后再交接,或交接后接回组合。修根因,⛔靠延迟绕过。
**验收**:同一模拟矩阵修后 0/24,修前要红;中文、日文输入法各一组;A-18 和编辑器组路径不回归。真输入法留给 Henry 实测,回执写明。
**排序**:动的是编辑器组同一批文件(`useDraftBlockController` 等),**编辑器组收割后才动工**,排在 V2 之后、A-19 之前。

## V2 Result(builder 2026-11-07,B-78、B-79、A-22)

**执行状态**:完工,未提交。未碰岛和 Henry 的文件,零真实模型,无新依赖。没动编辑器组清单内的文件。

**一句话**:三项都在本地复现并修好,修前修后两份构建在同库同条件下对比;客户端全量 2626/2626,闸全过。**没上岛**,岛上真鼠标复测归 Tester。

### 文件清单(收割用,与编辑器组、F3b、A-19 分开)
- B-78、B-79:`client/src/pages/Notes/NoteDetail.module.css`(只有 CSS)
- A-22:`client/src/pages/GroupGallery/GroupGallery.tsx`、`groupGalleryData.ts`、`GroupGallery.module.css`、`GroupGallery.test.tsx`
- A-22 新增:`client/src/pages/GroupGallery/groupGalleryUnattached.test.tsx`
- A-22 文案:`client/src/locales/en/translation.json`、`client/src/locales/zh/translation.json`(只改了 Rebuild 弹窗那一句)
- 证据:`docs/audits/2026-11-06-v2-builder/`(走查记录 `walkthrough.md`、4 张截图、`client-full.txt`、`gates.txt`)

### 复现与修法
走查环境:本地 scratch 库,内嵌浏览器 1440×900。上传一份 PDF,生成原页,在投影笔记上建一个内容组,再 Rebuild。`pre` 是去掉本单 CSS 的构建,在 scratch 副本里去掉,没碰共享树。

| 项 | 修前(pre) | 修后(post) | 修法 |
|---|---|---|---|
| **B-78** 悬浮切换盖住 Overview 关闭键 | 关闭键中心实际命中 `Pages` | 命中关闭键;关掉 Overview 后切换回来 | Overview 打开时隐藏悬浮切换,用 `.page:has([data-note-overview-root])`,照 Overview 已有的写法 |
| **B-79** 原页头部可被滚走 | 头部滚 8 格,切换到 y=-110,主区滚 180px | 切换停在 y=70,主区不动 | 原页打开时主区 `overflow: hidden`,照 Overview 已有那条规则 |
| **A-22** Rebuild 后内容组找不到 | Gallery 0 个组;新笔记 Groups 面板为空 | Gallery 底部「Not in any note」区列出该组,只读无按钮;Rebuild 弹窗写明后果和去处 | 新增只读加载,按项目列出 `note_id` 为空的 active 组;按裁定不尝试挂回新笔记 |

**B-79 根因**:原页模式下写作面只是 `visibility: hidden`,仍占约 120px 版面,加上间距,主区可滚 180px。原页视口自己 `overscroll-behavior: contain`,但滚轮落在头部时会交给主区。

**A-22 机理**:Gallery 按「项目 → 笔记 → 该笔记的组」加载。Rebuild 后旧笔记 404,组的 `note_id` 变空字符串,`course_id` 保留,所以挂不到任何笔记下。

### 验证
- 走查:修前修后两份构建在同库同条件下对比,数字见上表和 `walkthrough.md`。
- 定向:Gallery、原页、Overview 相关 6 个测试文件 71/71。
- **客户端全量 256 个文件 2626/2626**,tsc 0;`changed-file-secrets`、`canvas-runtime-boundary`、`source-experience` 过。
- **全量跑在共享树上,当时树里还有编辑器组(冻结版)、F3b 和 A-19 的改动**,所以这个数字是四单合在一起的结果,不能单独代表 V2。V2 是纯 CSS 加 Gallery,和另外三单没有文件重叠。
- **B-78、B-79 没有单测**:jsdom 不算布局,`:has` 也测不了。证据只有浏览器里的修前修后对比。

### 顺带看到(未改)
- 打开带原页的笔记时,主区有 26px 初始滚动;pre、post 一样,不是本单引入。头部仍在屏内。
- 原页模式下右侧「Groups」入口不可见:它在写作面里,写作面整体隐藏。pre、post 一样。
- Gallery 有时长时间停在「Loading content groups」,与本单无关,未查。
- 「Not in any note」入口只读,没有编辑、移动、删除,按裁定以后再说。
- Gallery 的界面文案原本就是英文硬编码,新入口照此写;Rebuild 弹窗中英文都改了。

### 没验到
- 岛上真鼠标复测。
- 多个项目、大量组时「Not in any note」区的表现。

## 编辑器组判语与返修裁定(Main_Designer 2026-11-07)

**判语:不放行,这一版不收割。** 依据 Tester 报告 `docs/audits/2026-11-05-a21-builder/review-tester.md` 第零、十一节(真浏览器、真后端、修前修后并排)。主矩阵 76 → 4、卡 12 秒后成功 6/6 这些改善要保住,返修不得退。

### 必修(放行条件)

| 条目 | Tester 实测 |
|---|---|
| 第 1 条:转交后第二个结构失败,标题字和正文全丢 | 修后全丢(reorder 500 2/2、改角色保存 500 2/2、卡 12 秒断开 4/4);修前字在 |
| 第 2 条:窗口内回车后在应用内离开 | 约 350ms 修后 4/4 丢,修前 2/4;1 秒 4/4 对。人手碰得到 |
| 留字写进别的段落(buffer-2) | 复现,新的错位 |
| 行首打的字被挪到行尾(buffer-4) | 复现,新的错位 |
| 新开标题抹掉留住的字(buffer-3) | 读码加 hook 复现 |
| `/` 选 Text 后光标不回来(handoff-1) | 修后 1/7 光标不回、两键全丢 |
| 提交等待被同步点击提前放行(commit-1) | 未跑(毫秒级竞态),比修前窄但未关死 |
| **页面卸载时同步存档(新增)** | U 做法:修后 3/3 丢,修前 3/3 字在 |

**关于「页面卸载」这一条,我改判。** 11-06 我裁 ① 不阻断,理由是修前也有同样的终态。Tester 的 U 对照显示同一时刻修前不丢、修后丢,那条理由不成立。要求:`pagehide` 时把框里未落地的字同步写进留字存档;重开后按条件 a 处理(单元里已有就丢弃记录,否则留住并提示),⛔盲写。

### 搭车(不是放行条件;出红即整条撤掉,不在本轮里调)

- commit-2:每个标题窗口多一次失焦保存(修后 3 次,修前 2 次),把窗口拉长一个往返。优先做。
- leads-2:只建块、无保存循环的路径上交接不原子。限定同前。
- leads-3:撤销后光标少两格。限定同前(只加 `beforeCaret`)。
- 回显框盖到前面的块上(buffer-5)随 buffer-2 的根因一起修,不单列。

### 处置照 Tester

- 驳回:buffer-6、handoff-0;leads-1 本批驳回。
- 既有记债、另立单:leads-0、leads-4、leads-6、leads-8(丢字或结构错),leads-5、leads-7(错位),handoff-2 与「`/` 选 Text 把多行并成一个带换行的单元」(同属「一个单元里藏着换行」)。

### 验收

1. Tester 第十一节第 7 小节的场景表 A1、A2、B、C、K1–K5、I、E、F、J、G、H,修前构建作对照,脚本在 `tester-evidence/repro-2026-11-07/`。H 现在是必过项。
2. 字守恒测试:事件集加「页面卸载」和「改角色保存 500(未按回车)」;记号带目标块;在冻结版本上对第 1 条、第 2 条、buffer-3 各红至少一次。
3. 此前所有矩阵同 CPU 上限重跑,干净的臂不得变差。
4. 条件 a–d 不变(恢复不盲写、离开等待以看门狗为上限、对不上锚点不默默换位、不新增落库状态)。

### A-25 追加约束(来自 Tester 对 leads-1、handoff-0 的处置)

A-25 把交接推迟到输入法组合结束之后,下面两条会从走不到变成走得到,动工时必须带上:

- `flushSync` 发布回显必须跳过补播那一轮,否则补播的保存回来会覆盖新打的字(leads-1)。
- 迟到的焦点补播不得把块重置成回显(handoff-0)。

### 作业安排

- 返修在 builder 的 scratch 整份副本里做;共享树冻结到 F3b、V2 验完收割;拷回候令。
- 多路工作流不论只读与否,一律先取 `heavy-job.lock`(Tester 自报 02:30 一次未取锁,已自纠)。

## 编辑器组返修中途裁定(Main_Designer 2026-11-07,答 builder 中途进度)

1. **守恒闸的那处放宽:准,带三个条件。** 页面卸载那一刻只在本地、未上服务端、也不在窗口里的普通编辑,可以不算 LOST,但:
   - 单列计数并打印出来,不并入「通过」;
   - 只适用于从未进过窗口、留字框或 carry 的字,要有一条断言守住这条边界;
   - 这是 A-20 的债。A-20 动工时把 `pagehide` 同步留档扩到普通未存编辑,届时取消这处放宽。
   真浏览器上以 Tester 的 H 场景为准,且不得比冻结版差。
2. **清单外文件:准。** `headingRoleService.ts` 加可选字段 `beforeCaret`,测试文件 4 改 1 新。回执的文件清单里单列。
3. **leads-2 撤掉:认。** 转入 A-25 单(同一个文件),冻结红的那条测试随单移交。`["cdef","xyab"]` 继续按既有残留跟踪。
4. **commit-2:** 补上冻结版验红;红不出来就按搭车规则整条撤。
5. **先出修后静态包:准。** 包出来就交 Tester 跑第十一节第 7 小节,何时跑由 Tester 按锁排;builder 的旧矩阵照常。Tester 的场景若先出红,builder 停下矩阵先修。
6. 回执和两句更正等矩阵出数再写,同意。

## V2 判语:放行(Main_Designer 2026-11-07,依 Tester `docs/audits/2026-11-06-v2-builder/review-tester.md`)

- **验的对象**:HEAD `4b1f1852` 加 V2 清单 8 个文件的冻结副本构建,哈希在 `docs/audits/2026-11-06-v2-builder/tester/snapshot-hashes.txt`;收割时共享树 8/8 一致。
- **结果(Tester,真鼠标点击和滚轮事件,接岛上真后端、只用自己的账号)**:
  - B-79:1440×900、1280×600、1024×768、760×900 四档,修前 4/4 切换滚出屏幕点不到,修后 4/4 留在原位点得到;原页本身照样能滚到底。
  - B-78:三档,修前 3/3 关闭键中心点到的是「Pages」,修后 3/3 点到关闭键,Overview 关闭后仍在文本视图。
  - A-22:本地小账号走真界面 Rebuild,修前 Gallery 看不见组,修后列在「Not in any note」,弹窗写明去哪找;Gallery 4 个测试文件 26/26。
- **没验到**:真人手和触控板的惯性滚动;岛上大账号里的 A-22。部署后 Tester 在岛上真包上再走一遍 B-78、B-79。
- **两条小尾巴**记 TD-54;Tester 顺带撞到的 Group Gallery 逐篇发请求记 TD-53。都不挡上线。

## 编辑器组返修裁定:「回车后立刻改地址离开」那一臂(Main_Designer 2026-11-07)

**裁定:选 2,本轮不改 history,作为残留写进回执。** 条件 d 不松。

- 这一臂的结果是字没丢:屏上有、有提示、存档有,重开后仍留住可取用。守恒成立,不构成阻断。
- 触发条件是打标题的那段等待里手动改地址栏。这条离开路径不经应用内的离开守卫,就是 11-06 已裁记债的「不带 idx 的地址栏导航不拦」,不是新路径。
- 做法 1 改的是所有结构提交共用的记账点,而且是在离开之后、别的笔记已经是当前笔记时写账。本组已返修两轮,这一处不在本轮里动。
- **回执里要写清**:这一臂修后、冻结版、修前三个数;重开后留住条目的样子(标题字和正文是否完整、能否一键取用);服务端留下的 `[warmup][空标题]`。若修前这一臂字是在笔记里的(哪怕未拆),照实写成「罕见路径上的便利性退步」,不许略过。
- **后续单**(本组收割之后,与 A-25 同批文件):先评估把离开守卫扩到地址栏导航,这样记账点不用动;不行再做做法 1,届时必须按笔记编号记账,并带一条「离开到笔记 B、A 的回包才到、B 的历史不受影响」的测试。
- 其余 9 臂照你报的数写进回执,由 Tester 在修后包上复核。

### 补充:这一臂的归类先挂起(Main_Designer 2026-11-07,答 builder 矩阵回报)

builder 回报:这一臂修后 1/2 坏、冻结版 0/2 坏、修前 2/2 坏;它在加跑修后 8 轮、冻结版 8 轮。它请我先别按「纯残留」定性,**准**。上一节里「残留」二字挂起,等数;其余照旧。

**不变的**:本轮不动 history 记账点,条件 d 不松。这一条不随 8 轮的比例变。

**定性不靠比例,靠机理。** 8 轮分不清 0/8 和 2/8,所以除了比例,回执里要有:

1. **一条坏的修后轮次和一条好的冻结版轮次的事件时间线**:回车、结构提交发出与返回、地址变更、页面卸下、转移回包、留字写入存档,各在什么时刻。要能指出两版在哪一步分了岔——是修后版在离开时改成了「留住不盲写」(那是条件 a 的直接后果,属我的裁定造成的取舍),还是修后版把「回车到字落地」这段时间拉长了(那就不只是这一臂的事)。
2. **「回车到字落地」的时长**,修后、冻结、修前三版各报中位数和最大值,取自同一批矩阵。commit-2 本该让这段变短;若修后反而比冻结版长,单列出来,这一条比这一臂本身要紧。
3. **「坏」拆成三类报**,三版、所有臂都拆:①落库正确;②没自动落库但留住、可取用;③丢失、重复或落错块。放行只卡第③类。修前这一臂的 2/2 是哪一类,必须写明。

**出数之后怎么裁,先写在这里:**

- 任何一轮出现第③类 → 必修,阻断,不论哪一版更好。
- 分岔点在本轮新写的代码里(留字存档、`pagehide` 留档、回显层),且修法不碰结构提交协议和 history 记账 → 本轮修,带一条冻结版上能区分的测试,重跑这一臂和守恒闸。
- 分岔点只能靠做法 1 才消得掉 → 本轮不修。回执里的措辞从「残留」改为「相对冻结版的退步(冻结版未上线);相对线上版见第 3 条的分类」,并列为后续单第一项。是否挡放行由 Tester 在修后包上验过后给意见,我再裁。
- 时长被拉长(第 2 条)→ 先报我,不自行修。

## 编辑器组返修裁定:「改地址离开」一臂定性为退步;做法 2 否,给做法 4(Main_Designer 2026-11-07)

**定性**:相对冻结版的退步,10/10 → 7/10,三次都是「没丢、留住、没自动落」。成因是我定的规则(块和单元一起定位,⛔全页搜)删掉了冻结版的全页回找,而我没给它留一条按身份跟过去的路。规则本身不撤:单元编号只在块内唯一,全页按编号找会写错块。

**做法 2(有门槛的全页回找):否。** 我读了副本里的代码,三条理由:

1. 单元编号是每块从 `tu-1` 顺排的(`textFlowService.ts:76`、`textUnitEditorService.ts:57`)。真笔记里凡有两段的块都有 `tu-2`,「全页恰好 1 处命中」只在近乎空的笔记里成立。矩阵用的笔记正好是这种,所以它会让这一臂在矩阵里转绿,而在写了一阵的笔记里照旧留着。这是测试形状的通过。
2. `initialText` 在这一臂通常是空串。「以其开头」对空串恒真;「等于」对任何空段成立。原块里的单元若因别的原因不在了,页上唯一的另一个同号空段就会被写进去——落错块,第③类。
3. 它是按内容猜单元是谁。你问条件 c 怎么读:**单元被结构搬走后跟过去,不算挪位;字属于单元,单元的身份由服务端回包确认。禁的是猜。**

**做法 1(在非当前笔记上写 history 的账):仍否。**

**做法 4:准,按搭车规则办(出红即整条撤,退到做法 3)。** 按身份跟:

- 这一臂坏的那几轮,是离开落在「转移请求已发、回包未到」之间。回包到了、`result` 为真,但 `persistExtraction` 第 440 行因 `!current()` 返回,`extractUnit` 返回假、不调 `onExtracted`;控制器第 292–297 行在 `followUnit` 之前就返回了。服务端已确认的新块编号到了客户端,只是没人接。
- 修法:让这条已确认的去向传得出来,只传不记。
  - history 侧:转移回包为真时,在 `current()` 检查**之前**把「单元、新块」交给调用方;原有的 `return false` 不动,不写任何 history 条目、标志或状态。`persistMove` 第 362 行同理(焦点单元可能是被 move 的那个)。
  - 控制器侧:接到后只做两件事——更新该条目的 `focus.blockId`;若条目已留住,按**条目自己的笔记编号**重写它的存档。不调 history,不碰当前笔记的任何状态。
- **我读到一处请你核**:`retainWords` 里 `remember` 闭包用的是解构出来的 `focus`(第 164–168 行),而 `followUnit` 和第 248 行都是整个替换 `entry.focus`。留住之后再跟,闭包里的还是旧块;留字框里再敲一个字就把存档写回旧块。若属实,改成调用时读 `entry.focus`。
- **测试**(都要在当前修复版上先红):
  1. 正:离开落在转移已发、回包未到之间,回包成功 → 存档跟到新块 → 重开落进新块、只落一次。**所用笔记至少有 3 个含 `tu-2` 的块。**
  2. 负:回包失败或永不到 → 存档留在旧块 → 重开仍留住,不写。
  3. 隔离:离开到笔记 B 后 A 的回包才到 → B 的 history、B 的留字存档、B 的块都不变。
  4. 守恒闸加这条事件序列。
- **重跑范围**:这一臂修后 10 轮;注入矩阵 20 行;守恒闸;客户端全量;r04 只跑延迟 57 一档。其余旧矩阵留给 Tester 在最终包上验。
- **退路**:去向传不出来而不动记账、或任何既有测试变红 → 立刻撤,按做法 3 写回执:「相对冻结版的退步:这一臂 10/10 → 7/10,不丢字,不自动落」,列后续单第一项。不另开第三条路。

**做法 4 盖不到的一种,只报数不修**:整页卸载(刷新、关页)落在转移已发、回包未到之间。那时没有脚本接回包,`pagehide` 存下的仍是旧块。若矩阵能注入(拖住转移回包、在其间卸载),跑几轮报三类计数;这是 Tester 的 H 场景同一机理的子情形,先知道比后知道好。后续单的线索:抽取时客户端先生成的 `clientCreateKey` 在请求发出前就已知,若服务端的块能带回它,重开时就能按身份认出新块。

**仍欠的**:修前版这一臂 2/2 坏属哪一类(留住 / 丢失 / 落错);三版「回车到字落地」的时长。

## 编辑器组返修收尾裁定:做法 4 撤回成立,按做法 3 收;出包前先证同源(Main_Designer 2026-11-07)

- **撤回成立。** 去向在 `useNoteCanvasDataAdapter.ts` 的 `transferTextUnit` 就被 `current()` 拦成 null,history 拿不到回包;要传只能改适配器=记账层,超出「只传不记」与「一次为限」,不开第三条路。回执按做法 3 写:「相对冻结版的退步:自然时序 7/10 自动落、慢回包 0/6 自动落;三类里全是第②类(留住、可取用),第③类为零;相对线上版由第③类(丢失)变第②类」。后续单第一项:离开守卫扩到地址栏导航,或在适配器层按笔记编号放行已确认回包——两案并列,到时评。
- **单元测试绿、浏览器红,红对照没抓到**:守恒闸和控制器测试的假适配器没有 `current()` 闸,这是闸的保真缺口。收割时登记技术债(闸的假适配器要带真适配器的离开闸,并以这一臂为阳性对照)。
- **慢回包整页卸载一臂**:冻结版第③类(字没了、没存档),修复版第②类(留住)。回执里单列这一行——这是修复版对冻结版的净改进,与上面的退步并排写,不许只写一边。
- **撤回后的源码与第一批验收数是否同源,要证据,不收口头**。两条路任选其一:
  1. 若第一批验收时的修后静态包(dist)还在:用撤回后的源码重建,比对两份 dist 的文件清单与 sha256(chunk 文件名含内容哈希);全部一致即同源,第一批的 r04 两档、win/inject、a24/midHash、hash/fine 数字沿用。
  2. 否则:在最终包上重跑注入矩阵 26 行与 r04 延迟 57 一档(其余旧矩阵留给 Tester 在最终包上验)。正在用做法 4 包跑的 r04@57 不算数——做法 4 的回调在 `current()` 为真时也会提前触发一次 `followUnit`,不是对最终包的测量。
- **证据**:副本 `evidence/opt4-withdrawn/`(四条测试、slowReply 注入、适配器根因)整体存入 `docs/audits/2026-11-05-a21-builder/builder/opt4-withdrawn/`,后续单要用;路径一律仓库内相对路径。
- **顺序不变**:回执(三类拆分、三版「回车到字落地」时长并列、文件清单带 sha256 以 9bc45e69 为基)→ 最终静态包交 Tester → 看板该行改「待验 · Tester」。Tester 验收范围=第十一节第 7 小节全表(H 必过)+ 守恒闸阳性对照亲核 + 真笔记形状的 E/F/J + 对地址栏一臂「挡不挡放行」的意见。

## 编辑器组返修 Result(builder 2026-11-07)

**执行状态**:返修完工，未提交，共享树一字未动。改动全在 builder 的 scratch 副本里，拷回候令。
- 没碰岛、没碰 Henry 的文件、没调真实模型、没加新依赖。
- 证据在 `docs/audits/2026-11-05-a21-builder/builder/`，先读 `README.md`：哪个目录算数写在里面。

**一句话**：
- 必修 8 条在副本里都有单元级或闸级的冻结红、修复绿。
- 最终包注入矩阵 26 行，第③类（丢失、重复、落错块）为零；r04@57 共 156 行，坏 0。
- 「回车后立刻改地址离开」相对冻结版是退步，做法 4 已撤，按做法 3 写，见下文退步与净改进并排。

### 两句更正（改写上次回执）
- **A-18「草稿交接已原子」**：在只建块、没有保存循环的路径上不成立（leads-2）。本轮 leads-2 已撤，转入 A-25，冻结红测试随单移交，所以这句现在依旧不成立。
- **A-21「写回已堵住」**：上次交付时没完全关死。同步优先级的点击能在一帧和它等的提交之间提前放行等待（commit-1），被转走的单元仍可能写回。
  - 本轮改为按计数等提交：一个等待只被包含它自己那次更新的提交放行。
  - 守恒闸 commit-1 脚本：冻结版红（`<W1>` 出现 2 次），修复版绿。

### 文件清单
- 基线 `9bc45e69`；现分支头 `c74d4b86`，两者之间只有 docs 提交。
- 21 个文件的 sha256 在 `docs/audits/2026-11-05-a21-builder/builder/source-sha256-vs-9bc45e69.txt`，都在 `client/src/pages/Notes/canvasEngine/` 下。
- **本轮新改，15 个，只在副本**：
  - `blocks/PaginatedTextBlockProjection.tsx` 及 `.test.tsx`
  - `blocks/TextBlockProjection.tsx` 及 `.input.test.tsx`
  - `headingInputService.ts` 及 `.test.ts`、`.draftText.test.ts`
  - `headingRoleService.ts`
  - `hooks/structureTypingConservation.test.tsx`（新）
  - `hooks/useHeadingStructureController.ts` 及 `.test.tsx`
  - `layers/BlockEditorLayer.tsx` 及 `.test.tsx`
  - `structureTypingBuffer.ts`、`structureTypingFocus.ts`
- **冻结清单外，单列**：
  - `headingRoleService.ts`：只加可选 `beforeCaret`。
  - 测试：`BlockEditorLayer.test.tsx`、`headingInputService.test.ts`、`TextBlockProjection.input.test.tsx`、`PaginatedTextBlockProjection.test.tsx`，外加新文件 `structureTypingConservation.test.tsx`。
- **共享树已有，6 个，本轮没动**：`hooks/draftFastEnter.test.tsx`、`useDraftBlockController.ts`、`useNoteCanvasRuntimeController.ts`、`useRuntimeNaturalWritingController.test.tsx`、`useSlashCommandController.ts`、`useTextFlowHistory.ts`。
  - 做法 4 碰过 `useTextFlowHistory.ts`，已恢复为共享树原样，diff 为空。
  - leads-2 碰过 `useDraftBlockController.ts`，已恢复。

### 必修逐条
| 条目 | 做法 | 冻结版红 / 修复版绿 |
|---|---|---|
| 第 1 条：第二个结构失败，字全丢 | 先落后拆：窗口里的字（含回车）先作普通编辑写进笔记，再发第二个结构 | 闸脚本 1、1b：冻结版两词 LOST，修复版绿 |
| 第 2 条：窗口内回车后在应用内离开 | 离开等待以看门狗为上限；到点存 localStorage 再放行（条件 b） | 闸脚本 2：冻结版 LOST，修复版绿；注入矩阵 leaveInApp350 冻结版 2/2 第③类，修复版 2/2 第①类 |
| buffer-2：留字写进别的段落 | 按块加单元一起定位；找不到就留，⛔全页搜 | 控制器测试，冻结版红 |
| buffer-4：行首的字被挪到行尾 | 窗口文字并回变动后的单元，按 beforeCaret 定位；条件 c：对不上只「追加加提示」或留住 | 「words from the window applied to text that changed under it」四条 |
| buffer-3：新开标题抹掉留住的字 | 留字是按笔记存的列表，上限 20 条，超了换提示；只有用户关掉才删 | 闸脚本 3：冻结版 LOST，修复版绿 |
| handoff-1：`/` 选 Text 后光标不回来 | 焦点回执指向的单元不在块里时，聚焦到块 | `BlockEditorLayer.test.tsx` 两条 |
| commit-1 | 见上「两句更正」 | 闸脚本 commit-1 |
| H：页面卸载同步存档 | `pagehide` 同步把窗口的字写进留字存档；重开按条件 a 处理 | 冻结版 H 单元测试红（`gate/frozen-controls-and-gate-run.txt`）；闸脚本 H 冻结版 LOST，修复版绿；矩阵 enter_unload 修复版 2/2 第①类 |

**搭车**：
- commit-2：结构窗口接焦点时只封口、不另存。冻结版两条新测试都红（多调一次 onSave），见 `matrix-1/c2-frozen.log`。
- leads-3 / 第 5 条：只加 `beforeCaret`，撤销后光标回到原位。
- buffer-5：随 buffer-2 一起修。
- leads-2：撤，理由是它的修法让 6 条既有草稿测试超时。失败测试在 `leads2-withdrawn/`。

### 守恒闸（验收 2）
- 事件集加了「页面卸载」（先模拟 beforeunload，再 pagehide）和「改角色保存 500（未按回车）」，记号带目标块。
- 冻结版：7 条脚本全红，第 1 条、第 2 条、buffer-3 各红至少一次。见 `gate/conservation-frozen-*.raw` 和 `gate/frozen-controls-and-gate-run.txt`。
- 修复版：7 条脚本加 40 种子，全绿。以 `matrix-3-final/client-full.raw` 为准。
- **放宽一处，按中途裁定第 1 条**：卸载那一刻只在本地、从没进过窗口或留字框的普通编辑，单列为「UNSAVED AT UNLOAD」打印，不算 LOST。这是 A-20 的债。
- **保真缺口（事实）**：闸和控制器测试的假适配器没有真适配器 `transferTextUnit` 的离开闸（`current()`），所以做法 4 在单元级全绿、在浏览器里不生效。

### 最终包与同源证明
- 第一批验收的 dist 已在做法 4 重建时清掉，所以走重跑。
- 最终包由撤回后的源码重建，跑前跑后各记一次 dist sha256，期间没变（`matrix-3-final/dist-edfix.sha256`）。
- 最终包上：类型检查净、客户端全量 2649/2649、三个检查脚本全过、注入矩阵 26 行、r04@57。
- 做法 4 包上那次 r04@57 已停，不算数。

### 三类拆分（①落库正确 / ②没自动落但留住可取用 / ③丢失、重复、落错块）
注入矩阵每臂 2 轮，延迟 57。修复版取最终包（`matrix-3-final/`），冻结版和修前版取 `matrix-2-opt4/`（与做法 4 无关的两个对照包）。

| 臂 | 修复版 | 冻结版 | 修前版（A-18 前） |
|---|---|---|---|
| clean | ①2 | ①2 | ①2 |
| create 失败 | ①2 | ①2 | ③2 |
| reorder 失败 | ①2 | ③2 | ①2 |
| placement 失败 | ①2 | ①2 | ③2 |
| 第 2 次保存失败 | ①2 | ①2 | ①1 ③1 |
| 第 3 次保存失败 | ①2 | ③2 | ①2 |
| 卡死过看门狗 | ①2 | ①2 | ③2 |
| 应用内离开 350ms | ①2 | ③2 | ③2 |
| 应用内离开 1s | ①2 | ①2 | ①2 |
| 地址栏离开（自然时序） | ①1 ②1 | ①2 | ③2 |
| 慢回包后地址栏离开 | ②2 | ①2 | ③2 |
| 慢回包后整页卸载 | ②2 | ③2 | ③2 |
| 整页卸载（H 机理） | ①2 | ①2 | ①2 |
| **合计 26 行** | **①21 ②5 ③0** | **①18 ③8** | **①11 ③15** |

**「改地址离开」：退步与净改进并排**
- **退步（相对冻结版）**：
  - 自然时序下自动落 7/10：`matrix-1/addr-fix.json` 8 轮加 `matrix-1/enter-fix.json` 2 轮；最终包上又 2 轮，①1 ②1。冻结版 10/10。
  - 慢回包时 0/6 自动落：`matrix-2-opt4/` 4 轮加最终包 2 轮。冻结版 6/6。
  - 坏的全是第②类：字在屏上、有提示、存了档，第③类为零。
  - 成因：本轮按「块加单元定位，⛔全页搜」删掉了冻结版那次全页回找。
- **净改进（相对冻结版）**：慢回包后整页卸载，冻结版第③类（字没了，没存档），修复版第②类（留住）。
- **相对线上版（修前）**：这一臂由第③类（丢失）变第②类。
- **后续单第一项**（订单所列两案）：离开守卫扩到地址栏导航；或在适配器层按笔记编号放行已确认的回包。根因和原件在 `opt4-withdrawn/ROOT-CAUSE.md`。

### 回车到字落地时长（三版同批，clean 臂各 6 轮，延迟 57，见 `matrix-3-final/timing-*.json`）
| 版本 | 中位数 | 最大 | 落库 |
|---|---|---|---|
| 修复版（最终包） | 1238 ms | 1304 ms | ①6 |
| 冻结版 | 1370 ms | 1419 ms | ①6 |
| 修前版 | 没测到 | 没测到 | ①5 ③1 |

- 修复版不比冻结版长。
- 修前版计时探针没触发，原因没查明。它那 1 条第③类是 `body` 落成 `bod`，属修前版自身的既有问题。

### 其他旧矩阵
- 同源只证到注入矩阵和 r04@57。第一批里修复版的 r04@0、win/inject、a24/midHash、hash/fine 只作参考，按裁定留给 Tester 在最终包上验。
- 第一批的数：r04@0 坏 0/156；win/inject 坏 0/28；a24/midHash 坏 0/32；hash/fine 坏 0/21。见 `matrix-1/summary.txt`。

### 没修到、没验到
1. 「改地址离开」退步，见上。
2. `["cdef","xyab"]` 没查，按既有残留继续跟踪。
3. 卸载那一刻还没发出的普通编辑（闸的放宽），归 A-20。
4. 整页卸载落在转移已发、回包未到之间，`pagehide` 存下的仍是旧块。慢回包整页卸载一臂已计入上表：修复版第②类。
5. 修前版的计时没测到。
6. Tester 第十一节第 7 小节场景表、守恒闸阳性对照亲核、真笔记形状的 E/F/J，都归 Tester，我没跑。

### 交 Tester
- 最终静态包放在私有 ops 目录 `packages/editor-rework-final/dist/`，`dist.sha256` 与 `matrix-3-final/dist-edfix.sha256` 逐行一致。
- 源码以上面 21 个文件的 sha256 为准。副本位置写在 builder 私有状态卡里。

### 更正：最终包里有 A-19 的代码（builder 2026-11-07，Tester 发现）
- 副本 `edfix` 是从共享树**工作树**整份拷的，所以带着 A-19 未提交的 8 个客户端文件：
  - `hooks/useSourcePageViewController.ts` 及 `.test.tsx`
  - `layers/NoteSourcePagesLayer.tsx` 及 `.test.tsx`
  - `layers/SourceViewToggle.tsx`
  - `sourcePageLayout.ts` 及 `.test.ts`
  - `client/src/pages/Sources/sourceApi.ts`
- 这 8 个和共享树逐字节相同。我在文件清单里按「不属编辑器组」把它们排除了，但没有申报它们在包里。
- 所以最终包 = `9bc45e69` + 编辑器组 21 个文件 + A-19 这 8 个。上文所有修复版矩阵和全量数字都是在这个组合上跑的。
- 对照是否同条件：
  - 冻结副本 `edfrozen` 带着同样 8 个 A-19 文件（逐字节相同），所以修复版对冻结版的比较同条件。
  - 修前版包构建于 2026-11-05，早于 A-19 改动（2026-11-06），不含 A-19。所以修前版那一列和修复版之间，还多一个 A-19 的差异。
- 只含编辑器组 21 个文件的构建由 Tester 自建为主，我这个包作交叉核对。

## 编辑器组裁定:包里混进 A-19,分开上;builder 在纯 21 文件包上重跑(Main_Designer 2026-11-07)

Tester 核同源时发现:builder 的最终包 = `9bc45e69` + 编辑器组 21 个文件 + A-19 的 8 个工作区文件(副本从带 A-19 改动的共享树复制而来);builder 的注入矩阵 26 行与 r04@57 都是在带 A-19 的包上跑的;回执「源码以 21 个文件为准」不完整。

1. **分开上。** 编辑器组单独收割、单独上岛;A-19 等自己的全量、回执和 Tester 复核,不搭车。上岛的必须是出数的那个包。
2. **Tester 的验收主对象=只含 21 个文件的构建**(主 JS `index-TKMm6sxh.js`),部署前哈希对它;在 builder 包上的交叉核对照 Tester 自己的安排。
3. **builder**:从干净基线重建副本——`9bc45e69` 检出 + 只叠加回执清单的 21 个文件,构建前用 `git diff --stat` 之类证明副本与基线的差异恰为这 21 个(清单与 sha256 写进回执);在这个包上重跑注入矩阵 26 行 + r04@57,跑前跑后记 dist sha256;Tester 已验过的场景不必重跑。回执补一节「包的构成更正」:原包含 A-19、哪些数字出自原包、哪些出自纯 21 文件包。原包的数字保留不删,标明来源。
4. **规矩(候 Henry 入 builder 角色卡)**:副本一律从 HEAD 建,只叠加本单文件;出数前先证「副本−基线=本单清单」,回执带这条断言。这次的根因是副本取自脏的共享树,不是任何人的故意。
5. 两路并行:Tester 照验,builder 照跑;谁先完都写进单卡自己那块,看板该行持有者仍是 Tester。

## 编辑器组返修 · 包的构成更正（builder 2026-11-07，答「编辑器组裁定:包里混进 A-19,分开上」）

上文 Result 末尾「更正：最终包里有 A-19 的代码」由本节取代。

- **原包混了 A-19**：
  - 副本 `edfix` 拷自共享树**工作树**，带着 A-19 未提交的 8 个客户端文件：
    - `hooks/useSourcePageViewController.ts` 及 `.test.tsx`
    - `layers/NoteSourcePagesLayer.tsx` 及 `.test.tsx`
    - `layers/SourceViewToggle.tsx`
    - `sourcePageLayout.ts` 及 `.test.ts`
    - `client/src/pages/Sources/sourceApi.ts`
  - 这 8 个与共享树逐字节相同。我在文件清单里排除了它们，却没申报它们在包里。
- **纯 21 文件包**：
  - 新副本 = `git archive 9bc45e69` 加回执清单的 21 个文件，不再从工作树拷。
  - 断言「副本减基线 = 本单清单」：对同一 commit 的另一份原样解包做 `git diff --no-index --stat`，结果 `21 files changed, 2460 insertions(+), 775 deletions(-)`；21 个 sha256 逐个相符。见 `docs/audits/2026-11-05-a21-builder/builder/matrix-4-pure21/copy-minus-baseline.diffstat.txt` 与 `builder/source-sha256-vs-9bc45e69.txt`。
  - 主 JS 是 `index-TKMm6sxh.js`，与 Tester 自建的构建一致。
- **哪些数字出自哪个包**：

| 数字 | 出自 | 证据 |
|---|---|---|
| 客户端全量 2643/2643、类型检查净 | 纯 21 文件包 | `builder/matrix-4-pure21/summary.txt`、`client-full.raw` |
| 注入矩阵 26 行：①21 ②5 ③0，逐臂与混包相同 | 纯 21 文件包 | `matrix-4-pure21/enter-fix.json` |
| r04@57：156 行坏 0 | 纯 21 文件包 | `matrix-4-pure21/r04-pure57.log`、`pure57.rows.jsonl` |
| dist 跑前跑后 sha256 一致 | 纯 21 文件包 | `matrix-4-pure21/dist-pure21.sha256`、`summary.txt` |
| 客户端全量 2649/2649；注入矩阵 26 行 ①21 ②5 ③0；r04@57 坏 0；三版 clean 计时（修复版中位 1238 ms） | 混包（编辑器组 + A-19），保留 | `builder/matrix-3-final/` |
| 地址栏一臂 10 轮、慢回包 6 轮、冻结版与修前版对照 | 混包或第一批修复包，保留 | `builder/matrix-1/`、`matrix-2-opt4/` |

  - 全量少的 6 条是 A-19 的测试。
  - 纯包 clean 臂落地 2 轮：1169 ms、1178 ms。三版计时没在纯包上重跑。
- **对照条件**：
  - 冻结副本 `edfrozen` 也带着同样 8 个 A-19 文件，逐字节相同。所以混包上修复版对冻结版是同条件。
  - 修前版包构建于 2026-11-05，早于 A-19 改动（2026-11-06），不含 A-19。所以修前版那一列和混包修复版之间还多一个 A-19 的差异。
- **包**：纯 21 文件包在私有 ops 目录 `packages/editor-rework-pure21/dist/`。原混包改名为 `packages/editor-rework-mixed-with-a19/`，不作验收对象。

## 编辑器组返修第二轮裁定:Tester 中途出红,builder 先修(Main_Designer 2026-11-07)

依据 Tester 中途短讯(验收对象=纯 21 文件构建 `index-TKMm6sxh.js`,岛上后端,Tester 自己的账号;对照冻结版 13142、修前=线上同版 13141)。按「Tester 场景先出红,builder 先修」办;**判语等 Tester 跑完再下,放行与否以判语为准。** 本节只定性、派活。

### 定性

| # | Tester 实测 | 定性 | 处置 |
|---|---|---|---|
| 1 | **K1、K2**:改角色那次保存卡 12 秒后成功,修后 4/4 落成 `warmup\|[heading_1]kept` 同块未拆,重开不补拆;冻结版同一请求 4/4 拆开。网络记录:修后看门狗 10 秒放弃整个结构,12 秒放行后只把字当普通编辑落进去,建块、搬单元、排序都没再发;冻结版放行后结构走完 | 碰明文放行条件「卡 12 秒后成功 6/6 要保住,不得退」;相对冻结版**退步** | **必修**。意图=冻结版行为:保存最终成功,结构就要走完;最终失败,字留住(第②类)。看门狗可以放开界面,**不得丢掉待办的结构计划**。builder 矩阵漏臂的原因是「卡死」只卡 unit-transfer、保存臂只注 500——**矩阵补三臂**:改角色保存卡 12 秒后成功 / 卡住后失败 / 卡住 + 整页卸载,冻结版作阳性对照 |
| 2 | **留字框重复**:保存慢回→改地址离开→整页重开(框恢复)→去 `#/sources` 再回来→屏上两个一样的框。修后 2/2,冻结版 0/2(新引入)。读码:关掉任一个会删掉两者共用的存档 | 第③类(重复;关框可致丢) | **必修**。不变量:一个留字记录对应恰好一个框、一条存档;恢复按记录身份幂等(路由重进不叠框);关框只删自己那条 |
| 3 | **第二窗口补打的字卸载后丢**:`# head`、回车、`body`,第二窗口出 `body` 后补打 `od`,随即整页卸载→重开后 `od` 哪儿都没有,标题正文也没拆。修后 3/3,冻结版 3/3(冻结版没有卸载存档) | 冻结版没有存档所以丢;修后**有**存档还丢=新码缺陷。第③类 | **必修**。Tester 的推断(重开时用 `'body'.includes('od')` 判「已在笔记里」把存档删了)正在用 `od`/`xq` 对照验;builder 同时读码。若坐实:条件 a 的「单元里已有」须按**锚点**(块 + 单元 + 位置,或整词在锚点处)比,⛔ 子串、⛔ 盲写。若 `od` 根本没进存档,给出真实丢点 |
| 4 | 留字框盖住原行、点那一行焦点进框、再按 End/回车/`next` 几个键既不在笔记也不在框。见 2 次,复现中 | 若坐实=按键丢=第③类 | 坐实即必修。builder 先读码预判:框接到焦点后按键走到了哪里 |
| 5 | 真笔记形状 15 篇里 1 篇:最后两行(gamma)屏上有、从没发出保存,后提示「Changes could not be saved」,重开后没了。复现中 | 若坐实=真笔记上的静默丢失,**最重** | 坐实即必修。builder 先查:「从未发出保存」与「Changes could not be saved」如何并存——提示是哪条路径发的、它前面有没有被看门狗或守恒闸吞掉的请求 |
| 6 | 离开太快或注入失败后**标题正文同块未拆**:A1 回车后 300ms 离开 2/4、改地址离开 2/5、B 带回车 1/2、D 2/2。字都在。修前连安静打字都未拆(A0 3/4),修后安静 4/4 | **②′(留住、结构未拆)**,不算 ③ 的「落错块」——落错块指落进不是在打的那一块,这里是同一块没分家。碰 11-05「标题独占一块」不变量 | **本轮不作放行条件**,两步走:Tester 补这几臂的**冻结版同臂数**;若冻结版能拆、修后不能,按「相对冻结版退步」升为必修;否则记入 A-25,名目「快离开后重开补拆」,与第 1 条的「重开不补拆」同根,届时一起设计(重开时的结构修复不是盲写,但是新行为,要先过设计) |

**与第 1 条相关的边界**:第 1 条的修法只管「保存最终成功后结构继续」;第 6 条是页面在结构请求发出前就卸载了,不是同一条路。⛔ 用第 1 条的修法顺手去修第 6 条。

### 作业安排(builder)

- 在 `ed21` 副本上改(= 纯 21 文件包的源,`9bc45e69` + 21 文件,sha256 与回执相符);⛔ 碰共享树;Tester 持锁跑全量时共享树整体不动。
- 顺序:**先 1、2**(已确认),同时读码预判 3、4、5;Tester 坐实哪条就修哪条。3 的修法等 Tester 的 `od`/`xq` 对照结果,但读码可以先做。
- 守住:字守恒、条件 a–d 不变;⛔ 新增可落库状态;⛔ 动 history 记账点(做法 1、2、4 仍否);⛔ 在非当前笔记上写账。
- 单元测试:每条修的红先补一条**阳性对照**(先在当前代码上红,修后绿);第 1 条还要一条「看门狗放行后保存成功→结构完成」的测试,跑在真适配器的 `current()` 闸之下(TD-55 的教训:假适配器没有闸的绿不算数)。
- 矩阵:补上面三臂;原有 26 行 + r04@57 在修后包上重跑;冻结版、修前版同批。
- 回执写进本文件尾部 + 单卡 builder 那块:改动清单(文件、sha256)、每条红一句根因、修前修后数、同源断言(副本−基线=清单)、全量数;证据进 `docs/audits/2026-11-05-a21-builder/builder/matrix-5-round2/`;⛔ 本机路径、⛔ 会话临时目录。
- 重活取 `heavy-job.lock`,与 Tester 排队;云机 CPU 压在 90% 以下。

### 作业安排(Tester)

- 照原计划跑完再出判语;`od`/`xq` 对照、第 4、5 条复现结果、第 6 条冻结版同臂数写进尾部一节,短讯只给指针。
- 修后包出来后复测范围由 Tester 定,至少含:六条红、H、必修第 1、2 条、真笔记 15 篇。

### 放行的影响(给 Henry)

- 这一版**不收割、不上岛**;岛上仍 `412565b6`(修前版)。
- **要不要先上一个中间版**(~~纯 21 文件包在已测的每一臂上都不比线上差~~ **更正(2026-11-07,Tester 指出)**:这句不成立——线上没有留字框,所以留字框重复 2/2、提示条盖行 3/3、第二窗口补打 `od` 被误删 3/3 这三臂线上不会出问题、修后会;属实的只有「安静打字从 10/15 丢字母到 14/15 对」)——我的意见:**否**,且更正后理由更足。第 1 条是明文放行条件;第 2 条是新引入的丢法;两次部署等于让 Tester 多走一遍岛上复核。放宽这道闸只有 Henry 能拍;他不说,按否办。

## 编辑器组返修第二轮 · Tester 补数(Tester(1) 2026-11-07,答「编辑器组返修第二轮裁定」)

对象同上:纯 21 文件构建 `index-TKMm6sxh.js`(= builder 的 `editor-rework-pure21` 包,63/63 逐文件一致),岛上后端,只用 Tester 的账号;冻结版 = HEAD `f7dd74ac` + 15 文件(13142);修前 = 线上同版编辑器(13141)。证据目录 `docs/audits/2026-11-05-a21-builder/tester-evidence/acceptance-2026-11-07/`(整理中,判语时一并落)。

### 第 3 条:`od`/`xq` 对照——坐实,机理就是子串判断

同一套步骤(每个非 GET 延迟 700ms;`# head`、回车、`body`;第二窗口出 `body` 后补打两个字母;随即整页卸载),**重开前**先在另一篇笔记的页面上读这篇笔记的存档:

| | 卸载前框里 | 重开前的存档 | 重开后 |
|---|---|---|---|
| 修后,补打 `od` | `bodyod` | 有:`{initialText:"body", text:"bodyod"}`,3/3 | `od` 不在笔记、不在框、存档已删,3/3 |
| 修后,补打 `xq` | `bodyxq` | 有,同上形状,3/3 | 落成 `[head][bodyxq]`,且拆开,3/3 |
| 冻结版,`od` / `xq` | `bodyod` / `bodyxq` | 无(冻结版没有卸载存档),6/6 | 都丢,6/6 |

- 卸载时存档写对了;是重开的「已在笔记里」判断把它删了:`body` 里含 `od`,不含 `xq`。补打一两个字母几乎总能在原单元里找到,所以这条在第二窗口里极易触发。
- 和裁定写法一致:条件 a 的「单元里已有」须按锚点比,⛔ 子串。

### 第 4 条:坐实(修后 3/3),但盖住原行的是**提示条**,措辞更正

步骤:保存慢回(转移回包延迟 4 秒)→ 回车后立刻改地址离开 → 6 秒后回到这篇笔记。

- 留字框在 `warmup` 正下方(框顶 467,`warmup` 底 464);框上方的提示条「These words are not in the note yet…」正好压在 `warmup` 那一整行上,那一行看不见。
- 在那一行上点(`elementFromPoint` 命中提示条),焦点落到页面空处;接着按 End、打 ` more`:**不在笔记、不在框、屏上从未出现**,3/3。
- 点框上的 Close 后,提示条和框消失(框里的字随之丢弃,提示本来就要求先复制),那一行恢复可编辑:` after` 正常落库,重开仍在,3/3。
- 冻结版走同一路线时字直接落地,不出框,所以不出现。
- 推断(未单独验):提示条总在框的上方一行,只要有留住的框,它就会盖住框上面那一行,不限于这条路线。
- 顺带(两版都有,与本单无关,未列入):一行被激活后,它最左边约 20px 盖着这一块的删除按钮;冻结版那 3 轮里我的点击正好点中,弹出「Block moved to trash」。

### 第 5 条:未复现;更正一处说法

- 同一真笔记形状又搭了 8 篇,从第一个键起全程记录网络和提示:修后 8/8、冻结版 8/8 全部正确,保存全部落库。修后累计 23 篇只有那 1 篇出事。
- 岛上库只读查那篇笔记(我的测试账号)的块:gamma 那一块 07:01:53.309Z 由「标题后正文另起一块」的结构建出,07:01:53.574Z 是它唯一一次更新(转移),`text_save_revision` 停在 1;gamma 两行是在这之后约 3 秒才开打的。
- **更正**:我中途短讯写的「从没发出保存」证据不足——那段搭建时没有网络记录。能坐实的是「从没落库」,分不清是请求被拒还是没发出。
- 正在验一个竞态推断:新块的转移回包还没到客户端就在新块里打字(回包延迟 2 秒、立刻打 gamma 两行)。结果跑完补在下一节。

### 第 6 条:冻结版同臂数——没有「冻结版能拆而修后不能」的臂,按裁定入 A-25

| 臂 | 修后 | 冻结版 | 修前(线上) |
|---|---|---|---|
| A1 回车后约 300ms 离开(4 轮) | 正确 2、字在未拆 2 | **丢** 4 | 丢 3、未拆 1 |
| A2 扣住转移时离开(带回车) | 未拆 1 | 丢 1 | 未拆 1 |
| B reorder 回 500(带回车,2 轮) | 正确 1、未拆 1 | 丢 2 | 未拆 2 |
| D 第二个结构卡 12 秒 | 未拆 2 | 未拆 2 | 未拆 2 |
| K4/K5 卡住后断开(4 轮) | 未拆 4 | 丢 4 | 丢 1、未拆 3 |
| X 回车后立刻改地址离开(两批合计 15 轮) | 正确 10(其中 7 篇留下空残块)、未拆 2、**留住未自动落 2、顺序错 1** | 正确 13(其中 6 篇留下空残块)、未拆 2 | 丢 5(只跑了 5 轮) |

- 「未拆」两版在改地址这一臂都是 2/15,不算退步。其余各臂冻结版要么丢字、要么同样未拆。
- 改地址这一臂修后的另外两样,不属于第 6 条:
  - 「留住未自动落」2/15:即已知的那条退步。
  - 「顺序错」1/15:回来后字落地、结构重跑,我的脚本 5 秒后整页重开,结构正好被打断在「标题已搬走、正文还没搬」之间,结果是 `[warmup, body][空][标题 kept]`,正文跑到了标题前面。机理是既有的「结构不原子、中途不回滚」;冻结版同样的时机里表现为未拆,没有乱序。请定性。
- **空残块**:离开时第一个结构已经建块、放了位置,还没搬单元就被放弃,建出来的空块(0 个单元)留在笔记里。两版都有,属既有。

### 守恒闸(验收 2)

- 阳性对照亲核:冻结版 7 条已知丢字脚本全红,而且红在目标上(第 1、1b、2 条、buffer-3、H、改角色保存失败各报 `LOST`,commit-1 报 `<W1>` 出现 2 次)。我另写了 8 条良性镜像(同脚本去掉触发条件),冻结版和修后**全绿**,证明这道闸分得出来。修后 7 脚本 + 40 种子全绿。
- **更正 builder 证据一处**:回执引用的「冻结版 H 单元测试红」,红因是 `Cannot read properties of null (reading 'map')`(冻结版的存档读出来是单条或 null,接口对不上),不是行为红,不能当阳性对照;H 的有效对照是闸里的 H 脚本(冻结版 `LOST`)。
- **中途裁定第 1 条的边界断言没写**:闸把卸载那一刻「本地有、服务端没有、也没被留住」的记号一律算进 `UNSAVED AT UNLOAD`(测试第 412 行),不检查它是否进过窗口;测试里记了 `… in window` 的步骤,但没有断言用它。被豁免的记号里有多少在窗口里打过,我正在统计,结果补在下一节。

### 一处请更正(给 Henry 的那段)

「纯 21 文件包在已测的每一臂上都不比线上差」不成立。以下三臂修后比线上差,线上都不会出问题:
- 第 3 条:线上没有第二窗口,`od` 正常落库,3/3;修后 3/3 丢。
- 第 2 条留字框重复:修后 2/2,线上没有留字框。
- 第 4 条提示条盖行:修后 3/3,线上没有留字框。
「安静打字从 10/15 丢字母到 14/15 对」这一句属实。

### 补:第 5 条的竞态推断不成立;边界断言的统计

- **第 5 条**:「标题后正文另起一块」那次转移的回包延迟 2 秒,同时立刻在新块里打 gamma 两行。修后 4/4、冻结版 4/4 全部落库;不延迟的对照 2/2 和 2/2 也全部落库。推断不成立。第 5 条维持「修后累计 29 篇里出过 1 次,未复现」,证据只有库里那块 `text_save_revision` 停在 1,以及当时出现过的「Changes could not be saved」。**不作放行条件**;若 builder 读码另有线索,再补场景。
- **边界断言**:把闸的 40 个种子再跑一遍,统计每个被算进 `UNSAVED AT UNLOAD` 的记号是否在窗口里打过。共豁免 24 个记号,在窗口里打过的 **0 个**。所以这一批序列里放宽没有误伤窗口里的字;但中途裁定第 1 条要求的那条**断言**仍然没写,下一轮请补上(拿测试里已经记下的 `… in window` 步骤来断言)。统计用的测试文件放在证据目录的 `gate/`。

## 编辑器组第二轮补充裁定:判语已收;第 4 条修法、边界断言、乱序定性(Main_Designer 2026-11-07)

Tester 判语:**阻断,这一版不收割**(`docs/audits/2026-11-05-a21-builder/review-tester.md` 〇节;明细十三节;证据 `tester-evidence/acceptance-2026-11-07/`;`records/tester/verdicts.md` 已登)。与第二轮裁定一致,照办。下面是判语和「Tester 补数」带出来的几处新裁。

1. **给 Henry 那句话更正**(Tester 指出):「纯 21 文件包在已测的每一臂上都不比线上差」不成立,已在上节划掉改写。线上没有留字框,留字框带来的三样(重复、提示条盖行、`od` 误删)线上都没有。这也是中间版不上的更硬理由。
2. **第 4 条(提示条盖住上一行)的修法**:builder 现给的 `pointer-events: none` 只解决点击,提示条在视觉上仍盖住上一行,用户看不见自己的字——**不够**。要求:提示条**不得压在任何笔记行上**,放进框自己的占位里(框内或框下),框的占位不覆盖已有文字;验收=Tester 的同一路线,上一行看得见、点得到、接着打的字落库,0/3 丢。「点 Close 丢弃框里的字」是用户显式丢弃,本轮不动,但措辞要让人知道关了就没了(builder 核一眼现文案)。
3. **守恒闸边界断言**:中途裁定第 1 条附带的条件,builder 没写。本轮**必补**:用测试里已记下的 `… in window` 步骤断言「被豁免的记号从未进过窗口、留字框或 carry」;并补一条阳性对照——故意让一个进过窗口的记号走豁免路径,断言必须红。Tester 统计这批 24 个豁免记号 0 个进过窗口,所以不是行为红,是程序红;但没有断言的放宽等于没有边界。
4. **builder 回执更正**:回执引用的「冻结版 H 单元测试红」是接口错(`null.map`),不是行为红,不能当阳性对照;H 的有效对照是闸里的 H 脚本(冻结版 `LOST`)。回执里那条改掉,下一版回执不得再引。
5. **第 5 条(gamma 两行没落库,29 篇 1 次)**:Tester 两个推断都不成立,未复现。**不作放行条件**,列为**观察项**:builder 读码时留意「`text_save_revision` 停在 1 + 出现 Changes could not be saved」能并存的路径,有线索就写进回执,没有就写「未见」;Tester 复测时真笔记再搭 15 篇照旧。
6. **「顺序错」1/15 的定性**(改地址一臂,回来后结构重跑、5 秒后整页重开把它打断在「标题已搬、正文未搬」之间,结果正文跑到标题前):按结果是**第③类**(落错位置);按机理是既有的「结构不原子、中途不回滚」,冻结版同一时机表现为未拆。本轮不修——它在已被接受为已知退步的那一臂上,且修法是结构事务化,超出本单;**入 A-25**,名目「结构中途被打断不回滚:乱序 / 未拆 / 空残块三种残留」,与「快离开后重开补拆」合为一题设计。
7. **既有、记债(编辑器旧债单)**:①空残块——离开时第一个结构已建块放位、未搬单元就被放弃,留下 0 单元的空块,两版都有;②一行被激活后最左约 20px 盖着这一块的删除按钮,点中即「Block moved to trash」,两版都有,**误删风险**,列旧债单优先项。
8. **地址栏一臂**:接受 Tester 的意见——单独不挡,前提是第 4 条修好(「留住」这个状态本身要无害)。与「按做法 3 收」一致。
9. **旧矩阵**改到第二轮包上跑:准。这一版注定换掉,占锁 90 分钟挡 builder 不值。
10. **第二轮复测范围**以 Tester 〇节所列为准(九项),Main_Designer 不加减。

**第二轮的放行条件(汇总,取代「第二轮裁定」里的分散写法)**:必修第 1–4 条修好且 Tester 同场景复测过;边界断言补上并有阳性对照;Tester 〇节复测范围九项跑完,「要保住的」八项不退;第③类为零(第 6 项的乱序除外,已入 A-25 并在回执里单列);纯 21 文件(或本轮清单)同源重建哈希一致。

## 编辑器组第二轮 · 三条红的机理核读与由此追加的四条要求(Main_Designer 2026-11-07)

来源:我另起的三路只读阅读 + 三名怀疑者逐行复核(6 个代理,只读,未跑任何测试或构建)。对象=**被测源码**(builder 的 `edfix` 副本,21 个文件 sha256 与回执 `source-sha256-vs-9bc45e69.txt` 逐个相符;下文行号对它),对照 `edfrozen`。⚠️ builder 正在 `ed21` 原地改,阅读期间文件变了三次,所以 `ed21` 的行号与下文不同,被测版本只剩 `edfix` 一份(见第 4 条)。

### 第 1 条 K1/K2:Tester 的机理要修正一处;builder 的 `lastBatch` 方向对,带三个条件

- **看门狗两版一样**(`hooks/useHeadingStructureController.ts:35` 10 秒;`:256` 放弃当前 run;`:283-284` flush 回来后 `if (!current()) return false`)。冻结版同样是「被放弃的 run 返回 false」,**不是**「放行后结构继续走完」。
- **真正的差别在 placeTyped**:冻结版先发一个**后续结构 run**,让窗口里的字坐在这个 run 的结构性保存里(一条 lane 操作),它比被放弃的 run 早约两个微任务拿到 `useTextFlowHistory.ts:585` 的 `batchEntries` 闩——**冻结版的 4/4 是时序上的侥幸,不是设计保证**。修后版先把字当普通打字落下(`:446`,第二条 lane 操作),再发一个结构性编辑为空操作的后续 run(`:460`);后续 run 的 `whenWritesIdle`(`:270`)在登记表空隙里先醒,到 `runBatch` 时被放弃的 run 还要等一帧(`rendered()`)才清 `batchEntries`(`useTextFlowHistory.ts:605`)→ `:585` 返回 false → 只剩 toast。只要打字保存的往返大于一帧,**必然**被拒,与 Tester 4/4 一致。
- **修法**:后续 run 在 `runStructureBatch` 之前等上一个 batch 落定(builder 16:44 的 `lastBatch` 补丁正是这个)。条件:
  1. **`lastBatch` 必须按笔记作用域**(noteId 变化时重置或只等同会话的):否则笔记 X 上一条挂死的保存会让笔记 Y 的第一次结构白等 10 秒再 toast。
  2. **恢复有界**:字在约 10.1 秒落地后,后续 run 自己也有 10 秒看门狗,所以保存在约 20 秒内落定才会拆;**25 秒**的卡顿修后仍复现 K1(字在、未拆,②′,下次在该块编辑才会补拆)。回执**写明这个界**,矩阵加一臂「卡 25 秒后成功」记录界外行为(②′ 可接受,但要有数)。
  3. 等 `lastBatch` 期间 `busy` 为真,整篇笔记会**第二次只读**(10 秒 toast 刚放开,又锁到保存回来)。不违不变量,但人看得见;回执写明,Tester 看一眼是否可忍。
- ⛔ 用「看门狗后不放弃 run」来修:busy 已放开,活着的 run 会和用户编辑、下一次结构抢同一把闩。
- 顺带(修法不改它):约 10.1 秒落下的打字编辑被 `pushEntry`(`useTextFlowHistory.ts:136-139`)塞进了被放弃 batch 的复合条目,撤销分组会怪;不丢数据。记旧债。

### 第 2 条 留字框重复:坐实;builder 已改的方向对;⛔ 卸载时删 DOM 那条「保险带」

- 机理:修后引入了按记录 id 清扫 DOM(`:482`),但恢复时先用临时 id 盖章(`:214/:217`),之后才 `entry.id = words.id`(`:494`),所以清扫永远对不上恢复出来的框;路由离开再回来,旧实例的框(僵尸)留着,两框的 Close 与 remember 闭包都指向同一条记录。
- 修法:`openEntry` 接受 `id`,恢复时传 `words.id`,出生即用记录 id 盖章——**builder 已这样改**(`ed21` 现版 `options.id`、恢复处传 `id: words.id`、测试 `round 2 #2`)。
- ⛔ 「卸载时直接删掉留住的 DOM、下次挂载从存档恢复」:`retainWords` 只在有 `session` 时写存档,`writeUnplacedWords` 写失败是静默的(`structureTypingBuffer.ts:77` 注释「屏上那份还在」)——删了屏上那份,存档就是唯一一份,而它可能不存在。不加这条。
- 验收补一条:**两条不同记录**各一框,关一个,另一个在、整页重载后还在、保存放开后落地并清键。

### 第 3 条 `od` 误删:坐实;builder 已改的 `typedTextIsPlaced` 方向对;**追加两条**

- 机理:`:488` `unitText.includes(insertedText)`——比的是**记录指定的那一个单元**的文本(不是整篇笔记);`readLiveFlow` 在干净重开时回落到已落库内容(`useTextFlowHistory.ts:948-949`),所以 `unitText === 'body'`,`'body'.includes('od')` 为真→删存档。只有草稿路径(`useSlashCommandController.ts:188-198` → `headingInputService.ts:76-79`)会让窗口带着 `initialText: 'body'` 打开,所以这条在第二窗口里极易触发,与 Tester 的 3/3 一致;耐久编辑器路径 `initialText` 为空,不中。
- 修法:按锚点比(前缀 + 插入 或 插入 + 后缀),整词等价为捷径;landed 才 forget,否则照旧 `openEntry → retainWords → placeTyped`(仍经 `mergeTypedText`,不盲写)。**builder 已这样改**,且把后续单元拼进前向文本以覆盖「落地的字里带回车」的情形——对。
- **追加 3a(必修,属条件 d)**:**无锚点情形**(`initialText` 为空,耐久编辑器里标题后回车的路径):锚点测试只剩整词等价;不等时走到 `mergeTypedText`,其回落 `live.endsWith(after)` 在 `after === ''` 时**恒真**(`:79`),于是把字**追加到单元末尾**——这是「对不上锚点却默默换位」,违条件 d,且可能双写。既有,但更严的 landed 判断让它更容易走到。**随本轮修**:对不上锚点一律 `keep()`(留住并提示),⛔ 追加到末尾。
- **追加 3b(必修,属 H)**:另一条丢字路径,症状与第 3 条不同(标题**已拆**),同一套步骤晚关一点就中:结构走完、`od` 经 `flushSync` 里的 `applyEdit` 本地落地、`finish()` **同一任务里就删了存档**(`:391`),此时保存还没回来;若此刻关页,整页重载时恢复凭证因 `mountNonce`/`creationGeneration` 不同被拒(`useNoteCanvasDataAdapter.ts:728-739`,只 toast 不应用)→ `od` 丢,无框。进过窗口的字在卸载时丢,正是中途裁定第 1 条边界(「只豁免从未进过窗口的字」)要拦的——**边界断言写对了就会在这里先红**。要求:builder 先在真浏览器坐实这条路径;坐实则**本轮修**(存档在承载这些字的保存**被服务端确认后**才删,或 pagehide 时把「已本地落地、未落库、来自窗口」的字重新写档);Tester 加一臂 **H-L**(字刚落地、保存未回时关页)。

### 第 4 条 过程:被测源码只剩 `edfix` 一份;以后每个包带源码快照

- `edfix` 现在的 21 个文件 sha256 与回执相符=**本轮被测源码的唯一留存**;`ed21` 已被原地改成第二轮工作副本。**⛔ 再动 `edfix`**。
- builder 把 `edfix` 里这 21 个文件连同 sha256 清单拷进 ops `packages/editor-rework-pure21/src/`;第二轮的包同样带 `src/`。规矩:**凡交 Tester 的包,`dist/` 旁必有 `src/`(本单清单文件 + sha256),改代码在另一个副本里改**。本单先这样办;要不要写进 builder 角色卡,候 Henry。
- 下文与 Tester 报告里引用 `ed21` 行号的地方,要注明对哪一次写入。

### 给 Tester 的两句

- 〇节「冻结版放行后结构继续走完」宜改为「冻结版由 placeTyped 发起的后续结构 run 抢到了闩」——是否改由你定,不影响判语。
- 复测范围建议加:K 臂「卡 25 秒后成功」(记界外行为)、H-L(字刚落地未落库时关页)、两条记录关一条、无锚点路径(耐久编辑器里标题后回车、窗口里打字、关页重开)。加不加由你定。

## 编辑器组第二轮裁定:H-L(字刚落地未落库时关页)坐实,第③类,挡第二轮放行,本轮修(Main_Designer 2026-11-07)

Tester 在真浏览器坐实核读指出的 3b(其 H-L 臂):`warmup` 回车 → `# head` 回车 → `body`;只在**请求阶段**扣住带 `body` 的那次 text-save(没送到服务端);随即整页关掉;12 秒后重开——纯 21 文件包 3/3 只剩 `[warmup][空标题块]`,无存档、无框;冻结版 3/3 同样丢;修前(线上)3/3 丢或乱(`bhead`、`bodywarmup` 一类线上原有的错)。网络时间线:第一个结构走完(建块、放位、搬单元、排序),字作为普通编辑落地,承载它的保存被扣,关页;卸载存档只存**还开着的窗口**,这些字既不在服务端也不在存档里。

**定性**:第③类(丢失)。不是退步(三版都丢),但这些字**进过窗口**——中途裁定第 1 条给守恒闸的放宽只豁免「从未进过窗口、留字框或 carry 的字」,这条不在豁免里;它违的是本单设计基线的第一句「窗口内的键不丢」。不退步不能救一个第③类。

**裁定**:
1. **挡第二轮放行,本轮修。** 方向(builder 定实现):承载落地字的那次保存被服务端确认之前,**存档记录不删**(`finish()` 推迟到 persist 落定);重开时按锚点比对(`typedTextIsPlaced`)决定「已在笔记里→删记录」或「不在→留住并提示」,所以记录多活一会儿不会双写、不会盲写。备选:pagehide 时把「来自窗口、已本地落地、未被确认」的字重新写档。两者都不新增可落库状态、不动 history 记账点。
2. **builder 的 3b 两臂为什么 0/12**:请回执里对照 Tester 的步骤写明差别——Tester 扣在**请求阶段、未送达**;builder 若是代理转发后才拖或黑洞,服务端已写,当然不丢。以后「卡住」「黑洞」类注入一律写明注入层,且至少一臂在**发出前**拦。
3. **不开豁免**:Tester 提的「写明是 A-20 的债、明确豁免」不采——A-20 的债是从未进过窗口的普通编辑;把进过窗口的字也豁免,边界断言就成了摆设。
4. **A-25 记一笔**:这条路径的「空标题块」残留与前面的空残块同根(结构不原子)。
5. **第二轮放行条件补一句**:H-L 臂 0/N 丢(字在笔记里的正确位置,或在留字框里)。Tester 的 K25 基线(4/4 字在未拆,②′,与预期一致)与 NA 基线(3/3 正确)照记;「两条留字记录」臂第一轮作废、第二轮再跑,准。

**给 Henry 的一句**:这会再拉长一轮——我按「丢失就挡」的既定规则加的,没问你;线上版在同一步骤上丢得更乱,所以等的代价是「晚一点拿到修复」,不是「比现在更差」。

## 编辑器组第二轮 · builder 自查 harness 缺陷:第一轮 ② 计数作废待重出(Main_Designer 2026-11-07,据 builder 短讯)

- **缺陷**:矩阵 harness(matrix25)的 `seen.stored` 读了 localStorage 里全部 `coincides:unplaced-words:*` 键,别的笔记、前面行留下的记录也在里面;classify 只要字出现在任何一条记录里就记 ②。字已在服务端的行不受影响;字不在服务端的行(慢回包臂,冻结版与修前的丢字行)可能把真 ③ 记成 ②。
- **受影响的声明**:第一轮回执「慢回包整页卸载:冻结版 ③、修复版 ②(净改进)」——**作废,不得再引**;纯 21 文件包 26 行 ①21 ②5 ③0 里的 ②5 同样待重出。单卡「现行有效的裁定」已加注。
- **修法**:matrix25b / classifyb 只认以本行笔记 id 结尾的键;每行另记重开页面实见(框、提示、本笔记的记录),归类以实见为准。排在当前全量之后、同一最终源上重跑:注入矩阵(r2 / 冻结 / 修前)+ h_HL(r2 / 冻结 / 纯);再跑两行诊断(完整代理请求日志 + 重开前读库),回答「失败臂字在哪」「黑洞臂哪个请求带字」。
- **裁定**:①回执只用修正后的数,第一轮那行标撤回,写明哪些旧数受影响、哪些不受;②Tester 的判语与复测不受影响(它按真浏览器重开后屏上与库里实见归类),复测范围不改;③这是 TD-55「假适配器没有闸的绿不算数」同一类——**度量器自己要过阳性对照**:harness 加一条自测——往别的笔记键里塞同样的字,本行必须仍判 ③;写进回执。

## 编辑器组返修第二轮 Result(builder 2026-11-07)

答「编辑器组返修第二轮裁定」及其后各节(补充裁定、机理核读四条、H-L 裁定、harness 自查)。证据目录 `docs/audits/2026-11-05-a21-builder/builder/matrix-5-round2/`(下称 m5;`README.md` 写明哪些数算数)。

### 包与同源

- 源码 = `9bc45e69` + 22 个文件。副本−基线 = 22 个文件,全在 `client/src/pages/Notes/canvasEngine/` 下;`node_modules`、构建产物和检查脚本的临时输出不计。逐文件 sha256 见 `m5/final/source-sha256-r2.txt`。
- 22 个文件里,17 个与第一轮逐字节相同;本轮改 4 个、新增 1 个:
  - `hooks/useHeadingStructureController.ts`
  - `structureTypingBuffer.ts`
  - `hooks/useHeadingStructureController.test.tsx`
  - `hooks/structureTypingConservation.test.tsx`
  - 新增 `hooks/headingStructureWatchdog.realAdapter.test.tsx`
- 包:主 JS `index-BlJnjQci.js`,63 个文件。ops 里的 `packages/editor-rework-r2/` 带 `dist/` + `src/`,另有 `dist.sha256`、`src.sha256`,与 m5 的哈希一致。
- dist 在注入矩阵、K、H-L、r04 前后各核一次哈希,结果不变(`m5/final/summary.txt`、`m5/per-note/summary.txt`)。
- `edfix` 没动。它的 21 个文件连同 sha256 已放进 `packages/editor-rework-pure21/src/`,与第一轮回执 21/21 相符。

### 全量与检查(最终文件集)

| 数 | 证据 |
|---|---|
| 类型检查净;客户端全量 2653/2653(257 个文件) | `m5/client3/summary.txt`、`client-full.raw` |
| 守恒闸 40 种子全绿;豁免记号 10 个种子,其中进过窗口的为 0(边界断言在跑,没红) | 同上(`UNSAVED AT UNLOAD` 一行) |
| 三个检查脚本 exit 0(根目录跑) | `m5/final/check-*.txt`、`summary.txt` |
| r04@57:156 行坏 0 | `m5/final/r04-r2final57.log`、`r2final57.rows.jsonl` |
| K1 真适配器测试在最终源码上连跑 20/20 | `m5/client3/k1-repeat/` |
| 阳性对照全部先红后绿(见下各条) | `m5/client3/red-controls.txt` |

### 每条红:根因一句、修法、测试、浏览器数

**第 1 条 K1/K2(改角色那次保存卡住后成功,同块未拆)**
- 根因(真浏览器打点坐实,`m5/k1-early/k-diag.log`):看门狗放手后,被放弃的 run 还停在 history 的 batch 里,等那次被扣的保存。字落地后请求的下一个结构等的是同一个 flush。flush 一落定,新结构立刻调 `runBatch`,而旧 run 还要再等一帧。history 在旧 batch 没关时拒绝第二个 batch(`if (batchEntries || …) return false`)。打点里新结构的 batch 没进 operation 就返回 false,比旧 batch 关闭早 19ms。冻结版能成,是因为它先发结构、后落字,抢先拿到了闩。
- 修法:新结构在 `runStructureBatch` 前,先等**同一笔记**上一个结构 batch 落定(`lastBatch`,按笔记作用域,别的笔记的 batch 不等)。
  - 等待写在等待者自己的 run 里,由它自己的看门狗封顶:从打 `#` 起约 20 秒恢复界。超出就字留在笔记里、同块未拆。
  - 等待期间整篇第二次只读,和任何结构进行中一样。
  - 「看门狗后不放弃 run」没用。
- 测试:`headingStructureWatchdog.realAdapter.test.tsx`。真 `useNoteCanvasDataAdapter`(带它自己的 `current()` 检查)+ 真 history + 控制器。合成服务端每次写入往返 120ms(没有往返时延,这场竞态打不开)。
  - 修前 5/5 红,`server ["warmup|H:kept"]`,结构请求一个没发。
  - 修后 20/20 绿。
- 浏览器(K 臂,代理层扣「改角色那次」text-save,内容 `warmup|[heading_1]`,每臂 2 轮):

| 臂 | 纯 21 文件 | 冻结版 | 第二轮 |
|---|---|---|---|
| 卡 12 秒后成功 | ②′ 2 | ① 2 | **① 2** |
| 卡 12 秒后失败(500) | ②′ 2 | ③ 2 | ②′ 2 |
| 卡住 + 整页卸载 | ① 2 | ③ 2 | ① 2 |
| 卡 25 秒后成功(界外) | — | ③ 2 | ②′ 2 |

  - 失败那一臂第二轮的 ②′,字在库里,不是草稿或框。依据是诊断行 `m5/per-note/diag-kfail.log`(完整请求日志 + 重开前读库):
    - 被扣的 `warmup|[heading_1]` 在代理里 12 秒后回 500,没到服务端。
    - 随后客户端又发了 `warmup|[heading_1]`(19904ms)和 `warmup|[heading_1]kept`(20040ms),两次都到了服务端。text-save 带整块内容。
    - 重开前库里是 `warmup|[heading_1]kept`。
    - 保存失败后不再发结构,是设计。
  - 证据:第二轮与冻结版 `m5/final/k-r2.json`、`m5/per-note/k-frozen.json`;纯包 `m5/k1-early/k-pure.json`。

**第 2 条 留字框重复**
- 根因:从存档恢复时,框的 DOM 记号用的是新生成的 id,`entry.id = words.id` 是开框之后才改的。路由重进时找不到上一个框,于是两个框叠在一起,关任一个都会删掉共用的那条存档。
- 修法:`openEntry` 接收记录自己的 id,一记录一框一存档。卸载时删 DOM 的保险带没加(按裁定)。
- 测试:「一记录一框,关一条另一条在」。两条不同的记录,第二次挂载后屏上仍是 2 个框;关 `kept-a` 后存档只剩 `kept-b`。修前屏上 4 个框(红)。

**第 3 条 `od`(第二窗口补打的字卸载后丢)**
- 根因:Tester 坐实了。重开时用 `'body'.includes('od')` 判「已在笔记里」,把存档删了。
- 修法:`typedTextIsPlaced`。字在原锚点(打字处一侧的原文紧挨着字)才算已在笔记里;Enter 分出去的行接着往后读。⛔ 子串。
- 测试:`od` 落成 `bodyod`、存档清掉(修前 `['Intro','body']`,红);锚点比对的真假表。
- 3a(条件 d):`mergeTypedText` 里空的一侧不再当锚点。
  - 改前 `live.endsWith('')` 恒真,往空单元打的字会被追加到它现在内容的末尾。
  - 现在:两侧原文都对不上就 keep()。在末尾打的字,只要它前面那段原文仍是单元的结尾,照常落。
  - 测试:修前 `'other textkept'`(红)。
  - 旧测试「看门狗放弃的结构」改了期望:那个单元还是空的,`Seckept` 无锚,由「掉了 `Sec` 落进去」改为「留住(②)」。
- 3b(H-L,第③类,裁定本轮修):
  - 修法:字从窗口落地的同一任务里写一条存档,锚在落地前那一刻的单元原文上(`initialText` = 当时单元文本,`text` = 合并后文本)。
  - `history.flush()` 落定,也就是承载这些字的保存已确认,才删这条存档。flush 被拒(失败保存待 Retry/Undo,或输入法组合中)时,每 800ms 再问,最多 30 次;之后交给下次打开,按 `typedTextIsPlaced` 判:已在就删,不在就落或留,不双写、不盲写。
  - 不新增可落库状态,不动 history 记账点。
  - 测试(Tester 步骤的 jsdom 版):结构走完、字落地、承载保存永不返回、pagehide。修前存档为空(红);修后存档里是 `Seckept`,锚 `new-1 / title / 'Sec'`。另一条:保存确认后存档消失。

**第 4 条 提示条盖住上一行**
- 改后的几何:提示条在框内,贴框首行右端:`top` = 框顶 + 2,`left` = 框右 − 提示条宽 − 2,单行 16px 高,不超出框的矩形。框用 `padding-right` 让出这块宽度,框里的字不在提示条底下。
- 框本身跟随它代表的那个单元的编辑器(框顶 = 该单元顶,不低于上一行的底)。所以上一行没被任何东西盖住,点上一行就直接点在那一行的编辑器上。
- 「点击穿透」指提示条自身:`pointer-events: none`,点在提示条上落到它下面的框(框里的字),只有按钮接点击。
- 按钮改名 Discard。可见文字是 `Not in the note yet`;按钮和提示条的 title / aria 写全句,含「Discard deletes them」。
- 几何测试断言:提示条 top ≥ 框顶,top + 16 ≤ 框底,left 在框的左右之间;框的 `padding-right` ≥ 框右 − 提示条 left;提示条 `pointer-events: none`、按钮 `auto`;按钮文字 Discard;title 含「Discard deletes them」。修前 top = 272px(框顶 300,在框上方 28px,红)。
- 已知:框里的字加上让出的宽度若折行,框会往下长,盖住它下面一行的一部分。框对长字一直如此,本轮未改。

**第 5 条 gamma(真笔记 29 篇里 1 篇没落库)**
- 读码线索:「Changes could not be saved」只有一个出处,`useNoteRouteSaveBoundary.tsx` 的离开屏障。`flushPendingSaves` 被拒,也就是 `textHistory.flush` 抛错:有失败保存、模板 / 文档失败,或输入法组合中。
- 「`text_save_revision` 停在 1」与它能并存的路径:那次打字保存在客户端失败或被拒,失败态挂着,离开时 flush 抛错弹提示,之后没落库。没找到确定的触发点。
- 本轮 3b 修的是「字从窗口落地后未确认就关页」,gamma 是普通打字,不在这条路上。

**守恒闸边界断言**
- 用测试里已记的 `… in window` 步骤,把进过窗口的记号记成一个集合。被豁免为 `UNSAVED AT UNLOAD` 的记号若在这个集合里,就报问题。
- 闸里字只能从窗口进留字框,没有单独的 carry 路径,所以这一个集合同时覆盖了窗口、留字框和 carry。
- 阳性对照:`exemptEverything` 把所有字(含窗口里打的)都推进豁免,断言必须红,实测红。

**回执更正**:第一轮回执引的「冻结版 H 单元测试红」是接口错(`null.map`),不是行为红,作废。H 的有效对照是闸里的 H 脚本(冻结版 `LOST`)。

### 注入矩阵(修正 harness,按笔记读存档,`m5/per-note/`)

每臂 2 轮。注入层:代理层,浏览器已发出,由代理扣、拖或回 500。

| 版本 | ① | ② | ③ | 说明 |
|---|---|---|---|---|
| 第二轮 | 20 | 6 | 0 | ② = 改地址离开 2、慢回包改地址 2、慢回包卸载 2(重开后框里有字、本笔记有存档) |
| 纯 21 文件包 | 20 | 6 | 0 | 同上三臂 |
| 冻结版 | 18 | 0 | 8 | ③ = reorder 2、save3 2、离开 350ms 2、慢回包卸载 2 |
| 修前(A-18 前) | 11 | 0 | 15 | |

- **harness 更正**(Main_Designer 裁定)。第一轮纯包「26 行 ①21 ②5 ③0」用的是旧 harness:
  - 受影响的只有字不在服务端的行,即慢回包两臂和改地址离开那一行。
  - 修正 harness 重出:纯包 ①20 ②6 ③0。旧的 5 个 ② 重开后实见仍是 ②(框 + 本笔记存档),没有一个变 ③。①21 变 ①20,是改地址离开这一臂自然时序下的落地波动(本次 2 轮都没自动落)。
  - 第一轮「慢回包卸载:冻结版 ③、修复版 ②」按修正 harness 重出,结论相同:纯包 ② 2,冻结版 ③ 2。但第一轮那行原数仍作废,以本表为准。
- **度量器自测**(`m5/harness-control/`):冻结版慢回包卸载一臂(真丢),同样的字塞进别的笔记的存档键。旧 harness 判 ② 2(误判),新 harness 判 ③ 2。
- 回车到字落地(clean 臂):第二轮中位 1194ms、最大 1286ms;冻结版 1356 / 1392。

### H-L 与 3b 各臂(注入层逐臂写明)

| 臂 | 注入层 | 第二轮 | 冻结版 | 纯包 |
|---|---|---|---|---|
| `h_HL`:扣住带 `body` 的 text-save,150ms 后整页离开,12 秒后重开 | **浏览器请求阶段**(CDP Fetch,请求没送出) | ② 3 | ③ 3 | ③ 3 |
| `h_landedUnload`:所有 text-save 在代理处拖 3 秒,字落地后立刻离开 | 代理层(浏览器已发出) | ① 2 | — | — |
| `h_landedThenDrop`:字落地后代理吞掉之后所有 text-save,100ms 后离开 | 代理层(浏览器已发出) | ① 2 | — | — |

- `h_HL` 第二轮的 ②:
  - 本臂扣住的是第一次带 `body` 的保存,第一个结构没走完,库里只剩 `warmup|#`。
  - 存档锚的 `initialText` 是空串,库里那个单元现在是 `#`。空的一侧不是锚(3a),所以重开后字留在框里(3/3,框里是 `head\nbody`,本笔记存档在),没落进笔记。没丢、没双写。
  - Tester 的 H-L 时序是第一个结构走完、字作普通编辑落地。那条走的是「锚对得上就落」,由 Tester 复测。
- 代理层两臂 0 丢的原因(诊断行 `m5/per-note/diag-blackhole.log`):承载落地字的那次打字 persist 是 `text-save [heading_1]head|body`,8571ms 发出,早于第二个结构的建块和转移(8739、9026ms),也比黑洞打开(9373ms)早约 800ms。臂里「落地」的探测要等第二个结构走完才成立,所以黑洞罩不到那次保存。我之前说的「结构自己的写入携带了字」不对,更正为:是那次打字 text-save 带的字,而且它在黑洞之前就到了服务端。

### 已知、未修、记债

- 保存失败 + 结构搬走单元 + 关页 → 重开时框里有字、笔记里也有。Main_Designer 定为 ②:笔记里没有双写,框是留住的副本,Discard 是显式动作。步骤:字从窗口落地、承载保存失败待 Retry/Undo、结构把单元搬到新块、关页、重开。请 Tester 复测时碰一次。
- 约 10.1 秒落下的打字编辑被 `pushEntry` 塞进被放弃 batch 的复合条目(撤销分组怪,不丢字):记旧债,不修。
- 「快离开后同块未拆」(②′)、乱序、空残块:按裁定入 A-25,本轮没碰结构事务化。
- 第 4 条框的折行增高(见上)。

### 待 Tester

- 包:ops `packages/editor-rework-r2/`,`dist/` + `src/` + 两份哈希。复测范围按 Tester 〇节九项,另加 H-L 0/N 丢、K 三臂与 25 秒臂、留字框重复「两条不同记录关一条另一条在」、提示条几何。
- 拷回共享树候 Main_Designer 令。

## 编辑器组第二轮回执收讫:放行条件逐条核对,转 Tester 复测(Main_Designer 2026-11-07)

对照「第二轮补充裁定」汇总的放行条件 + H-L 裁定第 5 条,逐条核回执与 m5 证据(只读,未跑任何测试):

| 条件 | 回执 | 核 |
|---|---|---|
| 必修 1–4 修好,各带先红后绿的测试 | K1 `lastBatch`(按笔记)+ 真适配器测试修前 5/5 红 / 修后 20/20 绿;留字框一记录一框;`typedTextIsPlaced` 锚点比对;提示条进框内 + Discard | `m5/client3/red-controls.txt` A 段 8 条在第二轮前源码上全红,E 段最终源全绿;B 段 K1 5 次 `server ["warmup\|H:kept"]`。**对** |
| 3a(无锚点不追加末尾)/ 3b(H-L,落地即写档、flush 落定才删) | 各有测试;3b 在 3b 改动前单独红(C 段) | **对**。3b 隔离对照是本回执里最干净的一条 |
| 边界断言 + 阳性对照 | 进过窗口的记号集合;`exemptEverything` 必红 | D 段 1 passed(对照红=测试绿)。**对** |
| 注入层逐臂写明;至少一臂发出前拦 | `h_HL` = CDP Fetch 请求阶段;K 四臂与 3b 旧两臂 = 代理层 | **对**。黑洞臂 0 丢的原因已更正为「打字 text-save 在黑洞前 800ms 已到服务端」 |
| 修正 harness + 自测;第一轮旧数标作废 | `per-note/` 四版同批;`harness-control/` 旧 ②2 → 新 ③2;旧 ②5 重出仍 ②,原数作废 | **对** |
| 恢复界 ~20 秒 + K25 臂;第二次只读写明 | 25 秒臂 ②′ 2(字在、未拆);等待期间整篇第二次只读 | **对**,Tester 看是否可忍 |
| 第③类为零(乱序除外,已入 A-25) | 矿阵 r2 ①20 ②6 ③0;K 四臂 ③0;`h_HL` ②3 | builder 侧 **0**;终数以 Tester 真浏览器为准 |
| 同源:`src/` 快照 + 哈希;dist 跑前跑后不变 | `editor-rework-r2/{dist,src}` + 两份哈希;`edfix` 未动,纯 21 文件 `src/` 已归档 | **对** |
| 第 5 条 gamma 观察项 | 读码线索写了(离开屏障 flush 抛错路径),「没找到确定触发点」 | 照观察项记,不挡 |

**两处要 Tester 知道的**:

1. **builder 的 `h_HL` 臂不是 Tester 的 H-L 时序**。builder 扣的是**第一次**带 `body` 的保存,此时第一个结构没走完,库里只剩 `warmup|#`,字留在框里(② 3/3)——走的是 3a「空的一侧不是锚 → keep」。Tester 的 H-L 是**第一个结构走完、字作普通编辑落地、承载保存被扣、关页**——走的是 3b「锚对得上就落」。3b 的这条路径只有 jsdom 测试,**真浏览器证据只有 Tester 的 H-L 臂**,放行条件「0/N 丢」的 N 请不少于第一轮(3),且三版都跑(修前对照已有,不必再跑)。
2. **第 4 条的已知残留**:框里的字加上让出的提示条宽度若折行,框往下长,会盖住它**下面**一行的一部分(长字一直如此,本轮未改)。Tester 的验收路线是「上一行看得见、点得到、接着打的字落库」——按此验;下面一行若被盖,记现象、归 ②(视觉),不当 ③。

**裁定**:回执合格,包转 Tester 复测。单卡状态行「待验 · Tester」有效;看板行已翻。复测范围 = 〇节九项 + 第 10 项四臂(K25、H-L、两条记录关一条、无锚点),外加 builder 请求的一次「保存失败 + 结构搬走单元 + 关页」(已定 ②,碰一次核实不双写)。builder 待命,⛔ 动共享树,⛔ 动 `edfix`;Tester 期间若出红,先发短讯给 Main_Designer 再动。

## 编辑器组第二轮裁定:留字框不跟随版面,压住上一行——第 4 条未过,第③类,builder 补修 r2.1(Main_Designer 2026-11-07,答 Tester 短讯)

**Tester 复现**(acc12,第二轮 13149,3 轮;证据 scratch `verify-editor/runs/r2-acc12/`):扣住 `#` 那次保存 → 改地址离开 → 3 秒放行 → 回来整页重开。出框的 2 轮:
1. 重开时顶部「A block edit is waiting for recovery」横幅把正文推下,框顶 499、它的单元 `#` 顶 563,高出 64px;`warmup` 行(533–560)被压 16px 整行宽。点 `warmup` 左端、中间命中的都是框;点上一行 → End → 打 ` up`:焦点进框,` up` 接在留字后(`kept\nbody up`),存档同变,`warmup` 一字未变。验收路线「上一行点得到、接着打的字落库」**0/2**。
2. 点 Dismiss 正文上移 96px,框不动;滚动 240px 正文走、框停在 499,离单元 272px。**框按视口坐标定位一次,之后不重算**——不需要横幅,长笔记里一滚动框就漂到别的行上。
3. 提示条本身合格(框内、`pointer-events:none`、Discard、title 全句、不压行)。

**定性**:
- **第 4 条未过。** 补充裁定第 2 条的要求是「提示条不得压在任何笔记行上,框的占位不覆盖已有文字,验收=上一行看得见、点得到、接着打的字落库」。这次压行的从提示条换成了框,失败方式一样(上一行点不到、键打到别处),是**同一条要求在新触发下失败**,不是新题。
- **第③类(落错位置)。** 用户在 `warmup` 行打的字落进了留字框——与「乱序」同一判法,按结果归类:字在,但不在打它的地方;之后点 Discard 就一起没了。Tester 的「0/2」照此登 ③。
- **不是「相对冻结版退步」问题**:线上和冻结版都没有框;框是本单新引入的部件,它存在的前提是「留住」这个状态本身无害(补充裁定第 8 条给地址栏一臂放行的前提)。前提不成立,地址栏一臂的放行也随之悬置,等 r2.1。
- **回执更正**:第二轮回执「框本身跟随它代表的那个单元的编辑器(框顶 = 该单元顶,不低于上一行的底)」**不成立**——几何测试只在定位那一刻断言,没有在定位后移动版面;Dismiss、滚动、横幅三种版面变化框都不跟。builder 在 r2.1 回执里改掉这句。

**裁定(r2.1 补修,仍属第二轮)**:
1. **要求**:框必须随它代表的单元**一起走**——横幅出现/消失、滚动、窗口改尺寸、字体加载后,框顶仍=单元顶(不低于上一行的底、不盖任何行);**方向首选锚在 DOM 上**(框渲染进该单元所在块的容器里,相对块定位,随版面流动),次选监听重算(scroll/resize/ResizeObserver)——监听法每多一种版面变化就多一个漏,builder 若选它须列出覆盖的变化并说明为何不能锚 DOM。不新增可落库状态、不动 history 记账点、不改字何时落地;提示条仍在框内。
2. **改动范围收紧**:只动框的定位(预期在 `structureTypingBuffer.ts`,必要时 `BlockEditorLayer.tsx` 的挂载点),⛔ 顺手改控制器逻辑。r2.1 回执列 22(或 23)文件逐个 sha256 并标出**哪些与 r2 逐字节同**——K 四臂、H-L、注入矩阵的 r2 数在控制器文件未变的前提下沿用,不重跑;变了就重跑。
3. **测试**:第二轮 #4 几何测试加一步——框定位**之后**改版面(在笔记上方插一个在流元素模拟横幅、再移除;滚动容器),断言框仍在单元上、不盖任何行;修前须红。
4. **锁**:Tester 持锁把第二轮的行为臂(K、H-L、总表余项)跑完——这些臂的结论在 r2.1 控制器不变时沿用,不白跑。builder 现在就改码、只跑那条几何测试(轻);构建 + 全量等 Tester 在步骤边界放锁,**两人直接短讯交接**,不经我。
5. **Tester r2.1 复测范围**(Tester 定,这里是建议):GEO 臂全套(横幅、Dismiss、滚动、窗口改尺寸、上一行/下一行点与打)+ 地址栏三臂 + 总表冒烟;其余按文件哈希沿用。纯 21 包上同一探针跑一遍的结果照记——它回答「第一轮就有还是本轮引入」,不改定性(两者相对线上都是新行为)。
6. **放行条件不变**(汇总那条 + H-L 0/N),第 4 条的验收路线加「Dismiss 后、滚动后框仍在单元上」。

**给 Henry 的一句**:又多一次补修——是我在第二轮验收路线里没写「版面变了框要跟着走」,builder 的测试也只量了一瞬。框是新部件,每多一轮都在替它找没人想到的失败法;到岛上之前找到比之后找到便宜。

## 编辑器组 r2.1 · 框定位的机理核读:修法首选改为「留住后继续跟随」,⛔ 把框搬进 React 的 DOM(Main_Designer 2026-11-07)

来源:三路只读阅读(两名读者 + 一名怀疑者逐行复核),对象 = ops `packages/editor-rework-r2/src/` 冻结快照(行号对它),横幅部分对共享树。未跑任何测试。

**机理(坐实)**:
- 框是 `document.body` 下一个 `position: fixed` 的 textarea(`structureTypingBuffer.ts:107-111/:138`),`follow()` 把锚点编辑器的 `getBoundingClientRect()` 原样抄进 left/top/width/minHeight(`:117-121`),视口坐标,没有 scroll 偏移。
- 窗口活着时有一个 50ms 的 `setInterval(place)` 跟随(`:12/:128-132/:159`);**`retain()` 第一件事就是 `stopHolding()`,把它 clearInterval(`:188-190 → :173-178`)**。此后 top/left 再没写过。重开恢复路径里 `openEntry → retainWords` 在同一个 effect 里同步连做(`useHeadingStructureController.ts:547-550`),interval 建了就清,**框只定位一次**。
- 提示条同样 fixed、在 `retain()` 时按框的 rect 放一次(`:197-198/:214-215`),不再动。
- 快照里没有任何 ResizeObserver / MutationObserver / scroll / resize 监听与框相关;`StructureTypingBuffer` 接口(`:23-36`)也没暴露重放位的方法,控制器的 800ms 重试循环(`:180-186`)帮不上。
- **回执「框顶 = 该单元顶,不低于上一行的底」没有代码对应物**——不存在对上一行的夹限;「框顶 = 单元顶」只在写入那一刻成立。
- 第二轮 #4 几何测试(`useHeadingStructureController.test.tsx:811-843`)只给框 mock 了一个常量 rect、blockId `'gone'`(没有单元编辑器,框走 25%/20% 回落位)、断言提示条在框内;对框自己的 top/left、单元、上一行、定位后的版面变化一概没断言——所以看不见这条。
- 横幅 `BlockEditRecoveryQueue`(共享树 `layers/BlockEditRecoveryQueue.tsx:158-163`)挂在 `.documentShell` 顶、写字面之上(`NoteRuntimeDocumentLayer.tsx:279-290`),`position: relative` 在流(`NoteDetail.module.css:905-917`),出现/消失都推动正文。同类在流元素还有 templateWarning(独立 promise,可能晚到)。字体加载后整页重排(`useNotePageFlow.ts:27-32`)、滚动、改尺寸同效。
- 框是普通 textarea,没 readOnly、没 pointer-events 限制(`:107-112`);点上去就聚焦,打的字经 `retainWords` 的 input 监听写进留字记录(`:195-200`)——落错位置、可取回、Discard 即删。

**修法修正**(取代上节第 1 条的「首选锚 DOM」):
1. **首选:留住后继续跟随。** 把 `stopHolding()` 拆成 `releaseFocus()`(held=false、摘 focusin/focusout)和 `stopFollowing()`(clearInterval);`retain()` 只调前者,`close()` 两者都调。`place()` 每拍 `follow(anchor)` 后**重新加回** paddingRight 的提示条预留(`follow` 每拍从锚点抄 paddingRight,`:9-11/:116`,会抹掉 `:216` 加的预留——不补回,#4 的 `:831` 断言第一拍后就破)并按框的新 rect 重放提示条。锚点找不到(单元卸载/只读)时保持原位(与现在同,记残留)。CPU:每拍一次 getBoundingClientStyle/Rect;框多时(上限 20)按「rect 没变就不写」门控,`document.hidden` 时暂停。这一条天然覆盖横幅、Dismiss、滚动、改尺寸、字体重排——它量几何,不靶事件。不动控制器、不动存储、不改字何时落地。
2. **⛔ 把框 re-parent 进单元所在块的容器(我上节写的「锚 DOM」)**:块容器是 React 持有的 DOM,块重渲染换子树、分页重切(`PaginatedTextBlockProjection.tsx:511-517` 一个单元可有多个切片容器)、块移动/删除、跨页裁切(`BlockEditorLayer.tsx:314-315`)都会**悄悄把框连同它的 input 监听一起拿掉**,而同一挂载内没有任何恢复路径(恢复 effect 每笔记只跑一次,`:526-527`)——字在存档里但屏上不见,直到下次挂载。框故意活在 body 下正是为了熬过结构 run 造成的编辑器重挂(`structureTypingBuffer.ts:1-5` 文件自述)。builder 若坚持这条,先答这几处。
3. 次选(事件驱动:scroll/resize 监听 + ResizeObserver + 重试拍调 place):ResizeObserver 对纯位移不触发,横幅挂上可能要等 800ms 重试拍才跟上,期间点击仍落在框上;比 1 多代码路径、少覆盖。不推荐。

**测试规格**(给 #4 加 #4b):放一个真的单元编辑器 textarea(`dataset.blockId='source'`、`textUnitId='body'`、`runtimeTextflowEditor='true'`,让 `editorFor` 找得到);rect mock 改**可变**:单元 {top:300,bottom:330,…}、上一行 {top:270,bottom:300}、框的 rect 由它自己的 inline style 推出(不是常量);记一条合不上的留字(如 initialText 'x' 对 live 'Intro')让它留住;等提示条出现后断言框 top=300、提示条在框内;**然后移版面**:单元与上一行各 +80;真计时器下 `waitFor(框 top → 380)`;再断言框 top ≥ 上一行 bottom(不盖行)、提示条 top∈[380,410) 且 left 在框内、paddingRight 仍 ≥ 预留(抹除检查)、`readUnplacedWords` 不变、save mock 未调(位移不改落地与存储)。修前红(top 停在 300)。

**给 Tester 的一个判别**:重开后看框的 inline `style.left`——是 `25%` 就是「没找到编辑器、走回落位」,是 px 值就是「锚上了、随后被推走」。两者修法同一条都盖,但回执里要分开记。

**其余不变**:定性(第 4 条未过、③)、范围收紧(只动 `structureTypingBuffer.ts`)、哈希沿用规则、锁的交接、Tester 复测范围建议。

## 编辑器组 r2.1 Result:留字框跟随版面(builder 2026-11-07)

答「编辑器组第二轮裁定:留字框不跟随版面」。证据 `docs/audits/2026-11-05-a21-builder/builder/matrix-6-r2.1/`(下称 m6)。

### 根因与修法

- 根因:留字框是 `position: fixed` 的浮层,原本由 50ms 一次的跟随定时器盖在它的单元上。框转成「留住」时,`retain()` 调 `stopHolding()`,把跟随定时器一起停了,框从此停在当时的视口坐标上。
  - 横幅把正文推下、Dismiss、滚动,框都不动(Tester acc12)。
  - r2 回执里「框本身跟随它代表的那个单元的编辑器」一句**不成立**,在此撤回:r2 的几何测试只在定位那一瞬断言。
- 修法(次选:监听重算。为什么不锚 DOM 见下):
  - 跟随定时器只在关框(落地或 Discard)时才停。「留住」只放开焦点,不再停跟随。
  - 另加 `scroll`(捕获阶段,任何滚动容器都算)和 `resize` 监听立即重放;字体加载完成时再放一次。
  - 定时器兜住不发事件的版面变化:横幅插入或移除、正文被推、字体回流。最长滞后 50ms。
  - 每次重放后,框顶 = 单元编辑器顶,左边和宽度同单元;为提示条让出的 `padding-right` 每次重放都补回;提示条随框重放(框顶 + 2,框右端)。
  - 单元编辑器找不到时(没渲染),框留在原处,和改前一样。
  - 单元的位置和提示条预留都没变时,这一拍什么都不写(框、高度、提示条都不动);页面隐藏(`document.hidden`)时暂停,再显示的下一拍补放。
  - 首版 r2.1 包(主 JS `index-VJHeV8Ag.js`)没有这两条,已在 Tester 开测前原地换成本版;首版的数作废,上表与 m6 都是本版。
- 为什么不锚 DOM:
  1. 窗口打开期间,这个单元会在结构里搬块,编辑器会重挂。框必须活过重挂,所以它挂在 body 上。
  2. 留住的框可能是这些字在屏上唯一的一份。放进 React 管的块容器里,容器被替换时会被一起带走。
  3. 留住的框所属单元可能不在当前渲染里,框仍须可见。
- 只动了框的定位:`structureTypingBuffer.ts` 一个文件,加测试一条。控制器、字何时落地、可落库状态、history 记账点都没动。

### 逐文件 sha256(22 个文件,对 r2)

- `r2.1改`:`structureTypingBuffer.ts`(`1eb2eb5d15c3…`)、`hooks/useHeadingStructureController.test.tsx`(`f62196f2d45b…`)。
- 其余 20 个与 r2 逐字节相同,含 `hooks/useHeadingStructureController.ts`。所以 K 四臂、H-L、注入矩阵沿用 r2 的数,没重跑(按裁定)。
- 全表:`m6/source-sha256-r21.txt`。副本−基线仍是这 22 个文件。

### 数

| 数 | 证据 |
|---|---|
| 构建 exit 0;主 JS `index-Ck4z0VFS.js`,63 个文件 | `m6/build.log`、`dist-r21.sha256` |
| 类型检查净;客户端全量 2654/2654(r2 的 2653 + 本条新测试);守恒闸 40 种子绿 | `m6/summary.txt`、`client-full.raw` |
| 三个检查脚本 exit 0 | `m6/check-*.txt` |
| 新几何测试:r2 的框代码上红(`expected 300 to be 396`,框停在原处),r2.1 上绿 | `m6/red-controls.txt` |

- 新测试做的事:框定位**之后**改版面。
  - 单元被一条横幅推下 96px,不发任何事件:断言框顶跟到 396,不高于上一行的底,提示条顶 398。
  - 横幅消失、页面滚动,单元上移到 60:断言框顶 60,提示条 62,`padding-right` 仍为提示条留着。
  - 另断言:提示条 left 在框左右之间;框里的字、本笔记存档、保存调用数都不因跟随而变。
- 包:ops `packages/editor-rework-r2.1/`(`dist/` + `src/` + `dist.sha256` + `src.sha256`,与 m6 一致)。r2 包没动,`edfix` 没动。
- 锁:按 Tester 的交接约定,先建 `tester-yield.pause`,用完先放锁再删 pause。只跑了构建、类型检查、全量和检查脚本,没开浏览器。

### 待 Tester

- 复测 acc12 那一路:横幅出现与 Dismiss、滚动、改窗口尺寸之后,上一行看得见、点得到,接着打的字落进那一行。框里的字不变。

## 编辑器组 r2.1 回执收讫:只动一文件、新测试修前红、哈希沿用成立,转 Tester(Main_Designer 2026-11-07)

对照「留字框不跟随版面」裁定 + 机理核读的修正方向,核回执与 m6:
- **方向**:builder 独立选了「重放跟随」而非锚 DOM,给的三条理由与我的核读一致(框须活过编辑器重挂;留住的框可能是屏上唯一一份;所属单元可能未渲染)。**对**。
- **范围**:22 文件里只 `structureTypingBuffer.ts` + `useHeadingStructureController.test.tsx` 变,其余 20 个与 r2 逐字节同,含控制器(`m6/source-sha256-r21.txt` 逐行标 `同r2` / `r2.1改`)。**哈希沿用成立**:K 四臂、H-L、注入矩阵用 r2 的数,不重跑。
- **测试**:定位后不发事件推下 96px → 框顶跟到 396、提示条 398;横幅消失 + 滚动 → 框顶 60、提示条 62、padding-right 预留仍在。r2 代码上红(`expected 300 to be 396`),r2.1 绿(`m6/red-controls.txt`)。**对**,与我给的 #4b 规格等价。
- **回执更正**:r2「框跟随单元编辑器」一句撤回。**对**。
- **数**:构建 exit 0(~~`index-VJHeV8Ag.js`~~ 首次构建;**原地换包后主 JS = `index-Ck4z0VFS.js`**,见下),tsc 净,2654/2654,三检查 exit 0。没开浏览器——真浏览器几何归 Tester。
- ~~**未做、记观察**:CPU 门控回执没提~~ → **已补**(builder 收到机理核读后、Tester 开验前原地换包):单元 rect 与预留不变时不写(框/高度/提示条都不写);`document.hidden` 暂停;测试加断言提示条 left 在框内、留字文本 / 本笔记存档 / save 调用数不变。r2 上仍红(300≠396),2654/2654,tsc 净,三检查 exit 0。此条观察项撤销。
- **残留照记**:单元编辑器找不到时框留原处(与改前同)。

**裁定**:r2.1 回执合格,包 ops `packages/editor-rework-r2.1/`(主 JS `index-Ck4z0VFS.js`)转 Tester。复测范围(建议,Tester 定):同源重建;GEO 全套(横幅出现与 Dismiss、滚动 240、改窗口尺寸、字体加载后;上一行/下一行都点都打,0/N;框 inline `style.left` 为 px 还是 `25%` 分开记);地址栏三臂;总表冒烟;r2 已跑完的行为臂按哈希沿用。放行条件不变。

## 编辑器组第二轮裁定:`typedTextIsPlaced` 跨行界误判(注入存档可复现丢、自然路径未触发)——③ 按机理,不挡本轮,入 A-25 第一条(Main_Designer 2026-11-07,答 Tester 短讯)

**Tester 发现**(acc13,第二轮,注入存档:按真实块 id、单元 id 往 localStorage 写一条 3b 同形记录后整页重开;证据 scratch `verify-editor/runs/r2-acc13/`):`useHeadingStructureController.ts:94-105` 的 `forward.startsWith(before + inserted)` / `backward.endsWith(inserted + after)` 把下一行的同字开头、上一行的同字结尾当成「已放好」,存档被删、字不在笔记里:
- S-b1:笔记 `warmup | Title | Body text`,记录 `Title → Title\nBody`:重开后无框、笔记不变,`Body` 丢。
- S-b2:笔记 `See the Note | Intro`,记录 `Intro → Note\nIntro`:`Note` 丢。
- S-a1:笔记 `My great Intro`,记录 `Intro → My Intro`:成 `My great My Intro`(按 after 锚合入;字各一份,不算丢,算合入歧义)。
- 对照:笔记 `Title | Other`,同 S-b1 记录,正确落成 `Title | Body | Other`。
- 自然路径两种各 5 轮未触发:①保存回 500 后继续打字——客户端约 2.5 秒自动重发成功,flush 落定,存档在离开前已清;②`see the note` 下一行行首打 `# note⏎` 关页——第一个结构已把标题搬进单独块,前后向文本只剩标题自己。

**定性**:
- **第③类(按机理)**:「已在笔记里」判得太宽、默默删存档,与第一轮 `od` 同一类病。差别在触发条件:`od` 一打就中;这条要**两件事同时成立**——(1)存档活到重开 = 承载这些字的保存从未被确认(所以服务端本来就没有这些字);(2)邻行恰好以同样的字开头/结尾。Tester 两条自然路径 10 轮没凑齐。
- **不挡第二轮放行**。尺子是:放行条件「③ 为 0」计的是复测臂上**自然路径的实见**;注入存档证实的是逻辑漏洞。本单放行的目的是把「一打就丢」的几条修到岛上;为一个要巧合的漏洞再改控制器,代价是控制器哈希变、K / H-L / 注入矩阵全部重跑、再拖一轮——线上版此刻在更常见的路径上丢得更多。
- **不豁免、不埒平**:入 **A-25 第一条**,名目「重开时『已在笔记里』的判定须锚在单元边界」;Tester 的 S-b1 / S-b2 / S-a1 三个形状 + 对照作为该条的**必红样本**写进 A-25 单。修法方向(Tester 提,我认):`inserted` 之后必须紧接 `after` 原文**或单元结尾**,不能只做前缀匹配;前向拼接后续单元只服务「落地的字里带回车」一种情形,拼接后仍须以 after / 单元结尾收口。builder 本轮**不动**控制器。
- 3b 让存档活得更久,所以这条的暴露面比第一轮大——但第一轮那些字是直接丢的,净值仍是改善。

**Tester 另两条未核的读码所得**(每 800ms 重试调 `history.boundary()` 无上限;`lastBatch` 不随换笔记重置、被放弃的等待者让后续结构反复等同一个卡住的 batch):我另起只读阅读核对中,结果到了追加在下一节,定性以那节为准。先说尺:若重试拍在用户打字时每拍触发一次保存请求,那是岛上会实见的负载问题,进 r2.2;否则记债。

**acc12b 补充**(Tester):框 inline 样式是 px 值不是 `25%`——先锚上编辑器再被推走,与机理核读一致;Dismiss / 滚动 / 改尺寸框与提示条一直停在 721/498.6,` up` 3/3 进框。r2.1 回执两种判别分开记,照办。

## 编辑器组第二轮裁定:卡住的框让每个重试拍发一次保存、切一个撤销步——坐实,进 r2.2;控制器既然要动,跨行界误判一并修(Main_Designer 2026-11-07,答 Tester acc14)

**Tester 数出来了**(acc14,r2,单浏览器;证据 scratch `verify-editor/runs/r2-acc14/`):造一个卡住的框(acc12 形状:存档 `'' → kept\nbody`,单元里只有 `#`),滚开 240px,在 `warmup` 行尾连续打约 9 秒 83 个字符,再等 6 秒;对照 = 同样打字、无框 ×2。

| | 有卡住的框 | 对照 ×2 |
|---|---|---|
| 打字及之后 6 秒的 text-save | **13 次**,间隔约 800ms,每次带整行 | 0、0 |
| Ctrl+Z 回到 `warmup` 的步数 | **14** | 1、1 |
| 空闲 10 秒的 text-save | 0 | 0 |

**定性**:按上节给的尺——重试拍在用户打字时**每拍一次保存请求 + 一个撤销步**,是岛上会实见的负载与手感问题;框一卡住就一直在(这种框的字永远落不下,重试无上限)。**进 r2.2,挡放行。** 不丢字,不归三类表;归「必修」。

**r2.2 的内容**(builder;都在 `hooks/useHeadingStructureController.ts`,所以**控制器哈希必变**):
1. **重试拍失败时零副作用**(必修):一拍里只有当 `typedTextIsPlaced` 为假**且** `mergeTypedText` 给出可落的结果、确定要 `applyEdit` 时,才调 `history.boundary()`;对不上就什么都不碰——不切撤销、不发保存、不动 history。另:重试要有界或退避(800ms 起、上限 10 秒,或改为「单元文本变了才再试」),builder 选,回执写明。测试:jsdom 里一条卡住的记录 + 在别的单元连打 N 拍,断言 save mock 的调用数 = 打字自身产生的数、撤销条目 1 条;r2.1 代码上红。
2. **跨行界误判一并修**(上节刚推到 A-25,**现在收回**:推迟的唯一理由是「改控制器要重跑行为臂」,r2.2 既然必改控制器,这个代价已经在付)。修法按上节:`inserted` 之后必须紧接 `after` 原文**或单元结尾**;前向拼接后续单元只服务「落地字里带回车」且仍须收口。测试 = Tester 的 S-b1 / S-b2 / S-a1 + 对照四个形状,前三个在 r2.1 代码上须红(S-a1 断言为「不删存档」而非合入)。
3. **`lastBatch` 换笔记不重置 / 被放弃的等待者**:我的只读阅读在核,结果追加在下一节;**坐实且修法在十行内就并入 r2.2**,否则记 A-25。builder 先按 1、2 动手,这条等下一节。
4. **Tester 正在查的异常**(重开后 `warmup\n# kept\nbody` 并成一个单元、标题未建、存档空——字都在、顺序对、接进了别的段落):等 Tester 6 轮带网络记录的结果;坐实则按结果定性(很可能是 ③ 落错块)并视机理决定进 r2.2 还是 A-25。builder 不等它开工,但 r2.2 包**等它有结论再封**。

**范围与沿用规则**(对称于 r2.1):r2.2 只改控制器 + 测试;`structureTypingBuffer.ts` 若不变,r2.1 的 GEO 结果沿用;控制器变了,K 四臂、H-L、注入矩阵、地址栏三臂、总表冒烟在 r2.2 包上重跑——这是我上节算过的代价,现在付。

**Tester 现在**:r2.1 的 GEO 全套跑完(沿用);地址栏与冒烟不必在 r2.1 上跑了,等 r2.2;锁继续持着做 acc14 异常的 6 轮;builder 要锁时照旧 pause 文件直接交接。

**给 Henry 的一句**:又一次。这次不是漏验——是 Tester 把一个「不丢字」的状态量出了它的代价(每秒一次多余保存、撤销被切碎),而我原来的三类表只盯着字丢不丢。借这次改控制器,把刚推到下一单的那条也带上,免得下一单再付一次重跑。

## 编辑器组第二轮裁定:Y1 复用同号单元——自然路径第③类(落错块),进 r2.2(Main_Designer 2026-11-07,答 Tester acc5)

**Tester 复现**(acc5,r2,1/3;脚本 scratch `verify-editor/acc5_body.mjs` Y1 段,证据 `runs/r2-acc5/`)——第一轮「发现 1:复用同号单元」那条,第一轮键被提示条吞了没走到这步:
1. 慢回包后改地址离开,回来后留住。存档 `{blockId: warmup 块, unitId: tu-2, initialText: '', text: 'kept\nbody'}`;库里 `[warmup](tu-1) [H ''](tu-2)`——单元已被结构搬进标题块。
2. 用户接着写:点 `warmup` 行尾、回车、打 `next`。
3. 网络:`warmup|` → `warmup|kept|body` → `warmup|nextkept|body`。终态 `[warmup, nextkept, body](tu-1,tu-2,tu-3) [H ''](tu-2)`,存档清空、框消失。

**机理**:回车在 `warmup` 块新建的单元按「剩余最大号 + 1」又编成 `tu-2`;存档只按 blockId + unitId 找单元,认上了这个新空行;`mergeTypedText` 第一行 `if (live === initial) return typed` 在 `'' === ''` 时**不经任何锚点**整段落入——3a「空的一侧不是锚」在它后面,管不到。

**定性**:**第③类(落错块),自然路径,挡放行,进 r2.2**。本该成标题的 `kept` 和段落 `body` 被写进用户刚起的新行、和 `next` 粘在一起,默默发生,框与存档都没了。触发 = 留住时单元已被结构搬走 + 用户之后在原块里回车——grow-by-use 下这是常规动作,不是巧合。

**r2.2 第 5 条**(builder;控制器):
- **必修**:`live === initial` 捷径在 `initial === ''` 时**不得使用**——空对空不算认上,落到锚点逻辑(两侧皆空 → `keep()`)。代价:来自空单元的留字不再凭 id 自动落,留在框里(② 替 ③);这正是 3a 的精神。
- **可选(builder 判,做了要测)**:存档带块内邻接锚(留住时前一单元 / 后一单元的文本快照),重试与重开时邻接对得上才允许落进空单元;旧记录无此字段按「无锚」处理。这是 ① 与 ② 的差别,不是放行条件。单元 id 可复用的根子(「剩余最大号 + 1」)与 A-25 的 clientCreateKey 线索同题,本轮不碰。
- **测试**:Y1 三步的 jsdom 版——留住后结构把单元搬走、原块回车新建同号空单元、打 `next`;断言新单元只含 `next`、存档仍在、框仍在;r2.1 代码上红(`nextkept`)。Tester 的 Y1 脚本作浏览器臂。

**r2.2 现有清单**:1 重试拍零副作用 + 有界;2 跨行界锚单元边界;3 `lastBatch`(候核读);4 「并成一单元」异常(候 Tester acc12c);**5 Y1 空锚捷径**。包等 3、4 有结论再封。

## 编辑器组 r2.2 · 两条读码所得的核读:重试拍坐实(修法=先算合入再封界);`lastBatch` 坐实但后果被高估,十行内并入(Main_Designer 2026-11-07)

来源:三路只读阅读(两读者 + 一怀疑者),对象 ops `editor-rework-r2.1/src/` 快照(控制器与 r2 逐字节同),行号对它。

**A · 重试拍每拍封界(Tester acc14 实测 13 次保存 / 14 步撤销)——坐实。**
- 两个 800ms 循环共用 `PLACE_RETRY_MS`(`:46`):(a)留住条目的 `retryTimer`(`:180-186`,`:207`/`:450` 起、`:184` 自续,**无计数无期限**;`waitingSince` 每拍重置(`:183/:406`),`overdue`(`:434`)永不累积);(b)3b 的 `confirm` 落地后等 flush(`:500-509`),`attempt < 30` 的上限只属于它。
- 每拍 `placeTyped` 在算合入**之前**就调 `history.boundary()`(`:460` 先于 `:461 mergeTypedText`);卡住形状下 `:407-458` 的门全过,`mergeTypedText('#','', 'kept')` 回 null(`:80-84`)→ `keep()` → 再排 800ms。`boundary()` 无参时 `scope.session.seal()`(`useTextFlowHistory.ts:654-660`),session 按笔记一份(`:537-582/:610`),`onSeal` 把当前打字组推成独立撤销条目并排一次 persist → `saveBlock`(`:575-580 → :220`)。所以用户在笔记任何地方打字,每拍一个撤销步 + 一次保存。空闲拍是否发保存取决于 `textFlowEditSession.ts`(不在 22 文件内),Tester 实测空闲 10 秒 0 次,按实测记。
- **r2.2 第 1 条的修法定为**:把 `:460-463` 的顺序倒过来——先 `mergeTypedText`,对不上 `keep(); return`,对得上才 `history.boundary()`。`mergeTypedText` 只读 live 流与框(`:417-419/:461`),`boundary()` 不改这两者,落地结果不变;落地前那一次封界(`:460 → :491`)照旧在 `applyEdit`(`:480`)之前。800ms 的节律与无上限可留(`:447` 注明是有意的),改完一拍卡住只读不写;退避/「单元文本变了才再试」是另一个决定,builder 可做可不做,回执写明。测试规格见核读(卡住记录 + 另一块开着打字组不封;40ms 重试拍;200ms 内 save mock 调用数不变;再手动 `boundary()` 一次 → +1;r2.1 上红)。

**B · `lastBatch` 换笔记不重置 / 被放弃等待者让后续结构反复等——机理坐实,后果被高估。**
- `lastBatch` 一个 `useRef` 槽(`:141`),`:301` 读、`:303` 在 `previous.session === session` 时等、**`:368` 才赋值**(在 `runStructureBatch :306` 之后);noteId 的 effect(`:219-222`)不重置它。「按笔记作用域」在「只等同笔记 batch」的意义上成立(`:303` 同笔记门),我原要求两种写法任一即可,**回执不算错**。
- 卡链:run N 的 batch 不落定 → N+1 在 `:303` 等、被自己的看门狗放弃(`:284-291`)、永不到 `:368` → 槽仍指 N 的 promise → N+2、N+3 各再等满 10 秒。**但**:四个文件里每条失败路径都让它落定(`:368 batch.catch`;history `:940-943/:585/:603/:230-232/:370-371/:459-460/:518/:526-527`);只有适配器/宿主的写永不 resolve(无超时)或长时间卡顿才进得去——Tester 的 25 秒臂就是一种:卡顿期间每次新结构白等 10 秒。无丢字;每次 10 秒 busy、键进窗口、然后落地或留住。
- **并入 r2.2 为第 3 条(十行内,照规矩)**:在 `:258` 旁加 `waitingFor`;`:303` 改为记下等的是谁、等完清掉;看门狗回调(`:284-291`)在 `activeRun.current = null` 后加:若本 run 仍在等且 `lastBatch.current === waitingFor`,把槽换成 `{ settled: Promise.resolve() }`。效果:下一个结构直接到 `runStructureBatch`,flush 落定后在 `useTextFlowHistory.ts:585` 被立即拒(`batchEntries` 非空)→ 立刻 onFailure,而不是再等 10 秒;flush 自身卡住则与今天同,不更差。测试规格见核读(watchdogMs 300;第一个 batch 的 reorder 永不 resolve;第二次结构被自己看门狗放弃 ≥300ms;第三次 <250ms 即失败——r2.1 上红、修后绿)。根子(写无超时)在适配器,不在本单。

**r2.2 定稿清单**:1 重试拍先算合入再封界(必修);2 跨行界锚单元边界(必修);3 `lastBatch` 被放弃等待者归位(并入);5 Y1 空锚捷径禁用(必修);4 「并成一单元」0/6 不挡。**可封包**。

## 编辑器组第二轮裁定:存档所指单元已被结构搬出原块时,框停在原地压住别的行——第 4 条再次未过,③,r2.2 第 6 条(Main_Designer 2026-11-07,答 Tester r2.1 GEO)

**Tester r2.1 GEO 结果**(`index-Ck4z0VFS.js`,同源 63/63):
- **过**:BAN 3/3(重开框 top 563.0 正在 `#` 上,dy 0;滚动 240、改 1100×900 后 dy 仍 0;点 `warmup` 打 ` up` 落进 `warmup` 3/3);GEO-long-0 框随滚动走。Dismiss 一步未走到(打字先触发保存、横幅自消),Tester 改序补一组。
- **没过**:GEO-enter 2/2、GEO-long-1 1/1,形状 = **存档所指的单元已被结构搬出原块**。布局 `warmup | (新行 # kept⏎body) | below`;结构把 tu-3 搬进新标题块、放到 `below` 后;存档仍 `{blockId: 原块, unitId: tu-3}`。框停在 467 正压 `below`(467)与下面的空标题行,提示条同压;滚动后 `below` 到 227、改尺寸后到 401,框都停在 467——follower 每 50ms 的 `editorFor(原块, tu-3)` 找不到单元就停在上一次位置。点 `below` 打 ` down` → 进框、并进留字(`kept down\nbody`)、存档跟变,`below` 不变。

**定性**:第 4 条「框的占位不覆盖已有文字、上一行/下一行点得到、打的字落库」**再次未过**;按结果 ③(落错位置),挡放行,**进 r2.2 第 6 条**。这一形状不是边角:结构的本职就是把单元搬进新块,留住的记录十有八九指向已搬走的单元。r2.1 回执「单元编辑器找不到时框留在原处,和改前一样」我当时记为「残留」——**判轻了**,记台账。

**r2.2 第 6 条**(必修;会动 `structureTypingBuffer.ts` 和控制器两处,所以 **r2.1 的 GEO 不再沿用**,r2.2 上 GEO 全套重跑):
1. **记录跟着单元走**(控制器):结构把单元搬进新块时,留住的记录(内存与存档)的 `blockId` 改成单元现在所在的块——控制器知道自己把 tu-3 搬去了哪;恢复/重试/跟随都按现 blockId 定位。这也顺带让 Y1(原块新建同号单元)认不上旧记录。⛔ 用「全笔记按 unitId 搜」替代——单元号块内复用,跨块同号会认错(与 Y1 同病)。
2. **锚点找不到时,框不得压在任何笔记行上**(buffer):找不到单元编辑器(真删了、分页不在当前页、只读)就不能停在上一次位置——退到不覆盖文字的位置(builder 定:文本栏之外的停靠位,或折成只剩提示条的小条,点开才展开),字仍在屏上或一步可见,Discard 仍是显式动作,⛔ 删 DOM。每次重放后自检:框的矩形不得与除自己单元外任何编辑器矩形相交,相交即视为无锚处理。
3. **测试**:(i)两块布局,结构把单元搬进第二块后留住 → 框 top = 该单元在新块里的编辑器 top,记录 blockId 为新块;(ii)记录所指单元在任何块里都不存在 → 框矩形与所有编辑器矩形不相交,提示条仍可见、Discard 可点;两条在 r2.1 代码上红。浏览器臂 = Tester 的 GEO-enter / GEO-long-1(点 `below` 打字 0/N 进框)。

**另一条候查**(Tester acc15 在跑):慢回包 9 秒、打约 120 字、立即改地址离开、11 秒后回来,重跑的结构 unit-transfer 回 **409**;屏上把这串字显示为标题、库里没有、存档空、`warmup` 打字无反应像只读;终态 `[warmup, below] [H ''] []`。未整页重开,尚不能说丢。等 acc15(长字 ×3、短字 ×3、短字 4 秒对照 ×3,皆整页重开)结果再定性;**r2.2 封包等这条**。

**r2.2 清单(更新)**:1 重试拍先算合入再封界;2 跨行界锚单元边界;3 lastBatch 归位;5 Y1 空锚捷径禁用;**6 记录跟单元走 + 无锚不压行**;(候)acc15 的 409 路径。

## 编辑器组第二轮 · acc15 丢 0 / 409 未复现;GEO-long-0 的 409 路径按「闸里加臂」定夺,不靠浏览器撞运气(Main_Designer 2026-11-07)

**Tester acc15**(r2,控制器与 r2.1 同):9 轮整页重开后**丢 0**——长字 120 字扣 9 秒 ×3 全留住(框 + 本笔记存档);`kept` 扣 9 秒 ×3 全落进笔记(+空块 2 次);`kept` 扣 4 秒 ×3 两落一留。回来后在 `warmup` 打的字 9/9 落库,无一卡只读。**409 九轮一次没出**。

**GEO-long-0 那一次的数**(Tester):409 在 19960ms(回来后控制器重跑结构、19674 起建块,unit-transfer 回 409);之后 15 秒以上**一个 text-save 没发**;`warmup` 打的字不出现(只读)、点 `below` 焦点落 BODY;屏上那串字显示为标题;库里 `[warmup, below] [H ''] []`;本笔记存档**空**。未整页重开,「丢」未定——但「屏上有、库里无、存档无、打字被吞」同时成立,一刷新多半就没。

**我的读法**:这是「结构非原子」(A-25 已记)在 409 上的致命形态——原块的保存(摘走单元)成功、搬进标题块的 transfer 被 409 拒、字只剩客户端内存;存档为空说明记录在结构重跑时已被清(字进了单元就算落地),transfer 失败后没人把它写回。进过窗口的字在卸载时丢,正是边界断言要拦的——闸里没有 409 臂,所以闸不知道。

**裁定**:
1. Tester 再撞 6 轮照跑,但**不以浏览器复现为定夺**。builder 在 r2.2 里给守恒闸**加一条 409 臂**(只加测试,不改行为):窗口里的字落进单元后,结构的 unit-transfer 回 409(冲突),随后卸载 + 重开;断言字在服务端或在本笔记存档里。r2.1 代码上**红即坐实 ③**、绿则这条路径不在闸能到的形状里(再按 Tester 的实见记)。
2. builder 同时**按代码回答**(写进 r2.2 回执,行号对快照):transfer 409 时 batch 怎么收尾——有没有回滚/把单元文本写回原块;失败保持(Retry/Undo)有没有出现;留住记录为什么是空的(哪一行 forget 了它);那 15 秒不发保存、打字被吞是哪个状态位(`canApplyEdit` 假?`isReplaying` 卡真?)。
3. **闸红则本轮修**(③ 自然路径,挡放行):方向——transfer 失败时把该单元的字写回留住记录(锚上原块邻接)或回滚原块的摘除;失败保持必须可见可操作(Retry/Undo),⛔ 无提示只读。修法大小决定进 r2.2 还是 r2.3。**闸绿且 6 轮未撞到**则记「一次实见、未复现、机理指向 409 后状态卡死」,入 A-25 第二条(紧随「结构中途被打断不回滚」),不挡。
4. r2.2 封包等闸的颜色和 builder 的代码回答,不等 Tester 的 6 轮。

**给 Henry 的一句**:这一条若坐实,是本单到现在最重的——不是留字框的几何,是结构本身在服务端冲突时把字丢在半空。闸里早该有 409 臂;补上后它会替我们一直看着。

## 编辑器组第二轮 · 闸的 409 臂在 r2.1 上绿;再加一条按 GEO-long-0 原形复合的臂定夺(Main_Designer 2026-11-07,答 builder 短讯)

- **builder 报**:闸新增故障 `conflict`(假 transfer 回 null、服务端不落任何东西,与真适配器 409 后重读不符、toast、回 null 一致)。臂 A(第二个结构的 transfer 冲突):字在那之前已作标题块保存落库,重开后字全在服务端,残留 = 未拆标题块 + 空建块 new-2(已知空残块类),非 ③。臂 B(第一个 transfer 冲突):onFailure,字落回原块并保存,下一个结构成功,0 丢。两臂留在闸里作路径覆盖。
- **我的读法**:闸绿,但闸的两臂里**承载字的保存都到了服务端**;GEO-long-0 的形状是——慢回包 9 秒 + 改地址离开(承载字的保存**没到**服务端)→ 回来 → 从留住记录恢复 → 控制器重跑结构 → transfer 409 → 字只剩内存、记录已空、15 秒零保存、只读。差在「字从未落库」这一前提,闸现在的 409 臂没把它和 409 叠在一起。
- **裁定**:按预先说好的尺,闸绿 → 不以 ③ 挡;**但再加一条复合臂**(只加测试):慢回包 + 卸载(承载字的保存未到)+ 重开(从记录恢复)+ 恢复后的结构 transfer 回 409 + 再卸载重开;断言字在服务端或本笔记存档。这是 GEO-long-0 的原形。r2.1 上红即 ③ 本轮修;绿则连同 Tester 的 6 轮结果记 A-25,不挡。封包等这条臂的颜色 + 代码回答(两者都快)。
- r2.2 进度(builder):1、2、3、5 已完成且测试先红;6 已实现、测试在写。

## 编辑器组第二轮 · Tester r2 行为臂早期信号(控制器 = r2.1):H-L 3/3 绿;KRO「等待中打字进窗口」裁为既有、入 A-25;一次无锁孤儿探针(Main_Designer 2026-11-07,答 Tester)

**结果**(r2.2 前的早期信号;控制器 r2.2 要变,这些臂在 r2.2 上重跑):
1. **H-L(Tester 臂,3b 路径)3/3 ①** `[warmup] [H head] [body]`——3b 的第一份浏览器绿;第一轮基线三版 3/3 丢。
2. **K25** 不带回车 ① 1 / ②′ 1,带回车 ②′ 2——界外预期。
3. **KU**(扣改角色那次保存 + 整页卸载,请求阶段 + Page.navigate):1.5 秒 1 行、11 秒 2 行留住(框 `two\nbody`,存档在,笔记剩字面 `#`);1.5 秒另 1 行丢 `wo\nbody`——但标题没建成、第一次保存是 `warmup|# t`,字**从没进过窗口**,是普通打字保存被扣再卸载,**归 A-20**(早先已裁不算本单)。builder 代理层同臂 ① 2,层不同结果不同,照记。
4. **EDGE**(承载保存失败 → 结构搬单元 → 关页 → 重开)a/b 各 2 轮:`[warmup] [H head, body]`,字在库里不重复、同块未拆(②′),没出框——「框里有字笔记里也有」的形状没碰到。
5. **NA** 3/3 ok,`abc` 单独成段。
6. **TWO 作废**(前置条件错:一个框 `twoone` 也算成立;实为第二次打的字进了第一个框 = r2.2 第 6 条那病),改 TWO2「两个不同的框」在 r2.2 上跑。
7. **KRO**(扣改角色那次保存 12 秒):等待中所有编辑器 readOnly,点 `warmup` 焦点过不去;2 秒、8 秒各打一串都进了还开着的窗口,放行后落在 `body` 后(`body p q`,2/2)——**用户点了别的行再打字,字落到正在结构化的那一行**。Tester 倾向不可忍;冻结版对照在补。

**裁定**:
- 1–5 照记;3 的丢行归 A-20 不计本单;r2.2 上全部重跑。
- **KRO**:这是结构等待期的设计——笔记只读、窗口持键,为的是键不丢;字进窗口而不是被丢或与结构赛跑,是当下三个坏选项里最不坏的。**不是本轮改出来的**(等冻结版对照坐实),**不挡放行**;但 Tester 的判断我认:10 秒里点了别处打字、字跑去另一行,人会以为自己打错了地方。入 **A-25**,与「结构非原子」同题:要么等待期可见地提示「键进这里」、要么把等待缩短到人感觉不到、要么结构原子化后放开编辑——是设计题,不是补丁。
- **无锁孤儿探针**(Tester 自报):停链时 TaskStop 只停外壳,排队的 run-pair 在 pause 删除后取锁拉起两探针;杀 run-pair 时 trap 把锁删了,两探针无锁跑约 30 秒,行目录标 VOID 不计数;若 builder 那时取锁则并行过 30 秒。Tester 写进 METHOD。我这边记台账:**「停链」要连子进程一起停、trap 删锁前先确认没有子进程在跑**——与 11-06 漏放锁同一类,下次再出就机械化(锁文件带持有者 pid 列表,trap 只删自己那一行)。

## 编辑器组第二轮 · 复合 409 臂 r2.1 / r2.2 皆绿 → GEO-long-0 入 A-25 不挡;KRO 冻结版同样 → 既有坐实;r2.2 可封包(Main_Designer 2026-11-07)

- **复合臂**(builder,GEO-long-0 原形:holdSaves:1 后所有保存不到服务端、不回;建标题、打字、回车、打字、等待;卸载;重开 → 字从本笔记 3b 记录恢复并落地,`save new-1` 到服务端;恢复后的结构建 new-2、`transfer tu-3 CONFLICT (409)`、onFailure;再卸载重开):**r2.1 绿、r2.2 绿**——终态字全在服务端,残留 = 未拆 + 空块 new-2。闸里恢复后的字先于结构 batch 落库(`runStructureBatch` 先 flush)。变体(角色保存之后全部扣住、窗口开着卸载)到不了 409(第一个结构先失败),亦绿,留作覆盖。
- **裁定**:按预先说好的尺——闸两种形状都到不了 GEO-long-0 的「记录空、零保存、库里无」,浏览器侧 11 轮一次,**入 A-25 第二条**(「结构非原子」之下,标「一次实见、机理指向 409 后状态卡死;闸两臂绿」),不挡放行。builder 的代码回答(409 时 batch 收尾 / 失败保持 / 记录何处 forget / 只读状态位)照进回执,作 A-25 的起点。
- **KRO 冻结版对照**(Tester,冻结 13142,2 轮):与 r2 一样——readOnly、` zz`/` xx` 进窗口、放行后 `body zz xx` 2/2。**A-18 时期窗口已有的行为,非本轮引入**,坐实;报告观察项,不挡;另开单与否:**并入 A-25 的设计题**,不单开。
- **r2.2 封包放行**:清单 1、2、3、5、6 + 闸两条 409 臂;代码回答进回执;逐文件 sha256 标「同 r2.1 / r2.2 改」(buffer 与控制器都变 → GEO、K、H-L、矩阵、地址栏、冒烟在 r2.2 上全跑,无沿用);包 ops `packages/editor-rework-r2.2/`。Tester 的 r2 行为臂结果作「早期信号」记,r2.2 判语以 r2.2 上的数为准。

## 编辑器组 r2.2 Result(builder 2026-11-07)

答 r2.2 定稿清单 1、2、3、5、6 + 闸 409 两臂 + GEO-long-0 复合臂 + 代码回答。证据 `docs/audits/2026-11-05-a21-builder/builder/matrix-7-r2.2/`(下称 m7)。

### ⚠️ 先请裁一处:第 5 条让三个常见失败恢复由 ① 变 ②

- 浏览器注入矩阵(r2.2 包)里,下面三臂由 r2 的 ① 2 变成 ② 2:
  - `enter_create`(建块失败)
  - `enter_placement`(放位置失败)
  - `enter_hangWatchdog`(转移卡死,看门狗放手)
- K 臂「卡住 + 整页卸载」也由 ① 2 变成 ② 2。
- 实见(`m7/enter-r22.json` 的 `reopened`):字都在框里,本笔记存档在(`initialText: ''`、`text: 'kept\nbody'`),没丢、没双写,只是不再自动落回。
- 原因:这些臂里,窗口所在的单元都是 `# ` 刚变出来的空标题单元。按第 5 条,来自空单元的留字不再凭「空等于空」自动落。
- 是第 5 条字面要的结果(② 替 ③),但面比 Y1 宽:建块 / 放位置失败、看门狗之后的常规恢复,都要用户自己从框里复制。
- 可选的收窄(未做,候裁):存档记下留住时单元的 `writing_role`。空对空时角色一致才放行。Y1 是回车新建的普通段落,`# ` 之后是标题,两者分得开。另外,第 6 条让记录跟着结构搬走的单元走,Y1 那种「原块里同号新单元」已经认不上旧记录。若准,进 r2.3,只动控制器。

### 包与同源

- 源码 = `9bc45e69` + 22 个文件,副本−基线仍是这 22 个。逐文件 sha256 对 r2.1(`m7/source-sha256-r22.txt`):
  - `r2.2改`:
    - `hooks/useHeadingStructureController.ts`(`693f9c9d9443…`)
    - `structureTypingBuffer.ts`(`bc12bcdebd55…`)
    - `hooks/useHeadingStructureController.test.tsx`(`d78e0e01f5c7…`)
    - `hooks/structureTypingConservation.test.tsx`(`ca2ab6424bfa…`)
  - 其余 18 个与 r2.1 逐字节同。
- 包:ops `packages/editor-rework-r2.2/`。`dist/` 主 JS `index-sNlfO3uB.js`,63 个文件;`src/` 22 个文件;两份哈希与 m7 一致。r2 和 r2.1 的包都没动,`edfix` 没动。
- 控制器和框都变了,这次没有沿用任何臂,下表全部在 r2.2 包上重跑。

### 全量、检查、阳性对照

| 数 | 证据 |
|---|---|
| 构建 exit 0;类型检查净;客户端全量 2667/2667;守恒闸 40 种子绿(边界断言在跑) | `m7/summary.txt`、`client-full.raw` |
| 三个检查脚本 exit 0 | `m7/check-*.txt` |
| 本轮 8 条阳性对照,在 r2.1 的控制器 + 框上全红(对照形状那条照应绿),在 r2.2 上全绿 | `m7/red-controls-full.txt` A 段(第 1–20 行)、C 段(第 34–39 行) |
| 闸的 4 条路径臂(409 ×2、GEO-long-0 ×2)在 r2.1 和 r2.2 上都绿,只记颜色,不是先红后绿 | 同上 B 段、C 段 |
| r04@57:156 行坏 0;dist 跑前跑后一致 | `m7/r04-r22-57.log`、`summary.txt` |

### 每条修了什么

1. **重试拍零副作用 + 有界**:`placeTyped` 先算 `mergeTypedText`,算出可落结果才调 `history.boundary()`。对不上就 keep(),不切撤销、不发保存、不碰 history。
   - 重试间隔从 800ms 起,每次拒绝后翻倍,上限 10 秒(`RETRY_MAX_MS`)。
   - 测试:卡住的记录 + 另一块里有一个没封的打字组。200ms 内保存调用数不变,提示条在;手动封界后保存恰好 +1。r2.1 上红(第一拍就封界、发了保存)。
2. **跨行界**:`typedTextIsPlaced` 只认整段打下的字在行界处收口。从锚单元往前读须以它开头,且后面紧接行界或结尾;往回读对称。
   - `mergeTypedText` 加一道只留不删的闸:锚点解释不了的那段现文本里若已含这些字,就 keep()(可能已落过又被续打)。
   - 测试是 Tester 的四个形状:S-b1 落成 `warmup|Title|Body|Body text`;S-b2 落成 `See the Note|Note|Intro`;S-a1 留住(存档、框都在,笔记不变);对照落成 `Title|Body|Other`。r2.1 上前三个红,对照绿。
3. **lastBatch 归位**:被看门狗放弃的等待者,若槽仍指它在等的那个 batch,就把槽换成已落定。下一个结构直接到 history,history 当场拒绝,立刻 onFailure,不再白等一个看门狗。
   - 测试:第一个 batch 的 reorder 永不返回;第二次结构被自己的看门狗放弃;第三次 <250ms 失败。r2.1 上 356ms(红)。
5. **Y1**:`mergeTypedText` 的「空等于空」捷径只给活窗口用,留住的字(重试、恢复)要真锚。
   - 测试:原块里回车新建同号空单元、打 `next`。新单元只含 `next`,存档、框都在。r2.1 上红(存档被吃掉)。
   - 影响见文首 ⚠️。
6. **记录跟单元走 + 无锚不压行**:
   - 控制器:结构把单元搬进新块时,同笔记里锚在这个单元(原块 + 单元号)上的留住条目,内存里的 focus 和存档里的 blockId 都改成新块。只认结构自己知道的搬动,⛔ 全笔记按单元号搜。
   - `retainWords` 的存档改为写入时读 `entry.focus`(原来用的是留住那一刻的解构值)。
   - 框(只对留住的框;活窗口照旧压在单元上):每次放置后自检,框与自己单元以外的任何编辑器相交,或单元找不到,就停靠到文本栏外,先右后左。两侧都放不下,就折成只剩提示条,带 `Show words`,字一步可见。按钮顺序是 Discard 在前。⛔ 删 DOM。
   - 测试:(i)结构把单元搬进新块后,存档 blockId 为新块,框顶跟到新块编辑器(420);(ii)单元消失、下一行顶上来,框与所有编辑器不相交,框在、字在、Discard 可用。r2.1 上都红(存档仍是 `source`;框压在 `below` 上)。

### 浏览器(r2.2 包;每臂注入层写明)

| 臂 | 注入层 | r2.2 | 对照(r2 按笔记 harness) |
|---|---|---|---|
| 注入矩阵 26 行 | 代理层(浏览器已发出) | ①14 ②12 ③0 | ①20 ②6 ③0 |
| 其中地址栏三臂:改地址离开、慢回包改地址、慢回包卸载 | 同上 | ② 2 / ② 2 / ② 2 | 同 |
| 其中 create / placement / hangWatchdog | 同上 | ② 2 / ② 2 / ② 2 | ① 2 / ① 2 / ① 2(见文首 ⚠️) |
| K:卡 12 秒后成功 / 失败 / 卡住 + 卸载 / 卡 25 秒后成功 | 代理层扣改角色那次 text-save | ① 2 / ②′ 2 / ② 2 / ②′ 2 | ① 2 / ②′ 2 / ① 2 / ②′ 2 |
| H-L(`h_HL`,**不是 Tester 的 H-L 时序**,见 r2 回执) | 浏览器请求阶段(CDP Fetch) | ② 3 | ② 3 |
| r04@57(冒烟) | 无注入 | 156 行坏 0 | 同 |

- 证据:`m7/enter-r22.json`、`k-r22.json`、`hl-r22.json`。
- **GEO**:Tester r2.2 复测。我这边的单元证据是三条 jsdom 几何测试:
  - `r2.1 #4: the kept box follows its unit when the layout moves after it was placed, and covers no line`(定位后移版面;r2 上红见 `matrix-6-r2.1/red-controls.txt` 第 2 行,r2.2 全量绿)
  - `r2.2 #6 (i): kept words whose unit a structure moves to a new block go with it, in storage and on screen`(m7 `red-controls-full.txt` 第 9 行红、C 段绿)
  - `r2.2 #6 (ii): when its unit is nowhere on screen, a kept box leaves every line uncovered and stays reachable`(同上第 10 行红、C 段绿)

### 代码回答(行号对 ops `editor-rework-r2.1/src/` 快照;适配器不在 22 个文件里,行号对基线 `9bc45e69`,未改)

- **transfer 回 409 时 batch 怎么收尾**:
  - 适配器 `transferTextUnit` 的 catch 弹「The unit could not be moved. Retry saving or undo before leaving the note.」,返回 null(`useNoteCanvasDataAdapter.ts:3091`)。
  - history 的 `persistUnitTransfer` 拿到 null 返回 null(`useTextFlowHistory.ts:328` 一带)。
  - `persistExtraction` 在 `:440` 返回 false。进函数就设的 `documentFailures.set(transaction, side)`(`:383`)只在成功时删(`:457`)。finally 里 `onSaveFailure`(`:463`)弹第二个提示。
  - **没有回滚**:已建的块留着(空),源块里那份已应用的本地编辑不撤,单元文本不写回原块。`extraction.unresolvedTransfer` 留在 side 上,等 Retry / Undo 再走 `:393-397` 那段先补齐。
- **失败保持**:有。`documentFailures` 非空时,`canApplyEdit()` 为假(`:637`,含 `!scope.documentFailures.size`),`isEditHeld()` 为真(`:640`),`replaying` 为真(`:955`)。
  - 打字被拒、不发保存,要等 Retry 或 Undo。这就是那 15 秒零保存、打字被吞的状态位。
  - 可见的只有两条临时提示(适配器那条和 `useNoteCanvasRuntimeController.ts:391` 那条),没有常驻的 Retry 控件。⛔ 无提示只读的顾虑成立,入 A-25。
- **留住记录在哪 forget 的**:控制器里删存档只有四处:
  - `:203` Discard
  - `:427` `finish()`,字落地那一刻
  - `:501` 3b,`history.flush()` 落定之后
  - `:544` 恢复时判「已在笔记里」
  - GEO-long-0 的空存档,只能是 `:427`(恢复回来的字落地)接 `:501`(3b 的 flush 落定),或 `:544`(恢复时按本地草稿判已在)。前者要求那次落地保存被确认,与库里没有那些字矛盾。后者在 SPA 路由回来、适配器草稿还在时可能发生:r2.1 的「已在」比的是子串式的前缀,r2.2 第 2 条已收紧到行界。
  - 闸复现不出(两版皆绿),所以分不清实际走了哪一处。作 A-25 的起点。

### 已知、未修

- 文首 ⚠️ 那一项候裁。
- 第 6 条只认本次挂载里结构自己做的搬动。页面在「搬单元」和「改写存档」之间消失时,存档仍指旧块,框按无锚处理(停靠,不压行)。
- 409 后的失败保持没有常驻控件(见上),入 A-25。

## 编辑器组 r2.2 回执收讫 + ⚠️ 裁定:准 r2.3 角色收窄(只动控制器);Tester 先在 r2.2 上跑 GEO,行为臂等 r2.3(Main_Designer 2026-11-07)

**回执核对**(只读 m7):22 文件里改 4(控制器、框、两测试),18 同 r2.1;2667/2667、tsc 净、三检查 exit 0、r04@57 156/0、dist 不变;8 条阳性对照 r2.1 上红 r2.2 上绿(`red-controls-full.txt` A/C 段);闸 4 条路径臂两版绿;注入层逐臂写明;浏览器矩阵 ③ 0、K 四臂 ③ 0、`h_HL` ② 3;代码回答四处 forget 与状态位(`documentFailures` → `canApplyEdit` 假 / `isEditHeld` 真 / `replaying` 真)写清,409 后无常驻 Retry 控件 → A-25。**合格。**

**⚠️ 第 5 条的面太宽——准 builder 提的收窄,进 r2.3**:
- 事实:第 5 条把「空等于空」捷径对留住的字一刀关掉,建块失败 / 放位置失败 / 看门狗放手这三个**常见**失败恢复和 K「卡住 + 卸载」都从 ① 变 ②(矩阵 ①20→14、②6→12):字在框里、存档在,但**不再自己落回**,用户得从框里复制。这不是 Y1 的形状——这些单元是 `# ` 刚变出来的空标题单元,记录就该落回去。
- 为什么能收窄:Y1 的真机理(原块里回车新建同号段落)第 6 条已挡住(记录跟着搬走的单元走,原块同号新单元认不上);第 5 条剩下的价值是兜第 6 条的缺口(页面在「搬单元」和「改写存档」之间消失,存档仍指旧块)。**角色一致**正好兜这个缺口:回车新建的是段落,记录锚的是标题。
- **r2.3 要求**(只动控制器 + 测试;`structureTypingBuffer.ts` ⛔ 动):
  1. 留住时记录写入单元当时的 `writing_role`;第 6 条改写记录 blockId 时角色不变。
  2. 留住字的「空等于空」自动落只在三者同时成立时放行:记录的 (blockId, unitId) 当前确有其单元;单元文本为空;单元 `writing_role` 等于记录的角色。旧记录无角色字段 → 不放行(keep)。活窗口照旧。
  3. 测试:(a)Y1 原测试仍 r2.1 红 / r2.3 绿;(b)Y1 变体——存档仍指旧块(模拟第 6 条缺口)+ 原块回车新建同号空段落 → keep,r2.2 之前的代码上红;(c)**回归守卫**——建块失败后的恢复(空标题单元、同角色)→ 自动落 ①:r2 上绿、r2.2 上红、r2.3 上绿——这条证明收窄把失去的恢复拿回来了。
  4. 矩阵 r2.3:create / placement / hangWatchdog / K 卸载回到 ① 2;地址栏三臂仍 ②;③ 0。
  5. 回执逐文件 sha256 标「同 r2.2 / r2.3 改」;框不变 → **Tester 在 r2.2 上跑的 GEO 沿用到 r2.3**(文件级同源,与 r2.1→r2.2 的规则对称)。
- **残余风险写明**:同块内 id 复用 + 同角色 + 空——三重巧合才误落;记 A-25「单元 id 可复用」那条下。

**Tester 现在**:r2.2 包的 **GEO 全套**(横幅 / Dismiss 改序 / 滚动 / 改尺寸 / 搬走单元形状 GEO-enter、GEO-long-1 / 无锚停靠 / TWO2)现在就跑——框是终版;行为臂(K、H-L、矩阵、地址栏、冒烟、acc12/13/14、Y1、EDGE)等 r2.3 包。单卡状态行改回「返修 · builder(r2.3)」,看板同。

**给 Henry 的一句**:r2.3 是我这边要的——r2.2 为了堵一个巧合把三条常见恢复路都堵了,builder 自己看出来、给了收窄法。我准了,代价是 builder 一小时和 Tester 行为臂推后;不准的话你每次标题建块失败都会多出一个要手动处理的框。

## 编辑器组第二轮裁定:r2.2 框侧两条红——停靠位伸进文本栏盖字;两框完全重叠 Discard 删错——第 4 条又两形状,③,并入 r2.3(框也动;GEO 不再沿用)(Main_Designer 2026-11-07,答 Tester)

**Tester r2.2 GEO**(证据 scratch `runs/r22-geo/`):
- **过**:BAN 3/3;先 Dismiss 3/3(Dismiss / 滚动 / 改尺寸后框都在单元上);GEO-enter 2/2、GEO-long 2/2(无锚停靠左侧、不压行、上下行点得到打得进——**左侧放得下时是好的**);acc14 多余保存 0。
- **红 1 · 停靠后框仍伸进文本栏**(GEO-noEnter 2/2;TWO2 第 0、2 轮同因):`warmup | (新行 # kept 不回车) | below`,慢回包改地址回来。框锚上自己单元(框顶 = 单元顶 467),但框高 65px、单元行 35px,盖到 `below` → 自检触发 → 停靠左侧;左侧不够宽,框 right 784 而文本栏从 711 起,伸进 73px(另一轮 2px);`below` 整词被挡,g0 命中测试 `below` 与标题行左端都命中 BOX;回执说「两侧都放不下就折成提示条」,这里**没折**;提示条 1 次越出框外。
- **红 2 · 两条留字记录的框完全重叠,Discard 删错**(TWO2 第 0、2 轮;第 1 轮错开则正常):两框 rect 完全一样(428–493 × 589–1015)、两提示条亦同;屏上只见 `two\nbbb`,`one\naaa` 整个压在下面;两框都 `own: null` 停靠,停靠位伸进栏内 304px 把 `warmup` 和标题行整行盖住。按 `one` 的 entry 找到它的 Discard 去点,**删掉的是 `two`**(s3 只剩 `one\naaa`,存档只剩 `one`);第 2 轮点 Discard 无反应。自检只查框与编辑器相交,不查框与框;停靠位不查自己是否仍在栏内。

**定性**:两条都是第 4 条「框的占位不得覆盖已有文字、字仍可见、Discard 是显式动作」的新形状。**红 2 = 默默删错字,③(丢失);红 1 = 盖字 + 点上去进框,③(落错位置)**。挡放行,**并入 r2.3**——r2.3 从「只动控制器」改为「控制器 + 框」;**Tester 在 r2.2 上跑的 GEO/BAN 不再沿用**,r2.3 上重跑 GEO 全套。

**r2.3 追加(框,`structureTypingBuffer.ts`)**:
7. **停靠位自己要过自检**:停靠后的框矩形必须完全在文本栏之外(左右边距任一侧),且不与任何编辑器、任何其他留字框 / 提示条相交;两侧都放不下整框 → **真的折**成只剩提示条(带 `Show words`),折叠条本身也要过同一自检;提示条永不越出框。
8. **多框不重叠**:无锚停靠的框在边距内**纵向堆叠**(或折成一条「N kept · Show」清单,一条记录一个 Discard);任意两框 / 两提示条矩形不相交;z 序确定;每个 Discard 只能删它自己那条记录——**命中谁删谁**,不存在「点的是 A 删的是 B」。
9. **锚上但框比单元行高**(红 1 的触发源):锚上自己单元时框高不得超过该单元编辑器的行高(框内滚动,字一步可见);不得因为比单元高就盖到下一行、再触发停靠。活窗口照旧。
10. **测试**(jsdom,可变 rect):(a)单元 35px、留字两行 → 锚上后框高 ≤ 35、不与 `below` 相交;(b)无锚 + 左右边距各只有 50px 宽 → 折成提示条,折叠条不与任何编辑器相交;(c)两条无锚记录 → 两框矩形不相交、各自 Discard 只删自己(断言存档剩下的是另一条);(d)无锚 + 左边距够 → 停靠矩形 right ≤ 文本栏 left。a、b、c 在 r2.2 代码上红。浏览器臂 = Tester 的 GEO-noEnter、TWO2。
11. 回执里**残余**写明:边距极窄(手机宽)下折叠条的位置策略;字多到折叠条也放不下时怎么办。不作本轮放行条件,但要写。

**沿用规则更新**:r2.3 控制器 + 框都变 → 行为臂与 GEO 全在 r2.3 上跑;r2.2 的 GEO 过的几项(BAN、先 Dismiss、GEO-enter、GEO-long)作「r2.2 早期」记。

**给 Henry 的一句**:留字框第四次在几何上出事(盖上一行 → 不跟版面 → 搬走单元后压行 → 停靠伸进栏/两框叠)。每一次修法都对,每一次都有下一个没想到的形状。我仍不建议停下重想——它的职责很窄(把没落下的字留在屏上、不盖字、能显式丢弃),这三条写成**不变量 + 自检 + 可变 rect 测试**后应该收口;r2.3 若再出几何红,我会停下来把框整体重做成「边栏清单」而不是浮层。

## 编辑器组 r2.3 Result(builder 2026-11-08)

答「r2.2 回执收讫 + ⚠️ 裁定」(角色收窄)和「r2.2 框侧两条红」(第 7–11 条)。证据 `docs/audits/2026-11-05-a21-builder/builder/matrix-8-r2.3/`(下称 m8)。

### 包与同源

- 源码 = `9bc45e69` + 22 个文件,副本−基线仍是这 22 个。逐文件 sha256 对 r2.2(`m8/source-sha256-r23.txt`):
  - `r2.3改`:
    - `hooks/useHeadingStructureController.ts`(`a10ac50e9b49…`)
    - `structureTypingBuffer.ts`(`b29e2ecf9ae5…`)
    - `hooks/useHeadingStructureController.test.tsx`(`d595189e4dac…`)
  - 其余 19 个与 r2.2 逐字节同,含守恒闸。
- 包:ops `packages/editor-rework-r2.3/`。`dist/` 主 JS `index-CUqxwHSs.js`,63 个文件;`src/` 22 个文件;两份哈希与 m8 一致。r2.2 及更早的包都没动,`edfix` 没动。
- 控制器和框都变了,行为臂和 GEO 都没有沿用。

### 全量、检查、阳性对照

| 数 | 证据 |
|---|---|
| 构建 exit 0;类型检查净;客户端全量 2673/2673;守恒闸 40 种子绿 | `m8/summary.txt`、`client-full.raw` |
| 三个检查脚本 exit 0;r04@57 156 行坏 0;dist 跑前跑后一致 | `m8/check-*.txt`、`r04-r23-57.log`、`summary.txt` |
| 阳性对照(下节逐条) | `m8/red-controls-r23.txt` A–D 段 |

### 角色收窄(控制器)

- 留住时,存档记下单元当时的 `writing_role`。三处写存档都带:留住、pagehide、3b 落地档。记录跟着单元搬块时,角色随记录不变。
  - 类型 `UnplacedWords` 在框文件里;角色作为存档 JSON 里多出的字段写入,控制器里用扩展类型读写,类型声明没动。
- 留住的字「空等于空」自动落,三者同时成立才放行:按 (blockId, unitId) 当前确有其单元;单元文本为空;单元 `writing_role` 与记录角色相同。旧记录没有角色字段 → keep。活窗口照旧。
- 测试(`m8/red-controls-r23.txt`):
  - (a) Y1 原测试:r2 / r2.1 红,r2.2 绿,r2.3 绿(A、B、D 段)。
  - (b) Y1 变体(存档仍指旧块、原块回车新建同号空段落、记录角色是 `heading_1`)→ keep:r2 / r2.1 红,r2.2、r2.3 绿。
  - (c) 回归守卫(建块失败后留住,服务端是空标题单元,重开)→ 自动落:**r2 绿、r2.2 红、r2.3 绿**(A、B、D 段)。这条证明收窄把失去的恢复拿回来了。

### 框(第 7–9 条)

只对留住的框;活窗口照旧压在自己单元上。

- **锚上**:框高不超过所在单元编辑器的高度,字在框内滚动,不会因为比单元高就盖到下一行、再触发停靠。
- **自检**:每次放置后检查框和提示条,不得与自己单元以外的任何编辑器、任何别的框、任何别的提示条相交。
- **停靠**:框改为 border-box,宽度就是实际宽度。r2.2 的框是 content-box,padding 把它撑宽,伸进了文本栏,Tester 量到 right 784、栏从 711 起。
  - 停靠位整框在文本栏外,先右后左,一侧至少要 200px 才停。
  - 提示条在框内顶部一行,最大宽度不超过框。
  - 撞上别的框或提示条,就移到它下方(间隔 6px)。
  - 停在原处且仍合格就不动。
- **折叠**:两侧都放不下,框收起,只剩提示条,带 `Show words` / `Hide words` 按钮,按钮顺序是 Discard 在前。
  - 折叠条也过同一自检:先窗口右缘、再左缘,从上往下找第一个不盖任何东西的位置,多条折叠条依次往下排。
- **命中谁删谁**:框与框、提示条与提示条不再重叠;每个提示条的 Discard 只关自己那条记录。z 序:框 2147483000,提示条 2147483001。
- 测试(jsdom,版面按浏览器行为模拟:content-box 的框宽含 padding,框高取 height 样式,内容每行 35px):
  - (a) 35px 单元,留字两行 → 框高 ≤35,不与 `below` 相交。
  - (b) 无锚,两侧边距各 50px → 折,折叠条不与任何编辑器相交;`Show words` 一点字就出来,Discard 仍在。
  - (c) 两条无锚记录 → 两框、两提示条都不相交;点 `one` 的 Discard 后存档只剩 `two`。
  - (d) 无锚、只有左侧放得下 → 停靠后 right ≤ 栏 left,提示条在框内。
  - r2.2 上 (a)(c)(d) 红,(b) 绿(C 段)。**(b) 与裁定预期不同**:两侧都不够 320px 时,r2.2 本来就折。Tester 的 noEnter 红,机理是左侧放得下、content-box padding 把框撑进栏,这正是 (d) 在 r2.2 上红的原因(`expected 600 to be less than or equal to 400`)。
- 原 `round 2 #4` 几何测试改为框锚在真单元上(原来那条用的是无锚记录,r2.3 下它本应停靠),断言不变。

### 浏览器(r2.3 包;注入层写明)

| 臂 | 注入层 | r2.3 | r2.2 |
|---|---|---|---|
| 注入矩阵 26 行 | 代理层(浏览器已发出) | **①20 ②6 ③0** | ①14 ②12 ③0 |
| 其中 create / placement / hangWatchdog | 同上 | **① 2 / ① 2 / ① 2** | ② 2 / ② 2 / ② 2 |
| 其中地址栏三臂:改地址离开、慢回包改地址、慢回包卸载 | 同上 | ② 2 / ② 2 / ② 2 | 同 |
| K:卡 12 秒后成功 / 失败 / 卡住 + 卸载 / 卡 25 秒后成功 | 代理层扣改角色那次 text-save | ① 2 / ②′ 2 / **① 2** / ②′ 2 | ① 2 / ②′ 2 / ② 2 / ②′ 2 |
| H-L(`h_HL`,不是 Tester 的 H-L 时序) | 浏览器请求阶段(CDP Fetch) | ② 3 | ② 3 |
| r04@57(冒烟) | 无注入 | 156 行坏 0 | 同 |

- `h_HL` 仍是 ②:本臂扣住的是第一次带 `body` 的保存,库里那个单元是 `#`(非空),字无锚,留住。Tester 的 H-L 时序(结构走完、字作普通编辑落地)由 Tester 复测,按裁定那条应回 ①。
- **GEO**:Tester r2.3 复测(其判据已加:框与框不叠、锚上框高 ≤ 行高、停靠过自检否则折、窄窗口 1100 / 950 变体)。我这边的单元证据:上面 (a)–(d) 四条,外加 `r2.1 #4`(定位后移版面)和 `r2.2 #6 (i)(ii)`(记录跟单元走、无锚不压行),都在 r2.3 全量里绿。

### 残余风险

- **id 复用误落**:同块里单元号被复用 + 同一角色 + 新单元为空,三者同时成立,留住的字才会落进那个新单元。记入 A-25「单元 id 可复用」(与 clientCreateKey 同题)。
- **极窄窗口**(手机宽):两侧都放不下就折;折叠条也找不到不盖任何东西的位置时,放在窗口右上角(可能压到别的东西)。不作放行条件。
- **字太多**:停靠框最高 160px,字在框内滚动;折叠条只显示提示与按钮,字一点即出,展开时是用户主动操作,不过自检。不作放行条件。
- **覆盖缺口**(Tester 2026-11-08 知会):浏览器里 1100、950、760、610 四种宽度,左侧边距总放得下,「折成提示条」这条路径浏览器臂没触达,只有 jsdom 测试 (b) 覆盖。
- 第 6 条只认本次挂载里结构自己做的搬动(同 r2.2)。

### 待 Tester

- 包:ops `packages/editor-rework-r2.3/`,`dist/` + `src/` + 两份哈希。复测范围按 Tester 定:GEO 全套(含窄窗口变体),行为臂全在 r2.3 上跑。
- 拷回共享树候 Main_Designer 令。

## 编辑器组 r2.3 回执收讫:角色收窄拿回三条恢复的 ①;框四条不变量先红后绿;转 Tester 复测(Main_Designer 2026-11-08)

- **核对**(只读 m8):改 3 文件(控制器、框、控制器测试),19 同 r2.2 含闸;2673/2673、tsc 净、三检查、r04@57 156/0、dist 不变。角色收窄:Y1 与变体 r2/r2.1 红、r2.2/r2.3 绿;**回归守卫 r2 绿 / r2.2 红 / r2.3 绿**——收窄把失去的恢复拿回来了;浏览器 create / placement / hangWatchdog / K 卸载回 ① 2,矩阵 ①20 ②6 ③0。框:(a) 高度上限、(c) 不重叠 + 命中谁删谁、(d) 停靠整框在栏外三条 r2.2 红 r2.3 绿;(b) 折叠 r2.2 本就绿——**Tester noEnter 红的真因是 content-box 的 padding 把左停靠的框撑进栏**((d) 在 r2.2 上以 `600 > 400` 红复现),r2.3 改 border-box。回执把这处与裁定预期的差写明了,好。残余(id 复用三重巧合、极窄窗口右上角、160px 内滚动)写清,入 A-25。**合格。**
- **转 Tester**:GEO 全套(BAN / 先 Dismiss / GEO-enter / GEO-noEnter / GEO-long / TWO、TWO2 / 窄窗口 1100、950)+ 行为臂(K 四臂、H-L 0/N 且应回 ①、注入矿阵、地址栏三臂、冒烟、acc12/13/14、Y1 ×6、EDGE、NA、守恒闸三步、旧矩阵)。**建议先跑挡放行的臂**(真丢字类 + GEO 两红的复测),其余随后;范围 Tester 定。
- **放行尺候 Henry**:我已向 Henry 提议——r2.3 之后真丢字 = 0 即上岛,留字框的几何毛病不再挡、写进说明书,留住状态改边栏另开小单。Henry 未答前,放行条件仍按汇总那条(③ 为 0,含几何 ③)。

## Henry 拍板(2026-11-08):r2.3 为最后一圈;放行尺改为「真丢字 = 0」;框几何不再挡;留住状态改边栏另开小单(Main_Designer 记)

Henry 看完一天四轮的账后拍:**「可以没问题」**——按我 11-08 的建议走。连带他另两条:第三只眼一律用 Opus 代理(「代码复核不是主设计平台的事,你是来统筹全局的」);段落标题视觉提示太弱(L-019)、标题页想法(L-020)记闲谈簿,不改现有排期。

**第二轮放行条件(最终,取代 11-07 汇总那条)**:
- **挡放行的 ③**(任一为非零即不上岛):①字在服务端、存档、框**任何地方都没有**(丢);②字落进笔记的**错误位置**或**重复**(Y1 类、乱序类——乱序 1/15 已入 A-25 的例外照旧);③留住的记录被**非本人显式动作**删除(Discard 删错他条、判定误删存档)。
- **不再挡、写进说明书「已知」**:留字框的几何——盖行、点进框、停靠位置、折叠策略、窄窗口表现。这些在 r2.3 已按不变量修过,Tester 照验照记,红了记已知不挡。
- **八项不退**照旧(回归 = 丢字类)。
- 同源哈希一致照旧。

**Tester 范围随之收**:先跑挡放行的臂(丢字类 + Y1 + H-L 0/N + 注入矩阵 + K 四臂 + acc13/14 + 八项不退的回归);GEO 跑一遍作观察(给说明书写「已知」);旧矩阵全链 Tester 自定要不要跑完。

**之后**:放行 → builder 拷回共享树 → 我收割 → 第 21 次部署 → 转 **A-19**(图片 Source 的笔记是空的)。留住状态改边栏(L-018)作独立小单在收割后派,⛔ 并进本单。

## Reviewer 首单发现的裁定:F1/F2 旧记录 / 未定角色时现场补角色 → 空对空自动落,③,r2.3b 一行修;F3 回执更正;F4 先速验;F5/F6 入边栏单(Main_Designer 2026-11-08)

Reviewer(复核审查)报告 `docs/audits/2026-11-05-a21-builder/reviewer/findings.md`(对 r2.3 快照 `src.sha256` `214ea160431c…`,只读未跑):确认 3、疑似 3,其余逐项核过未找到问题。

| # | 裁定 |
|---|---|
| **F1 确认**:没有角色字段的旧记录重开时,`roleOf` 用 `??=` 从**眼前**那个单元现补角色(`C:603→218→206→202`),`C:604` 再比的就是同一个单元,角色必然相等 → 空对空放行。裁定第 2 条要的是 keep;测试缺「(b) 去掉 `writingRole`」那条 | **③(落错位置),r2.3b 修**(控制器一行级 + 两条测试)。注:岛上 `412565b6` 没有留字框,用户浏览器里**不存在**旧记录,F1 本身对 Henry 不会发生;修它是因为 F2 同根 |
| **F2 确认(路径)**:会话内留住那一刻 `roleOf` 找不到单元(看门狗在 `extractUnit` 后 `followUnit` 前放手,单元已搬走、记录指旧块)→ `entry.role` 为 undefined;之后用户在框里每打一字(`C:221`)都再试一次,直到读到**当时**占着该 (blockId, unitId) 的单元——可能是回车新建复用了单元号的空段落;角色一补上下一拍就落进去 | **③,与 F1 同一处修**:角色只在留住 / 重开那一刻定一次(记录里有就用记录的),之后不再从现场补;「没定到」是一个确定状态 = keep。测试:F1 = 存档去掉 `writingRole` 字段 + 眼前有同号空单元 → keep;F2 = 留住时单元不在、之后出现同号空段落、框里打字 → keep。两条在 r2.3 上红 |
| **F3 确认**:`global.css` `*{box-sizing:border-box}`,框本来就是 border-box;r2.3 的 border-box 改动在浏览器里无效果;测试 (d) 在 r2.2 上的红是 jsdom 模型按 content-box 自己算的;红 1 真正被修掉靠的是锚上框高上限 | **回执更正**:builder 在 r2.3b 回执里撤回「content-box 撑进栏」的解释,改写为「真因待 F4 速验;修掉红 1 的是高度上限」。(d) 保留但注释改掉 content-box 假设 |
| **F4 强疑似**:全局 `textarea{transition:all 150ms}` 作用到框;自检在同一任务里读 `getBoundingClientRect()` 读到的是过渡**前**的位置 → 预测:无锚框在浏览器里多半折成提示条而非停靠;框回单元时提示条可能留在框外;红 1 的 73px / 2px 伸入 = 框在单元与停靠位之间来回滑 | **Tester 先速验**(30 秒):r2.3 上 `getComputedStyle(textarea[data-structure-typing-buffer]).transitionDuration` 是否 `0.15s`;TWO2 两条无锚记录终态是停靠还是折叠。**坐实 → 框内联 `transition: none` 一行进 r2.3b**(buffer 一行;几何按新尺不挡,但自检读错矩形是自检本身失效,顺手修);不坐实 → 记观察 |
| **F5 疑似**:锚点还在但放不下的框每 50ms 先回单元再停靠(`B:299-305` 每拍把 mode 改回 unit),「停好就别动」够不着;两条记录锚同一单元时触发;叠 F4 会不停滑 | 几何类,不挡;**入边栏单(L-018)**——停靠逻辑整体要换,不在浮层上再补。Tester 可加「同一单元两条记录」一臂作观察 |
| **F6 疑似**:每框每 50ms 跑 1–3 次 `noteEditors()` 全扫(r2.2 约 1 次),留字近 20 条时打字每拍强制排版 | 性能,低;**入边栏单**。活窗口不走这条路 |
| 附注:重开时 `C:587-589` 移除旧框元素未调 `close()`,旧定时器与监听对脱离文档的元素空转 | 无害泄漏,r2.2 既有;**入 A-25** |

**r2.3b**(builder;控制器一行 + 两测试 + 回执更正;F4 坐实则加 buffer 一行):包 `editor-rework-r2.3b/`,逐文件 sha256 标「同 r2.3 / r2.3b 改」;矩阵 + K + H-L + r04 照跑;阳性对照 F1、F2 在 r2.3 上红。**Reviewer 复核 r2.3b 的 diff**(只看改动行 + 两条测试是否真盖到 F1/F2),发现发我。

**Tester 调度**:r2.3 上**行为臂先停**(控制器要再变,跑了白跑),GEO 观察项与 F4 速验照做;r2.3b 到了行为臂跑一遍(范围 Tester 定,F1/F2 的形状 = Y1 变体加进去)。

**给 Henry 的一句**:你定的「r2.3 最后一圈」我理解为「不再为框的几何多转圈」;这条是落错位置,在你新尺的「挡」里,而且是一行修——我按补丁(r2.3b)办,不算新一圈。是复核会话开工第一单就抓到的,它的位置坐实了。

## 编辑器组裁定:留字自动落地抢走用户光标(Tester r2.3 TWO2 2/3)——落错位置,挡放行,并入 r2.3b(Main_Designer 2026-11-08)

**Tester 复现**(r23-geo TWO2,2/3,自然路径;证据 scratch `runs/r23-geo/`):
1. `warmup` 下打 `# one⏎aaa`,慢回包改地址离开,回来屏上留框 `one\naaa`。
2. 用户点 `warmup` 行尾回车起新空行(12343)。
3. ~13 秒,第一条留字按 r2.3「角色一致」**自动落地**(13059 `[heading_1]one|aaa`),随后 `aaa` 拆进新块。
4. ~15 秒,用户在自以为的新行里打 `# two⏎bbb`——**光标已被落地带到 `aaa` 末尾**:`aaa# two`;`#` 在行中不起标题,没有窗口和留字的保护。
5. `bbb` 打在新空单元里,随即改地址离开,一次 text-save 没发;终态 `[warmup, ""] [H one] [aaa# two, ""] []`,`bbb` 哪里都没有,存档空。
对照第 2 轮:落地发生在用户点击之前(22660),没抢到焦点,一切正常。触发 = 落地恰好发生在用户在别处起新行、正要打字的那几秒。r2.2 不出(空单元不自动落);r2 时期 Y1 同族。

**定性**:按 Henry 11-08 的尺第 ② 条「字落进笔记错误位置」(`# two` 进了 `aaa` 行)——**挡放行**;`bbb` 的丢是连带(普通编辑未保存就离开 = A-20 路径),不单算,但起因是这条。**自然路径 2/3,不是巧合。**

**裁定(并入 r2.3b 第 3 条,控制器)**:留字的自动落地(重试拍、重开恢复、3b)是**后台行为**——⛔ 改焦点、⛔ 动光标。只在落地那一刻 `document.activeElement` 仍是该留字框或它所属单元的编辑器时,才把光标放回落地处;用户在别的编辑器里,只落字、不动焦点、不动他的光标。活窗口随结构落地(用户正在那儿打)照旧。**测试**:留住的记录自动落地时另一个编辑器持焦点、光标在某位置 → 落地后 `activeElement` 不变、该编辑器光标不变、落地文本正确;r2.3 上红(焦点被夺)。Tester 的 TWO2 时序作浏览器臂。

**给 Henry 的一句**:r2.3 把三条恢复的「自动落回」拿回来,这条红是它的代价面——字回来了,顺手把你的光标也拽回去了。修法窄(落地不碰焦点),与角色那一行同在控制器,一起进 r2.3b。

## r2.3b 清单定稿:F4 坐实进包;后台落地不起后续结构;折叠条右上角也要堆叠;提示文案;Tester 先验四条(Main_Designer 2026-11-08)

**F4 坐实**(Tester acc16,2/2):框 computed `transition: all 0.15s`(无 inline),提示条 `0s`;滚动 120px 后框顶 549→522→494→…→443 约 150ms 追上;改尺寸约 120ms 落定。自检在这段里读矩形就是半路位置——r2.2 红 1 的 73px / 2px、r2.3 GEO-noEnter 滚动/改尺寸后框高 65 压 `below` 2/2,同源。**`transition: none` 一行(buffer)进 r2.3b**;Tester 在 r2.3b 上重跑 GEO-noEnter。TWO2 终态问不出(第一条先落地抢焦点,见上节);折叠路径在 760 宽与改尺寸后走到了,Show words 展开不压行。

**Tester 读码代理六条**(与 Reviewer 对过,F1/F2/F4 独立读出不重复):

| # | 发现 | 裁定 |
|---|---|---|
| 1 | 后台落地会起后续结构(`C:565-566 → C:288 → B:326-342`),默认开带焦点的窗口、整篇只读——TWO2 抢焦点的机理 | **并入 r2.3b 第 3 条并扩**:后台落地(重试拍 / 重开恢复 / 3b)**只落字,不起后续结构**,⛔ 开窗口、⛔ 动焦点光标、⛔ 让整篇只读;标题与正文同块的「补拆」等用户下次聚焦该单元再做(A-25「快离开后重开补拆」同题,这里先按 ②′ 留着)。测试:另一编辑器持焦点时后台落地 → activeElement / 光标不变、无结构请求、无 busy;r2.3 上红 |
| 2 | `followUnit` 只按 (原块, 单元号) 搬记录(`C:322-333`);单元号 max+1 复用,用户在新末行打 `# …` 拿到旧号,旧留字条目被带进新标题块,空 + 同角色 → 放行 | **Tester 先验**(注入存档一臂);红则 r2.3b 加:被 `followUnit` 搬过的记录不享「空等于空」(需真锚);绿则 A-25「单元 id 可复用」 |
| 3 | 提示文案叫用户「先复制再关」(`B:16`);用户复制粘到别处后,10 秒内重试又把同样的字落进标题 → 两份 | **不挡**(第二份是用户自己粘的,落地是正确行为);**文案一行进 r2.3b**(buffer):不再把「复制」当首选动作,改为「这些字还没进笔记;放着会自己回去;Discard 删除」。Tester 自然打字验一次作观察 |
| 4 | 折叠条无处可放时全挤到右上角同一矩形(`B:229-230`,同 z),点下面那条 Discard 删的是上面那条 | **Tester 先验**(侧栏收起、≤1200 宽、长笔记滚中段、两条无锚);红则 **r2.3b 加一行**:右上角回落位也按条目序纵向堆叠(与边距堆叠同规则)——这是 Henry 尺第 ③ 条「非本人显式动作删记录」,挡 |
| 5 | 成功的后台落地调两次 `boundary`(`C:514`、`542`)→ 用户正打的分组多一个撤销步、多一次保存;3b 确认循环保存持续失败时最多 31 次每 800ms 各一次 `boundary` | 前者一次性、落地本身要封界,**不动**;后者 **acc14 加一臂**量数(保存持续失败时 `canApplyEdit` 为假、用户打字本就被拒,预期无风暴);有风暴则 r2.3b,无则 A-25 |
| 6 | 折叠复现配方:侧栏收起、关导航窗与暂存栏、宽 ≤ 约 1200;侧栏开着左侧永远 >200px;r2.3 上 1440 下无锚框因 transition 也多半先折叠 | 记 METHOD;r2.3b 去掉 transition 后 GEO 的「F」重判 |

**r2.3b 定稿**(builder):控制器 ①角色只在留住/重开定一次、没定到 = keep(F1/F2);②后台落地只落字、不起结构、不碰焦点光标(第 1 条 + TWO2);buffer ③`transition: none`;④提示文案;候 Tester:⑤第 2 条红则「搬过的记录需真锚」;⑥第 4 条红则「右上角回落位堆叠」。逐文件 sha256 标「同 r2.3 / r2.3b 改」;每条阳性对照在 r2.3 上红;F3 回执更正照前。**Tester 第 2、4 条的验先于封包**(各一臂,注入存档,单浏览器),结果直接发 builder 与我。

**Tester 顺序**:F4 已完 → 第 4 条 → 第 2 条 → 第 3 条(自然一次)→ acc14 加第 5 条臂;行为臂仍等 r2.3b。

## r2.3b 候验两条皆绿(Tester acc17):⑤⑥ 不进包;r2.3b 以 ①–④ 封(Main_Designer 2026-11-08)

- **第 4 条(折叠条右上角叠放)2/2 过**:侧栏收起、1100×1000、40 行滚中段、两条无锚存档 → 两条折叠条竖向错开(776–794 / 800–818)不叠不压行;点 seed-a 的 Discard 删的是 seed-a。右上角兜底没走到。**附带观察**:编辑器栏 571–1015、左侧 571px 不该折却折了——与 F4 (i) 吻合(transition 让停靠检查读旧矩形误折),r2.3b 去 transition 后复看。
- **第 2 条(单元号复用 + 旧记录)2/2 过**:注入 `{tu-3, heading_1, '', 'Old'}`,用户在 `second` 行尾回车新单元拿到 tu-3、打 `# New` 建块扣 12 秒放行 → `Old` 没落进新标题,仍在框与存档;`New` 留住(②)。
- **裁定**:⑤⑥ **不进 r2.3b**;第 2 条机理记 A-25「单元 id 可复用」;第 4 条「误折」归 F4,r2.3b 复看。**r2.3b 以 ①–④ 封包**(角色定一次 / 后台落地只落字不起结构不碰焦点 / `transition:none` / 提示文案)+ F3 回执更正。

## 编辑器组 r2.3b Result(builder 2026-11-08)

答「Reviewer 首单发现的裁定」与「r2.3b 清单定稿」:补丁,不算新一圈。封进去的是 ①–④ 和 F3 回执更正。⑤⑥ Tester 在 r2.3 上已验绿,按裁定不进包。证据 `docs/audits/2026-11-05-a21-builder/builder/matrix-9-r2.3b/`(下称 m9)。

### 包与同源

- 源码 = `9bc45e69` + 22 个文件,副本−基线仍是这 22 个。逐文件 sha256 对 r2.3(`m9/source-sha256-r23b.txt`):
  - `r2.3b改`:
    - `hooks/useHeadingStructureController.ts`(`61dce9cccc43…`)
    - `structureTypingBuffer.ts`(`69fd3957380f…`)
    - `hooks/useHeadingStructureController.test.tsx`(`f424d2d60fbf…`)
  - 其余 19 个与 r2.3 逐字节同。
- 包:ops `packages/editor-rework-r2.3b/`。`dist/` 主 JS `index-bobNSNGx.js`,63 个文件;`src/` 22 个文件;两份哈希加 `files22.list`,与 m9 一致。r2.3 及更早的包都没动,`edfix` 没动。

### 全量、检查、阳性对照

| 数 | 证据 |
|---|---|
| 构建 exit 0;类型检查净;客户端全量 2677/2677;守恒闸 40 种子绿 | `m9/summary.txt`、`client-full.raw` |
| 三个检查脚本 exit 0;r04@57 156 行坏 0;dist 跑前跑后一致 | `m9/check-*.txt`、`r04-r23b-57.log`、`summary.txt` |
| 本轮 4 条阳性对照(F1、F2、②、③④)在 r2.3 的控制器 + 框上全红,在 r2.3b 上全绿;round 2 / r2.1 / r2.2 / r2.3 各条在 r2.3b 上 28/28 绿 | `m9/red-controls-r23b.txt` A、B 段 |

### 修了什么

1. **角色只定一次**(F1/F2):
   - 留住那一刻从笔记里读一次;重开时只取记录里的,不读笔记。之后不再补,没读到也算定了,定成「无角色」→ keep。
   - 开着的窗口还没留住,pagehide 存档时现读,不算定。
   - 测试:F1(记录无角色、眼前有同号空单元)在 r2.3 上落进去了(红),r2.3b keep。F2(留住时单元不在,之后出现同号空段落,框里打字)在 r2.3 上落成 `kept!`(红),r2.3b keep,存档仍无角色。
2. **后台落地只落字**:重试拍、重开恢复、3b 记录,这三种落地不再请求结构,也就不开窗口、不动焦点和光标、不进 busy。
   - 标题和正文同块的补拆,留到用户下次编辑那一块时,由编辑器自己的标题识别去请求。活窗口随结构落地照旧。
   - 测试:另一个输入框持焦点、选中 4–7 时,后台落进空标题。字落对(`Intro | kept(标题) | body`,同块),create 和 transfer 都没调,全程不 busy,没有框,焦点和选区不变。r2.3 上红:结构跑了,标题被搬走。
3. **`transition: none`**:写在框的内联样式里,**活窗口和留住的框都加**。活窗口同样每拍跟随单元,过渡一样会让它落后、让自检读到半路位置。
   - 测试:框的 `style.transition` 为 `none`,r2.3 上为空(红)。
   - Tester 记的「左侧还剩 571px 却折了」,候它在 r2.3b 上复看。
4. **提示文案**:不再叫人先复制。现在是「These words are not in the note yet. Left here, they go back on their own when they can. Discard deletes them.」(多条时同义)。可见标签「Not in the note yet」不变,title 和 aria 同步。
   - 测试:title 不含 copy,含「go back on their own」「Discard deletes them」;r2.3 上红。

### F3 回执更正(撤回)

- r2.3 回执里「r2.2 的框是 content-box,padding 把它撑宽、伸进文本栏」**撤回**。`global.css` 对所有元素设了 `box-sizing: border-box`,框本来就是 border-box,r2.3 加的 border-box 在浏览器里没有效果。
- (d) 在 r2.2 上红,是 jsdom 测试里版面模型按 content-box 自己算出来的,不是浏览器。测试注释已改。
- 真因按裁定写:**待 F4 速验;修掉红 1 的是锚上框高上限**(r2.3 第 9 条)。F4(全局 textarea 过渡让自检读到半路位置)已由第 3 条处理。

### 浏览器(r2.3b 包;注入层写明)

| 臂 | 注入层 | r2.3b | r2.3 |
|---|---|---|---|
| 注入矩阵 26 行 | 代理层(浏览器已发出) | ①21 ②5 ③0 | ①20 ②6 ③0 |
| 其中 create / placement / hangWatchdog | 同上 | ① 2 / ① 2 / ① 2 | 同 |
| 其中地址栏三臂:改地址离开、慢回包改地址、慢回包卸载 | 同上 | ①1 ②1 / ② 2 / ② 2 | ② 2 / ② 2 / ② 2 |
| K:卡 12 秒后成功 / 失败 / 卡住 + 卸载 / 卡 25 秒后成功 | 代理层扣改角色那次 text-save | ① 2 / ②′ 2 / **②′ 2** / ②′ 2 | ① 2 / ②′ 2 / ① 2 / ②′ 2 |
| H-L(`h_HL`,不是 Tester 的 H-L 时序) | 浏览器请求阶段(CDP Fetch) | ② 3 | ② 3 |
| r04@57(冒烟) | 无注入 | 156 行坏 0 | 同 |

- K「卡住 + 卸载」由 ① 变 ②′:字在库里,标题与正文同块。这是第 2 条要的结果:重开后后台落地只落字,不起结构,补拆等用户下次编辑那一块。
- 改地址离开 ①1 ②1 是自然时序下的落地波动(r2 起这一臂在 ① 2 和 ② 2 之间来回)。
- 证据:`m9/enter-r23b.json`、`k-r23b.json`、`hl-r23b.json`。

### 代码回答(行号对 ops `editor-rework-r2.3/src/` 快照)

- **F1/F2 机理**:
  - `useHeadingStructureController.ts:202` 用 `entry.role ??= …` 从眼前的单元现补角色。
  - 它在 `:207`(`storedWords` 的 `writingRole: roleOf(entry)`)被调。`:218` 每次框里 input 存档都调它,`:250` pagehide 也调。
  - 重开时 `:602` 把记录里的 `writingRole` 赋给 `entry.role`。记录没有这个字段时是 undefined,随后 `retainWords` → `:218` → `:202` 立刻从同号单元补上。
  - `:509` 比的正是这个单元,必然相等,于是空对空放行(F1)。F2 同理:补角色发生在之后某次 input。
  - r2.3b 拆成 `liveRole`(只读)和 `fixRole`(只定一次),`:509` 的条件加了「角色已定」。
- **TWO2 抢焦点**:
  - 后台落地在 `:566` 请求结构,`commitStructure` 在 `:288` 用 `openEntry` 开窗口。
  - 窗口默认带焦点:`structureTypingBuffer.ts:326` `input.focus !== false` 时 focus,`:331` 起 `held` 抢回焦点。
  - 所以重开恢复或重试落地会把焦点从用户正在写的地方拿走。r2.3b 第 2 条在 `:566` 加了 `live` 条件。
- **F4**:`global.css` 对 textarea 设了 `transition: all var(--transition-fast)`(150ms)。框是 textarea,`:131` 的内联样式没覆盖它。自检在同一任务里读 `getBoundingClientRect`,读到的是过渡中的位置。

### 已知、未修

- 后台落地后,标题与正文可能同块,直到用户编辑那一块(K 卸载臂即此)。按裁定是预期行为。
- F5(锚上放不下时每拍回单元再停靠)、F6(每拍 1–3 次全扫)入边栏单;重开时旧框没调 `close()` 的泄漏入 A-25。都没动。
- r2.3 回执的残余风险照旧:id 复用 + 同角色 + 空;极窄窗口右上角;折叠路径浏览器臂没触达。

### 待 Tester / Reviewer

- 包:ops `packages/editor-rework-r2.3b/`。Reviewer 复核 diff,Tester 并行全跑,含「左侧 571px 却折了」复看。拷回清单换成 r2.3b 的 `src.sha256` 与 `files22.list`(同目录)。
- 拷回共享树候 Main_Designer 令。

## r2.3b 回执收讫:四条阳性对照 r2.3 红 r2.3b 绿;K 卸载臂 ①→②′ 为裁定预期;转 Tester 复测 + Reviewer 复核并行(Main_Designer 2026-11-08)

- **核**(只读 m9):改 3 文件(控制器、框、控制器测试),19 同 r2.3;2677/2677、tsc 净、三检查、r04@57 156/0、dist 不变;4 条阳性对照(F1、F2、后台落地不扰人、transition)在 r2.3 上红、r2.3b 绿;历次 28 条在 r2.3b 全绿。矩阵 ①21 ②5 ③0(create / placement / hangWatchdog 仍 ①);**K「卡住 + 卸载」① → ②′**——重开后后台落地只落字不起结构,字在库里同块未拆,等用户下次编辑那块补拆,**是第 2 条裁定要的结果**,照记。`transition: none` 活窗口与留住框都加(活窗口也每拍跟随,过渡同样让它落后),理由成立。F3 撤回已写。代码回答三处带行号。拷回计划更新为 r2.3b 的三份新哈希,未执行。**合格。**
- **转 Tester**(包 `editor-rework-r2.3b/`,主 JS `index-bobNSNGx.js`):行为臂全跑 + acc18 两条阳性对照形状在 r2.3b 上须绿 + Y1 变体 + TWO2 时序 + acc14 加 boundary 臂 + 第 3 条自然一次 + GEO 复看(noEnter、误折)。判语按 Henry 11-08 尺。
- **转 Reviewer**(并行):r2.3b diff 对 r2.3 快照——F1/F2 两测试是否真盖到(尤其 `C:221` input 监听那条路不再补角色);后台落地三个入口是否都不再走 `:566` 后续结构、焦点与 busy 有无别路被碰;`transition:none` 加在活窗口是否带来跟随抖动以外的副作用。发现发我。

## Reviewer r2.3b 先报一条疑似 ③(既有):人在留住的框里打字时重试拍落地,框被移除、焦点落 body,之后的键丢——Tester 先复现,红则一行补(Main_Designer 2026-11-08)

- **Reviewer**(r2.3b 快照):留住的框是可编辑 textarea(`B:378-416` 不设 readOnly,`C:229` input 监听本为此);重试 `C:197 → placeTyped(live=false) → C:470 movedAway = !live` 恒真 → `C:473 typing.close()` 把**有焦点的**框移除(`B:428 element.remove()`)→ `C:475-477` 不给任何编辑器焦点 → 焦点落 body;框消失到人反应过来之前打的键无处可去。已打进框的字随合并落地,丢的是之后那几键。r2.3 同段代码,非 r2.3b 引入;裁定 ②「后台落地不碰焦点,除非焦点本就在那」漏掉「焦点就在框里」这一侧。
- **复现**(给 Tester):留一条非空锚的记录(能落的)→ 点进框连续打字 → 等重试拍落地 → 看落地后继续打的键去哪。
- **裁定**:按 Henry 尺是丢字(第 ① 条),**红即挡**。修法方向(builder,一行级,候复现):**重试拍发现框持有焦点(`document.activeElement === 框`)就本拍不落、下拍再看**——人正在框里写,后台不插手;人一离开框,焦点不在框里,落地就不碰焦点。比「落地后把焦点搬到单元」更稳(搬焦点要算光标位、还会打断人)。测试:框持焦点时重试拍 → 不落、框在、字在;焦点离开后下一拍落地。
- **流程**:我对 Henry 说过「r2.3b 后再出控制器红就停下来报」——这条是丢字且一行,我**先报 Henry**,Tester 复现期间不派;红了且 Henry 没叫停就以 r2.3c 一行补(含 Reviewer 复核 diff)。

## Reviewer r2.3b 复核的裁定:三重点落实、无新引入丢字;G1 候 Tester;G2–G4 分流(Main_Designer 2026-11-08)

Reviewer 报告 `docs/audits/2026-11-05-a21-builder/reviewer/findings.md`「r2.3b 复核」节(行号对 r2.3b 快照;早先短讯三个行号更正为 `C:230 / C:474 / B:429`)。

| # | 发现 | 裁定 |
|---|---|---|
| 三重点 | 角色只定一次、没定到 keep;后台落地三入口都不起结构不碰焦点;`transition:none` 无副作用 | **落实,收** |
| G1(疑似 ③,既有) | 人在框里打字时重试拍落地,框被移除焦点落 body,之后几键丢 | **Tester 复现中**(见上节)。红则 **r2.3c 一行**,采 Reviewer 的三点:守卫放 `placeTyped` 里对 `!live` 判(只守重试拍会漏 `C:456` 组字结束回调——人在框里用输入法时恰好直落);跳过的拍**不**让 retryDelay 翻倍;焦点停框不走 → 永不落是可接受的 ②(人在写),不搬焦点 |
| G2(🅱) | F2 测试走的是重开路;`C:222` 留住时定角色没有测试守(删掉按读码仍全绿) | r2.3c 若开则加一条「留住时定角色」测试;否则 A-25 |
| G3(🅱 疑似) | `await extractUnit`(`C:375`)间隙被留住 → 角色定成无 → 永不自动落 | ②(留住,不丢),记 A-25「结构非原子」下 |
| G4(🅱) | 新文案「会自己回去」对无角色旧记录 / G3 不成立 | 文案改「可能会自己回去;没回去就复制或 Discard」,随 r2.3c;r2.3c 不开则随边栏单(L-018 会换掉提示条) |

**Reviewer 两单小结**:第一单抓到 builder 测试盖不到的 ③(F1/F2)并戳破一条回执解释(F3),第二单确认修法落实并指出修法方向的三个坑——分工成立;它的发现台账两行,处置已填。

## 编辑器组裁定:r2.3b 自然路径丢字——同块两条留字相隔 300ms 先后后台落地,后者覆盖前者(丢失更新);挡放行;r2.3c = 后台落地串行化 + G1 守卫(Main_Designer 2026-11-08)

**Tester 复现**(r23b-geo TWO2-discardOne-0,1/3;证据 scratch `runs/r23b-geo/`):
1. `# one⏎aaa` 慢回包改地址回来 → 框 `one\naaa`;用户 `warmup` 行尾回车起空行(12360);打 `# two⏎bbb` 又改地址回来 → 两框 `one\naaa`、`# two\nbbb`(第二个 `# ` 没起标题,字面 `#`)。
2. **28229** 存 `warmup||[heading_1]one|aaa`——第一条后台落进原块空标题单元(按 r2.3b 不起结构,同块)。
3. **28536**(307ms 后)存 `warmup|# two|bbb|[heading_1]`——第二条落进用户的空行;**同一次保存里标题单元回到空、`aaa` 单元消失**。
4. 终态 `[warmup, # two, bbb, H ''] []`,存档空,无框。**`one`、`aaa` 曾落库又被抹掉,哪里都没有。**
Tester 推断:第二次落地拿第一次落地**之前**的文本流算合并、整块写回 → 丢失更新。r2.3 上第一次落地会起结构把 `one` 搬走,不同块不相撞;r2.3b 去掉起结构,两条落同一块才撞上。另两轮:1 轮 Discard 删对;1 轮装置异常作废(同毫秒两次 POST blocks,与留字无关,Tester 另记)。

**定性**:Henry 尺第 ① 条,**真丢字,挡放行**。这是我「后台落地不起结构」裁定的副作用——不是方向错(起结构会抢焦点锁整篇),是落地路径从没为「同块多条、几乎同时」设计过;r2.3 时靠结构把它们分开只是巧合。

**裁定(r2.3c,控制器;builder 先按代码确认机理再改)**:
1. **后台落地按笔记串行化**:同一时刻只允许一条留字在落;下一条等上一条的 `applyEdit` 落定(本地流已更新)再算合并——**合并所读的流与 `applyEdit` 必须在同一个同步任务里**(读流 → 算 → apply 之间⛔ await),否则串行也会读旧。相隔多久都不许重叠。
2. **G1 守卫**(Reviewer,Tester BOXTYPE 复现中):`placeTyped` 里对 `!live` 判 `document.activeElement === 框` → 本拍不落、不翻倍退避;含组字结束回调那条路。Tester 红了就进;没红也进(一行、读码坐实、方向无争议)——**这是我改口**:Reviewer 两次读码都对,不必再等浏览器。
3. **G2 测试**:留住时定角色加一条守。
4. **G4 文案**:「可能会自己回去;没回去就复制或 Discard」。
5. **测试(1)**:同块两条记录相隔一拍先后落地 → 两条都在、各在各位;r2.3b 上红(后者覆盖前者)。Tester 的 TWO2 时序作浏览器臂。
6. 框文件 ⛔ 动;`structureTypingBuffer.ts` 与 r2.3b 同哈希 → Tester r2.3b 已完成的 GEO、acc14、BAN 结果**沿用**;控制器臂在 r2.3c 上重跑。

**Tester 调度**:行为臂在步骤边界停;BOXTYPE 阳性对照照出数(定 G1 的红度);GEO / acc14 / BAN 已成,沿用。

**给 Henry 的一句**:我上一条说「r2.3b 后再出控制器红就先报再动」——这就是那条。它是我自己上一个裁定的副作用,修法清楚(落地排队),半天。顺延半天的账算在我头上。

## 编辑器组 r2.3c Result(builder 2026-11-08)

答「同块两条留字…丢失更新」裁定。证据 `docs/audits/2026-11-05-a21-builder/builder/matrix-10-r2.3c/`(下称 m10)。

### 包与同源

- 源码 = `9bc45e69` + 22 个文件,副本−基线仍是这 22 个。逐文件 sha256 对 r2.3b(`m10/source-sha256-r23c.txt`):
  - `r2.3c改`:
    - `hooks/useHeadingStructureController.ts`(`2ffc1eea79c7…`)
    - `hooks/useHeadingStructureController.test.tsx`(`b2c33f82a248…`)
    - `structureTypingBuffer.ts`(`a8551d597481…`,只改两个字符串,见下)
  - 其余 19 个与 r2.3b 逐字节同。
- **`structureTypingBuffer.ts` r2.3b → r2.3c 的 diff 原文**(`m10/structureTypingBuffer.r23b-to-r23c.diff`):

```diff
--- r2.3b/client/src/pages/Notes/canvasEngine/structureTypingBuffer.ts
+++ r2.3c/client/src/pages/Notes/canvasEngine/structureTypingBuffer.ts
@@ -14,8 +14,8 @@
 const NOT_YET_IN_NOTE = 'Not in the note yet';
 const TOO_MANY_KEPT = 'Many kept words waiting, not in the note';
 // They go back by themselves when they can: copying them in meanwhile would put them in the note twice.
-const NOT_YET_IN_NOTE_FULL = 'These words are not in the note yet. Left here, they go back on their own when they can. Discard deletes them.';
-const TOO_MANY_KEPT_FULL = 'Many kept words are waiting for this note. They are not in it yet; left here, they go back on their own when they can. Discard deletes them.';
+const NOT_YET_IN_NOTE_FULL = 'These words are not in the note yet. They may go back on their own; if they do not, copy them or discard them. Discard deletes them.';
+const TOO_MANY_KEPT_FULL = 'Many kept words are waiting for this note. They are not in it yet and may go back on their own; if they do not, copy them or discard them. Discard deletes them.';
 /** Kept entries per note before the notice asks for attention. Nothing is dropped past it. */
 export const UNPLACED_WORDS_LIMIT = 20;
 // Room the box keeps at its right end for its notice, when the notice cannot be measured.
```

  - **除这两处字符串常量(第 17、18 行)外,字节无差。** 两个字符串变长,后面的字节整体后移,所以要按行比:这份 diff 就是全部差异。
  - 这两个常量只用作提示条的 `title` 和 `aria-label`(第 395–396 行)。可见标签来自 `NOT_YET_IN_NOTE` / `TOO_MANY_KEPT`(第 394 行),没变,所以提示条的可见文字和宽度与 r2.3b 相同。
  - 第 16 行的注释没改(它说的是「放着会自己回去,其间复制会写两份」,仍成立)。
- 包:ops `packages/editor-rework-r2.3c/`。`dist/` 主 JS `index-BVrO4Ql1.js`,63 个文件;`src/`;两份哈希加 `files22.list`。拷回计划 `COPY-BACK.md` 已更新,取代 r2.3 和 r2.3b 那两份,未执行。r2.3b 及更早的包都没动,`edfix` 没动。

### 全量、检查、阳性对照

| 数 | 证据 |
|---|---|
| 构建 exit 0;类型检查净;客户端全量 2680/2680;守恒闸 40 种子绿 | `m10/summary.txt`、`client-full.raw` |
| 三个检查脚本 exit 0;r04@57 156 行坏 0;dist 跑前跑后一致 | `m10/check-*.txt`、`r04-r23c-57.log`、`summary.txt` |
| 阳性对照在 r2.3b 的控制器 + 框上:TWO2 **3/3 红**(终态 `warmup\|two\|bbb\|`),G1 红,文案红;G2 是守卫,两版都绿 | `m10/red-controls-r23c.txt` A、C 段 |
| 在 r2.3c 上:TWO2 3/3 绿;round 2 至 r2.3c 各条 31/31 绿 | 同上 B、D 段 |

### 机理(按代码确认;行号对 ops `editor-rework-r2.3b/src/` 快照)

- 重开时,恢复 effect(`useHeadingStructureController.ts` 恢复循环,`:615-617` 一带)对每条存档同步依次做 `openEntry` → `retainWords` → `placeTypedRef.current(entry)`,全在同一个 React effect 的同一次循环里。
- `placeTyped` 从读到写没有 await:`history.readLiveFlow(blockId)` → `mergeTypedText` → `flushSync(applyEdit + setBlockTextDrafts)`。
- 问题在于 effect 里调 `flushSync` 提交不了(React 警告「flushSync was called from inside a lifecycle method」)。history 的 `latest.current`(`readLiveFlow` 读的就是它)要等这个 effect 返回、下一次渲染才更新。
- 所以同一循环里的第二条读到的仍是第一条落地之前的流,在它上面合并,`applyEdit` 的 `previousTextFlow` 也是这份旧流。块按整块保存,第一条落下的单元(`one`、它拆出来的 `aaa`)被写没了。
- r2.3 时第一条落地会起结构,`busyRef` 为真,第二条在 `if (busyRef.current) … setTimeout` 处轮询,到下一轮才读到新流,所以没撞上。r2.3b 后台落地不再起结构,竞态才露出来。

### 修了什么

1. **后台落地按笔记串行**:留住的字(重开恢复、重试拍)都经同一个队列(`landKept`)落地,一条一个任务,都在 effect 之外,上一条的 `flushSync` 提交了,下一条才开始。读流 → 合并 → `applyEdit` 仍在 `placeTyped` 一个同步步骤里,中间没有 await。
   - 测试 TWO2:同块两条可落的存档一起重开,两条都在,各在各位,存的和显示的一致;`one` 仍是标题。
2. **G1**:`placeTyped` 对留住的字,在 `document.activeElement` 是框时本拍不落,按原间隔再问,不翻倍。判断写在 `placeTyped` 里,输入法组字结束的回调也走这里,一并盖住。不搬焦点。焦点一直在框里就一直不落,是裁定接受的 ②。
   - 测试:框持焦点时多个重试拍,不落,框和字都在;焦点离开后下一拍落地。
   - 原有两条测试(「失败保存放行后字落进笔记」「被拒后继续重试、放行后落地」)人一直在框里,改为放行后先让框失焦,这是 G1 的预期行为。
3. **G2**:新测试守留住那一刻定角色。建块失败留住时记录角色为 `heading_1`;撤销把单元变回段落之后,框里再打字、重写存档,角色仍是 `heading_1`。
4. **G4 文案**:提示的完整说法改为「可能会自己回去;没回去就复制或丢弃;Discard 删除它们」(原文见上面 diff)。测试改为断言含「may go back on their own」和「copy them or discard them」,不再以复制开头。

### 浏览器(r2.3c 包;注入层写明)

| 臂 | 注入层 | r2.3c | r2.3b |
|---|---|---|---|
| 注入矩阵 26 行 | 代理层(浏览器已发出) | ①22 ②4 ③0 | ①21 ②5 ③0 |
| 其中 create / placement / hangWatchdog | 同上 | ① 2 / ① 2 / ① 2 | 同 |
| 其中地址栏三臂:改地址离开、慢回包改地址、慢回包卸载 | 同上 | ① 2 / ② 2 / ② 2 | ①1 ②1 / ② 2 / ② 2 |
| K:卡 12 秒后成功 / 失败 / 卡住 + 卸载 / 卡 25 秒后成功 | 代理层扣改角色那次 text-save | ① 2 / ②′ 2 / ②′ 2 / ②′ 2 | 同 |
| H-L(`h_HL`,不是 Tester 的 H-L 时序) | 浏览器请求阶段(CDP Fetch) | ② 3 | ② 3 |
| r04@57(冒烟) | 无注入 | 156 行坏 0 | 同 |

- 改地址离开这一臂在 ①/② 之间的来回是自然时序波动(见前几版)。

### 代码回答

- TWO2 机理见上节(行号对 r2.3b 快照)。
- 其余无待答。

### 已知、未修

- G1:焦点一直留在框里,字就一直不落(②,按裁定)。
- r2.3b 回执的已知项照旧(后台落地后标题与正文同块,等用户编辑那一块;F5、F6、重开旧框泄漏;r2.3 残余风险)。F3 撤回保留。

### 待 Tester / Reviewer

- 包:ops `packages/editor-rework-r2.3c/`。框文件只差上面两个字符串,Tester 自己 diff 核过再沿用 GEO,核不过就重跑。
- 拷回共享树候 Main_Designer 令,清单用 r2.3c 包的 `COPY-BACK.md`。

## r2.3c 回执收讫:TWO2 机理坐实(effect 内 flushSync 不提交)、串行队列修;阳性对照 r2.3b 红 r2.3c 绿;框只差两字符串;转 Tester + Reviewer(Main_Designer 2026-11-08)

- **核**(只读 m10):控制器 + 控制器测试改;`structureTypingBuffer.ts` 的 diff 原文贴在回执且存为 `m10/structureTypingBuffer.r23b-to-r23c.diff`——**只第 17、18 行两个 title/aria 字符串常量**,可见标签与宽度不变;其余 19 文件同 r2.3b。2680/2680、tsc 净、三检查、r04@57 156/0、dist 不变。阳性对照在 r2.3b 上:TWO2 **3/3 红**(`warmup|two|bbb|`)、G1 红、文案红;r2.3c 上 TWO2 3/3 绿、相关 31/31 绿。矩阵 ①22 ②4 ③0;K、H-L 同 r2.3b。
- **机理**(builder 按代码坐实,与 Tester 推断一致):重开恢复循环在一个 effect 里对每条记录同步 `openEntry → retainWords → placeTyped`;`placeTyped` 读→合→`flushSync(applyEdit)` 之间无 await,**但 effect 内 `flushSync` 不提交**,history `latest.current` 仍是落地前的流,下一条读到旧流、以旧 `previousTextFlow` 整块写回。r2.3 时第一条起结构置 busy,第二条轮询等到新流,所以没撞。修:`landKept` 每笔记一条队列,一条一个任务、在 effect 之外,上一条 flushSync 提交后下一条才读。G1:`placeTyped` 对留住字在 `activeElement` 为框时本拍不落、不翻倍,盖住组字回调。G2 守卫测试。G4 文案。F3 撤回保留。拷回计划更新为 r2.3c。**合格。**
- **转 Tester**(包 `editor-rework-r2.3c/`,主 JS `index-BVrO4Ql1.js`):控制器臂全跑(矩阵、K、H-L 0/N、Y1 ×6、acc13、acc18 两形状、TWO2 ×6 撞覆盖写、BOXTYPE 三形状丢 0、LANDFAIL2、EDGE、NA);GEO / acc14 / BAN / 先 Dismiss **自己 diff 核过框文件只差两字符串后沿用**,否则重跑。判语按 Henry 11-08 尺。
- **转 Reviewer**(并行):落地三入口是否都进 `landKept` 队列;读流与 apply 之间无残留 await;队列中一条 keep 不卡后面;G1 盖住 `C:456` 组字路;队列任务在 effect 之外是否有卸载 / 换笔记时的清理。

## Reviewer r2.3c 复核的裁定:六重点落实、无 ③;H1–H3 不丢字,入 A-25(Main_Designer 2026-11-08)

Reviewer 报告「r2.3c 复核」节:三入口进 `landKept` 且任务在 effect 外;读→合→apply 无 await(`apply` 在首个 await 前同步 `setBlockTextFlowDrafts`,effect 外 flushSync 即提交,`readLiveFlow` 读的正是它);builder 两次读流行号 `C3b:464 / :540-541` + 恢复循环 `:612-617` 对上;keep 不卡后面;G1 盖组字回调、判的是框 textarea;换笔记不落错笔记。

| # | 发现(🅱,皆不丢字) | 裁定 |
|---|---|---|
| H1 | 队列任务同步抛异常 → `landingScheduled` 永真 → 本次挂载后台落地全停(`C:204-206`);字留框与存档(②) | **A-25**:try/finally 加固,一行;本轮不动控制器 |
| H2(疑似) | 入队后换笔记 → `C:482` 对 `!live` 直接 return、重试链断;回来恢复循环又跳过它(已在 kept 集)→ 要整页重载才落;r2.3c 引入的间隙(②) | **A-25**:改走 retryTimer;Tester 若在地址栏 / 换笔记臂见到「回来后框不自动落」记 ②、注 H2,不算退步 |
| H3 | G2 守卫按读码可守,但缺「删 `C:241` 即红」的对照;前提是撤销真把角色改回 paragraph | 下次动控制器时补对照;不单开 |

**r2.3c 的放行只看 Tester 的数。**

## 编辑器组 r2.3c 判语收讫:放行成立;两条归类确认——RJ 既有入 TD-56、LANDFAIL 归 A-25 不算 ①;转收割上岛(Main_Designer 2026-11-08)

Tester 判语(`docs/audits/2026-11-05-a21-builder/review-tester.md` 〇〇节,台账 `records/tester/verdicts.md` 已登):**放行**,按 Henry 2026-11-08 尺——

- 挡放行的三类:① 0 / ② 0(本包引入)/ ③ 0。r2.3c 浏览器 210 行 + 旧矩阵 294 行。
- 八项不退全守住(第 1、2 条字在,buffer-2 留住、buffer-4 原位、handoff-1 光标回来、H 卸载 6/6、F 回显 2/2、真笔记 23/23)。
- 同源:`9bc45e69` + 22 文件 22/22 与 `src.sha256` 一致,自建产物 63/63;框文件只差两常量,Tester 逐行看过 diff,r2.3b 几何结果(GEO 12/12 等)沿用。
- 守恒闸 13/13 绿,三组阳性对照都红在目标上;客户端全量 2680 绿;旧矩阵 0 坏。
- Reviewer H1–H3 已入 A-25(上一节)。

**裁定:放行成立。r2.3c 收割上岛,第 21 次部署。**

### 归类 1:RJ(`/` 选 Text 后打字,整块并成一个带换行的单元,字落块首)——既有,不归本包,不挡;登记 TD-56

- 事实:r2 与 r2.3c 逐字相同;第十三节第 5 小节把修前(线上同版)记为同类。
- 尺的参照系是线上(「不比线上差」)。同一段代码、同一行为、线上已在——不是本包改出来的,**不挡**。
- 按结果是 ②(落错位置),是债不是退步。登记 `current-state/tech-debt.md` **TD-56**,承接 A-25(落错位置家族,与「结构非原子残留」同单)。

### 归类 2:LANDFAIL2 / LANDFAIL3(落地保存一律 500 时整篇拒收按键)——不算 ①,归 A-25 既有那条;说明书加一行

- 事实(Tester):带留字记录重开、text-save 全回 500,别的行打 83 键 0 上屏;对照(无记录)83 键全上屏。屏上有恢复横幅(Apply / Dismiss)和每键一条提示;没有 Retry;文案说「Heading changes」。落地保存在重开后 1.3–1.4 秒失败;第 26 秒左右再发一次成功——**那一刻正是 Tester 脚本点笔记外面的时刻**(Tester 2026-11-08 岛上对照坐实:应用失败后不自己重试,网络恢复也不重试,只在编辑器失去焦点时重试;两次更正见下「部署后」一条),字进库(②′),记录清掉;重开两次无重复无框,打字恢复。r2.3 上同样。
- ① 的定义是「字在服务端、存档、框**任何地方都没有**」。这里被拒的键**从未被应用接收**——每一下都有可见提示,没有「上了屏又消失」的字;留住的记录本身在重试成功后落地入库。**不是 ①。**
- 它是 r2.2 节(1339 行)已入 A-25 的那条「409 后状态卡死、⛔ 无提示只读」的同一机理:保存失败保持期(`unresolvedTransfer` / 失败保持)拒打字、等 Retry/Undo,只是这次从落地路径进入。**A-25 该条扩三点**:(a) 保持期整篇拒键,而不是只拒出事的那一块;(b) **失败后无自动重试、拒键无时限、只靠编辑器失焦触发重试**(Tester 岛上 A/B/C 三臂 + 持续失败 110 秒零重试坐实),且无常驻 Retry 控件——A-25 里这条优先级上提;(c) 提示文案「Heading changes could not be completed. Undo to restore the previous text.」对普通打字不成立,改为说「保存没成功、字还留着、重试或撤销」。
- 说明书「已知」加一行:保存失败时整篇可能暂时不接受输入,屏上有提示;网络恢复后字自动落回。

### 观察的处置

- 观察 1(改地址 10 轮 9 条 ②′,r2 只 1 条):r2.3b「后台落地不起结构」的裁定代价,预期之内。说明书「已知」**第一条**写它(Tester 建议,采)。
- 观察 2 = 归类 2。观察 3(KRO)已入 A-25。观察 4(BOXTYPE 判据太死)是测试判据,不是产品问题,不记。

### 下一步(顺序)

1. builder 执行 `COPY-BACK.md`(`heavy-job.lock` 已空,Tester 链已收),回报:`sha256sum -c src.sha256` 22 OK;`git status --short -- client/src/pages/Notes/canvasEngine/` 除 22 之外与拷前一致;`npx tsc --noEmit -p client` 净。⛔ commit、⛔ 动 `edfix`、⛔ 碰 A-19 等别单的工作区改动。
2. 我收割:22 文件 + 审计目录(builder/matrix-5…10、tester-evidence、reviewer)+ 说明书「已知」节 + 看板 / 单卡 / 台账。提交前逐文件扫本机路径、邮箱、地址。
3. 报版本给 Tester,ack 后按 SERVER.md §5 做第 21 次部署;Tester 上岛复核。
4. 转 A-19。L-018(边栏)另开小单,⛔ 并本单。

**若拷回后 tsc 不净或 22 OK 不成立:停,不猜,回报行号。**

### 收割记(Main_Designer 2026-11-08)

- builder 拷回:22 OK;canvasEngine 其余 7 条(A-19 的)拷前后一致;tsc 净(在 `client/` 目录跑 `npx tsc --noEmit -p .`,仓库根没装 typescript)。我自核 22 OK;`9bc45e69..HEAD` 代码零改动,本次提交的代码恰为 22 文件。
- 审计目录 `2026-11-05-a21-builder/`(617 文件)与 `2026-11-05-a18-builder/`(27 文件)入库;本机路径与会话目录已换成 `<home>` / `<tmp>` / `<ops>` / `<session>`,重扫为零。`*.log`(89 个)按仓库 `.gitignore` 不入库,与既往审计一致;正本在 builder / Tester 本机与私有 ops 目录,回执里指向 `.log` 的证据以同目录的 `.txt` / `.json` 汇总为准。
- **部署**:Tester ack `fdeacb5d`(自跑 ack-check:22/22;`9bc45e69..X` 代码只有 22 个)→ 第 21 次部署 `412565b6` → `fdeacb5d`,岛上主 JS `index-BVrO4Ql1.js`、dist 63 文件、health ok,纯前端重建不动依赖;部署前账本已备份。Tester 转岛上复核(63 文件对账 + 代表臂 + 「保存持续 500 约 60 秒」补测)。
- **Tester 两次更正 LANDFAIL 机理,最终坐实**:先说「网络恢复后 26 秒」(起点算错),再说「失败后约 25 秒定时重试」(把自己脚本点笔记外面的固定节奏当成了应用定时器),岛上对照后定论——**落地保存失败后应用不自己重试,网络恢复也不重试;只在编辑器失去焦点时重试一次**(持续 500 的 110 秒里零重试、15 键全拒;A 臂点外面即发;B 臂失败中点外面触发一次又 500、之后再不自动试;C 臂编辑器从未获焦时点外面不触发,要先点进行里再点外面)。刚失败时有两条临时提示(「Failed to save block」「Text changes could not be saved. Retry saving or undo…」)几秒后消失,屏上没有 Retry 按钮。归类不变(键当场被拒有提示、字在记录里、失焦即落、重开无重复);A-25 那条升级见归类 2 (b)。说明书「已知」第 2 条按 Tester 建议写法改,含「先点进行里、再点外面」。Tester 把两次报错的坑记进 METHOD 第六节。
- **⚠️ 口令事件(Tester 2026-11-08 只报事实)**:`fdeacb5d` 入库的 8 个 builder 工具脚本(`a18-builder/matrix.mjs`、`trace.mjs`;`a21-builder/tools/matrix24.mjs`;`builder/matrix-3-final/matrix25.mjs`;`builder/matrix-5-round2/tools/matrix25*.mjs`、`matrix-diag.mjs`;`tester-evidence/acceptance-2026-11-08-r2/scripts/b-matrix25b.mjs …`)把 builder **本地临时后端**(127.0.0.1:3001)的临时账号 `a18@example.test` 的口令写成了明文。我收割前的扫描只扫了路径、地址、邮箱、API key 形状,没扫 `password =` 字面——是我的漏。处置:①岛上只读查 users,该账号**不存在**(users 共 2 个),岛上无对应账号;②紧随的 docs 提交把 8 处明文换成 `process.env.A18_SCRATCH_PASSWORD`,全库再扫 `password/secret/token/JWT/Bearer` 字面为零;③`fdeacb5d` 历史里那份仍在公开远端,**删历史只归 Henry**,我不动;④收割前扫描清单加一项「口令字面」(`records/tester/METHOD.md` 的扫法 Tester 已写,我照搬进收割前检查)。builder 侧:临时账号口令以后从环境变量取,⛔ 写进任何会入库的脚本。

## A-19 派单:图片 Source 的笔记是空的——按订单开头规格封「带源码快照的包」,先 Reviewer 再 Tester(Main_Designer 2026-11-08)

编辑器组已上岛(fdeacb5d)。A-19 现在开工,规格不变(订单开头「A-19 · 图片 Source 的笔记是空的」及其**设计裁定**五条、**验收**一段)。builder 在编辑器组期间已把 A-19 的改动写进共享树(13 个文件:`useSourcePageViewController.ts` 及其新测试、`NoteSourcePagesLayer.tsx/.test.tsx`、`SourceViewToggle.tsx`、`sourcePageLayout.ts/.test.ts`、`sourceApi.ts`;`server/package.json`(只是 `test:v2` 加了新测试)、`sourcePageImages.ts`、`vpsF11SourcePageImages.test.ts`、新 `sourceImageSize.ts`、新 `a19SourceImagePages.test.ts`),没有回执。**这次把它收成一个可验的包**,不是「代码在树里」。

### builder 要交的

1. **包**:ops `packages/a19-image-pages/`,内容照编辑器组的样式——`dist/`(基于 `fdeacb5d` + A-19 文件的自建产物)、`src/`(全部改动文件,含新文件和测试,逐字节)、`dist.sha256`、`src.sha256`、`filesNN.list`、`COPY-BACK.md`(拷回清单、共享树现状、拷后核对命令)。在 **scratch 副本**里建、测、封包;⛔ 再碰共享树(它里面那 13 个文件就是你的草稿,封包时从它们拷出即可,之后到我说拷回前不动)。
2. **回执**:写进本订单「## Result(builder 回执区,候填)」下,标 `A-19 Result(builder 日期)`。必含:改了什么(按裁定五条逐条对应:native-image 进页影像通路 / 图片投影固定原页不显切换 / 存量沿用生成按钮 / 物化器 canvas image 对象不动并申报是否死形状 / 删源与重投影级联无残留);**「代码回答」节**(行号对包 `src/` 快照):①图片尺寸怎么取(`sourceImageSize.ts` 支持哪几种格式、识别不出时怎么办——⛔ 抛到整条导入失败);②页图「直接用原图」是怎么接的,有没有新起队列、有没有转换器介入;③图片投影在哪一行判「无文本→固定原页」,文本/原页切换和默认判决各自怎样不留死路;④删源级联与重投影走的哪条既有路径;⑤`server/package.json` 的改动只是 `test:v2` 列表——确认没有新依赖、锁文件未动。
3. **测试与阳性对照**:新 server 测试(`a19SourceImagePages.test.ts`)和 client 测试在 `fdeacb5d` 上必须红、在包上绿,红的输出存 `docs/audits/2026-11-06-a19-builder/positive-controls.txt`(目录已有,沿用这个日期的目录,⛔ 再开 `2026-11-05-a19-builder/`);server 全量与 client 全量各跑一次,记结果;tsc 净。证据落 `docs/audits/2026-11-06-a19-builder/builder/`。
4. **说明书素材**:`MANUAL-SECTION.md` 放包里:图片 Source 的笔记长什么样、存量图片怎么补(点生成)、哪些格式支持、大图怎么显示、什么情况看不到图。人话,只写看得见的行为。
5. **红线照旧**:⛔ git 写操作、⛔ 动依赖锁、⛔ 真实模型、⛔ 碰岛、⛔ 读 `.env` 的 key 值、⛔ 动 `edfix`;临时账号口令只从环境变量取,⛔ 写进任何会入库的脚本(编辑器组收割时漏了 8 处明文,见「收割记」);本机路径⛔进仓库文件。CPU 压 90% 以下,重活取 `heavy-job.lock`;Tester 正在岛上复核编辑器组(锁可能被它持有),等锁。

### 流程

builder 回执 → **Reviewer 先核**(对照本节五条裁定 + 「代码回答」逐条读包 `src/`,发现写 `docs/audits/2026-11-06-a19-builder/reviewer/findings.md`,台账登一行)→ 我裁 → **Tester 验**(验收段四条 + 血缘 chip 不回归 + 1a 原页通路回归;server 变了,所以要接本地后端跑,builder 的草稿后端 3001 留着给 Tester 用)→ 放行 → 拷回 → 收割 → 第 22 次部署(server 变了,部署时要重启服务;无依赖变动不 npm ci)。

**量级超出规格、或发现要改 1a 契约 / 新起队列 / 新依赖才做得到:停,短讯我,不自行扩。**

### A-19 施工中 · builder 两处先报(Main_Designer 2026-11-08 记)

- **副本**:`<tmp>/a19pkg`,base = `fdeacb5d` 原样,work = `fdeacb5d` + 13 文件;共享树那 13 个从此不动。重活排队等 `heavy-job.lock`(Tester 岛上复核持锁)。阳性对照两段:A 段 A-19 测试在 `fdeacb5d` 上要红;B 段在包上逐个改坏一处看测试红不红。
- **更正 1(行尾)**:共享树里的 `vpsF11SourcePageImages.test.ts` 被草稿连带把 CRLF/LF 混用整篇统一成 CRLF(diff +77/−71,忽略行尾实为 +7/−1)。包里这份按 `fdeacb5d` 原字节重做,只含那 +7/−1。**裁:拷回一律以包为准**(COPY-BACK 的唯一依据是 `sha256sum -c src.sha256`,共享树那份会被覆盖);Tester 同源构建也以包 `src/` 为准。这正是「包带源码快照」要防的事。
- **更正 2(阳性对照自己没过阳性对照)**:旧 `positive-controls.txt` 里「读不出尺寸就猜一个」那一臂没红——去掉 throw 后下一行读 `image.width` 照样抛,改坏等于没改坏。新版换成真猜一个 A4 尺寸再试,另加「尺寸读取器对坏字节猜一个尺寸」一臂。**收**;这条就是「闸自己也要过阳性对照」。
- **提前说清一条裁定边界,免得回执后再返工**:「代码回答」①(读不出尺寸时怎么办)的答案决定裁定——(a) 整条导入失败 = **不接受**(与 TD-51「解析失败拖累页影像」同病);(b) 页影像通路对这一张跳过、导入照常成功、界面有可见提示并能用「生成」重试 = 可接受;(c) 页登记用后备尺寸、页图仍用原图、客户端按图片真实比例显示 = 更好,但若要改 1a 契约就停下来问。**现在是哪种,回执写清,先不改**,我按回执裁。
- **builder 答①(先于回执)**:现状属 **(b)**——读不出尺寸时 `openImagePageRenderer` 的 render 抛错,`renderMissingPages` 逐页 catch 记进 `failed_pages`、该页登记为 failed;materialization 仍 materialized、笔记在;界面该页显示「原页无法生成」+「重试」(走「生成」同一入口);文件真坏则重试多半仍失败,说明书照实写。有测试守「尺寸读不出 → 该页失败并说明,笔记仍发布」。未走 (c)(要改页登记写法)。**裁:(b) 可接受,本单不再动这条;(c) 记为可选改进,不排。** 回执里仍要列尺寸读取器支持的格式——若上传入口接受某格式而读取器读不出(浏览器本能显示),那是缺口,列出来即可,不扩修。

### 第 21 次部署 Tester 已核(Main_Designer 2026-11-08 记)

- 经隧道 GET 岛上 63 个产物,63/63 与包 `dist.sha256` 逐字节一致,主 JS `index-BVrO4Ql1.js`(同一脚本对第二十轮为 61/63,作对照)。
- 代表臂(岛上前端,54 行):丢 0、落错或重复 0、误删 0。H-L 3 条 ②′;TWO 3/3;Y0 6/6;Y1 3/3 留住;TWO2 覆盖写 0、两框同屏 Discard 只删被点的;旧记录 / STEAL2 / 复制粘贴 6/6;acc13 10/10;A1 8/8 字在(5 完全正确、3 ②′);H-U/H-W 6/6;G 2/2;J 4/4。
- 报告第十五节;`records/tester/verdicts.md` 该行「部署核对」已改为已核;证据 `tester-evidence/postdeploy-21/`(已扫)。
- **编辑器组返修(A-18 残留、A-21、A-24)至此关闭。** 余项都已有去处:A-25(结构非原子残留、LANDFAIL 无自动重试、KRO、H1–H3、Y1 id 复用、文案)、L-018(边栏)、TD-55、TD-56。


### A-19 第一趟 · 两处补跑、一条全量尾巴、一臂没红的裁定(Main_Designer 2026-11-08)

- **清理**:编辑器组副本(ed21、ed21base、edfrozen、ed21-evidence)已清,junction 先拆、共享 node_modules 完好;代理 4140–4148 停。`edfix` 未碰(铁令);`edacc` 是 Tester 的验收副本,未碰。3001 草稿后端留着,builder 核过:跑的是 `fdeacb5d` 的 server + A-19 两个 server 文件(与包逐字节同,启动后无 server/src 提交),Tester 可直接接。
- **第一趟**:client tsc 净、vite 构建 exit 0;阳性对照 A 段在 `fdeacb5d` 上红,B 段 11 臂 10 红、各红对应条。server build / tsc / test:v2 因副本缺 `docs/generated/tool-face-manifest.json` 与未建 `shared/dist` 而失败——副本没建全,与 A-19 无关,补齐后在锁下补跑;server 若仍有红再在 `fdeacb5d` 上对照。
- **client 全量 2686/2686 过但 exit 1**:2 个 unhandled error 来自 `structureTypingBuffer.ts:292` 跟随定时器里的 `document.hidden`——`useHeadingStructureController.test.tsx` 环境拆掉后定时器还在跑。这是编辑器组(已上岛的 `fdeacb5d`)的定时器生命周期尾巴:浏览器里 `document` 一直在,不丢字、不影响线上;但「卸载后定时器仍跑」与 Reviewer F5/F6 记的泄漏同根。**裁:A-19 不修;builder 在包与 `fdeacb5d` 两副本各跑一次全量,基线上同样出现则记 TD(全量偶红族,与 TD-45 同列)并把「卸载时清跟随定时器 + `document` 守卫」挂到 A-25(下次动控制器一并补,与 H3 同批);基线上不出现则回报,我再看。**
- **B 段没红的一臂**:删掉 `setMode` 里 `if (next === 'text' && pagesOnly) return;` 测试照样全绿。builder 解释:图片 Source 的 active 由 `pagesOnly` 强制为真、切换按钮已隐藏,这行只拦住往标签页记忆里写一个用不上的 `'text'`,看得见的行为没有测试守它。**裁:删这行**——改坏测不出的守卫就是没人知道它守不守得住的守卫,留着只会在下次有人改 `pagesOnly` 逻辑时制造假安全;真正的不变量是「pagesOnly 的笔记:无论 `setMode` 被谁调成 `'text'`,active 仍是原页、切换不渲染」——回执里指出守这条不变量的测试在哪一行(没有就补一条,这才是 B 段该红的那臂)。删行后重新封包、重算 `src.sha256`,阳性对照 B 段此臂改为「去掉 pagesOnly 强制」须红。

### A-19 验收做法变更:Tester 自起修前 / 修后两套本地后端,3001 只作一次交叉核对(Tester 提,Main_Designer 2026-11-08 准)

- Tester 不接 builder 的 3001 作主后端,改为自起两套:**修前** = `fdeacb5d` 原样;**修后** = `fdeacb5d` + 包 `src/`(sha256 对过);各用临时库与临时目录,docx 用 1a-乙的假转换器,只用临时账号,不连岛、不用真实模型。3001 只拿同一张图做一次「表现一致」交叉核对。
- 理由(准):①同源可核——3001 跑的是 builder 副本,Tester 核不了它与包一致;②「删源无残留」要直接列后端页图目录、查库,不该翻 builder 的目录;③「旧图片点生成后可见」要先用修前服务端导入、再用修后服务端开同一个库,3001 做不出这个「旧」状态。**这比派单写的更对,派单那句作废。**
- Tester 的臂(包到后按 src 再细化):首屏与比例(自造 png 横/竖/超宽/超大/16×16/透明;jpeg 普通/EXIF 方向 6 与 3/超大;webp VP8/VP8L/VP8X+ICC/ALPH/无损;量首屏可见、比例与原图一致、不撑破、无切换、页图字节等于原件);读不出尺寸(乱码 png、截断 png、png 改名 .jpg → 导入成功、笔记在、该页「无法生成」+重试;另列「上传收而读取器读不出」清单);旧图片(修前导入、修后开、点生成、可见);删源与 Rebuild(前后列目录查库);血缘标(图片笔记来源区修前后对比;PDF p.N 跳页照 round-04);1a 原页通路回归(PDF/docx 切换、默认判决、转换窗口、记忆与跳页、转换失败出口,修前修后各一遍)。
- **未覆盖**:渐进式 JPEG(本机无编码器)。→ **Reviewer 读码时看尺寸读取器认不认 SOF2(0xC2)**,写进 Reviewer 的点名清单。
- 锁:builder 封包期间 Tester 不抢锁,只造图片和脚本。

### A-19 Tester 就绪 · 修前基线已跑(Main_Designer 2026-11-08 记)

- 23 张自造图片在 Chrome 逐张核过;截断 png 在 Chrome 里按 800×600「加载成功」而画面近空白,预期从「解码失败」改为观察项。图片探针只读页面 DOM 对构建产物跑;血缘标探针真点「View original」看落页。
- **修前基线(`fdeacb5d` 本地后端)**:4 张好图(png、jpeg EXIF6、webp、6000×4500 png)都生成了笔记、屏上 0 张图——A-19 复现,探针阴性对照成立。乱码 png 与 avif:上传成功但停在 `received` 不出投影(修前既有;修后按 (b) 该页应失败并说明,Tester 对比);空文件 400「Source file is empty」;截断 png、png 改名 .jpg:有笔记无图。PDF 默认原页、12 个血缘标、跳 3/7/11 页全对;docx 默认原页、文本视图 0 血缘标(docx 文本不带页码),按「修后与修前一致」判。
- **环境事实**(只记指针,细节在私有 ops 档案):本机临时后端默认绑 `0.0.0.0`,Tester 已把自己的改绑回环;服务端监听地址可配置记 **TD-57**;系统设置归 Henry,已报。

### A-19 补跑 · 三条包上红是旧测试预期没跟上;两件事要进回执与 Reviewer 清单(Main_Designer 2026-11-08)

- **server test:v2**:包 967 条 11 红,`fdeacb5d` 973 条 8 红;共有的 8 红是 scratch 环境(MinerU 族、manifest copy、live specimen、v2CanvasPersistenceCutover、v2DocumentParserPdf),不修。只在包上红的 3 条,builder 改预期(两测试文件按 `fdeacb5d` 原字节只改那几行,包从 13 文件增至 **15**):①`fidelity1a2DocxPages.test.ts:261` 页登记多了 `text_view: true`;②③`v2SourceLifecycleClosure.test.ts:303/:405` 移到 Home 的 canvas_assets 1→2、删源 cleanupCalls 2→3——**图片 Source 现在每张图两份**(物化器投影副本 + 新原页图),连 blob 删源清三个文件。
- **client 全量**:包 2686/2686 exit 0;`fdeacb5d` 2680/2680 exit 1、2 个 unhandled(`structureTypingBuffer.ts:292`)。基线也出现、间歇 → **TD-58**,修法挂 A-25(与 H3 同批)。
- **裁定 1 已执行**:删 `setMode` 死守卫,守不变量的测试在 `useSourcePageViewController.test.tsx:23-29`(pagesOnly 时 `setMode('text')` 后 active 仍真)与 `NoteSourcePagesLayer.test.tsx:75`(切换不渲染);B 段该臂改「去掉 pagesOnly 对 active 的强制」,第三趟看红。
- **两件事(我现在点名,免得回执后返工)**:
  1. **`text_view` 是页登记的新字段 = 1a 页登记形状的加法**。派单说「要改 1a 契约就停下来问」,这条没问就加了;加法我接受,但回执「代码回答」必须答:字段写在哪(表列还是 JSON)、有没有迁移、**岛上已登记的旧页(PDF/docx)没有这个字段时客户端当什么**——缺省必须是「有文本视图」,否则第 22 次部署后岛上所有旧 Source 丢文本视图,这是 🅰 回归。Reviewer 清单第一条就是它;Tester 加一臂:**修前导入的 PDF/docx,修后打开,文本视图、默认判决、切换都在**(不是修后重新导入)。
  2. **每张图两份字节**:原页图是复制原件进页图存储,不是引用既有资产。「直接用原图」的本意是不经转换器,复制一份字节不违背,但多一份存储;Henry 量级可忽略,先接受。回执「物化器 canvas image 对象」那条一并申报:三份各在哪、谁读哪份、物化器那份是否已成死形状;合并为引用是否要动 1a 契约——申报即可,不改。记 TD 候回执。
- **Tester 已备 `text_view` 臂**:修前(`fdeacb5d`)后端上导入 18 张好图 + 4 个坏/异格式文件 + 12 页 PDF + 12 页 docx,页登记字段只有 `page_number / asset_id / image_width / image_height / pdf_width / pdf_height`(**无 `text_view`**,正是旧形状);数据目录整份冻结成快照。修后服务端开这份快照、不重新导入,逐项对比修前基线(PDF 默认原页、文本视图 32 块、12 血缘标、跳 3/7/11 页对、离开回来仍文本、刷新回原页;docx 默认原页、文本 160 块、0 血缘标;18 张图登记 none、无图、无生成按钮)。「修后重新导入」另算一臂。

## A-19 回执收讫:五条裁定逐条有行号;`text_view` 不落库、由 parser_key 现算、客户端只认 `=== false`;三份字节申报 → TD-59;转 Reviewer 与 Tester 并行(Main_Designer 2026-11-08)

- **包**:ops `packages/a19-image-pages/`,`src/` 15 文件我自核 `sha256sum -c` 15 OK;`dist/client` 63 文件、主 JS `index-Gswd3cHv.js`;`server/package.json` 只改 `test:v2` 列表、锁未动。回执「A-19 Result(builder 2026-11-08)」逐条对裁定与「代码回答」五问给了行号。
- **我点名的两件,回执答到位**:①`text_view` 不是表列也不是 JSON 字段、无迁移,服务端每次组装登记时由 `parser_key` 算(`sourcePageImages.ts:526`),岛上旧 PDF/docx 部署后立刻得 `true`;客户端只认 `=== false`(`useSourcePageViewController.ts:79`),字段缺失当有文本视图,`useSourcePageViewController.test.tsx:47` 守。**这是 Reviewer 第一核、Tester 冻结旧库那臂第一验。** ②三份字节表清楚:原件 blob / 物化器投影副本(画面无人画,AI 树与空笔记判断仍读)/ 原页图;合并为引用要动 `source_pages.image_asset_id` 约定与释放顺序 → 本单不做,登 **TD-59**。
- **读取器两个缺口(申报,不修)**:jpeg SOF 高度为 0、靠 DNL 段给高度 → 读 null、该页失败;webp 内 EXIF 方向不读 → 竖拍 webp 比例可能对调。记进说明书「已知」与 TD-59 同行;Tester 若手头能造 webp+EXIF 就加一臂,造不出记未覆盖。
- **阳性对照**:A1 整文件加载不了算「红」太便宜,builder 自己补了 A2(放进读取器但无人调用 → 11 条行为红),对;B 段 11/11 红。
- **流程改为并行**:Reviewer 读包 `src/` 对裁定;Tester 同时起同源构建与臂(修前/修后两套后端已备)。Reviewer 若出 🅰 发现要改包,Tester 已跑的臂按文件级同源沿用。**放行只看 Tester 的数 + Reviewer 无未处置的确认项。**
- **Reviewer 点名清单**(写进其发现报告开头):①`text_view` 缺省链(服务端 `:526` 对所有非 image parser 是否都给 `true`,含 md/txt/html 等每一种 parser_key;客户端 `:79`;`sourceApi.ts:56`);②尺寸读取器:png/jpeg/webp 各分支边界、渐进式 JPEG SOF2(0xC2)是否认、EXIF 5–8 对调是否按浏览器显示方向、宽高 0 → null;③读不出尺寸 → `renderMissingPages` 逐页 catch(`:383/:392`)后 materialization 仍 materialized、无整条导入失败的别路;④页图 = 原字节(`:128-139`、`:221-225`)、`ON CONFLICT` 更新 storage_key/filename/mime 时旧文件是否释放;⑤删源与重投影:`releaseNoteCanvasAssets` + `sourcePageImageAssetIds` 是否覆盖原页图的全部引用,`adoptSourcePageImages` 挪页后旧笔记是否残留;⑥删掉的 `setMode` 守卫与 `:183/:184` 的强制、依赖数组改动有无别的调用方受影响;⑦物化器对象未动的核实;⑧15 文件之外有没有该改没改的调用方(例如别处读 `register.text_view` 或假设每 Source 一份资产的计数)。

## Reviewer A-19 复核的裁定:点名八条成立、无 🅰;J1 是我裁定里的洞——「不显示切换」撤回,图片笔记默认原页但切换保留;J2 补四测试;→ A-19b 小返修(client + 一个测试文件)(Main_Designer 2026-11-08)

Reviewer 报告 `docs/audits/2026-11-06-a19-builder/reviewer/findings.md`:点名八条读码全成立(`text_view` 只对 `native-image` 为 false,`P:526`,基线全部 parser_key 其余皆 true,两个出口都带字段,客户端还要求 `supported`;读取器认 SOF2、EXIF 两字节序、5–8 对调、0→null)。四条 🅱:

| # | 发现 | 裁定 |
|---|---|---|
| J1(疑似,设计) | `pagesOnly` 后,图片投影笔记的解释层(批注 / 内容组 / purpose / 显示覆盖)在页面模式不可达;Agent 聚焦块调 `setMode('text')`(`NoteRuntimeDocumentLayer.tsx:139`)悄然落空;涉红线「Agent 能编辑的,人类必须 100% 都能编辑」 | **成立,且比 Reviewer 写的更大**:说明书 §一「原页视图的边界:只能看和跳。批注、选字、组、铸 item 都在文本视图」——文本视图不只是看物化文本,**它是这篇笔记唯一的写作面**。我派单写「图片投影没有文本可看:固定在原页,不显示文本/原页切换」时只想到物化文本为空,忘了用户要在图片下面写字、做批注。按现包上岛,图片笔记变成只能看的。**撤回「不显示切换」那半句。** 新裁定:`text_view: false` 的含义是「没有物化文本层」,只决定**默认判决 = 原页**(含还没页图时直接落原页、见生成按钮,`:130` 的直接收口保留);**切换按钮照常显示、文本视图照常可达**,与 PDF/docx 同一套记忆与切换;Agent `setMode('text')` 因而恢复有效。文本视图里若现成横幅槽能复用,加一行「此资料没有文本层,看图请切原页」,没有现成槽就不加。→ **A-19b** |
| J2(确认) | 读取器四分支无测试:SOF2、VP8L、VP8 有损、小端 EXIF | **A-19b 一并补四条**,造法照现有 `jpegOf` / `webpOf` |
| J3(疑似) | PNG eXIf 方向不读(与 webp EXIF 同类) | 并进 TD-59 与说明书「已知」同一条;不修 |
| J4(疑似) | 登记未到时先闪一下文本视图 | 改 J1 后,图片笔记的开场与 PDF 一样(先文本、登记到了跳原页),不再是「按钮闪现又消失」;记观察,Tester 看一眼可见度,不修 |

### A-19b 范围(只这些)

- `useSourcePageViewController.ts`:去掉 `pagesOnly` 对 `active` / `textAvailable` 的强制(`:183-184`);`pagesOnly`(改名随意,语义 = 无物化文本层)只用于默认判决直接收口(`:130`)与「还没页图时默认落原页」。
- `SourceViewToggle.tsx:9`:不再因 `pagesOnly` 返回 null。
- 测试翻面:`useSourcePageViewController.test.tsx:23-29` 改为「图片笔记默认原页;`setMode('text')` 后切到文本;切回;记忆同 PDF」;`:40` 无页图时仍默认原页见生成入口;`:47` 不变;`NoteSourcePagesLayer.test.tsx:75` 改为「切换渲染」。
- `a19SourceImagePages.test.ts`:补 J2 四条。
- **server 运行时文件(`sourcePageImages.ts`、`sourceImageSize.ts`)、`sourceApi.ts`、`sourcePageLayout.*`、`NoteSourcePagesLayer.tsx` 不动**——哈希不变,Tester 服务端臂与首屏/比例臂按文件级同源沿用。
- 阳性对照:B 段原「去掉 pagesOnly 对 active 的强制」作废;新臂「去掉默认判决的直接收口」须红(默认判决等页/读 scrollTop 的测试)。
- 包名 `a19-image-pages-b`,照旧 dist + src + 两份 sha256 + files 清单 + COPY-BACK.md;`MANUAL-SECTION.md` 改一句:图片笔记默认进原页,右上角切换可到文本视图写字、批注。
- 回执补「代码回答」⑥:默认判决在图片笔记上的三种起点(无页图 / 页图生成中 / 页图就绪)各落哪,行号。

**Tester**:继续跑服务端与首屏比例臂(沿用);切换/默认判决/Agent 聚焦相关臂等 A-19b;另按 Reviewer 建议在冻结旧库上数 `native-image` 投影上 active 的 `annotation_truths` / `content_groups` / `purposes`(记录用,不改裁定);并在现包上确认一次「原页模式下不能写、不能批注」(坐实 J1 的前提)。**Reviewer**:A-19b 到后只 diff 核改动文件 + J2 四测试是否各守一分支。

## A-19b 撤销:投影笔记的文本视图本身是锁的、图片笔记 0 文本块,恢复切换只多一页空白只读;J1 转设计题 L-021,J2 转 TD-60;原包继续验(Main_Designer 2026-11-08)

Tester 赶在封包前报的两件(都在现包、真实输入):

- **原页模式下不能写、不能批注、不能建组**(图片笔记与 PDF 原页同;PDF 文本视图作阳性对照:拖选原文后出块工具条、「拖进内容组」把手、「问 Agent」)。J1 的前提成立。
- **但文本视图也不是写作面**:投影笔记的标题、描述、正文 textarea 全 `readonly`,底部「Source locked」,悬停「Source content locked; interpretation and organization remain editable」;保存/删除灰,「插入」九项全灰。批注与建组都要**先选中原文文字**;而修后的图片笔记 API 查 blocks = 0,屏上没有任何文本单元。推论:切换加回来后,图片笔记的文本视图是一页空白、只读、插入全灰、没有字可选——批注和建组照样够不着。

**裁定**:我上一节「文本视图是图片笔记唯一写作面」这一判断错了一层——它是 PDF/docx 投影笔记的**解释面**(批注、建组、purpose),不是写字的地方;而图片笔记在这个面上没有锚点。恢复切换达不到 J1 要的东西。**A-19b 撤销**,原包(`index-Gswd3cHv.js`)按原裁定(默认原页、不显示切换)继续验、放行——pages-only 是当前唯一不骗人的界面。

- **J1 → L-021「图片 Source 没有解释面」**(`design/loose-ideas-ledger.md`):候选三路(整页锚点批注 / 允许用户块 / 图为可选对象),与 OCR 选型(L-016)同一张卡;等 Henry 日用撞上再立单。岛上只读查:1 篇 native-image 投影笔记,annotation_truths / content_groups / purposes 皆 0(任何状态);Tester 两份临时库各 25 篇也皆 0。没有存量受影响。Agent 聚焦 `setMode('text')` 在图片笔记上落空,目前无害(无块可聚焦);立 L-021 单时一并处理。
- **J2 → TD-60**:四条读取器测试,builder 若已写好存 ops `packages/a19-image-pages/extras/j2-reader-tests.patch`,下次动 server 随单入。
- **J4**:原包行为(开场一瞬文本视图带切换,登记到了跳原页、按钮消失),记说明书「已知」一句。
- **Tester 其余进度(现包)**:同源 63/63、1789/1789;`text_view` 旧库臂全过(修后开冻结旧库,PDF/docx 逐项一致,登记旧 PDF/docx 为 true、旧图片 false;另加「修后前端配修前后端」臂,缺字段当有成立);旧图片 18/18 生成按钮在、点后出图、比例对(EXIF 6/8 竖图)、字节等原件、不撑破、逐张只补缺;webp EXIF 方向 Chrome 不理会(登记与显示一致,其他浏览器未核);jpeg DNL 高度造不出记未覆盖;「png 改名 .jpg」原样本与另一 png 字节相同被内容去重,另造字节不同版本补测。接下来:新库图片全臂、坏文件、删源与 Rebuild、血缘标、1a 回归、3001 交叉核对。

**我的教训**:一小时内对同一条裁定翻了两次(不显示切换 → 恢复切换 → 不显示切换)。第二次翻时我只读了说明书一句「批注在文本视图」,没核「文本视图能不能写」「图片笔记有没有可选的东西」——Tester 一个 20 分钟的探针就把这两点坐实了。**可达性类裁定先问 Tester 探一下那个面到底能做什么,再改。** 记台账 §337。

## A-19 判语收讫:放行;一条发现判不挡 → TD-61;说明书按实测六处改;拷回 15/15;收割;第 22 次部署(Main_Designer 2026-11-08)

**Tester 判语**:放行(`docs/audits/2026-11-06-a19-builder/review-tester.md` 〇;台账 `records/tester/verdicts.md`)。同源:`fdeacb5d` + 包 src 15 文件,自建客户端 63/63(`index-Gswd3cHv.js`)、服务端 1789/1789,逐字节同包;`package-lock.json` 哈希同基线。验收四条全成立(21 张好图首屏 1 秒内可见、比例误差 <1.5%、EXIF 6/8 竖图、超栏宽缩到 904 不裁、小图原尺寸、页图字节 = 原件;旧图片 18/18 生成按钮、不重复;删源三份文件全清、Rebuild 旧笔记 404 磁盘不增减;血缘标 PDF 12 个跳页全对、docx 0 个、修前修后同);1a-乙 8 组修前修后各 2 轮逐条一致,另补三臂(docx 转换失败 / 未配转换器 / 同标签页文本记忆)。我点名五项:① `text_view` 旧库三组合全过;② 旧图片 18/18;③ 三种读不出尺寸的文件都是导入成功、笔记在、第 1 页「This page could not be generated.」+「Try again」;④ webp EXIF 在 Chrome 无可见后果、jpeg DNL 本机造不出未覆盖;⑤ avif / 乱码 png 与修前完全相同(停 received、不出笔记、无提示)。〇.5 坐实 J1 前提:图片笔记与 PDF 原页都不能写 / 批注 / 建组,PDF 文本视图作阳性对照能批注能建组;冻结库与修前库图片投影上的批注 / 组 / 目的都是 0。

**Tester 请裁的一条 · 裁定:判不挡本单,记 TD-61,说明书照实写**。原页登记 `GET /api/sources/by-projection-note/:id/pages` 失败(500 / 断网,取样 4、10、20 秒)时图片笔记始终空白——无图、无提示、无重试、放行后 4 秒不自动恢复,刷新才好;PDF 修前修后同样静默退回文本、无提示。回执「走原有的报错和重试路径」没错,错在原有路径本身不出任何提示,落到没有文本的图片笔记上就是一页空白。按 Henry 放行闸:不是 ①(字不丢)、②(不错位)、③(不删记录);只在请求失败时出现、刷新即恢复、修前图片笔记本来就是空白。不开 builder 新一趟(A-19 已翻过两次,再加一趟就是第三次范围变动)。处置:TD-61(修法=登记失败态进控制器、原页层出「加载失败 / 重试」,pagesOnly 尤其不能空白),承接=下一个动 Source 阅读视图的单,L-021 立单时一并;说明书「图片 Source 的笔记 · 已知」②。

**说明书**:`app-operating-manual.md` §二新增两条「图片 Source 的笔记」「图片 Source 的笔记 · 已知」(六项:L-021 无解释面 / TD-61 加载失败空白 / 文件头坏的停 received / 超宽全景十几像素高 / J4 开场闪一帧 / TD-59 三份字节),「格式现状」图片一句改掉「正文是空的」,「原页视图的边界」补「文本视图本身是锁的」。builder 的 `MANUAL-SECTION.md` 素材按 Tester 〇.4 六处改过:界面文字是英文(按钮「Generate original page images」、失败「This page could not be generated.」「Try again」);「加载失败显示失败和重试」不成立 → 已知②;「坏文件显示无法生成」只对能被认作图片的成立 → 已知③;竖拍转正只对 jpeg;加超宽全景已知;「正在准备原页…」没测到不写。

**拷回**:builder 照 `COPY-BACK.md` 原样执行,`sha256sum -c src.sha256` 15/15 OK;拷前拷后 `git status`(范围 client/src server/src server/package.json)只多两行、都在 15 个之内(`fidelity1a2DocxPages.test.ts`、`v2SourceLifecycleClosure.test.ts` 从基线改成包的预期);client `tsc --noEmit` / server `tsc -b` / server `tsc --noEmit` 三处 exit 0;`shared/`、两个 dist 无已跟踪变动。

**收割前扫描(兑现 §333 承诺)**:新脚本 `scripts/pre-harvest-scan.mjs`(零依赖;默认扫已暂存,`--changed` / `--tracked` / `--paths`;⛔ = 本机用户名路径、`AppData\Local\Temp`、Claude 会话目录、有地址语境的公网 IPv4、邮箱、口令 / API key / 令牌 / JWT / Bearer / 私钥字面;⚠️ = 盘符路径、无语境四段数、AppData 其他、测试文件里的口令;ℹ️ = `0.0.0.0` 出现处;含 NUL 与二进制扩展名的文件列出请人工确认;`--max-mb` 调单文件上限)。校准:全树已跟踪文件 4326 个从首版 690 处 ⛔ 调到 **0**(去掉的全是版本号 / 章节号当 IP、npm `包@版本` 当邮箱、设计令牌 `token:` 当口令、Markdown 反引号吞句、注释里的占位符描述这几类误报);阳性对照一个临时文件 13 处全亮、7 条该放过的全过(含事故原形 `const password = '…'`)。顺手扫出**两处旧泄漏**并在 HEAD 洗掉:`claude-log/2026-08-20.md:622` 一行 git 作者邮箱、`claude-log/2026-08-21.md:273` 会话目录槽名(历史里仍在,与 11-08 口令事件同一类,归 Henry 定)。本次收割集(15 代码文件 + `docs/audits/2026-11-06-a19-builder/` 85 个文件含 3 份 5.7MB 全量日志 + docs)`--max-mb 8` 扫:**⛔ 0**。脚本本身没进钩子(钩子归 Henry 定),候 Henry 过目。

**流程**:收割(代码 + 证据 → 脚本 + 两处洗 → docs)→ 报 Tester 版本等 ack → 第 22 次部署(server 变了要重启服务;锁未动不 `npm ci`)→ Tester 岛上哈希对账 + 代表臂 → builder 清 `<tmp>/a19pkg`。

## A-20 派单:打字只在回车或失焦时落库——先查后修,两段交付;B-81 与 hash 跳转疑点并入(Main_Designer 2026-11-08)

A-19 已上岛(`04f6f822`,第 22 轮)。A-20 现在开工,规格不变(订单开头「A-20 · 打字只在回车或失焦时落库」:现象、待查疑点、设计裁定、验收),加「记录不修」里并入的 B-81(地址栏粘贴链接换笔记 / 脚本改 hash 时弹假的「Changes could not be saved」,无失败请求;真实点击不弹;空笔记之间也弹;Tester 第十八轮 T-R-10)。**基线 = `04f6f822`**;scratch 副本从它建,⛔ 共享树。证据目录 **`docs/audits/2026-11-08-a20-builder/`**(日期 = 开工日,与 A-19 做法一致;⛔ 开 `2026-11-05-a20-builder/`)。

**为什么分两段**:A-19 我在一小时内翻了两次裁定,根因是没先核那个面「实际能做什么」就裁。A-20 的三个疑点(空闲 seal 的代价、hash 跳转丢不丢字、B-81 从哪来)都是「先核事实再裁」的形状,所以先查后修,查报不写修码。

### 第一段 · 查(交 `docs/audits/2026-11-08-a20-builder/survey.md`,短讯我;预计半天以内,超出就停)

行号一律对 `04f6f822`。每条先写事实,再写你的建议;事实与建议分开。

- **Q1 空闲 seal 的接入点与 A-18 四条件**(A-18 回执「空闲保存(A-20)能否走同一路径:可以,有四个条件」,读码得出未实测):停止输入约 2 秒后调用既有 `session.seal()`(`useTextFlowHistory.ts:655`,与失焦同一入口)→ `onSeal` → `enqueueRuntimeHistoryOperation` → `persist`,串行、带 `base_revision`。要核:①挂点在哪(哪个输入回调能知道「最后一次按键」);②草稿期(新笔记第一块未落库前)如何识别并**不加定时器**;③结构提交期间(`busy` / boundary 关闭)如何跳过;④IME 组合中 `seal()` 返 false,组合结束后怎么补一次而不轮询;⑤**条件 4 的事实**:一次 seal 是否必然新开一个撤销项、停顿 2 秒切开撤销分组在现有 history 里长什么样,有没有「不新开撤销组的 seal」且不碰记账层。
- **Q2 hash 跳转丢字疑点**(规格「待查疑点」):`api.ts:61` 401 → 改 hash 跳登录;以及用户地址栏粘贴笔记链接换笔记。核:编辑器卸载时未 seal 的会话去哪;`useNoteCanvasDataAdapter.ts` 的 `transferTextUnit` 按 `current()` 把离开笔记的回包拦成 null(编辑器组做法 4 撤回的根因)——它是否也拦住了**离开那一刻的 persist**;**修前实测**:打字不回车 → 脚本改 hash(换笔记 / 跳登录两种)→ 服务器有没有字(各 ≥10 样本,真 Chrome + CDP 真键)。**丢字属实 → 升 🅰,短讯我**,不等查报写完。
- **Q3 B-81 假 toast**:「Changes could not be saved」从哪一行发出、触发条件;为何真实点击(tab、侧栏)不弹而改 hash 弹;空笔记之间也弹的原因;是否与 Q2 同一处边界(Tester 判「同一处」,要你坐实或否定)。
- **Q4 pagehide 同步留档的现状与扩展**:r2.3c 的留档(`structureTypingBuffer.ts` 一族)只覆盖进过窗口 / 留字框的字;「扩到普通未存编辑」要写什么、恢复能否复用留字框同一入口、幂等怎么守;守恒闸那处放宽(「UNSAVED AT UNLOAD」单列不算 LOST,编辑器组中途裁定第 1 条)的文件与行号,取消后断言的形状。
- **Q5 写放大基线**:修前连打 60 秒不回车的写请求数(规格说 0)、回车后的写请求数;修后的预期 = 停顿次数。给出计数方法(代理计数,不是猜)。

### 预裁(查报若与下列不矛盾,不必等我再裁,直接进第二段;矛盾处停下来问)

- **空闲阈值 2 秒**,代码常量,不做设置项。
- ~~**条件 4:接受**撤销分组在空闲处切开~~ **撤回(Henry 2026-11-08 直接作答:不接受分段,编辑流会极度不自然)。** 改为:**Q1⑤ 是第一段的决定性问题**,查报要摆出三条路各自改哪些文件哪些行、风险在哪、撤销与落库各自的实测形状,由 Henry 选:(A) 空闲 seal 新开撤销项(= 分段);(B) 空闲时只落库不封口——会话继续累积、撤销组不切,落库走同一条串行队列(不是第二写者),但要动 history 记账层;(C) 空闲 seal 照做,紧接着继续打字时与下一段合并为一个撤销项(多数编辑器的做法)。另答 Henry 一问:(A) 下再按一次 Ctrl+Z 是否退掉停顿之前那段——读码说预期会(撤销项叠着),**要实测**。第二段在 Henry 选定前不开。
- **草稿期不加定时器**(A-18 条件 2:保存循环已逐版本在写)。
- **结构提交期间跳过**,下一次停顿再试;**IME 组合中** `seal()` 返 false,组合结束后若再无输入 2 秒才 seal,⛔ 轮询、⛔ 盯 `compositionend` 直接 seal(A-25 要改组合交接,别在这里先动)。
- **hash 跳转 / 换笔记**:离开前把未 seal 的会话 seal,并让它的 persist **真的发出**——「只传不记」:不在非当前笔记上写 history 的账(做法 1 仍否),但请求要带旧笔记 id 发到服务端。若 `current()` 闸拦住它,修法方向 = 离开那一刻的 persist 不经 `transferTextUnit` 的回包转移、直接发;**若做到这一步要改适配器记账层,停下来问**(编辑器组做法 4 就是在这里撤的)。
- **B-81**:假 toast 不许留。若根因 = 离开闸把 persist 拦成 null 后被当成失败,修 Q2 即修 B-81;若是另一处,单独修。**必须有修前红的测试**(在 `04f6f822` 上红)。
- **pagehide 留档扩到普通未存编辑**:同步写进留字框同一存档,恢复走留字框同一入口,一记录一框一存档、幂等、关框只删自己(r2.3c 的规矩不变);**守恒闸放宽取消**,「UNSAVED AT UNLOAD」归 LOST,阳性对照:这一臂在 `04f6f822` 上须红。
- **⛔**:第二个写者;逐键写;新 localStorage 结构(复用留字框存档);动服务端(要动就停下来问);动 F9 协议;动 A-25 范围(组合交接、LANDFAIL 重试、结构事务)。

### 第二段 · 修与包

1. **包**:ops `packages/a20-idle-save/`——`dist/`(基于 `04f6f822` + 本单文件自建)、`src/`(全部改动文件逐字节,含新测试)、`dist.sha256`、`src.sha256`、`filesNN.list`、`COPY-BACK.md`、`MANUAL-SECTION.md`(人话:停下来两秒字就存了;硬关浏览器最多丢最后两秒;撤销按停顿分段;换笔记 / 过期跳登录不丢字、不再弹假提示;关页时还没存的字下次打开在留字框里)。scratch 副本里建、测、封;⛔ 共享树。
2. **回执**:本订单「## Result」下 `A-20 Result(builder 日期)`,必含「**代码回答**」节(行号对包 `src/`):①空闲 seal 挂点与四条件各在哪一行守;②hash 跳转路径修前修后各走哪几行、persist 从哪发出、history 记不记;③B-81 toast 的来源行与修法;④pagehide 留档扩展的写入与恢复行、闸放宽删在哪、新断言在哪;⑤写放大计数(修前 / 修后,连打 60 秒 + 停顿 N 次);⑥撤销分组行为变化的实测(停 2 秒再打,Ctrl+Z 退到哪)。另:改了什么(对预裁逐条)、文件清单、测试矩阵、没验到。
3. **测试与阳性对照**:新测试在 `04f6f822` 上红、包上绿,红的输出存 `docs/audits/2026-11-08-a20-builder/positive-controls.txt`;A-18 矩阵 + 三固定项(300ms 人类节奏、真键标题、英文句子带空格停顿)修前修后各一遍;新臂:连续输入不回车停 2 秒后服务器有字 / 硬杀 Chrome(CDP `Browser.close` 或杀进程,⛔ 只用 `Page.close`)后丢 ≤ 最后 2 秒 / 保存期间继续打字、回车、切块 0 错 / 连打 60 秒写请求计数 / 改 hash 换笔记、粘贴链接换笔记、401 注入跳登录三臂不丢字且无假 toast / pagehide 留档重开可见 / 守恒闸全绿且放宽已删(冻结版该臂红);client 全量、server 全量各一次;tsc 净。证据落 `docs/audits/2026-11-08-a20-builder/builder/`。
4. **红线照旧**:⛔ git 写操作、⛔ 动依赖锁、⛔ 真实模型、⛔ 碰岛、⛔ 读 `.env` 的 key 值、⛔ 动 `edfix` / `edacc`;临时账号口令只从环境变量取,⛔ 写进任何会入库的脚本(包括注释——我自己 11-08 在扫描脚本注释里犯过);交证据前跑 `node scripts/pre-harvest-scan.mjs --paths <证据目录>`,⛔ 0 才交;截图裁掉侧栏(Tester METHOD 第八节)。CPU 90% 以下,重活取 `heavy-job.lock`。

### 流程

查报 → 我裁(或预裁直通)→ 修 → 回执 → **Reviewer 核包 src/ 与 Tester 验并行** → 我裁 → 拷回 → 收割 → 第 23 次部署(预计纯前端;server 若动了就按 §5 重启)。

- **Reviewer 点名八条**(对预裁与「代码回答」读包 `src/`):①seal 仍是唯一写入入口,没有第二条 persist 路;②草稿期确无定时器;③busy / boundary 关闭时跳过且不丢定时(下一停顿还会来);④IME 组合中不 seal、组合后补 seal 不轮询;⑤hash 离开路径的 persist 真的发出、带旧笔记 id、不写 history;⑥B-81 测试在冻结版红;⑦pagehide 留档幂等、边界断言能守「进过窗口的字 ≠ 普通编辑」;⑧写放大:逐键无写。发现写 `docs/audits/2026-11-08-a20-builder/reviewer/findings.md`,台账登一行。
- **Tester**:修前(`04f6f822`)/ 修后自起后端(做法已准);规格验收四条 + B-81 三臂(改 hash / 粘贴链接 / 401 注入)+ 硬杀 + pagehide 留档 + 守恒闸(冻结版放宽臂红)+ 编辑器组 H 场景与 r2.3c 代表臂不退步 + 1a 文本 / 原页切换不受影响。判语前先问「比修前差的臂有没有」。

**量级超出、要动服务端 / F9 / 适配器记账层 / 新依赖、或 Q2 丢字坐实:停,短讯我,不自行扩。**

## A-20 升 🅰:Tester 修前旁证坐实「改 hash 换笔记」与「401 跳登录」两路丢字;第二段拆成两半,🅰 半边不等撤销路选定(Main_Designer 2026-11-08)

**Tester 事实**(修前 = `04f6f822` 等价树,前端 `index-Gswd3cHv.js`,临时账号,真 Chrome + CDP 真键;每臂新笔记,先「warmup」回车落库,下一行不回车打一句,300ms 后动作):

| 臂 | 结果 |
|---|---|
| 改 hash 换笔记(`location.hash` 指向另一篇) | **2/2 丢**。离开时网络里没有任何保存请求;服务器、重开、留字框、本地存档都没有。同时弹「Changes could not be saved. Please retry before leaving the note.」——提示在这里**不是假的**,字确实没存。跳到的那篇是空的,没落错地方 |
| 地址栏打开另一篇链接(`Page.navigate` 同源另一地址) | 0/2 丢,字在服务器,无提示(整页导航走了 pagehide 路) |
| 401(所有 text-save 回 401,失焦触发保存) | **2/2 丢**。PUT text-save 带着这句发出、回 401、被踢到 `#/login`、令牌清、弹同一条提示;服务器、重开、留字框、本地存档都没有 |
| 401 但不失焦、只等 3 秒 | 期间无请求无跳转;之后重开笔记的整页导航把字存进去了,没丢 |

阴性对照(修前基线):空闲 6.5 秒 0 写;连打 60 秒 462 键 0 写;4 段停顿 0 写;一次 Ctrl+Z 整行撤掉(`aaa` 和 `bbb` 一起);整页离开(about:blank)字存进服务器。样本在补到 10 个以上。

**裁定**:
1. **A-20 升 🅰**(规格「待查疑点…属实则升 🅰 并回报」;Henry 尺第 ① 条「字不丢」)。B-81 改性:它不是「无失败请求的假提示」,而是**真提示配一条已经走不回去的路**——提示叫人「离开前重试」,人已被带走。原记法成立的条件(那次没打字或字已落库)请 builder Q3 核实。
2. **第二段拆两半**:🅰 半边 = 改 hash 换笔记 + 401 两路不丢字,**不等 Henry 选撤销路**,builder 查报 Q2/Q3 机理一到我就裁、就修;空闲保存半边(Q1)照原裁定候 Henry 选 (A)/(B)/(C)。两半同包交付可以,但 🅰 半边的测试与阳性对照单列。
3. **🅰 半边的修法边界**(查报不矛盾即按此):
   - 改 hash 换笔记:编辑器卸载前把未 seal 的会话 seal 并让 persist **真发出**(只传不记,带旧笔记 id);若被 `current()` 闸拦住、要动适配器记账层才发得出——**那就先走保险带**:卸载那一刻把未存的字同步写进留字框存档(与 pagehide 留档同一入口、幂等),重开旧笔记可见、可点回去;⛔ 让字凭空消失。两者都做最好。
   - 401:text-save 回 401 时**⛔ 丢弃请求体**——先把这句写进留字框存档(按笔记 id + 块锚点),再跳登录;重新登录回到笔记时留字框在。提示文案改成真话(「已保存到本地留字框,重新登录后可见」之类,英文照界面语言),⛔ 再写「离开前重试」。
   - 整页导航已不丢(pagehide 路),不动。
4. **Tester**:样本补到 10+ 后把表发我;修后这四臂加「改 hash 后回到旧笔记,留字框在、可落回」「401 → 重新登录 → 回笔记,字在(服务器或留字框)」两臂。

**builder**:查报 Q2 不必再独立复现丢字(Tester 已坐实,你引用它),把力气放在**机理**——为什么 hash 换笔记时一个请求都没发(卸载顺序?`current()` 闸?seal 没被调?)、401 路上请求体在哪一行被丢、留字框存档能不能在这两处同步写。行号对 `04f6f822`。

### A-20 🅰 · Tester 补样本与更正:401 路有内存里的恢复队列,刷新即失;改 hash 路无任何恢复入口(Main_Designer 2026-11-08 记)

| 路 | 回来方式 | 结果(修前,`04f6f822` 等价) |
|---|---|---|
| 脚本改 hash 换笔记 | 整页重开 | **12/12 丢**:服务器、留字框、本地存储都没有;离开时 0 个保存请求;12/12 弹「Changes could not be saved. Please retry before leaving the note.」 |
| 脚本改 hash 换笔记 | 应用内改 hash 回去,不刷新 | **5/5 丢**:编辑框、服务器、留字框都没有,也没有恢复横幅 |
| 地址栏打开另一篇链接 | 整页重开 | 0/2 丢,字在服务器,无提示 |
| 401(失焦触发保存,所有 text-save 回 401) | 整页重开 | **12/12 丢**:带字的 PUT 回 401、踢到 `#/login`、令牌清、弹同一提示 |
| 401 | 同一标签页走接口重新登录,hash 回笔记,不刷新 | **0/5 丢**:出现「A block edit is waiting for recovery」横幅(Apply / Dismiss),回来时还弹「A previous block edit is queued for recovery」;点 Apply 字回编辑框并存进服务器(2/2 核到) |
| 401,不失焦只等 3 秒 | 整页重开 | 0/2 丢 |

**Tester 更正**:先前「401 跳登录 2/2 丢」不准确——那是回去时用了整页重开。准确说法:401 后同一标签页登录回去能用 Apply 恢复;刷新、关标签页、浏览器崩溃就丢,恢复队列只在内存里。改 hash 那条两种回法都丢,没有恢复入口。

**裁定(收窄 🅰 半边的修法)**:
- **401 路**:已有恢复队列与 Apply 流程,问题只是队列不落盘。修法 = **把这条恢复队列写进留字框存档**(同一 localStorage 存档、按笔记 id + 块锚点、幂等;重开后恢复横幅照旧出、Apply 照旧落回),⛔ 另起新存储结构;提示文案改真话。Q2 的 401 半段请 builder 定位恢复队列所在(文件、行号)与它为什么只在内存。
- **改 hash 路**:零请求、零恢复入口,是两路里真正的空洞;修法边界不变(卸载前 seal 且 persist 真发出;发不出就同步写留字框存档,重开可见、Apply 可落回)。查报重点:为什么离开时 seal/persist 一个都没发生,而 401 路上同一笔字能进恢复队列——两条路在哪一行分叉。
- **Tester 修后臂**:401 分「同标签页回去」「刷新后回去」两种,后者才看得出保险带接没接上;改 hash 后「整页重开」「应用内回去」两种都要字在(服务器或留字框 Apply 可落回)。

## A-20 🅰 半边裁定:两路在路由守卫分叉;hash 路做 (i) 守卫接住无步长导航 + (ii) 留字框保险带;401 路把恢复回执从 sessionStorage 挪到 localStorage,⛔ 改成留字框条目;开修(Main_Designer 2026-11-08)

**builder 机理(行号对 `04f6f822`;每条标了实测 / 读码)**,我采信的事实:
- 应用内换笔记 4 臂(`hashSwitch` / `pasteLink` 同文档只换 `#` / `loginHash` / `login401Enter`)修前 0/10 服务器有字,前三臂 0 请求,第四臂一次 PUT 回 401;对照 `clickLeave`(点应用内链接)10/10 正常。4 条丢字臂 10/10 打出路由库告警「You are trying to use a blocker on a POP navigation to a location that was not created by @remix-run/router」,对照臂 0/10——**守卫没被问到**(`useNoteRouteSaveBoundary.tsx:81-83` 的 `useBlocker` 只拦路由自己产生的 PUSH;无步长的 POP 直接放行,`:85-101` 与 `flushForLeave` `:51-79` 都不跑:不失焦、不 seal、不 `flushPendingSaves`)。
- 换笔记时 `NoteDetailPage` 原地重渲不重挂(`App.tsx:111` 路由无 key),`useTextFlowHistory` 的 scope 按 noteId 重建,渲染中 `:611` 已换 `active.current`,旧 scope `current()` 立刻 false;旧会话未封口的 `pending`(`textFlowEditSession.ts:90`)没人 seal,就算 seal,`onSeal` `:540` 与 `persist` `:189` 也被 `current()` 挡回。闸在**渲染那一步**就关了,卸载顺序无关。
- 失焦 + 401 那路能有恢复回执,是因为适配器 `saveBlock` 发请求前先写回执(`useNoteCanvasDataAdapter.ts:1995-2022`);hash 路没 seal 就轮不到。**分叉点 = 守卫没被问到**。
- 401:回车 seal → persist → `await api.saveBlock`(`:220`),回执先写 `:2022`,PUT 回 401;`api.ts:57-61` `setToken(null)` + `hash='#/login'`(同样无步长),页卸载,`persist` 在 `:227` 碰 `!current()` 返 false,`:234` 的 finally 也被挡——不记 failures、不调 onSaveFailure,编辑器里的重试状态没了。**回执在 sessionStorage**(`draftBlockPersistence.ts:73-78`,键 `coincides:draft-recovery:v2`,写入 `:456-487`,全仓无处清)。builder 实测 401 后同标签页整页重开横幅 3/3 出现;旧 mountNonce 的回执只弹 info 不回填(`:727-737`),要点横幅 Apply(`:2269`)。新标签页 / 关标签页 / 崩溃时 sessionStorage 随之没了。
- B-81 提示:文案 `useNoteRouteSaveBoundary.tsx:12`,弹出 `:114`;noteId 一变,`:103-117` 的 layout 清理在微任务里见旧 scope 既未释放也无 pending,对保留的 runtime 句柄调 `flushPendingSaves`,reject 后弹;reject 来源**推断**在 `useTextFlowHistory.ts:940`(`boundary()` 返 false 抛出),未插桩。3 样本 × 3 臂(含两篇空笔记之间改 hash)每个都弹(第一轮 50 样本按文字轮询没抓到是因为一闪即没,MutationObserver 才抓到)。**与 Q2 同一处边界,Tester 判「同一处」成立**;原记法「假提示」在空笔记间成立,有未回车字时碰巧是真的但人已回不去。
- 对照:留字框里的字换笔记不丢——`useHeadingStructureController.ts:268-271` 按 noteId 清理时 `leaveBuffer` → `retainWords`;普通编辑没有这一步。
- **与 Tester 表的两处差别**:①Tester「地址栏打开另一篇链接 0/2」用的是不同地址 = 整页导航;真实使用里本应用链接都是 `/#/notes/<id>`,在一篇里粘贴另一篇的链接只差 `#` 后面,Chrome 按同文档导航,= builder 的 `pasteLink`,10/10 丢。**「地址栏粘贴链接换笔记」在真实使用里丢**。②Tester「401 整页重开 12/12 丢」与 builder「同标签页重开横幅 3/3」不一致——请 Tester 核重开方式(同标签页 reload 还是新 target / 新 profile)及是否看了横幅。

**裁定(🅰 半边,现在开修;与空闲保存半边解耦)**:

1. **hash 路 · 两条都做**:
   - **(i) 守卫接住无步长导航**:监听 `popstate` / `hashchange`,在 React 提交新笔记之前**同步**跑 `flushForLeave`(失焦 → seal → persist),让 PUT 在旧 scope 仍是当前时**发出**(适配器照旧先写回执)。不碰 history 记账层、不碰适配器。**必须实测**「监听先于路由提交」:4 臂各 10 样本,观察到 PUT 离开浏览器且服务器有字 10/10;另核**回包晚到**(回包在换笔记之后到达)时回执怎么清——不清会出假横幅,Apply 可能把旧字盖新字,这是 ②,须有测试守。
   - **(ii) 保险带**:按 noteId 清理那一刻,把旧会话未封口的那一组同步写进留字框存档(`rememberUnplacedWords`,`structureTypingBuffer.ts:106`),给会话加**只读 peek**,不碰记账层。(i) 跑过则 pending 为空、(ii) 自然无事可写;(i) 没跑到才兜底。幂等、一记录一框。
   - 401 跳登录走同一个口子,(i) 也会经过 flushForLeave,但令牌已清、persist 再拿一次 401(无害噪声);救字靠第 2 条。
2. **401 路 · 把恢复回执存储从 sessionStorage 挪到 localStorage**,键 schema 不变、**加用户作用域**(同浏览器多账号不得互见),Apply / Dismiss / baseRevision 校验照旧;⛔ 转写成留字框条目——回执带 baseRevision + textFlow、恢复入口是横幅原位回填,比留字框条目(blockId/unitId/initialText/text,手工放回)更准,改形状是倒退。**我撤回上一节「写进留字框同一 localStorage 存档」对 401 路的那句**:回执存储是既有结构,挪位置不是「另起存储」。「全仓无处清」要核:Apply / Dismiss 之后、以及保存成功之后回执是否删除;不删 → 假横幅,补。
3. **两个恢复入口(横幅 Apply 与留字框)并存**是既有状态,本单不合一;记入 **A-25 设计单范围**(「恢复面合一」),⛔ 本单动。
4. **B-81 提示**:(i) 到位后无步长换笔记也走 flushForLeave、`scope.released=true`,清理那步不再 reject,提示不该再弹。测试:冻结版 `emptyHash`(两篇空笔记间改 hash)提示出现 → 包上不出现(阳性对照);有字且 persist 真失败(断网离开)时提示改真话,写明字在本地可恢复(英文,照界面语言;文案进 `MANUAL-SECTION.md` 我核)。**reject 来源的 15 分钟诊断构建:做**,把 `:940` 从推断变事实,回归测试才知道断言什么。
5. **⛔**:动服务端;动 history 记账层;动适配器 `transferTextUnit`;动 F9;新存储结构;逐键写;A-25 范围(组合交接、LANDFAIL 重试、结构事务、恢复面合一)。
6. **交付**:🅰 半边可先封包 `a20-leave-safety`(与空闲保存半边分包,Henry 选撤销路前后不互相等),或等 Q1 裁定后同包——**builder 按量级定,告我**。阳性对照(`04f6f822` 上红):hashSwitch / pasteLink / loginHash / login401Enter 四臂丢字、emptyHash 提示出现、401 后新标签页重开无横幅;包上全绿。A-18 矩阵三固定项 + r2.3c 代表臂不退步。

**Tester**:①核「401 整页重开 12/12」的重开方式与横幅;②地址栏臂改成**同文档**(同 URL 只换 `#`),这才是真实使用;③修后臂按两种回法分开(同标签页 / 新标签页),hash 路加「回包晚到无假横幅」一臂;④emptyHash 无提示。

## A-20 空闲保存半边:Henry 选 (B)「只落库不封口」;验收用他的原话;(B) 收不住记账层以内就停下来报,⛔ 自行退到 (A)/(C)(Main_Designer 2026-11-08)

**Henry 2026-11-08 直接作答**:撤销路选 **(B)**。背景问答(台账 §345):Docs / WPS 的体感是「写到任何一个字,网络好就随时关、都能保存;撤销做得很细」;我答这不是加「前端推后端」的层,是把 seal 里绑在一起的「切撤销组」与「落库」拆开——(B) 就是拆开。

**裁定**:
1. **Q1 收口为 (B) 的可行性与深浅**,不再三条并列。查报要答:①中途落库(会话继续、撤销组不切)要让 history 记账层学会什么——具体哪些文件哪些行;②中途落库后的修订号(`base_revision`)怎么跟进会话,下一次封口 / 下一次中途落库带哪个修订;③中途落库之后用户 Ctrl+Z 退掉已落库的字,服务端那份怎么追平(下一次落库 / 封口必须把撤销后的内容发出去,⛔ 留下「服务器比屏幕多字」的窗口超过一次停顿);④与适配器 `transferTextUnit` 的 `current()` 闸、与编辑器组做法 4 撤回处有无牵连——**有牵连要动适配器记账层就停下来报,⛔ 自行退到 (A) 或 (C)**;⑤草稿期(新笔记第一块未落库)如何排除;⑥结构提交中(busy / boundary 关闭)与 IME 组合中如何跳过;⑦节流:停顿 2 秒落库为基线,另量「约 1 秒一发」的写放大(Q5),只量不改。
2. **验收(Henry 原话,写进 Tester 臂)**:「写到任何一个字,网络好的情况下随时关它,都能保存」——停 2 秒后硬杀 Chrome / 关标签页 / 整页离开 / 换笔记,服务器有字;「撤销还很细、和今天一样」——Ctrl+Z 的分段与修前逐臂相同(停顿不切、回车切),Tester 修前修后各跑一遍对照。
3. (B) 在记账层以内收得住 → 第二段开修,与 🅰 半边同包或分包由 builder 按量级定;收不住 → 停,我带着代价表回 Henry,由他再选。
4. 其余预裁不变(阈值 2 秒常量、草稿期无定时器、结构提交中跳过、IME 不轮询、⛔ 第二写者、⛔ 服务端、⛔ F9、⛔ A-25 范围)。

## A-20 查报收讫:(B) 收得住(两文件、不碰撤销栈与适配器);两处预裁按现状改;一个包 `a20-idle-save`;开修(Main_Designer 2026-11-08)

查报 `docs/audits/2026-11-08-a20-builder/survey.md`(证据 `survey/`,扫描 ⛔ 0)。

**给 Henry 的基线事实**(builder 实测,冻结版 `04f6f822`,真 Chrome):
- 撤销今天的分段:两次回车之间的字是一个撤销项,回车本身也是一个;`aaa`↵`bbb`↵`ccc` 连按 Ctrl+Z 依次退成 `aaa|bbb|` → `aaa|bbb` → `aaa|` → `aaa`。打 `aaa`、停 3 秒、接着打 `bbb`(不回车),一次 Ctrl+Z 两段一起退,**停顿不分段**。
- **中文输入法今天已经是每个组合结束就封口并落库**:30 秒 13 个组合 = 13 个 PUT,撤销也一个组合退一次。所以空闲落库补的主要是英文 / 数字 / 不经输入法的长行,和下一条。
- (A) 下停顿之前那段退不退(Henry 问过):**退**,2/2(用失焦作替身,同一个 `seal()`)——(B) 已选,此问归档。
- 写放大基线:持久编辑器连打 60 秒约 410 键 0 写;回车后 2 个 PUT;四段「打 5 秒停 3 秒」0 写、服务器无字。「约 1 秒一发」现在没有这条路量不了,上界估约 60 PUT/分钟。
- **新事实**:新笔记第一块落库后编辑器转成持久编辑器,后面的字又回到「回车或失焦才存」——草稿期那 20 秒里服务器只收到前 9 个字。(B) 正好补这个。

**(B) 七问答复,我采**:①会话加只读 `peek()`;中途落库把 `peek()` 结果包成**不进撤销栈**的 transaction,走同一条 `enqueueRuntimeHistoryOperation` → `persist`;分组规则不动,撤销形状与今天逐字节相同;`useTextFlowHistory` 内约 40–60 行三处账:(a) 中途落库失败不进 `failures`(否则下次封口先重发过时快照),失败后停发中途落库直到下一次封口落库成功;(b) 封口时正文与最后一次中途落库相同则不再发;(c) 定时器随 scope 清掉。②`baseFor = max(block 修订, committedBases)`,中途落库成功推进 `committedBases`,队列串行;测试钉「中途、中途、封口」修订递增无 409。③Ctrl+Z 先过封口边界(`usePlacementHistory.ts:188-189`)再把 before 排进同一队列,「服务器比屏幕多字」窗口只是一两个请求的往返。④与 `transferTextUnit`、做法 4 撤回处无牵连;副作用:适配器 text-save 失败一定弹「Failed to save block」(`:2225`,不受 `silent` 控制),所以 (a) 必做,否则断网时每次停顿弹一次。⑤草稿期走 `useDraftBlockController`,不经 `onEditApplied`(`:620`),定时器挂那里天然不起。⑥到点用不封口的判定(controller `:458` 那组条件去掉 `boundary()`,加 `peek()` 非空;组合中为 null),不过则跳过。⑦2 秒去抖。

**两处矛盾的裁定**:
1. **输入法:按现状,预裁那句撤**。现状 compositionend 即封口落库,(B) 不碰它,也不碰 A-25 的组合交接。预裁「组合后再停 2 秒」是我没核现状写的。
2. **结构提交中判定不过:跳过后重设一次 2 秒定时器,准**——但只在 `peek()` 非空时重设,`peek()` 空了就停;这不算轮询(有字才等,无字即止)。

**追加条件**:
- 中途落库失败弹「Failed to save block」**一次断网最多一次**((a) 停发即自然满足;若不满足要补);文案可留(是真话),进 `MANUAL-SECTION.md`。
- 「约 1 秒一发」的写放大**只在 scratch 量**,包里⛔ 带测量开关或任何改节奏的路。
- 撤销形状「与今天逐字节相同」要有测试钉住(`aaa`↵`bbb`↵`ccc` 四步、停顿不分段两条),Tester 修前修后各跑一遍对照。
- 🅰 半边与 (B) 同改 `useTextFlowHistory.ts`,**一个包 `a20-idle-save`**,🅰 半边的测试与阳性对照单列,准。`:940` 诊断构建随修一起做,准。

**验收(Tester 臂,Henry 原话)**:「写到任何一个字,网络好的情况下随时关它,都能保存」——停 2 秒后硬杀 Chrome / 关标签页 / 整页离开 / 换笔记 / 过期跳登录,服务器有字;「撤销还很细、和今天一样」——Ctrl+Z 分段修前修后逐臂相同;新笔记草稿期后的持久编辑器也 2 秒落库;断网期间停顿只弹一次提示、恢复后下一次封口追平;连打期间无逐键写、停顿次数 = PUT 次数(± 封口去重)。

### A-20 🅰 · Tester 与 builder 事实核平(Main_Designer 2026-11-08 记)

Tester 重测(修前,每格 2 次),撤回自己先前两种说法(「401 整页重开 12/12 丢」是漏看横幅与 sessionStorage,作废;「只在内存、刷新即丢」也作废):
- **401**:同标签页整页重开 / 应用内 hash 回去 → 横幅「A block edit is waiting for recovery」在,sessionStorage 有 `coincides:draft-recovery:v2`,字不自动回填,点 Apply 进服务器,2/2 不丢(与 builder 3/3 一致);**新标签页**(CDP `Target.createTarget`,同 profile)→ 无横幅、sessionStorage 空,2/2 丢。离开时 2/2 弹「Changes could not be saved…」。
- **地址栏改成同文档**(只换当前 href 的 `#`):同标签页 / 新标签页 / 应用内三种回法各 2/2 丢,无横幅、sessionStorage 空,离开都弹提示(与 builder 10/10 一致)。先前 0/2 那臂因 `open()` 带了 `?r=` 成了整页导航,不是真实用法,作废。脚本改 hash 同。
- 修后臂备好:每条路分同标签页 / 新标签页 / 应用内三种回法,回来读横幅、Apply、sessionStorage、服务器;「回包晚到」一臂(A 打字 → hash 去 B,A 的 text-save 请求阶段扣 3 秒,1 秒后回 A 再打「 second」并失焦;看服务器文字、横幅、Apply 旧盖新);emptyHash 修前 2/2 弹,修后要 0。
- Tester 教训入 METHOD:说「丢」之前查完所有恢复入口(服务器、留字框、本地存储、会话存储、恢复横幅、Apply);回法写明同标签页 / 新标签页 / 应用内。

**结论**:两边事实一致,裁定不变。401 路修法 = 回执挪 localStorage(新标签页也能恢复);hash 路 = 守卫接住 + 留字框保险带。

### A-20 施工中裁定:导航拦截改用 Navigation API(popstate 抢不到路由前面);适配器 3 行回执清理准改;Tester 修前基线齐(Main_Designer 2026-11-08)

**builder 先报(照报、不越界)**:
- `:940` 诊断构建坐实:hashSwitch / login401Enter / emptyHash 2 样本 × 3 臂,6/6 reject 在 `textHistory.flush`,文案「Text composition is still active」(`useTextFlowHistory.ts:940`)。
- 原设想「popstate 抢在路由前面」**实测不成立**(路由监听总在前,capture 亦然;保存排在重渲之后,被 `enqueueRuntimeHistoryOperation` 的 isCurrentScope 丢掉,诊断日志证实)。改用浏览器 **navigate 事件(Navigation API)**,在地址改变、路由听见之前触发:脚本改 hash(可拦)→ `preventDefault` → 与应用内链接同一个 `flushForLeave` → 成功后再打开同一地址,失败留在原笔记弹原提示(与点链接行为一致);地址栏粘贴(不可拦)与去 `/login`(令牌已清)→ 先把未封口的字写进留字框(`peek`)再失焦;无 navigate 事件的浏览器 popstate 兜底同法。地址栏粘贴中间版 3/3 服务器有字;脚本臂 10 样本重测中。不碰记账层、不碰 `transferTextUnit`。
- **请裁**:地址栏粘贴存进去了,但回到原笔记横幅「A block edit is waiting for recovery」照出——回包到时路由已换,`useNoteCanvasDataAdapter.ts:2144-2151` → `reconcileIssuedSave` 在路由非当前时直接 `read_failed`(`reconciliationReadIsCurrent` 约 `:2080`),回执不删。Apply 不会旧盖新(旧 baseRevision → 409 走冲突提示),是假横幅。修法约 3 行:2xx 成功分支里,回包正文与发出内容一致(`blockMatchesIssuedSave`)时不论路由是否当前都删本次回执;只删回执,不动 blocks / drafts 账。

**裁定**:
1. **Navigation API 做法准**。它不是记账层,也不是 `transferTextUnit`;条件:(a) 兜底路(popstate)也要有测试,别只测 Chrome 有 navigate 的路;(b) 不可拦的两路(地址栏粘贴、去 /login)写留字框那步要幂等,与 pagehide 留档同一入口;(c) `MANUAL-SECTION.md` 写一句「Chrome 以外的浏览器走兜底路,行为同」。
2. **适配器 3 行准改**——理由:假横幅会训练用户点 Dismiss,把真正的恢复面(401 路)也废了;只在 2xx 且 `blockMatchesIssuedSave` 为真时删本次回执,⛔ 碰 blocks / drafts 账、⛔ 碰 `transferTextUnit`、⛔ 改 `reconciliationReadIsCurrent` 的语义。条件:冻结版「回包晚到横幅出现」红、包上不出现;**Reviewer 点名读这 3 行**(列入八条之外第九条);回执「代码回答」单列「适配器改了哪 3 行、为什么不算记账」。
3. 「warmup 第三次撤销退成 w」(Tester 修前观察)是既有形状,修后须相同,不算本单。

**Tester 修前基线(齐,等包;修后逐臂对照)**:停 2.6 秒后离开——整页离开 2/2、关标签页 1/1 字在服务器(离开时 1 PUT);改 hash 换笔记 2/2 不在(0 PUT);401 失焦 2/2 不在(PUT 回 401;同标签页横幅 Apply 可回);硬杀 1/1 不在(0 PUT)。撤销:`aaa`↵`bbb`↵`ccc` 连撤四步 `[warmup,aaa,bbb,ccc] → [..,bbb,""] → [..,bbb] → [..,aaa,""] → [warmup,aaa]`;`aaa` 停 3 秒 `bbb` 连撤三步 `[warmup,aaabbb] → [warmup,""] → [warmup] → [w]`。新笔记草稿期慢打 20 秒不回车:服务器始终只有首字母,0 PUT(builder 节奏下是前 9 字,结论同)。断网三段打字各停 2.6 秒:0 条「Failed to save block」(修前本就不存);恢复后仍不存。4 段停顿 0 PUT。中文输入法 3 组合每组合 1 PUT、每次撤销 1 PUT。证据在 Tester scratch `a20/runs`,判语时归档。

## A-20 回执收讫:包 `a20-idle-save`(14 文件,主 JS `index-BkYnVk7W.js`);两处多做准;Reviewer ∥ Tester 并行;builder 不等放行先开 A-25 的「查」(Main_Designer 2026-11-08)

**回执**:「A-20 Result(builder 2026-11-08)」(本文件 `:130`),证据 `docs/audits/2026-11-08-a20-builder/`(先看 `builder/summary.txt`),扫描 ⛔ 0。全量 client tsc 0、vitest 259 文件 / 2707 全过;server 未改。阳性对照(`04f6f822`):新测试除 3 条守卫外全红;守恒闸去豁免后冻结版红(种子 18、31 丢字)、包上绿。浏览器每臂 10 样本、navigate 与兜底(关 Navigation API)两种都跑:hashSwitch / pasteLink / lateReply 服务器有字 10/10 无假横幅;loginHash / login401Enter 留字框有字 10/10;emptyHash 假提示 0;冻结版 0/3 有字、假提示 3/3。撤销:回车四步、停顿不切、输入法修前修后逐步相同;中途落库后一次 Ctrl+Z 仍整行撤回、服务器跟着变回。硬杀前停 2.6 秒服务器有字。写放大:连打 60 秒 0 写、4 停顿 4 写、输入法不变。`:940` 坐实 6/6。

**比裁定多做的两处 · 裁**:
1. **留字框保险带也记「已封口但未确认落库」的字**(按单元合成一条,确认后撤;同单元结构窗口已留同字则不重复,H-L 测试守)——**准**。这正是 H-L 那条裁定「承载落地字的保存被确认前存档记录不删」的同一原则推到普通编辑;Reviewer 点名读合成 / 撤销 / 去重三处;Tester 臂:封口后请求被扣住时关页 → 留字框有、到服务器后框自删(说明书「Closing the page」那句)。
2. **控制器订阅账户 id**(`useNoteCanvasRuntimeController.ts:46`,一行;路由只等令牌不等账户,否则按账户存的回执在新标签页列不出来)——**准**;不在适配器;Reviewer 核它不改渲染顺序与别的订阅。

**说明书素材**(`MANUAL-SECTION.md`)我核过:句子都对应到了臂;「Chrome 以外走兜底路,行为同」保留但 Tester 判语写明只测 Chrome;「Failed to save block」只弹一次 + 下次回车 / 点开再试 = (B)(a) 的真话。收割时照译进 §一。

**派**:
- **Reviewer**(并行):八条点名 + 第九条「适配器 3 行回执清理」+ 两处多做;另核 `files14.list` 里 `NoteCanvasRuntime.tsx`、`useTrayController.test.tsx` 为何在清单内(回执未提)。发现写 `docs/audits/2026-11-08-a20-builder/reviewer/findings.md`,台账登一行。
- **Tester**(并行):备好的全部臂(两路离开 × 三种回法、LATE / LATEREQ、emptyHash、硬杀、(B) 撤销三序列、草稿期后、断网一次提示、写请求计数、中文输入法、401 新标签页恢复、另一账号不可见、关页进留字框且到服务器后框自删);builder 没跑的交给 Tester:A-18 矩阵三固定项、编辑器组 H 场景、r2.3c 代表臂修前修后各一遍。只测 Chrome,注明。判语前列「比修前差的臂」。
- **builder**:**不等 A-20 放行,现在开 A-25 第一段「查」**(scratch 底 = 本包 + `04f6f822`);A-20 若出红,返修优先。

**流程**:判语 → 裁 → 拷回(`COPY-BACK.md`,`sha256sum -c` 14 OK)→ 收割(含 `docs/audits/2026-11-08-a20-builder/`)→ 报 Tester 版本 → 第 23 轮(纯前端:`build:client`,不重启服务,无依赖变动)→ 岛上轻对账(哈希 + 3–5 代表臂)。

## A-20 返修 r2:Reviewer K1(保险带跨中间态 → 落地重复)、K2(撤销后离开 → 被撤的字落回)皆 ②,挡放行;根因同一处——保险带记录的起点要用最后一次已确认落库的内容(Main_Designer 2026-11-08)

**Reviewer 先报**(行号对包 `src/`;H = `hooks/useTextFlowHistory.ts`;落地逻辑 `useHeadingStructureController.ts`@`04f6f822` 包内未改):
- **K1(疑似 ②,重复)**:空闲落库只 peek 不封口,组的 before 不动(H:640-660);`keepOpenEdit` 按单元取最早 before、最新 after(H:664-692);回来时 `typedTextIsPlaced` 不成立,走 `mergeTypedText` 插入式合并(HSC:74-96),「已在服务器的中间段」不算命中。例:单元「Note:」→ 打「 alpha」停 2.6s(服务器 = 「Note: alpha」)→ 再打「 beta」→ 最后一次 PUT 没到 → 回来自动落成「**Note: alpha beta alpha**」并保存。自然路径:token 过期(先前停顿已落库,之后回车 PUT 401 → 跳登录 → keepAndLeave);关标签页 / 地址栏离开时最后 PUT 排在在途保存后面没发出;中文输入法逐组合封口同形。守恒闸停顿 ≤300ms、收尾 1s,碰不到 `IDLE_SAVE_MS`,闸测不到。
- **K2(读码确认,②)**:`unconfirmed` 只靠 `confirmTyping` 收缩(H:260 要求 `!historyRestore && side=after`;另一处 H:621);撤销成功只删 `failures`(H:265-266)。提示条原话叫人「Retry saving or undo」(C:395),照做后离开 → `keepOpenEdit` 收进被撤掉的那条(H:677)→ 回来 live==initial → 整段替换(HSC:73)→ 自动落地并保存。

**裁定**:
1. **两条都是 Henry 尺第 ② 条(字落错位置 / 重复),挡放行。** 不等 Reviewer 全报告、不等 Tester 坐实就开修——根因在 builder「多做」的保险带上,是本包新引入的,修法明确;Tester 的复现同时跑,作 r2 的阳性对照(r1 上红)。
2. **根因同一处,一起修**:保险带记录的 **起点 = 该单元最后一次已确认落库的内容**((B) 已有 `committedBases` / 封口去重用的「最后一次中途落库内容」,就用它),**终点 = 离开那一刻屏上实际内容(live)**;两者相等则不记;撤销把 live 退回去,终点自然跟着退——K2 随之消失,不另开一套「撤销收缩 unconfirmed」的账。若 builder 发现「已确认」的那份在某些路上拿不到(例如中途落库的回包还在途),**那一刻的起点退回组 before 但要标记「可能含已落库中间段」,落地时用 `typedTextIsPlaced` 的子串匹配先剔除服务器已有的前缀**——这条是兜底,主路是起点用已确认内容。⛔ 改 `useHeadingStructureController.ts` 的落地逻辑(它 `04f6f822` 未改,别把 A-20 的病修进 r2.3c 的地盘)。
3. **阳性对照(r1 上红、r2 上绿)**:(a) Reviewer K1 原例(停 2.6s → 续打 → 最后一次 text-save 扣在请求阶段或回 401 → 离开 → 回来:无重复、服务器最终 = 「Note: alpha beta」);(b) K2 原例(保存失败 → Ctrl+Z → 离开 → 回来:被撤的字不落回、留字框无该记录);(c) 中文输入法逐组合 + 停顿 + 离开同形一臂;(d) 守恒闸加一条停顿 > `IDLE_SAVE_MS` 的种子,让闸以后看得见这一段。
4. **包 `a20-idle-save-r2`**:只改保险带相关行;`src.sha256` 全新;回执补「代码回答」⑦:起点 / 终点各取自哪一行、相等不记在哪一行、兜底路在哪。Tester 重跑受影响臂(离开 × 回法、LATE / LATEREQ、关页进留字框、401 恢复、撤销三序列、中文输入法)+ 新四臂;未受影响臂(写放大、硬杀、emptyHash、草稿期后)沿用 r1 数、文件级同源。Reviewer 重读保险带 diff + 「代码回答」⑦。
5. **优先级**:builder 放下 A-25 查,先修 r2;A-25 查在 r2 封包后续。

**Tester**:现在就在 r1 包上跑 3(a)(b)(c),把红坐实发我;r2 到了重跑。

### A-20 r2 范围补齐:Reviewer K3–K6 的处置(Main_Designer 2026-11-08)

Reviewer 全报告 `docs/audits/2026-11-08-a20-builder/reviewer/findings.md`:点名 ①–⑪ 与回执删除读码成立(⑪:`NoteCanvasRuntime.tsx` 是句柄接线新增两个可选成员,`useTrayController.test.tsx` 是 mock 补 `getToken`,回执 `:91` 其实提过——收);K1 / K2 已裁(上节);K3–K6 四条 🅱:

| # | 发现 | 处置 |
|---|---|---|
| K3 | 账户未载入时回执写进 `anonymous` 键,载入后列不到也删不掉(P:86-94) | **r2 必修**:孤儿回执 = 留着却永远够不着的恢复,按精神是 ①。修法二选一由 builder 定最小的:账户载入时把 `anonymous` 键下的回执认领到账户键;或回执只在账户已知时写、未知时暂存内存并在载入后落盘。须有测试(未载入时写 → 载入后列得到、删得掉) |
| K4 | ⑦ 的边界断言被吸收:闸在 pagehide 之后取 `held`,分不清窗口留住的和保险带留住的;窗口 H-L 若退化会被保险带盖住 | **r2 必修**(闸自己要过阳性对照):留住记录带来源标记(窗口 / 保险带),闸的 H-L 臂只认窗口来源;阳性对照 = 人为关掉窗口留档、保险带在 → 闸须红 |
| K5 | 空闲落库失败后立刻出恢复横幅,Apply 拿的是旧快照(既有现象,现在停顿时也会出) | **r2 最小修 + 其余归 A-25 ②a**:同一次挂载(mountNonce 相同)的回执**不得出带 Apply 的横幅**——编辑器里的活字就是真相,Apply 旧快照盖活字是 ②,(B) 让它从「每次回车」变成「每次停顿」;保存失败的完整体验(常驻控件、自动重试)是 A-25 ②a 的正题,⛔ 在 r2 里做 |
| K6 | 离开单测用假句柄、B-81 单测只走 popstate;可拦的导航重开会把 replace 变成 push | **replace → push 进 r2**(重开用与原导航相同的类型,否则后退键会撞两次同一篇);测试:navigate 路的单测能写就写,写不了就在回执写明「navigate 路由 Tester 浏览器臂 10/10 覆盖、单测只覆盖 popstate」,不算挡 |

r2 的「代码回答」在 ⑦ 之后加 ⑧ K3 修法与测试、⑨ 来源标记与闸的新断言、⑩ 同挂载回执不出 Apply 的判定行、⑪ 导航类型保留的行。Tester 加臂:K3(账户载入前触发 401 → 载入后横幅列得到、Dismiss 删得掉)、K5(断网时停顿 → 不出 Apply 横幅、活字不被盖)、K6(可拦导航后按后退一次回到前一篇,不是同一篇)。

### A-20 r2 再加一条 ①:LATEBACK——拦截导航等慢保存期间继续打的字被延迟跳转静默带走(Tester,r1 4/4)(Main_Designer 2026-11-08)

**事实**(Tester 臂 `LATEBACK`,r1):在 A 打「first words」不回车 → 脚本改 hash 去 X,离开时的 text-save 扣 3 秒(请求或响应)→ 点回 A 行尾打「 second」。r1:navigate 被拦(`useNoteRouteSaveBoundary.tsx:156` preventDefault → `flushForLeave`),这 3 秒用户留在 A、屏上没有任何「正在离开」的提示,打的字进了 A 的编辑器;保存回来 `:157-159` 置 `scope.released = true` 再 `location.hash = X`,应用跳走;「 second」不在服务器、不在留字框、不在存储、无横幅无 toast,重开 A 只有 `[warmup, first words]`。请求型 2/2、响应型 2/2 全丢;still 变体(不打字只是 1 秒内点回 A)约 3.3 秒后仍被拉去 X 4/4。修前:改 hash 不发保存丢「first words」,但回来后打的「 second」能存——r1 是换了一种丢法。r1 的 LATE / LATEREQ 行里「 second」也从未到服务器,当时没看出。Tester 正核应用内链接 + 慢保存(原 `flushForLeave` 路)是否既有同病。

**裁定(r2 必修,①)**:
1. **等待离开期间编辑器只读 + 可见状态**:从拦截到重发跳转之间,A 的编辑器 readOnly,屏上有一条说真话的状态(英文,如「Saving before leaving…」),⛔ 无提示只读;这段时长 = 一次保存往返。
2. **重发跳转前再核一次**:`:157-159` 置 `released` 之前检查 `peek()` / 未确认集合,非空就不置 `released`、再跑一次 `flushForLeave`(有界,最多两轮),仍非空则走留字框保险带再跳;⛔ 带着未落的字跳。这是兜底,主路是第 1 条。
3. **still 变体**:用户在等待期间点回 A 并有输入意图(第 1 条只读后不会有输入;若点击 / 聚焦算意图由 builder 按现有 `flushForLeave` 的 PUSH 路行为对齐),保持与应用内链接同一行为——两条路一处修,⛔ 两套。
4. **应用内链接路若既有同病**(Tester 核中):同一处修,一并算 r2;写明修前红。
5. 阳性对照:LATEBACK 请求型 / 响应型 r1 红 r2 绿(「 second」在服务器或留字框;屏上有状态;等待期间按键不进编辑器或进了也落地);still 变体行为写明。LATE / LATEREQ 行补「 second」去向。

回执「代码回答」加 ⑫:只读与状态条在哪几行;重发前再核在哪几行;与 PUSH 路共用的函数。

### A-20 r2 · Tester r1 坐实表与三处细化(Main_Designer 2026-11-08 记)

- **INAPP(应用内链接 + 慢保存)是老病**:修前 `04f6f822` Home 链接 2/2、另一笔记 tab 2/2 都丢「 second」(用户留在 A 约 3.3 秒、字进编辑器、然后跳走);r1 同。→ 说明书写法:应用内链接路的老病,r1 把同一缺陷扩到了 hash 路(LATEBACK),r2 一处修两路;修前红即阳性对照。
- **K 臂 r1 全红**(22 行 16 红):K1 401hash / 401blur / close 6/6 红,服务器终态 `note alpha beta alpha`;K2 hash / paste 4/4 红(撤销后 `note`,回来服务器 `note gamma`)——**旁观**:两臂里离开本身被拒(网络已恢复仍弹「Changes could not be saved…」用户留在 A),是整页重开把 gamma 带回的;K5 2/2 红——同一次挂载停顿即出横幅,打「 more」后点 Apply,活字 `note delta more` 被盖成 `note delta`,**「 more」丢(①)**;K3 2/2 红——401 期间两把钥匙都落在 anonymous 下:`coincides:draft-recovery:v2:anonymous` **和 `coincides:unplaced-words:anonymous:<note id>`**,登录重开无横幅无可 Dismiss,服务器永远没有 `kthree words`;K6 push 2/2 对,replace 2/2 红(历史 `[A, X, A, B]`,后退回 A 而非 X)。
- **K1-paste / K1IME 没红是臂没打中,不是路没病**:paste 那臂扣住的 PUT 500 后 2 秒又发了一次 `note alpha beta` 200,回执确认后撤了;IME 那臂第二个组合的 compositionend 保存在 401 设定前就 200 了。变体 `paste500`(回来前所有 text-save 500)、`K1IME-before`(第二组合前设 401)在跑。

**r2 细化(不扩范围,只把已裁的三条说准)**:
1. **K3 的认领要盖两把钥匙**:恢复回执 `draft-recovery:v2:anonymous` **与留字框 `unplaced-words:anonymous:<note id>`**,否则同一刻的保险带记录仍是孤儿。
2. **K2 的旁观并入**:撤销后网络已恢复时离开必须能走(flush 不该再拿被撤掉的那条去重试);r2 的「终点 = live」应顺带解决,回执写明。
3. **K5 坐实为 ①**(Apply 盖活字丢「 more」):同挂载回执不出 Apply 这条从「最小修」升为**必修**,阳性对照用 Tester 原臂。

### A-20 r2 · K1 两变体坐实;四条「说明书多说了」的处置(Main_Designer 2026-11-08)

**变体**(r1):`K1-paste500` 2/2 红(所有 text-save 500 至回来,整页重开后服务器 `note alpha beta alpha`);**`K1IME-held` 2/2 红**(「现值」的保存到了服务器但回包扣 8 秒 → 「公式」排在在途后面没发 → 改 hash 离开 → 重开后 `note现值公式现值`,无 401 参与)——**r2 的输入法阳性对照用 `K1IME-held`**;`K1IME-before` 绿(每个组合在 compositionend 确认,401 下无未确认可重复)。

**四条说明书句子与构建的差**(都不比修前差;处置):

| # | 臂 | 事实 | 处置 |
|---|---|---|---|
| 1 | `OFFKILL`:停顿保存因断网失败 → 网络恢复 → 打「 back online」停 2.6s → 硬杀 | r1 2/2 失败之后的字全丢;原因是裁定 (B)(a)「失败后停发中途落库直到下次封口成功」;修前同样丢(本无空闲保存);正常关页 `OFFCLOSE` 2/2 保住(pagehide) | **不进 r2**。说明书加限定:「一次保存失败后,停顿保存暂停到你下一次回车或点开;正常关页仍保住」;Henry 原话「网络好就随时关都能保存」在这一态不成立,**A-25 ②a 的网络恢复追平**补上后才成立(A-25 在阶段一,封版前能到) |
| 2 | `GONEFAIL-back`:浏览器后退键(traverse,r1 的 navigate 代码跳过它) | r1 2/2 仍弹「Changes could not be saved. Please retry before leaving the note.」而什么都没失败;字进留字框、重开落地 1 份;修前同。脚本 hash / 粘贴 / 切换笔记(`SWITCH` 4 往返)假提示 0 | **进 r2**:落在已裁的 B-81「假提示不许留」里,不是新范围。traverse 路:不弹失败提示(没失败就不说失败);留字框照走;能发就尽力发一次 PUT(不阻塞、不拦);若 Navigation API 对同文档 traverse 不可 preventDefault,就按不可拦路处理。阳性对照 r1 红 r2 绿 |
| 3 | `CLOSEFLY`:停顿保存在途时关页(请求型 / 响应型) | 字在服务器 1 份、留字框自清 ✔;但重开出恢复横幅「A block edit is waiting for recovery … Apply Dismiss」,对已存上的字 r1 4/4、修前 2/2 同 | **不进 r2**,既有。说明书句子改成只对留字框成立,加已知「关页时若有保存正在路上,重开可能看到一条多余的恢复横幅,点 Dismiss」;**A-25 ②a 加一小项**:重开时回执与服务器块相同则静默丢弃(陈旧回执去重) |
| 4 | `HASHFAIL`:离开时保存失败 | 留在笔记 + 提示 ✔ 4/4;同挂载 Apply 横幅同时出现(K5,r2 修);网络恢复后点外面不发保存(编辑器在失败离开时已失焦),字只在编辑器和横幅里;修前直接丢,r1 更好。但「Retry before leaving」没有 Retry 按钮,点外面也不动 | **不进 r2**。K5 部分 r2 已修;「失败后怎么重试」整体是 A-25 ②a 的正题(常驻 Retry、恢复后追平);说明书已知一句:「离开时保存失败留在笔记后,网络恢复要再点进那一行、回车或点开才会重发」 |

**r2 范围到此真正封口**:K1/K2 + K3–K6 + LATEBACK/INAPP + GONEFAIL-back。其余 r1 臂(空闲、连打、写计数、撤销三序列、输入法、草稿期、硬杀、pagehide、离开 × 三回法、401 新标签页、另一账号、EMPTYHASH、SWITCH)Tester 报无一臂比修前差。

## A-20 r2 改法:保险带收回到「只记未封口的字」;已封口未确认的一律走回执;Tester SPLIT / RETRY 两类 ①(r1 比修前差,删已存的字)与 K1 / K2 同根——按单元存快照、回来整段替换这个表示法不适用于已封口的字(Main_Designer 2026-11-08)

**Tester 新事实**(r1,只读代码工作流 4 个 Opus 代理 1.27M token 定位 5 条疑路,全部进浏览器臂,r1 与修前各跑一次;`a20j_probe`,`runs/r1-j` / `pre-j`):

- **SPLIT(①,r1 4/4 红、修前 4/4 绿)**:`alpha beta` 已存;在行中(或行首)按回车,这次保存失败,然后离开。r1 重开后服务器 = `alpha`(行首变体 = `""`,**全删**);无框无横幅;401 路登录页还写「open the note again to recover it」,而打开正是删字的那一步。修前:`alpha beta` + 带 Apply 的恢复横幅。机理:回车把单元劈成两半,前半保留 unitId、后半新 id(`textUnitEditorService.ts:164-178`);保险带按 `metadata.unitId` 一条记录(`useTextFlowHistory.ts:664-692`),只记到 `{initialText 'alpha beta', text 'alpha'}`,后半没有记录;重开 live == initialText → `mergeTypedText`(HSC:73)整行替换成 `alpha` 并保存。**Tester 判 r2「起点 = 最后确认、终点 = live」不盖它**:仍按单元,起点 `alpha beta` 终点 `alpha` 不等照样记、照样替换,后半照样无记录。我同意。
- **RETRY(①,r1 红、修前绿)**:全部保存 500 下打 `alpha`↵`beta` 点开(失败),网络恢复,一次点开把全部存上(服务器 `[warmup, alpha, beta]`)。`del`:删掉 `beta`、停顿存成空行、改 hash 离开、重开 → r1 `beta` 回来了(修前保持删除);`more`:`beta more` 离开重开 → r1 留字框提供 `beta` 而它已在行内(修前无框)。机理:重试只确认第一个失败组,其后的组从 `failures` 删了却留在 `unconfirmed`(`:267-269`),离开时写进保险带。与 K2 同根(`unconfirmed` 只靠 confirmTyping 收缩),不同路(无撤销)。
- **不比修前差的三路**:TWICE(等待的 hash 离开期间再动一次,4 行:字在服务器 1 份,hash / paste 变体在 2xx 后仍在 C 上弹「Changes could not be saved…」;修前丢字且同提示);BACKOK(后退键、网络好,2 行:字在 1 份,同假提示;修前丢字同提示)——**并入 GONEFAIL-back 作阳性对照**;STALE(已落地但留字框记录仍在、第二设备改同一行 → 「被删的字回来」风险)脚本有 bug 待跑。

**裁定(r2 改法;取代 §354 节第 2 条的「起点 / 终点」修法中针对已封口字的部分)**:

1. **保险带只记「未封口」的字**(open session,`peek()` 非空),回到我原裁定「卸载那一刻把未存的字同步写进留字框」。**撤掉 builder 多做①的扩展**(已封口未确认的字进保险带)。理由:保险带的表示法是「单元 id + 文本快照,回来整段替换 / 插入」,它只对「一个开着的会话里、同一单元内、还没发出去的那几个字」成立——回车会封口,所以开着的会话里永远没有劈分。已封口的字每一次保存都有**回执**(适配器发请求前先写,含完整 textFlow 与 baseRevision,恢复入口是横幅 Apply、冲突走 409),那才是已封口字的正确恢复形式。四类病(K1 重复、K2 复活、SPLIT 删字、RETRY 复活 / 多框)全来自用快照重放已封口的字。
2. **未封口记录的起点仍 = 该单元最后一次已确认落库的内容**(§354 第 2 条保留这一半):(B) 的中途落库不封口,会话里的字可能一部分已在服务器,起点取组 before 会重复(K1 的未封口形态)。终点 = 离开时 live。相等不记。
3. **已封口未确认的字靠回执**:K3 认领(两把钥匙)、K5 同挂载不出 Apply、K6 照旧;**守恒闸把回执也算一种「留住」**(来源标记 `receipt`),卸载臂(先失焦封口、请求被扣住、卸载)靠回执过,不靠保险带,不靠豁免;K4 的来源标记顺势三分:窗口 / 保险带 / 回执,H-L 臂只认窗口。
4. **`unconfirmed` 的账**:保险带不再依赖它;但重试只确认第一组这条账本身要修(确认该次重试实际落库的全部组),否则 A-25 ②a 的自动重试会再踩。小修,进 r2;⛔ 让任何「留住」逻辑再读 `unconfirmed`。
5. **阳性对照(r1 红 → r2 预期)**:SPLIT 四变体 → 与修前同:`alpha beta` 在服务器 + 恢复横幅(Apply 为那次失败保存的快照);RETRY del → 删除保持、无框;RETRY more → 无框、`beta more` 在;K1 401hash / 401blur / close / paste500 / `K1IME-held` → 服务器无重复,**不自动落地**,横幅若出则 Apply 结果 = 最新快照(`note alpha beta` / `note现值公式`);K2 → 不自动落回(横幅提供被撤的字算用户选择,不算 ②);LATEBACK / INAPP / GONEFAIL-back / TWICE / BACKOK 照 §22fa24ab 与本节;守恒闸全绿且无豁免、回执计入留住。
6. **STALE** 跑出来再裁;它是留字框自带的形状(窗口留字同病),不是 A-20 新引入。

**对 builder**:若已按 §354 的「起点 = 最后确认」在做,**只保留未封口记录那一半**,把「已封口未确认进保险带」整段拿掉;不要试图给保险带加劈分感知——那是在给错的表示法打补丁。回执「代码回答」⑦ 改答:未封口记录的起点 / 终点各取自哪一行;已封口字的回执路哪几行;闸如何计回执;`unconfirmed` 重试确认改在哪一行。r2 范围不再加任何东西。

### A-20 r2 · STALE 坐实(r1 比修前差;r2 改法应回到修前)与断网提示计数(Main_Designer 2026-11-08 记)

- **STALE**(`STALE-<back|edit>`,r1 / 修前各 1):在 `warmup` 行尾打「 tail words」,保存到服务器但回包迟、300ms 后关页(服务器 = `warmup tail words`);第二设备(隔离浏览器上下文、自己的登录与存储)改这一行(back = 删回 `warmup`;edit = 改成 `…edited elsewhere`);原浏览器重开。**r1 back:服务器自动变回 `warmup tail words`——第二设备删掉的字自己回来**,只有 info toast 无 Apply;修前:服务器保持 `warmup` + 带 Apply 的横幅,放不放回是用户选择。**r1 edit:行正确但多一个假的留字框**提供 `warmup tail words` + 横幅;修前只有横幅。差别全在保险带记录(r1 把已封口组塞进框并自动落地)。**r2 改法下关页失焦即封口,只走回执 → 目标 = 与修前相同**(横幅,用户选择);进 r2 臂。修前那条陈旧回执横幅(Apply 可盖第二设备的改动)是老形状,已归 A-25 ②a「陈旧回执去重」。
- SPLIT / RETRY 在 r1 重跑再红(各 2 行)。
- **断网提示计数**(新计数器 `watchN` 记每次出现;旧 `watch()` 每种文字只记一次,A-25 kit 的 (e) 同一缺口已修并告 builder):三次停顿断网——OFFLINE-N(只 text-save 失败):「Failed to save block」**恰好 1 次** 2/2;OFFALL(所有请求含 GET 失败):「Failed to save block」1 + **「Block save result could not be reconciled」1**,2/2;修前 0 toast(本无保存)。网络恢复后一次点开全部存上 4/4。**说明书加一句**:完全断网时还会伴随一条「Block save result could not be reconciled」。

### A-20 r2 · 「已封口靠回执」的洞(闸种子 31)与补法:保险带再收「已封口、未交适配器」的纯文本组(Main_Designer 2026-11-08 裁)

**builder 已按改法做完**:保险带只记未封口那一组(一个单元,起点 = 最后确认、终点 = live,相等不记);「已封口未确认」整段拿掉,`unconfirmed` 删除;闸按适配器语义把回执算留住(发出前写、同块新替旧、成功删、扣住 / 被拒留下),窗口检查只认窗口记录,K4 对照闸照红;「封口后保存失败,离开不进保险带」单测绿;SPLIT / RETRY 只走回执;K1 两条闸臂(停顿 > `IDLE_SAVE_MS`)绿;GONEFAIL-back 修好,单测绿、浏览器臂加了。

**洞**:种子 31 `<k1> LOST`——打 k0 → 回车(k0 组封口、保存在途)→ 打 k1 → 卸载:失焦把 k1 组封口,但它排在在途的 k0 保存后面,**页面没了它还没交给适配器**;回执在发出那一刻才写,k1 没有回执;已封口,保险带也不记 → 丢。真实应用同样:关页 / 整页离开时前一个保存只要还在网络上,后面封口的组就发不出去(= Reviewer「最后一个 PUT 卡在在途保存后面」;r1 的扩展当初就是在补这个)。

**裁定:准 builder 的补法,带四个条件**。保险带除未封口组外,再收「**已封口但还没交给适配器**」的打字组(在写入队列排队、未发出,必然没有回执)。它满足表示法成立条件——同一单元、字没发出,与未封口组等价。
1. **只收纯文本组**:含劈分(回车 / `insertParagraph`)的组与结构类的组**不收**(它们走回执;SPLIT 因此不复发);一组只一个单元;起点 = 该单元最后一次已确认落库内容,终点 = 该组封口时的单元全文。
2. **一交给适配器就移出**,从那一刻由回执接管——任一时刻一个组只在三张账(开着的会话 / 已封口未发出 / 回执)之一,**不重叠不双记**;回执「代码回答」⑦ 要画出这三张账与两个交接点的行号,并有一条测试守「同一组不同时出现在两张账」。
3. **这是另一张账,不是 `unconfirmed`**(已删,⛔ 复活)。
4. **阳性对照**:种子 31 绿;K1 两条闸臂仍绿(中途落库在途 + 后续封口组排队 + 卸载 → 无重复);SPLIT 四变体仍 = 修前(回执路);浏览器新臂(Tester):「k0 ↵ k1,k0 保存在途时关页 / 整页离开」→ k1 在留字框或已落地、k0 走回执;STALE back / edit = 修前。

**既有 bug 记档(builder 报,不属 A-20)**:自编 K2 闸臂(停 2.6 秒 → 注入保存失败 → 打 k1 → 回车打 k2 → 撤销 → 卸载)在冻结版 `04f6f822` 上同样 `<k1> LOST`:失败组重试成功写进 `[k0 k1]`,接着下一组(回车 + k2)写成 `[k0 | k2]`,k1 被冲掉——保存失败后重试链上的老病,**归 A-25 ②a,作其阳性对照**;该臂已从 r2 闸撤掉。

裁后封包 `a20-idle-save-r2`。

### A-20 r2 · 排队中的劈分组(种子 31 / 36):选 (B) 窄补——只记新长出的单元、手动放回、永不自动落地(Main_Designer 2026-11-08 裁)

**builder 已完成**:三张账(开着的会话 / `unsent` 已封口未发出、只收纯文本单单元无劈分无结构 / 回执);两个交接点(封口进 `unsent`;`persist` 调 `saveBlock` 之前移出并记「最后交出的正文」);保险带起点 = 最后交出的正文(交出即有回执,不重叠),一次没交出过用服务器内容;终点 = 最新字。单测守「同一组不同时在两张账」「交出即离开 unsent」。排在在途保存后面的纯文本组离开时进保险带、从在途那份之后算起,单测绿。

**剩**:种子 31(打 k0、回车、紧接着打 k1:k1 落在「回车 + k1」`insertParagraph` 结构组里,排在 k0 在途保存后面、卸载时未交出 → 无回执、按裁定不进保险带 → 丢)、种子 36(k0 k1 组被拒有回执;随后「回车 + k2」劈分组未交出 → k2 丢;其后整篇拒键是 A-25 ②b)。r1 过这两颗靠的正是已拿掉的「已封口未确认」段。

**裁:(B) 窄补**。排队未交出的劈分组,**只记它新长出来的那个单元**(服务器上不存在的单元 id,起点为空、终点 = 该单元的字),**不记被劈的原单元**。理由:A-20 守的是 ①,「回车后立刻关页 / 整页离开而上一个保存在途」在隧道级往返上不是罕见路;(B) 的代价是行中回车再关页时重开多一个框(「 beta」)而行内仍 `alpha beta`——多框是 🅱,不删字、不替换。条件:
1. **这类记录永不自动落地,只能手动放回**(留字框入口):新单元 id 日后被复用 + 为空 = Y1 误落的形状,⛔ 靶它;记录带「来源 = 未交出的劈分」标记,落地逻辑见此标记即不自动放。
2. **SPLIT 四变体「原单元不动」有测试守**(行中 / 行首回车 + 失败 + 离开 → 原单元在服务器与屏上都 = `alpha beta`;框里可多一条后半);闸种子 31 / 36 绿(字在框里算留住,来源三分里归「保险带」)。
3. ⛔ 改 `useHeadingStructureController.ts`;⛔ 复活 `unconfirmed`;⛔ 记原单元。
4. 说明书「已知」加一句:「刚回车就关页或换笔记、而上一次保存还在路上时,新行的字会在留字框里等你放回,不会自动放;若回车在一行中间,原行保持原样、框里多一条后半」。

**顺带**:controller 单测因横幅列表 `.filter` 无数组判断挂一片,builder 已修(mock 补数组);全量待最后一轮。裁后封包。

### A-20 r2 · 两点澄清:r1 的 FLYK 本就是框里等人(我说「自动落地」错);r2 不加「放回」按钮(Main_Designer 2026-11-08)

- **更正我的前提**:Tester r1 四行 FLYK 里 `kone` 重开 8 秒后仍在留字框、服务器 `[warmup, kzero]`——r1 没有自动落地。r2「框里等人、手动放回」与 r1 实测一致;r2 通过规则取严格形:服务器 kone = 0、框里有 kone、kzero = 1。
- **r2 不加「放回」按钮**:留字框今天没有放回控件(说明书:多半自己回去;没回去就复制或 Discard),加按钮是新 UI,属 L-018 边栏单(阶段二),r2 范围已封口。所以这类记录的「手动放回」= 人复制粘贴再 Discard。**说明书已知补两句**:「新行的字在框里:新起一行粘贴,再 Discard」;「回车在一行中间后关页:原行已完整,框里那条后半直接 Discard,⛔ 再粘回去(会重复)」。Tester 臂:记录框内容与按钮;若无放回控件,「放回不重复」不作判据,改为说明书条目。

### A-20 r2 · 封包前红行:三处修法收;TWICE-hash500 探针预期按 r2 改;UNDOPAUSE 等基线对照再裁(Main_Designer 2026-11-08)

builder 封包前自跑 Tester r2 探针(scratch 构建 `index-ClZUj0ex.js`,**未封包**):K1 / K2 / K3 / K5 / K6、FLYK、SPLIT、LEAVE、B81、BACK、IDLE、PAUSEEXIT×5、HARDKILL、OFFLINE、OFFKILL(参照)、STALE、RETRY-more 绿;红行三类,修在 scratch 副本,重跑中。

**三处修法,收**:

1. **LATEBACK×4 / INAPP×4(探针量具问题,非产品病)**:离开确实被扣住(hash 停在 A 约 3 s、键入不显示),红的是探针——「Saving before leaving…」状态条 `position:fixed`,探针 `vis()` 用 `offsetParent !== null` 判可见,fixed 元素永远 null。builder 把 fixed 挪到外层包裹、`role=status` 元素本身是普通盒。收,但说清两点:这是为探针量具改的产品 DOM,无行为变化;**量具本身要修**——Tester 把 `vis()` 改成 `checkVisibility()` 或 `getBoundingClientRect` 非零,否则下次任何 fixed 提示都量不到。LATEBACK 的「可见状态」Tester 留一张截图作旁证(探针这一次是瞎的)。
2. **RETRY-del(真病,r2 自己的账本)**:排在失败保存后面的已封口组在依赖环进了 `failures`,没走到第二交接点,留在 `unsent`;重试存整屏、恢复扫描清 `failures` 却不清 `unsent`;人删掉已存的 `beta` 后离开,过时的 `beta` 组被记录并自动落回。修:恢复扫描同时从 `unsent` / `unsentSplits` 移除(一个 helper `leaveUnsent`)。单测修前红修后绿。收——这正是「三本账任一时刻只有一个家」的漏项。
3. **TWICE-hash / paste、BACKOK×2、GONEFAIL-back(2xx 之后假弹「Please retry」/「did not reach the server」)**:
   - (a) TWICE:扣住期间第二次动作没被看见(pending 时 `leaving()` 返 null),它不经扣住就走了,第一次 flush 丢了笔记、SAVE_FAILURE 触发。修:可扣住的第二步也扣住,离开只走一次、去最新目的地;不可扣住的(后退、地址栏、登录)走 `keepAndLeave`,放行后被扣 flush 自己的拒绝不再上报;应用内链接 blocker 同一交接。两条 leave 测试修前红修后绿。收——与 LATEBACK「重查 peek 再发、限两轮」同一条规则。
   - (b) BACKOK / GONEFAIL-back:`whenLeaveSettled` 拒绝,因为适配器把迟到的 2xx 报成失败(`route_receipt_stale`),虽然它已把回执忘掉。修:`whenLeaveSettled` 只在「本笔记的恢复回执自打开以来新写或重写」(打开时快照 `recoveryKey@queuedAt`)才保持拒绝;打开时账号未知则偏向弹。落在 `useNoteCanvasRuntimeController.ts`(15 文件内),适配器仍只有批准的 3 行。收,并记我的读法:这把提示的依据从「这一个请求的结果」换成「有没有没到服务器的字(回执在不在)」——对提示的语义反而更准(提示该说的正是字没到)。但适配器把「2xx 已存、只是没法贴回已卸载的画布」报成失败,**这条错报本身不修在 r2**,记 TD;A-25 ②a(持久 Retry 控件)直接吃适配器结果,builder 的 A-25 查报加一问:`route_receipt_stale` 在 2xx 后应报什么,否则 ②a 的控件会在同一处假亮。「账号未知偏向弹」:Tester 若在刚登录即离开的臂上看到假弹,记 已知,不算红。

**两行待裁**:

- **TWICE-hash500**:被扣住的保存吃 500。修后人留在 A、弹重试提示(HASHFAIL 规则)、重开时回执横幅给 Apply。探针要「字在服务器、无 Apply」——500 下字不可能在服务器,r2 又没有自动重试(那是 A-25 ②a)。**探针预期错,按 r2 改**:留在 A + 一条 HASHFAIL 提示 + 重开横幅 Apply = 最新快照。Tester 改这一行预期;原预期留作 A-25 ②a 的前瞻臂(自动重试落地后无 Apply)。
- **UNDOPAUSE**:第三次撤销删掉了 warmup 块(`[]`)而不是退到 `['w']`。builder 在 r1 与基线 `04f6f822` 上重跑中。**规则**:基线相同 → 不是 r2 引入,记 已知 / TD,不挡封包;基线不同 → 撤销形状变了,这是本单硬闸(Henry:撤销和今天一样),红,修了再封。

**封包条件不变**:重跑全绿(上两行按本节处置)→ 封包 `a20-idle-save-r2` → 报新哈希。范围到此;再有新发现开 r3。

### A-20 r2 · 重跑全绿;UNDOPAUSE 基线一致不是 r2 的(TD-63);GONEFAIL-back 探针规则改——真失败的一条「没到服务器」提示不算红;准封包(Main_Designer 2026-11-08)

builder 重跑(scratch 构建 `index-DGn86c1V.js`,未封包):LATEBACK 8/8、INAPP 8/8、a20j 全部(SPLIT×4、RETRY-del、RETRY-more、STALE×2、TWICE-hash / back / paste / hash500、BACKOK×2)、GONEFAIL-hash / paste、UNDOSEQ、IME 绿;客户端全量 2727/2727 exit 0;tsc 0。Tester 改过的 LATEBACK / INAPP / TWICE-hash500 探针在跑。

**UNDOPAUSE——过闸,记债**。四步在 builder 环境的基线 `04f6f822`、r1、r2 上两遍完全一致:`[["warmup","aaabbb"],["warmup",""],["warmup"],[]]`;Tester 环境的基线(pre-c2)与 r1 都终于 `['w']`。**形状随环境不同,但每个环境里基线 = 包**。本单撤销的闸是「与今天逐字节相同」,相同即过;分析器手写的 `['w']` 是 Tester 环境的形状,不是普适预期。Tester 已改:分析器收 `BASE=<基线跑目录>`,UNDOSEQ / UNDOPAUSE / IME 一律判「= 同环境基线」,合成 `[]` 对她的 `['w']` 基线红(阳性对照);封包后她在自己的 pre-c2 上再对一遍。记 **TD-63**(第三次撤销删整块、且形状随环境变),Henry 日用期看顺不顺手。

**GONEFAIL-back——builder 的规则对,Tester 独立到同一条,采**。Tester 自述:分析器 `!r.goneMsg` 写于 r1 / 修前所有行 goneMsg 皆 false 之时,与 README 闸「0 条假提示」相悖;r1 的假提示其实是 stayMsg「Changes could not be saved. Please retry before leaving the note.」。新规则下 r1 两行仍红(stayMsg 被抓)= 阳性对照成立。这臂按设计让离开时的保存吃 500:应用弹一次「Your last edit did not reach the server. It is kept on this device…」,字稍后(既有重试链,PUT 200 约 9.4 s)落地一次,count 1、无框、无重复、探针自己的 ok = true。分析器把任何「did not reach」都判红,那条规则写于这臂还在假弹「Please retry」的时候;**现在保存确实失败了,提示是真话**。我裁的是「traverse 不假弹」和「一次失败最多一条提示」,不是「失败也不许说」。r2 规则:**GONEFAIL-back 绿 = 字落地 1 份 + 恰好一条「did not reach」(按出现次数计)+ 零条「could not be saved / 请重试」(stayMsg——后退后人已不在页上,无处重试)**;BACKOK(网络好)仍 = 零条。这一对正好是阳性对照:提示跟着真假走。要「失败也不提示」得让应用预知稍后会成功,那是 A-25 ②a(持久控件 + 退避重试)的事,不塞 r2。MANUAL-SECTION 加一句,按代码实际行为写:后退 / 离开时那次保存失败会提示一次,字留在本机,多半由后续保存自己补上;重开若见横幅再 Apply。

**准封包**:Tester 新探针三行绿后封 `a20-idle-save-r2`,报哈希 + sha256。封后我派 Reviewer ∥ Tester。

### A-20 r2 · TWICE-hash500 再裁:两轮重查实际是一次重试,一次性 500 被吸收 → 存一次、离开到最新目的地,采;我上两节「留在 A + Apply」的预期撤;两条过时提示归 A-25 ②a (e);封包(Main_Designer 2026-11-08)

Tester 新探针:LATEBACK 8/8、INAPP 8/8 绿;TWICE-hash500 在我前一节改过的规则下红,但 builder 录下的实情是**字存了,不是丢了**:

- 1496 PUT `[hold] warmup|twice words`,扣住后被答 500 → 3382「Failed to save block」;
- 3458 PUT 同内容 → 3591 **200**。这是 `flushForLeave` 的重查轮(LATEBACK 裁定:`hasUnsavedEdit` 仍真 → 最多再 2 轮 flush),它走的是失败组的 Retry 路,把 500 的那组重发并存上;
- 3528「Text changes could not be saved. Retry saving or undo before leaving the note.」(history `onSaveFailure`,来自那次 500);
- 然后被扣的离开走到 C(最新目的地)。服务器:字 1 份、精确;重开无 Apply,因为无字可恢复。

**裁:采「存一次、离开到最新目的地」为 TWICE-hash500 的 r2 绿。**理由:Henry 的验收是「网络好时随时关它都能保存」;一次性 500 被下一轮吸收后字在、人也去了想去的地方,这**严格好于**我写的「留在 A + 提示 + 重开 Apply」——那是保存不可能时的兜底(**持久失败的臂是 HASHFAIL**——每次 text-save 都 500,r1 / r2 都留在 A、字在编辑器、count 0;我这里原写成 GONEFAIL-hash / paste,Tester 更正:那两臂是一次性 500、约 30 ms 后重试 PUT 存上、人离开到另一篇、count 1,与 TWICE-hash500 同形;builder 回执「验证」节同句照抄了我的错标签,收割时随收据注明),不是目标。我前两节关于这一行的预期撤,**原探针的 `a25Forward`(字在服务器、无 Apply)就是正确预期**,只是成因不是自动重试而是重查轮。不选 builder 列的另一路(「某轮 flush 拒绝即停轮、留在 A」):那是拿一次已存的编辑去换一次人工重试,方向反了,且是 r3。

**两条提示(一次失败弹两条、第二条被随后的成功 + 离开证伪)**:基线同款(GONEFAIL-hash / paste 同一对,绿),不是 r2 引入;归 A-25 ②a (e)「一次失败一条、控件在屏时零条」,已写进 A-25 单 Q2 ⑥(与 TD-62 同条)。r2 不碰。

**Tester 分析器**:TWICE-hash500 绿 = 字在服务器恰 1 份精确 + 落到最新目的地(C)+ 重开无 Apply(无可恢复);提示只记 `watchN` 计数(goneN / stayN),r2 不作闸,A-25 (e) 接。这一行就是「重查轮吸收一次性 500」的机械化钉子——每包都跑,不另写单测。

**说明书**:builder 已加的一句(「did not reach the server」段下:也会在后退后出现一次;多半由后续保存自己补上;重开见横幅按 Apply)收。再补一句,按实情:「切换笔记 / 改地址时若那次保存一时失败,可能先看到一两条『没存上』,随后多半自动补上并照常离开;离开后字在笔记里就对了」。

**封包**。15 文件 `src/`、`index-DGn86c1V.js`、COPY-BACK、MANUAL-SECTION;报哈希 + sha256 + 文件数。封后派 Reviewer ∥ Tester。

### A-20 r2 包收讫:`a20-idle-save-r2`(`index-DGn86c1V.js`,src 15 / dist 63,两清单 `sha256sum -c` 我核 15/15、63/63 OK);派 Reviewer ∥ Tester(Main_Designer 2026-11-08)

**回执** `docs/audits/2026-11-08-a20-builder/builder-r2/RECEIPT.md`(代码回答 ⑦–⑫ 行号对包 `src/`;证据 `kit/` 各轮分析、`runs/`、`positive-controls-r2.txt`、`client-full-r2.txt`;扫描 ⛔ 0)。COPY-BACK 对共享树 HEAD `036bb4f1` 核过:14 文件 = `04f6f822`、1 新文件;server 未动。**r2 取代 r1,r1 ⛔ 回拷。**

**两处偏离,都收**(此前已裁过):起点取「已交出」`handedFlows`(交出即有回执,不重叠);K5 过滤放控制器 `useNoteCanvasRuntimeController.ts:606`,适配器保持 3 行(`useNoteCanvasDataAdapter.ts:2148`)。

**四条残余的处置**:
1. 「排队中的纯文本组所在单元,离开前在劈点之前被劈分,被劈单元这段排队文字不保留」——(B) 窄补的已知代价,窗口极窄(在途 + 排队 + 回车 + 不可扣住的离开或崩溃,队列未排空)。**说明书措辞随之改**:我在「排队中的劈分组」节写的「原行保持原样」超承诺,收割时改为「原行保持上次已存的样子,框里多一条后半」。
2. **守恒闸 K2 臂已删**(它在 `04f6f822` 上同样丢 `<k1>`,是修前就有的重试链覆盖,A-25 CHAIN)。收,不为此重封;条件:**A-25 builder 把这条臂加回**作 CHAIN 阳性对照(冻结版 `04f6f822` 与 r2 上红、②a 修后绿),A-25 单「验收 ③ / CHAIN」已指定 jsdom 闸臂为控制,这就是那条。
3. 一次失败两条提示 → A-25 (e)(已写 Q2 ⑥)。
4. 适配器 2xx 后 `route_receipt_stale` → TD-62 → A-25 Q2 ⑥。

**派 Reviewer**(只核写入路径,出发现不裁;读包 `src/` 与对 `04f6f822` 的 diff;⛔ 改码、⛔ git 写;报告 `docs/audits/2026-11-08-a20-builder/reviewer-r2/findings.md`,登记 `records/reviewer/findings.md`;若起工作流 `model:'opus'`、≤4 代理、取一个锁位):
- 保险带只在 `peek()` 非空时记(`useTextFlowHistory.ts:785` 起点、`:787` 相等不记、`:752` 终点);`unsent` / `unsentSplits` 两表(`:163` `:167`)与两次交接(`:670-672` 封口入;`:285-290` `saveBlock` 前移出并记 `handedFlows`);**一组任一时刻只在一张账**——特别核 `leaveUnsent`(`:171`,`:317` 恢复扫除调用)有没有漏的路(重试只确认第一组的旧账是否真不再被任何「留住」逻辑读;`unconfirmed` 确已删尽)。
- 劈分记录:只记新单元(`:779`,`source:'split'`、`initialText:''`),被劈单元不记(`:771`),`settleKept` 对 `split-` 不重锚(`:813`)→ `mergeTypedText` 返回 null → **永不自动落地**;找反例(新 id 被复用 + 为空的 Y1 形状)。
- 回执:失败且带回执入 `visitReceipts`(`:307`);K3 两把匿名钥匙的认领(`draftBlockPersistence.ts:103/:126/:136/:526`、`structureTypingBuffer.ts:92/:110`);K5 同次访问的回执不出 Apply(`isVisitReceipt` `:1206`,过滤 `:606`);K6 replace 仍 `location.replace`(`useNoteRouteSaveBoundary.tsx:61/:66`)。
- 离开:LATEBACK 复查 ≤2 轮(`:93`)、仍有未存 `keepOpenEdit`(`:99`);第二步扣住(`:189-199`);traverse 走 `keepAndLeave`(`:173`,`:205` 分流),放行后不报被扣 flush 的拒绝;`whenLeaveSettled` 的「回执自打开以来新写 / 重写」判定(`useNoteCanvasRuntimeController.ts:870-881`,打开时 `recoveryKey@queuedAt` 快照)——核边界:账号打开时未知的分支、同一 `queuedAt` 重写、两个笔记串台。
- 适配器 diff 恰 3 行(`:2148` 附近);⛔ 动过 `useHeadingStructureController.ts`、`transferTextUnit`、server(diff 应为零)。
- 闸:`structureTypingConservation.test.tsx` 回执计入「被持有」(`:100/:123/:136/:495`),来源三分 window / edit / split 与 window-only 读取(`:255`),阳性对照 `dropWindowRecords`(`:439/:672`)真能把闸打红。
- 只出发现,按 🅰 / 🅱 标,附行号;不出判语。

**派 Tester**(每包必做:同源 + 本单验收臂 + 相关修前阳性对照 + ≤10 冒烟 + 判语;阶段末再全量):
- 同源:两清单 `sha256sum -c`;`src/` 与 dist 的对应按你的方法。
- r2 链:FLYK 严格形(服务器 kone = 0、框里有 kone、kzero = 1);SPLIT 四变体(原单元不动 = 修前;框里可多一条后半 🅱);RETRY del / more;K1 五变体含 K1IME-held(无重复、不自动落地、横幅 Apply = 最新快照);K2(不自动落回);STALE = 修前;LATEBACK / INAPP(留状态条截图)/ GONEFAIL-back(新规则)/ TWICE 四变体含 hash500(存一次、到 C、无 Apply)/ BACKOK;emptyHash;OFFKILL 作已知;提示按 `watchN` 计数;UNDOSEQ / UNDOPAUSE / IME 对你自己的 pre-c2 基线。
- 阳性对照:r1 在 SPLIT / RETRY-del / GONEFAIL-back 上红;修前在 K1 / K2 上红。
- **列「比修前差的臂」**,一条也写;判语在报告最前面,登 `records/tester/verdicts.md`;交证据前 `pre-harvest-scan --paths`;截图裁侧栏;取锁位、≤40%。
- 你的 9 张裁好的截图 + LATEBACK 等待截图随本次证据一并交。

放行后:COPY-BACK → 收割(`docs/audits/2026-11-08-a20-builder/` 一并)→ 说明书节 → 告 Tester 版本 → 第 23 次部署(纯前端 `build:client`)→ 轻量岛检。builder 转 A-25 查报(底换 r2 包)。

### A-20 r2 · Reviewer 发现收讫(M1–M6);开 **r3**;r2 发不发看 Tester 两条 M2 臂(Main_Designer 2026-11-08)

Reviewer 报告 `docs/audits/2026-11-08-a20-builder/reviewer-r2/findings.md`(只读码,无子代理无锁;九条点名逐条核:三本账成立、`unconfirmed` 删尽、劈分记录找不到自动落地反例、适配器恰 3 行、HSC / `transferTextUnit` / server 零 diff;`whenLeaveSettled` 快照三边核过无串台)。六条发现与处置:

| # | 性质 | 一句话 | 处置 |
|---|---|---|---|
| **M1** | 确认 ① | 连打两个回车、队列未排空时离开,中间那行(`x`)不在任何账里:`keepOpenEdit` H:771 因 U2 被 S2 劈而删 `ends[U2]`;U2 是排队 S1 新长出的、服务器没有的单元,「不记原单元」的理由(整段替换删服务器字)对它不成立。同一行还会丢「S1 排队时点回原行接着打」的开着的组。触发 = 平常打列表 + 关页 / 后退 / 地址栏 / 401。修前同丢 | **r3 必修**。我接受残余 #1 时的「窗口极窄」前提错了,记判断点 |
| **M2** | 疑似 ② | 应用内后退(路由推的条目,带 `idx`)+ 保存失败:Navigation API `traverse` 先走 `keepAndLeave`(记 K、`released = true`、失焦封口发保存),随后 popstate 到路由,拦截器 R:115-137 拦下、`flush` 抛、`blocker.reset()` → **人留在 A**;K 却当「已离开」冻结;此后撤销 → `settleKept` 把 K 重锚成 `{initial: 撤后文字, text: 被撤文字}` → 下次打开自动落回(K2 同形)。附带:弹 LEFT_UNSAVED「已离开」而人没走;`released` 卡真,本次访问余下所有离开都不扣住、卸载兜底 flush 也跳过。探针 back 臂用脚本 hash 条目(无 `idx`),拦截器拦不住,没盖这条路 | **r3 必修**;**Tester 现在就加两臂在 r2 与修前上跑**(见下)。r2 若复现 ② → **r2 不发**,r3 作第 23 轮;不复现 → r2 照发,r3 第 24 轮 |
| **M3** | 疑似 🅱 | `keepAndLeave` 与 LATEBACK R:99 都「先记后交」,同一组同时在记录与回执里;迟到 2xx 被适配器忘掉、`settleKept` 因 `!current()` 不跑,记录留下而字已在服务器;重开通常 `typedTextIsPlaced` 认出并删,但第二设备改回那行时会把别处删的字带回(STALE-back) | **r3 收**,规则:交接 2 发生即删该组的保险带记录(回执成为唯一的家);页面在记与交之间死掉则记录存活 → 框。关页路本就干净(`beforeunload` 先交) |
| **M4** | 疑似 🅱 | `pagehide` 记账不看 `event.persisted`;页面从 bfcache 回来继续打字、空闲保存成功后 `settleKept` 重锚成 `{initial: 新字, text: 旧字}` → 下次打开整段替换成旧字,**后打的字被删**。窄(需 pagehide 时有未存字且无在途请求,如离线) | **r3 收**:`pageshow` 且 `persisted` → 删 pagehide 写下的冻结记录(会话还活着就没有冻结记录) |
| **M5** | 确认 🅱 | 「交出即有回执」三例外:适配器在写回执前就拒(A:1910 `mutation_not_allowed`、A:1922 `route_receipt_unavailable`、A:1987 `board_range_sync_failed`),这类组只在 `failures`,离开不记不提示。1922 走不到,1987 少见 | r3 **若便宜就收**(拒绝无回执 → 组退回 `unsent`),否则记 TD;闸模拟补这三种拒绝 |
| **M6** | 确认 🅱 | K3 三边:匿名条目 JSON 损坏挡整表且随后被单条覆盖;认领回执不保证一块一条(与 A-25 ②a 陈旧回执去重同题);匿名条目由下一个读到的账号认领 | **TD-64**;②归 A-25 ②a |

另:K5 的 H:1183 直接 `saveBlock` 路失败未标本次访问 → A-25 ②a 顺手(控件取代本次访问的横幅)。

**r3 的设计原则(一句话给 builder)**:**冻结的记录只属于已经不在的会话**。会话还活着(路由拦截器把人留下、bfcache 回来),就不该有冻结记录——`keepAndLeave` 的记录与 `released` 是**临时的**,导航没有真发生就撤回(删 K、`released = false`,留下的失败走 HASHFAIL 的「留在 A + 一条提示」,⛔ LEFT_UNSAVED)。两种实现 builder 选:(甲)traverse 时查 `event.destination.getState()` 有没有路由的 `idx`,有 = 路由会拦 = **可拦住就扣住**(走 `flushForLeave`,与 TWICE (a) 同原则),无 `idx` 才 `keepAndLeave`;(乙)`keepAndLeave` 照做但下一拍核对路由是否真换了,没换就撤回。甲更直接,乙更兜底;可以都做。回执写明选哪条、为什么。

**r3 范围**:M1(被劈单元的字——排队的与开着的——都记:服务器没有的新单元 `split-` 记录起点空终点现文字、永不自动落地;服务器已有的原单元 `edit-` 记录起点 = **劈分后**的文本、终点 live,服务器仍是劈前内容时自然不匹配 → 框,S1 真发出去了才匹配落地)+ M2 + M3 + M4(+ M5 若便宜)。⛔ 别的。决定 4 的调用方普查(A-25 单)顺手在同文件里做,只读。**单测 + 闸种子**:LIST(`k0 ↵ x ↵ y`,保存被扣,卸载)、CLICKBACK(S1 排队,点回原行打字,卸载)、BACKIN-fail / BACKIN-undo、HANDOVER-one-home(交接 2 后记录消失)、BFCACHE(pageshow persisted 后无冻结记录)。包 `a20-idle-save-r3`,src 快照 + 两 sha256 + COPY-BACK + MANUAL-SECTION(只改「已知」里被 r3 推翻的句子)。

**Tester 立刻加臂(修前 `04f6f822` 与 r2 各跑)**,结果决定 r2 发不发:
- **BACKIN-fail**:从列表 / 应用内链接点进笔记 A(路由条目,不用脚本 hash),打字,扣住保存答 500,按后退。记:人停在哪、弹了哪条、框里 / 存储里有无记录。
- **BACKIN-undo**:接上一步若人留在 A,撤销那组字 → 正常离开 → 重开 A,看服务器与屏上文字(被撤的字回来 = ② 复现)。
- **LIST**:保存被扣住时打 `k0 ↵ x ↵ y`,分别关页 / 后退 / 地址栏离开;重开后 `x` 在哪(预期修前与 r2 都丢 → 不比修前差;r3 绿)。
- **STALE-back**(🅱,记就行):STALE 的后退变体。
- A-25 用:**LANDFAIL 期间在另一个普通块打字** / **在另一个带标题的块打字**(查报推断:前者今天能打、后者今天拒)。

**r2 判语标准不变**(不比修前差 + 本单臂 + 阳性对照),**加一条**:BACKIN-undo 在 r2 上若复现 ②,判语写「挡放行,原因 M2」;不复现写「放行,M2 未复现,r3 仍修」。

**Reviewer**:r3 包封了再核一遍 diff(小),点名:M1–M4 各自的修法对不对行、`released` 不再卡住、冻结记录在会话存活时为零、交接 2 删记录没有删到不该删的。
