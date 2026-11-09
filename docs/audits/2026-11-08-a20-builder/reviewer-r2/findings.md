> **状态 (Status)**: active
> **层 (Layer)**: 审计 / Audit（Reviewer 复核发现，只出发现不裁定）
> **日期 (Updated)**: 2026-11-08

# A-20 r2 复核发现（Reviewer）

**总判断**：r2 的三本账基本成立。`unconfirmed` 已删尽。劈分记录读码找不到能自动落地的路。适配器恰好改了 3 行。`useHeadingStructureController.ts`、`transferTextUnit`、server 都是零 diff。但有一条读码确认的丢字（M1）：连打两个回车，中间那行的字不在任何一张账里。它比回执里说的残余 #1 宽，触发条件就是平常打列表。另有一条疑似 ②（M2）：应用内后退时保存失败，人被路由拦截器留在笔记上，此后若撤销，被撤的字下次打开会自动落回（K2 的形状，换了入口）。浏览器探针没盖这条后退路。

- 对象：ops 包 `packages/a20-idle-save-r2/src/`，15 个文件，`sha256sum -c` 15/15 OK，基线 `04f6f822`。
- 行号前缀：H = `hooks/useTextFlowHistory.ts`，R = `hooks/useNoteRouteSaveBoundary.tsx`，C = `hooks/useNoteCanvasRuntimeController.ts`，A = `hooks/useNoteCanvasDataAdapter.ts`，P = `draftBlockPersistence.ts`，B = `structureTypingBuffer.ts`，S = `textFlowEditSession.ts`，G = `hooks/structureTypingConservation.test.tsx`，L = `hooks/useNoteRouteSaveBoundary.leave.test.tsx`，HSC = `hooks/useHeadingStructureController.ts`（`04f6f822` 版，包与 HEAD 都未动）。
- 方法：只读码，没跑测试，没起工作流，没占锁。
- 标记：确认 = 读码能走通；疑似 = 读码走得通，但有一环（浏览器时序或环境）要实测；未找到 = 找过，没有。🅰 / 🅱 只是建议，由 Main_Designer 裁定。

## 发现

### M1 · 确认（读码）· ① 丢字 · 建议 🅰 候裁：连打两个回车时，中间那行的字不在任何一张账里

**路径**

1. 编辑器里，回车单独成一组：`insertParagraph` 属于 standalone（S:111），记下就立即封口（S:141）。回车之后打的字是另一组纯文本，`plainTyping` 判定（H:181）后进 `unsent`（H:671）。
2. 前一次保存还在路上时，打 `k0 ↵ x ↵ y`，排队的依次是：
   - S1：回车，新长出 U2，进 `unsentSplits`；
   - G_x：U2 里的 `x`，进 `unsent`；
   - S2：在 U2 末尾回车，劈的是 U2，新长出 U3；
   - G_y：U3 里的 `y`，还开着。
3. 离开时 `keepOpenEdit`：
   - `born` 里 U2 的文本取自 S1.after，是 `""`（H:761-768）；
   - H:771 因为 S2 劈的是 U2，删掉 `ends[U2]`，`x` 随之丢失；
   - H:773-774 用打字覆盖 `born` 时，已经取不到 `x`；
   - H:776 文本为空，跳过。
4. 结果：U3 只记了 `y`。`x` 没交给过适配器，所以没有回执；不在留字框；不在服务器上。

**与裁定的关系**

- 回执的残余 #1（排队的纯文本组所在单元被劈，被劈单元的排队文字不保留）在机制上就是这条，Main_Designer 按「窗口极窄」收了。
- 但这里被劈的 U2 是排队中的 S1 新长出来的单元，服务器上没有。裁定 (B)「不记原单元」的理由是整段替换会删掉服务器上已有的字，这个理由对 U2 不成立。U2 正属于裁定里应该记的「新长出来的单元」。
- 触发条件就是平常打列表（一行一个回车），只要队列没排空时关页、后退、从地址栏离开或遇到 401，中间每一行都会丢。
- 同一行（H:771，注释写了「its later typing too」）还会丢掉开着的组：在 S1 仍排队时，点回被劈的原行接着打字，也一样丢。
- 修前同样丢（不比修前差），但 r2 封包依据的「窗口极窄」前提不成立。
- 闸的 jsdom 序列里，`enter` 之后紧接 `type` 是否也是两组，我没有跑，无法确认闸是否生成过「回车-打字-回车，保存被扣住，然后卸载」这一序列。

已先行短讯。

### M2 · 疑似 · ②（K2 同形，换了入口）· 建议 🅰 候实测：应用内后退时保存失败，人被留在笔记上；此后撤销，被撤的字下次打开自动落回

**路径**

1. 从应用内链接打开笔记 A（路由自己推的历史条目，带 `idx`），打字（开着的组）。网络不好，下一次保存会失败。
2. 按后退：
   - Navigation API 的 `traverse` 先到 R:205，走 `keepAndLeave`（R:173-181）：`released = true`，`keepOpenEdit` 写下记录 K（起点 = 已交出 / 服务器的内容，终点 = 屏上文字），然后失焦封口并发出保存。
   - 接着 popstate 到路由：拦截器（R:115-117 按 pathname 判定）拦下这次 POP，进 R:119-137 的 `flushForLeave` → `flush`。保存失败，`flush` 抛出（H:1192），`blocker.reset()` → **人留在 A 上**。
   - 因为 `released` 为真，R:135 不弹「请重试」。`keepAndLeave` 的 `whenLeaveSettled` 却会拒绝：新写了回执（C:878），于是弹 LEFT_UNSAVED「已离开、在本机、重开恢复」，可人并没有离开。
3. 留在 A 上，选择撤销那组失败的字：
   - `persist(T,'before',true)` 成功后，`settleKept`（H:804-817）发现服务器上是撤销后的文字，不等于 K 的文字；
   - K 是 `edit-` 记录，于是在 H:814-816 被**重锚**成 `{initialText: 撤销后的文字, text: 被撤的文字}`，继续等待；
   - 这条记录本次访问不显示（HSC:614-645 的恢复只在换笔记时跑）。
4. 之后正常离开，再打开 A：
   - `typedTextIsPlaced` 为假；
   - `mergeTypedText` 里 live 等于 initial（HSC:73），整段替换成被撤的文字并保存。**被撤的字自动回来了**，就是 K2 的形状。

**附带**

- `released` 在本次访问剩下的时间里一直为真。此后脚本改 hash、地址栏、401 这些离开，`leaving()` 都返回 null（R:168），既不扣住也不经 `flushForLeave`。开着的组和 `unsent` 仍由作用域结束时的 `keepOpenEdit`（H:855）兜住。卸载时的兜底 flush 也被跳过（R:151）。
- 若在第 3 步改为重试成功：`settleKept` 发现文字相等，删掉 K，干净。若改为接着打字再封口：依赖环先按 T 原文重发（H:255-263），也删掉 K。坏分支只有「撤销」这一条。

**覆盖缺口**

- 探针的 back 臂（a20d：先 `goHash` 到另一笔记，再 Back）走的是脚本 hash 造的条目，没有 `idx`，路由拦不住，所以 GONEFAIL-back / BACKOK 的 `where = other`。
- L 的 `traverse` 测试（L:253 起）用的是内存路由，没有「`traverse` + 路由拦截器 + flush 失败」的组合。
- 真实用户的后退（从列表点进笔记再后退）这条路还没被任何臂量过。

**建议臂（供 Tester 参考，不是指令）**：应用内点进笔记，打字，扣住保存后答 500，按后退。记录三件事：人最终停在哪里、弹了哪条提示、框里和存储里有没有记录。再加一条「撤销 → 离开 → 重开」，看服务器上的文字。

### M3 · 疑似 · 🅱（形状同 STALE，入口不同）候裁：`keepAndLeave` 与 R:99 先记后交，同一组同时在留字框和回执里

**路径**

1. `keepAndLeave` 先 `keepOpenEdit`（R:175），再失焦（R:177-179）。LATEBACK 的 R:99 也是先记，然后才离开。
2. 记下的开着的组随即封口、交出，有了回执。此刻同一组同时在记录和回执里，违反「任一时刻只在一张账」。
3. 回执这边：迟到的 2xx 会被适配器忘掉（A:2146-2148）。记录这边：保存在路由换走后才回来，H:298 的 `!current()` 先返回，H:305 的 `settleKept` 不跑，记录留下，而字已在服务器上。
4. 重开时，那行若没被别处改过，`typedTextIsPlaced` 认出已落地，删掉记录，干净。若期间在第二设备上把这行改回去，重开后记录在 HSC:73 自动落地，把别处删掉的字带回来。这就是 STALE-back 的形状。

**范围**

- 关页路干净：`beforeunload` 先失焦交出，R:99 的 `hasUnsavedEdit` 按 `handedFlows` 判为相等，不再记录。所以 Tester 的 STALE（关页）在 r2 = 修前。
- 后退、地址栏、401 这三条路，在修前是丢字，在 r2 是保住字但可能覆盖别处的修改。
- 建议 STALE 加一个后退变体。

### M4 · 疑似 · 🅱（视页面能否进 bfcache）：`pagehide` 后页面从 bfcache 恢复，继续编辑，后来的字可能被旧记录删掉

**路径**

1. H:857 在 `pagehide` 时照常 `keepOpenEdit`，不看 `event.persisted`。客户端没有 `unload` 或 `pageshow` 监听（grep 无），页面大概率能进 bfcache。
2. 页面恢复后，开着的组继续打字，空闲保存成功。`settleKept` 把记录重锚成 `{initialText: 新文字, text: 旧文字}`（H:814-816）。
3. 下次打开：`typedTextIsPlaced` 为假（旧文字之后接的不是行尾），live 等于 initial，HSC:73 整段替换成旧文字，**后来打的字被删**。
4. 可达性：保存还在路上时，Chrome 一般不让页面进 bfcache；所以要「pagehide 时有未存的字，但没有在途请求」，例如离线时保存已快速失败。窄，记 🅱。

### M5 · 确认（读码）· 🅱 记账前提：「交出即有回执」有三个例外

- H:285-290 在调用 `saveBlock` 之前就把组移出 `unsent`，并记 `handedFlows`。但适配器有三处在写回执之前就返回拒绝：A:1910 `mutation_not_allowed`、A:1922 `route_receipt_unavailable`、A:1987 `board_range_sync_failed`。
- 这样的组只留在 `failures` 里。离开时 H:785 的起点取 `handedFlows`，判为相等，不记录；`whenLeaveSettled` 因为没有新回执，不提示（C:878）。
- 可达性：
  - A:1922 从 `persist` 实际走不到：`routeNoteIdRef`（A:532）与作用域令牌（H:852）在同一次渲染里更新，`persist` 的 `current()` 检查（H:248、H:258）与 `saveBlock` 之间是同步的。
  - A:1987 能走到，但少见。
  - G 的适配器模拟（G:122-136）每次保存都写回执，没有建模这三种拒绝。

### M6 · 确认（读码）· 🅱 K3 认领的三处边

1. **损坏的匿名条目会挡住整个列表**：B:97 的 `JSON.parse` 在 B:109-119 的 try 里。匿名键的值若损坏，`readUnplacedWords` 对这篇笔记永远返回 `[]`，`rememberUnplacedWords`（B:130-134）随后用单条覆盖账号下已有的记录。都是自写的 JSON，出现概率低。
2. **认领回执时不保证一块一条**：P:103-117 只按 `recoveryKey` 去重。账号未载入时，若对某块打字而保存失败，回执写在匿名键下；同块旧回执还在账号键下，认领后同一块会有两条。与 A-25 ②a「陈旧回执去重」同题。
3. **匿名条目由下一个读到它的账号认领**（P:136、B:93），不核对写入时是谁。只影响记录归属，按数据一致性记，不展开。

## 九条点名 + 核心问题逐条核

1. **保险带只记开着的组和 `unsent`，起点、终点**：成立。
   - 起点取 H:785，经 `serverFlow`（H:724：`handedFlows` → `confirmedFlows` → 观察到的块内容）；起点等于终点就不记，已有的删掉（H:787-790）；终点在 H:752，开着的组用 `peek`，等于屏上文字。
   - `peek` 带 `duringComposition`（H:751、S:149-151）。
   - 例外：被劈单元，见 M1。
2. **已封口的字没有快照型的留住路**：成立。`failures` 里已交出的组不进记录，只靠回执。
3. **三本账、两次交接、出口**：
   - 交接 1 在 H:670-672；交接 2 在 H:285-290。
   - 另外两个出口：空闲保存认领（H:676-681，`sameSnapshot` 相等），恢复扫除 `leaveUnsent`（H:317）。
   - 依赖环失败（H:258-262）时组留在 `unsent`，这是对的，因为它没交出、没有回执。
   - 撤销、重做的重放也经过 H:285，被撤的组随之离开 `unsent`。
   - 双记：M3；漏记：M1、M5。
4. **`unconfirmed`**：grep 包内为零，`confirmTyping` 也为零。重试确认改为 H:317 的扫除（只在带 `recovery` 的重试上跑）。persistTemplate 和三处文档类调用（H:351、H:441、H:485、H:593）有 `typingRecovery` 时同样经过 H:317。
5. **劈分记录永不自动落地**：找了反例，**未找到**。
   - 记录 `initialText: ''`，不带 writingRole（H:779）。
   - 恢复时 HSC:640 `fixRole(entry, undefined)` 把角色定为 undefined，HSC:543 的 `emptyMatches` 因此为假；HSC:73 不走整段替换；HSC:86-90 两侧都没有锚点，`at = -1`，返回 null，留在框里。
   - `settleKept` 对 `split-` 不重锚（H:813），只在服务器上同 id 的文字恰好相等时删掉（H:812）。
   - Y1 形状（id 被复用且为空）下，`emptyMatches` 仍为假，不落地。
6. **K3**：两把钥匙的认领在 P:103 / P:136 / P:526 和 B:92 / B:110，能走通，边角见 M6。
7. **K5**：控制器在 C:606 过滤，来源是 H:1206；本次访问的回执只来自 `persist` 的失败（H:306-309），空闲保存失败也算。H:1183 直接调用 `saveBlock` 那条路的失败没有标为本次访问，归 A-25。
8. **K6**：R:66 的 replace 仍是 `location.replace`；`goHeld` 里先置 `released`（R:65），重开那一步不会再被扣住。
9. **LATEBACK、第二步、traverse**：
   - 复查最多两轮（R:93），仍有未存就记录（R:99）。
   - 第二步：能扣住的改目的地，不能扣住的 `keepAndLeave`（R:189-201）。
   - traverse 走 R:205-208。
   - 以上读码都与回执一致。traverse 遇上路由拦截器的那一支见 M2。
10. **`whenLeaveSettled` 的回执快照判定**（C:867-881）：
    - 打开时账号未知：快照读的是匿名键，账号键下已有的回执都算「新」，一有失败就弹。这就是裁定的「偏向弹」。
    - 「同一 `queuedAt` 重写」：键里带 `recoveryKey`（含操作序号和挂载随机数，A:1998-2004），重写必然是新键，不会被当成旧的。
    - 两个笔记串台：按 `noteId` 过滤（C:878），闭包里是旧笔记的 `noteId`。没有串台路。
    - 漏报：M5 的三种拒绝不提示。
11. **零 diff**：
    - 适配器对 `04f6f822` 恰好 3 行（A:2146-2148）。
    - `useHeadingStructureController.ts` 不在包内，`04f6f822..HEAD` 也无 diff。
    - `transferTextUnit` 在包内只出现在两个测试文件；它的实现在适配器里，适配器只有那 3 行。
    - server 不在包内。
12. **闸**：
    - 回执的写入、删除在 G:100 / G:123 / G:136，计入「被持有」在 G:495-500。
    - 只读窗口的过滤在 G:255。阳性对照 `dropWindowRecords` 在 G:439 生效，G:672 是用例。豁免已删（G:567）。
    - 局限：模拟没有建模 M5 的拒绝；M1 的序列是否被生成过，没跑无法确认。

## 用量

- 本单读码在本会话内完成，没起子代理，也没起工作流。本会话拿不到精确的 token 计数，所以这里不报数字。
