# A-25 验收（Tester(1)，2026-11-09）

> 对象：包 ops `packages/a25-ime-save-failure/`（重封后的 v2），主 JS `index-4nEsyJNA.js`（sha256 `f32a046c…72c5ab`），基线 `dfbcce8e`（岛上 A-20b r2，第 24 轮），src 19 个文件（改 18、新增 `layers/BlockSaveFailedMark.tsx`），dist 63 个文件，`files.list` 里没有 server/ 或 shared/ 路径。
> 环境：本地后端（服务器用旧树，A-25 不改服务器），前端直接服务包里的 `dist/client`（5614 → 3614，全新库）。底 = A-20b r2 封包，即线上版本（5612 → 3612）。真 Chrome 走 CDP。没碰岛，没碰 Henry 的账号，没用真实模型，应用里的 Agent 0 条。
> **只测了 Chrome。输入法是 CDP 模拟的**：每个拼音字母一次 `Input.imeSetComposition`，再一次 `Input.insertText` 提交整词，不是真输入法。真输入法候 Henry 上岛亲验，那才是 ① 的终验（订单 :46、:86）。
> 判语标准：列出每一条比线上（A-20b r2）差的臂；已裁项标「已裁」。订单要的四样：k25 正本全组；D 出口（含 O3、D1、D2）；A-20/A-20b 回归全套（链 190 + a20m + a20n + 9 对 + 第 10 对）；手工已知第 5 项的新行为（ONEFAIL）。

## 〇、判语

**放行。** 比线上差的只有一条，Main_Designer 已裁 🅱，不挡：真离线（所有请求都断，GET 也断）时，「Block save result could not be reconciled」随每次自动重试弹一次。新出的红行 D:lines30-1 已裁为既有（TD-77 家族），不算。订单 (iv) 的两条 A-25 轮验收臂本轮**未覆盖**，Main_Designer 裁记 TD、不挡（见「未覆盖」）。

- 同源：src 19/19，自建 63/63 与包一致，主 JS 逐字节相同。
- k25 正本全组，A-25 上的门全绿：
  - IME-new 24/24、IME-mid 24/24（模拟输入法）；
  - SAVEFAIL 8/8；ONEFAIL 4/4；LANDFAIL 8/8；LANDFAIL-other 3/3；
  - H1 2/2；H2 的判据（builder 的冻结版红单测）我独立核过：冻结版红、包上绿（第二节）。
  - 底上同一套是红的（阳性对照）：IME-new 0/24、SAVEFAIL 0/8、ONEFAIL 0/4、LANDFAIL 0/8、LANDFAIL-other 0/3、H1 0/2。
  - CHAIN 与 H2 的浏览器臂只作冒烟（已裁，见下），两侧都绿；IME-mid 两侧都绿。
- D 出口：A-25 16/16 绿。底上保持现状的三个出口 6/6 绿，要改的五个出口 10/10 红。D2（链接跟字移）浏览器在底上分不出，阳性对照靠 builder 的冻结版单测（第三节）。
- r3 链 190 行：对 A-20b r2 判语链逐臂归一化 diff（用宽注记，不截断），11 个标签 0 行差。其余 5 个标签的差全在 A-25 裁定的方向或 A-25 好的一边。另有 12 行准备失败，都已补齐：
  - 11 行是 a20m 的准备闸只认失败 toast，A-25 按 (e) 不弹，于是没跑起来。补成「toast 或 A-25 失败标记」后两侧都跑：A-25 11/11 绿；底的读数与原判语链逐字相同。
  - 1 行是准备步骤的光标跳（TD-77 家族），补跑 2/2 绿。
- a20m LANDOTHER：heading 2/2、headline 2/2、plain 1/1，另有 1 行准备失败（光标跳），补跑 2/2 绿。
- a20n：74 行 + 第三形 3 行。红行与 A-20b r2 同（BACKIN-heldhead-undo，已裁 🅱）。宽注记逐臂比，差异全在 A-25 好的一边。HEADCLOSE-putback 走冲突项而不是 :188 原写的合并形，已裁（下「已裁」6）。
- 9 对回归：A-25 的红行都在同对底侧红行之内，只有 mx 的 D:lines30-1 例外（已裁既有）。第 1 对里底的 20 行红（W 输入法 16、G imeLines 3、L insert-1 1），A-25 上全清。
- 第 10 对：签名形状两侧 0/20。A-25 另有 2/20 末步 `['wa']`，归 TD-63（下「已裁」5）。
- builder 全量 exit 1：已知 teardown 竞态 TD-74（第一节末），不是本包引入的。

### 比线上差的臂

1. **真离线下的对账提示（k-toast 的 OFFALL，已裁 🅱，记 TD，不挡上岛）**
   - A-25 上「Failed to save block」0 条，合 (e)。但每次失败都弹一条「Block save result could not be reconciled」：首次失败 1 条，加上两次自动重试（约 +2 s、+4 s 退避）各 1 条，9 s 内共 3 条，两行一样。
   - 底：一次失败弹「Failed to save block」与「could not be reconciled」各 1 条，之后不再弹。
   - 这一臂上看不出数据面的好坏。两侧都是在联网后、探针打 ` back online` 引发的那次保存落地：A-25 在 15.13–15.15 s，底在 15.16–15.19 s；底也没有按 Retry。A-25 自动重试、联网自己补齐的好处，见 SAVEFAIL (c) 与 ONEFAIL (ii)。
   - 只断 text-save、GET 通的 OFFLINE-N 上：A-25 0 条，底 1 条。
   - 所以 (e)「一次失败 = 0 toast + 1 指示」的成立范围要据实收窄为「text-save 失败、GET 通」。「could not be reconciled」是静默失败没盖到的第二个 toast 来源。
   - Main_Designer 裁：记 TD，开单时读来源行号；手册加一句已知；列为给 Henry 的判断点。
   - 离线时间更长会弹多少，没量，只能按退避推算。

### 已裁（不算）

1. **D:lines30-1（第 1 对 mx 的新红）→ 既有，TD-77 家族**（Main_Designer 裁，详见第九节）。
   - 依据：builder 读码判 A-25 在这一跳惰性；Reviewer L1 独立读码同；Reviewer L2 逐键复原出与现场逐字相同的形状——交接时编辑器拿到的光标在 tu-1 的 0 位，此后每个回车都在 0 处切，把 aa 推到末行。
   - 旁证：11-05 / 11-06 在旧构建上，同一 D 臂出过同一签名 `["bb","cc","dd","eeaa"]` 四次（第九节）。
   - 我这边的加测：带钩子的 D 臂 276 行，没复现。
   - Henry 拍：TD-77 挪阶段二。
2. **BACKIN-heldhead-undo 红**：REPS=2 两行加第三形一行，A-25 与 A-20b r2 同形（扣留期间 Ctrl+Z 无效，屏上与服务器最后都是 `['warmup bbb','aaa']`），已裁 🅱。
3. **准备步骤的光标跳**：K1-paste500-1 准备得 `["rmup","notewa"]`，LANDOTHER-plain-0 准备得 `["wmup","a",…]`。都是 TD-77 家族，与 A-20b 那轮 LIST-addr-0 同类。补跑都绿，两行记进 TD-77 频次。
4. **CHAIN 与 H2 的浏览器臂只作冒烟**（订单 :27、:161、:43、:88）：
   - 守恒闸是 builder 的 jsdom K2 臂，那一臂是已知红（TD-65），不计入放行。CHAIN-seed 两侧 `ktwo` 都是 0，这是按设计被撤销的。
   - H2 的判据是 builder 的冻结版红单测，我已独立核过（第二节）。

5. **第 10 对 A-25 的 2/20 末步 `['wa']` → 归 TD-63，🅱，只记数，不挡**（Main_Designer 裁）：
   - 线上 A-20b r2 在本轮与上一轮共 0/40、r3e 0/20 都没出过；修前 `04f6f822` 在同一台机器上两轮各出过 2/20。不是签名形，2/20 对 0/60 按率分不出（p≈0.06）。
   - 裁定的理由：第三次 Ctrl+Z 撤的是 warmup 那段打字，撤多少随撤销块边界，边界又随保存时序；A-25 的每块空闲门与重试改了保存时序，边界挪一格，与 TD-63「终态随环境不同」同向；修前同机也出过，说明是随构建飘，不是 A-25 的新形。
   - 我先前叫它「已知形」，是我自己的说法，不是裁定，已改。
   - 以后 UNDOPAUSE 的闸按不变量写：三次 Ctrl+Z 后，warmup 块的文本必须是 `warmup` 的前缀（含空、含块不存在），不是前缀才算 🅰。「等于同环境的基线」跨构建太严，又抓不住真坏形。kit 改法归我，阶段末做。
6. **HEADCLOSE-putback：订单 (iv) :188 的预期改成今天的冲突项**（Main_Designer 裁；依据问 1 (c)、问 2 (b)、`emptyMatches` false）：
   - :188 是 D 第一稿时的预期；:193–195 的裁定定下以后，主设计没有回头改它，这个矛盾是 Tester 实跑出来才看见的（Main_Designer 的判断点）。
   - 实测比线上好：线上 aaa 静默丢；A-25 上 aaa 在冲突项里，能 View differences；Replay 会整块盖掉 bbb，是已知的 TD-69；Apply 后那 1 条 toast 是 O2（🅱）。
   - 随收割记一条 TD（🅱，阶段二，附在 TD-69 下）：打开时为空的行永远锚不上，而这正是 putback 最常见的形。修向是一条紧规则：服务器上该单元的文本 === 打开时该单元的文本，就直接采回执的文本；不放宽空行匹配。

### 未覆盖（Main_Designer 裁：写明未覆盖，记 TD，不挡，不为它推迟判语）

- 订单 (iv) 的两条 A-25 轮验收臂本轮没跑：
  1. **「模板转换后别次条目仍在」（决定 C）**。决定 C 的实现 Reviewer 终读已按码核过（findings-final :46、:92「A:2633 成立，无测试」），缺的是测，不是读。两个失败方向都不比线上差：忘多了等于线上今天的样子；忘少了走冲突项，是决定 C 自己记的 TD。没有丢字的方向。这条臂与 Reviewer M3 记的「B / C 无单测」合记一条 TD，阶段末回归写得出就跑。
  2. **「链里按『1 条』写的行，列出并改注」**。第四节宽注记的全量重比已把差列全，「列出」算做了；「改注」归阶段末 kit。

## 一、同源

- 包内 `src.sha256` 19/19、`dist.sha256` 63/63 自洽（两份清单自身的 sha 分别为 `08d0cb0d…`、`a4b0e9a6…`）。
- 重建：`dfbcce8e` 存档加包里 19 个 src 文件，在锁位里跑 vite build。产物与包 dist 63/63 逐文件同哈希，主 JS 逐字节相同（`hashes/tester-rebuild-dist-a25-v2.sha256`）。
  - 放行 18:55 重起的那一次在 18:54（`hashes/same-source-a25-v2-1854-gate.out.txt`）。
  - 21:53 对同一包又重跑一次留档（`hashes/same-source-a25-v2-2153-rerun.out.txt`），两份只有锁位那两行不同。
- 19 个文件对基线：新增 1 个（`BlockSaveFailedMark.tsx`），改动 18 个，与基线相同 0 个。
- a20m 预言核对：
  - 直接对包核，得「VOID」（`hashes/oracle-a25-v2-package-only.out.txt`）。包里只放改过的文件，核对器要读的 `useNoteRouteSaveBoundary.tsx` 没改、不在包里。这是核对器的局限。
  - 改对重建的整棵树核：LEFT_UNSAVED 与 SAVE_FAILURE 两条文案都 MATCH，主 JS 里都在，`oracle ok`（`hashes/oracle-a25-v2.out.txt`，四行全量）。
  - 核对器在阶段末改成「包里没有就回落到基线文件」。
- builder 的全量（交付回执 `RECEIPT.md`「验证」节）：client 259 个文件、2853/2853 过；**exit 1**，来自已知 teardown 竞态 TD-74。`structureTypingBuffer.ts:316` 在测试环境拆除后由计时器触发 3 条 `document is not defined`，这次触发在 A-25 没改的 `structureTypingConservation.test.tsx`。
  - Main_Designer 裁：按 TD-74 已知收，不重跑（订单 :290）。
  - TD-74 本身未清，去处是下次改动 `structureTypingBuffer.ts` 的单顺手修。

## 二、k25 正本全组（A-25 对底，同一套探针）

探针是 ops 私有的 `tester-kit/a25/`，按订单不进仓库：`a25_probe.mjs` sha `5fba09fd…`，分析器 `analyze-a25.mjs` sha `3d034c97…`（各文件 sha 见 `hashes/probe-files.sha256`）。参数 REPS=2、REPS_IME=24、REPS_OTHER=1，单浏览器，在锁位里跑。A-25 跑于 18:55–19:24，底跑于 21:48–22:25。

| 组 | A-25 | 底（A-20b r2） | 门 |
|---|---|---|---|
| IME-new（新笔记第一行模拟输入法打 `diyi`→第一、`ceshi`→测试） | 24/24 | 0/24（24/24 是 `d第一测试`） | ①（真输入法候 Henry） |
| IME-mid（持久编辑器中间） | 24/24 | 24/24 | ① 对照 |
| SAVEFAIL（500 / 断网 × 直接 / 失焦） | 8/8 | 0/8 | ②a |
| ONEFAIL（手工第 5 项：只有一块的保存失败） | 4/4 | 0/4 | ②a |
| LANDFAIL（自动 / Apply × 500 / 断网） | 8/8 | 0/8 | ②b |
| LANDFAIL-other（plain / heading / headline） | 3/3 | 0/3 | ②b |
| H1（落地任务里注入抛错） | 2/2（抛错都触发） | 0/2（抛错都触发，beta 没落地） | ③ |
| H2 判据：builder 的冻结版红单测（Tester 独立核） | 包上绿 | 冻结版红 | ③ |
| H2 浏览器臂 | 2/2 | 2/2 | 冒烟（不当门） |
| CHAIN（重试链五形） | 10/10 | 10/10 | 冒烟（已裁不当门：守恒闸 = jsdom K2，TD-65 已知红） |

- **IME-new 时间线**（页面时钟，24 行全量，分析器按「焦点进编辑器」认交接）：
  - A-25：POST /blocks 在第一个词「第一」的组字结束后 2–5 ms 发出（组字结束 579–648 ms，POST 582–652 ms）。交接在 611–800 ms，早于第二次组字开始（838–917 ms），所以都在组字之外。24/24 分类为「交接在组字外」。
  - 底：POST 在 6–11 ms 发出，那时第一个组字窗口（`d`）还没结束；交接在 34–86 ms，把这个窗口切断，`d` 留进笔记。24/24 分类为「交接切断组字 1、POST 在组字 1 中」。
- **SAVEFAIL**：A-25 每行都有常驻的 Retry / Copy、失败 toast 0、网络恢复后自己补上。补上的时间从网络恢复算起，每秒查一次服务器，所以是上界：直接打字 3.03–3.04 s，失焦 2.02–2.03 s。底每行 5 条失败 toast，没有常驻控件，不自己补。
- **ONEFAIL（手工第 5 项的新行为）**：
  - A-25 四条都过：(i) 另一块 B 的闲置保存 2.05–2.06 s 内自己落地，不用回车、不用点开；(ii) A 自己重试，期间打的字一起带上，7.07–7.09 s 落地；(iii) 各在各块、各一次，服务器 `[["alpha start one two"],["beta start bee"]]`；(iv) 失败 toast 0。
  - 底：每行 5 条 toast，B 的闲置保存停住，A 不重试，服务器只有 `[["alpha start"],["beta start"]]`。
- **LANDFAIL**：
  - A-25：自己那块亮标记，常驻 Retry / Copy，失败 toast 0，另一块照常收键；被拒的键不进任何账本（服务器 0 次，框里和存储里都没有）。
  - 从网络恢复算起（每秒查一次，是上界），自动那组 13.15–13.18 s 落地；Apply 那组中途点了 Retry，4037–4044 ms 落地。服务器都是 `["warmup","[heading_1]head","body","other start plus o"]`。
  - 底：没有标记，每行 14 条失败 toast，不落地。
- **LANDFAIL-other**：A-25 三形都过：键上屏；网络恢复后不动手，留住的字与打的字自己补上；各一次；0 toast。补上约 15.2 s。底只有 (a) 键上屏一项过，每行 2 条 toast，不补。
- **H2 冻结版红单测，Tester 独立核**（23:02，锁位里跑 vitest，单例；输出 `gate/h2-frozen.txt`）：
  - 用例：包里 `useHeadingStructureController.test.tsx` 的「H2: the note changes between queueing a kept record and its landing; back on the note, it lands」。
  - 包树：1 passed。
  - 冻结副本（把 `useHeadingStructureController.ts` 换回 `dfbcce8e` 版，测试文件用包里的）：1 failed，`expected 'Intro' to contain 'gamma'`，即留住的记录始终没落地。
  - 底的 hook 用同样的 `noteId` 与 `placeRetryMs` 输入，所以红的原因就是要修的那一跳，不是参数不认。
- **底的红是修前的阳性对照**。其中 IME-new、LANDFAIL、LANDFAIL-other、ONEFAIL 在封包前也对底验过，同为红：
  - 17:27–17:36 那次用的是加 ONEFAIL 之前的 kit 早一版：IME-new 4 行，LANDFAIL 四变体与 LANDFAIL-other 三形各 1 行；
  - 17:47–17:49 那次跑了 ONEFAIL 2 行。
  - SAVEFAIL 与 H1 在封包前没有对 A-20b r2 跑过，本轮底侧是第一次。

## 三、D 出口（409 后的 Apply，A-25 对底）

探针 `a25d_probe.mjs`，REPS_D=2（sha 见 `hashes/probe-files.sha256`）。第二个写入者是 node 直接调 text-save 接口，按当前修订号写。

| 臂 | 预期（裁定） | A-25 | 底 |
|---|---|---|---|
| D-anchor（都能锚定） | ① 一次写 | 2/2 | 红 2/2（只给冲突项） |
| D-unanch（有锚不上的） | ② 今天的 409 冲突项 | 2/2 | 2/2 |
| D-struct（结构变了） | ② 冲突项 | 2/2 | 2/2 |
| D-same（已经相同） | ③ 忘掉收据、不写 | 2/2 | 红 2/2（收据还在、给冲突项） |
| D-twice（合并后再 409，O3） | ④ 停、冲突项、正文 = 合并后的 | 2/2（`receiptText` 与 `secondHeld` 都对） | 红 2/2 |
| D-delonly（只删字，D1） | 冲突项 | 2/2 | 2/2 |
| D-link-before（链接前插字，D2） | 一次写、链接跟字移 | 2/2 | 红 2/2 |
| D-link-after（链接后插字，D2） | 一次写、链接不动 | 2/2 | 红 2/2 |

- **D2 的阳性对照要如实说**：底根本不合并，两条链接臂在底上是因为「没合并、给冲突项」而红，不是因为链接位置错。底上链接字段还停在原处，所以 `link` 一项两侧都是 true。也就是说，浏览器臂在底上分不出「链接有没有跟字移」。
- 这一条的阳性对照靠 builder 的冻结版单测：D123 改动之前 5 例 3 红 2 绿（builder 审计目录 `evidence/control-d123.txt`，该文件只有计数）；按 builder 回执 `RECEIPT.md` 第 48 行，其中「链接前插字」红、「链接后插字」绿。我没有独立重跑这条。A-25 上浏览器两条都绿，只说明合并后链接位置对。

## 四、r3 链 190（对 A-20b r2 判语链逐臂归一化 diff）

- 16 个标签、190 行，A-25 上 190 行都跑了（19:28–20:51，一个浏览器）。同时在跑的有：9 对回归（到 20:10，两个浏览器）、第 10 对（20:10–20:24），以及 20:26 起第九节的加测。
- 比法：两侧注记用同一分析器出宽版（不截断，`gate/wide/`），按 id 与数字归一化后逐行 diff（汇总 `gate/wide/summary.txt`）。
  - 我起初用的是截到 220 字的注记（`gate/diff-chain-a25.txt`），截断以后的差看不见。复核者指出后全量改用宽注记重比。
  - 截断版报 0 差的 11 个标签，宽比仍是 0。截断版漏掉的差都在下面列出，全在 A-25 好的一边。
- 11 个标签 0 行差：late、j、flyk、inapp、b、a、c、c-closetab、c-kill、kill-close-0、kill-proc-0。
- 5 个标签有差，逐条：
  - **k-toast**：OFFLINE-N 失败 toast 1 → 0；OFFALL 见〇节「比线上差的臂」第 1 条。
  - **d**：GONEFAIL-hash / -paste 的 alerts 由「Failed to save block」+「Text changes could not be saved…」变成无；CLOSEFLY-req / -resp 重开时的过期横幅不再出（原记「已知，A-25 ②a」）。都合 A-25 的裁定。
  - **offkill-0**：参照行，原记「A-25 ②a 前会丢」，A-25 上字保住了（kept true）。
  - **m**：
    - BACKIN-fail（扣 1.5 s 那形）、-fast、-neterr：两侧都是第二次离开被拒。重开时，底的服务器是 `["warmup",""]`，带 Apply 横幅；A-25 是 `["warmup","backin words"]`，没有横幅——服务器放行后 A-25 自动重试落地了。
    - `close` 臂：原横幅「A block edit is waiting for recovery … Apply Dismiss」，现在框是「Not in the note yet / Discard」，服务器同为 `["warmup","k0"]`。这是 ②a (ii) 那条多余回执不再出。
    - LIST-addr-0：在 A-20b 上被准备步骤的光标跳污染成红（那轮已记），这次绿。
    - 另有 11 行准备失败，见下。
  - **k**：K1-paste500-1 准备失败，见下。
- **准备失败 12 行**：分析器的「total red」不计准备失败，diff 上显示「红 0」，但这 12 行其实没测。
  - m 的 11 行（BACKIN-fail-sealed ×2、-refail ×2、-idlefirst ×5、BACKIN-ctlfail ×2）：准备步骤要等失败 toast（「Text changes could not be saved」或「Failed to save block」）出现才往下走。A-25 按 (e) 不弹，8 s 超时。补法见第五节。
  - k 的 1 行：准备时往新笔记打 `warmup`，光标跳，得 `["rmup","notewa"]`，TD-77 家族。补跑 K1-paste500 2/2 绿，服务器 `["warmup","note alpha"]`。
  - 这个盲点 Main_Designer 裁定：阶段末改 kit，准备失败单独计数并写进判语；diff 一并改成宽注记。

## 五、a20m LANDOTHER 与补闸的 4 臂

- **LANDOTHER**（REPS=2，20:51–20:56）：
  - heading 2/2、headline 2/2：键上屏、「Heading changes could not…」toast 0、失败 toast 0、之后落地。
  - plain：-1 绿；-0 准备失败（准备得 `["wmup","a","plainb","hb","hbody"]`，光标跳）。补跑 plain 2/2 绿。
- **补闸的 4 臂 11 行**（约 21:41–21:49，两侧同时跑，两个浏览器；之后 21:49–21:52 单浏览器补跑 K1-paste500 与 LANDOTHER-plain）：
  - 用 `a20m_probe_gate.mjs`，由 `mk-a20m-gate.mjs` 从 `a20m_probe.mjs` 生成。与原版 diff 只有 4 行：3 行代码，外加生成器加的 1 行文件头注释。改动是准备闸改成「失败 toast 或 `[data-block-save-failed]` 标记，任一即开」，并在行里记 `setupGate` 是谁开的。臂本身的判据一字没动。
  - 底 11/11 绿，每行都是 toast 开闸；读数与 A-20b r2 判语链 `belt-m` 归一化后逐字相同，所以改闸没改底的行为。
  - A-25 11/11 绿，每行都是标记开闸：
    - sealed、refail、idlefirst：都留在 A、第二次离开被拒、LEFT_UNSAVED 0、kept 0，这几项与底同形。
      - 差在 A-25 好的一边：服务器放行后 A-25 自动重试落地（sealed、idlefirst 服务器 `["warmup","backin words"]`，refail `["warmup aaa","bbb"]`），重开没有恢复项。
      - 底不自动重试，服务器停在 `["warmup",""]`，字留在恢复回执里；重开出「A block edit is waiting for recovery … Apply Dismiss」，要人点 Apply 才落地。
    - ctlfail：判类 REFUSED，合预期。
      - 准备阶段两侧都是失焦那两发 500（约 1.35 s），这是已知的串行两发。
      - 与底不同处在 A-25 好的一边：离开被拒期间，A-25 按退避自动重试 1 次（被探针扣住），放行后得 200，`ctl words` 落地正好 1 次；底这期间 0 发，没落地。
    - 第二次离开被拒时两侧都弹「Changes could not be saved. Please retry before leaving the note.」。这是拒绝离开的提示，不属 (e) 管的失败 toast。

## 六、a20n（REPS=2，TRACE=1，全臂）+ 第三形

- 20:56–21:48，A-25 上 74 行、39 个臂，0 行准备失败；第三形（heldback、heldhead、heldhead-undo 各 1 行）3 行。
- 对照：A-20b r2 那轮的 `belt-n` / `belt-n-third`，同一分析器出宽注记，再逐臂归一化 diff。
- 红行两侧相同：主轮 2 行、第三形 1 行，都是 BACKIN-heldhead-undo（已裁 🅱）。第三形逐字相同。
- 主轮的差全在 A-25 好的一边：
  - **ADDR-noncanon-slash / -anchor**：重开后服务器有 `backin words`（服务器放行后自动重试落地），底是 `["warmup",""]`。离开时 toast 由 5 条（「Failed to save block」×2、「Text changes could not be saved…」×2、离开被拒提示）变成只剩离开被拒提示 1 条。
  - **恢复项不再出（②a (ii)）**：
    - MENTER-close：A-20b 那轮已裁的第 3 条，原来是带 Apply 的「A block edit is waiting for recovery abx cd」项，现在是「Not in the note yet / Discard」，Apply false。服务器与框的内容两侧相同。
    - MULTIPASTE-close、LISTPASTE-close、SURROGATE-paste-close、SHIFTENTER-close、SHIFTENTER-typed-close：重开时的「A previous block edit is queued for recovery」项不再出。落地形状、服务器、框都与底相同。
  - **HEADCLOSE-putback**：
    - A-20b r2 上：bbb 放回、保存得 200 后，aaa 的恢复项被挤掉，Apply 点不到，aaa 丢（已裁 A-25 ②a (iv)，臂规则红）。
    - A-25 上：aaa 的恢复项留着、带 Apply。点 Apply 得 409，没有合并写，成了冲突项（View differences / Replay draft on current version / Discard this draft），服务器 `["warmup bbb",""]`，臂规则绿。冲突项按令没点 Replay。
    - **与订单 (iv) :188 的预期不同**：那里写的是 Apply 后合并成 `['warmup bbb','aaa']`。
      - 复核者读码：第 1 行回执与打开时相同，按设计跳过；aaa 打在打开时为空的第 2 行，`emptyMatches` 为 false 时空行不算锚点，合并返回 null。按问 1 裁 (c)，这一形走今天的冲突项（订单 :193）。
      - 点 Apply 后弹 1 条「Failed to save block」，是 O2（已裁 🅱，订单 :208）。
      - aaa 现在只在冲突项里；Replay 会整块替换、盖掉 bbb（TD-69，已裁）。
      - 比线上（aaa 丢）好，但没到合并出口；合并出口由 D-anchor 臂覆盖。Main_Designer 已裁把 :188 的预期改成冲突项（〇节「已裁」6）。
  - **WINDOWENTER-land**：两侧都是 2/2。截断版注记里 A-25 少 1 行，是分析器把两行逐字相同的注记合并了（A-25 两行都是「box gone after 0 ms」，底是 0 ms 与 1 ms 两行），不是差异。

## 七、9 对回归（A-20b r2 对 A-25，同时跑，两个浏览器）

18:55–20:10。配对账号用自己的测试邮箱预先注册。每对按 `arm:name` 逐行核（`redsubset.mjs`，输出在 `pairs/redsubset-*.txt`）：

| 对 | 底红（行） | A-25 红（行） | A-25 新红 | 底独有 |
|---|---|---|---|---|
| mx | 20（W ime ×16、G imeLines ×3、L insert-1） | 1 | **D:lines30-1**（已裁既有，第九节） | 底的 20 行全部 |
| acc1 | 0 | 0 | 无 | — |
| acc10 | 3（HL-saveNotSentThenClose ×3） | 3（同名） | 无 | — |
| y | 0 | 0 | 无 | — |
| two2 | 0 | 0 | 无 | — |
| acc18 | 0 | 0 | 无 | — |
| acc13 | 2（N-b2-headingAboveLineSameWord ×2） | 2（同名） | 无 | — |
| J | 0 | 0 | 无 | — |
| retry | 0 | 0 | 无 | — |

acc10、acc13 的红行数与 A-20b 那轮相同（那轮也是 3 与 2）。

## 八、第 10 对（UNDOPAUSE 底 ×20 对 A-25 ×20，交替，单浏览器）

- 20:10–20:24。签名形状（第 2 步不等于 `['warmup']`）两侧都是 0/20，没到停线 3，只记数。
- 底 20/20 是基准形状。A-25 18/20 是基准形状；2/20 末步是 `['wa']`，而不是 `['w']`。
  - 线上 A-20b r2 在本轮与上一轮共 0/40、r3e 0/20 都没出过；只在修前 `04f6f822` 的 r3e 轮、A-20b 轮各出过 2/20。
  - 不是签名形；2/20 对 0/60 分不出差别，按停线规则只记、不判差。Main_Designer 裁归 TD-63，🅱，只记数（〇节「已裁」5）。
- 每行 5 个 PUT，两侧相同。

## 九、D:lines30-1 与 TD-77 加测

**现场**：第 1 对 mx 的 D 臂。新笔记草稿里打 4 行：每行两个字母，每键间隔 40 ms，行后等 30 ms、回车、再等 30 ms，依次 aa / bb / cc / dd；然后打 ee。

- 期望 `[aa,bb,cc,dd,ee]`，DOM 与服务器一致，都是 `["","bb","cc","dd","eeaa"]`。
- 查库（只读，`td77/db-lines30.txt`，查询脚本 `scripts/db-lines30.cjs`）：
  - 只有一个 paragraph 块，5 个文本单元，tu-1 空、tu-5 是 `eeaa`。所以是同一块内落错了行，不是落到别的块；我先报 Main_Designer 的说法已据库更正。
  - 红块的 `text_save_revision` = 9，与同组两条绿行相同。
  - 建块比建笔记晚、最后更新比建块晚：红 +2.92 / +2.44 s；绿 lines30-0 +2.95 / +2.46 s，lines30-2 +2.90 / +2.44 s。
  - 三行都没有恢复事件。
- 同时跑的底侧这一行是绿的。
- **历史**（复核者从各轮 scratch 原件数出）：
  - A-20 起各轮 mx 的 D 臂（a20pre3e-mx、-mx2、a20r3e-mx2、a20preb-mx、a20belt-mx，加本轮底侧 a20bp-mx）共 6 次、72 行，0 红；a20pre-mx、a20post-mx 没有 D 臂。
  - 更早的 11-05 / 11-06 编辑器组与 A-18 核验里，D 臂在旧构建上红过：verify-editor island-pre-2 4/12、island-pre-a4 2/12；verify-a18 local-pre-extra 4/12、island-pre-2 3/12、island-post-2 2/12、local-post-extra 3/12。
  - 其中四次就是同一签名 `["bb","cc","dd","eeaa"]`，首行被推到末行。这是「既有」的旁证。旧形比这次少一个空的首单元（4 个单元，这次 5 个）；是不是同一跳，Main_Designer 记为 TD-77 开单时对。
  - 我先前报 Main_Designer「历来 11 次 mx 的 D 臂从未红过」，说错了，已更正。

**原红行当时有没有保存失败：查不到，两个方向都定不了。**

- matrix 只存各 textarea 的值，不存整页 DOM，也不录 console。
- 测试服务器不记请求。它只对未处理异常打日志后回 500，日志里没有这类行，所以可以排除未处理的 500；409、400 不记日志，排除不了。
- 客户端 axios 不设超时，所以没有「超时算失败」这条路。
- 加测的阳性对照（每行第一次 text-save 回 500）显示：A-25 两行与底 lines30-1 的请求序列都是 rev 0 → 500、rev 0 重试、rev 1…8 都是 200，按序列推最终修订号仍是 9（`td77/a25p-dtfail/rows.jsonl` 等）。所以「rev 与绿行相同」分不出有没有失败过。底 lines30-0 草稿里先收了回车，少一次保存，按序列终值是 8。
- Main_Designer 裁定这一点不挡门。builder 核过：在本臂条件下（没有撤销），A-25 的失败分叉既不挪焦点，也不改选区。唯一例外是失败的事务本身是撤销 / 重做的一侧，那时重试会像底的手动 Retry 一样恢复那一侧的选区（`CODE-ANSWER-lines30.md` 追加二），本臂够不着。

**加测**（都在槽 2；读数都只作描述，归属由读码定）：

| 跑 | 内容 | 底 | A-25 |
|---|---|---|---|
| mxD | 原样 D 臂 ×5 轮 | 0/60 | 0/60 |
| mxDT | 带钩子（v1），gap 30 ×60 | 0/60 | 0/60 |
| dtfail | 阳性对照：每行第一次 text-save 回 500 | 2/2 绿，console 2/2 | 2/2 绿，标记出现、console 2/2 |
| dtd150–1500 | POST /blocks 按住 150 / 400 / 800 / 1500 ms，各 5 行 | 0/20 | 0/20 |
| dtd40–120 | POST /blocks 按住 40 / 60 / 80 / 100 / 120 ms，各 10 行 | 0/50 | 0/50 |
| mxT77 | 长会话：整套 mx 226 行，D 臂带 v3 钩子；槽 1 负载在场 | D 0/12（其余红 = 底已知的输入法组 20 行） | — |

- 累计：
  - 只计不加延迟、不注入失败的 D 臂（第 1 对 + mxD + mxDT）：lines30 型 A-25 1/78、底 0/78；D 臂各 gap 合计 A-25 1/132、底 0/132。
  - 连 dtfail、dtd 与长会话在内：lines30 型 A-25 1/150、底 0/153；D 臂 A-25 1/204、底 0/216。
- 带钩子的共 276 行：mxDT、dtfail、dtd 共 264 行（两侧各 132），加长会话 D 臂 12 行。四个读点（`td77/ana-remount.txt`）：
  - 交接前草稿框换元素 0 次、消失 0 次；
  - 每行草稿框只失焦一次，就是交接那次，之后 0–13 ms 内焦点进编辑器：264 行里 0 ms 41 行、1 ms 196 行、2–13 ms 27 行；长会话那 12 行是 0–1 ms；焦点停在 body 0 次；
  - 交接前最后一帧草稿光标都在末尾；
  - 交接后编辑器光标都在末尾，交接后第一键落在非空行的 0 位 0 次。
- Reviewer L2 的前提「交接时草稿里正好是 aa」出现过 77 次（264 行里 76 行：A-25 40、底 36；长会话 1 行），全绿。
- builder 提出的重挂码路（`contentReadOnly` 闪一次 → 新 textarea、选区 0、焦点落 body），一次也没出现；v3 钩子录到的 readOnly 一直是 rw。
- 可疑条件，没量：长会话里底的 localStorage 只有登录令牌；原红行所在的 A-25 配置目录里，还留着 draft-recovery、unplaced-words 等键。
- Henry 拍：TD-77 挪阶段二。这些加测已由 Main_Designer 归档进 TD-77 行，证据在 `td77/`。

## 十、过程里的事（照实记）

1. **第一次封包作废、重起（Main_Designer 甲）**：
   - 18:46 起跑 v1（主 JS `index-BngbSlvd.js`）。18:50 Main_Designer 叫停：Reviewer M1 指出指示文案「trying again」对被拒的 4xx 块不实，改一行后重封。
   - 我停了全部：k25 已跑的 25 行，以及第 1 对 mx 跑了一部分。这些输出都移到 `runs/void-v1/`，不计入。v1 的 dist 另存冻结。
   - 因为 5614 直接服务包目录，重封会在一对跑到一半时换版本，所以配对也一并停了。
   - 停的时候发现 msys 的 kill 停不掉原生 node.exe，`stopq.sh` 加了按 WINPID 用 taskkill 的分支，已测。
   - 18:54 v2 重封，同源重做通过，18:55 两条线重起。
2. **预言核对 VOID**：见第一节。是核对器的局限，阶段末改。
3. **准备失败不计红、注记截断两个盲点**（第四节）：链的 diff 上「红 0」，其实有 12 行没测，是我逐行读 diff 时发现的；220 字截断是报告复核指出的。补法与结果见第四、五节，阶段末改 kit。
4. **我这边说错的，已更正**：
   - 向 Main_Designer 报 lines30 累计时写成「1/135」，几分钟后更正为 lines30 型 1/78、D 臂合计 1/132（口径见第九节）。
   - 中途报 IME-new「POST 在组字结束后 2–4 ms」，按 24 行全量是 2–5 ms。本文用全量数。
   - 「历来 11 次 mx 的 D 臂从未红过」、ctlfail「自动重试了 2 次」、sealed / refail / idlefirst「与底同形」、LANDOTHER-plain-1（应为 -0）、OFFALL「底要人按 Retry」：都已更正。其中有几句已被 Main_Designer 记进订单（:309、:359、:371），已报他改。
5. **工具上拦下的问题**：
   - v3 钩子第一次生成时，我在生成器的模板串里写死的两个查询掉了一层反斜杠，`/\/api\//` 成了注释。上槽前的解析检查（`chk-dtrace3.cjs`）拦下了，没跑过。v2 的注入是插值进去的，不受影响（阳性对照里路径匹配是对的）。
   - `ana-remount.mjs` 起初只在交接聚焦之前的窗口里找下一次聚焦，交接那次失焦只要隔 ≥1 ms 就被算成「焦点落 body」。
     - 我当时用另一段即时脚本量了失焦到聚焦的间隔，报给 Main_Designer 的是那个读数；但归档的分析器和它的输出还是改前的。
     - 复核者指出后，分析器已改成在整条时间线上找下一次聚焦，输出重出（`td77/ana-remount.txt`）。
6. 归档时，路径占位的第二遍清理（Windows 反斜杠路径、岛账号名）用的是一个私有小脚本。它要列出本地路径片段，所以不进仓库。
7. 配对与 k25 的账号都用自己预先注册的测试邮箱（cred-3612r / 3614r / 3612k / 3614k）。
8. 重活锁：所有探针、补跑、同源构建、H2 单测、复核工作流都在锁位里跑。最多同时占两个锁位，单个重活自限 40%。

## 十一、环境与留档

- 环境：
  - A-25：5614 → 3614（全新库 `data-a25`，服务器旧树）。链、a20m、a20n 用 `cred-3614`；配对用 `cred-3614r`；k25 与 D 用 `cred-3614k`。
  - 底 A-20b r2：5612 → 3612（`data-a20b`）。链对照用 `cred-3612`；配对用 `cred-3612r`；k25 与 D 用 `cred-3612k`。
  - 凭据只在私有 ops 里。归档的探针里，island 分支的岛账号名已换成占位符（本轮没走 island 分支）。
- 留档（本目录，本地路径已换成占位符，不含截图）：
  - `runs/`：
    - k25 与 D 两侧（`k25-a25`、`kd-a25`、`k25-base`、`kd-base2`）；
    - 链 16 个标签（`a25-*`）；
    - LANDOTHER 与补跑、a20n 与第三形；
    - 补闸两侧（`gate-bp`、`gate-a25`）、K1-paste500 补跑；
    - `void-v1/`：作废的 v1 输出。
  - `pairs/`：9 对两侧的行与日志、`redsubset-*.txt`、`run-reg-a25-par.log.txt`；第 10 对 40 行（`up-bp-*`、`up-a25-*`）与 `run-undopause-pair-a25-par.log.txt`。
  - `gate/`：
    - `wide/`：链 16 个标签、a20n、LANDOTHER 两侧的宽注记，与 `summary.txt`；
    - `diff-chain-a25.txt`（截断版的旧比对，留作对照）、链各标签注记（`a25-*.txt`）、`ref-belt-n*.txt`、补闸注记（`fill-gate-*.txt`）；
    - 分析器输出（`an-*.txt`）、`h2-frozen.txt`；
    - 运行日志（`*.log.txt`；仓库的 .gitignore 丢掉 `*.log`，所以改了结尾）。
  - `td77/`：mxD、mxDT、dtfail、dtd40–1500、mxT77 的行，`ana-*.txt`，以及 `db-lines30.txt`。
  - `hashes/`：
    - 自建清单；
    - 同源的两份输出（18:54 放行那次、21:53 重跑）；
    - 预言核对的两份输出（全树 `oracle ok` 四行全量、只对包的 VOID）；
    - `probe-files.sha256`：本轮跑过的 26 个探针文件、它们引用的 CDP harness、ops 里 A-25 kit 的六个文件。
  - `scripts/`：本轮的运行脚本、补闸生成器与生成出的探针、带钩子 D 臂的生成器与分析器、`db-lines30.cjs`、`stopq.sh`、本归档脚本。A-25 kit 本体不进仓库。
- 报告复核：交出前由 Opus 读者分四路复核（数字、判语逻辑与覆盖、机理与历史说法、公开仓库卫生），每路的发现再由第二个 Opus 读者独立核对（锁位里跑，22:36–22:56）。
  - 共 31 条，31 条确认。四路之间有重复：LANDOTHER 的行号、封包前验证、CHAIN 当门、putback 各被两路报到。都已改进本文，判语方向没变。
  - 改了的：
    - 错数或错行：LANDOTHER-plain-0、补闸时窗、diff 行数、累计口径、修订号 9 的范围；
    - 说法错：D 臂历史、ctlfail 的重试次数、补闸三臂「与底同形」、OFFALL 的数据面、CHAIN 当门、TD-74 措辞、封包前验证的范围、builder 例外的范围、LANDFAIL-other 的「交接」、D2 证据出处；
    - 覆盖：H2 判据（已补核）、模拟输入法未写明、(iv) 两条臂（已裁「未覆盖」）；
    - 方法盲点：220 字截断、remount 分析器的窗口；
    - 卫生：岛账号名；
    - 留档出处：同源重跑、预言输出截断、查库未归档、探针 sha 不全。
  - 由此报给 Main_Designer 的三问（第 10 对 `['wa']`、putback 对 :188、(iv) 两条臂），他已裁定，见〇节「已裁」5、6 与「未覆盖」。他也已在订单原句旁加了【更正】（:309、:359、:364、:371）。

## 十二、第 25 轮部署后核对（2026-11-09）

**岛上版本就是验收过的包，代表臂 7/7 绿。**

- 部署（Main_Designer 报）：
  - 岛上 app = `b734197e`（deploy 分支），只做了前端构建，服务没有重启（health 200，进程时间戳 14:24:42Z）；
  - 锁文件差 0，server / shared 没有改动，没有 npm ci；
  - 部署前库已备份；
  - 他那边对岛上 dist 与包的 `dist.sha256` 按路径归一，63 同、0 差、0 缺。
- 哈希（我经隧道取岛上实际服务的文件重算）：
  - 主 JS `index-4nEsyJNA.js`，css `index-sq1LDYsi.css`；与 A-25 包 `dist/client` 的 63 个文件逐一比，**63 同、0 差、0 缺**（`postdeploy-25/island-hash-post25.txt`，对照清单 `a20-island-expected-a25.sha256`）。两次运行都核了。
  - 部署前我对同一份清单空跑过一次作阳性对照：当时岛上还是 A-20b r2，得 61 同、2 不同（`index.html` 与新主 JS；岛上对不存在的路径回 index 页），守卫也正确停下了。
- 代表臂（Main_Designer 给的单子，各 ×1；一个浏览器，只用我的岛上测试账号，走隧道；失败、扣住都在测试浏览器里用 CDP Fetch 做，岛上只看到普通请求）：

| 臂 | 结果 | 读数 |
|---|---|---|
| IME-new | 绿 1/1 | 拼音 0，服务器 `第一测试`。岛上 POST /blocks 要约 1.07 s（598 → 1664 ms），两个词都在草稿里打完；交接在 3387 ms，晚于两次组字（结束于 593、1556 ms），分类「交接在组字外」。 |
| SAVEFAIL-500-direct | 绿 1/1 | (a)–(e) 全过，常驻 Retry / Copy，失败 toast 0，补上 5532 ms（岛上往返慢） |
| ONEFAIL-500 | 绿 1/1 | (i)–(iv) 全过：B 闲置保存 2361 ms，A 自己补上 7538 ms，服务器 `[["alpha start one two"],["beta start bee"]]`，toast 0 |
| D-anchor | 绿 1/1 | 四项检查都对（第二个写入者是同一测试账号，走岛上 API） |
| HEADCLOSE-putback | 绿 1/1 | 冲突项形：bbb 放回得 200；Apply → PUT `warmup|aaa` → 409，成冲突项，服务器 `["warmup bbb",""]`；没点 Replay |
| K1-close | 绿 1/1 | `["warmup","note alpha"]` |
| IDLE | 绿 1/1 | 3.5 s 时服务器已有 |

- 过程里我这边的问题：
  - 第一次运行（23:26:08–23:28:20）时，A-25 kit 的三条臂（IME-new、SAVEFAIL + ONEFAIL、D-anchor）没起来。kit 即使在 island 模式下也要 `CREDROOT`（放浏览器配置目录），我的脚本没设，进程一开头就退出，一行没跑。
  - 另三条（putback、K1-close、IDLE）那次跑了，都绿。
  - 设好 `CREDROOT` 后只补跑 kit 那三条（23:29:21–23:31:19），都绿。两次的输出都已归档（`run-post25-first.out.txt`、`run-post25-kit.out.txt`）。
- 证据：`postdeploy-25/`，各臂的行与日志、分析器输出、哈希报告、运行脚本 `run-post25.sh`。
