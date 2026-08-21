> from: claude(opus,调度权:operating-workflow.md v1) | to: codex(builder) | status: ready(设计裁定:journey-score §5.1,Fable e17eba3) | re: v2bn12-1-2 | date: 2026-08-21

# V2.BN.12.1.2:初始表面过渡桥 + 时间戳盖章权威

> ⚠️ header 的 `ready` 由 Opus 依调度授权链翻牌,**不代表 Henry 本人逐张批过**。

## 定位

**12.1.1 判 BLOCKED(越界硬闸,零产品码改动),本单是它的边界重划续单。**
**12.1.1 的只读定位结论全部有效,不必重做** —— 真因已点名、`order_index` 已证伪、全量体检已出清单。**本单只做实现。**

上游:`analysis/2026-08-21-v2bn12-1-journey-score.md` **§3 问题总账 + §5/§5.1 Fable 裁定** · 12.1.1 工单的 `## Result`(**真因链与受影响清单在那里,本单不重述**)。

---

## A. 初始表面过渡桥(P-1 修复)

### A.0 已定的真因(12.1.1 已证,直接用)

初始 surface 恒为 `page`(`useSurfaceModeController.ts:19` 裸 `useState('page')`)→ Page mode 过滤 `isCanvasWorkspaceBlock`(`modePolicyService.ts:68-76`)→ 标本两块被 `placementService.ts:301-311` 判为 `canvas_workspace`/`crossing`/`canvas_world` ⇒ `visibleBlocks` 为空 ⇒ 0 textarea ⇒ 空态。

### A.1 采纳的修法与**四条约束**(Fable 裁定,逐条硬性)

| # | 约束 |
|---|---|
| **C-1 正门内** | 改 `useSurfaceModeController` 的**初始选择**;**复用 `modePolicyService` 的同一谓词**(不得另写一份可见性判断)。**⛔ 不新增存储、不新增真相源、不另立 store。** |
| **C-2 只决定一次,不盖手动切换** | 按 note **挂载后至多决定一次**;**用户此后的 `toggleSurfaceMode` 永远优先**,桥不得回抢。 |
| **C-3 这是过渡桥,不是新常态** | 已登记 **TD-7**,退役触发器 = **12.4 流面成为默认面时拆除**。请在代码处留一条指向 TD-7 的注释。 |
| **C-4 RED-first,数据一字不动** | 以**标本形状**做 fixture(`canvas_workspace` + `boundary_role=crossing` + `coordinate_space=canvas_world`,**并保留 `order_index: 6`**);**⛔ 不改任何生产数据**、不改 placement surface、不动 `schema.sql`。 |

### A.2 ⚠️ 两个必须防住的竞态(**这是本单最容易做错的地方**)

`useSurfaceModeController` 现在是**纯 UI 状态 hook,无任何数据输入**;把可见性结果接进来会引入两个时序陷阱:

| 陷阱 | 说明 | 要求 |
|---|---|---|
| **T-1 未 hydrate ≠ 零可见** | hydration 是异步的。首渲染时 blocks 尚空,此时「page 可见块 = 0」**恒成立** —— 若据此判定,**每一篇 note 都会被切到 Canvas**。 | 判定条件必须能区分「**已 hydrate 且 page 可见为 0**」与「**尚未 hydrate**」。**回执须明确说明你用什么信号区分二者。** |
| **T-2 hydration 晚于用户操作** | 用户可能在 hydration 完成前就手动切了。若桥此时才触发,会覆盖用户意图(违反 C-2)。 | 桥须记录「用户是否已手动切换过」;已切过则**永不触发**。 |

> **T-1 是本单的头号风险**:它的错误表现是「所有 note 都从 Canvas 开始」—— **看起来像新特性,不像 bug**,很容易通过测试并被当成成功。**请为 T-1 单独写一条测试**(formal-only note 在 hydration 前后都必须以 Page 开始)。

### A.3 验收(承接 12.1.1 的 A-1..A-4 硬闸)

- **A-2 先红后绿必须真产生**:12.1.1 因越界停工而记「未产生」,**本单必须补上**,给出修复前失败 / 修复后通过两段输出。
- **不得靠重分类数据为 `formal_page` 来显示** —— `surfaceAuthorityContract.test.ts:197-263` 以同一批 live placement 保护其 `canvas_world + crossing` 空间真相。
- 受影响清单(12.1.1 A.3)只有 **1 篇**:`1d10fe77-495b-4458-b7a4-f3d428c568ff`。修复后该篇应可见其 2 个 active block;对照 `3927dd5a`(19 块,Page 默认布局)与 `5e2072fc`(今日新建)**行为不得改变**。

---

## B. 时间戳盖章权威(P-2 + B-5)

### B.0 ⭐ 裁定的约定:**每列恰一个盖章权威**

| 列 | 唯一权威 |
|---|---|
| `created_at` | **DB 默认**(`CURRENT_TIMESTAMP`)—— 应用侧一律不传 |
| `applied_at` / `reverted_at` | **应用侧 ISO,经单一 helper** —— 不得各处自造 |

### B.1 `created_at`:**四个**显式写入点全部停传(扩面后)

- `server/src/services/noteBlockLifecycle.ts:207-221 / 455-468 / 926-939`
- **`server/src/services/sourceProjectionMaterializer.ts:289-308`**(⭐ **本单新增触及面**;其时间来自同文件 `:264` 的 `(options.now || new Date()).toISOString()`)

改后须**全量复扫**确认无第五处。**⚠️ 扫描须先过阳性对照**:先证明你的扫描命令**能看见这已知的 4 处**,再断言「没有第 5 处」。(理由见 §D。)

### B.2 数据回填

migration 回填现存 **2 行** ISO 记录为空格式。幂等;只命中形如 `%T%Z` 的 `created_at`。**⛔ 不得手改 db 文件。**

### B.3 复查

修复后给出**全表**(非抽样)格式分布 + 一次 `ORDER BY created_at` 时序正确性验证。**当前已知反例**:`manual 2026-08-21 17:07:37` 词法 rank=103/时间 rank=104,而较早的 `client 2026-08-21T17:05:59.322Z` 词法 rank=104/时间 rank=103。修复后该反例须消失。

### B.4 ⚠️ 上游口径更正(**是上游错了,不是你错了**)

12.1.1 指出的 `server/src/services/sourceMaterialization.ts:87-90`(`ORDER BY created_at DESC, id DESC`)**属实**,上游「零消费点」说法**已作废**。

**但准确表述是三段,请照此写回执,不要简化**:
> **已被消费;但该查询过滤 `source_type='source_materialization'`(当前 0 行),且全表每个 source_type 内部格式同质(`manual` 103 全空格式 / `client_note_block_create` 2 全 ISO)⇒ 当前未误动;任一 source_type 一旦出现混格式,该查询即静默取错「最近一条」。**

### B.5 `applied_at` 违例(⭐ 本单新增触及面)

`server/src/services/learningCanvases.ts:298-300` 唯一使用 `datetime('now')` 写 `applied_at`,其余 15 处走 ISO ⇒ **违反 B.0 约定的「应用侧 ISO 单一 helper」**。改为与其余一致。

**同时**:若 `applied_at`/`reverted_at` 的 ISO 写法散落各处,**按 B.0 收敛到单一 helper**;若你判断收敛会扩面过大,**停下标 `needs: claude`,不要自行大改**。

**`reverted_at`**:12.1.1 已核仅 `noteBlockLifecycle.ts:926-939` INSERT 与 `:1026-1029` UPDATE,均 ISO —— **本单只需确认它符合 B.0,无违例则不动。**

---

## 边界(触及面申报)

**允许**:`client/src/pages/Notes/canvasEngine/hooks/useSurfaceModeController.ts` 及其**调用方 `useRuntimeSurfaceStateController.ts`**(接线所需)· A 的新增常驻测试 · `server/src/services/noteBlockLifecycle.ts`(仅 B.1 三处)· **`server/src/services/sourceProjectionMaterializer.ts`(仅 B.1 第四处)** · **`server/src/services/learningCanvases.ts`(仅 B.5)** · 一个新 migration(仅 B.2)· 相应常驻测试。

**⛔ 不得**:改 `modePolicyService.ts` 的谓词本身(**复用,不修改**)· 改 `placementService.ts` 的分类逻辑 · 改任何生产数据的 surface/order_index · 改 `schema.sql` 既有 DDL · 碰 12.2 面(`toolFace`/`toolRegistry`/`check-tool-face-parity`)· 碰 v1 线 · 碰 03/05 保护面 · 新立 store 或新真相源。

**若真因或修法要求越出本申报面:停下,标 `needs: claude`,不要自行扩面。**(12.1.1 正因照此停手而被判为高质量回执。)

---

## D. ⭐ 新纪律:探针先过阳性对照

**本单起适用**(`adjudication §7`,由 Opus 四次自伤案提取):

> **在报告任何阴性结果之前(「没有第 5 处」「无消费点」「零 ghost」「不存在该情况」),必须先让同一个探针看见一个已知存在的实例。**

理由:阴性结论的可信度**完全取决于探针能否看见阳性**。已发生的四个案例中,失败的都不是判断,是探针 —— `head -5` 截断、单行 grep 遇多行 SQL、编造的 id、数重同一元素。**探针坏了,阴性结论就是凭空的。**

**回执中每一条阴性断言,须附其阳性对照。**

---

## 验证与回执

门禁 **docs-first 顺序**:`docs:check`(过期先 `docs:index` + `docs:inventory`)→ `verify:v2-bn8-runtime` → client/server 双 `tsc --noEmit` → `test:unit`。

> 📌 `verify:v2-bn8-runtime` 的 parity 接线**已由调度方撤除**(未过复核的门不进主链)。故本单的 verify 绿**不再包含** tool-face parity 断言 —— 这是正常的,不必找它。

**回执纪律**:`handoffs/README.md` Builder 侧 1–3 全条款(语言不得宽于实现 / 平行机关申报 / **UTF-8**)+ **M-1 mutation 归复核方**(self-test 只作前置自查)+ **M-2 header 不由你翻**。

**回执须含**:T-1 用什么信号区分「未 hydrate」与「已 hydrate 但零可见」· T-2 如何保证不盖手动切换 · A-2 先红后绿两段输出 · T-1 专项测试输出 · 三篇 note(标本/对照 3927dd5a/今日 5e2072fc)的行为对照 · B.1 四处改动 + 阳性对照后的全量复扫 · B.3 全表分布与时序验证 · B.5 处置 · `reverted_at` 合规确认 · 四门逐条收据 · 触及面实际 diff vs 申报 · 显式范围排除 · **每条阴性断言的阳性对照**。
