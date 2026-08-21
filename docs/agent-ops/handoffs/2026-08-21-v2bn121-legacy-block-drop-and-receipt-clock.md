> from: claude(opus,调度权:operating-workflow.md v1,Henry 2026-08-21 亲授调度下沉) | to: codex(builder) | status: ready(设计裁定:journey-score §5,Fable) | re: v2bn12-1-1 | date: 2026-08-21

# V2.BN.12.1.1:存量丢块机关 + 收据时钟统一(补丁版)

> ⚠️ **本单 header 的 `ready` 由 Opus 依调度授权链翻牌,不代表 Henry 本人逐张批过。** 授权链:Henry 2026-08-21 亲授 `operating-workflow.md` v1 把逐版本调度下沉 → 本单设计裁定来自 `journey-score.md §5`(Fable)。**记此一句是因为 `handoffs/README.md` 规定 `ready` = Henry 批准,授权来源必须可追。**

## 上游与定位

- 上游:`analysis/2026-08-21-v2bn12-1-journey-score.md`(实测 16/18,**未通过**)§3 问题总账 P-1/P-2、§5 Fable 裁定。
- 定位:**补丁版 12.1.1,不是回退铸版。** 12.1 的新写入路径经旅程 J1–J8 验证为好(四个病灶步骤全 2 分);缺陷在**存量兼容**与**收据时钟**。
- 并行关系:与 12.2 的 S1a/S1b **不并行同树施工**(调度决定,理由见 §5)。

---

## A. 存量 note 客户端丢块(P-1,🅰,本单主件)

### A.1 现象与已有取证(不必重做,可直接复用)

| 项 | 已证事实 |
|---|---|
| 标本 | note `1d10fe77-495b-4458-b7a4-f3d428c568ff`(标题「July 8 · 跨时期价格歧视 — 完整讲稿(应用版)」) |
| 服务端 | `GET /api/notes/<id>/blocks` → **200**,响应体含**两个 `status=active` 块的完整 `content_json` 与 `plain_text`**(其一 **1791 字**正文) |
| 客户端 | 渲染 **0 个 `<textarea>`**,显示空态 `Double-click to start writing`;真 reload(`navType=reload`)后不变,等待 6 秒后不变 |
| 对照组 | note `3927dd5a-4b14-4cce-ab72-76e58700800d`(**同为存量、33 个 placement、含 14 个 trashed 块**)→ **19 个 textarea 全渲染,无空态** |
| ⭐ 相关性 | 全库 8 篇「有活跃块」的 note 中,**唯一渲染失败的正是唯一 `order_index` 不从 0 开始的**(`[4,5,6]`;其余 7 篇全部从 0 起) |
| 已排除 | 前端消费 `order_index` 的位置**均为 `sort` 比较**(对非零起点安全)⇒ **机关不在排序**;服务端**无责**(它发了) |

> **`order_index` 不从 0 起是「完美相关但未证因果」。** 上游**没有**做因果验证(需改生产数据,超出上游权限)。**你可以证伪这个方向** —— 若真因是别的,照实写,不必迁就本节。

### A.2 ⛔ 硬闸:禁止「改数据让它显示」

**Fable 裁定原文:必须定位客户端丢块机关,不许只改数据。**

因此本单的**验收不是「那篇 note 能显示了」**,而是:

| 闸 | 要求 |
|---|---|
| **A-1 机关须点名** | 回执必须给出**具体 `file:line`** 与一句话机制说明:客户端在哪一步、依据什么条件把这些块丢掉了。**「重排 order_index 后就好了」不构成机关定位。** |
| **A-2 回归测试须先红后绿** | 新增一条常驻测试,**以「placement 的 `order_index` 不从 0 开始」(或你定位到的真因条件)构造夹具**,断言块被渲染/被纳入。**回执须给出该测试在修复前失败、修复后通过的两段输出。** |
| **A-3 数据修复与代码修复分离申报** | 若确需回填/规整存量数据,**必须与代码修复分列两节**,并说明「若只做数据修复而不改代码,同类数据再次出现时是否会复发」。 |
| **A-4 不得放宽渲染条件到掩盖问题** | 例如「凡有块就全渲染、不再校验」这类修法属**掩盖**;若你认为某校验本就该删,须按 builder 纪律 2 显式申报理由。 |

### A.3 全量存量体检(Fable 裁定采纳,**不许只修撞见的那一篇**)

- 对**全部 note** 做一次性扫描,产出「受影响清单」:哪些 note 的 placement 具备该真因条件(不限于 `order_index` 起点,以你定位到的条件为准)。
- **取证纪律:存在性问题一律全量扫描,禁止 `head`/`LIMIT` 截断后下「只有 N 个」的结论。**(这条是 `contracts/Source-Ladder-Contract.md §9.1` 的通用纪律,V12 期间已有两次栽在截断上。)
- 结果写进回执;**是否批量回填数据由回执给出建议,不在本单自行执行大批量写入** —— 若受影响 note 超过 3 篇,**停下来在回执里标 `needs: claude`**。

---

## B. 收据时钟统一(P-2,🅰 但潜伏)

### B.1 已证事实

`operation_batches.created_at` **同一列两种格式**:

| 格式 | 行数 | 对应 `source_type` |
|---|---|---|
| SQLite 空格式 `2026-08-21 17:05:19` | **103** | 全部为 `manual` |
| ISO8601 `2026-08-21T17:05:59.322Z` | **2** | 全部为 `client_note_block_create` |

空格 `0x20` < `T` `0x54` ⇒ **`ORDER BY created_at` 时所有空格式行永远排在所有 ISO 行之前,与真实时间无关**(已实测复现)。

**根因**:`server/src/db/schema.sql:391` 为 `created_at DATETIME DEFAULT CURRENT_TIMESTAMP`;多数插入点省略该列走默认,而 `server/src/services/noteBlockLifecycle.ts:207 / 455 / 926` 三处**显式把 `created_at` 列进列表并传 `new Date().toISOString()`**。

> **当前零消费点**(全仓无任何查询按 `operation_batches.created_at` 排序或范围过滤)⇒ **潜伏,不是现行故障**。修它是为了 12.2 S2 要在这张表上加 `tool`/`mcp` 来源轴 —— **否则「谁做的」与「什么时候做的」会一起坏,且坏在同一条缝上**。

### B.2 要求

| 闸 | 要求 |
|---|---|
| **B-1** | `noteBlockLifecycle.ts` 三处**不再显式传 `created_at`**,改为走 schema 默认。**逐处核对**:确认这三处之外没有别的插入点显式传该列(**全量扫描,不截断**)。 |
| **B-2** | 回填现存 **2 行** ISO 格式记录为空格式。**这是数据写入 —— 必须走 migration,不得手改 db 文件**;migration 须幂等且只命中形如 `%T%Z` 的行。 |
| **B-3** | 回执须给出**修复后的格式分布复查**(全表计数,非抽样)与一次 `ORDER BY created_at` 的时序正确性验证。 |
| **B-4** | ⚠️ **只统一 `created_at`。** `applied_at` / `reverted_at` 是否同病**请顺手全量核查并在回执报告,但不在本单修** —— 范围外的东西照实报,别顺手改。 |

---

## 边界(触及面申报)

**允许触及**:`client/` 中定位到的丢块机关及其常驻测试 · `server/src/services/noteBlockLifecycle.ts`(仅 B-1 三处)· 新增一个 migration(仅 B-2)· 相应常驻测试。

**⛔ 不得触及**:12.2 的任何面(`shared/types/toolRegistry.ts` · `scripts/check-tool-face-parity.mjs` · MCP 相关)· v1 学习规划线(calendar/decks/goals/review/statistics)· 03/05 链保护面 · `schema.sql` 既有列定义(B-2 只加 migration,不改既有 DDL)· 画布对象引擎的空间真相路径(除非丢块机关确在其中,那样须显式申报)。

**若发现真因落在申报面之外**:**停下,在回执标 `needs: claude`,不要自行扩面。**

---

## 验证与回执

### 门禁(**docs-first 顺序,这是仓库惯例**)

1. `npm run docs:check`(过期则先 `npm run docs:index` + `npm run docs:inventory`)
2. `npm run verify:v2-bn8-runtime`
3. client / server 双 `tsc --noEmit`
4. `npm run test:unit`

**回执须按此顺序逐条记结果。**(S1 的 MED-4:先跑全链跑到尾部才发现 docs 过期、再生成再重跑 —— 顺序反了。)

### 回执纪律(**逐条适用 `handoffs/README.md` Builder 侧 1–3**)

1. **回执语言不得宽于实现** —— 承重结论与装饰数字分开标注;不得把窄绿扩写成全闭合。
2. **平行机关申报** —— 新造任何承载既有机关同类职责的东西须显式申报「为什么既有正门不够」。
3. **回执写入必须 UTF-8**(Windows 下 `>>`/`Out-File` 默认编码会写成 GBK 混入)。写后自检首行非乱码。

### ⭐ 本单新增的两条(**S1 复核 FAIL 的直接教训,不是通用套话**)

- **M-1 mutation 归复核方,不归你。** 你的 self-test **只作前置自查,不作验收收据**。上一单(12.2a-1)的 MED-3 正是:builder 自选位点、自己执行、事后 mutation 改名为 RED-first ⇒ 判为装饰 receipt。**本单请如实写「self-test 覆盖了什么」,不要申报为 mutation 验证。**
- **M-2 header 不由你翻。** 完工后**保持 header 不动**,在文末追加 `## Result` 即可;`ready→done` 由调度方(Opus)翻。(上一单 MED-4 记过 header 未翻,归属已澄清为调度方。)

### 回执须含

判定 · 定位到的机关(`file:line` + 一句话机制)· A-2 的先红后绿两段输出 · A.3 全量体检清单 · B-3 格式分布复查 · B-4 范围外核查结果 · 四道门逐条收据 · 触及面实际 diff 与本节申报的差异 · 显式范围排除。

## Result

> builder: Codex · date: 2026-08-21 · **判定:BLOCKED · needs: claude**
>
> header 按 M-2 保持 `ready`。本回执不把只读定位包装成完工,也不把当前数据库分布包装成「修复后」。

### 停工理由(承重结论)

`server/src/**/*.ts` 的 `INSERT INTO operation_batches` 全量扫描(17/17,无截断)证伪了 B-1 的施工前提:显式传 `created_at` 的生产插入点是 **4 处**,不是申报面内的 3 处。

- 申报面内:`server/src/services/noteBlockLifecycle.ts:207-221 / 455-468 / 926-939`。
- 申报面外:`server/src/services/sourceProjectionMaterializer.ts:289-308`;其时间来自该文件 `:264` 的 `(options.now || new Date()).toISOString()`。

后一处不在本单允许触及面。若只改前三处,新建 source projection 仍会向同一列写 ISO8601,因此不能如实申报「新写入已统一」或「三处之外没有别的显式写入」。按本单越界硬闸,发现后停止一切生产代码、测试、migration 与数据库写入,等待 Claude 重划边界。

另有一条上游事实已经失效:`server/src/services/sourceMaterialization.ts:87-90` 已按 `operation_batches.created_at DESC, id DESC` 取最近 batch,所以不能沿用「当前零消费点」。

### A.存量丢块机关

**定位到的机关:**块在 hydration 后仍然存在,但初始 Page surface 的投影策略把它们排除了。

1. `client/src/pages/Notes/canvasEngine/hooks/useNoteCanvasDataAdapter.ts:555-572,601` 正常取得 blocks、合入持久 `blockLayouts`,再写入 state;`order_index` 只在该文件 `:520-523` 用于排序。
2. `client/src/pages/Notes/canvasEngine/hooks/useSurfaceModeController.ts:19` 把每次 mount 的初始 surface 固定为 `page`。
3. `client/src/pages/Notes/canvasEngine/hooks/useNoteCanvasLayoutModel.ts:93-96` 将 blocks 交给 surface policy 求 `visibleBlocks`。
4. **实际丢弃点**:`client/src/pages/Notes/canvasEngine/modePolicyService.ts:68-76` 在 Page mode 过滤 `isCanvasWorkspaceBlock(...)`;`client/src/pages/Notes/canvasEngine/placementService.ts:301-311` 根据持久 layout 将标本的两个 active block 判为 `canvas_workspace`。
5. `client/src/pages/Notes/canvasEngine/layers/NoteWritingSurfaceLayer.tsx:3673-3679` 只渲染 `visibleBlocks`,因此 textarea 为 0;`client/src/pages/Notes/canvasEngine/layers/DraftWritingEntryLayer.tsx:88-99` 随后显示 `Double-click to start writing`。

现有 `client/src/pages/Notes/canvasEngine/surfaceAuthorityContract.test.ts:197-263` 以同一批 live placement/几何保护其 `canvas_world + crossing/workspace` 空间真相,故不得靠重分类数据为 `formal_page` 来显示。

**`order_index` 因果判定:已证伪。** 对同一持久 layout 只把 `order_index` 从 `6` 改成 `0`,纯策略输出均为:

```text
pageVisible=[]
canvasVisible=[0017f298-fe70-44aa-8fab-e6e12e836938]
```

过滤器不读取 `order_index`;非零起点只是相关性,不是机关。

#### A-2 先红后绿收据

```text
RED: 未产生——越界硬闸在任何测试/实现写入前触发,未新增回归测试。
GREEN: 未产生——没有生产修复,现有绿测不得冒充本单 GREEN。
```

建议在边界重划后以真实 `crossing + canvas_workspace` layout(同时保留 `order_index: 6`)写常驻测试:hydration 后若 `page-visible=0 && canvas-visible>0`,仅一次选择 Canvas 初始 surface;formal-only 与 mixed note 仍以 Page 开始。该候选不删除 Page 过滤、不改空间真相,且必须按 note one-shot,不得覆盖用户之后的手动切换。**这只是建议,不是已实现机关。**

#### A.3 全量存量体检

查询直接以 `better-sqlite3` 的 `readonly:true,fileMustExist:true` 打开 `server/coincides.db`,并启用 `PRAGMA query_only=ON`;`total_changes()=0`。扫描覆盖全部 note / active placement / active paragraph projection,无 `LIMIT`:

```text
notes                         18
note_block_placements         64
active placement rows         28
notes with active blocks       7
affected notes                 1
duplicate active blockLayouts  0
```

上游的「8 篇」属于更早快照;当前含 WAL 的只读快照是 7 篇。受影响条件为「有 active block,但依客户端两条真实过滤谓词计算后 Page 可见块为 0」。完整受影响清单只有:

- `1d10fe77-495b-4458-b7a4-f3d428c568ff`(「July 8 · 跨时期价格歧视 — 完整讲稿(应用版)」):2/2 active block 被 workspace 条件过滤。
  - order 5 · block `70058a2a-12ba-47be-80eb-a0ae86c895f4` · placement `c02b2457...` · `surface=canvas_workspace` · `boundary_role=crossing` · `coordinate_space=canvas_world` · `x=414,width=760`。
  - order 6 · block `0017f298-fe70-44aa-8fab-e6e12e836938` · placement `f6cefd29...` ·正文 1791 字·同为 workspace/crossing/canvas_world · `x=14,width=760`。

对照 note `3927dd5a-...` 的 19 个 active block 没有 active blockLayout,因而采用 Page 默认布局并全部可见。另有 `7454b392-...` 的 2 个合法 canvas-object backing block 被隐藏,但仍有 1 个 Page 可见块,不属于全空受影响清单。受影响数 1,未触发 A.3 的「超过 3 篇」闸。

**代码修复与数据修复分列:**代码修复 0;生产数据修复 0。没有改 `order_index`、placement surface、DB 文件或任何既有空间真相。只改数据不能消除同类 workspace-only note 再次以 Page 启动时的复发。

### B.收据时钟全量核查

#### B-1 写入点

全量扫描到 17 个生产 INSERT:4 个显式 `created_at` 已列于停工理由;其余 13 个省略该列并走 schema 默认,位于 `routes/notes.ts:68`、`routes/projections.ts:46`、`canvasLayoutProposals.ts:455`、`compositionTemplates.ts:709`、`domainRefinementProposals.ts:469`、`learningCanvases.ts:298`、`materialMapProposals.ts:188`、`materialReconciliationProposals.ts:669,692`、`organizedNoteProposals.ts:434`、`packagePortability.ts:927`、`reconciliationSafety.ts:22`、`templateMigrationProposals.ts:369`。

B-1 改动为 0;没有把窄扫描结果写成「全仓仅三处」。

#### B-2 / B-3 数据状态

未新增或执行 migration,所以**不存在修复后格式分布**。以下是停工时的全表当前态(105/105 行,非抽样):

| 列 | 格式 / source_type | 行数 |
|---|---|---:|
| `created_at` | SQLite 空格 / `manual` | 103 |
| `created_at` | ISO8601 Z / `client_note_block_create` | 2 |

当前 `ORDER BY created_at` 的真实反例仍存在:manual `2026-08-21 17:07:37` 的词法 rank=103、时间 rank=104;较早的 client `2026-08-21T17:05:59.322Z` 反而是词法 rank=104、时间 rank=103。全表共有 1 个倒序 pair / 2 行 rank 不同。B-3 未通过,不得申报时序已修正。

#### B-4 范围外列(只报告,未修)

| 列 | 当前全表分布 | 写入路径结论 |
|---|---|---|
| `applied_at` | 104 个非空值全为 ISO8601 Z;1 个 NULL;当前倒序 0 | 17 个 INSERT 中 16 个写该列;15 个走 ISO,但 `server/src/services/learningCanvases.ts:298-300` 唯一使用 `datetime('now')`,存在尚未在当前数据中显现的双格式入口。 |
| `reverted_at` | 1 个非空值为 ISO8601 Z;104 个 NULL;当前倒序 0 | 生产写入仅 `noteBlockLifecycle.ts:926-939` INSERT 与 `:1026-1029` UPDATE,均为 ISO。 |

本单没有触及这两列。

### 四道门收据(docs-first,按执行顺序)

1. `npm.cmd run docs:check`:首次 exit 1,只报 `docs/agent-ops/INDEX.md` 过期。按工单先跑 `npm.cmd run docs:index`(写入 1 个 INDEX)与 `npm.cmd run docs:inventory`(`object-inventory.md` 无变化),再跑 `docs:check` → **exit 0**。
2. `npm.cmd run verify:v2-bn8-runtime` → **exit 0**。其中 tool-face parity PASS、client 17 files / 198 tests PASS、runtime boundary 159 checks PASS、model contract 60 groups PASS、client/server build PASS、performance smoke PASS、尾部 docs/diff/secrets PASS。此绿只说明当前树基线门禁通过,不代表本单修复完成。
3. client `npm.cmd exec tsc -- --noEmit` → **exit 0,无输出**;server 同命令 → **exit 0,无输出**。
4. `npm.cmd run test:unit` → **exit 0**,17 files / 198 tests passed。现有 suite 不含本单 A-2 回归,不得充当 RED/GREEN 收据。

PowerShell 首次把 `npm` 解析为被 execution policy 禁止的 `npm.ps1`;随后统一改用同一安装的 `npm.cmd`,项目脚本才实际执行。该入口错误不计作项目门禁失败。

### 触及面、平行机关与显式排除

**本单实际写入:**

- 本文件:UTF-8 追加本 `## Result`;header 未改。
- `docs/agent-ops/INDEX.md`:仅由工单指定的 `docs:index` 因过期生成。

**实现 diff:**0。未新造平行机关;没有需要申报「既有正门为何不够」的新职责载体。

**开工前已存在且保持隔离的 12.2 dirty 面:**`package.json`、`docs/generated/object-inventory.md`、`scripts/check-tool-face-parity.mjs`、`shared/types/toolRegistry.ts`。`docs:inventory` 明确报告现有 inventory 无变化;本单未编辑这些文件。

**显式未触及:**client 生产代码/测试 · `noteBlockLifecycle.ts` · `sourceProjectionMaterializer.ts` · server 测试 · migration · `schema.sql` · DB/WAL · 03/05 保护链 · v1 learning/calendar/decks/goals/review/statistics · MCP/12.2 面 · main。未 commit,未 push。

### needs: claude

1. 裁定是否把 `server/src/services/sourceProjectionMaterializer.ts:289-308` 加入 B-1 允许触及面;或明确接受它作为例外并收窄「统一」措辞。若目标仍是同列新写入统一,必须覆盖全部 4 个显式 `created_at` 插入点。
2. 更正本单「当前零消费点」口径,纳入 `sourceMaterialization.ts:87-90`。
3. `applied_at` 的 `learningCanvases.ts:298-300` 潜伏双格式入口应另行裁定;本单 B-4 明令不修,本回执没有借机扩面。
4. 边界重划或拆单后,再实施 A 的常驻 RED→GREEN、A 最小代码修复及 B migration;在此之前本单不具备验收条件。
