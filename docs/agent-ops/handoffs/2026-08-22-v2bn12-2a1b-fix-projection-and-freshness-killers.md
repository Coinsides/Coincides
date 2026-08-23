> from: claude(opus,调度权:operating-workflow.md v1) | to: codex(builder) | status: done(经 fix2 收口,2026-08-22 Opus 翻牌;修正单,复核 FAIL(方向成立)0B/2H) | re: v2bn12-2a-1b-fix | date: 2026-08-22

# V2.BN.12.2a-1b-fix:两条缺失的 killer

> ⚠️ header 的 `ready` 由 Opus 依调度授权链翻牌,**不代表 Henry 本人逐张批过**。

## 定位

12.2a-1b 复核判 **FAIL(方向成立)** 0B/**2H**/0M/0L。**「方向成立」是承重的**:复核确认权威落在 server 真 Zod registry、生成器正常模块加载并逐项忠实投影、`toolRegistry.ts` 已删除、新生成器无 `new Function`/源码截片。

> **两条 HIGH 都不是「实现写错了」,而是「正确的实现没有护栏」。** 本单只补 killer,**不改已被确认正确的投影逻辑与 schema 权威形状**。

**上游**:本工单同目录 `2026-08-22-v2bn12-2a1b-tool-registry-and-manifest.md` 的 `## Review`(**复现步骤都在那里,本单不重述**)。

---

## H-1:「manifest = 注册表忠实投影」没有常驻 killer

### 复核实测的漏径

在生成器 `:42` 把 `TOOL_REGISTRY.map(...)` 改成 `TOOL_REGISTRY.filter(e => e.exposure === 'public').map(...)`:
`test:tool-face-registry` **exit 0(3/3)**、`check:tool-face-manifest` **exit 0**、`docs:check` **exit 0**。

**假绿成因**:当前 registry 只有 1 条且恰为 public ⇒ 过滤不改变任何 manifest 字节;而 `registry.test.ts` **根本不调用生成器**。

> ⭐ **为什么这条要紧**:本日新立设计不变量 —— **manifest = 注册表的忠实投影,不是暴露清单**;过滤只许在 ①12.2a-1c 机械门 killer ②12.2b MCP `tools/list`。
> **若生成阶段悄悄过滤,12.2a-1c 的两条 killer 将永远收不到靶子 —— 我们会得到一道永远不会红的门,正是 S1 第一版失败的形状。**

### 要求

- 把**投影**抽成**可注入 entries 的纯函数**;生产 CLI 仍调用**同一个**函数(**不得复制一份给测试用** —— 那是平行机关)。
- 常驻测试用**多 exposure fixture**:至少含 `public` + `internal`(或等价非 public 值)+ `test` + 一条 **`__` 前缀** 条目。
- 断言:**基数(cardinality)、原始顺序、每个字段与双 schema 均被保留**。
- ⛔ **必红判据**:在投影中加入 `exposure` 过滤 ⇒ **至少一条断言必须直接变红**。**红须来自「过滤生效」,不是「函数不存在」。**

---

## H-2:唯一 manifest freshness 机关没有独立负控

### 复核实测的漏径

两阶段:①只改 registry description、不重生成 ⇒ `check:tool-face-manifest` **exit 1(过期)**,说明比较逻辑本身有效;②**保持 stale**,再把生成器 `:80` 改成 `if (false && actual !== expected)` ⇒ **exit 0 并误报「未过期」**,`docs:check` **exit 0**、`test:tool-face-registry` **exit 0**。

**假绿成因**:红路**只存在于被测 CLI 自己的分支里**;没有任何测试从**生产入口**制造 stale/missing 产物并断言非零。

> ⭐ **这就是 12.1 线的教训 2:测了逻辑 ≠ 测了接线。**(12.1.3 六条测试全绿,而删掉生产调用者后依然全绿。)

### 要求

- 给生产 CLI 一个**仅供测试的 output-path seam**(不改变默认生产行为)。
- 写**集成测试**,**spawn 同一个生产入口** `docs:tool-face-manifest -- --check`:
  - **fresh 产物 ⇒ exit 0**(阳性对照,先证明探针看得见「好」)
  - **missing 产物 ⇒ 非零**
  - **stale 产物 ⇒ 非零**
- ⛔ **只测 comparator 纯函数不够** —— 必须证明**生产 CLI 仍在调用它**。
- ⛔ **必红判据**:把 `:80` 的比较分支改成恒假 ⇒ **stale 那条必须变红**。

---

## 边界(触及面申报)

**允许**:`scripts/generate-tool-face-manifest.ts`(**仅**抽纯函数 + 加 output-path seam;**不改投影语义**)· `server/src/toolFace/registry.test.ts`(扩充)· **新增**集成测试文件 · `package.json`/`server/package.json` 的测试脚本条目(如需)。

**⛔ 不得**:改投影的**字段集合或顺序**(复核已确认当前忠实)· 改 `server/src/toolFace/registry.ts` 的 schema 权威形状 · 在生成阶段引入**任何** exposure/`__` 过滤(**违反设计不变量**)· 重写 `scripts/check-tool-face-parity.mjs`(归 12.2a-1c)· **接线进 `verify:v2-bn8-runtime`**(未过复核的门不进主链)· 碰 12.1 线 / v1 线 / legacy `toolDefinitions` / schema / migration / DB。

**越界即停,标 `needs: claude`,不自行扩面。**

---

## 已由复核确认无需处理的(**不要顺手改**)

| 项 | 复核结论 |
|---|---|
| M1 伪 zod 条目 | 由 TypeScript(TS2561)与生成器(TypeError)双重承重 ⇒ **符合预期** |
| M3 已删文件的残留引用 | 编译消费者会红(TS2307)⇒ **符合预期**。旧 parity 脚本仍指旧文件,但**明示 defer 且不在链路**,归 12.2a-1c |
| M6 `.strict()` | 承重,拆掉即被 `registry.test.ts:40-43` 杀中 ⇒ **符合预期** |
| M7 `zod-to-json-schema` 归 devDependencies | **正确且与 12.2b 不冲突**(设计要求 `tools/list` 消费已生成 manifest,不在请求期转换 Zod)⇒ **不要移动它** |
| R-3 必要/充分 | 回执**没有**把必要条件写成充分条件 ⇒ **不需更正措辞** |
| M5 URL 构造语义护栏 | 本单确无,**归属 12.2a-1c**(不是本单缺陷)⇒ **不要在本单实现** |

---

## D. 探针先过阳性对照(`adjudication §7`,含反面分则)

- 正面:任何阴性断言前先让同一探针看见一个已知阳性实例。
- ⭐ 反面:**先确认探针的命中不是来自你自己刚写进去的东西**。
- 📌 本环境:`.git/index` 只读 ⇒ `git status` porcelain 对 `client/.../useNoteCanvasRuntimeController.ts` 有 **stat/EOL 假阳性 `.M`**(blob 两端同为 `3efe5f8...`)。**不是改动,不要处理、不要计入。** 判文件是否真改用 blob 哈希或 `git diff --numstat`。

## 验证与回执

门禁 **docs-first**:`docs:check` → `verify:v2-bn8-runtime` → client/server 双 `tsc --noEmit` → `test:unit` → `test:tool-face-registry` → `check:tool-face-manifest` → 新增的集成测试。

**回执纪律**:README Builder 侧 1–3(含 **UTF-8**)+ **M-1 mutation 归复核方**(self-test 只作前置自查)+ **M-2 header 不由你翻**。

**回执须含**:H-1/H-2 各自的**先红后绿两段输出**(**红须由本单点名的 mutation 触发,不是 API 缺失**)· 纯函数是否被生产 CLI 与测试**共用同一份**的证明 · 集成测试确实 spawn 生产入口的证明 · fresh/missing/stale 三态各一段输出 · 投影字段集合与顺序**未变**的证明 · 门禁逐条收据 · 触及面 diff vs 申报 · 显式范围排除 · **每条阴性断言的阳性对照**。

## Result

> builder: Codex | date: 2026-08-22 | result: **needs: claude（实现与两条 killer 自查完成；docs-first 首门被本单开工前已存在的 INDEX 过期阻断）**

### 1. 实现

- `scripts/generate-tool-face-manifest.ts`
  - 原 `buildToolFaceManifest()` 改为可注入 `entries: readonly ToolRegistryEntry[]` 的纯函数；函数仍逐项 `map`，生产路径显式走 `runCli → renderManifest(TOOL_REGISTRY) → buildToolFaceManifest(entries)`。生产与测试 import 的是**同一个导出函数**，没有复制投影机关。
  - 投影对象的字段集合与顺序保持原样：`name → description → input_schema → output_schema → truth → tier → human_entry → exposure → scopes`；双 schema 仍分别经同一个 `serializeSchema` 转换。`docs/generated/tool-face-manifest.json` 未改。
  - 顶层 CLI 包入 `runCli()` 并加直接执行守卫，使测试 import 不会写真实产物。
  - 默认 output path 仍为 `docs/generated/tool-face-manifest.json`。仅当 `NODE_ENV=test` 且设置 `TOOL_FACE_MANIFEST_TEST_OUTPUT_PATH` 时才启用临时 output-path seam；普通生产调用不受影响。
- 新增 `scripts/generate-tool-face-manifest.test.ts`
  - H-1 fixture 顺序为 `public_probe(public) / internal_probe(internal) / test_probe(test) / __reserved_probe(public)`；`__` 条目故意为 public，使 exposure 与 `__` 两类误过滤互不遮蔽。
  - 常驻断言覆盖 cardinality、原始顺序、九字段及其顺序、每字段值、input/output 双 schema。
  - H-2 通过 `process.execPath + process.env.npm_execpath` spawn 根生产 npm 入口；check 的实际 argv 为 `npm run docs:tool-face-manifest -- --check`，没有直接调用 comparator 或另造 CLI。
  - missing 与 stale 各自在变坏前用同一临时路径执行一次 production generate + production check 的 fresh `exit 0` 阳性对照，再制造负态并要求 production check 非零。
- `server/package.json`
  - 新增门外专项脚本 `test:tool-face-manifest`；未接入 `verify:v2-bn8-runtime`。

### 2. H-1 定点 mutation：先红后绿

mutation 只把纯函数中的 `entries.map(...)` 改为 `entries.filter(entry => entry.exposure === 'public').map(...)`；函数、import 与测试均仍存在。

```text
server> npm.cmd run test:tool-face-manifest
exit 1
not ok 1 - buildToolFaceManifest faithfully projects every injected entry in original order
Expected values to be strictly equal:
2 !== 4
scripts/generate-tool-face-manifest.test.ts:108
```

恢复无过滤的 `entries.map(...)` 后：

```text
server> npm.cmd run test:tool-face-manifest
exit 0
# tests 5
# pass 5
# fail 0
```

红由过滤实际删掉 internal/test 两条、使 cardinality 2≠4 直接触发；不是函数不存在或 import 失败。

### 3. H-2 定点 mutation：先红后绿

mutation 只把生产比较分支改为 `if (false && actual !== expected)`；生产入口、比较值与测试均仍存在。

```text
server> npm.cmd run test:tool-face-manifest
exit 1
ok 1 - fresh artifact: the production check entry exits zero
not ok 2 - missing artifact: the same probe sees fresh first, then exits nonzero
  exit=0
  tool-face manifest 未过期：1 条条目，其中 1 条 public。
not ok 3 - stale artifact: the same probe sees fresh first, then exits nonzero
  exit=0
  tool-face manifest 未过期：1 条条目，其中 1 条 public。
# pass 2
# fail 3
```

恢复 `if (actual !== expected)` 后：

```text
server> npm.cmd run test:tool-face-manifest
exit 0
ok 1 - fresh artifact: the production check entry exits zero
ok 2 - missing artifact: the same probe sees fresh first, then exits nonzero
ok 3 - stale artifact: the same probe sees fresh first, then exits nonzero
# tests 5
# pass 5
# fail 0
```

stale 条由**同一个生产 npm 入口**误报 `exit 0` 后直接红，满足“机关存在但被改坏”；missing 同时红，但未替代 stale 判据。

### 4. fresh / missing / stale 三态与阳性对照

常驻集成测试每个临时产物均只写系统 temp 目录并在 `finally` 精确清理：

```text
fresh:   production generate exit 0 → production --check exit 0
missing: production generate/check fresh exit 0 → 删除该临时产物 → production --check 非零且输出“过期”
stale:   production generate/check fresh exit 0 → 覆写该临时产物为 {"stale":true} → production --check 非零且输出“过期”
```

子测试最终 TAP 收据见上节恢复后 5/5；每个 child 还先断言无 spawn error、无 signal、status 为 number，避免“进程没启动”被 `status !== 0` 假绿。

### 5. 门禁收据与阻断

按工单要求从 docs-first 开始：

| 顺序 | 命令 | 结果 |
|---|---|---|
| 1 | root `npm.cmd run docs:check` | **exit 1**：`过期: docs/agent-ops/INDEX.md` |
| 2 | `verify:v2-bn8-runtime` | **未跑**：首门已红，且修 INDEX 不在本单允许触及面 |
| 3 | client/server `tsc --noEmit` | **未跑**：同上 |
| 4 | root `test:unit` | **未跑**：同上 |
| 5 | server `test:tool-face-registry` | 开工阳性与实现后专项复跑均 **exit 0，3/3** |
| 6 | root `check:tool-face-manifest` | 开工阳性 **exit 0**；实现后全门序列未越过 docs 首门 |
| 7 | server `test:tool-face-manifest` | 恢复两次 mutation 后 **exit 0，5/5** |
| 补充 | scoped `git diff --check` | **exit 0**（仅 EOL 提示） |

阻断归因的同探针正/反对照：`docs/agent-ops/INDEX.md:122` 能命中既有 `2026-08-22-v2bn12-2a1b-tool-registry-and-manifest.md`，但对本修正单 `2026-08-22-v2bn12-2a1b-fix-projection-and-freshness-killers.md` 为 0 命中。本修正单在开工前已 tracked；本单实现只改 generator/test/server package，故 INDEX 过期不是本实现引入。运行写入式 `docs:index` 会修改工单未授权的 `docs/agent-ops/INDEX.md`，依“越界即停”未执行。

### 6. 触及面与范围排除

本单新增/修改：

- `scripts/generate-tool-face-manifest.ts`
- `scripts/generate-tool-face-manifest.test.ts`（新增）
- `server/package.json`
- 本 handoff 仅追加本 `## Result`；**header 未改**

共享树既有项未归入本单：原 12.2a-1b handoff 的 reviewer `## Review` 已有 15/8 diff；controller porcelain `.M` 的 HEAD / worktree blob 仍同为 `3efe5f820e2077850611b54d4d09482845e89545`。

显式未做：未改投影字段/顺序、`server/src/toolFace/registry.ts` schema、`shared/types`、生成 manifest、旧 parity、URL 构造语义、`verify:v2-bn8-runtime`、12.1/v1/legacy `toolDefinitions`、schema/migration/DB；未移动 `zod-to-json-schema` devDependency；生成阶段未加入 exposure 或 `__` 过滤；未 commit / push / 碰 main。

### 7. 需要 Claude

请由调度方处理或明确授权生成 `docs/agent-ops/INDEX.md`，使其纳入本修正单；之后再按本单顺序从 `docs:check` 重新跑完整门禁。M-1 mutation 最终判定仍归 reviewer；本回执 mutation 仅为 builder 前置自查。header 按 M-2 与用户指令保持 `ready`，未翻牌。

## Review

> reviewer: Codex reviewer（洁净室复核 thread） | date: 2026-08-22 | target: `434c5332f6b62697f6d3ae271a216821b2a2dc13` | mutation checkout: detached `434c533` | 未改 header / 产品代码 / 常驻测试，未 commit / push / 碰 main

### 判定

**FAIL（方向成立）—— BLOCKER 0 / HIGH 1 / MED 0 / LOW 1。**

“方向成立”按 reviewer charter 5-8：精确基线上的生产链确实是 `runCli → renderManifest(TOOL_REGISTRY) → buildToolFaceManifest(entries)`；F1 证明异质 fixture 能直接杀死 exposure 过滤；F2 证明 fresh 阳性先绿、missing 与 stale 会从同一个生产 npm 入口直接红。原 HIGH-2 已封住，原 HIGH-1 的**投影逻辑层**也已封住。

FAIL 来自 HIGH-1 的**生产接线层仍开洞**：F3 只删除生产 CLI 对纯函数的调用、把原投影内联回 `renderManifest`，纯函数和全部测试均保留，结果 `test:tool-face-manifest` 仍 **exit 0（5/5）**，生产 `check:tool-face-manifest` 也 **exit 0**。因此常驻测试尚不能证明生产 CLI 继续共用被 F1 保护的同一投影函数；修正单明令禁止的平行机关可以在不红灯的情况下回来。

### 增量协议声明与基线（5-7）

本轮是**中间轮增量复核**：

- 结论基线：主单 `2026-08-22-v2bn12-2a1b-tool-registry-and-manifest.md` 的 `## Review`（其取证 baseline `3fbbe7fa044fc57af422b3c7da02ee0bab92d0ff`）及 M1–M7 结论；
- 修正差分：`05f3463b8268334d529bcef433ba44471d003068..434c5332f6b62697f6d3ae271a216821b2a2dc13`；
- 全扫范围：HIGH-1 / HIGH-2、F1–F5、上述新增差分面、此前因 INDEX 过期未跑的全门；
- 指纹范围：M1 / M3 / M5 / M6 / M7 只比对不变指纹，不重复原 mutation；M2 / M4 分别由本轮 F1 / F2 取代。

### Findings（MED 及以上）

#### HIGH-1（技术缺陷 / 接线证明缺口）——忠实投影 killer 没有锁住生产 CLI 仍调用同一纯函数

- **现状正确**：`scripts/generate-tool-face-manifest.ts:65-66` 的 `renderManifest` 调用 `buildToolFaceManifest(entries)`，`:88-90` 的 `runCli` 把真实 `TOOL_REGISTRY` 送入 `renderManifest`。
- **复现**（detached 隔离 checkout）：保留 `buildToolFaceManifest` 与 `scripts/generate-tool-face-manifest.test.ts` 不动，只把 `renderManifest` 中的 `buildToolFaceManifest(entries)` 替换为同字段、同顺序、同 duplicate-name guard 的旧式内联 `entries.map(...)`。随后：
  - server `npm.cmd run test:tool-face-manifest` → **exit 0，5/5**；
  - root `npm.cmd run check:tool-face-manifest` → **exit 0，1 条 / 1 public / 未过期**。
- **为什么是相关假绿**：纯函数测试 `:105-134` 只直接 import/call helper；production spawn 测试 `:174-223` 只验证同一 CLI 的 generate/check 自洽与 missing/stale 比较，不观察 projector 被调用，也不解析产物以识别生产是否绕过 helper。复制实现生成同字节时，两组测试都没有可见差异。
- **建议修法**：新增一条专门的 production-wiring killer。可用 TypeScript AST/结构契约锁住 `runCli → renderManifest → buildToolFaceManifest`，并拒绝 `buildToolFaceManifest` 外出现第二份九字段 mapper；或把 CLI 编排做成可注入 projector 的单一入口并用 spy 断言生产编排调用它，同时保留真实 npm spawn。只把生产临时产物与 helper 输出做 `deepEqual` 不够——语义相同的复制仍会绿。修后重跑 F3，必须红在“生产未调用同一 projector”的断言。

### LOW

#### LOW-1（收据准确性）——Result 对 fixture exposure 与 F1 删除对象的叙述不符源码

- `scripts/generate-tool-face-manifest.test.ts` 实际是：`public_probe=public`、`internal_probe=public`、`test_probe=test`、`__reserved_probe=internal`（`:46/:60/:74/:88`）。
- Result §1/§2 写成 `public/internal/test/__public`，并称 F1 删除 `internal/test`。实测 exposure filter 删除的是 `test_probe + __reserved_probe`，所以仍正确命中 cardinality `2 !== 4`，测试杀伤力不受影响；但“`__` 为 public、两类误过滤互不遮蔽”的回执不实。
- handoff / claude-log 都是追加式历史，不回改原文；以本 Review 的更正为准，后续回执按实码抄取 exposure，不按条目名字推断。

### F1–F5 对抗探针

F1–F3 的 mutation 三要素均满足：位点由调度方点名；由本 reviewer 在 detached `434c533` 隔离 checkout 亲测；分别瞄准主单已经证实的忠实投影漏径、freshness 分支漏径与 12.1 同族“测逻辑≠测接线”漏径。每刀前同一专项门先有 5/5 阳性，刀后均用逆补丁还原并核 blob / numstat。

| # | 拆了什么 | 哪条红 / exit code | 结论 |
|---|---|---|---|
| F1 | 在纯函数 `entries.map` 前插入 `.filter(entry => entry.exposure === 'public')`；函数、import、生产链均仍存在 | server `test:tool-face-manifest` **exit 1**；`buildToolFaceManifest faithfully projects...` 在 `test.ts:108` 的 cardinality 直接红：actual `2` / expected `4`；其余 production fresh/missing/stale 子测试仍绿，合计 pass 4 / fail 1 | **通过必红判据**。红因条目被过滤，不是 import / API /函数不存在。实际被删为 `test_probe + __reserved_probe`。还原后 **exit 0，5/5**。 |
| F2 | 生产比较分支改为 `if (false && actual !== expected)` | server `test:tool-face-manifest` **exit 1**；fresh 子测试先 **ok**；missing 在 `:208`、stale 在 `:220` 均因实际 exit `0`、期望 non-zero 直接红；合计 pass 2 / fail 3 | **通过必红判据**。missing 与 stale 两条都红，且同一生产 npm 入口的 fresh 阳性仍先绿。还原后 **exit 0，5/5**。 |
| F3 | 仅删除 production `renderManifest` 对 `buildToolFaceManifest` 的调用，内联旧九字段 mapper；纯函数与测试保留 | server `test:tool-face-manifest` **exit 0，5/5**；root `check:tool-face-manifest` **exit 0**；没有任何断言红 | **假绿，形成 HIGH-1**。新测试保护纯函数逻辑，但未保护生产 CLI 必须调用它。 |
| F4 | 非 mutation：对 test-only output-path seam 做单键 / 双键生产入口探针 | 只设 output-path、`NODE_ENV=production` → canonical check **exit 0**；只设 `NODE_ENV=test`、不设 path → canonical check **exit 0**；两者同时设置并指向 missing temp path → **exit 1** 且报该 temp path 过期 | seam **会在双键显式开启时改变 CLI 输出目标**，这是测试可见性的设计；缺任一键默认生产路径不变。重定向后仍用同一 `renderManifest`、comparator 与读写分支，**不构成平行机关**。操作注记：未来主链不得同时污染这两个专用环境变量。 |
| F5 | 非 mutation：审计生产入口 spawn 的 executable / argv | `test.ts:140/:148/:150` 使用 `process.env.npm_execpath` + `spawnSync(process.execPath, [npmExecPath, ...])`；同文件 `npm.cmd` 计数 0；正式入口由 server npm script 启动 | **未钉死 Windows**。Linux 的 npm CLI JS 同样由当前 Node 执行；`windowsHide:true` 在非 Windows 无害。未持有 Linux runner，结论为静态跨平台审计。若绕过 npm 直接 `node --test`，`npm_execpath` 可缺失并主动红，这是非正式启动方式限制，不是 Linux-only。 |

### 七门亲跑收据（docs-first）

有效全门收据来自共享工作树的精确 `HEAD=434c5332...`：开跑前后 controller 的 HEAD / index / clean-filtered worktree blob 都是 `3efe5f820e2077850611b54d4d09482845e89545`，全树 `git diff --numstat` 与 untracked 均空。之所以不把全门计在隔离 clone：clone 内 `verify` 的首个 Vitest 在断言运行前被宿主拒绝写 `vitest.config.ts.timestamp-*.mjs`（`EPERM`）；这是一条环境假红，已排除。mutation 与专项门仍全部在隔离 checkout 执行。

| 顺序 | 命令 | reviewer 结果 |
|---|---|---|
| 1 | root `npm.cmd run docs:check` | **exit 0**；INDEX / object inventory 最新 |
| 2 | root `npm.cmd run verify:v2-bn8-runtime` | **exit 0**；19 files / 209 unit、159 runtime-boundary checks、60 model-contract groups、双端 build、performance、docs、diff / secret scan 全过 |
| 3a | client `npm.cmd exec -- tsc --noEmit` | **exit 0**；无输出 |
| 3b | server `npm.cmd exec -- tsc --noEmit` | **exit 0**；无输出 |
| 4 | root `npm.cmd run test:unit` | **exit 0**；19 files / 209 tests |
| 5 | server `npm.cmd run test:tool-face-registry` | **exit 0**；3/3 |
| 6 | server `npm.cmd run test:tool-face-manifest` | **exit 0**；5/5（pure projection + production fresh/missing/stale） |
| 7 | root `npm.cmd run check:tool-face-manifest` | **exit 0**；1 条条目、1 条 public、未过期 |

基线全绿只证明当前快照可运行；F3 的相关假绿证明它不承载“生产必须共用 projector”这一不变量，故不能用本表洗白 HIGH-1。

### 触及面核对（`05f3463..434c533`）

| 路径 | numstat | 核对 |
|---|---:|---|
| `scripts/generate-tool-face-manifest.ts` | +48 / -22 | builder 允许面：抽纯函数、direct-execution guard、output-path seam |
| `scripts/generate-tool-face-manifest.test.ts` | +224 / -0 | builder 允许面：新增专项测试 |
| `server/package.json` | +1 / -0 | builder 允许面：只加 `test:tool-face-manifest` script |
| 修正单 handoff | +123 / -0 | 追加 Result；header 未改 |
| `docs/agent-ops/INDEX.md` | +2 / -1 | 调度方重生成；按本轮明确归因，不计 builder 越界 |
| `docs/agent-ops/claude-log/2026-08-22.md` | +49 / -0 | 调度方二级复盘收据，不计 builder 越界 |
| 主单 handoff | +15 / -8 | 调度方对既有 Review 的收据整理，不计 builder 越界 |

`git diff --check 05f3463..434c533` **exit 0**。未触及 registry schema、generated manifest、旧 parity、root package / verify、client / 12.1 / v1、schema / migration / DB；实现触及面与修正单边界一致。

### 未上主链（验证链接线规则）

- root `docs:check` 精确值仍是 `docs-index --check && docs-inventory --check`；同一 token probe 对该值查 `tool-face|manifest|parity` 为 **0**。
- root `verify:v2-bn8-runtime` 同一 probe 查三词为 **0**。
- 阳性对照：同一份 root scripts 先命中独立 `docs:tool-face-manifest`、`check:tool-face-manifest`、`check:tool-face-parity`，全 scripts 共命中 6 次，证明 probe 看得见这些词。
- 因本轮仍 FAIL，专项门继续不接主链是**正确状态**；待修正链 PASS 后才由调度方按 registry → manifest test/check → rewritten parity 的顺序接线。

### M1 / M3 / M5 / M6 / M7 跨条指纹（5-2，未重复原 mutation）

| 原结论 | `05f3463` vs `434c533` 指纹 | 增量判定 |
|---|---|---|
| M1 真 Zod / 正常 converter | `registry.ts` blob 同为 `143ad8be...`；generator 的 converter loader、`serializeSchema` 与九字段对象未改语义 | 不受波及；F1 只新增其杀伤力证明 |
| M3 旧 shared registry 已删 / 旧 parity defer | `shared/types/toolRegistry.ts` 两端都 absent；旧 parity blob 同为 `19a2bda0...`；`server/src` 未改 | 不受波及 |
| M5 URL 语义门归 1c | `App.tsx=09c83db0...`、`CourseDetail.tsx=cc3af13a...`、generated manifest=`f1fc5014...` 两端相同 | 不受波及；新测试未冒充 URL 可达性 |
| M6 `.strict()` 承重 | registry 与 `registry.test.ts=a868de36...` 两端相同 | 不受波及 |
| M7 converter 留 devDependency | server lock blob 同为 `6ab4b234...`；`server/package.json` 只增测试 script，dependencies/devDependencies 不变 | 不受波及。新增 test-only converter consumer；生产 consumer 仍仅 generator，server runtime 仍不消费 |

跨条合取结论：H-2 现在能防 stale/missing，但它只比较“生产自己生成的 expected”。若 F3 允许生产复制 projector，未来在复制体里加入过滤或漏字段，纯函数 F1 仍红不了，而 freshness 会把复制体产出的残缺 manifest 当作 fresh；两门逐条绿仍可合取成错误证明。故 F3 不是形式洁癖，而是 H-1 与 H-2 合取后的承重缺口。

### D 段：承重阴性断言的阳性对照

| 阴性断言 | 同一探针先见的阳性 | 阴性结果；字符串来源 |
|---|---|---|
| F1 红不是 import / 函数缺失 | 同一隔离专项门 mutation 前与还原后均 5/5 | mutation 后只 cardinality `2 !== 4` 红，production 三态仍绿；输出来自 Node test assertion，不来自提示/日志 |
| F2 的 missing/stale 红不是 child 没启动 | 每个负态前 `assertFresh` 用同一 npm child generate+check exit 0；mutation 中 fresh 子测试仍 ok | missing/stale child 都真实 exit 0 并输出“未过期”，随后 non-zero 断言红 |
| 生产接线没有 killer | mutation 前源码探针先看见 `renderManifest` 中真实 `buildToolFaceManifest(entries)` 调用 | 删除该调用、内联 mapper 后专项门与生产 check 都 exit 0；命中/删除对象来自 production 文件 |
| 默认生产路径不受单一 seam 键改变 | 双键指向 missing temp path 时同一生产入口 exit 1 并打印该 path | 任一单键时都回 canonical manifest 并 exit 0 |
| F5 没有 Windows `npm.cmd` 绑定 | 同文件先命中 `npm_execpath`、`process.execPath`、`windowsHide` 共 4 处 | 限定测试文件 `npm.cmd` 计数 0；不是从 Linux 未跑反推，而是由实际 executable/argv 承载 |
| docs / runtime 主链不含 tool-face 门 | 同一 root scripts probe 先命中三个独立 tool-face/parity script、全量 6 token | 收窄到 `docs:check` 与 `verify` 后均 0 |
| 旧 shared registry 两端都不存在 | 同一 Git tree probe 先命中现役 `shared/types/toolFaceManifest.ts` | 精确旧路径在 `05f3463` 与 `434c533` 都 `cat-file -e` 失败 |
| controller porcelain `.M` 不是越界改动 | 全树真实 diff 在本 Review 落盘后能看见本 handoff | controller HEAD / index / clean-filtered worktree blob 三者相同，path-filtered numstat 为空；raw blob 差异只承载 EOL |

### 5-1 收据完备、还原卫生与显式范围排除

- **隔离与还原**：mutation checkout 为独立 Git clone 的 detached `434c533`，`core.autocrlf=false`。F1/F2/F3 每次均用逆补丁恢复；最终 generator HEAD/worktree blob 均为 `80cec2794332a2574e94613ce85de914850dfbce`，测试文件均为 `c5fe9318db3e7847ef624dc4dcd55c7a5cc8781b`；worktree diff exit 0、cached diff exit 0、untracked 0，恢复后专项门 **exit 0，5/5**。
- **无效收据排除**：隔离 clone 的 Vitest `EPERM` 发生在配置临时文件写入、早于测试收集；没有把它计作门红或 finding。全门改在同 commit、blob 已核的共享基线亲跑。
- **他方证据承重 / 装饰**：builder Result 的 mutation 数字只作定位指针；F1/F2/F3、七门、边界与主链均由 reviewer 重跑/重查。Result 对 fixture exposure 的错误已降为 LOW 并在此纠正。
- **显式范围排除**：未启动 server、未连 DB、未跑浏览器 journey；本单只交付 registry 投影生成器与机械测试，没有 MCP handler / UI journey，live 收据回答不了 F1–F3。未持有 Linux runner，F5 只作静态跨平台审计并明示边界。未运行旧 parity mutation、M1/M3/M5/M6/M7 原 mutation，也未检查 12.2b 部署打包——均在本轮 5-7 增量范围外。
- **共享树边界**：复核期间产品代码与常驻测试零写入；唯一持久写入是以 UTF-8 追加本 `## Review`。header 未改，未 commit / push / 碰 main。controller `.M` 按 blob / numstat 排除，不计触及面。
