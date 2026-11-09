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

**②a 加一条(Main_Designer 2026-11-09,源自 Tester heldhead-del 旁观,A-20 单同节)**:`useNoteCanvasDataAdapter.ts:728-737`(修前逻辑)——回执的 mountNonce / creationGeneration 与当前挂载不符时只弹「A previous block edit is queued for recovery」不提供 Apply;与「重开时旧横幅」同根。A-20 r3 上在同块 kept 记录也落地时触发,队头的字(`g` / `aaa`)只剩在未提供的回执里(修前给 Apply)。②a 收声 / 常驻指示取代本次访问横幅时,**凡回执里有服务器没有的字,必须可 Apply 或进框,⛔ 只提示**;先看 Tester 在 r3d 上的读数(重开 + 20 s + 再重开)决定 r3d 要不要先堵。

**②a 再加一条(Main_Designer 2026-11-09,源自 A-20 r3d kit K1IME-held)**:页面在保存 2xx 到达前离开 → 回执没清;重开时服务器已有回执的字,回执仍被提供(横幅 + Apply),**Apply → 409**,409 后回执去向未读。与 TD-62 / 决定 3 同根(决定 3 修会话内 2xx 对上;这里是 2xx 没到的重开形)。②a 施工:重开时回执文字与服务器现文**精确相等**(整块逐单元)→ 忘掉,⛔ 提供;不等 → 照 ②a 既定(可 Apply 或进框)。A-20 r3d 只把 N6 的扣留条件收窄到「不等」,不碰队列。Tester 的 K1IME-held 形(延迟 8 s 的 2xx + 关页 + 重开)作本条验收臂。

**A-25 底换到 r3d(builder);②a 三步定序;④⑤ 冲突项合并裁**不进本轮**→ TD-69(Main_Designer 2026-11-09)**。换底法:17 文件逐个三方合并(r3 包为共同祖先、A-25 底为 ours、r3d 为 theirs):12 文件无 A-25 改动取 r3d;HSC / runtimeController / useTextFlowHistory / 适配器 / 适配器测试合并 **0 冲突**,③ 的 H1/H2 自动合到 N6/N6a/N6b 之上、无需手套;合并前副本留 A-25 scratch `pre-r3d/`,未混 A-20 文件。锁下(`.lock.2`,Tester 持主槽)核:tsc 0;canvasEngine vitest 首跑 2114/2116,两红 = F17 before/after——适配器与其测试与合并前逐字节同,红不来自换底,而是底里已有的 ②a 收声(history 保存 `silent`,一次失败 = 0 提示 + 1 标记)与测试仍断旧「Failed to save block」提示相撞;builder 改 F17 断已裁行为(无提示 + 块进 `failedTypingBlockIds`),重跑 3/3 绿。**裁**:F17 改法收——断的是「失败仍被标出」不是「失败消失」,这是收声的正确不变量;回执里写明原断言与新断言各一行。**②a 施工顺序收**:(i) 重试 / 退避 / 标记做完测完;(ii) 重开时回执与服务器现文精确相等 → 忘掉不提供(K1IME-held 形为验收臂);(iii) 旧横幅无 Apply:回执有服务器没有的字 → 必须可 Apply 或进框。**④⑤(冲突项给合并不给整块替换)不进本轮**:Replay 在明示「会替换」的警告后才点、手册已教手合,非静默丢字;合并要按单元三方,不便宜;→ **TD-69**,阶段二。

**②a 第 (iv) 条(Main_Designer 2026-11-09,源自 A-20 r3d / r3e 的 ⑤ 与 putback 读数)**:回执库「一块一条」让**本次访问的任何保存**(打字 / 空闲 / Enter / 失焦 / 移块 / 接受 agent 补丁 / slash / HSC 落地 / Apply 自己)顶掉**别次挂载**的回执;重开见横幅后先在那行打字 → 横幅里的字静默消失(修前同;Tester putback ×1 两边都丢)。规格:(a) 本次访问的保存**不得顶掉**别次挂载的回执(库改一块每挂载一条,或只保护别次那条);(b) 保住之后 Apply 必撞 409(服务器已被本次保存推进)→ 不能只落到冲突项整块 Replay(TD-69),**Apply 遇 409 按锚点合并**(HSC 落地同法:起点文字在现文里就在原处接上;找不到锚点 → 进框)或至少给「放进框」出口;(c) 列出 / 忘掉 / 队列双项 / 链里按「1 条」写的行(Tester 链注)都要跟着改,验收臂 = putback(预期 aaa 保住并可 Apply 或进框)+ HEADCLOSE 三式照绿。r3e 手册「已知」先写「先 Apply / Dismiss 再在那行打字」。

**②a (iv) 波及清单(builder,行号对 r3e 合并后的 A-25 副本)与四决定(Main_Designer 2026-11-09)**。A-25 已合到 r3e(r3d 包为祖先,0 冲突;history 测试文件末两个 describe 都保留;pre-r3e 留底);包里 MANUAL-SECTION Replay 句已按裁改,哈希仍 17/17、63/63。清单:①「一块一条」写在 draftBlockPersistence.ts:514–567(`keepUnlessSameBlockEdit` 删同 note+block 的条目 :518–522,localStorage 与旧 sessionStorage 副本 :533–538 / :548–566)与列出 :469–480(`byScope` :477 按 note+block 去重)——**两处同改**;键 `createBlockEditRecoveryKey`(:150–158)已含 mountNonce / generation / sequence,队列(BlockEditRecoveryQueue.tsx:164–166)与冲突标记(A:476 / :2255)按 recoveryKey,天然容多条。②忘掉 / 替换别次条目的路:每次保存请求前写自家条目(A:2054,= 顶替本体);**模板转换**(A:2493–2495 收齐该块所有条目、:2546–2548 成功后全忘)——连别次的也忘;成功结算(:2182 / :2187–2191 / :2238–2242)只忘自家键 + options.recoveryKey;打开笔记(:749–770)别次条目 → (ii) 服务器已有则忘、否则只提示 → (iii) 改它。③队列双项:今日 Apply 自家条目(请求前写)替换被 apply 的那条,409 时冲突标在 Apply 新键(:2255);若按访问分条,Apply 条目与被 apply 条目并列 → 横幅「2 block edits are waiting」。④假定一条的地方:P1 等待列表(A:652–661)与 HSC `recoveryWaiting`(:174,按块 some())都容多条;`whenLeaveSettled` 按 key@queuedAt(runtimeController :880–890)不受影响;断言恰一条的测试:adapter.test :1403 / :2578、draftBlockPersistence.test :713 / :801(「replaced rather than kept beside」)要逐条重断;kit a20/a20b/a20d 探针读恢复库;Tester 链按一条写的行要她列。
- **决定 A:(a1)** 一块每访问一条(键 = note + block + mountNonce + generation);本次访问的保存只替换本次访问的槽。
- **决定 B:(b1)** Apply / Replay 请求前的条目**继承被 apply 条目的槽**(options.recoveryKey 的槽),409 仍是一项;它 pending ∧ applying → 在 P1 等待列表里;200 → 槽清;409 → 冲突标在该槽。⛔ (b2) 的「2 block edits」。
- **决定 C**:模板转换只忘**本次访问**的条目;别次条目留下(不变量优先)。块类型变了之后别次条目 Apply 会不匹配 → 走冲突项,记一行 TD 附(与 TD-69 同节)。
- **决定 D**:合并放 **`applyBlockEditRecovery` 末尾**(适配器),⛔ 放队列组件(UI 不持合并逻辑):409 → 读当前版本 → 按单元用 `mergeTypedText`(HSC 落地同一函数)把条目起点文字锚进服务器现文、接上条目的字;**锚到且文字已同 → 无可写,忘掉条目**;锚不到 → 字进框(K3 路);有可写 → 以当前 revision 再 `saveBlock` **一次**。**写者判定**:同一个人动作在适配器内的顺序两次请求,是同一写者,不违单写者规则;⛔ 任何自动循环——合并保存若再 409(别处又写了)就停,条目留作冲突项(TD-69 的 View differences 出口),⛔ 第三次。合并只动字不动结构。
- **验收臂**(Tester,A-25 轮):putback(aaa 保住 → Apply → 合并 → `['warmup bbb','aaa']` 或等价,无丢);HEADCLOSE 三式照绿;Apply-slow + 在途同块打字两种放行顺序(Q1);模板转换后别次条目仍在;链里按「1 条」写的行 Tester 列出并改注。
- **(iii) 注与 D 的锚点来源(builder 问;Main_Designer 裁 2026-11-09)**:(iii) 无需单独改码——队列列出所有访问的条目(A:652–653),别次条目本就带 Apply;「只提示无 Apply」的外观只来自顶替(一块一条),打开笔记只弹提示(:765–769)不隐藏项 → (iv) A 落地即满足 (iii);证据 = (ii) 三条「still offered」测试在主 describe 内绿;(iv) 的 putback 测试加断「同块保存后项仍带 Apply」。「A previous block edit is queued for recovery」提示与横幅重复 → 归 (e) 收声。**D 锚点:裁 (d1)**——合并的起点文字取**本次打开时适配器水化的服务器单元文**(与 HSC N6a `openedTexts` 同一尺度),不改持久化格式;条目基准若早于打开(别的设备中间改过),`mergeTypedText` 只插不删 → 最坏多字不丢字。(d2)(每条保存把保存前的块文写进条目 `baseFlow`)更准但改 localStorage 格式、旧条目还得回退到 (d1)——记 TD,多设备日用出现时再升。

### ②a (iv) D 施工前两问 → 裁(Main_Designer 2026-11-09;A-25 已 rebase 到 A-20b,0 冲突)
builder 报的代码事实先收:框(HSC kept entries)**只在打开笔记时读一次** localStorage(`readUnplacedWords`,HSC open 效应 ~:673),适配器中途写 `rememberUnplacedWords` 本次访问看不见。所以 D 原文「锚不到 → 字进框(K3)」在今天的接线下**没有现成出口**——我写 D 时把「框」当成随时可写的容器,这是形状先于能力的又一例(`structure-shape-vs-capability`)。改裁如下,**不变量各写一次**:
- **问 1 裁 (c)**:锚不到 → 不写、不进框,条目留作今天的 409 冲突项(View differences / Replay / Discard,与「第二次 409 停」同一出口)。不变量:**D 只在「每个单元都能锚」时比今天多做一步(一次带当前 revision 的 saveBlock);任何别的情形 = 今天的 409 行为,一字不改。** 理由:(a) 跨 HSC / controller / 适配器三层接线,阶段一不开新接缝(`?.()` 跨接缝的教训);(b) 字从眼前消失、下次打开才在框里出现,比留在冲突项里差。(a) 的形状 = 阶段二「框只收不落」候选的**前置**(框要能中途写入),记 TD-69 附(随收割写)。
- **问 2 裁 (b) 全有或全无**:一条回执里任一单元锚不到(含 `mergeTypedText` 返回 null、含回执里有打开时没有的单元 = 结构变了),整条不写,走问 1 的出口。不变量:**一条回执对服务器只有两种结局——全部字落地(一次写)或一字不动(冲突项)**;没有半落地状态,手册与 Tester 的臂都不必描述第三种形。「合并只动字不动结构」照 builder 所述执行。
- 已定四条(409 判定 = status 409 + `stale_revision` 与 :2255 同条件;起点 = 本次打开水化的服务器单元文、适配器自记一张表与 openedTexts 同尺度;`emptyMatches false`,每单元都返回原文 = 已同 → 忘掉条目不写;合并写入带同一 recoveryKey、再 409 即停)——**收**。补一条:部分单元返回原文、其余返回合并文 = 正常落地(仍是一次整块写)。
- **Tester 臂(A-25 轮列入)**:409 + 全可锚 → 一次写、条目忘、服务器文含两边字;409 + 任一不可锚(含结构变)→ 一字不写、冲突项与今天同形;409 + 全部已同 → 条目忘、不写;合并写再 409 → 停、冲突项。

### (iv) D 做完;:456 精确相等前判收;Reviewer 封前读 D;排程(Main_Designer 2026-11-09)
builder:D 按 (c)+(b)+(d1) 做完,A-25 副本已 rebase 到 A-20b;tsc 0,adapter 135/135,另 5 文件绿;pre-D 上 D 五例 3 红 2 绿(绿的两例断「今天 409 行为不变」,本该绿);(iv) A 新库测试 pre-iv 红、iv 绿。四出口分叉行(对 A-25 副本 `useNoteCanvasDataAdapter.ts`):① 全可锚 → :2396 Apply 成功直返;:2398 仅 rejected + 有回执 + `isStaleRevisionError` 才继续;读现块;:2419 整条判完、:2420 非 null 才往下;:2422 不全同 → :2434 一次 `saveBlock`(recoveryKey = Apply 冲突键 = B 继承槽;baseRevision = 现读 revision;注释与板区间按 Replay 同法重算)。② 任一不可锚 → `mergeRecoveryOntoCurrent`(:440)返回 null → :2420 返回 false 不写;null 来自 :448 结构(回执 id 序列 ≠ 打开时序列)/ :452 服务器没了该单元 / :458 `mergeTypedText` null(emptyMatches false)/ 打开表或现块无 text flow。③ 全部已同 → :2422 every 真 → `forgetBlockEditRecoveryReceipt`(冲突键)返回 true。④ 合并写再 409 → :2434 那次 saveBlock 在 :2313 自标冲突(`isStaleRevisionError` 抽到 :429 两处共用);:2452 返回其结果;此后无代码再写。「全有或全无」在任何 saveBlock 之前判完:`mergeRecoveryOntoCurrent` 纯函数,遍历全部单元、一个失败整条 null、成功一次性返回整块新 flow;:2419–2422 都在 :2434 之前。(d1):hydration :786 起按「笔记 @ 路由代」开表(块 → 活单元 id → 文),每块首次水化记一次、后续不覆盖;409 后读现块时笔记 / 代 / 挂载已变则不写(stillHere)。测试五例:全可锚 [3,9] 合并落字;一单元不可锚 [3] 冲突项;回执改单元集合 → 不写;已同 → 忘、只 1 次;再 409 → [3,9] 停、冲突项。remount 测试终段重断为两条并列(fixture 服务器块无 text flow,(ii) 无从证明;(ii) 自己三条照绿)。
**超出裁定一处 → 收**:「已同 → 忘条目」只靠 `mergeTypedText` 永远走不到——服务器字 == 回执字时它的「字已在锚缝里」守卫返回 null,null 按裁走冲突项。builder 在合并前加一行单元级前判(:456):服务器单元字 **精确等于** 回执单元字 ⇒ 该单元已同;只在精确相等时生效,不放宽锚定。**裁:收**。这正是我写「每单元都返回原文 = 已同」时把 `mergeTypedText` 的返回当成了「原文」,实际是 null——又一次结论形(「返回原文」)没翻成不变量(「返回值 === 原文」)就写进裁定;builder 没有自己选边而是停下来问,对。不变量改写一次:**已同 = 服务器单元字 === 回执单元字,先于合并判定;其余一律走 `mergeTypedText`,null 即不可锚。** 回执「代码回答」按此写。
**排程**:A-20b 开 r2(Reviewer R1–R4,一行级;见 A-20b 单),builder **先做 r2**(占槽 1,约一小时内封)→ 再回 A-25 全量 + build + kit(等槽)。等槽期间 Reviewer **封前读 D**:builder 先把 A-25 副本 (iv) 涉及文件(adapter + 其测试 + controller/HSC 若有改 + draftBlockPersistence 及其测试)拷成只读快照 `<ops>/packages/a25-prepack-snapshot/`(src.sha256),Reviewer 对快照读;发现先于封包折进去,省 A-25 的 r2。Tester 的 A-25 臂按上节四条列。

### Reviewer 封前读 D 结:D1 / D2 确认 🅰,封前折进;其余六条成立(Main_Designer 2026-11-09;发现在 `docs/audits/2026-11-08-a25-builder/reviewer/findings-prepack-D.md`)
- **D1(🅰,折进)**:只删字的回执——`mergeTypedText` 在 inserted 为空时(HSC:80)返回**原样服务器文**而非 null → A:422 判「全部已同」→ A:423 忘条目、不写、Apply 返回 true。今天这是冲突项(Replay 能实现那次删除),D 之后它静默消失:违反 ①(非全可锚 = 今天行为)与 ③(已同只能是精确相等)。字没丢,**删的意图连恢复项一起没了**。**裁**:A:458 之后加 `if (placed.text === live.text) return null;`(到这里 `live.text !== unit.text` 已成立,no-op 合并只可能是「只删」或「字已在缝里」),「已同」只剩 A:456 一个入口,与不变量逐字一致;A:2422 的 every 判法随之与「每单元精确已同」等价。补一例:回执只删一句、服务器那行另有增字,Apply 遇 409 → 不写、冲突项仍在;pre-fix 红。
- **D2(🅰,折进)**:合并 flow(A:461–462)只换单元文字,`inline_structures` 原样沿用服务器那份的偏移;合并单元里有行内链接且插入点在链接结尾之前时链接区间错位写进服务器(只插不删不越界,`hasInlineLinkRange` 照样认,链接挂到错的字上);同一次写里批注(:2440)与板区间(:2443)都重算了,独漏行内结构。**裁**:逐单元用 `replaceTextUnitText` 带 edit `{editedStartOffset: at, editedEndOffset: at, replacementText: inserted}` 构造 merged(`at = placed.caret − inserted.length`,inserted 可由 `placed.text.length − live.text.length` 取长再切),偏移交给现成的 `remapUnitInlineStructures`。不变量:**写到服务器的块,行内结构区间与同一份 flow 里该单元文字对齐,等于 `replaceTextUnitText` 在同一插入上会产生的结果。** 补一例:`alpha [beta]`(链接在 beta),回执在 alpha 前插字,合并后链接仍落 `beta`;再一例插入点在链接之后(区间不动)。pre-fix 红。
- **D3(Reviewer ② 旁注,折进,一比较)**:A:2439 的合并写带 `receipt.fieldValues`——对 formula 块是把回执的字段值写回服务器,与「只动字」出入。**裁**:合并前比 `receipt.fieldValues` 与现块字段值,**不等 → null(冲突项)**;相等(含两边都空)→ 写现块的。阳性对照必须含「普通文本块 D 五例照绿」(防 undefined 与 `{}` 之类被判不等让 D 永不触发);formula 块各一例(同 / 不同)。builder 回执请写明文本块回执上 `fieldValues` 的实际形。
- **⑥(成立,记)**:HSC 首见表与适配器表在 P6 时序可能不同;D 只读适配器表,锚点仍对;HSC 若因此不扣,框里字先落、D 的写 409 停冲突项——最坏多停一次,不写错不丢。入 N6b 附(随收割)。
- **O2(🅱,手册已知)**:D 成功时人先见「Failed to save block」再见「Recovered block edit applied」。把首次保存改 quiet 要让 D 的每个非成功出口各自补一次提示,面大;阶段一不动。手册「已知」加一句:点 Apply 后可能先看到一条保存失败、紧接一条已应用,以后者为准。(e) 收声吸收记 TD。
- **O3(Tester 臂)**:合并写再 409 后冲突项正文 = merged(GET 时服务器文 + 回执插入的字),不再是原回执;「再 409 → 停、冲突项」那条臂加正文断言;手册 Replay 句不必改(仍是「整块替换当前项正文」)。
- **O1 / O4**:收。D 的测试五例 → 补 D1 一例、D2 两例、D3 两例。
- **排程不变**:builder 先封 A-20b r2,再折 D1–D3 进 A-25 → 全量 + build + kit → 封;Reviewer 在封后的 A-25 包上一并核(iv) 全部 + ① + (e),D1–D3 三行在其中。

### A-25 rebase 到 A-20b r2;D1–D3 与两条测试债折进;全量链排队等槽(builder;Main_Designer 收 2026-11-09)
rebase:三文件 fast-forward,H / H test / HSC / HSC test 三方合并 0 冲突(A-25 对 HSC 只动 landing 队列 try/finally 与 H2 retryTimer,不碰乙的行);tsc 0,受影响 5 文件 246/246。**D1** :463 `placed.text === live.text → null`;**D2** :465–476 逐单元 `replaceTextUnitText` 带 edit `{at, at, inserted}`;**D3** :2435–2437 `receipt.fieldValues ?? {}` 与 `readFieldValues(current)` canonical 比较,不等 → false;相等时写入 `receipt.fieldValues === undefined ? undefined : currentFields`(:2461)——文本块的「无」写出去仍是「无」不变 `{}`(:829 恢复草稿会把 `{}` 当字段草稿)。**收**:这一条正是我 D3 裁定里「含两边都空」没说清的形(undefined 与 `{}` 是两种空),builder 自己补了,并保住文本块五例绿。adapter 140/140(新 5 例);控制换回 pre-D123:D1 / D2(链接前)/ D3(字段变)红,D2(链接后)/ D3(字段同)绿。测试债:S2(变异去 :632 source 红)、O4(`'a😀|b'` 选 b 粘 `c⏎Y`,记录自 `'a😀'` 起;变异 DBFF→DFFF 红、R3 仍绿)。链(tsc → 全量 → build → A-20 回归 kit 16 段 s13* → A-25 kit k25a:IME 24 / SAVEFAIL / LANDFAIL / CHAIN / H1 / H2)排队等槽(Tester 占两槽),拿到后约 2.5 h;全绿即封,a25 门有红先停报。

### A-25 全量链:tsc / 全量 / build / s13* 全绿,**a25 门 k25a 红 36/78 → 未封、停报**(builder 16:50;Main_Designer 裁 2026-11-09)
读数(scratch `a25/a25-exits.txt`、`kit-k25a.analysis.txt`):tsc 0;client 全量 exit 0(259 文件 / 2834 例);vite build 0,主 JS `index-69VomqRz.js`(`dist-next`,未封);A-20 回归 kit s13* 14 段 exit 0;**k25a 78 行红 36**:**IME-new 4/24**(修前 0/2;20/24 拼音留在笔记,例「第一ceshi测试」);IME-mid 24/24;**SAVEFAIL** 四变体(500 / 断网 × 直接 / 失焦)各 0/2——(a)(b)(e) 绿,**(c) 补齐 0、(d) 恰好一份 0**,常驻控件见 Retry / Copy,catch-up 为 null;**LANDFAIL-auto** 两种各 0/2——(c)(d) 绿,**(a) 另一块能打字 0、(e) 0**,约 15.8 s 落地;**LANDFAIL-apply** 两种各 0/2——(b)(d) 绿,**(a)(e) 0**,点 Retry 约 4.1 s 落地;CHAIN 五式 2/2(不当闸,TD-65);H1 2/2;H2 2/2。builder 四问:SAVEFAIL (c) 是否仍要求 30 s 自动补齐;LANDFAIL (a) 与 ②b 跨块隔离不做的关系;(e) 计数仍超;IME-new 是码。
**裁(对照本单已有裁定,逐条)**:
- **SAVEFAIL (c)(d):仍要求。** 「②a 自动重试 + 常驻指示 + 收声」(上文「采」节:2 s 起翻倍、上限 30 s、`online` 立刻排一次、经 `enqueueRuntimeHistoryOperation` 走 saveBlock 同段)是现裁;(C) 只裁掉了「丢弃」,重试 / 复制保留,自动重试没被裁掉。验收句 (c)「网络恢复后 ≤ 退避上限内自动追平」与 kit 一致。所以 (c)(d) 红 = **码或时序**,不是判据。先探:kit 日志里网络恢复后 30 s 内**有没有重试 PUT 发出**(500 变体靠退避定时器,无 `online` 事件;断网变体两者都有),各变体各一行写明:退避是否起跳、起跳几次、PUT 返回什么;若 PUT 发了且 200 而服务器仍无字,是写者问题;若一次没发,是定时器挂载 / 清除问题。
- **(e):仍按「一次失败 = 0 toast + 1 指示」。** 报数:每个变体「Failed to save block」与「Text changes could not be saved」各几次、从哪条路径弹出(适配器 `:2228` 的 `silent` 分支 / history `onSaveFailure` / 别处),对照收声改动的两处;LANDFAIL (e) 同报。O2(D 成功先败后成)是另一条路、已记手册,不算在 (e) 内——若 (e) 的超额全是 O2 形,写明,我再裁是否把 D 的首次保存也收声。
- **LANDFAIL (a):先答探针在哪块打字。** 验收句 (a)「那一块之外仍能打字」;Tester LANDOTHER 在修前 / r3e 上量到别块能打(2/2、1/1、2/2)。若 k25a 的 (a) 打的是**别块**而红 → 这是 **A-25 引入的回归**(不是矛盾,LANDOTHER 没在 A-25 上量过),停线找哪一行把拒键范围扩大了;若打的是**失败块自己** → 看 ②b 你选了甲还是乙(上文 :131,甲优先):甲则本块应能打、红 = 码;乙则本块拒键是现裁,kit (a) 对本块的期望改为「指示亮、零 toast、别块能打」——这条才是判据改法,且只在你实做乙的前提下。
- **IME-new 4/24:码,先探后改。** 20 红行逐行给时间线:compositionstart / compositionupdate / compositionend 与 POST `/blocks` 发出、草稿 textarea 离开文档(交接)、新编辑器首个 input 的先后;4 绿行同列。要回答的不变量是 ①(a)「组合期间不建块」在真浏览器里**哪一跳没守住**——是 POST 在组合中发出,还是 POST 在上一次 compositionend 后发出、**回程交接落在下一次组合中间**(「第一」已提交、`ceshi` 正在组合时 textarea 被换掉 → 拼音原样提交)。后者若坐实,改法是**交接也等组合结束**(或整个懒创建延到组合空闲),与 TD-77 的交接窄窗同一段代码——改时一并给 Reviewer 读。⛔ 先改。
- **CHAIN / H1 / H2 / IME-mid / s13* 收。** D1–D3、S2/O4 不动。
- **槽**:链已停,读码不占槽——槽 2 若还握着,现在放(Tester 要起 Opus 复核、我要 tsc)。四条答案齐了一并报,我再裁改哪几条;改完 k25a 重跑(只需 k25a + 受影响文件的 targeted;全量在封前再跑一次)。

### 四问答齐(builder,未改码,槽 2 已放)→ 裁:SAVEFAIL 取 (i) 按块闸;②b 做乙;IME 按坐实改;另加一条「双发」(Main_Designer 2026-11-09)
**答**(行号对 A-25 副本;证据 scratch `a25/kit-out/runs/k25a/rows.jsonl`):**1. SAVEFAIL (c)(d)** 8 行同形:A 首败后 +1.16 / +1.30 s 两发(间隔 0.14 s,来源未定:疑似离开 A 的失焦重试 H:1306 与退避定时器各一发),之后 +3.3 / +7.4 / +15.6 s 退避,约 18.9 s 那发 200,A 落地;**B 的 PUT 一次没发**——B 打完没失焦只能走空闲保存,而闸是**整篇的**(H:813 `failures.size || …` return、H:823 同、persist H:336 `idle && failures.size` return false),A 失败期间 B 的空闲保存被直接放弃、不进 failures,自动重试 `retryFailedSaves` 不覆盖;A 恢复后 failures 清空但没人重排 B 的空闲保存(定时器已触发过、只在打字时重排)。断网变体代理层 neterr 不切 `navigator.onLine`,两变体都只靠退避。候选 (i) 闸收窄到同块;(ii) 保留整篇闸、failures 清空时重排空闲保存。**2. (e)**:SAVEFAIL 8 行 0 toast、指示「Not saved yet · trying again Retry Copy」在屏 → (e) 绿,收声生效;**LANDFAIL 8 行每行 6–7 条「Heading changes could not be completed. Undo…」= 每键一条**(每键走结构路径 → `runStructureBatch` 被本块失败拒 → HSC:484 `!succeeded → onFailure`(抛异常走 :493)→ runtime:414 addToast);零「Failed to save block」,无 O2 形。**3. LANDFAIL (a)**:探针在**失败块自己**打字(warmup 与 `[heading_1]head`、body 同块,焦点 warmup)→ 不是回归,别块没量;**②b 甲乙都没做(漏项,builder 认)**——A-25 对 HSC 只改 H1(:241 try/finally)、H2(:528),onFailure 三处(:388/:484/:493)原样。**4. IME-new**(组合时刻取自探针固定 sleep,未实测 DOM 事件):POST CREATE 24/24 都在约 585–605 ms = 「第一」提交后、ceshi 组合前或刚开始 → ①(a)「组合中不建块」守住;随后 **建块后的追赶循环 `useDraftBlockController:562–580` 把 draftTextRef 逐个存上服务器**(「第一c」「第一ce」…「第一ceshi」)——组合中的 onChange 照样更新 draftText / draftRevision(:228),A-25 只拦了 `persistDraft` 入口(runtime controller :447);红 20 行:循环追平「第一ceshi」后 :581–583 **立即交接**,ceshi 仍在组合 → textarea 被换、拼音原样提交 → 最后 PUT「第一ceshi测试」;绿 4 行(3/9/20/22)循环还在跑时「测试」已提交 → 交接落在组合外。**后者坐实。**
**裁**:
- **1 → (i) 按块闸。** 不变量写一次:**块 X 的空闲保存只在 X 自己有未决失败 / 在途重试时停发;别块照发,失败就进 `failures` 由同一退避带走;每个有未发字的失败块亮自己的指示。** 不取 (ii) 的理由:(ii) 下 B 的字未存却无任何指示(A 亮、B 静),违「文案真话」;(i) 让单写者不变量回到它本来的粒度(按块)。三处闸(H:813 / H:823 / persist :336)都改成「本块」判定;单测两例修前红:A 失败中 B 空闲保存照发并 200;A 失败中 A 自己的空闲保存仍停。「中途落库在有 failures 时仍停发」(上文「采」节)**改读为按块**,本节为准。
- **2 → ②b 做乙。** 甲面大且 HSC 刚过手术,阶段一不动结构路径;乙 = 「因本块持失败而拒」那支不调 `onFailure`(三处哪几处会被这支走到,逐处写),拒键照旧,指示已亮。**不变量:拒键 = 不上屏、不入任何账(与修前同),只少 toast;别块照常。** Reviewer 核:跳过 onFailure 没有连带跳过任何账 / 带的记录。手册已知加一句:「某块保存持续失败期间,在那一块打的字不进笔记(块上有『未保存·重试 / 复制』);别的块照常;失败块自己会重试,或点 Retry」;甲记 TD(阶段二:失败期间本块的字排队、恢复后补结构)。kit (a) 对本块改为「指示亮、零 toast、别块能打」,**加一臂别块**(与 LANDOTHER 同操作,在 A-25 上量一次)。
- **3 → IME 按坐实改。** 不变量:**服务器永不收到组合中的文本——组合期间 draftRevision 的变化不触发 persist 也不触发追赶;交接只在非组合时刻发生;compositionend 后若草稿与服务器有差,追一次再交接。** 单测两例修前红:组合中 revision 连跳三次 → 0 PUT;组合中追赶已平 → 不交接,compositionend 后交接一次。阳性对照 = k25a IME-new 修前 20/24 红。**同段代码是 TD-77 的交接窄窗,改时 Reviewer 一并读**(他已读过该路径)。**跑那个只录 DOM 事件的小臂**(1 浏览器 5 分钟,取槽)——随 k25a 重跑一起,给实测的 compositionstart / end / 交接时刻,替掉固定 sleep 的口径。
- **4(新)→ 「双发」坐实并堵。** +1.16 / +1.30 s 两发间隔 0.14 s = 同一块两发在途,违 Reviewer 点名的「自动重试不成第二写者」。先答来源(失焦重试 H:1306 与退避定时器是否各一发);**不变量:同一块任一时刻最多一发保存在途**——定时器到点时该块有在途就跳过本次(或失焦重试取消定时器)。本次两发都 500 无害;服务器回来时两发同 baseRevision → 一发 409 → 冲突项,是真伤。单测一例修前红。
- **封前**:四处改动的文件快照(src + sha256)先给 Reviewer 读(按块闸三处 / 乙那支 / IME 两处 / 双发),再封;k25a + targeted 先跑,全量封前跑一次。回执「代码回答」把四条各一节。

### 第 4 条「双发」答:串行两发,不是两发在途 → 裁 (a) 只加护栏测试(Main_Designer 2026-11-09)
builder:离开 A 失焦 → `saveBlock`(:1275)先 `boundary()` → `session.seal()`(:1051)把 A 的打开组交写道(:740/:780)发第 ① 发;saveBlock 再 enqueue 一个操作(:1284)在 failures 里找到刚失败的组 → `retryFailedBlock`(:1306)发第 ② 发。两发都在同一条写道 `enqueueRuntimeHistoryOperation`(usePlacementHistory:76,`operationTail.then` 严格串行),后一发等前一发 outcome 才出;退避 / `online` / Retry 都经同一写道(:263);axios 无 timeout,不存在客户端先返回请求还在飞的形;第 ① 发 200 则 failures 删组、第 ② 发 `retryFailedBlock` 找不到组直接 return。修前测试 :1069 已写此形。**我的「服务器回来时两发同 base → 409」走不到,撤。裁 (a)**:护栏测试一例(第一发挂住,同时触发失焦 / 定时器 / online / Retry,断言 saveBlock 在途恒 ≤1),修前修后都绿;(b) 去冗余不做。

### A-25 r2 四条码成(builder);快照交 Reviewer 封前读;k25b 在排(Main_Designer 收 2026-11-09)
**1 按块闸**(`useTextFlowHistory`):persist :356、idleSave :831/:834、在道 :843 改本块判定。**码里新事实:空闲保存失败原本不进 `failures`,只置一个整篇旗 `idleSaveFailed`,且从不被自动重试**(SAVEFAIL 里 A 只靠失焦那发才进重试的原因;也是手册已知第 5 条「一次保存失败后停顿保存停止」的机理)。现在:空闲失败只标自己的块(`idleFailedBlocks` :445)、亮指示(:1376)、进同一退避;重试用屏上打开组的当前文(:284–291);仍不进 `failures`(打开组是克隆,沿用 r3e 理由)。改一条 r3e 旧测前提(「a failed idle save is not retried at every pause」原第二次暂停会撞 2 s 退避 → 改用 409 不自动重试,仍测「暂停不重发」,注释在侧)。新测 4 例修前 3 红,第 4 例「A 自己的暂停仍停」修前修后都绿(护栏)。**2 乙**:新增 `FailedSaveHoldError` 带持失败块 id,HSC catch(:491–496)只在「本结构触及的块持失败」时不弹,拒键照旧;:389 watchdog 是超时非此拒;:485 走不到(flush 抛在 applyEdit 之前)。新测 2 例:本块修前红;他块照旧 toast 修前修后绿。**3 IME**(`useDraftBlockController` :203–220 / :583–591;`useRuntimeNaturalWritingController` :448–449):组合中追赶既不存也不交接;compositionend 后差多少追一次再交接;等待者在重置 / 卸载时放行。新测 2 例修前都红。**4** 护栏一例,修前修后绿。验证:tsc 0;受影响 8 文件 360/360(锁下);对照 scratch `a25/control-r2.txt`。快照 `<ops>/packages/a25-r2-prepack-snapshot`,`src.sha256` `52cb6ee5…856b9`,含 READ-ME 与 pre-r2 副本,已发 Reviewer。kit(builder 副本,Tester 原件未动,改法随回执给 Tester):LANDFAIL 建块后 API 加独立块「other start」,(a) 改「本块指示亮且零失败 toast,另一块打字上屏」,(d) 加「plus o 恰好一份」;IME-new 加 DOM 记录器(composition / input / 草稿 textarea 离开 / 编辑器出现 / focus,与网络同钟)。锁下跑 build + k25b(1 浏览器);全量封前跑。
**裁**:收。Reviewer 封前读按四条不变量(见下节派单);k25b 出数再报;手册随 A-25 收割改已知第 5 条(「一次保存失败后停顿保存停止,直到下一次 Enter 或点开的保存成功」→ 失败块自动重试、别块照常存)。

### Reviewer 封前读 r2 结:F1 / F2 🅰 候选 → 封前折进;F3 / F4 疑似 🅱 → 一并折进(按块原则);IME / 护栏成立(Main_Designer 裁 2026-11-09;发现在 `docs/audits/2026-11-08-a25-builder/reviewer/findings-r2-prepack.md`)
- **F1(乙,🅰)**:`FailedSaveHoldError` 还有第二个抛点——HSC:429 结构操作体里 applyEdit **之后**的 flush。结构编辑自身的保存失败时:编辑已上屏、批次已进撤销栈(H:989–993),runBatch 不接异常(H:992–995),:496 照样静音 → 半成品结构(标题未独立成块)无任何提示,重试成功后就那样存上服务器。builder「flush 抛在 applyEdit 之前」只对外层成立,现有测试只走外层。**裁:折进**——只在批次操作体**还没开始**时静音(真·拒键);操作体已开始后的失败照旧 `onFailure` 恰 1 次;补一例红测(结构自身保存失败 → onFailure 恰 1 次)。这正是乙的不变量「拒键 = 不上屏、不入任何账,只少 toast」被违反的地方:已上屏、已入撤销栈的不是拒键,不能静。
- **F2(按块闸,🅰)**:重试 PUT 在途时人在 X 继续打字、再停手,空闲定时器在 H:834 被 `savePausedFor` 挡下直接 return 不重排;PUT 成功后 :440–441 熄指示、停退避 → 后打的字不发、不标,只能等下一次按键或失焦——与 SAVEFAIL (c) 的 B 同机理,换到 X 自己身上。**裁:折进**——成功分支见打开组仍在 X 且与已发不同就 `scheduleIdleSave()`;补一例挂住 PUT 的红测。不变量补一句:**任一次保存结束(成或败)后,凡有未发字的块都要么有定时器在排、要么在退避里、要么亮着指示,不存在「三者皆无」的块。**
- **F3(疑似 🅱)**:空闲 4xx 现在置**整篇** `saveRetryRefused`,X 的 409 会停掉 Y 的自动退避。**裁:折进**——`saveRetryRefused` 按块;与按块闸同一原则,不另起 TD。一例红测(X 409、Y 5xx → Y 退避继续)。
- **F4(疑似 🅱)**:空闲失败的重试支绕过 `canSaveWhileTyping` 等改期检查(可能在人打字 / 组合中把半截字送上服务器;与 IME 不变量「服务器永不收到组合中的文本」擦边)。**裁:折进**——重试支走与空闲保存相同的改期检查,被挡就重排退避而不是跳过;一例红测(打字 / 组合中退避到点 → 不发、重排)。
- **O1**:卸载放行的注释与代码不符(实际靠 history 的 saveBlock 拒发兜住)→ 改注释。**O2**:compositionend 每条结束路径都要以 `composing:false` 调 `handleDraftChange`,`DraftBlockEditorLayer` 不在快照 → builder 回执「代码回答」给行号,并把它加进 r3 快照。
- **IME 与护栏成立。**
**流程**:builder 折 F1–F4 + O1/O2 → r3 快照(加 DraftBlockEditorLayer)→ Reviewer 只读 delta → k25b 重跑 + targeted → 全量 → 封。Tester kit 正本不受影响(F1–F4 都有单测红;F2 若要臂,Tester 定,⛔ 我扩项)。**判断点**:Reviewer 封前读今天第三次把 🅰 拦在包外(D1/D2、乙回写、F1/F2),且 F1 是我裁乙时「只在拒键那支不弹」这句没写清「拒键 = 操作体未开始」的直接后果。

### A-25 r3:F1–F4 + O1/O2 折进,delta 快照交 Reviewer(builder;Main_Designer 收 2026-11-09)
F1:HSC 批次操作体开头置 `bodyStarted`,只有操作体没开始时静音;结构自身保存失败 → onFailure 恰 1 次。F2:某块成功前若在失败中,成功后打开组仍在该块且与已发不同 → `scheduleIdleSave()`。F3:`refusedBlocks` 按块取代整篇旗;Retry 与 online 照旧问全部。F4:重试前过 `noteBusyForSave()`(空闲保存同一组改期条件 + 组合中),忙则隔 2 s 再看。O1 注释改;O2 `DraftBlockEditorLayer` :86–91 每次 compositionend 以 composing:false 调 onChange(值变没变都调),文件进快照。新红测 5 例(F1 1、F2 1、F3 1、F4 2)在 r2 源上全红、原因对;tsc 0。快照 `<ops>/packages/a25-r3-prepack-snapshot`,`src.sha256` `982e9916…54ced`。排程:k25b(r2 包,作 r2 读数留档)在跑 SAVEFAIL 段;targeted 等槽(两槽 = builder k25b + Tester kit 验证);之后 r3 build + k25 → 全量 → 封。
**裁**:封前自测的 k25 用 **Tester 正本**(她在修前证红后会发用法);若轮到槽时正本还没到,先用你的副本跑、正本到了不必补跑——验收那遍由 Tester 用正本跑,那才是判语依据。Reviewer 读 r3 delta ∥ 你的链。

### Tester kit r2 正本就绪(底上 11 行全红);toast 判据统一为「恰 0」;底上 IME-new 实测时间线(Main_Designer 2026-11-09)
正本在 A-25 的底(A-20b r2)上跑过(槽 2,17:27–17:36,单浏览器):**11 行全红、0 设置错**,改过与新加的判据都红得出来;builder 的 diff 全吸收(臂名、字段名照他)。Tester 另加 4 处:① imeLog 加页面内 XHR / fetch 钩子,POST /blocks 发出与回程与交接同钟,分析器按行判「交接是否切断组合」「POST 是否在组合中发出」;② LANDFAIL「本块指示亮」改在打别块**之前**读(免别块自己的 Retry 冒充);③ (d) 加乙的不变量:被拒的 `' plus w'` 不进任何账(服务器 / 框 / kept store);④ 新臂 LANDFAIL-other-<plain|heading|headline>,与 LANDOTHER 同操作,默认 ×1。**判据口径(裁)**:失败 toast 一律「**恰 0**」——LANDFAIL 两臂已是 0;SAVEFAIL (e) 从 ≤1 改为 0(②a 裁定原句「一次失败 = 0 toast + 1 指示」;builder 上次量到 0)。O2(Apply 后先败后成)不在此口径内,手册已知。
**底上 IME-new 实测时间线**(修前 = A-20b r2,给 ① 与 TD-77):POST /blocks 在第一个字母 `d` 的组合**中**发出(6–10 ms),16–23 ms 回 201;交接时刻 = 焦点移到编辑器(36–60 ms),同一毫秒草稿上的组合被 compositionend(`d`)结束,5–8 ms 后草稿才离开文档;下一个组合在编辑器里开始 → `ddi` → `d第一测试`。**底上两跳都没守住**(组合中建块;交接切断组合);A-25 r2 的 k25a 已把 POST 推到「第一」提交后(585–605 ms),r3 再守交接。正本的分析器按**焦点移动**算交接(builder 副本按 draft-left,会把这形判成「组合外」)——以正本为准。

### Reviewer r3 delta:不挡,F1–F4 / O1 / O2 全成立;R1 🅱 → 封前一行折进(Main_Designer 裁 2026-11-09;「## r3 delta」节)
**R1(🅱)**:`refusedBlocks` 只在本块保存成功时解除;块的失败经另外三处消失时不清——被拒的提议补丁(H:801,多半 4xx,会先置拒停)、块已不在(:289)、打开组离开本块(:307)→ 之后该块再出 5xx 不进自动退避,只能靠 Retry / online / 下一次成功;指示照亮、不丢字。新红测 5 例走的正是原反例那一跳(F1 内层 flush、F2 挂住 PUT)。**裁:折进,取「块不再有失败时一并 delete」**(三处各一行;与 F3 同一不变量「拒停按块且与失败同生灭」);一例红测(X 409 → 拒停;X 的失败经 :307 离开消失;X 再 5xx → 退避继续)。r3 链尚未起(k25b 留档在跑、targeted 等槽),此刻折最便宜。Reviewer 只看这三行 + 测试。

### R1 折进 r3(`settleRefusal` H:256–257,:292 / :311 / :806 三处调用;红测 H test :1528);O4 指示不重绘 → 一并折(Main_Designer 裁 2026-11-09)
builder:块没有任何失败(封口 + 空闲)时拒停一并解除;成功路本来就清(:463)。红测修前红(原因 = 不重试),tsc 0。快照原地更新 `src.sha256` `e7bb3ee6…07096`,已告 Reviewer。**O4**(Reviewer 观察):这三处删除不重绘指示,指示亮到下次重绘。**裁:一并折**——三处各加 setFailureTick,红测加「指示熄」断言;理由 = 指示是 ②a 用户唯一信号,「失败已不在却亮着未保存」违文案真话(与不取 (ii) 同理)。链:targeted 因改码停过一次(孤儿进程按 PID 杀、槽放),现排序 targeted → k25b(r2 留档)完 → r3 build + k25c(Tester 正本 body `be74e875…`,(e) 恰 0)→ 全量 → 封;每段在锁下。

### O4 折进(`failureGone` = 解除拒停 + 重绘,:295 / :314 / :809);Reviewer R1 核成立;链重起(Main_Designer 收 2026-11-09)
Reviewer:R1 成立不挡(`settleRefusal` 只在两本失败账都无该块时解除;三处都在删除之后调;红测走 :311 那跳,原因对);🅱 :292 / :806 无单独测试(同一行调用,读码已核)。builder O4:R1 那例加「指示熄」断言,在 O4 修前源上红(:1548);注释 :307 → :314;tsc 0;快照 `src.sha256` `dc39679a…2487e` 已告 Reviewer。链:targeted 因改码再停一次(孤儿按 PID 杀、槽放)后重起;排序 targeted → k25b 完 → r3 build + k25c(正本 `be74e875…`)→ 全量 → 封。**码面冻结:此后无 Reviewer 新 🅰 不再动码,出数即封。**

### Reviewer O4 核成立;残余一笔 🅱 只记不动包(Main_Designer 2026-11-09)
Reviewer:`failureGone` 三处(:295 / :314 / :809)都在删除之后调用;:1548 断言指示熄;注释行号已改。**残余 🅱**:封口复用空闲回执那支仍不清空闲标记,要走到 :314 才清(清时会重绘);若那块是 409 被拒停,指示亮到 Retry 或 online;触发很少。**裁:只记一笔(TD-78,随收割写),不再动包**——码面已冻结。

### k25b(r2 包)出数:IME-new 24/24、SAVEFAIL 全过、LANDFAIL (c)(d) 绿;**(a)(e) 仍红 = 乙在浏览器里没生效**(单测绿、浏览器红)→ 解冻一条,先诊断再改(Main_Designer 裁 2026-11-09)
读数(`kit-k25b.analysis.txt`):IME-new **24/24**(k25a 4/24),拼音入笔记 0/24;IME-mid 24/24;SAVEFAIL 四变体全 2/2,(a)–(e) 全过,追平 2.3–4.5 s,控件 Retry / Copy,toastsDuring 全 [](按「恰 0」也过);CHAIN 五式 2/2,H1 2/2,H2 2/2;**LANDFAIL 8/8 红**——(c)(d) 绿(服务器 `[warmup, [heading_1]head, body, other start plus o]`,别块 `plus o` 恰一份,auto 约 14 s、apply 约 4.2 s),(a)(e) 红:每行 7 条「Heading changes could not be completed」每键一条,与 k25a 同形,aOwn=false。builder 推断(未实测):拒绝没走到改的 catch(:491 起),走的是别处 onFailure——候选(甲)`!succeeded` 支(:485):`runBatch` 在 `batchEntries` 还开着时直接 return false 不抛(HSC test r2.2 #3 注释写过此形);(乙)flush 抛的是普通 Error(`boundary()` 假或 `whenHistoryIdle` 假)。survey ① 诊断构建量到 catch 是 A-25 之前的底,②a 自动重试后路径可能已变。r3 的 F1 只收窄静音,不影响此条,k25c 预计同红。
**裁**:**解冻只为这一条;先诊断再改**——targeted 完 → 诊断构建(三处 onFailure 前记站点 + error 类型,只跑 LANDFAIL-auto-500 一样本,1 浏览器约 3 分钟,取槽)→ 代码回答 → 改(预计一行,判据与 catch 同一条不变量)**+ 把浏览器实际走的那跳补成单测**(现单测走 catch,绿得不算数)→ Reviewer 看那一行 → r3 build + k25c → 全量 → 封。k25b 不必跑完,k25c 不在已知红的码上跑。**判断点**:乙的单测绿 / 浏览器红 = 测试钉的是我们以为的跳,不是浏览器走的跳;幸好 k25 的浏览器臂是真对照,一轮就抓住。

### Tester 验收四样备妥(新臂在底上红绿合预期);排程约 4.5 h;两问答(Main_Designer 2026-11-09)
**(1) k25 正本**:(e) 恰 0,builder 已重拷。**(2) D 出口臂** `a25d_probe.mjs`(a25_head + a25d_body,各 ×2,8 臂):D-anchor(出口①:[409,200],两边字都在,回执忘,无冲突项)/ D-unanch(出口②:锚没了一字不写,冲突项同今天,回执留)/ D-struct(出口②:回执多一单元)/ D-same(出口③:只一次 409,不写,回执忘)/ D-twice(出口④:合并那次写在请求阶段扣住、第二写者再改后放行 → [409,409] 无第三发,有冲突项,**正文 = merged**,O3)/ D-delonly(D1:只删字 → 冲突项)/ D-link-before / -after(D2:合并写入后链接区间仍覆盖 `beta`)。「第二写者」= node 从 API 发的普通 text-save(带当前 revision)。底上:unanch / struct / delonly 绿(D 必须保持的出口);anchor / same / twice / link×2 红(D 要改变的出口);D2 底上不发生合并、显示不出来,阳性对照靠 builder pre-D123 单测。**(3) A-20 / A-20b 整套回归在 A-25 上**(对线上 A-20b r2 比):链 190 逐臂对 gate-a20b(LIST-addr-0 那行若 A-25 绿会作一行差注明)、a20m(BACKIN / LIST / LANDOTHER)、a20n REPS=2 + 第三形、9 对 + 第 10 对(5612 对 5614)。**(4) 手册已知第 5 条**:k25 加 ONEFAIL-<500|net>(只让 A 块 text-save 失败),判据 (i) B 不按 Enter 不点外 6 s 内停顿保存落服务器 (ii) A 自己重试补齐且等待期间新打的字在内 (iii) 各恰一份各在各块 (iv) 失败 toast 恰 0;底上 2/2 全红(B 停、A 不重试、5 条 toast)= 第 5 条现写的行为。**排程**(封包后):环境 3614 新库 + 5614 dist,预注册三账号;槽 1 同源 → k25(35 min)→ D ×2(8 min)→ 链 190(90 min)→ a20m → a20n(55 min)→ 修前列(k25 + D 在 A-20b r2);槽 2 并行 9 对 → 第 10 对(1.5 h);合计约 4.5 h。**答**:server 到目前未动(全在 client/src),以 files.list 为准;包名 `a25-ime-save-failure`,dist 在 `dist/`。

### 乙诊断出数:被拒的键落在 catch 但 error 是 AxiosError(来自 `whenWritesIdle` 重抛,先于 flush)→ 一行改「看账不看 error 类型」(Main_Designer 收 2026-11-09)
诊断构建(只 1 个 LANDFAIL-auto-500 样本,三处 onFailure 前记站点,HSC 用完还原 cmp 核过):7 个被拒键全落 HSC catch(:493 起)、`bodyStarted` 为假,error = AxiosError 500 ≠ FailedSaveHoldError——来源 HSC :415 操作体之前 `await api.whenWritesIdle?.()` → 适配器写入登记 `inFlightWriteRegistry.ts:80 whenIdle`(:13 把失败那次写入的原错误抛回来),先于 runStructureBatch 的 flush;**r2 单测走 flush 那跳,绿得不算**。改法:HSC :501 `!bodyStarted && textHistory.holdsFailedSave(touchedBlockIds())`(看账);H :1414 新增 `holdsFailedSave` 读四种失败(typing / idle / template / document);HSC 不再 import FailedSaveHoldError(flush 照抛,无人看类型)。单测按浏览器那跳(whenWritesIdle 以 AxiosError reject):本块持失败 → 不弹(改前红);别块持失败 → 弹 1;无人持失败 → 弹 1(护栏)。HSC 83/83、tsc 0。快照 `src.sha256` `5f3e4c6c…91e39`。**裁**:收;Reviewer 加核一条「静音 ⇔ 该块亮指示」(四种失败每种是否都亮 :1376 的指示;不亮的收窄掉);链 targeted(HSC + H)→ r3 build + k25c(正本 + ONEFAIL)→ 全量 → 封。**判断点**:乙从「拒键那支不弹」到真浏览器生效走了三步(flush 抛类型 → 操作体开始前 → 看账),每步都是测试与浏览器走的跳不同;阳性对照只有浏览器臂算数,单测是复述。

### 「静音 ⇔ 指示亮」码面事实(builder 只读)→ 裁 `holdsFailedSave` 收窄到 typing + idle;A-25 最后一行(Main_Designer 2026-11-09)
指示只由 `failedTypingBlockIds`(H :1410 = failures(typing) ∪ idleFailedBlocks)点亮(runtime :674 → NoteWritingSurfaceLayer :1990 `saveFailed`);template / document 失败不进这张表、不亮此指示(另有横幅否未逐行核)。**裁**:H :1414 删 template / document 两支,读当时的账不读渲染快照;单测加「template 失败的块:照弹」护栏。**不变量定稿:静音 ⇔ 操作体未开始 ∧ 本结构触及的块在亮指示的失败账里(typing ∪ idle)。** Reviewer 核收窄后与点亮条件逐项相等。此后不再动码;targeted(HSC + H 补跑)→ r3 build + k25c → 全量 → 封。
Reviewer 独立核得同一结论(快照 `5f3e4c6c…` 6/6):typing / idle 成立;template / document 块上无常驻指示,只有 H:1423 replaying 让整篇 contentReadOnly(runtime :672)+ 控制条按钮 title 变「Retry saving block」(recoveryBlockIds → allowSaveRecovery → BlockControlBarLayer :155);HSC 的 readOnly 不含 `textHistory.replaying`(runtime :410),非键盘入口仍可能进 catch 被 :501 静音 → 建议收窄到 failures + idleFailedBlocks 与 :1410 同源(= 已裁)。附:保存在途时按下的首键可能先于记账,那一键会弹、当时指示也没亮,不变量仍成立。

### 收窄已做(最后一行);码面冻结;封前链起(builder;Main_Designer 收 2026-11-09)
`holdsFailedSave` 只读 idleFailedBlocks ∪ failures(当时的账);护栏「本块 template 转换失败(不亮指示)→ 照弹 1 次」收窄前红、后绿(HSC test harness 加服务器拒绝的 applyTemplateToBlock,只此护栏用);HSC 84/84、tsc 0;快照 `src.sha256` `2457c771…2b599` 已告 Reviewer。链(锁下):targeted 8 文件 → r3 build + k25c(Tester 正本 `52ce872a…`,ONLY 含 ONEFAIL)→ 全量;全绿即封、k25c 有红先停报。
Reviewer:收窄一行成立不挡(快照 `2457c771…` 6/6)——H:1415–1416 与 :1410 同两本账逐项相等;判定读当时的账、指示读最近渲染,增删两边都重绘,最多差一次尚未提交的渲染;HSC:501 仍带 `!bodyStarted`;护栏 :1945 收窄前红原因对。**封前读全部收口**;终核以封包哈希为准(目前 `2457c771…`)。

### A-25 包封讫,主设计核过;派 Reviewer 终核 ∥ Tester 验收(Main_Designer 2026-11-09)
包 `<ops>/packages/a25-ime-save-failure`。主设计自验(从包内):src 19 文件 / `src.sha256` 19/19 OK、自身 `0afec3d1…f10`;dist 63 / `dist.sha256` 63/63 OK、自身 `ba28414b…680`;主 JS `dist/client/assets/index-BngbSlvd.js` sha256 `92497a0c9a3c7cea084dfe9cec9ae0087d3830fa0ab8ca8bc627a16dfb241a4e` 与回执一致;Reviewer 最后快照(`2457c771…`)6/6 对包 src 逐字节同;**files.list 无 server / shared,server 与锁不变**;对岛上 `dfbcce8e`:**18 改 + 1 新**(`layers/BlockSaveFailedMark.tsx`)= 19 全是实改(H、HSC、适配器、草稿持久化、草稿 / 运行时控制器、BlockEditorLayer、DraftBlockEditorLayer、DraftWritingEntryLayer、NoteWritingSurfaceLayer、LayerProps + 7 测试)。builder 最后一条链(冻结后,锁下):tsc 0;targeted 8 文件 370/370;build 0;**全量 259 文件 2853/2853,exit 1 = 已知拆卸竞态 TD-74**(3 条 `document is not defined` structureTypingBuffer.ts:316,本次由 structureTypingConservation.test.tsx 触发,A-25 未改该文件)——**裁:按 TD-74 已知收,不重跑**(用例 2853 全过,exit 1 只来自拆卸);**k25c(Tester 正本 `5fba09fd…`,含 ONEFAIL)全部门绿**:IME-new 24/24、IME-mid 24/24;SAVEFAIL ×4 2/2 toast 0;ONEFAIL ×2 2/2;LANDFAIL auto / apply ×4 2/2(本块指示亮、toast 0、别块能打、被拒键不进账);LANDFAIL-other ×3 1/1;CHAIN 五式、H1、H2 全过。一条分类口径观察交 Tester(分析器把 IME 24 行归「handoff-cuts-composition-2」,依据是组合 2 中出现 editor-in 约 870 ms,但草稿在组合结束后才离开约 1700 ms、编辑器首个 input 为 null,24/24 正确——口径问题不是红)。回执 `docs/audits/2026-11-08-a25-builder/RECEIPT.md`,「代码回答」六节 + A-20b 测试债(S2/O4)一节;残留 TD-73 附 S1、TD-74、Reviewer 残余 🅱(TD-78 候)。
**派**:
- **Reviewer 终核**(对包 `src/`;发现落 `docs/audits/2026-11-08-a25-builder/reviewer/findings-final.md`):① 包 19 文件 vs 快照 `2457c771…` 6/6 同(主设计已核,一句确认);② **未读过的 13 文件**按本单点名核:①(a) 组合中不建块(草稿持久化 / 草稿控制器 / DraftBlockEditorLayer / DraftWritingEntryLayer——组合期间无焦点挪动、POST 不在组合中发出、交接等 compositionend)、②a 指示 UI(`BlockSaveFailedMark` / NoteWritingSurfaceLayer :1990 / LayerProps——亮灭与 :1410 同源、Retry / Copy 文案真话、复制取该块当前文)、(e) 收声两处、(iv) A/B/C/D 含 D1–D3 对适配器终版行号、单写者不变 / 自动重试不成第二写者 / 拒键范围只在那一块、H1/H2 修法对行、S2/O4 两例在、冻结红测试(每条修前红的测试在包里)。只出发现不裁。
- **Tester 验收**(按她备妥的四样 + 排程,基线 = 岛上 `dfbcce8e`):k25 正本全组 → D ×2 八臂 → 链 190 → a20m → a20n → 修前列;∥ 9 对 → 第 10 对。全量 exit 1(TD-74)在判语里照实记。
- builder:回 TD-77 候单待命(先不动码);A-25 期间不再改包。

### Tester 验收起跑:同源全绿;a20m 预言核对器 VOID 查明为核对器问题;IME 分类口径改(Main_Designer 收 2026-11-09)
同源:包自检 19/19、63/63;基线 `dfbcce8e` + 19 src → vite build 与包 dist 63/63 一致,主 JS `index-BngbSlvd.js` 逐字节同;18 改 1 新 0 同,无 server / shared。**a20m 预言核对先报 VOID**:核对器只读包里的 `useNoteRouteSaveBoundary.tsx`,A-25 未改该文件、包里没有 → 读出 null;改指向同源重建整树后两句文案 MATCH、`oracle ok`,该文件与 `dfbcce8e` 逐字节同;核对器修法(包里没有就回读基线)留阶段末。环境:3614 新库 `data-a25`、server 沿用原树;5614 服务包 dist,health 200;三账号预注册 201。**IME 分类口径**:原「交接」取焦点移到编辑器 / editor-in / draft-left 三者最早;A-25 上编辑器在组合 2 中就挂上但焦点与组合仍在草稿框 → 改为交接 = 焦点移到编辑器(无焦点事件退用 draft-left),editor-in 单列;新口径重读 k25c 24/24 归组合外(POST 约 596 ms 在组合 1 结束后;焦点约 1680 ms 才移,组合 2 已在约 1535 ms 结束);底上 4 行分类不变。analyze 新 sha `3d034c97…`,探针未动。排程照派单;k25 18:46 进槽 1,9 对进槽 2。

### Reviewer 终核:不挡;M1 🅰 候选(指示文案「trying again」对拒停块是假话)→ 一行折进、包原地重封、Tester 从同源重起;M2 / M3 → TD(Main_Designer 裁 2026-11-09;发现在 `reviewer/findings-final.md`)
Reviewer:快照 6/6 同;其余全成立——①(a) 一跳不漏;亮灭与 H:1410 同源(runtime :674 → :1990 → BlockEditorLayer :538);复制取 blockTextDrafts 当前文;零 toast(H:429 quietFailure、A:2338);成功即消失;(iv) A–D 与 D1 :463 / D2 :465–475 / D3 :2435–2437、:2461;(ii) :423 / :820;决定 3 :2261;H1 :243–250、H2 :536–541;S2 :1548 与 O4 :1193 都在;BlockEditorLayer 7 行、runtime 2 行只接指示。**M1(🅰 候选,文案真话)**:`BlockSaveFailedMark.tsx:23` 对每个失败块写「Not saved yet · trying again」,但 F3 后 4xx(401 / 403 / 409)拒停的块不自动重试,人会等不来的重试。**裁:折进**——去「· trying again」只留「Not saved yet」+ Retry / Copy,一个文件;包原地重封(新主 JS),Tester 停 k25 从同源重起(9 对不读文案可续跑);不重跑 k25c / 全量(一字串,验收整套重跑覆盖)。理由与 (ii) 不取、O4 折进同:指示是 ②a 唯一信号,不能说假话;此刻改 = 损失 k25 已跑的约 15 分钟,上岛后改 = 多一轮部署。**M2(🅱)**:「A previous block edit is queued for recovery」info 提示仍弹(每回执一次,非失败 toast)→ TD。**M3(🅱)**:(iv) B(A:2093–2101)/ C(A:2633)读码成立无专门单测 → 测试债 TD。**拒键范围注意点**:写入登记 `whenIdle` 任一写入失败即 reject → 失败期间别块的**结构键**(标题行 Enter 等)仍被拒并弹 toast,与「跨块隔离不做」一致;**手册「别的块照常」限定为打字**。O1 草稿框 onBlur 持久化不看组合标志(非 A-25 diff)、O2 Copy 无反馈 → 记一句。
Tester 停 k25(已跑 25 行挪 `k25-a25-void-v1` 不计;stopq 停不了原生 node.exe,改 taskkill 按 PID,事后无残留,stopq 补支);kit 只认按钮文字(Retry / Try again / Copy / Discard / 重试 / 复制)不匹配指示整句,不用改。**9 对会中途换构建**(5614 实时出包目录 `dist/client`,重封覆盖后新开页拿新 JS)→ 我原说「9 对可续跑」**撤回**,**裁甲**:9 对也停,重封后整套在新包上从同源重起(代价约 10 分钟);旧包 dist(`index-BngbSlvd.js`)Tester 冻结一份副本备查。

### M1 改完,包原地重封;主设计核过;Tester 从同源重起(Main_Designer 2026-11-09)
只动 `layers/BlockSaveFailedMark.tsx`(:24 `Not saved yet · trying again` → `Not saved yet`;头注释 :1–3 改「通常会自动再问,但服务器拒过的(401 / 403 / 409)不会,所以标记不作此承诺」);H 未动;无测试断言该句。验证(锁下):tsc 0、layers 32 文件 344/344、build 0;按令不重跑 k25c / 全量。**新哈希**:主 JS `index-4nEsyJNA.js` sha256 `f32a046c60b61e71f53844f93724af6bee0a6f152714b16c0a1e4bb4ae72c5ab`;`src.sha256` 自身 `08d0cb0d…4306`(19 行)、`dist.sha256` 自身 `a4b0e9a6…4eaf`(63 行);files.list 不变。主设计核:19/19、63/63、Reviewer 终快照 6/6 仍同、旧主 JS 不在 dist、src「trying again」0 处。RECEIPT 加「M1」行、证据 m1-exits.txt;MANUAL-SECTION / COPY-BACK 文案与主 JS 名同步。Reviewer 看 diff 一句确认;Tester 整套从同源重起(槽 1 序列、槽 2 9 对)。
Reviewer:M1 重封核成立(`08d0cb0d…` 19/19;与重封前清单逐行比只变 BlockSaveFailedMark.tsx,改动只 :24 与 :1–4 头注释,包内无「trying again」引用)。**Reviewer 侧 A-25 结清**;候 TD-77。
Tester 在重封包上从同源重起:包自检 19/19、63/63;新包 19 src 覆盖重建树 → vite build 与包 dist 63/63 一致、主 JS `index-4nEsyJNA.js` 逐字节同;a20m 预言 oracle ok;5614 首页引新主 JS、旧 JS 路径已无文件。起跑:槽 1 k25 正本 18:55,槽 2 9 对 18:55;排程同前。

### 验收中途读数:k25 / D 出口 / 第 10 对全绿;9 对 A-25 新出 1 红 `D:lines30-1`(落错块)→ 裁 🅰 候选、门悬、派 builder 代码回答 + Reviewer 不变量读(Main_Designer 2026-11-09)
**Tester 读数(重封包,基线 = 岛上 `dfbcce8e`)**:k25 正本全组绿——IME-new 24/24(时间线 24/24 交接在组字外:POST 在组字 1 结束后 2–4 ms、焦点交接约 611–800 ms)、IME-mid 24/24、SAVEFAIL 8/8((a)–(e) 全过,失败吐司 0,控件只 Retry / Copy)、ONEFAIL 4/4(B 闲置保存约 2.05 s 落库;A 自己约 7.07–7.09 s 补上,期间所打字也在;各在各块各一次;吐司 0)、LANDFAIL 8/8、LANDFAIL-other 3/3、CHAIN 10/10(ktwo=0 设计如此)、H1 2/2、H2 2/2。D 出口 16/16(八臂 ×2;twice 第二次 409 后合并体保留;delonly = D1)。**9 对**:mx 底侧 18 红(W 的 IME 16 行 + L:insert-1 + G:imeLines)A-25 全清;其余 8 对 A-25 红 ⊆ 底红(acc10 3=3、acc13 2=2 逐行同;6 对 0 红)。第 10 对 UNDOPAUSE:底 20/20 基准形;A-25 签名 0/20,2/20 末步 `['wa']` = 已知形(pre 侧 r3e 轮、A-20b 轮各 2/20)。**但 mx 上 A-25 新出 1 红不在底红内:`D:lines30-1`**——新笔记草稿里打 4 行(每键 40 ms,行间隔 30 ms 后回车)再打 `ee`;期望 `[aa,bb,cc,dd,ee]`,DOM 与服务器一致都是 `["","bb","cc","dd","eeaa"]`:第 1 行的 `aa` 落到了末行尾,第 1 行空。同时跑的底侧同一行绿;历来 11 次 mx(pre / post / r3e / A-20b 各轮)D 臂从未红【**更正(Tester 2026-11-09 判语前核数)**:不对。A-20 起带 D 臂的 mx 共 6 次 72 行 0 红(a20pre3e-mx / -mx2 / a20r3e-mx2 / a20preb-mx / a20belt-mx + 本轮底侧;a20pre-mx、a20post-mx 没有 D 臂);更早 11-05 / 11-06 编辑器组与 A-18 核验里 D 臂在**旧构建上红过**:verify-editor island-pre-2 4/12、island-pre-a4 2/12;verify-a18 local-pre-extra 4/12、island-pre-2 3/12、island-post-2 2/12、local-post-extra 3/12——其中四次同签名 `["bb","cc","dd","eeaa"]`(首行推到末行)。这是「归既有」的旁证;老形少一个空首单元,与本次 `["","bb","cc","dd","eeaa"]` 是否同一跳(alignFlowWithText 跳 vs 光标 0 跳)候 TD-77 开单时对】;本行 1/12;gap 80 / 150 / 300 共 9 行全绿。Tester 已起槽 2 复测(matrix D 臂两侧各 5 轮 = 每侧 60 行,量 lines30 复现率、看 gap 80+ 是否也红);槽 1 链 190 自 19:28 在跑,之后 a20m、a20n、底侧列。

**裁(性质)**:**落错块 = 🅰 候选**(用户打的字进了别的块、原块空——内容错位,不是迟到也不是重复;日用主路径「新笔记连打几行」)。不按抖动归类:同一臂同时在底侧绿、历史 0/11+,臂本身没问题。**候选机制(未量,读码待核)**:与 TD-77 同一跳——首键 POST 懒建块 → 确认到达时草稿框交接给编辑器、焦点回执**把在途键重发到当时的焦点处**;TD-77 是重发丢了选区(光标跳 0),这次像是重发落到了**当时有焦点的第 5 块**,而第 1 块因在途键被挪走而空。要 POST 回程慢到 4 个回车之后(本地约 600 ms+)才会显形——9 对并行负载能拉出这个窗;**岛上 RTT 本来就比 127.0.0.1 大一到两个量级,这个窗在岛上只会更宽**(主设计判断,未量)。A-25 ①(a) 恰改了这一跳(追赶环 / 交接等 compositionend),所以**不能先验说「与 A-25 无关」**。

**裁(门)**:9 对的判据「A-25 红 ⊆ 底红」此刻**不成立**,门悬;1/12 对 0/12 分不出谁(Fisher p = 1),所以**不用复现率定归属,用读码定归属**,复现率只作描述:
- ① builder **代码回答**(不改码,包冻结照旧):(a) 草稿期在途键在哪一跳重发、重发目标怎么选(焦点块?draft 块 id?);(b) A-25 diff 的 19 文件里哪些行碰了这一跳,改前改后目标选择有无变化;(c) 回车已把焦点挪到后续块时,这条重发能否把 `aa` 写进第 5 块、同时第 1 块落空——走哪条路径,行号对包 `src/` 快照;(d) 现场时间线(Tester 给 DOM / 服务器 / 请求记录)能否对上 (c)。写成「代码回答」节落 `docs/audits/2026-11-08-a25-builder/CODE-ANSWER-lines30.md`;判不出走哪条就列全候选。
- ② Reviewer **不变量读**(只出发现):不变量 =「草稿期打进去的键只能落在它被打进去的那一块(首块);首个回车之前的任何键不能到达后续块;交接 / 重发不改变键的归属块」。读包 `src/` 的 `useDraftBlockController` 交接 + 焦点回执重发、`DraftBlockEditorLayer` / `DraftWritingEntryLayer` 追赶环、`BlockEditorLayer` autoFocus 接收;对 `dfbcce8e` 同文件比:A-25 改前能不能破这条不变量、改后能不能、改动有没有拉宽窗。发现落 `reviewer/findings-lines30.md`。
- ③ 归属规则(预登记):**读码说 diff 碰了这一跳且能产出现场 → 红,修了再封,A-25 不上岛**;**读码说 diff 碰不到、底代码能产出 → 既有(TD-77 家族),A-25 放行,TD-77 范围加「落错块」且升为阶段一第一单**(岛上窗更宽,这不是 🅱);**读码判不出 → 不上岛**,builder 做 乙 式诊断构建(交接处记在途键的目标块与时序)——TD-77 单反正要用,不白做。复现率(两侧各 60)只作描述和 TD-77 的量,不单独开门关门;若底侧也红则直接归既有。
- ④ Tester:复测照跑;红行若能带上请求 / 焦点时间线(IME 记录器那套钩子)最好,带不上就 DOM + 服务器照旧;现场路径给 builder。链 190 / a20m / a20n / 底侧列照排程。

**更正(Tester 查库,Main_Designer 收 2026-11-09)**:上节「落错块」**不对**——服务器上这条笔记只有 **1 个 paragraph 块**(`09345083…`),里面 **5 个文本单元**:tu-1 空串、tu-5 `eeaa`;`text_save_revision=9` 与同组绿行 lines30-0 相同,建块到最后更新时差也几乎相同(2.92 / 2.44 s 对 2.95 / 2.47 s),两边都无恢复事件。**错位发生在同一块内的行(文本单元)之间**:性质描述照旧(「打的字进了别的行、原行空」),把「块」换成「行」;上节「候选机制」里「重发落到当时有焦点的第 5 块」相应改为「重发落到当时光标所在的第 5 行(文本单元)末尾」,仍是候选、未量;派给 builder / Reviewer 的问句里「块」一律读作「文本单元」,不变量改为「草稿期打进去的键只能落在它被打进去的那一行(首单元);首个回车之前的任何键不能到达后续单元;交接 / 在途键重发不改变键的归属单元」——与 A-20b r2 乙(`placeTyped` 对 `\n` 的切分、`source` 往返)相邻,但该改动底侧也有且底侧绿。**请求记录**:测试服务器不记请求、matrix 不录网络,这一行无时间线;Tester 在做带钩子的 D 臂复测(xhr / fetch、焦点、输入、草稿离开、编辑器挂载),槽 2 常规复测结束后跑,红行连时间线一起转 builder。ONEFAIL 判据「各在各块、各一次」用到此处读作「各在各行」。

**复测读数(Tester,Main_Designer 收 2026-11-09)**:D 臂常规复测两侧各 5 轮 60 行(槽 2,20:26–20:34,槽 1 同时在跑链 190):**A-25 0/60、底 0/60**。累计 lines30:A-25 1/15、底 0/15;D 臂全部 gap 合计 A-25 1/72、底 0/72——只作描述,不开关门(归属仍等 builder 代码回答 + Reviewer 不变量读)。带钩子的复测 20:36 上槽 2:只跑 gap 30,两侧各 60 行;钩子 = xhr / fetch 发出与返回(text-save 与 POST blocks 带发出的单元文本与 base_revision)、按键与输入(目标框、值、光标)、焦点、草稿与编辑器框进出、每 10 ms 全部框值快照(程序写入也抓到)。红行连时间线转 builder、抄主设计;全绿也报。

**加测:D 臂按住 POST /blocks(Tester 提,Main_Designer 准 2026-11-09)**:带钩子第 1 行(绿)已看清这一跳——第一个 `a` 在草稿里,POST /blocks 带 `"a"` 发出约 24 ms 返回,约 80 ms 后焦点交编辑器,第二个 `a` 才进编辑器;平常交接远早于第二行。Tester 猜 lines30 是 POST 慢到交接落在几行之后才出的(未量);**原 1/12 那次 3614 后端同时在接槽 1 的 k25、3612 没有——原观察本身两侧不对等**(记为原始观察的混杂)。做法:`matrix-dtrace-delay.mjs` = `matrix-dtrace.mjs` + 开关 `DPOSTDELAY`,浏览器里 `POST /api/notes/:id/blocks` 按住 N ms 再发,其他请求放行;只打 gap 30,延迟 150 / 400 / 800 / 1500 ms 各 5 行,两侧同时跑约 12 分钟,录同样钩子;带钩子那轮跑完(约 20:45)上槽 2。**准**,并预登记读法:这是**强迫开窗的阳性对照**,不是比率测量——(i) 两侧都出「首行跑到末行尾」→ 机制在底代码里,按预登记归既有(TD-77 家族);但**不等于 A-25 没拉宽窗**,这一问仍归读码;(ii) 只 A-25 出、底同延迟 0 → A-25 特有,连时间线给 builder 当确定性复现;(iii) 两侧都不出 → 不是这一跳,也是信息;顺手记**首次出错位的最小延迟**(TD-77 的量)。**岛上意义**:150 ms ≈ 加拿大→香港 RTT,400–1500 ≈ 网络差的瞬间——这轮同时是岛上实况的近似(主设计判断)。归属不论哪种仍由读码定。

**builder 代码回答(`docs/audits/2026-11-08-a25-builder/CODE-ANSWER-lines30.md`;纯读未动码;Main_Designer 收 2026-11-09)**:**(b) 判得出:A-25 diff 在这一跳惰性**——本臂无输入法事件(`isComposing` 恒假),草稿路径新增行全是空操作(DraftBlockEditorLayer :86–96、NaturalWriting :449/:451、Draft :205–222/:302/:585–593 追赶环 `for(;;)` 未 composing 时无新增 await、检查顺序同底);**交接 :620–664、焦点回执 :478–497、`draftCaretInFlow` :78–82 不在 diff 里**;目标选择改前改后一致(草稿会话自己的块 id、按行数取单元下标并钳到末单元、焦点回执整段采纳),窗没拉宽;文本历史 / 适配器改动**只在有保存失败时分叉**,且重试 `preserveDrafts:true` 只写服务器不改 DOM。**(a) 代码里没有逐键重发**:键落草稿框 → 追赶环整段存 flow → 交接选单元 → 焦点回执整段采纳;A-20b 乙 `placeTyped` 两侧都够不着(要 `#` 或留存词条且 :537 限同笔记;`mergeTypedText` 空锚返回 null)。→ **主设计上两节写的候选机制「在途键重发到光标处」被读码否定,撤**;TD-77 行里「回执重发在途键不带选区」(Reviewer 读法)与 builder「整段采纳」(:478–497)是同一跳两种读法,待 TD-77 开单时对齐,此处只记差。**(c) 判不出**:C1 焦点回执整段采纳(要草稿文本本身已是 `\nbb\ncc\ndd\neeaa`,即键先落草稿框且光标在错处)、C2 交接选错单元(解释不了已有 aa 离开 tu-1)、C3 单元 id 按位置复用 + 按 id 对位写错(机制类别对得上,没找到确切一行)、C4 placeTyped 排除;首单元为何空同样判不出(C1 / C3;「键被挪走」排除)。**(d)** 无时间线对不上也排不掉;revision 9 相同只说明成功保存次数一样。builder 落点:**「判不出」**;唯一能改写 (b) 的事实 = 红行期间有无一次保存失败。请录四项:每个 /blocks 请求的收发时刻、状态码、体内各单元 id 与文本;交接前草稿框最后 `selectionStart` 与值、交接后草稿框是否还收 input;焦点切换序列;页面有无 `[data-block-save-failed]`、控制台有无 `Failed to save block`。

**裁(门的细化,不挪预登记的杆)**:预登记三支里 builder 的结果落在 ②③ 之间——「diff 碰不到」**条件成立**(条件 = 红行无保存失败),「底代码能产出」**未指出确切一行**。细化:**放行需 ② 整支成立**,「底能产出」可由**读码指行**或**底侧经验复现**(Tester 的按住 POST 加测 = 不建构建的乙式诊断)两者之一满足。先查决定性事实:**原红行有无保存失败**——派 Tester 从已存 DOM 查 `[data-block-save-failed]`、从 3614 服务器日志查该笔记 / 块(`09345083…`)在那一行时窗内的非 2xx 与慢请求;带钩子复测与加测把 builder 四项全录(她的钩子已覆盖前三项,补第四项)。预登记后续:(甲) 底侧在加测或钩子复测里出同形 → ② 成立,放行,TD-77 吸收「同块落错行」并以加测为探针;(乙) 只 A-25 出 → 与 builder (b) 矛盾,红,builder 以时间线重答;(丙) 两侧都不出、原红行**查实无保存失败**、Reviewer **独立**读出 diff 在此跳惰性 → 判「既有(排除法)」放行,TD-77 吸收;§365 列为判断点请 Henry 复核(1/72 对 0/72 在不对等负载下分不出,两路独立读码都说 diff 不碰);(丁) 原红行**有过保存失败** → A-25 重试分叉在场,不上岛,builder 按分叉重答。builder 续冻结;C3 请指出单元 id 按位置分配与按 id 对位写入的文件 / 函数位点(不求行),供 Reviewer 定向。

**builder 补 C3 位点(追加在 CODE-ANSWER-lines30.md 末尾;都不在 A-25 diff 里;Main_Designer 收并转 Reviewer 2026-11-09)**:分配 id——textFlowService `createTextBlockContentV1`(tu-1)/ `normalizeTextUnit`(缺 id 按位置补);textUnitEditorService `createNextUnitId`(回车切分取最大后缀 +1,**光标不在末单元时 id 顺序与位置脱节**);`parseTextUnitsFromPlainText` / `reassignParsedUnitIds`;useDraftBlockController `draftTextFlowFromText` / `draftFlowForText`(按行切 tu-1…n,文本一变就重切)。按 id 对位写入或比较——C1 `handleDurableFocusReceipt` 整块写入重切的 flow、不对编辑器 flow 的 id;交接 `draftCaretInFlow` 按行数取下标不按 id;useTextFlowHistory `onEditApplied` 缺 metadata 时取 `previousTextFlow.units[0]`(按位置);`runBatch` 比较、`keepOpenEdit` 按 id 取 initialText(只离开笔记时走);`placeTyped` 按 `entry.focus.unitId`(本臂够不着)。**一处未定位**:注释说「编辑器会重建与文本半边不一致的 flow」,builder 没找到在哪个函数——请 Reviewer 查 C1 时补。

### Reviewer 不变量读:这一红不由 A-25 引起,现场形逐键可复原(交接后光标在 `tu-1@0` = TD-77 签名)→ 裁既有、A-25 就此红放行,TD-77 扩范围升阶段一第一单(Main_Designer 2026-11-09)
**Reviewer(`reviewer/findings-lines30.md`,各读各的,未看时间线)**:**L1 确认**——本臂条件(CDP 真键、无组字、无失败)下 A-25 在草稿框 / R:449,451 / D 追赶环 / D 交接 / D 回执 / BEL autoFocus / H / A 逐跳与 `dfbcce8e` 等价,窗没拉宽、目标选法没改;HSC `placeTyped` 与打字账本不在路径上。**L2 现场形复原(推断,逐键)**:交接发生在草稿只有 `aa` 时且编辑器接到光标 `tu-1@0` 而非 `@2` → Enter 在 0 切 `["","aa"]` 光标 `tu-2@0` → `bb` → `["","bbaa"]` → Enter `["","bb","aa"]` → … → `ee` → `["","bb","cc","dd","eeaa"]`,**与 DOM / 服务器逐字同**;其他起点(`aa\n`@0 多一单元、`a` 被拆、`@2` 正确)都对不上。**rawStart 为何是 0 未找到**,两候选交时间线:(a) D:630 从 DOM 现读 `draftRef.current.selectionStart` 无旁证;(b) BEL:406–410 焦点已在本块内即 return 不应用交接选区。**L3 疑似 🅰 候选(改前即有)**:BEL:424 回执单元不在 `textFlow` 且不是未渲染时退到 `textareaRef`(只挂下标 0,TBP:1800),键改落 `tu-1`;给出的光标正是 L2 要的 `tu-1@0`,但未找到同时保住那次回车的路径,单列。**L4 疑似 🅱**:回执迟到时 D:486–490 采纳新草稿文本而光标仍按旧 reconciliation(D:641–647)。首单元空 = `aa` 被挪走(推断,据 L2),不是没持久化。
**Tester 三条**:(1) **原红行有无保存失败:查不到**——matrix 只存 textarea 值不存整页 DOM、不录 console(只录未捕获异常,整轮 226 行 errors=0)、测试服务器不记请求(未处理 500 可排除;409 / 400 不记日志排除不了;axios 无超时、回环上「慢到超时」不存在)、库 revision=9 与绿行同但证明不了没失败、localStorage 批提交不算证据。钩子 v2 补第四项(失焦前后各数一次 `[data-block-save-failed]`;console 走 CDP `Runtime.consoleAPICalled` 单独统计「Failed to save block」),并在按住 POST 那轮最前加**阳性对照**(每行第一次 text-save 由探针回 500,两侧各 2 行;A-25 应见标记、底应见「Failed to save block」)。(2) **带钩子 gap 30(v1 录法)A-25 0/60、底 0/60**(20:35–20:42);时间线 min/中位/max:POST /blocks 往返 A-25 7/8/65 ms、底 8/9/15;交接(焦点进编辑器)比 POST 返回晚 A-25 16/17/77、底 16/17/137;交接前落进草稿的键两侧都 1/1/2 个字母,**120 行里没有一次回车落在草稿里**;非 2xx 两侧 0。→ 正常时序下草稿窗从没跨过第一个回车;原红行那形要窗跨几行(推测,未量),按住 POST 那轮正好测。(3) 累计更正:lines30 行 A-25 **1/78**、底 0/78(mx 3 + 常规 15 + 钩子 60);D 臂各 gap 合计 A-25 **1/132**、底 0/132;「1/135」作废。按住 POST 20:43 上槽 2(先阳性对照两侧各 2 行,再 150/400/800/1500 各 5 行)。

**裁**:
- **归属 = 既有(TD-77 家族),按预登记 ②**:「diff 碰不到」由两路独立读码成立(builder (b) + Reviewer L1);「底代码能产出此形」由 Reviewer L2 **读码逐键复原、与现场逐字同**满足(细化条款允许读码指行或经验复现其一)。**lines30-1 就是 TD-77 的签名(交接后光标在 0)在多行输入下的实锤形**:回车把「光标跳 0」变成「首行内容被推到末行」,🅰 不再是候选。9 对判据「A-25 红 ⊆ 底红」在机制意义上成立;**A-25 就此红放行**,验收判语仍归 Tester 看完整套(链 190 / a20m / a20n / 底侧列)。
- **丁(原红行有无保存失败)查不到**:L2 复原不需要任何失败;builder (b) 说 A-25 失败分叉只写服务器不改 DOM 文本。**剩一问派 builder 纯读**:A-25 的失败分叉(按块重试 / 按块空闲门 / 指示渲染 `setFailureTick`)能否挪焦点、改光标、或让 BEL:406 那刻焦点已在块内——能 → 丁重开;不能 → 丁 moot。不以「查不到」挡门;§365 列判断点。
- **TD-77 扩范围、升阶段一第一单(A-25 上岛后即开,先探后改)**:tech-debt TD-77 行已并入 lines30-1、L2、L3(旁支 🅰 候选)、L4(🅱)、builder 的机理更正(无逐键重发,焦点回执整段采纳)、两候选 (a)/(b) 与读点、Tester 频率与时间线。探针 = Tester 带钩子 D 臂 + 按住 POST 加测(两侧);builder 先出代码回答((a) 还是 (b);L3 能否同时保住回车)落 `docs/audits/2026-11-09-td77-caret0/CODE-ANSWER-caret0.md`,不改码。手册已知 13 收割时补「接着回车会把头一行推到后面」。
- Tester 的 500 注入阳性对照**准**(钩子选择器与 CDP console 未被阳性对照过,先对照再读延迟数据——对)。按住 POST 那轮读作 TD-77 探针与强迫开窗对照;读点加 L2 两候选:红行里交接那刻草稿框 `selectionStart` 是否 0((a)),交接选区应用前焦点是否已在块内((b))。

**Reviewer 补位(Main_Designer 收 2026-11-09)**:builder 没找到的注释「编辑器会重建与文本半边不一致的 flow」在 `useDraftBlockController.ts:73`,说的是 `blocks/TextBlockProjection.tsx` 的 `alignFlowWithText`(:226;:562–565 `editableFlow` 每次渲染 useMemo 都调它;两文件都不在 A-25 包里、对 `dfbcce8e`):文本半边与 flow 投影相等或 trimEnd 后相等 → 原样用 flow;否则按行交 `alignExistingFlowWithLines`(:184)——**第 i 行写进原第 i 个单元(保留 id 只换文字),多出的行用 `createAlignedUnitId` 补 tu-N** → 两半行数不一致时字按下标重排进单元;**A-18 那次 `["aa","","cc","dd","eebb"]` 就是这一跳**。→ 记为 TD-77 单的第三跳(与 C3「按位置对位」同类;lines30-1 由 L2 解释,不需要它),开单时 builder 代码回答一并覆盖。

**按住 POST 加测读数(Tester v2 录法;Main_Designer 收 2026-11-09)**:(1) **阳性对照过**——每行第一次 text-save 由探针回 500:A-25 2/2 行中出现 `[data-block-save-failed]`、2 s 自动重试成功后行末 0,CDP 两行都抓到「Failed to save block: AxiosError … 500」;底 2/2 无标记组件(预期 0)、console 2/2。**顺带事实:注入失败后 `text_save_revision` 最终仍是 9**(r0 失败、r0 重试、r1…r8)→ 原红行「rev 9 与绿行同」确实分不出有无失败(丁仍查不到,维持上节处置)。(2) **按住 150 / 400 / 800 / 1500 ms 各 5 行,两侧 40 行全绿**,失败写入 0、标记 0、console 0;交接前草稿已积几行(150 ms 1–2 个回车、400 ms 2 个、800 ms 3–4 个、1500 ms 整 5 行都在草稿),**交接那刻草稿光标都在末尾**(如 `aa\nbb\ncc@8`),交接后草稿再没收到 input,两侧都不错位 → **「草稿窗跨行」本身不出此形**;(a)(b) 无从读,无最小延迟。(3) L2 的条件是交接那刻草稿里只有 `aa`、回车还没进草稿 = POST 恰在第一个回车前后返回(gap 30 下约 70–110 ms);150 ms 已晚。Tester 用空着的槽 2 加跑**细扫 40 / 60 / 80 / 100 / 120 ms 两侧各 10 行**(约 7 分钟,20:48 起),录法同上,出红行按 (a)(b) 读并记最小延迟;槽 1 序列不受影响。**准**。TD-77 事实:多行草稿交接是良性的(光标在末尾、不错位),错位需要 POST 回程落在首个回车附近的窄窗 + 另一个让 rawStart 为 0 的条件(40 行里 rawStart 都对,单靠延迟触发不了 (a))。

**builder 两段纯读(Main_Designer 收 2026-11-09)**:(1) **A-25 门:失败分叉「不能」挪焦点 / 改选区 / 让 BEL 早退**(CODE-ANSWER-lines30.md「追加二」)——重试时 `historyRestore` 为假只做 `saveBlock(preserveDrafts:true)`,不 `restoreSelection`、不置 replaying,`contentReadOnly` 不翻动(例外 = 失败事务本身是撤销 / 重做一侧,本臂够不着);空闲门不碰 DOM;印记在 BEL 子节点占固定位置、TBP textarea 不重挂、不夺焦点(按下 preventDefault);印记引起的重渲染让 BEL 效果重跑,只有「早退」或「按交接选区重放」两路,造不出 0 也不会替别人先把焦点放进块内;A-25 没给 `contentReadOnly` 加来源。→ **丁 moot:原红行有无失败不影响 caret-0 归属;A-25 就 lines30-1 的门关清。** (2) **TD-77 预备**(`docs/audits/2026-11-09-td77-caret0/CODE-ANSWER-caret0.md`,行号对 `dfbcce8e`;包里 BEL 后移 6 行,Reviewer 引的 406–410 = 底 400–404):**(a) 读到 0 有一条码路 = 草稿框重挂**——DWEL:74 只在 `draftActive && !contentReadOnly` 时渲染 DBEL,`contentReadOnly` 闪一次就换成新 textarea(value `aa`、选区停 0、焦点落 body),D:251 聚焦效果不重跑,D:600 读到 0;React 受控更新不会复位到 0(值不同时写 value 光标到末尾);程序设草稿选区的只有斜杠命令;**本臂里让 `contentReadOnly` 闪动的来源未定位**(清单在文中,`walls.saving` / `sourceProjectionPolicy` 最可疑但没找到调用)。**(b) 没找到推手**:交接那次渲染焦点还在草稿框不会早退;能 focus 块内 textarea 的代码(TBP `focusTextUnit`、BEL :418–424、`focusNearestTextArea`、`placeTyped` finish)全都同时设选区;builder 判 (b) 弱于 (a),只登记不选边。L3:回执单元 tu-1 在 persistedFlow 里走不到。三支都不丢那次回车,只决定谁接住、切在哪。**时间线四读点**:① 交接前草稿框元素有没有换(快照断点 / focusout 到 body);② 交接前最后一帧草稿框 `selectionStart` 是 0 还是 2;③ 交接前有没有 editor 类型的 focusin、光标在哪;④ 草稿期草稿框有没有短暂消失(`contentReadOnly` 闪动)。→ 转 Tester 用于细扫红行与后续探针。

**细扫读数(Tester;Main_Designer 收 2026-11-09)**:按住 40 / 60 / 80 / 100 / 120 ms 两侧各 50 行**全绿**(20:47–20:54),失败写入 0、console 0,无红行、无最小延迟。**L2 前提(交接那刻草稿正好 `aa`、回车未进草稿)在全部带钩子 264 行(v1 120 + 对照 4 + 按住 140,两侧各 132)里出现 76 次(A-25 40、底 36),红 0。** builder 四读点对 264 行:① 交接前草稿框元素没换(draft-out / draft-in 0 次;每行只失焦一次即交接,失焦后 0–13 ms 焦点落编辑器,没停过 body);② 交接前最后一帧草稿框 `selectionStart` 264/264 在末尾,0 次为 0;③ 交接前 editor focusin 0 次;交接后编辑器第一帧光标 264/264 在末尾,交接后第一键落在非空行 0 位 0 次;④ 草稿框短暂消失 0 次。**结论:重挂码路在 264 行里一次没出现;单靠 POST 时序推不出 rawStart=0,还需要那个闪动的来源。** 原红行可确定的条件只有两样:**长会话**(mx 第 133 行,前面已跑 K/W/H/N/R/V)、**同一后端上槽 1 的 k25 并行**。槽 2 空、不再加测;槽 1 在链第 13 步(a20m BACKIN + LIST,20:31 起),之后 a20m LANDOTHER、a20n、底侧列,判语随整套出。→ TD-77 开单时探针条件应复刻这两样(长会话 + 并行负载,带 v2 钩子跑整套 mx),不是单臂短探;A-25 门不受影响。

**builder caret0 更正与建议(Main_Designer 收 2026-11-09)**:「草稿框重挂」码路在 264 行里一次没出现 → (a)-重挂只是码上可达、未被观测;(b) 也没有(已补记 CODE-ANSWER-caret0.md 末尾)。每行都整页重载,能跨行累积的只有**本地存储**(block drafts 快照、恢复收据、留存词条、草稿恢复收据)和**后端负载**。建议排一单在长会话尾部挂钩子复现,四读点之外加录:① 每行开头本地存储各键条数与大小;② 打开笔记时各 GET 的时刻、交接后有无第二次数据读取落地;③ 交接前后块的 `readOnly` 与 `data-draft-phase`。**裁:这就是 TD-77 单的探针设计,写进 TD-77 行;是否现在用空槽 2 先跑一轮(只跑底 `dfbcce8e`、整套 mx 带 v2 钩子 + 三项加录、槽 1 负载在场即复刻并行条件)由 Tester 看容量定,不挡 A-25 判语。**

**TD-77 探针先跑(Tester,槽 2,21:0x 起约 45 分钟;不耽误槽 1;Main_Designer 收 2026-11-09)**:只跑底 A-20b r2(5612 → 3612,单浏览器),整套 mx(K,W,H,N,R,V,D,L,G)复刻原红行前的长会话,槽 1 负载在场。钩子 v3(`matrix-dtrace3.mjs`,sha `0070a537`)只挂 D 臂、其他臂与 matrix.mjs 逐字同;v2 之上补 builder 三项:① 每个 D 行开始时 localStorage 各键组(去 id)条数与总字符数;② 每行结束读 performance resource 条目(打开笔记以来所有 /api 请求起止,与钩子同钟);③ 每帧快照带各 textarea 的 `readOnly` 与最近 `data-draft-phase`。四读点用 `ana-remount.mjs`。跑完报,红行连时间线给 builder 抄主设计。顺记:v3 首次生成时模板串里两个查询掉了一层反斜杠(`/\/api\//` 变注释),上槽前解析检查(`chk-dtrace3.cjs`)拦下已改;v2 注入是插值、阳性对照路径匹配对,不受影响。结果归 TD-77 单(阶段归属候 Henry 拍)。

**Henry 拍(2026-11-09,本会话直接作答)**:「we can do 77 next week or if we still have token」→ **TD-77 挪阶段二**:下周做,或本周额度有余再做;**阶段一到 A-25 上岛 + 阶段末封版收**。主设计上节「升阶段一第一单」的判断作废;Tester 槽 2 已在跑的探针跑完归档进 TD-77 行即止,本周不再为 TD-77 开读码 / 施工;A-25 上岛后 builder、Reviewer 两会话停(空闲);阶段末只 Tester 跑回归。手册已知 13「阶段一修(TD-77)」收割时改「下阶段修」。

### 链 190 / a20m 读数:OFFALL 真离线下 A-25 每次重试弹一条对账提示(候裁 → 裁 🅱 TD 不挡)、a20m 11 行准备闸没开(Tester 补)、2 行光标跳污染补跑(Main_Designer 2026-11-09)
**Tester**:链 190、a20m LANDOTHER 已收(a20n 20:56 起槽 1),逐臂对 A-20b r2 判语链 diff:
1. **【候裁】k-toast OFFALL(所有 /api 断网含 GET,真离线)**:底一次失败出 2 条(「Failed to save block」+「Block save result could not be reconciled」各 1)之后不再出;A-25「Failed to save block」0 条(合 (e)),**但每 2 s / 4 s 退避自动重试,每次重试失败都弹一条「Block save result could not be reconciled」,9 s 内 3 条,两行一样,按退避推离线越久弹越多(只推未量)**。OFFLINE-N(只断 text-save、GET 通):A-25 0 条、底 1 条。两侧最后都落地,臂判据(「Failed to save block」≤1)都绿。→ (e)「一次失败 = 0 toast + 1 指示」在真离线这一形下不成立。现场 `<scratch>/a20/runs/a25-k-toast/rows.jsonl` 与 `runs/belt-k-toast/rows.jsonl` OFFALL-0/1。
2. **【覆盖缺口】a20m 4 臂 11 行在 A-25 上没跑起来**(BACKIN-fail-sealed ×2、-refail ×2、-idlefirst ×5、BACKIN-ctlfail ×2):准备步骤等失败 toast 出现才往下,A-25 按 (e) 不弹 → 8 s 超时记 setup error;分析器 total red 不计 setup error,链 diff 显示「红 0」但这 11 行等于没测。补法:`a20m_probe_gate.mjs` 只改准备闸为「失败 toast 或 A-25 `[data-block-save-failed]` 标记任一即可」并记哪个开的闸,臂判据一字不动(与原版 diff 3 行);两侧同跑,底作改闸不改底行为的对照。
3. **准备步骤被光标跳污染 2 行**(TD-77 家族,与 A-20b LIST-addr-0 同形):K1-paste500-1 准备得 `["rmup","notewa"]`;LANDOTHER-plain-1【更正:应为 **LANDOTHER-plain-0**,plain-1 是绿的(Tester 2026-11-09);TD-77 频次按 -0 记】得 `["wmup","a",…]`;同轮其余行绿。补跑 K1-paste500 ×2、LANDOTHER-plain ×2。
4. 其余 diff 都合 A-25 裁定:d 标签 toast 2 → 0、重开过期横幅不再出;offkill 原「②a 前丢失」现在字保住;m 的 close 原「A block edit is waiting… Apply Dismiss」现在「Not in the note yet / Discard」、服务器同为 `["warmup","kN"]`;LIST-addr-0 在 A-20b 上被污染成红、这次绿。
2、3 合成一单 `run-a25-fill.sh`(一锁位、≤2 浏览器,约 25 分钟),哪个槽先空就上;判语照旧等整套。

**裁**:
- **1 OFFALL:🅱,记 TD,不挡上岛;如实列为「真离线这一形比线上多弹」。** 理由:数据面 A-25 严格好于底(底不自动重试,要人回来按 Retry;A-25 联网即自动落地,两侧都落地)【**理由更正(Tester 2026-11-09 核时间线)**:这一臂上「底要人按 Retry」不成立——两侧都是联网后打 ` back online` 引发的那次保存落地,时间相近(A-25 15.13–15.15 s、底 15.16–15.19 s),底也没按 Retry。改理由为:**数据面两侧同落地、同触发,差只在噪音**;A-25 自动重试的数据面好处由 SAVEFAIL (c) 与 ONEFAIL (ii) 证明,不由 OFFALL 证明。3 条 = 首次失败 1 + 两次自动重试各 1。🅱 裁定不变,理由换】;差的只是噪音,且由退避有界;日用主路径是「保存偶发失败」不是整网断,k25 的 (a)–(e) 与 ONEFAIL 覆盖的正是前者。(e) 的范围据实收窄为「text-save 失败、GET 通」;「Block save result could not be reconciled」是 `quietFailure` 没盖到的**第二个 toast 源**(对账路径),修向 = 对已在失败账上的块,重试失败的对账提示走同一静音(指示已亮,不需再说)/ 或退避内只提示一次;来源行号开单时读。手册加一句已知:「真断网时,每次自动重试会弹一条『无法对账』提示,联网后自动补上,不用动」。§365 列判断点(主设计选了「数据对、噪音多」上岛,Henry 若认为真离线噪音是 🅰 可叫停第 25 轮)。
- **2 补闸:准**(两侧同跑,底作对照;改闸只改准备、判据不动;行里记开闸者)。分析器「total red 不计 setup error」是 kit 的一个盲点——这 11 行若不是她逐臂看 diff 就漏了;**kit 改法归 Tester 阶段末**:setup error 单独计数并在判语里列出。
- **3 补跑:准**;两行记 TD-77 的频次(准备阶段人速外的臂也撞)。
- 4 收。

**TD-77 长会话探针结果(Tester 槽 2 20:59–21:41;归档进 TD-77 行,到此为止)**:只跑底、整套 mx 226 行、D 臂 v3 钩子、槽 1 负载在场:D 臂 12/12 绿(其余红 W 16 + L 1 + G 3 = 底已知输入法组,A-25 已修);四读点全阴;v3 三项:① 探针配置目录 localStorage 只有 `coincides_auth_token`(192 字符)一键,**原红行的 A-25 配置目录里留着 `draft-recovery`、`unplaced-words` 等键——两边不同,可疑条件,未量**;② 交接后块数据无第二次 GET;③ `readOnly` 全程 rw、草稿相位 focused → dirty,无闪动。结论:长会话 + 负载也不复现,闪动来源未定位。数据 `<scratch>/verify-editor/runs/a20bp-mxT77/rows.jsonl`;全部 dtrace 跑与分析器归档 A-25 证据目录 `td77/`,判语单列一节指过去。fill 单排队待槽 2。

**fill 读数(Tester 槽 2 21:41–21:52,全绿;Main_Designer 收 2026-11-09)**:(1) 补闸后 a20m 4 臂 11 行两侧 11/11 绿——A-25 每行由 `[data-block-save-failed]` 标记开闸、底每行由 toast 开闸;对照:底在双闸下四臂读数与 A-20b 判语链 belt-m 归一化后逐字同(改闸没改底行为);A-25 上 sealed / refail / idlefirst 都是第二次离开被拒、0 LEFT_UNSAVED、0 留存,与底同形【**更正(Tester 2026-11-09)**:不是「与底同形」。离开被拒那段同形;**放行后分叉**:A-25 自动重试落地,服务器 `["warmup","backin words"]` 或 `["warmup aaa","bbb"]`,重开无恢复项;底不自动重试,服务器停在 `["warmup",""]`,字留在恢复回执里,重开出带 Apply 的横幅,要人点才落地。差在 A-25 好的一边】;**ctlfail 一处差在 A-25 好的一边**:判类同为 REFUSED,底在服务器放行后 'ctl words' 0 次(字没落地、无自动重试),A-25 离开被拒期间自动重试 2 次(仍 500)、放行后落地正好 1 次【更正(Tester 2026-11-09):那两发 500 是准备阶段失焦的串行两发,两侧都有;离开被拒期间 A-25 按退避只重试了 **1 次**(被探针扣住),放行后得 200、落地 1 次;底这期间 0 发】;第二次离开被拒时两侧都弹「Changes could not be saved.」(拒绝离开的提示,不属 (e) 的失败 toast)。(2) 补跑 K1-paste500 2/2、LANDOTHER-plain 2/2 绿;污染 2 行记入 TD-77 频次。a20n 主轮 74 行跑完、第三形 3 行在跑;然后底侧列(k25 与 D),全收后出判语。

### 整套收齐(底侧列 22:30 完;判语的 Opus 复核 4 读者 ×4 核对者 31 条全确认);Tester 核数更正四处已就地标【更正】;三问裁(Main_Designer 2026-11-09)
Tester 判语方向:放行。她在出判语前把先前报给我、已进订单的四句核了一遍,错的四处(:309 D 臂历史、:359 LANDOTHER-plain 行号、:371 ctlfail 次数与 sealed/refail/idlefirst「同形」、:364 OFFALL 理由)已在原句旁加【更正】,裁定本身都不受影响(lines30-1 归既有的旁证反而更强:旧构建上 D 臂红过四次同签名;OFFALL 🅱 不变但理由换)。**覆盖缺口 7(H2 冻结版红单测)Tester 正在补**:scratch 副本把 `useHeadingStructureController.ts` 换回 `dfbcce8e`,单跑包里「H2: the note changes between queueing a kept record and its landing…」一例,包树再跑一次,一锁位几分钟;冻结版上若红在别的原因,如实写「独立核不了,依 builder 所述」——收,这正是订单 :43 / :88 写的判据,浏览器冒烟不替代它。

- **问 5 第 10 对 UNDOPAUSE,A-25 2/20 末步 `['wa']`(底 `dfbcce8e` 本轮 + 上轮 0/40、r3e 0/20;只在修前 `04f6f822` 两轮各 2/20 出过)——裁:归 TD-63,🅱,只记数,不挡。** 读法:UNDOPAUSE 第三次 Ctrl+Z 撤的是 warmup 那段打字,撤掉多少取决于撤销块边界,边界随保存落地时序走——TD-63 记的就是「终态随环境不同」(builder 环境 `[]`、Tester 环境 `['w']`),每个环境里基线 = 包。A-25 的每块空闲门与重试改了保存时序,边界挪一格(`'w'` → `'wa'`)与 TD-63 的性质同向;`04f6f822` 这台机上也出过 `['wa']`,说明它随构建时序飘而不是 A-25 新形。2/20 对 0/60 按率分不出(单侧 p≈0.06),按停线规则只记数。**不变量(以后 UNDOPAUSE 的闸按这条写,不再按「= 同环境基线」)**:三次 Ctrl+Z 后 warmup 块的文 **必须是 `warmup` 的前缀**(含空、含块不存在);出现非前缀(字序乱、丢中间字)才是 🅰。今天「= 同环境基线」跨构建比太严、又抓不住真坏形——kit 改法归 Tester 阶段末。TD-63 行补频次(A-25 2/20、dfbcce8e 0/60、04f6f822 2/20 ×2)。
- **问 6 HEADCLOSE-putback:Apply 得 409、无合并写、走冲突项;:188 预期写的是合并成 `['warmup bbb','aaa']`——裁::188 预期按问 1 (c) + 问 2 (b) 改成「今天的冲突项」,不记「未达」;但如实记这是裁定前后不一致。** 机理(复核者读码):第 1 行回执与打开时相同,按设计跳过;`aaa` 打在打开时为空的第 2 行,`emptyMatches false` 下空行不算锚点,`mergeTypedText` 返回 null → 全有或全无 → 冲突项。:188(iv)验收臂是 D 的第一稿预期;:193–195 后来裁 (c)、(b) 与 `emptyMatches false` 时**我没回头改 :188**——两条裁定之间的矛盾由 Tester 跑出来才看见(判断点,进 §365)。实测形比线上好(线上 aaa 静默丢;A-25 aaa 在冲突项里,可 View differences;Replay 整块替换会盖掉 bbb = TD-69 已知),Apply 后一条「Failed to save block」= O2 已裁 🅱。**随收割记 TD(🅱,阶段二,附 TD-69 节)**:D 合并对「打开时为空的行」永远锚不到,而这正是 putback 最常见的形(在空行上打字);修向不是放宽空行匹配,而是加一条紧的规则——**服务器单元文 === 打开时单元文(别人没碰过这一单元)⇒ 该单元直接采回执文**,其余仍走 `mergeTypedText`。这条规则对单元级单写者是严格安全的(没人改过的单元,回执就是唯一的改动);写进 TD 候 Reviewer 读。
- **问 8 两条 (iv) 验收臂没跑(「模板转换后别次条目仍在」决定 C;「链里按『1 条』写的行列出并改注」)——裁:判语里写明「未覆盖」,记 TD,不挡;不为它推迟判语。** 理由:决定 C 的实现 Reviewer 终读已按码核过(`findings-final.md` :46 / :92「C 在 A:2633 成立(读码),无测试,见 M3」),缺的是测试不是读;而且这条路两个方向的失败都不比线上差——忘多了 = 线上今天的行为(模板转换连别次的一起忘),忘少了 = 别次条目留着、Apply 不匹配走冲突项(决定 C 自己已记这条 TD)——没有丢字的方向。第二条「列出并改注」Tester 已用宽注记全量重比并把差列了(MENTER / MULTIPASTE / LISTPASTE / SURROGATE / SHIFTENTER 恢复项消失、链 m BACKIN-fail/-fast/-neterr 自动落地,全在 A-25 好的一边),「列出」已做,「改注」是 kit 维护归阶段末。**模板转换臂**:Tester 阶段末回归若写了就跑,写不了就留 TD;与 M3「B / C 无单测」同一条 TD 合记。
- **第四节(CHAIN 标冒烟不当门;IME 两组注明 CDP 模拟输入法、真输入法候 Henry;宽注记重比;探针归档里岛上测试账号登录名换占位符;remount 分析器窗口 bug 改了重出;查库读数、预言核对全量、18:54 同源原件、26 探针 + harness sha 归档;TD-74 措辞改回「按已知收、不重跑」;再扫 ⛔ 0)——全收。**

等 Tester 补完 7 出判语。判语放行 → 收割 → 第 25 轮。
