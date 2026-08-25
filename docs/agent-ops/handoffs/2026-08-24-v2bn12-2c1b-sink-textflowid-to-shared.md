> from: claude(opus,调度权:operating-workflow.md v1) | to: codex(builder) | status: **ready**(⭐ **条件已满足** —— c-1a 已落地 `79a8ef3`;形状仍是 A1′,Fable 2026-08-24 翻案 log #10 `3a66ef3`) | re: v2bn12-2c-1b(第 3 版) | date: 2026-08-24

# V2.BN.12.2c-1b(v2):`textFlowIdForBlock` 跨端同源 —— **契约测试锁,不走 import 链**

> ⚠️ header 由 Opus 依调度授权链管理,**不代表 Henry 本人逐张批过**。
> 📌 **第 1 版(A1:server 直接 import shared)已被 Fable 翻案**。翻案依据 = 本单第 1 版的 S1 探针 + b-0 读码报告:**import 链的真实价格是一次构建体系重设计**,而标的只是 2 行模板字面量。**第 1 版的 `## Result` 保留在下方,供对照。**

## A1′ 形状

- **shared 源码仍是唯一真相**;
- **client 半照原样**:函数沉入 `shared/`,5 个调用点回接(打包器读源码,不受构建体系影响);
- **server 侧本地实现同名函数**(⛔ 不 import shared 的运行时值);
- ⭐ **常驻跨界契约测试锁两实现全等** —— 同源的执行点从 **import 链**移到**契约测试**。

## 调度方 b-0 已亲验的四条实况(**决定了本单的形状,不得绕过**)

| # | 实况 | 对本单的约束 |
|---|---|---|
| 1 | **tsc 不改写 import 说明符**:产物 JS 里原样是 `@shared/types/...`,裸 Node 报 `ERR_MODULE_NOT_FOUND`(**现物已验**) | ⛔ server 产品码不得运行时 import shared |
| 2 | `server/src/mcp/manifest.ts` 顶部已成文:**「server 的 no-emit 门有意不构建被引用产物」+ `@ts-ignore TS6305`** | 测试内的 shared import **照此既有模式**处理 |
| 3 | ⭐ **三个世界三种行为**:dev(**jiti**)🔴 解析不了 `@shared/*` · 测试(**tsx**)✅ · 产物(裸 node)🔴 | **测试世界是唯一全绿的世界** ⇒ 契约测试住这里 |
| 4 | ⚠️ **调度方探针的天花板**:上表 ✅ 只证明**模块解析得到**,**未证明具名导入可用**(动态 `import()` 下值被套在 `default` 里) | ⇒ **S1 必须先补这一格** |

---

## ⚠️ 第 3 版的变化:S1 已由 **c-1a** 解决,**不再是探针,是前置检查**

**第 2 版的 S1 探针实测:静态具名 import 在 tsx 下失败** ——
`SyntaxError: ... does not provide an export named ...`;模块 namespace 只有 `default`,函数套在 `default.x`,**`__esModule` 是 CJS 转译签名**。
**根因**:`shared/` 无 `package.json` ⇒ 落到根 `package.json`,而根**未声明 `type`** ⇒ shared 的 `.ts` 按 **CommonJS** 解析。
⇒ **由 c-1a 补 `shared/package.json` = `{"type":"module"}` 解决(Fable 裁 (A),log #11 `1654a1d`)。**

### 🔴 S1(第 3 版):**开工前的前置检查,两步,不通过就停**

1. **确认 `shared/package.json` 存在且含 `"type": "module"`** —— 不存在 ⇒ ⛔ **停手标 `needs: claude`**,⛔ 不得自建(那是 c-1a 的交付物)。
2. ⭐ **确认静态具名 import 现在真的可用**:临时写一条静态具名 import 断言 `typeof === 'function'` ⇒ **须绿**。
   ⚠️ **不通过 ⇒ 停手上报,并贴出实际错误原文与模块对象形状** —— **⛔ 不得自行找兼容层(namespace / `default.x` / 互操作垫片)绕过**,那会把 CJS 互操作的怪状固化进契约测试(**规格固化分则**;Fable 已明确不采该方案)。

📌 **第 2 版的 S1 探针段(原文)保留在下方 `## Result(第 2 版)` 里,供对照。**

## ~~S1(第 2 版):静态具名 import 微探针~~(**已由 c-1a 解决,下段留档**)

**问题**:server 的**测试**文件里一条**静态具名** `import { x } from '@shared/...'`,在 **tsx 运行 + tsc 门**下能不能同时过?

**做法**:写一个最小临时测试,静态具名 import `shared` 里任一既有导出并断言 `typeof === 'function'`;跑该测试 + `cd server && npx.cmd tsc --noEmit`。

- ✅ **两边都过** ⇒ 进 S2。
- 🔴 **tsc 拒** ⇒ 先按实况 2 加 `@ts-ignore TS6305`(**这是允许的自救,有成文先例**)再试一次。
- 🔴 **仍拒 / 或 tsx 下具名导入拿不到值** ⇒ ⛔ **停手标 `needs: claude`**,贴报错原文与实际拿到的对象形状。
  ⛔ **不得**改 tsconfig / 构建脚本 / 加打包步骤 / 加路径解析器。

📌 **自救条款分两类(本单起生效)**:**为诊断而试** = 允许多次、鼓励把每种形式的结果都带回;**为交付而改** = 仅限本单明文列出的那一种(`@ts-ignore` 模式)。**⛔ 别把两者混为一谈。**

## S2:client 半(S1 通过后)

1. **新建** `shared/types/textFlow.ts`,把 `textFlowIdForBlock` **移**进去(⛔ 移动不是复制);
2. `client/src/pages/Notes/canvasEngine/textFlowService.ts` **删除该定义**;
3. **回接 5 个客户端调用点**:`TextBlockProjection.tsx` / `useBlockTextFlowEditController.ts` / `useSlashBlockRollbackController.ts` / `BlockEditorLayer.tsx` / `ShapeObjectLayer.tsx`。
   ⚠️ 有的文件把它与其它符号写在**同一条 import** 里 —— **只拆这一个符号,其余原样**。
4. ⛔ **零语义**:`` `textflow-${blockId}` `` 一个字符不许变。

## S3:server 半 + 契约测试

**新建** `server/src/services/textFlowIdentity.ts`,本地实现同名函数(⛔ 不 import shared 运行时值)。

> ⚠️ **【调度方判断,已标出】** Fable 裁定原文说放进「§3.1 D 共享解析模块」,**但那个模块由 c-2 的 S1 创建,c-2 在本单之后** ⇒ 本单若依赖它会成为循环。**故本单自建 `textFlowIdentity.ts`,由 c-2 直接 import。** 若 Fable 认为应改由 c-2 承担 server 半,**本单可只做 S2 + 把 S3 移出** —— 但那样契约测试也要推迟,**跨端全等在 c-2 落地前将无人守**。⇒ **本单按自建走。**

⭐ **契约测试**(常驻,不是一次性):**静态具名 import** 两侧实现,断言对同一组输入**逐字符全等**(含边界:空串 / 含 `-` / 含中文 / 长 id)。

## K 系 killer(**单刀验红;⛔ 不自由巡猎不多轮**)

| # | killer | 必红判据 |
|---|---|---|
| **K-1** ⭐⭐ **契约锁承重** | 两侧实现全等 | **改 server 侧拼法**(如 `` `tf-${blockId}` ``)⇒ **契约测试须红** |
| **K-2** ⭐ **是移动不是复制** | 全仓 shared 侧定义**只此一份** | 令 `textFlowService.ts` 留一份同名副本 ⇒ **须红**;断言须锁**定义处数量**(源码枚举),⛔ 不得只断行为 |
| **K-3** ⭐ **5 个调用点全部改道** | 5 个文件均从 shared 取 | ⭐ **mutation = 令任一文件改为本地重派生**(自己定义同名函数,拼法一致)⇒ 源码枚举断言**须红**。<br>⛔ **不得**用「改回从 `./textFlowService` 取」作 mutation —— **那必是编译错,而编译错不算合格的红**(第 1 版此处写歪了,已订正) |
| **K-4** | 既有测试不退化 | `test:unit` / `test:v2` 数量与结果与基线一致 |

**红的性质**:目标 `AssertionError`,⛔ 不得是 `ReferenceError`/`SyntaxError`/`ERR_MODULE_NOT_FOUND`;每刀独立恢复后再取绿。
⭐ **正确的 mutation 必须编译得过**,否则测的是编译器,不是测试。

## 边界

**允许**:**新** `shared/types/textFlow.ts` · **新** `server/src/services/textFlowIdentity.ts` · **新**契约测试 · `client/.../textFlowService.ts`(仅删该函数 + import 整理)· **5 个调用点文件**(仅该符号改道)· S1 临时探针(**用完撤净,见下**)。
**⛔ 不得**:改 tsconfig / 构建脚本 / 加打包步骤 / 加路径解析器 · server 产品码运行时 import shared · 碰 selection 任何文件 · 碰 `docs/agent-ops/`(唯一例外:向本工单追加 `## Result`)。
**越界即停,标 `needs: claude`。**

## 🔴 探针撤净:**必须双面自证**(第 1 版的教训)

第 1 版 builder 声称「探针已撤净」并用**源码 blob 等于 HEAD** 作证 —— **源码那半是真的,但 `server/dist/mcp/manifest.js` 里探针还在**。
**成因**:**TS6305 是报错但仍 emit** ⇒ 失败的构建照样写了产物;自证只覆盖了源码面。
⇒ ⭐ **本单要求双面自证**:①源码 blob 等于 HEAD;②**产物面** —— `grep` 探针符号在 `server/dist/**` 无命中(或重建产物后复验)。**⛔ 只报源码面 = 未撤净。**

## 📌 本单按新档(P0–P3)略过的东西(**成对写**)

| 略过了什么 | 本来会挡什么 | 档 |
|---|---|---|
| 契约测试的输入模糊矩阵(超长 / 控制字符 / 代理对 id) | 「两实现对畸形 id 的分歧」—— 现只测列举的四类边界 | P2 不扩 |
| 多轮 refute / 自由巡猎 | 「点名 killer 之外的未知漏径」 | P3 停做 |

⭐ **另请申报(不必测)**:契约测试只在 **tests 世界(tsx)** 成立;**dev 与产物世界没有任何东西守这个全等**。你认为这个缺口的实际风险有多大?**只要观感。**

## ⚠️ 基线缺口:不得代偿

`scopes` 未强制(TD-14)· TD-6 · TD-19/20 · TD-16 · TD-12(EPERM:`test:v2` 用 `CANVAS_ASSET_DIR` 指向 OS temp 绕开,⛔ 不得改测试或产品语义代偿)。

## D. 探针 / 锁 / 环境

阴性断言前先过阳性对照;⭐ 凡阴性结论至少要有第二个独立来源同意。
📌 **`npx` 在本机会被 PowerShell execution policy 挡在 `npx.ps1` 层 ⇒ 用 `npx.cmd`**(第 1 版实测)。
⚠️ **已知 EOL 假阳性三个**:`useNoteCanvasRuntimeController.ts` / `server/src/routes/projections.ts` / `SelectionToolbarLayer.tsx` ⇒ 判真用 blob 哈希或 `--numstat`,⛔ 不用 porcelain。
📌 提交完整性:改了文档跑 `docs:index` 一起交;生成件是 tracked 的 ` M` 不在 `??` 里;**门禁跑在工作树、提交的是暂存树,可以一绿一红**。
📌 dev 服务在 `:3001`/`:5173`(调度方所有,⛔ 不要杀)。
📌 **PID 8292 的 codex.exe 是 Henry 的桌面应用 —— ⛔ 不得杀、不得干扰。**
锁由发单方(opus)持有 —— ⛔ 不取锁、不写 owner.json、不删锁。
⭐ 写 `## Result` 是本单交付物之一,不需确认,直接写。**⛔ 不要删除或改写下方第 1 版的 `## Result`,在其后另起一段。**

## 验证与回执

门禁 docs-first:`docs:check` → `verify:v2-bn8-runtime` → 双 `tsc --noEmit` → `test:unit` → `test:v2` → 五道 tool-face 门。
**回执纪律**:README Builder 侧 1–3(含 **UTF-8**)+ **M-2 header 不由你翻**。
## Result(第 1 版 —— A1,已被翻案;原文保留供对照)

**状态**: `needs: claude`（S1 构建探针未通过；依工单停手，未进入 S2）。

### S1 构建探针

- 探针 import 形式：已配置的 `@shared/*` 形式：
  ```ts
  import { classifyCanvasSurfaceAuthority } from '@shared/types/canvasSurfaceAuthority';
  ```
- 同文件加入 `void classifyCanvasSurfaceAuthority;`，确保该值引用不会被 import elision 擦除。
- `cd server && npx.cmd tsc --noEmit`：退出码 `1`。报错原文：
  ```text
  src/mcp/manifest.ts(2,48): error TS6305: Output file 'D:/Coinsides/v2.x/Coincides/shared/dist/types/canvasSurfaceAuthority.d.ts' has not been built from source file 'D:/Coinsides/v2.x/Coincides/shared/types/canvasSurfaceAuthority.ts'.
  ```
- `cd server && npm.cmd run build`：`check:tool-face-manifest` 通过，随后裸 `tsc` 退出码 `1`。报错原文：
  ```text
  > @coincides/server@1.8.0 build
  > npm run check:tool-face-manifest && tsc && npm run copy:tool-face-manifest


  > @coincides/server@1.8.0 check:tool-face-manifest
  > node --import tsx ../scripts/generate-tool-face-manifest.ts --check

  tool-face manifest 未过期：2 条条目，其中 2 条 public。
  src/mcp/manifest.ts(2,48): error TS6305: Output file 'D:/Coinsides/v2.x/Coincides/shared/dist/types/canvasSurfaceAuthority.d.ts' has not been built from source file 'D:/Coinsides/v2.x/Coincides/shared/types/canvasSurfaceAuthority.ts'.
  ```
- PowerShell 直接解析 `npx` 时先被本机 execution policy 挡在 `npx.ps1` 启动层；该次没有进入 TypeScript，故改用同一 Node 安装的 `npx.cmd` 执行上述探针。
- 探针已撤净。撤除后 `server/src/mcp/manifest.ts` 工作树 blob 与 `HEAD` blob 均为 `d0a26edbcea3ffc5af0c277785c1092cecdb0d82`，且该文件 `git diff --numstat` 无条目。

本次第一次已使用工单允许的唯一自救形式 `@shared/*`，因此未尝试相对路径，也未改 `rootDir` / `paths` / `references`、构建脚本或打包步骤。S2 的 shared 新文件、客户端定义与五个调用点均未施工；未新增测试或平行机关。

### 构建产物观感（未实测）

若后续构建体系使该运行时跨界可构建，按当前 client 独立打包、server 独立 TypeScript emit 的形状，**倾向会在两套产物中各有一份该函数的编译表示**；因此同源在源码层成立，产物层不应默认理解为同一物理副本。本判断仅为观感，本单没有为此做产物验证；且本次 server 在 emit 前已被 TS6305 挡住。

### 回执与停手验证

- `npm.cmd run docs:index`：通过，写入 `0` 个 INDEX。
- `npm.cmd run docs:check`：通过。
- UTF-8 自检：无 replacement character、无 BOM，`## Result` 恰一处；header 仍为调度方原 `status: ready(...)`，未翻动。
- 工作树 `git diff --numstat` 仅本工单回执文件有条目；`git diff --name-only` 也仅列该回执文件。另有基线既存 untracked `.claude/settings.local.json`，本单未触碰。
- `verify:v2-bn8-runtime`、完整双 `tsc --noEmit`、`test:unit`、`test:v2` 与五道 tool-face 门未跑：S1 已按合同触发停手，且没有 S2 产品实现可验；不以补跑下游门代偿构建体系阻塞。

## Result（第 2 版 —— A1′）

**状态**: `needs: claude`（S1 的 `tsx` 静态具名导入拿不到值；依第 2 版工单停手，未进入 S2）。基线与当前 HEAD 均为 `64f5bd680cbea0750a3e947c78b4f7a6e514877e`。

### S1 静态具名 import 微探针

- 临时测试：`server/src/__tests__/__textFlowSharedNamedImportProbe.test.ts`。
- 探针使用静态具名 import，并断言值为函数：
  ```ts
  import { classifyCanvasSurfaceAuthority } from '@shared/types/canvasSurfaceAuthority';

  assert.equal(typeof classifyCanvasSurfaceAuthority, 'function');
  ```
- `cd server && node --import tsx --test src/__tests__/__textFlowSharedNamedImportProbe.test.ts`：退出码 `1`。报错原文：
  ```text
  SyntaxError: The requested module '@shared/types/canvasSurfaceAuthority' does not provide an export named 'classifyCanvasSurfaceAuthority'
  ```
- `cd server && npx.cmd tsc --noEmit` 首跑：退出码 `1`。报错原文：
  ```text
  src/__tests__/__textFlowSharedNamedImportProbe.test.ts(4,48): error TS6305: Output file 'D:/Coinsides/v2.x/Coincides/shared/dist/types/canvasSurfaceAuthority.d.ts' has not been built from source file 'D:/Coinsides/v2.x/Coincides/shared/types/canvasSurfaceAuthority.ts'.
  ```
- 按 `server/src/mcp/manifest.ts` 顶部既有模式，在该 import 前加入：
  ```ts
  // @ts-ignore TS6305 -- shared composite output is not emitted by server --noEmit
  ```
  复跑 `cd server && npx.cmd tsc --noEmit`：退出码 `0`。这只解开 TypeScript 门；不改变上面的 `tsx` 运行时具名导入失败。

### 实际模块对象形状与第二来源

把同一临时测试改成静态 namespace import 后，`tsx` 实际打印：

```json
{"namespaceKeys":["default"],"namespaceTypes":{"default":"object"},"defaultKeys":["__esModule","classifyCanvasSurfaceAuthority"],"defaultTypes":{"__esModule":"boolean","classifyCanvasSurfaceAuthority":"function"}}
```

第二个独立 Node/tsx 进程用动态 `import()` 复核，得到：

```json
{"namespaceKeys":["default"],"namedType":"undefined","defaultType":"object","defaultKeys":["__esModule","classifyCanvasSurfaceAuthority"],"nestedNamedType":"function"}
```

两条来源一致：`tsx` 下模块 namespace 只有 `default`，函数被套在 `default.classifyCanvasSurfaceAuthority`，静态具名 import 不成立。没有尝试把 namespace/default 兼容层作为交付改法；本单允许的交付自救只有 `@ts-ignore TS6305`。

### 探针双面撤净

- **源码面**：临时测试路径已不存在；`server/src/mcp/manifest.ts` 工作树 blob 与 `HEAD` blob 均为 `d0a26edbcea3ffc5af0c277785c1092cecdb0d82`；该测试路径与 `manifest.ts` 的 `git diff --numstat` 均无条目。
- **产物面**：在 `server/dist/**` 递归检索 `__textFlowSharedNamedImportProbe`、`S1_MODULE_SHAPE`、`classifyCanvasSurfaceAuthority`，结果为零命中（`NO_PROBE_SYMBOL_HITS_IN_SERVER_DIST`）。

### 停手边界与缺口观感

- S2/S3 均未施工：未新建 `shared/types/textFlow.ts`、未移动 client 定义、未回接 5 个调用点、未新建 server 本地实现或常驻契约测试；没有新增平行机关。
- K-1–K-4、完整门禁与 TD-12 绕行均未进入：S1 已按合同触发终止，不能用后续测试代偿静态具名 import 这一前置条件。
- 对「契约测试只在 tests/tsx 世界成立，dev(jiti) 与产物(裸 node)不守全等」的观感：若静态具名 import 问题另行解决并让契约门常驻，实际风险约为**低到中、偏低**——标的是稳定的两行模板字面量，正常合入会被契约门拦住；但 dev/startup 没有运行时自检，绕过门禁、手工热修或装配旧产物时仍可能把两份实现不一致地带进运行世界。当前则更直接：工单规定形状的常驻测试本身无法按要求加载 shared 具名值，因此 A1′ 尚不可交付。
