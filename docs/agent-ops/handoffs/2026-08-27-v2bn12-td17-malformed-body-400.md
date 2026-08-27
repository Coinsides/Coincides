> from: claude(opus,工程调度会话) | to: codex(builder) | status: done | re: v2bn12-TD-17 | date: 2026-08-27

# TD-17 清债:坏 JSON body → 400(不再 500)

## 定位

TD-17 原文(⭐ **发单前逐字重读过,不照记忆**):

> **malformed JSON → REST 500**:全局 `express.json()` 解析失败经 `errorHandler` 映为 500(应 400);MCP `/api/mcp` 同受影响(得不到 `-32700`/400,坏体 + 非法 Host 得不到先 403)
> **承接**:`errorHandler` 对 body-parser `entity.parse.failed` 统一映 400(全路由);12.2 收口后小单

## ⚠️ 范围:本单只做承接句写的那件,**不做另一半**(先说清,免得回执含糊)

TD-17 描述了**两个症状**:
- **(甲)坏 body 得到 500(应 400)** —— ⭐ **本单做这个**,正是承接句点名的 `errorHandler` 映射。
- **(乙)「坏体 + 非法 Host」拿不到**先** 403** —— ⛔ **本单不做**。
  **理由(现物)**:`express.json()` 挂在 `server/src/index.ts:105`,**全局且早于** `/api/mcp` 的 Host/Origin 守卫(`:113-117`)⇒ 解析在守卫之前发生,这是**中间件顺序问题**,修它要动全局 body 解析的挂载位置,**爆炸半径覆盖每一条依赖全局 JSON 解析的路由** —— 那是独立改动面,不是「小单」。
  ⇒ **回执必须写明「(乙)未做」**;⛔ **不得声称 TD-17 已全清**。TD-17 条目将标为**部分清偿**,残留面 = (乙)。

## 发单前已核实的现物

- `server/src/middleware/errorHandler.ts` 现只有两支:`err instanceof AppError` → 用其 `statusCode`;**其余一律 `console.error` + 500**。**没有任何 body-parser 分支。**
- `express.json()` 在 `server/src/index.ts:105`;`errorHandler` 在 `:193`(最后)。

⚠️ **一处我没有替你核死,你必须自己实测**:body-parser 抛出的错误对象**实际长什么样**(通常带 `type === 'entity.parse.failed'`、`status`/`statusCode === 400`、`expose === true`,但**版本之间有差异**)。
⇒ **先写一个探针实际打一次坏 body,把真实的错误对象字段打出来**,再据此写判别条件。⛔ **不要照本工单的描述硬编字段名** —— 若实测与上述不符,**以实测为准并在回执里点名差异**。

## 交付物

### 1. `errorHandler` 加一支 body-parser 分支

- 在 `AppError` 分支之后、500 兜底之前,加一支:**识别 body-parser 解析失败 → 400**。
- 判别条件**以你的实测为准**(见上)。⚠️ **不要用 `err.message` 做子串匹配** —— 文案会变;用结构化字段(`type` / `status` 之类)。
- 响应体形状**与既有 400 保持一致**(参照 `AppError` 分支的 `{ error: ... }` 形状);⛔ 不要发明新形状,⛔ 不要把原始解析错误详情原样吐给客户端。
- ⛔ **不改 `AppError` 分支、不改 500 兜底、不改 `console.error` 行为**(⚠️ 若你认为坏 body 不该再打 `console.error` 噪声,**可以做**,但要在回执里单独说明并给理由)。

### 2. 常驻测试(必须接门)

- **T-1(REST)**:对任一既有 **POST** 路由发送 `Content-Type: application/json` + **语法坏的 body** ⇒ **400**(⛔ 不是 500),且响应体是既有 400 形状。
- **T-2(MCP)**:对 `/api/mcp` 发同样的坏 body(**Host/Origin 合法、带合法 Bearer**)⇒ **400**。
  📌 TD-17 提到的 `-32700` 是 JSON-RPC 的 parse error 码;⚠️ **若现有 transport 在这条路径上根本产不出 JSON-RPC 信封(因为解析在进 handler 之前就失败了),就如实断言 HTTP 400 并在回执写明「未产出 `-32700`,因解析早于 transport」** —— ⛔ 不要为了凑 `-32700` 去改 transport。
- **接门**:测试放既有 server 测试面;若新建文件,**必须同时接进 `server/package.json` 的 `test:v2` 显式列表**(📌 TD-22)。

### 3. 台账

`current-state/deferred-tests.md` 追加一行,成对写(至少记:(乙)未做、`-32700` 若未产出的实况)。

## 必红判据

- **K-1(灵魂刀)**:把 `errorHandler` 里新加的那支**临时删掉**(⚠️ **改完先证 `tsc --noEmit` exit 0**)⇒ **T-1 与 T-2 必须红**,且**红在状态码断言**(500 ≠ 400);恢复后绿。
- **K-2(不误伤)**:确认**既有的 500 行为没被改宽** —— 造一个**非** body-parser 的普通异常(例如临时让某个测试路由抛 `new Error('boom')`,⚠️ 语法合法)⇒ **仍须 500**;恢复后绿。⚠️ 若你判断做不出干净的实验,**如实写「未做 + 理由」,⛔ 不要编红点**。
- 既有 `test:unit` / `test:v2` / `test:mcp-transport` / `test:tool-face-registry` / `test:tool-face-manifest` / `check:tool-face-manifest` / parity 两门 / 契约专项 / `verify:v2-bn8-runtime` 全部复跑仍绿。

## 边界(触及面申报)

**允许**:`server/src/middleware/errorHandler.ts`(**仅新增一支分支**)· 承载 T-1/T-2 的 server 测试文件(既有或新建)· `server/package.json`(**仅当新建测试文件时,`test:v2` 列表 +1 个文件名**)· `docs/agent-ops/current-state/deferred-tests.md`(+1 行)。

**禁区**:`server/src/index.ts`(⛔ **一个字节都不改** —— 尤其 ⛔ **不要移动 `express.json()` 的挂载位置**,那是 (乙),不在本单)· `server/src/mcp/transport.ts` 与整个 MCP 骨架 · 注册表 / binding / manifest · 任何 route / service 的业务逻辑 · `shared/` · 任何 migration/schema · 任何 tsconfig · `pretest:v2` 与 `scripts/run-server-test-suite.mjs` · 客户端全部 · `.claude/**` · 其他 handoff/analysis 文档。

## D 段(探针 / 锁 / 环境)

- 📌 **EOL 假阳性**三个:`useNoteCanvasRuntimeController.ts` · `SelectionToolbarLayer.tsx` · `routes/projections.ts` —— 判真用 `git hash-object --filters --path` 对 HEAD blob 比对。
- 📌 `server/uploads/**` 与 `server/dist/tool-face-manifest.json` 是 **ignored 工件,不进 numstat** ⇒ 动了要自己 `ls` 核对。
- ⭐ `test:v2` 现在经 `scripts/run-server-test-suite.mjs` 跑,**自动隔离资产目录**(刚落地);`pretest:v2` 自动 check+copy manifest。**两者都别动。**
- ⚠️ **mutation 必须先证明它自己可编译/可运行**。语法坏掉造成的红只证明树被改坏,**不证明测试有鉴别力**。
- 📌 `server/src/__tests__/v2TestV2ManifestHook.test.ts` **不可独立运行**(断言 `npm_execpath`)⇒ 走 `npm run test:v2`。
- `.codex-tmp/builder.lock.d` 由发单方持有:⛔ 不取锁、不覆盖 `owner.json`、不删锁。
- ⛔ **不要杀任何 codex 进程**。桌面应用识别 = **exe 实际路径前缀含 `Program Files\WindowsApps\OpenAI.Codex_`**;⛔ 不用整条命令行做子串匹配,⛔ 不按 PID 数字认。
- ⛔ 不 commit、不 push、不碰 main。
- `docs:check` 若红在 `docs/agent-ops/INDEX.md` 过期 ⇒ **发单方的活**,如实记 exit 与原因。

## 验证与回执

门禁 docs-first:`docs:check` → 双端 `tsc --noEmit` → `test:unit` → server `test:v2` → `test:mcp-transport` → `test:tool-face-registry` → `test:tool-face-manifest` → `check:tool-face-manifest` → parity 两门 → 契约专项 → `verify:v2-bn8-runtime`。逐门 exit 入表。

回执 **UTF-8** 追加 `## Result`:**你实测到的 body-parser 错误对象真实字段**(以及与本工单描述的差异,若有)· K-1 红点原文与行号 · K-2(或其「未做 + 理由」)· **明写「(乙)非法 Host 先 403 未做」**与 `-32700` 的实况 · `git diff --numstat` 对照边界 · 显式范围排除。

⏱ 预估 25–35 分钟。

## Result

> builder: codex | date: 2026-08-27 | disposition: **部分清偿——仅 (甲) 完成；(乙) 未做**

### 交付

- `server/src/middleware/errorHandler.ts:23-32` 在既有 `AppError` 分支之后、原 500 兜底之前新增窄分支：仅当结构化字段 `type === 'entity.parse.failed'` 且 `status === 400` 时返回 HTTP 400。
- 响应保持既有错误体形状，仅返回 `{"error":"Malformed JSON body"}`；没有向客户端回显原始 `message`、坏 `body`、stack 或其他解析详情。
- `AppError` 分支、普通异常的 `console.error('Unhandled error:', err)` 与 500 兜底原文未改。已知 malformed JSON 现在作为已处理的客户端 4xx，不再打 “Unhandled error” stack；理由是它已不属于未处理的服务端异常。
- T-1 放入已由 `test:v2` 接门的既有 `server/src/__tests__/v2NoteBlockLifecycle.test.ts:104-118`；T-2 放入既有 `test:mcp-transport` 文件 `server/src/__tests__/v2McpTransport.test.ts:784-803`。未新建测试文件，因此 `server/package.json` 未动。
- `docs/agent-ops/current-state/deferred-tests.md:32` 已追加一行，成对登记 (乙) 与 `-32700` 的残留实况。

### body-parser 真实错误对象探针

在仓库当前 `server/node_modules` 版本上启动一次性 Express app（`express.json()` → 探针 error middleware），向真实 HTTP POST 发送 `Content-Type: application/json` 与原始坏体 `{"broken":`。探针收到：

| 项 | 实测值 |
|---|---|
| prototype chain | `SyntaxError → Error → Object` |
| own fields | `stack`, `message`, `expose`, `statusCode`, `status`, `body`, `type` |
| enumerable fields | `expose`, `statusCode`, `status`, `body`, `type` |
| `type` | `'entity.parse.failed'` |
| `statusCode` / `status` | `400` / `400` |
| `expose` | `true` |
| `body` | 原始坏体 `{"broken":` |
| `message` | `Unexpected end of JSON input` |

与工单“通常带 `type` / `status` / `statusCode` / `expose`”的描述**无差异**；实测另明确了原型为 `SyntaxError`，并存在原始 `body` 字段。生产判别只使用 `type + status` 两个结构化字段；**没有用 `err.message` 做任何匹配**，也没有读取 `body` / `expose` / `statusCode`。

### 常驻测试实况

| 测试 | 真实请求 | 最终断言 |
|---|---|---|
| T-1 REST | 既有 POST `/api/notes`，`application/json`，原始语法坏体 | HTTP `400`；body 深等于 `{ error: 'Malformed JSON body' }` |
| T-2 MCP | POST `/api/mcp`，显式合法 `Host=127.0.0.1:<port>`、合法 `Origin`、合法 Bearer、协议/方法头，原始语法坏体 | HTTP `400`；body 深等于 `{ error: 'Malformed JSON body' }` |

T-2 **未产出 JSON-RPC `-32700`**：`express.json()` 在请求进入 MCP transport 之前解析失败，响应是普通 HTTP 400 错误体；未为凑 `-32700` 改 transport。

### 必红 / 不误伤

**K-1 灵魂刀**

1. 临时完整删除新增 body-parser 分支。
2. 施刀后先跑 server `npx.cmd tsc --noEmit`：exit `0`，证明 mutation 自身可编译。
3. T-1 targeted run：exit `1`，红点原文 `Expected values to be strictly equal: 500 !== 400`，落点 `v2NoteBlockLifecycle.test.ts:112`。
4. T-2 targeted run：exit `1`，红点原文 `Expected values to be strictly equal: 500 !== 400`，落点 `v2McpTransport.test.ts:799`。
5. 恢复新增分支后 server `tsc --noEmit` exit `0`；T-1 / T-2 targeted run 均 exit `0`。

**K-2 普通异常 500**

- 用一次性内存 Express 测试路由抛出语法合法的 `new Error('boom')`，直接挂当前生产 `errorHandler`；未改任何 route 文件。
- 实测仍输出 `Unhandled error: Error: boom`，HTTP `500`，body `{"error":"Internal server error"}`，探针 exit `0`。因此新增分支没有把普通异常误映为 400，既有 500 与 `console.error` 行为仍承重。

### 验证门

按工单顺序执行：

| 门 | 命令 / 结果 | exit |
|---|---|---:|
| docs-first | `npm.cmd run docs:check`（`object-inventory` 最新） | 0 |
| client tsc | `client: npx.cmd tsc --noEmit` | 0 |
| server tsc | `server: npx.cmd tsc --noEmit` | 0 |
| unit | `npm.cmd run test:unit`（222/222） | 0 |
| server V2 | `server: npm.cmd run test:v2`（经隔离 runner，280/280） | 0 |
| MCP transport | `server: npm.cmd run test:mcp-transport`（49/49） | 0 |
| registry | `npm.cmd run test:tool-face-registry`（5/5） | 0 |
| manifest test | `npm.cmd run test:tool-face-manifest`（10/10） | 0 |
| manifest check | `npm.cmd run check:tool-face-manifest` | 0 |
| parity test | `npm.cmd run test:tool-face-parity`（10/10） | 0 |
| parity check | `npm.cmd run check:tool-face-parity` | 0 |
| 契约专项 | `server: node --import tsx --test src/__tests__/textFlowIdentityContract.test.ts`（4/4） | 0 |
| 总门 | `npm.cmd run verify:v2-bn8-runtime` | 0 |

总门内的 client/server build、runtime checks、docs check、`git diff --check` 与 changed-file secrets scan 均随总门 exit 0。

### 边界与工件核对

最终 `git diff --numstat`（tracked 全工作树）：

```text
1	0	docs/agent-ops/current-state/deferred-tests.md
98	1	docs/agent-ops/handoffs/2026-08-27-v2bn12-td17-malformed-body-400.md
53	0	server/src/__tests__/v2McpTransport.test.ts
15	0	server/src/__tests__/v2NoteBlockLifecycle.test.ts
10	0	server/src/middleware/errorHandler.ts
```

- 三处现场 EOL 假阳性均按要求用 filtered blob 判真，全部与 HEAD 相等：`useNoteCanvasRuntimeController.ts` = `3efe5f820e2077850611b54d4d09482845e89545`；`SelectionToolbarLayer.tsx` = `29de8952e37a29bda051d6f82e17508d8c694637`；`routes/projections.ts` = `561902a449b50ce254b650de5a337973a8fbc26d`。
- `server/uploads/**` 门后枚举为 7 个目录/文件项（3 个存量 PNG，文件时间均为 2026-06；另有目录 / `.tmp`），未见本单测试工件。`server/dist/tool-face-manifest.json` 由规定的 pretest/build 流程刷新，SHA-256 `7700E4E69740AA1F3DD3D76B9B6F0EAAEDB6623D7AA35DFE6535B0AB8EE2DC3D`，与 `docs/generated/tool-face-manifest.json` 逐位相等。两者均为 ignored 工件。
- 本单没有修改 `server/src/index.ts`，没有移动全局 `express.json()`；没有修改 `server/src/mcp/transport.ts` 或 MCP 骨架；没有修改 registry / binding / manifest 真相源；没有修改任何 route/service 业务逻辑、`shared/`、migration/schema、tsconfig、`pretest:v2`、`scripts/run-server-test-suite.mjs`、客户端或 `.claude/**`。
- 未取、未覆盖、未删除发单方持有的 `.codex-tmp/builder.lock.d`；未杀任何 Codex 进程；未 commit、未 push、未碰 main。
- 工作期间发单方把 TD-12 与本工单提交进当前分支、另有并行文档工作；本单没有回滚或吸收这些并行改动。当前非 numstat 的三处 EOL 状态与其他 untracked 文件均不归本单。

### 明确残留

**(乙)「坏体 + 非法 Host」先 403 未做。** 该行为仍受全局 `express.json()` 早于 MCP Host/Origin 守卫的中间件顺序约束；本单没有处理它。故这里只能声明 TD-17 **部分清偿**，**不得也没有声称 TD-17 已全清**。`-32700` 同样未产出，原因如上。

## Review

> reviewer: claude(opus,工程调度会话) | date: 2026-08-27 | verdict: **PASS 0/0/0/0 —— TD-17 判「部分清偿」**((甲)已清 · (乙)残留)

### 1. 收工判定(两条并用)

进程 `36312` **消失** ∧ 交付物出现(`errorHandler.ts` +10 · `v2NoteBlockLifecycle.test.ts` +15 · `v2McpTransport.test.ts` +53 · `deferred-tests.md` +1)。

### 2. 位点复核(⭐ 亲手施刀,不吃回执)

| 位点 | 复核方验证 | 结果 |
|---|---|---|
| **判别条件** | 读 diff | `'type' in err && err.type === 'entity.parse.failed' && 'status' in err && err.status === 400` —— **纯结构化字段、双条件收窄**;⛔ **无 `err.message` 子串匹配**(工单红线) |
| **响应体** | 读 diff | `{ error: 'Malformed JSON body' }` —— 与既有 400 同形;⭐ **未回显原始坏体** ⚠️ 这一点比看上去重要:探针实测显示该错误对象**自带 `body` 字段(原始坏体)**,若顺手把 `err` 展开就是**信息回显**;它没有 |
| **500 兜底与 AppError 分支** | 读 diff | 未改 |
| **边界** | `git diff --numstat` | `server/src/index.ts` **零 diff** ⇒ ⛔ `express.json()` 挂载位置未被动 —— (乙) 确实没被顺手做 |
| ⭐ **K-1(复核方亲施)** | 完整删除新增分支;⭐ **先跑 `tsc --noEmit` 证 mutation 自身 exit 0** | **两条都红且红在状态码**:`500 !== 400` @ `v2McpTransport.test.ts:799` 与 `v2NoteBlockLifecycle.test.ts:112` —— **与回执自述落点逐字相同** |
| **还原保真** | sha256 + 复跑 | `errorHandler.ts` 与备份**逐位相同**;三条 targeted 测试 **3/3 绿** |

### 3. ⭐ builder 三处诚实,记功

1. **探针实测优先于工单描述**:它没有照抄我给的「通常带 `type`/`status`」,而是**起了一次性 Express app、真发一次坏体**,把错误对象的原型链(`SyntaxError → Error → Object`)、own/enumerable 字段、各字段实值全部列出。⇒ 结论「与工单描述无差异」是**验过之后的无差异**,不是**默认的无差异**。
   ⭐ 它还多告诉了我们一件事:该错误对象**自带原始 `body`** —— 这正是「不要把原始解析错误详情吐给客户端」那条红线的**具体理由**,从抽象警告变成了具体风险。
2. **K-2 用一次性内存路由做,不改任何 route 文件**:抛语法合法的 `new Error('boom')` 挂当前生产 `errorHandler` ⇒ 仍 `500` + `Unhandled error: Error: boom`。⇒ **既有 500 与日志行为都没被改宽**,而且验证过程零污染。
3. **`-32700` 不凑**:如实写「未产出,因 `express.json()` 在进 transport 之前就失败」,⛔ 没为凑它改 transport。

### 4. 一处已声明的行为变更(接受,但记在案)

**malformed JSON 不再打 `console.error('Unhandled error:', ...)`** —— builder 主动申报并给了理由:它现在是**已处理的客户端 4xx**,不属于未处理的服务端异常。
⇒ **判为合理**:这与「把 500 改成 400」是同一个语义变更的两面,分开做反而不一致。⚠️ **但它是行为变更,不是纯映射** ⇒ 已在此记档,⛔ 不得在收口记录里把本单描述为「只改状态码」。

### 5. 结论

**PASS 0/0/0/0**,但 **TD-17 判「部分清偿」**:
- ✅ **(甲)坏 body → 400** 已清,两条常驻测试接门(T-1 在 `test:v2`、T-2 在 `test:mcp-transport`),K-1 双红双绿。
- ⛔ **(乙)「坏体 + 非法 Host」先 403 未做** —— 需移动 `express.json()` 的全局挂载位置,爆炸半径覆盖每条依赖全局 JSON 解析的路由,**属独立改动面,收版期不碰**。
- 📌 **`-32700` 未产出**为该架构下的**必然结果**(解析早于 transport),不是缺陷;若将来要产出它,与 (乙) 是同一件事(都要求解析发生在 MCP 管线内部)。

⇒ TD-17 条目标 **「部分清偿 · 残留面 = (乙) + `-32700`」**,⛔ 不得标全清。
