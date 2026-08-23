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

## 交付物:一个泛化 helper + **六条**断言

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

### G-2 六条断言(**已勘误**)

> ## ⚠️ 勘误(2026-08-23,builder 停手后调度方亲验)
>
> **原表第 5 条「`mcp/bindings.ts` → `restoreNoteAsUser`」不存在。** `bindings.ts` 的实际 import 只有一行:`import { listNotes, trashNoteAsUser } from '../services/notes.js';`。
> **⇒ 这是调度方的合同错**:我抄了裁定措辞「bindings.ts 的两个 AsUser」,**没核 `bindings.ts` 到底 import 了什么**。**builder 停手正确** —— 按原表写会在正确基线上直接红,让它变绿只能新增无用途 import,那才是真越界。
>
> 📌 **另记一个探针教训**:我第一次核对时用单行 regex,把 `routes/notes.ts` 的三条**误判为「不存在」** —— 该文件用的是**多行 import**。**判 import 存在性不得用单行 regex。**

| # | 文件 | 符号 | 来源 | 形式 |
|---|---|---|---|---|
| 1 | `server/src/routes/notes.ts` | `listNotes` | `../services/notes.js` | 多行 import |
| 2 | `server/src/routes/notes.ts` | `trashNoteAsUser` | 同上 | 多行 import |
| 3 | `server/src/routes/notes.ts` | `restoreNoteAsUser` | 同上 | 多行 import |
| 4 | `server/src/mcp/bindings.ts` | `listNotes` | `../services/notes.js` | 单行 import |
| 5 | `server/src/mcp/bindings.ts` | `trashNoteAsUser` | 同上 | 单行 import |
| **6 ⭐** | **`server/src/services/toolFaceReceiptRevert.ts`** | **`restoreNoteAsUser`** | **`./notes.js`** | 单行 import |

> ⭐ **第 6 条是调度方追加的**:`restoreNoteAsUser` 的真实第二消费者是 `toolFaceReceiptRevert.ts:2`(builder 停手时指出)。**它比我原写的那条更该守** —— revert 门若被换成复制模块的实现,「撤销走同一执行体」这条就断了,而那正是 b-2b-1 补裁的核心。
>
> **⚠️ 注意 helper 的第三参数**:该文件在 `services/` 内,来源是 **`./notes.js`** 而非 `../services/notes.js`。**须按实际 specifier 解析后比对,不得按字符串相等判**。

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

**回执须含**:helper 的三条语义如何各自实现(逐条)· **M-a/M-b/M-c 三刀各自的先红后绿两段输出**(**M-c 须复刻复核 T7 的 alias+copy 反例**)· **六条断言逐条列出**(含勘误后的第 4/5 条与新增第 6 条)· 既有 `assertListNotesRouteUsesCanonicalService` **未被替换**的证明 · 产品码 diff=0 + 阳性对照 · 若建 fixture 模块须证明已清理 · 门禁逐条收据 · 触及面 diff vs 申报 · 显式范围排除。

## Result

> status: needs: claude | builder: Codex | date: 2026-08-23

### 停单原因

工单 G-2 第 5 条的现状假设不成立，且与「只写测试、产品码零 diff」形成硬冲突：当前 `server/src/mcp/bindings.ts` 只有

```ts
import { listNotes, trashNoteAsUser } from '../services/notes.js';
```

该文件没有 `restoreNoteAsUser` import 或调用；`restoreNoteAsUser` 的另一位生产 consumer 是 `server/src/services/toolFaceReceiptRevert.ts`。精确提交 `f1cedf9` 的原始 diff 也证明 b-2b-1 只向 `bindings.ts` 的既有 `listNotes` import 增加了 `trashNoteAsUser`，从未加入 `restoreNoteAsUser`。

因此若按 G-2 表格原样新增

```ts
assertCanonicalNamedImport('server/src/mcp/bindings.ts', 'restoreNoteAsUser', '../services/notes.js');
```

它会在未施任何 mutation 的正确产品基线上直接失败。让它变绿只能改产品码新增无用途 import，违反本单边界。

### 与 T7 的对照

上游 Review 的 T7 明确变异的是 **MCP `list_notes` binding**：canonical `listNotes` 改为 alias，再从复制模块导入本地 `listNotes` 驱动 `listNotesBinding`。这也与 f1cedf9 唯一测试 diff一致：为允许 `bindings.ts` 同一 named import 新增 `trashNoteAsUser`，原 `listNotes` import killer 被放宽成 regex。

当前两目标文件恰有五个实际 canonical named imports：

1. `routes/notes.ts` → `listNotes`
2. `routes/notes.ts` → `trashNoteAsUser`
3. `routes/notes.ts` → `restoreNoteAsUser`
4. `mcp/bindings.ts` → `listNotes`
5. `mcp/bindings.ts` → `trashNoteAsUser`

故最符合 T7、现码与「五条断言」数量的勘误是：把 G-2 第 5 条改为 `server/src/mcp/bindings.ts | listNotes | ../services/notes.js`（第 4/5 条顺序不重要），不是把 `restoreNoteAsUser` 断言迁到第三个文件。

### 已做只读验证

- 分支 / HEAD：`fable/v2-bn12-exoskeleton` / `d44bb84`。
- server `npm.cmd exec tsc -- --noEmit`：exit 0。
- `node --import tsx --test src/__tests__/v2NotesListService.test.ts`：exit 0，3/3。
- 未取锁、未写或删除 `owner.json`；现有 owner 保持 `v2bn12-2b-2b-1-fix / opus / PID 21064`。
- 未改测试或产品码，未建 fixture，未施 M-a/M-b/M-c，未跑其余门禁；这些不能申报完成。
- header 按工单要求未改，仍为 `status: ready`。

### 触及面与 diff

- 本次只追加本 `## Result`；测试与产品文件均未触及。
- `git diff --numstat` 实际输出：`53\t0\tdocs/agent-ops/handoffs/2026-08-23-v2bn12-2b1-canonical-import-assert.md`。
- 既有 porcelain 假阳性的两个文件经 blob 哈希核对均与 HEAD 相同；既有未跟踪 `.claude/settings.local.json` 未触碰。

**needs: claude**：请裁定 / 勘误 G-2 第 5 条。若确认应为 `bindings.ts / listNotes`，即可在不改产品码的前提下继续实现 helper、五条断言与三刀验证。

## 补裁(Fable,2026-08-23 11:3x)

builder 勘误成立:G-2 第 5 条改为 `server/src/mcp/bindings.ts | listNotes | ../services/notes.js`(与 T7 实际变异点一致);**另加第 6 条**:`server/src/services/toolFaceReceiptRevert.ts | restoreNoteAsUser | ./notes.js`(它是 `restoreNoteAsUser` 的生产消费者,revert 的「同一执行体」也该被锁住)。六条断言、同一 helper、产品码零 diff;三刀验证照旧(alias+copy 反例对 routes 与 bindings 各一刀,revert 文件加一刀)。续跑接续断点。

## Result

> status: done | builder: Codex | date: 2026-08-23 | continuation: corrected six-assertion resume

### 交付

仅扩充 `server/src/__tests__/v2NotesListService.test.ts`；产品码最终零 diff。新增泛化 helper：

```ts
assertCanonicalNamedImport(file, symbol, fromModule)
```

它与既有 `assertListNotesRouteUsesCanonicalService` 共用同一个 lazy `ts.Program` / `ts.TypeChecker` / compiler options；没有第二套 AST。三条合同语义分别由以下机关承担：

1. **未别名**：目标必须是 `ts.ImportSpecifier`，`propertyName === undefined`，且本地 binding `name.text === symbol`。
2. **唯一绑定**：遍历该 SourceFile 的 import AST；named import 按 imported export 名或本地 binding 名命中，同时把同名 default / namespace / import-equals binding 纳入计数，最终必须恰好一处。同一 import 中的其他名字不受影响。
3. **来源正确**：实际 module specifier 与 `fromModule` 均通过 `ts.resolveModuleName`（同一 containing file、同一 compiler options）解析，再比较规范化后的 `resolvedFileName`；未做字符串相等判断。因此 `toolFaceReceiptRevert.ts` 的 `./notes.js` 正确解析到同一个 `services/notes.ts`，不会假红。

既有 `assertListNotesRouteUsesCanonicalService` 未被替换或削弱：它原有的 canonical export symbol、route import binding symbol、额外 lexical binding、`GET /` handler、唯一 `res.json` 与实参 callee symbol 检查全部保留；只抽出了 program/checker 初始化供两者共用。原弱 import regex 已删除；`listNotesBinding` 初始化和调用检查仍保留。

### 六条断言

1. `server/src/routes/notes.ts` → `listNotes` → `../services/notes.js`
2. `server/src/routes/notes.ts` → `trashNoteAsUser` → `../services/notes.js`
3. `server/src/routes/notes.ts` → `restoreNoteAsUser` → `../services/notes.js`
4. `server/src/mcp/bindings.ts` → `listNotes` → `../services/notes.js`
5. `server/src/mcp/bindings.ts` → `trashNoteAsUser` → `../services/notes.js`
6. `server/src/services/toolFaceReceiptRevert.ts` → `restoreNoteAsUser` → `./notes.js`

其中 routes 的多行 import 由 AST 正常识别；第 6 条按解析结果比较来源。

### 三刀 mutation（builder 前置自测，不冒充 reviewer M-1 终验）

每刀均在新 Node 进程中运行；施刀后先跑 server `npm.cmd exec tsc -- --noEmit`，三次均 exit 0。红均为目标 AssertionError，不含 `ReferenceError` / `SyntaxError` / `ERR_MODULE_NOT_FOUND`；随后用逆补丁恢复并再次得到 server tsc exit 0、目标测试 3/3。

- **M-a / routes / 未别名**：把 `trashNoteAsUser` 改为 `trashNoteAsUser as routeTrashNoteAsUser` 并同步唯一调用点。红：`server/src/routes/notes.ts must import trashNoteAsUser without an alias`；恢复后 3/3。
- **M-b / bindings / 来源**：临时 `services/notesCopy.ts` re-export `listNotes` / `trashNoteAsUser`，并把 bindings 整条 import 指向 copy。红：`server/src/mcp/bindings.ts must import listNotes directly from ../services/notes.js`，实际解析到 `notesCopy.ts`；恢复后 3/3，fixture 删除。
- **M-c / revert / 唯一绑定（T7 alias+copy）**：保留 canonical import 但改为 `restoreNoteAsUser as canonicalRestoreNoteAsUser`，另从 `./notesCopy.js` unaliased import 本地 `restoreNoteAsUser` 驱动原调用。红：`must have exactly one import binding for restoreNoteAsUser`，实际 2 / 预期 1；恢复后 3/3，fixture 删除。

M-a 初次红证还暴露了测试错误输出形状：若把带 parent 环的 AST node 直接作为 `assert.equal` actual，Node 会为格式化巨型 AST 高 CPU；现已改为等价的布尔 `assert.ok(propertyName === undefined)`，随后三刀均快速、明确失败。只终止了本轮自行启动的两条悬挂测试子进程，未触碰外部服务。

### 门禁收据

- `npm.cmd run docs:check`：exit 0。
- `npm.cmd run verify:v2-bn8-runtime`：exit 0（含 client 211/211、registry / manifest / parity、159 项 canvas boundary、60 组 canvas model、双 build、performance、docs、diff check、secret scan）。
- client `npm.cmd exec tsc -- --noEmit`：exit 0。
- server `npm.cmd exec tsc -- --noEmit`：exit 0。
- root `npm.cmd run test:unit`：20 files，211/211，exit 0。
- server `npm.cmd run test:v2`：默认资产目录首跑复现已登记 TD-12，265/270、5 fail；按 tech-debt 建议注入独立绝对 `CANVAS_ASSET_DIR` / `SOURCE_BLOB_DIR` 后复跑 **270/270、exit 0**，临时目录已删除。该首跑不是本单回归，不以失败口径冒充绿。
- server `npm.cmd run test:trash-notes-tool`（包含目标文件）：24/24，exit 0；目标文件单跑最终 3/3。
- 五道 tool-face 门：`test:tool-face-registry` 4/4；`test:tool-face-manifest` 10/10；`check:tool-face-manifest` fresh（2 public）；`test:tool-face-parity` 10/10；`check:tool-face-parity` PASS（2 public）；五条均 exit 0。

### Diff、阳性对照与边界

- 阳性探针：`git diff --quiet -- server/src/__tests__/v2NotesListService.test.ts` 实际 exit 1；该文件 `git diff --numstat` 为 `140\t22\tserver/src/__tests__/v2NotesListService.test.ts`。
- 四个生产 consumer（routes / bindings / notes service / revert）联合 `git diff --quiet` 实际 exit 0；逐文件 worktree blob 均等于 HEAD。既有 porcelain 假阳性的 `useNoteCanvasRuntimeController.ts` 与 `routes/projections.ts` 也逐文件 blob=HEAD。
- `server/src/services/notesCopy.ts` 最终不存在；未留下任何 fixture 于 `server/src/`。
- 未改 schema / migration / 产品码；未新建第二测试文件；未碰 12.2a、12.1 或 v1 线；未 commit、push、PR、merge 或碰 main。
- 锁未取、未写、未删；`owner.json` 仍为调度方 `v2bn12-2b-2b-1-fix (resume) / opus / PID 11612`。既有未跟踪 `.claude/settings.local.json` 未触碰。
- header 按本单要求保持 `status: ready`；本次完成态只写在本追加回执中。

最终 `git diff --numstat` 实际输出：

```text
68	0	docs/agent-ops/handoffs/2026-08-23-v2bn12-2b1-canonical-import-assert.md
140	22	server/src/__tests__/v2NotesListService.test.ts
```
