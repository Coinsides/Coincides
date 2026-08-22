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
