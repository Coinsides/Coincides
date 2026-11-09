> **状态 (Status)**: active
> **层 (Layer)**: 审计 / Reviewer 发现（只报发现，不裁）
> **日期 (Updated)**: 2026-11-08

# A-20 复核：空闲落库与离开不丢字（Reviewer）

**总判：** 点名的十一条读码大体成立，没有发现第二个写入者，也没有发现逐键写入。但留字框保险带有两处新问题：

- **K1 疑似 ③**：人回到笔记时，自动落回的字会重复。
- **K2 读码确认**：一次保存失败后撤销，再离开，被撤掉的字回来时会自动落回并保存。

两条都是 A-20 新引入的，守恒闸和新测试都没有覆盖到。另外有四条 🅱 级发现（K3–K6）。

## 读的是什么

- **包**：ops `packages/a20-idle-save/src/`，共 14 个文件，`sha256sum -c ../src.sha256` 14 个全部 OK。
- **基线**：`04f6f822`。逐文件对基线做了 diff。
- **包外文件**：`useHeadingStructureController.ts`、`structureTypingBuffer.ts`、`usePlacementHistory.ts`、`inFlightWriteRegistry.ts`、`useDraftBlockController.ts`、`api.ts`、`authStore.ts` 都不在包里。我读的是 `04f6f822` 的版本，并核对过 HEAD 上这些文件没有改动。
- **行号对包快照**，前缀如下：

| 前缀 | 文件 |
|---|---|
| H | `hooks/useTextFlowHistory.ts` |
| S | `textFlowEditSession.ts` |
| R | `hooks/useNoteRouteSaveBoundary.tsx` |
| A | `hooks/useNoteCanvasDataAdapter.ts` |
| C | `hooks/useNoteCanvasRuntimeController.ts` |
| P | `draftBlockPersistence.ts` |
| G | `hooks/structureTypingConservation.test.tsx` |
| L | `hooks/useNoteRouteSaveBoundary.leave.test.tsx` |
| HSC | `hooks/useHeadingStructureController.ts`（基线 `04f6f822` 的行号，包内未改） |

- 我没有跑测试，也没有构建，没占重活锁。

## 发现

### K1 · 疑似 ③（重复）：保险带记录跨过服务器上的中间态，人回来时自动落地会把中间那段写两遍

**机理**

1. 空闲落库只读不封口：`peek()` 是副本（S:149-152），落库后组的 `before` 不变（H:640-660）。
2. `keepOpenEdit` 按单元合成一条记录（H:664-692）：`initialText` 取最早那笔未确认交易的 `before`，或者还开着的组的 `before`；`text` 取最新的 `after`（H:668-676）。所以一条记录可以跨过「空闲落库已经写到服务器的中间态」，也可以跨过「早一笔封口已到服务器、只是回包没确认」的中间态。
3. 人回到笔记时，恢复流程（HSC:620-643）先用 `typedTextIsPlaced`（HSC:105-110）判断字是否已在笔记里。它要求整段 `text` 都在服务器上，服务器只有中间态时不成立。于是走 `landKept` → `placeTyped` → `mergeTypedText`（HSC:74-96）：按公共前后缀算出「插入段」，再插进现在的文本。
4. `mergeTypedText` 里防重复的那道检查（HSC:95）只看「完整插入段」是否已出现在现在的文本里。插入段只有一部分已在服务器上时，挡不住。

**推演（读码，未实跑）**

单元是「Note:」，已存。

1. 打「 alpha」，停 2.6 秒。空闲落库后服务器是「Note: alpha」。
2. 继续打「 beta」，最后一次 PUT 没有到服务器。
3. 记录是 `initialText`「Note:」、`text`「Note: alpha beta」。
4. 回来时现在的文本是「Note: alpha」：
   - start=5、end=0，插入段 =「 alpha beta」，锚点在位置 5。
   - `live.slice(5)`「 alpha」不包含插入段，防重复检查放行。
   - 结果是「Note:」+「 alpha beta」+「 alpha」=「**Note: alpha beta alpha**」，然后自动落地并保存。

**会走到的自然路径**

- **token 过期**：之前的停顿已经落库；之后回车或失焦，PUT 回 401；`api.ts` 改 hash 去 `#/login`；R:155 判为去登录，走 `keepAndLeave`，R:140 留档。重新登录回来就会重复。Tester 原有的 401 臂是「所有 text-save 都回 401」，空闲落库也一起失败，服务器上没有中间态，所以测不到这一形。
- **关标签页、地址栏离开、整页导航**：写入队列是串行的（`usePlacementHistory.ts:76-87`）。如果一次保存还在途，beforeunload 里封口的那一笔排在它后面，页面走之前发不出去。在途那一笔若到了服务器，就形成中间态。
- **中文输入法**：每个组合都封口并保存一次，一个单元会连着出现多笔未确认的交易，形状相同，概率较低。

**测不到的原因**

- 守恒闸的停顿最长 300ms、收尾 1 秒（G:526、G:532-537），到不了 `IDLE_SAVE_MS`（2 秒），40 个种子里空闲落库从不触发。
- 新测试「keeps open, unsaved text…」（`useTextFlowHistory.test.tsx:715`）只测单组、没有先落库，也不走回来落地这一步。

**建议的 Tester 臂**

- 打字后停 2.6 秒（让空闲落库发生），再接着打，然后用两种方式之一离开：
  - 把最后一次 text-save 扣在请求阶段，或让它返回 401；
  - 关标签页或改地址栏。
- 回来后看服务器和编辑器里有没有重复的那段。

### K2 · 读码确认（建议 🅰，不丢字）：保存失败后撤销，再离开，被撤掉的字回来时自动落回

**机理**

- 未确认列表 `unconfirmed` 只在两处缩短：成功的首次封口保存（H:260，条件是 `!historyRestore && side === 'after'`），以及封口去重那条路（H:621）。
- 撤销是 `persist(tx, 'before', true)`。成功时只删 `failures`（H:265-266），不删 `unconfirmed`。
- 离开、卸载或 pagehide 时，`keepOpenEdit` 把这笔已撤销的交易也收进记录（H:677），记成 `before → after`。
- 回来时现在的文本等于 `before` = `initialText`。`mergeTypedText` 在 HSC:73 直接返回整段 `typed`，被撤掉的字被自动落回，并保存到服务器。

**路径是界面教出来的**

失败提示原文是「Retry saving or undo before leaving the note.」（C:395）。人按提示撤销后离开（应用内链接也会经过作用域结束那一步，H:735），就会走到这条路。闸里有「was undone but is still somewhere」检查（G:549），但种子很少组合出「保存失败 → 撤销 → 离开」这个序列。

### K3 · 疑似 🅱：账户还没载入时写的回执落在 `anonymous` 键下，载入后列不到、也删不掉

- 回执的存储键在写入时读 `useAuthStore.getState().user?.id`，取不到就用 `anonymous`（P:86-94）。
- `authStore` 启动时 `user` 是 null，要等 `/auth/me` 返回。
- C:46 的订阅只解决了「载入后重渲、按账户键列出来」，没有处理载入前已经写在 `anonymous` 下的回执：载入后 `list` 和 `forget` 都只看本账户的键（P:444、P:560-575）。
- **结果**：这段时间里失败的保存，其回执在载入后不再出现（恢复入口没了）；同一浏览器上另一个账户在它自己的未载入窗口里能列到这些回执（列表按 noteId 过滤，需要同一篇笔记的 id，所以范围很窄）。
- 这个窗口很短，要求打字和保存发生在 `/me` 返回之前。

### K4 · 🅱（闸的灵敏度）：⑦ 的边界断言已被吸收，闸分不清「窗口留住的」和「保险带留住的」

- 豁免删掉后（G:546-547），任何 `unsavedAtUnload` 里的词在最后都要在笔记里或在留字框里，否则就报 LOST。G:544 的边界断言因此成了冗余。它仍然是绿的，但不再提供额外保护。
- `held` 是在 pagehide 之后取的（G:421-424），保险带的 `edit-…` 记录也算进去了。如果窗口自己的 H-L 规则（落地保存确认前不删记录）以后退化，词会被保险带接住，闸仍然全绿。数据层面不丢，但闸对窗口路径的退化失去了灵敏度。
- **建议**：保留一条只测窗口的 H-L 守卫，不被保险带掩盖。比如在闸里给 `edit-` 记录单独计数，或者另写一条测试关掉保险带。

### K5 · 疑似 🅱：空闲落库失败后，正在打字的笔记上立刻出现恢复横幅，Apply 拿的是更旧的快照

- 适配器在发请求前就写回执。失败后回执留着；`finally` 里把这次操作移出在途表（A:2243），横幅随即把它列出来（A:635-639）。
- 空闲那次的快照比编辑器里现在的字旧，这时点 Apply 会回退。
- 封口失败本来就会这样，这一条是既有现象。A-20 让它在停顿时也会出现：一次断网只出一次，由 `idleSaveFailed` 控制。
- **建议**：Tester 的「断网一次提示」臂顺带看一下横幅，以及 Apply 的结果。

### K6 · 🅱（测试缺口与小行为）

- 离开相关的单元测试用的是假的运行时句柄（L:29-45），所以「PUT 真的发出、带旧笔记 id」只有浏览器臂（服务器有字 10/10）作证，没有单元测试钉住。
- B-81 的单元测试只走 popstate 兜底路（L:165-173）。navigate 路只由 L:106「toast 未调用」和浏览器 emptyHash 臂作证。
- 可拦的 navigate 被 `preventDefault` 后，用 `window.location.hash = destination` 重新打开（R:159）。原导航如果是 replace，这里会变成 push，多出一条历史记录。

## 点名逐条

**① seal 仍是唯一写入入口：成立。**
- 空闲落库在 H:653 进同一条写入队列，到 H:658 调 `persist(…, true)`，再经 `api.saveBlock`，与封口是同一个适配器、同一个 `writeRegistry.track`。没有第二条 persist 路。
- 封口去重那条路（H:617-626）不写，只沿用空闲那次的回包，并推进 `committedBases`。
- 附注（不算发现）：空闲任务在队列里执行时重新读 `peek()`（H:655）。如果队列忙，这一次可能写下比排在它后面的旧封口更新的正文，随后旧封口把服务器退回去一步。下一个空闲定时器（每次按键都会重设）或者下一次封口会追平；只有在这个间隙里硬关才会少字，仍在「最多丢最后约 2 秒」以内。

**② 草稿期无定时器：成立。**
- 定时器只在 `onEditApplied` 里起（H:765）。`useDraftBlockController.ts` 不引用 textHistory，草稿期打字不经过这里。
- 万一走到，H:646-647 发现块不在 `blocks` 里也会直接返回。

**③ busy 或 boundary 关闭时跳过，不丢定时：成立。**
- `peek()` 为空时在 H:644 返回，不重设。
- 有字、但重放中、模板或文档交易在途、或 `canSaveWhileTyping` 为假时（H:649-650），重设一次 2 秒。
- `canSaveWhileTyping`（C:396）= C:463 那组条件去掉 `textHistory.boundary()`，与查报一致。
- 有失败挂着时（H:647）直接返回、不重设，由下一次按键重新起。这一点符合「失败挂着就停发」。

**④ IME：成立。** 组合进行中 `peek()` 返回 null（S:150），空闲任务返回、不重设。没有新增 compositionend 钩子，也没有轮询。组合结束照旧封口。

**⑤ hash 离开：代码成立，单元测试缺口见 K6。**
- **可拦的**：R:148-161。`preventDefault` 后走与应用内链接同一个 `flushForLeave`（R:54-82），失焦 → 封口 → persist 在旧作用域仍是当前时发出；`saveBlock` 用的 `requestedNoteId` 是发出那一刻的路由，也就是旧笔记。成功后 R:158 设 `released`，R:159 重开同一地址。
- **不可拦的、去登录的**：R:155 → `keepAndLeave`（R:138-146），先留档（R:140），再失焦封口。
- **兜底**：popstate 用捕获阶段（R:162-169），先于路由的监听执行；R:164 把路由自己产生的那一步交给 blocker。
- 没有新增历史记账：封口时的 `pushEntry` 发生在笔记仍是当前的时候，与点链接离开的路径相同。

**⑥ B-81：成立。**
- 测试在 L:165。冻结版红，见 `positive-controls.txt:39-40`。测试用假句柄抛出「Text composition is still active」来模拟拒绝。
- 真实的拒绝来源在包里是 H:1071（冻结版 `:940`），builder 的诊断构建 6/6 坐实。
- 修法：R:139 和 R:158 在离开时设 `released`，R:116 的清理步骤因此跳过。

**⑦ 留档幂等：成立；边界断言见 K4。**
- 每个单元在一个作用域内用固定的 id `edit-<块>-<单元>-<作用域时间戳>`（H:687），重复调用是覆盖，不会新增。
- 作用域结束（H:735）、pagehide（H:737）、离开（R:140）三处可以叠加调用，结果相同。

**⑧ 逐键无写：成立。**
- 每次按键只重设定时器，不写 localStorage。
- 空闲落库失败不进 `failures`（H:273），设 `idleSaveFailed` 后停发。
- 恢复的条件是任意一次成功的非空闲文本保存（H:271），包括撤销或重做的重放，不只是封口。实际上不更早也不更晚，记一笔措辞差别。
- 封口时正文与上次空闲落库相同就不再发（H:617-626）。

**⑨ 适配器 3 行：成立。**
- 改动在 A:2146-2148：两行注释、一行代码，只调 `forgetBlockEditRecoveryReceipt(recoveryReceipt.recoveryKey)`。
- 这个 key 带操作序号（A:1998-2004），而且每块同时只留一张回执（P:492-506，新的替换旧的），所以删不到别的、更新的那次操作的回执。
- 没有碰 blocks、drafts、在途表、`transferTextUnit` 和 `reconciliationReadIsCurrent`。
- 附注：比对用的是未水合的 `result.block`。万一与发出的内容不一致，就退回旧行为（回执保留），偏向安全一侧。

**⑩ 两处多做：**
- **合成**（H:668-676）：问题见 K1。
- **撤销**（H:694-705）：问题见 K2。
- **去重**（H:684-686）：只认「同块、同单元、文本完全相同」。窗口记录与保险带记录文本不同时，两条都会落地，这是 K1 的同类形状（窗口留住的字已经落地、之后又接着打）。
- **控制器 C:46**：在顶层新增一个 hook，每次渲染调用顺序固定，不改变渲染顺序。只在账户 id 变化时触发重渲，没有改动其他订阅。

**⑪ 清单外的两个文件：**
- `NoteCanvasRuntime.tsx`：只是接线。句柄上新增两个可选成员 `whenLeaveSettled` 和 `keepOpenEdit`（20-22 行），从控制器透传（29、40-41 行），路由守卫要用到。回执的代码回答引用了 R:140 对它的调用，但文件清单里没有提这个文件。
- `useTrayController.test.tsx`：api 的 mock 补了 `getToken` 和 `setToken`（13 行）。回执第 91 行其实提过。

**另核：恢复回执的删除：成立。**
- **Apply**：带上 `recoveryKey` 重新保存（A:2283-2292），新回执替换旧回执；成功后删掉自己的和传入的那张（A:2201-2205）。
- **Dismiss**：A:2383-2389 删除。
- **保存成功**：没有别的在途操作时删除（A:2201）。
- **回包晚到**：A:2148。
- 用户作用域的问题见 K3。
