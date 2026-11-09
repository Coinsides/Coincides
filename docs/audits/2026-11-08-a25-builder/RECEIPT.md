# A-25 回执(builder,2026-11-09)

> 包:`<home>/.claude/ops/packages/a25-ime-save-failure`(已封,封后不动)。底 = A-20b r2 包(共享树 `dfbcce8e`)。行号对包内 `src/` 快照。路径前缀 `client/src/pages/Notes/canvasEngine/` 省略。简称:H = `hooks/useTextFlowHistory.ts`,HSC = `hooks/useHeadingStructureController.ts`,A = `hooks/useNoteCanvasDataAdapter.ts`,D = `hooks/useDraftBlockController.ts`,R = `hooks/useRuntimeNaturalWritingController.ts`。证据在 `evidence/`(本地路径已换占位符;`pre-harvest-scan` ⛔ 0)。

## 封包数

| 项 | 值 |
|---|---|
| 主 JS | `index-4nEsyJNA.js`,sha256 `f32a046c60b61e71f53844f93724af6bee0a6f152714b16c0a1e4bb4ae72c5ab`(M1 原地重封;重封前 `index-BngbSlvd.js` `92497a0c…241a4e`) |
| `src.sha256` 自身 | `08d0cb0d5c4c52a6d28a6416295c092398f1947631d36c8374990c3d542e4306`(19 行;重封前 `0afec3d1…`,只有 `layers/BlockSaveFailedMark.tsx` 一行变了) |
| `dist.sha256` 自身 | `a4b0e9a6602d7e000c3e14358836bbcdd370d7f43038f39d69c98be828dc4eaf`(63 行;重封前 `ba28414b…`) |
| M1(Reviewer 终核 🅰,Main_Designer 解冻一行) | `layers/BlockSaveFailedMark.tsx:24` 文案由「Not saved yet · trying again」改为「Not saved yet」。F3 之后,被拒停(401 / 403 / 409)的块不会自动重试,原文案是假话。头注释同步改。没有测试断言这句;Tester kit 认按钮,不认这句。tsc 0;`layers` 32 文件 344/344;build 0。按令不重跑 k25c 与全量。H 未动。files.list 不变。`MANUAL-SECTION.md` 与 `COPY-BACK.md` 同步改(不在 src 哈希内)。(`evidence/m1-exits.txt`) |
| 文件数 | src 19 = 改 18 + 新 1(`layers/BlockSaveFailedMark.tsx`);dist 63 |
| 基线 / 共享树 | 共享树 HEAD `bec9115f`(`dfbcce8e` 之后只有 docs 提交);工作副本与共享树恰差这 19 个文件;`client/src` 以外无差 |
| 服务端 / 契约 / 依赖 | 不动 |
| Reviewer 快照 | 封前读过 r2 快照、r3 delta(F1–F4、O1、O2)及其后四次原地更新(R1、O4、②b 浏览器形、收窄):包内这 6 个文件与最后一次快照(`src.sha256` 自身 `2457c771…`)逐字节相同 |

## 验证(最后一条链,代码冻结后)

- `tsc --noEmit`:0。
- targeted 8 文件(H、HSC、R、D、`layers/DraftBlockEditorLayer`、runtime controller、`structureTypingConservation`、A):370/370,exit 0。(`r3-targeted-*.txt`)
- client 全量:259 文件、2853/2853 过;**exit 1**,来自已知 teardown 竞态:3 条 `ReferenceError: document is not defined`,位于 `structureTypingBuffer.ts:316`,在测试环境拆除后由一个计时器触发;这次的触发文件是 `structureTypingConservation.test.tsx`(A-25 未改),以前是 HSC 测试。Main_Designer 先前裁「不修」,未编号。(`r3-full-*.txt`)
- vite build:0,产物即 `dist/`,在最后一次源码改动之后构建。
- k25c(Tester 正本 `a25_probe.mjs` sha `5fba09fd…`,`ONLY=IME,SAVEFAIL,LANDFAIL,ONEFAIL,CHAIN,H1,H2`,REPS 2,REPS_IME 24,REPS_OTHER 1;本地后端,1 浏览器):**全部门绿**。(`k25c.analysis.txt`)
  - IME-new 24/24(k25a 4/24,底上 0/4);IME-mid 24/24。
  - SAVEFAIL 四变体 2/2,失败 toast 0,追平 2.3–4.6 s。
  - ONEFAIL 500/断网 2/2:B 约 2.5 s 空闲保存落地,A 约 6.8 s 自补(期间新打的字在),各恰一份,toast 0。
  - LANDFAIL auto / apply × 500 / 断网 2/2:本块指示亮、toast 0、别块能打;被拒的键不进任何账(server 0、框无、store 无);auto 约 13.6 s、apply 约 4.2 s 补齐。
  - LANDFAIL-other plain / heading / headline 1/1,toast 0。
  - CHAIN 五式 2/2;H1 2/2;H2 2/2(冒烟)。
  - 观察(不判):正本分析器把 24 行都归为 `handoff-cuts-composition-2`,依据是第二个组合进行中(约 850–1560 ms)出现 `editor-in`(约 870 ms)。同一行里草稿离开文档在约 1700 ms,在组合结束之后;编辑器首个 input 为 null;服务器 24/24 是「第一测试」。读法:块建成后编辑器的 textarea 已挂上,但焦点和组合留在草稿框里,直到组合结束才交接。分类口径由 Tester 定。
    - **Tester 已定(2026-11-09)**:分析器口径改为「交接 = 焦点移到编辑器(没有焦点事件时退用 draft-left);editor-in 单列」。正本 analyze-a25.mjs 新 sha `3d034c97…`,探针文件未动。用新版重析 k25c,24/24 归为 `handoff-outside-composition`:POST 约 591–596 ms,紧接组合 1 结束(约 588–592 ms);焦点约 1670–1692 ms 才移过去,组合 2 约 1528–1541 ms 已结束。底上 4 行仍是 `handoff-cuts-composition-1, POST-in-composition-1`。`evidence/k25c.analysis.txt` 是旧口径的原样输出。
- 留档:k25a(r1 码,停封的那遍)、k25b(r2 包、builder 副本):IME-new 24/24、SAVEFAIL 全过、LANDFAIL (a)(e) 红 ——引出下面「②b 浏览器形」一节。

## 阳性对照(都在本轮之前的码上跑,swap 后 cmp 还原核过)

| 项 | 对照码 | 结果 |
|---|---|---|
| r2-1 按块闸 | r2 前 H | 新 4 例:3 红,1 护栏绿(`control-r2.txt`) |
| r2-2 ②b 乙(flush 形) | r2 前 HSC | 本块那例红;别块护栏绿 |
| r2-3 IME | r2 前 D + R | 2 例全红 |
| r2-4 双发护栏 | r2 前 H | 绿(护栏,修前修后都绿) |
| F1 / F2 / F3 / F4 | r2 H / HSC | 5 例全红,原因对(`control-r3.txt`) |
| R1 | R1 前 H | 红:X 不再被自动重试(`control-r1.txt`) |
| O4 | O4 前 H | 红:失败已消失,指示仍亮(`control-o4.txt`) |
| ②b 浏览器形 | 改前 HSC | 本块那例红;两条护栏绿(`control-b2.txt`) |
| 收窄 | 收窄前 H | template 护栏红(`control-narrow.txt`) |
| D1–D3 | pre-D123 A | D1、D2(链接前)、D3(字段变)红;D2(链接后)、D3(字段同)绿(`control-d123.txt`) |
| S2 / O4 测试债 | 变异 | S2 红、O4 红、R3 仍绿(`control-debt.txt`) |

## 代码回答

### 1 · 按块闸(Main_Designer 裁 (i))

- 不变量:块 X 的空闲保存只在 X 自己有未决失败时停;别块照发;失败由同一退避带走;每个有未发字的失败块亮自己的指示。
- H :174–178 `idleFailedBlocks`、`failedSaveOf`、`savePausedFor`、`anyFailedSave`。
- 三处闸:
  - persist :381 `idle && failedSaveOf(transaction.blockId)`;
  - idleSave :868 `savePausedFor(open.blockId)`;
  - 在道复核 :877 `savePausedFor(latestOpen.blockId)`。
- 空闲保存失败 :478:进 `idleFailedBlocks` 并调 `typingSaveFailed`,于是亮指示、进退避。它仍不进 `failures`:打开组是克隆,不能把旧快照排在封口组前面重放。
- 退避也问空闲失败的块:`retryFailedBlock` :307 起,在 :315 用当时屏上的打开组再发一次空闲保存。
- 指示 :1410 `failedTypingBlockIds` = failures ∪ idleFailedBlocks。
- **r2 前的事实(手册已知第 5 条的机理)**:
  - 空闲保存失败从不进 `failures`。它只置**整篇**旗 `idleSaveFailed`(r2 前 H :167,在 :425 置真;只有一次成功的封口保存才在 :423 清掉)。
  - 这个旗在 :811 / :823 停掉**每一块**的空闲保存,而且从不被自动重试。
  - 结果:A 一失败,B 打完不失焦,B 的字就一直不发(k25a SAVEFAIL 的 (c)(d) 红,B 的 PUT 为 0)。

### 2 · ②b 乙

- 不变量(定稿):**静音 ⇔ 操作体未开始 ∧ 本结构触及的块在亮指示的失败账里(typing ∪ idle)**;拒键 = 不上屏、不入任何账,与修前同;其余情形照弹。
- HSC :410 `let bodyStarted`,:420 批次操作体第一行置真(F1)。
- HSC :501 判定:`!bodyStarted && textHistory.holdsFailedSave(touchedBlockIds())` 时不调 onFailure。
- H :1415 `holdsFailedSave`:读当时的 `idleFailedBlocks` 与 `failures`,和 :1410 同两本账。template / document 失败不亮块级指示,所以不算(收窄,Main_Designer 裁)。
- 另两处 onFailure:
  - :388 watchdog(超时,与这次拒绝无关);
  - :487 `!succeeded`(`runBatch` 在操作体前只会 return false;这次拒绝走不到这里)。
- **②b 浏览器形**:
  - 诊断构建只跑一个 LANDFAIL-auto-500 样本,三处 onFailure 前都记站点;用完还原,cmp 核过。7 个被拒的键全在 catch,`bodyStarted` = false,error 是 `AxiosError`「Request failed with status code 500」。(`diag3-sites.jsonl`)
  - 来源:HSC :415 `await api.whenWritesIdle?.()`,即适配器写入登记的 `whenIdle`(共享树 `inFlightWriteRegistry.ts` :80;:13 把失败那次写入的原错误抛回)。它**先于** `runStructureBatch` 的 flush 抛出。
  - r2 的判定看 `FailedSaveHoldError` 类型,单测走的是 flush 那一跳,所以**单测绿、浏览器红**。改为看账以后,两跳都对。
  - 补测按浏览器那一跳(HSC 测试 :1887 起):`whenWritesIdle` 以 AxiosError 形 reject。本块持失败 → 不弹;别块持失败 → 弹 1;无人持失败 → 弹 1;本块 template 失败(不亮指示)→ 弹 1。
- `FailedSaveHoldError`(H :76)仍由 flush 抛出(:1384),消息不变;已没有代码看它的类型。

### 3 · IME

- 不变量:服务器永不收到组合中的文本;交接只在非组合时刻;compositionend 后草稿与服务器有差,先追一次再交接。
- D :205–222:组合标志 + 等待者。`setDraftComposing`(:211);卸载时(:222)和 `clearLocalDraft` 时(:302)放行等待者。
- D :585–593:建块后的追赶循环。组合中在 :589 等组合结束,然后 `continue`;非组合且已追平才跳出。交接在 :613 之后,中间只隔一个微任务,输入事件插不进来。
- R :449 每次草稿变化都报组合状态;:451 组合中不建块(①(a),r1 已有)。
- **O2**:草稿框 `layers/DraftBlockEditorLayer.tsx`:
  - :86 compositionstart 置组合标志;
  - :87–91 compositionend **每次**都以无 input 参数(即 composing false)调 `onChange`(:90),值变没变都调;Chrome 对提交、Esc 取消、blur 都会发 compositionend;
  - :93–95 普通 change 只在组合中才带 `{ composing }`。
  - 所以每条结束路径都会走到 R :449 `setDraftComposing(false)`。唯一的例外是框在组合中被卸载、没有 compositionend:那时由 D :222 放行;那一轮的保存再被 history 的 boundary 拒掉(O1 注释已改成与码一致)。

### 4 · 双发(串行写道,不变量已成立)

- k25a 里 +1.16 / +1.30 s 的两发,是同一次失焦先后排的两次操作:
  - 第 ① 发:失焦先封口(`boundary()`),封口把打开组交给写道。
  - 第 ② 发:saveBlock 自己再排一次操作,找到刚失败的那组,调 `retryFailedBlock`。
- 两发都在同一条写道里(`usePlacementHistory.ts` :76,`operationTail.then` 严格串行),后一发要等前一发的 outcome 回来才开始。
- 第 ① 发若 200,失败组被删,第 ② 发直接 return,不发。axios 实例没设 timeout。
- **不变量「同一块任一时刻最多一发保存在途」由串行写道成立**。护栏测试钉住(H 测试 :1407 起):第一发挂住不放,同时触发失焦、定时器、online、Retry,断言在途恒为 1。修前修后都绿。

### 5 · Reviewer F1–F4、R1、O4

- F1:同 2,`bodyStarted`。结构自身保存失败 → onFailure 恰 1 次。
- F2:H :458 取 `blockWasFailing`;:474 若本块已不再暂停,且打开组仍在本块、又与已发的不同 → `scheduleIdleSave()`。由此:任一次保存结束后,凡有未发字的块,要么有定时器在排,要么在退避,要么亮指示。
- F3:H :255 `refusedBlocks` 按块,取代整篇的 `saveRetryRefused`;4xx 只拒本块(`typingSaveFailed` :329);定时器跳过被拒的块,Retry 与 online 问全部(:289 `includeRefused`)。
- F4:H :265 `noteBusyForSave()` = 空闲保存的同一组改期条件 + 组合中;:292 忙就 `deferSaveRetry`(:284),隔 2 s 再看,不推进退避节奏。
- R1 / O4:H :257 `settleRefusal`、:260 `failureGone`(解除拒停 + 重绘指示)。在失败不经保存而消失的三处调用:块已不在、打开组不在本块(:314)、被拒的提议补丁。不变量:拒停按块,与失败同生灭;失败消失,指示即熄。

### 6 · ②a (iv) D(Apply 遇 409 合并)

- **四个出口**(A `applyBlockEditRecovery`):
  1. :2410 Apply 成功 → true;
  2. :2412 不是 409(`status` rejected + 有回执 + `isStaleRevisionError`)→ false,即今天的行为;
  3. 读当前块失败或已离开::2425 / :2427 / :2430 → false;D3 字段不等(:2435–2437)→ false;合并为 null(:2440–2441)→ false;以上都留作冲突项;
  4. 有可写 → :2455 以当前 revision 再 `saveBlock` 一次,:2470–2474 返回其结果;再 409 即停,留作冲突项。
- **`mergeRecoveryOntoCurrent` 的五个 null 来源**(A :442):
  1. :447 缺输入;
  2. :450 回执单元与打开时单元的 id 或数量不符(结构变了);
  3. :454 现块里没有该单元;
  4. :460 `mergeTypedText` 锚不到;
  5. :463 D1:合并后等于现文(只删字的回执),不当作已合并。
- 不算 null 的两种跳过::456 该单元打开后没变;:458 服务器那一单元已精确等于回执(已同)。
- **「已同」先于写判定**::2443–2446 每个单元都等于现文 → 忘掉条目、不写、返回 true;只有不全同才往下写。
- **fieldValues 的实际形状**:
  - 来自 `options.fieldValues || blockFieldDrafts[block.id]`(A :2064);
  - 文本块打字产生的回执里是 **undefined**;
  - formula 块是 `{ latex_input, formula_name, explanation }`。
- **D3 的两种空(单列一行)**:
  - 比较用 `receipt.fieldValues ?? {}` 对 `readFieldValues(current)`(:2435–2436),所以文本块的 undefined 与现块的 `{}` 判为相等;
  - 写出时用 `receipt.fieldValues === undefined ? undefined : currentFields`(:2461),**undefined 写出去仍是 undefined,不变成 `{}`**;
  - 理由在 A :843:恢复时 `draftSnapshot.fieldDrafts[blockId] || receipt.fieldValues` 会把 `{}` 当成一份恢复出来的字段草稿。
- D2:每个单元用 `replaceTextUnitText` 带插入 edit(:473),所以 `inline_structures` 跟着字一起移。

## A-20b r2 测试债(Reviewer S2 / O4)

- S2(HSC 测试 :1548):落地了、但保存一直没回的 edit 记录,页面离开后重开,仍是一行。变异「落地记录(landed)去掉 source」时红。
- O4(H 测试 :1193):`'a😀|b'` 选中 b 后粘贴 `c⏎Y`,记录从 `'a😀'` 起,emoji 不被拆开。变异「回退范围 0xdbff → 0xdfff」时红;R3 在该变异下仍绿。

## 残留(不在本包)

- **TD-73 附**:S1,edit 记录落进标题单元。已备修法:HSC 换行循环条件加 `&& !headingLevelForRole(unit.writing_role)`。
- **teardown 竞态**:`structureTypingBuffer.ts:316`,见「验证」,候编号。
- **Reviewer 残余 🅱**:封口复用空闲回执那一支(`lastIdleSave` 复用分支)不清本块的空闲标记,要等下一次走到 H :314 才清(清时会重绘)。若这块此前被 409 拒停,指示要亮到 Retry 或 online。触发需「空闲成功 → 空闲 409 → 改回第一次的文字再封口」,很少走到。记一笔,不动包。
- **Reviewer 时序附注(读码推断,未量)**:结构键恰在本块那次保存在途时按下,`whenWritesIdle` 的 reject 可能先于失败记账,于是首键弹一次、之后静音。那一刻指示也还没亮,与「静音 ⇔ 指示亮」一致。
- **IME 分类口径**:见「验证」的观察,交 Tester。
- tokens:不可得。
