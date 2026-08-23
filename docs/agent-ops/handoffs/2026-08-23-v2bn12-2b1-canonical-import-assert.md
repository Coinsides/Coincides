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

## Review

> Codex reviewer · 2026-08-23 · 洁净室增量复核。复核对象固定为 `1de332b5d9fb1053022a30dc7d0ab5fea2f6e384`，直接父提交为 `815bd136577607322030cf6297df8f949933f312`，修正前比较基线为 `2b724aa0fb46a6d8c3684803330b9e8e6018bb2c`。共享分支在复核期间继续前进；全部承重代码、门与 mutation 证据均来自 OS `$TMPDIR` 中的精确 detached Git 对象，不以移动中的共享 HEAD 代替目标提交。未改产品代码、常驻测试或 header，未 commit、push、碰 main 或 `.codex-tmp/builder.lock.d`。

### 判定

**PASS**。分级计数：`BLOCKER 0 / HIGH 0 / MED 0 / LOW 2`。

修正方向成立：T7 点名的 routes 与 bindings 两个 canonical alias + copy-module 二次同名 import 反例都在 `tsc --noEmit = 0` 的可编译状态下稳定命中新 helper；六个断言实例逐条有独立杀伤收据，文本不会冒充 binding，同一 import 增加无关合法 named import 仍绿。没有发现当前产品接线回归或产品码差分。

1. **[LOW][测试维护性] C7 仍绑定 named-import 写法。** `mcp/bindings.ts` 改为 canonical `import * as notes` 并调用 `notes.listNotes(...)` 后，server tsc exit `0`，专项 `2 pass / 1 fail`，只红在 `must have exactly one import binding for listNotes`（actual `0`）。调用语义仍指向 canonical service；这与 b-2a-fix Review F5 是同一已知维护摩擦，按本轮指令维持 LOW，不推翻 T7 已封住。
2. **[LOW][收据准确性 / 调度差分口径] `2b724aa..1de332b` 不是字面上的“只有测试文件与工单”两路径。** 精确区间还有自动生成的 `docs/agent-ops/INDEX.md`（`2 / 1`）：126→127，并登记新增修正单。该 sidecar 来自开单 commit `d44bb84` 的调度方交付，不是 builder 的 `1de332b` 产品改动；内容也只承载工单索引，故不定性为产品或 builder 边界越界。但指定区间的二路径前提确实不成立，必须如实单列。产品码 numstat 仍为 `0`。

### 5-7 增量协议声明

本轮是修正链中间轮，显式采用 reviewer charter 5-7：**结论基线 = b-2b-1 Review 的 K-b0…K-b8、T1–T6**。本轮只全量复验 T7、`2b724aa..1de332b` 差分面、六个新断言实例、点名 C1–C7 与全部验证门；K-b0…K-b8、T1–T6 不重复施刀。产品代码区间零差分是沿用这些结论的前提，不把增量范围沉默伪装成全面重验。

### T7 与 helper 机关

- `getServerTypeScriptContext` 只创建一个 `ts.Program` / `ts.TypeChecker`，并保存同一份 `parsedConfig.options`；新 helper 与既有 `assertListNotesRouteUsesCanonicalService` 共用它。旧 route helper 未被替换或削弱。
- `assertCanonicalNamedImport` 遍历 `ImportDeclaration` / `ImportSpecifier`，按 imported export 名或 local binding 名收集；同名 default / namespace / import-equals binding 也纳入计数。最终要求恰一条 named import、`propertyName === undefined`、本地名等于目标符号。
- actual specifier 与 `fromModule` 分别在 `v2NotesListService.test.ts:243-254` 调 `ts.resolveModuleName`；两次使用**同一个 containing file `filePath`**与**同一份 `compilerOptions`**，随后比较规范化 `resolvedFileName`，不是字符串相等。
- 两侧解析结果各有 `assert.ok`（`:255-256`）。reviewer 把 routes/trash 的 expected source 临时改为不存在的 `../services/definitelyMissingNotes.js`：tsc exit `0`，专项红在 `expected source ... must resolve`，不是 skip、`ERR_MODULE_NOT_FOUND`、SyntaxError 或 ReferenceError。
- 定义机械计数为 `1`，仅住 `server/src/__tests__/v2NotesListService.test.ts`；`ts.createProgram` 在 `server/src/**` 也只有该文件一处。既存 `scripts/check-tool-face-parity.mjs` 只有 parser-only `createSourceFile`，区间零 diff；未新增第二套 AST 工具。

### 六条断言逐条（不抽样）

原始 `1de332b` 先以同一专项 `3/3` 证明六条依次全部可达。随后每条独立施刀；每刀 server tsc exit `0`，红后反向恢复并重跑 `3/3`、tree clean。

| # | 断言 | 独立 reviewer 杀伤收据 |
|---:|---|---|
| 1 | `routes/notes.ts` → `listNotes` → `../services/notes.js` | C1 alias+copy 得到两个 binding；常驻原顺序先被旧 route helper 杀死。reviewer-only 临时调序先在正确基线绿，再让**新 helper 自身**红：`must have exactly one import binding for listNotes`，actual `2`。另做 alias-only，红于 `must import listNotes without an alias`。 |
| 2 | `routes/notes.ts` → `trashNoteAsUser` → 同源 | 临时改从 `notesCopy.ts` 导入；红于 `must import trashNoteAsUser directly from ../services/notes.js`。 |
| 3 | `routes/notes.ts` → `restoreNoteAsUser` → 同源 | 临时改从 `notesCopy.ts` 导入；红于 `must import restoreNoteAsUser directly from ../services/notes.js`。 |
| 4 | `mcp/bindings.ts` → `listNotes` → 同源 | C2 alias+copy 红于 `must have exactly one import binding for listNotes`，actual `2`。 |
| 5 | `mcp/bindings.ts` → `trashNoteAsUser` → 同源 | C3 改从 `notesCopy.ts` 导入；红于 `must import trashNoteAsUser directly from ../services/notes.js`。 |
| 6 | `services/toolFaceReceiptRevert.ts` → `restoreNoteAsUser` → `./notes.js` | C4 改从 `notesCopy.ts` 导入；红于 `must import restoreNoteAsUser directly from ./notes.js`。 |

### C1–C7 mutation

| 位点 | 实测 | 判定 |
|---|---|---|
| C1 routes/list alias+copy | tsc `0`；原序旧 route helper 红（named import actual `2`）；定向调序后新 helper 红（unique binding actual `2`） | **PASS，点名漏径已封** |
| C2 bindings/list alias+copy | tsc `0`；新 helper unique-binding 断言红，actual `2` | **PASS，T7 实际变异点已封** |
| C3 bindings/trash wrong source | tsc `0`；来源解析到 `notesCopy.ts`，direct-source 断言红 | **PASS** |
| C4 revert/restore wrong source | tsc `0`；来源解析到 `notesCopy.ts`，direct-source 断言红 | **PASS** |
| C5 注释 / 字符串 | 三个目标文件分别加入对应符号 comment 与无副作用 string；tsc `0`、专项 `3/3` | **PASS，文本不制造假阳性** |
| C6 同 import 增无关合法 named import | bindings 同一 import 增加真实 export `restoreNote`；tsc `0`、专项 `3/3` | **PASS，允许无关同条 import** |
| C7 namespace canonical | `import * as notes` + `notes.listNotes(...)`；tsc `0`，专项 `2/1`，红在 named binding actual `0` | **记录态，维持 LOW-1** |

C6 指令中的示例 `getOwnedNote` 并不是 `services/notes.ts` 的 export；为避免 tsc 因错误理由红，reviewer 按“如”的开放示例改用该模块确实导出的无关 `restoreNote`。所有 copy fixture 都在每刀后删除，最终 `notesCopy.ts` 不存在。

### 产品码零差分与提交完整性

完整、不截断的 `git diff --numstat 2b724aa..1de332b` 为：

| path | `+ / -` |
|---|---:|
| `docs/agent-ops/INDEX.md` | `2 / 1` |
| `docs/agent-ops/handoffs/2026-08-23-v2bn12-2b1-canonical-import-assert.md` | `243 / 0` |
| `server/src/__tests__/v2NotesListService.test.ts` | `140 / 22` |

- 同一探针先看见测试路径阳性 `140 / 22`，再对 `client/src/**` + `server/src/**` 排除 `server/src/__tests__/**` 做完整 numstat：输出 count `0`；name-status 亦为 `0`。**产品码 numstat = 0**。
- `git diff --check 2b724aa..1de332b` exit `0`。`1de332b` 自身只改修正单 Result 与该测试；第三条 INDEX sidecar 的字符串归因来自 `d44bb84` 的 commit message 与 126→127 / 新工单索引实 diff，不使用本仓无执行者信息的 author 字段归因。
- helper 定义 count `1`、全部调用 count `7`（定义 + 六调用）；AST 搜索先命中本测试的 program/checker 与既存 parity parser 阳性，再据此判“无新增第二套”，不是从 grep 缺席直接推断。

### docs-first 门表

正式 gates tree detached 于精确 `1de332b`，checkout 前设置 `core.autocrlf=false`。标准 Vite/Vitest config-loader 的 nonzero 如实保留，不伪记为绿；按用户明示先例用同 React plugin、三项 alias、jsdom / setup 与 `configFile:false` 做程序化补证。

| 顺序 | 门 | reviewer 实测 |
|---:|---|---|
| 1 | `npm.cmd run docs:check` | exit `0`；index / inventory 最新 |
| 2 | `npm.cmd run verify:v2-bn8-runtime` | 标准入口 exit `1`；首个 unit 在 config 装载前报 `Cannot read directory "../../../../..": Access is denied`，`0` assertions。programmatic unit `20/20` files、`211/211`；其余未达 child 全部逐项补跑为绿，见下文 |
| 3 | client `npm.cmd exec tsc -- --noEmit` | exit `0` |
| 4 | server `npm.cmd exec tsc -- --noEmit` | exit `0` |
| 5 | root `npm.cmd run test:unit` | 标准入口同一 config-loader exit `1`、`0` assertions；同配置 programmatic 入口 `20/20`、`211/211`、exit `0` |
| 6 | server `npm.cmd run test:v2` | 独立绝对 `CANVAS_ASSET_DIR` / `SOURCE_BLOB_DIR`，`270/270`、exit `0`；两目录收尾 entry `0`、ReparsePoint `0` |
| 7 | `node --import tsx --test src/__tests__/v2NotesListService.test.ts` | `3/3`、exit `0` |

`verify` 未达 child 的承重补证：registry `4/4`；manifest `10/10` + fresh check（2 entries / 2 public）；parity `10/10` + production check PASS（2 public）；canvas runtime boundary `159`；group gallery `5`，其余 groups rail / single editor / source experience / legacy shutdown / relation freshness 全绿；canvas model contract `60` groups；server production build exit `0`；performance `5` scenarios；尾段 docs、diff check、changed-file secret scan均 exit `0`。标准 `build:client` 在 `tsc -b` 通过后遇同一 Vite config-loader 红；programmatic production build转换 `2184` modules、exit `0`。因此环境红已补证但未洗成标准命令绿，按本单明示先例不另记 finding。

### 5-2 跨条耦合与 b-3 状态转移

- 六条规范性 import 断言与既有 route callee-symbol 断言合取后，route 的“import 正规 + 实际调用同一 binding”都受保护；bindings / revert 当前锁的是 canonical named import 规范，不声称已成为写法无关的任意 callee 语义分析器，C7 LOW 正是该边界。
- T7 的 alias+copy、wrong-source、文本、同条无关 import 四类同时相容；没有为了杀旧漏径重新禁止 b-2b-1 所需的多 named import。
- b-3 新建 `routes/toolReceipts.ts` 后，**应在同一个现有 helper 下追加两条**：`trashNoteAsUser` → `../services/notes.js`，`revertTrashNotesReceipt` → `../services/toolFaceReceiptRevert.js`。当前 b-3 工单已经把它们列为第 7/8 条；应随生产文件落地，不在文件尚不存在时提前加入制造基线红，也不得复制第二套 AST helper。

### 5-1、阴性断言阳性对照与字符串归因

- 承重证据均由 reviewer 亲取：精确对象 / 父链、完整 diff、helper AST 与 module-resolution failure path、六断言逐条 mutation、C1–C7、双 tsc、全量 client/server 门、专项、build、资产隔离、tree clean 与删除。builder `## Result` 只作导航，不替代承重因果。
- mutation 前同一专项先在原始 `1de332b` 得到 `3/3`；C1 为隔离新 helper 红点而临时调序时，也先在调序后的正确产品基线得到 `3/3`。红点里的 alias、copy import、namespace 写法与 missing specifier 都由 reviewer 写入隔离树；AssertionError 消息来自已提交 helper。C5 的 comment/string 同样由 reviewer 写入却仍 `3/3`，因此文本回显没有冒充 binding 证据。
- 产品零差分前先让同一 diff 探针看见测试 `140/22`；helper / AST 阴性前先看见已知 helper、program 与 parity parser；不存在 copy fixture前先看见 mutation 中的 fixture 阳性并在还原后确认不存在。
- 共享树先正面看见两处 porcelain `.M`：`client/.../useNoteCanvasRuntimeController.ts` 与 `server/src/routes/projections.ts`；两者随后各自 `git diff --quiet` exit `0`，filtered worktree hash 分别等于 HEAD blob `3efe5f820e2077850611b54d4d09482845e89545`、`561902a449b50ce254b650de5a337973a8fbc26d`，故归因为已点名 EOL/stat 假阳性，不归因给 builder 或 reviewer。
- 显式范围排除：本单只有测试结构护栏，没有新的 live endpoint / UI journey；不启动生产服务、不读写生产 DB、不做浏览器主观验收。b-3 route 尚未落地，故只做下一状态记录，不伪造第 7/8 条 live 收据。

### 隔离树自清收据

- mutation：`C:/Users/70208/AppData/Local/Temp/Coincides-review-canonical-1ce79ac70378434089ee8fe7bfb0ba4d/worktree`，由同 base 下 `repo.git` 管理，精确 HEAD `1de332b`；client/server `npm ci --offline` 分别安装 `202 / 212` packages。每刀后 status / worktree diff / index diff 均为 `0`，整树 ReparsePoint `0`，node_modules 都是普通 Directory。
- gates：`C:/Users/70208/AppData/Local/Temp/cgw-4d56a1a7`，由独立 `cgr-4d56a1a7.git` 管理；client/server 同样 `npm ci --offline` 为 `202 / 212`，整树 ReparsePoint `0`。隔离资产目录为同层 `cga-4d56a1a7` / `cgs-4d56a1a7`，删除前均为空且 ReparsePoint `0`。
- 两棵 worktree 删除前 HEAD 都是精确目标、status count `0`、`git diff --exit-code = 0`。均先由各自 bare clone 执行原生 `git worktree remove --force`；沙箱拒绝 PowerShell `Remove-Item` 后，只在已核绝对 OS temp 路径、前缀与 ReparsePoint 的条件下用 .NET 等价删除空资产目录 / 独立 bare clone。
- 最终 mutation base/worktree/bare 与 gates worktree/bare/两资产目录的 `Test-Path` 全为 `False`；共享 `git worktree list` 只余 `D:/Coinsides/v2.x/Coincides`。未建临时分支，无遗留需调度方代清，未 junction 到共享 `node_modules`，也未触碰共享依赖。

唯一共享树写入是本 UTF-8 `## Review` 追加；header 保持原样。放行权仍在 Fable，本 Review 不自行落 checkpoint。
