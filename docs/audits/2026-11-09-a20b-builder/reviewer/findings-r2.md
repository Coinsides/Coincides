> **状态 (Status)**: active
> **层 (Layer)**: 审查 / Reviewer findings（A-20b r2 两条小核）
> **日期 (Updated)**: 2026-11-09

# A-20b r2 复核：退一位 + 乙（含回写）

**总判：不挡。** 两条不变量都成立，没找到 r2 引入的回退。另有一条疑似新状态（S1，标题单元里落进 `\n`）和一条测试缺口（S2，`landed` 回写没被钉住），都请主设计裁。

- 读码对象：ops `a20b-belt-coverage-r2/src/`。`src.sha256` 19/19 OK。对 r1 包 `diff -rq`：恰 6 文件不同、新增 1 个（HSC 测试），与回执一致。
- 行号对 r2 包 `src/`。H = `useTextFlowHistory.ts`，HSC = `useHeadingStructureController.ts`，buffer = `structureTypingBuffer.ts`，HT = `useHeadingStructureController.test.tsx`。包外文件（`textUnitEditorService.ts`、`headingInputService.ts`、`PaginatedTextBlockProjection.tsx`）行号对共享树。
- 纯读，未跑测试、未构建，未取锁。Token：不可得。

## 发现

### S1（疑似，建议 🅱，也可便宜折进）：edit 记录原样落进「此刻是标题」的单元，造出含 `\n` 的标题

- **不变量冲突**：代码其余各处都保证标题单元里没有 `\n`：
  - `setTextUnitWritingRole`（`textUnitEditorService.ts:221` 起，:236–243）设成标题时在 `\n` 处切开；
  - `normalizeHeadingTextFlow` / `headingStructureRequestForEdit`（`headingInputService.ts:15`、:31）把含 `\n` 的标题当作要跑结构；
  - 编辑器在标题里拦下 Shift+Enter（`PaginatedTextBlockProjection.tsx:380`）。
- 乙让 edit / split 来源跳过 HSC:602 的切行循环，但不看落地单元的角色。HSC:587–588 对非空落地不比角色（`emptyMatches` 只管空对空）。
- **触发序列**：
  1. 段落单元 P 里 `abc`，行末 Shift+Enter 再打 `d`，保存在途时离开 → 记录 edit `abc → abc⏎d`。
  2. 重开之前，P 在别处（另一标签 / 另一设备）被设成标题，文字仍是 `abc`。
  3. 重开：`mergeTypedText` 的 live === initial → 返回 typed → r2 落地为**一个标题单元 `abc⏎d`**，经 HSC:614 `applyEdit` 存进服务器。r1 会切成标题 `abc` + 下一单元 `d`（角色由 `enterSplitRoleForUnit` 定）。
- 不丢字。下次在该标题里编辑会经 `headingStructureRequestForEdit` 被规范化切开，但在那之前服务器上有一个编辑器自己造不出的标题形状。
- 能否到达：要求等待期间角色在别处被改，单人单设备路径没找到，所以标疑似。
- 便宜改法（供裁）：HSC:602 的条件加一项，落地单元是标题时照旧切，即 `(entry.source === 'edit' || entry.source === 'split') && !headingLevelForRole(unit.writing_role) ? '' : unit.id`。不变量写成「原样落地只落进非标题单元」。阳性对照：六例照绿，加一例「edit 记录 `abc⏎d` 落进标题 → 切」。

### S2（确认·读码，建议 🅱）：`landed` 回写（HSC:631–632）没有测试钉住

- 回执的阳性对照说「只入向四行、无回写」时只有 HT:1499 一例红。读 HT:1499：它走的回写是 HSC:286 `retainWords` 的 `remember()`。第二次渲染落地后 flush 成功，记录被忘掉，`landed` 记录从未被读回。
- 所以把 HSC:632 的 `...(entry.source ? …)` 删掉，六例应仍全绿（未跑，读码推断）。
- 该路径的到达序列：edit 记录 `abc⏎d` 重开 → 落地 → flush 确认前页面离开（`landed` 存为 initial = 落地前单元文、text = 合并后含 `\n` 的单元文）→ 服务器没收到 → 重开 → HSC:680 `typedTextIsPlaced` 判未落 → 缺 source 就按窗口语义切 → 回到 `['abc','d']`。
- 建议补一例：held flush 下落地 edit 记录 → unmount → 服务器仍是旧文重开 → 仍是一行。

## ① 退一位（H:59–65）

| 点 | 结论 |
|---|---|
| 判定范围 | `last >= 0xd800 && last <= 0xdbff`，恰为高位代理区，两端都闭。低位区（DC00–DFFF）不退，正确：结果末位是低位，说明整对已经相同。 |
| `end = 0` | `charCodeAt(-1)` 得 NaN，且有 `end > 0` 守卫，不退。 |
| 只退一次够不够 | 良构串里高位代理后必跟低位，`end-2` 不会再是高位。只有畸形串才需要退两次，编辑器产不出。 |
| 回车 | `('abcdef','abc')` → `'abc'`。text 是 was 的前缀，且 text 末位不是孤立高位（编辑器光标不会停在一对中间）时，结果 === text，与 r3e 逐字相同。`('a😀b','a😀')` → end 3，末位 DE00 → `'a😀'` === text。 |
| 粘贴 | `('abcdef','abcX')` → `'abc'`，末位 `c`，不退。 |
| 代理对 | `('abc😀def','abc😁')`：D83D 相同，end 4，末位 D83D → 退到 3 → `'abc'`。HT 外的 H 测试 `useTextFlowHistory.test.tsx:1116` 钉住此形。 |
| 同一整对后分叉 | `('a😀b','a😀c')`：end 3，末位 DE00 → 不退 → `'a😀'`。成立。 |

- O4（🅱 测试）：只有「退」被钉住，「同一整对后不退」没有测试。把范围误写成 `<= 0xdfff` 时，`('a😀b','a😀c')` 会退成 `'a\uD83D'`（孤立高位），现有测试仍绿。`commonPrefix` 未导出，只能从集成测试走。
- O3（🅱，记入 TD-72 族）：按码点不切开，但仍可切开字素簇。例：`👍🏻` 与 `👍🏽` 共享 `👍` 和肤色修饰符的高位 → 前缀停在 `abc👍` → 落地 `abc👍🏽🏻def`。没有孤立码元，不丢字，形状怪。仓里已有 `expandGraphemeRange`（`splitTextUnitForEnter` 在用），要做可以对齐。

## ② 乙（含回写）

### (a) 只有 window / undefined 来源的 `\n` 切段

- HSC:602 `for (let splitting = entry.source === 'edit' || entry.source === 'split' ? '' : unit.id; splitting;)`：
  - edit / split 来源：初值 `''`，零次迭代，caret / caretUnitId 不变，落地即合并结果。
  - 其余：初值 `unit.id`。单元 id 恒为 `tu-N`，非空（`createNextUnitId`，`textUnitEditorService.ts:55`）。循环内 `splitting = following` 也非空，退出仍靠 :605 的 `!carrier || breakAt < 0`，与 r1 等价。
- 成立。

### (b) `entry.source` 在存储与 entry 之间任何方向、任何路径往返不变

| 跳 | 位置 | 结论 |
|---|---|---|
| 读出 | buffer:116 `({ ...entry, id })` 展开；`claimAnonymousWords`（buffer:92–104）原样 JSON 搬运 | 保留 |
| 存储 → openEntry | HSC:686 传 `source: words.source` | 有 |
| openEntry 收 | :332 类型含 `source`；:333–334 写进 entry | 类型、解构、赋值三跳都在 |
| Entry 类型 | :119 | 有 |
| 读（决定切） | :602，唯一读点 | 有 |
| 回写 1 | :286 `retainWords` → `storedWords`（:271–274）条件展开 | 带；HT:1499 钉住 |
| 回写 2 | :318 pagehide → `storedWords` | 带。但只对 `buffer.current` 生效，而它只在 :358 被赋为 :357 的窗口 entry（source 恒为 undefined），所以这条回写永远不携带 source（O1，无害） |
| 回写 3 | :631–632 `landed` | 带；无测试（S2） |
| 回写 4 | :400 `{ ...words, blockId }` | 展开保留 |
| history 写者 | H:839 `'split'`、:856 / :881 `'edit'`，显式写 | 不读 entry，自带来源；`settleKept`（:881）重写同 id 的 edit 记录时仍是 `'edit'`，与 HSC 重开的同 id entry 一致 |

- **第五个回写点：未找到。**
  - `fixRole`（:264）只动 role / roleFixed；
  - `followUnit`（:391–392）只替换 `entry.focus`；
  - `kept` Set 与 `landingQueue` 存的是同一对象；
  - 全文件没有 `...entry` 复制 entry；
  - 存储写入只有 `rememberUnplacedWords`（buffer:130）一个入口，按 id 整条替换，所有调用方都已列在上表。
- undefined：两处回写都用条件展开，undefined 时不写键，读回仍是 undefined → 旧行为（切）。成立。

### (c) 循环的七条调用路径

- 全部调用点：:242 landKept 队列、:254 retryTimer → landKept、:369 exitQueue、:516 组合结束、:524 / :551 / :566 轮询。都走同一个 `placeTyped`，来源只读自 `entry.source`。
- entry 只有两个生产者：:357（结构窗口，不传 source）和 :685（重开，带记录来源）。
- 所以非 edit / split 来源的行为与 r1 完全相同。成立。
- `splitTextUnitForEnter` 在 HSC 内只被这个循环调用；编辑器 Enter 与粘贴是别的写者。

### (d) 有没有消费者依赖「落地后无 `\n`」

逐个看了 client / server / shared 里按 `\n` 处理单元文本的读者：

- **落进段落单元**：Shift+Enter 本就在段落单元里留 `\n`（`PaginatedTextBlockProjection.tsx:380` 只对标题拦截），乙落地的形状与编辑器自己保存的相同，不是新状态。
- **落进标题单元**：是新状态，见 S1。
- `draftTextFlowFromText`（`useDraftBlockController.ts:59–67`）注释写「unit 内无换行」，但它只处理草稿 textarea，不接落地结果。
- `typographyMeasurementService.ts:142` 只在没有 units 时按 `\n` 拆 text，不受影响。
- `projectTextFlowContent` 的 plain_text 用 `\n` 连接单元，段落内 `\n` 带来的歧义在 Shift+Enter 时就有。
- `typedTextIsPlaced`（HSC:575、:680）按连接后的串比，`'abc⏎'` 与 `['abc','']` 判同。所以已落地的不会再写一次，两种形状都安全。
- **split 来源**：initial 为 `''` 且无角色 → `emptyMatches` 为假 → 合并为 null → 留框（HT:1542 钉住）。自动落地这条到不了，(d) 对 split 来源实际不触发；手放回不经 `placeTyped`。

## 观察

- O1：pagehide 回写（:318）不会携带 source，见 (b) 表。回执说的「回写四处」实际携带 source 的是三处。
- O2：回执残余「重开框里对 edit 记录再按 Enter 不分段」读码确认，与主设计的 TD 安排一致。
- O3、O4：见 ①。

## 光标跳路径 vs r2 差异（2026-11-09 追加）

**结论：成立。** r3e→r2 的差异里，没有一行在「双击新起块 → 首键懒创建 → 确认 → 焦点 / 光标交接」这条路径上改变 textarea 的身份、key、焦点或光标；也没有一行在编辑器的每个 input 事件上执行。路径上的文件在 A-20 期间都没被动过。

- 读码对象：r2 包 `src/` 与 r3e 包 `a20-idle-save-r3e/src/` 的 `diff -rq`：恰 3 源（H、R、HSC）+ 4 测试不同。
- 路径上的文件不在包内，行号对共享树 HEAD。测试文件不进 dist，不在考虑之列。

### 路径（机理读）

1. **双击新起块**：打开草稿 textarea（`draftRef`），由 `useDraftBlockController` 持有，不是 text history 的编辑器。
2. **首个有意义的键** → `persistDraft`（`useDraftBlockController.ts:479`）→ `createBlock`（:525，即 POST）。
   - 若 POST 未带上 placement → 下一轮 `saveDraftBlockPlacement`（:547，即 PUT placement）。
3. **POST / PUT 在途时打的键**仍进草稿 textarea，`draftRevisionRef` 递增。
   - 确认后，:563 起的循环用 `saveBlock` 补存这些键。
4. **交接**（:600–633）：
   - 此刻读草稿 textarea 的 `selectionStart` / `selectionEnd`（:600–601），经 `draftCaretInFlow` 映射到持久块的单元与偏移，组成 `reconciliation`。
   - 然后 `flushSync` 发布块的 flow，并调用 `setDraftOwnerReconciliation` 与 `setFocusBlockId`（:620–629）。
5. **持久编辑器挂载**：`NoteWritingSurfaceLayer.tsx:1976` 的 `BlockEditorLayer` 以 `key={block.id}` 挂载，`autoFocus={focusBlockId === block.id}`。
   - 光标来自 `autoFocusSelection = reconciliation.selectionStart / End`（:1999–2006）。
   - 单元 textarea 带 `data-text-unit-id={unit.id}`（`PaginatedTextBlockProjection.tsx:516`）；单行草稿的单元 id 固定为 `tu-1`（`textFlowService.ts:119`）。
   - 同时 :712–714 的 effect 调 `reconcileTextOwner`。
6. **持久编辑器回报焦点** → `handleDurableFocusReceipt`（`useDraftBlockController.ts:456`）。
   - 若交接期间又有键落进草稿（存的 revision ≠ 草稿 revision），会用 `draftFlowForText` 重新发布块的两份草稿，再补存一次（:460–471）。这一步只发布内容，不带选区。
7. `onDraftPersisted` → `pushCreatedBlockHistory`（`usePlacementHistory.ts:126`）→ `pushHistoryEntry`。
   - 它不带 `skipBoundary`（:110），所以会调用 `beforeHistoryBoundary`（`useNoteCanvasRuntimeController.ts:477`）→ `textHistory.boundary()` → 可能封存某个打开着的 text-history 组。

- 时间线「第 2 键后、第 3 键前」与第 4、5 步的交接时刻吻合：键在 POST / PUT 期间进草稿，交接在补存循环之后。
- 会设光标的只有三处，都在共享树、都不在 r2 差异里：
  - 第 4 步：交接时读草稿 textarea 的选区；
  - 第 5 步：`autoFocusSelection` 落到持久编辑器（由 `BlockEditorLayer` 应用，未读其内部）；
  - 第 6 步：采纳时重新发布草稿，不带选区。
- 以上是路径，不是根因；根因等探针给出 textarea 消失的时刻。

### r2 差异逐条：在什么时刻跑

| 差异 | 何时执行 | 在路径上？ | 每个 input 事件？ |
|---|---|---|---|
| H `commonPrefix`（:59–65，模块级纯函数） | 只在 `keepOpenEdit` 的 :819 调用，也就是离开时（路由边界 / pagehide） | 否 | 否 |
| H Q3 `sameUnitsTextChanged`（:205–210）与 :716 分支 | 只在 `onSeal`（:669）里，组被封存时，且前两支都没接住 | **可能**：第 7 步的 boundary 会封存打开着的组。但新块的键此时都在草稿 textarea 里，不经 text history，所以被封存的只可能是别的块的组 | 否：打字在同一个打开的组里合并，封存发生在边界 |
| ↳ 它执行了会怎样 | 唯一副作用是 `unsent.push`：闭包里的数组，不 setState、不碰 DOM | 读这张表的只有离开（:799）、交接移除（:316、:721）、`leaveUnsent`（:185）和测试接口 `unsentGroups`（:1274） | — |
| H :819 `cutText` 改用 `commonPrefix` | `keepOpenEdit`，离开时 | 否 | 否 |
| R `hashRoutePath` 补前导 `/`（:25–27） | 只在 `leaving()`（:225）与 `beforeHashChange`（:252），也就是地址变化或 navigate 事件时 | 否 | 否 |
| R `export isSignInPath` | 只是导出，行为不变 | 否 | 否 |
| HSC 乙：Entry 类型 / `openEntry` 收 source（:119、:332–334） | `openEntry` 只有两个调用点：:357 标题结构窗口（打字 `plainb` 不触发），:685 带记录重开 | 见下一行 | 否 |
| HSC :686 重开传 source | 重开 effect（:662）每个笔记只跑一次，且要等 `input.blocks.length > 0`。**一篇空笔记**里，首块 POST 确认、块出现的那一刻，这个 effect 正好第一次跑；但 :686 只对存储里每条 kept 记录执行一次，没有记录就不执行 | 条件性：空笔记 + 有 kept 记录 | 否 |
| ↳ 它执行了会怎样 | r3e 在同一时刻也跑这个 effect、也开 entry（`focus: false`）。r2 只多传一个 `source` 字段。落地时 kept entry 的 `finish` 判 `movedAway = !live` 为真，不调用 `focus` / `setSelectionRange`（:532–543）。r2 只影响切不切行 | 不碰编辑器焦点与光标 | — |
| HSC `storedWords` 带 source（:271–274） | `retainWords` 的 `remember()`：kept 框自己的 input 监听（:289，挂在框的 textarea 上，不在编辑器或草稿上），以及 pagehide | 否 | 只在 kept 框的 input 上，不在编辑器的 input 上 |
| HSC :602 循环条件 | `placeTyped` 落地时（窗口 / kept 记录） | 否（同上，不碰焦点） | 否 |
| HSC :632 `landed` 带 source | 落地后写存储 | 否 | 否 |

### 路径文件在 A-20 期间有没有被动过

- 只看 `git log`，没翻历史码。
- `useDraftBlockController.ts` 与 `PaginatedTextBlockProjection.tsx` 最后一次被改是 `fdeacb5d`（2026-11-08，r2.3c）；`NoteWritingSurfaceLayer.tsx` 是 2026-09-23；`usePlacementHistory.ts` 是 2026-09-10。
- A-20 在仓里只有一个提交 `29b1d456`（r3e 收割），它不含这四个文件。所以 A-20 r2→r3 在 git 里不可分，这四个文件在此期间也没动。
- 旁注：`29b1d456` 动过路径上第 3 步补存会经过的适配器（`useNoteCanvasDataAdapter.ts` +14）和 `textFlowEditSession.ts` +8。这些属于 r3e 本体，不属于 r3e→r2 差异，也不在本单的不变量里；那三版的历史计数是 0/678。
