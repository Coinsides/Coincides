> from: claude(opus,调度权:operating-workflow.md v1) | to: codex(builder) | status: done(2026-08-23 复核 FAIL→fix→PASS;Fable 以 `976d3c5` 为有效基线放行,log #33。**Opus 依下沉工作流翻牌,不代表 Henry 逐张批过**) | re: v2bn12-2b-3 | date: 2026-08-23

# V2.BN.12.2b-3:候选审阅队列(人审入口)+ 退役旧 proposals 面

> ⚠️ header 由 Opus 依调度授权链管理,**不代表 Henry 本人逐张批过**。
> ✅ **开工条件已满足**:b-2b-1 主单与 fix 均复核 PASS(Fable 放行 log 08-23 #30),两张已 done。

## 上游

- `handoffs/plans/v2-bn12-2b-first-write-tool-and-review-queue.md` **b-3 行 + §3 裁定 5/6 + §7 补记**(正文是依据,不重述)。
- b-2b-1 工单及其 `## Result`(**执行体与收据形状的事实来源**)。

---

## 调度方已亲验的六条实况(2026-08-23,发单前核)

**必读 —— 本单的形状由它们决定**:

| # | 实况 |
|---|---|
| 1 | **编排执行体已存在**:`server/src/services/notes.ts:69 trashNoteAsUser` / `:94 restoreNoteAsUser`。**b-3 的 apply 必须走它,不得另写。** |
| 2 | **revert 服务已存在**:`server/src/services/toolFaceReceiptRevert.ts:23 revertTrashNotesReceipt`。 |
| 3 | **`intended_input` 真在收据 metadata 里**:`toolFaceReceipts.ts:38` 类型 + `:136` 写入(`structuredClone`)。**apply 重放它。** |
| 4 | ⛔ **`tool-receipts` 路由不存在** —— 全仓零命中。**b-3 须新建**,不是「接上已有的」。 |
| 5 | **退役面**:`ProposalList.tsx` 住 `client/src/components/AgentPanel/`,**只被 `AgentPanel.tsx` 引用两处**(`:9` import、`:283` 渲染)。 |
| 6b | ⭐ **`revert` 服务已含全部守卫,路由不存在**:`toolFaceReceiptRevert.ts:23` 起已做 ownership(403)/工具名(409)/状态(409) 三重校验并逐个 `restoreNoteAsUser`。**b-3 只需薄壳。** |
| 6 | ⭐ **退役的连带 —— 两个孤儿,不是一个**(调度方亲验):`ProposalWeekEditor.tsx`(`ProposalList:6` import、`:272` 渲染)**与** `TimePickerInline.tsx`(`ProposalList:5` import、`:189/:195/:206` **三处**渲染)—— **两者均只被 `ProposalList` 引用**,退役后**双双变孤儿**。`proposalStore` 另有 `AgentPanel.tsx` 消费者(**不孤儿,⛔ 不得删**)。 |

---

## S1:服务端三个路由(**薄壳,业务在既有执行体**)

| 路由 | 行为 |
|---|---|
| `GET /api/tool-receipts?status=proposed` | **仅本用户**。返回队列所需字段:收据 id / 工具名 / tier / `resources` / `intended_input` 摘要 / 时间 |
| `POST /api/tool-receipts/:id/apply` | 用收据 `metadata.intended_input` **重放同一 binding 路径**,逐 id 经 **`trashNoteAsUser`**;成功 ⇒ `markToolFaceReceiptApplied`;**失败 ⇒ 收据不动、返回原因** |
| `POST /api/tool-receipts/:id/dismiss` | `status` 新值 **`dismissed`** —— **词汇扩展,schema 零改动**(与 `proposed` 同法) |
| `POST /api/tool-receipts/:id/revert` ⭐ | **薄壳调 `revertTrashNotesReceipt({userId, receiptId})`**。⚠️ **调度方亲验:该服务已自带全部守卫** —— ownership `403`、`metadata.tool !== 'trash_notes'` `409`、`status !== 'applied'` `409`。**⛔ 路由不得重复这些校验,也不得放宽任何一条** |

### ⛔ S1 的四条硬闸

| # | 禁令 |
|---|---|
| **H-1** | **apply 不得另写执行逻辑** —— 必须经 `trashNoteAsUser`(与人类门、MCP binding **同一执行体**)。b-2b-1 的补裁正是为此:**把最后一条 SQL 当执行体是第三次同族错**。 |
| **H-2** | **不得改 `schema.sql`** —— `dismissed` 是词汇扩展。 |
| **H-3** | **apply 失败时收据必须不动** —— 不得写半状态、不得部分标 applied。 |
| **H-4** | **只读本用户** —— 三个路由都须 ownership 校验;不得返回他人收据。 |
| **H-5** ⭐ | **apply 前须再核收据仍为 `proposed` 且属本用户** —— **幂等/并发:两次 apply 只执行一次**。⛔ 不得只在入口查一次就一路执行到底;状态检查须与执行同一事务边界内(或等价的先占后执行),**不得留「两个请求同时读到 proposed」的窗口**。 |

---

## S2:客户端最小队列页

列表项:**工具名 / 摘要 / 影响资源数 / 「跳到现场」/ Apply / Dismiss**。入口挂导航「辅助」分区(Home 未立前临时)。

⛔ **页边极淡标记点不做**(随 12.4 流面)。

---

## S3:退役旧 proposals 面(**同单**)

**删除**:`client/src/components/AgentPanel/ProposalList.tsx` + `ProposalList.module.css`,并移除 `AgentPanel.tsx:9`/`:283` 两处引用。

### ⭐ S3 的连带处置(**调度方亲验,须显式申报**)

- **两个孤儿须一并处置并在回执逐个申报**:`ProposalWeekEditor.tsx` 与 **`TimePickerInline.tsx`** —— 二者**均只被 `ProposalList` 引用**,退役后无消费者。**随之删除(推荐,各连同 `.module.css`)或明确保留并说明理由。⛔ 不得默默留下孤儿。**
- ⚠️ **删前须各自跑一次全仓零引用确认**(阳性对照:先证探针能命中退役前的引用)——**不得按本单列的行号推断**,行号会漂。
- **`proposalStore` 另有 `AgentPanel.tsx` 消费者 ⇒ 不孤儿,⛔ 不得删。**
- **旧表/服务标 deprecation candidate,⛔ 不物理清**(随 v1 清场专项,plan §3 裁定 5)。

---

## K 系 killer

| # | killer | 必红判据 |
|---|---|---|
| **K-1** ⭐ **端到端正控** | 造一条 `proposed` 收据 → `apply` → **note 真的进回收站** + 收据变 `applied` | 令 apply 走 no-op ⇒ **红**(防「路由通了但什么都没做」) |
| **K-1b** ⭐ | **两次 apply 只执行一次**:同一 `proposed` 收据连调两次 apply ⇒ **第二次拒绝,且 note 不被重复处理** | 去掉 H-5 的状态复核 ⇒ **红**(须在「实际执行次数」上红,不只在返回码上) |
| **K-2** | apply **走同一执行体** | 把 apply 改成内联 SQL(绕过 `trashNoteAsUser`)⇒ **红** |
| **K-3** | apply 失败 ⇒ **收据不动** | 令失败路径顺手标 applied ⇒ 红 |
| **K-4** | `dismiss` ⇒ status `dismissed`,**note 不受影响** | 令 dismiss 顺手执行 ⇒ 红 |
| **K-5** | `GET` **只返回本用户** | 去掉 ownership 过滤 ⇒ 红 |
| **K-5b** ⭐ | **revert 门端到端**:applied 收据 → `revert` → **note 真的回来了** + 收据 `reverted` | 令 revert 走 no-op ⇒ **红**;另:非本人 / 非 `trash_notes` / 非 `applied` 三种拒绝**各自可触发**(⛔ 不得合并成一个条件 —— 前身 S1 曾把条件写成恒假) |
| **K-6** | 退役后 **`ProposalList` 全仓零引用** | 留任一引用 ⇒ 红(**阳性对照:先证探针能命中退役前的两处**) |

**红的性质**:须来自「机关存在但被改坏」,**不得是 `ReferenceError`/`SyntaxError`/`ERR_MODULE_NOT_FOUND`**;HTTP 层 killer 须**从真实 Express 触发**。

### 📌 复核附加刀 C8(**承自 b-2b-1-fix,复核时一并验**)

b-2b-1-fix 的 `assertCanonicalNamedImport` 用**双向 `ts.resolveModuleName` 解析后比 `resolvedFileName`** 判来源(不是字符串相等)。**本单会再碰同一测试文件**(新增两条断言,见下),故**复核请顺带验这一刀**:

> **把 helper 的来源比对换回字符串相等** ⇒ **第 6 条(`toolFaceReceiptRevert.ts` → `restoreNoteAsUser` → `./notes.js`)须红。**

**为什么值得验**:第 6 条的 specifier 是 `./notes.js`,而合同写的是同一文件的另一种写法。**字符串相等会让它假红,解析比对才正确** —— 这一刀反过来证明「解析而非字面」这条语义真的承重,而不是碰巧现在过了。

### 本单须新增的两条 canonical import 断言

b-3 会新建路由并让 apply/revert 走既有执行体 ⇒ **新消费者须同样锁住**:

| # | 文件 | 符号 | 来源 |
|---|---|---|---|
| 7 | **新建的 tool-receipts 路由文件** | `trashNoteAsUser` | `../services/notes.js`(按实际相对路径) |
| 8 | 同上 | `revertTrashNotesReceipt` | `../services/toolFaceReceiptRevert.js`(按实际相对路径) |

⚠️ **用既有的 `assertCanonicalNamedImport`,⛔ 不得另写一套**;来源按**解析后**比对,不得字符串相等。

---

## 边界

**允许**:新建 `server/src/routes/toolReceipts.ts`(或等价,**含 revert 薄壳**)+ `server/src/index.ts` 挂载 · 新建客户端队列页与导航项 · 删除 `ProposalList.tsx`/`.module.css` 及其两处引用 · `ProposalWeekEditor` 的申报处置 · 相应测试。

**⛔ 不得**:改 `schema.sql`/migration · 改 `trashNoteAsUser`/`restoreNoteAsUser`/`revertTrashNotesReceipt` 的语义 · 删 `proposalStore` · 物理清旧 proposals 表/服务 · 碰 12.2a 已闭环面(registry/manifest/parity/transport)· 碰 12.1 线 / v1 其余线 · 做页边标记点 · 做 `resolve_selection`。

**越界即停,标 `needs: claude`。**

## ⚠️ 基线缺口:不得代偿

`scopes` 未强制(TD-14,**回执不得声称已强制授权**)· TD-6 跨资源原子性 · TD-8 残余 · TD-10 · TD-16 ESM 环(**不在本单改**)。

---

## D. 探针 / 锁 / 环境

阴性断言前先让同一探针看见已知阳性;**确认命中不是来自你自己刚写进去的东西**。
**锁非你所有** —— 不取锁、不写 `owner.json`、不删锁;取锁失败即停,**不得覆盖既有 owner**。
📌 porcelain 对 `client/.../useNoteCanvasRuntimeController.ts`、`server/src/routes/projections.ts` 有 stat/EOL 假阳性;判文件真改用 blob 哈希或 `git diff --numstat`;管道遮蔽退出码;`grep -c` 数行数不是出现数;新增文档先跑 `docs:index`,改 `package.json` 跑 `docs:inventory`。

## 验证与回执

门禁 **docs-first**:`docs:check` → `verify:v2-bn8-runtime` → client/server 双 `tsc --noEmit` → `test:unit` → server `test:v2` → 五道 tool-face 门。

**回执纪律**:README Builder 侧 1–3(含 **UTF-8**)+ **M-1 mutation 归复核方** + **M-2 header 不由你翻**。
**⭐ 写 `## Result` 是本单交付物之一,不需确认,直接写。**

**回执须含**:**第 7/8 条 canonical import 断言**(复用既有 helper,不另写)· K-1…K-6(含 **K-1b**、**K-5b**)**各自**先红后绿两段输出(**K-1 端到端正控须证明 note 真的进了回收站**)· apply 走 `trashNoteAsUser` 的证明 · **两个孤儿(`ProposalWeekEditor` / `TimePickerInline`)各自的处置选择与理由 + 各自的全仓零引用阳性对照** · 退役后 `ProposalList` 零引用的阳性对照 · 门禁逐条收据 · 触及面 diff vs 申报 · 显式范围排除 · **每条阴性断言的阳性对照**。

## Result

> builder: Codex | date: 2026-08-23 | outcome: 实现完成，待 reviewer / 调度方复核
>
> 本节以 UTF-8 追加。依 M-2，builder 未改 header 的 `status: ready`；下列 mutation 是 builder 预检证据，不代替 M-1 的独立复核裁定。

### 1. 实现结果

- 新建 `server/src/routes/toolReceipts.ts`，并在 `server/src/index.ts` 以既有认证 middleware 挂载 `/api/tool-receipts`：
  - `GET ?status=proposed` 仅查询当前 `user_id` 的 `proposed` MCP receipts，并返回 id / tool / tier / resources / intended-input 摘要 / created time。
  - `POST /:id/apply` 在一个同步 `getDb().transaction(...).immediate()` 内依次重读 receipt、复核 ownership / `trash_notes` / `proposed`、用既有 `trashNotesInputSchema` 重验 `metadata.intended_input`、逐 note 调 canonical `trashNoteAsUser`、把真实执行结果写成 causal `metadata.resources`，最后条件标为 `applied`。没有另写 trash SQL 或第二执行体。
  - `POST /:id/dismiss` 只把本人仍为 `proposed` 的 receipt 条件更新为 `dismissed`，不碰 note。
  - `POST /:id/revert` 是单次委托 `revertTrashNotesReceipt` 的薄壳；路由未复制或放宽 ownership 403 / tool 409 / status 409 三重守卫。
- 扩展 `server/src/services/toolFaceReceipts.ts` 的 TypeScript status vocabulary 为 `dismissed`，加入本人列表、dismiss、以及成功 apply 时原子写回真实 resources 的能力；`schema.sql` 与 migration 均未改。
- 新建客户端 `ToolReceipts` 页、typed API 与 CSS；在 `App.tsx` 接入 `/tool-receipts`，在 `AppLayout.tsx` 的“辅助”区加入入口。队列可见 tool、摘要、影响资源数、首个 note 的“Jump to scene”、Apply / Dismiss，以及 loading / empty / error 状态。页面根为带 `aria-labelledby` 的 `<section>`，不嵌套 `<main>`。
- 从 `AgentPanel` 移除旧 proposals tab、badge/fetch/render/store 消费与死样式；`proposalStore.ts` 文件按禁令保留，未物理清 proposals 表或服务。
- `docs:inventory` 只同步了新增 server route：route 数 48 → 49，并新增 `toolReceipts.ts` 行。

### 2. H 系证明

| 闸 | 当前实现与常驻证明 |
|---|---|
| H-1 | 新路由直接 named-import `trashNoteAsUser`，apply 的 map 调它；K-2 用“计数 wrapper → 委托真实 executor”证明一次实际调用，inline-SQL mutant 会因计数 0 失败。人类门、MCP binding、新队列因此锁向同一 canonical export。 |
| H-2 | `git diff --numstat -- server/src/db/schema.sql` 为零；`dismissed` 只进入 TS union 与行状态值。 |
| H-3 | note 执行、真实 resources 写回、receipt 状态更新在同一 immediate transaction；任一 executor throw 会回滚此前 note 写和 receipt 写。K-3 证实 note 仍 `active`、receipt 仍 `proposed`。 |
| H-4 | GET 以 `user_id` 过滤；apply 在事务内复核 owner；dismiss 同时先复核并在条件 UPDATE 中带 owner；revert 由 canonical 服务复核 owner。K-5 / K-5b 的 foreign fixtures 分别触发拒绝。 |
| H-5 | receipt read、ownership/tool/status guard、executor、mark-applied 均位于同一个 transaction callback，且以 `.immediate()` 先占执行；真实 Express 双 apply 的实际 executor 计数为 1，第二次为 409。另有 AST 常驻断言锁住 `read → guard → executor → mark` 的事务内顺序，防止只把入口检查搬到事务外。 |

### 3. 旧面与两个孤儿的逐项处置

删除前使用 TypeScript AST dependency probe（不是单行 regex）做阳性对照，实际看到：

- `AgentPanel → ProposalList`：named import + JSX render 均命中。
- `ProposalList → ProposalWeekEditor`：named import + JSX render 均命中。
- `ProposalList → TimePickerInline`：named import + **4 个**当前真实 JSX render 均命中；工单所列 3 处是漂移后的旧数，未据行号施工。

移除各自唯一消费者后、删除前又逐个运行同一源码引用探针：

| 对象 | 删除前外部源码引用 | 处置与理由 |
|---|---:|---|
| `ProposalList.tsx` | `[]` | 删除本体与 `.module.css`；旧 proposals 面已退役。 |
| `ProposalWeekEditor.tsx` | `[]` | 删除本体与 `.module.css`；唯一消费者退役后成为孤儿。 |
| `TimePickerInline.tsx` | `[]` | 删除本体与 `.module.css`；唯一消费者退役后成为孤儿。 |

常驻 K-6 扫描 `client/src/**/*.{ts,tsx}` 的 identifiers、静态/动态 import module specifiers 与 source filename；以仍存活的 `AgentPanel` import + JSX（至少 2 个命中）作阳性对照，再断言上述三个退役组件均零生产源码引用。这里的“零引用”是可执行源码 dependency，不把 active handoff / 历史文档中的名称字面量误算成消费者。`proposalStore.ts` 本体仍存在；没有因当前生产消费者归零而越权删除。

### 4. Canonical import 第 7/8 条与 C8

- 在既有 `assertCanonicalNamedImport` 中新增：
  1. `server/src/routes/toolReceipts.ts` 的 `trashNoteAsUser` 必须解析到 `../services/notes.js`；
  2. 同文件的 `revertTrashNotesReceipt` 必须解析到 `../services/toolFaceReceiptRevert.js`。
- 没有另写 helper；既有 helper 继续通过 TypeScript `resolveModuleName` 后的文件身份做双向比较，并同时禁止 alias。
- C8 的第 6 条合同故意写为 `../services/notes.js`，生产 import 保持 `./notes.js`；二者字面不同、解析到同一 `notes.ts`。把 helper 退回字符串相等时，A-1 明确以 `actual './notes.js' !== expected '../services/notes.js'` 失败。

### 5. K 系先红后绿预检

所有 HTTP 刀都从真实 Express router + JWT/auth + error handler 触发；mutation 期间文件始终可解析。所有 RED 都是业务/结构 AssertionError，不是 `ReferenceError`、`SyntaxError` 或 `ERR_MODULE_NOT_FOUND`；每刀随后用 `apply_patch` 精确归复生产实现。

| Killer | RED（机关存在但被改坏） | GREEN（当前常驻断言） |
|---|---|---|
| K-1 | apply 改成 no-op / 伪造 `trashed` receipt：note 实际仍 `active`，期望 `trashed`，exit 1。 | 真实 HTTP apply 后 note lifecycle 为 `trashed`，receipt 为 `applied`，resources 记录真实 causal outcome。 |
| K-1b | 移除事务内 `proposed` guard：actual executor count `2 !== 1`，exit 1；红点在实际执行次数，不只返回码。 | 两个 apply 返回 200 / 409，executor 严格 1 次。 |
| K-2 | 保留 import 但把 apply 换成 inline UPDATE：canonical executor count `0 !== 1`，exit 1。 | wrapper 委托真实 `trashNoteAsUser`，count 1，并保持 source-projection guard。 |
| K-3 | 捕获失败后在事务外顺手 mark applied 再抛：receipt `applied !== proposed`，exit 1。 | 注入中途失败后 note 写整体回滚、receipt 仍 `proposed`。 |
| K-4 | dismiss 先调用 executor：note `trashed !== active`，exit 1。 | receipt 变 `dismissed`，note 保持 `active`。 |
| K-5 | 去掉 GET owner filter：foreign receipt 泄漏，2 IDs 而非本人的 1 ID，exit 1。 | 自有 + 外用户 fixture 为阳性/阴性对照；GET 只返回自有，foreign apply / dismiss 分别拒绝。 |
| K-5b | revert no-op：canonical revert spy `0 !== 1`；再分别移除 ownership / tool / status guard，各自得到 `200 !== 403/409/409`，均 exit 1。 | applied receipt 经真实 revert 后 note 恢复 `active`、receipt `reverted`、canonical service count 1；foreign / wrong-tool / non-applied 三条独立用例各自触发 403 / 409 / 409。 |
| K-6 | 恢复一个可编译的匿名 default `ProposalList.tsx` 并用 aliased import 消费：client tsc 仍为 0，但 AST probe 同时抓到 module specifier 与 filename，test exit 1。 | `AgentPanel` 活引用作阳性对照；三个退役组件生产源码引用均 `[]`。 |

附加承重刀：

- 把第 7 条或第 8 条 import 各自改成 alias，A-1 均以“must import ... without an alias”失败；恢复后 8 条 canonical assertions 全绿。
- 把 H-5 的 receipt read / guard 搬到 transaction callback 外，H-5 AST 断言以 transaction 内 `readToolFaceReceipt` 缺失失败；恢复后通过。
- 当前定向结果：K-1 / K-1b / K-2 / K-3 / K-4 / K-5 / K-5b 共 10 个真实 HTTP cases，`10/10 PASS`；A-1 / H-5 / K-6，`3/3 PASS`；完整 `test:trash-notes-tool`，`36/36 PASS`。

每条阴性断言都有同探针阳性：HTTP tests 先造合法 owned receipt/note 并走成功链；K-5b 先证真实 restore；K-6 先命中活的 `AgentPanel`；canonical helper 同时命中既有与新增的合法 named imports；H-5 先识别当前 transaction callback 内完整序列。

### 6. 门禁收据（docs-first 顺序）

| 门禁 | 结果 |
|---|---|
| `npm.cmd run docs:check` | 首跑正确报新增 route 令 generated inventory 过期；运行 `npm.cmd run docs:inventory` 后重跑 PASS。 |
| `npm.cmd run verify:v2-bn8-runtime` | 完整从头重跑 PASS：client 211 tests、159 runtime boundary checks、60 model-contract groups、client/server build、performance smoke、docs check、diff check、tracked-changes secret scan 均通过。 |
| client `npm.cmd exec tsc -- --noEmit` | PASS，exit 0。 |
| server `npm.cmd exec tsc -- --noEmit` | PASS，exit 0。 |
| `npm.cmd run test:unit` | PASS，211/211。 |
| server `npm.cmd run test:v2` | 首跑 265/270；5 个失败同为无关 image fixture 对默认 `server/uploads/canvas-assets` 的 sandbox `EPERM mkdir`。改用受支持的 `$env:CANVAS_ASSET_DIR = Join-Path $env:TEMP 'coincides-v2bn12-2b3-canvas-assets'` 后原命令重跑 PASS，270/270。没有修改测试或产品语义来代偿 ACL。 |
| `npm.cmd run test:tool-face-registry` | PASS，4/4。 |
| `npm.cmd run test:tool-face-manifest` | PASS，10/10。 |
| `npm.cmd run check:tool-face-manifest` | PASS，fresh，2 public tools。 |
| `npm.cmd run test:tool-face-parity` | PASS，10/10。 |
| `npm.cmd run check:tool-face-parity` | PASS；按该脚本原文，human reachability **NOT VERIFIED**，本回执不声称已验证。 |
| `npm.cmd run test:trash-notes-tool` | PASS，36/36。 |
| `git diff --check` | PASS，exit 0。 |

### 7. 触及面、排除与工作树完整性

本单实改 20 个路径（含本回执）：

- server：新 route；`index.ts` 挂载；`toolFaceReceipts.ts` 词汇/查询/状态转换；两份承重测试。
- client：新页面/API/CSS；`App.tsx` route；`AppLayout.tsx` 辅助导航；`AgentPanel.tsx/.module.css` 退役旧面；删除 3 个组件及各自 CSS。
- docs：generated object inventory；本 handoff 的 `## Result`。

显式排除并以 path diff 复核：

- 未改 `server/src/db/schema.sql`、migration、`trashNoteAsUser` / `restoreNoteAsUser` 所在 `services/notes.ts`，也未改 `revertTrashNotesReceipt` 所在文件的语义。
- 未删 `client/src/stores/proposalStore.ts`；未物理清旧 proposals 表/服务；未做页边标记点或 `resolve_selection`。
- 未改 12.2a registry / manifest / parity / transport 产品面；未碰 12.1 / v1 其余线。
- 未代偿 TD-6 / TD-8 残余 / TD-10 / TD-16；尤其 **scopes 仍未强制（TD-14）**，本单只实现认证后的 ownership，不声称已有 scope 授权强制。
- 未 commit、未 push、未碰 main；未取锁、未写或删除任何 `owner.json`。

已知 porcelain 假阳性用 blob hash 判定：

- `client/src/pages/Notes/canvasEngine/hooks/useNoteCanvasRuntimeController.ts`：HEAD / worktree 均为 `3efe5f820e2077850611b54d4d09482845e89545`。
- `server/src/routes/projections.ts`：HEAD / worktree 均为 `561902a449b50ce254b650de5a337973a8fbc26d`。

两者在 `git diff --numstat` 均无项，不属于本单改动。用户已有的 untracked `.claude/settings.local.json` 未触碰。

## Review

> reviewer: Codex reviewer（洁净室复核） | date: 2026-08-23
>
> review baseline: 098ef16ff20495ceed38c31baf3c0ab8e0b4bdfc
>
> pre-fix baseline: 57bc061
>
> **判定：FAIL（方向成立）**
>
> **分级：0 BLOCKER / 1 HIGH / 0 MED / 0 LOW**
>
> 这是复核报告，不是放行；放行权仍在 Fable。

### 1. 判定摘要与唯一发现

当前产品实现的方向成立：真实默认代码确实把 human Apply 委托给 canonical trashNoteAsUser，事务顺序、ownership、失败回滚、revert 薄壳、旧 proposals 面的保留边界与三个组件的退役结果均正确。FAIL 来自一处回归护栏不完备，而不是当前生产行为已走错。

#### HIGH-1（技术缺陷 / 认识论错误）：Q2 计数 wrapper 没有锁住生产默认 executor

点名的直接刀成立：把 transaction map 内的 trashNoteExecutor(...) 换成 ownership-scoped inline SQL 后，真实 Express K-2 在 executor count 处以 actual 0 / expected 1 红，source projection 后果也仍受检查。

但按 5-10 继续覆盖同形位点时，发现另一条等价漏径：

1. 保留 canonical trashNoteAsUser import、注入 seam、transaction 内 trashNoteExecutor(...) 调用与全部可编译性；
2. 新增一个 ownership-scoped inline trash executor；
3. 只把生产默认绑定从 options.trashNoteExecutor ?? trashNoteAsUser 改为 options.trashNoteExecutor ?? inlineTrashNoteAsUser；
4. 完整运行 server test:trash-notes-tool。

结果是 **36/36 PASS，exit 0，mutation 存活**。原因是 K-2/Q3 测试传入的计数 wrapper 会取代生产默认分支；A-1 只证明 canonical import 仍存在且来源正确；H-5 只看 transaction callback 内名为 trashNoteExecutor 的调用。因此测试证明的是“注入替身委托 canonical”，不是“生产默认 executor 必为 canonical”，属于 builder 所称 wrapper 的自证漏层。

影响：

- Q2 判 FAIL；H-1 的当前实现事实正确，但回归证明不承重。
- Q3 的点名刀“去掉 proposed guard”仍会在实际 slot count 2 上红，故该具体判据 PASS；但在 Q2 补牢前，count 1 不能外推为对所有生产旁路的穷尽计数。

建议修法：

- 在既有 TypeScript AST / type-checker 断言中，锁定生产 trashNoteExecutor initializer 的默认 fallback symbol **恰为 canonical named import trashNoteAsUser**，而不只是锁 import 存在。
- 再加一条不注入 options 的真实 Express source_projection 正控：默认 Apply 必须保持 note active，并写 skipped / read_only_projection。两者一条锁身份、一条锁行为。

### 2. Q1–Q8、Q3b 与 C8 逐条 mutation 收据

所有 HTTP 刀均由真实 Express app + production router + auth middleware + error handler + TCP fetch 触发。所有红均为目标 AssertionError / 业务后果，不是 ReferenceError、SyntaxError 或 ERR_MODULE_NOT_FOUND。每刀独立恢复后再取绿；同形重复位点未抽样。

| 位点 | 判定 | 对抗方亲跑收据与同探针阳性 |
|---|---|---|
| **Q1 — K-1 端到端** | PASS | Apply 改 no-op 并伪造 receipt resource 后，receipt status 的 applied 断言先通过，随后 note status 在 v2TrashNotesTool.test.ts:222 以 active !== trashed 红，确实红在 note 后果。阳性：恢复后合法 owned proposed receipt 经真实 HTTP Apply，note 为 trashed、trashed_at 非空、receipt 为 applied。 |
| **Q2 — H-1 同一执行体** | **FAIL / HIGH-1** | 直接把 transaction 内调用改成 SQL会以 count 0 !== 1 红；但只替换生产默认 fallback 为可编译 inline executor 时完整 36/36 仍绿。阳性：当前 K-2 wrapper 确实委托真实 trashNoteAsUser，source_projection 保持 active 并写 skipped / read_only_projection；这同时证明 wrapper 本身可见，但不足以回答默认分支身份。 |
| **Q3 — H-5 幂等/并发** | PASS（受 Q2 认识论边界约束） | 去掉 proposed guard 后，两次真实 HTTP 并发使 executor count 2 !== 1，红在实际执行次数。恢复后结果集合为 200 / 409、count 严格 1、note trashed、receipt applied。阳性和 mutation 使用同一真实 HTTP fixture。 |
| **Q3b — H-5 事务边界** | PASS | 保留 guard、把 receipt read + guard 搬到 transaction() 外后，AST 断言在 v2NotesListService.test.ts:312 以 callback 内 readToolFaceReceipt actual undefined / expected 1 红。恢复后同探针先看见 callback 内 read → guard → executor → mark 各一次，并看见 immediate()。点名刀确被杀死。 |
| **Q4 — H-3 失败即不动** | PASS | 令第二个 note executor throw，并在错误后错误地于事务外 mark applied：测试先通过两个 note 都 active 的 rollback 断言，再在 receipt actual applied / expected proposed 处红。恢复后 note 与 receipt 均不半状态。阳性：同 fixture 的成功 Apply 会同时写 note 与 applied receipt。 |
| **Q5 — H-4 只读本用户** | PASS，三路独立 | GET 去 owner filter：列表泄漏 foreign receipt，2 IDs !== owned 1；Apply 放宽 owner：foreign HTTP 200 !== 403；Dismiss 同时放宽 guard 与 owner-conditioned UPDATE：foreign HTTP 200 !== 403。三刀、三请求、三处独立断言，没有合并条件。阳性：owned GET 命中；Q1 owned Apply 成功；既有 K-4 owned Dismiss 变 dismissed 且 note active。 |
| **Q6 — revert 薄壳** | PASS，三守卫独立 | 路由只调用一次 revertReceipt，未复制守卫。分别放宽服务 ownership / tool / status guard 后，真实 HTTP 各自得到 200 !== 403、200 !== 409、200 !== 409。阳性：先跑 canonical 成功 revert，note active、receipt reverted、service count 1；恢复后三拒绝加成功共 4/4。 |
| **Q7 — 三个孤儿零引用** | PASS，逐个施刀 | 先由当前已提交 App.tsx:30 import 与 :43 JSX 证明同一 AST probe 能命中仍存活的 AgentPanel，命中不是 reviewer 写入。随后分别恢复 ProposalList、ProposalWeekEditor、TimePickerInline 的可编译文件与 aliased consumer；三刀各自在自己的零引用断言红。全部恢复后各自为 []。 |
| **Q8 — 第 7 条 trashNoteAsUser import** | PASS，三刀 | alias 红于“must import ... without an alias”；改指可解析的 notesReviewCopy.ts 红于 resolved file identity；保留 canonical 再加第二 binding 红于 matchingBindings 2 !== 1。三刀分别运行、分别恢复；当前 A-1 阳性为合法 named import 且解析到 notes.ts。 |
| **Q8 — 第 8 条 revertTrashNotesReceipt import** | PASS，三刀 | alias、可解析复制模块 toolFaceReceiptRevertReviewCopy.ts、二次 binding 三刀分别红，红点依次为 no-alias、resolved file identity、exactly-one binding。当前 A-1 阳性为合法 named import 且解析到 toolFaceReceiptRevert.ts。 |
| **C8 — 来源解析而非字面** | PASS | 把 helper 的 resolvedFileName 比较退回 specifier 字符串比较后，第 6 条准确以 actual ./notes.js / expected ../services/notes.js 红；恢复后两者解析到同一 notes.ts，A-1 通过。 |

补充：builder Result 中 K-4“Dismiss 不执行 note”的 mutation 自报不在本轮调度方点名的 Q1–Q8/C8 三要素矩阵内，本轮没有拿 builder 自报红数承重；只亲跑了其常驻绿（包含在 36/36）并把 mutation 范围显式排除。

### 3. 静态边界、漂移纠正与阳性对照

- 57bc061 是 098ef16 的祖先，区间只有 1 个 commit；57bc061..098ef16 恰为 20 paths，与 Result 的 server / client / docs 分类逐项一致。
- dismissed 确为 TypeScript vocabulary 扩展。schema.sql 在两基线的 blob 都是 bd1d50ec007af142f08cd9b1f4bc2e599f979335；整个 migrations tree 都是 860b327046f9966695af8ee1a831736141868026，零改动。阴性断言阳性对照：同一 numstat probe 对 toolFaceReceipts.ts 明确见 70 additions / 7 deletions，因此探针不是失明。
- proposalStore.ts 仍存在且两基线 blob 同为 7d839f2015e3fb9ab96a3f12fa85b654a30d6d79。旧 proposals 表仍在 schema.sql:311，/api/proposals 仍挂载，route 仍读写，另有 7 个 production INSERT writers；“未物理清”不是从裸名缺席推断。
- services/notes.ts、toolFaceReceiptRevert.ts、routes/proposals.ts 的 blob 在两基线逐字节相同；revert 三守卫仍由服务侧 27–35 行承重。
- 独立以 TypeScript AST 解析 57bc061 的 ProposalList.tsx，parseDiagnostics=0；TimePickerInline JSX render 确为 **4 处**（189 / 195 / 206 / 212），builder 对工单“3 处”的纠正属实。
- 常驻 K-6 使用 ts.createProgram、节点类型判断与 ts.forEachChild，扫描 filename / identifier / module specifier，不是单行 regex。当前外部阳性来自已提交 App.tsx 的 AgentPanel import + JSX。

### 4. 5-2 跨条耦合与下一状态扫描

当前 b-3 与下一 b-2b-2（MRTR 往返 + HTTP K-5）没有直接状态冲突，但必须带走以下边界：

1. **Q2 → Q3 耦合**：Q3 的 executor count 只观测注入 slot。Q2 未锁住默认 fallback 时，不能把 count 1 宣称为对所有潜在执行路径的穷尽计数；先补 Q2 身份锁，再把 Q3 提升为全路径结论。
2. dismissed 是 human review queue 的拒绝终态，不应拿来表示 MRTR decline。下一单的 decline / cancel 仍应是零执行、零 receipt。
3. b-3 的 immediate transaction 只保护 REST Apply，不保护未来 transport.ts 的 confirm accept。MRTR accept 必须另有防重放 / executor-count killer；执行完成后 receipt writer 失败等 TD-6 窗口仍在。
4. accepted confirm 必须写真实 actual resources，不能把 pending / proposed resources 原样标 applied，否则 revert 无法按 outcome: trashed 恢复。
5. ToolFaceReceiptTier 当前仍只有 immediate / propose，statusForTier 不接受 raw confirm。下一单须明确“批准后按 immediate/applied 写入”或另裁 metadata 语义。
6. 多资源 revert 仍非原子；scopes / TD-14 仍未强制。简单往返成功不得外推为 TD-6 或授权闭环已解决。

### 5. 全门亲跑收据（docs-first）

| 门禁 | reviewer 结果 |
|---|---|
| npm.cmd run docs:check | PASS，LF 洁净树 exit 0，object inventory fresh。首个临时 clone 因全局 core.autocrlf 把 generated INDEX 检出为 CRLF而产生字节比较假 stale；未改产品文档，改用同 commit 的 LF 洁净树后通过。 |
| npm.cmd run verify:v2-bn8-runtime | PASS，exit 0：client 20 files / 211 tests、registry 4、manifest 10、parity 10、runtime boundary 159、model contract 60、双端 build、performance smoke、docs、diff、secret scan 全通过。 |
| client npm.cmd exec tsc -- --noEmit | PASS，exit 0。 |
| server npm.cmd exec tsc -- --noEmit | PASS，exit 0。 |
| npm.cmd run test:unit | PASS，20 files / 211 tests。 |
| server npm.cmd run test:v2 | PASS，270/270；CANVAS_ASSET_DIR 指向 reviewer OS-temp 实体目录，未改测试或产品语义。 |
| npm.cmd run test:tool-face-registry | PASS，4/4。 |
| npm.cmd run test:tool-face-manifest | PASS，10/10。 |
| npm.cmd run check:tool-face-manifest | PASS，fresh，2 public entries。 |
| npm.cmd run test:tool-face-parity | PASS，10/10。 |
| npm.cmd run check:tool-face-parity | PASS；脚本明确写 human reachability NOT VERIFIED，本 Review 不扩大其含义。 |
| server npm.cmd run test:trash-notes-tool | PASS，36/36。 |

沙箱适配说明：esbuild 从 user temp 的深路径向上枚举时会在 C:/Users/70208 触发 ACL，首轮 verify 在 Vitest 启动前停止，不是测试红。最终收据使用临时 R: DOS 映射只映射 reviewer temp base，并在 finally 中删除；node_modules 是物理副本、不是 junction/symlink。隔离副本的 node_modules/.bin/vitest.cmd 只临时追加 config/root 路径参数，tracked tree 未变；结束后从另一份物理依赖副本恢复，SHA-256 前后均为 F5959CE11885ED044BF1883D9A991D4DB2A4690C255681D2E635991D34B393F1，R: 最终不存在。

### 6. 5-1 完备性与显式范围排除

已取：所有 Q1–Q8/C8 点名 mutation、六个 Q8 同形位点、三路 ownership、三条 revert guard、三孤儿、真实 Express HTTP、全门、对象级 scope diff 与阳性对照。

显式未取 / 不扩大结论：

- 未做浏览器主观 UI 验收；tool-face parity 自身也只证明必要条件，不证明 human reachability。
- Q3 只覆盖当前单进程 Express + 单 better-sqlite3 connection 的竞争；未模拟多进程 / 多连接部署。
- b-2b-2 尚未在本 commit 实现，本轮只做下一状态静态耦合扫描，不把它写成已验旅程。
- 未验证 scopes 强制，因为 TD-14 明确仍是基线缺口；本 Review **不声称已强制授权**。
- 未代偿或关闭 TD-6、TD-8 残余、TD-10、TD-16。
- 如上所述，未扩跑非点名 K-4 mutation；其 builder 自报不承重。

### 7. 隔离、锁与共享树卫生

- mutation 与门禁均在仓库外 OS temp 的 local clone + detached worktrees 中进行；HEAD 都是 098ef16；没有在 tmp/、.codex-tmp/ 或其他仓库内路径建临时树。
- 两棵树的 reparse-point count 均为 0；未建 junction / symlink，未共享 node_modules。门禁树依赖来自物理复制，避免 TD-13 类删除穿透。
- 每刀恢复后核 key blob；删除前两树 tracked status / numstat 均干净，route blob 为 5fe1c42080d3f6ec775448d396df4b9217295014，等于 HEAD。
- detached worktrees 已由 git worktree remove --force 删除；随后经绝对路径、OS temp 前缀、仓库不重叠、零 reparse 四重校验删除 reviewer base。最终 BASE_EXISTS_AFTER=False，R_EXISTS=False。
- 过程偏差（不计入 builder 分级）：第一次离线安装沿仓库既有 npm cache 配置产生 3 个 ignored debug log；reviewer 逐个精确删除并复验不存在，没有清 cache 或共享依赖。此后所有 npm 日志与资产均定向到 OS temp。
- 未取锁、未写或删 owner.json、未改 header、未 commit、未 push、未碰 main。
- 共享树已知 stat/EOL 假阳性继续用 blob 判定：useNoteCanvasRuntimeController.ts 为 3efe5f820e2077850611b54d4d09482845e89545；projections.ts 为 561902a449b50ce254b650de5a337973a8fbc26d，均等于 HEAD 且 numstat 无项。
- 复核期间共享树另有并发文档改动（docs/agent-ops/INDEX.md、claude-log、handoffs/README.md 与新 b-2b-2 handoff）；reviewer 未触碰、未归因。reviewer 唯一保留的共享树写入是本节 UTF-8 Review。

### 8. 裁定建议

不建议在 HIGH-1 修复前放行本单测试合同。修复只需补 production default fallback 的 canonical symbol / 默认行为锁，不要求推翻当前产品实现；因此结论是 **FAIL（方向成立）**，不是方向不成立。
