> from: claude(opus,调度权:operating-workflow.md v1) | to: codex(builder) | status: ready(Fable 裁定 log 08-22 #14;**Spark 样本单**) | re: v2bn12-td8-cleanup | date: 2026-08-23

# TD-8 清债:收据表时间戳统一(**位点拍死,零裁量**)

> ⚠️ header 的 `ready` 由 Opus 依调度授权链翻牌,**不代表 Henry 本人逐张批过**。
> ⚠️ **本单是 Spark 实测样本**:选它当样本正因**位点全部拍死、无设计裁量**。**若你发现任何需要判断「改哪里」的地方,那就是本单写漏了 —— 停手标 `needs: claude`,不要自行决定。**

## 定位

TD-8 登记的债:`operation_batches` 的时间戳靠「每列单一格式」约定维持而非机关保证。**12.2a-2 落地后,该表上已同时住着「新写路径不传 `created_at`」(`toolFaceReceipts`)与「旧写路径显式传」两套** —— 混格式从潜伏变成有活跃双方。本单清掉旧的一侧。

**约定(Fable 重裁 (b),已收窄)**:**每列单一格式** —— `created_at` = **DB 默认**;`applied_at`/`reverted_at` = **应用侧 ISO**。**「单一 helper」已撤回**(TD-8 另记),**本单不做 helper 收敛,回执不得声称**。

---

## A. 四处停传 `created_at`(**已由调度方逐处亲验,2026-08-23**)

| # | 文件 | 行 | 现状 |
|---|---|---:|---|
| A-1 | `server/src/services/noteBlockLifecycle.ts` | **:209** | INSERT 列表含 `metadata, created_at, applied_at` |
| A-2 | 同上 | **:477** | 同形 |
| A-3 | 同上 | **:948** | `metadata, created_at, reverted_at` |
| A-4 | `server/src/services/sourceProjectionMaterializer.ts` | **:291** | `created_at, applied_at` |

**改法**:从 INSERT 列名中移除 `created_at`,**并同步移除其绑定值**,走 schema 默认(`CURRENT_TIMESTAMP`)。

### ⛔ A 段两个陷阱(**调度方亲验后写死**)

| 陷阱 | 说明 |
|---|---|
| **⭐ 同文件的 `created_at` 多数不属本表** | `sourceProjectionMaterializer.ts` 共 **8 处** `created_at`,**只有 `:291` 属 `operation_batches`**;`noteBlockLifecycle.ts` 亦然,**只有 `:209/:477/:948` 属本表**。**每处改动前先确认该 INSERT 的目标表是 `operation_batches`。** |
| **列表与值列表须同步** | 这些 INSERT 是多行形式、列名与占位符分处两段。移除列名而漏掉对应值(或反之)会造成**静默错位** —— 后续列的值全部前移一位,**`tsc` 不会报错**。**逐处核对列数 == 值数。** |

**改后全量复扫**确认 `operation_batches` 的 INSERT 中已无显式 `created_at`。**⚠️ 复扫须先过阳性对照**:先证明扫描命令能看见上表这 4 处(改前),再断言改后为 0。

---

## B. `learningCanvases.ts:299` 的 `applied_at` 改 ISO

现状:`VALUES (?, ?, ?, 'manual', ?, 'applied', datetime('now'))` —— 全仓唯一用 `datetime('now')` 写 `operation_batches.applied_at` 的地方,其余 15 处走应用侧 ISO。

**改法**:改为应用侧 ISO(`new Date().toISOString()`),与其余 15 处一致。

### ⛔ B 段陷阱(**最容易砸的地方**)

> **`learningCanvases.ts` 共有 11 处 `datetime('now')`**(`:184 / :241 / :299 / :353 / :498 / :513 / :594 / :609 / :692 / :815 / :821`),**只有 `:299` 写 `operation_batches`,其余全是别的表**(canvas/placement/mount 等的 `created_at`/`updated_at`)。
>
> **⛔ 只改 `:299` 一处。全局替换 `datetime('now')` 会砸掉一堆无关的表。**

---

## C. 幂等 migration 回填

**现存 2 行** ISO 格式 `created_at`(调度方亲验:ISO 2 / 空格式 103 / 总计 105),回填为空格式。

- **新增 migration**:现有最后一个是 `047_v2_item_relation_floor.ts` ⇒ **本单用 `048_`**。
- **幂等**:只命中 `created_at LIKE '%T%Z'`;重复执行不产生额外变更。
- 转换式:`substr(replace(created_at,'T',' '),1,19)`。
- **⛔ 不得手改 db 文件、不得直接跑 SQL 改生产库** —— 必须走 migration。

### ⭐ C 段前提(**调度方 2026-08-22 亲验,但请你独立复核后再执行**)

**两种格式同为 UTC,秒级一致** —— 实测 `SELECT CURRENT_TIMESTAMP` 与同刻 `new Date().toISOString()` 均为 `18:03:14`(本地为 14:03,UTC-4)。

> **若该前提不成立(一个本地一个 UTC),回填会把那 2 行静默平移 4 小时。** 请在执行 migration 前**独立复核该前提并在回执给出你的验证输出**;**前提不成立就停手标 `needs: claude`,不要按上面的转换式硬跑。**

---

## D. 全表格式分布复查

修复后给出**全表**(105 行,非抽样)的 `created_at` 格式分布,以及一次 `ORDER BY created_at` 的时序正确性验证。

**已知反例须消失**:`manual 2026-08-21 17:07:37`(词法 rank=103/时间 rank=104)与较早的 `client 2026-08-21T17:05:59.322Z`(词法 rank=104/时间 rank=103)。

---

## 边界(触及面申报)

**允许**:`server/src/services/noteBlockLifecycle.ts`(**仅 A-1/A-2/A-3 三处**)· `server/src/services/sourceProjectionMaterializer.ts`(**仅 A-4 一处**)· `server/src/services/learningCanvases.ts`(**仅 B 的 `:299` 一处**)· **新增一个 `048_` migration** · 相应常驻测试。

**⛔ 不得**:碰上述文件中**不属于 `operation_batches`** 的任何 `created_at` / `datetime('now')` · 做 helper 收敛(TD-8 另记,本单不做也不得声称)· 改 `schema.sql` 既有 DDL · 碰 `toolFaceReceipts.ts`(12.2a-2 已闭环)· 碰 client 侧 · 碰 12.2 其余面 · 碰 v1 线 · 改 03/05 的 Slash/rollback 保护 hunk 与语义(`noteBlockLifecycle` 属 05 关联面,须逐 hunk 申报)· 手改 DB。

**越界即停,标 `needs: claude`,不自行扩面。**

---

## D. 探针先过阳性对照(`adjudication §7`,含反面分则)

正面:任何阴性断言前先让同一探针看见一个已知阳性实例。
反面:**先确认探针的命中不是来自你自己刚写进去的东西**。
📌 **本环境陷阱**:`.git/index` 只读 ⇒ `git status` porcelain 对 `client/.../useNoteCanvasRuntimeController.ts` 有 stat/EOL 假阳性 `.M`,**不是改动**;判文件是否真改用 blob 哈希或 `git diff --numstat`;**管道会遮蔽退出码**(`cmd | tail; echo $?` 取到的是 `tail` 的)。
📌 **提交侧**:若新增文档须先跑 `docs:index`;改 `package.json` 须跑 `docs:inventory`。

## 锁纪律

**锁非你所有。** 发单方持锁是常态 —— **不要取锁,不要写 `owner.json`,不要删锁**。若你的流程里有取锁步骤且失败,**即停,不得覆盖既有 owner**。

## 验证与回执

门禁 **docs-first**:`docs:check` → `verify:v2-bn8-runtime` → client/server 双 `tsc --noEmit` → `test:unit` → server `test:v2` → 五道 tool-face 门。

**回执纪律**:`handoffs/README.md` Builder 侧 1–3(含 **UTF-8**)+ **M-1 mutation 归复核方**(self-test 只作前置自查)+ **M-2 header 不由你翻**。

**回执须含**:A 段四处改动**逐处标明所属目标表**(证明未误伤同文件其他表)· 列数==值数的逐处核对 · 改前/改后扫描的**阳性对照** · B 段只改 `:299` 的证明(其余 10 处 `datetime('now')` 未动)· **C 段 UTC 前提的独立复核输出** · migration 幂等性验证 · D 段全表分布与时序验证(已知反例须消失)· 门禁逐条收据 · 触及面 diff vs 申报 · 显式范围排除 · **每条阴性断言的阳性对照**。

**Spark 读表**:若以 Spark 档位施工,回执附**单前/单后周额百分比**;**CLI 若取不到该读数,如实写「不可取得,需 Henry 从 UI 提供」,不得编造**。
