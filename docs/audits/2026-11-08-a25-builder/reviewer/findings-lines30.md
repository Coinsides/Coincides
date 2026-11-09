> **状态 (Status)**: active
> **层 (Layer)**: 审计 / Audit（Reviewer 发现，只出发现不裁定）
> **日期 (Updated)**: 2026-11-09

# A-25 验收红 `D:lines30-1` · 不变量读 · Reviewer 发现

**总判：这一红不由 A-25 引起。**

- 不变量要过的每一跳上，A-25 改动在本臂条件下（CDP 真键、无输入法组字、无保存失败）与 `dfbcce8e` 逐跳等价：没有拉宽窗，也没有改交接或重发目标的选法（L1）。
- 但这条不变量在改前就没有代码保证。我读到三处能破它的路（L2–L4），改前改后完全相同。
- 现场形能按键逐步复原（L2）。机理是**交接时光标落在首单元的 offset 0**，不是在途键被重发到别的单元。
- 首单元空，是 `aa` 被挪走了，不是草稿没持久化（见文末）。

**读码对象与口径**

- 包 `<ops>/packages/a25-ime-save-failure/src/`，`src.sha256` 本身的 sha256 = `08d0cb0d…`，19/19 核过。
- 对照：共享树客户端源码，与 `dfbcce8e` 无差异（`git diff dfbcce8e -- client` 为空）。
- 行号对包内 `src/`；标「基」的对 `dfbcce8e`。
- 简称：D = `useDraftBlockController.ts`，R = `useRuntimeNaturalWritingController.ts`，DB = `DraftBlockEditorLayer.tsx`，BEL = `BlockEditorLayer.tsx`，TBP = `blocks/TextBlockProjection.tsx`（不在包内，共享树 = 基），H = `useTextFlowHistory.ts`，A = `useNoteCanvasDataAdapter.ts`。
- 按 Main_Designer 更正，「块」读作同一块内的文本单元（`tu-1`…`tu-5`）。
- 没跑测试，没构建，没看 Tester 的时间线（各读各的）。tokens：不可得。

## 先说一个读码事实：单元 id 是按行位置确定的

- `createTextBlockContentV1` 第一单元恒为 `tu-1`（`textFlowService.ts:119`）。
- `splitTextUnitForEnter` 给切出的后半段取下一个号（`textUnitEditorService.ts:169`）。
- 所以 `draftTextFlowFromText`（D:60–68）对任何文本都给出 `tu-1…tu-N`，第 N 行就是 `tu-N`。
- 两份行数不同的草稿流，前几个 id 相同。下文「按 id 找单元」都要放在这个前提下读。

## L1 · 确认（读码）· A-25 改动不碰这条路径

| 跳 | A-25 改了什么 | 本臂条件下 |
|---|---|---|
| DB 草稿框 | :86 `onCompositionStart`；:87–91 `onCompositionEnd`；:94 `composing` 取 `composingRef` 或 `isComposing` | CDP `keyDown` 带 text 不产生组字事件，`composing` 为假，:95 第 4 参为 `undefined`，与基的 `onChange` 同参同序 |
| R:449 `setDraftComposing(false)` | 新增 | `draftComposingRef` 本就为假，D:213 不进 release 支，空操作 |
| R:451 建块条件 | 加 `!input?.composing` | `input` 为 `undefined`，条件与基相同 |
| D 追赶环 :585–611 | 基 :563 `while (current && saved !== rev)` 改为 `for (;;)`，先等组字，再 `break` | 组字标志恒假时，与 `while` 逐次等价：同样的检查，同样的退出点 |
| D 交接 :614–664（基 :584–634） | 无改动 | 读选区（:630–631）、`flushSync` 挂载（:650–660），逐字节与基相同 |
| D 回执重发 `handleDurableFocusReceipt` :478–499（基 :456–477） | 无改动 | 重发目标、采纳的流（`draftFlowForText(draftTextRef.current)`）与基相同 |
| D :222 卸载时 release；:302 `clearLocalDraft` 里 release | 新增 | 没有等待者时空操作 |
| BEL autoFocus 接收 :403–431（基 :397–425） | 无改动（BEL 的 7 行只接指示） | 相同 |
| H 空闲保存与失败 | :381 / :868 / :877 / :837 从整篇 `failures.size` 改为本块 `failedSaveOf` / `savePausedFor`；新增重试、拒停、`setFailureTick` | 整篇无失败时两种判法都为假；新增分支都要先有失败才进。本臂「无恢复事件、revision 与绿行同」，不进 |
| H `saveBlock` :1358–1362 | 只改有失败那一支（改走 `retryFailedBlock`） | 无失败时走 :1363 / :1367 两支，与基相同 |
| A | `quietFailure` 只影响失败 toast（:2338）；决定 3 只在路由已离开时生效（:2261）；(iv) B 的槽键只改回执键（:2093–2101）；(ii) 只在开笔记时判别次回执（:820）；D 合并只在 409 之后（:2410 起） | 都不在成功路径上改正文、改权威、改焦点 |

**结论**：A-25 前后，草稿 → 交接 → 编辑器接收这条链是同一份代码。窗没有变宽，重发目标的选法没有变。若红率前后真有差，只能来自时序本身（包大小、渲染负载的微小漂移），不是新路径。

## L2 · 现场形复原 · 机理是交接时光标落在 `tu-1` 的 offset 0（推断，逐键可复原）

**前提**：交接发生在草稿只有 `aa` 时（第一个回车之前），且持久编辑器接到的光标是 `tu-1@0`，不是 `tu-1@2`。

此后的键全部打进持久编辑器：

| 键 | 单元 |
|---|---|
| （交接）`tu-1@0` | `["aa"]` |
| Enter（在 offset 0 切） | `["", "aa"]`，光标 `tu-2@0` |
| `bb` | `["", "bbaa"]` |
| Enter | `["", "bb", "aa"]` |
| `cc`，Enter | `["", "bb", "cc", "aa"]` |
| `dd`，Enter | `["", "bb", "cc", "dd", "aa"]` |
| `ee` | `["", "bb", "cc", "dd", "eeaa"]` ← 与现场 DOM 和服务器逐字相同 |

我试过的其他起点都对不上现场形：

- 交接在 `aa\n` 而光标在 `tu-1@0`，会多出一个单元；
- 交接在 `a`，`a` 会被拆开；
- 光标在 `tu-1@2`，就是正确结果。

**光标从哪来**：

- D:630 `rawStart = draftRef.current?.selectionStart ?? draftText.length`：交接时从 DOM 现读草稿框的选区，不是最后一键的光标。
- D:632 `draftCaretInFlow`（:78–82）给的 offset = 光标所在行在光标前的长度。草稿为 `aa` 时 offset 0 ⇔ `rawStart === 0`。
- 交给编辑器后，BEL:427 只把它夹在单元长度内，不会把 0 改成别的值。

**`rawStart` 为什么会是 0：未找到。** 读码能指出的可能有两条，交给时间线去对：

- **(a) 读选区的对象不是刚收键的那个框**：`draftRef` 指向的元素若刚重挂过，或者选区被程序复位过，它的 `selectionStart` 不代表最后一键的位置。D:630 没有任何旁证去核这个读数，比如与 `draftText.length` 或 `onChange` 带来的 caret 对比。
- **(b) 交接选区根本没被应用**：BEL:406–410 发现焦点已经在本块内，就直接 `return`，不设选区。这时光标在哪，取决于是谁先把焦点放进了 `tu-1`。只要有别的路径先把焦点放进 `tu-1` 的开头，D 的选区就被跳过。

**为什么红率低、只在 gap 30**：读码推不出频率，只能说窗口的形状。D 的追赶环只在某次保存往返期间没有新键时才交接（D:593）。gap 30 下，能交接在 `aa` 的机会只有回车前那 30 ms；能否落在 offset 0 还要叠加 (a) 或 (b)。没量过的不下结论。

**建议给 builder 时间线的两个读点**：

- 交接那一刻 D:630 读到的 `rawStart`，以及 `draftRef.current` 是不是收键的那个元素；
- BEL:406 那一刻 `document.activeElement` 是谁。

## L3 · 疑似 · 建议 🅰 候选（改前即有）· 回执单元不在本块时，焦点落到首单元

- **位置**：BEL:424 `const textarea = receiptTarget || textareaRef.current`。`textareaRef` 只挂在下标 0 的单元上（TBP:1800）。
- **条件**：回执单元在编辑器的 `textFlow` 里找不到，并且不是「还没渲染出来」（:421–423 只等「还会来」的单元）。这时焦点改去 `tu-1`，offset 取回执的值，夹到 `tu-1` 的长度。
- **违反**：「交接不改变键的归属单元」。回执说 `tu-N`，键却进了 `tu-1`。
- **触发序列（读码构造）**：
  1. 交接回执为 `tu-2@0`（草稿 `aa\n`）。
  2. `flushSync`（D:650）与 BEL 效应之间，权威的流半边被换成不含 `tu-2` 的流，例如一次只有 `tu-1` 的发布。
  3. BEL 落到 `tu-1@0`，此后的键进 `tu-1`。
- 它给出的光标正是 L2 需要的 `tu-1@0`；但我没找到能同时保住那次回车的路径，所以单独列出，不算作 L2 的解释。

## L4 · 疑似 · 建议 🅱（改前即有）· 回执迟到时，重发采纳了新文本，光标却还是旧的

- **位置**：D:478–499。回执到时若草稿 revision 已变，就把 `draftFlowForText(draftTextRef.current)` 采纳进权威（:486–488）并重发（:490）。但编辑器的光标已按旧的 `reconciliation`（D:641–647）放下，没有随新文本移动。
- **触发序列**：
  1. 交接在 `aa`，回执 `tu-1@2`。
  2. BEL 因单元未渲染而等待（:423 `return`）。
  3. 等待期间回车落进草稿框，草稿变为 `aa\n`。
  4. 回执到达，权威变为 `["aa", ""]`，焦点却在 `tu-1@2`。
  5. 下一个 `b` 进 `tu-1`，得到 `"aab"`，而人以为自己在第 2 行。
- **违反**：「交接 / 重发不改变键的归属单元」。不是现场形，列出备查。

## 没找到问题的地方

- **HSC `placeTyped` / 打字账本的锚**：本臂键入里没有标题语法，`headingStructureRequestForEdit` 不会触发（TBP 的 `emitFlowChange` 先判 `headingRequest`），`commitStructure`、`placeTyped`、留字落位都不在这条路径上。
  - A-25 对 HSC 的 31 行改动是 H1（`landKept` 的 try / finally，HSC:243–250）、H2 和 ②b 乙的静音；锚（`entry.focus` 的 `blockId` / `unitId` / `caret`）的取法与基相同。
  - A-20b r2 乙的 `\n` 切分在 H 的留字记录与 HSC 落位里，本臂不经过，底侧也一样。
- **H 的打字账本**（`unsent` / `unsentSplits` / `sameUnitsTextChanged`，H:190–230）：只管保存与离开时留字，不定光标，不改编辑器里哪个单元持哪段字。A-25 只改了失败门，见 L1。
- **追赶环的重发目标**：恒为 `persistedBlock`（D:601，即 `durableBlockRef`），只有一个块。单元是 `draftFlowForText` 按行位置给的 `tu-1…tu-N`，与草稿行一一对应。读不到它把某行的字写进别的单元的路径。

## 首单元为何空

- **不是没持久化**：服务器 revision 与绿行相同，无恢复事件；`aa` 也还在（在 `tu-5` 里）。
- 按 L2：交接后光标在 `tu-1` 开头，每个回车都在 offset 0 切，把 `aa` 推到新单元，`tu-1` 只留下光标前的东西，也就是空串。
- `aa` 一路被推到最后一行，最后打的 `ee` 落在它前面。这是推断，由 L2 的逐键复原支撑，未经时间线核实。
