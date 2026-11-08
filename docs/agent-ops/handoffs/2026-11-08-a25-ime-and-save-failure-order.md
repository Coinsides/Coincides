> **状态 (Status)**: active
> **层 (Layer)**: 交接 / Handoff(订单;本文件只放 A-25,别单⛔追加)
> **日期 (Updated)**: 2026-11-08
> **权威 (Authoritative)**: 是(规格与裁定);判语归 Tester,发现归 Reviewer,裁定、收割、部署归 Main_Designer

# A-25 · 输入法拼音写进笔记 + 保存失败后的死路(阶段一「写字不丢」第二单)

## 单卡(现行,覆盖写)

> 每块一个主人,只用 Edit 改自己那块。按 `operating-workflow.md` §6(Henry 2026-11-08 批):验收臂先于施工;不无据预裁;每单一文件;验过即上岛。

### 状态(Main_Designer)

| 项 | 阶段 | 持有者 | 下一步 | 更新 |
|---|---|---|---|---|
| A-25 必修(①输入法 ②保存失败死路 ③H1/H2) | 探针先行 | Tester | Tester 写三组探针交 builder(等 A-20 包的空档);builder 封 A-20 包后开第一段「查」 | 2026-11-08 |
| A-25 内务(八项,见下) | 出阶段 | Main_Designer | 阶段二;本单⛔碰 | 2026-11-08 |

**现行有效的裁定**(一条一行)

- 范围:必修三条进阶段一,其余八项出阶段 ← 本文件「范围」节(Henry 11-08:「A-25 也进队」+「回大陆前推进到我能日常使用」)
- 先查后修:①②③各先交机理与修法代价,再裁;只有有证据的地方预裁 ← 「第一段 · 查」
- ①输入法:修根因,⛔ 靠延迟绕过;组合中不挪焦点、不换主 ← 原 A-25 条目(2026-11-06)
- ②保存失败:⛔ 无提示只读;失败保持必须可见可操作 ← 编辑器组第二轮裁定 §3「失败保持必须可见可操作(Retry/Undo),⛔ 无提示只读」
- ②b LANDFAIL 闸(Tester 探针 `LANDFAIL-<500|net>-i` 修前 (a)(b)(c)(d) 红、(e) 绿):**放行闸 = (a) 另一块能打字 + (c) 网络恢复后留住的字在退避上限内自动落地、服务器有 + (d) 恰好一份 + (e) 不退步**;**(b) 弱形式**——须有常驻、可操作、说真话的入口,恢复横幅的 Apply 算(前提:网络恢复后点它真能落地),专用 Retry / 复制 / Discard 若能复用 ②a 的控件则用,由 Q2 定 ← Main_Designer 2026-11-08 答 Tester
- (e) 提示闸重裁(Tester 以 `watchN` 逐次计数后,修前 ②a 「Failed to save block」×2 + 「Text changes could not be saved. Retry saving…」×2 在 0.2 秒内;②b 打 7 键出 7 条「Heading changes could not be completed. Undo…」):**②a (e) 从「不退步」改为「须改善」——一次失败事件各类提示合计 ≤1 条,且常驻控件在屏期间同一块不再弹提示(控件就是指示器)**;**②b (e) = 一次失败 ≤1 条、⛔ 逐键提示**(0 条/键);两者都要在修前红、包上绿 ← Main_Designer 2026-11-08 答 Tester
- CHAIN(重试链 `[k0 k1]` → `[k0 | k2]` 冲掉 k1):builder 的 jsdom 守恒闸臂在冻结版红;Tester 按 builder 种子在真浏览器四形 + 种子形共 6 行修前全绿(写序 REJECTED → `kzero kone` → `kzero kone|` → `kzero kone|ktwo` → 撤销后 `kzero kone|`,那条没 k1 的写从未出现)→ **闸 = builder 的 jsdom 臂,浏览器臂 CHAIN 作冒烟**;A-25 查报 Q2 要写明 jsdom 与真浏览器在这条路上时序为何不同、哪个更接近真实用户 ← Main_Designer 2026-11-08
- 红线:单写者不变;⛔ 服务端;⛔ F9;⛔ A-20 正在改的两文件之外再碰 history 记账层(A-20 收割前 A-25 的 scratch 从 A-20 包 + `04f6f822` 建,避免两单撞同一文件)

### 验收条件(Tester,探针先行)

**探针**：ops 私有目录 `tester-kit/a25/`，不进仓库。用法、判据和修前数都写在里面的 `README.md`；`analyze-a25.mjs` 按组打印判据。builder 封包前在自己的修后环境跑同一套，红就不封包；Tester 拿到包后再跑一遍。真 Chrome 加 CDP，本地后端，临时账号，不碰岛。

修前数在 `04f6f822` 等价环境上跑，样本少，只为证明探针红得出来。A-25 真正的底（A-20 包加 `04f6f822`）有了以后，我在那个底上再跑一遍修前。

| 组 | 修后判据 | 修前（`04f6f822` 等价） |
|---|---|---|
| ① IME-new（新笔记第一行，24 轮） | 服务器上那一行恰好是「第一测试」，24/24 | **红** 2/2：`d第一测试`，拼音首字母留在笔记里 |
| ① IME-mid（持久编辑器中间行，24 轮，不退步臂） | `[warmup, 第一测试, tail]`，24/24 | 绿 2/2 |
| ②a SAVEFAIL（500 / 断网 × 直接点 B / 先点外面再点 B） | 五项全过：(a) 另一块能打字；(b) 失败后 8 秒，屏上有常驻的 Retry、复制或 Discard，不是 toast；(c) 网络恢复后不动手，30 秒内服务器补齐；(d) 两句各恰好一份、在各自的块；(e) 「Failed to save block」最多一次 | (a) **绿**；(b) **红**，只有带 Apply/Dismiss 的恢复横幅；(c) **红**，30 秒没补齐；(d) **红**；(e) **红**（11-08 改按逐次计数复测）：每个变体都是「Failed to save block」2 次，另有「Text changes could not be saved」2 次。我先前写的「绿」用的是按文字去重的计数，作废。四个变体各 1 次，结果一致 |
| ②b LANDFAIL（500 / 断网 × auto / apply，2026-11-08 加）：先让「# head ⏎ body」的建块请求失败一次，字进留字框；再在所有 text-save 都失败的情况下重开笔记，留住的字尝试落地并失败；然后点 warmup 那一行行末打「 plus w」。网络恢复后，auto 不动手等 30 秒；apply 立刻点 Apply（有 Retry 就点 Retry），等 12 秒 | 按 Main_Designer 裁定（`f28c7914`）。auto 要过四项：(a) warmup 那一行收得到键；(c) 留住的字和新打的字都在退避上限内自己落到服务器；(d) 各恰好一份；(e) 不退步。apply 要过：(b) 弱形式，即失败期间有常驻控件（恢复横幅的 Apply 也算），网络恢复后点它确实能落地；外加 (a)(d)(e)。 | auto：(a) **红**，焦点确实在 warmup 那一行的编辑框上，打的字没上屏；(c) **红**，网络恢复后 30 秒内一次 text-save 也没再发，服务器停在 `[warmup, 空的标题行]`；(d) **红**；(e) 绿，整段没有「Failed to save block」；失败期间只有带 Apply/Dismiss 的恢复横幅，横幅里是 warmup head body。apply：(a) **红**；(b) 绿，点 Apply 约 4 秒后 head 和 body 上了服务器；(d) 绿；(e) 绿。四个变体各 1 次 |
| ③ H1（2 轮） | 注入的异常确实抛出，且第二条留住的记录也落地 | **红** 2/2：在第一条落地时关闭留字框处抛出，alpha 落了，beta 一直没落 |
| ③ H2 | **只作冒烟，不作判据** | 浏览器打不中「入队到执行」那个窗口：锚点一补全，记录当场落地。H2 的判据请用 builder 第一段 Q3 写的「冻结版红」单元测试 |

- ②a 的 (a) 在修前就是绿的：普通保存失败后，不管怎么点过去，另一块都能打字。订单里写的「整篇拒键」只出现在 ②b：上面那一行是在同一套探针里坐实的（拒键时焦点在 warmup 编辑框上，排除了没点中）。(e) 逐次计数后：②a 修前每次失败 2 条，是红的，(e) 从「不退步」变成「要修好」，闸由 Main_Designer 重定；②b 修前 0 条「Failed to save block」，但打 7 个键弹了 7 条「Heading changes could not be completed」，一键一条。计数用 `watchN()`（逐个提示元素记录）。旧的 `watch()` 同一段文字只记一次，分不出一次和每次。
- 输入法是**模拟**的：每个拼音字母一次 `Input.imeSetComposition`，再一次 `Input.insertText` 提交整词。真输入法要等 Henry 上岛亲验。
- 回归（A-18 三固定项、r2.3c 代表臂、A-20 的 (B) 臂与离开臂、1a 切换）沿用我已有的探针，不在本工具包里。

### 改动清单 / 自报数字 / 代码回答(builder,回执区在文末)

## 范围

**必修(阶段一;每天会撞)**

| # | 条目 | 来源 | 级别 |
|---|---|---|---|
| ① | **新笔记第一行用输入法打字,拼音被写进笔记**(`diyi第一段甲乙`、`ceshi测试`;修前 24/24)。机理(Tester):第一次组合期间块被建出来,交接时焦点被挪走,Chrome 失焦把组合串原样提交。要做:块的创建与交接不能打断组合——组合中不挪焦点、不换主,等 `compositionend` 后再交接,或交接后接回组合。**修根因,⛔ 靠延迟绕过** | 编辑器组核验 2026-11-06,旧线索 #11;A-18「草稿交接已原子」在只建块路径上不成立(leads-2) | 🅰 既有 |
| ② | **保存失败后的死路——两条路,Tester 探针坐实后拆开**(2026-11-08 更正:我原文把两条混成一条):**②a 普通 text-save 失败**(500 / 断网):不自动重试、没有常驻 Retry / 复制 / Discard 控件,只有两条一闪即没的提示(适配器那条、`useNoteCanvasRuntimeController.ts:391` 那条);另一块仍能打字(修前即如此,不退步臂)、「Failed to save block」修前就只弹一次(不退步臂)。要做:常驻控件 + 退避自动重试、网络恢复即追平。**②b LANDFAIL**(留字框的字落地失败):整篇笔记拒键直到编辑器失焦、不自动重试;说明书现写「先点一下正在写的那一行,再点一下笔记外面」。要做:拒键范围收到那一块(或不拒)、同一套控件与重试。Q2 要把两条路各自的行号与修法分开答 | 编辑器组 r2.3c 判语归类 2(LANDFAIL);Tester 两次更正后的定论;Reviewer 「⛔ 无提示只读的顾虑成立」 | 🅱 偏重(日用每次断网都撞) |
| ③ | **H1**:后台落地队列任务同步抛异常 → `landingScheduled` 永真,本次挂载后台落地全停(修法方向 try/finally);**H2**:入队到执行间换笔记 → `C:482` 对 `!live` 直接 return,重试链断,等整页重载(修法方向走 retryTimer) | Reviewer r2.3c 复核 H1/H2 | 🅱(② 类,触发即丢后台落地) |

**内务(出阶段;阶段二或停车场;本单⛔碰)**

| 条目 | 去处 |
|---|---|
| 结构非原子:乱序 1/15、空残块、GEO-long-0、「快离开后同块未拆」②′;`typedTextIsPlaced` 跨行界误判(注入可复现、自然路径未触发) | 阶段二设计单「结构事务化」 |
| KRO「等待中打字进窗口」(A-18 时期既有) | 同上 |
| Y1 单元 id 可复用 + 同角色 + 空 → 留住的字误落(与 clientCreateKey 同题,L-013) | 同上 |
| leads-2(草稿交接非原子,只建块路径;冻结红测试在 `leads2-withdrawn/`) | 随 ① 查报定:若 ① 的根因修法顺带覆盖则并入,否则阶段二 |
| H3(G2 守卫缺「删 C:241 即红」对照)、TD-58(跟随定时器测试环境空转)、重开时旧框元素未 `close()` 的无害泄漏、`lastBatch` 换笔记不重置 | 下次动控制器的单随手入 |
| 两个恢复入口(横幅 Apply 与留字框)合一 | 阶段二设计 |
| G4 文案「可能会自己回去;没回去就复制或 Discard」 | 随 ② 的控件文案一并(② 做了它就自然有) |

## 第一段 · 查(builder;封完 A-20 包后开;交 `docs/audits/2026-11-08-a25-builder/survey.md`;半天内)

行号对 **A-20 包 + `04f6f822`**(A-25 的 scratch 从这个底建,A-20 收割后换成收割提交号重核一次哈希)。事实与建议分开。

- **Q1 输入法**:①第一次组合期间块被建出来的那条路(草稿控制器 → 持久编辑器交接)具体哪几行挪了焦点 / 换了主;②`compositionstart` / `compositionend` 在交接路径上有没有被看;③三条修法各改哪些行、风险:(a) 组合中不交接,`compositionend` 后再交接(交接前的组合结果如何带过去);(b) 交接但不挪焦点(新主接管组合是否可能);(c) 交接后把组合接回;④真输入法与 CDP `Input.imeSetComposition` 模拟的差别,哪一种能在本机复现 24/24;⑤leads-2 的冻结红测试在 (a)/(b)/(c) 下各自绿不绿。
- **Q2 保存失败**:①「整篇拒键直到失焦」**只在 LANDFAIL 路上**(Tester 坐实;普通 text-save 失败另一块能打字)——是哪几行造成的,为什么是整篇不是那一块;普通失败路与 LANDFAIL 路的失败保持各走哪几行;②失焦触发重试的那条路;③加「自动重试(退避)」挂在哪、与单写者队列怎么配(⛔ 第二写者;A-20 (B) 的 (a) 条「中途落库失败停发至下次封口成功」要对齐);④常驻控件(Retry / 复制 / Discard)放在哪一层、与留字框的关系;⑤A-20 加的「Failed to save block 一次断网最多一次」在这里怎么接;⑥**(A-20 r2 封包前发现的两条输入,TD-62 / 订单「TWICE-hash500 再裁」节)**:适配器在人已离开笔记后收到 2xx 报 `route_receipt_stale` 失败而字已在服务器——②a 的控件吃适配器结果,这条该报什么、在哪几行;以及今天一次 text-save 失败弹**两条**提示(适配器「Failed to save block」+ history onSaveFailure「Text changes could not be saved. Retry saving or undo before leaving the note.」),在 A-20 r2 的扣住离开里一次性 500 被下一轮重查吸收后,第二条已被随后的成功 + 离开证伪——(e) 的「一次失败一条、控件在屏时零条」要覆盖「同一次离开里先败后成 → 零条残留」,查这两条各在哪一行发、谁该收声。**Tester 在 r2 上的计时量测(按出现 / 消失计)**:TWICE-hash500 两条失败提示在重试 200 前约 10 ms 出现在 A,页面到 C 后仍留屏到约 6.4 s(在目的地上约 3.1 s);GONEFAIL-hash / paste 同形,在另一篇上约 3 s;GONEFAIL-back 一条真「did not reach the server … kept on this device」,字约 8.9 s 落地。(e) 的验收以此为修前基线。
- **Q3 H1 / H2**:Reviewer 指的行在 A-20 包上还对不对;try/finally 与 retryTimer 两处修法各改哪几行;有没有冻结红测试可写。
- **Q4 写放大与回归面**:① / ② 改动是否触碰 A-18 矩阵三固定项(300ms 人类节奏、真键标题、英文句子)与 r2.3c 代表臂;列出要重跑的。

**预裁(有证据的)**:②的控件⛔ 用一闪即没的 toast;②失败后拒键若保留,范围只能是那一块,⛔ 整篇;③H1 的 try/finally 没有不做的理由,直接进。**其余不预裁,等查报。**

## 验收(Tester;探针先于施工,现在就写,交 builder 封包前自跑)

- **①**:真 Chrome + CDP 模拟输入法(`Input.imeSetComposition` → `Input.insertText`),新笔记第一行打 `diyi` → 第一、`ceshi` → 测试,修前红(拼音进笔记)、修后 0/24;持久编辑器中间行同法 0/24(不退步);**Henry 上岛真输入法亲验**是终验(他是真用户;Tester 写明「模拟输入法,真输入法候 Henry」)。
- **②**:注入 text-save 500 / 断网:失败后(a) 那一块之外仍能打字;(b) 屏上有常驻 Retry / 复制 / Discard,文案真话;(c) 网络恢复后 ≤ 退避上限内自动追平、服务器有字;(d) 期间字不丢、不重复、不落错块;(e) 「Failed to save block」一次断网最多一次。修前红:整篇拒键、无常驻控件、不自动重试。
- **③**:H1 注入队列任务抛异常(落地任务里关闭留字框那一刻) → 后续后台落地仍发生,修前红 2/2;**H2 浏览器打不中「入队到执行」窗口,只作冒烟**——判据改为 builder 在 Q3 写**冻结版红的单元测试**,Tester 验那条测试在冻结版上真红、包上绿。
- **回归**:A-18 矩阵三固定项、r2.3c 代表臂、A-20 的 (B) 臂与离开臂不退步;1a 切换不受影响。
- 每包必做 / 阶段末一次按 §6 第 5 条;确定性 1 轮。

## 交付

- 包 ops `packages/a25-ime-save-failure/`(dist / src / 两 sha256 / files 清单 / COPY-BACK / MANUAL-SECTION);scratch 从 A-20 包 + `04f6f822` 建,⛔ 共享树;A-20 收割后 rebase 到收割提交并重核。
- 回执「A-25 Result」在本文件末,含「代码回答」节(行号对包 `src/`):①组合期间交接各行修前修后;②拒键范围与重试退避各在哪一行;③控件在哪一层、文案;④H1/H2 改行;⑤写放大。
- 阳性对照在冻结版红;server / client 全量 builder 跑一次;封包前先跑 Tester 的三组探针,红不封包。
- Reviewer:碰写入路径,派;点名:单写者不变、自动重试不成第二写者、拒键范围只在那一块、组合期间无焦点挪动、H1/H2 修法对行、冻结红测试。
- 红线照旧:⛔ git 写、⛔ 动依赖锁、⛔ 真实模型、⛔ 碰岛、⛔ 读 `.env` key、⛔ `edfix` / `edacc`;口令只从环境变量;交证据前 `pre-harvest-scan --paths`;截图裁侧栏;CPU 90% 以下,重活锁两个并行各 ≤40%。

## 流程与阶段一日程(Henry 11-08:银座 7 日不断机;回大陆前到「日常能用」,其间完全不登 Claude)

| 日 | 事 |
|---|---|
| D1(11-08) | A-20 包 → Reviewer ∥ Tester;Tester 空档写 A-25 三组探针;Main_Designer 本单落文件 |
| D2 | A-20 判语 → 收割 → 第 23 轮上岛 → Henry 开始日用;builder 开 A-25 第一段「查」→ 裁 |
| D3–D4 | A-25 必修施工 + 自跑探针 + 封包 → Reviewer ∥ Tester |
| D5 | A-25 判语 → 收割 → 第 24 轮上岛 |
| D6 | 阶段末一次:跨单回归套 + 全量 + 说明书逐句 + 真人走查(Henry 真输入法);岛上备份核;**封版** |
| D7 | 缓冲(返修一轮的余量);封版态核对:岛上无半成品、说明书对、备份在;Henry 离日前关云机 |

**封版硬规矩**:D6 若 A-25 没全绿,**只上绿的部分**(A-20 已上;A-25 分项可上则上,不可分则整单留阶段二),⛔ 为赶日程上半成品——Henry 在大陆期间无法修 🅰。

## Result(builder 回执区,候填)

## 第一段查报收讫 · 裁定(Main_Designer 2026-11-08)

查报 `docs/audits/2026-11-08-a25-builder/survey.md`(底 `04f6f822` + r2 包,事实 / 建议分开,样本数写明;扫描 ⛔ 0)。要点与裁定:

### ① 输入法:选 (a),只动草稿框

事实收:草稿框 `DraftBlockEditorLayer.tsx:79-82` 的 `onChange` → `useRuntimeNaturalWritingController.ts:445` 在组合中的值(`d`)上就 `persistDraft` → `useDraftBlockController.ts:620-629` 交接(`flushSync`、`setFocusBlockId`)→ `NoteWritingSurfaceLayer.tsx:1998` `autoFocus` 组合中抢焦点;整条路没有任何 `compositionstart/end` 检查。**裁 (a)**:草稿框加 `onCompositionStart/End`,组合中 `onChange` 只更新文字不建块,`compositionend` 用框里的最终值(已是汉字)调一次 `handleDraftChange`;持久编辑器不动。守:组合中按 Enter / Esc / 斜杠的现有行为不变(写进 Tester IME 臂)。(b)(c) 否(浏览器无「接管组合」接口,(c) 是靠时序猜测补救)。

**决定 1 · leads-2 不并入,留阶段二**(维持 11-08 的切法)。它是交接原子性(`flushSync` 提交时新块还不在 host 的 blocks 里),(a) 不覆盖也不依赖;冻结红测试现成,不会丢。阶段一只装「Henry 日用会撞到的」,leads-2 没有使用症状。

### ② 保存失败:拒键范围坐实,四条建议都采,其中两条加条件

事实收:**不是只读**(六个 `contentReadOnly` 来源全 false)。键死在结构路径:块里有标题且不止一行 → `TextBlockProjection.tsx:848-853` 交 `onHeadingStructure` → `useHeadingStructureController.ts:301/:371` → `useTextFlowHistory.ts:1207` 先 `await flush()`,而 `flush`(`:1190-1194`)只要**整篇**有任何 `failures` 就抛 → `:445-447` catch → 每键一条「Heading changes could not be completed…」。所以范围 = 「整篇任何一处失败时,任何需要结构路径的块」;普通块走 `applyEdit`、`canApplyEdit` 不看 `failures`,收得到键。**Tester 加两臂**:LANDFAIL 期间在另一个**普通块**打字(预期今天就能打)、在另一个**带标题的块**打字(预期今天拒,修后不拒)。

**决定 2 · 准 A-25 收窄 history 的 `flush` 语义**,条件三条:
- 收窄的只是「别处的 `failures` 挡本块结构」这一刀:`runStructureBatch` 前仍要 **await 本次触及的块的在途保存**(结构的 `after` 要从最新流算,这个等不能省),只去掉「整篇任何失败即抛」。
- 本块自己有失败时,两条路 builder 按代码实情选一条,回执写明:**(甲)** 编辑按普通打字 `applyEdit` 上屏、排在失败后面,结构在那块恢复后**真的补上**——要有测试证明恢复后结构到位(⛔「以后再说」);**(乙)** 本块仍拒,但只点亮常驻指示,⛔ 逐键 toast。甲优先;甲做不干净就乙。
- Q4 回归面先过:r2.3c 代表臂、守恒闸 6 种子 + PATH 臂。

**②a 自动重试 + 常驻指示 + 收声(建议 2–4),采**:
- 退避定时器挂 `useTextFlowHistory` scope,与 (B) 的 `idleTimer` 同层;2 s 起翻倍、上限 30 s;`online` 事件立刻排一次;经 `host.enqueueRuntimeHistoryOperation` 走 `saveBlock` 打字失败分支同一段(`:1162-1173`),不另开写者。**加一条**:4xx 里的 401 / 403 ⛔ 自动重试(不是暂时性失败,路由守卫会送去登录;重试只打 5xx / 网络错)。中途落库在有 `failures` 时仍停发。
- 常驻指示放在块上(控件条不常驻):「未保存 · 重试 / 复制 / 丢弃」;重试 = 立即排一次;复制 = 该块当前文字;丢弃 = 撤回到服务器版本走现有 Undo / 恢复路径,⛔ 新造写。指示在屏期间零 toast;成功即消失。`recoveryBlockIds` 扩到含 `failures`。
- 收声:适配器 `:2228` 对 `silent` 保存不弹;history `onSaveFailure` 改点亮指示不弹。一次失败 = 0 toast + 1 指示;先败后成零残留。这就是 (e)。不经 history 的保存(表单字段等)不变。Tester 的 (e) 修前基线:提示在到达目的地后留屏约 3 s(已记 Q2 ⑥)。

**决定 3 · 准改适配器 `route_receipt_stale`**(`useNoteCanvasDataAdapter.ts:2146-2185`):2xx 且正文与发出一致时返回 `durableState: 'matches_requested'`、`recoveryReceipt: null`,写入登记 `:2259-2263` 据此判成功;A-20 r2 控制器里的回执兜底**保留**作双保险。改动限这一段;TD-62 承接 = A-25 本条。Tester 重跑 A-20 的 BACKOK / GONEFAIL / TWICE / CLOSEFLY。

**决定 4 · CHAIN:history 核对 `previousTextFlow`,不符即拒,⛔ 静默覆盖;先做调用方普查,普查结果决定进不进**:
- 真病收:history 的 apply 入口接受调用方给的 `previousTextFlow` 而不与自己最新的流(开着的组 / 已封口 after / handed)核对;读渲染期状态的调用方(如留字落地 `readLiveFlow` `:1209-1210` 读 `blockTextFlowDrafts`)可能用旧流盖掉已重试成功的字。编辑器自己读 `latestFlowRef`(`TextBlockProjection.tsx:869`)同步,不会撞。
- **先普查**:列出所有传 `previousTextFlow` 的调用方,各标「同步读(永不旧)」或「渲染期读(可能旧)」,后者各自有无重试(落地的 `confirm` 循环最多 30 次,算有)。**若所有渲染期调用方都能重试 → 进 A-25 作必修 ⑤:不符即拒**(返回可重试的结果,⛔ 重放 / rebase——那是阶段二),K2 / CHAIN 臂作闸(冻结版与 r2 红、修后绿);**若有任何渲染期调用方拒了就没人再试 → 不改 history,CHAIN 臂作已知红留着(不当闸),记 TD 归阶段二**。普查先交我看(半页),再动手。

### ③ H1 / H2:按查报修,两条冻结红测试都写

H1 `:203-206` 定时器体包 `try { … } finally { if (landingQueue.current.length) next(); else landingScheduled.current = false; }`;H2 `:482` 加 `else if (kept.current.has(entry)) retryTimer(entry)`。测试按查报写(H1:首次 `forgetUnplacedWords` 抛;H2:入队与执行间切 noteId 再切回,假定时器)。

### ④ 回归面:查报 Q4 的清单照单,由 builder 封包前自跑一次,Tester 每包必做只跑本单臂 + 相关修前阳性对照,全量留阶段末

### 施工顺序(与 A-20 r3 的关系)

Reviewer r2 复核报了 M1(确认 ①,打列表时中间行丢)与 M2(疑似 ②,应用内后退 + 保存失败 → 人被留下而记录冻结 → 撤销后复活)等六条,**A-20 开 r3**(范围与原则见 A-20 单「Reviewer 发现收讫;开 r3」节),r3 与 ②a / ②b 同改 `useTextFlowHistory.ts`。顺序:
1. **现在:builder 先做 r3**(可能是第 23 轮的船,优先于一切);决定 4 的调用方普查在同一文件里顺手做(只读,交我半页)。
2. r3 封包 → Reviewer 小核 ∥ Tester 定向臂 → 部署。期间 builder 在 A-25 scratch(rebase 到 r3 包)开 **①(a)**(草稿框层)与 **③**(HSC),都不碰 r3 的文件。
3. 然后 ②a / ②b / 决定 3 / 决定 4(若进)。
4. r2 发不发由 Tester 的 BACKIN-undo 臂决定(见 A-20 单):复现 ② → r2 不发、r3 作第 23 轮;不复现 → r2 先发。

### 决定 4 结论:CHAIN 不进 A-25——普查 7 个渲染期调用方无重试(Main_Designer 2026-11-08)

普查 `docs/audits/2026-11-08-a25-builder/caller-census.md`:12 个 `previousTextFlow` 调用方,同步读的只有编辑器打字路(`TextBlockProjection.tsx:849` `latestFlowRef`);留字落地、Agent 补丁采纳、斜杠 ×3、批量改角色、行内链接 7 个渲染期读且无重试。按本单决定 4 的规则:**不改 history,CHAIN(K2 守恒臂)留作已知红、不当闸,记 TD-65**(含修法顺序:先让调用方能重试,再「不符即拒」)。A-25 验收 ③ 里「CHAIN 阳性对照」改为:臂存在、在冻结版与 A-25 包上都红、标 known-red,不计入放行。

### Tester LANDOTHER 实测与查报推断不符:拒键可能只在持失败的那块(Main_Designer 2026-11-08 转 builder)

Tester(`a20m` LANDOTHER,修前 `04f6f822` 与 A-20 r2):LANDFAIL 开着时,在**另一个普通块**打字 2/2 上屏落地;在**另一个标题块的正文行** 1/1;在**另一个标题块的标题行** 2/2;零「Heading changes could not be completed」。查报 Q2 ① 的推断「整篇任何一处 `failures` → 任何需要结构路径的块都被 `flush` 拒」**不复现**;实测只量到持失败的那块拒键(A-25 LANDFAIL (a),A 的 warmup 行)。**builder 对码**:为什么另一个标题块的键没走到 `runStructureBatch` → `flush`(结构路径的触发条件比「块里有标题且不止一行」更窄?还是 `flush` 只看本块?),把结论写进回执;若范围真是「持失败的那块」,决定 2 的第一刀(跨块隔离)不必做,②b 只剩「本块自己失败时甲 / 乙」,回归面随之缩小。Tester 不下结论,只报数。

**A-25 开修(builder,Main_Designer 2026-11-08 记)**:scratch 底换到 r3 包(`sha256sum -c` 15/15 OK)。①(a) 码成,4 文件不碰 history:`DraftBlockEditorLayer.tsx` 加 `onCompositionStart / End`,组合中 `onChange` 带 `{composing: true}`,`compositionend` 用框里最终值再调一次 `onChange`;`useRuntimeNaturalWritingController.ts` 的 `handleDraftChange` 在 composing 时不 `persistDraft`;`DraftWritingEntryLayer.tsx`、`NoteWritingSurfaceLayer.tsx` 只改类型。下一步 ① 单测(修前红)→ ③ H1 / H2 + 两条冻结红测试,只跑单文件。builder 自报一处越规:派单到前在 A-25 scratch 跑过一次 `tsc --noEmit` 未取锁(约 1 分钟,0 错);今后 tsc / 全量 / 构建一律等锁位——收,不追。**我补两条进 ① 的测试与回执**:(1)浏览器在 `compositionend` 前后各有一次 `input` 的次序不一(Chrome 在后、Firefox / Safari 在前),所以 `compositionend` 的那次 `onChange` 与紧随的非组合 `input` 可能同值连发两次——要幂等:同值两次不建两块、不持久两次,写一条测试;(2)裁定里的守条「组合中按 Enter / Esc / 斜杠的现有行为不变」要有单测,不只靠 Tester IME 臂。

**①③ 码成(builder)**:冻结红 5 条(r3 底红、修后绿),只跑单文件。① 测试:组合中 `d` 不建块、提交词只建一次(红);草稿框组合中给 `{composing: true}`、`compositionend` 交最终值(红);幂等——`compositionend` 那次与随后非组合 input 同值连发只建一块(红;另注 React 对同值 `onChange` 自去重,真浏览器里第二次通常到不了控制器);守条 Enter / Esc / 斜杠组合中与非组合逐项相等(两版皆绿,是守条不是对照)。③:H1 改 try/finally(`useHeadingStructureController.ts:202-214`),**更正查报**:`forgetUnplacedWords` 抛打不红(`writeUnplacedWords` 自己 catch 存储异常),注入点改为「关闭第一条落地的留字框时抛」(与 Tester 探针同处),异常仍抛出定时器、测试包 `setTimeout` 收集并断言抛了一次;H2 在 :482 加 `else if (kept.current.has(entry)) retryTimer(entry)`,**更正查报**:查报的测试形(入队后执行前切笔记再切回)在冻结版上绿——重开路径有两条链(`retainWords` 自带 `retryTimer`),只有最后一条链正处在落地队列里时冻结版才真丢且回来不落(框还在屏上重开跳过);测试改假定时器精确造此序,冻结红修后绿。决定 3 已改在 :2146-2190 内,冻结红测试已写,适配器 124/124 绿。②a 在做:退避重试(401 / 403 不重试,`online` 立即排一次)、收声、块上「重试」「复制」、`recoveryBlockIds` 含 `failures`。

**②a 「丢弃」裁 (C)**(Main_Designer 2026-11-08):builder 列三路——(A) 走现成 Undo:撤的是全局最后一步不一定是本块,且 Undo 要写服务器('before' 侧),断网时照样失败,按了等于没按;(B) 不写:失败组从 `failures` / `unsent` 撤掉、草稿换回服务器版本(`confirmedFlows`),但撤销栈里仍留着这几步,要一并作废 → 动撤销栈;(C) 这版不做丢弃,只「重试 / 复制」。**裁 (C)**:(A) 不是丢弃;(B) 正确但面大,阶段一不动撤销栈 → **TD-67**。出口写进手册「已知」:服务器持续失败时本篇出不去(REFUSED),可关页(字进本机恢复框)等服务器回来,自动重试会把字送上去;指示若便宜带一句「关页不丢字」。**②a 的 history 改动暂停**:r3d(见 A-20 单末节)也动 `useTextFlowHistory.ts`,r3d 先;A-25 scratch 的 ①③ 与决定 3 不动,r3d 封后底换到 r3d 再续 ②a / ②b。

**②b 范围坐实(Main_Designer 2026-11-09,据 Tester LANDOTHER 修前 / r3 读数)**:LANDFAIL 期间在另一个普通块、另一个带标题块、另一个标题行打字,修前与 r3 **键都收得到**(plain 2/2、heading 2/2、headline 1/2 + 2/2;0 条「Heading changes could not」)。查报「整篇任何失败 → 任何需要结构路径的块拒键」的推断真机不成立——**只有失败块自己拒键**。**裁:②b 的跨块隔离不做**(没有症状);②b 只剩「本块自己有失败时」那一刀:甲(编辑按普通打字上屏、排在失败后面、结构在恢复后真的补上 + 测试)优先,甲做不干净就乙(本块仍拒但只点亮常驻指示、⛔ 逐键 toast);三条件不变(await 本次触及块的在途;Q4 回归先过)。builder 回执「LANDOTHER 对码」节须解释:代码里 `flush` 遇整篇 `failures` 即抛,为什么真机上别的带标题块仍收得到键(是没走到结构路、还是 `failures` 的作用域比查报读的窄)。另记:r3 一行 LANDOTHER-plain 见 5 条失败提示(其它 2 条);BACKIN-fail-refail 后退后 3 条「Text changes could not be saved」+ 2 条「Failed to save block」+ 1 条「Please retry」——都是 ②a 收声的基线数。
