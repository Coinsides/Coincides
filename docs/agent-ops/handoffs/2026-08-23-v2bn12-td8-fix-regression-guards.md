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

## Review

- **Reviewer**:Codex reviewer(洁净室复核)
- **日期**:2026-08-23
- **判定**:**PASS — 0 BLOCKER / 0 HIGH / 0 MEDIUM / 0 LOW**
- **实现基线**:`32d929e`(`32d929ece5a707031e522cbb14b3a94aa4d33e4a`)
- **修正前基线**:`e769f97`

### 增量协议与结论

按 reviewer charter 5-7,本轮以 TD-8 主单 `## Review` 的 R1–R7 为已验基线,只重新承重 F-1/F-2/F-3、`e769f97..32d929e` 差分面、全门,以及 5-2 的跨条合取。F-4 是上一轮 LOW 的收据数字/措辞问题,不属于本修正单三条 MEDIUM 的修正目标,本轮未把它包装成重新裁定项。

结论:F-1/F-2/F-3 均已封住。builder `## Result` 只用作位点导航;以下因果判定全部来自 reviewer 在 exact commit 上的静态核对、常驻正控、逐点 mutation 和全门亲跑。

### S1–S5 点名 mutation

所有刀均在 `$TMPDIR` 的独立 detached clone 中施加。每刀先确认 mutant 的 server `tsc --noEmit` exit 0,再看承重测试因正确理由变红,随后用反向 patch 恢复并让同一测试回绿。notes 与 projections 两个同形位点分别施刀,未抽样。

| 位点 | mutation 与承重测试 | RED 收据 | 恢复收据 |
|---|---|---|---|
| S1 `server/src/routes/notes.ts:68` | `INSERT ... .run()` 少传末尾 `now`;单跑 notes 真实 Express/临时 DB 正控 | `tsc` exit 0;测试 exit 1;`v2NoteBlockLifecycle.test.ts:112` 红在 HTTP status,actual `500`,expected `201`;`RangeError: Too few parameter values` 被 error middleware 转成 500,进程未崩溃 | 反向 patch 后同一测试 exit 0,1/1 |
| S2 `server/src/routes/projections.ts:46` | 同形 `.run()` 少传末尾 `now`;单跑 projections 正控 | `tsc` exit 0;测试 exit 1;同文件 `:141` 红在 HTTP status,actual `500`,expected `201`;同为受控 500 | 恢复后 exit 0,1/1 |
| S3 `server/src/services/learningCanvases.ts:299` | 把 `applied_at` 写回 `datetime('now')`,并少传对应应用时钟实参 | `tsc` exit 0;测试 exit 1;`v2MaterialLibrary.test.ts:2139` 红在 `applied_at` ISO 哨兵格式,actual `2026-08-23 06:45:09` 不匹配 ISO-Z regex;不是无关业务断言 | 恢复后 exit 0,1/1 |
| S4 `server/src/db/migrations/048_normalize_operation_batch_timestamps.ts` | 删除 `WHERE created_at LIKE '%T%Z'` | `tsc` exit 0;测试 exit 1;`v2OperationBatchTimestampMigration.test.ts:99` 首刀审计计数 actual `105`,expected `2` | 恢复后 exit 0,1/1 |
| S5 同一 048 位点 | 令谓词在重武装后再次命中两个目标行,保留首刀 2 但破坏幂等 | `tsc` exit 0;测试 exit 1;同文件 `:126` 次刀计数 actual `2`,expected `0` | 恢复后 exit 0,1/1 |

施刀前常驻正控分别为 G-1 `2/2`、G-2 `1/1`、G-3 `1/1`,均 exit 0。G-1 两条测试挂真实 router/error middleware,实际 POST 后联结 `operation_batches`,检查 `source_type`、`status` 及两种时间格式;G-2 同时检查 SQLite 空格格式的 `created_at`/DB 时钟窗口和冻结 ISO-Z 哨兵的 `applied_at`;G-3 从生产 `runMigrations` 入口运行严格 `103 + 2` 夹具,并承重首刀 2、次刀 0、103 行原字节不变及排序反例消失。

全部施刀结束后,四个被改产品文件的 filtered hash 均与 `32d929e` HEAD 相同,`git diff --numstat` 为空、`git diff --quiet` exit 0、`git diff --check` exit 0。隔离 clone 的 porcelain 曾只显示 `routes/notes.ts` `.M`,但其 numstat 为空且 blob hash 相同,判为 clone 内 EOL/stat 假阳性,不冒充内容差分。

### S6 隔离性评估

- **Date 冻结不泄漏**:G-2 没有手写 `try/finally` reset,但 mock 归属于 Node `TestContext` 的 `t.mock`,会在用例结束时自动恢复。Reviewer 在同机 Node `v22.22.1` 做了“冻结后故意失败(TODO)→紧邻 sibling 检查”探针;后一个 sibling 通过且看不到哨兵,总命令 exit 0。目标文件未启用并发用例,完整 `v2MaterialLibrary`/`test:v2` 也通过,故不构成泄漏 finding。
- **TEMP trigger 只计目标表/列**:触发器是 `AFTER UPDATE OF created_at ON operation_batches`。同一计数探针先由目标表 no-op UPDATE 写入 1 条 audit 阳性,再更新无关表得到 0;因此不会把其他表 UPDATE 混入。G-3 常驻测试也在阴性判断前用目标表 no-op UPDATE 证明 trigger 可见。

### 差分与产品码零改动

`git diff --numstat e769f97..32d929e` 完整输出:

```text
122  0  docs/agent-ops/handoffs/2026-08-23-v2bn12-td8-fix-regression-guards.md
2    2  server/package.json
130  0  server/scripts/v2OperationBatchTimestampMigration.test.ts
24   1  server/src/__tests__/v2MaterialLibrary.test.ts
59   0  server/src/__tests__/v2NoteBlockLifecycle.test.ts
```

第一行是本修正单自身及 builder `## Result` 收据;除该必需工单收据外,代码差分面仅三个测试文件与 `server/package.json` 测试接线。对 `client/src server/src` 排除 `server/src/__tests__/**` 后,同一 numstat 探针输出为空,`git diff --quiet` exit 0,故**产品码 numstat = 0**;`git diff --check` exit 0。没有任何 `server/src` 非 `__tests__` 产品文件进入本轮实现差分。

反面分则的非自写阳性如下:

- 产品零差分前,同一 `git diff --numstat` 探针先在历史 TD-8 实现范围 `ee4edec..81198f1` 的 `learningCanvases.ts` 命中 `3/2`;该阳性来自既有实现 commit,不是 reviewer mutation。
- reparse 阴性前,同一属性探针先在系统维护的 `C:\Users\70208\AppData\Local\Application Data` 看见 `ReparsePoint`,再对隔离 clone 得到 0;该阳性由系统目录写入。
- trigger 范围阴性前,同一 audit 计数器先见目标表 UPDATE 产生的 1;字符串/行由已提交测试夹具触发 TEMP trigger 写入,不是 S4/S5 mutation 伪造。
- 清理阴性前,同一路径探针先确认 clone `exists=True` 且 HEAD 为 `32d929e`,删除后才记 `exists_after=False`。

### docs-first 全门

| 顺序 | 门/命令 | Reviewer 结果 |
|---:|---|---|
| 1 | root `npm.cmd run docs:check` | exit 0 |
| 2a | root `npm.cmd run verify:v2-bn8-runtime`,原始长 `$TMPDIR` 路径 | exit 1;Vite/esbuild 向父路径做 realpath 时 `Access is denied`,发生在测试装载前,记为 setup false-red,不冒充门通过 |
| 2b | 同一 clone 映射临时盘符后重跑 `verify:v2-bn8-runtime` | exit 0;完整 runtime/tool-face/build/docs/diff/secret 门通过 |
| 3a | client `.\node_modules\.bin\tsc.cmd --noEmit` | exit 0 |
| 3b | server `.\node_modules\.bin\tsc.cmd --noEmit` | exit 0 |
| 4 | root `npm.cmd run test:unit` | exit 0;19 files / 209 tests |
| 5a | server `npm.cmd run test:v2`,默认资产目录 | exit 0;270/270,约 12.3s;TD-12 所记/本单 builder 复现的 5 个 EPERM 本机本轮未复现 |
| 5b | server `test:v2`,在进程启动前注入两个独立绝对资产目录 | exit 0;270/270,约 12.6s |
| 6.1 | root `npm.cmd run test:tool-face-registry` | exit 0;3/3 |
| 6.2 | root `npm.cmd run test:tool-face-manifest` | exit 0;6/6 |
| 6.3 | root `npm.cmd run check:tool-face-manifest` | exit 0;1 public entry |
| 6.4 | root `npm.cmd run test:tool-face-parity` | exit 0;10/10 |
| 6.5 | root `npm.cmd run check:tool-face-parity` | exit 0;1 public entry |
| 7 | server `npm.cmd run test:v2-bn12-migration` | exit 0;6/6(既有 5 + 新增 1) |
| 8 | server `node --import tsx --test scripts/v2OperationBatchTimestampMigration.test.ts` | exit 0;1/1 |

2b 只在可抛弃 clone 的 ignored `client/node_modules/vite/...` 中暂时关闭 native realpath,以绕过沙箱父路径拒绝;文件随后恢复到原 SHA-256 `BFA94186DAFF535FEFDF286088C1588FAD6B02C01EF11CD3B42A6CB3E4C90767`,没有改源码或常驻测试。临时 `subst R:` 在门后删除。5a 是按要求保留的默认目录对照:本轮默认门通过说明 TD-12 环境故障未复现,不推翻其环境债登记;5b 仍以隔离资产目录独立通过。

### 5-2 跨条与 5-10 同形覆盖

主单 R1 旧结论为 16/18。承载 18 个 production INSERT 的 15 个源文件在 `81198f1` 与 `32d929e` 逐 blob 核对为 15/15 SAME,所以旧 16 处指纹未漂移;本轮再以 S1 notes 与 S2 projections 两处各自的正确 RED 补齐剩余 2 处,结论为 **18/18**。这是逐处覆盖,不是从两个同形位点抽样一个。

接线也不是 focused-only:G-1/G-2 所在常驻测试文件已被完整 server `test:v2` 执行;G-3 新脚本同时接入 `test:v2-bn12-migration` 与完整 `test:v2`,并在本轮 270/270 和 6/6 中实际执行。三条 guard 的合取状态与单跑结果一致。

### 5-1 完备性、范围排除与边界

已取证项:charter 全条款、主单 Review R1–R7、修正单全文/Result、exact baseline 与 pre-fix 差分、测试接线、三条常驻正控、S1–S5 全部点名 mutation、S6 两项隔离探针、18/18 指纹/逐点合取、docs-first 全门、默认与隔离资产对照、清理前后路径及共享树阴性。没有用 builder 自测替代 reviewer 因果证据。

显式范围排除:

- R1–R7 中与 F-1/F-2/F-3 和 5-2 无关的既有因果链按增量协议继承,没有无谓重演;F-4 未重裁。
- 未做 UI/browser/manual journey:本单只写后端/迁移回归测试,产品码为零,UI 路径不承载本轮判定。
- 未碰生产 DB 或 live deployment:全部 DB 证据来自临时文件/内存夹具,已经走真实 Express、生产 migration runner 与完整测试门;生产资产既不必要也在边界外。
- 未扩审 v1、未点名的 12.2 产品行为、主观产品验收或发布状态;这些不承载“回归 guard 是否封口”的判定。

Reviewer 未改产品代码、常驻测试、schema、048 本体或 client;未碰 main、handoff header、`.codex-tmp/builder.lock.d` 或生产 DB;未 commit、push、PR/merge。共享树唯一新增内容是 UTF-8 追加本 `## Review`;题示三处既有 porcelain `.M` 在开工前已经存在且 numstat 为空,未被当成 reviewer 改动。

### 5-9 隔离树自清收据

原生 `git worktree add` 因共享 `.git/worktrees` 只读而在创建前 exit 128,未留下 worktree 注册或目标目录;随后按 charter fallback 使用独立 clone:

- 路径:`C:\Users\70208\AppData\Local\Temp\coincides-td8-fix-review-1787467246410-9192eeb0`;
- detached HEAD:`32d929ece5a707031e522cbb14b3a94aa4d33e4a`;
- client/server 均执行独立 `npm.cmd ci --offline`;安装前后递归 reparse count 都为 0,未建 junction/symlink,未共享 `node_modules`;
- 每刀均反向 patch;最终 filtered 内容 diff 为零。临时 Vite dependency shim 恢复原 hash,所有 `subst` 映射已删;
- 隔离资产目录 `...td8-fix-assets-1787467824106-9a5906` 与 `...td8-fix-source-1787467824106-9a5906` 均先确认空目录后删除,`exists_after=False`;
- clone 首次递归删除被只读 Git pack 拒绝,当时探针仍为 `exists=True`,未误记完成;仅在复验绝对路径、`$TMPDIR` 前缀及 reparse count 0 后清除该 clone 内只读属性并重试。最终 clone `exists_after=False`,`coincides-td8-fix-review-*` 残留数 0;
- 共享 client/server `node_modules` 顶层计数删除前后保持 153/183,共享树未被隔离清理触及。

因此隔离树、临时资产和映射均已自清,无 junction,无常驻 mutation 残留。
