> **状态 (Status)**: active
> **层 (Layer)**: 审计 / Audit（Reviewer 发现，只出发现不裁定）
> **日期 (Updated)**: 2026-11-09

# A-25 r2 封前快照读 · Reviewer 发现

**总判：两条 🅰 候选（F1、F2），建议封前折进；其余不挡。**

- **F1**：②b 乙的「不弹 toast」也落在结构已经上屏、已入撤销账的情形。
- **F2**：重试在途时打的字，重试成功后既没人发，也不亮指示。
- 不变量 3（IME）成立；不变量 4（护栏）成立。
- 不变量 1 只有 F2 违反；另有两条疑似（F3、F4），均为 🅱。

**读码对象与口径**

- ops 包 `a25-r2-prepack-snapshot/src/`，`src.sha256` 本身的 sha256 = `52cb6ee5…`，7/7 核过；`pre-r2/` 4/4 核过，对它 diff。行号都对这份快照。
- 简称：H = `useTextFlowHistory.ts`，HSC = `useHeadingStructureController.ts`，D = `useDraftBlockController.ts`，R = `useRuntimeNaturalWritingController.ts`。
- 快照外的文件读共享树，单独注明。共享树没有 A-25，这里只引 A-25 没改的接线。
- 没跑测试，没构建。tokens：不可得。

## 发现

### F1 · 确认（读码）· 建议 🅰 · ②b 乙：结构内层 flush 抛的 `FailedSaveHoldError` 也被静音，那时编辑已上屏、已入账

**不变量**（裁定原文）：拒键 = 不上屏、不入任何账（与修前同），只少 toast。

**反例**：`FailedSaveHoldError` 有两个抛点，乙只按其中一个设计。

1. **外层（builder 说的那个）**：`runStructureBatch` → `flush()`（H:1370）。它在 `runBatch` 之前抛，什么都没应用，符合不变量。
2. **内层（漏掉的那个）**：结构操作体里 `applyEdit` 之后的 `await api.textHistory.flush()`（HSC:429）。

**触发序列**（块 X 修前没有任何失败）：

1. 在 X 里按下会走结构路径的键，比如标题行的 Enter。
2. `runStructureBatch` 的外层 flush 通过。
3. `applyEdit`（HSC:420–422）把结构编辑写上屏：
   - 结构记录立即封口（共享树 `textFlowEditSession.ts:110`、`:141`）；
   - `onSeal` 走 `pushEntry` → `reserveBatch`，批次条目进入撤销栈（H:989–993）；
   - 同时把这次保存排进写道。
4. 这次保存失败（500 或断网），X 进入 `failures`。
5. HSC:429 的 flush 等写道空闲后发现 `failures` 有 X，抛 `FailedSaveHoldError([X])`。
6. `runBatch` 只有 try/finally（H:992–995），异常原样冒到 HSC:491。X ∈ `touched`，于是 :496 跳过 `onFailure`。
7. 结果：
   - 结构只做了一半：标题角色已应用，拆块（:432 起的 `extractUnit` / `moveUnit`）没做；
   - 屏上和撤销栈里都有这一步；
   - 修前这里会弹「Heading changes could not be completed. Undo…」，修后只剩 X 的「未保存 · 重试」指示。
   - 退避重试成功后，服务器存下的就是这个半成品结构（标题没有独立成块），全程没有任何提示让人撤销。

**builder 的说法哪里不成立**：

- 他说「:485 走不到这一拒（flush 抛在 applyEdit 之前，runBatch 不接异常）」。前半句只对外层 flush 成立。内层 flush 在 applyEdit 之后，而 runBatch 不接异常这一点，恰好把它送进了 :496。
- :485 本身确实走不到（`FailedSaveHoldError` 只抛不返回 false），这部分成立。

**测试缺口**：`useHeadingStructureController.test.tsx:1799` 起的两例都是「先让块持失败，再按键」，只走外层抛点。

**建议改法**（供裁）：只在「操作体还没开始」时静音。

- 例如在 HSC 的批次操作体第一行置 `let applying = true`，:496 的条件加上 `!applying`；
- 或者 `runStructureBatch` 把外层 flush 的拒绝包成单独的类型。

**补一例红测**：结构编辑自身的保存失败 → `onFailure` 恰好 1 次。

### F2 · 确认（读码）· 建议 🅰 · 不变量 1：重试在途时打的字，成功后既没人发，也不亮指示

**不变量**：每个有未发字的失败块亮自己的指示；失败由退避带走。

**触发序列**（X 已在 `idleFailedBlocks` 或 `failures` 里）：

1. 退避到点，`retryFailedBlock(X)` 在写道里读出当时的打开组（H:288，`session.peek()`），封口失败那支则读整屏（H:295），然后发 PUT。网络刚恢复时，这个 PUT 可能要几秒。
2. PUT 在途时，人继续在 X 打字，之后停手超过 `IDLE_SAVE_MS`。
3. 空闲定时器到点。外层闸 H:834 判 `savePausedFor(X)` 为真，直接 `return`，**不重排**。只有 :837 那支会重排。
4. PUT 成功：
   - :440 清掉 X 的标记；`failures` 那支在 :431–435 删除；
   - :441 发现已无失败，取消退避；
   - `failedTypingBlockIds` 不再含 X，指示熄灭。
5. 第 2 步打的字还在打开组里，服务器没有。此后没有定时器、没有退避、也没有指示，只能等下一次按键或失焦。

**和 SAVEFAIL (c) 的关系**：k25a 的 B 就死在「定时器已触发过、只在打字时重排」这个机理上；按块闸把 B 救了，但同一机理换到 X 自己身上还在。封口失败那支修前就有同样的问题（整篇闸也是 `return`），空闲失败那支是 r2 新开的路。

**为什么现有测试没抓到**：H 测试 :1368 那例「a failed idle save is marked and asked again by the backoff」的第 2 次输入发生在重试之前，重试读到的打开组已经包含它。

**建议改法**（供裁）：二选一。

- 成功分支（:438–443）判一下：如果打开组还在 X 上，并且和刚发出的不同，就 `scheduleIdleSave()`；
- 或者外层闸在 `savePausedFor` 为真时也重排。代价是失败期间每 2 秒空转一次，在道复核 :843 会兜住，不会多发。

**补一例红测**：重试 PUT 挂住超过 `IDLE_SAVE_MS`，期间在 X 打字，放行后再停一次 → 断言末次保存是后打的字，且指示与服务器一致。

### F3 · 疑似 · 建议 🅱 · 空闲保存的 4xx 现在会把退避整篇停掉

- **现在**：H:445 让空闲失败也走 `typingSaveFailed`。它在 :306–307 遇到 4xx 就置 `saveRetryRefused = true`，这个开关是整篇的。修前空闲失败从不碰它。
- **触发序列**：
  1. Y 的封口保存 500，在退避里等。
  2. X 的空闲保存 409（块在服务器上被改过，比如另一台设备）。
  3. 整篇的自动退避停下，Y 只能等 `online` 事件、Retry 或别处一次成功的保存。500 变体没有 `online` 事件。
- **与不变量的张力**：「块 X 只在 X 自己失败时停，别块照常」。409 本来就是单块性质的；401 / 403 才是整篇性质的。
- **先例**：封口保存的 409 修前就这样，所以这是既有设计的范围被扩大了，不是新机理。
- **改法供裁**：409 不置整篇拒停（它本来也不会靠重试成功），或者拒停按块记。
- **另记**：r2 新测里「A's idle save failed」和「A's own pauses stay quiet」两例都用 409，恰好落在这个开关上。

### F4 · 疑似 · 建议 🅱 · 空闲失败的重试绕过了空闲保存自己的「别的事占着笔记」检查

- `idleSave` 在 :836–837 遇到 `replaying` / `templatePending` / `documentPending` / `proposalPending` / `canSaveWhileTyping() === false` 时改期。共享树 `useNoteCanvasRuntimeController.ts:400` 把 `canSaveWhileTyping` 接到「纸面忙、章节在移、标题结构忙」。
- `retryFailedBlock` 的空闲支（H:284–291）直接 `persist(open, …, idle=true)`，这些都不看。
- 它在写道内，所以与写道内的回放和结构不会交叠。走得到的前提是：章节移动或纸面操作不经写道，而 X 的打开组仍开着。这个前提没读到证据，所以只标疑似。
- 封口失败的重试支修前也绕过这些检查（A-25 ②a），所以这一条也是范围扩大。

## 逐条核对

### 1 · 按块闸

| 核点 | 结果 |
|---|---|
| persist :356：`idle && failedSaveOf(X)`，只看本块的封口失败 | 成立。空闲失败那本由外层闸和在道闸看；重试的空闲支故意绕过 :356，因为 X 没有封口失败 |
| 外层闸 :834 与在道闸 :843 用 `savePausedFor`，两本都看 | 成立。:834 剩下的 `templateFailures.size` / `documentFailures.size` 仍是整篇的，但这两种失败期间 `canApplyEdit` 为假（H:1049–1050），没有新字可存，不构成反例 |
| 封口复用空闲回执（:803）改为 `!failedSaveOf(X)` | 成立。空闲失败不改 `lastIdleSave`，复用只在服务器确有那份正文时发生 |
| 别块照发 | 成立（新测 :1326、:1341 两例） |
| 失败块亮自己的指示（:1376 并入 `idleFailedBlocks`；:445 → `typingSaveFailed` → `setFailureTick`） | 亮这一半成立；熄的时机见 F2 |
| 重试经同一写道（:276 `enqueueRuntimeHistoryOperation`），不成第二写者 | 成立 |
| 空闲失败仍不进 `failures` | 与裁定原文「失败就进 `failures`」字面不同，builder 已申报理由（打开组是克隆）。效果上：退避覆盖了它（:272–273）；离开时 `flush` 的 `boundary()` 会封口，封口保存的失败照常进 `failures`。没读到因此丢字的路 |
| 附带：r3e 旧测改用 409（:700） | 原不变量（停顿不重发、不扣住笔记、封口保存重试）仍被钉住，闸的代码与状态码无关。代价：500 下「停顿不重发」没有单独钉住，因为 500 时退避也会在 2 秒左右发，两者分不开。可接受 |

### 2 · ②b 乙

| 核点 | 结果 |
|---|---|
| 跳过 `onFailure` 没有连带跳过别的 | 成立。:493 `succeededFocus = null`、:497 `publishTextHalves`、:498 `exitQueue`、finally 的 `release` 都照旧 |
| 外层抛点：拒键 = 不上屏、不入账 | 成立。`runBatch` 没进，没有批次条目；窗里的字由 `exitQueue` → `placeTyped` 按修前路径放回 |
| 内层抛点 | **见 F1** |
| 他块持失败照旧弹 toast | 成立（`holds` 只比对 `touched`；测试 :1844） |
| :389 watchdog | 成立，是超时，与这次拒绝无关 |
| :485 `!succeeded` | 成立，`FailedSaveHoldError` 只抛不返回 |
| `documentFailures` 按 `edit.blockId` 展开（H:1353） | 成立 |

### 3 · IME（D :203–220、:583–591；R :448–449）

**结论：成立。**

| 核点 | 结果 |
|---|---|
| 组合中不触发 `persistDraft` | R:451，修前已有 |
| 组合中不追赶 | 循环顶 D:586 先看 `draftComposingRef`，在 :587 等组合结束 |
| 组合中不交接 | 跳出循环只在非组合的判定之后（:591）。到 `flushSync` 之间只有 `await Promise.resolve()`（:612），一个微任务，插不进输入事件 |
| compositionend 后追一次再交接 | 放行后 `continue`。版本号必然变过（每次 `setDraftText` 都 +1），所以至少存一次，再回到循环顶复判 |
| 落地回执的重发（D:488 `persistDraftRef.current()`） | 也走同一个循环，同样守组合 |
| 建块 POST | 只由非组合时的 `persistDraft` 发出；放置的 PUT 只带布局，不带文字 |
| 非 IME 打字的交接时序 | 不变。组合标志恒为假时，新循环与修前的 `while` 逐步等价；`setDraftComposing(false)` 在标志为假时什么也不做 |
| 重置时放行（`clearLocalDraft` :299–300） | 成立。先置 `draftActiveRef = false` 再放行，等待中的那一轮按 `requestIsCurrent()` 为假退出 |

**O1 · 卸载时放行**（:219–220）。注释说等待的那一轮「finds its request no longer current」，与代码不符：

- 卸载不改 generation、noteId 或 `draftActiveRef`，所以 `requestIsCurrent()` 仍为真。
- 真正挡住发送的是下一跳：`saveBlock` 是 history 包过的那个（共享树 runtime :404 解构、:429 传入），它的 `boundary()` 在作用域卸载后返回 false，保存被拒（H:1298）。
- 所以组合中的文本不会上服务器，不变量成立。但它靠的是另一个 hook 的卸载，换一个 `saveBlock` 就会失守。
- **字去哪**：
  - 组合中的文本没有落脚处。它还不是字，可以接受。
  - 上次保存之后、组合开始之前打的普通字也一起丢失：草稿还没交接，不在 `blockTextFlowDrafts` 里，离开时的 keep 看不到它们。修前它们会随拼音一起被存上去。
  - 触发窗很窄：要在组合中卸载，并且没有 compositionend；点击离开会先 blur，blur 会结束组合。
- **建议**：卸载清理里同时 `requestGenerationRef.current += 1`，让注释为真。🅱。

**O2 · 前提不在快照里**：放行依赖草稿框在**每一种**组合结束（提交、Esc 取消、blur、值未变）时都以 `composing: false` 调 `handleDraftChange`。`DraftBlockEditorLayer.tsx` 不在本快照里，A-25 先前的快照也没有它。

- 如果有一种结束路径不调，循环就会永远等着：块已建，不交接，新键一直留在草稿里。
- 请 builder 在回执「代码回答」里给出那几行的行号。

### 4 · 护栏：同一块在途 ≤ 1

**结论：成立。**

- 测试在 H 测试 :1390 起，四种触发都在：失焦（:1405）、定时器（:1408 等两轮退避）、online（:1406）、Retry（:1407）。断言在途恒为 1、调用数不增。
- 读码：失焦 → `saveBlock`（:1297 → :1327）、退避 → :276、online → :1007、Retry → :1378，四条都进同一条写道。

**O3**：护栏只钉了封口失败的重试。空闲失败的重试（:284–291）也在写道内（读码确认），但没有测试。🅱。

**O4**：两处删除空闲标记的地方（:272 块已不在、:289 打开组已不在 X）都不触发 `setFailureTick`，指示会留到下一次重绘才熄。

- 封口复用空闲回执（:803）的那条路也不清 X 的空闲标记，要等下一轮退避在 :289 才静默清掉。
- 两者都只影响显示，并且很少走到。🅱。

## r3 delta（2026-11-09 追加）

**总判：不挡。** F1–F4 四处改法都成立，O1、O2 都已落实，没有新的 🅰。只多一条 🅱 观察（R1）。

**读码对象与口径**

- ops 包 `a25-r3-prepack-snapshot/src/`，`src.sha256` 本身的 sha256 = `982e9916…`，6/6 核过。
- `r2/` 5/5 核过，并且与 r2 快照逐字节相同，所以本节只读 r2→r3 的 diff。
- `useRuntimeNaturalWritingController.ts` 不在 r3 里，按未改处理。
- 行号对 r3 快照，简称同上文。没跑测试，没构建。tokens：不可得。

### 逐条核对

| 项 | 改法 | 核 |
|---|---|---|
| F1 | HSC:411 `bodyStarted`；:421 在批次操作体第一行置真；:500 只在 `!bodyStarted` 时静音 | **成立**。外层抛点（`runStructureBatch` 的 flush）在操作体之前，仍然静音。内层抛点（:429 起的 flush）在置真之后，照常弹 toast。`runBatch` 在操作体之前只会 `return false`（H:991 起），走 :485，不经 :500。新测 HSC 测试 :1861 走的正是内层抛点（结构自身保存 500 → `onFailure` 恰好 1 次） |
| F2 | H:451 `blockWasFailing` 在删除之前取值；:463–468 若本块不再暂停，且打开组仍在本块、又与已发的不同，就 `scheduleIdleSave()` | **成立**。只在本块所有失败都清掉之后重排：:455 恢复支一并清；非恢复支若还剩更早的失败，`savePausedFor` 仍为真，等那一发成功时再判。比较对象是本次实际发出的 `sent`。判错成「不同」最多多发一次相同正文，不会少发。新测 H 测试 :1451 用挂住 PUT 的时序复现了原反例 |
| F3 | H:255 `refusedBlocks` 按块；:271 定时器只在有未被拒的失败块时起；:293 定时器跳过被拒的块，Retry 与 online（`now`）问全部；:325 4xx 只拒本块；:459 本块成功即解除 | **成立**。X 的 409 不再停掉 Y 的退避（新测 :1385） |
| F4 | H:260 `noteBusyForSave()` 与空闲保存的改期条件相同，另加「组合中」（共享树 `textFlowEditSession.ts:149–150` 的 `peek({ duringComposition })` 语义吻合）；:287 忙就 `deferSaveRetry`；:279–282 隔 `SAVE_RETRY_START_MS` 再看，不推进退避节奏 | **成立**。改期保留 `includeRefused`，所以 Retry / online 被推迟后仍问全部。新测 :1477（`canSaveWhileTyping` 为假）、:1501（组合中）两例。没读到会把笔记一直判为忙的路径（标题结构的 flush 不等这次重试，不会互等）；章节移动和纸面操作在快照外，未逐行核 |
| O1 | D:219–221 注释 | **成立**。现在的说法与代码一致：卸载后请求仍是 current，是 history 的 boundary 拒发 |
| O2 | `DraftBlockEditorLayer.tsx` :86 compositionstart 置标志；:87–91 compositionend 每次都不带 input 调 `onChange`，值变不变都调；:93–95 普通 change 只在组合中才带 `{ composing }` | **成立**。因此 R:449 的 `setDraftComposing(false)` 在每次组合结束都会被调用，等待者必定放行。:94 还用 `isComposing` 兜底 compositionstart 之前的 input |

### R1 · 观察 · 建议 🅱 · `refusedBlocks` 只在本块保存成功时解除

块的失败还会经别的路径消失，这些路径都不清它的拒停标记：

- 被拒的提议补丁（H:801–804 删 `failures`）：提议被拒多半是 4xx，所以会先在 :325 置拒停；
- 块已不在（:289）；
- 打开组已不在本块（:307）。

**后果**：这个块之后若再出 5xx，自动退避会跳过它，只有 Retry、online 或它自己下一次成功的保存能救。指示照常亮，字不会丢。

**影响面**：比 r2 的整篇拒停窄，与 F3 想去掉的是同一类，只是留在了单块上。

**改法供裁**：块不再有任何失败时（上述删除点和空闲标记的两处删除）一并 `refusedBlocks.delete`；或者把拒停记在失败条目上，不记在块上。

### R1 折进核（2026-11-09 追加）

**结论：成立，不挡。**

**读码对象**：同一快照原地更新。`src.sha256` 本身的 sha256 = `e7bb3ee6…`，6/6 核过。builder 报只有 H 和它的测试变了，本节只读 R1 的几行和那例测试。

| 处 | 核 |
|---|---|
| H:256–257 `settleRefusal` | 只在 `!savePausedFor(blockId)` 时解除拒停，即两本账（`failures`、`idleFailedBlocks`）都没有这个块时。块若还有别的封口失败，拒停留着，正确 |
| H:292（块已不在） | 先删空闲标记，再 settle。若这个块还有封口失败，拒停保留；块已不在，这个 id 不会再被问到，无害 |
| H:311（打开组已不在本块） | 删除后 settle，正确 |
| H:806（被拒的提议补丁） | 失败分支先在 :329 按 4xx 置拒停，这里删失败后 settle，正确 |
| 红测 H 测试 :1528 | 走的是 :311 这一跳：X 409 → 拒停；打开组退回原文，失焦后不再有打开组；Retry 走到 :311；X 之后 500，退避照来，末次保存为 `original b`。修前因拒停残留而不重试，红的原因对 |

- **测试缺口（🅱）**：:292 和 :806 两处没有单独的测试。它们与 :311 是同一行调用，读码已核。
- **小瑕疵**：测试注释两处写 `:307`，现在的行号是 :311（R1 加行后下移了）。只是注释，不影响什么。
- **O4**：仍然开着（这几处删除不重绘指示），测试里已注明。

### O4 折进核（2026-11-09 追加）

**结论：成立，不挡。**

**读码对象**：同一快照再次原地更新。`src.sha256` 本身的 sha256 = `dc39679a…`，6/6 核过。本节只读 O4 那几行和那条断言。

| 处 | 核 |
|---|---|
| H:258–260 `failureGone` | 先 `settleRefusal`，再在 `current()` 时 `setFailureTick` 重绘。用它替换了 R1 的三处调用（:295 块已不在 / :314 打开组不在本块 / :809 被拒的提议补丁），三处都在删除之后调用。:295 在循环里可能连调几次，React 会合并重绘，无害 |
| H 测试 :1548 | 断言 Retry 走到 :314 之后 `failedTypingBlockIds` 为空，修前因不重绘而红。注释行号已改成 :314 |

**残余（🅱）**：我原 O4 第二点提到的封口复用空闲回执那条路（`lastIdleSave` 复用分支），仍然不清这个块的空闲标记，要等下一次走到 :314 才清，现在清时会重绘。

- 若这个块此前是 409（被拒停），退避会跳过它，指示要亮到 Retry 或 online。
- 触发需要：先一次空闲保存成功，再一次空闲保存 409，然后改回到第一次的文字再封口，很少走到。
- 记一笔，不建议为它再动包。

### ②b 乙浏览器形核（2026-11-09 追加）

**结论：改法成立，但不变量「静音 ⇔ 这一块屏上有常驻指示」只对四种失败中的两种成立。**

**读码对象**：同一快照再次原地更新。`src.sha256` 本身的 sha256 = `5f3e4c6c…`，6/6 核过。本节只看 HSC:501、H:1414 `holdsFailedSave` 和 HSC 测试 :1885 起的三例；四种失败各自在屏上显示什么，读共享树的接线（A-25 没改这几处）。

**改法本身**

- 改为按账判断、不看异常类型，与 builder 的诊断一致：浏览器里拒绝发生在 HSC:415 `whenWritesIdle`，早于 flush。
- `!bodyStarted` 保留，F1 的修正不受影响。
- 三例测试走的正是浏览器那一跳：`whenWritesIdle` 以 AxiosError 形的错误 reject；本块持失败 → 不弹；别块持失败 → 弹一次；无人持失败 → 弹一次。

**四种失败逐一对照：有没有常驻指示**

| `holdsFailedSave` 数的失败 | 屏上显示什么 | 静音 ⇔ 指示亮？ |
|---|---|---|
| typing（`failures`） | `failedTypingBlockIds`（H:1410）→ 块上常驻「未保存 · 重试 / 复制」 | 成立 |
| idle（`idleFailedBlocks`） | 同上，:1410 已并入 | 成立。builder 问的那一件：纯空闲失败时 flush 不抛，但 `whenWritesIdle` 会 reject，此时这一块的指示亮着，算「持失败」，判断对 |
| template（`templateFailures`） | **没有块级常驻指示**。只有两处变化：H:1423 `replaying` 为真 → 共享树 runtime :672 让整篇 `contentReadOnly`；`recoveryBlockIds`（H:1418）→ 共享树 `NoteWritingSurfaceLayer.tsx:1983` `allowSaveRecovery` → 控制条按钮的提示从「Save block」变成「Retry saving block」（`BlockControlBarLayer.tsx:155`），只是一个 title，不是常驻提示 | **不成立** |
| document（`documentFailures`） | 同 template | **不成立** |

**template / document 能不能走到这个 catch**：

- 编辑面会变成只读（runtime :672），所以键盘大多进不来。
- 但 HSC 自己的 `readOnly` 只接 `sourceProjectionPolicy.contentReadOnly || chapters.isMoving`（共享树 runtime :410），不含 `textHistory.replaying`；`canUseHeading`（HSC:326）也不看历史失败。
- 所以经别的入口（菜单或命令调 `onHeadingStructure`）仍可能进来，然后被 `whenWritesIdle` 或 flush 拒掉，再被 :501 静音。块上没有常驻指示，这就成了无提示的拒绝。入口有没有、是哪个，没逐一核。

**建议**（供裁）：把 :501 的判定收窄到亮指示的那两种，即 `holdsFailedSave` 只读 `failures` 与 `idleFailedBlocks`，与 `failedTypingBlockIds` 同源。

**补测**：template 或 document 失败的块被结构拒绝 → 弹一次 toast（修前修后行为由收窄决定）。

**附：一条成立的时序**。结构键恰好在本块那次保存在途时按下，`whenWritesIdle` 的 reject 可能先于 persist 的 finally 记账（适配器那一侧的 await 链更长），这时 `holdsFailedSave` 为假 → 弹一次。那一刻指示也还没亮，所以「静音 ⇔ 指示亮」在这里同样成立。只是首键会弹一次，之后的键静音。没量过，是读码推断。

### 收窄那一行核（2026-11-09 追加）

**结论：成立，不挡。**

**读码对象**：同一快照再次原地更新。`src.sha256` 本身的 sha256 = `2457c771…`，6/6 核过。

| 核点 | 结果 |
|---|---|
| 同两本账 | H:1415–1416 `holdsFailedSave` 只读 `idleFailedBlocks` 与 `failures` 的 `blockId`；点亮条件 H:1410 `failedTypingBlockIds` = `failures` 的 `blockId` ∪ `idleFailedBlocks`。两边逐项相等 |
| 读的时刻 | 判定在 HSC:501 的 catch 里读当时的账；指示反映最近一次渲染。增删两边都会重绘：失败分支经 `typingSaveFailed` 重绘，成功分支在有失败时重绘，`failureGone` 也重绘。所以两边最多差一次尚未提交的渲染，不会长期不一致 |
| HSC:501 判定 | 仍为 `!bodyStarted && holdsFailedSave(touchedBlockIds())`，F1 的修正保留 |
| 新护栏 HSC 测试 :1945 | 本块 template 转换失败（不亮指示）→ 照弹一次。收窄前红、收窄后绿，红的原因对。注意：这例只断言 `failedTypingBlockIds` 为空，没有直接断言 template 失败已记账；「收窄前红」间接证明了它 |
