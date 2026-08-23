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
