# A-25 查报(builder 2026-11-08)

> 底:`04f6f822` + A-20 r2 包(`a20-idle-save-r2`,15 文件;scratch 副本对 `src.sha256` 15/15 OK)。行号对这个底,目录 `client/src/pages/Notes/canvasEngine/`。A-20 收割后换收割提交号重核。
> 每问先列**事实**(读码 + 本地实测,写明样本数),再列**建议**。「推断」字样的条目没有单独实测,只由读码得出。
> 本地实测:真 Chrome + CDP + 本地后端 + 57 ms 代理,临时账号,不碰岛;jsdom 测试在 scratch 副本里加臂跑,跑完还原(还原后对 `src.sha256` 复核 OK)。

---

## Q1 输入法(新笔记第一行,拼音写进笔记)

### 事实

1. **哪几行挪了焦点、换了主**(组合期间):
   - 草稿编辑框 `layers/DraftBlockEditorLayer.tsx:79-82` 的 `onChange` 每次变化都上报,经 `layers/NoteWritingSurfaceLayer.tsx:2108` 到 `hooks/useRuntimeNaturalWritingController.ts:438-446` 的 `handleDraftChange`。
   - `:445`:值「有意义」(`draftBlockLifecycleReducer.ts:160`)就 `persistDraft(value)`。组合中的值(拼音首字母 `d`)也算有意义,于是第一次组合期间就开始建块。
   - `hooks/useDraftBlockController.ts:479` `persistDraft` → `:525` `createBlock` → `:604-633` 交接:`:620` `flushSync` 里 `setDraftOwnerReconciliation`(`:627`)、阶段转 `persisted_reconciled`、`setFocusBlockId`(`:629`)。
   - 持久编辑器在 `layers/NoteWritingSurfaceLayer.tsx:1998` 以 `autoFocus={focusBlockId === block.id}` 抢焦点。草稿框失焦时组合还没结束,Chrome 把组合串原样提交。
2. **`compositionstart` / `compositionend` 在交接路径上有没有被看**:没有。
   - `DraftBlockEditorLayer.tsx` 没有 `onComposition*` 处理。
   - `handleDraftChange` 和 `persistDraft` 都不看组合状态。
   - 同一画面里唯一看 `isComposing` 的是斜杠菜单(`NoteWritingSurfaceLayer.tsx:1734`)。
   - 持久编辑器自己看组合(`blocks/TextBlockProjection.tsx` 的 `compositionRef`,`:848`),草稿框没有对应的东西。
3. **leads-2 冻结红测试**(`docs/audits/2026-11-05-a21-builder/builder/leads2-withdrawn/`):在本底上**红** 1/1(`expected [ false ] to deeply equal [ true ]`)。这条测试直接调 `persistDraft('First')`,不经组合,测的是「交接提交时新块是否已在 host 的 blocks 里」(原子性),不是组合。
4. **真输入法与 CDP 模拟**:本机只能跑 CDP 模拟(每个拼音字母一次 `Input.imeSetComposition`,再一次 `Input.insertText`);Tester 修前 2/2 红(`d第一测试`)。真输入法本机不可复现,要 Henry 上岛亲验(订单已写)。
   - 推断:CDP 的组合事件只投给当前焦点元素;焦点被抢走后,后续 `imeSetComposition` 投到新编辑器,`insertText` 提交整词。所以模拟出来的残留是首字母一个。真输入法下 Chrome 失焦时提交的是整段组合串(`diyi`、`ceshi`),与订单里的现象一致。

### 三条修法

| 修法 | 改哪些行 | 风险 | leads-2 测试 |
|---|---|---|---|
| **(a) 组合中不交接,`compositionend` 后再交接** | `DraftBlockEditorLayer.tsx` 加 `onCompositionStart/End`,组合中 `onChange` 只更新文字、不触发建块;`useRuntimeNaturalWritingController.ts:445` 加「组合中不 `persistDraft`」;`compositionend` 时用框里的最终值(已是汉字)调一次 `handleDraftChange`。交接前的组合结果不用「带过去」:建块用的就是提交后的值。草稿框失焦本来就会提交组合并走 `onBlur` → `onPersist`(`:83-89`),不用另管 | 低。只动草稿框一层,持久编辑器不动。要守:组合中按 Enter / Esc / 斜杠的现有行为不变 | **不变,仍红**:那条测试不经组合 |
| (b) 交接但不挪焦点 | 交接后让草稿框继续持有焦点到 `compositionend`,再把焦点和选区交给持久编辑器 | 中。交接后同一段文字有两个编辑框:草稿框收键、持久编辑器已是主,组合结束前的键落在哪个框、写进哪一份要另加一层同步。新主接管进行中的组合,浏览器不支持 | 不变,仍红 |
| (c) 交接后把组合接回 | 交接后删掉被提交的拼音,在新编辑器里重放组合 | 高。浏览器没有「接管组合」的接口,只能事后删字重插,等于靠时序猜测补救,与「修根因」不符 | 不变,仍红 |

### 建议

- **选 (a)**,它就是「组合中不挪焦点、不换主」的直接实现。
- leads-2 是另一件事(交接与新块不在同一次提交里),(a) 不覆盖。要并入 A-25,修法是让交接那次 `flushSync`(`useDraftBlockController.ts:620`)等新块进了 host 的 blocks 再提交,或建块结果也在同一个 `flushSync` 里发布。冻结红测试现成。是否并入请裁;不并入就回阶段二。

---

## Q2 保存失败

### 事实

**① 「拒键」是哪几行造成的,范围多大**(诊断构建 + LANDFAIL-auto-500 1 样本)

- 诊断构建在 `useNoteCanvasRuntimeController.ts:664` 记下 `contentReadOnly` 的六个来源。拒键期间打字前、打字后**六个全是 false**:不是只读。
- 实际路径:
  - 留字落地后,warmup 和落地的标题 `head` 在**同一块**:`warmup|[heading_1]head|body`。那块的保存吃 500,进了 `failures`。
  - 在这块里按任何键:`blocks/TextBlockProjection.tsx:848-853` 发现块里有标题且不止一行(`headingInputService.ts:26-36`),把这次编辑整个交给 `onHeadingStructure`,不走普通 `applyEdit`。
  - `hooks/useHeadingStructureController.ts:301` `commitStructure` → `:371` `textHistory.runStructureBatch` → `hooks/useTextFlowHistory.ts:1207` 先 `await flush()`。
  - `flush`(`:1190-1194`)只要整篇有任何 `failures` 就抛「Text changes could not be saved…」。
  - 回到 `useHeadingStructureController.ts:445-447` 的 catch → `onFailure` → `useNoteCanvasRuntimeController.ts:409` 弹「Heading changes could not be completed…」。每键一次:7 键 7 条,与 Tester 一致。
  - 键的字没有上屏(`wLine` 仍是 `warmup`)。
- **范围(推断,待臂)**:拒的是「编辑要走结构路径的块」,即里面有标题且不止一行的块。普通块走 `applyEdit`,`canApplyEdit`(`useTextFlowHistory.ts:888-889`)不看 `failures`,所以收得到键,这和 ②a 「另一块能打字」一致。但只要整篇有一个 `failures`,**任何**需要结构的块都会被 `flush` 拒,不只是失败的那块。Tester 的 LANDFAIL 只在同一块里打字,所以测出来像「整篇」。
- **普通失败路**:`persist` 失败 → `failures.set` + `onSaveFailure`(`useTextFlowHistory.ts:267`、`:323`;`useNoteCanvasRuntimeController.ts:398` 弹提示)。之后同一块的普通打字照常(`canApplyEdit` 不看 `failures`),新组排到依赖循环,前面的失败没过它也失败(`:255-262`)。
- **LANDFAIL 路**:落地写入走同一个 `applyEdit` / `persist`(`useHeadingStructureController.ts:575-599`),失败一样进 `failures`;拒键来自上面的结构路径。落地后 `confirm` 每次 `history.flush()` 失败就隔 `PLACE_RETRY_MS` 再问,最多 30 次(`:586-595`)。它只「问」,不重发保存。

**② 失焦触发重试的那条路**

- `hooks/useTextFlowHistory.ts:1136` `saveBlock`(编辑器 `onSave`,失焦时调),按顺序找失败:
  - 文档失败 `:1145-1149` → `persistDocument`;
  - 模板失败 `:1153-1159` → `persistTemplate`;
  - 打字失败 `:1162-1173` → 以屏上当前内容为 recovery 快照 `persist`,成功后恢复扫除把同块的失败全清(`:315-317`,A-20 r2 加了 `leaveUnsent`)。
- 只有失焦(和离开时的 `flushPendingSaves`)会触发。没有定时重试,没有 `online` 事件。

**③ 自动重试挂点与单写者**:现在没有。所有写都经 `host.enqueueRuntimeHistoryOperation`(单写者队列)。A-20 (B) 的中途落库:失败不进 `failures`,停发到下一次封口成功(`useTextFlowHistory.ts:248`、`:322`、`:707`)。

**④ 现有的常驻控件**

- 每块控件条上已有「Retry saving block」(`layers/BlockControlBarLayer.tsx:154-155`,`allowSaveRecovery`)。
- 但它只对模板 / 文档失败亮:`recoveryBlockIds`(`useTextFlowHistory.ts:1212-1215`)不含 `failures`。而且控件条只在块激活 / 悬停时显示,不是常驻指示。
- 打字失败今天没有任何常驻控件,只有恢复横幅(带 Apply / Dismiss,来自回执,重开后才有;本次访问自己的回执 A-20 r2 已不显示 Apply)。

**⑤ 「Failed to save block 一次断网最多一次」怎么来的**:A-20 的中途落库失败后停发(上面 ③),所以断网期间不会每停顿一次弹一次。封口保存失败仍各弹一次。

**⑥ 两条输入**

- **`route_receipt_stale`**:
  - 路由已换后到达的回包,适配器返回 `status: 'stale_epoch'`,带 `recoveryReceipt`(`hooks/useNoteCanvasDataAdapter.ts:2146-2185`)。
  - 2xx 且正文与发出的一致时,A-20 的 3 行(`:2146-2148`)删了回执,但返回值不变。
  - 读回在路由换了以后多半拿不到确认(`read_failed`),于是 `durableState` 不是 `matches_requested`。写入登记 `:2259-2263` 把它判成失败 → `whenIdle` 拒绝 → `whenLeaveSettled` 拒绝(A-20 r2 在控制器里用「回执是否新写」兜住,`useNoteCanvasRuntimeController.ts:870-881`)。
  - history 这边 `success = outcome.status === 'saved'`,所以同一结果在 history 里也算失败(当前作用域已失效,不弹提示)。
- **一次失败两条提示**:
  - 适配器 `useNoteCanvasDataAdapter.ts:2228` 「Failed to save block」,条件是 `requestIsCurrent()`,不看 `silent`;history 的保存都带 `silent: true`(`useTextFlowHistory.ts:292`、`:599`)。
  - history `persist` 失败调 `onSaveFailure` → `useNoteCanvasRuntimeController.ts:398` 「Text changes could not be saved. Retry saving or undo before leaving the note.」
  - A-20 r2 扣住离开里:一次 500 后复查轮重发成功,第二条已被证伪,但已经弹出(TWICE-hash500 行)。

**CHAIN:jsdom 与真浏览器为何不同**(jsdom 守恒臂 K2 种子,本底 1 样本;写序打印)

- jsdom 写序:
  1. `save [W0|W1 k0]`(中途落库)
  2. `FAULT` → `REJECTED`
  3. `save [W0|W1 k0 k1]`(重试成功)
  4. `save [W0|W1 k0|k2]` ← 少 k1
  5. `save [W0|W1 k0]`(撤销)
- 加诊断后坐实:k1 应用成功后,门的 Enter 读到的流仍是 `[W0|W1 k0]`。门的 `liveFlow` 读的是上一次渲染的 `flowDrafts`(`hooks/structureTypingConservation.test.tsx:299`),k1 的编辑还没重渲。Enter 拿旧流劈分,劈分组的 `after` 不含 k1,落库时把已重试成功的 `[k0 k1]` 盖掉。
- 真浏览器:编辑器读的是 `latestFlowRef`,与编辑同一调用里更新(`blocks/TextBlockProjection.tsx:869`),键与键之间也有真实时间。所以 Enter 总从含 k1 的流劈分,Tester 6 行修前全绿。
- **哪个更接近真实用户**:在编辑器里打字,真浏览器更接近,用户碰不到这个窗口。jsdom 暴露的是另一件真事:history 接受调用方给的 `previousTextFlow` 而不核对自己最新的流。凡是从渲染期状态读流的调用方都可能踩到,比如留字落地读 `readLiveFlow`(`useTextFlowHistory.ts:1209-1210`,读 `blockTextFlowDrafts`)。推断:真浏览器里这条路需要「落地」与「上一键」在同一次渲染前发生,未实测。

### 建议

1. **拒键收窄(②b)**:结构路径不该因别处的普通保存失败而拒。`runStructureBatch` 前的 `flush` 只要求「本次结构触及的块」没有失败,别的块的 `failures` 不挡。要先过 Q4 的回归面。
   - 本块有失败时:让编辑先按普通打字走 `applyEdit`(字上屏、进单写者队列排在失败后面),结构等那块恢复后再补。这样不逐键弹提示。
   - 这一改动在 `useHeadingStructureController.ts:301-371` 与 `useTextFlowHistory.ts:1190-1194`、`:1207`。是否允许碰 history 的 `flush` 语义,请裁。
2. **自动重试(②a ②b 共用)**:
   - 挂在 `useTextFlowHistory` 的 scope 里,与 A-20 的 `idleTimer` 同层:有 `failures` 时起退避定时器(2 s 起,翻倍,上限 30 s),到点经 `host.enqueueRuntimeHistoryOperation` 跑与 `saveBlock` 打字失败分支同一段(`:1162-1173`,当前屏上内容作 recovery)。
   - 再加 `window` 的 `online` 事件立刻排一次。
   - 不另开写者,只是替用户「失焦」一次。中途落库仍在有 `failures` 时停发(`:248`、`:707`),封口保存成功后恢复。
3. **常驻控件(④)**:
   - 扩 `recoveryBlockIds` 把 `failures` 的块也算上。
   - 在块上(不是控件条,控件条不常驻)放一枚常驻指示:「未保存 · 重试 / 复制 / 丢弃」。「重试」= 立即排一次上面的重试,「复制」= 复制该块当前文字,「丢弃」= 撤回到服务器版本(走现有 Undo / 恢复路径,不新造写)。
   - 指示在屏期间不弹提示;保存成功即消失。
   - 与留字框的关系:留字框管「还没进笔记的字」,这枚指示管「已在笔记里、服务器还没有的字」,两者不混。
4. **提示收声(⑤⑥,对齐 (e))**:
   - 适配器 `:2228` 对 `silent` 的保存不弹;history 的 `onSaveFailure` 改为点亮指示,不弹 toast。这样一次失败 0 条 toast + 1 枚指示,先败后成时指示消失、零残留。
   - 不经 history 的保存(表单字段等)行为不变。
5. **`route_receipt_stale`**:A-20 的 3 行已证明「2xx 且正文与发出的一致」时,让这条路返回 `durableState: 'matches_requested'`、`recoveryReceipt: null`(`useNoteCanvasDataAdapter.ts:2146-2185`)。写入登记 `:2259-2263` 就判成功,A-20 r2 控制器里的回执兜底可以留作双保险。改适配器要另行准许(A-20 时只准了 3 行)。
6. **CHAIN 阳性对照**:把 K2 守恒臂加回(冻结版与本底均红,上面写序)。修法:history 在接受 `previousTextFlow` 时与自己最新的流核对(开着的组 / 已封口的 after / handed),不一致时以自己的为底重放这次编辑,或拒绝。改 `useTextFlowHistory.ts` 的 `apply` 入口。若裁定不修,这条臂只能当已知红留着,不能当闸。

---

## Q3 H1 / H2

### 事实

- **行号在本底上仍对**:`useHeadingStructureController.ts` 不在 A-20 包里,与 `04f6f822` 相同。
- **H1**:`:198-207` `landKept`。`next()` 的定时器里 `placeTypedRef.current(due)` 同步抛异常时,`if (landingQueue.current.length) next(); else landingScheduled.current = false;` 不执行,`landingScheduled` 永真。本次挂载之后的 `landKept` 都在 `:200` 直接返回,后台落地全停。Tester 修前 2/2 红。
- **H2**:`:482` `if (latest.current.noteId !== entry.session) { if (live) leaveBuffer(); return; }`。对已留住的条目(`!live`)直接返回,不调 `retryTimer`。入队到执行之间换了笔记,这条的重试链就断了,要整页重载才回来(重开笔记时 `:618-640` 从存档再开)。

### 建议与冻结红测试

- H1 修法:`:203-206` 的定时器体包 `try { … } finally { if (landingQueue.current.length) next(); else landingScheduled.current = false; }`,异常照样抛给控制台,队列不停。
  - 冻结红测试可写:两条留住的记录排进落地队列,第一条落地时让 `forgetUnplacedWords` 抛一次(vi.mock 包一层,只抛首次)。断言第二条最终落地。修前红,修后绿。
- H2 修法:`:482` 改为 `if (latest.current.noteId !== entry.session) { if (live) leaveBuffer(); else if (kept.current.has(entry)) retryTimer(entry); return; }`。`retryTimer`(`:211-219`)本来就在笔记不对时继续等,回到这篇笔记时落地。
  - 冻结红测试可写:一条留住的记录 `landKept` 入队后、`setTimeout(0)` 执行前切换 `noteId`,再切回。断言切回后在 `RETRY_MAX_MS` 内落地。修前红(不再落),修后绿。用假定时器,不靠真时间。

---

## Q4 写放大与回归面

### 事实

| 改动 | 触及 |
|---|---|
| Q1 (a) | 只在草稿框,新笔记第一行和空白处新起的草稿。A-18 三固定项里「300 ms 人类节奏」和「英文句子」走的是同一个草稿框(无组合,行为不应变);「真键标题」若从草稿开头输入 `# `,也经这里 |
| Q2 建议 1(结构路径的 `flush` 收窄) | 标题结构、留字框整条链,即 r2.3c 代表臂、守恒闸 6 种子与各 PATH 臂 |
| Q2 建议 2-4(自动重试、常驻指示、收声) | `useTextFlowHistory` 失败处理,A-20 的 (B) 臂(中途落库失败停发)与离开臂(扣住离开的复查轮会与自动重试同处一条队列) |
| Q2 建议 5(适配器) | 所有块保存的结果判定,A-20 r2 的 BACKOK / GONEFAIL / TWICE / CLOSEFLY 行 |
| Q3 | 只在留字框后台落地 |

### 建议:要重跑的

- A-18 矩阵三固定项(300 ms 人类节奏、真键标题、英文句子),Q1 后必跑。
- r2.3c 代表臂,Q2 建议 1、Q3 后必跑。
- 守恒闸全量(6 种子 + PATH 臂 + 加回的 K2 / CHAIN 臂)。
- A-20 Tester 套件:(B) 组(IDLE、WAMP、PAUSES、UNDO、PAUSEEXIT、OFFLINE)与离开组(LEAVE、LATEBACK、INAPP、TWICE、BACKOK、GONEFAIL、FLYK)。
- 1a 切换。
- A-25 自己的 IME / SAVEFAIL / LANDFAIL / CHAIN / H1 / H2。

---

## 本趟没做到、要说明的

- LANDFAIL 诊断只跑了 1 样本(auto-500)。「拒键范围 = 需要结构的块,而非整篇」没有实测臂;建议 Tester 加一臂:LANDFAIL 期间在**另一个普通块**打字。
- jsdom CHAIN 的诊断改动只在 scratch 副本里加过、跑完已还原。
- 诊断构建 `dist-diag2` 在 scratch,不进仓库。
