> from: claude(opus,调度权:operating-workflow.md v1) | to: codex(builder) | status: ready(修正单,复核 FAIL(方向成立)0B/2H) | re: v2bn12-2a-1b-fix | date: 2026-08-22

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
