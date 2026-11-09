> **状态 (Status)**: active
> **层 (Layer)**: 审计 / Audit（Reviewer 复核发现，只出发现不裁定）
> **日期 (Updated)**: 2026-11-09

# A-20 r3d 小核发现（Reviewer）

**总判断**：r3d 的 N1 / N2 / N3 / N5 / N6 改动都在回执所指的行上，和裁定一致。

- `released` / `leftUnsaved` 不变量仍成立。
- 运行时把手（handle）的四个成员在类型、解构、`useImperativeHandle`、依赖数组四处都在，外层 `forwardRef` 也透传了。
- 离开时的 flush 链里没有计时器或提前返回会在 PUT 在途时放人。
- 封前五答的行号与结论都核实成立。
- 范围成立：17 个文件；适配器对底仍恰 3 行；server 零 diff；HSC 的 diff 只含 N6 / N6a / N6b。

但按不变量找反例，找到两条疑似要紧的（均已先行短讯）：

- **P1（疑似 ③，反 N6 不变量 a）**：Apply 在途期间，它的回执被移出提供列表，HSC 不再扣框里的字。若 HSC 的重试恰好在这段时间到点，框里的字落进不含 aaa 的草稿，Apply 的采纳因此作废，回执照常被忘掉，随后落地那次保存把 aaa 从服务器上覆盖掉。屏上、服务器、回执里都不再有 aaa。
- **P2（疑似，建议 🅰，反 N1 不变量）**：先合行再回车，回车会复用被合掉那行的单元 id。新行的记录被当成「服务器上那行」的 edit 记录，重开时自动落地，把服务器上原来那一行改写掉。

其余：

- N2 谓词与路由有两形不一致（P3 大小写，P4 `%2F`），都要人手改地址。
- N3 有第四个提示源不经 `sayLeaveFailure`（P5），需要「beforeunload 之后页面没走」。
- N6 首见在一种同挂载快速往返里取到上一次访问的客户端副本（P6）。
- 只差角色或格式的回执不扣（P7，按不变量的定义在范围外）。
- 闸的 mask 比注释说的宽（P8）。

---

- 对象：ops 包 `packages/a20-idle-save-r3d/src/`，17 个文件，在包内 `sha256sum -c ../src.sha256` 17/17 OK；两份清单文件自身的哈希与回执一致（`2468779d…`、`0a782ec0…`）。基线 `04f6f822`。同时对照了 r3 包 `src/`。
- 行号对包 `src/`，目录 `client/src/pages/Notes/canvasEngine/`。前缀：
  - H = `hooks/useTextFlowHistory.ts`
  - R = `hooks/useNoteRouteSaveBoundary.tsx`
  - C = `hooks/useNoteCanvasRuntimeController.ts`
  - A = `hooks/useNoteCanvasDataAdapter.ts`
  - HSC = `hooks/useHeadingStructureController.ts`
  - NCR = `NoteCanvasRuntime.tsx`
  - LT = `hooks/useNoteRouteSaveBoundary.leave.test.tsx`
  - G = `hooks/structureTypingConservation.test.tsx`
- 包外文件（`textUnitEditorService.ts`、`inFlightWriteRegistry.ts`、`App.tsx`、`NoteDetail.tsx`、server）行号对共享树。这几处自 `04f6f822` 起零改动，`git diff 04f6f822 -- client/src server/src shared` 为空。
- 路由库行号对 `client/node_modules/@remix-run/router/dist/router.cjs.js`（react-router 6.30.3）。
- 方式：只读码；没跑测试、没构建、没用子代理、没取锁。Token 数：不可得。

## 发现

### P1 疑似 ③（建议 🅰）：Apply 在途时 kept 字可以落地，落地那次保存覆盖掉刚 Apply 的字

**违反的不变量**：N6 (a)，「同块有别次挂载的回执且其文字 ≠ 服务器现文 ⇔ kept 字进框不落地」。Apply 在途时回执仍在存储里、文字仍不等于服务器，但 HSC 已经看不见它。

**接线**：
- `A:638-639` 的回执列表会滤掉 `pendingRecoveryKeys`，即在途保存的回执键（`A:635-637`）。
- Apply 走 `saveBlock`，在 `A:2102-2107` 把自己的回执键登记为在途，并在 `A:2108` 调 `setBlockEditRecoveryVersion` 触发重渲。
- 重渲后 `C:406-407` 的 `offeredRecoveryReceipts` 里没有这张回执，经 `C:415` 传给 HSC。
- HSC 的 `recoveryWaiting`（`HSC:174-179`）对该块返回 false，`HSC:583` 不再扣。

**触发顺序**（HEADCLOSE 形）：
1. 重开。框里有 bbb，恢复横幅里有 aaa，Apply 可点。
2. 点 Apply，PUT 在途。
3. 在途期间，框的退避重试到点：`retryTimer` 在 `HSC:248-256`，800 ms 起翻倍，封顶 10 s（`HSC:48`）；到点后经 `landKept` 走 `placeTyped`。
4. `canApplyEdit`（`H:930-931`）不看适配器的在途保存，所以字落进现行草稿：'warmup bbb|'，不含 aaa。
5. Apply 回 200：
   - `A:2121`（`adoptRecovery`）与 `A:2189`（草稿采纳）都要求 `recoveryDraftIsCurrent()`（`A:1939-1944`）。草稿已被落地改过，所以两处都不采纳，编辑器仍是不含 aaa 的那一版。
   - 落地那组还开着（空闲保存要等 2 s，`H:718` / `H:57`），没有登记成在途保存，所以 `A:2200-2202` 照常忘掉 Apply 的回执，横幅消失。
6. 约 2 s 后，空闲保存发出落地那组：
   - `baseFor`（`H:232-237`）取 `max(block.text_save_revision, committedBases)`；Apply 成功时 `A:2187-2188` 已把块的 revision 刷成 R+1。
   - 内容是 `transaction.after`，即不含 aaa 的那一版。
   - PUT 200，服务器变成 'warmup bbb|'，aaa 被覆盖。

**结果**：aaa 不在服务器、不在回执、也不在屏上。人看到的是「Recovered block edit applied」提示，然后横幅消失。

**分支**：
- 若落地那次 PUT 赶在 Apply 回来之前发出（例如人在落地后立刻按回车），两边 base 都是 R，必有一条 409，成冲突项，不静默丢。
- `writeRegistry.hold`（`inFlightWriteRegistry.ts:69-78`）不串行化，同块两次保存会并发。

**概率**：约等于 Apply 往返时间除以当前退避间隔。重开后越早点 Apply 越容易撞上：间隔 0.8 / 1.6 / 3.2 s 时，300 ms 往返的命中率约为 37% / 19% / 9%。

**为何 Tester 的 HEADCLOSE-Apply 没盖到**：57 ms 代理下，回执写的读数是先 PUT `warmup|aaa`，再 PUT `warmup bbb|aaa`。落地发生在采纳之后，没有落进这个窗口。

**可证伪的臂**（建议）：HEADCLOSE-Apply-slow。代理只把 Apply 那次 PUT 扣 ≥2 s，保证覆盖一次退避重试，其余照 HEADCLOSE-Apply；读服务器、框、横幅、提示。预测 r3d 上服务器是 `warmup bbb|`，aaa 无处可寻。

**修前对照**：修前没有 N6 的扣，kept 字立即落地。修前形状见 HEADCLOSE 基线：aaa 有 Apply，bbb 丢。这一形是 N6 引进来的，所以「比修前差」要看 HEADCLOSE 修前的读数怎么记。

**我能确认的部分**：P1 的读码链（过滤 → 重渲 → 不扣 → 不采纳 → 忘回执 → 新基准覆盖）每一跳都在上述行上。**没跑过**。

### P2 疑似（建议 🅰）：先合行再回车，新单元复用被合掉的 id，它的记录被当成服务器那行的 edit 记录，自动落地改写那一行

**违反的不变量**：N1，「凡改变单元集合的组，其记录永不自动落地」。回车那组（E）是劈分组，它新长出的单元本该只记框。但这个新单元的 id 恰好与服务器上一行相同，所以 `H:804` 的「服务器没有」判断不成立，它也不在 `joined` 里。

**接线**：
- `textUnitEditorService.ts:55-63` 的 `createNextUnitId` 取当前流中 `tu-` 的最大后缀 +1。回车 `splitTextUnitForEnter` 在 `:169` 用它生成新单元的 id。
- 合行 `mergeTextUnitWithPrevious`（`:192`）把单元从数组里移除。所以若被合掉的是最大号单元（通常是块的最后一行），下一次回车生成的新单元复用它的 id。
- H 的注释早写着「a later unit may reuse the id」（`H:166`）。M1 靠 `server && !onServer` 识别新单元，但复用 id 之后服务器上**有**这个 id。

**触发顺序**：
1. 服务器 ['ab'(tu-1), 'cd'(tu-2)]，有一次保存在途。
2. 在 cd 行首退格合行，得 J 组（structural、单独成组）：before {tu-1, tu-2}，after {tu-1 'abcd'}，`removesUnits` 真，进 `unsentSplits`。
3. 在 'abcd' 行尾回车，得 E 组：after {tu-1 'abcd', tu-2 ''}，新单元又叫 tu-2；`isSplit` 真，进 `unsentSplits`。
4. 在新行打 Z（开着的组）。
5. 不可扣的离开（地址栏 / 401），或在途保存未回时关页。在途那次保存随后成功，回执被忘掉（`A:2146-2148` 或 `A:2202`），所以重开时没有回执拦着（N6 不扣）。
6. 重开。`keepOpenEdit`（`H:781-806`）：
   - tu-1：J 改过它，`H:794` 把它记进 `joined`，于是走劈分记录，起点空，内容 'abcd'，进框不落地。✓
   - tu-2：E 里 `was` 为 undefined，没有 `cutText`；E、Z 都不删单元，不进 `joined`；服务器有 tu-2（'cd'），所以 `H:804` 不成立。`H:813-814` 的 `initialText = onServer.text = 'cd'`，于是记成 edit 记录 {initial 'cd', text 'Z'}。
   - HSC 重开时现文 'cd' 等于起点，整段替换（HSC:73，r3 报告所述，HSC 该段 r3d 未改）。服务器自动变成 ['ab', 'Z']，框里另有 'abcd'。

**对照**：
- 离开时的屏：['abcd', 'Z']。
- 修前：服务器 ['ab', 'cd'] 原样，J / E / Z 都丢。
- r3d：服务器上 'cd' 那一行被自动改写成 'Z'，'cd' 只剩在框里的 'abcd' 中。手册「已知」教人别把与笔记重复的框内容贴回；人若据此 Dismiss 掉框，cd 就丢了。

**同族**：只删整行不合行（tu-1 未变）再回车打 Z，结果 ['ab', 'Z'] 正好等于屏，不算反例。差别在于合行把 cd 的字挪进了只记框的那一行。

**可证伪的臂**（建议）：MERGE-reenter。即 N1 的 MERGE 臂，合行后在行尾回车再打一个 token，读服务器与框。

### P3 确认（读码）· 建议 🅱：同篇判定对大小写与路由不一致

**违反的不变量**：N2，「谓词与路由对同一篇判定一致」；方向是路由判本篇、谓词判别篇。

**接线**：
- 路由匹配默认不分大小写：`compilePath` 在 `caseSensitive` 默认为 false 时给正则加 `i` 标志（router.cjs.js:1076、:1112）。
- `App.tsx:111` 的 `<Route path="notes/:noteId">` 没有 `caseSensitive`。所以 `#/Notes/<id>`、`#/NOTES/<id>` 由路由解析为本篇，同一个 NoteDetail 实例，不卸载。
- `hashRoutePath`（R:15-21）不改大小写，R:209 与 R:239 判它不是本篇。

**触发顺序**：
- 用地址栏把 hash 改成 `#/Notes/<id>`。这一步不可扣，走 R:268 的 `keepAndLeave`：`released` 置真、`kept` 置真、记录冻结。路由对这种 POP 不问拦截器（R:196 注释），人没走、不卸载，所以收回不发生，`released` 一直卡在真。这正是 r3 N2 的形状。
- 若是脚本改 hash（可扣），则走 R:269-276：flush 之后 `goHeld` 在 R:82 置 `released` 真，同篇不卸载，同样卡住。

**可达性**：应用自己生成的链接都是规范小写（r3 报告已普查 9 处 `navigate`、4 处 `<Link>`），只有人手改地址或粘贴外部链接才会触发。

**测试**：LT:391-401 只覆盖尾斜杠、二级锚点、query 三形。

### P4 确认（读码）· 建议 🅱：`%2F` 一形谓词判本篇、路由判别处（反向）

**接线**：
- 路由的 `decodePath`（router.cjs.js:1115-1117）逐段解码后把 `/` 重新编码成 `%2F`。
- `hashRoutePath` 在 R:19 整串 `decodeURIComponent`，之后才在 R:20 去尾斜杠。

**例子**：
- `#/notes%2F<id>`：谓词得 `/notes/<id>`，判本篇；路由里它是一段，不匹配 `notes/:noteId`。
- `#/notes/<id>%2F`：谓词去尾斜杠后得本篇；路由得 noteId = `<id>%2F`，是别的（不存在的）笔记。

**后果**：两者都在 R:239 / R:209 提前返回，不扣、不 keep。人离开了本篇，但没有经过 `flushForLeave` 的扣留。字并不丢：

- 第一例 NoteDetail 卸载，H:891 的卸载效应调 `keepOpenEdit`，R:189-192 的微任务做 best-effort flush。
- 第二例 noteId 变化，H:138 的 scope 轮换，同样走 H:891。

**来源**：裁定要求「解码」。路由的解码不还原 `/`，所以全串解码只在 `%2F` 上与路由相反。

### P5 疑似 · 建议 🅱：N3 的第四个提示源 R:298 不经 `sayLeaveFailure`

**违反的不变量**：N3，「一个 pending 至多一条 SAVE_FAILURE」。

**三源核对**：

| 源 | 位置 | 经 `sayLeaveFailure` |
|---|---|---|
| 拦截器 | R:171 | 是 |
| hash 扣住 | R:275 | 是 |
| 卸载微任务 | R:191 | 否，直接 `addToast`；但它要求 `!scope.pending && !scope.released` 且已卸载（R:190），与前两源不可能落在同一个 pending、人又没走的时刻 ✓ |
| beforeunload | R:298 | 否 |

**第四源**：R:298。`flushForLeave(runtime, true)` 在已有 pending 时返回同一个 pending（R:98），R:298 再挂一个 `.catch(() => addToast(SAVE_FAILURE))`。

**触发顺序**：
1. 拦截器扣着离开，flush 在途（「Saving before leaving…」）。
2. beforeunload 触发，但页面没有真卸载。
3. flush 失败：R:171 一条，R:298 又一条，同一个 pending 两条。

**可达性**：
- 「beforeunload 之后没卸载」是 r3 已登记 TD-64 的那条路，应用内没找到触发。
- 另一条可能是进 bfcache 再恢复：beforeunload → pagehide(persisted) → pageshow。浏览器是否允许带在途 fetch 的页进 bfcache，我没核。
- 归为疑似。

**测试**：N3a（LT:406-425）与 N3b（LT:429-443）断言的都是 `filter(...).toHaveLength(1)`，即条数，不是形状，并都等 20 ms 收尾 ✓。N3b 如回执所说只覆盖不对照。

### P6 疑似 · 建议 🅱：N6 首见在同挂载快速往返时取的是上一次访问的客户端副本，不是新鲜的服务器文

**违反的不变量**：N6 (b)，「新鲜挂载里 openedTexts 首见先于任何写者」。回执 ② 只论证了新鲜挂载。

**同挂载的情形**：
- 适配器换篇时不清 `blocks`：全文件没有 `setBlocks([])`；NCR:35-36 的注释也说「note lags the route while the next one hydrates」。
- 路线：A →（离开）B，在 B 的 fetch 落地之前又回到 A。
- HSC:167 在 noteId 变回 A 时清空 Map；但此刻 `input.blocks` 仍是 A 上一次访问留在状态里的块，HSC:168-170 把它们记成「首见」。A 自己的 fetch 落地后不再重读，因为已经见过。

**差异**：
- 上一次访问若是不可扣离开（keep 之后在途保存晚于换路由才回），回包按 A:2146 不写回状态。
- 于是 openedTexts 比服务器旧，比较的对象错了。

**两个方向**：
- 回执等于新服务器、但不等于旧副本 → 多扣。保守方向，框多等。
- 回执等于旧副本、但不等于服务器 → 少扣。需要一张内容恰好是「旧文」的别次回执，例如撤回到旧文的那次保存失败。少扣即 P1 的后果形。

**可达性**：要在 B 加载完之前回到 A，且上一次 A 是不可扣离开。低。

### P7 观察 · 建议 🅱：只差角色、缩进、内联结构的回执不扣

- `unitTexts`（HSC:133-135）只比 id 与文字。
- 一张回执与服务器只差 `writing_role`、缩进或 `inline_structures`（例如上一页标题化失败的那次保存）时，判为「服务器已有」，不扣。
- kept 字落地那次保存的回执会替换它，成功后被忘掉，于是那次结构改动丢了。
- 按 N6 (a) 的字面（「文字 ≠ 服务器现文」）这在范围外。记一笔，供裁定时决定不变量要不要含结构。

### P8 疑似 · 建议 🅱：闸 `keptTokens` 的 mask 比注释说的宽

- G:534-535 的 `boxOnly` 以 `initialText === ''` 判「永不自动落地的框记录」。
- 但 `keepOpenEdit` 的 edit 记录在服务器那一行为空时，`initialText` 也是 ''（H:813-814）。
- 这种记录带 `writingRole`（H:826），重开时 `fixRole`（HSC:682）定了角色，于是 HSC:585 的 `emptyMatches` 成立，会自动落地。
- 所以 mask 也遮住了「可自动落地、空起点的 edit 记录与笔记里同一 token 并存」的状态。r3 的闸会把这种状态判成 DUPLICATED。
- 我没找到在这一状态下真会落两次的路：下次重开 HSC:572 的「已在笔记里」会 `finish`。所以这条只是闸的盲区比 TD-66 注释写的宽，**未找到真实被遮的重复**。
- N4 形（整段已在服务器）仍判红 ✓。

## 九条点名逐条

1. **N1 不变量**：
   - `removesUnits`（H:186-189）按非 deleted 的集合差判。与 `isSplit`（H:180-183）合起来，覆盖了「集合有元素进出」的全部情形。
   - 入账 H:692-693 不看 kind ✓。
   - `joined` 在 H:794 收删单元组里改过的单元，H:804 与「服务器没有」同待遇 ✓。
   - 「先合再劈」见 P2。
   - 「同组内先删行再在别处回车」不可能：回车和 structural 都单独成组（`textFlowEditSession.ts:110-111`、:141）。
   - 拖拽 / 粘贴多行：粘贴、拖放也单独成组；长出的新单元走 `isSplit`。复用 id 的问题同 P2，只要前面有删单元的组。
   - 「整行删、无其他字变」：该组没有 end，不留记录，删除意图丢失，等同修前，不重复、不错落。
   - 「deleted → 复活」：集合变了，但 `isSplit` 的 before 集合含 deleted 的 id，`removesUnits` 也不命中，两边都不中。不过 keepOpenEdit 里服务器那边这个单元是 deleted，于是 `onServer` 为空，走框 ✓。编辑器里没找到产生 deleted 状态的写者（合行是移除）。
2. **N2**：三形（尾斜杠、二级锚点、query）同判 ✓；`hashRoutePath` 与 `parsePath`（router.cjs.js:387-400，先切 `#` 再切 `?`）一致 ✓。不一致两形见 P3（大小写）、P4（`%2F`）。
3. **N3**：两源经 `sayLeaveFailure`，WeakSet 按 pending 去重 ✓；R:160 的 `flushed` 在拒绝处理时一定已赋值 ✓（runtime 为空时 pending 是 resolve，不会拒绝）。第四源见 P5。测试断条数 ✓。
4. **N5**：

   | 成员 | 类型 NCR | 解构 NCR:33 | 暴露 NCR:47-48 | deps NCR:49 | C 返回 |
   |---|---|---|---|---|---|
   | `whenLeaveSettled` | :20 ✓ | ✓ | ✓ | ✓ | :891 ✓ |
   | `keepOpenEdit` | :22 ✓ | ✓ | ✓ | ✓ | :892 ✓ |
   | `withdrawKeptEdit` | :24 ✓ | ✓ | ✓ | ✓ | :893 ✓ |
   | `hasUnsavedEdit` | :26 ✓ | ✓ | ✓ | ✓ | :894 ✓ |

   余下几跳：
   - H 返回：`keepOpenEdit` H:1240、`withdrawKeptEdit` H:1242、`hasUnsavedEdit` H:1248 ✓。
   - 外层 `forwardRef` NCR:85-86 透传 ref ✓。
   - `NoteDetail.tsx:11-15` 的回调 ref 只收非空 handle，deps 变时 React 先给 null 再给新 handle，取到新的 ✓。
   - 测试 `NoteCanvasRuntime.appearance.test.tsx:69-79` 经真实 handle 调四个成员 ✓。但成员名单是手列的（`mocks.leave`），类型上将来再加成员它不会自动覆盖；controller 一跳被 mock 掉了。

   接缝上的 `?.()` 以及缺失时各自静默吞掉什么：

   | 位置 | 调用 | 缺失时的后果 |
   |---|---|---|
   | R:119、R:125 | `hasUnsavedEdit?.()` | LATEBACK 两轮补存与最后的 keep 都跳过，扣留期间打的字随离开带走 |
   | R:125、R:215 | `keepOpenEdit?.()` | 不可扣离开什么都不记 |
   | R:156 | `runtime?.withdrawKeptEdit?.()` | 收回空转（r3 实况）；runtime 为空也空转（TD-64） |
   | R:224 | `whenLeaveSettled?.() ?? Promise.resolve()` | LEFT_UNSAVED 永不出 |

   r3d 四个都在，这几处目前不吞。
5. **N6**：
   - (a) 传递链逐跳 ✓：C:406-407 计算 → C:415 传参 → HSC:156 类型 → HSC:174 经 `latest.current` 读（`useCallback([])`，不靠 deps）。反例见 P1；结构差异见 P7。
   - (b) 新鲜挂载 ✓：A:722 的 `setBlocks` 与 A:723-755 的草稿恢复同在 `fetchNote` 的一段同步代码里，React 18 自动批处理；HSC 读的回执列表是 A:638 每次渲染直接从存储读，不靠那批状态。同挂载往返见 P6。
   - (c) 比较精确 ✓：长度 + 逐单元 `id\0text`，过滤 deleted；没有流的一侧算等待。HSC:583 的位置在「已在笔记里」（HSC:570-576）之后。kept 文字已在 live 时走 `finish`，**不写保存**，所以不会顶掉等待中的回执，① 形不因此漏扣 ✓。
   - (d) N6b ✓：在 B 的路由上、A 的块还显示时，`applyBlockEditRecovery`（A:2275）要求 `noteRef` 与路由同篇；fetch 前 `noteRef` 仍是 A，直接返回 false，所以 Apply 不会先于新 fetch 落地。块 id 是全局 id，新篇不复用。
   - (e) flush 无提前返回，**未找到**反例：
     - `saveHeaderMetadata` → `saveHeaderField`（A:816 起）用 `writeRegistry.hold` 包住、串行于 `headerSaveTailsRef`，早返回只在「值没变 / 不允许写」时，没有计时器。
     - `whenDraftIdle` = `persistPromiseRef.current || Promise.resolve()`（`useDraftBlockController.ts:671`），只等已有的那一次持久化；之后的写由 `whenIdle` 兜。
     - `whenIdle` = `writeRegistry.whenIdle`（`inFlightWriteRegistry.ts:80-83`），`pending` 为 0 才放行；`observe` 在调用时立刻计数（:36-40），在途 PUT 一定被等；有旧失败时拒绝，结果是 REFUSED，不是放行。
     - HSC 看门狗（HSC:720-731）只 `retainWords`，不碰在途保存 ✓。
     - flush 结束到 `blocker.proceed` 之间只有微任务，HSC 的重试计时器插不进来 ✓。
6. **`released` / `leftUnsaved`** ✓：
   - `keepAndLeave` 的四个入口 R:252、R:262、R:268、R:282，都要求 `!released`：R:252 由 R:242 守，其余三处由 `leaving()` 的 R:207 守。
   - `released = false` 只有 R:155 一处，同时在 R:154 清 `leftUnsaved`。
   - N2 / N3 的改动没有加入口；R:239 的提前返回在 R:242 之前。
   - P3 会让 `released` 卡在真，但这不破坏这条不变量本身。
7. **五答**：行号与结论全部核实 ✓。
   - A:1936 / :2016 / :2112 / :2290；A:1939 / :2189-2190。
   - A:2216-2218（409 标冲突）；忘回执在 :2202 / :2148 / :2151。其中 :2148 是 r3d 适配器新增的那一行，对路由已换后的 2xx。
   - Replay 在 A:2342-2366，以 `block.text_save_revision` 为基准（:2358）。
   - server `atomicTextSave.ts:36-37`；`noteBlockContent.ts:103 / :107 / :111`。

   **builder 未核的一跳**（409 后 history 会不会自动重试），我跟了：
   - **不自动重试**。history 里唯一的计时器是空闲保存（H:718），而空闲保存在 `failures.size` 非零时直接返回（H:728）。失败组只在人手动重试、下一次回车或失焦带 recovery 时再发。
   - 失败组重发时 `baseFor` 读 `issuedBases` 里缓存的旧基准（H:232-236，失败时不删），所以只会再 409 ✓。
   - 另一个后果：失败对账 `reconcileIssuedSave('read_after_error')` 在 A:2069 把读回块的 revision 改写成发出时的旧基准，并在 `operationIsLatest()` 时于 A:2078-2080 写回状态。之后新组的基准是 `max(block 旧值, committedBases)`。若较新的 revision 不是经 history 提交得来（例如来自 Apply 或另一条适配器路径），该块之后的 history 保存会一直 409，直到重新加载。每次尝试都弹一条「Failed to save block」（A:2228）。
   - 结果是「卡住 + 重复提示」，不会静默覆盖。HEADCLOSE-putback 里放回那次是 history 提交，`committedBases` 已到 R+1，不卡。
8. **范围** ✓：
   - 17 个文件 = `files.list`。
   - 适配器对 `04f6f822` 恰 3 行（A:2146-2148，两行注释 + 一行代码）。
   - server / shared / 包外 client 零 diff。
   - HSC diff 只有：import 加 `getTextFlowContent`、`RecoveryReceiptText` 类型、`unitTexts`、`recoveryReceipts` prop、`openedTexts` / `openedFor` / `recoveryWaiting`、HSC:580-583 的扣。全属 N6 / N6a / N6b，没有别的改动。
   - 对 r3 包：8 个文件逐字节相同；变的是 H（17 行，N1）、R（39 行，N2 / N3）、C（10 行，N6 接线）、NCR（10 行，N5）以及测试。
9. **闸判据**：N4 形仍判 ✓；真实重复被遮的情形未找到；mask 偏宽见 P8。

## 建议给 Tester 的臂（只建议，不派）

- HEADCLOSE-Apply-slow（P1）。
- MERGE-reenter（P2）。
- ADDR-noncanon 再加 `#/Notes/<id>` 一形（P3）。
