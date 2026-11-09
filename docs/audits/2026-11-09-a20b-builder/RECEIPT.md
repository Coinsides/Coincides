# A-20b 回执(builder,2026-11-09)

> 包:`<home>/.claude/ops/packages/a20b-belt-coverage`(已封,封后不动)。底 = A-20 r3e 包(未动,未混 A-25)。行号对包内 `src/` 快照。路径前缀 `client/src/pages/Notes/canvasEngine/hooks/` 省略;H = `useTextFlowHistory.ts`。

## 封包数

| 项 | 值 |
|---|---|
| 主 JS | `index-DX5raR6f.js`,sha256 `88018123b61aac355a4a209db82accbba987bee0d743a9a0e79f61eff66fd3cf` |
| `src.sha256` 自身 | `a1609ba60f35055a44649d5a53d2ae8a9076c9b47d8e5aaf63dbcffd7fa7d4d4`(18 行) |
| `dist.sha256` 自身 | `1fbf2e187d38d57d91c50619ce7f26d3188b23dc9267da6006ce3dcd37f7048f`(63 行) |
| 文件数 | src 18 = r3e 17 + `useNoteCanvasRuntimeController.test.tsx`。对 r3e 包变 5:2 源(H、`useNoteRouteSaveBoundary.tsx`)+ 3 测试;其余 13 字节同 r3e。dist 63 |
| 基线 / 共享树 | `04f6f822`;共享树 HEAD `37caae32`,其间无提交触及 client/src、server/src、shared;工作副本与共享树恰差这 18 个文件 |
| 服务端 / 契约 / 依赖 | 不动 |

## 验证

- `tsc --noEmit`:第一次跑 exit 2,只有一处:Q5(a) 新测试里记录 HSC 输入的类型注解与 `RecoveryReceiptText` 不相容(弱类型检查)。只改测试注解(`useNoteCanvasRuntimeController.test.tsx:51`;`:568`、`:575` 读 `recoveryKey` 时加断言),运行时不变。复跑 tsc 0;该测试文件 19/19。(`tsc-a20b.txt`)
- client 全量:259 文件、2793/2793 过,exit 0。本次未出现 teardown 竞态。全量在类型修正之前跑,修正只在类型层。(`client-full-a20b.txt`)
- vite build:0。dist 也在类型修正之前构建;测试文件不进 dist,产物不变。
- kit 16 段(s11*)全 0 红。`s11c.base` 4 红为已知基线(BASE 无 IME 行)。(`kit/`)
- 阳性对照(`positive-controls-a20b.txt`),都在 r3e 码上跑:
  - Q2、Q3 红。
  - Q4 红。
  - Q5(b) 表恰 4 行红,即无前导斜杠的四形 `#notes/note-a`、`#notes/note-a/`、`#login`、`#register`;其余 21 行绿。
  - Q5(a) 测的是 r3e 已有行为,所以用变异作红:让 controller 传被提供列表,第一例红。
  - 还原后 cmp 核过;在 A-20b 码上全绿。

## 代码回答

### ① `commonPrefix` 在三形各取什么

- helper `H:58–62`,逐字比到第一处不同。用在 `H:814`:`if (split && was !== undefined && !cutText.has(key)) cutText.set(key, commonPrefix(was, unit.text))`。
  - 只对**分裂组里组前已有的单元**生效。`was` 是该组 `before` 里同 id 活单元的文字(`H:804`、`H:807`)。
  - `was === unit.text` 的单元已在 `H:808` 跳过。
- **回车**(行中 `abcdef` → `abc` + 新单元 `def`):`commonPrefix('abcdef','abc') = 'abc'`,与 r3e 的 `unit.text` 相同。
  - 行首回车(`abc` → `''`)得 `''`。行尾回车时本单元不变,不进此行。
  - 一般地,组后文是组前文前缀时结果就是组后文,所以**一切回车与 r3e 逐字相同**。
- **多行粘贴**(`abc|def` 粘 `X⏎Y` → `abcX` / `Y` / `def`):`commonPrefix('abcdef','abcX') = 'abc'`。
  - 离开时 `initialText = cutText`(`H:838`),得 edit 记录 `abc → abcX`。
  - r3e 记的是 `abcX → abcX`,起点等于终点,在 `H:840` 不留记录。
  - `Y`、`def` 是新建单元,走 P2(`H:819`)进 `joined` → 框里 split 记录。
- **选区替换**(`abcdef` 选 `cdef` 粘 `X⏎…` → 本单元 `abX`):`commonPrefix('abcdef','abX') = 'ab'` → edit 记录 `ab → abX`。落到服务器时由 `mergeTypedText` 插入 `X`。
- 多组:`!cutText.has(key)` 只取**第一个**分裂组的切点;后续打字组只在 `ends` 里更新终点,起点仍是那个切点。
- 副作用(order 已接受):`abc → abcX` 落到服务器 `abcdef` 得 `abcXdef`,同时 `def` 在框里作 split 记录。这与今天「回车后在前半末尾打字」同形(TD-66 族),手册「框里多一条后半」已覆盖,不丢字。

### ② Q3 新支与 plainTyping / isSplit / removesUnits:互斥与完备

- 入账链 `H:707–711` 是 if / else-if 链,先后为:
  1. `plainTyping`(`H:206`)→ `unsent`
  2. `isSplit || removesUnits`(`H:187`、`H:193`)→ `unsentSplits`
  3. `sameUnitsTextChanged`(`H:200`)→ `unsent`
- **互斥由链本身保证**:每个组最多进一张账。谓词重叠时由先后裁决:
  - 打字组若文字有变,`sameUnitsTextChanged` 也为真,但先命中 `plainTyping`,与 r3e 同账。
  - 既改单元集合又改某单元文字的组(多行粘贴),先命中 split / removes,与 r3e 同账。
  - 所以新支只接住前两支**都不要**的组,不从别的账里抢组。
- **新支接住的组**:单元 id 序列与组前一字不差,至少一个单元文字变了,但不是打字 kind。例如单行列表形 / `# ` 粘贴、插链接、接受 agent 补丁。离开时它在 `ends` 里按普通 edit 记录走,起点 = 服务器文(`H:838`),与打字同路。
- **完备性**:不进任何账的只有以下两类,都是有意的:
  - (a) id 序列相同、文字全同:只改角色或状态,或者无变化。没有字可丢。只改角色的组不留记录,按 order 记 TD,不在本单做。
  - (b) id 集合相同但顺序不同:纯重排。若重排同时改了文字,`sameUnitsTextChanged` 按序列比对为假,这种组也不进账。今天的 textFlow 编辑没有产生单元重排的路径(行移动走块级),列为残余,不修。
- `deleted` 单元:新支比对时含其文字,但 `ends` 循环在 `H:806` 跳过 `deleted`,不产生记录。

### ③ Q4 与 Q5

- **Q4**:`useNoteRouteSaveBoundary.tsx:25`。逐段解码后,无前导 `/` 就补一个,再去尾斜杠。`#notes/<id>` 读作 `/notes/<id>`,`#login` 读作 `/login`,与路由同读。`isSignInPath` 导出(`:34`)给测试表用,行为不变。
- **Q5(b)**:`useNoteRouteSaveBoundary.leave.test.tsx:493` 起,25 行表。
  - 每个地址同时经 `createHashRouter`(与 App.tsx 同路由形:`/login`、`/register`、`/` 下 `notes/:noteId`、`*`)与谓词取值。
  - 不变量只写一次:两者读得不同就红。
- **Q5(a)**:`useNoteCanvasRuntimeController.test.tsx` 末尾 describe,穿真 controller。HSC 由 `vi.mock` 包真 hook,只记录输入。两例:
  - 等待列表整张传入,含 Apply 仍在结算的条目。
  - 无该列表时退用被提供列表,即生产 `useNoteCanvasRuntimeController.ts:417–419` 的 `??` 回退。

### ④ TD-68 附:「Proxy 吞缺键」

- 原 controller 测试 mock 的 data controller 是 Proxy,读缺失键时返回 `noop`(test `:94`、`:123`),不是 `undefined`。
- 所以 `recoveryReceiptsKeptWordsWaitFor ?? blockEditRecoveryReceipts` 的左边永远是函数,`Array.isArray` 为假,HSC 收到 `undefined`。回退支从未被测试走到。
- 现在 mock 在有值时显式展开这两张列表,回退支由第二例走到。
- 生产里适配器总会提供等待列表,`??` 只是防御支。
- 与 `?.()` 同族:mock 的宽容也会藏空转。请 Main_Designer 记入 TD-68 附录。

## 未做 / 交接

- **手册**:包内 `MANUAL-SECTION.md` = r3e 原样。order 定收割时由 Main_Designer 删「已知」里 Q2 / Q3 两句,builder 未动。
- **新臂(Tester)**:MULTIPASTE-close、LISTPASTE-close、`#notes/<id>` 两形;LINK-close 便宜才加。
- **下一步**:封后回 A-25(rebase 到 A-20b)。

## r2

> 包:`<home>/.claude/ops/packages/a20b-belt-coverage-r2`(已封,封后不动)。r1 包未动。行号对 r2 包内 `src/` 快照。HSC = `useHeadingStructureController.ts`;R = `useNoteRouteSaveBoundary.tsx`。证据在本目录 `r2/`。

### 封包数

| 项 | 值 |
|---|---|
| 主 JS | `index-Db4qSSYo.js`,sha256 `2f09b0beda4f80a0e28f1106c0de286601c834fbdca300e5073d9c340b4568ca` |
| `src.sha256` 自身 | `8af0a065a02240a2b2bb5e337869ba55fe7c67036d44ade28e772003fa336ddc`(19 行) |
| `dist.sha256` 自身 | `271e598720cfc614309c8daae624ffa6bacb96504ffef5d64ca3642a5a528172`(63 行) |
| 文件数 | src 19 = r1 18 + `useHeadingStructureController.test.tsx`;dist 63 |
| 共享树 | HEAD `3b9e1bc9`;r3e 已在 `29b1d456` 收割,之后无提交触及 client/src、server/src、shared。19 个文件里 17 个与 r3e 包字节同;2 个测试不在 r3e 里,停在 `04f6f822` |
| 服务端 / 契约 / 依赖 | 不动 |

### r1 → r2 文件级 diff(3 源 + 3 测试;其余 12 个与 r1 字节同)

| 文件 | +/- | 内容 |
|---|---|---|
| H(源) | +9 −4 | R3:`commonPrefix` 不停在高代理项上(:56–64);O2:helper 移到 `IDLE_SAVE_MS` 的 JSDoc 之上;R1:Q3 注释改写(list-form / `# ` 单行粘贴 + 非标题单元行末 Shift+Enter) |
| R(源) | +2 −0 | R4:注释说明 `'.'` 开头路径两边读出的串不同,但都算离开(:25) |
| HSC(源) | +13 −7 | 乙:入向 Entry `source`(:119)、openEntry(:332–334)、重开传 `words.source`(:686);回写 `storedWords`(:271–274)、`landed`(:631–632);Enter 循环只对 window / 无 source 切(:599–602) |
| `useTextFlowHistory.test.tsx` | +20 −0 | R3 用例(:1116) |
| `useNoteRouteSaveBoundary.leave.test.tsx` | +3 −2 | R4:表加 `''` 行(:497) |
| `useNoteCanvasRuntimeController.test.tsx` | +66 −3 | R2:真 text history 下本次访问自留的回执不交给 kept words(:590);测试装置(:53、:210)见下「范围注记」 |
| `useHeadingStructureController.test.tsx`(新入包) | +95 −0(对 `04f6f822`) | 乙六例(:1466 describe)+ `startCleanScreenOnly` helper |

### 验证(`r2/`)

- `tsc --noEmit`:0(`tsc-r2.txt`)。
- targeted 4 文件:194/194(`targeted-r2.txt`)。
- client 全量:259 文件、2802/2802 过,exit 0。本次未出现 teardown 竞态(`client-full-r2.txt`)。
- vite build:0。
- kit 16 段(s12*)全 0 红。`s12c.base` 4 红为已知基线(BASE 无 IME 行)(`kit/`)。
- 阳性对照(`positive-controls-r2.txt`;每次换码后 cmp 还原核过,见 `exits.txt`):
  - **乙 on r1 HSC**:edit `'abc⏎'`、edit `'abc⏎d'`、扣住→刷新→再落地,三例红;window / 无 source / split 无 `\n` 三例绿。
  - **乙 只入向四行、无回写**:只有「扣住→刷新→再落地」一例红。回写半边由它单独钉住。
  - **R3 on r1 helper**:红。
  - **R2**:去掉 C:419 的 `isVisitReceipt` 过滤,红。
- 前一条 r2 链(乙之前的码)全量 2796/2796、exit 1。原因是已知 teardown 竞态(`structureTypingBuffer.ts:316`,`document is not defined`,来自 HSC 测试文件)。那条链因乙作废,kit 中途停,孤儿进程按 PID 清。

### 代码回答(r2)

#### ⑤ SHIFTENTER-close:哪一步把 `\n` 变成单元边界(r1 事实)

- 落地写者是 HSC `placeTyped`(:512)。`mergeTypedText`(:587)不切;紧接着 :599–611 的循环对单元文本里每个 `\n` 调 `splitTextUnitForEnter`(`textUnitEditorService.ts:151`)。这个循环原为窗口 Enter 而写。
- 正常打字:`TextBlockProjection.tsx:1340`(不在包内,行号对共享树 `3b9e1bc9`;`textUnitEditorService.ts` 同)对非标题单元的 Shift+Enter 不拦截;原生 insertLineBreak 把 `\n` 留在单元文本里,经 typing 组 → `history.applyEdit` → saveBlock 原样写出,不过任何按行切的 helper。
- 重开时每条存储记录都经 :685 `openEntry` → :691 `landKept` → `placeTyped`;split 记录与 edit 记录共用同一写者。

#### ⑥ 乙之后 `source` 的全部读写点

- 读(决定切不切):只有 :602。
- 写入 entry:
  - :686(重开传 `words.source`)。
  - :357 的结构窗口不传,即 `undefined`,按窗口语义切。
  - `openEntry` 只有 :357、:685 这两个调用点。
- 回写存储,四处:
  1. :286 `retainWords` 的 `remember()`(重开时立即调一次,之后随框内 input 再调)经 `storedWords` 带 source(:274)。
  2. :318 pagehide 同样经 `storedWords`。
  3. :631–632 `landed`(落地后、flush 确认前)带 source。
  4. :400 `{ ...words, blockId }`(结构把单元移到新块)展开原记录,本就保留。
- 生产写 source 的地方在 H:839(`'split'`)、:856 / :881(`'edit'`),未改。
- 不变量:`entry.source` 在存储 ↔ entry 之间任何方向往返不变。`undefined` 走旧行为(切)。岛上 r3e 期间重开过、尚未落地的旧记录会按旧样切一次,已接受(Main_Designer 2026-11-09)。

#### ⑦ :599 循环的其他消费者与调用路径:乙都不改

`placeTyped` 的调用路径:
1. :242 landKept 队列。
2. :254 retryTimer 经 landKept。
3. :369 结构 exitQueue。
4. :516 输入法组合结束后。
5. :524、:551、:566 三处轮询。

- 这些路径里,结构窗口的 entry 都来自 :357,没有 source,循环照旧按段落切。
- 重开的记录来自 :685,带存储里的 source。
- `splitTextUnitForEnter` 在 HSC 里只被这个循环调用。
- 编辑器 Enter(`TextBlockProjection.tsx:1342`)和粘贴机(`pasteTextIntoTextFlow`)是别的写者,不经过这里。

### 范围注记

- R2 测试装置:`useBlockTextFlowEditController` 原被 mock 成 noop。在 `historyApi` 设置时改用真 controller(:210),并给 `textHistoryGeneration: 1`;否则 generation 来自 Proxy noop,保存永远不会发出。只在测试里改。
- 乙 的回写半边(`storedWords`、`landed`)超出最初裁定的「四行」。这是与 Reviewer 封前预警同时发现的,并由 Main_Designer 补裁为不变量。

### 残余

- **重开框里对 edit / split 记录再按 Enter 不分段**:框里的 Enter 打出 `\n`,而 entry.source 仍是 edit / split,落地时原样留在单元内。Main_Designer 记 TD。
- **teardown 竞态**(`structureTypingBuffer.ts:316`):本次全量未出现;前一条链出现过,与 r3d、r3e 同一条。Main_Designer 已裁不修。TD 候编号。
- 旧格式记录(无 source)含软换行时按旧样切一次,已接受。
