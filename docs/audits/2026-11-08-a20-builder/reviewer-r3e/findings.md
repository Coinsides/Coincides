> **状态 (Status)**: active
> **层 (Layer)**: 审计 / Audit（Reviewer 复核发现，只出发现不裁定）
> **日期 (Updated)**: 2026-11-09

# A-20 r3e 小核发现（Reviewer）

**总判断**：r3e 的 P1 窄补、P2 乙、P3 / P4 改动都在回执所指的行上，和裁定一致；范围成立。但五条里有两条按不变量找到了反例，分别是 ① 的第三种漂移（Q1）和 ② 的「两张账都不进」（Q2、Q3）。三条都不是 r3e 引入的，裁定见下。

- ① 逐跳核到暴露处，链路完整：适配器算列表 → 返回对象 → controller 解构 → 传给 HSC → HSC 每拍从 latest 读。我把 Main_Designer 点名的五种漂移逐一走过，都在保守一侧（多扣，不早放）。
- 但「同块回执存在且未结算」还有第三种漂移（Q1，疑似 ③）：Apply 在途时，同块的另一次保存会把 Apply 的回执顶掉。HSC 因此早放；若后发的那次先到服务器，Apply 的字就哪里都不在了。
- ② P2 乙对「组里新长出来的单元」一律成立。但「两张账都不进」的反例有两类，都是 r3e 之前就有：
  - Q2，疑似 ③：多行粘贴时，被劈那一行自己新得的字被 `cutText` 吞掉。
  - Q3，疑似：单元集合不变的结构组（行内选区替换、插链接、改角色）不进任何一张账。
- ③ 十二种地址形状和路由逐一同判，只有一形不一致（Q4，确认）：hash 没有前导斜杠时，路由会补 `/`，谓词不补。要人手改地址才会触发。
- ④ P2、P3、P4 的红测试断的是行为。P1 的红测试只断到适配器给出的列表，controller 到 HSC 这一跳没有红测试守（Q5，🅱）。谓词单测的期望是手写的，没有对着路由取值。
- ⑤ 范围成立：
  - 7 个文件，HSC 与 r3d 逐字节相同。
  - 适配器对 `04f6f822` 共 +14 行、-0 行：r2 的 3 行加上 applying 一族的 11 行，逐行列在 §⑤。
  - server 零 diff。

行号都对 r3e 包 `src/` 快照，前缀如下：

| 前缀 | 文件 |
|---|---|
| A | `useNoteCanvasDataAdapter.ts` |
| C | `useNoteCanvasRuntimeController.ts` |
| H | `useTextFlowHistory.ts` |
| R | `useNoteRouteSaveBoundary.tsx` |
| HSC | `useHeadingStructureController.ts` |
| router | `@remix-run/router` 1.23.2 `dist/router.cjs.js`（react-router 6.30.3） |

包外文件注明「共享树」。

包核对：`src.sha256` 17 行 OK。相对 r3d，恰好 7 个文件有 diff：

| 文件 | 变动行数 |
|---|---|
| A | 11 |
| A.test | 32 |
| C | 6 |
| R | 23 |
| R.leave.test | 36 |
| H | 4 |
| H.test | 35 |

其余 10 个文件逐字节相同，含 HSC。

---

## 发现

### Q1 疑似 ③：同块后发保存顶掉 Apply 的回执，HSC 早放；后发者先到服务器时 aaa 全失

**不变量**：只要某块的 Apply / Replay 还没结算，HSC 读到的列表里就一直有这块的一张回执，而且回执里是 Apply 要写的字。

**机制**：

- 每块只留一张回执。`rememberBlockEditRecoveryReceipt`（`draftBlockPersistence.ts:514-533`）写新回执时，会删掉同块的旧回执。
- Apply 的回执 R1 以 applying 身份登记（A:2111-2116），所以列表留着它（A:645-648）。
- 这时同块再发一次保存 S2，S2 的回执 R2 会把 R1 从存储里删掉。R2 在途而且不是 applying，被 A:648 滤掉；R1 已经不在存储里，`listBlockEditRecoveryReceipts` 读不到它。
- 结果 HSC 列表里这块一张回执都没有，HSC:583 的扣留在 Apply 结算之前就放开了。

**触发序列**（文本块在保存中不禁编辑：`NoteWritingSurfaceLayer.tsx:1996` 只传 `saving`，共享树）：

1. 上次访问留下回执 R0（aaa），框里还有 kept 字 bbb。重开后点 Apply：A:2031 写入 R1，R0 被删。
2. 网慢，Apply 在途。这时人在同一块里打字。2 秒后空闲保存 S2 发出，基准 R：H 的 baseFor 取 `block.text_save_revision`，Apply 还没回，块没更新。S2 写入 R2，R1 被删。
3. HSC 下一次重试到点，列表里没有这块的回执，bbb 落进草稿（草稿不含 aaa）。
4. 两次 PUT 的基准都是 R：
   - **S2 先到服务器**：服务器变成 R+1，内容是人打的字，不含 aaa。Apply 回 409，A:2228 把冲突标在 R1 的 key 上，但存储里已经没有 R1，队列不会显示这条冲突，Apply 的回执对象也没人再写回去。aaa 在屏上、服务器上、回执里都没有了，也没有任何提示。
   - **Apply 先到**：S2 回 409，R2 成了冲突项（人打的字保住了）。aaa 在服务器上。Apply 不是最新一次操作，走 A:2155 分支，草稿不采纳。之后 history 的空闲保存被 `failures.size` 闸住（H:728）。没有静默丢字。

**同族第二个入口**：块转换。`applyTemplateToBlock` 在开工时取下同块的全部回执 key（A:2466-2468），成功后统统忘掉（A:2519-2520），在途的 R1 也在其中。转换时块里的文字取自当前草稿，不含 aaa。

**判断**：

- 和裁定过的 A-25 ②a (iv)「在提供的横幅上打字顶掉它的字」同族，这里是 Apply 在途时的变体。
- 静默丢字只在「后发先到」这一支：Apply 的请求要比 2 秒后才发的 S2 更晚到服务器，要求慢上行或连接排队。
- 不是 r3e 引入的。r3e 的扣留以回执身份为键，这一支它守不住。

**可选方向（只列，不裁）**：

- 扣留以「块上有 applying 操作」为键，不以回执 key 为键。
- 在途操作直接带着自己的回执对象（含字），HSC 比对首见文本时用这份。

**建议 Tester 臂**：在 HEADCLOSE-Apply-slow 上加一步：Apply 在途时在同块打字，等空闲保存发出。再拆两支：放行顺序 Apply 先、S2 先。

### Q2 疑似 ③（r3 M1 起就有）：多行粘贴时，被劈那行自己新得的字两张账都不进

**不变量**：交给 `keepOpenEdit` 的组里，每一个字都要进某条记录（split 记录或 edit 记录）。

**机制**：

- 多行粘贴走 `pasteTextIntoTextFlow`（共享树 `textUnitEditorService.ts:389-418`），粘贴的第一行接到目标行上（`prefix + firstParsed.text`）；没传 edit，默认是结构组（共享树 `TextBlockProjection.tsx:860-867`）。
- 这一组 `isSplit` 为真（H:180-183），进 `unsentSplits`（H:693）。
- `keepOpenEdit` 里，被劈的那行满足 `split && was !== undefined`，于是 `cutText` 记下它劈后的文本，而这份文本已经含了粘贴的第一行（H:793）。
- H:817 拿这份文本当起点 initialText。若之后没在这行再打字，起点等于终点，什么都不留。

这条规则对回车成立（回车只把行尾移走，不添字），对多行粘贴不成立。

**触发序列**：

1. 某行是 `abc|def`。上一次保存在途（网慢），这时粘贴 `X⏎Y`：这一行变成 `abcX`，新长出一行 `Ydef`。
2. 按后退。traverse 路径直接走 keepAndLeave（R:274-275），等不到交接。
3. 重开：服务器上那行还是 `abcdef`，框里只有一条 split 记录 `Ydef`。**`X` 哪里都没有。**

如果第 1 步时历史里已有失败（不论网速），这一组卡在 H:264-271 的依赖重试里，也交不出去，结果相同。

**建议**：

- builder 写阳性对照：用上面的序列断言 `X` 出现在某条记录里。
- Tester 臂 MULTIPASTE-Back。

### Q3 疑似（r3 M1 起就有）：单元集合不变的结构组不进任何一张账

**机制**：H:691-693 只收两类组：

- `plainTyping`：kind 为 `typing`，单元 id 列表不变。
- `isSplit || removesUnits`。

kind 为 `structural`、单元 id 不变的组两类都不是，交接 2（H:294）之前它们不在任何账里。现有的这类组：

| 来源（共享树） | 组 |
|---|---|
| `TextBlockProjection.tsx:762` | 单行内 flow 选区替换（替换文本、粘贴） |
| `TextBlockProjection.tsx:1502-1506` | 不允许标题时粘贴带 `#` 的文本 |
| `NoteWritingSurfaceLayer.tsx:1618` | 插入行内链接 |
| `useSlashCommandController.ts:591` | 改写作角色 |

**后果**：这样的组排在慢保存后面，或卡在 failures 依赖重试里（H:264-271）时，如果人走了一条扣不住的离开路（后退、地址栏、登录跳转、关页），`keepOpenEdit` 看不到它。

- 字只有在之后同一行还有入账的打字组时才保得住：那一组的 `after` 带着全文，起点取服务器文本（H:817）。
- 若这一组是那行最后一次改动，它的字就丢了。

**严重度**：比 Q2 低。单行原生粘贴走 typing，进账没问题；只有 flow 选区替换和插链接会落进这一类。

### Q4 确认（读码）：hash 没有前导斜杠时，谓词和路由不同判

- 路由读 hash 时，若路径不以 `/` 或 `.` 开头，会补一个 `/`（router:278-279）。所以 `#notes/<id>` 就是本篇。
- 谓词这边：R:17-25 不补斜杠，得到 `notes/<id>`；R:28-31 的正则要求以 `^\/notes\/` 开头，判成不是本篇。

**后果**：

- 在 R:279-288 被扣下 → flush → `goHeld` 回到同一篇 → `released` 卡在真。这是 P3 / N2 的形。
- `#login` / `#register` 同理：R:32-34 不算登录页，被当成普通离开扣留，不走 keepAndLeave。

只有人手改地址、或者某个链接写成 `href="#notes/..."` 才会触发。应用内的链接都是规范形。

### Q5 🅱（④）：P1 的红测试只守到适配器，没守 controller → HSC 这一跳

**P1 红测试**（A.test:1197-1227）：

- 只断言适配器的 `recoveryReceiptsKeptWordsWaitFor` 里有 block-1。
- 测试自己也写了 `?? blockEditRecoveryReceipts` 回退，所以字段消失时这条会红。这一点是好的。
- 但 C:417-419 这一跳没有红测试：
  - 那里同样有 `??` 回退和 `isVisitReceipt` 过滤。
  - 若 C 退回 r3d 的 `offeredRecoveryReceipts`，本包里的测试我读不出会有哪条变红（未跑）。
- 这和 N5 heldhead 属同一类接缝：带回退的可选读法跨组件。

**谓词单测**（R.leave.test:469-476）：期望值都是手写常量，没有对照路由（`matchRoutes` / `createHashHistory`）取值，所以抓不到 Q4 这类漂移。

**建议**：

- 地址形状做成一张表，每形用路由自己算出「是不是本篇」，再和谓词比。路由升级时漂移就由机器抓。
- P1 补一条穿过 controller 的测试，或者做变异对照：把 C:417 改回 r3d 的写法，看有没有测试变红。

---

## 观察（不列为发现）

- **O1 ① 漂移 (b)**：A:2158 在 A:2159 的 reconcile 读回之前就忘掉了 R1，而操作此时还登记为 applying，所以读回期间 HSC 已经放开。
  - 进这条分支的前提有两种：
    - `!operationIsLatest()`：已有同块后发操作，R1 早已被它顶掉，这就是 Q1。
    - `!requestIsCurrent()`：路由或 hydration 变了。路由变了 HSC 已卸载；同篇重新 hydration 时，块按读回时刻的服务器内容重载。
  - 这一分支里服务器已有 aaa（返回的块和发出的一致），后续保存按重载时取到的基准走，最坏是 409 成冲突项。没找到静默丢字。
- **O2 ③**：路由会把参数里的 `%2F` 还原成 `/`（router:1063），谓词比的是原串。只有 id 里含 `/` 时两边才不同；现行 id 不含 `/`，到不了。
- **O3 ②**：后一组把某个单元合掉之后，`ends` 里该单元的旧条目不清除（H:784-801 只遍历 after）。结果框里会有重复的 split 记录，比如 Z 同时出现在合并后那行和被合掉那行。只是重复，不丢字；r3 起就有，🅱。
- **O4 ①**：C:417-418 的 `??` 是接缝回退，和 `?.()` 同类。现在字段在 A:3116 的返回对象里（A:3135），适配器测试也守着字段存在。只提醒：以后若改名，这里会悄悄退回 r3d 的行为。

## 逐条核对

### ① P1 窄补：逐跳与漂移清单

**逐跳**：

| 跳 | 位置 | 内容 |
|---|---|---|
| 登记 | A:2111-2116 | `applying: !!options.recoveryKey` |
| 计算 | A:645-648 | 在途且 applying 的 key 并回列表 |
| 暴露 | A:3116 / :3135 | 返回对象 |
| 解构 | C:141 | |
| 传递 | C:417-419 | `isVisitReceipt` 过滤 |
| 接收 | HSC:156 | prop |
| 读取 | HSC:174 | 每拍从 `latest.current.recoveryReceipts` 读 |
| 扣留 | HSC:583 | |

没有 memo，也没有依赖数组，每次渲染重新算。

**带 recoveryKey 的调用方**：整个 client 只有两处，Apply（A:2299）和 Replay（A:2368）（共享树全仓 grep，测试除外）。history 的保存不传 recoveryKey（H:304-309）。

**回执 key**：每次操作唯一（`draftBlockPersistence.ts:150-157`，含 mountNonce / generation / sequence）。visit 回执只由 history 自己的失败保存登记（H:325-327），所以 Apply / Replay 的回执永远不会被 C:419 滤掉。

**Main_Designer 点名的五种漂移**：

| 漂移 | 结论 | 依据 |
|---|---|---|
| dismiss 在途 | 不存在 | dismiss 是同步的（A:2393-2398）；R1 在途时 R0 已被删，R1 又因在途被队列隐藏，人点不到它 |
| reconcile :2158 / :2161 在途 | 早放，但不静默丢 | 见 O1 |
| 401 中途 | 保守 | 走 catch：A:2231 重新登记时不带 pending key，R1 在两张列表里都可见，照扣；离开走登录页，keepAndLeave 后卸载 |
| catch 重新登记 A:2231 到读回之间 | 保守 | 同上，R1 可见，照扣；finally（A:2253）之后 R1 仍以提供身份留着 |
| latest 覆盖的那一帧之外 | 无危险方向的帧 | 写回执（A:2031）到登记（A:2111）之间没有 await（A:1900-2111 只有 A:2071 一个 await，在 `reconcileIssuedSave` 的函数体内，此时不执行）；放开只经两条路：存储里忘回执（在 try 里，先于 finally）、finally 删登记。陈旧帧读到的都是更早、更全的列表，偏扣不偏放 |

**第三种漂移**：同块后发保存把 applying 回执顶掉，见 Q1。块转换（A:2466-2468、:2519-2520）是同族的另一个入口。

### ② P2 乙（H:798）与 M1 / N1 / 交接 2 的交集

| 情形 | 走哪张账 | 结论 |
|---|---|---|
| 回车新长出的行（含复用旧 id） | `unsentSplits`（H:693）→ 加入 joined（H:798）→ split 记录（H:808-815） | 成立；P2 红测试守 |
| 多行粘贴新长出的行 | 同上 | 成立 |
| 多行粘贴时被劈的那一行 | 被 `cutText` 吞掉 | **Q2** |
| HSC 经 history 新建单元 | `isSplit` 认的是「after 里有 before 没有的 id」（H:180-183，before 含 deleted），任何新 id 都会被认出 | 成立；HSC 自己的结构窗口留字路径未深挖，不在 r3e diff |
| 同一组里先建后删 | after 里没有该单元，跳过；字随删除而去，是人的操作 | 成立 |
| 跨组：先建、后打字 | `joined` 是整次扫描共享的一个 Set（H:782），后续打字仍按 split 处理 | 成立 |
| 跨组：先建、后合掉 | 见 O3 | 只重复，不丢 |
| 撤销 / 重做 | 自己不入账，走 `persist(historyRestore)` 直接交出。交出时从账上摘下（H:294-298）与把草稿恢复成那一侧（H:285-289）在同一段同步代码里（从 H:285 到 H:304 的 await 之间），屏和账一起翻 | 未找到缺口 |
| 单元集合不变的结构组 | 不进任何账 | **Q3** |

### ③ 谓词与路由逐形同判

| 地址 | 路由 | 谓词（R:17-31） | 同判 |
|---|---|---|---|
| `#/Notes/A`、`#/NOTES/A/` | 本篇（`i` 标志，router:1112；尾斜杠 `\/*$`） | 本篇（正则带 `i`；尾斜杠被 R:24 去掉） | ✓ |
| `#/notes/a`（本篇是 `A`） | 参数 `a`，另一篇 | `a !== A`，离开 | ✓ |
| `#/notes%2FA` | 一段 `notes%2FA`，不匹配 | 逐段解码后 `/` 还原成 `%2F`，离开 | ✓ |
| `#/notes/A%2F`、`#/notes/A%2f` | 参数 `A/`（router:1117、:1063），另一篇 | `A%2F`，离开 | ✓（O2） |
| `#/notes/A/`、`#/notes/A//` | 本篇 | 本篇 | ✓ |
| `#/notes/A#x`、`#/notes/A?q`、`#/notes/A#x?q` | parsePath 先切 `#` 再切 `?` | 在第一个 `?` 或 `#` 处切 | ✓ |
| `#/notes/A%23x` | 参数 `A#x` | 解码成 `A#x`，离开 | ✓ |
| `#/notes/`（空 id） | 不匹配本篇 | 离开 | ✓ |
| `#/notes/A/x`（多一段） | 不匹配（App.tsx:111 下没有子路由，`*` 回首页） | 离开 | ✓ |
| `#/notes//A`、`#//notes/A` | 不匹配 | 离开 | ✓ |
| 坏的百分号编码 | 整串原样返回（router:1116-1120） | 整串原样（R:21-23 catch） | ✓ |
| `#notes/A` | **补 `/` 后是本篇**（router:278-279） | 离开 | ✗ **Q4** |

**反向归零**：没找到谓词判本篇而路由判别处的形状。两边的解码逐字相同，谓词只比路由多一步「去尾斜杠」，而这一步路由的正则 `\/*$` 本身就容许。

### ④ 红测试断的是行为还是形状

| 测试 | 断什么 | r3d 上会红吗（读码推） |
|---|---|---|
| P1：A.test:1197-1227 | 只断到适配器列表，不断 kept 字是否被扣、aaa 是否保住 | 红：r3d 的回退列表会滤掉在途回执。不守 C 这一跳 → Q5 |
| P2：H.test:1054-1087 | 行为：凡含 Z 的记录都不能用 `mergeTypedText` 合进 `cd`；`withZ.length > 0` 防空转 | 红：tu-2 得到 edit 记录，起点为 `cd` |
| P3：R.leave.test:449-457 | 行为：导航事件没被拦、没有 flush / keep | 红：r3d 判成离开并拦下 |
| P4：R.leave.test:459-467 | 行为：被拦下，并且先 flush | 红：r3d 整串解码，判成本篇 |
| 第五条谓词单测：R.leave.test:469-476 | 形状：期望值手写 | — 见 Q5 |

### ⑤ 范围

- **文件**：7 个，见上表。HSC 与 r3d 逐字节相同；相对 `04f6f822` 的差异仍是 r3d 的 N6 一族。
- **适配器对 `04f6f822`**：+14 / -0。

  | 行 | 内容 | 归属 |
  |---|---|---|
  | A:530-531 | 类型字段 `applying?`（含注释） | applying 族 |
  | A:642-648 | 注释 3 行，加 `applyingRecoveryKeys` 与 `recoveryReceiptsKeptWordsWaitFor` 4 行 | applying 族 |
  | A:2116 | `applying: !!options.recoveryKey` | applying 族 |
  | A:2156-2158 | 注释 2 行，加 2xx 越过路由时忘回执 1 行 | r2 |
  | A:3135 | 返回 `recoveryReceiptsKeptWordsWaitFor` | applying 族 |

- **server**：`git diff 04f6f822 -- server` 为空，`git status -- server` 干净。

## 读法与边界

- 只读码，没有构建，没有跑测试，没有取锁，没有起子代理。「红」都是读码推出来的。
- 对照路由用的是共享树里的 `node_modules`（`@remix-run/router` 1.23.2）。
- 包外文件（`TextBlockProjection.tsx`、`textUnitEditorService.ts`、`NoteWritingSurfaceLayer.tsx`、`useSlashCommandController.ts`）按共享树读。`draftBlockPersistence.ts` 在包里，按包内版本读（它和共享树版本不同）。
- token 数：不可得。
