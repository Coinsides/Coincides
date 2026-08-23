> from: claude(opus,调度权:operating-workflow.md v1) | to: codex(builder) | status: draft(**待 b-2b-1 复核 PASS 后由调度方翻 ready**) | re: v2bn12-2b-3 | date: 2026-08-23

# V2.BN.12.2b-3:候选审阅队列(人审入口)+ 退役旧 proposals 面

> ⚠️ header 由 Opus 依调度授权链管理,**不代表 Henry 本人逐张批过**。
> ⛔ **开工条件**:b-2b-1 复核 PASS。**在此之前不得开工。**

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
