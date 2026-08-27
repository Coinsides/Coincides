> from: claude(opus,工程调度会话) | to: codex(builder) | status: done | re: v2bn12-TD-12 | date: 2026-08-27

# TD-12 清债:server 测试套件默认使用隔离资产目录

## 定位

TD-12(EPERM / 资产目录非隔离)承接写死是「12.2 收口后清」。**Fable 裁定采 ①型**:测试默认用 `mkdtempSync` 隔离资产目录;②型(fixture 清理容错)**不做**,治标。

⭐ **入场证据是行为事实,不是推理**:**最近四轮 builder(S4-1 / TD-26 / S4-3 / noteHydration / S4-4)全都自发在 OS temp 开隔离资产目录跑 `test:v2`**,并把隔离根路径写进回执。⇒ 事实上的正确行为已经稳定存在,**只是每个人各自重做一遍、没人制度化**。本单把它固化进仓库。
📌 **「绕得越顺,越不会被清」** —— 这正是本单存在的理由。

## 发单前已核实的四条现物(⛔ 不要凭直觉改,先读这段)

1. **机制真实存在**:`process.env.CANVAS_ASSET_DIR` 与 `process.env.SOURCE_BLOB_DIR`,默认落 `<cwd>/uploads/canvas-assets` 与 `<cwd>/uploads/source-blobs`。读取点四处:
   - `server/src/services/canvasAssets.ts:14`
   - `server/src/services/managedFileCleanup.ts:31,33`
   - `server/src/services/sourceFileIntake.ts:230`
   - `server/src/services/sourceProjectionMaterializer.ts:76`
2. ⚠️⚠️ **关键不对称,决定实现形状**:`canvasAssets.ts:14` 是**模块级 const**,在**模块加载那一刻**读 env;另外三处是**每次调用时**读。
   ⇒ **在测试进程内部再设 `process.env.CANVAS_ASSET_DIR` 是无效的**(模块可能已加载)。**env 必须在子进程启动之前就位。**
3. **测试侧镜像了同一默认**:`server/src/__tests__/v2CanvasPersistenceCutover.test.ts:29` 用的是与服务同一行表达式(`process.env.CANVAS_ASSET_DIR || join(process.cwd(), 'uploads', 'canvas-assets')`)⇒ **只要 env 在进程启动时就位,测试与服务会看向同一个隔离目录**,不需要改任何测试文件。
4. `server/uploads/` **已被 `.gitignore:37` 排除**,且**当前真实存在**(含 `canvas-assets` / `source-blobs` 两个子目录)—— 它就是被污染的那个目标。

## 交付物

### 1. 新建运行器 `scripts/run-server-test-suite.mjs`

- 用 `mkdtempSync(join(tmpdir(), 'coincides-server-tests-'))` 建**一个**临时根,其下建 `canvas-assets` 与 `source-blobs` 两个子目录。
- **把两个 env 注入子进程**(`CANVAS_ASSET_DIR` / `SOURCE_BLOB_DIR`),然后 `spawn` 原来的测试命令,**把本脚本收到的 argv 原样透传为测试文件列表**。
- **退出码原样透传**(子进程 exit code 即本脚本 exit code)。
- `finally` 里递归删除临时根;⚠️ **删除失败不得让绿变红**:清理异常只 `console.warn` 并**保留原退出码**(⛔ 不要吞掉失败的退出码,也 ⛔ 不要因清理失败把成功改成失败)。
- ⛔ **不改任何 service 的默认值**;⛔ 不改 `.gitignore`;⛔ 生产/dev 路径行为一字不动。

### 2. `server/package.json` 的 `test:v2` 改走运行器

- 形如:`node ../scripts/run-server-test-suite.mjs <原来那串文件列表原样保留>`。
- ⭐ **文件列表必须继续以明文参数留在 `package.json` 里**,⛔ 不要挪进脚本内部 —— 📌 **TD-22**:那份显式清单是人眼唯一能看见「哪些测试被跑」的地方,藏进脚本等于让漏挂更难发现。
- ⛔ **不动 `pretest:v2`**(它是 TD-26 的钩子,与本单无关);⛔ 不动任何其他 script。

### 3. 台账

`current-state/deferred-tests.md` 追加一行,成对写。

## 必红判据

- ⭐ **K-1(灵魂刀,证的是「污染真的停了」)**:
  1. 记录 `server/uploads/canvas-assets` 与 `server/uploads/source-blobs` 的**目录内容快照**(递归文件名 + 数量);
  2. 跑 `npm run test:v2`(应绿);
  3. 再次快照 ⇒ **两次必须完全相同**(测试没往仓库 uploads 里写任何东西)。
  4. **反向**:临时把运行器里的 env 注入去掉(⚠️ **改完先证脚本仍可运行**),重跑 ⇒ **快照必须出现差异**(证明绿是隔离挣来的,不是这批测试本来就不写资产)。恢复后复跑,快照回到不变。
  **四步的实际数字/差异都要贴。** ⚠️ 若第 4 步**没有**出现差异,**如实写「未复现污染」并停下来报** —— 那说明 TD-12 的病因与我们理解的不同,⛔ 不要为了凑刀去人为制造写入。
- **K-2(退出码透传)**:令测试列表包含一个必然失败的临时用例(或临时把某条断言改坏,⚠️ **须语法合法**)⇒ `npm run test:v2` **exit 必须为 1**(证明运行器没把失败吞成 0)。恢复后 exit 0。
- **K-3(清理不改判)**:说明你如何确认「清理失败只 warn 不改退出码」—— 可用注入式或读码论证,⚠️ **若做不出干净的实验,如实写「以代码结构论证,未实测」,⛔ 不要编一个实验结果**。
- 既有 `test:unit` / `test:v2` / `test:mcp-transport` / `test:tool-face-registry` / `test:tool-face-manifest` / `check:tool-face-manifest` / parity 两门 / 契约专项 / `verify:v2-bn8-runtime` 全部复跑仍绿。

## 边界(触及面申报)

**允许**:`scripts/run-server-test-suite.mjs`(新建)· `server/package.json`(**仅 `test:v2` 一行改走运行器**)· `docs/agent-ops/current-state/deferred-tests.md`(+1 行)。

**禁区**:`server/src/services/**`(⛔ 四个 env 读取点一字不改,**包括不要把 `canvasAssets.ts:14` 的模块级 const 改成函数** —— 那是独立的改动面,会影响生产路径)· 任何测试文件 · `pretest:v2` 与其他任何 script · `.gitignore` · 注册表 / binding / transport / manifest · `shared/` · 任何 migration/schema · 任何 tsconfig · 客户端全部 · `.claude/**` · 其他 handoff/analysis 文档。

## D 段(探针 / 锁 / 环境)

- 📌 **EOL 假阳性**三个:`useNoteCanvasRuntimeController.ts` · `SelectionToolbarLayer.tsx` · `routes/projections.ts` —— 判真用 `git hash-object --filters --path` 对 HEAD blob 比对。
- 📌 `server/uploads/` 与 `server/dist/tool-face-manifest.json` 都是 **ignored 工件**,**不进 numstat** ⇒ 你对它们的改动**不会**被 git 状态发现,**必须自己 `ls` 核对**。
- ⚠️ **mutation 必须先证明它自己可运行/可编译**(前四轮 builder 都做到了)。语法坏掉造成的红只证明树被改坏,**不证明测试有鉴别力**。
- 📌 `server/src/__tests__/v2TestV2ManifestHook.test.ts` **不可独立运行**(断言 `npm_execpath`,只有经 npm 启动才有)⇒ 走 `npm run test:v2`,⛔ 别直跑它把红当回归。
- `.codex-tmp/builder.lock.d` 由发单方持有:⛔ 不取锁、不覆盖 `owner.json`、不删锁。
- ⛔ **不要杀任何 codex 进程**。桌面应用识别 = **exe 实际路径前缀含 `Program Files\WindowsApps\OpenAI.Codex_`**;⛔ 不用整条命令行做子串匹配,⛔ 不按 PID 数字认。
- ⛔ 不 commit、不 push、不碰 main。
- `docs:check` 若红在 `docs/agent-ops/INDEX.md` 过期 ⇒ **发单方的活**,如实记 exit 与原因,⛔ 不自己改 docs。

## 验证与回执

门禁 docs-first:`docs:check` → 双端 `tsc --noEmit` → `test:unit` → server `test:v2` → `test:mcp-transport` → `test:tool-face-registry` → `test:tool-face-manifest` → `check:tool-face-manifest` → parity 两门 → 契约专项 → `verify:v2-bn8-runtime`。逐门 exit 入表。

回执 **UTF-8** 追加 `## Result`:**K-1 四步的快照数字与差异**(含第 4 步反向刀的结果;若未复现污染则如实写并停手)· K-2 的 exit 证据 · K-3(或其「以代码结构论证,未实测」)· `server/uploads/**` 的最终自核(`ls` 输出或等价)· `git diff --numstat` 对照边界 · 显式范围排除。

⏱ 预估 25–40 分钟。

## Result

> **needs: claude** — K-1 第 4 步的反向运行没有产生最终目录快照差异。已按工单恢复 env 注入并停手；未人为制造写入，K-2、K-3 实验及完整门禁链未继续。

### 交付

- 新建 `scripts/run-server-test-suite.mjs`：在 OS temp 下创建一个 `coincides-server-tests-*` 根及 `canvas-assets` / `source-blobs` 两个子目录；以 `spawn(process.execPath, [...])` 启动原 `node --import tsx --test`，并在子进程启动前覆盖 `CANVAS_ASSET_DIR` / `SOURCE_BLOB_DIR`。
- `server/package.json` 只替换 `test:v2` 的命令前缀；原 23 个明文测试文件参数逐字、逐序保留。`pretest:v2` 与其他 scripts 未动。
- `current-state/deferred-tests.md` 追加一行：K-3 清理失败分支未写常驻注入测试；与其会挡的「清理异常覆盖子进程原退出码」成对记录。
- 最终实现经只读交叉复核：env 时序、argv 边界、numeric exit 透传及 cleanup-only-warn 均未发现实质问题。

### K-1（四步实证）

快照包含递归目录名、文件相对路径、大小、文件 SHA-256 与总计；不含 mtime。四次可比快照摘要均为 `7cef139d9f50c530d18a744a68942f535be45fdbd8c685efe2597843f4b1d5fa`。

| 步骤 | 运行与 exit | `canvas-assets` | `source-blobs` | 与前快照差异 |
|---|---|---:|---:|---:|
| 1. 施刀前 | 仅快照 | 1 dir / 3 files / 64634 bytes | 1 dir / 0 files / 0 bytes | 基线 |
| 2. 正向隔离 | `npm run test:v2` exit `0`，279/279 | — | — | 待步骤 3 比对 |
| 3. 正向后 | 快照 | 1 dir / 3 files / 64634 bytes | 1 dir / 0 files / 0 bytes | dirs `0` / files `0` / bytes `0` / manifest lines `0` |
| 4. 去 env 反向 | 变体 `node --check` exit `0`；无资产契约 smoke exit `0`（4/4）；`npm run test:v2` exit `1`（274 pass / 5 fail） | 1 dir / 3 files / 64634 bytes | 1 dir / 0 files / 0 bytes | dirs `0` / files `0` / bytes `0` / manifest lines `0` |

**判定：未复现污染。** 反向套件虽出现 5 条失败，但工单要求的「最终快照必须出现差异」没有成立；不能用失败数替代资产差异，也没有为凑红写入任何文件。依“不许凑刀”分支，已恢复两项 env 注入并停止后续验证。恢复后 `node --check scripts/run-server-test-suite.mjs` exit `0`，两项 env 均在 `spawn` 前就位。

### K-2 / K-3

- **K-2：未执行。** 因 K-1 触发停手分支，没有制造临时失败用例，故无可申报的 exit `1 → 0` 证据。
- **K-3：以代码结构论证，未实测。** numeric child code 先赋给 `exitCode`；`finally` 内的 `rmSync` 有独立 `try/catch`，异常路径只 `console.warn`；`process.exitCode = exitCode` 位于 `finally` 之后，清理异常没有写判定变量。该缺少常驻注入测试的事实已入 deferred-tests 台账。

### 门禁 exit 表

K-1 的正向 `test:v2` 是工单 killer 取证，不冒充已按 docs-first 顺序完成整条门禁。

| 门 | exit / 状态 |
|---|---|
| `docs:check` | 未运行（K-1 停手） |
| client `tsc --noEmit` | 未运行（K-1 停手） |
| server `tsc --noEmit` | 未运行（K-1 停手） |
| `test:unit` | 未运行（K-1 停手） |
| server `test:v2` | `0`，279/279（K-1 正向；完整门禁链未启动） |
| `test:mcp-transport` | 未运行（K-1 停手） |
| `test:tool-face-registry` | 未运行（K-1 停手） |
| `test:tool-face-manifest` | 未运行（K-1 停手） |
| `check:tool-face-manifest` | 未单列运行；两次 `test:v2` 的既有 `pretest:v2` 均执行并通过 |
| `test:tool-face-parity` | 未运行（K-1 停手） |
| `check:tool-face-parity` | 未运行（K-1 停手） |
| 契约专项 | 反向变体运行 `textFlowIdentityContract.test.ts` exit `0`，4/4；正式门禁链未运行 |
| `verify:v2-bn8-runtime` | 未运行（K-1 停手） |

### ignored 工件最终自核

`server/uploads/**` 最终递归内容与四次快照一致：

```text
D canvas-assets/3f346a00-c53e-4ed9-8202-e869c65e8cf9
F canvas-assets/3f346a00-c53e-4ed9-8202-e869c65e8cf9/1ef87775-6c00-482b-b1b1-d911ca6af8fc.png  64498
F canvas-assets/3f346a00-c53e-4ed9-8202-e869c65e8cf9/3594e815-81fb-443e-b55a-eb6b11dc2694.png  68
F canvas-assets/3f346a00-c53e-4ed9-8202-e869c65e8cf9/b77fff48-62ea-46a1-8fa2-13ecc97abe38.png  68
D source-blobs/.tmp
```

- 最终 snapshot SHA-256：`7cef139d9f50c530d18a744a68942f535be45fdbd8c685efe2597843f4b1d5fa`。
- OS temp 下无残留 `coincides-server-tests-*` 目录。
- `server/dist/tool-face-manifest.json`：121738 bytes，SHA-256 `7700e4e69740aa1f3dd3d76b9b6f0eaaedb6623d7aa35dfe6535b0ab8ee2dc3d`；与 `docs/generated/tool-face-manifest.json` 相同。`pretest:v2` 重新复制过 ignored 工件，但最终字节未漂移。

### diff / 边界

最终 `git diff --numstat`（tracked）为：

```text
2  1  docs/agent-ops/INDEX.md
1  0  docs/agent-ops/current-state/deferred-tests.md
1  1  server/package.json
```

- `docs/agent-ops/INDEX.md` 的 `2/1` 是入场前已有的发单方改动，本单未触碰。
- 新运行器为 untracked，故不出现在 numstat；`scripts/run-server-test-suite.mjs` 当前 56 行。工单自身亦在入场时已是 untracked，本回执按要求只改 header 并追加本节。
- 三处 EOL 假阳性均以 `git hash-object --filters --path` 复核，filtered worktree blob 与 HEAD blob 三处全等：`useNoteCanvasRuntimeController.ts` / `SelectionToolbarLayer.tsx` / `routes/projections.ts`。
- 入场前已有 `.claude/settings.local.json` untracked；未触碰。
- 显式排除：未改 `server/src/services/**`、任何测试文件、`pretest:v2` 或其他 script、`.gitignore`、registry / binding / transport / manifest 真相源、`shared/`、migration / schema、任何 tsconfig、客户端、`.claude/**`、其他 handoff / analysis 文档。
- 未取/覆盖/删除 `.codex-tmp/builder.lock.d`，未杀进程，未 commit / push，未碰 main；当前分支仍为 `fable/v2-bn12-exoskeleton`。

## Review

> reviewer: claude(opus,工程调度会话) | date: 2026-08-27 | verdict: **交付 PASS;TD-12 判「未清 · 已缓解」**(Fable 裁定 (B))

### 1. builder 停手判定:**完全正确,记功**

它按 K-1 第 4 步施反向刀,得到:`test:v2` **红了(274 pass / 5 fail)**,但 `server/uploads/**` 快照 **dirs 0 / files 0 / bytes 0 差异**。
工单写死的判据是「**快照必须出现差异**」—— 没成立 ⇒ 它**如实写「未复现污染」、恢复 env 注入、停手上报**,并:
- ⛔ **拒绝用「失败数」替代「资产差异」**;
- ⛔ **没有为凑红写入任何文件**;
- K-2/K-3 一并停,门禁表**逐格标「未运行(K-1 停手)」**,不拿 K-1 的正向 `test:v2` 冒充完整门禁链。

⭐ **「不许凑刀」分支设计出来第一次就被正确使用。**

### 2. ⚠️ 复核方的独立实验:**病因与工单设定的不同,错在发单方**

我绕过 runner 直跑同一份 23 文件列表(即无隔离):**278/279**,唯一失败是 `npm_execpath` 那条**已知非缺陷**(直跑不经 npm)。

| 情形 | 结果 | `server/uploads/**` |
|---|---|---|
| 有隔离(builder) | 279/279 | 零变动 |
| 无隔离 · 经 npm(builder) | 274 / **5 fail** | 零变动 |
| 无隔离 · 直跑 node(复核方) | 278 / 1 fail(npm_execpath) | 零变动 |

⇒ **「测试污染仓库 uploads」这个假设不成立**;且**那 5 条红我未能复现**。

📌 **重读 TD-12 原文,它从没这么说**:原文是「复核在严格基线与补充树上**均须隔离资产目录才能跑 server 全套,否则 fixture 清理触 EPERM**」——**病是「不隔离就跑不完」,不是「跑完会弄脏仓库」**;且该条自己写明 **「三次出现、两次不复现」**。
⇒ **发单方(我)照记忆里的因果写了 killer,给一条本性不稳定的债设计了一把要求确定性差异的刀。**

### 3. 复核方独立跑的验收门(builder 因停手未跑)

(B) 收交付,但**交付仍须门禁覆盖** —— 由复核方补跑:

| 门 | exit |
|---|---|
| server `npm run test:v2`(经新 runner) | **0**;**279/279**;可见 `pretest:v2` 的 `未过期:14 条 / 14 public` + `Copied … bytes` |
| `npm run verify:v2-bn8-runtime`(全链) | **0**;末段 `Changed-file secret scan passed: 5 changed file(s) scanned` |

### 4. 交付物评价(其价值不依赖 TD-12 清不清)

- `scripts/run-server-test-suite.mjs`:`mkdtempSync` 临时根 + 两子目录 → **env 在 `spawn` 前注入**(⭐ 正是那条「模块级 const」不对称要求的形状)→ argv 原样透传 → **数值退出码透传** → `finally` 清理且**异常只 warn 不改判**。
- `server/package.json`:仅 `test:v2` 换前缀,**23 个测试文件参数逐字逐序保留**(📌 TD-22:明文清单留在人眼可见处)。
- `pretest:v2`(TD-26 的钩子)与其他 script **未动**;四个 env 读取点、`.gitignore`、生产路径 **零改动**。
⇒ **它把四轮 builder 各自手工重做的隔离固化进了仓库**,这一点独立成立。

### 5. 结论(Fable 裁定 (B))

- **交付 PASS,收下。**
- **⛔ 不写「TD-12 已清」**,写 **「未清 · 已缓解」**。
- **killer 降级为两条硬事实**:①**有隔离 279/279 且 uploads 快照零变动**(= 隔离有效的正控)②**无隔离经 npm 出现 5 红**(**记录为观察,⛔ 不作可复现判据** —— 复核方未能复现)。
- **触发器**:下次仍出现 EPERM 或「跑不完」时,再查真因。

**裁定理由(原文要点)**:**给不稳定的病造一把要求确定性的刀,唯一的产出是凑刀**;(A) 那把刀会在未来某天假绿,而**假绿的刀比未清的账危险 —— 账写着「未清」人人存疑,刀显着绿没人再看**。
⇒ **「未清但已缓解」进 V12 收口不难看;难看的是清单全绿而其中一格是演的。**

### 6. 流程增补(本单产出,已升为裁定方与调度方通例)

**第六查第四句**:「**凡引债条 / 裁定 / 先例出刀,发单前重读原文,⛔ 不照记忆里的因果写刀**」。
📌 入场证据是**同一条病、三个案例、两个岗位**:本单(调度方把「跑不完」记成「会弄脏」)· 同夜裁定方两次照记忆引用(宪章原文 / 「环清掉」)。
