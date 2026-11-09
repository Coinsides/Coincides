# TD-77 预备 · 交接光标落在 tu-1@0 · 代码回答(builder 2026-11-09;纯读,不改码,不占槽)

> 行号对共享树 `dfbcce8e`;这条路径 A-25 未改。A-25 包里 BEL 的行号整体后移 6 行,所以 Main_Designer 引的 BEL:406–410 = 底 :400–404。
> 简称:
> - D = `hooks/useDraftBlockController.ts`
> - BEL = `layers/BlockEditorLayer.tsx`
> - TBP = `blocks/TextBlockProjection.tsx`
> - DWEL = `layers/DraftWritingEntryLayer.tsx`
> - DBEL = `layers/DraftBlockEditorLayer.tsx`
> - NWSL = `layers/NoteWritingSurfaceLayer.tsx`
>
> 前提:Reviewer L2 的复原——交接时草稿只有 aa,编辑器拿到的光标是 tu-1@0 而不是 @2。
> Tester 按住 POST 的时间线还没出,下面只到「各候选要什么条件」,不选边。

## 结论先行

- **(a) 有一条能读到 0 的代码路径**:草稿框在交接前被**卸下又重挂**。DWEL :74 只在 `draftActive && !contentReadOnly` 时渲染 DBEL,所以 `contentReadOnly` 只要闪一下就会重挂。重挂后是一个新的 React textarea,value 为 "aa",选区停在 0,焦点落到 body。交接在 D :600 读到的 `selectionStart` 因此是 0。
  - 这一条同时解释为什么 aa 之后的回车没落进草稿:焦点已不在草稿框。
  - 我**没找到**本臂里让 `contentReadOnly` 闪动的那一个来源;来源清单见 (a)。
- **(b) 找不到推手**。BEL :400–404 的早退本身不设选区,但要早退,得先有人把焦点放进块内的 textarea,而且不设选区。我把能 focus 块内 textarea 的代码都翻了一遍,每一处都同时设了选区,见 (b)。所以 (b) 只剩非代码的推手:浏览器自身,或探针的点击。本臂在交接窗内没有点击。
- **React 受控 textarea 改 value 不会把选区复位到 0。** 值不同时 React 写 `node.value`,按规范光标移到**末尾**;值相同时不写。所以「受控更新复位」不是 (a) 的来源,能产生 0 的只有**新元素**。

## (a) D :600 在什么条件下读到 0

D :600 的写法是 `draftRef.current?.selectionStart ?? draftText.length`。读到 0 必须同时满足两条:`draftRef.current` 非空,且该元素的选区在 0。逐个排查能让选区落到 0 的来源:

| 来源 | 读码结论 |
|---|---|
| 受控 value 更新(DBEL :74 `value={text}`) | 值不同时写 `node.value`,光标移到末尾;值相同时不写。**不会是 0** |
| 程序设草稿选区 | 只有斜杠命令 `useSlashCommandController` :310–311 写,条件是斜杠目标。本臂没有 `/`。D :251–256 的聚焦效果只 focus、不设选区,依赖只有 `[draftActive, draftFocusNonce]` |
| **草稿框重挂** | DWEL :74 `{draftActive && !contentReadOnly && <DraftBlockEditorLayer …/>}`。`contentReadOnly` 真→假一次,DBEL 就卸下再挂上。新 textarea 由 React 以初始文本建出,选区停在 0(这是按浏览器行为推断,待时间线核对);原焦点元素被移除,焦点落到 body。D :251 的聚焦效果不会因此重跑:`draftActive` 没变,`draftFocusNonce` 也没变。交接时 `draftRef.current` 是这个新元素,读到 0。**能产出 0** |
| `draftRef` 指向别的元素 | NWSL :2105 只把 `draftRef` 交给 DWEL→DBEL 一个 textarea。D 和 NWSL 里没有别的赋值 |

`contentReadOnly` 的来源(运行时控制器 :672):
- `sourceProjectionPolicy.contentReadOnly`
- `textHistory.replaying`:撤销/重做的回放、模板失败、文档失败时为真
- `historyReplaying`
- `walls.saving`:页框墙保存中
- `headingStructure.busy`:标题结构窗口
- `chapters.isMoving`

对本臂(新笔记,只打 aa/bb/cc/dd/ee,不撤销,无 `#`)我读不出哪一个会在草稿期闪动。最可疑的是 `walls.saving` 和 `sourceProjectionPolicy`,因为它们跟建块和放置相关;但我没找到建块会去开墙保存的调用。**未定位**。

`draftCaretInFlow`(D :78–82)本身不会把 rawStart = 2 变成 0:`offset = 草稿文本.slice(0, rawStart).split('\n')` 最后一段的长度,对 "aa" 是 2。所以 0 只能来自 rawStart。

## (b) BEL :400–404 早退时,是谁先把焦点放进 tu-1 开头

**交接那一次渲染**(D :620 flushSync):BEL 的布局效果 :397–425 运行时,焦点还在草稿框里。草稿框由 DWEL 渲染,不在 `blockContentRef` 内,所以这一刻**不会早退**。效果走 :418–424:focus 回执单元,然后 `setSelectionRange(min(value.length, 交接选区))`。拿到 0 只有两种可能:交接选区本身是 0,即 (a);或 tu-1 那刻的 value 为空,被钳到 0。后者在随后 React 把 value 写成 "aa" 时,光标会被移到末尾,对不上「回车在 0 处切」。

**之后的渲染**:BEL 效果的依赖里有 `autoFocusSelection`,而 NWSL :2002–2007 每次渲染都内联新建这个对象。只要 `focusBlockId` 还等于这个块,效果在**每次重渲染**都会重跑。重跑时:
- 焦点在块内:早退(:400–404),不改选区。这是正常打字时的情形。
- 焦点不在块内:按回执和交接选区把焦点拉回 tu-1。所以只要交接选区是 0,之后每次焦点离块都会被拉回 tu-1@0。

**能 focus 块内 textarea 的代码,全部同时设了选区**:

| 位点 | 设的选区 |
|---|---|
| TBP `focusTextUnit` :627–635 | 传入的 caret。调用方:`pendingFocusRef` 效果 :787–806(只在编辑后由 `emitFlowChange` 设置,挂载时为空);`documentSelection.focus`;`selectFlowRange`;`replaceSelection` |
| BEL :418–424 | 交接选区 |
| BEL `focusNearestTextArea` :427–449 | 末尾;rAF;由指针触发 |
| BEL :299–305 | focus 的是 `shellRef`(块壳),不是 textarea;而且只在 `allowTextNavigation` 为假时登记 |
| 结构窗口 / 留存词条落地 `placeTyped` 的 `finish` | 落点 caret;本臂够不着 |
| 斜杠命令 :310–311 | 斜杠的 caret;只作用于草稿框 |

所以 (b) 里「焦点先进块、停在 0」没有代码推手。剩下的只能是浏览器自身行为,或探针的点击;本臂在交接窗内没有点击。按读码,我认为 (b) 比 (a) 的重挂一支弱。这一句只登记,不选边,等时间线核对。

## L3:BEL :414–418 退到 `textareaRef`

- 条件:回执单元不在 `textFlow` 里,且不是还没渲染出来的单元。这时 `textarea = receiptTarget || textareaRef.current`,而 `textareaRef` 是 TBP :1797–1800 的下标 0,即 tu-1。
- 本现场:交接时草稿只有 "aa",回执单元就是 tu-1,而 tu-1 在 `persistedFlow` 里。所以 **L3 不会被走到**;即使走到,目标也是同一个 tu-1,选区同样钳到 `min(value.length, 交接选区)`,结果没有区别。
- 「能否同时保住那次回车」:任何一支都不会丢回车。那个回车在交接后约 30 ms 到,落在当时的焦点框里:
  - 走 (a):焦点在 body,回车落空,不落进草稿也不落进编辑器,直到交接后焦点被拉到 tu-1@0。之后的回车在 0 处切。若「aa 后的第一次回车」恰好落在焦点为 body 的窗内,DOM 上会少一次切分。现场是 5 个单元,说明那次回车被编辑器接住了,即交接早于那次回车。
  - 走 (b) 或 L3:焦点已在 tu-1,回车在当时的光标处切分,被保住但切错位置。
  - 所以 L3 只改变「谁接住焦点」,不改变回车有没有被接住。

## 时间线出来后请对的点(交 Tester / Main_Designer)

1. 交接前,草稿框是否被换成了新元素:10 ms 快照里元素身份或 `data-draft-phase` 有断点,或在交接前出现过 focusout 到 body。有,则 (a) 的重挂成立。
2. 交接前最后一帧草稿框的 `selectionStart`:是 0 就是 (a);是 2 就是 (a) 不成立,转查 (b)。
3. 交接(D :620)之前,是否已有 editor 类型的 focusin,以及它的光标:有且为 0,就是 (b),再找推手。
4. 草稿期 `contentReadOnly` 有没有闪动:看快照里草稿框有没有短暂消失(DWEL :74 在只读时不渲染它)。闪了,就回头定是哪个来源。

## 补记(2026-11-09,Tester 264 行带钩子数据之后)

Tester 跑了 264 行带钩子的复测,两侧各 132 行,覆盖 gap 30 常规、POST 按住 40–1500 ms、失败注入,全绿。结果:

- 交接前草稿框换元素 0 次。草稿框只失焦一次,就是交接那次。
- 交接前最后一帧草稿光标 264/264 在末尾;交接后编辑器光标 264/264 在末尾。
- 草稿期草稿框从没消失过。交接时草稿里正好是 aa 的有 76 行,全绿。

所以 (a) 的「重挂」码路在短会话里**没有出现**。它只是一条码上可达的路径,不是已观测到的机制。(b) 同样没有观测到。

原红行能确定的特殊条件只有两个:
- 长会话:mx 第 133 行,之前跑过 K/W/H/N/R/V 各臂;
- 同一后端上有并行的 k25。

每行之间页面都会整页重载(`Page.navigate`),所以 JS 状态不跨行,能跨行累积的只有:
- 本地存储:block drafts 快照、恢复收据、留存词条、草稿恢复收据;
- 后端负载:可能让建块请求或某次数据读取的返回落到交接附近。

若在长会话尾部挂钩子复现,除前文四点外,建议再录:
1. 每行开头本地存储各键的条数和大小;
2. 打开笔记时各 GET 的发出、返回时刻,以及交接之后有没有第二次数据读取落地;
3. 交接前后编辑器所在块的 `readOnly` 和 `data-draft-phase` 的变化。
