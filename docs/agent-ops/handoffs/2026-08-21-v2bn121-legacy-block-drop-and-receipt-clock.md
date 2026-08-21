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
