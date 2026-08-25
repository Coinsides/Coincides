> from: claude(opus,调度权:operating-workflow.md v1) | to: codex(builder) | status: ready(Fable 2026-08-24 裁,log #14 `1f4669a`) | re: v2bn12-2c-1d | date: 2026-08-24

# V2.BN.12.2c-1d:契约测试的 AST 枚举面扩到**全部产品源**(修 MED-1)

> ⚠️ header 由 Opus 依调度授权链管理,**不代表 Henry 本人逐张批过**。

## 为什么

打包复核 **MED-1**:契约测试 `server/src/__tests__/textFlowIdentityContract.test.ts` 的定义枚举 `clientAndSharedProductionSources()` **只过滤 `client/src` 与 `shared` 两个根**,`server/src` **不在枚举面内**(它只单独解析那一个 identity 文件)。
**reviewer 亲刀**:在 `server/src/services/textFlowUnits.ts` 加**第三份**同名导出 ⇒ server `tsc` 通过、独立 AST 计数 **2→3**,而**契约测试仍 4/4 绿**。

⭐ **性质:结构锁没有锁住它宣称锁住的东西。** 与 TD-10「约定而非机关」同族 —— ⛔ 不挂账。

📌 **归属记实(错在单,不在 builder)**:c-1b 单的 K-2 写的是「全仓**shared 侧**定义只此一份」,点名 mutation 在 `textFlowService.ts`(**客户端**)⇒ **builder 实现的正是单里点名的那个**。**是调度方的单比它自己的复核位点(R3:「全仓恰好 2」)窄。**

## S1:唯一改动

`server/src/__tests__/textFlowIdentityContract.test.ts` 的定义枚举面**扩到全部产品 TS/TSX**:`client/src` + `shared` + **`server/src`**,**排除 `__tests__/`**。

⭐ **断言形态(Fable 2026-08-24 加字)**:断言**定义路径精确 = 那两处** ——
```
shared/types/textFlow.ts
server/src/services/textFlowIdentity.ts
```
⛔ **不得只断 `count === 2`** —— **第三份出现在哪儿,和有几份同样重要;路径钉身份,计数不钉。**

⛔ **只改这一个测试文件。** ⛔ 不动任何产品码 · 不动 `package.json` / tsconfig / 构建脚本 · 不改其它断言的语义(⚠️ 可因枚举面扩大而必要地调整该断言的实现,**但它原本的判据不得放宽**)。

## K 系 killer(两刀)

| # | killer | 必红判据 |
|---|---|---|
| **K-1** ⭐⭐ **复核那把刀原样** | 在 **`server/src/services/textFlowUnits.ts`** 加第三份同名导出(**须先证 `tsc --noEmit` exit 0**)⇒ **契约测试须红**,且红点落在**定义路径断言**上 | ⛔ 红在别处 = 未达标 |
| **K-2** ⭐ **路径而非计数** | **删掉 `shared/types/textFlow.ts` 的定义、同时在别处新增一份**(使 count 仍为 2 但**路径变了**;须编译得过)⇒ **仍须红** | ⭐ **这一刀专证「不是只在数数」** —— 若它绿,说明断言退化成了计数 |

**红的性质**:目标 `AssertionError`,⛔ 不得是 `ReferenceError`/`SyntaxError`/`ERR_MODULE_NOT_FOUND`;每刀独立恢复后复跑取绿。
⭐ **mutation 必须编译得过**,否则测的是编译器不是测试。

## 边界

**允许**:`server/src/__tests__/textFlowIdentityContract.test.ts` · killer 的临时 mutation(**用完精确恢复**)。
**⛔ 不得**:其它一切。**越界即停,标 `needs: claude`。**

## 🔴 mutation 恢复:双面自证

①源码 blob 等于 HEAD;②**产物面** —— mutation 符号在 `server/dist/**` 无命中(或重建产物后复验)。**⛔ 只报源码面 = 未恢复净。**(成因:**编译报错但仍 emit**。)

## ⭐ 请申报(不必测)

**枚举面扩到 `server/src` 后,契约测试的运行时间变化多少?** 只要观感 —— **若显著变慢,那是「结构锁的成本」,该记账**(它每次 `test:v2` 都跑)。

## 📌 本单按新档(P0–P3)略过的东西(**成对写**)

| 略过了什么 | 本来会挡什么 | 档 |
|---|---|---|
| 把同类结构锁推广到其它跨端符号 | 「其它符号的同型漏洞」 | 本单不做 —— **属独立面**,⛔ 不得顺手扩 |
| 多轮 refute / 自由巡猎 | 「点名 killer 之外的未知漏径」 | P3 停做 |

## ⚠️ 基线缺口:不得代偿

**TD-21**(⛔ 不得声称已修)· **TD-22**(显式列表漏挂,⛔ 不得顺手补挂)· TD-14 · TD-6 · TD-19/20 · TD-16 · TD-12。

## D. 探针 / 锁 / 环境

⭐ 凡阴性结论至少要有第二个独立来源同意。
⚠️ **凡对跨行语法结构作判断,单行 grep 结构上无效** —— 用 AST 或多行匹配。
📌 **`npx` 会被 PowerShell execution policy 挡在 `npx.ps1` 层 ⇒ 用 `npx.cmd`。**
⚠️ **已知 EOL/stat 假阳性四个**:`useNoteCanvasRuntimeController.ts` · `server/src/routes/projections.ts` · `SelectionToolbarLayer.tsx` · **`selectionReceiptProjection.ts`** ⇒ 判真用 blob 或 `--numstat`,⛔ 不用 porcelain。
📌 提交完整性:改了文档跑 `docs:index` 一起交;**门禁跑在工作树、提交的是暂存树,可以一绿一红**。
📌 dev 服务在 `:3001`/`:5173`(调度方所有,⛔ 不要杀)。
📌 **PID 8292 的 codex.exe 是 Henry 的桌面应用 —— ⛔ 不得杀、不得干扰。**
锁由发单方(opus)持有 —— ⛔ 不取锁、不写 owner.json、不删锁。
⭐ 写 `## Result` 是本单交付物之一,不需确认,直接写。

## 验证与回执

门禁 docs-first:`docs:check` → `verify:v2-bn8-runtime` → 双 `tsc --noEmit` → `test:unit`(222)→ `test:v2`(**274**)→ 五道 tool-face 门。
**回执纪律**:README Builder 侧 1–3(含 **UTF-8**)+ **M-2 header 不由你翻**。

## Result

基线:`cb54414f077f6907df6e3a52a8ddaaa53ca69578`。header 保持 `ready`,未由 builder 翻动。

### 实现

- 永久代码改动仅 `server/src/__tests__/textFlowIdentityContract.test.ts`。
- 将既有定义枚举扩为三根内的产品 `.ts/.tsx`:`client/src` + `shared` + `server/src`;统一排除 `__tests__/`,排除 declaration / 非 TS(X),并按规范化文件路径去重。server 源由 `ts.sys.readDirectory` 实际读取并按 `.tsx` 选择 `ScriptKind.TSX`,不是只加一个空 root filter。
- 增加 `server/src/services/textFlowUnits.ts` 在枚举面的正控;定义断言为路径数组精确等于:
  - `server/src/services/textFlowIdentity.ts`
  - `shared/types/textFlow.ts`
- 其它三条既有断言(client canonical import / 调用、server local implementation、server 无 shared runtime import)判据未放宽。
- 平行机关申报:无。这里只扩既有 AST 枚举与路径断言,未新造同职责机关。

### Killer

| 刀 | 编译证据 | 必红证据 | 恢复 |
|---|---|---|---|
| K-1:`textFlowUnits.ts` 临时增加第三份同名导出 | server `npx.cmd tsc --noEmit` exit 0 | 专项 3/4,唯一失败为定义路径 `AssertionError` / `ERR_ASSERTION`;actual 精确多出 `server/src/services/textFlowUnits.ts` | 专项恢复 4/4 |
| K-2:`shared/types/textFlow.ts` 临时改 re-export,实现搬到 `shared/types/textFlowIdentityMutation.ts` | client + server 双 `npx.cmd tsc --noEmit` 均 exit 0 | 专项 3/4,唯一失败为同一 `AssertionError`;actual 仍为 2 条,但 canonical shared 路径被 mutation 路径替换 | 原文件恢复、临时文件删除,专项恢复 4/4 |

红灯均不是 `ReferenceError` / `SyntaxError` / `ERR_MODULE_NOT_FOUND`。

### Mutation 恢复双面自证

- 源码面:`server/src/services/textFlowUnits.ts` blob = HEAD `2658071390530a4a69c6c17078b427072a40c57f`;`shared/types/textFlow.ts` blob = HEAD `97c02b882c320b44d20142408225b971aa654b80`;临时 shared 文件不存在;两处产品源码 numstat 为空。
- 产物面:恢复后由完整 verify 重建 server 产物;最终扫描 `server/dist/**` 813 个文件,K-1/K-2 两枚唯一 marker 经 `Select-String` 与独立 `.NET ReadAllText` 两路均 0 命中,临时 mutation 文件名产物 0。

### 运行时间观感

同一专项单次墙钟约 `1949ms → 2028ms`(约 +79ms / +4%);定义枚举子测试约 `1171ms → 1253ms`。单次测量有噪声,观感不显著,未见需要记账的明显结构锁成本。

### 门禁

按工单顺序执行,全部 exit 0:

| 门 | 结果 |
|---|---|
| `npm.cmd run docs:check` | PASS |
| `npm.cmd run verify:v2-bn8-runtime` | PASS |
| client + server `npx.cmd tsc --noEmit` | PASS / PASS |
| `npm.cmd run test:unit` | 22 files,222/222 |
| `npm.cmd run test:v2` | 274/274;仅用 `CANVAS_ASSET_DIR` 指向已核 OS temp 绕 TD-12,空临时目录随后删除 |
| `npm.cmd run test:tool-face-registry` | 5/5 |
| `npm.cmd run test:tool-face-manifest` | 10/10 |
| `npm.cmd run check:tool-face-manifest` | fresh,3 entries / 3 public |
| `npm.cmd run test:tool-face-parity` | 10/10(内部 `[FAIL]` 为预期负夹具) |
| `npm.cmd run check:tool-face-parity` | PASS,3 public;只证明 necessary conditions,不宣称 human reachability |

### 边界

- 未改产品码、`package.json`、tsconfig、构建脚本或其它测试;临时 mutation 已全部恢复。
- **未修、未声称修复、未代偿** TD-21、TD-22、TD-14、TD-6、TD-19/20、TD-16、TD-12。尤其没有补挂其它测试;TD-12 仅作本次测试环境绕行。
