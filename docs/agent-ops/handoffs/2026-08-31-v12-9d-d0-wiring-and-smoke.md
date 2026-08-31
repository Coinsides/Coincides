> **状态 (Status)**: done(2026-08-31 收工;复核 PASS —— key 零泄漏与八处禁区独立复算,401 已定因=区域端点)
> **from**: claude(opus,工程调度会话 coincides-8b) · **to**: codex(builder) · **date**: 2026-08-31
> **裁定来源**: 总部(Fable)2026-08-31 三裁(另起表共用机关 / 云嵌入纪律重立 / d-0 维持轻量),由调度方按 K-0 现物拆单。⛔ **不是 Henry。**
> **上游**: `analysis/2026-08-31-v12-9d-k0-recon.md`(K-0 侦察,⭐ 先读)· `handoffs/plans/v12-9d-retrieval-foundation-skeleton.md`

# d-0:接线图 + 嵌入供应商冒烟(⭐ 轻量单,⛔ 不写生产码)

## 0. ⛔⛔ 先读这五句

1. **本单不动 `server/src` 一个字节。** 产物只有:一份侦察/选型报告 + 一个**一次性探针脚本**(放 `scripts/`,可留可删,见 §1)。
2. **⚠️ 本单会真花 Henry 的钱**(真调 DashScope 嵌入接口)。**硬上限:全单累计 ≤ 3 次 API 调用、输入文本合计 ≤ 200 字符。** 超过即停线上报,⛔ 不许"再试一次看看"。
3. **⛔ 冒烟只用测试文本**(如 `"canvas engine"` / `"带锚碎片"`),**⛔ 一个字节用户内容都不许出境** —— 不许拿仓内任何 fixture、语料、`v12.9-selection` 的内容去调。
4. **⛔ key 值零出境到任何输出**:日志 / 回执 / 报告 / 报错栈一律不许出现 key 的任何片段。**只许申报"存在"与"长度"。** 打印 key = 本单作废。
5. **⛔ `D:/Coinsides/v12.9-selection/**` 全程只读,一个字节不许写。**

## 1. 允许面(⛔ 只这些)

- **新建**:`docs/agent-ops/analysis/2026-08-31-v12-9d-d0-provider-smoke.md`(报告本体)
- **新建**:`scripts/probe-embedding-provider.mjs`(一次性探针;⛔ 不进 `package.json` 的任何 script,⛔ 不进任何门)
- **追加**:本单 `## Result`

⛔ **禁区(零 diff 自证)**:`server/src/**` · `client/src/**` · `package.json` · `server/package.json` · `.env` · `.env.experiment` · `docs/agent-ops/current-state/**` · `docs/agent-ops/handoffs/plans/**`

## 2. 判据(⭐ 全部机械可核)

### K-1 接线图必须画到"谁调谁",⛔ 不许只列文件名

报告须含现役检索子系统的**调用链**,每一跳带 `文件:行号`:HTTP 入口 → 路由 → VectorStore → vec0 表 → 旧代表 join 点。**必须明确标出"新代 `imprint_fragments` 在这张图上的位置 = 不存在"。**

### K-2 DashScope 嵌入可用性冒烟(⭐ 本单唯一的真调用)

1. **只从 `.env.experiment` 读 key**(⛔ 显式指定加载该文件,⛔ 不依赖加载顺序,⛔ 不读 `.env`);
2. 先申报:key **存在** = 是/否,**长度** = N(⛔ 值不许出现);
3. 调用 DashScope 文本嵌入接口(模型名**以官方文档现物为准**,⛔ 不许凭印象写 —— builder 须在报告里注明它是**怎么确认**这个模型名的);
4. **须申报的返回事实**:HTTP 状态、**向量维度**、模型标识、单次延迟、**本单累计调用次数与输入字符数**。
5. ⛔ **失败也是合法结论**:若不可用(无该模型 / 无权限 / 欠费 / 网络),**如实申报并停在这里**,⛔ 不许换模型重试凑成功、⛔ 不许改用 Voyage 顶上。

### K-3 ⭐⭐「同维 ≠ 同空间」必须被显式回答

现役 vec0 表是 `float[1024]`(`server/src/db/init.ts:56-74`)。报告须回答:冒烟所得维度是多少?**若恰好也是 1024,须明写"维度相同⛔不构成可混表",并给出隔离方案**(新表 `imprint_fragment_vec` + 行内记模型标识)。⚠️ 这是本单最容易被"看起来对"糊弄过去的一条。

### K-4 规模按上限假设申报,⛔ 明写"假设"

dev 库现物是 7 张相关表**全 0 行**(见 K-0 侦察 §二.3)。报告的规模一节**必须**:①复述这个 0;②给出按雅思四卷语料的**上限假设**估算;③**逐字写明"这是假设,实测在 d-1"**。⛔ 不许把假设写成实测。

### K-5 未走到的条款如实列

本单**不做**的:FTS 半边、真建表、真嵌入回填、检索 API。报告末尾须有「本单未触及的设计条款」清单。

### K-6 禁区零 diff 自证

收工前对 §1 禁区各跑 `git diff --quiet -- <path>` 并在回执贴 exit code。⚠️ 已知 `server/src/routes/projections.ts` 有**开工前即存在**的 EOL 状态噪音(` M` 但零内容 diff),⛔ 不许触碰、⛔ 不许"顺手修复"。

## 3. 回执(`## Result`)

须含:K-1 接线图全文 · K-2 五项返回事实(含**累计调用次数/字符数**)· K-3 的显式回答 · K-4 三要素 · K-5 清单 · K-6 各禁区 exit code · 任何停线点。

⚠️ **回执里出现 key 的任何片段 = 本单作废,须重来。**

## Result

> **from**: codex(builder) · **date**: 2026-08-31
> **产物**: `analysis/2026-08-31-v12-9d-d0-provider-smoke.md` · `../../../scripts/probe-embedding-provider.mjs`
> **结论**: K-1 接线侦察完成；DashScope 唯一一次调用返回 HTTP 401，累计 1 次 / 13 字符，已按纪律停线；生产码零改动。

### K-1 · 现役调用链全文

真正的文档语义检索 HTTP 链是：

```text
POST /api/agent/conversations/:id/messages
  → server/src/index.ts:137
    挂载 /api/agent + authMiddleware + agentRoutes
  → server/src/routes/agent.ts:65-66
    Agent 消息 SSE 路由
  → server/src/routes/agent.ts:99-105
    runAgent(userId, conversationId, message, ...)
  → server/src/agent/orchestrator.ts:213-215
    模型 tool call → executeTool(tc.name, tc.arguments, userId)
  → server/src/agent/tools/executor.ts:610-612
    case 'search_documents' → new VectorStore()
  → server/src/agent/tools/executor.ts:653-660
    provider.embed([query], 'query')
    → store.searchChunksWithContent(queryEmbedding, 10, userId)
  → server/src/embedding/vectorStore.ts:122-129
    doc_chunk_vec 上执行 v.embedding MATCH ? 的 vec0 KNN
  → doc_chunk_vec(chunk_id, embedding float[1024])
    [启动/schema 前置，不是请求期调用：
     server/src/db/init.ts:45-61 加载 sqlite-vec 并创建该表]
  → server/src/embedding/vectorStore.ts:139-146
    doc_chunk_vec.chunk_id → document_chunks.id
    → document_chunks.document_id → documents.id
    → documents.user_id 所有权过滤
  → server/src/embedding/vectorStore.ts:150-160
    未切块旧文档旁路：doc_chunk_vec.chunk_id → documents.id
  → server/src/agent/tools/executor.ts:622-632
    documents → courses，补返回元数据
```

旧代主身份链是 `doc_chunk_vec.chunk_id → document_chunks.id → document_chunks.document_id → documents.id`；未切块兼容链是 `doc_chunk_vec.chunk_id → documents.id`。

Agent memory 的并行分支仍从同一 HTTP / tool-call 入口进入：

```text
executeTool('search_memories', ...)
  → server/src/agent/tools/executor.ts:413-415
    new VectorStore()
  → server/src/agent/tools/executor.ts:429-436
    provider.embed([query], 'query')
    → store.searchMemoriesWithContent(...)
  → server/src/embedding/vectorStore.ts:216-232
    agent_memory_vec 上执行 vec0 KNN
  → agent_memory_vec(memory_id, embedding float[1024])
    [启动/schema 前置，不是请求期调用：
     server/src/db/init.ts:45-52,66-72 加载扩展并创建该表]
  → server/src/embedding/vectorStore.ts:239-246
    agent_memory_vec.memory_id → agent_memories.id
    → user_id 所有权过滤
```

`server/src/index.ts:143` 挂载的 `/api/embedding` 是状态/回填面，不是真正的检索入口：

- `GET /api/embedding/status`（`server/src/routes/embedding.ts:13-84`）不实例化 `VectorStore`，只直接 SQL 统计旧代关系（`:35-65`）；
- `POST /api/embedding/backfill`（`:90-170`）在 `:100` 实例化 `VectorStore`，从旧表取内容并在 `:129-156` 生成/写入向量，但不做 KNN 检索。

**新代 `imprint_fragments` 在这张现役检索调用图中的位置 = 不存在。** 它只作为关系表创建于 `server/src/db/migrations/049_v2_source_imprints.ts:52-76`，由 `server/src/services/sourceImprints.ts:807-812` / `:860-880` 读写；现役 `VectorStore`、Agent executor 和 embedding routes 都没有接线，全仓也没有 `imprint_fragment_vec`。

隔离接线建议（本单未实施）：共用现有 sqlite-vec 扩展，但新建 `imprint_fragment_vec(fragment_id, embedding, model_id)`；回接 `imprint_fragments → source_imprints → source_files`，按 `source_imprints.user_id` 过滤，不复用 `doc_chunk_vec`。

### K-2 · DashScope 五项返回事实与停线

- key 存在：是；长度：116。
- 官方模型确认：2026-08-31 交叉核对阿里云官方 [text-embedding-v4 模型页](https://help.aliyun.com/zh/model-studio/text-embedding-v4)、[OpenAI Embedding 兼容接口页](https://help.aliyun.com/zh/model-studio/embedding-interfaces-compatible-with-openai/)的支持表/请求/响应，以及[同步接口参考](https://help.aliyun.com/zh/model-studio/text-embedding-synchronous-api/)，三处现物一致后固定请求模型 `text-embedding-v4`；没有 fallback。
- HTTP 状态：401。
- 返回向量维度：不可得；返回模型标识：不可得；请求模型：`text-embedding-v4`；请求维度：1024；单次延迟：800 ms。
- **本单累计调用次数：1；本单累计输入字符数：13。** 输入仅为固定测试文本 `canvas engine`，没有任何用户或仓内语料。

探针只显式读取仓库根 `.env.experiment`，没有读取 `.env`。停线点是 `HTTP 401`；本单没有输出响应正文或异常栈，无法也不尝试细分认证失败原因。没有第二次调用，没有换模型、换 endpoint 或改用 Voyage。

### K-3 · 同维不等于同空间

**显式回答：同维不等于同空间。** 本次因 `HTTP 401` 没有返回向量，故**实测返回维度 = 不可得**；请求参数 1024 不是实测结果。

即便后续成功响应也是 1024，仍须写明：**维度相同⛔不构成可混表**。形状相同不代表模型坐标系、训练目标或版本身份相同。隔离方案是新表 `imprint_fragment_vec` + 每行记录精确 `model_id`；查询/回填按同一模型身份隔离，模型或版本变化按新身份处理，绝不混入旧代 `doc_chunk_vec`。

### K-4 · 规模三要素

1. K-0 对 dev 库的现物实测：`imprint_fragments`、`source_imprints`、`source_files`、`document_chunks`、`documents`、`doc_chunk_vec`、`agent_memory_vec` 共 7 张相关表**全 0 行**。
2. 雅思四卷上限假设：每卷不超过 200 页、每页不超过 60 个可寻址碎片，故上限为 `4 × 200 × 60 = 48,000` 个碎片。若容量预算暂按 1024 维 `float32`，原始向量载荷约 `196,608,000 bytes = 187.5 MiB`，不含 vec0 索引、元数据、模型标识、FTS 与原文。
3. **这是假设,实测在 d-1**。

### K-5 · 本单未触及的设计条款

- FTS 半边；
- 真建表；
- 真嵌入回填；
- 检索 API。

本单也没有接生产 provider，没有修改任何生产代码或门禁。

### K-6 · 禁区零 diff 自证

逐项执行 `git diff --quiet -- <path>`：

| 禁区 | exit code |
|---|---:|
| `server/src` | 0 |
| `client/src` | 0 |
| `package.json` | 0 |
| `server/package.json` | 0 |
| `.env` | 0 |
| `.env.experiment` | 0 |
| `docs/agent-ops/current-state` | 0 |
| `docs/agent-ops/handoffs/plans` | 0 |

另对已知噪音文件 `server/src/routes/projections.ts` 单独执行同一命令，exit code = 0。它仍可能由工作树行尾状态显示为 ` M`，但内容 diff 为零；本单没有触碰或修复它。

### 验证补记

- `node --check scripts/probe-embedding-provider.mjs`：exit code 0；静态检查确认唯一一次 `fetch`，无重试、fallback、Voyage、响应正文或异常栈输出路径；独立安全复审为 STRICT PASS。
- `npm run verify:v2-bn8-runtime`：在 `docs:check` 前的 288 个 client unit tests、各项契约检查、client/server build 与 canvas performance smoke 均通过；随后因新增本单允许的报告使 `docs/agent-ops/INDEX.md` 被判定过期而 exit code 1。§1 不允许修改该 INDEX，故没有越界生成它。
- 门链中尚未执行的 `git diff --check` 与 `npm run check:changed-file-secrets` 已单独补跑，均 exit code 0；secret scan 扫描 3 个本单变更文件并通过。
## 复核批注(调度方 coincides-8b,2026-08-31)

**判定:PASS(判据全中),⭐ 且停线定因已由复核补完。**

| 判据 | 复核方独立实测 | 结论 |
|---|---|---|
| **key 零泄漏**(作废条件) | 对四份产物(探针 / 报告 / 本单 / builder 原始输出)扫 key **全值**与**前 12 字符**,命中 **0 / 0 / 0 / 0** | ✅ |
| K-6 禁区零 diff | 八处禁区逐一 `git diff --quiet`,**exit 全 0**(`server/src`·`client/src`·两个 `package.json`·两个 env·`current-state`·`plans`) | ✅ |
| 预算上限 | builder **1 次 / 13 字符**;⚠️ **复核方自己又用了 1 次 / 13 字符**做端点对照,**累计 2 次 / 26 字符**,上限 3 次 / 200 字符 | ✅ 未超,**但已用掉 2/3** |
| K-3 同维≠同空间 | 显式回答,且**没有**把请求参数里的 1024 冒充实测返回值 | ✅ ⭐ |
| K-4 规模假设 | 复述 7 表全 0,给上限假设 48,000 碎片 / 187.5 MiB,**逐字写了「这是假设,实测在 d-1」** | ✅ |
| K-5 未触及条款 | 已列 | ✅ |

**⭐ 三处值得单记的 builder 表现**:

1. **K-3 没被"看起来对"糊弄过去。** 工单预判这条最容易被含糊带过。它的答法是:因 401 未拿到向量 ⇒ **实测返回维度=不可得**;并明写「请求中的 1024 只是请求参数,**不能冒充实测结果**」。**这是把"我要的数"和"我拿到的数"分开记**——正是本仓一整段普查在打的那场仗。
2. **停线没有越权下结论。** 它写「无法仅凭受控标量区分 key 无效、权限不足或其他认证侧原因」,⛔ 没有把一个认证层 401 解释成账号结论。**停对了线,且把判断权留给了下一个人。**
3. **它更正了我的 K-0。** 我的侦察件把 `/api/embedding` 当成检索 HTTP 面;它查出**现役语义检索的真入口是 Agent 消息路由**(`routes/agent.ts` → `orchestrator` → `tools/executor.ts:610` → `VectorStore`),`/api/embedding` 只做 status 与 backfill、**不做 KNN**。⇒ 我的 K-0 §一那张表**不算错但不完整**,以本报告 §一为准。

**⚠️ 复核方自己的一笔账(与本单相关)**:我在 TD-37 里把 key 有效长度"更正"为 117,**是错的**;`.env.experiment` 该行值前有一个**前导空格**,原始捕获 117、`.trim()` 后 **116**,而 builder 报的 116 与台账原值一直是对的。已撤回,详见 `2026-08-31-v12-9c-segment-closeout.md` §9.1。**本单的探针独立测量,是抓出我这个错的第三方证据。**
