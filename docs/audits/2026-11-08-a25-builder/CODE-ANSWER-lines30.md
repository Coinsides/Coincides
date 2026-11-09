# A-25 acceptance · D:lines30-1 · 代码回答(builder 2026-11-09;纯读,不改码,不跑测试,不占槽)

> 行号对包 `src/` 快照(`<ops>/packages/a25-ime-save-failure`,src.sha256 自身 08d0cb0d…);底 = 共享树 `dfbcce8e`(A-20b r2)。
> 「块」按 Main_Designer 更正读作「文本单元」:服务器上一个 paragraph 块,5 个单元,tu-1 = ""、tu-5 = "eeaa"。
> 本行没有请求 / 焦点时间线,(d) 按无时间线答。

## 结论先行

- **(b) 判得出:A-25 diff 在这一跳上是惰性的**。这条臂全程没有输入法事件(CDP keyDown 带 text,`isComposing` 为 false),而 A-25 在草稿路径上加的每一行只在 composing 为真时改变行为。文本历史和适配器的改动只在**有保存失败**时才分叉;成功路径上门控与底等价。目标选择不变,窗口没有拉宽。
- **(a)(c) 判不出走哪条**。下面列出底代码里能写 DOM 文本的候选跳,没有一条能干净地产出「首单元空、末单元 ee 后接 aa」这种字符总数不变的轮转形状。不选边。
- **能改写 (b) 结论的唯一事实**:这次红行里有没有一次失败的保存。有,A-25 走自动重试(2 s 起),底则保持不动,两边分叉。没有,A-25 与底在这条臂上逐跳同路。请 Tester 的带钩子复测把这一点录下来(录法见文末)。

## (a) 草稿期在途键在哪一跳「重发」、目标怎么选

代码里**没有逐键重发**。在途键走以下几跳:

1. **键落在草稿框**(交接前,或交接后草稿框还没卸下):`DraftBlockEditorLayer` onChange :92–96 → `handleDraftChange`(useRuntimeNaturalWritingController :441–452)→ `setDraftText`(useDraftBlockController :245–261)。效果:`draftTextRef` 变、`draftRevisionRef` 加 1。
2. **建块追赶环**(useDraftBlockController :585–613):`savedRevision !== draftRevisionRef.current` 时,把 `draftTextRef` 整段存成一个 flow(`draftFlowForText`)。存的不是键,是整段文本。
3. **交接**(:620–664),目标在这里选定:
   - **块**:`persistedBlock.id`,即本次草稿会话自己建的块,不是焦点块。
   - **单元**:`draftCaretInFlow`(:78–82)取草稿框 `selectionStart` 之前的行数作下标,读 `persistedFlow.units[min(行数-1, 单元数-1)]`。注意越界时**钳到末单元**。
   - 然后 flushSync 挂编辑器、`setFocusBlockId`(:659),焦点交给那个单元的 textarea。
4. **交接后仍落在草稿框的键**(TD-77 那一跳):`handleDurableFocusReceipt`(:478–497)。条件是持久编辑器回了焦点回执,且 `durableSavedRevisionRef !== draftRevisionRef`。动作:
   - 把 `draftTextRef` **整段**重新切成 flow;单元 id 按行重新编号,即 `draftTextFlowFromText`(:60–69),id 为 tu-1…tu-n。
   - 写进 `pending.to.blockId` 的 drafts:文本和 flow 两半都写。
   - 再走一次 `persistDraft` 回放(`preserveDrafts` = true,:600)。

   目标同样是**草稿会话的块 id**,单元是整段替换,不按焦点单元选。
5. **交接后落在持久编辑器的键**:浏览器把键交给当时的焦点 textarea,即 :659 选中的单元。之后由编辑器自己的打字路径处理(applyEdit),草稿控制器不再经手。

**A-20b r2 乙的 `placeTyped`**(useHeadingStructureController :525–671)在这条臂上两边都**够不着**:
- 它只服务两类入口:标题结构窗口(`commitStructure` :362,要 `#` 触发)和留存词条。
- 留存词条在离开笔记时才产生,按笔记 id 存(useTextFlowHistory :946–999),且 `placeTyped` :537 要求 `entry.session === 当前笔记`。上一行 lines30-0 离开时留下的词条进不了 lines30-1 的笔记。
- 另外,`mergeTypedText` :84–90 对空锚点返回 null,不会把 "aa" 接到 "ee" 后面。

## (b) A-25 diff 碰没碰这一跳;改前改后目标选择、窗口

| 位置(包) | 改了什么 | 本臂下的行为 |
|---|---|---|
| DraftBlockEditorLayer :56, :86–91 | composition 开始/结束 | 无 composition 事件:不触发 |
| DraftBlockEditorLayer :92–96 | onChange 带 `{composing}` | `composingRef` 为 false,`isComposing` 为 false,传 undefined:同底 |
| useRuntimeNaturalWritingController :449 | `setDraftComposing(false)` | :213 只在 ref 已为 true 时动作:空操作 |
| useRuntimeNaturalWritingController :451 | 建块条件加 `!composing` | 恒真:同底 |
| useDraftBlockController :205–222, :302 | 等待者 / 卸载与清草稿时放行 | 等待者列表恒空:空操作 |
| useDraftBlockController :585–593 | 追赶环改写成 `for(;;)` | 未在 composing 时没有新增 await,检查顺序与底的 `while` 相同(先 `requestIsCurrent`、再比修订号、再判有意义文本):同底 |
| 交接 :620–664、焦点回执 :478–497、`draftCaretInFlow` :78–82 | **A-25 未改**(diff 里没有这些行) | 同底 |
| useTextFlowHistory :381, :837, :868, :877 | 空闲 / 收据门控改为按块(`failedSaveOf` / `savePausedFor`) | 没有失败时,`failures` 与 `idleFailedBlocks` 都为空,与底的 `failures.size` / `idleSaveFailed` 同为假:同底 |
| useTextFlowHistory :454–479 | 成功后清失败账、F2 补排空闲保存 | `blockWasFailing` 为假:只多做几次空清理 |
| useTextFlowHistory :393, :476–478, 重试 :255–335 | 失败后不弹 toast、按块自动重试 | **只在保存失败时分叉**,见下 |
| 适配器 :2338 / :2261 / :2633 / D 合并 :2410+ / 水合 :797–826 | 静默失败、路由走后 2xx 的判定、本次访问的收据槽、409 Apply 合并、已在服务器的收据遗忘 | 前三项依次要求:失败 / 路由已走 / 同块有别次访问的收据。D 合并要人按 Apply。水合那项只处理别次访问的收据。新笔记都不满足:同底 |

**目标选择**:改前改后一致。块是草稿会话的块 id,单元是按行数取下标并钳到末单元,焦点回执是整段采纳。**窗口**:没有新增 await 或计时器,没有拉宽。

**唯一的分叉条件**:红行期间某次保存失败(9 对并行负载下可能超时或拿到 4xx/5xx)。
- A-25:块记失败、不弹 toast,2 s 后经同一条写车道重试,发送当时屏上的 flow(`retryFailedBlock` :307–327)。重试以 `preserveDrafts: true` 发出(:429),**只写服务器,不改 DOM 文本**。
- 底:失败后一直等到失焦或手动 Retry。
- 所以即使发生过失败,A-25 也不会凭这条路把 DOM 变成 eeaa。它最多改变服务器何时、以哪一版收到 flow,以及打字组的密封与空闲保存的时序(失败块的空闲保存暂停,底是全笔记暂停)。

## (c) 焦点已在后续单元时,能否把 aa 写进末单元、同时首单元落空

这一行 DOM 与服务器一致,所以轮转先发生在 DOM。能从编辑器自身按键之外改写块文本的路径只有下列几条,**A-25 都没改**。逐条对照现场形状:字符和换行总数不变,首单元空,末单元在 ee 之后接 aa。

- **C1 焦点回执整段采纳**(:478–497):用 `draftTextRef` 整段覆盖块的两半 drafts。
  - 若持久编辑器已经收了键,这条路会**覆盖或丢字**,不会轮转。
  - 只有当 `draftTextRef` 本身就是 "\nbb\ncc\ndd\neeaa" 时才能产出现场,也就是键先落进了草稿框且光标在错处。
  - 要验证,需看草稿框在交接后有没有收键、`selectionStart` 是多少。
- **C2 交接光标选错单元**(:626–647):`draftCaretInFlow` 按行数取下标,越界时钳到末单元。
  - 若交接时草稿框 `selectionStart` 不在文本末尾(例如 0),焦点会落到 tu-1 开头;反之焦点落到末单元。
  - 但单靠选错单元,只能让**后续**键进错单元,解释不了**已存在**的 aa 离开 tu-1。
- **C3 单元 id 按位置复用**:草稿切分出 tu-1…tu-n;编辑器回车新建的单元另起 id,插在光标单元之后。
  - 按 id 对位的写入(C1 的采纳、文本历史的 `previousTextFlow` 比对)在两套 id 顺序不一致时会把文本对到错的单元。这是能产生「轮转」的机制类别。
  - 但我在这两条写入里没找到会把 tu-1 的文本拼到 tu-5 末尾的具体一行。不选边。
- **C4 `placeTyped` / 留存词条落地**:本臂两边都够不着,理由见 (a) 末段。排除。

**首单元为什么空**:判不出。三种可能各对应上面一条:
1. 草稿文本里 aa 已经不在第一行(C1);
2. 采纳或保存按 id 错位写空了 tu-1(C3);
3. 键被挪走。代码里没有挪键的路径,这一种我**排除**。

## (d) 现场时间线能否对上 (c)

**对不上,也排不掉**:没有请求、焦点和草稿离开的时间线。现有的两条数据不判归属:
- text_save_revision = 9,与绿行相同。只说明成功保存次数一样,看不出有没有失败后重试成功。
- 建块到最后更新的时差,2.92 s / 2.44 s 对 2.95 s / 2.47 s,几乎相同。

**带钩子复测请录**(能分开 C1 / C2 / C3 和「是否有失败」):

1. 每个 `/blocks` PUT/POST 的发出与返回时刻、状态码、请求体里各单元的 id 与文本(看 tu-1 何时变空、谁先发 eeaa)。
2. 草稿框交接前最后一次 `selectionStart` 和值;交接后草稿框是否还收到过 input 事件。
3. 焦点切换序列:哪个单元的 textarea、何时、当时的 value。
4. 页面上是否出现过 `[data-block-save-failed]`,控制台是否有 `Failed to save block`。出现过,则 A-25 的重试分叉在场;没有,则这一行在 A-25 和底上逐跳同路。

## 按预登记规则的落点(供 Main_Designer 裁)

- 「diff 碰了且能产出现场」:**不满足**。diff 在成功路径上没碰这一跳;失败分叉不写 DOM。
- 「碰不到、底代码能产出」:我**没能指出底代码里产出这一形状的确切一行**,只有候选 C1 / C3。
- 所以我这边落在**判不出**。只有在复测证实没有失败时,我才倾向「既有」;这一条只登记,不选边。

## 追加(Main_Designer 2026-11-09 小请求):C3 的位点,供 Reviewer 定向

文件路径相对 `client/src/pages/Notes/canvasEngine/`。下列位点 A-25 均未改(A-25 diff 不含这些函数)。

**单元 id 在哪里分配**
- `textFlowService.ts` · `createTextBlockContentV1`:新 flow 的唯一单元固定叫 `tu-1`。
- `textFlowService.ts` · `normalizeTextUnit`:读入时缺 id 的单元按位置补成 `tu-<序号+1>`。
- `textUnitEditorService.ts` · `createNextUnitId`(由 `splitTextUnitForEnter` 调用):回车切分出的新单元取「现有最大数字后缀 + 1」。按位置往后插,但编号是全局递增,所以光标不在末单元时,id 顺序与位置不再一致。
- `textUnitEditorService.ts` · `parseTextUnitsFromPlainText` / `parseLine` 按行号给 `tu-<行号>`;粘贴路径由 `reassignParsedUnitIds` 改发「最大后缀 + 1」起的新 id。
- `hooks/useDraftBlockController.ts` · `draftTextFlowFromText`:草稿文本从 `tu-1` 起逐个 `\n` 调 `splitTextUnitForEnter`,得到按行递增的 tu-1…tu-n。`draftFlowForText` 按文本记忆,同一文本拿同一套 id;文本一变就重切。

**按 id 对位写入或比较的地方**
- C1 采纳:`hooks/useDraftBlockController.ts` · `handleDurableFocusReceipt`。用 `draftFlowForText(draftTextRef.current)` 重切出的新 flow 整块写进 `setBlockTextFlowDrafts` / `setBlockTextDrafts`,不与编辑器当时的 flow 对 id。随后 `persistDraftRef` 回放,在 `persistDraft` 追赶环里以 `preserveDrafts` 保存。
- 交接时的对位:同文件 `persistDraft` 交接段与 `draftCaretInFlow`。用的是服务器回来的 `persistedFlow` 的单元,按行数取下标,不按 id;越界钳到末单元。
- 文本历史:`hooks/useTextFlowHistory.ts`。
  - 编辑落账 `applyEdit` → `useBlockTextFlowEditController`(`apply`)的 `onEditApplied`:以 `previousTextFlow` / `nextTextFlow` 成对记事务。缺 metadata 时 `unitId` 取 `previousTextFlow.units[0]`,这是按位置取的。
  - 撤销 / 重放的批处理:`runBatch` 附近的 `previousTextFlow` 与 `nextTextFlow` 比较。
  - 离开时按 id 对服务器取 `initialText`:`keepOpenEdit` 一带(`server.units.find(… candidate.id === unit.id …)`)。这条只在离开笔记时走,本臂在读 DOM 之前够不着,列出只为完整。
- 结构窗口和留存词条的落地:`hooks/useHeadingStructureController.ts` · `placeTyped` 用 `entry.focus.unitId` 在当前 flow 里按 id 找单元。本臂够不着,理由见 (a)。
- 未定位:`useDraftBlockController.ts` 注释提到「编辑器会重建与文本半边不一致的 flow」(编辑器按 drafts 的文本半边重排 flow),我没找到这段重排在哪个函数里。Reviewer 若查 C1 采纳后文本半边与 flow 半边不同步时的行为,这是要补的一处。

## 追加二(Main_Designer 2026-11-09 一问):A-25 失败分叉能否挪焦点、改选区,或让 BEL 早退那刻焦点已在块内

**不能。** 下面按失败分叉的四个出口逐个读码(行号对包 src;BEL 是 `layers/BlockEditorLayer.tsx`)。

- **按块重试**(`retryFailedBlock` → `persist`):
  - 打字失败的事务不是撤销/重做的一侧,所以 `historyRestore` 为假。整条路径只调用 `api.saveBlock`,参数 `preserveDrafts: true`,不写块的 drafts。
  - 不调用 `restoreSelection`(:481 只在 `historyRestore` 为真时调用),也不调用 `setReplayScope`。所以 `contentReadOnly` 不翻动,草稿框和单元 textarea 都不会因此卸下或重挂。
  - 唯一例外:失败的事务本身是撤销/重做的一侧。这时重试会像底的手动 Retry 一样恢复那一侧的选区并置 replaying。本臂没有撤销,够不着。
- **按块空闲门**(`savePausedFor` :868/:877):只决定发不发空闲保存,不碰 DOM、焦点和选区。
- **指示渲染**(`setFailureTick` → `failedTypingBlockIds` → BEL 挂 `BlockSaveFailedMark`):
  - 印记在 BEL 子节点里占一个固定位置(`{saveFailed && …}`),兄弟节点身份不变,TBP 的单元 textarea 不重挂。
  - 印记没有 autoFocus 和 tabIndex,不调用 focus。按下事件 `preventDefault`,点它也不夺焦点。
  - 印记触发的重渲染会让 BEL 的交接布局效果(包 :403–431,底 :397–425)重跑一次。原因是 NWSL 每次渲染都内联新建 `autoFocusSelection` 对象;底在每一键都会这样重渲染,所以这不是新种类。
  - 效果重跑时只有两条路:焦点已在块内,就早退、不动;不在,就按交接回执和交接选区重放。两条都不会把选区设成 0,也不会替别人把焦点先放进块内。
- **`contentReadOnly`**:A-25 没有给它加来源。运行时控制器那一行未改;失败块列表是另一个 prop。②b 只压掉 toast,D 合并要人按 Apply。

因此「原红行有无失败」不影响 caret-0 的归属。即使那一行有过保存失败,A-25 也不会因此把焦点或选区放到 tu-1@0。
