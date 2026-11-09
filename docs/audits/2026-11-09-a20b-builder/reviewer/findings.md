> **状态 (Status)**: active
> **层 (Layer)**: 审计 / Audit(Reviewer 发现,只出发现不裁定)
> **日期 (Updated)**: 2026-11-09
> **权威 (Authoritative)**: 否(发现);裁定归 Main_Designer

# A-20b 包小核 · Reviewer 发现

**总判:不挡。** 四条不变量里,①、③ 成立;② 有一处与订单 / 回执说法不符;④ 有一半测试债没还上。
- 本单没有 ③,也没有确认的 🅰。
- 有两条确认的出入,建议都按 🅱 处理:
  - **R1**:订单点名的 Q3 四条命中路里,有两条新支接不到。一是插行内链接,二是接受 agent 补丁。
  - **R2**:Q5(a) 只测到 `??` 回退那一半,isVisitReceipt 那一半没测到。
- 一条疑似(🅱):**R3**,commonPrefix 会把一对代理码元从中间切开。
- 另有一条表的覆盖(**R4**)和三条观察(O1–O3)。

**读法与范围**
- 包:`<ops>/packages/a20b-belt-coverage`,只读 `src/`。不在包里的文件读共享树。回执写明基线 `04f6f822` 之后,共享树没有提交改过 client/src,标「共享树」的行号即基线行号。
- 前缀(都在 `client/src/pages/Notes/canvasEngine/` 下):
  - H = `hooks/useTextFlowHistory.ts`
  - R = `hooks/useNoteRouteSaveBoundary.tsx`
  - C = `hooks/useNoteCanvasRuntimeController.ts`
  - HSC = `hooks/useHeadingStructureController.ts`
  - CT = `hooks/useNoteCanvasRuntimeController.test.tsx`
  - LT = `hooks/useNoteRouteSaveBoundary.leave.test.tsx`
- 路由源码:`client/node_modules/@remix-run/router/dist/router.cjs.js`(1.23.2)。
- 纯读码,没跑测试,没构建,没取锁。没起子代理。token:不可得。

---

## 发现

### R1(确认;建议 🅱):Q3 的四条命中路里,新支只接到两条

**不变量**:订单规格 2、回执 ② 和 H:197–199 的注释都说,新支 `sameUnitsTextChanged` 接住四种组:列表形单行粘贴、`# ` 粘贴、插行内链接、接受 agent 补丁。逐条核下来,后两条接不到。

**插行内链接接不到。**
- 链接组的路径:`NoteWritingSurfaceLayer.tsx:1613–1619`(共享树)→ `appendInlineLink`(`inlineLinkService.ts:36–48`,共享树)。
- `appendInlineLink` 只往 `inline_structures` 追加一条记录,单元的 `text` 一字不变。
- 所以 H:204 的 `after.some((unit, index) => unit.text !== before[index].text)` 为假,四支都不中,这个组不进任何账。
- 就算它进了账也没用:H:808 `if (was === unit.text) continue;` 会跳过它,不出记录。
- 保管的记录(`UnplacedWords`)本来就只存单元文字,没有地方放 inline structure。
- 结论:链接在「关页丢」这件事上,不归这条保险带管。

**接受 agent 补丁接不到。**
- `useNoteAgentHumanEditor.ts:50–55`(共享树)发出的 metadata 带 `proposalPatch`。
- `onSeal` 在 H:667 先走 proposal 分支,到 H:698 就 `return`,根本到不了 H:707–711 的入账链。
- 这类组的字是 agent 提案里的字,提案在服务器上仍是 pending,可以再接受一次。所以这不是「人写的字丢了」。

**影响**
- 不丢人写的字,不比修前差。
- 说法不对,会误导验收:
  - Tester 的 LINK-close 臂在 A-20b 上也不会出记录。若按「r3e 红、A-20b 绿」写期望,会误判成回归。
  - 手册「已知」里删 Q3 那句时,如果把「插链接」也算作已修,就会多删。
- 建议:
  - 改 H:197–199 的注释和回执 ②,命中路只留「列表形 / `# ` 单行粘贴」两条。另有 R 外的一条:Shift+Enter,见「② 逐条」第 3 类。
  - LINK-close 臂要么不加,要么期望写成「无记录(保管记录只存文字)」。
  - 「关页时插的链接是否保得住」若要管,另立一条 TD,与本单无关。

### R2(确认;建议 🅱,测试债没还完):Q5(a) 只走到 `??` 回退,没走到 `isVisitReceipt` 过滤

**不变量**:订单规格 4(a) 要求加一条穿真 controller 的测试,覆盖 C:417–419 的两件事:一是 `??` 回退,二是 `isVisitReceipt` 过滤。

**实情**
- CT:555–577 有两例,都只塞了 `offered-other-visit` 和 `apply-settling` 两张回执。
- C:384 的 `textHistory` 是真的 `useTextFlowHistory`(CT 没有 mock 它)。它的 `visitReceipts` 是空的,所以 `isVisitReceipt` 对两个 key 都返回 false。
- 结果是 C:419 的 `.filter((receipt) => !textHistory.isVisitReceipt(...))` 在两例里都等于不过滤。

**反例(变异)**:删掉 C:419 的 `.filter(...)`,两例仍然绿。C:408 那条 queue 列表也一样。

**断言本身不会把 undefined 吞成绿**(主设计点名的 :51 / :568 / :575):
- `headingStructureInput?.recoveryReceipts?.map(...)` 若没被调用,或拿到 undefined,结果是 `undefined`。`toEqual([...])` 对数组会红。
- `(entry as { recoveryKey?: string })` 若缺 key,结果里会出现 `undefined` 元素,也会红。
- :51 只是类型注解,不进运行时。
- 所以吞绿的问题不存在,缺口只在「没有一张本次访问自己留下的回执」。

**建议**:补一例。制造一张本次访问自己留下的回执:让 `textHistory` 的一次保存失败,并带回执(走 H:341–344 的 `visitReceipts.add`)。再断言 HSC 收到的列表里没有它。

### R3(疑似;建议 🅱):commonPrefix 按 UTF-16 码元比,会切开一对代理码元

**触发序列**
1. 行文 `abc😀def`。
2. 光标在 `abc|`(粘贴点按字素对齐,`textUnitEditorService.ts:408`,共享树)。
3. 粘贴 `😁⏎Y`,首段成 `abc😁`。
4. 上一保存还在途,关页。

**取值**
- 😀 = `😀`,😁 = `😁`,两者高位码元相同。
- `commonPrefix('abc😀def', 'abc😁')` = `'abc\uD83D'`(H:58–62),末尾是一个孤立的高位码元。
- 离开时记录 `initialText = 'abc\uD83D'`,`text = 'abc😁'`(H:838–839)。
- 重开落地走 `mergeTypedText(live='abc😀def', initial='abc\uD83D', typed='abc😁')`(HSC:68–97):
  - HSC:75 得 `start = 4`,`inserted = '\uDE01'`,`at = 4`;
  - 结果 = `'abc😁' + '\uDE00def'` = `abc😁` + 一个孤立的低位码元 + `def`。

**后果**
- 一行里多出一个坏字符。存 SQLite 时 UTF-8 编码大概率会把它换成 U+FFFD,这一点没核。
- 粘贴的 😁 和原文 😀 都没丢:😀 在框里那条 split 记录 `😀def` 里完好。所以不是丢字,是插进一个坏字。
- 选区替换同理:`ab😀def` 选中 `😀def`,粘 `😁⏎Z`。

**同族的既有问题(不是本单引入)**
- `mergeTypedText` 自己的前缀循环(HSC:75)本来就按码元比。
- 一条 edit 记录把 😀 换成同高位的 😁 时(例如 O1 那种 settleKept 改写之后),同样会插出孤立码元。
- commonPrefix 是这个问题的新入口。

**建议**
- commonPrefix 的结果若以高位码元结尾就退一位,改动一行。
- `mergeTypedText` 记一条 TD。
- 频率很低:要求光标后的字和粘贴首字都在同一个代理区段(表情、CJK 扩展 B 等)。中文常用字都在 BMP 里,不受影响。

### R4(🅱):Q5(b) 那张表与路由「同源」靠的是手抄,另漏一形

**同源**
- LT:497–504 的路由树与 App.tsx:92–127 的形状一致,四点都对得上:
  - 外层有无路径的 layout;
  - `/login`、`/register`;
  - `/` 下有 `notes/:noteId`;
  - `*`;
  - 都没写 `caseSensitive`。
- App 的 `/` 下还有 19 条别的子路由,表里省了。这些子路由都不以 `notes` 开头,不会抢 `/notes/x`。对「本篇 / 登录 / 别处」三分类,省掉不改判,这一点我核过。
- 但它是**抄来的**,不是从 App 导入的:App.tsx 的 `router` 在模块顶层建,没有导出路由树。
- 所以,App 改了路由形(给 `notes/:noteId` 加 `caseSensitive`、换路径、加 basename),这张表不会红。「不变量只写一次」在测试这一侧还差最后一跳。
- 建议:把路由元素树抽成导出常量,App 和这张表共用。

**漏的一形:空 hash `''`**
- 谓词在运行时拿到的输入是 `new URL(navigate.destination.url).hash`(R:249)。URL 规范对 `…/#` 和 `…/` 都给 `''`。
- 表里只有 `'#'`,没有 `''`。按读码,`hashRoutePath('')` 也得 `/`,与路由一致,但没有测到。
- 可以加一行:路由那一侧用 `replaceState(null, '', location.pathname)` 造无 hash 的地址,谓词这一侧喂 `''`。

**另一形(分类相同,只作记录)**:`#./notes/note-a`
- 路由对以 `.` 开头的路径**不**补 `/`(router.cjs.js:278)。R:25 补了,得 `/./notes/note-a`。
- 两边归一后的串不同,但分类相同:
  - 路由一侧,`./notes/note-a` 匹配不到任何路由,落到短路的错误匹配,叶子没有 path,判「别处」;
  - 谓词一侧,`/./notes/note-a` 也判「别处」。
- R:24 注释里的「as in the router」严格说不包括 `.` 开头这一形。不影响行为。

---

## 四条逐核

### ① commonPrefix(H:58–62,用在 H:814)

| 不变量 / 形 | 结果 | 依据 |
|---|---|---|
| text 是 was 的前缀 ⇒ 结果 === text(一切回车都与 r3e 逐字相同) | **成立** | 循环在 `end = text.length` 停,因为前面每一位都相等。返回 `was.slice(0, text.length) === text`。回车走 `splitTextUnitForEnter`(TextBlockProjection:1340–1342,共享树),前半段总是原文前缀,带选区回车也一样。 |
| 多行粘贴 `('abcdef','abcX')` | `'abc'` | 第 4 位 `d≠X`。 |
| 选区替换 `('abcdef','abX')` | `'ab'` | 第 3 位 `c≠X`。 |
| 落地不丢粘进来的字 | **成立**(代理码元情形见 R3) | P = commonPrefix(W,T) 总是 T 的前缀 ⇒ HSC:75 得 `start=|P|`,`end` 被 HSC:77 限成 0 ⇒ 落地 = `T + W[|P|:]`。T 整段保住,W 的余下部分在框里另有 split 记录,多出来,不丢。 |
| 巧合:粘贴首字恰好等于光标后的原字(`abc|def` 粘 `dX⏎Y`) | `'abcd'` | 落地 = `abcdX` + `ef`。粘的 `d` 与原来的 `d` 都还在(框里有 `def`)。不丢。 |
| `!cutText.has(key)` 只取第一个分裂组的切点 | **与 r3e 同值** | 分三种序列看,下面逐条列。 |

`!cutText.has(key)` 的三种序列:
- **先回车,再在前半段打字**:切点由回车组定,为 `'abc'`,与 r3e 相同。后面的打字组不是 split,不碰 cutText。
- **先回车,再在前半段多行粘贴**:切点仍是回车给的 `'abc'`,与 r3e 相同。
- **先粘贴,再回车**:A-20b 得 `'abc'`,r3e 得 `'abcX'`(那正是 Q2 的病)。这是有意的改动,只会更好。
- 另外,输入法组合期间回车被并进同一组的情形(textFlowEditSession:106–141 组合中不封组),也属「组后文不是组前文前缀」,同样只会更好。

### ② Q3 新支(H:200–205,在入账链 H:707–711 第三位)

**互斥**:由 if / else-if 链保证。新支只接前两支都不要的组,不从别的账里抢组。成立。

**比对方式**,两点都核过:
- 比的是 id **序列**:`JSON.stringify` 两个数组,顺序敏感。成立。
- 含 deleted 单元的文字:H:204 遍历的是 `after` 全部单元,没有按 status 过滤;同序列保证 `before[index]` 一定存在。成立。

**完备性**:每个组要么恰入一张账,要么明确不入且有理由。逐类列:

| 类 | 去向 | 依据 |
|---|---|---|
| 打字(同序列、非换行 inputType) | `unsent`(第 1 支) | H:206–209 |
| 增单元 / 减单元 | `unsentSplits`(第 2 支) | H:187–196 |
| 结构组,同序列,文字变(列表形或 `# ` 单行粘贴) | `unsent`(第 3 支) | 粘贴路由在 TextBlockProjection:1499–1505,共享树 |
| **第 3 类:打字 kind 的 `insertLineBreak` / `insertParagraph`,单元不变** | r3e **哪本账都不进**;A-20b 被第 3 支接住 → `unsent` | 非标题单元的 Shift+Enter 不被拦(TextBlockProjection:1340 只拦「无 shift 或标题」),原生 textarea 换行,kind 为 typing、inputType 为 `insertLineBreak`(:971),第 1 支在 H:207 排除了它。**回执和订单都没提。**r3e 上只会丢「最后一个 Shift+Enter 换行、之后没再打字」的那个换行符(之后的打字组会把整行终值带进记录)。A-20b 顺带补上了。建议 Tester 加一条便宜的臂。 |
| (a) 同序列、文字全同(只改角色 / 缩进 / 行内结构) | 不入,**理由成立**(没有字可丢) | Tab 缩进(TextBlockProjection:1370–1377)、标题角色、**插行内链接**(R1)都在这里 |
| (b) 同集换序 | 不入 | 在 onSeal 的生产者里没找到同块内重排单元的路径。`moveTextUnit` / `extractTextUnit` 走 DocumentTransaction(H:1043–1136),不经 onSeal。**未找到反例。**若想去掉这类残余,把 H:203 改成按 id 对照(`ends` 循环本来就按 id),不影响别的。 |
| 组前快照为空 | 不会漏 | before 为空、after 不空 ⇒ isSplit 为真;两边都空 ⇒ textFlowEditSession:105 的 `same` 不封组。 |
| kind 不是 typing / structural | 不存在 | `TextFlowEditMetadata.kind` 的类型就是这两个值的联合(textFlowEditSession:16),所有生产者都写字面量。 |
| status 在 deleted ↔ active 之间翻,文字不变 | 不入 | 在文字编辑的生产者里**没找到**会翻 status 的路径。未找到。 |
| 带 `proposalPatch` 的组 | 在入账链之前分流 | H:667–698(R1) |

**`unsent` 的别处用法与 kind 无关**:H:181–186、H:311–314、H:331(M5 退回原账)、H:716–719、H:794 都按对象身份取,不看 kind。Q3 组进 `unsent` 不会被哪里当成打字特殊处理。成立。

### ③ Q4(R:17–27):与路由逐形对照

路由的读法(router.cjs.js:268–280,以及 matchRoutes 的 decodePath):
1. `parsePath`;
2. 若不以 `/` **且不以 `.`** 开头,补 `/`;
3. 匹配时 `decodePath` 逐段解码,`/` 保持为 `%2F`;
4. 末尾斜杠由 `\/*$` 吞掉。

R 的顺序是先解码、再补 `/`、再去尾斜杠。解码不会造出前导 `/`:段内的 `/` 被重新编码成 `%2F`。所以「先补后解」与「先解后补」得同一串。

| 形 | 路由 | R:17–27 | 一致 |
|---|---|---|---|
| `#notes/<id>` | `/notes/<id>` 本篇 | `/notes/<id>` 本篇 | ✓ |
| `#notes/<id>/` | 本篇(`\/*$`) | 去尾后为 `/notes/<id>`,本篇 | ✓ |
| `#/` | `/` | `/` | ✓ |
| `#`,运行时实际输入为 `''` | `parsePath('')` 的 pathname 缺省为 `/` | `''` → 补成 `/` | ✓(表里没测 `''`,见 R4) |
| 空 hash(无 `#`),输入为 `''` | `/` | `/` | ✓ |
| `#?x`、`##x` | `/` | `/` | ✓ |
| `#login`、`#register` | `/login`、`/register` | 同 | ✓ |
| `#%2Fnotes/<id>` | 补 `/` 后解码,得 `/%2Fnotes/<id>`,别处 | 解码后补 `/`,得 `/%2Fnotes/<id>`,别处 | ✓ |
| `#//notes/<id>` | 子路由正则 `^\/notes\/…` 不中,别处 | 正则不中,别处 | ✓ |
| `#./notes/<id>` | 不补 `/`,无匹配,别处 | 补成 `/./notes/<id>`,别处 | 分类 ✓,串不同(R4) |
| 坏的百分号编码 | `decodePath` 整串原样返回 | `catch` 整串原样 | ✓ |

### ④ Q5 两条

- **(b)** 表在 LT:493 起,共 25 行。路由形与 App.tsx 同形,但不同源(R4)。漏 `''` 一形(R4)。分类的取法,即 LT:506–509 的叶子 path 与 params,是路由自己给的,没有手写期望值。成立。
- **(a)** CT:51 / :568 / :575 不会把 undefined 吞成绿(见 R2)。缺 isVisitReceipt 那一半(R2)。「Proxy 吞缺键」这一条(回执 ④)我核过:CT:120–124 对缺失键返回 `noop`;CT:117–118 用展开式让键「存在而值为 undefined」,这样第二例才能走到 `??`。回执说得对。

---

## 观察(不是发现)

- **O1**:订单的 Q2 阳性对照写的是「上一保存在途」。若在途的是**同一块**的保存,关页后它一确认,H:340 → `settleKept`(H:866–882)就会把记录的 `initialText` 从 `'abc'` 改写成服务器持有的全文 `'abcdef'`。记录变成 `abcdef → abcX`。重开落地时 `live === initial`,整行换成 `abcX`(HSC:73),`def` 只留在框里。X 两种时序下都保住了,但 Tester 臂的期望最好两形都认:`abc → abcX` 或 `abcdef → abcX`。r3e 上在这两种时序里,X 都哪里也没有。
- **O2**:helper 插在 H:56 的 JSDoc(`/** A-20: after this long … */`)和 `IDLE_SAVE_MS`(H:64)之间。这条文档注释现在挂到了 `commonPrefix` 头上,`IDLE_SAVE_MS` 没了文档。纯外观问题。
- **O3**:改动范围与主设计核过的一致。对 r3e 而言,源码只动了 H(+21 行:helper、新谓词、入账一支、cutText 一行)和 R(+3 行:补 `/`、`isSignInPath` 导出)。没碰服务器和契约。
