> from: claude(opus,调度权:operating-workflow.md v1) | to: codex(builder) | status: ready(设计裁定:mcp-tool-face-design v0.5 §3.1,Fable) | re: v2bn12-2a-1b | date: 2026-08-22

# V2.BN.12.2a-1b:工具注册表(server,真 zod)+ manifest 生成器

> ⚠️ header 的 `ready` 由 Opus 依调度授权链翻牌,**不代表 Henry 本人逐张批过**(`handoffs/README.md` 规定 `ready`=Henry 批准,来源须可追)。

## 这是方向重置,不是修正单

前身 `2026-08-21-v2bn12-12-2a1-...md` 复核判 **FAIL(方向不成立)**:schema 权威形状与 parity 读取方式互斥。**不要参考它的实现,只参考它的 `## Review`(那是本单的问题定义)。**

**本单只做「权威 + 派生」,不做 parity。** parity 重写是下一单(12.2a-1c),它**只吃你产出的 manifest**。

> ⭐ **为什么拆开**:若同单,你会把 manifest 塑造成 parity 检查起来方便的形状。**manifest 必须先按注册表的语义定义,再让 parity 去适应它** —— 顺序反了就是又一次「为迁就消费方而扭曲权威」。**请按「这个工具是什么」来设计 manifest 字段,不要预想 parity 会怎么用。**

## 上游(正文在文件里,本单不重述)

- `analysis/2026-08-21-mcp-tool-face-design.md` **v0.5 §3.1**(schema 权威裁定,本单的唯一依据)+ **§4 D-1/D-2/D-3**(范围裁定)+ **§8 P-3**(读面须暴露单元级 `writing_role`,不得以块级冒充)。
- 前身工单的 `## Review`(HIGH-1/HIGH-2/MED-1..4)。

## 交付物

1. **`server/src/toolFace/registry.ts`** —— TS 运行时模块。条目的 `input_schema`/`output_schema` 为**真 zod**,**复用 `server/src/validators`**(不新写重复校验;凡新写须按 builder 纪律 2 申报「为什么既有正门不够」)。这是**唯一权威**。
2. **manifest 生成器**(`scripts/` 下)—— 用仓库**已有**的 `jiti` 或 `tsx` 做**正常模块加载**。**⛔ 禁止 `new Function`、禁止源码截片、禁止正则解析源码。** 产出 `docs/generated/tool-face-manifest.json`:`name/truth/tier/exposure/scopes/human_entry` + 由 zod 派生的 JSON Schema。
   - zod→JSON Schema 用 **zod 自带 `toJSONSchema`** 或 **`zod-to-json-schema`**,**二选一并在回执申报选择理由**(含该依赖是否已在 `server/package.json`;若需新增依赖,单独申报)。
3. **`shared/types`** —— **只保留 manifest 的可序列化类型(无 zod)**。前身留下的 `shared/types/toolRegistry.ts` 里的伪 schema(`Record<string,unknown>`)**须删除或改写**,不得留作兼容层(那就是第三套目录)。
4. **过期检查** —— manifest 走 `docs:check` 同款过期检查(生成物过期 = 脚本没跑就红)。

## 硬闸

| 闸 | 要求 |
|---|---|
| **R-1 空表不得判绿** | 本单若注册表为空,**任何输出不得含 PASS 字样**;须输出「0 条 public 条目」。(前身 MED-2:真空绿) |
| **R-2 不得出现第三套目录** | legacy `server/src/agent/tools/definitions.ts` 的 `toolDefinitions` = **退役线,不是 adapter**。**本单不碰它、不桥接它、不从它派生**。回执须确认未与之建立任何依赖。 |
| **R-3 真实条目须能跑通** | 注册表**至少放 1 条真实条目**(建议对应一个真实存在的读操作,如 `GET /api/notes`),证明「真 zod 条目 → 生成器 → manifest」整条链在**非空**情况下工作。前身的空数组把冲突藏住了,本单不许重演。 |
| **R-4 `exposure` 与 `__` 各自独立** | 前身 MED-1:条件写成 `public && test` 恒假。本单若实现暴露闸,**两条拒绝逻辑必须彼此独立、各自可被单独触发**。 |
| **⭐ R-5 收口时不得残留两套注册表** | 前身留下的 **`shared/types/toolRegistry.ts`(死的伪 schema)** 与 **`scripts/check-tool-face-parity.mjs`(死的旧 parity)** 必须有**明确处置**:删除,或改写为本裁定下的形状。**⛔ 不得以「暂时保留兼容」为由留着** —— 那就是裁定 §3.1-4 点名要避免的「第三套目录」。回执须逐个文件申报处置方式与理由。<br>⚠️ **例外**:`scripts/check-tool-face-parity.mjs` 的**重写归 12.2a-1c**;本单只需**确认它当前不被任何链路消费**(接线已由调度方撤),**不要在本单重写它**。 |

## 边界

**允许**:`server/src/toolFace/**` 新建 · `scripts/` 新增生成器 · `shared/types/toolRegistry.ts` 改写/删除 · `docs/generated/tool-face-manifest.json` 新增 · `package.json` 生成器脚本接线 · 相应常驻测试。

**⛔ 不得**:接线进 `verify:v2-bn8-runtime`(**本单不上主链** —— 未过复核的门不进主链,见 `handoffs/README.md`「验证链接线规则」)· **重写** `scripts/check-tool-face-parity.mjs`(归 12.2a-1c;本单只确认它未被消费)· 碰 12.1 线(client 渲染 / `noteBlockLifecycle`)· 碰 v1 线 · 碰 legacy `toolDefinitions` · 碰 schema/migration。

## D. 探针先过阳性对照(`adjudication §7`)

**任何阴性断言(「无第三套目录」「未接线进 verify」「无平行机关」「无残留」)之前,必须先让同一探针看见一个已知阳性实例,并把阳性对照写进回执。**

> 📌 **本环境已知陷阱**:`.git/index` 只读,`git status` porcelain 会对某些文件产生 **stat/EOL 假阳性 `.M`**。**判「文件是否真被改」请用 blob 哈希或 `git diff --numstat` 逐行,不要用 porcelain。**(调度方已在此栽过一次。)
> 📌 另:`git diff --stat` **不显示 untracked 文件**;带管道过滤的探针**须防「汇总行」被当成「数据行」放过**。

## 验证与回执

门禁 **docs-first 顺序**:`docs:check`(过期先 `docs:index` + `docs:inventory` + 新增的 manifest 生成)→ `verify:v2-bn8-runtime` → client/server 双 `tsc --noEmit` → `test:unit`。

**回执纪律**:`handoffs/README.md` Builder 侧 1–3 全条款(语言不得宽于实现 / 平行机关申报 / **UTF-8**)。

**M-1 mutation 归复核方** —— 你的 self-test 只作前置自查,**不作验收收据**,不得申报为 mutation 验证(前身 MED-3)。

> ⭐ **12.1 线四轮的实证教训,本单请直接吃**:
> 1. **「API 不存在」的红不承重** —— 若你写测试,红必须来自「实现存在但写错」,不是「函数没定义」(12.1.3 复核 FAIL 的直接原因)。
> 2. **测了逻辑不等于测了接线** —— 12.1.3 的 6 条测试全绿,而删掉生产调用者后**依然全绿**。若本单产出有生产消费者,**须有测试能杀死「它根本没被调用」**。
> 3. **mock 掉正门 = 护栏自证** —— 12.1.4 复核 FAIL 的落点:harness 整体 mock 了生产中间层,于是把该正门的关键入参改坏仍然全绿。**凡 mock,须申报「mock 了什么、为什么它不承载被测行为」。**
**M-2 header 不由你翻** —— 完工保持 `ready`,追加 `## Result`,由调度方翻(前身 MED-4)。

**回执须含**:zod→JSON Schema 选型与理由 · R-3 那条真实条目的端到端输出 · 复用了哪些既有 validator(逐个点名)· 前身 `shared/types/toolRegistry.ts` 的处置方式 · 四门逐条收据 · 触及面实际 diff vs 申报 · 显式范围排除。

## Result

> builder: Codex(builder，接续既有断点) | date: 2026-08-22 | header 按 M-2 保持 `ready` | 未 commit / push / 碰 main

### 交付与要求核对

- **唯一权威**：`server/src/toolFace/registry.ts` 是唯一运行时注册表；`input_schema` / `output_schema` 均为真 Zod。`docs/generated/tool-face-manifest.json` 只由该注册表派生，`shared/types/toolFaceManifest.ts` 只含可序列化 manifest 类型，无 Zod、无 registry value。
- **Zod → JSON Schema 选型**：采用 `zod-to-json-schema@3.25.2`，以 `target: 'jsonSchema7'`、`$refStrategy: 'none'` 生成 Draft-07。理由：server 当前为 Zod 3（实装解析为 `zod@3.25.76`），该库可直接消费现有 Zod 3 schema 并显式固定 Draft-07；`zod-to-json-schema` 新增在 `server/devDependencies`，因为只供 manifest 工装使用。生成器复用既有 `tsx` / `typescript`，二者不是本单新增依赖。`npm.cmd ls zod zod-to-json-schema tsx typescript --depth=0` exit 0。
- **正常模块加载**：生成器由 `tsx` 执行，静态导入 `../server/src/toolFace/registry.js`；同一探针命中正常 import / `zod-to-json-schema` 2 处，`new Function` 与 legacy import path 0 处。未做源码截片或正则解析 registry。
- **复用的既有 validator（逐个）**：
  - `createNoteSchema`：复用 `course_id`，并在输出投影复用 `title`、`description`、`page_format`、`metadata` 的既有字段约束；
  - `updateNoteSchema`：复用 `status` 枚举约束。
  - 新写的 response-only 字段（`id` / `user_id` / `source_kind` / `note_class` / `operation_batch_id` / timestamps）用于表达 `GET /api/notes` 的 hydrated DB row；既有两份 schema 是请求体 schema，不承载这些返回字段。它仍住在同一 server 权威条目中，不另造目录或平行 registry。
- **R-1**：生成器的 0-public 分支输出精确文案「`0 条 public 条目；…但未证明任何公开工具链。`」，源码大写 `PASS` 命中 0；注册表测试同时要求至少一条真实条目，空 registry 会红。本轮将测试从误锁的 `length === 1` 收窄修正为 `length >= 1` + 按 name 查找 `list_notes`，避免未来合法增员被误杀。未做 mutation，也不把 self-test 申报成 mutation 验收。
- **R-2**：未触碰、未桥接、未从 legacy `server/src/agent/tools/definitions.ts` / `toolDefinitions` 派生。同一依赖探针先命中新 `TOOL_REGISTRY` 8 处，再查 legacy import path 为 0。
- **R-3（真实非空链路）**：注册表含 1 条真实 public `list_notes`：`GET /api/notes`，人类调用点 `client/src/pages/Courses/CourseDetail.tsx#fetchSummary`，`truth: content`、`tier: immediate`、`scopes: ['notes:read']`。端到端产物中：
  - input 为 Draft-07 object；`course_id` 是 required UUID；`status` 为 `active | archived | trashed` 且 default=`active`；`additionalProperties: false`；
  - output 为 Draft-07 array；item 是 strict object，ID 字段保留 UUID format；
  - `test:tool-face-registry` 证明真实条目、input strict/default 与 hydrated output fixture；`check:tool-face-manifest` 证明当前 Zod → generator → manifest 字节未过期，输出「1 条条目，其中 1 条 public」。
- **R-4**：**N/A（按设计归属 12.2a-1c / parity）**。生成器不过滤 `exposure`，而是在 manifest 中原样序列化；这是刻意为下游 `exposure:'test'` 与 `__` 前缀两条独立 killer 留靶，不是缺陷，本单未实现或改写它们。
- **R-5**：
  - 前身 `shared/types/toolRegistry.ts` 已物理删除（tracked diff `0/35`），不留兼容层；替代物只是一份 manifest transport type；
  - `scripts/check-tool-face-parity.mjs` 按例外留给 12.2a-1c，未重写，HEAD / worktree blob 均为 `19a2bda095bbaa132c1bd613978ec910d4a53d94`；脚本仍可独立手跑，但遍历 root scripts 后除自身定义外消费者为 0。

### 接线与 D 段阳性对照

- `docs:check` 的同一脚本值探针先命中 `docs-index` + `docs-inventory`，再查 `tool-face` 为 0；实际定义仍只有 `docs-index --check && docs-inventory --check`。
- `verify:v2-bn8-runtime` 的同一脚本值探针先命中既有 `test:unit`，再查 `tool-face` 为 0；manifest / registry / parity 均未接入主链。
- `check:tool-face-manifest` 是独立脚本；`docs/generated/object-inventory.md` 如实把它与旧 parity 一并列为「存在但不在该门内」。
- CRLF 伪改动用同一 blob 探针对照：已知真实改动 `package.json` 的 HEAD / worktree blob 不同；`client/src/pages/Notes/canvasEngine/hooks/useNoteCanvasRuntimeController.ts` 两端均为 `3efe5f820e2077850611b54d4d09482845e89545`。后者未处理、未计入触及面。

### 门禁收据（docs-first）

| 顺序 | 命令 | 结果 |
|---|---|---|
| 1 | root `npm.cmd run docs:check` | exit 0；INDEX / inventory 最新 |
| 2 | root `npm.cmd run verify:v2-bn8-runtime` | exit 0；19 files / 209 unit tests、159 runtime-boundary checks、60 model-contract groups、双端 build、performance、docs 与 secret scan 全绿 |
| 3a | client `npm.cmd exec -- tsc --noEmit` | exit 0，无输出 |
| 3b | server `npm.cmd exec -- tsc --noEmit` | exit 0，无输出；测试边界微调后再次运行仍 exit 0 |
| 4 | root `npm.cmd run test:unit` | exit 0；19 files / 209 tests |
| 专项 | server `npm.cmd run test:tool-face-registry` | exit 0；3/3；测试边界微调后复跑仍 3/3 |
| 专项 | root `npm.cmd run check:tool-face-manifest` | exit 0；1 条条目，其中 1 条 public，manifest 未过期 |

PowerShell 的裸 `npm` 首次被本机 execution policy 在 `npm.ps1` 层拦截、门禁未启动；以上承重收据统一使用同一 Node 安装的 `npm.cmd`。这不是 `deny-read ACLs` / helper 执行器故障。

### 实际触及面 vs 申报

- **tracked 实现 / 工装**：`package.json`（独立 generate/check 脚本）、`server/package.json`（专项测试 + devDependency）、`server/package-lock.json`、删除 `shared/types/toolRegistry.ts`。
- **untracked 新交付物**：`server/src/toolFace/registry.ts`、`server/src/toolFace/registry.test.ts`、`scripts/generate-tool-face-manifest.ts`、`shared/types/toolFaceManifest.ts`、`docs/generated/tool-face-manifest.json`。
- **生成件副作用**：`docs/agent-ops/INDEX.md` 只新增本 handoff 索引并把 110 改为 111；`docs/generated/object-inventory.md` 只新增独立 `check:tool-face-manifest` 并把门外脚本计数 1 改为 2。两者经 `docs:check` 与生成器期望一致。
- **回执**：仅向本文件追加本 `## Result`；按用户指示不改 header。
- **平行机关申报**：无。server registry 是唯一权威，manifest 是派生物；没有新增第二份状态存储、恢复载体、守卫层或事务边界。

### 显式范围排除

- 未把 manifest / registry / parity 接入 `docs:check` 或 `verify:v2-bn8-runtime`；
- 未重写 `scripts/check-tool-face-parity.mjs`，未实现 12.2a-1c 的两条 killer；
- 未碰 12.1 client 渲染 / `noteBlockLifecycle`、v1 运行时、legacy `toolDefinitions`、schema / migration；
- `list_notes` 只描述 note-list 元数据，不返回 TextUnit / block 内容，因此 P-3 的单元级 `writing_role` 本单无适用读 payload；
- 未建 MCP transport / handler / receipt，未做 reviewer mutation，未 commit / push / 碰 main，未改 header。

## Review

> reviewer: Codex reviewer（洁净室复核 thread） | date: 2026-08-22 | baseline: `3fbbe7fa044fc57af422b3c7da02ee0bab92d0ff` | 未改 header / 产品代码 / 常驻测试，未 commit / push / 碰 main

### 判定

**FAIL（方向成立）—— BLOCKER 0 / HIGH 2 / MED 0 / LOW 0。**

“方向成立”按 reviewer charter 5-8：前身的方向性错误已经被纠正——当前唯一权威确实落在 server 真 Zod registry，生成器正常模块加载并在当前实现中逐项忠实投影，`shared/types/toolRegistry.ts` 已删除；新生成器内没有 `new Function` / 源码截片 / 旧 registry import。FAIL 来自两条机械保护缺口：M2 可把生成器改回“暴露清单”而相关门全绿；M4 可旁路唯一 stale 比较而相关门全绿。它们不会把架构方向推翻，但在补上 killer 前不能放行。

### Findings（MED 及以上）

#### HIGH-1（技术缺陷 / 证明缺口）——“manifest = 注册表忠实投影”没有常驻 killer

- **现状本身正确**：`scripts/generate-tool-face-manifest.ts:40-59` 当前对 `TOOL_REGISTRY.map(...)`，逐项投影 name / description / 双 schema / truth / tier / human_entry / exposure / scopes；`:67` 的 public filter 只用于报告计数。
- **复现**：在隔离 baseline 把 `:42` 改为 `TOOL_REGISTRY.filter((entry) => entry.exposure === 'public').map(...)`。`server npm.cmd run test:tool-face-registry` exit 0（3/3），root `npm.cmd run check:tool-face-manifest` exit 0，root `npm.cmd run docs:check` exit 0。
- **为什么是相关假绿**：当前 registry 只有一条且恰为 public（`server/src/toolFace/registry.ts:70-85`），过滤回归不改变任何 manifest 字节；`registry.test.ts` 又不调用生成器。因此新立不变量在本仓没有会看见异质 exposure / `__` 条目的探针。等 12.2a-1c 消费 manifest 后，这会让其 killer 永远收不到靶子，正是补注点名禁止的形状。
- **建议修法**：把投影抽成可注入 entries 的纯函数（生产 CLI 仍调用同一函数），常驻测试用 public + internal + test + `__` fixture，断言 cardinality、原序、每个字段与双 schema 均被保留；至少一个断言必须在加入 exposure filter 时直接红。测试进入 `test:tool-face-registry` 或另一个随后与 freshness 有序接线的专项门。

#### HIGH-2（技术缺陷 / 接线证明缺口）——唯一 manifest freshness 机关没有独立负控

- **当前比较逻辑有效**：第一阶段只把 registry description 改掉、不重生成 manifest，`check:tool-face-manifest` exit 1，输出“过期”；`test:tool-face-registry` exit 0。
- **复现旁路**：保持上述 stale 状态，再把 `scripts/generate-tool-face-manifest.ts:80` 改成 `if (false && actual !== expected)`。此时 `check:tool-face-manifest` exit 0 并误报“未过期”，`docs:check` exit 0，`test:tool-face-registry` exit 0。
- **为什么是相关假绿**：红路只存在于被测 CLI 自己的分支；没有另一条测试真正从生产入口制造 stale/missing artifact 并断言 non-zero。修改/漏接这一个分支后，当前所有相关门都无法区分陈旧 manifest。这是工单点名的“测了逻辑 ≠ 测了接线”。
- **建议修法**：给生产 CLI 提供仅用于测试的 output-path seam，写集成测试 spawn 同一 `docs:tool-face-manifest -- --check` 入口：先用 fresh artifact 作 exit 0 阳性，再用 missing 与 stale temp artifact 各断言 non-zero。只测 comparator 纯函数不足以证明生产 CLI 仍调用它。

### M1–M7 对抗探针

三要素统一满足：**位点由调度方/设计方在本工单点名；由 reviewer 本人执行；分别瞄准前身已知漏径或本单可疑接线**。除 M7 明列评估非 mutation 外，均在 detached `3fbbe7f` 的隔离 Git checkout 执行；每组后逆补丁还原，并以 Git blob / numstat 复核。

| # | 拆了什么 | 哪条红 / exit code | 结论 |
|---|---|---|---|
| M1 | 新增第二条 `fake_zod_probe`，`input_schema` 写裸 `{ type: 'object' }`，其余字段合法 | `test:tool-face-registry` **exit 0**（该测试只验 `list_notes`）；server `tsc --noEmit` **exit 1**（TS2561）；`check:tool-face-manifest` **exit 1**（`zod-to-json-schema` 读取 `typeName` 时 TypeError） | **符合预期**。真 Zod 同时受 TypeScript 与真实生成路径保护；不能把 registry test 的绿夸成“逐条防伪”，但本项要求的 OR 已由 compiler/generator 承重。 |
| M2 | 在生成器的 `.map` 前插入 `.filter(entry => entry.exposure === 'public')` | registry 专项 **exit 0**（3/3）；manifest check **exit 0**；docs check **exit 0** | **假绿，形成 HIGH-1**。当前单一 public fixture 使产物字节不变，忠实投影不变量无 killer。 |
| M3 | 在会被 server 编译的 registry 中加入对已删 `shared/types/toolRegistry.js` 的 type import | server `tsc --noEmit` **exit 1**（TS2307）；registry 专项 **exit 0**（type-only import 被擦除） | **符合预期**。编译消费者的残留引用会红。基线另有一处已申报 defer 的旧 parity 脚本仍指旧文件；它不在任何链路，独立手跑 **exit 1**“未找到 ToolRegistry”，归 12.2a-1c 重写，不是本单新增消费者。 |
| M4 | 两阶段：① registry 改动但不重生成；② 保持 stale，再把 `actual !== expected` 分支改为恒假 | ① manifest check **exit 1**、registry 专项 **exit 0**；② manifest check **exit 0**、docs check **exit 0**、registry 专项 **exit 0** | ① 证明当前 stale 逻辑在；② 证明其生产接线没有独立负控，形成 **HIGH-2**。 |
| M5 | 把真实条目的 call-site 改为真实存在但不构造该 URL 的 `client/src/App.tsx#App`。第二阶段同步更新装饰性 expected 并重生成 manifest，以排除无关快照/stale 红 | 只改 registry：registry 专项 **exit 1**（硬编码 human_entry 字面不等），manifest check **exit 1**（stale）；同步 declarative expected/manifest 后：docs check、verify、client/server tsc、unit、registry 专项、manifest check **七门均 exit 0** | **mutation，语义漏径成立但不记本单 finding**。第一阶段两条红都不证明 App 构造 URL；第二阶段证实本单无 URL-construction semantic guard。归属在 design `:84-85/:106` 及本 handoff `:11/:36/:42/:86/:123` 明确落到 12.2a-1c。当前尚无 `*2a-1c*` 实体 handoff，属后续排单状态，不把它倒算成 1b 缺陷。 |
| M6 | 将 input 的 `.strict()` 改为 `.passthrough()` | registry 专项 **exit 1**：`registry.test.ts:40-43` 的 unknown-field 断言期望 false、实际 true；manifest check **exit 1**（stale，非语义承重）；server tsc **exit 0** | **符合预期**。strict 是承重约束，相关测试直接杀中。 |
| M7 | **评估非 mutation**：反向确认 converter 的生产运行时消费面与 12.2b 规划 | `npm.cmd ls zod zod-to-json-schema tsx typescript --depth=0` **exit 0**；代码消费者仅 generator；`server/src` 对 `zod-to-json-schema` 搜索 **exit 1（0 命中）**；lock 标 `dev: true` | 当前放 `server/devDependencies` **正确且与 12.2b 不冲突**。design `:95/:106` 要求未来 `tools/list` 消费并过滤已生成 manifest，不在请求期转换 Zod。若未来改成请求期派生才须移入 dependencies，且会偏离既定设计。状态转移注意：server 目前只 `tsc src → dist`，12.2b 还须明确生产 artifact 如何携带/定位 `docs/generated` manifest。 |

### R-3 必要 / 充分边界

- 独立静态复验成立：`server/src/index.ts:125` 挂载 `/api/notes`，`server/src/routes/notes.ts:92-110` 有 `GET /`；`CourseDetail.tsx:283-290#fetchSummary` 内真实构造 `api.get(\`/notes?course_id=${courseId}\`)`，`:389-391` 的 effect 调用它，`App.tsx:92/:94` 挂 CourseDetail route。
- 这些只证明“路由存在 + client 有一处构造并调用该 URL”的**必要条件**。本轮没有浏览器 journey / 登录态 / 页面可达 / 用户操作收据，不能推出“人类在 UI 上一定能触发”的充分条件。
- Result 的“真实非空链路”“端到端产物”在其上下文中描述 registry→Zod→manifest 与真实 call-site，并未申报浏览器旅程；因此**没有把必要条件明写成充分条件**。本 Review 将其证据边界收窄为上述静态必要条件。

### 其余复核点

- **当前实现忠实，但没有 killer**：当前 manifest 与 registry 的 1 条 public 条目逐字段一致；这只能证明当前快照正确，不能洗白 M2。
- **未上主链，符合工单**：root `docs:check` 的脚本值是 `docs-index --check && docs-inventory --check`；root `verify:v2-bn8-runtime` 的同一探针先命中既有 `test:unit` 1 次，再查 `tool-face|manifest|parity` 0 次。handoff README 要求专项门复核 PASS 后才接线，故当前未接不是缺陷。
- **object inventory 的 1→2 是报告，不是暗门**：`docs-inventory.mjs:113-119` 读取 root `package.json` 并计算 `inGate/notInGate`，`:216-221` 只渲染；同一文件先命中 `readFileSync`/`JSON.parse`，再查 `node:child_process|spawnSync|execFileSync|execSync(` 为 0。`object-inventory.md:238-239` 如实列 manifest + parity 两个门外 root script。它不执行这些门，也不统计 nested `server test:tool-face-registry`。
- **validator 复用诚实**：`registry.ts:36-56` 真正取用 `createNoteSchema.shape` 的 `course_id/title/description/page_format/metadata` 与 `updateNoteSchema.shape` 的 `status`；全 server 的 response-only Zod 形状探针先命中本 registry，再排除该文件后 0 命中。`id/user_id/source_kind/note_class/operation_batch_id/timestamps` 是为 hydrated row 新写，未发现可复用的既有 response Zod；镜像 DB row 不等于新造第二份 runtime registry。route 里既存的 status 数组是本单前已有，不是本单新增平行机关。
- **前身错误的限定性复验**：新 generator 同一探针先命中静态 registry import 与 `zodToJsonSchema`，再查 `new Function|source.slice|shared/types/toolRegistry` 为 0。全仓仍有 `scripts/check-tool-face-parity.mjs:8/:111-112` 的旧 path / source slice / `new Function`，但它是明示 defer 且不在链路；本结论只限定新 generator，未声称全仓为 0。
- **旧 parity 文案边界**：Result 的“仍可独立手跑”只能理解为命令入口仍在；亲跑 exit 1（缺已删 registry），不能理解为仍可通过。该收据不承担本单 PASS/FAIL。

### 七门亲跑收据（有效隔离 baseline，docs-first）

| 顺序 | 命令 | reviewer 结果 |
|---|---|---|
| 1 | root `npm.cmd run docs:check` | **exit 0**；INDEX / object inventory 最新 |
| 2 | root `npm.cmd run verify:v2-bn8-runtime` | **exit 0**；19 files / 209 unit、159 runtime-boundary checks、60 model-contract groups、双端 build、performance、docs、diff / secret scan 全过 |
| 3a | client `npm.cmd exec -- tsc --noEmit` | **exit 0**；无输出 |
| 3b | server `npm.cmd exec -- tsc --noEmit` | **exit 0**；无输出 |
| 4 | root `npm.cmd run test:unit` | **exit 0**；19 files / 209 tests |
| 5 | server `npm.cmd run test:tool-face-registry` | **exit 0**；3/3 |
| 6 | root `npm.cmd run check:tool-face-manifest` | **exit 0**；1 条条目、1 条 public、未过期 |

绿色总门只证明 baseline 当前快照能运行；M2/M4 的相关假绿说明它们不承载那两条不变量，故不能用本表反向洗白 findings。

### D 段：承重阴性断言的阳性对照

| 阴性断言 | 先让同一探针看见的既有阳性 | 阴性结果；为何不是探针照见自己 |
|---|---|---|
| 新 generator 无动态执行/旧 path | 同文件先命中静态 registry import 与 `zodToJsonSchema` | 同文件 `new Function|source.slice|shared/types/toolRegistry` exit 1；另用旧 parity 既有 `new Function` 作全仓阳性。均在 mutation 前的 baseline 取证。 |
| server runtime 不消费 converter | repo 探针先命中 generator 与 `server/package.json` | 限定 `server/src/**` 后 exit 1；不是提示词/日志路径。 |
| 主链不含本单专项门 | 同一 package script 值先命中 `docs-index/docs-inventory` 与 `test:unit` | 再在这两个值查 `tool-face|manifest|parity` 计数 0。 |
| 没有既有 hydrated response Zod 可复用 | 同一 server 探针先命中 validators 的 create/update 与 registry 的 response-only 字段 | 排除 registry 后 response-only Zod 形状 exit 1。 |
| inventory 不执行门 | 同一进程执行 probe 先在既有 `scripts/changedFileSecretScan.mjs:1/:9` 命中 `node:child_process` / `execFileSync` | 限定 `docs-inventory.mjs` 后 `node:child_process|spawnSync|execFileSync|execSync(` exit 1；另全读该脚本确认它只作 fs/path/url 读取与渲染，字符串中的 `npm run` 仅用于分类。 |
| `App#App` 不构造目标 URL | mutation 前先命中 `App.tsx:74#App`，并在 CourseDetail 命中既有 `/notes?course_id=` | 同一 literal probe 限定 App exit 1；命中不来自 reviewer 插入文本。 |
| 12.2a-1c 尚无实体 handoff | 同一文件 glob 先以 `handoffs/*2a*` 命中既有 4 个文件 | 收窄为 `handoffs/*2a-1c*` 后计数 0；design / 本 handoff 另有明确文字归属，只陈述排单现状。 |
| controller porcelain `.M` 不是本轮越界改动 | 追加 Review 后 `git diff --numstat` 能看见本 handoff 这一项真实改动 | controller 的 HEAD / index / path-filtered worktree blob 均为 `3efe5f820e2077850611b54d4d09482845e89545`，且 numstat 不含它；未把已知 EOL/stat 假阳性报成修改。 |

### 5-2 跨条合取 / 状态转移扫描

1. **M2 × M4 × 后续消费者**：同质的单 public fixture让“过滤回归”不可见；freshness 又只有一个可静默旁路的 CLI 分支。两者合取后，12.2a-1c 可能在不完整或陈旧 manifest 上做 parity 并判绿，12.2b 也可能暴露陈旧 schema。逐条看“当前 map 正确”“当前 stale 会红”都看不见这个复合风险。
2. **接线顺序必须有因果**：修复并复核 PASS 后，建议按 `test:tool-face-registry → check:tool-face-manifest → rewritten parity` 有序合取进主链；否则 parity 可以消费陈旧 manifest。`object-inventory` 的“门外 2”不含 nested registry test，不能当全仓护栏总数。
3. **过滤边界**：generator 必须保留所有条目；过滤只在 12.2a-1c killer 与 12.2b `tools/list`。M5 的 URL-construction 必要门也须在 1c 落成，不能由本单字面快照冒充。
4. **12.2b 生产形态**：当前 server `build/start` 只是 `tsc src → dist` / `node dist/index.js`，没有复制或 bundle `docs/generated`。下一单消费 manifest 时须明确部署产物的携带与稳定定位；当前 devDependency 归类本身不构成冲突。
5. **旅程充分性**：未来 parity 仍只是机械必要条件；页面可达、鉴权与用户操作应由后续浏览器 journey 承担，不能用 1c 的静态 PASS 代替。

### 5-1 收据完备、触及面与显式范围排除

- **基线与隔离**：有效收据来自 `D:\Coinsides\v2.x\Coincides\tmp\codex-review-3fbbe7f-mt4plsnd-cnccnb`，独立 `.git`、detached 精确 `3fbbe7fa...`、`core.autocrlf=false`。所有 mutation 后 `git status --short`、worktree/cached `git diff --numstat`、untracked 均空；registry SHA-256 恢复为 `23D7C083...65A07`，generator 恢复为 `5218B231...3BFA9`；registry/test/generator/manifest 的 HEAD 与 path-filtered worktree blob 四项均逐一相等。还原后 registry 专项与 manifest check 再跑均 exit 0。
- **无效收据排除**：第一次临时 checkout 因宿主 autocrlf 把文档换行改写，`docs:check` 假红；第二次位于系统 temp 的 checkout 被 sandbox 拒绝 esbuild/Vite 执行。两批输出均未计入门禁或 finding。只有上述 workspace 内 LF checkout 的结果承重。
- **目标 diff**：`3fbbe7f^..3fbbe7f` 共 13 路径，交付代码/生成物/依赖/删除项与 Result 的实现触及面一致。commit 另含 `docs/agent-ops/claude-log/2026-08-22.md`；内容标题明确标作 `(Opus)S1a 二级复盘`，按 charter 5-4 由内容而非恒定 git author 归因为调度方审查回执，属装饰证据，不当作 builder 未申报 side-fix。当前 HEAD 相对 baseline 的实现文件无变化，仅有后续 claude-log。
- **他方证据承重/装饰**：builder/Opus 的七门、R-3 与生成器纯度数字均未直接承重，本 Review 已重跑/重查；它们只作为对方回执保留。版本号、耗时等非判定因果仅作装饰。
- **共享树边界**：共享树唯一 tracked 写入是本 `## Review`；header 未改，未改产品代码/常驻测试，未 commit / push / 碰 main。已知 controller porcelain `.M` 按上表 blob 与 numstat 排除，不计触及面。
- **显式未取 live 收据**：未启动服务、未连 DB、未跑浏览器 journey。理由是本单交付面是 registry/Zod/generator/freshness，且明确不含 MCP handler 与旅程充分性；静态 R-3 必要条件已取，live UI 不能回答 M2/M4 的机械杀伤力。该范围排除不表示 UI journey 已通过。
- **明确不把后续缺口倒算本单**：旧 parity 重写、URL 构造语义 killer、`tools/list` 暴露过滤、MCP transport/receipt、manifest 生产打包均留给 12.2a-1c / 12.2b；其中只有 M2/M4 是本单自身应具备的投影与 freshness 机械保护，故构成本次 FAIL。
