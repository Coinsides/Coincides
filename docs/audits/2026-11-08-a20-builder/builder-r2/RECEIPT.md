### A-20 r2 Result(builder 2026-11-08)

> 包:ops `packages/a20-idle-save-r2/`。主 JS `index-DGn86c1V.js`。`src/` 共 15 个文件,清单 `files.list`,另有 `src.sha256`(15 行)、`dist.sha256`(63 行)、`COPY-BACK.md`、`MANUAL-SECTION.md`。基线 `04f6f822`。server 未改,包里没有 dist/server;依赖、锁文件未动。r2 取代 r1(r1 未回拷,勿两包都拷)。
> 证据:`docs/audits/2026-11-08-a20-builder/builder-r2/`。`kit/` 是 Tester 套件各轮分析(`kit-r2*` 首跑、`kit-r3*` 修后重跑、`kit-r4*` Tester 新探针、`kit-r1c` / `kit-b0c` 是 UNDOPAUSE 的 r1 / 基线对照),`runs/` 是对应 rows.jsonl 与等待期截图;阳性对照在 `positive-controls-r2.txt`;全量在 `client-full-r2.txt`。`pre-harvest-scan` ⛔ 0。
> 包在 scratch 副本里建、测、封,没碰共享树代码,没碰 `edfix` / `edacc`。共享树 HEAD `036bb4f1`:15 个文件里 14 个与 `04f6f822` 相同,1 个是新文件;`client/src`、`server/src` 无未提交改动。

#### 验证

- client 全量 2727/2727(259 文件),exit 0;`tsc --noEmit` 0。server 未动。
- Tester 套件(真 Chrome + 本地后端 + 57 ms 代理):r2 闸各行绿,三行另述:
  - **GONEFAIL-back**:500 真失败时弹一次「did not reach the server」= 真话;字随后一次落库(count 1)。按 Main_Designer 采纳的新规则绿。
  - **UNDOPAUSE**:基线 `04f6f822`、r1、r2 四步完全一致 `[["warmup","aaabbb"],["warmup",""],["warmup"],[]]`,不是 r2 引入(TD-63)。
  - **TWICE-hash500(Main_Designer 裁绿:存一次、离开到最新目的地)**:被扣的保存吃 500 后,`flushForLeave` 的复查轮把它重发并 200,离开去最新目的地 C;字在服务器一次,无需 Apply。另有两条失败提示(「Failed to save block」+ onSaveFailure),与 GONEFAIL-hash / paste 同一对,修前就有,归 A-25 (e)。「留在 A + Apply」是持久失败的兜底,GONEFAIL-hash / paste 仍走它。

#### 封包前红行与修法(Main_Designer 已收)

- **LATEBACK / INAPP(8 行)**:离开确已扣住,状态也在显示,只是 `position:fixed` 元素 `offsetParent` 恒为 null,探针看不见。固定定位挪到外层包裹,`role=status` 本体是普通盒子。无行为变化。
- **RETRY-del(真缺陷)**:排在失败保存后面的组,在依赖循环里进了 `failures`,没走到交接 2,一直留在 `unsent`;Retry 带整屏保存成功、扫掉 `failures`,却没扫 `unsent`。删掉 beta 并保存后离开,旧组被记下,重开时自己落回。修:恢复扫除时同时 `leaveUnsent`。
- **TWICE-hash / paste、BACKOK ×2、GONEFAIL-back(假提示)**:
  - (a) 扣住期间的第二步被 `leaving()` 放过(pending 时返回 null),笔记在第一次 flush 下面被卸载,弹 SAVE_FAILURE。修:能扣的也扣,只去最新目的地;不能扣的(后退、地址栏、登录)走 `keepAndLeave`,放行后不再报被扣 flush 的拒绝。应用内链接的 blocker 路径共用同一交接。
  - (b) 适配器把路由已换之后到达的 2xx 报成失败(`route_receipt_stale`,TD-62,挂 A-25),但会删掉回执。`whenLeaveSettled` 改为:只有本笔记出现「打开以来新写或重写」的回执时才算失败。

#### 代码回答(行号对包 `src/`,目录 `client/src/pages/Notes/canvasEngine/`)

7. **三本账与两次交接;起点、终点;劈分;回执;闸怎么数回执;重试确认。**
   - 三本账:开着的组(`session.peek`);`unsent` / `unsentSplits`(`hooks/useTextFlowHistory.ts:163`、`:167`);交给适配器后归回执。
   - 交接 1:封口时 `onSeal` 推入 `:670-672`(纯文本单单元入 `unsent`,判定 `plainTyping` `:181`;劈分入 `unsentSplits`,判定 `isSplit` `:177`)。
   - 交接 2:`persist` 里调 `api.saveBlock` 之前移出两表并记 `handedFlows`,`:285-290`。成功后 `confirmedFlows.set` + `settleKept`,`:305`。
   - 重试确认:排在失败后面、没走到交接 2 的组,在恢复扫除里随 `failures` 一起离开两表,`:317`(`leaveUnsent` `:171`)。原 `unconfirmed` 表已删;恢复后清 `failures` 是修前就有的行为。
   - 起点:`serverFlow` = `handedFlows ?? confirmedFlows ?? 观察到的块内容`,`:724`;`keepOpenEdit` 里 `:785` 取起点,`:787` 起点 = 终点就不记(已有记录则删)。
   - 终点:`unsent` 各组与开着的组按单元取最新文本,`:752`。
   - 劈分:新单元记成 `source:'split'`、`initialText:''`、无 writingRole,`:779`;被劈单元整体不记,`:771`;`settleKept` 对 `split-` 记录从不重锚,`:813`。没有锚点 → `mergeTypedText` 返回 null → 永不自动落地。
   - 回执:失败且带回执时记入 `visitReceipts`,`:307`。
   - 闸:`hooks/structureTypingConservation.test.tsx:100` 建 `world.receipts`,发保存前写入 `:123`、成功后删 `:136`;`keptTokens` 把回执里不在笔记中的词算作「被持有」,`:495` 起。
8. **K3。** 账户未载入时写在 `anonymous` 键下的回执与留字,账户一知道就认领:回执 `draftBlockPersistence.ts:103`(`blockEditRecoveryLocations` `:126` 内 `:136` 调用;写入路径 `:526`);留字 `structureTypingBuffer.ts:92`,在 `readUnplacedWords` `:110` 调用。
9. **来源标签与闸断言。** `structureTypingBuffer.ts:83` `source?: 'window' | 'edit' | 'split'`;闸的 window-only 读取排除 edit / split,`structureTypingConservation.test.tsx:255`;阳性对照 `dropWindowRecords`(`:276` 说明,`:439` 生效,`:672` 用例)。
10. **K5。** 本次访问自己打字留下的回执不给 Apply:控制器过滤 `hooks/useNoteCanvasRuntimeController.ts:606`,来源 `isVisitReceipt` `hooks/useTextFlowHistory.ts:1206`;有新回执时重渲,`:400`。
11. **K6。** 被扣的离开按原种类重开:replace 仍走 `location.replace`,`hooks/useNoteRouteSaveBoundary.tsx:66`(`goHeld` `:61`)。
12. **LATEBACK 与后退。**
   - 状态:`SAVING_BEFORE_LEAVING` `:16`,显示在 `:252`。
   - 复查:flush 后最多再两轮,`:93`;仍有未存就 `keepOpenEdit`,`:99`。应用内链接(blocker,`:128`)与被扣的 hash 共用 `flushForLeave`。
   - 第二步:`:189-199`。
   - 后退(GONEFAIL-back):traverse 不扣,走 `keepAndLeave` `:173`(`:205` 分流);失败判定 `useNoteCanvasRuntimeController.ts:870-881`。

#### 偏离裁定之处

- 起点用「已交出」的内容(`handedFlows`),不只用已确认的:在途保存已有回执,不必再记一份。
- K5 过滤放在控制器,不放在适配器:放在适配器会打破很多既有测试,适配器保持只改 3 行(`hooks/useNoteCanvasDataAdapter.ts:2148`)。

#### 已知残余

- 已封口、排队中的纯文本组所在单元,如果离开前又在劈点之前被劈分,被劈单元的这段排队文字不保留(裁定:被劈单元不记)。
- 守恒闸 K2 臂已删:它在 `04f6f822` 上同样丢 `<k1>`,是修前就有的重试链问题,归 A-25 ②a(阳性对照 `CHAIN`)。
- 一次失败弹两条提示,修前就有,归 A-25 (e)。
- 适配器对路由已换之后的 2xx 报失败(TD-62),A-25 查报加一问。
