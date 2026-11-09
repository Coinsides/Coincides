# A-20 r3 验收（Tester(1)，2026-11-08 至 11-09）

> 对象：包 ops `packages/a20-idle-save-r3/`，主 JS `index-nLSUOG48.js`，基线 `04f6f822`，src 15 个文件，dist 63 个文件。
> 环境：本地后端（server = `04f6f822`），前端直接服务包里的 `dist/client`；修前对照是 `04f6f822` 等价构建。真 Chrome 走 CDP，不碰岛，不碰 Henry 的账号，没用真实模型，应用里的 Agent 0 条。
> **只测了 Chrome。**

## 〇、判语

**挡放行，原因 N1。** 这个包不上岛，由 r3d 接（Main_Designer 11-08 已开）。

- N1 在真浏览器里复现：MERGE、SELDEL 两臂，各三种离开方式（关页、地址栏、后退）各跑 2 次，**r3 12/12 都是 DUP**。
  - 重开后服务器是 `['abcdZ','cd','ef']`（MERGE）或 `['adZ','cd','ef']`（SELDEL）。被合掉的那一行自己又落了一次，屏上一样，框里没有东西。
  - 修前同样 12 行：**12/12 LOST**。服务器 `['ab','cd','ef']`，Z 丢了，不重复；重开时横幅给 Apply，能找回队头那次的 `ab cd efg`。
  - r3 是把错的内容自动写进已存的正文，修前只是丢字。这一条比修前差，挡。
- 同源一致（第一节）。
- r2 链 153 行在 r3 上全保：逐臂注记与 r2 完全相同，0 红。a20m 37 行全绿（第三节）。

### 比修前差的臂

1. **MERGE / SELDEL**（N1，挡放行）：修前 12/12 LOST（丢 Z，不重复）；r3 12/12 DUP（被合掉的行落两次）。
2. **BACKIN-heldback**（N3）：脚本 hash 离开被扣住时按后退，保存失败。r3 上 3 行全红：每行「Changes could not be saved. Please retry before leaving the note.」都连弹 2 条（应 1 条），两行在同一毫秒（+1627、+1627；+1622、+1622），一行差 1 毫秒（+1624、+1625），就是两个失败回调各弹一条。**更正（11-09）**：我先前报的「×3、×2」把探针自己第二次离开（REFUSED，按设计恰 1 条）的那 1 条也算进去了，是测量错误。修正后的计数窗口只到第二次离开开始之前，探针已改。**再更正（11-09）**：我第一次更正里写的「3 行里 1 行红，另 2 行各 1 条」也错。探针把两份 toast 快照合并时用了以「时刻|文字」为键的 Map，同一毫秒的两条被并成一条，所以有两行看上去只有 1 条。r3d 封包前参照跑完后，三个独立 Opus 读者对着原始 rows.jsonl 反驳我的读数，查出了这一点。按原始数组、同一窗口重数，r3 是 2、2、2，N3 在 r3 上 3/3 复现。探针和分析器都已改成按多重集计数（分析器从原始数组重数，并同时印出记录值）。修前构造不出来：修前不扣 hash 离开，没有保存可让它失败，记 N/A。r3d 修。
3. **BACKIN-fail-heldhead**（S2 隔离臂，见第四节）：队头保存在途时按后退，人留在 A 上，本机却多一条留住记录 `{'' → 'bbb'}`，从后退后约 25 毫秒活到约 1.6 秒（队头被应答、bbb 交出去才删）。r3 5/5，变异包 3/3，两者一样。修前没有留住记录这回事，构造不出来，记 N/A。
   - 存储追踪与 builder 读码定了根因：r3 的 (乙) 撤回没有接到真 runtime 上（`NoteCanvasRuntime.tsx:44` 的 useImperativeHandle 没有传 `withdrawKeptEdit`），在真应用里是空操作。
   - Main_Designer 已裁：修折进 r3d。队头一直不应答（网络挂着）时，记录就一直在，正是 Reviewer 第 3 条「人没走、记录却留下」的形。

**与修前一样、但不合 r3 自己设计的**：

- **ADDR-noncanon**（N2）：r3 8/8 红，第二次离开都是 STUCK（`released` 卡住）。修前同样 STUCK，因为修前本来就不扣 hash 离开，所以不算比修前差。r3d 修。
- **已裁、进手册「已知」，不算红**：服务器持续失败时，hash 跳转也会被留下（修前只拦后退）。

## 一、同源

- 包里两份清单的哈希与 builder 报的一致：`src.sha256` = `386253c8…`，`dist.sha256` = `4476a224…`。
- 在包的 `src/` 里跑 `sha256sum -c ../src.sha256`：15/15 OK。
- 自建：`git archive 04f6f822`（client、shared、scripts、docs/generated、package.json）加包里 15 个文件，`npx vite build`。产物 63/63 与 `dist.sha256` 逐字节一致（`hashes/tester-rebuild-dist-r3.sha256`）。builder 的清单路径带 `./` 前缀，第一次 diff 因此整份不同；去掉前缀后哈希全同。
- 提示文案核对（`scripts/check-a20m-oracle.mjs`）：包 src 里的 LEFT_UNSAVED 与 SAVE_FAILURE 和判官一致，两条文案都在 `index-nLSUOG48.js` 里。
- 5604 与 5606 服务的都是包里的 `dist/client`，主 JS `index-nLSUOG48.js`。后端 server 树是 `04f6f822`，包里没有 server 改动。

## 二、决定这一版的臂（Reviewer N1）

探针 `a20n`（`scripts/a20n_arms.mjs`，前半段的工具函数与 `a20m` 共用）。

**起点**：新笔记打 `ab` 回车 `cd` 回车 `ef`，点外面保存，确认服务器是 `['ab','cd','ef']`。

**扣住与队头**：从这里起所有 text-save 都扣住。

1. 在 `ef` 末尾打 `g`，马上点外面封口。这次保存就是队头，在途、不应答。它不碰第一行，所以记录的起点仍是服务器上的 `ab`。
2. MERGE：在 `cd` 行首按退格，合成 `abcd`，按 End，打 Z，得 `abcdZ`。
   SELDEL：光标放在 `a` 后面，Shift+Down 选到 `cd` 第 1 列，退格得 `ad`，End，打 Z，得 `adZ`。
3. 离开前核一次：扣住的只有队头那一条。如果合行自己发了 PUT，就是设置错误，不判。builder 指出：没有队头，合行会马上作为自己的保存发出去，被交出去，测不到 N1。本臂第一版因此作废。
4. 离开：关页（about:blank）、地址栏（CDP 在同一文档内换 hash 到另一篇）、后退（脚本 hash 造出来的条目）。
5. 2 秒后整页重开这篇笔记。扣住的请求一直不应答，随旧页面一起死掉。

| | 修前（12 行） | r3（12 行） |
|---|---|---|
| 形状 | **LOST** 12/12 | **DUP** 12/12 |
| 重开后服务器 | `['ab','cd','ef']` | MERGE `['abcdZ','cd','ef']`，SELDEL `['adZ','cd','ef']` |
| Z 在哪 | 哪里都没有 | 在服务器上，和被合掉的 `cd` 并存 |
| 框 | 无 | 无 |
| 重开横幅 | 「A block edit is waiting for recovery ab cd efg」，有 Apply | 「A previous block edit is queued for recovery」 |
| 离开时本机记录 | 无 | 后退：`"ab" → "abcdZ"`、`"ab" → "adZ"`（edit）；关页、地址栏：2 秒时读不到（关页读不了；地址栏见下） |

- **地址栏一项要照实读**：r2、r3 上，有保存在途时，CDP 在同一文档内的地址栏一步会像点链接一样被扣住，人留在 A 上。LIST-addr 也一样：r2、r3 是 `A`，修前是 `other`。所以本臂的「地址栏」实际是「离开被扣住，之后页面整页离开」。它的 DUP 来自卸载时记下的记录。
- builder 读码确认过：r3 记 U1 edit `{ab → abcdZ}`，整行替换落地，就是 DUP；r3d 预期是 split 类记录进框（BOX）。
- 证据：`runs/pre-n3`、`runs/r3-n2`，分析在 `gate/` 同名文件。

## 三、本单验收臂（r3 链）

r3 链 = r2 链（153 行，r2 上 0 红，是 r3 必须全保的参照）加 a20m 的 BACKIN 与 LIST。单浏览器，5604 → 3604，全程占 `.lock.2`。

- **第 1 到 12 步**：153/153 行，0 红，每一步行数与 r2 相同（22+8+28+4+8+8+20+24+8+18+1+1+1+1+1）。
  - 分析器的逐臂注记与 r2 做了 diff（id 与毫秒数归一化后），**完全相同**。SPLIT 框的内容、LATEBACK 和 TWICE 的提示、K 系列、FLYK 都没有变形。
  - OFFKILL 的 probe 自己记 ok:false，与修前、r1、r2 相同（参照臂，「A-25 ②a 之前就是丢」，手册有限定语），不比修前差。
  - UNDO 一类的臂用 `BASE=runs/pre-c2` 对照。
- **第 13 步，a20m BACKIN 与 LIST**：37 行，0 红。
  - BACKIN-fail 原臂与 sealed、refail、idlefirst ×5、fast ×5、neterr ×5、recover：都留在 A，LEFT_UNSAVED 0，1、3、6 秒和扣留期的采样里记录都是 0，第二次离开 REFUSED（恰 1 条「Please retry」）。
  - recover：第三次离开 HELD-PROCEED，`backin wordsz` 在服务器上恰 1 份。
  - BACKIN-undo 2/2 绿。
  - 三个对照各读到自己的类别：ctl HELD-PROCEED，ctlfail REFUSED，ctlclean INSTANT-PROCEED。
  - LIST：close 和 back 是 x、y 进框，服务器 `warmup k0`；addr 三个都在服务器上，各 1 份。
- 证据：`runs/r3-*`，分析在 `gate/r3-*.txt`。

## 四、探针自证

### S2 变异对照（Main_Designer 准派）

- 夹具：builder 从封好的 r3 src 只删 `useNoteRouteSaveBoundary.tsx:135` 一行 `runtime?.withdrawKeptEdit?.();`（拦截器收回时的 (乙) 撤回），保留 M3。主 JS `index-CR5M1VGf.js`。
- 我在自己的副本里重建：63/63 与 builder 的清单一致（`hashes/tester-rebuild-dist-s2mut.sha256`）。与 r3 只差主 JS 和 `index.html`。
- 夹具只在 scratch，没进包，没进仓。跑在独立环境 5605 → 3605。

**结果：BACKIN-fail 仍绿（预期），BACKIN-fail-refail 也绿（预期红）。refail 没考到 (乙)。**（`runs/s2mut-m-backin`：31 行，0 红。）

- 原因在两行 refail 的网络记录里：后退在约 3411 毫秒。3427 毫秒发出 `'warmup aaa|'` 的失败重试，得 500。3456 到 3466 毫秒发出 `'warmup aaa|bbb'`，已经带上了 bbb。也就是后退后约 50 毫秒内，bbb 这组就被交出去，M3 在交接时把记录删了。
- 探针原先的假设是「同块先有失败，排在后面的组交不出去」，这在真浏览器里不成立：队列重试失败后会接着发下一次，下一次就带上了 bbb。
- 存储的第一次采样在 1 秒，所以有没有 (乙) 都读到 0。
- 判语标准不变，照实记。

### BACKIN-fail-heldhead（补的隔离臂，Main_Designer 准）

- 设置：所有 text-save 扣住。在 warmup 末尾打 ` aaa`，等它的空闲保存被扣住，作队头：在途、不应答，不是失败重试。然后在空行打 `bbb`，马上后退。1.5 秒时把扣住的保存全部答 500，之后的也答 500。页面里每 5 毫秒读一次本篇的留住记录。
- builder 读码的预期：排队不等于交接，队头没应答时 settleKept 不跑。所以 r3 在拦截时由 (乙) 收回，记录马上是 0；变异包的记录会一直留到队头被应答。

| | 变异包（3 行） | r3（5 行） |
|---|---|---|
| 记录 | `{'' → 'bbb'}`（edit） | `{'' → 'bbb'}`（edit） |
| 后退后出现 | +24 到 +26 毫秒 | +24 到 +38 毫秒 |
| 消失 | +1616 到 +1758 毫秒（队头答 500 之后） | +1610 到 +1659 毫秒（同上） |
| 人在哪 | A | A |
| LEFT_UNSAVED | 0 | 0 |
| 第二次离开 | REFUSED | REFUSED |
| 判（backinFailR3，1 秒采样记录为 0） | 红 3/3 | **红 5/5** |

- **结论：heldhead 也分不开 r3 和变异包。**
- **存储写入追踪**（builder 11-09 请求；`runs/r3-n-trace`，字段 `trace`）：从页面加载起，每次对留住记录键的 setItem / removeItem 都记下时刻、长度、条数和调用栈，navigate、popstate、hashchange 也记下。r3 上一行，时刻都按后退算：
  - +4 毫秒：后退的 navigate（traverse 到课程页），同一刻 keepOpenEdit 同步写下记录（1 条）。
  - +10 毫秒：popstate。+25 毫秒：路由自己 traverse 回本篇，popstate，两次 hashchange。
  - **+4 到 +1584 毫秒之间，这个键上没有任何存储写入**：没有 removeItem，也没有更短的 setItem。
  - +1584 毫秒经 persist 原样重写一次，+1634 毫秒由 M3 settleKept 删掉。
- **根因**（builder 照这份追踪读码）：`NoteCanvasRuntime.tsx:44` 的 useImperativeHandle 没有把 `withdrawKeptEdit` 传出去，所以 `useNoteRouteSaveBoundary.tsx:135` 的 `runtime?.withdrawKeptEdit?.()` 在真应用里什么也没调到。**(乙) 在 r3 上从来没有真跑过。**
  - 这也是变异包（删掉的正是这一行）与 r3 读数一样的原因。
  - BACKIN-fail 原臂在 r3 上是绿的，只是因为后退后约 50 毫秒内就交接了，M3 把记录删了。
  - Reviewer N5 指出的缺口正在这里：单测里 `withdrawKeptEdit` 是 mock，转接行没有单测。
  - builder 在 r3d 里修（约 4 行，外加一条用真 runtime 的阳性对照，在 r3 上应红），预期 r3d 上记录在约 +25 到 +30 毫秒时被收回。
- 证据：`runs/s2mut-n-heldhead`、`runs/r3-n2`、`runs/r3-n2-heldhead`、`runs/r3-n-trace`。

### BACKIN-heldhead-undo（Main_Designer 11-09 加；r3 ×3）

- 设置：所有 text-save 扣住。空行打 `aaa`，它的空闲保存作队头。在 warmup 行末打 ` bbb`（这一行有服务器文字，所以记录有起点：`{warmup → warmup bbb}`），马上后退（被拦）。约 +0.45 秒在记录窗口内按 Ctrl+Z。1.5 秒放行扣住的保存（成功），3 秒后正常 hash 离开，再重开。红 = bbb 自己回到服务器或屏上（② 形）。
- **这个状态在 r3 上造不出来**，三行一样：
  1. Ctrl+Z 在 +677 到 +680 毫秒按下，**没有效果**：屏上仍是 `warmup bbb`，记录不变。离开被扣住期间撤销不响应。是设计如此还是焦点问题，由 builder 读码答。
  2. 1.5 秒放行成功后，**被扣的后退接着走了**：约 +1985 毫秒人到了课程页。所以「3 秒后正常离开」是从课程页出发的。
  3. 重开后服务器和屏上都是 `['warmup bbb','aaa']`，也就是按打的字存下了。
- 分析器按规则读 3/3 红，但那是「撤销没发生」，**不是 ② 的证据，也不是反证**。
- 在 r3 上，记录活多久就是扣多久，而这段时间里撤销无效，所以「窗口内撤销、重开复活」这条路在真机里构造不出来。
- **Main_Designer 11-09 裁：台账记 🅱。** 证据是两句：「扣住离开期间撤销无效，② 路真机造不出」；「r3 上 (乙) 未接线」。
  - 「扣留期撤销不响应是设计还是焦点」，由 builder 在回执里答，进手册「已知」。
  - 另加守卫臂 **BACKIN-heldhead-del**（关页变体）：扣留窗口里用退格删掉 ` bbb`，在队头应答前关页，重开时 bbb 不得回来。它验的是关页时 pagehide 用当前文字覆盖记录，在 r3d 上跑 REPS=2。
- 证据：`runs/r3-n-heldundo`（带追踪）。

### 判官自己的对照

- 第二次离开的五类判法（STUCK、HELD-PROCEED、INSTANT-PROCEED、REFUSED、HUNG），四类在真机上见过真值：r3 的三个对照，加上 r2 的 STUCK（11-08 已报）。
- 提示文案核对有反向对照：把文案改一个字，核对就读「作废」，exit 1。

## 五、其余新臂（a20n，修前与 r3 各 REPS=2）

| 臂 | 修前 | r3 | 预期（Main_Designer） |
|---|---|---|---|
| **ADDR-noncanon-slash**（N2）：经应用进 A 后，`history.replaceState` 把地址改成 `#/notes/A/`，保留路由条目和 idx；然后跑原 BACKIN-fail | 红 2/2：第二次 STUCK（修前不扣 hash 离开） | 红 2/2：留 A，1、3、6 秒记录 0，第二次 **STUCK**（`released` 卡住）。LEFT_UNSAVED 出现在 +6.3 秒，正是 STUCK 那次真离开的时刻，所以是真话 | r3 红、r3d 绿 |
| **ADDR-noncanon-anchor**（N2）：同上，地址 `#/notes/A#x` | 红 1/1（另 1 行是设置错误：warmup 打成了 `wa`、`rmup` 两行） | 红 2/2，同 slash | 同上 |
| **ADDR-noncanon-hash**（N2 第二形）：第一次保存扣住时，脚本 `location.hash` 改到 `#/notes/A/`；1.5 秒放行；打 ` more`；再用脚本 hash 离开 | 红 2/2：STUCK。**修前一次保存都没发，`backin words more` 丢了，没有回执也没有横幅** | 红 2/2：扣住的第一次保存放行后落地，第二次 **STUCK**，字恰 1 份 | r3 红、r3d 绿 |
| **ADDR-noncanon-addr**（N2「地址栏不可扣」形）：同上，但用 CDP 地址栏一步改到 `#/notes/A/` | 同 hash | 红 2/2，与 hash 一样（放行 1、STUCK） | r3 记录冻结 + `released` 卡住；r3d 零记录 |
| **BACKIN-heldback**（N3） | N/A 2/2（修前不扣 hash 离开，没有保存可让它失败） | **红 3/3**：每行「Please retry」2 条（+1624/+1625、+1627/+1627、+1622/+1622 毫秒；两次更正后的计数，见〇节）；留 A，记录 0，第二次 REFUSED | 恰 1 条 |
| **CLICKBACK-end**（N4，只记形状） | 服务器 `alpha beta`，Z 丢，无框 | 服务器和屏上都是 `alphaZ beta`，**无框**（N4 预想留在框里的 ` beta` 两行都没出现），重开横幅「A previous block edit is queued for recovery」，没有 Apply | 记 TD-66 |

- **BACKIN-heldhead-del 冒烟**（r3 ×1，带追踪，`runs/r3-n-heldel`）：扣留期间退格 ×4 也**没有效果**，屏上仍是 `warmup bbb`，和撤销一样，所以这条路在 r3 上造不出来。r3d 上作守卫照跑。
- **旁查：回执什么时候不给 Apply**（`runs/pre-n-closehead`、`runs/r3-n-closehead`，只记不判）：
  - 起因：heldhead-del 冒烟里，关页重开后队头的 `aaa` 不在服务器、屏上、框里，也不在留住记录里，只有一条提示「A previous block edit is queued for recovery」，没有 Apply。r3 的 MERGE 里队头的 `g` 也是这样。
  - 单独核：打 `aaa`、保存扣住、关页、重开（CLOSEHEAD）。r3 的 plain 与 sealed 两种，在重开时和 20 秒后都有「A block edit is waiting for recovery … aaa」加 Apply，回执在 localStorage。修前 sealed 一样，回执在 sessionStorage（修前 plain 没有空闲保存，N/A）。
  - 所以简单的关页情形 r3 没问题。只有**同一块里另有留住记录在重开时落地**（MERGE 的 DUP，heldhead-del 落地的那条）时，回执只出 info 提示、不给 Apply。代码见 `useNoteCanvasDataAdapter.ts` 728–737 行：mountNonce 或 creationGeneration 对不上的回执只提示、不提供。
  - **加了第二次挂载**（Main_Designer 11-09）：20 秒后再整页打开一次，记队头字词在哪里。冒烟各 1 行（`runs/pre-n-rm`、`runs/r3-n-rm`）：
    - 修前 MERGE-close：`efg` 在重开时、20 秒后、第二次重开后都是**横幅加 Apply**。
    - r3：三个时刻都是**哪里都没有**，连回执里也没有了。我推断第一次重开时 DUP 落地的那次保存得到 2xx 后，回执被删了；这是推断，待 builder 确认。
  - 所以 r3 上队头的 `g` 实际丢了，而修前给 Apply。这一条比修前差，属于 N1 的同一幅图：r3 已经因 N1 挡放行。
  - **Main_Designer 11-09 裁：这是 ① 丢字。** builder 读码与我的推断一致：回执库一块只存一条，同块留住记录落地前写的回执顶掉了旧回执，2xx 之后又把自己的删了。
  - 修法（甲）已折进 r3d：落地前先查这一块有没有别的挂载留下的回执，有就不落地，记录留在框里，等那条回执被 Apply 或 Dismiss；HSC 进包，共 17 个文件。r3d 上 MERGE 与 heldhead-del 预期都读「横幅加 Apply，记录在框里」。
  - 根在修前的 adapter 728–737 行，归 A-25 ②a（Main_Designer 已写进 A-25 单）。
  - r3d 的红线（Main_Designer 裁）：重开、20 秒、再重开之后，队头字词仍「只在回执、不提供」或哪里都没有，就报红。a20n 的 MERGE、SELDEL 行已把这一条并进判定。
- **地址栏那一形（ADDR-noncanon-addr）真机到不了**：Chrome 里，有保存在途时，CDP 在同一文档内的地址栏一步是可扣住的，于是走的是和脚本 hash 一样的扣住路。Reviewer 说的「地址栏一步不可扣 → keepAndLeave → 记录冻结」那一形，CDP 构造不出来，由 N2 的单测兜。
- 证据：`runs/pre-n2`（第一版 MERGE/SELDEL 的 12 行是设置错误：修前没有空闲保存，队头起不来，改成点外面封口后在 `runs/pre-n3` 重跑）、`runs/r3-n2`。

## 六、LANDOTHER（A-25 的基线，只记）

| | 修前 | r3 |
|---|---|---|
| 普通块（plain） | 键能打出来 2/2，0 条「Heading changes could not」 | 2/2，0 条 |
| 标题块正文（heading） | 2/2 | 2/2 |
| 标题行本身（headline） | 1/1（另 1 行是设置错误：`# hb` 打成了 `#b`） | 2/2 |
| 失败提示条数 | 每行 2 | 每行 2，有 1 行 plain 是 5（记给 A-25） |

结果沿用到 r3d，r3d 上不必重跑（Main_Designer 11-08）。证据：`runs/pre-m-landother3`、`runs/r3-m-landother`。

## 七、没有在 r3 上跑的

- **9 对回归**和**第 10 对**（UNDOPAUSE 修前 ×20 对 r3 ×20）：Main_Designer 11-08 裁定都移到 r3d，在 r3 上不跑。
- 所以本报告里没有 UNDOPAUSE 间歇红的修前计数。

## 八、过程里我这边的问题（照实记）

- r3 链跑着的时候，我用 `sed -i` 改了链脚本第 2 行的注释，这是第二次在运行中改脚本。即刻按原字节写回（4116 字节），第 2 步开始时核过日志，没有误读。METHOD 记了「第二次 → 机械化」。
- 链起跑时没占锁位。Main_Designer 指出后，我另起一个持有进程占住 `.lock.2`，直到链结束。kit 的规则改成「每次探针跑都占一位」。
- a20n 第一版有三处测量错误，都在出数前修了。第二节、第五节提到的设置错误行都没有计入判语。
  1. Z 打在了接缝处（`abZcd`），被我自己的设置核对拦下，没有走到离开那一步。我曾据此说「接缝处不触发 N1」，这句已收回。
  2. 没有队头，合行自己发了出去。
  3. 修前没有空闲保存，队头起不来。
- r3 第一次跑 a20n 时，新建的账号目录在同一个后端上重复注册（409），探针全 401，没有出行，重跑用了已有的账号。

## 九、环境与证据

- 修前 5601 → 3601。r3 链 5604 → 3604（全新数据目录）。r3 的 a20n 跑在 5606 → 3605（与变异包共用的备用后端，server 代码相同），不碰链的 3604。变异包 5605 → 3605。
- 锁位：链占 `.lock.2`（22:26 到 23:50，持有进程）；S2 占 `.lock`；a20n 和 LANDOTHER 每次跑都占一位。CPU 一直低于 40%。
- 目录：`runs/`（每次跑的 rows.jsonl）、`gate/`（分析器输出）、`hashes/`（我的两份重建清单）、`scripts/`（`a20n_arms.mjs`、`a20m_judge.mjs`、`analyze-a20.mjs`、`check-a20m-oracle.mjs`；探针头含本机路径，不进仓）。
