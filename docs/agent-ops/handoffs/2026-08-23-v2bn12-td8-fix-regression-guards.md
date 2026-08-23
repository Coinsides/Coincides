> from: claude(opus,调度权:operating-workflow.md v1) | to: codex(builder) | status: ready(Fable 裁定续打,log 08-23 #3) | re: v2bn12-td8-fix | date: 2026-08-23

# TD-8-fix:补三条回归护栏(**只写测试,不改产品代码**)

> ⚠️ header 的 `ready` 由 Opus 依调度授权链翻牌,**不代表 Henry 本人逐张批过**。

## 定位

TD-8 复核判 **FAIL(方向成立)** 0B/0H/**3M**/1L。**「方向成立」是承重的**:复核确认 **18 个生产 `operation_batches` INSERT 全部不再显式写 `created_at`**、048 幂等(首刀 2 行/次刀 0 行)、已知排序反例消失、全门绿、R6 UTC 前提实跑成立。

> **三条 MED 全是「现态对、护栏缺」** —— 代码是对的,但**改回去不会有门变红**。而 TD-8 的目的正是「把约定从口头变成机关」。**本单只补机关,一行产品代码都不改。**
>
> ⚠️ **归属澄清**:这三条**不算上一轮 builder 的**(工单只要求改实现、没要求补护栏,那是调度方写单时的漏项)。

**上游**:本工单同目录 `2026-08-23-v2bn12-td8-receipt-timestamp-cleanup.md` 的 `## Review`(**三条缺口的完整复现步骤都在那里**)。

---

## G-1:`notes.ts` / `projections.ts` 两处 INSERT 无正控

### 复核实测的漏径

`server/src/routes/notes.ts:68` 与 `server/src/routes/projections.ts:46` 各**删掉一个 `.run()` 实参**后,**完整 `server test:v2` 267 tests 仍 exit 0**。

⇒ 18 个生产 INSERT 中,**16 个有护栏、这 2 个没有**。

> 📌 **调度方已亲验**:两处分别是各自文件里的私有函数 `createOperationBatch(userId, courseId, label)`,**同名同形两份**(重复本身不在本单范围,**不要顺手合并**)。

### 要求

- 为**两条路由的成功路径**补真实 DB/HTTP 正控常驻测试,断言收据行确实写成(`source_type` / `status` / `applied_at` 为 ISO Z / `created_at` 为 SQLite 空格格式)。
- ⛔ **必红判据**:在**任一处**删掉一个 `.run()` 实参 ⇒ **对应测试须红**。
- ⛔ **不得用静态契约(SQL placeholder / `.run()` arity 检查)替代 route 正控** —— 静态契约挡不住「这条路由根本没被测过」。**若你想额外加静态契约,可以,但不能替代。**

---

## G-2:`learningCanvases:299` 的格式回退不红

### 复核实测的漏径

把该处写回 `datetime('now')`(并少传一个实参)后,**目标业务用例 exit 0、完整 267 tests 也 exit 0**。

### 要求

- 在 learning-canvas **成功写收据**的常驻测试中,**同时断言**:`created_at` 匹配 SQLite 空格格式 `^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$`、`applied_at` 匹配 ISO Z `^\d{4}-\d{2}-\d{2}T.*Z$`。
- ⛔ **必红判据**:把 `:299` 写回 `datetime('now')` ⇒ **该测试须红**。
- **两列各自的权威来源须分别验证** —— 不得只断言「两者不相等」(那是弱断言,换成任意两个不同格式都能过)。

---

## G-3:migration `048_` 无独立测试

### 复核实测的漏径

删掉 048 的 `WHERE created_at LIKE '%T%Z'` 后,一次性全表契约 exit 1(首刀/次刀均 105 行被改),**但完整 267 tests exit 0**。

### 要求

- 新增**独立 migration 测试**。**先例可循**:`server/scripts/v2Bn12LifecycleMigration.test.ts`(同仓已有 migration 测试范式,请沿用其结构,不另造)。
- **夹具**:混合 **103 个 SQLite 空格格式 + 2 个 ISO Z** 行。
- **断言四条**:①首刀 `changes = 2` ②次刀 `changes = 0`(幂等)③**非目标的 103 行保持原字节** ④排序修复(已知反例消失)。
- ⛔ **必红判据**:删掉 `WHERE` 子句 ⇒ **须红**(且应红在「非目标行被改」或「首刀 changes ≠ 2」上)。
- ⛔ **不得以生产 DB 为写目标** —— 用临时副本/`:memory:`;测试结束须清理。

---

## 三条共同的红的性质

**红必须来自「机关存在但被改坏」,不得是 `ReferenceError` / `SyntaxError` / `ERR_MODULE_NOT_FOUND`。** 施刀前后请跑 `node --check` 或 `tsc` 证明语法完好。

> ⭐ **本项目同族漏层已发生五次**(12.1.3 X3 / 12.2a-1b M4 / fix2 F3 / 及两次复验):**「测了逻辑 ≠ 测了接线」**。本单三条都要求**从生产入口触发**(真实路由/真实业务用例/真实 migration runner),**不接受只测内部 helper**。

---

## 边界(触及面申报)

**允许**:`server/src/__tests__/` 下相应测试文件(扩充)· **新增**独立 migration 测试文件(建议置于 `server/scripts/` 与既有 migration 测试同处)· `server/package.json` 测试脚本条目(如需)。

**⛔ 不得**:改**任何**产品代码 —— 尤其 `routes/notes.ts` / `routes/projections.ts` / `learningCanvases.ts` / `noteBlockLifecycle.ts` / `sourceProjectionMaterializer.ts` / `toolFaceReceipts.ts` / migration `048_` 本身 · 合并两处同名 `createOperationBatch`(重复不在本单范围)· 改 `schema.sql` · 碰 client 侧 · 碰 12.2 其余面 · 碰 v1 线 · 改 03/05 的 Slash/rollback 保护 hunk 与语义 · 手改生产 DB。

> **若某条护栏必须改产品码才写得出来(例如生产代码没有可测接缝):停手,标 `needs: claude`,在回执写明「需要什么接缝、为什么」。** 本单不以「做完」为荣,以「说准」为荣。

---

## D. 探针先过阳性对照(`adjudication §7`,含反面分则)

正面:任何阴性断言前先让同一探针看见一个已知阳性实例。
反面:**先确认探针的命中不是来自你自己刚写进去的东西**。
📌 **本环境陷阱**:`.git/index` 只读 ⇒ porcelain 对 `client/.../useNoteCanvasRuntimeController.ts` 有 stat/EOL 假阳性 `.M`,**不是改动**;判文件是否真改用 blob 哈希或 `git diff --numstat`;**管道会遮蔽退出码**;**`grep -c` 数的是行数不是出现数**(调度方在 R7 上因此把 11 写成了 7)。

## 锁纪律

**锁非你所有。** 发单方持锁是常态 —— **不要取锁、不要写 `owner.json`、不要删锁**;若你的流程里有取锁步骤且失败,**即停,不得覆盖既有 owner**。

## 验证与回执

门禁 **docs-first**:`docs:check` → `verify:v2-bn8-runtime` → client/server 双 `tsc --noEmit` → `test:unit` → server `test:v2` → 五道 tool-face 门 → 新增的 migration 测试。

**回执纪律**:`handoffs/README.md` Builder 侧 1–3(含 **UTF-8**)+ **M-1 mutation 归复核方**(self-test 只作前置自查)+ **M-2 header 不由你翻**。
**⭐ 写 `## Result` 是本单交付物之一,不需确认,直接写。**

**回执须含**:G-1/G-2/G-3 各自的**先红后绿两段输出**(**红须由本单点名的 mutation 触发**)· G-1 两条路由**各一段**(不得合并) · 产品代码 diff **必须为 0**(附阳性对照证明探针没瞎)· 门禁逐条收据 · 触及面 diff vs 申报 · 显式范围排除 · **每条阴性断言的阳性对照**。

## Result (Codex builder,2026-08-23)

### 判定与交付

**三条护栏均已补齐,无需产品接缝,不标 `needs: claude`。** 最终只改常驻测试、server 测试接线与本回执;产品代码 diff 为 0。按 M-2 **header 保持 `ready` 不翻牌**。

| Guard | 常驻入口 | 新护栏 |
|---|---|---|
| G-1 notes | `POST /api/notes/:id/blocks` 无 `client_create_key` 的真实 Express/临时 DB 成功路径 | 由返回 block 联结 `note_blocks.operation_batch_id → operation_batches`;断言 `source_type=manual`、`status=applied`、`created_at` SQLite 空格格式、`applied_at` ISO Z |
| G-1 projections | `POST /api/projections` 的真实 Express/临时 DB 成功路径 | 由返回 projection 联结 `projections.operation_batch_id → operation_batches`;同组四项断言 |
| G-2 | 既有真实业务用例 `createCanvasNoteBlock` | JS `Date` 冻结为 `2031-02-03T04:05:06.789Z`,SQLite 保持真实时钟;`created_at` 须落在调用前后 `CURRENT_TIMESTAMP` 窗口且为空格格式,`applied_at` 须等于 ISO 哨兵 |
| G-3 | 生产 `runMigrations` + `:memory:` SQLite | 103 个 SQLite 行 + 2 个 ISO Z;TEMP trigger 精确计 UPDATE;首刀 2、正常二跑不执行、重置内存 ledger 后第二刀 0;103 行以 BLOB hex 验原字节;已知排序反例前后翻正 |

没有新增与既有职责平行的生产机关:G-1 复用 `withHttpDb`/真实 routers,G-2 扩既有业务用例,G-3 复用生产 runner 与既有 `node:test + better-sqlite3 + try/finally` 范式。

### Mutation 红 → 还原绿

四把刀均只作 self-test 前置自查;每刀后立即用反向 `apply_patch` 恢复。红前后的 server `tsc --noEmit` 均 exit 0,故红不是 `ReferenceError` / `SyntaxError` / `ERR_MODULE_NOT_FOUND`。

#### G-1a — `routes/notes.ts`

mutation: `.run(id, userId, courseId, label, now)` → 少传 `now`。

```text
server tsc --noEmit: exit 0
manual note block HTTP route ...: exit 1
RangeError: Too few parameter values were provided
assertion: 500 !== 201

restore 后同一测试: exit 0; tests 1 / pass 1 / fail 0
```

#### G-1b — `routes/projections.ts`

mutation: `.run(id, userId, courseId, label, now)` → 少传 `now`。

```text
server tsc --noEmit: exit 0
projection HTTP route ...: exit 1
RangeError: Too few parameter values were provided
assertion: 500 !== 201

restore 后同一测试: exit 0; tests 1 / pass 1 / fail 0
```

两条分别从真实 HTTP route 到临时 SQLite,不是 SQL placeholder / arity 静态契约,也没有导出或直接测试私有 helper。

#### G-2 — `learningCanvases.ts:299`

mutation: `applied_at` 写回 `datetime('now')`,并少传应用侧 `now`。

```text
server tsc --noEmit: exit 0
learning canvas block insertion ...: exit 1
expected applied_at: ISO Z / frozen JS sentinel
actual applied_at: '2026-08-23 05:38:50'

restore 后同一测试: exit 0; tests 1 / pass 1 / fail 0
```

该红直接落在 `applied_at` 权威来源;同时 `created_at` 独立验 SQLite 格式与 DB 时钟窗口,不是只断言两列“不相等”。

#### G-3 — migration `048_`

mutation: 删除 `WHERE created_at LIKE '%T%Z'`。

```text
server tsc --noEmit: exit 0
focused migration test: exit 1
actual audited UPDATEs 105 !== expected 2

restore 后 focused test: exit 0; tests 1 / pass 1 / fail 0
```

主门接线也作了同刀对照:默认资产环境的完整 `server test:v2` 从还原态 `265/270`(TD-12 的 5 个既有环境失败)变为 mutation 态 `264/270`;新增的唯一增量失败正是 G-3 `105 !== 2`。因此新测试不是 focused-only。还原后在隔离资产目录完整门为 **270/270**。

### G-3 四条断言与阳性对照

- 夹具严格为 105 行:103 个 19-byte SQLite 空格时间 + 2 个 ISO Z。
- trigger 阳性对照:先对已知 manual 行执行一次 no-op `UPDATE created_at = created_at`,audit 命中 1,随后清零再测 migration;证明探针能看见同值 UPDATE。
- 首次生产 runner:`applied=1`,`firstChanges=2`。
- 正常第二次 runner:`applied=0`,audit 无新增;仅删除**内存 DB** 的 048 ledger 后重跑同一 runner:`applied=1`,`secondChanges=0`。
- 非目标 103 行以 `hex(CAST(created_at AS BLOB))` 前后 `deepEqual`,不是只比解析后的时间值。
- 已知 pair 阳性:迁移前词法顺序为 `manual 17:07:37 → client 17:05:59.322Z`(反例存在);迁移后为 `client → manual`(反例消失)。
- DB 固定为 `new Database(':memory:')`,未向生产 DB、生产 DB 副本或仓内 DB 文件写入;`finally` 关闭连接。

### 全门收据(docs-first)

| 顺序 | 门 | 结果 |
|---:|---|---|
| 1 | `npm.cmd run docs:check` | exit 0;`docs/generated/object-inventory.md` 最新 |
| 2 | `npm.cmd run verify:v2-bn8-runtime` | exit 0;含 client 209 tests、build/smoke/docs/secret scan 全链 |
| 3a | client `tsc --noEmit` | exit 0 |
| 3b | server `tsc --noEmit` | exit 0 |
| 4 | `npm.cmd run test:unit` | exit 0;19 files / 209 tests |
| 5a | server `test:v2`,默认资产目录 | exit 1;265/270,复现已登记 TD-12 的 5 个环境失败 |
| 5b | server `test:v2`,独立 `CANVAS_ASSET_DIR` + `SOURCE_BLOB_DIR` | exit 0;**270/270**,约 11.7s;临时目录经绝对路径/前缀校验后删除,无残留 |
| 6.1 | `test:tool-face-registry` | exit 0;3/3 |
| 6.2 | `test:tool-face-manifest` | exit 0;6/6 |
| 6.3 | `check:tool-face-manifest` | exit 0;1 条 public,产物未过期 |
| 6.4 | `test:tool-face-parity` | exit 0;10/10 |
| 6.5 | `check:tool-face-parity` | exit 0;1 public entry checked |
| 7 | `npm.cmd run test:v2-bn12-migration` | exit 0;6/6(既有 5 + 新 048 runner 1) |

PowerShell 直接调用 `npm` 会被 execution policy 拦截,故正式收据一律使用 `npm.cmd`;没有把该 setup false-red 记作测试红。管道型日志命令均先保存 `$LASTEXITCODE` 再截尾,未用截尾命令的退出码冒充被测门。

### 差分、阳性探针与范围

最终实现触及面:

- `server/src/__tests__/v2NoteBlockLifecycle.test.ts`:挂真实 projection router,新增两条独立 HTTP/DB 正控;
- `server/src/__tests__/v2MaterialLibrary.test.ts`:加强既有 learning-canvas 成功用例;
- `server/scripts/v2OperationBatchTimestampMigration.test.ts`:新增独立 048 runner 测试;
- `server/package.json`:把新测试接入既有 `test:v2-bn12-migration` 与完整 `test:v2`;
- 本工单追加本 `## Result`。

产品零改动探针先过非自写阳性:同一 `git diff --numstat` 对历史 `ee4edec..81198f1` 的 `learningCanvases.ts` 命中 `3/2`;随后对当前全部点名产品位点(notes/projections/learningCanvases/048/noteBlockLifecycle/sourceProjectionMaterializer/toolFaceReceipts/schema)结果为空。`git diff --quiet` 对题示 client EOL/stat 假阳性路径 exit 0。四个 mutation 产品文件最终 Git 内容 diff 均为 0。

显式排除:未改任何产品语义、048 migration 本体或 schema;未碰 client、v1、03/05 Slash/rollback hunk、其他 12.2 面、生产 DB、main;未取锁、未写/删 `owner.json`、未改 header;未 commit、未 push、未 PR/merge。

补充 stat/EOL 收据:mutation 自查触碰过 `routes/notes.ts` 与 `routes/projections.ts` 的工作树时间/EOL 状态,只读 index 下 porcelain 最终将两者显示为 `.M`;但两文件逐个 `git diff --quiet` 均 exit 0、`git diff --numstat` 均为空,且 filtered blob hash 分别与 HEAD 完全相同(`22797422...` / `561902a4...`)。因此这是与题示 client 路径同性质的 stat/EOL 假阳性,不是产品内容改动。
