> **状态 (Status)**: active
> **层 (Layer)**: 审计 / Audit（Reviewer 复核发现，只出发现不裁定）
> **日期 (Updated)**: 2026-11-08

# A-20 r3 小核发现（Reviewer）

**总判断**：r3 的修法都在回执所指的行上，和裁定一致。`released` 不变量按字面成立。拦截器收回和 bfcache 恢复两条路都真删到记录。交接 2 的 `settleKept` 不删别块、不重锚劈分记录。范围是 15 个文件，适配器仍恰 3 行，server 零 diff。

但有一条疑似 ③（N1，已先行短讯）：一组改动里如果删掉了一个单元（退格合行、跨行选中删除），这组没交接之前就离开，重开时被合进来的字会出现两次。这条从 r2 就有，r2 复核时我漏了。修前没有冻结记录，只丢字，不重复。

另有一条疑似 ②（N2）：URL 不是规范形式的同篇地址（`#/notes/<id>/`、`#/notes/<id>#x`）不命中修 b 的提前返回，会走成 M2 同形。应用自己生成的笔记链接都是规范形式，所以要人手改地址才会触发。其余两条是 🅱（N3、N4）和一条测试接缝观察（N5）。

- 对象：ops 包 `packages/a20-idle-save-r3/src/`，15 个文件，`sha256sum -c` 15/15 OK，基线 `04f6f822`。同时对照了 r2 包 `src/`。
- 行号前缀：
  - H = `hooks/useTextFlowHistory.ts`
  - R = `hooks/useNoteRouteSaveBoundary.tsx`
  - C = `hooks/useNoteCanvasRuntimeController.ts`
  - A = `hooks/useNoteCanvasDataAdapter.ts`
  - T = `hooks/useTextFlowHistory.test.tsx`
  - L = `hooks/useNoteRouteSaveBoundary.leave.test.tsx`
  - HSC = `hooks/useHeadingStructureController.ts`（包里没有，`04f6f822` 与 HEAD 相同）
- 方法：只读码。没跑测试，没起子代理，没占锁。
- 标记：
  - 确认 = 读码能走通；
  - 疑似 = 读码走得通，但有一环（浏览器时序或真实操作）要实测；
  - 未找到 = 找过，没有。
  - 🅰 / 🅱 只是建议，由 Main_Designer 裁定。

## 发现

### N1 · 疑似 · ③ 重复 · 建议 🅰 候裁：删掉单元的一组没交接就离开，重开时合进来的字落两次

**触发顺序**

1. 服务器上某块是 `['ab','cd']`（U1、U2）。
2. 前一个保存还在路上，或者已经失败，写入通道排着队。
3. 在 `cd` 行首按退格，合成 `abcd`。`mergeTextUnitWithPrevious`（`textUnitEditorService.ts:192`）把 U2 从数组里**移除**，不是标成 `deleted`。
4. 接着打 `Z`，U1 变成 `abcdZ`。
5. 离开：后退、地址栏、401 走 `keepAndLeave`。关页只在「合行单独封口排队、`Z` 另成一组」时触发。
6. 重开。

**读码路径**

- 合行这组的单元 id 列表变了，所以 `plainTyping`（H:184-187）是假；它也没有新单元，所以 `isSplit`（H:180-183）也是假。H:685-686 两张表都不收它。它又没交接，所以没有回执。**它不在任何一张账里。**
- `keepOpenEdit` 只遍历每组 `after` 里还活着的单元（H:775-776）。U2 在 `after` 里不存在，删除不留痕。U1 记成 `edit` 记录：起点取服务器的 `ab`（H:800），终点是 `abcdZ`。
- 重开时服务器 U1 = `ab` = 记录起点。HSC:73 走「live 等于起点就整段替换」，U1 变成 `abcdZ`，U2 `cd` 仍在。结果是 `['abcdZ','cd']`：**`cd` 落了两次，而且是自动落地。**
- 合行和打字同在开着的一组时，结果一样：H:774 的 before 里有 U2，after 里没有，所以照样只记 U1。

**放宽与对照**

- 跨行选中删除（`ab|cd` 选中 `b…c` 删掉，得到 `ad`）同族：重开后得到 `['ad','cd']`。
- 修前没有冻结记录：丢 `Z` 和这次合行，不重复，回执横幅照旧。
- r2 同形：r2 的 `keepOpenEdit` 按 `metadata.unitId` 取 U1，结果一样。r1/r2 起就有，不是 r3 引入的。r2 复核时我把「三本账成立」写得过宽，漏了这条。
- 可扣住的离开（应用内链接、脚本 hash）先 `flushForLeave` 排空，不触发。

**测试覆盖**：守恒闸和单测都没有合行或跨行删除后离开的臂。

### N2 · 疑似 · ② · 建议 🅱 候裁：URL 不是规范形式的同篇地址不命中修 b，走成 M2 同形

修 b 的谓词（R:213/R:217）和 `leaving()` 的谓词（R:186-187），都是把目的地 hash 去掉 `#`、截掉 `?` 之后，与 `/notes/${noteId}` 做字面比较。路由的拦截器比的却是解析后的 pathname（R:120-122）。两边对不上的形式有三种：

1. **带二级锚点**，比如 `#/notes/A#x`。哈希路由把它解析成 pathname `/notes/A` 加 hash `#x`，所以拦截器不拦（pathname 相同）。
   - 在笔记里退到这样一个条目：走 traverse 分支（R:239-240），`leaving()` 非空，`keepAndLeave` 记下记录，置 `released = true`、`kept = true`。路由不拦，人没走，所以拦截器的 effect 不会跑 R:131，没人撤回。
   - 结果：**冻结记录留在活着的会话里，`released` 卡真**（BACKIN-fail 在 r2 上的形状）。
   - 可扣住的脚本 hash 改到这样的地址时：扣住，`flushForLeave`，然后 `goHeld`（R:70）置 `released = true`，路由同 pathname 不卸载，`released` 卡真（没有记录）。
2. **尾斜杠**，比如 `#/notes/A/`。路由的 `notes/:noteId` 照样匹配，noteId 相同，组件不重挂。地址栏改到这里是不可扣的一步：`keepAndLeave` 之后路由不拦（没有 idx），人没走，记录冻结，`released` 卡真。
   - 若笔记本身是用这种地址打开的：拦截器扣下一次后退后，路由自己 traverse 回 `#/notes/A/`，不命中 R:217，落进 TWICE（R:220-230）→ `keepAndLeave`。这正是 builder 封包前抓到的 M2 变体。
3. **百分号编码与解码不一致**：`new URL().hash` 保留编码，`useParams` 给的 noteId 已解码。只有 noteId 含需要编码的字符时才相关。我没核 noteId 的字符集，按 uuid 类假设不相关。

**可达性**：我搜了 `client/src` 里所有导航到笔记的地方。`navigate(`/notes/${id}`)` 九处、`<Link to>` 四处、`ReferenceTag` 的 `href="#/notes/<id>"`、`NotePatchReview` 的 `href="/#/notes/<id>"`，都是规范形式。也没有任何 `href="#…"` 的笔记内锚点。所以只有人手改地址、或从外部粘贴链接进来才会触发。

### N3 · 确认 · 🅱：脚本 hash 离开被扣住期间按后退，保存失败时提示两次「Please retry」

**触发顺序**

1. 脚本 hash 离开被扣住：R:247-249 起 `flushForLeave`，`scope.pending` 在途。
2. 这期间按后退，回到路由推进来的条目。进 TWICE 分支（R:220），是 traverse，不可扣，于是 `keepAndLeave`（R:230），`heldTo` 被清。
3. 路由拦下：effect 里 `kept` 为真，撤回，置 `released = false`（R:131-136）。之后 R:138 拿到的是同一个 `scope.pending`。
4. 保存失败。R:249 的失败回调和 R:145 的失败回调都看到 `!scope.released`，各弹一次 `SAVE_FAILURE`（R:252、R:149）。

**结果**：人留在本篇，记录为零，`released` 不卡。但提示是 2 条，不是 REFUSED 判定要求的「恰好 +1 条」。r2 在这条路上是 0 条 retry 加一条假的 LEFT_UNSAVED。Tester 的 BACKIN 各变体都从「没有扣住」开始，盖不到这条。

### N4 · 疑似 · 🅱：CLICKBACK 的 edit 记录在服务器还是劈前内容时也会落地（经锚点路），和裁定的「自然不匹配 → 框」不符

裁定说，被切单元的 `edit` 记录以切后文字为起点，「服务器仍是劈前内容时自然不匹配 → 框」。读码的结果是：

- 在被切行的**末尾**接着打字：起点 `alpha`，终点 `alphaZ`，服务器是劈前的 `alpha beta!`。HSC:86 用前缀 `alpha` 做锚点，HSC:95 的重复检查也放行，于是落成 `alphaZ beta!`。
  - 线性文字是对的。
  - 但劈分记录 ` beta!` 仍留在框里，手动放回就会重复。
- 在行首或行中打字：两侧锚点都找不到，返回 null，进框，符合裁定。

单测 T:932-954（CLICKBACK）只断言了「劈分已到服务器时落地」（T:950），没断言劈前这一侧。

### N5 · 观察（第 7 条用）：「路由拦下 → 存储为零」被两条测试拼起来，中间是 mock 接缝

- L 测试里 `withdrawKeptEdit` 是 mock（L:49），只证明边界在拦下时调用了它（L:342-343）。
- 「调用了就真删存储」由 T:1000-1016 直接调 `withdrawKeptEdit()` 来证明（T:1007）。
- 两者之间那一行转接（C:893）没有单测守。真机上的证据要靠 S2 变异 dist 上的 BACKIN-refail（Tester 在做）。

这不算缺陷，只是说明这条链目前没有一条端到端的单测。

## 点名八条

### 1. 行号与裁定（成立）

| 项 | 行号 | 改法 | 与裁定 |
|---|---|---|---|
| M1 | H:169-170 | `sealedOrder` / `sealCount` | 一致 |
| M1 | H:684 | 封口时记顺序 | 一致 |
| M1 | H:769-815 | 按封口顺序重放排队组与开着的组。服务器没有的单元记成 `split`（起点空、无角色，H:791-798）。被切单元以第一次切后的文字为起点（H:781、H:800）。`split` 与 `edit` 互相替换时先删旧的（H:792、H:809） | 一致 |
| M2 | R:131-136 | 撤回 | 一致 |
| M2 | R:145-150 | 失败走 SAVE_FAILURE | 一致 |
| M2 | H:820-824 `withdrawKept` | 撤回本体 | 一致 |
| M2 | C:893、`NoteCanvasRuntime.tsx:23-24` | 透传 | 一致 |
| M3 | H:297 | 交接即归回执 | 一致 |
| M4 | H:882 | 判 `persisted && current()` | 一致 |
| M5 | H:305-310 | 无回执的拒绝把组退回原表，`handedFlows` 还原；排序靠 `sealedOrder`，不乱序 | 一致 |
| 修 b | R:217、R:235-241 | 同篇早退；traverse 一律先记 | 一致（见 N2 的谓词边界） |
| 修 c | R:202-206、R:160、R:133 | 只在卸载时说 LEFT_UNSAVED | 一致 |

**M5 补核**：A:1910、A:1922、A:1987 三处拒绝都在 `saveBlock` 的第一个 `await` 之前，同步返回。H:307 的退回会在下一个微任务里跑完，中间插不进 React 的卸载提交。所以「记录已在 H:297 删掉、组又退回、却赶上卸载」这个窗口不存在：卸载时 H:878 的 `keepOpenEdit` 会从 `unsent` 重新记下这组。

### 2. `released` 不变量（按字面成立；反例只有 N2）

- 写成真的地方：R:70（`goHeld`）、R:143（放行）、R:191（`keepAndLeave`）。
- 写成假的地方只有 R:134，同处 R:133 清 `leftUnsaved`。另外换笔记时 `useMemo([noteId])` 会建新的 scope，不算回写。
- `keepAndLeave` 的四个调用点：R:230（TWICE，条件里有 `!scope.released`），R:240、R:246、R:259（都经 `leaving()`，R:185 在 `released` 为真时返回 null）。全部要求 `!released`。
- 反例：只有人没走、`released` 却被置真的路，也就是 N2（同 pathname 的 `goHeld` / `keepAndLeave`）。规范地址上没找到。

### 3. 会话存活时冻结记录为零

- 拦截器收回：R:131-135 → C:893 → H:820-823，删掉本 scope 写过的全部记录（`keptUnits` 全清）。
- bfcache：H:882 只在 `persisted` 时删；被逐出就不会有 pageshow，记录保留，正确。
- 「人没走、记录却留下」的路：
  - **N2**：非规范同篇地址。
  - **`beforeunload` 之后页面没卸载**：R:275 起 `flushForLeave(..., true)`；如果两轮之后仍有未存的，R:104 会 `keepOpenEdit`。这时 `kept` 没有置真，也没有 pageshow，所以没人撤回。可达的触发需要下载响应、外部协议链接，或另一个弹确认的 `beforeunload`。`client/src` 里只有 R 自己注册 `beforeunload`，也没有 `location.href =` 或 `mailto:`。**未找到应用内可达的触发。**
  - **拦下时 `runtimeRef.current` 为空**：R:135 用的是 `runtime?.`，`kept` 清了，记录却没删。读码找不到 `keepAndLeave` 跑过、之后 runtime 又变空的路。**未找到。**

### 4. 交接 2 的 `settleKept(block.id, sent)` 不多删（成立）

- 别块：H:832 跳过。
- `split` 记录：只有在送出去的正文里，该单元的文字与记录完全相同时才删（H:835），这时字就在回执里，符合「回执是唯一的家」。H:836 不重锚 `split` 记录。
- 同块其它组：记录文字和送出正文对应单元的文字不同，就不删，只对 `edit` 记录重锚，起点改成送出的文字（H:837-839）。
  - 交接时还不知道结果。若这次保存失败，这条记录的起点就是回执的正文：要先在横幅里 Apply 回执才会落地，否则进框。不丢不重。
- 结构窗口（HSC）自己写的记录不在 `keptUnits` 里，不受影响。

### 5. M1 重放（成立，例外是 N1）

- 服务器没有的单元记成 `split`：起点空、无角色，HSC:543 / HSC:640 让它永不自动落地。
- 被切单元记成 `edit`：起点是第一次切后的文字（H:781 有 `!cutText.has`）。
- 同一单元既排队又开着时，`ends` 按单元只留一条（H:782-783），不重复。
- 排空后不残留：每次交接都由 H:297 删掉对应记录。
- LIST（`k0 ↵ x ↵ y`）手推：U2 记 `split 'x'`，U3 记 `split 'y'`，U1 视服务器状态记 `edit` 或不记。与 T:908-930 一致。
- 例外：删掉单元的组（合行、跨行删除）不在任何一张账里，重放漏掉删除，见 N1。

### 6. 修 b 谓词：停在同一篇时 URL 会怎样变

| 路 | 形状 | 命中 R:217？ | 结果 |
|---|---|---|---|
| 路由拦下后退后自己 traverse 回来（规范地址） | `#/notes/A` 或 `#/notes/A?q` | 命中 | 不算离开（BACKIN (A)，L:313-333） |
| 同上，但笔记是用非规范地址打开的 | `#/notes/A/`、`#/notes/A#x` | **不中** | 扣留期进 TWICE → `keepAndLeave`，路由不拦 → M2 同形（N2） |
| 同篇带 query 的路由 push / replace | pushState / replaceState，`hashChange` 为假 | 命中（截掉了 `?`） | 早退；非扣留期本来就在 R:243 返回 |
| 同篇锚点 | `#/notes/A#x` | 不中 | 应用内没有这种链接；人手进入时见 N2 |
| replace 到同篇 | 同 query 行 | 命中 | 早退 |
| 同篇的脚本 hash 或 `ReferenceTag` 链接 | `#/notes/A` | 命中 | 早退，hash 本来就没变 |
| reload | `hashChange` 为假，目的地是本篇 | 命中 | 早退，交给 `beforeunload` 和 `pagehide`（回执五问 2） |

### 7. 四条只靠单测兜的臂（断的是行为，有一处缺口）

- **CLICKBACK**（T:932-954）：断言框里的两条记录（` beta!` 是 `split`、起点空；`alphaZ` 是 `edit`、起点 `alpha`），以及劈分到服务器后会落地。这是裁定行为，不是实现形状。缺口：没断言劈前一侧，而实际行为与裁定不同（N4）。
- **BACKIN-fail (B)**（L:335-349）：断言收回发生在最后一次 flush 之前、提示是 SAVE_FAILURE、没有 LEFT_UNSAVED、人留下。都是裁定行为。
  - 「`released` 不卡」由同组的 BACKIN (A)（L:328-332）断言。
  - 拦下用的是 memory router 的 PUSH（`router.navigate('/other')`），不是真的 POP 回退；路由自己的回退由 L:321 手工补发。
  - 「存储为零」靠 mock 接缝（N5）。
- **BACKIN-undo**（T:1000-1016）：断言撤回之后撤销、离开，存储为零。这是裁定行为。「路由拦下」用直接调 `withdrawKeptEdit` 代替（N5）。
- **HANDOVER-one-home**（T:958-973）：断言交接之后、保存还在路上时，记录已经没了。这是裁定行为。没断言「同块别组的记录还在」，第 4 条我已读码补核。

### 8. 范围（成立）

- 15 个文件与 `files.list` 一致。各文件相对 r2 的改动：
  - 无改动：`draftBlockPersistence*`、适配器两文件、`structureTypingBuffer`、`textFlowEditSession*`、`useTrayController.test`；
  - 有改动：`NoteCanvasRuntime.tsx` 2 行、`useNoteCanvasRuntimeController.ts` 1 行、R 37 行、H 109 行，另外 G / L / T 三个测试文件。
- 适配器相对 `04f6f822` 仍是 3 行，与 r2 逐字节相同。
- server：包里没有 server 文件，共享树 `04f6f822..HEAD` 下 `server/src` 零 diff。
- HSC 不在包里。
