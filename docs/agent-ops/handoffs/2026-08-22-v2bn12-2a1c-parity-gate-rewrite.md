> from: claude(opus,调度权:operating-workflow.md v1) | to: codex(builder) | status: done(复核 PASS @ rfix1c Review,Fable 放行 log 08-22 #11;复核 PASS 0B/0H/0M/0L @ 1c-fix Review,2026-08-22 Opus 翻牌;12.2a-1b 已复核 PASS 并接入主链,manifest 已在;Fable 放行 log 08-22 #9) | re: v2bn12-2a-1c | date: 2026-08-22

# V2.BN.12.2a-1c:机械门重写(只吃 manifest)

> ⚠️ header 的 `ready` 由 Opus 依调度授权链翻牌,**不代表 Henry 本人逐张批过**。
> **开工条件已满足**:12.2a-1b 主单/fix/fix2 三张均已 `done`(复核 PASS 0B/0H/0M/1L),`docs/generated/tool-face-manifest.json` 已存在并由三道门守着(`test:tool-face-registry` / `test:tool-face-manifest` / `check:tool-face-manifest`,均已接入 `verify:v2-bn8-runtime`)。

## 定位

前身 `scripts/check-tool-face-parity.mjs` 复核判 **FAIL(方向不成立)**:它从源码截片 + `new Function` 取条目,`routeMounted()` 只做前缀命中,`rawMethod` 根本不参与判断,client 侧只验「有个同名 symbol」。**reviewer 在隔离 worktree 用 `POST /api/health/not-real` + 伪 call-site 实测,门仍 `[PASS]` exit 0。**

> **本单是重写,不是修补。** 请按「只吃 manifest」重新设计,**不要试图救活旧实现的路径**。

## 上游

`analysis/2026-08-21-mcp-tool-face-design.md` **v0.5 §3.1「机械门口径随之修正」**(三条)+ 前身工单 `## Review` HIGH-1 / MED-1 / MED-2。

## ⭐ 上游设计不变量(2026-08-22 新立,直接决定本单职责)

> **manifest = 注册表的忠实投影,不是暴露清单。**
> **过滤只许发生在两处:①本单的机械门 killer ②12.2b 的 MCP `tools/list`(`exposure==='public'` 且剔 `__` kind,TD-4)。**

**这条对本单的含义要说透**:

manifest 里**会**出现 `exposure:'test'` 与 `__` 前缀的条目 —— **这是刻意的,不是上游没滤干净。** 若生成器提前滤掉,**你的两条 killer 将永远见不到靶子,门会变成永远不会红的绿灯** —— **那正是 S1 第一版失败的形状(对伪造数据判绿)。**

⇒ **本单是「拒绝」这件事第一次真正发生的地方。** 你的门必须**主动认出并拒绝**它们,而不是假设上游已经处理过。

## 交付物

**重写 `scripts/check-tool-face-parity.mjs`**:输入**只有** `docs/generated/tool-face-manifest.json`。**⛔ 禁止 `new Function`、禁止解析任何源码取条目。**

### 判据(必须真的成立,不是形式上跑一遍)

| # | 要求 |
|---|---|
| **G-1 route 须组合验证** | 建立 `{method, fullPath, mountedRouterModule}` 路由图:组合 `server/src/index.ts` 的 mount 与对应 router 模块的 leaf route,**`method` 必须参与比较**(前身 `rawMethod` 只进报错文字)。**前缀命中不算命中。** |
| **G-2 client 侧须验构造** | containment 用 `path.relative()` **严格限定在 `client/src`**(前身 `CLIENT_ROOT` 实为 `client/`,与报错文字自相矛盾);且须在声明的 file/symbol **内部**至少核对**相同 method + 规范化 URL 字面/模板前缀** —— **「存在同名 symbol」不构成「该 symbol 构造了该 URL」。** |
| **G-3 空表不得 PASS** | manifest 为空或 0 条 public 时,输出「0 条 public 条目受检,未证明任何 parity」并 exit 0,**不得输出 PASS 字样**。 |
| **G-4 成功输出须自陈边界** | 成功输出须形如 `[PASS] tool-face necessary-condition gate: N public entries checked; human reachability NOT VERIFIED; journey pending`。**必须报条目数**;**不得宣称证明了「人类可达」**——那是必要条件,充分性由 S7 旅程补。 |
| **G-5 三条独立 killer** | ①真实 route 正控(用真实存在的 route + 真实 client 调用点,须绿)②`exposure:'test'` 条目进 public 派生面须红 ③`__` 前缀条目进 public 须红。**②③ 必须彼此独立可触发**(前身条件 `public && test` 恒假)。 |

## ⭐ 本单是「单交付物」

**只重写 `scripts/check-tool-face-parity.mjs` 一件。** 设计已拍死(§3.1 及其 08-22 补注),不留设计余地;**若你认为设计有问题,停手标 `needs: claude`,不要自行改设计。**

## 可顺带清理的两项(**非必须,做了要申报**)

| 项 | 说明 |
|---|---|
| **旧脚本的死引用** | 现 `scripts/check-tool-face-parity.mjs:8` 仍 import 已删除的 `shared/types/toolRegistry`,独立手跑 exit 1(「未找到 ToolRegistry」)。**本单重写它,该引用自然消失** —— 请确认重写后全仓对 `shared/types/toolRegistry` 的引用为 **0**(阳性对照:先证明探针能命中重写前的那一处)。 |
| **fixture 名实不符**(TD-1b 清理项) | `scripts/generate-tool-face-manifest.test.ts` 里 `internal_probe` 的 exposure 实为 `public`。**上一轮正因有人按名字推断而写出不实叙述。** 若你触及该文件可顺带对齐名实(**killer 强度不得下降** —— 基数断言须在加过滤时仍红);**不触及则不动**。 |

## 边界

**允许**:`scripts/check-tool-face-parity.mjs` 重写 · 相应常驻测试 · `package.json` 脚本条目。
**⛔ 不得**:改 `server/src/toolFace/registry.ts` 或 manifest 生成器(**上游权威,你只消费**;若 manifest 缺字段,**停下标 `needs: claude`,不要自行加字段或绕过**)· 接线进 `verify:v2-bn8-runtime`(待复核 PASS 后由调度方接)· 碰 12.1 线 / v1 线 / legacy `toolDefinitions`。

> ⭐ **本单最重要的边界**:你手里除了 manifest 什么都没有。**若你发现自己想去读源码取工具信息,那就是前身失败的那条路** —— 停下,报缺字段。

## ⭐ 12.1 线四轮的实证教训(本单直接吃,不是套话)

| # | 教训 | 出处 |
|---|---|---|
| 1 | **「API 不存在」的红不承重** —— 红必须来自「实现存在但写错」,不是「函数没定义」 | 12.1.3 复核 FAIL 的直接原因 |
| 2 | **测了逻辑 ≠ 测了接线** —— 6 条测试全绿,而删掉生产调用者后**依然全绿** | 12.1.3 复核 X3 |
| 3 | **mock 掉正门 = 护栏自证** —— harness 整体 mock 生产中间层,把该正门关键入参改坏仍 209/209 全绿 | 12.1.4 复核 FAIL 落点 |

**对本单的具体要求**:G-5 三条 killer 的红,**必须由「门存在但判错」触发**;若你的测试是「门函数不存在所以报错」,不算数。**并且须有一条能杀死「门根本没被调用」。**

## D. 探针先过阳性对照(`adjudication §7`,含反面分则)

- **正面**:任何阴性断言前,先让同一探针看见一个已知阳性实例。
- ⭐ **反面(2026-08-22 新立)**:**先确认探针的命中不是来自你自己刚写进去的东西。** 阳性对照防「探针瞎了」,防不了「探针照见了自己」。
- 📌 **本环境陷阱**:`.git/index` 只读 ⇒ `git status` porcelain 有 stat/EOL 假阳性 `.M`;`git diff --stat` **不显示 untracked**。**判文件是否真改用 blob 哈希或 `--numstat`。**

## 验证与回执

门禁 docs-first 顺序;回执纪律 README Builder 1–3(含 **UTF-8**);**M-1 mutation 归复核方**(你的 self-test 只作前置自查)、**M-2 header 不由你翻**。

**回执须含**:G-1..G-5 逐条如何满足(**G-5 三条 killer 各给一段实际输出**)· 路由图构建方式 · manifest 消费方式(证明零源码解析)· 四门逐条收据 · 触及面 diff vs 申报 · 显式范围排除。

## Result

Codex builder 已完成实现与前置自查；依用户指示未改 header，结论与 mutation 放行仍归 reviewer / 调度方。

### 交付与边界

- **重写正门**：`scripts/check-tool-face-parity.mjs` 不再 import 旧 registry、不再截取/执行源码条目，也没有 `new Function`。工具的 `name` / `exposure` / `human_entry.route` / `human_entry.client_call_site` 只从 `docs/generated/tool-face-manifest.json` 读取；server/client AST 只作为核验这些既有声明的证据，不用于发现、补全或生成工具条目。
- **常驻测试**：新增 `scripts/check-tool-face-parity.test.mjs`，通过同一个 production evaluator 及同一个 CLI 入口覆盖 G-1..G-5、reviewer 的旧假绿形状与 client method 反例；没有另造 parity 判定器。
- **独立脚本**：`package.json` 新增 `test:tool-face-parity`。`check:tool-face-parity` 仍为 production CLI；两者均未接入 `docs:check` 或 `verify:v2-bn8-runtime`。
- **生成件副作用**：新增 package script 令 object inventory 合法过期，运行 `docs:inventory` 后，`docs/generated/object-inventory.md` 只把“门外脚本”计数从 1 改为 2，并新增 `test:tool-face-parity` 一行。
- **manifest 字段充足**：真实正控 `list_notes` 已声明 `GET /api/notes` 与 `client/src/pages/Courses/CourseDetail.tsx#fetchSummary`，无需 `needs: claude`，也未改 registry、generator 或 manifest schema / 产物。

### G-1..G-5

| 判据 | 实现与常驻证据 |
|---|---|
| **G-1** | 用 TypeScript AST 读取 `server/src/index.ts` 的 default router import 与 `app.use(mountPath, router)`，再只沿对应模块的 `export default <identifier>` router 收集 `router.METHOD(leafPath)` / `router.route(leafPath).METHOD()`；产出 `{method, fullPath, mountedRouterModule, mountPath, leafPath}`，同模块未 export 的 decoy Router 不入图。匹配必须同时满足 method 与规范化后的完整 path，直接 `app.METHOD` route 也入图。测试固定证明 `GET /api/notes` 来自 `server/src/routes/notes.ts`，并分别让真实 production npm 入口拒绝 method 错的 `POST /api/health` 与同 method 但 full-path 错的 `GET /api/health/not-real`。
| **G-2** | 用 `path.relative()` 把 call-site 严格锁在 `client/src` 内；AST 精确定位声明的 `file#symbol` 子树，只接受该文件对 canonical `client/src/services/api.ts` 的 default import，并从其 `axios.create({baseURL})` 静态求出 `/api`。仅在 symbol 内收集 `api.METHOD(literal/template)`，比较相同 method 与规范化 URL segment；`App#App`、越界路径、真实 route + 错 client method，以及同为 GET 但目标 URL 不同的 `/api/health` + `fetchSummary` 均红。
| **G-3** | 空 manifest 或 0 public 返回 exit 0，但只输出 `[INFO] ... 0 条 public 条目受检，未证明任何 parity ...`，不含 `[PASS]`；CLI 常驻测试直接断言 exit 与文本。
| **G-4** | 非空成功输出固定为 `[PASS] tool-face necessary-condition gate: N public entries checked; human reachability NOT VERIFIED; journey pending`；失败也保留相同边界陈述与条目数。
| **G-5** | `selectPublicEntries()` 只派生 `exposure==='public'`；调用 selector 前先保存不可变 provenance（原对象引用、原 name/exposure、完整序列快照），`validatePublicProjection()` 据此独立复核 candidate 未被变换、原 manifest exposure 必须 public、且不得有 `__` 前缀，各条件不合并，覆盖计数也不读取 selector 可能改写后的 manifest。负控同时覆盖 clone 后篡 exposure 与原地篡 exposure，防止按 name / 篡后字段自证。真实 manifest 正控、故障 selector 泄漏 test 条目、public `__` 条目三者各自触发；当前生产 manifest 只有一个 public 条目，因此两条负控使用 manifest-shaped fixture，且都走 production evaluator。

三条 killer 的实际关键输出（`npm.cmd run test:tool-face-parity`；npm wrapper 两行前缀略）：

```text
KILLER real_route_positive
[PASS] tool-face necessary-condition gate: 1 public entries checked; human reachability NOT VERIFIED; journey pending
```

```text
KILLER exposure_test_leak
[FAIL] tool-face necessary-condition gate: 1 public entries checked; human reachability NOT VERIFIED; journey pending
- non-public entry leaked into public projection: test_probe (exposure=test)
```

```text
KILLER reserved_public
[FAIL] tool-face necessary-condition gate: 1 public entries checked; human reachability NOT VERIFIED; journey pending
- reserved __ entry entered public projection: __reserved_probe
```

test killer 另先证明同一条 `exposure:'test'` 在正常 selector 下得到 0-public neutral，避免把“manifest 忠实包含 test”误写成“manifest 本身应红”。两条负控的红来自已存在 production validator 的具体错误文本，不来自缺函数/导入/语法错误。所有 CLI fixture 都经真实 `npm run check:tool-face-parity` package 入口。接线测试先跑真实 manifest 绿，再喂 `POST /api/health/not-real` + `client/src/App.tsx#App`，断言 exit 1、同时出现 route/client 两条语义错误并排除 `ReferenceError|SyntaxError|ERR_MODULE_NOT_FOUND`；若 package 入口或 CLI main 根本不调用 gate，该测试会假绿并失败。

### 验证收据（docs-first）

| 顺序 | 命令 | 收据 |
|---|---|---|
| 1 | root `npm.cmd run docs:check` | 首跑 **exit 1**，唯一原因是新增 package script 令 object inventory 过期；运行 `npm.cmd run docs:inventory` **exit 0** 后复跑 **exit 0** |
| 2 | root `npm.cmd run verify:v2-bn8-runtime` | **exit 0**；19 files / 209 unit tests、159 runtime-boundary checks、60 model-contract groups、双端 build、performance、docs、diff 与 secret scan 全过；该主链未消费新 parity 门 |
| 3a | client `npm.cmd exec -- tsc --noEmit` | **exit 0**，无输出 |
| 3b | server `npm.cmd exec -- tsc --noEmit` | **exit 0**，无输出 |
| 4 | root `npm.cmd run test:unit` | **exit 0**；19 files / 209 tests |
| 专项 | root `npm.cmd run test:tool-face-parity` | **exit 0**；8/8，含上述三条 killer 与 production CLI 接线负控 |
| 专项 | root `npm.cmd run check:tool-face-parity` | **exit 0**；当前真实 manifest 输出 1 public checked 及 human-reachability 边界 |
| 语法 | `node --check`（gate + test） | 两文件均 **exit 0** |
| 编码/header | strict UTF-8 decoder + 首行读取 | **通过**；header 仍为原 `status: ready(...)`，未改 |

### 触及面与范围排除

- **允许面内**：重写 `scripts/check-tool-face-parity.mjs`；新增相应常驻测试；`package.json` 新增独立测试脚本。
- **相对开工 baseline `ad87b9d` 的完整路径集**：本单归因的 5 路径为 handoff、object inventory、`package.json`、parity gate、parity test；另有开工前已存在的 `docs/agent-ops/current-state/INDEX.md` 2/2 diff，原样保留、不归因于本单。`docs/generated/object-inventory.md` 的 2/1 行是上述机械更新；本 builder 未运行/改写 docs index。
- **回执**：只向本 handoff 追加本节；按用户指示不改 header。
- **旧引用的限定结论**：重写后的 parity 可执行代码及 `scripts` / `client` / `server` / `shared` 实现范围内，对 `shared/types/toolRegistry` 的引用为 0；append-only handoff / claude-log 中仍保留前身路径的历史叙述，未伪称全仓历史文本为 0，也未篡改历史收据。
- **平行机关申报**：无第二套状态、事务或业务 guard。新增 test 只驱动同一 production evaluator / CLI；测试 seam 仅在 `NODE_ENV=test` 接受临时 manifest 路径，用于证明生产入口确实调用正门。
- **明确未做**：未改 `server/src/toolFace/registry.ts`、manifest generator / schema / JSON；未触及名实不符的 `internal_probe` fixture；未接 `docs:check` / `verify:v2-bn8-runtime`；未碰 12.1、v1、legacy `toolDefinitions`、schema / migration；未做 reviewer 所属 M-1 mutation；未启动服务、浏览器或声称 human journey 已验证；本 builder 未执行 commit / push，也未碰 main。
- **共享树并发状态转换**：验证期间外部进程于 `2026-08-22 20:31:05 -04:00` 将 HEAD 与 `origin/fable/v2-bn12-exoskeleton` 从 `ad87b9d` 推进到 `2b00fe6`，提交包含本单较早版本的 5 个交付路径及上述既有 INDEX diff；本 builder 未发起该 commit / push，也未回退或覆盖它。最终审计加固后，相对新 HEAD 的未提交 diff 仅为 handoff、parity gate、parity test 3 路径，无 untracked；完整交付仍以 `ad87b9d` 到当前 worktree 的 6 路径取证。
- **环境假阳性排除**：`client/src/pages/Notes/canvasEngine/hooks/useNoteCanvasRuntimeController.ts` 的 HEAD / index / worktree-filtered blob 均为 `3efe5f820e2077850611b54d4d09482845e89545`，且 `git diff --numstat -- <path>` 为空；未把 porcelain `.M` 计入触及面。

## Review

> reviewer: Codex reviewer（洁净室复核 thread） | date: 2026-08-22 | baseline: `2b00fe665fe6a58df0de3cddc353d3c97572c1d4`
>
> 冻结候选指纹：`scripts/check-tool-face-parity.mjs` SHA-256 `B6FB8DA7C1A48AB9A4089BCDA22B22995DC3D519BA221E64D6491A0610664649`；`scripts/check-tool-face-parity.test.mjs` SHA-256 `7E9852E722E363F4518CA8A7CFBAA5205E873A5888C72574D703E9CA457DFBF3`。

### 判定

**FAIL（方向成立）—— BLOCKER 0 / HIGH 0 / MED 2 / LOW 0。**

“方向成立”按 reviewer charter 5-8：manifest-only、组合 route graph、symbol 内 method+URL 构造核验、0-public 中性输出、G-5 独立 killer 与 production package 接线都已实体化；前身 HIGH-1 / MED-1 / MED-2 的主路径已经修正，P1–P6 均按点名漏径变红。当前不放行的两项是局部但承重的机械护栏缺口：baseURL 的混合动态条件分支会静默假绿，P7 的“不得含 PASS 字样”常驻 killer 仍可被裸 `PASS` 绕过。修后须增量复核这两项；放行权仍归 Fable。

### Findings

#### MED-1 — baseURL 条件求值会丢掉未知分支，混合 dynamic/static ternary 可假绿

- **性质**：技术缺陷 + 认识论错误；G-2 的 fail-closed 边界不完整。
- **证据**：`scripts/check-tool-face-parity.mjs:235-269` 的 `evaluateStaticStrings()` 对 conditional 直接拼接两分支“成功求出的值”，不携带“某分支不可求”状态；`:310-318` 只要最后恰有一个 unique path 就接受。当前两支都可静态归一为 `/api`，所以真实正控是绿的；问题出现在合法重构后。
- **复现**（隔离 primary Git worktree，候选实现未改测试）：
  1. 正控 `npm.cmd run check:tool-face-parity` → `[PASS] ... 1 public entries checked`，exit 0。
  2. 把 `API_BASE` 整体改成 `import.meta.env.VITE_API_BASE` → `[FAIL] ... has no single static API path base`，exit 1，证明完全未知时会 fail closed。
  3. 还原后只改成 `isDeployed ? import.meta.env.VITE_API_BASE : '/api'` → **仍输出 `[PASS]`，exit 0**。动态分支返回空集合，被静态 fallback 掩掉。
- **影响**：未来把部署 placeholder 换成环境变量/动态模板时，门可能只验证本地 fallback，却把结果叙述成唯一静态 base 已核；随后 P1–P4 的 client URL 结论在部署分支不承重。
- **建议修法**：静态求值返回类似 `{ values, complete }`；identifier/template/conditional 任一可达子表达式未知即 `complete=false`，`resolveProjectApiBasePath` 必须语义红。补“纯 env 红”与“未知分支 + literal fallback 也红”两条常驻测试。

#### MED-2 — P7 常驻断言只禁 `[PASS]`，裸 `PASS` mutation 8/8 存活

- **性质**：技术缺陷 + 收据不承重；生产实现当前正确，但点名回归护栏不等价于工单文字。
- **证据**：`scripts/check-tool-face-parity.mjs:666` 的当前 0-public 输出符合要求；`scripts/check-tool-face-parity.test.mjs:221-228` 却只做 `doesNotMatch(output, /\[PASS\]/)`。工单 P7 是“不得含 PASS 字样”，不是“不得含方括号 PASS token”。
- **复现**（隔离 worktree）：
  1. 真实 manifest 正控先由同一 production npm 入口输出 `[PASS]`、exit 0。
  2. 只在 `[INFO] ... 未证明任何 parity` 后加入裸文本 `PASS remains unproven`，不改 `[INFO]`、中文说明、exit 或其他逻辑。
  3. `node --check scripts/check-tool-face-parity.mjs` exit 0；`npm.cmd run test:tool-face-parity` **exit 0，8/8**。因此 exact P7 mutant 存活。
- **建议修法**：对 empty 与 non-empty 0-public 两个 production CLI receipt 的完整 stdout/stderr 断言 `/PASS/i` 不命中，或直接锁定唯一允许的 INFO 文案；保留先用 1-public 正控证明同一 probe 确实能看见 PASS。

### P1–P7 reviewer mutation 收据

所有 mutation 均在 `D:\Coinsides\v2.x\Coincides\tmp\codex-review-2a1c-20260822-2037` 的独立 primary Git worktree 执行：`git clone --no-hardlinks --no-checkout`，detached 到 `2b00fe6`，再复制冻结的 working amendments。每刀前同一 production npm probe 先对仓库原有 `list_notes` 输出受限 PASS；每刀后立即还原并核 hash/blob。`App`、`fetchSummary`、`server/src/index.ts`、`server/src/routes/notes.ts` 的 worktree blob 均与 HEAD 相同，阳性不是 reviewer 写入。

| 位点 | 拆了什么 | 实际结果 | 红的性质 / 还原 |
|---|---|---|---|
| **P1** | manifest 改为 `POST /api/health/not-real` + `client/src/App.tsx#App` | `check:tool-face-parity` exit **1**；同时报 `server route not found: POST /api/health/not-real` 与 `client symbol does not construct POST /api/health/not-real; saw: none` | G-1 + G-2 语义红；无 PASS、无基础设施异常。manifest 还原后 blob `f1fc501...` = HEAD |
| **P2** | route 改为仓库真实 `POST /api/notes`，call-site 保持只构造 GET 的 `fetchSummary` | exit **1**；只报 `client symbol does not construct POST /api/notes; saw: ... GET /api/notes`；**没有** server-route error | 证明 method 在 client 比较中承重，不是 `rawMethod` 装饰；blob 还原 |
| **P3** | 保持真实 `GET /api/notes`，call-site 改为预先存在的 `App#App` | exit **1**；只报 `client symbol does not construct GET /api/notes; saw: none` | symbol 存在不能洗白 URL 构造；server 侧仍绿；blob 还原 |
| **P4** | 仅把 route 改成真实 route 前缀 `GET /api/note` | exit **1**；明确报 `server route not found: GET /api/note (method + full path required)`，并有 client exact mismatch | exact full path 语义红，不是前缀命中；blob 还原 |
| **P5a** | 只把 production `selectPublicEntries` 改成选择 `public || test` | `node --check` exit 0；`test:tool-face-parity` exit **1**，7/8；G-5 killer 2 在原有 `test_probe` 上报 `expected 0 / actual 1` | 门与测试均存在，红在 selector 泄漏断言；非 ReferenceError/SyntaxError/module error。gate SHA-256 精确还原 |
| **P5b** | 与 P5a 完全还原隔离后：先令 public entry 名为 `__list_notes`；另单刀禁用 production `__` validator | 数据刀：production check exit **1**，仅报 `reserved __ entry entered public projection`。机关刀：`node --check` 0，专项 test exit **1**，7/8，killer 3 报 `expected 1 / actual 0` | 两条件独立承重，未借 `exposure:test` 的红；gate/manifest 均还原 |
| **P6** | 保留 gate/main/全部测试，只把 package 的 production `check:tool-face-parity` 改成固定打印同形受限 PASS、完全不调用 gate | package JSON parse 0、gate `node --check` 0；`test:tool-face-parity` exit **1**，3/8；专用 “production CLI calls the gate” 用例在毒 manifest 上报 `expected exit 1 / actual 0` | production package 接线 killer 真承重；不是“函数不存在”或启动错误。`package.json` blob 还原 = HEAD |
| **P7** | 分别走 empty manifest 与含 1 条 `exposure:test` 的 0-public manifest | 两次 production CLI 均 exit **0**，输出 `[INFO] ... 0 条 public 条目受检，未证明任何 parity ...`，实际文本不含 PASS | **当前行为符合**；但裸 PASS 源码 mutation 仍 8/8 绿，形成 MED-2。临时 fixture 已删除 |

P1–P4 的实际 buffer 均先命中精确 server/client 语义错误，再检查不含 `ReferenceError` / `SyntaxError` / `ERR_MODULE_NOT_FOUND`。P5/P6 均先有 `node --check` exit 0，TAP 红为 `AssertionError` 且直接指出预期语义与实际值；没有把 crash 当 killer。

### baseURL 静态求值边界

| 形状 | 实际门行为 | 评价 |
|---|---|---|
| 当前字面变量 + 两支全静态 conditional（最终都为 `/api`） | PASS | 当前正控成立 |
| 整体纯 env/property；整体 binary/env 拼接无法求值 | 0 个静态值，语义 FAIL | fail closed |
| **conditional 一支 env/dynamic、一支 literal `/api`** | 未知分支被丢弃，只剩一个值，**PASS** | **fail open，MED-1** |

因此不能笼统写“变量/环境变量一定红”：整体未知会红，混合 ternary 会静默放过。当前代码未误判，但重构脆弱性已由 mutation 实证。

### manifest-only 与无平行目录核验

- production 数据流为 `readManifest()` → `evaluateToolFaceParity({ manifest })` → `selectPublicEntries(manifest)` / `validatePublicEntry(...)`；public reports 只迭代 manifest 派生项。server AST 只生成 route evidence，client AST 只在 manifest 声明的 file/symbol 内找 method+URL；没有用 AST 发现、补全或生成工具条目。
- 同一文本 probe 先在前身 `ad87b9d:scripts/check-tool-face-parity.mjs` 命中 `new Function` 1 次、`TOOL_REGISTRY` 5 次、`toolRegistry` 9 次；当前 gate 三者分别为 0 / 0 / 0。限定 executable scope（`scripts/client/src/server/src/shared`，456 个 TS/TSX/MJS/JS 文件）对旧 `shared/types/toolRegistry` 路径为 0 命中。
- 本单没有改 registry / manifest generator / manifest schema / manifest JSON。`test:tool-face-manifest` 6/6 与 freshness check 绿，继续证明 manifest 是 registry 的全量忠实投影；过滤仍只在本 gate，未来第二处是 12.2b `tools/list`。

### 全门亲跑收据（canonical 共享 worktree，严格按指定顺序）

| 顺序 | 命令 | exit | reviewer wall time | 关键收据 |
|---:|---|---:|---:|---|
| 1 | `npm.cmd run docs:check` | 0 | 0.383s | object inventory 最新 |
| 2 | `npm.cmd run verify:v2-bn8-runtime` | 0 | 33.693s | 19 files / 209 unit；159 runtime boundary；60 model groups；双 build、performance、docs、diff、secret scan 全绿 |
| 3a | client `npm.cmd exec -- tsc --noEmit` | 0 | 5.813s | 无诊断 |
| 3b | server `npm.cmd exec -- tsc --noEmit` | 0 | 3.986s | 无诊断 |
| 4 | `npm.cmd run test:unit` | 0 | 7.286s | 19 files / 209 tests |
| 5 | `npm.cmd run test:tool-face-registry` | 0 | 0.704s | 3/3 |
| 6 | `npm.cmd run test:tool-face-manifest` | 0 | 3.403s | 6/6 |
| 7 | `npm.cmd run check:tool-face-manifest` | 0 | 0.656s | 1 entry / 1 public，fresh |
| 8 | `npm.cmd run test:tool-face-parity` | 0 | 4.099s | 8/8 |
| 9 | `npm.cmd run check:tool-face-parity` | 0 | 0.510s | 1 public checked；human reachability NOT VERIFIED |

曾先在隔离 clone 尝试全门：checkout 的 CRLF 使 9 个 INDEX / manifest freshness 假红，沙箱又拒 Vitest 在嵌套 clone 旁写 timestamp config；这是复核环境而非候选失败，不用于判定。随后从第 1 项起在 canonical worktree 全量重跑，上表 10 项全部 exit 0。

### 主链未接与接门前置数据

- 对 `package.json` 做结构读取：`verify:v2-bn8-runtime` 的同一 probe 先命中已接的 `test:tool-face-manifest`，再得到 `tool-face-parity = false`；`docs:check` 同一 probe 先命中 `docs-inventory`，再得到 `tool-face-parity = false`。两条主链当前均未接 parity，符合本单边界。
- 同机暖缓存实测：`test:tool-face-parity` 4.099s，`check:tool-face-parity` 0.510s；若复核修正 PASS 后按串行 `&&` 接入 verify，预计增量约 **4.609s**。以本轮 verify 33.693s 为口径，预计约 38.3s；其中专项测试自身已多次 spawn production check，数字不是单次 evaluator 成本。
- 本 reviewer 不接门；MED-1/MED-2 修正并复核前不应把当前绿灯升为主链承重信号。

### 5-2 跨条耦合与下一单状态转移扫描

1. **G-1 × G-2**：P2 证明真实 server route 绿不能洗掉 client method 错；P3 证明 symbol 存在不能洗掉构造缺席；P4 证明 server/client 都做 exact path。两边必须合取，没有逐条绿的交叉漏径。
2. **manifest 忠实投影 × G-5**：test/`__` 条目留在 manifest 本身不是错；只有进入 public 派生面才红。P5a/P5b 两刀互相还原后独立变红，没有把过滤推回 generator。
3. **evaluator × main × package**：常驻测试已从真实 npm package 入口进入同一 CLI/main/evaluator；P6 用“固定打印合法形 PASS”的 package no-op 仍被毒 manifest 断言杀死，避免只测逻辑不测接线。
4. **0-public × 输出认识论**：当前 empty/0-public 是 neutral exit 0 + INFO，1-public 才是受限 PASS；但 MED-2 表明文字约束尚未被等价锁住。
5. **baseURL × client construction × 接入 verify**：当前真实分支可核，但 mixed conditional 会把未知部署分支静默抹掉。若现在接主链，verify 会把这个不完整证据长期制度化；MED-1 必须先闭。
6. **当前态 → 12.2b**：未来 `tools/list` 必须消费同一 manifest，并独立执行 `exposure==='public'` + 剔 `__`；不得把过滤搬回生成器，也不得另造第三目录。parity 仍只证静态必要条件，S7 human journey 不能替它兜底，反之亦然。

### 5-1 收据完备、D 段阳性对照与范围排除

- **承重且已自验**：最终候选代码指纹、P1–P7、baseURL 两种 env 形状、production package 接线、manifest-only 数据流、主链未接、全门/双 tsc、触及面与 mutation 还原。builder 的精确过程数字与自测只作装饰 receipt，未承担本判定。
- **D 段阳性对照**：
  - route/call 阴性前，同一 production npm CLI 先对仓库原有 `list_notes` 输出受限 PASS；四份承载 route/call 的源码 blob 与 HEAD 相同，不是 probe 自写。
  - P5 前，未改的常驻 test 已含真实 public 正控、`test_probe` 与 `__reserved_probe`；test 文件 SHA-256 始终为 `7E985...`。
  - P6 前，同一 package 入口真实 PASS；断线刀又故意打印同形 PASS，所以最终红只能来自负控未被拒绝，不是正控输出缺失。
  - P7 的同一 stdout probe 先在 1-public 输出中命中 `[PASS]`，再检查 empty / 0-public 不含 PASS。
  - “零旧 source-eval/registry 路径”前，同一 probe 在前身 commit 命中既有阳性；“主链未接 parity”前，同一结构 probe 命中已接 manifest/inventory 门。
- **mutation 还原/树净**：每刀后 gate SHA-256 回到 `B6FB8...`；manifest、`api.ts`、`package.json` 的 worktree blob 均与 HEAD 相等；临时 P7 fixtures 已删除。隔离 clone 与 baseline backup 已删除，共享三处 node_modules junction target 均仍存在。隔离树最终 `git diff --numstat` 只剩冻结候选原有 handoff/gate/test 三路径；共享树 mutation 前后同口径路径集一致。
- **porcelain 假阳性**：`useNoteCanvasRuntimeController.ts` 的 worktree blob = HEAD `3efe5f...`，`git diff --numstat` 为 0；未计入触及面。
- **本轮为首轮全面复核**：未采用 5-7 增量协议缩范围。
- **显式范围排除（不是 PASS）**：不证明 human reachability / S7 旅程；不审 MCP transport / `tools/list` / JWT / scope enforcement / operation batches / confirm→propose / runtime tool execution；不启动 live server/browser，因为这些不能回答本单静态必要门谓词。registry/generator 的设计不在本单重审范围，但其既有三门已亲跑。
- **边界遵守**：未改产品代码或常驻测试，未改 registry/generator/schema/manifest，未 commit/push/main，未改 header；唯一共享 tracked 写入是本 `## Review`。
