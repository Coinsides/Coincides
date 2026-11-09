# 阶段一封版回归（Tester(1)，2026-11-10）

> 对象：岛上 `b734197e`（第 25 轮，A-25）。主 JS `index-4nEsyJNA.js`（sha256 `f32a046c…72c5ab`），63 文件清单 sha256 `50fd51b1…4f11`（`se-build.sha256`）。
> 订单：`docs/agent-ops/handoffs/2026-11-10-stage-one-seal-regression-order.md`（87266854，开跑后两件 cb09363a）。基线 = 岛上这版自己；「⊆ 底」规则在本单不适用。
> 环境：本地副本。前端 = A-25 包 `dist/client`（5615，与岛上 63/63 同）；后端 = `a19acc/post` 树（server / shared 与 `b734197e` 逐文件同），新库 3615，只绑本机。各条线各用一个预注册的本地测试账号。底 = A-20b r2（5612 → 3612），只给新臂和旧矩阵做对照。岛上的几件经隧道做，只用我的岛上测试账号，扣住只在测试浏览器里做。
> **只测了 Chrome。输入法是 CDP 模拟的**（`Input.imeSetComposition` + `Input.insertText`），不是真输入法。
> 判语口径（订单裁 3）：绿 = 手册已知形 + A-25 侧读数 + 既有裁定；这三者之外的红，封版前必须带一个 TD 或手册指针，否则判语里单列为新发现。

## 〇、判语

**可以封版（快照）。** 判语里单列新发现 2 条，都不挡封版：
1. **TD-85**：既有形，A-20b r2 底同形，Main_Designer 已改标「既有」，候 Henry 排修。
2. **旧矩阵里 A-18 签名的低率残留**：没有 TD 行，候 Main_Designer 给指针。
   - fine@xxx：回车后 25 ms 打的那行不见，屏上与服务器都没有。构建 3/126、底 2/63。
   - hash@300：光标跳，构建 3/18、底 1/15。
   - 这两种形状正是 A-18 订单 :12–13 记的修前签名（根因 :49）。A-18 当时修后只验了 0/3（A-19/20 订单 :484，机理未查明）。
   - 「跳 1 位」那一形两版都有，所以不是 A-25 新添的机制；A-25 是否抬高了发生率、跳 0 那一形是否 A-25 引入，这些计数分不出（第五节）。

其余各条红都有指针。

- **封版态**（D6 / D7）：
  - `b734197e` 同源重建 63/63 与岛上清单相同。
  - 经隧道取岛上服务文件：63/63 相同，主 JS `index-4nEsyJNA.js`。
  - 岛上健康：health 200；测试账号登录 200、写 201、读 200，题名一致。
- **新发现（单列）**：**TD-85**（🅰 候选，既有）。Apply 在途时在同一块打字，Apply 写进去的字被下一次打字保存静默盖掉，盖之前已经弹过「Recovered block edit applied」。
  - 构建 4/4 红，底 4/4 同形。
  - 反序 typefirst：A-25 修好了（构建 3/3 绿，底 3/3 红）。
  - 详见第四节。
- **TD-82 / TD-83 改类**（Main_Designer 已改 TD 行）：
  - **TD-82 不是丢字**：正文在重开后的恢复项里，点 Apply 落回。岛上 1/1，这一行达到了臂态；本地那行人速没到臂态，只作读数，Apply 同样带回了正文。臂规则写于回执库之前，不数恢复项。
  - **TD-83**：字也在恢复项里（`noteintro`），丢的是交接窗口里的那个回车。屏上立即可见，归 TD-77 族。
  - 详见第三节。
- **旧矩阵 hash 每遍 3/78（r2.3c 0/78）**：即上面的新发现 2。fine 两版都有；hash@300 跳 1 位两版都有，跳 0 只在构建上见过 1 次（第五节）。
- 其余各组：

| 组 | 本次 | 读法 |
|---|---|---|
| k25 正本 | 53 行，0 红，0 准备失败 | IME-new 8/8、IME-mid 8/8、SAVEFAIL 8/8、ONEFAIL 4/4、LANDFAIL 8/8、LANDFAIL-other 3/3、CHAIN 10/10、H1 2/2、H2 2/2 |
| D 出口 | 16/16 绿 | 同 A-25 |
| r3 链 15 标签 + a20m + LANDOTHER | 100 行，0 红 | 1 行准备失败（BACKIN-fail-fast-1，光标跳），补跑 2/2 绿 |
| a20n | 74 + 第三形 3 行 | 红只有 BACKIN-heldhead-undo 2 + 1，已裁 🅱，同 A-25。HEADCLOSE-putback 改成判的闸后 1/1 绿 |
| 链对 A-25 链 | 逐标签归一化 diff | 差异三类：A-25 侧当时的准备失败今天跑起来了且绿；两轮对一轮的行数；今天侧新增 1 行准备失败（已补跑绿）。0 条回归 |
| 第 10 对 ×20 | 前缀不变量 0/20 破 | 签名形 0/20。末步 `['wa']` 2/20，TD-63，同 A-25 |
| 9 对 + r2.3c 浏览器链（19 标签） | 红全部带指针 | 第三节 |
| 旧矩阵 | win 28/0、a24 32/0、hash 见第五节 | |
| A-19 代表组 | 图片 5/5、坏文件 3、血缘 PDF / docx、删除残留 0 | 同 A-19 读数 |
| 客户端全量 | 259 文件，2853/2853，exit 0 | 本次没出 TD-74 的三条 teardown 报错 |
| 服务端全量（`test:v2`，90 文件） | 不绿 3 处 | IPC 偶发 2 条，重试 PASS；MinerU K-4 → TD-45（单跑也红 2/2）。:74–102 功能群 0 红，27 条接口往返照裁砍掉 |
| 「从界面保存一次」冒烟 | 9 条里 8 绿、图片未测；订单点名的另三群见第六节 | 第六节 |
| 新臂 | C-convert 绿；IME 守卫绿；APPLYTYPE 见第四节 | 第四节 |
| void 臂分类 | GEO、BAN 修好后测绿；acc6-Z 不再 void；STEAL / BOXTYPE2 / BOXTYPE3、two2 未覆盖 | 第七节 |

- **未覆盖**：
  - STEAL ×3、BOXTYPE2 ×3、BOXTYPE3 ×3：准备步骤修不成，记未覆盖；
  - two2：按裁 4 记未覆盖，由 acc10 TWO 顶 ③ 类；分析器现报「NOT TESTED 1」；
  - 冒烟：SM-image 未测；Source 原页的写路径、Agent 补丁接受（要真模型）没写臂（第六节）；
  - 旧矩阵 fine / hash 两臂没看恢复项（harness 只读屏与服务器）；
  - 真输入法、其他浏览器、触屏、窄屏、打印等：P2 清单交 Henry（`p2-list.md`）。
- **自查**：
  - 岛上人速那批，我第一次给 Main_Designer 的读数说「正文丢、无处留」，是错的。我的读数器没看恢复项，看截图才发现，已更正（第三节）。
  - 报告交出前经 Opus 四路反驳复核，查出的错数、缺证、缺项都已改（第十一节）。

## 一、同源与封版态

- **同源**：`tree-se` = `git archive b734197e`（client / shared / server / scripts / docs/generated / package.json）。`vite build` 63 个文件，逐个 sha256 与岛上清单相同（`logs/se-build-vs-island.diff` 为空）。
- **封版态核对**：经隧道 GET 岛上服务的 63 个文件，与上面的同源构建比：63 同、0 不同、0 没服务到。主 JS `index-4nEsyJNA.js`，css `index-sq1LDYsi.css`（`logs/se-island.log`）。
- **岛上健康**（`scripts/island-health.mjs`，只用我的测试账号）：health 200 / login 200 / 写一条笔记 201 / 读回 200，题名一致。那条 `seal-health <时间>` 笔记留在我测试账号的测试课程里。

## 二、各组结果

### 1. k25 正本 + D 出口

- k25：IME-new、IME-mid 各 8 行；SAVEFAIL / LANDFAIL / ONEFAIL / CHAIN / H1 / H2 各 2 轮；LANDFAIL-other 三形各 1 轮。共 53 行全绿，0 准备失败（`gate/an-se-k25.txt`）。IME 是模拟的。
- D：16 个出口行全绿。同一个探针里还跑了新臂 C-convert ×2、APPLYTYPE ×2（第四节）。

### 2. r3 链 + a20m + LANDOTHER + a20n

- 分析器（kit 已改：准备失败单独计数，void 不算绿）：15 个链标签加 m、m-landother 共 100 行，0 红。
- 准备失败 1 行：BACKIN-fail-fast-1，准备时得 `["rmup","wa"]`，光标跳，TD-77 家族。补跑 `se-m-fill` 2/2 绿。
- a20n 74 行 + 第三形 3 行：红只有 BACKIN-heldhead-undo（2 + 1），A-25 与 A-20b r2 同形，已裁 🅱。
- **HEADCLOSE-putback 从读数改成判的闸**（kit「1 条」改注，下面第八节）：重开后 put-back 保存得 200，aaa 项仍带 Apply；Apply 得 409；+3 s、+13 s 都只剩一条单数标题的冲突项。今天 1/1 绿。闸的阳性对照：A-25 那轮 1/1 绿，A-20b r2 底 0/1。
- **对 A-25 链逐标签归一化 diff**（`gate/diff-*.txt`，同一个分析器、宽注记）：
  - k、d、m、m-landother 有差，其余 15 个标签 0 差。
  - 差的是三类：
    - A-25 侧当时的准备失败今天跑起来了，且绿：
      - m 的 sealed ×2 / refail ×2 / idlefirst ×5 / ctlfail ×2（A-25 侧共 11 行）；
      - k 的 K1-paste500；
      - LANDOTHER-plain。
    - A-25 跑两轮、今天跑一轮造成的行数差（d 的 SWITCH 少一行）。
    - 今天侧新增准备失败 1 行：BACKIN-fail-fast-1（A-25 侧 5/5 绿），补跑 `se-m-fill` 2/2 绿。
  - 0 条回归。

### 3. 第 10 对（UNDOPAUSE）×20

- 闸按不变量（三次 Ctrl+Z 后 warmup 块是 `warmup` 的前缀）：0/20 破，闸绿。
- 签名形 0/20。「任一步形状 ≠ 底」2/20，是末步 `['wa']`，TD-63，与 A-25 那轮同（`logs/se-par2.log`）。

### 4. 客户端全量、服务端全量

- **客户端**：在 `b734197e` 的副本树里跑（不在共享树），`vitest --pool=forks maxForks=3`。259 文件，2853/2853，exit 0，369.5 s。A-25 收尾时 builder 那次是 exit 1（TD-74 三条 teardown 报错），本次没出。
- **服务端**：`test:v2` 的 90 个文件，`--test-concurrency=3`。仓里此前没有 Tester 跑过服务端全量。
  - 第一次 exit 1，# fail 24：环境缺件 21 + IPC 偶发 3。
    - `tool-face-manifest.json` 没生成：15；
    - `.eval-runs` 未入库：1；
    - `_external_tools/mineru` 未入库：4；
    - `npm_execpath` 未设：1；
    - IPC 偶发：3（v2MaterialLibrary / v2RelationLifecycleClosure / v2Relations），重试 PASS。
  - 补齐后第二次 exit 1，不绿的 3 处（`logs/server-full-2-summary.txt`）：
    - `v2CanvasPersistenceCutover`、`v2ContentGroups` 两个文件「Unable to deserialize cloned data」，重试 PASS（IPC 偶发）；
    - `v2SourceMineruWiring` 的 K-4：「native text completed while MinerU still held its slot」→ **TD-45**（载荷敏感测试族，K-4 点名在内）。单独跑两次也都红（5 条里 K-4 一条红）：一次另一个锁位在跑浏览器；一次两个锁位都空，开跑前读到 CPU 约 10%。所以 TD-45 写的「单跑绿」在这台机器、这棵树上不成立。指针仍是 TD-45（K-4 点名在内）；它属 Source / MinerU，不在阶段一的写字路径上。是否改 TD-45 的措辞，请 Main_Designer 定（`logs/server-mineru-alone.txt`、`logs/server-mineru-idle.txt`，两次的条件在 `logs/server-mineru-conditions.txt`）。
  - **:74–102 的功能群（块 metadata / placements / 标签 / 标题）0 红** → 27 条接口往返照裁 1 砍掉，不补。
  - 失败块摘录在 `logs/server-full*-failures.txt`。

### 5. A-19 代表组

- 图片 5 件（横、EXIF 6 的 jpeg、带 alpha 的 webp、长图、超宽图）：都在纸上出图，比例对，原图在，无横向溢出。
- 坏文件 3 件（零宽 png、无 SOF 的 jpeg、未知 webp）：物化成功，页生成失败，屏上「Pages that could not be generated: 1 / Try again」。与 A-19 同。
- 血缘：PDF 落 Pages、12 个页码签、跳 3 / 7 / 11 精确。docx 落 Pages、0 个签。A-19 对 docx 的判据就是「落 Pages + 签数同修前」，探针原始 `ok=false` 是它对 docx 一向打的。
- 删除后残留：数据库各表 0 行，两份 blob 404。

## 三、红行与指针

| 臂 | 本次 | 指针 |
|---|---|---|
| a20n BACKIN-heldhead-undo | 2 + 1 | 已裁 🅱（同 A-25） |
| acc10 HL-saveNotSentThenClose ×3 | 旧规则红 → 新规则绿 | **TD-82（已改类）**，见下 |
| acc11 HL2-afterFirstStructure ×3 | 旧规则红 → 新规则绿 | 同 TD-82（Main_Designer 裁 (e)） |
| acc13 N-b2-headingAboveLineSameWord ×2 | 字在恢复项，回车丢 | **TD-83（已改类，TD-77 族）**，见下 |
| acc18 BOXTYPE-typeInBox ×3 | 52 个字母进光标处，丢 0、重 0 | 判据太死，11-05 订单 :2075「是测试判据，不是产品问题」；r2.3c 报告 :670 |
| acc1 F-sameId-0、I-wrongBlock-0 | 与 r2.3c 同形 | r2.3c 报告 :676（场景自带判据的标红，按三类分别是正确和留住） |
| acc4 RE-beta ×2、RE-alpha-0 | 与 r2.3c 同形 | r2.3c 报告 :682（标题没生效、字在原位） |
| 服务端 MinerU K-4 | 1 | TD-45 |
| 旧矩阵 fine@xxx（`第二行` 不见） | 构建 3/126，底 2/63 | **新发现 2（单列）**：A-18 修前签名残留（A-18 订单 :12–13、:49；A-19/20 订单 :484）；**无 TD 行**，候 Main_Designer 给指针 |
| 旧矩阵 hash@300（光标跳） | 跳 1 位：构建 2/18、底 1/15；跳 0：构建 1/18、底 0/15 | 同上，新发现 2；形状属 TD-77 家族 |
| 新臂 APPLYTYPE-applyfirst | 构建 4/4 | **TD-85（新发现，单列，既有）** |
| 第 10 对末步 `['wa']` | 2/20 | TD-63 |

### TD-82 / TD-83：从「丢字」改类（Main_Designer 裁 (d)、(e)）

- **经过**：
  - 订单把 HL ×3、N-b2 ×2 立成 TD-82 / 83（「正文丢」，🅰 候选）。
  - 我先在岛上用探针原速各跑一次：全绿。但岛上那几行在离开时，字还都在交接前的缓冲里（有留字记录），本地红行则已交接完。所以不是同一个臂态。
  - Main_Designer 收回「岛上绿 → 不作召回依据」，准人速复测。
  - 人速复测（250–450 ms 一键；每行都核过「单元交接 200 落在打字首末键之间」，没到这个状态的行作废）：岛上 HL ×3、N-b2 ×2 全部达到臂态，按旧规则全红。
  - 但看重开截图：5 行的字都在「A block edit is waiting for recovery」恢复项里，带 Apply（HL 3 行是 `bodyline`，N-b2 2 行是 `noteintro`；截图 5 张在 `shots/isl-hum_*`）。这一批的行里没有记恢复项（读恢复项是之后才加的），所以重读器对 `pairs/isl-hum` 报 NOWHERE，那是缺读数，不是红。
  - 旧规则只看服务器、留字框、缓冲、`coincides:unplaced` 记录四处，**不看 A-20 以后的回执库 / 恢复项**。
  - 我第一次报的「正文丢、无处留」是错的，已向 Main_Designer 更正。
  - 本地也按人速跑了（`pairs/se-hum`，加 Apply 那一轮 `se-hum-apply`）：
    - HL 7/7 作废：交接 200 都落在正文首键之前，人速下本地到不了这个臂态；
    - N-b2 3/3 达到臂态，旧规则红，服务器 `[heading_1]nintro`，恢复项给 `noteintro`。
- **HL（TD-82）的操作序列**：新笔记，`warmup` 回车等 2.5 s → `# head` 回车 → 正文 `body` → 带正文的那次 text-save 在请求阶段扣住 → 约 150 ms 后整页跳到别篇（被扣请求死）→ 12 s 后重开。
- **HL 三处现在各有什么**：
  - 服务器：`[heading_1]head` + 交接后发出的半截。达到臂态的行是 `bo` / `bod` / `b`；本地人速作废行是空。
  - 留字框：无。
  - 恢复项：`body`（人速臂 `bodyline`），带 Apply / Dismiss。
- **HL 点 Apply**（裁 (d)）：服务器成 `[heading_1]head` + `bodyline`，恢复项清零，提示「Recovered block edit applied」，无重复、不多一行。
  - 岛上 1/1：这一行达到臂态，`bo` → `bodyline`。
  - 本地那一行人速没到臂态（作废，服务器正文块原为空）；Apply 同样带回 `bodyline`，只作读数。
  - → 按预登读法结清：产品行为 = 手册「关页」已知形（已发出、未确认的字走恢复横幅），**验收臂规则过时**。
- **新规则重读**（裁 (e)，加第四处「恢复项带 Apply 提供」；本地重跑原臂，重开时记恢复项：`pairs/se-acc10i`、`se-acc11i`）：HL ×3、HL2 ×3 由旧规则红变新规则绿。旧规则结果留在行里作读数。
- **N-b2（TD-83）的操作序列**：两行 `see the note` / `intro` → 光标放到 `intro` 行首 → `# note` 回车 → 扣住带 `[heading_1]note` 的那次保存 → 关页 → 重开。
- **N-b2 三处**：
  - 服务器：`[heading_1]nointro` / `notintro`；本地人速是 `nintro`；
  - 留字框：无；
  - 恢复项：`noteintro`，带 Apply。
- **N-b2 离开前的屏**：
  - 编辑器那一行已经是 `noteintro`，被扣的那次保存也是 `[heading_1]noteintro`。
  - 同时获焦的输入缓冲里是 `intro`、光标在 0，这是回车之后的形状。
  - 人此刻看到的是哪一个，没有离开前的截图钉住。
- **N-b2 点 Apply**：带回一行标题 `noteintro`（本地、岛上各 1/1；`se-hum-apply` / `isl-hum-apply` 两行的 blocks 是 Apply 之后读的）。
- **N-b2 结论**：字在，丢的是交接窗口里的回车；编辑器里那一行立即就是 `noteintro`，手补一个回车即可。Main_Designer 归 TD-77 族；这是形读，不是读码。
- **从哪一版起红**（订单要「r3e 之前有没有数据」）：
  - HL 在 r3e 之前有数据：岛上后端跑的轮次（11-07 r2 / r22 / r23c / post21）全绿；本地后端跑的轮次（11-07 pre / frozen / r1post，以及修前 `04f6f822`）全红。这些行都没读恢复项。
  - A-20 以后各构建上，「r3e 起每轮两侧红」是**规则不数恢复项**，不是丢字。
  - 修前 `04f6f822`（无回执库）那一侧可能是真丢，未分辨。
  - N-b2：岛上轮次绿，11-09 以前没有本地数据。
- **TD-84 的教训**：被「⊆ 底」放过的红，若当时追一个指针，指针会是「臂规则过时」，四轮前就能发现。METHOD 第六节的 TD-82 / 83 句已按改类更新（本单随交）。

## 四、新臂（订单裁 5；红先停报，已报、已裁）

### C-convert（模板转换；只测「别次条目仍在」）

- 闸 = Main_Designer 裁的四条：
  - 别次条目仍在；
  - 它的 Apply 项仍给；
  - 本块没有新条目；
  - 转换落服务器。
- 构建：code、formula 各 1 轮。这两行存的是旧闸（含 toast）下的 `ok=false`，按裁定的四条重读为 2/2 绿。复跑两次（扣住转换请求并记屏 / 不扣）按新闸 4/4 绿。
- **底对照**：A-20b r2 2/2 红，方向「转换前就丢了（一块一条，被顶替）」。阳性对照成立：构建保别次条目，底不保，臂能分两版。
- **读数**（不判）：
  - 「Converted to Code / Formula」提示 0/6 出现，扣不扣都一样。转换 200 后 29–51 ms 屏上已是 code / formula 块，3 s 内稳定；+2 s 时本次访问的条目已不在。Main_Designer 裁：只记「无 toast」，不立 TD。
  - 斜杠文本先以正文存服务器（`one two /code` 200）；转换 PUT 在这次 200 之后 5–11 ms 发出，不扣时再过约 8 ms 得 200。
  - formula 转换的 PUT 文本流是空的，但服务器块把原文存进 `latex_input` 和 `body`（`alpha beta\none two`），字没丢（`logs/c-convert-server-blocks.txt`，跑完后经接口读回）。
- **限制**：「本次访问的条目被忘」那一半在浏览器里钉不到。转换收集条目时，本次访问自己那次保存的 200 已经把它忘了。这一半归单测（TD-79 ②）。

### IME 守卫（组字中按 Enter / Esc / `/`；订单 :121）

- 闸（Main_Designer 裁 ①）：与 A-20b r2 底相同，但先去掉底的首字母漂移（底把拼音首字母留在词前，如 `d第一`，这是 A-25 k25 修掉的形）。
- Esc、`/`：去 `d` 后与底完全相同 → 绿。斜杠菜单两侧都没开。
- Enter 按三条判：字不丢、恰一个换行、菜单不开 → 绿。
- **读数**：
  - 构建把换行存成单元拆分 `['第一','']`，底存成单元内裸 `\n`（`['d第一\n']`）。
  - Main_Designer 按文本模型读（非测量）：一单元一行是模型形，底的单元内 `\n` 是异常形；A-25 把组字文本挪进草稿缓冲、交接时按真换行拆，顺手去掉了它，不是回归。
- 闸的阴性对照：把构建行改成丢一个字（Enter 臂）、多一个字（Esc 臂），闸报红 2 臂、exit 1（`gate/imeg-negative.txt`，改过的行在 `gate/neg-imeg/`）。正跑的输出在 `gate/imeg-gate.txt`。
- **限制**：CDP 模拟组字时按 Enter，两版都插换行；真输入法多半吃掉 Enter 作上屏。真输入法怎么走列进 P2 第一条，请 Henry 自检。

### APPLYTYPE（Apply 在途时同块打字，两种放行顺序；订单 :188）→ **TD-85，新发现，单列**

- **操作序列**：
  1. 先在另一次访问里留一条恢复条目（`alpha beta gamma` / `one two`）。
  2. 重开，点 Apply。Apply 的 PUT（带 gamma）在请求阶段扣住约 2.4 s。
  3. 扣住期间在同一块第 2 行末打 ` delta`。
  4. applyfirst：先放 Apply；typefirst：先让打字的保存过去再放 Apply。
- **applyfirst**：构建 4/4 红，底 4/4 同形。
  - Apply 200 → 「Recovered block edit applied」→ 打字保存 `alpha beta|one two delta` 200 → gamma 在服务器、屏、恢复项、留字框哪里都没有。
  - 读数 ①：从放行到打字保存发出后 1.5 s，约每 45 ms 采一次编辑器。每侧 4 行里有 3 行带采样（第一轮那行还没有采样）。
    - 构建：51 / 52 / 52 次；
    - 底：52 / 51 / 51 次；
    - 全是 `alpha beta|one two delta`，gamma 一次都没上过屏。
    - 读数 ② 那一行：构建 52 次（2509–4846 ms），底 51 次（2527–4835 ms）。
  - 读数 ②：Apply 响应 `revision 1`，打字保存请求带 `base_revision 1`，得 200、`revision 2`。即打字保存用的正是 Apply 回来的版本号，文本取自从没有 gamma 的编辑器。
  - 被打破的不变量（Main_Designer 写）：「Apply 200 ⇒ 同块后续保存要么以含 Apply 字的文本为底、要么走合并；成功提示 ⇒ 屏上已有那些字」。
  - 代码指针（非诊断）：`useNoteCanvasDataAdapter.ts:2383`、`:2408`（b734197e）。
- **typefirst**：构建 3/3 绿（Apply 409 → 合并写 `alpha beta gamma|one two delta` 200，两词各一次，一条 O2「Failed to save block」）。底 3/3 红（409 无合并，余项只给打字自己的文本）。A-25 修好了这一半。
  - 读数（不判）：构建 3/3 合并写成之后，同一页面放行后 8 s 那次读，仍挂着一条不含 gamma 的恢复项：`alpha beta` / `one two delta`，带 Apply，回执 base 0。整页重开后这一项消失（3/3）。
  - 在它消失之前点它会不会把 gamma 再盖掉，没测。请 Main_Designer 定：归 TD-85 附，还是只留读数。
- 按预登读法：底也丢 → TD-85 标「既有」，与 82 / 83 同列候 Henry 排修，不挡封版。

## 五、旧矩阵（builder harness b-matrix25b，经回环代理，延迟 57 ms）

- win：28/28 绿。a24：32/32 绿。
- hash（arms `^(hash|fine)`，即 hash ×3 档、hashEnter ×2 档、fine ×21 档，每档 3 轮；每遍 78 个样本，其中 hash@300 3 个、fine 63 个）：

| 次 | 构建 / 底 | 坏 | 坏行 |
|---|---|---|---|
| r2.3c（11-08，r2.3c 包） | — | 0/78 | — |
| 本次第一遍 | 构建 | 3/78 | hash@300 ×2（`第 标题甲一段`、`[heading_1]标题甲第一段`）、fine@305 ×1 |
| 本次第二遍 | 构建 | 3/78 | fine@230、hash@300（`第 标题甲一段`）、fine@305 |
| 对照 | A-20b r2 底 | 2/78 | fine@290、fine@305 |
| hash@300 ×12 | 构建 | 0/12 | — |
| hash@300 ×12 | A-20b r2 底 | 1/12 | hash@300（`第 标题甲一段`，与构建同形） |

- **fine@xxx**：打 `第一段甲乙丙`，等若干 ms，回车，25 ms 后打 `第二行`；坏形是屏上与服务器都只有 `第一段甲乙丙`，`第二行` 不见。
  - 构建 3/126（两遍各 63 个 fine 样本），底 2/63。两版都有，不是 A-25 新添的。
  - 编辑器里打的那行没出现。harness 只读屏与服务器，没看恢复项。
- **hash@300**：打 `第一段`，等 300 ms，回车，40 ms 后打 `# ` 和 `标题甲`。坏形是光标跳，回车也没生效：
  - `第 标题甲一段`（跳到 1 位）：构建 2/18，底 1/15；
  - `[heading_1]标题甲第一段`（跳到 0 位，标题套到第一行）：构建 1/18，底 0/15。
- **条件不一**：
  - 构建的 3 个红全来自整矩阵那两遍（2/3、1/3）；底的整矩阵只跑了一遍（0/3）。
  - 单臂 ×12 是另一条件（hash@300 连跑）：构建 0/12，底 1/12。
  - 构建整矩阵那两遍各有一段与另一个锁位的浏览器并跑；×12 两侧都是独跑。
- **能下的结论**：
  - 两种形状正是 A-18 订单 :12–13 记的修前签名（`回车被吞且第二行消失`；`[heading_1]标题甲第一段`、光标复位到 0），根因见 A-18 订单 :49。A-18 修后只验了 0/3（A-19/20 订单 :484，当时机理未查明）。
  - fine 形与跳 1 位形底上都有，所以不是 A-25 新添的机制。
  - A-25 是否抬高了发生率、跳 0 那一形是否 A-25 引入，这些计数分不出（合计 Fisher 双侧 p≈0.6）。要分，需两侧同条件（整矩阵、同并发）各补若干遍。
  - r2.3c 那一遍 0/78 是一遍的样本，率低时分不出。
  - 没有 TD 行，判语里列为新发现 2，候 Main_Designer 给指针。
- **与 A-25 diff 的关系**（事实，不是诊断）：
  - 这一臂走 `# ` 标题结构（`useHeadingStructureController`）和新块里的打字交接（`useDraftBlockController` / `DraftBlockEditorLayer`）。
  - A-25 改了这些文件，也改了 `useNoteCanvasDataAdapter.ts` 的保存路径（`git diff --stat dfbcce8e b734197e`：上面几个文件加 `useTextFlowHistory`、`useRuntimeNaturalWritingController`）。
  - 改动和这条红之间有没有因果，没读码，不知道。

## 六、「从界面保存一次」冒烟（裁 1：每个经适配器写服务器的功能群一条）

- 判据：保存落服务器（经接口读回，轮询 8 s）+ 发过请求 + 重开后服务器一致 + 重开后屏上一致，四条全满才绿。

| 臂 | 结果 |
|---|---|
| SM-heading（`/h2` 把一行升二级标题） | 绿 |
| SM-quote（段落样式 → 引文 + 出处） | 绿 |
| SM-callout（段落样式 → 提示框 + 标签） | 绿 |
| SM-paper（笔记外观 → 整本纸型 A5） | 绿，每页 637.10 × 904 |
| SM-table（插入 → 表格，标题 + 两格） | 绿 |
| SM-timeline（插入 → 时间线，标题 + 一条） | 绿 |
| SM-tag（封面元数据 → Add tags） | 绿（第二次：第一次按钮在空行时透明度 0、要悬停才显，探针改为先悬停） |
| SM-binding（装订 → 眉中文案 → 保存装订） | 绿（第二次：第一次点击没提交；诊断里表单有效、`requestSubmit` 即发 PUT，探针改为先滚到中间再核点击点） |
| SM-image（编辑图片 → Zoom → Save） | **未测**：用接口建的图片块，点选后控制条里没有「编辑图片」。构建包里有这个按钮，原因没查清，列 P2 |

- 订单点名、这次没写臂的三群：
  - **留字框几何**：由第七节 GEO 盖，9 s 挂起后 10/10 测绿，加 `long` 2/2；
  - **Source 原页**：读路径由 A-19 代表组盖（原页出图、坏文件、血缘跳转）；从界面写的那一下没写臂，记未覆盖；
  - **Agent 补丁接受**：要真模型产补丁，按「⛔ 真实模型」不跑，进 P2。
- 一次走题：
  - 我停掉的一个冒烟任务，它的等锁子进程没死，10 分钟后（03:03:30）取到锁，用旧端口又跑了一遍，把 8 行追加进同一目录，期间与另一锁位的 a24 矩阵并跑。
  - 正式那遍的锁窗是 02:51:40–02:53:28（`logs/se-smoke-windows.txt`）。`logs/se-smoke.log` 是那次走题的日志：同名被覆盖，exit 127 是我杀进程所致。
  - 走题行已移到 `runs/se-smoke/rows-orphan-0303.jsonl`，不计；结果与正式那遍相同。同时并跑的 a24 矩阵 32/32 绿，不受影响。

## 七、void 臂分类（订单裁 4）

| 臂 | 分类 | 结果 |
|---|---|---|
| GEO（acc11，4 s 挂起 + 应用内离开） | (b) 准备坏：A-20 起应用内离开会等保存完，字都存了，没框 | 改用 9 s 挂起（`long` 形状原本就用它、仍出框）：noEnter / enter / narrow1100 / 950 / 760 各 ×2，10/10 测绿；加原 `long` 2/2 |
| BAN（acc12） | (b) 准备坏：同上 | 改成扣住时整页离开：1/1 测绿 |
| acc6-Z | 本次不再 void | Z-coveredLine 3/3 测绿（同跑的 acc6 共 11/11） |
| STEAL ×3、BOXTYPE2 ×3、BOXTYPE3 ×3（acc18） | (b) 准备坏，30 分钟内没修成：9 s 挂起在 acc18 的配方下仍是字全存、没框 | **未覆盖**。不归 (a)：种进去的 edit 记录今天仍会自己落地（BOXTYPE-typeInBox 那条），前提没有证明已不存在 |
| two2（acc11） | 按裁 4：记未覆盖，由 acc10 TWO 顶 ③ 类，不重建前提 | `count-void` 报「NOT TESTED 1（two kept records were not both on screen）」 |

## 八、kit 改动（在私有 ops kit，不进仓）

- 阶段末四件（开跑前做完）：
  - 分析器把准备失败单独报「NOT TESTED」，void ≠ 绿；
  - 链 diff 用宽注记；
  - a20m 预言核对回落到基线文件；
  - UNDOPAUSE 闸按前缀不变量。
  - 另外：kit 缺 CREDROOT 时一律 exit 2「NOT RUN」，部署后核对那次静默退出的教训；`count-void.mjs` 给 acc 系列补「void ≠ 绿」。
- **「1 条」改注**（读者列出 12 行）：
  - HEADCLOSE-putback 改成判的闸（分析器 `putbackItems`；阳性对照见第二节第 2 条）；
  - README 加「一块一访一条」一节，把仍按一项写的解析器列为已知局限（出复数标题时按项手读）；
  - K1 / K3 / CLICKBACK / applyslow 的注补上新存法；
  - 两份旧报告（A-20b r2、r3e）的 putback 段加指针。
  - 都不改判语。
- **新臂与新闸**：
  - `a25d_body` 加 C-convert、APPLYTYPE；
  - IME 守卫探针 `a25g` 与按裁定改的 `compare-imeg.mjs`；
  - 冒烟探针 `smoke_body.mjs`（Opus 子代理起草，我审过判据）；
  - 人速探针 `hum_body.mjs`（含 Apply 步）；
  - 恢复项重读器 `reread-items.mjs`。
  - 新读数（编辑器采样、版本号、屏上转换）在 `a25d_body.next.mjs`，脚本副本在 `scripts/`。
- **我自己的错**：
  - APPLYTYPE 第一版读响应体读错字段（CDP 封装返回整条消息），版本号是 n/a。改后补跑一轮，两侧各 1 行。
  - 冒烟停任务时漏杀子进程（上一节）。
  - 用 `&` 在一次 Bash 调用里后台起的人速任务没死，排成两份。及时杀了，没跑起来。
  - builder 的矩阵 harness（b-matrix25b）的 winShot 臂把截图写死到仓里 `docs/audits/2026-11-05-a21-builder/window-echo-{during,after}.jpg`，我 02:57 跑 win 矩阵时覆盖了这两个已入库的文件。已用 `git show HEAD:` 原样写回（只读 git，没做 git 写操作），工作树对这两个文件已干净。harness 的这个写死路径是隐患，以后跑旧矩阵前要先改掉。
  - 第一次旧矩阵那步没跑：字段分隔符用了 `|`，与臂正则里的 `|` 冲突。但它起的回环代理（13171）留着，后面 win / a24 / hash 三个矩阵都走了它，三次放锁都是 exit 1（新起的代理绑不上端口，收尾 kill 失败）。配置相同（A-25 包、上游 3615），每次开跑打印的主 JS 都是 `index-4nEsyJNA.js`，结果不受影响。事后已杀。

## 九、P2（交 Henry 真人走查）

- 清单在 `p2-list.md`，先看第一节：
  - 真输入法组字中按 Enter / Esc；
  - 图片编辑入口；
  - 窄屏、键盘、拖拽 / 滚轮 / 捏合、打印预览、皮、其他浏览器、触屏、Agent 活动徽章。
- 第二节是手册 §一 里要新写浏览器核的条目，加 1 条只能人看的。打勾的有本次的保存冒烟，只盖保存这一下。
- 手册 §一 :42–72（编辑器核心）按裁 1 对到已有臂，不新写。读者对到已有臂的 28 条在 `plan-raw.json`（coverage = existing-arm）。
  - 这一段里读者标成「要新写」的 4 条：
    - L43（留字框位置）由第七节 GEO 盖，不进 P2；
    - L47 / L48 / L49（框里留光标、停靠框回屏才落、窄屏顶右条）没有已有臂（BOXTYPE3 本次 void），所以进 P2。
- 另进 P2：Agent 补丁接受（要真模型）、Source 原页从界面写的那一下。

## 十、证据

- `PLAN.md`、`plan-raw.json`：排程草案与 6 个读者 + 1 个批评者的原始输出。
- 封版态与同源：`se-build.sha256`、`logs/se-island.log`、`logs/se-build-vs-island.diff`。
- 各组的行：
  - 本地副本各组：`runs/<标签>/rows.jsonl`；
  - 对子、r2.3c 链、void、岛上、人速、重读：`pairs/<标签>/rows.jsonl`。
- 判读输出：
  - 链判读与对 A-25 的 diff：`gate/se-*.txt`、`gate/a25-*.txt`、`gate/diff-*.txt`；
  - k25：`gate/an-se-k25.txt`；
  - IME 守卫闸：`gate/imeg-gate.txt`，阴性对照 `gate/imeg-negative.txt` 与 `gate/neg-imeg/`。
- 旧矩阵：`matrices/old-*.json`（`old-hash*.json` 是整矩阵，`old-h300-*.json` 是单臂 ×12）。
- 全量：
  - 客户端：`logs/client-full-tail.txt`；
  - 服务端：`logs/server-full-failures.txt`、`logs/server-full-2-failures.txt`、`logs/server-full-2-summary.txt`、`logs/server-v2-files.txt`；
  - MinerU 单跑：`logs/server-mineru-alone.txt`、`logs/server-mineru-idle.txt`，条件在 `logs/server-mineru-conditions.txt`。
- C-convert 服务器块：`logs/c-convert-server-blocks.txt`。
- 冒烟锁窗：`logs/se-smoke-windows.txt`。
- 截图：`shots/`。
  - 岛上人速 5 行的重开截图（`isl-hum_*`），恢复项可见；
  - 本地 HL / N-b2 各一张；
  - SM-binding 第一次那张。
- 脚本：`scripts/`。

## 十一、交出前的反驳复核

- 4 个 Opus 读者（只读、不起浏览器、取一个锁位）各拿报告的一段去对证据文件反驳，第四个对订单查缺项。
- 查出并已改：
  - **判语的错**：「其余每条红都有指针」不成立。fine@xxx 没有 TD 行，按硬规则改列为新发现 2；hash@300 的结论从「不是 A-25 引入」收窄为「机制两版都有，率与跳 0 形分不出」。
  - **错数**：
    - k25 轮数；
    - fine 的分母（应是 126 / 63，不是 156 / 78）；
    - acc6-Z 是 3/3（11/11 是整个 acc6）；
    - SM-paper 宽 637.10。
  - **缺证**：
    - IME 阴性对照的输出；
    - formula 的 `latex_input`；
    - 服务端第二次的 exit 与 not ok 行；
    - MinerU 单跑的条件；
    - 冒烟正式那遍的锁窗；
    - 岛上 5 行的恢复项截图（原只拷了 2 张）。
    - 都已补进证据。
  - **说法不准**：
    - TD-82 的「本地 1/1」那行没达到臂态，改成岛上 1/1 加本地读数；
    - N-b2 离开前的屏，同时有编辑器行和获焦缓冲；
    - 链 diff 有第三类（今天侧新增 1 行准备失败）；
    - 服务端第一次 24 处里 3 处是 IPC；
    - 斜杠到转换的毫秒数；
    - APPLYTYPE 采样是每侧 3/4 行、约 45 ms 一次；
    - 旧矩阵第一次没跑的真正原因。
  - **缺项**：
    - 本地人速那批（HL 7/7 作废、N-b2 3/3 红）；
    - HL 在 r3e 之前的数据；
    - typefirst 合并后仍挂一条不含 gamma 的恢复项（读数，问 Main_Designer 归属）；
    - 冒烟没写臂的三群；
    - :42–72 对到已有臂的说明；
    - METHOD 第六节与三份报告「更正」里 TD-82 / 83 的旧说法（本单随交）。
