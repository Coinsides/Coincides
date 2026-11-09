# A-20 r2 验收（Tester(1)，2026-11-08）

> 对象：包 ops `packages/a20-idle-save-r2/`，主 JS `index-DGn86c1V.js`，基线 `04f6f822`，src 15 个文件，dist 63 个文件。
> 环境：本地后端（server = `04f6f822`），前端直接服务包里的 `dist/client`；修前对照是 `04f6f822` 等价构建（`index-Gswd3cHv.js`）。真 Chrome 走 CDP，不碰岛，不碰 Henry 的账号，没用真实模型，应用里的 Agent 0 条。
> **只测了 Chrome。**

## 〇、判语

**挡放行，原因 M2。** 这个包不上岛，r3 作第 23 轮。

- 依据是 Main_Designer 11-08 加的那条标准（订单「Reviewer 发现收讫（M1–M6）；开 r3」节）：BACKIN-undo 在 r2 上复现 ② 就挡。
  - r2 上 2/2 复现：撤销掉的字，重开笔记后自己回到服务器上，没有横幅，也不用按 Apply。
  - 修前 0/2：同样的步骤，什么都不回来。
- 同源一致（第一节）。
- 本单验收臂已跑完的部分全绿（第三节）。链的后半段还在跑，结果补在第三节末，不改变判语。

### 比修前差的臂

1. **BACKIN-undo**（② 类，挡放行）：r2 2/2，撤销的字自己落回；修前 0/2。
2. **人留在 A 上，却弹「已离开」的提示**：r2 三条有效行全有（BACKIN-fail 1、BACKIN-undo 2）。提示原文是「Your last edit did not reach the server. It is kept on this device: open the note again to recover it.」；修前 4 行 0 条。

**不算比修前差、但要记下的**：

- BACKIN-fail：人留在 A 后，再用脚本改 hash 离开，r2 不扣住，0.3 秒内就到了另一篇，也不发请求、不出状态条。这就是 M2 说的 `released` 卡住。修前本来就不扣 hash 离开，所以与修前一样。但它不符合 r2 自己「hash 离开要扣住」的设计，归 r3 修。
- BACKIN-fail 重开（🅱，Main_Designer 已记给 r3）：r2 的字已经落地，「A previous block edit is queued for recovery」却还挂着。修前字没存上，横幅给 Apply，这是对的。

## 一、同源

- 包里两份清单的哈希与 builder 报的一致：`src.sha256` = `37baa396…`，`dist.sha256` = `81a09e4a…`。
- 在包的 `src/` 里跑 `sha256sum -c ../src.sha256`：15/15 OK。
- 自建：`git archive 04f6f822`（client、shared、scripts、docs/generated、package.json）加包里 15 个文件，用 `npx vite build` 构建。产物 63/63 与 `dist.sha256` 逐字节一致（`hashes/tester-rebuild-dist.sha256`）。
- 5603 服务的就是包里的 `dist/client`，主 JS `index-DGn86c1V.js`。
- 后端 server 树是 `04f6f822`；包里没有 server 改动。

## 二、决定这一版的两条臂（Reviewer M2）

**进入方式**（探针 `a20m`）：

- 整页打开课程页 `#/courses/<课程>`，路由给这个条目 `idx` 0。
- 在列表里点笔记 A，路由推一条，`idx` 1。
- 两个 idx 每行都记了，不用脚本改的 hash。

**失败设定**：在 A 的空行打 `backin words`。第一次 text-save 先扣住，1.5 秒后答 500，之后的 text-save 都直接答 500。打完字马上按后退（CDP `Page.navigateToHistoryEntry`）。

| | 修前（`04f6f822`） | r2（`index-DGn86c1V.js`） |
|---|---|---|
| 后退之后人在哪 | 留在 A（2/2 + 2/2） | 留在 A（1/1 + 2/2） |
| 提示（每次出现都计，都显示在 A 上） | 「Failed to save block」×2、「Text changes could not be saved…」×2、「Changes could not be saved. Please retry before leaving the note.」×1 | 「Failed to save block」×2、「Text changes could not be saved…」×2、「Your last edit did not reach the server. It is kept on this device…」×1（**人没走**） |
| 留住记录（kept words） | 无 | 有 1 条：`{id: 'edit-…', initialText: '', text: 'backin words', source: 'edit'}` |
| 回执 | sessionStorage 有本笔记的块编辑恢复回执 | localStorage `draft-recovery:v2:<user>` 有 |
| **BACKIN-fail**：再用脚本改 hash 离开（保存扣住） | 不扣住（修前本来就不扣 hash 离开） | 不扣住，0.3 秒内到另一篇，不发请求，不出状态条（`released` 卡住） |
| BACKIN-fail 重开 | 服务器 `['warmup','']`，横幅给 Apply（字没存上，横幅是对的） | 服务器 `['warmup','backin words']`（自己落了），仍挂「A previous block edit is queued for recovery」 |
| **BACKIN-undo**：网络恢复 → 撤销 → 正常离开 → 重开 | 撤销后编辑框 `['warmup','']`，服务器 `['warmup','']`；离开后无记录；重开服务器 `['warmup','']`，无横幅 | 撤销后编辑框 `['warmup','']`，服务器 `['warmup','']`；**离开后记录还在**（同上那条）；重开**服务器 `['warmup','backin words']`**，无横幅，无 Apply |

- r2 的 BACKIN-fail 第 1 次重复死在设置上（prep 打 `warmup` 时变成了 `wa`、`rmup` 两行，探针找不到空行），不是产品的行为，这一行不计。
- 证据：`runs/pre-m-backin`、`runs/r2-m-backin`，分析在 `gate/` 同名文件。

## 三、本单验收臂（r2 链）

本节是写报告时链已跑完的步骤。分析器是 kit 的 `analyze-a20.mjs`，规则见 kit README 的 r2 闸表。

| 组 | r2 | 说明 |
|---|---|---|
| K1-401hash / 401blur / close / paste500、K1IME-held | 10/10 绿 | 无重复；服务器上是 `note alpha`，按横幅 Apply 得到 `note alpha beta`（最新快照）；不自己落两次 |
| K2-hash / paste | 4/4 绿 | 撤销的 `gamma` 不自己回来 |
| K5 | 2/2 绿 | 同次挂载不出 Apply 横幅；活字不被盖；服务器 `note delta more` |
| K3 | 2/2 绿 | 401 后登录，编辑被提供，Dismiss 删掉，重开不再出 |
| K6-push / replace | 4/4 绿 | push 回 A，replace 回 X |
| LATEBACK × 4 变体 | 8/8 绿 | 等待期状态条可见（截图 `screens/r2-late--LATEBACK-*-0-wait.jpg`，已裁侧栏） |
| SPLIT-mid / home / mid401 / midback | 8/8 绿 | 与修前一致：服务器 `alpha beta` 各一次，重开有块编辑恢复横幅（Apply / Dismiss） |
| RETRY-del / more | 4/4 绿 | del：`beta` 保持删除，无框；more：`beta more`，无框 |
| STALE-back / edit | 4/4 绿 | 与修前一致：行是另一设备写的样子，无框；横幅提供旧尾巴（人自己选） |
| TWICE-hash / back / paste | 6/6 绿 | 字一次，2xx 之后无假提示，不跳回第一个目的地 |
| TWICE-hash500（第三次裁定） | 2/2 绿 | 存一次且精确，到最新目的地 C，重开无 Apply。两条失败提示（A-25 (e)，不作闸）在到 C 之后还在屏上约 3 秒 |
| BACKOK-plain / slow | 4/4 绿 | 无假提示 |

**SPLIT 框里的内容（每个变体一行）**：四个变体都没有框。重开时只有横幅，提供 `warmup alpha beta`，与修前相同。

链后半段已跑完（18:08）。按 Main_Designer 的安排，作 r3 的「已修好」参照：**r3 在这些行上必须全保**。

| 组 | r2 | 说明 |
|---|---|---|
| OFFLINE-N / OFFALL | 4/4 绿 | 断网期间「Failed to save block」按出现次数计恰 1 条；OFFALL 另有 1 条「Block save result could not be reconciled」；网络回来后点外面全存 |
| FLYK-close / full × req / resp | 8/8 绿 | 严格形：`kzero` 一份，靠回执；`kone` 服务器 0 份，在框里等人 |
| INAPP-home / tab × type / still | 8/8 绿 | 应用内链接这条路的老病修好了；等待期状态条可见（截图 `screens/r2-inapp--*-0-wait.jpg`，已裁侧栏） |
| HASHFAIL-hash / paste | 4/4 绿 | 持久失败：留在 A，有提示，字在编辑框里 |
| SWITCH | 2/2 绿 | 四次往返：误报 0，每个词各一份 |
| GONEFAIL-hash / paste | 4/4 绿 | 一次性 500 后约 30 毫秒重试存上，然后离开，字一份 |
| GONEFAIL-back | 2/2 绿 | 新规则：「could not be saved」0 条，真话「did not reach」1 条，字一份 |
| ACCT401 | 2/2 绿 | B 账号看不到；A 的字在服务器上一份 |
| CLOSEFLY-req / resp、OFFCLOSE | 6/6 绿 | 字一份；CLOSEFLY 重开时的陈旧横幅是已知的，归 A-25 ②a |
| LEAVE × 9（hash、paste、401 × 同标签页、新标签页、应用内） | 18/18 绿 | 字都上了服务器；401 那条提示是真话（「did not reach … kept on this device」） |
| EMPTYHASH、LATE、LATEREQ | 6/6 绿 | 空笔记间切换无提示；迟到的保存无 Apply；先发的字在服务器上 |
| IDLE、WAMP、PAUSES、UNDO、PAGEHIDE | 8/8 绿 | 3.5 秒空闲保存；连打 0 写、停后 1 写；4 次停顿 4 写；撤销形状与修前同 |
| PAUSEEXIT（unload、hash、401、关标签页、杀进程） | 8/8 绿 | 停顿后各种离开，字都在 |
| UNDOSEQ、UNDOPAUSE、IME | 6/6 绿 | 与同环境修前基线 `pre-c2` 逐步相等（UNDOPAUSE 末步 `['w']`，与基线同） |
| DRAFT、PUTDUP | 4/4 绿 | 3.5 秒后草稿完整；PUT 4 次，无重复 |
| HARDKILL-close / proc | 2/2 绿 | 停顿前打的字在；停顿后 300 毫秒内打的尾巴丢，与修前同 |
| OFFKILL | 参照 | 断网时被杀，字丢；说明书「已知」，归 A-25 ②a |

**整条链**：r2 上 153 行，红 0（含 OFFKILL 参照 1 行；a20m 的 BACKIN-undo 不在链里）。各组分析在 `gate/r2-*.txt`。

**修前对照、r2 的 9 对回归**：按 Main_Designer 11-08 的安排跳过，r2 不上岛，直接在 r3 上跑。

## 四、阳性对照

- **r1**（`index-BkYnVk7W.js`）用现在的分析器重判，都还是红的：
  - SPLIT 8/8 红（`alpha beta` 变成 `alpha` 或 `""`）；
  - RETRY-del 2/2 红（`beta` 回来）；
  - GONEFAIL-back 2/2 红（假的「Changes could not be saved. Please retry…」）。
- **修前 K1**：401hash、paste500、IME-held 红，字丢了，服务器只剩 `note` 或 `note现值`；401blur、close 按 Apply 能找回。
- **修前 K2**：hash、paste 2/2 是**绿**的（修前没有留住记录，撤销的字回不来）。
  - 所以 K2 的红色阳性对照是 r1（4/4 `gamma` 落回），不是修前。派单里「修前在 K1 / K2 上红」只有 K1 成立。
- **BACKIN-undo** 本身是对照：同一探针，修前绿、r2 红。
- **量具**：判可见改用 `checkVisibility()`，改之前先过了阳性对照：
  - 一个 fixed 的 `role=status`：旧判法不可见，新判法可见；
  - `display:none`、`opacity:0` 两种都判不可见。

## 五、本轮量具改动（都已同步到 ops `tester-kit/a20/`，builder 封包前自跑用）

- `vis()` 和找可见按钮都改成 `checkVisibility({checkOpacity:true,checkVisibilityCSS:true})` 加盒子宽度非零。旧的 `offsetParent` 判法对 fixed 元素永远看不见。
- TWICE-hash500 按 Main_Designer 第三次裁定判：存一次且精确、到 C、重开无 Apply。提示只记录，不作闸。
- GONEFAIL-back：那次保存真的失败了，所以「did not reach the server … kept on this device」是真话，允许出现，按出现次数计至多一条。之前分析器连真话也禁，是我的错。只有「could not be saved / Please retry」算假提示。
- UNDOSEQ / UNDOPAUSE / IME 的形状，和同一环境的基线比（`BASE=`）。UNDOPAUSE 最后一步因环境不同：我这里是 `['w']`，builder 那里是 `[]`（TD-63）。
- `watchN` 现在还记每条提示消失的时间，以及消失时在哪篇笔记。
- 新探针 `a20m`：BACKIN-fail / undo、LIST-close / back / addr、LANDOTHER-plain / heading。分析器里印出 r3 规则（订单判语节末段）：
  - 留在 A；
  - 零条 LEFT_UNSAVED；
  - 不留冻结记录；
  - 之后 hash 离开仍被扣住；
  - 撤销后什么都不回来；
  - 字已落地后没有残留横幅。

## 六、给 A-25 的量测

- **提示停留**（已由 Main_Designer 写进 A-25 单 Q2 ⑥，作修前基线），在 `index-DGn86c1V.js` 上测：
  - TWICE-hash500 ×2：两条失败提示都在 A 上出现。「Text changes could not be saved…」比重试的 200 早约 10 毫秒出现，到 C 之后还在屏上，到约 6.4 秒才消失，在目的地停约 3.1 秒。
  - GONEFAIL-hash / paste：同样，在另一篇上停约 3 秒。
  - GONEFAIL-back：一条真话「did not reach the server」，字约 8.9 秒落地。
- **LANDOTHER**（LANDFAIL 期间，在**另一块**里打字；探针 `a20m`，修前与 r2 各跑）：
  - 设定：先做一个普通块 `plainb` 和一个标题块（服务器 `[heading_1]hb` + `hbody`）。然后按 A-25 LANDFAIL 的做法，在 A 的空行打 `# head ↵ body`，建块的 POST 吃一次 500，字被留住。之后整页重开，所有 text-save 都失败，留住的字落地时失败，出「Failed to save block」等提示。

    | 打字位置 | 修前 | r2 |
    |---|---|---|
    | 另一普通块末尾（` plus p`） | 2/2 上屏，网络恢复后落地 | 2/2 上屏，落地 |
    | 另一标题块的正文行末尾（` plus h`） | 1/1 上屏，落地；「Heading changes could not be completed」0 条 | 1/1 同左 |
    | 另一标题块的标题行末尾（` plus t`） | 2/2 上屏，落地；同上 0 条 | 2/2 同左 |

  - 两种块各有 1 次重复死在设置上（prep 把 `warmup` 打成了两行），不计。
  - **与 A-25 查报的推断不一致**。推断是「整篇任何一处失败时，任何带标题且不止一行的块都拒键」，但另一个标题块的两行都收键，修前、r2 都这样。
  - 我量到过的拒键只在**失败的那一块自己**：A-25 LANDFAIL (a)，在 A 的 `warmup` 行打字，修前红。
  - 所以拒键范围可能是「失败块所在的块」，不是「整篇的标题块」。这一条请 A-25 builder 对照代码再查，我不下结论。

## 七、LIST（Reviewer M1，不挡 r2）

保存全部扣住时打 `k0 ↵ x ↵ y`，然后离开：关页（about:blank）、后退（到脚本 hash 条目，即 keepAndLeave 那条路）、地址栏（同文档改 URL）。后退和地址栏两种，离开 2 秒后放行被扣的请求。之后重开 A。

| 离开方式 | 修前 | r2 |
|---|---|---|
| 关页 | `x`、`y` 都丢（2/2）。服务器 `['warmup','k0']`，横幅只提供 `warmup k0` | **`x` 丢**（2/2），`y` 在框里（split 记录） |
| 后退 | `x`、`y` 都丢（2/2），离开时弹「Changes could not be saved…」 | **`x` 丢**（2/2），`y` 在框里（「Not in the note yet / Discard」） |
| 地址栏 | `x`、`y` 都丢（2/2），人去了另一篇 | 离开被扣住，放行后 `k0 x y` 全部上服务器（2/2） |

- **M1 在 r2 上坐实**：关页、后退两条路上，中间那行 `x` 不在任何地方，4/4。
- **不比修前差**：修前 `x`、`y` 都丢；r2 留住了 `y`，地址栏那条路全保住。
- r3 的绿按变体分开判（Main_Designer 11-08 更正，分析器已改）：
  - 关页、后退（页面死前队列没排空）：`x`、`y` 各作 split 记录进**框**，手动放回，不自己落地；服务器 `warmup k0`，`k0` 一份（它有回执）；零丢零重复。
  - 地址栏这类可扣住的离开：`k0`、`x`、`y` 在服务器上各一份。
  - 分析器先过了阳性对照：r3 形状的合成行判绿；后退变体里 `x` 自己落到服务器的那行判红。
- 量具更正：探针第一版把「横幅提供 `warmup k0`」记成了「`x` 在横幅里」。分析器现在按横幅、框、记录里的实际文字判 `x` 和 `y` 在哪；上表是更正后的。

## 八、证据（本目录）

- `runs/<label>/rows.jsonl`：每次运行的逐行记录，测试邮箱、本机路径、IP 都已替换。
- `gate/<label>.txt`：分析器输出。
- `scripts/`：探针和分析器，即 kit 的副本。
- `hashes/`：包里的两份清单、文件表，和我自建产物的清单。
- `screens/`：LATEBACK 等待期截图，已裁掉左侧栏。
- 运行一览：
  - 修前：`pre-c2`（UNDO 的基线）、`pre-k`、`pre-m-backin`、`pre-m-list`（LIST + LANDOTHER）、`pre-m-headline`；
  - r1 对照：`r1-j`、`r1-j2`、`post-d`；
  - r2：`r2-k`、`r2-late`、`r2-j`、`r2-m-backin`、`r2-m-list`、`r2-m-headline`；
  - 量测：`m-twice500`、`m-gonefail`。这两个跑在封包前的同一构建 `index-DGn86c1V.js` 上，封包后主 JS 名没变。
- **随本次收割一并入的 A-19 截图**：9 张已在工作区裁好侧栏的文件，路径是 `docs/audits/2026-11-06-a19-builder/tester-evidence/`：
  - `screens/` 下 8 张；
  - `postdeploy-22/old-image.jpg` 1 张。

## 九、没覆盖到的

- 只测了 Chrome。
- 后退用的是 CDP 的 `navigateToHistoryEntry`，不是真按浏览器的后退键。它在页面里触发的是同一套 traverse 和 popstate，但真按键这条路没量过。
- 真人手打、真输入法：要 Henry 上岛后试。
- r2 的 9 对回归没跑，按安排在 r3 上跑。
