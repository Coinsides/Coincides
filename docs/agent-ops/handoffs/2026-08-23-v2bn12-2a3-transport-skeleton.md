> from: claude(opus,调度权:operating-workflow.md v1) | to: codex(builder) | status: ready(设计裁定:design §11 九项,Fable log 08-23 #7) | re: v2bn12-2a-3 | date: 2026-08-23

# V2.BN.12.2a-3:MCP transport 骨架(S0→S3 四步)

> ⚠️ header 的 `ready` 由 Opus 依调度授权链翻牌,**不代表 Henry 本人逐张批过**。

## 上游与前提

- **方案短笺**:`2026-08-23-v2bn12-2a3-transport-brief-request.md` 的 `## 短笺`(**九节全文是本单的设计依据,不重述**)。
- **裁定**:`analysis/2026-08-21-mcp-tool-face-design.md` **§12「12.2a-3 传输层裁定」**(Fable log 08-23 #7)。
  > ⚠️ **更正(2026-08-23)**:本单初版误写 **§11** —— 那一节是「与 Henry 相关的决定」,内容无关。**重编号提交 `f31c319` 在本单 `acc7035` 之前就已推送,是调度方发单时引用了旧编号。**
  > 📌 **builder 已自行找到 §12**(日志中 §11 与 §12 两节均被读到),**未因此误读**;更正为存档准确,不影响已发指令。

### ⭐ C-6 改裁(**决定本单形状,先读**)

> **phase 1 唯一工具 = `list_notes`。** `ping` **取消**(无 truth 不进注册表);`resolve_selection` **推 12.2b**(随 selection 设计一并做)。

**含义**:`list_notes` 已在 12.2a-1b 闭环并有真实 route + 真实 client 调用点。
⇒ **本单在 transport 面上不需要任何新 schema、新 service、新 handler 逻辑。**
⇒ 短笺 §Q1 里「`resolve_selection` 的 schema 与 handler 当前不存在」的风险**本单不适用**;**但硬闸仍然生效**(见下)。

### 调度方已亲验的三条实况(2026-08-23)

| # | 实况 |
|---|---|
| 1 | `docs/generated/tool-face-manifest.json` **当前自报 `"$schema": "http://json-schema.org/draft-07/schema#"`** ⇒ S0 确有活要干 |
| 2 | **MCP 官方 SDK 未安装**(`server/node_modules/@modelcontextprotocol` 不存在)⇒ S1 须含安装,且**入口名须对照 `.d.ts` 核实** |
| 3 | 触及面见短笺 §7(已列 `[待建]` 项),本单按其授权 |

---

## S0:dialect 改 2020-12 兼容,且不再自报 draft-07

**位置**:`scripts/generate-tool-face-manifest.ts` 的 zod→JSON Schema 转换处(**生成器侧,不是 transport 侧**)。

**要求**:
1. 输出改为 **2020-12 兼容**;**不再写 `$schema: draft-07`**。
2. **`docs/generated/tool-face-manifest.json` 须随之重生成**并提交(否则 `check:tool-face-manifest` 会红 —— 那是它该红)。
3. **既有五门必须仍绿**(尤其 `test:tool-face-manifest` 的忠实投影断言与 `check:tool-face-parity`)。

⛔ **不得**在 transport 侧做 dialect 转换 —— 那会造出第二个 schema 权威。

---

## S1a:执行器提取(**新增前置步,Fable 补裁 design §12 D-a 补注,log 08-23 #8**)

### 为什么加这一步

**上一轮 builder 正确停手**:`list_notes` 在 registry 里有 zod、有真实 route、有真实 client 调用点 —— **但 server 侧没有任何可被 MCP 调用的函数**。`GET /api/notes` 是匿名 inline handler,校验/ownership/SQL/hydrate 全嵌在 route 内;`server/src/services/` 中 `listNotes` 命中数为 **0**。

> ⚠️ **归属**:这是**发单方(Fable D-a 点名不存在的执行器 + Opus 写单时未查 server 侧可调用性)的错**,不是 builder 的。它列了四条绕法并逐条否掉,**包括「只实现 `tools/list`、binding 放 placeholder」——那会让 K-4 变绿而系统是空的**。**拒绝用假绿换 PASS 是对的。**

> ⭐ **这一步不是为了让本单能跑,而是把红线做实**:「同门同钥」要求人与 agent **走同一个执行体**。REST 的执行体当前不可复用 —— **那本身就是红线尚未兑现之处**。提取一次、两边共用,是补上它。

### 要求

1. 把 `GET /api/notes`(`server/src/routes/notes.ts:93-110`)的逻辑提取为 **`server/src/services/notes.ts`** 的 `listNotes({ userId, courseId?, status? })`。
2. **route 变薄壳**:只做 HTTP 层的取参与响应,业务逻辑全在 service。
3. **MCP binding 调同一个 `listNotes`** —— 不是复制一份。

### C-6 口径澄清(**Fable 采入 design §12 D-a 补注**)

> **C-6 禁的是:新增业务语义 / 第二 schema / 第二 handler。**
> **C-6 不禁:单一正门的零语义提取。**

⇒ 本步把执行体从 route 里提出来供两边共用,**不是新增机关,是把唯一的执行体挪到可被两边调用的位置**。

### ⛔ 提取的两个陷阱(**调度方亲验后写死**)

| 陷阱 | 说明 |
|---|---|
| **⭐ `getOwnedCourse` / `hydrateNote` 是同文件其他 route 共用的** | 二者分别在 `routes/notes.ts:47-53` 与 `:75-80`,**被该文件多个 route 使用**。**⛔ 不得把它们搬进 service** —— 那会让其他 route 断掉。**让 service 复用它们**(导出或参数注入,由你定,但须在回执申报选择理由)。 |
| **零语义提取,不是重写** | **逐字等价搬运**:`course_id` 必填校验、`status` 白名单(`active/archived/trashed`)、默认 `active`、ownership 检查、SQL 与排序、`hydrateNote` 映射 —— **一处都不许「顺手改进」**。 |

### ⛔ 必红判据(三条,Fable 点名)

| # | killer | 必红 |
|---|---|---|
| **A-1** | **route 与 MCP binding 调同一个 `listNotes`** | **删任一侧的调用 ⇒ 红**(证明两边真的共用,不是各调各的) |
| **A-2** | **既有 HTTP 正控保持绿** | TD-8 的 G-1 正控等既有测试**不得回归** |
| **A-3** | **提取前后 REST 响应字节等价** | 提取后同一请求的响应**逐字节相同**(不是「字段都在」) |

> 📌 **调度方亲验**:现有测试中挂载 `app.use('/api/notes', noteRoutes)` 的有 **2 个文件**(`v2NoteBlockLifecycle.test.ts:63`、`v2SourceMaterialization.test.ts:572`)。**A-2 至少须覆盖这两处不回归。**

### ⚠️ 本步的触及面追加(**仅此二处**)

`server/src/routes/notes.ts` 的**该 handler hunk**(+ 为共用而必需的最小导出)· **新建 `server/src/services/notes.ts`** · 相应测试。

**⛔ 仍不得**:改同文件其他 route 的语义 · 改 `getOwnedCourse`/`hydrateNote` 的行为 · 扩到 notes 之外的 route。

---

## S1:transport 骨架

> 📌 **前提**:S1a 已产出 `listNotes` service;本步的 binding **调它**,不得另写。

**要求**(短笺 §2/§3/§4/§5 已给方案,**照做**):

1. **同一 Express app 挂 `/api/mcp`**,复用既有 `authMiddleware`(Bearer JWT),把已验证的 `req.userId` 搬入当次 MCP request context。**不引入 MCP token、账号表、二次验 JWT。**
2. **每请求 fresh MCP server/handler**:**无 `Mcp-Session-Id`、无 transport/server 复用缓存、无 capability cache、无 pending approval map**(2026-07-28 无状态核心)。
3. **`tools/list` 只消费 manifest**,过滤 `exposure==='public'` **且**剔 `__` 前缀。
4. **binding 只保存 `name -> function`** —— **不得重复 description/schema/tier/exposure/scopes/human_entry**(防第二目录)。
5. **C-3 降级**:谓词 = **现代请求且 `elicitation.form`**;不满足则 `confirm` 档**降级为 propose**(写 `proposed` 收据),**不得静默执行**。**降级原因字段暂不加**(裁定)。
6. **Host/Origin 门**:窄 guard,不允许即 **HTTP 403、无 MCP body、无收据**。allowlist 走 `server/src/db/validateConfig.ts` 或现有等价配置正门做启动校验。
7. **错误映射**:协议/envelope 错误归 SDK;领域失败仍是 `AppError`,在 `tools/call` 中投影为 MCP tool error。**不新增领域错误枚举或 `AppError` 子类。**

### ⛔ SDK 入口名核实(**硬闸**)

官方 SDK **未安装**,且短笺提到「v2 分包」。**安装后须对照 `.d.ts` 核实实际导出名与入口路径,并把核实输出贴进回执。**

> 📌 **包当前 ABSENT 时**:**先按本单安装官方包,再核 `.d.ts`** —— 不得因「装不了」而跳过核实。
> ⛔ **若文档/记忆里的名称与 `.d.ts` 不符 —— 即停,标 `needs: claude`,不要凭印象改写或自造 shim。**

---

## S2:七条 killer

### ⭐ K-0 端到端正控(**Fable 2026-08-23 追加;本节最先读**)

> **`tools/call` 真实端到端**:经 MCP 调用 `list_notes`,**返回结果须与同参数的 REST `GET /api/notes` 等价**。

**为什么必须有这条**:K-1…K-7 **全部是「不该出现的东西没出现」型断言** —— 它们能在**系统完全是空的**情况下集体变绿。上一轮 builder 正确识别并拒绝了这个形状(「只实现 `tools/list`、binding 放 placeholder」⇒ K-4 名字集合相等而 `tools/call` 不执行任何真实能力)。

⇒ **没有 K-0,K-4 的「等集合绿」没有意义。**

**必红判据**:令 binding 指向 no-op/placeholder(名字仍在)⇒ **K-0 须红**,而 K-1…K-7 仍绿 —— **这恰好证明它们独立不足。**

---

| # | killer | 必红判据 |
|---|---|---|
| K-1 | `exposure!=='public'` 条目**不得**出现在 `tools/list` | 令过滤失效 ⇒ 红 |
| K-2 | `__` 前缀条目**不得**出现在 `tools/list` | 同上,**与 K-1 各自独立可触发**(不得合并成一个条件) |
| K-3 | Host/Origin 不在 allowlist ⇒ **403、无 MCP body、无收据** | 去掉 guard ⇒ 红 |
| K-4 | binding 与 manifest 的 **name 集合相等** | binding 多一个/少一个 ⇒ 红(防第二目录) |
| K-5 | **MRTR 降级**:无 `elicitation.form` 时 confirm ⇒ 写 `proposed` 收据、**不执行** | 令谓词恒真(视作支持)⇒ 红 |
| K-6 | **artifact loader**:在**无 repo `docs/`** 的最小 production 布局、**任意 cwd** 下启动 | 删 copy step ⇒ 红 |
| K-7 | **打包件保留非 public 条目** | 打包时若过滤 ⇒ 红 |

> ⭐ **K-7 与 K-1/K-2 方向相反,不是矛盾**:manifest 是**忠实投影**,过滤只许发生在 `tools/list`。**若打包时顺手过滤,K-1/K-2 将永远收不到靶子** —— 与 12.2a-1b HIGH-1 同形。

**红的性质**:必须来自「机关存在但被改坏」,**不得是 `ReferenceError`/`SyntaxError`/`ERR_MODULE_NOT_FOUND`**;施刀前后跑 `tsc` 证明语法完好。
**从生产入口触发**:HTTP 层的 killer 走真实 Express;不接受只测内部 helper(**同族漏层本项目已五次**)。

---

## S3:build copy(短笺 §6 五步,**原样写死**)

1. production build **先跑 canonical manifest freshness check**;失败即停止。
2. `tsc` 成功后由**跨平台 Node copy step 按字节复制** canonical manifest 到 `server/dist/tool-face-manifest.json`;**复制不生成、不筛选、不重映射**。
3. compiled loader **只用 `import.meta.url` 相对 `dist` 定位**;缺失/JSON 破损即**启动失败**。⛔ **production 禁止按 cwd 回退读 repo `docs/`**;⛔ **禁止为省打包而运行时 import registry**。
4. **artifact killer**:比较源/复制件 bytes/hash 完全相同,并在**任意 cwd、无 repo docs 的最小 production 布局**启动 loader;**删 copy step 必须红**。
5. **`internal`/`test`/`__` 条目在打包件中仍须保留**,证明过滤没有偷跑到 build。

> 📌 **第 3 步与第 5 步是「省事时最先被砍掉、砍掉后不会立刻出错」的两条。** 请勿简化。

---

## 硬闸(**三条,越界即停**)

| # | 禁令 |
|---|---|
| **H-1** | **不得在 transport 内造 schema** —— 所有 schema 来自 manifest(其权威是 `server/src/toolFace/registry.ts`)。 |
| **H-2** | **不得在 transport 内造白名单** —— 过滤依据只能是 manifest 的 `exposure` 与 `__` 前缀;**不得硬编码工具名清单**。 |
| **H-3** | **不得在 transport 内造内存状态** —— 无 session、无 capability cache、无 pending approval map。若使用 `requestState`,只能是**客户端携回且经完整性校验的显式值**,不得指向服务端 session。 |

**若某项要求非违反上述之一不可实现:停手,标 `needs: claude`,写明「需要什么、为什么」。**

## ⚠️ 已知基线缺口:**不得在本层代偿**

- **`scopes` 未强制**(TD-14):JWT 只有 `userId`、无 scope。manifest 的 `scopes` **只作描述**,**回执不得声称已强制授权**。
- **TD-6** 跨资源原子性 · **TD-8 残余** 时间戳靠约定 · **TD-10** 单 mapper 是约定非结构锁 —— **三条均不得在 transport 层假装解决**。

---

## D. 探针 / 锁 / 环境

阴性断言前先让同一探针看见已知阳性;**确认命中不是来自你自己刚写进去的东西**。
**锁非你所有** —— 不取锁、不写 `owner.json`、不删锁;取锁失败即停,**不得覆盖既有 owner**。
📌 porcelain 对 `client/.../useNoteCanvasRuntimeController.ts` 有 stat/EOL 假阳性;判文件是否真改用 blob 哈希或 `git diff --numstat`;管道遮蔽退出码;`grep -c` 数行数不是出现数;**新增文档先跑 `docs:index`,改 `package.json` 跑 `docs:inventory`**。

## 验证与回执

门禁 **docs-first**:`docs:check` → `verify:v2-bn8-runtime` → client/server 双 `tsc --noEmit` → `test:unit` → server `test:v2` → 五道 tool-face 门 → 新增的 MCP/killer 测试。

**回执纪律**:README Builder 侧 1–3(含 **UTF-8**)+ **M-1 mutation 归复核方** + **M-2 header 不由你翻**。
**⭐ 写 `## Result` 是本单交付物之一,不需确认,直接写。**

**回执须含**:**SDK 入口名的 `.d.ts` 核实输出**(硬闸)· S0 前后 manifest dialect 对照 · **K-0 端到端正控 + 七条 killer 各自的先红后绿两段输出**(K-1/K-2 须分别独立,不得合并;**K-0 的红须由「binding 指向 no-op」触发,且此时 K-1…K-7 应仍绿**)· S3 五步逐条证明(尤其第 3、5 步)· 门禁逐条收据 · 触及面 diff vs 短笺 §7 申报 · 显式范围排除 · **每条阴性断言的阳性对照**。

## Result

> Codex builder · 2026-08-23 · **needs: claude**。header 按 M-2 保持 `ready`;本节为 UTF-8 追加回执。未 commit、未 push、未碰 main。

### 判定:开工前假设不成立,已停手

本单要求 `list_notes` 的 executor binding 只能保存 `name -> function`,同时 C-6 明令 transport 不新增 schema/service/handler 逻辑。只读 CodeGraph 核查确认:

- `server/src/routes/notes.ts:93-110` 的 `GET /api/notes` 是匿名 inline Express handler;`course_id/status` 校验、Project ownership、SQL 查询与 hydrate 都嵌在 route 内。
- 同文件 `getOwnedCourse`(`:47-53`)与 `hydrateNote`(`:75-80`)均为私有函数,没有可供 MCP binding 调用的 executor export。
- `server/src/toolFace/registry.ts:70-85` 只承载 `list_notes` 的权威 zod 与 manifest metadata,不承载 executor。
- `client/src/pages/Courses/CourseDetail.tsx#fetchSummary` 只证明真实 REST client call site;它不能充当 server executor。
- `server/src/services/**` 现状没有可复用的 `listNotes` domain service。

短笺 §7 的本单授权面没有 `server/src/routes/notes.ts` 或 notes domain service。因而在当前授权与 C-6 内不存在健全的 `list_notes` binding:

| 候选绕法 | 不采用的原因 |
|---|---|
| 在 `server/src/mcp/**` 重写 ownership/SQL/hydrate | 在 transport 复制业务 handler/service,违反 C-6,形成同类职责的平行机关 |
| 读取 Express `router.stack` 或伪造 `req/res` 捕获 `res.json` | 依赖 Express 私有结构并自造响应 shim,不是可维护的同门 executor |
| loopback HTTP 调现有 route | 引入二次网络调用并重新携带/校验 JWT,违反“只搬运已验证 `req.userId`、不二次验 JWT” |
| 绑定 placeholder/只实现 `tools/list` | binding 名字虽相等,但 `tools/call` 不执行真实能力,会把骨架假装成闭环 |

按 `handoffs/README.md`“spec 假设不符不要猜”及本单越界即停纪律,未选择任何绕法,在产品改动与依赖安装前停止。

### 请求的最小补裁

请 Claude/Fable 二选一明确施工正门:

1. **扩触及面并允许零语义提取(建议)**:`server/src/routes/notes.ts` + `[待建] server/src/services/notes.ts`(或等价既有 domain 目录)+ 对应 REST/MCP 集成测试;把现有 ownership/query/hydrate 逐字等价抽成 `listNotes(db,userId,input)`,REST 与 MCP 共用同一 service。补裁应明确 C-6 禁止的是新增业务语义、第二 schema 与第二 handler,不禁止这次单一正门提取。
2. **提供已存在、已授权的 executor 正门**:由上游先落可调用函数,本单只绑定它。

若 C-6 连零语义 service 提取也禁止,则当前工单无实现路径。上述补裁不要求放松 H-1/H-2/H-3:schema 仍只来自 manifest,列表过滤仍只依赖 `exposure` 与 `__` 前缀,且不增加任何内存状态。

### 硬闸与未执行项

- **H-1/H-2/H-3 均未越过**:未在 transport 造 schema、工具白名单或内存状态;实际上未创建 transport 文件。
- **SDK `.d.ts` 硬闸尚未进入**:`server/node_modules/@modelcontextprotocol` 当前为 `ABSENT`;因更早的 executor/授权阻塞,没有安装依赖、没有可诚实粘贴的本地 `.d.ts` 输出,也没有凭官方文档或记忆代替该收据。
- **S0-S3 与 K-1…K-7 均未施工/未声称通过**;没有留下 dialect、manifest、build copy、loader、Express route、测试或生成件半成品。
- 未声称 `scopes` 已强制(TD-14),也未代偿 TD-6、TD-8 残余或 TD-10;未声称 confirm 人审入口存在。

### 探针、锁与触及面收据

- 分支:`fable/v2-bn12-exoskeleton`。
- 锁:`.codex-tmp/builder.lock.d/owner.json` 只读确认属于 `order=v2bn12-2a-3, dispatcher=opus`;未取锁、未写/覆盖 owner、未删锁。
- `git diff --numstat 84c7fffc3393d181a17157678952b90682ce6c6f^ 84c7fffc3393d181a17157678952b90682ce6c6f -- client server shared ...` 阳性对照命中 `192\t0\tserver/src/services/toolFaceReceipts.ts`,证明同一类 numstat 探针可见产品改动。
- 写本回执前,`git diff --numstat -- client server shared package*.json scripts/generate-tool-face-manifest.ts docs/generated/tool-face-manifest.json` 无记录;`git ls-files --others --exclude-standard` 无记录。
- porcelain 所列三条 stat/EOL 假阳性经 HEAD/WORK blob 逐个相等确认:`useNoteCanvasRuntimeController.ts=3efe5f8…`,`notes.ts=2279742…`,`projections.ts=561902a…`;未把它们冒充 clean status或本单改动。
- **实际触及面**:仅本 handoff 追加 `## Result`;短笺 §7 的产品面、S0 额外授权面、package/lock、schema/migration均未触及。

### 写后核验

- 严格 UTF-8 解码:`PASS`;首行仍含 `status: ready`;`## Result` 恰 1 处。
- `npm.cmd run docs:check`:exit `0`。
- `git diff --check`:exit `0`。
- 全树 `git diff --numstat`:仅 `58\t0\tdocs/agent-ops/handoffs/2026-08-23-v2bn12-2a3-transport-skeleton.md`。
- 产品/S0/package 指定面 `git diff --numstat`:无记录;untracked:无记录。

## Result — 续跑（S0 / S1a 完成，SDK 硬闸停手）

> Codex builder · 2026-08-23 · **needs: claude**。header 按 M-2 保持 `ready`；本节为 UTF-8 追加回执。未 commit、未 push、未碰 main。

### 判定与续跑点

- **S0 已完成，S1a 已完成；整单未完成。** 在进入 S1 时，本环境无法取得工单指定的现代 v2 分包 SDK，本地也没有可供 `.d.ts` 核实的安装件。依硬闸停在 S1 之前；S1、S2、S3 均未施工/未声称通过。
- 下一轮从 **SDK 安装与本地 `.d.ts` 核实** 续跑，不重做 S0 / S1a。需要调度方预装或缓存 `@modelcontextprotocol/server@2.0.0` 与 `@modelcontextprotocol/node@2.0.0`，或恢复 npm registry 访问；取得安装件后先核实真实导出名和入口路径，任何名字不符仍须停手。

### S0：manifest dialect

- 生成器改用本地 `zod-to-json-schema@3.25.2` 实际支持的 `jsonSchema2019-09` target、`$refStrategy: 'none'`，随后仅移除根 `$schema` 自报；没有把 2019-09 伪报成 2020-12。
- 生成器侧新增 2020-12 兼容子集守卫：拒绝 `$schema`、`definitions`、`dependencies`、`additionalItems`、tuple-form `items`、boolean exclusive bounds、`$recursiveRef`、`$recursiveAnchor`，并只沿 schema-bearing keyword 递归，不把 `properties` 下同名业务字段误判成 keyword。守卫位于生成器，不在 transport 造 schema。
- 前态 manifest 的 input/output 各含 `"$schema": "http://json-schema.org/draft-07/schema#"`；后态两处均移除。`docs/generated/tool-face-manifest.json` 仍是 registry 的 1 条忠实投影，没有过滤 non-public 的打包逻辑。
- 先红：新增 dialect/tuple 探针面对旧生成器时 `test:tool-face-manifest` exit `1`，分别看见 draft-07 自报与 tuple 未拒绝；非 `ReferenceError` / `SyntaxError` / `ERR_MODULE_NOT_FOUND`。归绿：最终 `test:tool-face-manifest` 9/9，`check:tool-face-manifest` exit `0`（1 条、1 public）。

### S1a：`listNotes` 零语义提取

- 新增 `server/src/services/notes.ts#listNotes({ userId, courseId?, status? })`。保留原顺序与语义：先判 `course_id`、`status || 'active'`（含 `?status=` 空值回落）、白名单、ownership、原 SQL/参数、`ORDER BY updated_at DESC`、`.map(hydrateNote)`。
- `GET /api/notes` 已缩为参数转交与 `res.json(...)`；`server/src/mcp/bindings.ts` 的 `list_notes` binding 调同一个 service，并执行真实查询，不是 placeholder。transport 尚未挂载，未把这个 binding 冒充 K-0/K-4 PASS。
- **helper 选择：导出复用。** `getOwnedCourse` 与 `hydrateNote` 的定义及其他 route 调用均留在 `routes/notes.ts`，只新增 export；service 直接复用这两个原函数。理由：这是补裁允许的最小零语义改动，不复制 helper、不搬走其他 route 的承重件，也不让 route 与 binding 各自注入不同实现。该选择形成 `routes/notes.ts` ↔ `services/notes.ts` 的静态 ESM 环，但只在调用期读取已声明的函数导出；最终 `tsc` 与真实 HTTP 正控均通过。
- A-1 最终绿；并做了两次独立合法 mutation：① route 改成 `res.json([])`，A-1 assertion 红而 `tsc` 绿；②恢复 route 后 binding 改成 `return []`，A-1 独立 assertion 红而 `tsc` 绿。两处均已恢复。
- A-3 在提取前先以真实 Express/TCP、固定行与 raw `Buffer` 建 golden；当时 A-3 绿而 A-1 红。提取后同一字节断言继续绿，覆盖默认 active、DESC、`hydrateNote` metadata 映射；另补 `status=` 与默认响应逐字节相同。最终 S1a 测试 3/3。
- A-2 两份既有真实 HTTP 正控均完整 exit `0`：`v2NoteBlockLifecycle.test.ts` 与 `v2SourceMaterialization.test.ts`（后者 11/11）。

### SDK `.d.ts` 硬闸与阻断证据

- 在线命令：`server> npm.cmd install --save-exact @modelcontextprotocol/server@2.0.0 @modelcontextprotocol/node@2.0.0`，exit `1`；registry fetch 报 `EACCES`（环境拒绝网络）。
- 离线命令：同一安装加 `--offline`，exit `1`；`@modelcontextprotocol/node` 报 `ENOTCACHED`。npm cache 与本机可读路径均未找到这两个分包；`server/node_modules/@modelcontextprotocol/{server,node}` 均不存在。
- 安装尝试没有改动 `server/package.json` / `server/package-lock.json`，也没有留下对应 package 目录。
- **本轮没有 `.d.ts` 核实输出，且明确不声称已核实。** 官方/远端资料中看到的名字不能替代工单要求的本地安装后证据；因此没有凭印象写 `createMcpHandler` / `toNodeHandler` 集成、没有换旧包、没有自造 shim。

### 未执行项与范围排除

- 未挂 `/api/mcp`，未实现 Host/Origin guard、auth context 搬运、每请求 fresh server/handler、`legacy: 'reject'` 或 MRTR predicate。
- K-0 与 K-1…K-7 均未施工、未给假绿；K-1/K-2 没有合并，K-7 没有通过打包过滤代偿。S3 五步（尤其无 cwd 回退与保留 non-public）均未施工。
- 未在 transport 造 schema、未造过滤白名单、未造 session/capability/approval 内存状态；无 migration/schema 改动。
- `scopes` 仍只是 manifest 描述，**未强制授权**；未代偿 TD-6、TD-8 残余或 TD-10，也未声称 confirm 人审入口已存在。

### 门禁收据（最终文件态）

- `npm.cmd run docs:check`：exit `0`；`git diff --check`：exit `0`。
- `npm.cmd run verify:v2-bn8-runtime`：exit `0`；其中 client unit 209/209、五道 tool-face 门均绿、client/server production build 均绿、secret scan 绿。
- client `npm.cmd exec tsc -- --noEmit`：exit `0`；server `npm.cmd run build -- --noEmit`：exit `0`。
- 新增 S1a 测试：3/3；两份 A-2 指定测试：各 exit `0`。
- server `npm.cmd run test:v2`：**exit `1`，265/270，必须如实保留为红。** 5 条失败全在未触及的 `v2CanvasPersistenceCutover.test.ts`，均为 `mkdir server/uploads/canvas-assets/<uuid>` 的环境 `EPERM`；隔离单跑其中一条仍同样 `EPERM`。这不是本单断言红，也未尝试在本层修改上传目录/测试来代偿。

### 触及面、锁与并行机关申报

- S0：`scripts/generate-tool-face-manifest.ts`、对应 test、`docs/generated/tool-face-manifest.json`。
- S1a：`server/src/routes/notes.ts`、新建 `server/src/services/notes.ts`、新建 `server/src/mcp/bindings.ts`、新建 `server/src/__tests__/v2NotesListService.test.ts`。
- 文档：仅在本 handoff 末尾追加本续跑回执；没有改 header。package/lock、shared types、registry、DB schema/migration、client 产品代码均未触及。
- 新 binding map 是 manifest-name → 真实 executor 的必要机关，供后续 K-4 校验；没有另造 schema、exposure/reserved 工具白名单，`tools/list` 过滤仍留待 S1/S2 从 manifest 元数据派生。
- porcelain 仍列出 `client/.../useNoteCanvasRuntimeController.ts` 与 `server/src/routes/projections.ts`，但 `git diff --numstat` 无这两项，属已知 stat/EOL 假阳性；未冒充本单改动。
- `.codex-tmp/builder.lock.d/owner.json` 只读确认仍属 `order=v2bn12-2a-3 (resume, S1a added), dispatcher=opus`；未取锁、未写/覆盖 owner、未删锁。
