# A-20b r2 验收（Tester(1)，2026-11-09）

> 对象：包 ops `packages/a20b-belt-coverage-r2/`，主 JS `index-Db4qSSYo.js`（sha256 `2f09b0be…68ca`），基线 `04f6f822`，src 19 个文件，dist 63 个文件。
> 环境：本地后端（server = `04f6f822`），前端直接服务包里的 `dist/client`（5612 → 3612，全新库）。对照：修前 = `04f6f822` 等价构建（5601 → 3601）；r3e = 第 23 轮岛上版本的封包（5611 → 3611）。真 Chrome 走 CDP。没碰岛，没碰 Henry 的账号，没用真实模型，应用里的 Agent 0 条。
> **只测了 Chrome。** 判语标准：列出每一条比修前差的臂；已裁项标「已裁，手册已知」。第 24 轮的「不比线上差」另以岛上 r3e 为基线（Main_Designer 11-09 裁），光标跳一条按这个基线判。

## 〇、判语

**放行。** 没有一条臂比修前差，也没有一条比线上 r3e 差。

- 同源：src 19/19，自建 63/63 与包一致，主 JS 逐字节相同。
- r3 链 190 行：15 个标签与 r3e 判语链 0 行差异。唯一 1 行差是 `m` 标签的 LIST-addr-0 红（服务器 `["rmup","k0","x","ywa"]`）。它出自准备步骤里新起块的光标跳（见第八节），不是臂本身。
- a20m LANDOTHER 全绿：plain 2/2、headline 2/2；heading 以补跑 2/2 为准，原跑 1/2，另 1 行设置错。
- a20n：旧臂 28 个、52 行与 r3e 逐臂同数。新臂 11 个、22 行在 r2 上全合预期，修前红 18 行、r3e 红 16 行。
- 9 对回归：r2 的红行都是修前同一对红行的子集。第 10 对修前 0/20、r2 0/20。

### 比修前差的臂

无。

### 比线上 r3e 差的臂（第 24 轮基线）

无。新起块的首几键光标跳按 Main_Designer 看数前的预登记判（第八节）：

| 检验 | 修前 | r3e | r2 | r2 对 r3e（Fisher 双侧） |
|---|---|---|---|---|
| 主判：按令那遍，各 30 | 0/30 | 1/30 | 0/30 | p = 1 |
| 复现：意外那遍，各 30（单列，不并入主判） | 0/30 | 0/30 | 0/30 | p = 1 |
| 次判：合并两遍，各 60 | 0/60 | 1/60 | 0/60 | p = 1 |

- 没有一项预登记检验显示 r2 多于 r3e。
- 探针的分辨力有限：每组 30 行时，r2 要到约 8/30 才与 r3e 的 1/30 显著。0/60 的 95% 上界约 6%。所以普查那种 1–2% 量级的差别它测不出来；结论只能写「没有证据显示 r2 高于 r3e」。
- 光标跳本身不论结果都进 TD-77，是阶段一的单（Main_Designer 裁）。

### 已裁、手册已知（照记，不挡）

1. **BACKIN-heldhead-undo 红 3/3**（REPS=2 两行，第三形一行）：扣留期间按 Ctrl+Z 无效，屏上和服务器最后都是 `['warmup bbb','aaa']`。与 r3e 同形，已裁 🅱。
2. **HEADCLOSE-putback（×1，读数）**：重开后把 bbb 手动放回第一行，它的保存得 200，aaa 的恢复项被挤掉，Apply 点不到，aaa 丢，bbb 留在服务器。与 r3e 同形，已裁 A-25 ②a (iv)。探针按臂规则记红，分析器只记读数。
3. **MENTER-close 带 Apply 的那一项**：重开时出现「A block edit is waiting for recovery abx cd」，带 Apply。这是在途那次保存多余的回执，服务器上已有 `abx`。与 r3e 同形，已裁 A-25 ②a (ii)。
4. **CLICKBACK-end（只记）**：框里 `alphaZ`，记录 `"alpha"→"alphaZ"`，服务器 `["alpha beta"]`。与 r3e 同形，修前没有框；TD-66 本条。

### 归类（Main_Designer 11-09 裁，不算红）

- **MULTIPASTE-close：🅱，附在 TD-66 下。**
  - 现象：`def` 既落了地（拼在服务器的 `abcXQdef` 里），又作为 split 记录留在框里。
  - 框里只有 Discard，没有 Apply；重开时两行都是 Apply false。只有用户照框的说明把 `def` 粘回去，才会出两个 `def`。12 秒后框里仍是 `YQ`、`def`，没有自己回去。
  - 对照：r3e 本来就这样（服务器 `abcdef`，框里 `YQ` 与 `def`）。修前没有这层重叠：没有框，`XQ`、`YQ` 都丢，`def` 只在服务器上。所以 r2 不比 r3e 差，比修前多保住了 `XQ`、`YQ`；框里多一份 `def` 副本是 r3e 起才有的，订单规格 1 写明为「副作用（接受）」。
  - 更正：我先前给 Main_Designer 的转述只比了 r3e，裁定里写的「修前 / r3e 既有」修前那一半不对。手册那句「别 Apply」也要改成「别把框里的 def 粘回，Discard 即可」。两处都已报 Main_Designer 复核。
  - 手册随 r2 收割补一句。详见第四节。
- **SURROGATE-paste-close 同形**：`😀def` 既在服务器上（`abc😁😀def` 里），又作为 split 记录在框里。r3e 同形（服务器 `abc😀def`，框里 `YQ`、`😀def`），修前没有框。是否归进上一条，候 Main_Designer 确认。

## 一、同源

- 包内 `src.sha256` 19/19、`dist.sha256` 63/63 自洽。
- 重建：`04f6f822` 存档 + 包里 19 个 src 文件 → vite build（在锁位里），与包 dist 63/63 逐文件同哈希，主 JS `index-Db4qSSYo.js` 逐字节相同（`hashes/tester-rebuild-dist-a20b-r2.sha256`）。
- 对 r1 包（`a20b-belt-coverage`）：新增 1 个（`useHeadingStructureController.test.tsx`），改动 6 个，相同 12 个。
- a20m 预言核对（`check-a20m-oracle.mjs`）通过：两条文案都 MATCH，主 JS 里都在，`oracle ok`（`gate/oracle-a20b-r2.txt`）。

## 二、r3 链 190（对 r3e 判语链逐臂归一化 diff）

- 16 个标签、190 行，A-20b 上 190 行都跑完。15 个标签与 r3e 判语链归一化后 0 行差异。
- 运行条件与 r3e 那轮不同：本轮链（13:15–14:42，一个浏览器）与 9 对回归（13:15–14:31，两个浏览器）、第 10 对（14:31–14:45，一个浏览器、交替两个账号）同时跑，最多 3 个浏览器，其中 2 个打 3612。r3e 的链是单浏览器跑的。负载对光标跳的影响见第八节「去混杂」。
- `m` 标签差 1 行：**LIST-addr-0 红**，服务端 `["rmup","k0","x","ywa"]`；同轮 LIST-addr-1 绿（`["warmup","k0","x","y"]`）。
  - **不是臂本身**：第一个被扣的 PUT 就是 `rmup|k0wa`。错位发生在准备步骤 `prep()` 往新笔记里打 `warmup` 的时候。
  - 打完 `wa`，光标跳到 0，`rmup` 打在前面成 `rmupwa`，Enter 把它拆成 `rmup | wa`，后面的 `k0`、`x`、`y` 都打在尾部 `wa` 前面。整串 PUT 与此逐个对上。见第八节。
- 同一错位还落在两行上，判读不变：
  - OFFKILL：参照行，r3e 上同为 ok=false「A-25 ②a 前丢失」；
  - CLOSEFLY-resp-1：绿。

## 三、a20m LANDOTHER

- plain 2/2、headline 2/2 绿。
- heading 原跑 1/2 绿，另 1 行 **setup error**：第二块该是 `plainb`，落成了 `ainbpl`，同一种光标跳，见第八节。
- 补跑 LANDOTHER-heading ×2（`runs/belt-m-landother-rerun`）：**2/2 绿**，0 行设置错，0 行错位；每行键都显示，「Heading changes could not」提示 0 条，最后都落地。以补跑为准（Main_Designer 裁）。

## 四、a20n 全臂（REPS=2，TRACE=1，含新臂）+ 第三形

`runs/belt-n` 共 74 行：旧臂 52 行，新臂 22 行。另有 `runs/belt-n-third` 3 行（heldback、fail-heldhead、heldhead-undo 各 ×1）。0 行设置错，0 行新起块错位。

**旧臂 28 个、52 行，与 r3e 逐臂同数。** r3e 那份在上一轮目录：`docs/audits/2026-11-08-a20-builder/tester-r3e/runs/r3e-n`，分析器输出 `tester-r3e/gate/an-r3e-n.txt`。

- 绿的照样绿。红的只有 BACKIN-heldhead-undo：本轮 0/2，第三形再 0/1，与 r3e 同形（已裁 🅱，见〇）。
- HEADCLOSE-putback、MENTER-close、CLICKBACK-end 的读数与 r3e 实质相同：服务器、框、Apply、提示都一致。差别只有两处：r2 的保留记录带类别标注（`(edit)` / `(split)`），以及毫秒数。
- 探针自报的「red 3」= heldhead-undo 2 行 + putback 1 行（臂规则红，已裁读数）。

**新臂 11 个、22 行，在 r2 上全部合预期：**

| 臂 | r2 | 读数 |
|---|---|---|
| SHIFTENTER-close | 2/2 | 落地形状 ONE；换行在服务器上，`qr` 保留，`abc` 没有重复 |
| SHIFTENTER-typed-close | 2/2 | ONE：服务器 `["abc\nd","qr"]` |
| SHIFTENTER-idle / idletyped（对照） | 2/2 / 2/2 | 没有在途保存，ONE |
| SURROGATE-paste-close | 2/2 | 断开的码元 0 个，没有 U+FFFD；😁 在服务器上，`YQ` 在框里，😀 保留；第一行码点 `61 62 63 1f601 1f600 64 65 66`，12 秒后不变。`😀def` 同时在服务器上（`abc😁😀def` 里）和框里（split 记录），与 MULTIPASTE 同形（见〇「归类」） |
| WINDOWENTER-land | 2/2 | SPLIT：服务器 `[["warmup"],["[heading_1]kept","body"]]`，框 1 ms 内消失 |
| MULTIPASTE-close | 2/2 | `XQ` 在服务器上，`YQ` 在框里，`def` 在服务器上；`qr` 保留，服务器上没有重复单元 |
| LISTPASTE-close | 2/2 | `item` 落进服务器，成 `["warmupr","item"]`；`warmupr` 没变，`item` 只出现一次 |
| ADDR-noncanon-bare / bareslash / bareaddr | 各 2/2 | 停在 A，没有留下未存的字（LEFT_UNSAVED 0）；第二次离开先扣住再放行（HELD-PROCEED）；重开后是 `["warmup","backin words more"]` |

- LINK-close 已撤，这一轮里没有这条臂。
- **MULTIPASTE 的读数**（已归类 🅱，见〇）：
  - 关页时没有发出保存：关页前只有被扣住的 `abcdef|qr`。
  - `abcXQdef|qr` 是重开后发出的（4946 ms、4895 ms），由上一页留下的回执自动重放；重开时出现提示「A previous block edit is queued for recovery」。服务器上的这一行 `abcXQdef` 从没有作为一整行出现在屏幕上，屏幕上是 `abcXQ`、`YQ`、`def` 三行。
  - `def` 同时在服务器上（拼在 `abcXQdef` 里）和框里（`""->"def"(split)`）。框里只有 Discard，没有 Apply（两行重开时都是 Apply false）。只有用户把框里的 `def` 粘回去，才会出两个 `def`。12 秒后框里仍是 `YQ`、`def`。
  - r3e 上同样是 `def` 两处都有（服务器上是 `abcdef`，框里也有 `def`），而且 r3e 丢了 `XQ`。修前没有框，`XQ`、`YQ` 都丢，`def` 只在服务器上。所以 r2 不比 r3e 差，比修前多保住了 `XQ`、`YQ`。r1 冒烟时（`b-smoke3-r1`）已经是同形。
  - 首行没有出现预期的两种记录（`abc→abcX…` 或 `abcdef→abcX…`），因为 `XQ` 直接落地了。臂规则收「在服务器上或在框里」，所以绿。

## 五、新臂在修前（ALLOWEXTRA）与 r3e 上的读数

`runs/preb-n-new`（修前，22 行）与 `runs/r3e-n-new`（r3e，22 行），两边都是 0 行设置错。

| 臂 | 修前 | r3e | r2 |
|---|---|---|---|
| SHIFTENTER-close | 0/2 LOST（换行不在任何地方，服务器 `["abc","qr"]`） | 0/2 LOST | 2/2 ONE |
| SHIFTENTER-typed-close | 0/2 LOST | 0/2 **SPLIT**（服务器 `["abc","d","qr"]`） | 2/2 ONE |
| SHIFTENTER-idle / idletyped | 2/2 / 2/2 | 2/2 / 2/2 | 2/2 / 2/2 |
| SURROGATE-paste-close | 0/2（😁、`YQ` 不在任何地方；断开的码元 0 个；没有框） | 0/2（😁 不在任何地方；`YQ` 在框里；`😀def` 既在服务器上又在框里） | 2/2 |
| WINDOWENTER-land | 0/2 BOX（落成框，不是 SPLIT） | 2/2 SPLIT | 2/2 SPLIT |
| MULTIPASTE-close | 0/2（`XQ`、`YQ` 不在任何地方） | 0/2（`XQ` 不在任何地方） | 2/2 |
| LISTPASTE-close | 0/2（`item` 不在任何地方） | 0/2（同） | 2/2 |
| ADDR bare ×3 | 各 0/2（第二次离开卡住 STUCK；修前没有取回，words x0） | 各 0/2（第二次离开卡住 STUCK；放行 1 次，留下 1 条） | 各 2/2 |

新臂在修前红 18 行（9 个臂），在 r3e 红 16 行（8 个臂）。修前和 r3e 上都没有一行比 r2 好。

## 六、9 对回归（修前对 A-20b r2，同时跑，两浏览器）

r2 的红行都是修前同一对红行的子集，按 `arm:name` 逐行核（`redsubset.mjs`，输出在 `pairs/redsubset-*.txt`）：

| 对 | 修前红 | r2 红 | r2 新红 | 修前独有 |
|---|---|---|---|---|
| mx | W16 L2 G4 | W16 L0 G3 | 无 | L:insert-1、L:insert-2、G:imeAcrossWindow |
| acc1 | 0 | 0 | 无 | — |
| acc10 | 3 | 3（同名同组） | 无 | — |
| y | 0 | 0 | 无 | — |
| two2 | 0 | 0 | 无 | — |
| acc18 | 0 | 0 | 无 | — |
| acc13 | 3 | 2 | 无 | RV:N-a1-failedSaveThenMore |
| J | 0 | 0 | 无 | — |
| retry | 0 | 0 | 无 | — |

与 r3e 那轮一致（r3e 的 acc13 也是 2）。配对账号用自己的测试邮箱预先注册（第 23 轮前的教训）。

## 七、第 10 对（UNDOPAUSE 修前 ×20 对 r2 ×20，交替，单浏览器）

特征形状修前 0/20、r2 0/20，没到停线条件（修前 0 且 r2 ≥3），只记数。r2 每行 5 个 PUT、修前 4 个，多出的一个是空闲保存（r3e 起就是这样）。

## 八、新起块的首几键光标跳（准备步骤污染；第 24 轮以 r3e 为基线判）

### 机理（本轮数据里自带的直接证据）

- LANDOTHER-heading-0 的网络时间线：
  1. 8736 ms 发出 `POST /notes/:id/blocks`。双击后**第一个键**才发，块是懒创建的。
  2. 8794 placement。
  3. 8822 第一个 text-save，载荷 `pl`（已打 2 键）。
  4. 9599 text-save，载荷 `ainbpl`。
- 读法：`pl` 之后光标落到 0，`ain` 打在前面成 `ainpl`，`b` 落在光标 3，成 `ainbpl`。跳在第 2 键之后、第 3 键之前，紧跟这块的建块请求。
- 建块请求的回程时刻**缺**：探针只在 Response 阶段钩 text-save / unit-transfer，所以不往回程上推。
- 不只新笔记首行：双击新起的块都走同一交接，都可能撞上（本轮实例：笔记里第二个块 `plainb`）。
- Reviewer 读到的候选机理，仅供对照，没据此改探针：交接时先读草稿选区，再挂新编辑器；焦点回执把在途的键重发给草稿时不带选区。

### 历史普查（所有 runs，新起块首打的词 `warmup` / `plainb` / `hbody` 出现乱序形）

截至本轮全部跑完（`gate/census2.txt`，分母是含这些词的准备行）：

| 构建 | 乱序 / 准备行 |
|---|---|
| 修前 | 3/239 |
| 旧 A-20 r2 | 2/200 |
| **A-20b r2** | 4/243 |
| r1 | 0/74 |
| 旧 A-20 r1（post） | 0/72 |
| **r3** | 0/218 |
| **r3d** | 0/186 |
| **r3e** | 0/241 |

本轮探针的行另计（下文）。A-20b r2 的 4 次全在本单的链与 a20m 里：CLOSEFLY-resp-1、LIST-addr-0、OFFKILL、LANDOTHER-heading-0。

### 去混杂（只查记录，没占槽；Main_Designer 裁 (a)）

每一行的时刻取它那张笔记在后端库里的建时间（只读）。没有笔记的设置错行，取同一文件前后两行的中点。在每个时刻数三样：

- 所有本地后端上 ±90 秒内建过笔记的（后端，账号）对数，下称「活账号」；
- 该行自己那个后端上的同类数；
- 调速器日志里该分钟前后一分钟的整机 CPU 峰值。

**口径的限度**：活账号数不等于同时在跑的浏览器数。同一浏览器轮换账号、或 90 秒内前后衔接的两条作业，也会计成多个活账号。单浏览器的探针 180 行按此口径全读 2–3，没有一行读 1。所以下表「1 个活账号」一层是严格的单浏览器，2 和 3 以上两层里混有单浏览器的行。

只读，不改任何东西。结果在 `gate/confound2.txt`，按并发分层：

| 族 | 1 个活账号 | 2 个 | 3 个以上 |
|---|---|---|---|
| r3 族（r3、r3d、r3e 及封包前冻结件） | 476/0 | 189/0 | 16/0 |
| A-20b r2 | 48/0 | 5/0 | 190/4 |
| 修前 | 118/1 | 100/1 | 20/1 |
| 旧 A-20 r2 | 63/0 | 42/0 | 95/2 |
| r1 + post | 87/0 | 47/0 | 12/0 |

- **并发是真混杂。** A-20b r2 的 4 次与旧 A-20 r2 的 2 次，活账号数都是 3，自己的后端上都是 2。按运行时段核实际浏览器数，A-20b r2 的 4 次是：
  - CLOSEFLY-resp-1、OFFKILL：3 个浏览器（链 + 9 对的两个）；
  - LIST-addr-0、LANDOTHER-heading-0：2 个浏览器（链 / a20m + 交替两个账号的第 10 对）。
- A-20b r2 的准备行 78% 落在 3 个以上活账号，r3 族只有 2%。
- **并发解释了一部分，不是全部。** 按其他族在各层的乱序率，r3 族按自己的并发构成应期望：

  | 分层依据 | 期望次数 | 实际 0 次的概率 |
  |---|---|---|
  | 全后端活账号 | 2.83 | 0.059 |
  | 同后端活账号 | 4.21 | 0.015 |
  | CPU 档 | 6.95 | 0.001 |

  CPU 档解释不了。
- **单独点出修前那次「安静的跳」**：`pre-n2` 的 ADDR-noncanon-anchor-1，11-09 00:08 左右。当时全后端只有 1 个活账号，同后端 1 个，CPU 峰值 38。这是普查记录里唯一一次在单浏览器、低负载下的跳，发生在修前。
- 普查之外还有一次同类的跳：探针按令那遍 r3e 的 CARET-w800-1（16:18:23）。单浏览器，CPU 峰值 47，发生在基线 r3e 上。按 ±90 秒口径它读 2 个活账号，是因为探针在一个浏览器里轮换三个账号。
- **r3 族「1 个活账号」层作对照：476/0。** Main_Designer 转述时叫「单浏览器层」、数是 470/0；多出的 6 行是今天新臂在 r3e 上跑的（`r3e-n-new`）。同层 A-20b r2 是 48/0，修前 118/1。

### 定量探针（`caret_probe`）

做法：新笔记，双击空白处、等 1.2 s、单击草稿框、等 250 ms，再等 W 毫秒打 `warmup`（W = 800 / 300 / 0）。W=0 不是「双击后立刻打」，双击到第一个键至少约 1.45 s。

单浏览器，占一个锁位。三个构建轮流跑，每个构建每档 10 行、共 30 行。读服务器单元，第一个单元不是 `warmup` 就算乱序。

**主判：按令那遍**（seq 全部跑完后，16:16–16:28，`runs/caret-runB/`）

| W | 修前 | r3e | r2 |
|---|---|---|---|
| 800 | 0/10 | 1/10 | 0/10 |
| 300 | 0/10 | 0/10 | 0/10 |
| 0 | 0/10 | 0/10 | 0/10 |
| 合计 | 0/30 | 1/30 | 0/30 |

Fisher 双侧：r2 对 r3e p=1，r2 对修前 p=1。

**复现：意外那遍**（15:39–15:51，`runs/caret-runA/`，单列，见第九节）：三组都是 0/30，每档都是 0/10，方向与主判一致。

**次判：两遍合并，各 60**：修前 0/60、r3e 1/60、r2 0/60，p=1。

**r3e 那一行：CARET-w800-1**（主判 r1 轮）

- 服务器 `["rmup","wa"]`，这是 r3 族有记录以来的第一次跳。
- 跳在第 2 键之后：新 textarea 的第一个 input 事件，值 `rwa`，光标 1。
- `POST /notes/:id/blocks` 在第 1 键后 22 ms 发出。
- 原 textarea 离开文档在第 2 键之后、第 3 键之前。这一项我先报，发出时刻是佐证；回程时刻缺。

**时序事实（给 TD-77；只记事实，机理留给那张单去探）**

- 两遍合计 180 行（含跳的那一行），原 textarea 都在第 1 键后约 46–124 ms 离开文档（页面时钟，自第一个 input 事件起）。
- 按页面 input 事件算：
  - 只有第 1 键落进原 textarea、它就离开的有 163 行；
  - 第 2 键也落进原 textarea 后它才离开的有 17 行（修前 5、r3e 6、r2 6），其中跳了 1 行，就是上面那一行。
- 若按探针发键的时刻算，第 2、3 键之间离开的是 30 行。差出的 13 行里，第 2 键在离开前发出，但它的 input 事件在离开后 2–20 ms 落进了新 textarea。
- 所以「第 2 键落进原 textarea 后它才离开」是跳的那一行具备的条件，但 17 行里只有 1 行跳，单有这个条件不够。
- 跳的那一行与其余 16 行（第 2 键也落进原 textarea）的差别，三处：
  1. 新 textarea 获焦时（页面 914 ms）值是 `w`，少了原 textarea 已有的第 2 键。180 行里仅此一行；其余 16 行获焦时都是 `wa`。
  2. 新 textarea 获焦比原 textarea 离开早 25 ms。其余 179 行是 4–13 ms，那 16 行是 4–5 ms。
  3. 建块 POST 在第 1 键后 22 ms 发出；那 16 行是 7–8 ms。
- 机理留给 TD-77。
- `POST /notes/:id/blocks` 在第 1 键后 7–41 ms 发出（中位数 8 ms），三个构建一样。
- 文件：`gate/caret-gone-runA.txt`、`gate/caret-gone-runB.txt`（探针时钟口径）；页面口径的逐行数据在 `runs/caret-run*/` 各行的 `log.ins` / `log.foc` / `log.gone`。

**结论**：静态单浏览器下，三个构建在探针里都没测出差异，跳都极少（r3e 1/60，另两组 0/60）。探针分辨力见〇：测不出 1–2% 量级的差别。所以能写的是「没有证据显示 r2 高于 r3e」，不是「已证同级」。r3 族「1 个活账号」层 476/0、A-20b r2 同层 48/0，指向同一方向。

### Reviewer (b)

Reviewer 核过，Main_Designer 转：r3e→r2 改动的 7 个文件里，没有一行在下面这条路径上执行，也没有一行在每个 input 事件上执行：草稿 textarea → persistDraft → POST → 交接 → 挂编辑器 + 焦点选区。

## 九、过程里我这边的问题（照实记）

1. **探针排队的设计混杂，已改**：探针第一次排队时，如果一等到槽就起，那时我的 a20n 正在打 3612，r2 那组会比别的组多一个同后端浏览器，恰好把要排除的混杂带进探针。我在它还在等槽时用 TaskStop 停了它的外壳（没停干净，见第 2 条），另排一条在整条 seq 跑完后再起，内容与范围不变。
2. **停掉的排队没停干净，探针多跑了一遍（TaskStop 只停外壳，11-07 已撞过一次）**：
   - 15:02 我用 TaskStop 停那条排队，里面等槽的 withslot.sh 活了下来。
   - 我当时向 Main_Designer 报「已停原排队（没占过位、没起浏览器）」。没占位、没起浏览器在那一刻为真，「已停」是错的。事后已更正。
   - 15:39:48 序列在第 3、4 步之间放锁，它抢到锁位，把整个探针跑了一遍，第 4 步因此到 15:51:51 才取到锁。
   - 时刻的出处：
     - 放锁、取锁两个时刻在 `gate/run-a20b-seq.log.txt`；
     - 那一遍各行笔记在库里的建时间是 15:39:59 到 15:51:36（只读，`gate/caret-note-times.txt`）；
     - 它的放锁时刻 15:51:44，我在按令那遍覆盖同名日志之前读到过，没能归档。那一遍的探针与锁日志都被按令那遍覆盖了，归档的 `run-caret.log.txt` 只有按令那遍。
   - 按建时间核过：那一遍和我别的作业没有重叠，没有别的作业在打 3601 / 3611 / 3612；builder 的槽 2（A-25 封包前）在跑，和按令那遍一样。
   - 重活锁这次挡住了：它是排队拿锁位，不是插队，没有出负载事故。
   - 处理：看数前，按 Main_Designer 的预登记，按令那遍作主判，意外那遍作复现样本单列，合并作单向次判（第八节）。
   - 机械化：新增 `stopq.sh`。它读 ps 树，连子孙进程一起停（子先父后），再查一遍，有残留就返回非零。METHOD 第七节已补。

## 十、环境与留档

- 环境：
  - A-20b r2：5612 → 3612（全新库 `data-a20b`）。链、a20m、a20n 用 `cred-3612`，配对用 `cred-3612r`，探针用 `cred-3612c`。
  - 修前：5601 → 3601（`cred-3601`、`cred-3601c`）。
  - r3e：5611 → 3611（`cred-3611`、`cred-3611r`、`cred-3611c`）。
  - 账号都是自己预先注册的测试邮箱，凭据只在私有 ops 里。
- 留档（本目录，本地路径已换成占位符，不含截图）：
  - `runs/`：链 16 个标签、a20m 与补跑、a20n 与第三形、新臂在修前和 r3e 上的两组、第 10 对 40 行、光标跳探针。探针按遍拆开放：`caret-runA/` 是意外那遍，`caret-runB/` 是按令那遍。原始文件是追加写的，A 行在前、B 行在后，拆法见 `scripts/caret-split.py`。
  - `pairs/`：9 对的行与日志、`redsubset-*.txt`、`run-reg-a20b-par.log.txt`。
  - `gate/`：
    - 链的逐臂注记；
    - 运行日志：`run-a20b-chain.log.txt`、`run-a20b-seq.log.txt`、`run-caret.log.txt`、`run-caret-after-seq.log.txt`、`run-undopause-pair-a20b-par.log.txt`。日志改用 `.log.txt` 结尾，因为仓库的 .gitignore 丢掉 `*.log`；
    - a20n / a20m 的分析器输出、`oracle-a20b-r2.txt`；
    - 探针三栏计数：`caret-tally-main-runB.txt`、`caret-tally-replication-runA.txt`、`caret-tally-pooled-AB.txt`；
    - `caret-gone-*`、`caret-note-times.txt`、`census2.txt`、`confound2.txt`。
  - `hashes/`：自建清单。
  - `scripts/`：本轮用的探针臂、分析器、探针与计数脚本、普查与去混杂脚本、运行脚本、`stopq.sh`、本归档脚本。
- 报告复核：交出前由 Opus 读者分四路复核（〇–七的数、第八节、判定逻辑与覆盖、公开仓库卫生），每路发现再由第二个读者独立核对。共 25 条，第二读者确认 22 条，否掉 3 条。确认的都已改进本文，判定未变：
  - 错数 2 处：离开时刻下界应为 46 ms（两路都报了）；「第 2、3 键之间」的 30 行是探针时钟口径，按页面算是 17 行；
  - MULTIPASTE 三处说错：修前并无重叠；框里没有 Apply；`abcXQdef` 是重开后回执重放发出的，不是关页时发的；
  - 补 SURROGATE 同形、CLICKBACK-end 已裁项、预言核对输出、探针分辨力、活账号口径的限度、运行条件；
  - 日志改名进仓。
  另记：一个读者误建过一个 scratch 临时文件，随即删掉，别的没动。

## 十一、第 24 轮部署前后核对（2026-11-09）

**部署前 ack**（只读，没起浏览器，没占锁位）：
- 收割提交 `dfbcce8e` 上，包里 19 个 src 文件逐个对包的 `src.sha256`：19/19 相符。
- 岛上原版本 `29b1d456` → `dfbcce8e`：代码区改了 7 个文件，全在包清单里；server、package*.json 没改。
- 与验收基线 `04f6f822` + 包相比，代码区包清单外 0 个文件不同；docs 以外只多根目录 `scripts/pre-harvest-scan.mjs`（不进 client 构建）。远端分支头是 `dfbcce8e`。

**部署后**（Main_Designer 部署：岛上只跑 `build:client`，服务没重启，没 `npm ci`）：
- 岛上 dist 清单（Main_Designer 给，`postdeploy-24/island-dist-24-from-md.txt`）对包 `dist.sha256`：63/63 逐行相同。
- 我自己经隧道逐个取岛上实际服务的文件再算哈希：63 相同、0 不同、0 取不到；主 JS `index-Db4qSSYo.js`（`postdeploy-24/island-hash-post24.txt`）。
- 代表臂在岛上，只用我的岛上测试账号，单浏览器，占一个锁位（17:10:40–17:17:52），每条 ×1。没点 Replay，没碰 Henry 的账号与数据。

| 臂 | 岛上读数 |
|---|---|
| IDLE | 3.5 s 时已在服务器上 |
| K1-close | `["warmup","note alpha"]` |
| HEADCLOSE-plain | 重开时 aaa 带 Apply 横幅，bbb 在框里；20 s 后同 |
| HEADCLOSE-applyslow（req 形） | 无 409，无「Failed to save block」，Apply 的 PUT 放行后 200，aaa 在服务器上（这一次扣留期间框里的字没落进第一行，窗口没撞上） |
| MENTER-close | KEPT：服务器 `["abx","cd"]` 不改写，框里 `abxcd` 与 `Z` |
| ADDR-noncanon-case（`#/Notes/<id>`） | 停在 A，HELD-PROCEED，重开 `["warmup","backin words more"]` |
| N6B-switch | A 端 `["warmup bbb","aaa"]` 各一次，B 不变，丢 0 |
| **SHIFTENTER-typed-close**（本轮新） | ONE：服务器 `["abc\nd","qr"]`，`abc` 无重复 |
| **MULTIPASTE-close**（本轮新） | `XQ` 在服务器上（`abcXQdef`），`YQ`、`def` 在框里，`qr` 保留，服务器上无重复单元；与本地读数同形（见〇「归类」） |
| **ADDR-noncanon-bare**（`#notes/<id>`，本轮新） | 停在 A，HELD-PROCEED，重开 `["warmup","backin words more"]` |

10/10 与本地 r2 读数一致，0 行设置错，0 行新起块错位。证据在 `postdeploy-24/`（各臂 rows / summary / 分析器输出、岛上哈希报告、运行脚本与输出）。
