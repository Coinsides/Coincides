> from: claude(opus,调度权:operating-workflow.md v1) | to: codex(builder) | status: ready(Fable 2026-08-24 裁 (B)) | re: v2bn12-2c-1c | date: 2026-08-24

# V2.BN.12.2c-1c:把跨端契约测试**接进门**(一行接线)

> ⚠️ header 由 Opus 依调度授权链管理,**不代表 Henry 本人逐张批过**。

## 为什么有这一单

c-1b v3 交付的 `server/src/__tests__/textFlowIdentityContract.test.ts` 是 A1′ 的**执行点** —— 跨端全等**全靠它**。
🔴 **但它没有接进任何门**:任何 npm script 零引用,`test:v2`(显式文件列表)不含它,全仓 json/mjs/yml 零命中。⇒ **它此刻不会被自动跑。**

⚠️ **成因是 c-1b 单自相矛盾**(要求「常驻」却禁止改构建脚本),**不是 builder 的错** —— 他交付未接线的测试并**明白申报**,处置正确。

⭐ **本单的意义(裁定原话)**:**锁在被保护对象开工之后才生效,等于这一段没锁。** c-2 正是第一个依赖 `textFlowIdentity.ts` 的单,**必须在它开工前把锁通电**。
📌 而这个缺口的形态就是今天反复出现的那条:**测试在(形状),没人跑(能力)。** ⚠️ **一个绿的、写得很好的、没人跑的契约测试,和一个不存在的契约测试,在 CI 里是同一回事。**

## S1:唯一改动

`server/package.json` 的 **`test:v2` 显式文件列表 +1**,加入 `src/__tests__/textFlowIdentityContract.test.ts`。

⛔ **写死:只改这一行,只加这一个文件名。**
⛔ 不新增 script · 不改其它门 · 不改 `verify:v2-bn8-runtime` · 不动任何产品码 · 不改 tsconfig · 不改测试内容。
📌 **选 `test:v2` 是因为它已在所有门禁链里 ⇒ 零新机关。**

## K 系 killer(**两刀;⭐ 刀二是灵魂**)

| # | killer | 必红/必显判据 |
|---|---|---|
| **K-1** ⭐ **数字证明它真的在跑** | 接线后 `test:v2` 计数 **270 → 274**(契约专项 4 条)。⭐ **必须贴出前后两个数字**;若运行器能逐文件列出,**一并贴出该文件行** | ⛔ 「跑绿了」四个字不算证据 —— **计数不动 = 它没被跑** |
| **K-2** ⭐⭐ **接线承重(本单灵魂)** | **改 server 侧拼法为 `` `tf-${blockId}` ``,然后跑 `test:v2`(⛔ 不是单跑那个文件)⇒ 须红** | ⭐ **必须穿过接好的门取红。** 单跑那个文件红,只证明测试本身有牙,**证明不了门把它跑到了** —— 那会把「测试没人跑」升级成「接线没生效」,**同一形状高一层** |

**红的性质**:目标 `AssertionError`(两侧不等),⛔ 不得是 `ReferenceError`/`SyntaxError`/`ERR_MODULE_NOT_FOUND`;**mutation 必须编译得过**(先跑 `tsc --noEmit` 证明),施刀后按 hash 精确恢复并复跑取绿。

## 边界

**允许**:`server/package.json` 的 `test:v2` 那一行(**仅 +1 个文件名**)· K-2 的临时 mutation(**用完精确恢复**)。
**⛔ 不得**:其它一切。
**越界即停,标 `needs: claude`。**

## 🔴 mutation 恢复:**双面自证**

①源码 blob 等于 HEAD(`server/src/services/textFlowIdentity.ts`);②**产物面** —— `tf-${blockId}` 在 `server/dist/**` 无命中(或重建产物后复验)。**⛔ 只报源码面 = 未恢复净。**
📌 成因:**编译报错但仍 emit**。

## ⭐ 请申报(不必测)

**`test:v2` 是显式文件列表 ⇒ 将来新增的测试文件默认不被跑。** 你认为这是**有意设计**还是**长期风险**?**只要观感。**
📌(⚠️ 这正是本单缺口的制度化成因 —— 若是风险,该记 TD 而不是每次靠人记得加。)

## 📌 本单按新档(P0–P3)略过的东西(**成对写**)

| 略过了什么 | 本来会挡什么 | 档 |
|---|---|---|
| **全量扫描 `test:v2` 是否漏挂了其它既有测试文件** | 「同类漏挂的存量」 | 本单不做 —— **属独立面**;⛔ 不得顺手补挂,那会让本单的 274 计数失去可解释性 |
| 多轮 refute / 自由巡猎 | 「点名 killer 之外的未知漏径」 | P3 停做 |

## ⚠️ 基线缺口:不得代偿

**TD-21**(⛔ 不得声称已修:产物世界 `@shared/*` 仍解析不了;**契约锁只在 tests 世界成立,dev 与产物世界仍无人守全等**)· TD-14 · TD-6 · TD-19/20 · TD-16 · TD-12(`test:v2` 用 `CANVAS_ASSET_DIR` 指向 OS temp 绕开 EPERM,⛔ 不得改测试或产品语义代偿)。

## D. 探针 / 锁 / 环境

⭐ 凡阴性结论至少要有第二个独立来源同意。
⚠️ **凡对跨行语法结构(import / SQL / 多行调用)作判断,单行 grep 结构上无效** —— 用 AST 或多行匹配;**它的失败形态是 0 命中,与「真的没有」输出完全相同。**
📌 **`npx` 会被 PowerShell execution policy 挡在 `npx.ps1` 层 ⇒ 用 `npx.cmd`。**
⚠️ **已知 EOL 假阳性三个**:`useNoteCanvasRuntimeController.ts` / `server/src/routes/projections.ts` / `SelectionToolbarLayer.tsx` ⇒ 判真用 blob 哈希或 `--numstat`,⛔ 不用 porcelain。
📌 提交完整性:改了文档跑 `docs:index` 一起交;**门禁跑在工作树、提交的是暂存树,可以一绿一红**。
📌 dev 服务在 `:3001`/`:5173`(调度方所有,⛔ 不要杀)。
📌 **PID 8292 的 codex.exe 是 Henry 的桌面应用 —— ⛔ 不得杀、不得干扰。**
锁由发单方(opus)持有 —— ⛔ 不取锁、不写 owner.json、不删锁。
⭐ 写 `## Result` 是本单交付物之一,不需确认,直接写。

## 验证与回执

门禁 docs-first:`docs:check` → `verify:v2-bn8-runtime` → 双 `tsc --noEmit` → `test:unit`(基线 222)→ `test:v2`(**须 274**)→ 五道 tool-face 门。
**回执纪律**:README Builder 侧 1–3(含 **UTF-8**)+ **M-2 header 不由你翻**。

## Result

**结论**:完成。唯一产品/门禁改动是 `server/package.json` 的 `test:v2` 那一行追加 `src/__tests__/textFlowIdentityContract.test.ts`；未新增 script，未改其它门、`verify:v2-bn8-runtime`、产品码、tsconfig 或测试内容。header 依工单要求未翻。

### K-1：数字证明接线生效

- 接线前实跑完整 `test:v2`：`1..270` / `# tests 270` / `# pass 270` / `# fail 0`。
- 接线后实跑完整 `test:v2`：命令行明确列出 `src/__tests__/textFlowIdentityContract.test.ts`；四条专项子测试均列出并通过：
  - `textFlowIdForBlock implementations stay byte-for-byte equal`
  - `textFlowIdForBlock has one canonical client/shared definition`
  - `textFlowIdForBlock client call sites all use the canonical shared import`
  - `textFlowIdForBlock server implementation remains local`
- 接线后计数：`1..274` / `# tests 274` / `# pass 274` / `# fail 0`。即 **270 → 274**，净增契约专项 4 条。

### K-2：完整门承重 mutation

1. 临时把 `server/src/services/textFlowIdentity.ts` 改为 `` `tf-${blockId}` ``；HEAD blob 为 `97c02b882c320b44d20142408225b971aa654b80`，mutation 工作树 hash 为 `e8897fa6ceb5979bf4b6adc198819761d67c31ce`。
2. mutation 后先跑 `server` 的 `npx.cmd tsc --noEmit`：exit `0`，证明该 mutation 可编译。
3. 随后跑的是**完整 `test:v2`**，不是单跑专项文件。命令行包含该专项文件；runner exit `1`，计数 `274`，其中 `273 pass / 1 fail`。唯一失败为：
   - `textFlowIdForBlock implementations stay byte-for-byte equal`
   - `actual: 'tf-'`
   - `expected: 'textflow-'`
   - `code: 'ERR_ASSERTION'`
   - `name: 'AssertionError'`
   - `ReferenceError` / `SyntaxError` / `ERR_MODULE_NOT_FOUND` 命中数均为 `0`。
4. 反向补丁恢复后双面自证：
   - 源码面：工作树 blob 与 HEAD blob 同为 `97c02b882c320b44d20142408225b971aa654b80`；该文件 numstat 为空。
   - 产物面：对 `server/dist/**` 的 PowerShell `Select-String -SimpleMatch` 为 `0` 命中；独立 `findstr /l` 探针 exit `1`（无命中）；现有 `server/dist/services/textFlowIdentity.js` 返回 `` `textflow-${blockId}` ``。
5. 恢复后再跑完整 `test:v2`：`274/274` 绿；最终门禁序列中的再次复跑同为 `274/274`。

### 完整门禁（docs-first）

- `npm.cmd run docs:check`：exit `0`。
- `npm.cmd run verify:v2-bn8-runtime`：exit `0`。
- `client`：`npx.cmd tsc --noEmit` exit `0`。
- `server`：`npx.cmd tsc --noEmit` exit `0`。
- `npm.cmd run test:unit`：`22` files，**`222 passed (222)`**。
- `server` 的 `npm.cmd run test:v2`（`CANVAS_ASSET_DIR` 指向独立 OS temp）：**`274/274`**。
- 五道 tool-face 门逐道复跑：
  - `test:tool-face-registry`：exit `0`，`4/4`。
  - `test:tool-face-manifest`：exit `0`，`10/10`。
  - `check:tool-face-manifest`：exit `0`，manifest 未过期，`2` 条 public。
  - `test:tool-face-parity`：exit `0`，`10/10`（输出中的内部 `[FAIL]` 是 killer 负夹具的预期输出，外层测试全绿）。
  - `check:tool-face-parity`：exit `0`，`2` 条 public entry 通过必要条件门。

### 范围、边界与观感

- 写回 Result 前，tracked numstat 只有 `1\t1\tserver/package.json`；脚本值严格等于 HEAD 原值加一个空格和指定文件名，目标文件名在 `server/package.json` 恰好出现一次。独立只读复核得到同一结论。
- `server/src/services/textFlowIdentity.ts` 与契约测试本身最终均等于 HEAD；未补挂其它测试，未做全量漏挂扫描。
- **观感：长期风险。** 显式列表可以是有意的 curated gate，但在没有“新增测试未接门即失败”的发现机关时，新测试默认不运行；本单已证明这种遗漏会静默发生。建议未来作为独立 TD 治理，不在本单扩面。
- 不声称清偿 **TD-21**：本单只让契约在 tests 世界常驻；dev 与产物世界的 `@shared/*` 解析/全等仍无人守。TD-14、TD-6、TD-19/20、TD-16 亦未触碰或清偿。
