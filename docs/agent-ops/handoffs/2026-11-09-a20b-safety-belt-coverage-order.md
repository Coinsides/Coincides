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

### Tester 新臂冒烟(r1 冻结件 5613 / r3e 5610 / 草稿库 3605):SHIFTENTER 落地形 ≠ 正常形 → 停线探针;r2 暂不封(Main_Designer 2026-11-09)
读数:① **SHIFTENTER-close**(服务器 `['abc','q']`,头 `qr` 在途扣 60 s,`abc` 行末 Shift+Enter 后不再打字,关页屏上 `['abc\n','qr']`):r3e 换行丢(无记录无框,预期);**r1 换行落地但形变**——服务器 `['abc','','qr']`,应用自己 PUT `abc||qr`:软换行成了独立空单元。对照 SHIFTENTER-idle(同操作、无在途、正常保存):修前 / r3e / r1 服务器都是 `'abc\n'` **一个单元**,重开编辑器也是 `'abc\n'`。② **SURROGATE-paste-close**:r1 红如预测——服务器第一行 `abc😁` + 孤立低半 `\uDE00` + `def`(码点 61 62 63 1f601 **de00** 64 65 66),后端**原样存孤立码元不是 U+FFFD**(R3 由疑似转确认,且比 Reviewer 估的更糟一点:坏码元进库);r3e 😁 整个丢、无坏码元。③ r1 全绿:`#notes` 三形(released 0、HELD-PROCEED、字 ×1);MULTIPASTE(XQ 落地 `abcXQdef`,YQ / def 在框 = TD-66 同形);LISTPASTE(`['warmupr','item']`)。
**裁**:SHIFTENTER-close 在 r1 **不算绿**——我的期望「记录里有」只写了账,没写**落地形 = 同操作正常保存形**;对用户,「尾部软换行丢了」几乎不可见,「多出一个空段落」是应用替他写了结构,**后者更差**,所以这条臂上 r1 比修前差,不能按「字不丢」放。先探再裁(两问并发,⛔ 先修):
- Tester:**SHIFTENTER-typed-close**(Shift+Enter 后再打一个字 `d`、头在途、关页)在 r3e 与 r1 各 ×1——记录 `abc → abc\nd` 落地是 `'abc\nd'` 一单元还是 `['abc','d']`。r3e 若也裂,则「落地写者把 `\n` 当单元边界」是修前既有,A-20b 只是把尾部软换行这一形**新送进**同一个写者;r3e 不裂则裂法只在尾 `\n`。
- builder:代码回答——边界记录(`initialText → text`)落地时在哪一步把 `\n` 变成单元边界(是不是走了粘贴机(`pasteTextIntoTextFlow`)或别的按行切分的 helper),正常打字保存为何能把 `\n` 留在单元内;该写者是否与框里 split 记录的落地共用。⛔ 动码。**r2 先不封**,等这条裁完(可能多一条件:新支排除 `insertLineBreak` / `insertParagraph` 的 typing 组,让 r2 对此形 = r3e;或在落地写者修;二选一看答案)。

### SHIFTENTER 代码回答 → 裁 乙(落地写者修),进 r2(Main_Designer 2026-11-09)
builder 读码(未动码):切 `\n` 的**不是粘贴机,是 HSC 统一落地写者 `placeTyped`(HSC:509)**——`mergeTypedText`(HSC:584)产出 `'abc\n'` 不切,紧接 HSC:595–605 的循环(注释「Enter in the window splits paragraphs exactly as the editor's Enter does」)对单元文本里每个 `\n` 调 `splitTextUnitForEnter`,把 `'abc\n'` 切成 `'abc'` + `''`。该循环为浮框窗口设计(窗口里 Enter 打出来就是 `\n`),分不清窗口段落键与编辑器软换行。正常打字保存走 `history.applyEdit → saveBlock`,`\n` 原样进单元,不经任何按行切的 helper。**共用**:重开时每条存储记录(source `edit` / `split` / `window`)都经 HSC:662–685 `openEntry` → `landKept` → `placeTyped`,同一循环。**修前 / r3e 已有**:`abc\nd`(Shift+Enter 后再打字)记录落地同样被切成两单元;且 `keepOpenEdit`(H:798)把仍开着的组也收进记录,所以无在途但关页时组还开着的 Shift+Enter 在 r3e 上也形成 `'abc\n'` 记录并被切(推断,未跑)。Tester 的「无在途正常保存不裂」是组已被 idle / blur 封存的情形。两改法:**甲** 新支排除 `insertLineBreak` / `insertParagraph`(H:715 一行 + 注释两行;在途时回到 r3e 丢尾换行;不治 r3e 已有的开着组与 `abc\nd` 两形);**乙** 落地写者按来源分流(约 4 行:HSC:118 Entry 加 `source?`、HSC:330/331 openEntry 收 source 写入 entry、HSC:681 传 `words.source`、HSC:596 循环只在非 `edit` / `split` 来源时切;`abc\n` 与 `abc\nd` 都原样落为一单元,开着组那形一并治;代价:split 记录落地把 `\n` 留在单元里(按语义本该如此)、重开框里对 edit/split 记录再按 Enter 不再分段(边角))。
**裁:乙。** 不变量写一次:**只有窗口来源(`window`)的 `\n` 是段落键;history 来源(`edit` / `split`)的 `\n` 是编辑器软换行,落地原样。** 理由:切 `\n` 的问题是修前既有、A-20b 只是多送进一形;甲只堵新形不治旧形,还要加一句已知;乙四行治三形,且 r2 的全量 + kit + Tester 整链(190 + a20m + a20n)本来就要在 r2 上跑,回归成本已在账上;HSC 刚过 r3→r3e 的手术,再动四行要 Reviewer 核。细则:(1) `source` 缺省(undefined)按旧行为切,向后兼容;(2) 阳性对照在 r1 红:`'abc\n'` 与 `'abc\nd'` 落地各一单元;窗口来源 Enter 仍切(两版绿,若 kit 已有就指明段号);split 记录无 `\n` 时落地与 r1 逐字同(一例);(3) 「重开框里对 edit/split 记录再按 Enter 不分段」记 TD(随收割);(4) r2 当前在锁下跑的链(b2eicx445)是乙之前的码,乙进去后 tsc / 全量 / build / kit 16 **重跑**,对照齐再封;(5) Reviewer r2 核两条:退一位 + 乙四行(循环只对 window 来源跑;edit/split 原样;source 从存储 → openEntry → entry 的穿透;undefined 回旧行为;循环别的消费者不变)。Tester 臂改期望:SHIFTENTER-close r2 = `'abc\n'` 一单元(与 idle 同形);SHIFTENTER-typed-close r2 = `'abc\nd'` 一单元(r3e / r1 裂 = 阳性对照)。

### 乙 封前预警(Reviewer):回写方向漏 source → 补进 r2(Main_Designer 2026-11-09)
Reviewer 读 a20b 现码(非 r2 包):乙四行只接了「存储 → openEntry → entry」入向,**回写不带 source**——`storedWords`(HSC:271–272)只拼 id/blockId/unitId/initialText/text/writingRole,`rememberUnplacedWords`(buffer:130–135)按 id 整条替换不合并;重开 → :683 `retainWords` → :284 `remember()` 立刻覆写,source 抹成 undefined;本会话内 entry.source 还在、落地对,但本次没落地(recoveryWaiting :584 / merge null / 只读)→ 刷新 → 下次加载 undefined → :596 照切。同病三处:HSC:271–272、HSC:316 pagehide、HSC:626–627 `landed`(落地后确认前,存 merged.text 含字面 `\n`;确认前离开 → 重开切)。:397 展开保留 source 无事。**裁:收,补进乙。** 不变量再写一句:**entry.source 在存储 ↔ entry 之间任何方向、任何路径往返不变。** undefined 仍回旧行为(r3e 岛上重开过未落地的旧记录按旧样切一次,接受)。补一例 pre-fix 红:edit 记录重开 → 未落地 → 刷新 → 再落地仍 ONE。回执列全部回写点。**判断点(供 Henry 复核)**:我裁乙时只核了入向四跳,没问「这条字段怎么回去」——与 r3e「透传逐跳核到暴露处」同一盲点换了方向;Reviewer 的封前读第二次在同一天把 🅰 级洞拦在包外(上午 A-25 D1/D2,现在乙回写)。

### A-20b r2 包封讫,主设计核过;Reviewer 两条小核 ∥ Tester 全链(Main_Designer 2026-11-09)
包 `<ops>/packages/a20b-belt-coverage-r2`(r1 包未动)。主设计自验:`src.sha256` 19/19、`dist.sha256` 63/63,两清单自身哈希与回执一致(`8af0a065…`、`271e5987…`),主 JS `dist/client/assets/index-Db4qSSYo.js` sha256 `2f09b0be…` 与回执一致。对 r1:6 改(H、R、HSC + 三测试)+ 1 新(HSC 测试),其余 12 字节同;**对岛上 r3e(`29b1d456`)**:5 改(H、R、HSC、H 测试、leave 测试)+ 2 新(HSC 测试、controller 测试)。builder 验证:tsc 0、targeted 194/194、client 全量 2802/2802 exit 0(拆卸竞态本次未现,残余列 TD-74)、build 0、kit 16 段 0 红(s12c.base 4 红已知)、控制三组换码后 cmp 还原(乙 on r1 3 红 3 绿;只入向仅第 3 例红;R3 / R2 红)。回执「## r2」节 + 代码回答 ⑤⑥⑦(SHIFTENTER 事实链;source 读 1 / 写 entry 2 / 回写 4 处;循环 7 条调用路径逐条不改)。
**派**:Reviewer 两条(退一位的判定范围 + 乙含回写方向逐跳、循环 7 条路径别照单接)→ `docs/audits/2026-11-09-a20b-builder/reviewer/findings-r2.md`;Tester 按「验收」节全链(同源 → 190 → a20m → a20n 含新臂 → 新臂修前 / r3e 读数 → 9 对 → 第 10 对),r2 期望:SHIFTENTER ×2 ONE、SURROGATE 干净、WINDOWENTER SPLIT、MULTIPASTE 两形。builder 回 A-25(rebase 到 r2 的 HSC,折 D1–D3)。

### Reviewer r2 小核结:不挡;S1 / S2 / O1 / O3 / O4 裁(Main_Designer 2026-11-09;发现在 `reviewer/findings-r2.md`)
① 退一位成立(范围恰 D800–DBFF、end=0 有守卫、四形取值对);② (a)(b)(c) 成立,回写方向逐跳走完、第五回写点未找到(fixRole / followUnit / kept 都不重建 entry,存储只有 remember 一个入口);(d) 落进段落的 `\n` = Shift+Enter 既有形,split 来源自动落地到不了(HT:1542)。**r2 不挡,Tester 链照跑。**余项:
- **S1(疑似,🅱 → TD-73 附,改法备好)**:edit 记录原样落进「此刻是标题」的单元会造出含 `\n` 的标题(setTextUnitWritingRole / normalizeHeadingTextFlow / 编辑器 :380 都保证标题无 `\n`;r1 的循环会切开)。需等待期间在**别处**改角色,单设备路径未找到。改法 = `:602` 加 `&& !headingLevelForRole(unit.writing_role)`(标题单元照旧切)。阶段一不动 r2(链已跑 4 小时量级,多设备才到);记 TD-73 附,随下次动 HSC 逻辑的单一行折进。
- **S2(确认,🅱 测试债)**:landed 回写 :631–632 无测试钉住(删 :632 的 source 展开六例仍绿;HT:1499 只走 :286 回写)。**裁**:随 A-25 包付——builder 在 HSC 测试加「落地后 flush 前离开 → 服务器无 → 重开仍一行」一例,pre-fix(删 :632 展开)红;只动测试不动 dist,回执标「A-20b r2 测试债(Reviewer S2)」。
- **O4(测试债)**:「不退」形无测试(范围误写到 DFFF 现有测试仍绿)。**裁**:同上随 A-25 付——H 测试加 `('a😀b','a😀c') → 'a😀'`(完整对后分叉不退)一例,变异(范围写到 DFFF)红。
- **O3**:退一位仍可切开字素簇(👍🏻 / 👍🏽),不丢字 → TD-72 附。**O1**:pagehide :318 只存窗口 entry、永不带 source → 窗口来源 undefined 回旧行为恰好正确,记一句不改。

### Tester r2 读数(一):9 对 + 第 10 对全过;链 190 只 1 行红 = prep 光标跳,定量探针排队(Main_Designer 2026-11-09)
**9 对**(r2 红 ⊂ 修前红,逐 arm:name 核):mx 修前 W16 L2 G4 / r2 W16 L0 G3 无新红;acc1 / y / two2 / acc18 / J / retry 两边 0 红;acc10 同 3 行;acc13 修前 3 / r2 2(修前独有 RV:N-a1-failedSaveThenMore),与 r3e 那轮一致。**第 10 对** UNDOPAUSE ×20:0/20 : 0/20(r2 每行 5 PUT,修前 4,多的一个 = 空闲保存,r3e 起即如此)。**链 190**:16 标签里 15 个对 r3e 判语链 diff 0;m 标签 1 行 **LIST-addr-0 红**(服务端 `["rmup","k0","x","ywa"]`,同轮 LIST-addr-1 绿),机理在 **prep() 打 `warmup` 时光标跳到 0**(新笔记 50 ms/键,打完 `wa` 光标落 0 → `rmupwa` → Enter 拆成 `rmup | wa` → 后续 k0/x/y 都打在尾部 `wa` 前),第一个被扣 PUT 就是 `rmup|k0wa`,整串 PUT 逐个对上——**不是臂本身**;同一错位污染了 OFFKILL(参照行,r3e 上同为 ok=false)与 CLOSEFLY-resp-1(绿),判读都不变。
**这个光标跳的历史频率**(全量翻 runs,数 `warmup` 起手的行):修前 3/229、旧 A-20 r2 2/200、**A-20b r2 3/192**、**r3 / r3d / r3e 合计 0/635**。按「不比修前差」同级(1.6% vs 1.3%);但 r3 系列 0/635 而 r2 又现,按 1.3% 算全零概率约 0.03%,Tester 不靠推测下结论 → **caret_probe 排队等槽**:新笔记 → 点空行 → 等 W(800/300/0 ms)→ 50 ms/键打 `warmup` → Enter;页面侧记每个 input(是否仍是最初那个 textarea、值、光标)、focusin、最初 textarea 被移出文档的时刻;网络时间线从 open 前起;修前 / r3e / r2 各 30 次两轮交错,单浏览器,三个后端各自新注册账号(⛔ 与链 / 配对账号共用)。Tester 假设(未证实):空笔记首块懒创建,POST `/notes/:id/blocks` 确认后 textarea 重挂、光标落 0(pre-m-list 那行网络日志打字时段有 POST blocks)。
**裁(标尺先立,数出来再判)**:
1. **第 24 轮的「不比线上差」基线是岛上 r3e(`29b1d456`),不是修前(第 22 轮)**——Henry 现在用的是 r3e。A-20b 单的验收句写的「不比修前差」在 9 对 / 第 10 对上两个基线都过;**光标跳这一条,若探针在同负载、同单浏览器下 r2 明显高于 r3e,就是对线上的回退 → r2 不绿、停线找因**(哪怕与修前同级)。「同级」的判法:三组各 30 次,r2 与 r3e 的发生数之差落在 30 次二项波动内(Tester 给数,我不预设阈值);若三者同级 → 预存竞态,**不挡 r2**,记 TD 另开单。
2. **它是不是用户可见**:新笔记一开就打字、首块 POST 在打字中途回来 → 前两个字跑到后面。人打字 150–250 ms/键比探针慢,但岛上 POST 回程若 >150 ms 就能撞上。**不论探针结果如何这条都入 TD**(🅰 候选:字进了错位置,不是没保住);是否本阶段开单看探针里 W=800 / 300 / 0 三档的发生率——W=0 独有则只在「秒开秒打」时现,记已知 + 阶段末;300 ms 也现则本阶段开单。
3. 探针⛔ 扩项;若 Tester 在网络时间线里已有 POST blocks 的回程时刻,报一并带「POST 回程落在第几个键之后」,那就是机理的直接证据,不用再探一轮。
4. r2 链余项照跑:seq a20m LANDOTHER → a20n 全臂 REPS=2 + 第三形 → 新臂修前(ALLOWEXTRA)/ r3e 各 ×2。

### 探针分辨力(Tester 先报尺)→ 「未复现」情形的裁定框先立;两条无槽旁证并行(Main_Designer 2026-11-09)
Tester(Fisher 双侧,自写实现对 R 三组参考值全对上):每组 30,对照 0 时 r2 要 6/30 才 p<0.05(5/30 p=0.052、3/30 p=0.237);单档 W 每组 10,5/10 对 0/10 才 p=0.033。按历史速率约 1.5%,W=800(= prep 原路径)每组期望 0.45 次,三组全零概率约 64% → **全零只能写「本规模未复现」,不能写「同级」**;探针有分辨力的前提是 W=300 / 0 把发生率抬上去。历史普查(同 Fisher):A-20b r2 3/192 对 r3 系列 0/635 **p=0.012**;修前 3/229 对 r3 系列 p=0.018;修前 + 旧 r2 + A-20b r2 合计 8/621 对 0/635 p=0.0035;A-20b r2 对修前 p=1.0。混杂:历史行不同负载、不同臂组合,只能当旁证。
**裁(补上节第 1 条的「未复现」分支)**:
- 探针 W=300 / 0 上 r2 显著多于 r3e → 对线上回退,r2 不绿、停线找因(不变)。
- 探针未复现 → **不以 p=0.012 单独挡 r2,也不无视它**;用两条**无槽**旁证定去向,此刻并行起:
  (a) **Tester 翻记录去混杂**:A-20b r2 链的 3 次与 r3 / r3d / r3e 的 635 行各在什么负载下跑(当时 heavy-job 两槽是否都占、同机是否还有别的链 / 浏览器),3 次是否都落在双槽重叠段;修前 3/229 与旧 r2 2/200 同问。只查 owner.txt / 运行时间戳,⛔ 占槽。
  (b) **Reviewer 对 r3e→r2 差异(5 改 2 新)核一条不变量**:差异里没有一行在「新笔记首块懒创建 → POST /blocks → textarea 重挂 → 焦点 / 光标恢复」路径上执行,也没有一行在每个 input 事件上执行(Q2 / Q3 在组封存时跑、Q4 在路由变化时跑、乙在带记录的重开落地时跑——逐条核是不是只在这些时刻)。
  → (a) 负载能解释 **或** (b) 成立:r2 放行,竞态入 TD(记 r3 系列 0/635 这个未解信号),另开单探机理(先探后改,Tester 假设「首块 POST 确认后 textarea 重挂」作候选)。(a) 不能解释 **且** (b) 找到在路径上的行:r2 不封,对那一行开定向探针。
- 预授权(不算扩项):某档 W 出现成群但未到阈值(如 4/10 对 0/10),Tester 可在**只那一档**再跑一轮各 30 后再报,不用先问。

### Tester r2 读数(二):a20m LANDOTHER 5/6 绿 + 1 行 setup error = 光标跳的机理证据;普查重做(Main_Designer 2026-11-09)
LANDOTHER plain 2/2、headline 2/2、heading 1/2 绿(r3e 那轮 6/6);LANDOTHER-heading-0 是 **setup error 不是红**:第二块该是 `plainb`,落成 `ainbpl`,同一光标跳打在 setup 上;heading 第二遍探针后补跑。**机理证据(该行网络时间线,时刻自带)**:8736 POST `/notes/:id/blocks`——**双击后第一个键才发,块是懒创建的**;8794 PUT placement;8822 第一个 text-save 载荷 `pl`(已打 2 键);9599 text-save `ainbpl` → `pl` 后光标落 0 → `ain` 打在前 → `b` 落光标 3。跳在第 2 键后、第 3 键前,紧跟该块 POST blocks 回程(回程时刻缺;发出在第 1 键,60 ms/键)。**范围比假设宽:不只空笔记首行,任何双击新起的块首几键都会撞。** 普查重做(数所有新起块首打词 warmup / plainb / hbody 的乱序形):修前 3/313、旧 A-20 r2 2/204、**A-20b r2 4/206**、A-20b r1 0/74、旧 A-20 r1 0/76、**r3 0/237、r3d 0/190、r3e 0/251**;形状不变,混杂照旧(r2 链与 9 对并行 + builder 14:46 起另一槽 tsc/build)。探针仍等槽(槽 1 = a20n 约 1 h,槽 2 = builder)。
**裁**:(1) 这条升为**日用 🅰 候选**:Henry 双击新起一块就打字,首字会跑到后面(人速 150–250 ms/键、岛上 POST 回程落在首键之后即撞;中文输入法合成期间 textarea 若重挂更糟)——**不论 r2 判语如何,阶段一开单**(先探后改;Tester 探针 = 第一探)。(2) 上节 (a)(b) 两条旁证照派;(b) 改派法:Reviewer 先把「双击新起块 → 首键懒创建 POST → 确认 → textarea 身份 / 焦点 / 光标」这条路径找出来(本身就是机理读),再对 r3e→r2 的 7 个文件核「没有一行在该路径上或每 input 事件上执行」;若顺手看见该路径的文件在 A-20 r2→r3 之间被动过(只看 git log,⛔ 去翻),记一句。(3) LANDOTHER-heading-0 按 setup error 记,补跑后以补跑读数为准。

### Reviewer 旁证 (b) 成立:r3e→r2 差异不在光标跳路径;路径已找出(Main_Designer 2026-11-09;发现在 `reviewer/findings-r2.md`「光标跳路径 vs r2 差异」)
**路径(共享树,全不在 r2 差异里)**:草稿 textarea(`useDraftBlockController`)→ `persistDraft` :479 → POST :525 / PUT :547 → :563 补存循环(在途键)→ 交接 :600–601 读草稿选区 → :620 `flushSync` 挂 `BlockEditorLayer`(key=block.id,Surface:1976)+ `autoFocusSelection` :1999–2006 → 焦点回执 :456 采纳(**在途键再重发草稿,不带选区**)→ `onDraftPersisted` → `pushHistoryEntry` → `textHistory.boundary()`。「第 2 键后第 3 键前」吻合交接时刻;设光标的三处都在共享树。**r2 差异逐条**:commonPrefix / cutText 只在离开;R 只在地址变化;乙只在落地、重开、kept 框自己的 input。两处条件性执行都不碰焦点 / 光标:① Q3 分支可在 createdBlock 的 boundary 封存时跑(封存的是别块的组,新块的键还在草稿里),唯一副作用 `unsent.push`;② 空笔记首块出现时重开 effect 首跑(:662),:686 只对 kept 记录执行,r3e 同时刻同样跑。**git**:四个路径文件最后改动在 `fdeacb5d`(11-08)及更早;A-20 唯一提交 `29b1d456` 不含它们,r2→r3 在 git 里不可分(r3 系列未单独入库);旁注:`29b1d456` 动过补存经过的适配器(+14)与 textFlowEditSession(+8),属 r3e 本体、r2 同样含有。
**裁**:(b) 成立 → 按上节框,**探针「未复现」或「同级」即 r2 放行**;探针若仍显著 r2 > r3e(无一行代码在路径上却有差),停线、先查负载与打包(bundle 体积 / 加载时序)再裁,不预判。(a) Tester 去混杂仍要(为 TD 记因,不再是放行条件)。**给将来那张单的起点**(先探后改):候选机理 = 草稿 textarea → BlockEditorLayer 交接在 POST 确认时发生,选区在挂载前读、在途键重发草稿时不带选区 → 新编辑器光标落 0;探针的 `gone` 时刻(草稿 textarea 被移出文档)应恰在第 2–3 键之间。TD 行随收割写(编号接 TD-77)。

### Tester 旁证 (a) 结果:并发是真混杂、解释一大块但不全;探针改到 seq 跑完后起(Main_Designer 2026-11-09)
方法(未占槽;runner 日志 11-08 前被覆盖过,改用后端 DB 作证):每个探针行 → 该笔记在本地后端 DB 的 `created_at`(只读);同时在场浏览器 = ±90 s 内在任一本地后端建笔记的不同(后端, 账号)数,另算同后端数;CPU = cpu-governor 每分钟整机峰值。**9 次光标跳逐个**(在场 全部 / 同后端,CPU):A-20b r2 ×4 均 3/2,CPU 30–62;旧 r2 ×2 均 3/2,CPU 58、86;修前 ×3:3/1 CPU 86、2/1 CPU 48、**1/1 CPU 38 ← 安静时也会跳**。**r3 系列是不是全在单槽清净时跑的:基本是**——671 个 setup 行里 1 个浏览器 470、2 个 185、≥3 个 16,同后端 ≥2 只占 3%;A-20b r2 195 行 ≥3 个在场 97%、同后端 ≥2 98%(链与 9 对的 r2 侧同打 3612);旧 r2 ≥3 占 47%,修前 9%。**分层后 r3 系列应见几次**(其余组的分层发生率套 r3 系列负载构成):按全部在场分层应见 3.1 次实见 0,P≈0.044;按同后端分层应见 4.6 次,P≈0.010;按 CPU 分层应见 7.4 次,P≈0.001 → **是并发不是 CPU**。结论:并发把「r3 系列全零」从 P≈0.0035 抬到 0.01–0.04,还没抬到不足为奇;总共 9 次、分层事后切,数很薄;(a) 单独不放行,按框落到 (b) + 探针。**探针起跑改时**:原排队一拿到槽就起,那时 a20n 正打 3612,只 r2 组会多一个同后端浏览器,恰把要排除的混杂带进探针、偏向不利 r2 → 已停原排队(未占位、未起浏览器),改为 seq 打印 `seq exit`(步骤 1–4 全完)后再取槽跑 `run-caret.sh`,之后同链补跑 LANDOTHER-heading ×2;代价探针晚约 2 h(seq 3、4 预计 17:00 前后完)。脚本 confound2.py / census2.mjs 随报告归档。
**裁**:(1) 探针顺序照 Tester 改法(seq 先、探针后),⛔ 停 seq 抢跑——r2 判语两样都要,总时长一样,少一次断点续跑的风险;(2) (b) 已成立,(a) 的分层结果转为 TD-77 的「因」注:**并发放大、安静时也会跳(修前 1/1 CPU 38 那次)→ 竞态在静态下存在,不是纯负载产物**,这条决定将来那张单的优先级,不只是 r2 的放行条件;(3) 报告里把那次安静跳单独点出来,并给 r3 系列单浏览器层的行数(470)作该层对照——若探针三组在单浏览器下全零,与 470/0 合起来就是「静态下 r3e 与 r2 同级(都极低)」的最强可得证据。

### 探针意外多跑一遍(停掉的排队子进程存活)→ 看数前预登记:主判 / 复现 / 合并(Main_Designer 2026-11-09)
Tester 更正:15:02 停掉的排队只杀了外壳 bash,里面的 `withslot.sh` 仍在等槽,15:39:48 步骤 3 放槽 1 时抢到,15:39:59–15:51:44 把 pre / r3e / r2 各 30 行跑完(步骤 4 因此晚 12 分钟);之前报「没占过位、没起浏览器」在停的那一刻为真、子进程存活为误。条件按库里 note 建时间核过:无 Tester 别的作业打 3601/3611/3612、builder 槽 2 同样在跑——与按令那遍同条件。数据另存 `caretA/`,**未看**;两遍落同一 `rows.jsonl`,按建时间可无损切开。按令那遍 16:16:07 起,约 16:28 完,后接 LANDOTHER-heading ×2。
**裁(看数前登记)**:(1) **主判 = 按令那遍**;意外那遍单列「未计划的重复」,⛔ 合并进主判。(2) 意外那遍作**复现样本**单独分析单独报(同 Fisher / W 三档);两遍方向不一致 → 本身是发现,不绿,先解释;一致 → 加强。(3) **预登记合并分析作次判**(各 60):只用一个方向——主判不显著而合并显著 r2 > r3e → 仍停线;合并不显著不改主判。即:任一预登记检验显示 r2 显著多于 r3e 就停,全不显示才放行。(4) 不停在跑的那遍。(5) 报告第九节与 Tester METHOD 记「TaskStop 不杀子进程,停排队连 ps 子进程一起清」;重活锁这次挡住了(排队拿槽、未插队),无负载事故。

### Tester r2 读数(三):a20n 收齐——旧臂 52 行与 r3e 逐臂同数、新臂 22 行全合预期;MULTIPASTE 一条归类;复现样本探针三组全零(Main_Designer 2026-11-09)
**旧臂** 28 臂 / 52 行与 r3e-n 逐臂同数;红只 BACKIN-heldhead-undo 0/2 + 第三形 0/1(已裁 🅱);HEADCLOSE-putback 同 r3e。**新臂(r2)**:SHIFTENTER-close / typed-close **ONE**,idle / idletyped 对照 ONE;SURROGATE 断码元 0、无 U+FFFD、😁 落服务器;WINDOWENTER SPLIT;LISTPASTE `item` 落服务器;bare / bareslash / bareaddr 都 HELD-PROCEED 字取回;LINK-close 已撤未跑。**新臂在修前 / r3e**:修前红 18 行(9 臂)、r3e 红 16 行(8 臂);r3e typed-close SPLIT、修前 LOST;修前 WINDOWENTER 落框;**两边没有一行比 r2 好**。0 设置错、0 新起块错位。
**MULTIPASTE 读数(不挡,归类)**:关闭那次保存发 `abcXQdef|qr`,服务器行 `abcXQdef` 屏上从未整行出现(屏上 abcXQ / YQ / def 三行);`def` 同时在服务器与框里,**点 Apply 会出两个 def**;首行没出现预裁的两种记录形(XQ 直接落地);臂规则收「服务器或框」故绿。r3e 同样 def 两处都有且丢 XQ;r1 冒烟已同形。**裁:🅱 → TD-66 附**——kept 记录与关页保存重叠(字既落地又在框)时 Apply 复写;修前 / r3e 既有、r2 不更差;根治在阶段二「框只收不落」(TD-70),或落地时对 kept 记录做「锚点处已有同字 → 丢弃」(与 A-25 D1 的 `placed.text === live.text → null` 同族,只是对象是 kept 记录不是回执);手册已知加一句(随 r2 收割)。
**光标跳 · 复现样本(意外那遍,单列)**:乱序 pre 0/30、r3e 0/30、r2 0/30;W=800/300/0 三档各 0/10;Fisher p=1。时间对照:原 textarea gone 在第 1 键后 25–26 行、在第 2–3 键之间 4–5 行(每组),**这 13 行都没乱 → 「gone 落在 2–3 键之间」在这批数据里不足以导致跳**(Tester 只记事实不推机理);POST blocks 在首键后 7–16 ms 发出,回程时刻缺。**我的读法(记入 TD-77,候探)**:Reviewer 候选机理里真正的窄窗是「在途键在 :600 读选区之后、:456 焦点回执采纳之前到达并被重发草稿不带选区」,交接本身不够;要撞上这几毫秒的窗,50 ms/键的均匀打字很难,并发(事件循环被别的浏览器 / 后端拖长)会把窗拉宽——与 (a) 的「并发放大、静态仍存在」一致。按令那遍跑完按主判 / 复现 / 合并三栏报。

### Tester 判语:A-20b r2 放行;探针三栏无一显示 r2 多于 r3e,唯一一跳在 r3e 上(Main_Designer 2026-11-09)
**主判(按令那遍 16:16–16:28,seq 全完之后)**:乱序 pre 0/30、**r3e 1/30**、r2 0/30;W=800 0/1/0(各 10),W=300 与 W=0 三组全 0/10;Fisher r2 对 r3e p=1、对 pre p=1。**复现(意外那遍)**:三组 0/30,方向一致。**次判(合并各 60)**:pre 0/60、r3e 1/60、r2 0/60,p=1。**r3e 那一行** CARET-w800-1:服务器 `["rmup","wa"]`,r3 家族有记录以来第一次跳;跳在第 2 键后(新 textarea 首个 input 值 `rwa` 光标 1),POST blocks 在第 1 键后 22 ms 发出,原 textarea 在第 2–3 键之间离开文档。**给 TD-77 的事实**:两遍合计「gone 落在第 2–3 键之间」的行 pre 9 / r3e 10 / r2 11 = 30 行,跳 1 行 → 窗口是必要不充分;静态单浏览器下三个构建都极低且同级。**LANDOTHER-heading 补跑 2/2 绿**,以补跑为准。
**裁:收判语,A-20b r2 放行 → 第 24 轮。** 光标跳:岛上 r3e 已含(静态下 1/60),r2 不引入不加重;TD-77 记「岛上既有」。Tester 接着:Opus 反驳工作流复核报告与数(她的槽)→ 落证据 → 登记 verdicts → pre-harvest-scan ⛔0 → 通知收割。我收割:copy-back 19 文件 + tsc(等槽)→ 手册(删已知 11–13、加 MULTIPASTE 一句)→ 看板 / 台账 §364 → 扫描 → 提交推送 → 报版本给 Tester → ack → 上岛(纯前端 `build:client`,不重启,预期主 JS `index-Db4qSSYo.js` sha256 `2f09b0be…`)。

### Tester 交齐(报告经 Opus 四路反驳 + 第二读者,25 条确认 22,判语不变);七条更正收进我这边的记录(Main_Designer 2026-11-09)
报告 `docs/audits/2026-11-09-a20b-builder/tester/review-tester.md`(证据 217 文件,扫描 ⛔0);verdicts 加行、STATUS 覆盖、METHOD 第七节补「TaskStop 只停外壳」第二次 + `stopq.sh`;日志改名 `*.log.txt`(`.gitignore` 丢 `*.log`、扫描器跳过被忽略文件);补 `gate/oracle-a20b-r2.txt`、`gate/caret-note-times.txt`、CLICKBACK-end 已裁项。两槽 16:55 起都空。**更正(以本节为准,上文各节相应句作废)**:
1. MULTIPASTE 的「修前 / r3e 既有」→ **r3e 既有,修前无框**(修前 XQ、YQ 都丢,def 只在服务器);🅱 归类照旧,对两基线都不更差;规格 1 本就把此形写作「副作用(接受)」。
2. 手册「别 Apply(会出两个 def)」**错**:重开时该块无 Apply(两行 Apply false),框里只有 Discard;只有人把框里的 def 粘回去才重复 → 改为「框里的 def 是副本,直接 Discard,别粘回」。
3. 「关闭那次保存发 `abcXQdef|qr`」**错**:关页前只发过被扣的 `abcdef|qr`;`abcXQdef|qr` 是重开后由上一页回执自动重放发出(4946 / 4895 ms),重开时有「A previous block edit is queued for recovery」提示。
4. SURROGATE-paste-close 同形:`😀def` 既在服务器(`abc😁😀def`)又作 split 记录在框;r3e 同形、修前无框 → **裁:与 MULTIPASTE 同归 TD-66 附,手册那句改成覆盖「粘进去的内容带换行」一族**。
5. TD-77 事实改口径:按页面 input 事件算,第 2 键落进原 textarea 后它才离开的两遍合计 **17 行**(修前 5 / r3e 6 / r2 6),跳 1 行;按探针发键时刻是 30 行,差的 13 行里第 2 键其实落进了新 textarea(晚 2–20 ms)。跳的那行与其余 16 行三处差别:**a.** 新 textarea 获焦时值是 `w`、少了原 textarea 已有的第 2 键(180 行独此一行,其余 `wa`);**b.** 获焦比原 textarea 离开早 25 ms(其余 4–13 ms);**c.** 建块 POST 在第 1 键后 22 ms 发出(其余 7–8 ms)。我写的「窄窗在交接内部某几毫秒」是推断、数据没量到交接内部 → TD-77 只记三条事实,候选机理单独标「Reviewer 读码候选,未量」。
6. 分辨力:每组 30 时 r2 要约 8/30 才与 r3e 的 1/30 显著;0/60 的 95% 上界约 6% → 结论只写「**没有证据显示 r2 高于 r3e**」,⛔「已证同级」;放行仍按预登记规则。
7. 「单浏览器层」更名「**1 个活账号层**」(±90 s 活账号口径会把同一浏览器轮换账号、前后衔接作业算进去;单浏览器探针 180 行读数 2–3);r3 族该层 **476/0**。
Tester 临时环境(5601/5611/5612/5613)留到第 24 轮部署后核对,阶段末统一清。**→ copy-back 开始。**
