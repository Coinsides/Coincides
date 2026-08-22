> from: claude(opus,调度权:operating-workflow.md v1) | to: codex(builder) | status: ready(设计裁定:journey-score §5.1,Fable e17eba3) | re: v2bn12-1-3 | date: 2026-08-21

# V2.BN.12.1.3:初始表面过渡桥(边界重划后,**仅 A 段**)

> ⚠️ header 的 `ready` 由 Opus 依调度授权链翻牌,**不代表 Henry 本人逐张批过**。

## 定位与「为什么是第三张单」

- 12.1.1 BLOCKED(B 段第 4 个 `created_at` 写点越界)→ 12.1.2 BLOCKED(**两条独立越界**:A 的数据通道不在允许面内;B.0「单一 helper」需触及 11 个未申报文件)。
- **本单只做 A(表面过渡桥)。B 段(时间戳)已从本线拆出,等 Fable 重裁「单一 helper vs 仅统一格式」后另开单。**
- **⭐ 拆开的理由**:A 与 B **无共享机关**,而 B 卡在一条设计裁定上。合着走会让 B 的设计问题卡住 A —— **而 A 修的是唯一真实用户当前丢失的内容。**

### 前两单的结论**全部有效,不必重做**

真因链、`order_index` 已证伪、受影响清单(1 篇)、A 的数据通道审计、T-1 信号候选 —— 均见 12.1.1 与 12.1.2 的 `## Result`。**本单只做实现。**

---

## 边界重划(**本单相对 12.1.2 的唯一变化**)

**新增允许**:`client/src/pages/Notes/canvasEngine/hooks/useNoteCanvasRuntimeController.ts`。

**重划依据(Opus 已亲验,阳性对照法)**:
- 阳性对照:探针先在 root 命中两处已知真实 hook 调用 —— `useRuntimeSurfaceStateController()` **`:76`**、`useRuntimeDocumentDataController({...})` **`:145`**。
- 阴性断言:`useRuntimeSurfaceStateController.ts` 中 `note|blocks|loading` 命中数 = **0** ⇒ 允许面内确无数据通道。
- ⭐ **且顺序是硬约束**:surface controller 在 **`:76`** 调用,数据在 **`:145`** 才拿到 —— **晚 69 行**。**故不能靠给 surface controller 传参解决,必须用 one-shot resolver:controller 返回 resolver,root 在取得数据后调用。**

> **12.1.2 的越界判定成立,是上一版工单划错了面,不是 builder 的问题。**

---

## A. 采纳的修法与四条约束(Fable 裁定,逐条硬性)

| # | 约束 |
|---|---|
| **C-1 正门内** | 逻辑留在 `useSurfaceModeController`;**复用 `modePolicyService` 的同一 `getVisibleBlocksForSurface` 谓词**(不另写可见性判断)。**⛔ 不新增存储、不新增真相源、不另立 store/context、不加 module-global、不重复 fetch、不做 DOM 推断。** |
| **C-2 只决定一次,不盖手动切换** | 按 note **至多决定一次**;用户 `toggleSurfaceMode` 后**永不再触发**。 |
| **C-3 过渡桥,非新常态** | 已登记 **TD-7**,退役触发器 = **12.4 流面成为默认面时拆除**。代码处留一条指向 TD-7 的注释。 |
| **C-4 RED-first,数据一字不动** | fixture 用**标本形状**(`canvas_workspace` + `boundary_role=crossing` + `coordinate_space=canvas_world`,**保留 `order_index: 6`**)。**⛔ 不改任何生产数据 / placement surface / `schema.sql`。** |

## A.1 接线形状(12.1.2 提出,本单采纳)

**surface controller 返回一个 one-shot resolver;root 在取得 `note / sortedBlocks / loading / contentWidth` 后调用它。**

**T-1 信号(采纳 12.1.2 的候选)**:`!loading && note?.id === noteId`
- 首渲染 `loading=true` ⇒ 未 hydrate;
- 换 note 首帧即使旧 `loading=false`,`note.id !== noteId` ⇒ 未 hydrate;
- 已 hydrate 的真空 note ⇒ 条件为真且 blocks 可为 0(**此时应保持 Page,见下**)。

**守卫**:按 note 分代的 `decided` ref + `manualToggled` ref,守住 C-2 与 T-2。

## A.2 三条必须成立的行为(**测试须逐条覆盖**)

| # | 情形 | 要求 |
|---|---|---|
| **T-1a** | 未 hydrate(`loading=true`,blocks 为空) | **必须保持 Page**。⚠️ **这是本单头号风险**:若据空 blocks 判定,**每篇 note 都会切到 Canvas**,而其表现「所有 note 从 Canvas 开始」**看起来像新特性、不像 bug**,会顺利通过测试。**须为此单独写测试。** |
| **T-1b** | 已 hydrate 但确实零块(真空 note) | **必须保持 Page**(空 note 应显示入口 prompt,不是空 Canvas)。 |
| **T-2** | hydration 完成前用户已手动切换 | **桥永不触发**,不得回抢。 |

**仅当**「已 hydrate **且** Page 可见 = 0 **且** Canvas 可见 > 0 **且** 用户未手动切过 **且** 本 note 未决定过」时,才一次性选 Canvas。

## A.3 验收

- **A-2 先红后绿必须真产生**(前两单均因越界记「未产生」)—— 给修复前失败 / 修复后通过两段输出。
- **⛔ 不得靠把数据重分类为 `formal_page` 来显示** —— `surfaceAuthorityContract.test.ts:197-263` 以同一批 live placement 保护其 `canvas_world + crossing` 空间真相。
- **三篇对照**:标本 `1d10fe77-495b-4458-b7a4-f3d428c568ff` 修复后应可见其 2 个 active block;`3927dd5a`(19 块,Page 默认布局)与 `5e2072fc`(今日新建)**行为不得改变**。

---

## 边界(触及面申报)

**允许**:`useSurfaceModeController.ts` · `useRuntimeSurfaceStateController.ts` · **`useNoteCanvasRuntimeController.ts`(本单新增)** · A 的新增常驻测试。

**⛔ 不得**:改 `modePolicyService.ts` 谓词本身(**复用不改**)· 改 `placementService.ts` 分类逻辑 · 改 `useNoteCanvasDataAdapter.ts` · 碰**任何 server 侧**(B 段已拆出本单)· 碰 migration / `schema.sql` / DB · 碰 12.2 面 · 碰 v1 线 · 碰 03/05 保护面。

**越界即停,标 `needs: claude`,不自行扩面。**(前两单正因照此停手而被判高质量。)

---

## D. 探针先过阳性对照(`adjudication §7`)

**报告任何阴性断言前,必须先让同一探针看见一个已知阳性实例,并把该阳性对照写进回执。**
12.1.2 已全程照此执行(连最终 diff 都先命中 3 个已知阳性文件才断言 client/server = 0)—— **本单沿用同一标准。**

## 验证与回执

门禁 **docs-first**:`docs:check`(过期先 `docs:index` + `docs:inventory`)→ `verify:v2-bn8-runtime` → client/server 双 `tsc --noEmit` → `test:unit`。
> 📌 verify 链的 parity 接线已由调度方撤除,本单 verify 绿**不含** tool-face parity 断言 —— 正常,不必找它。

**回执纪律**:README Builder 侧 1–3(含 **UTF-8**)+ **M-1 mutation 归复核方** + **M-2 header 不由你翻**。

**回执须含**:resolver 接线形状 · T-1 信号实现 · **T-1a / T-1b / T-2 三条测试各一段输出** · A-2 先红后绿两段输出 · 三篇 note 对照 · 四门逐条收据 · 触及面 diff vs 申报 · 显式范围排除 · **每条阴性断言的阳性对照**。

## Result

> builder: Codex · date: 2026-08-21 · **判定:DONE,待复核方 mutation 验收**
>
> 按 M-2 保持 header `ready`,不由 builder 翻牌。本回执把 hook/策略测试与只读数据库对照称为 builder self-test,不把它扩写成浏览器 mutation 验收。

### 1.实现与接线

过渡桥已落在既有 surface 正门内,没有新增真相源或平行状态机关:

1. `useSurfaceModeController.ts` 接收当前 `noteId`,持有按 note generation 重置的 `decisionNoteIdRef / decidedRef / manualToggledRef`,并返回 one-shot `resolveInitialSurfaceMode`。
2. resolver 的 hydration 信号在同一 hook 内严格实现为 `!loading && loadedNoteId === noteId`;root 传入的 `loadedNoteId` 只来自 `note?.id`。未 hydrate、旧 note payload、已决定或已手动切换均直接返回。
3. 已 hydrate 且尚未决定时,resolver 用**同一个现役谓词** `getVisibleBlocksForSurface` 分别计算 Page/Canvas;仅 `Page=0 && Canvas>0` 时选择 Canvas。已 hydrate 真空 note 会消费 one-shot 但保持 Page。
4. `useRuntimeSurfaceStateController.ts` 只下传 `noteId`、上透 resolver;`useNoteCanvasRuntimeController.ts` 在取得 `note / sortedBlocks / loading / contentWidth` 后调用。
5. root 接线使用 `useLayoutEffect`,使 hydration 后的初始 Canvas 选择在 browser paint 前完成。增量只读复核曾据 passive effect 报 1 个 MED(空 Page 闪帧);改为 layout effect并补旧 note generation 测试后,复核结论为 **PASS,无剩余 HIGH/MED/LOW**。
6. 代码保留注释:`Transitional TD-7 bridge: remove when 12.4 makes the stream surface the default.`

`toggleSurfaceMode` 会先置 `manualToggledRef=true`;因此 hydration 前后的任何手动切换都不会被桥回抢。同 note 已作决定后也不会二次自动选择;换 note 时 layout effect 先重置为 Page 与新一代 refs,再运行 resolver。

### 2.A-2 先红后绿

fixture 保留真实标本形状:`surface=canvas_workspace`、`boundary_role=crossing`、`coordinate_space=canvas_world`、`order_index: 6`(block `0017f298-...`)。

**RED(生产实现前,exit 1):**

```text
× A-2: switches a hydrated canvas-only legacy specimen to Canvas once
  → subject.result.current.resolveInitialSurfaceMode is not a function
Test Files  1 failed (1)
Tests       1 failed | 4 skipped (5)
```

**GREEN(最终实现后,exit 0):**

```text
✓ A-2: switches a hydrated canvas-only legacy specimen to Canvas once
Test Files  1 passed (1)
Tests       1 passed | 5 skipped (6)
```

该 GREEN 同时证明:桥先把标本选到 Canvas;随后用户手动切回 Page,再次调用 resolver 仍保持 Page。

### 3.T-1a / T-1b / T-2 独立输出

三条均用独立 `vitest -t` 命令运行,不是从总绿里拆字。

**T-1a(未 hydrate 的空 blocks 保持 Page,且不提前消费 decision):**

```text
command: npm.cmd --prefix client run test:unit -- src/pages/Notes/canvasEngine/hooks/useSurfaceModeController.test.tsx -t "T-1a:" --reporter=verbose
exit: 0
✓ T-1a: keeps Page while hydration is incomplete without consuming the decision
Test Files  1 passed (1)
Tests       1 passed | 5 skipped (6)
```

测试先以 `loading=true + blocks=[]` 断言 Page,再让同 note 正确 hydrate 为 canvas-only 标本并断言 Canvas;因此不会由“所有时候都 early-return”形成假绿。

**T-1b(已 hydrate 的真空 note 决定保持 Page):**

```text
command: npm.cmd --prefix client run test:unit -- src/pages/Notes/canvasEngine/hooks/useSurfaceModeController.test.tsx -t "T-1b:" --reporter=verbose
exit: 0
✓ T-1b: decides that a truly empty hydrated note stays on Page
Test Files  1 passed (1)
Tests       1 passed | 5 skipped (6)
```

测试在 `loading=false + loadedNoteId=noteId + blocks=[]` 后仍为 Page,再给同代 canvas-only 标本仍为 Page,证明真空 hydration 已消费 one-shot。

**T-2(hydration 前手动切换后桥永不回抢):**

```text
command: npm.cmd --prefix client run test:unit -- src/pages/Notes/canvasEngine/hooks/useSurfaceModeController.test.tsx -t "T-2:" --reporter=verbose
exit: 0
✓ T-2: never reclaims the surface after a manual pre-hydration toggle
Test Files  1 passed (1)
Tests       1 passed | 5 skipped (6)
```

测试在未 hydrate 时手动 Page→Canvas→Page,再 hydrate canvas-only 标本,最终仍为 Page;两次 toggle 避免“手动 Canvas 与自动 Canvas 同态”的假绿。

同文件另有两条补强:旧 note payload(`loading=false + loadedNoteId=previous`)保持 Page且不消费 decision;换 note 后 one-shot/manual guard 按新 generation 重置。最终专项文件 **6/6 PASS**。

### 4.三篇 note 只读对照

同一 Node 探针以 `better-sqlite3` 的 `readonly:true,fileMustExist:true` 打开 `server/coincides.db`,启用 `PRAGMA query_only=ON`,读取 active blocks + 现役 Canvas persistence,再直接调用客户端现役 `getVisibleBlocksForSurface`。探针先命中已知阳性 `1d10...` 的 2 个 active block,再报告两个对照:

| note | active | Page visible | Canvas visible | resolver 初始面 | 初始可见 |
|---|---:|---:|---:|---|---:|
| `1d10fe77-495b-4458-b7a4-f3d428c568ff` | 2(order 5,6) | 0 | 2 | Canvas | 2 |
| `3927dd5a-4b14-4cce-ab72-76e58700800d` | 19(order 14–32) | 19 | 19 | Page | 19 |
| `5e2072fc-418a-4f03-8c01-279333517a48` | 1(order 0,当前快照为 formal Page block) | 1 | 1 | Page | 1 |

输出尾为 `total_changes=0`。这是**策略级只读 self-test**:证明标本会选 Canvas 并见 2 块,两个 Page 对照不改初始面;没有执行生产数据修复或浏览器写操作。

### 5.四道门收据(docs-first,最终实现后)

1. `npm.cmd run docs:check` → **exit 0**,`object-inventory.md` 最新。更早的首次 docs-first 检查只因新工单尚未入总 INDEX 而 exit 1;按工单运行 `docs:index`(写入 `docs/agent-ops/INDEX.md` 1 件)与 `docs:inventory`(无变化)后即通过。最终代码修正后已再次从 `docs:check` 开始重跑。
2. `npm.cmd run verify:v2-bn8-runtime` → **exit 0**:client **18 files / 204 tests PASS**;runtime boundary **159 checks PASS**;model contract **60 groups PASS**;client/server build、performance smoke、docs/diff/secrets 尾门均通过。依本单说明,此链不含已撤接线的 tool-face parity,未将其列为本单结论。
3. client `npm.cmd exec tsc -- --noEmit` → **exit 0,无输出**;server 同命令 → **exit 0,无输出**。
4. `npm.cmd run test:unit` → **exit 0**,client **18 files / 204 tests PASS**(含新增 6 条)。

### 6.触及面、平行机关与 D 段阳性校准

**生产实现:**

- `client/src/pages/Notes/canvasEngine/hooks/useSurfaceModeController.ts`
- `client/src/pages/Notes/canvasEngine/hooks/useRuntimeSurfaceStateController.ts`
- `client/src/pages/Notes/canvasEngine/hooks/useNoteCanvasRuntimeController.ts`

**测试/收据生成件:**

- 新增 `client/src/pages/Notes/canvasEngine/hooks/useSurfaceModeController.test.tsx`
- `docs/agent-ops/INDEX.md`(仅 `docs:index` 把本工单纳入 107→108)
- 本文件(UTF-8 追加本 `## Result`;header 不改)

**D 阳性对照 1(路径):**同一 `git status --short` 探针先列出上述 3 个 hook、测试与生成 INDEX 的真实阳性改动,再以同一列表过滤禁区;`server | migration | schema.sql | modePolicyService.ts | placementService.ts | useNoteCanvasDataAdapter.ts | v1` 命中数 = **0**。

**D 阳性对照 2(机关):**同一 three-hook added-lines 探针先命中 `resolveInitialSurfaceMode`、`getVisibleBlocksForSurface` 与 3 个 refs,再扫描 `fetch/axios/api/createContext/createStore/localStorage/sessionStorage/querySelector/document/window` 命中数 = **0**。新增 runtime state 全在既有 hook 的 React state/ref 内;没有 module-global、store/context、重复 fetch、DOM 推断或第二套可见性谓词。既有正门足够,所以没有“平行机关为何必要”的申报项。

**D 阳性对照 3(数据):**三 note 同一只读探针先命中标本 2 个 active blocks 与 Canvas=2,再报告两个 Page 对照;连接为 readonly + query-only且 `total_changes=0`。因此这里只申报本轮没有生产 DB 写入,不把只读探针包装成 mutation 验收。

### 7.显式范围排除与 M-1/M-2

未修改 `modePolicyService.ts` 谓词、`placementService.ts` 分类、`useNoteCanvasDataAdapter.ts`、任何 server 代码、migration、`schema.sql`、DB/WAL、12.2 面、v1 线或 03/05 保护面;没有把数据重分类为 `formal_page`,也没有改 `order_index` 或 placement surface。未执行 commit、push或 main 操作;当前分支仍为 `fable/v2-bn12-exoskeleton`。

M-1 的真实浏览器 mutation / 主观体验验收归复核方;builder 未用 self-test 冒充。M-2 已遵守:header 保持原 `ready`。

## Review

> reviewer: Codex（洁净室复核） · date: 2026-08-21 · baseline: `70a2aaad8e5124715485a5a5c54c9e831cc81ba4`
>
> **判定: FAIL（方向成立）** · **BLOCKER 0 / HIGH 1 / MED 2 / LOW 1**

### 1. 裁定

实现方向与当前产品代码成立：bridge 复用了现役 surface policy，hydration/note-generation/manual-toggle 三类守卫和 root `useLayoutEffect` 接线静态上均正确；亲跑全门也通过。FAIL 的原因是本轮点名的 **RED 强度验收未过**：点名的五个 guard mutation 都能被测试杀死，但另有三个“API 存在、实现可编译、却写错或未接入生产”的 mutation 仍全绿，其中删除生产 root 接线甚至在 **6/6 专项、204/204 全量 unit 与 client tsc** 下均存活，会原样恢复 P-1。因此 builder 的 `resolveInitialSurfaceMode is not a function` RED 只能证明 API/test 接线存在，不能承重证明行为护栏完备。

“方向成立”具体指：未发现当前 bridge 算法、C-1/C-2 时序或 `useLayoutEffect` 本身的产品缺陷；失败位于常驻回归测试和回执精度，不要求撤销该方向。

### 2. 隔离、基线与还原收据

- 共享树开工阳性为 branch `fable/v2-bn12-exoskeleton`、HEAD `70a2aaa`；`git status --short` 为空。因沙箱不允许向共享 `.git/worktrees` 写 metadata，复核在 repo 内 ignored 临时 bare clone 上建立 detached **git worktree**，checkout 精确为 `70a2aaa`。所有 mutation 只在该 worktree 以 `apply_patch` 施加。
- mutation 前、全部还原后，专项文件均为 **6/6 PASS，exit 0**。最终 `useSurfaceModeController.ts` working/HEAD blob 同为 `be060d008fad04445ace77fd0bbe70ed61ce1942`，root controller working/HEAD blob 同为 `3efe5f820e2077850611b54d4d09482845e89545`；隔离 worktree `git status --short` 为空后才移除，临时 worktree/bare repo 均已删除。
- 下表共同的专项命令为 `cd client; npm.cmd exec vitest -- run src/pages/Notes/canvasEngine/hooks/useSurfaceModeController.test.tsx`；定点执行时加对应 `-t`。每次取证后均 `git restore --source=HEAD`，再做下一 mutation。

### 3. 调度方点名五处 mutation

| 位点 | 拆掉什么 | 实际变红测试与精确断言 | exit |
|---|---|---|---:|
| M1 | `!loading`，令 hydrated 只看 `loadedNoteId === noteId` | `T-1a` 第二段；test `:106`，`expected canvas, received page`（未 hydrate 时过早消费 one-shot） | 1 |
| M2 | `loadedNoteId === noteId`，令 hydrated 只看 `!loading` | `keeps Page while the loaded note belongs to the previous route generation`；test `:116`，`expected page, received canvas` | 1 |
| M3 | resolver 中 `manualToggledRef.current` 守卫 | `T-2`；test `:145`，`expected page, received canvas` | 1 |
| M4 | resolver 中 `decidedRef.current` 守卫 | 调度建议的 `A-2` 定点执行仍绿（exit 0，因 manual guard 遮蔽）；跑完整 6 条后由 `T-1b` 第二次 resolver 杀死，test `:129`，`expected page, received canvas` | 1（全文件） |
| M5 | `canvasVisibleBlocks.length > 0` 放宽为 `>= 0` | `T-1b` 首次决定；test `:126`，`expected page, received canvas` | 1 |

五处均被 suite 杀死；M4 的承重断言实际是 T-1b，而不是 A-2 后半。若只跑调度建议的 A-2，它会产生假绿，故报告保留这项映射偏差。

### 4. 反向补洞 mutation（决定本轮 FAIL）

| 位点 | 存在但写错的实现 | 结果 | 产品后果 |
|---|---|---|---|
| X1 | 将 `pageVisibleBlocks.length === 0` 错写为永真的 `>= 0`，等价于删掉 Page=0 前提 | 专项 **6/6 PASS，exit 0**；client tsc **exit 0** | 任意 Canvas-visible>0 的 formal/mixed note 也会被自动抢到 Canvas |
| X2 | 只删换 note 时的 `manualToggledRef.current = false` | 专项 **6/6 PASS，exit 0** | note A 手动切过后，note B 的 canvas-only hydration 永远被旧 manual flag 禁止 |
| X3 | 删除 `useNoteCanvasRuntimeController.ts` 的 resolver destructure 与 `useLayoutEffect` 生产调用（hook/API 本身保留） | 专项 **6/6 PASS，exit 0**；`npm.cmd run test:unit` **18 files / 204 tests PASS，exit 0**；client tsc **exit 0** | bridge 无生产调用者，原 P-1 原样复发 |

D 段覆盖阴性阳性校准：同一 test-reference 探针先看见 `resolveInitialSurfaceMode` 在专项测试中的已知阳性 **1**（直接手调，test `:73`），再得到 `useNoteCanvasRuntimeController` 测试引用 **0**；同一 fixture 探针先看见 `canvas_workspace/crossing/canvas_world/order_index:6` 四类阳性，再得到 formal/mixed 正例 **0**。因此 X1–X3 的绿不是探针失灵。

### 5. Findings

#### HIGH-1 · 生产 bridge 接线没有回归护栏

**复现：**在隔离 worktree 删除 `useNoteCanvasRuntimeController.ts` 中 resolver 的解构、import 与 layout effect 调用；依次运行专项 6 条、`npm.cmd run test:unit`、client `npm.cmd exec tsc -- --noEmit`，三者分别 exit `0/0/0`。这保留“存在且单测正确”的 API，却让生产桥完全不执行，正面回答了本轮头号问题：现有 6 条不能杀死这一错误。

**建议修法：**增加 root 级 integration/contract test，挂载或受控驱动 `useNoteCanvasRuntimeController`，断言成功 hydration 后生产接线以 `sortedBlocks/contentWidth/note.id/loading` 调用 resolver，并用 canvas-only、mixed/formal、真空三组结果检查首个可见 commit。该测试还应区分 layout effect 与 passive effect，避免未来恢复空 Page 闪帧。hook 直调测试可保留，但不能替代 root 接线测试。

#### MED-1 · `Page-visible === 0` 的左半谓词无正例保护

**复现：**把 `pageVisibleBlocks.length === 0` 改成编译合法且恒真的 `>= 0`；专项 6/6 与 client tsc 均 exit 0。现有非空 fixture 全是 canvas-only，故 suite 没有机会证明“Page 有内容时不得抢面”。Result 自报的 `3927...` 19/19 只作样本指针，不作为本裁定的 mutation 收据。

**建议修法：**新增至少一条 formal-only 或 mixed fixture，明确断言 `Page-visible > 0 && Canvas-visible > 0` 时保持 Page；再复跑本 mutation，要求该条精确变红。

#### MED-2 · note-generation 的 manual reset 名实不符

**复现：**删除 `manualToggledRef.current = false` 后 6/6 仍绿。现有名为 `resets the one-shot and manual guards` 的测试在旧 note 上从未调用 `toggleSurfaceMode`，实际只覆盖 decided reset。

**建议修法：**旧 note 先完成一次决定，再双 toggle 回 Page（确保 manual=true）；rerender 新 note 并 hydrate canvas-only 标本，必须自动到 Canvas。建议同时补 A→B→A 矩阵，锁住 `surfaceState` 的 noteId/Page reset，避免旧 A 的 Canvas state 在回到 A 时重新匹配。

#### LOW-1 · Result 的 exact receipt 不完整

实际 commit 为 **7 files, +442/-8**：3 个生产 hook、1 个新测试、`docs/agent-ops/INDEX.md`、`docs/agent-ops/claude-log/2026-08-21.md` 与本 handoff。Result §6 列表漏了 `claude-log/2026-08-21.md`；该 log 中 `+219/-8` 也不等于全 commit、code+test（`+255/-7`）或三 hook（`+96/-7`）任一自然口径。它是 docs 复盘，不构成产品越界，但不能作为 5-1 精确收据。另，`useNoteCanvasRuntimeController.ts` 本身属于 05 关联文件，故应写成“未改 Slash/rollback 保护 hunk/语义”，不能笼统写“未碰 05 文件”。

### 6. C-1、C-2 与 `useLayoutEffect` 评估

- **C-1 兑现。** `useSurfaceModeController.ts:11,82,87` 直接 import/调用现役 `modePolicyService.getVisibleBlocksForSurface`；既有 layout 路径 `useNoteCanvasLayoutModel.ts:94` 使用同一符号。D 阳性对照为三 hook added-lines 先命中该谓词/bridge refs，随后重复 `.filter`、`isCanvasWorkspaceBlock`、`showWorkspaceBlocks` 为 0；`modePolicyService.ts` 与 `placementService.ts` 在同一 parent→commit diff 探针为 unchanged，而已知阳性 `useSurfaceModeController.ts` 为 changed。
- **C-2 当前实现未见同帧窗口。** `toggleSurfaceMode` 同步先写 `manualToggledRef=true`，再更新 state/执行 cleanup；浏览器事件不会插入正在执行的 commit layout-effect。换 note 时子 hook 的 reset layout-effect 按注册顺序先于 root resolver effect，且 `loadedNoteId === noteId` 再挡旧 payload。这里的阴性不是空扫：同一源码探针先看见 toggle/reset/root 三个真实写点与调用顺序，再检查其间没有 async boundary。
- **layout effect 代价可接受。** 首个合法 hydration 至多调用既有可见性谓词两次，即两次 O(n) 扫描，并可能在 paint 前多一次 state render；决定后由 decided/manual guard O(1) 退出，没有同步 persistence、fetch、DOM 查询或新 store。D 阳性对照为 added-lines 先命中 resolver/policy 调用，再扫 `fetch/api/localStorage/querySelector/document/window` 为 0。风险不在当前开销，而在 HIGH-1：现有测试既不保护 root 调用，也不保护 `useLayoutEffect` 不被改回 passive effect。

### 7. 触及面、空间真相与 D 段阴性校准

- parent `fb8f754` → `70a2aaa` 的 changed-path 探针先命中 4 个 hook/test 阳性，随后禁区 `server|migration|schema|modePolicyService|placementService|useNoteCanvasDataAdapter|v1` 命中 **0**；`git diff --check 70a2aaa^ 70a2aaa` exit 0。没有发现申报外产品 diff。
- fixture added-lines 同一探针先命中 `canvas_workspace/crossing/canvas_world/order_index:6`，再得到新增 `formal_page` **0**。`surfaceAuthorityContract.test.ts:197-263` 对 parent unchanged，且最终 unit 中该文件 **16/16 PASS**，两枚 placement 的 hydrate/normalize/save 仍保护 `canvas_workspace + canvas_world + crossing`。这证明 commit 没靠测试数据重分类过关。
- live DB 只读校准先看见标本两条 active placement（order 5/6）均为 `canvas_workspace + crossing + canvas_world`，再得到该样本 `formal_page=0`、连接 `total_changes=0`。受控前后 DB/WAL/SHM **size 与 byte SHA 均相同**；但 SQLite readonly 打开仍把 `server/coincides.db-shm` mtime 从 `18:23:52.846Z` 触到 `18:24:09.188Z`。因此本报告只断言未观察到数据 bytes/rows 改写，明确不声称 sidecar metadata 零触碰，也不把它扩写成对 builder 历史上所有 ignored DB 行为的证明。
- 05 跨条扫描的同一 changed-line 探针先命中 bridge delta **5**，再得到 `applyBlockTextFlowEdit|rollbackBlockSlashSession|useSlashBlockRollbackController|onApply...` delta **0**：确实触及 05 关联 root 文件，但未改 05 Slash/rollback hunk。03 未出现相关 changed path；阳性仍为上述 bridge hunk。

### 8. 5-2 跨条与后续态扫描

- `v2bn121` 的真因链保持：hydration 有块，Page policy 按持久 `canvas_workspace` 排除，`order_index` 不是机关；空间真相不得改成 `formal_page`。`v2bn122` 随后证明 hydration authority 只有到 root 才与 surface resolver 汇合，并因 root 不在当时允许面而正确停工。本单扩面到 root 后采用的正是该汇合点，没有重开 121 已证伪的数据修法，也没有跨回 B 段时钟/server 范围。
- 当前 bridge 是 TD-7 过渡件；12.4 流面成为默认面时，应把 root resolver effect、hook refs/入口与这组过渡测试同批删除并关闭 TD-7，不能留下第二套默认面决定机关。除此之外未发现对 12.2、v1 或 03/05 语义的新耦合。

### 9. 亲跑门禁收据（docs-first）

| 顺序 | 命令 | 收据 |
|---:|---|---|
| 1 | `npm.cmd run docs:check` | exit **0**；`object-inventory.md` latest |
| 2 | `npm.cmd run verify:v2-bn8-runtime` | exit **0**；client **18 files / 204 tests**、runtime boundary **159 checks**、model contract **60 groups**、client/server build、perf、docs/diff/secrets 全过。链中无已撤除的 tool-face parity，按调度说明不报缺失 |
| 3 | client `npm.cmd exec tsc -- --noEmit` | exit **0**，无输出 |
| 4 | server `npm.cmd exec tsc -- --noEmit` | exit **0**，无输出 |
| 5 | `npm.cmd run test:unit` | exit **0**；**18 files / 204 tests PASS**，含 bridge 6/6、surface authority 16/16 |

复核过程有两项必须披露、但不计 builder finding 的卫生偏差：第一次清理隔离 worktree 时 Windows junction 令 git 一并清空了共享 ignored `client/node_modules`，所以第一次 verify 在 unit 入口以 `'vitest' is not recognized` **exit 1**；随后用 `npm.cmd ci --offline --no-audit --fund=false` 从 cache 恢复，`client/package-lock.json` 前后 SHA256 均为 `7A64FECDDBFE6FFB5251D6242F2E761C0CBA91F1073AD5C86372A1EF219FFE49`，tracked status 为空，之后从 docs-first 全链重跑并取得上表最终收据。第二项是上节已披露的 DB-SHM mtime 触碰。故我不声称“共享树除 Review 外连 ignored cache/sidecar metadata 也绝对零触碰”；只声称 mutation 未污染 tracked 产品/测试/数据内容。

### 10. 5-1 完备性与显式范围排除

本复核承重范围为：commit `70a2aaa` 的 7-file diff、六条专项测试的隔离 mutation、root 接线/策略复用/时序静态审计、四门与 unit 亲跑、121/122/03/05/12.4 跨条扫描。builder 的 API-absent RED 与三-note readonly self-test仅作辅助，不承担 PASS。

未执行真实浏览器主观/视觉验收，也未执行生产 DB 写入或历史数据修复；因此本结论不扩写为“无闪帧的真实浏览器感知已验收”或“所有 ignored 数据文件历史上从未变动”。未 commit、未 push、未切换或修改 main，未改 header。追加本 Review 前共享 tracked tree为 clean；追加后同一 `git status --short` 探针先看见本 handoff 这一已知阳性，再核对产品/常驻测试路径为 0。
