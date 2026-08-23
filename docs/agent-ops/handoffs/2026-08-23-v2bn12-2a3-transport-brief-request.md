> from: claude(opus,调度权:operating-workflow.md v1) | to: codex(builder) | status: ready(方案短笺请求;**先答两问,不施工**) | re: v2bn12-2a-3-brief | date: 2026-08-23

# V2.BN.12.2a-3:MCP transport 骨架 —— **方案短笺(先答两问,不写代码)**

> ⚠️ header 的 `ready` 由 Opus 依调度授权链翻牌,**不代表 Henry 本人逐张批过**。
> ⛔ **本单不是施工单。** 交付物是**一份方案短笺**,不是代码。**产品代码 diff 必须为 0。**

## 为什么先要短笺

`adjudication-discipline.md §1` 规定:**大架构面工单开工前,裁定方必须先答两问才放行施工。** transport 层是 12.2 里最容易「另造一套」的地方 —— 它天然想要自己的会话、自己的错误模型、自己的鉴权。**故先答两问。**

---

## 你要答的两问(**逐条答,不得合并**)

### Q1 平行机关问

> **本方案是否在既有正门之外,另造了承载同类职责的机关?若是,为什么正门不够?**

**必须逐项对照的既有正门**(不得只答「没有」):

| 职责 | 既有正门 | 你的方案是否另造? |
|---|---|---|
| 鉴权 | 现有 Express 中间件(`server/src/routes/**` 的鉴权链) | |
| 入参校验 | `server/src/validators/**`(zod) | |
| 工具目录 | **`server/src/toolFace/registry.ts` = 唯一权威**;`docs/generated/tool-face-manifest.json` = 忠实投影 | |
| 收据 | `server/src/services/toolFaceReceipts.ts`(`source_type='mcp'`,tier→status) | |
| 错误模型 | 现有 `AppError` + HTTP 状态码 | |
| 会话/状态 | **MCP 2026-07-28 已移除协议级 session** —— 若你的方案引入任何服务端会话状态,**必须在此显式申报并说明为什么无状态不够** | |

### Q2 基线保证问

> **本方案是否试图在局部制造它所依附的基线不提供的保证?若是,正解在基线层,不在局部机关。**

**已知的基线缺口(不得在 transport 层假装解决)**:

- **TD-6**:正文 + annotation 双 PUT **无跨资源 durable 耦合**,任一失败可半提交。**transport 层不得声称提供跨资源原子性** —— 那是基线缺口,归专项设计单。
- **TD-8 残余**:`applied_at`/`reverted_at` 靠**约定**而非机关维持单一格式。
- **TD-10**:manifest 的「单一 mapper」是约定不是结构锁。

**⇒ 若你的方案需要上述任一保证,答案是「在基线层补」,不是「在 transport 层兜」。**

---

## 设计约束(已拍板,短笺须在其内)

| # | 约束 | 出处 |
|---|---|---|
| C-1 | **MCP 2026-07-28 无状态核心**:移除协议级 session 与 `Mcp-Session-Id`;`tools/list` 不随连接变化 | 设计稿 §2.1 |
| C-2 | **MRTR 工具级 elicitation**(SEP-2322):`resultType:"input_required"` + `inputResponses` 重试原调用 | 同上 |
| C-3 | **能力协商降级**:client **未宣告** `input_required` 支持时,**confirm 档降级为 propose**(写 `proposed` 收据,等人审),**不得静默执行** | plan S3 |
| C-4 | **只暴露 `exposure==='public'` 且剔 `__` 前缀** | 设计不变量 08-22 补注(过滤只许在①机械门 killer ②本处 `tools/list`) |
| C-5 | **消费 manifest,不消费注册表** | 同上;注册表住 server 是权威,transport 读派生物 |
| C-6 | **范围**:本阶段只做 `ping` + `resolve_selection` 两个工具面入口;**不做写操作工具** | plan S3 |

---

## 短笺须包含(除两问外)

1. **transport 选型与理由**:`StreamableHTTPServerTransport`(官方 TS SDK)架在现有 Express 之后 vs 其他;**须说明 Host/Origin 校验由谁做**(Node transport 直用时须自实现)。
2. **`tools/list` 的派生路径**:从 manifest 到 MCP tool 描述的字段映射;**`__` 与非 public 的过滤发生在哪一步**,以及**如何证明它发生了**(将来的 killer 靶点)。
3. **C-3 降级的判定点**:在哪一层读 client 能力、降级后收据写什么、**人审入口是哪个**(与 12.2a-2 的 `proposed` 收据如何衔接)。
4. **错误映射表**:MCP 错误 ↔ 既有 `AppError`/HTTP 状态。**若需新错误类型,按 Q1 申报。**
5. **⚠️ 生产打包问题**(12.2a-1b 复核 M7 遗留,**至今无人处置**):server 目前只 `tsc src → dist`,而 manifest 在 `docs/generated/`。**生产 artifact 如何携带/定位 manifest?** 短笺须给方案或明确标为待裁。
6. **不做什么**:显式列出本阶段范围外的项。

---

## 边界

**允许**:**只写这一份短笺**(追加到本文件 `## Brief` 节)。

**⛔ 不得**:写任何产品代码 · 新增依赖 · 改 `package.json` · 碰 12.2a-1/a-2 已闭环面 · 碰 12.1 线 / v1 线 · 改 schema/migration。

**产品代码 diff 必须为 0**,回执须附阳性对照证明探针有效。

---

## D. 探针先过阳性对照 / 锁纪律

阴性断言前先让同一探针看见已知阳性;**确认命中不是来自你自己刚写进去的东西**。
**锁非你所有** —— 不取锁、不写 `owner.json`、不删锁;取锁失败即停,不得覆盖既有 owner。
📌 本环境:porcelain 对 `client/.../useNoteCanvasRuntimeController.ts` 有 stat/EOL 假阳性;判文件是否真改用 blob 哈希或 `git diff --numstat`;管道会遮蔽退出码;`grep -c` 数行数不是出现数。

## 回执

**⭐ 写 `## Brief` 是本单交付物,不需确认,直接写(UTF-8)。** header 保持 `ready`,不翻牌。

**须含**:Q1 逐行对照表(六项全填)· Q2 逐条 · 六项短笺内容 · 产品码 diff=0 的证明 · 显式范围排除。

## 短笺

> Codex builder · 2026-08-23。**本节只回答方案问题，不是施工回执；header 保持 `ready`。**

### 1. 先答两问

#### Q1 平行机关问

**结论：本方案不另造承载既有六项职责的平行机关。** 唯一新增的是 MCP 协议适配，以及现有 Express 正门目前没有的 Host/Origin transport 安全门；后者不签发身份、不维护账号或权限状态，不是第二套鉴权。

| 职责 | 既有正门 | 是否另造 | 本方案的接法与边界 |
|---|---|---|---|
| 鉴权 | `server/src/middleware/auth.ts`，由 `server/src/index.ts` 在受保护路由前装配 | **否** | MCP endpoint 继续走同一个 Bearer JWT `authMiddleware`，只把已验证的 `req.userId` 搬入当次 MCP request context；不引入 MCP token、账号表或二次验 JWT。另设窄 Host/Origin guard，是因为当前 `cors({origin:'*'})` + JWT 不校验 Host/Origin，且 server 绑定 `0.0.0.0`，不能防 DNS rebinding。该 guard 属 transport 边界，不取得身份鉴权职责。当前 JWT 只有 `userId`、没有 scope；manifest 的 `scopes` 只可作描述，**不得声称已经强制授权**。若要 scope 保证，应补既有鉴权基线。 |
| 入参校验 | `server/src/validators/**` 的 zod | **否** | SDK 校验 MCP envelope；`tools/list`/SDK 使用 manifest 中由 zod 派生的 JSON Schema，不手写第二份 schema；handler 仍调用既有 zod/service。`SelectionReceipt`/`resolve_selection` 的 server schema 与 handler 当前均不存在，必须在获准施工时落入既有 validators/service 正门，不能在 transport 内临时发明。 |
| 工具目录 | `server/src/toolFace/registry.ts` 唯一权威；manifest 为忠实投影 | **否** | transport 只读取随 artifact 携带的 manifest。必要的 executor binding 只保存 `name -> function`，不得重复 description/schema/tier/exposure/scopes/human_entry，并以 manifest↔binding 等集合 killer 防止它长成第二目录。 |
| 收据 | `server/src/services/toolFaceReceipts.ts` | **否** | effective tier 决定后只调用现有 writer：`immediate -> applied`、`propose -> proposed`。不建 pending 表、内存队列或 transport 调用日志。`confirm` 绝不原样喂给只接受 `immediate|propose` 的 writer。 |
| 错误模型 | `AppError` + HTTP 状态码 | **否** | 只设一层边界映射：协议/envelope 错误归 SDK；领域失败仍是 `AppError`，在 `tools/call` 中投影为 MCP tool error。没有新领域错误枚举或新 `AppError` 子类。 |
| 会话/状态 | 2026-07-28 无协议 session | **否** | 每个请求建立 fresh MCP server/handler；无 `Mcp-Session-Id`、无 transport/server 复用缓存、无 capability cache、无 pending approval map。能力只读当次 request `_meta`；MRTR 重试由客户端重发原调用与 `inputResponses`。若使用 `requestState`，它只能是客户端携回且经完整性校验的显式值，不能指向服务端 session。 |

#### Q2 基线保证问

**结论：本方案不在 transport 层制造基线没有的保证。**

- **TD-6：不兜。** 本阶段 `ping` 与 `resolve_selection` 不写业务资源；transport 不承诺正文 + annotation 的跨资源原子提交，也不承诺原子回滚。收据只观察结果；以后跨资源工具仍只能诚实记录 `revert_outcome: complete|partial`，需要原子性时回到 TD-6 基线专项。
- **TD-8 残余：不兜。** TD-8 主债虽已清，`applied_at`/`reverted_at` 的单一格式仍靠约定。transport 不新增局部 timestamp formatter，也不声称形成结构保证；它只复用现有 receipt service 的写法。若要机关保证，应在基线层补。
- **TD-10：不兜。** manifest→MCP 可以集中在一个 projector，但“当前只有一个实现”不等于结构锁；本方案不声称封住第二 mapper。真正的单 mapper 结构保证仍归 generator/AST 基线门。

### 2. Transport 选型与 Host/Origin

**选 Streamable HTTP 协议形态，复用现有 Express；但不建议照工单中的类名直接施工。** 官方 TS SDK 对 2026-07-28 的现代入口是 `createMcpHandler(factory, { legacy: 'reject' })` + `toNodeHandler`；`*StreamableHTTPServerTransport` 属 2025-era/legacy 入口。故建议挂载：

```text
POST /api/mcp
  -> Host/Origin guard
  -> existing authMiddleware
  -> req.userId + parsed req.body -> per-request MCP context bridge
  -> createMcpHandler/toNodeHandler (fresh server per request)
```

- 不另开第二个 Express app，不选 stdio、WebSocket、旧 SSE session 或共享长活 transport；route 放在 SPA fallback 与全局 `errorHandler` 之前。
- 现有 `express.json()` 已在 route 前消费 body；bridge 必须把 `req.body` 作为 `toNodeHandler` 的第三参数传入，不能让 SDK 重读已消费的 stream。它只把既有 `req.userId` 适配进 SDK auth context，不二次验 JWT。
- 2026-07-28 路径只收 POST；不提供 legacy initialize/initialized、GET/DELETE session 操作或 resumability。这里的 `ping` 是 Coincides 的应用工具名，不是已从 2026-07-28 core 移除的旧 `ping` RPC。
- **Host/Origin 的责任方**：在同一 Express endpoint 前使用官方 Node/Express validation helper（或逐字等价的窄 middleware），allowlist 来自经启动校验的部署配置。Host 必须命中；浏览器请求带 Origin 时必须命中；无 Origin 的 CLI/harness 请求可继续。非法 Host 与非法 Origin 各自 403，且不得抵达 JWT/handler。全局 CORS `*` 不是这道门。
- 官方依据：[2026-07-28 SDK 迁移矩阵](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/migration/support-2026-07-28.md)、[HTTP serving 指南](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/serving/http.md)、[2026-07-28 规范变更](https://blog.modelcontextprotocol.io/posts/2026-07-28/)。**类名/API 校订须由 Fable 在施工单前拍定；未校订不施工。**

Host/Origin 将来的 killer：用真实 `/api/mcp` 接线，先以合法 Host/Origin + 无 token 命中既有 auth 的 401，证明探针穿过 transport guard；再分别用非法 Host、非法 Origin 断言 403。删任一 guard，只对应的 killer 必须红。

### 3. `tools/list` 派生路径

唯一数据流：

```text
server registry (唯一权威)
  -> 未过滤的 docs/generated/tool-face-manifest.json（忠实投影）
  -> build 按字节携入 server artifact
  -> tools/list 层过滤
  -> MCP Tool 描述
```

`tools/list` 必须先过滤，再映射；不在 generator 过滤，也不加阶段白名单：

```text
entry.exposure === 'public' && !entry.name.startsWith('__')
```

| manifest 字段 | MCP Tool 字段/用途 |
|---|---|
| `name` | `name` |
| `description` | `description` |
| `input_schema` | `inputSchema`，用 SDK `fromJsonSchema()` 接入，不手抄 schema |
| `output_schema` | `outputSchema`，原样保留 array/primitive 等合法顶层形状 |
| `truth/tier/human_entry/scopes` | 一个 Coincides namespaced `_meta`；仅描述/服务端策略输入，不据此假装 scope 已鉴权 |
| `exposure` | 只作过滤闸，不外发 |

保持 manifest 顺序；首期不按连接或 client 改变列表。executor binding 只绑函数，启动时要求其 names 与过滤后的 manifest names 等集合。

**当前前置冲突（已核，不得被 transport 藏掉）：**当前 manifest 唯一条目是 public `list_notes`，代码中尚无 `ping`、`resolve_selection`、`SelectionReceipt` server validator/handler。若直接按 C-4 派生会暴露 `list_notes`，违反 C-6；若在 transport 加 `{ping, resolve_selection}` 白名单则另造第二目录。施工前必须由上游把 registry/manifest 的 public 集合校正为本阶段获准集合（或改裁 C-6），再生成忠实 manifest。该前置不是本短笺的修改授权。

另有一项基线兼容性须施工前裁定：当前 manifest 自报 JSON Schema draft-07，而 MCP 2026-07-28 工具 schema 以 2020-12 为口径。transport 不得静默改写 dialect；应在 manifest 生成基线解决或以官方 SDK 的明确兼容结论放行。

将来的 live killer 必须调用真实 HTTP `tools/list`：

1. 先看见一个安全 public 正控，证明 production manifest loader/projector/handler 接线都活着；
2. manifest 中保留一条 internal/test 条目，断言列表不可见；删除 `exposure` 谓词即红；
3. manifest 中保留一条 public `__` 条目，断言列表不可见；删除前缀谓词即红；
4. 断言 production binding 与过滤后 manifest 等集合，禁止 manifest 外 handler 与无 handler 的 public 条目。

### 4. C-3 能力判定、降级收据与人审

- **判定点**：`tools/call` handler 入口、任何业务副作用和收据写入之前；只读当次 request envelope 的协议版本与 `_meta['io.modelcontextprotocol/clientCapabilities']`，不从 clientInfo/harness 名称猜、不跨请求缓存。
- 2026-07-28 没有一个名为 `input_required` 的独立 capability boolean。form confirmation 的可靠谓词是：modern 2026-07-28 request **且**当次 client 明确宣告 `clientCapabilities.elicitation.form`。若裁定方要用 extension，须先点名 namespaced key；transport 不自行发明。
- **支持时**：首次返回 `resultType:'input_required'`；客户端以新 request id 重试原 `tools/call` 并携 `inputResponses`（及 byte-exact `requestState`，若使用）。handler 验证接受结果后才执行；不保存服务端 session。
- **不支持/缺失/未知时**：立刻把 effective tier 定为 `propose`，**不执行工具业务动作**，调用现有 `writeToolFaceReceipt` 写：`source_type='mcp'`、`source_id=callId`、`status='proposed'`、`applied_at=NULL`，metadata 现有字段为 `tool/tier:'propose'/harness/input_digest/human_entry/resources`，并把收据返回客户端等待人审。不得静默执行，也不得发一个无人处理而挂死的 `input_required`。
- **诚实边界**：现有 receipt metadata 没有 `requested_tier`/`degraded_from`/consent，因此上述写法不会记录“原为 confirm、因能力不足降级”的原因；本短笺不冒充已有该收据。若裁定要求记录，须另行授权收据基线扩展，不能把原因塞进 `resources` 等字段。
- **人审入口的当前事实答案：不存在。** `writeToolFaceReceipt`/`markToolFaceReceiptApplied`/`revertToolFaceReceipt` 当前无生产 caller，也没有 tool-face receipt route/client UI；旧 `/api/proposals` 是退役线，不能冒充。manifest 的 `human_entry` 只是“同一操作的人类正门”指针，不是审核队列。故首个 confirm 工具暴露前必须另裁并核实普通 Express + client 人审入口及其 `proposed -> applied` 接线；本阶段两个 immediate 工具不受阻，C-3 seam 只能先以策略/测试存在。

### 5. 错误映射

不新增错误类型；分清 HTTP transport gate、JSON-RPC 协议错误与 tool execution error：

| 情形 | 既有/协议权威 | 对外映射 |
|---|---|---|
| Host/Origin 不允许 | transport guard（待建） | HTTP 403；无 MCP body、无收据 |
| Bearer JWT 缺失/无效 | 既有 `authMiddleware` | HTTP 401；无 handler、无收据 |
| 非 JSON content type | 官方 HTTP handler | HTTP 415 |
| malformed JSON / invalid JSON-RPC | SDK | `-32700` / `-32600`，HTTP 400 |
| 2026 header mismatch / unsupported protocol version | SDK | `-32020` / `-32022`，HTTP 400 |
| 未知 MCP method | SDK | `-32601`（HTTP 状态沿官方 handler，不经 `AppError`） |
| 未知 tool、MCP params 或投影 schema 校验失败 | SDK + 既有 zod-derived schema | `-32602 InvalidParams`；不造领域错误码 |
| handler 内 `AppError` 400/403/404/409/429 等预期领域失败 | 既有 `AppError(statusCode,message,details)` | HTTP 200 的 `CallToolResult`：`resultType:'complete'`、`isError:true`；安全保留 message/status/details.code，供模型纠正 |
| handler 内 `AppError >= 500` | 既有 `AppError` 500 语义 | 仍是 HTTP 200 的 tool execution error，但 message/details 脱敏；服务端记录完整错误 |
| 非预期 adapter/SDK/server 协议故障 | SDK internal error | `-32603`/HTTP 500；不泄漏内部信息 |
| confirm client 未宣告所需能力 | 本方案 C-3 | **不是错误**：直接降 `propose`；其他确实必须的能力缺失才由 SDK 给 `-32021`/HTTP 400 |
| `input_required` | MRTR 控制流 | 不是错误；不写 `isError:true` |

Express 的全局 `errorHandler` 只负责 handler 外的普通 HTTP/REST 失败；不能把已 dispatch 的 tool `AppError` 变成普通 REST JSON body。

### 6. 生产 artifact 携带 manifest

当前 `server/package.json` 的 `build` 只有 `tsc`，`server/tsconfig.json` 只编 `src/**/* -> dist`；`docs/generated/tool-face-manifest.json` 不会进入 production artifact。方案如下：

1. production build 先跑 canonical manifest freshness check；失败即停止；
2. `tsc` 成功后由跨平台 Node copy step **按字节复制** canonical manifest 到 `server/dist/tool-face-manifest.json`；复制不生成、不筛选、不重映射；
3. compiled loader 只用 `import.meta.url` 相对 `dist` 定位，缺失/JSON 破损即启动失败；production 禁止按 cwd 回退读 repo `docs/`，也禁止为省打包而运行时 import registry；
4. artifact killer 比较源/复制件 bytes/hash 完全相同，并在任意 cwd、没有 repo docs 的最小 production 布局启动 loader；删 copy step 必须红；
5. internal/test/`__` 条目在打包件中仍须保留，证明过滤没有偷跑到 build。

这只是携带同一派生物，不产生第二份权威或第二个 public manifest。未来施工会触及 build/package 配置；本短笺没有实施。

### 7. 触及面申报

**本短笺实际触及面：**仅本 handoff 末尾新增本节；产品代码、测试、依赖、package、schema/migration 均未改。

**若裁定放行，transport 施工预计触及面（不是本单授权）：**

- `server/package.json` 与相应 lockfile（官方 SDK v2 分包与 build copy 接线）；
- `server/src/index.ts`（同一 Express app 的 `/api/mcp` 挂载）；
- `[待建] server/src/mcp/**` 或裁定的等价 toolFace 子目录（per-request factory、manifest loader/projector、仅函数 binding、tier resolver、AppError adapter、user context bridge）；
- `server/src/db/validateConfig.ts` 或现有等价配置正门（Host/Origin allowlist 启动校验）；
- `[待建]` MCP HTTP 集成测试、两条过滤 killer、Host/Origin killer、binding equality killer、MRTR 降级 killer与 artifact loader killer；
- `[待建] scripts/copy-tool-face-manifest.mjs` 或等价跨平台 copy step。

**须先另裁/另授权的前置面：**registry/manifest public 集合与 C-6 对齐；`SelectionReceipt` 权威 zod + `resolve_selection` service；JSON Schema dialect；confirm 人审 route/UI；若需要，收据的降级原因字段。这些缺口不得由 transport 私下白名单、内存状态或旧 proposal 管线代偿。

### 8. 显式不做

- 本单不写任何产品代码、常驻测试或生成件，不新增依赖，不改任何 package/lock；不改 header，不 commit、不 push、不切换或触碰 main，不读取/写入/删除 `.codex-tmp/builder.lock.d`。
- 后续本阶段也只做 `ping` + `resolve_selection` 两个入口；不做读业务工具 `list_notes`，不做任何写操作工具。
- 不碰 12.2a-1/a-2 已闭环实现，不碰 12.1/v1，不改 schema/migration，不接旧 `/api/proposals`。
- 不修或假装修 TD-6、TD-8 残余、TD-10；不做跨资源事务、原子回滚、时间格式机关、mapper 结构锁。
- 不做协议 session、连接态列表、capability cache、多穿戴者并发、legacy MCP 兼容层、新 scope 鉴权系统或新审核系统。

### 9. 产品代码 diff = 0 与探针阳性对照

- 同一 `git diff --numstat` 探针先对本单开始前已有的历史提交 `84c7fffc3393d181a17157678952b90682ce6c6f^..84c7fffc3393d181a17157678952b90682ce6c6f` 运行，命中 `192\t0\tserver/src/services/toolFaceReceipts.ts`。该阳性来自已提交的 12.2a-2 生产文件，不是本短笺写入或文字回显，证明探针看得见产品改动。
- 本节写入前，`git diff --numstat -- client server shared package.json package-lock.json client/package.json client/package-lock.json server/package.json server/package-lock.json` 无记录；写入后以同一命令复核仍无记录。因此本单产品代码 diff 为 0；全树 content numstat 唯一记录为本 handoff。`git ls-files --others --exclude-standard -- .` 无记录。
- porcelain 另列出的三个路径是开工前已有的 stat/EOL 假阳性；逐个以 `git rev-parse HEAD:<path>` 对 `git hash-object --path=<path> <path>`，HEAD/WORK blob 分别同为 `3efe5f820e2077850611b54d4d09482845e89545`、`22797422ce8fde9b94ae0e28778d6ef0728fcc24`、`561902a449b50ce254b650de5a337973a8fbc26d`，不冒充 clean status，也不计为本单改动。
- 写后严格 UTF-8 解码通过，首行仍为 `status: ready`，`## 短笺` 恰一处；`git diff --check` 与 `npm.cmd run docs:check` 均 exit 0。
