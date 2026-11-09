# A-20 r3e 验收（Tester(1)，2026-11-09）

> 对象：包 ops `packages/a20-idle-save-r3e/`，主 JS `index-Dkbj0u5K.js`（sha256 `5cd1a787…fd18055`），基线 `04f6f822`，src 17 个文件，dist 63 个文件。
> 环境：本地后端（server = `04f6f822`），前端直接服务包里的 `dist/client`（5611 → 3611，全新库）。修前对照是 `04f6f822` 等价构建（5601 → 3601）。真 Chrome 走 CDP。没碰岛，没碰 Henry 的账号，没用真实模型，应用里的 Agent 0 条。
> **只测了 Chrome。** 判语标准同 r3d：列出每一条比修前差的臂；已裁项标「已裁，手册已知」。

## 〇、判语

**放行。** 没有一条臂比修前差。

- r3 链 190 行在 r3e 上 190/190，0 红；逐臂注记对 r3 判语链归一化后 0 行差异。
- a20m 全部：r3 链里的 BACKIN 与 LIST 37 行全绿；LANDOTHER 6/6 绿。
- a20n 全臂 52 行 + 第三形 3 行：只有 heldhead-undo 红 3/3（已裁 🅱，手册已知），其余全合 r3e 预期。
- P1（HEADCLOSE-applyslow，两形）与 P2（MENTER-close）在 r3e 上全绿，r3d 上的阳性对照是红的。
- 9 对回归：r3e 的红行都是修前同一对红行的子集，没有一条比修前差。mx2 与 acc13 的同名行两版逐行同形；acc10 两版终态同形，过程不同（见第五节）。第 1 对以 mx2 重跑（见第七节）。
- 第 10 对（UNDOPAUSE 修前 ×20 对 r3e ×20）：特征形状修前 0/20、r3e 0/20，没到停线（修前 0 且 r3e ≥3），只记数。

### 比修前差的臂

无。

### 已裁、手册已知（照记，不挡）

1. **BACKIN-heldhead-undo 红 3/3**（REPS=2 两行 + 第三形一行）：扣留期间按 Ctrl+Z 无效，屏上和服务器最后都是 `['warmup bbb','aaa']`。Main_Designer 11-09 裁 🅱（撤销在扣留期间无效），与 r3d 同因。修前两行都作废：一行因修前没有扣留造不出来，另一行在那之前就打字错位（`rmup/wa`），记 N/A。
2. **HEADCLOSE-putback（×1，读数）**：重开后把 bbb 手动放回第一行，它的保存得 200，aaa 的恢复项被挤掉，Apply 点不到，**aaa 丢**；bbb 留在服务器。修前同形（修前也是 aaa 没了、bbb 留）。已裁 A-25 ②a (iv)，手册已知。r3e 上点 `warmup` 行末会点进覆盖那一行的框，探针改为直接给这一行设焦点（行里 `putHow: focus`），同 r3d。
3. **MENTER-close 带 Apply 的那一项**：重开时有「A block edit is waiting for recovery abx cd」带 Apply。这是在途那次保存多余的回执（服务器已有 `abx`）。修前同样有。已裁 A-25 ②a (ii)。
4. **CLICKBACK-end（只记）**：r3e 框里是 `alphaZ`，记录 `"alpha" → "alphaZ"`，服务器 `['alpha beta']`；修前没有框、没有记录。TD-66 族。

### 单列读数：SHIFTENTER-typed-close（A-20b 的探针臂，在 r3e 上跑；不比修前差）

- 设置：服务器 `['abc','q']`，`q` 行末打 `r` 封口，这次保存到了服务器但回应扣 60 秒（在途）；`abc` 行末 Shift+Enter 再打 `d`，屏上 `['abc\nd','qr']`；关页，重开，12 秒后再读。各 ×1（第八节）。
- 修前：**LOST**。重开后服务器 `['abc','qr']`，`d` 和换行都丢；在途期间修前没有发出这次保存。
- r3e：**SPLIT**。重开时应用自己发出 `PUT 'abc|d|qr'`，服务器 `['abc','d','qr']`：`d` 保住了，但成了单独一段。正常保存同样的字（无在途，SHIFTENTER-idletyped）在 r3e 上是一个单元 `'abc\nd'`；r1 同，读数随 A-20b 报告留档；修前没跑。
- 屏上（只读测量，同一前端，画布缩放 108%，`runs-a20b-probe/b-geo-se/`）：
  - 两段时，`d` 的格子顶在 `abc` 的格子顶下 30.3 px，两格之间空 3.1 px，左边栏多一个块手柄。
  - 一个单元时，整格高 54.4 px，每行 27.2 px，`d` 在 `abc` 下 27.2 px，没有手柄。
  - 截图逐像素看，`d` 的字顶分别在 `abc` 下 31 px 和 27 px。
  - 合起来：行距多约 3 px，外加一个可见的块手柄。（我先报过「+5 px」，是把没乘缩放的 CSS 行高 25.1 和屏幕坐标相减，错了，Opus 复核查出，已向 Main_Designer 更正。）
- 主设计裁：修前不是 ONE，这条不进「比修前差」；r3e 记手册「已知」，A-20b r2 的乙（落地按记录来源分流，只有留字框来源的换行切段）修掉。只按 Shift+Enter、不再打字（SHIFTENTER-close）时，修前与 r3e 都是换行丢。

## 一、同源

- 包内 `sha256sum -c`：src 17/17 OK，dist 63/63 OK。
- 自建：`git archive 04f6f822`（client、shared、scripts、docs/generated、package.json）加包里 17 个文件，`npx vite build`。产物 63/63 与 `dist.sha256` 一致，主 JS 逐字节相同（`hashes/tester-rebuild-dist-r3e.sha256`）。
- 提示文案核对（`scripts/check-a20m-oracle.mjs`，判官 `scripts/a20m_judge.mjs`，输出 `gate/oracle-r3e.txt`）：LEFT_UNSAVED 与 SAVE_FAILURE 两条文案都在 `index-Dkbj0u5K.js` 里，与判官一致。
- 我封包前冻结的 `dist-r3e-preseal`（5610）与包的 dist 63/63 逐字节相同，多出的只有我自己的清单文件 `frozen.sha256`（`hashes/preseal-vs-package-r3e.txt`）。所以封包前那一轮（`runs/r3eps-n`，13 行，分析器 0 红，`gate/an-r3eps-n.txt`）的读数就是这份 JS 的读数。这 0 红里含 HEADCLOSE-putback 1 行：探针自己按臂规则记红，分析器按读数计，同〇的已裁第 2 条。

## 二、r3 链（全保）

- r3 链 190 行（r2 链 153 行 + a20m BACKIN 与 LIST 37 行），在 r3e 封包上 5611 → 3611 照跑（07:35 到 09:02，占一位，单浏览器）。
- **190/190 行，0 红，13 步的行数与 r3 逐步相同。** 分析器的逐臂注记与 r3 判语链做了 diff（id 与数字归一化后），**16 个标签全部 0 行差异**（`gate/r3e-*.txt`）：k 22 / late 8 / j 28 / k-toast 4 / flyk 8 / inapp 8 / d 20 / b 24 / a 8 / c 18 / c-closetab 1 / c-kill 1 / kill-close-0 1 / kill-proc-0 1 / offkill-0 1 / m 37。
- OFFKILL 的 probe 自己记 ok:false，与修前、r1、r2、r3、r3d 相同，是参照臂，分析器读 0 红。

## 三、a20m LANDOTHER

- r3e REPS=2：plain / heading / headline 各 2/2，共 6/6 绿：各键都显示，0 条「Heading changes could not」，失败提示 2 条，之后都落地（`runs/r3e-m-landother`）。
- 修前（`runs/pre-m-landother3`）：5/5 绿，另 1 行 headline 设置错（目标行没找到），不计。

## 四、a20n 全臂（r3e 对修前）

r3e：`runs/r3e-n`（REPS=2，TRACE=1，52 行）与 `runs/r3e-n-third`（heldback / heldhead / heldhead-undo 各 ×1）。修前：`runs/pre3e-n`（REPS=2，TRACE=1，52 行，其中 10 行设置 N/A：9 行是修前没有空闲保存或扣留可造，1 行是打字错位 `rmup/wa`）。r3e 上 0 行设置错。

| 臂 | r3e | 修前 |
|---|---|---|
| MERGE（关页 / 地址栏 / 后退，各 ×2） | 6/6 BOX：`abcdZ` 在框；队头的 `efg` 重开时在横幅里（这一刻探针不分有无 Apply），20 秒后与再重开都是横幅带 Apply | 6/6 LOST：Z 丢，无框 |
| SELDEL（同三形，各 ×2） | 6/6 BOX：`adZ` 在框，`efg` 同上 | 6/6 LOST |
| ADDR-noncanon 七形（slash、anchor、hash、addr、`#/Notes/A`、地址栏 `#/Notes/A`、`#/NOTES/A/`，各 ×2） | 14/14 绿：人留在 A，0 条 LEFT_UNSAVED，0 条留住记录；后五形第二次离开被扣（HELD-PROCEED），`backin words more` 恰 1 份 | 14/14 红：STUCK，后五形 `backin words more` 丢 |
| BACKIN-heldback（×3） | 3/3：「Please retry」恰 1 条（+1616、+1623、+1624 毫秒） | N/A（修前不扣） |
| BACKIN-fail-heldhead（×3） | 3/3：后退后留住记录最多 0 条，第二次离开 REFUSED | N/A |
| BACKIN-heldhead-undo（×3） | 0/3，已裁 🅱（见〇） | N/A |
| BACKIN-heldhead-del（×2） | 造不出来（扣留期间删除无效），照记 | N/A |
| CLOSEHEAD plain / sealed（各 ×2） | 记录：aaa 在重开和 20 秒后都是横幅带 Apply，服务器 `['warmup','']` | plain N/A；sealed 同形 |
| HEADCLOSE plain（×2）/ apply / dismiss（各 ×1） | 绿：重开时 aaa 横幅带 Apply，bbb 在框（记录 `"warmup" → "warmup bbb"`）；Apply 后服务器 `['warmup bbb','aaa']`；Dismiss 后 `['warmup bbb','']` | 红：bbb 哪里都没有 |
| HEADCLOSE-putback（×1） | 读数，同修前（见〇） | 同 |
| **HEADCLOSE-applyslow（P1），请求形 ×2** | 绿：Apply 的 PUT 扣约 2.5 秒，期间 bbb 不落；Apply 得 200（服务器 `['warmup','aaa']`），约 1.4 秒后 bbb 落成 `['warmup bbb','aaa']`，aaa ×1；无 409，无「Failed to save block」；终读在 Apply 回应后 +13 秒 | 红：aaa 在，bbb 丢 |
| **HEADCLOSE-applyslow（P1），回应形 ×2** | 绿：Apply 先到服务器、回应扣 2.5 秒，其余同上 | 红：同上 |
| **MENTER-close（P2），×2** | KEPT：服务器 `['abx','cd']` 两个时刻都不变；框里 `abxcd` 和 `Z`，12 秒内都没有自己落地；没有改写 `cd` | LOST：服务器同，Z 丢，无框 |
| N6B-switch（×1） | 绿：A → B → A，A 的字一个都没到 B；回到 A 后 `['warmup bbb','aaa']` 各 1 份，无恢复项 | 红：bbb 丢 |
| CLICKBACK-end（×2） | 只记（见〇） | 只记 |

applyslow 的中间点（只记不判）：两形的 Apply 回应时刻服务器是 `['warmup','aaa']`，+3.5 秒已是终态 `['warmup bbb','aaa']`。四行都是「Apply 在途期间框里的字没进第一行」（探针的窗口没打中，记 NO）。

## 五、9 对回归（修前对 r3e，同时跑，两浏览器）

| 对 | 修前红 | r3e 红 | 说明 |
|---|---|---|---|
| 1 mx2（A-18 主矩阵 K、W、H、N、R、V、D、L、G） | 25/226 | 19/226 | r3e 的 19 行全在修前的红里，DOM 与服务器文字两版逐字相同：W 的 ime* ×16 与 G 的 imeLines ×3，都是 IME 探针留下的拼音 `di`（例 `['di第一段甲乙丙','第二行']`）。修前多 6 行：durableSentence ×2、insert ×2、pause600、rhythm23。第一次跑的 r3e 侧在登录这步就死了，是我的设置疏漏（见第七节），整对以 `mx2` 重跑；第一次的修前侧 19/226，与 r3e 这 19 行同名 |
| 2 acc1（A1、H、G-draftUndo） | 0/16 | 0/16 | |
| 3 acc10（HL、TWO） | 3/6 | 3/6 | 两版都是 HL-saveNotSentThenClose ×3。终态同形：服务器留 `bo` 或 `bod`，`body` 丢；同名行的 `bo` / `bod` 两版不逐行一致，合起来都是 `bo` ×2、`bod` ×1。过程不同：修前离开前还没发出含 `body` 的保存（约 9 秒后才发、被扣）；r3e 的空闲保存约 2.7 秒就发出、被扣住，再关页 |
| 4 y（Y0、Y1） | 0/9 | 0/9 | |
| 5 two2（TWO2） | 0/3 | 0/3 | |
| 6 acc18（STEAL2、LEGACY、COPYPASTE） | 0/6 | 0/6 | |
| 7 acc13 | 5/10 | 2/10 | 修前：N-a1-failedSaveThenMore ×2、N-a1c-failedSaveNoMore ×1、N-b2-headingAboveLineSameWord ×2；r3e 只有 N-b2 ×2，两版同形（重开后服务器 `['warmup','see the note']`、`['[heading_1]nointro']`） |
| 8 J（REPS=2） | 0/4 | 0/4 | |
| 9 retry（HOLD=70000） | 0/1 | 0/1 | |

## 六、第 10 对（UNDOPAUSE 修前 ×20 对 r3e ×20，交替，单浏览器）

- 特征（第二次撤销删掉整块，跳过退回 `['warmup']`）：修前 0/20，r3e 0/20。
- 与修前众数形状不同的：修前 2/20（最后一步是 `['wa']`，不是 `['w']`），r3e 0/20。
- 每行 PUT 数：修前 4，r3e 5（r3e 多一次空闲保存）。
- 结论：没到停线（修前 0 且 r3e ≥3），照令只记数（`undopause-tally-r3e.txt`）。

## 七、过程里我这边的问题（照实记）

- **配对账号没预置（第 1 对作废重跑）**：配对用的账号目录 `cred-3611r` 里没放账号文件，探针退回共用的默认测试邮箱。这个邮箱在 3611 上已被链账号注册过，于是注册 409，留下一个没注册成的密码。第 1 对（mx）的 r3e 侧注册 409 之后，第一个要登录态的请求（建笔记时写页框）得 401，0 行；修前侧照跑。r3 那轮的配对账号用的是独立邮箱，这轮漏了。10:10 改成独立测试邮箱（注册 201、登录 200），第 2 对 10:31:58 才起跑，第 2–9 对都在修好之后（`pairs/seed-check.txt`）。第 1 对整对以 `mx2` 重跑（行文件只追加，换标签；换端口）。以后每轮配对前先预置独立账号。
- 9 对和第 10 对起初排在槽 2：08:12 起等槽（`pairs/run-par-r3e.out` 第一行），09:49:31 拿到（`pairs/run-reg-r3e-par.log`）。两个槽在那之前被谁占着，我没留记录。
- 链跑完后，序列里的修前 a20n（第 4 步）跳过了，因为 `pre3e-n` 已经跑完：日志与行文件时间 08:10:35（`runs/pre3e-n/file-times.txt`、`runs/pre3e-n/probe.log`）。它是 52 行全臂，REPS=2；N6B 行带存储追踪，说明 TRACE=1 开着。那次的启动命令行没留档。
- 分析器给 `case` 三形的地址标签一度写成 `#/notes/A/`，已改为逐形标签。只是显示，不影响判定。

## 八、A-20b 的探针臂在 r3e 上的读数（不进本判定，作 A-20b 的阳性对照与修前参照）

各 ×1，只有 SHIFTENTER-close 在 r3e 上有两行（两次都 LOST）。MULTIPASTE、LISTPASTE 在 r3e 上另有 1 行第一版探针的设置错（我读错了屏上行的格式），作废重跑。r3e 用封包前冻结件 5610（与封包 dist 逐字节相同），修前 5601。臂的定义见 A-20b 验收单，探针在 `scripts/a20b-probe/`。

| 臂 | 修前 | r3e |
|---|---|---|
| ADDR-noncanon `#notes/A`、`#notes/A/`、地址栏 `#notes/A` | — | 三形都红：放行 1 次，扣留期间 1 条留住记录，第二次离开 STUCK（Q4 形） |
| MULTIPASTE-close（`abc\|def` 粘 `XQ⏎YQ`，头在途，关页） | — | XQ 无处；YQ、def 在框（记录 `"" → "YQ"`、`"" → "def"`）；关页时屏上 `['abcXQ','YQ','def','qr']` |
| LISTPASTE-close（`- item` 粘进空行，头在途，关页） | — | item 无处，行数不变 |
| SHIFTENTER-close（`abc` 行末 Shift+Enter，不再打字） | LOST | LOST（无记录、无框） |
| SHIFTENTER-typed-close | LOST | SPLIT（见〇单列） |
| SHIFTENTER-idle（对照，正常保存） | `'abc\n'` 一个单元 | `'abc\n'` 一个单元 |
| SHIFTENTER-idletyped（对照，正常保存） | 未跑 | `'abc\nd'` 一个单元 |
| SURROGATE-paste-close（`abc😀def`，光标在 abc 后，粘 `😁⏎YQ`） | — | 😁 无处；YQ、`😀def` 在框；没有坏码元 |
| WINDOWENTER-land（留字框里两行 `kept⏎body` 落地） | BOX：在探针的等待窗内框都没落地（回来后先等 1.5 秒，再每 250 毫秒查一次、最多 60 次，再等 3 秒），字在框和记录里 | SPLIT 绿：服务器 `[['warmup'],['[heading_1]kept','body']]`，各 1 次 |

粘贴的做法：在聚焦行上派发 `ClipboardEvent('paste')`，带 `DataTransfer`（text/plain）。应用自己的粘贴处理接手（`prevented: true`），不碰系统剪贴板。修前这一列只跑了 SHIFTENTER 与 WINDOWENTER；其余几臂的修前读数在 A-20b 验收里补（修前的 ALLOWEXTRA 跑法）。

## 九、环境与留档

- r3e：5611 → 3611（全新库 `data-r3e`），链 / a20m / a20n 用 `cred-3611`，配对用 `cred-3611r`（独立测试邮箱）。修前：5601 → 3601。封包前冻结件：5610 → 3605。
- 锁：每一步都占一个槽位（`heavy-job.lock` / `.lock.2`），取放在同一条命令里；浏览器合计 ≤3；抽查过一次 CPU，6%。报告复核：3 个 Opus 读者对着原始行反驳本报告（只读，占一位）。查出一条错数（行距，已改），其余 14 条是证据没留档或措辞偏宽，均已补档或改写，没有一条改动判定。
- 留档：`runs/`（链 16 个标签、a20m、a20n、修前 a20n、封包前 `r3eps-n`、第 10 对 40 行）、`runs-a20b-probe/`（第八节各臂的行，含两张测行距的截图）、`pairs/`（9 对与 mx2 的 rows.jsonl 与日志，不含截图）、`gate/`（链的逐臂注记、a20n / a20m / r3eps-n 的分析器输出、文案核对输出）、`hashes/`（自建清单、冻结件对包的比对）、`scripts/`（本轮正式跑用的 `a20n_arms.mjs`、`analyze-a20.mjs`、`a20m_judge.mjs`，以及 `check-a20m-oracle.mjs`、`undopause-tally.mjs`、运行脚本、`a20b-probe/`）。本地路径已换成占位符。

## 十、第 23 轮部署后岛上复核（2026-11-09）

**结论：岛上就是验过的那一版，代表臂 7/7 全过**（报给 Main_Designer 的六条，加 N6B）。 证据在 `postdeploy-23/`。

- **部署前 ack**（`29b1d456`）：
  - 包里 17 个文件与提交 17/17 逐字节相同。
  - `04f6f822..29b1d456` 之间，代码区只多了根目录工具脚本 `scripts/pre-harvest-scan.mjs`，客户端构建不引用它。
  - `docs/generated` 无改动。
- **对账**：经隧道 GET 岛上 63 个客户端文件，63/63 与包的 `dist/client` 逐字节一致，主 JS `index-Dkbj0u5K.js`（`island-hash-post23.txt`）。部署前同一脚本对第二十二轮是 61/63，只差主 JS 和 `index.html`，作对照（`island-hash-pre23.txt`）。
- **代表臂**：对岛上前端，只登录我的岛上测试账号，没注册新账号，没碰 Henry 的账号与数据。扣请求、拖回应都在测试浏览器里做，岛上只看到普通请求，或者根本没有请求。各 ×1，读数与 r3e 本地一致。

| 臂 | 岛上结果 |
|---|---|
| IDLE（空闲保存） | 3.5 秒时字已在服务器 |
| K1-close（字在途时关页） | 重开后 `['warmup','note alpha']` |
| HEADCLOSE-plain | aaa 横幅带 Apply，bbb 在框（记录 `"warmup" → "warmup bbb"`），20 秒后再重开同 |
| HEADCLOSE-applyslow（请求形，P1） | Apply 的 PUT 扣约 2.5 秒，得 200；之后 bbb 落成 `['warmup bbb','aaa']`，各 1 次；无 409、无「Failed to save block」 |
| MENTER-close（P2） | KEPT：服务器 `['abx','cd']` 不变，框里 `abxcd` 和 `Z` |
| ADDR-noncanon-case（`#/Notes/<id>`） | 人留在 A，放行 0 次，第二次离开被扣，`backin words more` 恰 1 份 |
| N6B-switch | A → B → A，A 的字没到 B；A 上 `['warmup bbb','aaa']` 各 1 份 |

- **ADDR-noncanon-case 前两次是探针的设置错，不是应用的错**（`post23-n`、`post23-n2`）。
  - 探针在课程页先量好笔记卡片的位置，等 300 毫秒再点。岛上课程页的各节加载得晚，卡片在这期间被往下推了约 68 px，于是那一下点在「Notes」节标题上，笔记没打开。
  - 第三次加了调试，留下截图和点中的元素（`post23-n3/`，`enter-debug.txt`）。
  - 改成点击前再量一次之后（`post23-n4/`，点在 y 451.5，原先是 383），笔记正常打开，臂全绿。
  - 本地环境的课程页加载快，没有碰到过这个问题。
- 这几轮在我的测试账号里新建了几个「实测·A20m post23-*」项目和其中的测试笔记，留着没删。
