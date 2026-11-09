### A-20 r3d 结果(builder 2026-11-09)

> **包**:ops `packages/a20-idle-save-r3d/`,主 JS `index-DY5t0krb.js`(sha256 `2bd78e4f723f2818918bc93d2e04879a79048c185f5fa89df9c06e09391b1e5e`),与 Tester 冻结的 `dist-r3d-preseal2` 逐字节相同。
> - `src/` 共 17 个文件(清单 `files.list`):在 r3 那 15 个之上新增 `hooks/useHeadingStructureController.ts` 和 `NoteCanvasRuntime.appearance.test.tsx`;其中 8 个与 r3 包逐字节相同。
> - `src.sha256` 17 行,`dist.sha256` 63 行;另有 `COPY-BACK.md`、`MANUAL-SECTION.md`。
> - 基线 `04f6f822`。server 未改,依赖和锁文件未动。r3d 取代 r3、r2、r1;这三版都没回拷,只拷本包。
> - `src.sha256` 文件本身的 sha256:`2468779d6c49e85f7556b087aee1452c1c37e9f3712bfb4fc803f5986693f54b`
> - `dist.sha256` 文件本身的 sha256:`0a782ec0c880298f44174299108135f942d162219e4ce9b283664fda88922a32`
>
> **证据**(本目录):
> - `kit/`:Tester 套件 s9* 共 16 段的分析,另有 `kit-s9c.base`(对基线 b0c 的对照)。
> - `positive-controls-r3d.txt`:按 N1–N3、N5、N6、N6a、N6b 顺序拼接。
> - `client-full-r3d.txt`、`tsc-r3d.txt`、`exits.txt`。
> - `pre-harvest-scan` ⛔ 0。
>
> 包在 scratch 副本里建、测、封,没碰共享树代码,也没碰 `edfix` / `edacc`。共享树 HEAD `7951550d`:17 个文件里 16 个与 `04f6f822` 相同,1 个是新文件(`leave.test`);`client/src`、`server/src` 无未提交改动。

#### 验证

- **client**:`tsc --noEmit` 0;vitest 全量 2756/2756(259 文件),exit 0(`--pool=forks`,maxForks 3)。此前偶发的 HSC 测试 teardown 竞态(`structureTypingBuffer.ts:316` 的 `document is not defined`)这一轮没出现,见「已知残余」。
- **server**:未改,未重跑。
- **Tester 套件**(真 Chrome + 本地后端 + 57 ms 代理,主 JS `index-DY5t0krb.js`):s9a–s9pe2 共 16 段 **total red 0**,其中 s9e `K1IME-held` 2/2(s8e 那次红由 N6a 修掉)。`kit-s9c.base` 的 4 行红是对照底 b0c 没有 UNDOSEQ、IME 两行(`BASE has no … row`),不是回退。
- **Tester 预封二轮**(参考读数,不是验收;冻结 `dist-r3d-preseal2`,TRACE=1):
  - 三臂与 DmN6Is1f 对上,无位移。时间均相对 Back traverse。
    - heldhead 3/3:写记录 +1/+1/+1,撤回 +11/+9/+10,路由退回 +20/+20/+19;人留在 A,服务器 `['warmup','']`,第二次离开 REFUSED。
    - heldhead-undo 3/3:撤销无效(已裁 🅱,扣留期不收键是设计)。
    - heldback:「Please retry」每行 1 条,LEFT_UNSAVED 0。
  - HEADCLOSE 5/5:
    - plain ×3:重开即见、+20 s 仍见 aaa 横幅 + Apply,bbb 在框里。
    - Apply:先 PUT `warmup|aaa` → 200,再 PUT `warmup bbb|aaa` → 200;点后 +13 s 框、记录、横幅、回执都空。
    - Dismiss:PUT `warmup bbb|` → 200,aaa 不上服务器。
    - 基线如预期红:r3 上 aaa 无处可寻、bbb 已落;修前 aaa 有 Apply、bbb 丢。
  - N6B 冒烟 A→B→A ×1:切换被扣 6832 ms;A 为 `['warmup bbb','aaa']`,各一份;B 不变;无提供、无提示。

#### 阳性对照(`positive-controls-r3d.txt`;每条红跑都在 scratch 副本里临时换码,跑完从快照还原并 `sha256sum -c` 核过)

- **N1 / N2 / N3**:新单测在 r3 源上红,r3d 上绿。守恒闸种子 MERGE / SELDEL 在 r3 上 DUP 红。
- **N5**:`NoteCanvasRuntime.appearance.test.tsx` 经真实 handle 调 `withdrawKeptEdit`。handle 漏掉该成员时红(r3 的形),r3d 上绿。
- **N6**:新测试「kept words wait while the block has a receipt to apply」。r3 的 HSC(底 `04f6f822`)上红(立即落地),r3d 上绿。
- **N6a**:C-N6a 用 N6a 之前的 HSC,加上「任何回执都扣」的测试世界(= r3d 首版 controller 的语义)。新测试红(`expected '<W0>\n<W1>' to contain '<bbb>'`),既有 N6 测试绿;N6a 两条测试在 N6a 上绿。**注**:N6a 改了接口,红跑换的是世界输入(r3d 形的谓词)。它是语义层面的行为对照,不是同签名对照。
- **N6b**:测试「note → other → note in the same runtime」。去掉重置时红(`expected '<W0> <aaa>\n<W1>' to contain '<bbb>'`),有重置时绿;全文件 28/28。

#### 代码回答(行号对包 `src/`,目录 `client/src/pages/Notes/canvasEngine/`;服务器行号对共享树,服务器未改)

**r3d 改动**

- **N1** 删单元的组按劈分对待:
  - `removesUnits` 在 `hooks/useTextFlowHistory.ts:184-189`,指组的 before 里有、after 里没有的单元(合行、跨行删、整行删都是)。
  - 入 `unsentSplits` 账:`:692-693`。
  - `keepOpenEdit` 把这些单元记进 `joined`(`:779-785`),在 `:804` 与「服务器没有」同待遇:起点空,永不自动落地,重开进框。
- **N2** `hashRoutePath`(`hooks/useNoteRouteSaveBoundary.tsx:13-21`)按路由的方式解析 hash:去 query、去第二个 `#`、decode、去尾斜杠。两处谓词都改用它:`:208`、`:235`。
- **N3** 一个 pending 只报一次失败:`scope.failureSaid`(WeakSet,`:72-74`)和 `sayLeaveFailure`(`:88-95`);两处调用 `:171`、`:275`。
- **N5** r3 回执说 `withdrawKeptEdit`「透传」,这句是错的。更正:handle 类型上有它(`NoteCanvasRuntime.tsx:24`),controller 也返回它(`hooks/useNoteCanvasRuntimeController.ts:897`),但 r3 的 `useImperativeHandle` 没暴露它,而 `runtime?.withdrawKeptEdit?.()`(boundary `:156`)的可选调用把这个缺口吞掉了。r3d 已暴露:`NoteCanvasRuntime.tsx:45-49`。登记 TD-68(可选 handle 成员)。
- **N6 / N6a**(`hooks/useHeadingStructureController.ts`):
  - 输入 `recoveryReceipts`(`:153-156`)由 controller 传入,是 `offeredRecoveryReceipts`(`hooks/useNoteCanvasRuntimeController.ts:405-415`):适配器的回执减去本次访问自己的,和恢复队列用的是同一个数组。
  - 比较点:`recoveryWaiting`(`:171-180`)。`unitTexts` 取每个未删单元的 `id\0text`,按顺序比(`:132-136`)。只有本块回执的单元与 `openedTexts` 中该块不等时才扣,不等指长度不同,或任一单元的 id 或文字不精确相等。两边都没有流时也扣(保守的一侧 = 框)。
  - `openedTexts` 是**每块第一次见到时**的服务器单元(`:159-170`),之后不再读。**为什么不读 live**:live 里含着 kept 字落地后的文字和用户正在打的字,拿它比,回执会被自己顶掉。
  - 扣的位置:`placeTyped` 里,在「已在笔记里」检查之后、合并之前:`:580-583` `if (!live && recoveryWaiting(blockId)) { keep(); return; }`。字留在框里,重试照常退避。
- **N6b** `openedFor`(`:166-167`):`input.noteId` 一变,`openedTexts` 就换成新的 Map。

**① 对照换的是世界输入**:见上面「阳性对照 N6a」的注。

**② 新鲜挂载时 HSC 第一次见到的就是服务器文**:
- 适配器 `setBlocks(hydratedBlocks)`(`hooks/useNoteCanvasDataAdapter.ts:722`)是服务器块的第一次写入,与回执列表(`:728-732`)同批。
- 打字要等编辑器渲染出来;Apply 要点击;kept 落地是 HSC 渲染后的 effect;保存成功要先发 PUT。这几样都在第一次写入之后。

**③ 两边都没有流的分支实际碰不到**:
- 回执校验器要求有 `contentJson`(`draftBlockPersistence.ts:180`),没有就拒,永远不入列。
- `textFlow` 可选(适配器 `:2014` 写 `textFlowDraft`,无流的块为 undefined),此时 HSC 从 `contentJson` 取流。
- `placeTyped` 更早就在 `!flow` 上 `keep()`,所以该分支改不了行为。

**N6b 是单测级不变量,真机上无路可达**(守住的是:HSC 挂载在笔记间切换后仍存活):
- `NoteDetail` 不按 noteId 加 key(`App.tsx:111` → `NoteDetail.tsx:20`),所以应用内 A → B → A 复用同一个 runtime 和 HSC。这就是 N6b 要守的缺口。
- 首次访问 A 留下的回执,回到 A 时算「别次」:
  - `isVisitReceipt` 读 `scope.visitReceipts`(`hooks/useTextFlowHistory.ts:198`、`:1250`)。scope 是 useMemo,依赖含 noteId(`:138`),随 noteId 轮换。
  - 适配器的 mount nonce 按挂载生成(`:508`),但列出的条件是 `mountNonce !== nonce || creationGeneration !== activeRouteGeneration`(`:730-731`),而路由 generation 每篇都换。
- **在途保存与「不卸载」凑不到一起;离开时的 flush 没有超时,也没有竞态**:
  - 应用内路由离开走 blocker → `flushForLeave`(boundary `:97-139`,开头 `:99` 扣输入),它 await `runtime.flushPendingSaves`(controller `:862-870`)。顺序是:`whenTypingSettled` → `saveHeaderMetadata` → `textHistory.flush` → `whenDraftIdle` → `whenIdle`。
  - `textHistory.flush`(`hooks/useTextFlowHistory.ts:1232-1236`)await `whenHistoryIdle`。后者是 `usePlacementHistory.ts:90-97`(包外,共享树 = `04f6f822`),一个对 `operationTail` 的 do/while,**没有计时器**。
  - 链上唯一的计时器是 HSC `whenTypingSettled` 的看门狗(`hooks/useHeadingStructureController.ts:720-731`,`HEADING_STRUCTURE_WATCHDOG_MS = 10_000` 在 `:35`)。它到点只把开着的窗口 `retainWords` 进 kept 记录,不会让 flush 提前返回、丢下在途 PUT。
  - **未逐行核**:`saveHeaderMetadata`、`whenDraftIdle`、`whenIdle` 内部各自的等待。
  - 结论:在途 PUT 会被等完。成功则自家回执被忘掉(适配器 `:2202`);失败则留在 A(`blocker.reset`),第二次离开 REFUSED。traverse 被 M2 带回同一条 flush。地址栏、401、关页都会卸载。`keepAndLeave` 带走的是 kept 记录,不是在途保存。BoardNoteModal 是另一个宿主,关闭即卸载。
- 真机核对就是 Tester 的 N6B 冒烟(见上):切换等两次 PUT 都落地才放行,A 的字一份,B 不变。

**Main_Designer 封前五问(框 + 横幅同屏:先放回 bbb,再 Apply)**:
1. **Apply 发什么**:`applyBlockEditRecovery`(适配器 `:2273-2300`)以 `contentSnapshot: receipt`、`baseRevision: receipt.baseRevision`(`:2290`)调 `saveBlock`。PUT 带回执的整块 `contentJson`。基准是原保存发出时的 revision:`:1936` 取值,`:2016` 存进回执,`:2112` 发出。不是块的当前 revision。
2. **409 的条件**:纯版本检查,不比文字。见 `server/src/services/atomicTextSave.ts:36-37`(`current.text_save_revision !== input.base_revision` → 409 `stale_revision`);写入本身还有 `noteBlockContent.ts:107` 的 `AND text_save_revision = ?` 兜一层(`:111`);每次写 +1(`:103`)。K1IME 的 Apply → 409 就是这个检查。
3. **放回的保存先落,再 Apply**:放回那次保存把版本从 R 推到 R+1;Apply 带的仍是 R,所以 **409,什么都不写**,bbb 留在服务器。另外,Apply 按钮的 mousedown 做了 `preventDefault`(`layers/BlockEditRecoveryQueue.tsx:18-21`、`:169`),点 Apply 不会让编辑器失焦;放回只由 2 s 空闲或 Enter 发出。
4. **409 之后回执去哪**:留下,并标为冲突(`:2216-2218`)。忘掉回执只发生在保存成功(`:2202`)或核对后确认相符(`:2148`、`:2151`)时。队列随之换成冲突项(`BlockEditRecoveryQueue.tsx:133-151`),提供 View differences / Replay draft on current version / Discard this draft。Replay(适配器 `:2342-2360`)以当前 revision 为基准,**会**写回 `warmup|aaa` 并抹掉 bbb,但那要用户在一句写明「会替换」的警告后再点一次,是明示的选择。这属于 A-25 ②a「冗余回执 Apply → 409 族」。
5. **反向竞态:Apply 先落,放回的 PUT 后到**:放回那次 409。字的去处有两处:
   - 屏上:Apply 成功时,采纳恢复要求 `recoveryDraftIsCurrent()`(`:1939`)为真;而 draft 已变,采纳不成立,`:2190` 也不动 draft,编辑器仍是含 bbb 的那行。
   - 放回自己的回执:发请求前就已写入(`:1995-2018`),409 后同样留下并标冲突。
   字不丢,但那条回执的 contentJson 不含 aaa 行,Replay 会抹掉 aaa,只能靠 View differences 手工合并。同归 ②a。**未核**:409 之后文字历史会不会自己重试。失败核对故意保留旧基准(`:2069`),手册写的是「保存失败后停顿不再落库,直到下一次 Enter 或点开处成功」;历史内部那一跳没逐行跟。

**其余**

- **401 变体**:保存已失败、还没在途时,结构路遇到 `failures` 就抛错拒键(A-25 查报);所以「已失败后本地合行」的 401 变体不存在,N1 只需管在途那一路。
- **闸判据改动**:起点空的记录,只有在其文字**不**整段在该块服务器正文里时,才从重复判据中除外;整段已在的仍算 DUPLICATED(N4 形)。盲区与 TD-66 的对应注在闸的 `keptTokens` 处(闸没有独立的 README)。收窄后整份闸绿,没有现成种子转红。
- **HEADCLOSE 闸种子造不出**:闸里的保存是替身,没有回执库,也没有「一块一条替换」。这一形由单测兜,真机由 Tester 的 HEADCLOSE 臂兜。
- **LANDOTHER**:真机所见是只有失败的那一块拒键;A-25 ②b 的跨块隔离因此撤掉。Tester 对「排队 vs 交接」的代码问:交接(M3)在交给适配器前调 `settleKept(block.id, sent)`(`hooks/useTextFlowHistory.ts:303`),排队的组留在 `unsent` 账里,两者不共用记录。
- **heldhead 时间**:我先前预测「+25–30 ms」,起算点取错了;以 Tester 实测为准:撤回在 traverse 后 +9..12 ms,早于路由退回(+19..21)。
- **heldback**:r3 上实为 2/2/2;r3d 上 1/1/1,N3 的正向效果坐实。措辞为「一个 pending 一条」。

#### 已知残余

- HSC 重写 kept 记录时会丢掉 `source` 字段。闸因此按 `initialText === ''` 判,不按 `source` 判。
- N3b(`hooks/useNoteRouteSaveBoundary.leave.test.tsx:429`,router 两次扣住同一 pending 后失败)是覆盖性测试,不是阳性对照:N3a(`:406`,hash 扣住 + Back)才是在 r3 上红的那条。
- 输入扣留:扣留期不收键是设计(`flushForLeave` 开头 `holdPageInput()`,boundary `:99`;监听在 `:28` 起;`finally` 里 release)。手册措辞(MANUAL-SECTION「While a note is saving to let you leave」):保存以便离开期间笔记不收键也不收点,撤销、退格、删除都算;保存成功或失败后恢复。
- `structureTypingConservation.test.tsx` 在全量并发下偶发 teardown 竞态(`document is not defined`,`structureTypingBuffer.ts:316`):单文件 3 次都干净,本轮全量没出现。按 Main_Designer 裁定不修。
- `usePlacementHistory.ts` 不在包内;它的 `whenHistoryIdle` 行号对的是共享树 `04f6f822`。
- 五问里的 ④⑤(冲突项 Replay 是整块替换)、重开时旧横幅没有 Apply(TD-62 一族),照旧归 A-25 ②a。TD-66 盲区维持「读码路存在、真机未见」。
