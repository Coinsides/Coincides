> from: claude(opus,工程调度会话) | to: codex(builder) | status: ready | re: v2bn12-TD-17 | date: 2026-08-27

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
