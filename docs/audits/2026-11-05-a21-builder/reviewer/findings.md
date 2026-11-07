> **状态 (Status)**: active
> **层 (Layer)**: 审计 / Audit（Reviewer 单内复核报告）
> **日期 (Updated)**: 2026-11-08
> **权威 (Authoritative)**: 否（发现，裁定归 Main_Designer）

# 编辑器组 r2.3 复核：三个改动文件对照裁定

**总判**：角色收窄的主路径做到了；但**角色是在存档时从现场单元现补的**，于是没有角色字段的旧记录在重开时会拿到「眼前那个空单元」的角色并自动落下——裁定第 2 条「旧记录无角色 → keep」**没做到**，这是 ③ 的「落错位置」类（F1，确认），同根还有一条会话内变体（F2）。框侧没有找到 ③；几何上有一条强疑似：全局 CSS 给所有 textarea 加了 150ms 过渡，框的自检在同一任务里读到的是过渡前的位置（F4），builder 对 Tester 红 1 的「content-box」解释在浏览器里不成立（F3）。

- **对象**：ops 包 `editor-rework-r2.3/src/`（`src.sha256` 文件哈希 `214ea160431c…`）。行号都对这份快照。
  - `hooks/useHeadingStructureController.ts` = `a10ac50e9b49…`
  - `structureTypingBuffer.ts` = `b29e2ecf9ae5…`
  - `hooks/useHeadingStructureController.test.tsx` = `d595189e4dac…`
  - `client/src/styles/global.css` 不在 22 个文件里，取基线 `9bc45e69`（与当前 HEAD 同）。
- **方法**：只读；r2.2 → r2.3 逐文件 diff，再读 r2.3 全文。没跑测试，没构建。
- 下文 `C:` = `hooks/useHeadingStructureController.ts`，`B:` = `structureTypingBuffer.ts`，`T:` = `hooks/useHeadingStructureController.test.tsx`。

## 发现

| # | 判 | 建议级 | 位置 | 发现 |
|---|---|---|---|---|
| F1 | **确认** | 🅰（③ 落错位置） | `C:602-604` → `C:218` → `C:206-207` → `C:201-205` → `C:508-509` | **旧记录（没有角色字段）在重开时会自动落下。** 重开时 `C:602` 把 `entry.role` 设成 `undefined`；紧接着 `C:603 retainWords` 里的 `remember()`（`C:218`，有 session 就调）走 `storedWords → roleOf`，`roleOf` 用 `??=` 从**现场** `(blockId, unitId)` 的单元把角色补上，并把它写回存档。`C:604 placeTyped` 再比较时，`entry.role` 就是从同一个单元读出来的，`unit.writing_role === entry.role` 一定成立，「空等于空」放行。结果：旧记录指着的位置上如果正好有一个空单元（Y1 的形状：原块里回车新建、复用了单元号的空段落），字落进去。裁定第 2 条要的是 keep。**测试没盖到**：Y1 原测试（`T:1041-1065`）用的是旧记录，但重开时那个单元还不存在（回车是之后才建的）；`round 2 #3a`（`T:204`）用的是非空单元。缺的那条就是「r2.3 (b) 去掉 `writingRole`」。旧记录的来源：r2.2 及更早版本写进用户浏览器、升级后还留着的存档。 |
| F2 | **确认**（路径）/ 触发要靠打字 | 🅰（同 F1 根因） | `C:221` → `C:218` → `C:201-205`；`C:195` | **会话内变体。** 留住那一刻 `roleOf` 找不到单元时（`entry.focus.blockId` 下已没有这个单元号，例如看门狗在 `extractUnit`（`C:363`）之后、`followUnit`（`C:368`）之前放手，单元已搬走、记录还指旧块），`entry.role` 保持 `undefined`。之后用户在留住的框里每打一个字（`C:221` 监听 `input`），`roleOf` 都会再试一次，直到读到**当时**占着该 `(blockId, unitId)` 的单元——可能就是回车新建、复用了单元号的空段落。角色一补上，下一次重试（`C:195`）就放行，落进那个段落。裁定第 1 条要的是「留住时单元**当时**的角色」。F1、F2 的修法是同一处：角色只在留住 / 重开那一刻定一次（记录里有就用记录的），之后不再从现场补；「没定到」也要当成一个确定的状态（keep）。 |
| F3 | **确认** | 🅱（诊断，非代码缺陷） | `B:9-11`（`COPIED_STYLES` 含 `boxSizing`）、`B:166`；`global.css:6-12`；`T:1214`、`T:1320` | **builder 对 Tester 红 1 的解释（content-box 的 padding 把框撑进栏）在浏览器里不成立。** `global.css` 用 `*` 给所有元素设了 `box-sizing: border-box`，框的 textarea 也在内；`follow` 还会从锚点编辑器抄 computed `boxSizing`，而 client 的 CSS 里没有任何 `content-box`。所以 r2.2 的框在浏览器里本来就是 border-box。测试 (d) 在 r2.2 上以 `600 > 400` 变红，是测试自己的 jsdom 模型按 content-box 算出来的（`T:1214` 的注释写明了这个假设），不是浏览器机理的复现。推论：r2.3 在 `B:234`、`B:261` 改 border-box，在浏览器里没有效果；r2.3 真正修掉红 1 的是锚上框的高度上限（`B:164`、`B:180`）。红 1 里伸进栏的 73px / 2px 的真机理仍待确认（见 F4）。 |
| F4 | **疑似**（强） | 🅱（几何，按 Henry 11-08 新尺不挡放行） | `global.css:277-279`；`B:130-131`；`B:261-276`、`B:298-308`、`B:142-156` | **框会继承全局的 `textarea { transition: all 150ms ease }`**（框只写了 `position / zIndex / margin / border / outline / resize / overflow`，没设 `transition`）。自检都是改完 `left / top / width` 立刻在同一任务里读 `getBoundingClientRect()`；在 Chromium 里，过渡刚开始时读到的是**改之前**的位置。预测会出现三种情况：(i) 从单元上或重开时的默认位置（25% / 50%）去停靠，`dock` 判的是旧矩形 → `outsideColumn` 为假 → 两侧都 break → `fold()`，**无锚的框在浏览器里多半折成提示条，而不是停靠**；(ii) 框从边栏回到单元时（`B:306-308`），自检读到的还是边栏位置 → 放行，框滑回单元，但提示条按旧矩形放在边栏，而且之后只有 `follow()` 报告版面变了才会重放（`B:306`），**提示条可能留在框外**（违反「提示条永不越出框」）；(iii) Tester 在 r2.2 上量到的红 1——伸进栏的量一轮 73px、一轮 2px，命中测试打到 `below` 和标题行左端都是 BOX——正好符合「框一直在单元和停靠位之间来回滑、没停稳」，用不着 content-box 来解释。**速验**（Tester，30 秒）：r2.3 上 `getComputedStyle(document.querySelector('textarea[data-structure-typing-buffer]')).transitionDuration` 是否为 `0.15s`；TWO2 的两条无锚记录最后是停靠还是折叠。若坐实，修法提示：框的内联样式加 `transition: none`。 |
| F5 | **疑似** | 🅱 | `B:298-309` → `B:316` → `B:243-282` | **单元上放不下、但锚点还在的框，每 50ms 都会先回单元再停靠。** `place()` 只要找得到锚点就先切回 `unit`（`B:299-305`），自检撞上了再 `dock()`；停靠后「已停好就别动」（`B:246`）这条够不着，因为每一拍开头 mode 已经被改成 `unit`。现实触发：**两条留字记录锚在同一个单元上**（同一行连着两次 `# ` 结构失败），或者单元的位置本身压着别的编辑器。代价是每拍最多 2×40 次带强制排版的尝试；再加上 F4，框会在单元和边栏之间不停地滑。Tester 可以加一臂：同一单元两条记录。 |
| F6 | **疑似** | 🅱（性能，低） | `B:35-40`、`B:185-195`、`B:201-204`、`B:344` | 每个留字框每 50ms 跑 1–3 次 `noteEditors()`（对每个编辑器做 `querySelectorAll` + `getComputedStyle` + 取矩形），r2.2 是约 1 次。笔记长、留字条数接近 20 时，打字中每拍都会强制排版。活窗口不走这条路（`B:291-297`），不影响正常打字的那个窗口。 |
| F7 | 未找到 | — | 见下 | 裁定列的其余各项逐条核过，没找到问题（下节）。 |

## 逐项核对：未找到问题的部分

**1. 角色收窄**
- 三者同时成立才放行：`C:454-456` 按 `(blockId, unitId)` 找未删除的单元，找不到就在 `C:495` keep；`C:508-509` 只在 `live` 或「角色已定且与单元相同」时传 `emptyMatches`；`mergeTypedText` 只在 `live === initial` 且 `initial === ''` 时才看 `emptyMatches`（`C:73`），否则走锚点路径，空对空返回 `null` → keep（`C:84-90`）。
  - 例外是 F1、F2：「角色已定」可能是现场补出来的。
- 活窗口不受影响：`C:509` 的 `live ||`；缓冲区的活窗口分支 `B:291-297` 与 r2.2 一样；`B:180` 对 `!notice` 不设高度上限。
- 三处存档都带角色：留住 `C:218`、pagehide `C:250`、3b 落地档 `C:549-550`（取的是落地前单元的角色）。
- 第 6 条改写 blockId 时角色不变：存档侧 `C:331` 的 `{ ...words, blockId }` 会保留 `writingRole`（`readUnplacedWords` 是展开整条记录读的，`B:91`）；内存侧 `C:326` 只改 `focus`，`role` 不动。

**2. 框**
- 锚上时框高不超过单元高：`B:164` 记下单元高，`B:180` 封顶，`B:171` 的 `minHeight` 等于单元高。在 border-box 下框高 = 单元高（见 F3）。
- 提示条最大宽度不超过框：`B:149`、`B:155`。
- 折叠条也过自检：`B:223-228`。
- 停靠先右后左、每侧至少 200px：`B:252-253`。
- Discard 只删自己那条：`B:398` → `C:222-227` 用的是该条目自己的 `id`。
- z 序：框 `B:130`，提示条 `B:385`。
- 没有新增自动删 DOM 的地方：只在 `close()` 里删（`B:424-425`）。重开时 `C:587-589` 静默移除的写法是 r2.2 就有的。
- `document.hidden` 时暂停（`B:288`）；`scroll` / `resize` / 定时器在 `close()` 里成对清理（`B:420-422`），用的是同一个 `place` 引用。
- 与活窗口共用的路径只加了 `unitHeight` 赋值（`B:164`），对活窗口无效果。

**3. 回归面**
- 字何时落地、能否落库（`canApplyEdit` / `isEditHeld`）、history 记账点（`boundary`）这三处，r2.3 的 diff 都没碰：控制器只改了类型、`roleOf` / `storedWords`、`C:509` 的条件、`C:549-550` 和 `C:602`。
- `retain()` 之后仍然没有副作用：只写 DOM 样式和 localStorage 存档，不写 history、不保存。`roleOf` 只读 `readLiveFlow`。
- 测试 `round 2 #4`（`T:817-855`）改成框锚在真单元上；无锚时「提示条在框内」由 (d) 接着覆盖，没变弱。

## 附注（r2.2 就有，不属 r2.3）

- `C:587-589` 重开时移除的是前一次挂载留下的框和提示条元素，但没调用它们的 `close()`，所以旧缓冲区的 50ms 定时器和 `scroll` / `resize` 监听还在，对着一个已脱离文档的元素空转。无害，属泄漏。
