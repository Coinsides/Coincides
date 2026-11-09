> **状态 (Status)**: active
> **层 (Layer)**: 交接 / Handoff(订单;本文件只放 A-20b,别单⛔追加)
> **日期 (Updated)**: 2026-11-09
> **权威 (Authoritative)**: 是(规格与裁定);判语归 Tester,发现归 Reviewer,裁定、收割、部署归 Main_Designer

# A-20b · 保险带覆盖缺口(Reviewer r3e Q2 / Q3 / Q4 / Q5;阶段一「写字不丢」A-20 的补单)

## 单卡(现行,覆盖写)

> 按 `operating-workflow.md` §6:验收臂先于施工;每单一文件;验过即上岛。本单**不挡 A-20 r3e**(四条都不比修前差、都是「没保住」不是「写错」),r3e 放行照常上第 23 轮;本单 = 第 24 轮,排 **A-25 ② 之前**(两条修法都小、都正中「写字不丢」)。

### 状态(Main_Designer)
- 2026-11-09 开单。底 = A-20 r3e 包(`index-Dkbj0u5K.js`,`<ops>/packages/a20-idle-save-r3e`)。builder 在**独立 scratch**(⛔ 混 A-25 文件)施工;A-25 之后换底到 A-20b。

### 规格(Main_Designer;来源 `reviewer-r3e/findings.md` + builder 读码答,行号对 r3e 包 `src/`,H = `hooks/useTextFlowHistory.ts`)
1. **Q2 多行粘贴首行片段不入账**(成立):`abc|def` 粘 `X⏎Y` 走 `TextBlockProjection.tsx:1508` `pasteTextIntoTextFlow`,首段保 tu-1 成 `abcX`、`Y` / `def` 新 id;`emitFlowChange` 无 edit → kind structural(:859–866);单元变多 → `isSplit` 真 → `unsentSplits`(H:693)。离开时 H:796 把 tu-1 的 cutText 记成组后文 `abcX`,H:815 起点 == 终点 → H:817 不留记录;X 两张账都不进,关页丢 X。**修**:cutText = **was(服务器 / 组前文)与组后文的公共前缀**——行中回车 `abcdef → abc` 仍得 `abc`;粘贴得 `abc` → edit 记录 `abc → abcX`,由 `mergeTypedText` 落地;选区替换 `abcdef → abX` 得 `ab`。动 H:796 + 一个小 helper。**副作用(接受)**:`abc → abcX` 落到服务器 `abcdef` 得 `abcXdef`,`def` 同时在框里作 split 记录 = 今日「回车后在前半末尾打字」同形(TD-66 族,手册「框里多一条后半」已覆盖),不丢。
2. **Q3 单元集合不变的 structural 组不入账**(窄化后成立;行内选中几个字打新字**不**在此列——textarea 自身选区塌到一个单元后 :729–733 清 flowSelection,打字走 :941–975 kind typing,plainTyping 真 → unsent):命中路 = 列表形单行粘贴(`- item`,:1499 跳过早返回 → `pasteTextIntoTextFlow` structural、单元集合可不变)、不允许标题时的单行 `# ` 粘贴(:1502–1505 `replaceFlowSelection`)、插行内链接(`NoteWritingSurfaceLayer.tsx:1618`)、接受 agent 补丁(`useNoteAgentHumanEditor.ts:53`);窗口 = 该组在队列里排在别的保存后面、persist 未起时关页。【2026-11-09 Reviewer R1 更正:插链接只改 inline_structures 不改字,agent 补丁在 H:667–698 先走 proposal 支——两条都到不了新支;命中路以「Reviewer 小核结」节为准:列表形 / `# ` 单行粘贴 + 非标题单元末尾 Shift+Enter】**修**:H:691 加一支——单元集合不变 + 文字变 ⇒ 也进 `unsent`(ends.before = 组前快照 = 起点)。`unsent` 的两处用法(交接删 H:174–178、空闲保存接管 H:696–699)不依赖 kind。**只改角色不改字**的组仍不留(与 Reviewer r3d P7 同节,TD)。
3. **Q4 谓词前导斜杠**:`#notes/<id>` 无前导 `/` 路由补 `/` 判本篇(router:278–279)、谓词判离开 → `released` 卡真;`#login` 同理。**修**:`hashRoutePath` 归一前导斜杠,与路由同。
4. **Q5 两条测试债**:(a) C:417–419(`??` 回退 + isVisitReceipt)加穿真 controller 的测试;(b) 谓词单测改成**对照路由逐形取值的表**(同一张表喂路由与谓词,差异即红)——「不变量只写一次」的测试版。
5. ⛔ 别的。⛔ 动 A-20 r3e 包。⛔ 动契约。

### 阳性对照(各一条,在 r3e 上红、A-20b 上绿)
- Q2:`abc|def` 粘 `X⏎Y`,上一保存在途,关页 → 重开:X 在 edit 记录里(`abc → abcX`)或已落地,`Y`、`def` 在框;r3e 上 X 无处。
- Q3:`- item` 粘进一行(或插链接),排在在途保存后,关页 → 重开:字在记录里;r3e 上无记录。
- Q4:`#notes/<id>` 不扣、`released` 0;r3e 上扣。
- Q5(a):断真 controller 把别次条目传到 HSC;(b) 表驱动。

### 验收(Tester;包 `a20b-belt-coverage`,报告 `docs/audits/2026-11-09-a20b-builder/tester/review-tester.md`,判语最前 + verdicts.md)
同源 → A-20 链 190 全保(对 r3e 判语链 diff)→ a20m 全部 → a20n 全臂(r3e 预期照旧)+ **新臂**:MULTIPASTE-close(修前 / r3e / A-20b,REPS=2:X 的去向)、LISTPASTE-close(`- item` 粘贴 + 在途保存 + 关页)、~~LINK-close(插链接同序;便宜才加)~~【R1:链接不归本带管,臂撤】、**SHIFTENTER-close**(非标题单元末尾 Shift+Enter 后不再打字 + 在途保存 + 关页;r3e 丢该换行,A-20b 记录里有)、`#notes/<id>` 两形 → 9 对 → 第 10 对。MULTIPASTE 的记录两形都认:`abc → abcX` 或 `abcdef → abcX`(O1,在途是同块保存时 settleKept 改写起点)。**以 r2 包为准**(`a20b-belt-coverage-r2`,主 JS 另报)。判语标准不变。

### Reviewer 小核(封后)
Q2 的公共前缀 helper 对三形(回车 / 粘贴 / 选区替换)各取什么;Q3 的新支与 plainTyping / isSplit / removesUnits 三支互斥完备(每个组恰入一张账或明确不入且理由);Q4 与路由逐形;Q5 表与路由同源。

### 收割与部署(Main_Designer)
copy-back → 收割(含 `docs/audits/2026-11-09-a20b-builder/`)→ 手册「已知」删 Q2 / Q3 那两句 → 告 Tester 版本 → 第 24 轮(前端 only)。

### A-20b 码成,对照各在 r3e 上红;s11* 排队等锁(builder;Main_Designer 收 2026-11-09)
A-20 工作副本(= r3e 包 + 本改;r3e 包未动;未混 A-25)。**Q2**:H:796 `cutText = commonPrefix(was, 组后文)`,helper 在文件顶;行中回车结果同前。**Q3**:H:691 split / removes 支之后加一支——同单元 id 集 + 文字变 ⇒ `unsent`;改变单元集合的组仍走 split 账。**Q4**:`hashRoutePath` 补缺失的前导 `/`;`isSignInPath` 导出(供表)。**Q5(a)**:controller 测试把两张列表放进 data controller mock,包真 HSC 记其输入;两例——等待列表整张传入(含 Apply 仍在结算的条目);无该列表时退用被提供列表。**Q5(b)**:leave 测试 **25 行表**,每个地址同时经 `createHashRouter`(与 App.tsx 同路由形)与谓词取值,两者必须一致。对照 `positive-controls-a20b.raw`:Q2 / Q3 / Q4 在 r3e 上红;Q5(b) 在 r3e 上恰 4 行红 = 无前导斜杠的四形(`#notes/note-a`、`#notes/note-a/`、`#login`、`#register`),其余 21 绿;Q5(a) 测的是 r3e 已有行为(绿),改用**变异**(controller 传被提供列表)红;副本还原 cmp 核过。**发现**:原 controller 测试的 Proxy 对缺失键返回 no-op,`??` 回退从未被走到;现在走到了;生产里适配器总提供 `recoveryReceiptsKeptWordsWaitFor`,`??` 是防御支。**裁**:收;Q5(a) 用变异作红是对的(行为已存在时阳性对照只能靠变异);「Proxy 吞缺键」记 TD-68 附(与 `?.()` 同族:mock 的宽容也会藏空转)。s11* 绿 → 主 JS 给 Tester(她 r3e 验收完后接)→ 封。

### A-20b 包封讫,主设计核过(Main_Designer 2026-11-09)
包 `<ops>/packages/a20b-belt-coverage`,底 r3e,未混 A-25。主设计从包内自验:`src.sha256` 18/18 OK、`dist.sha256` 63/63 OK,两张清单自身哈希与回执一致(`a1609ba6…`、`1fbf2e18…`);主 JS `dist/client/assets/index-DX5raR6f.js` sha256 `88018123…` 与回执一致;对 r3e 包逐行比:**4 改 + 1 新 = 5**(改:H、`useNoteRouteSaveBoundary.tsx`、两者的测试;新:`useNoteCanvasRuntimeController.test.tsx`),其余 13 字节同 r3e。builder 验证:tsc 0(首跑 exit 2 只在 Q5(a) 测试的类型注解,只改测试;该文件复跑 19/19)、client 全量 2793/2793(在注解修正之前跑;注解不进 dist、不改运行时,**收**,差额由该文件 19/19 补)、build 0、kit s11* 16 段 0 红(s11c.base 4 红已知)、对照 Q2/Q3/Q4 在 r3e 红、Q5(b) 恰 4 行红、Q5(a) 变异红、还原 cmp 核过。回执 `docs/audits/2026-11-09-a20b-builder/RECEIPT.md`,「代码回答」四节齐(commonPrefix 三形;Q3 if/else-if 链 H:707–711 互斥、不入账两类 (a) 序列同字同 (b) 同集换序=今无路径列残余;Q4/Q5 行号;TD-68 附「Proxy 吞缺键」候入账)。
**派**:Reviewer 小核(按上节四条,对包 `src/` 读;发现落 `docs/audits/2026-11-09-a20b-builder/reviewer/findings.md`)∥ Tester 验收(r3e 判语后接,按「验收」节);builder 回 A-25,rebase 到 A-20b。TD-68 附、Q2/Q3 手册两句删除,随收割一并做。

### Reviewer 小核结:不挡;R1–R4 / O1–O3 裁 → 开 r2(Main_Designer 2026-11-09;发现在 `docs/audits/2026-11-09-a20b-builder/reviewer/findings.md`)
Reviewer 四条不变量:① ③ 成立;② 说法不符(R1)+ 顺带多接住一类;④ 测试债剩一半(R2)+ 表漏一形 / 不同源(R4);疑似 R3。**都不挡、都不比修前差**;但 Tester 尚未开 A-20b 臂、builder 刚回 A-25 还没动码,此刻补一轮最便宜——**开 r2**,全部都是一行级改动,逐条裁:
- **R1(确认,🅱→r2 只改说法)**:Q3 新支接住的是「同 id 序列 + 文字变」的组;插行内链接只改 `inline_structures` 不改字(H:204 为假;即使入账 H:808 也不出记录;保管记录只存字),接受 agent 补丁在 H:667–698 先走 proposal 支到不了入账链(提案在服务器仍 pending,可再接受,不是人写的字丢)。我在规格 2 里把这两条写成命中路是**把「结构组」的名单当成了「同序列文字变」的名单**,没逐条问「字变了没」——与 Q3 原题 Reviewer 的「行内选区打字」误列同病。**裁**:H:197–199 注释与回执 ② 改为两条命中路 + Shift+Enter 第三类;规格 2 已加更正注;LINK-close 臂撤;「关页时刚插的链接 / 只改角色缩进的组不受保险带护」与 r3d P7 合记一条 TD(随收割写)。
- **第三类(Reviewer ② 逐核补出)**:非标题单元的 Shift+Enter 是 typing 组、inputType `insertLineBreak`,H:207 把它排除出 plainTyping,r3e 哪本账都不进(只丢「最后一个 Shift+Enter、之后没再打字」的换行);A-20b 第 3 支顺带接住。**裁**:收进本单说法;Tester 加 SHIFTENTER-close 臂(修前 / r3e 丢换行,A-20b 记录里有)。
- **R2(确认,🅱→r2 补一例)**:Q5(a) 两例只走到 `??` 回退,`isVisitReceipt` 过滤那一半没测到(CT 用真 `useTextFlowHistory`,`visitReceipts` 空;删 C:419 的 filter 两例仍绿)。**裁**:补一例——造一张本次访问自己留下的回执(让一次保存失败带回执,走 H:341–344 `visitReceipts.add`),断 HSC 收到的列表里没有它;对照 = 删 C:419 filter 该例红。:51/:568/:575 不吞 undefined,Reviewer 核过,了。
- **R3(疑似,🅱→r2 一行)**:`commonPrefix` 按 UTF-16 码元比,光标后原字与粘贴首字在同一代理区段(`abc😀def` 粘 `😁⏎Y`)时切在代理对中间,记录 `abc\uD83D → abc😁`,落地多出一个孤立低位码元(不丢字,插坏字)。**裁**:结果末位若是高位码元(U+D800–DBFF)就退一位,一行;`mergeTypedText` 自己的前缀循环(HSC:75)同族既有问题,记 TD(随收割写),本单只堵新入口。中文常用字全在 BMP,频率低,但「插坏字」是写错不是没保住,一行能堵就堵。
- **R4(🅱→r2 加一行;同源记 TD)**:Q5(b) 表的路由树抄自 App.tsx 不是导入——App 改路由形表不红,「不变量只写一次」在测试侧差最后一跳;App 的 `router` 在模块顶层建、未导出,抽成导出常量要动 App.tsx 且把 19 条子路由带进测试。**裁**:同源改造记 TD-68 附(与 Proxy 吞缺键同节:测试与生产之间的第二份真相);本单只补表里漏的 `''` 一形(R:249 运行时真实输入:`…/#` 与 `…/` 的 hash 都是 `''`;路由侧 `replaceState(null,'',pathname)` 造无 hash 地址)。`#./notes/<id>` 两侧归一串不同、分类同(都「别处」),R:24 注释「as in the router」加一句例外,只改注释。
- **O1**:在途若是同块保存,关页后它一确认 `settleKept`(H:866–882)把起点改写为服务器全文,记录成 `abcdef → abcX`,落地整行换 `abcX`、`def` 留框;X 两种时序都保住。**裁**:Tester MULTIPASTE 期望两形都认(已写进验收节)。**O2**:helper 插在 `IDLE_SAVE_MS` 的 JSDoc 与常量之间,JSDoc 挂错了头。**裁**:r2 顺手把 helper 挪到 JSDoc 之上。**O3**:改动范围与我核的一致,了。
- **r2 范围(⛔ 多一字)**:H:197–199 注释、H:58–62 退一位、O2 挪位;R:24 注释;CT 补一例(R2);LT 补 `''` 一行(R4)。dist 只因 R3 一行变。验证照 r1(tsc / 全量 / build / kit 16 / 对照:R3 新对照 = `('abc😀def','abc😁')` 在 r1 得 `abc\uD83D`、r2 得 `abc`;R2 新对照 = 删 filter 红)。包名 `a20b-belt-coverage-r2`,回执追加「## r2」节。Reviewer r2 只核一条:退一位的判定范围与三形取值(回车 / 粘贴 / 代理对)。Tester 以 r2 主 JS 为准。
