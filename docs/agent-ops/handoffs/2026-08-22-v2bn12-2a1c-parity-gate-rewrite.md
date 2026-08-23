> from: claude(opus,调度权:operating-workflow.md v1) | to: codex(builder) | status: ready(12.2a-1b 已复核 PASS 并接入主链,manifest 已在;Fable 放行 log 08-22 #9) | re: v2bn12-2a-1c | date: 2026-08-22

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
| **G-1** | 用 TypeScript AST 读取 `server/src/index.ts` 的 default router import 与 `app.use(mountPath, router)`，再读取对应 router 模块的 `router.METHOD(leafPath)` / `router.route(leafPath).METHOD()`；产出 `{method, fullPath, mountedRouterModule, mountPath, leafPath}`。匹配必须同时满足 method 与规范化后的完整 path，直接 `app.METHOD` route 也入图。测试固定证明 `GET /api/notes` 来自 `server/src/routes/notes.ts`，且不存在伪造的 `POST /api/health`。
| **G-2** | 用 `path.relative()` 把 call-site 严格锁在 `client/src` 内；AST 精确定位声明的 `file#symbol` 子树，只接受该文件对 canonical `client/src/services/api.ts` 的 default import，并从其 `axios.create({baseURL})` 静态求出 `/api`。仅在 symbol 内收集 `api.METHOD(literal/template)`，比较相同 method 与规范化 URL segment；`App#App`、越界路径及真实 route + 错 client method 均红。
| **G-3** | 空 manifest 或 0 public 返回 exit 0，但只输出 `[INFO] ... 0 条 public 条目受检，未证明任何 parity ...`，不含 `[PASS]`；CLI 常驻测试直接断言 exit 与文本。
| **G-4** | 非空成功输出固定为 `[PASS] tool-face necessary-condition gate: N public entries checked; human reachability NOT VERIFIED; journey pending`；失败也保留相同边界陈述与条目数。
| **G-5** | `selectPublicEntries()` 只派生 `exposure==='public'`；`validatePublicProjection()` 独立复核“不得漏入非 public”与“不得有 `__` 前缀”，两条件不合并。真实 manifest 正控、故障 selector 泄漏 test 条目、public `__` 条目三者各自触发；当前生产 manifest 只有一个 public 条目，因此两条负控使用 manifest-shaped fixture，且都走 production evaluator。

三条 killer 的实际输出（`npm.cmd run test:tool-face-parity`）：

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

test killer 另先证明同一条 `exposure:'test'` 在正常 selector 下得到 0-public neutral，避免把“manifest 忠实包含 test”误写成“manifest 本身应红”。两条负控的红来自已存在 production validator 的具体错误文本，不来自缺函数/导入/语法错误。另有 production CLI 集成测试先跑真实 manifest 绿，再喂 `POST /api/health/not-real` + `client/src/App.tsx#App`，断言 exit 1、同时出现 route/client 两条语义错误并排除 `ReferenceError|SyntaxError|ERR_MODULE_NOT_FOUND`；若 CLI 根本不调用 gate，该测试会假绿并失败。

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

### 触及面与范围排除

- **允许面内**：重写 `scripts/check-tool-face-parity.mjs`；新增相应常驻测试；`package.json` 新增独立测试脚本。
- **申报生成件**：`docs/generated/object-inventory.md` 的 2/1 行机械更新如上；未运行/改写 docs index。共享树中本单开工前已有 `docs/agent-ops/current-state/INDEX.md` 2/2 diff，原样保留，不归因于本单。
- **回执**：只向本 handoff 追加本节；按用户指示不改 header。
- **旧引用的限定结论**：重写后的 parity 可执行代码及 `scripts` / `client` / `server` / `shared` 实现范围内，对 `shared/types/toolRegistry` 的引用为 0；append-only handoff / claude-log 中仍保留前身路径的历史叙述，未伪称全仓历史文本为 0，也未篡改历史收据。
- **平行机关申报**：无第二套状态、事务或业务 guard。新增 test 只驱动同一 production evaluator / CLI；测试 seam 仅在 `NODE_ENV=test` 接受临时 manifest 路径，用于证明生产入口确实调用正门。
- **明确未做**：未改 `server/src/toolFace/registry.ts`、manifest generator / schema / JSON；未触及名实不符的 `internal_probe` fixture；未接 `docs:check` / `verify:v2-bn8-runtime`；未碰 12.1、v1、legacy `toolDefinitions`、schema / migration；未做 reviewer 所属 M-1 mutation；未启动服务、浏览器或声称 human journey 已验证；未 commit、push 或碰 main。
- **环境假阳性排除**：`client/src/pages/Notes/canvasEngine/hooks/useNoteCanvasRuntimeController.ts` 的 HEAD / index / worktree-filtered blob 均为 `3efe5f820e2077850611b54d4d09482845e89545`，且 `git diff --numstat -- <path>` 为空；未把 porcelain `.M` 计入触及面。
