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
