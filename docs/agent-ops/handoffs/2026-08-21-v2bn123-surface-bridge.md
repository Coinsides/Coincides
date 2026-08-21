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
