# A-20 第一段查报(builder 2026-11-08)

> 行号对 `04f6f822`(scratch 副本 = `git archive 04f6f822`,前端构建主 JS `index-Gswd3cHv.js`,与岛上同)。每条先**事实**(标「实测」或「读码」),后**建议**。
> 实测环境:scratch 后端(新库、无模型 key、只绑回环)、本地代理 RTT 57ms 并计数所有非 GET `/api` 请求、headless Chrome + CDP 真键。脚本与原始输出在 `survey/`(`probe.mjs` 离开臂、`extra.mjs` 撤销与写放大、`proxy.mjs` 计数代理;临时账号口令只从环境变量取)。

## Q2 改 hash / 地址栏换笔记、401 跳登录:丢字机理

### 事实

**实测**(每样本:「warmup」回车落库 → 不回车打「kept」→ 300ms 后离开;`out-q2.json`、`out-rcpt.json`):

| 臂 | 服务器有 kept | 离开后写请求 | 路由告警「blocker on a POP navigation…」 |
|---|---|---|---|
| `hashSwitch` 脚本 `location.hash` 换笔记 | 0/10 | 无 text-save | 10/10 |
| `pasteLink` `Page.navigate` 同 URL 只换 `#/notes/<B>`(= 地址栏粘贴本应用链接) | 0/10 | 无 text-save | 10/10 |
| `loginHash` 清令牌 + `hash='#/login'` | 0/10 | 无 | 10/10 |
| `login401Enter` 所有 /api 回 401,回车触发保存 | 0/10 | PUT text-save 发出、回 401 | 10/10 |
| `clickLeave` 对照:点应用内链接 | 10/10 | 正常 | 0/10 |

- 与 Tester 表的差别:Tester「地址栏打开另一篇」用的是不同地址(整页导航)0/2 丢;本应用链接都是 `/#/notes/<id>`,在笔记里粘贴另一篇链接只差 `#` 后面,Chrome 做同文档导航 = `pasteLink`,10/10 丢。
- 401 后**同一标签页**整页重开:横幅「A block edit is waiting for recovery」3/3 出现,`sessionStorage['coincides:draft-recovery:v2']` 3/3 含 kept;字不在编辑框(要点 Apply)。hash 臂重开:横幅 0/3、存储 0/3。

**读码**:

1. **分叉点 = 路由守卫没被问到。** `useNoteRouteSaveBoundary.tsx:81-83` 的 `useBlocker` 只拦路由自己产生的导航;脚本改 hash / 地址栏改 hash 产生无步长的 POP,`@remix-run/router` 1.23.2 告警后放行(上表告警列)。于是 `:85-101` 不跑 → `flushForLeave`(`:51-79`)不跑 → 不失焦(`:61-63`)、不 seal、不 `flushPendingSaves`。应用内点击是 PUSH,先被拦、跑完 flushForLeave 再走。
2. **换笔记不重挂组件,闸在渲染时就关。** `App.tsx:111` 路由无 key,`NoteDetailPage`(`NoteDetail.tsx:8-25`)原地重渲;`useTextFlowHistory` 的 scope 按 noteId 重建(memo `:126-610`),渲染中 `:611` 把 `active.current` 换成新 token,旧 scope `current()`(`:128`)即 false。旧会话未封口的 `pending`(`textFlowEditSession.ts:90`)无人 seal;即便 seal,`onSeal` `:540`、`persist` `:189` 都会因 `!current()` 返回。
3. **失焦 + 401 能进恢复队列、hash 不能**:恢复回执由适配器 `saveBlock` 先写后发(`useNoteCanvasDataAdapter.ts:1995-2022`),前提是 seal → persist 走到这里;hash 路没有 seal,所以没有回执。
4. **401 请求体丢在哪**:回车 seal → `persist` `:220 await api.saveBlock`(回执 `:2022` 先写)→ PUT 回 401 → 拦截器 `api.ts:57-61` `setToken(null)` + `hash='#/login'`(同样无步长 POP,守卫不拦)→ 页面卸载,`mounted=false`(`useTextFlowHistory.ts:124`)→ `persist` `:227 if (!current()) return false`,`:234` 的 `finally` 也被 `current()` 挡住:不记 failures、不调 onSaveFailure。请求体只剩适配器 catch(`:2210` 起)保留的那张回执。
5. **回执在 sessionStorage,不是只在内存**:`draftBlockPersistence.ts:73-78`(存储)、`:456-487`(写);旧 mountNonce 的回执重开时只弹 info「A previous block edit is queued for recovery」、不回填草稿(`useNoteCanvasDataAdapter.ts:727-737`),横幅列表 `:638-639`,Apply `:2269` 起。新标签页 / 关标签页 / 崩溃即失。删除点:保存成功 `:2199-2202`、晚到回包对账一致 `:2146-2151`、`forgetBlockEditRecoveryReceipt`(`draftBlockPersistence.ts:506-521`)。「全仓无处清」是指 sessionStorage 本身无整体清除;回执逐条删的点就是上面这些(第二段要逐条核 Apply/Dismiss 后是否删)。
6. 留字框里的字换笔记不丢:`useHeadingStructureController.ts:268-271` 按 noteId 清理时 `leaveBuffer` → `retainWords`;普通编辑没有对应的一步。

### 建议

已由 Main_Designer 裁定(订单「A-20 🅰 半边裁定」):hash 路 (i) 守卫层接住无步长 POP、(ii) 清理时 peek 未封口写留字框,两条都做;401 回执存储改 localStorage(加用户作用域)。

## Q3 B-81「Changes could not be saved」

### 事实

- **实测**(`out-toast.json`,MutationObserver 抓,文字轮询抓不到因为一闪即逝):`hashSwitch` 3/3、`login401Enter` 3/3、`emptyHash`(两篇空笔记之间改 hash,全程 0 请求)3/3 出现「Changes could not be saved. Please retry before leaving the note.」。
- **读码**:文案 `useNoteRouteSaveBoundary.tsx:12`,弹出 `:114`。noteId 一变,`:103-117` 的 layout 清理在微任务里看到旧 scope 未释放、无 pending,对保留的 runtime 句柄(`NoteDetail.tsx:11-15` 只留最后一个非空句柄)调 `flushPendingSaves`(`useNoteCanvasRuntimeController.ts:847-854`),reject 即弹。
- **推断(未插桩)**:reject 来自旧闭包 `textHistory.flush` 在 `useTextFlowHistory.ts:940` 抛出(旧 scope 不再当前 → `boundary()` 返回 false)。第二段做诊断构建坐实(已获准)。
- **原记法成立的条件**:提示与有没有打字、有没有落库无关,只要是无步长换笔记就弹。空笔记之间 = 假提示;有未回车字时提示碰巧为真,但「离开前重试」已走不回去。真实点击不弹:PUSH 先被守卫拦、跑完 flushForLeave,`scope.released=true`,清理跳过。**与 Q2 同一处边界**(Tester 判断成立)。

### 建议

已裁:冻结版 `emptyHash` 出提示 → 包上不出,作阳性对照;真失败时文案改真话。

## Q1 空闲 seal 接入点与条件;撤销三条路

### 事实

**今天的撤销与落库基线(实测,`out-extra.json`,各 2 样本形状一致)**:

| 操作 | 每次 Ctrl+Z 后的行 | 服务器 |
|---|---|---|
| `aaa`↵`bbb`↵`ccc` | `aaa|bbb|ccc` → `aaa|bbb|` → `aaa|bbb` → `aaa|` → `aaa` | 撤销逐步写回 |
| `aaa` 停 3 秒 `bbb`(不回车) | `aaabbb` → `''` → (再退回车) | 停顿不分段:一次 Ctrl+Z 整段 |
| 拼音组合 `现值` 再 `公式`(`imeSetComposition` + 提交) | `现值公式` → `现值` → `''` | **每个组合一个撤销项** |

- 回答「一个撤销项 = 两次回车之间的一段?」:**基本是,另加每次回车本身也是一个撤销项**(`insertParagraph` 属 standalone,`textFlowEditSession.ts:110-111` 立即 seal)。另外,输入类型变化(打字 ↔ 删除)、光标跳开(`selectionChanged` `:144-146`)、失焦、组合开始/结束都会切组。
- **输入法今天已经「组合一结束就 seal + 落库」**:`endComposition()`(`textFlowEditSession.ts:152-155`,由 `useTextFlowHistory.ts:657` 调)立即 seal → `onSeal` → persist。实测 30 秒 13 次组合 = 13 个 PUT text-save(`rateIme`),撤销也按组合分段(上表)。用中文输入法写字的人,今天已是「每个词一存、每个词一撤」。

**接入点(读码)**:

1. 挂点:每次被记录的打字都经过 `useTextFlowHistory.ts:620` `onEditApplied` → `:630` `scope.session.record`。在这里(重)置一个 2 秒定时器,到点调与失焦同一入口的 `boundary()`(`:654-660` → `session.seal()`)。定时器跟 scope 走,scope 换(换笔记)或卸载时清。
2. 草稿期:新笔记第一块落库前的输入走 `useDraftBlockController`(`draftText` 状态、`persistDraft` `:479`),不经 `session.record`,所以挂在 `:620` 的定时器在草稿期根本不会被设。实测草稿期 20 秒:建块 + 摆放 + 4 次 text-save(`rateDraft`)。注意:同一臂里服务器最后只有「the quick」(前 9 个字),即**第一块落库后、编辑器转为持久编辑器,后面的字又回到「回车/失焦才存」**——这正是空闲保存要补的。
3. 结构提交期间跳过:历史边界的合成条件已存在,`useNoteCanvasRuntimeController.ts:458` `!paperBusyRef.current && !chapters.isMoving && !headingStructure.isBusy() && textHistory.boundary()`;`boundary()` 自身在回放 / 模板 / 文档事务中返回 false(`:655`)。定时器到点用这个合成条件,不满足就不 seal。
4. 输入法:见上——今天 `compositionEnd` 已直接 seal。预裁写的「组合后若再无输入 2 秒才 seal、⛔ 盯 compositionend 直接 seal」**与现状矛盾**:现状就是盯 compositionend 直接 seal(且每次落库)。

### 撤销三条路(事实 + 代价)

**(A) 空闲 seal 新开撤销项(分段)**
- 改:`useTextFlowHistory.ts` 在 `:620-634` 加定时器(约 15 行),到点调合成边界(从 controller 传入或复用 `boundary`);卸载 / scope 换时清。不动 history 记账层(`usePlacementHistory.ts`)、不动适配器。
- 实测(以失焦作替身——空闲 seal 与失焦是同一个 `seal()`):`aaa`、失焦、回来打 `bbb`,Ctrl+Z → `aaa`,**再按一次 Ctrl+Z → `''`,停顿之前那段也退掉**(2/2,`undoSealA`)。即 (A) 下每次停顿多一个撤销项,一次退一段。
- 落库:每次停顿一个 PUT;连打不停 0 个。
- 风险:最小;行为变化 = 撤销按停顿分段(Henry 已否)。

**(B) 空闲只落库不封口(撤销组不切)**
- 改:`textFlowEditSession.ts` 加只读 `peek()`(返回 pending 的深拷贝,约 5 行);`useTextFlowHistory.ts` 加「临时落库」:到点把 `pending` 的 after 快照包成一个**不进 history 的** transaction,经同一个 `host.enqueueRuntimeHistoryOperation(() => persist(snapshot, 'after', false))` 发出(仍是唯一写入路径、串行、带 base_revision)。
- 动不动记账层:`usePlacementHistory.ts`(撤销栈)不动;但 `useTextFlowHistory` 自己的那套账要改语义——`failures`(`:142`)、`lastSave`(`:143`)、`transactionOrder` / `issuedBases` / `committedBases`(`:157-168`)今天都以「history 里的那个 transaction」为键。临时快照失败会以一个**不在撤销栈里的** transaction 进 `failures`,后续失焦重试(`saveBlock` `:903-914` 按 blockId 找失败项)能接住,但 `onSeal` 最终封口时仍会再发一次同样的 after(`:572-573` 无条件 enqueue persist),要靠 `lastSave` 去重(`:915-918` 只在 `saveBlock` 里去重,`onSeal` 不去重)——需加去重或接受每组多一次同体写。这是对 `useTextFlowHistory` 记账层的改动,范围约 30–50 行。
- 与做法 4 撤回处(`transferTextUnit` 的 `current()` 闸,`useTextFlowHistory.ts:310` / `:330`)**无牵连**:临时落库走 `persist` → `api.saveBlock`,不经 `persistUnitTransfer`。
- 实测:无法在冻结版上实测(需先写);撤销形状按设计 = 与今天相同(停顿不分段)。
- 风险:中。OCC 基线:临时快照落库后 `committed()` 更新 `committedBases`,最终封口那次与撤销都从 `committedBases` 取基线,读码看可成立,须用测试钉住;失败路径多一种状态。

**(C) 空闲 seal 照做,随后继续打字与下一段合并成一个撤销项**
- 改:`useTextFlowHistory.ts` `onSeal`(`:539-575`)记住「最近一次由空闲定时器封口的 transaction」;下一次封口时若满足合并条件,则**不新推撤销项**,而是把新段并进旧 transaction(`prev.after = next.after`,合并 annotation/board 快照,沿用 `textFlowEditSession.ts:130-139` 的合并函数),再 enqueue `persist(prev, 'after')`。撤销项闭包按引用捕获 transaction(`:571-572`),所以改 transaction 内容不必动撤销栈。
- 合并判定:同块同 unit;同一输入类型族;新段 before 选区 = 旧段 after 选区、新段 before 文本 = 旧段 after 文本(即 `record` 里 `canMerge` 的同一组条件 `:112-119`);旧段仍是撤销栈顶且之后没有撤销/重做/别的项(需 `usePlacementHistory` 暴露一个**只读**栈顶查询,约 3 行);旧段的 persist 已成功(不在 `failures`)。任一不满足就按今天的方式新开一项。
- 动不动记账层:撤销栈的存取不改,只加一个只读查询;但「已入栈的撤销项内容事后被改」是新语义,`issuedBases` 对 `prev` 的 after 侧缓存要清(`committed()` `:170-173` 已在成功后删),须测试钉住。约 30–40 行。
- 实测:无法在冻结版上实测;撤销形状按设计 = 与今天相同(停顿不分段),而停顿处已经落库。
- 风险:中。改的是已入栈项的内容;合并条件漏判会把两段不相干的输入并成一撤。

## Q4 pagehide 留档与守恒闸放宽

### 事实(读码)

- 现有留档只管留字框:`useHeadingStructureController.ts:274-281` 在 `pagehide` 同步 `rememberUnplacedWords`(`structureTypingBuffer.ts:106-111`,localStorage,键 `coincides:unplaced-words:<账号>:<笔记>`,`:79-81`),条目形状 `{id, blockId, unitId, initialText, text}`(`:70-77`),同 id 覆盖 = 幂等;`forgetUnplacedWords` 只删自己(`:114-116`)。
- 普通编辑离开整页时走 `beforeunload` → `flushForLeave(runtime, true)`(`useNoteRouteSaveBoundary.tsx:119-129`):失焦 seal 并发出 PUT,但不能等回包;Tester 实测整页导航 0 丢就是这条。
- 守恒闸放宽:`structureTypingConservation.test.tsx:280`(集合)、`:425`(卸载时不在服务器也不在留字框的普通编辑词计入)、`:426`(对照项)、`:544`(边界:留字框里打的词不许借此豁免)、**`:546` 豁免本身**(`unsavedAtUnload` 里且不在笔记、不在留字框 → `continue`,不算 LOST)、`:657` 打印。

### 建议

- 扩展:`useTextFlowHistory` 加 `pagehide` 监听(或挂到同一处),用 Q2 (ii) 同一个 `peek()` 把未封口的那一组按 `{id: blockId+unitId 定值, blockId, unitId, initialText: before 的 unit 文本, text: after 的 unit 文本}` 写 `rememberUnplacedWords`;落库成功后 `forgetUnplacedWords` 自己那条。恢复走留字框同一入口。
- 取消放宽:删 `:546`;断言形状 = 卸载臂的词必须「在笔记里恰一次」或「在留字框里」,否则 LOST;`:544` 边界断言保留。冻结版上该臂须红(阳性对照)。

## Q5 写放大基线

### 事实(实测,代理计数,`out-extra.json`)

| 场景 | 写请求 |
|---|---|
| 持久编辑器连打 60 秒约 410 键、不回车(`rate60`,2 样本) | **0** |
| 之后按一次回车 | 2 个 PUT text-save |
| 4 段「打 5 秒 + 停 3 秒」不回车(`rate4pauses`) | **0**,服务器无字 |
| 拼音 30 秒 13 次组合(`rateIme`) | **13** 个 PUT text-save(每个组合一个) |
| 新笔记草稿期 20 秒(`rateDraft`) | 建块 + 2 次摆放 + 4 个 text-save + 1 次 source-anchors |

- 计数方法:代理在转发前记录每个非 GET `/api` 请求(`survey/proxy.mjs`),`/__writes` 读出。
- 修后预期((A)/(B)/(C) 任一):键盘连打 = 停顿次数;输入法今天已是每组合一次。

### 节流约 1 秒一发(Main_Designer 追问:只量不改)

- 今天没有这条路径,无法直接实测。可给的上界:按键连打 60 秒节流 1 秒 ≈ **60 个 PUT/分钟**(每个带整块 text_flow);对比空闲 2 秒 = 停顿次数(连打不停时 0)。输入法用户今天实测约 26 个/分钟(每组合一次)。第二段若要真数,可在包里加一个只开不交的测量开关跑同一臂。

## 与预裁的矛盾 / 需要定的

1. **输入法**:预裁「组合结束后若再无输入 2 秒才 seal、⛔ 盯 compositionend 直接 seal」与现状矛盾——今天 `endComposition()` 已直接 seal 并落库,撤销也按组合分段。是保留现状(输入法本来就存),还是改成「组合结束不立即封口、并入空闲」(会改今天的撤销形状,且碰 A-25 的组合交接)?候裁。
2. **busy 时跳过**:若人在结构提交期间停手且之后不再打字,下一次停顿不会来,这段字会一直等到回车/失焦。是否允许「跳过后再定一次 2 秒」(重设定时器,不是轮询)?候裁。
3. **撤销路**:Henry 已选 (B),七问见文末。

## Q1 收口:Henry 选 (B) 只落库不封口——七问(读码;行号对 `04f6f822`)

**结论:(B) 收得住在 `useTextFlowHistory.ts` + `textFlowEditSession.ts` 以内。撤销栈(`usePlacementHistory.ts`)不改,适配器(`useNoteCanvasDataAdapter.ts`)不改,`transferTextUnit` 不经过。** 旁证:今天中文输入法每个组合结束就 seal + 落库,人接着打下一个组合(Q5 `rateIme` 13/13),也就是「落库时会话继续往前打」这条路今天每天都在走,只是那时组是切开的。

1. **记账层要学会什么**
   - `textFlowEditSession.ts`:加只读 `peek()`(返回 `pending` 的深拷贝;组合中返回 null)。约 6 行,不改 `record` / `seal` / 合并规则 → 撤销分组与今天逐字节同(停顿不切、回车切、组合切)。
   - `useTextFlowHistory.ts`:加「中途落库」——空闲 2 秒到点,把 `peek()` 的 after 包成一个**不进撤销栈**的 transaction,经同一条 `host.enqueueRuntimeHistoryOperation` 调同一个 `persist(..., 'after', false)` 发出(唯一写入路径、串行、带 `base_revision`)。另加三处账:
     - (a) 中途落库失败**不进 `failures`**(`:142`),否则下次封口时 `:195-202` 会先重发这个过时快照;改为记一个「中途落库已失败」标记,停发中途落库,直到下一次正常封口落库成功(不重试轰炸)。
     - (b) 封口时去重:`onSeal` 末尾 `:575` 无条件 enqueue `persist(tx, 'after')`;若最后一次中途落库的正文与 `tx.after` 相同且已成功,则不再发,只把那次的回包记到 `tx` 上(`committed` / `lastSave`)。不加这条,每组多一次同体写。
     - (c) 定时器跟 scope 走,scope 换或卸载时清(`:126-611` 内)。
   - 共约 40–60 行,全在这两个文件里。
2. **`base_revision` 怎么跟**:`persist` 每次取 `baseFor(tx, side, block)` = `max(block.text_save_revision, committedBases[block])`(`:160-165`)。中途落库成功后 `committed()`(`:170-173`)把新修订写进 `committedBases`。下一次中途落库(新的 transaction 对象)或最终封口(它的 after 侧此前从未发过,`issuedBases` 里没有)都从这里取最新值。串行队列保证同一时刻只有一个在路上。须测试钉住:中途落库 → 再中途落库 → 封口,三次修订递增、无 409。
3. **中途落库后 Ctrl+Z 退掉已落库的字,服务端怎么追平**:Ctrl+Z 先过 `sealRuntimeHistoryBoundary`(`usePlacementHistory.ts:188-189` → controller `:458` → `boundary()` → `seal()`)。于是那一组被封口入栈(after = 屏幕当时的字,去重后通常不另发),然后撤销 `persist(tx, 'before', true)` 进同一队列,写回停顿之前的版本。服务器比屏幕多字的窗口 = 队列里这一两个请求的往返,不跨停顿。撤销失败时与今天同:撤销项留着,出重试界面。
4. **与 `transferTextUnit` 的 `current()` 闸、做法 4 撤回处有无牵连**:无。中途落库走 `persist` → `api.saveBlock`,不经 `persistUnitTransfer`(`:303-334`),也不碰适配器的回包转移账。适配器只会看到一次普通的 text-save:先写恢复回执(`:2022`,同块覆盖、成功即删),失败时照旧弹「Failed to save block」(`:2225`,不受 `silent` 控制)。所以断网时每次停顿可能弹一次,这就是 (a) 的「失败后停发」的用处。**不动适配器。**
5. **草稿期排除**:定时器只在 `onEditApplied`(`:620`)里设;草稿期输入走 `useDraftBlockController`,不经这里(Q1 事实 2)。
6. **结构提交中 / 输入法组合中跳过**:到点时用不 seal 的判定 `scope.current() && !scope.isReplaying() && !history.isReplaying() && !paperBusy && !chapters.isMoving && !headingStructure.isBusy()`(controller `:458` 的同一组条件,去掉最后的 `boundary()` 即不封口),再加 `peek()` 非空(组合中为 null)。跳过时再定一次 2 秒(重设定时器,不是轮询);下一次按键也会重置。输入法:组合结束今天已封口落库,不需要中途落库,行为不变。
7. **节流**:2 秒去抖(每次记录的输入重置)。约 1 秒节流的写放大见 Q5,只量不改。

**验收对得上**:Henry 原话「写到任何一个字,网络好的情况下随时关它,都能保存」→ 停 2 秒必有一次落库,整页关闭再走既有 `beforeunload` seal(Q4);「撤销还很细、和今天一样」→ 分组逻辑不动,修前修后逐臂比 `undoEnter` / `undoPause` / `undoIme` 三臂形状。
