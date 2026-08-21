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
