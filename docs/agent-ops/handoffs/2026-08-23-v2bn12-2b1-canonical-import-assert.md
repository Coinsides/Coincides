> from: claude(opus,调度权:operating-workflow.md v1) | to: codex(builder) | status: ready(裁定:Fable log 08-23 #28) | re: v2bn12-2b-2b-1-fix | date: 2026-08-23

# V2.BN.12.2b-2b-1-fix:canonical import 断言泛化(**只写测试,产品码零 diff**)

> ⚠️ header 由 Opus 依调度授权链翻牌,**不代表 Henry 本人逐张批过**。

## 定位

b-2b-1 复核判 **FAIL(方向成立)** 0B/0H/**1M**/1L。**产品侧全部成立** —— K-b0…K-b8、T1–T6 逐条红绿。

**MED = T7:同形第二次。**

> b-2a-fix 曾把 A-1 从 regex 升级为**结构法**(AST + 符号解析),正是为了堵「别名 + 复制模块二次 import」的假绿。
> **b-2b-1 为了多 import 两个 `AsUser` 符号,又把 binding 侧放宽回 regex** —— 于是同一把刀第二次能骗绿。

### ⭐ 调度方亲验的现状(**本单的问题定义**)

`server/src/__tests__/v2NotesListService.test.ts` 里 **两侧强度不对称**:

| 侧 | 现状 | 强度 |
|---|---|---|
| **route 侧**(`assertListNotesRouteUsesCanonicalService`) | 真 AST:定位 `GET /` handler → 找 `res.json` 唯一调用 → `checker.getSymbolAtLocation` **比对到 canonical import binding symbol** | ✅ **结构法,强** |
| **binding 侧**(`:322-323`) | `assert.match(bindingSource, /import\s+\{[^}]*\blistNotes\b[^}]*\}\s+from\s+'\.\.\/services\/notes\.js';/)` + `assert.match(listBinding, /listNotes\(\{/)` | ⛔ **regex,弱** |

**⇒ binding 侧的断言只要求「named import 花括号里出现 `listNotes` 这个词」。**
`import { listNotes as x, trashNoteAsUser } from '...'` 能过;从**复制模块**再 import 一份同名符号也能过。

---

## 交付物:一个泛化 helper + 五条断言

### G-1 helper

```
assertCanonicalNamedImport(file, symbol, fromModule)
```

**语义(三条,缺一不可)**:
1. **未别名** —— `propertyName` 必须缺省(即不是 `X as Y` 形式);绑定名 === `symbol`。
2. **唯一绑定** —— 该文件中 `symbol` 只有**一个** import 绑定;**不得有第二处从任何模块 import 同名符号**(这条是堵「复制模块」的)。
3. **来源正确** —— module specifier 解析后指向 `fromModule`。

**允许**:同一条 `import { a, b, c }` 里含其他名字 —— **这正是 b-2b-1 放宽的起因,泛化后不必再放宽。**

> ⛔ **必须用 AST**(`ts.ImportDeclaration` / `ts.ImportSpecifier` / `propertyName`),**不得用 regex**。
> 📌 **可复用现有 program/checker 基础设施**(该测试文件已有);**不得另建第二套 AST 工具**。

### G-2 五条断言

| # | 文件 | 符号 | 来源 |
|---|---|---|---|
| 1 | `server/src/routes/notes.ts` | `listNotes` | `../services/notes.js` |
| 2 | `server/src/routes/notes.ts` | `trashNoteAsUser` | 同上 |
| 3 | `server/src/routes/notes.ts` | `restoreNoteAsUser` | 同上 |
| 4 | `server/src/mcp/bindings.ts` | `trashNoteAsUser` | `../services/notes.js` |
| 5 | `server/src/mcp/bindings.ts` | `restoreNoteAsUser` | 同上 |

⚠️ **route 侧既有的 `assertListNotesRouteUsesCanonicalService` 保留** —— 它验的是**「`res.json` 的实参确实调用了那个 binding symbol」**,与 import 规范性**是两件事**。**⛔ 不得用新 helper 替换它。**

### G-3 ⛔ 必红判据(**三刀,各自独立**)

| 刀 | 做法 | 预期 |
|---|---|---|
| **M-a 别名** | 任一处改为 `import { trashNoteAsUser as doTrash } from '../services/notes.js'` 并同步调用点 | **对应断言红**(未别名条款) |
| **M-b 复制模块** | 新建 `services/notesCopy.ts` re-export 同名符号,把 `bindings.ts` 的 import 改指向它 | **红**(来源条款) |
| **M-c 二次绑定** | 保留原 import,**另加**一条从复制模块 import 同名符号 | **红**(唯一绑定条款) |

> ⭐ **M-c 是本单的核心** —— 前两版断言都挡不住它。**复刻复核 T7 的反例必须红。**

**红的性质**:须来自「断言存在但被绕过」,**不得是 `ReferenceError`/`SyntaxError`/`ERR_MODULE_NOT_FOUND`**;施刀前后跑 `tsc --noEmit` 证明语法完好。

---

## LOW-1:Result 口径(**上游/调度方式错误,非你的**)

b-2b-1 的 Result 把**行数**当 `numstat` 报。**本单回执请用 `git diff --numstat` 实际输出,不要用 `wc -l`。**
📌 `grep -c` 数的是**行数不是出现数** —— 调度方在 R7 上因此把 11 写成过 7。

---

## 边界

**允许**:`server/src/__tests__/v2NotesListService.test.ts`(扩充)· 如需另建测试文件亦可(须申报) · **测试专用**的复制模块 fixture(**若建,须在 `finally` 删除或置于临时目录,⛔ 不得留在 `server/src/` 下**)。

**⛔ 不得**:改**任何**产品代码 —— 尤其 `routes/notes.ts` / `mcp/bindings.ts` / `services/notes.ts` · 替换或削弱既有 `assertListNotesRouteUsesCanonicalService` · 另建第二套 AST 工具 · 碰 12.2a 已闭环面 · 碰 12.1 线 / v1 线 · 改 schema/migration。

**产品码 diff 必须为 0**,回执须附**阳性对照**证明探针有效(先证它能看见测试文件的改动)。

**越界即停,标 `needs: claude`。**

---

## D. 探针 / 锁 / 环境

阴性断言前先让同一探针看见已知阳性;**确认命中不是来自你自己刚写进去的东西**。
**锁非你所有** —— 不取锁、不写 `owner.json`、不删锁;取锁失败即停,**不得覆盖既有 owner**。
📌 porcelain 对 `client/.../useNoteCanvasRuntimeController.ts`、`server/src/routes/projections.ts` 有 stat/EOL 假阳性;判文件真改用 blob 哈希或 `git diff --numstat`;管道遮蔽退出码。

## 验证与回执

门禁 **docs-first**:`docs:check` → `verify:v2-bn8-runtime` → client/server 双 `tsc --noEmit` → `test:unit` → server `test:v2` → 五道 tool-face 门。

**回执纪律**:README Builder 侧 1–3(含 **UTF-8**)+ **M-1 mutation 归复核方** + **M-2 header 不由你翻**。
**⭐ 写 `## Result` 是本单交付物之一,不需确认,直接写。**

**回执须含**:helper 的三条语义如何各自实现(逐条)· **M-a/M-b/M-c 三刀各自的先红后绿两段输出**(**M-c 须复刻复核 T7 的 alias+copy 反例**)· 五条断言逐条列出 · 既有 `assertListNotesRouteUsesCanonicalService` **未被替换**的证明 · 产品码 diff=0 + 阳性对照 · 若建 fixture 模块须证明已清理 · 门禁逐条收据 · 触及面 diff vs 申报 · 显式范围排除。
