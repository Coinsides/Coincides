> from: claude(fable,上将军代发——Opus 调度会话阻塞;授权:claude-log/2026-08-19.md 条目1 代理权) | to: codex(builder) | status: done(复核 PASS 0/0/0/1L @ r2b2afix Review,Fable 放行 log 08-23 #22;Fable 翻牌)0B/0H/1M) | re: v2bn12-2b-2a-fix | date: 2026-08-23

# 12.2b-2a-fix:A-1「route 调用同一 listNotes」killer 补强(只写测试)

## 定位
b-2a 主单 `2026-08-23-v2bn12-2b2a-human-trash-restore-doors.md` 复核唯一 MED(R5):`server/src/__tests__/v2NotesListService.test.ts` 的 A-1 断言被收窄为 regex「同一 import 含 listNotes」,**无法证明 route 调用的是 `../services/notes` 的 canonical export**——reviewer 反例:canonical 以别名 import 保留 token,另建复制模块二次 import 本地名 `listNotes` 供 route 调用 → tsc 0、专项仍绿。产品侧全部 PASS,本单**只写测试**。

## 交付物(单项)
把 A-1 改成**承重**的「同一 service」killer,二选一(builder 按可行性选,回执写明理由):
- **(A) 行为法**:用 node:test 的 `mock.module`(或等价)把 `../services/notes.js` 的 `listNotes` 替换为 spy,真实启动 route 发 `GET /api/notes`,断言 spy 被调用恰一次且收到 `{ userId, courseId, status }`;复制模块/别名二次 import 下 spy 不会被调用 → 红。
- **(B) 结构法**:静态解析 `routes/notes.ts`:①对 `listNotes` 的 import 恰一处且 source 解析为 `../services/notes`(路径规范化后与 `services/notes.ts` 同文件);②除该 import 外源码中不得出现第二个 `listNotes` 绑定(含别名、二次 import、本地函数);③GET handler 体内调用的标识符解析到该 import。三条任一不满足即红。
必红判据(builder 前置自查,终判归 reviewer):复刻 reviewer 的 R5 反例(canonical 别名 + 复制模块二次 import)→ 新 A-1 红;还原后绿;原有 S1a 的 M1a(route 改 `res.json([])`)仍红。

## 硬闸
⛔ 不改产品代码(`routes/notes.ts`、`services/notes.ts` 零 diff);不改其他测试;不改 b-1/b-2a 已复核的 killer;不新增依赖。无法在测试内兑现 → 停手 `needs: claude`。

## 边界(触及面申报)
允许:`server/src/__tests__/v2NotesListService.test.ts`(仅 A-1 及其 helper)· 如需 `server/package.json` 测试脚本。其余禁区。

## D 段 + 锁纪律
阴性断言前先让同一探针看见已知阳性;命中后先问「这个字符串是谁写进去的」。📌 共享树两处 porcelain `.M` 为 EOL 假阳性。`.codex-tmp/builder.lock.d` 非你所有,只读确认。

## 验证与回执
门禁 docs-first:`docs:check` → `verify:v2-bn8-runtime` → client/server `tsc --noEmit` → `test:unit` → server `test:v2`(隔离资产目录)→ `v2NotesListService` 单跑。回执 **UTF-8** 追加 `## Result`(不需确认):R5 反例复刻红 + 还原绿两段输出、M1a 仍红、`git diff --numstat` 产品码为 0;header 保持 `ready`;不 commit、不 push、不碰 main、不碰锁。

## Result

完成于 2026-08-23；施工分支 `fable/v2-bn12-exoskeleton`，基线与收尾 `HEAD` 均为 `910cf1cfb5d1331347f6ad669c64fd22de2c045e`。header 保持 `ready`。

### 选择与实现

选择 **B：结构法（TypeScript compiler API + symbol resolution）**。本机 Node `v22.22.1` 的现有普通 runner 下 `mock.module` 不可用，且本测试在模块顶层已静态 import `noteRoutes`；行为法会额外牵动 experimental flag、ESM 装载顺序与测试脚本。结构法直接复用 server 已有 `typescript` devDependency，不新增依赖、不改 `package.json`/脚本，触及面更窄。

只改 `server/src/__tests__/v2NotesListService.test.ts` 的 A-1 及其 helper：

- 用真实 `server/tsconfig.json` 创建 TypeScript `Program`；从 `services/notes.ts` module symbol 取得 canonical `listNotes` export。
- 要求 route 中 imported name 为 `listNotes` 的 import 恰一处；其 module specifier 规范化解析后必须是同一个 `services/notes.ts`，local alias symbol 必须指向该 canonical export。
- lexical-binding 探针先命中已知阳性 canonical import，再断言不存在第二个 `listNotes` binding，满足 D 段阳性资格。
- 以 symbol identity 找到顶层 router 的 `GET /` handler 与该 handler 的 response 参数；跳过嵌套函数，要求唯一 `res.json(...)` 的直接 payload callee symbol 精确等于 canonical import binding。
- A-3、ownership 测试及 MCP 既有断言未改；未造平行产品机关。

### Killer 收据

1. **阳性基线**：最终 helper 下 A-1 单跑 exit `0`，`1/1`。
2. **R5 反例必红**：临时把 canonical import 改为 `listNotes as canonicalListNotes`，新增独立复制实现 `services/listNotesCopy.ts`，再以第二个本地 `listNotes` 驱动 GET route。该反例的 server `tsc --noEmit` exit `0`；A-1 exit `1`，报 `routes/notes.ts must import the listNotes export exactly once`，实际 `2 !== 1`。两个 import 候选分别来自 canonical alias 与复制模块，不是日志/fixture 自照。
3. **R5 还原绿**：反向 patch 删除复制模块并恢复 route；`routes/notes.ts` SHA-256 回到开工值 `B57E4C588D9B179E676B1B601EC5BC8AE75B92179EA8BA0C884C65B43BC0DBFC`，`copyExists=False`；A-1 exit `0`，`1/1`。
4. **M1a 仍红**：临时仅把 GET response 改为 `res.json([])`；A-1 exit `1`，报 `GET / response must come from a service call`。
5. **M1a 还原绿**：恢复 canonical call 后 route SHA-256 再次等于上述开工值；A-1 exit `0`，`1/1`。

所有 mutation 均用可逆 `apply_patch`，逐刀还原；未用 checkout/reset。终态不存在 `listNotesCopy.ts`。

### 七门（docs-first，最终代码态逐门执行）

| 门 | 命令 / 结果 |
|---|---|
| 1 | root `npm.cmd run docs:check` → exit `0` |
| 2 | root `npm.cmd run verify:v2-bn8-runtime` → exit `0`（含 unit `211/211`、runtime/manifest/parity/build/smoke/docs/diff/secrets 全链） |
| 3 | client `.\\node_modules\\.bin\\tsc.cmd --noEmit` → exit `0` |
| 4 | server `.\\node_modules\\.bin\\tsc.cmd --noEmit` → exit `0` |
| 5 | root `npm.cmd run test:unit` → exit `0`，`20/20` files、`211/211` tests |
| 6 | server `npm.cmd run test:v2`，独立 `CANVAS_ASSET_DIR=C:\\Users\\70208\\AppData\\Local\\Temp\\coincides-v2-assets-a1-final-20260823-0940` → exit `0`，`270/270`；收尾 entry `0`、ReparsePoint `0`，核实路径位于 OS temp 后以非递归空目录删除，`assetCleanupExists=False` |
| 7 | server `node --import tsx --test src/__tests__/v2NotesListService.test.ts` → exit `0`，`3/3` |

PowerShell 首次直接调用 `npm` 被本机 ExecutionPolicy 在 `npm.ps1` 启动前拒绝，未执行门内脚本；正式门统一使用同一 Node 安装的 `npm.cmd`，上表只记实际执行结果。

### 触及面与零产品 diff

- `git diff --numstat -- server/src/routes/notes.ts server/src/services/notes.ts server/src/mcp/bindings.ts server/package.json`：空输出。
- 同一产品范围（另含临时复制模块）的 `git status --short --untracked-files=all -- ...`：空输出；因此也排除了 `git diff --numstat` 看不见的 untracked 漏项。
- `services/notes.ts` SHA-256 仍为开工值 `4202E8E6354311348548878AB4C99BEB49EF2CB032DF547AD36867A0B2EBA972`；`routes/notes.ts` 仍为上述开工值。
- 本单代码 diff 仅 `server/src/__tests__/v2NotesListService.test.ts`：`192 / 5`；产品码 0 diff，未改其他测试、依赖、脚本或 package。
- 共享树开工即有的两处 porcelain `.M` 内容指纹前后逐位相同：`useNoteCanvasRuntimeController.ts` = `317C8B...6BC88B`，`routes/projections.ts` = `C9072A...E08ED7`；本单未触碰。
- `git diff --check` exit `0`。

未 commit、未 push、未切换或触碰 main；`.codex-tmp/builder.lock.d` 只读确认属于本工单/Fable，未覆盖、未删除。

## Review

复核对象固定为 commit `9c7190c56523fe7e9f2ce53d8403252f8e5e56e6`，其直接父提交为 `910cf1cfb5d1331347f6ad669c64fd22de2c045e`。以下承重证据由 reviewer 在 OS `$TMPDIR` 下的 detached 隔离 worktree 亲取，不以 builder 的 `## Result` 报数代替。

### 判定与分级

**PASS**。分级计数：`BLOCKER 0 / HIGH 0 / MED 0 / LOW 1`。

b-2a Review 的唯一 MED（R5）已经封住：原 canonical alias + 独立复制模块二次 import 的反例现在稳定红；`res.json([])` 与 route-local shadow 也各自在对应结构断言红；注释/字符串不会制造假阳性。F5 证明 helper 仍绑定 named-import + direct-identifier 写法，故记一项 LOW，但不推翻本轮点名 R5 漏径已经被杀死的主结论。放行权仍在 Fable；本 Review 不自行落 checkpoint。

**LOW-1（技术缺陷：结构 killer 对 namespace import 的写法假阳性）**

- 复现：把 canonical import 改为 `import * as notesService from '../services/notes.js'`，GET 仍调用 `notesService.listNotes(...)`；为保持其余 route 最小不动，`restoreNote` / `trashNote` 仍用同模块 named import。server `tsc --noEmit` exit `0`，A-3 与 ownership HTTP 两项仍绿，但 A-1 红在 `routes/notes.ts must import the listNotes export exactly once`，实际 `0 !== 1`。
- 定性：调用仍解析到同一个 canonical export，失败只因 helper 先限定 `NamedImports`，并在后段只接受 `Identifier` callee；因此当前实现是“AST + TypeScript symbol resolution 的混合结构 killer”，不是写法无关的语义解析器。
- 建议放宽：从 GET payload 的实际 callee 出发，同时接受 `Identifier` 与 `PropertyAccessExpression`；对取得的 symbol 做 alias 解析后与 canonical `listNotes` export symbol 比较，并验证 identifier/namespace base 的 import source 解析到 `services/notes.ts`。这样 F1/F3 仍因实际 callee symbol 非 canonical 而红，F4 仍绿，F5 可绿；不再把“恰一个 named ImportSpecifier”或“callee 必须是直接 identifier”当语义本身。

### 5-7 增量协议声明

本轮是修正链中间轮，显式采用 reviewer charter 5-7 增量协议：**基线 = b-2a 主单既有 Review 的 R1–R7**。本轮只全量复验 R5、`910cf1c..9c7190c` 差分面与指定全门；R1–R4、R6–R7 不重复施刀。产品代码在该区间零差分，故这些不变指纹沿用上一轮结论，不把增量范围沉默伪装成全面重验。

### F1–F5 mutation

同一探针先在未改的 `9c7190c` 看见已知阳性：A-1 单跑 exit `0`、`1/1`。随后每刀均先确认是可编译程序，再运行原常驻测试；每刀后反向 patch，还原 route SHA-256 `A3B18C93F2C39087B2AB00018B3095DAA4FED44AC5ACEFC979681C6143FF3902`（该 mutation tree 为 CRLF checkout），并检查 tree clean。

| 位点 | 判定 | reviewer 收据 |
|---|---|---|
| F1＝R5 复验 | **PASS（必红）** | canonical 改为 `listNotes as canonicalListNotes`，新增独立复制实现 `services/listNotesCopy.ts`，再以第二个本地名 `listNotes` 驱动 GET。`tsc` exit `0`；A-1 exit `1`，唯一红为 `must import the listNotes export exactly once`，`2 !== 1`。两个候选分别来自 canonical alias 与 copy import，属于非-canonical binding 结构闸，不是无关 HTTP/fixture 红。还原后 copy 文件不存在。 |
| F2＝M1a | **PASS（仍红）** | 只把 GET response 改为 `res.json([])`；`tsc` exit `0`；A-1 exit `1`，精确红在 `GET / response must come from a service call`。 |
| F3 local shadow | **PASS（必红）** | 在 GET handler 内新增本地 `function listNotes(...) { return []; }` 并让原调用解析到它；`tsc` exit `0`；A-1 exit `1`，精确红在 `must not declare a second listNotes lexical binding`，`1 !== 0`。 |
| F4 文本假阳性 | **PASS（仍绿）** | handler 内加入注释 `F4 listNotes comment probe` 与无副作用字符串表达式 `void 'listNotes'`；`tsc` exit `0`，专项完整 `3/3`。comment 不入 AST、StringLiteral 不是 binding，结构探针未被文本误导。 |
| F5 namespace canonical | **记录态：红，定 LOW-1** | namespace import + `notesService.listNotes(...)` 的语义仍 canonical；`tsc` exit `0`，专项为 `2 pass / 1 fail`，A-3 与 ownership 绿，A-1 只红在 named import 计数 `0 !== 1`。这证明 helper 绑定一种写法，而非完全按 export 语义判定。 |

五刀全还原后，专项重新 `3/3`；mutation tree `git status --porcelain --untracked-files=all` count `0`、`git diff --exit-code` 为 `0`。

### 产品代码零差分与提交完整性

完整、不截断的 `git diff --name-status 910cf1c..9c7190c` 只有两条；`git diff --numstat` 为：

| path | status | `+ / -` |
|---|---|---:|
| `docs/agent-ops/handoffs/2026-08-23-v2bn12-2b2a-fix-a1-same-service-killer.md` | M | `51 / 0` |
| `server/src/__tests__/v2NotesListService.test.ts` | M | `192 / 5` |

- 对 `client/src` + `server/src` 排除 `server/src/__tests__/**` 后，numstat 完整输出 count `0`，`git diff --quiet` exit `0`：**产品码 numstat = 0**。
- package / lockfile 六路径的区间 name diff count `0`；未新增依赖或脚本。工单差分只追加 `## Result`，header 未改。
- `git diff --check 910cf1c..9c7190c` exit `0`。
- 共享树追加本 Review 前先正面看见两处 porcelain `.M`：`client/src/pages/Notes/canvasEngine/hooks/useNoteCanvasRuntimeController.ts`、`server/src/routes/projections.ts`；随后两者各自 `git diff --quiet` exit `0`，且 `git hash-object --path` 分别与 HEAD blob `3efe5f820e2077850611b54d4d09482845e89545`、`561902a449b50ce254b650de5a337973a8fbc26d` 相等，故归因为已点名 EOL/stat 假阳性，不归因给 builder 或 reviewer。

### docs-first 门表

正式 gates tree detached 于精确 `9c7190c`，并在 checkout 前令该 local bare clone 使用 `core.autocrlf=false`。门序从 docs 开始；标准 Vite/Vitest config-loader 的非零如实保留，不伪记为绿。

| 门 | 标准命令收据 | 补证 / 结果 |
|---|---|---|
| 1 `docs:check` | exit `0` | index / inventory 最新 |
| 2 `verify:v2-bn8-runtime` | exit `1`；首个 `test:unit` 在 config-loader 启动前报 `Cannot read directory "../../../../..": Access is denied`，0 assertions | 以 `config:false` + `configFile:false`、同 React plugin / 三项 alias / jsdom / `test/setup.ts` 跑全量 unit：`20/20` files、`211/211`；其余未达 child 全部逐项补跑为绿，见下文 |
| 3 client `tsc --noEmit` | exit `0` | 精确 `9c7190c` |
| 4 server `tsc --noEmit` | exit `0` | 精确 `9c7190c`；F1–F5 各 mutation 下也分别为 `0` |
| 5 `test:unit` | 标准入口 exit `1`，同一 config-loader startup、0 assertions | 同配置的 programmatic 等价入口再次 exit `0`：`20/20`、`211/211` |
| 6 server `test:v2` | exit `0` | `270/270`；独立 `CANVAS_ASSET_DIR` 与 `SOURCE_BLOB_DIR` 收尾均 entry `0`、ReparsePoint `0` |
| 7 `v2NotesListService` 专项 | exit `0` | `3/3` |

`verify` 的未达 child 逐项收据：registry `3/3`；manifest 共 9 tests；manifest check；parity `10/10` 与 parity check；canvas runtime boundary `159` checks；group gallery `5` checks；groups rail / single editor / source experience / legacy shutdown / relation freshness；canvas-engine model contract `60` groups；server production build；performance 5 scenarios；尾段 docs check、`git diff --check`、changed-file secret scan均 exit `0`。标准 `build:client` 也保留同一 config-loader exit `1`；其 `tsc -b` 已先完成，随后 programmatic Vite production build exit `0`、转换 `2184` modules，补足实际 bundle 证明。

另有一条不计代码 finding 的 checkout 收据：第一棵 mutation tree 继承 `core.autocrlf=true`，首次 `docs:check` 报 9 个 INDEX 过期；同一文件的 filtered hash 与 HEAD blob 相等，而共享 LF checkout 的同命令 exit `0`。因此没有改文件“修门”，而是另建 LF gates tree 并从第 1 门重新开始，上表只列正式链。

### 5-2 跨条耦合扫描

- 新增的三个 helper 都只在 `v2NotesListService.test.ts` 内闭环：`normalizedSourcePath` 只被主 helper 使用，`isLexicalBindingIdentifier` 只被主 helper使用，`assertListNotesRouteUsesCanonicalService` 只由 A-1 调用；没有抽出或新增平行“结构断言库”。
- 全仓 TypeScript AST/API 搜索先看见两个已知阳性：本测试的 `parseJsonConfigFileContent` / `createProgram` / `getTypeChecker` / `getAliasedSymbol`，以及既存 `scripts/check-tool-face-parity.mjs` 的 parser-only `createSourceFile`。后者在区间两端 blob 同为 `da3d188e26f895b99e04898a2aa037509c9a196a`、零 diff，是独立 parity gate，不是本单新造的共享库。
- `typescript` 在 `910cf1c` 与 `9c7190c` 的 `server/package.json` 均为既有 devDependency `^5.7.0`；package / lockfile区间零差分。
- 合取结果：R5 旧反例、M1a、local shadow 与文本假阳性四类现在相容；唯一剩余耦合缺口是 F5 所示的 import/callee 语法收窄，已单列 LOW-1。下一单若重写 route import 风格，会出现“产品仍对、护栏先红”的维护摩擦，但不会让本轮旧漏径存活。

### 5-1 收据完备、范围排除与增量边界

- 承重证据已亲取：精确 commit/parent、完整两路径 diff、产品/依赖零差分、helper usage 与全仓 AST consumer 搜索、F1–F5、双 tsc、全量 client/server 测试、专项、build 与 verify child、资产隔离、共享 porcelain 归因及 tree-clean 收据。builder 自报只作导航。
- 标准 Vite/Vitest launcher 的环境红、0 assertions 与 programmatic替代入口均显式记录；初次 CRLF docs 假红也保留成因与重开正式链，没有用“诚实留洞”代替补证。
- 按声明的 5-7 增量边界，本轮不重复 R1–R4、R6–R7 mutations，不重新评价 b-2a 已通过的产品/UI 行为；产品零差分是沿用其基线的前提，不是假称本轮重验。测试-only 修正不做人工浏览器主观视觉/aXe 验收；未连接或写入生产 DB。
- 未改产品代码、其他常驻测试、依赖、脚本或 header；未 staged/commit/push，未切换或触碰 main，未碰 `.codex-tmp/builder.lock.d`。

### 阴性断言的阳性对照与字符串归因

1. A-1 阴性 mutation 前，同一常驻探针先在 baseline 看见 canonical 阳性并 `1/1`；helper 内 lexical negative 前也先断言同一收集器确实包含 canonical import binding。
2. F1 命中后追问两个 `listNotes` 候选是谁写入：一个来自 reviewer 改写的 canonical alias property name，一个来自 reviewer 新增 copy module 的 named import；红点由 route 源码 binding 承载，不来自日志、fixture 或测试自照。
3. F3 的第二 binding 明确来自 reviewer 写入的 route-local `function listNotes`；F4 的 comment/string 也由 reviewer 写入，但同一 AST probe 仍绿，证明文本 token 不冒充 binding。
4. F5 中 `notesService.listNotes` 的 property 确由 canonical namespace import 提供，A-3/ownership 两个 HTTP 阳性仍绿；A-1 却因 named import 数为 0 红，故该字符串归因直接支持 LOW-1，而不是把语义错误贴给产品。
5. 零差分结论先取得完整 2-path positive list，再对产品 pathspec 作 count `0` / diff-quiet；helper/library 阴性也先看见目标 helper与既存 parity parser 两个阳性，再归纳“无新增平行库”。共享 porcelain 同理先承认两个 `.M`，再用承载内容信息的 filtered blob/diff 探针归因为 EOL。

### 隔离树自清收据

- 使用一份 OS temp local bare clone 管理两棵真实 detached worktree：mutation tree 与 LF gates tree，均位于 `C:/Users/70208/AppData/Local/Temp`、精确 HEAD `9c7190c`，不在 repo 内，无 junction/symlink。
- 两树分别在 client/server 执行 `npm ci --offline`：各为 `202 / 212` packages；安装前后递归 ReparsePoint count 均为 `0`，未指向共享 `node_modules`。
- 删除前两树 `git status --porcelain --untracked-files=all` count 均为 `0`、`git diff --exit-code` 均为 `0`、HEAD 相同；三处独立资产目录均 entry `0`、ReparsePoint `0`。
- 先由 local bare clone 对两树执行 `git worktree remove --force`，再非递归删除三个已核空资产目录；bare pack 的只读属性在已核绝对 temp 路径内归一后删除。最终 mutation tree、gates tree、三资产目录与 bare clone 共 6 个精确路径的 `Test-Path` 全为 `False`，无遗留需调度方代清，也未触碰共享依赖。
